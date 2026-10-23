// 星舰弹幕战 · 矢量美术（SVG 绘制，加载后栅格化缓存到离屏画布）
// 所有舰船统一「机头朝上」绘制，原点在中心；红方在画面上方，绘制时整体翻转。

const TEAM_COLORS = {
  red:  { base: '#ff4d5e', light: '#ffb0b6', deep: '#6e1020', glow: '#ff8a6b', metal: ['#4a2a32', '#2a161c', '#120a0e'] },
  blue: { base: '#3aa8ff', light: '#b3e0ff', deep: '#0b3566', glow: '#7fe3ff', metal: ['#2c3e58', '#172234', '#0a101c'] },
  npc:  { base: '#8a93a6', light: '#d3d8e2', deep: '#343a48', glow: '#b8c4dc', metal: ['#3c4250', '#242833', '#12141a'] },
};

// 涂装：0标准 1星尘 2极光 3暗金 4虹彩 5黑洞
function skinStyle(team, skin, npc) {
  const c = TEAM_COLORS[npc ? 'npc' : team];
  const s = {
    c,
    hull: ['#f3f6ff', c.light, c.base, '#1b2032'],
    wing: [c.metal[0], c.metal[2]],
    stripe: c.base, trim: '#070a14', canopy: ['#f2fdff', '#55c6ff', '#0b1c3a'],
    sparkle: false, aura: null, gold: false,
  };
  if (npc) return s;
  switch (skin) {
    case 1: s.hull = ['#ffffff', '#eef2fa', '#b9c3d8', '#4a5470']; s.wing = ['#e9eef8', '#8790a8']; s.trim = '#27304a'; s.sparkle = true; break;
    case 2: s.wing = ['#1f6464', '#0d2236']; s.stripe = 'url(#aurora)'; s.canopy = ['#efffff', '#6dffc8', '#0c2a33']; break;
    case 3: s.hull = ['#8a8a94', '#3a3a44', '#1c1c22', '#060608']; s.wing = ['#2e2e36', '#0c0c10']; s.stripe = '#ffcc4d'; s.trim = '#ffcc4d'; s.gold = true; s.canopy = ['#fff6d8', '#ffb43a', '#3a1c00']; break;
    case 4: s.stripe = 'url(#rainbow)'; s.trim = '#ffffff'; s.canopy = ['#ffffff', '#c58bff', '#1a0f3a']; break;
    case 5: s.hull = ['#6b5a99', '#2a2040', '#141020', '#050308']; s.wing = ['#221a36', '#07050c']; s.stripe = '#b066ff'; s.trim = '#c890ff'; s.aura = '#b066ff'; s.canopy = ['#f4e8ff', '#b066ff', '#12002a']; break;
    default: break;
  }
  return s;
}

function defs(s) {
  return `<defs>
    <linearGradient id="hull" x1="0" y1="-30" x2="0" y2="24" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${s.hull[0]}"/><stop offset=".3" stop-color="${s.hull[1]}"/><stop offset=".7" stop-color="${s.hull[2]}"/><stop offset="1" stop-color="${s.hull[3]}"/></linearGradient>
    <linearGradient id="hullSide" x1="-10" y1="0" x2="10" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#000" stop-opacity=".45"/><stop offset=".35" stop-color="#000" stop-opacity="0"/><stop offset=".6" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></linearGradient>
    <linearGradient id="wing" x1="0" y1="-8" x2="0" y2="20" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${s.wing[0]}"/><stop offset="1" stop-color="${s.wing[1]}"/></linearGradient>
    <radialGradient id="canopy" cx="-1.2" cy="-15" r="8" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${s.canopy[0]}"/><stop offset=".45" stop-color="${s.canopy[1]}"/><stop offset="1" stop-color="${s.canopy[2]}"/></radialGradient>
    <radialGradient id="nozzle"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="${s.c.glow}"/><stop offset="1" stop-color="${s.c.glow}" stop-opacity="0"/></radialGradient>
    <linearGradient id="aurora" x1="-28" y1="0" x2="28" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#6dffc8"/><stop offset=".5" stop-color="#4fd3ff"/><stop offset="1" stop-color="#9b7dff"/></linearGradient>
    <linearGradient id="rainbow" x1="-28" y1="0" x2="28" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ff5f6d"/><stop offset=".25" stop-color="#ffc371"/><stop offset=".5" stop-color="#5fffb0"/><stop offset=".75" stop-color="#5fb8ff"/><stop offset="1" stop-color="#c57bff"/></linearGradient>
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation=".7"/></filter>
  </defs>`;
}

const mirror = d => `<path d="${d}"/><path d="${d}" transform="scale(-1,1)"/>`;
function both(d, attrs) { return `<g ${attrs}>${mirror(d)}</g>`; }

function sparkles() {
  const star = (x, y, r) => `<path d="M${x},${y - r} L${x + r * .25},${y - r * .25} L${x + r},${y} L${x + r * .25},${y + r * .25} L${x},${y + r} L${x - r * .25},${y + r * .25} L${x - r},${y} L${x - r * .25},${y - r * .25}Z" fill="#ffffff"/>`;
  return `<g opacity=".95">${star(-18, 10, 2.2)}${star(16, 6, 1.6)}${star(3, -2, 1.4)}${star(-6, 14, 1.2)}${star(22, 14, 1.4)}</g>`;
}

