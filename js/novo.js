// Novo Poker: kasaya (krupiyeye) karşı, oyuncular birbirine karşı değil.
// Akış: ante + zorunlu express bonus (ante kadar) → herkese 5 açık kart, krupiyeye 5 kart (1'i açık)
// → bonus ilk ele göre HEMEN ödenir → her oyuncu sırayla: pas / oyna / kart değiştir / 6. kart al
// → krupiye açar: oyunu (As-Papaz ya da daha iyisi) yoksa oyuna giren oyuncu ante'yi alır
//   ya da 1 ante ödeyip krupiyeye oyun satın alır → karşılaştırma ve ödeme tablosu.
// Saf: her fonksiyon yeni durum döndürür.
import { rastgeleDeste, enIyiEl, gucKarsilastir } from './kart.js';

const klon = o => JSON.parse(JSON.stringify(o));

export const NOVO_AZAMI_OYUNCU = 3;
export const ANTE_SECENEKLERI = [5, 10, 25, 50, 100];
// Express bonus zorunlu ve ante kadar: giriş = ante + express. Kart çekme = ante, oyna = 2 x ante.

// Ana bahis ödeme tablosu (bahis = 2 x ante üzerinden, kaça bir)
export const ODEME = { AK: 1, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 7, 7: 20, SF: 50, RF: 100 };
// İlk 5 kart bonusu (kaça bir)
// Erman'ın oranları: full 100, renk 60, kent 30, üçlü 8, iki çift yok. Kare ve üstü eski tabloda.
export const BONUS = { SAHTE: 2, AKQ: 5, 3: 8, 4: 30, 5: 60, 6: 100, SURAT: 120, 7: 200, SF: 250, RF: 500 };

export const EL_ADI = {
  0: 'Yüksek kart', AK: 'As-Papaz', AKQ: 'As-Papaz-Kız', SAHTE: 'Sahte renk', SURAT: '5 surat', 1: 'Bir çift', 2: 'İki çift', 3: 'Üçlü', 4: 'Kent',
  5: 'Renk', 6: 'Full', 7: 'Kare', SF: 'Renkli kent', RF: 'Royal flush',
};

// Destede yer: koltuk i'nin ilk 5 kartı 5i..5i+4, krupiye 20..24 (24 açık kart),
// değişen ve satın alınan kartlar 25'ten itibaren sırayla.
// Novo: dağıtımdan önce desteden 3 kart yakılır (0..2); oyun kalan 49 kartla oynanır.
export const YAKILAN_ILK = 3;
export const KOLTUK_BASI = i => YAKILAN_ILK + 5 * i;           // koltuk i: 3+5i .. 3+5i+4
export const KRUPIYE = YAKILAN_ILK + 5 * 3;                     // 18..22 (22 açık kart)
export const CEKME = KRUPIYE + 5;                               // 23'ten itibaren sırayla
export function ilkEl(deste, koltuk) { return deste.slice(KOLTUK_BASI(koltuk), KOLTUK_BASI(koltuk) + 5); }

// Elin sınıfı: ödeme tablosundaki anahtar
export function sinif(kartlar) {
  const e = enIyiEl(kartlar);
  const k = e.guc[0];
  if (k === 8) return { anahtar: e.guc[1] === 14 ? 'RF' : 'SF', el: e };
  if (k === 0) {
    const d = new Set(kartlar.map(x => x.d));
    return { anahtar: d.has(14) && d.has(13) ? 'AK' : 0, el: e };
  }
  return { anahtar: k, el: e };
}

export function krupiyeOyunuVar(kartlar) { return sinif(kartlar).anahtar !== 0; }

// İkinci kombinasyon: elde ayrıca As ve Papaz varsa ve bunlar ana kombinasyonun
// parçası değilse As-Papaz da ödenir (1'e 1). Yalnız çift ve üstü ellerde.
export function ikinciAK(kartlar) {
  const s = sinif(kartlar);
  if (s.anahtar === 0 || s.anahtar === 'AK') return false;
  if (['RF', 'SF', 4, 5].includes(s.anahtar)) {
    // Kent ve renk 5 kartın hepsini kullanır; 6 kartta dışarıda kalan As ve Papaz olamaz.
    return false;
  }
  // Kombinasyonu oluşturan değerler (çift, iki çift, üçlü, full, kare)
  const say = new Map();
  for (const k of s.el.kartlar) say.set(k.d, (say.get(k.d) || 0) + 1);
  const cekirdek = new Set([...say.entries()].filter(([, n]) => n >= 2).map(([d]) => d));
  const disari = kartlar.filter(k => !cekirdek.has(k.d)).map(k => k.d);
  return disari.includes(14) && disari.includes(13);
}

