// 萌宠保卫战 · 战斗模拟（不依赖页面，可在 Node 里测试）
import { ROUND, PET, SPECIES, SPECIES_IDS, GIFTS, SCORE, RESERVE, NPC, STAGE, LEVEL, RANK, TREE, FORMS, formOf, BOND, FOES, COMFORT, FRIEND, SPRITES } from './config.js';
import { SLOT_IDS, makeItem, rollItem, combatPower, growthE, talentText } from './gear.js';
import { parseSpecies, parseSkill, pickSpecies, setupPet, refreshStats, stepPet, requestUlt, stepAreas, chooseRing, requestDodge, patPet } from './pets.js';
import { stepFoe } from './foes.js';
import { startStage, stepStage, stageKind, chapterOf, failTarget, stageLabel, stageTitle, interceptZone, likeShield } from './stage.js';
import { makeWish, returnWish, startComfort, hugBoss, comforting, initTreeSlots, wishStore } from './wish.js';
import { addFriendship, hugFriend, stepDuo, tame, maybeTame, loadSprites, stepGarden, bestFriend, friendsOf, friendLevel, SPRITE_UNITS } from './friends.js';
import { plant, water, harvest, sell, expand, farmAll, unlockPet, giftFarm, battleCoins, startHome, stepHome, assignTile, parseCrop, petUnlocked } from './farm.js';
import { FARM, ADV_PETS } from './config.js';
import { stepProjs, LANES, score, healTree } from './combat.js';
import { giftKind, applyGift, stepGifts, moraleLike, dailyCheckin, loadBuffs, pauseSummons, resumeSummons, xpMul, goldPurified, addBond } from './gifts.js';
import { rollDrops, smallPurify, giveItem, profileOf, petRecord, lootFloor, dropTimes, grantProfileItem } from './loot.js';
import { petData, cleanNick, dayKeyOf } from './save.js';

const NPC_NAMES = ['豆豆', '毛毛', '球球', '咕咕', '嘟嘟', '糯米', '布丁', '可可', '奶糖', '年糕', '芝麻', '汤圆', '饭团', '小满'];

export function parseCommand(text) {
  const raw = String(text || '').trim(), s = raw.toLowerCase();
  if (!s || s.length > 30) return null;
  const name = raw.match(/^(?:起名|取名|改名|名字叫|叫它|叫他|叫她)[:：\s]*(.+)$/);
  if (name) return { type: 'name', nick: name[1] };
  const wish = raw.match(/^(?:许愿|许个愿|我许愿|我的心愿是|心愿)[:：\s]*(.+)$/);
  if (wish) return { type: 'wish', text: wish[1] };
  const has = (...w) => w.some(x => s === x || s.startsWith(x) || s.includes(x));
  const m = s.match(/^(?:往|去|到|走|躲)?([123１２３一二三])(?:号|区|号区|圈)?$/);
  if (m) return { type: 'ring', ring: '1１一'.includes(m[1]) ? 0 : '2２二'.includes(m[1]) ? 1 : 2 };
  if (/^(闪|闪避|闪开|躲|躲开|快跑|shan)$/.test(s)) return { type: 'dodge' };
  if (has('撑伞', '打伞', 'cs') || /^(伞|挡|挡住|拦截|拦)$/.test(s)) return { type: 'umbrella' };
  // 回家种田
  if (/^(种田|干活|干农活|农活|忙农活|一键种田|收菜卖菜)$/.test(s)) return { type: 'farmAll' };
  const pl = raw.match(/^(?:种|种植|播种|种下|种点)\s*(.{0,8})$/);
  if (pl && !/^(花|树|蛋)/.test(pl[1])) return { type: 'plant', crop: parseCrop(pl[1]) };
  if (/^(浇水|浇|浇浇|浇花|浇菜|js)$/.test(s)) return { type: 'water' };
  if (/^(收|收获|收菜|收割|摘|摘菜|收成)$/.test(s)) return { type: 'harvest' };
  if (/^(卖|卖菜|卖掉|出售|卖货|卖了|全卖)$/.test(s)) return { type: 'sell' };
  if (/^(扩地|开垦|买地|加地|开荒)$/.test(s)) return { type: 'expand' };
  const ul = raw.match(/^(?:解锁|买|购买|兑换)\s*(.{1,8})$/);
  if (ul && parseSpecies(ul[1])) return { type: 'unlock', sp: parseSpecies(ul[1]) };
  if (/^(农场|我的农场|仓库|金币|我的金币|菜地)$/.test(s)) return { type: 'farm' };
  if (/抱抱|不哭|别哭|安慰|摸摸头|^hug$|^bb$/.test(s)) return { type: 'comfort', hug: /抱抱|hug|bb/.test(s) };
  if (/^(贴贴|贴一贴|蹭蹭|抱一个|tt)/.test(s)) return { type: 'hugf' };
  if (/^(摸摸|摸|rua|撸|撸撸|亲亲|mm)$/.test(s) || /^摸摸/.test(s)) return { type: 'pat' };
  if (/^(朋友|好友|好朋友|我的朋友)$/.test(s)) return { type: 'friends' };
  if (/^(图鉴|精灵|小精灵|我的精灵)$/.test(s)) return { type: 'sprites' };
  if (has('装备', '装扮', '背包', 'zb')) return { type: 'gear' };
  if (has('签到', '打卡')) return { type: 'checkin' };
  if (has('排行', '排名', '榜单', '战力榜')) return { type: 'rank' };
  if (has('我的', '看看', '查询', '萌宠卡', '我的萌宠')) return { type: 'card' };
  if (has('加入', '参战', '上场', '来了', '报到', '领养', '守护')) return { type: 'join' };
  return null;
}

