// Welt: Gelände, Bocage (Felder + Wallhecken), Orte, Befestigungen, Wasser, Kollision, Sichtlinien, Wegfindung.
import * as THREE from './lib/three.module.min.js';
import { makeNoise } from './noise.js';
import { makeRng, clamp, segDist, smoothstep } from './util.js';
import { MAPS } from './maps.js';
import { tex, mergeColored, M4 } from './gfx.js';
import {
  initMaterials, MAT, buildHouse, buildChurch, buildBunker, buildSandbags, buildRuin, buildGun,
  hedgehogGeo, stakeGeo, wireGeo, buildFlagpole,
} from './models.js';

export const SIZE = 900, HALF = 450;
const HASH = 20;   // Zellgröße des Kollisions-Rasters
const NAV = 3;     // Zellgröße des Wegfindungs-Rasters

export class World {
  constructor(scene, mapId, q) {
    initMaterials();
    this.scene = scene;
    this.id = mapId;
    this.def = MAPS[mapId];
    this.q = q;
    this.rng = makeRng(this.def.seed);
    this.noise = makeNoise(this.def.seed);
    this.group = new THREE.Group();
    scene.add(this.group);
    this.boxes = [];
    this.hash = new Map();
    this.targets = {};
    this.anchors = {};
    this.ropes = [];
    this.walk = [];          // begehbare Flächen (Brücke, Bunkerdächer): { x0,x1,z0,z1,y }
    this.water = !!(this.def.sea || this.def.flood || this.def.canal);
    this.base = this.water || mapId === 'stlo' ? 0 : 8;
    this.flags = [];
    this.lights = [];
    this.build();
  }

  // ------------------------------------------------------------ Höhe
  rawH(x, z) {
    const d = this.def;
    let h = d.height(x, z, this.noise) + this.base;
    // Straßen leicht einebnen, Hohlwege absenken
    return h;
  }

