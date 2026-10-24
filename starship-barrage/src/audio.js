// 简单合成音效 + 中文语音播报（都可在设置里关闭）
export class Audio {
  constructor() {
    this.sfx = true;
    this.tts = false;
    this.bgm = true;
    this.bgmVol = 0.5;
    this.music = null;
    this.ctx = null;
    this.lastBoom = 0;
    this.booms = 0;
  }

  unlock() {
    if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; } }
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    this.syncBgm();
  }

  // ───────── 背景音乐：程序合成的太空电子乐循环（不用音频文件） ─────────
  // Am – F – C – G 四小节循环，110 BPM：低音八分音符 + 琶音 + 长音铺底 + 轻鼓；战斗中加鼓点密度
  setBgm(on, vol) {
    this.bgm = !!on; if (vol != null) this.bgmVol = Math.max(0, Math.min(1, vol));
    if (this.music) this.music.bus.gain.setTargetAtTime(this.bgm ? this.bgmVol * 0.32 : 0, this.ctx.currentTime, 0.3);
    this.syncBgm();
  }
  setIntensity(battle) { if (this.music) this.music.battle = !!battle; }
  syncBgm() {
    const c = this.ctx;
    if (!c || !this.bgm || this.music) return;
    const bus = c.createGain(); bus.gain.value = 0; bus.connect(c.destination);
    bus.gain.setTargetAtTime(this.bgmVol * 0.32, c.currentTime, 1.5);
    const delay = c.createDelay(1); delay.delayTime.value = 60 / 110 * 0.75;
    const fb = c.createGain(); fb.gain.value = 0.32; const wet = c.createGain(); wet.gain.value = 0.25;
    delay.connect(fb).connect(delay); delay.connect(wet).connect(bus);
    this.music = { bus, delay, step: 0, next: c.currentTime + 0.1, battle: false };
    const tick = () => {
      const m = this.music; if (!m) return;
      while (m.next < c.currentTime + 0.25) { this.bgmStep(m.step, m.next); m.step++; m.next += 60 / 110 / 4; }
    };
    this.music.timer = setInterval(tick, 50);
  }
  bgmStep(step, t) {
    const c = this.ctx, m = this.music, s16 = step % 16, bar = Math.floor(step / 16) % 4;
    const roots = [57, 53, 48, 55];            // A F C G（MIDI）
    const chords = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]];
    const hz = n => 440 * 2 ** ((n - 69) / 12);
    const note = (freq, dur, gain, type, dest = m.bus, cut = 2400) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = freq;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f).connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
      return g;
    };
    const r = roots[bar], ch = chords[bar];
    // 低音：八分音符
    if (s16 % 2 === 0) note(hz(r - 24 + (s16 % 8 === 6 ? 12 : 0)), 0.22, 0.5, 'sawtooth', m.bus, 520);
    // 琶音：十六分音符，带回声
    const arp = [0, 1, 2, 1, 2, 3, 2, 1];
    const iv = arp[s16 % 8], n = r + (iv === 3 ? 12 : ch[iv]);
    { const g = note(hz(n + 12), 0.16, 0.13, 'square', m.bus, 1800); g.connect(m.delay); }
    // 铺底：每小节一个长和弦
    if (s16 === 0) for (const iv2 of ch) note(hz(r + iv2), 60 / 110 * 4, 0.06, 'triangle', m.bus, 1200);
    // 鼓：底鼓四拍、军鼓二四拍、战斗中加踩镲
    if (s16 % 4 === 0) { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15); g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); o.connect(g).connect(m.bus); o.start(t); o.stop(t + 0.25); }
    const hit = (dur, freq, gain) => { const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; const src = c.createBufferSource(); src.buffer = buf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = freq; const g = c.createGain(); g.gain.value = gain; src.connect(f).connect(g).connect(m.bus); src.start(t); };
    if (s16 === 4 || s16 === 12) hit(0.18, 1200, 0.35);
    if (m.battle ? s16 % 2 === 1 : s16 % 4 === 2) hit(0.04, 7000, 0.16);
  }

  noise(dur, freq, gain) {
    const c = this.ctx; if (!c || !this.sfx) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = c.createGain(); g.gain.value = gain;
    src.connect(f).connect(g).connect(c.destination); src.start();
  }

  tone(freqs, dur, gain, type = 'sine') {
    const c = this.ctx; if (!c || !this.sfx) return;
    const t0 = c.currentTime;
    freqs.forEach((fq, i) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = fq;
      const g = c.createGain();
      g.gain.setValueAtTime(0, t0 + i * dur); g.gain.linearRampToValueAtTime(gain, t0 + i * dur + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i + 1) * dur + 0.15);
      o.connect(g).connect(c.destination); o.start(t0 + i * dur); o.stop(t0 + (i + 1) * dur + 0.2);
    });
  }

  event(e) {
    if (!this.ctx) return;
    const now = performance.now();
    if (now - this.lastBoom > 1000) { this.lastBoom = now; this.booms = 0; }
    switch (e.type) {
      case 'explode':
        if (this.booms++ < 6) this.noise(e.size >= 3 ? 1.2 : e.size >= 2 ? 0.6 : 0.25, e.size >= 3 ? 500 : 1400, e.size >= 3 ? 0.5 : 0.12);
        break;
      case 'cannon': this.noise(1.8, 300, 0.7); this.tone([55, 41], 0.4, 0.25, 'sawtooth'); break;
      case 'banner': if (e.tier >= 2) this.tone(e.tier >= 4 ? [523, 659, 784, 1046] : [659, 988], 0.09, 0.12, 'triangle'); break;
      case 'phase': if (e.phase === 'battle') this.tone([392, 523, 659], 0.12, 0.15, 'square'); break;
      default: break;
    }
  }

  say(text) {
    if (!this.tts || !('speechSynthesis' in window)) return;
    const s = window.speechSynthesis;
    if (s.pending || (s.speaking && this.queue > 2)) return;
    const u = new SpeechSynthesisUtterance(String(text).slice(0, 60));
    u.lang = 'zh-CN'; u.rate = 1.15;
    const voice = s.getVoices().find(v => /zh[-_]CN/i.test(v.lang));
    if (voice) u.voice = voice;
    this.queue = (this.queue || 0) + 1;
    u.onend = u.onerror = () => { this.queue = Math.max(0, (this.queue || 1) - 1); };
    s.speak(u);
  }
}