// ───────── 战机：激光=游隼截击机，散弹=重炮艇，蓄力=长矛电磁炮 ─────────
export function fighterSvg(team, weapon, skin, npc, px) {
  const s = skinStyle(team, skin, npc);
  let wings, body, extras, nozzles, silhouette;
  if (weapon === 'spread') {
    const wing = 'M-7,-7 L-29,7 L-30,13 L-21,16 L-8,12 Z';
    const rear = 'M-7,11 L-19,19 L-17,23 L-7,19 Z';
    const fus = 'M0,-25 C4.4,-21 7.2,-13 8.2,-3 L9.4,13 L6.6,22 L-6.6,22 L-9.4,13 L-8.2,-3 C-7.2,-13 -4.4,-21 0,-25 Z';
    silhouette = mirror(wing) + mirror(rear) + `<path d="${fus}"/>`;
    wings = both(wing, `fill="url(#wing)" stroke="${s.trim}" stroke-width=".8"`) + both(rear, `fill="url(#wing)" stroke="${s.trim}" stroke-width=".7"`) +
      both('M-10,2 L-26,9 L-26,11.5 L-11,6 Z', `fill="${s.stripe}"`) +
      both('M-14,-2 L-17,12 M-21,2 L-23,13', 'stroke="#000" stroke-opacity=".35" stroke-width=".5" fill="none"');
    extras =
      // 翼下散弹炮舱（三管）
      both('M-23,-8 h5 a1.2,1.2 0 0 1 1.2,1.2 v13 h-7.4 v-13 a1.2,1.2 0 0 1 1.2,-1.2 Z', `fill="#2b3142" stroke="${s.trim}" stroke-width=".6"`) +
      both('M-22.6,-10.5 h1.4 v3 h-1.4 Z M-20.7,-11.5 h1.4 v4 h-1.4 Z M-18.8,-10.5 h1.4 v3 h-1.4 Z', 'fill="#c7cfdf"') +
      both('M-20,-11.8 m-1.6,0 a1.6,1.6 0 1 0 3.2,0 a1.6,1.6 0 1 0 -3.2,0', `fill="${s.c.glow}" opacity=".9" filter="url(#soft)"`);
    body = `<path d="${fus}" fill="url(#hull)" stroke="${s.trim}" stroke-width=".9"/><path d="${fus}" fill="url(#hullSide)"/>
      <path d="M-4,-4 L-4,18 M4,-4 L4,18 M-7,7 L7,7 M-6,14 L6,14" stroke="#000" stroke-opacity=".3" stroke-width=".5" fill="none"/>
      <path d="M0,-18 C3.4,-15 4,-10 3.6,-5 L-3.6,-5 C-4,-10 -3.4,-15 0,-18 Z" fill="url(#canopy)" stroke="#0a0f1c" stroke-width=".5"/>
      <path d="M-1.4,-15.5 C-.6,-13.5 -.7,-10.5 -1.3,-8" stroke="#fff" stroke-opacity=".85" stroke-width=".8" fill="none" stroke-linecap="round"/>
      <path d="M-2.6,-24 L0,-21 L2.6,-24" stroke="${s.stripe}" stroke-width="1.2" fill="none"/>`;
    nozzles = [-5, 0, 5].map(x => `<rect x="${x - 1.7}" y="21" width="3.4" height="2.6" rx=".6" fill="#2a2f3d"/><ellipse cx="${x}" cy="25" rx="2.4" ry="3.6" fill="url(#nozzle)"/>`).join('');
  } else if (weapon === 'charge') {
    const wing = 'M-5,7 L-25,-7 L-28,-4 L-15,14 L-6,17 Z';
    const fus = 'M0,-15 C4.2,-12 6.2,-5 6.2,4 L5.2,18 L3.2,23 L-3.2,23 L-5.2,18 L-6.2,4 C-6.2,-5 -4.2,-12 0,-15 Z';
    silhouette = mirror(wing) + `<path d="${fus}"/><rect x="-2" y="-31" width="4" height="20"/>`;
    wings = both(wing, `fill="url(#wing)" stroke="${s.trim}" stroke-width=".8"`) +
      both('M-8,6 L-23,-4 L-24.5,-2.5 L-10,9.5 Z', `fill="${s.stripe}"`) +
      both('M-12,3 L-16,13 M-18,-1 L-21,6', 'stroke="#000" stroke-opacity=".35" stroke-width=".5" fill="none"');
    extras =
      // 电磁轨道炮
      `<rect x="-2.2" y="-31" width="4.4" height="21" rx="1" fill="#3a4152" stroke="${s.trim}" stroke-width=".6"/>
       <rect x="-.7" y="-31" width="1.4" height="20" fill="${s.c.glow}" opacity=".85"/>
       ${[-27, -22, -17].map(y => `<ellipse cx="0" cy="${y}" rx="3.4" ry="1.1" fill="none" stroke="${s.c.glow}" stroke-width="1"/>`).join('')}
       <circle cx="0" cy="-31" r="2.6" fill="url(#nozzle)"/>` +
      // 储能舱
      both('M-11,6 m-3.2,0 a3.2,3.2 0 1 0 6.4,0 a3.2,3.2 0 1 0 -6.4,0', `fill="#22283a" stroke="${s.trim}" stroke-width=".6"`) +
      both('M-11,6 m-1.8,0 a1.8,1.8 0 1 0 3.6,0 a1.8,1.8 0 1 0 -3.6,0', `fill="${s.c.glow}" filter="url(#soft)"`);
    body = `<path d="${fus}" fill="url(#hull)" stroke="${s.trim}" stroke-width=".9"/><path d="${fus}" fill="url(#hullSide)"/>
      <path d="M-3,0 L-3,18 M3,0 L3,18 M-5,10 L5,10" stroke="#000" stroke-opacity=".3" stroke-width=".5" fill="none"/>
      <path d="M0,-10 C2.6,-8 3.2,-3.5 2.8,1 L-2.8,1 C-3.2,-3.5 -2.6,-8 0,-10 Z" fill="url(#canopy)" stroke="#0a0f1c" stroke-width=".5"/>
      <path d="M-1,-8 C-.4,-6.4 -.5,-4 -.9,-1.8" stroke="#fff" stroke-opacity=".85" stroke-width=".7" fill="none" stroke-linecap="round"/>`;
    nozzles = `<rect x="-2.4" y="22" width="4.8" height="2.4" rx=".6" fill="#2a2f3d"/><ellipse cx="0" cy="26" rx="3" ry="4.4" fill="url(#nozzle)"/>`;
  } else {
    const wing = 'M-4,-4 L-26,13 L-26,18 L-9,15.5 L-6,10 Z';
    const canard = 'M-4,-13 L-10.5,-7.5 L-10.5,-5.5 L-4,-7.5 Z';
    const fin = 'M4.6,9 L9.5,18.5 L5,18.5 Z';
    const fus = 'M0,-30 C2.6,-24 4.6,-16 5.4,-6 L6.4,12 L4.6,21 L-4.6,21 L-6.4,12 L-5.4,-6 C-4.6,-16 -2.6,-24 0,-30 Z';
    silhouette = mirror(wing) + mirror(canard) + `<path d="${fus}"/>`;
    wings = both(wing, `fill="url(#wing)" stroke="${s.trim}" stroke-width=".8"`) +
      both('M-9,6.5 L-23.5,15.4 L-23.5,17 L-10,10 Z', `fill="${s.stripe}"`) +
      both('M-11,4 L-14,15 M-17,9 L-19,16', 'stroke="#000" stroke-opacity=".35" stroke-width=".5" fill="none"') +
      both(canard, `fill="url(#wing)" stroke="${s.trim}" stroke-width=".6"`) +
      both(fin, `fill="${s.stripe}" stroke="${s.trim}" stroke-width=".5"`);
    extras =
      // 翼尖激光炮
      both('M-27.2,1 h2.4 a.8,.8 0 0 1 .8,.8 v12 h-4 v-12 a.8,.8 0 0 1 .8,-.8 Z', `fill="#c6cfe2" stroke="${s.trim}" stroke-width=".5"`) +
      both('M-26,1 m-1.5,0 a1.5,1.5 0 1 0 3,0 a1.5,1.5 0 1 0 -3,0', `fill="${s.c.glow}" filter="url(#soft)"`);
    body = `<path d="${fus}" fill="url(#hull)" stroke="${s.trim}" stroke-width=".9"/><path d="${fus}" fill="url(#hullSide)"/>
      <path d="M-2.8,-3 L-2.8,17 M2.8,-3 L2.8,17 M-5.2,5 L5.2,5 M-5.6,12 L5.6,12" stroke="#000" stroke-opacity=".3" stroke-width=".5" fill="none"/>
      <path d="M0,-21 C2.4,-18 3,-13 2.6,-8 L-2.6,-8 C-3,-13 -2.4,-18 0,-21 Z" fill="url(#canopy)" stroke="#0a0f1c" stroke-width=".5"/>
      <path d="M-1,-18.5 C-.3,-16.5 -.4,-13.5 -.9,-11" stroke="#fff" stroke-opacity=".85" stroke-width=".75" fill="none" stroke-linecap="round"/>
      <path d="M0,-29 L0,-24" stroke="${s.stripe}" stroke-width="1.4"/>`;
    nozzles = [-2.5, 2.5].map(x => `<rect x="${x - 1.6}" y="20.4" width="3.2" height="2.6" rx=".6" fill="#2a2f3d"/><ellipse cx="${x}" cy="24.4" rx="2.2" ry="3.4" fill="url(#nozzle)"/>`).join('');
  }
  const aura = s.aura ? `<g fill="none" stroke="${s.aura}" stroke-width="3.2" opacity=".85" filter="url(#blur)">${silhouette}</g>` : '';
  const goldEdge = s.gold ? `<g fill="none" stroke="#ffe08a" stroke-width=".6" opacity=".9">${silhouette}</g>` : '';
  const nav = `<circle cx="-24" cy="16.5" r="1" fill="#ff5a5a"/><circle cx="24" cy="16.5" r="1" fill="#5aff9b"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-34 -34 68 68">${defs(s)}
    ${aura}${nozzles}${wings}${extras}${body}${goldEdge}${s.sparkle ? sparkles() : ''}${weapon === 'laser' ? nav : ''}</svg>`;
}

