// 坏心情：小怪、偷果鼠、精英、首领、金色偷果鼠；打空不是死，是「净化」
import { W, FIELD, ENEMY, FOES, TREE, STAGE } from './config.js';
import {
  clamp, petsIn, livePets, damagePet, damageTree, speedMul, stepStatus, addProj, aimAt, treeDist, petCluster, inGround,
} from './combat.js';
import { castZone } from './stage.js';
import { chapterOf, cycleOf, dmgScale } from './stage.js';

let seq = 0;
export function spawnFoe(game, unit, x, y, o = {}) {
  if (game.foes.length >= ENEMY.limit && !o.force) return null;
  const U = FOES[unit] || FOES.dust;
  const ch = chapterOf(game.stage?.n || 1);
  const role = o.role || (U.kind === 'elite' ? 'elite' : U.kind === 'boss' ? 'boss' : U.kind === 'treasure' ? 'treasure' : 'minion');
  const small = !!o.small;
  const hp = Math.round(o.hp || (U.hp || 80) * ENEMY.minionHp * (1 + ENEMY.hpGrow * (ch - 1)) * (1 + 0.6 * cycleOf(ch)) * (role === 'minion' ? ENEMY.minionX(ch) : 1) * (small ? 0.35 : 1));
  const h = (o.size || U.size || 60) * (small ? 0.62 : 1);
  const e = {
    id: ++seq, unit, role, kind: o.kind || U.kind || 'melee', name: o.name || U.name || '', boss: role === 'boss', small,
    x, y, hp, maxHp: hp, alive: true, purified: 0, invuln: 0, flash: 0, facing: x < 360 ? 1 : -1,
    h, rad: role === 'boss' ? 46 : role === 'elite' || role === 'treasure' ? 30 : small ? 14 : 20, fly: !!U.fly,
    speed: (U.speed || 80) * (0.9 + game.random() * 0.2) * (small ? 1.15 : 1),
    dmg: (U.dmg || 14) * dmgScale(game) * ENEMY.dmgMul * (role === 'minion' ? ENEMY.minionX(ch) : 1) * (small ? 0.6 : 1), cd: 0.6 + game.random() * 1.2,
    reach: U.reach || 50, range: U.range || 0, act: null, anim: 'move', animT: game.random() * 3,
    ox: (game.random() - 0.5) * 36, oy: (game.random() - 0.5) * 16, t: 0, seed: game.random() * 10,
    zoneT: 9 + game.random() * 5, diveT: 8 + game.random() * 4, thorns: U.thorns || 0,
    hitters: o.hitters ? new Set() : null, tgt: null, retarget: 0,
  };
  if (role === 'boss') Object.assign(e, { patT: 3, skillT: 6, sumT: 14, blastT: 22, rage: 1, moveI: Math.floor(game.random() * (U.moves?.length || 1)) });
  game.foes.push(e);
  if (role !== 'minion') game.emit('spawn', { id: e.id, unit, role, name: e.name, x, y });
  return e;
}

// 打谁：被汪汪吼了就打柴柴；身边有萌宠就打萌宠；没有就去打心愿树
function target(game, e) {
  const c = game.clock;
  if (e.tauntBy && e.tauntUntil > c) { const t = game.pets.get(e.tauntBy); if (t && t.alive) return t; }
  if (e.tgt && e.tgt.alive && game.pets.get(e.tgt.uid) === e.tgt && e.retarget > 0) return e.tgt;
  e.retarget = 1 + game.random();
  const aggro = e.role === 'minion' ? 190 : 320;
  let best = null, bd = aggro * aggro;
  for (const f of game.pets.values()) {
    if (!f.alive || f.egg) continue;
    const d = (f.x - e.x) ** 2 + ((f.y - e.y) * 1.3) ** 2 + (f.invuln > 0 ? 9e4 : 0);
    if (d < bd) { bd = d; best = f; }
  }
  e.tgt = best;
  return best;
}
function move(game, e, tx, ty, dt, mul = 1) {
  const sp = e.speed * speedMul(e, game.clock) * mul;
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
  if (d < 3 || sp <= 0) { e.anim = 'idle'; return true; }
  const k = Math.min(d, sp * dt) / d;
  e.x = clamp(e.x + dx * k, 20, W - 20); e.y = clamp(e.y + dy * k, FIELD.enemyTop - 260, FIELD.bottom + 10);
  if (d > 16 && Math.abs(dx) > 6 && e.t - (e.faceT ?? -9) > 0.3) { const f = dx > 0 ? 1 : -1; if (f !== e.facing) { e.facing = f; e.faceT = e.t; } }
  e.anim = 'move';
  return d < 8;
}
function startAct(e, kind, dur, hits, extra = {}) {
  e.act = { kind, t: 0, dur, hits: hits.map(h => ({ ...h, done: false })), ...extra };
  e.anim = kind; e.animT = 0;
}
function stepAct(game, e, dt) {
  const a = e.act;
  a.t += dt;
  if (a.move) a.move(game, e, dt, a);
  for (const h of a.hits) if (!h.done && a.t >= h.at) { h.done = true; if (e.alive && !e.purified) h.fn(game, e, a); }
  if (e.act === a && a.t >= a.dur) { e.act = null; a.onEnd?.(game, e); if (!e.act) e.anim = 'idle'; }
}

