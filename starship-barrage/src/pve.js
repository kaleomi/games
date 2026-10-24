// 讨伐模式（PvE）：虫群 → 异形母舰。没有我方要塞，战舰血量就是全队的命。
import { W, H, PVE } from './config.js';
import { LANES, LANE_NAMES, laneCenter, hurt, stepDrones } from './fleet.js';

export function currentStage(game) { return Math.max(1, game.save?.data?.pveStage || game.memStage || 1); }
export function bossFor(stage) { return PVE.bosses[(Math.max(1, stage) - 1) % PVE.bosses.length]; }
export function stageMul(stage) {
  let m = 1, prev = 1;
  for (const seg of PVE.bossCurve) { const n = Math.max(0, Math.min(stage, seg.to) - prev); m *= seg.mul ** n; prev = Math.max(prev, Math.min(stage, seg.to)); if (stage <= seg.to) break; }
  return m;
}
export function lateMul(stage) { return PVE.lateDmg ** Math.max(0, stage - 10); }
export function bossMax(stage) { return Math.round(PVE.bossHp * stageMul(stage) * bossFor(stage).hp); }

// 把红方换成异形母舰
export function setupBoss(game, t) {
  const stage = currentStage(game);
  const B = bossFor(stage);
  t.boss = true; t.stage = stage; t.bossId = B.id; t.bossName = B.name; t.podName = B.podName;
  t.core = t.coreMax = bossMax(stage);
  t.shield = t.shieldMax = 0;
  t.x = 360; t.y = -170; t.present = false; t.coreDy = PVE.coreDy; t.hitW = PVE.bossHitW;
  const podHp = Math.round(PVE.podHp * (1 + 0.12 * (stage - 1)));
  t.turrets = B.pods.map(([dx, dy]) => ({ dx, dy, x: t.x + dx, y: t.y + dy, hp: podHp, max: podHp, dead: false, respawn: 0, cd: 3 + game.random() * 3, pod: true, podKind: B.podKind }));
  t.patT = 4; t.skillT = 8; t.rage = 1;
}

// 讨伐模式没有我方要塞：蓝方只保留“舰队主炮”的发射位置（屏幕下方外侧）
export function setupFleetSide(t) {
  t.present = false; t.turrets = []; t.shield = t.shieldMax = 0;
  t.x = 360; t.y = H + 140; t.fleet = true;
}

export function startPve(game) {
  const stage = currentStage(game);
  game.pve = { stage, sub: 'wave', t: PVE.waveSeconds(stage), spawnT: 1.2, left: PVE.stageSeconds };
  game.emit('announce', { text: `第${stage}关，虫群来袭！`, voice: true });
}

export function stepPve(game, dt) {
  const p = game.pve, boss = game.teams.red;
  if (!p) return;
  p.left -= dt;
  stepZones(game, dt);
  stepDrones(game, dt);
  for (let i = game.barriers.length - 1; i >= 0; i--) { game.barriers[i].t -= dt; if (game.barriers[i].t <= 0) game.barriers.splice(i, 1); }
  if (p.sub === 'wave') {
    p.t -= dt; p.spawnT -= dt;
    if (p.spawnT <= 0) { p.spawnT = PVE.waves.every(p.stage); spawnFormation(game, false); if (game.random() < PVE.waves.double(p.stage)) spawnFormation(game, false); }
    if (p.t <= 0) {
      p.sub = 'enter'; p.t = PVE.bossEnter;
      game.emit('banner', { team: 'red', text: `第${p.stage}关 · ${boss.bossName}现身！`, tier: 4 });
      game.emit('announce', { text: `${boss.bossName}现身！`, voice: true });
    }
  } else if (p.sub === 'enter') {
    p.t -= dt;
    boss.y += (PVE.bossY - boss.y) * Math.min(1, dt * 2.4);
    if (p.t <= 0) { boss.y = PVE.bossY; boss.present = true; p.sub = 'boss'; p.t = p.left; p.spawnT = 8; }
  } else if (p.sub === 'boss') {
    p.t = p.left; p.spawnT -= dt;
    boss.x = 360 + Math.sin(game.time * 0.35) * 70;
    if (p.spawnT <= 0) { p.spawnT = PVE.waves.bossEvery(p.stage); spawnFormation(game, true); if (game.random() < PVE.waves.double(p.stage) * 0.6) spawnFormation(game, true); }
    const pct = boss.core / boss.coreMax;
    const rage = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;
    if (rage > boss.rage) {
      boss.rage = rage;
      game.emit('banner', { team: 'red', text: RAGE_TEXT[boss.bossId][rage - 2], tier: 3 });
    }
    BOSS_AI[boss.bossId](game, boss, dt, rage);
  }
  stepRays(game, dt);
  if (game.gravity) { game.gravity.t -= dt; if (game.gravity.t <= 0) game.gravity = null; }
  for (const tu of boss.turrets) { tu.x = boss.x + tu.dx; tu.y = boss.y + tu.dy; }
  // 全队同时阵亡 = 失败
  let ships = 0, alive = 0;
  for (const f of game.fighters.values()) if (!f.alien && f.team === 'blue') { ships++; if (f.alive) alive++; }
  if (ships > 0 && alive === 0 && p.sub !== 'enter') p.wiped = true;
}

