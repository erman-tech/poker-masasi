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
  // Yeni sürüm indiğinde sayfa kendini bir kez yeniler (eski sürüm açık kalmasın).
  const vardi = !!navigator.serviceWorker.controller;
  let yenilendi = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!vardi || yenilendi) return;
    yenilendi = true;
    // Giriş ekranındaysa hemen yenile; oyun sürerken eli bölme, köşede düğme göster.
    const giris = document.querySelector('#e-giris.etkin');
    if (giris) { location.reload(); return; }
    const b = document.createElement('button');
    b.className = 'yeni-surum'; b.textContent = 'Yeni sürüm hazır · yenile';
    b.onclick = () => location.reload();
    document.body.appendChild(b);
  });
  // Sürümü giriş ekranına yaz
  fetch('sw.js').then(r => r.text()).then(t => { const m = t.match(/poker-v(\d+)/); if (m) $('g-surum').textContent = 'Sürüm ' + m[1]; }).catch(() => {});
  navigator.serviceWorker.register('sw.js').then(() => {
    $('g-not').textContent = 'Bu sayfa cihaza kaydedildi; internetsiz de açılır.';
  }).catch(() => {
    $('g-not').textContent = 'Uyarı: offline kaydı yapılamadı. İnternet varken sayfayı bir kez daha açın.';
  });
}
