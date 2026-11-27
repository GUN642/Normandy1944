// Kartenbeschreibungen: Höhenprofil, Straßen, Orte, Sonderbauten und benannte Punkte (Anker).
// Koordinaten in Metern, Karte −450 … 450; Norden = −z (Ärmelkanal liegt im Norden).
import { smoothstep, clamp } from './util.js';

const g2 = (x, z, cx, cz, r) => Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (r * r));

// Bombentrichter-Feld (Pointe du Hoc, Bombenteppich bei Operation Cobra)
function craters(x, z, cell, depth) {
  const cx = Math.floor(x / cell), cz = Math.floor(z / cell);
  const hx = Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453, fx = hx - Math.floor(hx);
  const hz = Math.sin(cx * 39.3468 + cz * 11.135) * 24634.6345, fz = hz - Math.floor(hz);
  const px = (cx + 0.2 + fx * 0.6) * cell, pz = (cz + 0.2 + fz * 0.6) * cell;
  const d = Math.hypot(x - px, z - pz), r = (4 + fx * 5) * depth;
  if (d < r) return -(1 - (d / r) ** 2) * r * 0.45;
  if (d < r * 1.3) return Math.sin(((d - r) / (r * 0.3)) * Math.PI) * 0.6 * depth;
  return 0;
}

