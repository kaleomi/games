import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, parseCommand, tierForGift } from '../src/game.js';
import { Save, weekKeyOf } from '../src/save.js';
import { GiftCounter, normalizeMessage, routeMessage } from '../src/relay.js';
import { GIFT, MERIT } from '../src/config.js';

function seeded(seed = 7) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function memStorage() { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; }
function newGame(opts = {}) { const save = new Save({ storage: memStorage() }); return { save, game: new Game({ save, random: seeded(), ...opts }) }; }
function toBattle(game) { game.phaseT = 0.001; game.step(1 / 60); assert.equal(game.phase, 'battle'); }

test('弹幕指令解析', () => {
  assert.deepEqual(parseCommand('红'), { type: 'team', team: 'red' });
  assert.deepEqual(parseCommand('蓝队'), { type: 'team', team: 'blue' });
  assert.equal(parseCommand('激光').weapon, 'laser');
  assert.equal(parseCommand('换散弹').weapon, 'spread');
  assert.equal(parseCommand('蓄力').weapon, 'charge');
  assert.equal(parseCommand('左').lane, 'L');
  assert.equal(parseCommand('打核心').target, 'core');
  assert.equal(parseCommand('拦截拦截').type, 'intercept');
  assert.equal(parseCommand('主播好帅'), null);
  assert.equal(parseCommand(''), null);
});

test('礼物按单价分档，按名字指定优先', () => {
  const s = { tiers: [1, 10, 50, 200, 1000], giftTierByName: { 墨镜: 3 } };
  assert.equal(tierForGift({ name: '小心心', price: 1 }, s), 1);
  assert.equal(tierForGift({ name: 'x', price: 10 }, s), 2);
  assert.equal(tierForGift({ name: 'x', price: 199 }, s), 3);
  assert.equal(tierForGift({ name: 'x', price: 299 }, s), 4);
  assert.equal(tierForGift({ name: 'x', price: 3000 }, s), 5);
  assert.equal(tierForGift({ name: '墨镜', price: 99 }, s), 3);
  assert.equal(tierForGift({ name: '未知', price: NaN }, s), 1);
});

test('加入时自动分到人少的一队，开战后不能换队', () => {
  const { game } = newGame();
  game.chat({ id: 'a', name: 'A' }, '红');
  const b = game.join({ id: 'b', name: 'B' });
  assert.equal(b.team, 'blue');
  toBattle(game);
  game.chat({ id: 'a', name: 'A' }, '蓝');
  assert.equal(game.fighters.get('a').team, 'red');
});

test('人少时补位NPC，真人加入后NPC减少，NPC不进战功榜', () => {
  const { game } = newGame({ settings: { npcMinPerTeam: 4 } });
  const npcRed = () => [...game.fighters.values()].filter(f => f.npc && f.team === 'red').length;
  assert.equal(npcRed(), 4);
  game.chat({ id: 'a', name: 'A' }, '红');
  assert.equal(npcRed(), 3);
  toBattle(game);
  for (let i = 0; i < 600; i++) game.step(1 / 60);
  assert.ok(game.roundBoard('red', 10).every(f => !f.npc));
});

test('开战前送的礼物不丢，开战后生效', () => {
  const { game } = newGame();
  game.gift({ id: 'g', name: '大哥' }, { name: '嘉年华', price: 300, count: 1 });
  assert.equal(game.pendingGifts.length, 1);
  toBattle(game);
  assert.equal(game.pendingGifts.length, 0);
  const team = game.fighters.get('g').team;
  for (let i = 0; i < 3; i++) game.step(1 / 60);
  assert.equal(game.battleships.filter(s => s.team === team).length, 1);
  assert.equal(game.battleships[0].name, '大哥号');
});

test('战功只来自战果：送礼本身不加战功', () => {
  const { game } = newGame();
  toBattle(game);
  const f = game.join({ id: 'rich', name: '土豪' });
  game.gift({ id: 'rich' }, { name: '火箭', price: 1000, count: 1 });
  game.gift({ id: 'rich' }, { name: '小心心', price: 1, count: 50 });
  assert.equal(f.merit, 0);
});