// ───────── 召唤战舰（礼物战舰，带金边） ─────────
export function battleshipSvg(team, pxW, pxH) {
  const c = TEAM_COLORS[team];
  const lights = (pts) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="${c.glow}"/>`).join('');
  const hull = 'M0,-58 L9,-46 L15,-22 L21,8 L24,34 L17,48 L-17,48 L-24,34 L-21,8 L-15,-22 L-9,-46 Z';
  const spon = 'M-15,-2 L-58,14 L-72,26 L-70,34 L-50,34 L-18,30 Z';
  const turret = (y, r) => `<g transform="translate(0,${y})">
      <rect x="-3.2" y="${-r - 9}" width="2.2" height="${r + 5}" rx=".6" fill="#c9d1e2" stroke="#0a0e18" stroke-width=".4"/>
      <rect x="1" y="${-r - 9}" width="2.2" height="${r + 5}" rx=".6" fill="#c9d1e2" stroke="#0a0e18" stroke-width=".4"/>
      <circle r="${r}" fill="url(#dome)" stroke="#ffd86b" stroke-width=".8"/>
      <circle r="${r * .35}" fill="${c.glow}" opacity=".9"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}" viewBox="-80 -64 160 128">
  <defs>
    <linearGradient id="h" x1="0" y1="-58" x2="0" y2="48" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff6dc"/><stop offset=".2" stop-color="${c.light}"/><stop offset=".55" stop-color="${c.base}"/><stop offset="1" stop-color="${c.deep}"/></linearGradient>
    <linearGradient id="hs" x1="-24" y1="0" x2="24" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
    <linearGradient id="deck" x1="0" y1="-50" x2="0" y2="20" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3d4560"/><stop offset="1" stop-color="#151a28"/></linearGradient>
    <linearGradient id="sp" x1="0" y1="-4" x2="0" y2="34" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c.metal[0]}"/><stop offset="1" stop-color="${c.metal[2]}"/></linearGradient>
    <radialGradient id="dome" cx="-1.5" cy="-1.5" r="8" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#e9eef8"/><stop offset=".5" stop-color="#5b6680"/><stop offset="1" stop-color="#1a1f2d"/></radialGradient>
    <radialGradient id="noz"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="${c.glow}"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/></radialGradient>
    <filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter>
  </defs>
  <g opacity=".75" filter="url(#b)"><path d="${hull}" fill="none" stroke="#ffd86b" stroke-width="4"/></g>
  ${[-22, 0, 22].map(x => `<ellipse cx="${x}" cy="56" rx="${x ? 5 : 7}" ry="${x ? 9 : 12}" fill="url(#noz)"/>`).join('')}
  ${both(spon, 'fill="url(#sp)" stroke="#ffd86b" stroke-width="1"')}
  ${both('M-24,10 L-60,22 L-62,25 L-24,15 Z', `fill="${c.base}"`)}
  ${both('M-38,18 h10 v8 h-10 Z M-52,22 h9 v7 h-9 Z', 'fill="#1b2030" stroke="#0a0d16" stroke-width=".6"')}
  ${both('M-36,19.5 h2 v5 h-2 Z M-32,19.5 h2 v5 h-2 Z M-50,23.5 h2 v4 h-2 Z M-46,23.5 h2 v4 h-2 Z', `fill="${c.glow}" opacity=".85"`)}
  ${both('M-66,26 m-2,0 a2,2 0 1 0 4,0 a2,2 0 1 0 -4,0', `fill="${c.glow}"`)}
  <path d="${hull}" fill="url(#h)" stroke="#ffd86b" stroke-width="1.4"/>
  <path d="${hull}" fill="url(#hs)"/>
  <path d="M0,-50 L7,-40 L11,-18 L15,12 L-15,12 L-11,-18 L-7,-40 Z" fill="url(#deck)" stroke="#0a0e18" stroke-width=".7"/>
  <path d="M-12,-10 L12,-10 M-14,4 L14,4 M0,-48 L0,12" stroke="#000" stroke-opacity=".35" stroke-width=".6"/>
  <path d="M-6,-54 L0,-47 L6,-54" fill="none" stroke="#ffd86b" stroke-width="1.6"/>
  ${both('M-9,-40 L-16,-16 L-14,-16 L-7.5,-38 Z', `fill="${c.base}" opacity=".9"`)}
  ${turret(-26, 6.2)}${turret(-2, 6.8)}
  <g transform="translate(0,26)">
    <path d="M-12,-8 L12,-8 L15,12 L-15,12 Z" fill="#232a3c" stroke="#ffd86b" stroke-width="1"/>
    <rect x="-9" y="-4" width="18" height="3" fill="${c.glow}" opacity=".9"/>
    <rect x="-7" y="2" width="14" height="2" fill="${c.glow}" opacity=".6"/>
    <path d="M-4,-8 L-3,-16 L3,-16 L4,-8" fill="#2f3850" stroke="#0a0e18" stroke-width=".6"/>
    <line x1="0" y1="-16" x2="0" y2="-24" stroke="#c9d1e2" stroke-width="1"/><circle cx="0" cy="-24" r="1.4" fill="#ff6060"/>
  </g>
  ${lights([[-18, 20], [-19.5, 28], [-20.5, 36], [18, 20], [19.5, 28], [20.5, 36], [-12, -30], [12, -30], [-14, -20], [14, -20]])}
  ${[-22, 0, 22].map(x => `<rect x="${x - 4.5}" y="46" width="9" height="5" rx="1.2" fill="#2a2f3d" stroke="#0a0e18" stroke-width=".5"/>`).join('')}
