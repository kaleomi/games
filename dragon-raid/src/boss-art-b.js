// 屠龙战纪 · BOSS 美术（二）：冰霜巨龙 / 深渊魔王，以及它们的附属物（冰晶 / 魔眼）
// BOSS 画布和异形母舰相同：viewBox -300 -130 600 290，原点＝BOSS 中心，头朝下（+y，朝向英雄），
// 要害核心在 (0,10)（渲染器会叠一个半径 54 的发光），后半身往上可被上边缘裁掉。
// 附属物：58 逻辑 px，viewBox -32 -32 64 64，原点＝旋转中心，朝上（-y）＝瞄准方向；dead 版不旋转，中心会叠倒计时文字。
// 光从左上方来。纯字符串拼接，不依赖 DOM；随机细节用固定种子，输出稳定。

const VB = 'viewBox="-300 -130 600 290"';
const PVB = 'viewBox="-32 -32 64 64"';
const r1 = n => Math.round(n * 10) / 10;
const pt = (x, y) => `${r1(x)},${r1(y)}`;
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const qp = (a, c, b, t) => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
const BIG = 'filterUnits="userSpaceOnUse" x="-330" y="-160" width="660" height="350"';

function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Catmull-Rom 平滑曲线；点的第三个数是该点张力（0＝尖角）
function spline(pts, closed = true) {
  const n = pts.length;
  const P = i => closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  let d = `M${pt(pts[0][0], pts[0][1])}`;
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const k1 = p1[2] ?? 1, k2 = p2[2] ?? 1;
    d += ` C${pt(p1[0] + (p2[0] - p0[0]) / 6 * k1, p1[1] + (p2[1] - p0[1]) / 6 * k1)} ${pt(p2[0] - (p3[0] - p1[0]) / 6 * k2, p2[1] - (p3[1] - p1[1]) / 6 * k2)} ${pt(p2[0], p2[1])}`;
  }
  return closed ? d + 'Z' : d;
}
// 左半边点（中线顶点 → 中线底点）拼成左右对称的闭合轮廓
const symPts = half => [...half, ...half.slice(1, -1).reverse().map(([x, y, k]) => [-x, y, k])];
const side = s => ([x, y, k]) => (k === undefined ? [x * s, y] : [x * s, y, k]);