function announce(game, prev, list, topText, top3Text) {
  if (!prev || !list.length) return;
  const top = list[0];
  if (prev[0] && prev[0].uid !== top.uid && top.online) { game.emit('banner', { uid: top.uid, name: top.name, text: topText(top), tier: 5 }); return; }
  for (let i = 1; i < Math.min(3, list.length); i++) {
    const p = list[i], j = prev.findIndex(q => q.uid === p.uid);
    if (p.online && (j < 0 || j >= 3)) { game.emit('banner', { uid: p.uid, name: p.name, text: top3Text(p, i), tier: 4 }); return; }
  }
}

export class Game {
  constructor({ save = null, random = Math.random, now = () => Date.now(), settings = {} } = {}) {
    this.save = save; this.random = random; this.now = now;
    this.settings = { npcMin: NPC.min, giftByName: {}, ...settings };
    this.events = [];
    this.pets = new Map(); this.reserve = new Map();
    this.foes = []; this.projs = []; this.zones = []; this.areas = [];
    this.engaged = new Map(); this.petCount = 0;
    this.pendingGifts = [];
    this.clock = 0; this.npcSeq = 0; this.zoneSeq = 0;
    this.memStage = 1; this.memClearNo = 0; this.memFail = 0;
    this.stats = { gifts: 0, chats: 0, likes: 0 };
    this.stage = null; this.boss = null; this.result = null; this.tree = null;
    this.startLobby('start');
    this.autoJoinBuffed();
  }

  get stageN() { return Math.max(1, this.save ? this.save.data.stage : this.memStage); }
  setStageN(n) { if (this.save) { this.save.data.stage = n; this.save.dirty = true; } else this.memStage = n; }
  get failStreak() { return this.save ? this.save.data.failStreak || 0 : this.memFail; }
  set failStreak(v) { if (this.save) { this.save.data.failStreak = v; this.save.dirty = true; } else this.memFail = v; }
  clearNo() { return this.save ? this.save.data.clearNo || 0 : this.memClearNo; }

  // 刷新页面后：还有自动守护、最近3小时来过的观众自动上场
  autoJoinBuffed() {
    if (!this.save) return 0;
    const t = this.now();
    const list = Object.values(this.save.data.players).filter(p => (p.auto || 0) > 0 && p.cur && t - (p.seen || 0) < 3 * 3600e3).sort((a, b) => b.auto - a.auto).slice(0, RESERVE.cap);
    for (const p of list) this.join({ id: p.uid, name: p.name, avatar: p.avatar });
    return list.length;
  }

