// 星舰弹幕战 · 讨伐模式礼物、点赞士气、签到
// 礼物不直接给随机装备：只加 BUFF、召唤帮手，或者给「正常玩法掉落」加保底品质 / 翻倍。
import { PVE, GEAR, CLASSES } from './config.js';
import { castUlt, rollItem, giveItem, makeItem, refreshStats, laneCenter, LANES, forgeTier, rollForge } from './fleet.js';
import { bossMax, spawnAlien, chapterOf } from './pve.js';

export const GIFT_KINDS = {
  forge:    { name: '加油鸭',   title: '战舰锻造' },
  heart:    { name: '小心心',   title: '经验加速' },
  flower:   { name: '鲜花',     title: '佣兵机甲' },
  drum:     { name: '爱你哟',   title: '战鼓' },
  hero:     { name: '墨镜',     title: '英雄战机' },
  double:   { name: '礼花筒',   title: '双倍掉落' },
  treasure: { name: '跑车',     title: '宝藏魔王' },
};

// 先按礼物名认，认不出就按单个礼物价值
export function pveGiftKind(gift, custom = null) {
  const G = PVE.gifts, name = String(gift?.name || '');
  if (custom && custom[name]) return custom[name];   // 设置面板里主播追加的「礼物名=效果」优先
  for (const [k, v] of Object.entries(G.byName)) if (name.includes(k)) return v;
  const price = Number(gift?.price) || 1;
  for (const [min, kind] of G.byValue) if (price >= min) return kind;
  return 'heart';
}

const now = game => game.clock;
const active = (until, game) => (until || 0) > now(game);

// 全队攻击加成：战鼓 +30%、士气 +10%
export function teamAtkMul(game) {
  let m = 1;
  if (active(game.drumUntil, game)) m += PVE.gifts.drum.atk;
  if (active(game.moraleUntil, game)) m += PVE.morale.dmg;
  return m;
}
// 自己普攻加成：英雄战机 +30%
export function selfShotMul(game, f) { return active(f.heroUntil, game) ? 1 + PVE.gifts.hero.atk : 1; }
// 自己经验倍率：小心心 +50%
export function xpMul(game, f) { return active(f.xpUntil, game) ? 1 + PVE.gifts.heart.xp : 1; }
// 自己战利品保底品质（-1 = 无）
export function lootFloor(game, f) {
  let t = -1;
  for (const fl of f.floors || []) if (fl.until > now(game)) t = Math.max(t, fl.tier);
  return t;
}
export function dropTimes(game, f) { return f && active(f.doubleUntil, game) ? 2 : 1; }

function addFloor(game, f, tier, sec) {
  const list = (f.floors ||= []).filter(x => x.until > now(game));
  const cur = list.find(x => x.tier === tier);
  if (cur) cur.until = Math.max(cur.until, now(game)) + sec; else list.push({ tier, until: now(game) + sec });
  f.floors = list;
}
const extend = (until, game, sec, cap = Infinity) => Math.min(now(game) + cap, Math.max(until || 0, now(game)) + sec);

