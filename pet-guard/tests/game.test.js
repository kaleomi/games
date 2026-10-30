import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Game, parseCommand } from '../src/game.js';
import { Save, cleanNick } from '../src/save.js';
import { parseSpecies, parseSkill } from '../src/pets.js';
import { applyItem, makeItem, talentMul, petStats, combatPower } from '../src/gear.js';
import { awaken } from '../src/gifts.js';
import { giftKind } from '../src/gifts.js';
import { TALENT, FORMS, TREE } from '../src/config.js';

function setup(seed = 7) {
  let s = seed; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const mem = new Map(); const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  let t = 1.7e12; const save = new Save({ storage, now: () => t });
  const g = new Game({ save, random: rnd, now: () => t, settings: { npcMin: 0 } });
  const run = sec => { for (let i = 0; i < sec * 30; i++) { t += 1000 / 30; g.step(1 / 30); } };
  return { g, save, run, mem };
}

test('弹幕：物种名、口令', () => {
  assert.equal(parseSpecies('狗'), 'shiba');
  assert.equal(parseSpecies('领养猫猫'), 'cat');
  assert.equal(parseSpecies('换企鹅'), 'penguin');
  assert.equal(parseSpecies('我要小奶龙'), 'dragon');
  assert.equal(parseSpecies('猫猫好可爱啊哈哈哈'), null);
  assert.equal(parseSkill('大招'), 'ult');
  assert.deepEqual(parseCommand('2'), { type: 'ring', ring: 1 });
  assert.deepEqual(parseCommand('去3号'), { type: 'ring', ring: 2 });
  assert.equal(parseCommand('撑伞').type, 'umbrella');
  assert.equal(parseCommand('摸摸').type, 'pat');
  assert.deepEqual(parseCommand('起名 小黄'), { type: 'name', nick: '小黄' });
  assert.equal(cleanNick('  小 黄<b>猫  '), '小黄b猫');
  assert.equal(cleanNick('一二三四五六七八'), '一二三四五六');
});

test('领养：新萌宠先出蛋，孵出来；起名、摸摸涨亲密度并存档', () => {
  const { g, save, run } = setup();
  const f = g.chat({ id: 'u1', name: '小明' }, '柴犬') && g.pets.get('u1');
  assert.equal(f.sp, 'shiba');
  assert.ok(f.egg, '先是一颗蛋');
  run(3);
  assert.ok(!f.egg, '孵出来了');
  g.chat({ id: 'u1', name: '小明' }, '起名旺财');
  assert.equal(f.nick, '旺财');
  assert.equal(save.data.players.u1.pets.shiba.nick, '旺财');
  g.chat({ id: 'u1', name: '小明' }, '摸摸');
  assert.equal(save.data.players.u1.pets.shiba.bond, 1);
  g.chat({ id: 'u1', name: '小明' }, '摸摸');   // 冷却中
  assert.equal(save.data.players.u1.pets.shiba.bond, 1);
});

test('换物种：每种萌宠各自养，新领养的从最高等级的一半开始', () => {
  const { g, save, run } = setup();
  g.chat({ id: 'u2', name: '小红' }, '猫');
  const f = g.pets.get('u2');
  g.grantXp(f, 20000);
  const lv = f.level;
  assert.ok(lv >= FORMS[1].lv, `长到少年了 Lv${lv}`);
  g.chat({ id: 'u2', name: '小红' }, '兔子');
  assert.equal(f.sp, 'bunny');
  assert.equal(f.level, Math.floor(lv * 0.5));
  assert.ok(f.egg);
  g.chat({ id: 'u2', name: '小红' }, '猫');
  assert.equal(f.level, lv, '换回来等级还在');
  assert.equal(save.data.players.u2.cur, 'cat');
  run(1);
});

