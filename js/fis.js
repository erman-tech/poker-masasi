// Temsili fişler: $5 kırmızı, $25 yeşil, $100 siyah, $1000 sarı (casino renkleri).
export const FISLER = [
  { deger: 1000, renk: '#e9b72a', kenar: '#7a4d00', yazi: '#3b2600' },
  { deger: 100, renk: '#1c1d22', kenar: '#f2f2f2', yazi: '#f2f2f2' },
  { deger: 25, renk: '#1f8a4c', kenar: '#f2f2f2', yazi: '#ffffff' },
  { deger: 5, renk: '#c62f2f', kenar: '#f2f2f2', yazi: '#ffffff' },
  { deger: 1, renk: '#f1efe8', kenar: '#2a5bc4', yazi: '#2a5bc4' },
];

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
      if (k === gorunen - 1) { c.classList.add('ust'); c.textContent = f.deger >= 1000 ? '1K' : f.deger; }
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
