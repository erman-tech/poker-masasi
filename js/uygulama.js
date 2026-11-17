import { $ } from './arayuz.js';
import { masaBagla, masaKurulumu, masaDevam, masaKaydiVar } from './masa.js';
import { oyuncuBagla, oyuncuKurulumu, oyuncuDevam, oyuncuKaydiVar } from './oyuncu.js';
import * as ses from './ses.js';

masaBagla();
oyuncuBagla();

const sonRol = () => { try { return localStorage.getItem('poker.rol'); } catch (e) { return null; } };
const rolYaz = r => { try { localStorage.setItem('poker.rol', r); } catch (e) {} };

$('g-masa').onclick = () => { ses.acil(); rolYaz('masa'); masaKaydiVar() ? masaDevam() : masaKurulumu(); };
$('g-oyuncu').onclick = () => { ses.acil(); rolYaz('oyuncu'); oyuncuKaydiVar() ? oyuncuDevam() : oyuncuKurulumu(); };

const rol = sonRol();
if ((rol === 'masa' && masaKaydiVar()) || (rol === 'oyuncu' && oyuncuKaydiVar())) {
  const b = $('g-devam');
  b.hidden = false;
  b.textContent = rol === 'masa' ? 'Masaya dön (kayıtlı oyun)' : 'Kartlarıma dön';
  b.onclick = () => { ses.acil(); rol === 'masa' ? masaDevam() : oyuncuDevam(); };
}

// Offline: ilk açılışta her şey cihaza kaydedilir.
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(() => {
    $('g-not').textContent = 'Bu sayfa cihaza kaydedildi; internetsiz de açılır.';
  }).catch(() => {
    $('g-not').textContent = 'Uyarı: offline kaydı yapılamadı. İnternet varken sayfayı bir kez daha açın.';
  });
}
