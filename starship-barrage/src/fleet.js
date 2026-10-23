// 讨伐模式 · 我方战舰：三种战舰、技能、手动/自动躲避、贡献值、装备
import { W, H, PVE, CLASSES, GEAR, LEVEL } from './config.js';

export const LANES = ['L', 'M', 'R'];
export const LANE_NAMES = { L: '左', M: '中', R: '右' };
export function laneOf(x) { return x < PVE.lanes.M[0] ? 'L' : x < PVE.lanes.R[0] ? 'M' : 'R'; }
export function laneCenter(l) { const [a, b] = PVE.lanes[l]; return (a + b) / 2; }

// 手动技能：「技能」放小技能、「大招」放大招；也认各职业的技能名
export function parseSkill(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s || s.length > 20) return null;
  if (/大招|dz/.test(s)) return 'ult';
  if (/技能|jn/.test(s)) return 'skill';
  for (const c of Object.values(CLASSES)) {
    if (c.ultWords.some(w => s.includes(w)) || s.includes(c.ult)) return 'ult';
    if (c.skillWords.some(w => s.includes(w)) || s.includes(c.skill)) return 'skill';
  }
  return null;
}

export function parseClass(text) {
  const s = String(text || '').trim().toLowerCase();
  if (/^(医疗|治疗|奶|奶妈|医疗舰|换医疗|选医疗|当医疗)/.test(s)) return 'healer';
  if (/^(机甲|坦克|肉|坦|重装|前排|换机甲|选机甲|当机甲)/.test(s)) return 'tank';
  if (/^(输出|dps|打手|输出舰|换输出|选输出|当输出)/.test(s)) return 'dps';
  return null;
}

// ───────── 装备 ─────────
export function gearScore(item) {
  if (!item) return 0;
  const tier = GEAR.tiers[item.tier] || GEAR.tiers[0];
  return tier.f * (item.roll || 1);
}
export function gearValue(slot, item) {
  if (!item) return 0;
  return GEAR.slots[slot].per * gearScore(item);
}
export function gearBonus(gear) {
  const b = { atk: 0, hp: 0, haste: 0, power: 0 };
  if (!gear) return b;
  for (const slot of Object.keys(GEAR.slots)) b[GEAR.slots[slot].stat] += gearValue(slot, gear[slot]);
  b.haste = Math.min(0.4, b.haste);
  return b;
}
export function rollItem(random, stage, bonusRolls = 0) {
  const slots = Object.keys(GEAR.slots);
  const slot = slots[Math.floor(random() * slots.length)];
  const lift = 1 + 0.15 * Math.max(0, stage - 1);
  let best = 0;
  for (let k = 0; k <= bonusRolls; k++) {
    const weights = GEAR.tiers.map((t, i) => t.w * lift ** i);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = random() * total, tier = 0;
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) { tier = i; break; } }
    best = Math.max(best, tier);
  }
  const roll = Math.round((0.85 + random() * 0.3) * 100) / 100;
  return { slot, tier: best, roll, name: GEAR.slots[slot].names[best] };
}
export function describeItem(item) {
  const s = GEAR.slots[item.slot];
  return `${GEAR.tiers[item.tier].name}·${item.name} ${s.label}+${Math.round(gearValue(item.slot, item) * 100)}%`;
}

// ───────── 属性 ─────────
export function shipStats(f) {
  const c = CLASSES[f.cls] || CLASSES.dps;
  const lv = 1 + 0.02 * Math.max(0, (f.level || 1) - 1);
  const g = gearBonus(f.gear);
  return {
    maxHp: Math.round(c.hp * lv * (1 + g.hp)),
    atk: c.atk * lv * (1 + g.atk),
    armor: c.armor,
    heal: (c.heal || 0) * lv * (1 + g.power),
    power: 1 + g.power,
    haste: g.haste,
  };
}

