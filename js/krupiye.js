// Kasadaki krupiye: Elif (şirketin kasası). Çizgi film tarzı. Tamamen SVG (dosya indirmez, offline).
// Ruh halleri: normal · dagit (iki eliyle kart dağıtıyormuş gibi yapar) · gulen (kasa kazandı)
//              · saskin (oyuncu büyük kazandı) · goz (göz kırpar: express ödedi)
const SVG = `
<svg viewBox="0 0 220 180" xmlns="http://www.w3.org/2000/svg" aria-label="Krupiye Elif">
  <defs>
    <radialGradient id="kr-ten" cx="50%" cy="38%" r="62%"><stop offset="0" stop-color="#fdebe0"/><stop offset="1" stop-color="#efc6ae"/></radialGradient>
    <linearGradient id="kr-sac" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2530"/><stop offset=".6" stop-color="#121016"/><stop offset="1" stop-color="#060508"/></linearGradient>
    <linearGradient id="kr-yelek" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2b33"/><stop offset="1" stop-color="#121318"/></linearGradient>
  </defs>
  <!-- omuzlara dökülen dalgalı saç (arka) -->
  <path d="M50 70 C42 28 74 8 110 8 C146 8 178 28 170 70 C180 100 176 140 168 166 C156 150 158 120 148 100 L72 100 C62 120 64 150 52 166 C44 140 40 100 50 70Z" fill="url(#kr-sac)"/>
  <!-- gövde: siyah yelek, beyaz gömlek, hafif V yaka -->
  <path d="M34 180 C38 140 64 124 110 124 C156 124 182 140 186 180Z" fill="url(#kr-yelek)"/>
  <path d="M84 126 C92 124 128 124 136 126 L126 150 Q110 158 94 150Z" fill="#5b2a55"/>
  <path d="M96 125 Q110 133 124 125 Q110 128 96 125Z" fill="#efc6ae"/>
  <path d="M98 134 Q110 140 122 134" stroke="#7a3c72" stroke-width="1.2" fill="none" opacity=".8"/>
  <circle cx="110" cy="141" r="2.4" fill="#ffd765"/>
  <path d="M110 129 L110 139" stroke="#ffd765" stroke-width="1"/>
  <!-- boyun ve yüz -->
  <path d="M100 98 L120 98 L122 124 Q110 130 98 124Z" fill="#efc6ae"/>
  <ellipse cx="110" cy="68" rx="36" ry="41" fill="url(#kr-ten)"/>
  <!-- yana yatık kâkül -->
  <path d="M74 60 C72 30 104 20 126 28 C146 34 150 52 148 62 C140 46 124 40 108 46 C96 50 84 52 74 60Z" fill="url(#kr-sac)"/>
  <path d="M80 52 C92 36 114 32 132 38" stroke="#4a4458" stroke-width="2" fill="none" opacity=".7"/><path d="M70 100 C64 120 70 140 66 160 M150 100 C156 122 150 142 156 160" stroke="#3a3446" stroke-width="2" fill="none" opacity=".6"/>
  <!-- küpeler (sallanan) -->
  <g class="kr-kupe"><path d="M74 80 L74 88" stroke="#ffd765" stroke-width="1.5"/><circle cx="74" cy="91" r="3.5" fill="#ffd765"/></g>
  <g class="kr-kupe"><path d="M146 80 L146 88" stroke="#ffd765" stroke-width="1.5"/><circle cx="146" cy="91" r="3.5" fill="#ffd765"/></g>
  <!-- allık -->
  <ellipse cx="88" cy="84" rx="9" ry="5" fill="#ff8f9a" opacity=".45"/>
  <ellipse cx="132" cy="84" rx="9" ry="5" fill="#ff8f9a" opacity=".45"/>
  <!-- gözler: badem, uzun kirpik, göz farı -->
  <g class="kr-goz sol">
    <path d="M84 68 Q95 58 105 68 Q95 66 84 68Z" fill="#8a6a7a" opacity=".35"/>
    <path d="M85 70 Q95 61 105 70 Q95 78 85 70Z" fill="#fff"/>
    <circle class="kr-bebek" cx="95" cy="70" r="5" fill="#5a341c"/><circle cx="95" cy="70" r="2.4" fill="#111"/><circle cx="97" cy="68" r="1.4" fill="#fff"/>
    <path d="M84 70 Q95 59 106 69" stroke="#1d1420" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M86 66 L82 61 M90 63 L88 58 M95 62 L95 57 M100 63 L102 58" stroke="#1d1420" stroke-width="1.8" stroke-linecap="round"/>
  </g>
  <g class="kr-goz sag">
    <path d="M115 68 Q125 58 136 68 Q125 66 115 68Z" fill="#8a6a7a" opacity=".35"/>
    <path d="M115 70 Q125 61 135 70 Q125 78 115 70Z" fill="#fff"/>
    <circle class="kr-bebek" cx="125" cy="70" r="5" fill="#5a341c"/><circle cx="125" cy="70" r="2.4" fill="#111"/><circle cx="127" cy="68" r="1.4" fill="#fff"/>
    <path d="M114 69 Q125 59 136 70" stroke="#1d1420" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <path d="M134 66 L138 61 M130 63 L132 58 M125 62 L125 57 M120 63 L118 58" stroke="#1d1420" stroke-width="1.8" stroke-linecap="round"/>
  </g>
  <!-- ince kaşlar -->
  <path class="kr-kas sol" d="M82 57 Q94 48 105 54" stroke="#15121a" stroke-width="3.6" fill="none" stroke-linecap="round"/>
  <path class="kr-kas sag" d="M115 54 Q126 48 138 57" stroke="#15121a" stroke-width="3.6" fill="none" stroke-linecap="round"/>
  <!-- burun ve ben -->
  <path d="M110 76 Q107 85 112 87" stroke="#d48a66" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  
  <!-- dudaklar (ruj) -->
  <g class="kr-agiz normal"><path d="M99 96 Q105 92 110 95 Q115 92 121 96 Q110 104 99 96Z" fill="#c25560"/><path d="M101 96.5 Q110 99 119 96.5" stroke="#9a3e48" stroke-width="1" fill="none"/></g>
  <g class="kr-agiz gulen"><path d="M97 94 Q110 92 123 94 Q118 109 110 109 Q102 109 97 94Z" fill="#c25560"/><path d="M100 95.5 Q110 94 120 95.5 L118 99 Q110 100 102 99Z" fill="#fff"/></g>
  <g class="kr-agiz saskin"><ellipse cx="110" cy="99" rx="6" ry="7.5" fill="#c25560"/><ellipse cx="110" cy="100" rx="3.2" ry="4.5" fill="#6d0f22"/></g>
  <!-- eller: ikisinde de kart -->
  <g class="kr-el sol">
    <rect x="52" y="150" width="20" height="28" rx="3" fill="#fbf7ee" stroke="#a3202a" stroke-width="2" transform="rotate(-14 62 164)"/>
    <ellipse cx="62" cy="170" rx="15" ry="9" fill="#f0b591"/>
    <path d="M52 168 Q55 163 60 165 M58 166 Q62 162 66 165" stroke="#d48a66" stroke-width="1.2" fill="none"/>
    <circle cx="70" cy="166" r="2" fill="#8c7b86"/>
  </g>
  <g class="kr-el sag">
    <g class="kr-ucan-kart"><rect x="150" y="150" width="20" height="28" rx="3" fill="#fbf7ee" stroke="#a3202a" stroke-width="2" transform="rotate(14 160 164)"/></g>
    <ellipse cx="158" cy="170" rx="15" ry="9" fill="#f0b591"/>
    <path d="M168 168 Q165 163 160 165 M162 166 Q158 162 154 165" stroke="#d48a66" stroke-width="1.2" fill="none"/>
    <circle cx="150" cy="166" r="2" fill="#8c7b86"/>
  </g>
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
