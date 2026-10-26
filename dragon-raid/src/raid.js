// 屠龙战纪 · 新玩法（星舰弹幕战没有的部分）
//   屠龙巨弩：每条航道一台，这条道上的观众一起「装填」，满了射出屠龙鱼叉
//   巨龙升空：半血后会飞上天，普通攻击打不动，只有巨弩能把它射下来
//   破甲倒地：巨弩、盾击、旋风斩攒破甲，满了巨龙倒地8秒，受到伤害×2
//   神殿祝福：每章开打时三选一投票，整章生效
//   四象阵：一条道上凑齐四个职业，这条道攻防加成
//   屠龙勇者：章节巨龙被屠时，贡献第一的人戴上屠龙王冠
import { W, PVE, RAID, BLESSINGS } from './config.js';
import { LANES, LANE_NAMES, laneCenter, score } from './fleet.js';
import { castZone, chapterOf, stepOf, leaderMax } from './pve.js';

const B = () => RAID.ballista;

// ───────── 弹幕指令 ─────────
export function parseRaid(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s || s.length > 12) return null;
  if (/^(装填|上弦|装弹|填装|填弹|拉弦|巨弩|弩|zt)/.test(s)) return { type: 'load' };
  const m = s.match(/^(?:祝福|选|投)?\s*([abcａｂｃ])$/);
  if (m) return { type: 'vote', idx: 'aａ'.includes(m[1]) ? 0 : 'bｂ'.includes(m[1]) ? 1 : 2 };
  return null;
}

// ───────── 初始化 / 每帧 ─────────
export function initRaid(game) {
  game.ballistas = Object.fromEntries(LANES.map(l => [l, { lane: l, load: 0, need: B().baseNeed, cd: 0, passiveT: 0, flash: 0, who: new Map() }]));
  game.harpoons = [];
  game.formation = { L: false, M: false, R: false };
  game.formationT = 0;
  const sv = game.save?.data;
  game.blessing = sv?.blessing ? { ...sv.blessing } : null;
  game.blessVote = null;
  game.slayer = sv?.slayer ? { ...sv.slayer } : null;
}

export function stepRaid(game, dt) {
  if (!game.ballistas) initRaid(game);
  const battle = game.phase === 'battle';
  stepBlessVote(game, dt);
  if ((game.formationT -= dt) <= 0) { game.formationT = 0.5; updateFormation(game); }
  if (!battle || !game.pve) return;
  const boss = game.teams.red;
  // 巨弩：所需装填按这条道真人数；被动上弦；英灵附体的人自动装填
  const humans = { L: 0, M: 0, R: 0 };
  for (const f of game.fighters.values()) if (!f.npc && !f.alien && f.team === 'blue') humans[f.lane] = (humans[f.lane] || 0) + 1;
  for (const l of LANES) {
    const b = game.ballistas[l];
    b.need = B().baseNeed + B().perHuman * humans[l];
    b.cd = Math.max(0, b.cd - dt); b.flash = Math.max(0, b.flash - dt);
    b.passiveT += dt * (boss.air ? B().airPassiveMul : 1);
    while (b.passiveT >= B().passiveEvery) { b.passiveT -= B().passiveEvery; addLoad(game, b, 1, null); }
  }
  for (const f of game.fighters.values()) {
    if (f.npc || f.alien || !f.alive || !((f.dodgeLeft || 0) > 0)) continue;
    if ((f.autoLoadT = (f.autoLoadT || 0) - dt) <= 0) { f.autoLoadT = B().autoEvery; addLoad(game, game.ballistas[f.lane], 1, f); }
  }
  for (const l of LANES) { const b = game.ballistas[l]; if (b.load >= b.need && b.cd <= 0) fireBallista(game, b); }
  stepHarpoons(game, dt);
  stepBossStates(game, dt);
}

// ───────── 屠龙巨弩 ─────────
function addLoad(game, b, n, f) {
  if (!b || !(n > 0)) return;
  b.load = Math.min(b.need * 1.5, b.load + n);
  if (f && !f.npc) b.who.set(f.uid, (b.who.get(f.uid) || 0) + n);
}