export function applyPveGift(game, f, kind, amount) {
  const G = PVE.gifts, n = Math.max(1, amount);
  const tName = t => GEAR.tiers[t].name;
  switch (kind) {
    case 'forge': {   // 加油鸭：当前战舰锻造 n 次，留最高品质
      forgeShip(game, f, Math.min(n, PVE.forge.maxPerGift));
      break;
    }
    case 'heart': {   // 自己30秒经验+50%（叠加，不设上限），立即放小技能
      f.xpUntil = extend(f.xpUntil, game, G.heart.sec * n);
      if (f.skillCd > 0) f.freeSkill = true;   // 礼物触发的技能不算贡献
      f.skillCd = 0;
      game.emit('banner', { team: 'blue', uid: f.uid, name: f.name, text: `经验+50% · 还剩${Math.ceil(f.xpUntil - now(game))}秒，立即放技能`, tier: 1 });
      break;
    }
    case 'flower': {  // 召唤前排佣兵机甲120秒，立即放大招
      for (let i = 0; i < Math.min(n, G.flower.maxPerGift); i++) summonMerc(game, f);
      if (f.cls) { f.ultCd = 0; castUlt(game, f); }
      game.emit('banner', { team: 'blue', uid: f.uid, name: f.name, text: `召唤佣兵机甲${n > 1 ? '×' + Math.min(n, G.flower.maxPerGift) : ''}，立即释放大招！`, tier: 2 });
      break;
    }
    case 'drum': {    // 全队攻击+30% 60秒；自己战利品保底橙装60秒；全屏弹幕雨
      game.drumUntil = extend(game.drumUntil, game, G.drum.sec * n);
      addFloor(game, f, G.drum.floor, G.drum.floorSec * n);
      game.rainT = (game.rainT || 0) + G.drum.rainSec * n; game.rainOwner = f.uid;
      game.emit('banner', { team: 'blue', uid: f.uid, name: f.name, text: `敲响战鼓！全队攻击+30% · 自己掉落保底${tName(G.drum.floor)}`, tier: 3 });
      game.emit('announce', { text: '战鼓响起，全队攻击提升', voice: true });
      break;
    }
    case 'hero': {    // 自己普攻+30% 5分钟；召唤超级战机5分钟；自己战利品保底紫装5分钟
      f.heroUntil = extend(f.heroUntil, game, G.hero.sec * n);
      addFloor(game, f, G.hero.floor, G.hero.floorSec * n);
      summonSuper(game, f, G.hero.superSec * n);
      game.emit('banner', { team: 'blue', uid: f.uid, name: f.name, text: `英雄战机出击！普攻+30% · 自己掉落保底${tName(G.hero.floor)}`, tier: 4 });
      break;
    }
    case 'double': {  // 自己掉落×2 10分钟；自己战利品保底金装10分钟（可叠加）
      f.doubleUntil = extend(f.doubleUntil, game, G.double.sec * n);
      addFloor(game, f, G.double.floor, G.double.floorSec * n);
      game.emit('banner', { team: 'blue', uid: f.uid, name: f.name, text: `双倍掉落 ${Math.ceil((f.doubleUntil - now(game)) / 60)}分钟！保底${tName(G.double.floor)}${Math.round(G.double.floorSec * n / 60)}分钟`, tier: 5 });
      break;
    }
    case 'treasure': {  // 召唤宝箱魔王：打死后在场所有人开箱，参与者额外拿10倍BOSS经验；送礼人保底1件红装
      for (let i = 0; i < Math.min(n, G.treasure.maxAlive); i++) summonChest(game, f);
      // 送跑车的人：每个跑车保底给自己1件至尊红装（优先补还没有红装的部位）
      const red = GEAR.tiers.length - 1;
      for (let i = 0; i < n; i++) {
        const missing = Object.keys(GEAR.slots).filter(sl => !(f.gear?.[sl]?.tier >= red));
        const pool = missing.length ? missing : Object.keys(GEAR.slots);
        const item = makeItem(game.random, pool[Math.floor(game.random() * pool.length)], red);
        giveItem(game, f, item, { source: 'gift' });
        game.emit('pity', { uid: f.uid, name: f.name, kind: 'red', item, gift: true });
      }
      game.emit('banner', { team: 'blue', uid: f.uid, name: f.name, text: '召唤宝箱魔王！打死它全员开箱', tier: 5 });
      game.emit('announce', { text: '宝箱魔王出现了', voice: true });
      break;
    }
    default: break;
  }
  saveBuffs(game, f);
}

