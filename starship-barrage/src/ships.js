// 星舰弹幕战 · 舰船矢量美术（第二版）
// 统一「机头朝上」、原点在中心；光从左上方来。设计要点：轮廓粗、色块大，缩到 50px 也认得出。
// 每艘船 = 深色骨架（frame） + 浅色装甲板（armor，带斜向明暗） + 队伍色发光条（accent） + 职业色（cls）。

const TEAM = {
  blue: { armor: ['#ffffff', '#d6e6f8', '#8aa2c6'], frame: ['#3b4f74', '#141d31'], acc: ['#5cc4ff', '#2f86e8'], glow: '#8fe9ff', trim: '#0a1020', canopy: ['#f4feff', '#58d0ff', '#0a2550'], eng: '#7fe3ff' },
  red:  { armor: ['#ffffff', '#f6dade', '#c08c96'], frame: ['#64303c', '#220d14'], acc: ['#ff7a6b', '#e8304a'], glow: '#ffab8f', trim: '#1a070c', canopy: ['#fff6f0', '#ff9a6b', '#4a0f12'], eng: '#ffb08a' },
  npc:  { armor: ['#eef1f6', '#b9c0cc', '#727b8c'], frame: ['#434a58', '#1a1d24'], acc: ['#a7b0c2', '#6f7889'], glow: '#c8d2e6', trim: '#0e1016', canopy: ['#f4f7fb', '#9aa6ba', '#20252f'], eng: '#c8d2e6' },
};
const CLS = { dps: '#ffb43a', tank: '#5ff0ff', healer: '#5dff9e', carrier: '#c58bff' };

// 涂装：0标准 1星尘 2极光 3暗金 4虹彩 5黑洞
function palette(team, skin, npc) {
  const t = TEAM[npc ? 'npc' : team];
  const p = { ...t, accStops: null, gold: false, sparkle: false, aura: null };
  if (npc) return p;
  switch (skin) {
    case 1: p.armor = ['#ffffff', '#f3f6fc', '#b8c4da']; p.frame = ['#5b6886', '#262f45']; p.acc = ['#e9f6ff', '#9fc4ef']; p.sparkle = true; break;
    case 2: p.frame = ['#1f5a63', '#0b1f2c']; p.accStops = ['#6dffc8', '#4fd3ff', '#9b7dff']; p.canopy = ['#efffff', '#6dffc8', '#0c2a33']; p.glow = '#8dffe0'; break;
    case 3: p.armor = ['#6d6d78', '#33333c', '#141418']; p.frame = ['#26262c', '#0a0a0c']; p.acc = ['#ffe08a', '#e0a01e']; p.glow = '#ffd86b'; p.trim = '#2a1d00'; p.canopy = ['#fff6d8', '#ffb43a', '#3a1c00']; p.gold = true; break;
    case 4: p.accStops = ['#ff5f6d', '#ffc371', '#5fffb0', '#5fb8ff', '#c57bff']; p.canopy = ['#ffffff', '#c58bff', '#1a0f3a']; p.glow = '#e0c8ff'; break;
    case 5: p.armor = ['#8a78c0', '#3e2f62', '#1a1230']; p.frame = ['#2a2040', '#08060e']; p.acc = ['#d2a2ff', '#9a4dff']; p.glow = '#c890ff'; p.trim = '#05020a'; p.canopy = ['#f4e8ff', '#b066ff', '#12002a']; p.aura = '#b066ff'; break;
    default: break;
  }
  return p;
}

function defs(p, cls = null, H = 40) {
  const accStops = p.accStops || [p.acc[0], p.acc[1]];
  const st = accStops.map((c, i) => `<stop offset="${(i / (accStops.length - 1)).toFixed(2)}" stop-color="${c}"/>`).join('');
  const c = cls || p.glow;
  return `<defs>
    <linearGradient id="arm" x1="-${H * .5}" y1="-${H}" x2="${H * .4}" y2="${H * .8}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${p.armor[0]}"/><stop offset=".45" stop-color="${p.armor[1]}"/><stop offset="1" stop-color="${p.armor[2]}"/></linearGradient>
    <linearGradient id="sh" x1="-1" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".58" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
    <linearGradient id="frm" x1="0" y1="-${H}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${p.frame[0]}"/><stop offset="1" stop-color="${p.frame[1]}"/></linearGradient>
    <linearGradient id="acc" x1="-${H}" y1="0" x2="${H}" y2="0" gradientUnits="userSpaceOnUse">${st}</linearGradient>
    <linearGradient id="metal" x1="-1" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a6274"/><stop offset=".35" stop-color="#e6ebf4"/><stop offset=".6" stop-color="#9aa3b6"/><stop offset="1" stop-color="#3a4050"/></linearGradient>
    <radialGradient id="cnp" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="${p.canopy[0]}"/><stop offset=".45" stop-color="${p.canopy[1]}"/><stop offset="1" stop-color="${p.canopy[2]}"/></radialGradient>
    <radialGradient id="eng"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="${p.eng}"/><stop offset="1" stop-color="${p.eng}" stop-opacity="0"/></radialGradient>
    <radialGradient id="cg"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="${c}"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>
    <linearGradient id="gold" x1="0" y1="-1" x2="0" y2="1"><stop offset="0" stop-color="#fff4c2"/><stop offset=".5" stop-color="#ffcc4d"/><stop offset="1" stop-color="#9a6400"/></linearGradient>
    <filter id="gl" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.3"/></filter>
    <filter id="gl2" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6"/></filter>
  </defs>`;
}

