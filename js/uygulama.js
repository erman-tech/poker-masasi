import { $ } from './arayuz.js';
import { masaBagla, masaKurulumu, masaDevam, masaKaydiVar } from './masa.js';
import { novoBagla, novoDevam, novoKaydiVar } from './novo_masa.js';
import { oyuncuBagla, oyuncuKurulumu, oyuncuDevam, oyuncuKaydiVar } from './oyuncu.js';
import * as ses from './ses.js';

masaBagla();
novoBagla();
oyuncuBagla();

const sonRol = () => { try { return localStorage.getItem('poker.rol'); } catch (e) { return null; } };
const rolYaz = r => { try { localStorage.setItem('poker.rol', r); } catch (e) {} };

$('g-masa').onclick = () => { ses.acil(); masaKurulumu(); };
$('g-oyuncu').onclick = () => { ses.acil(); rolYaz('oyuncu'); oyuncuKaydiVar() ? oyuncuDevam() : oyuncuKurulumu(); };

const rol = sonRol();
if ((rol === 'masa' && masaKaydiVar()) || (rol === 'novo' && novoKaydiVar()) || (rol === 'oyuncu' && oyuncuKaydiVar())) {
  const b = $('g-devam');
  b.hidden = false;
  b.textContent = rol === 'masa' ? "Texas masasına dön" : rol === 'novo' ? 'Novo masasına dön' : 'Kartlarıma dön';
  b.onclick = () => { ses.acil(); rol === 'masa' ? masaDevam() : rol === 'novo' ? novoDevam() : oyuncuDevam(); };
}

// Offline: ilk açılışta her şey cihaza kaydedilir.
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').then(() => {
    $('g-not').textContent = 'Bu sayfa cihaza kaydedildi; internetsiz de açılır.';
  }).catch(() => {
    $('g-not').textContent = 'Uyarı: offline kaydı yapılamadı. İnternet varken sayfayı bir kez daha açın.';
  });
}
