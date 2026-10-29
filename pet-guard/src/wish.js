// 萌宠保卫战独有：许愿果、心愿成真、抱抱首领
// 心愿树上的每个果子都可以挂一个观众的真实心愿（「许愿 考研上岸」）；
// 偷果鼠偷走的是「某某的心愿」，抢回来的人和许愿的人结下友情；
// 首领打空不消失，委屈大哭，全场发「抱抱」安慰它；安慰好了，树上的心愿变成灯笼飞上天（心愿成真）。
import { TREE, WISH, COMFORT, FOES, SCORE, FIELD, W, SPECIES } from './config.js';
import { cleanWish } from './save.js';
import { score } from './combat.js';

// ───────── 心愿存放：存档里一份（刷新页面不丢），没有存档就放内存 ─────────
export function wishStore(game) {
  if (game.save) { const d = game.save.data; d.wishes ||= { slots: [], queue: [] }; d.wishes.slots ||= []; d.wishes.queue ||= []; return d.wishes; }
  return (game.memWishes ||= { slots: [], queue: [] });
}
const dirty = game => { if (game.save) game.save.dirty = true; };
export const wishAt = (game, i) => wishStore(game).slots[i] || null;
export function wishCount(game) { const W2 = wishStore(game); return W2.slots.filter(Boolean).length + W2.queue.length; }

// 每关开始：果子全长满，心愿接着挂（上一关的还在）
export function initTreeSlots(game) {
  if (!game.tree) return;
  game.tree.slots = Array.from({ length: TREE.fruits }, () => ({ on: true }));
  fillFromQueue(game);
  syncFruits(game);
}
function fillFromQueue(game) {
  const S = wishStore(game);
  for (let i = 0; i < TREE.fruits && S.queue.length; i++) if (!S.slots[i]) { S.slots[i] = S.queue.shift(); game.emit('wishHang', { i, ...S.slots[i] }); }
  dirty(game);
}

// 让「亮着的果子」数量跟心愿树血量对上；返回这次掉了哪几个
// mode=steal：偷果鼠优先偷挂着心愿的；长回来时优先长有心愿的那几个
export function syncFruits(game, mode = 'hit') {
  const t = game.tree;
  if (!t?.slots) return [];
  const per = t.maxHp / TREE.fruits, target = Math.max(0, Math.min(TREE.fruits, Math.ceil(t.hp / per - 1e-6)));
  const on = t.slots.map((s, i) => (s.on ? i : -1)).filter(i => i >= 0);
  const lost = [];
  let n = on.length;
  const pick = list => list[Math.floor(game.random() * list.length)];
  while (n > target) {
    const cand = t.slots.map((s, i) => (s.on ? i : -1)).filter(i => i >= 0);
    const withWish = cand.filter(i => wishAt(game, i));
    const i = mode === 'steal' && withWish.length && game.random() < WISH.stealWish ? pick(withWish) : pick(cand);
    t.slots[i].on = false; lost.push(i); n--;
  }
  while (n < target) {
    const off = t.slots.map((s, i) => (!s.on ? i : -1)).filter(i => i >= 0);
    if (!off.length) break;
    const withWish = off.filter(i => wishAt(game, i));
    const i = withWish.length ? withWish[0] : pick(off);
    t.slots[i].on = true; n++;
  }
  t.lastLost = lost;
  return lost;
}

// ───────── 许愿 ─────────
function blocked(game, text) {
  const words = String(game.settings.wishBlock || '').split(/[\s,，、;；|]+/).filter(w => w.length >= 1);
  return words.some(w => text.includes(w));
}
export function makeWish(game, f, raw) {
  if (!f || f.npc) return false;
  const text = cleanWish(raw);
  if (!text) { game.emit('toast', { uid: f.uid, text: `${f.name}：心愿只能用文字，最多${WISH.maxLen}个字，比如「许愿 考试顺利」` }); return false; }
  if (blocked(game, text)) { game.emit('toast', { uid: f.uid, text: `${f.name}：这个心愿挂不上心愿树哦，换一个吧` }); return false; }
  if (game.clock - (f.wishAt ?? -99) < 15) { game.emit('toast', { uid: f.uid, text: `${f.name}：心愿树还在记上一个心愿，稍等一下再许` }); return false; }
  f.wishAt = game.clock;
  const S = wishStore(game), w = { uid: f.uid, name: f.name, text, t: game.now() };
  // 同一个人只挂一个心愿：已经挂着的就改写
  const at = S.slots.findIndex(x => x && x.uid === f.uid);
  if (at >= 0) { S.slots[at] = w; dirty(game); game.emit('wish', { uid: f.uid, name: f.name, text, i: at, update: true }); return true; }
  const qi = S.queue.findIndex(x => x.uid === f.uid);
  if (qi >= 0) { S.queue[qi] = w; dirty(game); game.emit('toast', { uid: f.uid, text: `${f.name} 的心愿改成「${text}」，排在第${qi + 1}位` }); return true; }
  // 空位：优先挂在亮着的果子上，马上就能看到
  const slots = game.tree?.slots;
  let i = -1;
  for (let k = 0; k < TREE.fruits; k++) if (!S.slots[k] && (!slots || slots[k]?.on)) { i = k; break; }
  if (i < 0) for (let k = 0; k < TREE.fruits; k++) if (!S.slots[k]) { i = k; break; }
  if (i >= 0) { S.slots[i] = w; dirty(game); game.emit('wish', { uid: f.uid, name: f.name, text, i }); game.emit('banner', { text: `${f.name} 许愿「${text}」，挂上了心愿树`, tier: 2 }); return true; }
  if (S.queue.length >= WISH.queue) { game.emit('toast', { uid: f.uid, text: `${f.name}：心愿树挂满了，等打完这章首领、心愿成真后再许吧` }); return false; }
  S.queue.push(w); dirty(game);
  game.emit('toast', { uid: f.uid, text: `${f.name} 许愿「${text}」，心愿树挂满了，排在第${S.queue.length}位（心愿成真后挂上去）` });
  return true;
}

