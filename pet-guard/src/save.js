// 玩家存档：按抖音用户ID保存每只萌宠的等级、经验、名字、天赋、闪光、亲密度、装备，以及守护值、送礼累计。
// 存在主播这台电脑这个浏览器的本地数据库（IndexedDB，见 idb-store.js）里；可导出/导入 JSON。
import { GEAR, LEVEL, ALL_SPECIES as SPECIES_IDS, TALENT, FOES, WISH, FRIEND, FARM, CROPS, ADV_PETS } from './config.js';

export const SAVE_KEY = 'pet-guard-save-v1';
const MAX_PROFILES = 20000;

export function weekKeyOf(ms) {
  const d = new Date(ms);
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}
export function dayKeyOf(ms) { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

export function newPet(level = 1) {
  return { lv: Math.max(1, level | 0), xp: 0, nick: '', talent: 0, talentPity: 0, star: 0, sub: 0, shiny: false, tv: 2, gear: {}, bond: 0 };
}
export function newProfile(uid, clearNo = 0) {
  return { uid, name: '小可爱', avatar: '', cur: null, pets: {}, merit: 0, weekMerit: 0, coins: 0, weekCoins: 0, games: 0, clears: 0, seen: 0,
    shards: [0, 0, 0, 0, 0], pity: { gold: 0, red: 0 }, auto: 0, seenClear: clearNo, buffs: null, checkinDay: '', patDay: '', patToday: 0,
    friends: {}, sprites: {}, follow: null, wishTrue: 0, farm: null };
}
// 这位观众最高的萌宠等级
export function bestLevel(p) { let b = 1; for (const d of Object.values(p?.pets || {})) b = Math.max(b, d.lv || 1); return b; }
// 取（没有就领养）某种萌宠的存档；新领养的从最高等级的一半开始
export function petData(p, sp) {
  const all = p.pets || (p.pets = {});
  if (!all[sp]) all[sp] = newPet(Math.max(1, Math.floor(bestLevel(p) * LEVEL.newPetFrac)));
  return all[sp];
}

// 旧存档的天赋换成新规则（没有 tv 标记的是旧的）：
// 旧：平凡/出色/卓越/非凡/传奇/神话，神话之后升星，闪光是另外 1.2% 抽的；新：最高档是「闪光」，闪光之后升星
// 旧神话2★及以上 → 闪光（星数-1）；旧的闪光萌宠 → 闪光档；旧神话1★ → 神话
function migrateTalent(d) {
  const top = TALENT.tiers.length - 1;
  if ((d.tv | 0) >= 2) { const t = clampInt(d.talent, 0, top, 0); return { talent: t, star: t === top ? clampInt(d.star, 0, 1e6, 0) : 0, shiny: t === top || !!d.shiny }; }
  const t = clampInt(d.talent, 0, 5, 0), s = clampInt(d.star, 0, 1e6, 0);
  if (d.shiny || (t === 5 && s >= 2)) return { talent: top, star: t === 5 && s >= 2 ? s - 1 : 0, shiny: true };
  return { talent: t, star: 0, shiny: false };
}
export class Save {
  constructor({ storage = null, now = () => Date.now() } = {}) {
    this.storage = storage;
    this.now = now;
    this.data = Save.empty(now());
    this.dirty = false;
    this.hot = new Set(); this.removed = new Set(); this.full = false; this.hotSource = null;
    if (storage) {
      try {
        if (storage.loadSave) { const obj = storage.loadSave(); if (obj) this.data = Save.validate(obj); }
        else { const raw = storage.getItem(SAVE_KEY); if (raw) this.data = Save.validate(JSON.parse(raw)); }
      } catch (e) { console.warn('存档读取失败，使用空存档', e); }
    }
    this.rollWeek();
  }

  static empty(now) { return { version: 1, players: {}, week: weekKeyOf(now), rounds: 0, stage: 1, best: 0, clearNo: 0, failStreak: 0, wishes: { slots: [], queue: [] }, wishTotal: 0 }; }

  static validate(obj) {
    if (!obj || typeof obj !== 'object' || obj.version !== 1 || typeof obj.players !== 'object' || Array.isArray(obj.players)) throw new Error('存档格式不对');
    const players = {};
    for (const [uid, p] of Object.entries(obj.players)) {
      if (!p || typeof p !== 'object' || typeof uid !== 'string' || uid.length > 256) continue;
      const pets = {};
      for (const sp of SPECIES_IDS) {
        const d = p.pets?.[sp];
        if (!d || typeof d !== 'object') continue;
        const tl = migrateTalent(d);
        pets[sp] = {
          lv: clampInt(d.lv, 1, 1e6, 1), xp: clampInt(d.xp, 0, 1e12, 0), nick: cleanNick(d.nick),
          talent: tl.talent, talentPity: clampInt(d.talentPity, 0, 1e6, 0),
          star: tl.star, sub: clampInt(d.sub, 0, TALENT.tiers.length - 2, 0),
          shiny: tl.shiny, tv: 2, gear: validGear(d.gear), bond: clampInt(d.bond, 0, 1e9, 0),
        };
      }
      players[uid] = {
        uid,
        name: String(p.name || '小可爱').slice(0, 24),
        avatar: typeof p.avatar === 'string' ? p.avatar.slice(0, 1024) : '',
        cur: SPECIES_IDS.includes(p.cur) ? p.cur : null,
        pets,
        merit: clampInt(p.merit, 0, 1e12, 0), weekMerit: clampInt(p.weekMerit, 0, 1e12, 0),
        coins: clampInt(p.coins, 0, 1e12, 0), weekCoins: clampInt(p.weekCoins, 0, 1e12, 0),
        games: clampInt(p.games, 0, 1e9, 0), clears: clampInt(p.clears, 0, 1e9, 0), seen: clampInt(p.seen, 0, 1e15, 0),
        shards: [0, 1, 2, 3, 4].map(i => clampInt(p.shards?.[i], 0, 1e9, 0)),
        pity: { gold: clampInt(p.pity?.gold, 0, 1e6, 0), red: clampInt(p.pity?.red, 0, 1e6, 0) },
        auto: clampInt(p.auto, 0, 1e12, 0),
        seenClear: clampInt(p.seenClear, 0, 1e12, 0),
        checkinDay: typeof p.checkinDay === 'string' ? p.checkinDay.slice(0, 10) : '',
        patDay: typeof p.patDay === 'string' ? p.patDay.slice(0, 10) : '', patToday: clampInt(p.patToday, 0, 1e6, 0),
        buffs: validBuffs(p.buffs),
        friends: validFriends(p.friends), sprites: validSprites(p.sprites), follow: FOES[p.follow] ? p.follow : null, wishTrue: clampInt(p.wishTrue, 0, 1e9, 0),
        farm: validFarm(p.farm),
      };
    }
    return {
      version: 1, players, week: typeof obj.week === 'string' ? obj.week : '', rounds: clampInt(obj.rounds, 0, 1e9, 0),
      stage: clampInt(obj.stage, 1, 9999, 1), best: clampInt(obj.best, 0, 9999, 0), clearNo: clampInt(obj.clearNo, 0, 1e12, 0), failStreak: clampInt(obj.failStreak, 0, 99, 0),
      wishes: validWishes(obj.wishes), wishTotal: clampInt(obj.wishTotal, 0, 1e9, 0),
    };
  }

  rollWeek() {
    const wk = weekKeyOf(this.now());
    if (this.data.week !== wk) {
      for (const p of Object.values(this.data.players)) { p.weekMerit = 0; p.weekCoins = 0; }
      this.data.week = wk; this.dirty = true; this.full = true;
    }
  }

  get(uid, name, avatar) {
    let p = this.data.players[uid];
    if (!p) { p = this.data.players[uid] = newProfile(uid, this.data.clearNo || 0); this.prune(); }
    this.hot.add(uid);
    if (name) p.name = String(name).slice(0, 24);
    if (avatar) p.avatar = avatar;
    p.seen = this.now();
    this.dirty = true;
    return p;
  }

  peek(uid) { const p = this.data.players[uid] || null; if (p) this.hot.add(uid); return p; }

  // 给某只萌宠加经验，返回升了几级
  addXp(pet, xp) {
    pet.xp += Math.max(0, Math.floor(xp));
    let ups = 0;
    while (pet.xp >= LEVEL.need(pet.lv)) { pet.xp -= LEVEL.need(pet.lv); pet.lv++; ups++; }
    this.dirty = true;
    return ups;
  }

  prune() {
    const all = Object.values(this.data.players);
    if (all.length <= MAX_PROFILES) return;
    all.sort((a, b) => ((a.coins || 0) > 0) - ((b.coins || 0) > 0) || a.seen - b.seen);   // 送过礼的人最后才清
    for (const p of all.slice(0, all.length - MAX_PROFILES)) { delete this.data.players[p.uid]; this.removed.add(p.uid); this.hot.delete(p.uid); }
  }

  flush() {
    if (!this.dirty || !this.storage) return false;
    if (this.storage.writeSave) {
      const P = this.data.players;
      const ids = this.full ? Object.keys(P) : [...new Set([...this.hot, ...(this.hotSource?.() || [])])].filter(uid => P[uid]);
      const { players, ...meta } = this.data; void players;
      this.storage.writeSave(meta, ids.map(uid => [uid, P[uid]]), [...this.removed], this.full);
      this.hot.clear(); this.removed.clear(); this.full = false; this.dirty = false;
      return true;
    }
    try { this.storage.setItem(SAVE_KEY, JSON.stringify(this.data)); this.dirty = false; return true; }
    catch (e) { console.warn('存档写入失败', e); this.onError?.(e); return false; }
  }

  exportJson() { return JSON.stringify(this.data); }
  importJson(text) {
    const next = Save.validate(JSON.parse(text));
    this.data = next; this.rollWeek(); this.dirty = true; this.full = true; this.flush();
    return Object.keys(next.players).length;
  }
  clear() { this.data = Save.empty(this.now()); this.dirty = true; this.full = true; this.flush(); }
}

// 萌宠名字：去掉空白和符号，最多6个字
export function cleanNick(s) {
  return String(s || '').replace(/[\s\u200b-\u200f\u2028-\u202f]+/g, '').replace(/[^\p{L}\p{N}·_\-~～]/gu, '').slice(0, 6);
}
function validGear(g) {
  const out = {};
  if (!g || typeof g !== 'object') return out;
  for (const slot of Object.keys(GEAR.slots)) {
    const it = g[slot];
    if (!it || typeof it !== 'object') continue;
    const tier = clampInt(it.tier, 0, GEAR.tiers.length - 1, 0), roll = Number(it.roll);
    const subs = Array.isArray(it.subs) ? it.subs.filter(x => x && GEAR.stats[x.stat] && Number.isFinite(Number(x.v))).slice(0, 5).map(x => ({ stat: x.stat, v: Math.max(0, Math.min(3, Number(x.v))) })) : [];
    out[slot] = { slot, plus: clampInt(it.plus, 0, 999, 0), tier, roll: Number.isFinite(roll) ? Math.max(0.5, Math.min(1.5, roll)) : 1, subs };
  }
  return out;
}
function validBuffs(b) {
  if (!b || typeof b !== 'object') return null;
  const n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
  return { xp: n(b.xp), spirit: n(b.spirit), double: n(b.double), mercs: Array.isArray(b.mercs) ? b.mercs.slice(0, 9).map(n) : [], floors: Array.isArray(b.floors) ? b.floors.slice(0, 6).map(x => ({ tier: clampInt(x?.tier, 0, 5, 0), until: n(x?.until) })) : [] };
}
// 心愿：只留文字和名字（长度受限）
export function cleanWish(s) {
  return String(s || '').replace(/[\s\u200b-\u200f\u2028-\u202f]+/g, '').replace(/[^\p{L}\p{N}·_\-~～!！?？,，.。、♥❤]/gu, '').slice(0, WISH.maxLen);
}
function validWish(w) {
  if (!w || typeof w !== 'object' || typeof w.uid !== 'string') return null;
  const text = cleanWish(w.text);
  return text ? { uid: w.uid.slice(0, 256), name: String(w.name || '小可爱').slice(0, 24), text, t: Number.isFinite(Number(w.t)) ? Number(w.t) : 0 } : null;
}
function validWishes(o) {
  const slots = Array.isArray(o?.slots) ? o.slots.slice(0, 12).map(validWish) : [];
  const queue = Array.isArray(o?.queue) ? o.queue.slice(0, WISH.queue).map(validWish).filter(Boolean) : [];
  return { slots, queue };
}
function validFriends(o) {
  const out = {};
  if (!o || typeof o !== 'object') return out;
  for (const [uid, v] of Object.entries(o).slice(0, FRIEND.max)) {
    if (typeof uid !== 'string' || uid.length > 256 || !v || typeof v !== 'object') continue;
    out[uid] = { n: String(v.n || '小可爱').slice(0, 24), v: clampInt(v.v, 0, 1e9, 0), day: typeof v.day === 'string' ? v.day.slice(0, 10) : '', dv: clampInt(v.dv, 0, 1e6, 0) };
  }
  return out;
}
// 农场：金币、等级、每块地种的什么、仓库、解锁的高级萌宠
export function newFarm() { return { coins: FARM.startCoins, lv: 1, xp: 0, plots: Array(FARM.plotsStart).fill(null), barn: {}, pets: [], harvest: 0, sold: 0 }; }
function validFarm(o) {
  if (!o || typeof o !== 'object') return null;
  const ids = new Set(CROPS.map(c => c.id)), muts = new Set(FARM.mutations.map(m => m.id)), n = clampInt(Array.isArray(o.plots) ? o.plots.length : FARM.plotsStart, FARM.plotsStart, FARM.plotsMax, FARM.plotsStart);
  const plots = [];
  for (let i = 0; i < n; i++) {
    const p = o.plots?.[i];
    plots.push(p && typeof p === 'object' && ids.has(p.c) ? { c: p.c, at: Number(p.at) || 0, ready: Number(p.ready) || 0, w: p.w ? 1 : 0, fw: p.fw ? 1 : 0, ...(muts.has(p.m) ? { m: p.m } : {}) } : null);
  }
  const barn = {};
  for (const [k, v] of Object.entries(o.barn || {})) { const [c, m] = k.split(':'); if (ids.has(c) && (!m || muts.has(m)) && v > 0) barn[k] = clampInt(v, 0, 1e9, 0); }
  return { coins: clampInt(o.coins, 0, 1e12, 0), lv: clampInt(o.lv, 1, 999, 1), xp: clampInt(o.xp, 0, 1e12, 0), plots, barn,
    pets: Array.isArray(o.pets) ? o.pets.filter(sp => ADV_PETS[sp]).slice(0, 20) : [], harvest: clampInt(o.harvest, 0, 1e12, 0), sold: clampInt(o.sold, 0, 1e15, 0) };
}
function validSprites(o) {
  const out = {};
  if (!o || typeof o !== 'object') return out;
  for (const u of Object.keys(FOES)) if (o[u]) out[u] = clampInt(o[u], 0, 1e9, 0);
  return out;
}
function clampInt(v, lo, hi, d) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; }
