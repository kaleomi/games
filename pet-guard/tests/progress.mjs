// 长时间模拟：node tests/progress.mjs 种子 只数 小时 [反应率]
// 观众会：放大招、看到躲雨区发安全的数字（按反应率）、全屏大招时撑伞/点赞、首领大哭时抱抱、偶尔摸摸/贴贴/许愿
import { Game } from '../src/game.js';
import { Save } from '../src/save.js';
import { safeParts } from '../src/combat.js';
const [seed = 1, n = 8, hours = 1, react = 0.6] = process.argv.slice(2).map(Number);
let s = seed; const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
const mem = new Map(); const storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
let t0 = 1.7e12; const save = new Save({ storage, now: () => t0 });
const g = new Game({ save, random: rnd, now: () => t0, settings: { npcMin: 4 } });
const SP = ['shiba', 'cat', 'bunny', 'panda', 'fox', 'hamster', 'penguin', 'dragon'];
const W = ['柴犬', '猫', '兔', '熊猫', '狐狸', '仓鼠', '企鹅', '龙'];
for (let i = 0; i < n; i++) g.chat({ id: 'u' + i, name: '观众' + i }, W[i % 8]);
const dt = 1 / 30, total = hours * 3600;
let stageStart = 0, fails = 0, clears = 0, lastZone = 0; const per = {}; const times = {};
for (let k = 0; k < total / dt; k++) {
  t0 += dt * 1000; g.step(dt);
  for (const e of g.drainEvents()) {
    if (e.type === 'stage') stageStart = g.clock;
    if (e.type === 'clear') { clears++; const key = e.kind; (times[key] ||= []).push(g.clock - stageStart); }
    if (e.type === 'comforted') (times.grade ||= []).push(e.grade);
    if (e.type === 'result' && !e.clear) { fails++; per[e.label + e.reason] = (per[e.label + e.reason] || 0) + 1; }
  }
  // 观众反应
  const z = g.zones[0];
  if (z && z.id !== lastZone) { lastZone = z.id; if (!z.full) for (const f of g.pets.values()) if (!f.npc && rnd() < react) { const safe = safeParts(z); g.chat({ id: f.uid, name: f.name }, String(safe[Math.floor(rnd() * safe.length)] + 1)); } }
  if (z && z.full && k % 15 === 0) for (const f of g.pets.values()) if (!f.npc && rnd() < react * 0.6) g.chat({ id: f.uid, name: f.name }, '撑伞');
  if (z && z.full && k % 15 === 0) for (const f of g.pets.values()) if (!f.npc && rnd() < react * 0.6) g.like({ id: f.uid, name: f.name }, 8);
  if (g.stage?.sub === 'comfort' && k % 15 === 0) for (const f of g.pets.values()) if (!f.npc && rnd() < react) g.chat({ id: f.uid, name: f.name }, '抱抱');
  if (k % 1800 === 0) for (const f of g.pets.values()) if (!f.npc && rnd() < 0.2) g.chat({ id: f.uid, name: f.name }, rnd() < 0.5 ? '贴贴' : '许愿 天天开心');
  if (k % 600 === 0) for (const f of g.pets.values()) if (!f.npc && rnd() < 0.5) g.chat({ id: f.uid, name: f.name }, rnd() < 0.6 ? '大招' : '摸摸');
  if (k % 9000 === 0) for (const f of g.pets.values()) if (!f.npc) f.lastActive = g.now();
}
const avg = a => a ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(0) : '-';
const ch = Math.ceil(g.stageN / 5);
console.log(`${hours}小时 ${n}人 反应${react}：到 ${g.stageN} 关（第${ch}章）  过关${clears} 失败${fails}  平均用时 小关${avg(times.wave)}s 精英${avg(times.elite)}s 首领${avg(times.boss)}s`);
console.log('失败在：', JSON.stringify(per), ' 安慰评价', (times.grade || []).join(''), ' 心愿成真', save.data.wishTotal);
console.log('等级：', [...g.pets.values()].filter(f => !f.npc).map(f => `${f.sp}${f.level}`).join(' '), ' 最远', save.data.best);
