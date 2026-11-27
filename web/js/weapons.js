// Waffen: historische Kenndaten und detaillierte 3D-Modelle (aus extrudierten Seitenprofilen).
// Einheiten: Mündungsgeschwindigkeit m/s, Kadenz Schuss/min, Schaden ≈ Trefferpunkte (Mensch = 100),
// spread = Streuung in mrad (Hüfte / Kimme), recoil = Hochschlag in rad.
import * as THREE from './lib/three.module.min.js';
import { tex, normalTex } from './gfx.js';

export const WEAPONS = {
  // ---------------------------------------------------------------- USA
  garand: { side: 'us', name: 'M1 Garand', cal: '.30-06', mag: 8, reserve: 64, rpm: 120, auto: false, vel: 853, dmg: 85, spread: [22, 1.2], recoil: 0.038, reload: 2.4, enbloc: true, sound: 'rifle', zoom: 1.35, range: 450, mass: 4.3 },
  carbine: { side: 'us', name: 'M1 Carbine', cal: '.30 Carbine', mag: 15, reserve: 75, rpm: 150, auto: false, vel: 600, dmg: 55, spread: [20, 1.8], recoil: 0.022, reload: 2.0, sound: 'carbine', zoom: 1.3, range: 250, mass: 2.4 },
  thompson: { side: 'us', name: 'Thompson M1A1', cal: '.45 ACP', mag: 30, reserve: 150, rpm: 700, auto: true, vel: 285, dmg: 38, spread: [28, 5], recoil: 0.018, reload: 2.6, sound: 'smg45', zoom: 1.2, range: 120, mass: 4.8 },
  bar: { side: 'us', name: 'BAR M1918A2', cal: '.30-06', mag: 20, reserve: 260, rpm: 500, auto: true, vel: 860, dmg: 80, spread: [32, 3], recoil: 0.03, reload: 3.0, sound: 'rifle', zoom: 1.3, range: 500, mass: 8.8, bipod: true, heat: 1 / 140, cool: 0.045 },
  springfield: { side: 'us', name: 'M1903A4 Springfield', cal: '.30-06', mag: 5, reserve: 40, rpm: 40, auto: false, bolt: true, vel: 853, dmg: 110, spread: [30, 0.3], recoil: 0.05, reload: 3.4, sound: 'rifle', zoom: 2.5, scope: 'weaver', range: 800, mass: 4.1 },
  m1911: { side: 'us', name: 'Colt M1911A1', cal: '.45 ACP', mag: 7, reserve: 21, rpm: 300, auto: false, vel: 253, dmg: 40, spread: [24, 6], recoil: 0.05, reload: 1.6, sound: 'pistol', zoom: 1.15, range: 50, mass: 1.1, pistol: true },
  bazooka: { side: 'us', name: 'M1A1 Bazooka', cal: '2.36 in', mag: 1, reserve: 4, rpm: 12, auto: false, vel: 82, dmg: 300, spread: [40, 4], recoil: 0.04, reload: 4.0, sound: 'rocket', zoom: 1.3, range: 150, mass: 6.8, rocket: true, at: true },
  mk2: { side: 'us', name: 'Mk 2', cal: '', mag: 1, reserve: 2, rpm: 40, grenade: true, fuse: 4.5, vel: 18, zoom: 1, dmg: 200, radius: 9, sound: 'throw', mass: 0.6 },
  m8smoke: { side: 'us', name: 'AN-M8 Rauch', cal: '', mag: 1, reserve: 1, rpm: 40, grenade: true, smoke: true, fuse: 2, vel: 16, zoom: 1, dmg: 0, radius: 0, sound: 'throw', mass: 0.7 },
  // ---------------------------------------------------------------- Deutschland
  kar98k: { side: 'de', name: 'Karabiner 98k', cal: '7,92 × 57', mag: 5, reserve: 50, rpm: 45, auto: false, bolt: true, vel: 760, dmg: 95, spread: [24, 0.8], recoil: 0.045, reload: 3.2, stripper: true, sound: 'rifleDE', zoom: 1.35, range: 500, mass: 3.9 },
  g43: { side: 'de', name: 'Gewehr 43', cal: '7,92 × 57', mag: 10, reserve: 60, rpm: 110, auto: false, vel: 746, dmg: 85, spread: [24, 1.3], recoil: 0.04, reload: 2.8, sound: 'rifleDE', zoom: 1.35, range: 450, mass: 4.4 },
  mp40: { side: 'de', name: 'MP 40', cal: '9 × 19', mag: 32, reserve: 160, rpm: 500, auto: true, vel: 400, dmg: 32, spread: [26, 4.5], recoil: 0.012, reload: 2.4, sound: 'smg9', zoom: 1.2, range: 120, mass: 4.0 },
  stg44: { side: 'de', name: 'StG 44', cal: '7,92 × 33 kurz', mag: 30, reserve: 150, rpm: 560, auto: true, vel: 685, dmg: 50, spread: [26, 2.5], recoil: 0.02, reload: 2.6, sound: 'stg', zoom: 1.25, range: 300, mass: 5.2 },
  mg42: { side: 'de', name: 'MG 42', cal: '7,92 × 57', mag: 250, reserve: 750, rpm: 1200, auto: true, vel: 740, dmg: 70, spread: [40, 4], recoil: 0.022, reload: 6.5, sound: 'mg42', zoom: 1.25, range: 600, mass: 11.6, bipod: true, heat: 1 / 230, cool: 0.03, barrel: true, swap: 4.2 },
  kar98zf: { side: 'de', name: 'Kar 98k mit ZF 39', cal: '7,92 × 57', mag: 5, reserve: 40, rpm: 40, auto: false, bolt: true, vel: 760, dmg: 110, spread: [30, 0.3], recoil: 0.05, reload: 3.6, sound: 'rifleDE', zoom: 4, scope: 'zf39', range: 800, mass: 4.8 },
  p38: { side: 'de', name: 'Walther P38', cal: '9 × 19', mag: 8, reserve: 24, rpm: 320, auto: false, vel: 350, dmg: 34, spread: [22, 5], recoil: 0.04, reload: 1.5, sound: 'pistol9', zoom: 1.15, range: 50, mass: 0.95, pistol: true },
  panzerfaust: { side: 'de', name: 'Panzerfaust 60', cal: '149 mm', mag: 1, reserve: 2, rpm: 10, auto: false, vel: 45, dmg: 400, spread: [40, 5], recoil: 0.05, reload: 3.0, sound: 'rocket', zoom: 1.2, range: 60, mass: 6.1, rocket: true, at: true, lob: true },
  nb39: { side: 'de', name: 'Nebelhandgranate 39', cal: '', mag: 1, reserve: 1, rpm: 40, grenade: true, smoke: true, fuse: 2, vel: 20, zoom: 1, dmg: 0, radius: 0, sound: 'throw', mass: 0.6 },
  stiel: { side: 'de', name: 'Stielhandgranate 24', cal: '', mag: 1, reserve: 2, rpm: 40, grenade: true, fuse: 4.5, vel: 21, zoom: 1, dmg: 180, radius: 8, sound: 'throw', mass: 0.6 },
};
for (const [id, w] of Object.entries(WEAPONS)) w.id = id;

