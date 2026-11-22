// Panzer besetzen: Sitz 0 = Fahrer und Richtschütze (fahren, Turm drehen, Kanone), Sitz 1 = MG-Schütze.
// Die Besatzung eines Panzers steht in t.crew = [pid|null, pid|null] (Host: 0, Mitspieler: ihre Spieler-ID).
// Ein von einem Mitspieler gefahrener Panzer wird auf dessen Gerät gerechnet und dem Host gemeldet ('tdr').
import * as THREE from './lib/three.module.min.js';
import { WEAPONS } from './weapons.js';
import { clamp, wrapAngle, rand } from './util.js';
import { T } from './i18n.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _d = new THREE.Vector3(), _e = new THREE.Euler();
const RELOAD = 5.5;            // Nachladezeit der Kanone (s)
const SHELL_V = 750;           // Mündungsgeschwindigkeit (m/s, vereinfacht geradlinig)

export class Crew {
  constructor(g) { this.g = g; this.sendT = 0; }

  me() { return this.g.net ? this.g.net.myId : 0; }
  crewOf(t) { return t.crew || (t.crew = [null, null]); }

  // freier Platz in einem eigenen Panzer in der Nähe (für den Interaktionshinweis)
  seatNear(p) {
    let best = null, bd = 1e9;
    for (const t of this.g.units.tanks) {
      if (!t.alive || t.team !== p.team) continue;
      const d = Math.hypot(t.pos.x - p.pos.x, t.pos.z - p.pos.z);
      if (d > t.spec.len / 2 + 2.2 || d >= bd) continue;
      const c = this.crewOf(t);
      const seat = c[0] === null ? 0 : c[1] === null ? 1 : -1;
      if (seat < 0) continue;
      best = { t, seat }; bd = d;
    }
    if (!best) return null;
    const pad = this.g.input.device === 'gamepad';
    const what = best.seat === 0 ? T('Fahrer/Richtschütze', 'driver/gunner') : T('MG-Schütze', 'machine gunner');
    return { kind: 'tank', t: best.t, seat: best.seat, time: 0.7, text: (pad ? T('R halten', 'Hold R') : T('E halten', 'Hold E')) + T(`: in den ${best.t.spec.name} einsteigen (${what})`, `: board the ${best.t.spec.name} (${what})`) };
  }

  enter(t, seat) {
    const g = this.g, p = g.player;
    if (g.net && !g.net.isHost) { g.net.send({ t: 'tk', id: t.id, s: seat }); t.crewHold = { s: seat, v: this.me(), until: g.time + 2 }; }
    this.crewOf(t)[seat] = this.me();
    p.tank = t; p.seat = seat; p.ads = 0; p.dragging = null; p.stance = 0;
    p.tankYaw = t.yaw + (t.spec.casemate ? 0 : t.turretYaw);
    t.speedNow = 0; t.reload = Math.min(t.reload || 0, 2); t.gunEl = t.gunEl || 0; t.mgT = 0;
    if (seat === 0) { p.yaw = t.yaw + (t.spec.casemate ? 0 : t.turretYaw); p.pitch = 0; }
    const pad = g.input.device === 'gamepad';
    g.hud.toast(seat === 0
      ? (pad ? T('Linker Stick fahren · ZR Kanone · ZL Zielfernrohr · R aussteigen', 'Left stick drive · ZR cannon · ZL sight · R exit') : T('WASD fahren · Maus Turm · Linksklick Kanone · Rechtsklick Zielfernrohr · E aussteigen', 'WASD drive · mouse turret · LMB cannon · RMB sight · E exit'))
      : (pad ? T('ZR MG feuern · R aussteigen', 'ZR fire MG · R exit') : T('Linksklick MG feuern · E aussteigen', 'LMB fire MG · E exit')));
    g.audio.play('bolt', null, 0.5, 0.7);
  }