// ───────── 四种 BOSS 的出招 ─────────
const RAGE_TEXT = {
  mother: ['母舰受创，开始双线扫射！', '母舰狂暴！湮灭炮准备'],
  queen: ['虫后受创，酸液池翻倍！', '虫后狂暴！虫潮倾巢而出'],
  colossus: ['巨像受创，棱光射线加速！', '巨像狂暴！晶刺连环爆发'],
  eye: ['深渊之眼睁开了第二层瞳孔！', '深渊之眼狂暴！引力漩涡'],
};
const cd = (boss, key, dt, every) => { boss[key] = (boss[key] ?? every * 0.6) - dt; if (boss[key] > 0) return false; boss[key] = every; return true; };
const BOSS_AI = {
  // 异形母舰：环形弹幕 + 红区（炮击 / 双线扫射 / 湮灭炮）
  mother(game, boss, dt, rage) {
    if (cd(boss, 'patT', dt, [6, 5, 4.5][rage - 1])) game.spawnPattern('red', 'bossRing', boss.x, boss.y + boss.coreDy + 60, null);
    if (cd(boss, 'skillT', dt, PVE.bossSkillEvery[rage - 1])) {
      const r = game.random();
      if (rage === 3 && r < 0.45) castZone(game, 'cannon', 1, boss.bossName);
      else if (rage >= 2 && r < 0.75) castZone(game, 'sweep', 2, boss.bossName);
      else castZone(game, 'strike', 1, boss.bossName);
    }
  },
  // 钢铁虫后：追踪孢子 + 酸液池（持续伤害）+ 召唤虫潮；卵囊会孵小虫
  queen(game, boss, dt, rage) {
    if (cd(boss, 'patT', dt, [5.5, 4.8, 4][rage - 1])) {
      const n = 4 + rage * 2;
      for (let i = 0; i < n; i++) { const a = Math.PI / 2 + (i - (n - 1) / 2) * 0.28; game.addBullet(boss.x + Math.cos(a) * 60, boss.y + 80, Math.cos(a) * 170, Math.sin(a) * 170, 7, 1.4, 'red', 'danmaku', null, 0, { hunt: true, life: 6, hue: 2, spore: true }); }
      game.emit('cast', { x: boss.x, y: boss.y + 80 });
    }
    if (cd(boss, 'skillT', dt, PVE.bossSkillEvery[rage - 1])) {
      const r = game.random();
      if (rage === 3 && r < 0.4) { spawnFormation(game, false, 'diver', boss.x, boss.y + 90); spawnFormation(game, false, 'swarm', boss.x, boss.y + 90); game.emit('banner', { team: 'red', text: `${boss.bossName}「虫潮」！`, tier: 3 }); }
      else castZone(game, 'pool', rage >= 2 ? 2 : 1, boss.bossName);
    }
  },
  // 晶核巨像：碎晶雨 + 旋转棱光射线 + 晶刺（左中右依次爆发）；棱晶会打高速激光
  colossus(game, boss, dt, rage) {
    if (cd(boss, 'patT', dt, [5, 4.4, 3.8][rage - 1])) {
      const n = 8 + rage * 3;
      for (let i = 0; i < n; i++) game.addBullet(40 + game.random() * 640, 70 - game.random() * 120, (game.random() - 0.5) * 30, 230 + game.random() * 60, 6, 1, 'red', 'danmaku', null, 0, { hue: 3, shard: true });
    }
    if (cd(boss, 'skillT', dt, PVE.bossSkillEvery[rage - 1] + 1)) {
      if (game.random() < 0.5 || rage === 1) castRays(game, boss, 2 + rage);
      else castCascade(game, boss, rage);
    }
  },
  // 深渊之眼：瞳孔弹幕 + 深渊凝视（锁贡献最高的人那条航道）+ 引力漩涡（把战舰往中间吸并放螺旋弹幕）
  eye(game, boss, dt, rage) {
    if (cd(boss, 'patT', dt, [5, 4.4, 3.8][rage - 1])) game.spawnPattern('red', rage >= 2 ? 'bossFlower' : 'bossRing', boss.x, boss.y + boss.coreDy + 40, null);
    if (cd(boss, 'skillT', dt, PVE.bossSkillEvery[rage - 1])) {
      if (rage === 3 && game.random() < 0.45 && !game.gravity) {
        game.gravity = { t: 4.5, max: 4.5, x: boss.x };
        game.spawnPattern('red', 'podSpiral', boss.x, boss.y + boss.coreDy + 40, null);
        game.emit('banner', { team: 'red', text: `${boss.bossName}「引力漩涡」！战舰被吸向中间`, tier: 4 });
      } else castGaze(game, boss);
    }
  },
};

