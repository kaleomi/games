// 星舰弹幕战 · 战斗模拟（不依赖页面，可在 Node 里测试）
import {
  W, H, TEAMS, ROUND, FLAGSHIP, FIGHTER, WEAPONS, GIFT_TIERS, GIFT, MERIT, LEVEL, NPC, LIMITS,
} from './config.js';
import { skinFor } from './save.js';

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
  if (/^(红|红队|赤焰|1|加入红)/.test(s)) return { type: 'team', team: 'red' };
  if (/^(蓝|蓝队|苍穹|2|加入蓝)/.test(s)) return { type: 'team', team: 'blue' };
  if (has('拦截', 'lj')) return { type: 'intercept' };
  if (has('激光', 'jg')) return { type: 'weapon', weapon: 'laser' };
  if (has('散弹', 'sd')) return { type: 'weapon', weapon: 'spread' };
  if (has('蓄力', 'xl')) return { type: 'weapon', weapon: 'charge' };
  if (has('核心')) return { type: 'target', target: 'core' };
  if (has('炮台')) return { type: 'target', target: 'turret' };
  if (/^左/.test(s)) return { type: 'lane', lane: 'L' };
  if (/^中/.test(s)) return { type: 'lane', lane: 'M' };
  if (/^右/.test(s)) return { type: 'lane', lane: 'R' };
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
    };
    return t;
  }

  makeTurret(team, dx) {
    const def = TEAMS[team];
    return { x: 360 + dx, y: def.flagY + def.dir * 38, hp: FLAGSHIP.turretHp, max: FLAGSHIP.turretHp, dead: false, respawn: 0, cd: 1.5 + this.random() * 2 };
  }

  startLobby() {
    this.phase = 'lobby';
    this.phaseT = ROUND.lobbySeconds;
    this.roundNo++;
    this.time = 0;
    this.winner = null;
    this.bullets.length = 0; this.emitters.length = 0; this.hazards.length = 0; this.battleships.length = 0;
    for (const id of TEAM_IDS) this.teams[id] = this.makeTeam(id);
    const nowMs = this.now();
    for (const f of [...this.fighters.values()]) {
      if (f.npc) { this.fighters.delete(f.uid); continue; }
      if (nowMs - f.lastActive > FIGHTER.idleKick * 1000) { this.fighters.delete(f.uid); continue; }
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
    this.emit('announce', { text: `第${this.roundNo}局开战！`, voice: true });
    const pending = this.pendingGifts.splice(0);
    for (const g of pending) this.applyGift(g.user, g.gift, g.amount, g.tier);
  }

  endBattle(winner, reason) {
    this.phase = 'result';
    this.phaseT = ROUND.resultSeconds;
    this.winner = winner;
    const result = { winner, reason, round: this.roundNo, mvp: {}, players: 0 };
    for (const id of TEAM_IDS) {
      const list = this.humans().filter(f => f.team === id).sort((a, b) => b.merit - a.merit);
      result.mvp[id] = list.slice(0, 3).map(f => ({ uid: f.uid, name: f.name, merit: Math.floor(f.merit), kills: f.kills }));
    }
    for (const f of this.humans()) {
      const p = f.test ? null : this.save?.get(f.uid);
      if (!p) continue;
      const win = f.team === winner;
      const roundMerit = Math.floor(f.merit + (win ? MERIT.win : 0));
      p.games++; if (win) p.wins++;
      p.kills += f.kills; p.merit += roundMerit; p.weekMerit += roundMerit;
      const ups = this.save.addXp(p, 20 + roundMerit / 10 + (win ? 30 : 0));
      if (ups) this.emit('levelup', { uid: f.uid, name: f.name, level: p.level });
      f.level = p.level; f.skin = skinFor(p.level);
      result.players++;
    }
    if (this.save) { this.save.data.rounds++; this.save.flush(); }
    this.emit('result', result);
    const teamName = winner ? TEAMS[winner].name : '双方';
    this.emit('announce', { text: winner ? `${teamName}获胜！` : '本局平局', voice: true });
  }

  // ───────── 加入 / 指令 ─────────
  humans() { const a = []; for (const f of this.fighters.values()) if (!f.npc) a.push(f); return a; }
  countTeam(team, humansOnly = false) { let n = 0; for (const f of this.fighters.values()) if (f.team === team && (!humansOnly || !f.npc)) n++; return n; }

  pickTeam() {
    const r = this.countTeam('red', true), b = this.countTeam('blue', true);
    if (r !== b) return r < b ? 'red' : 'blue';
    const rp = this.teams.red.core / this.teams.red.coreMax, bp = this.teams.blue.core / this.teams.blue.coreMax;
    if (rp !== bp) return rp < bp ? 'red' : 'blue';
    return this.random() < 0.5 ? 'red' : 'blue';
  }

  join(user, team = null) {
    const uid = String(user?.id || '');
    if (!uid) return null;
    let f = this.fighters.get(uid);
    const nowMs = this.now();
    if (f) {
      if (user.name) f.name = String(user.name).slice(0, 24);
      if (user.avatar) f.avatar = user.avatar;
      f.lastActive = nowMs;
      if (team && team !== f.team) {
        if (this.phase === 'battle') { this.emit('toast', { uid, text: `${f.name}：本局已在${TEAMS[f.team].short}队，下局开始前可换队` }); }
        else { f.team = team; this.resetFighterForRound(f); this.emit('toast', { uid, text: `${f.name} 换到${TEAMS[team].name}` }); this.syncNpcs(); }
      }
      return f;
    }
    if (this.humans().length >= LIMITS.fighters) { this.emit('toast', { text: '战机已满，请稍后再加入' }); return null; }
    const test = uid.startsWith('test:');
    const prof = this.save && !test ? this.save.get(uid, user.name, user.avatar) : { level: user.level || 1 };
    const t = team || this.pickTeam();
    f = {
      uid, npc: false, test, name: String(user.name || prof.name || '飞行员').slice(0, 24), avatar: user.avatar || prof.avatar || '',
      team: t, level: prof.level || 1, skin: skinFor(prof.level || 1),
      weapon: ['laser', 'spread', 'charge'][Math.floor(this.random() * 3)],
      lane: ['L', 'M', 'R'][Math.floor(this.random() * 3)], target: 'core',
      lastActive: nowMs,
    };
    this.resetFighterForRound(f);
    this.fighters.set(uid, f);
    f.labelUntil = this.clock + 4;
    this.emit('join', { uid, name: f.name, team: t });
    this.syncNpcs();
    return f;
  }

  resetFighterForRound(f) {
    const def = TEAMS[f.team];
    f.maxHp = FIGHTER.baseHp + LEVEL.hpBonus(f.level);
    f.hp = f.maxHp; f.alive = true; f.respawn = 0;
    f.x = 120 + this.random() * 480;
    f.y = def.dir === 1 ? def.zone[0] + 30 : def.zone[1] - 30;
    f.vx = 0; f.vy = 0;
    f.fireCd = this.random() * 0.5; f.power = 1; f.powerUntil = 0; f.shield = 0;
    f.charge = 0; f.likeWindow = 0; f.likeWindowT = 0;
    f.merit = 0; f.kills = 0; f.dmgAcc = 0; f.smallAcc = 0;
    f.drones = 0; f.dronesUntil = 0; f.droneCd = 0;
    f.wander = this.random() * Math.PI * 2; f.depth = 0.3 + this.random() * 0.5;
    f.interceptT = 0; f.labelUntil = f.labelUntil || 0; f.invuln = 1.5;
  }

  syncNpcs(force = false) {
    const min = Math.max(0, Math.min(30, this.settings.npcMinPerTeam | 0));
    for (const team of TEAM_IDS) {
      const humans = this.countTeam(team, true);
      const want = Math.max(0, min - humans);
      const npcs = [...this.fighters.values()].filter(f => f.npc && f.team === team);
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
      case 'intercept': this.intercept(f); break;
      case 'card': this.emit('card', { uid: f.uid }); break;
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
    const f = this.join(user);
    if (!f) return null;
    f.lastActive = this.now();
    this.stats.gifts++; this.stats.giftUnits += amount;
    const tier = tierForGift(gift, this.settings);
    this.emit('gift', { uid: f.uid, name: f.name, team: f.team, gift: gift.name || '礼物', count: amount, tier });
    if (this.phase !== 'battle') {
      this.pendingGifts.push({ user: { id: f.uid, name: f.name }, gift, amount, tier });
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
    f.shield = Math.min(GIFT.shieldMax, f.shield + units);
  }

  applyGift(user, gift, amount, tier) {
    const f = this.fighters.get(String(user.id)) || this.join(user);
    if (!f) return;
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
        if (i === 0 && team.cannon.state === 'idle') this.chargeCannon(team, f);
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

  chargeCannon(team, f) {
    team.cannon = { state: 'charging', t: GIFT.cannonCharge, intercept: 0, owner: f.uid, ownerName: f.name, fireT: 0 };
    this.emit('banner', { team: team.id, uid: f.uid, name: f.name, text: '旗舰主炮蓄力中！对面快发「拦截」', tier: 5 });
    this.emit('announce', { text: `${f.name} 启动旗舰主炮，${TEAMS[other(team.id)].short}队快发拦截`, voice: true });
  }

  // ───────── 主循环 ─────────
  step(dt) {
    this.clock += dt;
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
      if (this.phaseT <= 0) this.startLobby();
      return;
    }
    this.time += dt;
    this.phaseT -= dt;
    if (Math.floor(this.clock) !== Math.floor(this.clock - dt) && Math.floor(this.clock) % 2 === 0) this.syncNpcs();
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
      if (t.core <= 0) { this.emit('explode', { x: 360, y: t.def.flagY, size: 4, team: id }); return this.endBattle(other(id), 'destroyed'); }
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
    if (t.sinceHit > FLAGSHIP.shieldDelay) t.shield = Math.min(t.shieldMax, t.shield + (low ? FLAGSHIP.shieldRegenLow : FLAGSHIP.shieldRegen) * dt);
    if (low && !t.extraTurret) {
      t.extraTurret = true;
      t.turrets.push(this.makeTurret(t.id, 0));
      this.emit('banner', { team: t.id, text: '旗舰受创，追加中央炮台、护盾加速回复', tier: 0 });
    }
    for (const tu of t.turrets) {
      if (tu.dead) { tu.respawn -= dt; if (tu.respawn <= 0) { tu.dead = false; tu.hp = tu.max; } continue; }
      tu.cd -= dt;
      if (tu.cd <= 0) {
        const [a, b] = FLAGSHIP.turretFire;
        tu.cd = (a + this.random() * (b - a)) * (low ? 0.75 : 1);
        this.spawnPattern(t.id, this.random() < 0.5 ? 'turretFan' : 'turretSpiral', tu.x, tu.y + t.def.dir * 20, null);
      }
    }
    // 礼物阵型队列
    t.patternT -= dt;
    if (t.patternT <= 0 && t.patternQueue.length) {
      const job = t.patternQueue.shift();
      t.patternT = GIFT.patternQueueGap;
      const f = this.fighters.get(job.owner);
      const x = f && f.alive && f.team === t.id ? f.x : 360;
      const y = f && f.alive && f.team === t.id ? f.y : t.def.flagY + t.def.dir * 80;
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
      c.t -= dt;
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
    const dmg = enemy.coreMax * GIFT.cannonDamage * mult;
    enemy.core = Math.max(0, enemy.core - dmg);
    enemy.hitFlash = 1;
    c.state = 'firing'; c.fireT = 1.3;
    const owner = this.fighters.get(c.owner);
    if (owner) owner.merit += (dmg / 100) * MERIT.per100Damage;
    // 光柱中的敌机全部击落
    for (const f of this.fighters.values()) {
      if (f.team === t.id || !f.alive) continue;
      if (Math.abs(f.x - 360) < 95) this.killFighter(f, owner);
    }
    for (const s of this.battleships) if (s.team !== t.id && Math.abs(s.x - 360) < 120) s.hp -= s.max * 0.6;
    this.emit('cannon', { team: t.id, intercept: c.intercept, damage: Math.round(dmg), name: c.ownerName });
    this.emit('announce', { text: c.intercept > 0.25 ? `主炮命中，被拦截削弱${Math.round(Math.min(GIFT.interceptCap, c.intercept) * 100)}%` : '主炮命中！', voice: true });
  }

  spawnShip(team, owner, name) {
    const def = TEAMS[team];
    this.battleships.push({
      id: ++this.shipSeq, team, owner, name: shipName(name), ownerName: name,
      x: 360, y: def.flagY + def.dir * 60, ty: (def.zone[0] + def.zone[1]) / 2 + def.dir * -40,
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
    for (const f of this.fighters.values()) {
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
    const [z0, z1] = def.zone;
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
      if (enemy.cannon.state === 'charging' || enemy.cannon.state === 'firing') { const d = f.x - 360; if (Math.abs(d) < 130) rx += Math.sign(d || 1) * 4; }
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
    if (f.drones) {
      f.droneCd -= dt;
      if (f.droneCd <= 0) { f.droneCd = 0.25; for (const s of [-1, 1]) this.addBullet(f.x + s * 26, f.y, 0, dir * 1000, 3, 1, f.team, 'shot', f.uid, 0, { gift: true }); }
    }
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

  respawnFighter(f) {
    const def = TEAMS[f.team];
    f.alive = true; f.hp = f.maxHp; f.invuln = 2;
    f.x = 120 + this.random() * 480;
    f.y = def.dir === 1 ? def.zone[0] : def.zone[1];
    f.vx = f.vy = 0;
  }

  killFighter(f, killer) {
    if (!f.alive) return;
    f.alive = false; f.respawn = FIGHTER.respawn; f.shield = 0;
    this.emit('explode', { x: f.x, y: f.y, size: 1, team: f.team });
    if (killer && killer.team !== f.team) { killer.merit += MERIT.kill; killer.kills++; }
  }

  hurtFighter(f, dmg, ownerUid) {
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
      case 'split': {
        for (let i = 0; i < 4; i++) {
          const a = base + (i - 1.5) * 0.35;
          this.addBullet(x, y, Math.cos(a) * 240, Math.sin(a) * 240, 13, 1, team, 'danmaku', owner, 0, { split: 0.9 + i * 0.12, orb: true, gift: true });
        }
        break;
      }
      case 'grid': {
        const ez = TEAMS[other(team)].zone;
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
        if (inside) { h.hit.add(f.uid); this.hurtFighter(f, 2, h.owner); }
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
    const norm = fromGift ? 1 : Math.pow(FLAGSHIP.attackerNorm / Math.max(FLAGSHIP.attackerNorm, n), 0.8);
    let dmg = raw * norm * (kind === 'danmaku' ? 0.4 : 1);
    const counted = dmg;
    t.sinceHit = 0; t.dmgTaken += dmg;
    if (t.shield > 0) { const s = Math.min(t.shield, dmg); t.shield -= s; dmg -= s; }
    if (dmg > 0) { t.core = Math.max(0, t.core - dmg); t.hitFlash = Math.max(t.hitFlash, 0.15); }
    const o = this.fighters.get(ownerUid);
    if (o) {
      o.dmgAcc += counted;
      while (o.dmgAcc >= 100) { o.dmgAcc -= 100; o.merit += MERIT.per100Damage; }
    }
  }

  stepBullets(dt, combat) {
    const arr = this.bullets;
    let w = 0;
    for (let i = 0; i < arr.length; i++) {
      const b = arr[i];
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
          if (dx * dx + dy * dy > rr * rr) continue;
          if (b.hit && b.hit.has(f.uid)) continue;
          if (!this.hurtFighter(f, b.kind === 'danmaku' ? 1 : b.dmg * (b.gift || b.overload ? 1 : this.shotFactor[b.team]), b.owner)) continue;
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
    const fy = t.def.flagY;
    if (Math.abs(b.y - fy) < 70) {
      for (const tu of t.turrets) {
        if (tu.dead) continue;
        const dx = tu.x - b.x, dy = tu.y - b.y;
        if (dx * dx + dy * dy < (26 + b.r) ** 2) {
          tu.hp -= b.kind === 'danmaku' ? 0.5 : b.dmg;
          if (tu.hp <= 0) {
            tu.dead = true; tu.respawn = FLAGSHIP.turretRespawn;
            const o = this.fighters.get(b.owner); if (o) o.merit += MERIT.turret;
            this.emit('explode', { x: tu.x, y: tu.y, size: 2, team: enemyId });
            this.emit('banner', { team: b.team, uid: b.owner, name: o?.name || '', text: '击毁敌方炮台', tier: 0 });
          }
          return true;
        }
      }
      if (Math.abs(b.x - 360) < FLAGSHIP.hitWidth / 2 && Math.abs(b.y - fy) < 40) {
        this.damageFlag(enemyId, b.dmg, b.owner, b.kind, b.gift);
        if (b.overload) this.emit('spark', { x: b.x, y: b.y, team: b.team, big: true });
        return true;
      }
    }
    return false;
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