// Klassen (Ausrüstung) je Seite
export const CLASSES = {
  rifle: { name: { de: 'Schütze', en: 'Rifleman' }, us: ['garand', 'm1911', 'mk2', 'm8smoke'], de: ['kar98k', 'p38', 'stiel', 'nb39'], nade: 2 },
  smg: { name: { de: 'MP-Schütze', en: 'Submachine gunner' }, us: ['thompson', 'm1911', 'mk2', 'm8smoke'], de: ['mp40', 'p38', 'stiel', 'nb39'], nade: 2 },
  assault: { name: { de: 'Sturmschütze', en: 'Assault' }, us: ['carbine', 'm1911', 'mk2', 'm8smoke'], de: ['stg44', 'p38', 'stiel', 'nb39'], nade: 3 },
  mg: { name: { de: 'MG-Schütze', en: 'Machine gunner' }, us: ['bar', 'm1911', 'mk2', 'm8smoke'], de: ['mg42', 'p38', 'stiel', 'nb39'], nade: 1 },
  sniper: { name: { de: 'Scharfschütze', en: 'Sniper' }, us: ['springfield', 'm1911', 'mk2', 'm8smoke'], de: ['kar98zf', 'p38', 'stiel', 'nb39'], nade: 1 },
  at: { name: { de: 'Panzerabwehr', en: 'Anti-tank' }, us: ['bazooka', 'carbine', 'mk2', 'm8smoke'], de: ['panzerfaust', 'g43', 'stiel', 'nb39'], nade: 1 },
  officer: { name: { de: 'Funker / Führer', en: 'Radioman / Leader' }, us: ['carbine', 'm1911', 'mk2', 'm8smoke'], de: ['mp40', 'p38', 'stiel', 'nb39'], nade: 2, radio: true },
};
export const PLAYER_CLASSES = ['rifle', 'smg', 'assault', 'mg', 'sniper', 'at', 'officer'];
export const loadout = (cls, side) => (CLASSES[cls] || CLASSES.rifle)[side];

