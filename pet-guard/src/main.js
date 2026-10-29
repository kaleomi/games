import { Game } from './game.js';
import { Save } from './save.js';
import { Relay } from './relay.js';
import { Renderer } from './render.js';
import { Audio } from './audio.js';
import { Assets } from './assets.js';
import { UI, loadSettings, storeSettings } from './ui.js';
import { openStore } from './idb-store.js';
import { W, H } from './config.js';

const settings = loadSettings();
const loading = document.getElementById('loading');
const setLoad = t => { if (loading) loading.querySelector('small').textContent = t; };
let barPct = 3;
const setBar = p => { barPct = Math.max(barPct, Math.min(100, p)); const i = loading?.querySelector('.bar i'); if (i) i.style.width = barPct.toFixed(1) + '%'; };
setBar(8);

let saveErrAt = 0;
const store = await openStore({ onError: e => { if (Date.now() - saveErrAt > 30000) { saveErrAt = Date.now(); game?.emit('toast', { text: `存档写入失败：${e?.message || e}，请在设置里导出存档留底` }); } } });
const save = new Save({ storage: store.storage });
save.store = store;
const gameSettings = () => ({ npcMin: settings.npcMin, giftByName: settings.giftByName, giftBox: settings.giftBox !== false, giftPages: settings.giftPages !== false, giftRank: settings.giftRank !== false, rankPage: settings.rankPage !== false, wishShow: settings.wishShow !== false, wishBlock: settings.wishBlock || '', homeSeconds: Number.isFinite(settings.homeSeconds) ? settings.homeSeconds : 90 });
var game = new Game({ save, settings: gameSettings() });
save.hotSource = () => [...game.pets.keys(), ...game.reserve.keys()].filter(u => !u.startsWith('npc:') && !u.startsWith('merc:'));
save.onError = e => { if (Date.now() - saveErrAt > 30000) { saveErrAt = Date.now(); game.emit('toast', { text: `存档写入失败：${e?.message || e}` }); } };

const assets = new Assets();
setBar(12); setLoad('正在加载美术素材…');
try { await assets.load(P => { if (P.total) { setBar(12 + 86 * P.done / P.total); setLoad(`正在加载美术素材… ${P.done} / ${P.total}`); } }); } catch (e) { console.error(e); }
setBar(100); setLoad('加载完成');
const audio = new Audio();
audio.setAvailable(assets.manifest?.audio || []);
audio.preload();   // 音效文件先下载好，点一下页面就能出声
audio.sfx = settings.sfx; audio.setBgm(settings.bgm, settings.bgmVol / 100); audio.setSfxVol(settings.sfxVol / 100);

let ui = null;
const relay = new Relay({
  chat: (user, text) => game.chat(user, text),
  like: (user, n) => game.like(user, n),
  gift: (user, gift) => game.gift(user, gift),
  unknownGift: (name, gift) => game.emit('toast', { text: `${name} 的${gift}没带用户ID，认不出是谁；请先发弹幕领养萌宠` }),
  status: () => ui?.refreshPanel(),
  room: () => ui?.refreshPanel(),
  liveEnd: () => game.emit('toast', { text: '直播已结束' }),
});
function applySettings() {
  Object.assign(game.settings, gameSettings());
  audio.sfx = settings.sfx; audio.setBgm(settings.bgm, settings.bgmVol / 100); audio.setSfxVol(settings.sfxVol / 100);
  game.syncNpcs();
  storeSettings(settings);
}

const canvas = document.getElementById('view');
const renderer = new Renderer(canvas, game, assets);
ui = new UI({ game, relay, audio, save, settings, renderer, onSettings: applySettings });
loading?.remove();
window.addEventListener('resize', () => renderer.resize());
const unlock = () => audio.unlock();
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);
const toLogical = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H]; };
canvas.addEventListener('pointerdown', e => { const [x, y] = toLogical(e); renderer.click(x, y); });
canvas.addEventListener('pointermove', e => { const [x, y] = toLogical(e); const uid = renderer.hitUid(x, y); renderer.hoverUid = uid; canvas.style.cursor = uid ? 'pointer' : ''; });

// 同一时间只允许一个游戏页面，避免同一份礼物结算两次
let blocked = false;
try {
  const ch = new BroadcastChannel('pet-guard');
  ch.onmessage = e => { if (e.data === 'hello' && !blocked) ch.postMessage('here'); else if (e.data === 'here') blocked = true; };
  ch.postMessage('hello');
} catch { /* 老浏览器不支持就跳过 */ }
setTimeout(() => {
  if (blocked) { document.getElementById('blocked').hidden = false; return; }
  if (settings.autoConnect) relay.connect(settings.port);
}, 400);

const STEP = 1 / 60;
let last = performance.now(), acc = 0, errCount = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.max(0, Math.min(0.25, (now - last) / 1000)); last = now;
  if (blocked) return;
  try {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) { game.step(STEP); acc -= STEP; n++; }
    if (n === 5) acc = 0;
    const events = game.drainEvents();
    renderer.consume(events);
    audio.pick(game);
    for (const e of events) audio.event(e, game);
    renderer.draw(dt);
  } catch (err) {
    if (errCount++ < 20) console.error('画面这一帧出错（已跳过，游戏继续）', err);
    try { const c = renderer.ctx; for (let i = 0; i < 16; i++) c.restore(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; } catch { /* 忽略 */ }
  }
}
requestAnimationFrame(frame);
// 页面切到后台时 rAF 会停，这里保证战斗和存档不中断
setInterval(() => {
  if (!document.hidden || blocked) return;
  const t = performance.now(); const dt = Math.min(1, (t - last) / 1000); last = t;
  for (let i = 0; i < Math.round(dt / STEP); i++) game.step(STEP);
  renderer.consume(game.drainEvents());
}, 1000);
setInterval(() => { save.flush(); ui.refreshPanel(); }, 5000);
window.addEventListener('beforeunload', () => save.flush());
window.__pet = { game, relay, save, settings, renderer, assets };