// 偷果鼠偷到了第 i 个果子：心愿跟着被带走
export function takeWish(game, i) {
  const S = wishStore(game), w = S.slots[i] || null;
  if (!w) return null;
  S.slots[i] = null; dirty(game);
  game.emit('banner', { text: `偷果鼠偷走了「${w.name}的心愿：${w.text}」！快净化它抢回来！`, tier: 4 });
  game.emit('wishStolen', { ...w, i });
  return w;
}
// 偷果鼠跑掉了：心愿丢了（再许一次就行）
export function loseWish(game, w) {
  if (!w) return;
  game.emit('toast', { uid: w.uid, text: `${w.name} 的心愿「${w.text}」被偷果鼠带走了……再许一次吧` });
  game.emit('wishLost', { ...w });
  fillFromQueue(game);
}
// 净化了偷果鼠：心愿挂回树上（先挂到空着的果子上，healTree 再把它长出来）
export function returnWish(game, w, by) {
  if (!w) return;
  const S = wishStore(game), slots = game.tree?.slots;
  let i = -1;
  for (let k = 0; k < TREE.fruits; k++) if (!S.slots[k] && slots && !slots[k]?.on) { i = k; break; }
  if (i < 0) for (let k = 0; k < TREE.fruits; k++) if (!S.slots[k]) { i = k; break; }
  if (i >= 0) S.slots[i] = w; else S.queue.unshift(w);
  dirty(game);
  const o = by?.merc ? game.pets.get(by.owner) : by;
  const hero = o && !o.npc ? o : null;
  game.emit('wishBack', { ...w, i, by: hero?.uid, byName: hero?.name });
  if (hero && hero.uid !== w.uid) {
    game.emit('banner', { text: `${hero.name}的${hero.nick || SPECIES[hero.sp]?.name || '萌宠'}抢回了${w.name}的心愿「${w.text}」！两人友情+${WISH.rescue}`, tier: 4 });
    game.addFriendship(hero, { uid: w.uid, name: w.name }, WISH.rescue, 'rescue');
  } else game.emit('banner', { text: `${w.name}的心愿「${w.text}」抢回来啦！`, tier: 3 });
}

// ───────── 心愿成真：首领被安慰好以后，树上亮着的心愿都变成灯笼飞上天 ─────────
export function wishesComeTrue(game) {
  const S = wishStore(game), t = game.tree, ch = game.stage?.ch || 1, list = [];
  for (let i = 0; i < TREE.fruits; i++) {
    const w = S.slots[i];
    if (!w || !(t?.slots?.[i]?.on)) continue;
    list.push({ ...w, i });
    S.slots[i] = null;
    const p = game.save && !String(w.uid).startsWith('test:') ? game.save.peek(w.uid) : null;
    if (p) p.wishTrue = (p.wishTrue || 0) + 1;
    const f = game.pets.get(w.uid);
    if (f) { game.grantXp(f, WISH.xp(ch), null, true); game.addBondTo(f, WISH.bond); f.happyT = 1.3; }
  }
  if (game.save) game.save.data.wishTotal = (game.save.data.wishTotal || 0) + list.length; else game.memWishTotal = (game.memWishTotal || 0) + list.length;
  dirty(game);
  game.lastWishTrue = list.length;
  if (list.length) {
    game.emit('wishTrue', { list });
    game.emit('banner', { text: `心愿成真！${list.length} 个心愿变成灯笼飞上了天`, tier: 5 });
  }
  fillFromQueue(game);
  return list;
}

