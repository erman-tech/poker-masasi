// Ekranların ortak parçaları: kart çizimi, uçan kart animasyonu, perde, ekran geçişi.
import { RENK_SIMGE, DEGER_AD } from './kart.js';

export const $ = id => document.getElementById(id);

export function ekranGoster(id) {
  document.querySelectorAll('.ekran').forEach(e => e.classList.toggle('etkin', e.id === id));
  window.scrollTo(0, 0);
}

export function kartEl(kart, acik = false) {
  const el = document.createElement('div');
  el.className = 'kart' + (acik ? ' acik' : '');
  const yuz = document.createElement('div'); yuz.className = 'yuz';
  const arka = document.createElement('div'); arka.className = 'arka';
  el.append(yuz, arka);
  if (kart) kartYuzu(el, kart);
  return el;
}

export function kartYuzu(el, kart) {
  const yuz = el.querySelector('.yuz');
  const r = RENK_SIMGE[kart.r];
  const d = DEGER_AD[kart.d] || String(kart.d);
  el.classList.toggle('kirmizi', kart.r === 'h' || kart.r === 'd');
  el.classList.toggle('siyah', kart.r === 's' || kart.r === 'c');
  yuz.innerHTML = `<div class="kose">${d}<span>${r}</span></div><div class="orta">${r}</div><div class="kose alt">${d}<span>${r}</span></div>`;
}

const bekle = ms => new Promise(r => setTimeout(r, ms));
export { bekle };

// Bir kart arkasını kaynaktan hedefe uçurur (görsel kopya; asıl kart hedefte belirir).
export async function kartUcur(kaynakRect, hedefEl, sure = 340, donus = 0) {
  const h = hedefEl.getBoundingClientRect();
  if (!h.width) return;
  const k = kartEl(null, false);
  k.classList.add('ucan');
  k.style.setProperty('--kart-gen', h.width + 'px');
  k.style.left = h.left + 'px';
  k.style.top = h.top + 'px';
  const dx = (kaynakRect.left + kaynakRect.width / 2) - (h.left + h.width / 2);
  const dy = (kaynakRect.top + kaynakRect.height / 2) - (h.top + h.height / 2);
  k.style.transition = 'none';
  k.style.transform = `translate(${dx}px, ${dy}px) rotate(${donus - 25}deg) scale(.75)`;
  document.body.appendChild(k);
  k.getBoundingClientRect();
  k.style.transition = `transform ${sure}ms cubic-bezier(.15,.75,.3,1)`;
  k.style.transform = `translate(0,0) rotate(${donus}deg) scale(1)`;
  await bekle(sure);
  k.remove();
}

export function perdeAc(html, baglan) {
  $('perde-kutu').innerHTML = html;
  $('perde').classList.add('acik');
  if (baglan) baglan($('perde-kutu'));
}
export function perdeKapat() { $('perde').classList.remove('acik'); }

export function onayla(soru, evetYazi = 'Evet') {
  return new Promise(res => {
    perdeAc(`<div style="font-size:19px">${soru}</div>
      <div class="satir"><button class="btn-ikincil" data-c="0">Vazgeç</button><button class="btn-ana" data-c="1">${evetYazi}</button></div>`,
    k => k.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { perdeKapat(); res(b.dataset.c === '1'); }));
  });
}

// Ekranın kararmaması (destekleyen tarayıcılarda)
let kilit = null;
export async function ekranAcikTut() {
  try {
    if ('wakeLock' in navigator && !kilit) {
      kilit = await navigator.wakeLock.request('screen');
      kilit.addEventListener('release', () => { kilit = null; });
    }
  } catch (e) { kilit = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && document.querySelector('#e-masa.etkin, #e-oyuncu.etkin')) ekranAcikTut();
});

export function sayi(n) { return Number(n).toLocaleString('tr-TR'); }
export function para(n) { return '$' + sayi(n); }
export function kacis(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