const flip = d => `<path d="${d}"/><path d="${d}" transform="scale(-1,1)"/>`;
const pair = (d, attrs) => `<g ${attrs}>${flip(d)}</g>`;
// 一块装甲：渐变底 + 斜向明暗 + 描边
const plate = (d, p, sw = 1, fill = 'url(#arm)') => `<path d="${d}" fill="${fill}" stroke="${p.trim}" stroke-width="${sw}" stroke-linejoin="round"/><path d="${d}" fill="url(#sh)"/>`;
const plates = (d, p, sw = 1, fill = 'url(#arm)') => plate(d, p, sw, fill) + `<g transform="scale(-1,1)">${plate(d, p, sw, fill)}</g>`;
// 发光条：模糊光晕 + 实心
const glowLine = (d, color, w = 1.4) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w * 2.6}" stroke-linecap="round" opacity=".55" filter="url(#gl)"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
const glowFill = (d, fill) => `<path d="${d}" fill="${fill}" opacity=".7" filter="url(#gl)"/><path d="${d}" fill="${fill}"/>`;
const engine = (x, y, rx, ry) => `<ellipse cx="${x}" cy="${y + ry * .55}" rx="${rx * 1.9}" ry="${ry * 1.7}" fill="url(#eng)" opacity=".75"/><ellipse cx="${x}" cy="${y + ry * .3}" rx="${rx}" ry="${ry}" fill="url(#eng)"/>`;
const nozzle = (x, y, w, h, p) => `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="${w * .25}" fill="url(#metal)" stroke="${p.trim}" stroke-width=".7"/>`;
const canopy = (d, hl) => `<path d="${d}" fill="url(#cnp)" stroke="#06101e" stroke-width=".8"/>${hl ? `<path d="${hl}" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="1" stroke-linecap="round"/>` : ''}`;
function sparkles(pts) {
  const star = (x, y, r) => `<path d="M${x},${y - r} L${x + r * .22},${y - r * .22} L${x + r},${y} L${x + r * .22},${y + r * .22} L${x},${y + r} L${x - r * .22},${y + r * .22} L${x - r},${y} L${x - r * .22},${y - r * .22}Z" fill="#fff"/>`;
  return `<g>${pts.map(([x, y, r]) => star(x, y, r)).join('')}</g>`;
}
function finish(p, silhouette, body, size, px, extraDefs = '') {
  const aura = p.aura ? `<g fill="${p.aura}" opacity=".55" filter="url(#gl2)">${silhouette}</g>` : '';
  const goldEdge = p.gold ? `<g fill="none" stroke="url(#gold)" stroke-width="1.1" stroke-linejoin="round">${silhouette}</g>` : '';
  // 统一的外轮廓暗边，保证小尺寸可读
  const rim = `<g fill="none" stroke="${p.trim}" stroke-width="2.4" stroke-linejoin="round" opacity=".9">${silhouette}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${-size} ${-size} ${size * 2} ${size * 2}">${defs(p)}${extraDefs}
    ${aura}${rim}${body}${goldEdge}${p.sparkle ? sparkles([[-20, 8, 2.4], [17, 4, 1.8], [4, -6, 1.5], [-7, 16, 1.3], [24, 13, 1.5]]) : ''}</svg>`;
}

// ───────── 对战战机 ─────────
// 激光 = 游隼截击机（前掠翼、翼尖双激光）
function falcon(p) {
  const wingF = 'M-6,-3 L-33,-14 L-37,-10 L-31,10 L-15,15 L-7,12 Z';
  const wingA = 'M-8,-0.5 L-30.5,-9.5 L-32.5,-6.5 L-28,7 L-15,11 L-9,9 Z';
  const fus = 'M0,-38 C3.2,-32 6,-22 7.2,-10 L8.4,8 L6.4,22 L-6.4,22 L-8.4,8 L-7.2,-10 C-6,-22 -3.2,-32 0,-38 Z';
  const fin = 'M5.5,9 L12,21 L13,27 L7.5,25 L5.5,19 Z';
  const sil = flip(wingF) + flip(fin) + `<path d="${fus}"/>` + flip('M-35,-24 L-31.5,-24 L-31.5,-8 L-35,-8 Z');
  const body =
    pair(wingF, `fill="url(#frm)" stroke="${p.trim}" stroke-width="1"`) +
    plates(wingA, p) +
glowLine('M-10,0.6 L-30.4,-7.6', 'url(#acc)', 1.5) + `<g transform="scale(-1,1)">${glowLine('M-10,0.6 L-30.4,-7.6', 'url(#acc)', 1.5)}</g>` +
    pair('M-14,4 L-26,0 M-17,9 L-25,6.5', `stroke="${p.trim}" stroke-opacity=".35" stroke-width=".7" fill="none"`) +
    // 翼尖激光炮
    pair('M-35.2,-24 h3.6 v16 h-3.6 Z', `fill="url(#metal)" stroke="${p.trim}" stroke-width=".7"`) +
    pair('M-33.4,-25 m-2.2,0 a2.2,2.2 0 1 0 4.4,0 a2.2,2.2 0 1 0 -4.4,0', `fill="url(#cg)"`) +
    engine(-3.4, 24, 2.4, 4.6) + engine(3.4, 24, 2.4, 4.6) + nozzle(-3.4, 20.5, 4, 3.6, p) + nozzle(3.4, 20.5, 4, 3.6, p) +
    pair(fin, `fill="url(#frm)" stroke="${p.trim}" stroke-width=".8"`) + `<g>${glowLine('M6.8,11.5 L11.2,20', 'url(#acc)', 1)}${glowLine('M-6.8,11.5 L-11.2,20', 'url(#acc)', 1)}</g>` +
    plate(fus, p, 1) +
    pair('M-8.4,-2 L-12,2 L-12,10 L-8.6,10 Z', `fill="url(#frm)" stroke="${p.trim}" stroke-width=".7"`) +
    `<path d="M-3.4,-6 L-3.6,18 M3.4,-6 L3.6,18 M-7,6 L7,6 M-6.6,14 L6.6,14" stroke="${p.trim}" stroke-opacity=".3" stroke-width=".7" fill="none"/>` +
    glowLine('M0,-35 L0,-29', 'url(#acc)', 1.6) +
    canopy('M0,-27 C2.9,-23 3.6,-16 3.1,-9.5 L-3.1,-9.5 C-3.6,-16 -2.9,-23 0,-27 Z', 'M-1.3,-23.5 C-.6,-20.5 -.7,-16 -1.2,-12.5') +
    `<circle cx="-30" cy="11.5" r="1.2" fill="#ff5a5a"/><circle cx="30" cy="11.5" r="1.2" fill="#5aff9b"/>`;
  return { sil, body };
}

// 散弹 = 重炮艇（宽机身、双翼三管炮舱）
function gunship(p) {
  const wingF = 'M-11,-7 L-34,1 L-37,16 L-27,21 L-12,17 Z';
  const wingA = 'M-12.5,-4 L-31.5,3 L-33,13.5 L-26,17 L-13.5,13.5 Z';
  const pod = 'M-31,-13 C-31,-15 -29.5,-16 -27.5,-16 L-21.5,-16 C-19.5,-16 -18,-15 -18,-13 L-18,6 L-31,6 Z';
  const fus = 'M0,-30 C6.5,-28 11.5,-20 12.5,-9 L13.5,12 L10.5,25 L-10.5,25 L-13.5,12 L-12.5,-9 C-11.5,-20 -6.5,-28 0,-30 Z';
  const sil = flip(wingF) + flip(pod) + `<path d="${fus}"/>` + flip('M-30,-26 h11 v10 h-11 Z');
  const barrels = [-28.5, -24.5, -20.5].map(x => `<rect x="${x - 1.3}" y="-26" width="2.6" height="11" rx=".8"/>`).join('');
  const body =
    pair(wingF, `fill="url(#frm)" stroke="${p.trim}" stroke-width="1"`) + plates(wingA, p) +
    `<g>${glowLine('M-14,9.5 L-31.5,10.5', 'url(#acc)', 1.6)}${glowLine('M14,9.5 L31.5,10.5', 'url(#acc)', 1.6)}</g>` +
    `<g fill="url(#metal)" stroke="${p.trim}" stroke-width=".6">${barrels}<g transform="scale(-1,1)">${barrels}</g></g>` +
    `<g>${[-28.5, -24.5, -20.5, 20.5, 24.5, 28.5].map(x => `<circle cx="${x}" cy="-26.5" r="1.9" fill="url(#cg)"/>`).join('')}</g>` +
    plates(pod, p, 1, 'url(#frm)') + pair('M-29.5,-12 h10 v3 h-10 Z', `fill="url(#arm)" stroke="${p.trim}" stroke-width=".5"`) +
    pair('M-28,-4 h7 M-28,0 h7', `stroke="url(#acc)" stroke-width="1.2"`) +
    [-6, 0, 6].map(x => engine(x, 26, 2.5, 4.4) + nozzle(x, 22.5, 4.2, 3.6, p)).join('') +
    plate(fus, p, 1) +
    plates('M-12.8,-6 C-16,-4 -17,4 -15.5,12 L-13.4,12 L-12.6,-6 Z', p, .8, 'url(#frm)') +
    `<path d="M-5,-4 L-5,20 M5,-4 L5,20 M-9,8 L9,8 M-9.5,16 L9.5,16" stroke="${p.trim}" stroke-opacity=".3" stroke-width=".7" fill="none"/>` +
    glowFill('M-3.5,-27 L0,-24.4 L3.5,-27 L3.5,-25 L0,-22.2 L-3.5,-25 Z', 'url(#acc)') +
    canopy('M0,-20 C4.2,-17 5.2,-11 4.6,-5 L-4.6,-5 C-5.2,-11 -4.2,-17 0,-20 Z', 'M-2,-16.5 C-1.2,-13.5 -1.3,-10 -1.9,-7.5') +
    glowLine('M-8,20.5 L8,20.5', 'url(#acc)', 1.2);
  return { sil, body };
}

// 蓄力 = 长矛电磁炮（贯穿机身的双轨道炮）
function lance(p) {
  const wingF = 'M-7,-1 L-31,13 L-33,21 L-20,23 L-8,19 Z';
  const wingA = 'M-8.5,2 L-28.5,14 L-29.5,19 L-20,20.5 L-9.5,16.5 Z';
  const fus = 'M0,-15 C5.4,-13 8.4,-5 8.4,6 L7.4,20 L4.6,27 L-4.6,27 L-7.4,20 L-8.4,6 C-8.4,-5 -5.4,-13 0,-15 Z';
  const rails = 'M-5.2,-40 L-1.6,-40 L-1.6,-6 L-5.2,-6 Z';
  const sil = flip(wingF) + `<path d="${fus}"/>` + flip(rails);
  const body =
    pair(wingF, `fill="url(#frm)" stroke="${p.trim}" stroke-width="1"`) + plates(wingA, p) +
    `<g>${glowLine('M-10,4.5 L-27.8,15', 'url(#acc)', 1.5)}${glowLine('M10,4.5 L27.8,15', 'url(#acc)', 1.5)}</g>` +
    // 能量夹在两条轨道中间
    `<rect x="-1.8" y="-39" width="3.6" height="32" fill="${p.glow}" opacity=".8" filter="url(#gl)"/><rect x="-.8" y="-39" width="1.6" height="32" fill="#fff"/>` +
    pair(rails, `fill="url(#metal)" stroke="${p.trim}" stroke-width=".8"`) +
    [-33, -25, -17].map(y => `<ellipse cx="0" cy="${y}" rx="7.2" ry="2" fill="none" stroke="url(#acc)" stroke-width="1.5"/>`).join('') +
    `<circle cx="0" cy="-40" r="3.6" fill="url(#cg)"/>` +
    // 储能舱
    pair('M-15,9 m-4,0 a4,4 0 1 0 8,0 a4,4 0 1 0 -8,0', `fill="url(#frm)" stroke="${p.trim}" stroke-width=".8"`) +
    pair('M-15,9 m-2.3,0 a2.3,2.3 0 1 0 4.6,0 a2.3,2.3 0 1 0 -4.6,0', `fill="url(#cg)"`) +
    engine(0, 28, 3.6, 5.8) + nozzle(0, 24.5, 6, 3.6, p) +
    plate(fus, p, 1) +
    `<path d="M-4,0 L-4,20 M4,0 L4,20 M-7.5,12 L7.5,12" stroke="${p.trim}" stroke-opacity=".3" stroke-width=".7" fill="none"/>` +
    canopy('M0,-10 C3.2,-7.5 4,-2 3.5,3.5 L-3.5,3.5 C-4,-2 -3.2,-7.5 0,-10 Z', 'M-1.4,-7 C-.7,-4.5 -.8,-1.5 -1.3,1') +
    glowLine('M-5.5,16 L5.5,16', 'url(#acc)', 1.2);
  return { sil, body };
}

export function fighterSvg(team, weapon, skin, npc, px) {
  const p = palette(team, skin, npc);
  const { sil, body } = (weapon === 'spread' ? gunship : weapon === 'charge' ? lance : falcon)(p);
  return finish(p, sil, body, 40, px);
}

// ───────── 讨伐：输出舰「破晓」——箭头形重型突击舰，双主炮 + 翼下导弹巢 ─────────
export function dpsSvg(skin, px) {
  const p = palette('blue', skin, false), C = CLS.dps;
  const frame = 'M0,-39 L11,-19 L15,-7 L35,11 L35,19 L23,21 L15,17 L11,26 L-11,26 L-15,17 L-23,21 L-35,19 L-35,11 L-15,-7 L-11,-19 Z';
  const core = 'M0,-35 L8.5,-17 L10.5,8 L7,21 L-7,21 L-10.5,8 L-8.5,-17 Z';
  const wingA = 'M-14.5,-3 L-32,12 L-32,16.5 L-23,18 L-14,13 Z';
  const cannon = 'M-15,-30 L-11.6,-30 L-11.6,-4 L-15,-4 Z';
  const sil = `<path d="${frame}"/>` + flip(cannon);
  const missiles = [-19, -23.5, -28].map((x, i) => `<g transform="translate(${x},${4 + i * 2.5})"><rect x="-1.5" y="-5" width="3" height="8" rx="1.2" fill="url(#metal)" stroke="${p.trim}" stroke-width=".5"/><path d="M-1.5,-5 L0,-8.2 L1.5,-5 Z" fill="${C}"/></g>`).join('');
  const body =
    `<path d="${frame}" fill="url(#frm)" stroke="${p.trim}" stroke-width="1.1" stroke-linejoin="round"/>` +
    plates(wingA, p) +
    `<g>${missiles}<g transform="scale(-1,1)">${missiles}</g></g>` +
    `<g>${glowLine('M-16,-4.5 L-33.5,11', 'url(#acc)', 1.6)}${glowLine('M16,-4.5 L33.5,11', 'url(#acc)', 1.6)}</g>` +
    // 双主炮
    pair(cannon, `fill="url(#metal)" stroke="${p.trim}" stroke-width=".8"`) +
    pair('M-15.6,-14 h4.6 v4 h-4.6 Z', `fill="url(#frm)"`) +
    `<circle cx="-13.3" cy="-31" r="2.8" fill="url(#cg)"/><circle cx="13.3" cy="-31" r="2.8" fill="url(#cg)"/>` +
    [-5.5, 5.5].map(x => engine(x, 27, 3, 5) + nozzle(x, 23, 5, 3.8, p)).join('') +
    engine(-23, 21, 1.8, 3) + engine(23, 21, 1.8, 3) +
    plate(core, p, 1) +
    `<path d="M-4.6,-6 L-5,18 M4.6,-6 L5,18 M-9.6,6 L9.6,6" stroke="${p.trim}" stroke-opacity=".3" stroke-width=".7" fill="none"/>` +
    // 职业色：机鼻橙色破甲 V 纹
    glowFill('M-5,-29 L0,-24.5 L5,-29 L5,-26.4 L0,-21.8 L-5,-26.4 Z', C) +
    glowFill('M-6.5,13 L0,16.5 L6.5,13 L6.5,15.4 L0,19 L-6.5,15.4 Z', C) +
    canopy('M0,-19 C3.6,-16 4.4,-10 3.9,-3.5 L-3.9,-3.5 C-4.4,-10 -3.6,-16 0,-19 Z', 'M-1.6,-15.5 C-.8,-12.5 -.9,-8.5 -1.5,-6');
  return finish(p, sil, body, 40, px);
}

// ───────── 讨伐：重装机甲「泰坦」——俯视人形：大肩甲、塔盾、能量巨剑、背包推进器 ─────────
export function mechSvg(skin, px) {
  const p = palette('blue', skin, false), C = CLS.tank;
  const pack = 'M-12,8 L12,8 L15,21 L9,27 L-9,27 L-15,21 Z';
  const torso = 'M-12.5,-11 L12.5,-11 L16,-2 L13.5,13 L-13.5,13 L-16,-2 Z';
  const pauldron = 'M-13.5,-13.5 C-21,-17 -29.5,-11 -29.5,-2 C-29.5,6 -23.5,10 -16.5,8.5 L-13,2 Z';
  const pauldron2 = 'M-15.5,-10.5 C-21,-12.5 -26,-8.5 -26,-2.5 C-26,2 -23,4.5 -18.5,4 Z';
  const head = 'M-5.6,-18.5 L5.6,-18.5 L7,-13 L4.5,-8.5 L-4.5,-8.5 L-7,-13 Z';
  const shield = 'M-31,-31 L-23,-27.5 L-23,7 L-31,12.5 L-39,7 L-39,-27.5 Z';
  const blade = 'M25,-15 L29,-15 L29.6,-36 L27,-41.5 L24.4,-36 Z';
  const sil = `<path d="${pack}"/><path d="${torso}"/>` + flip(pauldron) + `<path d="${head}"/><path d="${shield}"/>` + `<path d="${blade}"/>` + `<circle cx="27" cy="-6" r="5.5"/>`;
  const hex = (x, y, r) => `M${x},${y - r} L${x + r * .87},${y - r / 2} L${x + r * .87},${y + r / 2} L${x},${y + r} L${x - r * .87},${y + r / 2} L${x - r * .87},${y - r / 2} Z`;
  const body =
    // 背包推进器
    engine(-7, 27, 3.2, 5.6) + engine(7, 27, 3.2, 5.6) + nozzle(-7, 23, 5.6, 4.2, p) + nozzle(7, 23, 5.6, 4.2, p) +
    `<path d="${pack}" fill="url(#frm)" stroke="${p.trim}" stroke-width="1"/>` +
    pair('M-11,11 L-13.5,20', `stroke="url(#acc)" stroke-width="1.4"`) +
    // 躯干
    plate(torso, p, 1.1) +
    `<path d="M0,-11 L0,13 M-13,3 L13,3" stroke="${p.trim}" stroke-opacity=".35" stroke-width=".8"/>` +
    pair('M-10,-8 L-4,-8 L-4,-1 L-12,-1 Z', `fill="url(#frm)" opacity=".55"`) +
    // 胸口反应堆
    `<circle cx="0" cy="4" r="5.4" fill="url(#frm)" stroke="${p.trim}" stroke-width=".8"/><circle cx="0" cy="4" r="5.6" fill="url(#cg)" opacity=".85"/><circle cx="0" cy="4" r="1.8" fill="#fff"/>` +
    // 肩甲（两层）
    plates(pauldron, p, 1.1) + plates(pauldron2, p, .7) +
    `<g>${glowLine('M-27.5,-6 C-27,-1 -24.5,3 -20,4.5', 'url(#acc)', 1.4)}${glowLine('M27.5,-6 C27,-1 24.5,3 20,4.5', 'url(#acc)', 1.4)}</g>` +
    // 头部 + 金色V角 + 目镜
    plate(head, p, 1) +
    `<path d="M0,-15 L-8.5,-24 L-7.2,-25 L0,-18.5 L7.2,-25 L8.5,-24 Z" fill="url(#gold)" stroke="#5a3a00" stroke-width=".5"/>` +
    glowFill('M-4.2,-14.5 L4.2,-14.5 L3.4,-12 L-3.4,-12 Z', C) +
    // 左臂塔盾
    plate(shield, p, 1.2) +
    `<path d="${hex(-31, -11, 6)}" fill="url(#frm)" stroke="${C}" stroke-width="1.2"/>` +
    glowFill(hex(-31, -11, 2.6), C) +
    glowLine('M-38,-25.5 L-31,-29 L-24,-25.5', C, 1.2) +
    `<path d="M-31,-3 L-31,9" stroke="${p.trim}" stroke-opacity=".35" stroke-width=".8"/>` +
    // 右手能量巨剑
    `<g filter="url(#gl2)" opacity=".85"><path d="${blade}" fill="${C}"/></g>` +
    `<path d="${blade}" fill="${C}" stroke="#e8fdff" stroke-width=".7"/><path d="M27,-15 L27,-39" stroke="#fff" stroke-width="1.3"/>` +
    `<rect x="21.5" y="-16.5" width="11" height="3.2" rx="1" fill="url(#gold)" stroke="#5a3a00" stroke-width=".5"/>` +
    `<rect x="25.6" y="-13.5" width="2.8" height="5" fill="url(#metal)"/>` +
    `<circle cx="27" cy="-6" r="5.5" fill="url(#arm)" stroke="${p.trim}" stroke-width="1"/><circle cx="27" cy="-6" r="5.5" fill="url(#sh)"/>`;
  return finish(p, sil, body, 42, px);
}

// ───────── 讨伐：医疗舰「炽天使」——珍珠白圆润舰体、绿色光环、花瓣翼 ─────────
export function healerSvg(skin, px) {
  const p = palette('blue', skin, false), C = CLS.healer;
  const hull = 'M0,-31 C9.5,-31 13.5,-21 13.5,-8 C13.5,7 8,19 0,23 C-8,19 -13.5,7 -13.5,-8 C-13.5,-21 -9.5,-31 0,-31 Z';
  const petal = 'M-9,-5 C-19,-17 -33,-14 -35.5,-2 C-36.5,9 -24,15 -11,8 Z';
  const petal2 = 'M-8,10 C-15,12 -20,20 -16,25.5 C-11.5,26.5 -7.5,20 -5.5,15 Z';
  const sil = `<path d="${hull}"/>` + flip(petal) + flip(petal2);
  const vein = 'M-11.5,1 C-18,-5 -27,-6 -32,-1';
  const body =
    // 光环（在舰体后面）
    `<circle cx="0" cy="-3" r="28" fill="none" stroke="${C}" stroke-width="5" opacity=".35" filter="url(#gl2)"/>` +
    `<circle cx="0" cy="-3" r="28" fill="none" stroke="${C}" stroke-width="1.6" stroke-dasharray="34 10" opacity=".95"/>` +
    [[0, -31], [28, -3], [-28, -3], [0, 25]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="url(#cg)"/><circle cx="${x}" cy="${y}" r="1.4" fill="#fff"/>`).join('') +
    [-6, 0, 6].map(x => engine(x, 24, 2.2, 4)).join('') +
    plates(petal2, p, .9) +
    plates(petal, p, 1.1) +
    `<g>${glowLine(vein, C, 1.3)}<g transform="scale(-1,1)">${glowLine(vein, C, 1.3)}</g></g>` +
    pair('M-14,-7 C-22,-12 -29,-10 -31,-6', `fill="none" stroke="${p.trim}" stroke-opacity=".3" stroke-width=".7"`) +
    plate(hull, p, 1.1) +
    `<path d="M-13,-6 C-6,-3 6,-3 13,-6" fill="none" stroke="url(#acc)" stroke-width="1.6"/>` +
    `<path d="M-11.5,9 C-5,12 5,12 11.5,9" fill="none" stroke="${p.trim}" stroke-opacity=".3" stroke-width=".8"/>` +
    canopy('M0,-27 C4.6,-27 6.4,-22.5 6.2,-17.5 C6,-13.5 3.4,-11.5 0,-11.5 C-3.4,-11.5 -6,-13.5 -6.2,-17.5 C-6.4,-22.5 -4.6,-27 0,-27 Z', 'M-3,-23.5 C-3.6,-21 -3.4,-18.5 -2.6,-16.5') +
    // 背部十字徽记
    `<g transform="translate(0,4)"><path d="M-2.4,-7.5 h4.8 v5.1 h5.1 v4.8 h-5.1 v5.1 h-4.8 v-5.1 h-5.1 v-4.8 h5.1 Z" fill="${C}" opacity=".8" filter="url(#gl)"/><path d="M-2.4,-7.5 h4.8 v5.1 h5.1 v4.8 h-5.1 v5.1 h-4.8 v-5.1 h-5.1 v-4.8 h5.1 Z" fill="#fff" stroke="#0a4a26" stroke-width=".6"/></g>`;
  return finish(p, sil, body, 40, px);
}

// ───────── 召唤战舰（礼物战舰）：长舰体主力舰，双联装主炮、侧舷机库、舰桥，金色描边表示是礼物召唤 ─────────
export function battleshipSvg(team, pxW, pxH) {
  const p = palette(team, 0, false);
  const hullF = 'M0,-62 L12,-48 L19,-24 L25,6 L29,34 L20,52 L-20,52 L-29,34 L-25,6 L-19,-24 L-12,-48 Z';
  const hullA = 'M0,-57 L9,-45 L14.5,-24 L19.5,4 L22,30 L-22,30 L-19.5,4 L-14.5,-24 L-9,-45 Z';
  const sponF = 'M-20,-6 L-62,9 L-77,24 L-75,37 L-50,40 L-24,34 Z';
  const sponA = 'M-22,-1.5 L-58,11.5 L-70,23.5 L-68.5,32 L-50,34 L-25,29 Z';
  const turret = (y, r) => `<g transform="translate(0,${y})">
      <rect x="-4.4" y="${-r - 11}" width="3" height="${r + 7}" rx="1" fill="url(#metal)" stroke="${p.trim}" stroke-width=".6"/>
      <rect x="1.4" y="${-r - 11}" width="3" height="${r + 7}" rx="1" fill="url(#metal)" stroke="${p.trim}" stroke-width=".6"/>
      <circle cx="-2.9" cy="${-r - 11}" r="1.8" fill="url(#cg)"/><circle cx="2.9" cy="${-r - 11}" r="1.8" fill="url(#cg)"/>
      <path d="M${-r},2 C${-r},${-r * 1.1} ${r},${-r * 1.1} ${r},2 L${r * .8},${r * .7} L${-r * .8},${r * .7} Z" fill="url(#arm)" stroke="url(#gold)" stroke-width="1.2"/>
      <path d="M${-r},2 C${-r},${-r * 1.1} ${r},${-r * 1.1} ${r},2 L${r * .8},${r * .7} L${-r * .8},${r * .7} Z" fill="url(#sh)"/>
      <rect x="${-r * .55}" y="-1" width="${r * 1.1}" height="2.2" rx="1" fill="url(#acc)"/></g>`;
  const lights = pts => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.3" fill="${p.glow}"/>`).join('');
  const sil = `<path d="${hullF}"/>` + flip(sponF);
  const body =
    `<g fill="#ffd86b" opacity=".5" filter="url(#gl2)">${sil}</g>` +
    [-24, 0, 24].map(x => engine(x, 54, x ? 5 : 7, x ? 8 : 11) + nozzle(x, 49, x ? 10 : 13, 6, p)).join('') +
    pair(sponF, `fill="url(#frm)" stroke="url(#gold)" stroke-width="1.3"`) +
    plates(sponA, p, 1) +
    `<g>${glowLine('M-24,2 L-58,14.5', 'url(#acc)', 1.8)}${glowLine('M24,2 L58,14.5', 'url(#acc)', 1.8)}</g>` +
    // 侧舷机库
    pair('M-52,20 h14 v9 h-14 Z M-34,17 h9 v10 h-9 Z', `fill="url(#frm)" stroke="${p.trim}" stroke-width=".7"`) +
    pair('M-50.5,22 h11 v1.6 h-11 Z M-50.5,25.5 h11 v1.6 h-11 Z M-32.5,19 h6 v1.6 h-6 Z', `fill="${p.glow}" opacity=".85"`) +
    pair('M-71,29 m-2.4,0 a2.4,2.4 0 1 0 4.8,0 a2.4,2.4 0 1 0 -4.8,0', `fill="url(#cg)"`) +
    `<path d="${hullF}" fill="url(#frm)" stroke="url(#gold)" stroke-width="1.5" stroke-linejoin="round"/>` +
    plate(hullA, p, 1) +
    `<path d="M0,-52 L0,28 M-15,-12 L15,-12 M-18,10 L18,10" stroke="${p.trim}" stroke-opacity=".28" stroke-width=".8"/>` +
    pair('M-10,-42 L-15,-22 L-12.5,-22 L-7.8,-40 Z', `fill="url(#acc)"`) +
    glowFill('M-6,-56 L0,-49.5 L6,-56 L6,-53 L0,-46.5 L-6,-53 Z', '#ffd86b') +
    turret(-28, 7) + turret(-4, 7.8) +
    // 舰桥
    `<g transform="translate(0,33)">
      <path d="M-14,-10 L14,-10 L17,12 L-17,12 Z" fill="url(#arm)" stroke="${p.trim}" stroke-width="1"/><path d="M-14,-10 L14,-10 L17,12 L-17,12 Z" fill="url(#sh)"/>
      <path d="M-10,-6 L10,-6 L11,-2 L-11,-2 Z" fill="url(#cnp)" stroke="#06101e" stroke-width=".6"/>
      ${[-9, -4.5, 0, 4.5, 9].map(x => `<rect x="${x - 1.2}" y="3" width="2.4" height="3.6" rx=".6" fill="${p.glow}"/>`).join('')}
      <path d="M-4,-10 L-3,-18 L3,-18 L4,-10" fill="url(#frm)" stroke="${p.trim}" stroke-width=".7"/>
      <line x1="0" y1="-18" x2="0" y2="-26" stroke="#c9d1e2" stroke-width="1.2"/><circle cx="0" cy="-26" r="1.6" fill="#ff6060"/></g>` +
    lights([[-21, 14], [-22.5, 22], [21, 14], [22.5, 22], [-13, -32], [13, -32], [-15.5, -18], [15.5, -18]]);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}" viewBox="-80 -64 160 128">${defs(p, null, 64)}${body}</svg>`;
}

