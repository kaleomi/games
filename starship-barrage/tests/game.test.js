import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, parseCommand, tierForGift } from '../src/game.js';
import { Save, weekKeyOf } from '../src/save.js';
import { GiftCounter, normalizeMessage, routeMessage } from '../src/relay.js';
import { GIFT, MERIT } from '../src/config.js';

function seeded(seed = 7) { return () => ((seed = (seed * 16807) % 2147483647) / 2147483647); }
function memStorage() { const m = new Map(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; }
function newGame(opts = {}) { const save = new Save({ storage: memStorage() }); return { save, game: new Game({ save, random: seeded(), ...opts, settings: { pvpEnabled: true, ...(opts.settings || {}) } }) }; }
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

test('讨伐模式：精英关虫群后BOSS现身，打爆进下一关；首领关失败退回本章第1关', () => {
  const { game, save } = newGame();
  game.setMode('pve');
  save.data.pveStage = 4; game.startLobby();
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
  assert.equal(save.data.pveStage, 5);
  assert.equal(save.data.pveBest, 4);
  // 打赢了：结算完直接下一关，不备战
  game.phaseT = 0.001; game.step(1 / 60);
  assert.equal(game.phase, 'battle');
  // 下一局（第5关首领）失败 → 本章第1关
  assert.equal(game.pve.stage, 5);
  assert.equal(game.pve.kind, 'boss');
  for (const f of game.fighters.values()) if (!f.alien) { f.alive = false; f.respawn = 99; }
  game.step(1 / 60);
  assert.equal(game.phase, 'result');
  assert.equal(save.data.pveStage, 1);
});

test('讨伐礼物：小心心/鲜花/爱你哟/墨镜/爱的爆炸/跑车 + 点赞士气 + 签到', async () => {
  const { lootFloorOf, teamAtkMul } = await import('../src/fleet.js');
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 'a', name: 'A' }, '输出');
  game.chat({ id: 'b', name: 'B' }, '医疗');
  toBattle(game);
  const a = game.fighters.get('a'), b = game.fighters.get('b');
  // 小心心：经验加成 + 立即放小技能
  a.skillCd = 9;
  game.gift({ id: 'a' }, { name: '小心心', price: 1, count: 3 });
  assert.ok(a.xpUntil - game.clock > 85 && a.skillCd === 0);
  // 鲜花：佣兵机甲 + 立即大招
  game.gift({ id: 'b' }, { name: '鲜花', price: 10, count: 1 });
  const merc = [...game.fighters.values()].find(f => f.merc && f.owner === 'b');
  assert.ok(merc && merc.cls === 'tank' && b.ultCd > 40);
  // 爱你哟：全队攻击+30%，自己保底橙装
  game.gift({ id: 'a' }, { name: '爱你哟', price: 52, count: 1 });
  assert.ok(Math.abs(teamAtkMul(game) - 1.3) < 1e-9);
  assert.equal(lootFloorOf(game, a), 3);
  // 墨镜：超级战机 + 保底紫装（橙更高所以还是橙）
  game.gift({ id: 'a' }, { name: '墨镜', price: 99, count: 1 });
  assert.ok(game.pveDrones.some(d => d.kind === 'super' && d.owner === 'a'));
  // 爱的爆炸：全场双倍掉落 + 保底金装
  game.gift({ id: 'b' }, { name: '礼花筒', price: 199, count: 1 });
  assert.equal(lootFloorOf(game, b), 4);
  game.humans().forEach(f => { f.merit = 100; });
  const { rollDrops } = await import('../src/fleet.js');
  const drops = rollDrops(game, 3);
  assert.equal(drops.filter(d => d.uid === 'b').length, 2, '双倍掉落');
  assert.ok(drops.filter(d => d.uid === 'b').every(d => d.item.tier >= 4), '保底金装');
  assert.ok(drops.filter(d => d.uid === 'a').every(d => d.item.tier >= 3), '保底橙装');
  // 跑车：宝箱魔王，打死后全员开箱
  game.gift({ id: 'a' }, { name: '跑车', price: 1200, count: 1 });
  const chest = [...game.fighters.values()].find(f => f.alien && f.kind === 'chest');
  assert.ok(chest && chest.maxHp > 1000);
  game.drainEvents();
  chest.hitters.add('a'); chest.hp = 1; game.hurtFighter(chest, 10, 'a');
  const ev = game.drainEvents();
  assert.ok(ev.filter(e => e.type === 'loot').length >= 2, '全员开箱');
  // 点赞士气：满500全队+10%
  game.drumUntil = 0;
  for (let i = 0; i < 30; i++) { game.clock += 1.01; game.like({ id: 'a' }, 20); }
  assert.ok(game.moraleUntil > game.clock && Math.abs(teamAtkMul(game) - 1.1) < 1e-9);
  // 签到：每天一次
  game.drainEvents();
  game.chat({ id: 'b' }, '签到'); game.chat({ id: 'b' }, '签到');
  assert.equal(game.drainEvents().filter(e => e.type === 'loot').length, 1);
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
  assert.equal(game.pve.sub, 'leader');
  game.drainEvents();
  game.fighters.get(game.pve.leader).hp = 1; game.fighters.get(game.pve.leader).alive = false; game.fighters.delete(game.pve.leader);
  game.pve.kind = 'boss';   // 按正常掉率测（1–3关掉率×30%另测）
  game.step(1 / 60); game.step(1 / 60);
  assert.equal(game.phase, 'result');
  const drops = game.drainEvents().filter(e => e.type === 'loot' && !e.source);
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
  const nb = game.bullets.filter(b => b.team === 'red').length;
  for (let i = 0; i < 10; i++) game.step(1 / 60);
  assert.ok(game.bullets.filter(b => b.team === 'red').length < nb, '护卫无人机拦截子弹');
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

test('装备经济：前5关不出红；同品质重复+1级(+2%)，低品质分解成同色碎片，100个合成高一级；换装继承强化', async () => {
  const { rollItem, giveItem, shardsOf, makeItem, itemStats, gearScore } = await import('../src/fleet.js');
  const { GEAR } = await import('../src/config.js');
  let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 3000; i++) assert.ok(rollItem(rnd, 5, 1).tier < 5, '前5关不出红');
  let red = 0; for (let i = 0; i < 3000; i++) if (rollItem(rnd, 6).tier === 5) red++;
  assert.ok(red > 0, '第6关开始会出红');
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 'k', name: 'K' }, '输出');
  const f = game.fighters.get('k');
  for (const slot of Object.keys(GEAR.slots)) giveItem(game, f, makeItem(rnd, slot, 2));
  // 同部位同品质 → +1级，每级+2%，不会自动升品
  const v0 = itemStats(f.gear.weapon)[0].v;
  giveItem(game, f, { ...makeItem(rnd, 'weapon', 2), roll: 0.5 });
  assert.equal(f.gear.weapon.plus, 1);
  assert.ok(Math.abs(itemStats(f.gear.weapon)[0].v - v0 * 1.02) < 1e-9, '+1 = 102%');
  f.gear.engine.plus = 12; giveItem(game, f, makeItem(rnd, 'engine', 2));
  assert.equal(f.gear.engine.tier, 2, '强化不会自动升品'); assert.equal(f.gear.engine.plus, 13);
  // 低品质 → 同色碎片；100个白碎片合成蓝装，补在最弱的部位
  for (let i = 0; i < 99; i++) giveItem(game, f, makeItem(rnd, 'armor', 0));
  assert.equal(shardsOf(game, f)[0], 99);
  game.drainEvents();
  giveItem(game, f, makeItem(rnd, 'core', 0));
  assert.ok(game.drainEvents().some(e => e.type === 'craft' && e.from === 0 && e.item.tier === 1), '100个白碎片合成蓝装');
  assert.equal(shardsOf(game, f)[0], 0);
  assert.equal(shardsOf(game, f)[1], 1, '合出的蓝装不如身上的紫装 → 变成1个蓝碎片');
  // 换上更高品质：旧装备的强化折算继承，新装备一定更强
  f.gear.scope.plus = 8;
  const old = gearScore(f.gear.scope);
  giveItem(game, f, makeItem(rnd, 'scope', 4));
  assert.equal(f.gear.scope.tier, 4);
  assert.ok(f.gear.scope.plus >= 1, '继承了强化');
  assert.ok(gearScore(f.gear.scope) > old);
  // 100金碎片 → 红；红装强化没有上限
  shardsOf(game, f)[4] = 100; giveItem(game, f, makeItem(rnd, 'armor', 0));
  assert.ok(Object.values(f.gear).some(it => it.tier === 5), '100金碎片合成红装');
  f.gear.core = { ...makeItem(rnd, 'core', 5), plus: 30 };
  giveItem(game, f, makeItem(rnd, 'core', 5));
  assert.equal(f.gear.core.plus, 31);
});