  // ───────── 阶段 ─────────
  startLobby(reason = '') {
    this.phase = 'lobby'; this.phaseT = ROUND.lobbySeconds; this.lobbyReason = reason;
    this.foes.length = 0; this.projs.length = 0; this.zones.length = 0; this.areas.length = 0; this.boss = null; this.stage = null;
    const tm = Math.round(TREE.hp * (1 + TREE.grow * (chapterOf(this.stageN) - 1)));
    this.tree = { hp: tm, maxHp: tm, flash: 0 };
    initTreeSlots(this);
    for (const f of this.pets.values()) if (!f.egg) setupPet(this, f, { keepCd: false });
    this.syncNpcs();
    this.emit('phase', { phase: 'lobby', n: this.stageN });
  }
  // 打完首领回家种田（时长在设置里改，0 = 不回家）
  homeSeconds() { const v = this.settings.homeSeconds; return Number.isFinite(v) ? Math.max(0, Math.min(600, v)) : FARM.homeSeconds; }
  startHome() {
    this.phase = 'home'; this.phaseT = this.homeSeconds(); this.result = null;
    this.foes.length = 0; this.projs.length = 0; this.zones.length = 0; this.areas.length = 0; this.boss = null;
    for (const f of this.pets.values()) if (!f.egg) { if (!f.alive) setupPet(this, f, { keepCd: false }); f.act = null; }
    startHome(this);
    this.emit('phase', { phase: 'home', n: this.stageN });
    this.emit('banner', { text: '回家啦！发「种田」一键收菜、卖菜、种菜、浇水', tier: 4 });
  }
  startBattle() {
    const n = this.stageN;
    this.phase = 'battle'; this.phaseT = 0; this.result = null;
    for (const f of this.pets.values()) {
      if (f.egg) continue;
      if (!f.alive) setupPet(this, f); else { f.hp = f.maxHp; f.act = f.act?.kind === 'ult' ? f.act : null; }
      if (f.meritNext) { f.merit += f.meritNext; f.meritNext = 0; }
    }
    startStage(this, n);
    this.emit('phase', { phase: 'battle', n });
    const pend = this.pendingGifts.splice(0);
    for (const g of pend) { const f = this.pets.get(g.uid); if (f) applyGift(this, f, g.kind, g.amount); }
  }
  stageClear() {
    const s = this.stage, n = s.n, kind = s.kind;
    if (this.save) { this.save.data.clearNo = (this.save.data.clearNo || 0) + 1; this.save.data.best = Math.max(this.save.data.best || 0, n); this.save.dirty = true; } else this.memClearNo++;
    if (kind === 'boss') this.failStreak = 0;
    this.setStageN(n + 1);
    for (const e of this.foes) if (e.alive && !e.purified) { e.alive = false; e.purified = 0.001; this.emit('purify', { id: e.id, x: e.x, y: e.y, role: e.role, unit: e.unit, quiet: true }); }
    this.projs = this.projs.filter(b => b.team === 'p');
    this.zones.length = 0;
    const drops = rollDrops(this, kind, n);
    const reserve = this.clearReward(n);
    for (const f of this.humans()) { this.grantXp(f, Math.round((10 + 4 * chapterOf(n)) * xpMul(this, f)), null, true); f.giftRound = 0; const p = profileOf(this, f); if (p) p.clears++; }
    this.liveXp();
    battleCoins(this, n, kind === 'boss');
    const fruits = Math.ceil(this.tree.hp / (this.tree.maxHp / TREE.fruits) - 1e-6);
    this.emit('clear', { n, kind, label: stageLabel(n), title: stageTitle(n), drops: drops.length, fruits });
    if (kind === 'wave') {
      this.phase = 'clear'; this.phaseT = ROUND.clearSeconds;
      this.emit('banner', { text: `${stageLabel(n)} 守住啦！心愿果还剩 ${fruits} 个${drops.length ? ` · 掉落${drops.length}件` : ''}`, tier: 3, clear: true });
    } else this.showResult({ clear: true, n, kind, drops, reserve, next: n + 1, fruits, grade: s.grade || null, wishes: kind === 'boss' ? this.lastWishTrue || 0 : 0, comfort: s.comfort ? { secs: Math.round(s.comfort.t * 10) / 10, hugs: s.comfort.have } : null });
    this.save?.flush();
  }
  stageFail(reason) {
    const s = this.stage, n = s.n;
    this.failStreak = this.failStreak + 1;
    const t = failTarget(n);
    this.setStageN(t.stage);
    this.zones.length = 0;
    this.showResult({ clear: false, n, kind: s.kind, drops: [], next: t.stage, back: t.back, reason, streak: this.failStreak, fruits: 0 });
    this.save?.flush();
  }
  showResult(r) {
    this.phase = 'result'; this.phaseT = ROUND.resultSeconds;
    const list = this.humans().filter(f => !f.reserve).sort((a, b) => b.merit - a.merit).slice(0, 10)
      .map(f => ({ uid: f.uid, name: f.name, nick: f.nick, avatar: f.avatar || '', merit: Math.floor(f.merit), level: f.level, sp: f.sp, shiny: f.shiny }));
    for (const d of r.drops) if (!list.some(m => m.uid === d.uid)) list.push({ uid: d.uid, name: d.name, nick: d.nick, merit: null, level: this.pets.get(d.uid)?.level || 1, sp: d.sp });
    const gifts = [...(this.giftBoard || new Map()).values()].sort((a, b) => b.coins - a.coins || a.t - b.t).slice(0, 6).map(g => {
      const f = this.pets.get(g.uid);
      return { ...g, gifts: Object.entries(g.gifts).sort((a, b) => b[1] - a[1]).slice(0, 3), double: f ? dropTimes(this, f) > 1 : false, floor: f ? lootFloor(this, f) : -1, got: r.drops.filter(d => d.uid === g.uid).length };
    });
    this.giftBoard = new Map();
    const bossUnit = this.stage?.chapter?.boss;
    this.result = { ...r, gifts, label: stageLabel(r.n), title: stageTitle(r.n), nextLabel: stageLabel(r.next), bossName: bossUnit ? FOES[bossUnit].name : '', players: list, round: (this.resultSeq = (this.resultSeq || 0) + 1) };
    for (const f of this.humans()) { const p = profileOf(this, f); if (p) { p.games++; p.merit += Math.floor(f.merit); p.weekMerit += Math.floor(f.merit); } f.merit = 0; f.xpCounted = 0; }
    if (this.save) this.save.data.rounds++;
    this.emit('result', this.result);
  }

  // 本直播间萌宠战力榜（历史所有来过的观众；每 5 秒算一次）：按他最强那只萌宠排
  rankings(force = false) {
    const R = this.ranks;
    if (R && !force && this.clock - R.t < 5) return R;
    const list = [], seen = new Set();
    const bestOf = pets => { let b = null; for (const [sp, d] of Object.entries(pets || {})) { if (!SPECIES[sp]) continue; const cp = combatPower({ level: d.lv, gear: d.gear, talent: d.talent, star: d.star, sub: d.sub, shiny: d.shiny, bond: d.bond }); if (!b || cp > b.cp) b = { cp, sp, level: d.lv, nick: d.nick, talent: d.talent || 0, star: d.star || 0, sub: d.sub || 0, shiny: !!d.shiny, hat: d.gear?.hat?.tier ?? -1 }; } return b; };
    const add = (who, prof, online) => {
      const coins = prof?.coins || 0;
      const pets = online ? { ...(prof?.pets || {}), [who.sp]: { lv: who.level, gear: who.gear, talent: who.talent, star: who.star, sub: who.sub, shiny: who.shiny, bond: who.bond, nick: who.nick } } : prof?.pets;
      const b = bestOf(pets);
      if (!b || b.cp <= 50) return;
      if (!online && !coins && b.level < 3) return;
      list.push({ uid: who.uid, name: who.name, avatar: who.avatar || '', online, coins, ...b, score: coins * RANK.coinW + b.cp });
    };
    for (const f of this.pets.values()) { if (f.npc || f.merc) continue; seen.add(f.uid); add(f, this.save?.peek?.(f.uid), true); }
    for (const p of Object.values(this.save?.data?.players || {})) if (!seen.has(p.uid) && !String(p.uid).startsWith('test:')) add(p, p, false);
    list.sort((a, b) => b.score - a.score || b.level - a.level);
    this.ranks = { t: this.clock, list };
    if (R) announce(this, R.list, list, p => `${p.name} 战力 ${p.cp}，登顶本直播间萌宠战力榜第一！`, (p, i) => `${p.name} 战力 ${p.cp}，冲进萌宠战力榜前三，排第 ${i + 1}！`);
    return this.ranks;
  }

