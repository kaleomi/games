// 屠龙战纪 · 技能图标 / 徽记 / 战斗特效 / 玩法道具 矢量美术（SVG 字符串，纯 ES module，无 DOM 依赖）
// 约定：viewBox 原点 (0,0) = 精灵中心；「朝上 (-y)」= 飞行 / 瞄准方向；光从左上方来。
// 每个函数返回一份独立 SVG 文档（自带 <defs>，短 id 不会和别的 SVG 冲突）。

const n2 = v => Math.round(v * 100) / 100;
// 极坐标：deg 0 = 正上方，顺时针为正
const P = (r, deg) => [n2(r * Math.sin(deg * Math.PI / 180)), n2(-r * Math.cos(deg * Math.PI / 180))];
const pts = list => list.map(p => p.join(',')).join(' L');
const svg = (w, h, vb, body, attrs = '') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${vb}"${attrs}>${body}</svg>`;
// 用户坐标系里的模糊滤镜（区域写死，避免细线 bbox 太小把光晕裁掉）
const blurU = (id, sd, x, y, w, h) => `<filter id="${id}" filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
// 单色外发光：取 alpha 模糊后染色，叠两层再盖原图
const glowF = (id, color, sd, k = 1, x = -24, y = -24, w = 48, h = 48) => `<filter id="${id}" filterUnits="userSpaceOnUse" x="${x}" y="${y}" width="${w}" height="${h}"><feGaussianBlur in="SourceAlpha" stdDeviation="${sd}" result="b"/><feFlood flood-color="${color}" flood-opacity="${k}"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
const pair = (d, attrs) => `<g ${attrs}><path d="${d}"/><path d="${d}" transform="scale(-1,1)"/></g>`;

// 左右对称轮廓：给出从顶部中线沿左侧走到底部中线的路径段，自动镜像补全右半边（无中缝）
function symPath(top, segs) {
  let d = `M${top[0]},${top[1]}`;
  let cur = top;
  const hist = [];
  for (const s of segs) {
    hist.push([s, cur]);
    if (s[0] === 'L') { d += ` L${s[1]},${s[2]}`; cur = [s[1], s[2]]; } else { d += ` C${s[1]},${s[2]} ${s[3]},${s[4]} ${s[5]},${s[6]}`; cur = [s[5], s[6]]; }
  }
  for (let i = hist.length - 1; i >= 0; i--) {
    const [s, st] = hist[i];
    if (s[0] === 'L') d += ` L${-st[0]},${st[1]}`; else d += ` C${-s[3]},${s[4]} ${-s[1]},${s[2]} ${-st[0]},${st[1]}`;
  }
  return d + ' Z';
}

// 北欧风符文字形（单位坐标 -1..1，描边绘制）
const RUNES = [
  'M-.4,-1 V1 M-.4,-.55 L.5,-1 M-.4,0 L.5,-.45',
  'M-.5,1 V-1 L.5,-.35 V1',
  'M-.4,-1 V1 M-.4,-.5 L.4,0 L-.4,.5',
  'M0,-1 V1 M0,-.6 L.55,-.15 M0,-.6 L-.55,-.15',
  'M-.55,-1 L.55,1 M.55,-1 L-.55,1',
  'M0,1 V-1 M0,-.15 L-.6,-.9 M0,-.15 L.6,-.9',
  'M0,-1 L.6,-.35 L-.55,.55 V1 M0,-1 L-.6,-.35 L.55,.55 V1',
  'M-.4,-1 V1 M-.4,-1 L.5,-.45 L-.4,.15 L.5,1',
  'M.5,-1 L-.4,0 L.5,1',
  'M-.4,-1 V1 M-.4,-1 L.45,-.5 L-.4,0',
  'M-.5,-1 V1 M.5,-1 V1 M-.5,-.3 L.5,.3',
  'M0,-1 V1 M-.5,-.5 L.5,.5',
];
// 沿圆周排一圈符文（每个字形切向摆放）
function runeRing(r, count, s, sw, color, op = 1, off = 0, seed = 3) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = off + (i * 360) / count, [x, y] = P(r, a);
    out += `<path d="${RUNES[(i * 7 + seed) % RUNES.length]}" transform="translate(${x},${y}) rotate(${n2(a)}) scale(${s})"/>`;
  }
  return `<g fill="none" stroke="${color}" stroke-width="${n2(sw / s)}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}">${out}</g>`;
}
// 只在 a0..a1 一段圆弧上排符文
function runeArc(r, a0, a1, count, s, sw, color, op = 1, seed = 3) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const a = a0 + ((i + .5) * (a1 - a0)) / count, [x, y] = P(r, a);
    out += `<path d="${RUNES[(i * 5 + seed) % RUNES.length]}" transform="translate(${x},${y}) rotate(${n2(a)}) scale(${s})"/>`;
  }
  return `<g fill="none" stroke="${color}" stroke-width="${n2(sw / s)}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}">${out}</g>`;
}
// 四角星芒
const twinkle = (x, y, r, fill = '#fff', op = 1) => `<path d="M${x},${n2(y - r)} L${n2(x + r * .22)},${n2(y - r * .22)} L${n2(x + r)},${y} L${n2(x + r * .22)},${n2(y + r * .22)} L${x},${n2(y + r)} L${n2(x - r * .22)},${n2(y + r * .22)} L${n2(x - r)},${y} L${n2(x - r * .22)},${n2(y - r * .22)} Z" fill="${fill}" opacity="${op}"/>`;

