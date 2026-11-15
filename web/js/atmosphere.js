// Atmosphäre: Tageszeit, Wetter, Gefechtskulisse (Artillerie, Schiffsgeschütze, Nebelwerfer, Flak, Flugzeuge, Leuchtkugeln)
// und per Funk angeforderte Unterstützung (Artillerie, Luftangriff, Rauch).
import * as THREE from './lib/three.module.min.js';
import { buildPlane } from './models.js';
import { clamp, rand, lerp } from './util.js';
import { T } from './i18n.js';

// Wetter-Voreinstellungen
export const WEATHER = {
  clear_morning: { cloud: 0.25, fog: 0.0016, rain: 0, wind: 2, light: 1, name: { de: 'Klar', en: 'Clear' } },
  overcast: { cloud: 0.85, fog: 0.0028, rain: 0, wind: 4, light: 0.72, name: { de: 'Bedeckt', en: 'Overcast' } },
  overcast_wind: { cloud: 0.9, fog: 0.0032, rain: 0.15, wind: 9, light: 0.68, name: { de: 'Bedeckt, Wind', en: 'Overcast, wind' } },
  rain: { cloud: 1, fog: 0.0045, rain: 1, wind: 6, light: 0.55, name: { de: 'Regen', en: 'Rain' } },
  fog: { cloud: 0.8, fog: 0.011, rain: 0, wind: 1, light: 0.7, name: { de: 'Nebel', en: 'Fog' } },
  dawn_mist: { cloud: 0.5, fog: 0.006, rain: 0, wind: 2, light: 0.8, name: { de: 'Frühnebel', en: 'Dawn mist' } },
  night_clouds: { cloud: 0.75, fog: 0.004, rain: 0, wind: 5, light: 0.5, name: { de: 'Nacht, bewölkt', en: 'Night, cloudy' } },
};

export class Atmosphere {
  constructor(game, hour, weatherId, ambient) {
    this.g = game;
    this.hour = hour;
    this.wid = weatherId;
    this.w = WEATHER[weatherId] || WEATHER.overcast;
    this.amb = ambient || {};
    this.t = 0;
    this.timers = { arty: 4, naval: 6, nw: 30, planes: 3, flak: 0, flare: 6, mortar: 10, distant: 1 };
    this.planes = [];
    this.searchlights = [];
    this.visibility = 300;
    this.setup();
  }