  step(dt) {
    this.clock += dt;
    const sec = Math.floor(this.clock) !== Math.floor(this.clock - dt);
    if (sec) { this.stepReserve(); if (this.phase === 'battle' || this.phase === 'lobby') this.rankings(); }
    this.petCount = 0; for (const f of this.pets.values()) if (f.alive && !f.egg) this.petCount++;
    if (this.phase === 'lobby') {
      this.phaseT -= dt;
      for (const f of [...this.pets.values()]) stepPet(this, f, dt, false);
      stepGifts(this, dt, false);
      if (this.phaseT <= 0) this.startBattle();
      return;
    }
    if (this.phase === 'clear' || this.phase === 'result') {
      this.phaseT -= dt;
      for (const f of [...this.pets.values()]) stepPet(this, f, dt, false);
      this.stepFoes(dt);
      stepProjs(this, dt);
      stepGifts(this, dt, false);
      if (this.phaseT <= 0) {
        if (this.phase === 'result' && !this.result?.clear) this.startLobby('fail');
        else if (this.phase === 'result' && this.result?.kind === 'boss' && this.homeSeconds() > 0) this.startHome();
        else this.startBattle();
      }
      return;
    }
    if (this.phase === 'home') {
      this.phaseT -= dt;
      for (const f of [...this.pets.values()]) stepPet(this, f, dt, false);
      stepGifts(this, dt, false);
      stepHome(this, dt);
      if (this.phaseT <= 0) this.startLobby('home');
      return;
    }
    this.engaged.clear();
    for (const f of this.pets.values()) if (f.alive && f.tgtId) this.engaged.set(f.tgtId, (this.engaged.get(f.tgtId) || 0) + 1);
    if (sec && Math.floor(this.clock) % 2 === 0) this.syncNpcs();
    stepGifts(this, dt, true);
    stepStage(this, dt);
    stepGarden(this, dt);
    stepDuo(this, dt);
    for (const f of [...this.pets.values()]) stepPet(this, f, dt, true);
    this.stepFoes(dt);
    stepAreas(this, dt);
    stepProjs(this, dt);
    if (sec) this.liveXp();
    const s = this.stage;
    if (s.cleared) return this.stageClear();
    if (s.treeDown) return this.stageFail('tree');
    if (s.left <= 0) return this.stageFail('timeout');
  }
  stepFoes(dt) {
    for (const e of this.foes) stepFoe(this, e, dt);
    this.foes = this.foes.filter(e => !(e.purified && e.purified > (e.role === 'boss' ? 3.2 : e.role === 'minion' ? 1.4 : 2.2)) && !e.gone);
  }

  // ───────── 领养 / 换萌宠 ─────────
  humans() { const a = []; for (const f of this.pets.values()) if (!f.npc) a.push(f); return a; }
  activeHumans() { let n = 0; for (const f of this.pets.values()) if (!f.npc) n++; return n; }

