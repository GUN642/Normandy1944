// KI-Soldaten, Trupps und Panzer.
// Der Host (bzw. Einzelspieler) rechnet die KI; Mitspieler erhalten Schnappschüsse und zeigen nur Puppen an.
import * as THREE from './lib/three.module.min.js';
import { SoldierRig, buildTank, TANKS, buildChute, MAT } from './models.js';
import { WEAPONS, CLASSES } from './weapons.js';
import { clamp, wrapAngle, rand, makeRng } from './util.js';
import { T } from './i18n.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3(), _d = new THREE.Vector3();

const NAMES = {
  us: ['Miller', 'Jackson', 'Kowalski', 'Brennan', 'Russo', 'Taylor', 'Hughes', 'Ortiz', 'Walsh', 'Carter', 'Nolan', 'Fischer', 'Reed', 'Doyle', 'Parker', 'Lopez', 'Grant', 'Kelly', 'Murphy', 'Bauer', 'Wright', 'Hayes', 'Price', 'Sullivan'],
  de: ['Becker', 'Hofmann', 'Wagner', 'Krüger', 'Schulz', 'Lange', 'Vogel', 'Brandt', 'Keller', 'Huber', 'Seidel', 'Franke', 'Lorenz', 'Peters', 'Winter', 'Roth', 'Kraus', 'Engel', 'Böhm', 'Graf', 'Kuhn', 'Pohl', 'Arnold', 'Simon'],
};
const UNI = { utah: { us: 'us_inf', de: 'de_heer' }, cobra: { us: 'us_inf', de: 'de_heer' }, chambois: { us: 'us_inf', de: 'de_fj' }, drop: { us: 'us_para', de: 'de_heer' }, stmere: { us: 'us_para', de: 'de_heer' }, omaha: { us: 'us_inf', de: 'de_heer' }, pointe: { us: 'us_ranger', de: 'de_heer' }, brecourt: { us: 'us_para', de: 'de_heer' }, lafiere: { us: 'us_para', de: 'de_heer' }, carentan: { us: 'us_para', de: 'de_fj' }, stlo: { us: 'us_inf', de: 'de_fj' } };
export const uniformFor = (opId, team) => (UNI[opId] || UNI.omaha)[team];

// Waffe je Rolle
function roleWeapon(role, team) {
  const c = CLASSES[role] || CLASSES.rifle;
  return c[team][0];
}

let UID = 1;

export class Unit {
  constructor(sys, team, role, pos, opts = {}) {
    this.sys = sys;
    this.uid = opts.uid || UID++;
    this.team = team;
    this.role = role;
    this.wid = opts.wid || roleWeapon(role, team);
    this.W = WEAPONS[this.wid];
    this.mag = magCap(this.W);
    this.nades = role === 'at' ? 0 : 1 + (rand() < 0.5 ? 1 : 0);
    this.pos = pos.clone();
    this.yaw = opts.yaw ?? 0;
    this.pitch = 0;
    this.hp = 100;
    this.alive = true;
    this.stance = 0;
    this.speed = 0;
    this.name = opts.name || (team === 'us' ? 'Pvt. ' : 'Gren. ') + NAMES[team][(this.uid * 7) % NAMES[team].length];
    this.rig = new SoldierRig(opts.uniform || 'us_inf', this.wid, { shadow: sys.g.q.shadows > 1 });
    this.rig.root.position.copy(pos);
    sys.g.scene.add(this.rig.root);
    this.think = rand() * 0.5;
    this.nextFire = 0; this.burst = 0; this.reloadT = 0;
    this.suppress = 0;
    this.target = null; this.targetSeen = 0;
    this.path = null; this.pathI = 0; this.goal = null;
    this.deadT = 0;
    this.firing = 0;
    this.squad = null;
    this.static = false;
    this.aimT = 0;
    this.stuck = 0;
    this.nadeT = 8 + rand() * 20;
    this.alert = 0;
  }

  get eye() { return _a.set(this.pos.x, this.pos.y + (this.stance === 2 ? 0.45 : this.stance === 1 ? 1.15 : 1.62), this.pos.z); }
  chest(out) { return out.set(this.pos.x, this.pos.y + (this.stance === 2 ? 0.3 : this.stance === 1 ? 0.8 : 1.25), this.pos.z); }
  fwd(out) { return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }

  remove() { this.rig.dispose(); if (this.chute) this.sys.g.scene.remove(this.chute); if (this.marker) this.sys.g.scene.remove(this.marker); if (this.pool) this.sys.g.scene.remove(this.pool); }
}

// ------------------------------------------------------------------ Panzer
export class Tank {
  constructor(sys, type, team, pos, yaw, id) {
    this.sys = sys;
    this.type = type;
    this.spec = TANKS[type];
    this.team = team;
    this.id = id || 'tank' + UID++;
    const m = buildTank(type);
    this.m = m;
    this.pos = pos.clone();
    this.yaw = yaw;
    this.turretYaw = 0;
    this.hp = this.spec.hp;
    this.alive = true;
    this.path = null; this.pathI = 0;
    this.nextFire = 4 + rand() * 4; this.mgT = 0; this.mgBurst = 0;
    this.target = null; this.think = 0;
    this.stance = 0;
    m.root.position.copy(pos);
    sys.g.scene.add(m.root);
  }
  segHit(a, dx, dy, dz) {
    const S = this.spec, c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    const ox = a.x - this.pos.x, oz = a.z - this.pos.z;
    const lx = ox * c - oz * s, lz = ox * s + oz * c, ldx = dx * c - dz * s, ldz = dx * s + dz * c;
    let t0 = 0, t1 = 1;
    const slab = (o, d, mn, mx) => { if (Math.abs(d) < 1e-9) return o >= mn && o <= mx; let ta = (mn - o) / d, tb = (mx - o) / d; if (ta > tb) [ta, tb] = [tb, ta]; t0 = Math.max(t0, ta); t1 = Math.min(t1, tb); return t0 <= t1; };
    if (!slab(lx, ldx, -S.wid / 2, S.wid / 2) || !slab(lz, ldz, -S.len / 2, S.len / 2) || !slab(a.y - this.pos.y, dy, 0, S.hgt + 0.9)) return 2;
    return t0;
  }
  damage(d, owner, direct = false) {
    if (!this.alive) return;
    this.hp -= d;
    if (direct) this.sys.g.audio.play('boomSmall', this.pos, 0.8);
    if (this.hp <= 0) this.sys.destroyTank(this, owner);
  }
}

// ------------------------------------------------------------------ Verwaltung
export class Units {
  constructor(game) {
    this.g = game;
    this.list = [];
    this.tanks = [];
    this.squads = [];
    this.byId = new Map();
    this.pathQueue = [];
    this.dead = [];
    this.rng = makeRng(42);
  }

  clear() {
    for (const u of this.list) u.remove();
    for (const t of this.tanks) this.g.scene.remove(t.m.root);
    this.list = []; this.tanks = []; this.squads = []; this.byId.clear(); this.pathQueue = [];
  }

  // ------------------------------------------------------------ Erzeugen
  spawn(team, role, pos, opts = {}) {
    const u = new Unit(this, team, role, pos, { uniform: uniformFor(this.g.op.id, team), ...opts });
    u.pos.y = this.g.world.groundAt(u.pos.x, u.pos.z);
    this.list.push(u);
    this.byId.set(u.uid, u);
    return u;
  }

  spawnTank(type, team, pos, yaw, id) {
    const t = new Tank(this, type, team, pos, yaw, id);
    t.pos.y = this.g.world.groundAt(pos.x, pos.z);
    this.tanks.push(t);
    if (id) this.g.world.targets[id] = { id, kind: 'tank', pos: t.pos, tank: t, destroyed: false };
    return t;
  }