test('长大：跨过等级门槛发「长大」事件', () => {
  const { g } = setup();
  g.chat({ id: 'u3', name: '阿花' }, '熊猫');
  const f = g.pets.get('u3');
  g.drainEvents();
  g.grantXp(f, 3000);
  const ev = g.drainEvents().find(e => e.type === 'evolve');
  assert.ok(ev && ev.form === 1, '长成少年');
  assert.equal(f.h, FORMS[1].h);
});

test('天赋觉醒：取最好、200次保底神话、闪光保底', () => {
  const { g, save } = setup(3);
  g.chat({ id: 'u4', name: '土豪' }, '羊');
  const f = g.pets.get('u4');
  const r = awaken(g, f, 199);
  const d = save.data.players.u4.pets.sheep;
  assert.ok(d.talent >= Math.max(...r.rolls.filter(x => x < 5)) || d.talent === 5);
  assert.ok(d.shiny, `150次内必闪光（shinyPity=${d.shinyPity}）`);
  if (d.talent < 5) { awaken(g, f, 1); assert.ok(d.talent === 5 || d.star >= 1); }
  assert.ok(talentMul(d) >= 1);
  assert.ok(petStats(f).maxHp > 340);
});

test('装备：更高品质穿上、同品质强化、低品质变碎片', () => {
  let s = 1; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const gear = {}, shards = [0, 0, 0, 0, 0];
  applyItem(gear, shards, makeItem(rnd, 'hat', 1), rnd);
  assert.equal(gear.hat.tier, 1);
  applyItem(gear, shards, makeItem(rnd, 'hat', 1), rnd);
  assert.equal(gear.hat.plus, 1);
  applyItem(gear, shards, makeItem(rnd, 'hat', 0), rnd);
  assert.equal(shards[0], 1);
  applyItem(gear, shards, makeItem(rnd, 'hat', 3), rnd);
  assert.equal(gear.hat.tier, 3);
  assert.ok(combatPower({ level: 1, gear, talent: 0 }) > 50);
});

test('礼物认名、认价', () => {
  assert.equal(giftKind({ name: '加油鸭', price: 15 }), 'forge');
  assert.equal(giftKind({ name: '跑车', price: 1200 }), 'treasure');
  assert.equal(giftKind({ name: '未知', price: 100 }), 'spirit');
  assert.equal(giftKind({ name: '棒棒糖', price: 9 }, { 棒棒糖: 'heart' }), 'heart');
});

test('偷果鼠偷走果子；跑掉前净化会还回来', () => {
  const { g, run } = setup(5);
  for (let i = 0; i < 4; i++) g.chat({ id: 'p' + i, name: '观众' + i }, ['柴犬', '猫', '狐狸', '兔'][i]);
  g.phaseT = 0.01; run(1);
  assert.equal(g.phase, 'battle');
  const per = g.tree.maxHp / TREE.fruits;
  g.tree.hp = g.tree.maxHp - per;          // 已经被偷了一个
  const thief = g._spawn('thief', 300, 700, {});
  thief.carry = per;
  g.purify(thief, null);
  assert.equal(Math.round(g.tree.hp), Math.round(g.tree.maxHp), '果子还回来了');
});

test('存档往返：导出再导入不丢萌宠数据', () => {
  const { g, save } = setup();
  g.chat({ id: 'u5', name: '小白' }, '企鹅');
  g.chat({ id: 'u5', name: '小白' }, '起名啾啾啾');
  const json = save.exportJson();
  const mem = new Map(); const s2 = new Save({ storage: { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) } });
  s2.importJson(json);
  assert.equal(s2.data.players.u5.pets.penguin.nick, '啾啾啾');
  assert.equal(s2.data.players.u5.cur, 'penguin');
});