// 深渊凝视：盯住贡献最高的真人所在航道
function castGaze(game, boss) {
  let top = null;
  for (const f of game.fighters.values()) if (!f.alien && !f.npc && f.alive && f.team === 'blue' && (!top || f.merit > top.merit)) top = f;
  if (top && !game.zones.some(z => z.lanes.includes(top.lane))) {
    const z = castZone(game, 'gaze', 1, boss.bossName, [top.lane]);
    if (z) { z.target = top.uid; game.emit('toast', { text: `深渊之眼盯上了 ${top.name}！` }); return; }
  }
  castZone(game, 'gaze', 1, boss.bossName);
}
// 晶刺：左→中→右（或反过来）依次爆发，跟着跑就能躲
function castCascade(game, boss, rage) {
  if (game.zones.length) return;
  const order = game.random() < 0.5 ? ['L', 'M', 'R'] : ['R', 'M', 'L'];
  const gap = rage === 3 ? 2.2 : 3;
  order.forEach((l, i) => {
    const def = PVE.zones.spike, w = 6 + i * gap;
    game.zones.push({ id: ++game.zoneSeq, kind: 'spike', name: def.name, frac: def.frac, lanes: [l], warn: w, max: w, caster: boss.bossName, intercept: 0 });
  });
  game.emit('banner', { team: 'red', text: `${boss.bossName}「晶刺」${order.map(l => LANE_NAMES[l]).join('→')}依次爆发！看准了躲`, tier: 3 });
  game.emit('announce', { text: '晶刺连环爆发，快躲', voice: true });
}
// 棱光射线：从核心射出几条会旋转的射线，先闪1.2秒预警
function castRays(game, boss, n) {
  game.rays = game.rays || [];
  const dir = game.random() < 0.5 ? 1 : -1;
  for (let i = 0; i < n; i++) game.rays.push({ ang: -0.9 + (1.8 * i) / Math.max(1, n - 1) + (game.random() - 0.5) * 0.2, spd: dir * (0.32 + 0.06 * boss.rage), warn: 1.4, t: 3.2 });
  game.emit('banner', { team: 'red', text: `${boss.bossName}「棱光射线」！`, tier: 3 });
}
export function rayHits(boss, ray, x, y, w = 16) {
  const ox = boss.x, oy = boss.y + boss.coreDy, dx = Math.sin(ray.ang), dy = Math.cos(ray.ang);
  const px = x - ox, py = y - oy, along = px * dx + py * dy;
  return along > 0 && Math.abs(px * dy - py * dx) < w;
}
function stepRays(game, dt) {
  const boss = game.teams.red;
  if (!game.rays?.length) return;
  for (let i = game.rays.length - 1; i >= 0; i--) {
    const r = game.rays[i];
    if (!boss.present) { game.rays.splice(i, 1); continue; }
    if (r.warn > 0) { r.warn -= dt; continue; }
    r.t -= dt; r.ang += r.spd * dt;
    if (r.t <= 0) { game.rays.splice(i, 1); continue; }
    for (const f of game.fighters.values()) if (!f.alien && f.team === 'blue' && f.alive && rayHits(boss, r, f.x, f.y)) hurt(game, f, f.maxHp * 0.3 * dt, null);
  }
}

