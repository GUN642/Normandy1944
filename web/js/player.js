// Spieler: Bewegung (stehen/hocken/liegen, sprinten, springen, schwimmen, klettern, Fallschirm), Waffen, Ansichtsmodell.
import * as THREE from './lib/three.module.min.js';
import { WEAPONS, CLASSES, loadout, weaponModel } from './weapons.js';
import { clamp, wrapAngle, rand } from './util.js';
import { T } from './i18n.js';
import { buildChute } from './models.js';

const _v = new THREE.Vector3(), _d = new THREE.Vector3(), _q = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ');

// ------------------------------------------------------------ Ansichtsmodell (Waffe + Hände in eigener Szene)
class ViewModel {
  constructor(game) {
    this.g = game;
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(50, 1, 0.01, 10);
    this.scene.add(this.cam);
    this.hemi = new THREE.HemisphereLight(0xdfe6f0, 0x4a4436, 1.2);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 1.5);
    this.sun.position.set(0.5, 1, 0.3);
    this.scene.add(this.hemi, this.sun);
    this.holder = new THREE.Group();
    this.cam.add(this.holder);
    this.model = null;
    this.t = 0; this.kick = 0; this.swap = 0;
    this.sleeve = new THREE.MeshLambertMaterial({ color: 0x7d7652 });
    this.skin = new THREE.MeshLambertMaterial({ color: 0xc49a7c });
  }
  set(id, team) {
    if (this.model) this.holder.remove(this.model);
    const m = weaponModel(id);
    this.model = m;
    this.arms = [];
    this.W = WEAPONS[id];
    this.sleeve.color.setHex(team === 'us' ? 0x7d7652 : 0x5f6556);
    // Hände/Unterarme
    const arm = (x, y, z, rx, rz, len = 0.32) => {
      const g = new THREE.Group();
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, len), this.sleeve); s.position.z = len / 2;
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.09), this.skin);
      g.add(s, h); g.position.set(x, y, z); g.rotation.set(rx, 0, rz);
      m.add(g); this.arms.push(g);
    };
    const W = this.W;
    if (W.grenade) arm(0.02, -0.03, 0.06, 0.4, 0);
    else if (W.pistol) { arm(0, -0.05, 0.02, 0.5, 0); arm(-0.03, -0.06, 0.03, 0.5, 0.4); }
    else if (W.rocket) { arm(0.0, -0.06, 0.0, 0.4, 0); arm(0.0, -0.06, -0.25, 0.6, 0.3); }
    else { arm(0.0, -0.05, 0.02, 0.45, 0); arm(-0.01, -0.03, -0.3, 0.55, 0.45, 0.42); }
    m.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.frustumCulled = false; } });
    this.holder.add(m);
    this.swap = 1;
  }
  update(dt, p, aspect) {
    this.cam.aspect = aspect; this.cam.updateProjectionMatrix();
    if (!this.model) return;
    const W = this.W;
    this.t += dt * (p.speed * 1.9 + 0.6);
    this.kick = Math.max(0, this.kick - dt * 9);
    this.swap = Math.max(0, this.swap - dt * 3);
    const ads = p.ads;
    const bobA = (1 - ads * 0.85) * Math.min(1, p.speed / 4);
    const ud = this.model.userData;
    // Hüftanschlag vs. Zielen über Kimme und Korn
    const hip = W.grenade ? [0.2, -0.24, -0.38] : W.pistol ? [0.17, -0.19, -0.4] : W.rocket ? [0.19, -0.14, -0.3] : [0.19, -0.205, -0.3];
    // Anschlag: Visierlinie (Kimme–Korn) genau auf der Blickachse, Kimme kurz vor dem Auge
    let aim;
    const sg = ud.sight;
    if (sg) {
      const eye = W.pistol ? 0.42 : sg.type === 'aperture' ? 0.09 : 0.13;
      aim = [0, -sg.h, -eye - sg.rear];
    } else aim = [0, -ud.sightY, -Math.max((ud.sightZ || 0.05) + 0.17, (W.rocket ? 0.8 : 0.6) + 0.04)];
    this.clipZ = sg && !W.pistol && ads > 0.5 ? -(W.pistol ? 0.3 : sg.type === 'aperture' ? 0.07 : 0.1) : 0;
    const x = hip[0] + (aim[0] - hip[0]) * ads + Math.sin(this.t) * 0.012 * bobA;
    const y = hip[1] + (aim[1] - hip[1]) * ads + Math.abs(Math.cos(this.t)) * 0.01 * bobA - this.swap * 0.25 - (p.reloading ? 0.08 : 0) + p.sway.y * 0.02;
    const z = hip[2] + (aim[2] - hip[2]) * ads + this.kick * 0.06;
    this.model.position.set(x, y, z);
    this.model.rotation.set(this.kick * 0.12 + (p.reloading ? 0.6 : 0) + (p.sprinting ? -0.5 : 0), (p.sprinting ? 0.7 : 0) + p.sway.x * 0.02, p.reloading ? 0.5 : p.sprinting ? 0.3 : 0);
    // Zielfernrohr: Modell bei vollem Anschlag ausblenden (Overlay)
    this.model.visible = !(ud.scope && ads > 0.92);
    // beim Zielen über Kimme und Korn die Arme ausblenden (sie lägen unter der Visierlinie im Weg)
    const arms = !(ud.sight && ads > 0.6);
    for (const a of this.arms || []) a.visible = arms;
  }
}

