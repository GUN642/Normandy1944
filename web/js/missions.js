// Missionsablauf: Aufstellung, Ziele beider Seiten, Funkzeitplan, Landungsboote, Absprung, Sprengladungen,
// Verstärkung, Sieg und Niederlage. Rechnet beim Host bzw. im Einzelspiel; Mitspieler erhalten den Zustand.
import * as THREE from './lib/three.module.min.js';
import { buildBoat, buildChute, MAT } from './models.js';
import { L, T } from './i18n.js';
import { rand } from './util.js';

const OTHER = { us: 'de', de: 'us' };
const _v = new THREE.Vector3();

class Boat {
  constructor(g, x, z0, z1, delay) {
    this.g = g;
    const b = buildBoat();
    this.root = b.root; this.ramp = b.ramp;
    this.x = x; this.z = z0; this.z1 = z1;
    this.t = -delay;
    this.state = 'wait';
    this.pax = [];
    this.root.position.set(x, -0.4, z0);
    this.root.rotation.y = Math.PI;   // Bugklappe zeigt zum Strand (+z)
    g.scene.add(this.root);
    this.root.visible = delay <= 0;
  }
  seat(i) {   // Sitzplätze: zwei Reihen hinter der Klappe
    const row = Math.floor(i / 2), side = i % 2 ? 0.7 : -0.7;
    return _v.set(this.x + side, this.root.position.y + 0.5, this.z + 3.4 - row * 1.05);
  }
  update(dt) {
    this.t += dt;
    if (this.t < 0) return;
    this.root.visible = true;
    const y = -0.4 + Math.sin(this.g.time * 1.4 + this.x) * 0.18;
    this.root.position.y = y;
    this.root.rotation.x = Math.sin(this.g.time * 1.1 + this.x) * 0.03;
    this.root.rotation.y = Math.PI;
    if (this.state === 'wait') this.state = 'run';
    if (this.state === 'run') {
      this.z = Math.min(this.z1, this.z + 5.2 * dt);
      if (this.z >= this.z1) { this.state = 'ramp'; this.rampT = 0; this.g.audio.play('thud', this.root.position, 1, 0.6); }
    } else if (this.state === 'ramp') {
      this.rampT += dt;
      this.ramp.rotation.x = -Math.min(1.35, this.rampT * 1.6);
      if (this.rampT > 0.9) {
        this.state = 'unload';
        this.unT = 0;
      }
    } else if (this.state === 'unload') {
      this.unT += dt;
      while (this.pax.length && this.unT > 0.35) {
        this.unT -= 0.35;
        const u = this.pax.shift();
        u.inBoat = null;
        if (u.isPlayer) { u.pos.set(this.x, this.g.world.groundAt(this.x, this.z + 6.5), this.z + 6.5); this.g.hud.toast(T('Raus! Zur Kieselbank!', 'Go! To the shingle!')); }
        else { u.pos.set(this.x + (rand() - 0.5) * 2, 0, this.z + 6 + rand() * 2); u.yaw = Math.PI; }
      }
      if (!this.pax.length && this.unT > 6) this.state = 'leave';
    } else if (this.state === 'leave') {
      this.ramp.rotation.x = Math.min(0, this.ramp.rotation.x + dt);
      this.z -= 3 * dt;
      if (this.z < this.z1 - 60) { this.g.scene.remove(this.root); this.dead = true; }
    }
    this.root.position.z = this.z;
    this.pax.forEach((u, i) => { u.pos.copy(this.seat(i + (u.isPlayer ? 0 : 0))); if (u.isPlayer) u.pos.y -= 0.4; });
  }
}

export class Missions {
  constructor(game) {
    this.g = game;
    this.boats = [];
    this.charges = [];
    this.decor = [];
  }

