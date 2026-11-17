// Kart sesleri Web Audio ile anında üretilir; fiş sesleri ve arka plan uğultusu sesler/ altındaki
// kayıtlardan çalar (offline önbellekte durur).
// iOS ses motorunu ancak bir dokunuşla açar; ilk dokunuşta acil() çağrılır.

let ctx = null;
let gurultuTampon = null;
let acik = true;

export function sesAcikMi() { return acik; }
export function sesAyarla(v) {
  acik = !!v; try { localStorage.setItem('poker.ses', acik ? '1' : '0'); } catch (e) {}
  if (typeof ortamAyarla === 'function' && ortamKazanc) ortamAyarla(ortamAcik);
}
try { acik = localStorage.getItem('poker.ses') !== '0'; } catch (e) {}

export function acil() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    setTimeout(kayitlariYukle, 0);
    const n = ctx.sampleRate * 1.5;
    gurultuTampon = ctx.createBuffer(1, n, ctx.sampleRate);
    const v = gurultuTampon.getChannelData(0);
    // Pembe gürültüye yakın (kâğıt sürtünmesi beyaz gürültüden daha yumuşak duyulur)
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.0990460;
      b1 = 0.96300 * b1 + w * 0.2965164;
      b2 = 0.57000 * b2 + w * 1.0526913;
      v[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
  }
  if (ctx.state === 'suspended') ctx.resume();
  ortamBaslat();
}

// Arka planda kısık casino uğultusu (sesler/ortam.mp3, döngü). Menüden kapatılabilir.
let ortamAcik = true;
try { ortamAcik = localStorage.getItem('poker.ortam') !== '0'; } catch (e) {}
let ortamKaynak = null, ortamKazanc = null, ortamIstendi = false;
const ORTAM_SES = 0.096; // 17 Kas: %20 kısıldı
export function ortamAcikMi() { return ortamAcik; }
export function ortamAyarla(v) {
  ortamAcik = !!v;
  try { localStorage.setItem('poker.ortam', ortamAcik ? '1' : '0'); } catch (e) {}
  if (ortamKazanc && ctx) ortamKazanc.gain.setTargetAtTime(ortamAcik && acik ? ORTAM_SES : 0, ctx.currentTime, 0.3);
  if (ortamAcik) ortamBaslat();
}
function ortamBaslat() {
  if (!ctx || !ortamAcik || !acik || ortamIstendi) return;
  ortamIstendi = true;
  fetch('sesler/ortam.mp3').then(r => (r.ok ? r.arrayBuffer() : Promise.reject()))
    .then(b => new Promise((ok, red) => ctx.decodeAudioData(b, ok, red)))
    .then(buf => {
      ortamKaynak = ctx.createBufferSource(); ortamKaynak.buffer = buf; ortamKaynak.loop = true;
      ortamKazanc = ctx.createGain(); ortamKazanc.gain.value = 0;
      ortamKaynak.connect(ortamKazanc).connect(ctx.destination);
      ortamKaynak.start();
      ortamKazanc.gain.setTargetAtTime(ortamAcik && acik ? ORTAM_SES : 0, ctx.currentTime, 1.5);
    }).catch(() => { ortamIstendi = false; });
}

function hazir() { return acik && ctx && ctx.state === 'running'; }

// Gerçek fiş kayıtları (sesler/fis/*.mp3). Yüklenemezse sentez fiş sesi çalar.
const KAYITLAR = ['tek', 'kucuk', 'yigin', 'itme'];
const kayit = {};
let kayitIstendi = false;
function kayitlariYukle() {
  if (kayitIstendi || !ctx) return;
  kayitIstendi = true;
  for (const ad of KAYITLAR) {
    fetch('sesler/fis/' + ad + '.mp3').then(r => (r.ok ? r.arrayBuffer() : Promise.reject()))
      .then(b => new Promise((ok, red) => ctx.decodeAudioData(b, ok, red)))
      .then(buf => { kayit[ad] = buf; }).catch(() => {});
  }
}
function kayitCal(ad, t, ses = 0.9) {
  const b = kayit[ad];
  if (!b) return false;
  const k = ctx.createBufferSource();
  k.buffer = b;
  k.playbackRate.value = 0.95 + Math.random() * 0.1; // her seferinde biraz farklı
  const g = ctx.createGain(); g.gain.value = ses;
  k.connect(g).connect(ctx.destination);
  k.start(t);
  return true;
}