// ------------------------------------------------------------ Spieler
export class Player {
  constructor(game) {
    this.g = game;
    this.isPlayer = true;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.team = 'us';
    this.alive = false;
    this.vm = new ViewModel(game);
    this.sway = new THREE.Vector2();
    this.reset('rifle', 'us');
  }

  reset(cls, team) {
    this.cls = cls; this.team = team;
    const lo = loadout(cls, team);
    this.weapons = lo.slice();
    this.ammo = {};
    for (const id of this.weapons) { const W = WEAPONS[id]; this.ammo[id] = { mag: W.grenade ? 0 : W.mag, res: W.grenade ? (W.smoke ? 1 : CLASSES[cls].nade || 2) : W.reserve }; }
    this.cur = 0;
    this.hp = 100; this.alive = true;
    this.stance = 0; this.ads = 0; this.speed = 0;
    this.stamina = 1; this.suppress = 0; this.bandages = 3; this.healing = 0;
    this.nextFire = 0; this.reloading = 0; this.boltT = 0; this.burstHeld = false;
    this.recoil = 0; this.recoilYaw = 0;
    this.onGround = true; this.inBoat = null; this.chute = null; this.climbing = false;
    this.lastShot = -10; this.charge = null; this.lastHurt = -10;
    this.vel.set(0, 0, 0);
    this.vm.set(this.weapons[0], team);
    this.radio = !!CLASSES[cls].radio;
  }

  get W() { return WEAPONS[this.weapons[this.cur]]; }
  get wid() { return this.weapons[this.cur]; }
  chest(out) { return out.set(this.pos.x, this.pos.y + (this.stance === 2 ? 0.3 : this.stance === 1 ? 0.8 : 1.25), this.pos.z); }
  eyeH() { return this.stance === 2 ? 0.42 : this.stance === 1 ? 1.1 : 1.62; }

  spawnAt(p, yaw = 0) {
    this.pos.copy(p);
    this.pos.y = this.g.world.groundAt(p.x, p.z, p.y + 2);
    this.yaw = yaw; this.pitch = 0;
    this.vel.set(0, 0, 0);
  }

  startJump(p, yaw) {
    this.pos.copy(p);
    this.yaw = yaw;
    this.chute = buildChute();
    this.g.scene.add(this.chute);
    this.vel.set(0, -5, 0);
  }

  select(i) {
    if (i < 0 || i >= this.weapons.length || i === this.cur) return;
    const id = this.weapons[i];
    if (WEAPONS[id].grenade && this.ammo[id].res <= 0) return;
    this.cur = i; this.reloading = 0; this.boltT = 0;
    this.vm.set(id, this.team);
    this.g.audio.play('click', null, 0.3);
    this.nextFire = this.g.time + 0.4;
  }

  // ------------------------------------------------------------ Bewegung
  update(dt, inp) {
    this.updateInner(dt, inp);
    const ok = Number.isFinite(this.pos.x + this.pos.y + this.pos.z + this.yaw + this.pitch + this.vel.x + this.vel.y + this.vel.z);
    if (ok) { (this.safe || (this.safe = { pos: new THREE.Vector3() })).pos.copy(this.pos); this.safe.yaw = this.yaw; this.safe.pitch = this.pitch; }
    else {
      console.warn('Ungültige Spielerwerte – zurückgesetzt');
      if (this.safe) { this.pos.copy(this.safe.pos); this.yaw = this.safe.yaw; this.pitch = this.safe.pitch; } else { this.yaw = 0; this.pitch = 0; }
      this.vel.set(0, 0, 0); this.recoil = 0; this.recoilYaw = 0;
      if (!Number.isFinite(this.pos.x + this.pos.y + this.pos.z)) this.pos.set(0, this.g.world.h(0, 0), 0);
    }
  }

