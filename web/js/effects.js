// Effekte: instanzierte Billboard-Partikel (Rauch, Staub, Feuer, Funken, Wasser), Leuchtspur, Mündungsfeuer, Licht-Pool
import * as THREE from './lib/three.module.min.js';
import { tex } from './gfx.js';
import { rand } from './util.js';

class Particles {
  constructor(scene, max, additive, texture) {
    this.max = max;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.pos = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);   // xyz + Größe
    this.col = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);   // rgb + alpha
    this.rot = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    this.pos.setUsage(THREE.DynamicDrawUsage); this.col.setUsage(THREE.DynamicDrawUsage); this.rot.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iPos', this.pos); g.setAttribute('iCol', this.col); g.setAttribute('iRot', this.rot);
    g.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: { map: { value: texture }, fogColor: { value: new THREE.Color() }, fogDensity: { value: 0 }, light: { value: 1 } },
      vertexShader: `
        attribute vec4 iPos; attribute vec4 iCol; attribute float iRot;
        varying vec2 vUv; varying vec4 vCol; varying float vFog;
        uniform float fogDensity;
        void main(){
          vUv = uv; vCol = iCol;
          vec4 mv = modelViewMatrix * vec4(iPos.xyz, 1.0);
          float c = cos(iRot), s = sin(iRot);
          vec2 q = vec2(position.x * c - position.y * s, position.x * s + position.y * c) * iPos.w;
          mv.xy += q;
          float d = -mv.z;
          vFog = 1.0 - exp(-fogDensity * fogDensity * d * d);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map; uniform vec3 fogColor; uniform float light;
        varying vec2 vUv; varying vec4 vCol; varying float vFog;
        void main(){
          vec4 t = texture2D(map, vUv);
          vec4 c = vec4(vCol.rgb * ${additive ? '1.0' : 'light'}, t.a * vCol.a);
          ${additive ? 'c.rgb *= t.rgb; c.rgb *= (1.0 - vFog);' : 'c.rgb = mix(c.rgb, fogColor, vFog);'}
          if (c.a < 0.01) discard;
          gl_FragColor = c;
        }`,
      transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mat = mat;
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = additive ? 3 : 2;
    scene.add(this.mesh);
    this.g = g;
    this.list = [];
  }
  spawn(p) { if (this.list.length < this.max) this.list.push(p); else this.list[(Math.random() * this.max) | 0] = p; }
  update(dt, wind) {
    const L = this.list;
    let n = 0;
    for (let i = 0; i < L.length; i++) {
      const p = L[i];
      p.age += dt;
      if (p.age >= p.life) continue;
      const k = p.age / p.life;
      p.vy -= (p.grav || 0) * dt;
      const dr = p.drag ?? 0.6;
      p.vx *= 1 - dr * dt; p.vy *= 1 - dr * dt * (p.grav ? 0.2 : 1); p.vz *= 1 - dr * dt;
      p.x += (p.vx + (p.wind ? wind.x * p.wind : 0)) * dt; p.y += (p.vy + (p.rise || 0)) * dt; p.z += (p.vz + (p.wind ? wind.z * p.wind : 0)) * dt;
      if (p.floor !== undefined && p.y < p.floor) { p.y = p.floor; p.vy *= -0.2; p.vx *= 0.5; p.vz *= 0.5; }
      const s = p.s0 + (p.s1 - p.s0) * k;
      const a = p.a * (k < 0.08 ? k / 0.08 : 1 - Math.pow((k - 0.08) / 0.92, p.fade || 1.4));
      const c = p.c;
      const ci = p.c1 ? 1 - k : 1;
      this.pos.array.set([p.x, p.y, p.z, s], n * 4);
      if (p.c1) this.col.array.set([c[0] * ci + p.c1[0] * k, c[1] * ci + p.c1[1] * k, c[2] * ci + p.c1[2] * k, a], n * 4);
      else this.col.array.set([c[0], c[1], c[2], a], n * 4);
      this.rot.array[n] = p.r + p.age * (p.vr || 0);
      L[n++] = p;
    }
    L.length = n;
    this.g.instanceCount = n;
    this.pos.needsUpdate = this.col.needsUpdate = this.rot.needsUpdate = true;
    this.pos.addUpdateRange(0, n * 4); this.col.addUpdateRange(0, n * 4); this.rot.addUpdateRange(0, n);
  }
}

