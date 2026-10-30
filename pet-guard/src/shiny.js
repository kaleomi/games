// 闪光换色：每种萌宠都有一套自己的「闪光配色」，只换主毛色（眼睛、描边、腮红不动），全是柔和的马卡龙色。
// 规则：h/w 色相窗口（不写就不看色相），sMin/sMax/vMin/vMax 饱和度/亮度门槛（边缘柔和过渡），
//       to 目标色相，k 色相起伏保留多少，s/sAdd 饱和度 ×/+，v/vAdd 亮度 ×/+
// 调色板是对着三个形态的图逐只调的；想换颜色改这里的 to（目标色相）就行。
export const SHINY = {
  shiba: [{ h: 30, w: 30, vMin: 0.42, to: 340, k: 0.4, s: 0.62, v: 1.05 }],   // 樱花粉
  cat: [{ h: 28, w: 30, vMin: 0.42, to: 268, k: 0.4, s: 0.5, v: 1.04 }],   // 薰衣草紫
  bunny: [{ sMax: 0.16, vMin: 0.6, to: 205, sAdd: 0.2, v: 0.99 }],   // 天空蓝
  panda: [{ sMax: 0.75, vMax: 0.45, to: 332, s: 0.3, sAdd: 0.22, vAdd: 0.34, v: 1.1 }, { sMax: 0.14, vMin: 0.62, to: 340, sAdd: 0.07 }],   // 香芋紫
  fox: [{ h: 8, w: 32, vMin: 0.3, to: 208, k: 0.4, s: 0.75, v: 1.08 }, { h: 195, w: 30, to: 318, k: 0.5, s: 0.8 }],   // 冰雪蓝狐（粉色狐火）
  hamster: [{ h: 34, w: 28, vMin: 0.42, to: 215, k: 0.3, s: 0.4, v: 1.02 }],   // 雾蓝
  penguin: [{ sMax: 0.45, vMax: 0.4, to: 262, sAdd: 0.35, vAdd: 0.2, v: 1.1 }, { sMax: 0.16, vMin: 0.4, vMax: 0.8, to: 262, sAdd: 0.2, v: 1.05 }, { h: 45, w: 25, to: 335, s: 0.8 }],   // 星夜紫
  sheep: [{ sMax: 0.2, vMin: 0.62, to: 338, sAdd: 0.2 }],   // 棉花糖粉
  dragon: [{ h: 328, w: 45, vMin: 0.45, to: 205, k: 0.4, s: 1.25, sAdd: 0.05 }],   // 宝宝蓝
  deer: [{ h: 28, w: 30, vMin: 0.4, to: 250, k: 0.3, s: 0.3, v: 1.12 }],   // 月光白鹿
  unicorn: [{ sMax: 0.16, vMin: 0.6, to: 272, sAdd: 0.18 }],   // 丁香紫
  phoenix: [{ h: 25, w: 40, vMin: 0.3, to: 218, k: 0.8, s: 0.85, v: 1.05 }],   // 冰蓝凤凰
};
export const SHINY_NAME = {"shiba": "樱花粉", "cat": "薰衣草紫", "bunny": "天空蓝", "panda": "香芋紫", "fox": "冰雪蓝", "hamster": "雾蓝", "penguin": "星夜紫", "sheep": "棉花糖粉", "dragon": "宝宝蓝", "deer": "月光白鹿", "unicorn": "丁香紫", "phoenix": "冰蓝凤凰"};
const ss = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0 + 1e-9))); return t * t * (3 - 2 * t); };
// 直接改 RGBA 像素（Uint8ClampedArray）
export function recolorShiny(px, rules) {
  if (!rules?.length) return px;
  const F = 0.06;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d > 1e-6) { h = mx === r ? (g - b) / d : mx === g ? 2 + (b - r) / d : 4 + (r - g) / d; h = ((h / 6) % 1 + 1) % 1 * 360; }
    const s = mx > 0 ? d / mx : 0, v = mx;
    let or = r, og = g, ob = b, left = 1;
    for (const R of rules) {
      let w = 1, dh = 0;
      if (R.h != null) { dh = ((h - R.h + 540) % 360) - 180; w *= 1 - ss(R.w * 0.6, R.w, Math.abs(dh)); w *= ss(0.06, 0.14, s); }
      if (R.sMin != null) w *= ss(R.sMin - F, R.sMin + F, s);
      if (R.sMax != null) w *= 1 - ss(R.sMax - F, R.sMax + F, s);
      if (R.vMin != null) w *= ss(R.vMin - F, R.vMin + F, v);
      if (R.vMax != null) w *= 1 - ss(R.vMax - F, R.vMax + F, v);
      w *= left;
      if (w <= 0.001) continue;
      const nh = ((R.to + dh * (R.k ?? 0.5)) % 360 + 360) % 360;
      const ns = Math.min(1, Math.max(0, s * (R.s ?? 1) + (R.sAdd || 0)));
      const nv = Math.min(1, Math.max(0, v * (R.v ?? 1) + (R.vAdd || 0)));
      const hh = nh / 60, k = Math.floor(hh) % 6, f = hh - Math.floor(hh), p = nv * (1 - ns), q = nv * (1 - ns * f), t = nv * (1 - ns * (1 - f));
      const c = [[nv, t, p], [q, nv, p], [p, nv, t], [p, q, nv], [t, p, nv], [nv, p, q]][k];
      or = or * (1 - w) + c[0] * w; og = og * (1 - w) + c[1] * w; ob = ob * (1 - w) + c[2] * w;
      left *= 1 - w;
    }
    px[i] = or * 255; px[i + 1] = og * 255; px[i + 2] = ob * 255;
  }
  return px;
}
