// 玩家存档：按抖音用户ID保存等级、经验、战功、胜场、涂装。
// 存在主播这台电脑的浏览器 localStorage 里；可导出/导入 JSON。
import { LEVEL, SKINS } from './config.js';

const KEY = 'starship-barrage-save-v1';
const MAX_PROFILES = 20000;

export function weekKeyOf(ms) {
  const d = new Date(ms);
  const day = (d.getDay() + 6) % 7; // 周一=0
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
}

export function skinFor(level) {
  let s = 0;
  SKINS.forEach((k, i) => { if (level >= k.lv) s = i; });
  return s;
}

export class Save {
  constructor({ storage = null, now = () => Date.now() } = {}) {
    this.storage = storage;
    this.now = now;
    this.data = { version: 1, players: {}, week: weekKeyOf(now()), rounds: 0, mode: 'pvp', pveStage: 1, pveBest: 0 };
    this.dirty = false;
    if (storage) {
      try {
        const raw = storage.getItem(KEY);
        if (raw) this.data = Save.validate(JSON.parse(raw));
      } catch (e) { console.warn('存档读取失败，使用空存档', e); }
    }
    this.rollWeek();
  }

  static validate(obj) {
    if (!obj || typeof obj !== 'object' || obj.version !== 1 || typeof obj.players !== 'object' || Array.isArray(obj.players)) throw new Error('存档格式不对');
    const players = {};
    for (const [uid, p] of Object.entries(obj.players)) {
      if (!p || typeof p !== 'object' || typeof uid !== 'string' || uid.length > 256) continue;
      players[uid] = {
        uid,
        name: String(p.name || '飞行员').slice(0, 24),
        avatar: typeof p.avatar === 'string' ? p.avatar.slice(0, 1024) : '',
        level: clampInt(p.level, 1, LEVEL.max, 1),
        xp: clampInt(p.xp, 0, 1e9, 0),
        kills: clampInt(p.kills, 0, 1e9, 0),
        wins: clampInt(p.wins, 0, 1e9, 0),
        games: clampInt(p.games, 0, 1e9, 0),
        merit: clampInt(p.merit, 0, 1e12, 0),
        weekMerit: clampInt(p.weekMerit, 0, 1e12, 0),
        seen: clampInt(p.seen, 0, 1e15, 0),
      };
    }
    return {
      version: 1, players, week: typeof obj.week === 'string' ? obj.week : '', rounds: clampInt(obj.rounds, 0, 1e9, 0),
      mode: obj.mode === 'pve' ? 'pve' : 'pvp', pveStage: clampInt(obj.pveStage, 1, 999, 1), pveBest: clampInt(obj.pveBest, 0, 999, 0),
    };
  }

  rollWeek() {
    const wk = weekKeyOf(this.now());
    if (this.data.week !== wk) {
      for (const p of Object.values(this.data.players)) p.weekMerit = 0;
      this.data.week = wk;
      this.dirty = true;
    }
  }

  get(uid, name, avatar) {
    let p = this.data.players[uid];
    if (!p) {
      p = this.data.players[uid] = { uid, name: '飞行员', avatar: '', level: 1, xp: 0, kills: 0, wins: 0, games: 0, merit: 0, weekMerit: 0, seen: 0 };
      this.prune();
    }
    if (name) p.name = String(name).slice(0, 24);
    if (avatar) p.avatar = avatar;
    p.seen = this.now();
    this.dirty = true;
    return p;
  }

  peek(uid) { return this.data.players[uid] || null; }

  addXp(p, xp) {
    p.xp += Math.max(0, Math.floor(xp));
    let ups = 0;
    while (p.level < LEVEL.max && p.xp >= LEVEL.need(p.level)) { p.xp -= LEVEL.need(p.level); p.level++; ups++; }
    if (p.level >= LEVEL.max) p.xp = Math.min(p.xp, LEVEL.need(p.level));
    this.dirty = true;
    return ups;
  }

  topWeek(n = 10) {
    return Object.values(this.data.players).filter(p => p.weekMerit > 0).sort((a, b) => b.weekMerit - a.weekMerit).slice(0, n);
  }

  prune() {
    const all = Object.values(this.data.players);
    if (all.length <= MAX_PROFILES) return;
    all.sort((a, b) => a.seen - b.seen);
    for (const p of all.slice(0, all.length - MAX_PROFILES)) delete this.data.players[p.uid];
  }

  flush() {
    if (!this.dirty || !this.storage) return false;
    try { this.storage.setItem(KEY, JSON.stringify(this.data)); this.dirty = false; return true; }
    catch (e) { console.warn('存档写入失败', e); return false; }
  }

  exportJson() { return JSON.stringify(this.data); }

  importJson(text) {
    const next = Save.validate(JSON.parse(text));
    this.data = next; this.rollWeek(); this.dirty = true; this.flush();
    return Object.keys(next.players).length;
  }

  clear() { this.data = { version: 1, players: {}, week: weekKeyOf(this.now()), rounds: 0, mode: this.data.mode || 'pvp', pveStage: 1, pveBest: 0 }; this.dirty = true; this.flush(); }
}

function clampInt(v, lo, hi, d) { const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; }
