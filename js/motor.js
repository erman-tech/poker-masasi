// Texas Hold'em oyun motoru (No-Limit). Saf: her fonksiyon yeni durum döndürür,
// verilen durumu değiştirmez (masa ekranındaki "geri al" bunun üstüne kurulu).
import { elDestesi, koltukKartlari, ortakKartlar, enIyiEl, gucKarsilastir } from './kart.js';

// Kör seviyeleri: [küçük, büyük]
export const KOR_SEVIYELERI = [
  [10, 20], [15, 30], [25, 50], [50, 100], [75, 150], [100, 200],
  [150, 300], [200, 400], [300, 600], [500, 1000], [1000, 2000], [2000, 4000],
];

const klon = o => JSON.parse(JSON.stringify(o));

export function yeniOyun({ adlar, kod, baslangicFis = 1000, korArtisEl = 10, ilkElNo = 1, oyunNo = 1 }) {
  if (!Array.isArray(adlar) || adlar.length < 2) throw new Error('En az 2 oyuncu gerekir');
  if (adlar.length > 9) throw new Error('En çok 9 oyuncu');
  return {
    surum: 1,
    kod,
    oyunNo,
    baslangicFis,
    korArtisEl,          // kaç elde bir kör yükselir (0 = sabit)
    ilkElNo,             // bu oyunun ilk eli (kör seviyesi buna göre sayılır)
    elNo: ilkElNo - 1,   // son dağıtılan el
    buton: -1,
    oyuncular: adlar.map((ad, i) => ({ ad, koltuk: i, fis: baslangicFis, elendi: false })),
    el: null,
    bitti: false,
    sampiyon: null,
  };
}

// Biten oyundan sonra: aynı oyuncular, herkese yine başlangıç fişi.
// El numarası kaldığı yerden devam eder; böylece aynı desteler tekrar gelmez.
export function yenidenBaslat(g) {
  const y = yeniOyun({
    adlar: g.oyuncular.map(o => o.ad), kod: g.kod, baslangicFis: g.baslangicFis,
    korArtisEl: g.korArtisEl, ilkElNo: g.elNo + 1, oyunNo: (g.oyunNo || 1) + 1,
  });
  return y;
}

export function korSeviyesi(g, elNo = g.elNo) {
  if (!g.korArtisEl) return 0;
  const i = Math.floor((elNo - g.ilkElNo) / g.korArtisEl);
  return Math.max(0, Math.min(i, KOR_SEVIYELERI.length - 1));
}
export function korlar(g, elNo = g.elNo) {
  const [k, b] = KOR_SEVIYELERI[korSeviyesi(g, elNo)];
  return { kucuk: k, buyuk: b };
}

function sonraki(g, i, kosul) {
  const n = g.oyuncular.length;
  for (let a = 1; a <= n; a++) {
    const j = (i + a + n) % n;
    if (kosul(j)) return j;
  }
  return -1;
}
const oyunda = g => i => !g.oyuncular[i].elendi;

