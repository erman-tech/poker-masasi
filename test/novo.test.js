import test from 'node:test';
import assert from 'node:assert/strict';
import { kartlariOku as K, yeniDeste, kartYazi, rastgeleDeste } from '../js/kart.js';
import {
  novoHamle as novoHamleGercek,
  yeniNovo, novoDagit, novoYasal, oyunSatinAl, sinif, ikinciAK, krupiyeOyunuVar,
  bonusOrani, novoYenidenBaslat, KOLTUK_BASI, KRUPIYE, CEKME, YAKILAN_ILK,
} from '../js/novo.js';

// 0..2 yakılır; koltuk i: 3+5i ; krupiye 18..22 (22 açık) ; çekme 23'ten
function deste(eller, krupiye, cekilecek = '') {
  const d = new Array(52).fill(null);
  eller.forEach((e, i) => K(e).forEach((k, j) => { d[KOLTUK_BASI(i) + j] = k; }));
  K(krupiye).forEach((k, j) => { d[KRUPIYE + j] = k; });
  if (cekilecek) K(cekilecek).forEach((k, j) => { d[CEKME + j] = k; });
  const kul = new Set(d.filter(Boolean).map(kartYazi));
  const kalan = yeniDeste().filter(k => !kul.has(kartYazi(k)));
  for (let i = 0; i < 52; i++) if (!d[i]) d[i] = kalan.shift();
  return d;
}
const oyun = (adlar = ['Erman', 'Fidan', 'Emrah']) => yeniNovo({ adlar, kod: 'N1', ante: 10 }); // testte ante 10: express 10, çekme 10, oyna 20
const fis = g => g.oyuncular.map(o => o.fis);
// Oyna; sigorta sorulursa sigortasız devam et.
// Eski testler oyuncu oyuncu yazıldı: 'oyna' geldiğinde çekme aşaması hâlâ sürüyorsa kalan oyuncular çekmeden geçer.
function novoHamle(g, h) {
  while (g.el && g.el.faz === 'cekme' && (h.tip === 'oyna' || h.tip === 'sigorta')) g = novoHamleGercek(g, { tip: 'gec' });
  return novoHamleGercek(g, h);
}
const oyna0 = g => { g = novoHamle(g, { tip: 'oyna' }); const y = novoYasal(g); return y && 'sigorta' in y ? novoHamle(g, { tip: 'sigorta', miktar: 0 }) : g; };

test('el sınıfları ve krupiye oyunu', () => {
  assert.equal(sinif(K('Ah Kd 7c 5s 2d')).anahtar, 'AK');
  assert.equal(sinif(K('Ah Qd 7c 5s 2d')).anahtar, 0);
  assert.equal(sinif(K('Ah Kh Qh Jh Th')).anahtar, 'RF');
  assert.equal(sinif(K('9h Kh Qh Jh Th')).anahtar, 'SF');
  assert.equal(krupiyeOyunuVar(K('Ah Kd 7c 5s 2d')), true, 'As-Papaz oyun sayılır');
  assert.equal(krupiyeOyunuVar(K('Ah Qd 7c 5s 2d')), false);
  assert.equal(krupiyeOyunuVar(K('2h 2d 7c 5s 9d')), true);
});

test('ikinci kombinasyon: çiftin dışında As ve Papaz', () => {
  assert.equal(ikinciAK(K('7h 7d Ac Ks 2d')), true);
  assert.equal(ikinciAK(K('Ah Ad Kc 7s 2d')), false, 'As çiftin içinde');
  assert.equal(ikinciAK(K('7h 7d Ac Qs 2d')), false);
  assert.equal(ikinciAK(K('Ah Kh Qh Jh Th')), false);
});

test('bonus ilk ele göre dağıtımda hemen ödenir', () => {
  let g = novoDagit(oyun(), deste(['7h 7d 7c 2s 9d', 'Ah Ad 3c 5s 9h', '2h 4d 6c 8s Td'], '3h 4h 8d Jc Qs'));
  // Herkes ante 10 + express 10 öder. Erman üçlü 8'e 1 → 90 geri. 1000 - 20 + 90 = 1070
  assert.deepEqual(fis(g), [1070, 980, 980]);
  assert.equal(g.el.oyuncular[0].bonusOran, 8);
  assert.equal(g.el.oyuncular[2].bonusOdeme, 0, 'Emrah bonusu kaybetti');
  assert.equal(bonusOrani(K('Ah Ad 3c 5s 9h')), 0, 'tek çift bonus almaz');
  assert.equal(bonusOrani(K('Ah Ad 3c 3s 9h')), 0, 'iki çift bonus almaz');
  assert.equal(bonusOrani(K('Ah Ad Ac 3s 3h')), 100, 'full 100');
  assert.equal(bonusOrani(K('2h 7h 9h Jh 4h')), 60, 'renk 60');
  assert.equal(bonusOrani(K('5h 6d 7c 8s 9h')), 30, 'kent 30');
  assert.equal(g.el.krupiyeAcik, false);
});

test('pas: ante gider; oyna: krupiye oyunlu, iyi el kazanır', () => {
  // Krupiye: Q çifti. Erman renk, Fidan pas, Emrah yüksek kart (kaybeder)
  let g = novoDagit(oyun(), deste(['2h 5h 9h Jh Kh', 'Ah Ad 3c 5s 9d', '2c 4d 6c 8s Td'], 'Qc Qd 3d 7s 4c'));
  g = oyna0(g);
  g = novoHamle(g, { tip: 'pas' });
  g = oyna0(g);
  assert.equal(g.el.faz, 'bitti');
  // Erman: express renk 60'a 1 → 610; oyna: renk 5'e 1 → 20+100 + ante 10 geri = 130 (kasa oyunluyken ante ödenmez)
  // 1000 - 20 + 610 - 20 + 130 = 1700. Fidan pas: 980. Emrah kaybetti: 960.
  assert.deepEqual(fis(g), [1700, 980, 960]);
  assert.equal(g.el.oyuncular[0].net, 700);
  assert.equal(g.el.oyuncular[2].sonuc.tip, 'kaybetti');
});

test('kart değiştirme: 1 kart gömülür, seçilen kartlar sırayla gelir, ücret gider, ante kazanılmaz', () => {
  let g = novoDagit(oyun(['Erman']), deste(['7h 7d 2c 4s 9d'], 'Qc Qd 3d 8s 4c', '2h 7c 7s Kd'));
  let y = novoYasal(g);
  assert.equal(y.degistir, true);
  g = novoHamle(g, { tip: 'degistir', konumlar: [2, 3, 4] });
  assert.deepEqual(g.el.oyuncular[0].kartlar.map(kartYazi), ['7♥', '7♦', '7♣', '7♠', 'K♦']);
  y = novoYasal(g);
  assert.equal(y.degistir, false, 'bir kez'); assert.equal(y.alti, false);
  g = oyna0(g);
  // 10 ante + 10 express + 10 ücret + 20 bahis = 50. Kare 20'ye 1 → 20+400+ante 10 = 430
  assert.equal(fis(g)[0], 1000 - 50 + 430);
});

test('6. kart: en iyi 5 kart sayılır', () => {
  let g = novoDagit(oyun(['Erman']), deste(['2h 5h 9h Jh 3c'], 'Qc Qd 3d 8s 4c', 'Kh'));
  g = novoHamle(g, { tip: 'alti' });
  assert.equal(g.el.oyuncular[0].kartlar.length, 6);
  g = oyna0(g);
  assert.equal(g.el.oyuncular[0].elAdi, 'Renk');
  assert.equal(fis(g)[0], 1000 - 50 + (10 + 20 + 100));
});

test('beraberlik: ante ve bahis geri', () => {
  let g = novoDagit(oyun(['Erman']), deste(['Qh Qs 3c 8d 4h'], 'Qc Qd 3d 8s 4c'));
  g = oyna0(g);
  assert.equal(g.el.oyuncular[0].sonuc.tip, 'berabere');
  assert.equal(fis(g)[0], 1000 - 10, 'yalnız express gider');
});

