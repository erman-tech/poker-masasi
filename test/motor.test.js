import test from 'node:test';
import assert from 'node:assert/strict';
import { kartlariOku as K, yeniDeste, kartYazi } from '../js/kart.js';
import {
  yeniOyun, eliBaslat, hamleYap, yasalHamleler, potlariHesapla, toplamFis, yenidenBaslat, korlar,
} from '../js/motor.js';

// Kartları belirli olan deste: koltuk i -> 2i,2i+1; ortak -> 19,20,21,23,25
function deste(eller, masa) {
  const d = new Array(52).fill(null);
  eller.forEach((e, i) => { const [a, b] = K(e); d[2 * i] = a; d[2 * i + 1] = b; });
  const m = K(masa);
  [19, 20, 21, 23, 25].forEach((p, j) => { d[p] = m[j]; });
  const kullanilan = new Set(d.filter(Boolean).map(kartYazi));
  const kalan = yeniDeste().filter(k => !kullanilan.has(kartYazi(k)));
  for (let i = 0; i < 52; i++) if (!d[i]) d[i] = kalan.shift();
  return d;
}

const oyun = (adlar = ['Erman', 'Fidan', 'Emrah'], fis) => {
  const g = yeniOyun({ adlar, kod: 'TEST01', korArtisEl: 0 });
  if (fis) fis.forEach((f, i) => { g.oyuncular[i].fis = f; });
  return g;
};
const H = (g, tip, miktar) => hamleYap(g, { tip, miktar });
const fis = g => g.oyuncular.map(o => o.fis);

test('üç kişi: körler, ilk konuşan ve sıra', () => {
  let g = eliBaslat(oyun());
  // buton 0 (Erman), sb 1 (Fidan), bb 2 (Emrah), ilk konuşan Erman
  assert.equal(g.el.buton ?? g.buton, 0);
  assert.equal(g.el.sb, 1); assert.equal(g.el.bb, 2);
  assert.deepEqual(fis(g), [1000, 990, 980]);
  assert.equal(g.el.sira, 0);
  const y = yasalHamleler(g);
  assert.equal(y.odenecek, 20); assert.equal(y.enAz, 40); assert.equal(y.enCok, 1000);
  g = H(g, 'gor'); assert.equal(g.el.sira, 1);
  g = H(g, 'gor'); assert.equal(g.el.sira, 2);
  // büyük kör opsiyonu: kontrol edebilir ya da yükseltebilir
  const yb = yasalHamleler(g);
  assert.equal(yb.kontrol, true); assert.equal(yb.yukselt, true);
  g = H(g, 'kontrol');
  assert.equal(g.el.sokak, 'flop'); assert.equal(g.el.acik, 3);
  assert.equal(g.el.sira, 1, 'flopta butonun solu (küçük kör) başlar');
  assert.equal(toplamFis(g), 3000);
});

test('herkes pas geçerse pot tek kalana, kart açılmaz', () => {
  let g = eliBaslat(oyun());
  g = H(g, 'yukselt', 60);
  g = H(g, 'pas');
  g = H(g, 'pas');
  assert.equal(g.el.sokak, 'bitti');
  assert.equal(g.el.sonuc.gosterim, false);
  assert.deepEqual(fis(g), [1030, 990, 980]);
});

test('iki kişi: buton küçük körü öder ve preflop önce konuşur, flopta sonra', () => {
  let g = eliBaslat(oyun(['Erman', 'Fidan']));
  assert.equal(g.buton, 0);
  assert.equal(g.el.sb, 0); assert.equal(g.el.bb, 1);
  assert.equal(g.el.sira, 0);
  g = H(g, 'gor');
  g = H(g, 'kontrol');
  assert.equal(g.el.sokak, 'flop');
  assert.equal(g.el.sira, 1);
});

test('tam el: river\'da gösterim, iyi el kazanır', () => {
  const d = deste(['Ah Ad', 'Kh Kd', '7c 2d'], '2s 9h Jc 4d 8s');
  let g = eliBaslat(oyun(), d);
  g = H(g, 'gor'); g = H(g, 'gor'); g = H(g, 'kontrol'); // pot 60
  for (const sokak of ['flop', 'turn', 'river']) {
    assert.equal(g.el.sokak, sokak);
    g = H(g, 'kontrol'); g = H(g, 'kontrol'); g = H(g, 'kontrol');
  }
  assert.equal(g.el.sokak, 'bitti');
  assert.equal(g.el.sonuc.gosterim, true);
  assert.deepEqual(g.el.sonuc.potlar[0].kazananlar, [0]);
  assert.deepEqual(fis(g), [1040, 980, 980]);
  assert.equal(g.el.sonuc.eller[0].ad, 'Bir çift');
});

