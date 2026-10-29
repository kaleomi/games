// 回家种田：打完一章的首领回家，每位观众一块菜地（最多6块地）
// 种下 → 浇水（快40%）→ 熟了收获进仓库 → 卖掉换金币；金币买种子、扩地、解锁高级萌宠；收获涨农场经验，升级解锁新作物
// 作物按真实时间长，在家种下、打一章回来就熟了（快的萝卜在家就能收）
import { CROPS, FARM, ADV_PETS, SPECIES, SCORE } from './config.js';
import { newFarm } from './save.js';
import { profileOf } from './loot.js';
import { bestFriend, addFriendship } from './friends.js';

export const CROP = Object.fromEntries(CROPS.map(c => [c.id, c]));
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
export function marketMul(game, id) { const m = game.market; return !m ? 1 : m.hot === id ? FARM.market.hot : m.cold === id ? FARM.market.cold : 1; }
export function petUnlocked(game, f, sp) {
  if (!ADV_PETS[sp]) return true;
  const farm = farmOf(game, f);
  return !!farm && farm.pets.includes(sp);
}
const say = (game, f, text) => game.emit('toast', { uid: f.uid, text: `${f.name}：${text}` });
const atHome = game => game.phase === 'home';
function needHome(game, f) { if (atHome(game)) return true; say(game, f, '打完这一章的首领回家才能种田哦'); return false; }