function sample(pts, per = 8) {
  const n = pts.length, P = i => pts[Math.max(0, Math.min(n - 1, i))], out = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let s = 0; s < per; s++) {
      const t = s / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(j => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push([pts[n - 1][0], pts[n - 1][1]]);
  return out;
}
// 沿曲线由粗到细的条带（犄角、骨、爪、触须）；返回 d 以及两侧边线、采样点
function taper(pts, w0, w1, per = 8, curve = 1) {
  const s = sample(pts, per), m = s.length, L = [], Rt = [], N = [];
  for (let i = 0; i < m; i++) {
    const a = s[Math.max(0, i - 1)], b = s[Math.min(m - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    const w = w0 + (w1 - w0) * Math.pow(i / (m - 1), curve);
    L.push([s[i][0] - dy * w, s[i][1] + dx * w]); Rt.push([s[i][0] + dy * w, s[i][1] - dx * w]); N.push([-dy, dx]);
  }
  const all = [...L, ...[...Rt].reverse()];
  return { d: 'M' + all.map(p => pt(p[0], p[1])).join(' L') + 'Z', L, R: Rt, s, N };
}
const poly = p => 'M' + p.map(q => pt(q[0], q[1])).join(' L');
// 四角闪光
const sparkle = (x, y, r, op = 1, col = '#ffffff') => `<path d="M${pt(x, y - r)} Q${pt(x + r * .16, y - r * .16)} ${pt(x + r, y)} Q${pt(x + r * .16, y + r * .16)} ${pt(x, y + r)} Q${pt(x - r * .16, y + r * .16)} ${pt(x - r, y)} Q${pt(x - r * .16, y - r * .16)} ${pt(x, y - r)}Z" fill="${col}" opacity="${op}"/>`;
// 锯齿裂纹（熔岩/冰裂），返回点列
function crackPts(R, x, y, ang, len, segs = 5, jit = 0.7) {
  const p = [[x, y]]; let a = ang;
  for (let i = 0; i < segs; i++) { a += (R() - 0.5) * jit * 2; const l = len / segs * (0.6 + R() * 0.8); x += Math.cos(a) * l; y += Math.sin(a) * l; p.push([x, y]); }
  return p;
}

// ═════════════════════════ 冰霜巨龙 ═════════════════════════
export function frostDragonSvg(pxW, pxH) {
  const R = rng(20261026);
  const O = '#04162a';

  // 冰晶尖刺：在 (x,y) 朝 ang（度，0＝朝上，顺时针）长出
  const crys = (x, y, ang, len, w, op = 1) => `<g transform="translate(${r1(x)},${r1(y)}) rotate(${r1(ang)})" opacity="${op}">
    <path d="M${-w},2 L${r1(-w * .78)},${r1(-len * .52)} L0,${-len} L0,2 Z" fill="url(#cL)"/>
    <path d="M${w},2 L${r1(w * .78)},${r1(-len * .52)} L0,${-len} L0,2 Z" fill="url(#cR)"/>
    <path d="M${-w},2 L${r1(-w * .78)},${r1(-len * .52)} L0,${-len} L${r1(w * .78)},${r1(-len * .52)} L${w},2" fill="none" stroke="${O}" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M${r1(-w * .5)},${r1(-len * .3)} L0,${r1(-len * .9)}" stroke="#fff" stroke-width="1.1" stroke-opacity=".85" stroke-linecap="round"/>
  </g>`;

  // ── 翅膀几何（s=-1 左翼，+1 右翼）
  const wingGeo = s => {
    const x = side(s);
    const S = x([70, -16]), E = x([150, 24]), W = x([222, 8]), B = x([58, -84]);
    const T = [[298, -2], [294, -80], [252, -134], [176, -146]].map(x);
    const inner = { a: T[3], c: x([124, -94]), b: B };
    const outs = [[3, 2], [2, 1], [1, 0]].map(([i, j]) => ({ a: T[i], c: lerp(lerp(T[i], T[j], .5), W, .24), b: T[j] }));
    return { x, S, E, W, B, T, inner, outs };
  };
  const membrane = s => {
    const g = wingGeo(s);
    const innerD = `M${pt(...g.S)} L${pt(...g.E)} L${pt(...g.W)} L${pt(...g.T[3])} Q${pt(...g.inner.c)} ${pt(...g.B)} Z`;
    const outD = g.outs.map(p => `M${pt(...g.W)} L${pt(...p.a)} Q${pt(...p.c)} ${pt(...p.b)} Z`);
    let o = `<path d="${innerD}" fill="url(#memA${s < 0 ? 'L' : 'R'})"/>`;
    outD.forEach((d, i) => { o += `<path d="${d}" fill="url(#mem${i % 2 ? 'A' : 'B'}${s < 0 ? 'L' : 'R'})"/>`; });
    o += `<g opacity=".55">${[innerD, ...outD].map(d => `<path d="${d}" fill="url(#frostTex)"/>`).join('')}</g>`;
    // 冰裂纹：从腕部往翼缘放射
    let fr = '';
    [g.inner, ...g.outs].forEach((p, pi) => {
      for (const u of [0.22, 0.5, 0.78]) {
        const e = qp(p.a, p.c, p.b, u), st = lerp(pi === 0 ? lerp(g.E, g.W, .5) : g.W, e, 0.18);
        const ang = Math.atan2(e[1] - st[1], e[0] - st[0]), len = Math.hypot(e[0] - st[0], e[1] - st[1]) * 0.78;
        const c = crackPts(R, st[0], st[1], ang, len, 5, 0.22);
        fr += `<path d="${poly(c)}"/>`;
        const k = c[2 + Math.floor(R() * 2)];
        fr += `<path d="${poly(crackPts(R, k[0], k[1], ang + (R() < .5 ? -.7 : .7), len * .25, 2, .3))}"/>`;
      }
    });
    o += `<g fill="none" stroke="#5ff0ff" stroke-width="3" opacity=".35" filter="url(#b2)">${fr}</g>`;
    o += `<g fill="none" stroke="#f2feff" stroke-width=".9" opacity=".7" stroke-linejoin="round">${fr}</g>`;
    // 翼缘：透光亮边 + 冰凌流苏
    const edges = [g.inner, ...g.outs].map(p => `M${pt(...p.a)} Q${pt(...p.c)} ${pt(...p.b)}`).join(' ');
    o += `<path d="${edges}" fill="none" stroke="#7ff4ff" stroke-width="7" opacity=".55" filter="url(#b3)"/>`;
    o += `<path d="${edges}" fill="none" stroke="#e8fdff" stroke-width="2"/>`;
    let ic = '';
    [g.inner, ...g.outs].forEach(p => {
      for (let u = 0.07; u < 0.95; u += 0.11) {
        const q = qp(p.a, p.c, p.b, u), q2 = qp(p.a, p.c, p.b, u + 0.03);
        const tx = q2[0] - q[0], ty = q2[1] - q[1], tl = Math.hypot(tx, ty) || 1;
        let nx = -ty / tl, ny = tx / tl; // 法线，取远离腕部的一侧
        if ((q[0] - g.W[0]) * nx + (q[1] - g.W[1]) * ny < 0) { nx = -nx; ny = -ny; }
        const L = 5 + R() * 10, hw = 2 + R() * 1.2;
        ic += `<path d="M${pt(q[0] - tx / tl * hw, q[1] - ty / tl * hw)} L${pt(q[0] + nx * L, q[1] + ny * L)} L${pt(q[0] + tx / tl * hw, q[1] + ty / tl * hw)}Z"/>`;
      }
    });
    o += `<g fill="#c8f6ff" fill-opacity=".8" stroke="#2a7aa8" stroke-width=".6">${ic}</g>`;
    return o;
  };
  const wingBones = s => {
    const g = wingGeo(s), x = g.x;
    let o = '';
    // 指骨
    g.T.forEach((t, i) => {
      const mid = lerp(g.W, t, .5); mid[0] += [0, 4, 6, 8][i] * s * -1; mid[1] += [-4, 2, 4, 6][i];
      const b = taper([g.W, mid, t], 6, 1.6, 8);
      o += `<path d="${b.d}" fill="url(#boneI)" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>`;
      o += `<path d="${poly(b.L.slice(1, -3))}" fill="none" stroke="#fff" stroke-width="1" stroke-opacity=".6"/>`;
      const k = lerp(g.W, t, .46);
      o += `<circle cx="${r1(k[0])}" cy="${r1(k[1])}" r="4.4" fill="url(#boneI)" stroke="${O}" stroke-width="1.3"/>`;
      const ang = Math.atan2(t[1] - g.W[1], t[0] - g.W[0]) * 180 / Math.PI + 90;
      o += crys(t[0], t[1], ang, 14, 4.2);
    });
    // 臂骨（前缘）
    const arm = taper([g.S, lerp(g.S, g.E, .5), g.E, lerp(g.E, g.W, .5), g.W], 11, 7, 8);
    o += `<path d="${arm.d}" fill="url(#boneA)" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>`;
    o += `<path d="${poly(arm.L.slice(2, -2))}" fill="none" stroke="#f4feff" stroke-width="1.6" stroke-opacity=".75"/>`;
    // 前缘冰刺（朝前外侧）
    [[.12, 13], [.24, 17], [.36, 12], [.62, 15], [.84, 11]].forEach(([u, L]) => {
      const i = Math.round(u * (arm.s.length - 1)), p = arm.s[i];
      const a = Math.atan2(arm.s[Math.min(i + 1, arm.s.length - 1)][1] - arm.s[Math.max(i - 1, 0)][1], arm.s[Math.min(i + 1, arm.s.length - 1)][0] - arm.s[Math.max(i - 1, 0)][0]);
      let nx = -Math.sin(a), ny = Math.cos(a); if (ny < 0) { nx = -nx; ny = -ny; }
      o += crys(p[0] + nx * 7, p[1] + ny * 7, Math.atan2(nx, -ny) * 180 / Math.PI, L, 4.4);
    });
    // 关节
    o += `<circle cx="${g.E[0]}" cy="${g.E[1]}" r="10" fill="url(#boneA)" stroke="${O}" stroke-width="2"/>`;
    o += `<circle cx="${g.W[0]}" cy="${g.W[1]}" r="9" fill="url(#boneA)" stroke="${O}" stroke-width="2"/>`;
    o += `<path d="M${pt(g.E[0] - 5, g.E[1] - 5)} A7,7 0 0 1 ${pt(g.E[0] + 3, g.E[1] - 7)}" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>`;
    // 拇爪
    const th = taper([g.W, x([238, 22]), x([244, 40])], 4.5, .4, 8);
    o += `<path d="${th.d}" fill="url(#claw)" stroke="${O}" stroke-width="1.3"/>`;
    o += crys(...x([206, -6]), s * -28, 14, 4.4) + crys(...x([232, -2]), s * 36, 12, 3.6);
    return o;
  };
  // ── 附属物挂点：冰壳底座（冰晶从这里长出）
  const mount = (cx, cy, r, ang0 = 0) => {
    let shards = '';
    for (let i = 0; i < 8; i++) { const a = ang0 + i * 45 + (R() - .5) * 12; shards += crys(cx + Math.sin(a * Math.PI / 180) * (r - 3), cy - Math.cos(a * Math.PI / 180) * (r - 3), a, 9 + R() * 6 + (i % 2) * 6, 4.6); }
    return `<circle cx="${cx}" cy="${cy}" r="${r + 10}" fill="#5ff0ff" opacity=".4" filter="url(#b4)"/>${shards}
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#mnt)" stroke="${O}" stroke-width="2.6"/>
      <circle cx="${cx}" cy="${cy}" r="${r - 5}" fill="none" stroke="#bff6ff" stroke-width="1.3" stroke-dasharray="5 4" opacity=".75"/>
      <path d="M${pt(cx - r * .7, cy - r * .35)} A${r * .78},${r * .78} 0 0 1 ${pt(cx - r * .1, cy - r * .78)}" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/>`;
  };

  // ── 躯干
  const torso = spline(symPts([[0, -152], [-40, -150], [-56, -124], [-62, -98], [-56, -72], [-68, -46], [-90, -18], [-98, 14], [-88, 42], [-64, 62], [-40, 74], [-28, 90], [0, 96]]));
  // ── 后腿（被半透明冰翼盖住，可以透出来）
  const hind = s => {
    const x = side(s);
    const thigh = spline([[50, -112], [78, -124], [100, -112], [110, -94], [100, -80], [76, -76], [56, -86]].map(x));
    const toes = [[[102, -112], [112, -126], [116, -140]], [[108, -104], [122, -112], [134, -120]], [[106, -94], [122, -94], [134, -88]]]
      .map(p => taper(p.map(x), 3.6, .4, 6).d);
    return `<path d="${thigh}" fill="url(#leg)" stroke="${O}" stroke-width="2.2"/>
      <path d="${spline([[60, -104], [80, -114], [96, -104]].map(x), false)}" fill="none" stroke="#e8fdff" stroke-width="1.4" opacity=".6"/>
      ${toes.map(d => `<path d="${d}" fill="url(#claw)" stroke="${O}" stroke-width="1.2"/>`).join('')}`;
  };
  // ── 前腿 + 爪
  const fore = s => {
    const x = side(s);
    const leg = spline([[62, 22], [92, 22], [118, 38], [134, 60], [134, 84], [126, 100], [108, 102], [102, 88], [104, 68], [92, 54], [68, 50]].map(x));
    const palm = spline([[100, 96], [118, 92], [134, 98], [138, 110], [124, 116], [104, 114]].map(x));
    const toes = [[[104, 110], [100, 122], [96, 134]], [[116, 114], [118, 128], [116, 142]], [[130, 110], [138, 122], [144, 132]], [[136, 98], [148, 100], [156, 96]]]
      .map(p => taper(p.map(x), 4.2, .4, 6).d);
    const bands = [[[96, 40], [112, 52], [120, 66]], [[108, 70], [120, 76], [128, 84]]].map(p => spline(p.map(x), false));
    return `<path d="${leg}" fill="url(#leg)" stroke="${O}" stroke-width="2.4"/>
      <clipPath id="lg${s < 0 ? 'L' : 'R'}"><path d="${leg}"/></clipPath><rect clip-path="url(#lg${s < 0 ? 'L' : 'R'})" x="-140" y="20" width="280" height="90" fill="url(#scale)" opacity=".6"/>
      ${bands.map(d => `<path d="${d}" fill="none" stroke="${O}" stroke-width="1.6" opacity=".6"/>`).join('')}
      <path d="${spline([[74, 30], [100, 32], [120, 50]].map(x), false)}" fill="none" stroke="#f0fcff" stroke-width="1.8" opacity=".55"/>
      ${crys(...x([120, 46]), s * 62, 14, 4.2)}${crys(...x([132, 70]), s * 78, 11, 3.6)}
      <path d="${palm}" fill="url(#leg)" stroke="${O}" stroke-width="2"/>
      ${toes.map(d => `<path d="${d}" fill="url(#claw)" stroke="${O}" stroke-width="1.3"/>`).join('')}`;
  };
  // ── 头部
  const head = spline(symPts([[0, 72], [-22, 74], [-36, 84], [-44, 100], [-42, 116], [-32, 132], [-21, 146], [-12, 156], [0, 160]]));
  const horn = s => {
    const x = side(s);
    const h1 = taper([[16, 92], [28, 74], [42, 54], [52, 34], [54, 20]].map(x), 7.5, .3, 8);
    const h2 = taper([[28, 96], [44, 88], [58, 74], [68, 64]].map(x), 5, .3, 8);
    return [h2, h1].map(h => `<path d="${h.d}" fill="url(#hornG)" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/><path d="${poly(h.L.slice(1, -2))}" fill="none" stroke="#fff" stroke-width="1.2" opacity=".8"/>`).join('');
  };
  const frill = s => {
    const x = side(s);
    return crys(...x([38, 92]), s * 56, 22, 5.4) + crys(...x([42, 108]), s * 80, 18, 4.6) + crys(...x([36, 124]), s * 102, 14, 4) + crys(...x([26, 140]), s * 118, 10, 3.2);
  };
  const teeth = s => { const x = side(s); let o = ''; for (let i = 0; i < 6; i++) { const y = 128 + i * 4.6, w = 20 - i * 1.5; o += `<path d="M${pt(...x([w - 1, y]))} L${pt(...x([w + 3.4, y + 2]))} L${pt(...x([w - 1.4, y + 3.6]))}Z" fill="#f4feff" stroke="${O}" stroke-width=".6"/>`; } return o; };

  // ── 背脊冰晶（核心与挂点之外的部分）
  const spine = [[-150, 26, 9], [-128, 30, 10], [-104, 22, 8]].map(([y, l, w]) => `<path d="M${-w - 4},${y + 8} L0,${y - 2} L${w + 4},${y + 8} L0,${y + 14}Z" fill="url(#plate)" stroke="${O}" stroke-width="1.2"/>` + crys(0, y + 4, 0, l, w)).join('');
  const shoulder = s => { const x = side(s); return crys(...x([62, -36]), s * 34, 26, 7) + crys(...x([76, -24]), s * 62, 20, 5.6) + crys(...x([50, -48]), s * 14, 18, 5) + crys(...x([84, -2]), s * 84, 14, 4.4); };

  // ── 心口寒冰心晶（核心）
  let crest = '';
  for (let i = 1; i < 12; i++) { const a = i * 30, big = i % 2 === 0; crest += crys(Math.sin(a * Math.PI / 180) * 44, 10 - Math.cos(a * Math.PI / 180) * 44, a, big ? 24 : 13, big ? 6.4 : 4.4); }
  const hexPts = (r, rot = 0) => Array.from({ length: 6 }, (_, i) => { const a = (i * 60 + rot) * Math.PI / 180; return [Math.sin(a) * r, 10 - Math.cos(a) * r]; });
  const hx = hexPts(30), hin = hexPts(13);
  const facetCols = ['#dffbff', '#8fe2f6', '#3a9cc8', '#1a5a86', '#2f86b4', '#a8eefc'];
  const gem = hx.map((p, i) => { const q = hx[(i + 1) % 6], a = hin[i], b = hin[(i + 1) % 6]; return `<path d="M${pt(...p)} L${pt(...q)} L${pt(...b)} L${pt(...a)}Z" fill="${facetCols[i]}" fill-opacity=".9"/>`; }).join('');

  // ── 雪花闪点
  let spk = '';
  for (const [x, y, r] of [[-262, -40, 6], [-206, -96, 4.6], [-150, -60, 3.6], [254, -30, 5.6], [214, -100, 4.4], [148, -76, 3.4], [-118, 120, 3.6], [128, 128, 4], [-40, -20, 3.4], [44, 50, 3], [0, 150, 5], [-286, 10, 3.6], [280, -110, 3.4]]) spk += sparkle(x, y, r, .9);
  let snow = '';
  for (let i = 0; i < 46; i++) { const x = (R() - .5) * 580, y = -125 + R() * 280; snow += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(.7 + R() * 1.5)}" fill="#e8fdff" opacity="${r1(.25 + R() * .55)}"/>`; }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}" ${VB}>
  <defs>
    <radialGradient id="body" cx="-46" cy="-50" r="190" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f4fdff"/><stop offset=".28" stop-color="#9fd8ef"/><stop offset=".62" stop-color="#3b80a8"/><stop offset="1" stop-color="#0e2c46"/></radialGradient>
    <radialGradient id="headG" cx="-14" cy="92" r="78" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#f6fdff"/><stop offset=".4" stop-color="#9ad4ec"/><stop offset=".8" stop-color="#3a7ca4"/><stop offset="1" stop-color="#123652"/></radialGradient>
    <radialGradient id="leg" cx=".3" cy=".25" r=".85"><stop offset="0" stop-color="#d8f4ff"/><stop offset=".45" stop-color="#6aaed0"/><stop offset="1" stop-color="#14405e"/></radialGradient>
    <linearGradient id="cL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#b4f0ff"/><stop offset="1" stop-color="#4aaed6"/></linearGradient>
    <linearGradient id="cR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c4f2ff"/><stop offset=".5" stop-color="#4aa6d0"/><stop offset="1" stop-color="#123e62"/></linearGradient>
    <linearGradient id="boneA" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#f6feff"/><stop offset=".5" stop-color="#9ed8ee"/><stop offset="1" stop-color="#2a6a92"/></linearGradient>
    <linearGradient id="boneI" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#eafbff"/><stop offset="1" stop-color="#4a92ba"/></linearGradient>
    <linearGradient id="claw" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#bfeaf8"/><stop offset="1" stop-color="#5a9ec0"/></linearGradient>
    <linearGradient id="hornG" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#2a6a92"/><stop offset=".45" stop-color="#9fe2f8"/><stop offset="1" stop-color="#ffffff"/></linearGradient>
    <linearGradient id="plate" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8f6ff"/><stop offset="1" stop-color="#2a6a92"/></linearGradient>
    <linearGradient id="memAL" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#bff6ff" stop-opacity=".78"/><stop offset=".45" stop-color="#58bce6" stop-opacity=".5"/><stop offset="1" stop-color="#e6fbff" stop-opacity=".7"/></linearGradient>
    <linearGradient id="memBL" x1="1" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#9ae8ff" stop-opacity=".7"/><stop offset=".5" stop-color="#3a96c8" stop-opacity=".45"/><stop offset="1" stop-color="#d0f6ff" stop-opacity=".66"/></linearGradient>
    <linearGradient id="memAR" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#9ae2fa" stop-opacity=".7"/><stop offset=".45" stop-color="#3a8cbc" stop-opacity=".5"/><stop offset="1" stop-color="#c8f2ff" stop-opacity=".66"/></linearGradient>
    <linearGradient id="memBR" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#7ad4f4" stop-opacity=".66"/><stop offset=".5" stop-color="#2a74a6" stop-opacity=".48"/><stop offset="1" stop-color="#b4ecff" stop-opacity=".6"/></linearGradient>
    <radialGradient id="mnt" cx=".4" cy=".38" r=".62"><stop offset="0" stop-color="#03101e"/><stop offset=".62" stop-color="#0c3454"/><stop offset=".86" stop-color="#5fd8f2"/><stop offset="1" stop-color="#174868"/></radialGradient>
    <radialGradient id="sock" cx="0" cy="10" r="50" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#0a2a44"/><stop offset=".64" stop-color="#0a2238"/><stop offset=".84" stop-color="#5ff0ff" stop-opacity=".75"/><stop offset="1" stop-color="#0c3050"/></radialGradient>
    <radialGradient id="vig" cx="0" cy="-20" r="150" gradientUnits="userSpaceOnUse"><stop offset=".55" stop-color="#021020" stop-opacity="0"/><stop offset="1" stop-color="#021020" stop-opacity=".6"/></radialGradient>
    <pattern id="scale" width="20" height="13" patternUnits="userSpaceOnUse" x="-10" y="-150">
      <path d="M0,0 Q10,13 20,0" fill="#05203a" fill-opacity=".14" stroke="#05203a" stroke-opacity=".5" stroke-width="1"/>
      <path d="M2.5,1.6 Q10,10 17.5,1.6" fill="none" stroke="#f4feff" stroke-opacity=".38" stroke-width=".9"/>
      <path d="M-10,6.5 Q0,19.5 10,6.5 M10,6.5 Q20,19.5 30,6.5" fill="none" stroke="#05203a" stroke-opacity=".38" stroke-width="1"/>
    </pattern>
    <pattern id="frostTex" width="34" height="30" patternUnits="userSpaceOnUse">
      <path d="M0,8 L9,3 L17,8 L26,3 L34,8 M9,3 L9,-4 M26,3 L26,-4 M17,8 L17,18 L9,23 L0,18 M17,18 L26,23 L34,18 M9,23 L9,30 M26,23 L26,30 M4,13 L8,11 M22,14 L27,12" fill="none" stroke="#e8fdff" stroke-width=".7" stroke-opacity=".5"/>
    </pattern>
    <clipPath id="tc"><path d="${torso}"/></clipPath>
    <clipPath id="hc"><path d="${head}"/></clipPath>
    <filter id="b2" ${BIG}><feGaussianBlur stdDeviation="2"/></filter>
    <filter id="b3" ${BIG}><feGaussianBlur stdDeviation="3.5"/></filter>
    <filter id="b4" ${BIG}><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="b9" ${BIG}><feGaussianBlur stdDeviation="12"/></filter>
  </defs>
  <g filter="url(#b9)">
    <ellipse cx="0" cy="-10" rx="250" ry="110" fill="#2aa8d8" opacity=".32"/>
    <ellipse cx="0" cy="10" rx="120" ry="120" fill="#5ff0ff" opacity=".28"/>
    <ellipse cx="0" cy="150" rx="60" ry="22" fill="#e8fdff" opacity=".4"/>
  </g>
  ${hind(-1)}${hind(1)}
  ${membrane(-1)}${membrane(1)}
  ${wingBones(-1)}${wingBones(1)}
  ${fore(-1)}${fore(1)}
  <path d="${torso}" fill="url(#body)" stroke="${O}" stroke-width="3"/>
  <g clip-path="url(#tc)">
    <rect x="-110" y="-152" width="220" height="250" fill="url(#scale)"/>
    <path d="${torso}" fill="url(#vig)"/>
    <path d="M-44,-150 C-56,-110 -52,-80 -64,-48 C-80,-20 -90,10 -78,44" fill="none" stroke="#f4feff" stroke-width="5" opacity=".35" filter="url(#b3)"/>
    <path d="M60,-120 C62,-90 64,-60 84,-24 C96,0 92,30 70,58" fill="none" stroke="#021020" stroke-width="10" opacity=".35" filter="url(#b4)"/>
    <path d="M-6,-150 L-6,90 M6,-150 L6,90" stroke="#021020" stroke-width="3" opacity=".25"/>
  </g>
  ${shoulder(-1)}${shoulder(1)}
  ${spine}
  ${mount(-180, 20, 25, 0)}${mount(180, 20, 25, 15)}${mount(0, -58, 25, 8)}
  <circle cx="0" cy="10" r="64" fill="#5ff0ff" opacity=".45" filter="url(#b4)"/>
  ${crest}
  <circle cx="0" cy="10" r="46" fill="url(#sock)" stroke="${O}" stroke-width="3"/>
  <circle cx="0" cy="10" r="46" fill="none" stroke="#e8fdff" stroke-width="1.4" opacity=".8"/>
  <g>${gem}<path d="${poly(hx)}Z" fill="none" stroke="#e8fdff" stroke-width="1.6"/><path d="${poly(hin)}Z" fill="#c8f6ff" fill-opacity=".55" stroke="#ffffff" stroke-width="1"/>
    ${hx.map((p, i) => `<path d="M${pt(...p)} L${pt(...hin[i])}" stroke="#e8fdff" stroke-width=".8" opacity=".8"/>`).join('')}</g>
  <path d="M-30,-6 A34,34 0 0 1 -6,-24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>
  ${horn(-1)}${horn(1)}
  <path d="${head}" fill="url(#headG)" stroke="${O}" stroke-width="2.6"/>
  <g clip-path="url(#hc)">
    <rect x="-46" y="72" width="92" height="90" fill="url(#scale)" opacity=".8"/>
    <path d="M24,84 C36,104 34,128 18,156" fill="none" stroke="#021020" stroke-width="10" opacity=".3" filter="url(#b3)"/>
  </g>
  ${frill(-1)}${frill(1)}${teeth(-1)}${teeth(1)}
  <path d="M0,78 L0,150" stroke="${O}" stroke-width="1.6" opacity=".55"/>
  <path d="M-3,80 L-3,98 M-3,120 L-3,146" stroke="#fff" stroke-width="1" opacity=".55"/>
  ${[-1, 1].map(s => `<path d="M${s * 6},104 L${s * 22},96 L${s * 42},86 L${s * 44},94 L${s * 26},106 L${s * 9},113Z" fill="url(#plate)" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>
    <path d="M${s * 8},106 L${s * 24},98 L${s * 40},90" fill="none" stroke="#fff" stroke-width="1" opacity=".7"/>
    <path d="M${s * 12},117 Q${s * 20},106 ${s * 36},104 Q${s * 26},116 ${s * 12},117Z" fill="#5ff0ff" filter="url(#b2)"/>
    <path d="M${s * 12},117 Q${s * 20},106 ${s * 36},104 Q${s * 26},116 ${s * 12},117Z" fill="#e8fdff" stroke="${O}" stroke-width="1.2"/>
    <path d="M${s * 22},108 L${s * 25},114" stroke="#06304a" stroke-width="2" stroke-linecap="round"/>
    <path d="M${s * 5},146 Q${s * 8},142 ${s * 11},147" fill="none" stroke="${O}" stroke-width="2.2"/>`).join('')}
  <g filter="url(#b4)" opacity=".75">
    <path d="M-16,150 C-30,156 -36,162 -50,160 M16,150 C30,156 36,162 50,160 M0,156 C-4,162 4,166 0,170" stroke="#f4feff" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path d="M-150,130 C-120,120 -100,128 -84,124 M150,132 C122,122 104,130 86,126 M-270,-20 C-250,-40 -240,-30 -230,-50 M270,-20 C250,-40 240,-30 230,-50 M-206,-110 C-186,-120 -170,-112 -150,-120 M206,-110 C186,-120 170,-112 150,-120" stroke="#e8fdff" stroke-width="7" fill="none" stroke-linecap="round" opacity=".55"/>
  </g>
  ${snow}${spk}
</svg>`;
}

// ═════════════════════════ 冰晶（冰霜巨龙的附属物）═════════════════════════
export function iceCrystalSvg(px, dead) {
  const O = '#04162a';
  const shard = (x, y, ang, len, w, gl = 'iL', gr = 'iR') => `<g transform="translate(${x},${y}) rotate(${ang})">
    <path d="M${-w},0 L${r1(-w * .9)},${r1(-len * .62)} L0,${-len} L0,${r1(len * .1)} Z" fill="url(#${gl})"/>
    <path d="M${w},0 L${r1(w * .9)},${r1(-len * .62)} L0,${-len} L0,${r1(len * .1)} Z" fill="url(#${gr})"/>
    <path d="M${-w},0 L${r1(-w * .9)},${r1(-len * .62)} L0,${-len} L${r1(w * .9)},${r1(-len * .62)} L${w},0 L0,${r1(len * .1)} Z" fill="none" stroke="${O}" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M${r1(-w * .55)},${r1(-len * .15)} L${r1(-w * .5)},${r1(-len * .58)} L0,${r1(-len * .92)}" fill="none" stroke="#fff" stroke-width=".9" stroke-opacity=".9" stroke-linecap="round"/>
  </g>`;
  const defs = `<defs>
    <linearGradient id="iL" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#bdf3ff" stop-opacity=".95"/><stop offset="1" stop-color="#3aa6d4" stop-opacity=".9"/></linearGradient>
    <linearGradient id="iR" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#c8f4ff"/><stop offset=".5" stop-color="#46a8d4" stop-opacity=".9"/><stop offset="1" stop-color="#0e3a5e" stop-opacity=".95"/></linearGradient>
    <linearGradient id="dL" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#9ab8c8"/><stop offset="1" stop-color="#2a4a62"/></linearGradient>
    <linearGradient id="dR" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#5a7a90"/><stop offset="1" stop-color="#132a3e"/></linearGradient>
    <radialGradient id="core" cx="0" cy="-4" r="16" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#9ff6ff" stop-opacity=".8"/><stop offset="1" stop-color="#5ff0ff" stop-opacity="0"/></radialGradient>
    <radialGradient id="base" cx="0" cy="0" r="22" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#e8fdff" stop-opacity=".55"/><stop offset=".5" stop-color="#5ff0ff" stop-opacity=".3"/><stop offset="1" stop-color="#5ff0ff" stop-opacity="0"/></radialGradient>
    <filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter>
    <filter id="g2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.2"/></filter>
  </defs>`;
  if (dead) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ${PVB}>${defs}
    <ellipse cx="0" cy="3" rx="22" ry="17" fill="#0a1a2a" opacity=".75"/>
    <path d="M-17,4 L-6,0 L2,6 L12,-2 L19,5 M-6,0 L-9,-11 M2,6 L4,16 M12,-2 L15,-12 M-6,0 L-14,-6" fill="none" stroke="#5fa8c8" stroke-width="1" stroke-opacity=".7"/>
    ${shard(-14, 10, -118, 13, 3.6, 'dL', 'dR')}${shard(15, 9, 104, 14, 4, 'dL', 'dR')}${shard(-5, 17, -168, 10, 3.2, 'dL', 'dR')}
    ${shard(9, -11, 32, 11, 3.4, 'dL', 'dR')}${shard(-12, -9, -40, 9, 3, 'dL', 'dR')}${shard(3, 18, 160, 8, 2.6, 'dL', 'dR')}
    ${[[-20, -2], [20, -6], [-2, -19], [14, 16], [-17, 15]].map(([x, y]) => `<path d="M${x},${y} l2,-2 l2,2 l-2,2z" fill="#8ab8d0" opacity=".7"/>`).join('')}
    <ellipse cx="0" cy="2" rx="13" ry="9" fill="#9fdcf0" opacity=".14" filter="url(#g)"/>
  </svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ${PVB}>${defs}
    <circle cx="0" cy="2" r="22" fill="url(#base)"/>
    <ellipse cx="0" cy="6" rx="19" ry="17" fill="none" stroke="#bff6ff" stroke-width="1.3" stroke-dasharray="3.4 3" opacity=".75"/>
    ${[0, 60, 120, 180, 240, 300].map(a => `<path transform="translate(0,6) rotate(${a})" d="M0,-21 l2.2,2.6 l-2.2,2.6 l-2.2,-2.6z" fill="#e8fdff" opacity=".85"/>`).join('')}
    <polygon points="0,-31 9,-14 7,16 0,20 -7,16 -9,-14" fill="#5ff0ff" opacity=".55" filter="url(#g)"/>
    ${shard(-9, 12, -34, 22, 5.2)}${shard(10, 12, 38, 19, 4.8)}${shard(-4, 15, -12, 14, 3.6)}${shard(5, 15, 16, 13, 3.4)}
    <g>
      <path d="M-9,-13 L0,-30 L0,19 L-7.5,15 Z" fill="url(#iL)"/>
      <path d="M9,-13 L0,-30 L0,19 L7.5,15 Z" fill="url(#iR)"/>
      <path d="M-3,-14 L0,-30 L3,-14 L2.4,16 L0,19 L-2.4,16 Z" fill="#e8fdff" fill-opacity=".45"/>
      <path d="M0,-30 L9,-13 L7.5,15 L0,19 L-7.5,15 L-9,-13 Z" fill="none" stroke="${O}" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M-9,-13 L0,-8 L9,-13 M0,-8 L0,19" fill="none" stroke="#04304a" stroke-width=".7" opacity=".6"/>
      <path d="M-7,-12 L-6,12 M-6.4,-14 L-1.4,-25" stroke="#fff" stroke-width="1.1" stroke-linecap="round" opacity=".95"/>
    </g>
    <ellipse cx="0" cy="-4" rx="6" ry="12" fill="url(#core)" filter="url(#g2)"/>
    ${[[0, -31, 4.6], [-15, -7, 2.6], [15, -4, 2.2], [-17, 14, 1.8], [17, 15, 1.8]].map(([x, y, r]) => `<path d="M${x},${y - r} Q${x + r * .18},${y - r * .18} ${x + r},${y} Q${x + r * .18},${y + r * .18} ${x},${y + r} Q${x - r * .18},${y + r * .18} ${x - r},${y} Q${x - r * .18},${y - r * .18} ${x},${y - r}Z" fill="#fff"/>`).join('')}
  </svg>`;
}

// ═════════════════════════ 深渊魔王 ═════════════════════════
export function demonLordSvg(pxW, pxH) {
  const R = rng(66613);
  const O = '#0a0204';
  const LAVA = ['#ff4a12', '#ff9a2a', '#ffe7a0'];

  // ── 蝠翼
  const wingGeo = s => {
    const x = side(s);
    const S = x([70, -84]), E = x([152, -124]), W = x([226, -104]), B = x([104, -24]);
    const T = [[290, -146], [300, -60], [290, 22], [246, 82]].map(x);
    const tips = [T[0], T[1], T[2], T[3]];
    const inner = { a: T[3], c: lerp(lerp(T[3], B, .5), W, .22), b: B };
    const outs = [[3, 2], [2, 1], [1, 0]].map(([i, j]) => ({ a: tips[i], c: lerp(lerp(tips[i], tips[j], .5), W, .26), b: tips[j] }));
    return { x, S, E, W, B, T, inner, outs };
  };
  const wing = s => {
    const g = wingGeo(s), x = g.x, id = s < 0 ? 'L' : 'R';
    const innerD = `M${pt(...g.S)} L${pt(...g.E)} L${pt(...g.W)} L${pt(...g.T[3])} Q${pt(...g.inner.c)} ${pt(...g.B)} Z`;
    const outD = g.outs.map(p => `M${pt(...g.W)} L${pt(...p.a)} Q${pt(...p.c)} ${pt(...p.b)} Z`);
    let o = `<g mask="url(#tear${id})">`;
    o += `<path d="${innerD}" fill="url(#memI${id})"/>`;
    outD.forEach((d, i) => { o += `<path d="${d}" fill="url(#mem${i % 2 ? 'I' : 'O'}${id})"/>`; });
    // 翼膜血管：从骨往翼缘分叉
    let vein = '';
    [g.inner, ...g.outs].forEach((p, pi) => {
      for (const u of [0.2, 0.5, 0.8]) {
        const e = qp(p.a, p.c, p.b, u);
        const st = pi === 0 ? lerp(lerp(g.E, g.W, .5), e, .12) : lerp(g.W, e, .2);
        const ang = Math.atan2(e[1] - st[1], e[0] - st[0]), len = Math.hypot(e[0] - st[0], e[1] - st[1]) * 0.86;
        const c = crackPts(R, st[0], st[1], ang, len, 6, 0.18);
        vein += `<path d="${spline(c, false)}"/>`;
        for (const k of [2, 4]) { const q = c[k]; vein += `<path d="${spline(crackPts(R, q[0], q[1], ang + (R() < .5 ? -.6 : .6), len * .2, 3, .3), false)}"/>`; }
      }
    });
    o += `<g fill="none" stroke="#ff2a3a" stroke-width="4" opacity=".55" filter="url(#b2)">${vein}</g>`;
    o += `<g fill="none" stroke="#ff6a5a" stroke-width="1.1" opacity=".9">${vein}</g>`;
    const edges = [g.inner, ...g.outs].map(p => `M${pt(...p.a)} Q${pt(...p.c)} ${pt(...p.b)}`).join(' ');
    o += `<path d="${edges}" fill="none" stroke="#ff3b4e" stroke-width="6" opacity=".5" filter="url(#b3)"/>`;
    o += `<path d="${edges}" fill="none" stroke="#c0283a" stroke-width="1.6"/>`;
    o += `</g>`;
    // 骨架
    g.T.forEach((t, i) => {
      const mid = lerp(g.W, t, .5); mid[0] += [-6, 2, 6, 8][i] * s; mid[1] += [-6, -4, 2, 6][i];
      const b = taper([g.W, mid, t], 6, 1.4, 8);
      o += `<path d="${b.d}" fill="url(#wbone)" stroke="${O}" stroke-width="1.6" stroke-linejoin="round"/>`;
      o += `<path d="${poly(b.L.slice(1, -3))}" fill="none" stroke="#c89a80" stroke-width=".9" stroke-opacity=".55"/>`;
      const k = lerp(g.W, t, .48);
      o += `<circle cx="${r1(k[0])}" cy="${r1(k[1])}" r="4" fill="url(#wbone)" stroke="${O}" stroke-width="1.2"/>`;
    });
    const arm = taper([g.S, lerp(g.S, g.E, .5), g.E, lerp(g.E, g.W, .5), g.W], 12, 7.5, 8);
    o += `<path d="${arm.d}" fill="url(#wbone)" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>`;
    o += `<path d="${poly(arm.L.slice(2, -2))}" fill="none" stroke="#e0b494" stroke-width="1.4" stroke-opacity=".55"/>`;
    o += `<circle cx="${g.E[0]}" cy="${g.E[1]}" r="10" fill="url(#wbone)" stroke="${O}" stroke-width="2"/>`;
    o += `<circle cx="${g.W[0]}" cy="${g.W[1]}" r="9" fill="url(#wbone)" stroke="${O}" stroke-width="2"/>`;
    // 腕爪 + 骨刺
    const th = taper([g.W, x([240, -126]), x([236, -142])], 5, .4, 8);
    o += `<path d="${th.d}" fill="url(#hornS)" stroke="${O}" stroke-width="1.3"/>`;
    const sp = taper([g.E, x([150, -138]), x([138, -150])], 5, .4, 6);
    o += `<path d="${sp.d}" fill="url(#hornS)" stroke="${O}" stroke-width="1.3"/>`;
    return o;
  };
  const tearMask = s => {
    const x = side(s);
    const holes = [[[272, 40], 7, 3, 30], [[288, -18], 5, 2.4, 70], [[262, -120], 6, 2.6, -30], [[214, 64], 5, 2, 10]];
    return `<mask id="tear${s < 0 ? 'L' : 'R'}" maskUnits="userSpaceOnUse" x="-310" y="-150" width="620" height="330"><rect x="-310" y="-150" width="620" height="330" fill="#fff"/>
      ${holes.map(([c, rx, ry, a]) => { const p = x(c); return `<path transform="translate(${p[0]},${p[1]}) rotate(${a * s})" d="M${-rx},0 L${-rx * .3},${-ry} L${rx * .2},${-ry * .4} L${rx},${-ry * .8} L${rx * .6},${ry * .6} L${-rx * .2},${ry} Z" fill="#000"/>`; }).join('')}
    </mask>`;
  };
  // ── 躯干（胸腹朝向英雄，腹部往上延伸被裁掉）
  const torso = spline(symPts([[0, -152], [-58, -150], [-72, -120], [-82, -92], [-100, -62], [-118, -38], [-124, -6], [-112, 26], [-88, 50], [-62, 68], [-44, 82], [0, 88]]));
  const pec = s => spline([[6, -46], [44, -54], [86, -44], [108, -18], [104, 16], [80, 40], [44, 50], [12, 40]].map(side(s)));
  const abBlock = (cx, cy, w, h) => spline([[cx - w / 2, cy - h / 2 + 3], [cx, cy - h / 2], [cx + w / 2, cy - h / 2 + 3], [cx + w / 2 + 1, cy + h / 2 - 4], [cx, cy + h / 2], [cx - w / 2 - 1, cy + h / 2 - 4]]);
  const abs = [[-90, 36, 22], [-120, 34, 24], [-148, 32, 22]].flatMap(([y, w, h]) => [[-(w / 2 + 3), y, w, h], [w / 2 + 3, y, w, h]]).map(([x, y, w, h]) => abBlock(x, y, w, h));
  const serr = s => [[-86, 74], [-66, 84], [-46, 92]].map(([y, x]) => spline([[x - 10, y - 8], [x + 8, y - 12], [x + 14, y - 4], [x - 4, y + 6]].map(side(s)))).join(' ');
  const delt = s => spline([[96, -40], [128, -50], [156, -36], [168, -8], [160, 22], [138, 36], [112, 28], [98, 4]].map(side(s)));
  const upperT = s => taper([[126, 4], [160, 22], [190, 42], [206, 58]].map(side(s)), 25, 19, 8);
  const foreT = s => taper([[208, 60], [196, 86], [170, 106], [140, 118]].map(side(s)), 20, 15, 8);
  const palm = s => spline([[108, 108], [128, 104], [144, 114], [144, 132], [128, 142], [108, 138], [100, 124]].map(side(s)));
  const skinParts = [-1, 1].flatMap(s => [upperT(s).d, foreT(s).d, palm(s), delt(s), pec(s)]).concat([torso], abs);
  const claws = s => {
    const x = side(s);
    return [[[138, 134], [146, 146], [146, 160]], [[126, 140], [128, 152], [124, 162]], [[112, 140], [110, 152], [104, 160]], [[100, 130], [92, 140], [84, 146]], [[146, 118], [158, 124], [166, 134]]]
      .map(p => { const t = taper(p.map(x), 4.8, .3, 8); return `<path d="${t.d}" fill="url(#clawG)" stroke="${O}" stroke-width="1.3"/><path d="${poly(t.L.slice(0, -3))}" fill="none" stroke="#fff" stroke-width=".7" opacity=".5"/>`; }).join('');
  };
  // 骨刺（黑曜石色）
  const spike = (pts, w, s = 1) => { const t = taper(pts.map(side(s)), w, .3, 6); return `<path d="${t.d}" fill="url(#hornS)" stroke="${O}" stroke-width="1.5" stroke-linejoin="round"/><path d="${poly(t.L.slice(1, -2))}" fill="none" stroke="#ffb08a" stroke-width=".9" opacity=".5"/>`; };
  const armSpikes = s => spike([[214, 50], [236, 36], [252, 30]], 7, s) + spike([[214, 66], [238, 70], [254, 76]], 6, s) + spike([[150, -40], [160, -62], [158, -82]], 7, s) + spike([[164, -22], [184, -36], [198, -40]], 6, s);
  const bracer = s => {
    const f = foreT(s), i0 = 7, i1 = 15;
    const band = [...f.L.slice(i0, i1 + 1), ...f.R.slice(i0, i1 + 1).reverse()];
    let st = '';
    for (const i of [8, 11, 14]) { const p = f.L[i], n = f.N[i]; st += spike([[p[0], p[1]], [p[0] + n[0] * 10, p[1] + n[1] * 10], [p[0] + n[0] * 18, p[1] + n[1] * 16]], 4.2); }
    return `<path d="${poly(band)}Z" fill="url(#iron)" stroke="${O}" stroke-width="1.8"/>
      <path d="${poly(f.L.slice(i0, i1 + 1).map((p, k) => lerp(p, f.R[i0 + k], .22)))}" fill="none" stroke="#c89a80" stroke-width="1" opacity=".55"/>
      <path d="${poly(f.L.slice(i0, i1 + 1).map((p, k) => lerp(p, f.R[i0 + k], .5)))}" fill="none" stroke="${LAVA[1]}" stroke-width="1.6" stroke-dasharray="3 5"/>${st}`;
  };

  // 熔岩缝：腹肌之间、胸肌下缘、白线
  const seams = ['M0,-152 L0,-60', 'M-40,-76 L-4,-74 M4,-74 L40,-76', 'M-36,-106 L-4,-104 M4,-104 L36,-106', 'M-34,-136 L-4,-134 M4,-134 L34,-136',
    'M-12,40 C-34,50 -60,50 -84,38', 'M12,40 C34,50 60,50 84,38', 'M-8,-46 C-30,-56 -60,-56 -90,-42', 'M8,-46 C30,-56 60,-56 90,-42'];
  let crack = '';
  const seeds = [[-60, -120, 2.0], [62, -116, 1.1], [-96, -70, 2.4], [96, -64, .7], [-150, -24, .4], [150, -20, 2.7], [-190, 40, 1.0], [190, 42, 2.1],
    [-176, 92, 2.6], [176, 94, .5], [-92, 10, 1.7], [92, 14, 1.4], [-60, 66, 2.6], [60, 66, .5], [-160, 116, 3.3], [160, 116, -.2], [-140, -36, 2.0], [140, -34, 1.1]];
  for (const [x0, y0, a] of seeds) {
    const c = crackPts(R, x0, y0, a, 26 + R() * 22, 5, .55);
    crack += `<path d="${poly(c)}"/>`;
    const k = c[2 + Math.floor(R() * 2)];
    crack += `<path d="${poly(crackPts(R, k[0], k[1], a + (R() < .5 ? -1 : 1) * (0.8 + R() * .5), 10 + R() * 10, 3, .5))}"/>`;
  }

  // 头部：恶魔头颅（额头、眉骨、獠牙大嘴朝英雄）
  const head = spline(symPts([[0, 66], [-28, 68], [-46, 78], [-56, 96], [-54, 114], [-46, 130], [-36, 146], [-22, 160], [0, 166]]));
  const horn = s => {
    const x = side(s), id = s < 0 ? 'L' : 'R';
    const h = taper([[26, 82], [60, 70], [98, 48], [128, 16], [142, -20], [138, -56], [122, -84]].map(x), 17, .5, 10, 1.05);
    let rings = '';
    for (let i = 5; i < h.s.length - 10; i += 4) { const m = lerp(h.L[i], h.R[i], .5), d = [h.s[i][0] - h.s[i - 2][0], h.s[i][1] - h.s[i - 2][1]]; rings += `<path d="M${pt(...h.L[i])} Q${pt(m[0] + d[0] * 1.3, m[1] + d[1] * 1.3)} ${pt(...h.R[i])}"/>`; }
    return `<path d="${h.d}" fill="#000" opacity=".45" transform="translate(${s * 4},6)" filter="url(#b2)"/>
      <path d="${h.d}" fill="url(#horn${id})" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/>
      <g fill="none" stroke="${O}" stroke-width="2" opacity=".65">${rings}</g>
      <g fill="none" stroke="#fff4e0" stroke-width="1" opacity=".35">${rings}</g>
      <path d="${poly((s < 0 ? h.L : h.R).slice(3, -6))}" fill="none" stroke="#fff0dc" stroke-width="2" opacity=".6"/>
      <path d="${poly((s < 0 ? h.R : h.L).slice(4, -12))}" fill="none" stroke="#ff5a2a" stroke-width="2.4" opacity=".6" filter="url(#b1)"/>`;
  };

  // 魔眼（核心）：胸口撕裂的血肉眼窝
  let rim = '';
  for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2, rr = i % 2 ? 1 : 1.13; rim += `${i ? 'L' : 'M'}${pt(Math.cos(a) * 58 * rr, 10 + Math.sin(a) * 48 * rr)} `; }
  rim += 'Z';
  let eyeVeins = '';
  for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + R() * .3; const c = crackPts(R, Math.cos(a) * 46, 10 + Math.sin(a) * 36, a + Math.PI, 16 + R() * 10, 4, .5); eyeVeins += `<path d="${poly(c)}"/>`; }
  let iris = '';
  for (let i = 0; i < 36; i++) iris += `<path transform="translate(0,10) rotate(${i * 10})" d="M0,-25 L0,${-14 - (i % 3) * 2}"/>`;
  let tendr = '';
  for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 + .2; const c = crackPts(R, Math.cos(a) * 60, 10 + Math.sin(a) * 50, a, 22 + R() * 14, 4, .35); tendr += `<path d="${spline(c, false)}"/>`; }

  let embers = '';
  for (let i = 0; i < 40; i++) { const x = (R() - .5) * 580, y = -125 + R() * 280, r = .8 + R() * 1.8; embers += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${R() < .5 ? '#ffb04a' : '#ff5a2a'}" opacity="${r1(.35 + R() * .6)}"/>`; }

  // 肉柄根部（魔眼从这里长出）
  const root = (cx, cy, r) => {
    let lumps = '', tend = '';
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + R() * .4; const d = r * (.78 + R() * .2); lumps += `<circle cx="${r1(cx + Math.cos(a) * d)}" cy="${r1(cy + Math.sin(a) * d)}" r="${r1(r * (.26 + R() * .14))}" fill="url(#flesh)" stroke="${O}" stroke-width="1.4"/>`; }
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + .3; const c = crackPts(R, cx + Math.cos(a) * r, cy + Math.sin(a) * r, a, 18 + R() * 10, 3, .4); tend += `<path d="${spline(c, false)}"/>`; }
    return `<g fill="none" stroke="#ff2a3a" stroke-width="5" opacity=".5" filter="url(#b2)">${tend}</g><g fill="none" stroke="#5a0a18" stroke-width="2.6" stroke-linecap="round">${tend}</g><g fill="none" stroke="#ff5a5a" stroke-width=".9">${tend}</g>
      ${lumps}<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#flesh)" stroke="${O}" stroke-width="2.4"/>
      <circle cx="${cx}" cy="${cy}" r="${r * .62}" fill="url(#hole)" stroke="#3a0612" stroke-width="2"/>
      <path d="M${pt(cx - r * .7, cy - r * .2)} A${r * .75},${r * .75} 0 0 1 ${pt(cx - r * .15, cy - r * .74)}" fill="none" stroke="#ffb0b8" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>`;
  };
  const shade = (d, id) => `<path d="${d}" fill="url(#${id})" stroke="${O}" stroke-width="2.4"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}" ${VB}>
  <defs>
    <radialGradient id="skin" cx="-50" cy="-70" r="240" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a8483a"/><stop offset=".3" stop-color="#6a1c1c"/><stop offset=".65" stop-color="#360a0e"/><stop offset="1" stop-color="#140306"/></radialGradient>
    <radialGradient id="dl" cx=".3" cy=".25" r=".85"><stop offset="0" stop-color="#d47a5a"/><stop offset=".4" stop-color="#7a2620"/><stop offset="1" stop-color="#1e0508"/></radialGradient>
    <radialGradient id="dr" cx=".3" cy=".25" r=".85"><stop offset="0" stop-color="#a24a38"/><stop offset=".4" stop-color="#5a1818"/><stop offset="1" stop-color="#140306"/></radialGradient>
    <radialGradient id="mus" cx=".32" cy=".26" r=".8"><stop offset="0" stop-color="#c8664c"/><stop offset=".5" stop-color="#6e2020"/><stop offset="1" stop-color="#2a070a"/></radialGradient>
    <radialGradient id="musR" cx=".32" cy=".26" r=".8"><stop offset="0" stop-color="#a04634"/><stop offset=".5" stop-color="#561618"/><stop offset="1" stop-color="#1e0408"/></radialGradient>
    <radialGradient id="headG" cx="-18" cy="92" r="84" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#d0704e"/><stop offset=".4" stop-color="#7a2420"/><stop offset=".8" stop-color="#2e080a"/><stop offset="1" stop-color="#160406"/></radialGradient>
    <radialGradient id="memIL" cx="-226" cy="-104" r="170" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1e0408"/><stop offset=".6" stop-color="#3e0a12"/><stop offset="1" stop-color="#7a1626"/></radialGradient>
    <radialGradient id="memOL" cx="-226" cy="-104" r="170" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2a060c"/><stop offset=".6" stop-color="#4e0e18"/><stop offset="1" stop-color="#8e1e2e"/></radialGradient>
    <radialGradient id="memIR" cx="226" cy="-104" r="170" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#16030a"/><stop offset=".6" stop-color="#32080e"/><stop offset="1" stop-color="#661220"/></radialGradient>
    <radialGradient id="memOR" cx="226" cy="-104" r="170" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1e0408"/><stop offset=".6" stop-color="#3e0a12"/><stop offset="1" stop-color="#781828"/></radialGradient>
    <linearGradient id="wbone" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#8a5a48"/><stop offset=".5" stop-color="#4a2420"/><stop offset="1" stop-color="#1a0606"/></linearGradient>
    <linearGradient id="hornS" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a5a4c"/><stop offset=".5" stop-color="#2a1210"/><stop offset="1" stop-color="#0a0202"/></linearGradient>
    <linearGradient id="iron" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6a5a58"/><stop offset=".5" stop-color="#2a2224"/><stop offset="1" stop-color="#0a0808"/></linearGradient>
    <linearGradient id="hornL" x1="-26" y1="82" x2="-122" y2="-84" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1e0808"/><stop offset=".3" stop-color="#5a3428"/><stop offset=".65" stop-color="#b08c74"/><stop offset="1" stop-color="#fff0dc"/></linearGradient>
    <linearGradient id="hornR" x1="26" y1="82" x2="122" y2="-84" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#160404"/><stop offset=".3" stop-color="#40221c"/><stop offset=".65" stop-color="#8a6a58"/><stop offset="1" stop-color="#e8d4bc"/></linearGradient>
    <linearGradient id="clawG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0606"/><stop offset=".6" stop-color="#5a3a30"/><stop offset="1" stop-color="#f0dcc4"/></linearGradient>
    <radialGradient id="flesh" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#d0606a"/><stop offset=".5" stop-color="#7a1a2c"/><stop offset="1" stop-color="#2a0410"/></radialGradient>
    <radialGradient id="hole" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff5a3a"/><stop offset=".45" stop-color="#7a0a14"/><stop offset="1" stop-color="#14020a"/></radialGradient>
    <radialGradient id="maw" cx="0" cy="10" r="64" gradientUnits="userSpaceOnUse"><stop offset=".5" stop-color="#14020a"/><stop offset=".72" stop-color="#6a0a18"/><stop offset=".86" stop-color="#ff4a1a"/><stop offset="1" stop-color="#ffb04a"/></radialGradient>
    <radialGradient id="sclera" cx="-14" cy="-6" r="56" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff2c8"/><stop offset=".45" stop-color="#f0b860"/><stop offset=".8" stop-color="#b0441c"/><stop offset="1" stop-color="#4a0a0a"/></radialGradient>
    <radialGradient id="iris" cx="0" cy="10" r="27" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2a0004"/><stop offset=".42" stop-color="#8a0012"/><stop offset=".78" stop-color="#ff3b4e"/><stop offset=".93" stop-color="#ffb070"/><stop offset="1" stop-color="#3a0008"/></radialGradient>
    <radialGradient id="lid" cx="-10" cy="-20" r="80" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#b0504a"/><stop offset=".5" stop-color="#5a1418"/><stop offset="1" stop-color="#1a040a"/></radialGradient>
    <radialGradient id="mouth" cx="0" cy="146" r="24" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffe7a0"/><stop offset=".35" stop-color="#ff7a1a"/><stop offset=".8" stop-color="#7a0a0a"/><stop offset="1" stop-color="#1a0204"/></radialGradient>
    ${tearMask(-1)}${tearMask(1)}
    <clipPath id="sk">${skinParts.map(d => `<path d="${d}"/>`).join('')}</clipPath>
    <clipPath id="hc"><path d="${head}"/></clipPath>
    <clipPath id="ec"><ellipse cx="0" cy="10" rx="44" ry="34"/></clipPath>
    <filter id="b1" ${BIG}><feGaussianBlur stdDeviation="1.4"/></filter>
    <filter id="b2" ${BIG}><feGaussianBlur stdDeviation="2.4"/></filter>
    <filter id="b3" ${BIG}><feGaussianBlur stdDeviation="4"/></filter>
    <filter id="b4" ${BIG}><feGaussianBlur stdDeviation="7"/></filter>
    <filter id="b9" ${BIG}><feGaussianBlur stdDeviation="14"/></filter>
  </defs>
  <g filter="url(#b9)">
    <ellipse cx="0" cy="-10" rx="270" ry="120" fill="#8a0a1a" opacity=".5"/>
    <ellipse cx="0" cy="20" rx="150" ry="110" fill="#ff3a1a" opacity=".3"/>
  </g>
  ${wing(-1)}${wing(1)}
  ${[-1, 1].map(s => shade(upperT(s).d, s < 0 ? 'dl' : 'dr')).join('')}
  ${armSpikes(-1)}${armSpikes(1)}
  ${[-1, 1].map(s => shade(foreT(s).d, s < 0 ? 'dl' : 'dr') + bracer(s) + claws(s) + shade(palm(s), s < 0 ? 'dl' : 'dr')).join('')}
  <path d="${torso}" fill="url(#skin)" stroke="${O}" stroke-width="3"/>
  ${abs.map((d, i) => `<path d="${d}" fill="url(#${i % 2 ? 'musR' : 'mus'})" stroke="${O}" stroke-width="1.6"/>`).join('')}
  ${[-1, 1].map(s => `<path d="${serr(s)}" fill="url(#${s < 0 ? 'mus' : 'musR'})" stroke="${O}" stroke-width="1.4"/>`).join('')}
  ${[-1, 1].map(s => shade(pec(s), s < 0 ? 'mus' : 'musR')).join('')}
  ${[-1, 1].map(s => shade(delt(s), s < 0 ? 'dl' : 'dr')).join('')}
  <g clip-path="url(#sk)">
    <path d="M-40,-150 C-50,-120 -56,-96 -70,-70 M-100,-40 C-118,-46 -138,-44 -152,-30 M-130,6 C-156,10 -180,26 -200,46 M-54,-44 C-74,-50 -90,-44 -100,-30" fill="none" stroke="#ffb090" stroke-width="5" opacity=".22" filter="url(#b3)" stroke-linecap="round"/>
    <g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <g stroke="${LAVA[0]}" stroke-width="6" opacity=".7" filter="url(#b2)">${crack}${seams.map(d => `<path d="${d}"/>`).join('')}</g>
      <g stroke="${LAVA[1]}" stroke-width="2">${crack}${seams.map(d => `<path d="${d}"/>`).join('')}</g>
      <g stroke="${LAVA[2]}" stroke-width=".8">${crack}${seams.map(d => `<path d="${d}"/>`).join('')}</g>
    </g>
  </g>
  ${[-1, 1].map(s => spike([[118, -44], [124, -64], [120, -82]], 6, s) + spike([[100, -42], [102, -58], [96, -72]], 4.4, s)).join('')}
  ${root(-196, 60, 21)}${root(196, 60, 21)}${root(-116, 112, 19)}${root(116, 112, 19)}
  <ellipse cx="0" cy="10" rx="76" ry="64" fill="#ff2a1a" opacity=".5" filter="url(#b4)"/>
  <g fill="none" stroke-linecap="round"><g stroke="#ff3a1a" stroke-width="5" opacity=".6" filter="url(#b2)">${tendr}</g><g stroke="#3a0610" stroke-width="3">${tendr}</g><g stroke="#ff8a4a" stroke-width="1">${tendr}</g></g>
  <path d="${rim}" fill="url(#maw)" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/>
  <ellipse cx="0" cy="10" rx="50" ry="40" fill="#1a0206" stroke="#ff6a2a" stroke-width="1.4" stroke-opacity=".7"/>
  <ellipse cx="0" cy="10" rx="44" ry="34" fill="url(#sclera)"/>
  <g clip-path="url(#ec)">
    <g fill="none" stroke="#b0101e" stroke-width="1.2" opacity=".75">${eyeVeins}</g>
    <circle cx="0" cy="10" r="26" fill="url(#iris)"/>
    <g stroke="#ffb070" stroke-width=".9" opacity=".5">${iris}</g>
    <ellipse cx="0" cy="10" rx="5.5" ry="24" fill="#050002"/>
    <ellipse cx="0" cy="10" rx="2" ry="20" fill="#3a0008"/>
    <path d="M-44,-4 C-24,-20 24,-20 44,-4 L44,-30 L-44,-30Z" fill="#000" opacity=".35" filter="url(#b2)"/>
  </g>
  <path d="M-52,8 C-40,-30 40,-30 52,8 C36,-16 -36,-16 -52,8Z" fill="url(#lid)" stroke="${O}" stroke-width="2.2"/>
  <path d="M-52,12 C-40,50 40,50 52,12 C36,36 -36,36 -52,12Z" fill="url(#lid)" stroke="${O}" stroke-width="2.2"/>
  <path d="M-40,-10 C-24,-22 22,-22 40,-10" fill="none" stroke="#e08070" stroke-width="1.2" opacity=".6"/>
  <path d="M-26,-2 C-18,-10 -6,-12 4,-10" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
  ${horn(-1)}${horn(1)}
  ${[-1, 1].map(s => spike([[44, 100], [64, 92], [80, 80]], 6, s) + spike([[48, 118], [64, 118], [76, 112]], 4.6, s) + spike([[38, 140], [50, 146], [58, 146]], 3.6, s)).join('')}
  <path d="${head}" fill="url(#headG)" stroke="${O}" stroke-width="2.8"/>
  <g clip-path="url(#hc)">
    <path d="M36,80 C52,104 48,132 26,164" fill="none" stroke="#000" stroke-width="14" opacity=".35" filter="url(#b3)"/>
    <path d="M-36,76 C-48,90 -52,104 -50,116" fill="none" stroke="#ffb090" stroke-width="5" opacity=".3" filter="url(#b2)"/>
    <path d="M0,68 L0,98 M-16,70 C-20,80 -20,90 -16,98 M16,70 C20,80 20,90 16,98" stroke="${O}" stroke-width="1.8" fill="none" opacity=".55"/>
    <g fill="none" stroke-linecap="round"><path d="M-32,82 L-26,88 L-30,94 M30,84 L24,90 L27,96 M-40,126 L-34,132 M38,124 L32,132" stroke="${LAVA[0]}" stroke-width="4" opacity=".7" filter="url(#b1)"/><path d="M-32,82 L-26,88 L-30,94 M30,84 L24,90 L27,96 M-40,126 L-34,132 M38,124 L32,132" stroke="${LAVA[2]}" stroke-width="1"/></g>
  </g>
  <path d="M-50,100 C-34,96 -14,104 0,114 C14,104 34,96 50,100 L46,108 C30,106 14,112 0,122 C-14,112 -30,106 -46,108Z" fill="#2a0808" stroke="${O}" stroke-width="1.8"/>
  <path d="M-48,101 C-34,97 -14,105 -2,113" fill="none" stroke="#c87a5a" stroke-width="1.2" opacity=".6"/>
  ${[-1, 1].map(s => `<path d="M${s * 8},118 L${s * 36},110 L${s * 26},122Z" fill="#ff5a1a" filter="url(#b2)"/><path d="M${s * 8},118 L${s * 36},110 L${s * 26},122Z" fill="#ffe08a" stroke="${O}" stroke-width="1.1"/><path d="M${s * 22},115 L${s * 23},120" stroke="#3a0000" stroke-width="2"/>`).join('')}
  <path d="M-6,132 L-3,128 M6,132 L3,128" stroke="${O}" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M-26,140 C-14,136 14,136 26,140 C22,152 12,158 0,158 C-12,158 -22,152 -26,140Z" fill="url(#mouth)" stroke="${O}" stroke-width="1.8"/>
  ${[-1, 1].map(s => `<path d="M${s * 22},139 L${s * 17},154 L${s * 14},139Z" fill="#f4e4cc" stroke="${O}" stroke-width=".9"/><path d="M${s * 9},138 L${s * 7},146 L${s * 4},138Z" fill="#f4e4cc" stroke="${O}" stroke-width=".7"/><path d="M${s * 14},158 L${s * 11},148 L${s * 7},158Z" fill="#e8d4b8" stroke="${O}" stroke-width=".7"/>`).join('')}
  ${[-1, 1].map(s => spike([[10, 162], [12, 170], [8, 178]], 3.6, s)).join('')}
  <g filter="url(#b1)">${embers}</g>
</svg>`;
}