  exit(silent = false) {
    const g = this.g, p = g.player, t = p.tank;
    if (!t) return;
    const c = this.crewOf(t);
    if (c[p.seat] === this.me()) c[p.seat] = null;
    if (g.net && !g.net.isHost) { g.net.send({ t: 'tk', id: t.id, s: -1, o: p.seat }); t.crewHold = { s: p.seat, v: null, until: g.time + 2 }; }
    // neben dem Panzer absteigen (Seite zum Spieler-Blick, sonst links)
    const side = t.spec.wid / 2 + 1.0, cs = Math.cos(t.yaw), sn = Math.sin(t.yaw);
    for (const sx of [1, -1]) {
      const x = t.pos.x + sx * side * cs, z = t.pos.z - sx * side * sn;
      p.pos.set(x, 0, z); g.world.collide(p.pos, 0.4, g.world.groundAt(x, z), g.world.groundAt(x, z) + 1.7);
      if (Math.hypot(p.pos.x - x, p.pos.z - z) < 0.3) break;
    }
    p.pos.y = g.world.groundAt(p.pos.x, p.pos.z, t.pos.y + 2.5);
    p.vel.set(0, 0, 0);
    p.tank = null; p.seat = -1; t.speedNow = 0;
    if (!silent) g.audio.play('bolt', null, 0.4, 0.8);
  }

  // Panzer zerstört, während man drin sitzt
  tankLost(t) {
    const p = this.g.player;
    if (p.tank !== t) return;
    this.exit(true);
    this.g.damagePlayer(p.seat === 1 ? 70 : 85, null, { team: 'none' }, false, true, T('Panzer getroffen', 'Tank knocked out'));
  }

  // ------------------------------------------------------------ Steuerung (statt Laufen und Waffe)
  update(dt, inp) {
    const g = this.g, p = g.player, t = p.tank;
    if (!t || !t.alive) { if (t) this.tankLost(t); return; }
    const c = this.crewOf(t);
    if (c[p.seat] !== this.me()) { this.exit(true); return; }   // Platz vom Host neu vergeben
    // Blick
    const sens = (g.settings.sensitivity || 1) * (p.ads > 0.5 ? 0.35 : 1);
    p.yaw -= inp.look.x * sens;
    p.pitch = clamp(p.pitch - inp.look.y * sens * (g.settings.invertY ? -1 : 1), -0.5, 0.6);
    p.ads = clamp(p.ads + (inp.held('aim') ? dt * 5 : -dt * 6), 0, 1);
    p.sprinting = false; p.speed = 0; p.climbing = false;
    if (inp.pressed('use')) { this.exit(); return; }
    if (p.seat === 0) this.drive(dt, inp, t); else this.mg(dt, inp, t);
    // Spieler fährt mit
    p.pos.set(t.pos.x, t.pos.y + 1.2, t.pos.z);
    p.onGround = true; p.vel.set(0, 0, 0);
    // Mitspieler meldet seinen Panzer dem Host
    if (g.net && !g.net.isHost && p.seat === 0) {
      this.sendT -= dt;
      if (this.sendT <= 0) { this.sendT = 1 / 15; g.net.send({ t: 'tdr', id: t.id, x: r2(t.pos.x), z: r2(t.pos.z), y: r2(t.yaw), ty: r2(t.turretYaw), el: r2(t.gunEl || 0) }); }
    }
  }

