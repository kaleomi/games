// 礼物、点赞、签到；礼物只加BUFF、叫小伙伴、给「正常掉落」加保底品质 / 翻倍
import { GIFTS, GIFT_TITLES, MORALE, TALENT, GEAR, FIELD, W, TREE, BOND, LEVEL } from './config.js';
import { rollTalent, makeItem, rollItem, SLOT_IDS, starOf, talentMul } from './gear.js';
import { castUlt, setupPet, refreshStats } from './pets.js';
import { addProj, rollCrit, liveFoes, healTree, LANES } from './combat.js';
import { spawnFoe } from './foes.js';
import { bossMax, chapterOf } from './stage.js';
import { giveItem, dropTimes, lootFloor, profileOf, petRecord } from './loot.js';
import { dayKeyOf } from './save.js';

export function giftKind(gift, custom = null) {
  const name = String(gift?.name || '');
  if (custom && custom[name]) return custom[name];
  for (const [k, v] of Object.entries(GIFTS.byName)) if (name.includes(k)) return v;
  const price = Number(gift?.price) || 1;
  for (const [min, kind] of GIFTS.byValue) if (price >= min) return kind;
  return 'heart';
}

const now = game => game.clock;
const active = (until, game) => (until || 0) > now(game);
export function teamAtkMul(game) { let m = 1; if (active(game.partyUntil, game)) m += GIFTS.drum.atk; if (active(game.moraleUntil, game)) m += MORALE.dmg; return m; }
export function xpMul(game, f) { return (active(f.xpUntil, game) ? 1 + GIFTS.heart.xp : 1) * (active(game.harvestUntil, game) ? 1.3 : 1) * (1 + (f.stats?.xp || 0)); }
function addFloor(game, f, tier, sec) {
  const list = (f.floors || []).filter(x => x.until > now(game));
  const cur = list.find(x => x.tier === tier);
  if (cur) cur.until = Math.max(cur.until, now(game)) + sec; else list.push({ tier, until: now(game) + sec });
  f.floors = list;
}
const extend = (until, game, sec) => Math.max(until || 0, now(game)) + sec;
const who = f => (f.nick ? `${f.name}的${f.nick}` : f.name);

export function addBond(game, f, n) {
  const d = petRecord(game, f), holder = d || f;
  const before = holder.bond || 0;
  holder.bond = before + n; f.bond = holder.bond;
  if (d) game.save.dirty = true;
  const lv0 = BOND.steps.filter(s => before >= s).length, lv1 = BOND.steps.filter(s => f.bond >= s).length;
  if (lv1 > lv0) { refreshStats(f); game.emit('bondUp', { uid: f.uid, name: f.name, nick: f.nick, sp: f.sp, lv: lv1 }); }
}