export const MAPS = {
  // ---------------------------------------------------------------- Absprung bei Nacht
  bocage_night: {
    seed: 6441, amp: 5, hedge: 1,
    height: (x, z, n) => n.fbm(x / 260, z / 260, 3) * 6 + n.fbm(x / 70, z / 70, 2) * 1.2,
    roads: [
      { w: 6, pts: [[120, -450], [110, -200], [125, 0], [120, 180], [150, 330], [160, 450]] },
      { w: 5, pts: [[-450, 175], [-200, 190], [0, 178], [120, 180], [300, 170], [450, 190]] },
      { w: 4, pts: [[-60, -40], [-40, 60], [0, 178]] },
    ],
    towns: [{ x: 165, z: 345, r: 70, n: 9, church: { x: 175, z: 360, ry: Math.PI / 2 } }],
    farms: [{ x: -60, z: -40, ry: 0.3 }, { x: 300, z: -260, ry: 1.2 }, { x: -300, z: 300, ry: -0.4 }],
    features: [
      { type: 'flak', id: 'flak1', x: -88, z: -72, crew: true },
      { type: 'flak', id: 'flak2', x: -22, z: -80, crew: true },
      { type: 'sandbags', x: -88, z: -72, r: 2.6 }, { type: 'sandbags', x: -22, z: -80, r: 2.6 },
    ],
    clear: [[-60, -50, 55]],
    anchors: { farm: [-60, -40], flak1: [-88, -72], flak2: [-22, -80], village: [160, 330], cross: [120, 180], rally: [140, 232], pt1: [-250, -240], pt2: [230, -190], pt3: [-300, 140], pt4: [60, -320], dzE: [380, -60], jump: [-190, -160] },
  },

  // ---------------------------------------------------------------- Sainte-Mère-Église
  stmere: {
    seed: 1944, amp: 2, hedge: 0.9,
    height: (x, z, n) => n.fbm(x / 300, z / 300, 3) * 3,
    roads: [
      { w: 7, pts: [[40, -450], [38, -200], [42, -40], [40, 0], [40, 200], [44, 450]], name: 'N13' },
      { w: 6, pts: [[-450, -8], [-200, -5], [-40, -10], [40, -10], [200, 8], [450, 20]] },
      { w: 5, pts: [[-30, 30], [-140, 160], [-300, 300]] },
      { w: 5, pts: [[80, -50], [200, -180], [320, -330]] },
    ],
    towns: [{ x: 10, z: 0, r: 165, n: 46, square: { x: 0, z: 10, w: 70, d: 64 }, church: { x: 0, z: 5, ry: Math.PI / 2 } }],
    farms: [{ x: -280, z: -250, ry: 0.2 }, { x: 290, z: 290, ry: 1.0 }],
    features: [
      { type: 'flagpole', id: 'townhall', x: 58, z: 40, side: 'us' },
      { type: 'sandbags', x: 40, z: 170, r: 2.4 },
    ],
    townhall: { x: 62, z: 44, ry: Math.PI },
    clear: [],
    anchors: { square: [0, 30], church: [0, 5], townhall: [58, 40], westEdge: [-260, -5], northRoad: [38, -300], roadS: [40, 165], southRoad: [44, 420] },
  },

  // ---------------------------------------------------------------- Omaha Beach (Dog Green)
  omaha: {
    seed: 6630, amp: 0, hedge: 0.8, sea: -255, beach: true,
    height: (x, z, n) => {
      const draw = Math.exp(-((x + 185) ** 2) / (2 * 34 * 34));             // Ausgang D-1 (Taleinschnitt)
      let h;
      if (z < -255) h = -1.5 - (-255 - z) * 0.03;
      else if (z < -122) h = -1.2 + ((z + 255) / 133) * 2.6;                // flacher Gezeitenstrand
      else if (z < -112) h = 1.4 + Math.sin(((z + 122) / 10) * Math.PI) * 1.4 + 0.6;   // Kieselbank
      else if (z < -78) h = 2.2 + n.noise(x / 30, z / 30) * 0.4;           // Uferstreifen / Sumpf
      else {
        const t = smoothstep(-78, -18, z);
        const bluff = 2.2 + t * 34 + n.fbm(x / 60, z / 40, 3) * 3 * t;
        h = bluff * (1 - draw * 0.75) + draw * 0.75 * (2.2 + smoothstep(-78, 120, z) * 30);
        if (z > -18) h += n.fbm(x / 200, z / 200, 2) * 4;
      }
      return h;
    },
    roads: [
      { w: 6, pts: [[-450, -95], [-185, -92], [100, -96], [450, -94]] },
      { w: 6, pts: [[-185, -92], [-188, -30], [-180, 60], [-160, 150], [-150, 450]] },
      { w: 5, pts: [[-450, 160], [-160, 150], [100, 140], [450, 170]] },
    ],
    towns: [{ x: -150, z: 200, r: 80, n: 12, church: { x: -120, z: 230, ry: Math.PI / 2 } }],
    farms: [{ x: 250, z: 260, ry: 0.5 }],
    ruinsAlong: { z: -96, x0: -330, x1: 300, n: 7 },
    features: [
      { type: 'bunker', id: 'wn1', x: -75, z: -32, ry: 0, crew: true },
      { type: 'bunker', id: 'wn2', x: 95, z: -28, ry: 0.15, crew: true },
      { type: 'bunker', id: 'wn3', x: -215, z: -78, ry: -Math.PI / 2 + 0.2, crew: true, size: 1.2 },
      { type: 'wire', id: 'wire1', x: -30, z: -104, len: 26, ry: Math.PI / 2, target: true },
      { type: 'wireline', z: -104, x0: -330, x1: 330, skip: [-43, -17] },
      { type: 'wireline', z: -40, x0: -260, x1: 260, skip: [-200, -170] },
      { type: 'obstacles', z0: -245, z1: -150, x0: -400, x1: 400, n: 170 },
      { type: 'sandbags', x: 20, z: -14, r: 2.4 }, { type: 'sandbags', x: -150, z: -20, r: 2.4 },
      { type: 'trenchline', pts: [[-150, -16], [-75, -22], [0, -12], [95, -18], [160, -14]] },
    ],
    clear: [[-150, 200, 60]],
    noHedge: (x, z) => z < -5,
    anchors: { boat: [0, -300], shingle: [0, -118], wire1: [-30, -104], bluff: [-20, -20], trench: [0, -10], wn1: [-75, -32], wn2: [95, -28], wn3: [-215, -78], village: [-150, 170] },
  },

  // ---------------------------------------------------------------- Pointe du Hoc
  pointe: {
    seed: 7101, amp: 0, hedge: 0.7, sea: -212,
    height: (x, z, n) => {
      // Landzunge springt nach Norden vor
      const tip = -212 - Math.max(0, 90 - Math.abs(x)) * 0.9;
      const cliffZ = Math.abs(x) < 90 ? tip + 6 : -205;
      let h;
      if (z < cliffZ - 8) h = -2 - (cliffZ - 8 - z) * 0.05;
      else if (z < cliffZ) h = 0.4 + n.noise(x / 6, z / 6) * 0.3;                 // schmaler Kiesstreifen
      else {
        const t = smoothstep(cliffZ, cliffZ + 5, z);
        h = 0.4 + t * 29.6 + smoothstep(cliffZ, 400, z) * 8 + n.fbm(x / 120, z / 120, 3) * 2 * t;
      }
      // Bombentrichter auf dem Plateau
      if (z > cliffZ + 6 && z < 40) {
        const cx = Math.floor(x / 24), cz = Math.floor(z / 24);
        const hx = Math.sin(cx * 12.9898 + cz * 78.233) * 43758.5453, fx = hx - Math.floor(hx);
        const hz = Math.sin(cx * 39.3468 + cz * 11.135) * 24634.6345, fz = hz - Math.floor(hz);
        const px = (cx + 0.2 + fx * 0.6) * 24, pz = (cz + 0.2 + fz * 0.6) * 24;
        const d = Math.hypot(x - px, z - pz), r = 4 + fx * 5;
        if (d < r * 1.3) h += d < r ? -(1 - (d / r) ** 2) * r * 0.45 : Math.sin(((d - r) / (r * 0.3)) * Math.PI) * 0.6;
      }
      return h;
    },
    roads: [
      { w: 6, pts: [[-450, 82], [-200, 78], [0, 80], [200, 84], [450, 90]] },
      { w: 4, pts: [[0, -120], [0, 80], [20, 250], [40, 450]] },
    ],
    towns: [{ x: -40, z: 400, r: 60, n: 8 }],
    farms: [{ x: 280, z: 300, ry: 0.4 }],
    features: [
      { type: 'bunker', id: 'c1', x: -40, z: -150, ry: 0.2 }, { type: 'bunker', id: 'c2', x: 45, z: -160, ry: -0.2 },
      { type: 'bunker', id: 'c3', x: -110, z: -110, ry: 0.4 }, { type: 'bunker', id: 'c4', x: 110, z: -105, ry: -0.3 },
      { type: 'bunker', id: 'flakpos', x: -150, z: -150, ry: 0.9, crew: true, size: 0.8 },
      { type: 'gun', id: 'gun1', kind: 'gpf', x: 40, z: 250, ry: 0.1 }, { type: 'gun', id: 'gun2', kind: 'gpf', x: 62, z: 262, ry: 0.05 }, { type: 'gun', id: 'gun3', kind: 'gpf', x: 84, z: 252, ry: -0.05 },
      { type: 'orchard', x: 60, z: 255, w: 80, d: 60 },
      { type: 'ropes', pts: [[-30, -207], [-10, -209], [15, -208], [35, -206], [-55, -205], [60, -204]] },
      { type: 'wireline', z: -40, x0: -200, x1: 200, skip: [-6, 6] },
    ],
    clear: [[0, -120, 140]],
    noHedge: (x, z) => z < 20,
    anchors: { cliffBase: [0, -210], plateau: [0, -140], casemate: [0, -150], flakpos: [-150, -150], road: [0, 80], orchard: [60, 255], gun1: [40, 250], inland: [-30, 420] },
  },

  // ---------------------------------------------------------------- Brécourt Manor
  brecourt: {
    seed: 830, amp: 4, hedge: 1,
    height: (x, z, n) => n.fbm(x / 240, z / 240, 3) * 5 + z * -0.006,
    roads: [{ w: 5, pts: [[-450, 160], [-250, 170], [0, 120], [200, -150], [260, -300], [300, -450]] }, { w: 4, pts: [[200, -150], [230, -210]] }],
    towns: [{ x: -260, z: 190, r: 60, n: 7 }],
    farms: [{ x: 230, z: -215, ry: 0.15, manor: true }],
    features: [
      { type: 'gun', id: 'gun1', kind: 'lefh', x: -40, z: -118, ry: 0 }, { type: 'gun', id: 'gun2', kind: 'lefh', x: 12, z: -120, ry: 0 },
      { type: 'gun', id: 'gun3', kind: 'lefh', x: 62, z: -118, ry: 0 }, { type: 'gun', id: 'gun4', kind: 'lefh', x: 112, z: -121, ry: 0 },
      { type: 'trenchline', pts: [[-80, -110], [-20, -112], [40, -110], [100, -112], [150, -110]] },
      { type: 'hedgeline', pts: [[-110, -128], [180, -128]] },
      { type: 'sandbags', x: -92, z: -100, r: 2.2 }, { type: 'sandbags', x: 168, z: -96, r: 2.2 },
      { type: 'mg', id: 'mg1', x: -92, z: -100 }, { type: 'mg', id: 'mg2', x: 168, z: -96 },
    ],
    clear: [[35, -112, 95]],
    anchors: { start: [-200, 110], trench: [40, -110], manor: [230, -215], mg1: [-92, -100], mg2: [168, -96], gun1: [-40, -118] },
  },

  // ---------------------------------------------------------------- La Fière
  lafiere: {
    seed: 909, amp: 0, hedge: 0.9, flood: true,
    height: (x, z, n) => {
      let h = 3 + n.fbm(x / 200, z / 200, 3) * 3;
      const marsh = smoothstep(-350, -320, x) * (1 - smoothstep(125, 140, x));
      h = h * (1 - marsh) + marsh * (-0.75 + n.noise(x / 40, z / 40) * 0.25);
      const ch = Math.exp(-((x - 150) ** 2) / (2 * 7 * 7));                      // Flussbett des Merderet
      h -= ch * 3.5;
      const cw = Math.exp(-(z * z) / (2 * 4.5 * 4.5));                          // Damm
      if (x > -370 && x < 140) h = Math.max(h, h * (1 - cw) + cw * 1.3);
      return h;
    },
    roads: [{ w: 6, pts: [[-450, 0], [-380, 0], [130, 0]] }, { w: 6, pts: [[172, 0], [230, -5], [320, -60], [450, -120]] }, { w: 5, pts: [[-400, 0], [-420, 200], [-430, 450]] }],
    towns: [],
    farms: [{ x: 210, z: -32, ry: 0.0, manor: true }, { x: -400, z: 60, ry: 1.2 }],
    churches: [{ x: -405, z: -25, ry: Math.PI / 2 }],
    features: [
      { type: 'bridge', x: 151, z: 0, len: 26, w: 7 },
      { type: 'sandbags', x: 182, z: 8, r: 2.2 }, { type: 'sandbags', x: 182, z: -9, r: 2.2 },
      { type: 'wreck', x: 120, z: 4 },
    ],
    clear: [[200, -20, 45]],
    noHedge: (x, z) => x > -345 && x < 145,
    anchors: { bridge: [152, 0], bridgeE: [180, 0], manor: [210, -25], cauquigny: [-410, 10], westBank: [-360, -40], causewayMid: [-100, 0] },
    tankPath: [[-430, 0], [-370, 0], [-100, 0], [130, 0], [175, 0], [215, -5]],
  },

  // ---------------------------------------------------------------- Carentan
  carentan: {
    seed: 1212, amp: 1.5, hedge: 0.8, canal: -345,
    height: (x, z, n) => {
      let h = 1.5 + n.fbm(x / 300, z / 300, 2) * 1.5;
      if (z < -335) h = -1.6;
      return h;
    },
    roads: [
      { w: 7, pts: [[430, -440], [330, -330], [180, -200], [60, -60], [0, 40], [-40, 200], [-60, 300], [-80, 450]] },
      { w: 6, pts: [[180, -200], [100, -280], [-100, -300], [-450, -310]] },
      { w: 6, pts: [[-450, 40], [-150, 40], [0, 40], [180, 60], [450, 80]] },
      { w: 5, pts: [[0, 40], [120, 200], [300, 320]] },
    ],
    rail: { z: 320 },
    towns: [{ x: 0, z: 60, r: 210, n: 70, square: { x: 0, z: 40, w: 60, d: 56 }, church: { x: 50, z: -20, ry: Math.PI / 2 } }],
    farms: [{ x: 330, z: -150, ry: 0.6 }],
    station: { x: -60, z: 302, ry: 0 },
    features: [
      { type: 'sandbags', x: 150, z: -172, r: 2.4 }, { type: 'mg', id: 'mgnest', x: 150, z: -172 },
    ],
    clear: [],
    anchors: { entry: [330, -330], fork: [180, -200], mgnest: [150, -172], square: [0, 40], church: [50, -20], station: [-60, 290] },
  },

  // ---------------------------------------------------------------- Höhe 192
  stlo: {
    seed: 192, amp: 0, hedge: 1.15,
    height: (x, z, n) => {
      let h = g2(x, z, 0, -70, 230) * 42 + n.fbm(x / 160, z / 160, 3) * 5 + 4;
      const lane = Math.exp(-((z - 80) ** 2) / (2 * 3 * 3));                       // Hohlweg
      h -= lane * 2.2;
      return h;
    },
    roads: [{ w: 4, pts: [[-450, 82], [-200, 78], [0, 80], [200, 82], [450, 86]], sunken: true }, { w: 5, pts: [[0, 450], [10, 250], [0, 80]] }, { w: 5, pts: [[-60, -300], [-20, -420], [0, -450]] }],
    towns: [],
    ruins: [{ x: 0, z: -390, r: 70, n: 14 }],
    farms: [{ x: -260, z: 260, ry: 0.3 }, { x: 250, z: -200, ry: 1.0 }],
    features: [
      { type: 'gun', id: 'pak', kind: 'pak', x: 40, z: 74, ry: Math.PI, crew: true },
      { type: 'sandbags', x: -80, z: 40, r: 2.2 }, { type: 'sandbags', x: 90, z: 0, r: 2.2 }, { type: 'sandbags', x: 0, z: -80, r: 2.6 },
    ],
    clear: [[0, -80, 30]],
    anchors: { start: [0, 400], start2: [-200, 380], lane: [20, 80], pak: [40, 74], hedge1: [-80, 40], hedge2: [90, 0], hill: [0, -80], ruins: [0, -380] },
  },
};