  join(user, sp = null, { force = false } = {}) {
    const uid = String(user?.id || '');
    if (!uid) return null;
    let f = this.pets.get(uid);
    const nowMs = this.now();
    if (!f && this.reserve.has(uid)) return this.fromReserve(this.reserve.get(uid), user, force, sp);
    if (!f && this.activeHumans() >= RESERVE.cap && !this.makeRoom(force)) return this.newToReserve(user, sp);
    if (f) {
      if (user.name) f.name = String(user.name).slice(0, 24);
      if (user.avatar) f.avatar = user.avatar;
      f.lastActive = nowMs;
      if (sp) this.setSpecies(f, sp);
      return f;
    }
    if (sp && ADV_PETS[sp]) { const pr = this.save && !uid.startsWith('test:') ? this.save.peek(uid) : null; if (!pr?.farm?.pets?.includes(sp) && !pr?.pets?.[sp]) { this.emit('toast', { uid, text: `${user.name || '小可爱'}：${SPECIES[sp].kind}是高级萌宠，农场 Lv${ADV_PETS[sp].lv} + ${ADV_PETS[sp].cost}金币解锁（发「解锁${SPECIES[sp].kind}」）` }); sp = null; } }
    const test = uid.startsWith('test:');
    const prof = this.save && !test ? this.save.get(uid, user.name, user.avatar) : null;
    const chosen = sp || prof?.cur || pickSpecies(this);
    const fresh = !prof?.pets?.[chosen];
    f = { uid, npc: false, test, name: String(user.name || prof?.name || '小可爱').slice(0, 24), avatar: user.avatar || prof?.avatar || '',
      homeX: this.freeLane(), lastActive: nowMs, merit: 0, auto: prof?.auto || 0, giftRound: 0 };
    this.bindPet(f, chosen, prof);
    if (prof && prof.cur !== chosen) { prof.cur = chosen; this.save.dirty = true; }
    setupPet(this, f, { keepCd: false });
    f.y = 960;
    this.pets.set(uid, f);
    f.labelUntil = this.clock + 4;
    if (fresh) this.layEgg(f);
    this.emit('join', { uid, name: f.name, sp: chosen, fresh });
    if (prof) { this.catchUp(f, prof); loadBuffs(this, f, prof); }
    if (this.phase === 'home') assignTile(this, f);
    this.syncNpcs();
    return f;
  }
  // 站位分散：放到萌宠最少的那一列
  freeLane() {
    const n = LANES.map(x => [...this.pets.values()].filter(f => f.homeX === x).length);
    const min = Math.min(...n), opts = LANES.filter((x, i) => n[i] === min);
    return opts[Math.floor(this.random() * opts.length)];
  }
  layEgg(f) { f.egg = true; f.eggT = PET.hatch; this.emit('egg', { uid: f.uid, name: f.name, sp: f.sp, x: f.x, y: f.y }); }
  // 读存档里这只萌宠的养成数据（每种萌宠各自一份）
  bindPet(f, sp, prof = null) {
    f.sp = sp;
    let d;
    if (prof) d = petData(prof, sp);
    else { f.mem ||= {}; d = f.mem[sp] ||= { lv: f.level || 1, xp: 0, nick: '', talent: 0, star: 0, sub: 0, shiny: false, gear: {}, bond: 0 }; }
    f.level = d.lv; f.nick = d.nick || ''; f.talent = d.talent || 0; f.star = d.star || 0; f.sub = d.sub || 0; f.shiny = !!d.shiny; f.gear = d.gear; f.bond = d.bond || 0;
    loadSprites(this, f, prof);
  }
  setSpecies(f, sp) {
    if (!SPECIES[sp] || f.npc) return false;
    if (ADV_PETS[sp] && !petUnlocked(this, f, sp)) { this.emit('toast', { uid: f.uid, text: `${f.name}：${SPECIES[sp].kind}是高级萌宠，农场 Lv${ADV_PETS[sp].lv} + ${ADV_PETS[sp].cost}金币解锁（发「解锁${SPECIES[sp].kind}」）` }); return false; }
    const prof = this.save && !f.test ? this.save.peek(f.uid) : null;
    if (prof && prof.cur !== sp) { prof.cur = sp; this.save.dirty = true; }
    if (f.sp === sp) return true;
    const fresh = prof ? !prof.pets?.[sp] : !f.mem?.[sp];
    if (!prof && f.mem?.[f.sp]) Object.assign(f.mem[f.sp], { lv: f.level, nick: f.nick, bond: f.bond });
    this.bindPet(f, sp, prof);
    f.act = null;
    refreshStats(f);
    setupPet(this, f);
    f.labelUntil = this.clock + 3;
    if (fresh) this.layEgg(f);
    this.emit('species', { uid: f.uid, name: f.name, sp, fresh });
    this.emit('toast', { uid: f.uid, text: fresh ? `${f.name} 领养了一颗${SPECIES[sp].kind}蛋` : `${f.name} 换成了${f.nick || SPECIES[sp].name}（${SPECIES[sp].kind}）` });
    return true;
  }
  // 起名：名字一直挂在萌宠头上
  rename(f, raw) {
    if (f.npc) return false;
    const nick = cleanNick(raw);
    if (!nick) { this.emit('toast', { uid: f.uid, text: `${f.name}：名字只能用汉字、字母、数字，最多6个字` }); return false; }
    f.nick = nick;
    const d = petRecord(this, f); if (d) { d.nick = nick; this.save.dirty = true; } else if (f.mem?.[f.sp]) f.mem[f.sp].nick = nick;
    f.labelUntil = this.clock + 5; f.happyT = 1.3;
    this.emit('rename', { uid: f.uid, name: f.name, nick, sp: f.sp });
    this.emit('toast', { uid: f.uid, text: `${f.name} 的${SPECIES[f.sp].kind}有名字啦：「${nick}」` });
    return true;
  }
  // 摸摸：开心地蹦一下、回一点体力、涨亲密度（每天最多20点）
  pat(f) {
    if (!patPet(this, f)) return false;
    const p = profileOf(this, f), holder = p || f, day = dayKeyOf(this.now());
    if (holder.patDay !== day) { holder.patDay = day; holder.patToday = 0; }
    if ((holder.patToday || 0) < PET.patDaily) { holder.patToday = (holder.patToday || 0) + BOND.pat; addBond(this, f, BOND.pat); }
    if (p) this.save.dirty = true;
    return true;
  }

