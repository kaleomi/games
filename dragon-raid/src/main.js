import { Game } from './game.js';
import { Save } from './save.js';
import { Relay } from './relay.js';
import { Renderer } from './render.js';
import { Audio } from './audio.js';
import { UI, loadSettings, storeSettings } from './ui.js';

import { openStore } from './idb-store.js';

const settings = loadSettings();
// 存档：本地数据库（IndexedDB），启动时先读进来；写入失败会在画面上提示
let saveErrAt = 0, game = null;
const warnSave = (e, hint = '') => { if (Date.now() - saveErrAt > 30000) { saveErrAt = Date.now(); game?.emit('toast', { text: `存档写入失败${hint}：${e?.message || e}，请在设置里导出存档留底` }); } };
const store = await openStore({ onError: e => warnSave(e) });
const save = new Save({ storage: store.storage });
save.store = store;
save.hotSource = () => [...game.fighters.keys(), ...game.reserve.keys()];   // 在场和后援的玩家每次保存都写
save.onError = e => warnSave(e, '（空间可能满了）');
game = new Game({ save, settings: {
  battleMinutes: settings.battleMinutes, npcMinPerTeam: settings.npcMinPerTeam, tiers: settings.tiers, giftTierByName: settings.giftTierByName, pveGiftByName: settings.pveGiftByName,
} });
const audio = new Audio();
audio.tts = settings.tts; audio.sfx = settings.sfx; audio.setBgm(settings.bgm, settings.bgmVol / 100);

let ui = null;
const relay = new Relay({
  chat: (user, text) => game.chat(user, text),
  like: (user, n) => game.like(user, n),
  gift: (user, gift) => game.gift(user, gift),
  unknownGift: (name, gift) => game.emit('toast', { text: `${name} 的${gift}没带用户ID，无法识别是谁；请先发弹幕加入` }),
  status: () => ui?.refreshPanel(),
  room: () => ui?.refreshPanel(),
  liveEnd: () => game.emit('toast', { text: '直播已结束' }),
});

function applySettings() {
  Object.assign(game.settings, { battleMinutes: settings.battleMinutes, npcMinPerTeam: settings.npcMinPerTeam, tiers: settings.tiers, giftTierByName: settings.giftTierByName, pveGiftByName: settings.pveGiftByName });
  audio.tts = settings.tts; audio.sfx = settings.sfx; audio.setBgm(settings.bgm, settings.bgmVol / 100);
  if (!settings.tts && 'speechSynthesis' in window) window.speechSynthesis.cancel();
  game.syncNpcs();
  storeSettings(settings);
}

const canvas = document.getElementById('view');
const renderer = new Renderer(canvas, game);
ui = new UI({ game, relay, audio, save, settings, onSettings: applySettings });
window.addEventListener('resize', () => renderer.resize());
window.addEventListener('pointerdown', () => audio.unlock(), { once: false });
// 主播点战力榜的人或画面里的英雄，查看装备属性
const toLogical = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 720, (e.clientY - r.top) / r.height * 1280]; };
canvas.addEventListener('pointerdown', e => { const [x, y] = toLogical(e); renderer.click(x, y); });
canvas.addEventListener('pointermove', e => {
  const [x, y] = toLogical(e);
  const uid = renderer.hitUid(x, y);
  renderer.hoverUid = uid; canvas.style.cursor = uid ? 'pointer' : '';
});
window.addEventListener('keydown', () => audio.unlock());

// 同一时间只允许一个游戏页面，避免同一份礼物结算两次
let blocked = false;
try {
  const ch = new BroadcastChannel('dragon-raid');
  ch.onmessage = e => { if (e.data === 'hello' && !blocked) ch.postMessage('here'); else if (e.data === 'here') blocked = true; };
  ch.postMessage('hello');
} catch { /* 老浏览器不支持就跳过 */ }

setTimeout(() => {
  if (blocked) { document.getElementById('blocked').hidden = false; return; }
  if (settings.autoConnect) relay.connect(settings.port);
}, 400);

const STEP = 1 / 60;
let last = performance.now(), acc = 0;
let errCount = 0;
function frame(now) {
  requestAnimationFrame(frame);   // 先排下一帧：这一帧哪里出错也不会把画面卡死
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  if (!blocked) try {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) { game.step(STEP); acc -= STEP; n++; }
    if (n === 5) acc = 0;
    const events = game.drainEvents();
    renderer.consume(events);
    audio.setIntensity(game.phase === 'battle');
    for (const e of events) { audio.event(e); if (e.type === 'announce' && e.voice) audio.say(e.text); }
    renderer.draw(dt);
    ui.update(renderer);
  } catch (err) {
    if (errCount++ < 20) console.error('画面这一帧出错（已跳过，游戏继续）', err);
    try { const c = renderer.ctx; for (let i = 0; i < 16; i++) c.restore(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; } catch { /* 忽略 */ }
  }
}
requestAnimationFrame(frame);

// 页面被切到后台时 rAF 会停，这里保证战斗和存档不中断
setInterval(() => {
  if (!document.hidden || blocked) return;
  const t = performance.now(); const dt = Math.min(1, (t - last) / 1000); last = t;
  for (let i = 0; i < Math.round(dt / STEP); i++) game.step(STEP);
  renderer.consume(game.drainEvents());
}, 1000);
setInterval(() => { save.flush(); ui.refreshPanel(); }, 5000);
window.addEventListener('beforeunload', () => save.flush());

window.__dragon = { game, relay, save, settings, renderer };