// 观众发「装填」：装自己所在航道的巨弩；每人每1.5秒算一次
export function loadBallista(game, f, n = 1, source = 'chat') {
  if (!game.ballistas) initRaid(game);
  const b = game.ballistas[f.lane] || game.ballistas.M;
  if (source === 'chat') {
    if (game.clock - (f.loadT ?? -9) < B().loadGap) return false;
    f.loadT = game.clock;
    if (game.phase === 'battle') score(game, f, B().loadScore);
  }
  if (source === 'like') {
    if (game.clock - (f.likeLoadWinT || -9) >= 1) { f.likeLoadWinT = game.clock; f.likeLoadWin = 0; f.likeLoadAcc = f.likeLoadAcc || 0; }
    f.likeLoadAcc = (f.likeLoadAcc || 0) + n;
    let add = 0;
    while (f.likeLoadAcc >= B().likePer && (f.likeLoadWin || 0) < B().likeCapPerSec) { f.likeLoadAcc -= B().likePer; f.likeLoadWin = (f.likeLoadWin || 0) + 1; add++; }
    if (f.likeLoadAcc > B().likePer * 3) f.likeLoadAcc = B().likePer * 3;
    n = add;
    if (!n) return false;
  }
  addLoad(game, b, n, f);
  f.labelUntil = Math.max(f.labelUntil || 0, game.clock + 1.5);
  game.emit('load', { uid: f.uid, lane: b.lane, n, source });
  return true;
}

function targetFor(game, b) {
  const boss = game.teams.red, p = game.pve;
  if (boss.present && p?.sub === 'boss') return { kind: 'boss' };
  const leader = p?.leader && game.fighters.get(p.leader);
  if (leader && leader.alive && leader.y > 40) return { kind: 'alien', uid: leader.uid };
  let chest = null;
  for (const e of game.fighters.values()) if (e.alien && e.alive && e.kind === 'chest' && e.y > 40) { chest = e; break; }
  if (chest) return { kind: 'alien', uid: chest.uid };
  const [l0, l1] = PVE.lanes[b.lane];
  for (const e of game.fighters.values()) if (e.alien && e.alive && e.x > l0 - 20 && e.x < l1 + 20 && e.y > 30 && e.y < PVE.zone[1]) return { kind: 'lane' };
  return null;
}

function fireBallista(game, b) {
  const tg = targetFor(game, b);
  if (!tg) return false;
  const x = laneCenter(b.lane), y = B().y - 24;
  const who = [...b.who.entries()].sort((a, c) => c[1] - a[1]);
  const owner = who[0]?.[0] || null;
  for (const [uid] of who) { const f = game.fighters.get(uid); if (f) score(game, f, B().fireScore); }
  const h = { id: ++game.zoneSeq, lane: b.lane, x, y, x0: x, y0: y, kind: tg.kind, uid: tg.uid || null, owner, ownerName: owner ? game.fighters.get(owner)?.name || '' : '', hit: new Set(), t: 0, ang: 0 };
  game.harpoons.push(h);
  b.load = 0; b.cd = B().reload; b.flash = 0.5; b.who = new Map();
  const ownerTxt = h.ownerName ? `（${h.ownerName} 装填最多）` : '';
  game.emit('ballista', { lane: b.lane, x, y, kind: tg.kind, owner, name: h.ownerName });
  game.emit('banner', { team: 'blue', uid: owner, name: h.ownerName, text: `${LANE_NAMES[b.lane]}路屠龙巨弩发射！${tg.kind === 'boss' ? (game.teams.red.air ? '瞄准空中的巨龙' : '直取巨龙要害') : tg.kind === 'lane' ? '贯穿整条航道' : '重创头目'}${ownerTxt}`, tier: 3, icon: 'ballista' });
  return true;
}

function stepHarpoons(game, dt) {
  const boss = game.teams.red, sp = B().speed;
  for (let i = game.harpoons.length - 1; i >= 0; i--) {
    const h = game.harpoons[i];
    h.t += dt;
    let tx, ty;
    if (h.kind === 'boss') { if (!boss.present) { game.harpoons.splice(i, 1); continue; } tx = boss.x; ty = boss.y + boss.coreDy; }
    else if (h.kind === 'alien') { const e = game.fighters.get(h.uid); if (!e || !e.alive) { h.kind = 'lane'; continue; } tx = e.x; ty = e.y; }
    else { tx = h.x0; ty = -60; }
    const dx = tx - h.x, dy = ty - h.y, d = Math.hypot(dx, dy) || 1, step = sp * dt;
    h.ang = Math.atan2(dx, -dy);
    const ny = Math.min(h.y, h.y + dy / d * Math.min(d, step));
    if (h.kind === 'lane') sweepLane(game, h, ny);
    if (d <= step + 8) {
      if (h.kind === 'boss') harpoonBoss(game, h);
      else if (h.kind === 'alien') harpoonAlien(game, h);
      game.harpoons.splice(i, 1);
      continue;
    }
    h.x += dx / d * step; h.y = ny;
    if (h.y < -80 || h.t > 3) game.harpoons.splice(i, 1);
  }
}