// İki kombinasyon (6 kartla): 6 kartın içinden çıkan iki ayrı el birlikte ödenir.
// Örnek: A-A-2-3-4-5 → kent (4) + bir çift As (1) = 5 kat; K-K-K-K-Q-Q → kare (20) + full (7) = 27 kat;
// beş kupa + bir As daha → renk (5) + çift As (1) = 6 kat.
// Kural: ikinci el ana elden farklı türde olmalı ve ana eli oluşturan kartların içinden çıkmamalı
// (üçlü içindeki çift, fullün içindeki iki çift sayılmaz). Yüksek kart / As-Papaz kombinasyon değildir.
function yapanKartlar(bes, anahtar) {
  if (['RF', 'SF', 4, 5].includes(anahtar)) return bes;
  const say = new Map();
  for (const k of bes) say.set(k.d, (say.get(k.d) || 0) + 1);
  return bes.filter(k => say.get(k.d) >= 2);
}
const ayni = (a, b) => a.d === b.d && a.r === b.r;
export function kombinasyonlar(kartlar) {
  const ana = sinif(kartlar);
  const sonuc = { ana: ana.anahtar, ikinci: null };
  if (kartlar.length < 6 || ana.anahtar === 0 || ana.anahtar === 'AK') return sonuc;
  // Üç per (6 kartta üç ayrı çift): iki per + per = 3 kat
  if (ana.anahtar === 2) {
    const say = new Map();
    for (const k of kartlar) say.set(k.d, (say.get(k.d) || 0) + 1);
    if ([...say.values()].filter(n => n === 2).length === 3) { sonuc.ikinci = 1; return sonuc; }
  }
  const anaYapan = yapanKartlar(ana.el.kartlar, ana.anahtar);
  let enIyi = null;
  for (let atla = 0; atla < kartlar.length; atla++) {
    const bes = kartlar.filter((_, j) => j !== atla);
    const s2 = sinif(bes).anahtar;
    if (s2 === 0 || s2 === 'AK' || s2 === ana.anahtar) continue;
    const yapan = yapanKartlar(bes, s2);
    if (yapan.every(k => anaYapan.some(a => ayni(a, k)))) continue; // ana elin parçası
    if (enIyi == null || (ODEME[s2] || 0) > (ODEME[enIyi] || 0)) enIyi = s2;
  }
  sonuc.ikinci = enIyi;
  return sonuc;
}

// Yalancı döperin üçlü hali: üç as + papaz ya da üç papaz + as → As-Papaz da ödenir (+1).
export function yalanciAK(kartlar) {
  const s = sinif(kartlar);
  if (s.anahtar !== 3) return false;
  const say = new Map();
  for (const k of s.el.kartlar) say.set(k.d, (say.get(k.d) || 0) + 1);
  const uclu = [...say.entries()].find(([, n]) => n === 3)[0];
  const d = new Set(kartlar.map(k => k.d));
  return (uclu === 14 && d.has(13)) || (uclu === 13 && d.has(14));
}

// Yalancı perin iki per hali: perlerden biri As ve elde Papaz var (A-A-8-8-K), ya da biri Papaz ve elde As var → +1.
export function yalanciIkiPer(kartlar) {
  const s = sinif(kartlar);
  if (s.anahtar !== 2) return false;
  const say = new Map();
  for (const k of kartlar) say.set(k.d, (say.get(k.d) || 0) + 1);
  const perler = new Set([...say.entries()].filter(([, n]) => n >= 2).map(([d]) => d));
  // Papaz/As perin dışında olmalı (A-A-K-K-7'de ikisi de per; ek ödeme yok, düz iki per)
  return (perler.has(14) && say.get(13) === 1) || (perler.has(13) && say.get(14) === 1);
}

// Bet oranı: ana el + (varsa) ikinci el; ikinci el yoksa As-Papaz / yalancı döper +1.
export function betOrani(kartlar) {
  const k = kombinasyonlar(kartlar);
  const ana = ODEME[k.ana] || 0;
  if (k.ikinci != null) return { oran: ana + (ODEME[k.ikinci] || 0), ana: k.ana, ikinci: k.ikinci, ek: 0 };
  const ek = ikinciAK(kartlar) || doperTuru(kartlar) === 'yalanci' || yalanciAK(kartlar) || yalanciIkiPer(kartlar) ? 1 : 0;
  return { oran: ana + ek, ana: k.ana, ikinci: null, ek };
}

// Döper (Rus kuralı): bir çift + As + Papaz.
//  'gercek' : çift başka bir değer, As ve Papaz ayrıca elde (ör. 4-4-A-K)
//  'yalanci': çift As ve elde Papaz var, ya da çift Papaz ve elde As var (A-A-K, K-K-A)
// İkisi de 2'ye 1 öder (çift + As-Papaz). Gerçek döper yalancı döperi yener.
export function doperTuru(kartlar) {
  const s = sinif(kartlar);
  if (s.anahtar !== 1) return null;
  const say = new Map();
  for (const k of s.el.kartlar) say.set(k.d, (say.get(k.d) || 0) + 1);
  const cift = [...say.entries()].find(([, n]) => n === 2)[0];
  const d = new Set(kartlar.map(k => k.d));
  if (cift === 14 && d.has(13)) return 'yalanci';
  if (cift === 13 && d.has(14)) return 'yalanci';
  if (d.has(14) && d.has(13)) return 'gercek';
  return null;
}

// Tek per elde perin değeri (2..14, As 14); per değilse null. Kasanın anonsu için (Erman 25 Kas).
export function perDegeri(kartlar) {
  const s = sinif(kartlar);
  if (s.anahtar !== 1) return null;
  const say = new Map();
  for (const k of s.el.kartlar) say.set(k.d, (say.get(k.d) || 0) + 1);
  const c = [...say.entries()].find(([, n]) => n === 2);
  return c ? c[0] : null;
}