test('kasanın oyunu yok, el zayıf: ante sormadan otomatik ödenir', () => {
  let g = novoDagit(oyun(['Erman']), deste(['2h 2d 3c 8d 4h'], 'Jc 9d 3d 7s 5c'));
  g = oyna0(g);
  assert.equal(g.el.faz, 'bitti');
  assert.equal(fis(g)[0], 1000, 'ante kazancı express kaybını karşılar');
});

test('oyun satın alma: krupiye en yüksek kartını değiştirir, oyun doğarsa karşılaştırılır', () => {
  // Krupiye J yüksek. Satın alınca J (en yüksek) değişir; gelen 9 → 9 çifti, oyun var.
  let g = novoDagit(oyun(['Erman']), deste(['Th Td Tc 8d 4h'], 'Jc 9d 3d 7s 5c', '9s'));
  g = oyna0(g);
  assert.equal(g.el.faz, 'oyunsuz', 'iyi elde (üçlü) soru sorulur');
  g = oyunSatinAl(g, [true]);
  assert.equal(g.el.krupiyeOyunu, true);
  assert.equal(g.el.krupiyeDegisim, 1);
  assert.equal(g.el.oyuncular[0].sonuc.tip, 'kazandi');
  // koydu: 10 ante + 10 express + 20 = 40 (kart çektirme ücretsiz); express üçlü 8:1 → +90; üçlü 3:1 → ante geri 10 + 20 + 60 = 90
  assert.equal(fis(g)[0], 1000 - 40 + 90 + 90);
});

test('ikinci As-Papaz ödemesi çiftin üstüne eklenir', () => {
  let g = novoDagit(oyun(['Erman']), deste(['7h 7d Ac Ks 2d'], 'Qc 4d 3d 8s 4c'));
  g = oyna0(g);
  const p = g.el.oyuncular[0];
  assert.equal(p.sonuc.tip, 'kazandi'); assert.equal(p.sonuc.oran, 2);
  assert.equal(fis(g)[0], 1000 - 40 + (10 + 20 + 40));
});

test('fişi yetmeyen ele girmez; yeniden başlat herkese 1000', () => {
  let g = oyun();
  g.oyuncular[1].fis = 25;
  g = novoDagit(g);
  assert.equal(g.el.oyuncular[1].katildi, false);
  g.el.faz = 'bitti';
  const y = novoYenidenBaslat(g);
  assert.deepEqual(fis(y), [1000, 1000, 1000]);
  assert.equal(y.elNo, g.elNo);
});

test('her el bağımsız ve rastgele: 10.000 elde hiçbir dağıtım tekrar etmez', () => {
  const gorulen = new Set();
  for (let n = 0; n < 10000; n++) {
    const d = rastgeleDeste();
    assert.equal(new Set(d.map(kartYazi)).size, 52);
    gorulen.add(d.slice(0, 25).map(kartYazi).join(''));
  }
  assert.equal(gorulen.size, 10000);
});

test('rastgele deste: her kart her konuma eşit olasılıkla (ki-kare)', () => {
  const N = 26000, say = Array.from({ length: 52 }, () => new Array(52).fill(0));
  const sira = k => ['s', 'h', 'd', 'c'].indexOf(k.r) * 13 + (k.d - 2);
  for (let n = 0; n < N; n++) rastgeleDeste().forEach((k, pos) => say[sira(k)][pos]++);
  const bek = N / 52;
  let ki = 0;
  for (const s of say) for (const v of s) ki += (v - bek) ** 2 / bek;
  assert.ok(ki > 2601 - 260 && ki < 2601 + 260, 'ki-kare ' + ki.toFixed(0));
});

test('rastgele oyunlarda motor takılmaz, fiş eksiye düşmez', () => {
  for (let tur = 0; tur < 2000; tur++) {
    let g = yeniNovo({ adlar: ['A', 'B', 'C', 'D'].slice(0, 1 + (tur % 3)), kod: 'X', ante: 10 });
    for (let el = 0; el < 3; el++) {
      g = novoDagit(g);
      let adim = 0;
      while (g.el.faz !== 'bitti') {
        assert.ok(++adim < 30);
        if (g.el.faz === 'oyunsuz') { g = oyunSatinAl(g, g.oyuncular.map(() => Math.random() < 0.5)); continue; }
        const y = novoYasal(g);
        if ('sigorta' in y) { g = novoHamle(g, { tip: 'sigorta', miktar: Math.random() < 0.5 ? 0 : y.sigorta.enCok }); continue; }
        const r = Math.random();
        if (r < 0.2) g = novoHamle(g, { tip: 'pas' });
        else if (r < 0.4 && y.degistir) g = novoHamle(g, { tip: 'degistir', konumlar: [0, 2, 4].filter(() => Math.random() < 0.7).concat([1]) });
        else if (r < 0.5 && y.alti) g = novoHamle(g, { tip: 'alti' });
        else if (y.asama === 'cekme') g = novoHamleGercek(g, { tip: 'gec' });
        else if (y.oyna) g = oyna0(g);
        else g = novoHamle(g, { tip: 'pas' });
      }
      assert.ok(g.oyuncular.every(o => o.fis >= 0));
      for (const p of g.el.oyuncular) if (p.katildi) assert.equal(new Set(p.kartlar.map(kartYazi)).size, p.kartlar.length);
      if (!g.oyuncular.some(o => o.fis >= 4 * g.ante)) break;
    }
  }
});

test('kasanın artısı/eksisi oyuncuların toplam kaybına eşit', () => {
  let g = novoDagit(oyun(), deste(['2h 5h 9h Jh Kh', 'Ah Ad 3c 5s 9d', '2c 4d 6c 8s Td'], 'Qc Qd 3d 7s 4c'));
  g = oyna0(g); g = novoHamle(g, { tip: 'pas' }); g = oyna0(g);
  const oyuncuDegisim = g.oyuncular.reduce((t, o) => t + o.fis - 1000, 0);
  assert.equal(g.kasaNet, -oyuncuDegisim);
  assert.equal(g.kasaNet, -(700 - 20 - 40));
  const y = novoYenidenBaslat(g);
  assert.equal(y.kasaNet, 0); assert.equal(y.kasaToplam, g.kasaToplam);
});

test('para yükleme: yalnız el bitince, kasanın hesabını değiştirmez', async () => {
  const { paraYukle } = await import('../js/novo.js');
  let g = oyun();
  g.oyuncular[1].fis = 0;
  g = paraYukle(g, 1, 500);
  assert.equal(g.oyuncular[1].fis, 500); assert.equal(g.oyuncular[1].yuklenen, 500);
  assert.equal(g.kasaNet, 0);
  assert.throws(() => paraYukle(g, 1, 7), /katı/);
  g = novoDagit(g);
  if (g.el.faz !== 'bitti') assert.throws(() => paraYukle(g, 0, 100), /El bitince/);
});

