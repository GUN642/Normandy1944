// 3D-Modelle: Soldaten, Gebäude, Befestigungen, Fahrzeuge, Flugzeuge, Boote, Geschütze.
// Alles prozedural; statische Teile werden mit Vertexfarben zusammengefasst (wenige Draw-Calls).
import * as THREE from './lib/three.module.min.js';
import { mergeColored, mergeTextured, boxUV, M4, M4s, tex } from './gfx.js';
import { WEAPONS } from './weapons.js';

export const MAT = {};
export function initMaterials() {
  if (MAT.vc) return MAT;
  MAT.vc = new THREE.MeshLambertMaterial({ vertexColors: true });
  MAT.vcStd = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.1 });
  MAT.metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.55 });
  MAT.burnt = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0.3, color: 0x2c2a26 });
  MAT.stone = new THREE.MeshLambertMaterial({ map: tex('stone'), vertexColors: true });
  MAT.plaster = new THREE.MeshLambertMaterial({ map: tex('plaster'), vertexColors: true });
  MAT.slate = new THREE.MeshLambertMaterial({ map: tex('slate'), vertexColors: true });
  MAT.tile = new THREE.MeshLambertMaterial({ map: tex('tile'), vertexColors: true });
  MAT.concrete = new THREE.MeshLambertMaterial({ map: tex('concrete'), vertexColors: true });
  MAT.woodT = new THREE.MeshLambertMaterial({ map: tex('wood'), vertexColors: true });
  MAT.splinter = new THREE.MeshLambertMaterial({ map: tex('splinter') });
  MAT.dark = new THREE.MeshBasicMaterial({ color: 0x0b0a09 });
  MAT.glassWin = new THREE.MeshLambertMaterial({ color: 0x1e2428, emissive: 0x000000 });
  MAT.chute = new THREE.MeshLambertMaterial({ color: 0xd8d2bc, side: THREE.DoubleSide });
  MAT.chuteOD = new THREE.MeshLambertMaterial({ color: 0x6f6d4c, side: THREE.DoubleSide });
  return MAT;
}

const C = (x) => new THREE.Color(x);
const geo = {
  box: (w, h, d) => new THREE.BoxGeometry(w, h, d),
  cyl: (rt, rb, h, s = 8) => new THREE.CylinderGeometry(rt, rb, h, s),
  sph: (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h),
};

// ================================================================ Soldaten
// Uniformen (Farben linear angelehnt an Originalfarben)
export const UNIFORMS = {
  us_inf: { jacket: 0x7d7652, pants: 0x5b5638, legs: 0xa69a74, boots: 0x5a3c24, helmet: 0x4a5034, web: 0x8f8661, pack: 0x7a7350, skin: 0xc49a7c },
  us_para: { jacket: 0x8a8460, pants: 0x857f5c, legs: 0x857f5c, boots: 0x4a2f1c, helmet: 0x484e33, web: 0x8f8661, pack: 0x6e6b4a, skin: 0xc49a7c, net: true },
  us_ranger: { jacket: 0x7d7652, pants: 0x5b5638, legs: 0xa69a74, boots: 0x5a3c24, helmet: 0x4a5034, web: 0x8f8661, pack: 0x7a7350, skin: 0xc49a7c, diamond: 0xd08030 },
  de_heer: { jacket: 0x5f6556, pants: 0x585d50, legs: 0x1c1b1a, boots: 0x1c1b1a, helmet: 0x4d5249, web: 0x1d1a17, pack: 0x6e6448, skin: 0xc8a083, stiefel: true },
  de_fj: { jacket: 0x7f7f60, pants: 0x5b5f55, legs: 0x5b5f55, boots: 0x2a2420, helmet: 0x4f5446, web: 0x2a2620, pack: 0x6e6448, skin: 0xc8a083, fj: true, camo: true },
};

// Helm-Profile (Lathe): M1 (USA), M35/42 Stahlhelm (Heer), Fallschirmjägerhelm (ohne Krempe)
function helmetGeo(kind) {
  let pts;
  if (kind === 'm1') pts = [[0, 0.155], [0.06, 0.15], [0.105, 0.13], [0.13, 0.09], [0.14, 0.04], [0.142, 0.0], [0.175, -0.012], [0.18, -0.02], [0.165, -0.02], [0.13, -0.005]];
  else if (kind === 'stahl') pts = [[0, 0.15], [0.06, 0.145], [0.1, 0.125], [0.125, 0.09], [0.135, 0.04], [0.14, 0.0], [0.15, -0.035], [0.17, -0.07], [0.175, -0.085], [0.15, -0.07], [0.12, -0.02]];
  else pts = [[0, 0.14], [0.07, 0.135], [0.11, 0.11], [0.13, 0.07], [0.138, 0.02], [0.14, -0.03], [0.125, -0.04], [0.11, -0.0]];
  const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 14);
  if (kind === 'stahl') { // Nackenschirm tiefer als Stirn
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const z = p.getZ(i), y = p.getY(i); if (y < 0) p.setY(i, y + (z < 0 ? 0.02 * (-z / 0.17) : -0.015 * (z / 0.17))); }
    g.computeVertexNormals();
  }
  return g;
}

