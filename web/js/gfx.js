// Grafik-Helfer: Qualitätsstufen, Geometrie zusammenfassen (weniger Draw-Calls), prozedurale Texturen, Himmel
import * as THREE from './lib/three.module.min.js';

// ------------------------------------------------------------ Qualitätsstufen
export const PRESETS = {
  minimal: { pixel: 0.6, shadows: 0, shadowMap: 0, view: 260, trees: 0.35, grass: 0, particles: 0.35, ai: 0.55, antialias: false, lights: false, clutter: 0.3 },
  low: { pixel: 0.75, shadows: 0, shadowMap: 0, view: 360, trees: 0.55, grass: 0, particles: 0.5, ai: 0.7, antialias: false, lights: false, clutter: 0.5 },
  medium: { pixel: 1, shadows: 1, shadowMap: 1024, view: 480, trees: 0.8, grass: 0.5, particles: 0.75, ai: 0.85, antialias: false, lights: true, clutter: 0.8 },
  high: { pixel: 1.25, shadows: 1, shadowMap: 2048, view: 650, trees: 1, grass: 1, particles: 1, ai: 1, antialias: true, lights: true, clutter: 1 },
  ultra: { pixel: 2, shadows: 2, shadowMap: 4096, view: 900, trees: 1.25, grass: 1.6, particles: 1.3, ai: 1.15, antialias: true, lights: true, clutter: 1.3 },
};
export function qualityConfig(s) {
  const q = Object.assign({}, PRESETS[s.quality] || PRESETS.high);
  q.name = s.quality;
  q.pixel = Math.min(q.pixel * (s.renderScale || 1), window.devicePixelRatio || 1) * (s.renderScale > 1 ? s.renderScale : 1);
  q.pixel = Math.max(0.4, Math.min(q.pixel, (window.devicePixelRatio || 1) * Math.max(1, s.renderScale || 1)));
  q.view *= s.viewDist || 1;
  if (s.shadows === 'off') q.shadows = 0;
  else if (s.shadows === 'on' && !q.shadows) { q.shadows = 1; q.shadowMap = 1024; }
  if (s.effects === 'low') q.particles *= 0.5; else if (s.effects === 'high') q.particles *= 1.4;
  if (s.grass === false) q.grass = 0;
  return q;
}

// ------------------------------------------------------------ Geometrie zusammenfassen
// Teile: [{ geo, color, matrix }] -> eine BufferGeometry mit Vertexfarben (nicht indiziert)
const _m = new THREE.Matrix4(), _n = new THREE.Matrix3(), _v = new THREE.Vector3();
export function mergeColored(parts) {
  let count = 0;
  const geos = parts.map((p) => {
    const g = p.geo.index ? p.geo.toNonIndexed() : p.geo;
    count += g.attributes.position.count;
    return g;
  });
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), col = new Float32Array(count * 3);
  let o = 0;
  const c = new THREE.Color();
  parts.forEach((p, k) => {
    const g = geos[k], P = g.attributes.position, N = g.attributes.normal;
    _m.copy(p.matrix || _m.identity());
    if (!p.matrix) _m.identity();
    _n.getNormalMatrix(_m);
    c.set(p.color ?? 0xffffff);
    const shade = p.shade || null;
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(_m);
      pos[o * 3] = _v.x; pos[o * 3 + 1] = _v.y; pos[o * 3 + 2] = _v.z;
      _v.fromBufferAttribute(N, i).applyMatrix3(_n).normalize();
      nor[o * 3] = _v.x; nor[o * 3 + 1] = _v.y; nor[o * 3 + 2] = _v.z;
      let f = 1;
      if (shade) f = shade(pos[o * 3], pos[o * 3 + 1], pos[o * 3 + 2]);
      col[o * 3] = c.r * f; col[o * 3 + 1] = c.g * f; col[o * 3 + 2] = c.b * f;
      o++;
    }
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

// Gleiche Attribute (position, normal, uv) zusammenführen – für texturierte Gebäude
export function mergeTextured(parts) {
  let count = 0;
  const geos = parts.map((p) => { const g = p.geo.index ? p.geo.toNonIndexed() : p.geo; count += g.attributes.position.count; return g; });
  const pos = new Float32Array(count * 3), nor = new Float32Array(count * 3), uv = new Float32Array(count * 2), col = new Float32Array(count * 3);
  let o = 0;
  const c = new THREE.Color();
  parts.forEach((p, k) => {
    const g = geos[k], P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
    if (p.matrix) _m.copy(p.matrix); else _m.identity();
    _n.getNormalMatrix(_m);
    c.set(p.color ?? 0xffffff);
    const us = p.uvScale || [1, 1];
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(_m);
      pos.set([_v.x, _v.y, _v.z], o * 3);
      _v.fromBufferAttribute(N, i).applyMatrix3(_n).normalize();
      nor.set([_v.x, _v.y, _v.z], o * 3);
      if (U) { uv[o * 2] = U.getX(i) * us[0]; uv[o * 2 + 1] = U.getY(i) * us[1]; }
      col.set([c.r, c.g, c.b], o * 3);
      o++;
    }
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  out.computeBoundingSphere();
  return out;
}

// Box mit UVs in Metern (Textur kachelt gleichmäßig)
export function boxUV(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    const sx = nx > 0.5 ? d : w, sy = ny > 0.5 ? d : h;
    uv.setXY(i, uv.getX(i) * sx / 3, uv.getY(i) * sy / 3);
  }
  return g;
}

export const M4 = (x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0, s = 1) => {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(s, s, s));
  return m;
};
export const M4s = (x, y, z, ry, sx, sy, sz) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(sx, sy, sz));

