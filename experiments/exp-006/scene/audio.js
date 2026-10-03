// All sound is synthesised with the Web Audio API at runtime. No audio files exist in this project.
// Layers: rain wash (pink noise through filters), roof patter, hiss, distant traffic rumble, drips, wet tyre hiss for
// passing cars, a muffled club kick drum that gets louder near the door, thunder and the convenience-store door chime.
export class RainAudio {
  constructor() { this.ctx = null; this.on = false; this.ready = false; this.active = true; this.nextBeat = 0; this.beat = 0; this.nextDrip = 0; }

  _noise(kind, seconds = 4) {
    const ctx = this.ctx, rate = ctx.sampleRate, len = Math.floor(seconds * rate), fade = Math.floor(0.25 * rate);
    const raw = new Float32Array(len + fade); let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < raw.length; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') raw[i] = w * 0.5;
      else if (kind === 'brown') { last = (last + 0.02 * w) / 1.02; raw[i] = last * 3.2; }
      else { b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898; raw[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926; }
    }
    // cross-fade the tail into the head so the loop has no click
    const out = ctx.createBuffer(1, len, rate), d = out.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = raw[i];
    for (let i = 0; i < fade; i++) { const k = i / fade; d[i] = raw[i] * k + raw[len + i] * (1 - k); }
    return out;
  }
  _loop(buffer, filters, gain) {
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = buffer; src.loop = true;
    let node = src; for (const f of filters) { node.connect(f); node = f; }
    const g = ctx.createGain(); g.gain.value = gain; node.connect(g); g.connect(this.master); src.start(); return g;
  }
  _f(type, freq, q = 0.7, gain) { const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; if (gain !== undefined) f.gain.value = gain; return f; }

  async enable() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      const ctx = this.ctx = new AC();
      this.master = ctx.createGain(); this.master.gain.value = 0;
      const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 4;
      this.master.connect(comp); comp.connect(ctx.destination);
      this.bufs = { pink: this._noise('pink', 5), white: this._noise('white', 3), brown: this._noise('brown', 6) };
      this.wash = this._loop(this.bufs.pink, [this._f('bandpass', 1700, 0.35), this._f('highshelf', 5200, 0.7, -6)], 0.55);
      this.patter = this._loop(this.bufs.pink, [this._f('lowpass', 620, 0.8), this._f('peaking', 340, 1.2, 5)], 0.38);
      this.hiss = this._loop(this.bufs.white, [this._f('highpass', 5600, 0.7)], 0.07);
      this.rumble = this._loop(this.bufs.brown, [this._f('lowpass', 150, 0.7)], 0.55);
      this.tyres = this._loop(this.bufs.pink, [this._f('bandpass', 950, 0.8)], 0);
      // slow LFO gives the wash a breathing quality
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.11; lg.gain.value = 0.08; lfo.connect(lg); lg.connect(this.wash.gain); lfo.start();
      const club = ctx.createGain(); club.gain.value = 0; const clp = this._f('lowpass', 170, 0.9); club.connect(clp); clp.connect(this.master); this.club = club;
      this.ready = true;
    }
    await this.ctx.resume();
    this.on = true; this.nextBeat = this.ctx.currentTime + 0.1; this.nextDrip = this.ctx.currentTime;
    this._ramp();
    return true;
  }
  disable() { this.on = false; if (this.ctx) { this._ramp(); } }
  setActive(v) { this.active = v; if (this.ctx) this._ramp(); }
  _ramp() { if (!this.ctx) return; const t = this.ctx.currentTime; this.master.gain.cancelScheduledValues(t); this.master.gain.setTargetAtTime(this.on && this.active ? 0.85 : 0, t, 0.25); }

  // listener state from the scene: distance to the club door, nearest car distance, rain intensity 0..1
  update(s) {
    if (!this.ready || !this.on || !this.active) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const carK = Math.max(0, 1 - s.carDist / 22) * Math.min(1, s.carSpeed / 6);
    this.tyres.gain.setTargetAtTime(0.5 * carK * carK, t, 0.15);
    this.rumble.gain.setTargetAtTime(0.38 + 0.25 * Math.max(0, 1 - s.carDist / 60), t, 0.5);
    this.club.gain.setTargetAtTime(Math.max(0, 1 - s.clubDist / 34) ** 1.6 * 0.9, t, 0.3);
    // club kick @ 124 BPM, scheduled a little ahead
    const spb = 60 / 124;
    while (this.nextBeat < t + 0.2) {
      const when = this.nextBeat, k = this.beat % 4;
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine';
      o.frequency.setValueAtTime(140, when); o.frequency.exponentialRampToValueAtTime(42, when + 0.14);
      g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(1, when + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.28);
      o.connect(g); g.connect(this.club); o.start(when); o.stop(when + 0.3);
      // off-beat bass note
      const b = ctx.createOscillator(), bg = ctx.createGain(); b.type = 'sawtooth'; b.frequency.value = [55, 55, 65.4, 49][(this.beat >> 2) % 4];
      bg.gain.setValueAtTime(0.0001, when + spb / 2); bg.gain.exponentialRampToValueAtTime(0.35, when + spb / 2 + 0.01); bg.gain.exponentialRampToValueAtTime(0.0001, when + spb / 2 + 0.2);
      b.connect(bg); bg.connect(this.club); b.start(when + spb / 2); b.stop(when + spb / 2 + 0.25);
      this.nextBeat += spb; this.beat++;
    }
    // random drips from awnings
    while (this.nextDrip < t + 0.1) {
      const when = Math.max(this.nextDrip, t), o = ctx.createOscillator(), g = ctx.createGain(), f = 1400 + Math.random() * 2600;
      o.type = 'sine'; o.frequency.setValueAtTime(f, when); o.frequency.exponentialRampToValueAtTime(f * 0.6, when + 0.05);
      g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(0.03 + Math.random() * 0.04, when + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.07);
      o.connect(g); g.connect(this.master); o.start(when); o.stop(when + 0.09);
      this.nextDrip += 0.08 + Math.random() * 0.45;
    }
  }
  thunder(strength = 1) {
    if (!this.ready || !this.on || !this.active) return;
    const ctx = this.ctx, t = ctx.currentTime;
    for (const [delay, f0, f1, len, vol] of [[0, 520, 70, 3.8, 1], [0.35, 300, 55, 5.2, 0.8]]) {
      const src = ctx.createBufferSource(); src.buffer = this.bufs.brown; src.loopStart = Math.random() * 3; src.loop = true;
      const lp = this._f('lowpass', f0, 0.8), g = ctx.createGain();
      lp.frequency.setValueAtTime(f0, t + delay); lp.frequency.exponentialRampToValueAtTime(f1, t + delay + len);
      g.gain.setValueAtTime(0.0001, t + delay); g.gain.exponentialRampToValueAtTime(1.6 * vol * strength, t + delay + 0.06); g.gain.exponentialRampToValueAtTime(0.5 * vol * strength, t + delay + 0.9); g.gain.exponentialRampToValueAtTime(0.0001, t + delay + len);
      src.connect(lp); lp.connect(g); g.connect(this.master); src.start(t + delay, src.loopStart); src.stop(t + delay + len + 0.1);
    }
  }
  chime() {   // convenience-store door chime, two soft sine notes
    if (!this.ready || !this.on || !this.active) return;
    const ctx = this.ctx, t = ctx.currentTime;
    [[1318.5, 0], [987.8, 0.32]].forEach(([f, d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.11, t + d + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.9);
      o.connect(g); g.connect(this.master); o.start(t + d); o.stop(t + d + 1);
    });
  }
}