</svg>`;
}

// ───────── 旗舰（宇宙要塞），赤焰棱角、苍穹流线 ─────────
export function flagshipSvg(team, pxW, pxH) {
  const c = TEAM_COLORS[team];
  const red = team === 'red';
  const hull = red
    ? 'M-252,76 L-214,10 L-124,-10 L-76,-54 L-30,-70 L30,-70 L76,-54 L124,-10 L214,10 L252,76 Z'
    : 'M-252,76 C-240,30 -200,6 -128,-8 C-96,-30 -64,-62 0,-72 C64,-62 96,-30 128,-8 C200,6 240,30 252,76 Z';
  const lead = red
    ? 'M-214,10 L-124,-10 L-76,-54 L-30,-70 L30,-70 L76,-54 L124,-10 L214,10'
    : 'M-240,30 C-200,6 -128,-8 -128,-8 C-96,-30 -64,-62 0,-72 C64,-62 96,-30 128,-8 C128,-8 200,6 240,30';
  const prong = red
    ? 'M-298,74 L-312,30 L-268,-26 L-240,-66 L-222,-34 L-206,12 L-160,40 Z'
    : 'M-296,74 C-312,40 -300,-8 -262,-44 C-250,-58 -236,-62 -228,-52 C-222,-20 -208,10 -160,40 Z';
  const spine = 'M-34,-24 L34,-24 L50,62 L-50,62 Z';
  const tower = red ? 'M-112,-16 L-92,-44 L-62,-44 L-56,-8 L-80,4 Z' : 'M-112,-12 C-104,-34 -92,-46 -70,-46 C-60,-30 -56,-18 -56,-8 L-80,4 Z';
  const strut = 'M-132,0 L-150,-22 L-190,-22 L-206,8 Z';
  const pad = x => `<g transform="translate(${x},-38)">
      <path d="M-31,8 L-25,-16 L25,-16 L31,8 L19,24 L-19,24 Z" fill="url(#pad)" stroke="#0a0d16" stroke-width="1.5"/>
      <path d="M-25,-16 L25,-16" stroke="${c.glow}" stroke-width="2" stroke-opacity=".8"/>
      <circle r="25" fill="none" stroke="${c.glow}" stroke-opacity=".45" stroke-width="1.2" stroke-dasharray="4 4"/>
      <rect x="-27" y="12" width="6" height="3" fill="${c.glow}" opacity=".8"/><rect x="21" y="12" width="6" height="3" fill="${c.glow}" opacity=".8"/></g>`;
  const windows = (x0, y0, n, dx) => Array.from({ length: n }, (_, i) => `<rect x="${x0 + i * dx}" y="${y0}" width="2.4" height="5" rx=".6" fill="${c.glow}" opacity="${0.5 + (i % 3) * 0.18}"/>`).join('');
  const engines = [-190, -132, -74, 74, 132, 190].map(x => `<rect x="${x - 15}" y="66" width="30" height="16" rx="3" fill="#1d2232" stroke="#05070d" stroke-width="1"/>
      <ellipse cx="${x}" cy="90" rx="13" ry="10" fill="url(#noz)"/>`).join('') +
      `<rect x="-26" y="64" width="52" height="20" rx="4" fill="#1d2232" stroke="#05070d" stroke-width="1"/><ellipse cx="0" cy="92" rx="22" ry="12" fill="url(#noz)"/>`;
  const spikes = red ? both('M-118,-14 L-104,-68 L-94,-24 Z', `fill="url(#arm)" stroke="${c.base}" stroke-width="1.2"`) + both('M-228,-2 L-236,-50 L-214,-4 Z', `fill="url(#arm)" stroke="${c.base}" stroke-width="1"`)
    : both('M-118,-10 C-116,-38 -108,-56 -100,-62 C-98,-46 -96,-30 -92,-16 Z', `fill="url(#arm)" stroke="${c.base}" stroke-width="1.2"`);
  const hazard = Array.from({ length: 10 }, (_, i) => `<path d="M${-100 + i * 20},50 l8,0 l-8,9 l-8,0 Z" fill="#ffcc4d" opacity=".6"/>`).join('');
  const greebles = [[-200, 30, 18, 8], [-176, 44, 14, 10], [-150, 22, 22, 7], [-120, 36, 16, 12], [-96, 20, 12, 8], [96, 20, 12, 8], [120, 36, 16, 12], [150, 22, 22, 7], [176, 44, 14, 10], [200, 30, 18, 8], [-226, 56, 20, 8], [226, 56, 20, 8]]
    .map(([x, y, w, h]) => `<rect x="${x - w / 2}" y="${y}" width="${w}" height="${h}" rx="1.5" fill="url(#arm)" stroke="#05070d" stroke-width=".8"/><rect x="${x - w / 2 + 2}" y="${y + 2}" width="${w - 4}" height="1.4" fill="#fff" opacity=".18"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}" viewBox="-320 -100 640 200">
  <defs>
    <linearGradient id="met" x1="0" y1="-72" x2="0" y2="80" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#6a7594"/><stop offset=".35" stop-color="${c.metal[0]}"/><stop offset=".75" stop-color="${c.metal[1]}"/><stop offset="1" stop-color="${c.metal[2]}"/></linearGradient>
    <linearGradient id="arm" x1="0" y1="-60" x2="0" y2="62" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#7a86a6"/><stop offset=".45" stop-color="#363e58"/><stop offset="1" stop-color="#141826"/></linearGradient>
    <linearGradient id="pad" x1="0" y1="-16" x2="0" y2="24" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#68738f"/><stop offset="1" stop-color="#1a1f2e"/></linearGradient>
    <linearGradient id="spine" x1="0" y1="-24" x2="0" y2="62" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#58627f"/><stop offset="1" stop-color="#171b2a"/></linearGradient>
    <linearGradient id="shine" x1="-250" y1="0" x2="250" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".3" stop-color="#fff" stop-opacity=".04"/><stop offset=".5" stop-color="#fff" stop-opacity=".16"/><stop offset=".7" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>
    <pattern id="plate" width="36" height="18" patternUnits="userSpaceOnUse" x="-18" y="0">
      <rect width="36" height="18" fill="none"/>
      <path d="M0,.5 H36 M.5,0 V18 M18,9 V18 M0,9.5 H18" stroke="#000" stroke-opacity=".35" stroke-width="1"/>
      <path d="M1,1.5 H35 M1.5,1 V17" stroke="#fff" stroke-opacity=".07" stroke-width="1"/>
      <circle cx="4" cy="5" r=".9" fill="#fff" fill-opacity=".18"/><circle cx="32" cy="5" r=".9" fill="#fff" fill-opacity=".18"/>
      <rect x="22" y="11" width="9" height="3" fill="#000" fill-opacity=".25"/>
    </pattern>
    <clipPath id="hc"><path d="${hull}"/></clipPath>
    <radialGradient id="noz"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="${c.glow}"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/></radialGradient>
    <radialGradient id="socket" cx="0" cy="-12" r="54" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#05070d"/><stop offset=".6" stop-color="#0d1120"/><stop offset=".78" stop-color="#4a5576"/><stop offset=".9" stop-color="#232a40"/><stop offset="1" stop-color="#121624"/></radialGradient>
    <filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
    <filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
  </defs>
  <g filter="url(#glow)" opacity=".75"><path d="${hull}" fill="none" stroke="${c.base}" stroke-width="7"/>${both(prong, `fill="none" stroke="${c.base}" stroke-width="5"`)}</g>
  ${engines}
  ${both(prong, `fill="url(#met)" stroke="${c.base}" stroke-width="2"`)}
  <g clip-path="url(#hc)">${both(prong, 'fill="url(#plate)"')}</g>
  ${both(red ? 'M-284,44 L-264,-8 L-246,-40' : 'M-284,46 C-286,14 -272,-18 -252,-38', `fill="none" stroke="${c.glow}" stroke-width="2.5" stroke-opacity=".85"`)}
  ${both(red ? 'M-240,-66 m-3,0 a3,3 0 1 0 6,0 a3,3 0 1 0 -6,0' : 'M-232,-56 m-3,0 a3,3 0 1 0 6,0 a3,3 0 1 0 -6,0', `fill="${c.glow}"`)}
  <path d="${hull}" fill="url(#met)" stroke="${c.base}" stroke-width="2.5"/>
  <g clip-path="url(#hc)"><rect x="-260" y="-80" width="520" height="160" fill="url(#plate)"/></g>
  <path d="${hull}" fill="url(#shine)"/>
  ${both(strut, 'fill="url(#arm)" stroke="#05070d" stroke-width="1"')}
  ${both('M-150,-22 L-190,-22', `stroke="${c.glow}" stroke-width="1.5" stroke-opacity=".7"`)}
  ${spikes}
  ${both(tower, 'fill="url(#arm)" stroke="#05070d" stroke-width="1.2"')}
  ${windows(-104, -30, 4, 9)}${windows(68, -30, 4, 9)}
  <path d="${spine}" fill="url(#spine)" stroke="#05070d" stroke-width="1.2"/>
  ${[0, 12, 24, 36, 48].map(y => `<rect x="${-30 - y * 0.18}" y="${y}" width="${60 + y * 0.36}" height="4" rx="1" fill="#0b0e18" opacity=".7"/><rect x="${-26 - y * 0.18}" y="${y + 1}" width="${52 + y * 0.36}" height="1.2" fill="${c.glow}" opacity=".35"/>`).join('')}
  ${greebles}
  ${hazard}
  ${windows(-196, 14, 6, 8)}${windows(150, 14, 6, 8)}
  <path d="${lead}" fill="none" stroke="${c.glow}" stroke-width="5" stroke-opacity=".55" filter="url(#soft)"/>
  <path d="${lead}" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-opacity=".7"/>
  ${pad(-170)}${pad(170)}
  <circle cx="0" cy="-12" r="54" fill="url(#socket)" stroke="${c.base}" stroke-width="3"/>
  ${Array.from({ length: 12 }, (_, i) => `<rect x="-2.6" y="-62" width="5.2" height="11" rx="1" fill="${c.glow}" opacity=".9" transform="translate(0,-12) rotate(${i * 30}) translate(0,12)"/>`).join('')}
  <circle cx="0" cy="-12" r="36" fill="none" stroke="${c.glow}" stroke-opacity=".55" stroke-width="1.5" stroke-dasharray="6 5"/>
  ${both('M-38,-64 L-32,-86 L-27,-86 L-29,-64 Z', `fill="#4a5578" stroke="${c.base}" stroke-width="1"`)}
  ${both('M-29.5,-86 m-2.6,0 a2.6,2.6 0 1 0 5.2,0 a2.6,2.6 0 1 0 -5.2,0', `fill="${c.glow}"`)}