test('主播主炮：对面拦截最多削弱60%', () => {
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  toBattle(game);
  const a = game.join({ id: 'a', name: 'A' }, 'red');
  for (let i = 0; i < 100; i++) game.join({ id: 'b' + i, name: 'B' + i }, 'blue');
  game.gift({ id: 'a' }, { name: '火箭', price: 1000, count: 1 });
  assert.equal(game.teams.red.cannon.state, 'charging');
  let t = 0;
  for (let i = 0; i < 100; i++) { game.clock += 1; game.chat({ id: 'b' + i }, '拦截'); }
  assert.equal(game.teams.red.cannon.intercept, GIFT.interceptCap);
  const before = game.teams.blue.core;
  while (game.teams.red.cannon.state === 'charging' && t < 10) { game.step(1 / 60); t += 1 / 60; }
  const lost = before - game.teams.blue.core;
  const expected = game.teams.blue.coreMax * GIFT.cannonDamage * (1 - GIFT.interceptCap);
  assert.ok(lost >= expected * 0.99 && lost < expected * 1.3, `主炮伤害 ${lost} 预期约 ${expected}`);
  assert.ok(a.merit > 0);
  assert.ok(game.fighters.get('b0').merit >= MERIT.intercept);
});

test('同一火箭连送多个：第一个开主炮，其余变成战舰', () => {
  const { game } = newGame();
  toBattle(game);
  const f = game.join({ id: 'r', name: 'R' });
  game.gift({ id: 'r' }, { name: '火箭', price: 1000, count: 3 });
  assert.equal(game.teams[f.team].cannon.state, 'charging');
  assert.equal(game.teams[f.team].shipQueue.length, 2);
});

test('一局结束：真人获得经验并写入存档，测试观众不写入', () => {
  const { game, save } = newGame();
  game.chat({ id: 'p', name: '玩家' }, '红');
  game.chat({ id: 'test:1', name: '测试1' }, '蓝');
  toBattle(game);
  game.teams.blue.core = 0;
  game.step(1 / 60);
  assert.equal(game.phase, 'result');
  assert.equal(game.winner, 'red');
  const p = save.peek('p');
  assert.equal(p.games, 1); assert.equal(p.wins, 1);
  assert.ok(p.xp > 0 || p.level > 1);
  assert.equal(save.peek('test:1'), null);
});

test('一局能自然打完且不报错（30人，10分钟）', () => {
  const { game } = newGame();
  for (let i = 0; i < 30; i++) game.chat({ id: 'u' + i, name: 'U' + i }, i % 2 ? '红' : '蓝');
  toBattle(game);
  for (let i = 0; i < 60 * 600 && game.phase === 'battle'; i++) {
    game.step(1 / 60);
    if (i % 300 === 0) game.gift({ id: 'u' + (i % 30) }, { name: 'x', price: [1, 10, 50, 200][i % 4], count: 1 });
    if (i % 120 === 0) game.like({ id: 'u' + (i % 30) }, 20);
  }
  assert.ok(game.bullets.length <= 3200);
  assert.ok(game.teams.red.core < game.teams.red.coreMax || game.teams.blue.core < game.teams.blue.coreMax);
});

test('点赞充能每人每秒有上限', () => {
  const { game } = newGame();
  toBattle(game);
  const f = game.join({ id: 'l', name: 'L' });
  game.like({ id: 'l' }, 1000);
  assert.equal(f.charge, 30);
});

test('连击礼物累计数量换算成新增数量', () => {
  const c = new GiftCounter();
  const m = (count, end, group = 'g1') => ({ user: { id: 'u' }, gift: { id: 1, name: '小心心', count, type: 1, repeatEnd: end, groupId: group } });
  assert.equal(c.count(m(1, 0), 0), 1);
  assert.equal(c.count(m(5, 0), 100), 4);
  assert.equal(c.count(m(5, 1), 200), 0);
  assert.equal(c.count(m(3, 0, 'g2'), 300), 3);
});

