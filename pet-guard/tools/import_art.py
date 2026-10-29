#!/usr/bin/env python3
"""把 GPT 生成的原图变成游戏素材：抠白底 / 黑底、按设定图切开、裁边、缩放、存 WebP，更新 assets/manifest.json。

用法：
  python3 tools/import_art.py <原图文件夹> [--only pet_shiba,foe_dust] [--preview 预览图文件夹]

原图按清单里的文件名命名（pet_shiba.png、foe_dust.jpg、bg_spring.png……；GPT 下载下来的名字后面多了
「(1)」之类也认）。art/fix.json 可以给单张图加修正：
  { "pet_shiba": { "flip": true, "bgTol": 30, "order": [2,1,0] } }
  flip：左右翻转（萌宠要朝右）；bgTol：白底容差（有灰色地面阴影就调大）；order：切出来的顺序重排
"""
import json, os, re, sys, shutil, argparse
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')
SP = ['shiba', 'cat', 'bunny', 'panda', 'fox', 'hamster', 'penguin', 'dragon']
FOE_H = {'dust': 220, 'cloud': 220, 'thief': 220, 'burr': 220, 'tear': 220, 'bear': 320, 'clock': 320, 'crow': 320,
         'storm': 560, 'puffer': 560, 'owl': 560, 'yeti': 560, 'king': 560}

# 每张原图：怎么切（行×列）、切出来叫什么、多大、什么底
def spec_of(fid):
    m = re.fullmatch(r'pet_(\w+)', fid)
    if m and m.group(1) in SP:
        return dict(grid=(1, 3), names=[f'pet:{m.group(1)}:{i}' for i in range(3)], h=320, bg='white', dir='pets')
    m = re.fullmatch(r'(?:foe|boss)_(\w+)', fid)
    if m and m.group(1) in FOE_H:
        u = m.group(1)
        return dict(grid=(1, 2), names=[f'foe:{u}:0', f'foe:{u}:1'], h=FOE_H[u], bg='white', dir='foes')
    m = re.fullmatch(r'bg_(\w+)', fid)
    if m: return dict(kind='bg', names=[f'bg:{m.group(1)}'], dir='bg')
    m = re.fullmatch(r'seq_(\w+?)_(idle|attack|happy|sleep)(?:_(\d))?', fid)
    if m and m.group(1) in SP:
        n = 2 if m.group(2) == 'sleep' else 4
        return dict(kind='seq', grid=(1, n), seq=f'seq:{m.group(1)}:{m.group(3) or 2}:{m.group(2)}', h=320, bg='white', dir='seq', fps=8 if m.group(2) != 'sleep' else 2)
    table = {
        'tree':          dict(grid=(1, 1), names=['tree'], h=560, bg='white', dir='misc'),
        'eggs':          dict(grid=(2, 4), names=[f'egg:{s}' for s in SP], h=170, bg='white', dir='misc'),
        'icons_food':    dict(grid=(2, 5), names=[f'icon:{n}' for n in ['fish', 'bone', 'carrot', 'bamboo', 'seed', 'cake', 'milk', 'star', 'fruit', 'candy']], box=140, bg='white', dir='icons'),
        'gear_hat':      dict(grid=(2, 3), names=[f'gear:hat:{i}' for i in range(6)], box=160, bg='white', dir='gear'),
        'gear_collar':   dict(grid=(2, 3), names=[f'gear:collar:{i}' for i in range(6)], box=140, bg='white', dir='gear'),
        'gear_scarf':    dict(grid=(2, 3), names=[f'gear:scarf:{i}' for i in range(6)], box=140, bg='white', dir='gear'),
        'gear_toy':      dict(grid=(2, 3), names=[f'gear:toy:{i}' for i in range(6)], box=140, bg='white', dir='gear'),
        'icons_misc':    dict(grid=(2, 3), names=[f'misc:{n}' for n in ['sunglasses', 'umbrella', 'giftbox', 'trophy', 'balloon', 'medal']], box=180, bg='white', dir='icons'),
        'fx_sticker':    dict(grid=(2, 5), names=[f'fx:{n}' for n in ['heart', 'star', 'note', 'bubble', 'petal', 'snow', 'drop', 'leaf', 'rainbow', 'cloud']], box=110, bg='white', dir='fx'),
        'fx_projectile': dict(grid=(2, 4), names=[f'proj:{n}' for n in ['foxfire', 'snowball', 'rainbow', 'heart', 'bamboo', 'seed', 'claw', 'poof']], box=140, bg='white', dir='fx'),
        'fx_glow':       dict(grid=(2, 4), names=[f'glow:{n}' for n in ['glow', 'sparkle', 'ring', 'circle', 'pillar', 'wave', 'frost', 'bolt']], box=220, bg='black', dir='fx'),
        'gift_truck':    dict(grid=(1, 1), names=['truck'], h=320, bg='white', dir='misc'),
        'logo':          dict(grid=(1, 1), names=['logo'], w=760, bg='white', dir='misc'),
    }
    return table.get(fid)

