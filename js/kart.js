// Kartlar, karıştırma ve el gücü.
// Tarayıcıda ve Node testlerinde aynı dosya çalışır (ES modül, bağımlılık yok).

export const RENKLER = ['s', 'h', 'd', 'c']; // maça, kupa, karo, sinek
export const RENK_SIMGE = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const DEGER_AD = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 10: '10' };

// Kart: { d: 2..14, r: 's'|'h'|'d'|'c' }
export function kartYazi(k) {
  return (DEGER_AD[k.d] || String(k.d)) + RENK_SIMGE[k.r];
}

export function yeniDeste() {
  const deste = [];
  for (const r of RENKLER) for (let d = 2; d <= 14; d++) deste.push({ d, r });
  return deste;
}

// --- Tekrarlanabilir karıştırma -------------------------------------------
// Aynı masa kodu + aynı el numarası => her cihazda aynı deste.
// Telefonlar birbiriyle konuşmadan bu sayede aynı kartları görür.

function cyrb128(str) {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0, k; i < str.length; i++) {
    k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

function sfc32(a, b, c, d) {
  return function () {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function kodNormalize(kod) {
  return String(kod || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function elDestesi(kod, elNo) {
  const tohum = cyrb128('holdem|' + kodNormalize(kod) + '|' + elNo);
  const rnd = sfc32(...tohum);
  for (let i = 0; i < 15; i++) rnd(); // ısınma
  const deste = yeniDeste();
  for (let i = deste.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [deste[i], deste[j]] = [deste[j], deste[i]];
  }
  return deste;
}

// Deste düzeni (en çok 9 koltuk): koltuk i'nin kartları 2i ve 2i+1.
// Böylece telefonun oyuncu sayısını bilmesi gerekmez.
// 18 yakılır, 19-21 flop, 22 yakılır, 23 turn, 24 yakılır, 25 river.
export const AZAMI_KOLTUK = 9;
export function koltukKartlari(deste, koltuk) {
  return [deste[2 * koltuk], deste[2 * koltuk + 1]];
}
export function ortakKartlar(deste) {
  return [deste[19], deste[20], deste[21], deste[23], deste[25]];
}

// İki cihaz aynı eli mi gösteriyor? Kısa kontrol harfleri.
export function kontrolKodu(kod, elNo) {
  const h = cyrb128('kontrol|' + kodNormalize(kod) + '|' + elNo)[0];
  const abc = 'ABCDEFGHJKLMNPRSTUVYZ';
  return abc[h % abc.length] + abc[Math.floor(h / 97) % abc.length];
}

// --- El gücü ---------------------------------------------------------------
// Sonuç: [kategori, ...eşitlik bozucular]; dizi olarak karşılaştırılır.
// 8 renkli kent, 7 kare, 6 full, 5 renk, 4 kent, 3 üçlü, 2 iki çift, 1 çift, 0 yüksek kart.

export const KATEGORI_AD = [
  'Yüksek kart', 'Bir çift', 'İki çift', 'Üçlü', 'Kent', 'Renk', 'Full', 'Kare', 'Renkli kent',
];

function kentTepesi(degerlerAzalan) {
  // Tekrarsız, azalan sıralı değerler. As aşağıda da sayılır (A-2-3-4-5).
  const v = [...new Set(degerlerAzalan)];
  if (v.includes(14)) v.push(1);
  let seri = 1;
  for (let i = 1; i < v.length; i++) {
    if (v[i] === v[i - 1] - 1) {
      seri++;
      if (seri >= 5) return v[i] + 4;
    } else seri = 1;
  }
  return 0;
}

export function besKartGucu(kartlar) {
  if (kartlar.length !== 5) throw new Error('5 kart gerekir');
  const d = kartlar.map(k => k.d).sort((a, b) => b - a);
  const renk = kartlar.every(k => k.r === kartlar[0].r);
  const kent = kentTepesi(d);
  const say = new Map();
  for (const x of d) say.set(x, (say.get(x) || 0) + 1);
  // Gruplar: önce adet, sonra değer azalan
  const gruplar = [...say.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const adet = gruplar.map(g => g[1]);
  const deg = gruplar.map(g => g[0]);
  if (renk && kent) return [8, kent];
  if (adet[0] === 4) return [7, deg[0], deg[1]];
  if (adet[0] === 3 && adet[1] === 2) return [6, deg[0], deg[1]];
  if (renk) return [5, ...d];
  if (kent) return [4, kent];
  if (adet[0] === 3) return [3, ...deg];
  if (adet[0] === 2 && adet[1] === 2) return [2, ...deg];
  if (adet[0] === 2) return [1, ...deg];
  return [0, ...d];
}

export function gucKarsilastir(a, b) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0, y = b[i] ?? 0;
    if (x !== y) return x - y;
  }
  return 0;
}

// 5-7 karttan en iyi 5'li.
export function enIyiEl(kartlar) {
  const n = kartlar.length;
  let enIyi = null, enIyiKartlar = null;
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++) {
            const bes = [kartlar[a], kartlar[b], kartlar[c], kartlar[d], kartlar[e]];
            const g = besKartGucu(bes);
            if (!enIyi || gucKarsilastir(g, enIyi) > 0) { enIyi = g; enIyiKartlar = bes; }
          }
  return { guc: enIyi, kartlar: enIyiKartlar, ad: KATEGORI_AD[enIyi[0]] };
}

// Testler ve okuma kolaylığı için: "As Kh 10d 2c" -> kartlar
export function kartlariOku(metin) {
  const harf = { A: 14, K: 13, Q: 12, J: 11, T: 10 };
  return metin.trim().split(/\s+/).map(t => {
    const r = t.slice(-1).toLowerCase();
    const ds = t.slice(0, -1).toUpperCase();
    const d = harf[ds] || Number(ds);
    if (!d || !RENKLER.includes(r)) throw new Error('kart okunamadı: ' + t);
    return { d, r };
  });
}

// Tamamen rastgele deste: cihazın güvenli rastgele üreteci (crypto) + yansız Fisher-Yates.
// Hiçbir koddan türetilmez; her çağrı bağımsız bir karıştırmadır.
export function rastgeleDeste() {
  const deste = yeniDeste();
  const tampon = new Uint32Array(1);
  const zar = n => { // 0..n-1, modülo sapması olmadan
    const sinir = Math.floor(0x100000000 / n) * n;
    let x;
    do { globalThis.crypto.getRandomValues(tampon); x = tampon[0]; } while (x >= sinir);
    return x % n;
  };
  for (let i = deste.length - 1; i > 0; i--) {
    const j = zar(i + 1);
    [deste[i], deste[j]] = [deste[j], deste[i]];
  }
  return deste;
}
