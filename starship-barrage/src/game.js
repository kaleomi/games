// 星舰弹幕战 · 战斗模拟（不依赖页面，可在 Node 里测试）
import {
  W, H, TEAMS, ROUND, FLAGSHIP, FIGHTER, WEAPONS, GIFT_TIERS, GIFT, MERIT, LEVEL, NPC, LIMITS, PVE, MODE_NAMES, PVP_ENABLED,
} from './config.js';
import { skinFor } from './save.js';
import { setupBoss, setupFleetSide, startPve, stepPve, stepAlien, currentStage, interceptZone, spawnFormation, lateMul, failStage, stageKind, stageLabel, smallKill, chapterOf } from './pve.js';
import { syncDodge, fmtDuration, score, giveItem, makeItem } from './fleet.js';
import { nearestEnemy } from './fleet.js';
import { pveGiftKind, applyPveGift, stepPveGifts, moraleLike, dailyCheckin, chestKilled, xpMul, pauseSummons, resumeSummons } from './gifts-pve.js';
import { setupShip, stepShip, stepBeam, hurt as fleetHurt, parseClass, parseSkill, requestSkill, refreshStats, rollDrops, laneCenter, growthE } from './fleet.js';
import { GEAR } from './config.js';
const GEAR_SLOTS = () => GEAR.slots;

const TEAM_IDS = ['red', 'blue'];
const other = t => (t === 'red' ? 'blue' : 'red');
const LANE_X = { L: 150, M: 360, R: 570 };
const CELL = 48;

const NPC_NAMES = ['游隼', '夜枭', '赤鸢', '灰狼', '白鲸', '星鸦', '雷隼', '影蛇', '铁鹰', '寒鸦', '流萤', '赤狐'];

export function tierForGift(gift, settings) {
  const name = String(gift.name || '');
  const map = settings?.giftTierByName || {};
  if (name && map[name]) return Math.max(1, Math.min(5, map[name] | 0));
  const price = Number(gift.price);
  if (!Number.isFinite(price) || price <= 0) return 1;
  const tiers = settings?.tiers || GIFT_TIERS.map(t => t.min);
  let tier = 1;
  for (let i = 0; i < tiers.length; i++) if (price >= tiers[i]) tier = i + 1;
  return tier;
}

export function parseCommand(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s || s.length > 40) return null;
  const has = (...words) => words.some(w => s === w || s.startsWith(w) || s.includes(w));
  if (/^换(成|到)?(讨伐|pve|打怪|打boss|boss|闯关|副本|母舰)/.test(s)) return { type: 'mode', mode: 'pve' };
  if (/^换(成|到)?(对战|pvp|对抗|红蓝|对攻)/.test(s)) return { type: 'mode', mode: 'pvp' };
  if (/^(红|红队|赤焰|1|加入红)/.test(s)) return { type: 'team', team: 'red' };
  if (/^(蓝|蓝队|苍穹|2|加入蓝)/.test(s)) return { type: 'team', team: 'blue' };
  if (has('拦截', 'lj')) return { type: 'intercept' };
  if (has('激光', 'jg')) return { type: 'weapon', weapon: 'laser' };
  if (has('散弹', 'sd')) return { type: 'weapon', weapon: 'spread' };
  if (has('蓄力', 'xl')) return { type: 'weapon', weapon: 'charge' };
  if (has('核心')) return { type: 'target', target: 'core' };
  if (has('炮台')) return { type: 'target', target: 'turret' };
  if (has('大招', 'dz')) return { type: 'ult' };
  if (has('技能', 'jn')) return { type: 'skill' };
  if (/^左/.test(s)) return { type: 'lane', lane: 'L' };
  if (/^中/.test(s)) return { type: 'lane', lane: 'M' };
  if (/^右/.test(s)) return { type: 'lane', lane: 'R' };
  if (has('装备', '背包', 'zb')) return { type: 'gear' };
  if (has('签到', '打卡')) return { type: 'checkin' };
  if (has('我的', '查询', '战绩')) return { type: 'card' };
  if (has('加入', '参战', '起飞')) return { type: 'join' };
  return null;
}

export class Game {
  constructor({ save, random = Math.random, now = () => Date.now(), settings = {} } = {}) {
    this.save = save;
    this.random = random;
    this.now = now;
    this.settings = {
      battleMinutes: ROUND.battleMinutes,
      npcMinPerTeam: NPC.minPerTeam,
      tiers: GIFT_TIERS.map(t => t.min),
      giftTierByName: {},
      pvpEnabled: PVP_ENABLED,
      ...settings,
    };
    this.events = [];
    this.fighters = new Map();
    this.bullets = [];
    this.emitters = [];
    this.hazards = [];
    this.battleships = [];
    this.pendingGifts = [];
    this.roundNo = 0;
    this.time = 0;          // 本局战斗已进行秒数
    this.clock = 0;         // 总运行秒数
    this.npcSeq = 0;
    this.shipSeq = 0;
    this.fGrid = new Map();
    this.bGrid = new Map();
    this.stats = { gifts: 0, giftUnits: 0, chats: 0, likes: 0 };
    this.mode = save?.data?.mode === 'pve' || !this.settings.pvpEnabled ? 'pve' : 'pvp';
    this.modeVote = null;
    this.pve = null;
    this.alienSeq = 0;
    this.zones = []; this.barriers = []; this.zoneSeq = 0; this.pveDrones = [];
    this.memStage = 1; this.memClearNo = 0;
    this.reserve = new Map();   // 讨伐后援：uid → 战机（不在场上）
    this.teams = {};
    for (const id of TEAM_IDS) this.teams[id] = this.makeTeam(id);
    this.startLobby();
  }

  // ───────── 回合 ─────────
  makeTeam(id) {
    const def = TEAMS[id];
    const t = {
      id, def,
      core: FLAGSHIP.coreMax, coreMax: FLAGSHIP.coreMax,
      shield: FLAGSHIP.shieldMax, shieldMax: FLAGSHIP.shieldMax,
      turrets: [-170, 170].map(dx => this.makeTurret(id, dx)),
      extraTurret: false,
      cannon: { state: 'idle', t: 0, intercept: 0, owner: null, ownerName: '', fireT: 0 },
      patternQueue: [], patternT: 0,
      shipQueue: [],
      hitFlash: 0, sinceHit: 99, dmgTaken: 0,
      x: 360, y: def.flagY, present: true, coreDy: 0, hitW: FLAGSHIP.hitWidth, boss: false,
    };
    if (this.mode === 'pve' && id === 'red') setupBoss(this, t);
    if (this.mode === 'pve' && id === 'blue') setupFleetSide(t);
    return t;
  }

  makeTurret(team, dx) {
    const def = TEAMS[team];
    return { dx, dy: def.dir * 38, x: 360 + dx, y: def.flagY + def.dir * 38, hp: FLAGSHIP.turretHp, max: FLAGSHIP.turretHp, dead: false, respawn: 0, cd: 1.5 + this.random() * 2 };
  }

  zoneOf(team) {
    if (this.mode === 'pve') return team === 'blue' ? PVE.zone : PVE.alienZone;
    return TEAMS[team].zone;
  }

  startLobby() {
    this.phase = 'lobby';
    this.phaseT = this.mode === 'pve' ? ROUND.pveLobbySeconds : ROUND.lobbySeconds;
    this.roundNo++;
    this.time = 0;
    this.winner = null;
    this.pve = null;
    this.zones = []; this.barriers = []; this.pveDrones = []; this.rays = []; this.gravity = null;
    this.bullets.length = 0; this.emitters.length = 0; this.hazards.length = 0; this.battleships.length = 0;
    for (const id of TEAM_IDS) this.teams[id] = this.makeTeam(id);
    const nowMs = this.now();
    for (const f of [...this.fighters.values()]) {
      if (f.npc) { this.fighters.delete(f.uid); continue; }
      if (this.mode === 'pve' && f.reserve) continue;
      if (this.mode !== 'pve' && nowMs - f.lastActive > FIGHTER.idleKick * 1000) { this.fighters.delete(f.uid); continue; }
      this.resetFighterForRound(f);
    }
    this.syncNpcs(true);
    this.emit('phase', { phase: 'lobby', round: this.roundNo });
  }

  startBattle() {
    this.phase = 'battle';
    this.phaseT = this.settings.battleMinutes * 60;
    this.time = 0;
    this.emit('phase', { phase: 'battle', round: this.roundNo });
    if (this.mode === 'pve') { this.phaseT = 1e9; startPve(this); }
    else this.emit('announce', { text: `第${this.roundNo}局开战！`, voice: true });
    const pending = this.pendingGifts.splice(0);
    for (const g of pending) this.applyGift(g.user, g.gift, g.amount, g.tier);
  }

