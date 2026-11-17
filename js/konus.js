// Kasanın sesi: Elif (kurpiye görselleri hayali; ses Elif'in onayıyla). Cümleler kısa parçalardan kurulur (sesler/elif/<parça>.mp3).
// Kayıtlar varsa yalnız Elif konuşur (kaydı olmayan parça atlanır); hiç kayıt yoksa cihazın Türkçe sesi. Kayıtlar offline önbellekte durur; internet gerekmez.
const ANAHTAR = 'poker.konusma';
const KLASOR = 'sesler/elif/';

// Parça -> söylenecek metin (kayıt listesi de buradan üretilir)
export const PARCALAR = {
  kasa_bos: 'Kasa boş, ante ödeme.',
  kasa_kart_cekti: 'Kasa kart çekti,', oldu: 'oldu.', yine_bos: 'yine boş.',
  sigortadan: 'sigortadan', dolar_kazanir: 'dolar kazanır.', sigortayi_kaybetti: 'sigortayı kaybetti.',
  dolar_odeme: 'dolar ödeme.', kat_odeme: 'kat ödeme.', tebrikler: 'Tebrikler', ve: 've',
  kaybetti: 'kaybetti.', berabere: 'berabere.', ante_yandi: 'ante yandı.',
  bonus_odeme: 'bonus ödeme,', dealer_change: 'Dealer change.', dolar: 'dolar.', seslendirme_acik: 'Seslendirme açık.',
  // kasanın açtığı el
  kasa_AK: 'Kasa as papaz.', kasa_1: 'Kasa per.', kasa_2: 'Kasa iki per.', kasa_3: 'Kasa üçlü.',
  kasa_4: 'Kasa kent.', kasa_5: 'Kasa renk.', kasa_6: 'Kasa full house.', kasa_7: 'Kasa kare.',
  kasa_SF: 'Kasa renkli kent.', kasa_RF: 'Kasa royal flush.',
  // el adları
  el_AK: 'as papaz', el_AKQ: 'as papaz kız', el_SAHTE: 'sahte renk', el_SURAT: 'beş surat', el_1: 'per', el_2: 'iki per',
  el_3: 'üçlü', el_4: 'kent', el_5: 'renk', el_6: 'full house', el_7: 'kare', el_SF: 'renkli kent', el_RF: 'royal flush',
  // adlar
  ad_erman: 'Erman', ad_emrah: 'Emrah', ad_fidan: 'Fidan',
  // sayılar
  n_1: 'bir', n_2: 'iki', n_3: 'üç', n_4: 'dört', n_5: 'beş', n_6: 'altı', n_7: 'yedi', n_8: 'sekiz', n_9: 'dokuz',
  n_10: 'on', n_20: 'yirmi', n_30: 'otuz', n_40: 'kırk', n_50: 'elli', n_60: 'altmış', n_70: 'yetmiş',
  n_80: 'seksen', n_90: 'doksan', n_100: 'yüz', n_1000: 'bin',
};

export function acikMi() {
  try { return localStorage.getItem(ANAHTAR) !== '0'; } catch (e) { return true; }
}
export function ayarla(acik) {
  try { localStorage.setItem(ANAHTAR, acik ? '1' : '0'); } catch (e) {}
  if (!acik) dur();
}

// --- parçalar ---
const trKucuk = s => s.toLocaleLowerCase('tr').replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ç/g, 'c')
  .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/[^a-z0-9]/g, '');
export const ad = isim => ({ anahtar: 'ad_' + trKucuk(isim), metin: isim });
export const el = a => 'el_' + a;
export const kasaEl = a => 'kasa_' + a;

// 1250 -> bin iki yüz elli
export function sayi(n) {
  n = Math.round(n);
  const p = [];
  const yaz = x => {
    const b = Math.floor(x / 1000), y = Math.floor((x % 1000) / 100), o = Math.floor((x % 100) / 10), r = x % 10;
    if (b) { if (b > 1) yaz(b); p.push('n_1000'); }
    if (y) { if (y > 1) p.push('n_' + y); p.push('n_100'); }
    if (o) p.push('n_' + o * 10);
    if (r) p.push('n_' + r);
  };
  if (n > 0) yaz(n);
  return p;
}

