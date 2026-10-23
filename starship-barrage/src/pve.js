// 讨伐模式（PvE）：虫群 → 异形母舰。没有我方要塞，战舰血量就是全队的命。
import { W, H, PVE } from './config.js';
import { LANES, LANE_NAMES, laneCenter, hurt } from './fleet.js';

export function currentStage(game) { return Math.max(1, game.save?.data?.pveStage || game.memStage || 1); }
export function bossMax(stage) { return Math.round(PVE.bossHp * PVE.bossGrowth ** (stage - 1)); }

// 把红方换成异形母舰
export function setupBoss(game, t) {
  const stage = currentStage(game);
  t.boss = true; t.stage = stage;
  t.core = t.coreMax = bossMax(stage);
  t.shield = t.shieldMax = 0;
  t.x = 360; t.y = -170; t.present = false; t.coreDy = PVE.coreDy; t.hitW = PVE.bossHitW;
  const podHp = Math.round(PVE.podHp * (1 + 0.12 * (stage - 1)));
  t.turrets = PVE.podOffsets.map(([dx, dy]) => ({ dx, dy, x: t.x + dx, y: t.y + dy, hp: podHp, max: podHp, dead: false, respawn: 0, cd: 3 + game.random() * 3, pod: true }));
  t.patT = 4; t.skillT = 8; t.rage = 1;
}

// 讨伐模式没有我方要塞：蓝方只保留“舰队主炮”的发射位置（屏幕下方外侧）
export function setupFleetSide(t) {
  t.present = false; t.turrets = []; t.shield = t.shieldMax = 0;
  t.x = 360; t.y = H + 140; t.fleet = true;
}

export function startPve(game) {
  const stage = currentStage(game);
  game.pve = { stage, sub: 'wave', t: PVE.waveSeconds(stage), spawnT: 1.2 };
  game.emit('announce', { text: `第${stage}关，虫群来袭！`, voice: true });
}

export function stepPve(game, dt) {
  const p = game.pve, boss = game.teams.red;
  if (!p) return;
  stepZones(game, dt);
  for (let i = game.barriers.length - 1; i >= 0; i--) { game.barriers[i].t -= dt; if (game.barriers[i].t <= 0) game.barriers.splice(i, 1); }
  if (p.sub === 'wave') {
    p.t -= dt; p.spawnT -= dt;
    if (p.spawnT <= 0) { p.spawnT = Math.max(2, 3.4 - p.stage * 0.08); spawnFormation(game, false); }
    if (p.t <= 0) {
      p.sub = 'enter'; p.t = 3;
      game.emit('banner', { team: 'red', text: `第${p.stage}关 · 异形母舰现身！`, tier: 4 });
      game.emit('announce', { text: '异形母舰现身！', voice: true });
    }
  } else if (p.sub === 'enter') {
    p.t -= dt;
    boss.y += (PVE.bossY - boss.y) * Math.min(1, dt * 2.4);
    if (p.t <= 0) { boss.y = PVE.bossY; boss.present = true; p.sub = 'boss'; p.t = PVE.bossMinutes * 60; p.spawnT = 10; }
  } else if (p.sub === 'boss') {
    p.t -= dt; p.spawnT -= dt;
    boss.x = 360 + Math.sin(game.time * 0.35) * 70;
    if (p.spawnT <= 0) { p.spawnT = Math.max(7, 11 - p.stage * 0.2); spawnFormation(game, true); }
    const pct = boss.core / boss.coreMax;
    const rage = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;
    if (rage > boss.rage) {
      boss.rage = rage;
      game.emit('banner', { team: 'red', text: rage === 2 ? '母舰受创，开始双线扫射！' : '母舰狂暴！湮灭炮准备', tier: 3 });
    }
    boss.patT -= dt;
    if (boss.patT <= 0) {
      boss.patT = rage === 1 ? 6 : rage === 2 ? 5 : 4.5;
      game.spawnPattern('red', 'bossRing', boss.x, boss.y + boss.coreDy + 60, null);
    }
    boss.skillT -= dt;
    if (boss.skillT <= 0) {
      boss.skillT = PVE.bossSkillEvery[rage - 1];
      const r = game.random();
      if (rage === 3 && r < 0.45) castZone(game, 'cannon', 1, '异形母舰');
      else if (rage >= 2 && r < 0.75) castZone(game, 'sweep', 2, '异形母舰');
      else castZone(game, 'strike', 1, '异形母舰');
    }
  }
  for (const tu of boss.turrets) { tu.x = boss.x + tu.dx; tu.y = boss.y + tu.dy; }
  // 全队同时阵亡 = 失败
  let ships = 0, alive = 0;
  for (const f of game.fighters.values()) if (!f.alien && f.team === 'blue') { ships++; if (f.alive) alive++; }
  if (ships > 0 && alive === 0 && p.sub !== 'enter') p.wiped = true;
}

// ───────── 红色区域技能 ─────────
// 选人最多的航道；同时最多覆盖两条航道，永远留一条安全的
export function castZone(game, kind, laneCount, caster) {
  const used = new Set(game.zones.flatMap(z => z.lanes));
  const free = LANES.filter(l => !used.has(l));
  const room = Math.min(laneCount, free.length - (used.size === 0 ? 1 : 0), 2 - used.size);
  if (room <= 0) return null;
  const count = { L: 0, M: 0, R: 0 };
  for (const f of game.fighters.values()) if (!f.alien && f.team === 'blue' && f.alive) count[f.lane]++;
  const pick = free.sort((a, b) => count[b] - count[a] + (game.random() - 0.5) * 2).slice(0, room);
  const def = PVE.zones[kind];
  const z = { id: ++game.zoneSeq, kind, name: def.name, frac: def.frac, lanes: pick, warn: PVE.zoneWarn, max: PVE.zoneWarn, caster, intercept: 0 };
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
    game.zones.splice(i, 1);
    const stage = game.pve?.stage || 1;
    const mult = (1 - Math.min(0.6, z.intercept)) * (1 + 0.04 * (stage - 1));
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
export function spawnFormation(game, light) {
  const p = game.pve;
  const fleet = game.countTeam('blue');
  const n = Math.max(2, Math.min(10, 3 + Math.floor(fleet / 6)) >> (light ? 1 : 0));
  const r = game.random();
  const gunnerP = Math.min(0.32, 0.14 + p.stage * 0.02);
  if (r < gunnerP) {
    const k = 1 + (p.stage >= 4 && game.random() < 0.5 ? 1 : 0);
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
  const t = Math.max(0, Math.ceil(p.t));
  const mm = Math.floor(t / 60), ss = String(t % 60).padStart(2, '0');
  if (p.sub === 'wave') return `虫群来袭 · ${t}秒后母舰现身`;
  if (p.sub === 'enter') return '异形母舰正在逼近';
  return `母舰战剩余 ${mm}:${ss}`;
}
