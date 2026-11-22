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
  // Innenschale (Helmfutter) mitdrehen, damit der Helm von unten nicht durchsichtig ist
  const last = pts[pts.length - 1];
  pts = pts.concat([[last[0] - 0.004, last[1] + 0.03], [0.118, 0.07], [0.095, 0.115], [0.05, 0.135], [0, 0.14]]);
  const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 16);
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
  const cap = (r, l, sx = 1, sz = 1) => { const g = new THREE.CapsuleGeometry(r, l, 3, 10); g.scale(sx, 1, sz); return g; };
  const de = !!(U.stiefel || U.fj);
  // Rumpf: abgerundet, Jacke mit Schößen, Kragen, Koppel, Taschen
  const torso = [
    { geo: cap(0.165, 0.3, 1.08, 0.66), color: U.jacket, matrix: M4(0, 0.29, 0) },
    { geo: geo.cyl(0.19, 0.2, 0.16, 12), color: U.jacket, matrix: M4s(0, 0.02, 0, 0, 1, 1, 0.68) },          // Jackenschöße
    { geo: geo.cyl(0.07, 0.085, 0.07, 10), color: U.jacket, matrix: M4(0, 0.535, -0.005) },                      // Kragen
    { geo: geo.cyl(0.183, 0.183, 0.055, 12), color: U.web, matrix: M4s(0, 0.075, 0, 0, 1, 1, 0.7) },          // Koppel
    { geo: geo.box(0.05, 0.045, 0.02), color: de ? 0x8a8a80 : 0x9a8a5a, matrix: M4(0, 0.075, -0.13) },        // Koppelschloss
    { geo: geo.box(0.05, 0.42, 0.02), color: U.web, matrix: M4(0.09, 0.32, -0.112, 0, 0, 0.1) },               // Trageriemen vorn
    { geo: geo.box(0.05, 0.42, 0.02), color: U.web, matrix: M4(-0.09, 0.32, -0.112, 0, 0, -0.1) },
    { geo: geo.box(0.07, 0.07, 0.02), color: U.jacket, matrix: M4(0.085, 0.36, -0.118) },                      // Brusttaschen
    { geo: geo.box(0.07, 0.07, 0.02), color: U.jacket, matrix: M4(-0.085, 0.36, -0.118) },
    { geo: geo.box(0.26, 0.3, 0.12), color: U.pack, matrix: M4(0, 0.32, 0.16) },                                // Gepäck
    { geo: geo.cyl(0.06, 0.06, 0.26, 8), color: U.pack, matrix: M4(0, 0.5, 0.17, 0, 0, Math.PI / 2) },          // Deckenrolle
    { geo: geo.cyl(0.055, 0.06, 0.08, 10), color: U.skin, matrix: M4(0, 0.585, -0.01) },                        // Hals
  ];
  if (de) {
    torso.push({ geo: geo.box(0.17, 0.15, 0.07), color: 0x6c6146, matrix: M4(-0.17, 0.0, 0.1) });               // Brotbeutel
    const gm = geo.cyl(0.055, 0.055, 0.27, 12); gm.rotateZ(0.15);
    torso.push({ geo: gm, color: 0x5a6150, matrix: M4(0.12, 0.04, 0.21) });                                      // Gasmaskenbüchse
    for (let k = 0; k < 4; k++) torso.push({ geo: geo.cyl(0.058, 0.058, 0.01, 12), color: 0x4a5144, matrix: M4(0.12 + Math.sin(0.15) * (k - 1.5) * 0.06, 0.04 + (k - 1.5) * 0.06, 0.21) });
    for (const sx of [-1, 1]) torso.push({ geo: geo.box(0.1, 0.09, 0.055), color: 0x1d1a17, matrix: M4(sx * 0.1, 0.12, -0.135) });   // Patronentaschen
    torso.push({ geo: geo.cyl(0.07, 0.07, 0.12, 10), color: 0x4c4a3a, matrix: M4(0.16, 0.2, 0.16, 0, Math.PI / 2) });                  // Kochgeschirr
    torso.push({ geo: geo.box(0.05, 0.2, 0.04), color: 0x3a2a1a, matrix: M4(-0.19, 0.0, 0.0) });                // Spaten
  } else {
    for (let k = 0; k < 5; k++) torso.push({ geo: geo.box(0.055, 0.07, 0.04), color: U.web, matrix: M4(-0.14 + k * 0.07, 0.07, -0.14) });  // Patronengurt-Taschen
    torso.push({ geo: geo.cyl(0.05, 0.05, 0.16, 10), color: 0x5e5e46, matrix: M4(-0.2, -0.0, 0.06) });         // Feldflasche
    torso.push({ geo: geo.box(0.06, 0.16, 0.04), color: 0x5a5a40, matrix: M4(0.19, -0.01, 0.04) });             // Spaten
    torso.push({ geo: geo.box(0.04, 0.12, 0.03), color: 0x3a3a30, matrix: M4(0.17, 0.42, -0.1, 0, 0, 0.3) });   // Verbandpäckchen am Riemen
  }
  if (U.diamond) torso.push({ geo: geo.box(0.02, 0.06, 0.12), color: U.diamond, matrix: M4(0, 0.36, 0.25) });
  // Kopf mit Gesicht
  const head = [
    { geo: geo.sph(0.1, 14, 12), color: U.skin, matrix: M4s(0, 0.1, 0, 0, 0.93, 1.1, 1) },
    { geo: geo.box(0.026, 0.045, 0.035), color: U.skin, matrix: M4(0, 0.095, -0.097, 0, 0.25) },                 // Nase
    { geo: geo.box(0.022, 0.01, 0.01), color: 0x2a2018, matrix: M4(0.035, 0.125, -0.092) },                       // Augen
    { geo: geo.box(0.022, 0.01, 0.01), color: 0x2a2018, matrix: M4(-0.035, 0.125, -0.092) },
    { geo: geo.box(0.03, 0.007, 0.008), color: 0x5a3a2a, matrix: M4(0.035, 0.142, -0.094) },                      // Brauen
    { geo: geo.box(0.03, 0.007, 0.008), color: 0x5a3a2a, matrix: M4(-0.035, 0.142, -0.094) },
    { geo: geo.box(0.04, 0.008, 0.01), color: 0x7a4a3a, matrix: M4(0, 0.055, -0.093) },                           // Mund
    { geo: geo.sph(0.022, 6, 5), color: U.skin, matrix: M4s(0.095, 0.105, 0.0, 0, 0.5, 1, 0.8) },                // Ohren
    { geo: geo.sph(0.022, 6, 5), color: U.skin, matrix: M4s(-0.095, 0.105, 0.0, 0, 0.5, 1, 0.8) },
    // kurze Haare an Hinterkopf und Seiten (statt Kopfhaut unter dem Helmrand)
    { geo: new THREE.SphereGeometry(0.104, 14, 8, Math.PI / 2 - 1.95, 3.9, 0, 1.75), color: U.hair || 0x3a2a1c, matrix: M4s(0, 0.103, 0.004, 0, 0.94, 1.1, 1.02) },
    { geo: helmetGeo(U.fj ? 'fj' : U.stiefel ? 'stahl' : 'm1'), color: U.helmet, matrix: M4(0, 0.118, 0.008) },
    { geo: geo.box(0.17, 0.012, 0.012), color: 0x2a2a2a, matrix: M4(0, 0.03, -0.06) },                             // Kinnriemen
  ];
  if (U.net) head.push({ geo: geo.sph(0.152, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), color: 0x3d3f2a, matrix: M4s(0, 0.133, 0.008, 0, 1, 0.75, 1) });
  const upperArm = [{ geo: cap(0.052, 0.22), color: U.jacket, matrix: M4(0, -0.15, 0) }];
  const foreArm = [
    { geo: cap(0.046, 0.19), color: U.jacket, matrix: M4(0, -0.13, 0) },
    { geo: geo.cyl(0.05, 0.05, 0.03, 10), color: U.jacket, matrix: M4(0, -0.24, 0) },                             // Ärmelaufschlag
    { geo: cap(0.035, 0.05, 1.1, 0.75), color: U.skin, matrix: M4(0, -0.29, -0.005) },                            // Hand
  ];
  const thigh = [{ geo: cap(0.078, 0.3), color: U.pants, matrix: M4(0, -0.22, 0) }];
  if (U.net || U.fj) thigh.push({ geo: geo.box(0.05, 0.13, 0.11), color: U.pants, matrix: M4(0.075, -0.22, -0.01) });   // Beintasche (Fallschirmjäger)
  const shin = [{ geo: cap(0.062, 0.28), color: U.legs, matrix: M4(0, -0.2, 0) }];
  if (U.stiefel) shin.push({ geo: geo.cyl(0.072, 0.066, 0.3, 10), color: 0x1a1918, matrix: M4(0, -0.27, 0) });   // Marschstiefel
  else shin.push({ geo: geo.cyl(0.07, 0.068, 0.17, 10), color: U.legs === U.pants ? U.boots : 0xa69a74, matrix: M4(0, -0.33, 0) });   // Gamaschen / Springerstiefel
  shin.push({ geo: geo.box(0.11, 0.07, 0.2), color: U.boots, matrix: M4(0, -0.43, -0.035) });
  shin.push({ geo: geo.sph(0.056, 8, 6), color: U.boots, matrix: M4s(0, -0.43, -0.13, 0, 1, 0.65, 1) });         // Stiefelspitze
  const parts = {};
  for (const [k, v] of Object.entries({ torso, head, upperArm, foreArm, thigh, shin })) parts[k] = mergeColored(v);
  // Fernansicht: eine einzige Figur
  const far = [];
  const push = (list, m) => list.forEach((p) => far.push({ geo: p.geo, color: p.color, matrix: m.clone().multiply(p.matrix) }));
  push(torso, M4(0, 0.95, 0)); push(head, M4(0, 1.5, 0));
  push(thigh, M4(0.1, 0.97, 0)); push(thigh, M4(-0.1, 0.97, 0)); push(shin, M4(0.1, 0.53, 0)); push(shin, M4(-0.1, 0.53, 0));
  push(upperArm, M4(0.24, 1.42, 0, 0, 1.0, 0)); push(upperArm, M4(-0.24, 1.42, 0, 0, 1.0, 0));
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
    // Oberarme nach vorn zur Waffe (positive X-Drehung), Unterarme angewinkelt, Hände zur Mitte
    this.armR.g.rotation.set(1.15, 0, -0.12); this.armR.el.rotation.set(0.55, 0, 0);
    this.armL.g.rotation.set(pistol ? 1.35 : 1.25, 0, pistol ? 0.45 : 0.35); this.armL.el.rotation.set(pistol ? 0.25 : 0.45, 0, 0);
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
      for (let i = 0; i < 2; i++) { this.legs[i].th.rotation.x = (i ? -s : s) * amp * 0.4; this.legs[i].sh.rotation.x = -0.1; }
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
      // Knie zeigen nach vorn: Oberschenkel positiv (nach vorn), Unterschenkel negativ (beugt nach hinten)
      if (crouch) { this.legs[i].th.rotation.x = 1.1 + ph * amp * 0.5 - (i ? 0.5 : 0); this.legs[i].sh.rotation.x = -(1.6 - (i ? 0.6 : 0)); }
      else { this.legs[i].th.rotation.x = ph * amp * 0.7; this.legs[i].sh.rotation.x = -(Math.max(0, -Math.cos(this.walk + (i ? Math.PI : 0))) * amp * 1.1 + 0.05); }
    }
    this.aim.rotation.x = pitch - this.torso.rotation.x - firing * 0.04;
  }

  // Fallen nach einem Treffer (prozedural, ohne Ragdoll-Physik): Knie knicken ein, der Körper kippt mit
  // zunehmender Geschwindigkeit (Schwerkraft) in Trefferrichtung, prallt kurz auf und bleibt schlaff liegen.
  // P: { ax, az (Endneigung vorne/hinten bzw. seitlich), tw (Verdrehung), dur, knee, head, blast:[lx,lz,weit] }
  fall(t, P) {
    const D = P.dur;
    const k1 = smooth01(t / (D * 0.38));                     // Einknicken
    const k2 = Math.min(1, Math.max(0, (t - D * 0.15) / (D * 0.85)));
    const g2 = k2 * k2;                                       // Kippen (beschleunigt)
    const tb = t - D;                                         // Aufprall: kleines Nachfedern
    const bounce = tb > 0 ? Math.sin(tb * 20) * Math.exp(-tb * 10) * 0.07 : 0;
    const a = g2 - bounce;
    if (this.lod) {
      this.far.rotation.set(P.ax * a, P.tw * k2, P.az * a);
      this.far.position.y = 0.1 * k2;
      return;
    }
    this.far.rotation.set(0, 0, 0); this.far.position.y = 0;
    this.body.rotation.set(P.ax * a, P.tw * k2, P.az * a, 'YXZ');
    // Explosion: wird weggeschleudert (Flugbogen)
    if (P.blast) {
      const kb = Math.min(1, t / (D * 0.8)), fly = Math.sin(Math.PI * kb) * 0.7 * P.blast[2] / 2;
      this.body.position.set(P.blast[0] * P.blast[2] * smooth01(kb), 0.1 + fly, P.blast[1] * P.blast[2] * smooth01(kb));
    } else this.body.position.set(0, 0.1 * k2, 0);
    // Hüfte sackt ab, Beine knicken ein und strecken sich im Liegen wieder etwas
    this.hips.position.y = 0.95 - 0.42 * k1 + 0.05 * k2;
    for (let i = 0; i < 2; i++) {
      const L = this.legs[i], side = i ? 0.25 : -0.1;
      L.th.rotation.x = P.knee * k1 * (1 - 0.7 * k2) + side * k2;          // Knie nach vorn
      L.sh.rotation.x = -(P.knee * 1.7 * k1 * (1 - 0.6 * k2) + 0.1);     // Unterschenkel nach hinten
    }
    // Oberkörper sackt zusammen, Kopf fällt zur Seite bzw. nach hinten
    this.torso.rotation.x = -0.45 * k1 * (1 - k2) + (P.ax > 0 ? 0.15 : -0.1) * k2;
    this.headG.rotation.set(P.head * 0.6 * k2, P.head * 0.9 * k2, 0);
    // Arme werden schlaff
    this.aim.rotation.x = 0.9 * k1 * (1 - 0.6 * k2) + (P.ax > 0 ? -0.8 : 0.4) * k2;
    for (const arm of [this.armR, this.armL]) {
      const o = arm.rest || (arm.rest = arm.g.rotation.clone());
      const out = Math.sign(arm.g.position.x || 1) * (0.5 + 0.4 * Math.abs(P.az));
      arm.g.rotation.x = o.x + (0.3 - o.x) * k2;
      arm.g.rotation.z = o.z + (out - o.z) * k2;
      arm.el.rotation.x = 0.55 * (1 - k2) + 0.2 * k2;
    }
  }
  // zurück in die normale Haltung (nach dem Verarzten)
  resetPose() {
    this.body.rotation.set(0, 0, 0); this.body.position.set(0, 0, 0); this.hips.position.y = 0.95;
    this.torso.rotation.set(0, 0, 0); this.headG.rotation.set(0, 0, 0); this.aim.rotation.set(0, 0, 0);
    this.far.rotation.set(0, 0, 0); this.far.position.y = 0;
    for (const L of this.legs) { L.th.rotation.set(0, 0, 0); L.sh.rotation.set(0, 0, 0); }
    this.armR.rest = this.armL.rest = null;
    this.setWeapon(this.weaponId);
  }

  setLod(far) {
    if (this.lod === far) return;
    this.lod = far;
    this.body.visible = !far;
    this.far.visible = !!far;
  }

  dispose() { this.root.removeFromParent(); }
}