export function stepFoe(game, e, dt) {
  const c = game.clock;
  e.animT += dt;
  e.flash = Math.max(0, e.flash - dt);
  e.invuln = Math.max(0, e.invuln - dt);
  if (e.purified) { e.purified += dt; e.y -= dt * (e.role === 'boss' ? 30 : 60); return; }
  e.t += dt; e.cd -= dt; e.retarget -= dt;
  stepStatus(game, e, dt);
  if (!e.alive || e.purified) return;
  if ((e.stunUntil || 0) > c) { e.act = null; e.anim = 'stun'; return; }
  if (e.act) { stepAct(game, e, dt * (speedMul(e, c) || 0.5)); return; }
  if (e.enter && enterField(game, e, dt)) return;
  if (e.role === 'boss') return stepBoss(game, e, dt);
  if (e.role === 'treasure') return stepTreasure(game, e, dt);
  if (e.kind === 'thief') return stepThief(game, e, dt);
  const t = target(game, e);
  if (e.role === 'elite') return stepElite(game, e, t, dt);
  if (e.kind === 'ranged') return stepRanged(game, e, t, dt);
  return stepMelee(game, e, t, dt);
}
function enterField(game, e, dt) {
  const dx = e.enter.x - e.x, dy = e.enter.y - e.y, d = Math.hypot(dx, dy);
  if (d < 6 || (e.x > 30 && e.x < W - 30 && e.hp < e.maxHp)) { e.enter = null; return false; }
  const k = Math.min(d, e.speed * 1.25 * speedMul(e, game.clock) * dt) / d;
  e.x += dx * k; e.y += dy * k;
  if (Math.abs(dx) > 3) e.facing = dx > 0 ? 1 : -1;
  e.anim = 'move';
  return true;
}

// ───────── 心愿树 ─────────
// 树前的落脚点：围着树根散开
function treeSpot(e) {
  const a = Math.PI + 0.35 + ((e.seed * 997) % 1) * (Math.PI - 0.7);
  return { x: TREE.x + Math.cos(a) * (TREE.reach - 6), y: TREE.y - 40 + Math.sin(a) * (TREE.reach - 6) * 0.45 };
}
function hitTree(game, e, mul = ENEMY.treeDmg) {
  damageTree(game, e.dmg * mul, e);
  game.emit('hit', { kind: 'leaf', x: TREE.x + (game.random() - 0.5) * 80, y: TREE.y - 120 - game.random() * 60, k: 0.8 });
}

