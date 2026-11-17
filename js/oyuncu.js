// Oyuncunun telefonu: yalnız kendi iki kartı. Ağ yok; kartlar masa kodu + el numarasından üretilir.
import { elDestesi, koltukKartlari, kontrolKodu, kodNormalize, AZAMI_KOLTUK } from './kart.js';
import { $, ekranGoster, kartEl, kartUcur, bekle, onayla, ekranAcikTut, kacis } from './arayuz.js';
import * as ses from './ses.js';

const ANAHTAR = 'poker.oyuncu.v1';
let D = null;          // { kod, koltuk, ad, elNo }
let atildi = false;
let mesgul = false;

function kaydet() { try { localStorage.setItem(ANAHTAR, JSON.stringify(D)); } catch (e) {} }
export function oyuncuKaydiVar() {
  try { return !!JSON.parse(localStorage.getItem(ANAHTAR) || 'null'); } catch (e) { return false; }
}

export function oyuncuKurulumu() {
  let eski = null;
  try { eski = JSON.parse(localStorage.getItem(ANAHTAR) || 'null'); } catch (e) {}
  const sel = $('o-koltuk');
  sel.innerHTML = Array.from({ length: AZAMI_KOLTUK }, (_, i) => `<option value="${i}">${i + 1}</option>`).join('');
  if (eski) { $('o-kod').value = eski.kod; sel.value = eski.koltuk; $('o-ad').value = eski.ad || ''; }
  $('o-hata').textContent = '';
  ekranGoster('e-oyuncu-kur');
}

export function oyuncuDevam() {
  try { D = JSON.parse(localStorage.getItem(ANAHTAR) || 'null'); } catch (e) { D = null; }
  if (!D) return oyuncuKurulumu();
  oyuncuEkrani();
}

function oyuncuEkrani() {
  $('oy-ad').textContent = (D.ad || 'Oyuncu') + ' · Koltuk ' + (D.koltuk + 1);
  $('oy-ses').textContent = ses.sesAcikMi() ? '🔊' : '🔇';
  ekranGoster('e-oyuncu');
  ekranAcikTut();
  ciz(false);
}

function ciz(animasyon) {
  $('oy-elno').textContent = D.elNo > 0 ? D.elNo : '–';
  $('oy-kontrol').textContent = D.elNo > 0 ? kontrolKodu(D.kod, D.elNo) : '–';
  $('oy-onceki').disabled = D.elNo <= 1;
  const alan = $('oy-kartlar');
  alan.classList.remove('atildi');
  alan.innerHTML = '';
  if (D.elNo <= 0) {
    $('oy-ipucu').textContent = "iPad ilk eli dağıtınca 'Sonraki el'e bas.";
    $('oy-at').disabled = true;
    return [];
  }
  const kartlar = koltukKartlari(elDestesi(D.kod, D.elNo), D.koltuk);
  const els = kartlar.map(k => kartEl(k, false));
  alan.append(...els);
  if (animasyon) els.forEach(e => (e.style.visibility = 'hidden'));
  $('oy-at').disabled = false;
  $('oy-ipucu').textContent = 'Kartlarına bakmak için basılı tut; bırakınca kapanır. Elendiysen bu kartlar oyunda değil.';
  atildi = false;
  return els;
}

async function sonrakiEl() {
  if (mesgul) return;
  mesgul = true;
  ses.acil();
  D.elNo += 1; kaydet();
  const els = ciz(true);
  const sure = ses.karistir();
  await bekle(Math.min(1400, (sure || 0) * 1000 * 0.6));
  const kaynak = { left: innerWidth / 2 - 30, top: -120, width: 60, height: 84 };
  for (let i = 0; i < els.length; i++) {
    ses.kartAt();
    await kartUcur(kaynak, els[i], 380, i ? 6 : -6);
    els[i].style.visibility = '';
    await bekle(260);
  }
  mesgul = false;
}

function goster(ac) {
  if (!D || atildi || D.elNo <= 0) return;
  const els = $('oy-kartlar').querySelectorAll('.kart');
  const once = els[0] && els[0].classList.contains('acik');
  if (once === ac) return;
  els.forEach(e => e.classList.toggle('acik', ac));
  if (ac) ses.kartCevir();
}

export function oyuncuBagla() {
  $('o-geri').onclick = () => ekranGoster('e-giris');
  $('o-basla').onclick = () => {
    ses.acil();
    const kod = kodNormalize($('o-kod').value);
    if (kod.length < 4) { $('o-hata').textContent = 'Masa kodunu iPad\'den aynen yaz.'; return; }
    const koltuk = Number($('o-koltuk').value);
    const ad = $('o-ad').value.trim();
    const ayniMasa = D && D.kod === kod && D.koltuk === koltuk;
    D = { kod, koltuk, ad, elNo: ayniMasa ? D.elNo : 0 };
    kaydet();
    oyuncuEkrani();
  };
  $('oy-sonraki').onclick = sonrakiEl;
  $('oy-onceki').onclick = () => { if (D.elNo > 1 && !mesgul) { D.elNo -= 1; kaydet(); ciz(false); } };
  $('oy-elno').parentElement.onclick = () => {
    const v = prompt('Hangi el? (iPad\'deki El numarası)', D.elNo || 1);
    const n = Math.floor(Number(v));
    if (n >= 1) { D.elNo = n; kaydet(); ciz(false); }
  };
  $('oy-at').onclick = async () => {
    if (atildi) return;
    if (!(await onayla('Kartlarını atıyor musun? Bu yalnız senin ekranını kapatır; fold\'u iPad\'e de basmayı unutma.', 'At'))) return;
    goster(false);
    atildi = true;
    ses.kartlariAt();
    $('oy-kartlar').classList.add('atildi');
    $('oy-ipucu').textContent = 'Kartlar atıldı. Yeni el gelince Sonraki el.';
    $('oy-at').disabled = true;
  };
  $('oy-ses').onclick = () => { ses.acil(); ses.sesAyarla(!ses.sesAcikMi()); $('oy-ses').textContent = ses.sesAcikMi() ? '🔊' : '🔇'; };
  $('oy-ayar').onclick = () => oyuncuKurulumu();

  const alan = $('oy-kartlar');
  alan.addEventListener('pointerdown', e => { e.preventDefault(); ses.acil(); goster(true); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => alan.addEventListener(t, () => goster(false)));
  alan.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('visibilitychange', () => { if (document.hidden) goster(false); });
  window.addEventListener('blur', () => goster(false));
}

export { kacis };