// ───────── 佣兵机甲（NPC，不进榜，贡献算给召唤的人） ─────────
function summonMerc(game, owner) {
  const uid = `merc:${++game.npcSeq}`;
  const lane = LANES[Math.floor(game.random() * 3)];
  const m = { uid, npc: true, merc: true, owner: owner.uid, name: `${String(owner.name).slice(0, 6)}的佣兵`, avatar: '', team: 'blue', level: owner.level || 1, skin: 3,
    weapon: 'laser', lane, target: 'core', lastActive: game.now(), cls: 'tank', prefCls: 'tank', gear: { ...(owner.gear || {}) }, until: game.clock + PVE.gifts.flower.sec };
  game.resetFighterForRound(m);
  m.x = laneCenter(lane); m.y = PVE.zone[1];
  game.fighters.set(uid, m);
  return m;
}
// ───────── 超级战机：跟在主人身边的金色战机，打追踪弹 ─────────
function summonSuper(game, owner, sec) {
  const list = (game.pveDrones ||= []);
  const cur = list.find(d => d.kind === 'super' && d.owner === owner.uid);
  if (cur) { cur.t += sec; return; }
  list.push({ owner: owner.uid, kind: 'super', x: owner.x, y: owner.y + 40, vx: 0, vy: -200, t: sec, cd: 0.5, phase: 0, slot: 0, id: ++game.zoneSeq });
}
// ───────── 宝箱魔王 ─────────
function summonChest(game, owner) {
  const alive = [...game.fighters.values()].filter(f => f.alien && f.kind === 'chest' && f.alive).length;
  if (alive >= PVE.gifts.treasure.maxAlive) return;
  const a = spawnAlien(game, 'chest', 160 + game.random() * 400, -60);
  if (!a) return;
  const stage = game.pve?.stage || 1;
  a.hp = a.maxHp = Math.round(bossMax(stage) * PVE.gifts.treasure.hpFrac);
  a.owner = owner.uid; a.yStop = 300 + game.random() * 60; a.life = 9999;
  a.hitters = new Set();
}
export function chestKilled(game, chest) {
  const stage = game.pve?.stage || 1, lv = chapterOf(stage);
  const xp = Math.round(bossXp(lv) * PVE.gifts.treasure.xpMul);
  const ppl = game.humans().filter(f => f.team === 'blue');
  game.emit('banner', { team: 'blue', text: `宝箱魔王被击败！在场${ppl.length}人开箱`, tier: 5 });
  for (const f of ppl) {
    // 开箱 = 一次正常的怪物掉落（吃保底品质和双倍）
    for (let k = 0; k < dropTimes(game, f); k++) {
      let item = rollItem(game.random, lv);
      const fl = lootFloor(game, f);
      if (fl > item.tier) item = makeItem(game.random, item.slot, fl);
      giveItem(game, f, item);
    }
    if (chest.hitters?.has(f.uid)) grantXp(game, f, xp);
  }
}
export function bossXp(stage) { return 50 + 30 * stage; }
function grantXp(game, f, xp) {
  if (f.test || !game.save) { f.bonusXp = (f.bonusXp || 0) + xp; return; }
  const p = game.save.get(f.uid);
  const ups = game.save.addXp(p, xp);
  game.emit('toast', { uid: f.uid, text: `${f.name} 宝箱经验 +${xp}` });
  if (ups) { f.level = p.level; if (f.cls) refreshStats(f); game.emit('levelup', { uid: f.uid, name: f.name, level: p.level, x: f.x, y: f.y, live: true }); }
}

// ───────── 点赞士气 ─────────
export function forgeShip(game, f, times = 1) {
  if (!f.cls) return null;
  const T = PVE.forge.tiers, cls = f.cls;
  const forge = f.forge || (f.forge = {});
  const from = forgeTier(f, cls);
  // 至尊保底（每种战舰各自计数）：连续200次没出至尊，这一次必出至尊
  const pityAll = f.forgePity || (f.forgePity = {}), top = T.length - 1;
  const rolls = [];
  let pityHit = false;
  for (let i = 0; i < times; i++) {
    let r = rollForge(game.random);
    pityAll[cls] = (pityAll[cls] || 0) + 1;
    if (r < top && pityAll[cls] >= PVE.forge.pity) { r = top; pityHit = true; }
    if (r === top) pityAll[cls] = 0;
    rolls.push(r);
  }
  const best = Math.max(...rolls), to = Math.max(from, best);
  forge[cls] = to;
  const p = !f.test && !f.npc ? game.save?.peek(f.uid) : null;
  if (p) { p.forge = forge; p.forgePity = pityAll; game.save.dirty = true; }
  refreshStats(f);
  game.emit('forge', { uid: f.uid, name: f.name, cls, from, to, best, rolls, up: to > from, pityHit, pity: pityAll[cls] || 0 });
  return { from, to, rolls };
}

export function moraleLike(game, f, n) {
  const M = PVE.morale;
  if (game.clock - (f.moraleWinT || 0) >= 1) { f.moraleWinT = game.clock; f.moraleWin = 0; }
  const add = Math.max(0, Math.min(n, M.capPerSec - (f.moraleWin || 0)));
  f.moraleWin = (f.moraleWin || 0) + add;
  game.morale = (game.morale || 0) + add;
  if (game.morale >= M.need) {
    game.morale -= M.need;
    game.moraleUntil = extend(game.moraleUntil, game, M.sec);
    game.emit('banner', { team: 'blue', text: `士气满${M.need}！全队伤害+${Math.round(M.dmg * 100)}% · ${M.sec}秒`, tier: 3 });
  }
}

// ───────── 签到：每天一次每日战利品 ─────────
export function dailyCheckin(game, f) {
  const day = new Date(game.now() + 8 * 3600e3).toISOString().slice(0, 10);   // 按北京时间算一天
  const p = !f.test ? game.save?.get(f.uid) : null;
  const holder = p || f;
  if (holder.checkinDay === day) { game.emit('toast', { uid: f.uid, text: `${f.name} 今天已经签到过了` }); return false; }
  holder.checkinDay = day;
  if (p) game.save.dirty = true;
  const stage = Math.max(game.pve?.stage || 0, game.save?.data?.pveStage || 1);
  const item = rollItem(game.random, chapterOf(stage), 1);
  game.emit('banner', { team: 'blue', uid: f.uid, name: f.name, text: '签到成功，领取每日战利品', tier: 1 });
  giveItem(game, f, item);
  return true;
}

