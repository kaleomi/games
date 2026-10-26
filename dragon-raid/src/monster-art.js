// 屠龙战纪 · 小怪与宝箱怪矢量美术
// 敌方统一「俯视、头朝下」（+y，朝向屏幕下方的英雄）；原点 = 精灵中心；光从左上方来。
// 每只怪 = 深色外轮廓（剪影描粗边） + 分块渐变（亮面/暗部） + 全身左上受光罩 + 自发光部件（眼睛、火球、熔岩）。
// minionSvg(kind, px)：swarm 雏龙(30) / diver 爆裂蝠(34) / gunner 龙人术士(54) / elite 龙人督军(104) / skeleton 骷髅兵(30)
// mimicSvg(px)：宝箱怪(110)

const NS = 'http://www.w3.org/2000/svg';
const mir = d => `<path d="${d}"/><path d="${d}" transform="scale(-1,1)"/>`;
const pair = (d, a) => `<g ${a}>${mir(d)}</g>`;
const P = (d, a = '') => `<path d="${d}" ${a}/>`;
const doc = (px, r, inner) => `<svg xmlns="${NS}" width="${px}" height="${px}" viewBox="${-r} ${-r} ${r * 2} ${r * 2}">${inner}</svg>`;
// 色标：字符串均分，或 [offset, color, opacity]
const stops = cs => cs.map((c, i) => {
  const [o, col, op] = Array.isArray(c) ? c : [i / (cs.length - 1), c, 1];
  return `<stop offset="${(+o).toFixed(3)}" stop-color="${col}"${op !== 1 ? ` stop-opacity="${op}"` : ''}/>`;
}).join('');
const lin = (id, x1, y1, x2, y2, cs, user = false) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${user ? ' gradientUnits="userSpaceOnUse"' : ''}>${stops(cs)}</linearGradient>`;
const rad = (id, cx, cy, r, cs, user = false) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${user ? ' gradientUnits="userSpaceOnUse"' : ''}>${stops(cs)}</radialGradient>`;
const blur = (id, s) => `<filter id="${id}" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="${s}"/></filter>`;
// 统一深色外轮廓：把剪影整体描粗边
const outline = (sil, c, w) => `<g fill="${c}" stroke="${c}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round">${sil}</g>`;
// 全身受光罩（左上亮、右下暗），叠在固有色上
const lightRig = (id, r, k = 1) => lin(id, -r, -r, r * .85, r * .85, [[0, '#fff', .34 * k], [.42, '#fff', 0], [.56, '#000', 0], [1, '#000', .42 * k]], true);
const lit = (sil, id) => `<g fill="url(#${id})">${sil}</g>`;
// 发光体：模糊光晕 + 实体
const glowPath = (d, fill, f, op = .8) => `<path d="${d}" fill="${fill}" opacity="${op}" filter="url(#${f})"/><path d="${d}" fill="${fill}"/>`;
const glowStroke = (d, color, w, f, op = .7) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w * 2.4}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}" filter="url(#${f})"/><path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circ = (x, y, r, a = '') => `<circle cx="${x}" cy="${y}" r="${r}" ${a}/>`;
const ell = (x, y, rx, ry, a = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${a}/>`;
const f2 = n => +n.toFixed(2);

// 共用色
const FIRE = ['#ffffff', [.22, '#fff6b8', 1], [.45, '#ffd23a', 1], [.72, '#ff7a1a', 1], [1, '#c8200a', 1]];
const EYE_Y = ['#ffffff', [.35, '#fff27a', 1], [.75, '#ffb21a', 1], [1, '#ff6a00', 1]];
const IVORY = ['#fffaf0', [.45, '#e8d8b4', 1], [1, '#7a6646', 1]];
const GOLD = ['#fff6c8', [.4, '#ffd24a', 1], [.75, '#d0901a', 1], [1, '#7a4a00', 1]];

// ───────── 雏龙：小红龙崽，翅膀张开，头朝下（逻辑 30） ─────────
function swarm(px) {
  const O = '#1e0609';
  const wing = 'M-3.2,-1.4 Q-7,1.8 -10.2,1.9 L-15,-2.6 Q-12.4,-4.4 -12.9,-8.8 Q-10.4,-7.8 -8.1,-11 Q-6.6,-7.4 -2.8,-5.8 Z';
  const tail = 'M-2.3,-4.4 C-2.7,-7.8 -0.2,-8.8 -1.3,-11.8 L0.4,-12.4 C2.3,-9.4 2.7,-7.6 2.3,-4.4 Z';
  const spade = 'M-0.5,-11.2 L-3.1,-13 L-0.9,-15.3 L1.7,-13.3 Z';
  const body = 'M0,-6.3 C3,-6.3 4.6,-2.7 4.4,1 C4.2,4 2.6,6 0,6.3 C-2.6,6 -4.2,4 -4.4,1 C-4.6,-2.7 -3,-6.3 0,-6.3 Z';
  const head = 'M0,4.2 C3.4,4.2 4.6,6.4 4.4,8.8 C4.2,10.6 3,11.8 2.2,12.8 C1.8,14 1.2,15.2 0,15.4 C-1.2,15.2 -1.8,14 -2.2,12.8 C-3,11.8 -4.2,10.6 -4.4,8.8 C-4.6,6.4 -3.4,4.2 0,4.2 Z';
  const horn = 'M-2.2,6 C-3.8,4.2 -5,2.2 -5.4,-0.4 C-4.2,1.6 -3.4,2.8 -1,4.6 Z';
  const frill = 'M-4.2,8 L-6.4,8.6 L-4.4,10.4 Z';
  const sil = mir(wing) + P(tail) + P(spade) + P(body) + P(head) + mir(horn) + mir(frill);
  const spikes = [5.4, 1.8, -1.8].map((y, i) => { const s = 1.05 - i * .15; return `M${-s},${y} L0,${y - s * 2} L${s},${y} Z`; }).join(' ');
  return doc(px, 16, `<defs>
    ${rad('sk', .35, .3, .85, ['#ffb27a', [.45, '#ee4a2c', 1], [1, '#7a1016', 1]])}
    ${lin('mem', .5, 1, .5, 0, ['#ffc04e', [.5, '#f0602a', 1], [1, '#a01c1a', 1]])}
    ${rad('hn', .3, .25, .9, IVORY)}
    ${rad('ey', .4, .35, .7, EYE_Y)}
    ${lightRig('lt', 15)}
    ${blur('g', .7)}
  </defs>
  ${outline(sil, O, 1.7)}
  ${pair(wing, 'fill="url(#mem)"')}
  ${pair('M-10.2,1.9 L-15,-2.6 M-10.2,1.9 L-12.9,-8.8 M-10.2,1.9 L-8.1,-11', `stroke="#7a1414" stroke-width=".75" fill="none" stroke-linecap="round"`)}
  ${pair('M-3.2,-1.4 Q-7,1.8 -10.2,1.9', `stroke="#b8261c" stroke-width="1.3" fill="none" stroke-linecap="round"`)}
  ${pair('M-9.8,1.4 L-11.3,3.9 L-9,2.5 Z', `fill="#fff0c8" stroke="${O}" stroke-width=".35"`)}
  ${P(tail, 'fill="url(#sk)"')}${P(spade, `fill="#c41e1a" stroke="${O}" stroke-width=".4"`)}
  ${P(body, 'fill="url(#sk)"')}
  ${P('M-2.4,-3.6 Q0,-2.6 2.4,-3.6 M-3,-0.6 Q0,0.6 3,-0.6 M-2.6,2.6 Q0,3.6 2.6,2.6', 'stroke="#8a1818" stroke-opacity=".55" stroke-width=".5" fill="none"')}
  ${P(spikes, 'fill="#ffb03a"')}
  ${pair(horn, 'fill="url(#hn)"')}${pair(frill, 'fill="#b8241c"')}
  ${P(head, 'fill="url(#sk)"')}
  ${P('M-1.4,5.6 Q0,4.9 1.4,5.6 L0.8,12.4 Q0,13 -0.8,12.4 Z', 'fill="#ffd0a0" opacity=".3"')}
  ${lit(sil, 'lt')}
  ${ell(-2.3, 9.4, 1.6, 1.1, 'fill="#ffb21a" opacity=".75" filter="url(#g)"')}${ell(2.3, 9.4, 1.6, 1.1, 'fill="#ffb21a" opacity=".75" filter="url(#g)"')}
  ${pair('M-3.5,8.4 L-1.1,9.6 L-1.6,10.4 L-3.3,9.9 Z', 'fill="url(#ey)"')}
  ${pair('M-3.9,7.8 L-0.9,9.4', `stroke="${O}" stroke-width=".75" stroke-linecap="round"`)}
  ${ell(-2.2, 9.6, .3, .55, `fill="${O}"`)}${ell(2.2, 9.6, .3, .55, `fill="${O}"`)}
  ${ell(-0.75, 14.2, .32, .45, `fill="${O}"`)}${ell(0.75, 14.2, .32, .45, `fill="${O}"`)}
  ${P('M-0.6,15.2 L-0.3,16.1 L0,15.3 Z', 'fill="#ff9a2a" opacity=".85"')}`);
}

// ───────── 爆裂蝠：火焰蝙蝠，肚子里一颗发光的熔岩炸弹（逻辑 34） ─────────
function diver(px) {
  const O = '#160404';
  const wing = 'M-4.6,0.4 Q-7.8,3.4 -10.6,3.6 L-17,-1.6 Q-14.4,-4.2 -15.2,-9.4 Q-12.2,-9.2 -9.8,-12.8 Q-7.8,-8.6 -3.8,-6.8 Z';
  const head = 'M0,4.6 C3,4.6 4.4,6.4 4.2,8.8 C4,11 2.4,12.6 0,13 C-2.4,12.6 -4,11 -4.2,8.8 C-4.4,6.4 -3,4.6 0,4.6 Z';
  const ear = 'M-1.6,6.2 L-6.8,4 L-4,9.4 Z';
  const flame = 'M-3.8,-6 C-5.2,-10 -2.6,-12.4 -2.4,-17 C-0.8,-13.6 0.6,-14.6 1.8,-17.6 C2.4,-13.2 5,-10.6 3.8,-6 Z';
  const sil = mir(wing) + circ(0, -1.2, 7.4) + P(head) + mir(ear);
  // 熔岩炸弹：发亮的内核 + 一圈裂开的岩壳（缝隙透光）
  // 不规则的焦黑岩壳碎片，碎片之间的裂缝透出白热熔岩
  const crust = 'M-5.7,-2.6 C-5.3,-5.4 -3.3,-6.9 -0.8,-7.1 L-0.5,-4.9 L-2.5,-3.7 L-3.3,-1.3 Z'
    + ' M0.5,-7.1 C3.3,-6.9 5.3,-5.1 5.8,-2.8 L3.5,-2.2 L1.6,-4.4 Z'
    + ' M5.9,-1.6 C5.7,1.6 3.9,3.8 1.5,4.6 L1.2,2.1 L3.4,-0.4 Z'
    + ' M0.3,4.7 C-2.7,4.6 -5.1,2.6 -5.8,-1 L-3.7,0.2 L-1.9,0.5 L-0.9,2.8 Z';
  return doc(px, 18, `<defs>
    ${rad('mem', -4, -2, 14.5, ['#24070a', [.5, '#5e1410', 1], [.82, '#d8401a', 1], [1, '#ffb24a', 1]], true)}
    ${rad('fur', .35, .3, .85, ['#8a3a30', [.5, '#4a1612', 1], [1, '#180505', 1]])}
    ${rad('core', .42, .38, .62, FIRE)}
    ${rad('rock', .35, .3, .9, ['#6a3020', [.6, '#2e0e08', 1], [1, '#120404', 1]])}
    ${lin('fl', 0, 1, 0, 0, [[0, '#fff3a0', 1], [.35, '#ffb02a', 1], [.75, '#ff4a12', .8], [1, '#ff2a0a', 0]])}
    ${rad('ey', .4, .35, .7, EYE_Y)}
    ${rad('halo', .5, .5, .5, [[0, '#ffd23a', .95], [.5, '#ff6a1a', .55], [1, '#ff3a0a', 0]])}
    ${lightRig('lt', 17, .9)}
    ${blur('g', .8)}${blur('g2', 1.8)}
  </defs>
  ${P(flame, 'fill="url(#fl)" filter="url(#g)"')}${P(flame, 'fill="url(#fl)" transform="scale(.6,.7)"')}
  ${outline(sil, O, 1.8)}
  ${pair(wing, 'fill="url(#mem)"')}
  ${pair('M-10.6,3.6 L-17,-1.6 M-10.6,3.6 L-15.2,-9.4 M-10.6,3.6 L-9.8,-12.8 M-10.6,3.6 L-5.6,-6.2', `stroke="${O}" stroke-width=".8" fill="none" stroke-linecap="round"`)}
  ${pair('M-4.6,0.4 Q-7.8,3.4 -10.6,3.6', `stroke="#3a1210" stroke-width="1.5" fill="none" stroke-linecap="round"`)}
  ${pair('M-17,-1.6 Q-14.4,-4.2 -15.2,-9.4 Q-12.2,-9.2 -9.8,-12.8 Q-7.8,-8.6 -3.8,-6.8', 'stroke="#ffb040" stroke-width=".6" fill="none" opacity=".9"')}
  ${pair('M-10.4,3 L-11.4,5.4 L-9.2,4 Z', `fill="#f4e0c0" stroke="${O}" stroke-width=".35"`)}
  ${circ(0, -1.2, 7.4, 'fill="url(#fur)"')}
  ${circ(0, -1.2, 10.5, 'fill="url(#halo)" opacity=".75"')}
  ${circ(0, -1.2, 6.1, `fill="${O}"`)}
  ${circ(0, -1.2, 5.9, 'fill="url(#core)"')}
  ${P(crust, `fill="url(#rock)" stroke="#ffb03a" stroke-width=".4" stroke-opacity=".9"`)}
  ${circ(0.2, -0.6, 1.8, 'fill="#fffbe0" filter="url(#g)"')}
  ${pair(ear, 'fill="url(#fur)"')}${pair('M-2.2,6.6 L-5.6,5 L-3.8,8.6 Z', 'fill="#ff6a3a" opacity=".55"')}
  ${P(head, 'fill="url(#fur)"')}
  ${lit(mir(wing) + P(head) + mir(ear), 'lt')}
  ${circ(-1.6, -3, 1.3, 'fill="#fff" opacity=".85" filter="url(#g)"')}
  ${pair('M-3.2,7.6 L-0.8,8.8', `stroke="${O}" stroke-width=".8" stroke-linecap="round"`)}
  ${ell(-1.8, 9.6, 1.5, 1.2, 'fill="#ff8a1a" filter="url(#g)"')}${ell(1.8, 9.6, 1.5, 1.2, 'fill="#ff8a1a" filter="url(#g)"')}
  ${ell(-1.75, 9.6, 1.0, .8, 'fill="url(#ey)"')}${ell(1.75, 9.6, 1.0, .8, 'fill="url(#ey)"')}
  ${pair('M-1.3,11.6 L-0.9,13.4 L-0.4,11.8 Z', `fill="#fff8ec" stroke="${O}" stroke-width=".25"`)}`);
}

// ───────── 龙人术士：披斗篷的龙人法师，骨杖 + 双手间的火球（逻辑 54） ─────────
function gunner(px) {
  const O = '#12061a';
  const cloak = 'M13,4 C16,0 18,-9 20.5,-20 L17,-17 L14.6,-23.2 L11.4,-20.4 L8,-25.6 L4.4,-21.2 L0.6,-24.2 L-2.6,-19.8 L-6.4,-25.6 L-9.4,-20.6 L-13,-23.6 L-15.8,-18 L-20.5,-21 C-18,-9 -16,0 -13,4 Q0,9 13,4 Z';
  const tail = '';
  const slvL = 'M-16.4,-0.4 C-18.4,4.6 -16.6,10 -14,13.2 L-8.4,11.4 C-9.2,7.4 -9.2,3.4 -9.8,0 Z';
  const slvR = 'M16.4,-0.4 C18,4.8 14.8,10.6 11.2,14 L6.8,10.8 C9,7.4 9.8,3.6 9.8,0 Z';
  const hood = 'M0,-3.8 C6.6,-3.8 9.8,1 9.4,6.2 C9,10.6 5.4,12.6 3.8,13.2 L-3.8,13.2 C-5.4,12.6 -9,10.6 -9.4,6.2 C-9.8,1 -6.6,-3.8 0,-3.8 Z';
  const horn = 'M-6.4,-1 C-11.4,-2.4 -14.2,-7.4 -13.4,-13.4 C-12.2,-9 -9.6,-6.4 -5,-4.6 Z';
  const snout = 'M-3.3,8.4 C-3.8,11.8 -2.8,14.8 -1.3,16.4 Q0,17.1 1.3,16.4 C2.8,14.8 3.8,11.8 3.3,8.4 Z';
  const staff = 'M-17.6,-14 L-10.4,20';
  const skull = 'M-10.6,18 C-8.2,18 -7,19.8 -7.4,22 C-7.6,23.6 -8.8,25 -10.4,25.2 C-12.2,25 -13.6,23.6 -13.8,22 C-14,19.8 -12.8,18 -10.6,18 Z';
  const prongs = 'M-13.4,20.4 C-16.6,20 -17.4,16.6 -15.4,14.4 C-15.2,16.6 -14.4,18 -12.6,18.8 Z M-7.8,20.2 C-5.4,18.2 -5.8,15 -7.8,13.6 C-7.6,15.8 -8.2,17.6 -9.2,18.6 Z';
  const handL = circ(-11.4, 13.6, 2.6);
  const handR = 'M6,12.2 C8.2,11.4 10.4,12.6 10.6,14.6 C10.6,16.4 9,17.6 7.2,17.4 C5.6,17.2 4.6,15.8 4.8,14.4 Z';
  const clawR = 'M5.6,15.6 L2.6,17.6 L5.4,17.4 Z M7,17.2 L5.4,20 L7.8,18.4 Z M4.8,13.6 L2,14.4 L4.8,15 Z';
  const sil = P(cloak) + P(slvL) + P(slvR) + P(hood) + mir(horn) + P(snout) + P(staff, 'stroke-width="5" fill="none"') + P(skull) + P(prongs) + handL + P(handR) + P(clawR);
  // 斗篷背上的火焰符印（非宗教纹样）：三段断开的符环 + 环上小火点 + 中央一簇火苗
  const arcSeg = (a0, a1, r = 6.2, cy = -12) => { const p = a => `${f2(r * Math.cos(a * Math.PI / 180))},${f2(cy + r * Math.sin(a * Math.PI / 180))}`; return `M${p(a0)} A${r},${r} 0 0 1 ${p(a1)}`; };
  const sigilRing = [arcSeg(-70, 20), arcSeg(50, 140), arcSeg(170, 260)].join(' ');
  const sigilFlame = 'M0,-18 C2.8,-15.4 4,-13 3.2,-10.4 C2.6,-8.4 1.2,-7.4 0,-7.2 C-1.2,-7.4 -2.6,-8.4 -3.2,-10.4 C-3.8,-12.4 -2.8,-13.8 -1.6,-15.2 C-1.4,-13.8 -0.8,-13 0,-12.6 C0.8,-14 0.8,-15.8 0,-18 Z'
    + ' ' + [35, 155, 275].map(a => { const x = f2(6.2 * Math.cos(a * Math.PI / 180)), y = f2(-12 + 6.2 * Math.sin(a * Math.PI / 180)); return `M${x - 1},${y} L${x},${f2(y - 1.4)} L${x + 1},${y} L${x},${f2(y + 1.4)} Z`; }).join(' ');
  const fx = -1.4, fy = 21.6;
  const tongues = Array.from({ length: 7 }, (_, i) => {
    const a = i * 360 / 7 + 10;
    return `<path transform="translate(${fx},${fy}) rotate(${a})" d="M-2.4,-3.6 C-2.6,-6.4 -0.6,-7.2 0.6,-9.6 C1.6,-7 2.8,-5.6 2.4,-3.6 Z"/>`;
  }).join('');
  return doc(px, 28, `<defs>
    ${lin('clk', 0, 0, .3, 1, ['#a24ad2', [.4, '#5e2186', 1], [1, '#22093a', 1]])}
    ${rad('slv', .35, .3, .9, ['#b65ae0', [.5, '#5a1e82', 1], [1, '#24093a', 1]])}
    ${rad('hd', .35, .3, .85, ['#b862e6', [.5, '#62248e', 1], [1, '#22093a', 1]])}
    ${rad('sc', .35, .3, .9, ['#b8f2b4', [.45, '#4eaa72', 1], [1, '#123a26', 1]])}
    ${rad('hn', .3, .25, .95, IVORY)}
    ${lin('bone', 0, 0, 1, 0, ['#8a7a5a', [.45, '#fff6e0', 1], [1, '#7a6646', 1]])}
    ${rad('fire', .42, .4, .6, FIRE)}
    ${rad('halo', .5, .5, .5, [[0, '#ffd23a', .95], [.45, '#ff7a1a', .6], [1, '#ff3a0a', 0]])}
    ${rad('ey', .4, .35, .7, EYE_Y)}
    ${rad('rune', .5, .5, .5, [[0, '#ffb04a', .9], [1, '#ff5a1a', 0]])}
    ${lin('gd', 0, 0, 0, 1, GOLD)}
    ${lightRig('lt', 26)}
    ${blur('g', 1)}${blur('g2', 2.4)}
  </defs>
  ${outline(sil, O, 2.2)}
  ${P(cloak, 'fill="url(#clk)"')}
  ${P('M-10,-1 L-12.6,-21 M-4,-3 L-3.4,-23 M4,-3 L4.8,-22.6 M10.2,-1 L13,-20.6', 'stroke="#14051f" stroke-opacity=".5" stroke-width="1" fill="none" stroke-linecap="round"')}
  ${P('M-7,-1.6 L-9,-19 M7.4,-1.4 L9,-18.6', 'stroke="#d79bff" stroke-opacity=".28" stroke-width=".9" fill="none" stroke-linecap="round"')}
  ${circ(0, -12, 8, 'fill="url(#rune)"')}
  ${glowStroke(sigilRing, '#ff8a2a', .55, 'g', .85)}
  ${glowPath(sigilFlame, '#ffb04a', 'g', .9)}
  ${P('M0,-14.6 C1,-13 1.2,-11.6 0.6,-10.4 C0.3,-9.8 -0.3,-9.8 -0.6,-10.4 C-1.1,-11.4 -0.6,-12.4 0,-14.6 Z', 'fill="#fff4c0"')}
  ${P(staff, `stroke="url(#bone)" stroke-width="2.4" fill="none" stroke-linecap="round"`)}
  ${[-0.2, .3, .62].map(t => { const x = -17.6 + 7.2 * t, y = -14 + 34 * t; return ell(f2(x), f2(y), 1.9, 1.2, `fill="#e8d8b4" stroke="${O}" stroke-width=".5" transform="rotate(12 ${f2(x)} ${f2(y)})"`); }).join('')}
  ${P(slvL, 'fill="url(#slv)"')}${P(slvR, 'fill="url(#slv)"')}
  ${P('M-14.4,12.4 L-8.6,10.8 L-8.2,12.4 L-13.8,14 Z', 'fill="url(#gd)"')}${P('M10.8,13.4 L7.2,10.6 L6.2,11.8 L9.8,14.8 Z', 'fill="url(#gd)"')}
  ${pair(horn, 'fill="url(#hn)"')}
  ${pair('M-8,-3 L-9,-4.8 M-10.6,-5.4 L-11.8,-6.6 M-12.4,-8.8 L-13.4,-9.4', `stroke="#6a5636" stroke-width=".6" fill="none"`)}
  ${P(hood, 'fill="url(#hd)"')}
  ${P('M0,-3.4 L0,5', 'stroke="#14051f" stroke-opacity=".45" stroke-width="1" fill="none"')}
  ${P('M-5,7.4 C-5,11 -3.6,13.4 0,13.8 C3.6,13.4 5,11 5,7.4 C3.2,6 -3.2,6 -5,7.4 Z', 'fill="#0c0412"')}
  ${P('M-5,7.4 C-3.2,6 3.2,6 5,7.4', 'stroke="url(#gd)" stroke-width="1" fill="none"')}
  ${P(snout, 'fill="url(#sc)"')}
  ${P('M-1.4,10.4 L-0.9,15.4 M1.4,10.4 L0.9,15.4', 'stroke="#123a26" stroke-opacity=".5" stroke-width=".5" fill="none"')}
  ${lit(P(cloak) + P(slvL) + P(slvR) + P(hood) + mir(horn) + P(snout), 'lt')}
  ${ell(-2.5, 9.3, 1.5, 1, 'fill="#ff8a1a" filter="url(#g)"')}${ell(2.5, 9.3, 1.5, 1, 'fill="#ff8a1a" filter="url(#g)"')}
  ${pair('M-3.4,9.6 L-1.4,8.8 L-1.6,9.8 Z', 'fill="url(#ey)"')}
  ${ell(-0.8, 15.6, .45, .35, 'fill="#ffb04a"')}${ell(0.8, 15.6, .45, .35, 'fill="#ffb04a"')}
  ${P(skull, 'fill="url(#hn)"')}${P(prongs, 'fill="url(#hn)"')}
  ${ell(-11.8, 21.6, .8, 1, `fill="${O}"`)}${ell(-9.2, 21.6, .8, 1, `fill="${O}"`)}
  ${circ(fx, fy, 11, 'fill="url(#halo)"')}
  <g fill="#ff7a1a" opacity=".75" filter="url(#g)">${tongues}</g>
  <g fill="#ffb02a">${tongues}</g>
  ${circ(fx, fy, 5.2, 'fill="url(#fire)"')}
  ${circ(fx - 1.4, fy - 1.6, 1.6, 'fill="#fff" opacity=".9" filter="url(#g)"')}
  ${handL.replace('/>', 'fill="url(#sc)"/>')}
  ${P('M-13.4,12.6 Q-11.4,11.2 -9.4,12.6', `stroke="${O}" stroke-width=".5" fill="none" opacity=".6"`)}
  ${P(handR, 'fill="url(#sc)"')}${P(clawR, 'fill="#fff4dc"')}
  ${[[-12, 26, .7], [6, 24, .6], [-4, 29, .5], [8, 19.6, .45]].map(([x, y, r]) => circ(x, y, r, 'fill="#ffd23a"')).join('')}`);
}

// ───────── 龙人督军：精英头目，重甲、双角、巨戟、破旧披风与战旗（逻辑 104） ─────────
function elite(px) {
  const O = '#0c0608';
  const cape = 'M-19,-6 C-25,-14 -29,-28 -32,-43 L-26.6,-39.6 L-24,-47.6 L-18.2,-41 L-12.4,-48.8 L-7.2,-41.6 L-2,-49.6 L3.2,-41.8 L8.2,-48.6 L13.4,-41 L18.6,-47.4 L23.4,-39.8 L28.8,-45.6 L32,-42.4 C29,-28 25,-14 19,-6 Z';
  const holes = 'M-16,-30 L-12.6,-33.6 L-11.4,-29.4 Z M9.8,-24 L13.6,-27.2 L13.4,-22.4 Z M-4,-38 L-1.6,-40.4 L-0.6,-37 Z';
  const banner = 'M24.2,-47 L41,-47 L41,-22 L36.6,-26.4 L33.4,-20.6 L30.2,-25.4 L25.6,-21.6 L24.2,-25 Z';
  const pole = 'M24.4,21 L27.2,-50.4';
  const shaft = 'M-19.4,-34 L-31.2,40.6';
  const blade = 'M-28.2,17.6 L-41.8,8.6 C-48.4,17.4 -49,31.4 -42.4,43.8 L-30.6,34.6 C-32.6,29.2 -32.4,23.2 -28.2,17.6 Z';
  const spear = 'M-29.6,40 L-32.8,40.4 L-32.6,50.2 Z';
  const butt = 'M-18.4,-33.2 L-20.6,-33.6 L-18.8,-41 Z';
  const pauld = 'M-11.4,-9.8 C-19.4,-14.6 -30,-11.4 -32.6,-2.2 C-34,5 -29,9.8 -22.6,9.4 C-18.6,4.6 -14.6,1.4 -11,0.4 Z';
  const spikeA = 'M-24,-11 L-30.4,-21.2 L-20.8,-12.6 Z';
  const spikeB = 'M-31.2,-5.4 L-41.4,-9.6 L-32.4,-0.6 Z';
  const spikeC = 'M-31.4,3.4 L-39.2,7.6 L-29.6,7.4 Z';
  const arm = 'M-23.4,4 C-27.6,6.6 -28.6,10.6 -27.6,14 L-22.4,14.6 C-21.6,11.4 -20,8.6 -17.8,6.6 Z';
  const gauntL = 'M-29.6,10.8 C-26.8,9 -22.6,9.6 -21.6,12.6 C-20.8,15.4 -22.6,18 -25.6,18.2 C-28.8,18.4 -31,15.6 -29.6,10.8 Z';
  const gorget = 'M-15.6,-5 C-13.4,-13.2 13.4,-13.2 15.6,-5 L12.4,6.2 L-12.4,6.2 Z';
  const horn = 'M-7,4.2 C-14.4,-0.4 -21.8,-4.6 -25.4,-15.6 C-26.4,-19.4 -25.4,-23.4 -22.8,-26.4 C-22.8,-18.6 -18.8,-11.8 -9.6,-3.2 C-8.4,-1.6 -7.4,1 -7,4.2 Z';
  const head = 'M0,3.4 C7.6,3.4 11,8 10.6,13.6 C10.2,18 8,21.4 6.2,24.6 C4.8,28.2 3,31.2 0,31.8 C-3,31.2 -4.8,28.2 -6.2,24.6 C-8,21.4 -10.2,18 -10.6,13.6 C-11,8 -7.6,3.4 0,3.4 Z';
  const helm = 'M0,2.4 C8.2,2.4 11.8,7.4 11.4,13 L8.4,19 L4.6,15.8 L0,21.4 L-4.6,15.8 L-8.4,19 L-11.4,13 C-11.8,7.4 -8.2,2.4 0,2.4 Z';
  const tusk = 'M-5.8,24 L-10.2,27.6 L-6.6,26.6 Z';
  const fistR = 'M20.6,10.8 C23.4,9 27.6,9.6 28.6,12.6 C29.4,15.4 27.6,18 24.6,18.2 C21.4,18.4 19.2,15.6 20.6,10.8 Z';
  const armR = 'M23.4,4 C27.6,6.6 28.6,10.6 27.6,13.4 L22.4,14 C21.6,11.4 20,8.6 17.8,6.6 Z';
  const sil = `<path d="${cape} ${holes}" fill-rule="evenodd"/>` + P(banner) + P(pole, 'stroke-width="5" fill="none"') + P(shaft, 'stroke-width="5.6" fill="none"') + P(blade) + P(spear) + P(butt)
    + mir(pauld) + mir(spikeA) + mir(spikeB) + mir(spikeC) + P(arm) + P(armR) + P(gauntL) + P(fistR) + P(gorget) + mir(horn) + P(head) + P(helm) + mir(tusk);
  const dorsal = [-9, -15, -21, -27, -33].map((y, i) => { const s = 3.2 - i * .45; return `M${-s},${y} L0,${f2(y - s * 2.4)} L${s},${y} Z`; }).join(' ');
  return doc(px, 52, `<defs>
    ${lin('cp', 0, 0, .25, 1, ['#c42a34', [.35, '#86121e', 1], [1, '#2a0408', 1]])}
    ${lin('bn', 0, 0, 0, 1, ['#3a0a10', [.5, '#5e0e18', 1], [1, '#24040a', 1]])}
    ${rad('ir', .32, .28, .9, ['#d8deea', [.35, '#7c8296', 1], [.75, '#343846', 1], [1, '#0e1016', 1]])}
    ${rad('sc', .35, .3, .9, ['#ff9a6a', [.45, '#c42a1c', 1], [1, '#3a0606', 1]])}
    ${rad('hn', .3, .25, 1, ['#fffaf0', [.4, '#e0cca6', 1], [.8, '#6a5434', 1], [1, '#2a1a10', 1]])}
    ${lin('st', 0, 0, 1, 0, ['#2a2018', [.5, '#7a5a3a', 1], [1, '#1e140c', 1]])}
    ${lin('bl', 0, 0, 1, 0, ['#f4f6fb', [.3, '#b4bccc', 1], [.7, '#5a6276', 1], [1, '#2a2e3a', 1]])}
    ${lin('gd', 0, 0, 0, 1, GOLD)}
    ${rad('ey', .4, .35, .7, EYE_Y)}
    ${rad('em', .5, .5, .5, [[0, '#ffd23a', .9], [1, '#ff6a1a', 0]])}
    ${lightRig('lt', 50)}
    ${blur('g', 1.2)}${blur('g2', 2.6)}
  </defs>
  ${outline(sil, O, 2.6)}
  ${P(`${cape} ${holes}`, 'fill="url(#cp)" fill-rule="evenodd"')}
  ${P('M-14,-8 L-21,-40 M-6,-10 L-7.2,-41 M6,-10 L8.2,-41 M14,-8 L22,-39', 'stroke="#200206" stroke-opacity=".55" stroke-width="1.6" fill="none" stroke-linecap="round"')}
  ${P('M-10,-10 L-15,-40 M10,-10 L15.6,-40', 'stroke="#ff6a6a" stroke-opacity=".22" stroke-width="1.4" fill="none" stroke-linecap="round"')}
  ${P('M-32,-43 L-26.6,-39.6 L-24,-47.6 L-18.2,-41 L-12.4,-48.8 L-7.2,-41.6 L-2,-49.6 L3.2,-41.8 L8.2,-48.6 L13.4,-41 L18.6,-47.4 L23.4,-39.8 L28.8,-45.6 L32,-42.4', 'stroke="#ffd24a" stroke-opacity=".55" stroke-width="1" fill="none" stroke-linejoin="round"')}
  ${P(dorsal, `fill="url(#hn)" stroke="${O}" stroke-width=".8"`)}
  ${P(pole, 'stroke="url(#st)" stroke-width="2.6" fill="none"')}
  ${P(banner, 'fill="url(#bn)"')}
  ${P('M24.2,-47 L41,-47 L41,-44.6 L24.2,-44.6 Z', 'fill="url(#gd)"')}
  ${P('M32.6,-41.6 C36.6,-41.6 38.4,-38.4 37.6,-35 L35.8,-31.4 L34.2,-33.4 L32.6,-30.2 L31,-33.4 L29.4,-31.4 L27.6,-35 C26.8,-38.4 28.6,-41.6 32.6,-41.6 Z M28.6,-39.4 C27.2,-41.6 27.4,-43.6 28.2,-44.4 C28.6,-43 29.4,-42 30.4,-41.4 Z M36.6,-39.4 C38,-41.6 37.8,-43.6 37,-44.4 C36.6,-43 35.8,-42 34.8,-41.4 Z', 'fill="url(#gd)"')}
  ${ell(30.8, -37, 1.2, 1, 'fill="#3a0a10"')}${ell(34.4, -37, 1.2, 1, 'fill="#3a0a10"')}
  ${circ(27.2, -50.4, 2, `fill="url(#gd)" stroke="${O}" stroke-width=".8"`)}
  ${P(shaft, 'stroke="url(#st)" stroke-width="3" fill="none" stroke-linecap="round"')}
  ${[-14, 2, 30].map(t => { const y = t, x = -19.4 + (-11.8) * ((y + 34) / 74.6); return `<rect x="${f2(x - 2.2)}" y="${f2(y - 1.2)}" width="4.4" height="2.4" rx=".6" fill="url(#gd)" stroke="${O}" stroke-width=".6" transform="rotate(9 ${f2(x)} ${f2(y)})"/>`; }).join('')}
  ${P(butt, 'fill="url(#bl)"')}${P(spear, 'fill="url(#bl)"')}
  ${P(blade, 'fill="url(#bl)"')}
  ${glowStroke('M-41.8,8.6 C-48.4,17.4 -49,31.4 -42.4,43.8', '#ff6a1a', 1, 'g', .9)}
  ${P('M-41.8,8.6 C-48.4,17.4 -49,31.4 -42.4,43.8', 'stroke="#fff2c0" stroke-width=".5" fill="none"')}
  ${P('M-31.6,22 C-35,24 -35.4,30 -32.6,32.4', 'stroke="#2a2e3a" stroke-width="1" fill="none"')}
  ${glowStroke('M-38.4,20 L-36,23.6 L-39,26.2 M-38.6,30 L-36.4,33.4', '#ff7a2a', .6, 'g', .8)}
  ${pair(pauld, 'fill="url(#ir)"')}
  ${pair('M-14.4,-8.6 C-21,-11.8 -28.6,-9 -30.8,-2.4', 'stroke="url(#gd)" stroke-width="1.6" fill="none" stroke-linecap="round"')}
  ${pair('M-15,-1 C-20,-4.6 -26,-3.4 -29.4,1.6 M-17.4,4.6 C-21,2.2 -25,2.8 -27.6,6.4', `stroke="${O}" stroke-opacity=".7" stroke-width=".9" fill="none"`)}
  ${pair(spikeA + ' ' + spikeB + ' ' + spikeC, `fill="url(#hn)"`)}
  ${[[-20.8, -6], [-26.4, -4.4], [20.8, -6], [26.4, -4.4]].map(([x, y]) => circ(x, y, .9, 'fill="#ff7a2a"')).join('')}
  ${P(arm, 'fill="url(#sc)"')}${P(armR, 'fill="url(#sc)"')}
  ${P(gorget, 'fill="url(#ir)"')}
  ${P('M-15.6,-5 C-13.4,-13.2 13.4,-13.2 15.6,-5', 'stroke="url(#gd)" stroke-width="1.6" fill="none"')}
  ${P('M-9,-6 L-9,4 M9,-6 L9,4 M-12.4,0 L12.4,0', `stroke="${O}" stroke-opacity=".5" stroke-width=".8" fill="none"`)}
  ${pair(horn, 'fill="url(#hn)"')}
  ${pair('M-10.4,-1.6 L-12.8,0.4 M-14.4,-4.6 L-16.2,-2.2 M-18,-8.4 L-20,-6.6 M-21,-13.4 L-23.2,-12.2', 'stroke="#5a4428" stroke-width=".8" fill="none" stroke-linecap="round"')}
  ${P(head, 'fill="url(#sc)"')}
  ${pair(tusk, 'fill="url(#hn)"')}
  ${P(helm, 'fill="url(#ir)"')}
  ${P('M0,2.6 L0,20.4', 'stroke="url(#gd)" stroke-width="2.2" fill="none"')}
  ${P('M-11.4,13 L-8.4,19 L-4.6,15.8 L0,21.4 L4.6,15.8 L8.4,19 L11.4,13', 'stroke="url(#gd)" stroke-width="1.1" fill="none" stroke-linejoin="round"')}
  ${lit(`<path d="${cape} ${holes}" fill-rule="evenodd"/>` + mir(pauld) + P(gorget) + mir(horn) + P(head) + P(helm) + P(banner) + P(blade), 'lt')}
  ${pair('M-7.6,19.6 L-3.2,22.4 L-6.6,22.6 Z', 'fill="#ff8a1a" filter="url(#g)"')}
  ${pair('M-7.6,19.6 L-3.2,22.4 L-6.6,22.6 Z', 'fill="url(#ey)"')}
  ${ell(-2.2, 29, .8, .6, 'fill="#ff8a1a"')}${ell(2.2, 29, .8, .6, 'fill="#ff8a1a"')}
  ${P(gauntL, 'fill="url(#ir)"')}${P('M-29,12.4 L-22.2,12.4 M-29.4,15 L-22.4,15', `stroke="${O}" stroke-width=".7" fill="none"`)}
  ${P(fistR, 'fill="url(#ir)"')}${P('M21.2,12.4 L28.6,12.4 M21,15 L28.4,15', `stroke="${O}" stroke-width=".7" fill="none"`)}
  ${[[-30.4, 11.6], [29.4, 11.6]].map(([x, y]) => P(`M${x},${y} l${Math.sign(x) * 3},-1.6 l-${Math.sign(x) * 1.2},2.8 Z`, `fill="url(#hn)" stroke="${O}" stroke-width=".5"`)).join('')}`);
}

// ───────── 骷髅兵：冥骨巫龙墓碑里爬出的骷髅，破盾 + 锈短剑（逻辑 30） ─────────
function skeleton(px) {
  const O = '#120e0a';
  const skull = 'M0,-1.4 C4.1,-1.4 6.5,1.6 6.5,5 C6.5,7.6 5.3,9.4 4.1,10.2 L4,11.6 C3,12.9 -3,12.9 -4,11.6 L-4.1,10.2 C-5.3,9.4 -6.5,7.6 -6.5,5 C-6.5,1.6 -4.1,-1.4 0,-1.4 Z';
  const shield = 'M10.2,2.4 A5.2,5.2 0 0 1 15.2,6.2 L12.6,7.8 L14.4,9.8 L13.3,11.6 A5.2,5.2 0 0 1 5,7.6 A5.2,5.2 0 0 1 10.2,2.4 Z';
  const blade = 'M-9.4,9.6 L-7.4,9.6 L-7.9,13.4 L-8.6,15.2 L-9.2,13.6 L-9.7,12.8 Z';
  const bones = 'M-1.6,-9.4 L-4.6,-14.2 M1.6,-9.4 L4.4,-14.4 M0,-9 L0,0 M-6.8,0.4 Q0,-1.6 6.8,0.4 M-6.8,0.4 L-9.6,4.4 L-8.6,8.6 M6.8,0.4 L9.2,3.4';
  const ribs = [[-7.6, 3.8], [-5.6, 5.2], [-3.6, 5.9], [-1.8, 6.2]].map(([y, w]) => `M-0.6,${y} C${f2(-w * .5)},${f2(y - 1.4)} ${f2(-w)},${f2(y - .6)} ${f2(-w)},${f2(y + 1.6)}`).join(' ');
  const pelvis = 'M-3.4,-10.2 C-3.6,-11.9 -1.4,-12.5 0,-11.3 C1.4,-12.5 3.6,-11.9 3.4,-10.2 C2.6,-8.7 -2.6,-8.7 -3.4,-10.2 Z';
  const sil = P(bones, 'stroke-width="3" fill="none"') + `<g stroke-width="2.6" fill="none">${mir(ribs)}</g>` + P(pelvis) + P(shield) + P(blade) + P('M-11.2,9.2 L-6,9.2', 'stroke-width="2.8" fill="none"') + P(skull)
    + circ(-4.6, -14.2, 1) + circ(4.4, -14.4, 1);
  return doc(px, 16, `<defs>
    ${rad('bn', .35, .3, .85, ['#fffdf4', [.5, '#e6dcc2', 1], [1, '#8a7c5e', 1]])}
    ${lin('bs', 0, 0, 1, 1, ['#fffaee', '#c8bc9c'])}
    ${lin('rs', 0, 0, 1, 1, ['#d8c8b0', [.4, '#a87a52', 1], [1, '#5a2e14', 1]])}
    ${rad('wd', .35, .3, .9, ['#8a6440', [.6, '#4e3420', 1], [1, '#24160c', 1]])}
    ${rad('gf', .5, .5, .5, ['#f4fff6', [.35, '#7dffaa', 1], [1, '#1aff6a', 0]])}
    ${lightRig('lt', 15)}
    ${blur('g', .6)}${blur('g2', 1.2)}
  </defs>
  ${outline(sil, O, 1.5)}
  ${P(bones, 'stroke="#e8dec6" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"')}
  ${circ(-4.6, -14.2, .9, 'fill="#e8dec6"')}${circ(4.4, -14.4, .9, 'fill="#e8dec6"')}
  ${pair(ribs, 'stroke="#efe6d0" stroke-width="1.15" fill="none" stroke-linecap="round"')}
  ${[-8, -6, -4, -2].map(y => `<rect x="-.9" y="${y - .55}" width="1.8" height="1.1" rx=".4" fill="#fffaf0" stroke="${O}" stroke-width=".3"/>`).join('')}
  ${P(pelvis, 'fill="url(#bn)"')}
  ${P(shield, 'fill="url(#wd)"')}
  ${P('M7.2,4.4 L12.6,10.8 M10.2,2.6 L10.2,7.6', 'stroke="#1e120a" stroke-width=".5" fill="none"')}
  ${P('M10.2,2.4 A5.2,5.2 0 0 1 15.2,6.2 M13.3,11.6 A5.2,5.2 0 0 1 5,7.6 A5.2,5.2 0 0 1 10.2,2.4', 'stroke="#8a5a34" stroke-width="1" fill="none"')}
  ${circ(10.2, 7.4, 1.4, 'fill="url(#rs)" stroke="#1e120a" stroke-width=".35"')}
  ${P('M9.2,3.4 L8.6,6.6', 'stroke="#efe6d0" stroke-width="1.2" stroke-linecap="round"')}
  ${P(blade, 'fill="url(#rs)"')}
  ${P('M-8.6,10 L-8.5,13.6', 'stroke="#fff" stroke-opacity=".5" stroke-width=".35"')}
  ${ell(-9, 12.2, .7, .5, 'fill="#7a3a14"')}
  ${P('M-11.2,9.2 L-6,9.2', 'stroke="#6a4a2a" stroke-width="1.4" stroke-linecap="round"')}
  ${circ(-8.6, 8.4, 1, 'fill="#efe6d0"')}
  ${P(skull, 'fill="url(#bn)"')}
  ${P('M-2.8,-0.6 L-1.8,1.6 L-2.4,2.8', 'stroke="#5a4c34" stroke-width=".4" fill="none"')}
  ${P('M-4.1,10.2 C-2,10.9 2,10.9 4.1,10.2', 'stroke="#5a4c34" stroke-width=".4" fill="none"')}
  ${P('M-2.6,10.6 L-2.6,12.2 M-1.3,10.8 L-1.3,12.5 M0,10.85 L0,12.6 M1.3,10.8 L1.3,12.5 M2.6,10.6 L2.6,12.2', `stroke="${O}" stroke-width=".35" fill="none"`)}
  ${lit(P(skull) + P(shield) + P(pelvis), 'lt')}
  ${ell(-2.5, 6.3, 1.85, 2.05, 'fill="#08140c"')}${ell(2.5, 6.3, 1.85, 2.05, 'fill="#08140c"')}
  ${P('M0,7.8 L-1,9.6 L1,9.6 Z', 'fill="#08140c"')}
  ${circ(-2.5, 6.3, 2.6, 'fill="url(#gf)" opacity=".75" filter="url(#g)"')}${circ(2.5, 6.3, 2.6, 'fill="url(#gf)" opacity=".75" filter="url(#g)"')}
  ${circ(-2.5, 6.5, .75, 'fill="#eaffef"')}${circ(2.5, 6.5, .75, 'fill="#eaffef"')}
  ${pair('M-2.5,5.4 C-3.6,3.6 -2,2.4 -3,0.2 C-1.4,1.8 -1.2,3.6 -1.8,5.2 Z', 'fill="#5dff9a" opacity=".55" filter="url(#g)"')}`);
}

export function minionSvg(kind, px) {
  switch (kind) {
    case 'diver': return diver(px);
    case 'gunner': return gunner(px);
    case 'elite': return elite(px);
    case 'skeleton': return skeleton(px);
    default: return swarm(px);
  }
}

// ───────── 宝箱怪：张开的宝箱，獠牙、舌头、箱内发光眼、金币洒出（逻辑 110） ─────────
export function mimicSvg(px) {
  const O = '#140804';
  const box = 'M-46,6 L46,6 L43,46.6 Q43,50 39.6,50 L-39.6,50 Q-43,50 -43,46.6 Z';
  const lid = 'M-47.4,-21 L47.4,-21 L44.6,-43 C36,-57.6 -36,-57.6 -44.6,-43 Z';
  const mouth = 'M-45.4,-22 L45.4,-22 C46.6,-10 46.6,-1 45.6,8 L-45.6,8 C-46.6,-1 -46.6,-10 -45.4,-22 Z';
  const tongue = 'M6,2 C14,-2 24,-1 27,4 C29,9 28.4,20 26,30 C24.8,35.6 20.4,37.4 17.4,34.4 C15.4,32 15.8,24 14.4,16 C13.4,10.6 9,8.6 6,6 Z';
  const sil = P(box) + P(lid) + P(mouth) + P(tongue);
  const upper = [-38, -28.5, -19, -9.5, 0, 9.5, 19, 28.5, 38].map((x, i) => { const big = i === 1 || i === 7, h = big ? 13 : (i % 2 ? 8.4 : 9.6), w = big ? 4.6 : 3.8; return `M${x - w},-18 Q${x - w * .3},${-18 + h * .55} ${x},${-18 + h} Q${x + w * .3},${-18 + h * .55} ${x + w},-18 Z`; }).join(' ');
  const lower = [-33, -22, -11, 0, 33].map((x, i) => { const big = i === 0 || i === 4, h = big ? 10 : 6.6, w = big ? 4.2 : 3.4; return `M${x - w},7 Q${x - w * .3},${7 - h * .55} ${x},${7 - h} Q${x + w * .3},${7 - h * .55} ${x + w},7 Z`; }).join(' ');
  const coin = (x, y, r, sq = .55, rot = 0) => `<g transform="translate(${x},${y}) rotate(${rot})"><ellipse rx="${r}" ry="${f2(r * sq)}" fill="#8a5600" stroke="${O}" stroke-width=".9"/><ellipse cy="${f2(-r * sq * .18)}" rx="${f2(r * .92)}" ry="${f2(r * sq * .85)}" fill="url(#gc)"/><ellipse cy="${f2(-r * sq * .18)}" rx="${f2(r * .58)}" ry="${f2(r * sq * .52)}" fill="none" stroke="#c88a10" stroke-width=".7"/><ellipse cx="${f2(-r * .35)}" cy="${f2(-r * sq * .45)}" rx="${f2(r * .28)}" ry="${f2(r * sq * .2)}" fill="#fff" opacity=".85"/></g>`;
  const pile = [[-30, 3, 5], [-21, 4.4, 5.4], [-11, 3.6, 5], [-25.6, -0.6, 4.6], [-16, -0.4, 4.8], [20, 4, 4.6], [30, 3.8, 5], [-34, -1, 4]].map(([x, y, r]) => coin(x, y, r)).join('');
  const spill = [[-40.4, 13, 4.6, .9, -60], [-47.6, 24, 4.4, .95, 30], [-44, 37, 4.8, .5, 10], [-52, 48, 4.6, .55, -8], [-42, 52.6, 5, .5, 4], [-31.6, 54, 4.6, .5, 0], [-20, 55.4, 4.4, .5, -4], [-34, 48, 4, .5, 12], [34, 53.8, 4.6, .5, 0], [45, 51.6, 4.8, .5, -6], [51.6, 40, 4.2, .9, 50], [22, 33.2, 3.6, .9, 15]].map(a => coin(...a)).join('');
  const sparkle = (x, y, r) => `<path d="M${x},${y - r} Q${x},${y} ${x + r},${y} Q${x},${y} ${x},${y + r} Q${x},${y} ${x - r},${y} Q${x},${y} ${x},${y - r} Z" fill="#fff"/>`;
  return doc(px, 60, `<defs>
    ${lin('wd', 0, 0, 0, 1, ['#c87a44', [.5, '#8a4a22', 1], [1, '#3e1c0a', 1]])}
    ${lin('wl', 0, 0, 0, 1, ['#6e3816', [.6, '#a85e2e', 1], [1, '#d08a50', 1]])}
    ${lin('ir', 0, 0, 1, 0, ['#2a2e38', [.35, '#8a92a6', 1], [.6, '#5a6274', 1], [1, '#1e2028', 1]])}
    ${lin('gd', 0, 0, 0, 1, GOLD)}
    ${lin('gh', 0, 0, 1, 0, ['#9a6400', [.35, '#ffe68a', 1], [.65, '#ffc83a', 1], [1, '#8a5600', 1]])}
    ${rad('gc', .35, .3, .9, ['#fffbe0', [.4, '#ffd94a', 1], [1, '#d08a10', 1]])}
    ${rad('mo', .5, .62, .7, ['#7a1022', [.5, '#3a0412', 1], [1, '#0a0004', 1]])}
    ${lin('gum', 0, 0, 0, 1, ['#5a0a1c', '#c8304a'])}
    ${lin('tooth', 0, 0, 0, 1, ['#fffdf2', [.7, '#efe2c4', 1], [1, '#bfa880', 1]])}
    ${lin('tg', 0, 0, 1, 1, ['#ff9ab0', [.45, '#e8406a', 1], [1, '#7a0a2a', 1]])}
    ${rad('ey', .42, .4, .65, ['#ffffff', [.3, '#fffbb0', 1], [.7, '#ffd23a', 1], [1, '#ff8a00', 1]])}
    ${rad('eh', .5, .5, .5, [[0, '#ffe14d', .9], [1, '#ff9a1a', 0]])}
    ${rad('rb', .35, .3, .8, ['#ffd0d4', [.4, '#ff3b4e', 1], [1, '#5a0010', 1]])}
    ${rad('halo', .5, .5, .5, [[0, '#ffcc4d', .55], [1, '#ffcc4d', 0]])}
    ${lightRig('lt', 58, .9)}
    ${blur('g', 1.4)}${blur('g2', 3)}
  </defs>
  ${ell(0, 8, 62, 52, 'fill="url(#halo)"')}
  ${outline(sil, O, 3)}
  ${P(box, 'fill="url(#wd)"')}
  ${P('M-44.6,21 L44.6,21 M-43.6,35.6 L43.6,35.6', `stroke="${O}" stroke-width="1.6" fill="none"`)}
  ${P('M-40,14 C-30,12.6 -24,15.6 -14,14 M10,15.6 C18,13.6 28,16 38,14 M-38,28 C-28,26.4 -20,29.6 -6,28 M24,29 C30,27.6 36,29.6 41,28.4 M-36,42.4 C-26,41 -14,44 -2,42.4 M14,43 C24,41.6 32,44 40,42.4', 'stroke="#3e1c0a" stroke-opacity=".55" stroke-width=".9" fill="none"')}
  ${P('M-44.6,20 L44.6,20 M-43.6,34.6 L43.6,34.6', 'stroke="#e8a060" stroke-opacity=".35" stroke-width=".8" fill="none"')}
  ${pair('M-36,6.6 L-28,6.6 L-28.6,49.4 L-35.2,49.4 Z', `fill="url(#ir)" stroke="${O}" stroke-width="1"`)}
  ${[-31.8, 31.8].map(x => [16, 28, 42].map(y => circ(x, y, 1.2, `fill="#c8d0de" stroke="${O}" stroke-width=".5"`)).join('')).join('')}
  ${pair('M-46,6 L-37,6 L-37.6,12 L-44.8,13 L-44.2,22 L-38.6,22.6 Z', `fill="url(#gd)" stroke="${O}" stroke-width="1"`)}
  ${pair('M-43.4,34 L-37.6,34.6 L-38.4,44 L-30.8,44.6 L-30.6,50 L-39.6,50 Q-43,50 -43,46.6 Z', `fill="url(#gd)" stroke="${O}" stroke-width="1"`)}
  ${P('M-46,6 L46,6 L45.6,11.4 L-45.6,11.4 Z', `fill="url(#gd)" stroke="${O}" stroke-width="1"`)}
  ${P('M-8,14.6 L8,14.6 L8,26.6 Q0,31 -8,26.6 Z', `fill="url(#gd)" stroke="${O}" stroke-width="1.2"`)}
  ${circ(0, 19.4, 2.2, `fill="${O}"`)}${P('M-1.1,19.6 L1.1,19.6 L1.6,25 L-1.6,25 Z', `fill="${O}"`)}
  ${P(lid, 'fill="url(#wd)"')}
  ${P('M-16,-21 L-15.2,-54.6 M16,-21 L15.2,-54.6 M0,-21 L0,-56.2', `stroke="${O}" stroke-width="1.4" fill="none"`)}
  ${P('M-26,-26 C-27,-34 -25,-42 -26.6,-50 M-6,-24 C-7,-34 -5.6,-42 -7,-52 M8,-26 C7.2,-36 9,-44 7.6,-52 M26,-28 C25,-36 27,-44 25.6,-50', 'stroke="#3e1c0a" stroke-opacity=".5" stroke-width=".9" fill="none"')}
  ${pair('M-36,-21 L-28,-21 L-28.6,-52 L-35.4,-50.4 Z', `fill="url(#ir)" stroke="${O}" stroke-width="1"`)}
  ${P('M-44.6,-43 C-36,-57.6 36,-57.6 44.6,-43 L42.8,-38.6 C34.6,-51.6 -34.6,-51.6 -42.8,-38.6 Z', `fill="url(#gd)" stroke="${O}" stroke-width="1"`)}
  ${P('M-47.4,-21 L47.4,-21 L47,-26.4 L-47,-26.4 Z', `fill="url(#gd)" stroke="${O}" stroke-width="1"`)}
  ${pair('M-47,-26.4 L-44.6,-43 L-40.6,-41.6 L-42.4,-26.4 Z', `fill="url(#gd)" stroke="${O}" stroke-width="1"`)}
  ${P('M0,-50 C6,-50 9.6,-45.6 9,-40.4 C8.4,-35.6 4,-32.6 0,-30.6 C-4,-32.6 -8.4,-35.6 -9,-40.4 C-9.6,-45.6 -6,-50 0,-50 Z', `fill="url(#gd)" stroke="${O}" stroke-width="1.2"`)}
  ${P('M0,-46.4 L4.6,-41 L0,-34.4 L-4.6,-41 Z', `fill="url(#rb)" stroke="${O}" stroke-width=".8"`)}
  ${P('M-1.6,-43.6 L0,-45.2 L1,-43.4', 'stroke="#fff" stroke-width=".9" fill="none" opacity=".9"')}
  ${P(mouth, 'fill="url(#mo)"')}
  ${P('M-45.4,-22 L45.4,-22 L45.2,-17.6 L-45.2,-17.6 Z', 'fill="url(#gum)"')}
  ${circ(-14, -5, 9.6, 'fill="url(#eh)"')}${circ(14, -5, 9.6, 'fill="url(#eh)"')}
  ${ell(-14, -5, 6, 5.4, 'fill="url(#ey)"')}${ell(14, -5, 6, 5.4, 'fill="url(#ey)"')}
  ${ell(-13, -4.2, 2.2, 3.6, `fill="${O}"`)}${ell(13, -4.2, 2.2, 3.6, `fill="${O}"`)}
  ${circ(-15.6, -7.2, 1.5, 'fill="#fff"')}${circ(12.4, -7.2, 1.5, 'fill="#fff"')}
  ${pair('M-21.6,-11.6 L-6.4,-6.6 L-7.2,-10.8 Z', 'fill="#24040e"')}
  ${pile}
  ${P(upper, `fill="url(#tooth)" stroke="${O}" stroke-width=".9" stroke-linejoin="round"`)}
  ${P(lower, `fill="url(#tooth)" stroke="${O}" stroke-width=".9" stroke-linejoin="round"`)}
  ${P(tongue, 'fill="url(#tg)"')}
  ${P('M12,8 C17,12 20,20 21.4,32', 'stroke="#8a1030" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".7"')}
  ${P('M10.6,5 C16,2.4 22,3 25,6', 'stroke="#ffd0dc" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".7"')}
  ${lit(P(box) + P(lid), 'lt')}
  ${spill}
  ${coin(21.6, 26.4, 3.8, .95, 20)}
  ${P('M24,36 C24,38.6 25.6,40.6 25,42.6 C24.4,44 22.6,43.6 22.6,42 C22.6,40.4 23.6,38.6 24,36 Z', 'fill="#ffd0e0" opacity=".85"')}
  ${sparkle(-46, 14, 3.2)}${sparkle(-24, -1, 2.4)}${sparkle(48, 44, 2.8)}${sparkle(-38, 50, 2.4)}${sparkle(30, 0, 2)}${sparkle(-30, -46, 2.6)}`);
}