test('消息去重：同一条弹幕和同一帧礼物只处理一次', () => {
  const calls = { chat: 0, gift: 0 };
  const h = { chat: () => calls.chat++, gift: () => calls.gift++ };
  const state = { seen: new Set(), counter: new GiftCounter(), now: () => 0 };
  const chat = normalizeMessage({ method: 'WebcastChatMessage', id: 9, content: '红', user: { id: 1, nickname: 'A' } });
  routeMessage(chat, h, state); routeMessage(chat, h, state);
  const gift = normalizeMessage({ method: 'WebcastGiftMessage', id: 10, user: { id: 1 }, gift: { id: 2, name: '玫瑰', count: 1, diamondCount: 1 } });
  routeMessage(gift, h, state); routeMessage(gift, h, state);
  assert.deepEqual(calls, { chat: 1, gift: 1 });
});

test('没有用户ID的礼物不乱记到别人头上', () => {
  let unknown = 0, gifts = 0;
  const state = { seen: new Set(), counter: new GiftCounter(), now: () => 0 };
  routeMessage(normalizeMessage({ method: 'WebcastGiftMessage', id: 1, user: { nickname: '神秘人' }, gift: { name: '火箭', count: 1, price: 1000 } }), { unknownGift: () => unknown++, gift: () => gifts++ }, state);
  assert.equal(unknown, 1); assert.equal(gifts, 0);
});

test('存档：导入校验、每周战功清零', () => {
  let now = new Date(2026, 9, 20).getTime();
  const s = new Save({ storage: memStorage(), now: () => now });
  const p = s.get('x', '玩家');
  p.weekMerit = 500; p.merit = 500;
  now = new Date(2026, 9, 27).getTime();
  s.rollWeek();
  assert.equal(s.peek('x').weekMerit, 0);
  assert.equal(s.peek('x').merit, 500);
  assert.throws(() => s.importJson('{"version":2}'));
  assert.equal(weekKeyOf(new Date(2026, 9, 25).getTime()), '2026-10-19');
});

test('弹幕「换讨伐」投票：在场一半人同意就切换，红蓝玩家进同一舰队；切回对战恢复原队伍', () => {
  const { game, save } = newGame();
  for (let i = 0; i < 4; i++) game.chat({ id: 'v' + i, name: 'V' + i }, i % 2 ? '红' : '蓝');
  assert.deepEqual(parseCommand('换讨伐'), { type: 'mode', mode: 'pve' });
  assert.deepEqual(parseCommand('换成对战'), { type: 'mode', mode: 'pvp' });
  game.chat({ id: 'v0' }, '换讨伐');
  assert.equal(game.mode, 'pvp');
  assert.equal(game.voteView().votes, 1);
  game.chat({ id: 'v1' }, '换讨伐');
  assert.equal(game.mode, 'pve');
  assert.equal(save.data.mode, 'pve');
  assert.equal(game.phase, 'lobby');
  assert.ok(game.humans().every(f => f.team === 'blue'));
  assert.equal(game.teams.red.boss, true);
  game.chat({ id: 'v0' }, '换对战'); game.chat({ id: 'v3' }, '换对战');
  assert.equal(game.mode, 'pvp');
  assert.equal(game.fighters.get('v1').team, 'red');
  assert.equal(game.fighters.get('v0').team, 'blue');
});

test('讨伐模式：虫群后母舰现身，打爆进下一关，全队阵亡退回一关', () => {
  const { game, save } = newGame();
  game.setMode('pve');
  save.data.pveStage = 3; game.startLobby();
  game.chat({ id: 'p', name: '玩家' }, '加入');
  toBattle(game);
  assert.equal(game.pve.sub, 'wave');
  assert.equal(game.teams.red.present, false);
  game.pve.t = 0.001;
  for (let i = 0; i < 60 * 4; i++) game.step(1 / 60);
  assert.equal(game.pve.sub, 'boss');
  assert.equal(game.teams.red.present, true);
  game.teams.red.core = 0; game.step(1 / 60);
  assert.equal(game.phase, 'result');
  assert.equal(save.data.pveStage, 4);
  assert.equal(save.data.pveBest, 3);
  // 下一局失败
  game.phaseT = 0.001; game.step(1 / 60); toBattle(game);
  assert.equal(game.pve.stage, 4);
  for (const f of game.fighters.values()) if (!f.alien) { f.alive = false; f.respawn = 99; }
  game.step(1 / 60);
  assert.equal(game.phase, 'result');
  assert.equal(save.data.pveStage, 3);
});

