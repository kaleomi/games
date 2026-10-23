import { Game } from './game.js';
import { Save } from './save.js';
import { Relay } from './relay.js';
import { Renderer } from './render.js';
import { Audio } from './audio.js';
import { UI, loadSettings, storeSettings } from './ui.js';

const settings = loadSettings();
const save = new Save({ storage: window.localStorage });
const game = new Game({ save, settings: {
  battleMinutes: settings.battleMinutes, npcMinPerTeam: settings.npcMinPerTeam, tiers: settings.tiers, giftTierByName: settings.giftTierByName,
} });
const audio = new Audio();
audio.tts = settings.tts; audio.sfx = settings.sfx;

let ui = null;
const relay = new Relay({
  chat: (user, text) => game.chat(user, text),
  like: (user, n) => game.like(user, n),
  gift: (user, gift) => game.gift(user, gift),
  unknownGift: (name, gift) => game.emit('toast', { text: `${name} 的${gift}没带用户ID，无法识别阵营；请先发弹幕加入` }),
  status: () => ui?.refreshPanel(),
  room: () => ui?.refreshPanel(),
  liveEnd: () => game.emit('toast', { text: '直播已结束' }),
});

function applySettings() {
  Object.assign(game.settings, { battleMinutes: settings.battleMinutes, npcMinPerTeam: settings.npcMinPerTeam, tiers: settings.tiers, giftTierByName: settings.giftTierByName });
  audio.tts = settings.tts; audio.sfx = settings.sfx;
  game.syncNpcs();
  storeSettings(settings);
}

const canvas = document.getElementById('view');
const renderer = new Renderer(canvas, game);
ui = new UI({ game, relay, audio, save, settings, onSettings: applySettings });
window.addEventListener('resize', () => renderer.resize());
window.addEventListener('pointerdown', () => audio.unlock(), { once: false });
// 主播点战力榜的人或画面里的战舰，查看装备属性
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
  const ch = new BroadcastChannel('starship-barrage');
  ch.onmessage = e => { if (e.data === 'hello' && !blocked) ch.postMessage('here'); else if (e.data === 'here') blocked = true; };
  ch.postMessage('hello');
} catch { /* 老浏览器不支持就跳过 */ }

setTimeout(() => {
  if (blocked) { document.getElementById('blocked').hidden = false; return; }
  if (settings.autoConnect) relay.connect(settings.port);
}, 400);

const STEP = 1 / 60;
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  if (!blocked) {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) { game.step(STEP); acc -= STEP; n++; }
    if (n === 5) acc = 0;
    const events = game.drainEvents();
    renderer.consume(events);
    for (const e of events) { audio.event(e); if (e.type === 'announce' && e.voice) audio.say(e.text); }
    renderer.draw(dt);
    ui.update(renderer);
  }
  requestAnimationFrame(frame);
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

window.__starship = { game, relay, save, settings, renderer };