// ---------------------------------------------------------------- Neue Tageslicht-Karten
// Utah Beach: breiter Strand, Ufermauer, Dünen (WN 5), geflutetes Hinterland mit Damm (Ausgang 1)
MAPS.utah = {
  seed: 6306, amp: 0, hedge: 0.9, sea: -258, beach: true, flood: true,
  height: (x, z, n) => {
    let h;
    if (z < -258) h = -1.6 - (-258 - z) * 0.03;
    else if (z < -122) h = -1.3 + ((z + 258) / 136) * 2.9;                    // sehr breiter, flacher Strand
    else if (z < -84) h = 1.6 + Math.max(0, Math.sin(((z + 122) / 38) * Math.PI)) * (3.2 + n.noise(x / 25, 1) * 1.2);   // Dünen
    else if (z < 170) {                                                       // geflutetes Marschland
      h = -0.7 + n.noise(x / 40, z / 40) * 0.25;
      const cw = Math.exp(-(x * x) / (2 * 4.5 * 4.5));                       // Damm (Ausgang 1 nach Pouppeville)
      h = h * (1 - cw) + cw * 1.3;
      const t = smoothstep(-84, -66, z);                                      // Dünenrückseite fällt zum Marschland ab
      h = 1.6 * (1 - t) + h * t;
    } else h = 1.5 + smoothstep(170, 230, z) * 4 + n.fbm(x / 200, z / 200, 3) * 3;
    return h;
  },
  roads: [{ w: 6, pts: [[0, -95], [0, 0], [0, 170], [10, 300], [0, 450]] }, { w: 5, pts: [[-450, 240], [0, 240], [450, 260]] }],
  towns: [{ x: 10, z: 340, r: 70, n: 12, church: { x: 40, z: 360, ry: Math.PI / 2 } }],
  farms: [{ x: -260, z: 300, ry: 0.3 }, { x: 280, z: 330, ry: 1.0 }],
  ruinsAlong: { z: -130, x0: 150, x1: 380, n: 3 },
  features: [
    { type: 'seawall', z: -119, x0: -440, x1: 440, gaps: [[-8, 8], [-170, -150], [160, 180]] },
    { type: 'bunker', id: 'wn5a', x: -55, z: -96, ry: 0.1, crew: true },
    { type: 'bunker', id: 'wn5b', x: 70, z: -98, ry: -Math.PI / 2 + 0.5, crew: true, size: 1.1 },
    { type: 'sandbags', x: 18, z: -100, r: 2.4 }, { type: 'sandbags', x: -120, z: -98, r: 2.4 },
    { type: 'obstacles', z0: -240, z1: -140, x0: -420, x1: 420, n: 90 },
    { type: 'wireline', z: -112, x0: -440, x1: 440, skip: [-12, 12] },
    { type: 'trenchline', pts: [[-140, -90], [-60, -88], [0, -86], [70, -90], [140, -88]] },
  ],
  clear: [[0, 340, 60]],
  noHedge: (x, z) => z < 175,
  anchors: { boat: [0, -300], seawall: [0, -125], dunes: [0, -92], wn5a: [-55, -96], wn5b: [70, -98], causeway: [0, 60], exit: [0, 185], village: [10, 330], marsh: [-120, 40] },
};