function sweepLane(game, h, ny) {
  const lv = chapterOf(game.pve?.stage || 1), dmg = B().laneDmg * (1 + 0.15 * (lv - 1));
  for (const e of [...game.fighters.values()]) {
    if (!e.alien || !e.alive || h.hit.has(e.uid) || e.kind === 'elite' || e.kind === 'chest') continue;
    if (Math.abs(e.x - h.x) > 64 || e.y > h.y + 20 || e.y < ny - 20) continue;
    h.hit.add(e.uid);
    e.hp -= dmg;
    game.emit('spark', { x: e.x, y: e.y, team: 'blue', big: true });
    if (e.hp <= 0) game.killFighter(e, game.fighters.get(h.owner) || null);
  }
}

function harpoonBoss(game, h) {
  const boss = game.teams.red;
  const wasAir = !!boss.air;
  if (wasAir) {
    boss.air = null;
    game.emit('shotdown', { x: boss.x, y: boss.y, name: boss.bossName, by: h.ownerName });
    game.emit('banner', { team: 'blue', uid: h.owner, name: h.ownerName, text: `${LANE_NAMES[h.lane]}路巨弩把${boss.bossName}射下来了！`, tier: 5 });
    game.emit('announce', { text: `${boss.bossName}被击落`, voice: true });
  }
  game.damageFlag('red', boss.coreMax * B().bossDmg, h.owner, 'shot', true);
  game.emit('harpoonHit', { x: boss.x, y: boss.y + boss.coreDy, boss: true });
  // 把升空的巨龙射下来：直接摔倒在地（破甲清零、倒地8秒）
  if (wasAir && !(boss.downT > 0)) knockDown(game, boss);
  else addStagger(game, B().stagger, 'ballista');
}

function harpoonAlien(game, h) {
  const e = game.fighters.get(h.uid);
  if (!e || !e.alive) return;
  const max = e.kind === 'elite' ? leaderMax(game.pve?.stage || 1) : e.maxHp;
  e.hp -= max * B().leaderDmg;
  game.emit('harpoonHit', { x: e.x, y: e.y });
  if (e.hp <= 0) game.killFighter(e, game.fighters.get(h.owner) || null);
}

// ───────── 破甲 / 倒地 / 升空 ─────────
export function addStagger(game, amount, src = '') {
  const boss = game.teams?.red, p = game.pve;
  if (!boss || !boss.boss || !boss.present || p?.sub !== 'boss' || boss.downT > 0 || !(amount > 0)) return;
  boss.staggerMax ||= RAID.stagger.max;
  boss.stagger = (boss.stagger || 0) + amount;
  if (boss.stagger >= boss.staggerMax) knockDown(game, boss);
}

function knockDown(game, boss) {
  const S = RAID.stagger;
  boss.downT = S.downSec; boss.stagger = 0; boss.staggerMax = Math.round((boss.staggerMax || S.max) * S.grow);
  boss.air = null; boss.downs = (boss.downs || 0) + 1;
  // 倒地：巨龙的蓄力技能全部打断（酸液池这种已经落地的保留）
  game.zones = game.zones.filter(z => z.active);
  game.rays = []; game.gravity = null;
  game.emit('downed', { x: boss.x, y: boss.y, name: boss.bossName });
  game.emit('banner', { team: 'blue', text: `破甲！${boss.bossName}轰然倒地 ${S.downSec}秒，弱点暴露，伤害×${S.dmgMul}！`, tier: 5 });
  game.emit('announce', { text: `${boss.bossName}倒地了，全力输出`, voice: true });
}

export function bossDmgMul(game) {
  const boss = game.teams?.red;
  if (!boss || !boss.boss) return 1;
  let m = 1;
  if (boss.downT > 0) m *= RAID.stagger.dmgMul;
  else if (boss.air) m *= RAID.air.dmgMul;
  if (blessIs(game, 'slayer')) m *= 1.4;
  if (blessIs(game, 'greed')) m *= 0.8;
  return m;
}

