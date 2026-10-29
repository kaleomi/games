// 萌宠保卫战独有：好朋友（贴贴、友情合体技）、收服小精灵、鲜花种花
import { FRIEND, SPRITES, GARDEN, FOES, FIELD, TREE, W, SCORE, SPECIES } from './config.js';
import { dayKeyOf } from './save.js';
import { foesIn, petsIn, liveFoes, damageFoe, healPet, slowE, score, inGround } from './combat.js';
import { refreshStats } from './pets.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const isTest = uid => String(uid).startsWith('test:');
const petName = f => f.nick || SPECIES[f.sp]?.name || '萌宠';

// ───────── 好朋友 ─────────
export function friendsOf(game, uid) {
  if (game.save && !isTest(uid)) { const p = game.save.peek(uid); if (p) return (p.friends ||= {}); }
  return ((game.memFriends ||= {})[uid] ||= {});
}
export const friendLevel = v => FRIEND.steps.filter(s => (v || 0) >= s).length;
export function friendship(game, a, b) { return friendsOf(game, a)[b]?.v || 0; }
// a、b：{ uid, name }
export function addFriendship(game, a, b, pts, reason = '') {
  if (!a || !b || a.uid === b.uid || !(pts > 0)) return 0;
  if (String(a.uid).startsWith('npc:') || String(b.uid).startsWith('npc:')) return 0;
  const A = friendsOf(game, a.uid), B = friendsOf(game, b.uid), day = dayKeyOf(game.now());
  const ra = A[b.uid] ||= { n: b.name, v: 0, day: '', dv: 0 }, rb = B[a.uid] ||= { n: a.name, v: 0, day: '', dv: 0 };
  ra.n = b.name || ra.n; rb.n = a.name || rb.n;
  if (reason === 'hug') {
    if (ra.day !== day) { ra.day = day; ra.dv = 0; }
    pts = Math.min(pts, FRIEND.pairDaily - ra.dv);
    if (pts <= 0) return 0;
    ra.dv += pts; rb.day = day; rb.dv = ra.dv;
  }
  const before = Math.max(ra.v, rb.v), after = before + pts;
  ra.v = rb.v = after;
  trim(A); trim(B);
  if (game.save) game.save.dirty = true;
  const l0 = friendLevel(before), l1 = friendLevel(after);
  if (l1 > l0) {
    game.emit('friendUp', { a: a.uid, b: b.uid, aName: a.name, bName: b.name, lv: l1 });
    game.emit('banner', { text: `${a.name} 和 ${b.name} 成了「${FRIEND.names[l1 - 1]}」！${l1 === 1 ? '同时在场会放友情合体技' : `合体技升级「${FRIEND.duo[l1 - 1]}」`}`, tier: l1 >= 3 ? 5 : 4 });
  }
  return pts;
}
function trim(map) {
  const keys = Object.keys(map);
  if (keys.length <= FRIEND.max) return;
  keys.sort((x, y) => map[x].v - map[y].v);
  for (const k of keys.slice(0, keys.length - FRIEND.max)) delete map[k];
}
// 最好的朋友（onField=只看在场的）
export function bestFriend(game, f, onField = false) {
  const M = friendsOf(game, f.uid);
  let best = null;
  for (const [uid, r] of Object.entries(M)) {
    if (onField) { const o = game.pets.get(uid); if (!o || o.npc || o.egg) continue; }
    if (!best || r.v > best.v) best = { uid, name: r.n, v: r.v, lv: friendLevel(r.v) };
  }
  return best;
}