const SOLDIER_CACHE = new Map();
function soldierParts(uni) {
  const key = JSON.stringify(uni);
  if (SOLDIER_CACHE.has(key)) return SOLDIER_CACHE.get(key);
  const U = uni;
  const torso = [
    { geo: geo.box(0.38, 0.5, 0.22), color: U.jacket, matrix: M4(0, 0.25, 0) },
    { geo: geo.box(0.4, 0.07, 0.24), color: U.web, matrix: M4(0, 0.02, 0) },                   // Koppel
    { geo: geo.box(0.06, 0.5, 0.235), color: U.web, matrix: M4(0.1, 0.27, 0, 0, 0, 0.12) },    // Trageriemen
    { geo: geo.box(0.06, 0.5, 0.235), color: U.web, matrix: M4(-0.1, 0.27, 0, 0, 0, -0.12) },
    { geo: geo.box(0.3, 0.32, 0.14), color: U.pack, matrix: M4(0, 0.3, 0.17) },                // Gepäck
    { geo: geo.box(0.1, 0.06, 0.12), color: U.skin, matrix: M4(0, 0.53, -0.01) },              // Hals
  ];
  if (U.stiefel || U.fj) {
    // Brotbeutel + geriffelte Gasmaskenbüchse (typische deutsche Silhouette)
    torso.push({ geo: geo.box(0.16, 0.16, 0.08), color: 0x6c6146, matrix: M4(-0.17, 0.0, 0.1) });
    torso.push({ geo: geo.cyl(0.055, 0.055, 0.26, 10), color: 0x5a6150, matrix: M4(0.12, 0.05, 0.2, 0, 0, 0.15) });
    torso.push({ geo: geo.box(0.11, 0.1, 0.06), color: 0x1d1a17, matrix: M4(0.11, 0.06, -0.13) });   // Patronentaschen
    torso.push({ geo: geo.box(0.11, 0.1, 0.06), color: 0x1d1a17, matrix: M4(-0.11, 0.06, -0.13) });
  } else {
    torso.push({ geo: geo.cyl(0.05, 0.05, 0.16, 8), color: 0x6a6a52, matrix: M4(-0.2, -0.02, 0.06) });   // Feldflasche
    torso.push({ geo: geo.box(0.36, 0.08, 0.06), color: U.web, matrix: M4(0, 0.04, -0.13) });             // Patronengurt
    torso.push({ geo: geo.box(0.06, 0.14, 0.04), color: 0x5a5a40, matrix: M4(0.17, 0.0, 0.0) });          // Spaten
  }
  if (U.diamond) torso.push({ geo: geo.box(0.02, 0.06, 0.12), color: U.diamond, matrix: M4(0, 0.36, 0.25) });
  const head = [
    { geo: geo.sph(0.11, 12, 10), color: U.skin, matrix: M4(0, 0.1, 0) },
    { geo: geo.box(0.03, 0.04, 0.04), color: U.skin, matrix: M4(0, 0.09, -0.11) },
    { geo: helmetGeo(U.fj ? 'fj' : U.stiefel ? 'stahl' : 'm1'), color: U.helmet, matrix: M4(0, 0.13, 0) },
    { geo: geo.box(0.16, 0.02, 0.015), color: 0x2a2a2a, matrix: M4(0, 0.035, -0.07) },    // Kinnriemen
  ];
  if (U.net) head.push({ geo: geo.sph(0.15, 8, 5), color: 0x3d3f2a, matrix: M4s(0, 0.17, 0, 0, 1, 0.6, 1) });
  const upperArm = [{ geo: geo.box(0.1, 0.3, 0.1), color: U.jacket, matrix: M4(0, -0.15, 0) }];
  const foreArm = [{ geo: geo.box(0.085, 0.27, 0.085), color: U.jacket, matrix: M4(0, -0.12, 0) }, { geo: geo.box(0.07, 0.08, 0.09), color: U.skin, matrix: M4(0, -0.28, 0) }];
  const thigh = [{ geo: geo.box(0.15, 0.44, 0.16), color: U.pants, matrix: M4(0, -0.22, 0) }];
  const shin = [{ geo: geo.box(0.12, 0.42, 0.13), color: U.legs, matrix: M4(0, -0.2, 0) }, { geo: geo.box(0.12, 0.08, 0.24), color: U.boots, matrix: M4(0, -0.42, -0.04) }];
  const parts = {};
  for (const [k, v] of Object.entries({ torso, head, upperArm, foreArm, thigh, shin })) parts[k] = mergeColored(v);
  // Fernansicht: eine einzige Figur
  const far = [];
  const push = (list, m) => list.forEach((p) => far.push({ geo: p.geo, color: p.color, matrix: m.clone().multiply(p.matrix) }));
  push(torso, M4(0, 0.95, 0)); push(head, M4(0, 1.5, 0));
  push(thigh, M4(0.1, 0.97, 0)); push(thigh, M4(-0.1, 0.97, 0)); push(shin, M4(0.1, 0.53, 0)); push(shin, M4(-0.1, 0.53, 0));
  push(upperArm, M4(0.24, 1.42, 0, 0, -0.9, 0)); push(upperArm, M4(-0.24, 1.42, 0, 0, -0.9, 0));
  parts.far = mergeColored(far);
  SOLDIER_CACHE.set(key, parts);
  return parts;
}

// Waffe als einzelnes Mesh (KI-Soldaten): aus dem Detailmodell zusammengefasst
const WCACHE = new Map();
import { weaponModel } from './weapons.js';
export function weaponMeshSimple(id) {
  if (!WCACHE.has(id)) {
    const src = weaponModel(id);
    src.updateMatrixWorld(true);
    const parts = [];
    src.traverse((o) => { if (o.isMesh && o.geometry.attributes.normal) parts.push({ geo: o.geometry, color: (o.material.color || C(0x222222)).getHex(), matrix: o.matrixWorld.clone() }); });
    WCACHE.set(id, { geo: mergeColored(parts), ud: src.userData });
  }
  const w = WCACHE.get(id);
  const m = new THREE.Mesh(w.geo, MAT.vcStd);
  m.userData = { ...w.ud };
  return m;
}

// Gelenkfigur: root (Füße am Boden) > hips > torso > head; Arme hängen an der Waffe (Zielhaltung)
export class SoldierRig {
  constructor(uniKey, weaponId, opts = {}) {
    initMaterials();
    const P = soldierParts(UNIFORMS[uniKey] || UNIFORMS.us_inf);
    const mat = MAT.vc;
    const mk = (g) => { const m = new THREE.Mesh(g, mat); m.castShadow = !!opts.shadow; return m; };
    this.root = new THREE.Group();
    this.body = new THREE.Group(); this.root.add(this.body);      // für Liegen/Fallen
    this.hips = new THREE.Group(); this.hips.position.y = 0.95; this.body.add(this.hips);
    this.torso = mk(P.torso); this.hips.add(this.torso);
    this.headG = new THREE.Group(); this.headG.position.y = 0.55; this.torso.add(this.headG);
    this.headG.add(mk(P.head));
    this.legs = [];
    for (const sx of [1, -1]) {
      const th = new THREE.Group(); th.position.set(sx * 0.1, 0.02, 0); this.hips.add(th);
      th.add(mk(P.thigh));
      const sh = new THREE.Group(); sh.position.y = -0.44; th.add(sh);
      sh.add(mk(P.shin));
      this.legs.push({ th, sh });
    }
    // Waffe + Arme
    this.aim = new THREE.Group(); this.aim.position.set(0, 0.42, 0); this.torso.add(this.aim);
    this.arms = [];
    const armR = this.makeArm(mk, P, 0.2), armL = this.makeArm(mk, P, -0.2);
    this.aim.add(armR.g, armL.g);
    this.armR = armR; this.armL = armL;
    this.setWeapon(weaponId);
    this.far = mk(P.far);
    this.far.visible = false;
    this.root.add(this.far);
    this.walk = 0; this.lod = 0;
  }

