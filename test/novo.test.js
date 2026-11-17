import test from 'node:test';
import assert from 'node:assert/strict';
import { kartlariOku as K, yeniDeste, kartYazi, rastgeleDeste } from '../js/kart.js';
import {
  yeniNovo, novoDagit, novoHamle, novoYasal, oyunSatinAl, sinif, ikinciAK, krupiyeOyunuVar,
  bonusOrani, novoYenidenBaslat,
} from '../js/novo.js';

// koltuk i: 5i..5i+4 ; krupiye 20..24 (24 açık) ; çekme 25'ten
function deste(eller, krupiye, cekilecek = '') {
  const d = new Array(52).fill(null);
  eller.forEach((e, i) => K(e).forEach((k, j) => { d[5 * i + j] = k; }));
  K(krupiye).forEach((k, j) => { d[20 + j] = k; });
  if (cekilecek) K(cekilecek).forEach((k, j) => { d[25 + j] = k; });
  const kul = new Set(d.filter(Boolean).map(kartYazi));
  const kalan = yeniDeste().filter(k => !kul.has(kartYazi(k)));
  for (let i = 0; i < 52; i++) if (!d[i]) d[i] = kalan.shift();
  return d;
}
const oyun = (adlar = ['Erman', 'Fidan', 'Emrah']) => yeniNovo({ adlar, kod: 'N1', ante: 10 }); // testte ante 10: express 10, çekme 10, oyna 20
const fis = g => g.oyuncular.map(o => o.fis);
// Oyna; sigorta sorulursa sigortasız devam et.
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
  // Erman: express renk 60'a 1 → 610; oyna: renk 5'e 1 → 20+100 + ante 10 + ante kazancı 10 = 140
  // 1000 - 20 + 610 - 20 + 140 = 1710. Fidan pas: 980. Emrah kaybetti: 960.
  assert.deepEqual(fis(g), [1710, 980, 960]);
  assert.equal(g.el.oyuncular[0].net, 710);
  assert.equal(g.el.oyuncular[2].sonuc.tip, 'kaybetti');
});

test('kart değiştirme: seçilen kartlar sırayla gelir, ücret gider, ante kazanılmaz', () => {
  let g = novoDagit(oyun(['Erman']), deste(['7h 7d 2c 4s 9d'], 'Qc Qd 3d 8s 4c', '7c 7s Kd'));
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

test('krupiyenin oyunu yok: ante al seçen ante kadar kazanır', () => {
  let g = novoDagit(oyun(['Erman']), deste(['2h 2d 3c 8d 4h'], 'Jc 9d 3d 7s 5c'));
  g = oyna0(g);
  assert.equal(g.el.faz, 'oyunsuz');
  g = oyunSatinAl(g, [false]);
  assert.equal(g.el.faz, 'bitti');
  assert.equal(fis(g)[0], 1000, 'ante kazancı express kaybını karşılar');
});

test('oyun satın alma: krupiye en yüksek kartını değiştirir, oyun doğarsa karşılaştırılır', () => {
  // Krupiye J yüksek. Satın alınca J (en yüksek) değişir; gelen 9 → 9 çifti, oyun var.
  let g = novoDagit(oyun(['Erman']), deste(['Th Td 3c 8d 4h'], 'Jc 9d 3d 7s 5c', '9s'));
  g = oyna0(g);
  g = oyunSatinAl(g, [true]);
  assert.equal(g.el.krupiyeOyunu, true);
  assert.equal(g.el.krupiyeDegisim, 1);
  assert.equal(g.el.oyuncular[0].sonuc.tip, 'kazandi');
  // koydu: 10 ante + 10 express + 20 + 10 ücret = 50; çift 1'e 1 → 10+20+20 = 50 geri
  assert.equal(fis(g)[0], 1000);
});

test('ikinci As-Papaz ödemesi çiftin üstüne eklenir', () => {
  let g = novoDagit(oyun(['Erman']), deste(['7h 7d Ac Ks 2d'], 'Qc 4d 3d 8s 4c'));
  g = oyna0(g);
  const p = g.el.oyuncular[0];
  assert.equal(p.sonuc.tip, 'kazandi'); assert.equal(p.sonuc.oran, 2);
  assert.equal(fis(g)[0], 1000 - 40 + (10 + 20 + 40 + 10));
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
    let g = yeniNovo({ adlar: ['A', 'B', 'C', 'D'].slice(0, 1 + (tur % 4)), kod: 'X', ante: 10 });
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
  assert.equal(g.kasaNet, -(710 - 20 - 40));
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
  assert.ok(berabere > 0, 'beraberlik durumu da denendi');
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
  assert.equal(g.oyuncular[0].fis, 1000 - 40 + (10 + 20 + 40 + 10));
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

test('sigorta: üçlü ve üstünde sorulur; en az 2 ante, en çok kazanılacak betin yarısı', async () => {
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
  // Üçlü: 3 x 50 / 2 = 75
  assert.deepEqual(sigortaSiniri({ kartlar: K('9h 9d 9c 4s 2d'), bahis: 50 }, 1000, 25), { enAz: 50, enCok: 75 });
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
  assert.equal(g.oyuncular[0].fis, 1000 - 50 + 25 * 101 - 50 - 175 + (25 + 50 + 350 + 25));
  // Sigorta yok seçilirse hiçbir şey değişmez
  g = oyna('Qc Qh 3d 7s 5c', 0);
  assert.equal(g.el.oyuncular[0].sigorta, 0);
});
