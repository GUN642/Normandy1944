// Mehrspieler – Transport wie im Medevac-sim:
// Android-App: LAN (TCP + UDP-Spielsuche, LanNet.java) und zusätzlich Spielcode (WebRTC/PeerJS); Browser: Spielcode.
// "?net=test" verbindet zwei Tabs per BroadcastChannel (Entwicklung).
// Ablauf: Der Host rechnet KI, Missionen und Artillerie. Jeder Spieler rechnet seine eigene Bewegung und seine Schüsse;
// Treffer auf KI meldet der Schütze dem Host, Treffer auf Spieler leitet der Host an das Opfer weiter.
import * as THREE from './lib/three.module.min.js';
import { SoldierRig } from './models.js';
import { WEAPONS } from './weapons.js';
import { uniformFor, WIDS, lerpAngle, markMat } from './units.js';
import { T } from './i18n.js';

export function androidTransport() {
  const A = window.AndroidApp;
  if (!A || !A.netHost) return null;
  return {
    kind: 'lan',
    host: (info) => A.netHost(JSON.stringify(info)),
    info: (info) => A.netInfo(JSON.stringify(info)),
    join: (ip, port) => A.netJoin(String(ip), port | 0),
    send: (peer, obj) => A.netSend(peer, JSON.stringify(obj)),
    poll: () => {
      const s = A.netPoll(), out = [];
      if (!s) return out;
      for (const line of s.split('\n')) {
        const i = line.indexOf('\t');
        if (i < 0) continue;
        try { out.push({ p: +line.slice(0, i), m: JSON.parse(line.slice(i + 1)) }); } catch (e) { /* defekte Nachricht */ }
      }
      return out;
    },
    scan: (on) => A.netScan(!!on),
    hosts: () => { try { return JSON.parse(A.netHosts()); } catch (e) { return []; } },
    ip: () => A.netIp(),
    deviceName: () => (A.deviceName ? A.deviceName() : 'Android'),
    stop: () => A.netStop(),
  };
}

function testTransport() {
  const ch = new BroadcastChannel('n44-net'), tok = Math.random().toString(36).slice(2, 8);
  const inbox = [], peers = new Map(), toks = new Map(), hosts = new Map();
  let role = null, hostTok = null, nextId = 1, info = null, beacon = null;
  ch.onmessage = (e) => {
    const d = e.data;
    if (d.k === 'beacon') { hosts.set(d.tok, { ip: 'test-' + d.tok, port: 1, info: d.info, t: Date.now() }); return; }
    if (role === 'host') {
      if (d.k === 'join' && d.to === tok) {
        const id = nextId++; peers.set(id, d.tok); toks.set(d.tok, id);
        ch.postMessage({ k: 'acc', to: d.tok, from: tok }); inbox.push({ p: id, m: { t: '_join' } });
      } else if (d.k === 'msg' && d.to === tok && toks.has(d.from)) inbox.push({ p: toks.get(d.from), m: d.m });
      else if (d.k === 'bye' && toks.has(d.from)) { const id = toks.get(d.from); toks.delete(d.from); peers.delete(id); inbox.push({ p: id, m: { t: '_leave' } }); }
    } else if (role === 'client') {
      if (d.k === 'acc' && d.to === tok) inbox.push({ p: 0, m: { t: '_open' } });
      else if (d.k === 'msg' && d.from === hostTok && (d.to === tok || d.to === '*')) inbox.push({ p: 0, m: d.m });
      else if (d.k === 'bye' && d.from === hostTok) inbox.push({ p: 0, m: { t: '_leave' } });
    }
  };
  window.addEventListener('beforeunload', () => { if (role) ch.postMessage({ k: 'bye', from: tok }); });
  return {
    kind: 'test',
    host: (inf) => { role = 'host'; info = inf; beacon = setInterval(() => ch.postMessage({ k: 'beacon', tok, info }), 400); return 'ok:test:1'; },
    info: (inf) => { info = inf; },
    join: (ip) => { role = 'client'; hostTok = String(ip).replace('test-', ''); ch.postMessage({ k: 'join', to: hostTok, tok }); },
    send: (peer, m) => {
      if (role === 'host') {
        if (peer < 0) ch.postMessage({ k: 'msg', from: tok, to: '*', m });
        else if (peers.has(peer)) ch.postMessage({ k: 'msg', from: tok, to: peers.get(peer), m });
      } else if (role === 'client') ch.postMessage({ k: 'msg', from: tok, to: hostTok, m });
    },
    poll: () => inbox.splice(0),
    scan: () => {},
    hosts: () => [...hosts.values()].filter((h) => Date.now() - h.t < 2500),
    ip: () => 'test',
    deviceName: () => 'Browser',
    stop: () => { if (beacon) clearInterval(beacon); beacon = null; if (role) ch.postMessage({ k: 'bye', from: tok }); role = null; },
  };
}