// Operation Cobra: Bocage voller Bombentrichter, Straße Saint-Lô–Périers, Marigny
MAPS.cobra = {
  seed: 2507, amp: 0, hedge: 1,
  height: (x, z, n) => 6 + n.fbm(x / 240, z / 240, 3) * 5 + (z < 120 ? craters(x, z, 26, 0.9) : 0),
  roads: [
    { w: 7, pts: [[-450, -60], [-200, -64], [0, -60], [200, -55], [450, -58]], name: 'St-Lô–Périers' },
    { w: 6, pts: [[20, -450], [10, -200], [0, -60], [10, 150], [0, 320], [-10, 450]] },
    { w: 5, pts: [[-450, 300], [0, 320], [450, 300]] },
  ],
  towns: [{ x: 0, z: 330, r: 75, n: 16, church: { x: 30, z: 345, ry: Math.PI / 2 } }],
  farms: [{ x: -250, z: -250, ry: 0.4 }, { x: 260, z: 120, ry: 1.1 }, { x: -230, z: 160, ry: -0.3 }],
  ruins: [{ x: 120, z: -40, r: 30, n: 4 }],
  features: [
    { type: 'sandbags', x: -40, z: -50, r: 2.4 }, { type: 'sandbags', x: 60, z: -48, r: 2.4 },
    { type: 'mg', id: 'mgroad', x: -40, z: -50 },
    { type: 'gun', id: 'pak1', kind: 'pak', x: 15, z: 20, ry: Math.PI, crew: true },
  ],
  clear: [[0, 330, 60]],
  anchors: { start: [0, -380], start2: [-160, -360], road: [0, -60], mgroad: [-40, -50], pak1: [15, 20], hedgeS: [0, 120], marigny: [0, 320], deRear: [0, 430] },
};

