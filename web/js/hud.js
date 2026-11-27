// HUD: Kompass, Minikarte, Ziele, Munition, Funk, Trefferanzeige, Schadensrichtung, Zielfernrohr, Funkmenü, Lage
import * as THREE from './lib/three.module.min.js';
import { WEAPONS, CLASSES } from './weapons.js';
import { T, L } from './i18n.js';
import { esc, fmtTime, headingFromYaw, clamp } from './util.js';
import { SIZE, HALF } from './world.js';

const $ = (id) => document.getElementById(id);
const _v = new THREE.Vector3();

export class Hud {
  constructor(game) {
    this.g = game;
    this.el = {};
    for (const id of ['hud', 'hp-fill', 'hp-val', 'stance', 'w-name', 'w-ammo', 'w-nade', 'w-band', 'obj-title', 'obj-text', 'obj-sub', 'radio-log', 'feed', 'hint', 'toast', 'warn', 'hitm', 'dmgdir', 'vig', 'scope', 'xhair', 'prog', 'prog-fill', 'respawn', 'resp-text', 'scoreboard', 'radiomenu', 'mapview', 'obj-marker', 'fps', 'flash', 'chat-log', 'compass', 'minimap']) this.el[id] = $(id);
    this.cmp = this.el.compass.getContext('2d');
    this.mm = this.el.minimap.getContext('2d');
    this.radioLines = [];
    this.toastT = 0; this.warnT = 0; this.hitT = 0; this.flashT = 0;
    this.dmgs = [];
    this.fpsAcc = 0; this.fpsN = 0;
  }

  show(on) { this.el.hud.classList.toggle('hidden', !on); }

  // ------------------------------------------------------------ Meldungen
  radio(text, from, urgent) {
    const line = document.createElement('div');
    line.className = 'rl' + (urgent ? ' urgent' : '');
    line.innerHTML = `<b>${esc(from || T('Funk', 'Radio'))}:</b> ${esc(text)}`;
    this.el['radio-log'].appendChild(line);
    while (this.el['radio-log'].children.length > 4) this.el['radio-log'].firstChild.remove();
    setTimeout(() => line.classList.add('old'), 11000);
    setTimeout(() => line.remove(), 16000);
  }
  chat(name, text, mine) {
    const line = document.createElement('div');
    line.className = 'cl' + (mine ? ' mine' : '');
    line.innerHTML = `<b>${name}:</b> ${text}`;
    this.el['chat-log'].appendChild(line);
    while (this.el['chat-log'].children.length > 6) this.el['chat-log'].firstChild.remove();
    setTimeout(() => line.remove(), 20000);
  }
  feed(killer, victim, head) {
    const line = document.createElement('div');
    line.innerHTML = `${esc(killer)} <span>${head ? '✸' : '✕'}</span> ${esc(victim)}`;
    this.el.feed.appendChild(line);
    while (this.el.feed.children.length > 4) this.el.feed.firstChild.remove();
    setTimeout(() => line.remove(), 6000);
  }
  toast(t) { this.el.toast.textContent = t; this.el.toast.classList.add('on'); this.toastT = 2.6; }
  warn(t) { this.el.warn.textContent = t; this.el.warn.classList.add('on'); this.warnT = 2.2; }
  hit(head, kill) { this.el.hitm.className = 'on' + (head ? ' head' : '') + (kill ? ' kill' : ''); this.hitT = kill ? 0.4 : 0.18; }
  damage(dirAngle, amount) { this.dmgs.push({ a: dirAngle, t: 1.4, k: clamp(amount / 40, 0.3, 1) }); this.flashT = Math.max(this.flashT, clamp(amount / 60, 0.15, 0.6)); }

