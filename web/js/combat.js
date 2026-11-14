// Kampf: Geschosse mit Ballistik, Treffer auf Soldaten/Spieler/Panzer, Explosionen, Handgranaten, Raketen, Niederhalten.
// auth=true: dieses Gerät rechnet den Schaden (eigene Schüsse; Host für KI). Sonst nur Darstellung.
import * as THREE from './lib/three.module.min.js';
import { WEAPONS } from './weapons.js';
import { clamp } from './util.js';

const G = 9.81;
const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3(), _n = new THREE.Vector3();

export class Combat {
  constructor(game) {
    this.g = game;
    this.bullets = [];
    this.nades = [];
    this.rockets = [];
    this.shells = [];
    this.tracerList = [];
    this.nadeGeo = new THREE.SphereGeometry(0.05, 6, 4);
    this.nadeMat = new THREE.MeshLambertMaterial({ color: 0x3c3f2c });
    this.rocketGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6); this.rocketGeo.rotateX(Math.PI / 2);
    this.rocketMat = new THREE.MeshLambertMaterial({ color: 0x3a3d30 });
  }

  // ------------------------------------------------------------ Gewehrkugel
  // owner: { team, uid (KI-ID) | pid (Spieler-ID), local } ; tracer: Leuchtspur
  fire(o, dir, w, owner, auth, tracer = false) {
    const W = typeof w === 'string' ? WEAPONS[w] : w;
    const v = W.vel;
    this.bullets.push({
      x: o.x, y: o.y, z: o.z, vx: dir.x * v, vy: dir.y * v, vz: dir.z * v, life: Math.min(3, (W.range * 2.2) / v + 0.3), dmg: W.dmg, range: W.range,
      owner, auth, tracer, dist: 0, cracked: false, wid: W.id,
    });
  }

  // Rakete (Bazooka/Panzerfaust): langsames Geschoss mit Rauchspur
  rocket(o, dir, w, owner, auth) {
    const W = typeof w === 'string' ? WEAPONS[w] : w;
    const m = new THREE.Mesh(this.rocketGeo, this.rocketMat);
    m.position.copy(o);
    this.g.scene.add(m);
    this.rockets.push({ p: o.clone(), v: dir.clone().multiplyScalar(W.vel), mesh: m, life: 4, owner, auth, dmg: W.dmg, lob: !!W.lob });
    this.g.audio.play('rocket', o, 0.9, 1, { far: 300 });
    this.g.effects.puff(o.x - dir.x, o.y, o.z - dir.z, { life: 2.5, s0: 0.5, s1: 3, a: 0.6, c: [0.75, 0.74, 0.72] });   // Rückstrahl
  }

  // Handgranate mit Zünder
  grenade(o, vel, fuse, owner, auth, kind = 'mk2') {
    const W = WEAPONS[kind] || WEAPONS.mk2;
    let m;
    if (kind === 'stiel') { m = new THREE.Group(); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 6), new THREE.MeshLambertMaterial({ color: 0x6b4226 })); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.075, 8), this.nadeMat); h.position.y = 0.17; m.add(s, h); }
    else m = new THREE.Mesh(this.nadeGeo, this.nadeMat);
    m.position.copy(o);
    this.g.scene.add(m);
    this.nades.push({ p: o.clone(), v: vel.clone(), mesh: m, fuse, owner, auth, dmg: W.dmg, radius: W.radius, spin: new THREE.Vector3(Math.random() * 10, Math.random() * 10, 0) });
  }

  // Artilleriegranate (unsichtbar) mit Pfeifen: schlägt nach delay bei p ein
  shell(p, size, delay, owner, auth, whistle = true) {
    this.shells.push({ p: p.clone(), size, t: delay, owner, auth, whistle, whistled: false });
  }

  // ------------------------------------------------------------ Treffertests
  // Ziele: KI-Soldaten (g.units.list), Spieler (lokal + Avatare), Panzer
  hitTest(a, b, owner) {
    const g = this.g;
    let best = 1, hit = null;
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const L2 = dx * dx + dy * dy + dz * dz || 1e-6;
    const test = (ent, kind) => {
      const p = ent.pos;
      // grob: Abstand der Segmentlinie zum Körperzentrum
      const cy = p.y + (ent.stance === 2 ? 0.3 : ent.stance === 1 ? 0.7 : 0.95);
      const t = clamp(((p.x - a.x) * dx + (cy - a.y) * dy + (p.z - a.z) * dz) / L2, 0, 1);
      if (t > best) return;
      const qx = a.x + dx * t, qy = a.y + dy * t, qz = a.z + dz * t;
      const hx = qx - p.x, hz = qz - p.z;
      const rr = ent.stance === 2 ? 1.0 : 0.32;
      if (hx * hx + hz * hz > rr * rr) return;
      const top = ent.stance === 2 ? 0.55 : ent.stance === 1 ? 1.3 : 1.82;
      const rel = qy - p.y;
      if (rel < 0 || rel > top) return;
      // Kopf?
      const head = ent.stance !== 2 && rel > top - 0.3;
      best = t; hit = { ent, kind, head, t, y: qy };
    };
    // KI-Geschosse treffen keine eigenen Kameraden (die KI achtet auf ihre Schusslinie)
    const aiShot = owner && (owner.uid || owner.tank);
    for (const u of g.units.list) if (u.alive && (!owner || u.uid !== owner.uid) && !(aiShot && u.team === owner.team)) test(u, 'unit');
    if (g.player.alive && !(owner && owner.local)) test(g.player, 'player');
    for (const [pid, av] of g.avatars) if (av.alive && av.visible && (!owner || owner.pid !== pid)) test(av, 'avatar');
    for (const tk of g.units.tanks) {
      if (!tk.alive) continue;
      _a.set(a.x, a.y, a.z);
      const t = tk.segHit(a, dx, dy, dz);
      if (t < best) { best = t; hit = { ent: tk, kind: 'tank', t, y: a.y + dy * t }; }
    }
    return hit;
  }

  applyHit(hit, dmg, owner, dir, pos) {
    const g = this.g;
    const head = hit.head;
    const d = dmg * (head ? 2.6 : 1);
    if (hit.kind === 'unit') g.units.damage(hit.ent, d, owner, dir, head);
    else if (hit.kind === 'player') g.damagePlayer(d * g.difficultyDmg(), dir, owner, head);
    else if (hit.kind === 'avatar') g.netHitAvatar(hit.ent, d, owner, dir, head);
    else if (hit.kind === 'tank') { /* Gewehrkugeln prallen ab */ g.audio.play('ricochet', pos, 0.4); g.effects.impact(pos.x, pos.y, pos.z, 'metal'); }
  }

  // ------------------------------------------------------------ Explosion mit Schaden
  explode(p, dmg, radius, owner, auth, size = 1) {
    const g = this.g;
    const wd = g.world.waterDepth(p.x, p.z);
    const water = wd > 0.4 && p.y < 0.5;
    g.effects.explosion(p.x, Math.max(p.y, water ? 0 : p.y), p.z, size, water);
    g.audio.play(size >= 4 ? 'boomBig' : size >= 2 ? 'boom' : 'boomSmall', p, 1, 0.9 + Math.random() * 0.2, { far: 900 * Math.sqrt(size), important: true });
    if (!water) g.decals && g.decals.crater(p.x, p.z, radius * 0.35);
    // Erschütterung beim Spieler
    const dc = g.camera.position.distanceTo(p);
    const k = clamp(1 - dc / (radius * 4 + 10 * size), 0, 1);
    if (k > 0) { g.shake(k * (0.6 + size * 0.2)); g.audio.concussion(k); g.player.suppress = Math.min(1, g.player.suppress + k); }
    if (!auth) return;
    // Schaden
    const hurt = (ent, kind) => {
      const dd = ent.pos.distanceTo(p);
      if (dd > radius) return;
      _a.copy(p); _a.y += 0.3;
      _b.copy(ent.pos); _b.y += 0.8;
      const blocked = g.world.raycast(_a, _b) < 0.98;
      const f = Math.pow(1 - dd / radius, 1.2) * (blocked ? 0.25 : 1) * (ent.stance === 2 ? 0.55 : 1);
      if (f <= 0.02) return;
      _d.subVectors(ent.pos, p).normalize();
      if (kind === 'unit') g.units.damage(ent, dmg * f, owner, _d, false, true);
      else if (kind === 'player') g.damagePlayer(dmg * f * g.difficultyDmg(), _d, owner, false, true);
      else if (kind === 'avatar') g.netHitAvatar(ent, dmg * f, owner, _d, false);
    };
    for (const u of g.units.list) if (u.alive) hurt(u, 'unit');
    if (g.player.alive) hurt(g.player, 'player');
    for (const av of g.avatars.values()) if (av.alive && av.visible) hurt(av, 'avatar');
    for (const tk of g.units.tanks) if (tk.alive) { const dd = tk.pos.distanceTo(p); if (dd < radius + 3) tk.damage(dmg * (size >= 2 ? 1 : 0.15) * clamp(1 - dd / (radius + 3), 0, 1), owner); }
    g.missions.explosionAt(p, dmg, radius, owner);
  }

  // ------------------------------------------------------------ Aktualisierung
  update(dt) {
    const g = this.g, W = g.world;
    const cam = g.camera.position;
    this.tracerList.length = 0;
    // Gewehrkugeln
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      const steps = 2;
      let dead = false;
      for (let s = 0; s < steps && !dead; s++) {
        const h = dt / steps;
        _a.set(b.x, b.y, b.z);
        b.vy -= G * h;
        // Luftwiderstand (grob)
        const drag = 1 - 0.12 * h;
        b.vx *= drag; b.vy *= drag; b.vz *= drag;
        _b.set(b.x + b.vx * h, b.y + b.vy * h, b.z + b.vz * h);
        // Überschallknall / Vorbeiflug am Spieler
        if (!b.cracked && b.owner && !b.owner.local && g.player.alive) {
          const dx = _b.x - _a.x, dy = _b.y - _a.y, dz = _b.z - _a.z, L2 = dx * dx + dy * dy + dz * dz || 1;
          const t = clamp(((cam.x - _a.x) * dx + (cam.y - _a.y) * dy + (cam.z - _a.z) * dz) / L2, 0, 1);
          const q = Math.hypot(_a.x + dx * t - cam.x, _a.y + dy * t - cam.y, _a.z + dz * t - cam.z);
          if (q < 4 && (b.owner.team !== g.player.team || g.mode === 'versus')) {
            b.cracked = true;
            _n.set(_a.x + dx * t, _a.y + dy * t, _a.z + dz * t);
            g.audio.play('crack', _n, 0.5 + (4 - q) * 0.15, 0.9 + Math.random() * 0.3, { noDelay: true, verb: false });
            g.player.suppress = Math.min(1, g.player.suppress + 0.22 * (4 - q) / 4);
            g.player.lastShotDir = Math.atan2(-b.vx, -b.vz);
          }
        }
        // Niederhalten der KI
        if (b.auth && s === 0) g.units.suppressNear(_b, b.owner);
        const tw = W.raycast(_a, _b, { soft: false });
        const hit = this.hitTest(_a, _b, b.owner);
        if (hit && hit.t <= tw) {
          _d.set(b.vx, b.vy, b.vz).normalize();
          _n.lerpVectors(_a, _b, hit.t);
          if (b.auth) this.applyHit(hit, b.dmg * this.falloff(b), b.owner, _d, _n);
          if (hit.kind !== 'tank') g.effects.impact(_n.x, _n.y, _n.z, 'blood', -_d.x, 0.3, -_d.z);
          else if (!b.auth) g.effects.impact(_n.x, _n.y, _n.z, 'metal');
          dead = true;
        } else if (tw < 1) {
          _n.lerpVectors(_a, _b, tw);
          const box = W.lastHit;
          const wd = W.waterDepth(_n.x, _n.z);
          const kind = wd > 0.2 && _n.y < 0.3 ? 'water' : !box ? (g.world.def.beach && _n.z < -100 ? 'sand' : 'dirt') : box.kind === 'house' || box.kind === 'wall' ? 'stone' : box.kind === 'bunker' ? 'stone' : box.kind === 'gun' ? 'metal' : box.kind === 'tree' ? 'wood' : 'dirt';
          g.effects.impact(_n.x, _n.y, _n.z, kind, -b.vx / 900, 0.6, -b.vz / 900);
          if ((kind === 'stone' || kind === 'metal') && Math.random() < 0.25) g.audio.play('ricochet', _n, 0.35, 0.8 + Math.random() * 0.4);
          if (g.decals) g.decals.hole(_n, box);
          if (b.auth && box && box.kind === 'wire') g.missions.wireShot && g.missions.wireShot(box);
          dead = true;
        } else {
          b.dist += Math.hypot(_b.x - _a.x, _b.y - _a.y, _b.z - _a.z);
          b.x = _b.x; b.y = _b.y; b.z = _b.z;
          // unter Wasser schnell abgebremst
          if (b.y < 0 && W.water && W.waterDepth(b.x, b.z) > 0) { g.effects.impact(b.x, 0, b.z, 'water'); dead = true; }
        }
      }
      b.life -= dt;
      if (dead || b.life <= 0) { this.bullets.splice(i, 1); continue; }
      if (b.tracer) { const sp = Math.hypot(b.vx, b.vy, b.vz); this.tracerList.push({ x: b.x, y: b.y, z: b.z, vx: b.vx / sp, vy: b.vy / sp, vz: b.vz / sp, len: Math.min(9, b.dist), green: b.owner && b.owner.team === 'de', w: 0.03 }); }
    }
    g.effects.tracers.update(this.tracerList);

    // Raketen
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      _a.copy(r.p);
      r.v.y -= G * dt * (r.lob ? 1 : 0.35);
      r.p.addScaledVector(r.v, dt);
      r.mesh.position.copy(r.p);
      r.mesh.lookAt(_b.copy(r.p).add(r.v));
      r.life -= dt;
      if (Math.random() < 0.9) g.effects.puff(r.p.x, r.p.y, r.p.z, { life: 1.6, s0: 0.25, s1: 1.4, a: 0.45, c: [0.8, 0.79, 0.76], rise: 0.2 });
      g.effects.spark(r.p.x, r.p.y, r.p.z, { life: 0.05, s0: 0.35, s1: 0.2 });
      const tw = W.raycast(_a, r.p, { soft: false });
      const hit = this.hitTest(_a, r.p, r.owner);
      if ((hit && hit.t <= tw) || tw < 1 || r.life <= 0) {
        const t = hit && hit.t <= tw ? hit.t : tw;
        _n.lerpVectors(_a, r.p, Math.min(1, t));
        if (hit && hit.kind === 'tank' && r.auth) hit.ent.damage(r.dmg * (0.8 + Math.random() * 0.5), r.owner, true);
        this.explode(_n, 120, 5, r.owner, r.auth, 2);
        g.scene.remove(r.mesh);
        this.rockets.splice(i, 1);
      }
    }

    // Handgranaten: einfache Physik mit Abprallen
    for (let i = this.nades.length - 1; i >= 0; i--) {
      const n = this.nades[i];
      n.v.y -= G * dt;
      _a.copy(n.p);
      n.p.addScaledVector(n.v, dt);
      const tw = W.raycast(_a, n.p, { soft: false });
      if (tw < 1) {
        n.p.lerpVectors(_a, n.p, Math.max(0, tw - 0.05));
        const box = W.lastHit;
        if (box) { // seitlich abprallen
          const dx = n.p.x - box.x, dz = n.p.z - box.z;
          const lx = dx * box.c - dz * box.s, lz = dx * box.s + dz * box.c;
          if (Math.abs(lx) / box.hw > Math.abs(lz) / box.hd) { const vx = n.v.x * box.c - n.v.z * box.s, vz = n.v.x * box.s + n.v.z * box.c; const nvx = -vx * 0.35; n.v.x = nvx * box.c + vz * box.s; n.v.z = -nvx * box.s + vz * box.c; }
          else { const vx = n.v.x * box.c - n.v.z * box.s, vz = n.v.x * box.s + n.v.z * box.c; const nvz = -vz * 0.35; n.v.x = vx * box.c + nvz * box.s; n.v.z = -vx * box.s + nvz * box.c; }
          if (n.p.y > box.y1 - 0.3) n.v.y = Math.abs(n.v.y) * 0.3;
        } else { n.v.y = Math.abs(n.v.y) * 0.3; n.v.x *= 0.5; n.v.z *= 0.5; }
        if (n.v.length() > 2) g.audio.play('thud', n.p, 0.25);
      }
      const gy = W.groundAt(n.p.x, n.p.z, n.p.y);
      if (n.p.y < gy + 0.06) { n.p.y = gy + 0.06; n.v.y = Math.abs(n.v.y) * 0.25; n.v.x *= 0.6; n.v.z *= 0.6; }
      n.mesh.position.copy(n.p);
      n.mesh.rotation.x += n.spin.x * dt * (n.v.length() > 0.5 ? 1 : 0); n.mesh.rotation.y += n.spin.y * dt * (n.v.length() > 0.5 ? 1 : 0);
      n.fuse -= dt;
      if (n.fuse <= 0) {
        this.explode(n.p, n.dmg, n.radius, n.owner, n.auth, 1);
        g.scene.remove(n.mesh);
        this.nades.splice(i, 1);
        g.units.nadeGone(n);
      }
    }

    // Artillerie
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.t -= dt;
      if (s.whistle && !s.whistled && s.t < 1.5) {
        s.whistled = true;
        const d = cam.distanceTo(s.p);
        if (d < 400) g.audio.play(s.size >= 3 ? 'whistle' : 'whistle', s.p, Math.min(1, 60 / (d + 20)), s.size >= 4 ? 0.8 : 1.15, { noDelay: true, verb: false });
      }
      if (s.t <= 0) {
        s.p.y = W.groundAt(s.p.x, s.p.z);
        if (W.water && s.p.y < 0) s.p.y = 0;
        this.explode(s.p, s.size >= 4 ? 300 : s.size >= 2 ? 180 : 140, 4 + s.size * 2.5, s.owner, s.auth, s.size);
        this.shells.splice(i, 1);
      }
    }
  }

  // Schaden nimmt mit der Entfernung ab (Pistolen/MPs stärker)
  falloff(b) { return clamp(1.15 - b.dist / (b.range * 2.2), 0.45, 1); }

  clear() {
    for (const r of this.rockets) this.g.scene.remove(r.mesh);
    for (const n of this.nades) this.g.scene.remove(n.mesh);
    this.bullets.length = 0; this.rockets.length = 0; this.nades.length = 0; this.shells.length = 0;
  }
}
