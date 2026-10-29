// 战斗公共部分：躲雨区域、选目标、伤害、治疗、状态、飞行道具
import { W, H, FIELD, ENEMY, STAGE, SCORE, LIMITS, PET, RINGS, TREE } from './config.js';
import { syncFruits } from './wish.js';
import { growthE } from './gear.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const LANES = [120, 360, 600];

// ───────── 躲雨区域：每招把场地分成三块，标「1」「2」「3」，发数字就跑过去 ─────────
// rings 以施法者为圆心的里/中/外三圈；fan 从首领往外的左/中/右三道扇面；rows 上/中/下三条横条；spots 场上三个圈（圈外也挨打）
export const FAN_W = 0.36;
const SPOT_R = 96;
export function ringDist(z, x, y) { return Math.hypot(x - z.cx, (y - z.cy) / RINGS.squash); }
function fanAng(z, x, y) { const px = x - z.cx, py = y - z.cy; return Math.atan2(z.ax * py - z.ay * px, z.ax * px + z.ay * py); }
export function partOf(z, x, y) {
  switch (z.shape) {
    case 'fan': { const s = fanAng(z, x, y); return s > FAN_W ? 0 : s < -FAN_W ? 2 : 1; }
    case 'rows': return y < z.rowY[0] ? 0 : y < z.rowY[1] ? 1 : 2;
    case 'spots': return z.spots.findIndex(p => Math.hypot(x - p.x, (y - p.y) / RINGS.squash) < p.r);
    default: { const d = ringDist(z, x, y); return d < RINGS.r1 ? 0 : d < RINGS.r2 ? 1 : 2; }
  }
}
export const partHit = (z, i) => i < 0 || z.danger.includes(i);
export function inZone(z, x, y) { return z.full || partHit(z, partOf(z, x, y)); }
export function safeParts(z) { return [0, 1, 2].filter(i => !z.danger.includes(i)); }
export function ringZone(game) { return game.zones.find(z => !z.full) || null; }
// 第 i 块里离 (x,y) 最近的点
export function partPoint(z, i, x, y, fx = x, fy = y) {
  const fit = (px, py) => ({ x: clamp(px, 16, W - 16), y: clamp(py, FIELD.top, FIELD.bottom) });
  if (z.shape === 'rows') {
    const lo = i === 0 ? FIELD.top : z.rowY[i - 1] + 26, hi = i === 2 ? FIELD.bottom : z.rowY[i] - 26;
    return fit(x, clamp(y, lo, hi));
  }
  if (z.shape === 'spots') {
    const p = z.spots[i]; let dx = x - p.x, dy = (y - p.y) / RINGS.squash; const d = Math.hypot(dx, dy), m = p.r * 0.6;
    if (d > m) { dx *= m / d; dy *= m / d; }
    return fit(p.x + dx, p.y + dy * RINGS.squash);
  }
  if (z.shape === 'fan') {
    const [lo, hi] = i === 0 ? [FAN_W + 0.14, FAN_W + 1.1] : i === 2 ? [-FAN_W - 1.1, -FAN_W - 0.14] : [-FAN_W + 0.12, FAN_W - 0.12];
    const base = Math.atan2(z.ay, z.ax), s0 = fanAng(z, x, y), r0 = Math.max(110, Math.hypot(x - z.cx, y - z.cy));
    for (const s of [clamp(s0, lo, hi), (lo + hi) / 2, lo, hi]) for (const r of [r0, r0 * 0.75, r0 * 0.5, 200, 140]) {
      const q = fit(z.cx + Math.cos(base + s) * r, z.cy + Math.sin(base + s) * r);
      if (partOf(z, q.x, q.y) === i) return q;
    }
    return fit(z.cx + Math.cos(base + (lo + hi) / 2) * 160, z.cy + Math.sin(base + (lo + hi) / 2) * 160);
  }
  const band = i === 0 ? [0, RINGS.r1 - 24] : i === 1 ? [RINGS.r1 + 24, RINGS.r2 - 24] : [RINGS.r2 + 28, 1e9];
  let dx = x - z.cx, dy = (y - z.cy) / RINGS.squash, d = Math.hypot(dx, dy);
  if (d < 1) { dx = fx - z.cx; dy = (fy - z.cy) / RINGS.squash; d = Math.hypot(dx, dy); if (d < 1) { dx = 0; dy = 1; d = 1; } }
  const k = d < band[0] ? band[0] / d : d > band[1] ? band[1] / d : 1;
  let q = fit(z.cx + dx * k, z.cy + dy * k * RINGS.squash);
  if (partOf(z, q.x, q.y) !== i && i === 2) {
    let best = null;
    for (let a = 0; a < 16; a++) { const t = a / 16 * Math.PI * 2, c = fit(z.cx + Math.cos(t) * band[0], z.cy + Math.sin(t) * band[0] * RINGS.squash); if (partOf(z, c.x, c.y) === 2) { const dd = Math.hypot(c.x - x, c.y - y); if (!best || dd < best.d) best = { ...c, d: dd }; } }
    if (best) q = { x: best.x, y: best.y };
  }
  return q;
}
// 三块的数字标在哪
export function partLabels(z) {
  const fit = (px, py) => ({ x: clamp(px, 46, W - 46), y: clamp(py, FIELD.top - 40, FIELD.bottom - 20) });
  if (z.shape === 'rows') return [0, 1, 2].map(i => fit(z.labelX, [(FIELD.top + z.rowY[0]) / 2, (z.rowY[0] + z.rowY[1]) / 2, (z.rowY[1] + FIELD.bottom) / 2][i]));
  if (z.shape === 'spots') return z.spots.map(p => ({ x: p.x, y: p.y }));
  if (z.shape === 'fan') {
    const b = Math.atan2(z.ay, z.ax);
    return [[FAN_W + 0.5, FAN_W + 0.9, FAN_W + 0.25], [0, 0.15, -0.15], [-FAN_W - 0.5, -FAN_W - 0.9, -FAN_W - 0.25]].map((ss, i) => {
      for (const r of [240, 190, 300, 150, 360]) for (const s of ss) {
        const x = z.cx + Math.cos(b + s) * r, y = z.cy + Math.sin(b + s) * r;
        if (x > 50 && x < W - 50 && y > FIELD.top + 30 && y < FIELD.bottom - 40 && partOf(z, x, y) === i) return { x, y };
      }
      const q = partPoint(z, i, z.cx + Math.cos(b + ss[0]) * 240, z.cy + Math.sin(b + ss[0]) * 240); return fit(q.x, q.y);
    });
  }
  // 三圈：数字放在每圈里朝下方（萌宠那边）
  const out = [];
  for (const [i, r] of [[0, RINGS.r1 * 0.45], [1, (RINGS.r1 + RINGS.r2) / 2], [2, RINGS.r2 + 70]].map(([i, r]) => [i, r])) {
    let best = null;
    for (const a of [Math.PI / 2, Math.PI / 2 - 0.5, Math.PI / 2 + 0.5, 0, Math.PI, -Math.PI / 2]) {
      const q = { x: z.cx + Math.cos(a) * r, y: z.cy + Math.sin(a) * r * RINGS.squash };
      if (q.x > 46 && q.x < W - 46 && q.y > FIELD.top - 30 && q.y < FIELD.bottom - 10 && partOf(z, q.x, q.y) === i) { best = q; break; }
    }
    out.push(best || fit(z.cx + (i - 1) * 120, z.cy + r * RINGS.squash));
  }
  return out;
}
export function makeSpots(game) {
  const xs = [130, 360, 590];
  if (game.random() < 0.5) xs.reverse();
  return xs.map((x, i) => ({ x: x + (game.random() - 0.5) * 50, y: FIELD.top + 140 + ((i + Math.floor(game.random() * 3)) % 3) * 160 + (game.random() - 0.5) * 50, r: SPOT_R }));
}
// 萌宠扎堆的地方
export function petCluster(game, radius = 150) {
  const hs = livePets(game);
  let best = null, bn = -1;
  for (const a of hs) { let n = 0; for (const b of hs) if (inGround(b.x, b.y, a.x, a.y, radius)) n++; if (n > bn) { bn = n; best = a; } }
  if (!best) return null;
  let sx = 0, sy = 0, n = 0;
  for (const b of hs) if (inGround(b.x, b.y, best.x, best.y, radius)) { sx += b.x; sy += b.y; n++; }
  return { x: sx / n, y: sy / n, n };
}

