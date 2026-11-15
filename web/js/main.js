// Normandy 1944 – Hauptprogramm: Spielschleife, Menüs, Kampagne, freies Gefecht, Mehrspieler
import * as THREE from './lib/three.module.min.js';
import { qualityConfig, makeSky } from './gfx.js';
import { World } from './world.js';
import { MAPS, MAP_NAMES } from './maps.js';
import { Effects } from './effects.js';
import { Grass } from './grass.js';
import { AudioSys } from './audio.js';
import { Combat } from './combat.js';
import { Units } from './units.js';
import { Player } from './player.js';
import { Atmosphere, WEATHER } from './atmosphere.js';
import { Missions, OTHER } from './missions.js';
import { Hud } from './hud.js';
import { Input, BIND_DEFS, keyName, resolveBinds } from './input.js';
import { Net, netTransport, isGameCode } from './net.js';
import { Comms } from './comms.js';
import { Voice } from './voice.js';
import { OPERATIONS, CAMPAIGN, EPILOGUE, opById, SIDES } from './story.js';
import { WEAPONS, CLASSES, PLAYER_CLASSES } from './weapons.js';
import { SoldierRig, buildPlane, buildChute } from './models.js';
import { uniformFor } from './units.js';
import { T, L, setLang, getLang } from './i18n.js';
import { loadSettings, saveSettings, loadStats, saveStats, loadCampaign, saveCampaign, rankFor, isMobile, isApp, fetchVersion, appVersion, appCheckUpdate, enterFullscreen, QUALITY } from './platform.js';
import { clamp, rand, esc, fmtTime, wrapAngle } from './util.js';

const $ = (id) => document.getElementById(id);
const _v = new THREE.Vector3(), _w = new THREE.Vector3();

// Bombentrichter als Abziehbilder auf dem Gelände
class Decals {
  constructor(g) {
    this.g = g;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 4, 32, 32, 32);
    gr.addColorStop(0, 'rgba(25,20,15,0.95)'); gr.addColorStop(0.55, 'rgba(45,36,26,0.8)'); gr.addColorStop(0.8, 'rgba(70,58,40,0.35)'); gr.addColorStop(1, 'rgba(70,58,40,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), 140);
    this.mesh.count = 0; this.n = 0;
    this.mesh.frustumCulled = false;
    g.scene.add(this.mesh);
  }
  crater(x, z, r) {
    const W = this.g.world, y = W.h(x, z);
    const n = W.normal(x, z, _v);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6));
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y + 0.06, z), q, new THREE.Vector3(r * 2.4, 1, r * 2.4));
    this.mesh.setMatrixAt(this.n % 140, m);
    this.n++;
    this.mesh.count = Math.min(140, this.n);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  // Einschussloch in Mauerwerk/Beton: kleines Abziehbild auf der getroffenen Wandseite
  hole(p, box) {
    if (!box || !(box.kind === 'house' || box.kind === 'wall' || box.kind === 'bunker') || p.y > box.y1 - 0.05) return;
    if (!this.holes) {
      const c = document.createElement('canvas'); c.width = c.height = 32;
      const x = c.getContext('2d');
      const g1 = x.createRadialGradient(16, 16, 1, 16, 16, 15);
      g1.addColorStop(0, 'rgba(10,8,6,1)'); g1.addColorStop(0.3, 'rgba(40,34,28,0.95)'); g1.addColorStop(0.55, 'rgba(200,190,170,0.6)'); g1.addColorStop(1, 'rgba(200,190,170,0)');
      x.fillStyle = g1; x.fillRect(0, 0, 32, 32);
      this.holes = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), 300);
      this.holes.count = 0; this.holes.frustumCulled = false; this.hn = 0;
      this.g.scene.add(this.holes);
    }
    const dx = p.x - box.x, dz = p.z - box.z;
    const lx = dx * box.c - dz * box.s, lz = dx * box.s + dz * box.c;
    let nx = 0, nz = 0;
    if (box.hw - Math.abs(lx) < box.hd - Math.abs(lz)) nx = Math.sign(lx) || 1; else nz = Math.sign(lz) || 1;
    const wx = nx * box.c + nz * box.s, wz = -nx * box.s + nz * box.c;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(wx, 0, wz));
    q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.random() * 6));
    const s = 0.1 + Math.random() * 0.08;
    this.holes.setMatrixAt(this.hn % 300, new THREE.Matrix4().compose(new THREE.Vector3(p.x + wx * 0.03, p.y, p.z + wz * 0.03), q, new THREE.Vector3(s, s, s)));
    this.hn++; this.holes.count = Math.min(300, this.hn); this.holes.instanceMatrix.needsUpdate = true;
  }
  dispose() { this.g.scene.remove(this.mesh); if (this.holes) this.g.scene.remove(this.holes); }
}

class Game {
  constructor() {
    this.settings = loadSettings();
    if (this.settings.lang) setLang(this.settings.lang); else setLang(getLang());
    this.stats = loadStats();
    this.camp = loadCampaign();
    this.canvas = $('game');
    this.state = 'menu';
    this.time = 0;
    this.avatars = new Map();
    this.audio = new AudioSys();
    this.audio.setVolume(this.settings.volume);
    this.input = new Input(this.canvas, this.settings);
    this.voice = new Voice(this);
    this.initRenderer();
    this.hud = new Hud(this);
    this.comms = new Comms(this);
    this.player = new Player(this);
    this.shakeK = 0;
    this.thirdPerson = false;
    this.session = { score: 0 };
    this.statsStart = { ...this.stats };
    this.input.onKey = (c) => this.onKey(c);
    this.input.onLock = (locked) => { if (!locked && this.state === 'playing' && this.input.device === 'keyboard' && !this.comms.chatOpen && !this.radioOpen && !this.mapOpen) this.pause(true); };
    window.game = this;
    window.addEventListener('resize', () => this.resize());
    this.resize();
    this.buildMenus();
    this.showMenu('menu');
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
    // Im Hintergrund (Tab verdeckt) läuft ein Mehrspieler-Gefecht weiter
    setInterval(() => {
      if (!document.hidden || !this.net) return;
      const now = performance.now();
      const dt = Math.min(0.25, (now - this.last) / 1000);
      this.last = now;
      if (this.state === 'playing' || this.state === 'paused') this.update(dt); else this.net.update(dt);
    }, 100);
    // Einladungslink ?join=CODE
    const m = /[?&]join=([A-Za-z0-9]{4,6})/.exec(location.search);
    if (m) { $('mp-code').value = m[1].toUpperCase(); this.showMenu('mp'); }
    this.checkVersion();
  }