export function pickClass(game) {
  const ships = [...game.fighters.values()].filter(f => !f.alien && f.team === 'blue');
  const n = ships.length + 1;
  const healers = ships.filter(f => f.cls === 'healer').length, tanks = ships.filter(f => f.cls === 'tank').length;
  if (healers < Math.ceil(n / 5)) return 'healer';
  if (tanks < Math.ceil(n / 6)) return 'tank';
  return 'dps';
}

export function setupShip(game, f) {
  if (!f.cls) f.cls = f.prefCls || pickClass(game);
  f.stats = shipStats(f);
  f.maxHp = f.stats.maxHp; f.hp = f.maxHp;
  f.shieldHp = 0; f.taunt = 0; f.beamT = 0;
  f.skillCd = f.npc ? 1 + game.random() * 2 : 0; f.ultCd = f.npc ? 10 + game.random() * 20 : 0;
  f.skillReq = 0; f.ultReq = 0; f.charge = 0; f.fireCd = game.random() * 0.5;
  f.lane = f.lane && LANES.includes(f.lane) ? f.lane : LANES[Math.floor(game.random() * 3)];
  f.slotDx = (game.random() - 0.5) * 2 * PVE.wander.x; f.slotDy = (game.random() - 0.5) * 2 * PVE.wander.y; f.wanderT = game.random() * 3; f.wanderX = f.slotDx; f.wanderY = f.slotDy;
  f.x = laneCenter(f.lane) + f.slotDx; f.y = PVE.rows[f.cls] + f.slotDy;
  f.vx = 0; f.vy = 0; f.hitFlash = 0; f.ultReadyFor = 0; f.npcDodgeT = 0;
  f.alive = true; f.invuln = 1.5; f.respawn = 0;
}

export function refreshStats(f) {
  const ratio = f.maxHp ? f.hp / f.maxHp : 1;
  f.stats = shipStats(f);
  f.maxHp = f.stats.maxHp; f.hp = Math.max(1, Math.round(f.maxHp * ratio));
}

export function hasAutoDodge(game, f) { return f.npc ? false : (f.dodgeUntil || 0) > game.clock; }

