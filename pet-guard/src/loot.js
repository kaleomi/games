// 掉落：过关按顺序发装备（给当前萌宠），保底，小怪额外白装，礼物保底品质 / 双倍
import { GEAR, SMALL_DROP } from './config.js';
import { SLOT_IDS, makeItem, rollItem, applyItem, describeItem, itemName } from './gear.js';
import { refreshStats } from './pets.js';
import { chapterOf } from './stage.js';
import { petData } from './save.js';

const TOP = GEAR.tiers.length - 1;
export function profileOf(game, f) { return !f.test && !f.npc && !f.merc ? game.save?.peek(f.uid) : null; }
// 当前萌宠在存档里的记录（测试、NPC 没有）
export function petRecord(game, f) { const p = profileOf(game, f); return p ? petData(p, f.sp) : null; }
export function shardsOf(game, f) { const p = profileOf(game, f); return p ? p.shards : (f.shardsMem ||= [0, 0, 0, 0, 0]); }
export function pityOf(game, f) { const p = profileOf(game, f); return p ? (p.pity ||= { gold: 0, red: 0 }) : (f.pityMem ||= { gold: 0, red: 0 }); }
export function lootFloor(game, f) { let t = -1; for (const fl of f.floors || []) if (fl.until > game.clock) t = Math.max(t, fl.tier); return t; }
export function dropTimes(game, f) { return f && (f.doubleUntil || 0) > game.clock ? 2 : 1; }

export function giveItem(game, f, item, { silent = false, source = '' } = {}) {
  if (!f.gear) f.gear = {};
  const { result, crafted } = applyItem(f.gear, shardsOf(game, f), item, game.random);
  refreshStats(f);
  if (game.save && !f.test) game.save.dirty = true;
  if (!silent) {
    game.emit('loot', { uid: f.uid, name: f.name, item, ...result, source, text: describeItem(item), label: itemName(item) });
    for (const c of crafted) game.emit('craft', { uid: f.uid, name: f.name, item: c.item, from: c.from, text: describeItem(c.item) });
  }
  return result;
}

export function dropOrder(game) {
  const all = game.humans().filter(f => !f.reserve);
  const gifters = all.filter(f => (f.giftRound || 0) > 0).sort((a, b) => b.giftRound - a.giftRound || b.merit - a.merit);
  const others = all.filter(f => !(f.giftRound > 0) && f.merit > 0).sort((a, b) => b.merit - a.merit);
  return [...gifters, ...others];
}
// 小关：第1名必掉，其余20%；精英关：前三必掉，其余50%；首领关：前三必掉（第一抽两次取好），其余65%
const RULE = { wave: { sure: 1, rest: 0.2 }, elite: { sure: 3, rest: 0.5 }, boss: { sure: 3, rest: 0.65 } };
export function rollDrops(game, kind, n) {
  const ch = chapterOf(n), R = RULE[kind] || RULE.wave, drops = [];
  dropOrder(game).forEach((f, rank) => {
    if (rank >= R.sure && game.random() >= R.rest) return;
    for (let k = 0; k < dropTimes(game, f); k++) {
      let item = rollItem(game.random, ch, rank === 0 && kind === 'boss' ? 1 : 0);
      const fl = lootFloor(game, f);
      if (fl > item.tier) item = makeItem(game.random, item.slot, fl);
      const pity = pityOf(game, f), P = GEAR.pity;
      let pityHit = null;
      if (ch >= 6 && pity.red + 1 >= P.red && item.tier < TOP) {
        const missing = SLOT_IDS.filter(sl => !(f.gear?.[sl]?.tier >= TOP));
        const slot = missing.length ? missing[Math.floor(game.random() * missing.length)] : item.slot;
        item = makeItem(game.random, slot, TOP); pityHit = 'red';
      } else if (pity.gold + 1 >= P.gold && item.tier < TOP - 1) { item = makeItem(game.random, item.slot, TOP - 1); pityHit = 'gold'; }
      pity.gold = item.tier >= TOP - 1 ? 0 : pity.gold + 1;
      if (ch >= 6) pity.red = item.tier >= TOP ? 0 : pity.red + 1;
      if (pityHit) game.emit('pity', { uid: f.uid, name: f.name, kind: pityHit, item });
      const res = giveItem(game, f, item, { source: kind });
      drops.push({ uid: f.uid, name: f.name, sp: f.sp, nick: f.nick, item, gifted: (f.giftRound || 0) > 0, pity: pityHit, ...res });
    }
  });
  return drops;
}
// 小关额外：真人净化小怪 10% 掉1件普通装备给随机一只在场萌宠（每关最多3件）
export function smallPurify(game, e, by) {
  const s = game.stage;
  if (!s || s.kind !== 'wave' || e.role !== 'minion' || !by || by.npc || by.merc) return null;
  if ((s.smallDrops || 0) >= SMALL_DROP.maxPerStage || game.random() >= SMALL_DROP.chance) return null;
  const ppl = game.humans().filter(f => f.alive && !f.reserve && !f.egg);
  if (!ppl.length) return null;
  const to = ppl[Math.floor(game.random() * ppl.length)];
  const item = makeItem(game.random, SLOT_IDS[Math.floor(game.random() * SLOT_IDS.length)], 0);
  s.smallDrops = (s.smallDrops || 0) + 1;
  giveItem(game, to, item, { source: 'small' });
  game.emit('pickup', { x: e.x, y: e.y, to: to.uid, kind: 'box' });
  return { to, item };
}
// 不在场的人：直接按存档给
export function grantProfileItem(game, p, sp, item) {
  const d = petData(p, sp);
  applyItem(d.gear, p.shards, item, game.random);
  game.save.dirty = true;
}