// Express ilk 5 karta göre. As-Papaz-Kız (yüksek kart) 5'e 1 öder ama oyunda per sayılmaz
// (oyunda yalnız As-Papaz olarak kalır).
// Sahte renk (same colour): ilk 5 kartın hepsi kırmızı (kupa/karo) ya da hepsi siyah (maça/sinek),
// ama tek renk (flush) değil → express 2'ye 1. Daha yüksek bir express bonusu varsa o ödenir.
const KIRMIZI = new Set(['h', 'd']);
export function sahteRenk(kartlar) {
  if (kartlar.length !== 5) return false;
  const kirmizi = kartlar.map(k => KIRMIZI.has(k.r));
  return kirmizi.every(x => x) || kirmizi.every(x => !x);
}
// Beş surat (five picture): ilk 5 kartın hepsi vale, kız ya da papaz → express 120'ye 1.
// Bu kartlarla kent/renk olamaz. Full (100) yerine beş surat ödenir; surat karesi (200) ise kare olarak öder.
export function besSurat(kartlar) {
  return kartlar.length === 5 && kartlar.every(k => k.d >= 11 && k.d <= 13);
}
export function bonusAnahtari(kartlar) {
  const a = sinif(kartlar).anahtar;
  // As-Papaz-Kız: elde A, K ve Q varsa (yanında per olsa da) express öder; daha yüksek bonus varsa o geçer.
  const akq = [14, 13, 12].every(d => kartlar.some(x => x.d === d));
  const k = akq && (BONUS[a] || 0) < BONUS.AKQ ? 'AKQ' : a;
  if (besSurat(kartlar) && (BONUS[k] || 0) < BONUS.SURAT) return 'SURAT';
  if (!BONUS[k] && sahteRenk(kartlar)) return 'SAHTE';
  return k;
}
export function bonusOrani(kartlar) {
  return BONUS[bonusAnahtari(kartlar)] || 0;
}

export function yeniNovo({ adlar, kod, baslangicFis = 1000, ante = 25 }) {
  if (adlar.length < 1 || adlar.length > NOVO_AZAMI_OYUNCU) throw new Error('Novo 1-3 oyuncu');
  return {
    tip: 'novo', kod, baslangicFis, ante, elNo: 0, oyunNo: 1, kasaNet: 0, kasaToplam: 0,
    oyuncular: adlar.map((ad, i) => ({ ad, koltuk: i, fis: baslangicFis })),
    el: null,
  };
}

export function novoYenidenBaslat(g) {
  const y = yeniNovo({ adlar: g.oyuncular.map(o => o.ad), kod: g.kod, baslangicFis: g.baslangicFis, ante: g.ante });
  y.elNo = g.elNo; y.oyunNo = (g.oyunNo || 1) + 1; y.kasaToplam = g.kasaToplam || 0;
  g.oyuncular.forEach((o, i) => { if (o.yan) y.oyuncular[i].yan = { ...o.yan }; });
  return y;
}

// El başına oyuncunun en az ihtiyacı: ante + express + oyna bahsi (2 ante) = 4 ante
export function katilabilir(g, i) {
  return !g.oyuncular[i].mola && g.oyuncular[i].fis >= 4 * g.ante;
}

// Oyuncu masadan kalkar (çipleri onda kalır) ya da geri döner. Yalnız eller arasında;
// dönüş bir sonraki dağıtımda geçerli olur.
export function molaAyarla(g0, i, mola) {
  const g = klon(g0);
  if (g.el && g.el.faz !== 'bitti') throw new Error('El bitince değiştirilebilir');
  if (!g.oyuncular[i]) throw new Error('Oyuncu yok');
  g.oyuncular[i].mola = !!mola;
  return g;
}

// Double (Erman 25 Kas): oyuncu kendi ante'sini ve express'ini 2 katı oynar (kart çekme ve oyna da
// kendi ante'sine göre: 2 kat). Kasaya ve komşuya express masa antesinde kalır. Seçim eller arasında
// değişir, sonraki elde geçerli; para 2 katına yetmezse o el normal oynanır.
export const CIFT_KAT = 2;

