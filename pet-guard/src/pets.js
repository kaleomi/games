// 萌宠：领养、属性、站位、普攻、技能、大招、闪、躲雨、打盹、孵化、摸摸
import { W, FIELD, PET, SPECIES, ALL_SPECIES, KIT, SCORE, GIFTS, TREE, FORMS, formOf } from './config.js';
import { petStats } from './gear.js';
import {
  clamp, LANES, foesIn, petsIn, liveFoes, livePets, densest, rollCrit, damageFoe, healPet, score, addProj, aimAt,
  slowE, stunE, burnE, partOf, partHit, inZone, safeParts, ringZone, partPoint, inGround, treeDist, damagePet,
} from './combat.js';
import { stepHug } from './friends.js';
import { comfortSpot } from './wish.js';
import { farmSpot } from './farm.js';

// ───────── 弹幕解析 ─────────
const SP_WORDS = ALL_SPECIES.flatMap(id => SPECIES[id].words.map(w => [w, id])).sort((a, b) => b[0].length - a[0].length);
export function parseSpecies(text) {
  const s = String(text || '').trim().replace(/[!！。~～.]+$/, '').replace(/^(我要|我想养|领养|养|换成|换|选|要|来只|来个|来一只|抱一只|抱)/, '');
  if (!s || s.length > 5) return null;
  for (const [w, id] of SP_WORDS) if (s === w || s === w + '宝' || s === w + '酱') return id;
  return null;
}
const ULT_WORDS = ALL_SPECIES.map(id => SPECIES[id].ult.name);
export function parseSkill(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s || s.length > 12) return null;
  if (/大招|dz|绝招|必杀|放招/.test(s) || ULT_WORDS.some(w => s.includes(w))) return 'ult';
  if (/技能|jn/.test(s)) return 'skill';
  return null;
}

// 没选过的人：补前排、治疗缺口，其余随机
export function pickSpecies(game) {
  const hs = [...game.pets.values()].filter(f => !f.merc);
  const n = hs.length + 1;
  const count = id => hs.filter(f => f.sp === id).length;
  if (hs.filter(f => SPECIES[f.sp].role === 'front').length < Math.ceil(n / 6)) return game.random() < 0.6 ? 'shiba' : 'panda';
  if (count('bunny') < Math.ceil(n / 7)) return 'bunny';
  const pool = ['cat', 'fox', 'hamster', 'penguin', 'sheep'];
  return pool[Math.floor(game.random() * pool.length)];
}

// 中间那一列站在心愿树前面（树冠上方），不站进树里
export function home(f) {
  const y = FIELD.rows[SPECIES[f.sp].role] + f.slotDy, mid = Math.abs(f.homeX - TREE.x) < 60;
  return { x: f.homeX + f.slotDx, y: mid ? Math.min(y, TREE.y - TREE.h - 22 + f.slotDy * 0.5) : y };
}
export function refreshStats(f) {
  const ratio = f.maxHp ? f.hp / f.maxHp : 1;
  f.stats = petStats(f);
  f.maxHp = f.stats.maxHp; f.hp = Math.max(f.alive === false ? 0 : 1, Math.round(f.maxHp * ratio));
  f.form = formOf(f.level || 1); f.h = FORMS[f.form].h * (f.mini ? 0.72 : 1);
}
const HIT_FX = { shiba: 'paw', cat: 'claw', panda: 'paw', bunny: 'heart', fox: 'fire', hamster: 'pop', penguin: 'ice', dragon: 'star', sheep: 'heart', deer: 'leaf', unicorn: 'star', phoenix: 'fire' };
export function setupPet(game, f, { keepCd = true } = {}) {
  f.isPet = true;
  if (f.homeX == null) f.homeX = LANES[Math.floor(game.random() * 3)];
  if (f.slotDx == null) { f.slotDx = (game.random() - 0.5) * 2 * FIELD.wander.x; f.slotDy = (game.random() - 0.5) * 2 * FIELD.wander.y; }
  f.stats = petStats(f); f.hitFx = HIT_FX[f.sp];
  f.maxHp = f.stats.maxHp; f.hp = f.maxHp; f.alive = true; f.napT = 0;
  f.form = formOf(f.level || 1); f.h = FORMS[f.form].h * (f.mini ? 0.72 : 1);
  const h = home(f);
  if (f.x == null || !keepCd) { f.x = h.x; f.y = h.y; }
  f.facing = f.facing || 1;
  f.act = null; f.shieldHp = 0; f.shieldUntil = 0; f.hot = null; f.slowUntil = 0; f.drUntil = 0; f.rOff = null; f.side = 0; f.ringZ = 0; f.dodgeUntil = 0; f.stunUntil = 0; f.sleepUntil = 0;
  if (!keepCd || f.skillCd == null) { f.skillCd = f.npc ? 1 + game.random() * 3 : 1; f.ultCd = f.npc ? 8 + game.random() * 20 : 0; f.atkCd = game.random() * 0.6; }
  f.ultReq = f.ultReq || 0; f.ultReadyFor = 0; f.invuln = 1; f.hitFlash = 0;
  f.wanderT = game.random() * 3; f.wanderX = f.slotDx; f.wanderY = f.slotDy;
  f.anim = 'idle'; f.animT = 0;
}
export function wakePet(game, f, frac = 1) {
  f.alive = true; f.napT = 0; f.hp = Math.max(1, Math.round(f.maxHp * frac)); f.invuln = PET.invulnAfterWake;
  f.act = null; f.stunUntil = 0; f.sleepUntil = 0;
  game.emit('wake', { uid: f.uid, x: f.x, y: f.y });
}

const auto = f => (f.auto || 0) > 0;
function startAct(f, kind, dur, hits, extra = {}) {
  f.act = { kind, t: 0, dur, hits: hits.map(h => ({ ...h, done: false })), ...extra };
  f.anim = kind; f.animT = 0;
}
function stepAct(game, f, dt) {
  const a = f.act;
  a.t += dt;
  if (a.move) a.move(game, f, dt, a);
  for (const h of a.hits) if (!h.done && a.t >= h.at) { h.done = true; if (f.alive) h.fn(game, f, a); }
  if (f.act === a && a.t >= a.dur) { f.act = null; if (a.onEnd) a.onEnd(game, f, a); if (f.alive && !f.act) f.anim = 'idle'; }
}
const skillCdOf = f => SPECIES[f.sp].skill.cd * (1 - (f.stats.haste || 0)) * (f.stats.setSkill ? 0.85 : 1);
const ultCdOf = f => Math.max(15, PET.ultCd * (1 - (f.stats.haste || 0)) - (f.stats.setUlt ? 10 : 0));
const skillMul = f => (f.stats.setSkill ? 1.3 : 1) * (f.stats.power || 1);
const ultMul = f => (f.stats.setUlt ? 1.4 : 1) * (f.stats.power || 1);

