// 屠龙战纪 · 英雄矢量美术（法师 / 骑士 / 牧师 / 游侠 + 灵鹰 / 狮鹫骑士 / 矮人佣兵）
// 统一「背后偏上 3/4 视角、面朝屏幕上方」，原点 = 精灵中心；光从左上方来。
// 结构沿用 ships.js：palette(cls, skin) 换皮 → defs() 渐变 → 每个角色返回 {sil, body} → finish() 统一深色外轮廓 + 皮肤特效。
// 观众头像徽章（直径 14 逻辑 px，中心在精灵中心下方 4 逻辑 px）落在披风背部的平整区域，那里画了职业家徽，被头像盖住时就像披风上的徽章。

const K = 1.4;            // 英雄 viewBox：每逻辑像素 1.4 个单位
const BY = 4 * K;         // 头像徽章中心 y（5.6）

// ───────── 调色板 ─────────
const CLS = {
  dps:     { cloth: ['#ff8c66', '#c8263a', '#3a0518'], cloth2: ['#8e1f3c', '#4e0a24', '#1c030c'], glow: '#ff8a2a', hi: '#ffe08a', deep: '#ff3d12' },
  tank:    { cloth: ['#80baff', '#2d62d8', '#0a1a4c'], cloth2: ['#2c4c9e', '#152c6a', '#070f2c'], glow: '#5ff0ff', hi: '#e8fdff', deep: '#18a6dc' },
  healer:  { cloth: ['#fffdf2', '#efdcae', '#9a7a3e'], cloth2: ['#a6ffca', '#2fbf70', '#0a4426'], glow: '#5dff9e', hi: '#fff4c2', deep: '#ffc93a' },
  carrier: { cloth: ['#cc9eff', '#6c36d0', '#1e0a4a'], cloth2: ['#5c3ca4', '#2c1666', '#0e0526'], glow: '#c58bff', hi: '#f4e8ff', deep: '#8a4dff' },
};
const BASE = {
  metal: ['#ffffff', '#d2dbea', '#7d8aa4', '#283044'],
  gold: ['#fff7cc', '#ffcf4f', '#b07000', '#3e2400'],
  leather: ['#c08a58', '#704222', '#2c1608'],
  line: '#120a14',
};
// 皮肤：0 标准 1 白银 2 翡翠 3 暗金 4 虹光 5 深渊（换披风/长袍主色、金属件、发光；职业武器光色不变，保证认得出职业）
const SKIN = [
  {},
  { cloth: ['#ffffff', '#e6edf8', '#8e9bb8'], cloth2: ['#f2f6fc', '#b2c0da', '#525e7c'], metal: ['#ffffff', '#f2f6fc', '#aab6cc', '#46506a'], gold: ['#ffffff', '#eef2f8', '#a2aec6', '#3c4660'], trim: '#e6f4ff', sparkle: true, line: '#141a2c' },
  { clothStops: ['#a8ffe4', '#3fe0c0', '#27a6e6', '#6a6cff'], cloth: ['#a6ffe2', '#22b29c', '#06303a'], cloth2: ['#62e6c6', '#147a72', '#05282a'], metal: ['#f2fffc', '#a8ecdc', '#47948a', '#0f3632'], gold: ['#effff8', '#7dffcf', '#1c8c6a', '#06301f'], trim: '#8dffe0', line: '#031c1a' },
  { cloth: ['#5e5a66', '#24222a', '#09090b'], cloth2: ['#423e48', '#19181d', '#060607'], metal: ['#80808c', '#3e3e48', '#1c1c22', '#060608'], trim: '#ffd86b', goldEdge: true, line: '#000000' },
  { clothStops: ['#ff5f6d', '#ffc371', '#5fffb0', '#5fb8ff', '#c57bff'], cloth: ['#ffd0e0', '#b48cff', '#3a1f6a'], cloth2: ['#f6efff', '#cbb6f2', '#584684'], metal: ['#ffffff', '#f2eaff', '#b2a2da', '#463674'], gold: ['#fffbe0', '#ffd86b', '#c27ad8', '#48205e'], trim: '#ffffff', line: '#160a24', prism: true },
  { cloth: ['#9676d8', '#3e2474', '#0e0420'], cloth2: ['#5e3ea0', '#28104e', '#090216'], metal: ['#c8b2f4', '#6c4caa', '#2c1858', '#0a0320'], gold: ['#f6e6ff', '#cc96ff', '#6c2cb2', '#22063c'], trim: '#c890ff', aura: '#b066ff', line: '#07020e' },
];
function palette(cls, skin) {
  const s = SKIN[skin | 0] || SKIN[0];
  return { ...BASE, ...CLS[cls], ...s };
}

const st = arr => arr.map((c, i) => `<stop offset="${(i / (arr.length - 1)).toFixed(3)}" stop-color="${c}"/>`).join('');
function defs(p, H) {
  const diag = `x1="${-H * .5}" y1="${-H * .62}" x2="${H * .45}" y2="${H * .8}" gradientUnits="userSpaceOnUse"`;
  const cl = p.clothStops
    ? `<linearGradient id="cl" x1="${-H * .5}" y1="${-H * .3}" x2="${H * .5}" y2="${H * .5}" gradientUnits="userSpaceOnUse">${st(p.clothStops)}</linearGradient>`
    : `<linearGradient id="cl" ${diag}>${st(p.cloth)}</linearGradient>`;
  return `<defs>${cl}
  <linearGradient id="c2" ${diag}>${st(p.cloth2)}</linearGradient>
  <linearGradient id="vol" ${diag}><stop offset="0" stop-color="#fff" stop-opacity=".4"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></linearGradient>
  <linearGradient id="sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".32"/><stop offset=".38" stop-color="#fff" stop-opacity="0"/><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>
  <linearGradient id="sv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
  <linearGradient id="mt" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.metal[0]}"/><stop offset=".3" stop-color="${p.metal[1]}"/><stop offset=".68" stop-color="${p.metal[2]}"/><stop offset="1" stop-color="${p.metal[3]}"/></linearGradient>
  <linearGradient id="mh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.metal[2]}"/><stop offset=".35" stop-color="${p.metal[0]}"/><stop offset=".6" stop-color="${p.metal[1]}"/><stop offset="1" stop-color="${p.metal[3]}"/></linearGradient>
  <radialGradient id="mr" cx=".36" cy=".3" r=".82"><stop offset="0" stop-color="${p.metal[0]}"/><stop offset=".3" stop-color="${p.metal[1]}"/><stop offset=".72" stop-color="${p.metal[2]}"/><stop offset="1" stop-color="${p.metal[3]}"/></radialGradient>
  <linearGradient id="gd" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="${p.gold[0]}"/><stop offset=".4" stop-color="${p.gold[1]}"/><stop offset=".8" stop-color="${p.gold[2]}"/><stop offset="1" stop-color="${p.gold[3]}"/></linearGradient>
  <linearGradient id="gh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.gold[2]}"/><stop offset=".35" stop-color="${p.gold[0]}"/><stop offset=".6" stop-color="${p.gold[1]}"/><stop offset="1" stop-color="${p.gold[3]}"/></linearGradient>
  <radialGradient id="gr" cx=".36" cy=".3" r=".82"><stop offset="0" stop-color="${p.gold[0]}"/><stop offset=".35" stop-color="${p.gold[1]}"/><stop offset=".78" stop-color="${p.gold[2]}"/><stop offset="1" stop-color="${p.gold[3]}"/></radialGradient>
  <linearGradient id="lt" x1="0" y1="0" x2="1" y2="1">${st(p.leather)}</linearGradient>
  <radialGradient id="cg"><stop offset="0" stop-color="#fff"/><stop offset=".28" stop-color="${p.hi}"/><stop offset=".6" stop-color="${p.glow}" stop-opacity=".65"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient>
  <radialGradient id="tg"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${p.trim || p.glow}"/><stop offset="1" stop-color="${p.trim || p.glow}" stop-opacity="0"/></radialGradient>
  <filter id="gl" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="1.1"/></filter>
  <filter id="gl2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.4"/></filter>
  </defs>`;
}