  makeArm(mk, P, sx) {
    const g = new THREE.Group(); g.position.set(sx, 0, 0);
    const up = mk(P.upperArm); g.add(up);
    const el = new THREE.Group(); el.position.y = -0.3; g.add(el);
    el.add(mk(P.foreArm));
    return { g, el };
  }

  setWeapon(id) {
    if (this.weapon) this.aim.remove(this.weapon);
    this.weaponId = id;
    if (!id) { this.weapon = null; return; }
    const w = weaponMeshSimple(id);
    const sh = WEAPONS[id] && (WEAPONS[id].rocket);
    w.position.set(0.12, sh ? 0.02 : -0.08, -0.1);
    this.weapon = w;
    this.aim.add(w);
    // Arme zur Waffe ausrichten: rechte Hand am Griff, linke vorn
    const pistol = WEAPONS[id] && WEAPONS[id].pistol;
    this.armR.g.rotation.set(-1.25, 0, 0.15); this.armR.el.rotation.set(-0.5, 0, 0);
    this.armL.g.rotation.set(pistol ? -1.3 : -1.1, 0, pistol ? -0.4 : -0.5); this.armL.el.rotation.set(pistol ? -0.3 : -0.9, 0, 0);
  }

  // Pose: speed (m/s), stance 0 stehen,1 hocken,2 liegen, pitch (Zielen), dt, dead (0..1 Fallfortschritt)
  pose(speed, stance, pitch, dt, dead = 0, firing = 0) {
    if (this.lod) return;
    this.walk += dt * (stance === 2 ? speed * 2.2 : speed * 2.6);
    const s = Math.sin(this.walk), amp = Math.min(1, speed / 3) * (stance === 1 ? 0.5 : 0.75);
    if (dead > 0) {
      this.body.rotation.x = -Math.min(1, dead) * 1.5;
      this.body.position.y = Math.min(1, dead) * 0.15;
      this.hips.position.y = 0.95 - Math.min(1, dead) * 0.6;
      this.aim.rotation.x = 0.8;
      return;
    }
    if (stance === 2) {
      this.body.rotation.x = -Math.PI / 2 + 0.08; this.body.position.set(0, 0.22, 0.75);
      this.hips.position.y = 0.95;
      for (let i = 0; i < 2; i++) { this.legs[i].th.rotation.x = (i ? -s : s) * amp * 0.4; this.legs[i].sh.rotation.x = 0.1; }
      this.aim.rotation.x = Math.PI / 2 - 0.1 + pitch * 0.6;
      this.headG.rotation.x = Math.PI / 2 - 0.25;
      return;
    }
    this.body.rotation.x = 0; this.body.position.set(0, 0, 0);
    this.headG.rotation.x = 0;
    const crouch = stance === 1;
    this.hips.position.y = crouch ? 0.62 : 0.95 + Math.abs(s) * 0.03 * amp;
    this.torso.rotation.x = crouch ? -0.35 : -0.06 * amp;
    for (let i = 0; i < 2; i++) {
      const ph = i ? -s : s;
      if (crouch) { this.legs[i].th.rotation.x = -1.1 + ph * amp * 0.5 + (i ? 0.5 : 0); this.legs[i].sh.rotation.x = 1.6 - (i ? 0.6 : 0); }
      else { this.legs[i].th.rotation.x = ph * amp * 0.7; this.legs[i].sh.rotation.x = Math.max(0, -Math.cos(this.walk + (i ? Math.PI : 0))) * amp * 1.1 + 0.05; }
    }
    this.aim.rotation.x = pitch - this.torso.rotation.x - firing * 0.04;
  }

  setLod(far) {
    if (this.lod === far) return;
    this.lod = far;
    this.body.visible = !far;
    this.far.visible = !!far;
  }

  dispose() { this.root.removeFromParent(); }
}

