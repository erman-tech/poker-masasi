import test from 'node:test';
import assert from 'node:assert/strict';
import {
  kartlariOku as K, besKartGucu, enIyiEl, gucKarsilastir, elDestesi,
  koltukKartlari, ortakKartlar, kartYazi, kontrolKodu,
} from '../js/kart.js';

const kat = m => besKartGucu(K(m))[0];
const kars = (a, b) => Math.sign(gucKarsilastir(enIyiEl(K(a)).guc, enIyiEl(K(b)).guc));

test('kategoriler', () => {
  assert.equal(kat('As Ks Qs Js Ts'), 8);
  assert.equal(kat('9h 9d 9s 9c 2d'), 7);
  assert.equal(kat('9h 9d 9s 2c 2d'), 6);
  assert.equal(kat('2h 7h 9h Jh Kh'), 5);
  assert.equal(kat('5d 6h 7s 8c 9d'), 4);
  assert.equal(kat('Ah 2d 3s 4c 5d'), 4, 'As aşağıda kent');
  assert.equal(kat('7h 7d 7s Kc 2d'), 3);
  assert.equal(kat('7h 7d Ks Kc 2d'), 2);
  assert.equal(kat('7h 7d Ks 4c 2d'), 1);
  assert.equal(kat('7h 9d Ks 4c 2d'), 0);
  assert.equal(kat('Qh Kd As 2c 3d'), 0, 'dönen kent yok (Q-K-A-2-3)');
});

test('kentler ve renkli kentler doğru sıralanır', () => {
  assert.equal(kars('Ah 2d 3s 4c 5d', '2h 3d 4s 5c 6d'), -1, '5-high kent 6-high kentten küçük');
  assert.equal(kars('Th Jd Qs Kc Ad', '9h Td Js Qc Kd'), 1);
  assert.equal(kars('Ah 2h 3h 4h 5h', 'Kd Kh Ks Kc Ad'), 1, 'çelik tekerlek kareden büyük');
});

test('eşitlik bozucular', () => {
  assert.equal(kars('Ah Ad Kc 7s 2d', 'As Ac Qd Jh Th'), 1, 'çift: yan kart');
  assert.equal(kars('Kh Kd 4c 4s 9d', 'Ks Kc 4h 4d 8h'), 1, 'iki çift: yan kart');
  assert.equal(kars('Kh Kd 4c 4s 9d', 'Ks Kc 5h 5d 2h'), -1, 'iki çift: ikinci çift');
  assert.equal(kars('Th Td Ts 4c 4d', '9h 9d 9s Ac Ad'), 1, 'full: üçlü önce');
  assert.equal(kars('Ah 9h 7h 5h 3h', 'Ad 9d 7d 5d 2d'), 1, 'renk: son kart');
  assert.equal(kars('Ah 9h 7h 5h 3h', 'Ad 9d 7d 5d 3d'), 0, 'eşit renk');
  assert.equal(kars('2h 2d 2s 2c Kd', '2h 2d 2s 2c Ad'), -1, 'kare: yan kart');
});

test('7 karttan en iyi 5', () => {
  const e = enIyiEl(K('Ah Kh 2c 3d Qh Jh Th'));
  assert.equal(e.ad, 'Renkli kent');
  assert.deepEqual(e.guc, [8, 14]);
  const f = enIyiEl(K('9c 9d 9h 4s 4c 4d 2h'));
  assert.deepEqual(f.guc, [6, 9, 4], 'iki üçlüden full');
  const r = enIyiEl(K('2h 5h 8h Jh Kh Qh 3c'));
  assert.deepEqual(r.guc, [5, 13, 12, 11, 8, 5], 'altı renk karttan en iyi beşi');
  const k = enIyiEl(K('As 2d 3c 4h 5s 6d 9c'));
  assert.deepEqual(k.guc, [4, 6]);
  const c = enIyiEl(K('Ah Ad Kc Ks Qh Qd 2c'));
  assert.deepEqual(c.guc, [2, 14, 13, 12], 'üç çiftten en iyi ikisi + yan');
});

test('aynı kod + el = aynı deste; farklı el = farklı deste', () => {
  const a = elDestesi('k7q2m9', 3), b = elDestesi('K7Q-2M9', 3), c = elDestesi('K7Q2M9', 4);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  assert.equal(new Set(a.map(kartYazi)).size, 52);
  assert.equal(kontrolKodu('k7q2m9', 3), kontrolKodu('K7Q2M9', 3));
});

test('koltuk kartları ve ortak kartlar çakışmaz', () => {
  const d = elDestesi('ABCDEF', 1);
  const hepsi = [];
  for (let i = 0; i < 9; i++) hepsi.push(...koltukKartlari(d, i));
  hepsi.push(...ortakKartlar(d));
  assert.equal(new Set(hepsi.map(kartYazi)).size, 23);
});

test('karıştırma kabaca düzgün dağılıyor', () => {
  // İlk kartın 52 olası değere dağılımı: 5200 elde her kart ~100 kez.
  const say = new Map();
  for (let n = 1; n <= 5200; n++) {
    const k = kartYazi(elDestesi('DAGILIM', n)[0]);
    say.set(k, (say.get(k) || 0) + 1);
  }
  assert.equal(say.size, 52);
  for (const v of say.values()) assert.ok(v > 50 && v < 160, 'aşırı sapma: ' + v);
});