test('讨伐模式：母舰没出现时送火箭，主炮蓄满等母舰现身再打', () => {
  const { game } = newGame();
  game.setMode('pve');
  toBattle(game);
  game.gift({ id: 'r', name: 'R' }, { name: '火箭', price: 1000, count: 1 });
  const c = game.teams.blue.cannon;
  for (let i = 0; i < 60 * 10; i++) game.step(1 / 60);
  assert.equal(c.state, 'charging');
  game.pve.t = 0.001;
  for (let i = 0; i < 60 * 4; i++) game.step(1 / 60);
  const before = game.teams.red.core;
  for (let i = 0; i < 60 * 5 && c.state === 'charging'; i++) game.step(1 / 60);
  assert.ok(before - game.teams.red.core >= game.teams.red.coreMax * 0.09);
});

test('讨伐模式整局能打完，异形会被击落且不进榜单', () => {
  const { game } = newGame();
  game.setMode('pve');
  for (let i = 0; i < 12; i++) game.chat({ id: 'u' + i, name: 'U' + i }, '加入');
  toBattle(game);
  let sawAlien = false;
  for (let i = 0; i < 60 * 60 * 8 && game.phase === 'battle'; i++) {
    game.step(1 / 60);
    if (!sawAlien && [...game.fighters.values()].some(f => f.alien)) sawAlien = true;
    if (i % 600 === 0) game.gift({ id: 'u' + (i % 12) }, { name: 'x', price: [10, 50, 200][i % 3], count: 1 });
  }
  assert.ok(sawAlien);
  assert.equal(game.phase, 'result');
  assert.ok(game.roundBoard('blue', 20).every(f => !f.alien && !f.npc));
  assert.ok(game.humans().some(f => f.kills > 0));
});

test('讨伐模式：选战舰；医疗舰自动给血量最低的三艘回血，平时也会自动索敌开火', () => {
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 'h', name: '奶妈' }, '医疗');
  game.chat({ id: 'a', name: 'A' }, '输出');
  game.chat({ id: 'b', name: 'B' }, '输出');
  game.chat({ id: 'c', name: 'C' }, '机甲');
  const [h, a, b, c] = ['h', 'a', 'b', 'c'].map(id => game.fighters.get(id));
  assert.equal(h.cls, 'healer'); assert.equal(c.cls, 'tank');
  assert.ok(c.maxHp > a.maxHp * 2);
  toBattle(game);
  a.hp = a.maxHp * 0.3; b.hp = b.maxHp * 0.5; c.hp = c.maxHp * 0.9; h.hp = h.maxHp;
  h.skillCd = 0; h.fireCd = 0;
  const shotsBefore = game.bullets.filter(x => x.owner === 'h').length;
  game.step(1 / 60);
  assert.ok(a.hp > a.maxHp * 0.3 && b.hp > b.maxHp * 0.5 && c.hp > c.maxHp * 0.9, '自动回血，同时治疗3艘');
  assert.ok(h.skillCd > 9, '冷却10秒');
  assert.ok(h.merit > 0);
  assert.ok(game.bullets.filter(x => x.owner === 'h').length > shotsBefore, '有人受伤时医疗舰照样开火');
});

