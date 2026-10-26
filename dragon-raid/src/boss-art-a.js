// 屠龙战纪 · BOSS 美术（A 组）：赤焰龙王 + 龙焰图腾 / 冥骨巫龙 + 墓碑
// BOSS：viewBox -300 -130 600 290，原点 = BOSS 中心，要害核心在 (0,10)（渲染器叠半径 54 的发光），头朝下（+y）。
// 附属物：58 逻辑 px，viewBox -32 -32 64 64，朝上（-y）= 瞄准方向（渲染器按目标旋转）。
// 光从左上方来；所有部件一圈深色外轮廓。纯字符串拼接，不依赖 DOM。

const VB = 'viewBox="-300 -130 600 290"';
const PVB = 'viewBox="-32 -32 64 64"';
const NS = 'xmlns="http://www.w3.org/2000/svg"';
const f = n => Math.round(n * 10) / 10;
const pt = p => `${f(p[0])},${f(p[1])}`;
// 水平镜像一条只含绝对坐标（M/L/C/Q/Z）的路径
const mx = d => { let i = 0; return d.replace(/-?\d*\.?\d+/g, n => (i++ % 2 === 0 ? String(f(-parseFloat(n))) : n)); };
const both = (d, attrs) => `<g ${attrs}><path d="${d}"/><path d="${mx(d)}"/></g>`;
// 伪随机（固定种子，保证每次生成一致）
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// 两端粗细不同、略弯的肢体/骨头（圆头）
function limb(x0, y0, x1, y1, w0, w1, bend = 0) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const cx = (x0 + x1) / 2 + nx * bend, cy = (y0 + y1) / 2 + ny * bend, wm = (w0 + w1) / 4;
  const a = [x0 + nx * w0 / 2, y0 + ny * w0 / 2], b = [x1 + nx * w1 / 2, y1 + ny * w1 / 2];
  const c = [x1 - nx * w1 / 2, y1 - ny * w1 / 2], d = [x0 - nx * w0 / 2, y0 - ny * w0 / 2];
  const k1 = w1 * 0.66, k0 = w0 * 0.66;
  return `M${pt(a)} Q${f(cx + nx * wm)},${f(cy + ny * wm)} ${pt(b)} C${f(b[0] + ux * k1)},${f(b[1] + uy * k1)} ${f(c[0] + ux * k1)},${f(c[1] + uy * k1)} ${pt(c)} Q${f(cx - nx * wm)},${f(cy - ny * wm)} ${pt(d)} C${f(d[0] - ux * k0)},${f(d[1] - uy * k0)} ${f(a[0] - ux * k0)},${f(a[1] - uy * k0)} ${pt(a)} Z`;
}
// 弯钩爪：根部 (x,y)，朝 ang 方向长 len，向法线一侧弯 curl
function claw(x, y, ang, len, w, curl = 0.3) {
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  const t = [x + ux * len + nx * len * curl, y + uy * len + ny * len * curl];
  const m = [x + ux * len * 0.55 + nx * len * curl * 0.2, y + uy * len * 0.55 + ny * len * curl * 0.2];
  const b1 = [x + nx * w / 2, y + ny * w / 2], b2 = [x - nx * w / 2, y - ny * w / 2];
  return `M${pt(b1)} Q${f(m[0] + nx * w * 0.55)},${f(m[1] + ny * w * 0.55)} ${pt(t)} Q${f(m[0] - nx * w * 0.2)},${f(m[1] - ny * w * 0.2)} ${pt(b2)} Z`;
}
const deg = a => (a * Math.PI) / 180;
const polar = (cx, cy, r, a) => [cx + Math.cos(deg(a)) * r, cy + Math.sin(deg(a)) * r];
// 发光线：模糊宽线 + 亮细芯
const glowLine = (d, glow, core, w = 5, cw = 1.6, op = 0.7) => `<path d="${d}" stroke="${glow}" stroke-width="${w}" stroke-opacity="${op}" fill="none" filter="url(#bl)" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" stroke="${core}" stroke-width="${cw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
// 体积明暗（objectBoundingBox，左上亮、右下暗）
const VOL = `<radialGradient id="vol" cx=".36" cy=".3" r=".85"><stop offset="0" stop-color="#fff" stop-opacity=".26"/><stop offset=".32" stop-color="#fff" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
  <linearGradient id="lim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>`;
const BLURS = `<filter id="bl" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>
  <filter id="bl2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>
  <filter id="bl3" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>`;