// Yan express: oyuncu kendi express'ine ek olarak kasanın ve yanındaki oyuncunun ilk 5 kartına
// express kadar (1 ante) oynayabilir; o ellerde express eli gelirse ödemeyi o alır.
// Komşu: elde oturan, sıradaki (sağındaki) oyuncu. Seçim her an değişir, sonraki elde geçerli.
export function yanAyarla(g0, i, yan) {
  // El sürerken de seçilebilir: bahis dağıtımda alındığı için seçim bir sonraki elde geçerli olur.
  const g = klon(g0);
  if (!g.oyuncular[i]) throw new Error('Oyuncu yok');
  const y = { ...(g.oyuncular[i].yan || {}) };
  if ('kasa' in yan) y.kasa = !!yan.kasa;
  if ('komsu' in yan) y.komsu = !!yan.komsu;
  if ('cift' in yan) y.cift = !!yan.cift;
  g.oyuncular[i].yan = y;
  return g;
}
export function komsusu(katilanlar, i) {
  const s = katilanlar.filter(j => j !== i);
  if (!s.length) return null;
  return s.find(j => j > i) ?? s[0];
}
// Komşulara express masadaki her öteki oyuncuya ayrı ayrı oynanır (Erman 25 Kas: 3 kişide ikisine de).
// Sıra: kendinden sonraki koltuktan başlar, dönerek gelir.
export function komsulari(katilanlar, i) {
  const s = katilanlar.filter(j => j !== i);
  return [...s.filter(j => j > i), ...s.filter(j => j < i)];
}
// Eski eller tek komşu (yanKomsu) taşır; yenileri liste (yanKomsular).
export function komsuBahisleri(p) {
  if (!p) return [];
  if (Array.isArray(p.yanKomsular)) return p.yanKomsular;
  return p.yanKomsu ? [p.yanKomsu] : [];
}

export function ayarla(g0, { ante }) {
  const g = klon(g0);
  if (g.el && g.el.faz !== 'bitti') throw new Error('El sürerken değişmez');
  if (!ANTE_SECENEKLERI.includes(ante)) throw new Error('Geçersiz ante');
  g.ante = ante;
  return g;
}

export function novoDagit(g0, desteVerilen = null) {
  const g = klon(g0);
  if (g.el && g.el.faz !== 'bitti') throw new Error('Önceki el bitmedi');
  const katilanlar = g.oyuncular.map((_, i) => i).filter(i => katilabilir(g, i));
  if (!katilanlar.length) throw new Error('Ante ve bahsi karşılayabilen oyuncu yok');
  g.elNo += 1;
  // Her el bağımsız, tamamen rastgele karıştırılır (kartlar iPad'de açık; telefonla eşleşme gerekmez).
  const deste = desteVerilen || rastgeleDeste();
  const A = g.ante;
  const el = {
    no: g.elNo, faz: 'cekme', ante: A, deste, cek: CEKME,
    krupiye: deste.slice(KRUPIYE, KRUPIYE + 5),
    krupiyeAcik: false, krupiyeOyunu: null, krupiyeDegisim: 0,
    oyuncular: g.oyuncular.map((o, i) => {
      if (!katilanlar.includes(i)) return { katildi: false };
      const ciftIstek = !!(o.yan && o.yan.cift);
      const kat = ciftIstek && o.fis >= 4 * CIFT_KAT * A ? CIFT_KAT : 1;
      const Ap = A * kat; // oyuncunun kendi ante'si
      const B = Ap; // express bonus zorunlu, kendi ante'si kadar
      o.fis -= Ap + B;
      const kartlar = ilkEl(deste, i);
      const oran = bonusOrani(kartlar);
      const bonusOdeme = oran ? B * (oran + 1) : 0;
      o.fis += bonusOdeme;
      return {
        katildi: true, kartlar, ilk: kartlar, ante: Ap, kat, ciftAtlandi: ciftIstek && kat === 1, bonus: B, bonusOran: oran, bonusOdeme,
        ucret: 0, bahis: 0, durum: 'bekliyor', cekti: false, degisti: false, alti: false, satinAldi: null, sonuc: null,
      };
    }),
    sira: null,
  };
  // Yan express: bahis dağıtımda alınır. Komşunun kartları açık, ödeme hemen; kasanınki kasa
  // açılınca (ilk 5 kartına göre) ödenir. Para yetmezse (oyna parası kalmalı) o elde oynanmaz.
  el.krupiyeIlk = el.krupiye.slice();
  el.oyuncular.forEach((p, i) => {
    if (!p.katildi) return;
    const o = g.oyuncular[i], y = o.yan || {};
    p.yanBahis = 0; p.yanOdeme = 0;
    const komsular = y.komsu ? komsulari(katilanlar, i) : [];
    const istenen = (y.kasa ? 1 : 0) + komsular.length;
    if (!istenen) return;
    if (o.fis - istenen * A < 2 * p.ante) { p.yanAtlandi = true; return; }
    if (y.kasa) { o.fis -= A; p.yanBahis += A; p.yanKasa = { bahis: A, oran: 0, odeme: 0 }; }
    if (komsular.length) p.yanKomsular = [];
    for (const k of komsular) {
      const oran = bonusOrani(el.oyuncular[k].ilk);
      const odeme = oran ? A * (oran + 1) : 0;
      o.fis += odeme - A; p.yanBahis += A; p.yanOdeme += odeme;
      p.yanKomsular.push({ bahis: A, kime: k, oran, odeme });
    }
  });
  g.el = el;
  el.sira = sonrakiCekme(g, -1);
  if (el.sira == null) kararaGec(g);
  return g;
}