def file_id(name):
    base = os.path.splitext(os.path.basename(name))[0]
    base = re.sub(r'\s*[\(（]\d+[\)）]$', '', base).strip()        # 「pet_shiba (1)」
    base = re.sub(r'[-_ ]?(copy|副本)$', '', base, flags=re.I)
    return base

# ───────── 抠图 ─────────
def matte_white(rgb, tol=22):
    """白底：从图边缘往里灌，接近白色、灰度低的像素算背景；主体有描边，里面的白毛不会被灌到。"""
    r, g, b = [rgb[..., i].astype(np.int16) for i in range(3)]
    mn = np.minimum(np.minimum(r, g), b); mx = np.maximum(np.maximum(r, g), b)
    near = (mn > 255 - tol * 1.6) & ((mx - mn) < tol + 6)
    lab, n = ndimage.label(near)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bg = np.isin(lab, border[border > 0])
    fg = ~bg
    fg = ndimage.binary_opening(fg, iterations=1)
    # 去掉很小的噪点
    lab2, n2 = ndimage.label(fg)
    if n2:
        sizes = ndimage.sum(fg, lab2, range(1, n2 + 1))
        keep = np.zeros(n2 + 1, bool); keep[1:] = sizes >= max(40, fg.size * 0.00004)
        fg = keep[lab2]
    # 边缘柔化：主体边上 2 像素按「有多白」给半透明，并去掉白边
    alpha = fg.astype(np.float32)
    edge = fg & ~ndimage.binary_erosion(fg, iterations=2)
    whiteness = np.clip((mn - 150) / 105.0, 0, 1)
    alpha[edge] = np.clip(1 - whiteness[edge] * 0.9, 0.15, 1)
    out = rgb.astype(np.float32)
    a3 = alpha[..., None]
    out = np.where(a3 > 0, (out - (1 - a3) * 255) / np.maximum(a3, 1e-3), out)
    rgba = np.dstack([np.clip(out, 0, 255), alpha * 255]).astype(np.uint8)
    return rgba, fg

def matte_black(rgb):
    """黑底发光：亮度当透明度，颜色还原（画的时候正常叠加就是发光）。"""
    f = rgb.astype(np.float32) / 255
    a = np.clip(f.max(axis=2) * 1.15 - 0.04, 0, 1)
    col = np.where(a[..., None] > 0.01, np.clip(f / np.maximum(a[..., None], 1e-3), 0, 1), 0)
    rgba = np.dstack([col * 255, a * 255]).astype(np.uint8)
    return rgba, a > 0.06