const smooth01 = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };

// Fallart aus Trefferrichtung (dir: Flugrichtung des Geschosses in Weltkoordinaten), Blickrichtung yaw
export function fallParams(yaw, dir, head, blast, rnd = Math.random) {
  let lx = 0, lz = 0;
  if (dir && (dir.x || dir.z)) { const c = Math.cos(yaw), s = Math.sin(yaw), L = Math.hypot(dir.x, dir.z) || 1; lx = (dir.x * c - dir.z * s) / L; lz = (dir.x * s + dir.z * c) / L; }
  const P = { ax: 0, az: 0, tw: (rnd() - 0.5) * 1.2, dur: 0.85 + rnd() * 0.45, knee: 0.9 + rnd() * 0.5, head: (rnd() - 0.5) * 1.4, blast: null };
  const lie = 1.42 + rnd() * 0.12;
  let mode;
  if (blast) mode = 'blast';
  else if (head) mode = rnd() < 0.7 ? 'crumple' : (lz > 0.3 ? 'back' : 'side');
  else { const r = rnd(); mode = r < 0.4 ? 'crumple' : lz > 0.35 ? 'back' : lz < -0.35 ? 'fwd' : 'side'; }
  if (mode === 'crumple') { P.ax = -lie; P.az = (rnd() - 0.5) * 0.5; P.dur *= head ? 0.7 : 1; P.knee += 0.3; }
  else if (mode === 'fwd') { P.ax = -lie; P.dur *= 0.9; }
  else if (mode === 'back') { P.ax = lie; P.knee *= 0.6; }
  else if (mode === 'side') { P.az = (lx > 0 ? -1 : 1) * lie; P.ax = (rnd() - 0.5) * 0.4; P.tw *= 1.5; }
  else { // Explosion: weg vom Einschlag, meist auf den Rücken
    const back = lz > 0 ? 1 : -1;
    P.ax = back * lie; P.az = (rnd() - 0.5) * 0.8; P.dur = 0.7 + rnd() * 0.3; P.knee = 0.4;
    P.blast = [lx || (rnd() - 0.5), lz || 0.5, 0.8 + rnd() * 1.4];
  }
  return P;
}

