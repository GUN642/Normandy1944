// Zweisprachigkeit: Texte stehen direkt im Code als T('deutsch', 'english').
let lang = 'de';
try {
  const s = JSON.parse(localStorage.getItem('n44.settings.v1') || 'null');
  lang = (s && s.lang) || (/^de/i.test(navigator.language || 'de') ? 'de' : 'en');
} catch (_) { /* ohne Speicher */ }
export const getLang = () => lang;
export function setLang(l) { lang = l === 'en' ? 'en' : 'de'; document.documentElement.lang = lang; }
export const T = (de, en) => (lang === 'en' && en != null ? en : de);
// Objekt { de, en } oder einfacher Text
export const L = (o) => (o == null ? '' : typeof o === 'string' ? o : lang === 'en' && o.en ? o.en : o.de);