// 贴贴：跑去抱一下在场的好朋友（没有就抱最近的别人家萌宠）
export function hugFriend(game, f) {
  if (!f || f.npc || f.egg) return false;
  if (game.clock - (f.hugFAt ?? -99) < FRIEND.hugCd) return false;   // 冷却中：不提示，免得刷屏
  const bf = bestFriend(game, f, true);
  let t = bf ? game.pets.get(bf.uid) : null;
  if (!t) {
    let bd = Infinity;
    for (const o of game.pets.values()) { if (o === f || o.npc || o.egg || o.reserve) continue; const d = Math.hypot(o.x - f.x, o.y - f.y); if (d < bd) { bd = d; t = o; } }
  }
  if (!t) { game.emit('toast', { uid: f.uid, text: `${f.name}：场上还没有别人家的萌宠，先摸摸自己家的吧` }); return false; }
  f.hugFAt = game.clock; f.hugTo = t.uid; f.hugT = 2.6;
  return true;
}
// 每帧（pets.js 调用）：贴贴的萌宠跑过去，碰到就抱；返回 true = 这一帧在跑
export function stepHug(game, f, dt, walk) {
  if (!f.hugTo) return false;
  const t = game.pets.get(f.hugTo);
  f.hugT -= dt;
  if (!t || t.egg || !f.alive) { f.hugTo = null; return false; }
  const side = f.x <= t.x ? -1 : 1, goal = { x: t.x + side * 34, y: t.y + 2 };
  const d = Math.hypot(goal.x - f.x, goal.y - f.y);
  if (d > 14 && f.hugT > 0) { walk(game, f, goal, dt, 1.5); return true; }
  f.hugTo = null; f.happyT = 1.3; t.happyT = 1.3; f.facing = side < 0 ? 1 : -1;
  const got = addFriendship(game, f, t, 1, 'hug');
  score(game, f, SCORE.hugFriend); score(game, t, SCORE.hugFriend * 0.5);
  const lv = friendLevel(friendship(game, f.uid, t.uid));
  game.emit('hugFriend', { a: f.uid, b: t.uid, x: (f.x + t.x) / 2, y: Math.min(f.y, t.y), aName: f.name, bName: t.name, lv, got });
  game.emit('toast', { uid: f.uid, text: `${f.name}的${petName(f)} 和 ${t.name}的${petName(t)} 贴贴！${got ? `友情+${got}` : '（今天这一对已经贴满啦）'}${lv ? ` · ${FRIEND.names[lv - 1]}` : ''}` });
  return false;
}

// 友情合体技：好朋友同时在场、附近有坏心情时自动放
export function stepDuo(game, dt) {
  if ((game.duoT = (game.duoT || 0) - dt) > 0) return;
  game.duoT = 0.5;
  if (!liveFoes(game).length) return;
  const cd = game.duoCd ||= {};
  for (const f of game.pets.values()) {
    if (f.npc || f.egg || !f.alive || f.reserve) continue;
    const bf = bestFriend(game, f, true);
    if (!bf || bf.lv < 1) continue;
    const o = game.pets.get(bf.uid);
    if (!o || !o.alive || o.egg) continue;
    const key = f.uid < o.uid ? `${f.uid}|${o.uid}` : `${o.uid}|${f.uid}`;
    if ((cd[key] || 0) > game.clock) continue;
    if (castDuo(game, f, o, bf.lv)) { cd[key] = game.clock + FRIEND.duoCd; game.duoT = FRIEND.duoGap; return; }
  }
}
function castDuo(game, a, b, lv) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  let tgt = null, bd = Infinity;
  for (const e of liveFoes(game)) { if (e.y < FIELD.enemyTop - 20) continue; const d = Math.hypot(e.x - mx, e.y - my) - (e.role === 'boss' ? 200 : e.role === 'elite' ? 80 : 0); if (d < bd) { bd = d; tgt = e; } }
  if (!tgt || bd > 520) return false;
  const tx = tgt.x, ty = tgt.y, R = FRIEND.duoR, mul = FRIEND.duoMul[lv - 1] || 3;
  const dmg = ((a.stats?.atk || 10) + (b.stats?.atk || 10)) * mul;
  game.emit('duo', { a: { uid: a.uid, x: a.x, y: a.y - (a.h || 70) * 0.5 }, b: { uid: b.uid, x: b.x, y: b.y - (b.h || 70) * 0.5 }, tx, ty, lv, r: R,
    name: FRIEND.duo[lv - 1], aName: a.name, bName: b.name, aPet: petName(a), bPet: petName(b) });
  game.emit('banner', { text: `${a.name}的${petName(a)} × ${b.name}的${petName(b)}「${FRIEND.duo[lv - 1]}」`, tier: lv >= 3 ? 5 : 4 });
  a.happyT = 1.3; b.happyT = 1.3;
  for (const e of foesIn(game, tx, ty, R)) damageFoe(game, e, dmg * (e === tgt ? 1.2 : 1), game.random() < 0.5 ? a : b, { fx: 'heart', crit: e.role !== 'minion' });
  healPet(game, a, a.maxHp * FRIEND.duoHeal); healPet(game, b, b.maxHp * FRIEND.duoHeal);
  score(game, a, SCORE.duo); score(game, b, SCORE.duo);
  addFriendship(game, a, b, 1, 'duo');
  return true;
}

