// 星舰远征 · 新玩法的画面：航线投票、航线标签、全场口令、阵型羁绊、首领弱点、电磁力场、工程炮台
import { W, PVE, CLASSES } from './config.js';
import { posDef, negDef, weakClassName } from './events-pve.js';
import { laneCenter, LANES } from './fleet.js';
import { engTurretSvg } from './art.js';

const FONT = '"PingFang SC","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif';
const NUM = '"Orbitron","DIN Alternate","Bahnschrift","Segoe UI",sans-serif';
const CLS_COLOR = { dps: '#ffb43a', tank: '#5ff0ff', healer: '#5dff9e', carrier: '#c58bff', engineer: '#ffe95c' };
const POS = '#6dff9e', NEG = '#ff6b7a';

function rr(x, l, t, w, h, r) { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }
function fitText(x, text, maxW) { if (x.measureText(text).width <= maxW) return text; let s = text; while (s.length > 1 && x.measureText(s + '…').width > maxW) s = s.slice(0, -1); return s + '…'; }

// ───────── 世界坐标（会跟着震屏）─────────
// 电磁力场：品质色的半透明圆罩 + 转动的六边形环
export function drawFields(r, x) {
  const g = r.game;
  for (const z of g.fields || []) {
    const P = r.ultPal(g.fighters.get(z.owner));
    const k = Math.min(1, (z.max - z.t) / 0.25, z.t / 0.4);
    x.save(); x.globalCompositeOperation = 'lighter';
    const grd = x.createRadialGradient(z.x, z.y, z.r * 0.2, z.x, z.y, z.r);
    grd.addColorStop(0, `rgba(${P.rgb},0)`); grd.addColorStop(0.75, `rgba(${P.rgb},${0.08 * k})`); grd.addColorStop(1, `rgba(${P.lrgb},${0.28 * k})`);
    x.fillStyle = grd; x.beginPath(); x.arc(z.x, z.y, z.r, 0, Math.PI * 2); x.fill();
    x.globalAlpha = 0.85 * k; x.strokeStyle = P.rb || P.c; x.lineWidth = 2.5; x.setLineDash([18, 10]); x.lineDashOffset = -g.clock * 60;
    x.beginPath(); x.arc(z.x, z.y, z.r, 0, Math.PI * 2); x.stroke(); x.setLineDash([]);
    x.globalAlpha = 0.5 * k; x.lineWidth = 1.5; x.strokeStyle = P.l;
    x.beginPath();
    for (let i = 0; i <= 6; i++) { const a = g.clock * 0.8 + i * Math.PI / 3, px = z.x + Math.cos(a) * z.r * 0.62, py = z.y + Math.sin(a) * z.r * 0.62; if (i) x.lineTo(px, py); else x.moveTo(px, py); }
    x.stroke();
    x.restore();
    if (k > 0.5) r.label(x, `电磁力场 ${Math.ceil(z.t)}s`, z.x, z.y - z.r - 8, 12, P.l, true);
  }
}

// 工程炮台：三脚架炮台，炮口转向目标；脚下一圈表示剩余时间
export function drawTurret(r, x, d) {
  const g = r.game, o = g.fighters.get(d.owner);
  const art = r.sprite('etur', px => engTurretSvg(px), 40);
  const life = Math.max(0, d.t / (d.max || 14));
  const fade = Math.min(1, d.t / 0.6);
  x.save();
  x.globalAlpha = 0.35 * fade; x.strokeStyle = CLS_COLOR.engineer; x.lineWidth = 2;
  x.beginPath(); x.arc(d.x, d.y, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * life); x.stroke();
  x.globalAlpha = fade;
  if (art) { x.translate(d.x, d.y); x.rotate((d.aim ?? -Math.PI / 2) + Math.PI / 2); r.blit(x, art, 0, 0); }
  x.restore();
  if (d.flash > 0) { x.save(); x.globalCompositeOperation = 'lighter'; const gl = r.glowSprite('#fff4a0', 10); const a = d.aim ?? -Math.PI / 2; x.drawImage(gl, d.x + Math.cos(a) * 20 - gl.half, d.y + Math.sin(a) * 20 - gl.half); x.restore(); }
  void o;
}