test('bölünen pot: artan fiş butonun solundaki kazanana', () => {
  // Masada kent var: kalanlar masayı oynar ve bölüşür.
  const d = deste(['2c 3d', '2h 4d', '3h 5c'], 'Ts Jh Qd Kc As');
  let g = eliBaslat(oyun(), d);
  g = H(g, 'yukselt', 41); g = H(g, 'gor'); g = H(g, 'gor');      // pot 123
  g = H(g, 'kontrol'); g = H(g, 'kontrol'); g = H(g, 'yukselt', 21); // flop: Erman bet 21
  g = H(g, 'gor'); g = H(g, 'pas');                                 // Fidan görür, Emrah pas
  assert.equal(g.el.sokak, 'turn');
  g = H(g, 'kontrol'); g = H(g, 'kontrol');
  g = H(g, 'kontrol'); g = H(g, 'kontrol');
  assert.equal(g.el.sokak, 'bitti');
  const p = g.el.sonuc.potlar;
  assert.equal(p.length, 1); assert.equal(p[0].miktar, 165);
  assert.deepEqual(p[0].kazananlar, [0, 1]);
  // 165/2 = 82, artan 1 fiş butonun (Erman) solundaki ilk kazanana: Fidan
  assert.equal(g.el.sonuc.kazanc[1], 83); assert.equal(g.el.sonuc.kazanc[0], 82);
  assert.equal(toplamFis(g), 3000);
});

test('yan pot: kısa all-in yalnız ana potu kazanabilir', () => {
  const d = deste(['Ah Ad', 'Kh Kd', 'Qc Qd'], '2s 7h 9c 3d 5s');
  let g = eliBaslat(oyun(undefined, [100, 300, 1000]), d);
  g = H(g, 'allin');            // Erman 100
  g = H(g, 'allin');            // Fidan 300
  g = H(g, 'gor');              // Emrah 300 görür
  assert.equal(g.el.sokak, 'bitti', 'oynayabilen tek kişi kalınca kartlar açılır');
  assert.equal(g.el.acik, 5);
  const p = g.el.sonuc.potlar;
  assert.deepEqual(p.map(x => x.miktar), [300, 400]);
  assert.deepEqual(p[0].hak, [0, 1, 2]); assert.deepEqual(p[1].hak, [1, 2]);
  assert.deepEqual(p[0].kazananlar, [0]); assert.deepEqual(p[1].kazananlar, [1]);
  assert.deepEqual(fis(g), [300, 400, 700]);
});

test('yan pot: en büyük el yan potu da alırsa her şeyi toplar', () => {
  const d = deste(['Qc Qd', 'Kh Kd', 'Ah Ad'], '2s 7h 9c 3d 5s');
  let g = eliBaslat(oyun(undefined, [100, 300, 1000]), d);
  g = H(g, 'allin'); g = H(g, 'allin'); g = H(g, 'gor');
  assert.deepEqual(fis(g), [0, 0, 1400]);
  assert.equal(g.oyuncular[0].elendi, true);
  assert.equal(g.oyuncular[1].elendi, true);
  assert.equal(g.bitti, true); assert.equal(g.sampiyon, 2);
});

test('kısa all-in yükseltmesi önceden konuşanlara yükseltme hakkı açmaz', () => {
  let g = eliBaslat(oyun(undefined, [1000, 1000, 55]));
  g = H(g, 'yukselt', 40);      // Erman
  g = H(g, 'gor');              // Fidan
  g = H(g, 'allin');            // Emrah 55: 15 fazla, tam yükseltme değil (en az 20)
  assert.equal(g.el.sira, 0);
  let y = yasalHamleler(g);
  assert.equal(y.odenecek, 15); assert.equal(y.yukselt, false);
  assert.throws(() => H(g, 'yukselt', 200));
  g = H(g, 'gor');
  y = yasalHamleler(g);
  assert.equal(y.yukselt, false);
  g = H(g, 'gor');
  assert.equal(g.el.sokak, 'flop');
});

test('tam yükseltme herkese yeniden yükseltme hakkı açar; en az yükseltme kuralı', () => {
  let g = eliBaslat(oyun());
  g = H(g, 'yukselt', 60);      // Erman: +40
  assert.throws(() => H(g, 'yukselt', 90), /En az 100/);
  g = H(g, 'yukselt', 100);     // Fidan: +40
  g = H(g, 'gor');              // Emrah
  const y = yasalHamleler(g);
  assert.equal(y.oyuncu, 0); assert.equal(y.yukselt, true); assert.equal(y.enAz, 140);
});

test('büyük kör körü bile ödeyemezse: fazla ödenen geri döner', () => {
  const d = deste(['2c 3d', 'Ah Ad'], 'Ks 9h 8c 4d 7s');
  let g = eliBaslat(oyun(['Erman', 'Fidan'], [1000, 5]), d);
  // Erman: sb 10, Fidan bb all-in 5. Erman'a sorulacak bir şey yok.
  assert.equal(g.el.sokak, 'bitti');
  assert.deepEqual(fis(g), [995, 10]);
  assert.deepEqual(g.el.sonuc.potlar.map(p => p.miktar), [10, 5]);
});