  // ───────── 后援 ─────────
  toReserve(f, why) {
    if (!f || f.npc || f.reserve) return;
    pauseSummons(this, f);
    f.reserve = true; f.reserveAt = this.now(); f.alive = false;
    this.pets.delete(f.uid); this.reserve.set(f.uid, f);
    this.emit('toast', { uid: f.uid, text: `${f.name} ${why === 'full' ? '场上满员' : '5分钟没互动'}，萌宠回窝休息（发言/点赞/送礼回来）` });
    this.syncNpcs();
  }
  makeRoom(force) {
    let idle = null;
    for (const f of this.pets.values()) if (!f.npc && (!idle || f.lastActive < idle.lastActive)) idle = f;
    if (!idle || (!force && this.now() - idle.lastActive < 60000)) return false;
    this.toReserve(idle, 'full');
    return true;
  }
  newToReserve(user, sp) {
    const f = { uid: String(user.id), npc: false, test: String(user.id).startsWith('test:'), name: String(user.name || '小可爱').slice(0, 24), avatar: user.avatar || '', lastActive: this.now(), pending: user, pendingSp: sp };
    const prof = this.save && !f.test ? this.save.get(f.uid, user.name, user.avatar) : null;
    f.sp = sp || prof?.cur || 'shiba'; f.level = prof?.pets?.[f.sp]?.lv || 1;
    f.reserve = true; f.reserveAt = this.now(); f.fresh = true;
    this.reserve.set(f.uid, f);
    this.emit('toast', { uid: f.uid, text: `${f.name}：场上已满${RESERVE.cap}只，先在窝里等，有空位自动上场` });
    return null;
  }
  fromReserve(f, user, force, sp = null) {
    f.lastActive = this.now();
    if (user?.name) f.name = String(user.name).slice(0, 24);
    if (sp) f.pendingSp = sp;
    if (this.activeHumans() >= RESERVE.cap && !this.makeRoom(force)) { f.wantIn = true; return null; }
    this.reserve.delete(f.uid);
    if (f.fresh) return this.join(f.pending || { id: f.uid, name: f.name, avatar: f.avatar }, f.pendingSp);
    f.reserve = false; f.wantIn = false;
    if (f.pendingSp && f.pendingSp !== f.sp) { const prof = this.save && !f.test ? this.save.peek(f.uid) : null; this.bindPet(f, f.pendingSp, prof); if (prof) prof.cur = f.pendingSp; }
    f.pendingSp = null;
    setupPet(this, f, { keepCd: false });
    this.pets.set(f.uid, f);
    f.labelUntil = this.clock + 4;
    resumeSummons(this, f);
    this.emit('join', { uid: f.uid, name: f.name, sp: f.sp, back: true });
    const prof = this.save && !f.test ? this.save.peek(f.uid) : null;
    if (prof) this.catchUp(f, prof);
    this.syncNpcs();
    return f;
  }
  stepReserve() {
    const nowMs = this.now();
    for (const f of [...this.pets.values()]) if (!f.npc && !(f.auto > 0) && nowMs - f.lastActive > RESERVE.idle * 1000) this.toReserve(f, 'idle');
    while (this.activeHumans() > RESERVE.cap) { let idle = null; for (const f of this.pets.values()) if (!f.npc && (!idle || f.lastActive < idle.lastActive)) idle = f; this.toReserve(idle, 'full'); }
    const want = [...this.reserve.values()].filter(f => (f.wantIn || f.fresh) && nowMs - f.lastActive < RESERVE.idle * 1000).sort((a, b) => b.lastActive - a.lastActive);
    for (const f of want) { if (this.activeHumans() >= RESERVE.cap) break; this.fromReserve(f, null, false); }
    for (const f of [...this.reserve.values()]) if (nowMs - f.lastActive > RESERVE.keep * 1000) this.reserve.delete(f.uid);
  }
  // 过关：窝里的萌宠也拿一半基础经验 + 1件普通装备
  clearReward(n) {
    const no = this.clearNo(), kind = stageKind(n);
    for (const f of this.humans()) { const p = profileOf(this, f); if (p) p.seenClear = no; }
    const xp = kind === 'wave' ? Math.round(RESERVE.baseXp(chapterOf(n)) * RESERVE.xpRate) : 0;
    let cnt = 0;
    for (const f of this.reserve.values()) {
      const p = !f.test && this.save?.peek(f.uid);
      if (p && (p.seenClear || 0) >= no) continue;
      this.grantReserve(f, p, 1, xp);
      if (p) p.seenClear = no;
      cnt++;
    }
    return { players: cnt, xp };
  }
  grantReserve(f, p, items, xp) {
    const sp = f.sp || p?.cur || 'shiba';
    if (!p) return;
    const d = petData(p, sp);
    if (xp > 0) this.save.addXp(d, xp);
    f.level = d.lv;
    for (let i = 0; i < items; i++) grantProfileItem(this, p, sp, makeItem(this.random, SLOT_IDS[Math.floor(this.random() * SLOT_IDS.length)], 0));
  }
  catchUp(f, p) {
    const no = this.clearNo();
    const missed = Math.min(RESERVE.catchupMax, Math.max(0, no - (p.seenClear ?? no)));
    p.seenClear = no;
    if (!missed) return null;
    const ch = chapterOf(this.stageN);
    const xp = Math.round(RESERVE.baseXp(ch) * RESERVE.xpRate) * missed;
    const d = petData(p, f.sp), before = d.lv;
    this.grantReserve(f, p, Math.min(missed, 20), xp);
    f.level = d.lv; refreshStats(f);
    const res = { uid: f.uid, name: f.name, stages: missed, xp, items: Math.min(missed, 20), levels: d.lv - before };
    this.emit('catchup', res);
    return res;
  }
  liveXp() {
    for (const f of this.humans()) {
      const raw = Math.floor(f.merit) - (f.xpCounted || 0);
      if (raw <= 0) continue;
      f.xpCounted = Math.floor(f.merit);
      this.grantXp(f, Math.round(raw * xpMul(this, f)), null, true);
    }
  }
  // 经验给当前萌宠；跨过10级、30级时长大换形态
  grantXp(f, xp, label = null, quiet = false) {
    const before = f.level || 1;
    let ups;
    if (f.test || !this.save) {
      const m = (f.mem ||= {})[f.sp] ||= { lv: f.level || 1, xp: 0 };
      m.xp = (m.xp || 0) + xp; ups = 0;
      while (m.xp >= LEVEL.need(m.lv)) { m.xp -= LEVEL.need(m.lv); m.lv++; ups++; }
      f.level = m.lv;
    } else {
      const d = petData(this.save.get(f.uid), f.sp);
      ups = this.save.addXp(d, xp);
      f.level = d.lv;
    }
    if (label && !quiet) this.emit('toast', { uid: f.uid, text: `${f.name} ${label} +${xp}` });
    if (ups) {
      refreshStats(f);
      this.emit('levelup', { uid: f.uid, name: f.name, level: f.level, x: f.x, y: f.y });
      const f0 = formOf(before), f1 = formOf(f.level);
      if (f1 > f0) this.emit('evolve', { uid: f.uid, name: f.name, nick: f.nick, sp: f.sp, form: f1, formName: FORMS[f1].name, x: f.x, y: f.y });
    }
    return ups;
  }
  syncAuto(f) { const p = profileOf(this, f); if (p) { p.auto = Math.max(0, Math.round(f.auto || 0)); this.save.dirty = true; } }