// ------------------------------------------------------------ Browser: WebRTC über PeerJS
// Der Host meldet sich mit einem kurzen Spielcode beim öffentlichen PeerJS-Vermittlungsserver
// (0.peerjs.com, ohne Anmeldung) an; die Spieldaten laufen danach direkt zwischen den Geräten.
// Eine Spielsuche gibt es nicht – Mitspieler geben den Code ein oder öffnen den Einladungslink.
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PEER_PREFIX = 'n44-v1-';
export const isGameCode = (s) => /^[A-Z0-9]{4,6}$/i.test(String(s).trim()) && !/^\d+$/.test(String(s).trim());
const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');

let peerLib = null;
export function loadPeerJs() {
  if (window.peerjs && window.peerjs.Peer) return Promise.resolve(window.peerjs.Peer);
  if (!peerLib) {
    peerLib = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = new URL('./lib/peerjs.min.js', import.meta.url).href;
      s.onload = () => (window.peerjs && window.peerjs.Peer ? res(window.peerjs.Peer) : rej(new Error('PeerJS fehlt')));
      s.onerror = () => { peerLib = null; rej(new Error('PeerJS konnte nicht geladen werden')); };
      document.head.appendChild(s);
    });
  }
  return peerLib;
}

// eigener Vermittlungsserver nur für Tests: ?peer=localhost:9000
export function peerOptions() {
  const m = /[?&]peer=([^&]+)/.exec(location.search);
  if (!m) return { debug: 0 };
  const [host, port] = decodeURIComponent(m[1]).split(':');
  return { host, port: +port || 9000, path: '/', secure: false, debug: 0 };
}