  // ------------------------------------------------------------ Licht und Himmel
  setup() {
    const g = this.g, w = this.w;
    const h = this.hour;
    // Sonnenstand (Normandie, Juni, deutsche Sommerzeit ~ Sonnenaufgang 06:00, Mittag 14:00)
    const elev = Math.sin(((h - 6) / 16) * Math.PI) * 62;
    this.elev = elev;
    this.night = elev < -4;
    this.dusk = clamp((elev + 6) / 14, 0, 1);   // 0 = Nacht, 1 = Tag
    const az = ((h - 14) / 12) * Math.PI;      // Süden mittags
    const er = (Math.max(elev, -10) * Math.PI) / 180;
    this.sunDir = new THREE.Vector3(Math.sin(az) * Math.cos(er), Math.sin(er), Math.cos(az) * Math.cos(er)).normalize();
    if (this.night) this.sunDir.set(0.4, 0.7, -0.5).normalize();  // Mond
    const day = this.dusk, L = w.light;
    const warm = clamp(1 - Math.abs(elev - 6) / 18, 0, 1) * (1 - w.cloud * 0.6);   // Morgen-/Abendrot
    const sky = g.sky.material.uniforms;
    const top = new THREE.Color().setRGB(lerp(0.02, 0.27, day) * L, lerp(0.03, 0.38, day) * L, lerp(0.07, 0.58, day) * L);
    const hor = new THREE.Color().setRGB(lerp(0.05, 0.68, day) * L + warm * 0.35, lerp(0.06, 0.7, day) * L + warm * 0.12, lerp(0.1, 0.72, day) * L - warm * 0.05);
    if (w.cloud > 0.7) { top.lerp(hor, 0.5); }
    sky.top.value.copy(top); sky.horizon.value.copy(hor);
    sky.ground.value.copy(hor).multiplyScalar(0.6);
    sky.sunDir.value.copy(this.sunDir);
    sky.sunCol.value.setRGB(1, 0.9 - warm * 0.25, 0.75 - warm * 0.4).multiplyScalar(this.night ? 0.25 : (1 - w.cloud * 0.8));
    sky.sunSize.value = this.night ? 0.9998 : 0.9994;
    sky.cloud.value = w.cloud;
    sky.cloudCol.value.copy(hor).multiplyScalar(this.night ? 0.6 : 0.95 - w.cloud * 0.25);
    sky.stars.value = this.night ? 1 : 0;
    // Nebel
    const fogC = hor.clone().multiplyScalar(0.92);
    g.scene.fog = new THREE.FogExp2(fogC, w.fog * (this.night ? 1.3 : 1) * (g.q.name === 'minimal' ? 1.4 : 1));
    this.fogBase = g.scene.fog.density;
    g.renderer.setClearColor(fogC);
    // Lichter
    g.sun.color.setRGB(1, 0.92 - warm * 0.2, 0.82 - warm * 0.35);
    g.sun.intensity = this.night ? 0.22 : clamp(day, 0.1, 1) * 2.6 * (1 - w.cloud * 0.55) * L;
    g.sun.color.multiplyScalar(this.night ? 1 : 1);
    if (this.night) g.sun.color.setRGB(0.55, 0.65, 0.9);
    g.hemi.color.setRGB(lerp(0.12, 0.75, day) * L, lerp(0.14, 0.8, day) * L, lerp(0.22, 0.9, day) * L);
    g.hemi.groundColor.setRGB(lerp(0.04, 0.32, day), lerp(0.04, 0.3, day), lerp(0.05, 0.24, day));
    g.hemi.intensity = this.night ? 0.55 : 0.9 + w.cloud * 0.35;
    g.renderer.toneMappingExposure = this.night ? 1.25 : 1.0;
    this.visibility = clamp(2.6 / Math.max(0.001, g.scene.fog.density) * 0.33, 70, 420) * (this.night ? 0.32 : 1);
    this.particleLight = this.night ? 0.25 : clamp(day, 0.3, 1) * L;
    // Wind
    const wa = rand() * Math.PI * 2;
    g.effects.wind.set(Math.cos(wa) * w.wind, 0, Math.sin(wa) * w.wind);
    // Regen
    if (w.rain > 0) this.makeRain(w.rain);
    // Suchscheinwerfer bei Nacht
    if (this.night && this.amb.flak) for (let i = 0; i < 3; i++) this.makeSearchlight(new THREE.Vector3((rand() - 0.5) * 700, 0, (rand() - 0.5) * 700));
    // Klangteppich
    const A = g.audio;
    A.setLoop('wind', 0.05 + w.wind * 0.012, 300 + w.wind * 40);
    A.setLoop('rain', w.rain * 0.18);
    A.setLoop('surf', this.amb.surf || g.world.def.sea ? 0.22 : 0);
  }

