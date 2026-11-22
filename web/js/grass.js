// Gras: instanzierte Halmbüschel im Umkreis des Spielers, bewegen sich im Wind.
// Höhe, Dichte und Bodenfarbe kommen aus einer Datentextur des Geländes – die Büschel wandern
// rasterweise mit dem Spieler mit, ohne dass die CPU etwas aktualisieren muss.
import * as THREE from './lib/three.module.min.js';
import { SIZE, HALF } from './world.js';

function bladeTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const x = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const bx = 4 + Math.random() * 56, h = 60 + Math.random() * 66, lean = (Math.random() - 0.5) * 22, w = 1.6 + Math.random() * 2.2;
    const g = x.createLinearGradient(0, 128, 0, 128 - h);
    const v = 0.75 + Math.random() * 0.35;
    g.addColorStop(0, `rgba(${60 * v | 0},${82 * v | 0},${30 * v | 0},1)`);
    g.addColorStop(1, `rgba(${150 * v | 0},${170 * v | 0},${90 * v | 0},1)`);
    x.fillStyle = g;
    x.beginPath(); x.moveTo(bx - w, 128); x.quadraticCurveTo(bx + lean * 0.3, 128 - h * 0.6, bx + lean, 128 - h); x.quadraticCurveTo(bx + lean * 0.3 + w * 0.4, 128 - h * 0.6, bx + w, 128); x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Grass {
  constructor(game, world) {
    this.g = game;
    const q = game.q.grass;
    this.mesh = null;
    if (!q) return;
    const R = q > 1 ? 56 : 40;            // Kantenlänge/2 des Grasfeldes
    const step = q > 1 ? 0.75 : 0.95;      // Abstand der Büschel
    const n = Math.round((R * 2) / step);
    // Gelände-Datentextur: Höhe + Dichte (R,G) als Float
    const W = world, N = W.n + 1;
    const data = new Float32Array(N * N * 4);
    const col = new Uint8Array(N * N * 4);
    const cA = W.terrain.geometry.attributes.color;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const k = j * N + i;
      const x = -HALF + i * W.cell, z = -HALF + j * W.cell;
      const h = W.hgt[k];
      let d = 1;
      if (W.water && h < 0.4) d = 0;
      if (W.def.beach && z < -100 && h < 3.4) d = 0;
      if (W.nearRoad(x, z, 0.8)) d = 0;
      if (W.footprintAt && W.footprintAt(x, z, 0.8)) d = 0;   // kein Gras durch Hausböden
      for (const t of W.towns) if (t.square && Math.abs(x - t.square.x) < t.square.w / 2 && Math.abs(z - t.square.z) < t.square.d / 2) d = 0;
      const nrm = W.normal(x, z);
      if (nrm.y < 0.7) d *= 0.3;
      data[k * 4] = h; data[k * 4 + 1] = d;
      // Bodenfarbe aus dem Geländemesh (gleiche Reihenfolge der Eckpunkte)
      col[k * 4] = Math.min(255, cA.getX(k) * 255); col[k * 4 + 1] = Math.min(255, cA.getY(k) * 255); col[k * 4 + 2] = Math.min(255, cA.getZ(k) * 255); col[k * 4 + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.FloatType);
    tex.magFilter = tex.minFilter = THREE.NearestFilter; tex.needsUpdate = true;
    const ctex = new THREE.DataTexture(col, N, N, THREE.RGBAFormat);
    ctex.magFilter = ctex.minFilter = THREE.LinearFilter; ctex.needsUpdate = true;
    // Büschel: drei gekreuzte Halmkarten
    const base = new THREE.PlaneGeometry(0.85, 0.55, 1, 2); base.translate(0, 0.275, 0);
    const parts = [];
    for (let i = 0; i < 3; i++) { const p = base.clone(); p.rotateY((i / 3) * Math.PI); parts.push(p); }
    const geo = new THREE.InstancedBufferGeometry();
    const pos = [], uv = [], idx = [];
    let o = 0;
    for (const p of parts) {
      const P = p.attributes.position, U = p.attributes.uv;
      for (let v = 0; v < P.count; v++) { pos.push(P.getX(v), P.getY(v), P.getZ(v)); uv.push(U.getX(v), U.getY(v)); }
      const I = p.index.array; for (let v = 0; v < I.length; v++) idx.push(I[v] + o);
      o += P.count;
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    const off = new Float32Array(n * n * 4);
    let c = 0;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      off[c++] = (i + Math.random() * 0.9) * step; off[c++] = (j + Math.random() * 0.9) * step;
      off[c++] = Math.random() * 6.28; off[c++] = 0.65 + Math.random() * 0.7;
    }
    geo.setAttribute('iOff', new THREE.InstancedBufferAttribute(off, 4));
    geo.instanceCount = n * n;
    this.u = {
      uMap: { value: bladeTexture() }, uTer: { value: tex }, uCol: { value: ctex }, uCenter: { value: new THREE.Vector2() },
      uR: { value: R * 2 }, uSize: { value: SIZE }, uTime: { value: 0 }, uWind: { value: new THREE.Vector2(1, 0.3) },
      uLight: { value: new THREE.Color(1, 1, 1) }, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u, side: THREE.DoubleSide, transparent: false, alphaToCoverage: false,
      vertexShader: `
        attribute vec4 iOff;
        uniform sampler2D uTer; uniform sampler2D uCol; uniform vec2 uCenter; uniform float uR; uniform float uSize; uniform float uTime; uniform vec2 uWind;
        varying vec2 vUv; varying vec3 vCol; varying float vFog; varying float vFade;
        uniform float fogDensity;
        void main(){
          // Raster mit dem Spieler mitwandern lassen (jedes Büschel springt um uR, wenn es zu weit hinten liegt)
          vec2 rel = iOff.xy - mod(uCenter + uR * 0.5, uR);
          vec2 w = uCenter + mod(rel + uR * 0.5, uR) - uR * 0.5;
          vec2 tuv = (w + uSize * 0.5) / uSize;
          vec4 t = texture2D(uTer, tuv);
          float dens = t.g;
          float dist = length(w - uCenter);
          vFade = clamp((uR * 0.5 - dist) / (uR * 0.18), 0.0, 1.0);
          float s = iOff.w * step(fract(iOff.z * 7.31), dens) * vFade;
          vec3 p = position * s;
          float c = cos(iOff.z), sn = sin(iOff.z);
          p.xz = vec2(p.x * c - p.z * sn, p.x * sn + p.z * c);
          float sway = sin(uTime * 1.7 + w.x * 0.35 + w.y * 0.27) * 0.5 + sin(uTime * 3.1 + w.x * 0.9) * 0.2;
          p.xz += uWind * sway * 0.08 * uv.y * uv.y;
          vec3 wp = vec3(w.x, t.r - 0.03, w.y) + p;
          vUv = uv;
          vCol = texture2D(uCol, tuv).rgb;
          vec4 mv = modelViewMatrix * vec4(wp, 1.0);
          vFog = 1.0 - exp(-fogDensity * fogDensity * mv.z * mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D uMap; uniform vec3 uLight; uniform vec3 fogColor;
        varying vec2 vUv; varying vec3 vCol; varying float vFog; varying float vFade;
        void main(){
          vec4 t = texture2D(uMap, vUv);
          if (t.a < 0.45) discard;
          vec3 c = mix(vCol * 1.05, t.rgb * vec3(0.78, 0.86, 0.7), 0.5) * mix(0.5, 1.0, vUv.y) * uLight;
          gl_FragColor = vec4(mix(c, fogColor, vFog), 1.0);
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    game.scene.add(this.mesh);
  }

  update(dt, cam) {
    if (!this.mesh) return;
    const g = this.g;
    this.u.uTime.value += dt;
    this.u.uCenter.value.set(cam.position.x, cam.position.z);
    const w = g.effects.wind;
    this.u.uWind.value.set(w.x, w.z).multiplyScalar(0.25 + w.length() * 0.06);
    if (g.scene.fog) { this.u.fogColor.value.copy(g.scene.fog.color); this.u.fogDensity.value = g.scene.fog.density; }
    // Helligkeit grob an Sonne + Himmelslicht koppeln
    const k = Math.min(1.05, g.hemi.intensity * 0.38 + g.sun.intensity * 0.22);
    const a = g.atmo; const kk = k * (a ? (a.night ? 0.32 : 0.45 + 0.55 * a.dusk) : 1);
    if (a && a.night) this.u.uLight.value.setRGB(kk * 0.8, kk * 0.9, kk * 1.15); else this.u.uLight.value.setRGB(kk, kk, kk * 0.95);
  }

  dispose() { if (this.mesh) { this.g.scene.remove(this.mesh); this.mesh.geometry.dispose(); } }
}