// --- Kasayı geçtin mi? Bağımsız bir el değerlendiriciyle çapraz kontrol ---
// Oyunun değerlendiricisi 5'li kombinasyonları tarar. Buradaki ise farklı bir yöntemle
// (sayım + sıralama, kombinasyon taraması yok) yalnız 5 kartı puanlar. İkisi 50.000 rastgele
// el çiftinde aynı kazananı bulmalı.
function referansPuan(kartlar) {
  const d = kartlar.map(k => k.d).sort((a, b) => b - a);
  const renk = new Set(kartlar.map(k => k.r)).size === 1;
  const tek = [...new Set(d)];
  let kentTepe = 0;
  if (tek.length === 5 && d[0] - d[4] === 4) kentTepe = d[0];
  if (tek.length === 5 && d.join() === '14,5,4,3,2') kentTepe = 5;
  const say = {};
  d.forEach(x => { say[x] = (say[x] || 0) + 1; });
  const gruplar = Object.entries(say).map(([v, n]) => [n, +v]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const imza = gruplar.map(g => g[0]).join('');
  const sirali = gruplar.map(g => g[1]);
  let kat;
  if (kentTepe && renk) kat = 8; else if (imza === '41') kat = 7; else if (imza === '32') kat = 6;
  else if (renk) kat = 5; else if (kentTepe) kat = 4; else if (imza === '311') kat = 3;
  else if (imza === '221') kat = 2; else if (imza === '2111') kat = 1; else kat = 0;
  const bozucu = kentTepe ? [kentTepe] : sirali;
  return [kat, ...bozucu].reduce((t, x) => t * 15 + x, 0) * Math.pow(15, 6 - bozucu.length);
}

test('kasa karşılaştırması: 50.000 rastgele elde bağımsız değerlendiriciyle aynı sonuç', async () => {
  const { enIyiEl, gucKarsilastir } = await import('../js/kart.js');
  let farkli = 0, berabere = 0;
  for (let n = 0; n < 50000; n++) {
    const d = rastgeleDeste();
    const oyuncu = d.slice(0, 5), kasa = d.slice(5, 10);
    const a = Math.sign(gucKarsilastir(enIyiEl(oyuncu).guc, enIyiEl(kasa).guc));
    const b = Math.sign(referansPuan(oyuncu) - referansPuan(kasa));
    if (a !== b) farkli++;
    if (b === 0) berabere++;
  }
  assert.equal(farkli, 0);
  void berabere;
  // Beraberlik rastgele ellerde çok nadir; sabit örneklerle sınanır
  for (const [x, y] of [['Ah Kd 9c 7s 4h', 'Ac Ks 9d 7h 4c'], ['8h 8d Kc 7s 4h', '8c 8s Kd 7h 4d'], ['5h 6d 7c 8s 9h', '5c 6s 7d 8h 9c']]) {
    assert.equal(Math.sign(gucKarsilastir(enIyiEl(K(x)).guc, enIyiEl(K(y)).guc)), 0);
    assert.equal(Math.sign(referansPuan(K(x)) - referansPuan(K(y))), 0);
  }
});

test('kasa karşılaştırması: elle seçilmiş zor durumlar', () => {
  const sonuc = (oy, kasa) => {
    let g = novoDagit(oyun(['Erman']), deste([oy], kasa));
    g = oyna0(g);
    if (g.el.faz === 'oyunsuz') return 'oyunyok';
    return g.el.oyuncular[0].sonuc.tip;
  };
  assert.equal(sonuc('Ah Kd 9c 5s 2d', 'As Kh 8c 5d 3h'), 'kazandi', 'As-Papaz: üçüncü kart 9 > 8');
  assert.equal(sonuc('Ah Kd 9c 5s 2d', 'As Kh 9d 5d 2h'), 'berabere', 'renkler eşitliği bozmaz');
  assert.equal(sonuc('Qh Qd 9c 5s 2d', 'Qs Qc 9d 5d 3h'), 'kaybetti', 'aynı çift: son yan kart');
  assert.equal(sonuc('Jh Jd 4c 4s Ad', 'Js Jc 4d 4h Kh'), 'kazandi', 'aynı iki çift: yan kart');
  assert.equal(sonuc('Ah 2d 3c 4s 5d', 'Kh Kd 7c 7s 2h'), 'kazandi', 'As ile en küçük kent iki çifti yener');
  assert.equal(sonuc('Ah 2d 3c 4s 5d', '2h 3d 4c 5s 6d'), 'kaybetti', '6 tepeli kent As-5 kentini yener');
  assert.equal(sonuc('9h 9d 9c 4s 4d', 'Th Td 3c 3s 3d'), 'kazandi', 'full: üçlü belirler');
  assert.equal(sonuc('2h 7h 9h Jh 4h', '2d 7d 9d Jd 5d'), 'kaybetti', 'renk: son kart');
  assert.equal(sonuc('Kh Qd 9c 5s 2d', 'Ah Qs 8c 5d 3h'), 'oyunyok', 'As var Papaz yok: kasanın oyunu yok');
  assert.equal(sonuc('2h 3d 7c 9s Jd', 'Ah Kh 8c 5d 3c'), 'kaybetti', 'kasa As-Papaz ile oyuna girer ve yüksek kartı yener');
});

test('döper: gerçek ve yalancı ayrımı', async () => {
  const { doperTuru } = await import('../js/novo.js');
  assert.equal(doperTuru(K('4h 4d Ac Ks 9d')), 'gercek');
  assert.equal(doperTuru(K('Ah Ad Kc 7s 2d')), 'yalanci');
  assert.equal(doperTuru(K('Kh Kd Ac 7s 2d')), 'yalanci');
  assert.equal(doperTuru(K('Ah Ad Qc 7s 2d')), null, 'Papaz yok');
  assert.equal(doperTuru(K('4h 4d 9c 9s Ad')), null, 'iki çift döper değil');
});

test('döper ödemesi ve gerçek döperin yalancıyı geçmesi', () => {
  const oyna = (oy, kasa) => {
    let g = novoDagit(oyun(['Erman']), deste([oy], kasa));
    g = oyna0(g);
    return g;
  };
  // Yalancı döper (A-A-K) kasanın 4 çiftini geçer: 2'ye 1
  let g = oyna('Ah Ad Kc 7s 2d', '4h 4c 9d 6s 3h');
  assert.equal(g.el.oyuncular[0].sonuc.tip, 'kazandi');
  assert.equal(g.el.oyuncular[0].sonuc.oran, 2);
  assert.equal(g.oyuncular[0].fis, 1000 - 40 + (10 + 20 + 40));
  // K-K-A de yalancı döper: 2'ye 1
  g = oyna('Kh Kd Ac 7s 2d', '4h 4c 9d 6s 3h');
  assert.equal(g.el.oyuncular[0].sonuc.oran, 2);
  // Kasada gerçek döper (4-4-A-K) varsa yalancı döper (A-A-K) kaybeder
  g = oyna('Ah Ad Kc 7s 2d', '4h 4c As Ks 3h');
  assert.equal(g.el.oyuncular[0].sonuc.tip, 'kaybetti');
  // Oyuncuda gerçek döper, kasada yalancı: oyuncu kazanır, 2'ye 1
  g = oyna('4h 4c As Ks 3h', 'Ah Ad Kc 7s 2d');
  assert.equal(g.el.oyuncular[0].sonuc.tip, 'kazandi');
  assert.equal(g.el.oyuncular[0].sonuc.oran, 2);
  // Yalancı döper, döpersiz büyük çifte normal kurala göre kaybeder (A-A kasada)
  g = oyna('Kh Kd Ac 7s 2d', 'As Ac 9d 6s 3h');
  assert.equal(g.el.oyuncular[0].sonuc.tip, 'kaybetti');
});

test('As-Papaz-Kız elden express 5\'e 1 öder, oyunda As-Papaz kalır', () => {
  let g = novoDagit(oyun(['Erman']), deste(['Ah Kd Qc 7s 2d'], '4h 4c 9d 6s 3h'));
  assert.equal(g.el.oyuncular[0].bonusOran, 5);
  assert.equal(g.oyuncular[0].fis, 1000 - 20 + 60);
  g = oyna0(g);
  assert.equal(g.el.oyuncular[0].sonuc.tip, 'kaybetti', 'oyunda per değil: 4 çiftine kaybeder');
});

test('sigorta: en az 4 kat ödeyen elde sorulur; en az 2 ante, en çok kazanılacak betin yarısı', async () => {
  const { sigortaSiniri } = await import('../js/novo.js');
  // ante 25: bet 50. Full: 7 x 50 / 2 = 175
  let g = novoDagit(yeniNovo({ adlar: ['Erman', 'Fidan'], kod: 'N', ante: 25 }),
    deste(['9h 9d 9c 4s 4d', '2h 2d 7c 8s Jd'], 'Qc 4h 3d 7s 5c'));
  g = novoHamle(g, { tip: 'oyna' });
  let y = novoYasal(g);
  assert.equal(y.oyuncu, 0, 'sıra aynı oyuncuda: sigorta sorusu');
  assert.deepEqual(y.sigorta, { enAz: 50, enCok: 175 });
  assert.throws(() => novoHamle(g, { tip: 'sigorta', miktar: 200 }));
  assert.throws(() => novoHamle(g, { tip: 'sigorta', miktar: 30 }));
  g = novoHamle(g, { tip: 'sigorta', miktar: 175 });
  y = novoYasal(g);
  assert.equal(y.oyuncu, 1);
  assert.equal(y.sigorta, undefined, 'tek çift: sigorta yok');
  // Üçlü (3 kat): sigorta yok; kent (4 kat): 4 x 50 / 2 = 100
  assert.equal(sigortaSiniri({ kartlar: K('9h 9d 9c 4s 2d'), bahis: 50 }, 1000, 25), null);
  assert.deepEqual(sigortaSiniri({ kartlar: K('5h 6d 7c 8s 9h'), bahis: 50 }, 1000, 25), { enAz: 50, enCok: 100 });
  // Parası az: en çok parası kadar
  assert.deepEqual(sigortaSiniri({ kartlar: K('9h 9d 9c 4s 4d'), bahis: 50 }, 40, 25), { enAz: 40, enCok: 40 });
  assert.equal(sigortaSiniri({ kartlar: K('9h 9d 3c 3s 2d'), bahis: 50 }, 1000, 25), null, 'iki çift sorulmaz');
});

test('sigorta: kasanın oyunu yoksa 1\'e 1, varsa kasanın', () => {
  const oyna = (kasa, sig) => {
    let g = novoDagit(yeniNovo({ adlar: ['Erman'], kod: 'N', ante: 25 }), deste(['9h 9d 9c 4s 4d'], kasa));
    g = novoHamle(g, { tip: 'oyna' });
    g = novoHamle(g, { tip: 'sigorta', miktar: sig });
    if (g.el.faz === 'oyunsuz') g = oyunSatinAl(g, [false]);
    return g;
  };
  // Kasa oyunsuz (Q yüksek): ante al + sigorta 175 x 2 geri. Express full 100'e 1.
  let g = oyna('Qc Jh 3d 7s 5c', 175);
  const p = g.el.oyuncular[0];
  assert.equal(p.sigortaGeri, 350);
  assert.equal(g.oyuncular[0].fis, 1000 - 50 + 25 * 101 - 50 - 175 + (25 + 50 + 25) + 350);
  // Kasa oyunlu (Q çifti): full kazanır 7:1, sigorta gider
  g = oyna('Qc Qh 3d 7s 5c', 175);
  assert.equal(g.el.oyuncular[0].sigortaGeri, 0);
  assert.equal(g.oyuncular[0].fis, 1000 - 50 + 25 * 101 - 50 - 175 + (25 + 50 + 350));
  // Sigorta yok seçilirse hiçbir şey değişmez
  g = oyna('Qc Qh 3d 7s 5c', 0);
  assert.equal(g.el.oyuncular[0].sigorta, 0);
});

test('ödeme dökümü: her kalem yazılır ve toplamı nete eşit', () => {
  const kontrol = g => g.el.oyuncular.forEach(p => {
    if (!p.katildi) return;
    assert.equal(p.odemeler.reduce((t, k) => t + k.tutar, 0), p.net, JSON.stringify(p.odemeler));
  });
  // kasa açtı, oyuncu full ile kazandı, sigorta yandı
  let g = novoDagit(yeniNovo({ adlar: ['Erman'], kod: 'N', ante: 25 }), deste(['9h 9d 9c 4s 4d'], 'Qc Qh 3d 7s 5c'));
  g = novoHamle(g, { tip: 'oyna' }); g = novoHamle(g, { tip: 'sigorta', miktar: 175 });
  kontrol(g);
  const yazi = g.el.oyuncular[0].odemeler.map(k => k.yazi);
  assert.ok(yazi.includes('Bet Full 7:1')); assert.ok(yazi.includes('Sigorta yandı (kasa açtı)')); assert.ok(yazi.includes('Ante geri (kasanın oyunu varken ante ödenmez)'));
  // kasa açtı ve kasa kazandı: hem bet hem sigorta gider
  g = novoDagit(yeniNovo({ adlar: ['Erman'], kod: 'N', ante: 25 }), deste(['5h 6d 7c 8s 9h'], 'Kc Qc Tc 4c 2c'));
  g = novoHamle(g, { tip: 'oyna' }); g = novoHamle(g, { tip: 'sigorta', miktar: 100 });
  kontrol(g);
  assert.equal(g.el.oyuncular[0].sonuc.tip, 'kaybetti');
  assert.equal(g.el.oyuncular[0].sigortaGeri, 0);
  assert.equal(g.el.oyuncular[0].net, 25 * 30 - 25 - 50 - 100, 'bonus kent kazanır; ante, bet ve sigorta gider');
  // kasa boş, zayıf el: ante otomatik
  g = novoDagit(yeniNovo({ adlar: ['Erman', 'Fidan'], kod: 'N', ante: 25 }), deste(['2h 2d 7c 9s Jd', 'Ah Kd 4c 6s 8d'], 'Qc Jh 3d 7s 5c'));
  g = oyna0(g); g = oyna0(g);
  assert.equal(g.el.faz, 'bitti'); kontrol(g);
  assert.ok(g.el.oyuncular[0].odemeler.some(k => k.yazi.startsWith('Ante 1:1')));
});

test('giriş 25+25 zorunlu; kart çekme 25, oyna 50, ikisi birlikte 75', () => {
  const yeni = () => novoDagit(yeniNovo({ adlar: ['Erman'], kod: 'N', ante: 25 }), deste(['2h 5d 7c 9s Jd'], 'Ac Kh 3d 7s 5c', '3h'));
  let g = yeni();
  assert.equal(g.oyuncular[0].fis, 950, 'giriş: ante 25 + express 25');
  g = novoHamle(g, { tip: 'degistir', konumlar: [0] });
  assert.equal(g.oyuncular[0].fis, 925, 'kart çekme 25');
  g = novoHamle(g, { tip: 'oyna' });
  assert.equal(g.el.oyuncular[0].ucret + g.el.oyuncular[0].bahis, 75, 'kart çekip oyna: 25 + 50');
  g = yeni(); g = novoHamle(g, { tip: 'pas' });
  assert.equal(g.oyuncular[0].fis, 950, 'pas: yalnız giriş gider');
});

test('önce herkes kart çeker, oyuna girme sonra sorulur', () => {
  let g = yeniNovo({ adlar: ['A', 'B'], kod: 'X' });
  g = novoDagit(g);
  assert.equal(g.el.faz, 'cekme');
  assert.equal(novoYasal(g).oyuncu, 0);
  assert.throws(() => novoHamleGercek(g, { tip: 'oyna' }), /Önce herkes kart çeksin/);
  g = novoHamleGercek(g, { tip: 'degistir', konumlar: [0] });
  assert.equal(g.el.faz, 'cekme'); assert.equal(novoYasal(g).oyuncu, 1, 'çeken oynamadan sıra ikinciye geçer');
  g = novoHamleGercek(g, { tip: 'gec' });
  assert.equal(g.el.faz, 'karar'); assert.equal(novoYasal(g).oyuncu, 0);
  const y = novoYasal(g);
  assert.equal(y.degistir, false); assert.equal(y.alti, false);
  assert.throws(() => novoHamleGercek(g, { tip: 'degistir', konumlar: [1] }));
  assert.equal(g.el.oyuncular[0].ucret, 25);
});

test('çekme aşamasında pas geçen oyuna girme sırasına gelmez', () => {
  let g = yeniNovo({ adlar: ['A', 'B'], kod: 'X' });
  g = novoDagit(g);
  g = novoHamleGercek(g, { tip: 'pas' });
  g = novoHamleGercek(g, { tip: 'alti' });
  assert.equal(g.el.faz, 'karar'); assert.equal(novoYasal(g).oyuncu, 1);
  assert.equal(g.el.oyuncular[1].kartlar.length, 6);
});

test('Novo en çok 3 oyuncu, tek kişi olur', () => {
  assert.throws(() => yeniNovo({ adlar: ['a', 'b', 'c', 'd'], kod: 'X' }));
  let g = yeniNovo({ adlar: ['Tek'], kod: 'X' });
  g = novoDagit(g);
  g = novoHamleGercek(g, { tip: 'gec' });
  assert.equal(g.el.faz, 'karar');
});

import { kombinasyonlar, betOrani, sigortaSiniri } from '../js/novo.js';

test('iki kombinasyon: kent + çift As = 5 kat', () => {
  const b = betOrani(K('Ah Ad 2c 3s 4h 5d'));
  assert.equal(b.ana, 4); assert.equal(b.ikinci, 1); assert.equal(b.oran, 5);
});
test('iki kombinasyon: kare + full = 27 kat', () => {
  const b = betOrani(K('Kh Kd Kc Ks Qh Qd'));
  assert.equal(b.ana, 7); assert.equal(b.ikinci, 6); assert.equal(b.oran, 27);
});
test('iki kombinasyon: renk + çift = 6 kat', () => {
  const b = betOrani(K('Ah 9h 7h 4h 2h Ac'));
  assert.equal(b.ana, 5); assert.equal(b.ikinci, 1); assert.equal(b.oran, 6);
});
test('ana elin içindeki küçük el ikinci kombinasyon sayılmaz', () => {
  assert.equal(kombinasyonlar(K('Kh Kd Kc Qh Qd 2s')).ikinci, null, 'full içindeki iki çift / üçlü');
  assert.equal(kombinasyonlar(K('Kh Kd Kc 9h 5d 2s')).ikinci, null, 'üçlü içindeki çift');
  assert.equal(kombinasyonlar(K('Ah Ad 2c 3s 4h')).ikinci, null, '5 kartta tek el');
  assert.equal(betOrani(K('Kh Kd Kc 9h 5d 2s')).oran, 3);
});
test('sigorta tavanı iki kombinasyonun toplam katından', () => {
  const p = { kartlar: K('Kh Kd Kc Ks Qh Qd'), bahis: 50 };
  assert.equal(sigortaSiniri(p, 5000, 25).enCok, Math.floor(27 * 50 / 2 / 5) * 5);
});
test('iki kombinasyonla kazanınca bet toplam kattan ödenir', () => {
  let g = yeniNovo({ adlar: ['Tek'], kod: 'X' });
  g = novoDagit(g, deste(['Ah Ad 2c 3s 4h'], '9c 9d 7h 6s 2d', '5d'));
  g = novoHamleGercek(g, { tip: 'alti' });
  g = novoHamleGercek(g, { tip: 'oyna' });
  if ('sigorta' in (novoYasal(g) || {})) g = novoHamleGercek(g, { tip: 'sigorta', miktar: 0 });
  const p = g.el.oyuncular[0];
  assert.equal(p.sonuc.tip, 'kazandi'); assert.equal(p.sonuc.oran, 5); assert.equal(p.sonuc.ikinciEl, 1);
  assert.ok(p.odemeler.some(k => k.yazi.includes('Kent + Bir çift') && k.tutar === 250));
});

test('kasaya kart çektirildi ve kasa yine açmadıysa ante ve bet geri gelir, ante 1:1 ödenmez', () => {
  let bulundu = 0;
  for (let n = 0; n < 20000 && bulundu < 3; n++) {
    let g = yeniNovo({ adlar: ['Tek'], kod: 'X', baslangicFis: 100000 });
    g = novoDagit(g);
    g = novoHamleGercek(g, { tip: 'gec' });
    g = novoHamleGercek(g, { tip: 'oyna' });
    if ('sigorta' in (novoYasal(g) || {})) g = novoHamleGercek(g, { tip: 'sigorta', miktar: 0 });
    if (g.el.faz !== 'oyunsuz') continue;
    const once = g.oyuncular[0].fis;
    g = oyunSatinAl(g, [true]);
    if (g.el.krupiyeOyunu) continue;
    const p = g.el.oyuncular[0];
    assert.equal(p.geri, p.ante + p.bahis, 'ante ve bet geri');
    assert.equal(g.oyuncular[0].fis, once + p.ante + p.bahis, 'ücret alınmadı');
    assert.equal(p.net, -p.bonus + (p.bonusOdeme || 0) - p.ucret - (p.sigorta || 0) + (p.sigortaGeri || 0), 'ana oyunda kazanç da kayıp da yok');
    assert.ok(!p.odemeler.some(k => k.yazi.startsWith('Ante 1:1')));
    bulundu++;
  }
  assert.ok(bulundu > 0);
});

import { bonusAnahtari } from '../js/novo.js';
test('sahte renk: ilk 5 kart hepsi kırmızı ya da hepsi siyah → express 2:1', () => {
  assert.equal(bonusAnahtari(K('Kh 9d 7h 4d 2h')), 'SAHTE');
  assert.equal(bonusOrani(K('Kh 9d 7h 4d 2h')), 2);
  assert.equal(bonusOrani(K('Ks 9c 7s 4c 2s')), 2);
  assert.equal(bonusOrani(K('Kh 9d 7h 4d 2s')), 0, 'bir siyah kart bozar');
  assert.equal(bonusOrani(K('Kh 9h 7h 4h 2h')), 60, 'hepsi kupa: renk bonusu');
  assert.equal(bonusOrani(K('7h 7d 7h 4d 2h'.replace('7h 7d 7h', '7h 7d 7c'))), 8, 'siyah var: yalnız üçlü');
  assert.equal(bonusOrani(K('7h 7d 4h 4d 2h')), 2, 'kırmızı iki çift: iki çifte bonus yok, sahte renk öder');
  assert.equal(bonusOrani(K('Ah Kd Qh 4d 2h')), 5, 'As-Papaz-Kız sahte renkten yüksek');
});

test('52 kartlık deste: çekmeler, 6. kart ve kasanın çektiği kartlar dahil hiçbir kart iki kez çıkmaz', () => {
  const ad = k => k.d + k.r;
  let el = 0, cekilen = 0, kasaCekti = 0;
  const ilkKart = new Map();
  for (let tur = 0; tur < 20000; tur++) {
    let g = yeniNovo({ adlar: ['A', 'B', 'C'], kod: 'X', baslangicFis: 100000 });
    g = novoDagit(g);
    const deste = g.el.deste.map(ad);
    assert.equal(new Set(deste).size, 52, 'deste 52 farklı kart');
    const ilk = ad(g.el.oyuncular[0].kartlar[0]);
    ilkKart.set(ilk, (ilkKart.get(ilk) || 0) + 1);
    const gorunen = new Set();
    const ekle = k => { const a = ad(k); assert.ok(deste.includes(a)); gorunen.add(a); };
    g.el.oyuncular.forEach(p => p.kartlar.forEach(ekle));
    g.el.krupiye.forEach(ekle);
    assert.equal(gorunen.size, 20, 'dağıtılan 20 kart birbirinden farklı');
    while (g.el.faz !== 'bitti') {
      if (g.el.faz === 'oyunsuz') {
        const once = g.el.cek;
        g = oyunSatinAl(g, [true, true, true]);
        kasaCekti += g.el.cek - once;
        continue;
      }
      const y = novoYasal(g);
      if ('sigorta' in y) { g = novoHamleGercek(g, { tip: 'sigorta', miktar: 0 }); continue; }
      if (y.asama === 'cekme') {
        const r = Math.random(), once = g.el.cek;
        if (r < 0.6) g = novoHamleGercek(g, { tip: 'degistir', konumlar: [0, 1, 2, 3, 4].filter(() => Math.random() < 0.5).concat([2]) });
        else if (r < 0.8) g = novoHamleGercek(g, { tip: 'alti' });
        else g = novoHamleGercek(g, { tip: 'gec' });
        cekilen += g.el.cek - once;
      } else g = novoHamleGercek(g, { tip: 'oyna' });
    }
    // el sonunda: herkesin eli ve kasanın son eli birbirinden ve atılan kartlardan farklı;
    // çekilen her kart destenin sıradaki kartı (kullanılmamış)
    const son = new Set();
    for (const p of g.el.oyuncular) for (const k of p.kartlar) son.add(ad(k));
    for (const k of g.el.krupiye) son.add(ad(k));
    const toplam = g.el.oyuncular.reduce((t, p) => t + p.kartlar.length, 0) + 5;
    assert.equal(son.size, toplam, 'masadaki kartların hiçbiri iki kez yok');
    assert.ok(g.el.cek <= 52);
    // her oyuncunun değiştirilen kartları yeni gelenlerle çakışmaz
    for (const p of g.el.oyuncular) for (const k of p.ilk) if (!p.kartlar.some(x => ad(x) === ad(k))) {
      assert.ok(!son.has(ad(k)), 'atılan kart masaya geri gelmez');
    }
    el++;
  }
  assert.equal(el, 20000);
  assert.ok(cekilen > 30000 && kasaCekti > 500, `yeterince çekme sınandı (${cekilen} oyuncu, ${kasaCekti} kasa)`);
  // ilk kart 52 değerin her birine yakın sıklıkla düşer (rastgelelik)
  assert.equal(ilkKart.size, 52);
  for (const n of ilkKart.values()) assert.ok(n > 20000 / 52 * 0.7 && n < 20000 / 52 * 1.3);
});

test('kasa boşken her oyuncu ayrı seçer: biri kasaya kart çektirir, öteki ante alır', () => {
  let bulundu = 0;
  for (let n = 0; n < 50000 && bulundu < 3; n++) {
    let g = yeniNovo({ adlar: ['A', 'B'], kod: 'X', baslangicFis: 100000 });
    g = novoDagit(g);
    g = novoHamleGercek(g, { tip: 'gec' }); g = novoHamleGercek(g, { tip: 'gec' });
    for (let i = 0; i < 2; i++) {
      g = novoHamleGercek(g, { tip: 'oyna' });
      if ('sigorta' in (novoYasal(g) || {})) g = novoHamleGercek(g, { tip: 'sigorta', miktar: 0 });
    }
    if (g.el.faz !== 'oyunsuz') continue;
    const sorulan = g.el.oyuncular.map((p, i) => p.satinAldi === null ? i : -1).filter(i => i >= 0);
    if (sorulan.length < 2) continue;
    const fisB = g.oyuncular[1].fis;
    g = oyunSatinAl(g, [true, false]);
    const [a, b] = g.el.oyuncular;
    assert.equal(a.satinAldi, true); assert.equal(b.satinAldi, false);
    assert.equal(b.sonuc.tip, 'oyunyok');
    assert.equal(g.oyuncular[1].fis, fisB + 2 * b.ante + b.bahis, 'B ante 1:1 aldı, bet geri');
    assert.notEqual(a.sonuc, null);
    bulundu++;
  }
  assert.ok(bulundu > 0);
});

import { sayi, metin, ad as kAd, PARCALAR } from '../js/konus.js';
test('seslendirme: sayılar ve cümleler parçalardan doğru kurulur', () => {
  const m = n => metin(sayi(n));
  assert.equal(m(1250), 'bin iki yüz elli');
  assert.equal(m(175), 'yüz yetmiş beş');
  assert.equal(m(2000), 'iki bin');
  assert.equal(m(25), 'yirmi beş');
  assert.equal(m(1000), 'bin');
  assert.equal(m(12350), 'on iki bin üç yüz elli');
  assert.equal(metin([kAd('Emrah'), 'sigortadan', sayi(175), 'dolar_kazanir']), 'Emrah sigortadan yüz yetmiş beş dolar kazanır.');
  assert.equal(kAd('Fidan').anahtar, 'ad_fidan');
  for (const n of [5, 25, 50, 75, 100, 125, 350, 1000, 2700, 13500]) for (const k of sayi(n)) assert.ok(PARCALAR[k], `${n}: ${k} listede`);
});

test('kart çekmede kasa herkes karar verdikten sonra toplu dağıtır', () => {
  let g = yeniNovo({ adlar: ['A', 'B', 'C'], kod: 'X' });
  g = novoDagit(g);
  const ilkA = JSON.stringify(g.el.oyuncular[0].kartlar);
  const cek0 = g.el.cek, fis0 = g.oyuncular[0].fis;
  g = novoHamleGercek(g, { tip: 'degistir', konumlar: [0, 1] });
  assert.equal(JSON.stringify(g.el.oyuncular[0].kartlar), ilkA, 'A karar verdi ama kartı henüz gelmedi');
  assert.equal(g.el.cek, cek0); assert.equal(g.oyuncular[0].fis, fis0 - 25, 'çekme ücreti kararla alınır');
  g = novoHamleGercek(g, { tip: 'alti' });
  assert.equal(g.el.oyuncular[1].kartlar.length, 5);
  g = novoHamleGercek(g, { tip: 'gec' });
  assert.equal(g.el.faz, 'karar');
  const a = g.el.oyuncular[0], b = g.el.oyuncular[1];
  assert.notEqual(JSON.stringify(a.kartlar), ilkA);
  assert.deepEqual(g.el.cekmeYakilan, g.el.deste[cek0], 'ilk çekilen karttan önce 1 kart gömülür');
  assert.deepEqual(a.kartlar[0], g.el.deste[cek0 + 1]); assert.deepEqual(a.kartlar[1], g.el.deste[cek0 + 2]);
  assert.equal(b.kartlar.length, 6); assert.deepEqual(b.kartlar[5], g.el.deste[cek0 + 3], 'ikinci oyuncuya gömmeden devam');
  assert.equal(g.el.cek, cek0 + 4);
});

test('kasanın eli oyuncununkiyle aynı olasılıkta (per %42,3, iki per %4,75, üçlü %2,11)', () => {
  const N = 60000, say = {};
  for (let n = 0; n < N; n++) {
    let g = yeniNovo({ adlar: ['A'], kod: 'X' }); g = novoDagit(g);
    const k = String(sinif(g.el.krupiye).anahtar); say[k] = (say[k] || 0) + 1;
  }
  const yuzde = k => (say[k] || 0) / N * 100;
  assert.ok(Math.abs(yuzde('1') - 42.26) < 1.2, 'per ' + yuzde('1'));
  assert.ok(Math.abs(yuzde('2') - 4.75) < 0.45, 'iki per ' + yuzde('2'));
  assert.ok(Math.abs(yuzde('3') - 2.11) < 0.35, 'üçlü ' + yuzde('3'));
  assert.ok((say['4'] || 0) + (say['5'] || 0) + (say['6'] || 0) > 300, 'kent/renk/full da gelir');
});

import { iyiEl } from '../js/novo.js';
test('soru ve sigorta: bet en az 3 kat ödeyen eller (üç per dahil)', () => {
  assert.equal(betOrani(K('Ah Ad Kh Kd 7c 7s')).oran, 3, 'üç per = iki per + per = 3 kat');
  assert.equal(iyiEl(K('Ah Ad Kh Kd 7c 7s')), true);
  assert.equal(iyiEl(K('7h 7d 7c 2s 9d')), true, 'üçlü');
  assert.equal(iyiEl(K('Ah Ad Kh Kd 7c')), false, 'iki per 2 kat');
  assert.equal(iyiEl(K('Ah Ad 2c 3s 4h 5d')), true, 'kent + per 5 kat');
  assert.equal(sigortaSiniri({ kartlar: K('Ah Ad Kh Kd 7c 7s'), bahis: 50 }, 5000, 25), null, '3 kat: soru var, sigorta yok');
});

test('sigorta en az 4 kat: üç as tek başına yok, üç as + papaz var; kart çektirme sorusu 3 kattan', () => {
  assert.equal(betOrani(K('Ah Ad Ac 9s 4d')).oran, 3);
  assert.equal(sigortaSiniri({ kartlar: K('Ah Ad Ac 9s 4d'), bahis: 50 }, 5000, 25), null, 'üç as: sigorta yok');
  assert.equal(iyiEl(K('Ah Ad Ac 9s 4d')), true, 'üç as: kasaya kart çektirme sorulur');
  assert.equal(betOrani(K('Ah Ad Ac Ks 4d')).oran, 4, 'üç as + papaz = 4');
  assert.equal(betOrani(K('Kh Kd Kc As 4d')).oran, 4, 'üç papaz + as = 4');
  assert.equal(betOrani(K('7h 7d 7c As Kd')).oran, 4, 'üçlü + dışarıda As-Papaz = 4');
  assert.equal(sigortaSiniri({ kartlar: K('Ah Ad Ac Ks 4d'), bahis: 50 }, 5000, 25).enCok, 100, '4 x 50 / 2');
  assert.ok(sigortaSiniri({ kartlar: K('5h 6d 7c 8s 9h'), bahis: 50 }, 5000, 25), 'kent: sigorta var');
});

test('kasa kart çekerken en yüksek kartını atar, bir kart yakar, sıradakini alır (tek sefer)', () => {
  let g = yeniNovo({ adlar: ['A'], kod: 'X', baslangicFis: 100000 });
  // oyuncu üçlü, kasa boş (As yok): en yüksek kartı Papaz
  g = novoDagit(g, deste(['7h 7d 7c 2s 9d'], 'Kd Jd 8c 5s 3d', '4h Qs'));
  g = novoHamleGercek(g, { tip: 'gec' });
  g = novoHamleGercek(g, { tip: 'oyna' });
  if ('sigorta' in (novoYasal(g) || {})) g = novoHamleGercek(g, { tip: 'sigorta', miktar: 0 });
  assert.equal(g.el.faz, 'oyunsuz');
  const cek = g.el.cek;
  g = oyunSatinAl(g, [true]);
  assert.equal(g.el.cek, cek + 2, 'bir yakılan + bir alınan');
  assert.equal(kartYazi(g.el.krupiyeAtilan), kartYazi(K('Kd')[0]), 'en yüksek kart (Papaz) atıldı');
  assert.equal(kartYazi(g.el.krupiyeYakilan), kartYazi(g.el.deste[cek]), 'sıradaki kart yakıldı');
  assert.equal(kartYazi(g.el.krupiye[0]), kartYazi(g.el.deste[cek + 1]), 'ondan sonraki kart alındı');
});

test('Novo: dağıtımdan önce 3 kart yakılır, kimse onları almaz', () => {
  for (let n = 0; n < 2000; n++) {
    let g = yeniNovo({ adlar: ['A', 'B', 'C'], kod: 'X' });
    g = novoDagit(g);
    const yakilan = g.el.deste.slice(0, YAKILAN_ILK).map(kartYazi);
    const masada = [...g.el.oyuncular.flatMap(p => p.kartlar), ...g.el.krupiye].map(kartYazi);
    assert.ok(yakilan.every(k => !masada.includes(k)));
    assert.equal(new Set(masada).size, 20);
  }
});
test('kimse kart çekmezse gömme yapılmaz', () => {
  let g = yeniNovo({ adlar: ['A', 'B'], kod: 'X' });
  g = novoDagit(g); const c = g.el.cek;
  g = novoHamleGercek(g, { tip: 'gec' }); g = novoHamleGercek(g, { tip: 'gec' });
  assert.equal(g.el.cek, c); assert.equal(g.el.cekmeYakilan, undefined);
});

test('beş surat: ilk 5 kartın hepsi vale/kız/papaz → express 120:1, her başka bonustan önce', () => {
  assert.equal(bonusAnahtari(K('Jh Qd Ks Jc Qh')), 'SURAT');
  assert.equal(bonusOrani(K('Jh Qd Ks Jc Qh')), 120);
  assert.equal(bonusOrani(K('Kh Kd Ks Qc Qh')), 120, 'full (100) yerine beş surat');
  assert.equal(bonusOrani(K('Kh Kd Ks Kc Qh')), 200, 'papaz karesi: kare 200 beş suratı geçer');
  assert.equal(bonusOrani(K('Jh Qh Kh Jd Qd')), 120, 'hepsi kırmızı: sahte renk değil beş surat');
  assert.notEqual(bonusAnahtari(K('Ah Qd Ks Jc Qh')), 'SURAT', 'as surat değil');
  assert.notEqual(bonusAnahtari(K('Th Qd Ks Jc Qh')), 'SURAT', 'on surat değil');
});

test('express renkli kent 250, royal flush 500', () => {
  assert.equal(bonusOrani(K('9h Th Jh Qh Kh')), 250);
  assert.equal(bonusOrani(K('Ts Js Qs Ks As')), 500);
});

import { yalanciIkiPer } from '../js/novo.js';
test('yalancı per iki per elde de geçer: A-A-8-8-K ve K-K-8-8-A 3 kat öder', () => {
  assert.equal(betOrani(K('8h 8d As Ac Kh')).oran, 3, 'iki per As + Papaz');
  assert.equal(betOrani(K('8h 8d Ks Kc Ah')).oran, 3, 'iki per Papaz + As');
  assert.equal(betOrani(K('8h 8d Qs Qc Ah')).oran, 2, 'As var ama per As/Papaz değil: düz iki per');
  assert.equal(betOrani(K('As Ad 8c 8h 2s')).oran, 2, 'As per ama Papaz yok');
  assert.ok(yalanciIkiPer(K('8h 8d As Ac Kh')));
});

import { molaAyarla } from '../js/novo.js';
test('mola: oyuncu çipleriyle beklerken dağıtıma girmez, dönünce sonraki dağıtımda girer', () => {
  let g = yeniNovo({ adlar: ['A', 'B'], kod: 'X' });
  const once = g.oyuncular[1].fis;
  g = molaAyarla(g, 1, true);
  g = novoDagit(g);
  assert.equal(g.el.oyuncular[1].katildi, false);
  assert.equal(g.oyuncular[1].fis, once, 'molada çipleri değişmez');
  assert.throws(() => molaAyarla(g, 1, false), /El bitince/);
  while (g.el.faz !== 'bitti') {
    if (g.el.faz === 'oyunsuz') { g = oyunSatinAl(g, [false, false]); continue; }
    const y = novoYasal(g);
    if ('sigorta' in y) { g = novoHamleGercek(g, { tip: 'sigorta', miktar: 0 }); continue; }
    g = novoHamleGercek(g, y.asama === 'cekme' ? { tip: 'gec' } : { tip: 'oyna' });
  }
  g = molaAyarla(g, 1, false);
  g = novoDagit(g);
  assert.equal(g.el.oyuncular[1].katildi, true);
});

test('As-Papaz-Kız yanında per olsa da express 5:1 öder (A K Q 9 9)', () => {
  assert.equal(bonusAnahtari(K('As Kd Qh 9c 9d')), 'AKQ');
  assert.equal(bonusOrani(K('As Kd Qh 9c 9d')), 5);
  assert.equal(bonusOrani(K('As Kd Qh Qc 9d')), 5, 'kız per');
  assert.equal(bonusOrani(K('As Kd Qh Jc Td')), 30, 'kent daha yüksek');
  assert.equal(bonusOrani(K('As Kd Qh Qc Qd')), 8, 'üçlü daha yüksek');
});

test('sahte döper: kasada düşük per ya da yalnız As-Papaz varsa döper öder; gerçek döper her zaman geçer', () => {
  const tek = (oy, kasa, cek = '') => novoDagit(oyun(['Erman']), deste([oy], kasa, cek));
  // Kasada yalnız As-Papaz: sahte döper 2'ye 1
  let g = oyna0(tek('Ah Ad Kc 7s 2d', 'As Kh 9d 6s 3h'));
  assert.equal(g.el.oyuncular[0].sonuc.tip, 'kazandi');
  assert.equal(g.el.oyuncular[0].sonuc.oran, 2);
  // Kasada düşük per (K-K-A sahte döper, kasa 9 çifti): 2'ye 1
  g = oyna0(tek('Kh Kd Ac 7s 2d', '9h 9c Qd 6s 3h'));
  assert.equal(g.el.oyuncular[0].sonuc.oran, 2);
  // Kasada gerçek döper: sahte döper (A-A-K) her zaman kaybeder, kasanın çifti 2 bile olsa
  g = oyna0(tek('Ah Ad Kc 7s 2d', '2h 2c As Ks 3h'));
  assert.equal(g.el.oyuncular[0].sonuc.tip, 'kaybetti');
  g = oyna0(tek('Kh Kd Ac 7s 2d', '2h 2c As Ks 3h'));
  assert.equal(g.el.oyuncular[0].sonuc.tip, 'kaybetti');
  // 6. kartla sahte döper olan oyuncu da gerçek döpere kaybeder
  g = tek('Ah Ad 9c 7s 2d', '2h 2c As Ks 3h', '4c Kd');
  g = novoHamle(g, { tip: 'alti' });
  g = oyna0(g);
  assert.equal(g.el.oyuncular[0].kartlar.length, 6);
  assert.equal(g.el.oyuncular[0].sonuc.tip, 'kaybetti');
});

test('kart alan da kasa boşken ante 1:1 alır (Erman, 22 Kas): 6. kart + express kayıp = −ante', () => {
  let g = novoDagit(oyun(['Erman']), deste(['3d 3c Ks 4s 5d'], 'Jh 9d 7c 5s 2d', 'As'));
  g = novoHamle(g, { tip: 'alti' });
  g = oyna0(g);
  const p = g.el.oyuncular[0];
  assert.equal(p.sonuc.tip, 'oyunyok');
  // 10 ante + 10 express + 10 kart + 20 bet = 50 harcanır; ante 10 + ante kazancı 10 + bet 20 = 40 döner
  assert.equal(fis(g)[0], 1000 - 50 + 40);
  assert.equal(p.net, -10);
  assert.equal(p.odemeler.reduce((t, k) => t + k.tutar, 0), p.net, 'döküm toplamı net');
});

import { yanAyarla, komsusu } from '../js/novo.js';
test('yan express: komşuya hemen öder, kasaya kasa açılınca; net fiş değişimine eşit', () => {
  // Erman: zayıf el · Fidan: üçlü (express 8:1) · kasa: renk (express 60:1)
  const d = deste(['2C 5D 9H JS KD', '7C 7D 7H 2S 4D'], 'AH 9H 6H 4H 2H');
  let g = oyun(['Erman', 'Fidan']);
  g = yanAyarla(g, 0, { kasa: true, komsu: true });
  const once = g.oyuncular[0].fis;
  g = novoDagit(g, d);
  const p = g.el.oyuncular[0];
  assert.equal(p.yanKomsu.kime, 1);
  assert.equal(p.yanKomsu.odeme, 10 * 9, 'komşunun üçlüsü 8:1, bahis dahil 90');
  assert.equal(g.oyuncular[0].fis, once - 20 - 20 + 90, 'giriş 20, yan bahis 20, komşu ödemesi 90');
  // herkes pas
  for (let k = 0; k < 6 && g.el.faz !== 'bitti'; k++) { const y = novoYasal(g); if (!y) break; g = novoHamleGercek(g, { tip: 'pas' }); }
  assert.equal(g.el.faz, 'bitti');
  const q = g.el.oyuncular[0];
  assert.equal(q.yanKasa.oran, 60);
  assert.equal(q.yanKasa.odeme, 610);
  assert.equal(g.oyuncular[0].fis - once, q.net);
  assert.ok(q.odemeler.some(x => /Kasaya express Renk 60:1/.test(x.yazi) && x.tutar === 600));
  assert.ok(q.odemeler.some(x => /Komşuya express \(Fidan\) Üçlü 8:1/.test(x.yazi) && x.tutar === 80));
  assert.equal(g.el.oyuncular[1].net, 80 - 10, 'komşunun hesabı yalnız kendi express ve antesi: yan bahis ondan bir şey almaz');
});

test('yan express: kazanmayan bahis kaybedilir, para yetmezse oynanmaz, komşu yoksa yalnız kasa', () => {
  const d = deste(['2C 5D 9H JS KD'], '3S 8D TC QH 4C');
  let g = yanAyarla(oyun(['Erman']), 0, { kasa: true, komsu: true });
  const once = g.oyuncular[0].fis;
  g = novoDagit(g, d);
  assert.equal(g.el.oyuncular[0].yanKomsu, undefined);
  g = novoHamleGercek(g, { tip: 'pas' });
  const p = g.el.oyuncular[0];
  assert.equal(p.yanKasa.odeme, 0);
  assert.equal(g.oyuncular[0].fis - once, p.net);
  assert.equal(p.net, -30, 'ante + express + kasaya express');
  let h = yanAyarla(oyun(['Erman']), 0, { kasa: true });
  h.oyuncular[0].fis = 40; // giriş 20 sonrası 20 kalır: oyna parası (20) dışında yan bahse para yok
  h = novoDagit(h, d);
  assert.equal(h.el.oyuncular[0].yanAtlandi, true);
  assert.equal(h.oyuncular[0].fis, 20);
  assert.equal(komsusu([0, 1, 2], 2), 0);
  assert.equal(komsusu([0, 2], 0), 2);
  assert.equal(komsusu([1], 1), null);
});

test('double: kendi ante, express, çekme ve oyna 2 kat; kasaya ve komşuya express masa antesinde', () => {
  let g = oyun(['Erman', 'Fidan']);
  g = yanAyarla(g, 0, { cift: true, kasa: true, komsu: true });
  // bonussuz eller; kasa As-Papaz ile açar
  g = novoDagit(g, deste(['2h 5d 8c Js Kd', '3h 6d 9c Qs 4d'], 'Ah Kc 7d 6s 2c', '3s'));
  const p0 = g.el.oyuncular[0], p1 = g.el.oyuncular[1];
  assert.equal(p0.ante, 20); assert.equal(p0.bonus, 20); assert.equal(p0.kat, 2);
  assert.equal(p1.ante, 10); assert.equal(p1.bonus, 10);
  assert.equal(p0.yanKasa.bahis, 10); assert.equal(p0.yanKomsu.bahis, 10);
  assert.deepEqual(fis(g), [1000 - 20 - 20 - 10 - 10, 1000 - 20]);
  g = novoHamleGercek(g, { tip: 'degistir', konumlar: [0] });
  assert.equal(g.el.oyuncular[0].ucret, 20, 'kart çekme kendi ante kadar');
  g = novoHamleGercek(g, { tip: 'gec' });
  g = novoHamle(g, { tip: 'oyna' });
  if (g.el.sira === 0 && 'sigorta' in novoYasal(g)) g = novoHamle(g, { tip: 'sigorta', miktar: 0 });
  assert.equal(g.el.oyuncular[0].bahis, 40, 'oyna 2 x kendi ante');
});

test('double: para 2 katına yetmezse o el normal oynanır ve söylenir', () => {
  let g = yeniNovo({ adlar: ['Erman'], kod: 'N1', ante: 10, baslangicFis: 60 });
  g = yanAyarla(g, 0, { cift: true });
  g = novoDagit(g, deste(['2h 5d 8c Js Kd'], 'Ah Kc 7d 6s 2c'));
  assert.equal(g.el.oyuncular[0].ante, 10);
  assert.equal(g.el.oyuncular[0].ciftAtlandi, true);
  assert.equal(g.oyuncular[0].fis, 40);
});

test('double ayarı yeni oyuna taşınır', () => {
  let g = yanAyarla(oyun(['Erman']), 0, { cift: true });
  assert.equal(novoYenidenBaslat(g).oyuncular[0].yan.cift, true);
});

test('kasa anonsu: per ise perin değeri, per + As + Papaz ise döper, iki per değişmez', async () => {
  const { perDegeri, doperTuru, sinif } = await import('../js/novo.js');
  const { kasaAnons } = await import('../js/konus.js');
  const an = e => { const k = K(e); const a = kasaAnons(sinif(k).anahtar, perDegeri(k), !!doperTuru(k)); return typeof a === 'string' ? a : a.anahtar; };
  assert.equal(an('5h 5d 9c Js 2d'), 'kasa_cift_5');
  assert.equal(an('Th Td 2c 3s 7d'), 'kasa_cift_10');
  assert.equal(an('Jh Jd 2c 3s 7d'), 'kasa_cift_11');
  assert.equal(an('Ah Ad 7c 3s 2d'), 'kasa_cift_14');
  assert.equal(an('4h 4d Ac Ks 2d'), 'kasa_doper', 'gerçek döper');
  assert.equal(an('Ah Ad Kc 3s 2d'), 'kasa_doper', 'yalancı döper');
  assert.equal(an('7h 7d 2c 2s 9d'), 'kasa_2', 'iki per aynı');
  assert.equal(an('Ah Kd 7c 3s 2d'), 'kasa_AK');
  const a = kasaAnons(1, 5, false);
  assert.equal(a.yedek, 'kasa_1', 'kaydı yoksa "Kasa per"');
});
