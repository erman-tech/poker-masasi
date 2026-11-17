// Küçük havai fişek gösterisi (büyük express bonusunda): tam ekran şeffaf tuval, birkaç patlama, ~3,5 sn.
export function havaiFisek({ patlama = 6, sure = 3500 } = {}) {
  const c = document.createElement('canvas');
  c.className = 'havai-fisek';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = innerWidth, H = innerHeight;
  c.width = W * dpr; c.height = H * dpr;
  document.body.appendChild(c);
  const x = c.getContext('2d');
  x.scale(dpr, dpr);
  const renkler = ['#ffd765', '#ff5d73', '#7ad7ff', '#9dff8a', '#ffffff', '#ffb347'];
  const parca = [];
  const patlat = () => {
    const px = W * (0.2 + Math.random() * 0.6), py = H * (0.12 + Math.random() * 0.35);
    const r = renkler[Math.floor(Math.random() * renkler.length)];
    const n = 46;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, h = 2.2 + Math.random() * 2.4;
      parca.push({ x: px, y: py, vx: Math.cos(a) * h, vy: Math.sin(a) * h, o: 1, r });
    }
  };
  for (let i = 0; i < patlama; i++) setTimeout(patlat, i * (sure * 0.6 / patlama));
  const t0 = performance.now();
  const kare = t => {
    x.clearRect(0, 0, W, H);
    for (const p of parca) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.vx *= 0.985; p.vy *= 0.985; p.o -= 0.012;
      if (p.o <= 0) continue;
      x.globalAlpha = p.o; x.fillStyle = p.r;
      x.beginPath(); x.arc(p.x, p.y, 2.2, 0, Math.PI * 2); x.fill();
    }
    if (t - t0 < sure + 1500) requestAnimationFrame(kare); else c.remove();
  };
  requestAnimationFrame(kare);
}
