// 讨伐模式（PvE）：虫群 → 异形母舰。由 Game 在讨伐模式下调用。
import { W, H, TEAMS, PVE } from './config.js';

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
  t.turrets = PVE.podOffsets.map(([dx, dy]) => ({ dx, dy, x: t.x + dx, y: t.y + dy, hp: podHp, max: podHp, dead: false, respawn: 0, cd: 2 + game.random() * 2, pod: true }));
  t.patT = 3; t.cannonT = PVE.bossCannonEvery; t.rage = 1;
}

export function startPve(game) {
  const stage = currentStage(game);
  game.pve = { stage, sub: 'wave', t: PVE.waveSeconds(stage), spawnT: 1.2 };
  game.emit('announce', { text: `第${stage}关，虫群来袭！`, voice: true });
}

export function stepPve(game, dt) {
  const p = game.pve, boss = game.teams.red;
  if (!p) return;
  if (p.sub === 'wave') {
    p.t -= dt; p.spawnT -= dt;
    if (p.spawnT <= 0) { p.spawnT = Math.max(1.7, 3 - p.stage * 0.08); spawnFormation(game, false); }
    if (p.t <= 0) {
      p.sub = 'enter'; p.t = 3;
      game.emit('banner', { team: 'red', text: `第${p.stage}关 · 异形母舰现身！`, tier: 4 });
      game.emit('announce', { text: '异形母舰现身！', voice: true });
    }
  } else if (p.sub === 'enter') {
    p.t -= dt;
    boss.y += (PVE.bossY - boss.y) * Math.min(1, dt * 2.4);
    if (p.t <= 0) { boss.y = PVE.bossY; boss.present = true; p.sub = 'boss'; p.t = PVE.bossMinutes * 60; p.spawnT = 8; }
  } else if (p.sub === 'boss') {
    p.t -= dt; p.spawnT -= dt;
    boss.x = 360 + Math.sin(game.time * 0.35) * 70;
    if (p.spawnT <= 0) { p.spawnT = Math.max(5, 9 - p.stage * 0.2); spawnFormation(game, true); }
    const pct = boss.core / boss.coreMax;
    const rage = pct > 0.66 ? 1 : pct > 0.33 ? 2 : 3;
    if (rage > boss.rage) {
      boss.rage = rage;
      game.emit('banner', { team: 'red', text: rage === 2 ? '母舰受创，开始蓄力湮灭炮！' : '母舰狂暴！弹幕全面加强', tier: 3 });
    }
    boss.patT -= dt;
    if (boss.patT <= 0) {
      boss.patT = rage === 1 ? 5 : rage === 2 ? 4 : 3.2;
      const kind = rage === 1 ? 'bossRing' : (game.random() < 0.5 ? 'bossRing' : 'bossFlower');
      game.spawnPattern('red', kind, boss.x, boss.y + boss.coreDy + 60, null);
    }
    if (rage >= 2) {
      boss.cannonT -= dt;
      if (boss.cannonT <= 0 && boss.cannon.state === 'idle') {
        boss.cannonT = PVE.bossCannonEvery;
        game.chargeCannon(boss, null, { name: '异形母舰', dmgFrac: PVE.bossCannonDamage });
      }
    }
  }
  for (const tu of boss.turrets) { tu.x = boss.x + tu.dx; tu.y = boss.y + tu.dy; }
}

// 一组异形从上方进场
export function spawnFormation(game, light) {
  const p = game.pve;
  const fleet = game.countTeam('blue');
  const n = Math.max(2, Math.min(12, 4 + Math.floor(fleet / 6)) >> (light ? 1 : 0));
  const r = game.random();
  const gunnerP = Math.min(0.3, 0.1 + p.stage * 0.02);
  if (r < gunnerP) {
    const k = 1 + (p.stage >= 4 && game.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < k; i++) spawnAlien(game, 'gunner', 180 + game.random() * 360, -40 - i * 60);
    return;
  }
  const kind = r < gunnerP + 0.36 ? 'diver' : 'swarm';
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
  const hp = Math.round(def.hp * (1 + 0.12 * (stage - 1)) * 10) / 10;
  const [z0, z1] = PVE.alienZone;
  const f = {
    uid: `alien:${++game.alienSeq}`, alien: true, npc: true, kind, team: 'red', name: '',
    x, y, vx: 0, vy: 0, hp, maxHp: hp, alive: true, invuln: 0, shield: 0, merit: 0, kills: 0,
    level: 1, skin: 0, weapon: 'laser', power: 1, charge: 0, drones: 0, labelUntil: 0, lastActive: 0,
    t: 0, seed: game.random() * 10, fireCd: 1.5 + game.random() * 2.5, stage: 0,
    yStop: kind === 'gunner' ? 190 + game.random() * 130 : kind === 'diver' ? 220 + game.random() * 120 : z0 + 120 + game.random() * (z1 - z0 - 140),
    life: kind === 'gunner' ? 30 : 14 + game.random() * 6, tx: 260 + game.random() * 200,
  };
  game.fighters.set(f.uid, f);
  return f;
}

export function stepAlien(game, f, dt) {
  f.t += dt;
  const blue = game.teams.blue;
  if (f.kind === 'swarm') {
    if (f.t > f.life) { f.vy = -150; f.vx *= 0.95; }
    else if (f.y < f.yStop) { f.vy = 110; f.vx = Math.sin(f.t * 2 + f.seed) * 70; }
    else { f.vy = Math.sin(f.t * 1.3 + f.seed) * 20; f.vx = Math.sin(f.t * 1.1 + f.seed) * 120; }
    f.fireCd -= dt;
    if (f.fireCd <= 0 && f.y > 20 && f.t < f.life) {
      f.fireCd = 2.4 + game.random() * 1.8;
      const tgt = game.randomEnemy('red');
      if (tgt) { const a = Math.atan2(tgt.y - f.y, tgt.x - f.x); game.addBullet(f.x, f.y + 8, Math.cos(a) * 210, Math.sin(a) * 210, 5.5, 1, 'red', 'danmaku', f.uid, 0, { hue: 0 }); }
    }
  } else if (f.kind === 'diver') {
    if (f.stage === 0) { f.vy = 90; f.vx = Math.sin(f.t * 2.2 + f.seed) * 40; if (f.y >= f.yStop) { f.stage = 1; f.t = 0; } }
    else if (f.stage === 1) { f.vx *= 0.9; f.vy *= 0.9; if (f.t > 0.8) { f.stage = 2; game.emit('dive', { x: f.x, y: f.y }); } }
    else {
      const dx = f.tx - f.x;
      f.vx += Math.sign(dx) * Math.min(Math.abs(dx), 260) * dt * 3; f.vx = Math.max(-160, Math.min(160, f.vx));
      f.vy = Math.min(320, f.vy + 520 * dt);
      if (f.y >= blue.def.flagY - 70) {
        const stage = game.pve?.stage || 1;
        game.damageFlag('blue', PVE.diverDamage * (1 + 0.1 * (stage - 1)), null, 'shot', true);
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
    if (f.fireCd <= 0 && f.y > 60 && f.t < f.life) { f.fireCd = 2.8; game.spawnPattern('red', 'gunnerFan', f.x, f.y + 20, f.uid); }
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