  drive(dt, inp, t) {
    const g = this.g, W = g.world, S = t.spec, p = g.player;
    // Fahren: Gas/Rückwärts, Lenken auf der Stelle möglich (Kettenfahrzeug)
    const want = inp.move.y > 0 ? inp.move.y * S.speed * 1.35 : inp.move.y * S.speed * 0.5;
    t.speedNow = (t.speedNow || 0) + clamp(want - (t.speedNow || 0), -dt * 4, dt * 2.2);
    const turn = -inp.move.x * (0.55 - Math.min(0.25, Math.abs(t.speedNow) * 0.03)) * dt * (t.speedNow < -0.2 ? -1 : 1);
    t.yaw = wrapAngle(t.yaw + turn);
    const ox = t.pos.x, oz = t.pos.z;
    t.pos.x += -Math.sin(t.yaw) * t.speedNow * dt; t.pos.z += -Math.cos(t.yaw) * t.speedNow * dt;
    // Gelände: zu steil → stehen bleiben
    const h0 = W.groundAt(ox, oz, t.pos.y + 1), h1 = W.groundAt(t.pos.x, t.pos.z, t.pos.y + 1);
    const dd = Math.hypot(t.pos.x - ox, t.pos.z - oz);
    if (dd > 1e-4 && (h1 - h0) / dd > 0.9) { t.pos.x = ox; t.pos.z = oz; t.speedNow *= 0.3; }
    // Hindernisse: Häuser, Mauern, Hecken (Bocage!), andere Panzer
    const r = S.wid * 0.55;
    for (const off of [-S.len * 0.3, 0, S.len * 0.3]) {
      _v.set(t.pos.x - Math.sin(t.yaw) * off, 0, t.pos.z - Math.cos(t.yaw) * off);
      const bx = _v.x, bz = _v.z;
      W.collide(_v, r, t.pos.y + 0.3, t.pos.y + S.hgt);
      if (_v.x !== bx || _v.z !== bz) { t.pos.x += _v.x - bx; t.pos.z += _v.z - bz; t.speedNow *= 0.9; }
    }
    for (const o of g.units.tanks) {
      if (o === t || !o.alive && o.m.root.parent === null) continue;
      const dx = t.pos.x - o.pos.x, dz = t.pos.z - o.pos.z, d = Math.hypot(dx, dz), min = (S.len + o.spec.len) * 0.38;
      if (d < min && d > 1e-3) { t.pos.x = o.pos.x + dx / d * min; t.pos.z = o.pos.z + dz / d * min; t.speedNow *= 0.5; }
    }
    // Soldaten werden zur Seite gedrängt (nicht überfahren)
    for (const u of g.units.list) {
      if (!u.alive || u.inBoat) continue;
      const dx = u.pos.x - t.pos.x, dz = u.pos.z - t.pos.z, cs = Math.cos(t.yaw), sn = Math.sin(t.yaw);
      const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      if (Math.abs(lx) < S.wid / 2 + 0.4 && Math.abs(lz) < S.len / 2 + 0.4) {
        const nl = Math.sign(lx || 1) * (S.wid / 2 + 0.45);
        u.pos.x = t.pos.x + nl * cs + lz * sn; u.pos.z = t.pos.z - nl * sn + lz * cs;
      }
    }
    if (!t.static) { t.path = null; }
    t.moving = Math.abs(t.speedNow) > 0.2;
    // Zielpunkt: Strahl aus der Kamera; Turm und Kanone richten sich darauf aus
    const aim = this.aimPoint(t);
    const pv = this.pivot(t, _w);
    const dx = aim.x - pv.x, dz = aim.z - pv.z, dy = aim.y - pv.y;
    const wantYaw = Math.atan2(-dx, -dz);
    const trav = (S.casemate ? 0.35 : 0.75) * dt;
    if (S.casemate) {
      // Sturmgeschütz: kleiner Seitenrichtbereich, sonst mit dem Fahrzeug drehen
      t.turretYaw = clamp(t.turretYaw + clamp(wrapAngle(wantYaw - t.yaw - t.turretYaw), -trav, trav), -0.17, 0.17);
    } else t.turretYaw = wrapAngle(t.turretYaw + clamp(wrapAngle(wantYaw - t.yaw - t.turretYaw), -trav, trav));
    const wantEl = Math.atan2(dy, Math.hypot(dx, dz));
    t.gunEl = clamp((t.gunEl || 0) + clamp(wantEl - (t.gunEl || 0), -0.25 * dt, 0.25 * dt), -0.14, 0.33);
    t.m.turret.rotation.y = S.casemate ? 0 : t.turretYaw;
    t.m.gun.rotation.x = t.gunEl;
    if (S.casemate) t.m.gun.rotation.y = t.turretYaw;
    // Kanone
    t.reload = Math.max(0, (t.reload || 0) - dt);
    if (inp.pressed('fire') && t.reload <= 0) { this.fireMain(t); t.reload = RELOAD; }
    if (t.reload > 0 && t.reload - dt <= 0) g.audio.play('bolt', null, 0.5, 0.6);
    // Fahrgeräusch nahe
    if (t.moving) g.shake(0.006 * Math.min(1, Math.abs(t.speedNow) / 4));
  }

