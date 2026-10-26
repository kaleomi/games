// 屠龙战纪 · 矢量美术总入口（SVG 绘制，加载后栅格化缓存到离屏画布）
//   英雄 hero-art.js · 魔物 monster-art.js · BOSS boss-art-a.js / boss-art-b.js · 装备 gear-art.js · 技能与特效 fx-art.js
//   这里留下通用的小件：勋章、设置图标、敌方弹幕、锁定圈、栅格化缓存（以及对战模式遗留的战机/旗舰）
export { fighterSvg, battleshipSvg } from './ships.js';
export { dpsSvg, mechSvg, healerSvg, carrierSvg, droneShipSvg, griffinSvg, dwarfSvg } from './hero-art.js';
export { minionSvg, mimicSvg } from './monster-art.js';
export { fireDragonSvg, totemSvg, boneDragonSvg, tombSvg } from './boss-art-a.js';
export { frostDragonSvg, iceCrystalSvg, demonLordSvg, demonEyeSvg } from './boss-art-b.js';
export { gearIconSvg, gunPodSvg, boltSvg } from './gear-art.js';
export { skillIconSvg, missileSvg, logoSvg, zoneTileSvg, zoneGlyphSvg, radarSvg, shockArcSvg, whirlSvg, invulnAuraSvg, shieldBubbleSvg, ballistaSvg, harpoonSvg, blessingIconSvg, crownSvg, formationSvg } from './fx-art.js';
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
    <linearGradient id="met" x1="0" y1="-72" x2="0" y2="80" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${red ? '#f7e4e8' : '#e6eefa'}"/><stop offset=".3" stop-color="${red ? '#c897a2' : '#93a9cc'}"/><stop offset=".7" stop-color="${red ? '#5a2c38' : '#33466a'}"/><stop offset="1" stop-color="${c.metal[2]}"/></linearGradient>
    <linearGradient id="arm" x1="0" y1="-60" x2="0" y2="62" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${red ? '#fff0f2' : '#f2f7ff'}"/><stop offset=".45" stop-color="${red ? '#b98591' : '#8aa0c4'}"/><stop offset="1" stop-color="${red ? '#3a1820' : '#1e2a44'}"/></linearGradient>
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
  ${both('M-236,58 L-206,24 L-150,10 L-140,22 L-196,36 L-222,64 Z', `fill="${c.base}" opacity=".85" stroke="#05070d" stroke-width="1"`)}
  ${both('M-150,10 L-140,22', `stroke="#fff" stroke-opacity=".6" stroke-width="1.2"`)}
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
export const BOSS_VIEW = { left: -300, top: -130, w: 600, h: 290 };
// ───────── 讨伐模式战舰：医疗舰、重装机甲（机头朝上） ─────────
// ───────── 技能图标（徽章） ─────────
// ───────── 技能特效精灵 ─────────
export function barrierSvg(pxW, pxH) {
  const cells = [];
  for (let i = 0; i < 13; i++) {
    const x = 9 + i * 16.8, y = i % 2 ? 19 : 13;
    cells.push(`<path d="M${x},${y - 8} L${x + 7},${y - 4} L${x + 7},${y + 4} L${x},${y + 8} L${x - 7},${y + 4} L${x - 7},${y - 4} Z"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}" viewBox="0 0 220 32">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset=".5" stop-color="#7fe3ff" stop-opacity=".55"/><stop offset="1" stop-color="#3aa8ff" stop-opacity=".15"/></linearGradient>
    <filter id="b" x="-10%" y="-60%" width="120%" height="220%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
    <g filter="url(#b)" fill="#7fe3ff" opacity=".6">${cells.join('')}</g>
    <g fill="url(#g)" stroke="#e6faff" stroke-width="1.2">${cells.join('')}</g>
    <path d="M2,16 H218" stroke="#fff" stroke-width="1" stroke-opacity=".8" stroke-dasharray="6 4"/>
  </svg>`;
}

export function healPlusSvg(px) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-12 -12 24 24">
    <defs><filter id="b" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter></defs>
    <path d="M-2.6,-8 h5.2 v5.4 h5.4 v5.2 h-5.4 v5.4 h-5.2 v-5.4 h-5.4 v-5.2 h5.4 Z" fill="#5dff9e" filter="url(#b)"/>
    <path d="M-2.6,-8 h5.2 v5.4 h5.4 v5.2 h-5.4 v5.4 h-5.2 v-5.4 h-5.4 v-5.2 h5.4 Z" fill="#5dff9e" stroke="#eafff2" stroke-width=".8"/>
    <path d="M-1,-6.4 h2 v5.4 h5.4 v2 h-5.4 v5.4 h-2 v-5.4 h-5.4 v-2 h5.4 Z" fill="#fff" opacity=".8"/>
  </svg>`;
}

export function reticleSvg(px) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="-32 -32 64 64">
    <defs><radialGradient id="g"><stop offset=".5" stop-color="#ff2a3a" stop-opacity="0"/><stop offset="1" stop-color="#ff2a3a" stop-opacity=".45"/></radialGradient></defs>
    <circle r="29" fill="url(#g)"/>
    <circle r="29" fill="none" stroke="#ff4d5e" stroke-width="2"/>
    <circle r="18" fill="none" stroke="#ff8a8a" stroke-width="1.4" stroke-dasharray="4 4"/>
    ${[0, 90, 180, 270].map(a => `<path d="M0,-31 L0,-22" stroke="#fff" stroke-width="2.4" transform="rotate(${a})"/>`).join('')}
    <circle r="3" fill="#fff"/>
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

// 机甲「冲击」：向前扩散的冲击波弧