// ───────── 抱抱首领 ─────────
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function startComfort(game, e) {
  const s = game.stage;
  e.alive = false; e.sad = true; e.hp = 0; e.act = null; e.anim = 'sad'; e.sadT = 0;
  let humans = 0; for (const f of game.pets.values()) if (!f.npc) humans++;
  s.sub = 'comfort';
  s.comfort = { id: e.id, need: clamp(Math.round(humans * COMFORT.perHuman), COMFORT.min, COMFORT.max), have: 0, t: 0, by: new Map(), names: new Map() };
  // 小坏心情们也被感动了：一起变开心；弹幕、躲雨区域全收掉
  for (const o of game.foes) if (o !== e && o.alive && !o.purified) { o.alive = false; o.purified = 0.001; game.emit('purify', { id: o.id, x: o.x, y: o.y, role: o.role, unit: o.unit, quiet: true }); }
  game.projs = game.projs.filter(b => b.team === 'p');
  game.zones.length = 0;
  game.emit('comfortStart', { id: e.id, name: e.name, unit: e.unit, need: s.comfort.need, x: e.x, y: e.y });
}
export function comforting(game) { return game.phase === 'battle' && game.stage?.sub === 'comfort'; }
export function hugBoss(game, f, { auto = false, free = false } = {}) {
  if (!comforting(game) || !f) return false;
  const c = game.stage.comfort;
  if (!free && game.clock - (f.hugBossAt ?? -99) < COMFORT.cd) return false;
  f.hugBossAt = game.clock;
  c.have++;
  if (!f.npc) { const o = f.merc ? game.pets.get(f.owner) || f : f; c.by.set(o.uid, (c.by.get(o.uid) || 0) + 1); c.names.set(o.uid, o.name); if (!auto) score(game, o, SCORE.hug); }
  if (f.alive && !f.egg) f.happyT = 1.3;
  const e = game.foes.find(x => x.id === c.id);
  game.emit('hugBoss', { uid: f.uid, x: f.x, y: f.y, bx: e?.x ?? 360, by: (e?.y ?? 500) - (e?.h ?? 200) * 0.5, auto });
  return true;
}
export function stepComfort(game, dt) {
  const s = game.stage, c = s.comfort;
  if (!c || c.done) return;
  c.t += dt;
  for (const f of game.pets.values()) {
    if (f.egg) continue;
    if (f.npc && !f.merc) { f.hugAcc = (f.hugAcc || 0) + COMFORT.npc * dt; if (f.hugAcc >= 1) { f.hugAcc -= 1; hugBoss(game, f, { auto: true, free: true }); } }
    else if (!f.npc && (f.auto || 0) > 0 && game.clock - (f.hugBossAt ?? -99) >= COMFORT.auto) hugBoss(game, f, { auto: true });
  }
  if (c.have >= c.need) finishComfort(game, (COMFORT.grades.find(([sec]) => c.t <= sec) || [0, 'B'])[1]);
  else if (c.t >= COMFORT.secs) finishComfort(game, 'C');
}
function finishComfort(game, grade) {
  const s = game.stage, c = s.comfort;
  c.done = true; c.grade = grade; s.grade = grade;
  s.sub = 'ceremony'; s.t = COMFORT.ceremony;
  const e = game.foes.find(x => x.id === c.id);
  const top = [...c.by.entries()].sort((a, b) => b[1] - a[1]);
  if (e) { e.sad = false; e.comforted = true; e.purified = 0.001; game.emit('purify', { id: e.id, x: e.x, y: e.y, role: 'boss', unit: e.unit, boss: true }); }
  game.emit('comforted', { name: e?.name || '首领', unit: e?.unit, grade, secs: Math.round(c.t * 10) / 10, hugs: c.have, need: c.need, top: top.slice(0, 3).map(([uid, n]) => ({ uid, name: c.names.get(uid), n })) });
  game.emit('banner', { text: grade === 'C' ? `${e?.name || '首领'}自己慢慢不哭了……下次多来几个人抱抱它吧` : `${e?.name || '首领'}被大家抱抱治愈啦！安慰评价 ${grade}（${Math.round(c.t * 10) / 10}秒）`, tier: 5 });
  game.emit('shake', { k: 6 });
  // 安慰最多的人：首领变成小精灵跟着他的萌宠
  const best = top.length ? game.pets.get(top[0][0]) : null;
  if (best && e) game.tame(best, e.unit, 'boss');
  game.comfortBonus(grade, top.map(([uid]) => uid));
  wishesComeTrue(game);
}
// 委屈大哭时萌宠们围过来（在 pets.js 里用）
export function comfortSpot(game, f) {
  const s = game.stage;
  if (!s || (s.sub !== 'comfort' && s.sub !== 'ceremony')) return null;
  const e = game.foes.find(x => x.id === s.comfort?.id);
  if (!e) return null;
  const h = (f.uid.length * 37 + (f.uid.charCodeAt(f.uid.length - 1) || 0) * 13) % 360, a = h / 360 * Math.PI * 2;
  const r = 130 + (h % 5) * 14;
  return { x: clamp(e.x + Math.cos(a) * r, 40, W - 40), y: clamp(e.y + 20 + Math.sin(a) * r * 0.45, FIELD.top + 20, FIELD.bottom - 20), face: e.x >= f.x ? 1 : -1 };
}
export { FOES };