// Leuchtspur: gestreckte Quads in Flugrichtung
class Tracers {
  constructor(scene, max) {
    this.max = max;
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, 0, 0, 1, 0, 0, 1, 1, 0, -1, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    this.a = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
    this.b = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4);
    this.a.setUsage(THREE.DynamicDrawUsage); this.b.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iA', this.a); g.setAttribute('iB', this.b);
    g.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      vertexShader: `
        attribute vec4 iA; attribute vec4 iB; varying float vT; varying float vC;
        void main(){
          vec4 a = modelViewMatrix * vec4(iA.xyz, 1.0), b = modelViewMatrix * vec4(iB.xyz, 1.0);
          vec4 p = mix(a, b, position.y);
          vec2 dir = normalize((b.xy / max(-b.z,0.1)) - (a.xy / max(-a.z,0.1)) + vec2(1e-5));
          vec2 nrm = vec2(-dir.y, dir.x);
          p.xy += nrm * position.x * iA.w * max(1.0, -p.z * 0.0025);
          vT = position.y; vC = iB.w;
          gl_Position = projectionMatrix * p;
        }`,
      fragmentShader: `
        varying float vT; varying float vC;
        void main(){
          vec3 c = vC > 0.5 ? vec3(0.6, 1.0, 0.45) : vec3(1.0, 0.55, 0.2);
          gl_FragColor = vec4(c * 2.2, vT * 0.95);
        }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4;
    scene.add(this.mesh);
    this.g = g;
    this.list = [];
  }
  add(t) { if (this.list.length < this.max) this.list.push(t); }
  update(list) {
    let n = 0;
    for (const t of list) {
      if (n >= this.max) break;
      this.a.array.set([t.x - t.vx * t.len, t.y - t.vy * t.len, t.z - t.vz * t.len, t.w || 0.035], n * 4);
      this.b.array.set([t.x, t.y, t.z, t.green ? 1 : 0], n * 4);
      n++;
    }
    this.g.instanceCount = n;
    this.a.needsUpdate = this.b.needsUpdate = true;
  }
}

export class Effects {
  constructor(game) {
    this.g = game;
    const scene = game.scene;
    this.q = game.q;
    this.smoke = new Particles(scene, Math.round(1600 * this.q.particles), false, tex('smoke'));
    this.fire = new Particles(scene, Math.round(900 * this.q.particles), true, tex('flash'));
    this.glow = new Particles(scene, 300, true, tex('smoke'));
    this.tracers = new Tracers(scene, 260);
    this.wind = new THREE.Vector3(1, 0, 0.3);
    // Licht-Pool für Mündungsfeuer/Explosionen
    this.lights = [];
    if (this.q.lights) {
      for (let i = 0; i < 6; i++) {
        const l = new THREE.PointLight(0xffaa55, 0, 18, 2);
        l.castShadow = false;
        scene.add(l);
        this.lights.push({ l, t: 0, dur: 0.06, max: 0 });
      }
    }
    this.flares = [];
  }

  flashLight(x, y, z, intensity = 6, dur = 0.06, range = 18, color = 0xffaa55) {
    if (!this.lights.length) return;
    let best = this.lights[0];
    for (const L of this.lights) if (L.t <= 0) { best = L; break; } else if (L.t < best.t) best = L;
    best.l.position.set(x, y, z); best.l.distance = range; best.l.color.setHex(color);
    best.t = dur; best.dur = dur; best.max = intensity;
  }

  // ------------------------------------------------------------ Bausteine
  puff(x, y, z, o = {}) {
    this.smoke.spawn({
      x, y, z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, age: 0, life: o.life || 3, s0: o.s0 || 1, s1: o.s1 || 4,
      a: o.a ?? 0.5, c: o.c || [0.6, 0.6, 0.58], c1: o.c1, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, rise: o.rise ?? 0.5,
      wind: o.wind ?? 0.6, drag: o.drag ?? 0.8, grav: o.grav || 0, floor: o.floor, fade: o.fade,
    });
  }
  spark(x, y, z, o = {}) {
    this.fire.spawn({
      x, y, z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, age: 0, life: o.life || 0.12, s0: o.s0 || 0.4, s1: o.s1 || 0.1,
      a: o.a ?? 1, c: o.c || [1, 0.85, 0.6], r: Math.random() * 6, rise: 0, wind: 0, drag: o.drag ?? 0.5, grav: o.grav || 0, floor: o.floor, fade: 1,
    });
  }

  muzzle(pos, dir, big = false, light = true) {
    const s = big ? 0.9 : 0.5;
    this.fire.spawn({ x: pos.x + dir.x * 0.1, y: pos.y + dir.y * 0.1, z: pos.z + dir.z * 0.1, vx: 0, vy: 0, vz: 0, age: 0, life: 0.05, s0: s, s1: s * 0.6, a: 1, c: [1, 0.85, 0.6], r: Math.random() * 6, fade: 1 });
    this.fire.spawn({ x: pos.x + dir.x * 0.35 * s, y: pos.y + dir.y * 0.35 * s, z: pos.z + dir.z * 0.35 * s, vx: dir.x * 4, vy: dir.y * 4, vz: dir.z * 4, age: 0, life: 0.04, s0: s * 0.7, s1: s * 0.3, a: 0.9, c: [1, 0.7, 0.35], r: Math.random() * 6, fade: 1 });
    this.puff(pos.x + dir.x * 0.4, pos.y + dir.y * 0.4, pos.z + dir.z * 0.4, { vx: dir.x * 2, vy: dir.y * 2 + 0.3, vz: dir.z * 2, life: 0.9, s0: 0.2, s1: big ? 1.6 : 0.9, a: 0.18, c: [0.75, 0.74, 0.7] });
    if (light) this.flashLight(pos.x, pos.y, pos.z, big ? 5 : 3, 0.05, big ? 16 : 10);
  }

  // Einschlag: Material bestimmt Staub/Funken
  impact(x, y, z, kind = 'dirt', nx = 0, ny = 1, nz = 0) {
    const n = Math.max(1, Math.round(3 * this.q.particles));
    if (kind === 'water') {
      for (let i = 0; i < n + 2; i++) this.puff(x, y, z, { vx: (Math.random() - 0.5) * 1.2, vy: 4 + Math.random() * 3, vz: (Math.random() - 0.5) * 1.2, life: 0.9, s0: 0.25, s1: 0.8, a: 0.55, c: [0.85, 0.9, 0.92], rise: 0, grav: 9, drag: 0.3, wind: 0 });
      return;
    }
    if (kind === 'blood') {
      for (let i = 0; i < n; i++) this.puff(x, y, z, { vx: nx * 1.5 + (Math.random() - 0.5), vy: ny + Math.random(), vz: nz * 1.5 + (Math.random() - 0.5), life: 0.45, s0: 0.15, s1: 0.5, a: 0.75, c: [0.35, 0.03, 0.02], rise: 0, grav: 3, wind: 0 });
      return;
    }
    if (kind === 'metal' || kind === 'stone') {
      for (let i = 0; i < n; i++) this.spark(x, y, z, { vx: nx * 4 + (Math.random() - 0.5) * 5, vy: ny * 4 + Math.random() * 3, vz: nz * 4 + (Math.random() - 0.5) * 5, life: 0.25, s0: 0.12, s1: 0.04, grav: 9 });
    }
    const c = kind === 'stone' ? [0.72, 0.7, 0.66] : kind === 'sand' ? [0.75, 0.68, 0.52] : kind === 'wood' ? [0.5, 0.42, 0.3] : [0.42, 0.36, 0.27];
    for (let i = 0; i < n; i++) this.puff(x, y, z, { vx: nx * 2 + (Math.random() - 0.5) * 1.5, vy: ny * 2 + Math.random() * 1.5, vz: nz * 2 + (Math.random() - 0.5) * 1.5, life: 1.0 + Math.random() * 0.6, s0: 0.2, s1: 1.1, a: 0.55, c, rise: 0.2, grav: 1.5, wind: 0.4 });
  }

  // Explosion: Größe 1 = Handgranate, 2 = Mörser/Panzerfaust, 4 = Artillerie, 6 = Schiffsartillerie
  explosion(x, y, z, size = 1, water = false) {
    const P = this.q.particles;
    if (water) {
      for (let i = 0; i < 10 * size * P; i++) this.puff(x + (Math.random() - 0.5) * size, y, z + (Math.random() - 0.5) * size, { vx: (Math.random() - 0.5) * 3 * size, vy: 6 + Math.random() * 7 * Math.sqrt(size), vz: (Math.random() - 0.5) * 3 * size, life: 2.2, s0: 0.6 * size, s1: 2.5 * size, a: 0.75, c: [0.9, 0.93, 0.95], rise: 0, grav: 9, drag: 0.25, wind: 0.2 });
      this.flashLight(x, y + 2, z, 4 * size, 0.12, 20 * size);
      return;
    }
    this.flashLight(x, y + 1.5, z, 10 * size, 0.18, 14 + 10 * size, 0xffaa60);
    for (let i = 0; i < 6 + 4 * size; i++) this.fire.spawn({ x: x + (Math.random() - 0.5) * size, y: y + 0.5 + Math.random() * size, z: z + (Math.random() - 0.5) * size, vx: (Math.random() - 0.5) * 5 * size, vy: Math.random() * 6 * size, vz: (Math.random() - 0.5) * 5 * size, age: 0, life: 0.25 + Math.random() * 0.25, s0: 1.4 * size, s1: 2.6 * size, a: 1, c: [1, 0.75, 0.4], r: Math.random() * 6, drag: 3, fade: 1.2 });
    // Erdfontäne
    const dirt = [0.3, 0.26, 0.2];
    for (let i = 0; i < (10 + 6 * size) * P; i++) this.puff(x, y, z, { vx: (Math.random() - 0.5) * 6 * size, vy: 4 + Math.random() * 9 * Math.sqrt(size), vz: (Math.random() - 0.5) * 6 * size, life: 1.6 + Math.random(), s0: 0.4 * size, s1: 1.4 * size, a: 0.9, c: dirt, rise: 0, grav: 9, drag: 0.4, wind: 0.2, floor: y });
    // Rauchsäule
    for (let i = 0; i < (8 + 5 * size) * P; i++) this.puff(x + (Math.random() - 0.5) * size * 2, y + Math.random() * size, z + (Math.random() - 0.5) * size * 2, { vx: (Math.random() - 0.5) * 2 * size, vy: Math.random() * 3 * size, vz: (Math.random() - 0.5) * 2 * size, life: 5 + Math.random() * 5, s0: 1.5 * size, s1: 6 * size, a: 0.6, c: [0.32, 0.3, 0.28], c1: [0.55, 0.54, 0.52], rise: 0.8, wind: 1, drag: 1.2 });
    // Splitter (Funken)
    for (let i = 0; i < 6 * size * P; i++) this.spark(x, y + 0.5, z, { vx: (Math.random() - 0.5) * 30, vy: Math.random() * 18, vz: (Math.random() - 0.5) * 30, life: 0.4, s0: 0.15, s1: 0.05, grav: 9 });
  }

  // Brennendes Wrack (Panzer, Haus) – laufender Emitter
  burn(x, y, z, life = 60, size = 1) { (this.fires || (this.fires = [])).push({ x, y, z, life, size, t: 0 }); }

  // Leuchtkugel (Fallschirm-Leuchtgeschoss): hängt am Himmel, sinkt langsam, beleuchtet die Szene
  flare(x, y, z, color = 0xfff2d0) {
    let light = null;
    if (this.q.lights || true) { light = new THREE.PointLight(color, 0, 260, 1.4); this.g.scene.add(light); }
    this.flares.push({ x, y, z, t: 0, life: 28, light });
  }

  smokeGrenade(x, y, z, color) { (this.fires || (this.fires = [])).push({ x, y, z, life: 30, size: 1.2, t: 0, smoke: color || [0.82, 0.82, 0.8] }); }

  update(dt, camera, fogColor, fogDensity, light) {
    for (const p of [this.smoke, this.fire, this.glow]) { p.mat.uniforms.fogColor.value.copy(fogColor); p.mat.uniforms.fogDensity.value = fogDensity; }
    this.smoke.mat.uniforms.light.value = light;
    for (const L of this.lights) { if (L.t > 0) { L.t -= dt; L.l.intensity = Math.max(0, L.t / L.dur) * L.max; } else L.l.intensity = 0; }
    if (this.fires) for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      f.t += dt; f.life -= dt;
      if (f.life <= 0) { this.fires.splice(i, 1); continue; }
      f.acc = (f.acc || 0) + dt * (f.smoke ? 14 : 10) * this.q.particles;
      while (f.acc > 1) {
        f.acc--;
        if (f.smoke) this.puff(f.x, f.y + 0.3, f.z, { vx: (Math.random() - 0.5), vy: 1 + Math.random(), vz: (Math.random() - 0.5), life: 9, s0: 1, s1: 7, a: 0.55, c: f.smoke, rise: 0.4, wind: 1.2 });
        else {
          this.fire.spawn({ x: f.x + (Math.random() - 0.5) * f.size, y: f.y + Math.random() * 0.5, z: f.z + (Math.random() - 0.5) * f.size, vx: 0, vy: 2 + Math.random() * 2, vz: 0, age: 0, life: 0.5 + Math.random() * 0.4, s0: 1.2 * f.size, s1: 0.4, a: 0.9, c: [1, 0.6, 0.25], r: Math.random() * 6, drag: 0.5, fade: 1 });
          this.puff(f.x, f.y + 1, f.z, { vx: 0, vy: 2, vz: 0, life: 7, s0: 1 * f.size, s1: 6 * f.size, a: 0.5, c: [0.12, 0.11, 0.1], c1: [0.3, 0.3, 0.3], rise: 1, wind: 1.3 });
        }
      }
      if (!f.smoke && Math.random() < dt * 6) this.flashLight(f.x, f.y + 1.5, f.z, 2.5 * f.size, 0.25, 14, 0xff7a30);
    }
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const f = this.flares[i];
      f.t += dt;
      f.y -= dt * 3.2;
      f.x += this.wind.x * dt * 0.8; f.z += this.wind.z * dt * 0.8;
      const k = f.t < 1 ? f.t : f.t > f.life - 4 ? (f.life - f.t) / 4 : 1;
      if (f.light) { f.light.position.set(f.x, f.y, f.z); f.light.intensity = Math.max(0, k) * (90 + Math.sin(f.t * 23) * 15); }
      this.glow.spawn({ x: f.x, y: f.y, z: f.z, vx: 0, vy: 0, vz: 0, age: 0, life: 0.05, s0: 6, s1: 6, a: Math.max(0, k), c: [1, 0.95, 0.8], r: 0, fade: 1 });
      if (Math.random() < dt * 12) this.puff(f.x, f.y + 0.4, f.z, { life: 4, s0: 0.4, s1: 2, a: 0.25, c: [0.8, 0.8, 0.78], rise: 0.6 });
      if (f.t > f.life) { if (f.light) this.g.scene.remove(f.light); this.flares.splice(i, 1); }
    }
    this.smoke.update(dt, this.wind);
    this.fire.update(dt, this.wind);
    this.glow.update(dt, this.wind);
  }
}

export { Particles };
export const jitter = (v, a) => v + (rand() - 0.5) * a;
