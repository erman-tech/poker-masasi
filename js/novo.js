// Novo Poker: kasaya (krupiyeye) karşı, oyuncular birbirine karşı değil.
// Akış: ante + zorunlu express bonus (ante kadar) → herkese 5 açık kart, krupiyeye 5 kart (1'i açık)
// → bonus ilk ele göre HEMEN ödenir → her oyuncu sırayla: pas / oyna / kart değiştir / 6. kart al
// → krupiye açar: oyunu (As-Papaz ya da daha iyisi) yoksa oyuna giren oyuncu ante'yi alır
//   ya da 1 ante ödeyip krupiyeye oyun satın alır → karşılaştırma ve ödeme tablosu.
// Saf: her fonksiyon yeni durum döndürür.
import { rastgeleDeste, enIyiEl, gucKarsilastir } from './kart.js';

const klon = o => JSON.parse(JSON.stringify(o));

export const NOVO_AZAMI_OYUNCU = 4;
export const ANTE_SECENEKLERI = [5, 10, 25, 50, 100];
// Express bonus zorunlu ve ante kadar: giriş = ante + express. Kart çekme = ante, oyna = 2 x ante.

// Ana bahis ödeme tablosu (bahis = 2 x ante üzerinden, kaça bir)
export const ODEME = { AK: 1, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 7, 7: 20, SF: 50, RF: 100 };
// İlk 5 kart bonusu (kaça bir)
// Erman'ın oranları: full 100, renk 60, kent 30, üçlü 8, iki çift yok. Kare ve üstü eski tabloda.
export const BONUS = { AKQ: 5, 3: 8, 4: 30, 5: 60, 6: 100, 7: 200, SF: 500, RF: 1000 };

export const EL_ADI = {
  0: 'Yüksek kart', AK: 'As-Papaz', AKQ: 'As-Papaz-Kız', 1: 'Bir çift', 2: 'İki çift', 3: 'Üçlü', 4: 'Kent',
  5: 'Renk', 6: 'Full', 7: 'Kare', SF: 'Renkli kent', RF: 'Royal flush',
};

// Destede yer: koltuk i'nin ilk 5 kartı 5i..5i+4, krupiye 20..24 (24 açık kart),
// değişen ve satın alınan kartlar 25'ten itibaren sırayla.
export function ilkEl(deste, koltuk) { return deste.slice(5 * koltuk, 5 * koltuk + 5); }
const KRUPIYE = 20, CEKME = 25;

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

// Express ilk 5 karta göre. As-Papaz-Kız (yüksek kart) 5'e 1 öder ama oyunda per sayılmaz
// (oyunda yalnız As-Papaz olarak kalır).
export function bonusAnahtari(kartlar) {
  const a = sinif(kartlar).anahtar;
  if (a === 'AK' && kartlar.some(k => k.d === 12)) return 'AKQ';
  return a;
}
export function bonusOrani(kartlar) {
  return BONUS[bonusAnahtari(kartlar)] || 0;
}

export function yeniNovo({ adlar, kod, baslangicFis = 1000, ante = 25 }) {
  if (adlar.length < 1 || adlar.length > NOVO_AZAMI_OYUNCU) throw new Error('Novo 1-4 oyuncu');
  return {
    tip: 'novo', kod, baslangicFis, ante, elNo: 0, oyunNo: 1, kasaNet: 0, kasaToplam: 0,
    oyuncular: adlar.map((ad, i) => ({ ad, koltuk: i, fis: baslangicFis })),
    el: null,
  };
}

export function novoYenidenBaslat(g) {
  const y = yeniNovo({ adlar: g.oyuncular.map(o => o.ad), kod: g.kod, baslangicFis: g.baslangicFis, ante: g.ante });
  y.elNo = g.elNo; y.oyunNo = (g.oyunNo || 1) + 1; y.kasaToplam = g.kasaToplam || 0;
  return y;
}

// El başına oyuncunun en az ihtiyacı: ante + express + oyna bahsi (2 ante) = 4 ante
export function katilabilir(g, i) {
  return g.oyuncular[i].fis >= 4 * g.ante;
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
    no: g.elNo, faz: 'karar', ante: A, deste, cek: CEKME,
    krupiye: deste.slice(KRUPIYE, KRUPIYE + 5),
    krupiyeAcik: false, krupiyeOyunu: null, krupiyeDegisim: 0,
    oyuncular: g.oyuncular.map((o, i) => {
      if (!katilanlar.includes(i)) return { katildi: false };
      const B = A; // express bonus zorunlu, ante kadar
      o.fis -= A + B;
      const kartlar = ilkEl(deste, i);
      const oran = bonusOrani(kartlar);
      const bonusOdeme = oran ? B * (oran + 1) : 0;
      o.fis += bonusOdeme;
      return {
        katildi: true, kartlar, ilk: kartlar, ante: A, bonus: B, bonusOran: oran, bonusOdeme,
        ucret: 0, bahis: 0, durum: 'bekliyor', degisti: false, alti: false, satinAldi: null, sonuc: null,
      };
    }),
    sira: null,
  };
  g.el = el;
  el.sira = sonrakiKarar(g, -1);
  if (el.sira == null) krupiyeAc(g);
  return g;
}