  // 人少时补位NPC（流浪萌宠）
  syncNpcs() {
    const min = Math.max(0, Math.min(30, this.settings.npcMin | 0));
    const want = Math.max(0, min - this.activeHumans());
    const npcs = [...this.pets.values()].filter(f => f.npc && !f.merc);
    for (let i = npcs.length; i < want; i++) {
      const uid = `npc:${++this.npcSeq}`;
      const f = { uid, npc: true, name: NPC_NAMES[this.npcSeq % NPC_NAMES.length], nick: '', avatar: '', level: 1 + Math.floor(this.random() * 10), sp: pickSpecies(this), homeX: this.freeLane(), gear: {}, talent: 0, merit: 0, lastActive: this.now() };
      setupPet(this, f, { keepCd: false });
      this.pets.set(uid, f);
    }
    for (let i = want; i < npcs.length; i++) this.pets.delete(npcs[i].uid);
  }

  // ───────── 弹幕 / 点赞 / 礼物 ─────────
  chat(user, text) {
    this.stats.chats++;
    const pre = parseCommand(text);
    const early = pre && ['wish', 'name', 'comfort', 'unlock', 'plant', 'farmAll'].includes(pre.type);
    const sk = early ? null : parseSkill(text);
    if (sk) { const f = this.join(user); if (!f) return false; f.lastActive = this.now(); if (sk === 'ult' && this.phase === 'battle') requestUlt(this, f); return true; }
    const sp = early ? null : parseSpecies(text);
    if (sp) { const f = this.join(user, sp); return !!f; }
    const cmd = pre;
    if (!cmd) return false;
    const f = this.join(user);
    if (!f) return false;
    f.labelUntil = this.clock + 2.5;
    switch (cmd.type) {
      case 'ring': if (chooseRing(this, f, cmd.ring)) this.emit('ringpick', { uid: f.uid, ring: cmd.ring }); break;
      case 'umbrella': interceptZone(this, f); break;
      case 'dodge': if (this.phase === 'battle') requestDodge(this, f); break;
      case 'pat': if (comforting(this)) hugBoss(this, f); else this.pat(f); break;
      case 'comfort': if (comforting(this)) hugBoss(this, f); else if (this.stage?.sub === 'ceremony' || (this.phase === 'result' && this.result?.kind === 'boss')) f.happyT = 1.3; else if (cmd.hug) hugFriend(this, f); else this.pat(f); break;
      case 'hugf': if (comforting(this)) hugBoss(this, f); else hugFriend(this, f); break;
      case 'wish': makeWish(this, f, cmd.text); break;
      case 'friends': this.friendToast(f); break;
      case 'farmAll': farmAll(this, f); break;
      case 'plant': plant(this, f, cmd.crop); break;
      case 'water': water(this, f); break;
      case 'harvest': harvest(this, f); break;
      case 'sell': sell(this, f); break;
      case 'expand': expand(this, f); break;
      case 'unlock': unlockPet(this, f, cmd.sp); break;
      case 'farm': this.emit('farmCard', { uid: f.uid }); break;
      case 'sprites': this.spriteToast(f); break;
      case 'name': this.rename(f, cmd.nick); break;
      case 'card': this.emit('card', { uid: f.uid }); break;
      case 'gear': this.emit('card', { uid: f.uid, gear: true }); break;
      case 'checkin': dailyCheckin(this, f); break;
      case 'rank': { const R = this.rankings(true), i = R.list.findIndex(p => p.uid === f.uid), p = R.list[i];
        if (p) this.emit('toast', { uid: f.uid, text: `${f.name}：萌宠战力榜第 ${i + 1} / ${R.list.length} · 战力 ${p.cp}${i > 0 ? ` · 离上一名差 ${R.list[i - 1].score - p.score}` : ' · 第一名！'}` }); break; }
      default: break;
    }
    return true;
  }
  like(user, count) {
    const n = Math.max(0, Math.min(10000, Math.floor(Number(count) || 0)));
    if (!n || !user?.id) return;
    this.stats.likes += n;
    const f = this.pets.get(String(user.id)) || this.join(user);
    if (!f) return;
    f.lastActive = this.now();
    moraleLike(this, f, n);
    if (this.phase !== 'battle') return;
    likeShield(this, f, n);   // 全屏大招蓄力中：点赞撑护罩
    if (comforting(this)) { f.likeHug = (f.likeHug || 0) + Math.min(n, 40); while (f.likeHug >= COMFORT.likes) { f.likeHug -= COMFORT.likes; hugBoss(this, f, { free: true }); } }
  }
  gift(user, gift) {
    const amount = Math.max(0, Math.min(10000, Math.floor(Number(gift.count) || 0)));
    if (!amount || !user?.id) return null;
    const f = this.join(user, null, { force: true });
    if (!f) return null;
    f.lastActive = this.now();
    this.stats.gifts++;
    const price = Number(gift.price);
    const value = (Number.isFinite(price) && price > 0 ? price : 1) * amount;
    f.giftRound = (f.giftRound || 0) + value;
    { const p = profileOf(this, f); if (p) { p.coins = (p.coins || 0) + value; p.weekCoins = (p.weekCoins || 0) + value; this.save.dirty = true; } else f.coins = (f.coins || 0) + value; }
    const gb = this.giftBoard ||= new Map(), gname = gift.name || '礼物';
    const row = gb.get(f.uid) || { uid: f.uid, coins: 0, gifts: {}, t: this.clock };
    Object.assign(row, { name: f.name, nick: f.nick, avatar: f.avatar || '', sp: f.sp, level: f.level });
    row.coins += value; row.gifts[gname] = (row.gifts[gname] || 0) + amount; row.t = this.clock;
    gb.set(f.uid, row);
    if (this.phase === 'result') f.meritNext = (f.meritNext || 0) + value * SCORE.perCoin * growthE(f);
    else score(this, f, value * SCORE.perCoin);
    const had = (f.auto || 0) > 0;
    f.auto = (f.auto || 0) + value * GIFTS.autoPerValue;
    this.syncAuto(f);
    this.emit('toast', { uid: f.uid, text: `${f.name} ${had ? '自动守护延长到' : '开启自动守护！'} ${fmtDuration(f.auto)}（自动闪、自动躲雨、自动撑伞、自动放大招）` });
    const kind = giftKind(gift, this.settings.giftByName);
    this.emit('gift', { uid: f.uid, name: f.name, gift: gift.name || '礼物', count: amount, kind });
    giftFarm(this, f, value);   // 送礼也给农场金币；在家送还会施肥
    if (this.phase !== 'battle') {
      this.pendingGifts.push({ uid: f.uid, kind, amount });
      if (this.pendingGifts.length > 500) this.pendingGifts.shift();
      this.emit('toast', { uid: f.uid, text: `${f.name} 的${gift.name || '礼物'}已记下，开打后生效` });
      return kind;
    }
    applyGift(this, f, kind, amount);
    return kind;
  }

