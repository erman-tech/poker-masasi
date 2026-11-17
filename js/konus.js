// Kısa Türkçe seslendirme (cihazın kendi sesi; internet gerekmez, iPhone/iPad'de Türkçe ses yüklüdür).
// Yalnız Novo masasında: kasanın eli, sigorta ve ödemeler. Menüden kapatılabilir.
const ANAHTAR = 'poker.konusma';

export function acikMi() {
  try { return localStorage.getItem(ANAHTAR) !== '0'; } catch (e) { return true; }
}
export function ayarla(acik) {
  try { localStorage.setItem(ANAHTAR, acik ? '1' : '0'); } catch (e) {}
  if (!acik) dur();
}

function destek() { return typeof window !== 'undefined' && 'speechSynthesis' in window; }

let ses = null;
function sesSec() {
  if (ses || !destek()) return ses;
  const hepsi = speechSynthesis.getVoices();
  const tr = hepsi.filter(v => (v.lang || '').toLowerCase().startsWith('tr'));
  ses = tr.find(v => /yelda|female|kadın|filiz|seda/i.test(v.name)) || tr[0] || null;
  return ses;
}
if (destek()) speechSynthesis.onvoiceschanged = () => { ses = null; sesSec(); };

// iOS ilk konuşmayı bir dokunuşun içinde ister
let kilitAcik = false;
export function kilidiAc() {
  if (kilitAcik || !destek()) return;
  kilitAcik = true;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  speechSynthesis.speak(u);
}

export function konus(metin) {
  if (!metin || !acikMi() || !destek()) return;
  const u = new SpeechSynthesisUtterance(metin);
  u.lang = 'tr-TR';
  const v = sesSec();
  if (v) u.voice = v;
  u.rate = 1.05;
  u.pitch = 1.1;
  speechSynthesis.speak(u);
}

export function dur() { if (destek()) speechSynthesis.cancel(); }

// "$350" yerine "350 dolar"
export function dolar(n) { return `${Math.round(n)} dolar`; }

// Elin söylenişi
const SOYLE = {
  0: 'yüksek kart', AK: 'as papaz', AKQ: 'as papaz kız', SAHTE: 'sahte renk', 1: 'per', 2: 'iki per',
  3: 'üçlü', 4: 'kent', 5: 'renk', 6: 'full house', 7: 'kare', SF: 'renkli kent', RF: 'royal flush',
};
export function elSoyle(anahtar) { return SOYLE[anahtar] ?? ''; }