// ------------------------------------------------------------ Prozedurale Texturen
function canvasTex(size, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
let rs = 12345;
const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647; };

const TEX = {};
export function tex(name) {
  if (TEX[name]) return TEX[name];
  rs = 777 + name.length * 31;
  let t;
  switch (name) {
    case 'stone':   // Normannisches Bruchsteinmauerwerk (Caen-Kalkstein, grau-beige)
      t = canvasTex(256, (c, s) => {
        c.fillStyle = '#9a9283'; c.fillRect(0, 0, s, s);
        let y = 0;
        while (y < s) {
          const h = 14 + rnd() * 16;
          let x = -rnd() * 20;
          while (x < s) {
            const w = 20 + rnd() * 34;
            const l = 150 + rnd() * 60 | 0, g = l - 6 - rnd() * 10 | 0, b = g - 10 - rnd() * 14 | 0;
            c.fillStyle = `rgb(${l},${g},${b})`;
            c.fillRect(x + 1.5, y + 1.5, w - 3, h - 3);
            c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x + 1.5, y + h - 4, w - 3, 2.5);
            x += w;
          }
          y += h;
        }
        for (let i = 0; i < 1800; i++) { c.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.08})`; c.fillRect(rnd() * s, rnd() * s, 2, 2); }
      });
      break;
    case 'plaster':
      t = canvasTex(128, (c, s) => {
        c.fillStyle = '#c9bfa8'; c.fillRect(0, 0, s, s);
        for (let i = 0; i < 1400; i++) { c.fillStyle = `rgba(${rnd() > 0.5 ? '255,250,240' : '60,50,40'},${rnd() * 0.12})`; c.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 3, 1 + rnd() * 3); }
        for (let i = 0; i < 8; i++) { c.fillStyle = `rgba(90,80,60,${0.06 + rnd() * 0.08})`; c.beginPath(); c.arc(rnd() * s, rnd() * s, 6 + rnd() * 20, 0, 7); c.fill(); }
      });
      break;
    case 'slate':   // Schieferdach
      t = canvasTex(128, (c, s) => {
        c.fillStyle = '#3b4048'; c.fillRect(0, 0, s, s);
        for (let y = 0; y < s; y += 10) for (let x = (y / 10) % 2 ? -6 : 0; x < s; x += 12) {
          const v = 50 + rnd() * 25 | 0;
          c.fillStyle = `rgb(${v},${v + 4},${v + 12})`; c.fillRect(x + 0.5, y + 0.5, 11, 9);
          c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x, y + 8.5, 12, 1.5);
        }
      });
      break;
    case 'tile':    // rote Ziegel (Scheunen)
      t = canvasTex(128, (c, s) => {
        c.fillStyle = '#7a3b2a'; c.fillRect(0, 0, s, s);
        for (let y = 0; y < s; y += 8) for (let x = (y / 8) % 2 ? -5 : 0; x < s; x += 10) {
          const v = rnd() * 30 | 0;
          c.fillStyle = `rgb(${120 + v},${58 + v / 2},${40 + v / 3})`; c.fillRect(x + 0.5, y + 0.5, 9, 7);
          c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x, y + 6.5, 10, 1.5);
        }
      });
      break;
    case 'concrete':
      t = canvasTex(128, (c, s) => {
        c.fillStyle = '#8c8b84'; c.fillRect(0, 0, s, s);
        for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${rnd() > 0.5 ? '230,230,220' : '30,30,30'},${rnd() * 0.12})`; c.fillRect(rnd() * s, rnd() * s, 1 + rnd() * 2, 1 + rnd() * 2); }
        c.strokeStyle = 'rgba(40,40,40,0.25)'; c.lineWidth = 1;
        for (let y = 16; y < s; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(s, y + rnd() * 2); c.stroke(); }   // Schalungsfugen
      });
      break;
    case 'wood':
      t = canvasTex(128, (c, s) => {
        c.fillStyle = '#5b4330'; c.fillRect(0, 0, s, s);
        for (let x = 0; x < s; x += 16) { c.fillStyle = `rgb(${80 + rnd() * 25},${58 + rnd() * 18},${40 + rnd() * 12})`; c.fillRect(x + 1, 0, 14, s); }
        for (let i = 0; i < 300; i++) { c.fillStyle = 'rgba(30,20,10,0.15)'; c.fillRect(rnd() * s, rnd() * s, 1, 6 + rnd() * 20); }
      });
      break;
    case 'splinter':   // Splittertarn (Fallschirmjäger-Knochensack)
      t = canvasTex(128, (c, s) => {
        c.fillStyle = '#8a8a6a'; c.fillRect(0, 0, s, s);
        const cols = ['#5d6b45', '#6e5a3e', '#7d8460'];
        for (let i = 0; i < 70; i++) {
          c.fillStyle = cols[i % 3]; c.beginPath();
          const x = rnd() * s, y = rnd() * s;
          c.moveTo(x, y); c.lineTo(x + 6 + rnd() * 26, y + rnd() * 10); c.lineTo(x + rnd() * 20, y + 8 + rnd() * 18); c.closePath(); c.fill();
        }
        c.strokeStyle = 'rgba(60,70,40,0.6)'; c.lineWidth = 1;
        for (let i = 0; i < 80; i++) { const x = rnd() * s, y = rnd() * s; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 2, y + 6); c.stroke(); }  // Regenstriche
      });
      break;
    case 'sand':
      t = canvasTex(256, (c, s) => {
        c.fillStyle = '#b8a582'; c.fillRect(0, 0, s, s);
        for (let i = 0; i < 9000; i++) { const v = rnd(); c.fillStyle = `rgba(${v > 0.5 ? '240,230,200' : '90,80,60'},${rnd() * 0.18})`; c.fillRect(rnd() * s, rnd() * s, 1.5, 1.5); }
      });
      break;
    case 'grass':      // Detailtextur für Wiesen (wird mit Vertexfarbe multipliziert)
      t = canvasTex(256, (c, s) => {
        c.fillStyle = '#808080'; c.fillRect(0, 0, s, s);
        for (let i = 0; i < 9000; i++) {
          const v = 90 + rnd() * 90 | 0;
          c.strokeStyle = `rgba(${v},${v + 10},${v - 20},0.5)`; c.lineWidth = 1;
          const x = rnd() * s, y = rnd() * s; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * 3, y - 2 - rnd() * 5); c.stroke();
        }
      });
      break;
    case 'leaves':     // Hecken-/Baumlaub mit Lücken (Alpha)
      t = canvasTex(128, (c, s) => {
        c.clearRect(0, 0, s, s);
        for (let i = 0; i < 900; i++) {
          const v = 50 + rnd() * 70 | 0;
          c.fillStyle = `rgba(${v * 0.55 | 0},${v},${v * 0.35 | 0},${0.85})`;
          c.beginPath(); c.ellipse(rnd() * s, rnd() * s, 2 + rnd() * 4, 1.2 + rnd() * 2.5, rnd() * 3, 0, 7); c.fill();
        }
      });
      break;
    case 'smoke':
      t = canvasTex(64, (c, s) => {
        const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = g; c.fillRect(0, 0, s, s);
      }, false);
      t.colorSpace = THREE.NoColorSpace;
      break;
    case 'flash':
      t = canvasTex(64, (c, s) => {
        const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
        g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(0.25, 'rgba(255,200,90,0.9)'); g.addColorStop(1, 'rgba(255,120,20,0)');
        c.fillStyle = g; c.fillRect(0, 0, s, s);
        c.strokeStyle = 'rgba(255,230,160,0.8)'; c.lineWidth = 3;
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; c.beginPath(); c.moveTo(s / 2, s / 2); c.lineTo(s / 2 + Math.cos(a) * s / 2, s / 2 + Math.sin(a) * s / 2); c.stroke(); }
      }, false);
      break;
    case 'flag_us':
      t = canvasTex(128, (c) => {
        for (let i = 0; i < 13; i++) { c.fillStyle = i % 2 ? '#f4f1ea' : '#b22234'; c.fillRect(0, i * 128 / 13, 128, 128 / 13 + 1); }
        c.fillStyle = '#3c3b6e'; c.fillRect(0, 0, 56, 69);
        c.fillStyle = '#fff'; for (let y = 0; y < 9; y++) for (let x = 0; x < (y % 2 ? 5 : 6); x++) c.fillRect(4 + x * 9 + (y % 2 ? 4.5 : 0), 3 + y * 7.4, 2.4, 2.4);
      }, false);
      break;
    case 'flag_fr':
      t = canvasTex(64, (c) => { c.fillStyle = '#0055a4'; c.fillRect(0, 0, 22, 64); c.fillStyle = '#fff'; c.fillRect(22, 0, 21, 64); c.fillStyle = '#ef4135'; c.fillRect(43, 0, 21, 64); }, false);
      break;
  }
  TEX[name] = t;
  return t;
}

