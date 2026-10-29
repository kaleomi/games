// 声音：小音效全部用 WebAudio 现合成（啵、蹦、叮、刷刷），不用素材；
// 背景音乐放 assets/audio/bgm_lobby.mp3、bgm_battle.mp3、bgm_boss.mp3、bgm_win.mp3（有就放，没有就不放）
const BASE = new URL('../assets/audio/', import.meta.url).href;

export class Audio {
  constructor() {
    this.sfx = true; this.bgm = true; this.bgmVol = 0.5; this.sfxVol = 0.7;
    this.ctx = null; this.bus = null; this.recent = new Map(); this.secT = 0; this.secCount = 0;
    this.tracks = {}; this.want = 'bgm_lobby'; this.available = null;
  }
  setAvailable(list) { this.available = new Set(list || []); }
  unlock() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); this.bus = this.ctx.createGain(); this.bus.gain.value = this.sfxVol * 0.6; this.bus.connect(this.ctx.destination); } catch { this.ctx = null; } }
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    this.syncBgm(true);
  }
  preload() {}
  setBgm(on, vol) { this.bgm = !!on; if (vol != null) this.bgmVol = Math.max(0, Math.min(1, vol)); this.syncBgm(true); }
  setSfxVol(v) { this.sfxVol = v; if (this.bus) this.bus.gain.value = v * 0.6; }
  pick(game) {
    let t = 'bgm_battle';
    if (game.phase === 'lobby') t = 'bgm_lobby';
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
  // 合成一个短音：type 波形，f0→f1 滑音，dur 秒
  tone(f0, f1, dur, { type = 'sine', vol = 0.3, delay = 0, attack = 0.005 } = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + dur + 0.02);
  }
  noise(dur, { vol = 0.2, freq = 1200, q = 1, delay = 0 } = {}) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.bus); s.start(t);
  }
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
    const r = Math.random;
    switch (name) {
      case 'pop': if (this.ok(name, 0.05)) this.tone(500 + r() * 200, 180, 0.08, { type: 'triangle', vol: 0.18 }); break;
      case 'paw': if (this.ok(name, 0.07)) { this.tone(260, 120, 0.09, { type: 'sine', vol: 0.3 }); this.noise(0.05, { vol: 0.12, freq: 800 }); } break;
      case 'shoot': if (this.ok(name, 0.06)) this.tone(900 + r() * 300, 1500, 0.06, { type: 'square', vol: 0.06 }); break;
      case 'purify': if (this.ok(name, 0.06)) { const b = 900 + r() * 200; this.tone(b, b * 1.5, 0.12, { type: 'sine', vol: 0.2 }); this.tone(b * 1.5, b * 2, 0.12, { type: 'sine', vol: 0.14, delay: 0.07 }); } break;
      case 'bigpurify': this.ok(name, 0.2) && [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, f, 0.25, { type: 'triangle', vol: 0.22, delay: i * 0.08 })); break;
      case 'boing': if (this.ok(name, 0.1)) this.tone(300, 700, 0.18, { type: 'sine', vol: 0.25 }); break;
      case 'heart': if (this.ok(name, 0.1)) { this.tone(880, 1320, 0.1, { vol: 0.15 }); this.tone(1320, 1760, 0.12, { vol: 0.12, delay: 0.08 }); } break;
      case 'chime': if (this.ok(name, 0.15)) [784, 988, 1175].forEach((f, i) => this.tone(f, f, 0.3, { type: 'triangle', vol: 0.2, delay: i * 0.07 })); break;
      case 'evolve': if (this.ok(name, 0.5)) [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, f * 1.01, 0.35, { type: 'triangle', vol: 0.24, delay: i * 0.11 })); break;
      case 'whoosh': if (this.ok(name, 0.1)) this.noise(0.2, { vol: 0.15, freq: 2200, q: 0.6 }); break;
      case 'hurt': if (this.ok(name, 0.12)) this.tone(420, 260, 0.12, { type: 'triangle', vol: 0.14 }); break;
      case 'thud': if (this.ok(name, 0.15)) { this.tone(120, 50, 0.3, { type: 'sine', vol: 0.45 }); this.noise(0.2, { vol: 0.2, freq: 300 }); } break;
      case 'warn': if (this.ok(name, 0.6)) [0, 0.18].forEach(d => this.tone(1200, 900, 0.12, { type: 'square', vol: 0.08, delay: d })); break;
      case 'rain': if (this.ok(name, 0.5)) this.noise(0.8, { vol: 0.25, freq: 3000, q: 0.4 }); break;
      case 'umbrella': if (this.ok(name, 0.08)) this.tone(600, 900, 0.07, { type: 'triangle', vol: 0.1 }); break;
      case 'steal': if (this.ok(name, 0.3)) [880, 660, 440].forEach((f, i) => this.tone(f, f * 0.9, 0.1, { type: 'square', vol: 0.08, delay: i * 0.08 })); break;
      case 'fruit': if (this.ok(name, 0.2)) [660, 880].forEach((f, i) => this.tone(f, f, 0.12, { type: 'sine', vol: 0.2, delay: i * 0.07 })); break;
      case 'coin': if (this.ok(name, 0.08)) { this.tone(988, 988, 0.06, { type: 'square', vol: 0.08 }); this.tone(1319, 1319, 0.14, { type: 'square', vol: 0.08, delay: 0.06 }); } break;
      case 'hatch': if (this.ok(name, 0.3)) { this.noise(0.08, { vol: 0.2, freq: 2500 }); [784, 988, 1319].forEach((f, i) => this.tone(f, f, 0.2, { type: 'triangle', vol: 0.2, delay: 0.1 + i * 0.07 })); } break;
      case 'gift': if (this.ok(name, 0.3)) [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, f, 0.25, { type: 'triangle', vol: 0.18, delay: i * 0.06 })); break;
      case 'win': if (this.ok(name, 1)) [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, f, 0.3, { type: 'triangle', vol: 0.25, delay: i * 0.12 })); break;
      case 'sob': if (this.ok(name, 1)) [660, 587, 523, 494, 440].forEach((f, i) => this.tone(f, f * 0.96, 0.28, { type: 'sine', vol: 0.16, delay: i * 0.16 })); break;
      case 'lantern': if (this.ok(name, 0.4)) [784, 988, 1175, 1568, 1319, 1568, 2093].forEach((f, i) => this.tone(f, f, 0.4, { type: 'sine', vol: 0.16, delay: i * 0.14 })); break;
      case 'duo': if (this.ok(name, 0.4)) { [659, 880, 1109, 1319].forEach((f, i) => this.tone(f, f * 1.02, 0.25, { type: 'triangle', vol: 0.2, delay: i * 0.05 })); this.tone(220, 110, 0.3, { type: 'sine', vol: 0.3, delay: 0.25 }); } break;
      case 'lose': if (this.ok(name, 1)) [523, 466, 392, 330].forEach((f, i) => this.tone(f, f * 0.98, 0.35, { type: 'triangle', vol: 0.2, delay: i * 0.18 })); break;
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