  // ------------------------------------------------------------ Pro Frame
  update(dt) {
    const g = this.g, p = g.player, el = this.el;
    // FPS
    if (g.settings.showFps) {
      this.fpsAcc += dt; this.fpsN++;
      if (this.fpsAcc > 0.5) { el.fps.textContent = Math.round(this.fpsN / this.fpsAcc) + ' FPS · ' + g.renderer.info.render.calls + ' DC'; this.fpsAcc = 0; this.fpsN = 0; }
      el.fps.classList.remove('hidden');
    } else el.fps.classList.add('hidden');
    // Gesundheit
    el['hp-fill'].style.width = Math.max(0, p.hp) + '%';
    el['hp-fill'].className = p.hp < 30 ? 'crit' : p.hp < 60 ? 'warn' : '';
    el['hp-val'].textContent = Math.max(0, Math.round(p.hp));
    el.stance.textContent = p.chute ? '🪂' : p.climbing ? '🧗' : ['▮', '▄', '▁'][p.stance];
    // Waffe
    const W = p.W, A = p.ammo[p.wid];
    const tk = p.tank && g.crew ? g.crew.hudText() : null;
    if (tk) { el['w-name'].textContent = tk.name; el['w-ammo'].innerHTML = tk.ammo; }
    else {
      el['w-name'].textContent = W.name + (W.cal ? ' · ' + W.cal : '');
      const h = W.heat ? (p.heat[p.wid] || 0) : 0;
      const heatBar = W.heat ? `<span class="heat${p.jammed[p.wid] ? ' jam' : h > 0.75 ? ' hot' : ''}" title="${T('Laufhitze', 'Barrel heat')}"><i style="width:${Math.round(h * 100)}%"></i></span>` : '';
      el['w-ammo'].innerHTML = (W.grenade ? `${A.res}` : `<b>${A.mag}</b> / ${A.res}` + (p.reloading > 0 ? ` <i>${p.swapping ? T('Laufwechsel', 'barrel change') : T('lädt', 'reloading')}</i>` : '')) + heatBar;
    }
    const nid = p.weapons.find((w) => WEAPONS[w].grenade);
    el['w-nade'].textContent = nid ? '◉ ' + p.ammo[nid].res : '';
    el['w-band'].textContent = '✚ ' + p.bandages;
    // Ziel
    const ms = g.missions, side = p.team;
    const st = ms.state[side], o = ms.obj(side);
    if (o) {
      el['obj-text'].textContent = L(o.text);
      let sub = '';
      if (o.type === 'defend' || o.type === 'survive') sub = '⏱ ' + fmtTime(st.timer || o.time) + (st.lose > 3 ? '  ⚠ ' + T('Feind dringt ein!', 'Enemy breaking in!') : '');
      else if (o.type === 'destroy') { const n = o.targets.filter((id) => g.world.targets[id] && g.world.targets[id].destroyed).length; sub = `${n} / ${o.targets.length}`; }
      else if (o.type === 'regroup') sub = `${st.found} / ${o.n}`;
      else if (o.type === 'kill') sub = `${st.kills} / ${o.n}`;
      else if (o.type === 'clear') sub = T('Feinde im Gebiet: ', 'Enemies in area: ') + Math.round(st.prog);
      const mk = ms.markers(side)[0];
      if (mk) sub += (sub ? '  ·  ' : '') + Math.round(Math.hypot(mk.x - p.pos.x, mk.z - p.pos.z)) + ' m';
      el['obj-sub'].textContent = sub;
      el['obj-title'].textContent = T('Ziel', 'Objective') + ` ${st.i + 1}/${g.op[side].objectives.length}`;
    } else { el['obj-text'].textContent = T('Alle Ziele erfüllt', 'All objectives complete'); el['obj-sub'].textContent = ''; }
    // Meldungen ausblenden
    if ((this.toastT -= dt) <= 0) el.toast.classList.remove('on');
    if ((this.warnT -= dt) <= 0) el.warn.classList.remove('on');
    if ((this.hitT -= dt) <= 0) el.hitm.className = '';
    // Fadenkreuz: nur ohne Zielen, Größe nach Streuung
    const spread = (W.spread ? W.spread[0] : 20) * (1 + Math.min(1, p.speed / 3.5) * 1.5) * (p.stance === 2 ? 0.55 : p.stance === 1 ? 0.75 : 1);
    el.xhair.style.setProperty('--s', Math.round(8 + spread * 0.5) + 'px');
    el.xhair.style.opacity = p.tank ? (p.ads > 0.6 && p.seat === 0 ? 0 : 0.9) : p.ads > 0.4 || p.sprinting || !p.alive || g.thirdPerson ? 0 : 0.85;
    // Zielfernrohr
    const tsight = p.tank && p.seat === 0 && p.ads > 0.6;
    const sc = (W.scope && p.ads > 0.92 && !p.tank) || tsight;
    el.scope.classList.toggle('on', !!sc);
    el.scope.dataset.kind = tsight ? 'tank' : W.scope || '';
    // Unterdrückung / Verletzung: Vignette
    const vig = Math.max(p.suppress * 0.75, p.hp < 40 ? (40 - p.hp) / 50 : 0);
    el.vig.style.opacity = vig.toFixed(2);
    this.flashT = Math.max(0, this.flashT - dt * 1.5);
    el.flash.style.opacity = this.flashT.toFixed(2);
    // Schadensrichtung
    let html = '';
    for (let i = this.dmgs.length - 1; i >= 0; i--) {
      const d = this.dmgs[i];
      d.t -= dt;
      if (d.t <= 0) { this.dmgs.splice(i, 1); continue; }
      const rel = d.a - p.yaw;
      html += `<div class="dd" style="transform: rotate(${(-rel * 180 / Math.PI).toFixed(1)}deg); opacity:${(Math.min(1, d.t) * d.k).toFixed(2)}"></div>`;
    }
    el.dmgdir.innerHTML = html;
    // Interaktion (E)
    const act = g.interactHint;
    el.hint.textContent = act ? act.text : p.nearRope && p.nearRope() && !p.climbing ? T('Vorwärts / E: am Seil hochklettern', 'Forward / E: climb the rope') : '';
    el.prog.classList.toggle('on', !!(g.holdE > 0 && act));
    if (act) el['prog-fill'].style.width = Math.min(100, (g.holdE / act.time) * 100) + '%';
    this.drawCompass();
    this.mmT = (this.mmT || 0) - dt;
    if (this.mmT <= 0) { this.mmT = 0.1; this.drawMinimap(); }
    this.objMarker();
  }