// ───────── 每帧 ─────────
export function stepShip(game, f, dt, combat) {
  f.hitFlash = Math.max(0, (f.hitFlash || 0) - dt);
  f.invuln = Math.max(0, f.invuln - dt);
  f.taunt = Math.max(0, f.taunt - dt);
  if (f.power > 1 && game.clock > f.powerUntil) f.power = 1;
  if (f.drones && game.clock > f.dronesUntil) f.drones = 0;
  const auto = hasAutoDodge(game, f);
  // 躲红色区域：付费的自动躲；NPC 过几秒“反应过来”再躲；普通观众要自己发「左/中/右」
  if (combat && (auto || f.npc)) {
    const danger = laneDanger(game);
    if (danger[f.lane] > 0) {
      if (auto || (f.npcDodgeT += dt) > f.npcReact) {
        const safe = LANES.filter(l => !danger[l]).sort((a, b) => Math.abs(laneCenter(a) - f.x) - Math.abs(laneCenter(b) - f.x));
        if (safe.length) f.lane = safe[0];
        f.npcDodgeT = 0; f.npcReact = 2 + game.random() * 4;
      }
    } else f.npcDodgeT = 0;
    if (f.npcReact == null) f.npcReact = 2 + game.random() * 4;
  }
  // 目标位置：航道中心 + 自己的站位；站位在本航道内慢慢随机游走
  if ((f.wanderT = (f.wanderT || 0) - dt) <= 0) {
    f.wanderT = 2.5 + game.random() * 3;
    f.wanderX = (game.random() - 0.5) * 2 * PVE.wander.x;
    f.wanderY = (game.random() - 0.5) * 2 * PVE.wander.y;
  }
  const ws = PVE.wander.speed * dt;
  f.slotDx += Math.max(-ws, Math.min(ws, (f.wanderX ?? f.slotDx) - f.slotDx));
  f.slotDy += Math.max(-ws, Math.min(ws, (f.wanderY ?? f.slotDy) - f.slotDy));
  let tx = laneCenter(f.lane) + f.slotDx;
  let ty = PVE.rows[f.cls] + f.slotDy;
  const speed = LEVEL.speed(f.level) * 1.1;
  let vx = (tx - f.x) * 3, vy = (ty - f.y) * 3;
  if (combat && auto) {
    const [rx, ry] = game.threat(f, LEVEL.dodgeRadius(f.level) + 20);
    vx += rx * speed * 9; vy += ry * speed * 9;
  }
  const m = Math.hypot(vx, vy);
  if (m > speed) { vx = vx / m * speed; vy = vy / m * speed; }
  const k = Math.min(1, dt * 10);
  f.vx += (vx - f.vx) * k; f.vy += (vy - f.vy) * k;
  const [l0, l1] = PVE.lanes[f.lane];
  f.x = Math.max(20, Math.min(W - 20, f.x + f.vx * dt));
  if (!auto) f.x = Math.max(Math.min(f.x, l1 + 60), l0 - 60);
  f.y = Math.max(PVE.zone[0], Math.min(PVE.zone[1], f.y + f.vy * dt));
  if (!combat) return;
  // 技能：真人要自己发「技能」「大招」，NPC 自动放
  f.ultCd = Math.max(0, f.ultCd - dt);
  f.skillCd = Math.max(0, f.skillCd - dt);
  if (f.ultCd <= 0) f.ultReadyFor += dt; else f.ultReadyFor = 0;
  if (f.ultCd <= 0 && (f.npc ? wantsUlt(game, f) : f.ultReq > game.clock)) castUlt(game, f);
  if (f.skillCd <= 0 && (f.npc || f.skillReq > game.clock)) {
    if (castSkill(game, f)) { f.skillCd = CLASSES[f.cls].skillCd * (1 - f.stats.haste); f.skillReq = 0; }
    else if (f.npc) f.skillCd = 0.3;
  }
  // 点赞充满：超载炮
  if (f.charge >= 100) {
    f.charge = 0;
    game.addBullet(f.x, f.y - 18, 0, -900, 14, PVE.overloadAtk * f.stats.atk, 'blue', 'shot', f.uid, 8, { overload: true, pveScaled: true });
    game.emit('overload', { uid: f.uid, x: f.x, y: f.y, team: 'blue' });
  }
  // 普通攻击（医疗舰要等全员满血）
  if (f.cls === 'healer' && anyHurt(game)) return;
  f.fireCd -= dt;
  if (f.fireCd <= 0) {
    f.fireCd = CLASSES[f.cls].fireCd * (1 - f.stats.haste * 0.5);
    const dmg = f.stats.atk * (1 + 0.2 * (f.power - 1));
    if (f.cls === 'dps') {
      for (const off of f.power >= 3 ? [-7, 0, 7] : [-4, 4]) game.addBullet(f.x + off, f.y - 16, 0, -1050, 3.5, dmg / (f.power >= 3 ? 3 : 2) * 1.4, 'blue', 'shot', f.uid, 0, { pveScaled: true });
    } else {
      game.addBullet(f.x, f.y - 18, 0, -760, f.cls === 'tank' ? 7 : 5, dmg, 'blue', 'shot', f.uid, 0, { pveScaled: true, orb: f.cls === 'tank', heal: f.cls === 'healer' });
    }
  }
}

export function stepBeam(game, f, dt) {
  if (!f.beamT || !f.alive) return;
  f.beamT -= dt;
  const [l0, l1] = PVE.lanes[f.lane];
  const dps = 12 * f.stats.atk * f.stats.power;
  for (const e of [...game.fighters.values()]) {
    if (!e.alien || !e.alive || e.y > f.y || e.x < l0 || e.x > l1) continue;
    hurt(game, e, dps * dt, f.uid);
  }
  const boss = game.teams.red;
  if (boss.present) {
    if (Math.max(l0, boss.x - boss.hitW / 2) < Math.min(l1, boss.x + boss.hitW / 2)) game.damageFlag('red', dps * dt, f.uid, 'shot');
    for (const tu of boss.turrets) if (!tu.dead && tu.x > l0 && tu.x < l1) { tu.hp -= dps * dt * 0.5; if (tu.hp <= 0) game.killTurret(boss, tu, f.uid); }
  }
}