  // Trupp aus der Kräfteliste der Operation
  spawnSquad(def, team, scale = 1) {
    const g = this.g, W = g.world;
    const anchor = W.anchors[def.anchor];
    if (!anchor) { console.warn('Anker fehlt', def.anchor); return null; }
    const isStatic = def.order === 'static';
    let n = isStatic ? def.n : Math.max(1, Math.round(def.n * scale));
    const sq = { id: this.squads.length, team, order: def.order, def, units: [], target: def.target ? W.anchors[def.target] : null, home: anchor.clone(), route: def.route, routeI: 0, spots: null, landing: def.landing, t: 0 };
    this.squads.push(sq);
    const roles = def.roles || [];
    const tgt = W.targets[def.anchor];
    for (let i = 0; i < n; i++) {
      const role = roles[i % Math.max(1, roles.length)] || 'rifle';
      const p = anchor.clone();
      if (isStatic) {
        if (def.tower && W.towers && W.towers.length) {
          let best = W.towers[0];
          for (const tw of W.towers) if (tw.distanceTo(anchor) < best.distanceTo(anchor)) best = tw;
          p.copy(best);
        } else if (tgt && tgt.gunPos) p.copy(tgt.gunPos).add(_v.set((i - 0.5) * 1.2, 0, 0));
        else { const a = (i / n) * Math.PI * 2; p.x += Math.cos(a) * (i ? 1.6 : 0.4); p.z += Math.sin(a) * (i ? 1.6 : 0.4); }
      } else if (def.order === 'lost') { p.x += (rand() - 0.5) * 6; p.z += (rand() - 0.5) * 6; }
      else { p.x += (rand() - 0.5) * 10; p.z += (rand() - 0.5) * 10; }
      if (!isStatic) { const c = W.navCell(p.x, p.z); if (!W.navFree(c[0], c[1])) p.copy(anchor); }
      const u = this.spawn(team, role, p, { yaw: team === g.attackDir.team ? g.attackDir.yaw : g.attackDir.yaw + Math.PI });
      if (isStatic) { u.static = true; u.home = p.clone(); u.crewOf = def.anchor; if (def.tower) { u.tower = true; u.pos.copy(p); } if (tgt && tgt.gunPos) u.pos.y = tgt.gunPos.y - 1.0; }
      if (def.order === 'lost') { u.lost = true; u.stance = 1; }
      u.squad = sq;
      sq.units.push(u);
    }
    if (def.tank) {
      const tp = anchor.clone().add(_v.set(0, 0, 0));
      const tk = this.spawnTank(def.tank, team, tp, g.attackDir.team === team ? g.attackDir.yaw : g.attackDir.yaw + Math.PI, def.tankId);
      tk.squad = sq; sq.tank = tk;
    }
    this.planSquad(sq);
    return sq;
  }

  planSquad(sq) {
    const W = this.g.world;
    if (sq.order === 'attack' && sq.target) this.requestPath(sq, sq.target);
    else if (sq.order === 'patrol' && sq.route) this.requestPath(sq, W.anchors[sq.route[0]]);
    if (sq.order === 'hold' || sq.order === 'static') this.makeSpots(sq, sq.home);
    if (sq.tank) {
      const tp = W.def.tankPath;
      if (tp && sq.team === 'de' && this.g.op.id === 'lafiere') { sq.tank.path = tp.map(([x, z]) => [x, z]); sq.tank.pathI = 0; }
      else if (sq.target) { const p = W.findPath(sq.tank.pos.x, sq.tank.pos.z, sq.target.x, sq.target.z); sq.tank.path = p; sq.tank.pathI = 0; }
    }
  }

  requestPath(sq, to) { this.pathQueue.push({ sq, to: to.clone() }); }

  // Stellungen um einen Punkt, bevorzugt nah an Deckung (Hecke, Mauer)
  makeSpots(sq, c) {
    const W = this.g.world, spots = [];
    const n = sq.units.length;
    for (let i = 0; i < n * 6 && spots.length < n; i++) {
      const a = rand() * Math.PI * 2, r = 3 + rand() * 16;
      const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
      const cell = W.navCell(x, z);
      if (!W.navFree(cell[0], cell[1])) continue;
      let cover = 0;
      for (const b of W.query(x, z, 4)) if (b.kind === 'hedge' || b.kind === 'wall' || b.kind === 'house') cover++;
      // im Stehen muss man über die Deckung in Feindrichtung sehen können
      const ty = this.g.attackDir.yaw + (sq.team === this.g.attackDir.team ? 0 : Math.PI);
      const eyeP = new THREE.Vector3(x, W.h(x, z) + 1.6, z), far = new THREE.Vector3(x - Math.sin(ty) * 25, 0, z - Math.cos(ty) * 25);
      far.y = W.h(far.x, far.z) + 1.2;
      const view = W.los(eyeP, far);
      if ((cover && view) || i > n * 5) spots.push(new THREE.Vector3(x, 0, z));
    }
    while (spots.length < n) spots.push(c.clone().add(_v.set((rand() - 0.5) * 8, 0, (rand() - 0.5) * 8)));
    sq.spots = spots;
    sq.units.forEach((u, i) => { u.spot = spots[i]; });
  }

  // ------------------------------------------------------------ Schaden
  damage(u, d, owner, dir, head = false, blast = false) {
    if (!u.alive) return;
    u.hp -= d;
    u.suppress = Math.min(1, u.suppress + 0.5);
    u.alert = 1;
    if (owner && !u.target) {
      // Angreifer suchen
      const src = this.ownerEntity(owner);
      if (src && src.team !== u.team) { u.target = src; u.targetSeen = this.g.time; }
    }
    if (dir && this.g.camera.position.distanceTo(u.pos) < 80) this.bloodWound(u, dir, head);
    if (u.hp <= 0) this.kill(u, owner, head, dir, blast);
  }