test('打一会儿不报错：一整章能跑完', () => {
  const { g, run } = setup(11);
  const W = ['柴犬', '猫', '兔', '熊猫', '狐狸', '仓鼠', '企鹅', '羊'];
  for (let i = 0; i < 8; i++) g.chat({ id: 'q' + i, name: '观众' + i }, W[i]);
  g.gift({ id: 'q1', name: '观众1' }, { name: '跑车', price: 1200, count: 1 });
  g.gift({ id: 'q2', name: '观众2' }, { name: '鲜花', price: 10, count: 2 });
  run(60);
  g.gift({ id: 'q3', name: '观众3' }, { name: '爱你哟', price: 52, count: 1 });
  g.gift({ id: 'q4', name: '观众4' }, { name: '墨镜', price: 99, count: 1 });
  g.like({ id: 'q5', name: '观众5' }, 600);
  run(400);
  assert.ok(g.stageN > 1, `推进到了 ${g.stageN}`);
});

// ───────── 萌宠保卫战独有玩法 ─────────
import { wishStore, syncFruits, takeWish } from '../src/wish.js';
import { friendship, addFriendship } from '../src/friends.js';
import { damageTree } from '../src/combat.js';
import { castZone } from '../src/stage.js';
import { COMFORT, FRIEND, WISH } from '../src/config.js';

function battle(g, run) { g.phaseT = 0.01; run(0.2); assert.equal(g.phase, 'battle'); }

test('许愿：心愿挂上树；偷果鼠偷走心愿，别人抢回来两人结下友情', () => {
  const { g, save, run } = setup(21);
  const W = ['柴犬', '猫', '狐狸', '兔', '熊猫', '仓鼠', '企鹅', '羊', '狗', '猫', '兔', '狐狸'];
  W.forEach((w, i) => g.chat({ id: 'w' + i, name: '许愿人' + i }, w));
  battle(g, run);
  W.forEach((w, i) => g.chat({ id: 'w' + i, name: '许愿人' + i }, `许愿 心愿${i}号`));
  const S = wishStore(g);
  assert.equal(S.slots.filter(Boolean).length, 12, '12个果子都挂上了心愿');
  assert.equal(S.slots[0].text, '心愿0号');
  g.chat({ id: 'w12', name: '排队的' }, '许愿 我也要');
  assert.equal(S.queue.length, 1, '挂满了就排队');
  // 偷果鼠偷一个（全是心愿果）
  const per = g.tree.maxHp / TREE.fruits;
  const thief = g._spawn('thief', 300, 700, {});
  damageTree(g, per, thief, { steal: true });
  const i = g.tree.lastLost[0];
  thief.wish = takeWish(g, i); thief.carry = per;
  assert.ok(thief.wish, '偷走的是心愿');
  assert.equal(g.tree.slots.filter(s => s.on).length, 11);
  const owner = thief.wish.uid, hero = [...g.pets.values()].find(f => !f.npc && f.uid !== owner);
  g.purify(thief, hero);
  assert.equal(g.tree.slots.filter(s => s.on).length, 12, '果子长回来了');
  assert.ok(S.slots.some(w => w && w.uid === owner), '心愿挂回去了');
  assert.equal(friendship(g, hero.uid, owner), WISH.rescue, '抢回心愿：两人友情+3');
  assert.equal(save.data.players[hero.uid].friends[owner].v, WISH.rescue, '友情存进存档');
});