  // ───────── 净化 / 打盹 ─────────
  purify(e, by) {
    if (!e.alive || e.purified) return;
    // 首领打空不消失：委屈大哭，等大家抱抱
    if (e.boss && !e.comforted && this.phase === 'battle' && this.stage?.sub === 'boss') { if (by) by.kills = (by.kills || 0) + 1; startComfort(this, e); return; }
    // 大泪泪泡：先哭成两个小的
    if (FOES[e.unit]?.split && !e.small && e.role === 'minion') {
      e.alive = false; e.purified = 0.001; e.split = true;
      this.emit('split', { id: e.id, x: e.x, y: e.y });
      for (const dx of [-22, 22]) { const m = this.spawnSmall(e, dx); if (m) m.enter = null; }
      return;
    }
    e.alive = false; e.purified = 0.001; e.act = null;
    if (by) by.kills = (by.kills || 0) + 1;
    if (this.stage) this.stage.purified++;
    this.emit('purify', { id: e.id, x: e.x, y: e.y, role: e.role, unit: e.unit, boss: e.boss, by: by?.uid });
    if (e.kind === 'thief') {
      const o = by?.merc ? this.pets.get(by.owner) : by;
      if (o) score(this, o, SCORE.thief);
      if (e.carry) {
        if (e.wish) { returnWish(this, e.wish, by); if (o) score(this, o, SCORE.wishBack); e.wish = null; }
        healTree(this, e.carry); this.emit('fruitReturn', { x: e.x, y: e.y });
      }
    }
    if (e.role === 'treasure') goldPurified(this, e);
    else { smallPurify(this, e, by); maybeTame(this, e, by); }
    if (e.boss) { this.emit('bossDown', { name: e.name, unit: e.unit }); this.emit('shake', { k: 12 }); }
  }
  spawnSmall(e, dx) {
    const m = this._spawn(e.unit, e.x + dx, e.y, { small: true });
    return m;
  }
  nap(f) {
    if (!f.alive) return;
    f.alive = false; f.napT = PET.nap; f.act = null; f.shieldHp = 0;
    this.emit('nap', { uid: f.uid, x: f.x, y: f.y });
  }

  // ───────── 好朋友 / 小精灵 / 抱抱首领（wish.js、friends.js 回调） ─────────
  addFriendship(a, b, pts, reason) { return addFriendship(this, a, b, pts, reason); }
  addBondTo(f, n) { addBond(this, f, n); }
  tame(f, unit, role) { return tame(this, f, unit, role); }
  // 安慰评价 S：安慰最多的那个人多拿一件装扮
  comfortBonus(grade, uids) {
    const n = COMFORT.bonus[grade] || 0, ch = this.stage?.ch || 1;
    if (!n) return;
    for (const uid of uids.slice(0, 1)) {
      const f = this.pets.get(uid);
      if (!f || f.npc) continue;
      for (let i = 0; i < n; i++) giveItem(this, f, rollItem(this.random, ch, 1), { source: 'comfort' });
    }
  }
  friendToast(f) {
    const M = friendsOf(this, f.uid), list = Object.entries(M).sort((a, b) => b[1].v - a[1].v).slice(0, 3);
    if (!list.length) { this.emit('toast', { uid: f.uid, text: `${f.name}：还没有好朋友，发「贴贴」去抱抱别人家的萌宠吧` }); return; }
    this.emit('toast', { uid: f.uid, text: `${f.name} 的朋友：` + list.map(([, r]) => `${r.n}（${friendLevel(r.v) ? FRIEND.names[friendLevel(r.v) - 1] : '认识'} ${r.v}）`).join('、') });
  }
  spriteToast(f) {
    const p = this.save && !f.test ? this.save.peek(f.uid) : null, map = p ? p.sprites || {} : f.memSprites || {};
    const kinds = SPRITE_UNITS.filter(u => map[u] > 0);
    this.emit('toast', { uid: f.uid, text: kinds.length ? `${f.name} 的小精灵图鉴 ${kinds.length}/${SPRITE_UNITS.length}：${kinds.map(u => FOES[u].name).join('、')} · 跟着的：${FOES[f.follow]?.name || '无'}（${SPRITES.text[f.follow] || ''}）` : `${f.name}：还没有小精灵，净化坏心情有机会收服` });
  }

  emit(type, data = {}) {
    this.events.push({ type, at: this.clock, ...data });
    if (this.events.length > 600) this.events.splice(0, this.events.length - 600);
  }
  drainEvents() { const e = this.events; this.events = []; return e; }
}
import { spawnFoe } from './foes.js';
Game.prototype._spawn = function (unit, x, y, o) { return spawnFoe(this, unit, x, y, o); };

export function fmtDuration(sec) {
  const t = Math.max(0, Math.ceil(sec)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}
export { talentText };