function sonrakiKarar(g, i) {
  const ol = g.el.oyuncular;
  for (let j = i + 1; j < ol.length; j++) if (ol[j].katildi && ol[j].durum === 'bekliyor') return j;
  return null;
}

// Sigorta: eli üçlü ya da daha iyi olan oyuncu, oynadıktan sonra kasanın oyunu olmazsa diye
// sigorta yapabilir. En az = oyna bahsi (2 ante), en çok = kazanılacak bet parasının yarısı
// (ör. full 7 x 50 / 2 = 175). Parası yetmiyorsa en çok parası kadar.
// Kasanın oyunu yoksa sigorta 1'e 1 öder; kasa oyuna girerse sigorta kasanındır.
export const SIGORTA_EN_AZ_KAT = 3; // üçlü
export function sigortaSiniri(p, fis, ante) {
  const s = sinif(p.kartlar);
  const kat = s.anahtar === 'RF' ? 9 : s.anahtar === 'SF' ? 8 : s.anahtar;
  if (typeof kat !== 'number' || kat < SIGORTA_EN_AZ_KAT) return null;
  const oran = ODEME[s.anahtar] || 0;
  const tavan = Math.floor((oran * p.bahis) / 2 / 5) * 5;
  const enCok = Math.min(tavan, fis);
  if (enCok <= 0) return null;
  return { enAz: Math.min(2 * ante, enCok), enCok };
}

export function novoYasal(g) {
  const el = g.el;
  if (!el || el.faz !== 'karar' || el.sira == null) return null;
  const i = el.sira, p = el.oyuncular[i], o = g.oyuncular[i];
  const A = el.ante;
  if (p.sigortaSor) {
    return { oyuncu: i, sigorta: sigortaSiniri(p, o.fis, A), oyna: false, degistir: false, alti: false, kalanKart: 0 };
  }
  const ekAlinabilir = !p.degisti && !p.alti && o.fis >= A + 2 * A; // ücret + sonra oyna
  return {
    oyuncu: i,
    oyna: o.fis >= 2 * A,
    degistir: ekAlinabilir,
    alti: ekAlinabilir,
    kalanKart: 52 - el.cek - 7, // krupiye değişimi için 7 kart ayrılır
  };
}