</svg>`;
}

// ───────── 旗舰炮台（炮管朝上，绘制时按瞄准方向旋转） ─────────
export function turretSvg(team, px, dead) {
  const c = TEAM_COLORS[team];
  if (dead) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-32 -32 64 64">
    <defs><radialGradient id="scorch"><stop offset="0" stop-color="#000" stop-opacity=".9"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
    <circle r="28" fill="url(#scorch)"/>
    <path d="M-20,-8 L-12,-20 L10,-20 L20,-8 L20,10 L10,20 L-12,20 L-20,10 Z" fill="#2a2d36" stroke="#55596a" stroke-width="1.2"/>
    <path d="M-12,-6 L-2,-2 L-8,8 M4,-10 L8,2 L16,4 M-4,6 L6,12" stroke="#ff8a3a" stroke-opacity=".7" stroke-width="1.2" fill="none"/>
    <path d="M-5,-4 L-9,-18 L-6,-19 Z M3,-2 L10,-14 L12,-12 Z" fill="#5b6070"/>
    </svg>`;
  }
  const bolts = Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4 + Math.PI / 8; return `<circle cx="${(Math.cos(a) * 20).toFixed(2)}" cy="${(Math.sin(a) * 20).toFixed(2)}" r="1.3" fill="#8d97b0"/>`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-32 -32 64 64">
  <defs>
    <linearGradient id="base" x1="0" y1="-24" x2="0" y2="24" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4b5573"/><stop offset="1" stop-color="#151a29"/></linearGradient>
    <radialGradient id="dome" cx="-4" cy="-4" r="16" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#eef2fb"/><stop offset=".35" stop-color="${c.light}"/><stop offset=".7" stop-color="${c.base}"/><stop offset="1" stop-color="${c.deep}"/></radialGradient>
    <linearGradient id="barrel" x1="-3" y1="0" x2="3" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5b6478"/><stop offset=".5" stop-color="#e3e8f2"/><stop offset="1" stop-color="#4a5266"/></linearGradient>
    <radialGradient id="muz"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="${c.glow}"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/></radialGradient>
  </defs>
  <path d="M-24,-10 L-10,-24 L10,-24 L24,-10 L24,10 L10,24 L-10,24 L-24,10 Z" fill="url(#base)" stroke="#0a0d16" stroke-width="1.2"/>
  <circle r="21" fill="none" stroke="${c.base}" stroke-width="1.6" stroke-opacity=".9"/>
  ${bolts}
  <rect x="-7.2" y="-31" width="5" height="22" rx="1.2" fill="url(#barrel)" stroke="#0a0d16" stroke-width=".7"/>
  <rect x="2.2" y="-31" width="5" height="22" rx="1.2" fill="url(#barrel)" stroke="#0a0d16" stroke-width=".7"/>
  <rect x="-7.6" y="-24" width="5.8" height="2" fill="${c.base}"/><rect x="1.8" y="-24" width="5.8" height="2" fill="${c.base}"/>
  <circle cx="-4.7" cy="-31" r="3.2" fill="url(#muz)"/><circle cx="4.7" cy="-31" r="3.2" fill="url(#muz)"/>
  <circle r="13" fill="url(#dome)" stroke="#0a0d16" stroke-width="1"/>
  <path d="M-9,-3 A9,9 0 0 1 3,-8.5" stroke="#fff" stroke-opacity=".7" stroke-width="1.4" fill="none" stroke-linecap="round"/>
  <circle r="4" fill="#0b0f1a"/><circle r="2.2" fill="${c.glow}"/>
  </svg>`;
}

// ───────── 护卫僚机 ─────────
export function droneSvg(team, px) {
  const c = TEAM_COLORS[team];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-14 -14 28 28">
  <defs><radialGradient id="o" cx="-2" cy="-2" r="8" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="${c.light}"/><stop offset="1" stop-color="${c.deep}"/></radialGradient>
  <radialGradient id="g"><stop offset="0" stop-color="${c.glow}" stop-opacity=".9"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/></radialGradient></defs>
  <circle r="13" fill="url(#g)"/>
  ${both('M-5,2 L-12,-4 L-12,1 L-6,6 Z', `fill="#c9d1e2" stroke="${c.deep}" stroke-width=".6"`)}
  <rect x="-1.2" y="-13" width="2.4" height="8" rx=".8" fill="#dfe6f2"/>
  <circle r="6.5" fill="url(#o)" stroke="#0a0d16" stroke-width=".7"/>
  <circle r="2.3" fill="#fff"/>
  </svg>`;
}

// ───────── 前三名勋章 ─────────
const MEDAL = [['#fff4c2', '#ffd24a', '#a8730a'], ['#ffffff', '#cfd8e6', '#7d8799'], ['#ffe2c8', '#e09356', '#7c4417']];
export function medalSvg(rank, px) {
  const [a, b, d] = MEDAL[rank] || MEDAL[2];
  const id = `m${rank}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-12 -13 24 26">
  <defs><radialGradient id="${id}" cx="-2" cy="-1" r="9" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${d}"/></radialGradient></defs>
  <path d="M-7,-13 L-2,-13 L1,-4 L-3,-2 Z" fill="#e2394f"/><path d="M7,-13 L2,-13 L-1,-4 L3,-2 Z" fill="#2f7cf0"/>
  <circle cy="3" r="8.6" fill="url(#${id})" stroke="${d}" stroke-width="1"/>
  <circle cy="3" r="6.4" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".6"/>
  <path d="M0,-2.2 L1.5,1.1 L5,1.4 L2.3,3.7 L3.1,7.2 L0,5.4 L-3.1,7.2 L-2.3,3.7 L-5,1.4 L-1.5,1.1 Z" fill="#fff" fill-opacity=".92" stroke="${d}" stroke-width=".4"/>
  </svg>`;
}