  // ------------------------------------------------------------ Start
  // mode: 'campaign' | 'free' | 'coop' | 'versus'; humanSides: welche Seiten Menschen haben
  start(op, mode, opts = {}) {
    const g = this.g;
    this.op = op;
    this.mode = mode;
    this.t = 0;
    this.over = false;
    this.result = null;
    this.events = op.events.slice().sort((a, b) => a.t - b.t);
    this.evI = 0;
    this.state = {};
    for (const s of ['us', 'de']) this.state[s] = { i: 0, prog: 0, timer: 0, kills: 0, found: 0, lose: 0, done: false, failed: false, objT: 0 };
    this.waves = [];
    this.reinf = { us: 0, de: 0 };
    this.reinfT = { us: 90, de: 90 };
    this.maxTime = opts.maxTime || 1500;
    this.focus = new THREE.Vector3();
    // Kräfte: Wellen mit Startzeit merken
    const scale = g.aiScale();
    for (const side of ['us', 'de']) for (const def of op.forces[side]) {
      if (def.wave) this.waves.push({ side, def, t: def.wave, done: false });
      else this.spawnDef(side, def, scale);
    }
    // Zusätzliche Scharfschützen (Atmosphäre: Scharfschützenbeschuss)
    const sn = op.ambient.sniper || 0;
    for (let i = 0; i < sn; i++) this.extraSniper('de');
    this.updateFocus();
  }

  spawnDef(side, def, scale) {
    const g = this.g;
    if (def.landing) return this.landingWave(side, def, scale);
    return g.units.spawnSquad(def, side, scale);
  }

  // Landungsboote mit Truppen (Omaha)
  landingWave(side, def, scale, withPlayer = false) {
    const g = this.g, W = g.world;
    const a = W.anchors[def.anchor];
    const n = Math.max(2, Math.round(def.n * scale));
    const nb = Math.max(1, Math.ceil((n + (withPlayer ? 1 : 0)) / 12));
    const sq = { id: g.units.squads.length, team: side, order: 'attack', def, units: [], target: W.anchors[def.target], home: a.clone(), t: 0 };
    g.units.squads.push(sq);
    const boats = [];
    for (let b = 0; b < nb; b++) {
      const x = a.x + (b - (nb - 1) / 2) * 34 + (rand() - 0.5) * 10;
      let zEnd = -262;
      while (W.h(x, zEnd) > -0.9 && zEnd > -330) zEnd -= 1;
      const boat = new Boat(g, x, zEnd - 70, zEnd, b * 1.5);
      this.boats.push(boat); boats.push(boat);
    }
    if (withPlayer) { boats[0].pax.push(g.player); g.player.inBoat = boats[0]; }
    const roles = def.roles || ['rifle'];
    for (let i = 0; i < n; i++) {
      const boat = boats[i % nb];
      const u = g.units.spawn(side, roles[i % roles.length], boat.seat(boat.pax.length), { yaw: Math.PI });
      u.inBoat = boat; u.stance = 1; u.squad = sq;
      boat.pax.push(u); sq.units.push(u);
    }
    // Weg vom Strand zum Ziel
    sq.path = W.findPath(a.x, -255, sq.target.x, sq.target.z) || [[sq.target.x, sq.target.z]];
    for (const u of sq.units) { u.path = sq.path; u.pathI = 0; }
    if (def.tank) {
      const tk = g.units.spawnTank(def.tank, side, new THREE.Vector3(a.x + 20, 0, -250), Math.PI, def.tankId);
      tk.path = W.findPath(tk.pos.x, tk.pos.z, sq.target.x, sq.target.z); tk.pathI = 0;
    }
    return sq;
  }

  extraSniper(side) {
    const W = this.g.world;
    const o = this.op[side].objectives.find((x) => x.anchor) || {};
    const base = W.anchors[o.anchor] || W.anchors[this.op[side].spawn] || Object.values(W.anchors)[0];
    for (let k = 0; k < 30; k++) {
      const a = rand() * Math.PI * 2, r = 40 + rand() * 90;
      const p = base.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
      const c = W.navCell(p.x, p.z);
      if (!W.navFree(c[0], c[1])) continue;
      if (!W.query(p.x, p.z, 4).some((b) => b.kind === 'hedge' || b.kind === 'tree' || b.kind === 'house')) continue;
      this.spawnAt(side, 'sniper', p);
      return;
    }
  }
  spawnAt(side, role, p) {
    const u = this.g.units.spawn(side, role, p);
    const sq = { id: -1, team: side, order: 'static', units: [u], home: p.clone() };
    u.squad = sq; u.static = true; u.home = p.clone();
    return u;
  }

  spawnZones() {
    const W = this.g.world, out = [];
    for (const s of ['us', 'de']) { const a = W.anchors[this.op[s].spawn]; if (a) out.push(a); }
    return out;
  }