// ================================================================ Gebäude
// Normannisches Bruchsteinhaus mit steilem Schieferdach. Liefert { meshes, boxes } (Kollisionsquader)
const _dir = new THREE.Vector3();
export function buildHouse(x, z, y, w, d, floors, ry, opts = {}) {
  initMaterials();
  const H = floors * 3 + 0.4;
  const roofH = w * (opts.flatRoof ? 0.05 : 0.55);
  const walls = [], roofs = [], dark = [], wood = [];
  const rot = M4(x, y, z, ry);
  const T = (lx, ly, lz, r = 0) => rot.clone().multiply(M4(lx, ly, lz, r));
  const wallTex = opts.plaster ? 'plaster' : 'stone';
  walls.push({ geo: boxUV(w, H, d), color: opts.tint || 0xffffff, matrix: T(0, H / 2 - 0.3, 0) });
  // Giebel (Dreieck) an beiden Stirnseiten
  if (!opts.flatRoof) {
    const gs = new THREE.Shape(); gs.moveTo(-w / 2, 0); gs.lineTo(w / 2, 0); gs.lineTo(0, roofH); gs.closePath();
    const gg = new THREE.ExtrudeGeometry(gs, { depth: d, bevelEnabled: false });
    gg.translate(0, 0, -d / 2);
    const uv = gg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
    walls.push({ geo: gg, color: opts.tint || 0xffffff, matrix: T(0, H - 0.3, 0) });
    // Dachflächen
    const slope = Math.hypot(w / 2, roofH) + 0.35;
    const ang = Math.atan2(roofH, w / 2);
    for (const sx of [-1, 1]) {
      const rg = boxUV(slope, 0.16, d + 0.6);
      roofs.push({ geo: rg, color: 0xffffff, matrix: T(sx * w / 4, H - 0.3 + roofH / 2 + 0.06, 0).multiply(M4(0, 0, 0, 0, 0, -sx * ang)) });
    }
    // Schornstein
    if (opts.chimney !== false) walls.push({ geo: boxUV(0.7, roofH + 1.2, 0.7), color: 0xe0d8c8, matrix: T(w * 0.25, H + roofH * 0.5, d * 0.32) });
  } else {
    walls.push({ geo: boxUV(w + 0.2, 0.4, d + 0.2), color: 0xd0c8b8, matrix: T(0, H, 0) });
  }
  // Fenster und Türen (dunkle Öffnungen mit Läden)
  const nx = Math.max(1, Math.floor(w / 3.2)), nz = Math.max(1, Math.floor(d / 3.4));
  for (let f = 0; f < floors; f++) {
    const wy = f * 3 + 1.6;
    for (let i = 0; i < nx; i++) {
      const lx = -w / 2 + (i + 0.5) * (w / nx);
      for (const sz of [-1, 1]) {
        const door = f === 0 && i === Math.floor(nx / 2) && sz === -1;
        const hh = door ? 2.2 : 1.3, cy = door ? 1.0 : wy;
        dark.push({ geo: geo.box(door ? 1.1 : 0.9, hh, 0.06), color: 0x0d0c0b, matrix: T(lx, cy, sz * (d / 2 + 0.02)) });
        if (!door) for (const s of [-1, 1]) wood.push({ geo: geo.box(0.45, 1.35, 0.05), color: opts.shutter || 0x5d6e66, matrix: T(lx + s * 0.7, wy, sz * (d / 2 + 0.05)) });
        else wood.push({ geo: geo.box(1.1, 2.2, 0.05), color: 0x4a3423, matrix: T(lx + 0.45, 1.0, sz * (d / 2 + 0.06), 0.9) });
      }
    }
    for (let i = 0; i < nz; i++) {
      const lz = -d / 2 + (i + 0.5) * (d / nz);
      for (const sx of [-1, 1]) dark.push({ geo: geo.box(0.06, 1.2, 0.85), color: 0x0d0c0b, matrix: T(sx * (w / 2 + 0.02), wy, lz) });
    }
  }
  const meshes = [];
  const wm = new THREE.Mesh(mergeTextured(walls), opts.plaster ? MAT.plaster : MAT.stone);
  const roofMat = opts.tiles ? MAT.tile : MAT.slate;
  const rm = new THREE.Mesh(mergeTextured(roofs.length ? roofs : [{ geo: geo.box(0.01, 0.01, 0.01), matrix: T(0, 0, 0) }]), roofMat);
  const dm = new THREE.Mesh(mergeColored(dark.concat(wood)), MAT.vc);
  for (const m of [wm, rm, dm]) { m.castShadow = true; m.receiveShadow = true; meshes.push(m); }
  return { meshes, boxes: [{ x, z, hw: w / 2, hd: d / 2, rot: ry, y0: y - 1, y1: y + H + roofH * 0.6, kind: 'house' }], height: H + roofH };
}

// Ruine: Mauerreste ohne Dach
export function buildRuin(x, z, y, w, d, ry, rng) {
  initMaterials();
  const parts = [], boxes = [];
  const rot = M4(x, y, z, ry);
  const T = (lx, ly, lz, r = 0) => rot.clone().multiply(M4(lx, ly, lz, r));
  const seg = (lx, lz, len, alongX) => {
    const h = 1 + rng() * 4.5;
    parts.push({ geo: boxUV(alongX ? len : 0.6, h, alongX ? 0.6 : len), color: 0xd6d0c4, matrix: T(lx, h / 2 - 0.3, lz) });
    const c = Math.cos(ry), s = Math.sin(ry);
    boxes.push({ x: x + lx * c + lz * s, z: z - lx * s + lz * c, hw: (alongX ? len : 0.6) / 2, hd: (alongX ? 0.6 : len) / 2, rot: ry, y0: y - 1, y1: y + h, kind: 'wall' });
  };
  const n = 3;
  for (let i = 0; i < n; i++) {
    if (rng() < 0.8) seg(-w / 2 + (i + 0.5) * w / n, -d / 2, w / n * 0.9, true);
    if (rng() < 0.7) seg(-w / 2 + (i + 0.5) * w / n, d / 2, w / n * 0.9, true);
  }
  if (rng() < 0.8) seg(-w / 2, 0, d * 0.8, false);
  if (rng() < 0.6) seg(w / 2, 0, d * 0.6, false);
  // Schutt
  for (let i = 0; i < 6; i++) parts.push({ geo: boxUV(1 + rng() * 2, 0.6 + rng(), 1 + rng() * 2), color: 0xb8b0a0, matrix: T((rng() - 0.5) * w, 0, (rng() - 0.5) * d, rng() * 3) });
  const m = new THREE.Mesh(mergeTextured(parts), MAT.stone);
  m.castShadow = m.receiveShadow = true;
  return { meshes: [m], boxes };
}