// 首领弱点：转动的准星 + 指定战舰 + 弱点血条；瘫痪时核心附近冒电弧
export function drawWeak(r, x) {
  const g = r.game, boss = g.teams.red;
  if (!boss?.boss || !boss.present) return;
  const cy = boss.y + boss.coreDy;
  const wk = boss.weak;
  if (wk) {
    const wx = boss.x + wk.dx, wy = cy + 46, col = CLS_COLOR[wk.cls] || '#fff';
    const pulse = 1 + 0.08 * Math.sin(g.clock * 10);
    x.save(); x.translate(wx, wy);
    x.globalCompositeOperation = 'lighter';
    const gl = r.glowSprite(col, 34 * pulse); x.globalAlpha = 0.55; x.drawImage(gl, -gl.half, -gl.half);
    x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    x.strokeStyle = col; x.lineWidth = 3;
    for (let i = 0; i < 4; i++) { const a = g.clock * 2 + i * Math.PI / 2; x.beginPath(); x.arc(0, 0, 36 * pulse, a, a + 0.9); x.stroke(); }
    x.lineWidth = 2; x.beginPath(); x.moveTo(-50, 0); x.lineTo(-24, 0); x.moveTo(50, 0); x.lineTo(24, 0); x.moveTo(0, -50); x.lineTo(0, -24); x.moveTo(0, 50); x.lineTo(0, 24); x.stroke();
    const ic = r.fighterArt({ cls: wk.cls, skin: 0, team: 'blue' });
    if (ic) { x.save(); x.scale(0.55, 0.55); r.blit(x, ic, 0, 0); x.restore(); }
    x.restore();
    // 血条 + 文字
    const bw = 130, k = Math.max(0, wk.hp / wk.max);
    x.fillStyle = 'rgba(0,0,0,.6)'; rr(x, wx - bw / 2 - 2, wy + 52, bw + 4, 10, 4); x.fill();
    x.fillStyle = col; x.fillRect(wx - bw / 2, wy + 54, bw * k, 6);
    r.label(x, `弱点 · 只有${weakClassName(wk.cls)}能打 ${Math.ceil(wk.t)}s`, wx, wy + 74, 14, col, true);
  }
  if (boss.stunT > 0) {
    x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = '#bfefff'; x.lineWidth = 2.2;
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2, r0 = 40 + Math.random() * 30;
      x.beginPath(); x.moveTo(boss.x + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      for (let k = 1; k < 5; k++) { const rk = r0 + k * 16; x.lineTo(boss.x + Math.cos(a + (Math.random() - 0.5) * 0.5) * rk, cy + Math.sin(a + (Math.random() - 0.5) * 0.5) * rk); }
      x.stroke();
    }
    x.restore();
    r.label(x, `瘫痪 ${Math.ceil(boss.stunT)}s · 受到伤害×${PVE.weak.stunDmg}`, boss.x, cy + 92, 16, '#bfefff', true);
  }
}

// ───────── 屏幕坐标（HUD）─────────
export function drawEventHud(r, x) {
  const g = r.game;
  if (g.mode !== 'pve') return;
  if (g.phase === 'battle' && g.vote) drawVote(r, x, g.vote);
  else if (g.route) drawRouteChips(r, x, g.route);
  if (g.phase === 'battle' && g.callout) drawCallout(r, x, g.callout, g.vote ? 244 : 110);   // 放在顶部（投票面板下面），不和中间的横幅打架
  if (g.phase === 'battle') drawBonds(r, x);
}

function drawVote(r, x, v) {
  const g = r.game, top = 88, h = 148;
  x.save();
  x.fillStyle = 'rgba(6,10,26,.82)'; rr(x, 8, top, W - 16, h, 12); x.fill();
  x.strokeStyle = 'rgba(255,216,107,.6)'; x.lineWidth = 1.5; x.stroke();
  x.textBaseline = 'middle'; x.textAlign = 'left';
  x.font = `800 16px ${FONT}`; x.fillStyle = '#ffd86b'; x.fillText(`第${v.ch}章 · 选航线`, 22, top + 18);
  x.font = `13px ${FONT}`; x.fillStyle = '#c8d2ee'; x.fillText('发「A」「B」「C」投票，每条一好一坏，持续整章', 140, top + 18);
  x.textAlign = 'right'; x.font = `800 18px ${NUM}`; x.fillStyle = v.t <= 5 ? NEG : '#fff'; x.fillText(`${Math.ceil(v.t)}s`, W - 22, top + 18);
  // 倒计时条
  x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(20, top + 32, W - 40, 3);
  x.fillStyle = '#ffd86b'; x.fillRect(20, top + 32, (W - 40) * Math.max(0, v.t / v.max), 3);
  const total = Math.max(1, v.tally.reduce((a, b) => a + b, 0)), best = Math.max(...v.tally);
  const cw = (W - 16 - 24) / 3;
  v.options.forEach((o, i) => {
    const P = posDef(o.pos), N = negDef(o.neg);
    const cx = 20 + i * (cw + 4), cy = top + 42, chH = h - 50;
    const lead = v.tally[i] === best && best > 0;
    x.fillStyle = lead ? 'rgba(255,216,107,.12)' : 'rgba(255,255,255,.04)'; rr(x, cx, cy, cw, chH, 9); x.fill();
    if (lead) { x.strokeStyle = 'rgba(255,216,107,.8)'; x.lineWidth = 1.5; x.stroke(); }
    x.textAlign = 'left';
    x.font = `900 26px ${NUM}`; x.fillStyle = lead ? '#ffd86b' : '#e8eeff'; x.fillText('ABC'[i], cx + 10, cy + 20);
    x.font = `700 13px ${FONT}`; x.fillStyle = POS; x.fillText(fitText(x, `▲${P.name}`, cw - 48), cx + 40, cy + 13);
    x.font = `11px ${FONT}`; x.fillStyle = '#d6ffe2'; x.fillText(fitText(x, P.desc, cw - 48), cx + 40, cy + 29);
    x.font = `700 13px ${FONT}`; x.fillStyle = NEG; x.fillText(fitText(x, `▼${N.name}`, cw - 16), cx + 10, cy + 49);
    x.font = `11px ${FONT}`; x.fillStyle = '#ffd6da'; x.fillText(fitText(x, N.desc, cw - 16), cx + 10, cy + 64);
    x.fillStyle = '#9fb0d0'; x.fillText(fitText(x, `克制：${N.tip}`, cw - 16), cx + 10, cy + 79);
    // 票数条
    x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(cx + 10, cy + chH - 8, cw - 60, 4);
    x.fillStyle = lead ? '#ffd86b' : '#7fe3ff'; x.fillRect(cx + 10, cy + chH - 8, (cw - 60) * v.tally[i] / total, 4);
    x.textAlign = 'right'; x.font = `700 12px ${NUM}`; x.fillStyle = '#fff'; x.fillText(`${v.tally[i]}票`, cx + cw - 8, cy + chH - 6);
  });
  x.restore();
  void g;
}