test('旧存档迁移：红+N（原来每级10%）×5，碎片保留', () => {
  const raw = JSON.stringify({ version: 1, players: { u: { uid: 'u', level: 3, shards: [50, 3, 0, 0, 1], gear: { weapon: { tier: 5, roll: 1, subs: [], plus: 2 }, armor: { tier: 2, roll: 1, subs: [], plus: 0 } } }, v: { uid: 'v', gv: 2, mat: 250, gear: {} } } });
  const s = new Save({ storage: { getItem: () => raw, setItem() {} } });
  const p = s.peek('u');
  assert.equal(p.gear.weapon.plus, 10);
  assert.deepEqual(p.shards, [50, 3, 0, 0, 1]);
  assert.equal(s.peek('v').shards[0], 25, '中间版本的余料折算成白碎片');
  const again = Save.validate(JSON.parse(s.exportJson()));
  assert.equal(again.players.u.gear.weapon.plus, 10, '只迁移一次');
});

test('贡献＝成长分E×有效行为：存活每5秒1E、技能6E、大招12E、送礼抖币×E；礼物触发的技能不算', async () => {
  const { growthE } = await import('../src/fleet.js');
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 'h', name: 'H' }, '医疗');
  toBattle(game);
  game.pve.spawnT = 999;
  const h = game.fighters.get('h');
  const E = growthE(h);
  assert.ok(E >= 1);
  h.merit = 0; h.aliveAcc = 0; h.skillCd = 999; h.ultCd = 999;
  for (let i = 0; i < 60 * 5 + 2; i++) game.step(1 / 60);
  assert.ok(Math.abs(h.merit - E) < 1e-9, '存活5秒 +1E');
  // 医疗保底：没人掉血 → 治疗链给队友加护盾，照样算有效技能
  h.merit = 0; h.skillCd = 0; game.step(1 / 60);
  assert.ok(Math.abs(h.merit - 6 * E) < 1e-9 && h.shieldHp > 0, '保底：护盾也算');
  // 护盾都满了（30%）→ 放不出去，不算
  h.shieldHp = h.maxHp * 0.3; h.merit = 0; h.skillCd = 0; game.step(1 / 60);
  assert.equal(h.merit, 0, '无效技能不算');
  // 有人受伤 → 治疗链成功 +6E
  game.chat({ id: 'x', name: 'X' }, '输出');
  const x = game.fighters.get('x'); x.hp = 10;
  h.merit = 0; h.skillCd = 0; game.step(1 / 60);
  assert.ok(Math.abs(h.merit - 6 * E) < 1e-9, '技能 +6E');
  // 大招 +12E
  h.merit = 0; h.ultCd = 0; game.chat({ id: 'h' }, '大招'); game.step(1 / 60);
  assert.ok(Math.abs(h.merit - 12 * E) < 1e-9, '大招 +12E');
  // 送礼：抖币 × E；小心心触发的技能不再加分
  x.hp = 10; h.merit = 0; h.skillCd = 5;
  game.gift({ id: 'h' }, { name: '小心心', price: 1, count: 3 });
  game.step(1 / 60);
  assert.ok(Math.abs(h.merit - 3 * E) < 1e-9, '只算礼物抖币');
  // 伤害不算贡献
  const d0 = x.merit; x.skillCd = 999; x.ultCd = 999; x.aliveAcc = -999;
  for (let i = 0; i < 120; i++) game.step(1 / 60);
  assert.equal(x.merit, d0);
});