// ───────── 页面用的小徽章（内联 SVG） ─────────
export function emblemSvg(team, size = 28) {
  const c = TEAM_COLORS[team];
  const id = `em-${team}`;
  const shape = team === 'red'
    ? 'M0,-13 C3,-8 9,-6 13,-8 C11,-2 8,3 3,6 L0,13 L-3,6 C-8,3 -11,-2 -13,-8 C-9,-6 -3,-8 0,-13 Z'
    : 'M0,-13 C5,-9 10,-9 14,-5 C10,-3 7,1 5,6 L0,13 L-5,6 C-7,1 -10,-3 -14,-5 C-10,-9 -5,-9 0,-13 Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" class="emblem" width="${size}" height="${size}" viewBox="-15 -15 30 30" aria-hidden="true">
  <defs><linearGradient id="${id}" x1="0" y1="-13" x2="0" y2="13" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="${c.light}"/><stop offset="1" stop-color="${c.base}"/></linearGradient></defs>
  <path d="${shape}" fill="url(#${id})" stroke="${c.deep}" stroke-width="1"/>
  <path d="M0,-7 L2.2,0 L0,7 L-2.2,0 Z" fill="${c.deep}" opacity=".8"/>
  </svg>`;
}

export function logoSvg(size = 120) {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="logo" width="${size}" height="${size * 0.62}" viewBox="-100 -62 200 124" aria-hidden="true">
  <defs>
    <linearGradient id="lg-wing" x1="-100" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff4d5e"/><stop offset=".45" stop-color="#ffffff"/><stop offset=".55" stop-color="#ffffff"/><stop offset="1" stop-color="#3aa8ff"/></linearGradient>
    <linearGradient id="lg-core" x1="0" y1="-50" x2="0" y2="40" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff6d0"/><stop offset=".5" stop-color="#ffd86b"/><stop offset="1" stop-color="#a86a00"/></linearGradient>
    <filter id="lg-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>
  </defs>
  <g filter="url(#lg-glow)" opacity=".75"><path d="M0,-50 L18,-10 L96,-2 L40,16 L0,52 L-40,16 L-96,-2 L-18,-10 Z" fill="url(#lg-wing)"/></g>
  <path d="M-96,-2 L-18,-10 L-8,10 L-40,16 Z" fill="url(#lg-wing)" stroke="#0a0d16" stroke-width="1.5"/>
  <path d="M96,-2 L18,-10 L8,10 L40,16 Z" fill="url(#lg-wing)" stroke="#0a0d16" stroke-width="1.5"/>
  <path d="M-70,6 L-20,0 M70,6 L20,0" stroke="#0a0d16" stroke-opacity=".5" stroke-width="1.5"/>
  <path d="M0,-52 L16,-8 L10,26 L0,48 L-10,26 L-16,-8 Z" fill="url(#lg-core)" stroke="#3a2600" stroke-width="1.5"/>
  <path d="M0,-34 L6,-8 L0,18 L-6,-8 Z" fill="#fff" opacity=".85"/>
  <circle cx="0" cy="-8" r="4" fill="#ff4d5e"/><circle cx="0" cy="8" r="3" fill="#3aa8ff"/>
  </svg>`;
}