// Kirche mit quadratischem Turm und Spitzhelm (Sainte-Mère-Église)
export function buildChurch(x, z, y, ry) {
  initMaterials();
  const walls = [], roofs = [], dark = [];
  const rot = M4(x, y, z, ry);
  const T = (lx, ly, lz, r = 0, rx = 0, rz = 0) => rot.clone().multiply(M4(lx, ly, lz, r, rx, rz));
  const L = 26, W = 10, H = 9;
  walls.push({ geo: boxUV(W, H, L), matrix: T(0, H / 2 - 0.3, 0) });
  const gs = new THREE.Shape(); gs.moveTo(-W / 2, 0); gs.lineTo(W / 2, 0); gs.lineTo(0, 5.5); gs.closePath();
  const gg = new THREE.ExtrudeGeometry(gs, { depth: L, bevelEnabled: false }); gg.translate(0, 0, -L / 2);
  const uv = gg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
  walls.push({ geo: gg, matrix: T(0, H - 0.3, 0) });
  const ang = Math.atan2(5.5, W / 2), sl = Math.hypot(W / 2, 5.5) + 0.4;
  for (const sx of [-1, 1]) roofs.push({ geo: boxUV(sl, 0.2, L + 0.6), matrix: T(sx * W / 4, H + 2.75, 0, 0, 0, -sx * ang) });
  // Turm an der Westseite (-z)
  const TW = 6, TH = 22;
  walls.push({ geo: boxUV(TW, TH, TW), matrix: T(0, TH / 2 - 0.3, -L / 2 - TW / 2 + 0.5) });
  // Spitzhelm (Pyramide)
  const sp = new THREE.ConeGeometry(TW * 0.72, 11, 4, 1); sp.rotateY(Math.PI / 4);
  roofs.push({ geo: sp, matrix: T(0, TH + 5.2, -L / 2 - TW / 2 + 0.5) });
  // Fenster: Spitzbögen (vereinfacht)
  for (let i = 0; i < 5; i++) for (const sx of [-1, 1]) dark.push({ geo: geo.box(0.08, 3.2, 1.3), color: 0x101418, matrix: T(sx * (W / 2 + 0.03), 4.5, -L / 2 + 3 + i * 5) });
  for (const sx of [-1, 1]) dark.push({ geo: geo.box(0.08, 2.2, 1.0), color: 0x0c0c0c, matrix: T(sx * (TW / 2 + 0.03), TH - 3, -L / 2 - TW / 2 + 0.5) });
  dark.push({ geo: geo.box(1.0, 2.2, 0.08), color: 0x0c0c0c, matrix: T(0, TH - 3, -L / 2 - TW + 0.47) });
  dark.push({ geo: geo.box(2.2, 3.6, 0.1), color: 0x3a2a1c, matrix: T(0, 1.5, -L / 2 - TW + 0.45) });   // Portal
  const meshes = [
    new THREE.Mesh(mergeTextured(walls), MAT.stone),
    new THREE.Mesh(mergeTextured(roofs), MAT.slate),
    new THREE.Mesh(mergeColored(dark), MAT.vc),
  ];
  meshes.forEach((m) => { m.castShadow = m.receiveShadow = true; });
  const c = Math.cos(ry), s = Math.sin(ry);
  const tz = -L / 2 - TW / 2 + 0.5;
  return {
    meshes,
    boxes: [
      { x, z, hw: W / 2, hd: L / 2, rot: ry, y0: y - 1, y1: y + H + 4, kind: 'house' },
      { x: x + tz * s, z: z + tz * c, hw: TW / 2, hd: TW / 2, rot: ry, y0: y - 1, y1: y + TH + 8, kind: 'house' },
    ],
    tower: new THREE.Vector3(x + (tz) * s, y + TH - 3.6, z + tz * c),   // Scharfschützenplatz im Turm
  };
}

// Bunker (Kasematte) mit Schießscharte Richtung -z (lokal)
export function buildBunker(x, z, y, ry, size = 1) {
  initMaterials();
  const rot = M4(x, y, z, ry);
  const T = (lx, ly, lz, r = 0, rx = 0) => rot.clone().multiply(M4(lx * size, ly * size, lz * size, r, rx));
  const parts = [
    { geo: boxUV(7 * size, 3.2 * size, 6 * size), matrix: T(0, 1.2, 0) },
    { geo: boxUV(8 * size, 0.9 * size, 7 * size), matrix: T(0, 3.1, 0.2) },
    { geo: boxUV(2.2 * size, 2.6 * size, 3 * size), matrix: T(-4.2, 1.0, 1.4) },   // Seitenwand/Flankenschutz
  ];
  const dark = [{ geo: geo.box(3.2 * size, 0.7 * size, 0.2), color: 0x050505, matrix: T(0, 2.1, -3.05) }];
  const meshes = [new THREE.Mesh(mergeTextured(parts), MAT.concrete), new THREE.Mesh(mergeColored(dark), MAT.vc)];
  meshes.forEach((m) => { m.castShadow = m.receiveShadow = true; });
  const c = Math.cos(ry), s = Math.sin(ry);
  return {
    meshes,
    boxes: [{ x, z, hw: 3.5 * size, hd: 3 * size, rot: ry, y0: y - 1, y1: y + 3.6 * size, kind: 'bunker' }],
    // Schützenplatz hinter der Scharte
    gunPos: new THREE.Vector3(x - (-2.2 * size) * s, y + 1.0 * size, z + (-2.2 * size) * c),
  };
}

// Sandsack-Ring (MG-Nest)
export function buildSandbags(x, z, y, r = 1.8, open = 1.2, ry = 0) {
  initMaterials();
  const parts = [];
  const n = 14;
  for (let k = 0; k < 2; k++) for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + k * 0.2;
    if (Math.abs(((a + Math.PI) % (Math.PI * 2)) - Math.PI) < open / 2 + 0.1) continue;     // Öffnung nach hinten (+z)
    const aa = a + ry;
    parts.push({ geo: geo.box(0.6, 0.28, 0.35), color: k ? 0x8a7c5c : 0x7d7052, matrix: M4(x + Math.sin(aa) * r, y + 0.14 + k * 0.28, z - Math.cos(aa) * r, -aa) });
  }
  const m = new THREE.Mesh(mergeColored(parts), MAT.vc);
  m.castShadow = m.receiveShadow = true;
  return m;
}