// 地面椭圆（伪3D：纵向压扁）
export function inGround(ex, ey, cx, cy, r) {
  const dx = (ex - cx) / r, dy = (ey - cy) / (r * FIELD.ground);
  return dx * dx + dy * dy <= 1;
}
export function dist2(a, b) { return (a.x - b.x) ** 2 + (a.y - b.y) ** 2; }
export function treeDist(x, y) { return Math.hypot(x - TREE.x, (y - TREE.y) / 0.7); }

// ───────── 选目标 ─────────
export function liveFoes(game) { return game.foes.filter(e => e.alive && !e.purified); }
export function livePets(game) { const a = []; for (const f of game.pets.values()) if (f.alive && !f.egg) a.push(f); return a; }
export function foesIn(game, x, y, r) {
  const out = [];
  for (const e of game.foes) if (e.alive && !e.purified && inGround(e.x, e.y, x, y, r + e.rad)) out.push(e);
  return out;
}
export function petsIn(game, x, y, r) {
  const out = [];
  for (const f of game.pets.values()) if (f.alive && !f.egg && inGround(f.x, f.y, x, y, r + 14)) out.push(f);
  return out;
}
export function densest(game, fromX, fromY, radius = 150) {
  const list = liveFoes(game).filter(e => e.y > FIELD.enemyTop - 40);
  let best = null, bn = -1;
  for (const a of list) {
    let n = 0;
    for (const b of list) if (inGround(b.x, b.y, a.x, a.y, radius)) n += b.role === 'boss' ? 4 : b.role === 'elite' ? 2 : 1;
    n -= Math.hypot(a.x - fromX, a.y - fromY) / 900;
    if (n > bn) { bn = n; best = a; }
  }
  return best ? { x: best.x, y: best.y, n: bn, e: best } : null;
}