// ───────── 小怪 ─────────
function meleeSpot(e, t) { const side = e.x <= t.x ? -1 : 1; return { x: t.x + side * (e.reach * 0.8 + 12) + e.ox * 0.3, y: t.y - 2 + e.oy * 0.4 }; }
function stepMelee(game, e, t, dt) {
  if (!t) {
    const s = treeSpot(e);
    if (treeDist(e.x, e.y) > TREE.reach + 4) { move(game, e, s.x, s.y, dt); return; }
    if (e.cd > 0) { e.anim = 'idle'; return; }
    e.cd = FOES[e.unit]?.cd || 1.6;
    startAct(e, 'atk', 0.45, [{ at: 0.25, fn: g => hitTree(g, e) }]);
    return;
  }
  const s = meleeSpot(e, t);
  if (Math.abs(e.x - s.x) >= 14 || Math.abs(e.y - s.y) >= 12) { move(game, e, s.x, s.y, dt); return; }
  e.facing = t.x >= e.x ? 1 : -1;
  if (e.cd > 0) { e.anim = 'idle'; return; }
  e.cd = FOES[e.unit]?.cd || 1.6;
  startAct(e, 'atk', 0.45, [{ at: 0.25, fn: g => {
    if (!t.alive || Math.abs(t.x - e.x) >= e.reach + 30 || Math.abs(t.y - e.y) >= 34) return;
    damagePet(g, t, e.dmg, e);
    g.emit('hit', { kind: 'pop', x: t.x, y: t.y - 30, k: 0.6, foe: true });
  } }]);
}
// 小乌云：停在上半场往下滴雨；附近没有萌宠就慢慢飘去心愿树上方下雨
function stepRanged(game, e, t, dt) {
  const U = FOES[e.unit];
  if (!t) {
    let near = null, nd = e.range * e.range;
    for (const f of game.pets.values()) { if (!f.alive || f.egg) continue; const d = (f.x - e.x) ** 2 + (f.y - e.y) ** 2; if (d < nd) { nd = d; near = f; } }
    t = near;
  }
  const goal = t || { x: TREE.x + e.ox * 3, y: TREE.y - 140 };
  const ty = clamp(goal.y - e.range * 0.7, FIELD.enemyTop + 40, t ? 680 : TREE.y - 330), tx = clamp(goal.x + (e.x < goal.x ? -60 : 60) + e.ox, 30, W - 30);
  const d = Math.hypot(goal.x - e.x, goal.y - e.y);
  if (Math.abs(e.y - ty) > 40 || Math.abs(e.x - tx) > 60) { move(game, e, tx, ty, dt); if (d > e.range || e.cd > 0) return; }
  if (e.cd > 0 || d > e.range + 60) { if (!e.act) e.anim = 'idle'; return; }
  e.cd = U.cd * (0.85 + game.random() * 0.3);
  startAct(e, 'atk', 0.5, [{ at: 0.3, fn: g => {
    const sx = e.x, sy = e.y - e.h * 0.2;
    const tx2 = t && t.alive ? t.x : TREE.x + (g.random() - 0.5) * 80, ty2 = t && t.alive ? t.y - 30 : TREE.y - 120;
    const [vx, vy] = aimAt(sx, sy, tx2, ty2, 280);
    addProj(g, { team: 'e', kind: U.proj || 'rain', x: sx, y: sy, vx, vy, dmg: e.dmg, life: 3, r: 9, treeDmg: t ? 0 : e.dmg * ENEMY.treeDmg });
  } }]);
}
// 偷果鼠：不打萌宠，直奔心愿树偷一个果子，偷到就往回跑；跑掉之前净化它，果子会还回来
function stepThief(game, e, dt) {
  if (e.carry) {
    move(game, e, e.x + (e.x < 360 ? -40 : 40), FIELD.enemyTop - 220, dt, 1.15);
    if (e.y < FIELD.enemyTop - 180) { e.alive = false; e.gone = true; game.emit('thiefAway', { x: e.x }); }
    return;
  }
  const s = treeSpot(e);
  if (treeDist(e.x, e.y) > TREE.reach) { move(game, e, s.x, s.y, dt); return; }
  if (e.cd > 0) { e.anim = 'idle'; return; }
  e.cd = 99;
  startAct(e, 'steal', 0.9, [{ at: 0.7, fn: g => {
    if (!g.tree || g.tree.hp <= 0) return;
    const per = g.tree.maxHp / TREE.fruits;
    damageTree(g, per * TREE.stealFrac, e, { steal: true });
    e.carry = per * TREE.stealFrac;
    g.emit('steal', { id: e.id, x: e.x, y: e.y });
  } }]);
}