// Kısa gürültü patlaması: süzgeç + zarf
function gurultu(t, { sure, ses = 0.5, tip = 'bandpass', frekans = 3000, frekansSon = null, q = 1, atak = 0.002 }) {
  const kaynak = ctx.createBufferSource();
  kaynak.buffer = gurultuTampon;
  kaynak.playbackRate.value = 0.9 + Math.random() * 0.2;
  const suz = ctx.createBiquadFilter();
  suz.type = tip; suz.Q.value = q;
  suz.frequency.setValueAtTime(frekans, t);
  if (frekansSon) suz.frequency.exponentialRampToValueAtTime(frekansSon, t + sure);
  const kazanc = ctx.createGain();
  kazanc.gain.setValueAtTime(0.0001, t);
  kazanc.gain.exponentialRampToValueAtTime(ses, t + atak);
  kazanc.gain.exponentialRampToValueAtTime(0.0001, t + sure);
  kaynak.connect(suz).connect(kazanc).connect(ctx.destination);
  kaynak.start(t, Math.random() * 1.2, sure + 0.05);
}

function ton(t, { frekans, sure, ses = 0.2, tip = 'sine' }) {
  const o = ctx.createOscillator();
  o.type = tip; o.frequency.setValueAtTime(frekans, t);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(ses, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, t + sure);
  o.connect(g).connect(ctx.destination);
  o.start(t); o.stop(t + sure + 0.02);
}

// Masaya kayarak giden kart: kısa "fşşt" + yüzeye değme
export function kartAt(gecikme = 0) {
  if (!hazir()) return;
  const t = ctx.currentTime + gecikme;
  gurultu(t, { sure: 0.11, ses: 0.35, tip: 'bandpass', frekans: 5200, frekansSon: 1800, q: 0.8, atak: 0.004 });
  gurultu(t + 0.085, { sure: 0.05, ses: 0.5, tip: 'lowpass', frekans: 900, q: 0.7 });
  gurultu(t + 0.085, { sure: 0.025, ses: 0.25, tip: 'highpass', frekans: 4000 });
}

// Kartı çevirme: ince "tık"
export function kartCevir(gecikme = 0) {
  if (!hazir()) return;
  const t = ctx.currentTime + gecikme;
  gurultu(t, { sure: 0.035, ses: 0.4, tip: 'highpass', frekans: 2500 });
  gurultu(t + 0.012, { sure: 0.05, ses: 0.25, tip: 'bandpass', frekans: 1400, q: 1.2 });
}

// Riffle karıştırma: hızlanıp yavaşlayan kart şıkırtısı + desteyi toplama
export function karistir(gecikme = 0) {
  if (!hazir()) return 0;
  const t0 = ctx.currentTime + gecikme;
  let t = t0;
  for (let tur = 0; tur < 2; tur++) {
    const adet = 34 + Math.floor(Math.random() * 6);
    for (let i = 0; i < adet; i++) {
      const ilerleme = i / adet;
      const aralik = 0.009 + 0.012 * Math.sin(Math.PI * ilerleme) * -1 + 0.016;
      t += aralik * (0.8 + Math.random() * 0.4);
      gurultu(t, { sure: 0.018, ses: 0.18 + Math.random() * 0.12, tip: 'bandpass', frekans: 2600 + Math.random() * 2400, q: 1.5 });
    }
    // köprü: kartların birbirine geçip toplanması
    gurultu(t + 0.03, { sure: 0.28, ses: 0.22, tip: 'bandpass', frekans: 3400, frekansSon: 900, q: 0.6, atak: 0.06 });
    gurultu(t + 0.3, { sure: 0.06, ses: 0.4, tip: 'lowpass', frekans: 700 });
    t += 0.42;
  }
  return t - t0;
}

