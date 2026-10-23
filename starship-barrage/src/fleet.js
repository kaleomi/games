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
  if (/^(航母|蜂巢|母巢|换航母|选航母|当航母)/.test(s)) return 'carrier';
  return null;
}

// ───────── 装备 ─────────
// 物品：{ slot, tier, roll, name, subs: [{ stat, v }] }；主属性值 = 主系数 × 品质倍率 × roll
export function itemMain(item) {
  const sl = GEAR.slots[item.slot], t = GEAR.tiers[item.tier] || GEAR.tiers[0];
  return { stat: sl.stat, v: GEAR.stats[sl.stat].main * t.f * (item.roll || 1) };
}
export function itemStats(item) {
  if (!item || !GEAR.slots[item.slot]) return [];
  return [itemMain(item), ...(item.subs || [])];
}
// 装备评分：每条属性按「同档主属性」折算成分数，用来决定是否自动穿上
export function gearScore(item) {
  if (!item || !GEAR.slots[item.slot]) return 0;
  let sc = 0;
  for (const { stat, v } of itemStats(item)) { const st = GEAR.stats[stat]; if (st) sc += v / (st.main || st.sub * 3); }
  return sc;
}
export function gearBonus(gear) {
  const b = Object.fromEntries(Object.keys(GEAR.stats).map(k => [k, 0]));
  if (!gear) return b;
  for (const slot of Object.keys(GEAR.slots)) if (gear[slot]) for (const { stat, v } of itemStats({ ...gear[slot], slot })) if (stat in b) b[stat] += v;
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
  const T = GEAR.tiers[best];
  const roll = Math.round((0.85 + random() * 0.3) * 100) / 100;
  // 副属性：不和主属性重复，彼此不重复
  const pool = Object.keys(GEAR.stats).filter(k => k !== GEAR.slots[slot].stat);
  const subs = [];
  for (let i = 0; i < T.subs && pool.length; i++) {
    const stat = pool.splice(Math.floor(random() * pool.length), 1)[0];
    subs.push({ stat, v: Math.round(GEAR.stats[stat].sub * T.f * (0.85 + random() * 0.3) * 1000) / 1000 });
  }
  return { slot, tier: best, roll, name: GEAR.slots[slot].names[best], subs };
}
const pct = v => `${Math.round(v * 1000) / 10}%`.replace('.0%', '%');
export function statText({ stat, v }) { return `${GEAR.stats[stat].label}+${pct(v)}`; }
export function describeItem(item) {
  return `${GEAR.tiers[item.tier].name}·${item.name} ${itemStats(item).map(statText).join(' ')}`;
}