// 由 pve.js 的BOSS循环调用：会飞的巨龙半血后定期升空
export function maybeTakeOff(game, boss, dt, rage) {
  const def = PVE.bosses.find(b => b.id === boss.bossId);
  if (!def?.flies || rage < 2 || boss.air || boss.downT > 0 || game.pve?.kind === 'elite') return;
  const A = RAID.air;
  boss.airCd = (boss.airCd ?? 6) - dt;
  if (boss.airCd > 0) return;
  boss.airCd = A.every[0] + game.random() * (A.every[1] - A.every[0]);
  boss.air = { t: A.sec, max: A.sec, rainT: 1.2 };
  game.zones = game.zones.filter(z => z.active || z.kind === 'rain');
  game.rays = [];
  game.emit('airborne', { x: boss.x, y: boss.y, name: boss.bossName });
  game.emit('banner', { team: 'red', text: `${boss.bossName}升空了！普通攻击打不动，快发「装填」用巨弩把它射下来！`, tier: 5 });
  game.emit('announce', { text: '巨龙升空，快装填巨弩', voice: true });
}

function stepBossStates(game, dt) {
  const boss = game.teams.red;
  if (!boss.boss) return;
  if (boss.downT > 0) {
    boss.downT -= dt;
    if (boss.downT <= 0) { boss.downT = 0; game.emit('banner', { team: 'red', text: `${boss.bossName}爬起来了！`, tier: 3 }); }
  }
  const a = boss.air;
  if (!a) return;
  a.t -= dt; a.rainT -= dt;
  if (a.rainT <= 0) { a.rainT = RAID.air.rainEvery; castZone(game, 'rain', 1, boss.bossName); }
  if (a.t <= 0) {
    boss.air = null;
    // 没被射下来：俯冲落地，对人最多的航道「龙爪撕裂」
    castZone(game, 'strike', 1, boss.bossName);
    game.emit('banner', { team: 'red', text: `${boss.bossName}俯冲落地！`, tier: 4 });
  }
}

// BOSS现在应该在的高度：倒地下沉、升空上浮
export function bossTargetY(boss) {
  return PVE.bossY + (boss.downT > 0 ? RAID.stagger.drop : 0) - (boss.air ? RAID.air.rise : 0);
}

// ───────── 神殿祝福 ─────────
export function blessIs(game, id) { return game?.blessing?.id === id; }

export function startBlessVote(game, stage) {
  if (!game.ballistas) initRaid(game);
  const ch = chapterOf(stage);
  if (stepOf(stage) !== 1 || game.blessing?.chapter === ch || game.blessVote?.chapter === ch) return false;
  const ids = Object.keys(BLESSINGS);
  const opts = [];
  while (opts.length < 3 && ids.length) opts.push(ids.splice(Math.floor(game.random() * ids.length), 1)[0]);
  game.blessing = null;
  if (game.save) { game.save.data.blessing = null; game.save.dirty = true; }
  game.blessVote = { chapter: ch, opts, votes: new Map(), t: RAID.bless.voteSec, max: RAID.bless.voteSec };
  game.emit('blessVote', { opts, chapter: ch });
  game.emit('banner', { team: 'blue', text: `第${ch}章 · 神殿祝福！发 A / B / C 投票（送礼的人一票算${RAID.bless.giftWeight}票）`, tier: 4 });
  game.emit('announce', { text: '神殿祝福投票，发A、B、C选择', voice: true });
  return true;
}

export function voteBless(game, f, idx) {
  const v = game.blessVote;
  if (!v || idx < 0 || idx > 2) return false;
  const w = (f.giftRound || 0) > 0 || (f.giftChapter || 0) === v.chapter ? RAID.bless.giftWeight : 1;
  v.votes.set(f.uid, { idx, w });
  f.labelUntil = Math.max(f.labelUntil || 0, game.clock + 2);
  game.emit('bvote', { uid: f.uid, name: f.name, idx, w });
  return true;
}

export function blessTally(v) {
  const n = [0, 0, 0];
  for (const { idx, w } of v.votes.values()) n[idx] += w;
  return n;
}