  // Drehpunkt der Kanone (Welt)
  pivot(t, out) {
    const S = t.spec, ty = t.yaw + (S.casemate ? 0 : t.turretYaw);
    const ty0 = S.casemate ? 1.3 : (t.type === 'sherman' ? 1.95 : t.type === 'h39' ? 1.55 : 1.8) + 0.35;
    const fwd = S.casemate ? S.len * 0.25 : S.turretR * 0.8;
    return out.set(t.pos.x - Math.sin(ty) * fwd, t.pos.y + ty0, t.pos.z - Math.cos(ty) * fwd);
  }
  gunDir(t, out) {
    const ty = t.yaw + t.turretYaw, el = t.gunEl || 0;
    return out.set(-Math.sin(ty) * Math.cos(el), Math.sin(el), -Math.cos(ty) * Math.cos(el));
  }
  aimPoint(t) {
    const g = this.g, cam = g.camera;
    cam.getWorldDirection(_d);
    const far = _v.copy(cam.position).addScaledVector(_d, 900);
    const tw = g.world.raycast(cam.position, far);
    this._aim = (this._aim || new THREE.Vector3()).copy(cam.position).lerp(far, Math.max(tw, 0.02));
    return this._aim;
  }

  fireMain(t) {
    const g = this.g, p = g.player;
    const pv = this.pivot(t, new THREE.Vector3()), dir = this.gunDir(t, new THREE.Vector3());
    // leichte Streuung
    dir.x += (rand() - 0.5) * 0.004; dir.y += (rand() - 0.5) * 0.003; dir.z += (rand() - 0.5) * 0.004; dir.normalize();
    const mz = pv.clone().addScaledVector(dir, t.m.muzzleLen + 0.4);
    g.effects.muzzle(mz, dir, true);
    g.effects.explosion(mz.x, mz.y, mz.z, 0.4);
    g.effects.puff(mz.x, mz.y, mz.z, { life: 2, s0: 1, s1: 4, a: 0.5, c: [0.7, 0.68, 0.64] });
    g.audio.play('cannon', null, 1, 1, { important: true });
    g.shake(0.5);
    const far = mz.clone().addScaledVector(dir, 1200);
    const tw = g.world.raycast(mz, far);
    const owner = { team: p.team, local: true, pid: g.net ? g.net.myId : 0 };
    const h = g.combat.hitTest(mz, far, owner);
    let hitT = tw;
    if (h && h.t < tw && !(h.kind === 'tank' && h.ent === t)) hitT = h.t;
    const hit = mz.clone().lerp(far, hitT);
    const dist = mz.distanceTo(hit);
    setTimeout(() => {
      if (!g.world) return;
      if (h && h.kind === 'tank' && h.ent !== t && h.t <= hitT + 1e-6) h.ent.damage(240 + rand() * 220, owner, true);
      g.combat.explode(hit, 170, 6.5, owner, true, 2);
    }, (dist / SHELL_V) * 1000);
    if (g.net) g.net.tankShot(t, mz, hit);
  }