// ───────── 精英 ─────────
function stepElite(game, e, t, dt) {
  const U = FOES[e.unit];
  e.zoneT -= dt; e.diveT -= dt;
  if (e.zoneT <= 0 && e.y > FIELD.enemyTop - 20 && livePets(game).length) {
    e.zoneT = 13 + game.random() * 4;
    const z = castZone(game, 'strike', e.name, { shape: U.zone || 'rings', cx: e.x, cy: e.y, dir: t, count: 1, name: U.zoneName, fx: U.zone === 'rows' ? 'bell' : U.zone === 'spots' ? 'peck' : 'slam', stun: U.stun });
    if (z) { startAct(e, 'cast', 1, []); return; }
  }
  // 嘀咕鸦：俯冲去啄心愿树
  if (U.treeDive && e.diveT <= 0) {
    e.diveT = 10 + game.random() * 4;
    const sx = e.x, sy = e.y, s = treeSpot(e);
    startAct(e, 'dive', 1.3, [{ at: 0.8, fn: g => { hitTree(g, e, 1.2); for (const f of petsIn(g, e.x, e.y, U.aoe)) damagePet(g, f, e.dmg * 0.6, e); } }],
      { move: (g, x, dt2, a) => { const k = Math.min(1, a.t / 0.8), back = Math.max(0, (a.t - 0.9) / 0.4); x.x = sx + (s.x - sx) * k; x.y = sy + (s.y - sy) * k - (back > 0 ? back * 160 : 0); } });
    return;
  }
  if (!t) {
    const s = treeSpot(e);
    if (treeDist(e.x, e.y) > TREE.reach + 10) { move(game, e, s.x, s.y, dt); return; }
    if (e.cd > 0) { e.anim = 'idle'; return; }
    e.cd = U.cd;
    startAct(e, 'atk', 0.6, [{ at: 0.35, fn: g => hitTree(g, e, 0.8) }]);
    return;
  }
  const s = meleeSpot(e, t);
  if (Math.abs(e.x - s.x) > 16 || Math.abs(e.y - s.y) > 14) { move(game, e, s.x, s.y, dt); return; }
  e.facing = t.x >= e.x ? 1 : -1;
  if (e.cd > 0) { e.anim = 'idle'; return; }
  e.cd = U.cd;
  const heavy = game.random() < 0.3;
  startAct(e, heavy ? 'atk2' : 'atk', heavy ? 0.8 : 0.55, [{ at: heavy ? 0.5 : 0.3, fn: g => {
    const cx = e.x + e.facing * e.reach * 0.5;
    for (const f of petsIn(g, cx, e.y, U.aoe * (heavy ? 1.3 : 1))) { if (damagePet(g, f, e.dmg * (heavy ? 1.6 : 1), e) > 0 && U.stun && heavy) f.stunUntil = g.clock + U.stun; }
    g.emit('hit', { kind: heavy ? 'boom' : 'pop', x: cx, y: e.y - 30, k: heavy ? 1.3 : 1, foe: true });
    if (heavy) g.emit('shake', { k: 4 });
  } }]);
}

// ───────── 金色偷果鼠（跑车）：满场乱跑，45秒没净化就跑了 ─────────
function stepTreasure(game, e, dt) {
  if (e.t > 45 && !e.escaping) { e.escaping = true; game.emit('toast', { text: '金色偷果鼠溜走了！' }); }
  if (e.escaping) { move(game, e, e.x, FIELD.enemyTop - 200, dt, 1.4); if (e.y < FIELD.enemyTop - 150) { e.alive = false; e.gone = true; } return; }
  if (!e.wp || Math.hypot(e.wp.x - e.x, e.wp.y - e.y) < 20) e.wp = { x: 80 + game.random() * 560, y: 450 + game.random() * 330 };
  move(game, e, e.wp.x, e.wp.y, dt, 0.8);
}