  // Blutfleck an der Einschussstelle (vorn bzw. hinten am Körper, je nach Schussrichtung)
  bloodWound(u, dir, head) {
    const B = bloodAssets();
    u.wounds = u.wounds || [];
    if (u.wounds.length >= 4) return;
    const fx = -Math.sin(u.yaw), fz = -Math.cos(u.yaw);
    const fromBack = dir.x * fx + dir.z * fz > 0;     // Kugel fliegt in Blickrichtung = Treffer von hinten
    const m = new THREE.Mesh(B.geo, B.mat);
    const s2 = 0.09 + rand() * 0.07;
    m.scale.set(s2, s2, 1);
    const leg = !head && rand() < 0.3;
    if (leg) { const th = u.rig.legs[rand() < 0.5 ? 0 : 1].th; m.position.set((rand() - 0.5) * 0.06, -0.15 - rand() * 0.15, fromBack ? 0.082 : -0.082); if (fromBack) m.rotation.y = Math.PI; th.add(m); }
    else { m.position.set((rand() - 0.5) * 0.16, 0.12 + rand() * 0.3, fromBack ? 0.115 : -0.115); if (fromBack) m.rotation.y = Math.PI; u.rig.torso.add(m); }
    u.wounds.push(m);
  }
  bloodPool(u) {
    const B = bloodAssets(), W = this.g.world;
    if (u.pool) return;
    const m = new THREE.Mesh(B.geo, B.pool);
    m.rotation.x = -Math.PI / 2; m.rotation.z = rand() * 6;
    m.position.set(u.pos.x, W.h(u.pos.x, u.pos.z) + 0.04, u.pos.z);
    m.scale.set(0.2, 0.2, 1);
    this.g.scene.add(m);
    u.pool = m; u.poolS = 0.2;
  }
  // Wiederbelebt / verarztet: Verband an der Wunde, aufstehen
  revive(u, hp = 45) {
    if (!u.downed) return;
    u.downed = false; u.alive = true; u.hp = hp; u.deadT = 0; u.medicFor = null;
    u.stance = 1; u.suppress = 0.5; u.target = null;
    u.rig.body.rotation.set(0, 0, 0); u.rig.body.position.set(0, 0, 0); u.rig.hips.position.y = 0.95;
    const B = bloodAssets();
    if (!u.bandaged) { const band = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.07, 12), B.band); band.scale.z = 0.7; band.position.y = 0.3; u.rig.torso.add(band); u.bandaged = true; }
    if (this.g.net && this.g.net.isHost) this.g.net.send({ t: 'rvu', u: u.uid });
  }

  ownerEntity(o) {
    if (!o) return null;
    if (o.uid) return this.byId.get(o.uid);
    if (o.local) return this.g.player;
    if (o.pid !== undefined) return this.g.avatars.get(o.pid) || null;
    return null;
  }

  // Kampfunfähig (verwundet): liegt, blutet, stirbt ohne Hilfe nach ca. 60 s; Kopftreffer und Volltreffer töten sofort
  kill(u, owner, head, dir, blast, forceDead = false) {
    const canDown = !forceDead && !head && !u.static && !u.inBoat && !u.downed && rand() < (blast ? 0.25 : 0.6);
    u.alive = false; u.hp = 0;
    u.deadT = 0;
    if (canDown) { u.downed = true; u.bleed = 50 + rand() * 25; this.bloodPool(u); }
    else u.downed = false;
    u.fallDir = dir ? Math.atan2(dir.x, dir.z) : 0;
    this.g.onUnitKilled(u, owner, head);
    if (this.g.net && this.g.net.isHost) this.g.net.unitKilled(u);
  }

  destroyTank(t, owner) {
    if (!t.alive) return;
    t.alive = false;
    const g = this.g;
    g.effects.explosion(t.pos.x, t.pos.y + 1.2, t.pos.z, 3);
    g.audio.play('boomBig', t.pos, 1, 0.8, { far: 1200, important: true });
    g.effects.burn(t.pos.x, t.pos.y + 1.6, t.pos.z, 120, 1.4);
    t.m.root.traverse((o) => { if (o.isMesh) o.material = MAT.burnt; });
    t.m.turret.rotation.z = 0.15; t.m.gun.rotation.x = -0.15;
    if (t.squad) t.squad.tank = null;
    const tg = g.world.targets[t.id];
    if (tg) tg.destroyed = true;
    g.world.addBox({ x: t.pos.x, z: t.pos.z, hw: t.spec.wid / 2, hd: t.spec.len / 2, rot: t.yaw, y0: t.pos.y - 1, y1: t.pos.y + t.spec.hgt + 0.5, kind: 'wall' });
    g.onTankKilled(t, owner);
    if (g.net && g.net.isHost) g.net.tankKilled(t);
  }

  // Kugeln in der Nähe drücken KI-Soldaten in Deckung
  suppressNear(p, owner) {
    for (const u of this.list) {
      if (!u.alive || (owner && owner.team === u.team)) continue;
      const dx = u.pos.x - p.x, dz = u.pos.z - p.z;
      if (dx * dx + dz * dz < 9) { u.suppress = Math.min(1, u.suppress + 0.12); u.alert = 1; if (owner && !u.target) { const src = this.ownerEntity(owner); if (src) { u.target = src; u.targetSeen = this.g.time - 1.5; } } }
    }
  }
  nadeGone() {}

  // ------------------------------------------------------------ Wahrnehmung
  enemiesOf(team) {
    const g = this.g, out = this._en || (this._en = []);
    out.length = 0;
    for (const u of this.list) if (u.alive && u.team !== team && !u.inBoat) out.push(u);
    if (g.player.alive && !g.player.downed && g.player.team !== team && !g.player.inBoat) out.push(g.player);
    for (const av of g.avatars.values()) if (av.alive && !av.downed && av.visible && av.team !== team) out.push(av);
    return out;
  }

  viewRange() {
    const g = this.g;
    let r = g.atmo ? g.atmo.visibility : 300;
    return r;
  }

  scan(u) {
    const g = this.g, W = g.world;
    const enemies = this.enemiesOf(u.team);
    let best = null, bd = 1e9;
    const vr = this.viewRange() * (u.role === 'sniper' ? 1.4 : 1) * (u.alert ? 1.15 : 1);
    const eye = _b.copy(u.eye);
    const fwd = u.fwd(_d);
    for (const e of enemies) {
      const dx = e.pos.x - u.pos.x, dz = e.pos.z - u.pos.z;
      const d = Math.hypot(dx, dz);
      // Mündungsfeuer verrät Schützen
      const flash = e.lastShot && g.time - e.lastShot < 1.2 ? 1.6 : 1;
      let range = vr * flash * (e.stance === 2 ? 0.55 : e.stance === 1 ? 0.8 : 1);
      if (d > range || d > bd) continue;
      // Blickfeld: hinten nur nah oder bei Alarm
      const dot = (dx * fwd.x + dz * fwd.z) / (d || 1);
      if (dot < -0.2 && d > 15 && !u.alert) continue;
      e.chest ? e.chest(_w) : _w.set(e.pos.x, e.pos.y + 1.2, e.pos.z);
      if (!W.los(eye, _w) || this.g.smokeBlocks(eye, _w)) continue;
      best = e; bd = d;
    }
    return best;
  }

  // ------------------------------------------------------------ Hauptschleife (nur Host/Einzelspieler)
  update(dt) {
    const g = this.g;
    // Wegfindung budgetiert
    for (let k = 0; k < 2 && this.pathQueue.length; k++) {
      const { sq, to } = this.pathQueue.shift();
      const lead = sq.units.find((u) => u.alive);
      if (!lead) continue;
      sq.path = g.world.findPath(lead.pos.x, lead.pos.z, to.x, to.z) || [[to.x, to.z]];
      for (const u of sq.units) { u.path = sq.path; u.pathI = 0; }
    }
    for (const sq of this.squads) this.updateSquad(sq, dt);
    this.assignMedics(dt);
    for (const u of this.list) {
      if (!u.alive) { this.animateDead(u, dt); continue; }
      if (u.inBoat) { this.render(u, dt); continue; }
      if (u.chute) { this.updateChute(u, dt); continue; }
      this.updateUnit(u, dt);
      this.render(u, dt);
    }
    for (const t of this.tanks) this.updateTank(t, dt);
    // Leichen nach einiger Zeit entfernen (Speicher/Leistung)
    if (this.list.length > 140) {
      const i = this.list.findIndex((u) => !u.alive && !u.downed && u.deadT > 30);
      if (i >= 0) { const u = this.list[i]; u.remove(); this.list.splice(i, 1); this.byId.delete(u.uid); }
    }
  }

  updateSquad(sq, dt) {
    sq.t += dt;
    const alive = sq.units.filter((u) => u.alive);
    if (!alive.length) return;
    if (sq.order === 'attack' && sq.target) {
      // am Ziel angekommen -> halten
      const lead = alive[0];
      if (lead.pos.distanceTo(sq.target) < 14) { sq.order = 'hold'; sq.home = sq.target.clone(); sq.repaths = 0; this.makeSpots(sq, sq.home); }
      else {
        // Weg zu Ende, aber noch nicht am Ziel (Teilweg durch die Hecken): neu planen
        sq.chk = (sq.chk || 0) - dt;
        if (sq.chk <= 0) {
          sq.chk = 4;
          const ended = alive.filter((u) => !u.path || u.pathI >= u.path.length).length;
          if (ended >= alive.length * 0.5) {
            sq.repaths = (sq.repaths || 0) + 1;
            if (sq.repaths > 3) {
              // Ziel unerreichbar: auf das aktuelle Ziel der Seite umschwenken bzw. dort halten
              const o = this.g.missions.objAnchor(sq.team);
              if (o && o.distanceTo(sq.target) > 5) { sq.target = o.clone(); sq.repaths = 0; }
              else { sq.order = 'hold'; sq.home = lead.pos.clone(); this.makeSpots(sq, sq.home); return; }
            }
            this.requestPath(sq, sq.target);
          }
        }
      }
    } else if (sq.order === 'hold' && sq.def && (sq.def.order === 'attack' || sq.def.landing || sq.reinf)) {
      // Angriffstrupps rücken mit dem Ziel ihrer Seite weiter vor (nicht bei Verteidigungszielen)
      sq.chk = (sq.chk || 0) - dt;
      if (sq.chk <= 0) {
        sq.chk = 12;
        const o = this.g.missions.obj(sq.team), a = this.g.missions.objAnchor(sq.team);
        if (o && a && o.type !== 'defend' && o.type !== 'survive' && sq.home.distanceTo(a) > 30) { sq.order = 'attack'; sq.target = a.clone(); sq.repaths = 0; this.requestPath(sq, a); }
      }
    } else if (sq.order === 'patrol' && sq.route) {
      const lead = alive[0], tgt = this.g.world.anchors[sq.route[sq.routeI]];
      if (tgt && lead.pos.distanceTo(tgt) < 12) { sq.routeI = (sq.routeI + 1) % sq.route.length; this.requestPath(sq, this.g.world.anchors[sq.route[sq.routeI]]); }
    } else if (sq.order === 'follow') {
      const leader = this.g.squadLeaderFor(sq.team);
      if (leader) sq.follow = leader;
      else if (sq.t > 3) {
        // kein menschlicher Anführer: selbstständig auf das aktuelle Ziel der eigenen Seite vorgehen
        const tg = this.g.missions.objAnchor(sq.team);
        if (tg) { sq.order = 'attack'; sq.target = tg.clone(); sq.follow = null; this.requestPath(sq, tg); }
      }
    }
  }

  updateChute(u, dt) {
    const W = this.g.world;
    u.pos.y -= 5.2 * dt;
    u.pos.x += u.drift.x * dt; u.pos.z += u.drift.z * dt;
    const gy = W.groundAt(u.pos.x, u.pos.z);
    u.chute.position.copy(u.pos);
    u.rig.root.position.copy(u.pos);
    u.rig.pose(0, 0, 0.2, dt);
    if (u.pos.y <= gy) {
      u.pos.y = gy;
      this.g.scene.remove(u.chute);
      u.chute = null;
    }
  }

  // Sanitäter-Aufträge verteilen: nächster freier Kamerad läuft zum Verwundeten
  assignMedics(dt) {
    this.medT = (this.medT || 0) - dt;
    if (this.medT > 0) return;
    this.medT = 1.5;
    const g = this.g;
    const patients = this.list.filter((u) => u.downed && !u.medic);
    // Spieler (und Mitspieler) am Boden
    if (g.player.downed && !g.player.medic) patients.push(g.player);
    for (const av of g.avatars.values()) if (av.downed && !av.medic) patients.push(av);
    for (const pt of patients) {
      if (g.player.dragging === pt) continue;
      let best = null, bd = pt.isPlayer || pt.pid !== undefined ? 90 : 35;
      for (const u of this.list) {
        if (!u.alive || u.team !== pt.team || u.static || u.inBoat || u.lost || u.medicFor || u.chute) continue;
        const busy = u.target && g.time - u.targetSeen < 2;
        if (busy && !(pt.isPlayer || pt.pid !== undefined)) continue;
        const d = u.pos.distanceTo(pt.pos);
        if (d < bd) { bd = d; best = u; }
      }
      if (best) { best.medicFor = pt; best.medicT = 0; pt.medic = best; }
    }
  }

  updateUnit(u, dt) {
    const g = this.g, W = g.world, sq = u.squad;
    // Sanitäter-Auftrag: zum Verwundeten laufen, 4 s verarzten
    if (u.medicFor) {
      const pt = u.medicFor;
      const stillDown = pt.isPlayer ? pt.downed : pt.pid !== undefined ? pt.downed : pt.downed;
      if (!stillDown) { if (pt.medic === u) pt.medic = null; u.medicFor = null; }
      else {
        const d = Math.hypot(pt.pos.x - u.pos.x, pt.pos.z - u.pos.z);
        if (d > 1.4) {
          if (!u.mpath || u.mpathT <= 0) { u.mpath = W.navLine(u.pos.x, u.pos.z, pt.pos.x, pt.pos.z) ? [[pt.pos.x, pt.pos.z]] : (W.findPath(u.pos.x, u.pos.z, pt.pos.x, pt.pos.z, 6000) || [[pt.pos.x, pt.pos.z]]); u.mpathI = 0; u.mpathT = 2; }
          u.mpathT -= dt;
          const p = u.mpath[Math.min(u.mpathI, u.mpath.length - 1)];
          const dx = p[0] - u.pos.x, dz = p[1] - u.pos.z, dl = Math.hypot(dx, dz);
          if (dl < 1.2 && u.mpathI < u.mpath.length - 1) u.mpathI++;
          const sp = 3.4 * dt;
          if (dl > 0.05) { u.pos.x += dx / dl * Math.min(dl, sp); u.pos.z += dz / dl * Math.min(dl, sp); u.yaw = lerpAngle(u.yaw, Math.atan2(-dx, -dz), dt * 6); }
          W.collide(u.pos, 0.35, u.pos.y, u.pos.y + 1.7);
          u.pos.y = W.groundAt(u.pos.x, u.pos.z, u.pos.y + 0.5);
          u.speed = 3.4; u.stance = 0;
          if (u.mpathT < -20) { if (pt.medic === u) pt.medic = null; u.medicFor = null; }   // kommt nicht hin
        } else {
          u.speed = 0; u.stance = 1;
          u.yaw = lerpAngle(u.yaw, Math.atan2(-(pt.pos.x - u.pos.x), -(pt.pos.z - u.pos.z)), dt * 6);
          u.medicT += dt;
          if (u.medicT > 4) {
            if (pt.isPlayer) g.revivePlayer(u.name);
            else if (pt.pid !== undefined) { if (g.net) g.net.sendTo(pt.pid, { t: 'revived', n: u.name }); pt.downed = false; }
            else this.revive(pt);
            if (pt.medic === u) pt.medic = null;
            u.medicFor = null;
          }
        }
        return;
      }
    }
    u.suppress = Math.max(0, u.suppress - dt * 0.25);
    u.alert = Math.max(0, u.alert - dt * 0.02);
    u.firing = Math.max(0, u.firing - dt * 6);
    u.think -= dt;
    if (u.reloadT > 0) { u.reloadT -= dt; if (u.reloadT <= 0) u.mag = magCap(u.W); }
    // verlorener Fallschirmjäger: wartet versteckt
    if (u.lost) {
      u.stance = 1;
      const pl = g.player;
      if (pl.alive && pl.team === u.team && pl.pos.distanceTo(u.pos) < 16) g.foundLost(u);
      else { this.engage(u, dt, false); return; }
    }
    if (u.think <= 0) {
      u.think = 0.35 + rand() * 0.4;
      if (!u.target || !u.target.alive || g.time - u.targetSeen > 4) {
        const t = this.scan(u);
        if (t) { if (t !== u.target) u.aimT = 0.5 + rand() * 0.8; u.target = t; u.targetSeen = g.time; u.alert = 1; }
        else if (u.target && (!u.target.alive || g.time - u.targetSeen > 6)) u.target = null;
      } else {
        // Sichtkontakt prüfen
        u.target.chest ? u.target.chest(_w) : _w.copy(u.target.pos).setY(u.target.pos.y + 1.2);
        if (W.los(u.eye, _w) && !g.smokeBlocks(u.eye, _w)) u.targetSeen = g.time;
        else if (rand() < 0.3) { const t = this.scan(u); if (t) { u.target = t; u.targetSeen = g.time; } }
      }
    }
    const engaging = !!(u.target && g.time - u.targetSeen < 2.5);
    // Bewegungsziel bestimmen
    let goal = null, run = false;
    if (u.static) goal = null;
    else if (sq.order === 'follow' && sq.follow) {
      const L = sq.follow;
      const idx = sq.units.indexOf(u);
      // Fächer HINTER dem Anführer (rotation.y = yaw blickt nach −z; hinten = (sin yaw, cos yaw))
      const ang = L.yaw + ((idx + 0.5) / Math.max(1, sq.units.length) - 0.5) * Math.PI * 0.9;
      _v.set(L.pos.x + Math.sin(ang) * (4 + (idx % 3) * 2), 0, L.pos.z + Math.cos(ang) * (4 + (idx % 3) * 2));
      const d = _v.distanceTo(_w.set(u.pos.x, 0, u.pos.z));
      if (d > 3) {
        if (!u.fpath || u.fpathT <= 0 || u.fgoal.distanceTo(_v) > 8) { u.fgoal = _v.clone(); u.fpathT = 2.5; u.fpath = W.navLine(u.pos.x, u.pos.z, _v.x, _v.z) ? [[_v.x, _v.z]] : (W.findPath(u.pos.x, u.pos.z, _v.x, _v.z, 6000) || [[_v.x, _v.z]]); u.fpathI = 0; }
        u.fpathT -= dt;
        const p = u.fpath[Math.min(u.fpathI, u.fpath.length - 1)];
        goal = _w.set(p[0], 0, p[1]);
        if (Math.hypot(u.pos.x - p[0], u.pos.z - p[1]) < 1.5 && u.fpathI < u.fpath.length - 1) u.fpathI++;
        run = d > 10;
      }
    } else if ((sq.order === 'hold' || sq.order === 'static') && u.spot) {
      if (Math.hypot(u.pos.x - u.spot.x, u.pos.z - u.spot.z) > 1.2) {
        if (!u.spath || u.spathFor !== u.spot) { u.spathFor = u.spot; u.spath = W.findPath(u.pos.x, u.pos.z, u.spot.x, u.spot.z, 8000) || [[u.spot.x, u.spot.z]]; u.spathI = 0; }
        const p = u.spath[Math.min(u.spathI, u.spath.length - 1)];
        goal = _w.set(p[0], 0, p[1]);
        if (Math.hypot(u.pos.x - p[0], u.pos.z - p[1]) < 1.3 && u.spathI < u.spath.length - 1) u.spathI++;
        run = true;
      }
    } else if (u.path && u.pathI < u.path.length) {
      const p = u.path[u.pathI];
      // seitlicher Versatz im Trupp
      const idx = sq.units.indexOf(u);
      const off = ((idx % 5) - 2) * 1.6;
      const nx = u.pathI > 0 ? p[1] - u.path[u.pathI - 1][1] : 0, nz = u.pathI > 0 ? -(p[0] - u.path[u.pathI - 1][0]) : 0;
      const nl = Math.hypot(nx, nz) || 1;
      goal = _w.set(p[0] + (nx / nl) * off * 0.5, 0, p[1] + (nz / nl) * off * 0.5);
      if (Math.hypot(u.pos.x - goal.x, u.pos.z - goal.z) < 2.2) u.pathI++;
      run = !engaging;
    }
    // Angreifer gehen im Feuerkampf zeitweise weiter vor (Sprung-Vorgehen)
    let move = !!goal;
    if (engaging && goal && sq.order === 'attack') {
      u.bound = (u.bound ?? rand() * 6) - dt;
      if (u.bound < 0) u.bound = 3 + rand() * 6;
      move = (u.bound < 2.6 && u.suppress < 0.7) || u.bound < 1.0;
    } else if (engaging && goal && sq.order === 'follow') move = true;
    else if (engaging && goal && (sq.order === 'hold' || sq.order === 'static')) move = u.suppress < 0.5;
    // Haltung
    const wantProne = u.suppress > 0.75 && !move && !u.tower && !u.static;
    u.stance = move ? (u.suppress > 0.5 ? 1 : 0) : wantProne ? 2 : engaging ? (u.role === 'mg' || u.role === 'sniper' ? 2 : u.static ? 0 : 1) : sq.order === 'hold' ? 1 : 0;
    if (u.tower || (u.static && u.crewOf && g.world.targets[u.crewOf] && g.world.targets[u.crewOf].kind === 'bunker')) u.stance = 0;
    if (u.inWater) u.stance = 0;
    // Schusslinie war verdeckt: höhere Haltung erzwingen (über die Brustwehr schießen)
    if (u.blockT > 0) { u.blockT -= dt; u.stance = Math.min(u.stance, u.blockStance); }
    // Bewegung
    if (move && goal) {
      const dx = goal.x - u.pos.x, dz = goal.z - u.pos.z, d = Math.hypot(dx, dz);
      const depth = W.waterDepth(u.pos.x, u.pos.z);
      u.inWater = depth > 0.5;
      let sp = (run ? 3.6 : 1.7) * (u.stance === 1 ? 0.6 : 1) * (depth > 0.6 ? 0.45 : 1);
      if (d > 0.1) {
        const step = Math.min(d, sp * dt);
        const ox = u.pos.x, oz = u.pos.z;
        u.pos.x += (dx / d) * step; u.pos.z += (dz / d) * step;
        W.collide(u.pos, 0.35, u.pos.y, u.pos.y + 1.7);
        this.separate(u);
        const pl = this.g.player;
        if (pl.alive) { const dx2 = u.pos.x - pl.pos.x, dz2 = u.pos.z - pl.pos.z, d2 = Math.hypot(dx2, dz2); if (d2 < 1.4 && d2 > 1e-3) { u.pos.x = pl.pos.x + dx2 / d2 * 1.4; u.pos.z = pl.pos.z + dz2 / d2 * 1.4; } }
        const moved = Math.hypot(u.pos.x - ox, u.pos.z - oz);
        u.speed = moved / dt;
        u.stuck = moved < step * 0.3 ? u.stuck + dt : 0;
        if (u.stuck > 2) { u.stuck = 0; if (u.path) u.pathI = Math.min(u.pathI + 1, u.path.length); u.pos.x += (rand() - 0.5); u.pos.z += (rand() - 0.5); u.fpathT = 0; }
        if (!engaging) u.yaw = lerpAngle(u.yaw, Math.atan2(-dx, -dz), dt * 6);
      }
    } else u.speed = 0;
    u.pos.y = W.groundAt(u.pos.x, u.pos.z, u.tower ? u.pos.y : u.pos.y + 0.5);
    if (u.tower || (u.static && u.home && u.home.y > u.pos.y + 1)) u.pos.y = Math.max(u.pos.y, u.home.y - 0.2);
    this.engage(u, dt, engaging);
    // Handgranate
    u.nadeT -= dt;
    if (engaging && u.nades > 0 && u.nadeT < 0 && u.target) {
      const d = u.pos.distanceTo(u.target.pos);
      if (d > 9 && d < 26 && rand() < 0.5) this.throwNade(u, u.target);
      u.nadeT = 15 + rand() * 20;
    }
  }

  separate(u) {
    const sq = u.squad;
    for (const o of sq.units) {
      if (o === u || !o.alive) continue;
      const dx = u.pos.x - o.pos.x, dz = u.pos.z - o.pos.z, d2 = dx * dx + dz * dz;
      if (d2 < 0.8 && d2 > 1e-4) { const d = Math.sqrt(d2), k = (0.9 - d) * 0.5; u.pos.x += (dx / d) * k; u.pos.z += (dz / d) * k; }
    }
  }

  // Zielen und Schießen
  engage(u, dt, engaging) {
    const g = this.g;
    if (!engaging || !u.target) { u.pitch *= 0.9; return; }
    const t = u.target;
    // Panzerabwehr bekämpft Panzer bevorzugt
    let aimAt = t.chest ? t.chest(_w) : _w.copy(t.pos).setY(t.pos.y + 1.1);
    if (u.role === 'at' && u.W.at) {
      const tk = this.nearestTank(u, 140);
      if (tk) aimAt = _w.copy(tk.pos).setY(tk.pos.y + 1.0);
      else if (u.altWid) { /* Ersatzwaffe */ }
    }
    if (u.role === 'sniper' && rand() < 0.4 && t.stance !== 2) aimAt.y += 0.45;
    // freie Schusslinie? Sonst nicht in die eigene Deckung feuern, sondern aufrichten bzw. Stellung wechseln
    if (!u.losT || g.time > u.losT) {
      u.losT = g.time + 0.4;
      u.losOk = g.world.los(u.eye, aimAt);
      if (!u.losOk) {
        u.blockStance = Math.max(0, u.stance - 1); u.blockT = 5;
        u.blockedFor = (u.blockedFor || 0) + 0.4;
        if (u.blockedFor > 2.5 && u.stance === 0 && !u.static && u.spot) {
          // ein paar Meter Richtung Feind bzw. seitlich versetzen
          const dx = aimAt.x - u.pos.x, dz = aimAt.z - u.pos.z, dl = Math.hypot(dx, dz) || 1;
          for (let k = 0; k < 6; k++) {
            const side = (rand() - 0.5) * 6, fwd = 2 + rand() * 4;
            const nx = u.pos.x + dx / dl * fwd - dz / dl * side, nz = u.pos.z + dz / dl * fwd + dx / dl * side;
            const c = g.world.navCell(nx, nz);
            if (g.world.navFree(c[0], c[1])) { u.spot = new THREE.Vector3(nx, 0, nz); u.spath = null; break; }
          }
          u.blockedFor = 0;
        }
      } else u.blockedFor = 0;
    }
    if (!u.losOk) return;
    const eye = u.eye;
    const dx = aimAt.x - eye.x, dy = aimAt.y - eye.y, dz = aimAt.z - eye.z;
    const dist = Math.hypot(dx, dz);
    const wantYaw = Math.atan2(-dx, -dz);
    u.yaw = lerpAngle(u.yaw, wantYaw, dt * 5);
    // Fallkurve ausgleichen (Visier)
    const drop = (0.5 * 9.81 * (dist / u.W.vel) ** 2);
    u.pitch = Math.atan2(dy + drop, dist);
    u.aimT -= dt;
    if (u.aimT > 0 || u.reloadT > 0 || dist > u.W.range * 1.15) return;
    if (Math.abs(wrapAngle(u.yaw - wantYaw)) > 0.25) return;
    if (g.time < u.nextFire) return;
    // Panzerabwehr ohne Panzer: Ersatzwaffe (Karabiner/G43) nicht modelliert -> nur auf Panzer schießen
    if (u.W.at && !this.nearestTank(u, 140)) { if (!u.swapped) { u.swapped = true; u.wid = u.team === 'us' ? 'carbine' : 'g43'; u.W = WEAPONS[u.wid]; u.mag = u.W.mag; u.rig.setWeapon(u.wid); } }
    if (u.mag <= 0) { u.reloadT = u.W.reload * (1 + rand() * 0.5); g.audio.play('mag', u.pos, 0.3); return; }
    // Feuerrhythmus: Feuerstöße für Automaten, Einzelfeuer sonst
    const W = u.W;
    const skill = g.aiSkill() * (u.role === 'sniper' ? 2.4 : u.role === 'officer' ? 1.1 : 1);
    if (W.auto) {
      if (u.burst <= 0) { u.burst = W.id === 'mg42' ? 6 + (rand() * 12 | 0) : 3 + (rand() * 6 | 0); }
      u.burst--;
      u.nextFire = g.time + 60 / W.rpm * (1 + rand() * 0.15) + (u.burst <= 0 ? 0.9 + rand() * 1.8 : 0);
    } else u.nextFire = g.time + Math.max(60 / W.rpm, W.bolt ? 1.6 + rand() * 2.5 : 0.7 + rand() * 1.4) * (1 + u.suppress);
    // Streuung: Grundstreuung + Entfernung + Niederhalten + Bewegung des Ziels
    const moving = t.speed > 1 ? 1.6 : 1;
    const base = (W.id === 'mg42' || W.id === 'bar' ? 0.022 : W.auto ? 0.03 : W.scope ? 0.005 : 0.013) * moving;
    const err = (base * (1 + u.suppress * 2.5) * (dist < 30 ? 0.8 : 1 + dist / 170) * (t.stance === 2 ? 1.3 : 1)) / skill;
    _d.set(dx, dy + drop, dz).normalize();
    _d.x += (rand() - 0.5) * err * 2; _d.y += (rand() - 0.5) * err * 1.6; _d.z += (rand() - 0.5) * err * 2;
    _d.normalize();
    const muzzle = _v.copy(eye).addScaledVector(_d, 0.9);
    muzzle.y -= 0.08;
    u.mag--;
    u.firing = 1;
    u.lastShot = g.time;
    const owner = { team: u.team, uid: u.uid };
    if (W.rocket) g.combat.rocket(muzzle, _d, W, owner, true);
    else {
      const tracer = W.id === 'mg42' || W.id === 'bar' ? (u.mag % 3 === 0) : false;
      g.combat.fire(muzzle, _d, W, owner, true, tracer);
      if (g.net && g.net.isHost) g.net.aiShot(muzzle, _d, W.id, tracer, u.team);
    }
    g.effects.muzzle(muzzle, _d, W.id === 'mg42', g.camera.position.distanceTo(muzzle) < 120);
    g.audio.play(W.sound === 'mg42' ? 'mg42' : W.sound, muzzle, W.id === 'mg42' ? 0.9 : 0.8, 0.95 + rand() * 0.1, { far: 900 });
  }

  nearestTank(u, r) {
    let best = null, bd = r;
    for (const t of this.tanks) if (t.alive && t.team !== u.team) { const d = t.pos.distanceTo(u.pos); if (d < bd) { bd = d; best = t; } }
    return best;
  }

  throwNade(u, t) {
    const g = this.g;
    u.nades--;
    const from = _v.copy(u.pos).setY(u.pos.y + 1.6);
    const to = t.pos;
    const dx = to.x - from.x, dz = to.z - from.z, d = Math.hypot(dx, dz);
    const vt = Math.min(20, Math.sqrt(d * 9.81 / Math.sin(2 * 0.7)));
    const vel = new THREE.Vector3((dx / d) * vt * Math.cos(0.7), vt * Math.sin(0.7), (dz / d) * vt * Math.cos(0.7));
    vel.x += (rand() - 0.5) * 2; vel.z += (rand() - 0.5) * 2;
    g.combat.grenade(from.clone(), vel, 3.5 + rand(), { team: u.team, uid: u.uid }, true, u.team === 'us' ? 'mk2' : 'stiel');
    if (g.net && g.net.isHost) g.net.nadeThrown(from, vel, u.team === 'us' ? 'mk2' : 'stiel');
    if (u.team !== g.player.team && to === g.player) g.hud.warn(T('Granate!', 'Grenade!'));
  }

  updateTank(t, dt) {
    const g = this.g, W = g.world;
    const m = t.m;
    if (!t.alive) return;
    // Fahren
    let moving = false;
    if (t.path && t.pathI < t.path.length) {
      const enemyNear = this.enemiesOf(t.team).some((e) => e.pos.distanceTo(t.pos) < 35 && !e.isTank);
      const p = t.path[t.pathI];
      const dx = p[0] - t.pos.x, dz = p[1] - t.pos.z, d = Math.hypot(dx, dz);
      if (d < 3) t.pathI++;
      else if (!(enemyNear && rand() < 0.5 && t.pathI > 1 && t.halt > 0)) {
        const want = Math.atan2(-dx, -dz);
        const da = wrapAngle(want - t.yaw);
        t.yaw += clamp(da, -0.5 * dt, 0.5 * dt);
        if (Math.abs(da) < 0.6) {
          const sp = t.spec.speed * (Math.abs(da) < 0.2 ? 1 : 0.4);
          t.pos.x += -Math.sin(t.yaw) * sp * dt; t.pos.z += -Math.cos(t.yaw) * sp * dt;
          moving = true;
        }
      }
      t.halt = (t.halt || 0) - dt;
      if (t.halt < -12) t.halt = 4;
    }
    t.pos.y = W.groundAt(t.pos.x, t.pos.z, t.pos.y + 1);
    m.root.position.copy(t.pos);
    // Neigung am Gelände
    const n = W.normal(t.pos.x, t.pos.z, _v);
    m.root.rotation.set(0, t.yaw, 0);
    m.root.rotation.x = Math.atan2(-(n.x * -Math.sin(t.yaw) + n.z * -Math.cos(t.yaw)), n.y) * 0.8;
    // Ziel suchen
    t.think -= dt;
    if (t.think <= 0) {
      t.think = 1 + rand();
      let best = null, bd = 260;
      const eye = _b.set(t.pos.x, t.pos.y + 2.2, t.pos.z);
      for (const e of this.enemiesOf(t.team)) {
        const d = e.pos.distanceTo(t.pos);
        if (d < bd && W.los(eye, _w.set(e.pos.x, e.pos.y + 1, e.pos.z))) { bd = d; best = e; }
      }
      for (const e of this.tanks) if (e.alive && e.team !== t.team) { const d = e.pos.distanceTo(t.pos); if (d < 400 && d < bd + 100) { best = e; bd = d; } }
      t.target = best;
    }
    if (t.target && (t.target.alive)) {
      const dx = t.target.pos.x - t.pos.x, dz = t.target.pos.z - t.pos.z;
      const want = wrapAngle(Math.atan2(-dx, -dz) - t.yaw);
      if (t.spec.casemate) { t.yaw += clamp(want, -0.3 * dt, 0.3 * dt); }
      else t.turretYaw += clamp(wrapAngle(want - t.turretYaw), -0.6 * dt, 0.6 * dt);
      m.turret.rotation.y = t.spec.casemate ? 0 : t.turretYaw;
      const aimErr = Math.abs(wrapAngle((t.spec.casemate ? 0 : t.turretYaw) - want));
      t.nextFire -= dt;
      const d = Math.hypot(dx, dz);
      if (t.nextFire <= 0 && aimErr < 0.06) {
        t.nextFire = 6 + rand() * 4;
        this.tankFire(t, d);
      }
      // Bug-/Turm-MG
      t.mgT -= dt;
      if (t.mgT <= 0 && d < 220 && !t.target.isTank) {
        if (t.mgBurst <= 0) { t.mgBurst = 8 + (rand() * 10 | 0); }
        t.mgBurst--;
        t.mgT = t.mgBurst > 0 ? 0.06 : 1.5 + rand() * 2;
        const mz = _v.set(t.pos.x - Math.sin(t.yaw) * t.spec.len * 0.45, t.pos.y + 1.4, t.pos.z - Math.cos(t.yaw) * t.spec.len * 0.45);
        const tc = _w.set(t.target.pos.x, t.target.pos.y + 1, t.target.pos.z);
        _d.subVectors(tc, mz).normalize();
        const e = 0.03 / g.aiSkill();
        _d.x += (rand() - 0.5) * e; _d.y += (rand() - 0.5) * e; _d.z += (rand() - 0.5) * e; _d.normalize();
        const W2 = t.team === 'us' ? WEAPONS.bar : WEAPONS.mg42;
        g.combat.fire(mz, _d, W2, { team: t.team, tank: t.id }, true, t.mgBurst % 3 === 0);
        if (g.net && g.net.isHost) g.net.aiShot(mz, _d, W2.id, t.mgBurst % 3 === 0, t.team);
        g.audio.play(W2.sound, mz, 0.7, 1, { far: 900 });
      }
    }
    // Motorklang des nächsten Panzers
    const dc = g.camera.position.distanceTo(t.pos);
    if (dc < (this._tankD || 1e9)) this._tankD = dc;
    t.moving = moving;
  }

  tankFire(t, d) {
    const g = this.g, m = t.m;
    const yaw = t.yaw + (t.spec.casemate ? 0 : t.turretYaw);
    const L = t.m.muzzleLen + 1;
    const mz = new THREE.Vector3(t.pos.x - Math.sin(yaw) * L, t.pos.y + (t.spec.casemate ? 1.6 : 2.3), t.pos.z - Math.cos(yaw) * L);
    const tp = t.target.pos.clone(); tp.y += 1;
    const e = (0.006 + d * 0.00004) / g.aiSkill();
    tp.x += (rand() - 0.5) * d * e * 2; tp.z += (rand() - 0.5) * d * e * 2; tp.y += (rand() - 0.5) * d * e;
    _d.subVectors(tp, mz).normalize();
    g.effects.muzzle(mz, _d, true);
    g.effects.explosion(mz.x, mz.y, mz.z, 0.4);
    g.audio.play('cannon', mz, 1, 1, { far: 1500, important: true });
    // Einschlag nach Flugzeit an der ersten Kollision
    const far = mz.clone().addScaledVector(_d, d + 40);
    const tw = g.world.raycast(mz, far);
    let hit = mz.clone().lerp(far, tw);
    const h = g.combat.hitTest(mz, far, { team: t.team });
    if (h && h.t < tw) hit = mz.clone().lerp(far, h.t);
    const owner = { team: t.team, tank: t.id };
    setTimeout(() => {
      if (!g.world) return;
      if (h && h.kind === 'tank' && h.t < tw) h.ent.damage(220 + rand() * 200, owner, true);
      g.combat.explode(hit, 160, 6, owner, true, 2);
    }, (d / 750) * 1000);
    if (g.net && g.net.isHost) g.net.tankShot(t, mz, hit);
  }

  animateDead(u, dt) {
    u.deadT += dt;
    if (u.downed) {
      // ziehen: Verwundeter hängt hinter dem Spieler
      const host = !this.g.net || this.g.net.isHost;
      let pl = this.g.player;
      if (pl.dragging !== u && host && this.g.net) { for (const av of this.g.avatars.values()) if (av.dragging === u && av.alive && av.visible) { pl = av; break; } }
      if (pl.dragging === u && host) {
        const bx = pl.pos.x + Math.sin(pl.yaw) * 1.1, bz = pl.pos.z + Math.cos(pl.yaw) * 1.1;
        u.pos.x += (bx - u.pos.x) * Math.min(1, dt * 8); u.pos.z += (bz - u.pos.z) * Math.min(1, dt * 8);
        u.pos.y = this.g.world.groundAt(u.pos.x, u.pos.z, u.pos.y + 0.5);
        u.yaw = pl.yaw + Math.PI;
        u.rig.root.position.copy(u.pos); u.rig.root.rotation.y = u.yaw;
        if (u.pool) u.pool.visible = false;
      }
      if (host) { u.bleed -= dt * (pl.dragging === u ? 0.5 : 1); if (u.bleed <= 0) { u.downed = false; u.deadT = 0; if (u.marker) u.marker.visible = false; } }
      if (u.pool && u.poolS < 1.3 && pl.dragging !== u) { u.poolS += dt * 0.04; u.pool.scale.set(u.poolS, u.poolS, 1); }
      this.mark(u, this.g.camera.position.distanceTo(u.pos));
    } else if (u.marker) u.marker.visible = false;
    if (u.deadT < 3) {
      u.rig.root.rotation.y = u.yaw;
      u.rig.pose(0, 0, 0, dt, Math.min(1, u.deadT * 2.2));
    }
  }

  // ------------------------------------------------------------ Darstellung
  render(u, dt) {
    const r = u.rig;
    r.root.position.copy(u.pos);
    r.root.rotation.y = u.yaw;
    const d = this.g.camera.position.distanceTo(u.pos);
    r.root.visible = d < this.g.q.view * 0.9 && d > 0.9;
    r.setLod(d > 70 ? 1 : 0);
    if (r.root.visible) r.pose(u.speed, u.stance, u.pitch, dt, 0, u.firing);
    this.mark(u, d);
  }

  // Markierung über dem Kopf: rot = Feind (nur wenn sichtbar oder gerade geschossen), blau = Kamerad
  mark(u, d) {
    const g = this.g;
    const on = g.settings.markers !== false && (u.alive || (u.downed && u.team === g.player.team)) && !u.inBoat;
    let show = false;
    if (on) {
      if (u.team === g.player.team) show = (d < 250 && !u.lost) || (u.downed && d < 300);
      else {
        if (!u.markT || g.time > u.markT) {
          u.markT = g.time + 0.35 + Math.random() * 0.3;
          const vr = Math.max(60, (g.atmo ? g.atmo.visibility : 250) * 1.6);
          u.markVis = d < vr && g.world.los(g.camera.position, u.chest(_w)) && !g.smokeBlocks(g.camera.position, _w);
        }
        show = (u.markVis || (u.lastShot && g.time - u.lastShot < 3 && d < 250)) && d < 400;
      }
    }
    if (!show) { if (u.marker) u.marker.visible = false; return; }
    if (!u.marker) {
      u.marker = new THREE.Sprite(markMat(u.team === g.player.team ? 'blue' : 'red'));
      u.marker.center.set(0.5, 0);
      g.scene.add(u.marker);
    }
    const want = u.downed ? 'green' : u.team === g.player.team ? 'blue' : 'red';
    if (u.marker.material !== markMat(want)) u.marker.material = markMat(want);
    u.marker.visible = true;
    u.marker.position.set(u.pos.x, u.pos.y + (u.downed ? 0.7 : u.stance === 2 ? 0.9 : u.stance === 1 ? 1.7 : 2.2), u.pos.z);
    // Größe in Bildschirmanteilen; auf großen Bildschirmen (Fernseher) etwas größer, nah etwas kleiner
    // feste Bildschirmgröße in Pixeln (unabhängig von Auflösung/Grafikstufe): ~27 px Handy, ~35 px Full-HD-Fernseher
    const px = (22 + innerHeight * 0.012) * (g.settings.markerSize || 1) * (d < 15 ? 0.8 : 1);
    const sc = (px * 2) / innerHeight;
    u.marker.scale.set(sc, sc, 1);
  }

  // Für Clients: Puppen aus Schnappschuss
  snapshot() {
    const out = [];
    for (const u of this.list) {
      if (!u.alive && u.deadT > 4) continue;
      out.push(u.uid, u.team === 'us' ? 0 : 1, ROLES.indexOf(u.role), Math.round(u.pos.x * 10) / 10, Math.round(u.pos.y * 10) / 10, Math.round(u.pos.z * 10) / 10,
        Math.round(u.yaw * 100) / 100, Math.round(u.pitch * 100) / 100, u.stance | (u.alive ? 0 : 4) | (u.firing > 0.5 ? 8 : 0) | (u.chute ? 16 : 0) | (u.downed ? 32 : 0), WIDS.indexOf(u.wid));
    }
    const T2 = this.tanks.map((t) => [t.id, t.type, t.team === 'us' ? 0 : 1, Math.round(t.pos.x * 10) / 10, Math.round(t.pos.z * 10) / 10, Math.round(t.yaw * 100) / 100, Math.round(t.turretYaw * 100) / 100, t.alive ? 1 : 0]);
    return { u: out, t: T2 };
  }

  applySnapshot(s, dt = 0.08) {
    const seen = new Set();
    const U = s.u;
    for (let k = 0; k < U.length; k += 10) {
      const uid = U[k];
      seen.add(uid);
      let u = this.byId.get(uid);
      const team = U[k + 1] ? 'de' : 'us';
      const wid = WIDS[U[k + 9]] || undefined;
      if (!u) {
        u = new Unit(this, team, ROLES[U[k + 2]] || 'rifle', new THREE.Vector3(U[k + 3], U[k + 4], U[k + 5]), { uid, uniform: uniformFor(this.g.op.id, team), wid });
        this.g.scene.add(u.rig.root);
        this.list.push(u); this.byId.set(uid, u);
        u.netPos = u.pos.clone();
      }
      if (wid && wid !== u.wid) { u.wid = wid; u.W = WEAPONS[wid]; u.rig.setWeapon(wid); }
      u.netPos = (u.netPos || new THREE.Vector3()).set(U[k + 3], U[k + 4], U[k + 5]);
      u.netYaw = U[k + 6]; u.pitch = U[k + 7];
      const fl = U[k + 8];
      u.stance = fl & 3;
      const alive = !(fl & 4);
      if (u.alive && !alive) { u.alive = false; u.deadT = 0; }
      if (!u.alive && alive && u.downed) { u.rig.body.rotation.set(0, 0, 0); u.rig.body.position.set(0, 0, 0); u.rig.hips.position.y = 0.95; }
      u.alive = alive;
      const dn = !!(fl & 32);
      if (dn && !u.downed) this.bloodPool(u);
      if (!dn && u.pool) { this.g.scene.remove(u.pool); u.pool = null; }
      u.downed = dn;
      u.firing = fl & 8 ? 1 : 0;
      u.netChute = !!(fl & 16);
    }
    for (const u of this.list) if (!seen.has(u.uid) && !u.alive) u.deadT = Math.max(u.deadT, 30);
    for (const [id, type, tm, x, z, yaw, ty, alive] of s.t || []) {
      let t = this.tanks.find((q) => q.id === id);
      if (!t) { t = this.spawnTank(type, tm ? 'de' : 'us', new THREE.Vector3(x, 0, z), yaw, id); }
      t.netPos = new THREE.Vector3(x, 0, z); t.netYaw = yaw; t.turretYaw = ty;
      if (t.alive && !alive) this.destroyTank(t, null);
    }
  }

  // Client: Puppen interpolieren
  updatePuppets(dt) {
    const W = this.g.world;
    for (const u of this.list) {
      if (u.netPos) {
        const k = Math.min(1, dt * 10);
        const d = u.pos.distanceTo(u.netPos);
        u.speed = u.speed * 0.8 + (d / Math.max(dt, 0.001)) * 0.2 * (d < 5 ? 1 : 0);
        if (d > 8) u.pos.copy(u.netPos); else u.pos.lerp(u.netPos, k);
        u.yaw = lerpAngle(u.yaw, u.netYaw ?? u.yaw, k);
      }
      if (u.netChute && !u.chute) { u.chute = buildChute(); this.g.scene.add(u.chute); }
      if (!u.netChute && u.chute) { this.g.scene.remove(u.chute); u.chute = null; }
      if (u.chute) u.chute.position.copy(u.pos);
      if (!u.alive) this.animateDead(u, dt);
      else this.render(u, dt);
      u.speed = Math.min(u.speed, 4);
    }
    for (const t of this.tanks) {
      if (t.netPos && t.alive) {
        t.pos.x += (t.netPos.x - t.pos.x) * Math.min(1, dt * 6); t.pos.z += (t.netPos.z - t.pos.z) * Math.min(1, dt * 6);
        t.yaw = lerpAngle(t.yaw, t.netYaw, Math.min(1, dt * 6));
        t.pos.y = W.groundAt(t.pos.x, t.pos.z, t.pos.y + 1);
        t.m.root.position.copy(t.pos); t.m.root.rotation.y = t.yaw; t.m.turret.rotation.y = t.spec.casemate ? 0 : t.turretYaw;
      }
    }
  }

  countAlive(team, near = null, r = 0) {
    let n = 0;
    for (const u of this.list) if (u.alive && u.team === team && !u.lost && (!near || Math.hypot(u.pos.x - near.x, u.pos.z - near.z) < r)) n++;
    return n;
  }
}

