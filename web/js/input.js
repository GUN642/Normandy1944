// Eingabe: Tastatur/Maus (Pointer Lock, frei belegbar), Gamepad (Standard-Layout), Touchscreen (virtuelle Sticks + Tasten), Gyro.
import { clamp } from './util.js';

export const BIND_DEFS = [
  { g: { de: 'Bewegung', en: 'Movement' } },
  { id: 'fwd', de: 'Vorwärts', en: 'Forward', def: ['KeyW', 'ArrowUp'] },
  { id: 'back', de: 'Rückwärts', en: 'Back', def: ['KeyS', 'ArrowDown'] },
  { id: 'left', de: 'Links', en: 'Left', def: ['KeyA', 'ArrowLeft'] },
  { id: 'right', de: 'Rechts', en: 'Right', def: ['KeyD', 'ArrowRight'] },
  { id: 'sprint', de: 'Sprinten', en: 'Sprint', def: ['ShiftLeft'] },
  { id: 'jump', de: 'Springen / Aufstehen', en: 'Jump / stand up', def: ['Space'] },
  { id: 'crouch', de: 'Hocken', en: 'Crouch', def: ['KeyC', 'ControlLeft'] },
  { id: 'prone', de: 'Hinlegen', en: 'Go prone', def: ['KeyZ', 'KeyY'] },
  { g: { de: 'Kampf', en: 'Combat' } },
  { id: 'fire', de: 'Feuern', en: 'Fire', def: ['Mouse0'] },
  { id: 'aim', de: 'Zielen (Kimme / Zielfernrohr)', en: 'Aim down sights / scope', def: ['Mouse2'] },
  { id: 'reload', de: 'Nachladen', en: 'Reload', def: ['KeyR'] },
  { id: 'grenade', de: 'Handgranate werfen', en: 'Throw grenade', def: ['KeyG'] },
  { id: 'wnext', de: 'Nächste Waffe', en: 'Next weapon', def: ['KeyQ'] },
  { id: 'w1', de: 'Hauptwaffe', en: 'Primary', def: ['Digit1'] },
  { id: 'w2', de: 'Pistole / Zweitwaffe', en: 'Sidearm', def: ['Digit2'] },
  { id: 'w3', de: 'Granaten', en: 'Grenades', def: ['Digit3'] },
  { id: 'use', de: 'Benutzen (Sprengladung, Flagge, Seil)', en: 'Use (charge, flag, rope)', def: ['KeyE'] },
  { id: 'heal', de: 'Verband anlegen', en: 'Apply bandage', def: ['KeyH'] },
  { g: { de: 'Funk und Mehrspieler', en: 'Radio and multiplayer' } },
  { id: 'radio', de: 'Funkmenü (Unterstützung anfordern)', en: 'Radio menu (call support)', def: ['KeyF'] },
  { id: 'ptt', de: 'Sprechfunk senden (halten)', en: 'Push to talk (hold)', def: ['CapsLock', 'Mouse4'] },
  { id: 'chat', de: 'Text-Chat', en: 'Text chat', def: ['KeyK', 'KeyT'] },
  { id: 'score', de: 'Lage / Punkte', en: 'Scoreboard', def: ['Tab'] },
  { id: 'map', de: 'Karte', en: 'Map', def: ['KeyM'] },
  { id: 'view', de: 'Ego / Schulterkamera', en: 'First / third person', def: ['KeyV'] },
  { id: 'pause', de: 'Pause (Esc immer)', en: 'Pause (Esc always)', def: ['KeyP'] },
];
export const BINDS = BIND_DEFS.filter((b) => b.id);
export function resolveBinds(s) {
  const own = (s && s.binds) || {};
  const out = {};
  for (const b of BINDS) out[b.id] = Array.isArray(own[b.id]) ? own[b.id].slice(0, 2) : b.def.slice(0, 2);
  return out;
}
const KEYN = { Space: 'Leertaste', ShiftLeft: 'Shift', ControlLeft: 'Strg', CapsLock: 'Feststell', Mouse0: 'LMT', Mouse1: 'MMT', Mouse2: 'RMT', Mouse3: 'Maus 4', Mouse4: 'Maus 5', Tab: 'Tab', Escape: 'Esc', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
export function keyName(c) { if (!c) return '–'; if (KEYN[c]) return KEYN[c]; if (c.startsWith('Key')) return c.slice(3); if (c.startsWith('Digit')) return c.slice(5); return c; }

const DEAD = 0.15;
const dz = (v) => (Math.abs(v) < DEAD ? 0 : (v - Math.sign(v) * DEAD) / (1 - DEAD));

export class Input {
  constructor(canvas, settings) {
    this.canvas = canvas;
    this.settings = settings;
    this.down = new Set();     // gedrückte Codes (Tasten + Maus)
    this.act = new Set();      // aktive Aktionen (aktueller Frame)
    this.prev = new Set();
    this.move = { x: 0, y: 0 };
    this.look = { x: 0, y: 0 };
    this.mdx = 0; this.mdy = 0;
    this.device = 'keyboard';
    this.touchAct = new Set();
    this.gpAct = new Set();
    this.locked = false;
    this.refresh();
    window.addEventListener('keydown', (e) => {
      if (this.capture) { e.preventDefault(); const cb = this.capture; this.capture = null; cb(e.code); return; }
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (e.code === 'Tab' || e.code === 'Space' || e.code === 'CapsLock') e.preventDefault();
      this.device = 'keyboard';
      this.down.add(e.code);
      if (this.onKey) this.onKey(e.code, true);
    });
    window.addEventListener('keyup', (e) => { this.down.delete(e.code); });
    window.addEventListener('blur', () => this.releaseAll());
    // Touchgerät: Bedienfläche von Anfang an zeigen; Maus-Ersatzereignisse nach Berührungen ignorieren
    this.lastTouch = 0;
    const touchOn = () => { this.lastTouch = performance.now(); this.device = 'touch'; document.body.classList.add('touchmode'); };
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) document.body.classList.add('touchmode');
    window.addEventListener('touchstart', touchOn, { passive: true, capture: true });
    window.addEventListener('mousemove', (e) => { if (performance.now() - this.lastTouch > 1500 && (Math.abs(e.movementX) + Math.abs(e.movementY) > 0) && !('ontouchstart' in window)) document.body.classList.remove('touchmode'); });
    canvas.addEventListener('mousedown', (e) => {
      if (performance.now() - this.lastTouch < 1000) return;
      if (this.capture) { e.preventDefault(); const cb = this.capture; this.capture = null; cb('Mouse' + e.button); return; }
      this.device = 'keyboard';
      if (!this.locked && this.wantLock) this.lock();
      else this.down.add('Mouse' + e.button);
    });
    window.addEventListener('mouseup', (e) => { if (performance.now() - this.lastTouch < 1000) return; this.down.delete('Mouse' + e.button); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => { if (this.locked) { this.mdx += e.movementX; this.mdy += e.movementY; } });
    document.addEventListener('pointerlockchange', () => { this.locked = document.pointerLockElement === canvas; if (!this.locked) this.releaseAll(); if (this.onLock) this.onLock(this.locked); });
    // Android-App: Maus über die App eingefangen (WebView kennt kein Pointer Lock)
    window.N44_mouse = (dx, dy, buttons) => { this.device = 'keyboard'; this.mdx += dx; this.mdy += dy; for (let b = 0; b < 3; b++) { const on = !!(buttons & [1, 4, 2][b]); if (on) this.down.add('Mouse' + b); else this.down.delete('Mouse' + b); } };
    window.N44_mouseLock = (on) => { this.locked = !!on; };
    this.setupTouch();
    this.gyro = null; this.gyroPrev = null;
    window.addEventListener('deviceorientation', (e) => { if (e.alpha != null) this.gyro = { a: e.alpha, b: e.beta, g: e.gamma }; });
  }

  refresh() { this.binds = resolveBinds(this.settings); }
  releaseAll() { this.down.clear(); this.touchAct.clear(); }

  lock() {
    if (window.AndroidApp && window.AndroidApp.capturePointer && !('ontouchstart' in window && this.device === 'touch')) { try { if (window.AndroidApp.capturePointer(true)) return; } catch (_) { /* egal */ } }
    const plain = () => { try { const r2 = this.canvas.requestPointerLock(); if (r2 && r2.catch) r2.catch(() => {}); } catch (_) { /* egal */ } };
    try { const r = this.canvas.requestPointerLock({ unadjustedMovement: true }); if (r && r.catch) r.catch(plain); } catch (_) { plain(); }
  }
  unlock() { try { if (document.pointerLockElement) document.exitPointerLock(); if (window.AndroidApp && window.AndroidApp.capturePointer) window.AndroidApp.capturePointer(false); } catch (_) { /* egal */ } this.locked = false; }

  // Aktionsabfrage
  held(a) { return this.act.has(a); }
  pressed(a) { return this.act.has(a) && !this.prev.has(a); }
  released(a) { return !this.act.has(a) && this.prev.has(a); }

  // einmal pro Frame
  poll(dt, mode) {
    this.prev = this.act;
    this.act = new Set();
    const B = this.binds;
    for (const id in B) for (const c of B[id]) if (c && this.down.has(c)) this.act.add(id);
    for (const a of this.touchAct) this.act.add(a);
    // Bewegung
    let mx = (this.act.has('right') ? 1 : 0) - (this.act.has('left') ? 1 : 0);
    let my = (this.act.has('fwd') ? 1 : 0) - (this.act.has('back') ? 1 : 0);
    // Maus
    const ms = 0.0022;
    let lx = this.mdx * ms, ly = this.mdy * ms;
    this.mdx = 0; this.mdy = 0;
    // Gamepad
    this.pollGamepad(dt);
    if (this.gp) { mx += this.gp.mx; my += this.gp.my; lx += this.gp.lx * dt; ly += this.gp.ly * dt; for (const a of this.gpAct) this.act.add(a); }
    // Touch
    if (this.tStick) { mx += this.tStick.x; my += this.tStick.y; if (Math.hypot(this.tStick.x, this.tStick.y) > 0.95 && this.tStick.y > 0.7) this.act.add('sprint'); }
    lx += this.tLook.x * 0.0045; ly += this.tLook.y * 0.0045;
    this.tLook.x = 0; this.tLook.y = 0;
    // Gyro (Handy neigen) zum Feinzielen
    if (this.settings.gyro && this.gyro && this.device === 'touch') {
      if (this.gyroPrev) {
        let da = this.gyro.a - this.gyroPrev.a; if (da > 180) da -= 360; if (da < -180) da += 360;
        const db = this.gyro.b - this.gyroPrev.b;
        const k = 0.017 * (this.settings.gyroSens || 1);
        const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 90;
        const dg = this.gyro.g - this.gyroPrev.g;
        lx += -da * k;
        ly += (Math.abs(ang) === 90 || ang === 270 ? (ang === 90 ? dg : -dg) : -db) * k * 0.6;
      }
      this.gyroPrev = { ...this.gyro };
    }
    const l = Math.hypot(mx, my);
    if (l > 1) { mx /= l; my /= l; }
    this.move.x = mx; this.move.y = my;
    this.look.x = Number.isFinite(lx) ? lx : 0; this.look.y = Number.isFinite(ly) ? ly : 0;
    if (!Number.isFinite(this.move.x + this.move.y)) { this.move.x = 0; this.move.y = 0; }
    // Zielhilfe-Hinweis für Touch/Gamepad
    this.assist = this.device !== 'keyboard';
  }

  pollGamepad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let p = null;
    for (const x of pads) if (x && x.connected) { p = x; break; }
    this.gpAct.clear();
    if (!p) { this.gp = null; return; }
    const ax = p.axes, b = (i) => !!(p.buttons[i] && (p.buttons[i].pressed || p.buttons[i].value > 0.4));
    const any = ax.some((v) => Math.abs(v) > 0.3) || p.buttons.some((x) => x.pressed);
    if (any) this.device = 'gamepad';
    const sens = 2.6 * (this.settings.sensitivity || 1);
    const rx = dz(ax[2] || 0), ry = dz(ax[3] || 0);
    this.gp = { mx: dz(ax[0] || 0), my: -dz(ax[1] || 0), lx: Math.sign(rx) * rx * rx * sens, ly: Math.sign(ry) * ry * ry * sens * 0.75 };
    const map = { 0: 'jump', 1: 'crouch', 2: 'reload', 3: 'wnext', 4: 'grenade', 5: 'use', 6: 'aim', 7: 'fire', 8: 'score', 9: 'pause', 10: 'sprint', 11: 'prone', 12: 'radio', 13: 'heal', 14: 'ptt', 15: 'map' };
    for (const i in map) if (b(+i)) this.gpAct.add(map[i]);
    // Menüsteuerung
    this.gpMenu = { up: b(12) || (ax[1] || 0) < -0.6, down: b(13) || (ax[1] || 0) > 0.6, left: b(14) || (ax[0] || 0) < -0.6, right: b(15) || (ax[0] || 0) > 0.6, ok: b(0), back: b(1), start: b(9) };
  }

  // ------------------------------------------------------------ Touch
  setupTouch() {
    this.tStick = null; this.tLook = { x: 0, y: 0 };
    const stickEl = document.getElementById('t-stick'), knob = document.getElementById('t-knob');
    let stickId = null, lookId = null, sx = 0, sy = 0, lx = 0, ly = 0;
    const R = 60;
    const zone = document.getElementById('touch');
    if (!zone) return;
    zone.addEventListener('touchstart', (e) => {
      this.device = 'touch';
      document.body.classList.add('touchmode');
      for (const t of e.changedTouches) {
        if (t.target.closest && t.target.closest('.tb')) continue;
        if (t.clientX < window.innerWidth * 0.4 && stickId === null) {
          stickId = t.identifier; sx = t.clientX; sy = t.clientY;
          stickEl.style.left = sx - R + 'px'; stickEl.style.top = sy - R + 'px'; stickEl.classList.add('on');
          this.tStick = { x: 0, y: 0 };
        } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
      }
      e.preventDefault();
    }, { passive: false });
    zone.addEventListener('touchmove', (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) {
          let dx = t.clientX - sx, dy = t.clientY - sy; const d = Math.hypot(dx, dy);
          if (d > R) { dx *= R / d; dy *= R / d; }
          knob.style.transform = `translate(${dx}px,${dy}px)`;
          this.tStick = { x: dx / R, y: -dy / R };
        } else if (t.identifier === lookId) {
          const s = this.settings.sensitivity || 1;
          this.tLook.x += (t.clientX - lx) * s; this.tLook.y += (t.clientY - ly) * s;
          lx = t.clientX; ly = t.clientY;
        }
      }
      e.preventDefault();
    }, { passive: false });
    const end = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === stickId) { stickId = null; this.tStick = null; stickEl.classList.remove('on'); knob.style.transform = ''; }
        if (t.identifier === lookId) lookId = null;
      }
    };
    zone.addEventListener('touchend', end); zone.addEventListener('touchcancel', end);
    // Tasten: data-a = Aktion; data-toggle = Umschalter (z. B. Zielen)
    document.querySelectorAll('.tb[data-a]').forEach((b) => {
      const a = b.dataset.a;
      const on = (e) => {
        e.preventDefault(); e.stopPropagation();
        this.device = 'touch';
        if (b.dataset.toggle) { if (this.touchAct.has(a)) { this.touchAct.delete(a); b.classList.remove('on'); } else { this.touchAct.add(a); b.classList.add('on'); } return; }
        this.touchAct.add(a); b.classList.add('on');
        // Feuern-Taste dient gleichzeitig zum Umsehen
        if (a === 'fire') { b._lid = e.changedTouches[0].identifier; b._lx = e.changedTouches[0].clientX; b._ly = e.changedTouches[0].clientY; }
      };
      const mv = (e) => {
        if (a !== 'fire') return;
        for (const t of e.changedTouches) if (t.identifier === b._lid) { const s = this.settings.sensitivity || 1; this.tLook.x += (t.clientX - b._lx) * s; this.tLook.y += (t.clientY - b._ly) * s; b._lx = t.clientX; b._ly = t.clientY; }
        e.preventDefault();
      };
      const off = (e) => { if (b.dataset.toggle) return; e.preventDefault(); this.touchAct.delete(a); b.classList.remove('on'); };
      b.addEventListener('touchstart', on, { passive: false });
      b.addEventListener('touchmove', mv, { passive: false });
      b.addEventListener('touchend', off); b.addEventListener('touchcancel', off);
    });
  }
  clearToggles() { document.querySelectorAll('.tb[data-toggle]').forEach((b) => { this.touchAct.delete(b.dataset.a); b.classList.remove('on'); }); }
}