// Önce herkes sırayla kart çeker (ya da çekmez); oyuna girme kararı herkes kartını aldıktan sonra sorulur.
function sonrakiCekme(g, i) {
  const ol = g.el.oyuncular;
  for (let j = i + 1; j < ol.length; j++) if (ol[j].katildi && ol[j].durum === 'bekliyor' && !ol[j].cekti) return j;
  return null;
}
// Herkes karar verdikten sonra kasa yeni kartları sırayla (koltuk sırasına göre) toplu dağıtır.
function cekmeleriDagit(g) {
  const el = g.el;
  // Kart isteyen varsa, ilk kart dağıtılmadan önce 1 kart gömülür (yalnız bir kez).
  if (el.oyuncular.some(p => p.katildi && p.cekKarar)) el.cekmeYakilan = el.deste[el.cek++];
  for (const p of el.oyuncular) {
    if (!p.katildi || !p.cekKarar) continue;
    if (p.cekKarar.tip === 'degistir') {
      const konum = p.cekKarar.konumlar;
      p.kartlar = p.kartlar.map((k, j) => (konum.includes(j) ? el.deste[el.cek++] : k));
      p.degisenler = konum;
    } else {
      p.kartlar = [...p.kartlar, el.deste[el.cek++]];
    }
    p.cekKarar = null;
  }
}
const bekleyenCekme = el => el.oyuncular.reduce((t, p) => t + (p.cekKarar ? (p.cekKarar.tip === 'alti' ? 1 : p.cekKarar.konumlar.length) : 0), 0);

function kararaGec(g) {
  cekmeleriDagit(g);
  g.el.faz = 'karar';
  g.el.sira = sonrakiKarar(g, -1);
  if (g.el.sira == null) krupiyeAc(g);
}

function sonrakiKarar(g, i) {
  const ol = g.el.oyuncular;
  for (let j = i + 1; j < ol.length; j++) if (ol[j].katildi && ol[j].durum === 'bekliyor') return j;
  return null;
}

// Sigorta: bet'i en az 4 kat ödeyen el (ör. üç as + papaz, kent ve üstü), oynadıktan sonra kasanın oyunu olmazsa diye
// sigorta yapabilir. En az = oyna bahsi (2 ante), en çok = kazanılacak bet parasının yarısı
// (ör. full 7 x 50 / 2 = 175). Parası yetmiyorsa en çok parası kadar.
// Kasanın oyunu yoksa sigorta 1'e 1 öder; kasa oyuna girerse sigorta kasanındır.
export const SIGORTA_EN_AZ_KAT = 4;  // sigorta: en az 4 kat
export const SORU_EN_AZ_KAT = 3;     // kasa boşken "kasaya kart çektir" sorusu: en az 3 kat
export function sigortaSiniri(p, fis, ante) {
  if (betOrani(p.kartlar).oran < SIGORTA_EN_AZ_KAT) return null;
  const oran = betOrani(p.kartlar).oran; // iki kombinasyon varsa toplam kat
  const tavan = Math.floor((oran * p.bahis) / 2 / 5) * 5;
  const enCok = Math.min(tavan, fis);
  if (enCok <= 0) return null;
  return { enAz: Math.min(2 * ante, enCok), enCok };
}

export function novoYasal(g) {
  const el = g.el;
  if (!el || (el.faz !== 'karar' && el.faz !== 'cekme') || el.sira == null) return null;
  const i = el.sira, p = el.oyuncular[i], o = g.oyuncular[i];
  const A = p.ante || el.ante; // oyuncunun kendi ante'si (double ise 2 kat)
  if (el.faz === 'cekme') {
    const ek = o.fis >= A + 2 * A; // ücret + sonra oyna
    return { asama: 'cekme', oyuncu: i, oyna: false, gec: true, pas: true, degistir: ek, alti: ek, kalanKart: 52 - el.cek - bekleyenCekme(el) - 7 };
  }
  if (p.sigortaSor) {
    return { oyuncu: i, sigorta: sigortaSiniri(p, o.fis, A), oyna: false, degistir: false, alti: false, kalanKart: 0 };
  }
  return { asama: 'karar', oyuncu: i, oyna: o.fis >= 2 * A, pas: true, degistir: false, alti: false, kalanKart: 0 };
}