// ═════════════════════════ 魔眼（深渊魔王的附属物）═════════════════════════
export function demonEyeSvg(px, dead) {
  const O = '#0a0204';
  const defs = `<defs>
    <radialGradient id="fl" cx="-6" cy="-4" r="24" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#d0606a"/><stop offset=".5" stop-color="#7a1a2c"/><stop offset="1" stop-color="#22030c"/></radialGradient>
    <linearGradient id="st" x1="-8" y1="0" x2="8" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#3a0612"/><stop offset=".4" stop-color="#b04050"/><stop offset="1" stop-color="#2a040e"/></linearGradient>
    <radialGradient id="ball" cx="-5" cy="-17" r="18" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff4d8"/><stop offset=".55" stop-color="#f0c070"/><stop offset=".85" stop-color="#b04020"/><stop offset="1" stop-color="#4a0a0a"/></radialGradient>
    <radialGradient id="ir" cx="0" cy="-19" r="8.5" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#2a0004"/><stop offset=".45" stop-color="#9a0014"/><stop offset=".8" stop-color="#ff3b4e"/><stop offset=".95" stop-color="#ffc080"/><stop offset="1" stop-color="#3a0008"/></radialGradient>
    <radialGradient id="lidg" cx="-4" cy="-20" r="20" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#a8444a"/><stop offset=".6" stop-color="#561020"/><stop offset="1" stop-color="#1a030a"/></radialGradient>
    <filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2"/></filter>
    <filter id="g1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1"/></filter>
    <clipPath id="bc"><circle cx="0" cy="-12" r="13.5"/></clipPath>
  </defs>`;
  const base = (dim) => `
    ${[0, 52, 104, 156, 208, 260, 312].map((a, i) => `<path transform="rotate(${a + 20})" d="M-2.6,-14 C-4,-20 -2,-25 ${i % 2 ? 1 : -1},-29 C2,-24 3.4,-20 2.6,-14Z" fill="#4a0a18" stroke="${O}" stroke-width=".8" opacity="${dim ? .6 : 1}"/>`).join('')}
    <circle r="17" fill="url(#fl)" stroke="${O}" stroke-width="1.6" ${dim ? 'opacity=".7"' : ''}/>
    ${[[-9, -9, 5], [10, -8, 4.4], [12, 8, 5], [-11, 9, 4.6], [0, 13, 4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#fl)" stroke="${O}" stroke-width="1"/>`).join('')}
    <path d="M-14,4 C-10,0 -12,-6 -6,-8 M14,2 C9,-1 11,-7 5,-9 M-6,15 C-4,10 4,10 6,15" stroke="#ff5a5a" stroke-opacity="${dim ? .3 : .7}" stroke-width="1" fill="none"/>`;
  if (dead) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ${PVB}>${defs}
    ${base(true)}
    <ellipse cx="0" cy="-3" rx="15" ry="12" fill="url(#lidg)" stroke="${O}" stroke-width="1.6"/>
    <path d="M-13,-3 C-6,1 6,1 13,-3" fill="none" stroke="${O}" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M-13,-3 C-6,-7 6,-7 13,-3" fill="none" stroke="#c87078" stroke-width=".9" opacity=".5"/>
    ${[-9, -4.5, 0, 4.5, 9].map(x => `<path d="M${x},${-0.6 + Math.abs(x) * .06} l${x * .06},3.2" stroke="${O}" stroke-width="1.1" stroke-linecap="round"/>`).join('')}
    <path d="M-5,0 C-6,5 -4,9 -5,14 C-4,17 -2,17 -2,14 C-3,10 -2,5 -3,1Z M5,0 C5,6 7,9 6,13 C7,15 9,15 8,12 C8,8 7,5 7,1Z" fill="#a0000e"/>
    <circle cx="-3.5" cy="15" r="1.8" fill="#c0101e"/><circle cx="7" cy="13.4" r="1.4" fill="#c0101e"/>
    <path d="M-10,-8 C-6,-11 -1,-12 3,-11" stroke="#fff" stroke-width="1" fill="none" opacity=".35"/>
  </svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ${PVB}>${defs}
    <circle cx="0" cy="-10" r="20" fill="#ff2a3a" opacity=".5" filter="url(#g)"/>
    ${base(false)}
    <path d="M-7,2 C-8,-6 -6,-10 -5,-12 L5,-12 C6,-10 8,-6 7,2Z" fill="url(#st)" stroke="${O}" stroke-width="1.2"/>
    <circle cx="0" cy="-12" r="14.5" fill="#22030c"/>
    <circle cx="0" cy="-12" r="13.5" fill="url(#ball)"/>
    <g clip-path="url(#bc)">
      <path d="M-13,-8 C-9,-11 -8,-6 -5,-9 M13,-6 C9,-9 8,-4 5,-7 M-6,1 C-5,-3 -2,-2 -1,-5 M8,0 C6,-3 4,-1 3,-4" stroke="#c0182a" stroke-width=".8" fill="none" opacity=".8"/>
      <ellipse cx="0" cy="-19" rx="8.6" ry="6.6" fill="url(#ir)"/>
      ${Array.from({ length: 16 }, (_, i) => `<path transform="translate(0,-19) rotate(${i * 22.5}) scale(1,.77)" d="M0,-7.6 L0,-4" stroke="#ffb070" stroke-width=".5" opacity=".6"/>`).join('')}
      <ellipse cx="0" cy="-19.4" rx="1.6" ry="5.6" fill="#050002"/>
    </g>
    <path d="M-14.5,-12 C-12,-27 12,-27 14.5,-12 C10,-23 -10,-23 -14.5,-12Z" fill="url(#lidg)" stroke="${O}" stroke-width="1.2"/>
    <path d="M-14.5,-11 C-11,3 11,3 14.5,-11 C10,0 -10,0 -14.5,-11Z" fill="url(#lidg)" stroke="${O}" stroke-width="1.2"/>
    <path d="M-12,-17 C-6,-22 6,-22 12,-17" fill="none" stroke="#e08070" stroke-width=".8" opacity=".6"/>
    <ellipse cx="-4.4" cy="-21.6" rx="2.2" ry="1.4" fill="#fff" opacity=".9"/>
    <circle cx="3.4" cy="-16.8" r=".9" fill="#fff" opacity=".6"/>
  </svg>`;
}