// Kessel von Falaise: Chambois an der Dives mit dem Donjon
MAPS.chambois = {
  seed: 2008, amp: 0, hedge: 0.9, river: true,
  height: (x, z, n) => {
    let h = 2.2 + n.fbm(x / 220, z / 220, 3) * 3 + smoothstep(150, 420, Math.abs(x - 60)) * 10;
    const ch = Math.exp(-((x + 60 - Math.sin(z / 90) * 12) ** 2) / (2 * 6 * 6));     // die Dives (gewunden)
    h -= ch * 3.6;
    return h;
  },
  roads: [
    { w: 6, pts: [[-450, 10], [-200, 0], [-60, 0], [60, 10], [200, 30], [450, 60]] },
    { w: 5, pts: [[60, 10], [70, -200], [60, -450]] },
    { w: 5, pts: [[60, 10], [40, 200], [30, 450]] },
  ],
  towns: [{ x: 70, z: 20, r: 85, n: 22, square: { x: 70, z: 25, w: 46, d: 40 }, church: { x: 100, z: -30, ry: Math.PI / 2 } }],
  farms: [{ x: -300, z: -200, ry: 0.3 }, { x: -280, z: 250, ry: 1.0 }, { x: 320, z: 280, ry: 0.5 }],
  features: [
    { type: 'bridge', x: -60, z: 0, len: 26, w: 7, y: 2.0 },
    { type: 'keep', x: 30, z: -40 },
    { type: 'sandbags', x: -30, z: 6, r: 2.4 }, { type: 'sandbags', x: -28, z: -12, r: 2.4 },
  ],
  clear: [[70, 20, 80]],
  noHedge: (x, z) => Math.abs(x + 60 - Math.sin(z / 90) * 12) < 10,
  anchors: { square: [70, 25], bridge: [-60, 0], bridgeE: [-35, 0], keep: [30, -40], westStart: [-380, 0], westStart2: [-360, -160], eastExit: [330, 50], usStart: [260, 40], ridge: [-200, -40] },
};