export function applyGift(game, f, kind, amount) {
  const G = GIFTS, n = Math.max(1, amount);
  const tName = t => GEAR.tiers[t].name;
  switch (kind) {
    case 'forge': awaken(game, f, Math.min(n, TALENT.maxPerGift)); break;
    case 'heart':
      f.xpUntil = extend(f.xpUntil, game, G.heart.sec * n);
      if (f.skillCd > 0) f.freeSkill = true;
      f.skillCd = 0; f.happyT = 1.3;
      addBond(game, f, BOND.heart * Math.min(n, 10));
      game.emit('feed', { uid: f.uid, sp: f.sp, x: f.x, y: f.y, n });
      game.emit('banner', { uid: f.uid, name: f.name, text: `投喂零食！经验+50% 还剩${Math.ceil(f.xpUntil - now(game))}秒 · 亲密度+${BOND.heart * Math.min(n, 10)}`, tier: 1 });
      break;
    case 'flower':
      for (let i = 0; i < Math.min(n, G.flower.maxPerGift); i++) summonMerc(game, f);
      if (f.alive && !f.egg) castUlt(game, f, { free: true });
      game.emit('banner', { uid: f.uid, name: f.name, text: `呼朋唤友！叫来${Math.min(n, G.flower.maxPerGift)}只小伙伴，立即放大招`, tier: 2 });
      break;
    case 'drum':
      game.partyUntil = extend(game.partyUntil, game, G.drum.sec * n);
      addFloor(game, f, G.drum.floor, G.drum.floorSec * n);
      game.rainT = (game.rainT || 0) + G.drum.rainSec * n; game.rainOwner = f.uid;
      game.emit('banner', { uid: f.uid, name: f.name, text: `爱心派对！全队攻击+30% · 爱心雨 · 自己掉落保底${tName(G.drum.floor)}`, tier: 3 });
      break;
    case 'spirit':
      f.spiritUntil = extend(f.spiritUntil, game, G.spirit.sec * n);
      addFloor(game, f, G.spirit.floor, G.spirit.floorSec * n);
      game.emit('banner', { uid: f.uid, name: f.name, text: `戴上酷酷墨镜！攻击+30% · 酷酷光波 · 掉落保底${tName(G.spirit.floor)}`, tier: 4 });
      break;
    case 'double':
      f.doubleUntil = extend(f.doubleUntil, game, G.double.sec * n);
      addFloor(game, f, G.double.floor, G.double.floorSec * n);
      game.emit('banner', { uid: f.uid, name: f.name, text: `庆典双倍 ${Math.ceil((f.doubleUntil - now(game)) / 60)}分钟！装备掉落×2 · 保底${tName(G.double.floor)}`, tier: 5 });
      break;
    case 'treasure': {
      game.emit('truck', { uid: f.uid, name: f.name, n });
      for (let i = 0; i < Math.min(n, G.treasure.maxAlive); i++) summonGold(game, f);
      // 甜品车开过：在场每只萌宠吃到甜点（经验）、心愿树长回两个果子
      for (const o of game.pets.values()) if (!o.npc && !o.merc && !o.test) game.grantXp(o, 60 + 20 * chapterOf(game.stage?.n || 1), null, true);
      if (game.tree) healTree(game, game.tree.maxHp / TREE.fruits * 2);
      const red = GEAR.tiers.length - 1;
      for (let i = 0; i < n * dropTimes(game, f); i++) {
        const missing = SLOT_IDS.filter(sl => !(f.gear?.[sl]?.tier >= red));
        const pool = missing.length ? missing : SLOT_IDS;
        const item = makeItem(game.random, pool[Math.floor(game.random() * pool.length)], red);
        giveItem(game, f, item, { source: 'gift' });
      }
      game.emit('banner', { uid: f.uid, name: f.name, text: '梦幻甜品车开过来啦！人人有甜点，金色偷果鼠出没，净化它全员分宝', tier: 5 });
      break;
    }
    default: break;
  }
  if (GIFT_TITLES[kind]) game.emit('giftfx', { uid: f.uid, kind, n });
  saveBuffs(game, f);
}

// ───────── 天赋觉醒：重洗当前萌宠的天赋，随机出一档，取最好；有机会变闪光 ─────────
export function awaken(game, f, times = 1) {
  const T = TALENT.tiers, top = T.length - 1;
  const d = petRecord(game, f) || (f.talentMem ||= { talent: f.talent || 0, talentPity: 0, star: f.star || 0, sub: f.sub || 0, shiny: !!f.shiny, shinyPity: 0 });
  const from = d.talent || 0, fromStar = starOf(d), fromSub = fromStar ? d.sub || 0 : 0, mulFrom = talentMul(d);
  let star = fromStar, sub = fromSub, tal = from, pityHit = false, shinyNew = false;
  const rolls = [];
  for (let i = 0; i < times; i++) {
    let r = rollTalent(game.random);
    d.talentPity = (d.talentPity || 0) + 1;
    if (r < top && d.talentPity >= TALENT.pity) { r = top; pityHit = true; }
    if (r === top) d.talentPity = 0;
    rolls.push(r);
    if (r === top) { if (tal === top) star++; else star = Math.max(star, 1); tal = top; sub = 0; }
    else if (tal === top) { if (r > sub) sub = r; }
    else if (r > tal) tal = r;
    if (!d.shiny) {
      d.shinyPity = (d.shinyPity || 0) + 1;
      if (game.random() < TALENT.shiny.chance || d.shinyPity >= TALENT.shiny.pity) { d.shiny = true; shinyNew = true; }
    }
  }
  const best = Math.max(...rolls);
  d.talent = tal; d.star = star; d.sub = sub;
  f.talent = tal; f.star = star; f.sub = sub; f.shiny = !!d.shiny;
  if (petRecord(game, f)) game.save.dirty = true;
  refreshStats(f);
  const mulTo = talentMul(d);
  game.emit('awaken', { uid: f.uid, name: f.name, nick: f.nick, sp: f.sp, from, to: tal, best, rolls, up: mulTo > mulFrom, fromStar, star, fromSub, sub, mulFrom, mulTo, pityHit, pity: d.talentPity || 0, shinyNew, shiny: f.shiny, level: f.level });
  if (shinyNew) game.emit('banner', { uid: f.uid, name: f.name, text: `✦ 闪光了！${who(f)}变成了异色闪光萌宠，全属性×1.1 ✦`, tier: 5 });
  return { from, to: tal, rolls, star, sub, shinyNew };
}

