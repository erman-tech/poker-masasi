// Ortadaki cihaz (iPad): masa, fişler, sıra, bahisler. Oyunun tek doğru kaydı burada tutulur.
import { kontrolKodu, AZAMI_KOLTUK, KATEGORI_AD } from './kart.js';
import {
  yeniOyun, eliBaslat, hamleYap, yasalHamleler, potToplam, potlariHesapla, korlar, korSeviyesi, yenidenBaslat,
} from './motor.js';
import { $, ekranGoster, kartEl, kartYuzu, kartUcur, bekle, perdeAc, perdeKapat, onayla, ekranAcikTut, sayi, kacis } from './arayuz.js';
import * as ses from './ses.js';

const ANAHTAR = 'poker.masa.v1';
let M = null;            // { g, gecmis: [], sahip }
let mesgul = false;
let yukseltAcik = false;
let yukseltMiktar = 0;
let hata = '';

function kaydet() {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(M)); }
  catch (e) { // yer kalmadıysa geçmişi kısalt
    M.gecmis = M.gecmis.slice(-5);
    try { localStorage.setItem(ANAHTAR, JSON.stringify(M)); } catch (e2) {}
  }
}
export function masaKaydiVar() {
  try { return !!JSON.parse(localStorage.getItem(ANAHTAR) || 'null'); } catch (e) { return false; }
}

function kodUret() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const r = new Uint32Array(6);
  crypto.getRandomValues(r);
  return Array.from(r, x => abc[x % abc.length]).join('');
}

// ---------------- Kurulum ----------------
let adlar = ['Erman', 'Fidan', 'Emrah'];

function kurulumCiz() {
  $('k-oyuncular').innerHTML = adlar.map((a, i) => `
    <div class="satir">
      <span style="flex:0 0 34px;font-weight:800;color:var(--altin)">${i + 1}</span>
      <input data-i="${i}" value="${kacis(a)}" maxlength="14" placeholder="Ad">
      <button class="btn-ikincil" data-sil="${i}" ${adlar.length <= 2 ? 'disabled' : ''}>✕</button>
    </div>`).join('');
  $('k-oyuncular').querySelectorAll('input').forEach(inp => inp.oninput = () => { adlar[+inp.dataset.i] = inp.value; sahipCiz(); });
  $('k-oyuncular').querySelectorAll('[data-sil]').forEach(b => b.onclick = () => { adlar.splice(+b.dataset.sil, 1); kurulumCiz(); });
  $('k-ekle').disabled = adlar.length >= AZAMI_KOLTUK;
  sahipCiz();
}
function sahipCiz() {
  const s = $('k-sahip'), once = s.value;
  s.innerHTML = '<option value="-1">Kimsenin değil (iPad ortada)</option>' +
    adlar.map((a, i) => `<option value="${i}">${kacis(a || 'Oyuncu ' + (i + 1))} — telefonu masa yapıyoruz</option>`).join('');
  if (once && Number(once) < adlar.length) s.value = once;
}

export function masaKurulumu() {
  $('k-hata').textContent = '';
  kurulumCiz();
  ekranGoster('e-kurulum');
}

function masayiAc() {
  const temiz = adlar.map(a => a.trim());
  if (temiz.some(a => !a)) { $('k-hata').textContent = 'Her oyuncuya bir ad yaz.'; return; }
  const fis = Math.floor(Number($('k-fis').value));
  if (!(fis >= 100)) { $('k-hata').textContent = 'Başlangıç fişi en az 100 olmalı.'; return; }
  M = {
    g: yeniOyun({ adlar: temiz, kod: kodUret(), baslangicFis: fis, korArtisEl: Number($('k-kor').value) }),
    gecmis: [],
    sahip: Number($('k-sahip').value),
  };
  kaydet();
  masaEkrani();
  kodGoster(true);
}

export function masaDevam() {
  try { M = JSON.parse(localStorage.getItem(ANAHTAR) || 'null'); } catch (e) { M = null; }
  if (!M || !M.g) return masaKurulumu();
  masaEkrani();
}

function masaEkrani() {
  ekranGoster('e-masa');
  ekranAcikTut();
  $('m-ses').textContent = ses.sesAcikMi() ? '🔊' : '🔇';
  ciz();
}

