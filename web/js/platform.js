// Einstellungen, Statistik, Kampagnenfortschritt, Versionsinfo und Android-Brücke
const SKEY = 'n44.settings.v1';
const STKEY = 'n44.stats.v1';
const CKEY = 'n44.campaign.v1';

export const isApp = typeof window.AndroidApp !== 'undefined';
export const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && window.innerWidth < 1100);

function read(key) { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } }
function write(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (_) { /* privater Modus */ } }

// Grafikstufen: minimal (Android TV, sehr schwache Geräte), low, medium, high, ultra
export const QUALITY = ['minimal', 'low', 'medium', 'high', 'ultra'];

export function detectTv() {
  let tv = /Android TV|AFT[A-Z]|BRAVIA|SMART-TV|SmartTV|GoogleTV|\bTV\b/i.test(navigator.userAgent);
  try { if (window.AndroidApp && window.AndroidApp.isTv) tv = tv || !!window.AndroidApp.isTv(); } catch (_) { /* ältere App */ }
  return tv;
}

export function loadSettings() {
  const d = {
    quality: isMobile ? 'medium' : 'high', renderScale: 1, viewDist: 1, shadows: 'auto', effects: 'auto', grass: true, postfx: true,
    volume: 0.8, music: 0.5, sensitivity: 1, invertY: false, difficulty: 1, showFps: false, fov: 70, tts: true, openMic: false,
    lang: null, name: '', aimAssist: isMobile ? 'light' : 'off', gyro: false, gyroSens: 1, binds: null, hints: true,
  };
  const s = Object.assign(d, read(SKEY) || {});
  if (!s.tvQ) { s.tvQ = true; if (detectTv()) s.quality = 'minimal'; write(SKEY, s); }
  return s;
}
export const saveSettings = (s) => write(SKEY, s);

export function loadStats() {
  return Object.assign({ score: 0, missions: 0, kills: 0, deaths: 0, shots: 0, hits: 0, time: 0 }, read(STKEY) || {});
}
export const saveStats = (s) => write(STKEY, s);

// Kampagne: je Seite die höchste freigeschaltete Mission und Bestwertungen
export function loadCampaign() {
  return Object.assign({ us: { unlocked: 0, best: {} }, de: { unlocked: 0, best: {} } }, read(CKEY) || {});
}
export const saveCampaign = (c) => write(CKEY, c);

const RANKS = {
  us: [[0, 'Private'], [800, 'Private First Class'], [2000, 'Corporal'], [4000, 'Sergeant'], [7000, 'Staff Sergeant'], [11000, 'Second Lieutenant'], [16000, 'First Lieutenant'], [24000, 'Captain']],
  de: [[0, 'Grenadier'], [800, 'Gefreiter'], [2000, 'Obergefreiter'], [4000, 'Unteroffizier'], [7000, 'Feldwebel'], [11000, 'Leutnant'], [16000, 'Oberleutnant'], [24000, 'Hauptmann']],
};
export function rankFor(score, side = 'us') {
  let r = RANKS[side][0][1];
  for (const [s, n] of RANKS[side]) if (score >= s) r = n;
  return r;
}

export async function fetchVersion() {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    return r.ok ? await r.json() : null;
  } catch (_) { return null; }
}
export function appVersion() { try { return isApp ? window.AndroidApp.getVersionName() : null; } catch (_) { return null; } }
export function appCheckUpdate() { try { if (isApp) window.AndroidApp.checkForUpdates(); } catch (_) { /* egal */ } }

export function enterFullscreen() {
  if (isApp) return;
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen && isMobile) {
      el.requestFullscreen({ navigationUI: 'hide' }).then(() => {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      }).catch(() => {});
    }
  } catch (_) { /* nicht unterstützt */ }
}
