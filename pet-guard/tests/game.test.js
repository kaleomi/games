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
  g.chat({ id: 'u4', name: '土豪' }, '龙');
  const f = g.pets.get('u4');
  const r = awaken(g, f, 199);
  const d = save.data.players.u4.pets.dragon;
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
  const W = ['柴犬', '猫', '兔', '熊猫', '狐狸', '仓鼠', '企鹅', '龙'];
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