  // Spawnpunkt des menschlichen Spielers
  // Wiedereinstieg weiter vorn: hinter dem Kameraden, der dem aktuellen Ziel am nächsten ist
  // und nicht unmittelbar im Feindkontakt steht; sonst am zuletzt erreichten Ziel
  forwardSpawn(side) {
    const g = this.g, W = g.world;
    const a = this.objAnchor(side);
    if (!a) return null;
    const enemies = g.units.list.filter((u) => u.alive && u.team !== side);
    const friends = g.units.list.filter((u) => u.alive && u.team === side && !u.inBoat && !u.lost && !u.static && !u.chute);
    for (const av of g.avatars.values()) if (av.alive && av.visible && av.team === side) friends.push(av);
    let best = null, bd = 1e9;
    for (const f of friends) {
      if (W.waterDepth(f.pos.x, f.pos.z) > 0.6) continue;
      let de = 1e9;
      for (const e of enemies) { const d = Math.hypot(e.pos.x - f.pos.x, e.pos.z - f.pos.z); if (d < de) de = d; }
      if (de < 35) continue;
      const d = Math.hypot(f.pos.x - a.x, f.pos.z - a.z);
      if (d < bd) { bd = d; best = f; }
    }
    const base = best ? best.pos : this.state[side].lastAnchor;
    if (!base) return null;
    // ein paar Meter hinter dem Kameraden (vom Ziel weg), auf freiem, trockenem Boden
    const dx = base.x - a.x, dz = base.z - a.z, dl = Math.hypot(dx, dz) || 1;
    for (let k = 0; k < 16; k++) {
      const back = 3 + rand() * 4, side2 = (rand() - 0.5) * 6;
      const x = base.x + dx / dl * back - dz / dl * side2, z = base.z + dz / dl * back + dx / dl * side2;
      const c = W.navCell(x, z);
      if (W.navFree(c[0], c[1]) && W.waterDepth(x, z) < 0.5) return new THREE.Vector3(x, W.groundAt(x, z), z);
    }
    return null;
  }

  playerSpawn(side, first) {
    const g = this.g, W = g.world, sp = this.op[side].spawn;
    if (!first) { const f = this.forwardSpawn(side); if (f) return { p: f, forward: true }; }
    if (sp === 'jump') {
      if (first) return { jump: true, p: W.anchors.jump.clone().setY(W.h(W.anchors.jump.x, W.anchors.jump.z) + 170) };
      const pts = ['pt1', 'pt2', 'pt3', 'pt4'].map((k) => W.anchors[k]);
      return { p: pts[(rand() * pts.length) | 0].clone() };
    }
    if (sp === 'boats') {
      if (first) return { boat: true };
      const x = (rand() - 0.5) * 160;
      let z = -250; while (W.h(x, z) < -0.6 && z < -150) z += 2;
      return { p: new THREE.Vector3(x, 0, z) };
    }
    const a = W.anchors[sp] || W.anchors[Object.keys(W.anchors)[0]];
    for (let k = 0; k < 20; k++) {
      const p = a.clone().add(new THREE.Vector3((rand() - 0.5) * 16, 0, (rand() - 0.5) * 16));
      const c = W.navCell(p.x, p.z);
      if (W.navFree(c[0], c[1])) return { p };
    }
    return { p: a.clone() };
  }

  // Position des aktuellen Ziels einer Seite (für KI-Trupps)
  objAnchor(side) {
    const W = this.g.world, o = this.obj(side) || this.obj(OTHER[side]);
    if (!o) return null;
    const name = o.anchor || (o.targets && o.targets.find((id) => W.targets[id] && !W.targets[id].destroyed)) || (o.targets && o.targets[0]);
    return W.anchors[name] || (W.targets[name] && W.targets[name].pos) || null;
  }

  // ------------------------------------------------------------ Zielauswertung
  obj(side) { const s = this.state[side]; return this.op[side].objectives[s.i] || null; }

  humansOf(side) {
    const g = this.g, out = [];
    if (g.player.alive && g.player.team === side) out.push(g.player);
    for (const a of g.avatars.values()) if (a.alive && a.visible && a.team === side) out.push(a);
    return out;
  }
  hasHumans(side) { const g = this.g; return g.player.team === side || [...g.avatars.values()].some((a) => a.team === side); }

