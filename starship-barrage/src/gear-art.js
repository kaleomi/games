// 星舰弹幕战 · 装备图标（SVG）
// 6个部位 × 6个品质，每件长得都不一样：品质越高，零件越多、发光越强、边框越华丽。
// 品质：白 → 蓝 → 紫 → 橙 → 金 → 红
import { GEAR } from './config.js';

const T_DARK = ['#5a6070', '#123a72', '#3e1a6e', '#6e2c06', '#6e5000', '#6e0812'];
const T_LIGHT = ['#ffffff', '#cfe6ff', '#ead6ff', '#ffe0c4', '#fff4c4', '#ffd0d4'];

function defs(t) {
  const c = GEAR.tiers[t].color, d = T_DARK[t], l = T_LIGHT[t];
  return `<defs>
    <radialGradient id="bg" cx="-4" cy="-8" r="34" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c}" stop-opacity="${0.22 + t * 0.05}"/><stop offset=".55" stop-color="#121829"/><stop offset="1" stop-color="#05070e"/></radialGradient>
    <linearGradient id="tc" x1="0" y1="-16" x2="0" y2="16" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${l}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${d}"/></linearGradient>
    <linearGradient id="tcx" x1="-14" y1="0" x2="14" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${d}"/><stop offset=".45" stop-color="${l}"/><stop offset="1" stop-color="${d}"/></linearGradient>
    <linearGradient id="m" x1="-1" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4c5468"/><stop offset=".4" stop-color="#f0f4fb"/><stop offset=".65" stop-color="#a3acbf"/><stop offset="1" stop-color="#3a4152"/></linearGradient>
    <linearGradient id="dk" x1="0" y1="-1" x2="0" y2="1"><stop offset="0" stop-color="#4a546c"/><stop offset="1" stop-color="#161b28"/></linearGradient>
    <linearGradient id="gd" x1="0" y1="-1" x2="0" y2="1"><stop offset="0" stop-color="#fff4c2"/><stop offset=".5" stop-color="#ffcc4d"/><stop offset="1" stop-color="#8a5a00"/></linearGradient>
    <radialGradient id="gl"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>
    <filter id="bl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.4"/></filter>
    <filter id="bl2" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6"/></filter>
  </defs>`;
}