  // ------------------------------------------------------------ Grafik
  initRenderer() {
    this.q = qualityConfig(this.settings);
    if (this.renderer) { this.renderer.dispose(); }
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: this.q.antialias, powerPreference: 'high-performance', stencil: false });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1;
    r.shadowMap.enabled = this.q.shadows > 0;
    r.shadowMap.type = this.q.shadows > 1 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    r.autoClear = false;
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.08, 3200);
    this.scene.add(this.camera);
    this.audio.setListener(this.camera);
    this.sky = makeSky();
    this.scene.add(this.sky);
    this.hemi = new THREE.HemisphereLight(0xcfd8e0, 0x4a4436, 0.9);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 2.2);
    this.sun.castShadow = this.q.shadows > 0;
    if (this.sun.castShadow) {
      this.sun.shadow.mapSize.set(this.q.shadowMap, this.q.shadowMap);
      const R = this.q.shadows > 1 ? 70 : 50;
      const c = this.sun.shadow.camera; c.left = -R; c.right = R; c.top = R; c.bottom = -R; c.near = 1; c.far = 500;
      this.sun.shadow.bias = -0.0005; this.sun.shadow.normalBias = 0.05;
      this.shadowR = R;
    }
    this.scene.add(this.sun, this.sun.target);
    this.resize();
  }

  resize() {
    if (!this.renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setPixelRatio(this.q.pixel);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // ------------------------------------------------------------ Mission starten
  // mode: 'campaign' | 'free' | 'coop' | 'versus'
  async startMission(opId, side, mode, opts = {}, cls = 'rifle') {
    this.showMenu('loading');
    $('load-text').textContent = T('Lade Karte …', 'Loading map …');
    await new Promise((r) => setTimeout(r, 30));
    this.cleanup();
    this.smokes = [];
    this.q = qualityConfig(this.settings);
    if (this.renderer.shadowMap.enabled !== this.q.shadows > 0 || (this.sun.castShadow && this.sun.shadow.mapSize.x !== this.q.shadowMap)) this.initRenderer();
    this.resize();
    this.op = opById(opId);
    this.mode = mode;
    this.opts = opts;
    this.time = 0;
    this.session = { score: 0, kills: 0, deaths: 0, obj: 0 };
    this.statsStart = { ...this.stats };
    this.camera.far = Math.max(800, this.q.view * 2.5);
    this.camera.updateProjectionMatrix();
    this.world = new World(this.scene, this.op.map, this.q);
    $('load-text').textContent = T('Truppen werden aufgestellt …', 'Deploying troops …');
    await new Promise((r) => setTimeout(r, 10));
    this.effects = new Effects(this);
    try { this.grass = new Grass(this, this.world); } catch (e) { console.warn('Gras', e); this.grass = null; }
    this.combat = new Combat(this);
    this.units = new Units(this);
    this.decals = new Decals(this);
    this.missions = new Missions(this);
    // Angriffsrichtung (Blickrichtung beim Aufstellen)
    const usA = this.world.anchors[this.op.us.spawn] || this.world.anchors.boat || this.world.anchors.start || Object.values(this.world.anchors)[0];
    const deA = this.world.anchors[this.op.de.spawn] || Object.values(this.world.anchors)[1];
    this.attackDir = { team: 'us', yaw: Math.atan2(-(deA.x - usA.x), -(deA.z - usA.z)) };
    // Tageszeit / Wetter
    const hour = opts.hour ?? this.op.tod;
    const weather = opts.weather && opts.weather !== 'hist' ? opts.weather : this.op.weather;
    this.atmo = new Atmosphere(this, hour, weather, this.op.ambient);
    this.player.reset(cls, side);
    this.player.alive = true;
    this.thirdPerson = false;
    this.makePlayerRig();
    const host = !this.net || this.net.isHost;
    if (host) this.missions.start(this.op, mode, opts);
    else { this.missions.op = this.op; this.missions.mode = mode; this.missions.t = 0; this.missions.events = this.op.events.slice(); this.missions.evI = 0; this.missions.state = { us: { i: 0, timer: 0, lose: 0, found: 0, kills: 0, prog: 0 }, de: { i: 0, timer: 0, lose: 0, found: 0, kills: 0, prog: 0 } }; this.missions.focus = new THREE.Vector3(); }
    this.spawnPlayer(true);
    this.radioCd = { arty: 30, air: 60, smoke: 10, nw: 40 };
    this.radioOpen = false;
    this.holdE = 0;
    this.deadT = 0;
    this.lives = mode === 'campaign' ? 99 : 99;
    this.hud.show(true);
    this.showMenu(null);
    this.state = 'playing';
    this.audio.init();
    this.audio.setVolume(this.settings.volume);
    this.atmo.setup();
    // Shader vorab übersetzen (Explosionen, Partikel, Waffe), damit es im Gefecht nicht ruckelt
    try {
      this.effects.explosion(0, -200, 0, 1);
      // Modelle, die erst später auftauchen (Flugzeuge, Fallschirm), einmal unsichtbar vorzeichnen
      const warm = new THREE.Group();
      for (const m of [buildPlane('c47'), buildPlane('p47'), buildChute(), buildChute(true)]) { m.scale.setScalar(0.001); warm.add(m); }
      this.camera.add(warm); warm.position.set(0, 0, -5);
      this.player.updateView(0.016);
      this.renderer.render(this.scene, this.camera);
      this.camera.remove(warm);
      this.renderer.compile(this.scene, this.camera); this.renderer.compile(this.player.vm.scene, this.player.vm.cam);
    } catch (e) { console.warn(e); }
    if (this.input.device === 'keyboard' && !isMobile) { this.input.wantLock = true; this.input.lock(); }
    document.body.classList.add('ingame');
    this.netReady = !!this.net;
    // Einleitung als Funkspruch
    this.radio(`${L(this.op.place)}, ${L(this.op.date)}, ${this.op.time} ${T('Uhr', '')}`.trim(), L(this.op[side].unit));
    const o = this.op[side].objectives[0];
    if (o) this.radio(T('Ziel: ', 'Objective: ') + L(o.text), T('Gefechtsstand', 'Command post'));
  }

  spawnPlayer(first) {
    const p = this.player, side = p.team;
    const sp = this.missions.op ? this.missions.playerSpawn(side, first) : { p: Object.values(this.world.anchors)[0].clone() };
    const toEnemy = this.attackDir.yaw + (side === 'us' ? 0 : Math.PI);
    if (sp.jump) {
      p.startJump(sp.p, toEnemy);
      this.hud.toast(T('Fallschirm offen – mit WASD steuern', 'Chute open – steer with WASD'));
    } else if (sp.boat && (!this.net || this.net.isHost)) {
      this.missions.landingWave(side, { anchor: 'boat', n: 10, target: 'shingle', roles: ['rifle', 'rifle', 'smg', 'mg', 'rifle', 'at', 'rifle', 'officer', 'rifle', 'smg'] }, this.aiScale(), true);
      p.yaw = Math.PI * 0 + 0; p.pitch = 0;
      p.yaw = 0;
    } else if (sp.boat) {
      p.spawnAt(new THREE.Vector3((rand() - 0.5) * 120, 0, -250), 0);
    } else p.spawnAt(sp.p, toEnemy);
    if (sp.boat) p.yaw = 0;   // Bug zum Strand (Norden = Wasser; Strand liegt südlich)
    if (sp.boat) p.yaw = Math.PI;
  }

  cleanup() {
    if (this.units) this.units.clear();
    if (this.combat) this.combat.clear();
    if (this.missions) this.missions.clear();
    if (this.atmo) this.atmo.dispose();
    if (this.decals) this.decals.dispose();
    if (this.grass) { this.grass.dispose(); this.grass = null; }
    if (this.effects) { for (const p of [this.effects.smoke, this.effects.fire, this.effects.glow]) this.scene.remove(p.mesh); this.scene.remove(this.effects.tracers.mesh); for (const l of this.effects.lights) this.scene.remove(l.l); for (const l of this.effects.flareLights) this.scene.remove(l); }
    if (this.world) this.world.dispose();
    if (this.playerRig) { this.playerRig.dispose(); this.playerRig = null; }
    for (const a of this.avatars.values()) a.dispose();
    this.avatars.clear();
    if (this.player.chute) { this.scene.remove(this.player.chute); this.player.chute = null; }
    this.player.inBoat = null;
    this.world = null;
  }

  makePlayerRig() {
    if (this.playerRig) this.playerRig.dispose();
    this.playerRig = new SoldierRig(uniformFor(this.op.id, this.player.team), this.player.wid, { shadow: true });
    this.scene.add(this.playerRig.root);
  }

  // ------------------------------------------------------------ Schwierigkeit
  aiSkill() { return [0.62, 1, 1.35][this.settings.difficulty ?? 1]; }
  difficultyDmg() { return [0.55, 1, 1.45][this.settings.difficulty ?? 1]; }
  aiScale() { return this.q.ai * [0.8, 1, 1.12][this.settings.difficulty ?? 1] * (this.opts && this.opts.density ? this.opts.density : 1); }
  playerName() { return this.settings.name || T('Soldat', 'Soldier'); }

  // ------------------------------------------------------------ Ereignisse
  radio(text, from, urgent = false) {
    this.hud.radio(text, from, urgent);
    this.audio.radio();
    this.voice.say(String(text).replace(/\*/g, ''), String(from || '').replace(/\*/g, ''), urgent);
  }
  feed(k, v, head) { this.hud.feed(k, v, head); }
  shake(k) { this.shakeK = Math.min(1.2, this.shakeK + k); }
  score(n, why) { this.session.score += n; this.stats.score += n; if (why) this.hud.toast(`+${n}  ${why}`); }

  onUnitKilled(u, owner, head) {
    const mine = owner && owner.local;
    const killerTeam = owner && owner.team;
    if (killerTeam && this.missions.state[killerTeam] && killerTeam !== u.team) this.missions.state[killerTeam].kills++;
    if (mine) {
      this.stats.kills++; this.session.kills++;
      this.hud.hit(head, true);
      this.score(head ? 15 : 10);
      this.feed(this.playerName(), u.name, head);
    } else if (owner && owner.pid !== undefined && this.net) {
      const pl = this.net.players.get(owner.pid);
      if (pl) { pl.k++; pl.score += 10; this.feed(pl.name, u.name, head); }
    }
  }
  onTankKilled(t, owner) {
    if (owner && owner.local) this.score(150, T('Panzer vernichtet!', 'Tank destroyed!'));
    if (t.team === this.player.team) this.radio(T('Wir haben einen Panzer verloren!', 'We lost a tank!'), T('Gefechtsstand', 'Command post'), true);
    else this.radio(T('Feindpanzer brennt!', 'Enemy tank is burning!'), T('Gefechtsstand', 'Command post'));
  }
  onObjective(o) { this.session.obj++; this.score(100, T('Ziel erfüllt', 'Objective complete')); this.audio.radio(); }

  foundLost(u) {
    u.lost = false;
    const side = u.team;
    this.missions.state[side].found++;
    // Erkennungszeichen der 101. Luftlandedivision: Cricket-Knackfrosch, Parole „Flash“ – „Thunder“
    if (side === 'us') this.radio(T('„Flash!“ – „Thunder!“ – Gut, dass ihr da seid. Wir schließen uns an.', '"Flash!" – "Thunder!" – Glad to see you. We\'re with you.'), u.name);
    else this.radio(T('Kamerad! Wir schließen uns an.', 'Comrade! We\'re joining you.'), u.name);
    this.audio.play('click', u.pos, 0.6, 2.4); setTimeout(() => this.audio.play('click', u.pos, 0.6, 2.4), 300);
    // eigenem Trupp (Folgen) zuordnen
    let sq = this.units.squads.find((s) => s.team === side && s.order === 'follow');
    if (!sq) { sq = { id: this.units.squads.length, team: side, order: 'follow', units: [], home: u.pos.clone() }; this.units.squads.push(sq); }
    const old = u.squad; if (old) old.units = old.units.filter((x) => x !== u);
    sq.units.push(u); u.squad = sq;
  }
  // Rauchwolken: verdecken der KI die Sicht (wachsen nach dem Zünden, lösen sich nach ~30 s auf)
  addSmoke(p) { (this.smokes || (this.smokes = [])).push({ x: p.x, y: p.y, z: p.z, t0: this.time }); }
  smokeBlocks(a, b) {
    if (!this.smokes || !this.smokes.length) return false;
    for (let i = this.smokes.length - 1; i >= 0; i--) {
      const s = this.smokes[i], age = this.time - s.t0;
      if (age > 32) { this.smokes.splice(i, 1); continue; }
      const r = Math.min(7, age * 2.5) * (age > 26 ? (32 - age) / 6 : 1);
      if (r < 1) continue;
      const dx = b.x - a.x, dz = b.z - a.z, L2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((s.x - a.x) * dx + (s.z - a.z) * dz) / L2));
      const px = a.x + dx * t - s.x, pz = a.z + dz * t - s.z, py = a.y + (b.y - a.y) * t - s.y;
      if (px * px + pz * pz < r * r && py < r * 0.9) return true;
    }
    return false;
  }
  squadLeaderFor(team) { return this.player.alive && this.player.team === team ? this.player : null; }

  // Schaden am eigenen Spieler
  damagePlayer(d, dir, owner, head = false, blast = false, cause = '') {
    const p = this.player;
    if (!p.alive || this.state !== 'playing') return;
    if (p.inBoat && !blast) d *= 0.3;
    p.hp -= d;
    p.lastHurt = this.time;
    p.suppress = Math.min(1, p.suppress + 0.4);
    const a = dir ? Math.atan2(dir.x, dir.z) : p.yaw;
    this.hud.damage(a, d);
    this.shake(Math.min(0.5, d / 80));
    this.audio.play('hit', null, 0.6, 0.6, { verb: false });
    if (p.hp <= 0) this.playerDied(owner, cause);
  }
  applyNetDamage(m) {
    const dir = new THREE.Vector3(m.r ? m.r[0] : 0, 0, m.r ? m.r[1] : 0);
    this.lastKiller = { name: m.f, pid: m.fp };
    this.damagePlayer(m.a * this.difficultyDmg(), dir.lengthSq() ? dir : null, { pid: m.fp }, !!m.h);
  }
  netHitAvatar(av, d, owner, dir, head) {
    if (!this.net || !(owner && owner.local)) return;
    if (av.team === this.player.team && this.mode !== 'versus') return;
    this.hud.hit(head, false);
    this.net.hitPlayer(av.pid, d, head, dir || new THREE.Vector3());
  }

  playerDied(owner, cause) {
    const p = this.player;
    p.alive = false; p.hp = 0;
    this.stats.deaths++; this.session.deaths++;
    this.deadT = 0;
    this.input.clearToggles();
    let killer = cause || T('Feind', 'Enemy');
    if (owner && owner.uid) { const u = this.units.byId.get(owner.uid); if (u) killer = u.name; }
    else if (owner && owner.support) killer = T('Artillerie', 'Artillery');
    else if (this.lastKiller && owner && owner.pid !== undefined) killer = this.lastKiller.name;
    this.feed(killer, this.playerName());
    if (this.net) this.net.isHost ? this.net.onHost(0, { t: 'died', k: owner && owner.pid, kn: killer }) : this.net.send({ t: 'died', k: owner && owner.pid, kn: killer });
    this.audio.concussion(0.8);
  }

  // ------------------------------------------------------------ Missionsende
  onMissionEnd(winner, reason) {
    if (this.net && this.net.isHost) this.net.send({ t: 'result', w: winner, r: reason });
    const won = winner === this.player.team;
    this.resultT = 3.5;
    this.result = { won, reason, winner };
    this.radio(won ? T('Auftrag erfüllt!', 'Mission accomplished!') : T('Auftrag gescheitert.', 'Mission failed.') + (reason ? ' ' + reason : ''), T('Gefechtsstand', 'Command post'), true);
  }

  showResult() {
    const r = this.result, side = this.player.team;
    this.state = 'result';
    this.input.unlock();
    this.hud.show(false);
    this.stats.missions++;
    this.stats.time += this.missions.t;
    if (r.won) this.score(Math.round(500 * [0.6, 1, 1.5][this.settings.difficulty ?? 1]), null);
    saveStats(this.stats);
    let next = null;
    if (this.mode === 'campaign' && r.won) {
      const list = CAMPAIGN[side], i = list.indexOf(this.op.id);
      const c = this.camp[side];
      c.unlocked = Math.max(c.unlocked, i + 1);
      c.best[this.op.id] = Math.max(c.best[this.op.id] || 0, this.session.score);
      saveCampaign(this.camp);
      next = list[i + 1] || null;
    }
    $('res-title').textContent = r.won ? T('Auftrag erfüllt', 'Mission accomplished') : T('Auftrag gescheitert', 'Mission failed');
    $('res-title').className = r.won ? 'won' : 'lost';
    const ep = EPILOGUE[side] && EPILOGUE[side][this.op.id];
    $('res-body').innerHTML = `<p class="rr">${esc(r.reason || '')}</p>` +
      `<div class="rstats"><div><b>${this.session.kills}</b><span>${T('Gegner ausgeschaltet', 'Enemies down')}</span></div><div><b>${this.session.obj}</b><span>${T('Ziele', 'Objectives')}</span></div><div><b>${this.session.deaths}</b><span>${T('Gefallen', 'Deaths')}</span></div><div><b>${this.session.score}</b><span>${T('Punkte', 'Score')}</span></div><div><b>${fmtTime(this.missions.t)}</b><span>${T('Dauer', 'Time')}</span></div></div>` +
      (r.won && ep ? `<p class="epi">${esc(L(ep))}</p>` : '') +
      `<p class="rank">${T('Dienstgrad', 'Rank')}: <b>${esc(rankFor(this.stats.score, side))}</b> · ${this.stats.score} ${T('Punkte gesamt', 'total points')}</p>`;
    $('res-next').classList.toggle('hidden', !next);
    $('res-next').onclick = () => this.openBriefing(next, side, 'campaign');
    $('res-retry').onclick = () => this.openBriefing(this.op.id, side, this.mode === 'campaign' ? 'campaign' : 'free', this.opts);
    $('res-retry').classList.toggle('hidden', !!(this.net && !this.net.isHost));
    this.showMenu('result');
  }

  // Fehler protokollieren (höchstens einmal pro Sekunde), Spiel läuft weiter
  reportError(e) {
    const now = performance.now();
    if (this._errT && now - this._errT < 1000) return;
    this._errT = now;
    console.error('Spielfehler', e);
    this.lastError = String(e && e.stack || e).slice(0, 300);
  }

  // ------------------------------------------------------------ Hauptschleife
  loop(t) {
    requestAnimationFrame((x) => this.loop(x));
    let dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    this.input.poll(dt, this.state);
    if (this.state === 'playing' || (this.state === 'paused' && this.net)) {
      try { this.update(dt); } catch (e) { this.reportError(e); }
    }
    else {
      // Verbindungsaufbau läuft auch im Menü weiter
      if (this.net && this.state !== 'loading') this.net.update(dt);
      this.menuGamepad();
    }
    if (this.world) { try { this.render(dt); } catch (e) { this.reportError(e); } }
    else { this.renderer.setClearColor(0x1e1c17); this.renderer.clear(); }
  }

  update(dt) {
    const p = this.player, inp = this.input;
    this.time += dt;
    const paused = this.state === 'paused';
    const blockInput = paused || this.comms.chatOpen;
    // Spieler
    const emptyInp = { look: { x: 0, y: 0 }, move: { x: 0, y: 0 }, held: () => false, pressed: () => false, released: () => false };
    const I = blockInput ? emptyInp : inp;
    if (!blockInput) this.handleKeys(inp);
    if (this.radioOpen && !blockInput) { /* Funkmenü verwendet Zifferntasten */ }
    if (p.alive) {
      if (I === inp) this.aimAssist(dt, inp);
      p.update(dt, I);
      if (!this.radioOpen) p.weaponUpdate(dt, I);
      this.interactions(dt, I);
    } else this.deadUpdate(dt);
    const host = !this.net || this.net.isHost;
    if (host) this.units.update(dt); else this.units.updatePuppets(dt);
    this.combat.update(dt);
    this.missions.update(dt);
    this.atmo.update(dt);
    if (this.net) this.net.update(dt);
    this.comms.update();
    this.world.update(dt, this.time);
    if (this.radioCd) for (const k in this.radioCd) this.radioCd[k] = Math.max(0, this.radioCd[k] - dt);
    if (this.radioOpen) this.hud.radioMenu(true, this.radioItems());
    this.hud.update(dt);
    if (this.result && this.state === 'playing') { this.resultT -= dt; if (this.resultT <= 0) { this.showResult(); this.result = null; } }
  }

  handleKeys(inp) {
    if (inp.pressed('pause')) this.pause(true);
    if (inp.pressed('chat') && this.net) { this.comms.openChat(); }
    if (inp.pressed('radio')) { this.radioOpen = !this.radioOpen; this.hud.radioMenu(this.radioOpen, this.radioItems()); }
    if (this.radioOpen) for (let i = 1; i <= 4; i++) if (inp.pressed('w' + i) || this.input.down.has('Digit' + i)) { if (!this._rk || this._rk !== i) this.callSupport(i - 1); this._rk = i; }
    if (!this.input.down.has('Digit1') && !this.input.down.has('Digit2') && !this.input.down.has('Digit3') && !this.input.down.has('Digit4')) this._rk = 0;
    this.hud.scoreboard(inp.held('score') || !!this.sbOpen);
    if (inp.pressed('map')) { this.mapOpen = !this.mapOpen; }
    this.hud.drawMap(this.mapOpen);
    if (inp.pressed('view')) { this.thirdPerson = !this.thirdPerson; }
  }

  // Taste ESC & Co. (auch außerhalb des Spiels)
  onKey(code) {
    if (code === 'Escape') {
      if (this.comms.chatOpen) return;
      if (this.radioOpen) { this.radioOpen = false; this.hud.radioMenu(false); return; }
      if (this.mapOpen) { this.mapOpen = false; return; }
      if (this.state === 'playing') this.pause(true);
      else if (this.state === 'paused') this.pause(false);
      else if (this.state === 'menu-sub') this.showMenu('menu');
    }
  }

  pause(on) {
    if (on && this.state === 'playing') {
      this.state = 'paused';
      this.input.unlock();
      this.input.clearToggles();
      $('pause-mp').classList.toggle('hidden', !this.net);
      if (this.net && this.net.tr.code) $('pause-code').textContent = this.net.isHost && this.net.tr.code() ? T('Spielcode: ', 'Game code: ') + this.net.tr.code() : '';
      this.showMenu('pause');
    } else if (!on && this.state === 'paused') {
      this.state = 'playing';
      this.showMenu(null);
      if (this.input.device === 'keyboard' && !isMobile) this.input.lock();
    }
  }

  // ------------------------------------------------------------ Interaktion, Funk, Tod
  interactions(dt, inp) {
    const p = this.player;
    const act = p.inBoat || p.chute ? null : this.missions.interaction(p.pos, p.team);
    this.interactHint = act;
    if (act && inp.held('use')) {
      this.holdE += dt;
      if (this.holdE >= act.time) {
        this.holdE = 0;
        if (!this.net || this.net.isHost) this.missions.interact(act, p.team);
        else this.net.send({ t: 'int', k: act.kind, id: act.tg.id });
      }
    } else this.holdE = 0;
    // Munitionskiste: bei Verbündeten mit Funker oder an der Startzone nachfüllen
    if (inp.pressed('use') && !act) {
      const near = this.units.list.find((u) => u.alive && u.team === p.team && u.role === 'officer' && u.pos.distanceTo(p.pos) < 3);
      if (near) { for (const id of p.weapons) { const W = WEAPONS[id]; p.ammo[id].res = Math.max(p.ammo[id].res, W.grenade ? 2 : W.reserve); } p.bandages = Math.max(p.bandages, 2); this.hud.toast(T('Munition aufgefüllt', 'Ammo resupplied')); }
    }
  }

  radioItems() {
    const side = this.player.team, cd = this.radioCd, off = this.player.radio ? 0.5 : 1;
    const coast = this.op.ambient.naval;
    const items = [];
    if (this.op.id === 'drop' && side === 'us') return [{ label: T('Keine Verbindung zur Artillerie (Funkgeräte beim Absprung verloren)', 'No link to artillery (radios lost in the jump)'), k: null, ready: false, wait: '–' }];
    items.push({ k: 'arty', label: side === 'us' ? (coast ? T('Schiffsartillerie (USS Texas)', 'Naval gunfire (USS Texas)') : T('Artillerie: 105-mm-Haubitzen', 'Artillery: 105 mm howitzers')) : T('Artillerie: 10,5-cm-leFH-Batterie', 'Artillery: 10.5 cm leFH battery'), cd: 150 * off });
    if (side === 'us' && !this.atmo.night) items.push({ k: 'air', label: T('Luftangriff: P-47 Thunderbolt', 'Air strike: P-47 Thunderbolt'), cd: 200 * off });
    if (side === 'de') items.push({ k: 'nw', label: T('Nebelwerfer-Salve (15 cm)', 'Nebelwerfer salvo (15 cm)'), cd: 180 * off });
    items.push({ k: 'smoke', label: T('Rauchvorhang', 'Smoke screen'), cd: 70 * off });
    for (const it of items) { it.ready = (cd[it.k] || 0) <= 0; it.wait = Math.ceil(cd[it.k] || 0); }
    return items;
  }

  callSupport(i) {
    const it = this.radioItems()[i];
    if (!it || !it.k) return;
    if (!it.ready) { this.hud.toast(T(`Noch ${it.wait} s`, `${it.wait} s left`)); return; }
    // Ziel im Fadenkreuz
    const cam = this.camera;
    cam.getWorldDirection(_v);
    const far = _w.copy(cam.position).addScaledVector(_v, 400);
    const t = this.world.raycast(cam.position, far);
    const p = cam.position.clone().lerp(far, t);
    if (t >= 0.999) { this.hud.toast(T('Kein Ziel im Fadenkreuz (max. 400 m)', 'No target under crosshair (max 400 m)')); return; }
    const close = p.distanceTo(this.player.pos);
    if (it.k !== 'smoke' && close < 60) { this.hud.warn(T('Zu nah an der eigenen Stellung!', 'Too close to own position!')); return; }
    this.radioCd[it.k] = it.cd;
    this.radioOpen = false; this.hud.radioMenu(false);
    const coord = `${Math.round(p.x + 450).toString().padStart(3, '0')}-${Math.round(p.z + 450).toString().padStart(3, '0')}`;
    this.radio(T(`Feuerauftrag, Planquadrat ${coord}. Kommen.`, `Fire mission, grid ${coord}. Over.`), this.playerName());
    setTimeout(() => this.world && this.radio(it.k === 'air' ? T('Thunderbolts im Anflug, Ziel erkannt.', 'Thunderbolts inbound, target identified.') : T('Verstanden, Feuer kommt. Ende.', 'Roger, shot out. Out.'), it.k === 'air' ? T('Fliegerleitoffizier', 'Air liaison') : T('Feuerleitstelle', 'Fire direction')), 1800);
    if (!this.net || this.net.isHost) this.atmo.support(it.k, p, this.player.team);
    else this.net.send({ t: 'sup', k: it.k, x: p.x, z: p.z });
  }

  deadUpdate(dt) {
    this.deadT += dt;
    const p = this.player;
    // Kamera sinkt zu Boden
    const campaign = this.mode === 'campaign';
    let text = `<h2>${T('Gefallen', 'Killed in action')}</h2>`;
    if (campaign) {
      const mate = this.units.list.filter((u) => u.alive && u.team === p.team && !u.lost && !u.inBoat && !u.static).sort((a, b) => a.pos.distanceTo(p.pos) - b.pos.distanceTo(p.pos))[0];
      if (!mate) {
        text += `<p>${T('Keine Kameraden mehr übrig.', 'No comrades left.')}</p>`;
        if (this.deadT > 3 && !this.missions.over) this.missions.finish(OTHER[p.team], T('Alle Männer gefallen', 'All men lost'));
      } else {
        text += `<p>${T('Sie übernehmen', 'You take over')}: <b>${esc(mate.name)}</b> (${esc(L(CLASSES[mate.role] ? CLASSES[mate.role].name : CLASSES.rifle.name))})</p><p>${Math.max(0, Math.ceil(4 - this.deadT))}</p>`;
        if (this.deadT > 4) { this.takeOver(mate); return; }
      }
    } else {
      const wait = 8;
      text += `<p>${T('Wiedereinstieg in', 'Respawn in')} ${Math.max(0, Math.ceil(wait - this.deadT))} s</p><div class="clsrow">${PLAYER_CLASSES.map((c, i) => `<button data-c="${c}" class="${this.nextCls === c || (!this.nextCls && c === p.cls) ? 'on' : ''}">${i + 1} ${esc(L(CLASSES[c].name))}</button>`).join('')}</div>`;
      for (let i = 0; i < PLAYER_CLASSES.length; i++) if (this.input.down.has('Digit' + (i + 1))) this.nextCls = PLAYER_CLASSES[i];
      if (this.deadT > wait) { this.respawn(); return; }
    }
    if (this.deadT > 0.8) this.hud.respawn(true, text);
    if (!this._clsBound) { this._clsBound = true; $('respawn').addEventListener('pointerdown', (e) => { const b = e.target.closest('button[data-c]'); if (b) { e.preventDefault(); this.nextCls = b.dataset.c; } }); }
  }

  takeOver(u) {
    const p = this.player;
    const role = u.role === 'officer' ? 'officer' : PLAYER_CLASSES.includes(u.role) ? u.role : 'rifle';
    const pos = u.pos.clone(), yaw = u.yaw;
    u.remove(); this.units.list.splice(this.units.list.indexOf(u), 1); this.units.byId.delete(u.uid);
    if (u.squad) u.squad.units = u.squad.units.filter((x) => x !== u);
    p.reset(role, p.team);
    p.spawnAt(pos, yaw);
    this.hud.respawn(false);
    this.makePlayerRig();
    this.hud.toast(T('Sie führen jetzt: ', 'Now playing as: ') + u.name);
  }

  respawn() {
    const p = this.player;
    p.reset(this.nextCls || p.cls, p.team);
    this.spawnPlayer(false);
    this.hud.respawn(false);
    this.makePlayerRig();
    if (this.net && !this.net.isHost) this.net.send({ t: 'cls', c: p.cls, s: p.team });
  }

  // Zielhilfe für Touch/Gamepad (wie im Medevac-sim): bremst das Zielen über einem Feind ab und
  // zieht das Visier sanft auf ihn, solange gezielt, gefeuert oder bewegt wird. Wirkt auf die Eingabe.
  aimAssist(dt, inp) {
    const lvl = this.settings.aimAssist;
    if (!lvl || lvl === 'off' || (this.input.device !== 'touch' && this.input.device !== 'gamepad')) return;
    const p = this.player;
    if (!p.alive || p.chute || p.inBoat) return;
    const s = lvl === 'strong' ? 1.8 : 1;
    const cam = this.camera.position;
    const zoom = p.ads > 0.3;
    let best = null, bestK = 1, by = 0, bp = 0;
    const consider = (e) => {
      const dx = e.pos.x - cam.x, dz = e.pos.z - cam.z, dy = e.pos.y + (e.stance === 2 ? 0.3 : e.stance === 1 ? 0.85 : 1.25) - cam.y;
      const h = Math.hypot(dx, dz);
      if (h > 260) return;
      const yaw = Math.atan2(-dx, -dz), pitch = Math.atan2(dy, h), dist = Math.hypot(h, dy);
      const ey = wrapAngle(yaw - p.yaw), ep = pitch - p.pitch;
      const cone = (0.05 + 1.3 / Math.max(dist, 5)) * (zoom ? 1.3 : 1) * (0.8 + 0.2 * s);
      const k = Math.hypot(ey * Math.cos(p.pitch), ep) / cone;
      if (k < bestK) { bestK = k; best = e; by = ey; bp = ep; }
    };
    for (const u of this.units.list) if (u.alive && u.team !== p.team && !u.inBoat) consider(u);
    if (this.mode === 'versus') for (const a of this.avatars.values()) if (a.alive && a.visible && a.team !== p.team) consider(a);
    if (!best) return;
    // nur auf sichtbare Ziele (Sichtprüfung zwischengespeichert)
    if (this._aaT !== best || this.time > (this._aaLosT || 0)) {
      this._aaT = best; this._aaLosT = this.time + 0.25;
      best.chest ? best.chest(_w) : _w.copy(best.pos).setY(best.pos.y + 1.2);
      this._aaLos = this.world.los(cam, _w) && !this.smokeBlocks(cam, _w);
    }
    if (!this._aaLos) return;
    const fr = 1 - 0.45 * Math.min(1, s * 0.8) * (1 - bestK);
    inp.look.x *= fr; inp.look.y *= fr;
    const active = zoom || inp.held('fire') || Math.abs(inp.look.x) + Math.abs(inp.look.y) > 1e-4;
    if (!active) return;
    const sens = (this.settings.sensitivity || 1) * (1 - p.ads * (1 - 1 / (p.W.zoom || 1)) * 0.85);
    const pull = Math.min(1, dt * (zoom || inp.held('fire') ? 2.6 : 1.4) * s);
    inp.look.x -= (by * pull) / sens;
    inp.look.y -= ((bp * pull) / sens) * (this.settings.invertY ? -1 : 1);
  }

  // ------------------------------------------------------------ Darstellung
  render(dt) {
    const r = this.renderer, cam = this.camera, p = this.player;
    if (this.state === 'playing' || this.state === 'paused' || this.state === 'result') {
      p.updateView(dt);
      // Tot: Kamera kippt
      if (!p.alive) { cam.position.y = p.pos.y + 0.3; cam.rotation.z = 0.6; }
      // Schulterkamera
      if (this.playerRig) {
        const tp = this.thirdPerson && p.alive && !p.inBoat;
        this.playerRig.root.visible = tp;
        if (tp) {
          this.playerRig.root.position.copy(p.pos);
          this.playerRig.root.rotation.y = p.yaw;
          this.playerRig.pose(p.speed, p.stance, p.pitch, dt);
          cam.getWorldDirection(_v);
          const back = _w.set(Math.cos(p.yaw) * 0.6, 0.35, -Math.sin(p.yaw) * 0.6).addScaledVector(_v, -3.2);
          const target = cam.position.clone().add(back);
          const t = this.world.raycast(cam.position, target);
          cam.position.lerp(target, Math.max(0, t - 0.08));
        }
      }
      // Erschütterung
      if (this.shakeK > 0.001) {
        const s = this.shakeK * 0.06;
        cam.position.x += (rand() - 0.5) * s; cam.position.y += (rand() - 0.5) * s;
        cam.rotation.z += (rand() - 0.5) * s * 0.5;
        this.shakeK *= Math.exp(-dt * 5);
      }
    }
    this.sky.position.copy(cam.position);
    // Schattenkamera folgt dem Spieler
    if (this.sun.castShadow && this.atmo) {
      const R = this.shadowR;
      const sd = this.atmo.sunDir;
      const tx = Math.round(cam.position.x / 4) * 4, tz = Math.round(cam.position.z / 4) * 4;
      this.sun.target.position.set(tx, cam.position.y - 5, tz);
      this.sun.position.set(tx + sd.x * 200, cam.position.y - 5 + sd.y * 200, tz + sd.z * 200);
    } else if (this.atmo) { this.sun.position.copy(this.atmo.sunDir).multiplyScalar(200); this.sun.target.position.set(0, 0, 0); }
    if (this.effects) this.effects.update(dt, cam, this.scene.fog ? this.scene.fog.color : new THREE.Color(), this.scene.fog ? this.scene.fog.density : 0, this.atmo ? this.atmo.particleLight : 1);
    if (this.grass) this.grass.update(dt, cam);
    // Sichtweite: Nebel nimmt mit der Grafikstufe zu
    r.clear();
    r.render(this.scene, cam);
    if (this.state !== 'result' && p.alive && !this.thirdPerson && !p.inBoat && !p.chute) {
      r.clearDepth();
      const vm = p.vm;
      vm.hemi.intensity = this.hemi.intensity * 1.1; vm.hemi.color.copy(this.hemi.color);
      vm.sun.intensity = this.sun.intensity * 0.8; vm.sun.color.copy(this.sun.color);
      // beim Zielen: alles zwischen Auge und Kimme ausblenden (Kolben, Wange, rechte Hand)
      if (vm.clipZ) { this._clip = this._clip || new THREE.Plane(new THREE.Vector3(0, 0, -1), 0); this._clip.constant = vm.clipZ; r.clippingPlanes = [this._clip]; }
      r.render(vm.scene, vm.cam);
      r.clippingPlanes = [];
    }
  }

  // ------------------------------------------------------------ Netz
  netFire(o, d, wid, tracer) { if (this.net && this.netReady) this.net.fire(o, d, wid, tracer); }
  netNade(o, v, wid) { if (this.net && this.netReady) this.net.nade(o, v, wid); }

  async hostGame(opId, side, mode, opts, cls) {
    const tr = netTransport();
    if (!tr) { alert(T('Mehrspieler wird von diesem Browser nicht unterstützt.', 'Multiplayer is not supported by this browser.')); return; }
    this.net = new Net(this, tr);
    this.wrapClientDamage();
    this.net.host(this.playerName(), { op: opId, mode, side, cls });
    await this.startMission(opId, side, mode, opts, cls);
    this.netReady = true;
    this.showCodeHint();
  }
  showCodeHint() {
    let n = 0;
    const tick = () => {
      if (!this.net || !this.net.isHost) return;
      const code = this.net.tr.code && this.net.tr.code(), st = this.net.tr.status && this.net.tr.status();
      if (code && st === 'ready') { this.radio(T(`Spiel eröffnet. Spielcode: ${code}`, `Game hosted. Game code: ${code}`), T('Funk', 'Radio')); return; }
      if (st && st.startsWith('err')) { this.radio(T('Spielcode nicht verfügbar (keine Internetverbindung). LAN-Spiel in der App funktioniert trotzdem.', 'Game code unavailable (no internet). LAN games in the app still work.'), T('Funk', 'Radio')); return; }
      if (n++ < 40) setTimeout(tick, 500);
    };
    tick();
  }

  joinGame(target, port) {
    const tr = netTransport();
    if (!tr) return;
    this.net = new Net(this, tr);
    this.wrapClientDamage();
    $('mp-status').textContent = T('Verbinde …', 'Connecting …');
    this.net.join(target, port, this.playerName(), $('mp-side').value, $('mp-cls').value);
  }

  // Client: Treffer auf KI und Panzer an den Host melden statt selbst anzuwenden
  wrapClientDamage() {
    const g = this;
    this._clientDmg = (u, d, owner, dir, head) => { if (owner && owner.local) { g.hud.hit(head, u.hp - d <= 0); g.net.hitUnit(u, d, head, dir || new THREE.Vector3()); } };
  }

  async startClient(m) {
    const side = m.side;
    await this.startMission(m.op, side, m.mode, m.opts || {}, $('mp-cls').value || 'rifle');
    this.time = m.time;
    this.missions.applyNet(m.ms);
    for (const id of m.tgd || []) { const tg = this.world.targets[id]; if (tg) { if (tg.kind === 'flag') this.missions.raiseFlag(tg); else this.missions.destroyTarget(tg, 'none'); } }
    // Schaden auf KI geht an den Host
    const units = this.units, orig = units.damage.bind(units);
    units.damage = (u, d, owner, dir, head) => { if (this.net && !this.net.isHost) this._clientDmg(u, d, owner, dir, head); else orig(u, d, owner, dir, head); };
    this.netReady = true;
  }
  onNetStatus(t, err) { $('mp-status').textContent = t; $('mp-status').classList.toggle('err', !!err); }
  onNetLost() {
    if (this.state === 'playing' || this.state === 'paused') this.radio(T('Verbindung zum Host verloren.', 'Lost connection to host.'), T('Funk', 'Radio'), true);
    this.leaveNet();
    setTimeout(() => this.toMenu(), 2500);
  }
  leaveNet() { if (this.net) { this.net.stop(); this.comms.stop(); } this.net = null; this.netReady = false; }

  toMenu() {
    this.leaveNet();
    this.cleanup();
    this.state = 'menu';
    this.hud.show(false);
    this.input.unlock();
    this.voice.stop();
    document.body.classList.remove('ingame');
    this.audio.setLoop && this.audio.ctx && (this.audio.setLoop('rain', 0), this.audio.setLoop('surf', 0), this.audio.setLoop('wind', 0));
    this.showMenu('menu');
  }

  // ================================================================ Menüs
  showMenu(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
    if (id) { const el = $('s-' + id); if (el) el.classList.remove('hidden'); }
    if (id === 'menu') this.renderMainInfo();
    this.menuFocus = 0;
  }

  renderMainInfo() {
    const s = this.stats;
    $('main-stats').innerHTML = `${T('Einsätze', 'Missions')}: <b>${s.missions}</b> · ${T('Ausgeschaltet', 'Kills')}: <b>${s.kills}</b> · ${T('Punkte', 'Score')}: <b>${s.score}</b><br>${esc(rankFor(s.score, 'us'))} / ${esc(rankFor(s.score, 'de'))}`;
  }

  async checkVersion() {
    const v = await fetchVersion();
    const av = appVersion();
    $('ver').textContent = (av ? 'App ' + av + ' · ' : '') + (v ? 'Version ' + v.versionName : '');
    $('btn-update').classList.toggle('hidden', !isApp);
    // APK-Download nur im Browser anbieten und nur, wenn die Datei veröffentlicht ist
    if (!isApp) {
      try { const r = await fetch('apk/normandy1944.apk', { method: 'HEAD', cache: 'no-store' }); if (r.ok) $('apk-link').classList.remove('hidden'); } catch (_) { /* offline */ }
    }
  }

  buildMenus() {
    const g = this;
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', (e) => { g.audio.init(); fn(e); }); };
    // Hauptmenü
    on('m-campaign', () => { this.renderCampaign(this.campSide || 'us'); this.showMenu('campaign'); });
    on('m-free', () => { this.renderFree(); this.showMenu('free'); });
    on('m-mp', () => { this.renderMp(); this.showMenu('mp'); });
    on('m-settings', () => { this.renderSettings(); this.settingsBack = 'menu'; this.showMenu('settings'); });
    on('m-help', () => this.showMenu('help'));
    on('m-history', () => this.showMenu('history'));
    on('btn-update', () => appCheckUpdate());
    document.querySelectorAll('.back').forEach((b) => b.addEventListener('click', () => this.showMenu(b.dataset.to || 'menu')));
    // Kampagne
    document.querySelectorAll('#camp-side button').forEach((b) => b.addEventListener('click', () => this.renderCampaign(b.dataset.side)));
    // Pause
    on('p-resume', () => this.pause(false));
    on('p-settings', () => { this.renderSettings(); this.settingsBack = 'pause'; this.showMenu('settings'); });
    on('p-restart', () => { if (this.net) return; this.openBriefing(this.op.id, this.player.team, this.mode, this.opts); });
    on('p-menu', () => this.toMenu());
    on('p-help', () => { this.helpBack = 'pause'; this.showMenu('help'); });
    on('res-menu', () => this.toMenu());
    on('set-back', () => { saveSettings(this.settings); this.showMenu(this.settingsBack || 'menu'); });
    // Mehrspieler
    on('mp-host', () => {
      this.settings.name = $('mp-name').value.trim().slice(0, 16) || this.playerName(); saveSettings(this.settings);
      const op = $('mp-op').value, mode = $('mp-mode').value, side = $('mp-hside').value;
      this.openBriefing(op, side, mode, { density: +$('mp-density').value }, true);
    });
    on('mp-join', () => {
      this.settings.name = $('mp-name').value.trim().slice(0, 16) || this.playerName(); saveSettings(this.settings);
      const code = $('mp-code').value.trim();
      if (!code) return;
      this.joinGame(code.toUpperCase(), 0);
    });
    // Briefing
    on('br-start', () => {
      const b = this.brief;
      if (b.host) this.hostGame(b.op, b.side, b.mode, b.opts, this.briefCls);
      else this.startMission(b.op, b.side, b.mode, b.opts, this.briefCls);
    });
    // Touch-Menütasten im Spiel
    const tap = (id, fn) => { const el = $(id); if (el) el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); this.audio.init(); fn(); }); };
    tap('tb-pause', () => this.pause(true));
    tap('tb-map', () => { this.mapOpen = !this.mapOpen; });
    tap('tb-chat', () => this.comms.openChat());
    tap('tb-radio', () => { this.radioOpen = !this.radioOpen; this.hud.radioMenu(this.radioOpen, this.radioItems()); });
    $('radiomenu').addEventListener('pointerdown', (e) => { const b = e.target.closest('button[data-i]'); if (b) { e.preventDefault(); this.callSupport(+b.dataset.i); } });
    tap('tb-view', () => { this.thirdPerson = !this.thirdPerson; });
    $('mapview').addEventListener('pointerdown', () => { this.mapOpen = false; });
    tap('tb-score', () => { this.sbOpen = !this.sbOpen; });
    // Vollbild auf Mobilgeräten
    document.addEventListener('click', () => { if (isMobile) enterFullscreen(); }, { once: true });
  }

  renderCampaign(side) {
    this.campSide = side;
    document.querySelectorAll('#camp-side button').forEach((b) => b.classList.toggle('on', b.dataset.side === side));
    const list = CAMPAIGN[side], c = this.camp[side];
    $('camp-list').innerHTML = list.map((id, i) => {
      const op = opById(id), locked = i > c.unlocked;
      return `<button class="op ${locked ? 'locked' : ''} ${c.best[id] ? 'done' : ''}" data-id="${id}" ${locked ? 'disabled' : ''}>
        <span class="num">${i + 1}</span><span class="opt"><b>${esc(L(op.title))}</b><small>${esc(L(op.date))} · ${op.time} · ${esc(L(op.place))}</small></span>
        <span class="st">${locked ? '🔒' : c.best[id] ? '✔ ' + c.best[id] : ''}</span></button>`;
    }).join('');
    $('camp-list').querySelectorAll('button.op').forEach((b) => b.addEventListener('click', () => this.openBriefing(b.dataset.id, side, 'campaign')));
    $('camp-unit').textContent = side === 'us' ? T('Fallschirmjäger, Ranger und Infanterie der US Army – vom Absprung in der Nacht bis zum Durchbruch bei Saint-Lô.', 'US Army paratroopers, Rangers and infantry – from the night drop to the breakthrough at Saint-Lô.') : T('Verteidiger des Atlantikwalls – Grenadiere, Artilleristen und Fallschirmjäger der Wehrmacht zwischen Strand und Bocage.', 'Defenders of the Atlantic Wall – Wehrmacht grenadiers, gunners and paratroopers between beach and bocage.');
  }

  renderFree() {
    const sel = (id, opts, val) => { $(id).innerHTML = opts.map(([v, t]) => `<option value="${v}" ${v === val ? 'selected' : ''}>${esc(t)}</option>`).join(''); };
    sel('fr-op', OPERATIONS.map((o) => [o.id, L(o.title)]), this.frOp || 'omaha');
    sel('fr-side', [['us', T('Amerikaner', 'Americans')], ['de', T('Deutsche', 'Germans')]], this.frSide || 'us');
    sel('fr-weather', [['hist', T('Historisch', 'Historical')], ...Object.entries(WEATHER).map(([k, w]) => [k, L(w.name)])], 'hist');
    sel('fr-time', [['hist', T('Historisch', 'Historical')], ['5', T('Morgengrauen', 'Dawn')], ['10', T('Vormittag', 'Morning')], ['15', T('Nachmittag', 'Afternoon')], ['21', T('Abenddämmerung', 'Dusk')], ['1', T('Nacht', 'Night')]], 'hist');
    sel('fr-density', [['0.6', T('Gering', 'Low')], ['1', T('Normal', 'Normal')], ['1.4', T('Hoch', 'High')]], '1');
    const go = $('fr-go');
    go.onclick = () => {
      this.frOp = $('fr-op').value; this.frSide = $('fr-side').value;
      const t = $('fr-time').value;
      this.openBriefing(this.frOp, this.frSide, 'free', { weather: $('fr-weather').value, hour: t === 'hist' ? undefined : +t, density: +$('fr-density').value });
    };
    $('fr-op').onchange = () => { const o = opById($('fr-op').value); $('fr-info').textContent = L(o.history); };
    $('fr-op').onchange();
  }

  renderMp() {
    $('mp-name').value = this.settings.name || '';
    const sel = (id, opts, val) => { $(id).innerHTML = opts.map(([v, t]) => `<option value="${v}" ${v === val ? 'selected' : ''}>${esc(t)}</option>`).join(''); };
    sel('mp-op', OPERATIONS.map((o) => [o.id, L(o.title)]), 'omaha');
    sel('mp-mode', [['coop', T('Gemeinsam gegen die KI (Koop)', 'Together vs. AI (co-op)')], ['versus', T('Gegeneinander (US gegen DE)', 'Versus (US vs. DE)')]], 'coop');
    sel('mp-hside', [['us', T('Amerikaner', 'Americans')], ['de', T('Deutsche', 'Germans')]], 'us');
    sel('mp-side', [['us', T('Amerikaner', 'Americans')], ['de', T('Deutsche', 'Germans')]], 'us');
    sel('mp-cls', PLAYER_CLASSES.map((c) => [c, L(CLASSES[c].name)]), 'rifle');
    sel('mp-density', [['0.6', T('Gering', 'Low')], ['1', T('Normal', 'Normal')], ['1.4', T('Hoch', 'High')]], '1');
    $('mp-status').textContent = '';
    // LAN-Spiele (nur App)
    const tr = isApp ? netTransport() : null;
    $('mp-lan').classList.toggle('hidden', !isApp);
    if (tr && tr.scan) {
      tr.scan(true);
      const upd = () => {
        if ($('s-mp').classList.contains('hidden')) { tr.scan(false); return; }
        const hs = tr.hosts();
        $('mp-lanlist').innerHTML = hs.length ? hs.map((h) => `<button data-ip="${esc(h.ip)}" data-port="${h.port}">${esc(h.info.name)} – ${esc(L((opById(h.info.op) || {}).title || ''))} (${h.info.n})</button>`).join('') : `<i>${T('Suche Spiele im WLAN …', 'Searching LAN games …')}</i>`;
        $('mp-lanlist').querySelectorAll('button').forEach((b) => b.onclick = () => { this.settings.name = $('mp-name').value.trim() || this.playerName(); this.joinGame(b.dataset.ip, +b.dataset.port); });
        setTimeout(upd, 1000);
      };
      upd();
    }
  }

  // Briefing: Geschichte, Auftrag, Ziele, Karte, Klassenwahl
  async openBriefing(opId, side, mode, opts = {}, host = false) {
    const op = opById(opId);
    this.brief = { op: opId, side, mode, opts, host };
    this.briefCls = this.briefCls || (side === 'us' ? 'rifle' : 'rifle');
    const S = op[side];
    $('br-title').textContent = L(op.title);
    $('br-meta').textContent = `${L(op.date)} · ${op.time} ${T('Uhr', '')} · ${L(op.place)}`;
    $('br-unit').textContent = L(S.unit);
    $('br-history').textContent = L(op.history);
    $('br-text').textContent = L(S.briefing);
    $('br-obj').innerHTML = S.objectives.map((o, i) => `<li><b>${i + 1}.</b> ${esc(L(o.text))}</li>`).join('');
    $('br-mode').textContent = mode === 'campaign' ? T('Kampagne', 'Campaign') + ' · ' + L(SIDES[side].name) : mode === 'free' ? T('Freies Gefecht', 'Skirmish') + ' · ' + L(SIDES[side].name) : (mode === 'versus' ? T('Mehrspieler – gegeneinander', 'Multiplayer – versus') : T('Mehrspieler – Koop', 'Multiplayer – co-op')) + ' · ' + L(SIDES[side].name);
    $('br-cls').innerHTML = PLAYER_CLASSES.map((c) => {
      const lo = CLASSES[c][side];
      return `<button data-c="${c}" class="${c === this.briefCls ? 'on' : ''}"><b>${esc(L(CLASSES[c].name))}</b><small>${lo.map((w) => esc(WEAPONS[w].name)).join(' · ')}</small></button>`;
    }).join('');
    $('br-cls').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { this.briefCls = b.dataset.c; $('br-cls').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); }));
    this.showMenu('briefing');
    this.drawBriefMap(op, side);
  }

  drawBriefMap(op, side) {
    // Kartenvorschau: Höhen und Straßen grob aus der Kartenbeschreibung
    const cv = $('br-map'), c = cv.getContext('2d'), S = cv.width;
    const M = MAPS[op.map];
    c.fillStyle = '#4c5a36'; c.fillRect(0, 0, S, S);
    const k = S / 900;
    if (M.sea || M.beach) { const z = (M.sea || -255) + 450; c.fillStyle = '#2e4450'; c.fillRect(0, 0, S, z * k); c.fillStyle = '#b4a27e'; c.fillRect(0, z * k, S, 30 * k); }
    if (M.flood) { c.fillStyle = '#3e4a3a'; c.fillRect((-330 + 450) * k, 0, 460 * k, S); }
    if (M.canal) { c.fillStyle = '#2e4450'; c.fillRect(0, 0, S, (M.canal + 450) * k); }
    c.strokeStyle = '#a89c80'; c.lineCap = 'round';
    for (const r of M.roads || []) { c.lineWidth = Math.max(2, r.w * k); c.beginPath(); r.pts.forEach(([x, z], i) => (i ? c.lineTo : c.moveTo).call(c, (x + 450) * k, (z + 450) * k)); c.stroke(); }
    for (const t of M.towns || []) { c.fillStyle = 'rgba(110,102,88,0.7)'; c.beginPath(); c.arc((t.x + 450) * k, (t.z + 450) * k, t.r * k * 0.8, 0, 7); c.fill(); }
    // Ziele
    const objs = op[side].objectives;
    c.font = 'bold 13px sans-serif'; c.textAlign = 'center';
    objs.forEach((o, i) => {
      const names = o.anchor ? [o.anchor] : o.targets || [];
      for (const n of names) {
        const a = M.anchors[n] || (M.features || []).find((f) => f.id === n) && [(M.features.find((f) => f.id === n)).x, (M.features.find((f) => f.id === n)).z];
        if (!a) continue;
        const x = (a[0] + 450) * k, y = (a[1] + 450) * k;
        c.fillStyle = '#ffd34d'; c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill();
        c.fillStyle = '#222'; c.fillText(String(i + 1), x, y + 4.5);
      }
    });
    const sp = M.anchors[op[side].spawn] || (op[side].spawn === 'boats' ? M.anchors.boat : op[side].spawn === 'jump' ? M.anchors.jump : null);
    if (sp) { c.fillStyle = SIDES[side].color; c.fillRect((sp[0] + 450) * k - 7, (sp[1] + 450) * k - 7, 14, 14); c.fillStyle = '#fff'; c.fillText(T('Start', 'Start'), (sp[0] + 450) * k, (sp[1] + 450) * k - 11); }
    c.fillStyle = '#e8dfc4'; c.fillText('N ▲', S - 24, 18);
  }

  renderSettings() {
    const s = this.settings;
    const qn = { minimal: T('Sehr niedrig (TV, schwache Geräte)', 'Very low (TV, weak devices)'), low: T('Niedrig', 'Low'), medium: T('Mittel', 'Medium'), high: T('Hoch', 'High'), ultra: T('Ultra', 'Ultra') };
    const rows = [
      ['h', T('Grafik', 'Graphics')],
      ['sel', 'quality', T('Qualitätsstufe', 'Quality preset'), QUALITY.map((q) => [q, qn[q]])],
      ['range', 'renderScale', T('Auflösung', 'Resolution scale'), 0.5, 1.5, 0.05, (v) => Math.round(v * 100) + ' %'],
      ['range', 'viewDist', T('Sichtweite', 'View distance'), 0.6, 1.6, 0.1, (v) => Math.round(v * 100) + ' %'],
      ['sel', 'shadows', T('Schatten', 'Shadows'), [['auto', T('Nach Stufe', 'By preset')], ['off', T('Aus', 'Off')], ['on', T('An', 'On')]]],
      ['sel', 'effects', T('Effekte (Rauch, Staub)', 'Effects (smoke, dust)'), [['auto', T('Nach Stufe', 'By preset')], ['low', T('Wenig', 'Low')], ['high', T('Viel', 'High')]]],
      ['range', 'fov', T('Sichtfeld', 'Field of view'), 55, 95, 1, (v) => v + '°'],
      ['chk', 'showFps', T('Bildrate anzeigen', 'Show frame rate')],
      ['h', T('Steuerung', 'Controls')],
      ['range', 'sensitivity', T('Empfindlichkeit', 'Sensitivity'), 0.3, 2.5, 0.05, (v) => v.toFixed(2)],
      ['chk', 'invertY', T('Y-Achse umkehren', 'Invert Y axis')],
      ['sel', 'aimAssist', T('Zielhilfe (Touch/Gamepad)', 'Aim assist (touch/gamepad)'), [['off', T('Aus', 'Off')], ['light', T('Leicht', 'Light')], ['strong', T('Stark', 'Strong')]]],
      ['chk', 'gyro', T('Gyro-Zielen (Handy neigen)', 'Gyro aiming (tilt phone)')],
      ['h', T('Spiel und Klang', 'Game and sound')],
      ['sel', 'difficulty', T('Schwierigkeit', 'Difficulty'), [[0, T('Rekrut', 'Recruit')], [1, T('Veteran', 'Veteran')], [2, T('Realistisch', 'Realistic')]]],
      ['range', 'volume', T('Lautstärke', 'Volume'), 0, 1, 0.05, (v) => Math.round(v * 100) + ' %'],
      ['chk', 'tts', T('Funksprüche vorlesen', 'Read radio messages aloud')],
      ['chk', 'openMic', T('Offenes Mikrofon (ohne Sprechtaste)', 'Open microphone (no push-to-talk)')],
      ['sel', 'lang', T('Sprache / Language', 'Language / Sprache'), [['de', 'Deutsch'], ['en', 'English']]],
    ];
    const box = $('set-list');
    box.innerHTML = '';
    for (const r of rows) {
      const d = document.createElement('div'); d.className = 'srow';
      if (r[0] === 'h') { d.className = 'sh'; d.textContent = r[1]; box.appendChild(d); continue; }
      const [type, key, label] = r;
      if (type === 'sel') {
        d.innerHTML = `<label>${esc(label)}</label><select>${r[3].map(([v, t]) => `<option value="${v}" ${String(s[key] ?? getLang()) === String(v) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
        d.querySelector('select').onchange = (e) => { const v = e.target.value; s[key] = key === 'difficulty' ? +v : v; this.applySetting(key); };
      } else if (type === 'range') {
        d.innerHTML = `<label>${esc(label)}</label><input type="range" min="${r[3]}" max="${r[4]}" step="${r[5]}" value="${s[key]}"><span>${r[6](+s[key])}</span>`;
        const inp = d.querySelector('input'), sp = d.querySelector('span');
        inp.oninput = () => { s[key] = +inp.value; sp.textContent = r[6](+inp.value); this.applySetting(key); };
      } else if (type === 'chk') {
        d.innerHTML = `<label>${esc(label)}</label><input type="checkbox" ${s[key] ? 'checked' : ''}>`;
        d.querySelector('input').onchange = (e) => { s[key] = e.target.checked; this.applySetting(key); };
      }
      box.appendChild(d);
    }
    // Tastenbelegung
    const kb = document.createElement('div'); kb.className = 'sh'; kb.textContent = T('Tastenbelegung (Klick, dann Taste drücken)', 'Key bindings (click, then press a key)'); box.appendChild(kb);
    const binds = resolveBinds(s);
    for (const b of BIND_DEFS) {
      if (b.g) continue;
      const d = document.createElement('div'); d.className = 'srow kb';
      d.innerHTML = `<label>${esc(L(b))}</label>` + [0, 1].map((i) => `<button data-i="${i}">${esc(keyName(binds[b.id][i]))}</button>`).join('');
      d.querySelectorAll('button').forEach((btn) => btn.onclick = () => {
        btn.textContent = '…';
        this.input.capture = (code) => {
          const cur = resolveBinds(s);
          if (code === 'Escape') code = '';
          cur[b.id][+btn.dataset.i] = code;
          s.binds = s.binds || {}; s.binds[b.id] = cur[b.id];
          saveSettings(s); this.input.refresh();
          btn.textContent = keyName(code);
        };
      });
      box.appendChild(d);
    }
    const rs = document.createElement('button'); rs.className = 'btn small'; rs.textContent = T('Standardbelegung', 'Reset bindings');
    rs.onclick = () => { s.binds = null; saveSettings(s); this.input.refresh(); this.renderSettings(); };
    box.appendChild(rs);
  }

  applySetting(key) {
    const s = this.settings;
    saveSettings(s);
    if (key === 'volume') this.audio.setVolume(s.volume);
    if (key === 'lang') { setLang(s.lang); location.reload(); }
    if (key === 'renderScale' || key === 'quality') { this.q = qualityConfig(s); this.resize(); }
    if (key === 'quality' || key === 'shadows' || key === 'viewDist' || key === 'effects') $('set-note').textContent = T('Wird beim nächsten Einsatz vollständig übernommen.', 'Fully applied at the next mission.');
  }

  // Gamepad-Navigation in Menüs
  menuGamepad() {
    const m = this.input.gpMenu;
    if (!m) return;
    const btns = [...document.querySelectorAll('.screen:not(.hidden) button:not([disabled]), .screen:not(.hidden) select')].filter((b) => b.offsetParent);
    if (!btns.length) return;
    const now = performance.now();
    if (this._gpT && now - this._gpT < 180) return;
    let moved = false;
    if (m.down || m.right) { this.menuFocus = (this.menuFocus + 1) % btns.length; moved = true; }
    else if (m.up || m.left) { this.menuFocus = (this.menuFocus - 1 + btns.length) % btns.length; moved = true; }
    else if (m.ok && !this._gpOk) { btns[this.menuFocus % btns.length].click(); this._gpT = now + 150; }
    else if (m.start && this.state === 'paused' && !this._gpOk) this.pause(false);
    this._gpOk = m.ok || m.start;
    if (moved) { this._gpT = now; btns.forEach((b) => b.classList.remove('gpf')); const b = btns[this.menuFocus % btns.length]; b.classList.add('gpf'); b.focus(); }
  }
}