  endBattle(winner, reason) {
    this.phase = 'result';
    this.phaseT = this.mode === 'pve' ? ROUND.pveResultSeconds : ROUND.resultSeconds;
    this.winner = winner;
    const result = { winner, reason, round: this.roundNo, mvp: {}, players: 0, mode: this.mode };
    for (const id of TEAM_IDS) {
      const list = this.humans().filter(f => f.team === id).sort((a, b) => b.merit - a.merit);
      result.mvp[id] = list.slice(0, this.mode === 'pve' ? 10 : 3).map(f => ({ uid: f.uid, name: f.name, avatar: f.avatar || '', merit: Math.floor(f.merit), kills: f.kills, cls: f.cls || null }));
    }
    if (this.mode === 'pve') {
      const stage = this.pve?.stage || currentStage(this);
      const clear = winner === 'blue';
      const next = clear ? stage + 1 : failStage(stage);
      if (this.save) { this.save.data.pveStage = next; this.save.data.pveBest = Math.max(this.save.data.pveBest || 0, clear ? stage : 0); this.save.dirty = true; }
      this.memStage = next;
      Object.assign(result, { stage, clear, next, kind: stageKind(stage), bossName: this.teams.red.bossName, small: this.pve?.smallDrops || 0 });
      result.drops = clear ? rollDrops(this, chapterOf(stage)) : [];
      if (clear) result.reserve = this.clearReward(stage);
      for (const f of this.humans()) f.giftRound = 0;   // 结算后清零，结算期间送的算下一局
    }
    for (const f of this.humans()) {
      const p = f.test ? null : this.save?.get(f.uid);
      if (!p) continue;
      const win = f.team === winner;
      const roundMerit = Math.floor(f.merit + (win ? MERIT.win : 0));
      p.games++; if (win) p.wins++;
      p.kills += f.kills; p.merit += roundMerit; p.weekMerit += roundMerit;
      // 经验 = 本局贡献值（对战=战功），讨伐里战斗中已经实时发过的部分不重复算
      const gain = this.mode === 'pve' ? Math.round(Math.max(0, Math.floor(f.merit) - (f.xpCounted || 0)) * xpMul(this, f)) : roundMerit;
      f.xpCounted = Math.floor(f.merit);
      const ups = this.save.addXp(p, 20 + gain);
      if (ups) this.emit('levelup', { uid: f.uid, name: f.name, level: p.level });
      f.level = p.level; f.skin = skinFor(p.level);
      result.players++;
    }
    for (const list of Object.values(result.mvp)) for (const m of list) m.level = this.fighters.get(m.uid)?.level || 1;
    if (this.save) { this.save.data.rounds++; this.save.flush(); }
    this.emit('result', result);
    if (this.mode === 'pve') this.emit('announce', { text: result.clear ? `${stageLabel(result.stage)}讨伐成功！` : `讨伐失败，退回${stageLabel(result.next)}`, voice: true });
    else this.emit('announce', { text: winner ? `${TEAMS[winner].name}获胜！` : '本局平局', voice: true });
  }

  // ───────── 加入 / 指令 ─────────
  humans() { const a = []; for (const f of this.fighters.values()) if (!f.npc) a.push(f); return a; }
  countTeam(team, humansOnly = false) { let n = 0; for (const f of this.fighters.values()) if (f.team === team && (!humansOnly || !f.npc)) n++; return n; }

  pickTeam() {
    if (this.mode === 'pve') return 'blue';
    const r = this.countTeam('red', true), b = this.countTeam('blue', true);
    if (r !== b) return r < b ? 'red' : 'blue';
    const rp = this.teams.red.core / this.teams.red.coreMax, bp = this.teams.blue.core / this.teams.blue.coreMax;
    if (rp !== bp) return rp < bp ? 'red' : 'blue';
    return this.random() < 0.5 ? 'red' : 'blue';
  }

  join(user, team = null, { force = false } = {}) {
    const uid = String(user?.id || '');
    if (!uid) return null;
    let f = this.fighters.get(uid);
    const nowMs = this.now();
    if (!f && this.mode === 'pve' && this.reserve.has(uid)) return this.fromReserve(this.reserve.get(uid), user, force);
    if (!f && this.mode === 'pve' && this.activeHumans() >= PVE.reserve.cap && !this.makeRoom(force)) return this.newToReserve(user);
    if (f) {
      if (user.name) f.name = String(user.name).slice(0, 24);
      if (user.avatar) f.avatar = user.avatar;
      f.lastActive = nowMs;
      if (team && this.mode === 'pve') { f.pvpTeam = team; return f; }
      if (team && team !== f.team) {
        if (this.phase === 'battle') { this.emit('toast', { uid, text: `${f.name}：本局已在${TEAMS[f.team].short}队，下局开始前可换队` }); }
        else { f.team = team; this.resetFighterForRound(f); this.emit('toast', { uid, text: `${f.name} 换到${TEAMS[team].name}` }); this.syncNpcs(); }
      }
      return f;
    }
    if (this.humans().length >= LIMITS.fighters) { this.emit('toast', { text: '战机已满，请稍后再加入' }); return null; }
    const test = uid.startsWith('test:');
    const prof = this.save && !test ? this.save.get(uid, user.name, user.avatar) : { level: user.level || 1 };
    const t = this.mode === 'pve' ? 'blue' : (team || this.pickTeam());
    f = {
      uid, npc: false, test, name: String(user.name || prof.name || '飞行员').slice(0, 24), avatar: user.avatar || prof.avatar || '',
      team: t, level: prof.level || 1, skin: skinFor(prof.level || 1),
      weapon: ['laser', 'spread', 'charge'][Math.floor(this.random() * 3)],
      lane: ['L', 'M', 'R'][Math.floor(this.random() * 3)], target: 'core',
      lastActive: nowMs, pvpTeam: team || null,
      gear: test ? {} : (prof.gear ||= {}), prefCls: prof.cls || null, dodgeLeft: test ? 0 : (prof.dodgeLeft || 0),
    };
    this.resetFighterForRound(f);
    this.fighters.set(uid, f);
    f.labelUntil = this.clock + 4;
    this.emit('join', { uid, name: f.name, team: t });
    if (this.mode === 'pve' && !test) this.catchUp(f, prof);
    this.syncNpcs();
    return f;
  }

  // ───────── 后援（讨伐） ─────────
  activeHumans() { let n = 0; for (const f of this.fighters.values()) if (!f.npc) n++; return n; }
  clearNo() { return this.save ? (this.save.data.clearNo || 0) : this.memClearNo; }
  toReserve(f, why) {
    if (!f || f.npc || f.reserve) return;
    pauseSummons(this, f);
    f.reserve = true; f.reserveAt = this.now(); f.alive = false;
    this.fighters.delete(f.uid);
    this.reserve.set(f.uid, f);
    this.emit('reserve', { uid: f.uid, name: f.name, why });
    this.emit('toast', { uid: f.uid, text: `${f.name} ${why === 'full' ? '场上满员' : '5分钟没互动'}，进入后援（发言/点赞/送礼回来）` });
    this.syncNpcs();
  }
  // 场内满了：送礼的人一定能上场（换下最久没互动的人）；发言/点赞只换下1分钟以上没互动的
  makeRoom(force) {
    let idle = null;
    for (const f of this.fighters.values()) if (!f.npc && (!idle || f.lastActive < idle.lastActive)) idle = f;
    if (!idle || (!force && this.now() - idle.lastActive < 60000)) return false;
    this.toReserve(idle, 'full');
    return true;
  }
  newToReserve(user) {
    const f = { uid: String(user.id), npc: false, test: String(user.id).startsWith('test:'), name: String(user.name || '飞行员').slice(0, 24), avatar: user.avatar || '', team: 'blue', lastActive: this.now(), pending: user };
    const prof = this.save && !f.test ? this.save.get(f.uid, user.name, user.avatar) : null;
    f.level = prof?.level || 1;
    f.reserve = true; f.reserveAt = this.now(); f.fresh = true;
    this.reserve.set(f.uid, f);
    this.emit('toast', { uid: f.uid, text: `${f.name}：场上已满${PVE.reserve.cap}人，先进后援，有空位自动上场` });
    return null;
  }
  fromReserve(f, user, force) {
    f.lastActive = this.now();
    if (user?.name) f.name = String(user.name).slice(0, 24);
    if (this.activeHumans() >= PVE.reserve.cap && !this.makeRoom(force)) { f.wantIn = true; return null; }
    this.reserve.delete(f.uid);
    if (f.fresh) return this.join(f.pending || { id: f.uid, name: f.name, avatar: f.avatar });
    f.reserve = false; f.wantIn = false;
    this.resetFighterForRound(f);
    this.fighters.set(f.uid, f);
    f.labelUntil = this.clock + 4;
    resumeSummons(this, f);
    this.emit('join', { uid: f.uid, name: f.name, team: f.team, back: true });
    const prof = this.save && !f.test ? this.save.peek(f.uid) : null;
    if (prof) this.catchUp(f, prof);
    this.syncNpcs();
    return f;
  }
  // 每秒：5分钟没互动进后援；超员进后援；有空位让想上场的人上；后援里太久没动静的移出（回来时按错过的关补发）
  stepReserve() {
    const R = PVE.reserve, nowMs = this.now();
    for (const f of [...this.fighters.values()]) if (!f.npc && nowMs - f.lastActive > R.idle * 1000) this.toReserve(f, 'idle');
    while (this.activeHumans() > R.cap) { let idle = null; for (const f of this.fighters.values()) if (!f.npc && (!idle || f.lastActive < idle.lastActive)) idle = f; this.toReserve(idle, 'full'); }
    const want = [...this.reserve.values()].filter(f => f.wantIn || f.fresh).filter(f => nowMs - f.lastActive < R.idle * 1000).sort((a, b) => b.lastActive - a.lastActive);
    for (const f of want) { if (this.activeHumans() >= R.cap) break; this.fromReserve(f, null, false); }
    for (const f of [...this.reserve.values()]) if (nowMs - f.lastActive > R.keep * 1000) this.reserve.delete(f.uid);
  }
  // 过关：总进度+1；在场的人记已领；后援的人拿后援奖励（普通关50%基础经验+1件白装，精英/BOSS关1件白装）
  clearReward(stage) {
    if (this.save) { this.save.data.clearNo = (this.save.data.clearNo || 0) + 1; this.save.dirty = true; } else this.memClearNo++;
    const no = this.clearNo(), R = PVE.reserve;
    for (const f of this.humans()) { const p = !f.test && this.save?.peek(f.uid); if (p) p.seenClear = no; }
    const kind = stageKind(stage), xp = kind === 'wave' ? Math.round(R.baseXp(chapterOf(stage)) * R.xpRate) : 0;
    let n = 0;
    for (const f of this.reserve.values()) {
      const p = !f.test && this.save?.peek(f.uid);
      if (p && (p.seenClear || 0) >= no) continue;
      this.grantReserve(f, p, 1, xp);
      if (p) p.seenClear = no;
      n++;
    }
    return { players: n, xp };
  }
  grantReserve(f, p, items, xp) {
    if (p && xp > 0) { this.save.addXp(p, xp); f.level = p.level; }
    const who = p ? { uid: f.uid, name: f.name, gear: (p.gear ||= {}) } : f.gear ? f : Object.assign(f, { gear: {} });
    const slots = Object.keys(GEAR_SLOTS());
    for (let i = 0; i < items; i++) giveItem(this, who, makeItem(this.random, slots[Math.floor(this.random() * slots.length)], 0), { silent: true });
  }
  // 回来时补发：主播实际推进了、自己没领过的关（每关50%基础经验+1件白装）；第一次来的人不补历史
  catchUp(f, p) {
    const no = this.clearNo();
    const missed = Math.min(PVE.reserve.catchupMax, Math.max(0, no - (p.seenClear ?? no)));
    p.seenClear = no;
    if (!missed) return null;
    const R = PVE.reserve, stage = chapterOf(currentStage(this));
    const xp = Math.round(R.baseXp(stage) * R.xpRate) * missed;
    const before = p.level;
    this.grantReserve(f, p, missed, xp);
    f.level = p.level; f.skin = skinFor(p.level);
    if (f.cls) refreshStats(f);
    const res = { uid: f.uid, name: f.name, stages: missed, xp, items: missed, levels: p.level - before };
    this.emit('catchup', res);
    return res;
  }