  buildHeights() {
    const cell = this.q.name === 'minimal' || this.q.name === 'low' ? 4.5 : 3;
    this.cell = cell;
    this.n = Math.round(SIZE / cell);
    const n = this.n + 1;
    this.hgt = new Float32Array(n * n);
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = -HALF + i * cell, z = -HALF + j * cell;
      this.hgt[j * n + i] = this.rawH(x, z);
    }
    // Straßen glätten (Mittelwert entlang des Profils)
    for (const r of this.def.roads || []) {
      if (r.sunken) continue;
      for (let j = 1; j < n - 1; j++) for (let i = 1; i < n - 1; i++) {
        const x = -HALF + i * cell, z = -HALF + j * cell;
        const d = this.roadDist(x, z, r);
        if (d < r.w) {
          const k = j * n + i;
          const avg = (this.hgt[k - 1] + this.hgt[k + 1] + this.hgt[k - n] + this.hgt[k + n] + this.hgt[k] * 2) / 6;
          this.hgt[k] = this.hgt[k] * 0.4 + avg * 0.6 - 0.05;
        }
      }
    }
  }

  h(x, z) {
    const c = this.cell, n = this.n + 1;
    const fx = clamp((x + HALF) / c, 0, this.n - 0.001), fz = clamp((z + HALF) / c, 0, this.n - 0.001);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    const a = this.hgt[j * n + i], b = this.hgt[j * n + i + 1], cc = this.hgt[(j + 1) * n + i], d = this.hgt[(j + 1) * n + i + 1];
    // gleiche Dreiecksteilung wie PlaneGeometry
    if (u + v <= 1) return a + (b - a) * u + (cc - a) * v;
    return d + (cc - d) * (1 - u) + (b - d) * (1 - v);
  }

  // Bodenhöhe inkl. begehbarer Bauten (Brücke, Bunkerdach) – y: aktuelle Fußhöhe
  groundAt(x, z, y = 1e9) {
    let g = this.h(x, z);
    for (const w of this.walk) if (x > w.x0 && x < w.x1 && z > w.z0 && z < w.z1 && y > w.y - 1.2 && w.y > g) g = w.y;
    return g;
  }

  waterDepth(x, z) { return this.water ? Math.max(0, -this.h(x, z)) : 0; }

  normal(x, z, out = new THREE.Vector3()) {
    const e = 1.5;
    return out.set(this.h(x - e, z) - this.h(x + e, z), 2 * e, this.h(x, z - e) - this.h(x, z + e)).normalize();
  }

  roadDist(x, z, r) {
    let d = 1e9;
    const p = r.pts;
    for (let k = 0; k < p.length - 1; k++) d = Math.min(d, segDist(x, z, p[k][0], p[k][1], p[k + 1][0], p[k + 1][1]));
    return d;
  }
  nearRoad(x, z, extra = 0) {
    for (const r of this.def.roads || []) if (this.roadDist(x, z, r) < r.w / 2 + extra) return r;
    return null;
  }

  // ------------------------------------------------------------ Aufbau
  build() {
    const d = this.def;
    this.buildHeights();
    for (const [k, [x, z]] of Object.entries(d.anchors)) this.anchors[k] = new THREE.Vector3(x, this.h(x, z), z);
    this.towns = (d.towns || []).map((t) => ({ ...t }));
    this.buildFields();
    this.buildTowns();
    this.buildFeatures();
    this.buildHedges();
    this.buildTerrainMesh();
    if (this.water) this.buildWater();
    this.buildNav();
    this.buildMinimap();
  }

  // Felder: unregelmäßiges Raster mit versetzten Spalten
  buildFields() {
    const rng = this.rng;
    const cols = [];
    let x = -HALF;
    while (x < HALF) {
      const w = 55 + rng() * 60;
      const zs = [-HALF];
      let z = -HALF;
      while (z < HALF) { z += 45 + rng() * 60; zs.push(Math.min(z, HALF)); }
      cols.push({ x0: x, x1: Math.min(x + w, HALF), zs, crops: zs.map(() => rng()), skew: (rng() - 0.5) * 0.12 });
      x += w;
    }
    this.cols = cols;
  }
  fieldAt(x, z) {
    for (const c of this.cols) if (x < c.x1) {
      const zz = z + (x - c.x0) * c.skew;
      for (let k = 1; k < c.zs.length; k++) if (zz < c.zs[k]) return c.crops[k - 1];
      return c.crops[c.crops.length - 1];
    }
    return 0.5;
  }

  inClear(x, z, extra = 0) {
    const d = this.def;
    for (const [cx, cz, r] of d.clear || []) if (Math.hypot(x - cx, z - cz) < r + extra) return true;
    for (const t of this.towns) if (Math.hypot(x - t.x, z - t.z) < t.r + extra) return true;
    for (const f of d.farms || []) if (Math.hypot(x - f.x, z - f.z) < (f.manor ? 42 : 30) + extra) return true;
    for (const r of d.ruins || []) if (Math.hypot(x - r.x, z - r.z) < r.r + extra) return true;
    if (d.noHedge && d.noHedge(x, z)) return true;
    if (this.water && this.h(x, z) < 0.6) return true;
    return false;
  }

  addBox(b) {
    if (b.y0 === undefined) { b.y0 = this.h(b.x, b.z) - 1; }
    const c = Math.cos(b.rot || 0), s = Math.sin(b.rot || 0);
    b.c = c; b.s = s;
    const ex = Math.abs(c) * b.hw + Math.abs(s) * b.hd, ez = Math.abs(s) * b.hw + Math.abs(c) * b.hd;
    b.ex = ex; b.ez = ez;
    this.boxes.push(b);
    for (let i = Math.floor((b.x - ex + HALF) / HASH); i <= Math.floor((b.x + ex + HALF) / HASH); i++)
      for (let j = Math.floor((b.z - ez + HALF) / HASH); j <= Math.floor((b.z + ez + HALF) / HASH); j++) {
        const k = i * 1000 + j;
        if (!this.hash.has(k)) this.hash.set(k, []);
        this.hash.get(k).push(b);
      }
    return b;
  }

  query(x, z, r, out = []) {
    out.length = 0;
    const seen = this._seen || (this._seen = new Set());
    seen.clear();
    for (let i = Math.floor((x - r + HALF) / HASH); i <= Math.floor((x + r + HALF) / HASH); i++)
      for (let j = Math.floor((z - r + HALF) / HASH); j <= Math.floor((z + r + HALF) / HASH); j++) {
        const l = this.hash.get(i * 1000 + j);
        if (l) for (const b of l) if (!seen.has(b)) { seen.add(b); out.push(b); }
      }
    return out;
  }

  addMesh(m, shadow = true) { m.castShadow = shadow && m.castShadow !== false; m.receiveShadow = true; this.group.add(m); return m; }

  // ------------------------------------------------------------ Hecken (Bocage)
  buildHedges() {
    const rng = this.rng, d = this.def;
    const segs = [];
    const gateW = 7;
    // senkrechte Hecken zwischen den Spalten, waagrechte innerhalb jeder Spalte
    for (let k = 1; k < this.cols.length; k++) {
      const x = this.cols[k].x0;
      const zs = this.cols[k].zs;
      for (let r = 0; r < zs.length - 1; r++) segs.push([x, zs[r], x, zs[r + 1]]);
    }
    for (const c of this.cols) for (let r = 1; r < c.zs.length - 1; r++) {
      const z0 = c.zs[r] - (0 - c.x0) * 0;
      segs.push([c.x0, c.zs[r] - 0 * c.skew, c.x1, c.zs[r] - (c.x1 - c.x0) * c.skew]);
    }
    for (const f of d.features || []) if (f.type === 'hedgeline') segs.push([f.pts[0][0], f.pts[0][1], f.pts[1][0], f.pts[1][1], true]);
    const bank = [], bushes = [], trees = [];
    const density = d.hedge ?? 1;
    for (const [ax, az, bx, bz, forced] of segs) {
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 8) continue;
      const dx = (bx - ax) / len, dz = (bz - az) / len;
      // Tor (Lücke) an zufälliger Stelle, bei langen Hecken zwei
      const gates = [];
      const ng = len > 70 ? 2 : 1;
      for (let g = 0; g < ng; g++) if (forced ? g === 0 && rng() < 0.0 : rng() < 0.9) gates.push(gateW / 2 + 3 + rng() * (len - gateW - 6));
      if (forced) gates.push(len * 0.5);
      const step = 6;
      for (let t = 0; t < len - 0.5; t += step) {
        const t1 = Math.min(len, t + step), tm = (t + t1) / 2;
        if (gates.some((g) => Math.abs(tm - g) < gateW / 2 + 1)) continue;
        const mx = ax + dx * tm, mz = az + dz * tm;
        if (Math.abs(mx) > HALF - 2 || Math.abs(mz) > HALF - 2) continue;
        if (!forced && (this.inClear(mx, mz) || this.nearRoad(mx, mz, 2.5))) continue;
        if (!forced && rng() > density + 0.15) continue;
        const sl = t1 - t;
        const hy = this.h(mx, mz);
        const ry = Math.atan2(dx, dz);
        bank.push({ geo: new THREE.BoxGeometry(1.8, 2.0, sl + 0.4), color: 0x5a5a38, matrix: M4(mx, hy + 0.35, mz, ry), shade: null });
        this.addBox({ x: mx, z: mz, hw: 0.95, hd: sl / 2 + 0.2, rot: ry, y0: hy - 1, y1: hy + 2.9, kind: 'hedge' });
        // Büsche auf dem Wall
        for (let b = 0; b < sl; b += this.q.trees >= 1 ? 2.1 : 3.2) {
          const bx2 = ax + dx * (t + b) + (rng() - 0.5) * 0.5, bz2 = az + dz * (t + b) + (rng() - 0.5) * 0.5;
          bushes.push([bx2, this.h(bx2, bz2) + 1.6 + rng() * 0.4, bz2, 0.9 + rng() * 0.8, rng()]);
        }
        if (rng() < 0.32 * this.q.trees) {
          const tx = mx + (rng() - 0.5) * 3 * dx, tz = mz + (rng() - 0.5) * 3 * dz;
          trees.push([tx, this.h(tx, tz) + 1.2, tz, 0.8 + rng() * 0.5, rng()]);
        }
      }
    }
    // Obstbäume / Wäldchen
    for (const f of d.features || []) if (f.type === 'orchard') {
      for (let i = 0; i < f.w; i += 8) for (let j = 0; j < f.d; j += 8) {
        const x = f.x - f.w / 2 + i + rng() * 2, z = f.z - f.d / 2 + j + rng() * 2;
        trees.push([x, this.h(x, z), z, 0.45 + rng() * 0.15, rng(), true]);
      }
    }
    if (bank.length) {
      const m = new THREE.Mesh(mergeColored(bank), new THREE.MeshLambertMaterial({ vertexColors: true, map: tex('grass') }));
      // UVs für Detailtextur fehlen bei mergeColored – Weltkoordinaten-Projektion im Shader
      m.material.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvW = (modelMatrix*vec4(position,1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vW;').replace('#include <map_fragment>', 'diffuseColor.rgb *= texture2D(map, (vW.xz + vW.yy) * 0.35).rgb * 1.5;');
      };
      m.receiveShadow = true; m.castShadow = true;
      this.group.add(m);
    }
    this.addFoliage(bushes, trees);
  }

  addFoliage(bushes, trees) {
    const leafMat = new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: false });
    const bushGeo = new THREE.IcosahedronGeometry(1, this.q.trees >= 1 ? 1 : 0);
    // leicht verformen, damit die Büsche nicht wie Kugeln wirken
    const p = bushGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = 0.82 + ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 * 0.36; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.8, p.getZ(i) * k); }
    bushGeo.computeVertexNormals();
    const night = false;
    const mk = (geo, list, scaleFn, colorFn, shadow) => {
      if (!list.length) return null;
      const im = new THREE.InstancedMesh(geo, leafMat, list.length);
      const m = new THREE.Matrix4(), c = new THREE.Color();
      list.forEach((b, i) => { m.copy(scaleFn(b)); im.setMatrixAt(i, m); im.setColorAt(i, colorFn(b, c)); });
      im.castShadow = shadow; im.receiveShadow = true;
      im.instanceMatrix.needsUpdate = true;
      this.group.add(im);
      return im;
    };
    mk(bushGeo, bushes, (b) => M4(b[0], b[1], b[2], b[4] * 6, 0, 0, b[3] * 1.2), (b, c) => c.setRGB(0.16 + b[4] * 0.08, 0.26 + b[4] * 0.1, 0.09), this.q.shadows > 0);
    // Bäume: Stamm + 2–3 Kronen
    const trunks = [], crowns = [];
    for (const t of trees) {
      const s = t[3], small = t[5];
      trunks.push([t[0], t[1], t[2], s, small]);
      const H = small ? 2.6 : 7 * s;
      crowns.push([t[0], t[1] + H, t[2], (small ? 2.2 : 3.6) * s * (small ? 2 : 1), t[4]]);
      if (!small) {
        crowns.push([t[0] + 1.6 * s, t[1] + H - 1.4, t[2] + 0.8, 2.8 * s, t[4] * 0.7]);
        crowns.push([t[0] - 1.4 * s, t[1] + H - 0.8, t[2] - 1.1, 2.6 * s, t[4] * 0.4]);
      }
    }
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 1, 6); trunkGeo.translate(0, 0.5, 0);
    const tm = new THREE.InstancedMesh(trunkGeo, new THREE.MeshLambertMaterial({ color: 0x4a3c2c }), Math.max(1, trunks.length));
    trunks.forEach((t, i) => { const H = t[4] ? 2.6 : 7 * t[3]; tm.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(t[0], t[1] - 0.5, t[2]), new THREE.Quaternion(), new THREE.Vector3(t[3] * (t[4] ? 0.7 : 1.2), H + 0.5, t[3] * (t[4] ? 0.7 : 1.2)))); });
    tm.count = trunks.length; tm.castShadow = true; this.group.add(tm);
    mk(bushGeo, crowns, (b) => M4(b[0], b[1], b[2], b[4] * 5, 0, 0, b[3]), (b, c) => c.setRGB(0.13 + b[4] * 0.08, 0.22 + b[4] * 0.1, 0.07), this.q.shadows > 0);
    this.treeTrunks = trees;
    for (const t of trees) if (!t[5]) this.addBox({ x: t[0], z: t[2], hw: 0.35 * t[3] + 0.1, hd: 0.35 * t[3] + 0.1, rot: 0, y0: t[1] - 2, y1: t[1] + 7 * t[3], kind: 'tree' });
  }

  // ------------------------------------------------------------ Orte
  placeHouse(x, z, ry, rng, opt = {}) {
    const w = opt.w || 7 + rng() * 5, dd = opt.d || 6 + rng() * 3, floors = opt.floors || (rng() < 0.5 ? 2 : 1);
    // Überlappung prüfen
    const r = Math.hypot(w, dd) / 2 + 1.5;
    for (const b of this.query(x, z, r + 8)) {
      if (b.kind === 'house' || b.kind === 'wall' || b.kind === 'bunker') {
        if (Math.hypot(b.x - x, b.z - z) < r + Math.hypot(b.hw, b.hd)) return null;
      }
    }
    if (this.nearRoad(x, z, Math.max(w, dd) / 2 - 0.5)) return null;
    for (const t of this.towns) if (t.square && Math.abs(x - t.square.x) < t.square.w / 2 + w / 2 && Math.abs(z - t.square.z) < t.square.d / 2 + dd / 2) return null;
    const y = Math.min(this.h(x - w / 2, z - dd / 2), this.h(x + w / 2, z + dd / 2), this.h(x, z)) ;
    const hs = buildHouse(x, z, y, w, dd, floors, ry, { plaster: rng() < 0.25, tiles: rng() < 0.15, shutter: rng.pick([0x5d6e66, 0x6a4a3a, 0x4a5a6a, 0x7a7a6a]), ...opt });
    hs.meshes.forEach((m) => this.addMesh(m));
    hs.boxes.forEach((b) => this.addBox(b));
    return hs;
  }

  buildTowns() {
    const rng = this.rng, d = this.def;
    for (const t of this.towns) {
      if (t.church) this.addChurch(t.church.x, t.church.z, t.church.ry);
      let placed = 0;
      // entlang der Straßen
      for (const r of d.roads || []) {
        for (let k = 0; k < r.pts.length - 1 && placed < t.n; k++) {
          const [ax, az] = r.pts[k], [bx, bz] = r.pts[k + 1];
          const len = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / len, dz = (bz - az) / len;
          for (let s = 0; s < len && placed < t.n; s += 10 + rng() * 6) {
            for (const side of [-1, 1]) {
              const off = r.w / 2 + 5 + rng() * 2;
              const x = ax + dx * s + dz * side * off, z = az + dz * s - dx * side * off;
              if (Math.hypot(x - t.x, z - t.z) > t.r) continue;
              if (rng() < 0.15) continue;
              if (this.placeHouse(x, z, Math.atan2(dx, dz) + Math.PI / 2, rng)) placed++;
            }
          }
        }
      }
      // Rest auffüllen
      for (let tries = 0; tries < 300 && placed < t.n; tries++) {
        const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * t.r;
        const x = t.x + Math.cos(a) * rr, z = t.z + Math.sin(a) * rr;
        if (this.placeHouse(x, z, Math.round(rng() * 4) * Math.PI / 2 + (rng() - 0.5) * 0.1, rng)) placed++;
      }
    }
    for (const c of d.churches || []) this.addChurch(c.x, c.z, c.ry);
    if (d.townhall) {
      const th = d.townhall;
      this.placeHouse(th.x, th.z + 9, th.ry, rng, { w: 14, d: 9, floors: 2, plaster: true, shutter: 0x4a5a6a });
    }
    for (const f of d.farms || []) this.addFarm(f, rng);
    for (const r of d.ruins || []) for (let i = 0; i < r.n; i++) {
      const a = rng() * Math.PI * 2, rr = Math.sqrt(rng()) * r.r;
      const x = r.x + Math.cos(a) * rr, z = r.z + Math.sin(a) * rr;
      const rs = buildRuin(x, z, this.h(x, z), 8 + rng() * 4, 7 + rng() * 3, rng() * 3, rng);
      rs.meshes.forEach((m) => this.addMesh(m)); rs.boxes.forEach((b) => this.addBox(b));
    }
    if (d.ruinsAlong) {
      const ra = d.ruinsAlong;
      for (let i = 0; i < ra.n; i++) {
        const x = ra.x0 + (i + 0.5) * (ra.x1 - ra.x0) / ra.n + (rng() - 0.5) * 20, z = ra.z + 9 + rng() * 6;
        if (Math.abs(x + 185) < 25) continue;
        const rs = i % 2 ? buildRuin(x, z, this.h(x, z), 8, 7, (rng() - 0.5) * 0.2, rng) : buildHouse(x, z, this.h(x, z), 8, 7, 2, (rng() - 0.5) * 0.2, { plaster: true, tiles: false });
        rs.meshes.forEach((m) => this.addMesh(m)); rs.boxes.forEach((b) => this.addBox(b));
      }
    }
    if (d.station) {
      const s = d.station;
      this.placeHouse(s.x, s.z, s.ry, rng, { w: 24, d: 9, floors: 1, plaster: true, tiles: true });
    }
  }

  addChurch(x, z, ry) {
    const c = buildChurch(x, z, this.h(x, z), ry);
    c.meshes.forEach((m) => this.addMesh(m));
    c.boxes.forEach((b) => this.addBox(b));
    this.towers = this.towers || [];
    this.towers.push(c.tower);
  }

  addFarm(f, rng) {
    const c = Math.cos(f.ry), s = Math.sin(f.ry);
    const P = (lx, lz) => [f.x + lx * c + lz * s, f.z - lx * s + lz * c];
    const [hx, hz] = P(0, -10);
    this.placeHouse(hx, hz, f.ry, rng, { w: f.manor ? 16 : 11, d: 8, floors: 2 });
    const [bx, bz] = P(-14, 6);
    this.placeHouse(bx, bz, f.ry + Math.PI / 2, rng, { w: 14, d: 8, floors: 1, tiles: true, chimney: false });
    if (f.manor) { const [cx, cz] = P(14, 6); this.placeHouse(cx, cz, f.ry + Math.PI / 2, rng, { w: 12, d: 7, floors: 1, tiles: true, chimney: false }); }
    // Hofmauer (niedrig, man kann darüber feuern)
    const wall = [];
    const seg = (lx, lz, len, alongX) => {
      const [wx, wz] = P(lx, lz), y = this.h(wx, wz);
      wall.push({ geo: new THREE.BoxGeometry(alongX ? len : 0.6, 1.3, alongX ? 0.6 : len), color: 0xb8b0a0, matrix: M4(wx, y + 0.4, wz, f.ry) });
      this.addBox({ x: wx, z: wz, hw: (alongX ? len : 0.6) / 2, hd: (alongX ? 0.6 : len) / 2, rot: f.ry, y0: y - 1, y1: y + 1.05, kind: 'wall' });
    };
    seg(-12, 20, 16, true); seg(12, 20, 16, true); seg(-22, 8, 22, false); seg(22, 8, 22, false);
    const m = new THREE.Mesh(mergeColored(wall), MAT.vc); m.castShadow = true; m.receiveShadow = true; this.group.add(m);
  }

  // ------------------------------------------------------------ Sonderbauten
  buildFeatures() {
    const rng = this.rng, d = this.def;
    const hh = hedgehogGeo(), stake = stakeGeo();
    const obst = [];
    for (const f of d.features || []) {
      const y = this.h(f.x || 0, f.z || 0);
      switch (f.type) {
        case 'bunker': {
          const b = buildBunker(f.x, f.z, y, f.ry || 0, f.size || 1);
          b.meshes.forEach((m) => this.addMesh(m));
          b.boxes.forEach((bx) => this.addBox(bx));
          this.walk.push({ x0: f.x - 3, x1: f.x + 3, z0: f.z - 2.5, z1: f.z + 2.5, y: y + 3.55 * (f.size || 1) });
          if (f.id) {
            this.targets[f.id] = { id: f.id, kind: 'bunker', pos: new THREE.Vector3(f.x, y + 1.5, f.z), gunPos: b.gunPos, hp: 400, crew: !!f.crew, destroyed: false, meshes: b.meshes };
            this.anchors[f.id] = b.gunPos.clone();
          }
          break;
        }
        case 'flak': case 'gun': {
          const kind = f.type === 'flak' ? 'flak' : f.kind;
          const g = buildGun(kind);
          g.position.set(f.x, y, f.z); g.rotation.y = f.ry || 0;
          this.group.add(g);
          g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
          this.addBox({ x: f.x, z: f.z, hw: 1.2, hd: kind === 'gpf' ? 2.5 : 1.6, rot: f.ry || 0, y0: y - 1, y1: y + 1.6, kind: 'gun' });
          this.targets[f.id] = { id: f.id, kind: f.type === 'flak' ? 'flak' : 'gun', pos: new THREE.Vector3(f.x, y + 1, f.z), hp: 250, crew: !!f.crew, destroyed: false, mesh: g, charge: true };
          if (!this.anchors[f.id]) this.anchors[f.id] = new THREE.Vector3(f.x, y, f.z);
          break;
        }
        case 'mg':
          this.targets[f.id] = { id: f.id, kind: 'mg', pos: new THREE.Vector3(f.x, y + 1, f.z), hp: 1, crew: true, destroyed: false };
          break;
        case 'sandbags': {
          this.addMesh(buildSandbags(f.x, f.z, y, f.r || 2, 1.2, f.ry || 0));
          break;
        }
        case 'wire': case 'wireline': {
          const pieces = [];
          if (f.type === 'wire') pieces.push([f.x, f.z, f.len, f.ry || 0]);
          else for (let x = f.x0; x < f.x1; x += 12) { if (f.skip && x + 12 > f.skip[0] && x < f.skip[1]) continue; pieces.push([x + 6, f.z + (rng() - 0.5) * 2, 12, Math.PI / 2 + (rng() - 0.5) * 0.1]); }
          for (const [x, z, len, ry] of pieces) {
            const wy = this.h(x, z);
            const m = new THREE.Mesh(wireGeo(len), MAT.vc); m.position.set(x, wy, z); m.rotation.y = ry; this.group.add(m);
            const b = this.addBox({ x, z, hw: 0.6, hd: len / 2, rot: ry, y0: wy - 1, y1: wy + 0.95, kind: 'wire', soft: true });
            if (f.type === 'wire') { this.targets[f.id] = { id: f.id, kind: 'wire', pos: new THREE.Vector3(x, wy + 0.5, z), hp: 1, destroyed: false, mesh: m, box: b, charge: true }; }
          }
          break;
        }
        case 'obstacles':
          for (let i = 0; i < f.n; i++) {
            const x = f.x0 + rng() * (f.x1 - f.x0), z = f.z0 + rng() * (f.z1 - f.z0);
            obst.push([x, this.h(x, z), z, rng() * 3, rng() < 0.6 ? 0 : 1]);
            this.addBox({ x, z, hw: 0.8, hd: 0.8, rot: 0, y0: this.h(x, z) - 1, y1: this.h(x, z) + 1.4, kind: 'obstacle', soft: true });
          }
          break;
        case 'trenchline': {
          // Graben: aufgeworfene Brustwehr aus Erde und Sandsäcken
          const parts = [];
          for (let k = 0; k < f.pts.length - 1; k++) {
            const [ax, az] = f.pts[k], [bx, bz] = f.pts[k + 1];
            const len = Math.hypot(bx - ax, bz - az);
            for (let t = 0; t < len; t += 4) {
              const x = ax + (bx - ax) * t / len, z = az + (bz - az) * t / len;
              const ry = Math.atan2(bx - ax, bz - az);
              const ty = this.h(x, z);
              parts.push({ geo: new THREE.BoxGeometry(1.0, 0.7, 4.2), color: 0x6a5a3e, matrix: M4(x - Math.cos(ry) * 0.0, ty + 0.15, z, ry) });
              parts.push({ geo: new THREE.BoxGeometry(0.6, 0.3, 4.0), color: 0x8a7c5c, matrix: M4(x, ty + 0.62, z, ry) });
              this.addBox({ x, z, hw: 0.55, hd: 2.1, rot: ry, y0: ty - 1, y1: ty + 0.8, kind: 'wall' });
            }
          }
          this.addMesh(new THREE.Mesh(mergeColored(parts), MAT.vc));
          break;
        }
        case 'flagpole': {
          const fp = buildFlagpole(f.side);
          fp.position.set(f.x, y, f.z);
          fp.userData.flag.visible = false;
          this.group.add(fp);
          this.flags.push(fp);
          this.targets[f.id] = { id: f.id, kind: 'flag', pos: new THREE.Vector3(f.x, y + 1, f.z), destroyed: false, mesh: fp };
          break;
        }
        case 'ropes':
          for (const [x, z] of f.pts) {
            // Seil von der Klippenkante bis zum Fuß
            let topZ = z;
            while (this.h(x, topZ) < 28 && topZ < z + 30) topZ += 0.5;
            const yb = this.h(x, z), yt = this.h(x, topZ + 1);
            const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, yb, z), new THREE.Vector3(x, yt + 0.5, topZ + 1)]);
            this.group.add(new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xc8b890 })));
            const lad = new THREE.Mesh(new THREE.BoxGeometry(0.5, yt - yb, 0.05), new THREE.MeshLambertMaterial({ color: 0x6a5a40 }));
            lad.position.set(x + 0.5, (yb + yt) / 2, (z + topZ) / 2); lad.rotation.x = Math.atan2(topZ - z, yt - yb);
            this.group.add(lad);
            this.ropes.push({ x, z, yb, yt, topZ: topZ + 2 });
          }
          break;
        case 'bridge': {
          const parts = [];
          const by = 1.35;
          parts.push({ geo: new THREE.BoxGeometry(f.len, 0.5, f.w), color: 0x9a9284, matrix: M4(f.x, by - 0.25, f.z) });
          for (const sz of [-1, 1]) parts.push({ geo: new THREE.BoxGeometry(f.len, 0.9, 0.4), color: 0x8a8274, matrix: M4(f.x, by + 0.45, f.z + sz * (f.w / 2 - 0.2)) });
          parts.push({ geo: new THREE.BoxGeometry(2, 4, f.w - 1), color: 0x8a8274, matrix: M4(f.x, by - 2.4, f.z) });
          const m = new THREE.Mesh(mergeColored(parts), MAT.vc); m.castShadow = m.receiveShadow = true; this.group.add(m);
          this.walk.push({ x0: f.x - f.len / 2, x1: f.x + f.len / 2, z0: f.z - f.w / 2, z1: f.z + f.w / 2, y: by });
          for (const sz of [-1, 1]) this.addBox({ x: f.x, z: f.z + sz * (f.w / 2 - 0.2), hw: f.len / 2, hd: 0.25, rot: 0, y0: by - 0.5, y1: by + 0.9, kind: 'wall' });
          break;
        }
        case 'wreck': {
          const m = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 2.2), new THREE.MeshLambertMaterial({ color: 0x2a2622 }));
          m.position.set(f.x, y + 0.8, f.z); m.rotation.y = 0.4; m.castShadow = true; this.group.add(m);
          this.addBox({ x: f.x, z: f.z, hw: 2, hd: 1.1, rot: 0.4, y0: y - 1, y1: y + 1.6, kind: 'wall' });
          break;
        }
      }
    }
    if (obst.length) {
      const ims = [new THREE.InstancedMesh(hh, MAT.vc, obst.length), new THREE.InstancedMesh(stake, MAT.vc, obst.length)];
      const cnt = [0, 0];
      for (const o of obst) ims[o[4]].setMatrixAt(cnt[o[4]]++, M4(o[0], o[1] - 0.2, o[2], o[3]));
      ims.forEach((im, i) => { im.count = cnt[i]; im.castShadow = true; this.group.add(im); });
    }
    if (d.rail) {
      const parts = [];
      for (const dz of [-0.75, 0.75]) parts.push({ geo: new THREE.BoxGeometry(SIZE, 0.12, 0.1), color: 0x3a3a3a, matrix: M4(0, this.h(0, d.rail.z) + 0.2, d.rail.z + dz) });
      this.addMesh(new THREE.Mesh(mergeColored(parts), MAT.vc), false);
    }
  }

  // ------------------------------------------------------------ Geländemesh mit Vertexfarben
  buildTerrainMesh() {
    const n = this.n, c = this.cell, d = this.def;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, n, n);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position, cols = new Float32Array(pos.count * 3), uv = geo.attributes.uv;
    const col = new THREE.Color();
    const crops = [new THREE.Color(0x4f7030), new THREE.Color(0x5d7a34), new THREE.Color(0x7c8a3c), new THREE.Color(0x6b5a3c), new THREE.Color(0x8e8a4c), new THREE.Color(0x587236)];
    const road = new THREE.Color(0x7f7462), sand = new THREE.Color(0xb4a27e), wet = new THREE.Color(0x7e6f58), mud = new THREE.Color(0x4f4a34), cobble = new THREE.Color(0x77736a), rock = new THREE.Color(0x857e70), marsh = new THREE.Color(0x4c5a34);
    const N = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const gi = Math.round((x + HALF) / c), gj = Math.round((z + HALF) / c);
      const y = this.hgt[gj * (n + 1) + gi];
      pos.setY(i, y);
      uv.setXY(i, x / 6, z / 6);
      const f = this.fieldAt(x, z);
      col.copy(crops[Math.floor(f * crops.length) % crops.length]);
      const nz = this.noise.noise(x / 18, z / 18) * 0.08 + this.noise.noise(x / 4, z / 4) * 0.04;
      col.offsetHSL(0, 0, nz);
      // Städte: gestampfter Boden, Plätze gepflastert
      for (const t of this.towns) {
        const dt = Math.hypot(x - t.x, z - t.z);
        if (dt < t.r) col.lerp(new THREE.Color(0x5e6a3e), 0.3 * (1 - dt / t.r));
        if (t.square && Math.abs(x - t.square.x) < t.square.w / 2 && Math.abs(z - t.square.z) < t.square.d / 2) col.copy(cobble).offsetHSL(0, 0, nz);
      }
      // Strand / Wasser / Sumpf
      if (this.water) {
        if (d.beach || d.sea) {
          if (y < 3.2 && z < -100) col.lerp(sand, smoothstep(3.6, 2.2, y));
          if (y < 0.4) col.lerp(wet, smoothstep(0.4, -0.5, y));
        }
        if (d.flood && y < 0.2) col.copy(marsh).offsetHSL(0, 0, nz);
      }
      // Steile Hänge: Fels/Erde
      this.normal(x, z, N);
      if (N.y < 0.75) col.lerp(d.sea ? rock : mud, smoothstep(0.75, 0.5, N.y));
      // Straßen
      for (const r of d.roads || []) {
        const dr = this.roadDist(x, z, r);
        if (dr < r.w / 2 + 1.5) col.lerp(road, smoothstep(r.w / 2 + 1.5, r.w / 2 - 0.5, dr));
      }
      cols[i * 3] = col.r; cols[i * 3 + 1] = col.g; cols[i * 3 + 2] = col.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, map: tex('grass') });
    mat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `
        vec4 dt = texture2D(map, vMapUv);
        vec4 dt2 = texture2D(map, vMapUv * 0.13);
        diffuseColor.rgb *= mix(vec3(1.0), dt.rgb * 1.55, 0.75) * (0.85 + dt2.r * 0.3);`);
    };
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    this.terrain = m;
    this.group.add(m);
    // Rand: Gelände weit sichtbar verlängern (Horizont)
    const ring = new THREE.Mesh(new THREE.RingGeometry(HALF * 1.2, 3000, 32, 1), new THREE.MeshLambertMaterial({ color: this.water && (d.sea || d.beach) ? 0x34474e : 0x4d5e36 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = this.water && d.sea ? -1.5 : this.base - 1;
    this.group.add(ring);
    const skirt = new THREE.Mesh(new THREE.PlaneGeometry(SIZE * 1.4, SIZE * 1.4), ring.material);
    skirt.rotation.x = -Math.PI / 2; skirt.position.y = ring.position.y - 0.05; this.group.add(skirt);
  }

  buildWater() {
    const d = this.def;
    const geo = new THREE.PlaneGeometry(3200, 3200, 80, 80);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: d.flood ? 0x3e4a3a : 0x2c4450, roughness: 0.22, metalness: 0.35, transparent: true, opacity: d.flood ? 0.78 : 0.9 });
    this.waterU = { t: { value: 0 }, amp: { value: d.sea ? 0.45 : 0.06 } };
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uT = this.waterU.t; sh.uniforms.uA = this.waterU.amp;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT; uniform float uA;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec3 wp = (modelMatrix * vec4(position,1.0)).xyz;
          transformed.y += (sin(wp.x*0.07 + uT*1.1) * 0.5 + sin(wp.z*0.11 - uT*1.6 + wp.x*0.03) * 0.5) * uA;`)
        .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
          { vec3 wp0 = (modelMatrix * vec4(position,1.0)).xyz;
            float dx = cos(wp0.x*0.07 + uT*1.1)*0.035*uA + cos(wp0.z*0.11 - uT*1.6 + wp0.x*0.03)*0.015*uA;
            float dz = cos(wp0.z*0.11 - uT*1.6 + wp0.x*0.03)*0.055*uA;
            objectNormal = normalize(vec3(-dx, 1.0, -dz)); }`);
    };
    const m = new THREE.Mesh(geo, mat);
    m.position.y = 0;
    m.receiveShadow = true;
    this.waterMesh = m;
    this.group.add(m);
  }

  // ------------------------------------------------------------ Wegfindung
  buildNav() {
    const n = Math.round(SIZE / NAV);
    this.navN = n;
    const g = new Uint8Array(n * n);
    const mark = (x, z) => { const i = Math.floor((x + HALF) / NAV), j = Math.floor((z + HALF) / NAV); if (i >= 0 && j >= 0 && i < n && j < n) g[j * n + i] = 1; };
    for (const b of this.boxes) {
      if (b.kind === 'tree' || b.soft) continue;
      if (b.kind === 'wall' && b.y1 - this.h(b.x, b.z) < 1.2 && b.kind !== 'hedge') { /* niedrige Mauer: KI geht drum herum */ }
      const ex = b.hw + 0.4, ez = b.hd + 0.4;
      for (let u = -ex; u <= ex + 0.01; u += 1) for (let v = -ez; v <= ez + 0.01; v += 1) mark(b.x + u * b.c + v * b.s, b.z - u * b.s + v * b.c);
    }
    // Tiefes Wasser und Steilwände
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const x = -HALF + (i + 0.5) * NAV, z = -HALF + (j + 0.5) * NAV;
      if (this.water && this.groundAt(x, z) < -1.3) g[j * n + i] = 1;
      const s = Math.abs(this.h(x + 1.5, z) - this.h(x - 1.5, z)) + Math.abs(this.h(x, z + 1.5) - this.h(x, z - 1.5));
      if (s > 4.2 && !this.ropeNear(x, z)) g[j * n + i] = 1;
    }
    for (const w of this.walk) for (let x = w.x0; x < w.x1; x += 1) for (let z = w.z0 + 0.6; z < w.z1 - 0.6; z += 1) { const i = Math.floor((x + HALF) / NAV), j = Math.floor((z + HALF) / NAV); if (i >= 0 && j >= 0 && i < n && j < n && w.y < 2) g[j * n + i] = 0; }
    this.nav = g;
  }
  ropeNear(x, z) { for (const r of this.ropes) if (Math.abs(x - r.x) < 2.5 && z > r.z - 3 && z < r.topZ + 2) return true; return false; }

  navCell(x, z) { return [clamp(Math.floor((x + HALF) / NAV), 0, this.navN - 1), clamp(Math.floor((z + HALF) / NAV), 0, this.navN - 1)]; }
  navFree(i, j) { return i >= 0 && j >= 0 && i < this.navN && j < this.navN && !this.nav[j * this.navN + i]; }

  // A* (8 Nachbarn, keine Ecken schneiden). Liefert Wegpunkte [[x,z],…] oder null
  findPath(ax, az, bx, bz, maxIter = 40000) {
    const n = this.navN;
    let [si, sj] = this.navCell(ax, az), [ti, tj] = this.navCell(bx, bz);
    const nearestFree = (i, j) => {
      if (this.navFree(i, j)) return [i, j];
      for (let r = 1; r < 8; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) if (this.navFree(i + di, j + dj)) return [i + di, j + dj];
      return null;
    };
    const s = nearestFree(si, sj), t = nearestFree(ti, tj);
    if (!s || !t) return null;
    [si, sj] = s; [ti, tj] = t;
    const start = sj * n + si, goal = tj * n + ti;
    if (start === goal) return [[bx, bz]];
    const gS = this._g || (this._g = new Float32Array(n * n));
    const from = this._from || (this._from = new Int32Array(n * n));
    const stamp = this._stamp || (this._stamp = new Uint32Array(n * n));
    this._st = (this._st || 0) + 1;
    const st = this._st;
    const heap = [];   // [f, idx]
    const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = k * 2 + 1, r = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
    const hfn = (i, j) => { const dx = Math.abs(i - ti), dz = Math.abs(j - tj); return (dx + dz) + (1.414 - 2) * Math.min(dx, dz); };
    gS[start] = 0; stamp[start] = st; from[start] = -1;
    push(hfn(si, sj), start);
    let it = 0, found = false, best = start, bestH = 1e9;
    while (heap.length && it++ < maxIter) {
      const [, cur] = pop();
      if (cur === goal) { found = true; break; }
      const ci = cur % n, cj = (cur / n) | 0;
      const hc = hfn(ci, cj);
      if (hc < bestH) { bestH = hc; best = cur; }
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
        if (!di && !dj) continue;
        const ni = ci + di, nj = cj + dj;
        if (!this.navFree(ni, nj)) continue;
        if (di && dj && (!this.navFree(ci + di, cj) || !this.navFree(ci, cj + dj))) continue;
        const k = nj * n + ni;
        const ng = gS[cur] + (di && dj ? 1.414 : 1);
        if (stamp[k] !== st || ng < gS[k]) { stamp[k] = st; gS[k] = ng; from[k] = cur; push(ng + hfn(ni, nj), k); }
      }
    }
    let cur = found ? goal : best;
    const cells = [];
    while (cur !== -1 && cells.length < 4000) { cells.push(cur); cur = from[cur]; }
    cells.reverse();
    // Glätten: nur Wegpunkte behalten, zwischen denen keine Sichtlinie im Raster besteht
    const pts = cells.map((k) => [-HALF + ((k % n) + 0.5) * NAV, -HALF + (((k / n) | 0) + 0.5) * NAV]);
    const out = [];
    let a = 0;
    while (a < pts.length - 1) {
      let b = pts.length - 1;
      while (b > a + 1 && !this.navLine(pts[a][0], pts[a][1], pts[b][0], pts[b][1])) b--;
      out.push(pts[b]);
      a = b;
    }
    if (found) out.push([bx, bz]);
    return out;
  }
  navLine(ax, az, bx, bz) {
    const d = Math.hypot(bx - ax, bz - az), steps = Math.ceil(d / 1.2);
    for (let k = 1; k < steps; k++) {
      const [i, j] = this.navCell(ax + (bx - ax) * k / steps, az + (bz - az) * k / steps);
      if (this.nav[j * this.navN + i]) return false;
    }
    return true;
  }

  // ------------------------------------------------------------ Kollision
  // Kreis (Spieler/Soldat) gegen Quader verschieben. feet/head: Höhenbereich
  collide(p, r, feet, head) {
    const list = this.query(p.x, p.z, r + 4, this._ql || (this._ql = []));
    for (const b of list) {
      if (b.y1 < feet + 0.45 || b.y0 > head) continue;   // drübersteigen / drunter durch
      if (b.kind === 'wire' && b.cut) continue;
      if (b.kind === 'obstacle') continue;
      const dx = p.x - b.x, dz = p.z - b.z;
      const lx = dx * b.c - dz * b.s, lz = dx * b.s + dz * b.c;
      const cx = clamp(lx, -b.hw, b.hw), cz = clamp(lz, -b.hd, b.hd);
      const ox = lx - cx, oz = lz - cz;
      const d2 = ox * ox + oz * oz;
      if (d2 >= r * r) continue;
      let nx, nz, push;
      if (d2 > 1e-6) { const d = Math.sqrt(d2); nx = ox / d; nz = oz / d; push = r - d; }
      else { // Mittelpunkt im Quader: zur nächsten Seite hinaus
        const px = b.hw - Math.abs(lx), pz = b.hd - Math.abs(lz);
        if (px < pz) { nx = Math.sign(lx) || 1; nz = 0; push = px + r; } else { nx = 0; nz = Math.sign(lz) || 1; push = pz + r; }
      }
      // zurück in Weltkoordinaten
      p.x += (nx * b.c + nz * b.s) * push;
      p.z += (-nx * b.s + nz * b.c) * push;
    }
    p.x = clamp(p.x, -HALF + 2, HALF - 2); p.z = clamp(p.z, -HALF + 2, HALF - 2);
  }

  // Strahl/Segment a->b gegen Quader und Gelände. Liefert Bruchteil t (0..1) des ersten Treffers oder 1
  raycast(a, b, opts = {}) {
    const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
    const len = Math.hypot(dx, dy, dz) || 1;
    let best = 1, hitBox = null;
    // Quader im Korridor
    const steps = Math.ceil(len / HASH) + 1;
    const seen = this._rs || (this._rs = new Set());
    seen.clear();
    for (let k = 0; k <= steps; k++) {
      const t = k / steps;
      const x = a.x + dx * t, z = a.z + dz * t;
      const l = this.hash.get(Math.floor((x + HALF) / HASH) * 1000 + Math.floor((z + HALF) / HASH));
      if (!l) continue;
      for (const bx of l) {
        if (seen.has(bx)) continue;
        seen.add(bx);
        if (bx.soft && !opts.soft) continue;
        if (bx.kind === 'tree' && opts.noTrees) continue;
        const tt = this.segBox(a, dx, dy, dz, bx);
        if (tt < best) { best = tt; hitBox = bx; }
      }
    }
    // Gelände: Schritte entlang des Segments
    const tStep = Math.min(1, 1.5 / len);
    let prevAbove = a.y - this.h(a.x, a.z);
    for (let t = tStep; t < best; t += tStep) {
      const x = a.x + dx * t, y = a.y + dy * t, z = a.z + dz * t;
      const above = y - this.h(x, z);
      if (above < 0) {
        // verfeinern
        const t0 = t - tStep, f = prevAbove / (prevAbove - above);
        const th = t0 + tStep * clamp(f, 0, 1);
        if (th < best) { best = th; hitBox = null; this.lastTerrain = true; }
        break;
      }
      prevAbove = above;
    }
    this.lastHit = hitBox;
    return best;
  }
  segBox(a, dx, dy, dz, b) {
    // Lokales System des Quaders
    const ox = a.x - b.x, oz = a.z - b.z;
    const lx = ox * b.c - oz * b.s, lz = ox * b.s + oz * b.c;
    const ldx = dx * b.c - dz * b.s, ldz = dx * b.s + dz * b.c;
    let t0 = 0, t1 = 1;
    const slab = (o, d, mn, mx) => {
      if (Math.abs(d) < 1e-9) return o >= mn && o <= mx;
      let ta = (mn - o) / d, tb = (mx - o) / d;
      if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
      return t0 <= t1;
    };
    // Startpunkt im Quader (Schütze im Bunker, Soldat an der Hecke): Quader ignorieren
    if (Math.abs(lx) < b.hw && Math.abs(lz) < b.hd && a.y > b.y0 && a.y < b.y1) return 2;
    if (!slab(lx, ldx, -b.hw, b.hw)) return 2;
    if (!slab(lz, ldz, -b.hd, b.hd)) return 2;
    if (!slab(a.y, dy, b.y0, b.y1)) return 2;
    return t0;
  }
  los(a, b) { return this.raycast(a, b, { noTrees: true }) >= 0.999; }

  // ------------------------------------------------------------ Minikarte (Draufsicht, einmal gezeichnet)
  buildMinimap() {
    const S = 256, cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const c = cv.getContext('2d');
    const k = S / SIZE;
    const img = c.createImageData(S, S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const x = -HALF + (i + 0.5) / k, z = -HALF + (j + 0.5) / k;
      const y = this.h(x, z);
      const o = (j * S + i) * 4;
      let r, g, b;
      if (this.water && y < 0) { r = 40; g = 62; b = 76; }
      else { const f = this.fieldAt(x, z); r = 70 + f * 30; g = 92 + f * 25; b = 50; const sh = (this.h(x + 3, z) - y) * 6; r -= sh; g -= sh; b -= sh; }
      img.data[o] = r; img.data[o + 1] = g; img.data[o + 2] = b; img.data[o + 3] = 255;
    }
    c.putImageData(img, 0, 0);
    c.strokeStyle = '#a89c80'; c.lineCap = 'round';
    for (const r of this.def.roads || []) { c.lineWidth = Math.max(1.5, r.w * k); c.beginPath(); r.pts.forEach(([x, z], i) => (i ? c.lineTo : c.moveTo).call(c, (x + HALF) * k, (z + HALF) * k)); c.stroke(); }
    for (const b of this.boxes) {
      if (b.kind === 'tree' || b.kind === 'obstacle') continue;
      c.save(); c.translate((b.x + HALF) * k, (b.z + HALF) * k); c.rotate(-b.rot);
      c.fillStyle = b.kind === 'hedge' ? '#2e4320' : b.kind === 'house' ? '#6e6658' : b.kind === 'bunker' ? '#9a9890' : b.kind === 'wire' ? '#504840' : '#7a7464';
      c.fillRect(-b.hw * k, -b.hd * k, Math.max(1, b.hw * 2 * k), Math.max(1, b.hd * 2 * k));
      c.restore();
    }
    this.minimap = cv;
  }

  update(dt, t) {
    if (this.waterU) this.waterU.t.value = t;
    for (const f of this.flags) {
      const fl = f.userData.flag;
      if (!fl.visible) continue;
      const p = fl.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 0.9; p.setZ(i, Math.sin(x * 3 - t * 5) * 0.12 * x); }
      p.needsUpdate = true;
      if (fl.position.y < 6.3) fl.position.y = Math.min(6.3, fl.position.y + dt * 1.8);
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
}
