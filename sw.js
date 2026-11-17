// Offline önbellek: ilk açılışta tüm dosyalar cihaza kaydedilir.
// Dosya değişince SURUM artırılır.
const SURUM = 'poker-v23';
const DOSYALAR = [
  './', 'index.html', 'css/stil.css', 'manifest.webmanifest',
  'js/uygulama.js', 'js/arayuz.js', 'js/masa.js', 'js/oyuncu.js', 'js/motor.js', 'js/kart.js', 'js/ses.js', 'js/fis.js', 'js/novo.js', 'js/novo_masa.js', 'js/krupiye.js', 'js/konus.js',
  'ikon-180.png', 'ikon-192.png', 'ikon-512.png',
];
self.addEventListener('install', e => {
  // Elif'in ses kayıtları da offline kaydedilir (liste.json'daki parçalar).
  e.waitUntil(caches.open(SURUM).then(async c => {
    await c.addAll(DOSYALAR);
    try {
      const r = await fetch('sesler/elif/liste.json', { cache: 'no-store' });
      const liste = r.ok ? await r.json() : [];
      await c.put('sesler/elif/liste.json', new Response(JSON.stringify(liste), { headers: { 'content-type': 'application/json' } }));
      await c.addAll(liste.map(k => 'sesler/elif/' + k + '.m4a'));
    } catch (err) { /* kayıt yoksa cihaz sesi kullanılır */ }
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