test('躲开红区 +3E；E 由等级和装备决定', async () => {
  const { growthE, makeItem } = await import('../src/fleet.js');
  const { castZone } = await import('../src/pve.js');
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 'a', name: 'A' }, '输出');
  toBattle(game);
  game.pve.spawnT = 999;
  const a = game.fighters.get('a');
  const e1 = growthE(a);
  a.level = 20; a.gear = { weapon: makeItem(seeded(3), 'weapon', 3) };
  assert.ok(growthE(a) > e1 + 0.3);
  a.lane = 'L'; a.skillCd = 999; a.ultCd = 999; a.aliveAcc = -999;
  const z = castZone(game, 'strike', 1, 'test', ['L']);
  assert.ok(z);
  a.merit = 0;
  game.chat({ id: 'a' }, '右');
  z.warn = 0.001; game.step(1 / 60);
  assert.ok(Math.abs(a.merit - 3 * growthE(a)) < 1e-9);
});

test('章节：1–3关精英头目带队、第4关精英、第5关首领；失败规则', async () => {
  const { stageKind, failStage, bossFor, bossMax, stageLabel } = await import('../src/pve.js');
  assert.deepEqual([1, 2, 3, 4, 5, 6, 10].map(stageKind), ['wave', 'wave', 'wave', 'elite', 'boss', 'wave', 'boss']);
  assert.equal(failStage(3), 1); assert.equal(failStage(5), 1);
  assert.equal(failStage(7), 1, '第2章1–3关失败退回上一章第1关');
  assert.equal(failStage(9), 6); assert.equal(failStage(10), 6);
  assert.equal(bossFor(4).id, bossFor(10).id, '第4关精英是下一章BOSS');
  assert.ok(bossMax(4) < bossMax(5));
  assert.equal(stageLabel(7), '第2章 2-2');
});