// ───────── 绘制小工具 ─────────
const r2 = n => Math.round(n * 100) / 100;
const flipX = s => `<g transform="scale(-1,1)">${s}</g>`;
const both = s => s + flipX(s);
const sp = d => `<path d="${d}"/>`;                      // 轮廓用的裸 path
// 粗杆（法杖/剑柄/枪杆）的多边形，可两端不同粗
function rod(x1, y1, x2, y2, w1, w2 = w1) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  return `M${r2(x1 + nx * w1 / 2)},${r2(y1 + ny * w1 / 2)} L${r2(x2 + nx * w2 / 2)},${r2(y2 + ny * w2 / 2)} L${r2(x2 - nx * w2 / 2)},${r2(y2 - ny * w2 / 2)} L${r2(x1 - nx * w1 / 2)},${r2(y1 - ny * w1 / 2)} Z`;
}
const circ = (x, y, r) => `M${r2(x - r)},${y} a${r},${r} 0 1 0 ${r2(r * 2)},0 a${r},${r} 0 1 0 ${r2(-r * 2)},0 Z`;
const ell = (x, y, rx, ry) => `M${r2(x - rx)},${y} a${rx},${ry} 0 1 0 ${r2(rx * 2)},0 a${rx},${ry} 0 1 0 ${r2(-rx * 2)},0 Z`;
// 布料：渐变底 + 横向体积明暗（+ 彩色披风额外叠斜向明暗）
function cloth(d, p, fill = 'url(#cl)', sw = .9) {
  const vol = (p.clothStops && fill === 'url(#cl)') ? `<path d="${d}" fill="url(#vol)"/>` : '';
  return `<path d="${d}" fill="${fill}" stroke="${p.line}" stroke-width="${sw}" stroke-linejoin="round"/>${vol}<path d="${d}" fill="url(#sh)"/>`;
}
const solid = (d, p, fill, sw = .8, extra = '') => `<path d="${d}" fill="${fill}" stroke="${p.line}" stroke-width="${sw}" stroke-linejoin="round" ${extra}/>`;
// 布褶：暗线 + 左侧高光
const folds = (list, k = 1) => list.map(d => `<path d="${d}" fill="none" stroke="#000" stroke-opacity="${.32 * k}" stroke-width="1.15" stroke-linecap="round"/><path d="${d}" transform="translate(-1.1,0)" fill="none" stroke="#fff" stroke-opacity="${.24 * k}" stroke-width=".7" stroke-linecap="round"/>`).join('');
const hl = (d, w = .8, o = .7) => `<path d="${d}" fill="none" stroke="#fff" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round"/>`;
const glowStroke = (d, c, w = 1, o = .65) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w * 2.8}" stroke-linecap="round" opacity="${o}" filter="url(#gl)"/><path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"/>`;
const glowFill = (d, c, o = .75) => `<path d="${d}" fill="${c}" opacity="${o}" filter="url(#gl)"/><path d="${d}" fill="${c}"/>`;
// 羽翼：一组从根部扇形展开的羽毛（angles 为度数，0=向右，y 向下）
function feather(L, w) { return `M0,${r2(-w * .32)} C${r2(L * .3)},${r2(-w)} ${r2(L * .82)},${r2(-w * .95)} ${L},0 C${r2(L * .84)},${r2(w * .62)} ${r2(L * .3)},${r2(w * .66)} 0,${r2(w * .32)} Z`; }
const fan = (x, y, list, attrs) => list.map(([a, L, w]) => `<path d="${feather(L, w)}" transform="translate(${x},${y}) rotate(${a})" ${attrs}/>`).join('');
function sparkles(pts) {
  const star = (x, y, r) => `<path d="M${x},${y - r} L${r2(x + r * .22)},${r2(y - r * .22)} L${x + r},${y} L${r2(x + r * .22)},${r2(y + r * .22)} L${x},${y + r} L${r2(x - r * .22)},${r2(y + r * .22)} L${x - r},${y} L${r2(x - r * .22)},${r2(y - r * .22)}Z" fill="#fff"/>`;
  return `<g opacity=".95">${pts.map(([x, y, r]) => star(x, y, r)).join('')}</g>`;
}
// 披风上的家徽底座（被头像盖住；没有头像的 NPC 就显示家徽）
function crestBase(p, inner) {
  return `<g transform="translate(0,${BY}) scale(1.36)"><circle r="8.6" fill="#000" opacity=".28" filter="url(#gl)"/><circle r="8" fill="url(#c2)" stroke="${p.gold[2]}" stroke-width=".8"/><circle r="8" fill="url(#sh)"/>` +
    `<circle r="6.9" fill="none" stroke="url(#gd)" stroke-width="1.2"/><circle r="7.9" fill="none" stroke="${p.gold[1]}" stroke-width=".55" stroke-dasharray="1.2 1"/>${inner}</g>`;
}
function finish(p, sil, body, H, px, sparks = []) {
  const aura = p.aura ? `<g fill="${p.aura}" stroke="${p.aura}" stroke-width="3.6" opacity=".8" filter="url(#gl2)">${sil}</g>` : '';
  const rim = `<g fill="${p.line}" stroke="${p.line}" stroke-width="${p.goldEdge ? 4.6 : 3.2}" stroke-linejoin="round" stroke-linecap="round">${sil}</g>`;
  // 暗金：外轮廓内侧一圈金边（只在外边缘露出来）
  const gold = p.goldEdge ? `<g fill="none" stroke="#ffcf4f" stroke-width="2.3" stroke-linejoin="round">${sil}</g>` : '';
  // 虹光：外轮廓外再套一圈淡淡的白光
  const prism = p.prism ? `<g fill="none" stroke="#fff" stroke-width="4.8" opacity=".35" filter="url(#gl)" stroke-linejoin="round">${sil}</g>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${r2(-H)} ${r2(-H)} ${r2(H * 2)} ${r2(H * 2)}">${defs(p, H)}${aura}${prism}${rim}${gold}${body}${p.sparkle ? sparkles(sparks) : ''}</svg>`;
}
// 皮肤附带的发光滚边（翡翠/虹光/深渊/暗金）
const trimGlow = (p, d, w = .9) => (p.trim && !p.sparkle) ? glowStroke(d, p.trim, w, .55) : '';

// ═════════ 法师：大尖顶宽檐帽 + 长袍披风 + 右手高举法杖（火焰宝珠）+ 飘浮符文 ═════════
export function dpsSvg(skin, px) {
  const p = palette('dps', skin), H = 29 * K;
  const hemL = 'M-19,27';
  const hem = 'C-15,29.4 -12.6,26.2 -9.2,28.8 C-5.6,31.6 -2.4,28.4 0,30 C2.4,28.4 5.6,31.6 9.2,28.8 C12.6,26.2 15,29.4 19,27';
  const cape = `M-12.4,-8 C-15.8,-3 -17.8,7 -18.7,17 C-19.2,22 -19.6,25 -19,27 ${hem} C19.6,25 19.2,22 18.7,17 C17.8,7 15.8,-3 12.4,-8 C7,-10.8 -7,-10.8 -12.4,-8 Z`;
  const under = 'M-14.6,18 C-14.4,25 -11.6,31.6 -5.4,32.6 L5.4,32.6 C11.6,31.6 14.4,25 14.6,18 Z';
  const sleeve = 'M-8.4,-10 C-12.6,-12 -15.8,-15.2 -17.6,-19.4 L-22.2,-16.2 C-21,-11.6 -18.6,-6.6 -15,-3.2 C-12.6,-4.8 -10.2,-7.2 -8.4,-10 Z';
  const cuff = 'M-17.6,-19.4 L-22.2,-16.2 L-21.4,-14.9 L-16.8,-18.2 Z';
  // 法杖：右手握在 (19.9,-18.4)
  const sx1 = 24.6, sy1 = 12, sx2 = 18.4, sy2 = -27.2;
  const staff = rod(sx1, sy1, sx2, sy2, 2.5, 2.1);
  const orbX = 18, orbY = -31.8;
  // 帽子
  const brim = ell(0, -13.4, 14.8, 6.7);
  const cone = 'M-8.6,-14.6 C-8.8,-20.4 -8.6,-25.8 -9.8,-30.2 C-10.8,-33.8 -12.8,-36.8 -15.8,-38.8 C-9.8,-38.2 -4.8,-34.2 -3,-29 C-1.2,-23.8 3.6,-18.6 8.6,-14.6 C4,-12.2 -4,-12.2 -8.6,-14.6 Z';
  const rune = (x, y, r, o = 1) => `<g transform="translate(${x},${y})" opacity="${o}"><circle r="${r * 1.9}" fill="url(#cg)" opacity=".55"/>` +
    `<circle r="${r}" fill="none" stroke="${p.glow}" stroke-width="${r * .22}"/><path d="M0,${-r * .62} L${r * .5},${r * .4} L${-r * .5},${r * .4} Z M0,${-r * .62} L0,${r * .62}" fill="none" stroke="${p.hi}" stroke-width="${r * .18}" stroke-linejoin="round"/></g>`;
  const flame = `M${orbX},-40 C${orbX + 1.6},-37.6 ${orbX + 4.4},-36.4 ${orbX + 3.6},-32.6 C${orbX + 3},-30.2 ${orbX - 3},-30.2 ${orbX - 3.6},-32.6 C${orbX - 4},-34.6 ${orbX - 2.6},-35.4 ${orbX - 1.8},-37.6 C${orbX - 1.2},-36 ${orbX - .6},-35.6 ${orbX},-36.4 C${orbX + .4},-37.6 ${orbX + .4},-38.8 ${orbX},-40 Z`;

  const sil = sp(staff) + sp(under) + sp(cape) + both(sp(sleeve)) + sp(brim) + sp(cone) + sp(circ(-15.8, -38.6, 1.4)) + sp(circ(orbX, orbY, 5.2)) + sp(circ(-19.9, -18.6, 2.4)) + sp(circ(19.9, -18.4, 2.5));
  const body =
    // 法杖杆（在身体后面）
    `<path d="${staff}" fill="url(#lt)" stroke="${p.line}" stroke-width=".8"/>` +
    hl(`M${sx1 - .5},${sy1 - 2} L${sx2 - .3},${sy2 + 4}`, .5, .35) +
    [0.18, 0.42].map(t => { const x = sx1 + (sx2 - sx1) * t, y = sy1 + (sy2 - sy1) * t; return `<path d="${rod(x + .16, y + 1, x - .16, y - 1, 2.9)}" fill="url(#gh)" stroke="${p.line}" stroke-width=".45"/>`; }).join('') +
    // 下摆内袍 + 披风
    cloth(under, p, 'url(#c2)') +
    cloth(cape, p) +
    `<path d="${cape}" fill="url(#sv)"/>` +
    folds(['M-10.4,-4 C-12.2,5 -13.4,15 -13.8,27.4', 'M-15.2,3 C-16.4,11 -17,18 -17.2,26.6', 'M10.8,-4 C12.4,5 13.4,15 13.6,27.6', 'M15.6,3 C16.6,11 17,18 17.4,26.4', 'M-5.6,17 C-6,21.4 -6.2,25.6 -5.8,29.4', 'M5.6,17 C6,21.4 6.2,25.6 5.8,29.4']) +
    // 下摆金边 + 皮肤滚边
    `<path d="${hemL} ${hem}" transform="translate(0,-1.6)" fill="none" stroke="${p.gold[1]}" stroke-width="1.3"/>` +
    `<path d="${hemL} ${hem}" transform="translate(0,-2.5)" fill="none" stroke="${p.gold[0]}" stroke-opacity=".7" stroke-width=".4"/>` +
    trimGlow(p, `${hemL} ${hem}`, .7) +
    hl('M-12.2,-6.4 C-15.2,-2 -17,7 -17.8,16', .9, .35) +
    // 背后家徽：火焰
    crestBase(p, glowFill('M0,-5.2 C2.4,-2.4 4.2,0 3.6,2.8 C3.2,4.6 1.6,5.6 0,5.6 C-1.6,5.6 -3.2,4.6 -3.6,2.8 C-4.1,.6 -2.6,-.6 -1.8,-2.4 C-1.2,-.8 -.4,-.4 0,-1.2 C.5,-2.4 .5,-3.8 0,-5.2 Z', p.glow) + `<path d="M0,-.6 C1.1,.8 1.6,2 1.3,3 C1,3.9 -1,3.9 -1.3,3 C-1.5,2 -.9,1 0,-.6 Z" fill="${p.hi}"/>`) +
    // 袖子（左手施法、右手握杖）
    cloth(sleeve, p) + solid(cuff, p, 'url(#gd)', .5) +
    flipX(cloth(sleeve, p) + solid(cuff, p, 'url(#gd)', .5)) +
    // 帽檐 + 帽尖
    `<g transform="rotate(-4)">` + cloth(brim, p, 'url(#cl)', 1) +
    `<ellipse cx="0" cy="-14.2" rx="9.4" ry="3.8" fill="#000" opacity=".35" filter="url(#gl)"/>` +
    `<ellipse cx="0" cy="-13.4" rx="13.9" ry="5.9" fill="none" stroke="${p.gold[1]}" stroke-width=".9"/>` +
    `<path d="M-14,-14.6 C-12,-18 -5,-19.8 2,-19.6" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".8" stroke-linecap="round"/>` +
    trimGlow(p, ell(0, -13.4, 14.8, 6.7), .6) + `</g>` +
    cloth(cone, p) +
    `<clipPath id="hc"><path d="${cone}"/></clipPath>` +
    `<g clip-path="url(#hc)"><path d="M-9,-15.6 C-4,-18.4 4,-18.4 9,-15.6" fill="none" stroke="url(#gd)" stroke-width="3.2"/><path d="M-9,-17.4 C-4,-20.2 4,-20.2 9,-17.4" fill="none" stroke="${p.gold[0]}" stroke-opacity=".8" stroke-width=".45"/>` +
    `<path d="M-7.6,-21 C-7.4,-25 -7.8,-29 -9.4,-32.6" fill="none" stroke="#fff" stroke-opacity=".3" stroke-width="1.6" stroke-linecap="round"/>` +
    `<path d="M-6.4,-27.6 C-4.6,-26.8 -3.4,-25.6 -2.6,-24.2 M-3.6,-21.8 C-1.8,-21 0,-19.8 1.2,-18.4" fill="none" stroke="#000" stroke-opacity=".3" stroke-width=".9" stroke-linecap="round"/></g>` +
    `<path d="M-.3,-17.8 L1.1,-16.4 L-.3,-15 L-1.7,-16.4 Z" fill="url(#cg)" stroke="${p.line}" stroke-width=".35"/>` +
    sparkles([[-9.4, -29.4, 1.3], [-5, -23.4, .9]]).replace('opacity=".95"', `opacity=".9" fill="${p.gold[0]}"`) +
    `<circle cx="-15.8" cy="-38.6" r="1.4" fill="url(#gr)" stroke="${p.line}" stroke-width=".4"/>` +
    // 双手（皮手套）
    `<circle cx="-19.9" cy="-18.6" r="2.3" fill="url(#lt)" stroke="${p.line}" stroke-width=".6"/>` +
    `<circle cx="19.9" cy="-18.4" r="2.4" fill="url(#lt)" stroke="${p.line}" stroke-width=".6"/>` +
    // 杖头：金爪托 + 火焰宝珠
    `<circle cx="${orbX}" cy="${orbY}" r="9.4" fill="url(#cg)" opacity=".85"/>` +
    `<path d="M${sx2 + .4},${sy2 + .6} C${sx2 - 4.4},${sy2 - .4} ${orbX - 6},${orbY - 2} ${orbX - 3.4},${orbY - 5.6} M${sx2 + .4},${sy2 + .6} C${sx2 + 4.8},${sy2 - .6} ${orbX + 6.2},${orbY - 2.4} ${orbX + 3.2},${orbY - 5.8}" fill="none" stroke="${p.line}" stroke-width="2.6" stroke-linecap="round"/>` +
    `<path d="M${sx2 + .4},${sy2 + .6} C${sx2 - 4.4},${sy2 - .4} ${orbX - 6},${orbY - 2} ${orbX - 3.4},${orbY - 5.6} M${sx2 + .4},${sy2 + .6} C${sx2 + 4.8},${sy2 - .6} ${orbX + 6.2},${orbY - 2.4} ${orbX + 3.2},${orbY - 5.8}" fill="none" stroke="${p.gold[1]}" stroke-width="1.3" stroke-linecap="round"/>` +
    glowFill(flame, p.glow, .8) + `<path d="${flame}" fill="${p.hi}" transform="translate(${orbX},-33) scale(.55) translate(${-orbX},33)"/>` +
    `<radialGradient id="orb" cx=".4" cy=".36" r=".7"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="${p.hi}"/><stop offset=".7" stop-color="${p.glow}"/><stop offset="1" stop-color="${p.deep}"/></radialGradient>` +
    `<circle cx="${orbX}" cy="${orbY}" r="4.6" fill="url(#orb)" stroke="#5a1400" stroke-width=".6"/>` +
    `<circle cx="${orbX - 1.4}" cy="${orbY - 1.6}" r="1.3" fill="#fff" opacity=".9"/>` +
    `<path d="M${sx2 - 1.6},${sy2 + 1.2} L${sx2 + 2.2},${sy2 + 1.2}" stroke="url(#gh)" stroke-width="2"/>` +
    // 飘浮符文 + 火星
    rune(-23.6, -24.4, 3.2) + rune(-27, -8.4, 2.1, .85) +
    [[23.6, -26, .9], [12.4, -36.4, .7], [24.4, -35.6, .6]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.hi}"/>`).join('');
  return finish(p, sil, body, H, px, [[-16, 6, 1.8], [14.6, 14, 1.5], [-7, -30.4, 1.4], [6, 24, 1.2], [-21, -20, 1.2]]);
}

// ═════════ 骑士：羽饰头盔 + 大肩甲 + 左手塔盾（纹章）+ 右手长剑举起 + 披风 ═════════
export function mechSvg(skin, px) {
  const p = palette('tank', skin), H = 33 * K;
  const hemL = 'M-20.8,31';
  const hem = 'C-17,33.4 -14,30.2 -10.6,32.8 C-6.6,35.6 -3,32.4 0,34.2 C3,32.4 6.6,35.6 10.6,32.8 C14,30.2 17,33.4 20.8,31';
  const cape = `M-13.6,-6.6 C-17.2,-1.6 -19.6,9 -20.6,19 C-21.2,25 -21.6,28.4 -20.8,31 ${hem} C21.6,28.4 21.2,25 20.6,19 C19.6,9 17.2,-1.6 13.6,-6.6 C8,-9.8 -8,-9.8 -13.6,-6.6 Z`;
  const boot = 'M-10,28 L-3.4,28 L-3.8,36.4 C-5.4,37.8 -8.6,37.8 -10.2,36.4 Z';
  const shield = 'M-37.6,-29.4 C-32.6,-32.6 -24.4,-32.6 -19.6,-29.4 L-19.6,5 C-19.6,11.6 -23.6,16.2 -28.6,20 C-33.6,16.2 -37.6,11.6 -37.6,5 Z';
  const shieldEdge = 'M-19.6,-29.4 C-18.6,-28.8 -17.6,-27.8 -17,-26.8 L-17,6 C-17,12.8 -21.6,17.8 -26.8,21.4 L-28.6,20 C-23.6,16.2 -19.6,11.6 -19.6,5 Z';
  const shieldIn = 'M-35.2,-27.4 C-31,-30 -25.6,-30 -22,-27.4 L-22,4.6 C-22,10 -25.2,13.8 -28.6,16.8 C-32,13.8 -35.2,10 -35.2,4.6 Z';
  const pauld = 'M-8.4,-10.8 C-13.4,-14.8 -22,-14 -24.8,-7.4 C-26.4,-1.8 -23.8,3.6 -18.8,4.6 C-15.8,1.8 -11.8,-2.6 -8.4,-5.4 Z';
  const lame1 = 'M-24.8,-7.4 C-26.4,-1.8 -23.8,3.6 -18.8,4.6 C-15.8,1.8 -13.2,-.6 -11.6,-2.2 C-14.6,-1.4 -19.6,-2 -22.4,-4.6 Z';
  const lame2 = 'M-25,-4.8 C-25.4,-.6 -23,3.4 -18.8,4.6 C-16.6,2.6 -15,1 -14,-.2 C-17.4,.6 -21.4,-.6 -25,-4.8 Z';
  const arm = 'M14.2,-3 C16.8,-6.4 18.8,-9.6 20.2,-13 L24.6,-11.2 C24,-7 22,-2.6 19,.4 Z';
  // 长剑
  const bx = 22.2;
  const blade = `M${bx - 1.9},-16.4 L${bx + 1.9},-16.4 L${bx + 1.7},-38.4 L${bx + .2},-43.8 L${bx - 1.5},-38.4 Z`;
  const guard = `M${bx - 6},-16.6 C${bx - 4},-15.4 ${bx + 4},-15.4 ${bx + 6},-16.6 L${bx + 6.4},-14.4 C${bx + 4},-13.2 ${bx - 4},-13.2 ${bx - 6.4},-14.4 Z`;
  const plume = 'M-2,-24.4 C1.6,-26 5.2,-23.4 6,-18.8 C7,-13.6 10,-9.4 14.4,-6.8 C9.4,-6.2 5,-8.6 2.6,-12.6 C.8,-15.8 -.8,-20 -2,-24.4 Z';

  const sil = both(sp(boot)) + sp(cape) + sp(shield) + sp(shieldEdge) + both(sp(pauld)) + sp(arm) + sp(blade) + sp(guard) + sp(circ(bx, -7.4, 2)) + sp(circ(0, -14.6, 7.9)) + sp(plume) + sp(circ(bx, -11.6, 2.9));
  const body =
    // 铁靴
    both(solid(boot, p, 'url(#mt)', .7) + hl('M-8.6,29.6 L-8.8,35', .6, .5)) +
    // 披风
    cloth(cape, p) + `<path d="${cape}" fill="url(#sv)"/>` +
    folds(['M-10.8,-3 C-12.8,6 -14.2,17 -14.6,31.6', 'M-16,3 C-17.4,12 -18.2,21 -18.4,30', 'M11.4,-3 C13.2,6 14.4,17 14.6,31.6', 'M16.4,3 C17.6,12 18.4,21 18.6,30', 'M-5.6,17.4 C-6,23 -6.4,28 -6,33', 'M5.6,17.4 C6,23 6.4,28 6,33', 'M0,17.4 L0,32.6']) +
    `<path d="${hemL} ${hem}" transform="translate(0,-1.6)" fill="none" stroke="${p.gold[1]}" stroke-width="1.3"/>` +
    trimGlow(p, `${hemL} ${hem}`, .7) +
    hl('M-13.4,-5 C-16.8,0 -18.8,9 -19.6,18', .9, .35) +
    // 家徽：剑与王冠十字
    crestBase(p, `<path d="M-1.2,-5.4 L1.2,-5.4 L1.2,-1.6 L4.8,-1.6 L4.8,.8 L1.2,.8 L1.2,5.6 L-1.2,5.6 L-1.2,.8 L-4.8,.8 L-4.8,-1.6 L-1.2,-1.6 Z" fill="url(#gd)" stroke="${p.line}" stroke-width=".4"/>` + glowFill(circ(0, -.4, 1.5), p.glow)) +
    // 塔盾（在肩甲后面）
    solid(shieldEdge, p, 'url(#mh)', .8) +
    solid(shield, p, 'url(#mt)', 1) +
    cloth(shieldIn, p, 'url(#cl)', .7) + `<path d="${shieldIn}" fill="url(#sv)"/>` +
    `<path d="M-34.8,-26.8 C-31,-29.2 -26,-29.2 -22.4,-26.8" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".7"/>` +
    // 盾面纹章：金十字 + 冰晶
    `<path d="M-30.2,-24 L-27,-24 L-27,-14.6 L-23.6,-14.6 L-23.6,-11.4 L-27,-11.4 L-27,10.4 L-28.6,12.4 L-30.2,10.4 L-30.2,-11.4 L-33.6,-11.4 L-33.6,-14.6 L-30.2,-14.6 Z" fill="url(#gd)" stroke="${p.line}" stroke-width=".6"/>` +
    `<path d="M-29.6,-23 L-29.6,9.6" stroke="#fff" stroke-opacity=".55" stroke-width=".5"/>` +
    glowFill('M-28.6,-17.2 L-26,-13 L-28.6,-8.8 L-31.2,-13 Z', p.glow, .9) + `<path d="M-28.6,-16 L-27.4,-13 L-28.6,-12 Z" fill="#fff"/>` +
    [[-35.6, -24], [-21.6, -24], [-35.6, 2], [-21.6, 2], [-28.6, 18.4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r=".75" fill="${p.metal[0]}" stroke="${p.line}" stroke-width=".3"/>`).join('') +
    // 右臂护甲 + 长剑
    solid(arm, p, 'url(#mt)', .8) + `<path d="M15.6,-2.6 C18,-5.6 19.8,-8.6 21,-11.8" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width=".6"/>` +
    `<path d="${blade}" fill="${p.glow}" opacity=".7" filter="url(#gl2)"/>` +
    `<linearGradient id="bl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.metal[1]}"/><stop offset=".48" stop-color="#ffffff"/><stop offset=".52" stop-color="${p.metal[2]}"/><stop offset="1" stop-color="${p.metal[3]}"/></linearGradient>` +
    solid(blade, p, 'url(#bl)', .7) +
    `<path d="M${bx},-17.4 L${bx + .1},-39" stroke="${p.glow}" stroke-width=".7" opacity=".9"/>` +
    hl(`M${bx - 1.1},-18 L${bx - .9},-37.6`, .45, .8) +
    solid(guard, p, 'url(#gd)', .6) + glowFill(circ(bx, -15, 1.1), p.glow, .9) +
    solid(rod(bx, -13.6, bx, -8.6, 1.9), p, 'url(#lt)', .5) +
    `<circle cx="${bx}" cy="-7.4" r="1.9" fill="url(#gr)" stroke="${p.line}" stroke-width=".5"/>` +
    `<circle cx="${bx}" cy="-11.6" r="2.8" fill="url(#mr)" stroke="${p.line}" stroke-width=".7"/>` +
    // 肩甲（层叠板甲 + 金边 + 铆钉）
    both(solid(pauld, p, 'url(#mr)', .9) + solid(lame1, p, 'url(#mt)', .6) + solid(lame2, p, 'url(#mt)', .5) +
      `<path d="M-8.8,-10.4 C-13.6,-14 -21.6,-13.4 -24.2,-7.6" fill="none" stroke="${p.gold[1]}" stroke-width="1.1"/>` +
      `<path d="M-11.4,-11.6 C-15,-12.6 -19.4,-11.6 -21.4,-8.6" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width=".7" stroke-linecap="round"/>` +
      `<circle cx="-16" cy="-7.6" r=".8" fill="${p.gold[0]}" stroke="${p.line}" stroke-width=".3"/><circle cx="-20.6" cy="-5" r=".8" fill="${p.gold[0]}" stroke="${p.line}" stroke-width=".3"/>`) +
    // 头盔：圆顶 + 中脊 + 护颈
    `<circle cx="0" cy="-14.6" r="7.8" fill="url(#mr)" stroke="${p.line}" stroke-width=".9"/>` +
    `<path d="M-7.2,-11.6 C-8.4,-7.6 -5.8,-4.8 0,-4.4 C5.8,-4.8 8.4,-7.6 7.2,-11.6 C4,-9.4 -4,-9.4 -7.2,-11.6 Z" fill="url(#mt)" stroke="${p.line}" stroke-width=".7"/>` +
    `<path d="M-7.4,-12.8 C-4,-10.4 4,-10.4 7.4,-12.8" fill="none" stroke="${p.gold[1]}" stroke-width="1"/>` +
    `<path d="M-4.8,-19.4 C-3.4,-20.8 -1.6,-21.4 0,-21.6" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1" stroke-linecap="round"/>` +
    // 羽饰（冰青 → 皮肤色）
    `<linearGradient id="pl" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="${p.trim && !p.sparkle ? p.trim : p.glow}"/><stop offset="1" stop-color="${p.deep}"/></linearGradient>` +
    `<path d="${plume}" fill="${p.glow}" opacity=".45" filter="url(#gl)"/>` +
    solid(plume, p, 'url(#pl)', .7) +
    `<path d="M-.6,-22 C1.6,-17 4,-12 9,-8.4 M1.8,-22.6 C3.6,-18 5.6,-14 10.6,-9.2" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".5"/>` +
    `<path d="M-1.4,-23.4 C.2,-17 2.6,-12.4 6.6,-9" fill="none" stroke="${p.line}" stroke-opacity=".35" stroke-width=".5"/>`;
  return finish(p, sil, body, H, px, [[-15, 12, 1.8], [16, 22, 1.6], [-29, -6, 1.6], [22, -30, 1.4], [3, -18, 1.2], [-6, 26, 1.2]]);
}

// ═════════ 牧师：兜帽长袍金边 + 头顶光环 + 权杖（太阳圣徽）+ 背后淡淡光翼 ═════════
export function healerSvg(skin, px) {
  const p = palette('healer', skin), H = 29 * K;
  const robe = 'M-12,-7.6 C-15.2,-2.6 -16.8,7 -17.8,17 C-18.4,23 -19.2,27 -19.8,29.8 C-12.4,32.4 12.4,32.4 19.8,29.8 C19.2,27 18.4,23 17.8,17 C16.8,7 15.2,-2.6 12,-7.6 C7,-10.4 -7,-10.4 -12,-7.6 Z';
  const wing = 'M-9.4,-5.4 C-15,-14.6 -25,-21.6 -37.4,-21.4 C-34.2,-18 -33.6,-15 -34.8,-12 C-31.2,-11 -29.8,-8.4 -31.2,-5 C-27.8,-4.2 -26.6,-1.4 -27.8,1.6 C-23.8,1.4 -20.8,3 -19.8,5.6 C-16,3.2 -12.4,.6 -9.4,-5.4 Z';
  const stole = 'M-10.2,-8.4 C-11.4,-1 -11.6,8 -11.2,17.6 L-10.8,23.6 L-12.8,26.2 L-14.8,23.4 L-15.2,17.6 C-15.4,8 -15,-1 -14,-7.2 Z';
  const sleeve = 'M-8.4,-10 C-12.6,-12 -15.8,-15.2 -17.6,-19.4 L-22.2,-16.2 C-21,-11.6 -18.6,-6.6 -15,-3.2 C-12.6,-4.8 -10.2,-7.2 -8.4,-10 Z';
  const cuff = 'M-17.6,-19.4 L-22.2,-16.2 L-21.4,-14.9 L-16.8,-18.2 Z';
  const hood = 'M0,-23.6 C2.4,-22.6 5.6,-21.8 7.8,-19 C9.8,-16.4 9.8,-12.6 9.2,-10.6 C8.2,-7.2 5,-4.6 0,-3.2 C-5,-4.6 -8.2,-7.2 -9.2,-10.6 C-9.8,-12.6 -9.8,-16.4 -7.8,-19 C-5.6,-21.8 -2.4,-22.6 0,-23.6 Z';
  const sx1 = 24.6, sy1 = 12, sx2 = 18.6, sy2 = -25;
  const shaft = rod(sx1, sy1, sx2, sy2, 2.2, 1.9);
  const hx = 18, hy = -29.6;
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = i * Math.PI / 4, a1 = a - .2, a2 = a + .2, R = i % 2 ? 6.2 : 7.6;
    return `M${r2(hx + Math.cos(a1) * 3.6)},${r2(hy + Math.sin(a1) * 3.6)} L${r2(hx + Math.cos(a) * R)},${r2(hy + Math.sin(a) * R)} L${r2(hx + Math.cos(a2) * 3.6)},${r2(hy + Math.sin(a2) * 3.6)} Z`;
  }).join(' ');
  const prim = [[148, 15, 3.2], [158, 19, 3.4], [168, 23, 3.6], [178, 26, 3.8], [189, 28, 3.9], [200, 28, 3.9], [211, 26, 3.6]];
  const cov = [[160, 11, 3.2], [176, 14, 3.4], [192, 15.4, 3.4], [207, 14.4, 3.2]];

  const sil = sp(shaft) + sp(robe) + both(sp(sleeve)) + sp(hood) + sp(circ(hx, hy, 6)) + sp(circ(-19.9, -18.6, 2.4)) + sp(circ(19.9, -18.4, 2.5));
  const wx = -8.4, wy = -5.4;
  const wingSvg = `<g fill="${p.glow}" opacity=".55" filter="url(#gl2)">${fan(wx, wy, prim, '')}</g>` +
    `<g opacity=".88">${fan(wx, wy, prim, `fill="url(#wg)" stroke="${p.deep}" stroke-opacity=".55" stroke-width=".5"`)}` +
    fan(wx, wy, prim.map(([a, L]) => [a, L * .9, .5]), `fill="#fff" opacity=".55"`) +
    fan(wx, wy, cov, `fill="url(#wc)" stroke="${p.deep}" stroke-opacity=".4" stroke-width=".45"`) + `</g>`;
  const body =
    // 光翼（最底层，不进外轮廓）
    `<radialGradient id="wg" cx="${wx}" cy="${wy}" r="29" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#f4fff8"/><stop offset=".8" stop-color="${p.glow}" stop-opacity=".85"/><stop offset="1" stop-color="${p.glow}" stop-opacity=".45"/></radialGradient>` +
    `<radialGradient id="wc" cx="${wx}" cy="${wy}" r="16" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#fffbe8"/><stop offset="1" stop-color="${p.hi}"/></radialGradient>` +
    both(wingSvg) +
    // 权杖杆
    solid(shaft, p, 'url(#gh)', .7) +
    // 长袍
    cloth(robe, p) + `<path d="${robe}" fill="url(#sv)"/>` +
    folds(['M-8.2,15 C-8.6,21 -8.8,26 -8.6,30.4', 'M8.2,15 C8.6,21 8.8,26 8.6,30.4', 'M-3,17 L-3,31', 'M3,17 L3,31', 'M-16.2,6 C-17,14 -17.6,22 -18.4,28.6', 'M16.2,6 C17,14 17.6,22 18.4,28.6'], .8) +
    `<path d="M-19.6,28.6 C-12.4,31 12.4,31 19.6,28.6" fill="none" stroke="url(#gd)" stroke-width="2"/>` +
    `<path d="M-19.2,27.2 C-12.4,29.6 12.4,29.6 19.2,27.2" fill="none" stroke="${p.gold[0]}" stroke-opacity=".7" stroke-width=".4"/>` +
    trimGlow(p, 'M-19.8,29.8 C-12.4,32.4 12.4,32.4 19.8,29.8', .8) +
    hl('M-11.8,-6 C-14.6,-1.4 -16,7 -16.8,16', .9, .45) +
    // 圣带（两侧垂下，绿色金边）
    both(cloth(stole, p, 'url(#c2)', .7) + `<path d="M-10.2,-8.4 C-11.4,-1 -11.6,8 -11.2,17.6 L-10.8,23.6 L-12.8,26.2 L-14.8,23.4 L-15.2,17.6 C-15.4,8 -15,-1 -14,-7.2" fill="none" stroke="${p.gold[1]}" stroke-width=".55"/>` +
      `<path d="M-13.1,17.2 L-13.1,22.6 M-14.8,19.2 L-11.4,19.2" stroke="${p.gold[0]}" stroke-width="1" stroke-linecap="round"/>`) +
    // 家徽：太阳十字
    crestBase(p, `<g fill="url(#gd)" stroke="${p.line}" stroke-width=".35">${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4; return `<path d="M${r2(Math.cos(a - .26) * 2.6)},${r2(Math.sin(a - .26) * 2.6)} L${r2(Math.cos(a) * 5.6)},${r2(Math.sin(a) * 5.6)} L${r2(Math.cos(a + .26) * 2.6)},${r2(Math.sin(a + .26) * 2.6)} Z"/>`; }).join('')}<circle r="2.9"/></g>` +
      `<path d="M-.6,-2 h1.2 v1.4 h1.4 v1.2 h-1.4 v1.4 h-1.2 v-1.4 h-1.4 v-1.2 h1.4 Z" fill="${p.glow}"/>`) +
    // 袖子
    cloth(sleeve, p) + solid(cuff, p, 'url(#gd)', .5) + flipX(cloth(sleeve, p) + solid(cuff, p, 'url(#gd)', .5)) +
    // 兜帽
    cloth(hood, p) + `<path d="${hood}" fill="url(#sv)"/>` +
    `<path d="M-9.2,-11.2 C-8.4,-7.4 -5,-4.6 0,-3.2 C5,-4.6 8.4,-7.4 9.2,-11.2" fill="none" stroke="url(#gd)" stroke-width="1.5"/>` +
    `<path d="M0,-22.4 C-.4,-15 -.2,-9 0,-4.6" fill="none" stroke="#000" stroke-opacity=".3" stroke-width="1.1"/>` +
    `<path d="M-6.6,-17.4 C-5.4,-13.6 -3.8,-10 -1.6,-7 M6.6,-17.4 C5.4,-13.6 3.8,-10 1.6,-7 M4.6,-20.6 C3.6,-17.4 2.8,-14.6 2.4,-11.6" fill="none" stroke="#000" stroke-opacity=".22" stroke-width=".9" stroke-linecap="round"/>` +
    `<path d="M8.6,-14 C8.4,-10.4 6,-7.2 2.6,-5.2 C5.6,-8 7.4,-10.8 8.6,-14 Z" fill="#000" opacity=".25"/>` +
    hl('M-4.8,-21 C-7.6,-19.4 -8.8,-16.4 -8.6,-13', 1, .65) +
    // 双手：左手捧治疗光，右手握杖
    `<circle cx="-19.9" cy="-18.6" r="2.3" fill="${p.metal[1]}" stroke="${p.line}" stroke-width=".6"/>` +
    `<circle cx="-22.4" cy="-23" r="6" fill="${p.glow}" opacity=".55" filter="url(#gl2)"/><circle cx="-22.4" cy="-23" r="2.6" fill="#fff"/>` +
    `<path d="M-22.4,-27.6 L-22.4,-18.4 M-27,-23 L-17.8,-23" stroke="#fff" stroke-width="1" stroke-linecap="round"/><path d="M-23.6,-23 h2.4 M-22.4,-24.2 v2.4" stroke="${p.glow}" stroke-width="1.1"/>` +
    `<circle cx="19.9" cy="-18.4" r="2.4" fill="${p.metal[1]}" stroke="${p.line}" stroke-width=".6"/>` +
    // 权杖头：太阳圣徽 + 绿宝石
    `<circle cx="${hx}" cy="${hy}" r="10" fill="url(#cg)" opacity=".65"/>` +
    `<circle cx="${hx}" cy="${hy}" r="8" fill="${p.deep}" opacity=".55" filter="url(#gl2)"/>` +
    `<path d="${rays}" fill="url(#gd)" stroke="${p.line}" stroke-width=".45" stroke-linejoin="round"/>` +
    `<circle cx="${hx}" cy="${hy}" r="4" fill="url(#gr)" stroke="${p.line}" stroke-width=".6"/>` +
    `<path d="M${hx - .7},${hy - 3} h1.4 v2.3 h2.3 v1.4 h-2.3 v2.3 h-1.4 v-2.3 h-2.3 v-1.4 h2.3 Z" fill="#fff" stroke="${p.gold[2]}" stroke-width=".3"/>` +
    `<circle cx="${hx}" cy="${hy}" r="1.1" fill="${p.glow}"/>` +
    `<path d="M${sx2 - 1.8},${sy2 + 1.6} L${sx2 + 2},${sy2 + 1.6}" stroke="url(#gh)" stroke-width="1.8"/>` +
    // 光环（漂在兜帽上方）
    `<ellipse cx="0" cy="-25.4" rx="8.8" ry="3.1" fill="none" stroke="${p.deep}" stroke-width="3.6" opacity=".7" filter="url(#gl)"/>` +
    `<ellipse cx="0" cy="-25.4" rx="8.8" ry="3.1" fill="none" stroke="${p.line}" stroke-width="2.3" opacity=".6"/>` +
    `<ellipse cx="0" cy="-25.4" rx="8.8" ry="3.1" fill="none" stroke="${p.hi}" stroke-width="1.5"/>` +
    `<path d="M-7.4,-27 C-4.4,-28.4 1,-28.6 4.4,-27.8" fill="none" stroke="#fff" stroke-width=".7" stroke-linecap="round"/>`;
  return finish(p, sil, body, H, px, [[-14, 10, 1.7], [14.6, 20, 1.4], [-24, -2, 1.3], [5, -16, 1.2], [9, 26, 1.2]]);
}

// ═════════ 游侠：兜帽披风（锯齿下摆）+ 长弓拉满朝上 + 背上箭袋 + 肩上灵鹰 ═════════
export function carrierSvg(skin, px) {
  const p = palette('carrier', skin), H = 30 * K;
  const hem = 'L-16.6,30.4 L-13.8,27.2 L-10.6,31.6 L-7.2,28 L-3.6,32.4 L0,28.6 L3.6,32.4 L7.2,28 L10.6,31.6 L13.8,27.2 L16.6,30.4 L19.2,26.6';
  const cape = `M-12.6,-7.2 C-15.8,-2.2 -17.8,8 -18.8,18 C-19.2,22 -19.4,24.6 -19.2,26.6 ${hem} C19.4,24.6 19.2,22 18.8,18 C17.8,8 15.8,-2.2 12.6,-7.2 C7,-10.2 -7,-10.2 -12.6,-7.2 Z`;
  const hood = 'M0,-22.4 C6.8,-22.4 9.8,-17.4 9.4,-12.6 C9,-8.2 4.6,-4.6 0,-1.4 C-4.6,-4.6 -9,-8.2 -9.4,-12.6 C-9.8,-17.4 -6.8,-22.4 0,-22.4 Z';
  const shoulder = 'M-7.6,-10.2 C-11.6,-11.6 -16.2,-10.2 -17.6,-6 C-18.2,-3.6 -17,-1.6 -15,-1.2 C-13,-4 -10.6,-6.4 -7.6,-7.6 Z';
  // 弓：握把 (0,-31.4)，左右弓臂向下反曲；弦拉到兜帽前 (0,-17)
  const gx = 0, gy = -31.4;
  const limbL = `M${gx},${gy} C-7.6,${gy - 3.8} -16.4,${gy - 3.6} -21.4,${gy + 1.4} C-23,${gy + 3} -23.2,${gy + 5} -25.4,${gy + 6.2}`;
  const tipL = [-25.4, gy + 6.2], tipR = [25.4, gy + 6.2];
  const nock = [0, -15.4];
  const armL = rod(-11.2, -8, -3.2, -29.2, 4.4, 3.4);
  const armR1 = rod(11.4, -7.6, 16.6, -14.6, 4.4, 3.8);
  const armR2 = rod(16.6, -14.6, 2.6, -19.4, 3.8, 3.2);
  // 箭袋
  const quiver = 'M11.4,-4.6 L17,-4.6 L16.4,15.6 C16.2,17.4 12.6,17.4 12.2,15.6 Z';
  // 灵鹰（停在左肩）
  const ex = -15.4, ey = -6;
  const eBody = `M${ex},${ey - 6.6} C${ex + 2.6},${ey - 6.4} ${ex + 3.6},${ey - 3.4} ${ex + 3.4},${ey} C${ex + 3.2},${ey + 3.4} ${ex + 1.8},${ey + 5.6} ${ex},${ey + 7} C${ex - 1.8},${ey + 5.6} ${ex - 3.2},${ey + 3.4} ${ex - 3.4},${ey} C${ex - 3.6},${ey - 3.4} ${ex - 2.6},${ey - 6.4} ${ex},${ey - 6.6} Z`;
  const eWingL = `M${ex - 2},${ey - 3} C${ex - 5.6},${ey - 6.6} ${ex - 9.4},${ey - 7.4} ${ex - 11.4},${ey - 6.2} C${ex - 9.6},${ey - 4.6} ${ex - 9.6},${ey - 3} ${ex - 10.4},${ey - 1.2} C${ex - 8.4},${ey - 1} ${ex - 7.6},${ey + .2} ${ex - 8},${ey + 1.8} C${ex - 5.6},${ey + 1.4} ${ex - 3.4},${ey + 2.2} ${ex - 2.4},${ey + 3.4} Z`;
  const eWingR = `M${ex + 2},${ey - 3} C${ex + 5},${ey - 6} ${ex + 7.6},${ey - 7.4} ${ex + 9.4},${ey - 7} C${ex + 8.2},${ey - 5.2} ${ex + 7.8},${ey - 3.6} ${ex + 8},${ey - 2} C${ex + 6.4},${ey - 1.4} ${ex + 5},${ey} ${ex + 2.4},${ey + 3.4} Z`;
  const eTail = `M${ex - 1.6},${ey + 5} L${ex - 2.8},${ey + 9.4} L${ex},${ey + 8.4} L${ex + 2.8},${ey + 9.4} L${ex + 1.6},${ey + 5} Z`;
  const arrowHead = `M0,-41.4 L2.1,-36.2 L0,-37.2 L-2.1,-36.2 Z`;

  const limbSil = rod(-25.4, gy + 6.2, -21.6, gy + 1.6, 2, 2.8) + ' ' + rod(-21.6, gy + 1.6, -12, gy - 3, 2.8, 3.4) + ' ' + rod(-12, gy - 3, 0, gy - 1.6, 3.4, 3.8);
  const CANT = `rotate(-13 ${nock[0]} ${nock[1]})`;
  const sil = sp(cape) + sp(armL) + sp(armR1) + sp(armR2) + `<g transform="${CANT}">${both(sp(limbSil)) + sp(rod(0, -15.6, 0, -37, 1.4)) + sp(arrowHead) + sp(circ(0, -30.6, 2.6))}</g>` + sp(hood) + sp(quiver) + sp(rod(14.2, -5, 15.6, -13.4, 6)) + sp(eBody) + sp(eWingL) + sp(eWingR) + sp(eTail);
  const pg = `<linearGradient id="bw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${p.leather[2]}"/><stop offset=".5" stop-color="${p.leather[0]}"/><stop offset="1" stop-color="${p.leather[1]}"/></linearGradient><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="${p.hi}"/><stop offset=".75" stop-color="${p.glow}"/><stop offset="1" stop-color="${p.deep}"/></linearGradient>`;
  const body = pg +
    // 披风
    cloth(cape, p) + `<path d="${cape}" fill="url(#sv)"/>` +
    folds(['M-10.6,-3.6 C-12.4,6 -13.4,16 -13.8,27', 'M-15.4,3 C-16.6,11 -17.2,18 -16.8,29.6', 'M10.8,-3.6 C12.4,6 13.6,16 13.8,27', 'M-5.6,17 C-6.2,21.4 -6.8,25.6 -7.2,28', 'M5.6,17 C6.2,21.4 6.8,25.6 7.2,28', 'M0,17.4 L0,28.4'], .9) +
    `<path d="M-19.2,26.6 ${hem}" transform="translate(0,-1.5)" fill="none" stroke="${p.leather[0]}" stroke-opacity=".9" stroke-width=".9" stroke-linejoin="round"/>` +
    trimGlow(p, `M-19.2,26.6 ${hem}`, .6) +
    hl('M-12.4,-5.6 C-15.4,-1 -17,8 -17.8,17', .9, .35) +
    // 家徽：灵羽箭
    crestBase(p, glowFill('M0,-5.4 L2,-2.6 L.7,-2.6 L.7,3.2 L2.4,5.4 L.7,4.8 L0,5.8 L-.7,4.8 L-2.4,5.4 L-.7,3.2 L-.7,-2.6 L-2,-2.6 Z', p.glow, .8) + `<path d="M0,-4.2 L0,4" stroke="#fff" stroke-width=".5"/>`) +
    // 箭袋（右背）
    `<g>` + solid('M12.2,-6.6 L13.6,-12.8 M14.6,-6.8 L15.6,-13.6 M16.6,-6.4 L18,-12.2', p, 'none', 1.6, 'stroke-linecap="round"') +
    `<path d="M12.2,-6.6 L13.6,-12.8 M14.6,-6.8 L15.6,-13.6 M16.6,-6.4 L18,-12.2" stroke="${p.leather[0]}" stroke-width=".7"/>` +
    [[13.6, -12.8, -12], [15.6, -13.6, 0], [18, -12.2, 14]].map(([x, y, a]) => `<path d="M${x},${y - 2.6} L${x + 1.3},${y + .6} L${x},${y + 2} L${x - 1.3},${y + .6} Z" transform="rotate(${a} ${x} ${y})" fill="url(#sg)" stroke="${p.line}" stroke-width=".4"/>`).join('') +
    solid(quiver, p, 'url(#lt)', .8) + `<path d="${quiver}" fill="url(#sh)"/>` +
    `<path d="M11.4,-4.6 L17,-4.6 L16.95,-2.6 L11.45,-2.6 Z M11.85,10.4 L16.6,10.4 L16.55,12.2 L11.9,12.2 Z" fill="url(#gd)" stroke="${p.line}" stroke-width=".4"/>` +
    `<path d="M14.2,-1 L14.2,9" stroke="${p.leather[2]}" stroke-width=".6" stroke-dasharray="1 .8"/></g>` +
    // 左肩皮甲
    solid(shoulder, p, 'url(#lt)', .7) + `<path d="M-9,-9.6 C-12,-10.4 -15,-9.6 -16.4,-7" fill="none" stroke="${p.gold[1]}" stroke-width=".7"/>` +
    // 左臂（伸向弓把）
    cloth(armL, p, 'url(#cl)', .7) + hl('M-12.2,-9.4 L-5.4,-25.8', .6, .45) + solid(rod(-5.8, -22.6, -3.6, -28.2, 3.9, 3.5), p, 'url(#lt)', .5) +
    `<path d="M-6,-23.2 L-3.6,-22.2" stroke="${p.gold[1]}" stroke-width=".6"/>` +
    // 弓：外轮廓 → 木 → 发光符文（整体微微倾斜，像真实射手的持弓角度）
    `<g transform="${CANT}">` + both(`<path d="${limbL}" fill="none" stroke="${p.line}" stroke-width="3.6" stroke-linecap="round"/>` +
      `<path d="${limbL}" fill="none" stroke="url(#bw)" stroke-width="2.5" stroke-linecap="round"/>` +
      `<path d="M-3.4,${gy - 1.4} L-3.4,${gy + 1} M-18.2,${gy - .8} L-17.2,${gy + 1}" stroke="url(#gd)" stroke-width="1.1"/>` +
      `<path d="${limbL}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width=".6" stroke-linecap="round" transform="translate(0,-.6)"/>` +
      `<circle cx="${tipL[0]}" cy="${tipL[1]}" r="1.3" fill="url(#gr)" stroke="${p.line}" stroke-width=".4"/>`) +
    glowStroke(`M-6,${gy - 2.2} C-9.6,${gy - 2.8} -12.6,${gy - 2.4} -15.4,${gy - 1.2} M6,${gy - 2.2} C9.6,${gy - 2.8} 12.6,${gy - 2.4} 15.4,${gy - 1.2}`, p.glow, .7, .8) +
    // 弓弦（拉满）+ 箭
    glowStroke(`M${tipL[0]},${tipL[1]} L${nock[0]},${nock[1]} L${tipR[0]},${tipR[1]}`, p.glow, .45, .7) +
    `<path d="M${tipL[0]},${tipL[1]} L${nock[0]},${nock[1]} L${tipR[0]},${tipR[1]}" fill="none" stroke="#fff" stroke-width=".35"/>` +
    `<path d="M0,-15.8 L0,-37" stroke="${p.line}" stroke-width="1.5"/><path d="M0,-15.8 L0,-37" stroke="${p.leather[0]}" stroke-width=".7"/>` +
    `<path d="${arrowHead}" fill="${p.glow}" opacity=".9" filter="url(#gl)"/>` + solid(arrowHead, p, 'url(#sg)', .45) +
    `<circle cx="0" cy="-38.4" r="4.2" fill="url(#cg)" opacity=".7"/>` +
    // 握弓的手
    `<circle cx="0" cy="-30.6" r="2.3" fill="url(#lt)" stroke="${p.line}" stroke-width=".6"/>` +
    `<path d="M-1.6,-31 L1.6,-31" stroke="${p.gold[1]}" stroke-width=".6"/></g>` +
    // 兜帽
    cloth(hood, p) + `<path d="${hood}" fill="url(#sv)"/>` +
    `<path d="M0,-21.2 C-.2,-14 -.1,-7.6 0,-3" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1"/>` +
    `<path d="M-9.2,-11.6 C-8.2,-7.6 -4.4,-4.6 0,-1.4 C4.4,-4.6 8.2,-7.6 9.2,-11.6" fill="none" stroke="${p.gold[1]}" stroke-width=".8"/>` +
    hl('M-5.6,-19.8 C-7.6,-18.2 -8.4,-15.4 -8.2,-12.8', 1, .55) +
    // 右臂拉弦
    cloth(armR1, p, 'url(#cl)', .7) + cloth(armR2, p, 'url(#cl)', .7) + hl('M12.4,-9.4 L15.6,-14.6 L4.6,-18.6', .55, .4) +
    `<circle cx="16.6" cy="-14.6" r="2.1" fill="url(#lt)" stroke="${p.line}" stroke-width=".5"/>` +
    solid(rod(9, -17.2, 4, -19, 3.7, 3.3), p, 'url(#lt)', .5) + `<path d="M8.2,-19 L8.8,-15.6" stroke="${p.gold[1]}" stroke-width=".6"/>` +
    `<circle cx="2.2" cy="-19.2" r="2.2" fill="url(#lt)" stroke="${p.line}" stroke-width=".6"/>` +
    // 灵鹰（发紫光）
    `<g><path d="${eBody} ${eWingL} ${eWingR}" fill="${p.glow}" opacity=".75" filter="url(#gl2)"/>` +
    solid(eWingL, p, 'url(#sg)', .6) + solid(eWingR, p, 'url(#sg)', .6) +
    `<path d="M${ex - 3.6},${ey - 2.6} C${ex - 6},${ey - 4.6} ${ex - 8.6},${ey - 5.4} ${ex - 10.2},${ey - 5} M${ex - 3.6},${ey} C${ex - 5.6},${ey - 1.4} ${ex - 7.6},${ey - 1.6} ${ex - 9},${ey - 1}" fill="none" stroke="${p.deep}" stroke-opacity=".7" stroke-width=".45"/>` +
    solid(eTail, p, 'url(#sg)', .5) +
    solid(eBody, p, 'url(#sg)', .6) +
    `<path d="M${ex - 1.4},${ey - 2} C${ex - 1.6},${ey + 1} ${ex - 1},${ey + 3.4} ${ex},${ey + 5}" fill="none" stroke="${p.deep}" stroke-opacity=".55" stroke-width=".5"/>` +
    `<circle cx="${ex}" cy="${ey - 5}" r="2.3" fill="#fff" stroke="${p.line}" stroke-width=".5"/>` +
    `<path d="M${ex - .9},${ey - 6.8} L${ex},${ey - 9.2} L${ex + .9},${ey - 6.8} Z" fill="url(#gd)" stroke="${p.line}" stroke-width=".35"/>` +
    `<circle cx="${ex - 1}" cy="${ey - 5.4}" r=".55" fill="${p.deep}"/><circle cx="${ex + 1}" cy="${ey - 5.4}" r=".55" fill="${p.deep}"/></g>`;
  return finish(p, sil, body, H, px, [[-14.4, 12, 1.7], [15.4, 22, 1.4], [-20, -22, 1.3], [6, 24, 1.2], [21, -28, 1.2]]);
}

// ═════════ 灵鹰（游侠召唤物）：俯视、展翅、头朝上；attack 后掠俯冲小鹰 / guard 平展大翼 + 发光护盾纹 ═════════
export function droneShipSvg(kind, px) {
  const p = palette('carrier', 0);
  const g = kind === 'guard';
  const H = g ? 18.6 : 14.2;
  const k = g ? 1.18 : 1;
  const rx = 2.2 * k, ry = -2.6 * k;      // 翼根
  const prim = (g ? [[146, 9, 1.9], [156, 11, 2], [166, 12.2, 2.1], [176, 12.6, 2.1], [186, 12.2, 2], [196, 11.2, 1.9], [206, 9.4, 1.8]]
    : [[122, 7, 1.7], [132, 8.8, 1.8], [142, 10.2, 1.9], [152, 11, 1.9], [162, 10.8, 1.8], [172, 9.8, 1.7]]).map(([a, L, w]) => [a, L * k, w * k]);
  const cov = (g ? [[156, 7.6, 2.1], [174, 8.4, 2.2], [192, 7.6, 2]] : [[134, 6, 2], [150, 6.8, 2.1], [166, 6.2, 1.9]]).map(([a, L, w]) => [a, L * k, w * k]);
  const tail = [[74, 5.6, 1.5], [82, 6.4, 1.6], [90, 6.8, 1.6], [98, 6.4, 1.6], [106, 5.6, 1.5]].map(([a, L, w]) => [a, L * k, w * k]);
  const ty = 3 * k;
  const bodyD = `M0,${r2(-7.6 * k)} C${r2(2.4 * k)},${r2(-7.6 * k)} ${r2(4 * k)},${r2(-4.8 * k)} ${r2(3.8 * k)},${r2(-1.6 * k)} C${r2(3.6 * k)},${r2(1.8 * k)} ${r2(2 * k)},${r2(4.4 * k)} 0,${r2(5.4 * k)} C${r2(-2 * k)},${r2(4.4 * k)} ${r2(-3.6 * k)},${r2(1.8 * k)} ${r2(-3.8 * k)},${r2(-1.6 * k)} C${r2(-4 * k)},${r2(-4.8 * k)} ${r2(-2.4 * k)},${r2(-7.6 * k)} 0,${r2(-7.6 * k)} Z`;
  const hy = -7.6 * k, hr = 2.1 * k;
  const beak = `M0,${r2(hy - hr - 2.2 * k)} C${r2(.8 * k)},${r2(hy - hr - 1.4 * k)} ${r2(1.1 * k)},${r2(hy - hr - .2 * k)} ${r2(1 * k)},${r2(hy - hr + .6)} L${r2(-1 * k)},${r2(hy - hr + .6)} C${r2(-1.1 * k)},${r2(hy - hr - .2 * k)} ${r2(-.8 * k)},${r2(hy - hr - 1.4 * k)} 0,${r2(hy - hr - 2.2 * k)} Z`;
  const wingL = fan(-rx, ry, prim, '') + fan(-rx, ry, cov, '');
  const sil = wingL + flipX(wingL) + fan(0, ty, tail, '') + `<path d="${bodyD}"/>` + sp(circ(0, r2(hy), r2(hr))) + sp(beak);
  const D = '#2a0c5a';
  const wing = fan(-rx, ry, prim, `fill="url(#ew)" stroke="${D}" stroke-width=".4"`) +
    fan(-rx, ry, prim.map(([a, L]) => [a - 2, L * .86, .35 * k]), `fill="#fff" opacity=".5"`) +
    fan(-rx, ry, cov, `fill="url(#ec)" stroke="${D}" stroke-width=".38"`);
  let shield = '';
  if (g) {
    const hex = (x, y, r) => `M${x},${r2(y - r)} L${r2(x + r * .87)},${r2(y - r / 2)} L${r2(x + r * .87)},${r2(y + r / 2)} L${x},${r2(y + r)} L${r2(x - r * .87)},${r2(y + r / 2)} L${r2(x - r * .87)},${r2(y - r / 2)} Z`;
    const pat = hex(-8.4, -3.6, 1.7) + ' ' + hex(-12.4, -3.4, 1.5) + ' ' + hex(-15.8, -2.8, 1.2) + ' M-4.6,-6.2 C-9,-7.6 -13.6,-7.2 -17.4,-5.2';
    shield = both(glowStroke(pat, '#f6e8ff', .42, .95)) +
      `<circle r="14.6" fill="none" stroke="${p.glow}" stroke-width="2.4" opacity=".35" filter="url(#gl)"/>` +
      `<circle r="14.6" fill="none" stroke="#ead8ff" stroke-width=".55" stroke-dasharray="3.2 2.2" opacity=".8"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${-H} ${-H} ${H * 2} ${H * 2}">${defs(p, H)}` +
    `<radialGradient id="ew" cx="${-rx}" cy="${ry}" r="${r2(14 * k)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#e2c8ff"/><stop offset=".75" stop-color="${p.glow}"/><stop offset="1" stop-color="#6a2ad0"/></radialGradient>` +
    `<radialGradient id="ec" cx="${-rx}" cy="${ry}" r="${r2(8 * k)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#f2e6ff"/><stop offset="1" stop-color="#c9a6ff"/></radialGradient>` +
    `<linearGradient id="eb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#d6b8ff"/><stop offset="1" stop-color="#6a2ad0"/></linearGradient>` +
    `<g fill="${p.glow}" opacity=".9" filter="url(#gl2)">${sil}</g>` +
    `<ellipse cx="0" cy="${r2(9 * k)}" rx="${r2(2.4 * k)}" ry="${r2(4 * k)}" fill="url(#cg)" opacity=".8"/>` +
    `<g fill="#150626" stroke="#150626" stroke-width="1.7" stroke-linejoin="round">${sil}</g>` +
    fan(0, ty, tail, `fill="url(#eb)" stroke="${D}" stroke-width=".4"`) +
    wing + flipX(wing) + shield +
    `<path d="${bodyD}" fill="url(#eb)" stroke="${D}" stroke-width=".45"/><path d="${bodyD}" fill="url(#sh)"/>` +
    `<path d="M${r2(-1.4 * k)},${r2(-3 * k)} C${r2(-1.8 * k)},0 ${r2(-1.2 * k)},${r2(2.4 * k)} 0,${r2(4 * k)} M${r2(1.4 * k)},${r2(-3 * k)} C${r2(1.8 * k)},0 ${r2(1.2 * k)},${r2(2.4 * k)} 0,${r2(4 * k)}" fill="none" stroke="${D}" stroke-opacity=".35" stroke-width=".4"/>` +
    `<circle cx="0" cy="${r2(-1 * k)}" r="${r2(1.5 * k)}" fill="url(#cg)"/>` +
    `<circle cx="0" cy="${r2(hy)}" r="${r2(hr)}" fill="#fff" stroke="${D}" stroke-width=".45"/>` +
    `<path d="${beak}" fill="#ffd86b" stroke="#5a3a00" stroke-width=".3"/>` +
    `<path d="M${r2(-hr * .95)},${r2(hy - .1)} L${r2(-hr * .35)},${r2(hy - .5)} M${r2(hr * .95)},${r2(hy - .1)} L${r2(hr * .35)},${r2(hy - .5)}" stroke="#7a2ad8" stroke-width="${r2(.7 * k)}" stroke-linecap="round"/>` +
    // 胸前灵羽花纹
    `<path d="M0,${r2(-4.4 * k)} L${r2(1.4 * k)},${r2(-2.6 * k)} L0,${r2(-.8 * k)} L${r2(-1.4 * k)},${r2(-2.6 * k)} Z" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width=".35"/>` +
    `</svg>`;
}

// ═════════ 狮鹫骑士（礼物召唤）：俯视狮鹫展翅，背上金甲骑士持枪，头朝上，金色主调 ═════════
export function griffinSvg(px) {
  const p = { ...BASE, ...CLS.dps, metal: ['#fffaf0', '#ffe9a8', '#c99a3a', '#4a3008'], gold: ['#fffbe0', '#ffd24a', '#b77a08', '#4a2c00'], line: '#1a0e04', hi: '#fff4c2', glow: '#ffd23a', deep: '#ff9a1a', cloth2: ['#ff7a5a', '#c41e2c', '#4a0612'] };
  const H = 40;
  const gwx = -6.4, gwy = -8.4;
  const prim = [[160, 29, 4.4], [170, 31.6, 4.7], [180, 32, 4.8], [190, 30.6, 4.7], [200, 27.6, 4.4], [210, 23.6, 4.1], [221, 19, 3.7], [233, 14.6, 3.3]];
  const cov = [[168, 19, 4.4], [183, 20.4, 4.6], [198, 18.4, 4.3], [213, 14.6, 3.8]];
  const cov2 = [[176, 11.4, 4.4], [196, 11.4, 4.2], [214, 9, 3.6]];
  const lion = 'M0,-12 C6,-12 8.6,-7.4 8.8,-1 C9,5 10,10 9.6,15 C9.2,20.4 5.6,23.4 0,23.4 C-5.6,23.4 -9.2,20.4 -9.6,15 C-10,10 -9,5 -8.8,-1 C-8.6,-7.4 -6,-12 0,-12 Z';
  const haunch = 'M-9.4,10 C-12.6,11 -13.6,16 -12,20 C-10.6,23.4 -7,23.8 -5.6,21.6 Z';
  const ruff = 'M-7.4,-9.4 C-8.6,-15.6 -5.6,-20.8 0,-21.6 C5.6,-20.8 8.6,-15.6 7.4,-9.4 C3.6,-7.2 -3.6,-7.2 -7.4,-9.4 Z';
  const talon = 'M-5,-17.4 C-7.4,-18.6 -9.2,-21 -8.8,-23.2 C-7.6,-22.4 -6.8,-22.4 -6.4,-23.4 C-5.6,-22.2 -4.6,-22.2 -4.2,-22.8 C-4,-20.8 -3.8,-19 -2.8,-17.8 Z';
  const ear = 'M-2.8,-26.4 L-6.6,-31.2 L-4.8,-24.4 Z';
  const head = 'M0,-31.4 C3.2,-31.4 5.2,-28.6 5,-25.4 C4.8,-22.2 2.8,-20.2 0,-20.2 C-2.8,-20.2 -4.8,-22.2 -5,-25.4 C-5.2,-28.6 -3.2,-31.4 0,-31.4 Z';
  const beak = 'M-2.2,-30 C-1.8,-32.6 -.9,-34.6 0,-36.2 C.9,-34.6 1.8,-32.6 2.2,-30 C1.1,-29.2 -1.1,-29.2 -2.2,-30 Z';
  const cape = 'M-5.6,-2.4 C-7.2,3 -7.2,9.6 -5.8,14.4 C-3.6,16 3.6,16 5.8,14.4 C7.2,9.6 7.2,3 5.6,-2.4 Z';
  const lance = rod(8, 4, 8, -36.4, 1.9, 1.3);
  const lanceTip = 'M8,-42.6 L9.9,-37.4 L8,-35.6 L6.1,-37.4 Z';
  const tail = 'M1,22.6 C2.6,27.6 6,30.6 10.2,31.4';
  const wingSil = fan(gwx, gwy, prim, '');
  const sil = both(wingSil) + sp(lion) + both(sp(haunch)) + sp(rod(1, 22.6, 6, 30.6, 2.2)) + sp(ell(10.8, 31.4, 2.8, 2.2)) + sp(ruff) + both(sp(talon)) + sp(head) + both(sp(ear)) + sp(beak) + sp(lance) + sp(lanceTip) + both(sp(circ(-5.2, -2.4, 3.2))) + sp(circ(0, -5, 3.8));
  const body =
    `<radialGradient id="fw" cx="${gwx}" cy="${gwy}" r="33" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff6cc"/><stop offset=".42" stop-color="#ffd24a"/><stop offset=".82" stop-color="#d88a0e"/><stop offset="1" stop-color="#8a4a04"/></radialGradient>` +
    `<radialGradient id="fc" cx="${gwx}" cy="${gwy - 3}" r="21" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#fff2c8"/><stop offset="1" stop-color="#e8b048"/></radialGradient>` +
    `<radialGradient id="lb" cx=".36" cy=".28" r=".85"><stop offset="0" stop-color="#ffe6a8"/><stop offset=".5" stop-color="#e2a24a"/><stop offset="1" stop-color="#7a4210"/></radialGradient>` +
    `<radialGradient id="wh" cx=".38" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#f6efe2"/><stop offset="1" stop-color="#a89a84"/></radialGradient>` +
    `<g fill="#ffd23a" opacity=".6" filter="url(#gl2)">${sil}</g>` +
    `<g fill="${p.line}" stroke="${p.line}" stroke-width="3" stroke-linejoin="round">${sil}</g>` +
    // 翅膀
    both(fan(gwx, gwy, prim, `fill="url(#fw)" stroke="${p.line}" stroke-width=".55"`) +
      fan(gwx, gwy, prim.map(([a, L]) => [a - 1.6, L * .9, .5]), `fill="#fff" opacity=".5"`) +
      fan(gwx, gwy, cov, `fill="url(#fc)" stroke="#8a5a10" stroke-width=".5"`) +
      fan(gwx, gwy, cov2, `fill="#fffaf0" stroke="#8a5a10" stroke-width=".45"`)) +
    // 尾巴 + 后腿 + 狮身
    `<path d="${tail}" fill="none" stroke="${p.line}" stroke-width="3.2" stroke-linecap="round"/><path d="${tail}" fill="none" stroke="#d99a3a" stroke-width="1.8" stroke-linecap="round"/>` +
    `<ellipse cx="10.8" cy="31.4" rx="2.8" ry="2.2" fill="#7a3e12" stroke="${p.line}" stroke-width=".5"/>` +
    both(solid(haunch, p, 'url(#lb)', .6)) +
    solid(lion, p, 'url(#lb)', .9) +
    `<path d="M-6.6,16 C-4.6,19.6 -2.2,21.2 0,21.4 M6.6,16 C4.6,19.6 2.2,21.2 0,21.4" fill="none" stroke="#7a4612" stroke-opacity=".6" stroke-width=".6"/>` +
    hl('M-6.8,-4 C-7.6,2 -7.8,8 -7.8,13', .9, .45) +
    // 鞍 + 骑士红披风（落在狮背上）
    `<path d="M-7.8,-3 C-4,-5 4,-5 7.8,-3 L8,1.4 C4,-.4 -4,-.4 -8,1.4 Z" fill="url(#gd)" stroke="${p.line}" stroke-width=".55"/>` +
    cloth(cape, p, 'url(#c2)', .7) + `<path d="M-5.8,14.4 C-3.6,16 3.6,16 5.8,14.4" fill="none" stroke="url(#gd)" stroke-width="1"/>` +
    `<path d="M-3,2 C-3.4,6 -3.4,10 -2.8,14 M3,2 C3.4,6 3.4,10 2.8,14" fill="none" stroke="#000" stroke-opacity=".3" stroke-width=".7"/>` +
    // 白色颈羽 + 金爪 + 鹰头
    solid(ruff, p, 'url(#wh)', .7) +
    `<path d="M-5,-10.2 C-5.4,-14 -3.6,-17.4 0,-18.6 M5,-10.2 C5.4,-14 3.6,-17.4 0,-18.6 M-2.4,-9 C-2.6,-12 -1.6,-14.6 0,-15.8 M2.4,-9 C2.6,-12 1.6,-14.6 0,-15.8" fill="none" stroke="#8a7a62" stroke-opacity=".7" stroke-width=".5"/>` +
    both(solid(talon, p, 'url(#gd)', .5)) +
    both(solid(ear, p, 'url(#wh)', .4)) +
    solid(head, p, 'url(#wh)', .7) + hl('M-3,-29.4 C-1.8,-30.4 -.6,-30.8 .6,-30.8', .7, .9) +
    solid(beak, p, 'url(#gd)', .5) + `<path d="M0,-35.4 L0,-30" stroke="#fff" stroke-opacity=".7" stroke-width=".4"/>` +
    `<circle cx="-2.7" cy="-26.4" r=".8" fill="#2a1000"/><circle cx="2.7" cy="-26.4" r=".8" fill="#2a1000"/>` +
    `<path d="M-4.2,-27.6 L-1.6,-27.2 M4.2,-27.6 L1.6,-27.2" stroke="#2a1000" stroke-width=".55"/>` +
    // 骑士：金肩甲 + 金盔 + 红羽（向后飘）
    both(`<circle cx="-5.2" cy="-2.4" r="3.1" fill="url(#gr)" stroke="${p.line}" stroke-width=".6"/>` + hl('M-6.8,-3.8 C-6,-4.6 -5,-4.8 -4.2,-4.6', .5, .8)) +
    `<path d="M0,-3.4 C2.2,-1.2 2.6,3.2 1.2,7.6 C.2,4.6 -1,1 0,-3.4 Z" fill="#ff4a3a" stroke="${p.line}" stroke-width=".45"/>` +
    `<circle cx="0" cy="-5" r="3.7" fill="url(#gr)" stroke="${p.line}" stroke-width=".7"/>` +
    `<path d="M-3.4,-4.4 C-1.4,-3.4 1.4,-3.4 3.4,-4.4" fill="none" stroke="${p.line}" stroke-opacity=".5" stroke-width=".5"/>` +
    hl('M-2.2,-6.8 C-1.6,-7.8 -.6,-8.2 .4,-8.2', .6, .9) +
    // 骑枪 + 小三角旗
    solid(lance, p, 'url(#gh)', .6) +
    `<path d="M8,-34 L13,-32.2 L8,-29.6 Z" fill="#ff4a3a" stroke="${p.line}" stroke-width=".4"/>` +
    `<path d="M5.6,-29.2 L10.4,-29.2 L9.4,-26.4 L6.6,-26.4 Z" fill="url(#gd)" stroke="${p.line}" stroke-width=".4"/>` +
    `<path d="${lanceTip}" fill="#ffd23a" opacity=".85" filter="url(#gl)"/>` + solid(lanceTip, p, 'url(#mt)', .5) +
    `<circle cx="8" cy="-.4" r="2" fill="url(#gr)" stroke="${p.line}" stroke-width=".5"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${-H} ${-H} ${H * 2} ${H * 2}">${defs(p, H)}<g transform="translate(0,1.2) scale(.97)">${body}</g>${sparkles([[-30, -14, 1.6], [27, 2, 1.4], [-4, 20, 1.2]])}</svg>`;
}

// ═════════ 矮人佣兵（礼物召唤）：背后视角，角盔、两侧大胡子、双手高举双刃战斧、背着圆盾，矮壮 ═════════
export function dwarfSvg(px) {
  const p = { ...BASE, ...CLS.tank, cloth: ['#d89058', '#8a4a22', '#2e1408'], cloth2: ['#c08050', '#6a3a18', '#24100a'], metal: ['#ffffff', '#d4dae4', '#7a8496', '#242a36'], gold: ['#ffe2b8', '#e88a48', '#8a4a1c', '#3a1a08'], line: '#140c08', glow: '#ffb46a', hi: '#ffe8c0' };
  const H = 33 * K;
  const boot = 'M-13.4,22 L-4.2,22 L-4.6,31.4 C-6.8,33.6 -11.4,33.6 -13.8,31.4 Z';
  const torso = 'M-15.6,-10 C-19.4,-4 -20.6,5 -20.2,13 L-22.4,24.4 C-14.4,28 14.4,28 22.4,24.4 L20.2,13 C20.6,5 19.4,-4 15.6,-10 C9.6,-13 -9.6,-13 -15.6,-10 Z';
  const skirtHem = 'M-22.4,24.4 C-20,26 -18.4,25.2 -16.8,26.4 C-14.6,27.8 -12.6,26.6 -10.6,27.6 C-8,28.6 -6,27.4 -3.6,28.2 C-1.6,28.8 1.6,28.8 3.6,28.2 C6,27.4 8,28.6 10.6,27.6 C12.6,26.6 14.6,27.8 16.8,26.4 C18.4,25.2 20,26 22.4,24.4';
  const fur = 'M-18.4,-12.4 C-22.4,-9 -23.6,-4.4 -22,-.4 C-20.4,-1.8 -18.8,-1.4 -18,.4 C-16.8,-1.6 -14.8,-1.4 -14,.6 C-12.8,-1.4 -10.8,-1.4 -10,.4 C-9,-1.6 -7,-1.4 -6,.2 L6,.2 C7,-1.4 9,-1.6 10,.4 C10.8,-1.4 12.8,-1.4 14,.6 C14.8,-1.4 16.8,-1.6 18,.4 C18.8,-1.4 20.4,-1.8 22,-.4 C23.6,-4.4 22.4,-9 18.4,-12.4 C12,-16 -12,-16 -18.4,-12.4 Z';
  const pauld = 'M-11.6,-13.4 C-16.4,-17 -25.4,-15.6 -27.6,-8.6 C-28.8,-3.4 -26.2,1.2 -21.6,1.8 C-19,-1.4 -15.6,-5.4 -11.6,-8.2 Z';
  const lame = 'M-27.6,-8.6 C-28.8,-3.4 -26.2,1.2 -21.6,1.8 C-19.6,-.6 -17.6,-3 -15.4,-5 C-19,-4.4 -24.6,-5.4 -27.6,-8.6 Z';
  // 双手高举战斧：斧柄竖直，斧头在头顶前方
  const shaft = rod(0, -17, 0, -44.4, 2.6, 2.2);
  const bladeR = 'M1.4,-41.8 C5.6,-44.6 11,-45 15.2,-42.8 C13,-38.6 13,-33.6 14.8,-29.4 C10.6,-28.2 5.8,-29.4 1.4,-32.4 Z';
  const armL = rod(-15.6, -9.6, -1.8, -30.2, 6, 4.8);
  const armR = rod(15.6, -9.6, 1.8, -24.8, 6, 4.8);
  const horn = 'M-6,-18.8 C-10.6,-20.2 -15.6,-20.4 -18.8,-23.2 C-20.6,-24.8 -21.6,-27.4 -21.8,-31.2 C-24,-28 -24.6,-23.2 -22,-19.6 C-18.8,-15.4 -12,-14.6 -6.8,-14 Z';
  const beard = 'M-5.4,-9.6 C-10,-11 -14,-8.2 -14.2,-3.6 C-14.4,.6 -12.6,3.8 -10.6,6.8 L-8.2,7 C-8.2,3.4 -7.4,.2 -4,-3.6 Z';
  const sil = both(sp(boot)) + sp(torso) + sp(fur) + sp(armL) + sp(armR) + both(sp(pauld)) + sp(shaft) + both(sp(bladeR)) + sp(circ(0, -13.2, 8.6)) + both(sp(horn)) + both(sp(beard)) + sp(circ(0, 4.6, 13.6));
  // 锁子甲鳞纹
  let mail = '';
  for (let r = 0; r < 13; r++) { const y = -8 + r * 2.6, off = r % 2 ? 1.6 : 0; for (let x = -22 + off; x < 22; x += 3.2) mail += `M${r2(x - 1.6)},${r2(y)} a1.6,1.6 0 0 0 3.2,0 `; }
  const rivets = Array.from({ length: 10 }, (_, i) => { const a = i * Math.PI / 5 + .3; return `<circle cx="${r2(Math.cos(a) * 12.1)}" cy="${r2(4.6 + Math.sin(a) * 12.1)}" r=".75" fill="${p.metal[0]}" stroke="${p.line}" stroke-width=".3"/>`; }).join('');
  const body =
    `<linearGradient id="bd" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb878"/><stop offset=".5" stop-color="#d4622a"/><stop offset="1" stop-color="#6a2a0c"/></linearGradient>` +
    `<linearGradient id="hn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset=".6" stop-color="#ead6a8"/><stop offset="1" stop-color="#8a6a3a"/></linearGradient>` +
    `<radialGradient id="wd" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#e8a464"/><stop offset=".6" stop-color="#a0582a"/><stop offset="1" stop-color="#4a220c"/></radialGradient>` +
    `<radialGradient id="cu" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#ffc898"/><stop offset=".55" stop-color="#d0703a"/><stop offset="1" stop-color="#5a2810"/></radialGradient>` +
    `<clipPath id="tc"><path d="${torso}"/></clipPath>` +
    `<g fill="${p.line}" stroke="${p.line}" stroke-width="3.2" stroke-linejoin="round">${sil}</g>` +
    both(solid(boot, p, 'url(#lt)', .7) + `<path d="M-13.2,28.2 L-4.6,28.2" stroke="url(#mh)" stroke-width="1.6"/>` + hl('M-11.8,23.4 L-12,27', .6, .45)) +
    // 锁子甲身体 + 皮带
    solid(torso, p, 'url(#mt)', 1) +
    `<g clip-path="url(#tc)"><path d="${mail}" fill="none" stroke="${p.metal[3]}" stroke-opacity=".55" stroke-width=".55"/><path d="${mail}" transform="translate(-.4,-.5)" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width=".35"/></g>` +
    `<path d="${torso}" fill="url(#sh)"/><path d="${torso}" fill="url(#sv)"/>` +
    `<path d="${skirtHem}" transform="translate(0,-1.5)" fill="none" stroke="url(#gd)" stroke-width="1.6"/>` +
    `<path d="M-20.4,13.4 C-12,16.4 12,16.4 20.4,13.4 L20.6,17.6 C12,20.6 -12,20.6 -20.6,17.6 Z" fill="url(#lt)" stroke="${p.line}" stroke-width=".7"/>` +
    both(`<rect x="-19.2" y="15" width="4.2" height="5.4" rx="1" fill="url(#lt)" stroke="${p.line}" stroke-width=".6"/><circle cx="-17.1" cy="16.4" r=".7" fill="url(#gr)"/>`) +
    // 毛皮披肩
    solid(fur, p, 'url(#cl)', .8) + `<path d="${fur}" fill="url(#sh)"/>` +
    `<path d="M-18,-9.6 C-18.6,-6.4 -18.6,-3.4 -18,-.6 M-12.6,-11.6 C-12.8,-8 -12.8,-4 -12,-.4 M12.6,-11.6 C12.8,-8 12.8,-4 12,-.4 M18,-9.6 C18.6,-6.4 18.6,-3.4 18,-.6" fill="none" stroke="#2a1206" stroke-opacity=".55" stroke-width=".75"/>` +
    hl('M-16.4,-12 C-10,-14.6 4,-15 12,-13.4', .9, .35) +
    // 背上圆盾（木板 + 铜漆 + 钢箍 + 盾心；头像徽章落在盾心）
    `<circle cx="0" cy="4.6" r="13.4" fill="url(#mt)" stroke="${p.line}" stroke-width="1"/>` +
    `<circle cx="0" cy="4.6" r="11.2" fill="url(#wd)" stroke="${p.line}" stroke-width=".6"/>` +
    `<path d="M0,4.6 L0,-6.6 A11.2,11.2 0 0 1 11.2,4.6 Z M0,4.6 L0,15.8 A11.2,11.2 0 0 1 -11.2,4.6 Z" fill="url(#cu)" opacity=".9"/>` +
    `<path d="M-5.6,-5.1 L-5.6,14.3 M5.6,-5.1 L5.6,14.3 M-9.8,-.6 L-9.8,9.8 M9.8,-.6 L9.8,9.8" stroke="#3a1a08" stroke-opacity=".45" stroke-width=".6"/>` +
    rivets +
    `<circle cx="0" cy="4.6" r="5" fill="url(#mr)" stroke="${p.line}" stroke-width=".8"/><circle cx="0" cy="4.6" r="2.4" fill="url(#gr)" stroke="${p.line}" stroke-width=".4"/>` +
    hl('M-11.8,.2 C-10.6,-3 -8.4,-5.4 -5.2,-7', 1, .7) +
    // 手臂（从肩膀伸向头顶的斧柄）
    cloth(armL, p, 'url(#c2)', .8) + cloth(armR, p, 'url(#c2)', .8) +
    solid(rod(-6.4, -23.4, -2.6, -29, 5.4, 5), p, 'url(#mh)', .6) + solid(rod(6.4, -19.4, 2.6, -24, 5.4, 5), p, 'url(#mh)', .6) +
    // 肩甲
    both(solid(pauld, p, 'url(#mr)', .9) + solid(lame, p, 'url(#mt)', .6) +
      `<path d="M-12,-12.8 C-16.6,-16 -24.4,-14.6 -26.8,-9" fill="none" stroke="url(#gd)" stroke-width="1.3"/>` +
      `<path d="M-14.4,-14 C-18.2,-15 -22.2,-13.8 -24.2,-10.8" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width=".75" stroke-linecap="round"/>` +
      `<circle cx="-18" cy="-8.8" r=".9" fill="url(#gr)" stroke="${p.line}" stroke-width=".3"/><circle cx="-23" cy="-6" r=".9" fill="url(#gr)" stroke="${p.line}" stroke-width=".3"/>`) +
    // 两侧大胡子（铜红辫子 + 金属扣）
    both(solid(beard, p, 'url(#bd)', .7) + `<path d="M-7.4,-7.8 C-10,-5.6 -10.8,-2.2 -9.8,1.6 M-9.6,-9.2 C-12,-7 -12.6,-3.6 -11.8,0" fill="none" stroke="#6a2a0c" stroke-opacity=".7" stroke-width=".55"/>` +
      hl('M-7,-9.6 C-10,-10 -12.4,-8.4 -13.2,-5.6', .6, .5) +
      `<rect x="-11.4" y="4.2" width="3.2" height="2.2" rx=".6" fill="url(#gh)" stroke="${p.line}" stroke-width=".4"/>`) +
    // 角盔
    both(solid(horn, p, 'url(#hn)', .7) + `<path d="M-10.6,-19.8 L-10.6,-15 M-14.8,-20.6 L-15.6,-16.2 M-18.6,-23 L-20.6,-19.6" stroke="#8a6a3a" stroke-width=".55"/>` +
      hl('M-8,-18.6 C-12.6,-19.4 -16.6,-20.6 -19.4,-23.8', .6, .8)) +
    `<circle cx="0" cy="-13.2" r="8.4" fill="url(#mr)" stroke="${p.line}" stroke-width=".9"/>` +
    `<path d="M-8.2,-11.2 C-4,-8.2 4,-8.2 8.2,-11.2 L8,-9.2 C4,-6.2 -4,-6.2 -8,-9.2 Z" fill="url(#gd)" stroke="${p.line}" stroke-width=".6"/>` +
    `<path d="M0,-21.4 L0,-8.6" stroke="${p.metal[3]}" stroke-opacity=".5" stroke-width="1.8"/><path d="M-.7,-21 L-.7,-9.2" stroke="#fff" stroke-opacity=".55" stroke-width=".5"/>` +
    hl('M-5.6,-18.4 C-4.2,-20 -2.4,-20.8 -1,-21', 1, .9) +
    // 战斧（柄 + 双刃 + 顶刺）
    solid(shaft, p, 'url(#lt)', .7) +
    `<path d="M-1.6,-44.4 L0,-47.6 L1.6,-44.4 Z" fill="url(#mt)" stroke="${p.line}" stroke-width=".5"/>` +
    `<g fill="${p.glow}" opacity=".35" filter="url(#gl)">${both(sp(bladeR))}</g>` +
    both(solid(bladeR, p, 'url(#mt)', .8) + `<path d="M14.6,-42.2 C12.6,-38.2 12.6,-33.6 14.2,-29.8" fill="none" stroke="#fff" stroke-width="1"/>` +
      `<path d="M3.6,-37.2 L12.4,-37" stroke="${p.gold[1]}" stroke-width=".9"/><circle cx="7.6" cy="-37.1" r="1.1" fill="url(#gr)" stroke="${p.line}" stroke-width=".3"/>`) +
    solid(rod(0, -29.6, 0, -43.4, 4.2, 3.6), p, 'url(#mh)', .6) +
    `<circle cx="0" cy="-36.6" r="1.8" fill="url(#gr)" stroke="${p.line}" stroke-width=".4"/>` +
    // 双手（皮手套握柄）
    `<ellipse cx="0" cy="-30" rx="3" ry="2.6" fill="url(#lt)" stroke="${p.line}" stroke-width=".7"/>` +
    `<ellipse cx="0" cy="-24.8" rx="3" ry="2.6" fill="url(#lt)" stroke="${p.line}" stroke-width=".7"/>` +
    hl('M-1.8,-31 L1,-31.4 M-1.8,-25.8 L1,-26.2', .5, .5);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="${r2(-H)} ${r2(-H)} ${r2(H * 2)} ${r2(H * 2)}">${defs(p, H)}<g transform="translate(0,1.8) scale(.955)">${body}</g></svg>`;
}