// 俯视的鹰（头朝上），技能图标 / 符阵共用
const EAGLE_WING = 'M-2.4,-5 C-7,-9.2 -14,-10.6 -21,-8.2 L-17.4,-6.4 L-20.4,-4.2 L-16.4,-3.4 L-18.8,-.8 L-14.4,-1.2 L-15.6,2 L-11.8,.8 L-11.8,3.8 L-8.4,2 L-7.6,4.8 L-3,3 Z';
const EAGLE_BODY = 'M0,-13.4 C1.8,-13.4 2.8,-12 2.6,-10 C3.8,-8.4 4.2,-3 3.4,2 L3,5 L6.4,11.4 L2.4,10.2 L0,13 L-2.4,10.2 L-6.4,11.4 L-3,5 L-3.4,2 C-4.2,-3 -3.8,-8.4 -2.6,-10 C-2.8,-12 -1.8,-13.4 0,-13.4 Z';
// 简化的飞鸟剪影（头朝上），用于小尺寸群鹰
const BIRD = 'M0,-8.4 C1.5,-8.4 2.2,-7 2.2,-5.4 C6,-6.6 11,-7.6 16,-5.6 C12,-3.8 7.4,-1.4 2.6,1.2 L2.2,4 L5,8.4 L0,6.8 L-5,8.4 L-2.2,4 L-2.6,1.2 C-7.4,-1.4 -12,-3.8 -16,-5.6 C-11,-7.6 -6,-6.6 -2.2,-5.4 C-2.2,-7 -1.5,-8.4 0,-8.4 Z';
const eagle = (fill, ink, sw, detail = true) => `${pair(EAGLE_WING, `fill="${fill}" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"`)}
  ${detail ? pair('M-4,-3.6 C-8,-5.6 -12,-6 -16,-5.4 M-4,-.6 C-7,-1.6 -9.6,-1.4 -12.4,-.4', `fill="none" stroke="${ink}" stroke-opacity=".45" stroke-width="${n2(sw * .7)}"`) : ''}
  <path d="${EAGLE_BODY}" fill="${fill}" stroke="${ink}" stroke-width="${sw}" stroke-linejoin="round"/>
  <path d="M-1.3,-12.8 L0,-16.4 L1.3,-12.8 Z" fill="#ffc94a" stroke="${ink}" stroke-width="${n2(sw * .6)}" stroke-linejoin="round"/>`;

// ═════════════════════════ 技能图标 ═════════════════════════
// 职业底色：火焰系橙红 / 骑士系钢蓝 / 牧师系翠绿 / 游侠系紫 / 圣盾系青
const FAM = {
  fire:   { hi: '#ff9a5a', mid: '#c8300e', lo: '#3a0600', edge: '#1a0300', glow: '#ffae3a', ink: '#3a0700', tint: '#ffe4ae' },
  knight: { hi: '#8cb4ea', mid: '#2e5a9e', lo: '#091634', edge: '#030916', glow: '#a8dcff', ink: '#081532', tint: '#d6e8ff' },
  priest: { hi: '#7ce8a6', mid: '#12884a', lo: '#032614', edge: '#011208', glow: '#9dffc4', ink: '#032a16', tint: '#d4ffe4' },
  ranger: { hi: '#c690ff', mid: '#6a2cc4', lo: '#170434', edge: '#0a011c', glow: '#dcaaff', ink: '#1a0538', tint: '#f0dfff' },
  holy:   { hi: '#8ae8ff', mid: '#16809e', lo: '#021e2e', edge: '#010e18', glow: '#c4f6ff', ink: '#04243a', tint: '#dcfaff' },
};
const SKILL_STYLE = {
  missile: { fam: 'fire', ult: false },   beam:    { fam: 'fire', ult: true },
  impact:  { fam: 'knight', ult: false }, whirl:   { fam: 'knight', ult: true },
  heal:    { fam: 'priest', ult: false }, healUlt: { fam: 'priest', ult: true },
  drones:  { fam: 'ranger', ult: false }, swarm:   { fam: 'ranger', ult: true },
  shield:  { fam: 'holy', ult: false },   barrier: { fam: 'holy', ult: true },
};

const SKILL_SYM = {
  // 火球术：三枚拖尾火球斜向上飞
  missile(f) {
    const comet = (x, y, r, L, a, main) => {
      const k = (u, v) => `${n2(u * r)},${n2(v * L)}`;
      const d = `M${-r},0 A${r},${r} 0 0 1 ${r},0 C${r},${n2(r * .6)} ${k(1.05, .28)} ${k(.8, .6)} C${k(.55, .5)} ${k(.45, .47)} ${k(.3, .42)} C${k(.35, .66)} ${k(.18, .86)} 0,${L} C${k(-.2, .82)} ${k(-.32, .62)} ${k(-.3, .44)} C${k(-.45, .5)} ${k(-.6, .52)} ${k(-.82, .64)} C${k(-1.05, .3)} ${-r},${n2(r * .6)} ${-r},0 Z`;
      const inner = `M${n2(-r * .62)},0 A${n2(r * .62)},${n2(r * .62)} 0 0 1 ${n2(r * .62)},0 C${k(.6, .2)} ${k(.3, .38)} ${k(.12, .62)} C${k(0, .5)} ${k(-.1, .55)} ${k(-.14, .58)} C${k(-.3, .38)} ${k(-.6, .2)} ${n2(-r * .62)},0 Z`;
      return `<g transform="translate(${x},${y}) rotate(${a})"><path d="${d}" fill="url(#fb)" stroke="${f.ink}" stroke-width="${main ? 1.1 : .9}" stroke-linejoin="round"/><path d="${inner}" fill="#ffe680"/><circle cy="${n2(-r * .1)}" r="${n2(r * .62)}" fill="url(#fc)"/></g>`;
    };
    return comet(-11.4, -9.4, 3.8, 12, 40) + comet(12.4, 7, 3.8, 12, 40) + comet(3, -4, 7.2, 23, 40, 1);
  },
  // 烈焰洪流：法杖宝珠斜向喷出、越往前越粗的火焰洪流（局部坐标朝上，整体转 42°）
  beam(f) {
    const tongue = d => `<path d="${d}" fill="url(#fb)" stroke="${f.ink}" stroke-width=".8" stroke-linejoin="round"/>`;
    return `<g clip-path="url(#cl)"><g transform="translate(-2,2) rotate(42)">
      ${tongue('M-6.6,-4 C-11,-6 -12,-10 -15.6,-12.6 C-11.6,-12.6 -9.6,-11.4 -8,-9.4 Z')}
      ${tongue('M7.6,-12 C12,-14 13.2,-18 16.8,-20.6 C12.8,-20.6 10.8,-19.4 9,-17.4 Z')}
      ${tongue('M-9,-20 C-13,-22 -14,-26 -17,-29 C-13.4,-28.6 -11.4,-27.4 -10,-25.4 Z')}
      ${tongue('M5,1.4 C8.6,.2 10.4,-2.6 13,-4.6 C9.6,-4.4 7.6,-3.2 6.2,-1.6 Z')}
      <path d="M-4.6,13 C-6.4,7 -5,2 -7.4,-4 C-9.6,-10 -7.6,-16 -10.4,-22 C-11.4,-26 -11,-29 -12,-34 L12,-34 C11,-29 11.4,-26 10.4,-22 C7.6,-16 9.6,-10 7.4,-4 C5,2 6.4,7 4.6,13 Z" fill="url(#bm)" stroke="${f.ink}" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M-1.8,11 C-3,5 -2,0 -3.6,-6 C-4.8,-13 -3.6,-20 -5,-34 L5,-34 C3.6,-20 4.8,-13 3.6,-6 C2,0 3,5 1.8,11 Z" fill="#fffbe8"/>
      <rect x="-1.6" y="14" width="3.2" height="16" rx="1" fill="#6a3414" stroke="${f.ink}" stroke-width=".8"/>
      <path d="M-4.6,15.6 C-5.6,13 -4.6,10.6 -3.2,9.6 M4.6,15.6 C5.6,13 4.6,10.6 3.2,9.6" fill="none" stroke="url(#gd)" stroke-width="1.6" stroke-linecap="round"/>
      <circle cy="11.6" r="5.4" fill="url(#fc)" stroke="${f.ink}" stroke-width="1"/>
    </g>
    ${twinkle(-14, -4, 2.2, '#fff3c0')}${twinkle(6, 15, 1.8, '#fff3c0')}${twinkle(-6, -16, 1.6, '#fff3c0')}</g>`;
  },
  // 盾击：骑士塔盾 + 向上扩散的冲击弧
  impact(f) {
    const sh = 'M-10,-5 Q0,-8.6 10,-5 L10,3 C10,10 5,14 0,17 C-5,14 -10,10 -10,3 Z';
    return `<path d="M-16,-8.6 Q0,-23 16,-8.6" fill="none" stroke="${f.ink}" stroke-width="4.6" stroke-linecap="round" opacity=".7"/>
      <path d="M-16,-8.6 Q0,-23 16,-8.6" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>
      <path d="M-10.4,-15.8 Q0,-25 10.4,-15.8" fill="none" stroke="${f.tint}" stroke-width="1.8" stroke-linecap="round" opacity=".85"/>
      <path d="M-13,-.4 L-18.6,-2.6 M-13,5.4 L-19,6 M13,-.4 L18.6,-2.6 M13,5.4 L19,6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".9"/>
      <path d="${sh}" fill="url(#mt)" stroke="${f.ink}" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="${sh}" transform="translate(0,1.7) scale(.72)" fill="#2b58a6" stroke="url(#gd)" stroke-width="1.8"/>
      <path d="M-1.5,-3.6 h3 v3.8 h3.8 v2.8 h-3.8 v7 h-3 v-7 h-3.8 v-2.8 h3.8 Z" fill="url(#gd)" stroke="${f.ink}" stroke-width=".5"/>
      <path d="M-8.4,-3.2 Q-4,-5.4 -.6,-5.6" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".9"/>`;
  },
  // 旋风斩：三把剑呈风车状旋转，拖着月牙剑气
  whirl(f) {
    let trails = '', swords = '';
    for (const a of [20, 140, 260]) {
      const o = [], i = [];
      for (let k = 0; k <= 12; k++) { const t = k / 12; o.push(P(20 - 2.6 * t, a - t * 100)); i.push(P(13.6 + 3.8 * t, a - t * 100)); }
      trails += `<path d="M${pts(o)} L${pts(i.reverse())} Z" fill="url(#wt${a})"/>`;
      swords += `<g transform="rotate(${a})">
        <path d="M0,-21 L2.2,-17.6 L1.9,-8.4 L-1.9,-8.4 L-2.2,-17.6 Z" fill="url(#mt)" stroke="${f.ink}" stroke-width=".8" stroke-linejoin="round"/>
        <path d="M0,-19.4 V-9.4" stroke="#7d8eb0" stroke-width=".6"/>
        <path d="M-4.8,-8.6 L4.8,-8.6 L4,-6.8 L-4,-6.8 Z" fill="url(#gd)" stroke="${f.ink}" stroke-width=".6"/>
        <rect x="-.9" y="-6.8" width="1.8" height="2.8" fill="#5a3a1a" stroke="${f.ink}" stroke-width=".4"/>
      </g>`;
    }
    const tg = [20, 140, 260].map(a => { const [x1, y1] = P(19, a), [x2, y2] = P(17, a - 100); return `<linearGradient id="wt${a}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="${f.tint}" stop-opacity=".75"/><stop offset="1" stop-color="${f.glow}" stop-opacity="0"/></linearGradient>`; }).join('');
    return `<defs>${tg}</defs>${trails}${swords}<circle r="4.6" fill="url(#gd)" stroke="${f.ink}" stroke-width=".9"/><circle r="1.8" fill="#fff"/>`;
  },
  // 治疗术：托起的手掌 + 发光圣十字
  heal(f) {
    const hand = 'M-17,21 C-14,16.6 -12,13.4 -9.6,11.4 C-10.2,8.6 -10.8,6 -9.2,4.6 C-7.6,3.6 -6.4,5.4 -6,7.6 C-5,9.4 -2.4,10 1,9.8 L11.6,9 C13.8,8.9 14.8,10 14.6,11.3 C14.4,12.6 13.2,13 11.6,13 L5.4,13.2 C3.2,15.4 -1,17 -5.4,17.4 C-8.4,17.8 -10.4,19.4 -11.4,22 Z';
    return `${Array.from({ length: 8 }, (_, i) => { const [x1, y1] = P(10, i * 45), [x2, y2] = P(17, i * 45); return `<path d="M${x1},${n2(y1 - 4.4)} L${x2},${n2(y2 - 4.4)}" stroke="${f.tint}" stroke-width="1.3" stroke-linecap="round" opacity=".7"/>`; }).join('')}
      <path d="M-2.9,-14 h5.8 v6.2 h6.2 v5.8 h-6.2 v6.2 h-5.8 v-6.2 h-6.2 v-5.8 h6.2 Z" fill="url(#sy)" stroke="${f.ink}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M-1,-12.4 h2 v6.4 h6.4 v2 h-6.4" fill="none" stroke="#fff" stroke-width=".8" opacity=".9"/>
      <path d="${hand}" fill="url(#sk)" stroke="${f.ink}" stroke-width="1.1" stroke-linejoin="round"/>
      <path d="M2,10.9 L12,10.6 M-6.8,9.4 C-6,11 -4,11.4 -1.6,11.4" fill="none" stroke="${f.ink}" stroke-width=".55" stroke-opacity=".55" stroke-linecap="round"/>
      ${twinkle(-12, -9, 1.8)}${twinkle(13, -12, 1.5)}`;
  },
  // 圣光普照：天降光柱 + 展开的天使之翼
  healUlt(f) {
    const wing = 'M-3,-3 C-7,-9.6 -13.6,-12.6 -21.6,-12.6 C-20,-10.6 -20,-9 -21,-7.4 C-18.6,-7 -18,-5.4 -19.4,-3.4 C-16.8,-3.4 -16,-1.8 -16.8,.2 C-14,0 -13,1.6 -13.4,3.6 C-10.4,2.8 -9,4 -8.4,6 C-6.4,4 -4.4,3.2 -3,3 Z';
    return `<g clip-path="url(#cl)"><rect x="-6.4" y="-24" width="12.8" height="40" fill="url(#pl)"/><rect x="-2.6" y="-24" width="5.2" height="38" fill="url(#pl)"/></g>
      <ellipse cy="14" rx="13" ry="3.6" fill="url(#gr)"/>
      ${pair(wing, `fill="url(#sy)" stroke="${f.ink}" stroke-width="1" stroke-linejoin="round"`)}
      ${pair('M-5,-1.6 C-10,-5.4 -15,-6.4 -19.2,-5.6 M-5,.2 C-9,-1.4 -12.4,-1.4 -15.6,-.8 M-5,1.8 C-8,1.4 -10,1.8 -12,3', `fill="none" stroke="${f.ink}" stroke-opacity=".4" stroke-width=".7"`)}
      <path d="M0,-15.6 L2.1,-7.4 L8.4,-5 L2.1,-2.6 L0,5.6 L-2.1,-2.6 L-8.4,-5 L-2.1,-7.4 Z" fill="#fffef4" stroke="${f.ink}" stroke-width=".7" stroke-linejoin="round"/>
      <circle cy="-5" r="1.7" fill="#fff3a8"/>`;
  },
  // 灵鹰：展翅俯冲的紫色灵鹰
  drones(f) {
    return `<g transform="translate(0,1.4) scale(1.02)">${eagle('url(#sy)', f.ink, 1.1)}</g>
      ${pair('M-9,-6.4 L-14.6,-7.2 M-7.6,-3.2 L-12.4,-3.2', `stroke="${f.glow}" stroke-width="1" stroke-linecap="round" opacity=".9"`)}
      <path d="M0,-6 L1.4,-3 L0,0 L-1.4,-3 Z" fill="${f.glow}"/>`;
  },
  // 鹰群风暴：中心一只灵鹰，外圈群鹰盘旋
  swarm(f) {
    // 四只灵鹰沿对角线顺时针盘旋（方形图标对角更宽敞），身后拖风痕；中心一只领头鹰
    const A = [45, 135, 225, 315];
    const ring = A.map(a => { const [x, y] = P(15, a); return `<path d="${BIRD}" transform="translate(${x},${y}) rotate(${a + 90}) scale(.46)" fill="url(#sy)" stroke="${f.ink}" stroke-width="2.2" stroke-linejoin="round"/>`; }).join('');
    const swirl = A.map(a => `<path d="M${P(15, a - 72).join(',')} A15,15 0 0 1 ${P(15, a - 22).join(',')}" fill="none" stroke="${f.tint}" stroke-width="1.5" stroke-linecap="round" opacity=".75"/>`).join('');
    return `${swirl}<g transform="translate(0,1) scale(.54)">${eagle('url(#sy)', f.ink, 1.9, false)}</g>${ring}`;
  },
  // 圣盾：金边鸢盾 + 圣十字 + 光芒
  shield(f) {
    const sh = 'M-12,-13 Q0,-17.6 12,-13 L12,-1 C12,8 6,13.6 0,17.6 C-6,13.6 -12,8 -12,-1 Z';
    return `<g clip-path="url(#cl)">${Array.from({ length: 12 }, (_, i) => { const [x1, y1] = P(12, i * 30 + 15), [x2, y2] = P(24, i * 30 + 15); return `<path d="M${x1},${y1} L${x2},${y2}" stroke="${f.tint}" stroke-width="1.6" opacity=".45"/>`; }).join('')}</g>
      <path d="${sh}" fill="url(#gd)" stroke="${f.ink}" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="${sh}" transform="translate(0,.6) scale(.8)" fill="url(#sy)" stroke="#8a5a00" stroke-width=".8"/>
      <path d="M-2.4,-10.6 h4.8 v6 h6 v4.4 h-6 v11.4 h-4.8 v-11.4 h-6 v-4.4 h6 Z" fill="#1d8fbf" stroke="${f.ink}" stroke-width=".8" stroke-linejoin="round"/>
      <path d="M-1,-9.4 v5.8" stroke="#bff4ff" stroke-width=".8"/>
      <path d="M-9.4,-11 Q-4,-13.6 0,-13.8" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round"/>`;
  },
  // 符文墙：三块立起的发光符文石碑
  barrier(f) {
    const slab = (x, h, w) => `<path d="M${x - w},13 L${x - w},${-h + w} Q${x - w},${-h} ${x},${-h - 1} Q${x + w},${-h} ${x + w},${-h + w} L${x + w},13 Z" fill="url(#st)" stroke="${f.ink}" stroke-width="1.1" stroke-linejoin="round"/>`;
    const glyph = (x, y, i, k) => `<path d="${RUNES[i]}" transform="translate(${x},${y}) scale(${k})" fill="none" stroke="#bff6ff" stroke-width="${n2(1.3 / k)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    return `<path d="M-19,13 A19,24 0 0 1 19,13" fill="none" stroke="${f.glow}" stroke-width="1.4" stroke-dasharray="3 2.4" opacity=".85"/>
      ${slab(-11, 7, 4.4)}${slab(11, 7, 4.4)}${slab(0, 14, 5.4)}
      <g filter="url(#rg)">${glyph(-11, 2, 5, 2.6)}${glyph(11, 2, 7, 2.6)}${glyph(0, -2.6, 6, 3.4)}</g>
      <path d="M-18,13.6 H18" stroke="${f.ink}" stroke-width="2" stroke-linecap="round"/><path d="M-17,13 H17" stroke="${f.tint}" stroke-width="1" stroke-linecap="round"/>`;
  },
};

export function skillIconSvg(id, px) {
  const st = SKILL_STYLE[id] || SKILL_STYLE.missile, f = FAM[st.fam], ult = st.ult;
  const R = ult ? 19 : 21.4, rx = ult ? 9.4 : 10.6;
  const sym = (SKILL_SYM[id] || SKILL_SYM.missile)(f);
  const rivets = ult ? [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => `<circle cx="${sx * 19.2}" cy="${sy * 19.2}" r="1.5" fill="url(#rv)" stroke="#4a2c00" stroke-width=".5"/>`).join('') : '';
  return svg(px, px, '-24 -24 48 48', `<defs>
      <radialGradient id="bg" cx="-7" cy="-11" r="36" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${f.hi}"/><stop offset=".42" stop-color="${f.mid}"/><stop offset="1" stop-color="${f.lo}"/></radialGradient>
      <radialGradient id="vg" cx="0" cy="0" r="27" gradientUnits="userSpaceOnUse"><stop offset=".62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".5"/></radialGradient>
      <linearGradient id="rim" x1="-20" y1="-22" x2="18" y2="22" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff8d2"/><stop offset=".3" stop-color="#ffd45a"/><stop offset=".62" stop-color="#d08c12"/><stop offset=".8" stop-color="#ffe08a"/><stop offset="1" stop-color="#7a4800"/></linearGradient>
      <radialGradient id="rv" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fffbe0"/><stop offset=".5" stop-color="#ffcc3a"/><stop offset="1" stop-color="#8a5200"/></radialGradient>
      <linearGradient id="sy" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="${f.tint}"/><stop offset="1" stop-color="${f.hi}"/></linearGradient>
      <linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4e4"/><stop offset="1" stop-color="#e8b892"/></linearGradient>
      <linearGradient id="mt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#dfe8f6"/><stop offset=".56" stop-color="#a2b2cc"/><stop offset="1" stop-color="#5a6c8e"/></linearGradient>
      <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#ffd24a"/><stop offset="1" stop-color="#c0800e"/></linearGradient>
      <linearGradient id="st" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e6f4f8"/><stop offset=".5" stop-color="#8aa6b6"/><stop offset="1" stop-color="#3a5262"/></linearGradient>
      <linearGradient id="fb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0"/><stop offset=".3" stop-color="#ffd84a"/><stop offset=".62" stop-color="#ff8a1e"/><stop offset="1" stop-color="#c42606"/></linearGradient>
      <radialGradient id="fc"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#fff8cc"/><stop offset="1" stop-color="#ffd24a"/></radialGradient>
      <linearGradient id="bm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff5a10"/><stop offset=".28" stop-color="#ffaa30"/><stop offset=".5" stop-color="#fff0a8"/><stop offset=".72" stop-color="#ffaa30"/><stop offset="1" stop-color="#ff5a10"/></linearGradient>
      <linearGradient id="pl" x1="0" y1="-24" x2="0" y2="16" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".6" stop-color="#fff6c4" stop-opacity=".55"/><stop offset="1" stop-color="#fff6c4" stop-opacity="0"/></linearGradient>
      <radialGradient id="gr"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#fff2a8" stop-opacity=".6"/><stop offset="1" stop-color="#fff2a8" stop-opacity="0"/></radialGradient>
      <clipPath id="cl"><rect x="${-R}" y="${-R}" width="${2 * R}" height="${2 * R}" rx="${rx}"/></clipPath>
      ${glowF('gl', f.glow, 1.5, .9)}
      ${glowF('rg', '#7ff0ff', .9, 1)}
    </defs>
    <rect x="-23.4" y="-23.4" width="46.8" height="46.8" rx="12.6" fill="${f.edge}"/>
    ${ult ? `<rect x="-22.4" y="-22.4" width="44.8" height="44.8" rx="11.8" fill="url(#rim)"/><rect x="-21.3" y="-21.3" width="42.6" height="42.6" rx="11" fill="none" stroke="#fffbe6" stroke-opacity=".55" stroke-width=".6"/>${rivets}<rect x="${-R - .7}" y="${-R - .7}" width="${2 * R + 1.4}" height="${2 * R + 1.4}" rx="${rx + .6}" fill="#3a2200"/>` : ''}
    <rect x="${-R}" y="${-R}" width="${2 * R}" height="${2 * R}" rx="${rx}" fill="url(#bg)"/>
    <g clip-path="url(#cl)">
      <circle r="16.5" fill="none" stroke="${f.tint}" stroke-opacity=".13" stroke-width="3.4"/>
      ${runeRing(16.5, 14, 1.2, .55, f.tint, .22)}
      <rect x="${-R}" y="${-R}" width="${2 * R}" height="${2 * R}" fill="url(#vg)"/>
      <path d="M-17,-12 C-10,-18 10,-18 17,-12 L17,-21 L-17,-21 Z" fill="#fff" opacity=".16"/>
    </g>
    ${ult ? '' : `<rect x="${-R + .5}" y="${-R + .5}" width="${2 * R - 1}" height="${2 * R - 1}" rx="${rx - .4}" fill="none" stroke="${f.tint}" stroke-opacity=".55" stroke-width="1"/>`}
    <g filter="url(#gl)">${sym}</g>`);
}

// ═════════════════════════ 火球术的火球（20 逻辑 px，朝上飞） ═════════════════════════
export function missileSvg(px) {
  return svg(px, px, '-12 -12 24 24', `<defs>
      <radialGradient id="h" cx="0" cy="-3" r="9" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff3c0" stop-opacity=".95"/><stop offset=".45" stop-color="#ff9a2a" stop-opacity=".55"/><stop offset="1" stop-color="#ff4a10" stop-opacity="0"/></radialGradient>
      <linearGradient id="t" x1="0" y1="-6" x2="0" y2="12" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffe070"/><stop offset=".45" stop-color="#ff7a1a"/><stop offset="1" stop-color="#d42000" stop-opacity="0"/></linearGradient>
      <linearGradient id="t2" x1="0" y1="-4" x2="0" y2="9" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fffbe0"/><stop offset=".5" stop-color="#ffd24a"/><stop offset="1" stop-color="#ff8a1a" stop-opacity="0"/></linearGradient>
      <radialGradient id="c" cx="-1.2" cy="-5.4" r="5.4" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#fff6c0"/><stop offset=".85" stop-color="#ffc23a"/><stop offset="1" stop-color="#ff8a1a"/></radialGradient>
      ${blurU('b', 1.2, -12, -12, 24, 24)}
    </defs>
    <circle cy="-3" r="9" fill="url(#h)"/>
    <path d="M-5.2,-3.4 C-5.8,1.6 -3.6,4.6 -4.8,9 C-2.4,7.4 -1.6,9.6 0,11.8 C1.6,9.2 2.6,8 4.8,9.6 C3.4,5.4 5.8,1.6 5.2,-3.4 Z" fill="url(#t)" filter="url(#b)"/>
    <path d="M-4.6,-3.6 C-5,1 -3,3.6 -3.8,7.6 C-1.8,6.4 -1.2,8 0,10 C1.2,7.8 2,6.8 3.8,8 C2.8,4.4 5,1 4.6,-3.6 Z" fill="url(#t)"/>
    <path d="M-2.8,-3.6 C-3,0 -1.6,2.6 -1.8,5.6 C-.8,4.6 -.4,5.8 0,7.2 C.6,5.6 1,4.8 2,5.4 C1.4,2.6 3,0 2.8,-3.6 Z" fill="url(#t2)"/>
    <circle cy="-4.4" r="4.8" fill="url(#c)"/>
    <circle cx="-1.6" cy="-6" r="1.5" fill="#fff"/>
    <circle cx="-5.6" cy="5" r=".8" fill="#ffd24a"/><circle cx="5.2" cy="3" r=".7" fill="#ffe8a0"/><circle cx="2.6" cy="10.4" r=".6" fill="#ffb43a"/>`);
}

// ═════════════════════════ 游戏徽记（不含文字，正方形） ═════════════════════════
export function logoSvg(size = 120) {
  const flame = 'M-70,20 C-86,-10 -70,-34 -74,-62 C-60,-50 -54,-40 -52,-28 C-54,-54 -42,-74 -26,-92 C-28,-70 -18,-58 -12,-48 C-12,-66 -4,-82 2,-99 C8,-80 16,-64 14,-48 C22,-60 32,-74 30,-92 C44,-74 52,-54 50,-30 C56,-42 64,-50 74,-60 C70,-34 86,-10 70,20 Z';
  const shield = 'M-56,-58 Q0,-71 56,-58 L55,0 C52,40 26,64 0,82 C-26,64 -52,40 -55,0 Z';
  const sword = a => `<g transform="translate(0,-10) rotate(${a}) translate(0,80) scale(1.16)">
      <path d="M0,-158 L8,-141 L8.6,-6 L-8.6,-6 L-8,-141 Z" fill="url(#bl)" stroke="#1a0c04" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="M0,-146 L0,-10" stroke="#5a6478" stroke-width="2"/><path d="M-3.4,-136 L-3.6,-10" stroke="#fff" stroke-width="1.6" opacity=".8"/>
      <path d="M-17,-7 C-11,-9.6 -5,-9 0,-8.6 C5,-9 11,-9.6 17,-7 L22,-12 L21,-1 L16,2.6 L-16,2.6 L-21,-1 L-22,-12 Z" fill="url(#gd)" stroke="#2a1400" stroke-width="2" stroke-linejoin="round"/>
      <circle cy="-3" r="3.4" fill="url(#rb)" stroke="#2a0004" stroke-width="1.1"/>
      <rect x="-4.4" y="3" width="8.8" height="21" rx="2" fill="#4a2410" stroke="#1a0804" stroke-width="2"/>
      <path d="M-4,8 L4,6 M-4,13 L4,11 M-4,18 L4,16" stroke="#a8683a" stroke-width="1.6"/>
      <path d="M0,24 L7,30 L0,37 L-7,30 Z" fill="url(#gd)" stroke="#2a1400" stroke-width="2" stroke-linejoin="round"/>
    </g>`;
  // 龙头（正面，左右对称）
  const head = symPath([0, -40], [
    ['C', -6, -39, -11, -36, -15, -32], ['C', -19, -28, -22, -25, -25, -22],
    ['L', -40, -30], ['L', -31, -15], ['L', -46, -9], ['L', -31, -3], ['L', -42, 11], ['L', -24, 9],
    ['C', -22, 18, -20, 26, -18, 32], ['C', -16, 38, -14.5, 44, -12.5, 48], ['C', -11, 53, -8, 56, -4, 55], ['C', -2, 54.6, -1, 54, 0, 54],
  ]);
  const horn = 'M-17,-29 C-28,-44 -38,-62 -42,-88 C-30,-70 -18,-56 -3,-38 Z';
  const brow = 'M-28,-21 L-5,-13 L-6,-7.6 L-26,-14.4 Z';
  const eye = 'M-24,-12 C-18.6,-12.6 -13,-9.6 -8.6,-5 C-14,-4.6 -20,-7 -24,-12 Z';
  const embers = [[-78, -40, 2.2], [80, -26, 1.8], [-64, -84, 1.6], [62, -86, 2], [-86, 8, 1.4], [88, 20, 1.6], [-30, -96, 1.3], [40, -98, 1.2]];
  return svg(size, size, '-100 -100 200 200', `<defs>
      <linearGradient id="fl" x1="0" y1="20" x2="0" y2="-100" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a80c00"/><stop offset=".45" stop-color="#ff3a0a"/><stop offset=".8" stop-color="#ff8a1e"/><stop offset="1" stop-color="#ffd04a"/></linearGradient>
      <linearGradient id="fl2" x1="0" y1="20" x2="0" y2="-82" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff5a10"/><stop offset=".6" stop-color="#ffa62a"/><stop offset="1" stop-color="#ffe680"/></linearGradient>
      <linearGradient id="fl3" x1="0" y1="20" x2="0" y2="-62" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffb43a"/><stop offset="1" stop-color="#fff6c8"/></linearGradient>
      <linearGradient id="bl" x1="-8" y1="0" x2="8" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#d8e0ee"/><stop offset=".55" stop-color="#8e9ab0"/><stop offset="1" stop-color="#4a5468"/></linearGradient>
      <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".4" stop-color="#ffd24a"/><stop offset=".75" stop-color="#d48a10"/><stop offset="1" stop-color="#8a4c00"/></linearGradient>
      <linearGradient id="rim" x1="-60" y1="-70" x2="50" y2="80" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff8d6"/><stop offset=".25" stop-color="#ffd24a"/><stop offset=".55" stop-color="#b8740a"/><stop offset=".75" stop-color="#ffd86a"/><stop offset="1" stop-color="#6a3800"/></linearGradient>
      <radialGradient id="fd" cx="0" cy="-6" r="84" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#c41a10"/><stop offset=".45" stop-color="#6a0a0c"/><stop offset=".8" stop-color="#2a0306"/><stop offset="1" stop-color="#120004"/></radialGradient>
      <radialGradient id="hd" cx="-14" cy="-26" r="86" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fffbe2"/><stop offset=".25" stop-color="#ffe07a"/><stop offset=".55" stop-color="#f0a820"/><stop offset=".85" stop-color="#a85a00"/><stop offset="1" stop-color="#5a2a00"/></radialGradient>
      <linearGradient id="hn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset=".5" stop-color="#e8d2a2"/><stop offset="1" stop-color="#8a6a3a"/></linearGradient>
      <radialGradient id="ey"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#ffec80"/><stop offset=".75" stop-color="#ff5a10"/><stop offset="1" stop-color="#b01000"/></radialGradient>
      <radialGradient id="rb" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffd0d4"/><stop offset=".4" stop-color="#ff2a3a"/><stop offset="1" stop-color="#6a0010"/></radialGradient>
      <radialGradient id="ag" cx="0" cy="-10" r="98" gradientUnits="userSpaceOnUse"><stop offset=".45" stop-color="#ff6a1a" stop-opacity=".55"/><stop offset="1" stop-color="#ff3a0a" stop-opacity="0"/></radialGradient>
      ${blurU('b6', 6, -100, -100, 200, 200)}${blurU('b3', 3, -100, -100, 200, 200)}${blurU('b2', 1.6, -100, -100, 200, 200)}
      <clipPath id="sc"><path d="${shield}" transform="translate(0,8) scale(.86) translate(0,-8)"/></clipPath>
    </defs>
    <circle cy="-10" r="98" fill="url(#ag)"/>
    <path d="${flame}" fill="url(#fl)" filter="url(#b6)" opacity=".9"/>
    <path d="${flame}" fill="url(#fl)"/>
    <path d="${flame}" transform="scale(.8)" fill="url(#fl2)"/>
    <path d="${flame}" transform="scale(.6)" fill="url(#fl3)" opacity=".9"/>
    ${embers.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r * 2.4}" fill="#ff8a2a" opacity=".5" filter="url(#b2)"/><circle cx="${x}" cy="${y}" r="${r}" fill="#ffe8a0"/>`).join('')}
    ${sword(44)}${sword(-44)}
    <path d="${shield}" fill="#000" opacity=".55" filter="url(#b3)" transform="translate(2,4)"/>
    <path d="${shield}" fill="url(#rim)" stroke="#2a1400" stroke-width="3" stroke-linejoin="round"/>
    <path d="${shield}" transform="translate(0,8) scale(.93) translate(0,-8)" fill="none" stroke="#fff6d0" stroke-opacity=".45" stroke-width="1.4"/>
    <path d="${shield}" transform="translate(0,8) scale(.86) translate(0,-8)" fill="url(#fd)" stroke="#3a1800" stroke-width="2.4"/>
    <g clip-path="url(#sc)">
      <path d="M-50,40 L-30,30 L-34,14 L-18,4 M50,40 L30,30 L34,14 L18,4 M-40,-46 L-30,-36 L-38,-24 M40,-46 L30,-36 L38,-24 M-12,70 L-6,60 L-12,52 M12,70 L6,60 L12,52" fill="none" stroke="#ff6a1a" stroke-width="1.6" stroke-opacity=".55" stroke-linecap="round"/>
      <ellipse cy="64" rx="26" ry="14" fill="#ff7a1a" opacity=".45" filter="url(#b6)"/>
    </g>
    ${[[-44, -48], [44, -48], [-46, 8], [46, 8], [0, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#fff0b0" stroke="#5a3000" stroke-width="1"/>`).join('')}
    ${pair(horn, 'fill="#000" opacity=".5" filter="url(#b3)" transform="translate(2,3)"')}
    ${pair(horn, 'fill="url(#hn)" stroke="#2a1400" stroke-width="2.4" stroke-linejoin="round"')}
    ${pair('M-20,-38 L-12,-34 M-26,-50 L-19,-46 M-33,-64 L-27,-60', 'stroke="#8a6a3a" stroke-width="1.6" stroke-linecap="round"')}
    <path d="${head}" fill="#000" opacity=".55" filter="url(#b3)" transform="translate(2,4)"/>
    <path d="${head}" fill="url(#hd)" stroke="#2a1000" stroke-width="2.6" stroke-linejoin="round"/>
    ${pair('M-31,-15 L-24,-14 M-31,-3 L-24,-1 M-28,9 L-22,4', 'stroke="#7a3a00" stroke-width="1.6" stroke-linecap="round" opacity=".8"')}
    ${pair('M-22,10 C-19,20 -16,32 -11,44', 'fill="none" stroke="#7a3a00" stroke-width="1.6" opacity=".7"')}
    <path d="M0,-34 L5,-28 L0,-22 L-5,-28 Z M0,-18 L4.4,-12 L0,-6 L-4.4,-12 Z M0,-1 L4,5 L0,11 L-4,5 Z M0,16 L3.6,22 L0,28 L-3.6,22 Z" fill="#b86a00" stroke="#5a2a00" stroke-width="1"/>
    <path d="M-1.6,-32 L-3.6,-28 M-1.6,-16 L-3,-12" stroke="#fff6d0" stroke-width="1.2" stroke-linecap="round"/>
    ${pair(brow, 'fill="#5a2600" stroke="#2a1000" stroke-width="1.4" stroke-linejoin="round"')}
    ${pair(eye, 'fill="#ff6a1a" filter="url(#b3)"')}
    ${pair(eye, 'fill="url(#ey)" stroke="#2a0400" stroke-width="1.4" stroke-linejoin="round"')}
    ${pair('M-16,-9.4 C-15,-8 -14.6,-7.4 -14,-6.2', 'fill="none" stroke="#2a0400" stroke-width="1.6" stroke-linecap="round"')}
    ${pair('M-9,44 C-8,42 -6,41.4 -4.6,42.4 C-4,44 -5.6,46.6 -8,46.4 Z', 'fill="#2a0800"')}
    ${pair('M-12.6,45 L-11,60 L-8.4,47.6 Z', 'fill="#fffaf0" stroke="#2a1000" stroke-width="1.3" stroke-linejoin="round"')}
    <path d="M-14,-36 C-8,-39 -2,-40 2,-39.6" fill="none" stroke="#fffbe6" stroke-width="2" stroke-linecap="round" opacity=".85"/>`, ' class="logo" aria-hidden="true"');
}

// ═════════════════════════ 危险区平铺纹理（48×48，四向无缝） ═════════════════════════
export function zoneTileSvg(px) {
  // 一道爪痕：沿 135°（右上→左下）的弯月形划痕
  const slash = (x, y, L, w) => `M0,0 Q${n2(L * .42)},${-w} ${L},0 Q${n2(L * .5)},${n2(w * .45)} 0,0 Z`;
  const claw = (x, y, k = 1) => [-1, 0, 1].map(i => {
    const L = (i === 0 ? 30 : 25) * k, w = (i === 0 ? 3.2 : 2.6) * k;
    return `<path d="${slash(0, 0, L, w)}" transform="translate(${n2(x + i * 4.2 - (i === 0 ? 1.6 : 0))},${n2(y + i * 4.2 - (i === 0 ? 1.6 : 0))}) rotate(135)"/>`;
  }).join('');
  const marks = claw(44, 3) + claw(20, 27, .92);
  const embers = [[8, 10, 1], [30, 40, .8], [42, 30, .7], [16, 42, .6], [34, 14, .6]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('');
  const wrap = s => [-48, 0, 48].flatMap(dx => [-48, 0, 48].map(dy => `<g transform="translate(${dx},${dy})">${s}</g>`)).join('');
  // 斜向底纹带（周期 24，沿对角线贯通，天然无缝）
  const bands = [-48, -24, 0, 24, 48].map(o => `M${o - 12},48 L${o + 36},0 L${o + 44},0 L${o - 4},48 Z`).join(' ');
  return svg(px, px, '0 0 48 48', `<defs>
      ${blurU('g', 1.8, -60, -60, 168, 168)}${blurU('g2', .8, -60, -60, 168, 168)}
    </defs>
    <rect width="48" height="48" fill="#6a0414" fill-opacity=".34"/>
    <path d="${bands}" fill="#ff2a40" fill-opacity=".09"/>
    <g fill="#1a0004" fill-opacity=".5" transform="translate(1.2,1.2)">${wrap(marks)}</g>
    <g fill="#ff3a14" opacity=".75" filter="url(#g)">${wrap(marks)}</g>
    <g fill="#ff6a1a">${wrap(marks)}</g>
    <g fill="#ffd25a" transform="translate(-.5,-.5)" opacity=".85">${wrap(marks.replace(/rotate\(135\)/g, 'rotate(135) scale(.92,.42)'))}</g>
    <g fill="#ffb43a" opacity=".9" filter="url(#g2)">${wrap(embers)}</g>`);
}

// ═════════════════════════ 危险区警告标记（56）：红色符文圈 + 龙爪印 ═════════════════════════
export function zoneGlyphSvg(px) {
  // 三趾龙足印：从脚跟放射出的修长脚趾 + 弯钩利爪
  // 龙爪印：一块掌垫 + 三个分开的趾垫，每个趾垫前端一枚弯钩白爪
  const toe = (x, y, a) => `<g transform="translate(${x},${y}) rotate(${a})">
      <path d="M-2,-3.4 C-2.6,-8.6 -.8,-12.4 3.2,-14.6 C1.6,-11 1.8,-7.4 2.2,-3.6 Z" fill="url(#tl)" stroke="#1a0004" stroke-width=".9" stroke-linejoin="round"/>
      <path d="M0,-5.6 C2.8,-5.6 3.8,-2.6 3.6,1 C3.4,4 2,5.4 0,5.4 C-2,5.4 -3.4,4 -3.6,1 C-3.8,-2.6 -2.8,-5.6 0,-5.6 Z" fill="url(#cl)" stroke="#1a0004" stroke-width="1.1"/>
      <path d="M-1.8,-2 C-1.6,-3.2 -.8,-3.8 .2,-3.8" fill="none" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".8"/>
    </g>`;
  return svg(px, px, '-32 -32 64 64', `<defs>
      <radialGradient id="cd" cx="0" cy="0" r="24" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5a0010" stop-opacity=".92"/><stop offset=".75" stop-color="#2a0008" stop-opacity=".9"/><stop offset="1" stop-color="#14000a" stop-opacity=".92"/></radialGradient>
      <linearGradient id="cl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe0e2"/><stop offset=".4" stop-color="#ff5a68"/><stop offset="1" stop-color="#b0001c"/></linearGradient>
      <linearGradient id="tl" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ffb0b6"/></linearGradient>
      ${blurU('b', 2.4, -32, -32, 64, 64)}${blurU('b1', 1.2, -32, -32, 64, 64)}
    </defs>
    <circle r="27.5" fill="none" stroke="#ff1f3a" stroke-width="6" opacity=".7" filter="url(#b)"/>
    <circle r="27.5" fill="#2a0008" fill-opacity=".82"/>
    <circle r="23.6" fill="url(#cd)"/>
    <circle r="30.4" fill="none" stroke="#ff4d5e" stroke-width="1.6"/>
    <circle r="23.6" fill="none" stroke="#ff4d5e" stroke-width="1.6"/>
    ${runeRing(27, 14, 1.9, 1.15, '#ffb0b6', 1, 12)}
    ${[0, 90, 180, 270].map(a => `<path transform="rotate(${a})" d="M0,-31.6 L2.8,-27 L0,-24.6 L-2.8,-27 Z" fill="#ffd0d4" stroke="#3a0008" stroke-width=".7"/>`).join('')}
    <g filter="url(#b)" opacity=".95" fill="#ff2a3a"><ellipse cy="7" rx="8.6" ry="7.4"/><circle cx="-10.6" cy="-4.4" r="5.4"/><circle cy="-9.6" r="5.4"/><circle cx="10.6" cy="-4.4" r="5.4"/></g>
    <path d="M-7.6,8 C-8.4,2.4 -4.6,-.6 0,-.6 C4.6,-.6 8.4,2.4 7.6,8 C7,12.4 3.6,14.6 0,13.6 C-3.6,14.6 -7,12.4 -7.6,8 Z" fill="url(#cl)" stroke="#1a0004" stroke-width="1.2"/>
    <path d="M-4.6,3.4 C-3.2,1.8 -1.4,1.2 .6,1.2" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".8"/>
    ${toe(-10.6, -4.4, -32)}${toe(0, -9.6, 0)}${toe(10.6, -4.4, 32)}`);
}

// ═════════════════════════ 「英灵附体」金色符文环（56，绕英雄旋转，中心透明） ═════════════════════════
export function radarSvg(px) {
  const jewel = a => { const [x, y] = P(25, a); return `<g transform="translate(${x},${y}) rotate(${a})"><path d="M0,-3.4 L2.2,0 L0,3.4 L-2.2,0 Z" fill="#fffbe6" stroke="#8a5a00" stroke-width=".5"/></g>`; };
  const tail = a => `<path d="M${P(25, a - 4).join(',')} A25,25 0 0 0 ${P(25, a - 70).join(',')}" fill="none" stroke="url(#tg${a})" stroke-width="3.2" stroke-linecap="round"/>`;
  const tg = [0, 120, 240].map(a => { const [x1, y1] = P(25, a), [x2, y2] = P(25, a - 70); return `<linearGradient id="tg${a}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff6c8"/><stop offset=".4" stop-color="#ffcc3a" stop-opacity=".7"/><stop offset="1" stop-color="#ffcc3a" stop-opacity="0"/></linearGradient>`; }).join('');
  return svg(px, px, '-30 -30 60 60', `<defs>${tg}${blurU('b', 1.6, -30, -30, 60, 60)}</defs>
    <circle r="25" fill="none" stroke="#ffb43a" stroke-width="5" opacity=".35" filter="url(#b)"/>
    <circle r="27.6" fill="none" stroke="#ffd86b" stroke-width="1.1"/>
    <circle r="22.4" fill="none" stroke="#ffd86b" stroke-width=".8" opacity=".75"/>
    <circle r="25" fill="none" stroke="#ffe8a0" stroke-width=".5" stroke-dasharray="1 2.2" opacity=".6"/>
    ${runeRing(25, 18, 1.35, .75, '#fff1c0', .95, 10, 5)}
    <g filter="url(#b)" opacity=".9">${[0, 120, 240].map(tail).join('')}</g>
    ${[0, 120, 240].map(tail).join('')}
    ${[0, 120, 240].map(a => { const [x, y] = P(25, a); return `<circle cx="${x}" cy="${y}" r="4.2" fill="#ffcc3a" opacity=".6" filter="url(#b)"/>`; }).join('')}
    ${[0, 120, 240].map(jewel).join('')}`);
}

// ═════════════════════════ 盾击冲击波弧（viewBox -100 -70 200 90，金白色向上扩散） ═════════════════════════
export function shockArcSvg(pxW, pxH) {
  const C = [0, 20];
  const at = (r, deg) => { const [x, y] = P(r, deg); return [n2(x + C[0]), n2(y + C[1])]; };
  const arc = (r, a0, a1) => `M${at(r, a0).join(',')} A${r},${r} 0 0 1 ${at(r, a1).join(',')}`;
  const streaks = [[-64, 74, 89], [-52, 79, 91], [-41, 70, 84], [-27, 77, 92], [-15, 72, 88], [-4, 80, 93], [9, 71, 86], [21, 78, 92], [33, 73, 87], [46, 79, 91], [58, 70, 85], [67, 76, 88]].map(([a, r0, r1]) => `<path d="M${at(r0, a).join(',')} L${at(r1, a).join(',')}"/>`).join('');
  const shards = [-56, -30, 0, 30, 56].map(a => { const [x, y] = at(86, a); return `<path transform="translate(${x},${y}) rotate(${a})" d="M0,-5 L2,0 L0,4 L-2,0 Z"/>`; }).join('');
  return svg(pxW, pxH, '-100 -70 200 90', `<defs>
      <radialGradient id="sw" cx="0" cy="20" r="93" gradientUnits="userSpaceOnUse"><stop offset=".64" stop-color="#ffe08a" stop-opacity="0"/><stop offset=".82" stop-color="#ffe9a8" stop-opacity=".32"/><stop offset=".9" stop-color="#fff6d6" stop-opacity=".75"/><stop offset=".95" stop-color="#ffffff"/><stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></radialGradient>
      <linearGradient id="fx" x1="-100" y1="0" x2="100" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".2" stop-color="#fff"/><stop offset=".8" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <mask id="m" maskUnits="userSpaceOnUse" x="-100" y="-70" width="200" height="90"><rect x="-100" y="-70" width="200" height="90" fill="url(#fx)"/></mask>
      ${blurU('b', 2.6, -100, -70, 200, 90)}${blurU('b2', 5, -100, -70, 200, 90)}
    </defs>
    <g mask="url(#m)">
      <path d="${arc(92, -78, 78)} L${at(62, 78).join(',')} A62,62 0 0 0 ${at(62, -78).join(',')} Z" fill="url(#sw)"/>
      <path d="${arc(84, -76, 76)}" fill="none" stroke="#ffcc4d" stroke-width="10" opacity=".55" filter="url(#b2)"/>
      <path d="${arc(84, -76, 76)}" fill="none" stroke="#fff6d6" stroke-width="4.4" filter="url(#b)"/>
      <path d="${arc(84, -76, 76)}" fill="none" stroke="#ffffff" stroke-width="1.8"/>
      <path d="${arc(73, -70, 70)}" fill="none" stroke="#ffe08a" stroke-width="2.4" opacity=".45" filter="url(#b)"/><path d="${arc(73, -66, 66)}" fill="none" stroke="#fff3c4" stroke-width=".9" opacity=".7"/>
      <path d="${arc(62, -64, 64)}" fill="none" stroke="#ffd86b" stroke-width="1" opacity=".4"/>
      <g stroke="#fff3c4" stroke-width="1.1" stroke-linecap="round" opacity=".6">${streaks}</g>
      <g fill="#fffbe6" stroke="#ffb43a" stroke-width=".6">${shards}</g>
    </g>`);
}

// ═════════════════════════ 旋风斩刀光环（中心透明，整体旋转绘制，叠加混合） ═════════════════════════
export function whirlSvg(px) {
  // 月牙剑气：前缘最厚、向后收成一根细丝
  const crescent = (a, ro, w, span, id) => {
    const o = [], i = [];
    for (let k = 0; k <= 20; k++) { const t = k / 20, r = ro - 4 * t; o.push(P(r, a - span * t)); i.push(P(r - w * (1 - t) ** 1.3, a - span * t)); }
    return `<path d="M${pts(o)} L${pts(i.reverse())} Z" fill="url(#${id})"/>`;
  };
  const edge = (a, r, span, id, sw) => `<path d="M${P(r, a).join(',')} A${r},${r} 0 0 0 ${P(r - 3, a - span).join(',')}" fill="none" stroke="url(#${id})" stroke-width="${sw}" stroke-linecap="round"/>`;
  const grad = (a, span, id, c0, c1) => { const [x1, y1] = P(66, a), [x2, y2] = P(60, a - span); return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c0}"/><stop offset=".35" stop-color="${c1}" stop-opacity=".75"/><stop offset="1" stop-color="${c1}" stop-opacity="0"/></linearGradient>`; };
  const sword = (a, op) => `<g transform="rotate(${a})" opacity="${op}">
      <path d="M0,-69 L3.6,-62 L3.4,-30 L-3.4,-30 L-3.6,-62 Z" fill="url(#bl)"/>
      <path d="M0,-66 V-32" stroke="#ffffff" stroke-width="1.2"/>
      <path d="M-8,-30.4 L8,-30.4 L6.6,-27.4 L-6.6,-27.4 Z" fill="#ffd86b"/>
      <rect x="-1.5" y="-27.4" width="3" height="5" fill="#c08a3a"/><circle cy="-21.4" r="1.9" fill="#ffd86b"/>
    </g>`;
  const A = [0, 120, 240];
  return svg(px, px, '-72 -72 144 144', `<defs>
      <radialGradient id="rg" cx="0" cy="0" r="72" gradientUnits="userSpaceOnUse"><stop offset=".5" stop-color="#3a8cff" stop-opacity="0"/><stop offset=".8" stop-color="#7fc8ff" stop-opacity=".08"/><stop offset=".93" stop-color="#bfe6ff" stop-opacity=".16"/><stop offset="1" stop-color="#7fc8ff" stop-opacity="0"/></radialGradient>
      <linearGradient id="bl" x1="-4" y1="0" x2="4" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#cfeaff"/><stop offset="1" stop-color="#5aa8ff"/></linearGradient>
      ${A.map(a => grad(a, 118, `c${a}`, '#ffffff', '#8fd0ff') + grad(a + 60, 80, `d${a}`, '#fff3c4', '#ffcc4d')).join('')}
      ${blurU('g', 3, -72, -72, 144, 144)}${blurU('g2', 1.2, -72, -72, 144, 144)}
    </defs>
    <circle r="70" fill="url(#rg)"/>
    <g filter="url(#g)" opacity=".7">${A.map(a => crescent(a, 68, 16, 110, `c${a}`)).join('')}</g>
    ${A.map(a => crescent(a, 68, 11, 110, `c${a}`)).join('')}
    ${A.map(a => edge(a, 68, 100, `c${a}`, 1.6)).join('')}
    ${A.map(a => crescent(a + 60, 54, 6, 76, `d${a}`)).join('')}
    ${A.map(a => edge(a + 60, 54, 70, `d${a}`, 1)).join('')}
    <g filter="url(#g2)">${A.map(a => sword(a - 22, .18) + sword(a - 11, .35)).join('')}</g>
    <g filter="url(#g)" opacity=".8">${A.map(a => sword(a, 1)).join('')}</g>
    ${A.map(a => sword(a, 1)).join('')}
    ${A.map(a => { const [x, y] = P(69, a); return twinkle(x, y, 4.6, '#ffffff'); }).join('')}
    ${[30, 75, 160, 200, 290, 330].map((a, i) => { const [x, y] = P(58 + (i % 3) * 5, a); return twinkle(x, y, 1.8 + (i % 2), '#e6f6ff', .85); }).join('')}`);
}

// ═════════════════════════ 圣盾无敌金色光环（84，中心透明） ═════════════════════════
export function invulnAuraSvg(px) {
  const crest = a => { const [x, y] = P(31, a); return `<g transform="translate(${x},${y}) rotate(${a})">
      <path d="M-3.4,-3.4 Q0,-4.6 3.4,-3.4 L3.4,0 C3.4,2.4 1.6,3.8 0,4.8 C-1.6,3.8 -3.4,2.4 -3.4,0 Z" fill="url(#cg)" stroke="#7a4a00" stroke-width=".6"/>
      <path d="M-.6,-2.6 h1.2 v1.6 h1.6 v1.2 h-1.6 v2.8 h-1.2 v-2.8 h-1.6 v-1.2 h1.6 Z" fill="#fff"/></g>`; };
  const spikes = Array.from({ length: 16 }, (_, i) => { const a = i * 22.5 + 11.25, l = i % 2 ? 37 : 39.4; const [x0, y0] = P(34.4, a - 2.4), [x1, y1] = P(l, a), [x2, y2] = P(34.4, a + 2.4); return `M${x0},${y0} L${x1},${y1} L${x2},${y2} Z`; }).join(' ');
  return svg(px, px, '-40 -40 80 80', `<defs>
      <radialGradient id="a" cx="0" cy="0" r="40" gradientUnits="userSpaceOnUse"><stop offset=".55" stop-color="#ffe08a" stop-opacity="0"/><stop offset=".74" stop-color="#ffd86b" stop-opacity=".2"/><stop offset=".86" stop-color="#ffcc4d" stop-opacity=".5"/><stop offset="1" stop-color="#ffb43a" stop-opacity="0"/></radialGradient>
      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffbe0"/><stop offset=".5" stop-color="#ffd24a"/><stop offset="1" stop-color="#c0800e"/></linearGradient>
      ${blurU('b', 1.8, -40, -40, 80, 80)}
    </defs>
    <circle r="40" fill="url(#a)"/>
    <path d="${spikes}" fill="#ffe8a0" opacity=".85"/>
    <g filter="url(#b)"><circle r="31" fill="none" stroke="#ffcc3a" stroke-width="5" opacity=".7"/></g>
    <circle r="34.2" fill="none" stroke="#fff3c4" stroke-width="1.2"/>
    <circle r="27.8" fill="none" stroke="#ffe08a" stroke-width="1"/>
    <circle r="31" fill="none" stroke="#ffd86b" stroke-width="5.6" opacity=".22"/>
    ${runeRing(31, 20, 1.6, .8, '#fffbe6', .95, 9, 1)}
    <circle r="25" fill="none" stroke="#ffe08a" stroke-width=".7" stroke-dasharray="2 3" opacity=".6"/>
    ${[0, 90, 180, 270].map(crest).join('')}
    ${[45, 135, 225, 315].map(a => { const [x, y] = P(31, a); return twinkle(x, y, 3.6, '#ffffff'); }).join('')}`);
}

// ═════════════════════════ 牧师护盾泡（58，半透明，符文纹，中心透明） ═════════════════════════
export function shieldBubbleSvg(px, color = '#ffe8a0') {
  const tri = r => [0, 120, 240].map(a => P(r, a));
  const hexa = [tri(19.6), tri(19.6).map(([x, y]) => [-x, -y])].map(t => `M${pts(t)} Z`).join(' ');
  return svg(px, px, '-30 -30 60 60', `<defs>
      <radialGradient id="g" cx="0" cy="0" r="27" gradientUnits="userSpaceOnUse"><stop offset=".5" stop-color="${color}" stop-opacity="0"/><stop offset=".78" stop-color="${color}" stop-opacity=".12"/><stop offset=".94" stop-color="${color}" stop-opacity=".45"/><stop offset="1" stop-color="#ffffff" stop-opacity=".75"/></radialGradient>
      <radialGradient id="h" cx="-9" cy="-12" r="14" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      ${blurU('b', 1.4, -30, -30, 60, 60)}
    </defs>
    <circle r="26.6" fill="none" stroke="${color}" stroke-width="3" opacity=".55" filter="url(#b)"/>
    <circle r="26" fill="url(#g)"/>
    <circle r="26" fill="url(#h)"/>
    <path d="${hexa}" fill="none" stroke="${color}" stroke-width=".7" stroke-opacity=".22" stroke-linejoin="round"/>
    <circle r="19.6" fill="none" stroke="${color}" stroke-width=".6" stroke-opacity=".25"/>
    <circle r="23.6" fill="none" stroke="${color}" stroke-width=".7" stroke-opacity=".55" stroke-dasharray="1.2 2"/>
    ${runeRing(21.8, 16, 1.25, .7, color, .6, 0, 2)}
    <circle r="26" fill="none" stroke="#ffffff" stroke-opacity=".8" stroke-width="1.1"/>
    <path d="M-17,-17.4 A24,24 0 0 1 6,-23.4" stroke="#fff" stroke-opacity=".9" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M14,18 A23,23 0 0 1 4,22.4" stroke="#fff" stroke-opacity=".5" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    ${twinkle(-18.6, -12.4, 2.4, '#fff')}`);
}

// ═════════════════════════ 屠龙巨弩（56，弩口朝上；load 0~1 装填进度，内部分 3 档） ═════════════════════════
// 鱼叉本体（harpoon 坐标系：尖端 y≈-31.5，尾部 y≈31）；ballista 里复用（无绳结）
function harpoonBody(glow, knot = true) {
  return `${glow ? `<ellipse cy="-20" rx="7" ry="12" fill="#ffcc3a" opacity=".8" filter="url(#hb)"/>` : ''}
    <path d="M-1.5,-9 L1.5,-9 L1.7,24 L-1.7,24 Z" fill="url(#hw)" stroke="#1e0e04" stroke-width=".8"/>
    <path d="M-.5,-8 V23" stroke="#e8b878" stroke-width=".5" opacity=".7"/>
    <g fill="url(#hi)" stroke="#11151c" stroke-width=".6">${[3, 13].map(y => `<rect x="-2.3" y="${y}" width="4.6" height="2.2" rx=".6"/>`).join('')}</g>
    <g filter="url(#hr)">${[[-2, 5], [8, 7], [18, 3]].map(([y, i]) => `<path d="${RUNES[i]}" transform="translate(0,${y}) scale(1.3,1.6)" fill="none" stroke="#ffd86b" stroke-width=".6" stroke-linecap="round"/>`).join('')}</g>
    <path d="M-2.6,-14 L2.6,-14 L2.2,-8 L-2.2,-8 Z" fill="url(#hi)" stroke="#11151c" stroke-width=".7"/>
    <path d="M-2.6,-11.6 H2.6" stroke="#ffcc3a" stroke-width=".9"/>
    <path d="M0,-31.6 C1.6,-28 3.2,-25.4 3.6,-22 C5,-19 6.4,-16 7,-11.4 C6,-13.2 4.6,-14.4 3,-14.8 L2.2,-14 L-2.2,-14 L-3,-14.8 C-4.6,-14.4 -6,-13.2 -7,-11.4 C-6.4,-16 -5,-19 -3.6,-22 C-3.2,-25.4 -1.6,-28 0,-31.6 Z" fill="url(#hs)" stroke="#0e1218" stroke-width=".9" stroke-linejoin="round"/>
    <path d="M3.4,-21 C4.6,-18.6 5.6,-16.4 6,-13.6 M-3.4,-21 C-4.6,-18.6 -5.6,-16.4 -6,-13.6" fill="none" stroke="#3a4252" stroke-width=".5"/>
    <path d="M0,-30 L0,-15" stroke="#5a6478" stroke-width=".8"/><path d="M-1,-28 C-1.8,-25 -2.4,-22 -2.6,-18.4" fill="none" stroke="#fff" stroke-width=".7" opacity=".9"/>
    ${glow ? `<path d="M0,-31.6 C1.6,-28 3.2,-25.4 3.6,-22 L0,-18 L-3.6,-22 C-3.2,-25.4 -1.6,-28 0,-31.6 Z" fill="#ffe680" opacity=".55"/>${twinkle(0, -31, 4, '#fffbe6')}` : ''}
    ${knot ? `<path d="M-1.6,24 C-3.6,24.6 -3.8,27.4 -1.6,28 C-3.6,28.6 -3.4,31 0,31 C3.4,31 3.6,28.6 1.6,28 C3.8,27.4 3.6,24.6 1.6,24 Z" fill="url(#hp)" stroke="#3a2408" stroke-width=".7"/>
    <path d="M-2.4,26 L2.4,26.6 M-2.4,29.2 L2.4,29.8" stroke="#8a6a3a" stroke-width=".5"/>
    <path d="M.6,31 C1.6,31.6 3,31.2 4.4,31.8" fill="none" stroke="#c8a66a" stroke-width="1" stroke-linecap="round"/>` : ''}`;
}
const harpoonDefs = `<linearGradient id="hw" x1="-2" y1="0" x2="2" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#d6a066"/><stop offset=".5" stop-color="#9a6232"/><stop offset="1" stop-color="#4a2a12"/></linearGradient>
  <linearGradient id="hs" x1="-7" y1="0" x2="7" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".42" stop-color="#d4dce8"/><stop offset=".56" stop-color="#8a96aa"/><stop offset="1" stop-color="#3a4252"/></linearGradient>
  <linearGradient id="hi" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b8c2d2"/><stop offset=".5" stop-color="#5a6274"/><stop offset="1" stop-color="#1e232c"/></linearGradient>
  <linearGradient id="hp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f0dcae"/><stop offset="1" stop-color="#9a7a44"/></linearGradient>
  <filter id="hr" x="-200%" y="-50%" width="500%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation=".7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="hb" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3.2"/></filter>`;

export function ballistaSvg(px, load = 0) {
  const st = load >= 1 ? 2 : load >= 0.5 ? 1 : 0;
  const bend = [1, 4.6, 8.2][st], ty = -10 + bend, sy = [ty, 5, 13][st];
  const arm = `M-6,-12.4 Q-18,-14 -28.6,${n2(ty - 1.6)} L-29.2,${n2(ty + 1.4)} Q-18,-8.4 -6,-7.6 Z`;
  return svg(px, px, '-32 -32 64 64', `<defs>${harpoonDefs}
      <linearGradient id="wd" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d89c5a"/><stop offset=".5" stop-color="#a0662e"/><stop offset="1" stop-color="#4e2c10"/></linearGradient>
      <linearGradient id="wv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d89c5a"/><stop offset=".55" stop-color="#8e5626"/><stop offset="1" stop-color="#4a280e"/></linearGradient>
      <linearGradient id="ir" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d6dde8"/><stop offset=".5" stop-color="#6a7488"/><stop offset="1" stop-color="#22272f"/></linearGradient>
      <radialGradient id="wh" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#8e5a2a"/><stop offset="1" stop-color="#3a1e08"/></radialGradient>
      <radialGradient id="gg"><stop offset="0" stop-color="#fffbe0"/><stop offset=".4" stop-color="#ffd24a" stop-opacity=".8"/><stop offset="1" stop-color="#ffb43a" stop-opacity="0"/></radialGradient>
      ${blurU('sh', 2.4, -32, -32, 64, 64)}
    </defs>
    <ellipse cy="17" rx="25" ry="10" fill="#000" opacity=".45" filter="url(#sh)"/>
    ${pair('M-21,8.6 C-21,6.4 -15.6,6.4 -15.6,8.6 L-15.6,23.4 C-15.6,25.6 -21,25.6 -21,23.4 Z', 'fill="url(#wh)" stroke="#1a0c04" stroke-width="1"')}
    ${pair('M-18.3,7.4 V24.6 M-20.6,12 L-16,12 M-20.6,20 L-16,20', 'stroke="#c8925a" stroke-width=".8" opacity=".7"')}
    ${pair('M-21,10 L-21,22', 'stroke="url(#ir)" stroke-width="1.4"')}
    <path d="M-15,4 L15,4 L16.6,25 L-16.6,25 Z" fill="url(#wv)" stroke="#1a0c04" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M-15.3,9.4 L15.3,9.4 M-15.7,14.6 L15.7,14.6 M-16.1,19.8 L16.1,19.8" stroke="#3a1e08" stroke-width=".7" opacity=".7"/>
    ${pair('M-16.6,25 L-12.4,25 L-12.6,21.6 L-16.3,21.6 Z M-15,4 L-11,4 L-11.2,7.4 L-15.2,7.4 Z', 'fill="url(#ir)" stroke="#11151c" stroke-width=".5"')}
    <rect x="-11" y="16.4" width="22" height="7.2" rx="2.2" fill="#c8a66a" stroke="#2a1806" stroke-width="1"/>
    <path d="M-8,16.6 L-8.8,23.4 M-4,16.6 L-4.8,23.4 M0,16.6 L-.8,23.4 M4,16.6 L3.2,23.4 M8,16.6 L7.2,23.4" stroke="#7a5a2a" stroke-width=".7"/>
    ${pair('M-13.6,15.4 L-13.6,24.6 M-17.2,20 L-10,20', 'stroke="url(#ir)" stroke-width="1.8" stroke-linecap="round"')}
    ${pair('M-13.6,20 m-1.6,0 a1.6,1.6 0 1 0 3.2,0 a1.6,1.6 0 1 0 -3.2,0', 'fill="url(#ir)" stroke="#11151c" stroke-width=".5"')}
    <path d="M-4.6,-17 L4.6,-17 L4.8,21 L-4.8,21 Z" fill="url(#wd)" stroke="#1a0c04" stroke-width="1.1" stroke-linejoin="round"/>
    <rect x="-1.4" y="-16" width="2.8" height="31" fill="#2a1406" opacity=".85"/>
    ${[-13.4, -1, 9].map(y => `<rect x="-5.4" y="${y}" width="10.8" height="2.4" rx=".6" fill="url(#ir)" stroke="#11151c" stroke-width=".5"/>`).join('')}
    <path d="M-5,-18.2 L5,-18.2 L4.6,-15.6 L-4.6,-15.6 Z" fill="url(#ir)" stroke="#11151c" stroke-width=".6"/>
    ${sy < 15 ? `<path d="M0,${n2(sy + 1.6)} L0,16.6" stroke="#2a1806" stroke-width="2" /><path d="M0,${n2(sy + 1.6)} L0,16.6" stroke="#d8bc80" stroke-width="1" stroke-dasharray="1.4 .8"/>` : ''}
    ${pair(arm, 'fill="url(#wv)" stroke="#1a0c04" stroke-width="1" stroke-linejoin="round"')}
    ${pair(`M-14,-12.8 Q-21,-12.8 -27.4,${n2(ty - .8)}`, 'fill="none" stroke="#f0c08a" stroke-width=".6" opacity=".7"')}
    ${pair(`M-12,-12.2 L-12.6,-8 M-20,${n2(-12.6 + bend * .35)} L-20.6,${n2(-8.6 + bend * .5)}`, 'stroke="url(#ir)" stroke-width="1.6"')}
    ${pair(`M-29,${ty} m-2,0 a2,2 0 1 0 4,0 a2,2 0 1 0 -4,0`, 'fill="url(#ir)" stroke="#11151c" stroke-width=".6"')}
    <path d="M-7.6,-13.6 L7.6,-13.6 L7.2,-6.6 L-7.2,-6.6 Z" fill="url(#ir)" stroke="#11151c" stroke-width=".9"/>
    ${[-5.4, 5.4].map(x => `<circle cx="${x}" cy="-10.1" r=".9" fill="#e6ecf4" stroke="#11151c" stroke-width=".3"/>`).join('')}
    <path d="M-28.4,${ty} L0,${sy} L28.4,${ty}" fill="none" stroke="#1e1208" stroke-width="2" stroke-linejoin="round"/>
    <path d="M-28.4,${ty} L0,${sy} L28.4,${ty}" fill="none" stroke="#f0e0b8" stroke-width=".9" stroke-linejoin="round"/>
    ${st > 0 ? `<g transform="translate(0,${n2(sy - 12.4)}) scale(.6)">${harpoonBody(st === 2, false)}</g>` : ''}
    <rect x="-3.2" y="${n2(sy - .4)}" width="6.4" height="3" rx=".8" fill="url(#ir)" stroke="#11151c" stroke-width=".6"/>
    ${st === 2 ? `<circle cy="${n2(sy - 31)}" r="9" fill="url(#gg)"/>${twinkle(0, n2(sy - 31), 6, '#fffbe6')}
      <g stroke="#ffd86b" stroke-width=".8" stroke-linecap="round" opacity=".9">${pair('M-4.2,-4 L-6.2,-4 M-4.2,1 L-6.2,1 M-4.2,6 L-6.2,6', '')}</g>` : ''}`);
}

// ═════════════════════════ 屠龙鱼叉（16×64 逻辑，竖长，尖朝上；(pxW, pxH)） ═════════════════════════
export function harpoonSvg(pxW, pxH = pxW * 4) {
  return svg(pxW, pxH, '-8 -32 16 64', `<defs>${harpoonDefs}</defs>
    <rect x="-2.4" y="-12" width="4.8" height="34" fill="#ffcc3a" opacity=".25" filter="url(#hb)"/>
    ${harpoonBody(true, true)}`);
}

// ═════════════════════════ 神殿祝福图标（48，圆形金边徽章，神殿金光底） ═════════════════════════
const BLESS = {
  fire:    { tint: '#ff6a1a', glow: '#ffae3a', gem: '#ff6a1a' },
  holy:    { tint: '#fff0a0', glow: '#fff6c8', gem: '#ffffff' },
  wind:    { tint: '#38e8c0', glow: '#9dfff0', gem: '#5fffd0' },
  slayer:  { tint: '#ff2a3a', glow: '#ff7a7a', gem: '#ff3b4e' },
  sage:    { tint: '#5a8cff', glow: '#a8c8ff', gem: '#6aa8ff' },
  greed:   { tint: '#d4282a', glow: '#ffd23a', gem: '#ffd23a' },
  undying: { tint: '#ff5a86', glow: '#ffb0c8', gem: '#ff7aa0' },
  fury:    { tint: '#e01818', glow: '#ff5a3a', gem: '#ff2a2a' },
};
const INK = '#2a1200';
const BLESS_SYM = {
  // 烈焰附魔：烈焰缠绕的长剑
  fire: () => `<path d="M0,-18.6 C3.6,-13 10,-9.6 10,-1 C10,6.4 5.4,11.6 0,12.6 C-5.4,11.6 -10,6.4 -10,-1 C-10,-6 -7,-9.6 -5.6,-13 C-4.6,-8.6 -3.4,-7.4 -1.8,-6.4 C-2.8,-11.6 -1.8,-15.6 0,-18.6 Z" fill="url(#fi)" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>
    <path d="M0,-7 C2,-3.6 5,-1.6 5,2.6 C5,6.4 2.6,8.6 0,9 C-2.6,8.6 -5,6.4 -5,2.6 C-5,-.6 -3,-2.6 -2,-4.4 C-1.2,-2.4 -.6,-2 0,-1.6 C-.6,-3.4 -.4,-5.4 0,-7 Z" fill="#fff4b8" opacity=".9"/>
    <path d="M0,-16.4 L2,-12.6 L2,7 L-2,7 L-2,-12.6 Z" fill="url(#mt)" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>
    <path d="M-6.4,7 h12.8 v2.4 h-12.8 Z" fill="url(#gd)" stroke="${INK}" stroke-width=".8"/>
    <rect x="-1.1" y="9.4" width="2.2" height="5.2" fill="#5a2a10" stroke="${INK}" stroke-width=".6"/><circle cy="16" r="1.7" fill="url(#gd)" stroke="${INK}" stroke-width=".6"/>`,
  // 圣光庇护：白金圣盾 + 光环
  holy: () => `<ellipse cy="-15.4" rx="7.4" ry="2.2" fill="none" stroke="#fff6c8" stroke-width="1.6"/>
    <path d="M-11,-10 Q0,-14 11,-10 L11,-.6 C11,7.4 5.6,12.4 0,16 C-5.6,12.4 -11,7.4 -11,-.6 Z" fill="url(#mt)" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M-11,-10 Q0,-14 11,-10 L11,-.6 C11,7.4 5.6,12.4 0,16 C-5.6,12.4 -11,7.4 -11,-.6 Z" transform="translate(0,1) scale(.76)" fill="none" stroke="url(#gd)" stroke-width="1.8"/>
    <path d="M-2,-8.6 h4 v5 h5 v3.8 h-5 v9.4 h-4 v-9.4 h-5 v-3.8 h5 Z" fill="url(#gd)" stroke="${INK}" stroke-width=".8" stroke-linejoin="round"/>`,
  // 疾风迅捷：三道旋风
  wind: () => {
    const s = (d, w) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="${w + 1.8}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="url(#wn)" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
    return s('M-15,-6 C-9,-12.4 3,-13 9,-9 C13,-6 12.2,-.6 8.2,-.4 C5,-.2 4,-3.4 6.2,-4.8', 2.8) + s('M-17,3.4 C-8,-.4 6,-.6 16,2.6', 2.4) + s('M-13,10 C-6,7.2 2,7.4 8,9.4 C11.4,10.6 11,14.6 8,14.8 C5.8,15 5,13 6.4,12', 2.4);
  },
  // 巨龙克星：一柄长剑贯穿龙首
  slayer: () => {
    const h = symPath([0, -9], [['C', -3, -9, -6, -7.6, -7.6, -5.6], ['L', -13, -10.4], ['L', -10, -3], ['L', -14, 1], ['L', -8.4, 2], ['C', -7.6, 6, -6, 10, -4, 13], ['C', -3, 14.4, -1.4, 15, 0, 15]]);
    return `${pair('M-6,-6.6 C-8.6,-11 -11.6,-15 -12,-19 C-9,-15.6 -6,-12.6 -2.6,-9.4 Z', `fill="url(#bn)" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"`)}
      <path d="${h}" fill="url(#dr)" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
      ${pair('M-8,-3 C-6,-3 -4,-1.6 -2.6,.4 C-4.6,.6 -6.6,-.6 -8,-3 Z', 'fill="#ffe680"')}
      ${pair('M-2.4,11 L-1.8,13', `stroke="${INK}" stroke-width="1" stroke-linecap="round"`)}
      <g transform="rotate(-38)">
        <path d="M0,-22 L2,-18.6 L2,13 L-2,13 L-2,-18.6 Z" fill="url(#mt)" stroke="${INK}" stroke-width=".9" stroke-linejoin="round" transform="rotate(180) translate(0,-4)"/>
        <path d="M-6.6,-11 h13.2 v2.4 h-13.2 Z" fill="url(#gd)" stroke="${INK}" stroke-width=".8"/>
        <rect x="-1.1" y="-16.8" width="2.2" height="5.8" fill="#5a2a10" stroke="${INK}" stroke-width=".6"/><circle cy="-18.4" r="1.8" fill="url(#gd)" stroke="${INK}" stroke-width=".6"/>
      </g>`;
  },
  // 贤者冥想：蓝沙沙漏
  sage: () => `<path d="M-7,-13 C-7,-5 -1.6,-3 -1.6,0 C-1.6,3 -7,5 -7,13 L7,13 C7,5 1.6,3 1.6,0 C1.6,-3 7,-5 7,-13 Z" fill="#dff0ff" fill-opacity=".4" stroke="#f4faff" stroke-width="1.1"/>
    <path d="M-5.2,-9 C-4,-5 -1,-3.4 0,-1 C1,-3.4 4,-5 5.2,-9 Z" fill="url(#sd)"/>
    <path d="M0,-1 V9" stroke="#bfe0ff" stroke-width=".9"/>
    <path d="M-6,12.6 C-4,8 -1.6,7 0,6.6 C1.6,7 4,8 6,12.6 Z" fill="url(#sd)"/>
    <rect x="-10" y="-16.6" width="20" height="3.6" rx="1.2" fill="url(#gd)" stroke="${INK}" stroke-width=".9"/>
    <rect x="-10" y="13" width="20" height="3.6" rx="1.2" fill="url(#gd)" stroke="${INK}" stroke-width=".9"/>
    ${pair('M-9.6,-13 h1.8 v26 h-1.8 Z', `fill="url(#gd)" stroke="${INK}" stroke-width=".6"`)}
    ${twinkle(-14.6, -6, 2, '#dcecff')}${twinkle(14.4, 4, 1.7, '#dcecff')}`,
  // 贪婪之心：金币堆 + 血红竖瞳
  greed: () => {
    const coin = (x, y) => `<g transform="translate(${x},${y})"><path d="M-4.6,0 v1.6 a4.6,1.8 0 0 0 9.2,0 v-1.6 Z" fill="#a86a00" stroke="${INK}" stroke-width=".6"/><ellipse rx="4.6" ry="1.8" fill="url(#gd)" stroke="${INK}" stroke-width=".6"/></g>`;
    return `<path d="M-15,16 C-13,9 -6,6.4 0,6.4 C6,6.4 13,9 15,16 Z" fill="url(#gd)" stroke="${INK}" stroke-width="1"/>
      ${[[-8, 12.4], [-2, 10.4], [5, 11.4], [10, 13.6], [-11, 14.6], [1, 14.6]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.6" ry="1" fill="none" stroke="#8a5200" stroke-width=".6"/>`).join('')}
      ${coin(-7, 5.6)}${coin(-7, 3.4)}${coin(7, 6)}${coin(7, 3.8)}${coin(7, 1.6)}${coin(0, 6.4)}
      <path d="M-12,-8 C-6.4,-15 6.4,-15 12,-8 C6.4,-1 -6.4,-1 -12,-8 Z" fill="#2a0004" stroke="${INK}" stroke-width="1.1"/>
      <circle cy="-8" r="5" fill="url(#ey)"/>
      <ellipse cy="-8" rx="1.2" ry="4.2" fill="#14000a"/>
      <circle cx="-1.8" cy="-10" r="1" fill="#fff"/>`;
  },
  // 不屈意志：生着羽翼的心
  undying: () => `${pair('M-6.6,-3 C-10,-7 -15,-10 -20,-10.4 C-18.8,-8.8 -18.8,-7.6 -19.6,-6 C-17.4,-5.8 -16.8,-4.4 -17.6,-2.6 C-15.4,-2.6 -14.6,-1.2 -15,.6 C-12.4,0 -11,1 -10.4,2.8 C-9,1.2 -7.6,.6 -6,.6 Z', `fill="url(#wg)" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"`)}
    <path d="M0,14 C-4,10 -10,6 -10,-.6 C-10,-5.6 -6,-8.4 -3,-8.4 C-1.4,-8.4 -.4,-7.6 0,-6.2 C.4,-7.6 1.4,-8.4 3,-8.4 C6,-8.4 10,-5.6 10,-.6 C10,6 4,10 0,14 Z" fill="url(#ht)" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>
    <path d="M-6.6,-4.6 C-5.4,-6 -3.6,-6.2 -2.4,-5.2" fill="none" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M0,-1 L0,8 M-3,2 L3,2" stroke="#fff4c4" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse cy="-14.6" rx="6.4" ry="1.9" fill="none" stroke="#fff6c8" stroke-width="1.4"/>`,
  // 狂战士：交叉双斧 + 暴击星芒
  fury: () => {
    const axe = a => `<g transform="rotate(${a})">
      <rect x="-1.1" y="-16" width="2.2" height="32" rx="1" fill="#6a3814" stroke="${INK}" stroke-width=".8"/>
      <path d="M1,-15.6 C5,-17.6 10,-16.6 12,-12.6 C13,-8.6 12,-4.6 10,-2.6 C8,-5.6 4.6,-7.6 1,-8.2 Z" fill="url(#mt)" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>
      <path d="M-1,-14.4 L-4.4,-13 L-4.4,-10 L-1,-9.4 Z" fill="url(#mt)" stroke="${INK}" stroke-width=".7"/>
      <path d="M10.6,-12 C11.4,-9 11,-6.6 10,-4.4" fill="none" stroke="#fff" stroke-width=".8"/>
      <rect x="-1.6" y="12.4" width="3.2" height="3" rx=".6" fill="url(#gd)" stroke="${INK}" stroke-width=".5"/></g>`;
    const burst = Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 9 : 19; return P(r, i * 36 + 18); });
    return `<path d="M${pts(burst)} Z" fill="url(#br)" opacity=".95"/>${axe(-32)}<g transform="scale(-1,1)">${axe(-32)}</g>`;
  },
};

export function blessingIconSvg(id, px) {
  const b = BLESS[id] || BLESS.holy;
  const sym = (BLESS_SYM[id] || BLESS_SYM.holy)();
  const rays = Array.from({ length: 16 }, (_, i) => { const a = i * 22.5, w = i % 2 ? 3.2 : 5.6, r = i % 2 ? 16 : 20; const [x0, y0] = P(3, a - w), [x1, y1] = P(r, a), [x2, y2] = P(3, a + w); return `M${x0},${y0} L${x1},${y1} L${x2},${y2} Z`; }).join(' ');
  const beads = Array.from({ length: 24 }, (_, i) => { const [x, y] = P(21.4, i * 15 + 7.5); return `<circle cx="${x}" cy="${y}" r=".75"/>`; }).join('');
  const gem = a => { const [x, y] = P(21.4, a); return `<path transform="translate(${x},${y}) rotate(${a})" d="M0,-2.6 L2,0 L0,2.6 L-2,0 Z" fill="url(#gm)" stroke="${INK}" stroke-width=".6"/>`; };
  return svg(px, px, '-24 -24 48 48', `<defs>
      <radialGradient id="bg" cx="0" cy="-2" r="20" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff6d0"/><stop offset=".22" stop-color="${b.tint}"/><stop offset=".62" stop-color="#7a3c06"/><stop offset="1" stop-color="#2a1200"/></radialGradient>
      <linearGradient id="rim" x1="-20" y1="-22" x2="18" y2="22" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fffbe0"/><stop offset=".3" stop-color="#ffd24a"/><stop offset=".6" stop-color="#c07a0a"/><stop offset=".8" stop-color="#ffe08a"/><stop offset="1" stop-color="#6a3a00"/></linearGradient>
      <radialGradient id="ry" cx="0" cy="0" r="20" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fffbe0" stop-opacity=".9"/><stop offset="1" stop-color="#ffd24a" stop-opacity=".1"/></radialGradient>
      <radialGradient id="gm" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="${b.gem}"/><stop offset="1" stop-color="#2a0a00"/></radialGradient>
      <linearGradient id="mt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#e2e8f2"/><stop offset=".56" stop-color="#a6b2c6"/><stop offset="1" stop-color="#5c6a84"/></linearGradient>
      <linearGradient id="gd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#ffd24a"/><stop offset="1" stop-color="#c0800e"/></linearGradient>
      <linearGradient id="fi" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe680"/><stop offset=".45" stop-color="#ff8a1e"/><stop offset="1" stop-color="#d02a06"/></linearGradient>
      <linearGradient id="wn" x1="-16" y1="0" x2="16" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#c8fff0"/><stop offset="1" stop-color="#5fffd0"/></linearGradient>
      <linearGradient id="dr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a6a"/><stop offset=".5" stop-color="#c41a1a"/><stop offset="1" stop-color="#5a0408"/></linearGradient>
      <linearGradient id="bn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf0"/><stop offset="1" stop-color="#a8885a"/></linearGradient>
      <linearGradient id="sd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6f2ff"/><stop offset="1" stop-color="#4a8cff"/></linearGradient>
      <radialGradient id="ey"><stop offset="0" stop-color="#fff0a0"/><stop offset=".45" stop-color="#ff3a1a"/><stop offset="1" stop-color="#7a0008"/></radialGradient>
      <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ffe0ea"/></linearGradient>
      <radialGradient id="ht" cx="-3" cy="-4" r="16" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffb0c0"/><stop offset=".45" stop-color="#ff2a50"/><stop offset="1" stop-color="#7a0020"/></radialGradient>
      <radialGradient id="br" cx="0" cy="0" r="19" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff0a0"/><stop offset=".45" stop-color="#ff4a1a"/><stop offset="1" stop-color="#a00010"/></radialGradient>
      <clipPath id="cl"><circle r="19.4"/></clipPath>
      ${glowF('gl', b.glow, 1.4, .95)}
    </defs>
    <circle r="23.6" fill="#1a0a00"/>
    <circle r="22.8" fill="url(#rim)"/>
    <g fill="#fff6c8" opacity=".8">${beads}</g>
    ${[0, 90, 180, 270].map(gem).join('')}
    <circle r="19.9" fill="#3a1c00"/>
    <circle r="19.4" fill="url(#bg)"/>
    <g clip-path="url(#cl)">
      <path d="${rays}" fill="url(#ry)" opacity=".5"/>
      <g fill="#fff3c4" opacity=".14">${pair('M-15,19 V4 h3.4 V19 Z M-8.6,19 V6 h3 V19 Z', '')}<path d="M-17,4 L0,-3 L17,4 Z"/></g>
      <path d="M-15,-11 C-8,-18 8,-18 15,-11 L15,-20 L-15,-20 Z" fill="#fff" opacity=".18"/>
    </g>
    <circle r="19.4" fill="none" stroke="#fff3c4" stroke-opacity=".5" stroke-width=".7"/>
    <g filter="url(#gl)">${sym}</g>`);
}

// ═════════════════════════ 「屠龙勇者」小王冠（22，顶在名字上方） ═════════════════════════
export function crownSvg(px) {
  return svg(px, px, '-12 -12 24 24', `<defs>
      <linearGradient id="g" x1="0" y1="-8" x2="0" y2="8" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fffbe0"/><stop offset=".4" stop-color="#ffd24a"/><stop offset="1" stop-color="#b0700a"/></linearGradient>
      <linearGradient id="f" x1="0" y1="-12" x2="0" y2="-5" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff3a0"/><stop offset=".5" stop-color="#ff8a1e"/><stop offset="1" stop-color="#e02a06"/></linearGradient>
      <radialGradient id="r" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffe0e4"/><stop offset=".4" stop-color="#ff2a3a"/><stop offset="1" stop-color="#6a0010"/></radialGradient>
      ${blurU('b', .9, -12, -12, 24, 24)}
    </defs>
    <path d="M0,-11.6 C1.6,-9.6 3,-8.6 2.6,-6.4 C2.4,-5 1.2,-4.4 0,-4.4 C-1.2,-4.4 -2.4,-5 -2.6,-6.4 C-2.8,-8 -1.6,-8.6 -1.2,-10 C-.8,-9 -.4,-8.6 0,-8.4 C-.4,-9.6 -.4,-10.6 0,-11.6 Z" fill="#ff6a1a" filter="url(#b)"/>
    <path d="M0,-11.6 C1.6,-9.6 3,-8.6 2.6,-6.4 C2.4,-5 1.2,-4.4 0,-4.4 C-1.2,-4.4 -2.4,-5 -2.6,-6.4 C-2.8,-8 -1.6,-8.6 -1.2,-10 C-.8,-9 -.4,-8.6 0,-8.4 C-.4,-9.6 -.4,-10.6 0,-11.6 Z" fill="url(#f)" stroke="#5a1000" stroke-width=".6"/>
    <path d="M-9.2,8.6 L-10.4,-3.4 L-5,1 L0,-6 L5,1 L10.4,-3.4 L9.2,8.6 Z" fill="url(#g)" stroke="#2a1400" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M-9.2,4 L9.2,4" stroke="#2a1400" stroke-width="1"/>
    <path d="M-8.4,5.2 L8.4,5.2 L8.2,7.8 L-8.2,7.8 Z" fill="#c8860e" opacity=".6"/>
    <circle cx="-10.4" cy="-4.2" r="1.7" fill="url(#g)" stroke="#2a1400" stroke-width=".9"/>
    <circle cx="10.4" cy="-4.2" r="1.7" fill="url(#g)" stroke="#2a1400" stroke-width=".9"/>
    <path d="M0,.6 L2.6,4 L0,7.4 L-2.6,4 Z" fill="url(#r)" stroke="#2a0004" stroke-width=".8" stroke-linejoin="round"/>
    <circle cx="-.7" cy="2.9" r=".6" fill="#fff"/>
    <circle cx="-5.6" cy="6" r=".9" fill="#ffffff" opacity=".9"/><circle cx="5.6" cy="6" r=".9" fill="#ffffff" opacity=".9"/>
    <path d="M-8.4,-.6 L-8.6,3" stroke="#fffbe6" stroke-width=".7" stroke-linecap="round" opacity=".9"/>`);
}

// ═════════════════════════ 「四象阵」地面法阵（180，俯视，四方位四职业色，中心透明） ═════════════════════════
export function formationSvg(px) {
  // 上=法师橙 右=骑士钢蓝 下=牧师绿 左=游侠紫
  const Q = [{ a: 0, c: '#ff8a2a', l: '#ffd2a0' }, { a: 90, c: '#5a9cff', l: '#cfe2ff' }, { a: 180, c: '#3ddc84', l: '#c8ffe0' }, { a: 270, c: '#b066ff', l: '#ecd8ff' }];
  const arc = (r, a0, a1) => `M${P(r, a0).join(',')} A${r},${r} 0 0 1 ${P(r, a1).join(',')}`;
  const sq = rot => `M${pts([0, 90, 180, 270].map(a => P(84, a + rot)))} Z`;
  const sigil = (q, i) => {
    const [x, y] = P(70, q.a);
    const icon = [
      `<path d="M0,-8 C2,-5 5.4,-3.4 5.4,1 C5.4,5 2.8,7.4 0,7.6 C-2.8,7.4 -5.4,5 -5.4,1 C-5.4,-2 -3.6,-3.6 -2.8,-5.6 C-2.2,-3.6 -1.4,-3 -.6,-2.6 C-1,-4.6 -.6,-6.4 0,-8 Z" fill="#fff6e0"/>`,
      `<path d="M-5.6,-6 Q0,-8 5.6,-6 L5.6,0 C5.6,4 2.8,6.6 0,8 C-2.8,6.6 -5.6,4 -5.6,0 Z" fill="#eef4ff"/><path d="M-.9,-4.6 h1.8 v3 h3 v1.8 h-3 v5 h-1.8 v-5 h-3 v-1.8 h3 Z" fill="${q.c}"/>`,
      `<path d="M-2.2,-7.6 h4.4 v5.4 h5.4 v4.4 h-5.4 v5.4 h-4.4 v-5.4 h-5.4 v-4.4 h5.4 Z" fill="#effff4"/>`,
      `<g transform="translate(0,.6) scale(.42)">${eagle('#f6ecff', q.c, 1.6, false)}</g>`,
    ][i];
    return `<g transform="translate(${x},${y})">
      <circle r="14" fill="${q.c}" opacity=".5" filter="url(#b)"/>
      <circle r="12" fill="url(#sg${i})" stroke="${q.l}" stroke-width="1.6"/>
      <circle r="9.2" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width=".6" stroke-dasharray="1.4 1.6"/>
      ${icon}</g>`;
  };
  return svg(px, px, '-100 -100 200 200', `<defs>
      <radialGradient id="bg" cx="0" cy="0" r="96" gradientUnits="userSpaceOnUse"><stop offset=".5" stop-color="#ffd86b" stop-opacity="0"/><stop offset=".86" stop-color="#ffd86b" stop-opacity=".12"/><stop offset="1" stop-color="#ffd86b" stop-opacity="0"/></radialGradient>
      ${Q.map((q, i) => `<radialGradient id="sg${i}" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="${q.l}" stop-opacity=".9"/><stop offset=".55" stop-color="${q.c}" stop-opacity=".75"/><stop offset="1" stop-color="#0b0a12" stop-opacity=".7"/></radialGradient>`).join('')}
      ${blurU('b', 3, -100, -100, 200, 200)}${blurU('b2', 1.4, -100, -100, 200, 200)}
    </defs>
    <g opacity=".88">
    <circle r="96" fill="url(#bg)"/>
    <g filter="url(#b)" opacity=".8">${Q.map(q => `<path d="${arc(89, q.a - 42, q.a + 42)}" fill="none" stroke="${q.c}" stroke-width="6"/>`).join('')}</g>
    ${Q.map(q => `<path d="${arc(89, q.a - 42, q.a + 42)}" fill="none" stroke="${q.l}" stroke-width="1.6"/>`).join('')}
    <circle r="93.6" fill="none" stroke="#ffe8a0" stroke-width="1" opacity=".7"/>
    <circle r="84" fill="none" stroke="#ffe8a0" stroke-width="1.2" opacity=".75"/>
    ${Q.map((q, i) => runeArc(89, q.a - 40, q.a + 40, 9, 2.1, 1, q.l, .8, i * 3)).join('')}    <g fill="none" stroke="#ffe08a" stroke-width="1" opacity=".5">
      <path d="${sq(0)}"/><path d="${sq(45)}"/>
    </g>
    <g filter="url(#b2)" opacity=".9">${Q.map((q, i) => { const n = Q[(i + 1) % 4]; return `<path d="M${P(70, q.a).join(',')} L${P(70, n.a).join(',')}" stroke="${q.l}" stroke-width="1.6" stroke-dasharray="6 4"/>`; }).join('')}</g>
    <circle r="57.6" fill="none" stroke="#ffe8a0" stroke-width=".8" opacity=".5"/>
    ${runeRing(52.6, 24, 1.5, .7, '#ffe8a0', .5, 7.5, 4)}
    <circle r="47.6" fill="none" stroke="#ffe8a0" stroke-width=".7" opacity=".35"/>
    ${Q.map(sigil).join('')}
    ${[45, 135, 225, 315].map(a => { const [x, y] = P(84, a); return twinkle(x, y, 4, '#fff6d0', .9); }).join('')}
    </g>`);
}
