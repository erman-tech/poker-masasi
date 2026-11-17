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
  // Yeni sürüm için kendiliğinden yenilendiyse kaldığı masaya doğrudan döner.
  let geriDon = false;
  try { geriDon = sessionStorage.getItem('poker.surumYenileme') === '1'; sessionStorage.removeItem('poker.surumYenileme'); } catch (e) {}
  if (geriDon) b.onclick();
}
const surumYenile = () => { try { sessionStorage.setItem('poker.surumYenileme', '1'); } catch (e) {} location.reload(); };

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
    b.onclick = surumYenile;
    document.body.appendChild(b);
    // El bitince (dağıt düğmesi görünürken) kendiliğinden yenile; oyun durumu cihazda kayıtlı.
    setInterval(() => {
      const dagit = [...document.querySelectorAll('button')].find(x => x.offsetParent && /^(İlk eli|Sonraki eli)/.test(x.textContent.trim()) && !x.disabled);
      if (document.querySelector('#e-giris.etkin')) location.reload();
      else if (dagit) surumYenile();
    }, 2000);
  });
  // Açık kalan sekme de yeni sürümü görsün: dakikada bir ve ekrana dönüldüğünde sor.
  const sor = () => navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {});
  setInterval(sor, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sor(); });
  // Sürümü giriş ekranına yaz
  fetch('sw.js').then(r => r.text()).then(t => { const m = t.match(/poker-v(\d+)/); if (m) $('g-surum').textContent = 'Sürüm ' + m[1]; }).catch(() => {});
  navigator.serviceWorker.register('sw.js').then(() => {
    $('g-not').textContent = 'Bu sayfa cihaza kaydedildi; internetsiz de açılır.';
  }).catch(() => {
    $('g-not').textContent = 'Uyarı: offline kaydı yapılamadı. İnternet varken sayfayı bir kez daha açın.';
  });
}