export function peerTransport() {
  if (!window.RTCPeerConnection) return null;
  const inbox = [], conns = new Map(), seen = new Map();
  let peer = null, role = null, code = null, nextId = 1, hostConn = null, status = '', beat = null;
  const push = (p, m) => inbox.push({ p, m });

  // Herzschlag: geschlossene Tabs/abgerissene Verbindungen werden sonst erst spät bemerkt
  const startBeat = () => {
    if (beat) return;
    beat = setInterval(() => {
      const now = Date.now();
      if (role === 'host') {
        for (const [id, c] of conns) {
          if (c.open) c.send({ t: '_ping' });
          if (now - (seen.get(id) || now) > 20000) { conns.delete(id); try { c.close(); } catch (e) { /* egal */ } push(id, { t: '_leave' }); }
        }
      } else if (role === 'client' && hostConn) {
        if (hostConn.open) hostConn.send({ t: '_ping' });
        if (now - (seen.get(0) || now) > 20000) { const c = hostConn; hostConn = null; try { c.close(); } catch (e) { /* egal */ } push(0, { t: '_leave' }); }
      }
    }, 2000);
  };

  const wire = (c, id) => {
    c.on('data', (d) => {
      if (role === 'host' && conns.get(id) !== c) return;
      seen.set(id, Date.now());
      if (d && typeof d === 'object' && d.t !== '_ping') push(id, d);
    });
    c.on('close', () => {
      if (role === 'host') { if (conns.delete(id)) push(id, { t: '_leave' }); }
      else if (role === 'client' && c === hostConn) { hostConn = null; push(0, { t: '_leave' }); }
    });
    c.on('error', () => {});
  };

  const startHost = (Peer, tries = 0) => {
    code = newCode();
    const p = new Peer(PEER_PREFIX + code, peerOptions());
    peer = p;
    p.on('open', () => { status = 'ready'; });
    p.on('connection', (c) => {
      c.on('open', () => {
        const id = nextId++;
        conns.set(id, c);
        seen.set(id, Date.now());
        wire(c, id);
        startBeat();
        push(id, { t: '_join' });
      });
    });
    p.on('disconnected', () => { if (role === 'host' && !p.destroyed) setTimeout(() => { try { p.reconnect(); } catch (e) { /* egal */ } }, 2000); });
    p.on('error', (e) => {
      if (e.type === 'unavailable-id' && tries < 4) { p.destroy(); startHost(Peer, tries + 1); return; }
      if (['network', 'server-error', 'socket-error', 'browser-incompatible', 'ssl-unavailable'].includes(e.type) && status !== 'ready') status = 'err:' + e.type;
    });
  };

  return {
    kind: 'peer',
    // liefert sofort den Code; die Anmeldung beim Vermittlungsserver läuft im Hintergrund
    host: () => {
      role = 'host'; status = 'pending';
      code = newCode();
      loadPeerJs().then((Peer) => startHost(Peer)).catch(() => { status = 'err:lib'; });
      return 'pending';
    },
    code: () => code,
    status: () => status,
    info: () => {},
    join: (target) => {
      role = 'client';
      const want = String(target).trim().toUpperCase();
      loadPeerJs().then((Peer) => {
        const p = new Peer(undefined, peerOptions());
        peer = p;
        let opened = false, asked = false;
        const fail = () => { if (!opened && role === 'client') { role = null; push(0, { t: '_fail' }); } };
        const to = setTimeout(fail, 15000);
        p.on('open', () => {
          if (asked) return;
          asked = true;
          const c = p.connect(PEER_PREFIX + want, { serialization: 'json', reliable: true });
          hostConn = c;
          c.on('open', () => { opened = true; clearTimeout(to); seen.set(0, Date.now()); startBeat(); push(0, { t: '_open' }); });
          wire(c, 0);
        });
        p.on('error', (e) => { if (!opened) { clearTimeout(to); fail(); } else if (e.type === 'network' || e.type === 'peer-unavailable') { /* Verbindung bleibt evtl. bestehen */ } });
      }).catch(() => push(0, { t: '_fail' }));
    },
    send: (to, obj) => {
      if (role === 'host') {
        if (to < 0) { for (const c of conns.values()) if (c.open) c.send(obj); }
        else { const c = conns.get(to); if (c && c.open) c.send(obj); }
      } else if (hostConn && hostConn.open) hostConn.send(obj);
    },
    poll: () => inbox.splice(0),
    scan: () => {},
    hosts: () => [],
    ip: () => '',
    deviceName: () => (/Android/i.test(navigator.userAgent) ? 'Android' : /iPhone|iPad/i.test(navigator.userAgent) ? 'iPhone' : 'Browser'),
    stop: () => { role = null; clearInterval(beat); beat = null; seen.clear(); for (const c of conns.values()) try { c.close(); } catch (e) { /* egal */ } conns.clear(); hostConn = null; if (peer) try { peer.destroy(); } catch (e) { /* egal */ } peer = null; code = null; status = ''; },
  };
}

// Android-App: LAN (Spielsuche im WLAN) und Spielcode (Browser-Mitspieler) gleichzeitig.
// Spieler-IDs der Code-Verbindungen werden um 1000 verschoben.
const PEER_OFS = 1000;
function comboTransport(lan, pe) {
  let via = null;   // als Client: 'lan' | 'peer'
  return {
    kind: 'lan+peer',
    host: (info) => { const r = lan.host(info); if (!String(r).startsWith('err')) pe.host(info); return r; },
    code: () => pe.code(),
    status: () => pe.status(),
    info: (info) => lan.info(info),
    join: (ip, port) => { via = isGameCode(ip) ? 'peer' : 'lan'; return via === 'peer' ? pe.join(ip) : lan.join(ip, port); },
    send: (to, obj) => {
      if (via) return (via === 'peer' ? pe : lan).send(to, obj);
      if (to < 0) { lan.send(to, obj); pe.send(to, obj); } else if (to >= PEER_OFS) pe.send(to - PEER_OFS, obj); else lan.send(to, obj);
    },
    poll: () => {
      if (via === 'peer') return pe.poll();
      if (via === 'lan') return lan.poll();
      return lan.poll().concat(pe.poll().map((x) => ({ p: x.p + PEER_OFS, m: x.m })));
    },
    scan: (on) => lan.scan(on),
    hosts: () => lan.hosts(),
    ip: () => lan.ip(),
    deviceName: () => lan.deviceName(),
    stop: () => { via = null; try { lan.stop(); } catch (e) { /* egal */ } pe.stop(); },
  };
}

