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

test('讨伐模式：选战舰；医疗舰先给血量最低的两艘回血，全员满血才攻击', () => {
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
  a.hp = a.maxHp * 0.3; b.hp = b.maxHp * 0.5; c.hp = c.maxHp * 0.9;
  h.skillCd = 0; h.fireCd = 0;
  const shotsBefore = game.bullets.filter(x => x.owner === 'h').length;
  game.step(1 / 60);
  assert.ok(a.hp > a.maxHp * 0.3 && b.hp > b.maxHp * 0.5);
  assert.equal(c.hp, c.maxHp * 0.9);
  assert.equal(game.bullets.filter(x => x.owner === 'h').length, shotsBefore);
  assert.ok(h.merit > 0);
  for (const f of [a, b, c, h]) f.hp = f.maxHp;
  h.fireCd = 0; game.step(1 / 60);
  assert.ok(game.bullets.some(x => x.owner === 'h'));
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
  assert.ok(game.fighters.get('rich').dodgeUntil > game.clock + 100);
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

test('讨伐模式：机甲大招立起屏障挡子弹，挨打和挡子弹都记贡献', () => {
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 't', name: '坦' }, '机甲');
  toBattle(game);
  const t = game.fighters.get('t');
  t.energy = 100; t.wantUlt = true; game.step(1 / 60);
  assert.equal(game.barriers.length, 1);
  const bar = game.barriers[0];
  const before = t.merit;
  game.addBullet((game.constructor && 360) && (t.lane === 'L' ? 134 : t.lane === 'M' ? 360 : 586), bar.y - 30, 0, 300, 5, 1, 'red', 'danmaku', null, 0);
  for (let i = 0; i < 30; i++) game.step(1 / 60);
  assert.ok(t.merit > before);
});

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
  assert.ok(top.stats.atk > atk0 || top.maxHp > hp0 || top.stats.haste > 0 || top.stats.power > 1);
  const back = new Save({ storage: { getItem: () => save.exportJson(), setItem() {} } });
  assert.deepEqual(back.peek('g4').gear, p.gear);
});