// ================================================================ Fahrzeuge
// Panzer: Wanne, Laufwerk, Turm, Kanone; tiefe Detailstufe mit Vertexfarben
export const TANKS = {
  sherman: { name: 'M4 Sherman', side: 'us', len: 5.9, wid: 2.6, hgt: 2.0, hull: 0x4a5034, turretR: 1.0, gun: 3.0, gunR: 0.06, speed: 6.5, hp: 600, star: true },
  stug: { name: 'StuG III Ausf. G', side: 'de', len: 6.8, wid: 2.95, hgt: 1.6, hull: 0x8a7a50, casemate: true, gun: 3.4, gunR: 0.055, speed: 5.5, hp: 550, cross: true },
  pz4: { name: 'Panzer IV Ausf. H', side: 'de', len: 7.0, wid: 2.9, hgt: 1.75, hull: 0x8a7a50, turretR: 1.0, gun: 3.6, gunR: 0.05, speed: 5.5, hp: 580, schurzen: true, cross: true },
  h39: { name: 'Hotchkiss H39 (Beutepanzer)', side: 'de', len: 4.2, wid: 1.95, hgt: 1.4, hull: 0x6d6a4c, turretR: 0.75, gun: 1.4, gunR: 0.04, speed: 4.2, hp: 260, cross: true },
};
export function buildTank(type) {
  initMaterials();
  const S = TANKS[type] || TANKS.sherman;
  const L = S.len, W = S.wid, H = S.hgt;
  const hull = [], turret = [], gun = [];
  const col = S.hull;
  // Laufwerk
  for (const sx of [-1, 1]) {
    hull.push({ geo: geo.box(0.55, 0.85, L * 0.95), color: 0x2a2826, matrix: M4(sx * (W / 2 - 0.28), 0.45, 0) });
    const nw = Math.max(4, Math.round(L / 1.1));
    for (let i = 0; i < nw; i++) {
      const g = geo.cyl(0.3, 0.3, 0.14, 10); g.rotateZ(Math.PI / 2);
      hull.push({ geo: g, color: 0x3a3a36, matrix: M4(sx * (W / 2 + 0.01), 0.35, -L * 0.42 + i * (L * 0.84 / (nw - 1))) });
    }
    if (S.schurzen) hull.push({ geo: geo.box(0.05, 0.9, L * 0.8), color: col, matrix: M4(sx * (W / 2 + 0.12), 1.0, 0.1) });
  }
  // Wanne
  hull.push({ geo: geo.box(W * 0.78, H * 0.5, L * 0.92), color: col, matrix: M4(0, 0.75 + H * 0.12, 0) });
  hull.push({ geo: geo.box(W * 0.98, 0.12, L * 0.88), color: col, matrix: M4(0, 0.95 + H * 0.2, 0.05) });
  if (type === 'sherman') {
    // gerundete, geneigte Frontplatte
    hull.push({ geo: geo.box(W * 0.8, 1.0, 0.25), color: col, matrix: M4(0, 1.15, -L * 0.42, 0, 0.9) });
    hull.push({ geo: geo.box(W * 0.95, 0.5, L * 0.55), color: col, matrix: M4(0, 1.45, 0.25) });
  } else {
    hull.push({ geo: geo.box(W * 0.85, 0.6, L * 0.6), color: col, matrix: M4(0, 1.3, 0.1) });
  }
  const turretY = type === 'sherman' ? 1.95 : type === 'h39' ? 1.55 : 1.8;
  if (S.casemate) {
    // StuG: niedriger Kasemattenaufbau, Kanone in der Wanne
    hull.push({ geo: geo.box(W * 0.85, 0.7, L * 0.45), color: col, matrix: M4(0, 1.75, -0.3) });
    hull.push({ geo: geo.box(0.8, 0.6, 0.6), color: col, matrix: M4(-0.3, 1.8, -L * 0.25) });
  } else {
    turret.push({ geo: geo.cyl(S.turretR * 0.9, S.turretR, 0.75, 12), color: col, matrix: M4(0, 0.35, 0) });
    turret.push({ geo: geo.box(S.turretR * 1.2, 0.5, S.turretR * 1.2), color: col, matrix: M4(0, 0.35, 0.35) });
    turret.push({ geo: geo.cyl(0.3, 0.32, 0.3, 10), color: col, matrix: M4(0.3, 0.85, 0.2) });    // Kommandantenkuppel
    if (S.schurzen) turret.push({ geo: geo.cyl(S.turretR * 1.25, S.turretR * 1.25, 0.65, 10, 1), color: col, matrix: M4(0, 0.35, 0.1) });
  }
  // Kanone
  const gl = S.gun;
  const gg = geo.cyl(S.gunR, S.gunR * 1.2, gl, 8); gg.rotateX(Math.PI / 2);
  gun.push({ geo: gg, color: 0x34352e, matrix: M4(0, 0, -gl / 2) });
  gun.push({ geo: geo.box(0.5, 0.4, 0.5), color: col, matrix: M4(0, 0, 0) });
  if (type === 'pz4' || type === 'stug') { const mb = geo.cyl(S.gunR * 1.8, S.gunR * 1.8, 0.35, 8); mb.rotateX(Math.PI / 2); gun.push({ geo: mb, color: 0x34352e, matrix: M4(0, 0, -gl) }); }
  // Hoheitsabzeichen: weißer Stern (US) bzw. Balkenkreuz (DE)
  const mark = [];
  if (S.star) { mark.push({ geo: geo.cyl(0.42, 0.42, 0.02, 5), color: 0xe8e4d8, matrix: M4(W / 2 - 0.02, 1.3, 0.3, 0, 0, Math.PI / 2) }); mark.push({ geo: geo.cyl(0.42, 0.42, 0.02, 5), color: 0xe8e4d8, matrix: M4(-W / 2 + 0.02, 1.3, 0.3, 0, 0, Math.PI / 2) }); }
  if (S.cross) for (const sx of [-1, 1]) {
    mark.push({ geo: geo.box(0.02, 0.5, 0.16), color: 0xe8e8e8, matrix: M4(sx * (W / 2 + 0.16), 1.15, 0.6) });
    mark.push({ geo: geo.box(0.02, 0.16, 0.5), color: 0xe8e8e8, matrix: M4(sx * (W / 2 + 0.16), 1.15, 0.6) });
    mark.push({ geo: geo.box(0.025, 0.38, 0.08), color: 0x111111, matrix: M4(sx * (W / 2 + 0.165), 1.15, 0.6) });
    mark.push({ geo: geo.box(0.025, 0.08, 0.38), color: 0x111111, matrix: M4(sx * (W / 2 + 0.165), 1.15, 0.6) });
  }
  const root = new THREE.Group();
  const hm = new THREE.Mesh(mergeColored(hull.concat(mark)), MAT.metal);
  root.add(hm);
  const tG = new THREE.Group(); tG.position.y = turretY; root.add(tG);
  if (turret.length) tG.add(new THREE.Mesh(mergeColored(turret), MAT.metal));
  const gG = new THREE.Group();
  gG.position.set(0, S.casemate ? 0 : 0.35, S.casemate ? -L * 0.25 : -S.turretR * 0.8);
  if (S.casemate) { gG.position.y = -0.1; }
  tG.add(gG);
  gG.add(new THREE.Mesh(mergeColored(gun), MAT.metal));
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return { root, turret: tG, gun: gG, spec: S, muzzleLen: gl };
}