// hamle: { tip: 'pas' | 'oyna' | 'degistir' (konumlar: [0..4]) | 'alti' | 'gec' }
// { tip: 'gec', oyna: true }: "kart çekmiyorum, oynuyorum" — karar sırası gelince tekrar sorulmadan
// oynar (parası yetmezse pas). Sigorta yine sorulur.
export function novoHamle(g0, hamle) {
  let g = hamleUygula(g0, hamle);
  for (let k = 0; k < 4 && g.el && g.el.faz === 'karar' && g.el.sira != null; k++) {
    const y = novoYasal(g);
    if (!y || 'sigorta' in y || !g.el.oyuncular[y.oyuncu].hemenOyna) break;
    g = hamleUygula(g, { tip: y.oyna ? 'oyna' : 'pas' });
  }
  return g;
}
function hamleUygula(g0, hamle) {
  const g = klon(g0);
  const y = novoYasal(g);
  if (!y) throw new Error('Şu an karar beklenmiyor');
  const el = g.el, i = y.oyuncu, p = el.oyuncular[i], o = g.oyuncular[i];
  const A = p.ante || el.ante; // oyuncunun kendi ante'si (double ise 2 kat)
  if ('sigorta' in y && hamle.tip !== 'sigorta') throw new Error('Önce sigorta sorusunu yanıtla');
  if (y.asama === 'cekme') {
    if (hamle.tip === 'oyna') throw new Error('Önce herkes kart çeksin; oyuna girme sonra sorulur');
    if (hamle.tip === 'pas') p.durum = 'pas';
    else if (hamle.tip === 'gec') { if (hamle.oyna) p.hemenOyna = true; /* kart çekmedi */ }
    else if (hamle.tip === 'degistir') {
      if (!y.degistir) throw new Error('Kart çekecek para yok');
      const konum = [...new Set(hamle.konumlar || [])].filter(k => k >= 0 && k < 5).sort();
      if (!konum.length) throw new Error('Değiştirilecek kartları seç');
      if (konum.length > y.kalanKart) throw new Error('Destede yeterli kart kalmadı');
      o.fis -= A; p.ucret += A; p.degisti = true;
      p.cekKarar = { tip: 'degistir', konumlar: konum }; // kartlar herkes karar verince dağıtılır
    } else if (hamle.tip === 'alti') {
      if (!y.alti) throw new Error('6. kart için para yok');
      if (y.kalanKart < 1) throw new Error('Destede kart kalmadı');
      o.fis -= A; p.ucret += A; p.alti = true;
      p.cekKarar = { tip: 'alti' };
    } else throw new Error('Bilinmeyen hamle');
    p.cekti = true;
    el.sira = sonrakiCekme(g, i);
    if (el.sira == null) kararaGec(g);
    return g;
  }
  if (hamle.tip === 'pas') {
    p.durum = 'pas';
  } else if (hamle.tip === 'oyna') {
    if (!y.oyna) throw new Error('Bahis için yeterli fiş yok');
    o.fis -= 2 * A; p.bahis = 2 * A; p.durum = 'oynadi';
    if (sigortaSiniri(p, o.fis, A)) { p.sigortaSor = true; return g; } // aynı oyuncuya sigorta sorulur
  } else if (hamle.tip === 'sigorta') {
    if (!y.sigorta) throw new Error('Şu an sigorta sorulmuyor');
    const m = Math.floor(Number(hamle.miktar) || 0);
    if (m !== 0 && (m < y.sigorta.enAz || m > y.sigorta.enCok)) {
      throw new Error(`Sigorta ${y.sigorta.enAz} ile ${y.sigorta.enCok} arasında olmalı`);
    }
    o.fis -= m; p.sigorta = m; p.sigortaSor = false;
  } else throw new Error('Bilinmeyen hamle');
  el.sira = sonrakiKarar(g, i);
  if (el.sira == null) krupiyeAc(g);
  return g;
}

function krupiyeAc(g) {
  const el = g.el;
  el.krupiyeAcik = true;
  el.sira = null;
  const oynayan = el.oyuncular.filter(p => p.katildi && p.durum === 'oynadi');
  el.krupiyeOyunu = krupiyeOyunuVar(el.krupiye);
  el.ilkOyun = el.krupiyeOyunu; // sigorta kasanın ilk açılışına göre ödenir
  if (!oynayan.length) return bitir(g);
  if (el.krupiyeOyunu) {
    for (const p of oynayan) p.sonuc = karsilastir(p, el.krupiye);
    return bitir(g);
  }
  // Kasanın oyunu yok: eli zayıf olana ante otomatik ödenir; yalnız iyi eli (üçlü ve üstü)
  // olana "ante mi alırsın, oyun mu satın alırsın" sorulur.
  let soru = 0;
  for (const p of oynayan) {
    if (iyiEl(p.kartlar)) { p.satinAldi = null; soru++; }
    else { p.satinAldi = false; p.sonuc = { tip: 'oyunyok' }; }
  }
  if (!soru) return bitir(g);
  el.faz = 'oyunsuz';
}

// Sigorta ve oyun satın alma sorusu yalnız üçlü ve üstünde
// "İyi el": bet'i en az 3 kat ödeyen el (üçlü ve üstü; 6 kartta iki kombinasyonla 3 kata çıkan da,
// ör. üç per = iki per + per). Sigorta ve "kasaya kart çektir" sorusu yalnız bu ellere sorulur.
export function iyiEl(kartlar) {
  return betOrani(kartlar).oran >= SORU_EN_AZ_KAT;
}

