// 简单合成音效 + 中文语音播报（都可在设置里关闭）
export class Audio {
  constructor() {
    this.sfx = true;
    this.tts = true;
    this.ctx = null;
    this.lastBoom = 0;
    this.booms = 0;
  }

  unlock() {
    if (this.ctx) return;
    try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; }
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
