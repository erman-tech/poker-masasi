// Temsili fişler: $5 kırmızı, $25 yeşil, $100 siyah, $1000 sarı (casino renkleri).
export const FISLER = [
  { deger: 1000, renk: '#c9a06b', kenar: '#f3e2c4', yazi: '#3b2600' },
  { deger: 100, renk: '#1c1d22', kenar: '#d9b98a', yazi: '#f2f2f2' },
  { deger: 25, renk: '#2a9a55', kenar: '#a6e3ae', yazi: '#ffffff' },
  { deger: 5, renk: '#cf3527', kenar: '#f2b33b', yazi: '#ffffff' },
  { deger: 1, renk: '#eef0f1', kenar: '#86c8e3', yazi: '#2a5bc4' },
];

// Yukarıdan görünen çip yüzü (SVG): renkli kenar, kenar boyunca 8 çentik, beyaz orta etiket, değer.
export function cipYuzu(f) {
  const cent = [];
  for (let k = 0; k < 8; k++) {
    const a = k * 45;
    cent.push(`<rect x="42" y="1" width="16" height="13" rx="4" fill="${f.kenar}" transform="rotate(${a} 50 50)"/>`);
  }
  const yazi = f.deger >= 1000 ? (f.deger / 1000) + 'K' : String(f.deger);
  const boy = yazi.length >= 3 ? 19 : 24;
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">` +
    `<circle cx="50" cy="50" r="49" fill="${f.renk}"/>${cent.join('')}` +
    `<circle cx="50" cy="50" r="49" fill="none" stroke="#0004" stroke-width="1.5"/>` +
    `<circle cx="50" cy="50" r="34" fill="${f.kenar}" opacity=".9"/>` +
    `<circle cx="50" cy="50" r="31" fill="#f7f6f1" stroke="${f.renk}" stroke-width="1.6"/>` +
    `<circle cx="50" cy="50" r="27" fill="none" stroke="#0002" stroke-width=".8"/>` +
    `<text x="50" y="${50 + boy * 0.36}" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${boy}" fill="#151515">${yazi}</text>` +
    `<text x="50" y="72" text-anchor="middle" font-family="Georgia, serif" font-size="6.5" letter-spacing="1" fill="#555">NOVO</text>` +
    `<ellipse cx="38" cy="30" rx="26" ry="14" fill="#fff" opacity=".18"/></svg>`;
}

// Bahis dairesine yukarıdan bakış: her değerden bir çip, üst üste hafif kaymış; birden çoksa adet yazılır.
export function ustCipEl(miktar, boyut = 40) {
  const kap = document.createElement('div');
  kap.className = 'ust-cipler';
  kap.style.setProperty('--fis', boyut + 'px');
  const parcalar = fisDok(miktar, false);
  parcalar.forEach((f, j) => {
    const c = document.createElement('div');
    c.className = 'ust-cip';
    c.style.setProperty('--j', j);
    // Birden çok çip: altta gölge halkaları (yığın hissi)
    if (f.adet > 1) c.classList.add('cok');
    c.innerHTML = cipYuzu(f) + (f.adet > 1 ? `<b class="ust-adet">×${f.adet}</b>` : '');
    kap.appendChild(c);
  });
  return kap;
}

// Bir tutarı fişlere böler. cesitli=true: oyuncunun önündeki yığın; her renkten bir miktar
// bozuk tutulur (gerçek masadaki gibi). $1000 yalnız 2000 ve üstünde görünür.
// cesitli=false: bahis ve pot; en az fişle.
export function fisDok(miktar, cesitli = false) {
  let kalan = Math.max(0, Math.floor(miktar));
  const sonuc = [];
  FISLER.forEach((f, i) => {
    const sonraki = FISLER[i + 1];
    // 1000'lik yalnız en az 10 tane 100'lük kalacaksa; diğerlerinde bir sonraki renkten 4 tane bozuk kalır.
    const bozuk = cesitli && sonraki && sonraki.deger >= 5 ? sonraki.deger * (f.deger >= 1000 ? 10 : 4) : 0;
    const adet = Math.max(0, Math.floor((kalan - bozuk) / f.deger));
    if (adet > 0) { sonuc.push({ ...f, adet }); kalan -= adet * f.deger; }
  });
  return sonuc;
}

// DOM: fiş sütunları (her renk ayrı yığın). Çok fiş olursa yığın kısaltılır, adet yazılır.
export function yiginEl(miktar, { cesitli = false, enCok = 10, boyut = 26 } = {}) {
  const kap = document.createElement('div');
  kap.className = 'yigin';
  kap.style.setProperty('--fis', boyut + 'px');
  for (const f of fisDok(miktar, cesitli)) {
    const sutun = document.createElement('div');
    sutun.className = 'sutun';
    const gorunen = Math.min(f.adet, enCok);
    for (let k = 0; k < gorunen; k++) {
      const c = document.createElement('div');
      c.className = 'fis';
      c.style.setProperty('--renk', f.renk);
      c.style.setProperty('--kenar', f.kenar);
      c.style.setProperty('--yazi', f.yazi);
      c.style.bottom = (k * boyut * 0.16) + 'px';
      if (k === gorunen - 1) { c.classList.add('ust'); c.innerHTML = cipYuzu(f); }
      sutun.appendChild(c);
    }
    sutun.style.height = (boyut * 0.62 + (gorunen - 1) * boyut * 0.16) + 'px';
    if (f.adet > 1) {
      const a = document.createElement('div');
      a.className = 'adet';
      a.textContent = '×' + f.adet;
      sutun.appendChild(a);
    }
    kap.appendChild(sutun);
  }
  return kap;
}