  updateInner(dt, inp) {
    const g = this.g, W = g.world;
    if (!this.alive) return;
    this.suppress = Math.max(0, this.suppress - dt * 0.35);
    // Blickrichtung
    const sens = (g.settings.sensitivity || 1) * (1 - this.ads * (1 - 1 / (this.W.zoom || 1)) * 0.85);
    this.yaw -= inp.look.x * sens;
    this.pitch = clamp(this.pitch - inp.look.y * sens * (g.settings.invertY ? -1 : 1), -1.45, 1.45);
    // Rückstoß abbauen
    const rec = this.recoil * Math.min(1, dt * 8);
    this.recoil -= rec; this.pitch = clamp(this.pitch + rec, -1.45, 1.45);
    const ry = this.recoilYaw * Math.min(1, dt * 8); this.recoilYaw -= ry; this.yaw += ry;
    // Atem-/Zielschwanken (stärker im Stehen, unter Beschuss, nach dem Sprinten)
    const swayAmp = (this.stance === 2 ? 0.25 : this.stance === 1 ? 0.55 : 1) * (1 + this.suppress * 2 + (1 - this.stamina) * 1.5) * (this.W.scope ? 1.4 : 1);
    this.swayT = (this.swayT || 0) + dt;
    this.sway.set(Math.sin(this.swayT * 0.9) * swayAmp, Math.sin(this.swayT * 1.7) * swayAmp * 0.6);

    if (this.inBoat) { this.speed = 0; return; }
    // Fallschirm
    if (this.chute) {
      const f = _v.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), r = _d.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
      this.pos.addScaledVector(f, inp.move.y * 4 * dt).addScaledVector(r, inp.move.x * 4 * dt);
      this.pos.y -= 5.2 * dt;
      this.chute.position.copy(this.pos);
      this.chute.rotation.y = this.yaw;
      const gy = W.groundAt(this.pos.x, this.pos.z);
      if (this.pos.y <= gy) {
        this.pos.y = gy;
        g.scene.remove(this.chute); this.chute = null;
        g.audio.play('thud', null, 0.8);
        g.shake(0.4);
        if (W.waterDepth(this.pos.x, this.pos.z) > 1.3) g.hud.warn(T('Im Wasser gelandet – raus hier!', 'Landed in water – get out!'));
      }
      this.speed = 0;
      return;
    }
    // Haltung
    if (inp.pressed('crouch')) this.stance = this.stance === 1 ? 0 : 1;
    if (inp.pressed('prone')) this.stance = this.stance === 2 ? 0 : 2;
    const depth = W.waterDepth(this.pos.x, this.pos.z);
    const swim = depth > 1.45;
    if (swim || (depth > 0.8 && this.stance === 2)) this.stance = 0;
    // Sprinten
    const wantSprint = inp.held('sprint') && inp.move.y > 0.3 && this.stance !== 2 && !swim;
    if (wantSprint && this.stance === 1) this.stance = 0;
    this.sprinting = wantSprint && this.stamina > 0.05 && this.ads < 0.3;
    this.stamina = clamp(this.stamina + dt * (this.sprinting ? -0.12 : 0.1), 0, 1);
    let sp = this.stance === 2 ? 0.9 : this.stance === 1 ? 1.7 : this.sprinting ? 5.6 : 3.3;
    if (this.ads > 0.5) sp *= 0.55;
    if (depth > 0.5) sp *= swim ? 0.45 : clamp(1.1 - depth * 0.5, 0.45, 1);
    if (this.W.mass > 8 && !this.ads) sp *= 0.88;
    if (this.healing > 0) sp *= 0.4;
    const f = _v.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)), r = _d.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const mx = inp.move.x, my = inp.move.y;
    const ml = Math.min(1, Math.hypot(mx, my));
    const wx = (f.x * my + r.x * mx) / (ml > 1 ? ml : 1) * sp, wz = (f.z * my + r.z * mx) / (ml > 1 ? ml : 1) * sp;
    const acc = this.onGround ? 12 : 2;
    this.vel.x += (wx - this.vel.x) * Math.min(1, acc * dt);
    this.vel.z += (wz - this.vel.z) * Math.min(1, acc * dt);
    // Klettern an Seilen (Pointe du Hoc)
    const rope = this.nearRope();
    this.climbing = false;
    if (rope && (inp.held('use') || my > 0.3) && this.pos.y < rope.yt - 0.3) {
      this.climbing = true;
      this.pos.x += (rope.x - this.pos.x) * Math.min(1, dt * 4);
      this.pos.z += (rope.z - 0.4 - this.pos.z) * Math.min(1, dt * 4);
      this.pos.y = Math.max(this.pos.y, W.h(this.pos.x, this.pos.z)) + 1.9 * dt * Math.max(0.4, my);
      this.vel.set(0, 0, 0);
      this.stance = 0;
      if (this.pos.y >= rope.yt - 0.3) { this.pos.z = rope.topZ; this.pos.y = W.groundAt(this.pos.x, this.pos.z); this.climbing = false; }
      this.speed = 1.5;
      this.onGround = true;
      return;
    }
    // Springen und Schwerkraft
    if (this.onGround && inp.pressed('jump') && this.stance === 0 && !swim) { this.vel.y = 4.2; this.onGround = false; }
    if (inp.pressed('jump') && this.stance !== 0) this.stance = 0;
    this.vel.y -= 9.81 * dt;
    const ox = this.pos.x, oz = this.pos.z;
    this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
    // zu steiler Hang: nicht hinauf
    const h1 = W.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.5), h0 = W.groundAt(ox, oz, this.pos.y + 0.5);
    const dist = Math.hypot(this.pos.x - ox, this.pos.z - oz);
    if (dist > 1e-4 && (h1 - h0) / dist > 1.6 && h1 > this.pos.y + 0.4) { this.pos.x = ox; this.pos.z = oz; }
    const head = this.pos.y + this.eyeH() + 0.15;
    W.collide(this.pos, 0.33, this.pos.y, head);
    this.collideTanks();
    for (const u of g.units.list) {
      if (!u.alive || u.inBoat) continue;
      const dx = this.pos.x - u.pos.x, dz = this.pos.z - u.pos.z, d = Math.hypot(dx, dz);
      if (d < 0.7 && d > 1e-3 && Math.abs(u.pos.y - this.pos.y) < 1.5) { this.pos.x = u.pos.x + dx / d * 0.7; this.pos.z = u.pos.z + dz / d * 0.7; }
    }
    this.pos.y += this.vel.y * dt;
    const gy = W.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.6);
    const floor = swim ? Math.max(gy, -1.25) : gy;
    if (this.pos.y <= floor) {
      if (!this.onGround && this.vel.y < -9) this.g.damagePlayer((-this.vel.y - 9) * 12, null, null, false, false, T('Sturz', 'Fall'));
      this.pos.y = floor; this.vel.y = 0; this.onGround = true;
    } else if (this.pos.y > floor + 0.25) this.onGround = false;
    else if (this.vel.y <= 0) { this.pos.y = floor; this.vel.y = 0; this.onGround = true; }
    this.speed = Math.hypot(this.pos.x - ox, this.pos.z - oz) / Math.max(dt, 1e-4);
    // Schritte
    this.stepT = (this.stepT || 0) + dt * this.speed;
    if (this.onGround && this.stepT > (this.sprinting ? 1.8 : 1.4)) { this.stepT = 0; g.audio.play('step', null, depth > 0.2 ? 0.35 : 0.18, 0.8 + rand() * 0.4, { verb: false }); if (depth > 0.2) g.effects.impact(this.pos.x, 0.05, this.pos.z, 'water'); }
    // Heilen (Verbandpäckchen)
    if (this.healing > 0) {
      this.healing -= dt;
      this.hp = Math.min(100, this.hp + dt * 12);
    }
    // Ohne Verband: langsame Regeneration bis 40
    if (g.time - this.lastHurt > 10 && this.hp < 40) this.hp = Math.min(40, this.hp + dt * 1.5);
  }

  nearRope() {
    for (const r of this.g.world.ropes) if (Math.abs(this.pos.x - r.x) < 1.6 && this.pos.z > r.z - 2.5 && this.pos.z < r.topZ + 0.5) return r;
    return null;
  }

  collideTanks() {
    for (const t of this.g.units.tanks) {
      const S = t.spec, c = Math.cos(t.yaw), s = Math.sin(t.yaw);
      const dx = this.pos.x - t.pos.x, dz = this.pos.z - t.pos.z;
      const lx = dx * c - dz * s, lz = dx * s + dz * c;
      const hw = S.wid / 2 + 0.35, hd = S.len / 2 + 0.35;
      if (Math.abs(lx) < hw && Math.abs(lz) < hd) {
        if (hw - Math.abs(lx) < hd - Math.abs(lz)) { const nl = Math.sign(lx) * hw; this.pos.x = t.pos.x + nl * c + lz * s; this.pos.z = t.pos.z - nl * s + lz * c; }
        else { const nl = Math.sign(lz) * hd; this.pos.x = t.pos.x + lx * c + nl * s; this.pos.z = t.pos.z - lx * s + nl * c; }
      }
    }
  }

  // ------------------------------------------------------------ Waffen
  weaponUpdate(dt, inp) {
    const g = this.g;
    if (!this.alive || this.chute || this.climbing) { this.ads = Math.max(0, this.ads - dt * 6); return; }
    const W = this.W, A = this.ammo[this.wid];
    const swim = g.world.waterDepth(this.pos.x, this.pos.z) > 1.45;
    // Waffenwahl
    for (let i = 0; i < 5; i++) if (inp.pressed('w' + (i + 1))) this.select(i);
    if (inp.pressed('wnext')) this.select((this.cur + 1) % this.weapons.length);
    if (inp.pressed('grenade')) { const gi = this.weapons.findIndex((w) => WEAPONS[w].grenade && !WEAPONS[w].smoke); if (gi >= 0 && this.ammo[this.weapons[gi]].res > 0) { this.prevW = this.cur; this.select(gi); this.quickNade = true; } }
    // Zielen
    const wantAds = inp.held('aim') && !this.sprinting && !W.grenade && this.reloading <= 0 && !swim;
    this.ads = clamp(this.ads + (wantAds ? dt * 6 : -dt * 7), 0, 1);
    // Nachladen
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        const need = W.mag - A.mag;
        const take = W.enbloc ? Math.min(W.mag, A.res) : Math.min(need, A.res);
        if (W.enbloc) A.mag = take; else A.mag += take;
        A.res -= take;
        g.audio.play('bolt', null, 0.4, 1.2);
      }
      return;
    }
    if (inp.pressed('reload') && !W.grenade && A.mag < W.mag && A.res > 0) this.startReload();
    if (this.boltT > 0) { this.boltT -= dt; }
    // Verbinden
    if (inp.pressed('heal') && this.bandages > 0 && this.hp < 100 && this.healing <= 0) { this.bandages--; this.healing = 3; g.hud.toast(T('Verband angelegt', 'Bandage applied')); }
    // Feuern
    const trig = inp.held('fire') || (this.quickNade && inp.held('grenade'));
    if (W.grenade) {
      if ((inp.released('fire') || (this.quickNade && inp.released('grenade'))) && g.time >= this.nextFire && A.res > 0) this.throwNade();
      return;
    }
    if (swim) return;
    if (!trig) { this.burstHeld = false; return; }
    if (g.time < this.nextFire || this.boltT > 0) return;
    if (!W.auto && this.burstHeld) return;
    if (A.mag <= 0) {
      if (!this.burstHeld) g.audio.play('click', null, 0.5);
      this.burstHeld = true;
      if (A.res > 0) this.startReload();
      return;
    }
    this.shoot();
    this.burstHeld = true;
  }

  startReload() {
    const W = this.W;
    if (W.enbloc && this.ammo[this.wid].mag > 0) this.g.hud.toast(T('Teilgeladenen Ladestreifen ausgeworfen', 'Ejected partial en-bloc clip'));
    if (W.enbloc) this.ammo[this.wid].mag = 0;
    // Ladestreifen (Kar98k): je fehlende Patrone etwas Zeit, max. volle Zeit
    const A = this.ammo[this.wid];
    this.reloading = W.stripper ? Math.min(W.reload, 0.8 + (W.mag - A.mag) * 0.45) : W.reload;
    this.g.audio.play('mag', null, 0.45);
    this.ads = 0;
  }

  shoot() {
    const g = this.g, W = this.W, A = this.ammo[this.wid];
    A.mag--;
    g.stats.shots++;
    this.nextFire = g.time + 60 / W.rpm;
    this.lastShot = g.time;
    const cam = g.camera;
    // Streuung: Hüfte/Kimme, Bewegung, Haltung, Schwanken
    const moveK = Math.min(1, this.speed / 3.5);
    const stK = this.stance === 2 ? 0.55 : this.stance === 1 ? 0.75 : 1;
    let spread = (W.spread[0] * (1 - this.ads) + W.spread[1] * this.ads) * (1 + moveK * 1.5) * stK * (1 + this.suppress * 0.8) / 1000;
    if (W.bipod && this.stance === 2) spread *= 0.5;
    cam.getWorldDirection(_d);
    _d.x += (rand() - 0.5) * spread * 2; _d.y += (rand() - 0.5) * spread * 2; _d.z += (rand() - 0.5) * spread * 2;
    _d.normalize();
    const o = _v.copy(cam.position).addScaledVector(_d, 0.3);
    const owner = { team: this.team, local: true, pid: g.myId };
    if (W.rocket) {
      g.combat.rocket(o.clone(), _d.clone(), W, owner, true);
      g.netFire(o, _d, W.id, false);
    } else {
      const tracer = (W.id === 'mg42' || W.id === 'bar') && A.mag % 3 === 0;
      g.combat.fire(o, _d, W, owner, true, tracer);
      g.netFire(o, _d, W.id, tracer);
    }
    // Mündungsfeuer ungefähr an der Mündung
    const mz = _v.copy(cam.position).add(new THREE.Vector3(0.15 * (1 - this.ads), -0.12 * (1 - this.ads) - 0.03, -0.8).applyQuaternion(cam.quaternion));
    g.effects.muzzle(mz, _d, W.id === 'mg42');
    g.audio.play(W.sound, null, 1, 0.97 + rand() * 0.06, { verb: true, important: true });
    // Rückstoß
    const kick = W.recoil * (this.stance === 2 ? 0.55 : this.stance === 1 ? 0.8 : 1) * (W.bipod && this.stance === 2 ? 0.5 : 1);
    this.recoil += kick * (0.8 + rand() * 0.4);
    this.recoilYaw += (rand() - 0.5) * kick * 0.6;
    this.vm.kick = 1;
    g.shake(W.rocket ? 0.35 : kick * 2.5);
    // Kammerstängel / Garand-„Ping“
    if (W.bolt && A.mag > 0) { this.boltT = 0.9; setTimeout(() => g.audio.play('bolt', null, 0.5), 250); }
    if (W.enbloc && A.mag === 0) g.audio.play('ping', null, 0.55, 1, { verb: false });
    if (W.rocket && A.res > 0) this.startReload();
    if (W.rocket && A.res <= 0 && A.mag <= 0) this.select(1);
  }

  throwNade() {
    const g = this.g, A = this.ammo[this.wid];
    A.res--;
    this.nextFire = g.time + 1;
    const cam = g.camera;
    cam.getWorldDirection(_d);
    const v = _d.clone().multiplyScalar(this.W.vel);
    v.y += 3.5;
    v.add(this.vel);
    const o = cam.position.clone().addScaledVector(_d, 0.4);
    o.y -= 0.1;
    g.combat.grenade(o, v, this.W.fuse, { team: this.team, local: true, pid: g.myId }, true, this.wid);
    g.netNade(o, v, this.wid);
    g.audio.play('throw', null, 0.5);
    if (A.res <= 0 || this.quickNade) { this.quickNade = false; this.select(this.prevW ?? 0); }
  }

  updateView(dt) {
    const g = this.g, cam = g.camera;
    let ey = this.eyeH();
    this.eyeS = this.eyeS === undefined ? ey : this.eyeS + (ey - this.eyeS) * Math.min(1, dt * 10);
    const bob = this.onGround && !this.inBoat ? Math.sin((this.bobT = (this.bobT || 0) + dt * this.speed * 2.2)) * 0.035 * Math.min(1, this.speed / 4) * (1 - this.ads * 0.8) : 0;
    cam.position.set(this.pos.x, this.pos.y + this.eyeS + bob, this.pos.z);
    if (this.inBoat) cam.position.y += Math.sin(g.time * 1.3) * 0.15;
    const swayK = this.ads > 0.5 ? 0.004 * (this.W.scope ? 1.6 : 1) : 0.0015;
    _e.set(this.pitch + this.sway.y * swayK, this.yaw + this.sway.x * swayK, Math.sin(g.time * 1.1) * (this.inBoat ? 0.04 : 0), 'YXZ');
    cam.quaternion.setFromEuler(_e);
    const baseFov = g.settings.fov || 70;
    const z = this.W.zoom || 1.3;
    cam.fov = baseFov / (1 + (z - 1) * this.ads);
    cam.updateProjectionMatrix();
    this.vm.cam.quaternion.identity();
    this.vm.update(dt, this, cam.aspect);
  }
}