function stepBlessVote(game, dt) {
  const v = game.blessVote;
  if (!v || game.phase !== 'battle') return;
  v.t -= dt;
  if (v.t > 0) return;
  const n = blessTally(v), best = Math.max(...n);
  const top = [0, 1, 2].filter(i => n[i] === best);
  const pick = top[Math.floor(game.random() * top.length)];
  const id = v.opts[pick];
  game.blessing = { id, chapter: v.chapter };
  game.blessVote = null;
  if (game.save) { game.save.data.blessing = { ...game.blessing }; game.save.dirty = true; }
  const total = n.reduce((a, b) => a + b, 0);
  game.emit('blessed', { id, chapter: v.chapter, votes: n, random: total === 0 });
  game.emit('banner', { team: 'blue', text: `本章祝福：「${BLESSINGS[id].name}」${BLESSINGS[id].desc}${total ? `（${n[pick]}票）` : '（没人投票，神殿随机赐福）'}`, tier: 4, icon: 'bless:' + id });
  game.emit('announce', { text: `本章祝福，${BLESSINGS[id].name}`, voice: true });
}

// 章节结束（打赢章节BOSS或失败退章）祝福失效
export function endBlessing(game) {
  game.blessing = null; game.blessVote = null;
  if (game.save) { game.save.data.blessing = null; game.save.dirty = true; }
}

// ───────── 英雄身上的加成（祝福 + 四象阵） ─────────
export function heroAtkBonus(game, f) {
  let b = 0;
  if (blessIs(game, 'fire')) b += 0.25;
  if (game.formation?.[f.lane]) b += RAID.formation.atk;
  return b;
}
export function heroTakenMul(game, f) {
  let m = 1;
  if (blessIs(game, 'holy')) m *= 0.7;
  if (game.formation?.[f.lane]) m *= 1 - RAID.formation.def;
  return m;
}
export function aspdBonus(game) { return blessIs(game, 'wind') ? 0.35 : 0; }
export function hasteBonus(game) { return blessIs(game, 'sage') ? 0.3 : 0; }
export function critBonus(game) { return blessIs(game, 'fury') ? [0.15, 0.3] : [0, 0]; }
export function respawnSec(game) { return blessIs(game, 'undying') ? 4 : PVE.respawn; }
export function alienDmgMul(game, e) {
  let m = 1;
  if (blessIs(game, 'greed')) m *= 0.8;
  if (blessIs(game, 'slayer') && (e.kind === 'elite' || e.kind === 'chest')) m *= 1.4;
  return m;
}

// ───────── 四象阵 ─────────
function updateFormation(game) {
  const set = { L: new Set(), M: new Set(), R: new Set() };
  for (const f of game.fighters.values()) if (!f.alien && f.team === 'blue' && f.alive && f.cls && set[f.lane]) set[f.lane].add(f.cls);
  for (const l of LANES) {
    const on = set[l].size >= 4;
    if (on && !game.formation[l] && game.phase === 'battle') {
      game.emit('formation', { lane: l });
      game.emit('banner', { team: 'blue', text: `${LANE_NAMES[l]}路凑齐法师、骑士、牧师、游侠，四象阵亮起！攻击+${Math.round(RAID.formation.atk * 100)}%、受伤-${Math.round(RAID.formation.def * 100)}%`, tier: 3 });
    }
    game.formation[l] = on;
  }
  game.formationNeed = Object.fromEntries(LANES.map(l => [l, ['dps', 'tank', 'healer', 'carrier'].filter(c => !set[l].has(c))]));
}

// ───────── 屠龙勇者 ─────────
export function crownSlayer(game, stage, bossName) {
  const list = game.humans().filter(f => f.team === 'blue' && f.merit > 0).sort((a, b) => b.merit - a.merit);
  const top = list[0];
  if (!top) return null;
  const p = !top.test ? game.save?.get(top.uid) : null;
  if (p) p.slays = (p.slays || 0) + 1;
  top.slays = p ? p.slays : (top.slays || 0) + 1;
  game.slayer = { uid: top.uid, name: top.name, boss: bossName, at: game.now() };
  if (game.save) { game.save.data.slayer = { ...game.slayer }; game.save.dirty = true; }
  game.emit('slayer', { uid: top.uid, name: top.name, boss: bossName, slays: top.slays });
  game.emit('banner', { team: 'blue', uid: top.uid, name: top.name, text: `屠龙勇者！击败${bossName}贡献第一，戴上屠龙王冠（第${top.slays}次屠龙）`, tier: 5, icon: 'crown' });
  game.emit('announce', { text: `${top.name}成为屠龙勇者`, voice: true });
  return top;
}

export function slaysOf(game, f) {
  const p = !f.test && !f.npc ? game.save?.peek(f.uid) : null;
  return p ? p.slays || 0 : f.slays || 0;
}