// ───────── 伤害 ─────────
export function rollCrit(game, f, dmg) {
  const st = f.stats; if (!st) return [dmg, false];
  if (game.random() < st.crit) return [dmg * st.critDmg, true];
  return [dmg, false];
}
export function critAvg(f) { const st = f.stats; return st ? 1 + st.crit * (st.critDmg - 1) : 1; }
// 记一次有效行为：NPC、小伙伴、后援不记
export function score(game, f, units) {
  if (!f || f.npc || f.merc || f.reserve || !(units > 0)) return 0;
  const add = units * growthE(f);
  f.merit += add;
  return add;
}
// 打首领 / 精英：人少（含补位NPC不到6只）伤害加成，人多按人数归一
export function normK(game) {
  const n = Math.max(2, game.petCount || 1);
  return n >= 6 ? Math.pow(6 / n, 0.7) : Math.pow(6 / n, STAGE.smallPow);
}
// src：出手的萌宠（可空）。opts: { crit, fx, knock: [dx,dy], noNorm, quiet }
export function damageFoe(game, e, dmg, src, opts = {}) {
  if (!e.alive || e.purified || !(dmg > 0)) return 0;
  if (e.invuln > 0) return 0;
  let d = dmg * (game.teamAtkMul || 1);
  if (e.role !== 'minion' && !opts.noNorm) d *= normK(game);
  e.hp -= d; e.flash = 0.12;
  if (src && !src.isPet) src = null;
  if (src) {
    src.dealt = (src.dealt || 0) + d;
    outputScore(game, src, d / (game.dmgUnitHp || 1e12), 'accDmg');
    e.lastHit = src.merc ? src.owner : src.uid;
    if (e.hitters) e.hitters.add(e.lastHit);
    // 刺刺栗：近身打它会被扎
    if (e.thorns && opts.melee && src.alive) damagePet(game, src, d * e.thorns, e, { quiet: true });
  }
  if (opts.knock && e.role === 'minion') { e.x = clamp(e.x + opts.knock[0], 20, W - 20); e.y = clamp(e.y + opts.knock[1], FIELD.enemyTop - 60, FIELD.bottom); }
  if (opts.fx !== false && !opts.quiet) {
    const k = e.role === 'minion' ? 1 : Math.min(2, e.h / 90) * 0.8;
    game.emit('hit', { kind: opts.fx || src?.hitFx || 'pop', x: e.x + (game.random() - 0.5) * 16 * k, y: e.y - e.h * 0.5 + (game.random() - 0.5) * 22 * k, k });
  }
  if (opts.crit) game.emit('dmg', { x: e.x, y: e.y - e.h - 6, v: Math.round(d), crit: true });
  if (e.hp <= 0) game.purify(e, src);
  return d;
}
export function dodging(game, f) { return (f.dodgeUntil || 0) > game.clock; }
export function damagePet(game, f, dmg, src = null, opts = {}) {
  if (!f.alive || f.egg || f.invuln > 0 || !(dmg > 0)) return 0;
  if (dodging(game, f) && !opts.unavoidable) { dodged(game, f); return 0; }
  let d = dmg * (1 - (f.stats?.armor || 0)) * (1 - Math.min(0.6, f.stats?.dr || 0));
  if ((game.teamDrUntil || 0) > game.clock) d *= 1 - game.teamDr;
  if (f.drUntil > game.clock) d *= 1 - (f.drBuff || 0);
  for (const a of game.areas) if (a.dr && inGround(f.x, f.y, a.x, a.y, a.r)) { d *= 1 - a.dr; break; }
  const taken = d;
  if (f.shieldHp > 0) {
    const s = Math.min(f.shieldHp, d); f.shieldHp -= s; d -= s;
    if (s > 0 && f.shieldBy && f.shieldBy !== f.uid) { const by = game.pets.get(f.shieldBy); if (by) outputScore(game, by, s / f.maxHp, 'accHeal'); }
  }
  f.hp -= d; f.hitFlash = 0.15;
  if (d > f.maxHp * PET.hitStunFrac && !f.act && f.alive) f.act = { kind: 'hit', t: 0, dur: 0.3, hits: [] }; f.anim = 'hit'; f.animT = 0;
  if (f.hp <= 0) { f.hp = 0; game.nap(f); }
  return taken;
}
export function healPet(game, f, amount, from = null) {
  if (!f.alive || f.egg || !(amount > 0)) return 0;
  const before = f.hp;
  f.hp = Math.min(f.maxHp, f.hp + amount);
  if (from && from !== f) outputScore(game, from, (f.hp - before) / f.maxHp, 'accHeal');
  return f.hp - before;
}
// 打心愿树
export function damageTree(game, dmg, src = null, opts = {}) {
  const t = game.tree;
  if (!t || t.hp <= 0 || !(dmg > 0)) return 0;
  const before = t.hp;
  t.hp = Math.max(0, t.hp - dmg); t.flash = 0.2;
  const per = t.maxHp / TREE.fruits, lost = Math.ceil(before / per - 1e-6) - Math.ceil(t.hp / per - 1e-6);
  const slots = syncFruits(game, opts.steal ? 'steal' : 'hit');
  if (lost > 0) game.emit('fruitLost', { n: lost, x: src?.x ?? TREE.x, y: src?.y ?? TREE.y - 120, by: src?.unit, steal: !!opts.steal, slots });
  if (t.hp <= 0) game.emit('treeDown', {});
  return before - t.hp;
}
export function healTree(game, amount) {
  const t = game.tree;
  if (!t || t.hp <= 0 || !(amount > 0)) return 0;
  const before = t.hp;
  t.hp = Math.min(t.maxHp, t.hp + amount);
  const per = t.maxHp / TREE.fruits, got = Math.ceil(t.hp / per - 1e-6) - Math.ceil(before / per - 1e-6);
  syncFruits(game);
  if (got > 0) game.emit('fruitBack', { n: got });
  return t.hp - before;
}
// 输出贡献：伤害按本关首领血量折算（每1%记一次），治疗、护盾按队友最大体力折算（每1/4条记一次）；小伙伴的算给主人
export function outputScore(game, f, frac, key) {
  if (!f || !f.isPet || !(frac > 0)) return;
  const o = f.merc ? game.pets.get(f.owner) : f;
  if (!o) return;
  const unit = key === 'accDmg' ? 0.01 : 0.25, pts = key === 'accDmg' ? SCORE.dmg : SCORE.heal;
  o[key] = (o[key] || 0) + frac;
  if (o[key] >= unit) { const n = Math.floor(o[key] / unit); o[key] -= n * unit; score(game, o, pts * n); }
}