test('讨伐模式：红色区域10秒后命中，发「左/中/右」躲开就没事；付费自动躲弹会自己躲', async () => {
  const { castZone } = await import('../src/pve.js');
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 'stay', name: '不动' }, '输出');
  game.chat({ id: 'move', name: '会躲' }, '输出');
  game.chat({ id: 'rich', name: '付费' }, '输出');
  toBattle(game);
  const ships = ['stay', 'move', 'rich'].map(id => game.fighters.get(id));
  for (const f of ships) { f.lane = 'M'; f.x = 360; f.invuln = 0; }
  game.gift({ id: 'rich' }, { name: '小心心', price: 1, count: 20 });
  assert.equal(game.fighters.get('rich').dodgeLeft, 120);
  game.pve.t = 999;
  for (const f of [...game.fighters.values()]) if (f.alien) game.fighters.delete(f.uid);
  const z = castZone(game, 'strike', 1, '测试');
  assert.equal(z.warn, 10);
  assert.ok(z.lanes.includes('M'));
  game.chat({ id: 'move' }, '左');
  const hp0 = ships.map(f => f.hp);
  for (let i = 0; i < 60 * 10.2; i++) { game.step(1 / 60); for (const f of [...game.fighters.values()]) if (f.alien) game.fighters.delete(f.uid); game.bullets.length = 0; }
  assert.ok(ships[0].hp < hp0[0] * 0.5, '原地不动的被打');
  assert.ok(ships[1].hp >= hp0[1] - 1, '发「左」的躲开了');
  assert.notEqual(ships[2].lane, 'M');
  assert.ok(ships[2].hp >= hp0[2] - 1, '付费自动躲开');
});

test('讨伐模式：机甲「冲击」击退虫群、打散子弹；「无敌冲锋斩」无敌4秒冲进怪堆旋风斩再飞回', async () => {
  const { spawnAlien } = await import('../src/pve.js');
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 't', name: '坦' }, '机甲');
  toBattle(game);
  game.pve.spawnT = 999;
  for (const f of [...game.fighters.values()]) if (f.alien) game.fighters.delete(f.uid);
  const t = game.fighters.get('t');
  t.lane = 'M'; t.x = 360; t.y = 650; t.slotDx = 0; t.wanderX = 0;
  // 冲击：正前方的虫和子弹
  const a = spawnAlien(game, 'gunner', 360, 450);
  game.addBullet(360, 560, 0, 0, 5, 1, 'red', 'danmaku', null, 0);
  const y0 = a.y, hp0 = a.hp;
  game.chat({ id: 't' }, '冲击'); game.step(1 / 60);
  assert.ok(a.hp < hp0, '冲击造成伤害');
  assert.ok(a.y < y0 - 10, '冲击击退');
  assert.equal(game.bullets.filter(b => b.team === 'red').length, 0, '冲击打散子弹');
  assert.ok(t.taunt > 0 && t.merit > 0);
  // 无敌冲锋斩
  const pack = [0, 1, 2, 3].map(i => spawnAlien(game, 'swarm', 150 + i * 20, 300 + (i % 2) * 20));
  for (const p of pack) { p.hp = 1e4; p.yStop = 300; }
  game.chat({ id: 't' }, '冲锋斩'); game.step(1 / 60);
  assert.ok(t.rushT > 3.9 && t.invuln >= 3.9, '无敌4秒');
  const hp1 = t.hp;
  for (let i = 0; i < 60 * 1.5; i++) game.step(1 / 60);
  assert.ok(Math.hypot(t.x - 180, t.y - 330) < 140, `冲到怪堆 ${t.x},${t.y}`);
  assert.ok(pack.some(p => p.hp < 1e4), '旋风斩打到怪');
  castZoneHit(game, t);
  assert.equal(t.hp, hp1, '无敌期间不掉血');
  for (let i = 0; i < 60 * 3; i++) game.step(1 / 60);
  for (const f of [...game.fighters.values()]) if (f.alien) game.fighters.delete(f.uid);
  for (let i = 0; i < 60 * 3; i++) game.step(1 / 60);
  assert.equal(t.rushT, 0);
  assert.ok(t.y >= 600 && !t.returning, '结束后飞回航道');
});

function castZoneHit(game, f) { game.hurtFighter ? game.hurtFighter(f, 999, null) : null; }

test('讨伐模式：打爆母舰按贡献掉装备，自动穿戴并提升属性，存档保存', () => {
  const { game, save } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  for (let i = 0; i < 5; i++) game.chat({ id: 'g' + i, name: 'G' + i }, '输出');
  toBattle(game);
  game.humans().forEach((f, i) => { f.merit = 100 + i; });
  const atk0 = game.fighters.get('g4').stats.atk, hp0 = game.fighters.get('g4').maxHp;
  game.pve.t = 0.001;
  for (let i = 0; i < 60 * 4; i++) game.step(1 / 60);
  game.teams.red.core = 0; game.step(1 / 60);
  const drops = game.drainEvents().filter(e => e.type === 'loot');
  assert.ok(drops.length >= 3);
  const top = game.fighters.get('g4');
  const p = save.peek('g4');
  assert.ok(Object.keys(p.gear).length >= 1, '第一名必掉并穿上');
  assert.ok(top.stats.atk > atk0 || top.maxHp > hp0 || top.stats.armor > 0 || top.stats.aspd > 0 || top.stats.crit > 0.05 || top.stats.critDmg > 1.5);
  const back = new Save({ storage: { getItem: () => save.exportJson(), setItem() {} } });
  assert.deepEqual(back.peek('g4').gear, p.gear);
});