  // MG-Schütze: Turm-/Fla-MG, freies Richten
  mg(dt, inp, t) {
    const g = this.g, p = g.player;
    const W = t.team === 'us' ? WEAPONS.bar : WEAPONS.mg42;
    const rate = t.team === 'us' ? 0.11 : 0.055;
    t.mgT = (t.mgT || 0) - dt;
    if (!inp.held('fire') || t.mgT > 0) return;
    t.mgT = rate;
    const o = this.mgPos(t, new THREE.Vector3());
    g.camera.getWorldDirection(_d);
    _d.x += (rand() - 0.5) * 0.012; _d.y += (rand() - 0.5) * 0.008; _d.z += (rand() - 0.5) * 0.012; _d.normalize();
    o.addScaledVector(_d, 0.6);
    t.mgN = (t.mgN || 0) + 1;
    const tracer = t.mgN % 4 === 0;
    const owner = { team: p.team, local: true, pid: g.net ? g.net.myId : 0 };
    g.combat.fire(o, _d, W, owner, true, tracer);
    g.netFire(o, _d, W.id, tracer);
    g.effects.muzzle(o, _d, true);
    g.audio.play(W.sound, null, 0.9, 0.97 + rand() * 0.06, { verb: true, important: true });
    p.pitch += 0.002; p.yaw += (rand() - 0.5) * 0.002;
  }
  mgPos(t, out) {
    const S = t.spec, ty = t.yaw + (S.casemate ? 0 : t.turretYaw);
    const top = S.casemate ? 2.1 : (t.type === 'sherman' ? 1.95 : t.type === 'h39' ? 1.55 : 1.8) + 1.15;
    return out.set(t.pos.x + Math.sin(ty) * 0.2, t.pos.y + top, t.pos.z + Math.cos(ty) * 0.2);
  }

  // ------------------------------------------------------------ Kamera
  view(dt) {
    const g = this.g, p = g.player, t = p.tank, cam = g.camera;
    if (!t) return;
    _e.set(p.pitch, p.yaw, 0, 'YXZ');
    cam.quaternion.setFromEuler(_e);
    const baseFov = g.settings.fov || 70;
    if (p.seat === 0) {
      const pv = this.pivot(t, _w);
      if (p.ads > 0.5) {
        // Zielfernrohr des Richtschützen: an der Kanone, Vergrößerung ×3
        // Zielfernrohr links neben der Kanone (wie TZF bzw. M70), Rohr bleibt rechts unten sichtbar
        const dir = this.gunDir(t, _d), ty = t.yaw + t.turretYaw;
        cam.position.copy(pv).addScaledVector(dir, 0.9); cam.position.y += 0.18;
        cam.position.x += -Math.cos(ty) * 0.42; cam.position.z += Math.sin(ty) * 0.42;
        cam.fov = baseFov / 3;
      } else {
        // Verfolgerkamera hinter dem Turm
        cam.getWorldDirection(_d);
        const back = _v.copy(pv).addScaledVector(_d, -9.5); back.y += 3.0;
        const tw = g.world.raycast(pv, back);
        cam.position.copy(pv).lerp(back, Math.max(0.15, tw - 0.05));
        cam.position.y = Math.max(cam.position.y, g.world.groundAt(cam.position.x, cam.position.z) + 0.6);
        cam.fov = baseFov;
      }
    } else {
      // MG-Schütze: aus der Luke
      this.mgPos(t, cam.position); cam.position.y += 0.35;
      cam.fov = baseFov / (1 + 0.4 * p.ads);
    }
    cam.updateProjectionMatrix();
  }

  // Anzeige
  hudText() {
    const p = this.g.player, t = p.tank;
    if (!t) return null;
    const hp = Math.max(0, Math.round((t.hp / t.spec.hp) * 100));
    if (p.seat === 0) return { name: t.spec.name + ' · ' + T('Kanone', 'main gun'), ammo: (t.reload > 0 ? `<i>${T('lädt', 'loading')} ${t.reload.toFixed(1)} s</i>` : `<b>${T('BEREIT', 'READY')}</b>`) + ` · ${T('Panzer', 'hull')} ${hp} %` };
    return { name: t.spec.name + ' · ' + (t.team === 'us' ? 'Browning M2' : 'MG 34'), ammo: `<b>∞</b> · ${T('Panzer', 'hull')} ${hp} %` };
  }
}

const r2 = (v) => Math.round(v * 100) / 100;