  makeRain(k) {
    const n = Math.round(1800 * k * this.g.q.particles);
    const pos = new Float32Array(n * 6);
    this.rainN = n;
    for (let i = 0; i < n; i++) { const x = (rand() - 0.5) * 60, y = rand() * 30, z = (rand() - 0.5) * 60; pos.set([x, y, z, x, y - 0.6, z], i * 6); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x9aa4ae, transparent: true, opacity: 0.35 }));
    this.rain.frustumCulled = false;
    this.g.scene.add(this.rain);
  }

  makeSearchlight(p) {
    const geo = new THREE.ConeGeometry(14, 600, 16, 1, true);
    geo.translate(0, -300, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0xbfc8d8, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    const m = new THREE.Mesh(geo, mat);
    p.y = this.g.world.h(p.x, p.z) + 1;
    m.position.copy(p);
    this.g.scene.add(m);
    this.searchlights.push({ m, a: rand() * 6, s: 0.1 + rand() * 0.15 });
  }

  // ------------------------------------------------------------ Gefechtskulisse
  battleCenter() {
    const g = this.g;
    return g.missions && g.missions.focus ? g.missions.focus : g.camera.position;
  }

  update(dt) {
    const g = this.g;
    this.t += dt;
    const cam = g.camera.position;
    const host = !g.net || g.net.isHost;
    const T0 = this.timers;
    // Regen folgt der Kamera
    if (this.rain) {
      const p = this.rain.geometry.attributes.position, a = p.array;
      const vy = 9, vx = g.effects.wind.x * 0.35, vz = g.effects.wind.z * 0.35;   // m/s (Regentropfen ~9 m/s)
      const len = 0.55 / vy;
      for (let i = 0; i < this.rainN; i++) {
        const o = i * 6;
        a[o] += vx * dt; a[o + 1] -= vy * dt; a[o + 2] += vz * dt;
        if (a[o + 1] < cam.y - 4 || Math.abs(a[o] - cam.x) > 32 || Math.abs(a[o + 2] - cam.z) > 32) { a[o] = cam.x + (rand() - 0.5) * 60; a[o + 1] = cam.y + 8 + rand() * 20; a[o + 2] = cam.z + (rand() - 0.5) * 60; }
        a[o + 3] = a[o] - vx * len; a[o + 4] = a[o + 1] + vy * len; a[o + 5] = a[o + 2] - vz * len;
      }
      p.needsUpdate = true;
    }
    for (const s of this.searchlights) { s.a += dt * s.s; s.m.rotation.set(0.45 + Math.sin(s.a * 1.3) * 0.25, s.a, 0, 'YXZ'); s.m.rotation.x = Math.PI + 0.5 + Math.sin(s.a * 1.3) * 0.3; s.m.rotation.z = Math.sin(s.a) * 0.6; }
    // Sichtweite: Leuchtkugeln erhellen die Nacht
    if (this.night) {
      let lit = 0;
      for (const f of g.effects.flares) if (Math.hypot(f.x - cam.x, f.z - cam.z) < 250) lit = 1;
      this.visibility = lit ? 160 : 75;
    }

    // Ferner Gefechtslärm: Gewehrschüsse, MG-Feuerstöße und MP-Salven aus wechselnden Richtungen
    T0.small = (T0.small ?? 1) - dt;
    if (T0.small <= 0) {
      const busy = 0.4 + (this.amb.arty || 0.3);
      T0.small = (0.25 + rand() * 1.6) / busy;
      if (!this.front || rand() < 0.05) this.front = rand() * Math.PI * 2;   // Hauptrichtung des fernen Gefechts
      const a = this.front + (rand() - 0.5) * 2.2, d = 250 + rand() * 650;
      const p = new THREE.Vector3(cam.x + Math.cos(a) * d, cam.y, cam.z + Math.sin(a) * d);
      const r = rand();
      const de = rand() < 0.5;
      if (r < 0.22) {   // MG-Feuerstoß
        const n = 5 + (rand() * 14 | 0), iv = de ? 0.05 : 0.11;
        for (let i = 0; i < n; i++) g.audio.play(de ? 'mg42' : 'rifle', p, 0.55, 0.95 + rand() * 0.08, { far: 1400, delay: i * iv, verb: true });
      } else if (r < 0.35) {
        const n = 3 + (rand() * 6 | 0);
        for (let i = 0; i < n; i++) g.audio.play(de ? 'smg9' : 'smg45', p, 0.45, 1, { far: 1100, delay: i * 0.1 });
      } else g.audio.play(rand() < 0.5 ? 'rifle' : 'carbine', p, 0.6, 0.9 + rand() * 0.15, { far: 1400 });
    }

    // Ferne Artillerie: Mündungsblitze am Horizont, Grollen
    T0.distant -= dt;
    if (T0.distant <= 0) {
      T0.distant = 1.5 + rand() * 5;
      const a = rand() * Math.PI * 2, d = 900 + rand() * 1200;
      const p = new THREE.Vector3(cam.x + Math.cos(a) * d, 5, cam.z + Math.sin(a) * d);
      g.effects.glow.spawn({ x: p.x, y: p.y + 40, z: p.z, vx: 0, vy: 0, vz: 0, age: 0, life: 0.25, s0: 120, s1: 160, a: this.night ? 0.5 : 0.12, c: [1, 0.7, 0.4], r: 0 });
      g.audio.play(rand() < 0.5 ? 'boom' : 'boomBig', p, 0.9, 0.6 + rand() * 0.2, { far: 3000 });
    }

    // Flugzeuge
    T0.planes -= dt;
    if (T0.planes <= 0 && this.amb.planes) {
      T0.planes = this.amb.planes === 'c47' ? 20 + rand() * 25 : 35 + rand() * 50;
      this.flyover(this.amb.planes);
    }
    this.updatePlanes(dt);

    // Flak-Leuchtspur in den Nachthimmel
    if (this.amb.flak) {
      T0.flak -= dt;
      if (T0.flak <= 0) {
        T0.flak = 0.07 + rand() * 0.12;
        const tg = Object.values(g.world.targets).filter((t) => t.kind === 'flak' && !t.destroyed);
        const src = tg.length && rand() < 0.6 ? tg[(rand() * tg.length) | 0].pos : new THREE.Vector3(cam.x + (rand() - 0.5) * 900, 0, cam.z + (rand() - 0.5) * 900);
        const o = src.clone(); o.y = g.world.h(o.x, o.z) + 1.5;
        const pl = this.planes.length ? this.planes[(rand() * this.planes.length) | 0] : null;
        const d = pl ? pl.m.position.clone().sub(o).normalize() : new THREE.Vector3((rand() - 0.5) * 0.6, 1, (rand() - 0.5) * 0.6).normalize();
        d.x += (rand() - 0.5) * 0.1; d.z += (rand() - 0.5) * 0.1; d.normalize();
        g.combat.bullets.push({ x: o.x, y: o.y, z: o.z, vx: d.x * 900, vy: d.y * 900, vz: d.z * 900, life: 2.2, dmg: 0, range: 2000, owner: { team: 'de', flak: true }, auth: false, tracer: true, dist: 30, cracked: true, wid: 'flak' });
        if (rand() < 0.25) g.audio.play('flak', o, 0.5, 1, { far: 1500 });
        if (rand() < 0.15) { // Sprengpunkte am Himmel
          const p = o.clone().addScaledVector(d, 150 + rand() * 250);
          g.effects.fire.spawn({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0, vz: 0, age: 0, life: 0.15, s0: 4, s1: 6, a: 1, c: [1, 0.8, 0.5], r: 0 });
          g.effects.puff(p.x, p.y, p.z, { life: 5, s0: 2, s1: 6, a: 0.5, c: [0.15, 0.15, 0.15], rise: 0, wind: 1 });
        }
      }
    }
    // Leuchtkugeln
    if (this.amb.flares && this.night) {
      T0.flare -= dt;
      if (T0.flare <= 0) { T0.flare = 15 + rand() * 20; const a = rand() * Math.PI * 2, d = 60 + rand() * 200; g.effects.flare(cam.x + Math.cos(a) * d, 140 + rand() * 40, cam.z + Math.sin(a) * d); }
    }
    if (!host) return;   // Einschläge mit Schaden rechnet nur der Host
    const C = this.battleCenter();
    // Feldartillerie
    if (this.amb.arty) {
      T0.arty -= dt;
      if (T0.arty <= 0) {
        T0.arty = (6 + rand() * 12) / this.amb.arty;
        const n = 1 + (rand() * 3 | 0);
        const a = rand() * Math.PI * 2, d = 50 + rand() * 260;
        for (let i = 0; i < n; i++) this.impact(C.x + Math.cos(a) * d + (rand() - 0.5) * 40, C.z + Math.sin(a) * d + (rand() - 0.5) * 40, rand() < 0.3 ? 4 : 3, 1.5 + i * 0.6 + rand(), 'arty');
      }
    }
    if (this.amb.mortars) {
      T0.mortar -= dt;
      if (T0.mortar <= 0) { T0.mortar = 8 + rand() * 14; const a = rand() * Math.PI * 2, d = 35 + rand() * 160; for (let i = 0; i < 3; i++) this.impact(C.x + Math.cos(a) * d + (rand() - 0.5) * 25, C.z + Math.sin(a) * d + (rand() - 0.5) * 25, 2, 1.5 + i * 1.2, 'mortar'); }
    }
    // Schiffsartillerie (Schlachtschiffe vor der Küste) auf Steilhang / Plateau
    if (this.amb.naval) {
      T0.naval -= dt;
      if (T0.naval <= 0) {
        T0.naval = 7 + rand() * 12;
        const x = (rand() - 0.5) * 700, z = -40 + rand() * 260;
        // Mündungsblitze der Flotte am Horizont
        const sx = (rand() - 0.5) * 3000, sz = -2200 - rand() * 800;
        g.effects.glow.spawn({ x: sx, y: 20, z: sz, vx: 0, vy: 0, vz: 0, age: 0, life: 0.3, s0: 90, s1: 140, a: 0.45, c: [1, 0.75, 0.45], r: 0 });
        if (Math.hypot(x - g.camera.position.x, z - g.camera.position.z) > 70) this.impact(x, z, 6, 3.5, 'naval');
      }
    }
    // Bombenteppich (Operation Cobra): Einschläge südlich der Straße in den ersten 45 Sekunden
    if (this.amb.carpet && this.t < 45) {
      T0.carpet = (T0.carpet ?? 0) - dt;
      if (T0.carpet <= 0) {
        T0.carpet = 0.22;
        const x = (rand() - 0.5) * 860, z = 150 + rand() * 290;
        const m = g.world.anchors.marigny;
        if (!m || Math.hypot(x - m.x, z - m.z) > 70) this.impact(x, z, 4, 1 + rand(), 'support', { team: 'us', support: true });
      }
    }
    // Nebelwerfer-Salve
    if (this.amb.nebelwerfer) {
      T0.nw -= dt;
      if (T0.nw <= 0) { T0.nw = 50 + rand() * 50; this.nebelwerfer(C, 'us'); }
    }
  }

  // Einschlag mit Pfeifen; Host verteilt an Mitspieler
  impact(x, z, size, delay, kind, owner = { team: 'none' }) {
    const g = this.g;
    const p = new THREE.Vector3(x, 0, z);
    // nicht direkt in der eigenen Startzone der ersten Minute
    if (g.time < 25 && kind !== 'support') { for (const sp of g.missions.spawnZones()) if (Math.hypot(x - sp.x, z - sp.z) < 60) return; }
    g.combat.shell(p, size, delay, owner, true);
    if (g.net && g.net.isHost) g.net.send({ t: 'sh', p: [Math.round(x), Math.round(z)], s: size, d: delay });
  }

  nebelwerfer(C, targetTeam) {
    const g = this.g;
    // Raketen fliegen sichtbar mit Rauchschweif aus Süden herein (Heulen: „Stuka zu Fuß“)
    const cx = C.x + (rand() - 0.5) * 200, cz = C.z + (rand() - 0.5) * 200;
    g.audio.play('mimi', new THREE.Vector3(cx, 60, cz + 300), 0.9, 1, { far: 2000, noDelay: true, important: true });
    for (let i = 0; i < 6; i++) {
      const from = new THREE.Vector3(cx + 300 + i * 4, 60, cz + 900);
      const to = new THREE.Vector3(cx + (rand() - 0.5) * 50, 0, cz + (rand() - 0.5) * 50);
      this.rocketTrail(from, to, 3.2 + i * 0.25);
      this.impact(to.x, to.z, 3, 3.2 + i * 0.25, 'nw', { team: 'de' });
    }
    if (g.player.team === 'us') g.radio(T('Nebelwerfer! In Deckung!', 'Screaming Mimis! Take cover!'), T('Zugführer', 'Platoon leader'), true);
  }

  rocketTrail(from, to, t) {
    (this.trails || (this.trails = [])).push({ from, to, t: 0, dur: t });
  }

  // ------------------------------------------------------------ Flugzeuge
  flyover(kind) {
    const g = this.g, cam = g.camera.position;
    const a = rand() * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const n = kind === 'c47' ? 6 + (rand() * 4 | 0) : 2 + (rand() * 2 | 0);
    const alt = kind === 'c47' ? 160 + rand() * 60 : 120 + rand() * 120;
    const start = cam.clone().addScaledVector(dir, -1400).add(new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar((rand() - 0.5) * 500));
    for (let i = 0; i < n; i++) {
      const m = buildPlane(kind === 'c47' ? 'c47' : 'p47');
      const row = Math.floor((i + 1) / 2), side = i % 2 ? 1 : -1;
      const off = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(side * row * 40).addScaledVector(dir, -row * 50);
      m.position.copy(start).add(off); m.position.y = alt + (rand() - 0.5) * 10;
      m.lookAt(m.position.clone().add(dir)); m.rotateY(Math.PI);
      g.scene.add(m);
      this.planes.push({ m, v: dir.clone().multiplyScalar(kind === 'c47' ? 62 : 110), life: 3000 / (kind === 'c47' ? 62 : 110), kind, drop: kind === 'c47' && g.op.id === 'drop' && rand() < 0.6, dropT: 8 + rand() * 15 });
    }
  }

  updatePlanes(dt) {
    const g = this.g, cam = g.camera.position;
    let near = 1e9, nearP = null;
    for (let i = this.planes.length - 1; i >= 0; i--) {
      const p = this.planes[i];
      p.m.position.addScaledVector(p.v, dt);
      p.life -= dt;
      const d = p.m.position.distanceTo(cam);
      if (d < near) { near = d; nearP = p; }
      // Fallschirmjäger springen ab (nur Kulisse)
      if (p.drop && Math.hypot(p.m.position.x, p.m.position.z) < 380) {
        p.dropT -= dt;
        if (p.dropT < 0 && p.dropT > -3 && rand() < dt * 4) g.missions.decorChute && g.missions.decorChute(p.m.position);
      }
      if (p.life <= 0) { g.scene.remove(p.m); this.planes.splice(i, 1); }
    }
    if (nearP) {
      const rel = nearP.m.position.clone().sub(cam);
      const vr = -rel.dot(nearP.v) / (rel.length() || 1);
      const dop = 1 + vr / 343 * 0.8;
      g.audio.setEngine('plane', clamp(260 / (near + 40), 0, 0.6), dop * (nearP.kind === 'c47' ? 1 : 1.4), 0);
    } else g.audio.setEngine('plane', 0);
    // Raketenschweife
    if (this.trails) for (let i = this.trails.length - 1; i >= 0; i--) {
      const r = this.trails[i];
      r.t += dt;
      const k = Math.min(1, r.t / r.dur);
      const x = lerp(r.from.x, r.to.x, k), z = lerp(r.from.z, r.to.z, k);
      const y = lerp(r.from.y, g.world.h(r.to.x, r.to.z), k) + Math.sin(k * Math.PI) * 120;
      g.effects.puff(x, y, z, { life: 5, s0: 1, s1: 4, a: 0.5, c: [0.7, 0.7, 0.68], rise: 0.1 });
      g.effects.spark(x, y, z, { life: 0.06, s0: 1.5, s1: 0.5 });
      if (k >= 1) this.trails.splice(i, 1);
    }
    // Tankmotor
    let td = 1e9;
    for (const t of g.units.tanks) if (t.alive) td = Math.min(td, t.pos.distanceTo(cam));
    g.audio.setEngine('tank', clamp(30 / (td + 10), 0, 0.5), 1, 0);
  }

  // ------------------------------------------------------------ Unterstützung per Funk
  // kind: 'arty' | 'air' | 'smoke' | 'nw'; p: Zielpunkt; team: anfordernde Seite
  support(kind, p, team) {
    const g = this.g;
    const owner = { team, support: true };
    if (kind === 'arty') {
      for (let i = 0; i < 8; i++) this.impact(p.x + (rand() - 0.5) * 50, p.z + (rand() - 0.5) * 50, 4, 7 + i * 0.7 + rand(), 'support', owner);
    } else if (kind === 'nw') {
      this.nebelwerferAt(p, owner);
    } else if (kind === 'smoke') {
      for (let i = 0; i < 5; i++) setTimeout(() => { if (!g.world) return; const sx = p.x + (rand() - 0.5) * 40, sz = p.z + (rand() - 0.5) * 40; const sp = new THREE.Vector3(sx, g.world.h(sx, sz), sz); g.effects.smokeGrenade(sp.x, sp.y, sp.z); g.addSmoke(sp); }, 6000 + i * 500);
      if (g.net && g.net.isHost) g.net.send({ t: 'smk', p: [p.x, p.z] });
    } else if (kind === 'air') {
      // P-47 im Tiefflug: Bordwaffen + zwei 500-lb-Bomben
      const dir = new THREE.Vector3(rand() - 0.5, 0, rand() - 0.5).normalize();
      const m = buildPlane('p47');
      const start = p.clone().addScaledVector(dir, -1300); start.y = 160;
      m.position.copy(start); m.lookAt(start.clone().add(dir)); m.rotateY(Math.PI);
      g.scene.add(m);
      const pl = { m, v: dir.clone().multiplyScalar(130), life: 22, kind: 'p47', strafe: p.clone(), owner, done: false };
      this.planes.push(pl);
      const tHit = 1300 / 130;
      for (let i = 0; i < 14; i++) this.impact(p.x - dir.x * (60 - i * 8) + (rand() - 0.5) * 6, p.z - dir.z * (60 - i * 8) + (rand() - 0.5) * 6, 1, tHit - 0.6 + i * 0.06, 'support', owner);
      this.impact(p.x + (rand() - 0.5) * 10, p.z + (rand() - 0.5) * 10, 5, tHit + 0.8, 'support', owner);
      this.impact(p.x + dir.x * 25, p.z + dir.z * 25, 5, tHit + 1.0, 'support', owner);
      if (g.net && g.net.isHost) g.net.send({ t: 'air', p: [p.x, p.z], d: [dir.x, dir.z] });
    }
  }

  nebelwerferAt(p, owner) {
    for (let i = 0; i < 6; i++) {
      const to = new THREE.Vector3(p.x + (rand() - 0.5) * 45, 0, p.z + (rand() - 0.5) * 45);
      this.rocketTrail(new THREE.Vector3(p.x + 300, 60, p.z + 900), to, 5 + i * 0.3);
      this.impact(to.x, to.z, 3, 5 + i * 0.3, 'support', owner);
    }
    this.g.audio.play('mimi', p.clone().setY(80), 0.9, 1, { far: 2000, noDelay: true, important: true });
  }

  // Mitspieler: Darstellung eines vom Host gemeldeten Luftangriffs
  airVisual(p, d) {
    const g = this.g;
    const dir = new THREE.Vector3(d[0], 0, d[1]);
    const m = buildPlane('p47');
    const start = new THREE.Vector3(p[0], 160, p[1]).addScaledVector(dir, -1300);
    m.position.copy(start); m.lookAt(start.clone().add(dir)); m.rotateY(Math.PI);
    g.scene.add(m);
    this.planes.push({ m, v: dir.clone().multiplyScalar(130), life: 22, kind: 'p47' });
  }

  dispose() {
    for (const p of this.planes) this.g.scene.remove(p.m);
    for (const s of this.searchlights) this.g.scene.remove(s.m);
    if (this.rain) this.g.scene.remove(this.rain);
    this.g.audio.setEngine('plane', 0); this.g.audio.setEngine('tank', 0);
  }
}
