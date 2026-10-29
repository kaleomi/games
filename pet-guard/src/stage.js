// 关卡：章节轮换、每关流程、心愿树、出怪、躲雨区域、全屏大招（撑伞）
import { W, FIELD, STAGE, CHAPTERS, ENEMY, FOES, ROUND, TREE, SCORE } from './config.js';
import { partOf, inZone, safeParts, partLabels, makeSpots, petCluster, damagePet, damageTree, score } from './combat.js';
import { spawnFoe, strikePose } from './foes.js';

export function chapterOf(n) { return Math.ceil(Math.max(1, n) / STAGE.chapterSize); }
export function stepOf(n) { return (Math.max(1, n) - 1) % STAGE.chapterSize + 1; }
export function stageKind(n) { const k = stepOf(n); return k === STAGE.chapterSize ? 'boss' : k === STAGE.chapterSize - 1 ? 'elite' : 'wave'; }
export const KIND_NAMES = { wave: '小怪', elite: '精英', boss: '首领' };
export function chapterDef(ch) { return CHAPTERS[(Math.max(1, ch) - 1) % CHAPTERS.length]; }
export function cycleOf(ch) { return Math.floor((Math.max(1, ch) - 1) / CHAPTERS.length); }
const CN = ['', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
export function cycleName(ch) { const c = cycleOf(ch); return c ? `第${CN[c] || c + 1}轮` : ''; }
export function stageLabel(n) { return `${chapterOf(n)}-${stepOf(n)}`; }
export function stageTitle(n) { const ch = chapterOf(n); return `第${ch}章 ${chapterDef(ch).name}${cycleName(ch) ? '·' + cycleName(ch) : ''}`; }
// 失败：回到本章第一关（等级、装备、天赋都留着）
export function failTarget(n) { const ch = chapterOf(n), start = (ch - 1) * STAGE.chapterSize + 1; return { stage: start, back: n > start }; }
export function stageMul(n) { return STAGE.bossGrow ** (chapterOf(n) - 1); }
export function dmgScale(game) { const n = game.stage?.n || 1; return 1 + ENEMY.dmgGrow * (chapterOf(n) - 1); }
export function bossMax(n) { return Math.round(STAGE.bossHp * stageMul(n)); }
export function leaderMax(n) { return Math.round(bossMax(n) * STAGE.leaderHp); }
export function eliteTotal(n) { return Math.round(bossMax(n) * STAGE.eliteHp); }
export function treeMax(n) { return Math.round(TREE.hp * (1 + TREE.grow * (chapterOf(n) - 1))); }

export function startStage(game, n) {
  const ch = chapterOf(n), def = chapterDef(ch), kind = stageKind(n);
  game.foes.length = 0; game.projs.length = 0; game.zones.length = 0; game.areas.length = 0; game.boss = null;
  game.dmgUnitHp = bossMax(n);
  const tm = treeMax(n);
  game.tree = { hp: tm, maxHp: tm, flash: 0 };
  game.stage = { n, ch, step: stepOf(n), kind, chapter: def, sub: kind === 'wave' ? 'wave' : 'enter', t: kind === 'wave' ? STAGE.waveSeconds(ch) : 2.2, spawnT: 1, thiefT: 6,
    left: kind === 'boss' ? ROUND.bossSeconds : ROUND.stageSeconds, limit: kind === 'boss' ? ROUND.bossSeconds : ROUND.stageSeconds, smallDrops: 0, purified: 0, elites: [] };
  game.emit('stage', { n, ch, step: stepOf(n), kind, chapter: def.id, name: def.name, title: stageTitle(n), label: stageLabel(n) });
  const intro = kind === 'wave' ? def.mood : kind === 'elite' ? `精英关 · ${def.elites.map(u => FOES[u].name).join('、')}` : `首领关 · ${FOES[def.boss].name}`;
  game.emit('banner', { text: `${stageTitle(n)} · ${stageLabel(n)}　${intro}`, tier: kind === 'boss' ? 5 : kind === 'elite' ? 4 : 2, stage: true });
}

export function stepStage(game, dt) {
  const s = game.stage;
  if (!s) return;
  s.left -= dt;
  stepZones(game, dt);
  if (game.tree) game.tree.flash = Math.max(0, game.tree.flash - dt);
  // 偷果鼠单独来（首领关也来）
  s.thiefT -= dt;
  if (s.thiefT <= 0 && s.sub !== 'enter') { s.thiefT = STAGE.waves.thiefEvery(s.ch) * (0.8 + game.random() * 0.4); if (s.chapter.minions.includes('thief')) spawnThief(game); }
  if (s.sub === 'wave') {
    s.t -= dt; s.spawnT -= dt;
    if (s.spawnT <= 0) { s.spawnT = STAGE.waves.every(s.ch); spawnWave(game); }
    if (s.t <= 0) {
      s.sub = 'leader'; s.spawnT = 6;
      const u = s.chapter.leader;
      const e = spawnFoe(game, u, 360, FIELD.enemyTop - 40, { role: 'elite', hp: leaderMax(s.n), name: `${FOES[u].name}头目`, force: true });
      if (e) { e.leader = true; s.leader = e.id; }
      game.emit('banner', { text: `「${FOES[u].name}头目」来了！净化它就过关`, tier: 4 });
    }
  } else if (s.sub === 'leader') {
    s.spawnT -= dt;
    if (s.spawnT <= 0) { s.spawnT = STAGE.waves.bossEvery(s.ch); spawnWave(game, true); }
    const L = game.foes.find(e => e.id === s.leader);
    if (!L || !L.alive || L.purified) s.cleared = true;
  } else if (s.sub === 'enter') {
    s.t -= dt;
    if (s.t <= 0) {
      if (s.kind === 'elite') {
        const list = s.chapter.elites, hp = Math.round(eliteTotal(s.n) / list.length);
        list.forEach((u, i) => { const e = spawnFoe(game, u, 200 + (i + 0.5) * (320 / list.length), FIELD.enemyTop - 30, { role: 'elite', hp, force: true }); if (e) s.elites.push(e.id); });
        s.sub = 'elite';
      } else {
        const u = s.chapter.boss;
        const e = spawnFoe(game, u, 360, FIELD.bossY - 80, { role: 'boss', hp: bossMax(s.n), force: true });
        game.boss = e; s.sub = 'boss';
        game.emit('bossIn', { name: FOES[u].name, unit: u });
      }
      s.spawnT = 6;
    }
  } else if (s.sub === 'elite') {
    s.spawnT -= dt;
    if (s.spawnT <= 0) { s.spawnT = STAGE.waves.bossEvery(s.ch); spawnWave(game, true); }
    if (!s.elites.some(id => game.foes.find(e => e.id === id && e.alive && !e.purified))) s.cleared = true;
  } else if (s.sub === 'boss') {
    s.spawnT -= dt;
    if (s.spawnT <= 0) { s.spawnT = STAGE.waves.bossEvery(s.ch) * 1.3; spawnWave(game, true); }
    if (!game.boss || !game.boss.alive || game.boss.purified) s.cleared = true;
  }
  if (game.tree && game.tree.hp <= 0) s.treeDown = true;
}

// 一队坏心情：从上方、左侧、右侧之一（大队一半概率分两个口）
export function pickGate(game, not = null) {
  const G = STAGE.gates, list = ['top', 'left', 'right'].filter(g => g !== not);
  let r = game.random() * list.reduce((s, g) => s + G[g], 0);
  for (const g of list) { r -= G[g]; if (r <= 0) return g; }
  return list[list.length - 1];
}
export function spawnWave(game, light = false) {
  const s = game.stage, ch = s.ch;
  let alive = 0; for (const e of game.foes) if (e.alive && !e.purified && e.role === 'minion') alive++;
  const room = STAGE.waves.maxAlive(ch) - alive;
  if (room <= 0) return 0;
  const pets = game.petCount || 1;
  const n = Math.min(room, Math.max(2, Math.min(26, STAGE.waves.size(ch) + Math.floor(pets / 5)) >> (light ? 1 : 0)));
  const pool = s.chapter.minions.filter(u => u !== 'thief');
  let ranged = 0; for (const e of game.foes) if (e.alive && e.kind === 'ranged') ranged++;
  const melee = pool.filter(u => FOES[u].kind !== 'ranged');
  const units = [];
  for (let i = 0; i < n; i++) {
    let u = pool[Math.floor(game.random() * pool.length)];
    if (FOES[u].kind === 'ranged') { if (ranged >= 6 && melee.length) u = melee[Math.floor(game.random() * melee.length)]; else ranged++; }
    units.push(u);
  }
  const g1 = pickGate(game);
  const g2 = n >= STAGE.gates.splitFrom && game.random() < 0.5 ? pickGate(game, g1) : null;
  const groups = { top: [], left: [], right: [] };
  units.forEach((u, i) => groups[FOES[u].fly ? 'top' : g2 && i % 2 ? g2 : g1].push(u));
  for (const [gate, list] of Object.entries(groups)) if (list.length) spawnGroup(game, gate, list);
  return n;
}
function spawnGroup(game, gate, list) {
  const n = list.length, r = game.random;
  if (gate === 'top') {
    const cx = 120 + r() * 480;
    list.forEach((u, i) => spawnFoe(game, u, Math.max(30, Math.min(690, cx + (i - (n - 1) / 2) * 46 + (r() - 0.5) * 20)), FIELD.enemyTop - 20 - r() * 50));
    return;
  }
  const side = gate === 'left' ? -1 : 1, Y = STAGE.gates.sideY;
  const rows = Math.min(3, n), gy = Y[0] + r() * (Y[1] - Y[0]);
  list.forEach((u, i) => {
    const row = i % rows, col = Math.floor(i / rows);
    const y = Math.max(FIELD.enemyTop + 30, Math.min(FIELD.bottom - 120, gy + (row - (rows - 1) / 2) * 42 + (r() - 0.5) * 12));
    const x = side < 0 ? -40 - col * 46 : W + 40 + col * 46;
    const e = spawnFoe(game, u, x, y);
    if (e) { e.enter = { x: side < 0 ? 50 + r() * 80 : W - 50 - r() * 80, y }; e.facing = -side; }
  });
  game.emit('gate', { side: gate, y: gy, n });
}
function spawnThief(game) {
  let n = 0; for (const e of game.foes) if (e.alive && e.kind === 'thief') n++;
  if (n >= 3) return;
  const fromSide = game.random() < 0.5;
  if (fromSide) {
    const side = game.random() < 0.5 ? -1 : 1, y = 560 + game.random() * 200;
    const e = spawnFoe(game, 'thief', side < 0 ? -40 : W + 40, y);
    if (e) { e.enter = { x: side < 0 ? 60 : W - 60, y }; game.emit('gate', { side: side < 0 ? 'left' : 'right', y, n: 1, thief: true }); }
  } else spawnFoe(game, 'thief', 80 + game.random() * 560, FIELD.enemyTop - 20);
  game.emit('thief', {});
}

// ───────── 躲雨区域 ─────────
// o: { shape, cx, cy, dir, danger, count, warn, name, fx, sleep, stun, slam }
export function castZone(game, kind, caster, o = {}) {
  if (game.zones.length) return null;
  const full = kind === 'blast';
  const warn = o.warn || (full ? 6 : STAGE.zoneWarn);
  const z = { id: ++game.zoneSeq, kind, name: o.name || (full ? '大招' : '重击'), frac: full ? 1 : o.slam ? 0.7 : 0.6, full, shape: o.shape || 'rings', cx: o.cx ?? W / 2, cy: o.cy ?? 640, danger: [],
    warn, max: warn, caster, intercept: 0, fx: o.fx || 'slam', sleep: o.sleep || 0, stun: o.stun || 0, slam: !!o.slam, freeze: o.freeze || 0 };
  if (!z.full) {
    if (z.shape === 'fan') {
      const t = o.dir || petCluster(game) || { x: W / 2, y: FIELD.bottom };
      let ax = t.x - z.cx, ay = t.y - z.cy; if (Math.hypot(ax, ay) < 40) { ax = 0; ay = 1; }
      const d = Math.hypot(ax, ay); z.ax = ax / d; z.ay = ay / d;
    } else if (z.shape === 'rows') {
      const h = (FIELD.bottom - FIELD.top) / 3; z.rowY = [FIELD.top + h, FIELD.top + 2 * h]; z.labelX = 58;
    } else if (z.shape === 'spots') z.spots = makeSpots(game);
    const n = Math.min(2, o.count || 1);
    if (o.danger) z.danger = o.danger.slice(0, 2);
    else if (z.shape === 'spots') z.danger = [0, 1, 2].sort(() => game.random() - 0.5).slice(0, n);
    else {
      const count = [0, 0, 0];
      for (const f of game.pets.values()) if (f.alive && !f.egg) { const p = partOf(z, f.x, f.y); if (p >= 0) count[p]++; }
      z.danger = [0, 1, 2].sort((a, b) => count[b] - count[a] + (game.random() - 0.5) * 1.5).slice(0, n);
    }
    z.labels = partLabels(z);
  }
  z.inside = new Set();
  for (const f of game.pets.values()) {
    if (!f.alive || f.egg) continue;
    if (!inZone(z, f.x, f.y)) { if (!z.full) { f.ring = partOf(z, f.x, f.y); f.ringZ = z.id; } }
    else if (!f.npc && !f.merc) z.inside.add(f.uid);
  }
  game.zones.push(z);
  game.emit('zone', { kind, full: z.full, shape: z.shape, danger: z.danger, caster, warn });
  if (z.full) game.emit('banner', { text: `${caster}蓄力「${z.name}」！${warn}秒后全屏落下，全员发「撑伞」挡一挡`, tier: 5 });
  else {
    const safe = safeParts(z).map(i => i + 1);
    game.emit('banner', { text: `${caster}「${z.name}」！${warn}秒后落下，发「${safe.join('」或「')}」躲开`, tier: z.danger.length > 1 ? 4 : 3 });
  }
  return z;
}
export function stepZones(game, dt) {
  for (let i = game.zones.length - 1; i >= 0; i--) {
    const z = game.zones[i];
    z.warn -= dt;
    if (z.full && z.warn > 0) autoIntercept(game, z);
    if (!z.full && z.warn < 2.5) strikePose(game, z);
    if (z.warn > 0) continue;
    game.zones.splice(i, 1);
    dodgeScore(game, z);
    const mult = (1 - Math.min(STAGE.intercept.max, z.intercept)) * dmgScale(game) ** 0.5;
    let hit = 0;
    for (const f of [...game.pets.values()]) {
      if (!f.alive || f.egg || !inZone(z, f.x, f.y)) continue;
      damagePet(game, f, f.maxHp * z.frac * mult, null, { unavoidable: z.full });
      if (f.alive && z.sleep) f.sleepUntil = game.clock + z.sleep;
      if (f.alive && z.stun) f.stunUntil = game.clock + z.stun;
      if (f.alive && z.freeze) f.stunUntil = game.clock + z.freeze;
      hit++;
    }
    // 全屏大招也会吹掉心愿果（撑伞挡得越多掉得越少）
    if (z.full && game.tree) damageTree(game, game.tree.maxHp * 0.12 * (1 - Math.min(STAGE.intercept.max, z.intercept)), null);
    game.emit('strike', { kind: z.kind, full: z.full, zone: z, hit, intercept: z.intercept });
    if (z.full || z.slam) game.emit('shake', { k: z.full ? 14 : 10 });
  }
}
function dodgeScore(game, z) {
  if (z.full) return;
  for (const uid of z.inside || []) { const f = game.pets.get(uid); if (f && f.alive && !inZone(z, f.x, f.y)) { score(game, f, SCORE.dodge); f.dodges = (f.dodges || 0) + 1; } }
}
// 撑伞：削弱全屏大招（每次1.5%，最多70%）；自动守护的萌宠自动撑，NPC、小伙伴慢一点也会撑
export function interceptZone(game, f, every = STAGE.intercept.every) {
  const z = game.zones.find(z => z.full);
  if (!z || !f.alive || f.egg || game.clock - (f.interceptT || 0) < every) return false;
  f.interceptT = game.clock; f.umbrellaT = 1.2; f.umbrellaZ = z.id;
  z.intercept = Math.min(STAGE.intercept.max, z.intercept + STAGE.intercept.per);
  game.emit('intercept', { uid: f.uid, x: f.x, y: f.y });
  return true;
}
function autoIntercept(game, z) {
  for (const f of game.pets.values()) {
    if (f.npc || f.merc) interceptZone(game, f, STAGE.intercept.npcEvery * (1 + (f.uid.length % 3) * 0.15));
    else if ((f.auto || 0) > 0) interceptZone(game, f);
  }
}
export { TREE };