// ───────── 小伙伴（同种幼崽NPC，不进榜） ─────────
function summonMerc(game, owner) {
  const uid = `merc:${++game.npcSeq}`;
  const m = { uid, npc: true, merc: true, owner: owner.uid, name: `${String(owner.nick || owner.name).slice(0, 5)}的小伙伴`, avatar: '', sp: owner.sp, level: Math.max(1, Math.floor((owner.level || 1) * 0.8)),
    gear: { ...(owner.gear || {}) }, talent: owner.talent || 0, star: owner.star || 0, sub: owner.sub || 0, homeX: LANES[Math.floor(game.random() * 3)], until: game.clock + GIFTS.flower.sec, merit: 0, lastActive: game.now(), mini: true };
  setupPet(game, m, { keepCd: false });
  m.x = owner.x + (game.random() - 0.5) * 60; m.y = Math.min(FIELD.bottom, owner.y + 20);
  game.pets.set(uid, m);
  game.emit('hit', { kind: 'smoke', x: m.x, y: m.y - 20, k: 0.8 });
  return m;
}
// ───────── 金色偷果鼠 ─────────
function summonGold(game, owner) {
  const alive = game.foes.filter(e => e.role === 'treasure' && e.alive && !e.purified).length;
  if (alive >= GIFTS.treasure.maxAlive) return;
  const e = spawnFoe(game, 'gold', 120 + game.random() * 480, FIELD.enemyTop - 30, { role: 'treasure', kind: 'treasure', hp: Math.round(bossMax(game.stage?.n || 1) * GIFTS.treasure.hpFrac), name: '金色偷果鼠', hitters: true, force: true });
  if (e) { e.owner = owner.uid; e.wp = { x: 360, y: 600 }; }
}
export function goldPurified(game, e) {
  const ch = chapterOf(game.stage?.n || 1);
  const xp = Math.round((50 + 30 * ch) * GIFTS.treasure.xpMul);
  const ppl = game.humans().filter(f => !f.reserve);
  game.emit('banner', { text: `金色偷果鼠被净化！把宝贝分给在场${ppl.length}只萌宠`, tier: 5 });
  for (const f of ppl) {
    for (let k = 0; k < dropTimes(game, f); k++) {
      let item = rollItem(game.random, ch);
      const fl = lootFloor(game, f);
      if (fl > item.tier) item = makeItem(game.random, item.slot, fl);
      giveItem(game, f, item, { source: 'gold' });
    }
    if (e.hitters?.has(f.uid)) game.grantXp(f, xp, '分宝经验');
  }
}

// ───────── 点赞：爱心能量满了全队加伤害、心愿树长回一个果子 ─────────
export function moraleLike(game, f, n) {
  if (game.clock - (f.moraleWinT || 0) >= 1) { f.moraleWinT = game.clock; f.moraleWin = 0; }
  const add = Math.max(0, Math.min(n, MORALE.capPerSec - (f.moraleWin || 0)));
  f.moraleWin = (f.moraleWin || 0) + add;
  game.morale = (game.morale || 0) + add;
  if (game.morale >= MORALE.need) {
    game.morale -= MORALE.need;
    game.moraleUntil = extend(game.moraleUntil, game, MORALE.sec);
    const grew = game.phase === 'battle' && game.tree ? healTree(game, game.tree.maxHp / TREE.fruits * TREE.regenLike) : 0;
    game.emit('banner', { text: `爱心能量满${MORALE.need}！全队伤害+${Math.round(MORALE.dmg * 100)}% ${MORALE.sec}秒${grew > 0 ? ' · 心愿树长回一个果子' : ''}`, tier: 3 });
    game.emit('loveFull', {});
  }
}