  countNear(side, p, r, aiToo = true) {
    let n = 0;
    for (const h of this.humansOf(side)) if (Math.hypot(h.pos.x - p.x, h.pos.z - p.z) < r) n++;
    if (aiToo) for (const u of this.g.units.list) if (u.alive && u.team === side && !u.lost && !u.inBoat && Math.hypot(u.pos.x - p.x, u.pos.z - p.z) < r) n++;
    return n;
  }

  update(dt) {
    const g = this.g;
    if (this.over) return;
    this.t += dt;
    for (const b of this.boats) b.update(dt);
    this.boats = this.boats.filter((b) => !b.dead);
    this.updateDecor(dt);
    this.updateCharges(dt);
    // Funksprüche
    while (this.evI < this.events.length && this.events[this.evI].t <= this.t) {
      const e = this.events[this.evI++];
      if (!e.side || e.side === g.player.team) g.radio(L(e.text), L(e.from));
    }
    const host = !g.net || g.net.isHost;
    if (!host) return;
    // Wellen
    const scale = g.aiScale();
    for (const w of this.waves) if (!w.done && this.t >= w.t) { w.done = true; this.spawnDef(w.side, w.def, scale); }
    // Verstärkung (freies Spiel/Mehrspieler unbegrenzt, Kampagne begrenzt)
    for (const side of ['us', 'de']) {
      this.reinfT[side] -= dt;
      if (this.reinfT[side] <= 0) {
        // Angreifer bekommt häufiger Nachschub als der Verteidiger
        const o = this.obj(side), defending = o && (o.type === 'defend' || o.type === 'survive');
        this.reinfT[side] = (defending ? 85 : 55) + rand() * 25;
        const alive = g.units.countAlive(side);
        const limit = this.mode === 'campaign' ? 3 : 99;
        if (alive < (defending ? 8 : 14) * scale && this.reinf[side] < limit) { this.reinf[side]++; this.reinforce(side, scale); }
      }
    }
    for (const side of ['us', 'de']) this.evalSide(side, dt);
    this.updateFocus();
    if (this.t > this.maxTime && !this.over) {
      // Zeit abgelaufen: Verteidiger gewinnt
      const att = this.op.id === 'lafiere' ? 'de' : 'us';
      this.finish(att === 'us' ? 'de' : 'us', T('Zeit abgelaufen', 'Time is up'));
    }
  }

  reinforce(side, scale) {
    const g = this.g, W = g.world;
    const first = this.op.forces[side].find((d) => d.order !== 'static' && d.order !== 'lost' && !d.landing) || this.op.forces[side][0];
    // Ziel: aktueller Brennpunkt
    const o = this.obj(side), oe = this.obj(OTHER[side]);
    const tgtName = (o && (o.anchor || (o.targets && o.targets[0]))) || (oe && oe.anchor) || first.target || first.anchor;
    const def = { anchor: this.op[side].spawn in W.anchors ? this.op[side].spawn : first.anchor, n: 6, order: 'attack', target: tgtName, roles: ['rifle', 'smg', 'rifle', 'mg', 'rifle', side === 'us' ? 'at' : 'assault'] };
    if (this.op[side].spawn === 'boats') { def.anchor = 'boat'; def.landing = true; return this.landingWave(side, def, scale); }
    if (this.op[side].spawn === 'jump') def.anchor = ['pt1', 'pt2', 'pt3', 'pt4'][(rand() * 4) | 0];
    if (!W.anchors[def.target]) def.target = first.target || first.anchor;
    if (side === g.player.team) g.radio(T('Verstärkung ist eingetroffen.', 'Reinforcements have arrived.'), T('Gefechtsstand', 'Command post'));
    const sq = g.units.spawnSquad(def, side, scale);
    if (sq) sq.reinf = true;
    return sq;
  }