// ───────── 每帧 ─────────
export function stepPet(game, f, dt, combat) {
  const c = game.clock;
  f.animT = (f.animT || 0) + dt;
  f.hitFlash = Math.max(0, (f.hitFlash || 0) - dt);
  f.invuln = Math.max(0, (f.invuln || 0) - dt);
  f.happyT = Math.max(0, (f.happyT || 0) - dt);
  if (f.egg) { f.eggT -= dt; if (f.eggT <= 0) { f.egg = false; f.invuln = 1; game.emit('hatch', { uid: f.uid, name: f.name, sp: f.sp, x: f.x, y: f.y, nick: f.nick }); } return; }
  if (!f.alive) { if (combat) { f.napT -= dt; if (f.napT <= 0) wakePet(game, f, 0.6); } return; }
  if (f.shieldUntil && c > f.shieldUntil) { f.shieldHp = 0; f.shieldUntil = 0; }
  f.stats.atk = f.stats.atkBase * ((f.spiritUntil || 0) > c ? 1 + GIFTS.spirit.atk : 1);
  if (f.hot && f.hot.until > c) healPet(game, f, f.maxHp * f.hot.perSec * dt, f.hot.by ? game.pets.get(f.hot.by) : null);
  stepSpirit(game, f, dt, combat);
  if (!combat) {
    if (f.act && f.act.kind !== 'ult') f.act = null;
    if (stepHug(game, f, dt, walkTo)) return;
    const fs = farmSpot(game, f);   // 在家：站到自己那块菜地边上
    if (!f.act) { if (fs) { if (walkTo(game, f, fs, dt, 0.8)) faceTo(game, f, 1, 0); } else walkTo(game, f, game.phase === 'home' ? homeYard(game, f, dt) : homeWander(game, f, dt), dt, 0.6); } else stepAct(game, f, dt);
    return;
  }
  f.atkCd -= dt; f.skillCd -= dt; f.ultCd -= dt;
  f.dodgeCd = Math.max(0, (f.dodgeCd || 0) - dt);
  // 被瞌睡雾迷倒 / 被砸晕
  if ((f.sleepUntil || 0) > c || (f.stunUntil || 0) > c) { f.act = null; f.anim = (f.sleepUntil || 0) > c ? 'doze' : 'hit'; return; }
  if (auto(f) && f.dodgeCd <= 0 && canDodge(f)) { const th = threat(game, f); if (th) dodge(game, f, th); }
  if (f.auto > 0) { f.auto = Math.max(0, f.auto - dt); if ((f.autoSyncT = (f.autoSyncT || 0) - dt) <= 0 || f.auto === 0) { f.autoSyncT = 5; game.syncAuto(f); } }
  if ((f.aliveAcc = (f.aliveAcc || 0) + dt) >= SCORE.aliveEvery) { f.aliveAcc -= SCORE.aliveEvery; score(game, f, SCORE.alive); }
  if (f.ultCd <= 0) f.ultReadyFor = (f.ultReadyFor || 0) + dt; else f.ultReadyFor = 0;
  if (f.act) { stepAct(game, f, dt); return; }
  // 首领委屈大哭：大家围过去抱抱
  const cs = comfortSpot(game, f);
  if (cs) { if (!stepHug(game, f, dt, walkTo) && walkTo(game, f, cs, dt, 1.1)) faceTo(game, f, cs.face, 0); return; }
  if (stepHug(game, f, dt, walkTo)) return;
  autoRing(game, f, dt);
  const bz = myBand(game, f);
  if (bz) { const q = partPoint(bz, f.ring, f.x, f.y); if (Math.hypot(q.x - f.x, q.y - f.y) > 10) { walkTo(game, f, q, dt, 1.15); return; } }
  const wantUlt = f.npc || f.merc ? npcWantsUlt(game, f) : f.ultReq > c || (auto(f) && (npcWantsUlt(game, f) || f.ultReadyFor > 3));
  if (f.ultCd <= 0 && wantUlt) { if (castUlt(game, f)) { score(game, f, SCORE.ult); return; } }
  if (f.skillCd <= 0) {
    if (castSkill(game, f)) { f.skillCd = skillCdOf(f); if (f.freeSkill) f.freeSkill = false; else score(game, f, SCORE.skill * SPECIES[f.sp].skill.cd / 10); return; }
    f.skillCd = 0.5;
  }
  basicAI(game, f, dt);
}

// ───────── 躲雨（1/2/3） ─────────
function nearestSafe(z, f) {
  let best = -1, bd = Infinity;
  for (const i of safeParts(z)) { const q = partPoint(z, i, f.x, f.y); const d = Math.hypot(q.x - f.x, q.y - f.y); if (d < bd) { bd = d; best = i; } }
  return best;
}
function autoRing(game, f, dt) {
  const z = ringZone(game);
  if (!z || f.ringZ === z.id) return;
  if (!auto(f) && !f.npc && !f.merc) return;
  const cur = partOf(z, f.x, f.y);
  if (!partHit(z, cur)) { f.ring = cur; f.ringZ = z.id; return; }
  f.reactT = (f.reactT || 0) + dt;
  if (!auto(f) && f.reactT < (f.react ??= 1.5 + game.random() * 3.5)) return;
  const safe = nearestSafe(z, f);
  if (safe >= 0) { f.ring = safe; f.ringZ = z.id; }
  f.reactT = 0; f.react = 1.5 + game.random() * 3.5;
}
export function chooseRing(game, f, ring) {
  const z = ringZone(game);
  if (!z || !(ring >= 0 && ring <= 2)) return false;
  f.ring = ring; f.ringZ = z.id;
  if (f.act && f.act.kind === 'atk') f.act = null;
  return true;
}
function myBand(game, f) { const z = ringZone(game); return z && f.ringZ === z.id && Number.isInteger(f.ring) && f.ring >= 0 ? z : null; }

// ───────── 闪：快速冲出去一段 + 无敌，弹幕、近战、躲雨区域都能躲；全屏大招躲不开 ─────────
const canDodge = f => f.alive && !f.egg && !(f.act && (f.act.kind === 'ult' || f.act.kind === 'dodge'));
const norm = (x, y) => { const d = Math.hypot(x, y) || 1; return { x: x / d, y: y / d }; };
function threat(game, f) {
  const hx = f.x, hy = f.y - 30;
  const z = ringZone(game);
  if (z && (z.active || z.warn < 0.55) && inZone(z, f.x, f.y)) {
    const ring = f.ringZ === z.id && !partHit(z, f.ring) ? f.ring : nearestSafe(z, f);
    if (ring >= 0) { const q = partPoint(z, ring, f.x, f.y); f.ring = ring; f.ringZ = z.id; return { dir: norm(q.x - f.x, q.y - f.y), dist: Math.min(PET.dodge.dist * 1.5, Math.hypot(q.x - f.x, q.y - f.y) + 24) }; }
  }
  for (const b of game.projs) {
    if (b.team !== 'e' || b.delay > 0) continue;
    const px = hx - b.x, py = hy - b.y, v2 = b.vx * b.vx + b.vy * b.vy;
    if (v2 < 1) continue;
    const t = (px * b.vx + py * b.vy) / v2;
    if (t < 0 || t > 0.3) continue;
    const cx = px - b.vx * t, cy = py - b.vy * t;
    if (Math.hypot(cx, cy) > b.r + 24) continue;
    const side = b.vx * py - b.vy * px >= 0 ? 1 : -1;
    return { dir: norm(-b.vy * side, b.vx * side), dist: PET.dodge.dist };
  }
  for (const e of game.foes) {
    if (!e.alive || e.purified || !e.act) continue;
    if (e.role === 'minion' && f.hp > f.maxHp * 0.6) continue;
    const reach = e.role === 'boss' ? 160 : e.role === 'elite' ? 130 : 70;
    if (Math.hypot(e.x - f.x, (e.y - f.y) * 1.6) > reach) continue;
    const h = e.act.hits?.find(q => !q.done);
    if (!h || h.at - e.act.t > 0.22 || h.at - e.act.t < 0) continue;
    return { dir: norm(f.x - e.x || (f.facing || 1), (f.y - e.y) * 0.5), dist: PET.dodge.dist };
  }
  return null;
}
export function dodge(game, f, th) {
  const D = PET.dodge;
  if (!canDodge(f) || (f.dodgeCd || 0) > 0) return false;
  let tx = clamp(f.x + th.dir.x * th.dist, 20, W - 20), ty = clamp(f.y + th.dir.y * th.dist * 0.75, FIELD.top, FIELD.bottom);
  const z = myBand(game, f);
  if (z) { const q = partPoint(z, f.ring, tx, ty, f.x, f.y); tx = q.x; ty = q.y; }
  const sx = f.x, sy = f.y;
  f.dodgeCd = auto(f) ? D.autoCd : D.cd;
  f.dodgeUntil = game.clock + D.iframes;
  f.act = null;
  if (Math.abs(tx - sx) > 4) f.facing = tx >= sx ? 1 : -1;
  startAct(f, 'dodge', D.dur, [], { move: (g, h, dt, a) => { const k = 1 - (1 - Math.min(1, a.t / a.dur)) ** 2; h.x = sx + (tx - sx) * k; h.y = sy + (ty - sy) * k; } });
  game.emit('dodge', { uid: f.uid, x: sx, y: sy, x1: tx, y1: ty });
  return true;
}
export function requestDodge(game, f) {
  if (!f.alive || f.egg) return false;
  if ((f.dodgeCd || 0) > 0) { if (game.clock - (f.cdTipAt || 0) > 1.5) { f.cdTipAt = game.clock; game.emit('cd', { uid: f.uid, left: Math.ceil(f.dodgeCd), what: '闪' }); } return false; }
  let th = threat(game, f);
  if (!th) {
    let near = null, nd = Infinity;
    for (const e of game.foes) { if (!e.alive || e.purified) continue; const d = Math.hypot(e.x - f.x, e.y - f.y); if (d < nd) { nd = d; near = e; } }
    th = near ? { dir: norm(f.x - near.x || 1, (f.y - near.y) * 0.5), dist: PET.dodge.dist } : { dir: { x: game.random() < 0.5 ? -1 : 1, y: 0 }, dist: PET.dodge.dist };
  }
  return dodge(game, f, th);
}

