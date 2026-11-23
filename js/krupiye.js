// Kasadaki kurpiye: üç hayali kurpiye (gerçek kişiler değil), 10 elde bir değişir ("dealer change").
// Durağan halde fotoğraf, dağıtırken kısa video döngüsü (img/kurpiye/<n>.jpg / .mp4, offline önbellekte).
// Ruh halleri: normal · dagit (kart dağıtıyor: video) · gulen (kasa kazandı) · saskin (oyuncu büyük kazandı) · goz (express ödedi)
export const KURPIYE_SAYISI = 5;
export const DEGISIM_EL = 10;

let kok = null, tepe = null, img = null, vid = null, kvid = null, gvid = null, simdiki = -1, vidUrl = null, kvidUrl = null, gvidUrl = null;
import { kurpiyeSesi } from './konus.js';
let galaAcik = false;
let zaman = null;

// El numarasına göre o elin kurpiyesi (1-10. el: 0, 11-20. el: 1 ...)
export function eldekiKurpiye(elNo) {
  return Math.floor(Math.max(0, (elNo || 1) - 1) / DEGISIM_EL) % KURPIYE_SAYISI;
}
// Bu el dağıtılırken kurpiye değişiyor mu?
export function degisimEli(elNo) {
  return elNo > 1 && (elNo - 1) % DEGISIM_EL === 0;
}

export function krupiyeKur(yer) {
  if (!yer) return;
  yer.innerHTML = '<div class="kr-foto"><img alt="Kurpiye"><video class="kr-dagit" muted playsinline loop preload="auto"></video><video class="kr-konus" muted playsinline loop preload="auto"></video><video class="kr-gala" muted playsinline preload="auto"></video></div>';
  kok = yer;
  img = yer.querySelector('img');
  vid = yer.querySelector('.kr-dagit');
  kvid = yer.querySelector('.kr-konus');
  gvid = yer.querySelector('.kr-gala');
  // Masa alanında iki katman: tepeden kurpiye (masanın girintisinde, elleri keçede) ve köşede yüz kamerası
  const alan = yer.closest('.masa-alan');
  tepe = null;
  if (alan) {
    if (yer.parentElement !== alan) alan.appendChild(yer);
    yer.classList.add('kr-kamera');
    let t = alan.querySelector('.kr-tepe');
    if (!t) {
      t = document.createElement('div');
      t.className = 'kr-tepe';
      t.innerHTML = '<div class="kr-girinti"></div><img alt="">';
      alan.insertBefore(t, alan.children[1] || null);
    }
    tepe = t;
  }
  simdiki = -1;
  ruh('normal');
}

function yukle(i) {
  if (!img) return;
  simdiki = i;
  kurpiyeSesi(i);
  galaAcik = false;
  if (kok) kok.classList.remove('kr-gala');
  img.src = `img/kurpiye/${i + 1}.jpg`;
  if (tepe) tepe.querySelector('img').src = `img/kurpiye/${i + 1}t.png`;
  // iPad Safari önbellekten (service worker) gelen videoyu parça parça isteyemez; videoyu
  // bir kez belleğe alıp oradan oynatırız, internetsiz de çalışır.
  const istenen = i;
  fetch(`img/kurpiye/${i + 1}.mp4`).then(r => (r.ok ? r.blob() : Promise.reject())).then(b => {
    if (istenen !== simdiki) return;
    if (vidUrl) URL.revokeObjectURL(vidUrl);
    vidUrl = URL.createObjectURL(b);
    vid.src = vidUrl;
    vid.load();
  }).catch(() => {});
  fetch(`img/kurpiye/${i + 1}k.mp4`).then(r => (r.ok ? r.blob() : Promise.reject())).then(b => {
    if (istenen !== simdiki) return;
    if (kvidUrl) URL.revokeObjectURL(kvidUrl);
    kvidUrl = URL.createObjectURL(b);
    kvid.src = kvidUrl;
    kvid.load();
  }).catch(() => {});
  fetch(`img/kurpiye/${i + 1}g.mp4`).then(r => (r.ok ? r.blob() : Promise.reject())).then(b => {
    if (istenen !== simdiki) return;
    if (gvidUrl) URL.revokeObjectURL(gvidUrl);
    gvidUrl = URL.createObjectURL(b);
    gvid.src = gvidUrl;
    gvid.load();
  }).catch(() => {});
}

// Animasyonsuz ayarla (sayfa açılışı, geri al)
export function kurpiyeAyarla(i) {
  if (i !== simdiki) yukle(i);
  else gala(false);
}

// Büyük express (30 kat ve üstü): kurpiye gala elbisesiyle kutlar; sonraki dağıtıma kadar öyle kalır.
export function gala(acik) {
  if (!kok || simdiki < 0 || acik === galaAcik) return;
  galaAcik = acik;
  img.src = `img/kurpiye/${simdiki + 1}${acik ? 'g' : ''}.jpg`;
  kok.classList.toggle('kr-gala', acik);
  if (gvid) {
    if (acik) { gvid.currentTime = 0; const p = gvid.play(); if (p && p.catch) p.catch(() => {}); }
    else gvid.pause();
  }
}

// "Dealer change": eskisi solar, yenisi gelir
export async function kurpiyeDegistir(i) {
  if (!kok) return;
  kok.classList.add('kr-cikis');
  if (tepe) tepe.classList.add('kr-cikis');
  await new Promise(r => setTimeout(r, 700));
  yukle(i);
  kok.classList.remove('kr-cikis');
  kok.classList.add('kr-giris');
  if (tepe) { tepe.classList.remove('kr-cikis'); tepe.classList.add('kr-giris'); }
  await new Promise(r => setTimeout(r, 700));
  kok.classList.remove('kr-giris');
  if (tepe) tepe.classList.remove('kr-giris');
}

// Elif konuşurken ağız hareketi (dağıtım sürerken araya girmez)
export function konusuyor(sure) {
  if (!kok || galaAcik || kok.dataset.ruh === 'dagit') return;
  ruh('konus', sure);
}

// sure (ms) verilirse sonra normale döner
export function ruh(ad, sure = 0) {
  if (!kok) return;
  kok.dataset.ruh = ad;
  if (tepe) tepe.dataset.ruh = ad;
  const oynat = (v, evet) => {
    if (!v) return;
    if (evet) { v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => {}); } else v.pause();
  };
  oynat(vid, ad === 'dagit' && !galaAcik);
  oynat(kvid, ad === 'konus' && !galaAcik);
  clearTimeout(zaman);
  if (sure) zaman = setTimeout(() => ruh('normal'), sure);
}