function kodGoster(ilk = false) {
  const g = M.g;
  perdeAc(`
    <div style="text-align:center;color:var(--soluk)">Herkes telefonunda <b>Oyuncuyum</b>'a bassın ve bunu yazsın:</div>
    <div class="kod-buyuk">${g.kod}</div>
    <div class="koltuk-listesi">${g.oyuncular.map(o => `<div><b>${o.koltuk + 1}</b>${kacis(o.ad)}</div>`).join('')}</div>
    <div style="color:var(--soluk);font-size:14px">Her el dağıtılınca telefonda <b>Kartlarımı al</b>'a basın. Telefondaki
      <b>Kontrol</b> harfleri buradakiyle aynıysa doğru eldesiniz.</div>
    <button class="btn-ana" id="kod-tamam">${ilk ? 'Tamam, masaya geç' : 'Kapat'}</button>`,
  k => { k.querySelector('#kod-tamam').onclick = perdeKapat; });
}

// ---------------- Çizim ----------------
function koltukKonumu(i, n) {
  // Koltuk 0 altta ortada, saat yönünde dizilir.
  const a = Math.PI / 2 + (2 * Math.PI * i) / n;
  return { x: 50 + 41 * Math.cos(a), y: 50 + 38 * Math.sin(a) };
}

function durumYazisi(g, i) {
  const o = g.oyuncular[i];
  if (o.elendi) return 'elendi';
  const el = g.el;
  if (!el) return '';
  const d = el.durum[i];
  if (el.sokak === 'bitti') {
    const k = el.sonuc.kazanc[i];
    if (k > 0) return '+' + sayi(k);
    return d.pas ? 'fold' : '';
  }
  if (d.pas) return 'fold';
  if (d.allin) return 'ALL-IN';
  const son = [...el.gecmis].reverse().find(h => h.i === i && h.sokak === el.sokak);
  if (!son) return '';
  return { 'küçük kör': 'küçük kör', 'büyük kör': 'büyük kör', gör: 'call', kontrol: 'check', bet: 'bet', yükselt: 'raise' }[son.tip] || '';
}

function ciz() {
  const g = M.g, el = g.el;
  const no = el ? el.no : g.elNo;
  $('m-elno').textContent = no > 0 ? no : '–';
  $('m-kontrol').textContent = no > 0 ? kontrolKodu(g.kod, no) : '–';
  $('m-elrozet').innerHTML = no > 0
    ? `<div class="no">${no}. EL</div><div class="kk">Kontrol <b>${kontrolKodu(g.kod, no)}</b></div>`
    : '';
  const kElNo = el && el.sokak !== 'bitti' ? el.no : g.elNo + 1;
  const kk = korlar(g, kElNo);
  $('m-korlar').textContent = `${kk.kucuk}/${kk.buyuk}`;
  if (g.korArtisEl) {
    const sonrakiSeviye = g.ilkElNo + (korSeviyesi(g, kElNo) + 1) * g.korArtisEl;
    $('m-korbilgi').textContent = `· ${sonrakiSeviye - kElNo} el sonra yükselir`;
  } else $('m-korbilgi').textContent = '';
  $('m-geri').disabled = !M.gecmis.length || mesgul;

  // Koltuklar
  const alan = $('m-alan');
  alan.querySelectorAll('.koltuk, .gozat').forEach(e => e.remove());
  const n = g.oyuncular.length;
  const kazananlar = new Set();
  if (el && el.sokak === 'bitti') el.sonuc.potlar.forEach(p => p.kazananlar.forEach(k => kazananlar.add(k)));
  g.oyuncular.forEach((o, i) => {
    const { x, y } = koltukKonumu(i, n);
    const d = el ? el.durum[i] : null;
    const k = document.createElement('div');
    k.className = 'koltuk';
    k.dataset.i = i;
    if (o.elendi) k.classList.add('elendi');
    if (el && el.sira === i && el.sokak !== 'bitti') k.classList.add('sira');
    if (d && d.pas && !o.elendi) k.classList.add('pasgecti');
    if (kazananlar.has(i)) k.classList.add('kazanan');
    k.style.left = x + '%'; k.style.top = y + '%';

    const eller = document.createElement('div'); eller.className = 'eller';
    if (el && el.elKartlari[i] && !d.pas) {
      const goster = el.sokak === 'bitti' && el.sonuc.gosterim;
      el.elKartlari[i].forEach(kart => eller.appendChild(kartEl(kart, goster)));
    } else {
      eller.appendChild(Object.assign(kartEl(null), { className: 'kart bos' }));
    }
    const bahis = document.createElement('div');
    const b = d && el.sokak !== 'bitti' ? d.bahis : 0;
    bahis.className = 'bahis' + (b > 0 ? '' : ' bos');
    bahis.innerHTML = `<span class="fis-ikon"></span>${sayi(b)}`;

    const levha = document.createElement('div'); levha.className = 'levha';
    let isaretler = '';
    if (el && !o.elendi) {
      if (g.buton === i) isaretler += '<div class="isaret d">D</div>';
      if (el.sokak !== 'bitti') {
        if (el.sb === i) isaretler += '<div class="isaret sb">SB</div>';
        else if (el.bb === i) isaretler += '<div class="isaret bb">BB</div>';
      }
    }
    const elAdi = el && el.sokak === 'bitti' && el.sonuc.gosterim && el.sonuc.eller[i] ? el.sonuc.eller[i].ad : '';
    levha.innerHTML = `${isaretler}<div class="ad">${kacis(o.ad)}</div>
      <div class="fis-sayi">${sayi(o.fis)}</div>
      <div class="durum">${kacis(elAdi ? elAdi + ' · ' + durumYazisi(g, i) : durumYazisi(g, i))}</div>`;
    levha.style.position = 'relative';
    // Üst yarıdaki koltuklarda bahis aşağıda (masaya doğru) dursun
    if (y < 50) k.append(eller, levha, bahis); else k.append(bahis, eller, levha);
    alan.appendChild(k);
  });

  // Ortak kartlar
  const ortak = $('m-ortak');
  ortak.innerHTML = '';
  for (let j = 0; j < 5; j++) {
    const acik = el && j < el.acik;
    const ke = kartEl(acik ? el.ortak[j] : null, acik);
    if (!acik) ke.classList.add('bos');
    ortak.appendChild(ke);
  }
  const pot = el ? potToplam(g) : 0;
  $('m-pot').innerHTML = el && el.sokak !== 'bitti'
    ? `Pot ${sayi(pot)}${yanPotYazisi(g)}`
    : (el ? `Pot ${sayi(pot)} dağıtıldı` : 'Pot 0');
  panelCiz();
}