// ================================================================ Gebäude
// Normannisches Bruchsteinhaus mit steilem Schieferdach. Liefert { meshes, boxes } (Kollisionsquader)
const _dir = new THREE.Vector3();
// ---------------------------------------------------------------- begehbare Gebäude
// Wandstücke um Öffnungen (Türen, Fenster): u entlang der Wand, v Höhe. Öffnungen gleicher Spalte (u) werden gestapelt.
function wallPieces(len, v0, v1, ops) {
  const cols = [];
  for (const o of ops) { let c = cols.find((k) => Math.abs(k.u - o.u) < 0.01); if (!c) cols.push(c = { u: o.u, w: o.w, list: [] }); c.w = Math.max(c.w, o.w); c.list.push(o); }
  cols.sort((p, q) => p.u - q.u);
  const out = [];
  const push = (a, b, c0, c1) => { if (b - a > 0.02 && c1 - c0 > 0.02) out.push({ u: (a + b) / 2, w: b - a, v0: c0, v1: c1 }); };
  let cur = -len / 2;
  for (const c of cols) {
    const a = Math.max(cur, c.u - c.w / 2), b = c.u + c.w / 2;
    push(cur, a, v0, v1);
    c.list.sort((p, q) => p.v0 - q.v0);
    let vc = v0;
    for (const o of c.list) { push(a, b, vc, o.v0); vc = Math.max(vc, o.v1); }
    push(a, b, vc, v1);
    cur = b;
  }
  push(cur, len / 2, v0, v1);
  return out;
}