// Geschütze: Flak 38 (2 cm), leFH 18 (10,5 cm), 155-mm-Kanone, Pak 40
export function buildGun(kind) {
  initMaterials();
  const p = [];
  const g = (s) => s;
  const grey = kind === 'flak' ? 0x6e6a58 : 0x5d5c4c;
  if (kind === 'flak') {
    p.push({ geo: geo.box(2.2, 0.15, 2.2), color: 0x4a4a40, matrix: M4(0, 0.3, 0) });        // Kreuzlafette
    p.push({ geo: geo.cyl(0.35, 0.45, 0.6, 10), color: grey, matrix: M4(0, 0.7, 0) });
    p.push({ geo: geo.box(1.0, 0.7, 0.05), color: grey, matrix: M4(0, 1.2, -0.25) });        // Schutzschild
    const b = geo.cyl(0.04, 0.05, 2.2, 8); b.rotateX(Math.PI / 2);
    p.push({ geo: b, color: 0x2a2a28, matrix: M4(0.1, 1.25, -0.9, 0, 0.6) });
    p.push({ geo: geo.box(0.2, 0.3, 0.6), color: grey, matrix: M4(0.1, 1.1, 0.0, 0, 0.6) });
  } else if (kind === 'lefh' || kind === 'pak') {
    const big = kind === 'lefh';
    for (const sx of [-1, 1]) { const w = geo.cyl(0.6, 0.6, 0.18, 14); w.rotateZ(Math.PI / 2); p.push({ geo: w, color: 0x2a2a28, matrix: M4(sx * 0.9, 0.6, 0) }); }
    p.push({ geo: geo.box(1.8, 1.0, 0.07), color: grey, matrix: M4(0, 1.2, -0.3, 0, -0.1) });           // Schild
    const b = geo.cyl(big ? 0.09 : 0.06, big ? 0.11 : 0.07, big ? 2.9 : 3.2, 10); b.rotateX(Math.PI / 2);
    p.push({ geo: b, color: 0x3a3a34, matrix: M4(0, 1.05, -1.6, 0, big ? 0.25 : 0.03) });
    p.push({ geo: geo.box(0.45, 0.4, 1.2), color: grey, matrix: M4(0, 1.0, 0.1, 0, big ? 0.25 : 0.03) });
    for (const sx of [-1, 1]) p.push({ geo: geo.box(0.14, 0.14, 3.2), color: grey, matrix: M4(sx * 0.6, 0.35, 1.7, sx * 0.3, -0.1) });  // Holme
  } else { // 155-mm GPF
    for (const sx of [-1, 1]) { const w = geo.cyl(0.75, 0.75, 0.25, 14); w.rotateZ(Math.PI / 2); p.push({ geo: w, color: 0x2a2a28, matrix: M4(sx * 1.1, 0.75, 0) }); }
    const b = geo.cyl(0.13, 0.17, 5.5, 10); b.rotateX(Math.PI / 2);
    p.push({ geo: b, color: 0x3a3a34, matrix: M4(0, 1.4, -2.4, 0, 0.18) });
    p.push({ geo: geo.box(0.7, 0.6, 2.0), color: grey, matrix: M4(0, 1.2, 0.1, 0, 0.18) });
    for (const sx of [-1, 1]) p.push({ geo: geo.box(0.2, 0.2, 4.4), color: grey, matrix: M4(sx * 0.8, 0.4, 2.4, sx * 0.25, -0.08) });
  }
  const m = new THREE.Mesh(mergeColored(p.map(g)), MAT.metal);
  m.castShadow = true;
  const root = new THREE.Group(); root.add(m);
  return root;
}

// Strandhindernisse: Tschechenigel (drei gekreuzte Stahlträger), Holzpfahl mit Tellermine
export function hedgehogGeo() {
  const p = [];
  for (let i = 0; i < 3; i++) {
    const b = geo.box(0.2, 2.4, 0.2);
    const m = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(i === 0 ? 0.95 : 0, i === 1 ? 0 : 0, i === 2 ? 0.95 : -0.95));
    m.multiply(new THREE.Matrix4().makeRotationY(i * 1.05));
    m.setPosition(0, 0.75, 0);
    p.push({ geo: b, color: 0x3d3430, matrix: m });
  }
  return mergeColored(p);
}
export function stakeGeo() {
  const g = geo.cyl(0.12, 0.14, 3.2, 6); const p = [{ geo: g, color: 0x5d4b38, matrix: M4(0, 1.2, 0, 0, 0.5) }];
  p.push({ geo: geo.cyl(0.17, 0.17, 0.1, 10), color: 0x4c4d3a, matrix: M4(0, 2.55, -0.75, 0, 0.5) });
  return mergeColored(p);
}
// Stacheldrahtrolle (Ziehharmonika)
export function wireGeo(len) {
  const p = [];
  const n = Math.max(3, Math.round(len / 0.5));
  for (let i = 0; i < n; i++) {
    const t = new THREE.TorusGeometry(0.45, 0.012, 3, 10);
    p.push({ geo: t, color: 0x4a4440, matrix: M4(0, 0.45, -len / 2 + i * (len / (n - 1)), 0, 0.25) });
  }
  return mergeColored(p);
}