// ───────── 讨伐：蜂巢航母——宽体飞行甲板、右舷舰岛、舰艏双机库口，甲板上停着无人机 ─────────
export function carrierSvg(skin, px) {
  const p = palette('blue', skin, false), C = CLS.carrier;
  const hullF = 'M-15,-37 L15,-37 L22,-24 L24,18 L18,30 L-18,30 L-24,18 L-22,-24 Z';
  const sponF = 'M-22,-14 L-36,-8 L-38,14 L-24,20 Z';
  const deck = 'M-11,-33 L11,-33 L16,-22 L17.5,16 L12,25 L-12,25 L-17.5,16 L-16,-22 Z';
  const island = 'M16,-6 L29,-10 L33,-2 L33,12 L27,16 L18,12 Z';
  const sil = `<path d="${hullF}"/>` + flip(sponF) + `<path d="${island}"/>`;
  const drone = (x, y, sc = 1) => `<g transform="translate(${x},${y}) scale(${sc})"><path d="M0,-4.6 L3.8,2.6 L1.2,1.6 L0,3.6 L-1.2,1.6 L-3.8,2.6 Z" fill="url(#arm)" stroke="${p.trim}" stroke-width=".5"/><circle cy="-.4" r="1.1" fill="${C}"/></g>`;
  const body =
    [-13, -4.5, 4.5, 13].map(x => engine(x, 31, 2.4, 4.6) + nozzle(x, 27.5, 4.4, 3.4, p)).join('') +
    pair(sponF, `fill="url(#frm)" stroke="${p.trim}" stroke-width="1"`) +
    plates('M-23.5,-10.5 L-34,-6 L-35.5,11.5 L-25,16 Z', p, .8) +
    pair('M-33,-3 L-27,-5 M-33,3 L-27,1.6 M-33,9 L-27,8', `stroke="${C}" stroke-width="1.2" opacity=".85"`) +
    `<path d="${hullF}" fill="url(#frm)" stroke="${p.trim}" stroke-width="1.1" stroke-linejoin="round"/>` +
    plate(deck, p, .9) +
    // 跑道：中线灯 + 两侧发光边
    `<path d="M0,-30 L0,22" stroke="${p.trim}" stroke-opacity=".35" stroke-width="5"/>` +
    [-26, -18, -10, -2, 6, 14].map(y => `<rect x="-.9" y="${y}" width="1.8" height="3.4" rx=".6" fill="${C}"/>`).join('') +
    `<g>${glowLine('M-6,-30 L-6.5,22', C, .9)}${glowLine('M6,-30 L6.5,22', C, .9)}</g>` +
    // 舰艏双机库口
    pair('M-10,-36 L-3,-36 L-3,-31 L-10,-31 Z', `fill="#05070e" stroke="${p.trim}" stroke-width=".6"`) +
    pair('M-9.4,-33 L-3.6,-33', `stroke="${C}" stroke-width="1.6" opacity=".9"`) +
    // 停机坪上的无人机
    drone(-11, -12) + drone(-11, -2) + drone(-11, 8) + drone(11.5, -18, .9) +
    glowLine('M-15,-22 L-15,14', 'url(#acc)', 1.1) +
    // 右舷舰岛
    plate(island, p, 1) +
    `<path d="M20,-3 L30,-6 L30,-1 L20,1 Z" fill="url(#cnp)" stroke="#06101e" stroke-width=".6"/>` +
    `<line x1="27" y1="-8" x2="27" y2="-17" stroke="#c9d1e2" stroke-width="1.1"/><circle cx="27" cy="-17" r="1.5" fill="#ff6060"/>` +
    `<circle cx="25" cy="8" r="2.6" fill="url(#frm)" stroke="${p.trim}" stroke-width=".6"/><circle cx="25" cy="8" r="2.8" fill="url(#cg)" opacity=".7"/>` +
    // 舰艉蜂巢徽记
    `<path d="M0,13.5 L3.5,15.5 L3.5,19.5 L0,21.5 L-3.5,19.5 L-3.5,15.5 Z" fill="${C}" opacity=".7" filter="url(#gl)"/><path d="M0,13.5 L3.5,15.5 L3.5,19.5 L0,21.5 L-3.5,19.5 L-3.5,15.5 Z" fill="none" stroke="#fff" stroke-width=".8"/>`;
  const svg = finish(p, sil, body, 40, px);
  return svg.replace('url(#cg)"/>', 'url(#cg)"/>').replace(/<radialGradient id="cg">[^]*?<\/radialGradient>/, `<radialGradient id="cg"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="${C}"/><stop offset="1" stop-color="${C}" stop-opacity="0"/></radialGradient>`);
}

// 航母无人机（attack 紫色尖翼；guard 带护盾环）
export function droneShipSvg(kind, px) {
  const p = palette('blue', 0, false), C = CLS.carrier;
  const body = `<path d="M0,-11 L8.5,6 L3,4 L0,9 L-3,4 L-8.5,6 Z" fill="url(#arm)" stroke="${p.trim}" stroke-width="1"/><path d="M0,-11 L8.5,6 L3,4 L0,9 L-3,4 L-8.5,6 Z" fill="url(#sh)"/>
    ${glowLine('M-6.5,4 L0,-7 L6.5,4', C, .9)}<circle cy="-1" r="2.2" fill="${C}"/><circle cy="-1" r="1" fill="#fff"/>
    <ellipse cx="0" cy="11" rx="2.6" ry="4" fill="url(#eng)"/>`;
  const ring = kind === 'guard' ? `<circle r="13" fill="none" stroke="${C}" stroke-width="3" opacity=".35" filter="url(#gl)"/><circle r="13" fill="none" stroke="${C}" stroke-width="1" stroke-dasharray="5 3"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-16 -16 32 32">${defs(p, C, 16)}${ring}${body}</svg>`;
}