export function netTransport() {
  if (/[?&]net=test/.test(location.search) && window.BroadcastChannel) return testTransport();
  const lan = androidTransport(), pe = peerTransport();
  if (lan && pe) return comboTransport(lan, pe);
  return lan || pe;
}


const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100, r4 = (v) => Math.round(v * 1e4) / 1e4;

// ------------------------------------------------------------ Mitspieler-Figur
export class Avatar {
  constructor(game, pid, name, team) {
    this.g = game; this.pid = pid; this.name = name; this.team = team;
    this.pos = new THREE.Vector3(); this.tgt = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0; this.stance = 0; this.alive = false; this.visible = false; this.speed = 0;
    this.wid = null;
    this.makeRig();
    // Namensschild (nur für Verbündete sichtbar)
    const c = document.createElement('canvas'); c.width = 256; c.height = 48;
    const x = c.getContext('2d'); x.font = 'bold 28px sans-serif'; x.textAlign = 'center'; x.fillStyle = 'rgba(0,0,0,0.5)'; x.fillRect(0, 6, 256, 36); x.fillStyle = team === 'us' ? '#cfe8b0' : '#d8dde4'; x.fillText(name, 128, 34);
    this.tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    this.tag.scale.set(2.4, 0.45, 1); this.tag.position.y = 2.25;
    this.rig.root.add(this.tag);
  }
  makeRig() {
    if (this.rig) this.rig.dispose();
    this.rig = new SoldierRig(uniformFor(this.g.op.id, this.team), this.wid || (this.team === 'us' ? 'garand' : 'kar98k'));
    this.g.scene.add(this.rig.root);
    if (this.tag) this.rig.root.add(this.tag);
  }
  chest(out) { return out.set(this.pos.x, this.pos.y + (this.stance === 2 ? 0.3 : this.stance === 1 ? 0.8 : 1.25), this.pos.z); }
  apply(s) {
    // [x,y,z,yaw,pitch,stance,wid,alive,team,chute]
    const team = s[8] ? 'de' : 'us';
    if (team !== this.team) { this.team = team; this.makeRig(); }
    this.tgt.set(s[0], s[1], s[2]);
    if (!this.visible || this.pos.distanceTo(this.tgt) > 10) this.pos.copy(this.tgt);
    this.tyaw = s[3]; this.pitch = s[4]; this.stance = s[5];
    const wid = WIDS[s[6]];
    if (wid && wid !== this.wid) { this.wid = wid; this.rig.setWeapon(wid); }
    const alive = !!s[7];
    this.downed = !!s[10];
    if (this.alive && !alive) this.deadT = 0;
    this.alive = alive; this.visible = true;
  }
  update(dt) {
    const r = this.rig;
    r.root.visible = this.visible;
    if (!this.visible) return;
    const old = this.pos.clone();
    this.pos.lerp(this.tgt, Math.min(1, dt * 12));
    this.speed = this.speed * 0.8 + (old.distanceTo(this.pos) / Math.max(dt, 1e-3)) * 0.2;
    this.yaw = lerpAngle(this.yaw, this.tyaw ?? this.yaw, Math.min(1, dt * 12));
    r.root.position.copy(this.pos); r.root.rotation.y = this.yaw;
    this.tag.visible = this.team === this.g.player.team && this.alive;
    // Feindliche Spieler (Gegeneinander): roter Punkt, wenn sichtbar
    if (!this.dot) { this.dot = new THREE.Sprite(markMat('red')); this.dot.center.set(0.5, 0); this.dot.scale.set(0.1, 0.1, 1); this.dot.position.y = 2.1; r.root.add(this.dot); }
    if (this.team !== this.g.player.team && this.alive && this.g.settings.markers !== false) {
      if (!this.dotT || this.g.time > this.dotT) { this.dotT = this.g.time + 0.4; const c = this.chest(new THREE.Vector3()); this.dotVis = this.g.world.los(this.g.camera.position, c) && !this.g.smokeBlocks(this.g.camera.position, c); }
      this.dot.visible = !!this.dotVis || (this.lastShot && this.g.time - this.lastShot < 3);
      const sc = ((22 + innerHeight * 0.012) * 2) / innerHeight; this.dot.scale.set(sc, sc, 1);
    } else this.dot.visible = false;
    if (this.alive) { r.setLod(0); r.pose(this.speed, this.stance, this.pitch, dt); }
    else { this.deadT = (this.deadT || 0) + dt; r.pose(0, 0, 0, dt, Math.min(1, this.deadT * 2)); }
  }
  dispose() { this.rig.dispose(); }
}

