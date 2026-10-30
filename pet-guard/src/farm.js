// 回家种田：打完一章的首领回家，每位观众一块菜地（最多6块地）
// 种下 → 浇水（快40%）→ 熟了收获进仓库 → 卖掉换金币；金币买种子、扩地、解锁高级萌宠；收获涨农场经验，升级解锁新作物
// 作物按真实时间长，在家种下、打一章回来就熟了（快的萝卜在家就能收）
import { CROPS, FARM, ADV_PETS, SPECIES, SCORE } from './config.js';
import { newFarm, dayKeyOf } from './save.js';
import { profileOf } from './loot.js';
import { bestFriend, addFriendship } from './friends.js';

export const CROP = Object.fromEntries(CROPS.map(c => [c.id, c]));
// 变异：仓库里普通菜存 'carrot'，变异的存 'carrot:gold'
export const MUT = Object.fromEntries(FARM.mutations.map(m => [m.id, m]));
export const splitKey = key => { const [c, m] = String(key).split(':'); return { c, m: MUT[m] ? m : null }; };
export const keyName = key => { const { c, m } = splitKey(key); return (m ? MUT[m].name : '') + (CROP[c]?.name || c); };
export const keyPrice = (game, key) => { const { c, m } = splitKey(key); return (CROP[c]?.sell || 0) * marketMul(game, c) * (m ? MUT[m].mul : 1); };
function rollMut(game) { let r = game.random(); for (const m of FARM.mutations) { if (r < m.chance) return m.id; r -= m.chance; } return null; }
const CROP_WORDS = CROPS.flatMap(c => [c.name, ...c.words].map(w => [w, c.id])).sort((a, b) => b[0].length - a[0].length);
export function parseCrop(text) {
  const s = String(text || '').trim();
  if (!s) return null;
  for (const [w, id] of CROP_WORDS) if (s.includes(w)) return id;
  return null;
}