test('讨伐模式：小技能自动放（冷却10秒），大招要发「大招」，冷却45秒', () => {
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 'd', name: '输出' }, '输出');
  toBattle(game);
  const d = game.fighters.get('d');
  game.step(1 / 60);
  assert.ok(game.bullets.some(b => b.owner === 'd' && b.missile), '小技能自动放导弹');
  assert.ok(d.skillCd > 9.5);
  for (let i = 0; i < 60 * 8; i++) game.step(1 / 60);
  assert.equal(d.beamT, 0, '不发弹幕不放大招');
  game.drainEvents();
  game.chat({ id: 'd' }, '技能');
  assert.ok(game.drainEvents().some(e => e.type === 'cd' && e.kind === 'auto'), '发「技能」提示小技能是自动的');
  game.chat({ id: 'd' }, '大招'); game.step(1 / 60);
  assert.ok(d.beamT > 0, '发「大招」放光束');
  assert.ok(Math.abs(d.ultCd - 45 * (1 - d.stats.haste)) < 0.1);
  game.drainEvents();
  game.chat({ id: 'd' }, '大招');
  assert.ok(game.drainEvents().some(e => e.type === 'cd' && e.kind === 'ult' && e.left >= 44), '冷却中提示剩余秒数');
  d.ultCd = 1; game.chat({ id: 'd' }, '光束');
  for (let i = 0; i < 70; i++) game.step(1 / 60);
  assert.ok(d.ultCd > 40, '冷却快好时发的指令排队，好了自动补放');
});

test('讨伐模式：机甲普攻冲上去近战砍，砍完退回本航道', async () => {
  const { spawnAlien } = await import('../src/pve.js');
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 't', name: 'T' }, '机甲');
  toBattle(game);
  game.pve.spawnT = 999;
  for (const f of [...game.fighters.values()]) if (f.alien) game.fighters.delete(f.uid);
  const t = game.fighters.get('t'); t.lane = 'M'; t.x = 360; t.y = 620; t.skillCd = 99;
  const a = spawnAlien(game, 'gunner', 400, 420); a.hp = 1e4; a.yStop = 420; a.fireCd = 999; a.skillT = 999;
  game.drainEvents();
  let minY = 999;
  for (let i = 0; i < 40; i++) { game.step(1 / 60); minY = Math.min(minY, t.y); a.y = 420; }
  assert.ok(minY < 480, `冲上去了 ${minY}`);
  assert.ok(a.hp < 1e4, '砍到了');
  assert.ok(game.drainEvents().some(e => e.type === 'slash'));
  assert.equal(game.bullets.filter(b => b.owner === 't').length, 0, '近战时不打远程');
  game.fighters.delete(a.uid);
  for (let i = 0; i < 60 * 2; i++) game.step(1 / 60);
  assert.ok(t.y >= 600, '退回本航道');
});

test('讨伐模式：每关限时2分钟（含虫群），超时退回一关', () => {
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 'a', name: 'A' }, '机甲');
  toBattle(game);
  const a = game.fighters.get('a');
  let result = null;
  for (let i = 0; i < 60 * 125 && !result; i++) {
    a.hp = a.maxHp; a.alive = true;
    game.step(1 / 60);
    for (const e of game.drainEvents()) if (e.type === 'result') result = e;
  }
  assert.ok(result, '2分钟内结束');
  assert.equal(result.clear, false); assert.equal(result.reason, 'timeout');
  assert.ok(game.time <= 121 + 25, `用时 ${game.time}`);
});