// ------------------------------------------------------------ Spielprotokoll
export class Net {
  constructor(game, tr) {
    this.g = game; this.tr = tr;
    this.mode = null;
    this.players = new Map();   // id -> { id, name, side, cls, k, d, score }
    this.ev = [];
    this.snapT = 0; this.sendT = 0; this.missionT = 0; this.plT = 0; this.n = 0;
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3();
  }
  get isHost() { return this.mode === 'host'; }

  host(name, info) {
    this.mode = 'host'; this.name = name; this.info = info;
    this.myId = 0;
    this.players.set(0, { id: 0, name, side: info.side, cls: info.cls, k: 0, d: 0, score: 0 });
    return this.tr.host(this.beacon());
  }
  beacon() { const i = this.info || {}; return { name: this.name, op: i.op, mode: i.mode, n: this.players.size || 1, v: 1 }; }
  join(target, port, name, side, cls) { this.mode = 'client'; this.name = name; this.wantSide = side; this.wantCls = cls; this.joinTarget = { ip: target, port }; this.tr.join(target, port); }
  send(o) { this.tr.send(this.isHost ? -1 : 0, o); }
  sendTo(p, o) { if (p === 0 && this.isHost) return; this.tr.send(p, o); }
  relay(from, m) { for (const id of this.players.keys()) if (id !== 0 && id !== from) this.sendTo(id, m); }
  stop() { try { this.tr.stop(); } catch (_) { /* egal */ } this.mode = null; }

  // ------------------------------------------------------------ Ereignisse (vom Spiel aufgerufen)
  playerState() {
    const p = this.g.player;
    return [r1(p.pos.x), r1(p.pos.y), r1(p.pos.z), r2(p.yaw), r2(p.pitch), p.stance, WIDS.indexOf(p.wid), p.alive ? 1 : 0, p.team === 'de' ? 1 : 0, p.chute ? 1 : 0, p.downed ? 1 : 0];
  }
  fire(o, d, wid, tracer) {
    const m = { t: 'ff', o: [r2(o.x), r2(o.y), r2(o.z)], d: [r4(d.x), r4(d.y), r4(d.z)], w: WIDS.indexOf(wid), tr: tracer ? 1 : 0, p: this.myId };
    this.send(m);
  }
  nade(o, v, wid) { this.send({ t: 'nd', o: [r2(o.x), r2(o.y), r2(o.z)], v: [r2(v.x), r2(v.y), r2(v.z)], w: wid, p: this.myId, s: this.g.player.team }); }
  aiShot(o, d, wid, tracer, team) { if (this.players.size > 1) this.ev.push(r1(o.x), r1(o.y), r1(o.z), r4(d.x), r4(d.y), r4(d.z), WIDS.indexOf(wid), (tracer ? 1 : 0) | (team === 'de' ? 2 : 0)); }
  nadeThrown(o, v, kind) { this.send({ t: 'nd', o: [r2(o.x), r2(o.y), r2(o.z)], v: [r2(v.x), r2(v.y), r2(v.z)], w: kind, ai: 1 }); }
  tankShot(t, mz, hit) { this.send({ t: 'tsh', m: [r1(mz.x), r1(mz.y), r1(mz.z)], h: [r1(hit.x), r1(hit.y), r1(hit.z)] }); }
  unitKilled() {}
  tankKilled() {}
  hitUnit(u, d, head, dir) { this.send({ t: 'hit', u: u.uid, d: Math.round(d), h: head ? 1 : 0, r: [r2(dir.x), r2(dir.z)] }); }
  hitPlayer(pid, d, head, dir) {
    const m = { t: 'phit', p: pid, d: Math.round(d), h: head ? 1 : 0, r: [r2(dir.x), r2(dir.z)], f: this.myId };
    if (this.isHost) this.onHost(0, m); else this.send(m);
  }

