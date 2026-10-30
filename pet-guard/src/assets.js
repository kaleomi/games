// 美术素材：tools/import_art.py 把生成的原图抠图、切开、缩放后写进 assets/，并生成 assets/manifest.json。
// 这里按清单加载；清单里没有的素材，画面用占位图形代替（换上真图不用改代码）。
//
// 素材名约定：
//   pet:<物种>:<0幼崽|1少年|2成年>    egg:<物种>    tree    bg:<spring|summer|autumn|winter|night>
//   foe:<怪>:<0生气|1开心>（小怪、精英、首领都一样）   icon:<fish|bone|carrot|bamboo|seed|cake|milk|star|fruit|candy>
//   gear:<hat|collar|scarf|toy>:<0-5>   misc:<sunglasses|umbrella|giftbox|trophy|balloon|medal>
//   fx:<heart|star|note|bubble|petal|snow|drop|leaf|rainbow|cloud>   proj:<foxfire|snowball|rainbow|heart|bamboo|seed|claw|poof>
//   glow:<glow|sparkle|ring|circle|pillar|wave|frost|bolt>   truck   logo
//   seq:<物种>:<形态>:<idle|attack|happy|sleep>   序列帧（多张）
export class Assets {
  constructor(base = 'assets/') {
    this.base = base;
    this.img = new Map();      // name → { img, w, h, ...meta }
    this.seq = new Map();      // name → { frames: [img], fps }
    this.cache = new Map();    // 派生图（白色剪影、闪光换色、灰度）
    this.manifest = null;
  }
  async load(onProgress = () => {}) {
    try {
      const r = await fetch(this.base + 'manifest.json', { cache: 'no-cache' });
      this.manifest = r.ok ? await r.json() : { images: {}, seqs: {} };
    } catch { this.manifest = { images: {}, seqs: {} }; }
    const list = Object.entries(this.manifest.images || {});
    const seqs = Object.entries(this.manifest.seqs || {});
    const total = list.length + seqs.reduce((n, [, s]) => n + (s.frames?.length || 0), 0);
    let done = 0;
    const tick = () => onProgress({ done: ++done, total });
    const loadOne = src => new Promise(resolve => { const im = new Image(); im.decoding = 'async'; im.onload = () => resolve(im); im.onerror = () => resolve(null); im.src = this.base + src; });
    await Promise.all([
      ...list.map(async ([name, m]) => { const im = await loadOne(m.src); if (im) this.img.set(name, { ...m, img: im, w: im.naturalWidth, h: im.naturalHeight }); tick(); }),
      // 序列帧每一帧也登记成一张普通图（名字后面加 #序号），这样闪光换色、受击闪白也能用
      ...seqs.map(async ([name, s]) => {
        const names = [];
        for (const [i, src] of (s.frames || []).entries()) { const im = await loadOne(src); if (im) { this.img.set(`${name}#${i}`, { src, img: im, w: im.naturalWidth, h: im.naturalHeight }); names.push(`${name}#${i}`); } tick(); }
        if (names.length) this.seq.set(name, { names, fps: s.fps || 8 });
      }),
    ]);
    onProgress({ done: total, total });
    return this;
  }
  get(name) { return this.img.get(name) || null; }
  has(name) { return this.img.has(name); }
  frames(name) { return this.seq.get(name) || null; }
  // 派生：白色剪影（受击闪白、进化剪影）
  white(name) { return this.derive(name, 'white', (x, im) => { x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, im.width, im.height); }); }
  // 灰度（心愿树睡着）
  gray(name) { return this.derive(name, 'gray', (x, im) => { x.filter = 'grayscale(0.85) brightness(0.9)'; x.drawImage(im, 0, 0); }); }
  // 金色（金色偷果鼠）
  gold(name) { return this.derive(name, 'gold', (x, im) => { x.filter = 'sepia(1) saturate(4) hue-rotate(-10deg) brightness(1.15)'; x.drawImage(im, 0, 0); }); }
  derive(name, kind, draw) {
    const key = name + '|' + kind;
    if (this.cache.has(key)) return this.cache.get(key);
    const a = this.img.get(name);
    if (!a || typeof document === 'undefined') return null;
    const c = document.createElement('canvas'); c.width = a.w; c.height = a.h;
    const x = c.getContext('2d');
    draw(x, a.img);
    const out = { ...a, img: c };
    this.cache.set(key, out);
    return out;
  }
}