// Gebäude-Helfer: lokale Koordinaten (x quer, z tief, y ab Fußboden) → Geometrie, Kollisionsquader, begehbare Flächen
function bldg(x, y, z, ry) {
  const rot = M4(x, y, z, ry), c = Math.cos(ry), s = Math.sin(ry);
  const B = {
    T: (lx, ly, lz, r = 0, rx = 0, rz = 0) => rot.clone().multiply(M4(lx, ly, lz, r, rx, rz)),
    wx: (lx, lz) => x + lx * c + lz * s, wz: (lx, lz) => z - lx * s + lz * c,
    boxes: [], walks: [],
    box(lx, lz, hw, hd, v0, v1, kind = 'house') { B.boxes.push({ x: B.wx(lx, lz), z: B.wz(lx, lz), hw, hd, rot: ry, y0: y + v0, y1: y + v1, kind }); },
    walk(x0, x1, z0, z1, h) { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; B.walks.push({ x: B.wx(cx, cz), z: B.wz(cx, cz), hw: (x1 - x0) / 2, hd: (z1 - z0) / 2, rot: ry, y: y + h, house: true }); },
    // Wand aus Stücken; alongX: Wand verläuft entlang x
    wall(list, cx, cz, alongX, len, t, v0, v1, ops, color = 0xffffff, collide = true) {
      for (const p of wallPieces(len, v0, v1, ops)) {
        const h = p.v1 - p.v0, ly = (p.v0 + p.v1) / 2;
        const lx = alongX ? cx + p.u : cx, lz = alongX ? cz : cz + p.u;
        const gx = alongX ? p.w : t, gz = alongX ? t : p.w;
        list.push({ geo: boxUV(gx, h, gz), color, matrix: B.T(lx, ly, lz) });
        if (collide) B.box(lx, lz, gx / 2, gz / 2, p.v0, p.v1);
      }
    },
  };
  return B;
}

// Stufen vor einer Tür bis zum Gelände (lokal: Tür bei (dx, dz), nach außen Richtung (ox, oz))
function entrySteps(B, list, hAt, y, dx, dz, ox, oz, width) {
  if (!hAt) return;
  const gx = dx + ox * 0.9, gz = dz + oz * 0.9;
  const diff = y + 0.1 - hAt(B.wx(gx, gz), B.wz(gx, gz));
  if (diff < 0.3) return;
  const n = Math.min(8, Math.ceil(diff / 0.28));
  for (let k = 1; k <= n; k++) {
    const hk = 0.1 - (diff * k) / (n + 1);
    const cx = dx + ox * (k - 0.5) * 0.4, cz = dz + oz * (k - 0.5) * 0.4;
    const bot = 0.1 - diff - 0.3;
    const sx = ox ? 0.4 : width, sz = ox ? width : 0.4;
    list.push({ geo: geo.box(sx, hk - bot, sz), color: 0xa89f90, matrix: B.T(cx, (hk + bot) / 2, cz) });
    B.walk(cx - sx / 2, cx + sx / 2, cz - sz / 2, cz + sz / 2, hk);
  }
}

