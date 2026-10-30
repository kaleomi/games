// HUD：顶栏（关卡、倒计时、心愿果、爱心能量）、首领血条、礼物效果、本关贡献、萌宠战力榜、玩法轮播、
// 横幅、提示、开场页、结算页、萌宠卡、天赋觉醒、长大
import { W, H, FONT, ROUND_FONT, BOTTOM_Y, SPECIES, SPECIES_IDS, GEAR, TALENT, FORMS, TREE, GIFTS, GIFT_TITLES, MORALE, LEVEL, FOES, ROLE_NAMES, BOND, COMFORT, FRIEND, SPRITES, WISH } from './config.js';
import { wishStore } from './wish.js';
import { bestFriend, friendLevel, SPRITE_UNITS } from './friends.js';
import { farmOf, plotStage, CROP, levelNeed, plotCost, marketMul, fmtSec, petUnlocked } from './farm.js';
import { CROPS, FARM, ADV_PETS, ADV_IDS } from './config.js';
import { rr, heart, star, clipText, twinkle, rainbowHalo, flowFill } from './render.js';
import { talentParts, combatPower, setBonus, itemName, bondLevel, bondNext, SLOT_IDS, talentMul, starOf } from './gear.js';
import { stageLabel, stageTitle, stageKind, KIND_NAMES, chapterOf, chapterDef } from './stage.js';
import { fmtDuration } from './game.js';