test('kontrol edilemeyen yerde kontrol, ödenecek yokken gör reddedilir', () => {
  let g = eliBaslat(oyun());
  assert.throws(() => H(g, 'kontrol'));
  g = H(g, 'gor'); g = H(g, 'gor'); g = H(g, 'kontrol');
  assert.throws(() => H(g, 'gor'));
});

test('fiş sayıları ellere taşınır, elenen bir daha kart almaz, buton döner', () => {
  const d1 = deste(['Ah Ad', '2c 8d', 'Kh Kd'], '2s 7h 9c 3d 5s');
  let g = eliBaslat(oyun(undefined, [1000, 20, 1000]), d1);
  // Fidan sb 10 öder, 10 kalır. Erman yükseltir, Fidan all-in görür, Emrah pas.
  g = H(g, 'yukselt', 100); g = H(g, 'allin'); g = H(g, 'pas');
  assert.equal(g.el.sokak, 'bitti');
  assert.equal(g.oyuncular[1].elendi, true);
  assert.deepEqual(fis(g), [1040, 0, 980]);
  g = eliBaslat(g);
  assert.equal(g.elNo, 2);
  assert.equal(g.buton, 2, 'buton elenen oyuncuyu atlar');
  assert.equal(g.el.elKartlari[1], null);
  assert.equal(g.el.durum[1].pas, true);
  assert.equal(g.el.sb, 2, 'iki kişide buton küçük kör');
  assert.equal(toplamFis(g), 2020);
});

test('oyun bitince yeniden başlat: herkese 1000, el numarası devam eder', () => {
  let g = oyun(['Erman', 'Fidan']);
  g.elNo = 7; g.bitti = true; g.oyuncular[0].fis = 2000; g.oyuncular[1].fis = 0; g.oyuncular[1].elendi = true;
  const y = yenidenBaslat(g);
  assert.deepEqual(fis(y), [1000, 1000]);
  assert.equal(y.oyuncular[1].elendi, false);
  assert.equal(y.bitti, false);
  const z = eliBaslat(y);
  assert.equal(z.elNo, 8);
  assert.throws(() => eliBaslat(g), /Oyun bitti/);
});

test('kör seviyeleri her N elde yükselir', () => {
  const g = yeniOyun({ adlar: ['A', 'B'], kod: 'X', korArtisEl: 10 });
  assert.deepEqual(korlar(g, 1), { kucuk: 10, buyuk: 20 });
  assert.deepEqual(korlar(g, 10), { kucuk: 10, buyuk: 20 });
  assert.deepEqual(korlar(g, 11), { kucuk: 15, buyuk: 30 });
  assert.deepEqual(korlar(g, 31), { kucuk: 50, buyuk: 100 });
});

test('pot hesabı: pas geçenin katkısı potta kalır ama hak vermez', () => {
  const p = potlariHesapla([50, 100, 300, 300], [true, false, false, false]);
  assert.deepEqual(p, [{ miktar: 350, hak: [1, 2, 3] }, { miktar: 400, hak: [2, 3] }]);
  assert.equal(p.reduce((t, x) => t + x.miktar, 0), 750);
});

test('rastgele oyunlarda fiş korunur ve motor takılmaz', () => {
  let tohum = 12345;
  const rnd = () => ((tohum = (tohum * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  for (let oyunNo = 0; oyunNo < 40; oyunNo++) {
    const n = 2 + (oyunNo % 4);
    let g = yeniOyun({ adlar: Array.from({ length: n }, (_, i) => 'O' + i), kod: 'R' + oyunNo, korArtisEl: 5 });
    const toplam = g.oyuncular.reduce((t, o) => t + o.fis, 0);
    let el = 0;
    while (!g.bitti && el < 400) {
      g = eliBaslat(g); el++;
      let adim = 0;
      while (g.el.sokak !== 'bitti') {
        assert.ok(++adim < 200, 'el bitmiyor');
        const y = yasalHamleler(g);
        const r = rnd();
        let h;
        if (r < 0.15) h = { tip: 'pas' };
        else if (r < 0.25 && y.yukselt) h = { tip: 'allin' };
        else if (r < 0.45 && y.yukselt) h = { tip: 'yukselt', miktar: y.enAz + Math.floor(rnd() * (y.enCok - y.enAz)) };
        else h = { tip: y.kontrol ? 'kontrol' : 'gor' };
        g = hamleYap(g, h);
        assert.equal(toplamFis(g), toplam, 'fiş kayboldu');
        assert.ok(g.oyuncular.every(o => o.fis >= 0));
      }
      assert.equal(g.oyuncular.reduce((t, o) => t + o.fis, 0), toplam);
    }
    assert.ok(g.bitti, 'oyun bitmedi');
  }
});

test('pot hesabı: pas geçenin katkısı kalanlardan fazlaysa yine potta kalır', () => {
  assert.deepEqual(potlariHesapla([200, 50], [true, false]), [{ miktar: 250, hak: [1] }]);
});