// hamle: { tip: 'pas' | 'oyna' | 'degistir' (konumlar: [0..4]) | 'alti' }
export function novoHamle(g0, hamle) {
  const g = klon(g0);
  const y = novoYasal(g);
  if (!y) throw new Error('Şu an karar beklenmiyor');
  const el = g.el, i = y.oyuncu, p = el.oyuncular[i], o = g.oyuncular[i];
  const A = el.ante;
  if ('sigorta' in y && hamle.tip !== 'sigorta') throw new Error('Önce sigorta sorusunu yanıtla');
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
  } else if (hamle.tip === 'degistir') {
    if (!y.degistir) throw new Error('Kart değiştiremezsin');
    const konum = [...new Set(hamle.konumlar || [])].filter(k => k >= 0 && k < 5).sort();
    if (!konum.length) throw new Error('Değiştirilecek kartları seç');
    if (konum.length > y.kalanKart) throw new Error('Destede yeterli kart kalmadı');
    o.fis -= A; p.ucret += A; p.degisti = true;
    p.kartlar = p.kartlar.map((k, j) => (konum.includes(j) ? el.deste[el.cek++] : k));
    p.degisenler = konum;
    return g; // aynı oyuncu şimdi oynar ya da pas geçer
  } else if (hamle.tip === 'alti') {
    if (!y.alti) throw new Error('6. kart alamazsın');
    if (y.kalanKart < 1) throw new Error('Destede kart kalmadı');
    o.fis -= A; p.ucret += A; p.alti = true;
    p.kartlar = [...p.kartlar, el.deste[el.cek++]];
    return g;
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
export function iyiEl(kartlar) {
  const a = sinif(kartlar).anahtar;
  return a === 'SF' || a === 'RF' || (typeof a === 'number' && a >= SIGORTA_EN_AZ_KAT);
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
    const al = !!secimler[i] && g.oyuncular[i].fis >= el.ante;
    if (al) { g.oyuncular[i].fis -= el.ante; p.ucret += el.ante; p.satinAldi = true; alanlar.push(i); }
    else { p.satinAldi = false; p.sonuc = { tip: 'oyunyok' }; }
  }
  if (alanlar.length) {
    // Krupiye en yüksek kartını değiştirir; eli değişene kadar (yeni sınıf ya da renk) tekrarlar.
    const once = sinif(el.krupiye).el.guc;
    let tur = 0;
    while (tur < 7) {
      const enYuksek = el.krupiye.reduce((m, k, j) => (k.d > el.krupiye[m].d ? j : m), 0);
      el.krupiye = el.krupiye.map((k, j) => (j === enYuksek ? el.deste[el.cek++] : k));
      tur++;
      const yeni = enIyiEl(el.krupiye).guc;
      if (yeni[0] !== once[0] || yeni[0] === 5) break;
    }
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
function odemeDokumu(p, el) {
  const k = [];
  const ad = a => EL_ADI[a];
  if (p.bonusOdeme) k.push({ yazi: `Express ${ad(bonusAnahtari(p.ilk))} ${p.bonusOran}:1`, tutar: p.bonusOdeme - p.bonus });
  else k.push({ yazi: 'Express', tutar: -p.bonus });
  const anteKazanir = p.ucret === 0;
  if (p.durum === 'pas') k.push({ yazi: 'Ante (pas)', tutar: -p.ante });
  else if (p.sonuc) {
    const t = p.sonuc.tip;
    if (t === 'oyunyok') k.push(anteKazanir ? { yazi: 'Ante 1:1 (kasanın oyunu yok)', tutar: p.ante } : { yazi: 'Ante geri (kasanın oyunu yok)', tutar: 0 });
    if (t === 'kazandi') {
      k.push(anteKazanir ? { yazi: 'Ante 1:1', tutar: p.ante } : { yazi: 'Ante geri', tutar: 0 });
      const ek = p.sonuc.ikinciAK ? (p.sonuc.doper === 'yalanci' ? ' (yalancı döper)' : p.sonuc.doper === 'gercek' ? ' (döper)' : ' + As-Papaz') : '';
      k.push({ yazi: `Bet ${p.elAdi}${ek} ${p.sonuc.oran}:1`, tutar: p.bahis * p.sonuc.oran });
    }
    if (t === 'berabere') k.push({ yazi: 'Berabere: ante ve bet geri', tutar: 0 });
    if (t === 'kaybetti') k.push({ yazi: `Kasa kazandı (${el.krupiyeElAdi || EL_ADI[sinif(el.krupiye).anahtar]})`, tutar: -(p.ante + p.bahis) });
  }
  if (p.ucret) k.push({ yazi: p.satinAldi ? 'Kart çekme / oyun satın alma' : (p.alti ? '6. kart' : 'Kart çekme'), tutar: -p.ucret });
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
      const anteKazanir = p.ucret === 0; // kart değiştiren / satın alan ante kazanmaz, geri alır
      if (p.sonuc.tip === 'oyunyok') {
        geri = p.ante + p.bahis + (anteKazanir ? p.ante : 0);
      } else if (p.sonuc.tip === 'kazandi') {
        const oran = ODEME[s.anahtar] || 0;
        const ek = ikinciAK(p.kartlar) || doperTuru(p.kartlar) === 'yalanci' ? 1 : 0;
        odeme = p.bahis * (oran + ek);
        geri = p.ante + p.bahis + odeme + (anteKazanir ? p.ante : 0);
        p.sonuc.oran = oran + ek;
        p.sonuc.ikinciAK = !!ek;
        p.sonuc.doper = doperTuru(p.kartlar);
      } else if (p.sonuc.tip === 'berabere') {
        geri = p.ante + p.bahis;
      }
    }
    // Sigorta: kasanın (açılıştaki) oyunu yoksa 1'e 1
    p.sigortaGeri = 0;
    if (p.sigorta) p.sigortaGeri = el.ilkOyun ? 0 : 2 * p.sigorta;
    geri += p.sigortaGeri;
    o.fis += geri;
    p.geri = geri;
    p.elAdi = EL_ADI[s.anahtar];
    // net: bu elde fişindeki değişim
    p.net = geri + p.bonusOdeme - (p.ante + p.bonus + p.bahis + p.ucret + (p.sigorta || 0));
    p.odemeler = odemeDokumu(p, el);
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