// ───────── 农活 ─────────
// 种：不说种什么就种「解锁了的、买得起的、最贵的」那种；每块空地各种一棵
export function plant(game, f, cropId = null, { quiet = false } = {}) {
  if (!needHome(game, f)) return 0;
  const farm = farmOf(game, f), now = nowMs(game);
  const empty = farm.plots.map((p, i) => (p ? -1 : i)).filter(i => i >= 0);
  if (!empty.length) { if (!quiet) say(game, f, '地都种满了（熟了发「收」，想多种发「扩地」）'); return 0; }
  let c = cropId ? CROP[cropId] : null;
  if (c && !cropUnlocked(farm, c.id)) { say(game, f, `${c.name}要农场 Lv${c.lv} 才能种（现在 Lv${farm.lv}）`); return 0; }
  if (!c) c = [...CROPS].reverse().find(x => cropUnlocked(farm, x.id) && x.seed <= farm.coins) || null;
  if (!c) { if (!quiet) say(game, f, `金币不够买种子了（还有${farm.coins}金币，先「收」「卖」）`); return 0; }
  let n = 0;
  for (const i of empty) {
    if (farm.coins < c.seed) break;
    farm.coins -= c.seed;
    farm.plots[i] = { c: c.id, at: now, ready: now + c.grow * 1000, w: 0, fw: 0 };
    n++;
  }
  if (!n) { if (!quiet) say(game, f, `金币不够买${c.name}种子（要${c.seed}金币）`); return 0; }
  dirty(game);
  game.emit('farmPlant', { uid: f.uid, crop: c.id, n });
  if (!quiet) say(game, f, `种下${n}棵${c.name}（-${n * c.seed}金币），${fmtSec(c.grow)}后成熟，浇水更快`);
  return n;
}
// 浇水：自己没熟的菜都浇一遍（剩下的时间 ×0.6）；好朋友在场顺手也给他浇（×0.8，友情+1）
export function water(game, f, { quiet = false } = {}) {
  if (!needHome(game, f)) return 0;
  const farm = farmOf(game, f), now = nowMs(game);
  let n = 0;
  for (const p of farm.plots) if (p && !p.w && p.ready > now) { p.ready = now + (p.ready - now) * FARM.water; p.w = 1; n++; }
  let fn = 0, friend = null;
  const bf = bestFriend(game, f, true);
  if (bf) {
    const o = game.pets.get(bf.uid), ff = o && farmOf(game, o);
    if (ff) for (const p of ff.plots) if (p && !p.fw && p.ready > now) { p.ready = now + (p.ready - now) * FARM.friendWater; p.fw = 1; fn++; }
    if (fn) { friend = o; addFriendship(game, f, o, 1, 'hug'); }
  }
  if (!n && !fn) { if (!quiet) say(game, f, '菜都浇过水了（或者还没种），去「种」点什么吧'); return 0; }
  dirty(game);
  game.emit('farmWater', { uid: f.uid, n, friend: friend?.uid || null, fn });
  if (!quiet) say(game, f, `浇了${n}块地${friend ? `，顺手给好朋友${friend.name}浇了${fn}块` : ''}`);
  return n + fn;
}
// 收：熟了的都收进仓库，涨农场经验
export function harvest(game, f, { quiet = false } = {}) {
  if (!needHome(game, f)) return 0;
  const farm = farmOf(game, f), now = nowMs(game), got = [];
  farm.plots.forEach((p, i) => { if (p && p.ready <= now) { got.push(p.c); farm.barn[p.c] = (farm.barn[p.c] || 0) + 1; farm.plots[i] = null; } });
  if (!got.length) {
    if (!quiet) { const next = farm.plots.filter(Boolean).map(p => (p.ready - now) / 1000).sort((a, b) => a - b)[0]; say(game, f, next ? `还没熟，最快的还要${fmtSec(next)}（浇水更快）` : '地里还空着，先「种」吧'); }
    return 0;
  }
  const xp = got.reduce((s, id) => s + CROP[id].xp, 0);
  farm.harvest += got.length;
  dirty(game);
  game.emit('farmHarvest', { uid: f.uid, crops: got, n: got.length, xp });
  f.happyT = 1.3;
  game.scoreFarm?.(f, got.length);
  addFarmXp(game, f, farm, xp);
  if (!quiet) say(game, f, `收获${got.length}个（${summary(got)}），农场经验+${xp}，发「卖」换金币`);
  return got.length;
}
// 卖：仓库里的全卖了（今日行情：一种 ×2，一种 ×0.7）
export function sell(game, f, { quiet = false } = {}) {
  if (!needHome(game, f)) return 0;
  const farm = farmOf(game, f);
  let coins = 0, n = 0;
  const list = [];
  for (const [id, cnt] of Object.entries(farm.barn)) { if (!(cnt > 0)) continue; coins += Math.round(cnt * CROP[id].sell * marketMul(game, id)); n += cnt; list.push(id); }
  if (!n) { if (!quiet) say(game, f, '仓库是空的，先「收」菜'); return 0; }
  farm.barn = {}; farm.coins += coins; farm.sold += coins;
  dirty(game);
  game.emit('farmSell', { uid: f.uid, coins, n, crops: list });
  if (!quiet) say(game, f, `卖了${n}个菜，赚了${coins}金币（现在${farm.coins}金币）`);
  return coins;
}
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
// 一键「种田」：收 → 卖 → 种 → 浇
export function farmAll(game, f, { quiet = false } = {}) {
  if (!needHome(game, f)) return false;
  const h = harvest(game, f, { quiet: true }), s = sell(game, f, { quiet: true }), p = plant(game, f, null, { quiet: true }), w = water(game, f, { quiet: true });
  if (!quiet) {
    const farm = farmOf(game, f), parts = [];
    if (h) parts.push(`收了${h}个`); if (s) parts.push(`卖了${s}金币`); if (p) parts.push(`种了${p}棵`); if (w) parts.push(`浇了${w}块`);
    say(game, f, parts.length ? `${parts.join('、')}（${farm.coins}金币）` : '菜还没熟，也没空地了，等一会儿再来');
  }
  return !!(h || s || p || w);
}
// 解锁高级萌宠：农场等级够 + 金币够；解锁了直接换成它
export function unlockPet(game, f, sp) {
  const A = ADV_PETS[sp];
  if (!A) return false;
  const farm = farmOf(game, f);
  if (!farm) return false;
  if (farm.pets.includes(sp)) { game.setSpecies(f, sp); return true; }
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
  const pool = CROPS.filter(c => c.lv <= 12);
  const hot = pool[Math.floor(game.random() * pool.length)];
  let cold = pool[Math.floor(game.random() * pool.length)];
  if (cold === hot) cold = pool[(pool.indexOf(hot) + 1) % pool.length];
  game.market = { hot: hot.id, cold: cold.id };
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
  if ((game.homeAutoT -= dt) > 0) return;
  game.homeAutoT = FARM.autoEvery;
  for (const f of game.humans()) if (!f.merc && !f.reserve && (f.auto || 0) > 0) farmAll(game, f, { quiet: true });
}

function summary(ids) { const m = {}; for (const id of ids) m[id] = (m[id] || 0) + 1; return Object.entries(m).map(([id, n]) => `${CROP[id].name}×${n}`).join(' '); }
export function fmtSec(s) { s = Math.max(0, Math.ceil(s)); return s >= 3600 ? `${Math.floor(s / 3600)}小时${Math.round(s % 3600 / 60)}分` : s >= 60 ? `${Math.floor(s / 60)}分${s % 60 ? (s % 60) + '秒' : ''}` : `${s}秒`; }
export { SCORE };