// Statische Texte der Seite übersetzen (Englisch)
function translateStatic() {
  if (getLang() !== 'en') return;
  document.documentElement.lang = 'en';
  document.querySelectorAll('[data-en]').forEach((el) => { el.textContent = el.dataset.en; });
  document.querySelectorAll('[data-enph]').forEach((el) => { el.placeholder = el.dataset.enph; });
  const help = document.querySelector('#s-help .help');
  if (help) help.innerHTML = `<div class="col"><h3>Keyboard & mouse</h3><ul>
    <li><b>WASD</b> move · <b>Shift</b> sprint · <b>Space</b> jump</li><li><b>C</b> crouch · <b>Z/Y</b> prone</li>
    <li><b>Left mouse</b> fire · <b>Right mouse</b> aim / scope</li><li><b>R</b> reload · <b>Q</b> switch weapon · <b>1–3</b> select weapon</li>
    <li><b>G</b> grenade (release = throw)</li><li>Hold <b>E</b>: demolition charge, Bangalore, flag · climb rope</li><li><b>H</b> bandage</li>
    <li><b>F</b> radio menu: artillery, air strike, Nebelwerfer, smoke (target = crosshair)</li><li><b>M</b> map · <b>Tab</b> scoreboard · <b>V</b> third person</li>
    <li><b>Caps Lock / mouse 5</b> push-to-talk · <b>K/T</b> chat</li><li><b>Esc</b> pause</li></ul></div>
    <div class="col"><h3>Gamepad</h3><ul><li>Left stick move (click = sprint), right stick look (click = prone)</li>
    <li><b>RT</b> fire · <b>LT</b> aim · <b>A</b> jump · <b>B</b> crouch</li><li><b>X</b> reload · <b>Y</b> weapon · <b>LB</b> grenade · <b>RB</b> use</li>
    <li>D-pad: ↑ radio · ↓ bandage · ← push-to-talk · → map</li><li><b>Start</b> pause · <b>Back</b> scoreboard</li></ul>
    <h3>Touch</h3><ul><li>Left half: movement stick (push fully forward = sprint)</li><li>Swipe the right half to look; the FIRE button can be dragged at the same time</li>
    <li>AIM toggles · 📻 radio · 🗺 map · ⏸ pause</li><li>Optional gyro aiming in the settings</li></ul></div>`;
  const note = document.querySelector('#s-help > .note');
  if (note) note.textContent = 'Realism: bullets drop and take time to arrive, gunfire is heard with a delay (speed of sound), passing rounds crack and pin you down. The M1 Garand only loads full 8-round en-bloc clips (partial clips are ejected), bolt-action rifles must be cycled after every shot.';
  const hist = document.querySelector('#s-history .hist-text');
  if (hist) hist.innerHTML = `<p>On 6 June 1944 the Allies land in Normandy – the largest amphibious operation in history. During the night American and British airborne troops drop behind the beaches; from 06:30 the seaborne forces land on five sectors: <b>Utah</b> and <b>Omaha</b> (USA), <b>Gold</b> and <b>Sword</b> (Britain) and <b>Juno</b> (Canada).</p>
    <p>This game follows the American sectors and the German defence: the scattered drop of the 82nd and 101st Airborne, the capture of Sainte-Mère-Église, the costly fight on Omaha Beach, the Ranger assault on Pointe du Hoc, the attack on the Brécourt battery, the defence of the La Fière causeway, the battle for Carentan and the hedgerow fighting for Hill 192 outside Saint-Lô.</p>
    <p>Units, places, times and events follow the historical record. The characters are fictional; names marked with * are modelled on real commanders. The game deliberately avoids unconstitutional symbols and does not glorify war: every mission ends with the historical outcome – including the losses.</p>
    <p>On D-Day alone some 10,000 Allied soldiers were killed, wounded or missing; German losses were of a similar order. By the end of August 1944 the Battle of Normandy had claimed hundreds of thousands of victims on all sides – including French civilians.</p>`;
  const mpn = document.querySelector('#s-mp .col .note');
  if (mpn) mpn.textContent = 'Others join with the game code or invite link (internet); in the Android app also directly over Wi-Fi.';
}

window.addEventListener('load', () => { translateStatic(); new Game(); });
