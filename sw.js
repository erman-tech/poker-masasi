// Offline önbellek: ilk açılışta tüm dosyalar cihaza kaydedilir.
// Dosya değişince SURUM artırılır.
const SURUM = 'poker-v84';
const DOSYALAR = [
  './', 'index.html', 'css/stil.css', 'manifest.webmanifest',
  'js/uygulama.js', 'js/arayuz.js', 'js/masa.js', 'js/oyuncu.js', 'js/motor.js', 'js/kart.js', 'js/ses.js', 'js/fis.js', 'js/novo.js', 'js/novo_masa.js', 'js/krupiye.js', 'js/havai.js', 'js/konus.js',
  'sesler/fis/tek.mp3', 'sesler/fis/kucuk.mp3', 'sesler/fis/yigin.mp3', 'sesler/fis/itme.mp3', 'sesler/ortam.mp3', 'img/masa/lacivert.jpg', 'img/masa/yesil.jpg', 'img/masa/antrasit.jpg', 'img/kurpiye/1.jpg', 'img/kurpiye/2.jpg', 'img/kurpiye/3.jpg', 'img/kurpiye/1.mp4', 'img/kurpiye/2.mp4', 'img/kurpiye/3.mp4', 'img/kurpiye/1k.mp4', 'img/kurpiye/2k.mp4', 'img/kurpiye/3k.mp4', 'img/kurpiye/1g.jpg', 'img/kurpiye/2g.jpg', 'img/kurpiye/3g.jpg', 'img/kurpiye/1g.mp4', 'img/kurpiye/2g.mp4', 'img/kurpiye/3g.mp4', 'img/kurpiye/4.jpg', 'img/kurpiye/5.jpg', 'img/kurpiye/4.mp4', 'img/kurpiye/5.mp4', 'img/kurpiye/4k.mp4', 'img/kurpiye/5k.mp4', 'img/kurpiye/4g.jpg', 'img/kurpiye/5g.jpg', 'img/kurpiye/4g.mp4', 'img/kurpiye/5g.mp4', 'img/kurpiye/1t.png', 'img/kurpiye/2t.png', 'img/kurpiye/3t.png', 'img/kurpiye/4t.png', 'img/kurpiye/5t.png',
  'ikon-180.png', 'ikon-192.png', 'ikon-512.png',
];
self.addEventListener('install', e => {
  // Kurpiyelerin (Elif + 4 ses) kayıtları da offline kaydedilir (liste.json'daki parçalar).
  e.waitUntil(caches.open(SURUM).then(async c => {
    await c.addAll(DOSYALAR.map(u => new Request(u, { cache: 'reload' })));
    for (const kl of ['elif', 'k2', 'k3', 'k4', 'k5']) {
      try {
        const r = await fetch(`sesler/${kl}/liste.json`, { cache: 'no-store' });
        const liste = r.ok ? await r.json() : [];
        await c.put(`sesler/${kl}/liste.json`, new Response(JSON.stringify(liste), { headers: { 'content-type': 'application/json' } }));
        await c.addAll(liste.map(k => new Request(`sesler/${kl}/` + k + '.mp3', { cache: 'reload' })));
      } catch (err) { /* kayıt yoksa cihaz sesi kullanılır */ }
    }
  }).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SURUM).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Önce önbellek (offline'da anında açılır), arka planda internetten tazele.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(SURUM).then(async c => {
    const kayitli = await c.match(e.request, { ignoreSearch: true });
    const ag = fetch(e.request).then(r => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return kayitli || (await ag) || c.match('index.html');
  }));
});
