// 声音：小音效用 assets/sfx/ 里的真实录音（来源和授权见 assets/sfx/CREDITS.md），不用电子合成音；
// 背景音乐放 assets/audio/bgm_lobby.mp3、bgm_battle.mp3、bgm_boss.mp3、bgm_win.mp3、bgm_home.mp3（有就放，没有就不放）
const BASE = new URL('../assets/audio/', import.meta.url).href;
const SFX_BASE = new URL('../assets/sfx/', import.meta.url).href;
const INSTR = {
  xylo: [['G4', 392], ['C5', 523.25], ['G5', 783.99], ['C6', 1046.5], ['G6', 1567.98], ['C7', 2093]],
  harp: [['A4', 440], ['C5', 523.25], ['E5', 659.25], ['G5', 783.99], ['B5', 987.77], ['D6', 1174.66], ['F6', 1396.91], ['A6', 1760]],
  violin: [['C4', 261.63], ['E4', 329.63], ['G4', 392], ['A4', 440], ['C5', 523.25], ['E5', 659.25]],
};
const SFX_FILES = ['hit1', 'hit2', 'hit3', 'paw1', 'paw2', 'shoot', 'whoosh', 'hurt', 'thud', 'impact', 'tom', 'bell', 'sparkle', 'whistle', 'sneak', 'till', 'crack', 'windchime', 'trombone', 'glass', 'splash',
  ...Object.entries(INSTR).flatMap(([k, l]) => l.map(([n]) => `${k}_${n}`))];