export function gearSvg() {
  const teeth = Array.from({ length: 8 }, (_, i) => `<rect x="-2.6" y="-12" width="5.2" height="5" rx="1.2" transform="rotate(${i * 45})"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="-13 -13 26 26" aria-hidden="true">
  <defs><linearGradient id="gear-g" x1="0" y1="-12" x2="0" y2="12" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#e8eeff"/><stop offset="1" stop-color="#7d8bb0"/></linearGradient></defs>
  <g fill="url(#gear-g)">${teeth}<circle r="8.6"/></g>
  <circle r="3.6" fill="#0d1222"/><circle r="8.6" fill="none" stroke="#0d1222" stroke-opacity=".35" stroke-width="1"/>
  </svg>`;
}

// ───────── 弹幕子弹：米粒弹、苦无弹、光球、星弹（尖端朝上 = 飞行方向） ─────────
export function bulletSvg(shape, color, px) {
  const glow = `<filter id="g" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="2.2"/></filter>`;
  let body;
  switch (shape) {
    case 'rice':
      body = `<ellipse rx="5.5" ry="11.5" fill="${color}" filter="url(#g)" opacity=".95"/>
        <ellipse rx="4" ry="9.5" fill="${color}"/><ellipse rx="2.4" ry="7" fill="#fff"/>`;
      break;
    case 'kunai':
      body = `<path d="M0,-13 L6,1 L2.4,0 L2.4,11 L-2.4,11 L-2.4,0 L-6,1 Z" fill="${color}" filter="url(#g)"/>
        <path d="M0,-12 L5,0.5 L2,-.4 L2,10 L-2,10 L-2,-.4 L-5,.5 Z" fill="${color}"/>
        <path d="M0,-9 L2.6,-1 L0,-2 L-2.6,-1 Z M-.9,0 h1.8 v8 h-1.8 Z" fill="#fff"/>`;
      break;
    case 'star':
      body = `<path d="M0,-11 L3,-3 L11,0 L3,3 L0,11 L-3,3 L-11,0 L-3,-3 Z" fill="${color}" filter="url(#g)"/>
        <path d="M0,-10 L2.6,-2.6 L10,0 L2.6,2.6 L0,10 L-2.6,2.6 L-10,0 L-2.6,-2.6 Z" fill="${color}"/>
        <circle r="3.4" fill="#fff"/>`;
      break;
    default:
      body = `<circle r="11" fill="${color}" filter="url(#g)" opacity=".9"/>
        <circle r="8" fill="${color}"/><circle r="8" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1"/>
        <circle r="5" fill="#fff"/>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-16 -16 32 32"><defs>${glow}</defs>${body}</svg>`;
}

// ───────── 异形（讨伐模式）：机头朝下（+y）绘制 ─────────
const BIO = { shell: ['#b35ee6', '#5a1d80', '#1c0629'], glow: '#c45cff', acid: '#8dff5a', eye: '#ffe14d', dark: '#12041c' };

export function alienSvg(kind, px) {
  const head = `<defs>
    <radialGradient id="c" cx="-3" cy="-6" r="22" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${BIO.shell[0]}"/><stop offset=".45" stop-color="${BIO.shell[1]}"/><stop offset="1" stop-color="${BIO.shell[2]}"/></radialGradient>
    <radialGradient id="mag" cx="-2" cy="-6" r="20" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff9be6"/><stop offset=".45" stop-color="#c2268f"/><stop offset="1" stop-color="#3a0629"/></radialGradient>
    <radialGradient id="eye"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="${BIO.eye}"/><stop offset="1" stop-color="#ff7a00"/></radialGradient>
    <radialGradient id="acid"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="${BIO.acid}"/><stop offset="1" stop-color="${BIO.acid}" stop-opacity="0"/></radialGradient>
    <filter id="g" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.4"/></filter></defs>`;
  if (kind === 'diver') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-18 -18 36 36">${head}
      <ellipse cx="0" cy="-14" rx="5" ry="6" fill="url(#acid)"/>
      ${both('M-4,-8 L-14,-15 L-11,-3 Z', `fill="${BIO.acid}" fill-opacity=".55" stroke="${BIO.acid}" stroke-width=".6"`)}
      ${both('M-5,1 L-12,6 L-4,6 Z', `fill="#7a1a5a" stroke="${BIO.dark}" stroke-width=".6"`)}
      <path d="M0,17 L5.6,2 L4.4,-11 L0,-16 L-4.4,-11 L-5.6,2 Z" fill="url(#mag)" stroke="${BIO.dark}" stroke-width=".9"/>
      <path d="M-4,-4 Q0,-2 4,-4 M-4.6,3 Q0,5 4.6,3" stroke="#ff9be6" stroke-opacity=".6" stroke-width=".7" fill="none"/>
      <ellipse cx="0" cy="9" rx="2.2" ry="3.4" fill="url(#eye)"/><ellipse cx="0" cy="9.4" rx=".7" ry="2.4" fill="${BIO.dark}"/>
    </svg>`;
  }
  if (kind === 'gunner') {
    const legs = both('M-12,-4 C-20,-10 -24,-4 -25,2 M-13,2 C-22,0 -25,8 -24,13 M-12,7 C-19,10 -20,17 -17,21', `stroke="${BIO.shell[1]}" stroke-width="2.4" fill="none" stroke-linecap="round"`);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-28 -28 56 56">${head}
      ${legs}
      ${both('M-11,8 C-20,13 -19,23 -10,24 C-13,20 -12,15 -7,12 Z', `fill="url(#c)" stroke="${BIO.dark}" stroke-width=".8"`)}
      <ellipse cx="0" cy="-2" rx="18" ry="15" fill="url(#c)" stroke="${BIO.dark}" stroke-width="1.1"/>
      <path d="M-15,-8 Q0,-3 15,-8 M-17,0 Q0,5 17,0" stroke="${BIO.glow}" stroke-opacity=".55" stroke-width="1" fill="none"/>
      <path d="M-6,-15 L-4,-9 M0,-17 L0,-10 M6,-15 L4,-9" stroke="${BIO.dark}" stroke-width="1.2"/>
      ${[-7, -2.4, 2.4, 7].map(x => `<circle cx="${x}" cy="3" r="1.6" fill="url(#eye)"/>`).join('')}
      <circle cx="0" cy="12" r="8" fill="url(#acid)" filter="url(#g)"/>
      <circle cx="0" cy="12" r="5.4" fill="#244a12" stroke="${BIO.acid}" stroke-width="1.2"/>
      <circle cx="0" cy="12" r="2.6" fill="#eaffd8"/>
    </svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-16 -16 32 32">${head}
    ${both('M-4,-6 C-14,-14 -16,-2 -12,4 C-9,0 -6,-2 -4,-2 Z', `fill="${BIO.acid}" fill-opacity=".35" stroke="${BIO.acid}" stroke-width=".6"`)}
    ${both('M-5,2 L-11,6 L-12,10 M-5,5 L-9,11', `stroke="${BIO.shell[1]}" stroke-width="1.4" fill="none" stroke-linecap="round"`)}
    <path d="M0,-12 C6,-10 7,-2 6,4 C5,9 2,13 0,14 C-2,13 -5,9 -6,4 C-7,-2 -6,-10 0,-12 Z" fill="url(#c)" stroke="${BIO.dark}" stroke-width=".8"/>
    <path d="M-6,-3 Q0,-1 6,-3 M-5.6,3 Q0,5 5.6,3" stroke="${BIO.glow}" stroke-opacity=".6" stroke-width=".7" fill="none"/>
    ${both('M-2,12 C-4,15 -3,17 -1,17', `stroke="${BIO.eye}" stroke-width="1" fill="none"`)}
    <circle cx="-2.4" cy="8" r="1.8" fill="url(#eye)"/><circle cx="2.4" cy="8" r="1.8" fill="url(#eye)"/>
  </svg>`;
}

// 母舰触手炮（眼柄朝上 = 瞄准方向，和炮台一样按目标旋转）
export function podSvg(px, dead) {
  if (dead) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-32 -32 64 64">
      <circle r="20" fill="#1a0826" stroke="#3a1450" stroke-width="2"/>
      <path d="M-14,-6 C-6,-2 -8,6 -2,10 M4,-12 C8,-4 14,-2 16,6" stroke="${BIO.acid}" stroke-opacity=".6" stroke-width="2" fill="none"/>
      <circle cx="-6" cy="4" r="3" fill="${BIO.acid}" opacity=".5"/><circle cx="9" cy="-6" r="2" fill="${BIO.acid}" opacity=".5"/>
    </svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-32 -32 64 64">
    <defs>
      <radialGradient id="b" cx="-4" cy="-4" r="26" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#9a45c8"/><stop offset=".55" stop-color="#4a1766"/><stop offset="1" stop-color="#12041c"/></radialGradient>
      <linearGradient id="st" x1="-6" y1="0" x2="6" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3a1050"/><stop offset=".5" stop-color="#b061e0"/><stop offset="1" stop-color="#3a1050"/></linearGradient>
      <radialGradient id="eye" cx="-1.5" cy="-25.5" r="8" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="${BIO.eye}"/><stop offset="1" stop-color="#e05a00"/></radialGradient>
    </defs>
    <circle r="22" fill="url(#b)" stroke="${BIO.dark}" stroke-width="1.4"/>
    <path d="M-18,6 C-10,2 -12,-8 -4,-12 M18,6 C10,2 12,-8 4,-12 M-6,18 C-4,10 4,10 6,18" stroke="${BIO.glow}" stroke-opacity=".55" stroke-width="1.3" fill="none"/>
    <path d="M-6.5,0 C-5.5,-12 -3.5,-19 0,-27 C3.5,-19 5.5,-12 6.5,0 Z" fill="url(#st)" stroke="${BIO.dark}" stroke-width=".9"/>
    <circle cy="-25" r="7.5" fill="url(#eye)" stroke="${BIO.dark}" stroke-width="1"/>
    <ellipse cy="-25" rx="1.6" ry="5" fill="${BIO.dark}"/>
    <circle r="9" fill="#5a1f7a" stroke="${BIO.dark}" stroke-width="1"/>
    <path d="M-6,-3 A6.5,6.5 0 0 1 2,-6.5" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" fill="none" stroke-linecap="round"/>
  </svg>`;
}

// 异形母舰（机头朝下），viewBox 原点就是母舰中心，核心在 (0,10)
export const BOSS_VIEW = { left: -300, top: -130, w: 600, h: 290 };
export function bossSvg(pxW, pxH) {
  const shell = 'M0,-118 C70,-116 140,-82 160,-22 C170,18 152,68 112,98 C72,120 32,124 0,126 C-32,124 -72,120 -112,98 C-152,68 -170,18 -160,-22 C-140,-82 -70,-116 0,-118 Z';
  const wing = 'M-138,-34 C-200,-96 -282,-66 -296,8 C-272,-4 -254,16 -240,50 C-214,30 -176,40 -146,62 Z';
  const horn = 'M-48,-108 C-72,-136 -108,-134 -128,-108 C-102,-112 -82,-104 -68,-88 Z';
  const tent = (x, y, bend, len) => `<path d="M${x - 8},${y} C${x - 9},${y + len * .4} ${x + bend - 5},${y + len * .7} ${x + bend},${y + len} C${x + bend + 4},${y + len * .7} ${x + 7},${y + len * .4} ${x + 8},${y} Z" fill="url(#tent)" stroke="${BIO.dark}" stroke-width="1"/>
      ${[0.3, 0.55, 0.78].map(k => `<circle cx="${x + bend * k * k}" cy="${y + len * k}" r="${2.2 - k}" fill="${BIO.acid}" opacity=".85"/>`).join('')}`;
  const teeth = Array.from({ length: 16 }, (_, i) => `<path d="M-4.5,-58 L0,-44 L4.5,-58 Z" fill="url(#bone)" stroke="${BIO.dark}" stroke-width=".6" transform="translate(0,10) rotate(${i * 22.5}) translate(0,-10)"/>`).join('');
  const veins = ['M-120,-30 C-90,-20 -80,10 -54,14', 'M120,-30 C90,-20 80,10 54,14', 'M-104,62 C-74,42 -62,42 -44,54', 'M104,62 C74,42 62,42 44,54']
    .map(d => `<path d="${d}" stroke="${BIO.glow}" stroke-width="6" stroke-opacity=".35" fill="none" filter="url(#s)"/><path d="${d}" stroke="#efc6ff" stroke-width="1.5" stroke-opacity=".85" fill="none"/>`).join('');
  const mound = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="31" ry="25" fill="url(#mound)" stroke="${BIO.dark}" stroke-width="1.5"/><ellipse cx="${x}" cy="${y}" rx="31" ry="25" fill="none" stroke="#c45cff" stroke-opacity=".45" stroke-width="1" stroke-dasharray="3 5"/>`;
  const eyes = [-150, -125, -100, -80, -55, -30].map(a => { const r = (a * Math.PI) / 180; return [Math.cos(r) * 74, 10 - Math.sin(r) * 74]; })
    .flatMap(([x, y]) => [[x, y], [-x, y]]).map(([x, y]) => `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="4.6" ry="3.4" fill="url(#eye)" stroke="${BIO.dark}" stroke-width=".8"/><ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="1" ry="2.6" fill="${BIO.dark}"/>`).join('');
  const spine = Array.from({ length: 5 }, (_, i) => { const y = -112 + i * 13; const w = 12 - i * 1.4; return `<path d="M${-w},${y + 10} L0,${y} L${w},${y + 10} L0,${y + 6} Z" fill="url(#bone)" stroke="${BIO.dark}" stroke-width=".8"/>`; }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}" viewBox="-300 -130 600 290">
  <defs>
    <radialGradient id="sh" cx="-20" cy="-60" r="210" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a65ad6"/><stop offset=".35" stop-color="#5a1d80"/><stop offset=".75" stop-color="#2a0b3d"/><stop offset="1" stop-color="#0e0216"/></radialGradient>
    <linearGradient id="wg" x1="-300" y1="0" x2="-130" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8dff5a" stop-opacity=".3"/><stop offset=".55" stop-color="#6a2a96" stop-opacity=".7"/><stop offset="1" stop-color="#2a0b3d"/></linearGradient>
    <linearGradient id="tent" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a1766"/><stop offset=".6" stop-color="#9a45c8"/><stop offset="1" stop-color="#e7b3ff"/></linearGradient>
    <linearGradient id="bone" x1="0" y1="-1" x2="0" y2="1"><stop offset="0" stop-color="#fff2ff"/><stop offset=".5" stop-color="#d7b0f0"/><stop offset="1" stop-color="#6a2a96"/></linearGradient>
    <radialGradient id="mound" cx="-8" cy="-8" r="36" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8a3dbf"/><stop offset=".6" stop-color="#3e1259"/><stop offset="1" stop-color="#14041f"/></radialGradient>
    <radialGradient id="sock" cx="0" cy="10" r="60" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#050108"/><stop offset=".6" stop-color="#1a0626"/><stop offset=".8" stop-color="#7a33a8"/><stop offset="1" stop-color="#20082e"/></radialGradient>
    <radialGradient id="eye"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="${BIO.eye}"/><stop offset="1" stop-color="#ff6a00"/></radialGradient>
    <radialGradient id="vig" cx="0" cy="0" r="170" gradientUnits="userSpaceOnUse"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
    <pattern id="scale" width="28" height="18" patternUnits="userSpaceOnUse" x="-14" y="-118">
      <path d="M0,0 Q14,17 28,0" fill="#000" fill-opacity=".18" stroke="#000" stroke-opacity=".45" stroke-width="1.2"/>
      <path d="M2,1.5 Q14,14 26,1.5" fill="none" stroke="#e2a6ff" stroke-opacity=".22" stroke-width="1"/>
      <path d="M-14,9 Q0,26 14,9 M14,9 Q28,26 42,9" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1.1"/>
    </pattern>
    <clipPath id="clip"><path d="${shell}"/></clipPath>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="o" x="-20%" y="-30%" width="140%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <g filter="url(#o)" opacity=".85"><path d="${shell}" fill="none" stroke="${BIO.glow}" stroke-width="9"/>${both(wing, `fill="none" stroke="${BIO.acid}" stroke-width="4"`)}</g>
  ${both(wing, 'fill="url(#wg)" stroke="#b35ee6" stroke-width="1.6"')}
  ${both('M-142,-28 L-268,-64 M-142,-14 L-294,6 M-146,6 L-240,48', 'stroke="url(#bone)" stroke-width="4" stroke-linecap="round"')}
  ${both('M-268,-64 m-4,0 a4,4 0 1 0 8,0 a4,4 0 1 0 -8,0 M-294,6 m-4,0 a4,4 0 1 0 8,0 a4,4 0 1 0 -8,0 M-240,48 m-4,0 a4,4 0 1 0 8,0 a4,4 0 1 0 -8,0', 'fill="#efd6ff"')}
  ${both(horn, 'fill="url(#bone)" stroke="#3a1450" stroke-width="1.4"')}
  ${tent(-118, 92, -16, 46)}${tent(118, 92, 16, 46)}${tent(-60, 112, -10, 40)}${tent(60, 112, 10, 40)}${tent(-24, 120, -5, 36)}${tent(24, 120, 5, 36)}
  ${both('M-62,102 C-86,130 -66,156 -30,152 C-48,142 -52,126 -42,108 Z', 'fill="url(#bone)" stroke="#3a1450" stroke-width="1.4"')}
  <path d="${shell}" fill="url(#sh)" stroke="#c983ff" stroke-width="2.4"/>
  <g clip-path="url(#clip)"><rect x="-170" y="-120" width="340" height="250" fill="url(#scale)"/></g>
  <path d="${shell}" fill="url(#vig)"/>
  ${both('M-152,-24 C-130,-8 -130,34 -150,62 M-138,-56 C-118,-38 -114,-10 -122,10', `stroke="${BIO.dark}" stroke-width="5" fill="none" opacity=".8"`)}
  ${both('M-150,-22 C-128,-6 -128,32 -148,60', 'stroke="#d7a0ff" stroke-width="1.2" stroke-opacity=".5" fill="none"')}
  ${spine}
  ${veins}
  ${mound(-200, 40)}${mound(200, 40)}${mound(-92, 88)}${mound(92, 88)}
  <circle cx="0" cy="10" r="60" fill="url(#sock)" stroke="#efc6ff" stroke-width="2.6"/>
  ${teeth}
  <circle cx="0" cy="10" r="38" fill="none" stroke="${BIO.acid}" stroke-opacity=".55" stroke-width="1.6" stroke-dasharray="5 6"/>
  ${eyes}
</svg>`;
}

// ───────── 栅格化缓存 ─────────
export class ArtCache {
  constructor() { this.map = new Map(); }
  // w/h 为画面逻辑尺寸；res 为栅格化倍率
  get(key, make, w, h, res = 3) {
    let e = this.map.get(key);
    if (!e) {
      e = { canvas: null, failed: false };
      this.map.set(key, e);
      if (typeof Image === 'undefined') return null;
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = Math.ceil(w * res); c.height = Math.ceil(h * res);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        c.w = w; c.h = h;
        e.canvas = c;
      };
      img.onerror = () => { e.failed = true; console.warn('矢量美术加载失败', key); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(make(Math.ceil(w * res), Math.ceil(h * res)));
    }
    return e.canvas;
  }
}