// ───────── 红色区域技能 ─────────
// 选人最多的航道；同时最多覆盖两条航道，永远留一条安全的
export function castZone(game, kind, laneCount, caster, force = null) {
  const used = new Set(game.zones.flatMap(z => z.lanes));
  const free = LANES.filter(l => !used.has(l));
  const room = Math.min(laneCount, free.length - (used.size === 0 ? 1 : 0), 2 - used.size);
  if (room <= 0) return null;
  const count = { L: 0, M: 0, R: 0 };
  for (const f of game.fighters.values()) if (!f.alien && f.team === 'blue' && f.alive) count[f.lane]++;
  const pick = force ? force.filter(l => free.includes(l)).slice(0, room) : free.sort((a, b) => count[b] - count[a] + (game.random() - 0.5) * 2).slice(0, room);
  if (!pick.length) return null;
  const def = PVE.zones[kind];
  const z = { id: ++game.zoneSeq, kind, name: def.name, frac: def.frac, lanes: pick, warn: PVE.zoneWarn, max: PVE.zoneWarn, caster, intercept: 0, dot: def.dot || 0, dps: def.dps || 0 };
  game.zones.push(z);
  const where = pick.map(l => LANE_NAMES[l]).join('、');
  const safe = LANES.filter(l => !pick.includes(l) && !used.has(l)).map(l => LANE_NAMES[l]).join('、');
  game.emit('zone', { kind, name: def.name, lanes: pick, caster });
  game.emit('banner', { team: 'red', text: `${caster}「${def.name}」锁定${where}路！${PVE.zoneWarn}秒后命中${safe ? `，往${safe}躲` : ''}${kind === 'cannon' ? '，或发「拦截」' : ''}`, tier: kind === 'cannon' ? 5 : 3 });
  if (kind === 'cannon' || laneCount > 1) game.emit('announce', { text: `${def.name}锁定${where}路，快躲`, voice: true });
  return z;
}

function stepZones(game, dt) {
  for (let i = game.zones.length - 1; i >= 0; i--) {
    const z = game.zones[i];
    z.warn -= dt;
    if (z.warn > 0) continue;
    if (z.dot) {   // 酸液池：持续伤害
      if (!z.active) { z.active = true; z.left = z.dot; game.emit('strike', { kind: z.kind, lanes: z.lanes, hit: 0, intercept: 0 }); }
      z.left -= dt;
      for (const f of game.fighters.values()) if (!f.alien && f.team === 'blue' && f.alive && z.lanes.includes(f.lane)) hurt(game, f, f.maxHp * z.dps * dt, null);
      if (z.left <= 0) game.zones.splice(i, 1);
      continue;
    }
    game.zones.splice(i, 1);
    const stage = game.pve?.stage || 1;
    const mult = (1 - Math.min(0.6, z.intercept)) * (1 + 0.04 * (stage - 1)) * lateMul(stage);
    let hit = 0;
    for (const f of [...game.fighters.values()]) {
      if (f.alien || f.team !== 'blue' || !f.alive || !z.lanes.includes(f.lane)) continue;
      const barrier = game.barriers.some(b => b.lane === f.lane);
      hurt(game, f, f.maxHp * z.frac * mult * (barrier ? 0.4 : 1), null);
      hit++;
    }
    game.emit('strike', { kind: z.kind, lanes: z.lanes, hit, intercept: z.intercept });
  }
}

export function interceptZone(game, f) {
  const z = game.zones.find(z => z.kind === 'cannon');
  if (!z) return false;
  if (game.clock - (f.interceptT || 0) < 0.8) return false;
  f.interceptT = game.clock;
  z.intercept = Math.min(0.6, z.intercept + 0.015);
  f.merit += 2;
  game.emit('intercept', { team: f.team, x: f.x, y: f.y });
  return true;
}