// ───────── 属性 ─────────
export function shipStats(f) {
  const c = CLASSES[f.cls] || CLASSES.dps;
  const lv = 1 + 0.02 * Math.max(0, (f.level || 1) - 1);
  const g = gearBonus(f.gear), cap = GEAR.caps;
  return {
    maxHp: Math.round(c.hp * lv * (1 + g.hp)),
    atk: c.atk * lv * (1 + g.atk),
    armor: Math.min(cap.def, c.armor + g.def),
    heal: (c.heal || 0) * lv * (1 + g.power),
    power: 1 + g.power,
    haste: Math.min(cap.haste, g.haste),
    aspd: Math.min(cap.aspd, g.aspd),
    crit: Math.min(cap.crit, GEAR.baseCrit + g.crit),
    critDmg: GEAR.baseCritDmg + g.critDmg,
  };
}
// 暴击：返回 [伤害, 是否暴击]；持续伤害（光束、旋风）用期望值，免得数字乱跳
export function rollCrit(game, f, dmg) {
  const st = f.stats; if (!st) return [dmg, false];
  if (game.random() < st.crit) return [dmg * st.critDmg, true];
  return [dmg, false];
}
export function critAvg(f) { const st = f.stats; return st ? 1 + st.crit * (st.critDmg - 1) : 1; }
// 自动索敌：附近（260内）有异形先打异形；母舰在场就打母舰核心；否则打最近的异形
// 战力：等级 + 装备评分（和职业无关，方便横向比较）
export function combatPower(f) {
  let sc = 0;
  if (f.gear) for (const slot of Object.keys(GEAR.slots)) if (f.gear[slot]) sc += gearScore({ ...f.gear[slot], slot });
  return Math.round((f.level || 1) * 50 + sc * 120);
}
export function nearestEnemy(game, x, y, maxD = 1e9, near = 260) {
  let best = null, bd = maxD * maxD;
  for (const e of game.fighters.values()) {
    if (!e.alien || !e.alive || e.y < 20) continue;
    const d = (e.x - x) ** 2 + (e.y - y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  const boss = game.teams.red;
  if (boss.present && (!best || bd > near * near)) {
    const core = { x: boss.x, y: boss.y + boss.coreDy, core: true };
    if ((core.x - x) ** 2 + (core.y - y) ** 2 <= maxD * maxD) return core;
  }
  return best;
}

export function pickClass(game) {
  const ships = [...game.fighters.values()].filter(f => !f.alien && f.team === 'blue');
  const n = ships.length + 1;
  const healers = ships.filter(f => f.cls === 'healer').length, tanks = ships.filter(f => f.cls === 'tank').length;
  if (healers < Math.ceil(n / 5)) return 'healer';
  if (tanks < Math.ceil(n / 6)) return 'tank';
  if (ships.filter(f => f.cls === 'carrier').length < Math.floor(n / 6)) return 'carrier';
  return 'dps';
}

export function setupShip(game, f) {
  if (!f.cls) f.cls = f.prefCls || pickClass(game);
  f.stats = shipStats(f);
  f.maxHp = f.stats.maxHp; f.hp = f.maxHp;
  f.shieldHp = 0; f.taunt = 0; f.beamT = 0;
  f.skillCd = f.npc ? 1 + game.random() * 2 : 0; f.ultCd = f.npc ? 10 + game.random() * 20 : 0;
  f.skillReq = 0; f.ultReq = 0; f.charge = 0; f.fireCd = game.random() * 0.5;
  f.rushT = 0; f.returning = false; f.lungeT = 0; f.spin = 0; f.mel = null; f.meleeCd = 0; f.hotT = 0; f.recoilT = 0; f.beamCharge = 0;
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

export function hasAutoDodge(game, f) { return !f.npc && (f.dodgeLeft || 0) > 0; }
// 自动躲弹剩余时间写回账号存档（不设上限）
export function syncDodge(game, f) {
  const p = !f.test && !f.npc ? game.save?.peek(f.uid) : null;
  if (p) { p.dodgeLeft = Math.max(0, Math.round(f.dodgeLeft || 0)); game.save.dirty = true; }
}
export function fmtDuration(sec) {
  const t = Math.max(0, Math.ceil(sec)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

// ───────── 每帧 ─────────
export function stepShip(game, f, dt, combat) {
  f.hitFlash = Math.max(0, (f.hitFlash || 0) - dt);
  f.invuln = Math.max(0, f.invuln - dt);
  f.taunt = Math.max(0, f.taunt - dt);
  if (f.power > 1 && game.clock > f.powerUntil) f.power = 1;
  if (f.drones && game.clock > f.dronesUntil) f.drones = 0;
  if (combat && f.dodgeLeft > 0) {       // 只在讨伐开战时扣时间
    f.dodgeLeft = Math.max(0, f.dodgeLeft - dt);
    if ((f.dodgeSyncT = (f.dodgeSyncT || 0) - dt) <= 0 || f.dodgeLeft === 0) { f.dodgeSyncT = 5; syncDodge(game, f); }
  }
  const auto = hasAutoDodge(game, f);
  // 躲红色区域：付费的自动躲；NPC 过几秒“反应过来”再躲；普通观众要自己发「左/中/右」
  if (combat && (auto || f.npc)) {
    const danger = laneDanger(game);
    if (danger[f.lane] > 0) {
      if (auto || (f.npcDodgeT += dt) > f.npcReact) {
        const safe = LANES.filter(l => !danger[l]).sort((a, b) => Math.abs(laneCenter(a) - f.x) - Math.abs(laneCenter(b) - f.x));
        if (safe.length) f.lane = safe[0];
        else {   // 三条都有（晶刺依次爆发）：去最晚命中的那条
          const soon = l => Math.min(...game.zones.filter(z => z.lanes.includes(l)).map(z => z.active ? -1 : z.warn));
          const best = [...LANES].sort((a, b) => soon(b) - soon(a))[0];
          if (soon(f.lane) < 3.5 && soon(best) > soon(f.lane) + 1) f.lane = best;
        }
        f.npcDodgeT = 0; f.npcReact = 2 + game.random() * 4;
      }
    } else f.npcDodgeT = 0;
    if (f.npcReact == null) f.npcReact = 2 + game.random() * 4;
  }
  if (f.rushT > 0 && combat) stepRush(game, f, dt);
  else if (f.cls === 'tank' && combat && stepMelee(game, f, dt)) { /* 近战冲锋中 */ }
  else {
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
  if (game.gravity) { const gk = 0.55; tx += (game.gravity.x - tx) * gk; ty -= 60 * gk; }   // 深渊之眼引力漩涡：往中间、往上吸
  const speed = LEVEL.speed(f.level) * (f.returning ? 2.4 : 1.1);
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
  if (f.returning) {                     // 冲锋斩结束，飞回本航道
    f.y = Math.min(PVE.zone[1], f.y + f.vy * dt);
    if (f.y >= PVE.zone[0] && f.x > l0 - 60 && f.x < l1 + 60) f.returning = false;
  } else {
    if (!auto && !game.gravity) f.x = Math.max(Math.min(f.x, l1 + 60), l0 - 60);
    f.y = Math.max(PVE.zone[0], Math.min(PVE.zone[1], f.y + f.vy * dt));
  }
  }
  f.lungeT = Math.max(0, (f.lungeT || 0) - dt);
  f.muzzleT = Math.max(0, (f.muzzleT || 0) - dt);
  // 生命圣光：持续5秒群体回血
  if (f.hotT > 0 && combat) {
    f.hotT -= dt; f.hotTick = (f.hotTick || 0) - dt;
    const tick = f.hotTick <= 0;
    if (tick) f.hotTick = 1;
    let total = 0;
    for (const a of allies(game)) if (a.alive) total += heal(game, a, a.maxHp * PVE.healUlt.perSec * f.stats.power * dt, f);
    f.hotAcc = (f.hotAcc || 0) + total;
    if (tick) { game.emit('healPulse', { uid: f.uid, x: f.x, y: f.y, amount: Math.round(f.hotAcc), left: Math.max(0, f.hotT) }); f.hotAcc = 0; }
  }
  f.recoilT = Math.max(0, (f.recoilT || 0) - dt);
  if (!combat) return;
  // 小技能自动释放（冷却10秒）；大招真人要发「大招」，NPC 自动放
  f.ultCd = Math.max(0, f.ultCd - dt);
  f.skillCd = Math.max(0, f.skillCd - dt);
  if (f.ultCd <= 0) f.ultReadyFor += dt; else f.ultReadyFor = 0;
  if (f.ultCd <= 0 && (f.npc ? wantsUlt(game, f) : f.ultReq > game.clock)) castUlt(game, f);
  if (f.skillCd <= 0) {
    if (castSkill(game, f)) f.skillCd = CLASSES[f.cls].skillCd * (1 - f.stats.haste);
    else f.skillCd = 0.5;
  }
  // 点赞充满：超载炮
  if (f.charge >= 100) {
    f.charge = 0;
    const tg = nearestEnemy(game, f.x, f.y), oa = tg ? Math.atan2(tg.y - f.y, tg.x - f.x) : -Math.PI / 2;
    const [od, crit] = rollCrit(game, f, PVE.overloadAtk * f.stats.atk);
    game.addBullet(f.x, f.y - 18, Math.cos(oa) * 900, Math.sin(oa) * 900, 14, od, 'blue', 'shot', f.uid, 8, { overload: true, pveScaled: true, crit });
    game.emit('overload', { uid: f.uid, x: f.x, y: f.y, team: 'blue' });
  }
  // 普通攻击：所有职业都自动索敌开火，射速吃「攻速」；机甲附近有怪时改成冲上去近战
  f.fireCd -= dt;
  if (f.cls === 'tank' && (f.mel || meleeTarget(game, f))) return;
  if (f.fireCd <= 0) {
    f.fireCd = CLASSES[f.cls].fireCd / (1 + f.stats.aspd);
    const tgt = nearestEnemy(game, f.x, f.y);
    const ang = tgt ? Math.atan2(tgt.y - (f.y - 16), tgt.x - f.x) : -Math.PI / 2;
    f.aimAngle = ang + Math.PI / 2;
    const base = f.stats.atk * (1 + 0.2 * (f.power - 1));
    // 主炮品质 → 炮管数、子弹外观、穿透
    const wt = f.gear?.weapon ? f.gear.weapon.tier : -1;
    const barrels = wt >= 0 ? GEAR.barrels[wt] : 1;
    const pods = barrelOffsets(f.cls, barrels);
    const twin = f.cls === 'dps';
    const total = base * (twin ? 1.4 : 1) * GEAR.barrelMult[barrels];
    const per = total / (pods.length * (twin ? 2 : 1));
    const speed = { dps: 1050, tank: 760, healer: 780, carrier: 860 }[f.cls] || 860;
    const r = { dps: 3.5, tank: 6.5, healer: 5, carrier: 4.5 }[f.cls] || 4;
    const pierce = wt >= 0 ? GEAR.pierce[wt] : 0;
    for (const [ox, oy] of pods) {
      for (const tw of twin ? [-3.5, 3.5] : [0]) {
        const sx = f.x + ox + tw, sy = f.y + oy;
        const a = tgt ? Math.atan2(tgt.y - sy, tgt.x - sx) : -Math.PI / 2;
        const [d, crit] = rollCrit(game, f, per);
        game.addBullet(sx + Math.cos(a) * 10, sy + Math.sin(a) * 10, Math.cos(a) * speed, Math.sin(a) * speed, crit ? r * 1.4 : r, d, 'blue', 'shot', f.uid, pierce,
          { pveScaled: true, crit, wt: Math.max(0, wt), orb: f.cls === 'tank', heal: f.cls === 'healer' });
      }
    }
    if (barrels >= 2) f.muzzleT = 0.12;
  }
}

// 炮管位置（相对战舰中心）：1管在机头，2管在两侧炮舱，3管＝机头+两侧
export const POD = { dps: [17, 2, -22], tank: [21, -12, -24], healer: [21, -4, -26], carrier: [25, -10, -32] };
export function barrelOffsets(cls, n) {
  const [px, py, ny] = POD[cls] || POD.dps;
  if (n <= 1) return [[0, ny]];
  if (n === 2) return [[-px, py], [px, py]];
  return [[-px, py], [0, ny], [px, py]];
}

// 歼灭光束：自动瞄准——锁定最近的异形（打完一只自动转向下一只），没有异形就锁母舰触手炮/核心；光束会扫过路径上所有敌人
function beamTarget(game, f) {
  let best = null, bd = 1e12;
  for (const e of game.fighters.values()) {
    if (!e.alien || !e.alive || e.y > f.y - 30 || e.y < 30) continue;
    const d = (e.x - f.x) ** 2 + (e.y - f.y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  if (best) return { x: best.x, y: best.y };
  const boss = game.teams.red;
  if (!boss.present) return null;
  const pods = (boss.turrets || []).filter(t => !t.dead);
  if (pods.length && Math.abs(boss.x - f.x) > boss.hitW / 2 + 40) return pods.reduce((a, b) => (Math.abs(a.x - f.x) < Math.abs(b.x - f.x) ? a : b));
  return { x: boss.x, y: boss.y + boss.coreDy };
}
const BEAM_W = 26;
export function beamHits(f, x, y, r = 0) {
  const a = f.beamAngle || 0, dx = Math.sin(a), dy = -Math.cos(a);
  const px = x - f.x, py = y - (f.y - 20);
  const along = px * dx + py * dy;
  if (along < 0) return false;
  return Math.abs(px * dy - py * dx) < BEAM_W + r;
}
export function stepBeam(game, f, dt) {
  if (!f.beamT || !f.alive) return;
  // 蓄能期间和发射期间都持续转向目标
  if ((f.beamRetarget = (f.beamRetarget || 0) - dt) <= 0) { f.beamRetarget = 0.25; f.beamTgt = beamTarget(game, f); }
  if (f.beamTgt) {
    const want = Math.max(-1.25, Math.min(1.25, Math.atan2(f.beamTgt.x - f.x, (f.y - 20) - f.beamTgt.y)));
    const da = want - (f.beamAngle || 0);
    f.beamAngle = (f.beamAngle || 0) + Math.max(-2.6 * dt, Math.min(2.6 * dt, da));
  }
  if (f.beamCharge > 0) { f.beamCharge -= dt; return; }   // 先蓄能，再发射
  f.beamT -= dt;
  if (f.beamT <= 0) { f.beamT = 0; f.beamAngle = 0; f.beamTgt = null; }
  const dps = 12 * f.stats.atk * f.stats.power * critAvg(f);
  for (const e of [...game.fighters.values()]) {
    if (!e.alien || !e.alive || !beamHits(f, e.x, e.y, e.r || 10)) continue;
    hurt(game, e, dps * dt, f.uid);
  }
  const boss = game.teams.red;
  if (boss.present) {
    const cy = boss.y + boss.coreDy;
    // 光束在核心高度的横坐标落在核心宽度内就算命中
    const a = f.beamAngle || 0, t = ((f.y - 20) - cy) / Math.max(0.2, Math.cos(a)), bx = f.x + Math.sin(a) * t;
    if (Math.abs(bx - boss.x) < boss.hitW / 2) game.damageFlag('red', dps * dt, f.uid, 'shot');
    for (const tu of boss.turrets) if (!tu.dead && beamHits(f, tu.x, tu.y, 22)) { tu.hp -= dps * dt * 0.5; f.merit += dps * dt * 0.5 * PVE.contrib.dmg; if (tu.hp <= 0) game.killTurret(boss, tu, f.uid); }
  }
}

// ───────── 重装机甲 ─────────
// 普攻近战：300 内有异形就冲过去砍一刀（扇形范围伤害），砍完退回本航道
function meleeTarget(game, f) {
  const R = PVE.melee.range;
  let best = null, bd = R * R;
  for (const e of game.fighters.values()) {
    if (!e.alien || !e.alive || e.y < 70 || e.y > f.y + 40) continue;
    const d = (e.x - f.x) ** 2 + (e.y - f.y) ** 2;
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function stepMelee(game, f, dt) {
  const M = PVE.melee;
  f.meleeCd = Math.max(0, (f.meleeCd || 0) - dt);
  if (!f.mel) {
    if (f.meleeCd > 0) return false;
    const t = meleeTarget(game, f);
    if (!t) return false;
    f.mel = { ph: 'go', tgt: t, t: 0 }; f.returning = false;
  }
  const m = f.mel;
  m.t += dt;
  if (m.ph === 'go') {
    const t = m.tgt;
    if (!t.alive) { const n = meleeTarget(game, f); if (n) m.tgt = n; else { f.mel = null; f.returning = true; return false; } }
    const tx = m.tgt.x, ty = m.tgt.y + 30, dx = tx - f.x, dy = ty - f.y, d = Math.hypot(dx, dy);
    const sp = M.speed * dt;
    if (d <= sp + 6 || m.t > 0.7) {
      f.x = Math.max(20, Math.min(W - 20, f.x + (d > 0 ? dx / d * Math.min(d, sp) : 0))); f.y += d > 0 ? dy / d * Math.min(d, sp) : 0;
      // 砍
      const wt = f.gear?.weapon ? f.gear.weapon.tier : -1;
      const base = f.stats.atk * M.atkMul * f.stats.power * GEAR.barrelMult[wt >= 0 ? GEAR.barrels[wt] : 1];
      const ang = Math.atan2(m.tgt.x - f.x, f.y - m.tgt.y);
      let hits = 0;
      for (const e of [...game.fighters.values()]) {
        if (!e.alien || !e.alive) continue;
        const ex = e.x - f.x, ey = e.y - (f.y - 24);
        if (ex * ex + ey * ey > (M.slashR + (e.r || 10)) ** 2) continue;
        const [d2, crit] = rollCrit(game, f, base);
        hurt(game, e, d2, f.uid); hits++;
        if (crit) game.emit('crit', { x: e.x, y: e.y, dmg: Math.round(d2) });
        if (hits <= 2) game.emit('spark', { x: e.x, y: e.y, team: 'blue', big: true });
      }
      for (const b of game.bullets) if (b.team === 'red' && b.life > 0 && (b.x - f.x) ** 2 + (b.y - f.y + 24) ** 2 < M.slashR * M.slashR) b.life = 0;
      game.emit('slash', { uid: f.uid, x: f.x, y: f.y, ang, wt: Math.max(0, wt) });
      f.mel = { ph: 'slash', t: 0, ang };
    } else { f.vx = dx / d * M.speed; f.vy = dy / d * M.speed; f.x += f.vx * dt; f.y += f.vy * dt; }
    return true;
  }
  if (m.ph === 'slash') {
    if (m.t >= 0.22) { f.mel = null; f.meleeCd = M.cd / (1 + f.stats.aspd); f.returning = true; return false; }
    return true;
  }
  return false;
}

// 小技能「冲击」：机甲前冲一拳，向前方扇形打出冲击波——伤害并击退虫群、打散敌方子弹、嘲讽3秒
function inCone(f, x, y, reach) {
  // 把目标点转到「冲击方向朝上」的坐标系再判断扇形
  const a = f.impactAngle || 0, dx = x - f.x, dy = y - f.y;
  const lx = dx * Math.cos(a) + dy * Math.sin(a), ly = -dx * Math.sin(a) + dy * Math.cos(a);
  const up = -ly;
  return up >= -10 && up <= reach && Math.abs(lx) <= 50 + up * 0.45;
}
function castImpact(game, f) {
  const T = PVE.tank, reach = T.impactReach * (1 + 0.15 * (f.stats.power - 1));
  const [dmg, crit] = rollCrit(game, f, T.impactAtk * f.stats.atk * f.stats.power);
  // 自动索敌：朝最近的敌人打（最多偏 60°）
  const tg = nearestEnemy(game, f.x, f.y, reach + 80);
  f.impactAngle = tg ? Math.max(-1.05, Math.min(1.05, Math.atan2(tg.x - f.x, f.y - tg.y))) : 0;
  f.lungeT = 0.35; f.taunt = Math.max(f.taunt, 3);
  let hits = 0, cleared = 0;
  for (const e of [...game.fighters.values()]) {
    if (!e.alien || !e.alive || !inCone(f, e.x, e.y, reach)) continue;
    hurt(game, e, dmg, f.uid); hits++;
    if (crit) game.emit('crit', { x: e.x, y: e.y, dmg: Math.round(dmg) });
    if (e.alive) { const k = 46 * (1 - Math.hypot(e.x - f.x, e.y - f.y) / reach); e.x += Math.sin(f.impactAngle) * k; e.y -= Math.cos(f.impactAngle) * k; }
  }
  for (const b of game.bullets) if (b.team === 'red' && b.life > 0 && inCone(f, b.x, b.y, reach)) { b.life = 0; cleared++; }
  f.merit += cleared * PVE.enemyBulletDmg * PVE.contrib.taken * 0.5;
  game.emit('impact', { uid: f.uid, x: f.x, y: f.y, reach, hits, cleared, angle: f.impactAngle });
  game.emit('skill', { uid: f.uid, skill: 'impact', x: f.x, y: f.y });
  return true;
}

// 大招「无敌冲锋斩」：无敌4秒，冲向怪最密的地方（没有就冲母舰触手炮/核心）原地旋风斩，结束后飞回航道
function rushPoint(game, f) {
  const al = [];
  for (const e of game.fighters.values()) if (e.alien && e.alive && e.y > 60 && e.y < PVE.zone[1]) al.push(e);
  let best = null, bn = -1;
  for (const a of al) {
    let n = 0; for (const b of al) if ((a.x - b.x) ** 2 + (a.y - b.y) ** 2 < 130 * 130) n++;
    n -= Math.abs(a.x - f.x) / 600;    // 一样多就去近的
    if (n > bn) { bn = n; best = a; }
  }
  const boss = game.teams.red;
  if (best && (bn >= 2 || !boss.present)) return { x: best.x, y: best.y + 24 };
  if (boss.present) {
    const pods = (boss.turrets || []).filter(t => !t.dead);
    if (pods.length) { pods.sort((a, b) => Math.abs(a.x - f.x) - Math.abs(b.x - f.x)); return { x: pods[0].x, y: pods[0].y + 70 }; }
    return { x: boss.x, y: boss.y + boss.coreDy + 140 };
  }
  if (best) return { x: best.x, y: best.y + 24 };
  return { x: laneCenter(f.lane), y: 420 };
}
function stepRush(game, f, dt) {
  const T = PVE.tank;
  f.rushT -= dt; f.rushRetarget -= dt;
  if (f.rushRetarget <= 0) { f.rushRetarget = 0.7; const p = rushPoint(game, f); f.rushX = p.x; f.rushY = Math.max(110, p.y); }
  const dx = f.rushX - f.x, dy = f.rushY - f.y, d = Math.hypot(dx, dy);
  const sp = Math.min(T.rushSpeed, d * 7);
  f.vx = d > 1 ? dx / d * sp : 0; f.vy = d > 1 ? dy / d * sp : 0;
  f.x = Math.max(20, Math.min(W - 20, f.x + f.vx * dt)); f.y += f.vy * dt;
  f.spin = (f.spin || 0) + dt * (d > 40 ? 9 : 18);
  f.rushTick -= dt;
  if (f.rushTick <= 0) { f.rushTick = T.whirlTick; whirlHit(game, f); }
  if (f.rushT <= 0) { f.rushT = 0; f.returning = true; f.invuln = Math.max(f.invuln, 0.8); }
}
function whirlHit(game, f) {
  const T = PVE.tank, R = T.whirlR, dmg = T.whirlAtk * f.stats.atk * f.stats.power * critAvg(f);
  let spark = 0;
  for (const e of [...game.fighters.values()]) {
    if (!e.alien || !e.alive) continue;
    const rr = R + (e.r || 10);
    if ((e.x - f.x) ** 2 + (e.y - f.y) ** 2 > rr * rr) continue;
    hurt(game, e, dmg, f.uid);
    if (spark++ < 2) game.emit('spark', { x: e.x, y: e.y, team: 'blue', big: true });
  }
  const boss = game.teams.red;
  if (boss.present) {
    for (const tu of boss.turrets || []) {
      if (tu.dead || (tu.x - f.x) ** 2 + (tu.y - f.y) ** 2 > (R + 30) ** 2) continue;
      tu.hp -= dmg * 1.5; f.merit += dmg * 1.5 * PVE.contrib.dmg;
      if (spark++ < 3) game.emit('spark', { x: tu.x, y: tu.y, team: 'blue', big: true });
      if (tu.hp <= 0) game.killTurret(boss, tu, f.uid);
    }
    const cy = boss.y + boss.coreDy;
    if (Math.abs(f.x - boss.x) < boss.hitW / 2 && f.y - cy < R + 60) { game.damageFlag('red', dmg * 1.5, f.uid, 'shot'); game.emit('spark', { x: f.x, y: f.y - 50, team: 'blue', big: true }); }
  }
  for (const b of game.bullets) if (b.team === 'red' && b.life > 0 && (b.x - f.x) ** 2 + (b.y - f.y) ** 2 < 90 * 90) b.life = 0;
}

// ───────── 蜂巢航母：无人机 ─────────
// attack：追着最近的异形（母舰战时追触手炮/核心）在下方盘旋射击；guard：在舰队区巡逻，撞到敌弹就拦下
function launchDrones(game, f, kind, n) {
  const C = PVE.carrier, list = game.pveDrones || (game.pveDrones = []);
  const mine = list.filter(d => d.owner === f.uid);
  for (let i = 0; i < mine.length + n - C.maxPerOwner; i++) mine[i].t = 0;   // 超出上限，最老的先回收
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    list.push({ owner: f.uid, kind, x: f.x + Math.cos(a) * 14, y: f.y - 10, vx: Math.cos(a) * 260, vy: -220 + Math.sin(a) * 120,
      t: C.droneLife, cd: 0.4 + i * 0.07, phase: a, slot: i / Math.max(1, n - 1), id: ++game.zoneSeq });
  }
  game.emit('drones', { uid: f.uid, kind, n, x: f.x, y: f.y });
}
function droneTarget(game, d) {
  let best = null, bd = 1e12;
  for (const e of game.fighters.values()) {
    if (!e.alien || !e.alive || e.y < 40) continue;
    const dd = (e.x - d.x) ** 2 + (e.y - d.y) ** 2;
    if (dd < bd) { bd = dd; best = e; }
  }
  if (best) return best;
  const boss = game.teams.red;
  if (!boss.present) return null;
  const pods = (boss.turrets || []).filter(t => !t.dead);
  if (pods.length) return pods.reduce((a, b) => ((a.x - d.x) ** 2 < (b.x - d.x) ** 2 ? a : b));
  return { x: boss.x + Math.sin(d.phase) * 80, y: boss.y + boss.coreDy };
}
export function stepDrones(game, dt) {
  const C = PVE.carrier, list = game.pveDrones;
  if (!list || !list.length) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const d = list[i];
    const o = game.fighters.get(d.owner);
    d.t -= dt; d.phase += dt * 2.4; d.cd -= dt;
    if (d.t <= 0 || !o) { list.splice(i, 1); game.emit('spark', { x: d.x, y: d.y, team: 'blue' }); continue; }
    const atk = o.stats?.atk || 6, pw = o.stats?.power || 1;
    let tx, ty, tgt = null;
    if (d.kind === 'attack') {
      tgt = droneTarget(game, d);
      if (tgt) { tx = tgt.x + Math.cos(d.phase) * 46; ty = tgt.y + 110 + Math.sin(d.phase * 1.3) * 22; }
      else { tx = o.x + Math.cos(d.phase) * 40; ty = o.y - 70; }
    } else {
      tx = 70 + d.slot * 580 + Math.sin(d.phase * 0.7) * 30;
      ty = PVE.zone[0] + 40 + (0.5 + 0.5 * Math.sin(d.phase + d.slot * 6)) * 300;
    }
    ty = Math.max(70, ty);
    const k = Math.min(1, dt * 3.2);
    d.vx += ((tx - d.x) * 4 - d.vx) * k; d.vy += ((ty - d.y) * 4 - d.vy) * k;
    const sp = Math.hypot(d.vx, d.vy), max = 520;
    if (sp > max) { d.vx *= max / sp; d.vy *= max / sp; }
    d.x += d.vx * dt; d.y += d.vy * dt;
    if (d.kind === 'guard') {
      const r2 = C.guardR * C.guardR;
      for (const b of game.bullets) if (b.team === 'red' && b.life > 0 && (b.x - d.x) ** 2 + (b.y - d.y) ** 2 < r2) {
        b.life = 0; o.merit += PVE.enemyBulletDmg * PVE.contrib.taken * 0.5; d.flash = 0.18;
      }
      d.flash = Math.max(0, (d.flash || 0) - dt);
      if (!tgt) tgt = droneTarget(game, d);
    }
    if (d.cd <= 0 && tgt) {
      d.cd = d.kind === 'attack' ? C.droneShotCd : C.guardShotCd;
      const a = Math.atan2(tgt.y - d.y, tgt.x - d.x);
      const [dd, crit] = rollCrit(game, o, C.droneShotAtk * atk * pw); game.addBullet(d.x, d.y - 6, Math.cos(a) * 760, Math.sin(a) * 760, 3, dd, 'blue', 'shot', o.uid, 0, { pveScaled: true, laser: true, life: 2, crit });
    }
  }
}


export function laneDanger(game) {
  const d = { L: 0, M: 0, R: 0 };
  for (const z of game.zones) for (const l of z.lanes) d[l] = Math.max(d[l], z.warn <= 6 ? 2 : 1);
  return d;
}

function allies(game) { const a = []; for (const f of game.fighters.values()) if (!f.alien && f.team === 'blue') a.push(f); return a; }

function castSkill(game, f) {
  if (f.cls === 'healer') {
    const hurtList = allies(game).filter(a => a.alive && a.hp < a.maxHp - 0.5).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 3);
    if (!hurtList.length) return false;
    const targets = [];
    for (const a of hurtList) {
      const amt = heal(game, a, (30 + 0.28 * a.maxHp) * f.stats.heal * (1 + 0.15 * (f.power - 1)), f);
      targets.push({ uid: a.uid, x: a.x, y: a.y, amount: Math.round(amt) });
    }
    game.emit('heal', { uid: f.uid, x: f.x, y: f.y, targets });
    return true;
  }
  if (f.cls === 'tank') return castImpact(game, f);
  if (f.cls === 'carrier') { launchDrones(game, f, 'attack', PVE.carrier.attackDrones); game.emit('skill', { uid: f.uid, skill: 'drones', x: f.x, y: f.y }); f.recoilT = 0.3; return true; }
  // 输出舰：集束导弹
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 1.6;
    { const [d, crit] = rollCrit(game, f, 2.5 * f.stats.atk * f.stats.power); game.addBullet(f.x, f.y - 10, Math.cos(a) * 260, Math.sin(a) * 260, 5, d, 'blue', 'shot', f.uid, 0, { pveScaled: true, missile: true, life: 4, crit }); }
  }
  f.recoilT = 0.3;
  game.emit('skill', { uid: f.uid, skill: 'missile', x: f.x, y: f.y });
  return true;
}

// 真人发「技能」「大招」：就绪立刻放；冷却快好（≤2秒）就排队，好了自动补放；否则提示剩余冷却
export function requestSkill(game, f, kind) {
  if (f.alien || !f.alive || !f.cls) return false;
  if (kind === 'skill') {   // 小技能是自动的，发了只提示一下
    if (game.clock - (f.autoTipAt || 0) > 1.5) { f.autoTipAt = game.clock; game.emit('cd', { uid: f.uid, kind: 'auto', left: Math.ceil(f.skillCd) }); }
    return false;
  }
  const cd = f.ultCd;
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
  if (f.cls === 'tank') { let n = 0; for (const e of game.fighters.values()) if (e.alien && e.alive) n++; return n >= 5 || game.teams.red.present; }
  if (f.cls === 'carrier') { let n = 0; for (const b of game.bullets) if (b.team === 'red' && b.y > PVE.zone[0] - 100) n++; return n >= 25 || game.zones.length > 0; }
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
    }
    f.hotT = PVE.healUlt.seconds; f.hotTick = 0;   // 之后持续群体回血
    game.emit('ult', { uid: f.uid, name: f.name, cls: f.cls, x: f.x, y: f.y, revived });
  } else if (f.cls === 'tank') {
    const T = PVE.tank;
    f.rushT = T.rushTime; f.invuln = Math.max(f.invuln, T.rushTime); f.taunt = Math.max(f.taunt, T.rushTime);
    f.rushRetarget = 0; f.rushTick = 0.12; f.returning = false;
    game.emit('ult', { uid: f.uid, name: f.name, cls: f.cls, x: f.x, y: f.y, lane: f.lane });
  } else if (f.cls === 'carrier') {
    launchDrones(game, f, 'guard', PVE.carrier.guardDrones);
    game.emit('ult', { uid: f.uid, name: f.name, cls: f.cls, x: f.x, y: f.y });
  } else {
    f.beamT = 2.5; f.beamCharge = PVE.beamCharge;
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
    const equipped = gearScore(item) > gearScore(cur && { ...cur, slot: item.slot });
    if (equipped) { gear[item.slot] = { slot: item.slot, tier: item.tier, roll: item.roll, name: item.name, subs: item.subs.map(x => ({ ...x })) }; refreshStats(f); }
    else {
      const p = game.save?.peek(f.uid);
      if (p && !f.test) { p.shards = (p.shards || 0) + GEAR.tiers[item.tier].f * 10; game.save.dirty = true; }
    }
    drops.push({ uid: f.uid, name: f.name, item, equipped });
    game.emit('loot', { uid: f.uid, name: f.name, item, equipped, text: describeItem(item) });
  });
  return drops;
}