// ================================================================ Flugzeuge
// C-47 Skytrain mit Invasionsstreifen, P-47 Thunderbolt
const PLANE_GEO = {};
export function buildPlane(kind) {
  initMaterials();
  if (!PLANE_GEO[kind]) PLANE_GEO[kind] = planeGeo(kind);
  const g = new THREE.Group(); g.add(new THREE.Mesh(PLANE_GEO[kind], MAT.vcStd));
  return g;
}
function planeGeo(kind) {
  const p = [];
  const od = 0x4b4e36, stripeW = 0xe8e8e0, stripeB = 0x111111;
  const stripes = (cx, span, chord, y, z) => {
    for (let i = 0; i < 5; i++) {
      const c = i % 2 ? stripeB : stripeW;
      for (const sx of [-1, 1]) p.push({ geo: geo.box(chord * 0.18, 0.05, span * 0.04), color: c, matrix: M4(cx + sx * span * 0.22, y + 0.01, z - 0.4 + i * chord * 0.16, Math.PI / 2) });
    }
  };
  if (kind === 'c47') {
    const fus = geo.cyl(1.25, 1.0, 19, 12); fus.rotateX(Math.PI / 2);
    p.push({ geo: fus, color: od, matrix: M4(0, 0, 0) });
    p.push({ geo: geo.sph(1.25, 12, 8), color: od, matrix: M4s(0, 0, -9.5, 0, 1, 1, 1.6) });
    const tail = geo.cyl(1.0, 0.25, 4, 10); tail.rotateX(Math.PI / 2); p.push({ geo: tail, color: od, matrix: M4(0, 0.2, 11.5) });
    p.push({ geo: geo.box(29, 0.35, 4.2), color: od, matrix: M4(0, -0.4, -1.5) });                 // Tragflächen
    p.push({ geo: geo.box(10, 0.2, 2.4), color: od, matrix: M4(0, 0.4, 12.5) });                   // Höhenleitwerk
    p.push({ geo: geo.box(0.2, 3.8, 3.0), color: od, matrix: M4(0, 2.2, 12.8) });                   // Seitenleitwerk
    for (const sx of [-1, 1]) {
      const n = geo.cyl(0.85, 0.75, 3.2, 10); n.rotateX(Math.PI / 2);
      p.push({ geo: n, color: od, matrix: M4(sx * 5.6, -0.2, -2.6) });
      p.push({ geo: geo.cyl(0.12, 0.12, 3.4, 4), color: 0x222222, matrix: M4(sx * 5.6, -0.2, -4.3, 0, Math.PI / 2, 0) });   // Propeller (Scheibe)
    }
    // Invasionsstreifen um den Rumpf
    for (let i = 0; i < 5; i++) { const r = geo.cyl(1.07, 1.07, 0.45, 12); r.rotateX(Math.PI / 2); p.push({ geo: r, color: i % 2 ? stripeB : stripeW, matrix: M4(0, 0, 7.4 + i * 0.45) }); }
    stripes(0, 29, 4.2, -0.2, -2.2);
  } else {
    // P-47 Thunderbolt
    const fus = geo.cyl(0.75, 0.45, 9.5, 12); fus.rotateX(Math.PI / 2);
    p.push({ geo: fus, color: od, matrix: M4(0, 0, 0.6) });
    const cowl = geo.cyl(0.8, 0.82, 1.4, 14); cowl.rotateX(Math.PI / 2); p.push({ geo: cowl, color: od, matrix: M4(0, 0, -4.6) });
    p.push({ geo: geo.cyl(0.07, 0.07, 3.8, 4), color: 0x222222, matrix: M4(0, 0, -5.4, 0, Math.PI / 2, 0) });
    p.push({ geo: geo.sph(0.45, 10, 6), color: 0x334455, matrix: M4s(0, 0.7, -0.8, 0, 1, 0.8, 1.8) });     // Kanzel
    p.push({ geo: geo.box(12.4, 0.25, 2.4), color: od, matrix: M4(0, -0.35, -1.0) });
    p.push({ geo: geo.box(4.8, 0.15, 1.4), color: od, matrix: M4(0, 0.1, 4.9) });
    p.push({ geo: geo.box(0.15, 1.9, 1.6), color: od, matrix: M4(0, 0.95, 5.0) });
    for (let i = 0; i < 5; i++) { const r = geo.cyl(0.62, 0.62, 0.3, 10); r.rotateX(Math.PI / 2); p.push({ geo: r, color: i % 2 ? stripeB : stripeW, matrix: M4(0, 0, 3.0 + i * 0.3) }); }
    stripes(0, 12.4, 2.4, -0.2, -1.6);
  }
  return mergeColored(p);
}

// Landungsboot LCVP (Higgins-Boot) mit Bugklappe (ramp)
export function buildBoat() {
  initMaterials();
  const p = [];
  const gr = 0x5c6466;
  p.push({ geo: geo.box(3.2, 1.0, 10.5), color: 0x4a5254, matrix: M4(0, 0.3, 0.2) });
  for (const sx of [-1, 1]) p.push({ geo: geo.box(0.12, 1.6, 10.5), color: gr, matrix: M4(sx * 1.6, 1.3, 0.2) });
  p.push({ geo: geo.box(3.2, 1.6, 0.15), color: gr, matrix: M4(0, 1.3, 5.4) });
  p.push({ geo: geo.box(1.4, 1.0, 1.4), color: gr, matrix: M4(0.8, 2.4, 4.6) });   // Steuerstand
  const hull = new THREE.Mesh(mergeColored(p), MAT.vcStd);
  const ramp = new THREE.Mesh(mergeColored([{ geo: geo.box(3.2, 2.2, 0.15), color: gr, matrix: M4(0, 1.1, 0) }]), MAT.vcStd);
  const rampPivot = new THREE.Group(); rampPivot.position.set(0, 0, -5.0); rampPivot.add(ramp);
  const g = new THREE.Group(); g.add(hull, rampPivot);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { root: g, ramp: rampPivot };
}

// Fallschirm (Kappe + Leinen)
let CHUTE = null;
export function buildChute(od = false) {
  initMaterials();
  if (!CHUTE) {
    const pts = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * 2.7, 6.4, Math.sin(a) * 2.7), new THREE.Vector3(0, 1.6, 0)); }
    CHUTE = { canopy: new THREE.SphereGeometry(3.4, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2.4), lines: new THREE.BufferGeometry().setFromPoints(pts), lmat: new THREE.LineBasicMaterial({ color: 0x777766 }) };
  }
  const g = new THREE.Group();
  const canopy = new THREE.Mesh(CHUTE.canopy, od ? MAT.chuteOD : MAT.chute);
  canopy.scale.y = 0.55; canopy.position.y = 6.5;
  g.add(canopy);
  g.add(new THREE.LineSegments(CHUTE.lines, CHUTE.lmat));
  return g;
}

// Flagge an Mast (für Ziel "flag")
export function buildFlagpole(kind) {
  initMaterials();
  const g = new THREE.Group();
  const pole = new THREE.Mesh(geo.cyl(0.05, 0.06, 7, 6), new THREE.MeshLambertMaterial({ color: 0xcccccc }));
  pole.position.y = 3.5; g.add(pole);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.0, 8, 1), new THREE.MeshLambertMaterial({ map: tex(kind === 'us' ? 'flag_us' : 'flag_fr'), side: THREE.DoubleSide }));
  flag.position.set(0.9, 1.0, 0); g.add(flag);
  g.userData.flag = flag;
  return g;
}

// Funkgerät-Rucksack (SCR-300 / Feldfunk) für den Funker – als Zusatz am Torso
export function radioPack(side) {
  initMaterials();
  const p = [{ geo: geo.box(0.3, 0.42, 0.16), color: side === 'us' ? 0x55583c : 0x4a4e44, matrix: M4(0, 0.3, 0.2) }, { geo: geo.cyl(0.006, 0.006, 1.2, 4), color: 0x222222, matrix: M4(0.1, 1.0, 0.24) }];
  return new THREE.Mesh(mergeColored(p), MAT.vc);
}