test('讨伐模式：航母放无人机打怪，大招护卫蜂群拦截子弹；输出舰光束自动瞄准别的航道的怪', async () => {
  const { spawnAlien } = await import('../src/pve.js');
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 'c', name: '航' }, '航母');
  game.chat({ id: 'd', name: '输' }, '输出');
  toBattle(game);
  game.pve.spawnT = 999;
  for (const f of [...game.fighters.values()]) if (f.alien) game.fighters.delete(f.uid);
  const c = game.fighters.get('c'), d = game.fighters.get('d');
  assert.equal(c.cls, 'carrier');
  const a = spawnAlien(game, 'gunner', 600, 300); a.hp = 1e4; a.yStop = 300; a.fireCd = 999; a.skillT = 999;
  game.chat({ id: 'c' }, '无人机'); game.step(1 / 60);
  assert.equal(game.pveDrones.filter(x => x.kind === 'attack').length, 4);
  for (let i = 0; i < 60 * 3; i++) game.step(1 / 60);
  assert.ok(a.hp < 1e4, '无人机打到怪');
  game.chat({ id: 'c' }, '蜂群'); game.step(1 / 60);
  assert.equal(game.pveDrones.filter(x => x.kind === 'guard').length, 10);
  for (let i = 0; i < 60; i++) game.step(1 / 60);
  const g0 = game.pveDrones.find(x => x.kind === 'guard');
  game.addBullet(g0.x, g0.y - 20, 0, 200, 5, 1, 'red', 'danmaku', null, 0);
  const m0 = c.merit;
  for (let i = 0; i < 10; i++) game.step(1 / 60);
  assert.ok(c.merit > m0, '护卫无人机拦截子弹记贡献');
  // 输出舰在中路，怪在右路：光束转过去打
  d.lane = 'M'; d.x = 360;
  const hp0 = a.hp;
  game.chat({ id: 'd' }, '大招');
  for (let i = 0; i < 60 * 2; i++) { game.step(1 / 60); d.x = 360; }
  assert.ok(d.beamAngle > 0.3, `光束转向右边 ${d.beamAngle}`);
  assert.ok(hp0 - a.hp > 100, '光束打到右路的怪');
});

test('装备：6个部位主属性+按品质的副属性，评分高的自动穿；暴击、攻速、防御生效；普攻自动索敌', async () => {
  const { rollItem, gearScore, shipStats, describeItem, nearestEnemy } = await import('../src/fleet.js');
  const { spawnAlien } = await import('../src/pve.js');
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const seen = new Set();
  for (let i = 0; i < 400; i++) {
    const it = rollItem(rnd, 8);
    seen.add(it.slot);
    assert.equal(it.subs.length, [0, 1, 2, 3, 4, 5][it.tier], '品质决定副属性条数');
    assert.ok(!it.subs.some(x => x.stat === ({ weapon: 'atk', armor: 'def', engine: 'aspd', scope: 'crit', core: 'critDmg', generator: 'hp' })[it.slot]), '副属性不和主属性重复');
    assert.ok(describeItem(it).includes('+'));
  }
  assert.equal(seen.size, 6);
  const lo = { slot: 'scope', tier: 0, roll: 1, subs: [] }, hi = { slot: 'scope', tier: 3, roll: 1, subs: [{ stat: 'atk', v: 0.16 }] };
  assert.ok(gearScore(hi) > gearScore(lo));
  const st = shipStats({ cls: 'dps', level: 1, gear: { scope: hi, armor: { slot: 'armor', tier: 4, roll: 1, subs: [] }, engine: { slot: 'engine', tier: 2, roll: 1, subs: [] } } });
  assert.ok(Math.abs(st.crit - (0.05 + 0.24)) < 1e-6, '暴击率 = 5% + 主属性');
  assert.ok(Math.abs(st.armor - 0.27) < 1e-6, '防御');
  assert.ok(Math.abs(st.aspd - 0.175) < 1e-6, '攻速');
  // 自动索敌：怪在右边，机甲（中路）的普攻往右飞
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 't', name: 'T' }, '机甲');
  toBattle(game);
  game.pve.spawnT = 999;
  for (const f of [...game.fighters.values()]) if (f.alien) game.fighters.delete(f.uid);
  const t = game.fighters.get('t'); t.lane = 'M'; t.x = 360; t.y = 650;
  const a = spawnAlien(game, 'gunner', 640, 300); a.hp = 1e4; a.yStop = 300;
  assert.equal(nearestEnemy(game, 360, 650), a);
  t.fireCd = 0; game.step(1 / 60);
  const b = game.bullets.find(x => x.owner === 't');
  assert.ok(b && b.vx > 100 && b.seek, '普攻朝怪的方向飞并追踪');
  for (let i = 0; i < 60 * 3; i++) { game.step(1 / 60); t.x = 360; }
  assert.ok(a.hp < 1e4, '打中了');
});