// Batterie Azeville (9. Juni 1944): vier Kasematten im Feld, Draht, Gräben, MG-Nester; Dorf Azeville im Westen
MAPS.azeville = {
  seed: 909, amp: 0, hedge: 1,
  height: (x, z, n) => 8 + n.fbm(x / 250, z / 250, 3) * 6 + g2(x, z, 0, -60, 90) * 3,
  roads: [
    { w: 5, pts: [[-450, -40], [-250, -40], [0, 10], [250, 60], [450, 80]] },
    { w: 4, pts: [[260, 450], [250, 200], [250, 60]] },
    { w: 4, pts: [[-250, -40], [-240, 200], [-260, 450]] },
  ],
  towns: [{ x: -260, z: -50, r: 60, n: 10, church: { x: -250, z: -80, ry: 0 } }],
  farms: [{ x: 220, z: 300, ry: 0.4 }, { x: -170, z: 280, ry: 1.2 }, { x: 330, z: -200, ry: 0.2 }],
  features: [
    { type: 'bunker', id: 'az1', x: -62, z: -72, ry: 0.45, crew: true },
    { type: 'bunker', id: 'az2', x: -22, z: -96, ry: 0.15, crew: true },
    { type: 'bunker', id: 'az3', x: 24, z: -96, ry: -0.15, crew: true },
    { type: 'bunker', id: 'az4', x: 64, z: -72, ry: -0.45, crew: true },
    { type: 'sandbags', x: -50, z: -10, r: 2.4 }, { type: 'sandbags', x: 55, z: -12, r: 2.4 },
    { type: 'mg', id: 'mg1', x: -50, z: -10 }, { type: 'mg', id: 'mg2', x: 55, z: -12 },
    { type: 'trenchline', pts: [[-95, -32], [-45, -6], [0, 0], [48, -8], [98, -32]] },
    { type: 'wireline', z: 28, x0: -135, x1: 135, skip: [-6, 6] },
    { type: 'flak', id: 'flakaz', x: 0, z: -48, crew: true },
    { type: 'wreck', x: 160, z: 90 },
  ],
  clear: [[0, -50, 115]],
  noHedge: (x, z) => Math.hypot(x, z + 50) < 135,
  anchors: { usStart: [250, 380], usStart2: [60, 400], wire: [0, 62], battery: [0, -55], mg1: [-50, -10], mg2: [55, -12], az1: [-62, -72], az2: [-22, -96], az3: [24, -96], az4: [64, -72], village: [-250, -40], deRear: [-380, -150] },
};