// ───────── 数据 ─────────
export function farmOf(game, f) {
  if (!f || f.npc) return null;
  const p = profileOf(game, f), holder = p || f;
  if (!holder.farm) { holder.farm = newFarm(); if (p) game.save.dirty = true; }
  return holder.farm;
}
const dirty = game => { if (game.save) game.save.dirty = true; };
export const nowMs = game => game.now();
// 一块地的生长：0 刚发芽 / 1 长大中 / 2 熟了；k 是进度 0~1
export function plotStage(plot, now) {
  if (!plot) return { stage: -1, k: 0, left: 0 };
  const total = Math.max(1, plot.ready - plot.at), left = Math.max(0, plot.ready - now), k = 1 - left / total;
  return { stage: left <= 0 ? 2 : k < 0.4 ? 0 : 1, k: Math.min(1, k), left: left / 1000 };
}
export const cropUnlocked = (farm, id) => (CROP[id]?.lv || 99) <= farm.lv;
export const levelNeed = lv => FARM.level(lv);
export function plotCost(farm) { const i = farm.plots.length - FARM.plotsStart; return i < FARM.plotCost.length ? FARM.plotCost[i] : null; }
// 今日行情：按日期算（同一天不管回几次家、刷不刷新页面都一样），每种菜一个倍数，×0.5 ~ ×2（按对数均匀，涨跌机会一样多）
export function marketOf(game) {
  const day = dayKeyOf(nowMs(game));
  if (game.market?.day === day) return game.market;
  let h = 2166136261; for (const ch of 'pet-guard-market:' + day) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => { h = (h + 0x6D2B79F5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const { min, max } = FARM.market, mul = {};
  for (const c of CROPS) mul[c.id] = Math.round(min * (max / min) ** rnd() * 10) / 10;
  const ids = CROPS.map(c => c.id).sort((a, b) => mul[b] - mul[a]);
  return (game.market = { day, mul, hot: ids[0], cold: ids[ids.length - 1], order: ids });
}
export function marketMul(game, id) { return marketOf(game).mul[id] ?? 1; }
export function petUnlocked(game, f, sp) {
  if (!ADV_PETS[sp]) return true;
  const p = profileOf(game, f);
  if (p?.pets?.[sp] || f.mem?.[sp]) return true;   // 以前就养过的（小奶龙改成高级萌宠之前领养的）照样能用
  const farm = farmOf(game, f);
  return !!farm && farm.pets.includes(sp);
}
const say = (game, f, text) => game.emit('toast', { uid: f.uid, text: `${f.name}：${text}` });
const atHome = game => game.phase === 'home';
function needHome(game, f) { if (atHome(game)) return true; say(game, f, '打完这一章的首领回家才能种田哦'); return false; }

// ───────── 农活 ─────────
// 每样农活都有一段动画（收：菜一个个蹦进篮子；卖：菜飞去菜摊、金币飞回来；种：一颗颗撒种子冒芽；浇：洒水壶一块块浇），
// 所以按顺序排队做：上一样的动画做完才做下一样（发「种田」就是 收→卖→种→浇 依次来）
// 动画节奏（秒）：渲染、音效、排队都按这一张表来，对得上
export const FARM_FX = {
  harvest: j => 0.2 + 0.34 * j,           // 第 j 棵菜蹦出来（再飞 0.5 秒进篮子）
  sellItem: j => 0.15 + 0.12 * j,         // 第 j 个菜飞向菜摊（飞 0.7 秒）
  sellBack: m => 1.0 + 0.12 * m,          // 金币从菜摊飞回来（飞 0.5 秒）
  plant: j => 0.15 + 0.34 * j,            // 第 j 颗种子撒出去（飞 0.3 秒落地，再冒芽 0.35 秒）
  water: j => 0.3 + 0.36 * j,             // 第 j 块地浇上水
  waterStep: 0.36,
  friend: n => 0.35 + 0.36 * n,           // 顺手给好朋友浇
};
const DUR = {
  harvest: n => 0.6 + 0.34 * n,
  sell: n => 1.6 + 0.12 * Math.min(n, 8),
  plant: n => 0.6 + 0.34 * n,
  water: (n, fn) => 0.65 + 0.36 * n + (fn ? 0.6 : 0),
};
export const FARM_DUR = DUR;
// 种：不说种什么就种「解锁了的、买得起的、最贵的」那种；每块空地各种一棵
function doPlant(game, f, cropId = null, quiet = false) {
  const farm = farmOf(game, f), now = nowMs(game);
  const empty = farm.plots.map((p, i) => (p ? -1 : i)).filter(i => i >= 0);
  if (!empty.length) { if (!quiet) say(game, f, '地都种满了（熟了发「收」，想多种发「扩地」）'); return 0; }
  let c = cropId ? CROP[cropId] : null;
  if (c && !cropUnlocked(farm, c.id)) { say(game, f, `${c.name}要农场 Lv${c.lv} 才能种（现在 Lv${farm.lv}）`); return 0; }
  if (!c) c = [...CROPS].reverse().find(x => cropUnlocked(farm, x.id) && x.seed <= farm.coins) || null;
  if (!c) { if (!quiet) say(game, f, `金币不够买种子了（还有${farm.coins}金币，先「收」「卖」）`); return 0; }
  const idx = [];
  for (const i of empty) {
    if (farm.coins < c.seed) break;
    farm.coins -= c.seed;
    const m = rollMut(game);
    farm.plots[i] = { c: c.id, at: now, ready: now + c.grow * 1000, w: 0, fw: 0, ...(m ? { m } : {}) };
    idx.push(i);
  }
  const n = idx.length;
  if (!n) { if (!quiet) say(game, f, `金币不够买${c.name}种子（要${c.seed}金币）`); return 0; }
  dirty(game);
  game.emit('farmPlant', { uid: f.uid, crop: c.id, n, idx, dur: DUR.plant(n) });
  if (!quiet) say(game, f, `种下${n}棵${c.name}（-${n * c.seed}金币），${fmtSec(c.grow)}后成熟，浇水更快`);
  return n;
}
// 浇水：自己没熟的菜都浇一遍（剩下的时间 ×0.6）；好朋友在场顺手也给他浇（×0.8，友情+1）
function doWater(game, f, quiet = false) {
  const farm = farmOf(game, f), now = nowMs(game), idx = [], fidx = [];
  farm.plots.forEach((p, i) => { if (p && !p.w && p.ready > now) { p.ready = now + (p.ready - now) * FARM.water; p.w = 1; idx.push(i); } });
  let friend = null;
  const bf = bestFriend(game, f, true);
  if (bf) {
    const o = game.pets.get(bf.uid), ff = o && farmOf(game, o);
    if (ff) ff.plots.forEach((p, i) => { if (p && !p.fw && p.ready > now) { p.ready = now + (p.ready - now) * FARM.friendWater; p.fw = 1; fidx.push(i); } });
    if (fidx.length) { friend = o; addFriendship(game, f, o, 1, 'hug'); }
  }
  const n = idx.length, fn = fidx.length;
  if (!n && !fn) { if (!quiet) say(game, f, '菜都浇过水了（或者还没种），去「种」点什么吧'); return { n: 0, fn: 0 }; }
  dirty(game);
  game.emit('farmWater', { uid: f.uid, n, idx, friend: friend?.uid || null, fn, fidx, dur: DUR.water(n, fn) });
  if (!quiet) say(game, f, `浇了${n}块地${friend ? `，顺手给好朋友${friend.name}浇了${fn}块` : ''}`);
  return { n, fn };
}
// 收：熟了的都收进仓库，涨农场经验
function doHarvest(game, f, quiet = false) {
  const farm = farmOf(game, f), now = nowMs(game), got = [], idx = [];
  const muts = [];
  farm.plots.forEach((p, i) => { if (p && p.ready <= now) { const key = p.m ? `${p.c}:${p.m}` : p.c; got.push(p.c); muts.push(p.m || null); idx.push(i); farm.barn[key] = (farm.barn[key] || 0) + 1; farm.plots[i] = null; } });
  if (!got.length) {
    if (!quiet) { const next = farm.plots.filter(Boolean).map(p => (p.ready - now) / 1000).sort((a, b) => a - b)[0]; say(game, f, next ? `还没熟，最快的还要${fmtSec(next)}（浇水更快）` : '地里还空着，先「种」吧'); }
    return 0;
  }
  const xp = got.reduce((s, id) => s + CROP[id].xp, 0);
  farm.harvest += got.length;
  dirty(game);
  game.emit('farmHarvest', { uid: f.uid, crops: got, muts, idx, n: got.length, xp, dur: DUR.harvest(got.length) });
  game.scoreFarm?.(f, got.length);
  addFarmXp(game, f, farm, xp);
  // 收到变异的：全场播报（越稀有越显眼）
  muts.forEach((m, k) => { if (!m) return; const M = MUT[m]; game.emit('banner', { uid: f.uid, name: f.name, text: `变异啦！${f.name}收获了${M.name}${CROP[got[k]].name}（卖价 ×${M.mul}）`, tier: m === 'rainbow' ? 5 : m === 'gold' ? 4 : 3 }); });
  if (!quiet) say(game, f, `收获${got.length}个（${summary(got.map((c, k) => muts[k] ? `${c}:${muts[k]}` : c))}）放进仓库，农场经验+${xp}；想卖发「卖」`);
  return got.length;
}
// 卖：收的菜都先放仓库，观众自己决定卖不卖。mode：'all' 全卖；'normal' 只卖普通的（变异的留着）；作物 id 只卖这一种
function doSell(game, f, quiet = false, mode = 'all') {
  const farm = farmOf(game, f);
  let coins = 0, n = 0;
  const list = [], muts = [];
  for (const [key, cnt] of Object.entries(farm.barn)) {
    if (!(cnt > 0)) continue;
    const { c, m } = splitKey(key);
    if (mode === 'normal' && m) continue;
    if (mode !== 'all' && mode !== 'normal' && c !== mode) continue;
    coins += Math.round(cnt * keyPrice(game, key)); n += cnt;
    for (let k = 0; k < cnt; k++) { list.push(c); muts.push(m); }
    delete farm.barn[key];
  }
  if (!n) { if (!quiet) say(game, f, mode === 'all' ? '仓库是空的，先「收」菜' : mode === 'normal' ? '仓库里没有普通的菜' : `仓库里没有${CROP[mode]?.name || '这种菜'}`); return { coins: 0, n: 0 }; }
  farm.coins += coins; farm.sold += coins;
  dirty(game);
  game.emit('farmSell', { uid: f.uid, coins, n, crops: list.slice(0, 8), muts: muts.slice(0, 8), dur: DUR.sell(n) });
  if (!quiet) say(game, f, `卖了${n}个菜，赚了${coins}金币（现在${farm.coins}金币）`);
  return { coins, n };
}
// 自动守护：钱不够买种子时，先把普通的菜卖了（变异的留给主人自己决定）
function cheapestSeed(farm) { return Math.min(...CROPS.filter(c => cropUnlocked(farm, c.id)).map(c => c.seed)); }

// ───────── 排队：一样做完（动画播完）再做下一样 ─────────
function runStep(game, f, j) {
  const sum = f.farmSum ||= { h: 0, s: 0, p: 0, w: 0 };
  switch (j.st) {
    case 'harvest': { const n = doHarvest(game, f, j.quiet); sum.h += n; return { v: n, dur: n ? DUR.harvest(n) : 0 }; }
    case 'sell': { const r = doSell(game, f, j.quiet, j.arg || 'all'); sum.s += r.coins; return { v: r.coins, dur: r.n ? DUR.sell(r.n) : 0 }; }
    case 'sellIfBroke': { const farm = farmOf(game, f); if (farm.coins >= cheapestSeed(farm) || !farm.plots.some(p => !p)) return { v: 0, dur: 0 }; const r = doSell(game, f, true, 'normal'); sum.s += r.coins; return { v: r.coins, dur: r.n ? DUR.sell(r.n) : 0 }; }
    case 'plant': { const n = doPlant(game, f, j.arg, j.quiet); sum.p += n; return { v: n, dur: n ? DUR.plant(n) : 0 }; }
    case 'water': { const r = doWater(game, f, j.quiet); sum.w += r.n; return { v: r.n + r.fn, dur: r.n + r.fn ? DUR.water(r.n, r.fn) : 0 }; }
    case 'summary': {
      const farm = farmOf(game, f), parts = [];
      if (sum.h) parts.push(`收了${sum.h}个`); if (sum.s) parts.push(`卖了${sum.s}金币`); if (sum.p) parts.push(`种了${sum.p}棵`); if (sum.w) parts.push(`浇了${sum.w}块`);
      const barnN = Object.values(farm.barn).reduce((a, b) => a + b, 0), broke = !sum.p && farm.plots.some(p => !p) && farm.coins < cheapestSeed(farm);
      if (!j.quiet) say(game, f, (parts.length ? `${parts.join('、')}（${farm.coins}金币` + (barnN ? `，仓库${barnN}个菜，发「卖」换金币）` : '）') : '菜还没熟，也没空地了，等一会儿再来') + (broke ? '；金币不够买种子了，先发「卖」' : ''));
      f.farmSum = { h: 0, s: 0, p: 0, w: 0 };
      return { v: 0, dur: 0 };
    }
    default: return { v: 0, dur: 0 };
  }
}
// 跑队列：没在忙就一样样往下做；做了一样有动画的，就等它播完（farmBusy）再做下一样
function runJobs(game, f, flush = false) {
  let total = 0;
  while (f.farmJobs?.length && (flush || !((f.farmBusy || 0) > game.clock))) {
    const j = f.farmJobs.shift();
    const r = runStep(game, f, flush ? { ...j, quiet: true } : j);
    total += r.v || 0;
    if (r.dur && !flush) f.farmBusy = game.clock + r.dur + 0.15;
  }
  return total;
}
function enqueue(game, f, steps, arg = null, quiet = false) {
  if (!needHome(game, f)) return 0;
  const q = (f.farmJobs ||= []);
  if (q.length > 12) return 0;   // 刷屏的不再排
  for (const st of steps) q.push({ st, arg, quiet });
  return runJobs(game, f);
}
export const plant = (game, f, cropId = null, { quiet = false } = {}) => enqueue(game, f, ['plant'], cropId, quiet);
export const water = (game, f, { quiet = false } = {}) => enqueue(game, f, ['water'], null, quiet);
export const harvest = (game, f, { quiet = false } = {}) => enqueue(game, f, ['harvest'], null, quiet);
export const sell = (game, f, { quiet = false, mode = 'all' } = {}) => enqueue(game, f, ['sell'], mode, quiet);
// 一键「种田」：收 → 种 → 浇，一样样来，最后报个总账（收的菜先放仓库，卖不卖观众自己发「卖」）
// 自动守护的：钱不够买种子时先卖掉普通的菜再种
export function farmAll(game, f, { quiet = false, auto = false } = {}) {
  if (!needHome(game, f)) return false;
  const q = (f.farmJobs ||= []);
  if (q.length > 12) return false;
  q.push({ st: 'harvest', quiet: true }, ...(auto ? [{ st: 'sellIfBroke', quiet: true }] : []), { st: 'plant', quiet: true }, { st: 'water', quiet: true }, { st: 'summary', quiet });
  runJobs(game, f);
  return true;
}
// 离开家：还没做完的农活一口气做完（不放动画）
export function flushFarm(game) { for (const f of game.pets.values()) if (f.farmJobs?.length) { runJobs(game, f, true); f.farmBusy = 0; } }
export function busyFarm(f, game) { return (f.farmBusy || 0) > game.clock || !!f.farmJobs?.length; }
// 扩地：第3~6块地越来越贵
export function expand(game, f) {
  if (!needHome(game, f)) return false;
  const farm = farmOf(game, f), cost = plotCost(farm);
  if (cost == null) { say(game, f, `已经有${farm.plots.length}块地了，最多就这么多`); return false; }
  if (farm.coins < cost) { say(game, f, `开垦第${farm.plots.length + 1}块地要${cost}金币（还差${cost - farm.coins}）`); return false; }
  farm.coins -= cost; farm.plots.push(null);
  dirty(game);
  game.emit('farmPlot', { uid: f.uid, plots: farm.plots.length });
  game.emit('banner', { uid: f.uid, name: f.name, text: `开垦了第${farm.plots.length}块地！`, tier: 2 });
  return true;
}
// 解锁高级萌宠：农场等级够 + 金币够；解锁了直接换成它
export function unlockPet(game, f, sp) {
  const A = ADV_PETS[sp];
  if (!A) return false;
  const farm = farmOf(game, f);
  if (!farm) return false;
  if (farm.pets.includes(sp) || petUnlocked(game, f, sp)) { game.setSpecies(f, sp); return true; }
  if (farm.lv < A.lv) { say(game, f, `${SPECIES[sp].kind}要农场 Lv${A.lv} 才能解锁（现在 Lv${farm.lv}，回家种田升级）`); return false; }
  if (farm.coins < A.cost) { say(game, f, `解锁${SPECIES[sp].kind}要${A.cost}金币（还差${A.cost - farm.coins}）`); return false; }
  farm.coins -= A.cost; farm.pets.push(sp);
  dirty(game);
  game.emit('farmUnlock', { uid: f.uid, name: f.name, sp });
  game.emit('banner', { uid: f.uid, name: f.name, text: `解锁了高级萌宠「${SPECIES[sp].name}·${SPECIES[sp].kind}」！`, tier: 5 });
  game.setSpecies(f, sp);
  return true;
}
// 送礼：每1抖币给金币；在家送还会「施肥」，自己地里的菜马上熟
export function giftFarm(game, f, value) {
  const farm = farmOf(game, f);
  if (!farm) return;
  farm.coins += Math.round(value * FARM.giftCoins);
  let n = 0;
  if (atHome(game)) { const now = nowMs(game); for (const p of farm.plots) if (p && p.ready > now) { p.ready = now; n++; } }
  dirty(game);
  game.emit('farmGift', { uid: f.uid, coins: Math.round(value * FARM.giftCoins), ripe: n });
}
// 打怪也给金币（过关时在场的观众）
export function battleCoins(game, n, boss) {
  const ch = Math.ceil(n / 5), add = boss ? FARM.bossCoins(ch) : FARM.stageCoins(ch);
  for (const f of game.humans()) { if (f.merc || f.reserve) continue; const farm = farmOf(game, f); if (!farm) continue; farm.coins += add; game.emit('coins', { uid: f.uid, n: add }); }
  dirty(game);
  return add;
}
function addFarmXp(game, f, farm, xp) {
  farm.xp += xp;
  let up = 0;
  while (farm.xp >= levelNeed(farm.lv)) { farm.xp -= levelNeed(farm.lv); farm.lv++; up++; }
  if (!up) return;
  const crops = CROPS.filter(c => c.lv === farm.lv).map(c => c.name), pets = Object.entries(ADV_PETS).filter(([, a]) => a.lv === farm.lv).map(([sp]) => SPECIES[sp].kind);
  game.emit('farmLevel', { uid: f.uid, name: f.name, lv: farm.lv, crops, pets });
  game.emit('banner', { uid: f.uid, name: f.name, text: `农场升到 Lv${farm.lv}！${crops.length ? `解锁新作物「${crops.join('、')}」` : ''}${pets.length ? `可以解锁高级萌宠「${pets.join('、')}」了` : ''}`, tier: crops.length || pets.length ? 4 : 2 });
}

// ───────── 回家 ─────────
// 每位在场观众分一块菜地（格子），萌宠站在自己地边上
export function startHome(game) {
  game.homeTiles = [];
  for (const f of game.humans()) if (!f.merc && !f.reserve) assignTile(game, f);
  marketOf(game);
  game.homeAutoT = 2;
}
export function assignTile(game, f) {
  if (!game.homeTiles || f.npc) return -1;
  const T = FARM.tiles, max = T.cols * T.rows;
  let i = game.homeTiles.indexOf(f.uid);
  if (i >= 0) return i;
  i = game.homeTiles.findIndex(u => !u || !game.pets.has(u));
  if (i < 0) { if (game.homeTiles.length >= max) return -1; i = game.homeTiles.length; }
  game.homeTiles[i] = f.uid;
  return i;
}
export function tileRect(i) {
  const T = FARM.tiles, col = i % T.cols, row = Math.floor(i / T.cols);
  return { x: T.x0 + col * T.gx, y: T.y0 + row * T.gy, w: T.w, h: T.h, cx: T.x0 + col * T.gx + T.w / 2, cy: T.y0 + row * T.gy + T.h / 2 };
}
// 萌宠在家的落脚点：自己那块地的左边
export function farmSpot(game, f) {
  if (game.phase !== 'home' || !game.homeTiles) return null;
  const i = game.homeTiles.indexOf(f.uid);
  if (i < 0) return null;
  const r = tileRect(i);
  return { x: r.x - 24, y: r.y + r.h - 4 };
}
export function stepHome(game, dt) {
  for (const f of game.pets.values()) if (f.farmJobs?.length && !((f.farmBusy || 0) > game.clock)) runJobs(game, f);
  if ((game.homeAutoT -= dt) > 0) return;
  game.homeAutoT = FARM.autoEvery;
  for (const f of game.humans()) if (!f.merc && !f.reserve && (f.auto || 0) > 0 && !busyFarm(f, game)) farmAll(game, f, { quiet: true, auto: true });
}

function summary(keys) { const m = {}; for (const k of keys) m[k] = (m[k] || 0) + 1; return Object.entries(m).map(([k, n]) => `${keyName(k)}×${n}`).join(' '); }
export function fmtSec(s) { s = Math.max(0, Math.ceil(s)); return s >= 3600 ? `${Math.floor(s / 3600)}小时${Math.round(s % 3600 / 60)}分` : s >= 60 ? `${Math.floor(s / 60)}分${s % 60 ? (s % 60) + '秒' : ''}` : `${s}秒`; }
export { SCORE };