# ───────── 切图 ─────────
def segments(profile, want, min_gap):
    """一维投影里找出 want 段（按空白分开）；多了取最大的几段，少了按等分补。"""
    on = profile > 0
    segs, i, n = [], 0, len(on)
    while i < n:
        if on[i]:
            j = i
            while j < n and (on[j] or (j + min_gap < n and on[j:j + min_gap].any())): j += 1
            segs.append([i, j]); i = j
        else: i += 1
    if not segs: return [(int(n * k / want), int(n * (k + 1) / want)) for k in range(want)]
    while len(segs) > want:   # 合并最小那段到相邻
        k = min(range(len(segs)), key=lambda q: profile[segs[q][0]:segs[q][1]].sum())
        if k == 0: segs[1][0] = segs[0][0]
        elif k == len(segs) - 1: segs[-2][1] = segs[-1][1]
        else:
            gl = segs[k][0] - segs[k - 1][1]; gr = segs[k + 1][0] - segs[k][1]
            if gl <= gr: segs[k - 1][1] = segs[k][1]
            else: segs[k + 1][0] = segs[k][0]
        segs.pop(k)
    if len(segs) < want:
        lo, hi = segs[0][0], segs[-1][1]
        return [(lo + int((hi - lo) * k / want), lo + int((hi - lo) * (k + 1) / want)) for k in range(want)]
    return [tuple(s) for s in segs]

def cut(mask, rows, cols):
    H, W = mask.shape
    gap = max(6, int(min(H, W) * 0.012))
    out = []
    for (y0, y1) in segments(mask.sum(axis=1), rows, gap):
        band = mask[y0:y1]
        for (x0, x1) in segments(band.sum(axis=0), cols, gap):
            sub = band[:, x0:x1]
            ys, xs = np.nonzero(sub)
            if len(xs) == 0: out.append(None); continue
            out.append((x0 + xs.min(), y0 + ys.min(), x0 + xs.max() + 1, y0 + ys.max() + 1))
    return out

def save_webp(img, path, q=90):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, 'WEBP', quality=q, method=6)

def fit(img, h=None, box=None, w=None):
    iw, ih = img.size
    if h: s = h / ih
    elif w: s = w / iw
    else: s = box / max(iw, ih)
    s = min(s, 1.0) if not h else s
    return img.resize((max(1, round(iw * s)), max(1, round(ih * s))), Image.LANCZOS)