// ───────── 收服小精灵 ─────────
export const SPRITE_UNITS = Object.keys(FOES).filter(u => u !== 'gold');
function spritesHolder(game, f) {
  const p = game.save && !f.test && !f.npc ? game.save.peek(f.uid) : null;
  return p ? { map: (p.sprites ||= {}), p } : { map: (f.memSprites ||= {}), p: null };
}
export function loadSprites(game, f, prof) {
  const map = prof ? prof.sprites || {} : f.memSprites || {};
  f.spriteKinds = Object.keys(map).filter(u => map[u] > 0).length;
  f.follow = prof ? prof.follow || null : f.follow || null;
}
const rankOf = u => SPRITES.rank[FOES[u]?.kind === 'boss' ? 'boss' : FOES[u]?.kind === 'elite' ? 'elite' : u === 'thief' ? 'thief' : 'minion'] || 1;
export function tame(game, f, unit, role = 'minion') {
  if (!f || !FOES[unit] || unit === 'gold') return null;
  if (f.merc) f = game.pets.get(f.owner) || null;
  if (!f || f.npc) return null;
  const { map, p } = spritesHolder(game, f);
  const isNew = !(map[unit] > 0);
  map[unit] = (map[unit] || 0) + 1;
  if (!f.follow || rankOf(unit) >= rankOf(f.follow)) { f.follow = unit; if (p) p.follow = unit; }
  f.spriteKinds = Object.keys(map).filter(u => map[u] > 0).length;
  if (game.save) game.save.dirty = true;
  refreshStats(f);
  const name = FOES[unit].name.replace(/大王|魔王/, m => m);
  game.emit('tame', { uid: f.uid, name: f.name, unit, unitName: name, isNew, kinds: f.spriteKinds, total: SPRITE_UNITS.length, x: f.x, y: f.y, role });
  const big = role === 'boss' || role === 'elite';
  if (isNew || big) game.emit('banner', { text: `${f.name}的${petName(f)}收服了「${name}」小精灵！${isNew ? `图鉴 ${f.spriteKinds}/${SPRITE_UNITS.length}` : ''}`, tier: role === 'boss' ? 5 : big ? 4 : 3 });
  else game.emit('toast', { uid: f.uid, text: `${f.name} 又收服了一只${name}小精灵（${map[unit]}只）` });
  return { isNew };
}
export function maybeTame(game, e, by) {
  if (!by || (by.npc && !by.merc) || e.role === 'treasure' || e.role === 'boss' || e.small) return null;
  const owner = by.merc ? game.pets.get(by.owner) : by;
  if (!owner || owner.npc) return null;
  const kind = e.role === 'elite' ? 'elite' : e.kind === 'thief' ? 'thief' : 'minion';
  if (game.random() >= SPRITES.chance[kind]) return null;
  return tame(game, owner, e.unit, e.role);
}
// 小精灵加成（gear.js 的 petStats 用）
export function spriteMul(f) {
  const k = SPRITES.perKind * (f.spriteKinds || 0), F = SPRITES.follow[f.follow] || {};
  return { atk: k + (F.atk || 0), hp: k + (F.hp || 0), heal: k + (F.heal || 0) };
}

// ───────── 鲜花种花 ─────────
let flowerSeq = 0;
export function plantFlowers(game, f, n) {
  const list = (game.flowers ||= []);
  const cnt = Math.max(1, Math.min(GARDEN.perGift, n));
  const out = [];
  for (let i = 0; i < cnt; i++) {
    let x = 0, y = 0;
    for (let k = 0; k < 8; k++) {
      const a = game.random() * Math.PI * 2, r = 50 + game.random() * 120;
      x = clamp((f.x || 360) + Math.cos(a) * r, 40, W - 40); y = clamp((f.y || 800) + Math.sin(a) * r * 0.5, FIELD.top + 140, FIELD.bottom - 10);
      if (!(Math.abs(x - TREE.x) < 135 && y > TREE.y - TREE.h - 20)) break;   // 不种在心愿树身上
    }
    const fl = { id: ++flowerSeq, x, y, uid: f.uid, name: f.name, color: (f.uid.length + list.length + i) % 4, t: 0, sway: game.random() * 6 };
    list.push(fl); out.push(fl);
    game.emit('plant', { x, y, name: f.name, color: fl.color });
  }
  while (list.length > GARDEN.max) list.shift();
  return out;
}
export function stepGarden(game, dt) {
  const list = game.flowers;
  if (!list?.length) return;
  for (const fl of list) fl.t += dt;
  if ((game.gardenT = (game.gardenT || 0) - dt) > 0) return;
  game.gardenT = 0.5;
  const got = new Map();
  for (const fl of list) {
    if (fl.t < GARDEN.grow) continue;
    for (const p of petsIn(game, fl.x, fl.y, GARDEN.healR)) {
      const n = got.get(p) || 0;
      if (n >= 2 || p.hp >= p.maxHp) continue;
      got.set(p, n + 1);
      healPet(game, p, p.maxHp * GARDEN.heal * 0.5);
    }
    for (const e of game.foes) if (e.alive && !e.purified && inGround(e.x, e.y, fl.x, fl.y, GARDEN.slowR)) slowE(e, GARDEN.slow, 0.7, game.clock);
  }
}
// 换季（新的一章）花园清空
export function gardenNewStage(game, ch) {
  if (game.gardenCh !== ch) { game.flowers = []; game.gardenCh = ch; }
}