const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteFreq(n) { const m = String(n).match(/^([A-G])(#|b)?(\d)$/); if (!m) return 440; const midi = 12 * (+m[3] + 1) + SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return 440 * 2 ** ((midi - 69) / 12); }
const pick = a => a[Math.floor(Math.random() * a.length)];
const PENTA = ['C6', 'D6', 'E6', 'G6', 'A6'];

export class Audio {
  constructor() {
    this.sfx = true; this.bgm = true; this.bgmVol = 0.5; this.sfxVol = 0.7;
    this.ctx = null; this.bus = null; this.recent = new Map(); this.secT = 0; this.secCount = 0;
    this.tracks = {}; this.want = 'bgm_lobby'; this.available = null;
  }
  setAvailable(list) { this.available = new Set(list || []); }
  unlock() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.bus = this.ctx.createGain(); this.bus.gain.value = this.sfxVol; this.bus.connect(this.ctx.destination); } catch { this.ctx = null; } }
    this.preload(); this.decode();
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    this.syncBgm(true);
  }
  setBgm(on, vol) { this.bgm = !!on; if (vol != null) this.bgmVol = Math.max(0, Math.min(1, vol)); this.syncBgm(true); }
  setSfxVol(v) { this.sfxVol = v; if (this.bus) this.bus.gain.value = v; }
  pick(game) {
    let t = 'bgm_battle';
    if (game.phase === 'lobby') t = 'bgm_lobby';
    else if (game.phase === 'home') t = this.has('bgm_home') ? 'bgm_home' : 'bgm_lobby';
    else if (game.phase === 'result') t = game.result?.clear ? 'bgm_win' : 'bgm_lobby';
    else if (game.stage?.kind === 'boss') t = 'bgm_boss';
    if (t === 'bgm_win' && !this.has('bgm_win')) t = 'bgm_lobby';
    if (!this.has(t)) t = this.has('bgm_battle') ? 'bgm_battle' : null;
    if (t !== this.want) { this.want = t; this.syncBgm(); }
  }
  has(name) { return !!name && (!this.available || this.available.has(name)); }
  syncBgm(force = false) {
    if (!this.ctx && !force) return;
    const want = this.bgm && this.has(this.want) ? this.want : null;
    for (const [k, a] of Object.entries(this.tracks)) if (k !== want) this.fade(a, 0, () => a.pause());
    if (!want) return;
    let a = this.tracks[want];
    if (!a) { a = new window.Audio(BASE + want + '.mp3'); a.loop = want !== 'bgm_win'; a.volume = 0; a.preload = 'auto'; this.tracks[want] = a; }
    if (a.paused) a.play().catch(() => {});
    this.fade(a, this.bgmVol * 0.6);
  }
  fade(a, to, done) {
    clearInterval(a._fade);
    a._fade = setInterval(() => {
      const d = to - a.volume;
      if (Math.abs(d) < 0.03) { a.volume = to; clearInterval(a._fade); done?.(); return; }
      a.volume = Math.max(0, Math.min(1, a.volume + Math.sign(d) * 0.03));
    }, 40);
  }
  // ───────── 采样音效（assets/sfx/，全是真实录音：手鼓、铃铛、木琴、竖琴、小提琴、口哨、长号……）─────────
  // 先把文件取下来（不需要点页面），点过页面有了声音上下文再解码
  preload() {
    if (this.raw) return;
    this.raw = new Map(); this.buf = new Map();
    for (const n of SFX_FILES) fetch(SFX_BASE + n + '.mp3').then(r => (r.ok ? r.arrayBuffer() : null)).then(b => { if (b) { this.raw.set(n, b); this.decode(); } }).catch(() => {});
  }
  decode() {
    if (!this.ctx || !this.raw) return;
    for (const [n, b] of [...this.raw]) { this.raw.delete(n); this.ctx.decodeAudioData(b).then(d => this.buf.set(n, d)).catch(() => {}); }
  }
  // 放一段录音：vol 音量，rate 变速（顺带变调），delay 延后
  smp(name, { vol = 0.4, rate = 1, delay = 0, dur = 0 } = {}) {
    const c = this.ctx, b = this.buf?.get(name);
    if (!c || !b) return;
    const t = c.currentTime + delay, s = c.createBufferSource(), g = c.createGain();
    s.buffer = b; s.playbackRate.value = rate; g.gain.value = vol;
    s.connect(g); g.connect(this.bus); s.start(t);
    if (dur > 0) { g.gain.setValueAtTime(vol, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.18); s.stop(t + dur + 0.2); }
  }
  // 乐器音符：从最近的那个真实音符变速得到（木琴 xylo / 竖琴 harp / 小提琴 violin）
  note(inst, name, o = {}) {
    const f = typeof name === 'number' ? name : noteFreq(name), list = INSTR[inst];
    if (!list) return;
    let best = list[0]; for (const it of list) if (Math.abs(Math.log(it[1] / f)) < Math.abs(Math.log(best[1] / f))) best = it;
    this.smp(`${inst}_${best[0]}`, { ...o, rate: f / best[1] });
  }
  run(inst, names, gap, o = {}) { names.forEach((n, i) => this.note(inst, n, { ...o, delay: (o.delay || 0) + i * gap })); }
  // 同一种音效限频，满屏打架时不会糊成一片
  ok(name, gap) {
    if (!this.ctx || !this.sfx) return false;
    const now = this.ctx.currentTime;
    if (now - (this.recent.get(name) ?? -9) < gap) return false;
    if (now - this.secT > 1) { this.secT = now; this.secCount = 0; }
    if (++this.secCount > 40) return false;
    this.recent.set(name, now);
    return true;
  }
  play(name) {
    const r = () => 0.9 + Math.random() * 0.25;
    switch (name) {
      case 'pop': if (this.ok(name, 0.05)) this.smp(pick(['hit1', 'hit2', 'hit3']), { vol: 0.32, rate: r() }); break;
      case 'paw': if (this.ok(name, 0.07)) this.smp(pick(['paw1', 'paw2']), { vol: 0.42, rate: r() }); break;
      case 'shoot': if (this.ok(name, 0.06)) this.smp('shoot', { vol: 0.22, rate: 1.1 + Math.random() * 0.3 }); break;
      case 'purify': if (this.ok(name, 0.06)) this.note('xylo', pick(PENTA), { vol: 0.26 }); break;
      case 'bigpurify': if (this.ok(name, 0.2)) { this.smp('sparkle', { vol: 0.5 }); this.run('xylo', ['C6', 'E6', 'G6', 'C7'], 0.07, { vol: 0.3 }); } break;
      case 'boing': if (this.ok(name, 0.1)) this.smp('whistle', { vol: 0.32, rate: r() }); break;
      case 'heart': if (this.ok(name, 0.1)) this.run('harp', ['D6', 'G6'], 0.1, { vol: 0.32 }); break;
      case 'chime': if (this.ok(name, 0.15)) this.run('xylo', ['C6', 'E6', 'G6'], 0.09, { vol: 0.34 }); break;
      case 'evolve': if (this.ok(name, 0.5)) { this.run('harp', ['C5', 'E5', 'G5', 'B5', 'D6', 'F6', 'A6'], 0.06, { vol: 0.4 }); this.smp('windchime', { vol: 0.4, delay: 0.35 }); } break;
      case 'whoosh': if (this.ok(name, 0.1)) this.smp('whoosh', { vol: 0.32, rate: r() }); break;
      case 'hurt': if (this.ok(name, 0.12)) this.smp('hurt', { vol: 0.22, rate: 0.8 + Math.random() * 0.3 }); break;
      case 'thud': if (this.ok(name, 0.15)) { this.smp('thud', { vol: 0.6 }); this.smp('tom', { vol: 0.4 }); } break;
      case 'warn': if (this.ok(name, 0.6)) { this.smp('bell', { vol: 0.42 }); this.smp('bell', { vol: 0.3, rate: 1.12, delay: 0.32 }); } break;
      case 'rain': if (this.ok(name, 0.5)) { this.smp('splash', { vol: 0.32 }); this.smp('impact', { vol: 0.28 }); } break;
      case 'umbrella': if (this.ok(name, 0.08)) this.smp('hit3', { vol: 0.28, rate: 1.5 + Math.random() * 0.3 }); break;
      case 'steal': if (this.ok(name, 0.3)) this.smp('sneak', { vol: 0.38 }); break;
      case 'fruit': if (this.ok(name, 0.2)) this.run('xylo', ['G5', 'C6'], 0.09, { vol: 0.34 }); break;
      case 'coin': if (this.ok(name, 0.15)) this.smp('till', { vol: 0.26 }); break;
      case 'hatch': if (this.ok(name, 0.3)) { this.smp('crack', { vol: 0.5 }); this.run('harp', ['C6', 'E6', 'G6'], 0.07, { vol: 0.3, delay: 0.25 }); } break;
      case 'gift': if (this.ok(name, 0.3)) { this.smp('windchime', { vol: 0.45 }); this.run('harp', ['C5', 'E5', 'G5', 'C6'], 0.06, { vol: 0.3 }); } break;
      case 'win': if (this.ok(name, 1)) { this.run('xylo', ['C5', 'E5', 'G5', 'C6'], 0.12, { vol: 0.38 }); this.run('xylo', ['G5', 'C6'], 0.18, { vol: 0.38, delay: 0.55 }); this.run('harp', ['C5', 'E5', 'G5'], 0.03, { vol: 0.3, delay: 0.55 }); } break;
      case 'lose': if (this.ok(name, 1)) this.smp('trombone', { vol: 0.45 }); break;
      case 'sob': if (this.ok(name, 1)) this.run('violin', ['E5', 'C5', 'A4', 'G4'], 0.42, { vol: 0.32, dur: 0.48 }); break;
      case 'lantern': if (this.ok(name, 0.4)) { this.smp('glass', { vol: 0.35 }); this.run('harp', ['C5', 'E5', 'G5', 'B5', 'D6', 'F6', 'A6'], 0.14, { vol: 0.34 }); } break;
      case 'duo': if (this.ok(name, 0.4)) { this.run('xylo', ['G5', 'C6', 'E6', 'G6', 'C7'], 0.04, { vol: 0.3 }); this.smp('impact', { vol: 0.42, delay: 0.25 }); this.smp('sparkle', { vol: 0.28, delay: 0.25 }); } break;
      // 回家种田
      case 'water': if (this.ok(name, 0.2)) this.smp('splash', { vol: 0.22, rate: 1.4 }); break;
      case 'plant': if (this.ok(name, 0.12)) { this.smp('hit1', { vol: 0.3, rate: 0.8 }); this.note('xylo', pick(['C6', 'E6']), { vol: 0.2, delay: 0.08 }); } break;
      case 'harvest': if (this.ok(name, 0.1)) { this.smp('hit2', { vol: 0.32, rate: 1.2 }); this.note('xylo', pick(PENTA), { vol: 0.24, delay: 0.05 }); } break;
      case 'sell': if (this.ok(name, 0.3)) this.smp('till', { vol: 0.34 }); break;
      case 'unlock': if (this.ok(name, 0.5)) { this.smp('windchime', { vol: 0.4 }); this.run('xylo', ['C6', 'E6', 'G6', 'C7'], 0.08, { vol: 0.32 }); } break;
      default: break;
    }
  }
  event(e, game) {
    if (!this.ctx || !this.sfx) return;
    switch (e.type) {
      case 'hit': this.play(e.foe ? 'hurt' : e.kind === 'paw' || e.kind === 'claw' ? 'paw' : 'pop'); break;
      case 'sfx': if (e.name === 'atk') this.play(['fox', 'hamster', 'penguin', 'dragon', 'bunny'].includes(e.sp) ? 'shoot' : 'paw'); break;
      case 'purify': this.play(e.role === 'minion' ? 'purify' : 'bigpurify'); break;
      case 'pat': case 'feed': this.play('heart'); break;
      case 'hatch': this.play('hatch'); break;
      case 'levelup': this.play('chime'); break;
      case 'evolve': this.play('evolve'); break;
      case 'dodge': this.play('whoosh'); break;
      case 'ult': this.play('boing'); break;
      case 'zone': this.play('warn'); break;
      case 'strike': this.play(e.full ? 'thud' : 'rain'); break;
      case 'shake': if ((e.k || 0) >= 8) this.play('thud'); break;
      case 'intercept': this.play('umbrella'); break;
      case 'steal': case 'fruitLost': this.play('steal'); break;
      case 'fruitBack': case 'fruitReturn': this.play('fruit'); break;
      case 'loot': this.play('coin'); break;
      case 'giftfx': case 'awaken': this.play('gift'); break;
      case 'clear': this.play('win'); break;
      case 'wish': case 'tame': this.play('chime'); break;
      case 'wishStolen': this.play('steal'); break;
      case 'wishBack': case 'plant': this.play('fruit'); break;
      case 'hugBoss': case 'hugFriend': this.play('heart'); break;
      case 'likeShield': this.play('umbrella'); break;
      case 'comfortStart': this.play('sob'); break;
      case 'comforted': this.play('win'); break;
      case 'wishTrue': this.play('lantern'); break;
      case 'duo': this.play('duo'); break;
      case 'result': if (!e.clear) this.play('lose'); break;
      default: break;
    }
    void game;
  }
}
