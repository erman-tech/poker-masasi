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
  g = novoHamle(g, { tip: 'oyna' });
  g = novoHamle(g, { tip: 'pas' });
  g = novoHamle(g, { tip: 'oyna' });
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
  g = novoHamle(g, { tip: 'oyna' });
  // 10 ante + 10 express + 10 ücret + 20 bahis = 50. Kare 20'ye 1 → 20+400+ante 10 = 430
  assert.equal(fis(g)[0], 1000 - 50 + 430);
});

test('6. kart: en iyi 5 kart sayılır', () => {
  let g = novoDagit(oyun(['Erman']), deste(['2h 5h 9h Jh 3c'], 'Qc Qd 3d 8s 4c', 'Kh'));
  g = novoHamle(g, { tip: 'alti' });
  assert.equal(g.el.oyuncular[0].kartlar.length, 6);
  g = novoHamle(g, { tip: 'oyna' });
  assert.equal(g.el.oyuncular[0].elAdi, 'Renk');
  assert.equal(fis(g)[0], 1000 - 50 + (10 + 20 + 100));
});

test('beraberlik: ante ve bahis geri', () => {
  let g = novoDagit(oyun(['Erman']), deste(['Qh Qs 3c 8d 4h'], 'Qc Qd 3d 8s 4c'));
  g = novoHamle(g, { tip: 'oyna' });
  assert.equal(g.el.oyuncular[0].sonuc.tip, 'berabere');
  assert.equal(fis(g)[0], 1000 - 10, 'yalnız express gider');
});

test('krupiyenin oyunu yok: ante al seçen ante kadar kazanır', () => {
  let g = novoDagit(oyun(['Erman']), deste(['2h 2d 3c 8d 4h'], 'Jc 9d 3d 7s 5c'));
  g = novoHamle(g, { tip: 'oyna' });
  assert.equal(g.el.faz, 'oyunsuz');
  g = oyunSatinAl(g, [false]);
  assert.equal(g.el.faz, 'bitti');
  assert.equal(fis(g)[0], 1000, 'ante kazancı express kaybını karşılar');
});

test('oyun satın alma: krupiye en yüksek kartını değiştirir, oyun doğarsa karşılaştırılır', () => {
  // Krupiye J yüksek. Satın alınca J (en yüksek) değişir; gelen 9 → 9 çifti, oyun var.
  let g = novoDagit(oyun(['Erman']), deste(['Th Td 3c 8d 4h'], 'Jc 9d 3d 7s 5c', '9s'));
  g = novoHamle(g, { tip: 'oyna' });
  g = oyunSatinAl(g, [true]);
  assert.equal(g.el.krupiyeOyunu, true);
  assert.equal(g.el.krupiyeDegisim, 1);
  assert.equal(g.el.oyuncular[0].sonuc.tip, 'kazandi');
  // koydu: 10 ante + 10 express + 20 + 10 ücret = 50; çift 1'e 1 → 10+20+20 = 50 geri
  assert.equal(fis(g)[0], 1000);
});

test('ikinci As-Papaz ödemesi çiftin üstüne eklenir', () => {
  let g = novoDagit(oyun(['Erman']), deste(['7h 7d Ac Ks 2d'], 'Qc 4d 3d 8s 4c'));
  g = novoHamle(g, { tip: 'oyna' });
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
        const r = Math.random();
        if (r < 0.2) g = novoHamle(g, { tip: 'pas' });
        else if (r < 0.4 && y.degistir) g = novoHamle(g, { tip: 'degistir', konumlar: [0, 2, 4].filter(() => Math.random() < 0.7).concat([1]) });
        else if (r < 0.5 && y.alti) g = novoHamle(g, { tip: 'alti' });
        else if (y.oyna) g = novoHamle(g, { tip: 'oyna' });
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
  g = novoHamle(g, { tip: 'oyna' }); g = novoHamle(g, { tip: 'pas' }); g = novoHamle(g, { tip: 'oyna' });
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
