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
  { id: 'w4', de: 'Rauchgranate', en: 'Smoke grenade', def: ['Digit4'] },
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
      if (e.target && e.target.tagName === 'INPUT' && (e.target.type === 'text' || !e.target.type)) return;
      // Android-WebView (App, Android TV): Controller-Tasten kommen zusätzlich als Tastendruck an
      // (Steuerkreuz = Pfeiltasten, A = Enter …). Die Gamepad-Schnittstelle wertet sie bereits aus –
      // hier verschlucken, sonst doppelte Bestätigung, Fokussprünge und Gerätewechsel auf „Tastatur“.
      if (this.padRecent() && this.isPadKey(e)) { e.preventDefault(); e.stopPropagation(); return; }
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (e.code === 'Tab' || e.code === 'Space' || e.code === 'CapsLock') e.preventDefault();
      this.device = 'keyboard';
      this.down.add(e.code);
      if (this.onKey) this.onKey(e.code, true);
    });
    window.addEventListener('keyup', (e) => { this.down.delete(e.code); if (this.padRecent() && this.isPadKey(e)) e.preventDefault(); });
    this.padT = -1e9;
    window.addEventListener('blur', () => this.releaseAll());
    window.addEventListener('gamepadconnected', () => { this.device = 'gamepad'; });
    window.addEventListener('gamepaddisconnected', (e) => { if (e && e.gamepad && this.gpCal) delete this.gpCal[e.gamepad.index]; });
    // Touchgerät: Bedienfläche von Anfang an zeigen; Maus-Ersatzereignisse nach Berührungen ignorieren
    this.lastTouch = 0;
    const touchOn = () => { this.lastTouch = performance.now(); this.device = 'touch'; document.body.classList.add('touchmode'); };
    let tv = /Android TV|AFT[A-Z]|BRAVIA|SMART-TV|SmartTV|GoogleTV|\bTV\b/i.test(navigator.userAgent);
    try { if (window.AndroidApp && window.AndroidApp.isTv) tv = tv || !!window.AndroidApp.isTv(); } catch (_) { /* ältere App */ }
    this.isTv = tv;
    if (!tv && navigator.maxTouchPoints > 0) document.body.classList.add('touchmode');
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
  padRecent() { return performance.now() - this.padT < 1500; }
  isPadKey(e) {
    const c = e.code || '', k = e.key || '';
    return /^Arrow|^Enter$|^NumpadEnter$|^Space$|^Escape$|^Gamepad|^MediaPlay|^GoBack$|^BrowserBack$/.test(c) || c === '' || k === 'Unidentified' || /^Gamepad|^Enter$|^Escape$/.test(k) || (e.keyCode >= 96 && e.keyCode <= 110) || e.keyCode === 4;
  }
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

  // Gamepad – wie im Medevac-sim: Kalibrierung ruhender Achsen (Switch Pro/Joy-Con an Android melden
  // unbenutzte Achsen und Schultertasten dauerhaft bei −1/+1), rechter Stick auf 2/3 oder 2/5 bzw. 3/5,
  // Steuerkreuz auch als Achse/POV-Hut, alle verbundenen Controller (Joy-Cons sind zwei Geräte).
  // Tastenlage (Standard): 0 unten (Switch B) · 1 rechts (A) · 2 links (Y) · 3 oben (X) · 4 L · 5 R · 6 ZL · 7 ZR
  // 8 − · 9 + · 10 linker Stick · 11 rechter Stick · 12–15 Steuerkreuz
  pollGamepad(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    this.gpAct.clear();
    let mx = 0, my = 0, lx = 0, ly = 0, found = false;
    const menu = { up: false, down: false, left: false, right: false, ok: false, back: false, start: false };
    this.gpCal = this.gpCal || {};
    this.gpPrevB = this.gpPrevB || {};
    for (const gp of pads) {
      if (!gp || !gp.connected) continue;
      found = true;
      const ax = gp.axes;
      const btn = (i) => (gp.buttons[i] ? gp.buttons[i].value || (gp.buttons[i].pressed ? 1 : 0) : 0);
      const on = (i) => btn(i) > 0.4;
      const prev = this.gpPrevB[gp.index] || [];
      const cal = this.gpCal[gp.index] || (this.gpCal[gp.index] = { rest: ax.map(() => 0), nchg: ax.map(() => 0), center: ax.map(() => false), last: ax.slice(), still: ax.map(() => 0), moved: ax.map(() => 0) });
      for (let i = 0; i < ax.length; i++) {
        const v = ax[i] || 0;
        if (v === cal.last[i]) cal.still[i] += dt; else { cal.still[i] = 0; cal.last[i] = v; cal.nchg[i]++; }
        if (cal.nchg[i] > 3 && Math.abs(v) < 0.15) { cal.center[i] = true; cal.rest[i] = 0; }
        if (i >= 2 && !cal.center[i] && cal.nchg[i] <= 3 && cal.still[i] > 0.4 && Math.abs(v) > 0.5) cal.rest[i] = v;
        cal.moved[i] = Math.max(cal.moved[i], Math.abs(v - cal.rest[i]));
      }
      const A = (i) => { if (i >= ax.length) return 0; const r = cal.rest[i]; return Math.abs(r) > 0.3 ? 0 : dz((ax[i] || 0) - r); };
      let ri = 2, rj = 3;
      if (gp.mapping !== 'standard' && ax.length >= 6 && (Math.abs(cal.rest[3]) > 0.3 || (cal.moved[5] > 0.35 && cal.moved[3] < 0.2))) rj = 5;
      if (gp.mapping !== 'standard' && ax.length >= 6 && Math.abs(cal.rest[2]) > 0.3 && Math.abs(cal.rest[3]) < 0.3) { ri = 3; rj = 5; }
      const sx = A(0), sy = A(1), rx = A(ri), ry = A(rj);
      const any = Math.abs(sx) + Math.abs(sy) + Math.abs(rx) + Math.abs(ry) > 0.2 || gp.buttons.some((x) => x.pressed);
      if (any) { this.device = 'gamepad'; this.padT = performance.now(); document.body.classList.remove('touchmode'); }
      mx += sx; my += -sy;
      const sens = 2.6 * (this.settings.sensitivity || 1);
      lx += Math.sign(rx) * rx * rx * sens; ly += Math.sign(ry) * ry * ry * sens * 0.75;
      // Steuerkreuz: Tasten oder Achse (6/7) oder POV-Hut (9)
      let hx = (on(15) ? 1 : 0) - (on(14) ? 1 : 0), hy = (on(13) ? 1 : 0) - (on(12) ? 1 : 0);
      if (!hx && !hy && gp.mapping !== 'standard') {
        if (ax.length >= 8) { if (Math.abs(ax[7] || 0) > 0.5) hy = Math.sign(ax[7]); if (Math.abs(ax[6] || 0) > 0.5) hx = Math.sign(ax[6]); }
        if (ax.length > 9 && Math.abs(ax[9] || 0) <= 1) {
          const hv = ax[9];
          if (Math.abs(hv + 1) < 0.1) hy = -1; else if (Math.abs(hv - 0.143) < 0.1) hy = 1;
          else if (Math.abs(hv - 0.714) < 0.1) hx = -1; else if (Math.abs(hv + 0.429) < 0.1) hx = 1;
        }
      }
      const G = this.gpAct;
      if (this.radioMode) {
        // Funkmenü offen: Gesichtstasten wählen den Eintrag 1–4
        if (on(0)) G.add('w1'); if (on(1)) G.add('w2'); if (on(2)) G.add('w3'); if (on(3)) G.add('w4');
        if (hy < 0) G.add('radio');
      } else {
        if (on(0)) G.add('jump');
        if (on(1)) G.add('crouch');
        if (on(2)) G.add('reload');
        if (on(3)) G.add('wnext');
        if (on(4)) G.add('grenade');
        if (on(5)) G.add('use');
        if (btn(6) > 0.4) G.add('aim');
        if (btn(7) > 0.4) G.add('fire');
        if (on(11)) G.add('prone');
        if (hy < 0) G.add('radio');
        if (hy > 0) G.add('heal');
        if (hx < 0) G.add('ptt');
        if (hx > 0) G.add('map');
      }
      if (on(8)) G.add('score');
      if (on(9)) G.add('pause');
      // linken Stick drücken: Sprint umschalten (endet, wenn der Stick losgelassen wird)
      if (on(10) && !prev[10]) this.padSprint = !this.padSprint;
      if (Math.hypot(sx, sy) < 0.2) this.padSprint = false;
      if (this.padSprint) G.add('sprint');
      // Menüsteuerung: Stick, Steuerkreuz; bestätigen mit A oder B (beide unteren/rechten Tasten wie im Medevac-sim)
      menu.up = menu.up || hy < 0 || sy < -0.6; menu.down = menu.down || hy > 0 || sy > 0.6;
      menu.left = menu.left || hx < 0 || sx < -0.6; menu.right = menu.right || hx > 0 || sx > 0.6;
      menu.ok = menu.ok || on(0) || on(1); menu.back = menu.back || on(8); menu.start = menu.start || on(9);
      this.gpPrevB[gp.index] = gp.buttons.map((x) => x.pressed);
    }
    if (!found) { this.gp = null; this.gpMenu = null; return; }
    this.gp = { mx, my, lx, ly };
    this.gpMenu = menu;
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
        if (t.target.closest && (t.target.closest('.tb') || t.target.closest('button'))) continue;
        if (t.clientX < window.innerWidth * 0.4 && stickId === null) {
          stickId = t.identifier; sx = t.clientX; sy = t.clientY;
          stickEl.style.left = sx - R + 'px'; stickEl.style.top = sy - R + 'px'; stickEl.classList.add('on');
          this.tStick = { x: 0, y: 0 };
        } else if (lookId === null) { lookId = t.identifier; lx = t.clientX; ly = t.clientY; }
      }
      if (!(e.target.closest && e.target.closest('button'))) e.preventDefault();
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