const C = { ink: '#5a3a35', mute: '#9b7b72', panel: 'rgba(255,250,246,0.9)', edge: '#f2bfd2', pink: '#ff7fae', mint: '#3fcf8e', gold: '#ffb020' };
const TAU = Math.PI * 2;
function panel(x, l, t, w, h, a = 0.9) {
  x.save();
  x.shadowColor = 'rgba(120,60,80,0.18)'; x.shadowBlur = 10; x.shadowOffsetY = 3;
  x.fillStyle = `rgba(255,250,246,${a})`; rr(x, l, t, w, h, 16); x.fill();
  x.shadowColor = 'transparent';
  x.strokeStyle = C.edge; x.lineWidth = 2; x.stroke();
  x.restore();
}
function pill(x, text, cx, cy, bg = C.pink, fg = '#fff', size = 15) {
  x.font = `bold ${size}px ${FONT}`;
  const w = x.measureText(text).width + size * 1.2;
  x.fillStyle = bg; rr(x, cx - w / 2, cy - size * 0.75, w, size * 1.5, size * 0.75); x.fill();
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, cx, cy + 1); x.textBaseline = 'alphabetic';
  return w;
}
function text(x, s, px, py, size, color = C.ink, align = 'left', weight = 'bold', font = FONT) {
  x.font = `${weight} ${size}px ${font}`; x.textAlign = align; x.fillStyle = color; x.fillText(s, px, py);
}
function outlined(x, s, px, py, size, color = '#fff', stroke = 'rgba(90,40,60,.9)', align = 'center', font = FONT, lw = 5) {
  x.font = `900 ${size}px ${font}`; x.textAlign = align; x.lineJoin = 'round'; x.strokeStyle = stroke; x.lineWidth = lw; x.strokeText(s, px, py); x.fillStyle = color; x.fillText(s, px, py);
}
function avatarCircle(r, x, url, cx, cy, rad, fallback = '#ffd6e4', label = '') {
  const im = r.avatar(url);
  x.save(); x.beginPath(); x.arc(cx, cy, rad, 0, TAU); x.closePath();
  if (im) { x.clip(); x.drawImage(im, cx - rad, cy - rad, rad * 2, rad * 2); }
  else { x.fillStyle = fallback; x.fill(); if (label) { x.fillStyle = '#fff'; x.font = `bold ${rad}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(label.slice(0, 1), cx, cy + 1); x.textBaseline = 'alphabetic'; } }
  x.restore();
  x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, rad, 0, TAU); x.stroke();
}
// 闪光头像：原图不改色，背后一圈彩虹柔光，角上一闪一闪的十字星
function shinyIconBack(r, x, cx, cy, size, lv = 1) {
  if (lv < 2) return;   // 刚出闪光：头像上只闪星星，2★起背后加彩虹光圈
  if (!r.glowImg(x, 'shiny:halo', cx, cy, size * 1.3, 0.75, r.t * 0.4, 1, 'source-over')) rainbowHalo(x, cx, cy, size * 0.62, 0.6, r.t * 0.4);
}
function shinyIconFront(r, x, cx, cy, size, lv = 1) {
  x.save(); x.globalCompositeOperation = 'lighter';
  const k = (r.t * 0.8) % 1, k2 = (r.t * 0.8 + 0.5) % 1, s1 = Math.sin(k * Math.PI), s2 = Math.sin(k2 * Math.PI);
  const big = Math.max(6, size * 0.2);
  if (!r.glowImg(x, 'shiny:twinkle', cx + size * 0.36, cy - size * 0.34, big * 2.4 * s1, 1, k, 1, 'source-over')) twinkle(x, cx + size * 0.36, cy - size * 0.34, big * s1, '#fff6c8', k);
  if (size >= 60 && lv >= 3 && !r.glowImg(x, 'shiny:twinkle', cx - size * 0.34, cy + size * 0.1, big * 1.6 * s2, 1, k2, 1, 'source-over')) twinkle(x, cx - size * 0.34, cy + size * 0.1, big * 0.7 * s2, '#ffd6f0', k2);
  x.restore();
}
// ───────── 天赋觉醒：萌宠动起来 ─────────
// 0~1.6秒 蓄力：闭眼浮起来、越抖越快，光点往身上聚；1.6秒 爆发：白光一闪、跳起来；之后落地摆姿势、轻轻晃
// 有序列帧 seq_<物种>_awaken（4帧：蓄力 / 下蹲 / 跳起 / 摆姿势）就按帧放；没有就用开心蹦跳帧；都没有用程序做的动作
const AWAKEN_AT = 1.6;
function drawAwakenPet(r, x, p, form, cx, cy, size, roll) {
  const t = p.t, T = TALENT.tiers, tier = roll ? 1 : Math.max(1, p.best || 1), col = T[roll ? 1 + Math.floor(t * 14) % (T.length - 1) : tier].color;
  const seqA = r.assets.frames(`seq:${p.sp}:${form}:awaken`), seqH = r.assets.frames(`seq:${p.sp}:${form}:happy`);
  let name = `pet:${p.sp}:${form}`, ox = 0, oy = 0, sx = 1, sy = 1, rot = 0;
  const q = Math.max(0, t - AWAKEN_AT);
  if (roll) {
    const k = t / AWAKEN_AT;
    oy = -k * 22 + Math.sin(t * 3) * 3;
    ox = Math.sin(t * 46) * k * k * 5;
    sy = 1 + Math.sin(t * 10) * 0.03 * (1 + k); sx = 2 - sy;
    if (seqA) name = seqA.names[k < 0.75 ? 0 : 1];
    else if (k > 0.75) { sy *= 0.9; sx *= 1.08; oy += 10; }   // 爆发前一下蹲
  } else if (q < 0.55) {
    const j = q / 0.55;
    oy = -22 * (1 - j) - Math.sin(j * Math.PI) * (34 + tier * 5);
    const pop = Math.max(0, 1 - q / 0.3); sx = sy = 1 + 0.28 * pop;
    rot = tier >= 5 ? Math.sin(j * Math.PI) * 0.25 * (Math.sin(t * 3) > 0 ? 1 : -1) : 0;
    if (seqA) name = seqA.names[2];
    else if (seqH) name = seqH.names[Math.min(seqH.names.length - 1, 1 + Math.floor(j * 2))];
  } else {
    const j = q - 0.55, land = Math.max(0, 1 - j / 0.18);
    sy = 1 - 0.12 * land + Math.sin(j * 3.2) * 0.015; sx = 1 + 0.1 * land - Math.sin(j * 3.2) * 0.01;
    oy = -Math.abs(Math.sin(j * 4.2)) * 6 * Math.max(0, 1 - j / 1.2);
    if (seqA) name = seqA.names[3];
    else if (seqH) name = seqH.names[seqH.names.length - 1];
  }
  // 蓄力：彩色光点从四周旋进来；爆发：一圈白光 + 星星炸开（档位越高越多）
  x.save(); x.globalCompositeOperation = 'lighter';
  if (roll) {
    for (let i = 0; i < 14; i++) {
      const ph = (t * 0.9 + i / 14) % 1, an = i * 2.4 + t * 2.2, rad = 190 * (1 - ph);
      x.globalAlpha = Math.sin(ph * Math.PI) * 0.85; x.fillStyle = i % 3 ? col : '#ffffff';
      x.beginPath(); x.arc(cx + Math.cos(an) * rad, cy + oy + Math.sin(an) * rad * 0.8, 3 + 4 * ph, 0, TAU); x.fill();
    }
  } else if (q < 0.9) {
    const k = q / 0.9;
    x.globalAlpha = (1 - k) * 0.9; x.strokeStyle = '#ffffff'; x.lineWidth = 10 * (1 - k) + 2;
    x.beginPath(); x.arc(cx, cy, 30 + k * 230, 0, TAU); x.stroke();
    x.globalAlpha = (1 - k) * 0.6; x.strokeStyle = col; x.lineWidth = 6 * (1 - k) + 2; x.beginPath(); x.arc(cx, cy, 20 + k * 170, 0, TAU); x.stroke();
    if (q < 0.18) { x.globalAlpha = (1 - q / 0.18) * 0.8; const fl = x.createRadialGradient(cx, cy, 0, cx, cy, 200); fl.addColorStop(0, '#ffffff'); fl.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = fl; x.beginPath(); x.arc(cx, cy, 200, 0, TAU); x.fill(); }
    const n = 8 + tier * 4;
    for (let i = 0; i < n; i++) {
      const an = i / n * TAU + i * 0.7, d = 40 + (q / 0.9) ** 0.6 * (150 + (i % 4) * 30);
      x.globalAlpha = 1 - k; x.fillStyle = i % 2 ? col : '#fff6c8';
      star(x, cx + Math.cos(an) * d, cy - 10 + Math.sin(an) * d * 0.85, 7 + (i % 3) * 3); x.fill();
    }
  }
  x.restore();
  // 萌宠本身（高度对齐：脚底贴在同一条线上，换帧不跳）
  const slv = p.shiny && !roll ? Math.max(1, p.star || 1) : 0;
  if (slv) shinyIconBack(r, x, cx + ox, cy + oy, size, slv);
  const a = r.assets.get(name);
  if (a) {
    const H = size * 0.98, s = H / a.h, w = a.w * s, foot = cy + size * 0.49;
    x.save(); x.translate(cx + ox, foot + oy); x.rotate(rot); x.scale(sx, sy);
    if (roll && t / AWAKEN_AT > 0.5) { x.shadowColor = col; x.shadowBlur = 18 * (t / AWAKEN_AT); }
    x.drawImage(a.img, -w / 2, -H, w, H); x.restore();
  } else petIcon(r, x, p.sp, form, cx + ox, cy + oy, size);
  if (slv) shinyIconFront(r, x, cx + ox, cy + oy, size, slv);
}
// 小号萌宠头像（取图里的成年形态，没有就色块）
function petIcon(r, x, sp, form, cx, cy, size, shiny = false) {
  const name = `pet:${sp}:${form}`, a = r.assets.get(name);
  const slv = shiny === true ? 1 : shiny | 0;
  if (slv) shinyIconBack(r, x, cx, cy, size, slv);
  if (a) { const s = size / Math.max(a.w, a.h); x.drawImage(a.img, cx - a.w * s / 2, cy - a.h * s / 2, a.w * s, a.h * s); if (slv) shinyIconFront(r, x, cx, cy, size, slv); return; }
  x.fillStyle = SPECIES[sp]?.color || '#ccc'; x.beginPath(); x.arc(cx, cy, size * 0.42, 0, TAU); x.fill();
  x.fillStyle = '#fff'; x.font = `bold ${Math.round(size * 0.42)}px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(SPECIES[sp]?.kind?.slice(-1) || '?', cx, cy + 1); x.textBaseline = 'alphabetic';
}
function partsText(x, parts, px, py, size, align = 'left') {
  x.font = `bold ${size}px ${FONT}`;
  let w = 0; for (const p of parts) w += x.measureText(p.text).width;
  let cx = align === 'center' ? px - w / 2 : align === 'right' ? px - w : px;
  x.textAlign = 'left';
  for (const p of parts) { const pw = x.measureText(p.text).width; x.fillStyle = p.flow ? flowFill(x, cx, pw) : p.color; x.fillText(p.text, cx, py); cx += pw; }
  return w;
}
const fruitsOf = g => (g.tree ? Math.max(0, Math.ceil(g.tree.hp / (g.tree.maxHp / TREE.fruits) - 1e-6)) : TREE.fruits);

export function drawHud(r, x, dt) {
  const g = r.game;
  x.save();
  topBar(r, x);
  bossBar(r, x);
  const prompt = g.zones.some(z => z.full) || (g.phase === 'battle' && g.stage?.sub === 'comfort');
  if (g.settings.giftBox !== false && !prompt) giftBox(r, x);   // 全屏大招 / 抱抱首领的大提示出来时，两边小面板先让开
  if (!prompt) meritBoard(r, x);
  bottomPanels(r, x);
  blastPrompt(r, x);
  comfortPrompt(r, x);
  drawStamp(r, x, dt);
  drawBanners(r, x, dt);
  drawToasts(r, x, dt);
  if (g.phase === 'lobby') lobby(r, x);
  if (g.phase === 'clear') clearStamp(r, x);
  if (g.phase === 'result' && g.result) result(r, x, dt);
  drawCards(r, x, dt);
  drawPopups(r, x, dt);
  x.restore();
}

function topBar(r, x) {
  const g = r.game, n = g.stage?.n || g.stageN;
  if (g.phase === 'home') return homeBar(r, x);
  x.save();
  x.fillStyle = 'rgba(255,250,246,0.88)'; x.fillRect(0, 0, W, 62);
  x.fillStyle = C.edge; x.fillRect(0, 62, W, 3);
  text(x, stageTitle(n), 14, 28, 19, C.ink);
  text(x, `${stageLabel(n)} · ${KIND_NAMES[stageKind(n)]}关`, 14, 52, 14, C.mute);
  // 倒计时
  const left = g.phase === 'battle' && g.stage ? Math.max(0, g.stage.left) : g.phaseT;
  const urgent = g.phase === 'battle' && left < 20;
  pill(x, g.phase === 'battle' ? fmtDuration(left) : g.phase === 'lobby' ? `${Math.ceil(g.phaseT)}秒后开始` : '休息一下', 360, 31, urgent ? '#ff6b81' : '#ffb3cf', '#fff', 20);
  // 心愿果
  const fr = fruitsOf(g);
  if (!r.icon(x, 'icon:fruit', 560, 31, 34)) { x.fillStyle = '#ffb347'; heart(x, 560, 31, 13); x.fill(); }
  const low = fr <= 3 && g.phase === 'battle';
  text(x, `${fr}`, 584, 41, 28, low ? '#ff5f78' : '#e08a2a');
  text(x, `/${TREE.fruits}`, 584 + x.measureText(`${fr}`).width + 2, 41, 16, C.mute, 'left', 'bold');
  text(x, '心愿果', 652, 30, 13, C.mute);
  // 爱心能量（点赞）
  const k = Math.min(1, (g.morale || 0) / MORALE.need);
  text(x, '点赞', 652, 51, 12, C.pink);
  x.fillStyle = '#ffe1ec'; rr(x, 680, 43, 32, 8, 4); x.fill(); x.fillStyle = C.pink; rr(x, 680, 43, 32 * k, 8, 4); x.fill();
  x.restore();
}
function homeBar(r, x) {
  const g = r.game;
  x.save();
  x.fillStyle = 'rgba(255,250,240,0.9)'; x.fillRect(0, 0, W, 62); x.fillStyle = '#e8c890'; x.fillRect(0, 62, W, 3);
  text(x, '家园 · 回家种田', 14, 28, 19, C.ink);
  text(x, `下一站 ${stageTitle(g.stageN)}`, 14, 52, 13, C.mute, 'left', 'normal');
  pill(x, `在家 ${fmtDuration(g.phaseT)}`, 360, 31, '#8fd36a', '#fff', 20);
  if (!r.icon(x, 'farm:coin', 548, 31, 30)) { x.fillStyle = '#ffd23a'; x.beginPath(); x.arc(548, 31, 13, 0, TAU); x.fill(); }
  text(x, '发「种田」', 568, 28, 15, '#c0573d');
  text(x, '收·卖·种·浇一键做完', 568, 50, 11, C.mute, 'left', 'normal');
  x.restore();
}
function bossBar(r, x) {
  const g = r.game;
  let list = [];
  if (g.boss && g.boss.alive && !g.boss.purified) list = [g.boss];
  else if (g.stage?.sub === 'leader') list = g.foes.filter(e => e.leader && e.alive && !e.purified);
  else if (g.stage?.sub === 'elite') list = g.foes.filter(e => e.role === 'elite' && e.alive && !e.purified);
  if (!list.length) return;
  const hp = list.reduce((s, e) => s + Math.max(0, e.hp), 0), max = list.reduce((s, e) => s + e.maxHp, 0);
  const boss = list[0].role === 'boss';
  const l = 70, t = 72, w = 580, h = 22;
  x.save();
  x.fillStyle = 'rgba(80,50,90,0.6)'; rr(x, l, t, w, h, 11); x.fill();
  const gr = x.createLinearGradient(l, 0, l + w, 0); gr.addColorStop(0, '#b88bff'); gr.addColorStop(1, '#ff8fc7');
  x.fillStyle = gr; rr(x, l + 2, t + 2, Math.max(0, (w - 4) * hp / max), h - 4, 9); x.fill();
  if (boss) for (const k of [0.66, 0.33]) { x.fillStyle = 'rgba(255,255,255,.7)'; x.fillRect(l + w * k, t + 3, 2, h - 6); }
  outlined(x, `${boss ? '首领 ' : ''}${list.length > 1 ? list.map(e => e.name).join(' · ') : list[0].name}  坏心情 ${Math.ceil(hp / max * 100)}%`, 360, t + 17, 15, '#fff', 'rgba(70,30,70,.9)', 'center', FONT, 4);
  x.restore();
}
function giftBox(r, x) {
  const g = r.game, c = g.clock, rows = [];
  if ((g.partyUntil || 0) > c) rows.push([`爱心派对 全队攻击+30%`, Math.ceil(g.partyUntil - c)]);
  if ((g.moraleUntil || 0) > c) rows.push([`爱心满满 全队伤害+10%`, Math.ceil(g.moraleUntil - c)]);
  if ((g.harvestUntil || 0) > c) rows.push([`满仓大丰收 经验+30%`, Math.ceil(g.harvestUntil - c)]);
  let spirit = 0, dbl = 0, autoN = 0, feed = 0;
  for (const f of g.pets.values()) { if (f.npc) continue; if ((f.spiritUntil || 0) > c) spirit++; if ((f.doubleUntil || 0) > c) dbl++; if (f.auto > 0) autoN++; if ((f.xpUntil || 0) > c) feed++; }
  if (spirit) rows.push([`酷酷墨镜 ×${spirit}只`, null]);
  if (dbl) rows.push([`庆典双倍掉落 ×${dbl}只`, null]);
  if (feed) rows.push([`吃饱饱 经验+50% ×${feed}只`, null]);
  if (autoN) rows.push([`自动守护 ×${autoN}只`, null]);
  if (!rows.length) return;
  const l = 8, t = 102, w = 220, h = 30 + rows.length * 22;
  panel(x, l, t, w, h, 0.86);
  text(x, '礼物效果', l + 12, t + 21, 14, C.pink);
  rows.forEach(([s, sec], i) => { text(x, s, l + 12, t + 44 + i * 22, 13, C.ink, 'left', 'normal'); if (sec != null) text(x, `${sec}秒`, l + w - 10, t + 44 + i * 22, 13, C.mute, 'right'); });
}
function meritBoard(r, x) {
  const g = r.game;
  if (g.phase !== 'battle') return;
  const list = g.humans().filter(f => f.merit > 0).sort((a, b) => b.merit - a.merit).slice(0, 5);
  if (!list.length) return;
  const l = W - 208, t = 102, w = 200, h = 30 + list.length * 28;
  panel(x, l, t, w, h, 0.86);
  text(x, '本关贡献', l + 12, t + 21, 14, C.pink);
  list.forEach((f, i) => {
    const y = t + 44 + i * 28;
    avatarCircle(r, x, f.avatar, l + 22, y - 5, 11, SPECIES[f.sp].color, f.name);
    text(x, clipText(x, f.nick || f.name, 100), l + 40, y, 13, C.ink, 'left', 'bold');
    text(x, String(Math.floor(f.merit)), l + w - 10, y, 13, '#e08a2a', 'right');
  });
}

// ───────── 底部两块面板 ─────────
const carousel = { page: 0 };
function bottomPanels(r, x) {
  const g = r.game, t0 = BOTTOM_Y + 6, h = H - t0 - 8;
  if (g.phase === 'home') return homePanels(r, x, t0, h);
  // 左：萌宠战力榜
  const l1 = 8, w1 = 348;
  panel(x, l1, t0, w1, h, 0.9);
  pill(x, '萌宠战力榜', l1 + 66, t0 + 20, C.pink, '#fff', 14);
  text(x, '发「排行」看自己第几', l1 + w1 - 12, t0 + 25, 11, C.mute, 'right', 'normal');
  const R = g.ranks?.list || [];
  r.rankRows = [];
  if (g.settings.rankPage === false) { text(x, '（已在设置里关闭）', l1 + w1 / 2, t0 + 120, 14, C.mute, 'center', 'normal'); }
  else R.slice(0, 8).forEach((p, i) => {
    const y = t0 + 52 + i * 27;
    if (i < 3) { x.fillStyle = ['#ffd24a', '#cfd6e6', '#f0b07a'][i]; x.beginPath(); x.arc(l1 + 18, y - 5, 10, 0, TAU); x.fill(); }
    text(x, String(i + 1), l1 + 18, y, 12, i < 3 ? '#6a4a20' : C.mute, 'center');
    avatarCircle(r, x, p.avatar, l1 + 44, y - 5, 11, SPECIES[p.sp]?.color, p.name);
    if (p.online) { x.fillStyle = '#3fcf7a'; x.beginPath(); x.arc(l1 + 53, y + 3, 4, 0, TAU); x.fill(); }
    text(x, clipText(x, p.name, 92), l1 + 62, y, 13, C.ink, 'left', 'bold');
    petIcon(r, x, p.sp, FORMS.findLastIndex(fm => p.level >= fm.lv), l1 + 176, y - 6, 24, p.shiny);
    x.font = `bold 12px ${FONT}`;
    text(x, clipText(x, `${p.nick || SPECIES[p.sp]?.name} Lv${p.level}`, 82), l1 + 192, y, 12, C.ink, 'left', 'normal');
    if ((p.talent || 0) > 0 || (p.star || 0) > 0) partsText(x, talentParts(p).slice(0, 1).map(q => ({ ...q, text: q.text.replace(/\d+★$/, '') })), l1 + 280, y, 12);   // 榜上地方小：星数不写，没觉醒过的不写
    text(x, String(p.cp), l1 + w1 - 10, y, 12, '#e08a2a', 'right');
    r.rankRows.push({ uid: p.uid, online: p.online, l: l1, t: y - 18, w: w1, h: 26 });
  });
  if (!R.length && g.settings.rankPage !== false) text(x, '还没有人上榜，发「狗」「猫」领养一只吧', l1 + w1 / 2, t0 + 120, 13, C.mute, 'center', 'normal');
  // 右：玩法轮播（弹出萌宠卡时让给萌宠卡）
  const l2 = 364, w2 = 348;
  if (r.cards.length) return;
  panel(x, l2, t0, w2, h, 0.9);
  const pages = PAGES.filter(p => g.settings.giftPages !== false || p.id !== 'gift');
  carousel.page = Math.max(0, Math.floor(r.t / 9)) % pages.length;
  const pg = pages[carousel.page % pages.length];
  pill(x, pg.title, l2 + 60, t0 + 20, '#7cc6ff', '#fff', 14);
  pages.forEach((p, i) => { x.fillStyle = i === carousel.page % pages.length ? C.pink : '#f2d6df'; x.beginPath(); x.arc(l2 + w2 - 16 - (pages.length - 1 - i) * 12, t0 + 20, 4, 0, TAU); x.fill(); });
  pg.draw(r, x, l2, t0 + 40, w2, h - 44);
}
// ───────── 在家：农场榜 + 种田轮播 ─────────
function farmRanks(r) {
  const g = r.game;
  if (r.farmRank && r.t - r.farmRank.t < 5) return r.farmRank.list;
  const list = [], seen = new Set();
  for (const f of g.humans()) { if (f.merc) continue; const fm = farmOf(g, f); if (!fm) continue; seen.add(f.uid); list.push({ uid: f.uid, name: f.name, avatar: f.avatar, sp: f.sp, lv: fm.lv, coins: fm.coins, sold: fm.sold, online: true }); }
  for (const p of Object.values(g.save?.data?.players || {})) if (p.farm && !seen.has(p.uid) && !String(p.uid).startsWith('test:') && (p.farm.lv > 1 || p.farm.sold > 0)) list.push({ uid: p.uid, name: p.name, avatar: p.avatar, sp: p.cur || 'shiba', lv: p.farm.lv, coins: p.farm.coins, sold: p.farm.sold, online: false });
  list.sort((a, b) => b.lv - a.lv || b.sold - a.sold);
  r.farmRank = { t: r.t, list };
  return list;
}
function homePanels(r, x, t0, h) {
  const g = r.game, l1 = 8, w1 = 348;
  panel(x, l1, t0, w1, h, 0.92);
  pill(x, '农场榜', l1 + 50, t0 + 20, '#8fd36a', '#fff', 14);
  text(x, '发「农场」看自己的菜地', l1 + w1 - 12, t0 + 25, 11, C.mute, 'right', 'normal');
  const R = farmRanks(r);
  R.slice(0, 8).forEach((p, i) => {
    const y = t0 + 52 + i * 27;
    if (i < 3) { x.fillStyle = ['#ffd24a', '#cfd6e6', '#f0b07a'][i]; x.beginPath(); x.arc(l1 + 18, y - 5, 10, 0, TAU); x.fill(); }
    text(x, String(i + 1), l1 + 18, y, 12, i < 3 ? '#6a4a20' : C.mute, 'center');
    avatarCircle(r, x, p.avatar, l1 + 44, y - 5, 11, SPECIES[p.sp]?.color, p.name);
    if (p.online) { x.fillStyle = '#3fcf7a'; x.beginPath(); x.arc(l1 + 53, y + 3, 4, 0, TAU); x.fill(); }
    text(x, clipText(x, p.name, 110), l1 + 62, y, 13, C.ink, 'left', 'bold');
    text(x, `农场Lv${p.lv}`, l1 + 210, y, 12, '#5a9a3a', 'left', 'bold');
    text(x, `${p.coins}金币`, l1 + w1 - 10, y, 12, '#e08a2a', 'right');
  });
  if (!R.length) text(x, '还没有人种田，发「种田」开始吧', l1 + w1 / 2, t0 + 120, 13, C.mute, 'center', 'normal');
  const l2 = 364, w2 = 348;
  if (r.cards.length) return;
  panel(x, l2, t0, w2, h, 0.92);
  const page = Math.max(0, Math.floor(r.t / 8)) % HOME_PAGES.length, pg = HOME_PAGES[page];
  pill(x, pg.title, l2 + 60, t0 + 20, '#8fd36a', '#fff', 14);
  HOME_PAGES.forEach((p, i) => { x.fillStyle = i === page ? '#8fd36a' : '#e2efd6'; x.beginPath(); x.arc(l2 + w2 - 16 - (HOME_PAGES.length - 1 - i) * 12, t0 + 20, 4, 0, TAU); x.fill(); });
  pg.draw(r, x, l2, t0 + 40, w2, h - 44);
}
const HOME_PAGES = [
  { title: '种田口令', draw(r, x, l, t) {
    const rows = [['种田', '一键：收→卖→种→浇'], ['种 萝卜', '种指定的菜（不说就种最好的）'], ['浇水', '快40%，顺手给好朋友也浇'], ['收', '熟了的收进仓库'], ['卖', '仓库全卖掉换金币'], ['扩地', '加一块地（最多6块）'], ['解锁 小羊', '用金币解锁高级萌宠'], ['农场', '看自己的菜地和金币']];
    rows.forEach(([a, b], i) => { const y = t + 18 + i * 26; pill(x, a, l + 66, y - 5, '#eef8e6', '#4a8a2a', 12); text(x, b, l + 132, y, 13, C.ink, 'left', 'normal'); });
  } },
  { title: '作物', draw(r, x, l, t, w) {
    const g = r.game;
    CROPS.forEach((c, i) => {
      const col = i % 2, row = Math.floor(i / 2), cx = l + 14 + col * 170, y = t + 20 + row * 38;
      if (!r.icon(x, 'produce:' + c.id, cx + 14, y - 5, 28)) { x.fillStyle = '#8fd36a'; x.beginPath(); x.arc(cx + 14, y - 5, 10, 0, TAU); x.fill(); }
      const mm = marketMul(g, c.id);
      text(x, c.name, cx + 32, y - 6, 13, C.ink, 'left', 'bold');
      text(x, `Lv${c.lv} · ${fmtSec(c.grow)}`, cx + 32, y + 9, 10, C.mute, 'left', 'normal');
      text(x, `${Math.round(c.sell * mm)}`, cx + 156, y - 6, 12, mm > 1 ? '#ff5a3d' : mm < 1 ? '#7a8aa0' : '#e08a2a', 'right');
      text(x, `种子${c.seed}`, cx + 156, y + 9, 10, C.mute, 'right', 'normal');
    });
  } },
  { title: '高级萌宠', draw(r, x, l, t, w) {
    ADV_IDS.forEach((sp, i) => {
      const A = ADV_PETS[sp], S = SPECIES[sp], y = t + 26 + i * 48;
      petIcon(r, x, sp, 2, l + 34, y - 6, 42);
      text(x, `${S.name} · ${S.kind}`, l + 64, y - 8, 14, C.ink, 'left', 'bold');
      text(x, clipText(x, S.desc.split('：')[1] || S.desc, 200), l + 64, y + 10, 11, C.mute, 'left', 'normal');
      text(x, `农场Lv${A.lv}`, l + w - 12, y - 8, 12, '#5a9a3a', 'right');
      text(x, `${A.cost}金币`, l + w - 12, y + 10, 12, '#e08a2a', 'right');
    });
  } },
];

const PAGES = [
  { id: 'how', title: '怎么玩', draw(r, x, l, t, w) {
    const rows = [['狗 猫 兔 熊猫…', '领养萌宠（发物种名）'], ['许愿 考研上岸', '把心愿挂上心愿树'], ['贴贴', '抱别人家萌宠，交朋友'], ['摸摸 · 起名 小黄', '撸一下 · 给萌宠起名'], ['大招 · 闪', '放大招 · 冲出去躲弹幕'], ['1 / 2 / 3', '躲到安全那块（躲雨）'], ['点赞', '全屏大招时撑起护罩'], ['抱抱', '首领哭了，大家安慰它']];
    rows.forEach(([a, b], i) => { const y = t + 18 + i * 26; pill(x, a, l + 76, y - 5, '#fff0f5', C.pink, 12); text(x, b, l + 150, y, 13, C.ink, 'left', 'normal'); });
  } },
  { id: 'wish', title: '心愿树', draw(r, x, l, t, w) {
    const g = r.game, S = wishStore(g), on = [];
    for (let i = 0; i < TREE.fruits; i++) if (S.slots[i]) on.push(S.slots[i]);
    const total = g.save ? g.save.data.wishTotal || 0 : g.memWishTotal || 0;
    if (!on.length) {
      text(x, '发「许愿 + 你的心愿」', l + w / 2, t + 50, 18, C.pink, 'center');
      text(x, '把心愿挂上心愿树，比如「许愿 考试顺利」', l + w / 2, t + 80, 13, C.ink, 'center', 'normal');
      text(x, '守住它，打完首领就会变成灯笼飞上天', l + w / 2, t + 106, 13, C.ink, 'center', 'normal');
      text(x, '偷果鼠会偷心愿，抢回来能交到朋友', l + w / 2, t + 132, 13, C.mute, 'center', 'normal');
    } else on.slice(0, 7).forEach((wv, i) => {
      const y = t + 18 + i * 25;
      x.fillStyle = '#ff7fae'; heart(x, l + 20, y - 5, 5); x.fill();
      text(x, clipText(x, wv.name, 96), l + 32, y, 12, C.mute, 'left', 'normal');
      text(x, g.settings.wishShow !== false ? clipText(x, wv.text, 190) : '（悄悄的心愿）', l + 134, y, 13, C.ink, 'left', 'bold');
    });
    text(x, `树上 ${on.length}/${TREE.fruits} · 排队 ${S.queue.length} · 已经成真 ${total} 个`, l + w / 2, t + 196, 12, C.mute, 'center', 'normal');
  } },
  { id: 'friends', title: '好朋友', draw(r, x, l, t, w) {
    const g = r.game, seen = new Set(), pairs = [];
    for (const f of g.humans()) {
      if (f.merc) continue;
      const bf = bestFriend(g, f, true);
      if (!bf || bf.lv < 1) continue;
      const key = [f.uid, bf.uid].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key); pairs.push({ a: f, b: g.pets.get(bf.uid), lv: bf.lv, v: bf.v });
    }
    pairs.sort((p, q) => q.v - p.v);
    if (!pairs.length) {
      text(x, '发「贴贴」', l + w / 2, t + 46, 18, C.pink, 'center');
      text(x, '你的萌宠会跑去抱抱别人家的萌宠', l + w / 2, t + 76, 13, C.ink, 'center', 'normal');
      text(x, `贴贴${FRIEND.steps[0]}次成为好朋友，友情一直记着`, l + w / 2, t + 102, 13, C.ink, 'center', 'normal');
      text(x, '好朋友同时在场，会一起放「友情合体技」', l + w / 2, t + 128, 13, C.ink, 'center', 'normal');
      text(x, FRIEND.names.join(' → '), l + w / 2, t + 160, 12, C.mute, 'center', 'normal');
      return;
    }
    pairs.slice(0, 6).forEach((p, i) => {
      const y = t + 20 + i * 30;
      petIcon(r, x, p.a.sp, p.a.form ?? 0, l + 22, y - 6, 24, p.a.shiny);
      text(x, clipText(x, p.a.name, 88), l + 38, y, 12, C.ink);
      x.fillStyle = '#ff7fae'; heart(x, l + 142, y - 5, 6); x.fill();
      petIcon(r, x, p.b.sp, p.b.form ?? 0, l + 166, y - 6, 24, p.b.shiny);
      text(x, clipText(x, p.b.name, 80), l + 182, y, 12, C.ink);
      text(x, FRIEND.names[p.lv - 1], l + w - 12, y, 12, p.lv >= 3 ? '#e08a2a' : C.pink, 'right');
    });
  } },
  { id: 'pets', title: '八种萌宠', draw(r, x, l, t, w) {
    SPECIES_IDS.forEach((sp, i) => {
      const col = i % 4, row = Math.floor(i / 4), cx = l + 44 + col * 84, cy = t + 42 + row * 104;
      petIcon(r, x, sp, 2, cx, cy, 58);
      text(x, SPECIES[sp].name, cx, cy + 46, 13, C.ink, 'center');
      text(x, `${SPECIES[sp].words[0]}·${ROLE_NAMES[SPECIES[sp].role]}`, cx, cy + 63, 11, C.mute, 'center', 'normal');
    });
  } },
  { id: 'gift', title: '礼物', draw(r, x, l, t, w) {
    const rows = [['小心心', '投喂零食：经验+50%、亲密+2'], ['鲜花', '种花回血 + 叫来小伙伴、放大招'], ['加油鸭', '天赋觉醒：洗天赋，最高「闪光」'], ['爱你哟', '爱心派对：全队攻击+30%、爱心雨'], ['墨镜', '酷酷墨镜：戴墨镜、攻击+30%'], ['礼花筒', '庆典：装备掉落×2 十分钟'], ['跑车', '梦幻甜品车：全场吃甜点、梦幻装扮'], ['任意礼物', '自动守护：每1抖币12秒']];
    rows.forEach(([a, b], i) => { const y = t + 18 + i * 26; text(x, a, l + 14, y, 13, C.pink); text(x, b, l + 86, y, 13, C.ink, 'left', 'normal'); });
  } },
  { id: 'grow', title: '养成', draw(r, x, l, t, w) {
    text(x, `长大：幼崽 → Lv${FORMS[1].lv} 少年 → Lv${FORMS[2].lv} 成年`, l + 14, t + 18, 13, C.ink, 'left', 'normal');
    text(x, '天赋（加油鸭觉醒，取最好）：', l + 14, t + 46, 13, C.ink, 'left', 'normal');
    TALENT.tiers.filter(tt => tt.w > 0).forEach((tt, i) => { const px = l + 14 + (i % 3) * 108; text(x, `${tt.name}×${tt.mul} ${tt.w}%`, px, t + 70 + Math.floor(i / 3) * 22, 13, tt.flow ? flowFill(x, px, 90) : tt.color); });
    text(x, `最高「闪光」带闪光特效，${TALENT.pity}次保底 · 再出闪光还能升星`, l + 14, t + 128, 12, C.mute, 'left', 'normal');
    text(x, '亲密度：摸摸、投喂涨，每一级全属性+2%', l + 14, t + 154, 13, C.ink, 'left', 'normal');
    text(x, '小精灵：净化坏心情有机会收服，图鉴每种+1%', l + 14, t + 180, 13, C.ink, 'left', 'normal');
  } },
  { id: 'gear', title: '装扮', draw(r, x, l, t, w) {
    GEAR.tiers.forEach((tt, i) => {
      const cx = l + 34 + i * 54, cy = t + 36;
      x.fillStyle = '#fff'; rr(x, cx - 22, cy - 22, 44, 44, 10); x.fill(); x.strokeStyle = tt.color === '#e8edf5' ? '#cfcfdc' : tt.color; x.lineWidth = 3; x.stroke();
      if (!r.icon(x, `gear:hat:${i}`, cx, cy, 36)) { x.fillStyle = tt.color; star(x, cx, cy, 12); x.fill(); }
      text(x, tt.name, cx, cy + 40, 12, tt.color === '#e8edf5' ? '#8a8a9a' : tt.color, 'center');
    });
    text(x, '头饰、项圈、围巾、玩具 四件，头饰会戴在头上', l + 14, t + 110, 13, C.ink, 'left', 'normal');
    text(x, '同品质再掉 → 强化+1；低品质 → 碎片', l + 14, t + 136, 13, C.ink, 'left', 'normal');
    text(x, '四件都稀有：技能+30%；都史诗：大招+40%', l + 14, t + 162, 13, C.ink, 'left', 'normal');
  } },
];

function blastPrompt(r, x) {
  const g = r.game, z = g.zones.find(z => z.full);
  if (!z) return;
  const k = Math.min(0.7, z.intercept) / 0.7;
  x.save();
  x.fillStyle = `rgba(60,40,90,${0.18 + 0.12 * Math.sin(r.t * 6)})`; x.fillRect(0, 0, W, H);
  const y = 210;
  panel(x, 140, y - 50, 440, 120, 0.92);
  outlined(x, `「${z.name}」 ${Math.ceil(z.warn)}`, 360, y - 12, 26, '#fff', '#6a3a8a');
  outlined(x, '全场点赞撑护罩！', 360, y + 24, 30, '#ffd84a', '#8a4a00');
  x.fillStyle = '#eee'; rr(x, 180, y + 40, 360, 14, 7); x.fill(); x.fillStyle = C.pink; rr(x, 180, y + 40, 360 * k, 14, 7); x.fill();
  text(x, `已挡住 ${Math.round(z.intercept * 100)}%${z.likes ? ` · 收到 ${z.likes} 个赞` : ''} · 发「撑伞」也行`, 360, y + 66, 13, C.mute, 'center');
  x.restore();
}

// 首领委屈大哭：全场发「抱抱」安慰它
function comfortPrompt(r, x) {
  const g = r.game, s = g.stage;
  if (g.phase !== 'battle' || s?.sub !== 'comfort' || !s.comfort) return;
  const c = s.comfort, e = g.foes.find(q => q.id === c.id), k = Math.min(1, c.have / c.need);
  const y = 160;
  x.save();
  panel(x, 120, y - 56, 480, 136, 0.94);
  outlined(x, `${e?.name || '首领'}委屈地哭了……`, 360, y - 22, 22, '#fff', '#4a6a9a');
  outlined(x, '全场发「抱抱」安慰它！', 360, y + 14, 30, '#ffd84a', '#8a4a00');
  x.fillStyle = '#f3e3ea'; rr(x, 160, y + 30, 400, 18, 9); x.fill();
  const gr = x.createLinearGradient(160, 0, 560, 0); gr.addColorStop(0, '#ffb3d1'); gr.addColorStop(1, '#ff7fae');
  x.fillStyle = gr; rr(x, 160, y + 30, Math.max(18, 400 * k), 18, 9); x.fill();
  for (let i = 0; i < 5; i++) { const px = 160 + 400 * (i + 0.5) / 5; x.fillStyle = k >= (i + 1) / 5 ? '#fff' : 'rgba(255,255,255,.5)'; heart(x, px, y + 39, 5); x.fill(); }
  const left = Math.max(0, COMFORT.secs - c.t), next = COMFORT.grades.find(([sec]) => c.t <= sec);
  text(x, `抱抱 ${c.have}/${c.need} · ${next ? `${Math.ceil(next[0] - c.t)}秒内安慰好评${next[1]}` : `还剩${Math.ceil(left)}秒`} · 点赞也算`, 360, y + 70, 13, C.mute, 'center');
  x.restore();
}
function drawStamp(r, x, dt) {
  const st = r.stamp;
  if (!st) return;
  st.t += dt;
  if (st.t > st.life) { r.stamp = null; return; }
  const k = st.t / st.life, s = k < 0.12 ? 2.4 - k / 0.12 * 1.4 : 1, a = k > 0.85 ? (1 - k) / 0.15 : 1;
  x.save(); x.globalAlpha = a; x.translate(360, 470); x.scale(s, s); x.rotate(-0.08);
  const col = { S: '#ffd84a', A: '#ffb3d1', B: '#a8d8ff' }[st.grade] || '#e0e0f0';
  outlined(x, st.text, 0, 0, 60, col, '#b04a7a', 'center', ROUND_FONT, 10);
  x.restore();
}

// ───────── 横幅 / 提示 ─────────
const TIER_BG = ['#7fdcb0', '#7fdcb0', '#7cc6ff', '#ff8fb8', '#b48cff', '#ffb84a'];
export function drawBanners(r, x, dt) {
  // 横幅挂在首领血条下面、左右两块面板中间（宽280），不压战场中央；放不下折成两行；有大提示时挪到提示下面
  const g = r.game, big = g.zones.some(z => z.full) ? 290 : g.phase === 'battle' && g.stage?.sub === 'comfort' ? 252 : 0;
  let y = big || 102;
  const MAXW = 252;
  for (const b of r.banners) {
    b.t += dt;
    const k = b.t / b.life, a = k < 0.08 ? k / 0.08 : k > 0.85 ? (1 - k) / 0.15 : 1;
    x.save(); x.globalAlpha = Math.max(0, a) * 0.95;
    const size = b.small ? 14 : b.tier >= 4 ? 16 : 15, lh = size + 5;
    x.font = `bold ${size}px ${FONT}`;
    const lines = wrapText(x, b.text, MAXW, 2);
    const w = Math.max(...lines.map(l => x.measureText(l).width)) + 28, h = lines.length * lh + 13;
    const off = k < 0.08 ? (1 - k / 0.08) * -20 : 0;
    x.fillStyle = TIER_BG[Math.min(5, b.tier)]; rr(x, 360 - w / 2, y + off, w, h, Math.min(h / 2, 17)); x.fill();
    x.strokeStyle = '#fff'; x.lineWidth = 2.5; x.stroke();
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.strokeStyle = 'rgba(90,40,60,.5)'; x.lineWidth = 3;
    lines.forEach((l, i) => { const ty = y + off + 7 + lh * (i + 0.5) + 1; x.strokeText(l, 360, ty); x.fillText(l, 360, ty); });
    x.textBaseline = 'alphabetic';
    x.restore();
    y += h + 5;
  }
  r.banners = r.banners.filter(b => b.t < b.life);
}
function wrapText(x, s, maxW, maxLines) {
  const lines = []; let cur = '';
  for (const ch of String(s || '')) {
    if (cur && x.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch === ' ' || ch === '　' ? '' : ch; }
    else cur += ch;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = clipText(x, lines[maxLines - 1] + '……', maxW); }
  return lines.length ? lines : [''];
}
export function drawToasts(r, x, dt) {
  let y = BOTTOM_Y - 14;
  const list = r.toasts.slice(-4).reverse();
  for (const t of list) {
    t.t += dt;
    const k = t.t / t.life, a = k > 0.85 ? (1 - k) / 0.15 : 1;
    x.save(); x.globalAlpha = Math.max(0, a); x.font = `13px ${FONT}`;
    const s = clipText(x, t.text, 660), w = x.measureText(s).width + 24;
    x.fillStyle = 'rgba(90,58,70,0.72)'; rr(x, 360 - w / 2, y - 22, w, 24, 12); x.fill();
    x.fillStyle = '#fff'; x.textAlign = 'center'; x.fillText(s, 360, y - 5);
    x.restore();
    y -= 30;
  }
  for (const t of r.toasts) if (!list.includes(t)) t.t += dt;
  r.toasts = r.toasts.filter(t => t.t < t.life);
}

// ───────── 开场 / 过关 / 结算 ─────────
function lobby(r, x) {
  const g = r.game, n = g.stageN, ch = chapterOf(n);
  x.save();
  x.fillStyle = 'rgba(255,240,246,0.35)'; x.fillRect(0, 66, W, BOTTOM_Y - 66);
  const t = 300;
  panel(x, 70, t, 580, 420, 0.94);
  if (!r.icon(x, 'logo', 360, t + 70, 300)) { outlined(x, '萌宠保卫战', 360, t + 78, 52, '#ff8fb8', '#fff', 'center', ROUND_FONT, 10); }
  text(x, '守护心愿树，把坏心情都净化掉', 360, t + 132, 16, C.mute, 'center', 'normal');
  pill(x, `${stageTitle(n)} · ${stageLabel(n)}  ${Math.ceil(g.phaseT)} 秒后开始`, 360, t + 170, '#7cc6ff', '#fff', 16);
  if (g.lobbyReason === 'fail') text(x, '心愿果被偷光了…大家休息一下，从本章第一关重新守', 360, t + 198, 14, '#ff6b81', 'center');
  else if (g.lobbyReason === 'home') text(x, '在家休息好啦，出发去下一章！菜地里的菜会接着长', 360, t + 202, 14, '#5a9a3a', 'center');
  else text(x, '发「许愿 + 你的心愿」，把心愿挂上心愿树', 360, t + 202, 14, '#c0578a', 'center');
  text(x, '发弹幕领养一只萌宠：', 360, t + 236, 15, C.ink, 'center');
  SPECIES_IDS.forEach((sp, i) => {
    const col = i % 4, row = Math.floor(i / 4), cx = 160 + col * 133, cy = t + 280 + row * 84;
    petIcon(r, x, sp, 0, cx, cy, 48);
    pill(x, SPECIES[sp].words.find(w => w.length <= 2) || SPECIES[sp].words[0], cx, cy + 36, '#fff0f5', C.pink, 14);
  });
  x.restore();
}
function clearStamp(r, x) {
  const g = r.game, k = 1 - g.phaseT / 2.8;
  const s = k < 0.15 ? 2.2 - k / 0.15 * 1.2 : 1;
  x.save(); x.translate(360, 520); x.scale(s, s); x.rotate(-0.08);
  outlined(x, '守住啦！', 0, 0, 64, '#ffd84a', '#c0571d', 'center', ROUND_FONT, 10);
  x.restore();
}
function result(r, x, dt) {
  const g = r.game, R = g.result;
  r.resultT = (r.resultT || 0) + dt;
  x.save();
  x.fillStyle = 'rgba(70,40,60,0.35)'; x.fillRect(0, 66, W, BOTTOM_Y - 66);
  const l = 40, t = 150, w = 640, hh = 820;
  panel(x, l, t, w, hh, 0.96);
  const title = R.clear ? (R.kind === 'boss' ? `${R.bossName}被抱抱治愈啦！` : '精英关守住啦！') : (R.reason === 'tree' ? '心愿果被偷光了…' : '天亮了，没守完…');
  if (R.grade) { const gc = { S: '#ffb020', A: '#ff7fae', B: '#7cc6ff', C: '#a8a8b8' }[R.grade] || C.pink; x.save(); x.translate(l + w - 62, t + 58); x.rotate(0.12); x.fillStyle = gc; x.beginPath(); x.arc(0, 0, 38, 0, TAU); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 4; x.stroke(); outlined(x, R.grade, 0, 16, 46, '#fff', 'rgba(90,40,30,.6)', 'center', ROUND_FONT, 5); text(x, '安慰评价', 0, -24, 10, '#fff', 'center'); x.restore(); }
  outlined(x, title, 360, t + 56, 36, R.clear ? '#ffd84a' : '#a8c8ff', R.clear ? '#c0571d' : '#4a5a9a', 'center', ROUND_FONT, 8);
  text(x, R.clear ? `${R.title} ${R.label} 过关 · ${R.kind === 'boss' ? `心愿成真 ${R.wishes || 0} 个` : `心愿果还剩 ${R.fruits} 个`} · 下一关 ${R.nextLabel}` : `回到 ${R.nextLabel} 重新守护（等级、装扮都还在）`, 360, t + 88, 15, C.mute, 'center', 'normal');
  let y = t + 116;
  if (g.settings.giftRank !== false && R.gifts?.length) {
    pill(x, '本局送礼', l + 60, y + 6, '#ffb84a', '#fff', 13);
    R.gifts.slice(0, 3).forEach((gf, i) => {
      const yy = y + 34 + i * 26;
      avatarCircle(r, x, gf.avatar, l + 36, yy - 5, 10, SPECIES[gf.sp]?.color, gf.name);
      text(x, clipText(x, gf.name, 120), l + 54, yy, 13, C.ink);
      text(x, gf.gifts.map(([n, c]) => `${n}×${c}`).join(' '), l + 190, yy, 12, C.mute, 'left', 'normal');
      text(x, `${gf.got ? `掉落${gf.got}件 ` : ''}${gf.double ? '双倍 ' : ''}${gf.floor >= 0 ? '保底' + GEAR.tiers[gf.floor].name : ''}`, l + w - 20, yy, 12, '#e08a2a', 'right');
    });
    y += 34 + Math.min(3, R.gifts.length) * 26 + 6;
  }
  pill(x, '守护贡献', l + 60, y + 6, C.pink, '#fff', 13);
  y += 34;
  const drops = new Map(); for (const d of R.drops || []) { if (!drops.has(d.uid)) drops.set(d.uid, []); drops.get(d.uid).push(d); }
  R.players.slice(0, 10).forEach((p, i) => {
    const yy = y + i * 40;
    if (i % 2 === 0) { x.fillStyle = 'rgba(255,214,228,0.3)'; rr(x, l + 14, yy - 22, w - 28, 36, 10); x.fill(); }
    text(x, String(i + 1), l + 30, yy + 2, 15, i < 3 ? '#e08a2a' : C.mute, 'center');
    avatarCircle(r, x, p.avatar, l + 58, yy - 4, 14, SPECIES[p.sp]?.color, p.name);
    petIcon(r, x, p.sp, FORMS.findLastIndex(fm => (p.level || 1) >= fm.lv), l + 92, yy - 5, 30, p.shiny);
    text(x, clipText(x, p.name, 140), l + 112, yy, 14, C.ink);
    text(x, `${p.nick || SPECIES[p.sp]?.name} Lv${p.level}`, l + 112, yy + 14, 11, C.mute, 'left', 'normal');
    if (p.merit != null) text(x, `贡献 ${p.merit}`, l + 300, yy + 2, 13, '#e08a2a');
    const ds = drops.get(p.uid) || [];
    ds.slice(0, 3).forEach((d, j) => {
      const cx = l + 420 + j * 74, tc = GEAR.tiers[d.item.tier].color;
      x.fillStyle = '#fff'; rr(x, cx - 15, yy - 20, 30, 30, 7); x.fill(); x.strokeStyle = tc === '#e8edf5' ? '#cfcfdc' : tc; x.lineWidth = 2.5; x.stroke();
      if (!r.icon(x, `gear:${d.item.slot}:${d.item.tier}`, cx, yy - 5, 24)) { x.fillStyle = tc; star(x, cx, yy - 5, 8); x.fill(); }
      text(x, clipText(x, itemName(d.item), 40), cx + 18, yy, 10, tc === '#e8edf5' ? '#8a8a9a' : tc, 'left', 'normal');
    });
  });
  if (!R.players.length) text(x, '这一关没有观众上场', 360, y + 30, 15, C.mute, 'center', 'normal');
  text(x, `${Math.ceil(g.phaseT)} 秒后${R.clear ? '下一关' : '重新开始'}`, 360, t + hh - 20, 14, C.mute, 'center', 'normal');
  x.restore();
}

// ───────── 萌宠卡（我的 / 装备） ─────────
function drawCards(r, x, dt) {
  const g = r.game;
  // 萌宠卡显示在右下角面板里（盖住玩法轮播几秒），不挡战场
  const c = r.cards[r.cards.length - 1];
  for (const k of r.cards) k.t += dt;
  r.cards = r.cards.filter(k => k.t < k.life);
  if (!c) return;
  const f = g.pets.get(c.uid) || g.reserve.get(c.uid);
  if (!f) { c.t = c.life; return; }
  if (c.farm) return drawFarmCard(r, x, c, f);
  const k = c.t / c.life, a = k < 0.05 ? k / 0.05 : k > 0.92 ? (1 - k) / 0.08 : 1;
  x.save(); x.globalAlpha = a;
  const l = 364, t = BOTTOM_Y + 6, w = 348, h = H - t - 8;
  panel(x, l, t, w, h, 0.98);
  const form = FORMS.findLastIndex(fm => (f.level || 1) >= fm.lv);
  x.fillStyle = '#fff0f5'; rr(x, l + 10, t + 10, 120, 150, 12); x.fill();
  const tal = f.star > 0 ? TALENT.tiers.length - 1 : f.talent || 0;
  if (tal >= 3) { x.save(); x.globalAlpha *= 0.45; x.fillStyle = TALENT.tiers[tal].color; x.beginPath(); x.arc(l + 70, t + 92, 52, 0, TAU); x.fill(); x.restore(); }
  const pa = r.assets.get(`pet:${f.sp}:${form}`);
  const slv = f.shiny ? Math.max(1, starOf(f)) : 0;
  if (slv) shinyIconBack(r, x, l + 70, t + 98, 110, slv);
  if (pa) { const s = Math.min(112 / pa.h, 110 / pa.w); x.drawImage(pa.img, l + 70 - pa.w * s / 2, t + 152 - pa.h * s, pa.w * s, pa.h * s); if (slv) shinyIconFront(r, x, l + 70, t + 98, 110, slv); }
  else petIcon(r, x, f.sp, form, l + 70, t + 95, 90);
  if (f.gear?.hat) r.icon(x, `gear:hat:${f.gear.hat.tier}`, l + 70, t + 40, 40);
  if (f.shiny) pill(x, slv > 1 ? `✦闪光${slv}★✦` : '✦闪光✦', l + 70, t + 22, flowFill(x, l + 30, 80), '#5a2a50', 11);
  const rx = l + 140;
  text(x, clipText(x, f.nick || SPECIES[f.sp].name, 130), rx, t + 30, 20, C.ink);
  text(x, clipText(x, `${f.name}的${SPECIES[f.sp].kind}·${FORMS[form].name}`, 196), rx, t + 50, 12, C.mute, 'left', 'normal');
  const need = LEVEL.need(f.level || 1);
  const xpNow = f.test || !g.save ? (f.mem?.[f.sp]?.xp || 0) : (g.save.peek(f.uid)?.pets?.[f.sp]?.xp || 0);
  text(x, `Lv${f.level || 1}`, rx, t + 76, 16, '#e08a2a');
  x.fillStyle = '#f6e2ea'; rr(x, rx + 50, t + 67, 140, 9, 5); x.fill(); x.fillStyle = '#ffb84a'; rr(x, rx + 50, t + 67, 140 * Math.min(1, xpNow / need), 9, 5); x.fill();
  const nf = FORMS.find(fm => fm.lv > (f.level || 1));
  if (nf) text(x, `Lv${nf.lv}长成${nf.name}`, rx + 190, t + 92, 10, C.mute, 'right', 'normal');
  text(x, '天赋', rx, t + 112, 13, C.mute, 'left', 'normal'); partsText(x, talentParts(f), rx + 34, t + 112, 14);
  text(x, `×${talentMul(f)}`, rx + 196, t + 112, 12, C.mute, 'right', 'normal');
  const bl = bondLevel(f.bond), nb = bondNext(f.bond);
  text(x, '亲密', rx, t + 136, 13, C.mute, 'left', 'normal');
  for (let j = 0; j < 10; j++) { x.fillStyle = j < bl ? '#ff7fae' : '#f3d6e0'; heart(x, rx + 42 + j * 15, t + 131, 5.5); x.fill(); }
  text(x, `战力 ${combatPower(f)}`, rx, t + 160, 15, '#e08a2a');
  text(x, nb ? `亲密 ${f.bond}/${nb}` : `亲密 ${f.bond}`, rx + 196, t + 160, 11, C.mute, 'right', 'normal');
  SLOT_IDS.forEach((sl, j) => {
    const it = f.gear?.[sl], cx = l + 46 + j * 86, cy = t + 204;
    const tc = it ? GEAR.tiers[it.tier].color : '#e6dce0';
    x.fillStyle = '#fff'; rr(x, cx - 24, cy - 24, 48, 48, 11); x.fill(); x.strokeStyle = tc === '#e8edf5' ? '#cfcfdc' : tc; x.lineWidth = 3; x.stroke();
    if (it && !r.icon(x, `gear:${sl}:${it.tier}`, cx, cy, 38)) { x.fillStyle = tc; star(x, cx, cy, 13); x.fill(); }
    if (!it) text(x, GEAR.slots[sl].name, cx, cy + 5, 12, '#c9b8be', 'center', 'normal');
    text(x, it ? clipText(x, itemName(it), 82) : '空', cx, cy + 40, 11, it ? (tc === '#e8edf5' ? '#8a8a9a' : tc) : '#c9b8be', 'center');
  });
  { const bf = bestFriend(g, f), fk = f.spriteKinds || 0, fl = FOES[f.follow];
    const s1 = bf ? `好朋友 ${clipText(x, bf.name, 70)}·${bf.lv ? FRIEND.names[bf.lv - 1] : '认识'}` : '好朋友：发「贴贴」交朋友';
    const s2 = fl ? `小精灵 ${fl.name}（${fk}/${SPRITE_UNITS.length}）` : `小精灵 ${fk}/${SPRITE_UNITS.length}`;
    text(x, s1, l + 14, t + 175, 11, '#c0578a', 'left', 'bold'); text(x, s2, l + w - 14, t + 175, 11, '#3a8fc0', 'right', 'bold'); }
  const sb = setBonus(f.gear);
  text(x, `套装 技能精进${sb.nSkill}/4${sb.skill ? '✓' : ''} · 大招大成${sb.nUlt}/4${sb.ult ? '✓' : ''}`, l + w / 2, t + h - 8, 11, C.mute, 'center', 'normal');
  x.restore();
}

// 农场卡：金币、等级、每块地、仓库、解锁的高级萌宠
function drawFarmCard(r, x, c, f) {
  const g = r.game, fm = farmOf(g, f);
  if (!fm) { c.t = c.life; return; }
  const k = c.t / c.life, a = k < 0.05 ? k / 0.05 : k > 0.92 ? (1 - k) / 0.08 : 1;
  x.save(); x.globalAlpha = a;
  const l = 364, t = BOTTOM_Y + 6, w = 348, h = H - t - 8, now = g.now();
  panel(x, l, t, w, h, 0.98);
  text(x, clipText(x, `${f.name}的农场`, 200), l + 14, t + 28, 18, C.ink);
  text(x, `Lv${fm.lv}`, l + w - 14, t + 28, 18, '#5a9a3a', 'right');
  const need = levelNeed(fm.lv);
  x.fillStyle = '#e8f2dc'; rr(x, l + 14, t + 38, w - 28, 8, 4); x.fill(); x.fillStyle = '#8fd36a'; rr(x, l + 14, t + 38, (w - 28) * Math.min(1, fm.xp / need), 8, 4); x.fill();
  if (!r.icon(x, 'farm:coin', l + 26, t + 64, 22)) { x.fillStyle = '#ffd23a'; x.beginPath(); x.arc(l + 26, t + 64, 9, 0, TAU); x.fill(); }
  text(x, `${fm.coins} 金币`, l + 42, t + 69, 15, '#e08a2a');
  const pc = plotCost(fm);
  text(x, `${fm.plots.length}块地${pc != null ? ` · 扩地${pc}` : ''}`, l + w - 14, t + 69, 12, C.mute, 'right', 'normal');
  fm.plots.forEach((p, i) => {
    const cx = l + 14 + (i % 3) * 108, cy = t + 92 + Math.floor(i / 3) * 46;
    x.fillStyle = '#f3ead8'; rr(x, cx, cy, 100, 40, 10); x.fill();
    if (!p) { text(x, '空地', cx + 50, cy + 25, 12, '#b8a888', 'center', 'normal'); return; }
    const st = plotStage(p, now), cr = CROP[p.c];
    if (!r.icon(x, st.stage === 2 ? 'produce:' + p.c : `crop:${p.c}:${st.stage}`, cx + 20, cy + 20, 30)) { x.fillStyle = '#8fd36a'; x.beginPath(); x.arc(cx + 20, cy + 20, 9, 0, TAU); x.fill(); }
    text(x, cr.name, cx + 40, cy + 17, 12, C.ink, 'left', 'bold');
    text(x, st.stage === 2 ? '熟了！' : fmtSec(st.left), cx + 40, cy + 33, 11, st.stage === 2 ? '#e08a2a' : C.mute, 'left', 'normal');
  });
  const barn = Object.entries(fm.barn).filter(([, n]) => n > 0);
  text(x, barn.length ? `仓库：${barn.map(([id, n]) => `${CROP[id].name}×${n}`).join(' ')}` : '仓库空空的', l + 14, t + h - 34, 12, C.ink, 'left', 'normal');
  const pets = ADV_IDS.map(sp => `${SPECIES[sp].kind}${petUnlocked(g, f, sp) ? '✓' : `(Lv${ADV_PETS[sp].lv})`}`).join(' ');
  text(x, clipText(x, pets, w - 28), l + 14, t + h - 12, 11, '#c0578a', 'left', 'normal');
  x.restore();
}

// ───────── 天赋觉醒（长大不弹窗，在萌宠身上就地发光，见 render.js）─────────
function drawPopups(r, x, dt) {
  r.popups = r.popups.filter(q => q.kind === 'awaken');
  const p = r.popups[0];
  if (!p) return;
  if (r.popups.length > 1) p.life = Math.min(p.life, 2.4);   // 后面还有人在排队：快一点
  p.t += dt;
  const k = p.t / p.life, a = k < 0.06 ? k / 0.06 : k > 0.88 ? (1 - k) / 0.12 : 1;
  x.save(); x.globalAlpha = Math.max(0, a);
  const cx = 360, cy = 600;
  x.translate(cx, cy); x.scale(0.78, 0.78); x.translate(-cx, -cy);   // 整体缩小一点，少挡战场
  const bg = x.createRadialGradient(cx, cy, 40, cx, cy, 250); bg.addColorStop(0, 'rgba(255,248,252,0.85)'); bg.addColorStop(0.7, 'rgba(255,236,246,0.55)'); bg.addColorStop(1, 'rgba(255,236,246,0)');
  x.fillStyle = bg; x.beginPath(); x.arc(cx, cy, 250, 0, TAU); x.fill();
  const ga = r.assets.get('glow:circle');
  if (ga) { x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha *= 0.8; x.translate(cx, cy + 70); x.rotate(p.t * 0.8); x.scale(1, 0.5); const s2 = 300 / Math.max(ga.w, ga.h); x.drawImage(ga.img, -ga.w * s2 / 2, -ga.h * s2 / 2, ga.w * s2, ga.h * s2); x.restore(); }
  if (p.kind === 'awaken') {
    const T = TALENT.tiers, roll = p.t < 1.6;
    const shown = roll ? 1 + Math.floor(p.t * 14) % (T.length - 1) : p.best;
    const col = T[shown].color;
    x.save(); x.translate(cx, cy); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) { x.rotate(TAU / 12 + dt * 0); x.fillStyle = col; x.globalAlpha = a * 0.18; x.beginPath(); x.moveTo(0, 0); x.lineTo(-18, -230); x.lineTo(18, -230); x.closePath(); x.fill(); }
    x.restore();
    const f = r.game.pets.get(p.uid), form = FORMS.findLastIndex(fm => (p.level || f?.level || 1) >= fm.lv);
    drawAwakenPet(r, x, p, form, cx, cy - 20, 170, roll);
    outlined(x, '天赋觉醒', cx, cy - 140, 30, '#fff', '#b04a7a', 'center', ROUND_FONT, 7);
    outlined(x, `${p.nick || p.name}`, cx, cy - 108, 18, '#fff', 'rgba(90,40,60,.85)');
    { const lab = roll ? T[shown].name : (p.star > 1 ? `${T[T.length - 1].name}${p.star}★` : T[p.to].name), tt = roll ? T[shown] : p.star ? T[T.length - 1] : T[p.to];
      x.font = `900 44px ${ROUND_FONT}`; const lw2 = x.measureText(lab).width;
      outlined(x, lab, cx, cy + 100, 44, tt.flow ? flowFill(x, cx - lw2 / 2, lw2, 0.8) : col, '#4a2a3a', 'center', ROUND_FONT, 8); }
    if (!roll) {
      text(x, p.up ? `全属性 ×${p.mulFrom} → ×${p.mulTo}` : `这次是${T[p.best].name}，没超过现在的，下次一定！`, cx, cy + 136, 16, '#fff', 'center');
      if (p.shinyNew) outlined(x, '✦ 闪光了！✦', cx, cy + 172, 30, flowFill(x, cx - 90, 180, 0.8), '#5a2a50', 'center', ROUND_FONT, 7);
      else if (p.pity > 0) text(x, `离保底闪光还差 ${TALENT.pity - p.pity} 次`, cx, cy + 166, 13, '#fff', 'center', 'normal');
    }
  }
  x.restore();
  if (p.t >= p.life) r.popups.shift();
}

export function hudClick(r, lx, ly) {
  for (const row of r.rankRows || []) if (lx >= row.l && lx <= row.l + row.w && ly >= row.t && ly <= row.t + row.h) { if (row.online) r.consume([{ type: 'card', uid: row.uid, gear: true }]); return true; }
  return false;
}
export { GIFTS, GIFT_TITLES, FOES, chapterDef, BOND };
