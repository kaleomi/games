// 屠龙战纪 · 合成音效 + 中文语音播报（都可在设置里关闭）
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

  // ───────── 背景音乐：程序合成的史诗魔幻配乐循环（不用音频文件） ─────────
  // D小调 Dm – B♭ – F – C 四小节循环，96 BPM：低音弦乐长音 + 竖琴琶音 + 合唱铺底 + 定音鼓；战斗中加战鼓和铜管重音
  setBgm(on, vol) {
    this.bgm = !!on; if (vol != null) this.bgmVol = Math.max(0, Math.min(1, vol));
    if (this.music) this.music.bus.gain.setTargetAtTime(this.bgm ? this.bgmVol * 0.34 : 0, this.ctx.currentTime, 0.3);
    this.syncBgm();
  }
  setIntensity(battle) { if (this.music) this.music.battle = !!battle; }
  syncBgm() {
    const c = this.ctx;
    if (!c || !this.bgm || this.music) return;
    const bus = c.createGain(); bus.gain.value = 0; bus.connect(c.destination);
    bus.gain.setTargetAtTime(this.bgmVol * 0.34, c.currentTime, 1.5);
    const beat = 60 / 96;
    const delay = c.createDelay(1); delay.delayTime.value = beat * 0.75;
    const fb = c.createGain(); fb.gain.value = 0.3; const wet = c.createGain(); wet.gain.value = 0.28;
    delay.connect(fb).connect(delay); delay.connect(wet).connect(bus);
    this.music = { bus, delay, step: 0, next: c.currentTime + 0.1, battle: false, beat };
    const tick = () => {
      const m = this.music; if (!m) return;
      while (m.next < c.currentTime + 0.25) { this.bgmStep(m.step, m.next); m.step++; m.next += m.beat / 4; }
    };
    this.music.timer = setInterval(tick, 50);
  }
  bgmStep(step, t) {
    const c = this.ctx, m = this.music, s16 = step % 16, bar = Math.floor(step / 16) % 4, beat = m.beat;
    const roots = [50, 46, 53, 48];            // D B♭ F C（MIDI）
    const chords = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]];
    const hz = n => 440 * 2 ** ((n - 69) / 12);
    const voice = (freq, dur, gain, type, { cut = 2400, atk = 0.01, dest = m.bus, detune = 0 } = {}) => {
      const o = c.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = detune;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + atk); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f).connect(g).connect(dest); o.start(t); o.stop(t + dur + 0.05);
      return g;
    };
    const r = roots[bar], ch = chords[bar];
    // 低音弦乐：每半小节一个长音（根音+五度）
    if (s16 % 8 === 0) { voice(hz(r - 24), beat * 2.1, 0.32, 'sawtooth', { cut: 380, atk: 0.12 }); voice(hz(r - 17), beat * 2.1, 0.16, 'sawtooth', { cut: 420, atk: 0.15 }); }
    // 竖琴琶音：八分音符往上爬两个八度，带回声
    if (s16 % 2 === 0) {
      const seq = [0, 1, 2, 3, 4, 5, 4, 2], k = seq[(s16 / 2) % 8], oct = Math.floor(k / 3), n = r + ch[k % 3] + 12 * oct;
      const g = voice(hz(n + 12), 0.5, 0.11, 'triangle', { cut: 3200 }); g.connect(m.delay);
    }
    // 合唱铺底：每小节一个慢起的和弦（两把微微失谐的锯齿波）
    if (s16 === 0) for (const iv of ch) for (const dt of [-7, 7]) voice(hz(r + 12 + iv), beat * 4.2, 0.035, 'sawtooth', { cut: 900, atk: 0.6, detune: dt });
    // 定音鼓：一拍、三拍；战斗中加密
    const timp = (gain) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.35); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5); o.connect(g).connect(m.bus); o.start(t); o.stop(t + 0.55); };
    const hit = (dur, freq, gain, type = 'highpass') => { const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; const src = c.createBufferSource(); src.buffer = buf; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = c.createGain(); g.gain.value = gain; src.connect(f).connect(g).connect(m.bus); src.start(t); };
    if (s16 === 0 || s16 === 8) { timp(0.75); hit(0.25, 180, 0.25, 'lowpass'); }
    if (m.battle) {
      // 战鼓：咚 咚咚 咚
      if ([4, 6, 12, 14].includes(s16)) timp(0.45);
      if (s16 === 4 || s16 === 12) hit(0.16, 900, 0.32);
      // 铜管重音：每小节第一拍
      if (s16 === 0) for (const iv of [0, 7, 12]) voice(hz(r + iv), beat * 0.9, 0.07, 'sawtooth', { cut: 1500, atk: 0.04 });
    }
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
      case 'phase': if (e.phase === 'battle') this.tone([294, 440, 587], 0.16, 0.13, 'sawtooth'); break;   // 出征号角
      case 'ballista': this.noise(0.18, 2600, 0.25); this.tone([196, 98], 0.08, 0.2, 'triangle'); break;
      case 'harpoonHit': this.noise(0.5, 700, 0.4); this.tone([73, 55], 0.12, 0.25, 'sawtooth'); break;
      case 'downed': this.noise(1.6, 260, 0.75); this.tone([110, 82, 55], 0.18, 0.28, 'sawtooth'); break;
      case 'shotdown': this.noise(1.2, 400, 0.6); this.tone([392, 523, 784], 0.12, 0.16, 'square'); break;
      case 'airborne': this.noise(1.4, 500, 0.35); this.tone([147, 156, 147], 0.25, 0.14, 'sawtooth'); break;   // 龙吼
      case 'blessed': this.tone([784, 988, 1175, 1568], 0.1, 0.11, 'sine'); break;
      case 'slayer': this.tone([392, 523, 659, 784, 1046], 0.12, 0.16, 'square'); break;
      case 'forge': this.noise(0.12, 5200, 0.25); this.tone([1568, 1175], 0.05, 0.12, 'triangle'); break;   // 打铁
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