// ================================================================ Modelle
const M = {};
function mats() {
  if (M.wood) return M;
  M.wood = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.62, metalness: 0.0 });
  M.woodDark = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.6 });
  M.woodLight = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.6 });
  M.steel = new THREE.MeshStandardMaterial({ color: 0x3a3d40, roughness: 0.42, metalness: 0.45 });
  M.parker = new THREE.MeshStandardMaterial({ color: 0x4a4b45, roughness: 0.6, metalness: 0.35 });   // parkerisiert (US)
  M.blued = new THREE.MeshStandardMaterial({ color: 0x2c323a, roughness: 0.38, metalness: 0.45 });     // brüniert (DE)
  M.bakelite = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 0.5 });
  M.olive = new THREE.MeshStandardMaterial({ color: 0x4d5236, roughness: 0.7, metalness: 0.15 });
  M.field = new THREE.MeshStandardMaterial({ color: 0x5c5a3c, roughness: 0.75, metalness: 0.1 });   // Panzerfaust gelbbraun/olive
  M.brass = new THREE.MeshStandardMaterial({ color: 0xb08a3c, roughness: 0.4, metalness: 0.5 });
  M.sling = new THREE.MeshStandardMaterial({ color: 0x5a5236, roughness: 0.9 });
  M.leather = new THREE.MeshStandardMaterial({ color: 0x3d2a1a, roughness: 0.8 });
  M.glass = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.05, metalness: 0.5, emissive: 0x05080c });
  // Oberflächen: Holz mit Maserung und Relief, Metall mit Kratzern und blank gegriffenen Stellen (glänzt im Umgebungslicht)
  for (const k of ['wood', 'woodDark', 'woodLight']) { M[k].map = tex('grain'); M[k].normalMap = normalTex('grain', 1.2); M[k].roughness = 0.55; }
  for (const k of ['steel', 'parker', 'blued', 'olive', 'field']) { M[k].roughnessMap = tex('scratch'); M[k].normalMap = normalTex('scratch', 0.6); M[k].roughness = k === 'blued' || k === 'steel' ? 0.75 : 0.95; M[k].metalness = k === 'olive' || k === 'field' ? 0.2 : 0.75; }
  M.bakelite.normalMap = normalTex('scratch', 0.3); M.bakelite.roughness = 0.45;
  M.sling.map = tex('fabric'); M.sling.normalMap = normalTex('fabric', 1.5);
  M.leather.normalMap = normalTex('fabric', 0.8);
  return M;
}

// Texturkoordinaten als Würfelprojektion in Metern (Maserung läuft entlang der Waffe, gleich dicht auf allen Teilen)
function boxProjectUV(geo, k = 4) {
  const P = geo.attributes.position, N = geo.attributes.normal;
  if (!P || !N) return;
  const uv = new Float32Array(P.count * 2);
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), y = P.getY(i), z = P.getZ(i), ax = Math.abs(N.getX(i)), ay = Math.abs(N.getY(i)), az = Math.abs(N.getZ(i));
    let u, v;
    if (ax >= ay && ax >= az) { u = z; v = y; } else if (ay >= az) { u = z; v = x; } else { u = x; v = y; }
    uv[i * 2] = u * k; uv[i * 2 + 1] = v * k;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

// Seitenprofil (x vorwärts, y hoch, in cm) extrudieren; Dicke in cm, zentriert
function prof(points, thick, mat, bevel = 0.25) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0] / 100, points[0][1] / 100);
  for (let i = 1; i < points.length; i++) s.lineTo(points[i][0] / 100, points[i][1] / 100);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: thick / 100, bevelEnabled: bevel > 0, bevelThickness: bevel / 100, bevelSize: bevel / 100, bevelSegments: 1, curveSegments: 4 });
  g.translate(0, 0, -thick / 200);
  // Modelle zeigen entlang -Z (Blickrichtung): x(Profil) -> -z
  g.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  return m;
}
// Rohr entlang der Laufachse: von x0 bis x1 (cm), Höhe y (cm), Radius r (cm)
function tube(x0, x1, y, r, mat, seg = 10, r2 = r) {
  const g = new THREE.CylinderGeometry(r2 / 100, r / 100, (x1 - x0) / 100, seg, 1);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.set(0, y / 100, -((x0 + x1) / 2) / 100);
  return m;
}
function box(x0, x1, y0, y1, w, mat, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w / 100, (y1 - y0) / 100, (x1 - x0) / 100), mat);
  m.position.set(z / 100, (y0 + y1) / 200, -((x0 + x1) / 2) / 100);
  return m;
}
function add(g, ...ms) { for (const m of ms) { m.castShadow = true; g.add(m); } return g; }

