// Kasadaki krupiye: çizgi film tarzı, komik bir kadın. Tamamen SVG (dosya indirmez, offline).
// Ruh halleri: normal · dagit (kart dağıtırken eli oynar) · gulen (kasa kazandı)
//              · saskin (oyuncu büyük kazandı) · goz (göz kırpar: express ödedi)
const SVG = `
<svg viewBox="0 0 220 170" xmlns="http://www.w3.org/2000/svg" aria-label="Krupiye">
  <defs>
    <radialGradient id="kr-ten" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#ffdcc0"/><stop offset="1" stop-color="#f1b58e"/></radialGradient>
    <linearGradient id="kr-sac" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a3d"/><stop offset="1" stop-color="#d9481c"/></linearGradient>
  </defs>
  <!-- saç arka kütlesi ve topuz -->
  <circle cx="110" cy="22" r="20" fill="url(#kr-sac)"/>
  <circle cx="96" cy="18" r="7" fill="#ff8a50"/><circle cx="122" cy="14" r="6" fill="#ff8a50"/>
  <path d="M58 78 C46 40 72 18 110 18 C148 18 174 40 162 78 C170 100 150 112 140 104 L80 104 C70 112 50 100 58 78Z" fill="url(#kr-sac)"/>
  <!-- gövde: beyaz gömlek, siyah yelek, kırmızı papyon -->
  <path d="M40 170 C44 128 72 116 110 116 C148 116 176 128 180 170Z" fill="#1c1d22"/>
  <path d="M92 118 L110 160 L128 118Z" fill="#fff"/>
  <path d="M96 124 L110 132 L96 140Z M124 124 L110 132 L124 140Z" fill="#d42c3a"/>
  <circle cx="110" cy="132" r="4" fill="#a81f2b"/>
  <!-- boyun ve yüz -->
  <rect x="100" y="98" width="20" height="22" rx="8" fill="#f1b58e"/>
  <ellipse cx="110" cy="70" rx="40" ry="42" fill="url(#kr-ten)"/>
  <!-- kâkül -->
  <path d="M72 58 C76 34 100 30 112 40 C116 30 140 30 148 50 C134 44 124 48 118 54 C108 44 88 44 72 58Z" fill="url(#kr-sac)"/>
  <!-- küpeler -->
  <circle cx="70" cy="82" r="4" fill="#ffd765"/><circle cx="150" cy="82" r="4" fill="#ffd765"/>
  <!-- yanaklar -->
  <ellipse cx="86" cy="86" rx="8" ry="5" fill="#ff8f8f" opacity=".55"/>
  <ellipse cx="134" cy="86" rx="8" ry="5" fill="#ff8f8f" opacity=".55"/>
  <!-- gözler -->
  <g class="kr-gozler">
    <g class="kr-goz sol"><ellipse cx="94" cy="70" rx="9" ry="10" fill="#fff"/><circle class="kr-bebek" cx="95" cy="72" r="5" fill="#2b2240"/><circle cx="97" cy="70" r="1.6" fill="#fff"/>
      <path d="M84 63 L82 58 M88 61 L87 56 M92 60 L92 55" stroke="#2b2240" stroke-width="2" stroke-linecap="round"/></g>
    <g class="kr-goz sag"><ellipse cx="126" cy="70" rx="9" ry="10" fill="#fff"/><circle class="kr-bebek" cx="127" cy="72" r="5" fill="#2b2240"/><circle cx="129" cy="70" r="1.6" fill="#fff"/>
      <path d="M136 63 L138 58 M132 61 L133 56 M128 60 L128 55" stroke="#2b2240" stroke-width="2" stroke-linecap="round"/></g>
  </g>
  <!-- kaşlar -->
  <path class="kr-kas sol" d="M84 56 Q94 50 102 55" stroke="#b8401a" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path class="kr-kas sag" d="M118 55 Q126 50 136 56" stroke="#b8401a" stroke-width="3" fill="none" stroke-linecap="round"/>
  <!-- burun -->
  <path d="M110 76 Q107 86 112 88" stroke="#d98a64" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- ağızlar (yalnız biri görünür) -->
  <path class="kr-agiz normal" d="M98 96 Q110 106 122 96" stroke="#c42640" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path class="kr-agiz gulen" d="M94 94 Q110 116 126 94 Z" fill="#c42640"/>
  <ellipse class="kr-agiz saskin" cx="110" cy="99" rx="6" ry="8" fill="#c42640"/>
  <!-- eller (kartları tutan) -->
  <g class="kr-el sol"><ellipse cx="62" cy="160" rx="16" ry="10" fill="#f1b58e"/><rect x="50" y="146" width="22" height="16" rx="3" fill="#fbf7ee" stroke="#a3202a" stroke-width="2" transform="rotate(-12 61 154)"/></g>
  <g class="kr-el sag"><ellipse cx="158" cy="160" rx="16" ry="10" fill="#f1b58e"/></g>
</svg>`;

let kok = null;
let zaman = null;

export function krupiyeKur(yer) {
  if (!yer) return;
  yer.innerHTML = SVG;
  kok = yer;
  ruh('normal');
}

// sure (ms) verilirse sonra normale döner
export function ruh(ad, sure = 0) {
  if (!kok) return;
  kok.dataset.ruh = ad;
  clearTimeout(zaman);
  if (sure) zaman = setTimeout(() => { if (kok) kok.dataset.ruh = 'normal'; }, sure);
}