test('前三关小怪额外白装：10%，每关全场最多3次，给随机在场真人', async () => {
  const { spawnAlien } = await import('../src/pve.js');
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 'a', name: 'A' }, '输出'); game.chat({ id: 'b', name: 'B' }, '输出');
  toBattle(game);
  game.pve.spawnT = 999;
  game.drainEvents();
  const a = game.fighters.get('a');
  for (let i = 0; i < 300; i++) { const al = spawnAlien(game, 'swarm', 300, 300); game.killFighter(al, a); }
  const ev = game.drainEvents().filter(e => e.type === 'loot' && e.source === 'small');
  assert.equal(ev.length, 3);
  assert.ok(ev.every(e => e.item.tier === 0));
});

test('后援：5分钟没互动进后援，过关拿后援奖励，发言回到场上；离开太久回来补发错过的关；场上最多30人', () => {
  let t = 1e6;
  const save = new Save({ storage: memStorage(), now: () => t });
  const game = new Game({ save, random: seeded(), now: () => t, settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 'a', name: 'A' }, '输出'); game.chat({ id: 'b', name: 'B' }, '输出');
  toBattle(game);
  game.pve.spawnT = 999;
  // b 5分钟没互动
  t += 301 * 1000; game.fighters.get('a').lastActive = t;
  for (let i = 0; i < 70; i++) game.step(1 / 60);
  assert.ok(!game.fighters.has('b') && game.reserve.has('b'), 'b 进后援');
  const xp0 = save.peek('b').xp, lv0 = save.peek('b').level;
  game.pve.cleared = true; game.step(1 / 60);
  assert.equal(game.phase, 'result');
  const pb = save.peek('b');
  assert.ok(pb.xp > xp0 || pb.level > lv0, '后援拿经验');
  assert.equal(Object.keys(pb.gear).length, 1, '后援拿1件白装');
  // 发言回到场上
  game.chat({ id: 'b' }, '左');
  assert.ok(game.fighters.has('b') && !game.reserve.has('b'));
  // 离开很久（不在后援名单）：回来补发错过的关
  t += 31 * 60 * 1000; game.fighters.get('a').lastActive = t;
  game.phaseT = 0.001; game.step(1 / 60); game.phaseT = 0.001; game.step(1 / 60);
  for (let i = 0; i < 70; i++) game.step(1 / 60);
  assert.ok(!game.fighters.has('b') && !game.reserve.has('b'), 'b 离开太久');
  const seen = save.peek('b').seenClear;
  for (let k = 0; k < 3; k++) { if (game.phase !== 'battle') { game.phaseT = 0.001; game.step(1 / 60); if (game.phase !== 'battle') { game.phaseT = 0.001; game.step(1 / 60); } } game.fighters.get('a').lastActive = t; game.pve.cleared = true; game.step(1 / 60); }
  assert.equal(save.data.clearNo - seen, 3);
  game.drainEvents();
  game.like({ id: 'b', name: 'B' }, 1);
  const cu = game.drainEvents().find(e => e.type === 'catchup');
  assert.ok(cu && cu.stages === 3 && cu.items === 3, '补发3关');
  // 场上最多30人，第31个进后援
  for (let i = 0; i < 40; i++) game.chat({ id: 'n' + i, name: 'N' + i }, '输出');
  assert.equal(game.humans().length, 30);
  assert.ok(game.reserve.size >= 10);
  // 送礼的人一定能上场
  const outsider = [...game.reserve.keys()].find(k => k.startsWith('n'));
  game.gift({ id: outsider }, { name: '小心心', price: 1, count: 1 });
  assert.ok(game.fighters.has(outsider));
  assert.equal(game.humans().length, 30);
});