// Fişler: seramik/kil fiş çarpışması (birkaç tok-tiz parça)
// Kil fiş çarpışması: kısa bir darbe, fişin kendi titreşim tonlarından (yüksek Q bant
// geçiren süzgeçler) geçer; tonlar her darbede biraz değişir, sesi canlı tutar.
function carpisma(t, guc = 1) {
  const temel = 2300 + Math.random() * 500;
  const modlar = [[1, 1], [1.58, 0.7], [2.43, 0.45], [3.4, 0.25]];
  for (const [kat, g] of modlar) {
    const kaynak = ctx.createBufferSource();
    kaynak.buffer = gurultuTampon;
    const suz = ctx.createBiquadFilter();
    suz.type = 'bandpass'; suz.Q.value = 18 + Math.random() * 10;
    suz.frequency.value = temel * kat * (0.97 + Math.random() * 0.06);
    const kazanc = ctx.createGain();
    const sure = 0.05 + Math.random() * 0.04;
    kazanc.gain.setValueAtTime(0.0001, t);
    kazanc.gain.exponentialRampToValueAtTime(1.6 * g * guc, t + 0.0015);
    kazanc.gain.exponentialRampToValueAtTime(0.0001, t + sure);
    kaynak.connect(suz).connect(kazanc).connect(ctx.destination);
    kaynak.start(t, Math.random() * 1.2, sure + 0.02);
  }
  // keçeye değen gövde
  gurultu(t, { sure: 0.03, ses: 0.18 * guc, tip: 'lowpass', frekans: 700, q: 0.7 });
}

// Fiş sesi: fişler üst üste düşer, son fiş birkaç kez seker (aralık giderek kısalır).
export function fis(adet = 3, gecikme = 0) {
  if (!hazir()) return;
  kayitlariYukle();
  const t0 = ctx.currentTime + gecikme;
  if (kayitCal(adet <= 1 ? 'tek' : adet <= 4 ? 'kucuk' : 'yigin', t0)) return;
  let t = t0;
  for (let i = 0; i < adet; i++) {
    carpisma(t, 0.55 + Math.random() * 0.3);
    t += 0.05 + Math.random() * 0.06;
  }
  let ara = 0.07, guc = 0.45;
  for (let k = 0; k < 3; k++) { carpisma(t, guc); t += ara; ara *= 0.55; guc *= 0.55; }
}

// Oyuncu bahis koyarken: tek fiş, kısık ve yumuşak
export function fisHafif(gecikme = 0) {
  if (!hazir()) return;
  kayitlariYukle();
  const t = ctx.currentTime + gecikme;
  if (kayitCal('tek', t, 0.3)) return;
  carpisma(t, 0.3);
}

// Masaya hafif vurma (kontrol)
export function tik(gecikme = 0) {
  if (!hazir()) return;
  const t = ctx.currentTime + gecikme;
  gurultu(t, { sure: 0.06, ses: 0.6, tip: 'lowpass', frekans: 400, q: 0.8 });
  gurultu(t + 0.11, { sure: 0.06, ses: 0.5, tip: 'lowpass', frekans: 400, q: 0.8 });
}

// Kartları ortaya atma (pas)
export function kartlariAt(gecikme = 0) {
  if (!hazir()) return;
  const t = ctx.currentTime + gecikme;
  gurultu(t, { sure: 0.18, ses: 0.3, tip: 'bandpass', frekans: 3000, frekansSon: 1200, q: 0.7, atak: 0.02 });
  gurultu(t + 0.15, { sure: 0.05, ses: 0.35, tip: 'lowpass', frekans: 800 });
}

// Potu kazanana itme: fişlerin kayması
export function potuTopla(gecikme = 0) {
  if (!hazir()) return;
  const t = ctx.currentTime + gecikme;
  kayitlariYukle();
  if (kayitCal('itme', t)) return;
  gurultu(t, { sure: 0.45, ses: 0.2, tip: 'bandpass', frekans: 2200, frekansSon: 1200, q: 0.5, atak: 0.08 });
  fis(7, gecikme + 0.12);
}