test('抱抱首领：首领打空委屈大哭，全场抱抱安慰好，心愿成真', () => {
  const { g, save, run } = setup(23);
  g.setStageN(5); g.startLobby('jump');
  for (let i = 0; i < 6; i++) g.chat({ id: 'h' + i, name: '观众' + i }, ['柴犬', '猫', '兔', '狐狸', '熊猫', '羊'][i]);
  run(3);
  g.chat({ id: 'h0', name: '观众0' }, '许愿 天天开心');
  battle(g, run);
  run(3);
  assert.ok(g.boss, '首领出来了');
  const boss = g.boss;
  boss.hp = 1;
  g.purify(boss, g.pets.get('h1'));
  assert.equal(g.stage.sub, 'comfort');
  assert.ok(boss.sad && !boss.purified, '委屈大哭，没有直接消失');
  assert.equal(g.foes.filter(e => e.alive && !e.purified).length, 0, '小坏心情也被感动了');
  const need = g.stage.comfort.need;
  for (let k = 0; k < 20 && g.stage.sub === 'comfort'; k++) { for (let i = 0; i < 6; i++) g.chat({ id: 'h' + i, name: '观众' + i }, '抱抱'); run(1); }
  assert.equal(g.stage.sub, 'ceremony', `安慰好了（需要${need}）`);
  assert.ok(['S', 'A', 'B'].includes(g.stage.grade), `评价 ${g.stage.grade}`);
  assert.ok(boss.comforted && boss.purified);
  assert.equal(save.data.players.h0.wishTrue, 1, '心愿成真记一次');
  assert.equal(wishStore(g).slots.filter(Boolean).length, 0, '成真的心愿从树上摘下');
  run(COMFORT.ceremony + 0.5);
  assert.equal(g.phase, 'result');
  assert.ok(g.result.grade, '结算带安慰评价');
  assert.equal(g.stageN, 6);
});

test('抱抱首领：没人抱也能过（流浪萌宠慢慢抱，超时评C）', () => {
  const { g, run } = setup(25);
  g.settings.npcMin = 4; g.syncNpcs();
  g.setStageN(5); g.startLobby('jump');
  battle(g, run); run(3);
  g.purify(g.boss, null);
  assert.equal(g.stage.sub, 'comfort');
  run(COMFORT.secs + 1);
  assert.equal(g.stage.sub, 'ceremony');
  run(COMFORT.ceremony + 0.5);
  assert.equal(g.phase, 'result');
});

test('贴贴：跑过去抱别人家的萌宠，友情跨直播保存；好朋友在场放合体技', () => {
  const { g, save, run } = setup(27);
  g.chat({ id: 'a', name: '小A' }, '柴犬'); g.chat({ id: 'b', name: '小B' }, '猫');
  run(3);
  g.chat({ id: 'a', name: '小A' }, '贴贴');
  run(3);
  assert.equal(friendship(g, 'a', 'b'), 1);
  assert.equal(save.data.players.b.friends.a.v, 1, '对方存档里也记着');
  g.chat({ id: 'a', name: '小A' }, '贴贴');   // 冷却中
  run(3);
  assert.equal(friendship(g, 'a', 'b'), 1);
  g.drainEvents();
  addFriendship(g, { uid: 'a', name: '小A' }, { uid: 'b', name: '小B' }, FRIEND.steps[1]);
  if (g.phase !== 'battle') battle(g, run);
  run(FRIEND.duoCd + 3);
  const ev = g.drainEvents();
  assert.ok(ev.some(e => e.type === 'duo' && e.lv === 2), '放了友情合体技');
});

test('点赞撑伞：全屏大招蓄力时点赞加护罩（每人每秒有上限）', () => {
  const { g, run } = setup(29);
  g.chat({ id: 'l1', name: '点赞的' }, '兔');
  battle(g, run);
  const z = castZone(g, 'blast', '测试首领', { name: '大风' });
  g.like({ id: 'l1', name: '点赞的' }, 100);
  assert.ok(Math.abs(z.intercept - 15 * 0.0012) < 1e-9, `护罩 ${z.intercept}`);
  run(1.1);
  g.like({ id: 'l1', name: '点赞的' }, 5);
  assert.ok(z.intercept > 15 * 0.0012);
});

test('收服小精灵、鲜花种花', () => {
  const { g, save, run } = setup(31);
  g.chat({ id: 's1', name: '收服的' }, '狐狸');
  run(3); battle(g, run);
  const f = g.pets.get('s1'), atk0 = f.stats.atk;
  g.tame(f, 'cloud', 'minion');
  g.tame(f, 'bear', 'elite');
  assert.equal(f.follow, 'bear', '更稀有的跟在身边');
  assert.equal(save.data.players.s1.sprites.cloud, 1);
  assert.ok(f.stats.atk > atk0, '图鉴加成');
  g.gift({ id: 's1', name: '收服的' }, { name: '鲜花', price: 10, count: 2 });
  assert.equal(g.flowers.length, 2, '种了两朵花');
});