// Krupiyenin oyunu yokken: her oyuncu için true (oyun satın al) / false (ante al)
export function oyunSatinAl(g0, secimler) {
  const g = klon(g0);
  const el = g.el;
  if (el.faz !== 'oyunsuz') throw new Error('Şu an oyun satın alınmaz');
  // Yalnız sorusu bekleyenler (eli zayıf olanın ante'si açılışta otomatik ödendi)
  const oynayan = el.oyuncular.map((p, i) => i).filter(i => el.oyuncular[i].katildi && el.oyuncular[i].durum === 'oynadi' && el.oyuncular[i].satinAldi === null);
  const alanlar = [];
  for (const i of oynayan) {
    const p = el.oyuncular[i];
    // Kasaya kart çektirmenin bedeli ante kazancıdır (ante 1:1 alınmaz); ayrı ücret yok, ante yanmaz.
    const al = !!secimler[i];
    if (al) { p.satinAldi = true; alanlar.push(i); }
    else { p.satinAldi = false; p.sonuc = { tip: 'oyunyok' }; }
  }
  if (alanlar.length) {
    // Normal oyundaki gibi: kasa en yüksek kartını atar, desteden bir kart yakar (kapalı atılır)
    // ve sıradaki kartı alır. Tek sefer çeker.
    const enYuksek = el.krupiye.reduce((m, k, j) => (k.d > el.krupiye[m].d ? j : m), 0);
    el.krupiyeAtilan = el.krupiye[enYuksek];
    el.krupiyeYakilan = el.deste[el.cek++];
    el.krupiye = el.krupiye.map((k, j) => (j === enYuksek ? el.deste[el.cek++] : k));
    el.krupiyeYeni = el.krupiye[enYuksek];
    // Kasanın çektiği kartların geçmişi (menüden bakılır): hangi değerler geliyor, şans mı?
    g.kasaCekmeleri = [...(g.kasaCekmeleri || []), { at: el.krupiyeAtilan, yeni: el.krupiyeYeni }].slice(-300);
    const tur = 1;
    el.krupiyeDegisim = tur;
    el.krupiyeOyunu = krupiyeOyunuVar(el.krupiye);
    for (const i of alanlar) {
      const p = el.oyuncular[i];
      p.sonuc = el.krupiyeOyunu ? karsilastir(p, el.krupiye) : { tip: 'oyunyok' };
    }
  }
  bitir(g);
  return g;
}

function karsilastir(p, krupiye) {
  const pd = doperTuru(p.kartlar), kd = doperTuru(krupiye);
  // Gerçek döper yalancı döperi geçer (çiftlerin büyüklüğüne bakılmaz).
  if (pd === 'gercek' && kd === 'yalanci') return { tip: 'kazandi' };
  if (pd === 'yalanci' && kd === 'gercek') return { tip: 'kaybetti' };
  const pg = enIyiEl(p.kartlar).guc, kg = enIyiEl(krupiye).guc;
  const c = gucKarsilastir(pg, kg);
  if (c > 0) return { tip: 'kazandi' };
  if (c === 0) return { tip: 'berabere' };
  return { tip: 'kaybetti' };
}

// Ne ödendi / ne alındı: kalem kalem (iade edilen paralar kalem değildir). Toplamı = net.
function odemeDokumu(p, el, g) {
  const k = [];
  const ad = a => EL_ADI[a];
  if (p.bonusOdeme) k.push({ yazi: `Bonus ödeme ${ad(bonusAnahtari(p.ilk))} ${p.bonusOran}:1`, tutar: p.bonusOdeme - p.bonus });
  else k.push({ yazi: 'Express', tutar: -p.bonus });
  if (p.durum === 'pas') k.push({ yazi: 'Ante (pas)', tutar: -p.ante });
  else if (p.sonuc) {
    const t = p.sonuc.tip;
    if (t === 'oyunyok' && p.satinAldi) k.push({ yazi: 'Kasa çektiği kartla da oyun bulamadı: ante ve bet geri (kart çektirdiği için ante 1:1 yok)', tutar: 0 });
    else if (t === 'oyunyok') k.push({ yazi: 'Ante 1:1 (kasanın oyunu yok)', tutar: p.ante }); // kart alan da alır (Erman, 22 Kas)
    if (t === 'kazandi') {
      k.push({ yazi: 'Ante geri (kasanın oyunu varken ante ödenmez)', tutar: 0 });
      const ek = p.sonuc.ikinciEl != null ? ` + ${EL_ADI[p.sonuc.ikinciEl]} (${ODEME[p.sonuc.ana ?? sinif(p.kartlar).anahtar]}+${ODEME[p.sonuc.ikinciEl]})` : p.sonuc.ikinciAK ? (yalanciAK(p.kartlar) || yalanciIkiPer(p.kartlar) ? ' + As-Papaz (yalancı per)' : p.sonuc.doper === 'yalanci' ? ' (yalancı döper)' : p.sonuc.doper === 'gercek' ? ' (döper)' : ' + As-Papaz') : '';
      k.push({ yazi: `Bet ${p.elAdi}${ek} ${p.sonuc.oran}:1`, tutar: p.bahis * p.sonuc.oran });
    }
    if (t === 'berabere') k.push({ yazi: 'Berabere: ante ve bet geri', tutar: 0 });
    if (t === 'kaybetti') k.push({ yazi: `Kasa kazandı (${el.krupiyeElAdi || EL_ADI[sinif(el.krupiye).anahtar]})`, tutar: -(p.ante + p.bahis) });
  }
  if (p.ucret) k.push({ yazi: p.alti ? '6. kart' : 'Kart çekme', tutar: -p.ucret });
  const yanAd = a => (a === 'SAHTE' ? 'Sahte renk' : EL_ADI[a]);
  if (p.yanKasa) k.push(p.yanKasa.odeme ? { yazi: `Kasaya express ${yanAd(bonusAnahtari(el.krupiyeIlk || el.krupiye))} ${p.yanKasa.oran}:1`, tutar: p.yanKasa.odeme - p.yanKasa.bahis } : { yazi: 'Kasaya express', tutar: -p.yanKasa.bahis });
  for (const yk of komsuBahisleri(p)) {
    const kp = el.oyuncular[yk.kime], kad = g && g.oyuncular[yk.kime] ? ` (${g.oyuncular[yk.kime].ad})` : '';
    k.push(yk.odeme ? { yazi: `Komşuya express${kad} ${yanAd(bonusAnahtari(kp.ilk))} ${yk.oran}:1`, tutar: yk.odeme - yk.bahis } : { yazi: `Komşuya express${kad}`, tutar: -yk.bahis });
  }
  if (p.ciftAtlandi) k.push({ yazi: 'Double oynanmadı (para yetmedi)', tutar: 0 });
  if (p.yanAtlandi) k.push({ yazi: 'Yan express oynanmadı (para yetmedi)', tutar: 0 });
  if (p.sigorta) k.push(p.sigortaGeri ? { yazi: 'Sigorta 1:1', tutar: p.sigorta } : { yazi: 'Sigorta yandı (kasa açtı)', tutar: -p.sigorta });
  return k;
}