  // ------------------------------------------------------------ Hauptschleife
  update(dt) {
    const g = this.g;
    for (const { p, m } of this.tr.poll()) {
      try { this.isHost ? this.onHost(p, m) : this.onClient(m); } catch (e) { console.error('Netz', m && m.t, e); }
    }
    if (!g.netReady) return;
    if (this.isHost) {
      this.snapT -= dt;
      if (this.snapT <= 0) { this.snapT = 1 / 10; this.snapshot(); }
      this.missionT -= dt;
      if (this.missionT <= 0) { this.missionT = 1; this.send({ t: 'm', d: g.missions.toNet() }); }
      this.plT -= dt;
      if (this.plT <= 0) { this.plT = 3; this.sendPlayers(); }
    } else {
      this.sendT -= dt;
      if (this.sendT <= 0) { this.sendT = 1 / 15; this.send({ t: 'p', s: this.playerState() }); }
    }
    for (const a of g.avatars.values()) a.update(dt);
  }

  snapshot() {
    const g = this.g;
    this.n++;
    const P = [[0, this.playerState()]];
    for (const [pid, a] of g.avatars) if (a.last) P.push([pid, a.last]);
    const msg = { t: 's', T: r1(g.time), P, E: this.ev };
    if (this.n % 2 === 0) msg.U = g.units.snapshot();
    this.ev = [];
    this.send(msg);
  }
  sendPlayers() { this.send({ t: 'pl', l: [...this.players.values()] }); this.tr.info && this.tr.info(this.beacon()); }

  avatar(pid) {
    const g = this.g;
    let a = g.avatars.get(pid);
    if (!a) { const pl = this.players.get(pid); a = new Avatar(g, pid, pl ? pl.name : T('Spieler', 'Player'), pl ? pl.side : 'us'); g.avatars.set(pid, a); }
    return a;
  }
  dropAvatar(pid) { const a = this.g.avatars.get(pid); if (a) { a.dispose(); this.g.avatars.delete(pid); } }

  // Darstellung eines fremden Schusses
  renderShot(m, auth = false) {
    const g = this.g, W = WEAPONS[WIDS[m.w]] || WEAPONS.garand;
    this._a.set(m.o[0], m.o[1], m.o[2]); this._b.set(m.d[0], m.d[1], m.d[2]);
    const pl = this.players.get(m.p);
    const owner = { team: pl ? pl.side : 'us', pid: m.p };
    if (W.rocket) g.combat.rocket(this._a.clone(), this._b.clone(), W, owner, auth);
    else g.combat.fire(this._a, this._b, W, owner, auth, !!m.tr);
    g.effects.muzzle(this._a, this._b, W.id === 'mg42');
    g.audio.play(W.sound, this._a, 0.9, 1, { far: 900 });
    const av = g.avatars.get(m.p); if (av) av.lastShot = g.time;
  }