function anyHurt(game) {
  for (const f of game.fighters.values()) if (!f.alien && f.team === 'blue' && (!f.alive || f.hp < f.maxHp - 0.5)) return true;
  return false;
}

export function laneDanger(game) {
  const d = { L: 0, M: 0, R: 0 };
  for (const z of game.zones) for (const l of z.lanes) d[l] = Math.max(d[l], z.warn <= 6 ? 2 : 1);
  return d;
}

function allies(game) { const a = []; for (const f of game.fighters.values()) if (!f.alien && f.team === 'blue') a.push(f); return a; }

function castSkill(game, f) {
  if (f.cls === 'healer') {
    const hurtList = allies(game).filter(a => a.alive && a.hp < a.maxHp - 0.5).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 2);
    if (!hurtList.length) return false;
    const targets = [];
    for (const a of hurtList) {
      const amt = heal(game, a, (22 + 0.15 * a.maxHp) * f.stats.heal * (1 + 0.15 * (f.power - 1)), f);
      targets.push({ uid: a.uid, x: a.x, y: a.y, amount: Math.round(amt) });
    }
    game.emit('heal', { uid: f.uid, x: f.x, y: f.y, targets });
    return true;
  }
  if (f.cls === 'tank') {
    f.shieldHp = Math.max(f.shieldHp, 0.25 * f.maxHp * f.stats.power);
    f.taunt = 4;
    game.emit('skill', { uid: f.uid, skill: 'shield', x: f.x, y: f.y });
    return true;
  }
  // 输出舰：集束导弹
  const n = 6;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 1.6;
    game.addBullet(f.x, f.y - 10, Math.cos(a) * 260, Math.sin(a) * 260, 5, 2.5 * f.stats.atk * f.stats.power, 'blue', 'shot', f.uid, 0, { pveScaled: true, missile: true, life: 4 });
  }
  game.emit('skill', { uid: f.uid, skill: 'missile', x: f.x, y: f.y });
  return true;
}

// 真人发「技能」「大招」：就绪立刻放；冷却快好（≤2秒）就排队，好了自动补放；否则提示剩余冷却
export function requestSkill(game, f, kind) {
  if (f.alien || !f.alive || !f.cls) return false;
  const cd = kind === 'ult' ? f.ultCd : f.skillCd;
  if (cd > 2) {
    if (game.clock - (f.cdTipAt || 0) > 1.5) { f.cdTipAt = game.clock; game.emit('cd', { uid: f.uid, kind, left: Math.ceil(cd) }); }
    return false;
  }
  const until = game.clock + cd + PVE.skillQueue;
  if (kind === 'ult') f.ultReq = until; else f.skillReq = until;
  return true;
}

function wantsUlt(game, f) {
  if (f.ultReadyFor > 15) return true;
  if (f.cls === 'healer') {
    const a = allies(game);
    const dead = a.filter(x => !x.alive).length, low = a.filter(x => x.alive && x.hp < x.maxHp * 0.5).length;
    return dead >= 2 || low >= Math.max(2, Math.ceil(a.length * 0.25));
  }
  if (f.cls === 'tank') return game.zones.some(z => z.lanes.includes(f.lane) && z.warn < 3) || f.hp < f.maxHp * 0.4;
  const boss = game.teams.red;
  const [l0, l1] = PVE.lanes[f.lane];
  if (boss.present && Math.max(l0, boss.x - boss.hitW / 2) < Math.min(l1, boss.x + boss.hitW / 2)) return true;
  let n = 0;
  for (const e of game.fighters.values()) if (e.alien && e.alive && e.x > l0 && e.x < l1) n++;
  return n >= 4;
}