// ───────── 走位 ─────────
function homeWander(game, f, dt) {
  if ((f.wanderT -= dt) <= 0) { f.wanderT = 2.5 + game.random() * 3; f.wanderX = (game.random() - 0.5) * 2 * FIELD.wander.x; f.wanderY = (game.random() - 0.5) * 2 * FIELD.wander.y; }
  const ws = FIELD.wander.speed * dt;
  f.slotDx += clamp(f.wanderX - f.slotDx, -ws, ws); f.slotDy += clamp(f.wanderY - f.slotDy, -ws, ws);
  return home(f);
}
// 在家没有菜地的（流浪萌宠、小伙伴）：在院子边上溜达
function homeYard(game, f, dt) {
  if ((f.yardT = (f.yardT || 0) - dt) <= 0) { f.yardT = 3 + game.random() * 4; const side = game.random() < 0.5; f.yard = { x: side ? 30 + game.random() * 60 : W - 30 - game.random() * 60, y: 900 + game.random() * 60 }; }
  return f.yard || { x: f.x, y: f.y };
}
function faceTo(game, f, dir, hold = 0.25) {
  if (dir === f.facing) return;
  if (game.clock - (f.faceT ?? -9) < hold) return;
  f.facing = dir; f.faceT = game.clock;
}
const spdOf = (game, f) => (PET.speed + PET.speedPerLv * Math.min(100, f.level || 1)) * ((f.slowUntil || 0) > game.clock ? 1 - (f.slow || 0) : 1);
function walkTo(game, f, p, dt, speedMul = 1) {
  let tx = clamp(p.x, 18, W - 18), ty = clamp(p.y, FIELD.top, FIELD.bottom);
  const z = myBand(game, f);
  if (z) { const q = partPoint(z, f.ring, tx, ty, f.x, f.y); tx = q.x; ty = q.y; }
  const dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
  if (d < 3) { if (f.anim === 'move') f.anim = 'idle'; return true; }
  const step = Math.min(d, spdOf(game, f) * speedMul * dt);
  f.x += dx / d * step; f.y += dy / d * step;
  if (p.face) faceTo(game, f, p.face, 0.15);
  else if (d > 20 && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 0.4) faceTo(game, f, dx > 0 ? 1 : -1);
  if (f.anim !== 'move' && d > 8) { f.anim = 'move'; f.animT = 0; } else if (d <= 8) f.anim = 'idle';
  return d < 6;
}