function yanPotYazisi(g) {
  const el = g.el;
  if (!el.durum.some(d => d.allin && !d.pas)) return '';
  const p = potlariHesapla(el.durum.map(d => d.katki), el.durum.map(d => d.pas));
  if (p.length < 2) return '';
  return `<small>${p.map((x, i) => (i ? 'yan ' : 'ana ') + sayi(x.miktar)).join(' · ')}</small>`;
}

function panelCiz() {
  const g = M.g, el = g.el, p = $('m-panel');
  if (mesgul) { p.innerHTML = '<div class="bekleme"><div class="ne">Dağıtılıyor…</div></div>'; return; }

  if (g.bitti) {
    const s = g.oyuncular[g.sampiyon];
    p.innerHTML = `<div class="bekleme">
      ${el && el.sonuc ? sonucHtml(g) : ''}
      <div style="font-size:26px;font-weight:800;color:var(--altin)">🏆 ${kacis(s.ad)} masadaki tüm fişleri topladı</div>
      <button class="btn-ana" id="p-yeniden">Yeniden başla · herkese ${sayi(g.baslangicFis)}</button></div>`;
    $('p-yeniden').onclick = async () => {
      if (!(await onayla(`Yeni oyun: herkes yeniden ${sayi(g.baslangicFis)} fişle başlar. El numarası kaldığı yerden devam eder, telefonlarda bir şey değiştirmeye gerek yok.`, 'Başlat'))) return;
      M.gecmis.push(JSON.stringify(M.g));
      M.g = yenidenBaslat(M.g);
      kaydet(); ciz();
    };
    return;
  }

  if (!el || el.sokak === 'bitti') {
    p.innerHTML = `<div class="bekleme">
      ${el && el.sonuc ? sonucHtml(g) : '<div class="ne" style="color:var(--soluk)">Herkes telefonundan masaya oturduysa ilk eli dağıt.</div>'}
      <button class="btn-ana" id="p-dagit">${el ? 'Sonraki eli dağıt' : 'İlk eli dağıt'}</button></div>`;
    $('p-dagit').onclick = dagit;
    return;
  }

  const y = yasalHamleler(g);
  const o = g.oyuncular[y.oyuncu];
  const ne = y.kontrol ? 'Check ya da bet' : `Call için ${sayi(y.odenecek)}${y.gorAllin ? ' (all-in)' : ''}`;
  let html = `<div class="eylem-baslik"><span class="kim">Sıra: ${kacis(o.ad)}</span>
    <span class="ne">${ne} · elinde ${sayi(o.fis)}</span></div>`;
  if (yukseltAcik && y.yukselt) {
    const pasif = y.enAz === y.enCok;
    html += `<div class="yukselt-alani">
      <div class="miktar-goster" id="p-miktar"></div>
      <input type="range" id="p-kaydir" min="${y.enAz}" max="${y.enCok}" step="1" value="${yukseltMiktar}" ${pasif ? 'disabled' : ''}>
      <div class="satir hizli">
        <button data-h="eksi">−</button><button data-h="enaz">En az</button><button data-h="yarim">½ pot</button>
        <button data-h="pot">Pot</button><button data-h="hepsi">All-in</button><button data-h="arti">+</button>
      </div>
      <div class="satir"><button class="btn-ikincil" id="p-vazgec">Vazgeç</button>
        <button class="b-yukselt" id="p-onay">Onayla</button></div></div>`;
  } else {
    html += `<div class="dugmeler">
      <button class="b-pas" data-a="pas">Fold</button>
      <button class="b-kontrol" data-a="${y.kontrol ? 'kontrol' : 'gor'}">${y.kontrol ? 'Check' : 'Call ' + sayi(y.odenecek)}</button>
      <button class="b-yukselt" data-a="yukselt" ${y.yukselt ? '' : 'disabled'}>${y.acilis ? 'Bet' : 'Raise'}</button>
      <button class="b-allin" data-a="allin" ${(y.yukselt || y.gorAllin) ? '' : 'disabled'}>All-in</button>
    </div>`;
  }
  if (M.sahip >= 0 && el.elKartlari[M.sahip] && !el.durum[M.sahip].pas) {
    html += `<button class="btn-ikincil" id="p-bak">${kacis(g.oyuncular[M.sahip].ad)}: kartlarına bakmak için basılı tut</button>`;
  }
  html += `<div class="hata">${kacis(hata)}</div>`;
  p.innerHTML = html;

  p.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
    ses.acil();
    const a = b.dataset.a;
    if (a === 'yukselt') { yukseltAcik = true; yukseltMiktar = y.enAz; hata = ''; panelCiz(); return; }
    uygula({ tip: a });
  });
  if (yukseltAcik && y.yukselt) {
    const kay = $('p-kaydir');
    const goster = () => {
      $('p-miktar').textContent = (yukseltMiktar >= y.enCok ? 'ALL-IN ' : (y.acilis ? 'Bet ' : 'Raise → ')) + sayi(yukseltMiktar);
      kay.value = yukseltMiktar;
    };
    const sinirla = v => Math.max(y.enAz, Math.min(y.enCok, Math.round(v)));
    kay.oninput = () => { yukseltMiktar = sinirla(Number(kay.value)); goster(); };
    const adim = el.buyuk;
    const enYuksek = el.enYuksek, odenecek = y.odenecek;
    p.querySelectorAll('[data-h]').forEach(b => b.onclick = () => {
      const h = b.dataset.h;
      const potSonra = y.pot + odenecek; // görüldükten sonraki pot
      if (h === 'eksi') yukseltMiktar = sinirla(yukseltMiktar - adim);
      if (h === 'arti') yukseltMiktar = sinirla(yukseltMiktar + adim);
      if (h === 'enaz') yukseltMiktar = y.enAz;
      if (h === 'yarim') yukseltMiktar = sinirla(enYuksek + potSonra / 2);
      if (h === 'pot') yukseltMiktar = sinirla(enYuksek + potSonra);
      if (h === 'hepsi') yukseltMiktar = y.enCok;
      goster();
    });
    $('p-vazgec').onclick = () => { yukseltAcik = false; panelCiz(); };
    $('p-onay').onclick = () => uygula({ tip: 'yukselt', miktar: yukseltMiktar });
    goster();
  }
  const bak = $('p-bak');
  if (bak) {
    const ac = e => { e.preventDefault(); gozat(true); };
    const kapa = () => gozat(false);
    bak.addEventListener('pointerdown', ac);
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => bak.addEventListener(t, kapa));
  }
}