// Wohnhaus: begehbar – Tür, offene Fenster, Holzboden, bei zwei Geschossen Treppe und Obergeschoss
export function buildHouse(x, z, y, w, d, floors, ry, opts = {}) {
  initMaterials();
  // Fußboden über dem höchsten Geländepunkt; Mauern reichen bis zum tiefsten hinunter
  let drop = 0.3;
  if (opts.hAt) {
    const c0 = Math.cos(ry), s0 = Math.sin(ry), hs = [];
    for (const [lx, lz] of [[0, 0], [-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [0, -d / 2], [0, d / 2], [-w / 2, 0], [w / 2, 0]]) hs.push(opts.hAt(x + lx * c0 + lz * s0, z - lx * s0 + lz * c0));
    const hi = Math.max(...hs), lo = Math.min(...hs);
    y = hi + 0.02; drop = y - lo + 0.4;
  }
  const H = floors * 3 + 0.4, Ht = H - 0.3, t = 0.3;
  const roofH = w * (opts.flatRoof ? 0.05 : 0.55);
  const walls = [], roofs = [], dark = [], wood = [];
  const B = bldg(x, y, z, ry), T = B.T;
  // Giebel (Dreieck) an beiden Stirnseiten
  if (!opts.flatRoof) {
    const gs = new THREE.Shape(); gs.moveTo(-w / 2, 0); gs.lineTo(w / 2, 0); gs.lineTo(0, roofH); gs.closePath();
    const gg = new THREE.ExtrudeGeometry(gs, { depth: d, bevelEnabled: false });
    gg.translate(0, 0, -d / 2);
    const uv = gg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
    walls.push({ geo: gg, color: opts.tint || 0xffffff, matrix: T(0, Ht, 0) });
    const slope = Math.hypot(w / 2, roofH) + 0.35;
    const ang = Math.atan2(roofH, w / 2);
    for (const sx of [-1, 1]) roofs.push({ geo: boxUV(slope, 0.16, d + 0.6), color: 0xffffff, matrix: T(sx * w / 4, Ht + roofH / 2 + 0.06, 0).multiply(M4(0, 0, 0, 0, 0, -sx * ang)) });
    if (opts.chimney !== false) walls.push({ geo: boxUV(0.7, roofH + 1.2, 0.7), color: 0xe0d8c8, matrix: T(w * 0.25, H + roofH * 0.5, d * 0.32) });
  } else {
    walls.push({ geo: boxUV(w + 0.2, 0.4, d + 0.2), color: 0xd0c8b8, matrix: T(0, H, 0) });
  }
  // Fenster: Rahmen mit Sprossen (offen), Fensterbank, Sturz, Klappläden; Tür mit Steingewände
  const frameC = 0xd2c9b4, stoneC = 0xbdb5a3;
  const win = (cx, cy, cz, rot) => {
    const W = (gx, gy, gz, lx, ly, lz, c, list = wood) => list.push({ geo: geo.box(gx, gy, gz), color: c, matrix: T(cx, cy, cz, rot).multiply(M4(lx, ly, lz)) });
    W(0.07, 1.34, 0.06, -0.46, 0, 0.03, frameC); W(0.07, 1.34, 0.06, 0.46, 0, 0.03, frameC);
    W(0.99, 0.07, 0.06, 0, 0.66, 0.03, frameC); W(0.99, 0.07, 0.06, 0, -0.66, 0.03, frameC);
    W(0.035, 1.26, 0.04, 0, 0, -0.1, frameC); W(0.86, 0.035, 0.04, 0, 0.12, -0.1, frameC);   // Sprossen (Glas zerschossen)
    W(1.12, 0.08, 0.2, 0, -0.73, 0.07, stoneC);                     // Fensterbank
    W(1.15, 0.17, 0.06, 0, 0.78, 0.03, stoneC);                     // Sturz
    for (const sd of [-1, 1]) W(0.45, 1.35, 0.05, sd * 0.72, 0, 0.06, opts.shutter || 0x5d6e66);   // Klappläden
  };
  const nx = Math.max(1, Math.floor(w / 3.2)), nz = Math.max(1, Math.floor(d / 3.4));
  const doorI = Math.floor(nx / 2), doorX = -w / 2 + (doorI + 0.5) * (w / nx);
  const front = [], back = [], sideL = [], sideR = [];
  for (let f = 0; f < floors; f++) {
    const wy = f * 3 + 1.6;
    for (let i = 0; i < nx; i++) {
      const lx = -w / 2 + (i + 0.5) * (w / nx);
      for (const sz of [-1, 1]) {
        const door = f === 0 && i === doorI && sz === -1;
        const rot = sz > 0 ? 0 : Math.PI;
        if (door) {
          const D = (gx, gy, gz, llx, ly, lz, c, list = wood) => list.push({ geo: geo.box(gx, gy, gz), color: c, matrix: T(lx, 0, sz * (d / 2), rot).multiply(M4(llx, ly, lz)) });
          D(0.18, 2.4, 0.08, -0.64, 1.1, 0.03, stoneC); D(0.18, 2.4, 0.08, 0.64, 1.1, 0.03, stoneC); D(1.46, 0.2, 0.08, 0, 2.28, 0.03, stoneC);   // Gewände
          // offener Türflügel nach innen
          wood.push({ geo: geo.box(1.0, 2.1, 0.05), color: 0x4a3423, matrix: T(lx - 0.5, 1.15, sz * (d / 2 - t)).multiply(M4(0, 0, 0, -1.3)).multiply(M4(0.5, 0, 0)) });
          front.push({ u: lx, w: 1.1, v0: 0.1, v1: 2.2 });
        } else {
          win(lx, wy, sz * (d / 2 + 0.02), rot);
          (sz < 0 ? front : back).push({ u: lx, w: 0.9, v0: wy - 0.62, v1: wy + 0.62 });
        }
      }
    }
    for (let i = 0; i < nz; i++) {
      const lz = -d / 2 + (i + 0.5) * (d / nz);
      for (const sx of [-1, 1]) {
        win(sx * (w / 2 + 0.02), wy, lz, sx * Math.PI / 2);
        (sx < 0 ? sideL : sideR).push({ u: lz, w: 0.9, v0: wy - 0.62, v1: wy + 0.62 });
      }
    }
  }
  const tint = opts.tint || 0xffffff;
  B.wall(walls, 0, -d / 2 + t / 2, true, w, t, -drop, Ht, front, tint);
  B.wall(walls, 0, d / 2 - t / 2, true, w, t, -drop, Ht, back, tint);
  B.wall(walls, -w / 2 + t / 2, 0, false, d - 2 * t, t, -drop, Ht, sideL, tint);
  B.wall(walls, w / 2 - t / 2, 0, false, d - 2 * t, t, -drop, Ht, sideR, tint);
  B.box(0, 0, w / 2, d / 2, Ht, Ht + Math.max(0.4, roofH * 0.6));   // Dach/Decke hält Geschosse auf
  // Ecksteine
  for (let k = 0, yy = -0.2; yy < Ht - 0.2; k++, yy += 0.42) {
    const L = k % 2 ? 0.42 : 0.26;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      wood.push({ geo: geo.box(L, 0.36, 0.05), color: 0xc4bcac, matrix: T(sx * (w / 2 - L / 2 + 0.02), yy + 0.1, sz * (d / 2 + 0.02)) });
      wood.push({ geo: geo.box(0.04, 0.36, k % 2 ? 0.26 : 0.42), color: 0xc4bcac, matrix: T(sx * (w / 2 + 0.02), yy + 0.1, sz * (d / 2 - (k % 2 ? 0.13 : 0.21) + 0.02)) });
    }
  }
  // Sockel/Fundament bis zum Gelände, Dielenboden, Decke
  wood.push({ geo: geo.box(w + 0.12, drop + 0.1, d + 0.12), color: 0x8f877a, matrix: T(0, (0.1 - drop) / 2, 0) });
  const iw = w - 2 * t, id = d - 2 * t;
  wood.push({ geo: geo.box(iw, 0.03, id), color: 0x6b5038, matrix: T(0, 0.115, 0) });
  wood.push({ geo: geo.box(iw, 0.12, id), color: 0xb0a490, matrix: T(0, Ht - 0.06, 0) });
  B.walk(-w / 2 + t, w / 2 - t, -d / 2 + t, d / 2 - t, 0.1);
  B.walk(doorX - 0.55, doorX + 0.55, -d / 2 - 0.05, -d / 2 + t + 0.05, 0.1);
  entrySteps(B, wood, opts.hAt, y, doorX, -d / 2, 0, -1, 1.4);
  // Obergeschoss mit Treppe entlang der linken Seitenwand
  if (floors >= 2) {
    const sx0 = -w / 2 + t, sx1 = sx0 + 1.0;
    const zs = -d / 2 + t + 0.6, Ls = Math.min(4.6, d - 2 * t - 1.2), N = 10, run = Ls / N, rise = 2.9 / N;
    for (let k = 1; k <= N; k++) {
      const hk = 0.1 + k * rise, z0 = zs + (k - 1) * run;
      wood.push({ geo: geo.box(1.0, hk - 0.1, run), color: 0x6b5038, matrix: T((sx0 + sx1) / 2, (hk + 0.1) / 2, z0 + run / 2) });
      B.walk(sx0, sx1, z0, z0 + run, hk);
    }
    const ze = zs + Ls, fy = 3.0;
    const slab = (x0, x1, z0, z1) => { if (x1 - x0 < 0.05 || z1 - z0 < 0.05) return; wood.push({ geo: geo.box(x1 - x0, 0.2, z1 - z0), color: 0x5a4330, matrix: T((x0 + x1) / 2, fy - 0.1, (z0 + z1) / 2) }); B.walk(x0, x1, z0, z1, fy); };
    slab(sx1, w / 2 - t, -d / 2 + t, d / 2 - t);
    slab(sx0, sx1, ze, d / 2 - t);
    slab(sx0, sx1, -d / 2 + t, zs - 0.05);
    // Geländer am Treppenloch
    wood.push({ geo: geo.box(0.06, 0.9, Ls), color: 0x4a3423, matrix: T(sx1 + 0.03, fy + 0.45, zs + Ls / 2) });
  }
  // Möbel: Tisch, Schrank (Deckung)
  wood.push({ geo: geo.box(1.4, 0.75, 0.8), color: 0x5a4028, matrix: T(w / 4, 0.1 + 0.375, d / 6) });
  wood.push({ geo: geo.box(1.2, 1.9, 0.5), color: 0x4a3423, matrix: T(w / 2 - t - 0.7, 0.1 + 0.95, d / 2 - t - 0.3) });
  B.box(w / 4, d / 6, 0.7, 0.4, 0.1, 0.85, 'wall');
  B.box(w / 2 - t - 0.7, d / 2 - t - 0.3, 0.6, 0.25, 0.1, 2.0, 'wall');
  const meshes = [];
  const wm = new THREE.Mesh(mergeTextured(walls), opts.plaster ? MAT.plaster : MAT.stone);
  const roofMat = opts.tiles ? MAT.tile : MAT.slate;
  const rm = new THREE.Mesh(mergeTextured(roofs.length ? roofs : [{ geo: geo.box(0.01, 0.01, 0.01), matrix: T(0, 0, 0) }]), roofMat);
  const dm = new THREE.Mesh(mergeColored(dark.concat(wood)), MAT.vc);
  for (const m of [wm, rm, dm]) { m.castShadow = true; m.receiveShadow = true; meshes.push(m); }
  const door = new THREE.Vector3(B.wx(doorX, -d / 2 - 1.6), 0, B.wz(doorX, -d / 2 - 1.6));
  return { meshes, boxes: B.boxes, walks: B.walks, footprint: { x, z, hw: w / 2, hd: d / 2, rot: ry, door, y }, height: H + roofH, floorY: y };
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
export function buildChurch(x, z, y, ry, hAt) {
  initMaterials();
  const L = 26, W = 10, H = 9, TW = 6, TH = 22, t = 0.5;
  const tz0 = -L / 2 - TW + t;            // Westfront des Turms (lokal)
  const czT = (tz0 + t + -L / 2) / 2;      // Mitte des Turm-Innenraums
  let drop = 0.4;
  if (hAt) {
    const c0 = Math.cos(ry), s0 = Math.sin(ry), hs = [];
    for (const [lx, lz] of [[0, 0], [-W / 2, -L / 2], [W / 2, -L / 2], [-W / 2, L / 2], [W / 2, L / 2], [-TW / 2, tz0], [TW / 2, tz0], [0, tz0]]) hs.push(hAt(x + lx * c0 + lz * s0, z - lx * s0 + lz * c0));
    const hi = Math.max(...hs), lo = Math.min(...hs);
    y = hi + 0.02; drop = y - lo + 0.5;
  }
  const B = bldg(x, y, z, ry), T = B.T;
  const walls = [], roofs = [], wood = [];
  // Langhaus: Wände mit hohen Spitzbogenfenstern (offen), Westwand mit Durchgang zum Turm
  const wins = []; for (let i = 0; i < 5; i++) wins.push({ u: -L / 2 + 3 + i * 5, w: 1.3, v0: 2.9, v1: 6.1 });
  B.wall(walls, -W / 2 + t / 2, 0, false, L, t, -drop, H, wins);
  B.wall(walls, W / 2 - t / 2, 0, false, L, t, -drop, H, wins);
  B.wall(walls, 0, L / 2 - t / 2, true, W - 2 * t, t, -drop, H, [{ u: 0, w: 1.4, v0: 5.2, v1: 7.0 }]);
  B.wall(walls, 0, -L / 2 + t / 2, true, W - 2 * t, t, -drop, H, [{ u: 0, w: 1.6, v0: 0.1, v1: 3.1 }]);
  // Giebel und Dach
  const gs = new THREE.Shape(); gs.moveTo(-W / 2, 0); gs.lineTo(W / 2, 0); gs.lineTo(0, 5.5); gs.closePath();
  const gg = new THREE.ExtrudeGeometry(gs, { depth: L, bevelEnabled: false }); gg.translate(0, 0, -L / 2);
  const uv = gg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 3, uv.getY(i) / 3);
  walls.push({ geo: gg, matrix: T(0, H, 0) });
  const ang = Math.atan2(5.5, W / 2), sl = Math.hypot(W / 2, 5.5) + 0.4;
  for (const sx of [-1, 1]) roofs.push({ geo: boxUV(sl, 0.2, L + 0.6), matrix: T(sx * W / 4, H + 2.75, 0, 0, 0, -sx * ang) });
  B.box(0, 0, W / 2, L / 2, H, H + 5.5);
  // Turm: Portal im Westen, Schallöffnungen in der Glockenstube
  const Hb = 18.4;
  const louv = (u) => ({ u, w: 1.2, v0: Hb + 0.9, v1: Hb + 2.6 });
  B.wall(walls, 0, tz0 + t / 2, true, TW, t, -drop, TH, [{ u: 0, w: 2.0, v0: 0.1, v1: 2.4 }, louv(0)]);
  const sideLen = -L / 2 - tz0, sideC = (tz0 + -L / 2) / 2;
  B.wall(walls, -TW / 2 + t / 2, sideC, false, sideLen, t, -drop, TH, [louv(czT - sideC)]);
  B.wall(walls, TW / 2 - t / 2, sideC, false, sideLen, t, -drop, TH, [louv(czT - sideC)]);
  B.wall(walls, 0, -L / 2 + t / 2, true, TW, t, H, TH, [louv(0)]);
  // Spitzhelm
  const sp = new THREE.ConeGeometry(TW * 0.72, 11, 4, 1); sp.rotateY(Math.PI / 4);
  roofs.push({ geo: sp, matrix: T(0, TH + 5.2, (tz0 + -L / 2 + t) / 2) });
  B.box(0, (tz0 + -L / 2 + t) / 2, TW / 2, TW / 2, TH, TH + 10);
  // Portal-Gewände, Türflügel offen
  wood.push({ geo: geo.box(2.6, 0.4, 0.15), color: 0xa89f90, matrix: T(0, 2.6, tz0 - 0.05) });
  for (const sd of [-1, 1]) {
    wood.push({ geo: geo.box(0.3, 2.6, 0.15), color: 0xa89f90, matrix: T(sd * 1.15, 1.3, tz0 - 0.05) });
    wood.push({ geo: geo.box(0.95, 2.2, 0.06), color: 0x3a2a1c, matrix: T(sd * 1.0, 1.2, tz0 + t + 0.45, sd * 1.35) });
  }
  // Böden, Fundament, Decken
  wood.push({ geo: geo.box(W + 0.1, drop + 0.1, L + 0.1), color: 0x8f877a, matrix: T(0, (0.1 - drop) / 2, 0) });
  wood.push({ geo: geo.box(TW + 0.1, drop + 0.1, TW - t + 0.1), color: 0x8f877a, matrix: T(0, (0.1 - drop) / 2, (tz0 + -L / 2) / 2) });
  wood.push({ geo: geo.box(W - 2 * t, 0.03, L - 2 * t), color: 0x9a948a, matrix: T(0, 0.115, 0) });
  wood.push({ geo: geo.box(W - 2 * t, 0.2, L - 2 * t), color: 0x5a4a3a, matrix: T(0, H - 0.1, 0) });
  wood.push({ geo: geo.box(TW - 2 * t, 0.2, TW - 2 * t), color: 0x5a4a3a, matrix: T(0, TH - 0.1, czT) });
  B.walk(-W / 2 + t, W / 2 - t, -L / 2 + t, L / 2 - t, 0.1);
  B.walk(-0.8, 0.8, -L / 2 - 0.05, -L / 2 + t + 0.05, 0.1);
  const a = TW / 2 - t;                    // halbe Innenweite Turm
  B.walk(-a, a, czT - a, czT + a, 0.1);
  B.walk(-1.0, 1.0, tz0 - 0.05, tz0 + t + 0.05, 0.1);
  entrySteps(B, wood, hAt, y, 0, tz0, 0, -1, 2.2);
  // Bänke (Deckung) und Altar
  for (let k = 0; k < 8; k++) for (const sx of [-1, 1]) {
    const bz = -L / 2 + 4 + k * 2.3, bx = sx * 2.3;
    wood.push({ geo: geo.box(3.0, 0.45, 0.45), color: 0x5a4028, matrix: T(bx, 0.1 + 0.225, bz) });
    wood.push({ geo: geo.box(3.0, 0.5, 0.06), color: 0x5a4028, matrix: T(bx, 0.1 + 0.7, bz + 0.22) });
    B.box(bx, bz, 1.5, 0.25, 0.1, 0.65, 'wall');
  }
  wood.push({ geo: geo.box(2.4, 1.0, 1.0), color: 0xd8d0c0, matrix: T(0, 0.6, L / 2 - 2.2) });
  B.box(0, L / 2 - 2.2, 1.2, 0.5, 0.1, 1.1, 'wall');
  // Wendeltreppe im Turm: je Wand 7 Stufen, in den Ecken Podeste, bis zur Glockenstube
  const N = 61, rise = (Hb - 0.1) / N, per = 7, run = (2 * a - 2) / per;
  const step = (u0, u1, v0, v1, hk) => {
    const bot = hk < 2.3 ? 0.1 : hk - 0.25;
    wood.push({ geo: geo.box(u1 - u0, hk - bot, v1 - v0), color: 0x8a8274, matrix: T((u0 + u1) / 2, (hk + bot) / 2, czT + (v0 + v1) / 2) });
    B.walk(u0, u1, czT + v0, czT + v1, hk);
  };
  const e = a - 1;
  for (let k = 1; k <= N; k++) {
    const side = Math.floor((k - 1) / per) % 4, j = (k - 1) % per, hk = 0.1 + k * rise;
    const t0 = e - j * run, t1 = e - (j + 1) * run;   // entlang der Laufrichtung (von +e nach -e)
    if (side === 0) step(e, a, t1, t0, hk);
    else if (side === 1) step(t1, t0, -a, -e, hk);
    else if (side === 2) step(-a, -e, -t0, -t1, hk);
    else step(-t0, -t1, e, a, hk);
    if (j === per - 1 && k < N) {   // Eckpodest
      if (side === 0) step(e, a, -a, -e, hk);
      else if (side === 1) step(-a, -e, -a, -e, hk);
      else if (side === 2) step(-a, -e, e, a, hk);
      else step(e, a, e, a, hk);
    }
  }
  // Boden der Glockenstube: Treppenloch entlang Seite 0 bis zur letzten Stufe, Streifen an Seite 3 offen (Kopffreiheit)
  const jl = (N - 1) % per;
  const gl = (x0, x1, v0, v1) => { wood.push({ geo: geo.box(x1 - x0, 0.25, v1 - v0), color: 0x5a4a3a, matrix: T((x0 + x1) / 2, Hb - 0.125, czT + (v0 + v1) / 2) }); B.walk(x0, x1, czT + v0, czT + v1, Hb); };
  gl(-a, e, -a, e);
  gl(e, a, -a, e - (jl + 1) * run);
  // Glocke
  wood.push({ geo: geo.cyl(0.35, 0.6, 0.9, 12), color: 0x6a5a3a, matrix: T(0, TH - 1.2, czT) });
  const meshes = [
    new THREE.Mesh(mergeTextured(walls), MAT.stone),
    new THREE.Mesh(mergeTextured(roofs), MAT.slate),
    new THREE.Mesh(mergeColored(wood), MAT.vc),
  ];
  meshes.forEach((m) => { m.castShadow = m.receiveShadow = true; });
  const door = new THREE.Vector3(B.wx(0, tz0 - 2), 0, B.wz(0, tz0 - 2));
  return {
    meshes, boxes: B.boxes, walks: B.walks,
    footprints: [{ x, z, hw: W / 2, hd: L / 2, rot: ry, door, y }, { x: B.wx(0, (tz0 + -L / 2 + t) / 2), z: B.wz(0, (tz0 + -L / 2 + t) / 2), hw: TW / 2, hd: TW / 2, rot: ry, door, y }],
    tower: new THREE.Vector3(B.wx(-0.6, czT), y + Hb, B.wz(-0.6, czT)),   // Scharfschützenplatz in der Glockenstube
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
  // Laufwerksdetails: Kettenoberlauf mit Gliedern, Antriebsrad vorn, Leitrad hinten, Stützrollen
  for (const sx of [-1, 1]) {
    const X = sx * (W / 2 - 0.28);
    for (let k = 0; k < Math.round(L * 3.2); k++) hull.push({ geo: geo.box(0.58, 0.05, 0.12), color: 0x24221f, matrix: M4(X, 0.9, -L * 0.46 + k * (L * 0.92 / Math.round(L * 3.2))) });
    for (let k = 0; k < Math.round(L * 3.2); k++) hull.push({ geo: geo.box(0.58, 0.05, 0.12), color: 0x24221f, matrix: M4(X, 0.04, -L * 0.42 + k * (L * 0.84 / Math.round(L * 3.2))) });
    const spr = geo.cyl(0.36, 0.36, 0.2, 12); spr.rotateZ(Math.PI / 2);
    hull.push({ geo: spr, color: 0x3c3a34, matrix: M4(sx * (W / 2 - 0.12), 0.62, -L * 0.45) });
    const idl = geo.cyl(0.3, 0.3, 0.18, 12); idl.rotateZ(Math.PI / 2);
    hull.push({ geo: idl, color: 0x3c3a34, matrix: M4(sx * (W / 2 - 0.12), 0.55, L * 0.45) });
    for (let k = 0; k < 3; k++) { const rr = geo.cyl(0.09, 0.09, 0.12, 8); rr.rotateZ(Math.PI / 2); hull.push({ geo: rr, color: 0x3a3a36, matrix: M4(sx * (W / 2 - 0.05), 0.82, -L * 0.25 + k * L * 0.25) }); }
    if (type === 'sherman') for (let k = 0; k < 3; k++) hull.push({ geo: geo.box(0.22, 0.42, 0.9), color: col, matrix: M4(sx * (W / 2 - 0.05), 0.48, -L * 0.3 + k * L * 0.3) });   // VVSS-Drehgestelle
    // Werkzeug und Ersatzkettenglieder an der Wanne
    hull.push({ geo: geo.cyl(0.03, 0.03, 1.6, 6), color: 0x5a4632, matrix: M4(sx * (W * 0.36), 1.36 + H * 0.05, 0.6, 0, Math.PI / 2) });
    for (let k = 0; k < 3; k++) hull.push({ geo: geo.box(0.35, 0.05, 0.14), color: 0x2a2826, matrix: M4(sx * 0.4, 1.12 + H * 0.12, -L * 0.47 - 0.02 - k * 0.0, 0, 1.1) });
  }
  // Luken, Bug-MG, Auspuff
  hull.push({ geo: geo.cyl(0.3, 0.3, 0.06, 10), color: col, matrix: M4(-0.45, type === 'sherman' ? 1.62 : 1.62, -L * 0.28) });
  hull.push({ geo: geo.cyl(0.3, 0.3, 0.06, 10), color: col, matrix: M4(0.45, type === 'sherman' ? 1.62 : 1.62, -L * 0.28) });
  { const bmg = geo.cyl(0.025, 0.03, 0.5, 6); bmg.rotateX(Math.PI / 2); hull.push({ geo: bmg, color: 0x222222, matrix: M4(0.55, 1.25, -L * 0.48) }); }
  for (const sx of [-0.5, 0.5]) hull.push({ geo: geo.cyl(0.09, 0.09, 0.4, 8), color: 0x3a2e24, matrix: M4(sx * W * 0.5, 1.15, L * 0.47, 0, Math.PI / 2) });
  if (!S.casemate) {
    // Turm: Blende, Luke, Fla-MG / Antenne
    turret.push({ geo: geo.box(0.9, 0.55, 0.25), color: col, matrix: M4(0, 0.35, -S.turretR * 0.95) });
    turret.push({ geo: geo.cyl(0.26, 0.26, 0.05, 10), color: col, matrix: M4(0.3, 1.02, 0.2) });
    turret.push({ geo: geo.cyl(0.01, 0.01, 2.2, 4), color: 0x222222, matrix: M4(-0.5, 1.75, 0.5) });
    if (type === 'sherman') { const mg = geo.cyl(0.02, 0.025, 0.9, 6); mg.rotateX(Math.PI / 2); turret.push({ geo: mg, color: 0x222222, matrix: M4(0.3, 1.18, -0.1) }); }
  } else {
    hull.push({ geo: geo.box(0.9, 0.5, 0.3), color: col, matrix: M4(0, 1.7, -L * 0.27) });   // Topfblende StuG
  }
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