// Jedes Modell: Ursprung am Griff (Abzug), Lauf zeigt nach -Z. Zusätzlich: muzzle (Mündung), sight (Kimme/Korn-Höhe)
const BUILD = {
  garand() {
    const m = mats(), g = new THREE.Group();
    add(g,
      // Kolben + Schaft (Nussbaum) bis zum vorderen Handschutz
      prof([[-42, -2], [-40, -9], [-30, -10.5], [-14, -6.5], [-6, -5.5], [-2, -9.5], [3, -9.5], [5, -3.5], [44, -2.5], [44, 1], [10, 1.2], [-8, 0.8], [-20, 1.5], [-42, 2.5]], 4.2, m.wood),
      prof([[47, -1.8], [66, -1.6], [66, 1.6], [47, 1.6]], 3.6, m.wood),          // vorderer Handschutz
      prof([[8, 1], [44, 1], [44, 2.4], [8, 2.6]], 3.2, m.woodLight, 0.15),     // oberer Handschutz
      box(-6, 12, -0.6, 2.8, 2.8, m.parker),                                    // Verschlussgehäuse
      box(8, 12, -3.5, -0.6, 2.8, m.parker),                                    // Magazinschacht
      tube(12, 84, 0.9, 0.85, m.parker, 8, 0.75),                               // Lauf
      tube(44, 72, -1.5, 0.45, m.parker, 6),                                    // Gaszylinder-Kolbenstange
      box(76, 80, -2.2, 1.6, 2.2, m.parker),                                    // Gaszylinder
      box(78, 80, 1.6, 3.3, 0.5, m.parker),                                     // Korn mit Schutz
      box(-7, -2, 2.6, 4.6, 1.8, m.parker),                                     // Diopter
      box(4, 12, 1.2, 2.4, 0.8, m.parker, 1.6),                                 // Spannschieber
      box(-1, 2, -5.5, -3.2, 0.6, m.steel),                                     // Abzug
      prof([[-3, -3], [5, -3], [5, -6.5], [2, -6.5], [1, -4], [-3, -4]], 0.6, m.parker, 0),   // Abzugsbügel
      tube(-30, 45, -5, 0.15, m.sling, 4),                                     // Riemen (vereinfacht)
    );
    g.userData = { muzzle: new THREE.Vector3(0, 0.009, -0.84), sightY: 0.04, sightZ: 0.07 };
    return g;
  },
  carbine() {
    const m = mats(), g = new THREE.Group();
    add(g,
      prof([[-34, -2], [-32, -8], [-24, -9], [-10, -5.5], [-3, -5], [-1, -8.5], [3, -8.5], [4, -3], [34, -2], [34, 1], [-8, 1], [-34, 2.2]], 3.8, m.wood),
      prof([[8, 1], [30, 1], [30, 2.2], [8, 2.4]], 3, m.woodLight, 0.12),
      box(-5, 9, -0.5, 2.6, 2.5, m.parker),
      box(4, 9, -10, -0.5, 2.2, m.parker),                                      // 15-Schuss-Magazin
      tube(9, 52, 0.9, 0.7, m.parker, 8, 0.65),
      box(33, 36, -1.2, 1.4, 2.4, m.parker),                                    // Laufband
      box(49, 51, 1.2, 2.8, 0.5, m.parker),
      box(-5, -1, 2.4, 3.8, 1.5, m.parker),
      box(-1, 1.5, -5, -3, 0.5, m.steel),
    );
    g.userData = { muzzle: new THREE.Vector3(0, 0.009, -0.52), sightY: 0.032, sightZ: 0.05 };
    return g;
  },
  thompson() {
    const m = mats(), g = new THREE.Group();
    add(g,
      prof([[-36, -1], [-34, -9], [-26, -10], [-12, -3], [-12, 1.6], [-36, 2.5]], 3.8, m.wood),   // Kolben
      prof([[-4, -1], [-2, -9], [2, -9], [3, -1]], 2.8, m.wood),                                   // Pistolengriff
      prof([[13, -1], [15, -6], [20, -6], [22, -1]], 3, m.wood),                                    // Vorderschaft
      box(-12, 13, -1.5, 3, 3.4, m.parker),                                                         // Gehäuse
      box(3, 8, -14, -1.5, 2.4, m.parker),                                                          // 30-Schuss-Stangenmagazin
      tube(13, 44, 1.2, 0.95, m.parker, 10),                                                        // Lauf
      box(-11, -7, 3, 4.6, 1.4, m.parker),                                                          // Visierschutz
      box(41, 43, 2, 3.4, 0.5, m.parker),
      box(5, 9, 3, 4, 1, m.steel, 0.6),                                                             // Spannhebel seitlich
      prof([[-6, -1.5], [3, -1.5], [3, -5], [0, -5], [-1, -2.5], [-6, -2.5]], 0.6, m.parker, 0),
    );
    g.userData = { muzzle: new THREE.Vector3(0, 0.012, -0.44), sightY: 0.04, sightZ: 0.06 };
    return g;
  },
  bar() {
    const m = mats(), g = new THREE.Group();
    add(g,
      prof([[-44, -2], [-42, -11], [-32, -12], [-16, -6], [-6, -6], [-3, -10], [2, -10], [3, -3], [-6, 1.8], [-44, 2.5]], 4.2, m.wood),
      prof([[18, -2.4], [42, -2], [42, 1.2], [18, 1.6]], 4.4, m.wood),                               // Handschutz
      box(-6, 18, -3.4, 2.6, 3.6, m.parker),
      box(4, 12, -13, -3.4, 2.8, m.parker),                                                          // 20er-Magazin
      tube(18, 96, 0.4, 1.0, m.parker, 10, 0.8),
      tube(42, 70, -2.4, 0.7, m.parker, 8),                                                          // Gaszylinder
      box(90, 96, -0.6, 1.6, 2.6, m.parker),                                                         // Mündungsfeuerdämpfer
      box(80, 82, 1.2, 3.2, 0.5, m.parker),
      box(-6, -2, 2.6, 4.4, 1.6, m.parker),
      // Zweibein (eingeklappt)
      tube(80, 104, -2.2, 0.35, m.steel, 6),
    );
    const bp = tube(80, 104, -2.2, 0.35, m.steel, 6); bp.position.x = 0.025; g.add(bp);
    g.userData = { muzzle: new THREE.Vector3(0, 0.004, -0.98), sightY: 0.04, sightZ: 0.09 };
    return g;
  },
  springfield() {
    const m = mats(), g = new THREE.Group();
    add(g,
      prof([[-44, -2], [-42, -10], [-32, -11], [-12, -6], [-4, -5.5], [-1, -9], [3, -9], [5, -3], [55, -2], [55, 1], [-8, 1], [-44, 2.2]], 4, m.wood),   // Scharfschützenschaft (C-Schaft)
      prof([[10, 1], [52, 1], [52, 2], [10, 2.2]], 3, m.wood, 0.12),
      box(-6, 14, -0.5, 2.4, 2.6, m.parker),
      tube(14, 92, 0.9, 0.85, m.parker, 8, 0.7),
      box(52, 56, -1.4, 1.6, 2.8, m.parker),                                                          // Oberring
      // Bolzengriff gerade
      tube(-4, -2, 1.5, 0.35, m.steel, 6),
    );
    const bh = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 6), m.steel);
    bh.rotation.z = Math.PI / 2; bh.position.set(0.03, 0.015, 0.03); g.add(bh);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), m.steel); knob.position.set(0.06, 0.015, 0.03); g.add(knob);
    // Weaver-330C-Zielfernrohr
    add(g, tube(-8, 26, 6, 1.1, m.blued, 12), tube(-12, -8, 6, 1.55, m.blued, 12, 1.1), tube(26, 30, 6, 1.1, m.blued, 12, 1.5),
      box(-2, 0, 2.4, 5, 1.5, m.blued), box(16, 18, 2.4, 5, 1.5, m.blued));
    g.userData = { muzzle: new THREE.Vector3(0, 0.009, -0.92), sightY: 0.06, sightZ: 0.16, scope: true };
    return g;
  },
  m1911() {
    const m = mats(), g = new THREE.Group();
    add(g,
      prof([[-4, 0], [-3, -10], [2, -10], [2.5, 0]], 2.8, m.wood),            // Griffschalen
      box(-6, 15, 0, 3.2, 2.6, m.parker),                                     // Schlitten
      box(-4, 12, -2.2, 0, 2.4, m.parker),                                    // Rahmen
      box(-6, -4, 3.2, 4, 0.6, m.parker), box(13, 14.5, 3.2, 4, 0.4, m.parker),
      prof([[2, -1], [7, -1], [7, -4], [4, -4], [3, -2]], 0.5, m.parker, 0),
    );
    g.userData = { muzzle: new THREE.Vector3(0, 0.02, -0.15), sightY: 0.04, sightZ: 0.02 };
    return g;
  },
  bazooka() {
    const m = mats(), g = new THREE.Group();
    add(g,
      tube(-70, 85, 4, 3.0, m.olive, 14),                                     // Rohr 2,36"
      tube(-74, -70, 4, 4.2, m.olive, 14, 3.0),                               // Trichter hinten
      tube(-30, -12, 4, 3.5, m.leather, 12),                                  // Schulterstütze
      prof([[-4, 1], [-3, -9], [2, -9], [3, 1]], 2.6, m.wood),                 // Griff
      prof([[20, 1], [21, -7], [25, -7], [25, 1]], 2.4, m.wood),              // Vordergriff
      box(-6, 40, 7, 7.6, 1, m.steel),
      box(38, 41, 7, 10, 1.4, m.steel),                                        // Rahmenvisier
      box(-8, -4, 2, 6, 6.4, m.olive),                                         // Batteriekasten/Zündung
    );
    g.userData = { muzzle: new THREE.Vector3(0, 0.04, -0.85), sightY: 0.09, sightZ: 0.1, shoulder: true };
    return g;
  },
  kar98k() {
    const m = mats(), g = new THREE.Group();
    add(g,
      prof([[-44, -2], [-42, -11], [-32, -12], [-15, -6.2], [-6, -5.5], [-3, -9], [2, -8.5], [4, -3], [50, -2.2], [62, -1.6], [62, 1], [10, 1.2], [-8, 0.6], [-44, 2.2]], 4.2, m.woodLight),
      prof([[12, 1], [44, 1], [44, 2.2], [12, 2.4]], 3, m.woodLight, 0.12),    // Handschutz
      box(-8, 14, -0.6, 2.6, 2.6, m.blued),                                    // Hülse
      box(2, 13, -3.5, -0.6, 2.4, m.blued),                                    // Kastenmagazin
      tube(14, 88, 0.9, 0.85, m.blued, 8, 0.7),
      box(44, 47, -2.2, 1.6, 2.8, m.blued), box(58, 62, -1.8, 1.4, 2.6, m.blued),   // Bänder
      box(82, 86, 1.2, 3.2, 1.6, m.blued),                                     // Korn mit Tunnel
      box(12, 18, 1.8, 3.2, 1.6, m.blued),                                     // Schiebevisier
      tube(62, 90, -1.2, 0.3, m.steel, 6),                                     // Putzstock
      box(-1, 2, -5, -3, 0.5, m.steel),
    );
    // gebogener Kammerstängel
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.055, 6), m.blued);
    st.position.set(0.028, 0.0, 0.05); st.rotation.z = Math.PI / 2 + 0.6; g.add(st);
    const kn = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), m.blued); kn.position.set(0.045, -0.018, 0.05); g.add(kn);
    g.userData = { muzzle: new THREE.Vector3(0, 0.009, -0.9), sightY: 0.032, sightZ: 0.05 };
    return g;
  },
  kar98zf() {
    const g = BUILD.kar98k(), m = mats();
    add(g, tube(-6, 24, 6.5, 1.3, m.blued, 12), tube(-10, -6, 6.5, 1.8, m.blued, 12, 1.3), tube(24, 30, 6.5, 1.3, m.blued, 12, 1.9),
      box(0, 3, 2.6, 5.4, 1.4, m.blued), box(16, 19, 2.6, 5.4, 1.4, m.blued));
    g.userData = { muzzle: new THREE.Vector3(0, 0.009, -0.9), sightY: 0.065, sightZ: 0.17, scope: true };
    return g;
  },
  g43() {
    const m = mats(), g = new THREE.Group();
    add(g,
      prof([[-42, -2], [-40, -10.5], [-30, -11.5], [-14, -6], [-6, -5.5], [-3, -9], [2, -9], [4, -3], [40, -2.4], [40, 1], [-8, 0.8], [-42, 2.2]], 4.2, m.woodDark),
      prof([[8, 1], [36, 1], [36, 2.6], [8, 2.6]], 3.2, m.woodDark, 0.12),
      box(-8, 10, -0.6, 2.8, 2.8, m.blued),
      box(2, 9, -9, -0.6, 2.6, m.blued),                                       // 10er-Magazin
      tube(10, 76, 1, 0.85, m.blued, 8, 0.7),
      box(36, 52, 2.2, 4.0, 2.2, m.blued),                                     // Gassystem oben
      box(72, 75, 1.2, 3.2, 1.6, m.blued),
      box(-1, 2, -5, -3, 0.5, m.steel),
    );
    g.userData = { muzzle: new THREE.Vector3(0, 0.01, -0.76), sightY: 0.035, sightZ: 0.05 };
    return g;
  },
  mp40() {
    const m = mats(), g = new THREE.Group();
    add(g,
      prof([[-4, -1], [-3, -10], [2.5, -10], [3, -1]], 2.8, m.bakelite),      // Griff (Bakelit)
      box(-6, 20, -1.6, 2.4, 3.4, m.blued),                                    // Gehäuse (rund, vereinfacht)
      tube(-6, 20, 0.6, 1.9, m.blued, 12),
      box(6, 22, -3.4, -1.6, 3.2, m.bakelite),                                  // Unterschale
      box(14, 18, -22, -3.4, 2.2, m.blued),                                    // 32-Schuss-Stangenmagazin
      tube(20, 42, 0.6, 0.8, m.blued, 10),                                      // Lauf
      box(36, 38, -2.6, -0.6, 1.2, m.blued),                                    // Auflagehaken
      box(-2, 2, 2.4, 3.8, 1.4, m.blued), box(38, 40, 1.4, 3.2, 0.5, m.blued),
      // Klappschulterstütze (ausgeklappt)
      tube(-34, -6, -0.5, 0.45, m.blued, 6), box(-36, -34, -4, 2, 3, m.blued),
      box(10, 12, 2, 3.4, 2.6, m.steel, 1.2),                                  // Spannhebel
    );
    const s2 = tube(-34, -6, -3.2, 0.45, m.blued, 6); g.add(s2);
    g.userData = { muzzle: new THREE.Vector3(0, 0.006, -0.42), sightY: 0.034, sightZ: 0.06 };
    return g;
  },
  stg44() {
    const m = mats(), g = new THREE.Group();
    add(g,
      prof([[-44, -1], [-42, -9], [-34, -10], [-22, -3], [-22, 1.6], [-44, 2.4]], 3.8, m.woodLight),   // Holzkolben
      prof([[-4, -1], [-3, -10], [2, -10], [3, -1]], 2.8, m.bakelite),
      box(-22, 26, -1.8, 3.0, 3.0, m.blued),                                   // Blechprägegehäuse
      box(26, 34, -1.4, 2.4, 3.2, m.blued),                                    // Gasrohr-Ende
      prof([[2, -1.8], [12, -1.8], [14, -10], [16, -18], [12, -19], [8, -11], [5, -6]], 2.4, m.blued, 0.2),  // gebogenes Magazin
      tube(26, 56, 0.6, 0.8, m.blued, 10),
      tube(22, 50, 2.6, 0.8, m.blued, 8),                                      // Gaszylinder
      box(-6, 10, 3.0, 4.0, 1.6, m.blued),                                     // Kurvenvisier
      box(52, 55, 1.4, 3.6, 1.6, m.blued),
      prof([[-4, -1.8], [4, -1.8], [4, -5], [1, -5], [0, -3], [-4, -3]], 0.6, m.blued, 0),
    );
    g.userData = { muzzle: new THREE.Vector3(0, 0.006, -0.56), sightY: 0.04, sightZ: 0.05 };
    return g;
  },
  mg42() {
    const m = mats(), g = new THREE.Group();
    add(g,
      prof([[-48, -1], [-46, -9], [-38, -9.5], [-24, -2.5], [-24, 2.2], [-48, 2.2]], 3.8, m.bakelite),   // Kolben
      prof([[-6, -1], [-5, -10], [0, -10], [1, -1]], 2.8, m.bakelite),
      box(-24, 14, -2.2, 3.6, 4.4, m.blued),                                    // Gehäuse
      box(-12, 6, 3.6, 4.6, 4.2, m.blued),                                      // Deckel
      box(14, 60, -2, 3.2, 4.2, m.blued),                                       // Laufmantel
      tube(60, 72, 0.6, 1.4, m.blued, 10, 1.6),                                  // Rückstoßverstärker
      box(-2, 8, -9, -2.2, 5, m.olive, -5.6),                                    // Gurttrommel (50 Schuss)
      box(-6, 14, -1, 1, 6, m.brass, -4.2),                                      // Patronengurt
      box(54, 56, 3.2, 6.4, 0.6, m.blued),                                       // Korn (klappbar)
      box(2, 6, 4.6, 6.4, 1.2, m.blued),
    );
    // Lochung des Laufmantels: dunkle Ovale
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    for (let i = 0; i < 6; i++) {
      const h = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.012), holeMat);
      h.rotation.y = Math.PI / 2; h.position.set(0.0215, 0.006, -0.19 - i * 0.065); g.add(h);
      const h2 = h.clone(); h2.rotation.y = -Math.PI / 2; h2.position.x = -0.0215; g.add(h2);
    }
    // Zweibein
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.3, 6), m.blued);
      leg.position.set(sx * 0.03, -0.08, -0.55); leg.rotation.x = 0.45; leg.rotation.z = sx * 0.2; g.add(leg);
    }
    g.userData = { muzzle: new THREE.Vector3(0, 0.006, -0.72), sightY: 0.065, sightZ: 0.1 };
    return g;
  },
  p38() {
    const m = mats(), g = new THREE.Group();
    add(g,
      prof([[-4, 0], [-3, -10], [2, -10], [2.5, 0]], 2.8, m.bakelite),
      box(-6, 13, 0, 3.0, 2.4, m.blued),
      tube(8, 15, 1.8, 0.7, m.blued, 8),
      box(-4, 10, -2.2, 0, 2.2, m.blued),
      prof([[2, -1], [7, -1], [7, -4], [4, -4], [3, -2]], 0.5, m.blued, 0),
    );
    g.userData = { muzzle: new THREE.Vector3(0, 0.018, -0.15), sightY: 0.035, sightZ: 0.02 };
    return g;
  },
  panzerfaust() {
    const m = mats(), g = new THREE.Group();
    add(g,
      tube(-55, 30, 0, 2.2, m.field, 12),                                        // Abschussrohr
      // Gefechtskopf 149 mm
      tube(30, 40, 0, 2.6, m.olive, 14, 2.2), tube(40, 52, 0, 7.4, m.olive, 16, 2.6), tube(52, 60, 0, 3, m.olive, 16, 7.4),
      box(12, 16, 2.2, 6.5, 0.6, m.steel),                                        // Klappvisier
      box(4, 10, 2.2, 3.4, 2, m.steel),                                           // Abzugshebel
    );
    g.userData = { muzzle: new THREE.Vector3(0, 0, -0.6), sightY: 0.065, sightZ: 0.1, shoulder: true };
    return g;
  },
  mk2() {
    const m = mats(), g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), m.olive); body.scale.set(1, 1.25, 1); g.add(body);
    // Riffelung
    const rib = new THREE.MeshStandardMaterial({ color: 0x3e432b, roughness: 0.8 });
    for (let i = -1; i <= 1; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.031 * Math.cos(i * 0.5), 0.003, 4, 12), rib); r.rotation.x = Math.PI / 2; r.position.y = i * 0.02; g.add(r); }
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.025, 8), m.steel); fuse.position.y = 0.045; g.add(fuse);
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.06, 0.004), m.steel); lever.position.set(0.014, 0.025, 0); lever.rotation.z = -0.25; g.add(lever);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.01, 0.0015, 4, 10), m.steel); ring.position.set(-0.012, 0.055, 0); g.add(ring);
    g.userData = { muzzle: new THREE.Vector3(), sightY: 0, sightZ: 0 };
    return g;
  },
  m8smoke() {
    const m = mats(), g = new THREE.Group();
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.115, 12), new THREE.MeshStandardMaterial({ color: 0x9a9a8a, roughness: 0.6 }));
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 12), new THREE.MeshStandardMaterial({ color: 0xd8d8c8, roughness: 0.7 }));
    band.position.y = 0.02; g.add(can, band);
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.025, 8), m.steel); fuse.position.y = 0.07; g.add(fuse);
    g.userData = { muzzle: new THREE.Vector3(), sightY: 0, sightZ: 0 };
    return g;
  },
  nb39() {
    const g = BUILD.stiel();
    g.traverse((o) => { if (o.isMesh && o.position.y > 0.1) { o.material = new THREE.MeshStandardMaterial({ color: 0x6b6f63, roughness: 0.7 }); } });
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 14), new THREE.MeshStandardMaterial({ color: 0xe8e8e0 }));
    ring.position.y = 0.17; g.add(ring);   // weißer Ring = Nebelhandgranate
    return g;
  },
  stiel() {
    const m = mats(), g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.075, 14), m.field); head.position.y = 0.17; g.add(head);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.28, 10), m.wood); stick.position.y = 0.0; g.add(stick);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 10), m.steel); cap.position.y = -0.145; g.add(cap);
    g.rotation.x = -0.3;
    g.userData = { muzzle: new THREE.Vector3(), sightY: 0, sightZ: 0 };
    return g;
  },
};