// ═════════════════════════ 赤焰龙王 ═════════════════════════
export function fireDragonSvg(pxW, pxH) {
  const O = '#1a0306';
  // ── 右翼几何（左翼镜像） ──
  const S = [64, -24], E = [132, -62], W = [200, 40];
  const T = [[298, 10], [292, -78], [236, -124], [158, -128]];
  const wingR = 'M64,-24 Q140,-4 200,40 L298,10 Q266,-12 292,-78 Q246,-58 236,-124 Q198,-76 158,-128 Q112,-74 46,-88 Q58,-56 64,-24 Z';
  const wingL = mx(wingR);
  const bonesR = [
    limb(S[0] - 4, S[1] + 2, E[0], E[1], 17, 11, -4),
    limb(E[0], E[1], W[0], W[1], 12, 9, 8),
    limb(W[0], W[1], T[0][0], T[0][1], 8, 2.4, -3),
    limb(W[0], W[1], T[1][0], T[1][1], 6.5, 2, 5),
    limb(W[0], W[1], T[2][0], T[2][1], 6, 1.8, 5),
    limb(W[0], W[1], T[3][0], T[3][1], 5.5, 1.6, -3),
  ];
  const veinsR = ['M240,-2 Q258,-30 282,-40', 'M228,-24 Q240,-58 262,-84', 'M214,-36 Q216,-74 230,-100', 'M196,-36 Q188,-74 196,-108', 'M176,-30 Q164,-68 168,-104', 'M150,-28 Q128,-62 128,-100', 'M118,-36 Q96,-60 80,-74', 'M150,6 Q170,0 184,8'];
  const lavaWingR = [];
  const clawsR = [claw(298, 10, deg(-10), 12, 4.5, 0.4), claw(292, -78, deg(-40), 11, 4, 0.4), claw(236, -124, deg(-80), 9, 3.6, 0.4), claw(E[0], E[1], deg(-112), 24, 8, -0.25)];
  const thumbR = claw(218, 60, deg(55), 18, 7, 0.35);
  const wingSide = (sign) => {
    const m = d => (sign > 0 ? d : mx(d));
    const wg = sign > 0 ? 'url(#wmR)' : 'url(#wmL)';
    const wing = sign > 0 ? wingR : wingL;
    return `
    <path d="${wing}" fill="${wg}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>
    <path d="${wing}" fill="url(#vol)" opacity=".5"/>
    <g fill="none" stroke-linecap="round">${veinsR.map(d => `<path d="${m(d)}" stroke="#2a0204" stroke-opacity=".55" stroke-width="2.4"/><path d="${m(d)}" stroke="#ff9a5a" stroke-opacity=".28" stroke-width=".9" transform="translate(-1,-1)"/>`).join('')}</g>
    <path d="${m('M298,10 Q266,-12 292,-78 Q246,-58 236,-124 Q198,-76 158,-128 Q112,-74 46,-88')}" fill="none" stroke="#ff7a2a" stroke-opacity=".55" stroke-width="2" transform="translate(0,3)"/>
    ${lavaWingR.map(d => glowLine(m(d), '#ff5a00', '#ffc35a', 5, 1.4, 0.75)).join('')}
    <g stroke="${O}" stroke-width="2.6" stroke-linejoin="round">${clawsR.map(d => `<path d="${m(d)}" fill="url(#hornS)"/>`).join('')}</g>
    ${bonesR.map(d => `<path d="${m(d)}" fill="url(#bone)" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/><path d="${m(d)}" fill="url(#lim)"/>`).join('')}
    <circle cx="${E[0] * sign}" cy="${E[1]}" r="8" fill="url(#bone)" stroke="${O}" stroke-width="2.4"/>
    <circle cx="${(E[0] - 2) * sign}" cy="${E[1] - 2}" r="2.6" fill="#ff8a6a" opacity=".55"/>
    <path d="${m(thumbR)}" fill="url(#hornS)" stroke="${O}" stroke-width="2.6"/>
    ${dais(W[0] * sign, W[1])}`;
  };
  // 石座：玄武岩圆台 + 熔岩环 + 金色符文（附属物贴在上面）
  function dais(x, y) {
    const ticks = Array.from({ length: 12 }, (_, i) => { const a = i * 30 + 15; const p1 = polar(x, y, 25, a), p2 = polar(x, y, 29.5, a); return `M${pt(p1)} L${pt(p2)}`; }).join(' ');
    return `<g>
      <circle cx="${x}" cy="${y}" r="36" fill="#ff5a00" opacity=".38" filter="url(#bl2)"/>
      <circle cx="${x}" cy="${y}" r="31" fill="url(#basalt)" stroke="${O}" stroke-width="3"/>
      <circle cx="${x}" cy="${y}" r="31" fill="url(#vol)"/>
      <path d="${ticks}" stroke="#1a0a06" stroke-width="2.4"/>
      <circle cx="${x}" cy="${y}" r="27" fill="none" stroke="#ffbf4a" stroke-width="1.2" stroke-dasharray="5 4" opacity=".85"/>
      <circle cx="${x}" cy="${y}" r="23" fill="url(#pool)" stroke="#2a0a04" stroke-width="2"/>
      <circle cx="${x}" cy="${y}" r="23" fill="none" stroke="#ff7a1a" stroke-width="3" opacity=".7" filter="url(#bl)"/>
      <path d="M${x - 24},${y - 12} A27,27 0 0 1 ${x - 6},${y - 29}" stroke="#fff" stroke-opacity=".35" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>`;
  }
  // ── 躯干 / 尾 / 后腿 ──
  const torso = 'M0,-112 C24,-112 42,-98 50,-76 C58,-54 80,-40 84,-10 C88,22 72,48 44,62 C30,68 14,70 0,70 C-14,70 -30,68 -44,62 C-72,48 -88,22 -84,-10 C-80,-40 -58,-54 -50,-76 C-42,-98 -24,-112 0,-112 Z';
  const tail = 'M-18,-100 C-18,-114 -12,-124 -10,-142 L10,-142 C12,-124 18,-114 18,-100 Z';
  const hindR = limb(34, -78, 66, -110, 20, 11, 5);
  const hindClawsR = [claw(62, -114, deg(-120), 12, 5, 0.25), claw(68, -116, deg(-80), 12, 5, 0.2), claw(74, -110, deg(-35), 11, 5, -0.2)];
  // ── 前爪（抓着下方石座 (±92,88) 的上沿） ──
  const wristR = [114, 50];
  const armR = [limb(50, 0, 122, 22, 30, 21, 9), limb(122, 22, wristR[0], wristR[1], 21, 18, -4)];
  const fingerA = [-158, -122, -84, -44];
  const knucklesR = fingerA.map(a => polar(92, 88, 34, a));
  const fingersR = knucklesR.map(k => limb(wristR[0], wristR[1], k[0], k[1], 10, 7.5, 0));
  const talonsR = fingerA.map((a, i) => { const k = polar(92, 88, 34, a); const dir = a + 180 + (i < 2 ? -32 : 32); return claw(k[0] + Math.cos(deg(dir)) * 2, k[1] + Math.sin(deg(dir)) * 2, deg(dir), 13, 6.5, i < 2 ? -0.45 : 0.45); });
  // 有机熔岩裂纹：沿路标点细分并随机抖动
  const cr = rng(99);
  const crack = pts => { let d = `M${pt(pts[0])}`; for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i]; for (let k = 1; k <= 3; k++) { const t = k / 3; const j = k < 3 ? (cr() - 0.5) * 6 : 0; d += ` L${f(ax + (bx - ax) * t + j)},${f(ay + (by - ay) * t + j * 0.6)}`; } } return d; };
  // ── 颈 / 头 ──
  const neck = 'M-34,48 C-30,68 -26,86 -22,100 L22,100 C26,86 30,68 34,48 Z';
  const head = 'M0,84 C20,84 36,90 40,102 C43,114 32,122 26,130 C21,139 18,149 12,156 C8,160 -8,160 -12,156 C-18,149 -21,139 -26,130 C-32,122 -43,114 -40,102 C-36,90 -20,84 0,84 Z';
  const hornR = 'M30,98 C48,88 60,70 64,42 C56,62 36,78 12,90 Z';
  const horn2R = 'M37,106 C52,104 64,96 76,82 C68,98 54,110 40,114 Z';
  const frillR = 'M38,96 C46,92 52,86 58,72 C58,88 54,100 41,110 Z';
  const browR = 'M8,100 C18,96 30,100 36,110 C28,108 18,108 10,108 Z';
  // ── 鳞片纹理 + 脊刺 ──
  const spikes = [[-128, 7], [-116, 8], [-100, 10], [-86, 12], [-72, 12], [-58, 11], [58, 9], [70, 8], [82, 7]]
    .map(([y, w]) => `<path d="M${-w},${y + 10} L0,${y - 4} L${w},${y + 10} L0,${y + 5} Z" fill="url(#spk)" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>`).join('');
  const shoulderPlates = [[60, -20, 18, -20], [44, -34, 15, -30], [70, -2, 14, -6]]
    .map(([x, y, r, rot]) => { const d = `M${x - r},${y + r * 0.2} C${x - r},${y - r} ${x + r},${y - r} ${x + r},${y + r * 0.2} C${x + r * 0.5},${y + r * 0.7} ${x - r * 0.5},${y + r * 0.7} ${x - r},${y + r * 0.2} Z`; return `<g transform="rotate(${rot} ${x} ${y})"><path d="${d}" fill="url(#plateR)" stroke="${O}" stroke-width="2.2"/><path d="M${x - r * 0.7},${y - r * 0.15} C${x - r * 0.5},${y - r * 0.65} ${x + r * 0.2},${y - r * 0.75} ${x + r * 0.5},${y - r * 0.5}" stroke="#ffb08a" stroke-opacity=".55" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`; }).join('');
  // ── 熔岩裂纹（躯干） ──
  const crackSets = [
    [[-58, -12], [-66, -30], [-62, -48], [-70, -60]], [[-66, -30], [-78, -34]],
    [[-26, -54], [-30, -72], [-22, -88], [-26, -100]], [[-30, -72], [-40, -80]],
    [[30, -54], [36, -70], [30, -84]], [[36, -70], [46, -74]],
    [[62, -6], [72, -14], [80, -8]], [[-62, 34], [-72, 26], [-80, 30]],
    [[60, 36], [70, 30], [76, 16]], [[-18, 62], [-14, 72], [-20, 82]], [[16, 64], [20, 74], [14, 86]],
  ];
  const cracks = crackSets.map(p => { const d = crack(p); return `<path d="${d}" stroke="#2a0204" stroke-width="4.2" fill="none" stroke-linejoin="round" stroke-linecap="round"/>${glowLine(d, '#ff4a00', '#ffc35a', 5, 1.5, 0.85)}`; }).join('');
  // ── 心口熔岩宝石 (0,10) ──
  const cx = 0, cy = 10;
  const shards = Array.from({ length: 14 }, (_, i) => { const a = i * (360 / 14) - 90; const p1 = polar(cx, cy, 62, a - 9), p2 = polar(cx, cy, 62, a + 9), p3 = polar(cx, cy, 44, a); return `<path d="M${pt(p1)} L${pt(p3)} L${pt(p2)} Z" fill="url(#plateR)" stroke="${O}" stroke-width="2"/><path d="M${pt(p1)} L${pt(p3)}" stroke="#ffd27a" stroke-width="1.2" opacity=".75"/>`; }).join('');
  const gemPts = Array.from({ length: 8 }, (_, i) => polar(cx, cy, 34, i * 45 - 22.5));
  const facets = gemPts.map((p, i) => { const q = gemPts[(i + 1) % 8]; const a = polar(cx, cy, 17, i * 45 - 22.5), b = polar(cx, cy, 17, (i + 1) * 45 - 22.5); return `<path d="M${pt(p)} L${pt(q)} L${pt(b)} L${pt(a)} Z" fill="${['#ffe6a0', '#ffb84a', '#ff8a2a', '#e8551a', '#c23a10', '#e8551a', '#ff8a2a', '#ffc860'][i]}" opacity=".9"/>`; }).join('');
  const table = Array.from({ length: 8 }, (_, i) => polar(cx, cy, 17, i * 45 - 22.5)).map(pt).join(' ');
  const prongs = [45, 135, 225, 315].map(a => { const b = polar(cx, cy, 50, a), t = polar(cx, cy, 29, a); const n = deg(a + 90); const w = 6; return `<path d="M${f(b[0] + Math.cos(n) * w)},${f(b[1] + Math.sin(n) * w)} L${pt(t)} L${f(b[0] - Math.cos(n) * w)},${f(b[1] - Math.sin(n) * w)} Z" fill="url(#gold)" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>`; }).join('');
  // ── 火星 ──
  const r = rng(7);
  const embers = Array.from({ length: 22 }, () => { const x = (r() - 0.5) * 520, y = -110 + r() * 260; const s = 0.8 + r() * 1.8; return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="#ffd27a" opacity="${f(0.5 + r() * 0.5)}"/>`; }).join('');

  const sil = `<path d="${wingR}"/><path d="${wingL}"/><path d="${torso}"/><path d="${neck}"/><path d="${head}"/><path d="${tail}"/>`;
  return `<svg ${NS} width="${pxW}" height="${pxH}" ${VB}>
  <defs>
    ${VOL}${BLURS}
    <radialGradient id="wmR" cx="70" cy="-30" r="250" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3a0408" stop-opacity=".97"/><stop offset=".35" stop-color="#7e0f10" stop-opacity=".92"/><stop offset=".7" stop-color="#d23214" stop-opacity=".78"/><stop offset="1" stop-color="#ff8a3a" stop-opacity=".62"/></radialGradient>
    <radialGradient id="wmL" cx="-70" cy="-30" r="250" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#4a060a" stop-opacity=".97"/><stop offset=".35" stop-color="#9a1612" stop-opacity=".92"/><stop offset=".7" stop-color="#ea4418" stop-opacity=".78"/><stop offset="1" stop-color="#ffa050" stop-opacity=".64"/></radialGradient>
    <radialGradient id="body" cx="-34" cy="-56" r="170" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff7050"/><stop offset=".28" stop-color="#d0281c"/><stop offset=".62" stop-color="#7e0c10"/><stop offset="1" stop-color="#2a0306"/></radialGradient>
    <radialGradient id="headG" cx="-14" cy="96" r="70" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ff7a56"/><stop offset=".35" stop-color="#d22a1c"/><stop offset=".75" stop-color="#7a0c10"/><stop offset="1" stop-color="#2e0306"/></radialGradient>
    <linearGradient id="bone" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e2463a"/><stop offset=".5" stop-color="#8e1414"/><stop offset="1" stop-color="#3a0408"/></linearGradient>
    <linearGradient id="plateR" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#ff6a4a"/><stop offset=".45" stop-color="#b01c18"/><stop offset="1" stop-color="#3e050a"/></linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".35" stop-color="#ffcc48"/><stop offset=".75" stop-color="#c07400"/><stop offset="1" stop-color="#5a2a00"/></linearGradient>
    <linearGradient id="hornS" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff3d0"/><stop offset=".5" stop-color="#e8b060"/><stop offset="1" stop-color="#6a3408"/></linearGradient>
    <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset=".4" stop-color="#e0661e"/><stop offset="1" stop-color="#5a0a08"/></linearGradient>
    <radialGradient id="basalt" cx="-.2" cy="-.3" r="1.1"><stop offset="0" stop-color="#6a5650"/><stop offset=".5" stop-color="#2e2220"/><stop offset="1" stop-color="#0c0606"/></radialGradient>
    <radialGradient id="pool"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".35" stop-color="#ff9a2a"/><stop offset=".75" stop-color="#c22a06"/><stop offset="1" stop-color="#3a0804"/></radialGradient>
    <radialGradient id="sock" cx="0" cy="10" r="62" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff2b0"/><stop offset=".45" stop-color="#ff8a1a"/><stop offset=".72" stop-color="#a81e06"/><stop offset="1" stop-color="#2a0404"/></radialGradient>
    <radialGradient id="eyeG"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#ffe06a"/><stop offset="1" stop-color="#ff6a00"/></radialGradient>
    <linearGradient id="light" x1="-260" y1="-120" x2="260" y2="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".48" stop-color="#fff" stop-opacity="0"/><stop offset=".52" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
    <pattern id="sc" width="13" height="10" patternUnits="userSpaceOnUse">
      <path d="M0,10 Q6.5,0 13,10" fill="#000" fill-opacity=".1" stroke="#1a0204" stroke-opacity=".55" stroke-width="1.1"/>
      <path d="M1.6,8.6 Q6.5,1.6 11.4,8.6" fill="none" stroke="#ffa080" stroke-opacity=".22" stroke-width=".8"/>
      <path d="M-6.5,5 Q0,-5 6.5,5 M6.5,5 Q13,-5 19.5,5" fill="none" stroke="#1a0204" stroke-opacity=".4" stroke-width="1"/>
    </pattern>
    <clipPath id="cT"><path d="${torso}"/><path d="${neck}"/><path d="${tail}"/></clipPath>
    <clipPath id="cH"><path d="${head}"/></clipPath>
    <clipPath id="sil">${sil}</clipPath>
  </defs>
  <g filter="url(#bl3)" opacity=".7" fill="#ff3a0a">${sil}</g>
  <ellipse cx="0" cy="150" rx="46" ry="22" fill="#ff7a1a" opacity=".9" filter="url(#bl2)"/>
  ${wingSide(1)}${wingSide(-1)}
  <g stroke="${O}" stroke-width="2.4" stroke-linejoin="round">
    <path d="${hindR}" fill="url(#bone)"/><path d="${mx(hindR)}" fill="url(#bone)"/>
    ${hindClawsR.map(d => `<path d="${d}" fill="url(#hornS)"/><path d="${mx(d)}" fill="url(#hornS)"/>`).join('')}
  </g>
  <path d="${tail}" fill="url(#body)" stroke="${O}" stroke-width="3"/>
  ${armR.map(d => `<path d="${d}" fill="url(#plateR)" stroke="${O}" stroke-width="3" stroke-linejoin="round"/><path d="${d}" fill="url(#lim)"/><path d="${mx(d)}" fill="url(#plateR)" stroke="${O}" stroke-width="3" stroke-linejoin="round"/><path d="${mx(d)}" fill="url(#lim)"/>`).join('')}
  ${both('M74,6 C88,10 104,16 116,24 M78,14 C92,18 104,24 112,32', 'stroke="#2a0204" stroke-width="1.4" fill="none" opacity=".6"')}
  ${both('M64,-4 C80,-2 96,4 108,10', 'stroke="#ffa080" stroke-width="1.6" fill="none" opacity=".45" stroke-linecap="round"')}
  ${dais(92, 88)}${dais(-92, 88)}
  <g stroke="${O}" stroke-width="2.4" stroke-linejoin="round">
    ${fingersR.map(d => `<path d="${d}" fill="url(#plateR)"/><path d="${mx(d)}" fill="url(#plateR)"/>`).join('')}
  </g>
  <g stroke="${O}" stroke-width="2" stroke-linejoin="round">
    ${knucklesR.map(k => `<circle cx="${f(k[0])}" cy="${f(k[1])}" r="5.2" fill="url(#plateR)"/><circle cx="${f(-k[0])}" cy="${f(k[1])}" r="5.2" fill="url(#plateR)"/>`).join('')}
    ${talonsR.map(d => `<path d="${d}" fill="url(#hornS)"/><path d="${mx(d)}" fill="url(#hornS)"/>`).join('')}
  </g>
  ${both(`M${wristR[0] - 13},${wristR[1] - 6} C${wristR[0] - 4},${wristR[1] - 14} ${wristR[0] + 8},${wristR[1] - 12} ${wristR[0] + 12},${wristR[1] - 4}`, 'stroke="#ffa080" stroke-width="1.6" fill="none" opacity=".55" stroke-linecap="round"')}
  <path d="${torso}" fill="url(#body)" stroke="${O}" stroke-width="3.4"/>
  <g clip-path="url(#cT)"><rect x="-90" y="-140" width="180" height="250" fill="url(#sc)"/></g>
  <path d="${torso}" fill="url(#vol)" opacity=".7"/>
  ${shoulderPlates}<g transform="scale(-1,1)">${shoulderPlates}</g>
  <path d="${neck}" fill="url(#body)" stroke="${O}" stroke-width="3"/>
  <g clip-path="url(#cT)"><rect x="-40" y="44" width="80" height="60" fill="url(#sc)"/></g>
  <rect x="-300" y="-130" width="600" height="290" fill="url(#light)" clip-path="url(#sil)"/>
  ${cracks}
  ${spikes}
  <!-- 心口熔岩宝石 -->
  <circle cx="${cx}" cy="${cy}" r="66" fill="#ff6a00" opacity=".55" filter="url(#bl2)"/>
  <circle cx="${cx}" cy="${cy}" r="60" fill="url(#sock)" stroke="${O}" stroke-width="3"/>
  ${shards}
  <circle cx="${cx}" cy="${cy}" r="44" fill="none" stroke="#ffcf6a" stroke-width="2" opacity=".8"/>
  <polygon points="${gemPts.map(pt).join(' ')}" fill="#ff7a1a" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/>
  ${facets}
  <polygon points="${table}" fill="url(#pool)" stroke="#fff2c0" stroke-width="1" stroke-opacity=".7"/>
  <g stroke="#fff6d8" stroke-opacity=".55" stroke-width=".9">${gemPts.map((p, i) => `<path d="M${pt(p)} L${pt(polar(cx, cy, 17, i * 45 - 22.5))}"/>`).join('')}</g>
  <path d="M-22,-8 L-12,-17 L2,-20" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".75"/>
  ${prongs}
  <!-- 头 -->
  ${both(hornR, `fill="url(#gold)" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"`)}
  ${both('M28,92 C40,84 48,74 54,62 M24,90 C26,88 30,86 33,85 M34,86 C37,83 40,80 42,77 M42,78 C44,74 46,71 47,67', 'stroke="#fff7d8" stroke-opacity=".7" stroke-width="1.4" fill="none" stroke-linecap="round"')}
  ${both(horn2R, `fill="url(#gold)" stroke="${O}" stroke-width="2.2" stroke-linejoin="round"`)}
  ${both(frillR, `fill="url(#plateR)" stroke="${O}" stroke-width="2.2" stroke-linejoin="round"`)}
  <path d="${head}" fill="url(#headG)" stroke="${O}" stroke-width="3.2"/>
  <g clip-path="url(#cH)"><rect x="-44" y="80" width="88" height="80" fill="url(#sc)" opacity=".75"/></g>
  <path d="${head}" fill="url(#vol)" opacity=".6"/>
  ${both('M26,128 C21,139 17,149 11,156', 'stroke="#ff5a00" stroke-width="5" fill="none" filter="url(#bl)" opacity=".9"')}
  ${both('M26,129 C21,139 17,149 11,156', 'stroke="#ffd27a" stroke-width="1.5" fill="none"')}
  ${both('M25,132 L30,134 L24,137 Z M21,141 L26,144 L19,146 Z M17,149 L21,152 L14,153 Z', 'fill="#fff4e0" stroke="#2a0204" stroke-width=".6"')}
  <path d="M0,92 C-3,110 -3,128 0,148 C3,128 3,110 0,92 Z" fill="#ff8a6a" opacity=".35"/>
  ${both(browR, `fill="url(#plateR)" stroke="${O}" stroke-width="2" stroke-linejoin="round"`)}
  ${both('M12,100 L16,92 L20,99 Z M22,101 L28,94 L30,103 Z', `fill="url(#gold)" stroke="${O}" stroke-width="1.2"`)}
  ${both('M17,113 C20,108 28,108 32,114 C28,118 21,118 17,113 Z', 'fill="url(#eyeG)" stroke="#2a0204" stroke-width="1.4"')}
  ${both('M24.6,109.6 L25.4,117.4', 'stroke="#2a0204" stroke-width="1.8" stroke-linecap="round"')}
  ${both('M18,113 C22,110 30,111 33,115', 'stroke="#ffe06a" stroke-width="3" fill="none" opacity=".6" filter="url(#bl)"')}
  ${both('M7,146 C9,145 11,147 10,150 C8,151 6,149 7,146 Z', 'fill="#ffb03a" stroke="#2a0204" stroke-width="1"')}
  <circle cx="0" cy="141" r="3" fill="url(#gold)" stroke="${O}" stroke-width="1"/>
  ${embers}
</svg>`;
}

// 龙焰图腾：石雕龙首火盆，龙口朝上喷火（朝上 = 瞄准方向）
export function totemSvg(px, dead) {
  const O = '#140404';
  const oct = Array.from({ length: 8 }, (_, i) => polar(0, 0, 23, i * 45 + 22.5)).map(pt).join(' ');
  const defs = `<defs>
    <radialGradient id="st" cx="-8" cy="-10" r="34" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8a7266"/><stop offset=".5" stop-color="#46342e"/><stop offset="1" stop-color="#140c0a"/></radialGradient>
    <linearGradient id="hd" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#c8b0a0"/><stop offset=".45" stop-color="#7a6256"/><stop offset="1" stop-color="#2a1c18"/></linearGradient>
    <linearGradient id="fl" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3a00"/><stop offset=".5" stop-color="#ff9a1a"/><stop offset="1" stop-color="#ffe680" stop-opacity=".9"/></linearGradient>
    <radialGradient id="ey"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#ffd24a"/><stop offset="1" stop-color="#ff5a00"/></radialGradient>
    <filter id="b1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>
    <filter id="b2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>`;
  if (dead) {
    const r = rng(31);
    const rocks = [[-11, -6, 7, 20], [8, -9, 6, -30], [10, 9, 7.5, 50], [-8, 11, 6, -60], [1, 1, 5, 10], [-17, 4, 4, 80], [16, -1, 4, -15]]
      .map(([x, y, s, rot]) => { const pts = Array.from({ length: 5 }, (_, i) => { const a = i * 72 + r() * 30; const rr = s * (0.65 + r() * 0.45); return polar(x, y, rr, a); }); return `<g transform="rotate(${rot} ${x} ${y})"><polygon points="${pts.map(pt).join(' ')}" fill="url(#hd)" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/><path d="M${pt(pts[0])} L${f(x)},${f(y)}" stroke="#ff7a1a" stroke-width=".9" opacity=".6"/></g>`; }).join('');
    return `<svg ${NS} width="${px}" height="${px}" ${PVB}>${defs}
      <circle r="22" fill="#100606" opacity=".85"/>
      <polygon points="${oct}" fill="url(#st)" stroke="${O}" stroke-width="2" opacity=".55"/>
      <path d="M-14,-4 L-4,0 L-8,10 M4,-14 L2,-2 L12,4 M-2,2 L6,14" stroke="#ff5a00" stroke-width="2.2" fill="none" filter="url(#b1)" opacity=".8"/>
      <path d="M-14,-4 L-4,0 L-8,10 M4,-14 L2,-2 L12,4 M-2,2 L6,14" stroke="#ffb04a" stroke-width=".8" fill="none"/>
      ${rocks}
      ${[[-4, -14], [12, -14], [-18, -8], [4, 18], [-14, 16], [18, 12]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${1 + (i % 3) * 0.5}" fill="#ffc35a"/>`).join('')}
      <path d="M-4,-6 C-8,-14 -2,-18 -6,-26 M6,-4 C10,-12 4,-16 9,-24" stroke="#5a4a48" stroke-opacity=".5" stroke-width="2.4" fill="none" stroke-linecap="round" filter="url(#b1)"/>
    </svg>`;
  }
  // 龙首：吻部朝上张口（V 形口），口中喷火；金角向后掠
  const head = 'M0,-11 L-4.5,-19 C-7.5,-17.5 -9.5,-12.5 -10,-7 C-10.5,-3 -15.5,0 -16,6 C-16.5,12.5 -9,17.5 0,17.5 C9,17.5 16.5,12.5 16,6 C15.5,0 10.5,-3 10,-7 C9.5,-12.5 7.5,-17.5 4.5,-19 Z';
  const runes = Array.from({ length: 8 }, (_, i) => { const a = i * 45; const p = polar(0, 0, 20.5, a + 4), q = polar(0, 0, 20.5, a + 18); return `M${pt(p)} L${pt(q)}`; }).join(' ');
  const inner = Array.from({ length: 8 }, (_, i) => polar(0, 0, 17.5, i * 45 + 22.5)).map(pt).join(' ');
  return `<svg ${NS} width="${px}" height="${px}" ${PVB}>${defs}
    <defs>
      <linearGradient id="br" x1="0" y1="0" x2=".8" y2="1"><stop offset="0" stop-color="#ffd0a0"/><stop offset=".3" stop-color="#c8743e"/><stop offset=".7" stop-color="#6a2a14"/><stop offset="1" stop-color="#2a0c06"/></linearGradient>
      <linearGradient id="au" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".4" stop-color="#ffc63a"/><stop offset="1" stop-color="#7a3a00"/></linearGradient>
      <radialGradient id="lv"><stop offset="0" stop-color="#ffe9a0"/><stop offset=".45" stop-color="#ff8a1a"/><stop offset="1" stop-color="#7a1404"/></radialGradient>
    </defs>
    <circle r="27" fill="#ff4a00" opacity=".4" filter="url(#b2)"/>
    <polygon points="${oct}" fill="url(#st)" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>
    <polygon points="${oct}" fill="none" stroke="url(#au)" stroke-width="1.6" stroke-linejoin="round" transform="scale(.9)"/>
    <polygon points="${inner}" fill="url(#lv)" stroke="#2a0a04" stroke-width="1.4" stroke-linejoin="round"/>
    <path d="${runes}" stroke="#ff7a1a" stroke-width="2.6" filter="url(#b1)"/>
    <path d="${runes}" stroke="#ffe08a" stroke-width="1"/>
    <path d="M-18,-10 A21,21 0 0 1 -10,-18.5" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <!-- 后掠金角 -->
    <path d="M9,6 C15,10 19,16 21,24 C15,20 10,16 5,12 Z M-9,6 C-15,10 -19,16 -21,24 C-15,20 -10,16 -5,12 Z" fill="url(#au)" stroke="${O}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M13,-1 C18,0 21.5,3 24,8 C19.5,7 16,6 12.5,5 Z M-13,-1 C-18,0 -21.5,3 -24,8 C-19.5,7 -16,6 -12.5,5 Z" fill="url(#au)" stroke="${O}" stroke-width="1.3" stroke-linejoin="round"/>
    <!-- 龙首 -->
    <path d="${head}" fill="url(#br)" stroke="${O}" stroke-width="1.9" stroke-linejoin="round"/>
    <path d="M-12,5 Q0,10 12,5 M-10,-1 Q0,3 10,-1" stroke="#2a0c06" stroke-width="1" fill="none" opacity=".75"/>
    <path d="M-1.5,-6 L0,-9 L1.5,-6 L1.5,14 L0,16 L-1.5,14 Z" fill="url(#au)" stroke="${O}" stroke-width=".8"/>
    <path d="M-7,-14 C-8.5,-9 -10,-4 -13.5,0" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    <path d="M-6,4 L-3,7 L-6,10 M6,8 L3,11" stroke="#ff8a1a" stroke-width="1" fill="none" opacity=".9"/>
    <path d="M-10.5,-6 C-9,-9.5 -5,-9 -4,-5.5 C-6,-4 -9,-4 -10.5,-6 Z M10.5,-6 C9,-9.5 5,-9 4,-5.5 C6,-4 9,-4 10.5,-6 Z" fill="url(#ey)" stroke="${O}" stroke-width=".9"/>
    <path d="M-10.5,-6 C-9,-9.5 -5,-9 -4,-5.5 M10.5,-6 C9,-9.5 5,-9 4,-5.5" stroke="#ffd24a" stroke-width="2.2" fill="none" filter="url(#b1)"/>
    <path d="M-4.5,-19 L-3,-15 L-2.2,-17 Z M4.5,-19 L3,-15 L2.2,-17 Z" fill="#fff6e0"/>
    <!-- 龙口喷火 -->
    <path d="M0,-10 C-10,-14 -10,-24 -5,-31 C-4,-26 -2,-27 -1,-31.5 C1,-27 2,-26 3,-31 C9,-25 9,-15 0,-10 Z" fill="#ff5a00" filter="url(#b1)"/>
    <path d="M0,-11 C-7,-15 -7,-23 -4,-29 C-3,-25 -1,-26 0,-30 C1,-26 3,-25 4,-29 C7,-23 7,-15 0,-11 Z" fill="url(#fl)"/>
    <path d="M0,-12 C-3.4,-15 -3.4,-20 0,-25 C3.4,-20 3.4,-15 0,-12 Z" fill="#fff6d0"/>
  </svg>`;
}

// ═════════════════════════ 冥骨巫龙 ═════════════════════════
export function boneDragonSvg(pxW, pxH) {
  const O = '#0b0710';
  const r = rng(13);
  // ── 骨翼（右，左翼镜像） ──
  const S = [56, -30], E = [116, -74], W = [198, 2];
  const T = [[296, -6], [286, -90], [222, -126], [144, -124]];
  const B = [40, -96];
  // 破烂翼膜：在扇形边缘之间加入撕裂缺口
  function ragged(a, b, ctrl, n, depth) {
    let d = '';
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * ctrl[0] + t * t * b[0];
      const y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * ctrl[1] + t * t * b[1];
      if (i < n && r() < 0.55) {
        const tx = W[0] - x, ty = W[1] - y, L = Math.hypot(tx, ty);
        const k = depth * (0.3 + r() * 0.9);
        d += ` L${f(x + (tx / L) * k + (r() - 0.5) * 4)},${f(y + (ty / L) * k)}`;
      }
      d += ` L${f(x)},${f(y)}`;
    }
    return d;
  }
  const scal = (a, b, k = 0.3) => [(a[0] + b[0]) / 2 + (W[0] - (a[0] + b[0]) / 2) * k, (a[1] + b[1]) / 2 + (W[1] - (a[1] + b[1]) / 2) * k];
  const mem = `M${pt(S)} Q140,-14 ${pt(W)} L${pt(polar(W[0], W[1], 70, -4))}` +
    ragged(polar(W[0], W[1], 70, -4), T[1], [262, -30], 7, 16) +
    ragged(T[1], T[2], scal(T[1], T[2]), 6, 14) +
    ragged(T[2], T[3], scal(T[2], T[3]), 6, 16) +
    ragged(T[3], B, [104, -76], 7, 12) + ` Q48,-62 ${pt(S)} Z`;
  const holes = [[168, -66, 9], [236, -50, 7], [128, -52, 6], [208, -96, 6]].map(([x, y, s]) => {
    const pts = Array.from({ length: 7 }, (_, i) => polar(x, y, s * (0.55 + r() * 0.6), i * (360 / 7) + r() * 20));
    return `M${pts.map(pt).join(' L')} Z`;
  }).join(' ');
  const memR = `${mem} ${holes}`;
  const bonesR = [
    limb(S[0], S[1], E[0], E[1], 13, 9, -4),
    limb(E[0], E[1], W[0], W[1], 9, 8, 7),
    limb(W[0], W[1], T[0][0], T[0][1], 6, 2.4, -3),
    limb(W[0], W[1], T[1][0], T[1][1], 5.5, 2, 5),
    limb(W[0], W[1], T[2][0], T[2][1], 5, 1.8, 4),
    limb(W[0], W[1], T[3][0], T[3][1], 4.6, 1.6, -3),
  ];
  const knucks = [[0.5, 0], [0.5, 1], [0.55, 2], [0.5, 3]].map(([t, i]) => [W[0] + (T[i][0] - W[0]) * t, W[1] + (T[i][1] - W[1]) * t, 4.2 - i * 0.4]);
  const tipClaws = [claw(296, -6, deg(-5), 12, 4.4, 0.45), claw(286, -90, deg(-45), 11, 4, 0.45), claw(222, -126, deg(-85), 8, 3.4, 0.45), claw(E[0], E[1], deg(-115), 22, 7, -0.3)];
  const wingSide = sign => {
    const m = d => (sign > 0 ? d : mx(d));
    const mg = sign > 0 ? 'url(#memR)' : 'url(#memL)';
    return `
    <path d="${m(memR)}" fill="${mg}" fill-rule="evenodd" stroke="#3dff8a" stroke-opacity=".35" stroke-width="4" filter="url(#bl)"/>
    <path d="${m(memR)}" fill="${mg}" fill-rule="evenodd" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    ${['M150,-30 Q140,-62 150,-92', 'M212,-24 Q222,-58 244,-80', 'M232,-6 Q252,-28 272,-36', 'M184,-40 Q180,-80 190,-104', 'M104,-52 Q86,-70 66,-80'].map(d => `<path d="${m(d)}" stroke="#12081a" stroke-opacity=".6" stroke-width="2" fill="none"/>`).join('')}
    <g stroke="${O}" stroke-width="2.2" stroke-linejoin="round">${tipClaws.map(d => `<path d="${m(d)}" fill="url(#bnS)"/>`).join('')}</g>
    ${bonesR.map(d => `<path d="${m(d)}" fill="url(#bn)" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/><path d="${m(d)}" fill="url(#lim)"/>`).join('')}
    ${knucks.map(([x, y, s]) => `<circle cx="${f(x * sign)}" cy="${f(y)}" r="${f(s)}" fill="url(#bnS)" stroke="${O}" stroke-width="1.6"/>`).join('')}
    <circle cx="${E[0] * sign}" cy="${E[1]}" r="8.5" fill="url(#bnS)" stroke="${O}" stroke-width="2.4"/>
    <circle cx="${W[0] * sign}" cy="${W[1]}" r="9" fill="url(#bnS)" stroke="${O}" stroke-width="2.4"/>
    <circle cx="${(W[0] - 2.5) * sign}" cy="${W[1] - 2.5}" r="3" fill="#fff" opacity=".5"/>`;
  };
  // ── 斗篷碎布（从肩头向后飘成一条条破布） ──
  function strip(x0, y0, x1, y1, w0, w1, wave) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const P = (t, s) => { const w = (w0 + (w1 - w0) * t) / 2; const off = Math.sin(t * Math.PI * 1.4) * wave; return [x0 + dx * t + nx * (off + s * w), y0 + dy * t + ny * (off + s * w)]; };
    const L1 = [0, 0.33, 0.66, 1].map(t => P(t, 1)), R1 = [1, 0.66, 0.33, 0].map(t => P(t, -1));
    const e = P(1, 0), tear = [e[0] + ux * 7 + nx * w1 * 0.15, e[1] + uy * 7 + ny * w1 * 0.15], tear2 = [e[0] - ux * 3 - nx * w1 * 0.2, e[1] - uy * 3 - ny * w1 * 0.2];
    return `M${pt(L1[0])} C${pt(L1[1])} ${pt(L1[2])} ${pt(L1[3])} L${pt(tear)} L${pt(tear2)} L${pt(P(1, -0.55))} L${pt(R1[0])} C${pt(R1[1])} ${pt(R1[2])} ${pt(R1[3])} Z`;
  }
  const capeStrips = [[38, -40, 50, -136, 26, 18, 5], [56, -44, 88, -140, 28, 20, -6], [74, -44, 124, -126, 26, 17, 6], [92, -40, 150, -104, 22, 13, -5], [48, -42, 70, -118, 20, 14, -4]]
    .map(a => strip(...a));
  const capeFolds = ['M48,-48 C50,-74 54,-98 56,-122', 'M66,-50 C74,-80 82,-104 90,-128', 'M84,-48 C96,-74 108,-94 124,-114'];
  // ── 前肢骨（抓着墓碑底座 (±150,70)） ──
  const armR = [limb(50, 26, 104, 18, 12, 9, -5), limb(104, 18, 132, 54, 9, 8, 4)];
  const kn = [-172, -126, -80, -34].map(a => polar(150, 70, 35, a));
  const talR = [-172, -126, -80, -34].map((a, i) => claw(kn[i][0], kn[i][1], deg(a + 180 + (i < 2 ? -22 : 22)), 13, 5.5, i < 2 ? -0.4 : 0.4));
  const metaR = kn.map(k => limb(132, 54, k[0], k[1], 5, 4, 0));
  function plinth(x, y) {
    const runes = Array.from({ length: 10 }, (_, i) => { const a = i * 36; const p = polar(x, y, 25.5, a), q = polar(x, y, 25.5, a + 18); return `M${pt(p)} L${pt(q)}`; }).join(' ');
    return `<g>
      <circle cx="${x}" cy="${y}" r="38" fill="#3dff8a" opacity=".22" filter="url(#bl2)"/>
      <circle cx="${x}" cy="${y}" r="31" fill="url(#slate)" stroke="${O}" stroke-width="3"/>
      <circle cx="${x}" cy="${y}" r="31" fill="url(#vol)"/>
      <path d="M${x - 30},${y + 6} L${x - 20},${y + 4} L${x - 14},${y + 12} M${x + 12},${y - 28} L${x + 14},${y - 20} L${x + 22},${y - 18} M${x + 22},${y + 20} L${x + 16},${y + 14}" stroke="#05030a" stroke-width="1.6" fill="none"/>
      <circle cx="${x}" cy="${y}" r="22.5" fill="url(#grave)" stroke="#05030a" stroke-width="2"/>
      <path d="${runes}" stroke="#3dff8a" stroke-width="3" filter="url(#bl)"/>
      <path d="${runes}" stroke="#d8ffe0" stroke-width="1.1"/>
      <path d="M${x - 24},${y - 12} A27,27 0 0 1 ${x - 6},${y - 29}" stroke="#fff" stroke-opacity=".3" stroke-width="2" fill="none" stroke-linecap="round"/>
    </g>`;
  }
  // ── 骨盆 / 后腿 / 尾椎 ──
  const iliumR = 'M6,-108 C26,-118 46,-110 54,-94 C46,-88 30,-86 8,-90 Z';
  const hindR = [limb(46, -96, 78, -114, 10, 8, 4), limb(78, -114, 70, -140, 8, 6, -3)];
  // ── 脊椎 ──
  const vert = (y, s, op = 1) => `<g opacity="${op}">
    <path d="M${f(-s * 1.7)},${f(y + s * 0.15)} C${f(-s)},${f(y - s * 0.45)} ${f(s)},${f(y - s * 0.45)} ${f(s * 1.7)},${f(y + s * 0.15)} C${f(s)},${f(y + s * 0.5)} ${f(-s)},${f(y + s * 0.5)} ${f(-s * 1.7)},${f(y + s * 0.15)} Z" fill="url(#bn)" stroke="${O}" stroke-width="1.6"/>
    <rect x="${f(-s * 0.68)}" y="${f(y - s * 0.55)}" width="${f(s * 1.36)}" height="${f(s * 1.1)}" rx="${f(s * 0.35)}" fill="url(#bnS)" stroke="${O}" stroke-width="1.6"/>
    <path d="M${f(-s * 0.32)},${f(y)} L0,${f(y - s * 1.15)} L${f(s * 0.32)},${f(y)} Z" fill="#fff6e0" stroke="${O}" stroke-width="1.2" stroke-linejoin="round"/></g>`;
  let spine = '';
  for (let y = -136; y <= -104; y += 9) spine += vert(y, 5.2);
  for (let y = -94; y <= -58; y += 11) spine += vert(y, 7.5);
  for (let y = -46; y <= 46; y += 11.5) spine += vert(y, 6.4, 0.95);
  for (let y = 58; y <= 84; y += 10) spine += vert(y, 6.8);
  // ── 肋骨笼 ──
  const ribs = [0, 1, 2, 3, 4].map(i => {
    const y0 = -46 + i * 20, R = [60, 76, 86, 84, 70][i], D = [26, 30, 34, 34, 30][i];
    return `M7,${y0} C${f(R * 0.4)},${y0 - 16} ${f(R * 0.95)},${y0 - 12} ${R},${f(y0 + D * 0.45)} C${R + 1},${f(y0 + D * 0.85)} ${f(R * 0.9)},${y0 + D} ${f(R * 0.74)},${y0 + D + 6}`;
  });
  const ribStroke = d => `<path d="${d}" stroke="${O}" stroke-width="10" fill="none" stroke-linecap="round"/><path d="${d}" stroke="url(#ribG)" stroke-width="6.4" fill="none" stroke-linecap="round"/><path d="${d}" stroke="#5a4c38" stroke-opacity=".7" stroke-width="1.6" fill="none" stroke-linecap="round" transform="translate(1,2)"/><path d="${d}" stroke="#fffaf0" stroke-opacity=".6" stroke-width="1.4" fill="none" stroke-linecap="round" transform="translate(-.8,-1.6)"/>`;
  const scapR = 'M36,-50 C54,-64 76,-56 82,-38 C74,-24 54,-18 36,-26 C40,-34 40,-42 36,-50 Z';
  // ── 魂火舌（从肋骨缝里往外冒） ──
  const tongues = [-160, -135, -110, -70, -45, -20, 20, 160, 200, 225].map((a, i) => {
    const base = polar(0, 10, 58, a), tip = polar(0, 10, 90 + (i % 3) * 8, a + (i % 2 ? 8 : -8));
    const n = deg(a + 90), w = 9;
    return `M${f(base[0] + Math.cos(n) * w)},${f(base[1] + Math.sin(n) * w)} Q${f((base[0] + tip[0]) / 2 + Math.cos(n) * 5)},${f((base[1] + tip[1]) / 2 + Math.sin(n) * 5)} ${pt(tip)} Q${f((base[0] + tip[0]) / 2 - Math.cos(n) * 2)},${f((base[1] + tip[1]) / 2 - Math.sin(n) * 2)} ${f(base[0] - Math.cos(n) * w)},${f(base[1] - Math.sin(n) * w)} Z`;
  }).join(' ');
  // ── 颈部兜帽 ──
  const hood = 'M-42,62 C-26,72 26,72 42,62 C48,72 44,82 36,90 L30,84 L25,94 L18,86 L11,95 L4,88 L-3,96 L-9,88 L-16,95 L-22,86 L-28,93 L-32,84 L-38,89 C-46,82 -48,72 -42,62 Z';
  // ── 头骨 ──
  const skull = 'M0,82 C20,82 34,90 36,102 C38,112 30,118 26,124 C22,134 18,146 12,154 C8,158 -8,158 -12,154 C-18,146 -22,134 -26,124 C-30,118 -38,112 -36,102 C-34,90 -20,82 0,82 Z';
  const hornR = 'M26,92 C42,80 52,62 54,38 C46,56 34,72 14,86 Z';
  const hornBrokenL = 'M-26,92 C-36,84 -42,76 -46,66 L-40,64 L-42,58 L-36,62 C-32,72 -24,80 -14,86 Z';
  const jugalR = 'M30,104 C40,102 46,96 52,88 C50,100 44,110 34,116 Z';
  const teethR = 'M26,126 L31,128 L25,131 Z M23,134 L28,137 L21,139 Z M19,142 L24,145 L17,147 Z M15,150 L19,153 L12,154 Z';
  const wisps = Array.from({ length: 26 }, () => { const x = (r() - 0.5) * 540, y = -116 + r() * 270; const s = 0.8 + r() * 2; return `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" fill="#7dffb0" opacity="${f(0.4 + r() * 0.6)}"/>`; }).join('');
  const sil = `<path d="${mem}"/><path d="${mx(mem)}"/><path d="${skull}"/><ellipse cx="0" cy="10" rx="90" ry="70"/>`;
  return `<svg ${NS} width="${pxW}" height="${pxH}" ${VB}>
  <defs>
    ${VOL}${BLURS}
    <radialGradient id="memR" cx="60" cy="-36" r="250" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1c0c28" stop-opacity=".96"/><stop offset=".45" stop-color="#3a1a52" stop-opacity=".82"/><stop offset=".8" stop-color="#5a2e7a" stop-opacity=".6"/><stop offset="1" stop-color="#6a8a7a" stop-opacity=".45"/></radialGradient>
    <radialGradient id="memL" cx="-60" cy="-36" r="250" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#241032" stop-opacity=".96"/><stop offset=".45" stop-color="#46225e" stop-opacity=".82"/><stop offset=".8" stop-color="#6a3a8a" stop-opacity=".6"/><stop offset="1" stop-color="#7aa08a" stop-opacity=".45"/></radialGradient>
    <linearGradient id="bn" x1="0" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="#fffaea"/><stop offset=".4" stop-color="#d6c8a6"/><stop offset=".8" stop-color="#857558"/><stop offset="1" stop-color="#3a3024"/></linearGradient>
    <linearGradient id="bnS" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#e2d6b8"/><stop offset="1" stop-color="#6e6048"/></linearGradient>
    <linearGradient id="ribG" x1="0" y1="-50" x2="0" y2="70" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff6e0"/><stop offset=".6" stop-color="#d8caa8"/><stop offset="1" stop-color="#9a8a68"/></linearGradient>
    <radialGradient id="skullG" cx="-12" cy="92" r="72" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fffdf2"/><stop offset=".4" stop-color="#e0d4b4"/><stop offset=".8" stop-color="#8e7e60"/><stop offset="1" stop-color="#3a3024"/></radialGradient>
    <linearGradient id="cape" x1="0" y1="-140" x2="0" y2="-36" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2a1040" stop-opacity=".55"/><stop offset=".35" stop-color="#4a2068" stop-opacity=".9"/><stop offset=".8" stop-color="#6e3c96"/><stop offset="1" stop-color="#3a1a54"/></linearGradient>
    <linearGradient id="hoodG" x1="0" y1="0" x2=".5" y2="1"><stop offset="0" stop-color="#7a48a0"/><stop offset=".5" stop-color="#3e1c58"/><stop offset="1" stop-color="#160824"/></linearGradient>
    <linearGradient id="goldB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset=".5" stop-color="#c9a24a"/><stop offset="1" stop-color="#6a4a10"/></linearGradient>
    <radialGradient id="cav" cx="0" cy="10" r="90" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3dff8a" stop-opacity=".9"/><stop offset=".35" stop-color="#128a46"/><stop offset=".7" stop-color="#06301a"/><stop offset="1" stop-color="#030a06"/></radialGradient>
    <radialGradient id="soul" cx="0" cy="10" r="86" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#eaffef"/><stop offset=".3" stop-color="#7dffb0"/><stop offset=".6" stop-color="#1fb85a"/><stop offset=".85" stop-color="#0a4a26"/><stop offset="1" stop-color="#05140c" stop-opacity="0"/></radialGradient>
    <radialGradient id="orb" cx="-8" cy="0" r="34" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".35" stop-color="#b8ffd0"/><stop offset=".75" stop-color="#3dff8a"/><stop offset="1" stop-color="#0f7a3a"/></radialGradient>
    <radialGradient id="slate" cx="-.2" cy="-.3" r="1.1"><stop offset="0" stop-color="#6a6478"/><stop offset=".5" stop-color="#2e2a38"/><stop offset="1" stop-color="#0c0a12"/></radialGradient>
    <radialGradient id="grave"><stop offset="0" stop-color="#3dff8a" stop-opacity=".55"/><stop offset=".5" stop-color="#14402a"/><stop offset="1" stop-color="#0a0e10"/></radialGradient>
    <radialGradient id="sock"><stop offset="0" stop-color="#eaffef"/><stop offset=".45" stop-color="#3dff8a"/><stop offset="1" stop-color="#062a14"/></radialGradient>
    <linearGradient id="light" x1="-260" y1="-120" x2="260" y2="150" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".48" stop-color="#fff" stop-opacity="0"/><stop offset=".52" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
    <clipPath id="cS"><path d="${skull}"/></clipPath>
  </defs>
  <g filter="url(#bl3)" opacity=".55" fill="#2a8a5a">${sil}</g>
  <ellipse cx="0" cy="150" rx="40" ry="20" fill="#3dff8a" opacity=".55" filter="url(#bl2)"/>
  ${wingSide(1)}${wingSide(-1)}
  <!-- 斗篷 -->
  ${[1, -1].map(s => { const m = d => (s > 0 ? d : mx(d)); return `${capeStrips.map(d => `<path d="${m(d)}" fill="url(#cape)" stroke="${O}" stroke-width="2.2" stroke-linejoin="round"/>`).join('')}${capeFolds.map(d => `<path d="${m(d)}" stroke="#0e0418" stroke-width="2.6" fill="none" opacity=".55"/><path d="${m(d)}" stroke="#b080e0" stroke-opacity=".35" stroke-width="1" fill="none" transform="translate(-2,0)"/>`).join('')}<path d="${m('M32,-38 C52,-52 82,-52 101,-40')}" stroke="${O}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="${m('M32,-38 C52,-52 82,-52 101,-40')}" stroke="url(#goldB)" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="${m('M40,-44 L46,-46 M60,-49 L66,-49 M80,-48 L86,-47')}" stroke="#7dffb0" stroke-width="1.6"/>`; }).join('')}
  <!-- 骨盆、后腿 -->
  <g stroke="${O}" stroke-width="2.2" stroke-linejoin="round">
    ${hindR.map(d => `<path d="${d}" fill="url(#bn)"/><path d="${mx(d)}" fill="url(#bn)"/>`).join('')}
    <path d="${iliumR}" fill="url(#bn)"/><path d="${mx(iliumR)}" fill="url(#bn)"/>
  </g>
  ${both('M24,-104 C30,-106 36,-104 38,-98 C32,-96 26,-98 24,-104 Z', 'fill="#1a1222"')}
  <!-- 前肢 + 墓碑底座 -->
  <g stroke="${O}" stroke-width="2.4" stroke-linejoin="round">
    ${armR.map(d => `<path d="${d}" fill="url(#bn)"/><path d="${mx(d)}" fill="url(#bn)"/>`).join('')}
    ${metaR.map(d => `<path d="${d}" fill="url(#bn)"/><path d="${mx(d)}" fill="url(#bn)"/>`).join('')}
  </g>
  <circle cx="104" cy="18" r="6.5" fill="url(#bnS)" stroke="${O}" stroke-width="2"/><circle cx="-104" cy="18" r="6.5" fill="url(#bnS)" stroke="${O}" stroke-width="2"/>
  ${plinth(150, 70)}${plinth(-150, 70)}
  <g stroke="${O}" stroke-width="2" stroke-linejoin="round">
    ${kn.map(k => `<circle cx="${f(k[0])}" cy="${f(k[1])}" r="4.6" fill="url(#bnS)"/><circle cx="${f(-k[0])}" cy="${f(k[1])}" r="4.6" fill="url(#bnS)"/>`).join('')}
    ${talR.map(d => `<path d="${d}" fill="url(#bnS)"/><path d="${mx(d)}" fill="url(#bnS)"/>`).join('')}
  </g>
  <!-- 魂火 + 肋骨笼 -->
  <ellipse cx="0" cy="10" rx="104" ry="84" fill="url(#soul)" opacity=".7" filter="url(#bl3)"/>
  <path d="M0,-58 C40,-60 84,-40 90,0 C94,34 74,64 40,74 C24,78 -24,78 -40,74 C-74,64 -94,34 -90,0 C-84,-40 -40,-60 0,-58 Z" fill="url(#cav)" stroke="${O}" stroke-width="2"/>
  <path d="${tongues}" fill="#3dff8a" opacity=".5" filter="url(#bl2)"/>
  <path d="${tongues}" fill="#9dffc0" opacity=".3" filter="url(#bl)"/>
  ${[[-46, -22, 9], [50, -8, 8], [-58, 30, 7], [56, 44, 8], [-26, 56, 6], [30, -36, 6]].map(([x, y, s]) => `<path d="M${x},${y + s} C${x - s},${y + s * 0.4} ${x - s * 0.6},${y - s * 0.6} ${x},${y - s * 1.6} C${x + s * 0.6},${y - s * 0.6} ${x + s},${y + s * 0.4} ${x},${y + s} Z" fill="#7dffb0" opacity=".75" filter="url(#bl)"/><path d="M${x},${y + s * 0.6} C${x - s * 0.4},${y + s * 0.2} ${x - s * 0.3},${y - s * 0.4} ${x},${y - s} C${x + s * 0.3},${y - s * 0.4} ${x + s * 0.4},${y + s * 0.2} ${x},${y + s * 0.6} Z" fill="#eaffef" opacity=".85"/>`).join('')}
  <circle cx="0" cy="10" r="34" fill="url(#orb)" opacity=".95"/>
  <path d="M-20,4 C-14,-14 10,-18 20,-4 M18,20 C10,32 -12,32 -20,18" stroke="#eaffef" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>
  ${ribs.map(d => ribStroke(d) + ribStroke(mx(d))).join('')}
  ${both(scapR, `fill="url(#bn)" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"`)}
  ${both('M42,-46 C56,-56 72,-50 76,-38', 'stroke="#fff" stroke-opacity=".5" stroke-width="1.6" fill="none" stroke-linecap="round"')}
  ${spine}
  <!-- 兜帽 -->
  <path d="${hood}" fill="url(#hoodG)" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M-40,64 C-24,74 24,74 40,64" stroke="${O}" stroke-width="5.5" fill="none" stroke-linecap="round"/>
  <path d="M-40,64 C-24,74 24,74 40,64" stroke="url(#goldB)" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M-26,74 L-22,86 M-10,76 L-9,88 M10,76 L9,88 M26,74 L22,86" stroke="#0e0418" stroke-width="2.2" opacity=".7"/>
  <!-- 头骨 -->
  ${both('M17,104 C14,94 20,86 16,74 C24,82 26,92 22,104 Z', 'fill="#3dff8a" opacity=".7" filter="url(#bl)"')}
  <path d="${hornR}" fill="url(#bn)" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>
  <path d="M26,88 C38,78 46,66 50,50" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" fill="none"/>
  <path d="${hornBrokenL}" fill="url(#bn)" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>
  ${both(jugalR, `fill="url(#bn)" stroke="${O}" stroke-width="2" stroke-linejoin="round"`)}
  <path d="${skull}" fill="url(#skullG)" stroke="${O}" stroke-width="3"/>
  <path d="${skull}" fill="url(#vol)" opacity=".5"/>
  ${both(teethR, `fill="#fffaf0" stroke="${O}" stroke-width=".8"`)}
  ${both('M10,88 C16,86 22,88 26,94 C20,96 14,94 10,88 Z', 'fill="#120a14"')}
  ${both('M8,104 C10,98 20,96 26,102 C28,110 22,116 14,116 C8,114 6,110 8,104 Z', `fill="#06020a" stroke="${O}" stroke-width="1.6"`)}
  ${[17, -17].map(x => `<ellipse cx="${x}" cy="107" rx="7" ry="6" fill="#3dff8a" filter="url(#bl)"/><ellipse cx="${x}" cy="107" rx="4.2" ry="3.6" fill="#7dffb0"/><ellipse cx="${x - 0.6}" cy="106.4" rx="2" ry="1.7" fill="#f4fff6"/>`).join('')}
  ${both('M5,138 C8,136 10,139 9,144 C7,146 4,143 5,138 Z', 'fill="#06020a"')}
  <path d="M0,88 L0,100 M-4,120 C-2,124 2,124 4,120" stroke="#5a4c38" stroke-width="1.2" fill="none"/>
  ${both('M4,92 C10,94 12,98 12,102 M28,118 C24,122 22,126 22,130', 'stroke="#5a4c38" stroke-width="1" fill="none" opacity=".8"')}
  <path d="M-30,98 C-24,90 -14,86 -6,86" stroke="#fff" stroke-opacity=".6" stroke-width="2" fill="none" stroke-linecap="round"/>
  ${wisps}
  <rect x="-300" y="-130" width="600" height="290" fill="url(#light)" clip-path="url(#cS)"/>
</svg>`;
}

// 墓碑：带符文的墓碑，冒绿色鬼火；dead = 碎裂墓碑
export function tombSvg(px, dead) {
  const O = '#08060c';
  const defs = `<defs>
    <linearGradient id="fc" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="#b8b4c8"/><stop offset=".45" stop-color="#6a6680"/><stop offset="1" stop-color="#26232f"/></linearGradient>
    <linearGradient id="tp" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e0dcec"/><stop offset="1" stop-color="#8a869c"/></linearGradient>
    <radialGradient id="gd"><stop offset="0" stop-color="#2a5a3e"/><stop offset=".6" stop-color="#142018"/><stop offset="1" stop-color="#0a0a10"/></radialGradient>
    <linearGradient id="gf" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#0faa4a"/><stop offset=".5" stop-color="#3dff8a"/><stop offset="1" stop-color="#d8ffe0" stop-opacity=".85"/></linearGradient>
    <filter id="b1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.3"/></filter>
    <filter id="b2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>`;
  const ground = op => `<circle r="23" fill="url(#gd)" stroke="${O}" stroke-width="2" opacity="${op}"/>`;
  if (dead) {
    return `<svg ${NS} width="${px}" height="${px}" ${PVB}>${defs}
      ${ground(0.9)}
      <circle r="19" fill="none" stroke="#3dff8a" stroke-width="1" stroke-dasharray="3 5" opacity=".35"/>
      <path d="M-12,16 L-12,4 L-7,7 L-2,0 L3,5 L8,-1 L12,3 L12,16 Z" fill="url(#fc)" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M-12,4 L-7,7 L-2,0 L3,5 L8,-1 L12,3 L12,1 L8,-3 L3,3 L-2,-2 L-7,5 L-12,2 Z" fill="url(#tp)" stroke="${O}" stroke-width="1"/>
      <rect x="-16" y="14" width="32" height="6" rx="1.5" fill="#4a465a" stroke="${O}" stroke-width="1.6"/>
      <g transform="rotate(-62 -10 -12)"><path d="M-20,-4 L-20,-14 C-20,-22 0,-22 0,-14 L0,-4 L-4,-7 L-9,-3 L-14,-8 Z" fill="url(#fc)" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="M-10,-17 L-10,-9" stroke="#2a5a3e" stroke-width="1.6"/></g>
      <polygon points="12,-12 18,-14 20,-8 14,-6" fill="#5a5670" stroke="${O}" stroke-width="1.2"/>
      <polygon points="14,8 20,6 21,11" fill="#5a5670" stroke="${O}" stroke-width="1.2"/>
      <polygon points="-20,6 -15,4 -16,10" fill="#5a5670" stroke="${O}" stroke-width="1.2"/>
      <path d="M0,4 L-3,10 M6,8 L4,13" stroke="${O}" stroke-width="1"/>
      <path d="M2,-2 C-2,-8 4,-12 0,-18" stroke="#3dff8a" stroke-width="2" fill="none" opacity=".4" filter="url(#b1)"/>
      <circle cx="4" cy="-14" r="1.2" fill="#7dffb0" opacity=".7"/><circle cx="-4" cy="10" r="1" fill="#7dffb0" opacity=".6"/>
    </svg>`;
  }
  const tab = 'M-12,15 L-12,-8 C-12,-20 12,-20 12,-8 L12,15 Z';
  return `<svg ${NS} width="${px}" height="${px}" ${PVB}>${defs}
    <circle r="27" fill="#3dff8a" opacity=".3" filter="url(#b2)"/>
    ${ground(1)}
    <circle r="20" fill="none" stroke="#3dff8a" stroke-width="2.4" opacity=".55" filter="url(#b1)"/>
    <circle r="20" fill="none" stroke="#b8ffd0" stroke-width=".8" stroke-dasharray="4 3"/>
    <!-- 鬼火 -->
    <path d="M0,-12 C-9,-16 -9,-25 -4,-31 C-3,-26 -1,-27 0,-31 C2,-27 3,-26 5,-30 C9,-24 8,-16 0,-12 Z" fill="#3dff8a" filter="url(#b2)" opacity=".85"/>
    <path d="M0,-14 C-7,-17 -7,-24 -3,-29 C-2,-25 0,-26 1,-29 C3,-25 4,-25 5,-28 C7,-23 6,-17 0,-14 Z" fill="url(#gf)"/>
    <!-- 墓碑：顶面 + 正面 -->
    <path d="${tab}" fill="url(#tp)" stroke="${O}" stroke-width="2" transform="translate(0,-3.5)"/>
    <path d="${tab}" fill="url(#fc)" stroke="${O}" stroke-width="2"/>
    <path d="M-10,-8 C-10,-17 10,-17 10,-8" stroke="#fff" stroke-opacity=".35" stroke-width="1.2" fill="none"/>
    <rect x="-16" y="13" width="32" height="7" rx="1.5" fill="url(#fc)" stroke="${O}" stroke-width="1.8"/>
    <path d="M-15,14.5 L15,14.5" stroke="#d8d4e4" stroke-opacity=".5" stroke-width="1"/>
    <!-- 发光符文 -->
    <g stroke="#3dff8a" stroke-width="3" fill="none" filter="url(#b1)" stroke-linecap="round">
      <path d="M0,-12 L0,8 M0,-2 L-6,-9 M0,-2 L6,-9 M-4,8 L4,8"/>
    </g>
    <g stroke="#eaffef" stroke-width="1.4" fill="none" stroke-linecap="round">
      <path d="M0,-12 L0,8 M0,-2 L-6,-9 M0,-2 L6,-9 M-4,8 L4,8"/>
    </g>
    <path d="M-8,10 L-6,10 M-3,10 L-1,10 M2,10 L4,10 M6,10 L8,10" stroke="#7dffb0" stroke-width="1.2"/>
    <path d="M8,-6 L5,-1 L7,3" stroke="${O}" stroke-width=".9" fill="none"/>
    <path d="M-12,8 C-9,7 -8,10 -10,13 L-12,13 Z" fill="#2f6a3a" opacity=".85"/>
    <circle cx="-17" cy="-9" r="2.2" fill="#7dffb0" filter="url(#b1)"/><circle cx="-17" cy="-9" r="1" fill="#eaffef"/>
    <circle cx="17" cy="-4" r="1.8" fill="#7dffb0" filter="url(#b1)"/><circle cx="17" cy="-4" r=".9" fill="#eaffef"/>
  </svg>`;
}