const metinOf = x => (typeof x === 'string' ? PARCALAR[x] ?? x : x.metin);
const anahtarOf = x => (typeof x === 'string' ? x : x.anahtar);
export function metin(parcalar) { return parcalar.flat().map(metinOf).join(' ').replace(/ ([,.!])/g, '$1'); }

// --- Elif'in kayıtları ---
let ctx = null;
let kayitli = null;          // Set: liste.json'daki parçalar
const tampon = new Map();     // parça -> AudioBuffer
let siraSonu = 0;
let konusmaDinleyici = null;
// Konuşma başlayınca (ms cinsinden süre) haber ver: kurpiyenin ağzı oynasın
export function konusmaDinle(fn) { konusmaDinleyici = fn; }

async function listeYukle() {
  if (kayitli) return kayitli;
  try {
    const r = await fetch(KLASOR + 'liste.json');
    kayitli = new Set(r.ok ? await r.json() : []);
  } catch (e) { kayitli = new Set(); }
  return kayitli;
}
async function tamponAl(k) {
  if (tampon.has(k)) return tampon.get(k);
  const r = await fetch(KLASOR + k + '.mp3');
  const b = await ctx.decodeAudioData(await r.arrayBuffer());
  tampon.set(k, b);
  return b;
}

export function kilidiAc() {
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) {}
  if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); }
  listeYukle();
}

// --- cihaz sesi (yedek) ---
let ses = null;
function sesSec() {
  if (ses || !('speechSynthesis' in window)) return ses;
  const tr = speechSynthesis.getVoices().filter(v => (v.lang || '').toLowerCase().startsWith('tr'));
  ses = tr.find(v => /yelda|filiz|seda/i.test(v.name)) || tr[0] || null;
  return ses;
}
if (typeof window !== 'undefined' && 'speechSynthesis' in window) speechSynthesis.onvoiceschanged = () => { ses = null; sesSec(); };
function cihazla(m) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(m);
  u.lang = 'tr-TR';
  const v = sesSec(); if (v) u.voice = v;
  u.rate = 0.88; u.pitch = 1.0;
  speechSynthesis.speak(u);
}

// Bir cümle söyle. parcalar: anahtar dizisi (iç içe dizi olabilir) ya da {anahtar, metin}.
let zincir = Promise.resolve();
export function soyle(...parcalar) {
  if (!acikMi()) return;
  const liste = parcalar.flat(3);
  zincir = zincir.then(async () => {
    const k = await listeYukle();
    // Tek ses: Elif'in kayıtları varsa cihazın sesi hiç kullanılmaz. Kaydı olmayan parça
    // (ör. listede olmayan bir oyuncu adı) atlanır; iki sesi aynı masada karıştırmayız.
    if (!k.size) { cihazla(metin(liste)); return; }
    if (!ctx) kilidiAc();
    if (!ctx) return;
    if (ctx.state === 'suspended') { try { await ctx.resume(); } catch (e) {} }
    const parcalar = liste.filter(x => k.has(anahtarOf(x)));
    if (!parcalar.length) return;
    try {
      const bufs = [];
      for (const x of parcalar) bufs.push(await tamponAl(anahtarOf(x)));
      let t = Math.max(ctx.currentTime + 0.05, siraSonu);
      const t0 = t;
      for (const b of bufs) {
        const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(t);
        t += b.duration + 0.04;
      }
      siraSonu = t + 0.25;
      if (konusmaDinleyici) {
        const gecikme = Math.max(0, t0 - ctx.currentTime) * 1000, sure = (t - t0) * 1000;
        setTimeout(() => { try { konusmaDinleyici(sure); } catch (e) {} }, gecikme);
      }
    } catch (e) { /* kayıt çözülemedi: sessiz kal, cihaz sesine düşme */ }
  }).catch(() => {});
}

// Elif konuşmasını bitirene kadar bekle (en çok azami ms). Ödemeler konuşmanın üstüne binmesin.
export async function bitince(azami = 8000) {
  try { await zincir; } catch (e) {}
  const t0 = Date.now();
  while (Date.now() - t0 < azami) {
    const kalan = ctx ? siraSonu - ctx.currentTime : 0;
    const cihaz = typeof speechSynthesis !== 'undefined' && speechSynthesis.speaking;
    if (kalan <= 0 && !cihaz) return;
    await new Promise(r => setTimeout(r, Math.max(60, Math.min(250, kalan * 1000))));
  }
}

export function dur() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  siraSonu = 0;
}
