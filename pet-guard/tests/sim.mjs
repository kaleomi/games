// 无画面模拟：node tests/sim.mjs 种子 只数 分钟 起始关 等级
import { Game } from '../src/game.js';
import { Save } from '../src/save.js';
const [seed = 1, n = 6, minutes = 10, start = 1, lv = 1] = process.argv.slice(2).map(Number);
let s = seed; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const mem = new Map(); const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
let t0 = 1.7e12; const save = new Save({ storage, now: () => t0 });
save.data.stage = start;
const g = new Game({ save, random: rnd, now: () => t0, settings: { npcMin: 0 } });
const SP = ['shiba', 'cat', 'bunny', 'panda', 'fox', 'hamster', 'penguin', 'dragon'];
for (let i = 0; i < n; i++) { const f = g.join({ id: 'u' + i, name: '观众' + i }, SP[i % SP.length]); const d = save.data.players['u' + i].pets[f.sp]; d.lv = lv; g.bindPet(f, f.sp, save.data.players['u' + i]); }
for (const f of g.pets.values()) { f.level = save.data.players[f.uid].pets[f.sp].lv; }
const log = []; let stageStart = 0;
const dt = 1 / 30, total = minutes * 60;
for (let k = 0; k < total / dt; k++) {
  t0 += dt * 1000; g.step(dt);
  for (const e of g.drainEvents()) {
    if (e.type === 'stage') stageStart = g.clock;
    if (e.type === 'clear') log.push(`${g.clock.toFixed(0)}s 过关 ${e.label} 用时${(g.clock - stageStart).toFixed(0)}s 果子${e.fruits}`);
    if (e.type === 'result' && !e.clear) log.push(`${g.clock.toFixed(0)}s 失败 ${e.label} ${e.reason}`);
    if (e.type === 'evolve') log.push(`${g.clock.toFixed(0)}s ${e.name} 长大 ${e.formName}`);
    // 每隔一会儿有人摸摸、发1/2/3
  }
  if (k % 300 === 0) for (const f of g.pets.values()) if (!f.npc && rnd() < 0.3) g.chat({ id: f.uid, name: f.name }, rnd() < 0.5 ? '大招' : String(1 + Math.floor(rnd() * 3)));
}
console.log(log.join('\n'));
console.log('最终关', g.stageN, '等级', [...g.pets.values()].filter(f => !f.npc).map(f => `${f.sp}:${f.level}`).join(' '));