export function castUlt(game, f) {
  if (f.ultCd > 0 || !f.alive) return false;
  f.ultCd = PVE.ultCooldown * (1 - f.stats.haste); f.ultReq = 0; f.ultReadyFor = 0;
  if (f.cls === 'healer') {
    let revived = 0;
    for (const a of allies(game)) {
      if (!a.alive) { a.alive = true; a.respawn = 0; a.hp = a.maxHp * 0.5; a.invuln = 2; a.x = laneCenter(a.lane) + a.slotDx; a.y = PVE.rows[a.cls] + a.slotDy; revived++; f.merit += a.maxHp * 0.5 * PVE.contrib.heal; }
      else heal(game, a, a.maxHp * 0.4 * f.stats.power, f);
    }
    game.emit('ult', { uid: f.uid, name: f.name, cls: f.cls, x: f.x, y: f.y, revived });
  } else if (f.cls === 'tank') {
    game.barriers.push({ lane: f.lane, y: f.y - 46, t: 6, max: 6, owner: f.uid });
    f.shieldHp = Math.max(f.shieldHp, 0.4 * f.maxHp * f.stats.power); f.taunt = 6;
    game.emit('ult', { uid: f.uid, name: f.name, cls: f.cls, x: f.x, y: f.y, lane: f.lane });
  } else {
    f.beamT = 2.5;
    game.emit('ult', { uid: f.uid, name: f.name, cls: f.cls, x: f.x, y: f.y, lane: f.lane });
  }
  return true;
}

export function heal(game, a, amount, from) {
  if (!a.alive) return 0;
  const before = a.hp;
  a.hp = Math.min(a.maxHp, a.hp + amount);
  const done = a.hp - before;
  if (from && done > 0) from.merit += done * PVE.contrib.heal;
  return done;
}

// 伤害结算（讨伐模式）：异形扣血记攻击贡献；我方战舰先扣护盾再扣血，挨打记承伤贡献
export function hurt(game, f, dmg, ownerUid) {
  if (!f.alive || f.invuln > 0 || !(dmg > 0)) return false;
  if (f.alien) {
    const done = Math.min(f.hp, dmg);
    f.hp -= dmg;
    const o = game.fighters.get(ownerUid);
    if (o && !o.alien) o.merit += done * PVE.contrib.dmg;
    if (f.hp <= 0) game.killFighter(f, o || null);
    return true;
  }
  let d = dmg * (1 - (f.stats?.armor || 0));
  const taken = Math.min(d, f.hp + (f.shieldHp || 0));
  if (f.shieldHp > 0) { const s = Math.min(f.shieldHp, d); f.shieldHp -= s; d -= s; }
  f.hp -= d;
  f.merit += taken * PVE.contrib.taken;
  f.hitFlash = 0.15;
  if (f.hp <= 0) { f.hp = 0; game.killFighter(f, null); }
  return true;
}

// 母舰被打爆后掉装备：贡献前三必掉，其余60%；第一名多抽一次取好的
export function rollDrops(game, stage) {
  const list = game.humans().filter(f => f.merit > 0).sort((a, b) => b.merit - a.merit);
  const drops = [];
  list.forEach((f, rank) => {
    if (rank >= 3 && game.random() >= 0.6) return;
    const item = rollItem(game.random, stage, rank === 0 ? 1 : 0);
    const gear = f.gear || (f.gear = {});
    const cur = gear[item.slot];
    const equipped = gearScore(item) > gearScore(cur);
    if (equipped) { gear[item.slot] = { tier: item.tier, roll: item.roll, name: item.name }; refreshStats(f); }
    else {
      const p = game.save?.peek(f.uid);
      if (p && !f.test) { p.shards = (p.shards || 0) + GEAR.tiers[item.tier].f * 10; game.save.dirty = true; }
    }
    drops.push({ uid: f.uid, name: f.name, item, equipped });
    game.emit('loot', { uid: f.uid, name: f.name, item, equipped, text: describeItem(item) });
  });
  return drops;
}