// Visierung: Lage von Kimme (rear) und Korn (front) entlang der Laufachse (cm, wie die Profile),
// Höhe der Visierlinie h (cm über dem Ursprung), Art der Kimme und ob das Korn einen Tunnel hat
export const SIGHTS = {
  garand: { rear: -4.5, front: 79, h: 5.0, type: 'aperture', ears: true },
  carbine: { rear: -3, front: 50, h: 3.9, type: 'aperture', ears: true },
  thompson: { rear: -9, front: 42, h: 4.6, type: 'aperture' },
  bar: { rear: -4, front: 81, h: 4.6, type: 'aperture', ears: true },
  m1911: { rear: -5, front: 14, h: 4.3, type: 'notch' },
  kar98k: { rear: 15, front: 84, h: 3.7, type: 'notch', hood: true },
  g43: { rear: 4, front: 73.5, h: 4.0, type: 'notch', hood: true },
  mp40: { rear: 0, front: 39, h: 4.0, type: 'notch', hood: true },
  stg44: { rear: 2, front: 53.5, h: 4.3, type: 'notch', hood: true },
  mg42: { rear: 4, front: 55, h: 6.8, type: 'notch' },
  p38: { rear: -5, front: 12, h: 3.6, type: 'notch' },
};
function addSights(g, S) {
  const m = new THREE.MeshStandardMaterial({ color: 0x17191c, roughness: 0.7, metalness: 0.2 });
  const post = new THREE.MeshBasicMaterial({ color: 0x0b0b0b });
  const B = (x0, x1, y0, y1, w, z, mat = m) => { const b = box(x0, x1, y0, y1, w, mat, z); g.add(b); return b; };
  const h = S.h;
  // grobe Visierteile des Grundmodells entfernen, die neue Visierung ersetzt sie
  const bb = new THREE.Box3(), sz = new THREE.Vector3(), c = new THREE.Vector3();
  for (const ch of [...g.children]) {
    if (!ch.isMesh) continue;
    bb.setFromObject(ch); bb.getSize(sz); bb.getCenter(c);
    const near = Math.abs(c.z + S.rear / 100) < 0.045 || Math.abs(c.z + S.front / 100) < 0.04;
    if (near && sz.x < 0.03 && sz.y < 0.03 && sz.z < 0.08 && bb.max.y > (h - 2.2) / 100) g.remove(ch);
  }
  // Korn: schmale Klinge, oben auf der Visierlinie
  B(S.front - 0.2, S.front + 0.2, h - 2.0, h, 0.2, 0, post);
  B(S.front - 0.6, S.front + 0.6, h - 2.6, h - 1.9, 1.2, 0);           // Kornfuß
  if (S.ears) for (const sx of [-1, 1]) B(S.front - 0.5, S.front + 0.5, h - 2.4, h + 0.35, 0.22, sx * 0.85);   // Schutzohren (US)
  if (S.hood) {                                                          // Korntunnel (DE)
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.13, 4, 12, Math.PI), m);
    t.position.set(0, (h - 0.9) / 100, -S.front / 100); t.scale.setScalar(0.01 * 100 / 100); g.add(t);
    t.scale.set(0.01, 0.01, 0.01); t.geometry.scale(1, 1, 1);
  }
  if (S.type === 'aperture') {
    // Lochkimme: Ring, durch dessen Mitte man blickt
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.09, 6, 20), m);
    r.position.set(0, h / 100, -S.rear / 100); r.scale.set(0.01, 0.01, 0.01);
    g.add(r);
    B(S.rear - 0.15, S.rear + 0.15, h - 1.6, h - 0.5, 0.25, 0);
  } else {
    // offene Kimme: zwei Blöcke mit Kerbe
    for (const sx of [-1, 1]) B(S.rear - 0.2, S.rear + 0.2, h - 0.55, h, 0.45, sx * 0.4);
    B(S.rear - 0.2, S.rear + 0.2, h - 1.0, h - 0.55, 1.25, 0);
  }
  g.userData.sight = { h: h / 100, rear: -S.rear / 100, front: -S.front / 100, type: S.type };
}

const cache = new Map();
// Modell (geteilte Geometrie, Klon je Verwendung)
export function weaponModel(id) {
  if (!cache.has(id)) {
    const g = (BUILD[id] || BUILD.garand)(); if (SIGHTS[id]) addSights(g, SIGHTS[id]);
    g.updateMatrixWorld(true);
    const done = new Set();
    g.traverse((o) => { if (o.isMesh && !done.has(o.geometry)) { done.add(o.geometry); const geo = o.geometry; geo.applyMatrix4(o.matrixWorld); boxProjectUV(geo, 3.5); geo.applyMatrix4(new THREE.Matrix4().copy(o.matrixWorld).invert()); } });
    cache.set(id, g);
  }
  const src = cache.get(id);
  const c = src.clone(true);
  c.userData = { ...src.userData };
  return c;
}