  // Bildschirm-Markierung des Ziels
  objMarker() {
    const g = this.g, el = this.el['obj-marker'];
    const mk = g.missions.markers(g.player.team);
    if (!mk.length || !g.player.alive) { el.style.display = 'none'; return; }
    _v.copy(mk[0]); _v.y += 2;
    _v.project(g.camera);
    if (_v.z > 1) { el.style.display = 'none'; return; }
    el.style.display = 'block';
    const x = clamp((_v.x * 0.5 + 0.5) * innerWidth, 30, innerWidth - 30), y = clamp((-_v.y * 0.5 + 0.5) * innerHeight, 60, innerHeight - 60);
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.querySelector('span').textContent = Math.round(g.player.pos.distanceTo(mk[0])) + ' m';
  }

  drawCompass() {
    const g = this.g, c = this.cmp, cv = this.el.compass;
    const W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H);
    const hdg = headingFromYaw(g.player.yaw);
    const ppd = W / 120;   // Pixel pro Grad (120° sichtbar)
    c.fillStyle = 'rgba(20,18,14,0.45)'; c.fillRect(0, 0, W, H);
    c.font = 'bold 14px "Courier New", monospace'; c.textAlign = 'center';
    for (let d = Math.floor((hdg - 60) / 5) * 5; d <= hdg + 60; d += 5) {
      const x = W / 2 + (d - hdg) * ppd;
      const dd = ((d % 360) + 360) % 360;
      c.strokeStyle = '#e8dfc4'; c.lineWidth = dd % 45 === 0 ? 2 : 1;
      c.beginPath(); c.moveTo(x, H - (dd % 15 === 0 ? 12 : 6)); c.lineTo(x, H); c.stroke();
      if (dd % 45 === 0) { c.fillStyle = dd === 0 ? '#ffb0a0' : '#e8dfc4'; c.fillText(['N', T('NO', 'NE'), T('O', 'E'), T('SO', 'SE'), 'S', 'SW', 'W', 'NW'][dd / 45], x, 16); }
      else if (dd % 15 === 0) { c.fillStyle = '#a89f88'; c.font = '11px monospace'; c.fillText(String(dd), x, 15); c.font = 'bold 14px "Courier New", monospace'; }
    }
    // Ziel
    for (const mk of g.missions.markers(g.player.team)) {
      const b = (Math.atan2(mk.x - g.player.pos.x, -(mk.z - g.player.pos.z)) * 180 / Math.PI + 360) % 360;
      let rel = ((b - hdg + 540) % 360) - 180;
      const x = W / 2 + clamp(rel, -58, 58) * ppd;
      c.fillStyle = '#ffd34d'; c.beginPath(); c.moveTo(x, H - 2); c.lineTo(x - 6, H - 12); c.lineTo(x + 6, H - 12); c.closePath(); c.fill();
    }
    c.fillStyle = '#fff'; c.fillRect(W / 2 - 1, 0, 2, H);
  }

  drawMinimap() {
    const g = this.g, c = this.mm, cv = this.el.minimap, p = g.player;
    const S = cv.width, R = 120;   // Ausschnitt ±120 m
    const k = S / (R * 2);
    c.save();
    c.clearRect(0, 0, S, S);
    c.beginPath(); c.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); c.clip();
    c.translate(S / 2, S / 2);
    c.rotate(p.yaw);
    c.translate(-S / 2, -S / 2);
    const src = g.world.minimap, sk = src.width / SIZE;
    c.globalAlpha = 0.9;
    c.drawImage(src, (p.pos.x - R + HALF) * sk, (p.pos.z - R + HALF) * sk, R * 2 * sk, R * 2 * sk, 0, 0, S, S);
    c.globalAlpha = 1;
    const dot = (x, z, col, r = 3) => { const sx = S / 2 + (x - p.pos.x) * k, sz = S / 2 + (z - p.pos.z) * k; c.fillStyle = col; c.beginPath(); c.arc(sx, sz, r, 0, 7); c.fill(); };
    // Verbündete (KI grün), gesichtete Feinde (rot, wenn sie kürzlich geschossen haben und nah sind)
    for (const u of g.units.list) {
      if (!u.alive) continue;
      if (Math.abs(u.pos.x - p.pos.x) > R || Math.abs(u.pos.z - p.pos.z) > R) continue;
      if (u.team === p.team) dot(u.pos.x, u.pos.z, u.lost ? '#ffd34d' : '#8fd06a', 2.5);
      else if (u.lastShot && g.time - u.lastShot < 2 && u.pos.distanceTo(p.pos) < 90) dot(u.pos.x, u.pos.z, '#ff5040', 2.5);
    }
    for (const a of g.avatars.values()) if (a.visible && a.alive && a.team === p.team) dot(a.pos.x, a.pos.z, '#7fd0ff', 3.5);
    // eigene Panzer (leere zum Einsteigen als Quadrat)
    for (const t of g.units.tanks) {
      if (!t.alive || t.team !== p.team || Math.abs(t.pos.x - p.pos.x) > R || Math.abs(t.pos.z - p.pos.z) > R) continue;
      const sx = S / 2 + (t.pos.x - p.pos.x) * k, sz = S / 2 + (t.pos.z - p.pos.z) * k;
      c.fillStyle = t.abandoned && !(t.crew && (t.crew[0] !== null || t.crew[1] !== null)) ? '#ffd34d' : '#8fd06a';
      c.fillRect(sx - 4, sz - 4, 8, 8); c.strokeStyle = '#000a'; c.lineWidth = 1; c.strokeRect(sx - 4, sz - 4, 8, 8);
    }
    for (const mk of g.missions.markers(p.team)) dot(mk.x, mk.z, '#ffd34d', 5);
    c.restore();
    // Spielerpfeil
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(S / 2, S / 2 - 7); c.lineTo(S / 2 - 5, S / 2 + 5); c.lineTo(S / 2 + 5, S / 2 + 5); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(232,223,196,0.6)'; c.lineWidth = 2; c.beginPath(); c.arc(S / 2, S / 2, S / 2 - 1, 0, 7); c.stroke();
    c.fillStyle = '#ffb0a0'; c.font = 'bold 12px sans-serif'; c.textAlign = 'center';
    c.fillText('N', S / 2 + Math.sin(p.yaw) * (S / 2 - 9), S / 2 - Math.cos(p.yaw) * (S / 2 - 9) + 4);
  }

  // Große Lagekarte (Taste M)
  drawMap(on) {
    const el = this.el.mapview;
    el.classList.toggle('hidden', !on);
    if (!on) return;
    const g = this.g, cv = el.querySelector('canvas'), c = cv.getContext('2d');
    const S = cv.width, k = S / SIZE;
    c.drawImage(g.world.minimap, 0, 0, S, S);
    for (const [name, a] of Object.entries(g.world.anchors)) {
      if (/^pt\d|^_|jump|start2|boat|dzE/.test(name)) continue;
    }
    const mk = g.missions.markers(g.player.team);
    for (const m of mk) { c.strokeStyle = '#ffd34d'; c.lineWidth = 3; c.beginPath(); c.arc((m.x + HALF) * k, (m.z + HALF) * k, 9, 0, 7); c.stroke(); }
    for (const u of g.units.list) if (u.alive && u.team === g.player.team) { c.fillStyle = '#8fd06a'; c.fillRect((u.pos.x + HALF) * k - 1.5, (u.pos.z + HALF) * k - 1.5, 3, 3); }
    for (const a of g.avatars.values()) if (a.visible && a.team === g.player.team) { c.fillStyle = '#7fd0ff'; c.beginPath(); c.arc((a.pos.x + HALF) * k, (a.pos.z + HALF) * k, 4, 0, 7); c.fill(); }
    const p = g.player;
    c.save(); c.translate((p.pos.x + HALF) * k, (p.pos.z + HALF) * k); c.rotate(-p.yaw);
    c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -9); c.lineTo(-6, 6); c.lineTo(6, 6); c.closePath(); c.fill(); c.restore();
    c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(0, S - 26, S, 26);
    c.fillStyle = '#e8dfc4'; c.font = '14px sans-serif'; c.fillText(L(g.op.place) + ' · ' + L(g.op.date) + ' ' + g.op.time, 10, S - 8);
  }

  scoreboard(on) {
    const el = this.el.scoreboard;
    el.classList.toggle('hidden', !on);
    if (!on) return;
    const g = this.g;
    const rows = [];
    if (g.net && g.netReady) for (const pl of g.net.players.values()) rows.push(pl);
    else rows.push({ name: g.playerName(), side: g.player.team, cls: g.player.cls, k: g.stats.kills - g.statsStart.kills, d: g.stats.deaths - g.statsStart.deaths, score: g.session.score });
    const us = g.units.countAlive('us'), de = g.units.countAlive('de');
    el.innerHTML = `<h3>${esc(L(g.op.title))}</h3><div class="sbs"><span class="us">${T('Amerikaner', 'Americans')}: ${us}</span><span class="de">${T('Deutsche', 'Germans')}: ${de}</span></div>` +
      `<table><tr><th>${T('Name', 'Name')}</th><th>${T('Seite', 'Side')}</th><th>${T('Klasse', 'Class')}</th><th>K</th><th>T</th><th>${T('Punkte', 'Score')}</th></tr>` +
      rows.map((r) => `<tr><td>${esc(r.name)}</td><td>${r.side === 'us' ? 'US' : 'DE'}</td><td>${esc(L((CLASSES[r.cls] || CLASSES.rifle).name))}</td><td>${r.k || 0}</td><td>${r.d || 0}</td><td>${r.score || 0}</td></tr>`).join('') + '</table>' +
      `<p class="sbt">⏱ ${fmtTime(g.missions.t)}</p>`;
  }

  radioMenu(on, items) {
    const el = this.el.radiomenu;
    el.classList.toggle('hidden', !on);
    if (!on) return;
    el.innerHTML = `<h4>📻 ${T('Funk – Unterstützung anfordern', 'Radio – request support')}</h4>` + items.map((it, i) => `<button data-i="${i}" class="${it.ready ? '' : 'cd'}"><b>${i + 1}</b> ${esc(it.label)}${it.ready ? '' : ` <i>${it.wait}s</i>`}</button>`).join('') + `<p>${T('Ziel: Punkt im Fadenkreuz (max. 400 m). Esc/F schließt.', 'Target: point under the crosshair (max 400 m). Esc/F closes.')}</p>`;
  }

  respawn(on, text) { this.el.respawn.classList.toggle('hidden', !on); if (on) this.el['resp-text'].innerHTML = text; }
}
