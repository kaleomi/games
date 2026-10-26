// 屠龙战纪 · 装备图标 / 浮游法器 / 弹道（SVG）
// 6 个部位 × 6 个品质，每件都不一样：品质越高，造型越复杂、宝石越多越大、符文和发光越强、边框越华丽。
// 部位：weapon 武器 / armor 护甲 / engine 战靴 / scope 头盔 / core 护符 / generator 戒指
// 品质：白 → 蓝 → 紫 → 橙 → 金 → 红（颜色读 GEAR.tiers）
// 光从左上方来；主要剪影都带一圈深色外轮廓（paint-order=stroke），保证 30px 下也认得出。
import { GEAR } from './config.js';

const T_DARK = ['#5a6070', '#123a72', '#3e1a6e', '#6e2c06', '#6e5000', '#6e0812'];
const T_LIGHT = ['#ffffff', '#cfe6ff', '#ead6ff', '#ffe0c4', '#fff4c4', '#ffd0d4'];
const OL = '#0b0812';   // 统一外轮廓色

const r2 = v => Math.round(v * 100) / 100;
const stops = a => a.map(([o, col, op]) => `<stop offset="${o}" stop-color="${col}"${op == null ? '' : ` stop-opacity="${op}"`}/>`).join('');
const LG = (id, a, x1 = 0, y1 = 0, x2 = 1, y2 = 0) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(a)}</linearGradient>`;
const RG = (id, a, cx = .5, cy = .5, r = .5, fx = cx, fy = cy) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}" fx="${fx}" fy="${fy}">${stops(a)}</radialGradient>`;
// 镜像路径（只用于全是 "x,y" 绝对坐标的路径）
const mx = d => d.replace(/(-?\d*\.?\d+),(-?\d*\.?\d+)/g, (_, x, y) => `${r2(-x)},${y}`);

function defs(t) {
  const c = GEAR.tiers[t].color, d = T_DARK[t], l = T_LIGHT[t];
  return `<defs>
    <radialGradient id="bg" cx="-4" cy="-8" r="34" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c}" stop-opacity="${0.22 + t * 0.05}"/><stop offset=".55" stop-color="#121829"/><stop offset="1" stop-color="#05070e"/></radialGradient>
    <linearGradient id="tc" x1="0" y1="-16" x2="0" y2="16" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${l}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></linearGradient>
    <linearGradient id="tcx" x1="-14" y1="0" x2="14" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${d}"/><stop offset=".45" stop-color="${l}"/><stop offset="1" stop-color="${d}"/></linearGradient>
    <linearGradient id="m" x1="-1" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4c5468"/><stop offset=".4" stop-color="#f0f4fb"/><stop offset=".65" stop-color="#a3acbf"/><stop offset="1" stop-color="#3a4152"/></linearGradient>
    <linearGradient id="dk" x1="0" y1="-1" x2="0" y2="1"><stop offset="0" stop-color="#4a546c"/><stop offset="1" stop-color="#161b28"/></linearGradient>
    <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4c2"/><stop offset=".5" stop-color="#ffcc4d"/><stop offset="1" stop-color="#8a5a00"/></linearGradient>
    <radialGradient id="gl"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>
    ${LG('gI', [[0, '#7d8594'], [.3, '#dfe3ea'], [.62, '#868e9c'], [1, '#353b47']])}
    ${LG('gS', [[0, '#a3acbd'], [.3, '#ffffff'], [.6, '#bcc5d3'], [1, '#4b5365']])}
    ${LG('gG', [[0, '#a86e08'], [.3, '#fff4c4'], [.58, '#ffc93a'], [1, '#6e4200']])}
    ${LG('gB', [[0, '#7e4a1e'], [.3, '#ffd29c'], [.6, '#b9773a'], [1, '#43240c']])}
    ${LG('gL', [[0, '#bf8a5a'], [.55, '#87532d'], [1, '#4a2a12']], 0, 0, 0, 1)}
    ${LG('gLx', [[0, '#5e3618'], [.3, '#c08b5a'], [.65, '#8a552e'], [1, '#3a200b']])}
    ${LG('gK', [[0, '#363044'], [.3, '#9d93b2'], [.62, '#433b56'], [1, '#110d19']])}
    ${LG('gW', [[0, '#cdb985'], [.3, '#ffffff'], [.62, '#f3e8cb'], [1, '#a1844a']])}
    ${LG('gCr', [[0, '#26161c'], [.28, '#9a707a'], [.58, '#3c2028'], [1, '#0c0508']])}
    ${LG('gMi', [[0, '#9a96b8'], [.3, '#ffffff'], [.6, '#cbc4e2'], [1, '#4a4468']])}
    ${RG('gm', [[0, '#ffffff'], [.2, l], [.58, c], [1, d]], .5, .5, .58, .34, .3)}
    ${RG('sh', [[0, '#ffffff', .45], [.42, '#ffffff', 0], [.72, '#000000', .08], [1, '#000000', .55]], .36, .3, .8)}
    ${RG('hl', [[0, c, .9], [.5, c, .35], [1, c, 0]])}
    <filter id="bl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.4"/></filter>
    <filter id="bl2" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6"/></filter>
    <filter id="bl1" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation=".7"/></filter>
  </defs>`;
}

// 边框：品质越高越华丽
function frame(t) {
  const c = GEAR.tiers[t].color;
  let s = '';
  if (t >= 4) s += `<rect x="-22" y="-22" width="44" height="44" rx="10" fill="none" stroke="${c}" stroke-width="${t === 5 ? 6.5 : 5}" opacity="${t === 5 ? .7 : .55}" filter="url(#bl2)"/>`;
  s += `<rect x="-21" y="-21" width="42" height="42" rx="9" fill="url(#bg)" stroke="${c}" stroke-width="${t >= 3 ? 2.6 : 2}"/>`;
  if (t >= 1) s += `<rect x="-18" y="-18" width="36" height="36" rx="6.5" fill="none" stroke="${c}" stroke-opacity=".3" stroke-width="1"/>`;
  if (t === 1) s += [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => `<path d="M${a * 20},${b * 13} L${a * 20},${b * 20} L${a * 13},${b * 20}" fill="none" stroke="${T_LIGHT[t]}" stroke-width="1.4"/>`).join('');
  if (t === 2) s += [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => `<path d="M${a * 19},${b * 16} L${a * 21.5},${b * 19} L${a * 19},${b * 22} L${a * 16.5},${b * 19} Z" fill="url(#tc)" stroke="#fff" stroke-width=".5" transform="translate(${-a},${-b})"/>`).join('');
  if (t === 3) s += [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => `<path d="M${a * 21},${b * 9} C${a * 25},${b * 15} ${a * 21},${b * 21} ${a * 9},${b * 22} C${a * 15},${b * 19} ${a * 18},${b * 15} ${a * 21},${b * 9} Z" fill="url(#tc)" opacity=".95"/>`).join('');
  if (t >= 4) {
    // 顶部双翼
    const wing = `M-6,-21 C-12,-28 -22,-27 -27,-21 C-22,-23 -17,-22 -14,-19 C-19,-20 -23,-17 -25,-14 C-19,-17 -13,-17 -9,-15 Z`;
    s += `<path d="${wing}" fill="url(#gd)" stroke="#5a3a00" stroke-width=".5"/><path d="${wing}" transform="scale(-1,1)" fill="url(#gd)" stroke="#5a3a00" stroke-width=".5"/>`;
  }
  if (t === 5) {
    s += `<path d="M-7,-21 L-7,-27 L-3.5,-24 L0,-29 L3.5,-24 L7,-27 L7,-21 Z" fill="url(#gd)" stroke="#5a3a00" stroke-width=".6"/><circle cx="0" cy="-25" r="1.4" fill="${c}"/>`;
    s += [[-1, 1], [1, 1]].map(([a, b]) => `<path d="M${a * 21},${b * 9} C${a * 25},${b * 15} ${a * 21},${b * 21} ${a * 9},${b * 22} C${a * 15},${b * 19} ${a * 18},${b * 15} ${a * 21},${b * 9} Z" fill="url(#tc)"/>`).join('');
  }
  return s;
}