// ───────── 回家种田 ─────────
import { farmOf, plotStage } from '../src/farm.js';
import { FARM, CROPS, ADV_PETS } from '../src/config.js';

test('打完首领回家：结算后进家园，待够时间再出发去下一章', () => {
  const { g, run } = setup(41);
  g.chat({ id: 'k1', name: '回家的' }, '柴犬');
  g.setStageN(5); g.startLobby('jump'); g.phaseT = 0.01; run(3);
  g.purify(g.boss, null);
  for (let i = 0; i < 20 && g.phase === 'battle'; i++) { g.chat({ id: 'k1', name: '回家的' }, '抱抱'); run(1); }
  run(COMFORT.ceremony + 0.5);
  assert.equal(g.phase, 'result');
  run(9);
  assert.equal(g.phase, 'home', '结算完回家');
  assert.equal(g.homeTiles[0], 'k1', '分到一块菜地');
  run(FARM.homeSeconds + 1);
  assert.equal(g.phase, 'lobby');
  assert.equal(g.stageN, 6);
  g.settings.homeSeconds = 0;
  assert.equal(g.homeSeconds(), 0, '设置成0就不回家');
});

test('种田：种 → 浇水更快 → 收 → 卖；升级解锁新作物；扩地', () => {
  const { g, save, run } = setup(43);
  g.chat({ id: 'm1', name: '农夫' }, '兔'); g.chat({ id: 'm2', name: '邻居' }, '猫');
  run(3);
  g.chat({ id: 'm1', name: '农夫' }, '种萝卜');
  assert.ok(g.drainEvents().some(e => e.type === 'toast' && /回家/.test(e.text)), '不在家不能种');
  g.startHome();
  const fm = farmOf(g, g.pets.get('m1'));
  assert.equal(fm.coins, FARM.startCoins);
  g.chat({ id: 'm1', name: '农夫' }, '种萝卜');
  assert.equal(fm.plots.filter(Boolean).length, 2, '两块地都种上');
  assert.equal(fm.coins, FARM.startCoins - 2 * CROPS[0].seed);
  const left0 = plotStage(fm.plots[0], g.now()).left;
  g.chat({ id: 'm1', name: '农夫' }, '浇水');
  const left1 = plotStage(fm.plots[0], g.now()).left;
  assert.ok(Math.abs(left1 - left0 * FARM.water) < 0.1, `浇水快了 ${left0}→${left1}`);
  g.chat({ id: 'm1', name: '农夫' }, '收');
  assert.equal(fm.plots.filter(Boolean).length, 2, '没熟收不了');
  run(left1 + 0.5);
  g.chat({ id: 'm1', name: '农夫' }, '收');
  assert.equal(fm.barn.carrot, 2);
  assert.equal(fm.xp, 2 * CROPS[0].xp);
  g.chat({ id: 'm1', name: '农夫' }, '卖');
  const price = Math.round(2 * CROPS[0].sell * (g.market.hot === 'carrot' ? 2 : g.market.cold === 'carrot' ? 0.7 : 1));
  assert.equal(fm.coins, FARM.startCoins - 2 * CROPS[0].seed + price);
  assert.equal(save.data.players.m1.farm.coins, fm.coins, '存进存档');
  fm.xp = 1000; fm.coins = 5000;
  g.chat({ id: 'm1', name: '农夫' }, '种田');   // 一键
  assert.ok(fm.lv >= 2 || fm.plots.some(Boolean));
  fm.plots = [null, null]; fm.lv = 3; fm.coins = 5000;
  g.chat({ id: 'm1', name: '农夫' }, '种草莓');
  assert.equal(fm.plots[0].c, 'strawberry', '升级后能种草莓');
  g.chat({ id: 'm1', name: '农夫' }, '扩地');
  assert.equal(fm.plots.length, 3);
  assert.equal(fm.coins, 5000 - 2 * CROPS[2].seed - FARM.plotCost[0]);
});