  // 讨伐：贡献值每秒实时换成经验，战斗中就能升级（升级马上加血加攻）
  liveXp() {
    for (const f of this.humans()) {
      if (f.test || !this.save) continue;
      const raw = Math.floor(f.merit) - (f.xpCounted || 0);
      if (raw <= 0) continue;
      const gain = Math.round(raw * xpMul(this, f));
      const p = this.save.get(f.uid);
      f.xpCounted = Math.floor(f.merit);
      const ups = this.save.addXp(p, gain);
      if (ups) {
        f.level = p.level; f.skin = skinFor(p.level);
        if (f.cls) refreshStats(f);
        this.emit('levelup', { uid: f.uid, name: f.name, level: p.level, x: f.x, y: f.y, live: true });
      }
    }
  }

  resetFighterForRound(f) {
    f.xpCounted = 0;
    const def = TEAMS[f.team], zone = this.zoneOf(f.team);
    f.maxHp = FIGHTER.baseHp + LEVEL.hpBonus(f.level);
    f.hp = f.maxHp; f.alive = true; f.respawn = 0;
    f.x = 120 + this.random() * 480;
    f.y = def.dir === 1 ? zone[0] + 30 : zone[1] - 30;
    f.vx = 0; f.vy = 0;
    f.fireCd = this.random() * 0.5; f.power = 1; f.powerUntil = 0; f.shield = 0;
    f.charge = 0; f.likeWindow = 0; f.likeWindowT = 0;
    f.merit = f.meritNext || 0; f.meritNext = 0; f.aliveAcc = 0; f.kills = 0; f.dmgAcc = 0; f.smallAcc = 0;
    f.drones = 0; f.dronesUntil = 0; f.droneCd = 0;
    f.wander = this.random() * Math.PI * 2; f.depth = 0.3 + this.random() * 0.5;
    f.interceptT = 0; f.labelUntil = f.labelUntil || 0; f.invuln = 1.5;
    if (this.mode === 'pve' && !f.alien && f.team === 'blue') setupShip(this, f);
  }

  setClass(f, cls) {
    if (this.mode !== 'pve' || f.alien) return false;
    f.prefCls = cls;
    const p = !f.test && !f.npc ? this.save?.peek(f.uid) : null;
    if (p) { p.cls = cls; this.save.dirty = true; }
    if (f.cls === cls) return true;
    f.cls = cls;
    refreshStats(f);
    this.emit('toast', { uid: f.uid, text: `${f.name} 换成${{ dps: '输出舰', tank: '重装机甲', healer: '医疗舰', carrier: '蜂巢航母' }[cls]}` });
    f.labelUntil = this.clock + 3;
    return true;
  }

  syncNpcs(force = false) {
    const min = Math.max(0, Math.min(30, this.settings.npcMinPerTeam | 0));
    for (const team of TEAM_IDS) {
      const humans = this.countTeam(team, true);
      const want = this.mode === 'pve' && team === 'red' ? 0 : Math.max(0, min - humans);
      const npcs = [...this.fighters.values()].filter(f => f.npc && !f.alien && !f.merc && f.team === team);
      for (let i = npcs.length; i < want; i++) {
        const uid = `npc:${++this.npcSeq}`;
        const level = 1 + Math.floor(this.random() * 12);
        const f = { uid, npc: true, name: 'NPC·' + NPC_NAMES[this.npcSeq % NPC_NAMES.length], avatar: '', team, level, skin: 0,
          weapon: ['laser', 'spread', 'charge'][Math.floor(this.random() * 3)], lane: ['L', 'M', 'R'][i % 3], target: this.random() < 0.7 ? 'core' : 'turret', lastActive: this.now() };
        this.resetFighterForRound(f);
        this.fighters.set(uid, f);
      }
      for (let i = want; i < npcs.length; i++) this.fighters.delete(npcs[i].uid);
    }
  }