test('掉落顺序：本局送礼的排前面（送得多的第1），其余按贡献；保底必出金/红', async () => {
  const { dropOrder, rollDrops, pityOf } = await import('../src/fleet.js');
  const { GEAR } = await import('../src/config.js');
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  for (const id of ['a', 'b', 'c', 'd']) game.chat({ id, name: id }, '输出');
  toBattle(game);
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(id => game.fighters.get(id));
  a.merit = 900; b.merit = 50; c.merit = 300; d.merit = 10;
  game.gift({ id: 'd' }, { name: 'x', price: 52, count: 1 });
  game.gift({ id: 'b' }, { name: 'x', price: 1, count: 10 });
  assert.deepEqual(dropOrder(game).map(f => f.uid), ['d', 'b', 'a', 'c'], '送礼多的第1、送礼的第2，后面按贡献');
  // 保底：金差1件就到 → 必出金或更好
  pityOf(game, a).gold = GEAR.pity.gold - 1;
  pityOf(game, b).red = GEAR.pity.red - 1;
  game.pve.kind = 'boss';
  const drops = rollDrops(game, 8);
  const da = drops.find(x => x.uid === 'a'), db = drops.find(x => x.uid === 'b');
  assert.ok(da.item.tier >= 4, '金保底');
  assert.equal(db.item.tier, 5, '红保底');
  assert.equal(pityOf(game, b).red, 0);
  assert.ok(drops.find(x => x.uid === 'd').gifted);
});

test('机神附体：每1抖币6秒，自动放大招（不用发「大招」）', () => {
  const { game } = newGame({ settings: { npcMinPerTeam: 0 } });
  game.setMode('pve');
  game.chat({ id: 'm', name: 'M' }, '输出');
  toBattle(game);
  game.pve.spawnT = 999;
  const m = game.fighters.get('m');
  m.ultCd = 0; m.ultReadyFor = 0;
  for (let i = 0; i < 60 * 5; i++) game.step(1 / 60);
  assert.equal(m.ultCd, 0, '没有BUFF：真人不会自己放大招');
  game.gift({ id: 'm' }, { name: '小心心', price: 1, count: 2 });
  assert.equal(m.dodgeLeft, 12);
  for (let i = 0; i < 60 * 4; i++) game.step(1 / 60);
  assert.ok(m.ultCd > 30, '机神附体自动放了大招');
});