  evalSide(side, dt) {
    const g = this.g, W = g.world, s = this.state[side];
    if (s.done || s.failed) return;
    const o = this.obj(side);
    if (!o) { s.done = true; this.finish(side); return; }
    const human = this.hasHumans(side);
    s.objT += dt;
    let done = false;
    switch (o.type) {
      case 'reach': {
        const a = W.anchors[o.anchor];
        done = human ? this.humansOf(side).some((h) => Math.hypot(h.pos.x - a.x, h.pos.z - a.z) < o.r) || (s.objT > 240 && this.countNear(side, a, o.r) >= 3) : this.countNear(side, a, o.r) > 0;
        s.prog = 0;
        break;
      }
      case 'regroup':
        done = s.found >= o.n || (!human && s.objT > 120);
        s.prog = s.found / o.n;
        break;
      case 'destroy': {
        let n = 0;
        for (const id of o.targets) {
          const tg = W.targets[id];
          if (!tg) { if (this.t > 900) n++; continue; }   // Ziel noch nicht da (Panzer einer späteren Welle)
          if (tg.destroyed) { n++; continue; }
          if (tg.crew && tg.kind !== 'gun' && tg.kind !== 'flak' && tg.kind !== 'wire') {
            const crew = g.units.list.filter((u) => u.crewOf === id);
            if (crew.length && crew.every((u) => !u.alive)) { this.destroyTarget(tg, side); n++; continue; }
          }
          // KI-Seite: Sprengladung automatisch, wenn eigene Soldaten am Ziel sind
          // KI-Seite sprengt selbst; mit Spielern helfen KI-Pioniere, wenn es 2,5 Minuten nicht vorangeht
          if ((!human || s.objT > 150) && !tg.charging && tg.kind !== 'tank' && this.countNear(side, tg.pos, tg.kind === 'wire' ? 9 : 6) > 0) this.placeCharge(tg, side, null);
        }
        s.prog = n / o.targets.length;
        done = n === o.targets.length;
        break;
      }
      case 'clear': {
        const a = W.anchors[o.anchor];
        const en = this.countNear(OTHER[side], a, o.r);
        done = en <= (o.left || 0) && this.countNear(side, a, o.r * 1.4) > 0;
        s.prog = en;
        break;
      }
      case 'defend': {
        const a = W.anchors[o.anchor];
        if (!s.timer) s.timer = o.time;
        s.timer -= dt;
        const en = this.countNear(OTHER[side], a, o.r), fr = this.countNear(side, a, o.r);
        if (en > fr + 1 && en >= 3) s.lose += dt; else s.lose = Math.max(0, s.lose - dt * 0.5);
        s.prog = s.lose;
        if (s.lose > 25) {
          s.failed = true;
          // Spieler verliert seine Stellung: verloren. KI-Verteidiger: die Angreifer müssen ihre Ziele trotzdem erfüllen
          if (this.hasHumans(side)) this.finish(OTHER[side], T('Stellung verloren', 'Position lost'));
          return;
        }
        done = s.timer <= 0;
        break;
      }
      case 'flag': {
        const tg = W.targets[o.anchor];
        if (!human && this.countNear(side, tg.pos, 5) > 0) { s.flagT = (s.flagT || 0) + dt; if (s.flagT > 4) this.raiseFlag(tg); }
        done = tg && tg.destroyed;
        break;
      }
      case 'kill':
        done = s.kills >= o.n;
        s.prog = s.kills / o.n;
        break;
      case 'survive':
        if (!s.timer) s.timer = o.time;
        s.timer -= dt;
        done = s.timer <= 0;
        break;
    }
    if (done) {
      { const nm = o.anchor || (o.targets && o.targets[0]); const pa = W.anchors[nm] || (W.targets[nm] && W.targets[nm].pos); if (pa && o.type !== 'defend') s.lastAnchor = pa.clone(); }
      s.i++; s.timer = 0; s.lose = 0; s.objT = 0; s.kills = 0; s.flagT = 0;
      if (side === g.player.team) { g.onObjective(o); }
      const nx = this.obj(side);
      if (!nx) { s.done = true; this.finish(side); }
      else if (side === g.player.team) g.radio(T('Neues Ziel: ', 'New objective: ') + L(nx.text), T('Gefechtsstand', 'Command post'));
      // eigene KI-Trupps auf das neue Ziel ansetzen
      if (nx) this.retask(side, nx);
    }
  }

  retask(side, o) {
    const g = this.g, W = g.world;
    const name = o.anchor || (o.targets && o.targets[0]);
    const a = W.anchors[name] || (W.targets[name] && W.targets[name].pos);
    if (!a) return;
    for (const sq of g.units.squads) {
      if (sq.team !== side || sq.order === 'static' || sq.order === 'follow' || sq.order === 'lost') continue;
      if (o.type === 'defend' && sq.order === 'hold' && sq.home.distanceTo(a) < 60) continue;
      sq.order = 'attack'; sq.target = a.clone();
      g.units.requestPath(sq, a);
    }
  }