def process(path, fid, spec, fix, manifest, preview):
    im = Image.open(path)
    im = im.convert('RGB') if im.mode not in ('RGBA',) else im
    if spec.get('kind') == 'bg':
        im = im.convert('RGB')
        s = 1920 / im.height
        im = im.resize((round(im.width * s), 1920), Image.LANCZOS)
        rel = f"{spec['dir']}/{spec['names'][0].split(':')[1]}.webp"
        save_webp(im, os.path.join(ASSETS, rel), 82)
        manifest['images'][spec['names'][0]] = {'src': rel}
        return [im]
    if im.mode == 'RGBA' and np.asarray(im)[..., 3].min() < 250:   # 已经是透明底
        rgba = np.asarray(im); mask = rgba[..., 3] > 20
    else:
        rgb = np.asarray(im.convert('RGB'))
        rgba, mask = (matte_black(rgb) if spec['bg'] == 'black' else matte_white(rgb, fix.get('bgTol', 22)))
    src = Image.fromarray(rgba, 'RGBA')
    if fix.get('flipAll'): src = src.transpose(Image.FLIP_LEFT_RIGHT); mask = mask[:, ::-1]
    rows, cols = spec['grid']
    boxes = cut(mask, rows, cols)
    if fix.get('order'): boxes = [boxes[i] for i in fix['order']]
    pad = 3
    parts = []
    for b in boxes:
        if not b: parts.append(None); continue
        x0, y0, x1, y1 = b
        parts.append(src.crop((max(0, x0 - pad), max(0, y0 - pad), min(src.width, x1 + pad), min(src.height, y1 + pad))))
    if fix.get('flip'): parts = [p.transpose(Image.FLIP_LEFT_RIGHT) if p else p for p in parts]
    outs = []
    if spec.get('kind') == 'seq':
        # 序列帧：所有帧用同一个缩放、底边对齐、居中，动起来不会抖
        ok = [p for p in parts if p]
        mh = max(p.height for p in ok); mw = max(p.width for p in ok)
        s = spec['h'] / mh
        canvas_w, canvas_h = round(mw * s) + 8, spec['h'] + 6
        frames = []
        for i, p in enumerate(ok):
            q = p.resize((max(1, round(p.width * s)), max(1, round(p.height * s))), Image.LANCZOS)
            c = Image.new('RGBA', (canvas_w, canvas_h), (0, 0, 0, 0))
            c.paste(q, ((canvas_w - q.width) // 2, canvas_h - q.height - 3), q)
            rel = f"seq/{spec['seq'].replace(':', '_')}_{i}.webp"
            save_webp(c, os.path.join(ASSETS, rel)); frames.append(rel); outs.append(c)
        manifest.setdefault('seqs', {})[spec['seq']] = {'frames': frames, 'fps': spec['fps']}
        return outs
    for name, p in zip(spec['names'], parts):
        if p is None: print(f'  ! {fid} 少切出一块：{name}'); continue
        q = fit(p, h=spec.get('h'), box=spec.get('box'), w=spec.get('w'))
        rel = f"{spec['dir']}/{name.replace(':', '_')}.webp"
        save_webp(q, os.path.join(ASSETS, rel))
        manifest['images'][name] = {'src': rel}
        outs.append(q)
    return outs

def contact(outs, path, title):
    outs = [o for o in outs if o is not None]
    if not outs: return
    h = max(o.height for o in outs) + 20
    w = sum(o.width for o in outs) + 20 * (len(outs) + 1)
    c = Image.new('RGBA', (w, h + 20), (210, 225, 240, 255))
    # 棋盘格底，看得出透明边
    tile = 16
    arr = np.array(c)
    yy, xx = np.mgrid[0:arr.shape[0], 0:arr.shape[1]]
    arr[((yy // tile + xx // tile) % 2) == 0] = (235, 240, 248, 255)
    c = Image.fromarray(arr)
    x = 20
    for o in outs:
        c.alpha_composite(o.convert('RGBA'), (x, 10 + h - 20 - o.height)); x += o.width + 20
    c.convert('RGB').save(path)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('--only', default='')
    ap.add_argument('--preview', default='')
    ap.add_argument('--out', default='')
    a = ap.parse_args()
    global ASSETS
    if a.out: ASSETS = a.out
    fixes = {}
    fp = os.path.join(ROOT, 'art', 'fix.json')
    if os.path.exists(fp): fixes = json.load(open(fp, encoding='utf-8'))
    mp = os.path.join(ASSETS, 'manifest.json')
    manifest = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {}
    manifest.setdefault('images', {}); manifest.setdefault('seqs', {}); manifest.setdefault('audio', [])
    only = set(x for x in a.only.split(',') if x)
    done, skipped = [], []
    for name in sorted(os.listdir(a.src)):
        path = os.path.join(a.src, name)
        if not os.path.isfile(path): continue
        fid = file_id(name)
        ext = os.path.splitext(name)[1].lower()
        if ext in ('.mp3', '.ogg', '.wav', '.m4a'):
            m = re.fullmatch(r'bgm_(lobby|battle|boss|win)', fid)
            if not m: skipped.append(name); continue
            os.makedirs(os.path.join(ASSETS, 'audio'), exist_ok=True)
            if ext == '.mp3': shutil.copy(path, os.path.join(ASSETS, 'audio', fid + '.mp3'))
            else: os.system(f'ffmpeg -loglevel error -y -i "{path}" -b:a 160k "{os.path.join(ASSETS, "audio", fid + ".mp3")}"')
            if fid not in manifest['audio']: manifest['audio'].append(fid)
            done.append(fid); continue
        if ext not in ('.png', '.jpg', '.jpeg', '.webp'): skipped.append(name); continue
        if only and fid not in only: continue
        spec = spec_of(fid)
        if not spec: skipped.append(name); continue
        outs = process(path, fid, spec, fixes.get(fid, {}), manifest, a.preview)
        if a.preview:
            os.makedirs(a.preview, exist_ok=True)
            contact(outs if spec.get('kind') != 'bg' else [o.resize((o.width // 4, o.height // 4)) for o in outs], os.path.join(a.preview, fid + '.png'), fid)
        done.append(fid)
        print(f'  ✓ {fid} → {len(outs)} 张')
    manifest['images'] = dict(sorted(manifest['images'].items()))
    json.dump(manifest, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f'完成 {len(done)} 个；没认出的文件：{", ".join(skipped) or "无"}')

if __name__ == '__main__':
    main()