function gozat(ac) {
  const alan = $('m-alan');
  alan.querySelectorAll('.gozat').forEach(e => e.remove());
  if (!ac) return;
  const el = M.g.el;
  const kutu = document.createElement('div');
  kutu.className = 'gozat';
  kutu.style.cssText += ';display:flex;gap:8px;--kart-gen:90px;bottom:auto;top:50%;transform:translate(-50%,-50%)';
  el.elKartlari[M.sahip].forEach(k => kutu.appendChild(kartEl(k, true)));
  alan.appendChild(kutu);
  ses.kartCevir();
}

function sonucHtml(g) {
  const el = g.el, s = el.sonuc;
  const ad = i => kacis(g.oyuncular[i].ad);
  const satirlar = s.potlar.map((p, j) => {
    const kim = p.kazananlar.map(ad).join(' ve ');
    const neyle = s.gosterim && p.hak.length > 1 ? ' · ' + KATEGORI_AD[s.eller[p.kazananlar[0]].guc[0]] : '';
    const potAdi = s.potlar.length > 1 ? (j ? 'Yan pot' : 'Ana pot') : 'Pot';
    if (p.hak.length === 1 && s.potlar.length > 1) return `<div>${ad(p.hak[0])} fazladan koyduğu ${sayi(p.miktar)} fişi geri aldı</div>`;
    return `<div>${potAdi} ${sayi(p.miktar)} → <b>${kim}</b>${p.kazananlar.length > 1 ? ' (bölüştü)' : ''}${neyle}</div>`;
  }).join('');
  const kazanan = s.kazanc.map((k, i) => [k - el.durum[i].katki, i]).sort((a, b) => b[0] - a[0])[0];
  return `<div class="sonuc-kutu"><div class="baslik">${ad(kazanan[1])} kazandı</div>${satirlar}</div>`;
}