// deste verilmezse masa kodu + el numarasından üretilir (testler deste verir).
export function eliBaslat(g0, desteVerilen = null) {
  const g = klon(g0);
  if (g.bitti) throw new Error('Oyun bitti');
  if (g.el && g.el.sokak !== 'bitti') throw new Error('Önceki el bitmedi');
  const kalan = g.oyuncular.filter(o => !o.elendi);
  if (kalan.length < 2) throw new Error('Oynayacak en az 2 kişi gerekir');

  g.elNo += 1;
  g.buton = sonraki(g, g.buton < 0 ? g.oyuncular.length - 1 : g.buton, oyunda(g));
  const { kucuk, buyuk } = korlar(g);
  const deste = desteVerilen || elDestesi(g.kod, g.elNo);
  const n = g.oyuncular.length;
  const durum = g.oyuncular.map(o => ({
    katki: 0, bahis: 0, pas: o.elendi, allin: false,
    hamle: !o.elendi, yukseltebilir: !o.elendi,
  }));
  let sbI, bbI;
  if (kalan.length === 2) {
    sbI = g.buton;                       // iki kişide buton küçük körü öder
    bbI = sonraki(g, sbI, oyunda(g));
  } else {
    sbI = sonraki(g, g.buton, oyunda(g));
    bbI = sonraki(g, sbI, oyunda(g));
  }
  const el = {
    no: g.elNo, sokak: 'preflop', acik: 0,
    kucuk, buyuk, sb: sbI, bb: bbI,
    durum, enYuksek: buyuk, sonYukseltme: buyuk,
    sira: null,
    elKartlari: g.oyuncular.map((o, i) => (o.elendi ? null : koltukKartlari(deste, i))),
    ortak: ortakKartlar(deste),
    gecmis: [],
    sonuc: null,
  };
  g.el = el;
  ode(g, sbI, kucuk, 'küçük kör');
  ode(g, bbI, buyuk, 'büyük kör');
  // İlk konuşan: büyük körün solu
  ilerle(g, bbI);
  return g;
}

function ode(g, i, miktar, not) {
  const o = g.oyuncular[i], d = g.el.durum[i];
  const m = Math.min(miktar, o.fis);
  o.fis -= m; d.bahis += m; d.katki += m;
  if (o.fis === 0) { d.allin = true; d.hamle = false; d.yukseltebilir = false; }
  g.el.gecmis.push({ i, tip: not, miktar: m, sokak: g.el.sokak });
  return m;
}

function oynayabilir(g, i) {
  const d = g.el.durum[i];
  return !d.pas && !d.allin && !g.oyuncular[i].elendi;
}
function hamleBekler(g, i) {
  return oynayabilir(g, i) && g.el.durum[i].hamle;
}
const pasDegil = g => g.el.durum.map((d, i) => i).filter(i => !g.el.durum[i].pas);

export function yasalHamleler(g) {
  const el = g.el;
  if (!el || el.sokak === 'bitti' || el.sira == null) return null;
  const i = el.sira, d = el.durum[i], o = g.oyuncular[i];
  const odenecek = Math.max(0, el.enYuksek - d.bahis);
  const enCok = d.bahis + o.fis; // ulaşılabilecek en yüksek sokak bahsi
  const enAzYukselt = el.enYuksek + el.sonYukseltme;
  const yukseltme = d.yukseltebilir && enCok > el.enYuksek;
  return {
    oyuncu: i,
    odenecek: Math.min(odenecek, o.fis),
    kontrol: odenecek === 0,
    gor: odenecek > 0,
    gorAllin: odenecek > 0 && o.fis <= odenecek,
    yukselt: yukseltme,
    enAz: yukseltme ? Math.min(enAzYukselt, enCok) : null,
    enCok: yukseltme ? enCok : null,
    acilis: el.enYuksek === 0, // "bet" mi "raise" mi
    pot: potToplam(g),
  };
}

export function potToplam(g) {
  return g.el ? g.el.durum.reduce((t, d) => t + d.katki, 0) : 0;
}