  // ------------------------------------------------------------ Host empfängt
  onHost(p, m) {
    const g = this.g;
    switch (m.t) {
      case '_join': break;
      case 'hello': {
        const name = String(m.name || T('Spieler', 'Player')).slice(0, 16);
        let side = g.mode === 'versus' ? (m.side === 'de' ? 'de' : 'us') : g.player.team;
        this.players.set(p, { id: p, name, side, cls: m.cls || 'rifle', k: 0, d: 0, score: 0 });
        this.sendTo(p, { t: 'welcome', id: p, op: g.op.id, mode: g.mode, opts: g.opts, side, time: g.time, ms: g.missions.toNet(), pl: [...this.players.values()], tgd: Object.values(g.world.targets).filter((x) => x.destroyed).map((x) => x.id) });
        this.sendPlayers();
        g.radio(T(`${name} ist dem Gefecht beigetreten.`, `${name} joined the battle.`), T('Funk', 'Radio'));
        this.avatar(p);
        break;
      }
      case 'chat': g.comms.onHostChat(p, m); break;
      case 'vid': if (typeof m.v === 'string' && m.v.length < 80) g.comms.setVid(p, m.v); break;
      case 'ptt': g.comms.onHostPtt(p, !!m.on); break;
      case '_leave': {
        g.comms.dropPlayer(p);
        const pl = this.players.get(p);
        this.players.delete(p);
        this.dropAvatar(p);
        this.sendPlayers();
        if (pl) g.radio(T(`${pl.name} hat das Gefecht verlassen.`, `${pl.name} left the battle.`), T('Funk', 'Radio'));
        break;
      }
      case 'p': { const a = this.avatar(p); a.last = m.s; a.apply(m.s); const pl = this.players.get(p); if (pl) pl.side = a.team; break; }
      case 'ff': this.renderShot(m, false); this.relay(p, m); break;
      case 'nd': {
        // Granate des Mitspielers: Host rechnet den Schaden
        this._a.set(m.o[0], m.o[1], m.o[2]); this._b.set(m.v[0], m.v[1], m.v[2]);
        const W = WEAPONS[m.w] || WEAPONS.mk2;
        g.combat.grenade(this._a.clone(), this._b.clone(), W.fuse, { team: m.s, pid: p }, true, m.w);
        this.relay(p, m);
        break;
      }
      case 'hit': {
        const u = g.units.byId.get(m.u);
        if (u && u.alive) { const pl = this.players.get(p); g.units.damage(u, Math.min(400, m.d), { team: pl ? pl.side : 'us', pid: p }, new THREE.Vector3(m.r[0], 0, m.r[1]), !!m.h); }
        break;
      }
      case 'phit': {
        const from = this.players.get(m.f ?? p);
        const msg = { t: 'pdmg', a: m.d, r: m.r, h: m.h, f: from ? from.name : '?', fp: m.f ?? p };
        if (m.p === 0) g.applyNetDamage(msg); else this.sendTo(m.p, msg);
        break;
      }
      case 'rev': { const u = g.units.byId.get(m.u); if (u && u.downed) g.units.revive(u, 55); break; }
      case 'rvp': {
        // ein Spieler verarztet einen anderen Spieler
        const from = this.players.get(p) || { name: g.playerName() };
        if (m.p === 0) g.revivePlayer(from.name); else this.sendTo(m.p, { t: 'revived', n: from.name });
        break;
      }
      case 'int': {
        const tg = g.world.targets[m.id];
        const pl = this.players.get(p);
        if (tg) g.missions.interact({ kind: m.k, tg }, pl ? pl.side : 'us');
        break;
      }
      case 'sup': { const pl = this.players.get(p); g.atmo.support(m.k, new THREE.Vector3(m.x, 0, m.z), pl ? pl.side : 'us'); break; }
      case 'tk': g.units.damageTankById && g.units.damageTankById(m.id, m.d); break;
      case 'died': { const pl = this.players.get(p); if (pl) { pl.d++; const k = this.players.get(m.k); if (k && k !== pl) { k.k++; k.score += 10; } } g.feed(m.kn || '?', pl ? pl.name : '?'); this.send({ t: 'kf', k: m.kn || '?', v: pl ? pl.name : '?' }); break; }
      case 'cls': { const pl = this.players.get(p); if (pl) { pl.cls = m.c; if (g.mode === 'versus' && (m.s === 'us' || m.s === 'de')) pl.side = m.s; } break; }
    }
  }