test('发「装备」弹出自己的装备卡片', () => {
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 'u', name: 'U' }, '输出');
  game.drainEvents();
  game.chat({ id: 'u' }, '装备');
  assert.ok(game.drainEvents().some(e => e.type === 'card' && e.uid === 'u' && e.gear));
});

test('经验＝贡献值：讨伐战斗中实时到账并当场升级，结算不重复算', async () => {
  const { LEVEL } = await import('../src/config.js');
  const { game, save } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 'x', name: 'X' }, '输出');
  toBattle(game);
  const f = game.fighters.get('x');
  const atk0 = f.stats.atk;
  f.merit += LEVEL.need(1) + LEVEL.need(2) + 10;
  game.drainEvents();
  for (let i = 0; i < 70; i++) game.step(1 / 60);
  const ev = game.drainEvents().filter(e => e.type === 'levelup');
  assert.ok(ev.length >= 1 && ev[ev.length - 1].level === 3, '实时升到3级');
  assert.equal(f.level, 3);
  assert.ok(f.stats.atk > atk0, '升级马上加攻击');
  const xp0 = save.peek('x').xp, lv0 = save.peek('x').level;
  game.endBattle('red', 'wipe');
  const p = save.peek('x');
  assert.equal(p.level, lv0);
  assert.ok(p.xp - xp0 <= 20 + Math.ceil(f.merit) - (LEVEL.need(1) + LEVEL.need(2) + 10) + 1, '结算只补没到账的部分');
});

test('装备经济：前5关不出红；多余分解成同色碎片，100个合成高一级；至尊重复变+1', async () => {
  const { rollItem, giveItem, shardsOf, makeItem, itemStats } = await import('../src/fleet.js');
  let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 3000; i++) assert.ok(rollItem(rnd, 5, 1).tier < 5, '前5关不出红');
  let red = 0; for (let i = 0; i < 3000; i++) if (rollItem(rnd, 6).tier === 5) red++;
  assert.ok(red > 0, '第6关开始会出红');
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 'k', name: 'K' }, '输出');
  const f = game.fighters.get('k');
  // 先穿一身紫，再塞白装：全部分解成白碎片，满100自动合成一件蓝装
  for (const slot of ['weapon', 'armor', 'engine', 'scope', 'core', 'generator']) giveItem(game, f, makeItem(rnd, slot, 2));
  for (let i = 0; i < 99; i++) giveItem(game, f, makeItem(rnd, 'weapon', 0));
  assert.equal(shardsOf(game, f)[0], 99);
  game.drainEvents();
  giveItem(game, f, makeItem(rnd, 'armor', 0));
  const ev = game.drainEvents();
  assert.ok(ev.some(e => e.type === 'craft' && e.from === 0 && e.item.tier === 1), '100个白碎片合成蓝装');
  assert.equal(shardsOf(game, f)[0], 0);
  assert.equal(shardsOf(game, f)[1], 1, '合出的蓝装不如身上的紫装 → 变成1个蓝碎片');
  // 至尊重复 → +1，属性 +10%
  giveItem(game, f, makeItem(rnd, 'weapon', 5));
  const v0 = itemStats({ ...f.gear.weapon })[0].v;
  giveItem(game, f, makeItem(rnd, 'weapon', 5));
  assert.equal(f.gear.weapon.plus, 1);
  assert.ok(Math.abs(itemStats({ ...f.gear.weapon })[0].v - v0 * 1.1) < 1e-9);
});
