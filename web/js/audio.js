// Synthetischer Klang über Web Audio – keine Audiodateien.
// Räumlich: Lautstärke, Stereo-Position und Tiefpass nach Entfernung; Schall kommt mit Verzögerung (343 m/s).
import * as THREE from './lib/three.module.min.js';

let SR = 44100;   // wird beim Start auf die Rate des Geräts gesetzt (Android meist 48 kHz)
const _v = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3();

export class AudioSys {
  constructor() { this.ctx = null; this.volume = 0.8; this.active = 0; }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    SR = ctx.sampleRate || 44100;
    this.master = ctx.createGain(); this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.knee.value = 10;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    this.amb = ctx.createGain(); this.amb.gain.value = 0.7; this.amb.connect(this.master);
    // Nachhall (synthetische Impulsantwort)
    this.verbIn = ctx.createGain(); this.verbIn.gain.value = 0.32;
    try { this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(2.4, 2.2); this.verbIn.connect(this.verb).connect(this.master); } catch (e) { console.warn('Hall nicht verfügbar', e); }
    // Taubheit nach Explosionen: globaler Tiefpass
    this.deaf = ctx.createBiquadFilter(); this.deaf.type = 'lowpass'; this.deaf.frequency.value = 20000;
    this.sfx.disconnect(); this.sfx.connect(this.deaf).connect(this.master);
    this.B = {
      rifle: this.shot(0.55, 900, 0.9, 0.012), carbine: this.shot(0.4, 1500, 0.6, 0.01), smg45: this.shot(0.28, 700, 0.55, 0.008),
      smg9: this.shot(0.26, 1100, 0.5, 0.008), stg: this.shot(0.34, 1300, 0.6, 0.009), mg42: this.shot(0.3, 1000, 0.8, 0.008),
      pistol: this.shot(0.25, 1300, 0.4, 0.007), mg50: this.shot(0.5, 600, 1.0, 0.012), rocket: this.rocketLaunch(), cannon: this.boom(1.2, 0.5),
      boom: this.boom(2.6, 1), boomSmall: this.boom(1.4, 0.6), boomBig: this.boom(3.8, 1.4), crack: this.crack(), ping: this.ping(),
      click: this.click(0.02, 5000), bolt: this.bolt(), mag: this.click(0.05, 1800), whistle: this.whistle(), mimi: this.mimi(),
      step: this.click(0.06, 600), thud: this.click(0.12, 220), hit: this.click(0.04, 3000), ring: this.ring(), flak: this.shot(0.3, 800, 0.6, 0.01),
      ricochet: this.ricochet(), throw: this.click(0.15, 900),
    };
    this.loops = {};
    this.startLoops();
  }

  // ------------------------------------------------------------ Synthese
  buf(sec, fn) {
    const n = Math.floor(SR * sec), b = this.ctx.createBuffer(1, n, SR), d = b.getChannelData(0);
    fn(d, n);
    let m = 0; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(d[i]));
    if (m > 0) for (let i = 0; i < n; i++) d[i] /= m;
    return b;
  }
  impulse(sec, decay) {
    const n = Math.floor(SR * sec), b = this.ctx.createBuffer(2, n, SR);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) * (i < SR * 0.01 ? i / (SR * 0.01) : 1); }
    return b;
  }
  // Schuss: Knall (Rauschen, schnell abfallend) + Druckwelle (tiefer Puls) + Nachklang
  shot(len, body, boom, attack) {
    return this.buf(len, (d, n) => {
      let lp = 0, lp2 = 0;
      const k1 = Math.min(0.9, body / 2500);
      for (let i = 0; i < n; i++) {
        const t = i / SR, w = Math.random() * 2 - 1;
        lp += (w - lp) * k1; lp2 += (lp - lp2) * 0.08;
        const env = t < attack ? t / attack : Math.exp(-(t - attack) * 38);
        const tail = Math.exp(-t * 7) * 0.35;
        const thump = Math.sin(2 * Math.PI * (95 - t * 120) * t) * Math.exp(-t * 28) * boom;
        d[i] = (w * 0.7 + lp * 0.6) * env + lp2 * tail * 1.4 + thump * 0.8;
      }
    });
  }
  boom(len, low) {
    return this.buf(len, (d, n) => {
      let lp = 0, lp2 = 0;
      for (let i = 0; i < n; i++) {
        const t = i / SR, w = Math.random() * 2 - 1;
        lp += (w - lp) * 0.05; lp2 += (lp - lp2) * 0.04;
        const env = t < 0.006 ? t / 0.006 : Math.exp(-t * (2.4 / low));
        d[i] = (lp2 * 4 + lp * 0.8 + w * Math.exp(-t * 40) * 0.6) * env + Math.sin(t * 2 * Math.PI * (45 - t * 18)) * Math.exp(-t * 3) * 0.6;
      }
    });
  }
  crack() { return this.buf(0.09, (d, n) => { for (let i = 0; i < n; i++) { const t = i / SR; d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 90) + Math.sin(t * 9000) * Math.exp(-t * 200) * 0.5; } }); }
  ping() { return this.buf(0.7, (d, n) => { for (let i = 0; i < n; i++) { const t = i / SR; d[i] = (Math.sin(t * 2 * Math.PI * 2650) + Math.sin(t * 2 * Math.PI * 4120) * 0.5 + Math.sin(t * 2 * Math.PI * 6800) * 0.25) * Math.exp(-t * 7) * (t < 0.002 ? t / 0.002 : 1); } }); }
  click(len, f) { return this.buf(len, (d, n) => { let lp = 0; const k = Math.min(0.9, f / SR * 6); for (let i = 0; i < n; i++) { const t = i / SR; lp += ((Math.random() * 2 - 1) - lp) * k; d[i] = lp * Math.exp(-t * (4 / len)); } }); }
  bolt() {
    return this.buf(0.7, (d) => {
      const ev = [[0, 2600, 0.04], [0.16, 1800, 0.05], [0.36, 2200, 0.05], [0.55, 3000, 0.04]];
      for (const [t0, f, l] of ev) for (let i = 0; i < SR * l; i++) { const t = i / SR, k = Math.floor((t0 + t) * SR); if (k < d.length) d[k] += ((Math.random() * 2 - 1) * 0.6 + Math.sin(t * f * 6.28) * 0.4) * Math.exp(-t * 80); }
    });
  }
  whistle() {   // anfliegende Granate: absinkender Pfeifton
    return this.buf(1.6, (d, n) => { let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR, f = 1500 - t * 700; ph += 2 * Math.PI * f / SR; d[i] = (Math.sin(ph) * 0.7 + (Math.random() * 2 - 1) * 0.25) * Math.min(1, t * 2) * (t > 1.5 ? (1.6 - t) * 10 : 1); } });
  }
  mimi() {      // Nebelwerfer: heulendes Kreischen
    return this.buf(2.6, (d, n) => { let ph = 0, lp = 0; for (let i = 0; i < n; i++) { const t = i / SR, f = 380 + Math.sin(t * 7) * 60 + t * 120; ph += 2 * Math.PI * f / SR; lp += ((Math.random() * 2 - 1) - lp) * 0.2; d[i] = (Math.sin(ph) * 0.5 + Math.sin(ph * 2.01) * 0.3 + lp * 0.6) * Math.min(1, t * 3) * Math.min(1, (2.6 - t) * 2); } });
  }
  ring() { return this.buf(3, (d, n) => { for (let i = 0; i < n; i++) { const t = i / SR; d[i] = Math.sin(t * 2 * Math.PI * 3800) * Math.exp(-t * 1.1); } }); }
  ricochet() { return this.buf(0.5, (d, n) => { let ph = 0; for (let i = 0; i < n; i++) { const t = i / SR, f = 3200 - t * 3000; ph += 2 * Math.PI * f / SR; d[i] = Math.sin(ph) * Math.exp(-t * 6) * 0.8 + (Math.random() * 2 - 1) * Math.exp(-t * 60); } }); }
  rocketLaunch() { return this.buf(1.2, (d, n) => { let lp = 0; for (let i = 0; i < n; i++) { const t = i / SR; lp += ((Math.random() * 2 - 1) - lp) * 0.3; d[i] = lp * (t < 0.01 ? t / 0.01 : Math.exp(-t * 2.5)) + (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.8; } }); }
  noiseBuf(sec, k) { return this.buf(sec, (d, n) => { let lp = 0; for (let i = 0; i < n; i++) { lp += ((Math.random() * 2 - 1) - lp) * k; d[i] = lp; } }); }

  // ------------------------------------------------------------ Dauerklänge: Wind, Brandung, Regen, Motoren
  startLoops() {
    const ctx = this.ctx;
    const loop = (buf, filt, f, q = 0.7) => {
      const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true;
      const fl = ctx.createBiquadFilter(); fl.type = filt; fl.frequency.value = f; fl.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      s.connect(fl).connect(g).connect(this.amb); s.start();
      return { s, fl, g };
    };
    this.loops.wind = loop(this.noiseBuf(4, 0.05), 'bandpass', 420, 0.6);
    this.loops.surf = loop(this.noiseBuf(5, 0.12), 'lowpass', 900);
    this.loops.rain = loop(this.noiseBuf(3, 0.9), 'highpass', 2600);
    // Flugzeugmotor: Sägezahn mit Schwebung
    const eng = (f) => {
      const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(); o1.type = 'sawtooth'; o2.type = 'sawtooth';
      o1.frequency.value = f; o2.frequency.value = f * 1.013;
      const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = 500;
      const g = ctx.createGain(); g.gain.value = 0;
      const pan = ctx.createStereoPanner();
      o1.connect(fl); o2.connect(fl); fl.connect(g).connect(pan).connect(this.sfx); o1.start(); o2.start();
      return { o1, o2, fl, g, pan, f };
    };
    this.loops.plane = eng(68);
    this.loops.tank = eng(38);
  }

  setLoop(name, vol, freq) {
    const l = this.loops && this.loops[name];
    if (!l) return;
    const t = this.ctx.currentTime;
    l.g.gain.setTargetAtTime(vol, t, 0.3);
    if (freq && l.fl) l.fl.frequency.setTargetAtTime(freq, t, 0.3);
  }
  setEngine(name, vol, pitch = 1, pan = 0) {
    const l = this.loops && this.loops[name];
    if (!l) return;
    const t = this.ctx.currentTime;
    l.g.gain.setTargetAtTime(vol, t, 0.15);
    l.o1.frequency.setTargetAtTime(l.f * pitch, t, 0.15); l.o2.frequency.setTargetAtTime(l.f * pitch * 1.013, t, 0.15);
    l.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, pan)), t, 0.1);
  }

  // ------------------------------------------------------------ Abspielen
  setListener(cam) { this.cam = cam; }
  setVolume(v) { this.volume = v; if (this.master) this.master.gain.value = v; }

  // pos: Weltposition (null = am Hörer), vol, rate, opts: { far: Hörweite, delay: zusätzlich, verb }
  play(name, pos = null, vol = 1, rate = 1, opts = {}) {
    if (!this.ctx || !this.B) return;
    if (pos && !(Number.isFinite(pos.x) && Number.isFinite(pos.y) && Number.isFinite(pos.z))) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const b = this.B[name];
    if (!b) return;
    if (this.active > 48 && !opts.important) return;
    const ctx = this.ctx;
    let dist = 0, pan = 0;
    if (pos && this.cam) {
      _v.subVectors(pos, this.cam.position);
      dist = _v.length();
      this.cam.getWorldDirection(_f);
      _r.crossVectors(_f, this.cam.up).normalize();
      pan = dist > 0.5 ? _v.dot(_r) / dist : 0;
    }
    const far = opts.far || 600;
    if (dist > far * 2.5) return;
    const att = 1 / (1 + Math.pow(dist / (far * 0.08), 1.6));
    const g = ctx.createGain(); g.gain.value = vol * att;
    const src = ctx.createBufferSource(); src.buffer = b; src.playbackRate.value = rate * (dist > 200 ? 0.92 : 1);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.max(500, 16000 / (1 + dist / 60));
    const p = ctx.createStereoPanner(); p.pan.value = Number.isFinite(pan) ? pan * 0.85 : 0;
    src.connect(lp).connect(g).connect(p).connect(this.sfx);
    if (opts.verb !== false) { const vg = ctx.createGain(); vg.gain.value = Math.min(1.2, 0.25 + dist / 300) * vol * Math.min(1, att * 3); p.connect(vg).connect(this.verbIn); }
    const delay = (opts.noDelay ? 0 : dist / 343) + (opts.delay || 0);
    src.start(ctx.currentTime + delay);
    this.active++;
    src.onended = () => { this.active--; };
  }

  // Taubheit/Tinnitus nach naher Explosion
  concussion(k) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.deaf.frequency.cancelScheduledValues(t);
    this.deaf.frequency.setValueAtTime(Math.max(300, 2500 - k * 2200), t);
    this.deaf.frequency.exponentialRampToValueAtTime(20000, t + 1.5 + k * 3);
    if (k > 0.4) this.play('ring', null, 0.15 * k, 1, { verb: false, important: true });
  }

  // Funk-Piepser für eingehende Meldungen
  radio() {
    if (!this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.value = 1400; o.type = 'square';
    g.gain.setValueAtTime(0.0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.01); g.gain.setValueAtTime(0.05, t + 0.07); g.gain.linearRampToValueAtTime(0, t + 0.09);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.1);
  }
}