// ───────── 状态 ─────────
export function slowE(e, mul, sec, clock) { if (e.role === 'boss') mul = Math.min(mul, 0.25); e.slow = Math.max(e.slowUntil > clock ? e.slow : 0, mul); e.slowUntil = Math.max(e.slowUntil || 0, clock + sec); }
export function stunE(e, sec, clock, kind = 'stun') {
  const ice = kind === 'freeze';
  if (e.role === 'boss') sec *= ice ? 0.6 : 0.35;
  if (e.role === 'elite') sec *= ice ? 0.8 : 0.6;
  e.stunUntil = Math.max(e.stunUntil || 0, clock + sec); e.stunKind = kind;
  if (ice) e.iceUntil = Math.max(e.iceUntil || 0, clock + sec);
}
export function burnE(e, dps, sec, clock, owner) { e.burn = { dps: Math.max(dps, e.burn?.until > clock ? e.burn.dps : 0), until: clock + sec, owner }; }
export function speedMul(e, clock) { return (e.stunUntil || 0) > clock ? 0 : (e.slowUntil || 0) > clock ? 1 - e.slow : 1; }

// ───────── 飞行道具 ─────────
// team 'p' 萌宠的（打坏心情），'e' 坏心情的（打萌宠）
export function addProj(game, p) {
  if (game.projs.length >= LIMITS.projectiles) return null;
  const sp = Math.hypot(p.vx, p.vy) || 1;
  const q = { r: 12, pierce: 0, life: 3, homing: 0, age: 0, rot: Math.atan2(p.vy, p.vx), speed: sp, hit: null, ...p };
  game.projs.push(q);
  return q;
}
export function aimAt(x, y, tx, ty, speed) { const a = Math.atan2(ty - y, tx - x); return [Math.cos(a) * speed, Math.sin(a) * speed]; }