// hamle: { tip: 'pas'|'kontrol'|'gor'|'yukselt'|'allin', miktar? }
// yukselt.miktar = bu sokakta ulaşılacak toplam bahis ("raise to").
export function hamleYap(g0, hamle) {
  const g = klon(g0);
  const el = g.el;
  const y = yasalHamleler(g);
  if (!y) throw new Error('Şu an hamle beklenmiyor');
  const i = el.sira, d = el.durum[i], o = g.oyuncular[i];
  let tip = hamle.tip;

  if (tip === 'allin') {
    if (d.bahis + o.fis <= el.enYuksek) tip = 'gor';
    else if (!y.yukselt) throw new Error('Yükseltme hakkın yok, yalnız görebilir ya da pas geçebilirsin');
    else { tip = 'yukselt'; hamle = { tip, miktar: d.bahis + o.fis }; }
  }

  if (tip === 'pas') {
    d.pas = true;
    el.gecmis.push({ i, tip: 'pas', miktar: 0, sokak: el.sokak });
  } else if (tip === 'kontrol') {
    if (!y.kontrol) throw new Error('Kontrol edilemez, ödenecek ' + y.odenecek);
    el.gecmis.push({ i, tip: 'kontrol', miktar: 0, sokak: el.sokak });
  } else if (tip === 'gor') {
    if (!y.gor) throw new Error('Görülecek bahis yok');
    ode(g, i, el.enYuksek - d.bahis, 'gör');
  } else if (tip === 'yukselt') {
    if (!y.yukselt) throw new Error('Yükseltme hakkın yok');
    const hedef = Math.floor(Number(hamle.miktar));
    const enCok = d.bahis + o.fis;
    if (!(hedef > el.enYuksek)) throw new Error('Yükseltme mevcut bahisten büyük olmalı');
    if (hedef > enCok) throw new Error('Yeterli fiş yok');
    if (hedef < y.enAz && hedef !== enCok) throw new Error('En az ' + y.enAz + ' yapmalısın');
    const fark = hedef - el.enYuksek;
    ode(g, i, hedef - d.bahis, el.enYuksek === 0 ? 'bet' : 'yükselt');
    const tam = fark >= el.sonYukseltme;
    if (tam) el.sonYukseltme = fark;
    el.enYuksek = hedef;
    for (let j = 0; j < g.oyuncular.length; j++) {
      if (j === i || !oynayabilir(g, j)) continue;
      el.durum[j].hamle = true;
      if (tam) el.durum[j].yukseltebilir = true;
    }
  } else {
    throw new Error('Bilinmeyen hamle: ' + tip);
  }
  d.hamle = false;
  d.yukseltebilir = false;
  ilerle(g, i);
  return g;
}

// Sıradaki oyuncuyu bulur; tur bittiyse sokak açar ya da eli bitirir.
function ilerle(g, son) {
  const el = g.el;
  const kalanlar = pasDegil(g);
  if (kalanlar.length === 1) return eliBitir(g);

  const siradaki = sonraki(g, son, j => hamleBekler(g, j));
  if (siradaki >= 0 && !tekBasinaBekliyor(g, siradaki)) { el.sira = siradaki; return; }
  turuKapat(g);
}

// Oynayabilen tek kişi kaldıysa ve önünde ödenecek bir şey yoksa ona sormaya gerek yok.
function tekBasinaBekliyor(g, i) {
  const el = g.el;
  const oynayabilenler = el.durum.map((_, j) => j).filter(j => oynayabilir(g, j));
  if (oynayabilenler.length !== 1) return false;
  const enYuksekGercek = Math.max(...pasDegil(g).map(j => el.durum[j].bahis));
  return el.durum[i].bahis >= enYuksekGercek;
}

function turuKapat(g) {
  const el = g.el;
  for (const d of el.durum) d.bahis = 0;
  const oynayabilenler = el.durum.map((_, j) => j).filter(j => oynayabilir(g, j));
  if (el.sokak === 'river' || oynayabilenler.length <= 1) {
    el.acik = 5; // kalan kartlar açılır
    return eliBitir(g);
  }
  el.sokak = el.sokak === 'preflop' ? 'flop' : el.sokak === 'flop' ? 'turn' : 'river';
  el.acik = el.sokak === 'flop' ? 3 : el.sokak === 'turn' ? 4 : 5;
  el.enYuksek = 0;
  el.sonYukseltme = el.buyuk;
  for (const j of oynayabilenler) { el.durum[j].hamle = true; el.durum[j].yukseltebilir = true; }
  el.sira = sonraki(g, g.buton, j => hamleBekler(g, j));
}