export const ROLES = ['rifle', 'smg', 'assault', 'mg', 'sniper', 'at', 'officer'];
export const WIDS = Object.keys(WEAPONS);

// KI-MG-Schützen: Laufwechsel nach 75 Schuss (Spieler hat den vollen 250er-Gurt)
const MARKS = {};
export function markMat(kind) {
  if (MARKS[kind]) return MARKS[kind];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const col = kind === 'red' ? '#ff2a1a' : kind === 'green' ? '#ffd000' : '#2f86ff';
  // nach unten zeigendes Dreieck mit dickem dunklem und weißem Rand (auf jedem Hintergrund sichtbar)
  const tri = () => { x.beginPath(); x.moveTo(8, 10); x.lineTo(56, 10); x.lineTo(32, 54); x.closePath(); };
  x.lineJoin = 'round';
  tri(); x.lineWidth = 12; x.strokeStyle = 'rgba(0,0,0,0.85)'; x.stroke();
  tri(); x.lineWidth = 5; x.strokeStyle = '#ffffff'; x.stroke();
  tri(); x.fillStyle = col; x.fill();
  if (kind === 'green') { x.fillStyle = '#c00'; x.fillRect(28, 14, 8, 24); x.fillRect(20, 22, 24, 8); }   // Verwundeter: rotes Kreuz
  return (MARKS[kind] = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, depthWrite: false, sizeAttenuation: false, transparent: true, fog: false, toneMapped: false }));
}

// Blut und Verbände
const BLOOD = {};
function bloodAssets() {
  if (BLOOD.mat) return BLOOD;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  for (let i = 0; i < 9; i++) { const g = x.createRadialGradient(32 + (Math.random() - 0.5) * 22, 32 + (Math.random() - 0.5) * 22, 1, 32, 32, 10 + Math.random() * 16); g.addColorStop(0, 'rgba(90,6,4,0.95)'); g.addColorStop(1, 'rgba(70,4,2,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }
  const t = new THREE.CanvasTexture(c);
  BLOOD.mat = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, color: 0xffffff });
  BLOOD.pool = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: 0xbbbbbb });
  BLOOD.geo = new THREE.PlaneGeometry(1, 1);
  BLOOD.band = new THREE.MeshLambertMaterial({ color: 0xe8e4da });
  return BLOOD;
}

export function magCap(W) { return W.id === 'mg42' ? 75 : W.mag; }

export function lerpAngle(a, b, t) { return a + wrapAngle(b - a) * Math.min(1, t); }