// ───────── 普攻 ─────────
// 近战优先：离心愿树最近的（偷果鼠排最前）；橘猫专挑精英首领
function pickTarget(game, f, ranged) {
  const S = SPECIES[f.sp];
  let best = null, bs = Infinity;
  const z = myBand(game, f);
  for (const e of game.foes) {
    if (!e.alive || e.purified || (e.role === 'treasure' && e.escaping) || e.enter > 0) continue;
    const d = Math.hypot(e.x - f.x, (e.y - f.y) * 1.2);
    let s;
    if (ranged) {
      if (d > S.range + e.rad) continue;
      s = d - (e.role === 'boss' ? 40 : 0) - (e.kind === 'thief' ? 160 : 0) + treeDist(e.x, e.y) * 0.15;
    } else {
      if (e.fly && e.role === 'minion' && e.y < FIELD.top) continue;
      if (z) { const q = partPoint(z, f.ring, e.x, e.y); if (Math.hypot(q.x - e.x, q.y - e.y) > 40 + e.rad) continue; }
      if (d > 560 || coming(e)) continue;
      s = d + 70 * (game.engaged.get(e.id) || 0) - (e.tauntBy === f.uid ? 200 : 0) - (e.kind === 'thief' ? 260 : 0) + treeDist(e.x, e.y) * 0.25;
      if (f.sp === 'cat') s -= e.role !== 'minion' ? 160 : 0;
    }
    if (s < bs) { bs = s; best = e; }
  }
  return best;
}
const STAY_KINDS = new Set(['ranged']);
function coming(e) {
  return e.kind !== 'thief' && e.y < FIELD.holdLine && e.t < FIELD.holdMax && (e.role === 'minion' || e.role === 'elite') && !STAY_KINDS.has(e.kind);
}
function hashOf(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
const wingAngle = u => (u < 0.5 ? -0.3 + u * 1.3 : Math.PI - 0.35 + (u - 0.5) * 1.3);
function slotAngle(f) { return f.slotAng ??= wingAngle((hashOf(f.uid) % 997) / 997); }

function basicAI(game, f, dt) {
  const S = SPECIES[f.sp], K = KIT[f.sp];
  const ranged = S.range > 0;
  const tgt = pickTarget(game, f, ranged);
  f.tgtId = tgt ? tgt.id : 0;
  if (ranged) {
    const sp = rangedSpot(game, f, dt), o = f.rOff || { x: 0, y: 0 };
    walkTo(game, f, { x: clamp(sp.x + o.x, 30, W - 30), y: sp.y + o.y }, dt, 0.9);
    const healOnly = !tgt && (f.sp === 'bunny' || f.sp === 'sheep') && f.atkCd <= 0 && lowestAlly(game, f, 0.85, 420);
    if ((tgt || healOnly) && f.atkCd <= 0) startBasic(game, f, tgt);
    else if (tgt && f.anim === 'idle' && Math.abs(tgt.x - f.x) > 6) faceTo(game, f, tgt.x >= f.x ? 1 : -1);
    return;
  }
  if (!tgt) { walkTo(game, f, homeWander(game, f, dt), dt); return; }
  if (f.lastTgt !== tgt.id) { f.lastTgt = tgt.id; f.side = 0; f.spotDy = ((hashOf(f.uid) % 5) - 2) * 5; }
  let spot;
  if (tgt.rad >= 30) {
    const ang = slotAngle(f), off = K.reach * 0.7 + tgt.rad * 0.95;
    spot = { x: clamp(tgt.x + Math.cos(ang) * off, 16, W - 16), y: tgt.y + 4 + Math.sin(ang) * off * 0.42 };
  } else {
    const side = f.side || (f.x <= tgt.x ? -1 : 1), off = K.reach * 0.75 + tgt.rad * 0.6;
    spot = { x: clamp(tgt.x + side * off, 16, W - 16), y: tgt.y + 2 + (f.spotDy || 0) };
  }
  const near = Math.abs(f.x - spot.x) < 16 && Math.abs(f.y - spot.y) < 12;
  if (!near) {
    if (Math.hypot(tgt.x - f.x, tgt.y - f.y) < 170 && Math.abs(tgt.x - f.x) > 6) spot.face = tgt.x >= f.x ? 1 : -1;
    walkTo(game, f, spot, dt, 1.05); return;
  }
  if (Math.abs(tgt.x - f.x) > 6) faceTo(game, f, tgt.x >= f.x ? 1 : -1, 0.15);
  if (f.atkCd <= 0) startBasic(game, f, tgt);
  else f.anim = 'idle';
}
function rangedSpot(game, f, dt) {
  const h = homeWander(game, f, dt), range = SPECIES[f.sp].range;
  let near = null, nd = Infinity;
  for (const e of game.foes) {
    if (!e.alive || e.purified || e.enter > 0 || (e.role === 'treasure' && e.escaping)) continue;
    const d = Math.hypot(e.x - h.x, (e.y - h.y) * 1.2);
    if (d < nd) { nd = d; near = e; }
  }
  const want = range * 0.75;
  if (!near || nd <= want) return h;
  const k = (nd - want) / nd;
  return { x: h.x + (near.x - h.x) * k, y: Math.max(h.y + (near.y - h.y) * k, near.y + 90) };
}
function startBasic(game, f, tgt) {
  const S = SPECIES[f.sp];
  const interval = S.interval / (1 + f.stats.aspd);
  const dur = Math.min(0.42, interval * 0.9);
  f.atkCd = interval;
  if (tgt && Math.abs(tgt.x - f.x) > 4) { const d = tgt.x >= f.x ? 1 : -1; if (d !== f.facing) { f.facing = d; f.faceT = game.clock; } }
  startAct(f, 'atk', dur, [{ at: dur * 0.5, fn: (g, h) => basicHit(g, h, tgt) }], { onEnd: g => reposition(g, f, tgt) });
}
function reposition(game, f, tgt) {
  if (game.random() >= PET.repos) return;
  if (SPECIES[f.sp].range > 0) { f.rOff = { x: (game.random() - 0.5) * 180, y: (game.random() - 0.5) * 80 }; return; }
  if (!tgt || !tgt.alive) return;
  if (tgt.rad >= 30) f.slotAng = wingAngle(game.random());
  else { f.side = f.x <= tgt.x ? 1 : -1; f.spotDy = (game.random() - 0.5) * 36; }
}
function meleeHit(game, f, reach, r, mul, opts = {}) {
  const cx = f.x + f.facing * reach * 0.55, cy = f.y;
  let n = 0;
  for (const e of foesIn(game, cx, cy, r)) {
    const [d, crit] = rollCrit(game, f, f.stats.atk * mul);
    damageFoe(game, e, d, f, { crit, melee: true, knock: opts.knock ? [f.facing * opts.knock, 0] : null });
    if (opts.onHit) opts.onHit(e);
    n++;
  }
  return n;
}
function shoot(game, f, tgt, kind, speed, dmg, o = {}) {
  const sx = f.x + f.facing * 14, sy = f.y - f.h * 0.55;
  const ty = tgt ? tgt.y - tgt.h * 0.5 : sy - 300, tx = tgt ? tgt.x : sx;
  const [vx, vy] = aimAt(sx, sy, tx, ty, speed);
  return addProj(game, { team: 'p', owner: f.uid, kind, x: sx, y: sy, vx, vy, dmg, r: 13, life: 1.4, ...o });
}
function lowestAlly(game, f, below, range) {
  let best = null, bv = below;
  for (const a of game.pets.values()) {
    if (!a.alive || a.egg) continue;
    if (Math.hypot(a.x - f.x, a.y - f.y) > range) continue;
    const v = a.hp / a.maxHp;
    if (v < bv) { bv = v; best = a; }
  }
  return best;
}
function basicHit(game, f, tgt) {
  const K = KIT[f.sp], st = f.stats;
  game.emit('sfx', { name: 'atk', sp: f.sp });
  switch (f.sp) {
    case 'shiba': case 'cat': case 'unicorn': meleeHit(game, f, K.reach, K.r, K.mul); break;
    case 'panda': meleeHit(game, f, K.reach, K.r, K.mul, { knock: K.knock }); break;
    case 'bunny': {
      const ally = lowestAlly(game, f, 0.9, 420);
      if (ally) addProj(game, { team: 'p', owner: f.uid, kind: 'heart', heal: (ally.maxHp * 0.04 + st.atk * 1.4) * K.healMul * 8 * st.heal, fixed: ally, homing: 12, x: f.x, y: f.y - f.h * 0.6, vx: 0, vy: -300, r: 10, life: 2 });
      if (tgt) { const [d, crit] = rollCrit(game, f, st.atk * K.mul); shoot(game, f, tgt, 'heart', K.speed, d, { crit, homing: 4, fixed: tgt }); }
      break;
    }
    case 'fox': {
      const [d, crit] = rollCrit(game, f, st.atk * K.mul);
      shoot(game, f, tgt, 'foxfire', K.speed, d, { crit, pierce: K.pierce, onHit: (g, e) => burnE(e, st.atk * K.burn * st.burn, K.burnSec, g.clock, f.uid) });
      break;
    }
    case 'hamster': { const [d, crit] = rollCrit(game, f, st.atk * K.mul); shoot(game, f, tgt, 'seed', K.speed, d, { crit, r: 9, spin: 14 }); break; }
    case 'penguin': {
      const [d, crit] = rollCrit(game, f, st.atk * K.mul);
      shoot(game, f, tgt, 'snowball', K.speed, d, { crit, onHit: (g, e) => { slowE(e, K.slow, K.slowSec, g.clock); if (g.random() < K.freeze + st.freeze) stunE(e, 1, g.clock, 'freeze'); } });
      break;
    }
    case 'sheep': {   // 羊毛球：先给最累的伙伴补一下，再打坏心情
      const ally = lowestAlly(game, f, 0.9, 420);
      if (ally) addProj(game, { team: 'p', owner: f.uid, kind: 'wool', heal: (ally.maxHp * 0.04 + st.atk * 1.4) * K.healMul * 8 * st.heal, fixed: ally, homing: 12, x: f.x, y: f.y - f.h * 0.6, vx: 0, vy: -300, r: 11, life: 2 });
      if (tgt) { const [d, crit] = rollCrit(game, f, st.atk * K.mul); shoot(game, f, tgt, 'wool', K.speed, d, { crit, homing: 4, fixed: tgt }); }
      break;
    }
    case 'deer': { const [d, crit] = rollCrit(game, f, st.atk * K.mul); shoot(game, f, tgt, 'leaf', K.speed, d, { crit, pierce: K.pierce, spin: 10 }); break; }
    case 'phoenix': {
      const [d, crit] = rollCrit(game, f, st.atk * K.mul);
      shoot(game, f, tgt, 'feather', K.speed, d, { crit, onHit: (g, e) => burnE(e, st.atk * K.burn * st.burn, K.burnSec, g.clock, f.uid) });
      break;
    }
    case 'dragon': {
      const [d, crit] = rollCrit(game, f, st.atk * K.mul);
      shoot(game, f, tgt, 'rainbow', K.speed, d, { crit, onHit: (g, e) => { for (const o of foesIn(g, e.x, e.y, K.splash * st.splash)) if (o !== e) damageFoe(g, o, d * 0.5, f, { fx: false }); g.emit('burst', { kind: 'rainbow', x: e.x, y: e.y - e.h * 0.5, r: K.splash }); } });
      break;
    }
    default: break;
  }
}

// ───────── 墨镜：酷酷光波（跟着萌宠，自动打最近的坏心情） ─────────
function stepSpirit(game, f, dt, combat) {
  if (!combat || !((f.spiritUntil || 0) > game.clock)) return;
  if ((f.spiritCd = (f.spiritCd || 0) - dt) > 0) return;
  f.spiritCd = GIFTS.spirit.cd;
  let near = null, nd = 480;
  for (const e of game.foes) { if (!e.alive || e.purified) continue; const d = Math.hypot(e.x - f.x, e.y - f.y); if (d < nd) { nd = d; near = e; } }
  if (!near) return;
  addProj(game, { team: 'p', owner: f.uid, kind: 'cool', x: f.x, y: f.y - f.h - 6, ...(() => { const [vx, vy] = aimAt(f.x, f.y - f.h - 6, near.x, near.y - near.h * 0.5, 760); return { vx, vy }; })(), dmg: f.stats.atk * GIFTS.spirit.mul, r: 12, life: 1.2, homing: 6, fixed: near });
}

// ───────── 技能（自动） ─────────
function nearestE(game, f, maxD) {
  let best = null, bd = maxD;
  for (const e of game.foes) { if (!e.alive || e.purified || e.enter > 0) continue; const d = Math.hypot(e.x - f.x, e.y - f.y); if (d < bd) { bd = d; best = e; } }
  return best;
}
export function castSkill(game, f) {
  const K = KIT[f.sp], st = f.stats, c = game.clock, sm = skillMul(f), atk = st.atk;
  const emit = (extra = {}) => game.emit('skill', { uid: f.uid, sp: f.sp, name: SPECIES[f.sp].skill.name, x: f.x, y: f.y, ...extra });
  switch (f.sp) {
    case 'shiba': {
      const near = foesIn(game, f.x, f.y, K.skill.r);
      if (!near.length) return false;
      startAct(f, 'skill', 0.55, [{ at: 0.2, fn: g => {
        for (const e of foesIn(g, f.x, f.y, K.skill.r)) { e.tauntBy = f.uid; e.tauntUntil = c + K.skill.taunt; damageFoe(g, e, atk * K.skill.mul * sm, f, { fx: 'paw' }); }
        const s0 = f.shieldHp || 0; f.shieldHp = Math.max(s0, f.maxHp * K.skill.shield * sm); f.shieldBy = f.uid; f.shieldUntil = c + 5;
        emit({ fx: 'roar', r: K.skill.r });
      } }]);
      return true;
    }
    case 'cat': {
      const tgt = pickTarget(game, f, false) || nearestE(game, f, 300);
      if (!tgt) return false;
      const sx = f.x, sy = f.y, dx = tgt.x - sx, dy = tgt.y - sy, d = Math.hypot(dx, dy) || 1, go = Math.min(K.skill.dist, Math.max(0, d - 30));
      const tx = clamp(sx + dx / d * go, 20, W - 20), ty = clamp(sy + dy / d * go, FIELD.top, FIELD.bottom);
      f.facing = dx >= 0 ? 1 : -1;
      const hits = [];
      for (let i = 0; i < K.skill.hits; i++) hits.push({ at: 0.22 + i * 0.13, fn: g => { for (const e of foesIn(g, f.x + f.facing * 26, f.y, K.skill.r)) { const [dd, crit] = rollCrit(g, f, atk * K.skill.mul * sm); damageFoe(g, e, dd, f, { crit, fx: 'claw', melee: true }); } } });
      startAct(f, 'skill', 0.22 + K.skill.hits * 0.13 + 0.1, hits, { move: (g, h, dt, a) => { const k = Math.min(1, a.t / 0.2); h.x = sx + (tx - sx) * k; h.y = sy + (ty - sy) * k; } });
      emit({ fx: 'claws' });
      return true;
    }
    case 'bunny': {
      const hurt = [...game.pets.values()].filter(a => a.alive && !a.egg && a.hp < a.maxHp * 0.92).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, K.skill.n);
      if (!hurt.length) return false;
      startAct(f, 'skill', 0.5, [{ at: 0.25, fn: g => {
        for (const a of hurt) {
          const amt = healPet(g, a, a.maxHp * K.skill.frac * sm * st.heal, f);
          a.hot = { perSec: K.skill.hot * sm * st.heal, until: g.clock + K.skill.hotSec, by: f.uid };
          g.emit('heal', { uid: a.uid, x: a.x, y: a.y, amount: Math.round(amt), carrot: true });
        }
        emit({ fx: 'carrot', targets: hurt.map(a => a.uid) });
      } }]);
      return true;
    }
    case 'panda': {
      const tgt = nearestE(game, f, 320);
      if (!tgt) return false;
      const sx = f.x, sy = f.y, dx = tgt.x - sx, dy = tgt.y - sy, d = Math.hypot(dx, dy) || 1;
      const tx = clamp(sx + dx / d * K.skill.dist, 20, W - 20), ty = clamp(sy + dy / d * K.skill.dist, FIELD.top, FIELD.bottom);
      f.facing = dx >= 0 ? 1 : -1;
      const hitSet = new Set();
      startAct(f, 'roll', 0.6, [], { move: (g, h, dt, a) => {
        const k = Math.min(1, a.t / 0.55); h.x = sx + (tx - sx) * k; h.y = sy + (ty - sy) * k;
        for (const e of foesIn(g, h.x, h.y, K.skill.r)) if (!hitSet.has(e.id)) { hitSet.add(e.id); damageFoe(g, e, atk * K.skill.mul * sm, f, { fx: 'paw', melee: true, knock: [dx / d * 50, dy / d * 30] }); stunE(e, K.skill.stun, g.clock); }
      } });
      emit({ fx: 'roll', x1: tx, y1: ty });
      return true;
    }
    case 'fox': {
      const tgt = pickTarget(game, f, true);
      if (!tgt) return false;
      startAct(f, 'skill', 0.5, [{ at: 0.25, fn: g => {
        const base = Math.atan2(tgt.y - tgt.h * 0.5 - (f.y - f.h * 0.55), tgt.x - f.x);
        for (let i = 0; i < K.skill.n; i++) {
          const a = base + (i - (K.skill.n - 1) / 2) * (K.skill.arc / (K.skill.n - 1));
          addProj(g, { team: 'p', owner: f.uid, kind: 'foxfire', x: f.x, y: f.y - f.h * 0.55, vx: Math.cos(a) * K.speed, vy: Math.sin(a) * K.speed, dmg: atk * K.skill.mul * sm, r: 15, life: 1.3, pierce: 1, big: true,
            onHit: (gg, e) => burnE(e, atk * K.burn * st.burn * 1.5, K.burnSec, gg.clock, f.uid) });
        }
        emit({ fx: 'foxfire' });
      } }]);
      return true;
    }
    case 'hamster': {
      const list = liveFoes(game).filter(e => Math.hypot(e.x - f.x, e.y - f.y) < K.skill.range && !(e.enter > 0));
      if (!list.length) return false;
      const hits = [];
      for (let i = 0; i < K.skill.n; i++) hits.push({ at: 0.1 + i * 0.06, fn: g => {
        const live = list.filter(e => e.alive && !e.purified); const e = live[Math.floor(g.random() * live.length)];
        const a = e ? Math.atan2(e.y - e.h * 0.5 - (f.y - f.h * 0.5), e.x - f.x) + (g.random() - 0.5) * 0.25 : g.random() * Math.PI * 2;
        addProj(g, { team: 'p', owner: f.uid, kind: 'seed', x: f.x, y: f.y - f.h * 0.5, vx: Math.cos(a) * 860, vy: Math.sin(a) * 860, dmg: atk * K.skill.mul * sm, r: 9, life: 0.7, spin: 16 });
      } });
      startAct(f, 'skill', 0.1 + K.skill.n * 0.06 + 0.1, hits);
      emit({ fx: 'seeds' });
      return true;
    }
    case 'penguin': {
      const list = liveFoes(game).filter(e => Math.hypot(e.x - f.x, e.y - f.y) < SPECIES.penguin.range + 40 && !(e.enter > 0)).sort((a, b) => (b.role !== 'minion') - (a.role !== 'minion') || treeDist(a.x, a.y) - treeDist(b.x, b.y)).slice(0, K.skill.n);
      if (!list.length) return false;
      startAct(f, 'skill', 0.55, list.map((e, i) => ({ at: 0.15 + i * 0.12, fn: g => {
        shoot(g, f, e, 'snowball', 640, 0, { big: true, fixed: e, homing: 6, onHit: (gg, t) => {
          for (const o of foesIn(gg, t.x, t.y, K.skill.r)) { damageFoe(gg, o, atk * K.skill.mul * sm, f, { fx: 'ice' }); slowE(o, K.skill.slow, 3, gg.clock); }
          gg.emit('burst', { kind: 'snow', x: t.x, y: t.y - t.h * 0.5, r: K.skill.r });
        } });
      } })));
      emit({ fx: 'snow' });
      return true;
    }
    case 'dragon': {
      const tgt = pickTarget(game, f, true);
      if (!tgt) return false;
      const ang = Math.atan2(tgt.y - f.y, tgt.x - f.x);
      f.facing = Math.cos(ang) >= 0 ? 1 : -1;
      const hits = [];
      for (let i = 0; i < K.skill.n; i++) hits.push({ at: 0.15 + i * K.skill.tick, fn: g => {
        for (const e of liveFoes(g)) {
          const dx = e.x - f.x, dy = e.y - f.y, d = Math.hypot(dx, dy);
          if (d > K.skill.len + e.rad) continue;
          let da = Math.atan2(dy, dx) - ang; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
          if (Math.abs(da) > K.skill.arc) continue;
          damageFoe(g, e, atk * K.skill.mul * sm * st.splash, f, { fx: i % 3 ? false : 'star' });
        }
      } });
      startAct(f, 'skill', 0.15 + K.skill.n * K.skill.tick + 0.05, hits);
      emit({ fx: 'breath', ang, len: K.skill.len, arc: K.skill.arc, dur: K.skill.n * K.skill.tick });
      return true;
    }
    case 'sheep': {   // 棉花云护盾：最累的三只套上护盾、回一点血
      const list = [...game.pets.values()].filter(a => a.alive && !a.egg).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, K.skill.n);
      if (!list.length || list[0].hp >= list[0].maxHp * 0.95 && !liveFoes(game).length) return false;
      startAct(f, 'skill', 0.5, [{ at: 0.25, fn: g => {
        for (const a of list) {
          a.shieldHp = Math.max(a.shieldHp || 0, a.maxHp * K.skill.shield * sm * st.heal); a.shieldUntil = g.clock + 6; a.shieldBy = f.uid;
          const amt = healPet(g, a, a.maxHp * K.skill.frac * sm * st.heal, f);
          g.emit('heal', { uid: a.uid, x: a.x, y: a.y, amount: Math.round(amt), small: amt < 1 });
        }
        emit({ fx: 'wool', targets: list.map(a => a.uid) });
      } }]);
      return true;
    }
    case 'deer': {    // 森林之歌：藤蔓缠住一片坏心情，顺便给身边伙伴回血
      const spot = densest(game, f.x, f.y, K.skill.r);
      if (!spot || Math.hypot(spot.x - f.x, spot.y - f.y) > 520) return false;
      startAct(f, 'skill', 0.55, [{ at: 0.3, fn: g => {
        for (const e of foesIn(g, spot.x, spot.y, K.skill.r)) { damageFoe(g, e, atk * K.skill.mul * sm, f, { fx: 'leaf' }); stunE(e, K.skill.root, g.clock); }
        for (const a of petsIn(g, f.x, f.y, 200)) { const amt = healPet(g, a, a.maxHp * K.skill.heal * sm * st.heal, f); if (amt > 1) g.emit('heal', { uid: a.uid, x: a.x, y: a.y, amount: Math.round(amt), small: true }); }
        g.emit('burst', { kind: 'bamboo', x: spot.x, y: spot.y, r: K.skill.r });
      } }]);
      emit({ fx: 'forest' });
      return true;
    }
    case 'unicorn': { // 彩虹冲锋：朝坏心情一路撞穿
      const tgt = pickTarget(game, f, false) || nearestE(game, f, 340);
      if (!tgt) return false;
      const sx = f.x, sy = f.y, dx = tgt.x - sx, dy = tgt.y - sy, d = Math.hypot(dx, dy) || 1;
      const tx = clamp(sx + dx / d * K.skill.dist, 20, W - 20), ty = clamp(sy + dy / d * K.skill.dist, FIELD.top, FIELD.bottom);
      f.facing = dx >= 0 ? 1 : -1; f.invuln = Math.max(f.invuln || 0, 0.5);
      const hitSet = new Set();
      startAct(f, 'skill', 0.5, [], { move: (g, h, dt, a) => {
        const k = Math.min(1, a.t / 0.42); h.x = sx + (tx - sx) * k; h.y = sy + (ty - sy) * k;
        for (const e of foesIn(g, h.x, h.y, K.skill.r)) if (!hitSet.has(e.id)) { hitSet.add(e.id); const [dd, crit] = rollCrit(g, f, atk * K.skill.mul * sm); damageFoe(g, e, dd, f, { crit, fx: 'star', melee: true, knock: [dx / d * 40, dy / d * 24] }); }
        if (Math.random() < 0.5) g.emit('burst', { kind: 'rainbow', x: h.x, y: h.y - 20, r: 40 });
      } });
      emit({ fx: 'charge', x1: tx, y1: ty });
      return true;
    }
    case 'phoenix': { // 凤羽连射：七根追踪火羽毛
      const tgt = pickTarget(game, f, true);
      if (!tgt) return false;
      startAct(f, 'skill', 0.5, [{ at: 0.25, fn: g => {
        const base = Math.atan2(tgt.y - tgt.h * 0.5 - (f.y - f.h * 0.55), tgt.x - f.x);
        for (let i = 0; i < K.skill.n; i++) {
          const a = base + (i - (K.skill.n - 1) / 2) * (K.skill.arc / (K.skill.n - 1));
          addProj(g, { team: 'p', owner: f.uid, kind: 'feather', x: f.x, y: f.y - f.h * 0.55, vx: Math.cos(a) * K.speed, vy: Math.sin(a) * K.speed, dmg: atk * K.skill.mul * sm, r: 14, life: 1.4, homing: 5, big: true,
            onHit: (gg, e) => burnE(e, atk * K.burn * st.burn * 1.5, K.burnSec, gg.clock, f.uid) });
        }
        emit({ fx: 'feathers' });
      } }]);
      return true;
    }
    default: return false;
  }
}