let duyuruZaman = null;
function duyuru(html) {
  const d = $('duyuru');
  d.innerHTML = html;
  d.classList.add('acik');
  clearTimeout(duyuruZaman);
  duyuruZaman = setTimeout(() => d.classList.remove('acik'), 4500);
  d.onclick = () => d.classList.remove('acik');
}

// ---------------- Hamleler ----------------
async function uygula(hamle) {
  if (mesgul) return;
  const onceki = M.g;
  let yeni;
  try { yeni = hamleYap(onceki, hamle); }
  catch (e) { hata = e.message; panelCiz(); return; }
  hata = ''; yukseltAcik = false;
  M.gecmis.push(JSON.stringify(onceki));
  if (M.gecmis.length > 60) M.gecmis.shift();
  M.g = yeni;
  kaydet();
  // ses
  const t = hamle.tip;
  if (t === 'pas') ses.kartlariAt();
  else if (t === 'kontrol') ses.tik();
  else ses.fis(t === 'allin' ? 6 : t === 'yukselt' ? 4 : 2);
  await sokakAnimasyonu(onceki, yeni);
}

// Yeni açılan ortak kartları ve el sonunu canlandırır.
async function sokakAnimasyonu(onceki, yeni) {
  const eskiAcik = onceki.el ? onceki.el.acik : 0;
  const yeniAcik = yeni.el ? yeni.el.acik : 0;
  const bitti = yeni.el && yeni.el.sokak === 'bitti';
  if (yeniAcik <= eskiAcik) {
    ciz();
    if (bitti) { await bekle(250); ses.potuTopla(); }
    return;
  }
  mesgul = true;
  // önce eski hali (yeni kartlar kapalı) çiz, sonra kartları tek tek aç
  const g = M.g;
  g.el.acik = eskiAcik;
  const geciciSokak = g.el.sokak;
  if (bitti) g.el.sokak = onceki.el.sokak === 'bitti' ? 'bitti' : 'river';
  ciz();
  await bekle(350);
  const deste = $('m-alan').getBoundingClientRect();
  const kaynak = { left: deste.left + deste.width / 2 - 25, top: deste.top + 20, width: 50, height: 70 };
  const ortak = $('m-ortak').children;
  for (let j = eskiAcik; j < yeniAcik; j++) {
    if (j === 3 || j === 4 || j === eskiAcik) await bekle(j === eskiAcik ? 0 : 450);
    ses.kartAt();
    const hedef = ortak[j];
    await kartUcur(kaynak, hedef, 330);
    hedef.classList.remove('bos');
    kartYuzu(hedef, g.el.ortak[j]);
    hedef.getBoundingClientRect();
    hedef.classList.add('acik');
    ses.kartCevir(0.05);
    await bekle(j < 2 && eskiAcik === 0 ? 160 : 300);
  }
  g.el.acik = yeniAcik;
  g.el.sokak = geciciSokak;
  mesgul = false;
  await bekle(250);
  ciz();
  if (bitti) { await bekle(300); ses.potuTopla(); }
}

