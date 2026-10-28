// 星舰远征 · 讨伐新玩法：航线投票（一正一负）、阵型羁绊、首领弱点、全场口令、工程舰力场
import { PVE } from './config.js';
import { LANES, hurt, score, refreshStats } from './fleet.js';
import { castZone } from './pve.js';

const R = () => PVE.route;
const posDef = id => R().pos.find(p => p.id === id);
const negDef = id => R().neg.find(n => n.id === id);
export { posDef, negDef };

function shuffle(game, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(game.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const ships = game => { const a = []; for (const f of game.fighters.values()) if (!f.alien && f.team === 'blue') a.push(f); return a; };
const onField = game => game.humans().filter(f => f.team === 'blue' && !f.reserve);

// ───────── 航线 ─────────
export const posOn = (game, id) => game.route?.pos === id;
export const negOn = (game, id) => game.route?.neg === id;

// 每章开打时（这一章还没选航线）开始投票；投票期间照常打怪
export function startRouteVote(game) {
  const ch = game.pve?.lv;
  if (!ch || (game.route && game.route.ch === ch) || (game.vote && game.vote.ch === ch)) return null;
  game.route = null;
  const P = shuffle(game, R().pos).slice(0, 3), N = shuffle(game, R().neg).slice(0, 3);
  game.vote = { ch, t: R().voteSec, max: R().voteSec, options: P.map((p, i) => ({ pos: p.id, neg: N[i].id })), votes: new Map(), tally: [0, 0, 0] };
  game.emit('banner', { team: 'blue', text: `第${ch}章航线投票！发「A」「B」「C」选航线（${R().voteSec}秒）`, tier: 4 });
  game.emit('announce', { text: '航线投票开始，发A、B、C选择航线', voice: true });
  game.emit('routeVote', { ch });
  return game.vote;
}

// 弹幕投票：A / B / C（全角、小写、「选A」「航线B」都认）；投票期间可以改票
const VOTE_RE = /^(?:选|投|航线|路线)?\s*([abcａｂｃ])$/i;
export function routeVoteChat(game, user, text) {
  const v = game.vote;
  if (!v) return false;
  const s = String(text || '').trim();
  let idx = -1;
  const m = s.match(VOTE_RE);
  if (m) idx = 'abc'.indexOf(m[1].toLowerCase().replace('ａ', 'a').replace('ｂ', 'b').replace('ｃ', 'c'));
  else idx = v.options.findIndex(o => s === posDef(o.pos).name);
  if (idx < 0) return false;
  const f = game.join(user);
  if (!f || f.npc) return true;
  f.lastActive = game.now();
  const old = v.votes.get(f.uid);
  if (old === idx) return true;
  if (old != null) v.tally[old]--;
  v.votes.set(f.uid, idx); v.tally[idx]++;
  f.labelUntil = game.clock + 2;
  return true;
}

function finishVote(game) {
  const v = game.vote;
  const best = Math.max(...v.tally);
  const top = v.tally.map((n, i) => (n === best ? i : -1)).filter(i => i >= 0);
  const pick = top[Math.floor(game.random() * top.length)];
  const o = v.options[pick];
  game.vote = null;
  game.route = { ch: v.ch, pos: o.pos, neg: o.neg, pick, votes: v.tally[pick] };
  game.routeT = { rain: 3, storm: 6 };
  for (const f of ships(game)) applyRouteShip(game, f);
  const P = posDef(o.pos), N = negDef(o.neg);
  game.emit('banner', { team: 'blue', text: `航线${'ABC'[pick]}：▲${P.name}（${P.desc}） ▼${N.name}（${N.desc}）`, tier: 4 });
  game.emit('announce', { text: `选定航线${'ABC'[pick]}，${P.name}，${N.name}`, voice: true });
  game.emit('routePicked', { pick, pos: o.pos, neg: o.neg });
}

// 航线的生命加成：写到战舰上（刷新血量上限，按比例保留当前血量）
export function applyRouteShip(game, f) {
  const want = posOn(game, 'hp') ? 1.3 : 1;
  if ((f.hpMul || 1) !== want) { f.hpMul = want; if (f.stats) refreshStats(f); }
}
// 失败退回：这一章的航线作废，回来重新投
export function clearRoute(game) { game.route = null; game.vote = null; for (const f of ships(game)) applyRouteShip(game, f); }

export const routeXpMul = game => (posOn(game, 'xp') ? 1.5 : 1);
export const routeLootExtra = game => (posOn(game, 'loot') ? 0.5 : 0);
export const routeEnemyDmg = game => (negOn(game, 'fury') ? 1.3 : 1);
export const routeBossHp = game => (negOn(game, 'boss') ? 1.4 : 1);
export const routeAlienHp = game => (negOn(game, 'tough') ? 1.6 : 1);
export const routeSwarm = game => (negOn(game, 'swarm') ? 2 : 1);

// ───────── 阵型羁绊 ─────────
export function computeBonds(game) {
  const by = { L: new Set(), M: new Set(), R: new Set() };
  for (const f of ships(game)) if (f.alive && f.cls && by[f.lane]) by[f.lane].add(f.cls);
  const out = {};
  for (const l of LANES) {
    const has = by[l];
    out[l] = PVE.bonds.filter(b => (b.kinds ? has.size >= b.kinds : b.need.every(c => has.has(c)))).map(b => b.id);
  }
  // 新形成的羁绊提示一下（同一航道同一羁绊 20 秒内不重复提示）
  const prev = game.bonds || {};
  game.bondTipAt ||= {};
  for (const l of LANES) for (const id of out[l]) {
    if ((prev[l] || []).includes(id)) continue;
    const key = l + id;
    if (game.clock - (game.bondTipAt[key] || -99) < 20) continue;
    game.bondTipAt[key] = game.clock;
    const b = PVE.bonds.find(x => x.id === id);
    game.emit('bond', { lane: l, id, name: b.name, desc: b.desc });
  }
  game.bonds = out;
  return out;
}
export const bondsOf = (game, f) => (game.mode === 'pve' && f && !f.alien && game.bonds?.[f.lane]) || [];

// 一艘战舰身上的所有加成（航线 + 羁绊 + 口令），每次开火/挨打/放技能时现算
export function shipMods(game, f) {
  const b = bondsOf(game, f);
  let atk = 1, aspd = 0, crit = 0, skill = 1, ult = 1, taken = 1;
  if (posOn(game, 'atk')) atk *= 1.3;
  if (posOn(game, 'crit')) crit += 0.2;
  if (posOn(game, 'skill')) skill *= 0.7;
  if (posOn(game, 'ult')) ult *= 0.5;
  if ((game.lockUntil || 0) > game.clock) atk *= 1.4;
  if (b.length) {
    if (b.includes('iron')) taken *= 0.85;
    if (b.includes('fire')) aspd += 0.15;
    if (b.includes('assault')) crit += 0.08;
    if (b.includes('supply')) skill *= 0.85;
    if (b.includes('fort')) atk *= 1.1;
    if (b.includes('all')) atk *= 1.1;
  }
  if (game.fields?.length && inField(game, f.x, f.y)) taken *= 1 - PVE.engineer.fieldCut;
  return { atk, aspd, crit, skill, ult, taken };
}

// ───────── 工程舰：电磁力场 ─────────
export function inField(game, x, y) {
  for (const z of game.fields || []) if ((x - z.x) ** 2 + (y - z.y) ** 2 < z.r * z.r) return true;
  return false;
}
export function addField(game, f) {
  const E = PVE.engineer;
  (game.fields ||= []).push({ owner: f.uid, x: f.x, y: f.y - 20, r: E.fieldR, t: E.fieldTime, max: E.fieldTime });
}
export const fieldOwnerActive = (game, uid) => (game.fields || []).some(z => z.owner === uid);
function stepFields(game, dt) {
  const list = game.fields;
  if (!list?.length) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const z = list[i];
    z.t -= dt;
    const o = game.fighters.get(z.owner);
    if (o?.alive) { z.x += (o.x - z.x) * Math.min(1, dt * 6); z.y += (o.y - 20 - z.y) * Math.min(1, dt * 6); }
    if (z.t <= 0 || !o) { list.splice(i, 1); continue; }
    const r2 = z.r * z.r;
    for (const b of game.bullets) {
      if (b.team !== 'red' || b.emSlow || b.life <= 0) continue;
      if ((b.x - z.x) ** 2 + (b.y - z.y) ** 2 < r2) { b.vx *= PVE.engineer.fieldSlow; b.vy *= PVE.engineer.fieldSlow; b.emSlow = true; }
    }
  }
}

// ───────── 首领弱点 ─────────
function stepWeak(game, dt) {
  const boss = game.teams.red, W = PVE.weak;
  if (!boss?.present || game.pve?.sub !== 'boss') return;
  if (boss.stunT > 0) boss.stunT = Math.max(0, boss.stunT - dt);
  const wk = boss.weak;
  if (wk) {
    wk.t -= dt;
    if (wk.hp <= 0) {
      boss.weak = null; boss.stunT = W.stun; boss.weakNext = game.clock + W.stun + 8;
      game.emit('banner', { team: 'blue', text: `弱点被打破！${boss.bossName}瘫痪${W.stun}秒，受到伤害×${W.stunDmg}`, tier: 5 });
      game.emit('announce', { text: '弱点打破，首领瘫痪', voice: true });
      game.emit('weakBroken', { cls: wk.cls });
      for (const uid of wk.hitters) { const f = game.fighters.get(uid); if (f) score(game, f, PVE.score.ult); }
    } else if (wk.t <= 0) {
      boss.weak = null; boss.weakNext = game.clock + 8;
      boss.core = Math.min(boss.coreMax, boss.core + boss.coreMax * W.failHeal);
      game.emit('banner', { team: 'red', text: `弱点没打破，${boss.bossName}修复了装甲（回血${Math.round(W.failHeal * 100)}%）`, tier: 4 });
      game.emit('weakFailed', {});
    }
    return;
  }
  if (boss.stunT > 0 || game.clock < (boss.weakNext || 0)) return;   // 瘫痪中、或上一个弱点刚结束8秒内不出新的
  boss.weakDone ||= [];
  const pct = boss.core / boss.coreMax;
  const at = W.at.find(a => pct <= a && !boss.weakDone.includes(a));
  if (at == null) return;
  boss.weakDone.push(at);
  // 指定一种在场的战舰（真人优先），这种战舰越多弱点越厚
  const humanCls = [...new Set(onField(game).filter(f => f.alive && f.cls).map(f => f.cls))];
  const anyCls = [...new Set(ships(game).filter(f => f.alive && f.cls).map(f => f.cls))];
  const pool = humanCls.length ? humanCls : anyCls;
  if (!pool.length) return;
  const cls = pool[Math.floor(game.random() * pool.length)];
  const count = ships(game).filter(f => f.alive && f.cls === cls).length;
  const hp = boss.coreMax * W.hpPer * Math.max(1, Math.min(W.maxCount, count));
  boss.weak = { cls, hp, max: hp, t: W.sec, sec: W.sec, hitters: new Set(), dx: (game.random() - 0.5) * 120 };
  game.emit('banner', { team: 'red', text: `${boss.bossName}露出弱点！只有【${weakClassName(cls)}】能打破（${W.sec}秒）`, tier: 5 });
  game.emit('announce', { text: `首领露出弱点，${weakClassName(cls)}快打`, voice: true });
  game.emit('weak', { cls });
}
const CLS_NAMES = { dps: '输出舰', tank: '重装机甲', healer: '医疗舰', carrier: '蜂巢航母', engineer: '工程舰' };
export const weakClassName = cls => CLS_NAMES[cls] || cls;
// 打首领时调用：返回伤害倍率（瘫痪期间×2）；弱点期间指定战舰的伤害同时削弱点
export function weakHit(game, boss, dmg, ownerUid) {
  let mul = boss.stunT > 0 ? PVE.weak.stunDmg : 1;
  const wk = boss.weak;
  if (wk && ownerUid) {
    let o = game.fighters.get(ownerUid);
    if (o?.merc) o = null;   // 佣兵不算
    if (o && o.cls === wk.cls) { wk.hp -= dmg * PVE.weak.dmgMul; wk.hitters.add(o.uid); }
  }
  return mul;
}

// ───────── 全场口令 ─────────
function stepCallout(game, dt) {
  const C = PVE.callout;
  if (game.calloutT == null) game.calloutT = C.first;
  const c = game.callout;
  if (c) {
    c.t -= dt;
    if (c.got.size >= c.need) return fireCallout(game);
    if (c.t <= 0) { game.callout = null; game.emit('banner', { team: 'red', text: `口令「${c.words}」没凑够人（${c.got.size}/${c.need}），下次加油！`, tier: 2 }); }
    return;
  }
  if (game.pve?.sub === 'enter') return;
  game.calloutT -= dt;
  if (game.calloutT > 0) return;
  game.calloutT = C.every[0] + game.random() * (C.every[1] - C.every[0]);
  const n = onField(game).length;
  if (!n) return;
  const def = C.list[Math.floor(game.random() * C.list.length)];
  const need = Math.max(1, Math.min(C.maxNeed, Math.ceil(n * C.ratio)));
  game.callout = { id: def.id, words: def.words, desc: def.desc, t: C.sec, max: C.sec, need, got: new Set() };
  game.emit('banner', { team: 'blue', text: `紧急口令！${C.sec}秒内${need}人发「${def.words}」：${def.desc}`, tier: 4 });
  game.emit('announce', { text: `紧急口令，发${def.words}`, voice: true });
}
export function calloutChat(game, user, text) {
  const c = game.callout;
  if (!c) return false;
  const s = String(text || '').replace(/\s+/g, '');
  if (!s.includes(c.words)) return false;
  const f = game.join(user);
  if (!f || f.npc) return true;
  f.lastActive = game.now(); f.labelUntil = game.clock + 2;
  if (!c.got.has(f.uid)) { c.got.add(f.uid); score(game, f, PVE.score.dodge); }
  return true;
}
function fireCallout(game) {
  const c = game.callout;
  game.callout = null;
  const all = ships(game).filter(f => f.alive);
  switch (c.id) {
    case 'shield': for (const f of all) f.shieldHp = Math.min(f.maxHp * 0.5, (f.shieldHp || 0) + f.maxHp * 0.3); break;
    case 'salvo': {
      for (const e of [...game.fighters.values()]) if (e.alien && e.alive) hurt(game, e, (e.kind === 'elite' || e.kind === 'chest' ? 0.03 : 0.4) * e.maxHp, null);
      const boss = game.teams.red;
      if (boss.present) game.damageFlag('red', boss.coreMax * 0.03, null, 'shot', true);
      break;
    }
    case 'power': for (const f of all) { f.ultCd = 0; f.skillCd = 0; } break;
    case 'warp': for (const b of game.bullets) if (b.team === 'red') b.life = 0; for (const f of all) f.invuln = Math.max(f.invuln, 3); break;
    case 'lock': game.lockUntil = Math.max(game.lockUntil || 0, game.clock) + 15; break;
    default: break;
  }
  game.emit('banner', { team: 'blue', text: `口令「${c.words}」成功（${c.got.size}人）！${c.desc}`, tier: 5 });
  game.emit('calloutDone', { id: c.id, words: c.words, n: c.got.size });
}

// ───────── 航线效果（每帧）─────────
function stepRoute(game, dt) {
  const rt = game.route;
  if (!rt) return;
  const T = game.routeT ||= { rain: 3, storm: 6 };
  const R0 = R();
  if (rt.neg === 'rain' && (T.rain -= dt) <= 0) {
    T.rain = R0.rain.every;
    for (let i = 0; i < R0.rain.count; i++) {
      const x = 30 + (i + game.random()) * (660 / R0.rain.count), sp = R0.rain.speed[0] + game.random() * (R0.rain.speed[1] - R0.rain.speed[0]);
      game.addBullet(x, -20 - game.random() * 120, (game.random() - 0.5) * 40, sp, 7, 1, 'red', 'danmaku', null, 0, { copy: true, hue: 2, meteor: true, life: 8 });
    }
    game.emit('meteor', {});
  }
  if (rt.neg === 'storm' && (T.storm -= dt) <= 0) { T.storm = R0.stormEvery; castZone(game, 'strike', 1, '电磁风暴'); }
  const toxic = rt.neg === 'toxic', regen = rt.pos === 'regen';
  if (toxic || regen) for (const f of ships(game)) {
    if (!f.alive) continue;
    if (regen) f.hp = Math.min(f.maxHp, f.hp + f.maxHp * R0.regenPerSec * dt);
    if (toxic && !(f.invuln > 0)) { f.hp -= f.maxHp * R0.toxicPerSec * dt; if (f.hp <= 0) { f.hp = 0; game.killFighter(f, null); } }
  }
}

function stepBondEffects(game, dt) {
  for (const f of ships(game)) if (f.alive && bondsOf(game, f).includes('repair')) f.hp = Math.min(f.maxHp, f.hp + f.maxHp * 0.01 * dt);
}

// 每帧（讨伐开战时）
export function stepEvents(game, dt) {
  if (game.vote) { game.vote.t -= dt; const n = onField(game).length; if (game.vote.t <= 0 || (n > 0 && game.vote.votes.size >= n)) finishVote(game); }
  if ((game.bondT = (game.bondT || 0) - dt) <= 0) { game.bondT = 0.5; computeBonds(game); }
  stepRoute(game, dt);
  stepBondEffects(game, dt);
  stepFields(game, dt);
  stepWeak(game, dt);
  stepCallout(game, dt);
}

// 每关开打：清掉上一关的力场、口令；这一章没选航线就开始投票
export function eventsOnStageStart(game) {
  game.fields = [];
  if (game.callout) game.callout = null;
  game.bonds = null; game.bondT = 0;
  startRouteVote(game);
}