  // ------------------------------------------------------------ Client empfängt
  onClient(m) {
    const g = this.g;
    // bis die Karte geladen ist, nur Verbindungsnachrichten verarbeiten
    if (!g.netReady && !['_open', '_fail', '_leave', 'welcome', 'pl', 'chat', 'vids', 'ptt'].includes(m.t)) return;
    switch (m.t) {
      case '_open': this.send({ t: 'hello', name: this.name, side: this.wantSide, cls: this.wantCls }); g.onNetStatus(T('Verbunden – warte auf den Host …', 'Connected – waiting for host …')); break;
      case '_fail': g.onNetStatus(T('Kein Spiel gefunden – Code prüfen.', 'No game found – check the code.'), true); this.mode = null; break;
      case '_leave': g.onNetLost(); break;
      case 'welcome':
        this.myId = m.id;
        for (const pl of m.pl) this.players.set(pl.id, pl);
        g.startClient(m);
        break;
      case 'pl': this.players.clear(); for (const pl of m.l) this.players.set(pl.id, pl); break;
      case 's': this.applySnapshot(m); break;
      case 'm': g.missions.applyNet(m.d); break;
      case 'ff': if (m.p !== this.myId) this.renderShot(m, false); break;
      case 'nd': { if (m.p === this.myId) break; this._a.set(m.o[0], m.o[1], m.o[2]); this._b.set(m.v[0], m.v[1], m.v[2]); const W = WEAPONS[m.w] || WEAPONS.mk2; g.combat.grenade(this._a.clone(), this._b.clone(), m.ai ? 3.8 : W.fuse, { team: m.s }, false, m.w); break; }
      case 'sh': g.combat.shell(new THREE.Vector3(m.p[0], 0, m.p[1]), m.s, m.d, { team: 'none' }, false); break;
      case 'air': g.atmo.airVisual(m.p, m.d); break;
      case 'smk': for (let i = 0; i < 5; i++) setTimeout(() => g.world && g.effects.smokeGrenade(m.p[0] + (Math.random() - 0.5) * 40, g.world.h(m.p[0], m.p[1]), m.p[1] + (Math.random() - 0.5) * 40), 6000 + i * 500); break;
      case 'tsh': { const mz = new THREE.Vector3(...m.m), h = new THREE.Vector3(...m.h); g.effects.muzzle(mz, h.clone().sub(mz).normalize(), true); g.audio.play('cannon', mz, 1, 1, { far: 1500 }); setTimeout(() => g.world && g.combat.explode(h, 160, 6, { team: 'none' }, false, 2), (mz.distanceTo(h) / 750) * 1000); break; }
      case 'chg': { const tg = g.world.targets[m.id]; if (tg) { tg.charging = false; g.missions.placeCharge(tg, g.player.team === 'us' ? 'none' : 'none', false); } break; }
      case 'tgd': { const tg = g.world.targets[m.id]; if (tg && !tg.destroyed) { if (tg.kind === 'flag') g.missions.raiseFlag(tg); else g.missions.destroyTarget(tg, 'none'); } break; }
      case 'pdmg': g.applyNetDamage(m); break;
      case 'revived': g.revivePlayer(String(m.n || '?').slice(0, 20)); break;
      case 'rvu': { const u = g.units.byId.get(m.u); if (u && u.pool) { g.scene.remove(u.pool); u.pool = null; } break; }
      case 'chat': g.comms.onClientChat(m); break;
      case 'vids': g.comms.onVids(m.l); break;
      case 'ptt': g.comms.onPtt(m.p, !!m.on, String(m.n || '').slice(0, 16)); break;
      case 'kf': g.feed(m.k, m.v); break;
      case 'result': g.missions.finish(m.w, m.r); break;
      case 'radio': g.radio(m.x, m.f, !!m.u); break;
    }
  }

  applySnapshot(m) {
    const g = this.g;
    g.time = Math.max(g.time, m.T);
    if (m.U) g.units.applySnapshot(m.U);
    const seen = new Set();
    for (const [pid, st] of m.P || []) {
      if (pid === this.myId) continue;
      seen.add(pid);
      this.avatar(pid).apply(st);
    }
    for (const [pid, a] of g.avatars) if (!seen.has(pid)) a.visible = false;
    const E = m.E || [];
    for (let k = 0; k < E.length; k += 8) {
      this._a.set(E[k], E[k + 1], E[k + 2]); this._b.set(E[k + 3], E[k + 4], E[k + 5]);
      const W = WEAPONS[WIDS[E[k + 6]]] || WEAPONS.kar98k;
      g.combat.fire(this._a, this._b, W, { team: E[k + 7] & 2 ? 'de' : 'us', uid: -1 }, false, !!(E[k + 7] & 1));
      if (g.camera.position.distanceTo(this._a) < 250) { g.effects.muzzle(this._a, this._b, W.id === 'mg42', false); g.audio.play(W.sound, this._a, 0.8, 1, { far: 900 }); }
    }
  }
}