async function dagit() {
  if (mesgul) return;
  ses.acil();
  let yeni;
  try { yeni = eliBaslat(M.g); }
  catch (e) { hata = e.message; panelCiz(); return; }
  M.gecmis.push(JSON.stringify(M.g));
  if (M.gecmis.length > 60) M.gecmis.shift();
  hata = '';
  M.g = yeni;
  kaydet();

  mesgul = true;
  const el = M.g.el;
  // Kartlar görünmeden çiz, karıştır, sonra butonun solundan başlayarak ikişer tur dağıt
  ciz();
  const koltuklar = [...$('m-alan').querySelectorAll('.koltuk')];
  koltuklar.forEach(k => k.querySelectorAll('.eller .kart').forEach(c => (c.style.visibility = 'hidden')));
  const sure = ses.karistir() || 0;
  await bekle(Math.min(1600, sure * 1000 * 0.7));
  const alan = $('m-alan').getBoundingClientRect();
  const kaynak = { left: alan.left + alan.width / 2 - 25, top: alan.top + alan.height / 2 - 35, width: 50, height: 70 };
  const n = M.g.oyuncular.length;
  const sira = [];
  for (let a = 1; a <= n; a++) { const i = (M.g.buton + a) % n; if (el.elKartlari[i]) sira.push(i); }
  for (let tur = 0; tur < 2; tur++) {
    for (const i of sira) {
      const kart = koltuklar[i].querySelectorAll('.eller .kart')[tur];
      if (!kart) continue;
      ses.kartAt();
      await kartUcur(kaynak, kart, 260);
      kart.style.visibility = '';
      await bekle(90);
    }
  }
  mesgul = false;
  ses.fis(2, 0.1);
  ciz();
  duyuru(`<div class="no">${el.no}. EL</div><div>Telefonda <b>Kartlarımı al</b></div><div class="kk">Kontrol <b>${kontrolKodu(M.g.kod, el.no)}</b></div>`);
}

// ---------------- Bağlantılar ----------------
export function masaBagla() {
  $('k-ekle').onclick = () => { if (adlar.length < AZAMI_KOLTUK) { adlar.push(''); kurulumCiz(); } };
  $('k-geri').onclick = () => ekranGoster('e-giris');
  $('k-basla').onclick = () => { ses.acil(); masayiAc(); };
  $('m-kod').onclick = () => kodGoster(false);
  $('m-ses').onclick = () => { ses.acil(); ses.sesAyarla(!ses.sesAcikMi()); $('m-ses').textContent = ses.sesAcikMi() ? '🔊' : '🔇'; };
  $('m-geri').onclick = async () => {
    if (!M.gecmis.length || mesgul) return;
    if (!(await onayla('Son hamle geri alınsın mı?', 'Geri al'))) return;
    M.g = JSON.parse(M.gecmis.pop());
    yukseltAcik = false; hata = '';
    kaydet(); ciz();
  };
  $('m-menu').onclick = () => {
    perdeAc(`
      <div style="font-size:20px;font-weight:800">Masa</div>
      <button class="btn-ikincil" id="mn-kod">Masa kodu ve koltuklar</button>
      <button class="btn-ikincil" id="mn-yeniden">Oyunu baştan başlat (herkese ${sayi(M.g.baslangicFis)})</button>
      <button class="btn-tehlike" id="mn-kapat">Masayı kapat, yeni masa kur</button>
      <button class="btn-ana" id="mn-tamam">Kapat</button>`,
    k => {
      k.querySelector('#mn-tamam').onclick = perdeKapat;
      k.querySelector('#mn-kod').onclick = () => kodGoster(false);
      k.querySelector('#mn-yeniden').onclick = async () => {
        perdeKapat();
        if (!(await onayla('Fişler sıfırlanıp herkes baştan başlasın mı? Telefonlarda bir şey değişmez.', 'Baştan başlat'))) return;
        M.gecmis.push(JSON.stringify(M.g));
        M.g = yenidenBaslat(M.g);
        kaydet(); ciz();
      };
      k.querySelector('#mn-kapat').onclick = async () => {
        perdeKapat();
        if (!(await onayla('Bu masa silinsin mi? Yeni masa yeni kodla açılır, telefonlara yeni kod girilir.', 'Sil'))) return;
        try { localStorage.removeItem(ANAHTAR); } catch (e) {}
        M = null;
        adlar = ['Erman', 'Fidan', 'Emrah'];
        masaKurulumu();
      };
    });
  };
  window.addEventListener('resize', () => { if (M && document.querySelector('#e-masa.etkin') && !mesgul) ciz(); });
}