function nearestFoeTo(game, x, y, maxD = 1e9) {
  let best = null, bd = maxD * maxD;
  for (const e of game.foes) {
    if (!e.alive || e.purified) continue;
    const d = (e.x - x) ** 2 + (e.y - e.h * 0.5 - y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function nearestPetTo(game, x, y) {
  let best = null, bd = 1e12;
  for (const f of game.pets.values()) { if (!f.alive || f.egg) continue; const d = (f.x - x) ** 2 + (f.y - 30 - y) ** 2; if (d < bd) { bd = d; best = f; } }
  return best;
}

export function stepProjs(game, dt) {
  const arr = game.projs;
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    const b = arr[i];
    b.age += dt; b.life -= dt;
    if (b.delay > 0) { b.delay -= dt; arr[w++] = b; continue; }
    if (b.homing > 0) {
      if (!b.tgt || !b.tgt.alive || b.tgt.purified || b.age - (b.tgtAt || 0) > 0.4) {
        b.tgtAt = b.age;
        b.tgt = b.team === 'p' ? (b.fixed && b.fixed.alive && !b.fixed.purified ? b.fixed : nearestFoeTo(game, b.x, b.y)) : nearestPetTo(game, b.x, b.y);
      }
      const t = b.tgt;
      if (t) {
        const ty = b.team === 'p' ? t.y - t.h * 0.5 : t.y - 30;
        const want = Math.atan2(ty - b.y, t.x - b.x), cur = Math.atan2(b.vy, b.vx);
        let da = want - cur; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        const a = cur + clamp(da, -b.homing * dt, b.homing * dt);
        b.vx = Math.cos(a) * b.speed; b.vy = Math.sin(a) * b.speed;
      }
    }
    if (b.fall) { b.vy += b.fall * dt; }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.spin) b.rot += b.spin * dt; else b.rot = Math.atan2(b.vy, b.vx);
    let dead = b.life <= 0 || b.y < -60 || b.y > H + 60 || b.x < -60 || b.x > W + 60;
    if (b.landY && b.y >= b.landY) { dead = true; b.landed = true; }
    if (!dead && !b.noHit) dead = b.team === 'p' ? hitFoes(game, b) : hitPets(game, b);
    if (!dead) arr[w++] = b;
    else if (b.onEnd) b.onEnd(game, b);
  }
  arr.length = w;
}

function hitFoes(game, b) {
  if (b.heal) {   // 棉花的爱心：飞向伙伴回血
    const t = b.fixed;
    if (!t || !t.alive) return b.age > 0.2 && !t;
    if ((t.x - b.x) ** 2 + (t.y - 30 - b.y) ** 2 < 24 * 24) { const amt = healPet(game, t, b.heal, game.pets.get(b.owner)); if (amt > 0) game.emit('heal', { uid: t.uid, x: t.x, y: t.y, amount: Math.round(amt), small: true }); return true; }
    return false;
  }
  const owner = game.pets.get(b.owner) || null;
  for (const e of game.foes) {
    if (!e.alive || e.purified) continue;
    const cy = e.y - e.h * 0.5, rr = b.r + e.rad;
    if ((e.x - b.x) ** 2 + (cy - b.y) ** 2 > rr * rr) continue;
    if (b.hit && b.hit.has(e.id)) continue;
    const dealt = damageFoe(game, e, b.dmg, owner, { crit: b.crit, fx: b.fx });
    if (b.onHit) b.onHit(game, e, b, dealt);
    if (b.pierce > 0) { b.pierce--; (b.hit ||= new Set()).add(e.id); continue; }
    return true;
  }
  return false;
}
export function dodged(game, f) {
  if (game.clock - (f.dodgedAt || -9) < 0.35) return;
  f.dodgedAt = game.clock;
  game.emit('dodged', { uid: f.uid, x: f.x, y: f.y });
}
function hitPets(game, b) {
  for (const a of game.areas) {
    if (a.blocks && a.blocks(b)) { game.emit('hit', { kind: 'pop', x: b.x, y: b.y, k: 0.7 }); return true; }
  }
  for (const f of game.pets.values()) {
    if (!f.alive || f.egg) continue;
    const rr = b.r + 14;
    if ((f.x - b.x) ** 2 + (f.y - 30 - b.y) ** 2 > rr * rr) continue;
    if (dodging(game, f)) { dodged(game, f); continue; }
    damagePet(game, f, b.dmg, null);
    if (b.slow) { f.slow = 0.35; f.slowUntil = game.clock + 1.5; }
    game.emit('hit', { kind: b.kind === 'rain' ? 'splash' : 'pop', x: f.x, y: f.y - 30, k: 0.7 });
    if (b.pierce > 0) { b.pierce--; continue; }
    return true;
  }
  // 敌人的弹幕飞到心愿树
  if (b.treeDmg && treeDist(b.x, b.y + 60) < 90) { damageTree(game, b.treeDmg, null); game.emit('hit', { kind: 'splash', x: b.x, y: b.y, k: 0.8 }); return true; }
  return false;
}

// 灼烧每 0.5 秒结算
export function stepStatus(game, e, dt) {
  e.dotT = (e.dotT || 0) - dt;
  if (e.dotT > 0) return;
  e.dotT = 0.5;
  const c = game.clock;
  if (e.burn && e.burn.until > c) damageFoe(game, e, e.burn.dps * 0.5, game.pets.get(e.burn.owner) || null, { fx: false });
}
export { ENEMY };