// Cherbourg, Fort du Roule (25. Juni 1944): Festungsberg mit Steilhang zur Stadt (Norden), sanfter Südhang
MAPS.cherbourg = {
  seed: 2506, amp: 0, hedge: 1,
  height: (x, z, n) => {
    const hill = 30 * Math.exp(-(x * x) / (2 * 170 * 170)) * smoothstep(-45, 40, z) * (1 - smoothstep(100, 430, z));
    return 4 + n.fbm(x / 200, z / 200, 3) * 2.5 + hill;
  },
  roads: [
    { w: 6, pts: [[-120, 450], [-110, 200], [-90, 70], [-70, -40], [0, -230], [0, -450]], name: 'Route de Paris' },
    { w: 6, pts: [[-450, -230], [0, -230], [450, -235]] },
    { w: 4, pts: [[-90, 70], [0, 85], [110, 80]] },
  ],
  towns: [{ x: 0, z: -260, r: 170, n: 54, square: { x: 0, z: -230, w: 56, d: 46 }, church: { x: 70, z: -270, ry: 0 } }],
  ruins: [{ x: 0, z: 70, r: 34, n: 4 }, { x: -60, z: -150, r: 50, n: 4 }],
  farms: [{ x: 220, z: 330, ry: 0.4 }, { x: -300, z: 300, ry: 1.0 }],
  features: [
    { type: 'bunker', id: 'fort1', x: -42, z: 98, ry: Math.PI, crew: true },
    { type: 'bunker', id: 'fort2', x: 46, z: 102, ry: Math.PI, crew: true, size: 1.1 },
    { type: 'trenchline', pts: [[-140, 118], [-60, 124], [0, 126], [60, 124], [140, 116]] },
    { type: 'wireline', z: 150, x0: -60, x1: 160, skip: [-8, 8] },
    { type: 'flagpole', id: 'fortflag', x: 0, z: 70, side: 'us' },
    { type: 'sandbags', x: -15, z: 120, r: 2.4 },
    { type: 'wreck', x: -60, z: -170 }, { type: 'wreck', x: 30, z: -215 },
  ],
  clear: [[0, 80, 70]],
  noHedge: (x, z) => z < -40 || Math.hypot(x, z - 85) < 55,
  anchors: { usStart: [-110, 420], usStart2: [120, 400], slope: [-40, 200], fort: [0, 90], fort1: [-42, 98], fort2: [46, 102], fortflag: [0, 70], city: [0, -230], harbour: [0, -400], deRear: [0, -390], west: [-300, -200] },
};