function bitir(g) {
  const el = g.el;
  el.faz = 'bitti';
  el.krupiyeAcik = true;
  el.krupiyeElAdi = EL_ADI[sinif(el.krupiye).anahtar];
  el.oyuncular.forEach((p, i) => {
    if (!p.katildi) return;
    const o = g.oyuncular[i];
    let geri = 0, odeme = 0;
    const s = sinif(p.kartlar);
    if (p.durum === 'oynadi' && p.sonuc) {
      if (p.sonuc.tip === 'oyunyok') {
        // Kasanın oyunu yok: ante 1:1, bet geri. Kart değiştiren ya da 6. kartı alan da ante kazancını alır
        // (Erman, 22 Kas 2026). Yalnız kasaya kart çektiren (kasa yine boş açtıysa) ante kazancından vazgeçmiştir.
        geri = p.ante + p.bahis + (p.satinAldi ? 0 : p.ante);
      } else if (p.sonuc.tip === 'kazandi') {
        const b = betOrani(p.kartlar);
        odeme = p.bahis * b.oran;
        // Kasanın oyunu varken ante 1:1 ödenmez, yalnız iade edilir; kazanç bet'ten gelir (Erman, 22 Kas 2026).
        geri = p.ante + p.bahis + odeme;
        p.sonuc.oran = b.oran;
        p.sonuc.ikinciAK = !!b.ek;
        p.sonuc.ikinciEl = b.ikinci;
        p.sonuc.doper = doperTuru(p.kartlar);
      } else if (p.sonuc.tip === 'berabere') {
        geri = p.ante + p.bahis;
      }
    }
    // Sigorta: kasanın (açılıştaki) oyunu yoksa 1'e 1
    p.sigortaGeri = 0;
    if (p.sigorta) p.sigortaGeri = el.ilkOyun ? 0 : 2 * p.sigorta;
    geri += p.sigortaGeri;
    if (p.yanKasa) {
      const oran = bonusOrani(el.krupiyeIlk || el.krupiye);
      p.yanKasa.oran = oran; p.yanKasa.odeme = oran ? p.yanKasa.bahis * (oran + 1) : 0;
      geri += p.yanKasa.odeme; p.yanOdeme = (p.yanOdeme || 0) + p.yanKasa.odeme;
    }
    o.fis += geri;
    p.geri = geri;
    p.elAdi = EL_ADI[s.anahtar];
    // net: bu elde fişindeki değişim
    p.net = geri - (p.yanKasa ? p.yanKasa.odeme : 0) + (p.yanOdeme || 0) + p.bonusOdeme - (p.ante + p.bonus + p.bahis + p.ucret + (p.sigorta || 0) + (p.yanBahis || 0));
    p.odemeler = odemeDokumu(p, el, g);
  });
  const ks = sinif(el.krupiye);
  el.krupiyeElAdi = EL_ADI[ks.anahtar];
  // Kasa: oyuncuların kaybettiği kasanın kazancıdır.
  const oyuncuNet = el.oyuncular.reduce((t, p) => t + (p.katildi ? p.net : 0), 0);
  el.kasaNet = -oyuncuNet;
  g.kasaNet = (g.kasaNet || 0) - oyuncuNet;      // bu oyun (herkese 1000 verildiğinden beri)
  g.kasaToplam = (g.kasaToplam || 0) - oyuncuNet; // masa açıldığından beri
}

export function novoToplam(g) {
  // Kasaya karşı oynandığı için toplam korunmaz; testlerde oyuncu kayıtlarını izlemek için.
  return g.oyuncular.reduce((t, o) => t + o.fis, 0);
}

// Tabletten ek para yükleme (yalnız eller arasında). Kasanın hesabını değiştirmez.
export function paraYukle(g0, i, miktar) {
  const g = klon(g0);
  if (g.el && g.el.faz !== 'bitti') throw new Error('El bitince yüklenebilir');
  const m = Math.floor(Number(miktar));
  if (!(m > 0) || m % 5) throw new Error("Tutar 5'in katı olmalı");
  const o = g.oyuncular[i];
  o.fis += m;
  o.yuklenen = (o.yuklenen || 0) + m;
  return g;
}