// ------------------------------------------------------------ Himmel (Verlauf + Wolken + Sonne/Mond)
export function makeSky() {
  const geo = new THREE.SphereGeometry(1, 32, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x4a6a96) }, horizon: { value: new THREE.Color(0xb8c4cc) }, ground: { value: new THREE.Color(0x5a5e58) },
      sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color(0xfff2d0) }, sunSize: { value: 0.9995 },
      cloud: { value: 0.5 }, cloudCol: { value: new THREE.Color(0xc8ccd0) }, time: { value: 0 }, stars: { value: 0 },
    },
    vertexShader: 'varying vec3 vD; void main(){ vD = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
    fragmentShader: `
      uniform vec3 top, horizon, ground, sunDir, sunCol, cloudCol; uniform float sunSize, cloud, time, stars;
      varying vec3 vD;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float s=0.0, a=0.5; for(int i=0;i<5;i++){ s+=a*n(p); p*=2.03; a*=0.5; } return s; }
      void main(){
        vec3 d = normalize(vD);
        float y = d.y;
        vec3 col = y > 0.0 ? mix(horizon, top, pow(clamp(y,0.0,1.0), 0.55)) : mix(horizon, ground, clamp(-y*6.0,0.0,1.0));
        float sd = dot(d, normalize(sunDir));
        col += sunCol * (smoothstep(sunSize, 1.0, sd) * 2.0 + pow(max(sd,0.0), 24.0) * 0.35);
        if (stars > 0.0 && y > 0.0) { vec2 sp = d.xz / (y + 0.3) * 260.0; float st = step(0.9965, h(floor(sp))); col += vec3(st) * stars * clamp(y*3.0,0.0,1.0) * (1.0 - cloud); }
        if (y > 0.0) {
          vec2 uv = d.xz / (y + 0.12) * 1.6 + vec2(time * 0.004, time * 0.0015);
          float c = fbm(uv);
          float cov = smoothstep(1.0 - cloud * 0.95, 1.15 - cloud * 0.6, c);
          vec3 cc = mix(cloudCol, cloudCol * 0.62, smoothstep(0.4, 0.9, c));
          cc += sunCol * pow(max(sd,0.0), 8.0) * 0.25;
          col = mix(col, cc, cov * smoothstep(0.0, 0.18, y));
        }
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  m.renderOrder = -1;
  m.scale.setScalar(2000);
  return m;
}