// Mortain – Saint-Barthélemy (7. August 1944): Dorf an der Straße nach Westen, Höhe 314 im Nordwesten
MAPS.mortain = {
  seed: 807, amp: 0, hedge: 1,
  height: (x, z, n) => 10 + n.fbm(x / 260, z / 260, 3) * 8 + g2(x, z, -180, -260, 170) * 16,
  roads: [
    { w: 6, pts: [[-450, 10], [-200, 0], [0, 0], [200, -20], [450, -30]] },
    { w: 4, pts: [[0, 0], [20, -200], [10, -450]] },
    { w: 4, pts: [[0, 0], [-30, 200], [-20, 450]] },
  ],
  towns: [{ x: 0, z: 0, r: 78, n: 18, square: { x: 0, z: 6, w: 34, d: 30 }, church: { x: -32, z: -34, ry: Math.PI / 2 } }],
  farms: [{ x: 230, z: 160, ry: 0.4 }, { x: -230, z: 220, ry: 1.0 }, { x: 260, z: -230, ry: 0.3 }],
  features: [
    { type: 'sandbags', x: 82, z: -12, r: 2.4 }, { type: 'sandbags', x: 70, z: 22, r: 2.4 },
    { type: 'wreck', x: 150, z: -16 },
  ],
  clear: [[0, 0, 80]],
  anchors: { village: [0, 0], eastEntry: [85, -8], crossroads: [0, 6], westExit: [-250, 5], deStart: [420, -30], deStart2: [400, 160], usReserve: [-390, 0], hill: [-180, -260] },
};

// Kartennamen für das freie Spiel
export const MAP_NAMES = {
  bocage_night: { de: 'Bocage bei Sainte-Marie-du-Mont', en: 'Bocage near Sainte-Marie-du-Mont' },
  stmere: { de: 'Sainte-Mère-Église', en: 'Sainte-Mère-Église' },
  omaha: { de: 'Omaha Beach', en: 'Omaha Beach' },
  pointe: { de: 'Pointe du Hoc', en: 'Pointe du Hoc' },
  brecourt: { de: 'Brécourt Manor', en: 'Brécourt Manor' },
  lafiere: { de: 'La Fière', en: 'La Fière' },
  carentan: { de: 'Carentan', en: 'Carentan' },
  stlo: { de: 'Höhe 192 / Saint-Lô', en: 'Hill 192 / Saint-Lô' },
  utah: { de: 'Utah Beach', en: 'Utah Beach' },
  cobra: { de: 'Marigny (Operation Cobra)', en: 'Marigny (Operation Cobra)' },
  chambois: { de: 'Chambois (Kessel von Falaise)', en: 'Chambois (Falaise Pocket)' },
  azeville: { de: 'Batterie Azeville', en: 'Azeville battery' },
  cherbourg: { de: 'Cherbourg – Fort du Roule', en: 'Cherbourg – Fort du Roule' },
  mortain: { de: 'Mortain – Saint-Barthélemy', en: 'Mortain – Saint-Barthélemy' },
};

export const clampMap = (v) => clamp(v, -445, 445);