// ───────── 通用小零件 ─────────
const glow = (inner, w = 1) => `<g filter="url(#bl)" opacity="${r2(Math.min(1, 0.75 * w))}">${inner}</g>${inner}`;
const ring = (cx, cy, rx, ry, col, w = 1.4) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${col}" stroke-width="${w}"/>`;
// 带外轮廓的形状
const P = (d, fill, sw = .7, ex = '') => `<path d="${d}" fill="${fill}" stroke="${OL}" stroke-width="${r2(sw * 2)}" stroke-linejoin="round" paint-order="stroke"${ex}/>`;
const C = (cx, cy, r, fill, sw = .6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${OL}" stroke-width="${r2(sw * 2)}" paint-order="stroke"/>`;
const L = (d, col, w = .6, ex = '') => `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}"${ex.includes('linecap') ? '' : ' stroke-linecap="round"'} stroke-linejoin="round"${ex}/>`;
const halo = (cx, cy, rx, ry, col, op = .6, f = 'bl2') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${col}" opacity="${op}" filter="url(#${f})"/>`;
const spark = (x, y, r, col = '#fff', op = 1) => `<path d="M${x},${r2(y - r)} L${r2(x + r * .2)},${r2(y - r * .2)} L${r2(x + r)},${y} L${r2(x + r * .2)},${r2(y + r * .2)} L${x},${r2(y + r)} L${r2(x - r * .2)},${r2(y + r * .2)} L${r2(x - r)},${y} L${r2(x - r * .2)},${r2(y - r * .2)} Z" fill="${col}" opacity="${op}"/>`;
const rivet = (x, y, r = .7) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#dfe4ec" stroke="${OL}" stroke-width=".35"/><circle cx="${r2(x - r * .3)}" cy="${r2(y - r * .3)}" r="${r2(r * .35)}" fill="#fff"/>`;

// 刻面宝石：八边形 + 台面 + 右下暗面 + 左上高光（填色默认按品质）
function gem(cx, cy, r, o = {}) {
  const sx = o.sx || 1, sy = o.sy || 1, fill = o.fill || 'url(#gm)', dk = o.dk || '#000';
  const pt = (k, i) => { const a = Math.PI * 2 * i / 8 - Math.PI / 2 + Math.PI / 8; return [r2(cx + Math.cos(a) * r * k * sx), r2(cy + Math.sin(a) * r * k * sy)]; };
  const poly = k => Array.from({ length: 8 }, (_, i) => pt(k, i).join(',')).join(' ');
  let s = '';
  if (o.halo) s += halo(cx, cy, r2(r * sx * 2), r2(r * sy * 2), o.halo, o.haloOp || .75);
  s += `<polygon points="${poly(1)}" fill="${fill}" stroke="${OL}" stroke-width="${r2(Math.max(.7, r * .32))}" stroke-linejoin="round" paint-order="stroke"/>`;
  if (r >= 1.8) {
    for (const i of [1, 2, 3]) s += `<polygon points="${pt(1, i)} ${pt(1, i + 1)} ${pt(.52, i + 1)} ${pt(.52, i)}" fill="${dk}" opacity="${.18 + (i - 1) * .08}"/>`;
    for (const i of [5, 6]) s += `<polygon points="${pt(1, i)} ${pt(1, i + 1)} ${pt(.52, i + 1)} ${pt(.52, i)}" fill="#fff" opacity=".28"/>`;
    s += `<polygon points="${poly(.52)}" fill="#fff" opacity=".18" stroke="#fff" stroke-opacity=".45" stroke-width="${r2(r * .06)}"/>`;
  }
  s += `<ellipse cx="${r2(cx - r * .34 * sx)}" cy="${r2(cy - r * .4 * sy)}" rx="${r2(r * .3 * sx)}" ry="${r2(r * .18 * sy)}" fill="#fff" opacity=".9" transform="rotate(-35 ${r2(cx - r * .34 * sx)} ${r2(cy - r * .4 * sy)})"/>`;
  if (r >= 2.6) s += spark(r2(cx - r * .42 * sx), r2(cy - r * .46 * sy), r2(r * .55));
  return s;
}

// 符文字形（折线），s=半高
const GLYPHS = [
  [[[0, -1], [0, 1]], [[0, -1], [.75, -.45], [0, .05]], [[0, .05], [.75, 1]]],
  [[[-.6, -1], [-.6, 1]], [[.6, -1], [.6, 1]], [[-.6, -.35], [.6, .35]]],
  [[[0, -1], [0, 1]], [[-.75, -1], [0, -.25], [.75, -1]]],
  [[[0, -1], [.65, 0], [0, 1], [-.65, 0], [0, -1]]],
  [[[-.65, 1], [0, -1], [.65, 1]], [[-.35, .25], [.35, .25]]],
  [[[0, -1], [0, 1]], [[-.6, -.55], [.6, .55]], [[.6, -.55], [-.6, .55]]],
  [[[-.55, -1], [.55, -.3], [-.55, .35], [.55, 1]]],
];
const rune = (x, y, s, k, col, w = .5) => L(GLYPHS[k % GLYPHS.length].map(pl => 'M' + pl.map(([a, b]) => `${r2(x + a * s * .7)},${r2(y + b * s)}`).join(' L')).join(' '), col, w);

// 闪电：发光外层 + 白芯
const zap = (pts, col, w = 1) => { const d = 'M' + pts.map(p => p.join(',')).join(' L'); return `<g filter="url(#bl)">${L(d, col, w * 2.2)}</g>${L(d, col, w * 1.2)}${L(d, '#fff', w * .5)}`; };

// 蝠翼（龙翼）：dir=1 向右展开，s=翼展
function batWing(x0, y0, s, dir, mem, bone, sw = .5, lift = 0) {
  const Q = (a, b) => `${r2(x0 + dir * a * s)},${r2(y0 + (b - lift * a) * s)}`;
  const d = `M${Q(0, 0)} L${Q(.78, -.95)} C${Q(.76, -.62)} ${Q(.86, -.46)} ${Q(1.05, -.38)} C${Q(.86, -.2)} ${Q(.84, -.02)} ${Q(.92, .16)} C${Q(.68, .06)} ${Q(.44, .12)} ${Q(.28, .3)} Z`;
  const bones = `M${Q(0, 0)} L${Q(.78, -.95)} M${Q(.1, -.12)} L${Q(1.05, -.38)} M${Q(.12, -.04)} L${Q(.92, .16)}`;
  return `<path d="${d}" fill="${mem}" stroke="${OL}" stroke-width="${r2(sw * 2)}" stroke-linejoin="round" paint-order="stroke"/>${L(bones, bone, r2(sw * 1.3))}`;
}

// 羽翼：一把扇形羽毛，dir=1 向右
function featherWing(x0, y0, s, dir, fill, line, n = 4, a0 = -80, a1 = -12) {
  let out = '';
  for (let i = 0; i < n; i++) {
    const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180;
    const len = s * (1 - i * .12), w = s * .17;
    const ux = Math.cos(a) * dir, uy = Math.sin(a), px = -uy, py = ux;
    const tip = `${r2(x0 + ux * len)},${r2(y0 + uy * len)}`;
    const c1 = `${r2(x0 + ux * len * .5 + px * w)},${r2(y0 + uy * len * .5 + py * w)}`;
    const c2 = `${r2(x0 + ux * len * .5 - px * w)},${r2(y0 + uy * len * .5 - py * w)}`;
    out += P(`M${x0},${y0} Q${c1} ${tip} Q${c2} ${x0},${y0} Z`, fill, .45);
    out += L(`M${r2(x0 + ux * len * .15)},${r2(y0 + uy * len * .15)} L${r2(x0 + ux * len * .8)},${r2(y0 + uy * len * .8)}`, line, .35);
  }
  return out + `<ellipse cx="${x0}" cy="${y0}" rx="${r2(s * .2)}" ry="${r2(s * .16)}" fill="${fill}" stroke="${OL}" stroke-width=".6" paint-order="stroke"/>`;
}

// 剑刃：左半亮、右半暗，tip=刃尖 y，sh=开刃肩部 y，base=护手处 y，w=半宽
function blade(tip, sh, base, w, Lf, Df, sw = .75) {
  const out = `M0,${tip} L${w},${sh} L${w},${base} L${-w},${base} L${-w},${sh} Z`;
  return `<path d="${out}" fill="none" stroke="${OL}" stroke-width="${sw * 2}" stroke-linejoin="round"/>`
    + `<path d="M0,${tip} L${-w},${sh} L${-w},${base} L0,${base} Z" fill="${Lf}"/>`
    + `<path d="M0,${tip} L${w},${sh} L${w},${base} L0,${base} Z" fill="${Df}"/>`;
}
function grip(y0, y1, w, fill, wrap) {
  let s = `<rect x="${-w}" y="${y0}" width="${r2(2 * w)}" height="${r2(y1 - y0)}" rx="${r2(w * .5)}" fill="${fill}" stroke="${OL}" stroke-width="1.3" paint-order="stroke"/>`;
  for (let y = y0 + 1.1; y < y1 - .3; y += 1.5) s += L(`M${r2(-w + .25)},${r2(y + .55)} L${r2(w - .25)},${r2(y - .55)}`, wrap, .55);
  return s;
}
const bz = (a, b, c, d, u) => { const v = 1 - u; return [0, 1].map(k => v * v * v * a[k] + 3 * v * v * u * b[k] + 3 * v * u * u * c[k] + u * u * u * d[k]); };

// ───────── 武器（攻击）：精铁 → 秘银 → 符文 → 龙牙 → 圣辉 → 屠龙 ─────────
function weapon(t) {
  const c = GEAR.tiers[t].color;
  let d = '', s = '';
  if (t === 0) { // 精铁战刃：朴素直剑、铁护手、皮缠柄
    d += LG('wL', [[0, '#ffffff'], [1, '#c4ccd8']]) + LG('wR', [[0, '#959fb0'], [1, '#4f5768']]);
    s += blade(-22.5, -18, 5, 2.5, 'url(#wL)', 'url(#wR)');
    s += L('M0,-16.5 L0,3.5', '#5d6577', .9) + L('M-2.2,-17.6 L-2.2,4.6', '#fff', .5);
    s += L('M1.2,-6 L2.5,-5.4', '#3a404c', .45);   // 小缺口
    s += P('M-7,4.2 L7,4.2 L7.8,5.5 L7,6.8 L-7,6.8 L-7.8,5.5 Z', 'url(#gI)');
    s += grip(6.8, 14.4, 1.5, 'url(#gLx)', '#2a1606');
    s += C(0, 16.5, 2.4, 'url(#gI)') + `<circle cx="-.8" cy="15.7" r=".8" fill="#fff" opacity=".8"/>`;
  } else if (t === 1) { // 秘银战刃：淡蓝银刃、新月护手、蓝宝石
    d += LG('wL', [[0, '#ffffff'], [1, '#d4e8fc']]) + LG('wR', [[0, '#8db4df'], [1, '#3c6094']]) + LG('gp', [[0, '#132a52'], [.35, '#4f80c8'], [1, '#0e1e3e']]);
    s += halo(0, -9, 3.5, 13, c, .35);
    s += blade(-23, -18.5, 4.6, 2.6, 'url(#wL)', 'url(#wR)');
    s += L('M0,-16.5 L0,2.5', c, 1.1) + L('M0,-16.5 L0,2.5', '#fff', .4) + L('M-2.3,-18 L-2.3,4.2', '#fff', .55);
    s += P('M-8.6,2.4 C-7,4.8 -3.5,5 0,5 C3.5,5 7,4.8 8.6,2.4 C8.3,5.6 5,7.6 0,7.6 C-5,7.6 -8.3,5.6 -8.6,2.4 Z', 'url(#gS)');
    s += gem(0, 6, 1.9);
    s += grip(7.6, 14.8, 1.45, 'url(#gp)', '#08142a');
    s += P('M0,14.4 L2.7,17 L0,19.8 L-2.7,17 Z', 'url(#gS)') + gem(0, 17.1, 1.3);
  } else if (t === 2) { // 符文战刃：乌钢刃、紫色符文、翼形护手
    d += LG('wL', [[0, '#d8d0ea'], [1, '#8f86a8']]) + LG('wR', [[0, '#594e74'], [1, '#231d33']]) + LG('gp', [[0, '#221236'], [.35, '#6a4a90'], [1, '#140a20']]);
    s += halo(0, -9, 4, 14, c, .45);
    s += blade(-23.5, -17.5, 4.2, 2.9, 'url(#wL)', 'url(#wR)');
    s += P('M-2.9,-1 L-3.8,1.6 L-2.9,4.2 Z M2.9,-1 L3.8,1.6 L2.9,4.2 Z', '#4a4060', .5);
    s += glow(L('M0,-17.5 L0,2.5', c, 1.5), 1.2);
    s += glow([-14, -9, -4, 1].map((y, i) => rune(0, y, 1.6, i + 1, '#f2e2ff', .55)).join(''), 1.3);
    s += L('M-2.6,-17.6 L-2.6,4', '#fff', .45);
    s += P('M-9.6,1.6 L-3.4,3.8 L0,3 L3.4,3.8 L9.6,1.6 L7.6,6.2 L3,7.2 L0,8 L-3,7.2 L-7.6,6.2 Z', 'url(#gK)');
    s += L('M-8.6,2.6 L-3.4,4.6 L0,3.9 L3.4,4.6 L8.6,2.6', c, .55);
    s += gem(0, 5.4, 2.2, { halo: c });
    s += grip(7.8, 14.6, 1.45, 'url(#gp)', '#0c0614');
    s += P('M0,14 L2.9,16.7 L0,20.2 L-2.9,16.7 Z', 'url(#gK)') + gem(0, 16.9, 1.5);
  } else if (t === 3) { // 龙牙战刃：弯曲的象牙龙牙、锯齿背、熔岩裂纹、龙爪护手
    d += LG('wL', [[0, '#fffdf0'], [1, '#e6d4a6']]) + LG('wR', [[0, '#c9ad78'], [1, '#7c5e30']]) + LG('gp', [[0, '#2e0806'], [.35, '#8a2a1c'], [1, '#1c0404']]);
    const A = [[-3.4, 4.5], [-4.3, -7], [-2.6, -15.5], [2.2, -23.5]], B = [[2.2, -23.5], [1.4, -16], [4, -8], [3.4, 4.5]];
    let teeth = '';
    for (const u of [.28, .4, .52, .64, .76, .88]) {
      const p = bz(...B, u), q = bz(...B, u + .02), m = bz(...B, u - .02);
      let tx = q[0] - m[0], ty = q[1] - m[1]; const n = Math.hypot(tx, ty); tx /= n; ty /= n;
      const nx = ty, ny = -tx;
      teeth += `M${r2(p[0] - tx * .9)},${r2(p[1] - ty * .9)} L${r2(p[0] + nx * 1.6 - tx * 1.1)},${r2(p[1] + ny * 1.6 - ty * 1.1)} L${r2(p[0] + tx * .9)},${r2(p[1] + ty * .9)} Z `;
    }
    const out = `M${A[0]} C${A[1]} ${A[2]} ${A[3]} C${B[1]} ${B[2]} ${B[3]} Z`;
    s += `<path d="${out}" fill="${c}" opacity=".6" filter="url(#bl2)"/>`;
    s += P(teeth, '#b39460', .5);
    s += P(out, 'url(#wR)', .75);
    s += `<path d="M${A[0]} C${A[1]} ${A[2]} ${A[3]} C0.2,-15.5 -0.4,-7 0,4.5 Z" fill="url(#wL)"/>`;
    s += glow(L('M0.5,2.5 L-0.9,-2.5 L0.4,-6.5 L-0.7,-11 L0.8,-15.5 L1.6,-19.5', c, 1.1) + L('M0.4,-6.5 L2,-8.5 M-0.7,-11 L-2.2,-12.4', c, .7), 1.3);
    s += L('M0.5,2.5 L-0.9,-2.5 L0.4,-6.5 L-0.7,-11 L0.8,-15.5', '#fff4c0', .35);
    const claw = 'M2,3.6 C5.2,3.4 8.6,1.6 9.8,-2.4 C10.2,1.2 8.4,5.2 4,7 C3,7 2.2,6.4 2,3.6 Z';
    s += P(claw, 'url(#gB)') + P(mx(claw), 'url(#gB)');
    s += L('M9.8,-2.4 L9.4,-0.6 M-9.8,-2.4 L-9.4,-0.6', '#fff2dc', .7);
    s += C(0, 5.4, 3, 'url(#gB)') + gem(0, 5.4, 2.2, { halo: c });
    s += grip(8.2, 14.6, 1.5, 'url(#gp)', '#d8955a');
    s += P('M-2.4,15.4 C-2.8,18.4 -1.6,20 0,20.6 C1.6,20 2.8,18.4 2.4,15.4 Z', 'url(#gB)') + gem(0, 17.4, 1.6);
  } else if (t === 4) { // 圣辉神兵：金边白刃、金色符文、天使羽翼护手、大金钻
    d += LG('wL', [[0, '#ffffff'], [1, '#fff3d2']]) + LG('wR', [[0, '#eadbb0'], [1, '#b0904e']]) + LG('gp', [[0, '#8d7f68'], [.35, '#fffaf0'], [1, '#6d5f48']]);
    s += halo(0, -9, 6.5, 17, c, .65);
    s += blade(-25, -18.5, 4.5, 3.7, 'url(#gG)', 'url(#gG)', .75);
    s += blade(-22.4, -17.6, 4, 2.4, 'url(#wL)', 'url(#wR)', .3);
    s += glow(L('M0,-17 L0,1.5', '#fff4c4', 1.1) + [-13, -7.5, -2].map(y => `<path d="M0,${y - 1.4} L1,${y} L0,${y + 1.4} L-1,${y} Z" fill="${c}"/>`).join(''), 1.4);
    const wing = 'M1,3.4 C4.5,2.6 8,0.4 10.6,-4.6 C11.2,-2.4 10.8,-0.8 9.8,0.4 C11.2,0.2 12.2,-0.6 12.8,-1.6 C12.6,0.8 11.4,2.4 9.6,3.4 C10.6,3.6 11.6,3.4 12.2,3 C11.2,5.4 7.6,6.6 1,6.6 Z';
    s += P(wing, 'url(#gG)') + P(mx(wing), 'url(#gG)');
    s += L('M4,3.4 C6.5,2.6 8.6,1 9.8,0.4 M4,5 C7,4.8 8.6,4 9.6,3.4', '#8a5a00', .4) + L(mx('M4,3.4 C6.5,2.6 8.6,1 9.8,0.4 M4,5 C7,4.8 8.6,4 9.6,3.4'), '#8a5a00', .4);
    s += C(0, 5, 3.3, 'url(#gG)') + gem(0, 5, 2.6, { halo: c });
    s += grip(8.4, 14.6, 1.5, 'url(#gp)', '#d8a520');
    s += Array.from({ length: 8 }, (_, i) => `<path transform="translate(0,17.4) rotate(${i * 45})" d="M0,-3.6 L.9,-2 L-.9,-2 Z" fill="url(#gd)"/>`).join('');
    s += C(0, 17.4, 2.3, 'url(#gG)') + gem(0, 17.4, 1.4);
    s += spark(-4.6, -15, 1.9) + spark(4.4, -20, 1.4) + spark(-3.4, -5, 1.1, '#fff4c4');
  } else { // 屠龙神兵：暗红巨刃、血色符文、龙骨锯齿、金色龙翼护手、雷光
    d += LG('wL', [[0, '#8a6670'], [1, '#3a2228']]) + LG('wR', [[0, '#2e1a20'], [1, '#0e0508']]) + LG('gp', [[0, '#120609'], [.35, '#4a2a32'], [1, '#080305']]);
    s += halo(0, -9, 7, 17, c, .6);
    s += P('M-4.4,-6 L-6.6,-7.6 L-4.4,-3.4 Z M-4.4,-0.6 L-6.8,-1.8 L-4.4,2 Z M4.4,-6 L6.6,-7.6 L4.4,-3.4 Z M4.4,-0.6 L6.8,-1.8 L4.4,2 Z', '#f2e2c8', .5);
    s += blade(-25, -17, 3.6, 4.4, 'url(#wL)', 'url(#wR)', .8);
    s += glow(L('M-4.1,-16.8 L-4.1,3.4 M4.1,-16.8 L4.1,3.4 M-4.1,-16.8 L0,-24.4 L4.1,-16.8', '#ff6a78', .9), 1.3) + L('M-3.9,-16.6 L-3.9,3.2 M-3.9,-16.8 L0,-24', '#ffd0d4', .35);
    s += glow(L('M0,-19 L0,1.5', '#ff6070', 1.6) + [-15, -10, -5, 0].map((y, i) => rune(0, y, 1.5, i + 3, '#fff0f2', .5)).join(''), 1.5);
    const wing = 'M1,2.4 C4.4,1.8 7.6,0 10.6,-4.2 L10.2,-1.2 L13,-2 L11.2,0.8 L14,1.2 L11,3.2 L12.6,4.4 C9,6.2 5,6.8 1,6.8 Z';
    s += P(wing, 'url(#gG)') + P(mx(wing), 'url(#gG)');
    s += L('M3.2,4.4 C6,3.8 8.4,2 10,0 M3.2,5.6 C6.6,5.4 9,4.6 10.6,3.6', '#7a1020', .5) + L(mx('M3.2,4.4 C6,3.8 8.4,2 10,0 M3.2,5.6 C6.6,5.4 9,4.6 10.6,3.6'), '#7a1020', .5);
    s += gem(11.2, 2.2, 1.1) + gem(-11.2, 2.2, 1.1);
    s += P('M-3.6,2.4 L-4.6,-0.8 L-2,1.2 L0,0.2 L2,1.2 L4.6,-0.8 L3.6,2.4 C4.6,4.6 3,8.4 0,9 C-3,8.4 -4.6,4.6 -3.6,2.4 Z', 'url(#gG)');
    s += gem(0, 4.8, 3, { halo: c });
    s += grip(9, 15, 1.55, 'url(#gp)', c);
    s += P('M-2.8,15.6 L-3.4,18.6 L-1.2,17.8 L0,21.4 L1.2,17.8 L3.4,18.6 L2.8,15.6 Z', 'url(#gG)') + gem(0, 17.2, 1.5);
    s += zap([[-6, -21], [-4.6, -18], [-7.2, -15.6], [-5.6, -12.4], [-7.8, -10]], c, .55);
    s += zap([[6.4, -13], [5, -10.2], [7.6, -8.4], [5.8, -5.6]], c, .55);
  }
  return `<defs>${d}</defs><g transform="rotate(45) translate(0,-0.5)">${s}</g>`;
}

// ───────── 护甲（防御）：皮甲 → 锁子甲 → 秘银板甲 → 龙鳞甲 → 圣辉战铠 → 屠龙神铠 ─────────
const TORSO = 'M-5,-14 C-2.5,-11 2.5,-11 5,-14 L11,-12.5 C10.4,-9 10,-6 10.2,-3 C10.6,1 10.4,5 9.5,9 C7,13 3.5,15 0,15.5 C-3.5,15 -7,13 -9.5,9 C-10.4,5 -10.6,1 -10.2,-3 C-10,-6 -10.4,-9 -11,-12.5 Z';
const PAUL = 'M6,-14.6 C10,-17.6 16.5,-16.6 18,-11 C18.8,-7.5 17.5,-4 15,-2.5 C14.5,-7 12,-10.5 6.5,-11.5 Z';
const PAUL2 = 'M10.2,-9.4 C13.2,-8.6 15.4,-6 15.8,-2.6 C16.8,-3.4 17.4,-4.4 17.6,-5.6 C17.6,-2.6 16.2,-0.2 14,0.8 C13.4,-3.6 12.2,-7 10.2,-9.4 Z';
const pauls = (fill, sw = .7) => P(PAUL, fill, sw) + P(mx(PAUL), fill, sw);
const SCALE_PAT = (id, base, edge, hi, w = 3, h = 2.4) => `<pattern id="${id}" width="${w}" height="${h}" patternUnits="userSpaceOnUse"><rect width="${w}" height="${h}" fill="${base}"/>`
  + `<path d="M0,0 C0,${h * .75} ${w},${h * .75} ${w},0 M${-w / 2},${h / 2} C${-w / 2},${h * 1.25} ${w / 2},${h * 1.25} ${w / 2},${h / 2} M${w / 2},${h / 2} C${w / 2},${h * 1.25} ${w * 1.5},${h * 1.25} ${w * 1.5},${h / 2}" fill="none" stroke="${edge}" stroke-width=".5"/>`
  + `<path d="M.4,-.35 C.5,${h * .45} ${w - .5},${h * .45} ${w - .4},-.35 M${-w / 2 + .4},${h / 2 - .35} C${-w / 2 + .5},${h * .95} ${w / 2 - .5},${h * .95} ${w / 2 - .4},${h / 2 - .35} M${w / 2 + .4},${h / 2 - .35} C${w / 2 + .5},${h * .95} ${w * 1.5 - .5},${h * .95} ${w * 1.5 - .4},${h / 2 - .35}" fill="none" stroke="${hi}" stroke-width=".35" opacity=".8"/></pattern>`;

function armor(t) {
  const c = GEAR.tiers[t].color;
  let d = '', s = '';
  const shade = `<path d="${TORSO}" fill="url(#sh)"/>`;
  if (t === 0) { // 皮革护甲
    s += P(TORSO, 'url(#gLx)', .75) + shade;
    s += L('M-6.6,-11 C-6.4,-3 -6.8,4 -7.4,10 M6.6,-11 C6.4,-3 6.8,4 7.4,10', '#e2b27e', .4, ' stroke-dasharray=".8 .7"');
    s += `<path d="M-1.2,-11.6 L1.2,-11.6 L1,4.6 L-1,4.6 Z" fill="#2a1406"/>`;
    s += L('M-1.6,-10 L1.6,-8 M1.6,-10 L-1.6,-8 M-1.6,-6.4 L1.6,-4.4 M1.6,-6.4 L-1.6,-4.4 M-1.6,-2.8 L1.6,-0.8 M1.6,-2.8 L-1.6,-0.8 M-1.4,0.8 L1.4,2.6 M1.4,0.8 L-1.4,2.6', '#f1d6a8', .5);
    s += P('M-10.4,6 C-6,7.4 6,7.4 10.4,6 L10.1,8.8 C6,10.2 -6,10.2 -10.1,8.8 Z', '#3e220c', .5);
    s += `<rect x="-1.9" y="6" width="3.8" height="3.7" fill="none" stroke="${OL}" stroke-width="1.6"/><rect x="-1.9" y="6" width="3.8" height="3.7" fill="none" stroke="#c6ccd6" stroke-width=".8"/>`;
    const sp = 'M6.4,-14.2 C9.6,-16.4 14.6,-15.6 15.6,-11.4 C16.2,-8.6 15,-6 13.4,-5 C12.8,-8.4 11,-10.6 6.8,-11.4 Z';
    s += P(sp, 'url(#gL)') + P(mx(sp), 'url(#gL)');
    s += L('M8,-13.6 C11,-14.6 14,-13 14.4,-9.6', '#e2b27e', .35, ' stroke-dasharray=".7 .6"') + L(mx('M8,-13.6 C11,-14.6 14,-13 14.4,-9.6'), '#e2b27e', .35, ' stroke-dasharray=".7 .6"');
  } else if (t === 1) { // 锁子甲：锁环纹 + 钢肩甲 + 蓝布边
    d += `<pattern id="cm" width="2" height="1.8" patternUnits="userSpaceOnUse"><rect width="2" height="1.8" fill="#3a414f"/><g fill="none" stroke="#d3d9e3" stroke-width=".4"><circle cx="0" cy="0" r=".74"/><circle cx="2" cy="0" r=".74"/><circle cx="1" cy=".9" r=".74"/><circle cx="0" cy="1.8" r=".74"/><circle cx="2" cy="1.8" r=".74"/></g></pattern>`;
    s += P(TORSO, 'url(#cm)', .75) + shade;
    s += L('M-5.6,-13.4 C-2.8,-10 2.8,-10 5.6,-13.4', '#2c5faa', 2.2) + L('M-5.4,-14 C-2.8,-10.7 2.8,-10.7 5.4,-14', '#9cc6ff', .5);
    s += L('M-9.5,10 C-7,13.2 -3.5,14.4 0,14.8 C3.5,14.4 7,13.2 9.5,10', '#2c5faa', 2.4) + L('M-9.7,9.2 C-7,12.4 -3.5,13.6 0,14 C3.5,13.6 7,12.4 9.7,9.2', '#9cc6ff', .45);
    s += P('M-10.3,5.2 C-6,6.6 6,6.6 10.3,5.2 L10.2,7.6 C6,9 -6,9 -10.2,7.6 Z', '#4a2a12', .5);
    s += P('M-2.2,5.2 L2.2,5.2 L2.2,8.8 L-2.2,8.8 Z', 'url(#gS)', .4) + gem(0, 7, 1.2);
    s += pauls('url(#gS)') + P(PAUL2, 'url(#gS)', .5) + P(mx(PAUL2), 'url(#gS)', .5);
    s += rivet(12, -13.6, .6) + rivet(-12, -13.6, .6);
  } else if (t === 2) { // 秘银铠甲：分段板甲、紫边、胸口紫晶
    s += halo(0, 0, 13, 15, c, .35);
    s += P(TORSO, 'url(#gMi)', .75) + shade;
    s += L('M-9.8,-2.2 C-6,0 -2,0 0,-2.8 C2,0 6,0 9.8,-2.2', OL, .6) + L('M-9.6,-1.4 C-6,0.8 -2,0.8 0,-2 C2,0.8 6,0.8 9.6,-1.4', '#fff', .4);
    s += L('M0,-11.2 L0,-3', '#6a6290', .55) + L('M-0.5,-11 L-0.5,-3.2', '#fff', .4);
    for (const y of [3.6, 7.2, 10.6]) s += L(`M${-10.2 + (y > 9 ? 1 : 0)},${y} C-5,${y + 1.6} 5,${y + 1.6} ${10.2 - (y > 9 ? 1 : 0)},${y}`, OL, .55) + L(`M${-10 + (y > 9 ? 1 : 0)},${y + .6} C-5,${y + 2.2} 5,${y + 2.2} ${10 - (y > 9 ? 1 : 0)},${y + .6}`, '#fff', .35, ' opacity=".8"');
    s += glow(L('M-5.4,-13.6 C-2.8,-10.6 2.8,-10.6 5.4,-13.6', c, 1), 1);
    s += pauls('url(#gMi)') + P(PAUL2, 'url(#gMi)', .5) + P(mx(PAUL2), 'url(#gMi)', .5);
    s += glow(L('M7.6,-13.8 C11,-15.6 15.6,-14.6 16.8,-10.4', c, .7) + L(mx('M7.6,-13.8 C11,-15.6 15.6,-14.6 16.8,-10.4'), c, .7), .9);
    s += C(0, -6, 3.2, 'url(#gS)', .5) + gem(0, -6, 2.4, { halo: c });
  } else if (t === 3) { // 龙鳞战铠：龙鳞纹、青铜包边、犄角肩甲、橙色龙晶
    d += LG('gDr', [[0, '#7a2a0e'], [.3, '#ff9a52'], [.62, '#c4501c'], [1, '#3e0e04']]);
    d += SCALE_PAT('sc', 'none', '#3a0e04', '#ffd2a0', 3, 2.4);
    d += `<clipPath id="ct"><path d="${TORSO}"/></clipPath>`;
    s += halo(0, 0, 14, 16, c, .4);
    s += P(TORSO, 'url(#gDr)', .75);
    s += `<rect x="-12" y="-15" width="24" height="31" fill="url(#sc)" clip-path="url(#ct)"/>` + shade;
    s += P('M-2.2,-11.6 L2.2,-11.6 L2.6,4 L0,7 L-2.6,4 Z', 'url(#gB)', .5);
    s += L('M-5.4,-13.6 C-2.8,-10.6 2.8,-10.6 5.4,-13.6', '#e8a45a', 1.2);
    const horn = 'M13.2,-15.4 C14.6,-18.4 16.6,-19.8 19,-20 C17.4,-18.6 16.6,-17 16.4,-14.6 Z';
    const horn2 = 'M16.6,-12.4 C18.6,-14.2 20.4,-14.6 21.4,-14.2 C20.2,-13.2 19.4,-12 18.6,-10.2 Z';
    d += LG('hn', [[0, '#fff6e0'], [.6, '#d8c08a'], [1, '#5a3a18']], 1, 1, 0, 0);
    s += P(horn, 'url(#hn)', .5) + P(mx(horn), 'url(#hn)', .5) + P(horn2, 'url(#hn)', .5) + P(mx(horn2), 'url(#hn)', .5);
    s += pauls('url(#gB)') + P(PAUL2, 'url(#gDr)', .5) + P(mx(PAUL2), 'url(#gDr)', .5);
    s += L('M8,-13.8 C11.4,-15.6 15.6,-14.6 16.8,-10.6', '#ffe0b0', .45) + L(mx('M8,-13.8 C11.4,-15.6 15.6,-14.6 16.8,-10.6'), '#ffe0b0', .45);
    s += C(0, -4.4, 3.4, 'url(#gB)', .5) + gem(0, -4.4, 2.7, { halo: c, sy: 1.15 });
  } else if (t === 4) { // 圣辉战铠：白金板甲、金边、太阳圣徽、羽翼肩甲
    s += halo(0, -2, 15, 16, c, .55);
    s += featherWing(14, -11, 8.5, 1, 'url(#gG)', '#8a5a00', 3, -70, -10) + featherWing(-14, -11, 8.5, -1, 'url(#gG)', '#8a5a00', 3, -70, -10);
    s += P(TORSO, 'url(#gW)', .75) + shade;
    s += `<path d="${TORSO}" transform="translate(0,.6) scale(.86)" fill="none" stroke="#d9a826" stroke-width="1"/>`;
    s += L('M-9.6,4.6 C-5,6.4 5,6.4 9.6,4.6 M-9.2,8.6 C-5,10.2 5,10.2 9.2,8.6', '#c79a3a', .6);
    s += L('M-5.4,-13.6 C-2.8,-10.6 2.8,-10.6 5.4,-13.6', 'url(#gd)', 1.3);
    s += glow(Array.from({ length: 12 }, (_, i) => `<path transform="translate(0,-4) rotate(${i * 30})" d="M0,-${i % 2 ? 5.6 : 7.4} L1.2,-2.6 L-1.2,-2.6 Z" fill="url(#gd)"/>`).join(''), .7);
    s += pauls('url(#gW)') + `<path d="${PAUL}" fill="none" stroke="#e0b030" stroke-width=".7"/><path d="${mx(PAUL)}" fill="none" stroke="#e0b030" stroke-width=".7"/>`;
    s += C(0, -4, 3.4, 'url(#gG)', .5) + gem(0, -4, 2.6, { halo: c });
    s += spark(-6.6, -7.6, 1.5) + spark(7, 2.4, 1.1);
  } else { // 屠龙神铠：黑红板甲、金边、龙首胸徽、巨角肩甲、血色裂纹
    s += halo(0, -1, 15, 16, c, .5);
    s += P(TORSO, 'url(#gCr)', .8) + shade;
    s += `<path d="${TORSO}" transform="translate(0,.6) scale(.86)" fill="none" stroke="#e8b33a" stroke-width="1.2"/>`;
    s += glow(L('M-7.6,5 L-5,7.4 L-6.4,9.8 L-4,12 M7.6,5 L5,7.4 L6.4,9.8 L4,12 M-3,9 L0,11.4 L3,9', c, .8), 1.4);
    const horn = 'M13,-15 C13.4,-19.6 16.6,-22.4 21.6,-22.6 C18.4,-21 16.8,-18.6 16.8,-14.4 Z';
    d += LG('hn', [[0, '#fff2e0'], [.55, '#c8a070'], [1, '#2a1006']], 1, 1, 0, 0);
    s += P(horn, 'url(#hn)', .55) + P(mx(horn), 'url(#hn)', .55);
    s += pauls('url(#gCr)', .75) + P(PAUL2, 'url(#gCr)', .5) + P(mx(PAUL2), 'url(#gCr)', .5);
    s += `<path d="${PAUL}" fill="none" stroke="#e8b33a" stroke-width=".7"/><path d="${mx(PAUL)}" fill="none" stroke="#e8b33a" stroke-width=".7"/>`;
    s += P('M18,-11 L21,-9.6 L18.4,-8.4 Z M-18,-11 L-21,-9.6 L-18.4,-8.4 Z M16.4,-5 L19.2,-3 L16,-2.6 Z M-16.4,-5 L-19.2,-3 L-16,-2.6 Z', '#f2e2c8', .4);
    // 龙首胸徽：金色龙首 + 双翼 + 血红龙心
    s += batWing(2.6, -4.6, 7.2, 1, 'url(#gG)', '#7a1020', .45, .2) + batWing(-2.6, -4.6, 7.2, -1, 'url(#gG)', '#7a1020', .45, .2);
    s += P('M-3.4,-9.6 L-5.4,-12.8 L-1.6,-10.8 L0,-11.6 L1.6,-10.8 L5.4,-12.8 L3.4,-9.6 C4.6,-6.6 3.6,-1.6 0,0.6 C-3.6,-1.6 -4.6,-6.6 -3.4,-9.6 Z', 'url(#gG)', .55);
    s += gem(0, -5, 3, { halo: c, sy: 1.15 });
    s += gem(-5.6, 4, .9) + gem(5.6, 4, .9);
  }
  return `<defs>${d}</defs>${s}`;
}

// ───────── 战靴（攻速）：皮靴 → 迅捷 → 疾风 → 龙翼 → 神行 → 奔雷 ─────────
const BOOT = 'M-8,-15 L4.2,-15 L4.6,-1.5 C7.5,-0.5 11.5,1.5 13.8,4 C15.6,6 15.6,9.6 14,11 L-9,11 C-10.6,10 -10.6,6.5 -9.6,3.5 Z';
const SOLE = 'M-10.1,10.4 L14.6,10.4 C15.3,12 14.2,13.6 12.4,13.6 L-8.8,13.6 C-10.2,13.6 -10.7,12 -10.1,10.4 Z';
const HEEL = 'M-10,12.4 L-3.6,12.4 L-3.8,15.4 L-9.6,15.4 Z';
const CUFF = 'M-9.2,-17.4 L5.6,-17.4 L5.3,-11.4 L-8.9,-11.4 Z';

function engine(t) {
  const c = GEAR.tiers[t].color;
  let d = '', s = '';
  const shade = `<path d="${BOOT}" fill="url(#sh)"/>`;
  const sole = (f = '#2a1a10', h = '#1e120a') => P(HEEL, h, .55) + P(SOLE, f, .55);
  if (t === 0) { // 皮靴
    s += sole() + P(BOOT, 'url(#gLx)', .75) + shade;
    s += P(CUFF, 'url(#gL)', .6) + L('M-8.6,-13.4 L5.3,-13.4', '#5a3418', .45);
    s += L('M2.4,-9.6 L4.4,-8.2 M4.4,-9.6 L2.4,-8.2 M2.4,-6.6 L4.4,-5.2 M4.4,-6.6 L2.4,-5.2 M2.4,-3.6 L4.4,-2.2 M4.4,-3.6 L2.4,-2.2', '#f0d4a6', .45);
    s += L('M-1.6,0.6 C0.4,1.6 2.4,1.6 4.4,0.6', '#4a2a12', .5) + L('M8.6,3.2 C11.6,4.6 13.4,6.8 13.4,9.6', '#e2b27e', .38, ' stroke-dasharray=".7 .6"');
  } else if (t === 1) { // 迅捷之靴：蓝皮、银扣带、白羽、速度线
    d += LG('gBl', [[0, '#1a3768'], [.3, '#6ea4ea'], [.65, '#2f5ea6'], [1, '#0e2044']]);
    s += L('M-17.6,-1 L-11.4,-1 M-18.6,3 L-11,3 M-16.6,7 L-11,7', c, 1, ' opacity=".8"');
    s += sole() + P(BOOT, 'url(#gBl)', .75) + shade;
    s += P(CUFF, '#e8eef8', .6) + L('M-8.6,-13.6 L5.3,-13.6', '#9aa8c0', .45);
    s += featherWing(-8.4, -14.6, 7.6, -1, '#ffffff', '#9fb4d4', 3, -70, -20);
    for (const y of [-8.4, -3.8]) s += P(`M-8.6,${y} L4.6,${y} L4.6,${y + 1.8} L-8.8,${y + 1.8} Z`, '#3a2416', .4) + P(`M0.4,${y - .4} L3.4,${y - .4} L3.4,${y + 2.2} L0.4,${y + 2.2} Z`, 'url(#gS)', .35);
    s += gem(1.9, -7.5, 1.1);
    s += P('M10.4,3 C12.6,4 14.8,5.8 15.2,8.6 C15.3,9.8 14.8,10.6 14,11 L11,11 C11.8,8.4 11.6,5.4 10.4,3 Z', 'url(#gS)', .4);
  } else if (t === 2) { // 疾风战靴：紫皮、钢护胫、钢趾盖、风旋
    d += LG('gPl', [[0, '#3a2058'], [.3, '#c4a0ee'], [.65, '#6c46a4'], [1, '#221038']]);
    s += sole('#1c1222', '#120a16') + P(BOOT, 'url(#gPl)', .75) + shade;
    s += P(CUFF, 'url(#gMi)', .6);
    s += featherWing(-8.6, -9.6, 7, -1, 'url(#gMi)', '#6a6290', 3, -64, -16);
    s += P('M-1,-17 C2.6,-18.6 6.6,-17.4 6.8,-13.4 L6,-0.8 C4,-0.2 1.6,-0.6 -0.2,-2 Z', 'url(#gMi)', .55);
    s += L('M2.6,-12 L2.4,-3', '#7a82a0', .5) + gem(3.2, -14, 1.6, { halo: c });
    s += P('M9,2.2 C12,3 14.6,5 15,8 C15.2,9.6 14.8,10.6 14,11 L9.6,11 C10.4,8 10.2,4.6 9,2.2 Z', 'url(#gS)', .45);
    s += glow(L('M-15,-1.4 C-10,-4.8 0,-5 5.6,-2.6 C8.4,-1.2 7.4,1.4 5,0.6', c, 1) + L('M-16.6,4.4 C-12,1.6 -6,1.2 -2.6,2.8', c, .8) + L('M-14.6,9.4 C-12,7.8 -9.4,7.6 -7.6,8.2', c, .6), 1.3);
    s += L('M-15,-1.4 C-10,-4.8 0,-5 5.6,-2.6', '#fff', .35);
  } else if (t === 3) { // 龙翼战靴：龙鳞靴筒、青铜护膝、龙爪趾、龙翼
    d += LG('gDr', [[0, '#7a2a0e'], [.3, '#ff9a52'], [.62, '#c4501c'], [1, '#3e0e04']]);
    d += SCALE_PAT('sc', 'none', '#3a0e04', '#ffd2a0', 2.6, 2.1);
    d += `<clipPath id="cb"><path d="${BOOT}"/></clipPath>`;
    d += LG('mem', [[0, '#ffb05a'], [.5, '#d0501c'], [1, '#5a1206']], 1, 0, 0, 1);
    s += halo(-4, -2, 12, 13, c, .35);
    s += batWing(-7.4, -4, 11.6, -1, 'url(#mem)', '#4a2410', .5, .1);
    s += sole() + P(BOOT, 'url(#gDr)', .75);
    s += `<rect x="-11" y="-16" width="27" height="28" fill="url(#sc)" clip-path="url(#cb)"/>` + shade;
    s += P(CUFF, 'url(#gB)', .6) + P('M-0.6,-17.4 L5.8,-17.4 L6.6,-20.6 L3.2,-17.8 Z', '#f2e2c8', .4);
    s += P('M11.4,3.2 C14.6,4 17,6.6 17.6,10.8 C16.6,9.4 15.4,8.8 14,8.8 C13.6,6.6 12.8,4.8 11.4,3.2 Z', '#f2e2c8', .45);
    s += P('M8.4,1.4 C11.6,2.4 14,4.4 14.4,8 L9.6,10.6 C10.6,7.6 10,4 8.4,1.4 Z', 'url(#gB)', .45);
    s += C(-2.4, -3, 2.4, 'url(#gB)', .45) + gem(-2.4, -3, 1.8, { halo: c });
  } else if (t === 4) { // 神行战靴：白金甲靴、金边、大金羽翼
    s += halo(-3, -3, 14, 14, c, .5);
    s += featherWing(-6.6, -5, 13.6, -1, 'url(#gG)', '#8a5a00', 4, -82, -8);
    s += sole('#6a5020', '#4a3810') + P(BOOT, 'url(#gW)', .75) + shade;
    s += L('M-9.2,-6 L4.4,-6 M-9.4,0.6 L4.6,0.6', '#c79a3a', .6) + L('M6.4,0 C8.2,2.6 8.6,6.4 8,10.6 M10,1.6 C11.6,4 12,7 11.6,10.6', '#c79a3a', .6);
    s += P(CUFF, 'url(#gG)', .6) + L('M-8.6,-14.4 L5.3,-14.4', '#8a5a00', .4);
    s += P('M11.4,3.2 C13.6,4.4 15.2,6 15.4,8.6 C15.4,9.8 14.8,10.6 14,11 L12,11 C12.6,8.4 12.4,5.6 11.4,3.2 Z', 'url(#gG)', .4);
    s += C(-3, -2.6, 2.6, 'url(#gG)', .45) + gem(-3, -2.6, 2, { halo: c });
    s += spark(-15, 6, 1.6) + spark(-12, 10.4, 1, '#fff4c4') + spark(9.4, -10, 1.2);
  } else { // 奔雷神靴：黑红甲靴、金边、尖刺护膝、龙翼、红色雷霆
    s += halo(-2, 0, 15, 15, c, .45);
    s += zap([[-9, 12], [-12.4, 10.6], [-11.4, 14], [-15.6, 13], [-17.6, 16]], c, .7);
    s += batWing(-7.6, -6, 10.6, -1, 'url(#gCr)', '#e8b33a', .5, .15);
    s += sole('#1a0a10', '#100508') + P(BOOT, 'url(#gCr)', .75) + shade;
    s += `<path d="${BOOT}" transform="translate(2,1) scale(.86)" fill="none" stroke="#e8b33a" stroke-width="1.1"/>`;
    s += P(CUFF, 'url(#gCr)', .6) + L('M-8.6,-12 L5.3,-12', '#e8b33a', .7);
    s += P('M-0.6,-17 C2.6,-19 6,-18 6.8,-14.6 L10.6,-19.6 L8.6,-12.4 L6,-10.6 Z', 'url(#gG)', .5);
    s += P('M10.2,2.6 C13,3.6 15.6,5.4 16.6,7.6 L19.4,8.6 L16.4,10 C15.6,10.6 14.8,11 14,11 L11.4,11 C12,8.4 11.6,5.4 10.2,2.6 Z', 'url(#gG)', .45);
    s += glow(L('M-6,-8 L-2,-6 L-4.6,-3.4 L-0.6,-1.6', c, .7), 1.2);
    s += C(-3, -0.4, 2.8, 'url(#gG)', .45) + gem(-3, -0.4, 2.2, { halo: c });
    s += zap([[5.6, -3], [9.4, -6.6], [8, -8.6], [12.6, -11.6]], c, .6);
  }
  return `<defs>${d}</defs><g transform="translate(-1.6,0.4)">${s}</g>`;
}

// ───────── 头盔（暴击率）：铁盔 → 鹰眼 → 符文巨盔 → 龙角 → 圣辉王冠 → 屠龙神冠 ─────────
const SHELL = 'M0,-16 C8.5,-16 13,-9.5 13,-1 L12.6,9.5 C12.2,12.6 10,14.6 6.8,14.6 L-6.8,14.6 C-10,14.6 -12.2,12.6 -12.6,9.5 L-13,-1 C-13,-9.5 -8.5,-16 0,-16 Z';

function scope(t) {
  const c = GEAR.tiers[t].color;
  let d = '', s = '';
  const shade = d0 => `<path d="${d0}" fill="url(#sh)"/>`;
  if (t === 0) { // 铁盔：护鼻盔
    s += P(SHELL, 'url(#gI)', .75) + shade(SHELL);
    s += P('M-8.4,0.4 C-8.4,-0.8 -7.6,-1.4 -6.4,-1.4 L6.4,-1.4 C7.6,-1.4 8.4,-0.8 8.4,0.4 L8.4,13.4 C8.4,14 8,14.6 7.4,14.6 L-7.4,14.6 C-8,14.6 -8.4,14 -8.4,13.4 Z', '#14101c', .3);
    s += P('M-13,-5 C-8,-6.4 8,-6.4 13,-5 L13,-1.8 C8,-3.2 -8,-3.2 -13,-1.8 Z', 'url(#gI)', .5);
    s += [-10.4, -5.4, 5.4, 10.4].map(x => rivet(x, -3.6 - (Math.abs(x) < 6 ? .55 : .15), .62)).join('');
    s += P('M-1.4,-4 L1.4,-4 L1.3,9 L0,10.4 L-1.3,9 Z', 'url(#gS)', .5);
    s += L('M-1.2,-15.4 C-4.4,-14 -6.6,-10.6 -7.4,-6.6', '#fff', .6, ' opacity=".8"') + L('M0,-15.8 L0,-5.6', '#5a6070', .55);
  } else if (t === 1) { // 鹰眼头盔：钢盔、鹰喙护鼻、鹰眼目缝、羽翼盔饰
    d += LG('gBf', [[0, '#bcd8ff'], [.5, '#4f8fe6'], [1, '#163a78']], 0, 0, 1, 1);
    s += featherWing(11.4, -6, 8.6, 1, '#f2f6fc', '#8aa0c0', 3, -66, -14) + featherWing(-11.4, -6, 8.6, -1, '#f2f6fc', '#8aa0c0', 3, -66, -14);
    s += P('M-1.6,-15.2 C-2.6,-20 2,-22.6 6.4,-20.8 C3.6,-20.2 2.4,-18.4 2,-15.2 Z', 'url(#gBf)', .5);
    s += P(SHELL, 'url(#gS)', .75) + shade(SHELL);
    s += P('M-8.6,-1.2 C-6,-2.6 -3,-2.4 -1.4,-0.6 L-2,1.8 C-4,0.8 -6.6,0.8 -8.4,1.8 Z', '#0d1222', .3) + P(mx('M-8.6,-1.2 C-6,-2.6 -3,-2.4 -1.4,-0.6 L-2,1.8 C-4,0.8 -6.6,0.8 -8.4,1.8 Z'), '#0d1222', .3);
    s += glow(`<ellipse cx="-4.8" cy="0.2" rx="2.4" ry=".7" fill="${c}"/><ellipse cx="4.8" cy="0.2" rx="2.4" ry=".7" fill="${c}"/>`, 1.2);
    s += L('M-6.4,6 L-2.8,6 M-6.4,8.6 L-2.8,8.6 M6.4,6 L2.8,6 M6.4,8.6 L2.8,8.6', '#3a4152', .7);
    s += P('M-2.2,-4.6 L2.2,-4.6 L1.6,3.6 L0,8.4 L-1.6,3.6 Z', 'url(#gG)', .5);
    s += L('M-12.6,10.6 C-8,13 8,13 12.6,10.6', c, .8);
    s += gem(0, -7, 1.6, { halo: c });
  } else if (t === 2) { // 符文头盔：秘银巨盔、紫色羽冠、T 形目缝紫光、符文
    const H = 'M0,-15 C8.6,-15 12.6,-10.4 12.6,-3.4 L12.6,11 C12.6,13.4 11,14.8 8.6,14.8 L-8.6,14.8 C-11,14.8 -12.6,13.4 -12.6,11 L-12.6,-3.4 C-12.6,-10.4 -8.6,-15 0,-15 Z';
    d += LG('pl', [[0, '#f2e2ff'], [.45, c], [1, '#3e1a6e']], 0, 0, 1, 1);
    s += halo(0, 0, 13, 14, c, .4);
    s += P('M-1.8,-13.4 C-4,-18 -1,-21.6 4.6,-21.6 C9.6,-21.6 13.6,-18.6 15,-13.8 C12.6,-16.2 9.4,-16.8 7,-16 C9.6,-14.6 11,-12.6 11.4,-10 C8.6,-13 5,-13.6 1.8,-13 Z', 'url(#pl)', .55);
    s += L('M0.6,-15 C2.4,-18 6,-19.4 10.6,-18.4 M2,-13.6 C4.4,-15.6 7.6,-15.8 10.4,-13.6', '#f6ecff', .4);
    s += P(H, 'url(#gMi)', .75) + shade(H);
    s += P('M-1.6,-14.8 L1.6,-14.8 L1.4,-2.6 L-1.4,-2.6 Z', 'url(#gK)', .35);
    s += `<path d="M-9.6,-1.2 L9.6,-1.2 L9.6,1.4 L1.3,1.4 L1.3,9.6 L-1.3,9.6 L-1.3,1.4 L-9.6,1.4 Z" fill="#0b0812"/>`;
    s += glow(`<path d="M-8.8,-.5 L8.8,-.5 L8.8,.7 L.6,.7 L.6,8.8 L-.6,8.8 L-.6,.7 L-8.8,.7 Z" fill="${c}"/>`, 1.4);
    s += [[-6.4, 5], [-6.4, 8], [-4, 6.5], [6.4, 5], [6.4, 8], [4, 6.5]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".6" fill="#2a1e40"/>`).join('');
    s += glow(rune(-6.4, -7.4, 1.8, 0, c, .7) + rune(6.4, -7.4, 1.8, 4, c, .7) + rune(-9.8, 6, 1.4, 2, c, .6) + rune(9.8, 6, 1.4, 5, c, .6), 1.1);
    s += L('M-12.4,11.6 C-8,13.4 8,13.4 12.4,11.6', c, .9);
    s += gem(0, -5, 1.8, { halo: c });
  } else if (t === 3) { // 龙角战盔：青铜龙鳞盔、一对巨大龙角、橙色怒目
    d += SCALE_PAT('sc', 'none', '#3a1a06', '#ffd6a0', 2.6, 2.1);
    d += `<clipPath id="cs"><path d="${SHELL}"/></clipPath>`;
    d += LG('hn', [[0, '#fff6e0'], [.55, '#d6be8a'], [1, '#3a2010']], 0, 1, 1, 0);
    s += halo(0, -2, 14, 14, c, .4);
    const horn = 'M10.4,-6.4 C14.6,-8 17.4,-11.6 17.4,-16.4 C17.4,-18.2 16.8,-19.6 15.6,-21 C15.2,-16.6 13.6,-13.2 9.4,-11.4 Z';
    s += P(horn, 'url(#hn)', .6) + P(mx(horn), 'url(#hn)', .6);
    s += L('M12,-7.6 L11,-10.4 M14.2,-9.6 L12.8,-12 M15.8,-12.6 L14.2,-14.4', '#7a5a30', .45) + L(mx('M12,-7.6 L11,-10.4 M14.2,-9.6 L12.8,-12 M15.8,-12.6 L14.2,-14.4'), '#7a5a30', .45);
    s += P(SHELL, 'url(#gB)', .75);
    s += `<rect x="-13" y="-16" width="26" height="12" fill="url(#sc)" clip-path="url(#cs)"/>` + shade(SHELL);
    s += P('M-13,-4.4 C-8,-6 8,-6 13,-4.4 L13,-2 C8,-3.4 -8,-3.4 -13,-2 Z', '#5a2e10', .45);
    s += P('M-9,0.6 L-2,-1.4 L-1.4,2 L-8.4,2.4 Z', '#140806', .3) + P(mx('M-9,0.6 L-2,-1.4 L-1.4,2 L-8.4,2.4 Z'), '#140806', .3);
    s += glow(`<path d="M-8,1 L-2.6,-0.4 L-2.2,1.2 Z" fill="${c}"/><path d="M8,1 L2.6,-0.4 L2.2,1.2 Z" fill="${c}"/>`, 1.4);
    s += P('M-1.4,-3 L1.4,-3 L1.2,7.4 L0,9 L-1.2,7.4 Z', 'url(#gB)', .45);
    s += P('M-12.6,10 L-14.6,15.6 L-10,13.2 Z M12.6,10 L14.6,15.6 L10,13.2 Z', '#f2e2c8', .4);
    s += gem(0, -7.4, 2, { halo: c });
  } else if (t === 4) { // 圣辉王冠：金冠、珍珠尖、金钻、圣光、金羽
    d += RG('cap', [[0, '#ffffff'], [.5, '#fff1b8'], [1, '#e0a820', .2]], .5, .9, .7);
    s += halo(0, -4, 15, 13, c, .6);
    s += featherWing(12.2, 4, 8, 1, 'url(#gG)', '#8a5a00', 3, -60, -6) + featherWing(-12.2, 4, 8, -1, 'url(#gG)', '#8a5a00', 3, -60, -6);
    s += `<path d="M-11,2 C-11,-9 11,-9 11,2 Z" fill="url(#cap)"/>`;
    s += glow(L('M0,-12 L0,-17.4 M-6,-8 L-8.4,-12.4 M6,-8 L8.4,-12.4', '#fff8d8', .6), 1.4);
    const pts = 'M-12.8,2.6 L-14,-7.6 L-9.2,-2.4 L-6.4,-11.6 L-3.2,-3.2 L0,-15.6 L3.2,-3.2 L6.4,-11.6 L9.2,-2.4 L14,-7.6 L12.8,2.6 Z';
    s += P(pts, 'url(#gG)', .7) + L('M-6.4,-11.6 L-4.8,-3.4 M6.4,-11.6 L4.8,-3.4 M0,-15.6 L0,-3', '#fff8d8', .4);
    s += P('M-13,1.4 C-6,3.8 6,3.8 13,1.4 L12.6,9.2 C6,11.6 -6,11.6 -12.6,9.2 Z', 'url(#gG)', .7);
    s += L('M-12.8,3.2 C-6,5.6 6,5.6 12.8,3.2 M-12.6,7.6 C-6,10 6,10 12.6,7.6', '#8a5a00', .45);
    s += [[-14, -7.6], [-6.4, -11.6], [6.4, -11.6], [14, -7.6]].map(([x, y]) => C(x, y - .4, 1.15, '#fffaf0', .35) + `<circle cx="${x - .35}" cy="${y - .8}" r=".4" fill="#fff"/>`).join('');
    s += gem(0, -15.8, 1.5) + gem(-7.6, 6.4, 1.3) + gem(7.6, 6.4, 1.3);
    s += gem(0, 6.4, 2.8, { halo: c });
    s += spark(-9, -14, 1.5) + spark(10.4, -15, 1.1);
  } else { // 屠龙神冠：黑红龙角冠、金边、血红巨钻、龙翼、赤焰
    d += LG('fl', [[0, '#fff2c0'], [.35, '#ff8a4a'], [1, c, 0]], 0, 1, 0, 0);
    s += halo(0, -3, 15, 14, c, .5);
    s += batWing(11.6, 3.4, 10, 1, 'url(#gCr)', '#e8b33a', .5, .1) + batWing(-11.6, 3.4, 10, -1, 'url(#gCr)', '#e8b33a', .5, .1);
    s += glow(`<path d="M-4,-6 C-5,-11 -2,-14 0,-20 C2,-14 5,-11 4,-6 Z" fill="url(#fl)"/>`, 1);
    const sp = 'M-13,2.6 C-14.8,-2 -16.6,-6 -18.4,-9.6 C-14.6,-7.6 -12.2,-5 -10.6,-2 L-8.6,-11.6 C-7.6,-8 -6.2,-5.2 -4.6,-3.2 L0,-17.6 L4.6,-3.2 C6.2,-5.2 7.6,-8 8.6,-11.6 L10.6,-2 C12.2,-5 14.6,-7.6 18.4,-9.6 C16.6,-6 14.8,-2 13,2.6 Z';
    s += P(sp, 'url(#gCr)', .7);
    s += `<path d="${sp}" transform="translate(0,1.2) scale(.86)" fill="none" stroke="#e8b33a" stroke-width=".6"/>`;
    s += glow(L('M0,-14 L0,-5 M-8.4,-9 L-7,-4 M8.4,-9 L7,-4', c, .6), 1.3);
    s += P('M-13.2,1.4 C-6,4 6,4 13.2,1.4 L12.8,10 C6,12.6 -6,12.6 -12.8,10 Z', 'url(#gCr)', .7);
    s += L('M-13,2.6 C-6,5.2 6,5.2 13,2.6 M-12.8,9 C-6,11.6 6,11.6 12.8,9', '#e8b33a', .7);
    s += P('M-4.4,2.8 L-6.4,-0.6 L-2.4,1.2 L0,-1.4 L2.4,1.2 L6.4,-0.6 L4.4,2.8 C5.6,6 4,10.4 0,11.6 C-4,10.4 -5.6,6 -4.4,2.8 Z', 'url(#gG)', .55);
    s += gem(0, 6.4, 3.2, { halo: c, sy: 1.1 });
    s += gem(-9, 6.2, 1.2) + gem(9, 6.2, 1.2) + gem(0, -11.4, 1.1);
  }
  return `<defs>${d}</defs>${s}`;
}

// ───────── 护符（暴击伤害）：铜质 → 星辰 → 烈焰 → 龙心 → 神谕 → 混沌龙心 ─────────
const CHAIN = 'M-12.6,-18.6 C-12.4,-9 -6.6,-3.6 -1.6,-1.8 M12.6,-18.6 C12.4,-9 6.6,-3.6 1.6,-1.8';
const chain = (col, hi, w = 1.5) => L(CHAIN, OL, r2(w + 1)) + L(CHAIN, col, w, ' stroke-dasharray="1.5 .7" stroke-linecap="butt"') + L(CHAIN, hi, r2(w * .35), ' stroke-dasharray=".6 1.6" stroke-linecap="butt" stroke-dashoffset="-.3"');

function core(t) {
  const c = GEAR.tiers[t].color;
  let d = '', s = '';
  if (t === 0) { // 铜质护符：铜链、铜章、浮雕纹、铜绿
    d += LG('gCu', [[0, '#6a3616'], [.3, '#eaa87a'], [.6, '#a85a2a'], [1, '#3e1a08']]);
    s += chain('#b06a38', '#ffd2a8');
    s += C(0, -0.6, 1.8, 'none', .4) + `<circle cx="0" cy="-0.6" r="1.6" fill="none" stroke="#c07a44" stroke-width="1"/>`;
    s += C(0, 7.4, 8, 'url(#gCu)', .75) + `<circle cx="0" cy="7.4" r="8" fill="url(#sh)"/>`;
    s += `<circle cx="0" cy="7.4" r="6" fill="none" stroke="#3e1a08" stroke-width=".6"/><circle cx="0" cy="7.9" r="6" fill="none" stroke="#f0b88a" stroke-width=".4" opacity=".6"/>`;
    s += L('M0,3.4 L0,11.4 M-4,7.4 L4,7.4 M-2.8,4.6 L2.8,10.2 M2.8,4.6 L-2.8,10.2', '#5a280e', .7) + `<circle cx="0" cy="7.4" r="1.8" fill="#c27a44" stroke="#4a200a" stroke-width=".5"/>`;
    s += [[-4.6, 11], [4.4, 3.6], [-5.6, 5], [3.4, 12]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${.7 + (i % 2) * .4}" fill="#5aa088" opacity=".55"/>`).join('');
  } else if (t === 1) { // 星辰护符：银链、八芒银星、蓝宝石
    s += chain('#c9d1de', '#ffffff');
    s += halo(0, 7, 9, 9, c, .4);
    const star = Array.from({ length: 16 }, (_, i) => { const a = Math.PI * i / 8 - Math.PI / 2, r = i % 4 === 0 ? 9.6 : i % 2 === 0 ? 5.6 : 3.6; return `${r2(Math.cos(a) * r)},${r2(7.2 + Math.sin(a) * r)}`; }).join(' L');
    s += P(`M${star} Z`, 'url(#gS)', .7) + `<path d="M${star} Z" fill="url(#sh)"/>`;
    s += L('M0,-2.4 L0,16.8 M-9.6,7.2 L9.6,7.2', '#6a7488', .4);
    s += C(0, -1.8, 1.4, 'none', .3) + `<circle cx="0" cy="-1.8" r="1.2" fill="none" stroke="#e8eef8" stroke-width=".8"/>`;
    s += gem(0, 7.2, 3.2, { halo: c });
    s += spark(-8, 0, 1.4, '#cfe6ff') + spark(8.6, 14.4, 1.2, '#cfe6ff') + spark(9.6, -1, .9);
  } else if (t === 2) { // 烈焰护符：银焰座、紫色泪滴宝石、紫焰
    s += chain('#aaa2c2', '#f2ecff');
    s += glow(`<path d="M0,-6 C1.6,-3 3.6,-1.6 3.6,1 C3.6,3 2,4 0,4 C-2,4 -3.6,3 -3.6,1 C-3.6,-1.6 -1.6,-3 0,-6 Z" fill="${c}" opacity=".9"/>`, 1.4);
    const fr = 'M0,-3.6 C1.4,-1 3.6,0.2 5.6,-0.6 C5,2.2 7.8,5 7.8,9 C7.8,13.6 4.4,16.6 0,16.6 C-4.4,16.6 -7.8,13.6 -7.8,9 C-7.8,5 -5,2.2 -5.6,-0.6 C-3.6,0.2 -1.4,-1 0,-3.6 Z';
    s += P(fr, 'url(#gS)', .7) + `<path d="${fr}" fill="url(#sh)"/>`;
    s += L('M-6.4,2.6 C-7.4,0.8 -8.6,0 -9.6,-0.6 C-8.6,1.6 -8.2,3.6 -7.6,5.2 M6.4,2.6 C7.4,0.8 8.6,0 9.6,-0.6 C8.6,1.6 8.2,3.6 7.6,5.2', '#aaa2c2', 1);
    s += halo(0, 9, 6, 7, c, .7);
    const drop = 'M0,1 C2.6,4 5,6.4 5,9.6 C5,12.6 2.8,14.4 0,14.4 C-2.8,14.4 -5,12.6 -5,9.6 C-5,6.4 -2.6,4 0,1 Z';
    s += P(drop, 'url(#gm)', .55);
    s += `<path d="M0,1 L0,14.4 M-5,9.6 L5,9.6 M0,1 L-3.2,9.6 L0,14.4 L3.2,9.6 Z" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width=".35"/>`;
    s += `<path d="M0,1 C2.6,4 5,6.4 5,9.6 C5,12.6 2.8,14.4 0,14.4 Z" fill="${T_DARK[t]}" opacity=".35"/>`;
    s += `<ellipse cx="-2" cy="7" rx="1.2" ry="2" fill="#fff" opacity=".85" transform="rotate(25 -2 7)"/>` + spark(-2.2, 6.6, 1.8);
  } else if (t === 3) { // 龙心护符：龙爪托着燃烧的龙心宝石
    s += chain('#c8843f', '#ffe0b8');
    s += halo(0, 7.6, 9, 10, c, .75);
    const wing = 'M2.6,-0.4 C5.6,-3.6 9.4,-4.6 12,-3.4 C10.6,-2.6 10.2,-1.6 10.6,-0.2 C9.4,-1 8,-0.8 7.2,0.4 C6.4,-0.4 5,-0.2 3.6,1.6 Z';
    s += P(wing, 'url(#gB)', .5) + P(mx(wing), 'url(#gB)', .5);
    s += C(0, -0.6, 2.2, 'url(#gB)', .5);
    s += P('M0,1.2 C3.2,-1.4 7.4,1.6 6.6,6.4 C6,10 3,12.6 0,15.4 C-3,12.6 -6,10 -6.6,6.4 C-7.4,1.6 -3.2,-1.4 0,1.2 Z', 'url(#gm)', .65);
    s += `<path d="M0,1.2 C3.2,-1.4 7.4,1.6 6.6,6.4 C6,10 3,12.6 0,15.4 Z" fill="${T_DARK[t]}" opacity=".35"/>`;
    s += glow(`<ellipse cx="0" cy="7.4" rx="2.2" ry="2.8" fill="#fff4d8"/>`, 1.2);
    s += `<ellipse cx="-3.2" cy="3.6" rx="1.6" ry="1" fill="#fff" opacity=".85" transform="rotate(-35 -3.2 3.6)"/>` + spark(-3.4, 3.4, 1.6);
    const tal = 'M-2.6,0.4 C-6.4,0.8 -8.6,4.4 -8.2,8.6 C-8,10.6 -7,12 -5.6,12.8 C-6.4,10.4 -6.4,8 -5.2,5.8 C-4.6,4.6 -3.6,3.6 -2.4,3.2 Z';
    s += P(tal, 'url(#gB)', .5) + P(mx(tal), 'url(#gB)', .5);
    s += P('M-5.6,12.8 L-4.4,15 L-4.2,12.2 Z M5.6,12.8 L4.4,15 L4.2,12.2 Z M-1.6,15 L0,17.8 L1.6,15 Z', '#f2e2c8', .35);
  } else if (t === 4) { // 神谕护符：金色太阳盘、圣眼、珍珠金链
    s += L(CHAIN, OL, 2.6) + L(CHAIN, '#ffd04a', 1.6, ' stroke-dasharray="1.2 1.2" stroke-linecap="butt"') + L(CHAIN, '#fffaf0', 1.7, ' stroke-dasharray=".01 2.4" stroke-dashoffset="-1.8"');
    s += halo(0, 7, 12, 12, c, .7);
    s += glow(Array.from({ length: 16 }, (_, i) => `<path transform="translate(0,7) rotate(${i * 22.5})" d="M0,-${i % 2 ? 9.4 : 12} L1.3,-6 L-1.3,-6 Z" fill="url(#gd)"/>`).join(''), .8);
    s += C(0, 7, 7, 'url(#gG)', .7) + `<circle cx="0" cy="7" r="7" fill="url(#sh)"/>`;
    s += `<circle cx="0" cy="7" r="5.4" fill="none" stroke="#8a5a00" stroke-width=".5"/>`;
    s += P('M-5,7 C-2.8,3.4 2.8,3.4 5,7 C2.8,10.6 -2.8,10.6 -5,7 Z', '#fffaf0', .45);
    s += gem(0, 7, 2.3) + `<circle cx="0" cy="7" r=".9" fill="#3a2400"/><circle cx="-.6" cy="6.3" r=".5" fill="#fff"/>`;
    s += C(0, -1.4, 1.6, 'url(#gG)', .4);
    s += spark(-9.6, -1.6, 1.6) + spark(10, 15, 1.3) + spark(10.6, -2.6, 1);
  } else { // 混沌龙心：黑金龙翼托着混沌血钻、漩涡、雷光
    s += L(CHAIN, OL, 2.6) + L(CHAIN, '#e8b33a', 1.6, ' stroke-dasharray="1.3 1.1" stroke-linecap="butt"') + L(CHAIN, c, 1.8, ' stroke-dasharray=".01 2.4" stroke-dashoffset="-1.8"');
    s += halo(0, 7, 13, 12, c, .55);
    s += batWing(4, 5, 11.4, 1, 'url(#gCr)', '#e8b33a', .5, .25) + batWing(-4, 5, 11.4, -1, 'url(#gCr)', '#e8b33a', .5, .25);
    s += gem(13.4, -6.4, 1.1) + gem(-13.4, -6.4, 1.1);
    s += C(0, -1, 1.8, 'url(#gG)', .4);
    s += P('M0,-1.4 L3,0.6 L6.6,0 L6.4,3.6 L8.6,6.6 L6.6,9.6 L6.8,13.2 L3.2,13.6 L0,16 L-3.2,13.6 L-6.8,13.2 L-6.6,9.6 L-8.6,6.6 L-6.4,3.6 L-6.6,0 L-3,0.6 Z', 'url(#gG)', .6);
    s += gem(0, 7.2, 5.4, { dk: '#1a0006' });
    s += L('M0,7.2 C1.6,7 2,5.4 0.8,4.6 C-1,3.6 -3.2,5.2 -3,7.4 C-2.8,10 0.2,11.2 2.4,10 C4.6,8.8 5,5.8 3.6,3.8', '#2a0208', .8, ' opacity=".75"');
    s += glow(`<circle cx="0" cy="7.2" r="1.4" fill="#fff0f2"/>`, 1.3);
    s += zap([[-8.6, 13], [-10.4, 15.2], [-8.8, 16], [-11, 18.4]], c, .5) + zap([[8.6, 13], [10.6, 14.6], [9.2, 16.2], [11.6, 18]], c, .5);
  }
  return `<defs>${d}</defs>${s}`;
}

// ───────── 戒指（生命）：铁戒 → 生命 → 守护 → 龙血 → 不朽 → 永恒龙戒 ─────────
const band = (fill, ro = [11.4, 7.6], ri = [7.8, 4.8], cy = 6.4, iy = 5) => `<path d="M${-ro[0]},${cy} A${ro[0]},${ro[1]} 0 1,0 ${ro[0]},${cy} A${ro[0]},${ro[1]} 0 1,0 ${-ro[0]},${cy} Z M${-ri[0]},${iy} A${ri[0]},${ri[1]} 0 1,0 ${ri[0]},${iy} A${ri[0]},${ri[1]} 0 1,0 ${-ri[0]},${iy} Z" fill="${fill}" fill-rule="evenodd" stroke="${OL}" stroke-width="1.5" paint-order="stroke"/>`
  + `<path d="M${-ri[0] + .3},${iy + .6} A${ri[0] - .3},${ri[1] - .3} 0 0,1 ${ri[0] - .3},${iy + .6}" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="1.2"/>`
  + `<path d="M${-ro[0] + 1.4},${cy + 2.6} A${ro[0] - 1},${ro[1] - 1} 0 0,0 ${-2},${cy + ro[1] - .7}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".6"/>`;

function generator(t) {
  const c = GEAR.tiers[t].color;
  let d = '', s = '';
  if (t === 0) { // 铁戒：粗铁环 + 平顶印面
    s += band('url(#gI)', [11.6, 7.8], [7.4, 4.6], 7, 5.6);
    s += P('M-6.4,-2.2 C-6.4,-0.2 -3.4,1 0,1 C3.4,1 6.4,-0.2 6.4,-2.2 L6.4,-3.8 L-6.4,-3.8 Z', '#545b68', .6);
    s += `<ellipse cx="0" cy="-3.8" rx="6.4" ry="3.6" fill="url(#gI)" stroke="${OL}" stroke-width="1.2" paint-order="stroke"/>`;
    s += `<ellipse cx="0" cy="-3.8" rx="4.6" ry="2.4" fill="none" stroke="#3a404c" stroke-width=".5"/>` + L('M0,-5.6 L0,-2 M-2.6,-3.8 L2.6,-3.8', '#2e333d', .8);
    s += `<ellipse cx="-2.2" cy="-5" rx="1.6" ry=".6" fill="#fff" opacity=".6"/>`;
  } else if (t === 1) { // 生命之戒：银戒、叶纹、四爪蓝宝石
    s += halo(0, -3, 7, 7, c, .4);
    s += band('url(#gS)', [11, 7.4], [8.2, 5.2], 6.6, 5.6);
    s += L('M-6,12.2 C-4.6,13 -3.4,13.2 -2,13.2 M2,13.2 C3.4,13.2 4.6,13 6,12.2', '#6a7488', .5) + `<path d="M-4,12.8 C-3.6,11.8 -2.8,11.6 -2.2,11.8 C-2.6,12.6 -3.2,13 -4,12.8 Z M4,12.8 C3.6,11.8 2.8,11.6 2.2,11.8 C2.6,12.6 3.2,13 4,12.8 Z" fill="#8a96aa"/>`;
    const leaf = 'M2.6,-1.6 C4.6,-4.6 8,-5.6 10.4,-4.4 C8.6,-1.8 5.6,-0.6 2.6,-1.6 Z';
    s += P(leaf, 'url(#gS)', .45) + P(mx(leaf), 'url(#gS)', .45) + L('M3.4,-1.8 C5.6,-3 7.8,-3.8 9.6,-4.2', '#6a7488', .35) + L(mx('M3.4,-1.8 C5.6,-3 7.8,-3.8 9.6,-4.2'), '#6a7488', .35);
    s += P('M-3,-0.6 L3,-0.6 L2,1.8 L-2,1.8 Z', 'url(#gS)', .45);
    s += gem(0, -4.4, 3.6);
    s += [[-2.8, -7.2], [2.8, -7.2], [-2.8, -1.6], [2.8, -1.6]].map(([x, y]) => C(x, y, .75, '#eef2f8', .3)).join('');
    s += spark(7.6, -9, 1.3, '#cfe6ff');
  } else if (t === 2) { // 守护之戒：乌银戒、紫色符文、盾形戒托紫晶
    s += halo(0, -4, 9, 9, c, .5);
    s += band('url(#gMi)', [11.2, 7.6], [8, 5], 6.6, 5.4);
    s += glow(rune(-5.4, 11.8, 1.1, 1, '#efdcff', .45) + rune(0, 13.1, 1.1, 3, '#efdcff', .45) + rune(5.4, 11.8, 1.1, 6, '#efdcff', .45), 1.3);
    const sh = 'M0,-13 L6.6,-10.4 L6.2,-3.4 C5.2,-0.2 2.8,1.6 0,2.8 C-2.8,1.6 -5.2,-0.2 -6.2,-3.4 L-6.6,-10.4 Z';
    s += P(sh, 'url(#gS)', .7) + `<path d="${sh}" fill="url(#sh)"/>`;
    s += P('M0,-10.8 L4.6,-9 L4.3,-3.8 C3.6,-1.6 2,-0.4 0,0.4 C-2,-0.4 -3.6,-1.6 -4.3,-3.8 L-4.6,-9 Z', 'url(#gm)', .4);
    s += `<path d="M0,-10.8 L0,0.4 M-4.6,-9 L0,-5.4 L4.6,-9 M-4.3,-3.8 L0,-5.4 L4.3,-3.8" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".35"/>`;
    s += `<path d="M0,-5.4 L4.6,-9 L4.3,-3.8 C3.6,-1.6 2,-0.4 0,0.4 Z" fill="${T_DARK[t]}" opacity=".4"/>`;
    s += `<ellipse cx="-2.2" cy="-8" rx="1.2" ry=".6" fill="#fff" opacity=".9" transform="rotate(-30 -2.2 -8)"/>` + spark(-2.4, -7.8, 1.4);
    s += rivet(-5.6, -10.2, .5) + rivet(5.6, -10.2, .5);
  } else if (t === 3) { // 龙血之戒：金龙盘绕、龙首衔着龙血宝石
    d += SCALE_PAT('sc', 'none', '#6a3a00', '#fff2b0', 2, 1.6);
    s += halo(0, -4, 10, 10, c, .6);
    s += band('url(#gG)', [11.4, 7.8], [7.6, 4.8], 6.6, 5.2);
    s += `<path d="M-11.4,6.6 A11.4,7.8 0 1,0 11.4,6.6 L7.6,5.2 A7.6,4.8 0 1,1 -7.6,5.2 Z" fill="url(#sc)" opacity=".85"/>`;
    s += P('M-6.6,-3.6 L-9.6,-13.6 L-5.4,-9 L-3,-11.2 L0,-8.6 L3,-11.2 L5.4,-9 L9.6,-13.6 L6.6,-3.6 Z', 'url(#gG)', .55);
    s += `<circle cx="-3.4" cy="-8.4" r=".7" fill="${c}"/><circle cx="3.4" cy="-8.4" r=".7" fill="${c}"/>`;
    const claw = 'M-4.6,-6.4 C-7.4,-4.6 -7.6,-0.6 -5,1.6 L-3.6,0.4 C-5,-1.4 -4.8,-3.6 -3.4,-5 Z';
    s += gem(0, -3, 4.2, { sy: 1.1, halo: c });
    s += P(claw, 'url(#gG)', .45) + P(mx(claw), 'url(#gG)', .45);
    s += P('M-1.6,1.6 L0,3.6 L1.6,1.6 Z', 'url(#gG)', .35);
  } else if (t === 4) { // 不朽之戒：白金戒、金丝、金羽翼、高爪大金钻
    s += halo(0, -5, 13, 11, c, .65);
    s += featherWing(5.2, -3.4, 10.4, 1, 'url(#gG)', '#8a5a00', 3, -50, -4) + featherWing(-5.2, -3.4, 10.4, -1, 'url(#gG)', '#8a5a00', 3, -50, -4);
    s += band('url(#gW)', [11, 7.4], [8, 5], 6.6, 5.6);
    s += L('M-8.4,11 C-5,13.4 5,13.4 8.4,11', '#d9a826', .6) + L('M-5.6,12.6 C-4.6,11.6 -3.4,11.8 -3,12.8 M5.6,12.6 C4.6,11.6 3.4,11.8 3,12.8', '#d9a826', .45);
    s += gem(-8.2, 1.6, 1.4) + gem(8.2, 1.6, 1.4);
    s += P('M-4.6,-1.2 L4.6,-1.2 L3,2.4 L-3,2.4 Z', 'url(#gG)', .5);
    s += gem(0, -5.6, 5);
    s += [[-4.2, -9.2], [4.2, -9.2], [-5.4, -3.6], [5.4, -3.6], [0, -11]].map(([x, y]) => C(x, y, .7, 'url(#gd)', .3)).join('');
    s += spark(-7.4, -12.4, 1.6) + spark(8.4, -12, 1.1);
  } else { // 永恒龙戒：黑金龙戒、龙翼、金爪擒住血红巨钻、雷光
    s += halo(0, -4, 13, 12, c, .55);
    s += batWing(3.6, -2.6, 12.4, 1, 'url(#gCr)', '#e8b33a', .5, .2) + batWing(-3.6, -2.6, 12.4, -1, 'url(#gCr)', '#e8b33a', .5, .2);
    s += band('url(#gG)', [11.4, 7.6], [7.8, 4.8], 6.8, 5.4);
    s += L('M-10.2,9 C-6,13.2 6,13.2 10.2,9', '#3a0a14', 1.4) + L('M-10.6,9.4 C-6,13.6 6,13.6 10.6,9.4', '#fff2c0', .35) + L('M-10.4,4.6 C-9.6,3 -8.6,2.2 -7.4,1.8 M10.4,4.6 C9.6,3 8.6,2.2 7.4,1.8', '#e8b33a', .6);
    s += glow(L('M-6.6,12.4 L-5,11.4 L-4.2,12.8 M4.2,12.8 L5,11.4 L6.6,12.4', c, .55), 1.2);
    s += gem(-3, 13.2, .9) + gem(0, 13.7, 1) + gem(3, 13.2, .9);
    s += gem(0, -5, 5.4, { halo: c, sy: 1.08 });
    const claw = 'M-3.4,1.2 C-6.8,-0.6 -7.6,-5.4 -5.4,-9.6 L-4.2,-8.2 C-5.4,-5.4 -5,-2.8 -2.6,-0.6 Z';
    s += P(claw, 'url(#gG)', .45) + P(mx(claw), 'url(#gG)', .45) + P('M-1.6,-11.4 L0,-14.4 L1.6,-11.4 L0,-10.4 Z', 'url(#gG)', .4);
    s += zap([[-9, -12], [-7.4, -10], [-9.4, -8.6], [-7.6, -6.4]], c, .45) + zap([[9.4, -10.4], [7.8, -8.6], [9.8, -7], [8, -5]], c, .45);
  }
  return `<defs>${d}</defs>${s}`;
}

const DRAW = { weapon, armor, engine, scope, core, generator };

export function gearIconSvg(slot, tier, px) {
  const t = Math.max(0, Math.min(GEAR.tiers.length - 1, tier | 0));
  const draw = DRAW[slot] || weapon;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-30 -30 60 60">${defs(t)}${frame(t)}<g>${draw(t)}</g></svg>`;
}

// ───────── 浮游法器：武器紫色以上，悬浮在英雄两侧，尖端朝上，品质色发光 ─────────
// 白＝光晶、蓝＝冰晶、紫＝符文飞剑、橙＝焰纹飞剑、金＝圣辉羽剑、红＝屠龙血剑
export function gunPodSvg(tier, px) {
  const t = Math.max(0, Math.min(GEAR.tiers.length - 1, tier | 0)), c = GEAR.tiers[t].color, l = T_LIGHT[t], dk = T_DARK[t];
  let s = '';
  // 脚下的悬浮法阵
  const circle = `<g filter="url(#bl1)"><ellipse cx="0" cy="11.4" rx="6.6" ry="1.9" fill="none" stroke="${c}" stroke-width="1.3"/></g><ellipse cx="0" cy="11.4" rx="6.6" ry="1.9" fill="none" stroke="${l}" stroke-width=".5"/>`
    + `<ellipse cx="0" cy="11.4" rx="4.2" ry="1.1" fill="none" stroke="${c}" stroke-width=".45" stroke-dasharray="1 .8"/>`;
  s += `<ellipse cx="0" cy="-2" rx="${4.6 + t * .4}" ry="11" fill="${c}" opacity="${.35 + t * .07}" filter="url(#bl2)"/>` + circle;
  if (t <= 1) { // 水晶
    const faces = (x0, y0, k, rot = 0) => {
      const p = (x, y) => `${r2(x0 + x * k)},${r2(y0 + y * k)}`;
      return `<g transform="rotate(${rot} ${x0} ${y0})"><path d="M${p(0, -14)} L${p(3.2, -8.6)} L${p(3.2, 4.4)} L${p(0, 8.2)} L${p(-3.2, 4.4)} L${p(-3.2, -8.6)} Z" fill="${dk}" stroke="${OL}" stroke-width="1.3" paint-order="stroke" stroke-linejoin="round"/>`
        + `<path d="M${p(0, -14)} L${p(-3.2, -8.6)} L${p(-3.2, 4.4)} L${p(-1, 6)} L${p(-1, -8.6)} Z" fill="${l}"/>`
        + `<path d="M${p(0, -14)} L${p(-1, -8.6)} L${p(-1, 6)} L${p(0, 8.2)} L${p(1.2, 6)} L${p(1.2, -8.6)} Z" fill="${c}"/>`
        + `<path d="M${p(-2.4, -7)} L${p(-2.4, 2)}" stroke="#fff" stroke-width="${r2(.6 * k)}" stroke-linecap="round"/></g>`;
    };
    if (t === 1) s += faces(-3.6, 4, .55, -24) + faces(3.6, 4.6, .5, 22);
    s += faces(0, -1.4, 1);
    s += `<circle cx="0" cy="-15" r="${t ? 2.2 : 1.8}" fill="#fff" opacity=".9" filter="url(#bl1)"/>`;
  } else {
    const Lf = ['', '', '#e4dcf4', '#fff4e0', '#ffffff', '#c04454'][t], Df = ['', '', '#5a4e78', '#b06a3a', '#d8bf80', '#3a0a14'][t];
    const w = t >= 4 ? 2.9 : 2.5;
    if (t === 3) s += `<path d="M0,-17 C3.4,-13 1.2,-10 3.4,-7 C4.6,-4.6 2.4,-2 3.6,0.4 L0,3 L-3.6,0.4 C-2.4,-2 -4.6,-4.6 -3.4,-7 C-1.2,-10 -3.4,-13 0,-17 Z" fill="${c}" opacity=".8" filter="url(#bl1)"/>`;
    s += `<path d="M0,-17.2 L${w},-12 L${w},3.2 L${-w},3.2 L${-w},-12 Z" fill="none" stroke="${OL}" stroke-width="1.5" stroke-linejoin="round"/>`;
    s += `<path d="M0,-17.2 L${-w},-12 L${-w},3.2 L0,3.2 Z" fill="${Lf}"/><path d="M0,-17.2 L${w},-12 L${w},3.2 L0,3.2 Z" fill="${Df}"/>`;
    s += `<g filter="url(#bl1)"><path d="M0,-13 L0,1.6" stroke="${c}" stroke-width="1.8"/></g><path d="M0,-13 L0,1.6" stroke="${t === 5 ? '#ffd0d4' : '#fff'}" stroke-width=".6"/>`;
    if (t === 5) s += `<g filter="url(#bl1)"><path d="M${-w},-12 L0,-17.2 L${w},-12 L${w},3 M${-w},-12 L${-w},3" fill="none" stroke="${c}" stroke-width=".9"/></g>`;
    const guard = t >= 4
      ? 'M-1,3 C-3.6,3 -6,1.4 -7.6,-1.8 C-7.2,1.2 -6.6,2.8 -5.4,3.4 C-6.8,3.4 -7.6,3.2 -8.2,2.8 C-7.2,5.2 -4.4,6 -1,6 L1,6 C4.4,6 7.2,5.2 8.2,2.8 C7.6,3.2 6.8,3.4 5.4,3.4 C6.6,2.8 7.2,1.2 7.6,-1.8 C6,1.4 3.6,3 1,3 Z'
      : 'M-5.6,2.8 L5.6,2.8 L6.4,4.4 L5.6,5.8 L-5.6,5.8 L-6.4,4.4 Z';
    s += `<path d="${guard}" fill="${t >= 4 ? 'url(#gd)' : t === 3 ? '#c27f3c' : '#6a6088'}" stroke="${OL}" stroke-width="1.2" paint-order="stroke" stroke-linejoin="round"/>`;
    s += `<rect x="-1.3" y="5.8" width="2.6" height="3.4" fill="${t === 5 ? '#2a0a12' : '#3a2a1a'}" stroke="${OL}" stroke-width="1" paint-order="stroke"/>`;
    s += `<circle cx="0" cy="4.4" r="1.6" fill="url(#gl)"/><circle cx="0" cy="4.4" r=".7" fill="#fff"/>`;
    s += `<circle cx="0" cy="9.6" r="1.4" fill="${c}" stroke="${OL}" stroke-width=".9" paint-order="stroke"/><circle cx="-.4" cy="9.2" r=".45" fill="#fff"/>`;
    if (t === 5) s += `<g filter="url(#bl1)"><path d="M-4.6,-15 L-3.4,-12 L-5.2,-10.4 L-3.8,-7.4" fill="none" stroke="${c}" stroke-width="1"/><path d="M4.4,-9 L3.4,-6.4 L5,-5 L3.8,-2.4" fill="none" stroke="${c}" stroke-width="1"/></g><path d="M-4.6,-15 L-3.4,-12 L-5.2,-10.4 L-3.8,-7.4 M4.4,-9 L3.4,-6.4 L5,-5 L3.8,-2.4" fill="none" stroke="#fff" stroke-width=".4"/>`;
    if (t === 4) s += `<path d="M-4.4,-14 L-4,-13 L-3,-12.6 L-4,-12.2 L-4.4,-11.2 L-4.8,-12.2 L-5.8,-12.6 L-4.8,-13 Z" fill="#fff"/>`;
  }
  s += `<circle cx="0" cy="-15.6" r="${1 + t * .2}" fill="#fff" opacity=".85" filter="url(#bl1)"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${r2(px * 1.6)}" viewBox="-10 -18 20 32">${defs(t)}${s}</svg>`;
}

// ───────── 我方弹道（按武器品质，朝上＝飞行方向）：光矢 / 冰晶箭 / 奥术飞弹 / 火球 / 圣光星矢 / 雷霆长枪 ─────────
export function boltSvg(tier, px) {
  const t = Math.max(0, Math.min(GEAR.tiers.length - 1, tier | 0)), c = GEAR.tiers[t].color;
  const fade = (id, a, b) => LG(id, [[0, a], [1, b, 0]], 0, 0, 0, 1);
  let d = '', body = '';
  if (t === 0) { // 光矢：白色光之箭头 + 光尾
    d += fade('tr', '#ffffff', '#bfe8ff');
    body = `<ellipse cy="-2" rx="3" ry="12" fill="#bfe8ff" opacity=".55" filter="url(#bl)"/>`
      + `<path d="M0,-9 L1.1,-8 L.5,13 L-.5,13 L-1.1,-8 Z" fill="url(#tr)"/>`
      + `<path d="M0,-15 L3,-8.6 L0,-10.4 L-3,-8.6 Z" fill="#fff" stroke="#bfe8ff" stroke-width=".5" stroke-linejoin="round"/>`
      + `<path d="M-1.6,-6 L0,-7.6 L1.6,-6" fill="none" stroke="#fff" stroke-width=".7" opacity=".8"/>`;
  } else if (t === 1) { // 冰晶箭：冰晶箭头 + 霜尾 + 碎冰
    d += fade('tr', '#cfe6ff', c);
    body = `<ellipse cy="-3" rx="4" ry="12.5" fill="${c}" opacity=".6" filter="url(#bl)"/>`
      + `<path d="M0,-7 L1.6,-4 L.6,14 L-.6,14 L-1.6,-4 Z" fill="url(#tr)"/>`
      + `<path d="M0,-15.4 L3.4,-8.6 L0,-3.2 L-3.4,-8.6 Z" fill="${c}" stroke="#eaf6ff" stroke-width=".5" stroke-linejoin="round"/>`
      + `<path d="M0,-15.4 L-3.4,-8.6 L0,-3.2 Z" fill="#eaf6ff"/><path d="M0,-15.4 L0,-3.2" stroke="#fff" stroke-width=".5"/>`
      + `<path d="M-3,1 L-2.2,2.6 L-3,4.2 L-3.8,2.6 Z M2.8,5 L3.4,6.2 L2.8,7.4 L2.2,6.2 Z M-1.8,9 L-1.3,10 L-1.8,11 L-2.3,10 Z" fill="#eaf6ff" opacity=".9"/>`;
  } else if (t === 2) { // 奥术飞弹：紫色光球 + 螺旋双尾
    d += fade('tr', c, c) + RG('orb', [[0, '#ffffff'], [.35, '#ead6ff'], [.7, c], [1, c, 0]]);
    body = `<path d="M0,-6 C4,-2 -4,3 0,7 C3,10 -2,12 0,15" fill="none" stroke="url(#tr)" stroke-width="2.2" stroke-linecap="round" opacity=".9"/>`
      + `<path d="M0,-6 C-4,-2 4,3 0,7 C-3,10 2,12 0,15" fill="none" stroke="url(#tr)" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`
      + `<circle cy="-8" r="7" fill="${c}" opacity=".7" filter="url(#bl)"/>`
      + `<circle cy="-8" r="5" fill="url(#orb)"/><circle cy="-8" r="2" fill="#fff"/>`
      + `<path d="M-3.6,1 L-3.2,1.8 L-2.4,2.2 L-3.2,2.6 L-3.6,3.4 L-4,2.6 L-4.8,2.2 L-4,1.8 Z M3.4,5 L3.7,5.6 L4.3,5.9 L3.7,6.2 L3.4,6.8 L3.1,6.2 L2.5,5.9 L3.1,5.6 Z" fill="#ead6ff"/>`;
  } else if (t === 3) { // 火球：炽热火球 + 向后飘散的火尾
    d += LG('fl', [[0, '#fff2c0'], [.25, '#ffb040'], [.6, c], [1, '#a01a00', 0]], 0, 0, 0, 1) + RG('fb', [[0, '#ffffff'], [.3, '#fff2b0'], [.65, '#ffb040'], [1, c]]);
    body = `<ellipse cy="-2" rx="6" ry="13" fill="${c}" opacity=".55" filter="url(#bl)"/>`
      + `<path d="M-5.4,-7 C-6,-1 -3.6,4 -1.6,9 C-1.4,6 -.6,5 0,4 C.4,8 1,11 0,15.6 C2.4,11 3,6 2.6,3 C3.6,4.6 4.4,6.6 4.2,9 C6,4 6,-1 5.4,-7 Z" fill="url(#fl)"/>`
      + `<circle cy="-7.4" r="5.6" fill="url(#fb)"/>`
      + `<path d="M-2.4,-8 C-2,-11 0,-12.4 2.2,-12" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".9"/>`;
  } else if (t === 4) { // 圣光星矢：金色四芒星 + 金光长尾
    d += fade('tr', '#fff4c4', c);
    body = `<ellipse cy="0" rx="3.4" ry="14" fill="${c}" opacity=".55" filter="url(#bl)"/>`
      + `<path d="M0,-6 L1.8,-3 L.7,15 L-.7,15 L-1.8,-3 Z" fill="url(#tr)"/>`
      + `<circle cy="-8.4" r="4.4" fill="${c}" opacity=".8" filter="url(#bl)"/>`
      + `<path d="M0,-15.6 L1.5,-9.9 L6.4,-8.4 L1.5,-6.9 L0,-1.4 L-1.5,-6.9 L-6.4,-8.4 L-1.5,-9.9 Z" fill="url(#gd)" stroke="#fff" stroke-width=".5" stroke-linejoin="round"/>`
      + `<circle cy="-8.4" r="1.7" fill="#fff"/>`
      + spark(-3.6, 3, 1.2, '#fff4c4') + spark(3.4, 8, 1, '#fff4c4');
  } else { // 雷霆长枪：枪尖 + 锯齿雷光枪身 + 电弧
    body = `<path d="M0,-15.6 L3.4,-8 L1,-6.6 L3.4,0 L.8,.6 L2.6,8 L0,15.6 L-1.4,7 L-3.6,5.6 L-1.4,-.6 L-3.6,-1.6 L-1,-6.6 L-3.4,-8 Z" fill="${c}" filter="url(#bl2)" opacity=".95"/>`
      + `<path d="M0,-15.6 L2.8,-8.6 L.9,-7.2 L-.9,-7.2 L-2.8,-8.6 Z" fill="#ffd0d4" stroke="#fff" stroke-width=".5" stroke-linejoin="round"/>`
      + `<path d="M0,-14.6 L1.2,-8.8 L0,-7.6 Z" fill="#fff"/>`
      + `<path d="M0,-7.2 L1.8,-2.8 L-.8,0 L1.6,4 L-.6,8 L.8,11.6 L0,15" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round"/>`
      + `<path d="M0,-7.2 L1.8,-2.8 L-.8,0 L1.6,4 L-.6,8 L.8,11.6 L0,15" fill="none" stroke="#fff" stroke-width=".9" stroke-linejoin="round"/>`
      + `<path d="M1.8,-2.8 L4.4,-1.6 L5,1 M-.6,8 L-3.6,9.6 L-4.2,12.4" fill="none" stroke="#ffd0d4" stroke-width=".6" stroke-linejoin="round"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px * 2}" viewBox="-8 -16 16 32">${defs(t)}<defs>${d}</defs>${body}</svg>`;
}