test('好朋友顺手浇水；在家送礼施肥、给金币', () => {
  const { g, run } = setup(45);
  g.chat({ id: 'p1', name: '甲' }, '狗'); g.chat({ id: 'p2', name: '乙' }, '猫');
  run(3); g.startHome();
  g.addFriendship({ uid: 'p1', name: '甲' }, { uid: 'p2', name: '乙' }, 5);
  g.chat({ id: 'p2', name: '乙' }, '种萝卜');
  const f2 = farmOf(g, g.pets.get('p2')), before = f2.plots[0].ready;
  g.chat({ id: 'p1', name: '甲' }, '浇水');
  assert.ok(f2.plots[0].ready < before && f2.plots[0].fw === 1, '好朋友的菜也浇了');
  const coins = f2.coins;
  g.gift({ id: 'p2', name: '乙' }, { name: '小心心', price: 1, count: 3 });
  assert.equal(f2.coins, coins + 3 * FARM.giftCoins);
  assert.ok(f2.plots[0].ready <= g.now(), '施肥马上熟');
});

test('高级萌宠：没解锁领不了；农场等级和金币够了解锁，会放技能', () => {
  const { g, run } = setup(47);
  g.chat({ id: 'a1', name: '想要独角兽' }, '独角兽');
  const f = g.pets.get('a1');
  assert.notEqual(f.sp, 'unicorn', '没解锁');
  g.startHome();
  const fm = farmOf(g, f);
  g.chat({ id: 'a1', name: '想要独角兽' }, '解锁独角兽');
  assert.ok(!fm.pets.includes('unicorn'), '等级不够');
  fm.lv = ADV_PETS.unicorn.lv; fm.coins = ADV_PETS.unicorn.cost + 10;
  g.chat({ id: 'a1', name: '想要独角兽' }, '解锁独角兽');
  assert.ok(fm.pets.includes('unicorn'));
  assert.equal(f.sp, 'unicorn', '解锁后直接换上');
  assert.equal(fm.coins, 10);
  // 四只高级萌宠打一会儿不报错
  for (const [i, sp] of ['dragon', 'deer', 'unicorn', 'phoenix'].entries()) {
    g.chat({ id: 'b' + i, name: '高级' + i }, '狗');
    const o = g.pets.get('b' + i), of = farmOf(g, o); of.pets.push(sp);
    assert.ok(g.setSpecies(o, sp));
  }
  g.startLobby('test'); run(2);
  for (const f2 of g.pets.values()) { f2.egg = false; }
  g.phaseT = 0.01; run(40);
  for (const id of ['b0', 'b1', 'b2', 'b3']) { const o = g.pets.get(id); o.ultCd = 0; o.ultReq = g.clock + 2; }
  run(5);
  assert.ok(g.phase === 'battle' || g.phase === 'clear' || g.phase === 'result');
});

test('小奶龙是高级萌宠：没解锁领不了；以前就养过的照样能用', () => {
  const { g, save } = setup(49);
  g.chat({ id: 'd1', name: '新来的' }, '龙');
  assert.notEqual(g.pets.get('d1').sp, 'dragon');
  // 老观众：存档里早就有小奶龙
  const p = save.get('d2', '老观众'); p.pets.dragon = { lv: 12, xp: 0, nick: '', talent: 0, talentPity: 0, star: 0, sub: 0, shiny: false, shinyPity: 0, gear: {}, bond: 0 }; p.cur = 'dragon';
  g.chat({ id: 'd2', name: '老观众' }, '龙');
  assert.equal(g.pets.get('d2').sp, 'dragon');
  g.chat({ id: 'd3', name: '要羊' }, '羊');
  assert.equal(g.pets.get('d3').sp, 'sheep', '小绵羊现在随便领');
});