// ───────── 异形 ─────────
export function spawnFormation(game, light, forceKind = null, ox = null, oy = null) {
  const p = game.pve;
  const fleet = game.countTeam('blue');
  let alive = 0; for (const f of game.fighters.values()) if (f.alien && f.alive) alive++;
  const room = PVE.waves.maxAlive(p.stage) - alive;
  if (room <= 0) return;
  const n = Math.min(room, Math.max(2, Math.min(PVE.waves.sizeCap, PVE.waves.size(p.stage) + Math.floor(fleet / 6)) >> (light ? 1 : 0)));
  const r = forceKind ? 1 : game.random();
  const gunnerP = Math.min(0.32, 0.14 + p.stage * 0.02);
  if (forceKind) {   // 虫后召唤 / 卵囊孵化：从指定位置散开
    for (let i = 0; i < n; i++) { const a = spawnAlien(game, forceKind, ox + (i - (n - 1) / 2) * 30, oy); if (a) { a.vy = 120; a.yStop = Math.max(a.yStop, oy + 60); } }
    return;
  }
  if (r < gunnerP) {
    const k = Math.min(room, PVE.waves.gunners(p.stage) - (game.random() < 0.4 ? 1 : 0) || 1);
    for (let i = 0; i < k; i++) spawnAlien(game, 'gunner', 180 + game.random() * 360, -40 - i * 60);
    return;
  }
  const kind = r < gunnerP + 0.3 ? 'diver' : 'swarm';
  const cx = 140 + game.random() * 440;
  const shape = game.random() < 0.5 ? 'line' : 'v';
  for (let i = 0; i < n; i++) {
    const off = i - (n - 1) / 2;
    const x = shape === 'line' ? 360 + off * (600 / n) : cx + off * 34;
    const y = shape === 'line' ? -30 : -30 - Math.abs(off) * 26;
    spawnAlien(game, kind, Math.max(30, Math.min(W - 30, x)), y);
  }
}

export function spawnAlien(game, kind, x, y) {
  if (game.fighters.size >= 520) return null;
  const def = PVE.alien[kind];
  const stage = game.pve?.stage || 1;
  const hp = Math.round(def.hp * (1 + 0.15 * (stage - 1)));
  const [z0, z1] = PVE.alienZone;
  const f = {
    uid: `alien:${++game.alienSeq}`, alien: true, npc: true, kind, team: 'red', name: '',
    x, y, vx: 0, vy: 0, hp, maxHp: hp, alive: true, invuln: 0, shield: 0, merit: 0, kills: 0,
    level: 1, skin: 0, weapon: 'laser', power: 1, charge: 0, drones: 0, labelUntil: 0, lastActive: 0,
    t: 0, seed: game.random() * 10, fireCd: 2 + game.random() * 3, stage: 0, skillT: 4 + game.random() * 4,
    yStop: kind === 'gunner' ? 190 + game.random() * 130 : kind === 'diver' ? 220 + game.random() * 120 : z0 + 120 + game.random() * (z1 - z0 - 140),
    life: kind === 'gunner' ? 32 : 14 + game.random() * 6, tx: 360, ty: 900,
  };
  game.fighters.set(f.uid, f);
  return f;
}

// 选攻击目标：嘲讽中的机甲优先
export function pickTarget(game) {
  const ships = [], taunts = [];
  for (const f of game.fighters.values()) if (!f.alien && f.team === 'blue' && f.alive) { ships.push(f); if (f.taunt > 0) taunts.push(f); }
  if (taunts.length && game.random() < 0.75) return taunts[Math.floor(game.random() * taunts.length)];
  return ships.length ? ships[Math.floor(game.random() * ships.length)] : null;
}