  // ------------------------------------------------------------ Interaktion (Taste E)
  // Liefert die nächstgelegene Interaktion für den Spieler (HUD-Hinweis)
  interaction(p, side) {
    const W = this.g.world, o = this.obj(side);
    if (!o) return null;
    if (o.type === 'destroy') for (const id of o.targets) {
      const tg = W.targets[id];
      if (!tg || tg.destroyed || tg.charging || tg.kind === 'tank' || tg.kind === 'mg') continue;
      const d = Math.hypot(p.x - tg.pos.x, p.z - tg.pos.z);
      if (d < (tg.kind === 'bunker' ? 6 : 4)) return { kind: 'charge', tg, text: tg.kind === 'wire' ? T('E halten: Bangalore-Torpedo anlegen', 'Hold E: place Bangalore torpedo') : T('E halten: Sprengladung anbringen', 'Hold E: plant demolition charge'), time: 2.5 };
    }
    if (o.type === 'flag') {
      const tg = W.targets[o.anchor];
      if (tg && !tg.destroyed && Math.hypot(p.x - tg.pos.x, p.z - tg.pos.z) < 4) return { kind: 'flag', tg, text: T('E halten: Flagge hissen', 'Hold E: raise the flag'), time: 3 };
    }
    return null;
  }

  // Ausführen (Host) – who: Spieler-ID oder null
  interact(act, side) {
    if (act.kind === 'charge') this.placeCharge(act.tg, side, true);
    else if (act.kind === 'flag') this.raiseFlag(act.tg);
  }

