// Звук без файлов: колокольчики, свист, бубенцы и музыкальная шкатулка синтезируются WebAudio.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12); // MIDI → Гц

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.soundOn = true;
    this.musicOn = true;
    this.musicTimer = null;
    this.musicPos = 0;
    this.nextNoteTime = 0;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !this.paused) this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = this.soundOn ? 1 : 0;
    this.sfxGain.connect(this.master);
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = this.musicOn ? 0.16 : 0;
    this.musicGain.connect(this.master);
    // ревер для колокольчиков
    this.reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 1.8;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    this.reverb.buffer = buf;
    this.revGain = ctx.createGain();
    this.revGain.gain.value = 0.22;
    this.reverb.connect(this.revGain).connect(this.master);
    // шум
    const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;
    if (this.musicOn) this.startMusic();
  }

  setSound(on) {
    this.soundOn = on;
    if (this.sfxGain) this.sfxGain.gain.value = on ? 1 : 0;
  }

  setMusic(on) {
    this.musicOn = on;
    if (!this.ctx) return;
    this.musicGain.gain.setTargetAtTime(on ? 0.16 : 0, this.ctx.currentTime, 0.1);
    if (on) this.startMusic();
  }

  pause() {
    this.paused = true;
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  resume() {
    this.paused = false;
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  // --- примитивы ---
  bell(freq, t, vol = 0.2, dur = 1.2, dest = this.sfxGain, rev = true) {
    const ctx = this.ctx;
    const partials = [[1, 1, 1], [2.0, 0.45, 0.5], [3.01, 0.22, 0.32], [4.18, 0.12, 0.22]];
    for (const [m, a, d] of partials) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq * m;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol * a, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur * d);
      o.connect(g).connect(dest);
      if (rev) g.connect(this.reverb);
      o.start(t);
      o.stop(t + dur * d + 0.05);
    }
  }

  tone(freq, t, dur, type = 'sine', vol = 0.2, slideTo = null) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noiseBurst(t, dur, f1, f2, vol = 0.2, q = 1.5) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f1, t);
    bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(this.sfxGain);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  jingle(t, n = 5, vol = 0.09) {
    for (let i = 0; i < n; i++) {
      const tt = t + i * 0.045 + Math.random() * 0.02;
      this.noiseBurst(tt, 0.09, 7000, 9000, vol, 6);
      this.tone(5200 + Math.random() * 900, tt, 0.08, 'sine', vol * 0.4);
    }
  }

  // --- звуки игры ---
  play(name, arg = 0) {
    if (!this.ctx || !this.soundOn || this.paused) return;
    const t = this.ctx.currentTime + 0.005;
    switch (name) {
      case 'click':
        this.tone(620, t, 0.07, 'sine', 0.18, 980);
        break;
      case 'whoosh':
        this.noiseBurst(t, 0.22, 700, 2600, 0.16, 1.2);
        break;
      case 'box': {
        const notes = [84, 88, 91];
        this.bell(NOTE(notes[Math.min(2, arg)]), t, 0.16, 1.0);
        break;
      }
      case 'shelf':
        this.tone(330, t, 0.09, 'triangle', 0.16, 180);
        this.noiseBurst(t, 0.06, 900, 500, 0.08, 2);
        break;
      case 'boxDone':
        this.jingle(t, 6, 0.08);
        [84, 88, 91, 96].forEach((n, i) => this.bell(NOTE(n), t + 0.05 + i * 0.07, 0.11, 0.9));
        break;
      case 'bump':
        this.tone(150, t, 0.2, 'sine', 0.35, 70);
        this.noiseBurst(t, 0.08, 400, 200, 0.15, 1);
        break;
      case 'heart':
        this.tone(523, t + 0.05, 0.16, 'triangle', 0.14, 440);
        this.tone(392, t + 0.18, 0.24, 'triangle', 0.14, 330);
        break;
      case 'coin':
        this.bell(NOTE(95), t, 0.1, 0.5);
        this.bell(NOTE(100), t + 0.07, 0.1, 0.6);
        break;
      case 'booster':
        [72, 76, 79, 84, 88].forEach((n, i) => this.bell(NOTE(n), t + i * 0.05, 0.09, 0.7));
        this.noiseBurst(t, 0.4, 1500, 6000, 0.05, 0.8);
        break;
      case 'pop':
        this.tone(400, t, 0.1, 'sine', 0.2, 900);
        break;
      case 'unlock':
        this.tone(300, t, 0.06, 'square', 0.06, 200);
        this.bell(NOTE(91), t + 0.06, 0.12, 0.8);
        break;
      case 'win':
        this.jingle(t, 10, 0.07);
        [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => this.bell(NOTE(n), t + i * 0.09, 0.12, 1.3));
        break;
      case 'fail':
        [67, 64, 60].forEach((n, i) => this.tone(NOTE(n), t + i * 0.16, 0.3, 'triangle', 0.16));
        break;
      case 'snow':
        this.noiseBurst(t, 0.25, 2500, 500, 0.18, 0.7);
        break;
    }
  }

  // --- музыка: «Jingle Bells» (общественное достояние) в стиле музыкальной шкатулки ---
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    // [нота MIDI или 0 = пауза, длительность в долях]
    const A = [[76, 1], [76, 1], [76, 2], [76, 1], [76, 1], [76, 2], [76, 1], [79, 1], [72, 1.5], [74, 0.5], [76, 4],
      [77, 1], [77, 1], [77, 1.5], [77, 0.5], [77, 1], [76, 1], [76, 1], [76, 0.5], [76, 0.5]];
    const B1 = [[76, 1], [74, 1], [74, 1], [76, 1], [74, 2], [79, 2]];
    const B2 = [[79, 1], [79, 1], [77, 1], [74, 1], [72, 4]];
    const melody = [...A, ...B1, ...A, ...B2, [0, 4]];
    const bass = { 0: 48, 8: 48, 16: 53, 20: 48, 24: 50, 28: 43, 32: 48, 40: 48, 48: 53, 52: 48, 56: 43, 60: 48 };
    this.melody = melody;
    this.bass = bass;
    this.beat = 0.27;
    this.musicPos = 0;
    this.beatPos = 0;
    this.nextNoteTime = this.ctx.currentTime + 0.3;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 90);
  }

  scheduleMusic() {
    if (!this.ctx || this.paused) return;
    if (!this.musicOn) return;
    while (this.nextNoteTime < this.ctx.currentTime + 0.35) {
      const [n, d] = this.melody[this.musicPos];
      const t = this.nextNoteTime;
      if (n) this.bell(NOTE(n + 12), t, 0.22, 1.1, this.musicGain, true);
      const b = this.bass[this.beatPos];
      if (b != null) {
        this.bell(NOTE(b + 12), t, 0.16, 1.6, this.musicGain, true);
        this.bell(NOTE(b + 19), t + this.beat, 0.08, 1.2, this.musicGain, true);
      }
      this.nextNoteTime += d * this.beat;
      this.beatPos += d;
      this.musicPos++;
      if (this.musicPos >= this.melody.length) { this.musicPos = 0; this.beatPos = 0; }
    }
  }
}

export const AUDIO = new AudioEngine();