test('讨伐礼物对照：主播在设置里追加「礼物名=效果」优先', async () => {
  const { pveGiftKind } = await import('../src/gifts-pve.js');
  assert.equal(pveGiftKind({ name: '棒棒糖', price: 1 }), 'heart');
  assert.equal(pveGiftKind({ name: '棒棒糖', price: 1 }, { 棒棒糖: 'treasure' }), 'treasure');
  assert.equal(pveGiftKind({ name: '墨镜', price: 99 }, {}), 'hero');
});

test('对战模式关闭时：开局就是讨伐，「换对战」投票和切换都无效', () => {
  const save = new Save({ storage: memStorage() });
  save.data.mode = 'pvp';
  const game = new Game({ save, random: seeded(), settings: { pvpEnabled: false } });
  assert.equal(game.mode, 'pve');
  game.chat({ id: 'a', name: 'A' }, '输出');
  game.chat({ id: 'a' }, '换对战');
  assert.equal(game.mode, 'pve');
  assert.equal(game.setMode('pvp'), false);
  assert.equal(game.mode, 'pve');
});

test('快捷输入：1 2 3 对应 左 中 右', () => {
  const { game } = newGame({ settings: { npcMinPerTeam: 0, pvpEnabled: false } });
  game.chat({ id: 'q', name: 'Q' }, '输出');
  const f = game.fighters.get('q');
  game.chat({ id: 'q' }, '1'); assert.equal(f.lane, 'L');
  game.chat({ id: 'q' }, '2'); assert.equal(f.lane, 'M');
  game.chat({ id: 'q' }, '3'); assert.equal(f.lane, 'R');
  game.chat({ id: 'q' }, '１'); assert.equal(f.lane, 'L');
});

test('战舰不会每局自动换：第一次分配的也记住，回到场上、换局、新开页面都一样', () => {
  const { game, save } = newGame({ settings: { npcMinPerTeam: 0, pvpEnabled: false } });
  game.chat({ id: 'c', name: 'C' }, '加入');
  const cls = game.fighters.get('c').cls;
  assert.ok(cls);
  assert.equal(save.peek('c').cls, cls);
  for (const id of ['d', 'e', 'f', 'g']) game.chat({ id, name: id }, '加入');
  for (let r = 0; r < 3; r++) { game.startLobby(); assert.equal(game.fighters.get('c').cls, cls); }
  game.fighters.delete('c');
  game.chat({ id: 'c', name: 'C' }, '1');
  assert.equal(game.fighters.get('c').cls, cls);
  const g2 = new Game({ save, random: seeded(9), settings: { npcMinPerTeam: 0, pvpEnabled: false } });
  g2.chat({ id: 'c', name: 'C' }, '左');
  assert.equal(g2.fighters.get('c').cls, cls);
});

test('机甲：附近没怪时冲到BOSS身下近战砍核心', () => {
  const { game } = newGame({ settings: { npcMinPerTeam: 0, pvpEnabled: false } });
  game.save.data.pveStage = 5; game.startLobby();
  game.chat({ id: 't', name: 'T' }, '机甲');
  toBattle(game);
  game.pve.t = 0.001;
  for (let i = 0; i < 60 * 4; i++) game.step(1 / 60);
  assert.equal(game.pve.sub, 'boss');
  game.pve.spawnT = 999;
  for (const f of [...game.fighters.values()]) if (f.alien) game.fighters.delete(f.uid);
  const t = game.fighters.get('t'); t.invuln = 99; t.skillCd = 999; t.ultCd = 999;
  const boss = game.teams.red, c0 = boss.core;
  let minY = 1e9;
  for (let i = 0; i < 60 * 3; i++) { game.step(1 / 60); minY = Math.min(minY, t.y); t.invuln = 99; for (const f of [...game.fighters.values()]) if (f.alien) game.fighters.delete(f.uid); }
  assert.ok(minY < boss.y + 140, `机甲冲到了BOSS身下 ${Math.round(minY)}`);
  assert.ok(boss.core < c0, '砍到了BOSS');
});
