// Kart ve fiş sesleri: hiçbir ses dosyası yok, hepsi Web Audio ile anında üretilir
// (offline'da da çalışır, indirilecek bir şey yok).
// iOS ses motorunu ancak bir dokunuşla açar; ilk dokunuşta acil() çağrılır.

let ctx = null;
let gurultuTampon = null;
let acik = true;

export function sesAcikMi() { return acik; }
export function sesAyarla(v) { acik = !!v; try { localStorage.setItem('poker.ses', acik ? '1' : '0'); } catch (e) {} }
try { acik = localStorage.getItem('poker.ses') !== '0'; } catch (e) {}

export function acil() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
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
}

function hazir() { return acik && ctx && ctx.state === 'running'; }

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
export function fis(adet = 3, gecikme = 0) {
  if (!hazir()) return;
  let t = ctx.currentTime + gecikme;
  for (let i = 0; i < adet; i++) {
    const s = 0.12 + Math.random() * 0.08;
    ton(t, { frekans: 3100 + Math.random() * 500, sure: 0.05, ses: s * 0.6 });
    ton(t, { frekans: 5400 + Math.random() * 900, sure: 0.035, ses: s * 0.35 });
    ton(t, { frekans: 1700 + Math.random() * 200, sure: 0.03, ses: s * 0.4, tip: 'triangle' });
    gurultu(t, { sure: 0.02, ses: s, tip: 'highpass', frekans: 3500 });
    t += 0.045 + Math.random() * 0.05;
  }
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
  gurultu(t, { sure: 0.45, ses: 0.2, tip: 'bandpass', frekans: 2200, frekansSon: 1200, q: 0.5, atak: 0.08 });
  fis(7, gecikme + 0.12);
}