  placeCharge(tg, side, human) {
    const g = this.g;
    if (tg.charging || tg.destroyed) return;
    tg.charging = true;
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.2), new THREE.MeshLambertMaterial({ color: 0x8a6a3a }));
    m.position.copy(tg.pos); m.position.y = g.world.h(tg.pos.x, tg.pos.z) + 0.15;
    g.scene.add(m);
    this.charges.push({ tg, t: 6, side, m });
    if (side === g.player.team) g.radio(T('Ladung liegt! Sechs Sekunden – in Deckung!', 'Charge set! Six seconds – take cover!'), T('Pionier', 'Engineer'), true);
    if (g.net && g.net.isHost) g.net.send({ t: 'chg', id: tg.id });
  }

  updateCharges(dt) {
    const g = this.g;
    for (let i = this.charges.length - 1; i >= 0; i--) {
      const c = this.charges[i];
      c.t -= dt;
      if (Math.floor(c.t * 2) !== Math.floor((c.t + dt) * 2)) g.audio.play('click', c.m.position, 0.4, 1.5);
      if (c.t <= 0) {
        g.scene.remove(c.m);
        this.charges.splice(i, 1);
        const host = !g.net || g.net.isHost;
        g.combat.explode(c.tg.pos.clone(), 200, 7, { team: c.side, charge: true }, host, c.tg.kind === 'wire' ? 2 : 3);
        if (host) this.destroyTarget(c.tg, c.side);
      }
    }
  }

  destroyTarget(tg, side) {
    const g = this.g;
    if (tg.destroyed) return;
    tg.destroyed = true;
    tg.charging = false;
    if (tg.kind === 'wire') {
      if (tg.mesh) g.world.group.remove(tg.mesh); if (tg.box) { tg.box.cut = true; tg.box.soft = true; }
      g.world.buildNav();   // Gasse im Draht: Wege neu berechnen
      for (const sq of g.units.squads) if (sq.order === 'attack' && sq.target) g.units.requestPath(sq, sq.target);
    }
    else if (tg.mesh && (tg.kind === 'gun' || tg.kind === 'flak')) {
      tg.mesh.traverse((o) => { if (o.isMesh) o.material = MAT.burnt; });
      tg.mesh.rotation.z = 0.25;
      g.effects.burn(tg.pos.x, tg.pos.y, tg.pos.z, 40, 0.7);
    } else if (tg.kind === 'bunker') g.effects.burn(tg.pos.x, tg.pos.y + 1, tg.pos.z, 50, 0.8);
    // Besatzung fällt
    for (const u of g.units.list) if (u.alive && u.crewOf === tg.id && u.pos.distanceTo(tg.pos) < 8) g.units.kill(u, { team: side }, false, null, true);
    if (g.net && g.net.isHost) g.net.send({ t: 'tgd', id: tg.id });
    if (side === g.player.team) g.score(100, T('Ziel zerstört', 'Target destroyed'));
  }

  raiseFlag(tg) {
    const g = this.g;
    if (tg.destroyed) return;
    tg.destroyed = true;
    const fl = tg.mesh.userData.flag;
    fl.visible = true; fl.position.y = 1;
    if (g.net && g.net.isHost) g.net.send({ t: 'tgd', id: tg.id });
  }

  // Treffer auf Ziele durch Explosionen (Granaten, Panzerfaust, Artillerie)
  explosionAt(p, dmg, r, owner) {
    const W = this.g.world;
    for (const tg of Object.values(W.targets)) {
      if (tg.destroyed || !tg.hp || tg.kind === 'tank' || tg.kind === 'flag' || tg.kind === 'mg') continue;
      const d = tg.pos.distanceTo(p);
      if (d > r + 2) continue;
      tg.hp -= dmg * (1 - d / (r + 2)) * (tg.kind === 'bunker' ? 0.35 : 1);
      if (tg.hp <= 0) this.destroyTarget(tg, owner && owner.team ? owner.team : 'us');
    }
  }

  // ------------------------------------------------------------ Kulissen-Fallschirme
  decorChute(p) {
    const g = this.g;
    if (this.decor.length > 16) return;
    const ch = buildChute(true);
    ch.position.copy(p); ch.position.y -= 6;
    g.scene.add(ch);
    this.decor.push({ m: ch, v: new THREE.Vector3((rand() - 0.5) * 3, -5.5, (rand() - 0.5) * 3) });
  }
  updateDecor(dt) {
    const W = this.g.world;
    for (let i = this.decor.length - 1; i >= 0; i--) {
      const d = this.decor[i];
      d.m.position.addScaledVector(d.v, dt);
      if (d.m.position.y < W.h(d.m.position.x, d.m.position.z)) { this.g.scene.remove(d.m); this.decor.splice(i, 1); }
    }
  }

  updateFocus() {
    const g = this.g, W = g.world;
    const o = this.obj(g.player.team) || this.obj(OTHER[g.player.team]);
    if (!o) return;
    const name = o.anchor || (o.targets && o.targets[0]);
    const a = W.anchors[name] || (W.targets[name] && W.targets[name].pos);
    if (a) this.focus.copy(a);
  }

  // Ziel-Markierung (HUD): Position des aktuellen Ziels
  markers(side) {
    const W = this.g.world, o = this.obj(side), out = [];
    if (!o) return out;
    if (o.type === 'destroy') { for (const id of o.targets) { const tg = W.targets[id]; if (tg && !tg.destroyed) out.push(tg.pos); } }
    else if (o.type === 'regroup') { for (const u of this.g.units.list) if (u.lost && u.alive && u.team === side) out.push(u.pos); }
    else if (o.anchor && W.anchors[o.anchor]) out.push(W.anchors[o.anchor]);
    return out;
  }

  finish(winner, reason = '') {
    if (this.over) return;
    this.over = true;
    this.result = { winner, reason };
    this.g.onMissionEnd(winner, reason);
  }

  // ------------------------------------------------------------ Netz
  toNet() {
    const S = {};
    for (const s of ['us', 'de']) { const x = this.state[s]; S[s] = [x.i, Math.round(x.timer), Math.round(x.lose), x.found, x.kills, Math.round(x.prog * 100) / 100]; }
    return { S, t: Math.round(this.t) };
  }
  applyNet(d) {
    for (const s of ['us', 'de']) {
      const x = this.state[s], v = d.S[s];
      if (v[0] > x.i && s === this.g.player.team) this.g.onObjective(this.op[s].objectives[x.i]);
      x.i = v[0]; x.timer = v[1]; x.lose = v[2]; x.found = v[3]; x.kills = v[4]; x.prog = v[5];
    }
    this.t = Math.max(this.t, d.t);
  }

  clear() {
    for (const b of this.boats) this.g.scene.remove(b.root);
    for (const c of this.charges) this.g.scene.remove(c.m);
    for (const d of this.decor) this.g.scene.remove(d.m);
    this.boats = []; this.charges = []; this.decor = [];
  }
}

export { OTHER };