  // 返回 true 表示消息被游戏使用
  chat(user, text) {
    this.stats.chats++;
    if (this.mode === 'pve') {
      const sk = parseSkill(text);
      if (sk) { const f = this.join(user); if (!f) return false; f.lastActive = this.now(); if (this.phase === 'battle') requestSkill(this, f, sk); return true; }
      const cls = parseClass(text);
      if (cls) { const f = this.join(user); if (f) this.setClass(f, cls); return !!f; }
      // 快捷输入：1 / 2 / 3 = 左 / 中 / 右（全角数字也认）
      const quick = { '1': 'L', '2': 'M', '3': 'R', '１': 'L', '２': 'M', '３': 'R' }[String(text || '').trim()];
      if (quick) { const f = this.join(user); if (!f) return false; f.lastActive = this.now(); f.lane = quick; f.labelUntil = this.clock + 2.5; return true; }
    }
    const cmd = parseCommand(text);
    if (!cmd) return false;
    if (cmd.type === 'team') { const f = this.join(user, cmd.team); return !!f; }
    const f = this.join(user);
    if (!f) return false;
    f.labelUntil = this.clock + 2.5;
    switch (cmd.type) {
      case 'weapon': f.weapon = cmd.weapon; this.emit('toast', { uid: f.uid, text: `${f.name} 切换${WEAPONS[cmd.weapon].name}` }); break;
      case 'lane': f.lane = cmd.lane; break;
      case 'target': {
        f.target = cmd.target;
        if (cmd.target === 'core') f.lane = 'M';
        else { const tu = this.liveTurrets(other(f.team)); if (tu.length) { const near = tu.sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x))[0]; f.lane = near.x < 300 ? 'L' : near.x > 420 ? 'R' : 'M'; } }
        break;
      }
      case 'intercept': if (this.mode === 'pve') interceptZone(this, f); else this.intercept(f); break;
      case 'mode': this.voteMode(f, cmd.mode); break;
      case 'card': this.emit('card', { uid: f.uid }); break;
      case 'gear': this.emit('card', { uid: f.uid, gear: true }); break;
      case 'checkin': if (this.mode === 'pve') dailyCheckin(this, f); break;
      default: break;
    }
    return true;
  }

  like(user, count) {
    const n = Math.max(0, Math.min(10000, Math.floor(Number(count) || 0)));
    if (!n || !user?.id) return;
    this.stats.likes += n;
    const f = this.fighters.get(String(user.id)) || this.join(user);
    if (!f) return;
    f.lastActive = this.now();
    if (this.clock - f.likeWindowT >= 1) { f.likeWindowT = this.clock; f.likeWindow = 0; }
    const room = Math.max(0, FIGHTER.likeChargeCapPerSec - f.likeWindow);
    const add = Math.min(room, n * FIGHTER.likeCharge);
    f.likeWindow += add;
    if (this.mode === 'pve') { moraleLike(this, f, n); return; }
    f.charge = Math.min(100, f.charge + add);
  }

  intercept(f) {
    const enemy = this.teams[other(f.team)];
    if (enemy.cannon.state !== 'charging') return;
    if (this.clock - f.interceptT < 0.8) return;
    f.interceptT = this.clock;
    enemy.cannon.intercept = Math.min(GIFT.interceptCap, enemy.cannon.intercept + GIFT.interceptEach);
    f.merit += MERIT.intercept;
    this.emit('intercept', { team: f.team, x: f.x, y: f.y });
  }

  // gift: { name, price, count(已去重的数量) }
  gift(user, gift) {
    const amount = Math.max(0, Math.min(10000, Math.floor(Number(gift.count) || 0)));
    if (!amount || !user?.id) return null;
    const f = this.join(user, null, { force: true });
    if (!f) return null;
    f.lastActive = this.now();
    this.stats.gifts++; this.stats.giftUnits += amount;
    const tier = tierForGift(gift, this.settings);
    if (this.mode === 'pve') {
      const price = Number(gift.price);
      const value = (Number.isFinite(price) && price > 0 ? price : 1) * amount;
      f.giftRound = (f.giftRound || 0) + value;   // 本局礼物榜（只用来排掉落顺序，不显示金额）
      // 贡献：新增抖币 × E，只算一次（礼物触发的技能/召唤物不再重复算）；结算期间送的算进下一局
      if (this.phase === 'result') f.meritNext = (f.meritNext || 0) + value * PVE.score.perCoin * growthE(f);
      else score(this, f, value * PVE.score.perCoin);
      const had = (f.dodgeLeft || 0) > 0;
      f.dodgeLeft = (f.dodgeLeft || 0) + value * PVE.autoDodgePerValue;
      syncDodge(this, f);
      this.emit('toast', { uid: f.uid, text: `${f.name} ${had ? '机神附体延长到' : '机神附体！'} ${fmtDuration(f.dodgeLeft)}（自动躲弹躲技能、自动放技能和大招）` });
    }
    this.emit('gift', { uid: f.uid, name: f.name, team: f.team, gift: gift.name || '礼物', count: amount, tier });
    if (this.phase !== 'battle') {
      this.pendingGifts.push({ user: { id: f.uid, name: f.name }, gift, amount, tier });
      if (this.mode === 'pve') { this.emit('toast', { uid: f.uid, text: `${f.name} 的${gift.name || '礼物'}已记下，开战后生效` }); return tier; }
      if (this.pendingGifts.length > 500) this.pendingGifts.shift();
      this.emit('toast', { uid: f.uid, text: `${f.name} 的${gift.name || '礼物'}已记下，开战后生效` });
      // 火力类效果开战前就先给上
      if (tier === 1) this.boost(f, amount);
      return tier;
    }
    this.applyGift({ id: f.uid, name: f.name }, gift, amount, tier);
    return tier;
  }

  boost(f, units) {
    f.power = Math.min(GIFT.powerMax, f.power + units);
    f.powerUntil = this.clock + GIFT.powerSeconds;
    if (this.mode === 'pve' && f.maxHp) {
      f.shieldHp = Math.min(f.maxHp * 0.5, (f.shieldHp || 0) + f.maxHp * 0.1 * units);
    } else f.shield = Math.min(GIFT.shieldMax, f.shield + units);
  }

  applyGift(user, gift, amount, tier) {
    const f = this.fighters.get(String(user.id)) || this.join(user);
    if (!f) return;
    if (this.mode === 'pve') { f.labelUntil = this.clock + 4; applyPveGift(this, f, pveGiftKind(gift, this.settings.pveGiftByName), amount); return; }
    const team = this.teams[f.team];
    f.labelUntil = this.clock + 4;
    if (tier === 1) {
      this.boost(f, amount);
      f.smallAcc += amount;
      while (f.smallAcc >= GIFT.smallComboEvery) { f.smallAcc -= GIFT.smallComboEvery; this.queuePattern(team, { kind: 'ring', owner: f.uid }); }
      return;
    }
    this.boost(f, 1);
    if (tier === 2) {
      for (let i = 0; i < amount; i++) this.queuePattern(team, { kind: i % 2 ? 'fan' : 'spiral', owner: f.uid });
      if (amount >= 1) this.emit('banner', { team: f.team, uid: f.uid, name: f.name, text: `释放弹幕阵型${amount > 1 ? '×' + amount : ''}`, tier });
    } else if (tier === 3) {
      for (let i = 0; i < amount; i++) this.queuePattern(team, { kind: i % 2 ? 'split' : 'grid', owner: f.uid });
      f.drones = 2; f.dronesUntil = this.clock + GIFT.droneSeconds;
      this.emit('banner', { team: f.team, uid: f.uid, name: f.name, text: `展开激光网格，护卫僚机升空`, tier });
    } else if (tier === 4) {
      for (let i = 0; i < amount; i++) this.queueShip(f);
      this.emit('banner', { team: f.team, uid: f.uid, name: f.name, text: `召唤战舰「${shipName(f.name)}」`, tier });
      this.emit('announce', { text: `${f.name} 召唤战舰`, voice: true });
    } else if (tier === 5) {
      for (let i = 0; i < amount; i++) {
        if (i === 0 && team.cannon.state === 'idle') this.chargeCannon(team, f, this.mode === 'pve' ? { dmgFrac: PVE.playerCannonDamage } : {});
        else this.queueShip(f);
      }
    }
  }

  queuePattern(team, job) {
    team.patternQueue.push(job);
    if (team.patternQueue.length > 240) team.patternQueue.shift();
  }

  queueShip(f) {
    const team = this.teams[f.team];
    if (team.shipQueue.length >= 6) {
      // 排队太长：改为给场上本队战舰续时回血
      const mine = this.battleships.filter(s => s.team === f.team);
      if (mine.length) { const s = mine[Math.floor(this.random() * mine.length)]; s.t += 25; s.hp = Math.min(s.max, s.hp + s.max * 0.5); return; }
    }
    team.shipQueue.push({ owner: f.uid, name: f.name });
  }

  chargeCannon(team, f, { name = '', dmgFrac = GIFT.cannonDamage } = {}) {
    team.cannon = { state: 'charging', t: GIFT.cannonCharge, intercept: 0, owner: f?.uid || null, ownerName: f?.name || name, fireT: 0, dmgFrac };
    if (team.boss) {
      this.emit('banner', { team: team.id, text: '异形母舰湮灭炮蓄力！全员快发「拦截」', tier: 5 });
      this.emit('announce', { text: '母舰湮灭炮蓄力，快发拦截', voice: true });
    } else if (this.mode === 'pve') {
      this.emit('banner', { team: team.id, uid: f?.uid, name: f?.name, text: '启动旗舰主炮，瞄准异形母舰！', tier: 5 });
      this.emit('announce', { text: `${f?.name || ''} 启动旗舰主炮`, voice: true });
    } else {
      this.emit('banner', { team: team.id, uid: f?.uid, name: f?.name, text: '旗舰主炮蓄力中！对面快发「拦截」', tier: 5 });
      this.emit('announce', { text: `${f?.name || ''} 启动旗舰主炮，${TEAMS[other(team.id)].short}队快发拦截`, voice: true });
    }
  }

  // ───────── 模式切换（和暴力摩托一样：弹幕投票，在场一半人同意就换） ─────────
  voteMode(f, mode) {
    const name = MODE_NAMES[mode];
    if (mode === 'pvp' && !this.settings.pvpEnabled) { this.emit('toast', { uid: f.uid, text: '对战模式暂未开放' }); return false; }
    if (mode === this.mode) { this.emit('toast', { uid: f.uid, text: `现在就是${name}模式` }); return false; }
    if (!this.modeVote || this.modeVote.mode !== mode || this.modeVote.until < this.clock) this.modeVote = { mode, voters: new Set(), until: this.clock + 90 };
    const v = this.modeVote;
    v.voters.add(f.uid); v.until = this.clock + 90;
    const need = Math.max(1, Math.ceil(this.humans().length / 2));
    this.emit('vote', { uid: f.uid, name: f.name, mode, modeName: name, votes: v.voters.size, need });
    if (v.voters.size >= need) return this.setMode(mode, { by: f });
    return false;
  }

  voteView() {
    const v = this.modeVote;
    if (!v || v.until < this.clock) return null;
    return { mode: v.mode, modeName: MODE_NAMES[v.mode], votes: v.voters.size, need: Math.max(1, Math.ceil(this.humans().length / 2)) };
  }

  setMode(mode, { by = null } = {}) {
    mode = mode === 'pve' ? 'pve' : 'pvp';
    if (mode === 'pvp' && !this.settings.pvpEnabled) return false;
    if (mode === this.mode) return false;
    this.mode = mode;
    this.modeVote = null;
    if (this.save) { this.save.data.mode = mode; this.save.dirty = true; this.save.flush(); }
    const humans = this.humans();
    if (mode === 'pve') { for (const f of humans) { f.pvpTeam = f.team; f.team = 'blue'; } }
    else {
      for (const f of humans) f.team = f.pvpTeam === 'red' || f.pvpTeam === 'blue' ? f.pvpTeam : null;
      for (const f of humans) if (!f.team) f.team = this.pickTeam();
    }
    for (const f of [...this.fighters.values()]) if (f.npc) this.fighters.delete(f.uid);
    this.emit('mode', { mode, name: MODE_NAMES[mode], by: by?.name || '' });
    this.emit('banner', { team: null, text: `切换到「${MODE_NAMES[mode]}」模式${by ? `（${by.name} 发起，过半同意）` : ''}`, tier: 4 });
    this.emit('announce', { text: `切换到${MODE_NAMES[mode]}模式`, voice: true });
    this.startLobby();
    return true;
  }

  // ───────── 主循环 ─────────
  step(dt) {
    this.clock += dt;
    if (this.mode === 'pve' && Math.floor(this.clock) !== Math.floor(this.clock - dt)) this.stepReserve();
    if (this.phase === 'lobby') {
      this.phaseT -= dt;
      this.stepFighters(dt, false);
      if (this.phaseT <= 0) this.startBattle();
      return;
    }
    if (this.phase === 'result') {
      this.phaseT -= dt;
      this.stepBullets(dt, false);
      this.stepFighters(dt, false);
      if (this.phaseT <= 0) {
        const next = this.mode === 'pve' && this.winner === 'blue';
        this.startLobby();
        if (next) this.startBattle();   // 讨伐打赢了：不备战，直接下一关
      }
      return;
    }
    this.time += dt;
    this.phaseT -= dt;
    if (Math.floor(this.clock) !== Math.floor(this.clock - dt) && Math.floor(this.clock) % 2 === 0) this.syncNpcs();
    if (this.mode === 'pve') stepPve(this, dt);
    if (this.mode === 'pve' && this.phase === 'battle') stepPveGifts(this, dt);
    if (this.mode === 'pve' && this.phase === 'battle' && Math.floor(this.clock) !== Math.floor(this.clock - dt)) this.liveXp();
    for (const id of TEAM_IDS) this.stepTeam(this.teams[id], dt);
    this.shotFactor = { red: FIGHTER.shotVsFighter * Math.min(1, 10 / Math.max(1, this.attackers('red'))), blue: FIGHTER.shotVsFighter * Math.min(1, 10 / Math.max(1, this.attackers('blue'))) };
    this.buildBulletGrid();
    this.stepFighters(dt, true);
    this.buildFighterGrid();
    this.stepEmitters(dt);
    this.stepHazards(dt);
    this.stepShips(dt);
    this.stepBullets(dt, true);
    for (const id of TEAM_IDS) {
      const t = this.teams[id];
      if (t.core <= 0 && t.present) { this.emit('explode', { x: t.x, y: t.y + t.coreDy, size: 4, team: id }); return this.endBattle(other(id), 'destroyed'); }
    }
    if (this.mode === 'pve') {
      if (this.pve?.cleared) { this.emit('explode', { x: 360, y: 260, size: 3, team: 'red' }); return this.endBattle('blue', 'leader'); }
      if (this.pve?.wiped) return this.endBattle('red', 'wipe');
      if (this.pve && this.pve.left <= 0) return this.endBattle('red', 'timeout');
      return;
    }
    if (this.phaseT <= 0) {
      const r = this.teams.red.core / this.teams.red.coreMax, b = this.teams.blue.core / this.teams.blue.coreMax;
      this.endBattle(Math.abs(r - b) < 0.005 ? null : r > b ? 'red' : 'blue', 'timeout');
    }
  }

  stepTeam(t, dt) {
    t.hitFlash = Math.max(0, t.hitFlash - dt);
    const low = t.core < t.coreMax * 0.5;
    t.sinceHit += dt;
    if (t.shieldMax > 0 && t.sinceHit > FLAGSHIP.shieldDelay) t.shield = Math.min(t.shieldMax, t.shield + (low ? FLAGSHIP.shieldRegenLow : FLAGSHIP.shieldRegen) * dt);
    if (low && !t.extraTurret && !t.boss) {
      t.extraTurret = true;
      t.turrets.push(this.makeTurret(t.id, 0));
      this.emit('banner', { team: t.id, text: '旗舰受创，追加中央炮台、护盾加速回复', tier: 0 });
    }
    for (const tu of t.turrets) {
      tu.x = t.x + tu.dx; tu.y = t.y + tu.dy;
      if (tu.dead) { tu.respawn -= dt; if (tu.respawn <= 0) { tu.dead = false; tu.hp = tu.max; } continue; }
      if (!t.present) continue;
      tu.cd -= dt;
      if (tu.cd <= 0) {
        const [a, b] = FLAGSHIP.turretFire;
        if (tu.pod && tu.podKind === 'brood') { tu.cd = 7 + this.random() * 3; spawnFormation(this, true, 'swarm', tu.x, tu.y + 24); this.emit('cast', { x: tu.x, y: tu.y }); }
        else if (tu.pod && tu.podKind === 'prism') {
          tu.cd = 3.5 + this.random() * 2;
          const tg = [...this.fighters.values()].filter(f => !f.alien && f.team === 'blue' && f.alive).sort((a, b) => ((a.x - tu.x) ** 2 + (a.y - tu.y) ** 2) - ((b.x - tu.x) ** 2 + (b.y - tu.y) ** 2))[0];
          const a = tg ? Math.atan2(tg.y - tu.y, tg.x - tu.x) : Math.PI / 2;
          for (const k of [-0.12, 0, 0.12]) this.addBullet(tu.x, tu.y + 10, Math.cos(a + k) * 420, Math.sin(a + k) * 420, 4, 1, 'red', 'shot', null, 0, { laser: true });
        }
        else if (tu.pod) { tu.cd = 5.5 + this.random() * 3; this.spawnPattern(t.id, this.random() < 0.6 ? 'podFan' : 'podSpiral', tu.x, tu.y + 20, null); }
        else { tu.cd = (a + this.random() * (b - a)) * (low ? 0.75 : 1); this.spawnPattern(t.id, this.random() < 0.5 ? 'turretFan' : 'turretSpiral', tu.x, tu.y + t.def.dir * 20, null); }
      }
    }
    // 礼物阵型队列
    t.patternT -= dt;
    if (t.patternT <= 0 && t.patternQueue.length) {
      const job = t.patternQueue.shift();
      t.patternT = GIFT.patternQueueGap;
      const f = this.fighters.get(job.owner);
      const x = f && f.alive && f.team === t.id ? f.x : 360;
      const y = f && f.alive && f.team === t.id ? f.y : t.fleet ? 1150 : t.y + t.def.dir * 80;
      this.spawnPattern(t.id, job.kind, x, y, job.owner);
    }
    // 战舰队列
    const mine = this.battleships.filter(s => s.team === t.id).length;
    if (mine < GIFT.battleshipMax && t.shipQueue.length) {
      const job = t.shipQueue.shift();
      this.spawnShip(t.id, job.owner, job.name);
    }
    // 主炮
    const c = t.cannon;
    if (c.state === 'charging') {
      const enemy = this.teams[other(t.id)];
      if (enemy.present) c.t -= dt;   // 讨伐模式：母舰还没现身时主炮保持蓄满，等它出来再打
      if (c.t <= 0) this.fireCannon(t);
    } else if (c.state === 'firing') {
      c.fireT -= dt;
      if (c.fireT <= 0) { c.state = 'cool'; c.t = GIFT.cannonCooldown; }
    } else if (c.state === 'cool') {
      c.t -= dt; if (c.t <= 0) { c.state = 'idle'; }
    }
  }

  fireCannon(t) {
    const c = t.cannon;
    const enemy = this.teams[other(t.id)];
    const mult = 1 - Math.min(GIFT.interceptCap, c.intercept);
    const dmg = enemy.present ? enemy.coreMax * (c.dmgFrac ?? GIFT.cannonDamage) * mult : 0;
    enemy.core = Math.max(0, enemy.core - dmg);
    enemy.hitFlash = 1;
    c.state = 'firing'; c.fireT = 1.3;
    const owner = c.owner ? this.fighters.get(c.owner) : null;
    if (owner && this.mode !== 'pve') owner.merit += (dmg / 100) * MERIT.per100Damage;
    // 光柱中的敌机全部击落
    for (const f of [...this.fighters.values()]) {
      if (f.team === t.id || !f.alive) continue;
      if (Math.abs(f.x - t.x) < 95) this.killFighter(f, owner);
    }
    for (const s of this.battleships) if (s.team !== t.id && Math.abs(s.x - t.x) < 120) s.hp -= s.max * 0.6;
    this.emit('cannon', { team: t.id, intercept: c.intercept, damage: Math.round(dmg), name: c.ownerName });
    const cut = Math.round(Math.min(GIFT.interceptCap, c.intercept) * 100);
    const what = t.boss ? '湮灭炮' : '主炮';
    this.emit('announce', { text: c.intercept > 0.25 ? `${what}命中，被拦截削弱${cut}%` : `${what}命中！`, voice: true });
  }

  spawnShip(team, owner, name) {
    const def = TEAMS[team];
    this.battleships.push({
      id: ++this.shipSeq, team, owner, name: shipName(name), ownerName: name,
      x: 360, y: def.flagY + def.dir * 60, ty: (this.zoneOf(team)[0] + this.zoneOf(team)[1]) / 2 + def.dir * -40,
      hp: GIFT.battleshipHp, max: GIFT.battleshipHp, t: GIFT.battleshipSeconds, cd: 1, pcd: 1.5, phase: this.random() * 6,
    });
    this.emit('ship', { team, name: shipName(name) });
  }

  stepShips(dt) {
    for (let i = this.battleships.length - 1; i >= 0; i--) {
      const s = this.battleships[i];
      s.t -= dt; s.phase += dt;
      s.y += (s.ty - s.y) * Math.min(1, dt * 1.5);
      s.x = 360 + Math.sin(s.phase * 0.6) * 200;
      if (s.hp <= 0 || s.t <= 0) {
        this.emit('explode', { x: s.x, y: s.y, size: 3, team: s.team });
        if (s.hp <= 0 && s.lastHitBy) { const k = this.fighters.get(s.lastHitBy); if (k) k.merit += MERIT.turret; }
        this.battleships.splice(i, 1);
        continue;
      }
      const dir = TEAMS[s.team].dir;
      s.cd -= dt;
      if (s.cd <= 0) {
        s.cd = 0.45;
        for (const off of [-26, 26]) this.addBullet(s.x + off, s.y + dir * 30, 0, dir * 620, 5, 3, s.team, 'shot', s.owner, 0, { gift: true });
      }
      s.pcd -= dt;
      if (s.pcd <= 0) { s.pcd = 2.6; this.spawnPattern(s.team, this.random() < 0.5 ? 'spiral' : 'fan', s.x, s.y + dir * 30, s.owner, s); }
    }
  }

  liveTurrets(team) { return this.teams[team].turrets.filter(t => !t.dead); }

  // ───────── 战机 AI ─────────
  stepFighters(dt, combat) {
    for (const f of [...this.fighters.values()]) {
      if (f.alien) { if (combat && f.alive) stepAlien(this, f, dt); continue; }
      if (this.mode === 'pve' && f.team === 'blue') {
        if (!f.alive) { if (combat) { f.respawn -= dt; if (f.respawn <= 0) this.respawnFighter(f); } continue; }
        stepShip(this, f, dt, combat);
        if (combat) { stepBeam(this, f, dt); this.fireDrones(f, dt); }
        continue;
      }
      if (!f.alive) {
        if (combat) { f.respawn -= dt; if (f.respawn <= 0) this.respawnFighter(f); }
        continue;
      }
      f.invuln = Math.max(0, f.invuln - dt);
      if (f.power > 1 && this.clock > f.powerUntil) f.power = 1;
      if (f.drones && this.clock > f.dronesUntil) f.drones = 0;
      this.steer(f, dt, combat);
      if (combat) this.fire(f, dt);
    }
  }

  steer(f, dt, combat) {
    const def = TEAMS[f.team];
    const [z0, z1] = this.zoneOf(f.team);
    const speed = LEVEL.speed(f.level) * (f.npc ? 0.85 : 1);
    f.wander += dt * (0.7 + (f.uid.length % 5) * 0.11);
    let dx = (LANE_X[f.lane] ?? 360) + Math.sin(f.wander) * 70 - f.x;
    // 前后位置：散弹靠前，激光靠后
    const front = f.weapon === 'spread' ? 0.85 : f.weapon === 'charge' ? 0.6 : 0.35;
    const depth = Math.min(0.95, front * 0.7 + f.depth * 0.3);
    const yFront = def.dir === 1 ? z1 : z0, yBack = def.dir === 1 ? z0 : z1;
    let dy = yBack + (yFront - yBack) * depth + Math.cos(f.wander * 1.3) * 30 - f.y;
    let ax = dx * 2.2, ay = dy * 2.2;
    if (combat) {
      const radius = LEVEL.dodgeRadius(f.level) * (f.npc ? 0.75 : 1);
      const [rx, ry] = this.threat(f, radius);
      ax += rx * speed * 9; ay += ry * speed * 9;
    }
    const mag = Math.hypot(ax, ay) || 1;
    const want = Math.min(speed, mag);
    const tvx = ax / mag * want, tvy = ay / mag * want;
    const k = Math.min(1, dt * 10);
    f.vx += (tvx - f.vx) * k; f.vy += (tvy - f.vy) * k;
    f.x = Math.max(24, Math.min(W - 24, f.x + f.vx * dt));
    f.y = Math.max(z0, Math.min(z1, f.y + f.vy * dt));
  }

  threat(f, radius) {
    let rx = 0, ry = 0;
    const cx = Math.floor(f.x / CELL), cy = Math.floor(f.y / CELL), span = Math.ceil(radius / CELL);
    const hitR = FIGHTER.radius + 7;
    for (let gx = cx - span; gx <= cx + span; gx++) {
      for (let gy = cy - span; gy <= cy + span; gy++) {
        const cell = this.bGrid.get(gx * 4096 + gy);
        if (!cell) continue;
        for (let i = 0; i < cell.length; i++) {
          const b = cell[i];
          if (b.team === f.team) continue;
          const px = b.x - f.x, py = b.y - f.y;
          if (px * px + py * py > radius * radius) continue;
          const vx = b.vx - f.vx, vy = b.vy - f.vy;
          const vv = vx * vx + vy * vy || 1;
          let t = -(px * vx + py * vy) / vv;
          if (t < 0) continue;
          if (t > 0.45) t = 0.45;
          const qx = px + vx * t, qy = py + vy * t;
          const d = Math.hypot(qx, qy);
          const lim = hitR + b.r;
          if (d > lim * 1.6) continue;
          const w = (lim * 1.6 - d) / (lim * 1.6) / (t + 0.08);
          // 远离最近点；正对时侧移
          let nx = -qx, ny = -qy;
          if (d < 0.5) { nx = -vy; ny = vx; }
          const nl = Math.hypot(nx, ny) || 1;
          rx += nx / nl * w; ry += ny / nl * w;
        }
      }
    }
    for (const h of this.hazards) {
      if (h.team === f.team) continue;
      if (h.vertical) { const d = f.x - h.x; if (Math.abs(d) < 40 && f.y > h.y1 && f.y < h.y2) rx += Math.sign(d || 1) * 3; }
      else { const d = f.y - h.y; if (Math.abs(d) < 40) ry += Math.sign(d || 1) * 3; }
    }
    if (this.teams) {
      const enemy = this.teams[other(f.team)];
      if (enemy.present && (enemy.cannon.state === 'charging' || enemy.cannon.state === 'firing')) { const d = f.x - enemy.x; if (Math.abs(d) < 130) rx += Math.sign(d || 1) * 4; }
    }
    return [rx, ry];
  }

  fire(f, dt) {
    const dir = TEAMS[f.team].dir;
    f.fireCd -= dt;
    if (f.charge >= 100) {
      f.charge = 0;
      this.addBullet(f.x, f.y + dir * 18, 0, dir * 900, 16, 25, f.team, 'shot', f.uid, 8, { overload: true });
      this.emit('overload', { uid: f.uid, x: f.x, y: f.y, team: f.team });
    }
    this.fireDrones(f, dt);
    if (f.fireCd > 0) return;
    const w = WEAPONS[f.weapon];
    const p = f.power;
    if (f.weapon === 'laser') {
      f.fireCd = w.cd;
      const n = p, gap = 8;
      for (let i = 0; i < n; i++) this.addBullet(f.x + (i - (n - 1) / 2) * gap, f.y + dir * 14, 0, dir * w.speed, w.r, w.dmg, f.team, 'shot', f.uid, 0, { laser: true });
    } else if (f.weapon === 'spread') {
      f.fireCd = w.cd;
      const n = w.pellets + (p - 1) * 2;
      for (let i = 0; i < n; i++) {
        const a = (i / (n - 1) - 0.5) * w.arc * (1 + (p - 1) * 0.15);
        this.addBullet(f.x, f.y + dir * 12, Math.sin(a) * w.speed, Math.cos(a) * w.speed * dir, w.r, w.dmg, f.team, 'shot', f.uid, 0);
      }
    } else {
      f.fireCd = w.cd;
      this.addBullet(f.x, f.y + dir * 16, 0, dir * w.speed, w.r + p, w.dmg * (1 + (p - 1) * 0.4), f.team, 'shot', f.uid, w.pierce, { orb: true });
    }
  }

  fireDrones(f, dt) {
    if (!f.drones) return;
    const dir = TEAMS[f.team].dir;
    f.droneCd -= dt;
    if (f.droneCd <= 0) { f.droneCd = 0.25; for (const s of [-1, 1]) this.addBullet(f.x + s * 26, f.y, 0, dir * 1000, 3, 1, f.team, 'shot', f.uid, 0, { gift: true }); }
  }

  respawnFighter(f) {
    if (this.mode === 'pve' && f.team === 'blue') {
      f.alive = true; f.hp = f.maxHp; f.invuln = 2; f.shieldHp = 0;
      f.x = laneCenter(f.lane) + (f.slotDx || 0); f.y = PVE.zone[1]; f.vx = f.vy = 0;
      return;
    }
    const def = TEAMS[f.team], zone = this.zoneOf(f.team);
    f.alive = true; f.hp = f.maxHp; f.invuln = 2;
    f.x = 120 + this.random() * 480;
    f.y = def.dir === 1 ? zone[0] : zone[1];
    f.vx = f.vy = 0;
  }

  killFighter(f, killer) {
    if (!f.alive) return;
    f.alive = false; f.respawn = this.mode === 'pve' ? PVE.respawn : FIGHTER.respawn; f.shield = 0; f.beamT = 0;
    this.emit('explode', { x: f.x, y: f.y, size: f.alien && f.kind === 'gunner' ? 2 : 1, team: f.team, alien: !!f.alien });
    if (killer && killer.team !== f.team && !killer.alien) { if (this.mode !== 'pve') killer.merit += MERIT.kill; killer.kills++; }
    if (f.alien && f.kind === 'chest') chestKilled(this, f);
    if (f.alien && this.mode === 'pve' && killer) smallKill(this, f, killer);
    if (f.alien) this.fighters.delete(f.uid);
  }

  hurtFighter(f, dmg, ownerUid) {
    if (this.mode === 'pve') return fleetHurt(this, f, dmg, ownerUid);
    if (!f.alive || f.invuln > 0) return false;
    if (f.shield > 0) { f.shield--; this.emit('shieldhit', { x: f.x, y: f.y }); return true; }
    f.hp -= dmg;
    if (f.hp <= 0) this.killFighter(f, this.fighters.get(ownerUid) || null);
    return true;
  }

  // ───────── 弹幕 ─────────
  addBullet(x, y, vx, vy, r, dmg, team, kind, owner, pierce, extra) {
    if (this.bullets.length >= LIMITS.bullets) return null;
    const b = { x, y, vx, vy, r, dmg, team, kind, owner, pierce: pierce || 0, life: 6, split: 0, hue: 0, laser: false, orb: false, overload: false, gift: false, hit: null };
    if (extra) Object.assign(b, extra);
    if (this.mode === 'pve' && team === 'blue') { b.seek = true; if (b.life > 3.5 && !b.missile) b.life = 3.5; }
    if (this.mode === 'pve' && !b.pveScaled) b.dmg *= team === 'red' ? PVE.enemyBulletDmg * (1 + 0.08 * (chapterOf(this.pve?.stage || 1) - 1)) * lateMul(this.pve?.stage || 1) : PVE.giftDmg;
    this.bullets.push(b);
    return b;
  }

  spawnPattern(team, kind, x, y, owner, follow = null) {
    const dir = TEAMS[team].dir;
    const base = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    const E = (o) => this.emitters.push({ team, owner, x, y, follow, t: 0, acc: 0, angle: base, ...o });
    switch (kind) {
      case 'turretFan': E({ kind: 'fan', dur: 1.1, rate: 0.16, n: 9, arc: 1.0, speed: 250, r: 6, aim: true }); break;
      case 'turretSpiral': E({ kind: 'spiral', dur: 1.8, rate: 0.06, arms: 4, spin: 2.6, sweep: 1.25, speed: 220, r: 5.5 }); break;
      case 'spiral': E({ kind: 'spiral', dur: 2.2, rate: 0.05, arms: 4, spin: 3.4, sweep: 1.35, speed: 260, r: 5.5, gift: true }); break;
      case 'fan': E({ kind: 'fan', dur: 1.2, rate: 0.12, n: 9, arc: 1.1, speed: 300, r: 5.5, gift: true }); break;
      case 'ring': E({ kind: 'ring', dur: 0.5, rate: 0.25, n: 18, speed: 260, r: 5, gift: true }); break;
      case 'bossRing': E({ kind: 'ring', dur: 0.7, rate: 0.34, n: 14, speed: 180, r: 6 }); break;
      case 'bossFlower': E({ kind: 'spiral', dur: 3, rate: 0.06, arms: 6, spin: 1.6, sweep: 1.5, speed: 190, r: 5.5 }); break;
      case 'podFan': E({ kind: 'fan', dur: 0.8, rate: 0.32, n: 4, arc: 0.7, speed: 210, r: 6, aim: true }); break;
      case 'podSpiral': E({ kind: 'spiral', dur: 1.0, rate: 0.16, arms: 2, spin: 2.2, sweep: 1.1, speed: 190, r: 5.5 }); break;
      case 'gunnerFan': E({ kind: 'fan', dur: 0.3, rate: 0.25, n: 5, arc: 0.7, speed: 210, r: 6, aim: true }); break;
      case 'split': {
        for (let i = 0; i < 4; i++) {
          const a = base + (i - 1.5) * 0.35;
          this.addBullet(x, y, Math.cos(a) * 240, Math.sin(a) * 240, 13, 1, team, 'danmaku', owner, 0, { split: 0.9 + i * 0.12, orb: true, gift: true });
        }
        break;
      }
      case 'grid': {
        const ez = this.zoneOf(other(team));
        const xs = [0, 1, 2, 3].map(i => 110 + i * 166 + (this.random() - 0.5) * 60);
        for (const hx of xs) this.hazards.push({ team, owner, vertical: true, x: hx, y1: ez[0] - 40, y2: ez[1] + 40, warn: 1.1, active: 0.7, hit: new Set() });
        const yy = ez[0] + (ez[1] - ez[0]) * (0.3 + this.random() * 0.4);
        this.hazards.push({ team, owner, vertical: false, y: yy, warn: 1.3, active: 0.7, hit: new Set() });
        break;
      }
      default: break;
    }
  }

  stepEmitters(dt) {
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i];
      if (e.follow) { if (this.battleships.includes(e.follow)) { e.x = e.follow.x; e.y = e.follow.y + TEAMS[e.team].dir * 30; } }
      e.t += dt; e.acc += dt;
      const dir = TEAMS[e.team].dir;
      const base = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
      while (e.acc >= e.rate) {
        e.acc -= e.rate;
        const kind = e.gift ? 'danmaku' : 'danmaku';
        if (e.kind === 'spiral') {
          const sweep = Math.sin(e.t * e.spin) * e.sweep;
          for (let k = 0; k < e.arms; k++) {
            const a = base + sweep + (k - (e.arms - 1) / 2) * 0.42;
            this.addBullet(e.x, e.y, Math.cos(a) * e.speed, Math.sin(a) * e.speed, e.r, 1, e.team, kind, e.owner, 0, { hue: e.gift ? 1 : 0, gift: !!e.gift });
          }
        } else if (e.kind === 'fan') {
          let center = base;
          if (e.aim) {
            const tgt = this.randomEnemy(e.team);
            if (tgt) center = Math.atan2(tgt.y - e.y, tgt.x - e.x);
          }
          const off = (Math.floor(e.t / e.rate) % 2) * (e.arc / (e.n - 1)) * 0.5;
          for (let k = 0; k < e.n; k++) {
            const a = center + (k / (e.n - 1) - 0.5) * e.arc + off;
            this.addBullet(e.x, e.y, Math.cos(a) * e.speed, Math.sin(a) * e.speed, e.r, 1, e.team, kind, e.owner, 0, { hue: e.gift ? 2 : 0, gift: !!e.gift });
          }
        } else if (e.kind === 'ring') {
          const rot = this.random() * 0.3;
          for (let k = 0; k < e.n; k++) {
            const a = base - Math.PI * 0.45 + (k / (e.n - 1)) * Math.PI * 0.9 + rot;
            this.addBullet(e.x, e.y, Math.cos(a) * e.speed, Math.sin(a) * e.speed, e.r, 1, e.team, kind, e.owner, 0, { hue: 3, gift: !!e.gift });
          }
        }
      }
      if (e.t >= e.dur) this.emitters.splice(i, 1);
    }
  }

  randomEnemy(team) {
    const list = [];
    for (const f of this.fighters.values()) if (f.team !== team && f.alive) list.push(f);
    return list.length ? list[Math.floor(this.random() * list.length)] : null;
  }

  stepHazards(dt) {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      if (h.warn > 0) { h.warn -= dt; continue; }
      h.active -= dt;
      for (const f of this.fighters.values()) {
        if (f.team === h.team || !f.alive || h.hit.has(f.uid)) continue;
        const inside = h.vertical ? Math.abs(f.x - h.x) < 16 && f.y > h.y1 && f.y < h.y2 : Math.abs(f.y - h.y) < 16;
        if (inside) { h.hit.add(f.uid); this.hurtFighter(f, this.mode === 'pve' ? PVE.hazardDmg : 2, h.owner); }
      }
      if (h.active <= 0) this.hazards.splice(i, 1);
    }
  }

  buildBulletGrid() {
    const g = this.bGrid; g.clear();
    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];
      const key = Math.floor(b.x / CELL) * 4096 + Math.floor(b.y / CELL);
      const c = g.get(key); if (c) c.push(b); else g.set(key, [b]);
    }
  }

  buildFighterGrid() {
    const g = this.fGrid; g.clear();
    for (const f of this.fighters.values()) {
      if (!f.alive) continue;
      const key = Math.floor(f.x / CELL) * 4096 + Math.floor(f.y / CELL);
      const c = g.get(key); if (c) c.push(f); else g.set(key, [f]);
    }
  }

  attackers(team) { let n = 0; for (const f of this.fighters.values()) if (f.team === team) n++; return n; }

  damageFlag(enemyId, raw, ownerUid, kind, fromGift = false) {
    const t = this.teams[enemyId];
    const n = this.attackers(other(enemyId));
    const norm = fromGift ? 1 : Math.pow(FLAGSHIP.attackerNorm / Math.max(FLAGSHIP.attackerNorm, n), this.mode === 'pve' ? 0.7 : 0.8);
    let dmg = raw * norm * (kind === 'danmaku' ? 0.4 : 1);
    const counted = dmg;
    t.sinceHit = 0; t.dmgTaken += dmg;
    if (t.shield > 0) { const s = Math.min(t.shield, dmg); t.shield -= s; dmg -= s; }
    if (dmg > 0) { t.core = Math.max(0, t.core - dmg); t.hitFlash = Math.max(t.hitFlash, 0.15); }
    const o = this.fighters.get(ownerUid);
    if (o && this.mode !== 'pve') {
      o.dmgAcc += counted;
      while (o.dmgAcc >= 100) { o.dmgAcc -= 100; o.merit += MERIT.per100Damage; }
    }
  }

  // 讨伐模式我方子弹全部自动索敌：导弹转向快，普攻/礼物弹幕/无人机弹柔和追踪（飞成弧线，不再是直线）
  steerSeek(b, dt) {
    b.age = (b.age || 0) + dt;
    const turn = b.missile ? 6 : b.kind === 'danmaku' ? 2.2 : 3.4;
    if (b.missile && b.age < 0.25) return;
    if (!b.tgt || b.age - (b.tgtAt || 0) > 0.35 || (b.tgt.alien && !b.tgt.alive) || b.tgt.dead) {
      b.tgtAt = b.age;
      b.tgt = nearestEnemy(this, b.x, b.y);
    }
    const t = b.tgt;
    if (!t) return;
    const sp = Math.hypot(b.vx, b.vy) || 1, nsp = b.missile ? Math.min(620, sp + 500 * dt) : sp;
    const want = Math.atan2(t.y - b.y, t.x - b.x), cur = Math.atan2(b.vy, b.vx);
    let da = want - cur; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const a = cur + Math.max(-turn * dt, Math.min(turn * dt, da));
    b.vx = Math.cos(a) * nsp; b.vy = Math.sin(a) * nsp;
  }

  // 敌方追踪弹（虫后孢子）：慢慢拐向最近的我方战舰
  steerHunt(b, dt) {
    b.age = (b.age || 0) + dt;
    if (!b.tgt || b.age - (b.tgtAt || 0) > 0.5 || !b.tgt.alive) {
      b.tgtAt = b.age; let best = null, bd = 1e12;
      for (const f of this.fighters.values()) { if (f.alien || f.team !== 'blue' || !f.alive) continue; const d = (f.x - b.x) ** 2 + (f.y - b.y) ** 2; if (d < bd) { bd = d; best = f; } }
      b.tgt = best;
    }
    if (!b.tgt || b.age > 3.5) return;
    const sp = Math.hypot(b.vx, b.vy) || 1, want = Math.atan2(b.tgt.y - b.y, b.tgt.x - b.x), cur = Math.atan2(b.vy, b.vx);
    let da = want - cur; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    const a = cur + Math.max(-1.3 * dt, Math.min(1.3 * dt, da));
    b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
  }

  stepBullets(dt, combat) {
    const arr = this.bullets;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
      if (b.seek) this.steerSeek(b, dt);
      else if (b.hunt) this.steerHunt(b, dt);
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      let dead = b.life <= 0 || b.y < -40 || b.y > H + 40 || b.x < -40 || b.x > W + 40;
      if (!dead && b.split > 0) {
        b.split -= dt;
        if (b.split <= 0) {
          dead = true;
          for (let k = 0; k < 14; k++) {
            const a = (k / 14) * Math.PI * 2;
            this.addBullet(b.x, b.y, Math.cos(a) * 210, Math.sin(a) * 210, 5, 1, b.team, 'danmaku', b.owner, 0, { hue: 4, gift: b.gift });
          }
          this.emit('spark', { x: b.x, y: b.y, team: b.team });
        }
      }
      if (!dead && combat) dead = this.collide(b);
      if (!dead) arr[w++] = b;
    }
    arr.length = w;
  }

  collide(b) {
    const enemyId = other(b.team);
    if (this.mode === 'pve' && b.team === 'red' && this.barriers.length) {
      for (const bar of this.barriers) {
        const [l0, l1] = PVE.lanes[bar.lane];
        if (b.x > l0 && b.x < l1 && Math.abs(b.y - bar.y) < 10 + b.r) {
          
          return true;
        }
      }
    }
    // 战机
    const cx = Math.floor(b.x / CELL), cy = Math.floor(b.y / CELL);
    const rr = FIGHTER.radius + b.r;
    for (let gx = cx - 1; gx <= cx + 1; gx++) {
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        const cell = this.fGrid.get(gx * 4096 + gy);
        if (!cell) continue;
        for (let i = 0; i < cell.length; i++) {
          const f = cell[i];
          if (f.team === b.team || !f.alive) continue;
          const dx = f.x - b.x, dy = f.y - b.y;
          const hr = f.hitR ? f.hitR + b.r : rr;
          if (dx * dx + dy * dy > hr * hr) continue;
          if (b.hit && b.hit.has(f.uid)) continue;
          const hitDmg = this.mode === 'pve' ? b.dmg : b.kind === 'danmaku' ? 1 : b.dmg * (b.gift || b.overload || f.alien ? 1 : this.shotFactor[b.team]);
          if (!this.hurtFighter(f, hitDmg, b.owner)) continue;
          if (b.crit) this.emit('crit', { x: f.x, y: f.y, dmg: Math.round(hitDmg) });
          if (b.wt >= 2 && this.random() < 0.5) this.emit('hitfx', { x: b.x, y: b.y, wt: b.wt });
          if (b.pierce > 0) { b.pierce--; (b.hit ||= new Set()).add(f.uid); continue; }
          return true;
        }
      }
    }
    // 战舰
    for (const s of this.battleships) {
      if (s.team === b.team) continue;
      if (Math.abs(s.x - b.x) < 58 && Math.abs(s.y - b.y) < 30) {
        s.hp -= b.kind === 'danmaku' ? 2 : b.dmg * 2; s.lastHitBy = b.owner;
        return true;
      }
    }
    // 旗舰（只有射击弹与弹幕在飞到旗舰附近时计算）
    const t = this.teams[enemyId];
    if (!t.present) return false;
    const fy = t.y + t.coreDy;
    if (Math.abs(b.y - fy) < (t.boss ? 110 : 70)) {
      for (const tu of t.turrets) {
        if (tu.dead) continue;
        const dx = tu.x - b.x, dy = tu.y - b.y;
        if (dx * dx + dy * dy < (26 + b.r) ** 2) {
          const dmg = this.mode === 'pve' ? b.dmg * (b.kind === 'danmaku' ? 0.4 : 1) : (b.kind === 'danmaku' ? 0.5 : b.dmg);
          tu.hp -= dmg;
          if (b.crit) this.emit('crit', { x: tu.x, y: tu.y, dmg: Math.round(dmg) });
          if (tu.hp <= 0) this.killTurret(t, tu, b.owner);
          return true;
        }
      }
      if (Math.abs(b.x - t.x) < t.hitW / 2 && Math.abs(b.y - fy) < (t.boss ? 50 : 40)) {
        this.damageFlag(enemyId, b.dmg, b.owner, b.kind, b.gift);
        if (b.crit) this.emit('crit', { x: b.x, y: b.y, dmg: Math.round(b.dmg) });
        if (b.overload) this.emit('spark', { x: b.x, y: b.y, team: b.team, big: true });
        return true;
      }
    }
    return false;
  }

  killTurret(t, tu, ownerUid) {
    if (tu.dead) return;
    tu.dead = true; tu.respawn = tu.pod ? PVE.podRespawn : FLAGSHIP.turretRespawn;
    const o = this.fighters.get(ownerUid);
    if (o && !o.alien && this.mode !== 'pve') o.merit += MERIT.turret;
    this.emit('explode', { x: tu.x, y: tu.y, size: 2, team: t.id });
    this.emit('banner', { team: other(t.id), uid: ownerUid, name: o?.name || '', text: tu.pod ? '击毁母舰触手炮' : '击毁敌方炮台', tier: 0 });
  }

  // ───────── 工具 ─────────
  emit(type, data = {}) {
    this.events.push({ type, at: this.clock, ...data });
    if (this.events.length > 400) this.events.splice(0, this.events.length - 400);
  }

  drainEvents() { const e = this.events; this.events = []; return e; }

  roundBoard(team, n = 5) {
    const list = [];
    for (const f of this.fighters.values()) if (!f.npc && f.team === team) list.push(f);
    return list.sort((a, b) => b.merit - a.merit).slice(0, n);
  }
}

export function shipName(name) {
  const clean = String(name || '无名').replace(/\s+/g, '').slice(0, 6);
  return `${clean}号`;
}