// ───────── 首领 ─────────
const bulletDmg = game => ENEMY.bulletDmg * dmgScale(game) * ENEMY.dmgMul;
const BULLET = { rain: { kind: 'rain', r: 9 }, spike: { kind: 'spike', r: 9 }, feather: { kind: 'feather', r: 10 }, snow: { kind: 'snowflake', r: 10, slow: true }, gloom: { kind: 'gloom', r: 11 } };
function fan(game, e, n, arc, speed, spec) {
  const sx = e.x, sy = e.y - e.h * 0.45;
  const hs = livePets(game); const t = hs[Math.floor(game.random() * hs.length)];
  const center = t ? Math.atan2(t.y - 30 - sy, t.x - sx) : Math.PI / 2;
  for (let k = 0; k < n; k++) {
    const a = center + (n > 1 ? (k / (n - 1) - 0.5) * arc : 0);
    addProj(game, { team: 'e', x: sx, y: sy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg: bulletDmg(game), life: 4, r: 8, ...spec });
  }
}
function ring(game, e, n, speed, spec, rot = 0) {
  const sy = e.y - e.h * 0.4;
  for (let k = 0; k < n; k++) {
    const a = rot + (k / n) * Math.PI * 2;
    if (Math.sin(a) < -0.35) continue;
    addProj(game, { team: 'e', x: e.x, y: sy, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, dmg: bulletDmg(game), life: 4.5, r: 8, ...spec });
  }
}
function summon(game, e, n) {
  const ch = game.stage?.chapter;
  if (!ch) return;
  for (let i = 0; i < n; i++) {
    const u = ch.minions.filter(m => m !== 'thief')[Math.floor(game.random() * (ch.minions.length - 1))] || 'dust';
    const m = spawnFoe(game, u, clamp(e.x + (i - (n - 1) / 2) * 50, 40, W - 40), e.y + 20);
    if (m) game.emit('hit', { kind: 'smoke', x: m.x, y: m.y - 20, k: 1 });
  }
}
const cd = (e, key, dt, every) => { e[key] = (e[key] ?? every * 0.6) - dt; if (e[key] > 0) return false; e[key] = every; return true; };
const RAGE_TEXT = ['气得更厉害了！', '彻底炸毛了！'];
function stepBoss(game, e, dt) {
  const U = FOES[e.unit];
  const pct = e.hp / e.maxHp, rage = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;
  if (rage > e.rage) { e.rage = rage; game.emit('banner', { text: `${e.name}${RAGE_TEXT[rage - 2]}`, tier: 3, boss: true }); game.emit('rage', { id: e.id, rage }); }
  const hs = livePets(game);
  // 有萌宠贴身就拍一下
  const near = hs.filter(f => Math.abs(f.x - e.x) < 120 && Math.abs(f.y - e.y) < 70);
  if (near.length && e.cd <= 0) {
    e.cd = U.cd - 0.3 * (rage - 1);
    startAct(e, 'atk', 0.7, [{ at: 0.4, fn: g => { for (const f of petsIn(g, e.x, e.y, U.aoe)) damagePet(g, f, bulletDmg(g) * 1.5, e); g.emit('hit', { kind: 'boom', x: e.x, y: e.y - 20, k: 1.6, foe: true }); g.emit('shake', { k: 4 }); } }]);
    return;
  }
  const B = BULLET[U.bullet] || BULLET.rain;
  if (cd(e, 'patT', dt, [4.6, 3.9, 3.2][rage - 1])) {
    if (game.random() < 0.5) startAct(e, 'cast', 1, [0.25, 0.55, 0.85].map((at, i) => ({ at, fn: g => fan(g, e, 4 + rage, 0.8, 230 + i * 20, B) })));
    else startAct(e, 'cast', 1, [{ at: 0.3, fn: g => ring(g, e, 12 + rage * 3, 200, B, g.random()) }, ...(rage >= 2 ? [{ at: 0.75, fn: g => ring(g, e, 12 + rage * 3, 230, B, g.random()) }] : [])]);
    return;
  }
  if (cd(e, 'skillT', dt, [14, 12, 10][rage - 1])) {
    const mv = U.moves[e.moveI++ % U.moves.length];
    const p = petCluster(game) || { x: 360, y: 760 };
    const o = { shape: mv.zone, name: mv.name, fx: mv.fx, count: rage >= 2 ? 2 : 1, sleep: mv.sleep, stun: mv.slam ? 1 : 0 };
    if (mv.zone === 'rings') Object.assign(o, mv.slam ? { cx: p.x, cy: p.y, slam: true } : { cx: e.x, cy: e.y });
    if (mv.zone === 'fan') Object.assign(o, { cx: e.x, cy: e.y });
    const z = castZone(game, 'strike', e.name, o);
    if (z) {
      if (z.slam) { const sx = e.x, sy = e.y, warn = z.warn; startAct(e, 'cast', warn, [], { move: (g, x, dt2, a) => { const k = Math.max(0, Math.min(1, (a.t - (warn - 0.5)) / 0.45)); x.x = sx + (z.cx - sx) * k; x.y = sy + (z.cy - sy) * k - Math.sin(k * Math.PI) * 90; } }); }
      else startAct(e, 'cast', 1.4, []);
      return;
    }
  }
  if (rage >= 2 && cd(e, 'blastT', dt, [99, 26, 20][rage - 1])) {
    if (castZone(game, 'blast', e.name, { name: U.blast, freeze: U.blastFreeze })) { startAct(e, 'charge', 1.5, []); return; }
  }
  if (cd(e, 'sumT', dt, 18)) { startAct(e, 'cast', 0.8, [{ at: 0.4, fn: g => summon(g, e, 2 + rage) }]); return; }
  // 平时：满场游走，朝萌宠多的一边
  const cx = hs.length ? hs.reduce((s, f) => s + f.x, 0) / hs.length : 360;
  e.roamT = (e.roamT ?? 1) - dt;
  if (!e.roam || e.roamT <= 0) {
    e.roamT = 4 + game.random() * 4;
    const [y0, y1] = FIELD.bossRoam;
    e.roam = { x: clamp(cx + (game.random() - 0.5) * 380, 120, W - 120), y: y0 + game.random() * (y1 - y0) };
  }
  move(game, e, e.roam.x, e.roam.y, dt, 0.55);
}
// 区域落下那一刻施法者的姿势（首领、精英）
export function strikePose(game, z) {
  if (z.posed) return;
  z.posed = true;
  for (const e of game.foes) if (e.alive && !e.purified && e.name === z.caster && !e.act) startAct(e, 'cast', 1.2, []);
}
export { inGround, STAGE };