// 边框：品质越高越华丽
function frame(t) {
  const c = GEAR.tiers[t].color;
  let s = '';
  if (t >= 4) s += `<rect x="-22" y="-22" width="44" height="44" rx="10" fill="none" stroke="${c}" stroke-width="5" opacity=".55" filter="url(#bl2)"/>`;
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

const glow = (inner, w = 1) => `<g filter="url(#bl)" opacity="${0.75 * w}">${inner}</g>${inner}`;
const ring = (cx, cy, rx, ry, col, w = 1.4) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${col}" stroke-width="${w}"/>`;

// ───────── 主炮（攻击）：炮管数量、线圈、尾翼、金饰随品质增加 ─────────
function weapon(t) {
  const c = GEAR.tiers[t].color;
  const n = [1, 1, 2, 2, 3, 3][t], len = [20, 22, 22, 24, 24, 26][t];
  const xs = n === 1 ? [0] : n === 2 ? [-4.2, 4.2] : [-6.4, 0, 6.4];
  let s = '';
  // 底座
  const base = t >= 3 ? 'M-12,4 L12,4 L14,10 L9,15 L-9,15 L-14,10 Z' : 'M-9,5 L9,5 L10,13 L-10,13 Z';
  if (t >= 3) s += `<path d="M-14,8 L-19,3 L-19,12 L-13,14 Z M14,8 L19,3 L19,12 L13,14 Z" fill="url(#tc)" stroke="#05070e" stroke-width=".6"/>`;
  s += `<path d="${base}" fill="url(#dk)" stroke="#05070e" stroke-width=".8"/><path d="M-8,8 L8,8" stroke="${c}" stroke-width="1.6"/>`;
  for (const x of xs) {
    s += `<rect x="${x - 2.4}" y="${5 - len}" width="4.8" height="${len}" rx="1.4" fill="url(#m)" stroke="#05070e" stroke-width=".7"/>`;
    if (t >= 1) for (let k = 0; k < (t >= 4 ? 3 : 2); k++) s += ring(x, -2 - k * 5.5, 3.6, 1.1, c, 1.2);
    s += glow(`<circle cx="${x}" cy="${5 - len}" r="${2.6 + t * 0.35}" fill="url(#gl)"/>`);
  }
  if (t >= 4) s += `<path d="M-11,4 L11,4" stroke="url(#gd)" stroke-width="1.8"/><circle cx="0" cy="10" r="2.4" fill="url(#gd)" stroke="#5a3a00" stroke-width=".5"/>`;
  if (t === 5) s += glow(`<path d="M-1,-24 L2,-19 L-1.5,-17 L1.5,-12" fill="none" stroke="#fff" stroke-width="1.1"/><path d="M-7.5,-22 L-5,-18 L-8,-16" fill="none" stroke="#ffd0d4" stroke-width=".9"/><path d="M7.5,-22 L5,-18 L8,-16" fill="none" stroke="#ffd0d4" stroke-width=".9"/>`, 1.4);
  return s;
}

// ───────── 装甲（防御）：盾形装甲板，铆钉 → 条纹 → 水晶 → 火焰纹 → 金翼 → 龙鳞 ─────────
function armor(t) {
  const c = GEAR.tiers[t].color;
  const shield = 'M0,-15 L13,-10 L12,3 C10,10 5,14 0,16 C-5,14 -10,10 -12,3 L-13,-10 Z';
  const inner = 'M0,-11 L9,-7.4 L8.4,2.4 C7,7.4 3.6,10.4 0,12 C-3.6,10.4 -7,7.4 -8.4,2.4 L-9,-7.4 Z';
  let s = `<path d="${shield}" fill="url(#m)" stroke="#05070e" stroke-width="1"/>`;
  if (t === 0) s += `<path d="${inner}" fill="url(#dk)" opacity=".35"/>` + [[-8, -7], [8, -7], [-7, 3], [7, 3], [0, 10]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1" fill="#e9eef8" stroke="#3a4152" stroke-width=".4"/>`).join('');
  else s += `<path d="${inner}" fill="url(#tc)" stroke="#05070e" stroke-width=".6"/>`;
  if (t === 1) s += `<path d="M-8,-3 L8,-3 M-7.5,2 L7.5,2" stroke="#fff" stroke-width="1.4" opacity=".85"/>`;
  if (t === 2) s += glow(`<path d="M0,-8 L4.5,-1 L0,8 L-4.5,-1 Z" fill="#fff" opacity=".9"/><path d="M0,-8 L0,8 M-4.5,-1 L4.5,-1" stroke="${c}" stroke-width=".8"/>`);
  if (t === 3) s += glow(`<path d="M0,9 C-6,5 -5,-1 -2,-4 C-2,-1 0,0 0,0 C0,-4 2,-7 4,-9 C3,-4 7,-1 5,4 C4,7 2,8 0,9 Z" fill="#fff4dc"/>`);
  if (t === 4) s += `<path d="M-13,-8 C-19,-10 -22,-4 -21,1 C-18,-2 -15,-2 -12.5,-1 Z M13,-8 C19,-10 22,-4 21,1 C18,-2 15,-2 12.5,-1 Z" fill="url(#gd)" stroke="#5a3a00" stroke-width=".5"/>` + glow(`<path d="M0,-6 L2,-1.5 L6.5,-1 L3,2 L4,7 L0,4.5 L-4,7 L-3,2 L-6.5,-1 L-2,-1.5 Z" fill="#fff"/>`);
  if (t === 5) {
    for (let r = 0; r < 4; r++) for (let k = -2; k <= 2; k++) {
      const x = k * 4 + (r % 2) * 2 - 1, y = -7 + r * 4.4;
      if (Math.abs(x) > 8 - r * 0.8) continue;
      s += `<path d="M${x - 2},${y} C${x - 2},${y + 3} ${x + 2},${y + 3} ${x + 2},${y} C${x + 1},${y + 1.4} ${x - 1},${y + 1.4} ${x - 2},${y} Z" fill="#ffd0d4" opacity=".75"/>`;
    }
    s += glow(`<circle cx="0" cy="-10" r="1.8" fill="#fff"/>`);
  }
  return s;
}

// ───────── 引擎（攻速）：喷口数量、尾焰长度、跃迁环随品质增加 ─────────
function engine(t) {
  const c = GEAR.tiers[t].color;
  const xs = t >= 5 ? [-7.5, 0, 7.5] : t >= 2 ? [-5, 5] : [0];
  const fl = 6 + t * 1.6;
  let s = '';
  if (t >= 4) s += glow(ring(0, 2, 15, 5, c, 1.6));
  s += `<path d="M-${xs.length > 1 ? 13 : 8},-14 L${xs.length > 1 ? 13 : 8},-14 L${xs.length > 1 ? 12 : 7},-4 L-${xs.length > 1 ? 12 : 7},-4 Z" fill="url(#dk)" stroke="#05070e" stroke-width=".8"/>`;
  s += `<path d="M-${xs.length > 1 ? 10 : 6},-10 H${xs.length > 1 ? 10 : 6}" stroke="${c}" stroke-width="1.8"/>`;
  for (const x of xs) {
    const w = xs.length > 2 ? 3.2 : 4.4;
    s += `<path d="M${x - w * .7},-4 L${x + w * .7},-4 L${x + w},3 L${x - w},3 Z" fill="url(#m)" stroke="#05070e" stroke-width=".7"/>`;
    s += glow(`<path d="M${x - w * .9},3 Q${x},${3 + fl * 2} ${x + w * .9},3 Z" fill="${c}"/><path d="M${x - w * .45},3 Q${x},${3 + fl * 1.2} ${x + w * .45},3 Z" fill="#fff"/>`);
  }
  if (t >= 1) s += `<path d="M-7,-14 L-5,-18 L5,-18 L7,-14" fill="url(#m)" stroke="#05070e" stroke-width=".6"/>`;
  if (t >= 3) s += `<path d="M-14,-12 L-19,-6 L-14,-5 Z M14,-12 L19,-6 L14,-5 Z" fill="url(#tc)" stroke="#05070e" stroke-width=".5"/>`;
  if (t >= 4) s += `<path d="M-13,-14 L13,-14" stroke="url(#gd)" stroke-width="1.6"/>`;
  return s;
}

// ───────── 瞄准器（暴击率）：镜片 → 导轨 → 紫晶镜 → 双环 → 金色天眼 → 红色破虚之眼 ─────────
function scope(t) {
  const c = GEAR.tiers[t].color;
  let s = '';
  if (t >= 5) s += glow(Array.from({ length: 12 }, (_, i) => `<path transform="rotate(${i * 30})" d="M0,-19 L1.2,-14 L-1.2,-14 Z" fill="#ffd0d4"/>`).join(''));
  if (t >= 1) s += `<rect x="-17" y="-2" width="34" height="4" rx="1.5" fill="url(#dk)" stroke="#05070e" stroke-width=".6"/>`;
  if (t >= 4) {
    // 眼形外框
    s += `<path d="M-16,0 C-9,-11 9,-11 16,0 C9,11 -9,11 -16,0 Z" fill="url(#gd)" stroke="#5a3a00" stroke-width=".7"/>`;
  }
  const R = t >= 3 ? 10 : 9;
  s += `<circle r="${R + 2}" fill="url(#m)" stroke="#05070e" stroke-width=".8"/>`;
  s += `<circle r="${R}" fill="${t === 0 ? '#1a3a5c' : 'url(#tc)'}" stroke="#05070e" stroke-width=".6"/>`;
  s += `<circle cx="-3" cy="-3.6" r="${R * .35}" fill="#fff" opacity=".45"/>`;
  if (t >= 3) s += ring(0, 0, R - 3, R - 3, '#fff', .8);
  const ret = `<path d="M0,${-R + 1.5} V-2.4 M0,2.4 V${R - 1.5} M${-R + 1.5},0 H-2.4 M2.4,0 H${R - 1.5}" stroke="${t >= 4 ? '#fff' : c === '#e8edf5' ? '#ff5a5a' : '#fff'}" stroke-width="1.2"/>`;
  s += t >= 2 ? glow(ret) : ret;
  s += glow(`<circle r="${1.4 + t * 0.25}" fill="${t === 0 ? '#ff5a5a' : '#fff'}"/>`);
  if (t === 5) s += `<path d="M-6,-1 C-3,-5 3,-5 6,-1" fill="none" stroke="#fff" stroke-width=".8"/>`;
  return s;
}

// ───────── 核心（暴击伤害）：六边形晶胞 → 笼中光球 → 星晶 → 环绕光球 → 金色太阳 → 混沌漩涡 ─────────
function core(t) {
  const c = GEAR.tiers[t].color;
  const hex = r => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 3 * i - Math.PI / 2; return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`; }).join(' ');
  let s = '';
  if (t === 0) s += `<polygon points="${hex(13)}" fill="url(#m)" stroke="#05070e" stroke-width=".9"/><polygon points="${hex(8)}" fill="url(#dk)"/>` + glow(`<circle r="3.6" fill="url(#gl)"/>`);
  if (t === 1) s += `<polygon points="${hex(14)}" fill="none" stroke="url(#m)" stroke-width="2.4"/>${[0, 60, 120].map(a => `<path transform="rotate(${a})" d="M0,-12 V12" stroke="#a3acbf" stroke-width="1"/>`).join('')}` + glow(`<circle r="7" fill="url(#gl)"/>`) + `<circle r="7" fill="url(#tc)" opacity=".7"/><circle cx="-2" cy="-2.4" r="2" fill="#fff" opacity=".7"/>`;
  if (t === 2) s += glow(`<path d="M0,-15 L3.4,-4 L14,-4.6 L5.4,2.4 L9,13 L0,6.6 L-9,13 L-5.4,2.4 L-14,-4.6 L-3.4,-4 Z" fill="url(#tc)" stroke="#fff" stroke-width=".8"/>`, .8) + `<path d="M0,-15 L0,6.6 M-14,-4.6 L5.4,2.4 M14,-4.6 L-5.4,2.4" stroke="#fff" stroke-opacity=".5" stroke-width=".6"/>`;
  if (t === 3) s += ring(0, 0, 15, 6, c, 1.4) + `<g transform="rotate(60)">${ring(0, 0, 15, 6, c, 1.4)}</g><g transform="rotate(-60)">${ring(0, 0, 15, 6, c, 1.4)}</g>` + glow(`<circle r="7.5" fill="url(#tc)"/>`) + `<circle cx="-2.4" cy="-2.6" r="2.2" fill="#fff" opacity=".75"/>` + [[15, 0], [-7.5, 13], [-7.5, -13]].map(([x, y]) => `<circle cx="${x * .9}" cy="${y * .45}" r="1.6" fill="#fff"/>`).join('');
  if (t === 4) s += glow(Array.from({ length: 12 }, (_, i) => `<path transform="rotate(${i * 30})" d="M0,-17 L2.4,-9 L-2.4,-9 Z" fill="url(#gd)"/>`).join('')) + `<circle r="9" fill="url(#gd)" stroke="#5a3a00" stroke-width=".6"/>` + glow(`<circle r="5" fill="#fff"/>`);
  if (t === 5) s += glow([0, 120, 240].map(a => `<path transform="rotate(${a})" d="M0,0 C6,-2 11,-8 9,-15 C14,-9 12,-1 5,3 Z" fill="url(#tc)"/>`).join(''), 1.2) + `<circle r="6.4" fill="#1a0206" stroke="${c}" stroke-width="1.4"/>` + glow(`<circle r="3" fill="#fff"/>`) + `<circle r="16" fill="none" stroke="#ffd0d4" stroke-width=".7" stroke-dasharray="2 3"/>`;
  return s;
}

// ───────── 护盾发生器（生命）：圆顶发射器 → 蜂巢圆顶 → 双层圆顶 → 环形发射器 → 金翼神盾 → 红色圣域 ─────────
function generator(t) {
  const c = GEAR.tiers[t].color;
  let s = '';
  const base = `<path d="M-13,8 L13,8 L11,14 L-11,14 Z" fill="url(#dk)" stroke="#05070e" stroke-width=".8"/><path d="M-9,11 H9" stroke="${c}" stroke-width="1.4"/>`;
  if (t <= 2) {
    s += `<path d="M-13,8 A13,13 0 0 1 13,8 Z" fill="url(#tc)" opacity="${t === 0 ? .5 : .75}" stroke="#fff" stroke-opacity=".7" stroke-width=".8"/>`;
    if (t >= 1) {
      const hx = (x, y) => `<path d="M${x},${y - 2.6} L${x + 2.25},${y - 1.3} L${x + 2.25},${y + 1.3} L${x},${y + 2.6} L${x - 2.25},${y + 1.3} L${x - 2.25},${y - 1.3} Z" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".6"/>`;
      s += [[-4.5, 4.4], [0, 4.4], [4.5, 4.4], [-2.25, 0.5], [2.25, 0.5], [0, -3.4], [-6.75, 0.5], [6.75, 0.5]].map(([x, y]) => hx(x, y)).join('');
    }
    if (t === 2) s += `<path d="M-17,8 A17,17 0 0 1 17,8" fill="none" stroke="${c}" stroke-width="1.6" stroke-dasharray="4 2"/>`;
    s += base + glow(`<circle cy="5" r="2.4" fill="url(#gl)"/>`);
  } else if (t === 3) {
    s += glow(`${ring(0, -1, 14, 14, c, 2)}${ring(0, -1, 9.5, 9.5, '#fff', 1)}`) + base + `<rect x="-3" y="-1" width="6" height="9" fill="url(#m)" stroke="#05070e" stroke-width=".6"/>` + glow(`<circle cy="-1" r="3.2" fill="url(#gl)"/>`);
  } else if (t === 4) {
    s += `<path d="M-6,-6 C-14,-14 -22,-10 -21,-2 C-17,-6 -12,-5 -9,-2 C-14,-2 -17,2 -17,6 C-13,2 -9,1 -6,2 Z" fill="url(#gd)" stroke="#5a3a00" stroke-width=".5"/><path d="M-6,-6 C-14,-14 -22,-10 -21,-2 C-17,-6 -12,-5 -9,-2 C-14,-2 -17,2 -17,6 C-13,2 -9,1 -6,2 Z" transform="scale(-1,1)" fill="url(#gd)" stroke="#5a3a00" stroke-width=".5"/>`;
    s += `<path d="M0,-14 L8,-10 L7.4,1 C6,6 3,9 0,10.5 C-3,9 -6,6 -7.4,1 L-8,-10 Z" fill="url(#tc)" stroke="#5a3a00" stroke-width=".8"/>` + glow(`<path d="M-2,-8 h4 v4 h4 v4 h-4 v4 h-4 v-4 h-4 v-4 h4 Z" fill="#fff"/>`) + base;
  } else {
    s += glow(`${ring(0, -1, 17, 17, c, 1.4)}${ring(0, -1, 12.5, 12.5, '#ffd0d4', 1)}`, 1.3);
    s += Array.from({ length: 8 }, (_, i) => `<path transform="translate(0,-1) rotate(${i * 45})" d="M0,-17 L1.6,-13.5 L-1.6,-13.5 Z" fill="#fff"/>`).join('');
    s += `<path d="M0,-11 L7,-7.5 L6.4,1 C5.2,5 2.6,7.6 0,8.8 C-2.6,7.6 -5.2,5 -6.4,1 L-7,-7.5 Z" fill="url(#tc)" stroke="#fff" stroke-width=".8"/>` + glow(`<circle cy="-2" r="2.6" fill="#fff"/>`) + base;
  }
  return s;
}

const DRAW = { weapon, armor, engine, scope, core, generator };

export function gearIconSvg(slot, tier, px) {
  const t = Math.max(0, Math.min(GEAR.tiers.length - 1, tier | 0));
  const draw = DRAW[slot] || weapon;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-30 -30 60 60">${defs(t)}${frame(t)}<g>${draw(t)}</g></svg>`;
}