// Katkılardan ana pot ve yan potlar.
export function potlariHesapla(katkilar, pasMi) {
  const seviyeler = [...new Set(katkilar.filter((k, i) => !pasMi[i] && k > 0))].sort((a, b) => a - b);
  const potlar = [];
  let onceki = 0;
  for (const L of seviyeler) {
    let miktar = 0;
    for (const k of katkilar) miktar += Math.max(0, Math.min(k, L) - onceki);
    const hak = katkilar.map((k, i) => i).filter(i => !pasMi[i] && katkilar[i] >= L);
    if (miktar > 0) potlar.push({ miktar, hak });
    onceki = L;
  }
  // Pas geçenin en üst seviyeyi aşan katkısı (olağan dışı) son pota eklenir.
  const artik = katkilar.reduce((t, k) => t + Math.max(0, k - onceki), 0);
  if (artik > 0 && potlar.length) potlar[potlar.length - 1].miktar += artik;
  // Aynı hak listesine sahip ardışık potları birleştir (okunurluk için).
  const birlesik = [];
  for (const p of potlar) {
    const s = birlesik[birlesik.length - 1];
    if (s && s.hak.join() === p.hak.join()) s.miktar += p.miktar; else birlesik.push({ ...p, hak: [...p.hak] });
  }
  return birlesik;
}

function eliBitir(g) {
  const el = g.el;
  el.sira = null;
  const kalanlar = pasDegil(g);
  const katkilar = el.durum.map(d => d.katki);
  const pasMi = el.durum.map(d => d.pas);
  const kazanc = g.oyuncular.map(() => 0);
  const potlar = potlariHesapla(katkilar, pasMi);
  const sonuclar = [];
  const gosterim = kalanlar.length > 1;
  const elGucu = {};
  if (gosterim) {
    const masa = el.ortak.slice(0, 5);
    for (const i of kalanlar) elGucu[i] = enIyiEl([...el.elKartlari[i], ...masa]);
  }
  for (const p of potlar) {
    let kazananlar;
    if (p.hak.length === 1 || !gosterim) {
      kazananlar = p.hak.length === 1 ? p.hak : [kalanlar[0]];
    } else {
      let enIyi = null;
      for (const i of p.hak) {
        const gu = elGucu[i].guc;
        if (!enIyi || gucKarsilastir(gu, enIyi) > 0) { enIyi = gu; kazananlar = [i]; }
        else if (gucKarsilastir(gu, enIyi) === 0) kazananlar.push(i);
      }
    }
    // Bölünme: artan fiş butonun solundan başlayarak dağıtılır.
    const pay = Math.floor(p.miktar / kazananlar.length);
    let artan = p.miktar - pay * kazananlar.length;
    for (const i of kazananlar) kazanc[i] += pay;
    if (artan > 0) {
      let j = g.buton;
      while (artan > 0) {
        j = sonraki(g, j, x => kazananlar.includes(x));
        kazanc[j] += 1; artan--;
      }
    }
    sonuclar.push({ miktar: p.miktar, hak: p.hak, kazananlar });
  }
  g.oyuncular.forEach((o, i) => { o.fis += kazanc[i]; });
  el.sokak = 'bitti';
  el.sonuc = {
    potlar: sonuclar,
    kazanc,
    gosterim,
    eller: Object.fromEntries(Object.entries(elGucu).map(([i, e]) => [i, { ad: e.ad, guc: e.guc }])),
  };
  for (const o of g.oyuncular) if (!o.elendi && o.fis === 0) o.elendi = true;
  const kalan = g.oyuncular.filter(o => !o.elendi);
  if (kalan.length === 1) { g.bitti = true; g.sampiyon = kalan[0].koltuk; }
}

export function toplamFis(g) {
  return g.oyuncular.reduce((t, o) => t + o.fis, 0) + potToplam(g) * (g.el && g.el.sokak !== 'bitti' ? 1 : 0);
}