function drawRouteChips(r, x, rt) {
  const g = r.game, P = posDef(rt.pos), N = negDef(rt.neg);
  if (!P || !N || rt.ch !== g.pve?.lv) return;
  x.save(); x.textBaseline = 'middle'; x.textAlign = 'left'; x.font = `700 12px ${FONT}`;
  const parts = [[`航线${'ABC'[rt.pick] || ''}`, '#ffd86b'], [`▲${P.name} ${P.desc}`, POS], [`▼${N.name} ${N.desc}`, NEG]];
  let cx = 10;
  for (const [t, c] of parts) {
    const w = x.measureText(t).width + 14;
    x.fillStyle = 'rgba(0,0,0,.45)'; rr(x, cx, 84, w, 18, 8); x.fill(); x.strokeStyle = c; x.lineWidth = 1; x.stroke();
    x.fillStyle = c; x.fillText(t, cx + 7, 93.5); cx += w + 5;
  }
  x.restore();
}

function drawCallout(r, x, c, top) {
  const g = r.game, cx = W / 2, w = 440, h = 86;
  const k = c.got.size / c.need;
  const pulse = 0.6 + 0.4 * Math.sin(g.clock * 6);
  x.save();
  x.fillStyle = 'rgba(30,12,4,.82)'; rr(x, cx - w / 2, top, w, h, 14); x.fill();
  x.strokeStyle = `rgba(255,200,80,${0.5 + 0.5 * pulse})`; x.lineWidth = 2; x.stroke();
  x.textBaseline = 'middle'; x.textAlign = 'center';
  x.font = `700 13px ${FONT}`; x.fillStyle = '#ffb43a'; x.fillText(`紧急口令 · ${Math.ceil(c.t)}s 内 ${c.need} 人发`, cx, top + 15);
  x.font = `900 28px ${FONT}`; x.fillStyle = '#fff2c4'; x.fillText(`「${c.words}」`, cx, top + 41);
  x.font = `12px ${FONT}`; x.fillStyle = '#ffe2b0'; x.fillText(c.desc, cx, top + 64);
  x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(cx - w / 2 + 16, top + h - 9, w - 32, 4);
  x.fillStyle = '#ffd86b'; x.fillRect(cx - w / 2 + 16, top + h - 9, (w - 32) * Math.min(1, k), 4);
  x.textAlign = 'right'; x.font = `700 13px ${NUM}`; x.fillStyle = '#fff'; x.fillText(`${c.got.size}/${c.need}`, cx + w / 2 - 14, top + 15);
  x.restore();
}

// 阵型羁绊：每条航道底部（底部面板上方）显示生效中的羁绊
function drawBonds(r, x) {
  const g = r.game;
  if (!g.bonds) return;
  x.save(); x.textBaseline = 'middle'; x.textAlign = 'center'; x.font = `700 12px ${FONT}`;
  for (const l of LANES) {
    const ids = g.bonds[l] || [];
    if (!ids.length) continue;
    const t = '羁绊 ' + ids.map(id => PVE.bonds.find(b => b.id === id)?.name).join('·');
    const w = x.measureText(t).width + 16, cx = laneCenter(l);
    x.fillStyle = 'rgba(0,0,0,.5)'; rr(x, cx - w / 2, 978, w, 18, 9); x.fill();
    x.strokeStyle = 'rgba(255,216,107,.7)'; x.lineWidth = 1; x.stroke();
    x.fillStyle = '#ffd86b'; x.fillText(t, cx, 987.5);
  }
  x.restore();
}

// 新玩法的说明页（右下角轮播用）
export const EVENT_HELP = [
  '每章开打先投票选航线：发「A」「B」「C」，每条一好一坏，管整章',
  '同航道组合有羁绊：机甲+医疗铁壁、输出+航母火力网、机甲+输出突击…',
  '首领血量60%、25%露出弱点：只有指定战舰能打破，打破后首领瘫痪',
  '随机紧急口令：限时内够人数发那句话，全队触发大效果',
];
export { CLS_COLOR };
void CLASSES;