// ───────── 签到：每天一件装备（抽两次取好） ─────────
export function dailyCheckin(game, f) {
  const day = dayKeyOf(game.now());
  const p = profileOf(game, f), holder = p || f;
  if (holder.checkinDay === day) { game.emit('toast', { uid: f.uid, text: `${f.name} 今天已经签到过了` }); return false; }
  holder.checkinDay = day;
  if (p) game.save.dirty = true;
  const n = Math.max(game.stage?.n || 0, game.save?.data?.stage || 1);
  const item = rollItem(game.random, chapterOf(n), 1);
  game.emit('banner', { uid: f.uid, name: f.name, text: '签到成功，领到今天的小礼物', tier: 1 });
  giveItem(game, f, item, { source: 'checkin' });
  addBond(game, f, 2);
  return true;
}

// ───────── 个人BUFF存档：刷新页面不丢 ─────────
export function saveBuffs(game, f) {
  const p = profileOf(game, f);
  if (!p) return;
  const ms = u => (u || 0) > now(game) ? game.now() + (u - now(game)) * 1000 : 0;
  p.buffs = { xp: ms(f.xpUntil), spirit: ms(f.spiritUntil), double: ms(f.doubleUntil), floors: (f.floors || []).filter(x => x.until > now(game)).map(x => ({ tier: x.tier, until: ms(x.until) })),
    mercs: [...game.pets.values()].filter(m => m.merc && m.owner === f.uid).map(m => ms(m.until)).filter(Boolean) };
  game.save.dirty = true;
}
export function loadBuffs(game, f, p) {
  const b = p?.buffs; if (!b) return;
  const at = ms => ms > game.now() ? now(game) + (ms - game.now()) / 1000 : 0;
  f.xpUntil = at(b.xp); f.spiritUntil = at(b.spirit); f.doubleUntil = at(b.double);
  f.floors = (b.floors || []).map(x => ({ tier: x.tier, until: at(x.until) })).filter(x => x.until > 0);
  if (![...game.pets.values()].some(m => m.merc && m.owner === f.uid)) for (const u of b.mercs || []) { const left = at(u); if (left > now(game) + 1) { const m = summonMerc(game, f); if (m) m.until = left; } }
}
export function pauseSummons(game, f) {
  const P = (f.paused = { mercs: [] });
  for (const m of [...game.pets.values()]) if (m.merc && m.owner === f.uid) { P.mercs.push(Math.max(0, m.until - game.clock)); game.pets.delete(m.uid); }
}
export function resumeSummons(game, f) {
  const P = f.paused; f.paused = null;
  if (!P) return;
  for (const left of P.mercs) if (left > 1) { const m = summonMerc(game, f); if (m) m.until = game.clock + left; }
}

// ───────── 每帧：小伙伴到期、爱心雨 ─────────
export function stepGifts(game, dt, combat) {
  game.teamAtkMul = teamAtkMul(game);
  if ((game.buffSyncT = (game.buffSyncT || 0) - dt) <= 0) { game.buffSyncT = 5; for (const f of game.humans()) if (f.xpUntil || f.spiritUntil || f.doubleUntil || f.floors?.length) saveBuffs(game, f); }
  for (const m of [...game.pets.values()]) if (m.merc && game.clock > m.until) { game.emit('hit', { kind: 'smoke', x: m.x, y: m.y - 20, k: 0.8 }); game.pets.delete(m.uid); }
  if (combat && game.rainT > 0) {   // 爱心雨：从天上落下的爱心，追着坏心情砸
    game.rainT -= dt;
    const n = Math.round(GIFTS.drum.rainPerSec * dt + game.random());
    const o = game.pets.get(game.rainOwner), base = (o?.stats?.atkBase || 10) * GIFTS.drum.rainAtk;
    const pool = liveFoes(game);
    for (let i = 0; i < n && pool.length; i++) {
      const e = pool[Math.floor(game.random() * pool.length)];
      const x = Math.max(10, Math.min(W - 10, e.x + (game.random() - 0.5) * 160));
      addProj(game, { team: 'p', kind: 'heart', big: true, x, y: 70, vx: (e.x - x) * 0.8, vy: 700, owner: game.rainOwner, dmg: base, homing: 3, fixed: e, life: 1.8, r: 14 });
    }
  }
}
export { LEVEL, rollCrit };