// ───────── 大招（发「大招」放，冷却45秒；自动守护、NPC 自己放） ─────────
export function requestUlt(game, f) {
  if (!f.alive || f.egg) return false;
  if (f.ultCd > 0) {
    if (f.ultCd <= PET.skillQueue + 1.5) { f.ultReq = game.clock + f.ultCd + 0.5; return true; }
    if (game.clock - (f.cdTipAt || 0) > 1.5) { f.cdTipAt = game.clock; game.emit('cd', { uid: f.uid, left: Math.ceil(f.ultCd), what: '大招' }); }
    return false;
  }
  f.ultReq = game.clock + 2;
  return true;
}
function npcWantsUlt(game, f) {
  const n = liveFoes(game).length, boss = game.boss && game.boss.alive && !game.boss.purified;
  if (f.sp === 'bunny' || f.sp === 'sheep' || f.sp === 'phoenix') return [...game.pets.values()].filter(a => !a.alive || a.hp < a.maxHp * 0.45).length >= 2 || (f.sp === 'phoenix' && (boss || n >= 8));
  return boss || n >= 6;
}
export function castUlt(game, f, { free = false } = {}) {
  if (!f.alive || f.egg) return false;
  const K = KIT[f.sp], st = f.stats, um = ultMul(f), atk = st.atk, c = game.clock;
  const spot = densest(game, f.x, f.y, 160);
  if (!spot && !['bunny', 'shiba', 'sheep', 'phoenix'].includes(f.sp)) return false;
  if (!free) f.ultCd = ultCdOf(f);
  f.ultReq = 0;
  const name = SPECIES[f.sp].ult.name;
  game.emit('ult', { uid: f.uid, name: f.name, nick: f.nick, sp: f.sp, ult: name, x: f.x, y: f.y });
  switch (f.sp) {
    case 'shiba': {
      game.teamDr = K.ult.dr; game.teamDrUntil = c + K.ult.drSec;
      startAct(f, 'ult', 0.9, [{ at: 0.55, fn: g => {
        for (const e of foesIn(g, f.x, f.y, K.ult.r)) { damageFoe(g, e, atk * K.ult.mul * um, f, { fx: 'paw' }); stunE(e, K.ult.stun, g.clock); }
        g.emit('burst', { kind: 'hug', x: f.x, y: f.y, r: K.ult.r });
      } }]);
      return true;
    }
    case 'cat': {
      const targets = [];
      for (let i = 0; i < K.ult.hops; i++) {
        const list = liveFoes(game).filter(e => !(e.enter > 0));
        if (!list.length) break;
        list.sort((a, b) => (b.role !== 'minion') - (a.role !== 'minion') || game.random() - 0.5);
        targets.push(list[i % list.length]);
      }
      if (!targets.length) return false;
      f.invuln = K.ult.hops * 0.3 + 0.6;
      const hits = [], path = [];
      targets.forEach((e, i) => {
        path.push({ x: clamp(e.x - 30, 20, W - 20), y: clamp(e.y + 4, FIELD.top, FIELD.bottom) });
        hits.push({ at: 0.3 * (i + 1), fn: g => { for (const o of foesIn(g, path[i].x + 30, path[i].y, K.ult.r)) { const [dd, crit] = rollCrit(g, f, atk * K.ult.mul * um); damageFoe(g, o, dd, f, { crit, fx: 'claw' }); } g.emit('burst', { kind: 'claw', x: path[i].x + 30, y: path[i].y - 30, r: K.ult.r }); } });
      });
      const last = targets[targets.length - 1];
      hits.push({ at: 0.3 * targets.length + 0.35, fn: g => { if (last.alive) { const [dd] = rollCrit(g, f, atk * K.ult.fin * um); damageFoe(g, last, dd, f, { crit: true, fx: 'claw' }); } g.emit('burst', { kind: 'bigclaw', x: last.x, y: last.y - last.h * 0.5, r: 120 }); } });
      const sx = f.x, sy = f.y;
      startAct(f, 'ult', 0.3 * targets.length + 0.6, hits, { move: (g, h, dt, a) => {
        const i = Math.min(path.length - 1, Math.floor(a.t / 0.3)), k = Math.min(1, (a.t - i * 0.3) / 0.12);
        const from = i ? path[i - 1] : { x: sx, y: sy }, to = path[i];
        h.x = from.x + (to.x - from.x) * k; h.y = from.y + (to.y - from.y) * k - Math.sin(k * Math.PI) * 40; h.facing = to.x >= from.x ? 1 : -1;
      } });
      return true;
    }
    case 'bunny': {
      startAct(f, 'ult', 0.9, [{ at: 0.5, fn: g => {
        for (const a of g.pets.values()) {
          if (a.egg) continue;
          if (!a.alive) wakePet(g, a, K.ult.wake);
          const amt = healPet(g, a, a.maxHp * K.ult.heal * um * st.heal, f);
          a.hot = { perSec: K.ult.hot * st.heal, until: g.clock + K.ult.hotSec, by: f.uid };
          if (amt > 0) g.emit('heal', { uid: a.uid, x: a.x, y: a.y, amount: Math.round(amt) });
        }
        if (spot) for (const e of foesIn(g, spot.x, spot.y, 160)) damageFoe(g, e, atk * K.ult.mul * um, f, { fx: 'heart' });
        g.emit('burst', { kind: 'candyrain', x: 360, y: 640, r: 400 });
      } }]);
      return true;
    }
    case 'panda': {
      const at = { x: clamp((f.x + spot.x) / 2, 100, W - 100), y: clamp((f.y + spot.y) / 2, FIELD.top + 60, FIELD.bottom - 40) };
      startAct(f, 'ult', 0.7, [{ at: 0.4, fn: g => {
        g.areas.push({ kind: 'bamboo', owner: f.uid, x: at.x, y: at.y, r: K.ult.r, t: 0, life: K.ult.sec, tickT: 0, dr: K.ult.dr,
          tick: gg => { for (const e of foesIn(gg, at.x, at.y, K.ult.r)) { damageFoe(gg, e, atk * K.ult.mul * um, f, { fx: false }); slowE(e, K.ult.slow, 0.6, gg.clock); } }, every: K.ult.tick });
        g.emit('burst', { kind: 'bamboo', x: at.x, y: at.y, r: K.ult.r });
      } }]);
      return true;
    }
    case 'fox': {
      startAct(f, 'ult', 0.7, [{ at: 0.35, fn: g => {
        const at = { x: spot.x, y: spot.y };
        g.areas.push({ kind: 'foxfire', owner: f.uid, x: at.x, y: at.y, r: K.ult.r, t: 0, life: K.ult.sec, tickT: 0, every: K.ult.tick,
          tick: gg => { for (const e of foesIn(gg, at.x, at.y, K.ult.r)) { damageFoe(gg, e, atk * K.ult.mul * um * 0.4, f, { fx: false }); burnE(e, atk * K.burn * st.burn * 2, 3, gg.clock, f.uid); } },
          end: gg => { for (const e of foesIn(gg, at.x, at.y, K.ult.r)) damageFoe(gg, e, atk * K.ult.fin * um, f, { fx: 'fire' }); gg.emit('burst', { kind: 'fireburst', x: at.x, y: at.y, r: K.ult.r }); } });
      } }]);
      return true;
    }
    case 'hamster': {
      game.harvestUntil = c + K.ult.xpSec;
      const hits = [];
      for (let i = 0; i < K.ult.n; i++) hits.push({ at: 0.2 + i * 0.04, fn: g => {
        const a = -Math.PI / 2 + (g.random() - 0.5) * 2.4;
        addProj(g, { team: 'p', owner: f.uid, kind: 'seed', big: true, x: f.x, y: f.y - f.h * 0.6, vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, dmg: atk * K.ult.mul * um, r: 11, life: 2.2, homing: 7, spin: 12 });
      } });
      startAct(f, 'ult', 0.2 + K.ult.n * 0.04 + 0.2, hits);
      game.emit('banner', { text: `${f.nick || f.name}的满仓大丰收！全队经验+30% ${K.ult.xpSec}秒`, tier: 2 });
      return true;
    }
    case 'penguin': {
      startAct(f, 'ult', 0.9, [{ at: 0.5, fn: g => {
        for (const e of liveFoes(g)) { if (e.enter > 0) continue; stunE(e, K.ult.freeze, g.clock, 'freeze'); damageFoe(g, e, atk * K.ult.mul * um, f, { fx: 'ice' }); }
        g.emit('burst', { kind: 'freeze', x: 360, y: 620, r: 500 });
      } }]);
      return true;
    }
    case 'dragon': {
      const hits = [];
      for (let i = 0; i < K.ult.n; i++) hits.push({ at: 0.3 + i * K.ult.every, fn: g => {
        const list = liveFoes(g).filter(e => !(e.enter > 0));
        const e = list.length ? list[Math.floor(g.random() * list.length)] : null;
        const tx = e ? e.x + (g.random() - 0.5) * 40 : 120 + g.random() * 480, ty = e ? e.y : FIELD.top + g.random() * 400;
        addProj(g, { team: 'p', owner: f.uid, kind: 'meteor', x: tx - 120, y: ty - 520, vx: 240, vy: 1040, dmg: 0, r: 1, life: 0.5, noHit: true,
          onEnd: gg => { for (const o of foesIn(gg, tx, ty, K.ult.r)) damageFoe(gg, o, atk * K.ult.mul * um * st.splash, f, { fx: 'star' }); gg.emit('burst', { kind: 'candy', x: tx, y: ty, r: K.ult.r }); } });
      } });
      startAct(f, 'ult', 0.3 + K.ult.n * K.ult.every + 0.3, hits);
      return true;
    }
    case 'sheep': {   // 云朵摇篮：全队护盾、叫醒打盹的、回血，身边的坏心情变慢
      startAct(f, 'ult', 0.9, [{ at: 0.5, fn: g => {
        for (const a of g.pets.values()) {
          if (a.egg) continue;
          if (!a.alive) wakePet(g, a, K.ult.wake);
          a.shieldHp = Math.max(a.shieldHp || 0, a.maxHp * K.ult.shield * um * st.heal); a.shieldUntil = g.clock + 8; a.shieldBy = f.uid;
          const amt = healPet(g, a, a.maxHp * K.ult.heal * um * st.heal, f);
          if (amt > 0) g.emit('heal', { uid: a.uid, x: a.x, y: a.y, amount: Math.round(amt) });
        }
        for (const e of foesIn(g, f.x, f.y, K.ult.r)) slowE(e, K.ult.slow, 3, g.clock);
        g.emit('burst', { kind: 'candyrain', x: 360, y: 640, r: 400 });
      } }]);
      return true;
    }
    case 'deer': {    // 生命之树：一大片森林，坏心情走不动还掉血，伙伴在里面回血
      const at = { x: clamp((f.x + spot.x) / 2, 110, W - 110), y: clamp((f.y + spot.y) / 2, FIELD.top + 60, FIELD.bottom - 40) };
      startAct(f, 'ult', 0.7, [{ at: 0.4, fn: g => {
        g.areas.push({ kind: 'bamboo', owner: f.uid, x: at.x, y: at.y, r: K.ult.r, t: 0, life: K.ult.sec, tickT: 0, every: K.ult.tick,
          tick: gg => {
            for (const e of foesIn(gg, at.x, at.y, K.ult.r)) { damageFoe(gg, e, atk * K.ult.mul * um, f, { fx: false }); slowE(e, K.ult.slow, 0.7, gg.clock); }
            for (const a of petsIn(gg, at.x, at.y, K.ult.r)) healPet(gg, a, a.maxHp * K.ult.heal * st.heal, f);
          } });
        g.emit('burst', { kind: 'bamboo', x: at.x, y: at.y, r: K.ult.r });
      } }]);
      return true;
    }
    case 'unicorn': { // 星光陨落：满天星星砸下来，全队攻击提升
      game.partyUntil = Math.max(game.partyUntil || 0, c + K.ult.atkSec);
      const hits = [];
      for (let i = 0; i < K.ult.n; i++) hits.push({ at: 0.3 + i * K.ult.every, fn: g => {
        const list = liveFoes(g).filter(e => !(e.enter > 0));
        const e = list.length ? list[Math.floor(g.random() * list.length)] : null;
        const tx = e ? e.x + (g.random() - 0.5) * 40 : 120 + g.random() * 480, ty = e ? e.y : FIELD.top + g.random() * 400;
        addProj(g, { team: 'p', owner: f.uid, kind: 'meteor', x: tx - 120, y: ty - 520, vx: 240, vy: 1040, dmg: 0, r: 1, life: 0.5, noHit: true,
          onEnd: gg => { for (const o of foesIn(gg, tx, ty, K.ult.r)) { const [dd, crit] = rollCrit(gg, f, atk * K.ult.mul * um); damageFoe(gg, o, dd, f, { crit, fx: 'star' }); } gg.emit('burst', { kind: 'candy', x: tx, y: ty, r: K.ult.r }); } });
      } });
      startAct(f, 'ult', 0.3 + K.ult.n * K.ult.every + 0.3, hits);
      game.emit('banner', { text: `${f.nick || f.name}的星光陨落！全队攻击提升 ${K.ult.atkSec}秒`, tier: 3 });
      return true;
    }
    case 'phoenix': { // 浴火重生：打盹的伙伴全部复活，敌群里炸开火焰
      startAct(f, 'ult', 0.9, [{ at: 0.5, fn: g => {
        let n = 0;
        for (const a of g.pets.values()) if (!a.egg && !a.alive) { wakePet(g, a, K.ult.revive); n++; }
        if (spot) { for (const e of foesIn(g, spot.x, spot.y, K.ult.r)) { damageFoe(g, e, atk * K.ult.mul * um, f, { fx: 'fire' }); burnE(e, atk * K.burn * st.burn * 2, 4, g.clock, f.uid); } g.emit('burst', { kind: 'fireburst', x: spot.x, y: spot.y, r: K.ult.r }); }
        if (n) g.emit('banner', { text: `${f.nick || f.name}浴火重生！${n}只打盹的伙伴醒过来了`, tier: 3 });
      } }]);
      return true;
    }
    default: return false;
  }
}

// 持续区域（竹林结界、九尾狐火）
export function stepAreas(game, dt) {
  for (const a of game.areas) {
    a.t += dt;
    if (a.tick) { a.tickT -= dt; if (a.tickT <= 0) { a.tickT += a.every; a.tick(game); } }
  }
  const done = game.areas.filter(a => a.t >= a.life);
  for (const a of done) if (a.end) a.end(game);
  game.areas = game.areas.filter(a => a.t < a.life);
}

// ───────── 摸摸 ─────────
export function patPet(game, f) {
  if (f.egg) return false;
  const c = game.clock;
  if (c - (f.patAt ?? -99) < PET.patCd) return false;
  f.patAt = c; f.happyT = 1.3;
  if (f.alive) healPet(game, f, f.maxHp * 0.05);
  game.emit('pat', { uid: f.uid, x: f.x, y: f.y });
  return true;
}
export { inGround, petsIn, damagePet, livePets, TREE };