export function stepAlien(game, f, dt) {
  f.t += dt;
  if (f.kind === 'chest') {   // 宝箱魔王：慢慢飘进来，左右晃，偶尔撒金币弹幕
    f.vy = f.y < f.yStop ? 70 : Math.sin(f.t * 0.8) * 12; f.vx = Math.sin(f.t * 0.6 + f.seed) * 90;
    f.x = Math.max(120, Math.min(W - 120, f.x + f.vx * dt)); f.y += f.vy * dt;
    f.fireCd -= dt;
    if (f.fireCd <= 0) { f.fireCd = 3.5; game.spawnPattern('red', 'podFan', f.x, f.y + 30, null); }
    return;
  }
  if (f.kind === 'swarm') {
    if (f.t > f.life) { f.vy = -150; f.vx *= 0.95; }
    else if (f.y < f.yStop) { f.vy = 110; f.vx = Math.sin(f.t * 2 + f.seed) * 70; }
    else { f.vy = Math.sin(f.t * 1.3 + f.seed) * 20; f.vx = Math.sin(f.t * 1.1 + f.seed) * 120; }
    f.fireCd -= dt;
    if (f.fireCd <= 0 && f.y > 20 && f.t < f.life) {
      f.fireCd = 3 + game.random() * 2;
      const tgt = pickTarget(game);
      if (tgt) { const a = Math.atan2(tgt.y - f.y, tgt.x - f.x); game.addBullet(f.x, f.y + 8, Math.cos(a) * 220, Math.sin(a) * 220, 5.5, 1, 'red', 'danmaku', f.uid, 0, { hue: 0 }); }
    }
  } else if (f.kind === 'diver') {
    if (f.stage === 0) { f.vy = 90; f.vx = Math.sin(f.t * 2.2 + f.seed) * 40; if (f.y >= f.yStop) { f.stage = 1; f.t = 0; const tgt = pickTarget(game); f.tx = tgt ? tgt.x : laneCenter(LANES[Math.floor(game.random() * 3)]); f.ty = tgt ? tgt.y : 850; game.emit('diveWarn', { uid: f.uid, x: f.tx, y: f.ty, r: PVE.diver.radius, t: PVE.diver.warn }); } }
    else if (f.stage === 1) { f.vx *= 0.9; f.vy *= 0.9; if (f.t > PVE.diver.warn) { f.stage = 2; f.t = 0; } }
    else {
      const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy) || 1;
      f.vx = dx / d * 520; f.vy = dy / d * 520;
      if (d < 18) {
        const stage = game.pve?.stage || 1;
        for (const s of [...game.fighters.values()]) {
          if (s.alien || s.team !== 'blue' || !s.alive) continue;
          if (Math.hypot(s.x - f.tx, s.y - f.ty) < PVE.diver.radius) hurt(game, s, PVE.diver.blast * (1 + 0.1 * (stage - 1)), null);
        }
        game.emit('explode', { x: f.x, y: f.y, size: 2, team: 'red' });
        game.fighters.delete(f.uid);
        return;
      }
    }
  } else {
    if (f.t > f.life) f.vy = -90;
    else if (f.y < f.yStop) f.vy = 70;
    else f.vy = Math.sin(f.t + f.seed) * 12;
    f.vx = Math.sin(f.t * 0.7 + f.seed) * 60;
    f.fireCd -= dt;
    if (f.fireCd <= 0 && f.y > 60 && f.t < f.life) { f.fireCd = 3.6; game.spawnPattern('red', 'gunnerFan', f.x, f.y + 20, f.uid); }
    // 炮虫的技能：酸液轰炸（红色区域）
    f.skillT -= dt;
    if (f.skillT <= 0 && f.y >= f.yStop - 5 && f.t < f.life) { f.skillT = PVE.gunnerSkillEvery; if (castZone(game, 'acid', 1, '炮虫')) game.emit('cast', { uid: f.uid, x: f.x, y: f.y }); }
  }
  f.x = Math.max(20, Math.min(W - 20, f.x + f.vx * dt));
  f.y += f.vy * dt;
  if (f.y < -90 && f.t > 2) game.fighters.delete(f.uid);
  else if (f.y > H + 40) game.fighters.delete(f.uid);
}

export function bossTimeText(game) {
  const p = game.pve;
  if (!p) return '';
  const t = Math.max(0, Math.ceil(p.left));
  const left = `本关剩余 ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
  if (p.sub === 'wave') return `${left} · ${Math.max(0, Math.ceil(p.t))}秒后母舰现身`;
  if (p.sub === 'enter') return `${left} · 母舰逼近`;
  return left;
}