// ───────── 每帧：佣兵到期、弹幕雨、BUFF 刷新 ─────────
// ───────── 个人BUFF存档：刷新页面不丢（按真实时间存到期时刻） ─────────
export function saveBuffs(game, f) {
  const p = !f.test && !f.npc ? game.save?.peek(f.uid) : null;
  if (!p) return;
  const ms = u => (u || 0) > now(game) ? game.now() + (u - now(game)) * 1000 : 0;
  const sup = (game.pveDrones || []).find(d => d.kind === 'super' && d.owner === f.uid);
  p.buffs = { xp: ms(f.xpUntil), hero: ms(f.heroUntil), double: ms(f.doubleUntil), floors: (f.floors || []).filter(x => x.until > now(game)).map(x => ({ tier: x.tier, until: ms(x.until) })), super: sup ? Math.round(sup.t) : 0, mercs: [...game.fighters.values()].filter(m => m.merc && m.owner === f.uid).map(m => ms(m.until)).filter(Boolean) };
  game.save.dirty = true;
}
export function loadBuffs(game, f, p) {
  const b = p?.buffs; if (!b) return;
  const at = ms => ms > game.now() ? now(game) + (ms - game.now()) / 1000 : 0;
  f.xpUntil = at(b.xp); f.heroUntil = at(b.hero); f.doubleUntil = at(b.double);
  f.floors = (b.floors || []).map(x => ({ tier: x.tier, until: at(x.until) })).filter(x => x.until > 0);
  if (b.super > 1 && !(game.pveDrones || []).some(d => d.kind === 'super' && d.owner === f.uid)) summonSuper(game, f, b.super);
  if (![...game.fighters.values()].some(m => m.merc && m.owner === f.uid)) for (const u of b.mercs || []) { const left = at(u); if (left > now(game) + 1) { const m = summonMerc(game, f); if (m) m.until = left; } }
}

export function stepPveGifts(game, dt) {
  // 每5秒把在场真人的个人BUFF写回存档
  if ((game.buffSyncT = (game.buffSyncT || 0) - dt) <= 0) { game.buffSyncT = 5; for (const f of game.humans()) if (f.xpUntil || f.heroUntil || f.doubleUntil || f.floors?.length || game.pveDrones?.length) saveBuffs(game, f); }
  for (const m of [...game.fighters.values()]) {
    if (!m.merc) continue;
    if (game.clock > m.until) { game.emit('explode', { x: m.x, y: m.y, size: 1, team: 'blue' }); game.fighters.delete(m.uid); }
  }
  if (game.rainT > 0) {   // 全屏弹幕雨：从底部往上铺满追踪弹
    game.rainT -= dt;
    const n = Math.round(PVE.gifts.drum.rainPerSec * dt + game.random());
    const o = game.fighters.get(game.rainOwner), dmg = (o?.stats?.atkBase || 10) * teamAtkMul(game) * PVE.gifts.drum.rainAtk;   // 每发 = 送礼人攻击×2
    for (let i = 0; i < n; i++) game.addBullet(20 + game.random() * 680, PVE.zone[1] + 20, (game.random() - 0.5) * 60, -520 - game.random() * 160, 5, dmg, 'blue', 'shot', game.rainOwner, 0, { gift: true, pveScaled: true, rain: true, hue: Math.floor(game.random() * 5) });
  }
}

// ───────── 后援：召唤物暂停（佣兵和超级战机收起来，回到场上再放出来，剩余时间不变） ─────────
export function pauseSummons(game, f) {
  const P = (f.paused = { mercs: [], super: 0 });
  for (const m of [...game.fighters.values()]) if (m.merc && m.owner === f.uid) { P.mercs.push(Math.max(0, m.until - game.clock)); game.fighters.delete(m.uid); }
  const list = game.pveDrones || [];
  for (let i = list.length - 1; i >= 0; i--) if (list[i].kind === 'super' && list[i].owner === f.uid) { P.super += list[i].t; list.splice(i, 1); }
}
export function resumeSummons(game, f) {
  const P = f.paused; f.paused = null;
  if (!P) return;
  for (const left of P.mercs) if (left > 1) { const m = summonMerc(game, f); if (m) m.until = game.clock + left; }
  if (P.super > 1) summonSuper(game, f, P.super);
}
