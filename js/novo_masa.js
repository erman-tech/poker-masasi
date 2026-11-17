// Novo Poker masası (iPad). Kasaya karşı; oyuncu kartları açık, her şey bu ekranda.
import {
  yeniNovo, novoDagit, novoHamle, novoYasal, oyunSatinAl, novoYenidenBaslat, paraYukle, molaAyarla,
  katilabilir, ODEME, BONUS, EL_ADI, YAKILAN_ILK, sinif, bonusAnahtari, kombinasyonlar, betOrani,
} from './novo.js';
import { yiginEl, ustCipEl } from './fis.js';
import { $, ekranGoster, kartEl, kartYuzu, kartUcur, bekle, perdeAc, perdeKapat, onayla, ekranAcikTut, para, kacis } from './arayuz.js';
import * as ses from './ses.js';
import { krupiyeKur, ruh, kurpiyeAyarla, kurpiyeDegistir, eldekiKurpiye, degisimEli, konusuyor, gala } from './krupiye.js';
import * as konus from './konus.js';
import { havaiFisek } from './havai.js';
konus.konusmaDinle(sure => konusuyor(sure));

const ANAHTAR = 'poker.novo.v1';
let N = null;          // { g, gecmis }
let mesgul = false;
let secili = new Set(); // değiştirilecek kart konumları
let secimModu = false;
let oyunsuzSecim = {};  // oyuncu -> true (oyun satın al) / false (ante al)
let hata = '';

function kaydet() {
  try { localStorage.setItem(ANAHTAR, JSON.stringify(N)); }
  catch (e) { N.gecmis = N.gecmis.slice(-5); try { localStorage.setItem(ANAHTAR, JSON.stringify(N)); } catch (e2) {} }
}
export function novoKaydiVar() {
  try { return !!JSON.parse(localStorage.getItem(ANAHTAR) || 'null'); } catch (e) { return false; }
}
export function novoAc({ adlar, baslangicFis, ante }) {
  N = { g: yeniNovo({ adlar, kod: 'N', baslangicFis, ante }), gecmis: [] };
  kaydet();
  ekran();
}
export function novoDevam() {
  try { N = JSON.parse(localStorage.getItem(ANAHTAR) || 'null'); } catch (e) { N = null; }
  if (!N || !N.g) return false;
  ekran();
  return true;
}

function ekran() {
  ekranGoster('e-novo');
  kurpiyeAyarla(eldekiKurpiye(N.g.elNo || 1));
  ekranAcikTut();
  $('n-ses').textContent = ses.sesAcikMi() ? '🔊' : '🔇';
  ciz();
}

function gecmiseAt() {
  N.gecmis.push(JSON.stringify(N.g));
  if (N.gecmis.length > 40) N.gecmis.shift();
}

// ---------------- Çizim ----------------
function spotKonumu(i, n) {
  const x = n === 1 ? [50] : n === 2 ? [32, 68] : n === 3 ? [15, 50, 85] : [14, 38, 62, 86];
  const y = n <= 2 ? [57, 57] : n === 3 ? [55, 60, 55] : [54, 60, 60, 54];
  return { x: x[i], y: y[i] };
}

function kasaYazi(v) { return (v > 0 ? '+' : v < 0 ? '−' : '') + para(Math.abs(v || 0)); }

// Görünüm maskesi: motor eli sonuçlandırmış olsa da animasyon bitene kadar ekran eski hali gösterir.
let maske = null; // { faz?, krupiyeAcik?, kasa }
function gorunenEl(el) {
  return el && maske && maske.faz ? { ...el, faz: maske.faz, krupiyeAcik: maske.krupiyeAcik } : el;
}
// Üst çubuktaki kasa artı/eksisi: express dağıtımda sonuçlanır, el sürerken anında yansır.
function kasaCanli(g) {
  let canli = g.kasaNet || 0;
  if (g.el && g.el.faz !== 'bitti') for (const p of g.el.oyuncular) if (p.katildi) canli += p.bonus - p.bonusOdeme;
  return canli;
}

function ciz() {
  const g = N.g, el = gorunenEl(g.el);
  $('n-elno').textContent = el ? el.no : '–';
  $('n-ante').textContent = para(g.ante);
  $('n-yazi').innerHTML = `KASAYA KARŞI · KASA AS-PAPAZ VE ÜSTÜYLE OYUNA GİRER<br>ANTE ${para(g.ante)} · EXPRESS ${para(g.ante)} · KART ÇEKME ${para(g.ante)} · OYNA ${para(2 * g.ante)}`;
  const canli = maske ? maske.kasa : kasaCanli(g);
  const kn = $('n-kasa');
  kn.textContent = kasaYazi(canli);
  kn.className = canli >= 0 ? 'artı' : 'eksi';
  $('n-kasatop').textContent = g.oyunNo > 1 ? `· masa açıldığından beri ${kasaYazi(g.kasaToplam)}` : '';
  $('n-geri').disabled = !N.gecmis.length || mesgul;

  // Krupiye
  const kr = $('n-krupiye');
  kr.innerHTML = '';
  if (el) {
    el.krupiye.forEach((k, j) => {
      const acik = el.krupiyeAcik || j === 4;
      // Kapalı kartın yüzü sayfaya hiç konmaz (iPad'de 3B gizleme bazen tutmuyor); açılırken eklenir.
      kr.appendChild(acik ? kartEl(k, true) : kartEl(null, false));
    });
  } else for (let j = 0; j < 5; j++) kr.appendChild(Object.assign(kartEl(null), { className: 'kart bos' }));
  // Yakılan (gömülen) kartlar destesi
  const yk = $('n-yakilan');
  if (yk) {
    const n = el ? YAKILAN_ILK + (el.cekmeYakilan ? 1 : 0) + (el.krupiyeYakilan ? 1 : 0) + (el.krupiyeAtilan ? 1 : 0) : 0;
    yk.innerHTML = `<div class="yk-yigin">${Array.from({ length: n }, (_, j) => `<div class="kart yk-kart" style="--j:${j}"><div class="yuz"></div><div class="arka"></div></div>`).join('')}</div>` +
      `<div class="yk-ad">${n ? `YAKILAN ${n}` : ''}</div>`;
  }
  $('n-krupiye-ad').textContent = el && el.krupiyeAcik
    ? (el.krupiyeOyunu ? el.krupiyeElAdi : 'Kasanın oyunu yok' + (el.krupiyeDegisim ? '' : ''))
    : '';

  // Oyuncu yerleri
  const alan = $('n-alan');
  alan.querySelectorAll('.nspot').forEach(e => e.remove());
  const n = g.oyuncular.length;
  g.oyuncular.forEach((o, i) => {
    const p = el ? el.oyuncular[i] : null;
    const { x, y } = spotKonumu(i, n);
    const s = document.createElement('div');
    s.className = 'nspot';
    s.dataset.i = i;
    if (el && (el.faz === 'karar' || el.faz === 'cekme') && el.sira === i) s.classList.add('sira');
    if (p && p.durum === 'pas') s.classList.add('pas');
    s.style.left = x + '%'; s.style.top = y + '%';

    const kartlar = document.createElement('div'); kartlar.className = 'nkartlar';
    if (p && p.katildi) p.kartlar.forEach((k, j) => {
      const ke = kartEl(k, true);
      if (el.sira === i && secimModu && secili.has(j)) ke.classList.add('secili');
      if (p.cekKarar && p.cekKarar.tip === 'degistir' && p.cekKarar.konumlar.includes(j)) ke.classList.add('atilacak');
      kartlar.appendChild(ke);
    });
    if (p && p.cekKarar && p.cekKarar.tip === 'alti') {
      const h = document.createElement('div'); h.className = 'kart hayalet'; h.textContent = '+1'; kartlar.appendChild(h);
    }
    const etiket = document.createElement('div'); etiket.className = 'nel';
    if (p && p.katildi) {
      const s1 = sinif(p.kartlar);
      const kb = kombinasyonlar(p.kartlar);
      let t = EL_ADI[s1.anahtar] + (kb.ikinci != null ? ' + ' + EL_ADI[kb.ikinci] : '');
      if (p.bonusOdeme) t = `BONUS ÖDEME ${EL_ADI[bonusAnahtari(p.ilk)]} +${para(p.bonusOdeme - p.bonus)}`;
      if (el.faz === 'bitti' && p.durum === 'oynadi') t = sonucYazi(p);
      if (el.faz === 'bitti' && p.durum === 'pas') t = 'Pas';
      etiket.textContent = t;
      if (p.bonusOdeme && el.faz !== 'bitti') etiket.classList.add('express');
      if (el.faz === 'bitti') etiket.classList.add(p.net > 0 ? 'kazanc' : p.net < 0 ? 'kayip' : 'notr');
    } else if (el) etiket.textContent = katilabilir(g, i) ? '' : 'Bu elde oturuyor';

    const daireler = document.createElement('div'); daireler.className = 'ndaireler';
    for (const [k, ad] of [['ante', 'ANTE'], ['express', 'EXPRESS'], ['bet', 'BET']]) {
      const d = document.createElement('div');
      d.className = 'ndaire ' + k; d.dataset.k = k;
      d.innerHTML = `<span>${ad}</span>`;
      if (k === 'express' && p && p.katildi && el.faz !== 'bitti') d.classList.add(p.bonusOdeme ? 'ex-kazanc' : 'ex-kayip');
      const yer = document.createElement('div'); yer.className = 'yer';
      const tutar = daireTutari(p, k);
      if (tutar > 0) yer.appendChild(ustCipEl(tutar, 34));
      d.appendChild(yer);
      if (tutar > 0) { const tt = document.createElement('b'); tt.className = 'ntutar'; tt.textContent = para(tutar); d.appendChild(tt); }
      else if (k === 'express' && p && p.katildi && el.faz !== 'bitti' && !expressBekliyor) {
        const tt = document.createElement('b'); tt.className = 'ntutar';
        tt.textContent = p.bonusOdeme ? '+' + para(p.bonusOdeme - p.bonus) : 'kasaya';
        d.appendChild(tt);
      }
      daireler.appendChild(d);
    }
    const cek = document.createElement('div'); cek.className = 'ncekme';
    cek.innerHTML = '<span>ÇEKME</span>';
    if (p && p.ucret > 0 && el.faz !== 'bitti') cek.appendChild(yiginEl(p.ucret, { boyut: 16, enCok: 4 }));
    daireler.appendChild(cek);
    const sig = document.createElement('div'); sig.className = 'ncekme nsigorta';
    sig.innerHTML = '<span>SİGORTA</span>';
    if (p && p.sigorta > 0 && el.faz !== 'bitti') sig.appendChild(yiginEl(p.sigorta, { boyut: 16, enCok: 4 }));
    // Kasa boş açtıysa sigorta kesinleşti: kutu altın renginde ve kazancı yazar
    if (p && p.sigorta > 0 && el.krupiyeAcik && el.ilkOyun === false) {
      sig.classList.add('kazandi');
      sig.insertAdjacentHTML('beforeend', `<b class="sig-kazanc">+${para(p.sigorta)}</b>`);
    }
    daireler.appendChild(sig);

    const levha = document.createElement('div'); levha.className = 'nlevha';
    if (o.mola) s.classList.add('mola');
    levha.innerHTML = `<div class="ad">${kacis(o.ad)}${o.mola ? ' <span class="mola-etiket">MOLADA</span>' : ''}</div><div class="fis-sayi">${para(o.fis)}</div>` +
      oyuncuHesap(g, o, p, el);
    const yig = document.createElement('div'); yig.className = 'yigin-yeri';
    if (o.fis > 0) yig.appendChild(yiginEl(o.fis, { cesitli: true, boyut: 20, enCok: 7 }));
    levha.appendChild(yig);
    s.append(kartlar, etiket, daireler, levha);
    alan.appendChild(s);
  });
  panelCiz();
}

// Oyuncunun toplam girişi (başlangıç + yüklenen) ve ona göre artısı/eksisi.
// El sürerken masada duran ante, bet ve sigorta da oyuncunun sayılır (express dağıtımda kapanmıştır).
function oyuncuHesap(g, o, p, el) {
  const giris = (g.baslangicFis || 0) + (o.yuklenen || 0);
  const masada = p && p.katildi && el && el.faz !== 'bitti' ? (p.durum === 'pas' ? 0 : p.ante) + (p.bahis || 0) + (p.sigorta || 0) : 0;
  const fark = o.fis + masada - giris;
  const isaret = fark > 0 ? '+' : fark < 0 ? '−' : '±';
  return `<div class="yuk">giriş ${para(giris)}${o.yuklenen ? ` (yüklenen ${para(o.yuklenen)})` : ''}</div>` +
    `<div class="fark ${fark > 0 ? 'art' : fark < 0 ? 'eks' : ''}">${isaret}${para(Math.abs(fark))}</div>`;
}

// Dairede o an duran fiş
function daireTutari(p, k) {
  if (!p || !p.katildi) return 0;
  const bitti = gorunenEl(N.g.el).faz === 'bitti';
  if (bitti) return 0;
  // Express yalnız ilk 5 karta bakar ve dağıtım biter bitmez kapanır: kazanan ödenir,
  // kaybedenin express'i kasaya gider. Dağıtım animasyonu sürerken dairesinde durur.
  if (k === 'express') return expressBekliyor ? p.bonus : 0;
  if (k === 'ante') return p.durum === 'pas' ? 0 : p.ante;
  if (k === 'bet') return p.bahis;
  return 0;
}

function sonucYazi(p) {
  const s = p.sonuc;
  if (!s) return '';
  const net = (p.net >= 0 ? '+' : '−') + para(Math.abs(p.net)) + (p.sigorta ? (p.sigortaGeri ? ` · sigorta kazandı +${para(p.sigorta)}` : ' · sigorta yandı') : '');
  if (s.tip === 'oyunyok') return `Kasanın oyunu yok · ${net}`;
  if (s.tip === 'berabere') return `Berabere · ${net}`;
  if (s.tip === 'kazandi') return `${p.elAdi}${s.ikinciEl != null ? ' + ' + EL_ADI[s.ikinciEl] : s.ikinciAK ? ' + As-Papaz' : ''} ${s.oran}:1 · ${net}`;
  return `${p.elAdi} · kasa kazandı · ${net}`;
}

function panelCiz() {
  const g = N.g, el = g.el, pn = $('n-panel');
  if (mesgul) { pn.innerHTML = '<div class="bekleme"><div class="ne">…</div></div>'; return; }

  if (!el || el.faz === 'bitti') {
    const kimse = !g.oyuncular.some((_, i) => katilabilir(g, i));
    const molada = g.oyuncular.some(o => o.mola);
    let ozet = '';
    if (el) {
      const kn = el.kasaNet;
      const tutar = v => (v > 0 ? '+' : v < 0 ? '−' : '') + (v ? para(Math.abs(v)) : '');
      ozet = `<div class="sonuc-kutu dokum"><div class="baslik">${el.no}. el · kasa ${kasaYazi(kn)} · kasa: ${kacis(el.krupiyeOyunu ? el.krupiyeElAdi : 'oyun yok')}</div>
        ${el.oyuncular.map((p, i) => p.katildi ? `<div class="dokum-satir"><b>${kacis(g.oyuncular[i].ad)}</b>
          ${(p.odemeler || []).map(k => `<span class="${k.tutar > 0 ? 'art' : k.tutar < 0 ? 'eks' : ''}">${kacis(k.yazi)} ${tutar(k.tutar)}</span>`).join('')}
          <span class="toplam ${p.net >= 0 ? 'art' : 'eks'}">= ${tutar(p.net) || '$0'}</span></div>` : '').join('')}</div>`;
    }
    pn.innerHTML = `<div class="bekleme">${ozet}
      <div class="mola-satir">${g.oyuncular.map((o, i) => `<button class="mola-dugme ${o.mola ? 'molada' : ''}" data-i="${i}">${kacis(o.ad)} · ${o.mola ? 'molada (sonraki elde dön)' : 'oyunda'}</button>`).join('')}</div>
      <div class="satir" style="width:min(640px,100%)">
        <button class="btn-ikincil" id="n-yukle">Para yükle</button>
        <button class="btn-ana" id="n-dagit" ${kimse ? 'disabled' : ''}>${el ? 'Sonraki eli dağıt' : 'İlk eli dağıt'}</button>
      </div>
      <div class="hata">${kacis(hata)}${kimse ? (molada ? 'Masada oynayan kimse yok: molada olanı oyuna alın ya da para yükleyin.' : 'Kimsenin parası girişe yetmiyor: para yükleyin.') : ''}</div></div>`;
    $('n-dagit').onclick = dagit;
    $('n-yukle').onclick = yukleAc;
    pn.querySelectorAll('.mola-dugme').forEach(b => b.onclick = () => {
      const i = Number(b.dataset.i);
      try { const yeni = molaAyarla(N.g, i, !N.g.oyuncular[i].mola); gecmiseAt(); N.g = yeni; hata = ''; kaydet(); ciz(); }
      catch (e) { hata = e.message; panelCiz(); }
    });
    return;
  }

  if (el.faz === 'oyunsuz') {
    const oynayan = el.oyuncular.map((p, i) => i).filter(i => el.oyuncular[i].katildi && el.oyuncular[i].durum === 'oynadi' && el.oyuncular[i].satinAldi === null);
    pn.innerHTML = `<div class="eylem-baslik"><span class="kim">Kasanın oyunu yok</span>
      <span class="ne">İyi eli olan seçsin: ante'yi al ya da kasaya kart çektir; çektirirsen ante 1:1 ödenmez, ante yanmaz (kasa açarsa bet'in oynar). Diğerlerinin ante'si otomatik ödenir.</span></div>
      <div class="oyunsuz">${oynayan.map(i => `
        ${el.oyuncular[i].sigorta ? `<div class="sig-not">${kacis(g.oyuncular[i].ad)}: sigortan kazandı, +${para(el.oyuncular[i].sigorta)} kesin</div>` : ''}
        <div class="satir"><b style="flex:0 0 120px">${kacis(g.oyuncular[i].ad)}</b>
          <button class="${oyunsuzSecim[i] ? 'btn-ikincil' : 'b-kontrol'}" data-o="${i}" data-v="0">Ante al</button>
          <button class="${oyunsuzSecim[i] ? 'b-yukselt' : 'btn-ikincil'}" data-o="${i}" data-v="1">Kasaya kart çektir</button>
        </div>`).join('')}</div>
      <button class="btn-ana" id="n-oyunsuz-tamam">Devam</button>
      <div class="hata">${kacis(hata)}</div>`;
    pn.querySelectorAll('[data-o]').forEach(b => b.onclick = () => { oyunsuzSecim[b.dataset.o] = b.dataset.v === '1'; panelCiz(); });
    $('n-oyunsuz-tamam').onclick = () => uygula(g2 => oyunSatinAl(g2, oyunsuzSecim));
    return;
  }

  const y = novoYasal(g);
  const i = y.oyuncu, p = el.oyuncular[i], o = g.oyuncular[i];
  const A = el.ante;
  let html = `<div class="eylem-baslik"><span class="kim">${y.asama === 'cekme' ? 'Kart çekme' : 'Oyuna giriş'}: ${kacis(o.ad)}</span>
    <span class="ne">${(k => EL_ADI[k.ana] + (k.ikinci != null ? ' + ' + EL_ADI[k.ikinci] : ''))(kombinasyonlar(p.kartlar))} · elinde ${para(o.fis)}</span></div>`;
  if ('sigorta' in y) {
    const s = y.sigorta;
    html += `<div class="ne" style="text-align:center;font-size:17px">Sigorta yapıyor musun? Kasa açmazsa sigorta 1'e 1 öder. Yapmazsan kasa açmadığında yalnız ante'yi alırsın; kasaya kart çektirirsen ve yine açmazsa ante ve bet geri gelir.</div>
      <div class="dugmeler" style="grid-template-columns:repeat(${s.enAz === s.enCok ? 2 : 3},1fr)">
        <button class="btn-ikincil" data-s="0">Sigorta yok</button>
        ${s.enAz === s.enCok ? '' : `<button class="b-kontrol" data-s="${s.enAz}">Min ${para(s.enAz)}</button>`}
        <button class="b-yukselt" data-s="${s.enCok}">${s.enAz === s.enCok ? '' : 'Max '}${para(s.enCok)}</button>
      </div>`;
  } else if (secimModu) {
    html += `<div class="buyuk-kartlar" id="n-secim">${p.kartlar.map((_, j) => `<div data-j="${j}"></div>`).join('')}</div>
      <div class="ne" style="text-align:center;color:var(--soluk)">Değiştirmek istediğin kartlara dokun</div>
      <div class="satir"><button class="btn-ikincil" id="n-vazgec">Vazgeç</button>
      <button class="b-yukselt" id="n-degis" ${secili.size ? '' : 'disabled'}>${secili.size || ''} kartı değiştir · ${para(A)}</button></div>`;
  } else if (y.asama === 'cekme') {
    html += `<div class="ne" style="text-align:center;font-size:16px">Önce herkes kart çeksin; oyuna girme kararı herkes kartını aldıktan sonra sorulacak.</div>
      <div class="dugmeler">
      <button class="b-pas" data-a="pas">Pas (çekil)</button>
      <button class="b-kontrol" data-a="gec">Çekmiyorum</button>
      <button class="b-yukselt" data-a="degistir" ${y.degistir ? '' : 'disabled'}>Kart çek ${para(A)}</button>
      <button class="b-allin" data-a="alti" ${y.alti ? '' : 'disabled'}>6. kart ${para(A)}</button></div>`;
  } else {
    html += `<div class="ne" style="text-align:center;font-size:16px">Oyuna giriyor musun?</div>
      <div class="dugmeler" style="grid-template-columns:repeat(2,1fr)">
      <button class="b-pas" data-a="pas">Pas</button>
      <button class="b-kontrol" data-a="oyna" ${y.oyna ? '' : 'disabled'}>Oyna ${para(2 * A)}</button></div>`;
  }
  html += `<div class="hata">${kacis(hata)}</div>`;
  pn.innerHTML = html;
  if ('sigorta' in y) {
    pn.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
      ses.acil(); konus.kilidiAc();
      uygula(g2 => novoHamle(g2, { tip: 'sigorta', miktar: Number(b.dataset.s) }), 'sigorta');
    });
  } else if (secimModu) {
    const kap = $('n-secim');
    [...kap.children].forEach((d, j) => {
      const ke = kartEl(p.kartlar[j], true);
      if (secili.has(j)) ke.classList.add('secili');
      d.appendChild(ke);
      d.onclick = () => { ses.acil(); secili.has(j) ? secili.delete(j) : secili.add(j); ses.kartCevir(); panelCiz(); ciz(); };
    });
    $('n-vazgec').onclick = () => { secimModu = false; secili.clear(); ciz(); };
    $('n-degis').onclick = () => degistir([...secili]);
  } else {
    pn.querySelectorAll('[data-a]').forEach(b => b.onclick = () => {
      ses.acil(); konus.kilidiAc();
      const a = b.dataset.a;
      if (a === 'degistir') { secimModu = true; secili.clear(); hata = ''; ciz(); return; }
      if (a === 'alti') return altinciKart();
      uygula(g2 => novoHamle(g2, { tip: a }), a);
    });
  }
}

const g0ad = i => N.g.oyuncular[i].ad;
let duyuruZaman = null;
function duyuru(html) {
  const d = $('duyuru');
  d.innerHTML = html;
  d.classList.add('acik');
  clearTimeout(duyuruZaman);
  duyuruZaman = setTimeout(() => d.classList.remove('acik'), 4000);
  d.onclick = () => d.classList.remove('acik');
}

// ---------------- Hamleler ve animasyonlar ----------------
function spotEl(i) { return $('n-alan').querySelector(`.nspot[data-i="${i}"]`); }
function kasaRect() { return $('n-kasa-kutu').getBoundingClientRect(); }

async function fisUcur(kaynak, hedef, miktar, sure = 450) {
  if (!(miktar > 0) || !kaynak || !hedef) return;
  const a = kaynak.getBoundingClientRect ? kaynak.getBoundingClientRect() : kaynak;
  const b = hedef.getBoundingClientRect ? hedef.getBoundingClientRect() : hedef;
  const y = yiginEl(miktar, { boyut: 22, enCok: 5 });
  y.classList.add('ucan');
  y.style.left = (a.left + a.width / 2 - 20) + 'px';
  y.style.top = (a.top + a.height / 2 - 12) + 'px';
  y.style.transition = `transform ${sure}ms cubic-bezier(.3,.7,.3,1)`;
  document.body.appendChild(y);
  y.getBoundingClientRect();
  y.style.transform = `translate(${(b.left + b.width / 2) - (a.left + a.width / 2)}px, ${(b.top + b.height / 2) - (a.top + a.height / 2)}px)`;
  // Kasa ödüyor ya da topluyorsa gerçek fiş sesi; oyuncu bahis koyarken kibar, kısık ses
  const kasaIle = !kaynak.getBoundingClientRect || !hedef.getBoundingClientRect;
  if (kasaIle) { if (!sessizOdeme) ses.fis(miktar >= 10 * (N.g.ante || 25) ? 8 : 4); } else ses.fisHafif();
  await bekle(sure);
  y.remove();
}

async function uygula(fn, tip) {
  if (mesgul) return;
  const once = N.g;
  let yeni;
  try { yeni = fn(once); } catch (e) { hata = e.message; panelCiz(); return; }
  hata = '';
  gecmiseAt();
  // Bu hamleyle kasa açılıyorsa (el sonuçlandı), açılış animasyonu başlayana kadar ekran hamleden
  // önceki gibi kalır: kasanın kartları kapalı, kasa toplamı ve sonuç etiketleri görünmez.
  if (once.el && !once.el.krupiyeAcik && yeni.el && yeni.el.krupiyeAcik) {
    maske = { faz: once.el.faz, krupiyeAcik: false, kasa: kasaCanli(once) };
    mesgul = true;
  }
  N.g = yeni; kaydet();
  if (tip === 'pas') ses.kartlariAt();
  if (tip === 'oyna') {
    const i = once.el.sira;
    ciz();
    await fisUcur(spotEl(i).querySelector('.nlevha'), spotEl(i).querySelector('.ndaire.bet'), 2 * once.el.ante);
  }
  if (tip === 'sigorta') {
    const i = once.el.sira;
    const m = yeni.el.oyuncular[i].sigorta;
    ciz();
    if (m) await fisUcur(spotEl(i).querySelector('.nlevha'), spotEl(i).querySelector('.nsigorta'), m);
  }
  if (tip === 'pas') {
    const i = once.el.sira;
    await fisUcur(spotEl(i).querySelector('.ndaire.ante'), kasaRect(), once.el.ante);
  }
  if (tip === 'degistir' || tip === 'alti') {
    const i = once.el.sira;
    if (yeni.el.faz === 'cekme') ciz(); // karar işaretli görünsün (kart henüz gelmez)
    await fisUcur(spotEl(i).querySelector('.nlevha'), spotEl(i).querySelector('.ncekme'), once.el.ante, 350);
  }
  if (once.el.faz === 'cekme' && yeni.el.faz !== 'cekme') await topluDagit();
  oyunsuzSecim = {};
  await sonAnimasyon(once, yeni);
}

function degistir(konumlar) {
  secimModu = false; secili.clear();
  return uygula(g2 => novoHamle(g2, { tip: 'degistir', konumlar }), 'degistir');
}

function altinciKart() {
  return uygula(g2 => novoHamle(g2, { tip: 'alti' }), 'alti');
}

// Yakılan kartı desteden yakılanlar yığınına uçur (yığının j. kartı gizliyken)
async function yak(j, sure = 420) {
  const yk = $('n-yakilan').querySelectorAll('.yk-kart')[j];
  if (!yk) return;
  yk.style.visibility = 'hidden';
  ses.kartAt();
  await kartUcur(kasaRect(), yk, sure);
  yk.style.visibility = '';
}

// Herkes karar verdi: kasa yeni kartları koltuk sırasıyla toplu dağıtır.
async function topluDagit() {
  const el = N.g.el;
  const cekenler = el.oyuncular.map((p, i) => [p, i]).filter(([p]) => p.katildi && (p.degisti || p.alti));
  if (!cekenler.length) return;
  mesgul = true;
  ciz();
  const yeniKartlar = [];
  for (const [p, i] of cekenler) {
    const ks = spotEl(i).querySelectorAll('.nkartlar .kart');
    const konum = p.alti ? [ks.length - 1] : p.degisenler;
    for (const j of konum) { ks[j].style.visibility = 'hidden'; yeniKartlar.push(ks[j]); }
  }
  ses.kartlariAt();
  const ykIdx = YAKILAN_ILK; // çekme öncesi gömülen kart
  const ykEl = $('n-yakilan').querySelectorAll('.yk-kart')[ykIdx];
  if (ykEl) ykEl.style.visibility = 'hidden';
  await bekle(350);
  ruh('dagit');
  if (el.cekmeYakilan) { await yak(ykIdx); await bekle(200); }
  for (const k of yeniKartlar) {
    ses.kartAt();
    await kartUcur(kasaRect(), k, 260);
    k.style.visibility = '';
  }
  ses.kartCevir();
  ruh('normal');
  // Kart çekerek iyi el yapanı krupiye söyler (üçlü ve üstü ya da iki kombinasyon)
  for (const [p, i] of cekenler) {
    const k = kombinasyonlar(p.kartlar), b = betOrani(p.kartlar);
    const iyi = k.ikinci != null || k.ana === 'SF' || k.ana === 'RF' || (typeof k.ana === 'number' && k.ana >= 3);
    if (!iyi) continue;
    ruh('saskin', 1800);
    konus.soyle('tebrikler', konus.ad(N.g.oyuncular[i].ad), konus.el(k.ana), k.ikinci != null ? ['ve', konus.el(k.ikinci)] : [], konus.sayi(b.oran), 'kat_odeme');
  }
  mesgul = false;
  ciz();
}

// Krupiye açılınca: kartları çevir, kasa kaybedenleri toplasın, kazananlara ödesin.
async function sonAnimasyon(once, yeni) {
  const el = yeni.el;
  const acildi = !once.el.krupiyeAcik && el.krupiyeAcik;
  const degisti = el.krupiyeDegisim && once.el.faz === 'oyunsuz';
  if (!acildi && !degisti && el.faz !== 'bitti') { maske = null; ciz(); return; }
  mesgul = true;
  // önce kapalı haliyle çiz, sonra krupiye kartlarını tek tek çevir
  const g = N.g;
  const gercekFaz = el.faz;
  el.faz = once.el.faz === 'oyunsuz' ? 'oyunsuz' : 'karar';
  el.krupiyeAcik = once.el.krupiyeAcik;
  const krupiyeSon = el.krupiye;
  const kAtilan = el.krupiyeAtilan, kYakilan = el.krupiyeYakilan;
  if (degisti) { el.krupiye = once.el.krupiye; el.krupiyeAtilan = undefined; el.krupiyeYakilan = undefined; }
  maske = { kasa: maske ? maske.kasa : kasaCanli(once) }; // kartlar animasyonla açılır, kasa toplamı sonra
  ciz();
  await bekle(300);
  const kr = $('n-krupiye').children;
  if (acildi) {
    for (let j = 0; j < 4; j++) { kartYuzu(kr[j], el.krupiye[j]); kr[j].classList.add('acik'); ses.kartCevir(); await bekle(380); }
    await bekle(300);
    const sigortalilar = el.oyuncular.map((p, i) => [p, i]).filter(([p]) => p.katildi && p.sigorta > 0);
    if (el.ilkOyun) {
      konus.soyle(konus.kasaEl(sinif(el.krupiye).anahtar));
      for (const [, i] of sigortalilar) konus.soyle(konus.ad(g.oyuncular[i].ad), 'sigortayi_kaybetti');
    } else {
      konus.soyle('kasa_bos');
      for (const [p, i] of sigortalilar) konus.soyle(konus.ad(g.oyuncular[i].ad), 'sigortadan', konus.sayi(p.sigorta), 'dolar_kazanir');
    }
    // Kasa boş açtı: sigorta yapanlar kazandı, bunu büyük söyle
    if (!el.ilkOyun) {
      const sigortali = el.oyuncular.map((p, i) => [p, i]).filter(([p]) => p.katildi && p.sigorta > 0);
      if (sigortali.length) {
        ruh('saskin', 2500);
        duyuru(`<div class="no" style="font-size:clamp(34px,6vw,64px)">KASA BOŞ AÇTI</div>
          <div style="font-size:24px">Sigorta kazandı: ${sigortali.map(([p, i]) => `<b>${kacis(g.oyuncular[i].ad)} +${para(p.sigorta)}</b>`).join(' · ')}</div>
          <div class="kk">Sigorta 1'e 1 ödendi; kasa sonradan kart çekse de geçerli</div>`);
        ses.fis(6);
      }
    }
  }
  if (degisti) {
    // Kasa en yüksek kartını atar, 1 kart gömülür, sıradaki kart açılır
    const idx = once.el.krupiye.findIndex(k => k.d === kAtilan.d && k.r === kAtilan.r);
    ruh('dagit');
    const eski = $('n-krupiye').children[idx];
    const eskiRect = eski.getBoundingClientRect();
    eski.style.visibility = 'hidden';
    el.krupiyeAtilan = kAtilan; el.krupiyeYakilan = kYakilan;
    el.krupiye = krupiyeSon; el.krupiyeAcik = true;
    ciz();
    const yigin = $('n-yakilan').querySelectorAll('.yk-kart');
    const n = yigin.length;
    yigin[n - 1].style.visibility = 'hidden'; yigin[n - 2].style.visibility = 'hidden';
    const yeniK = $('n-krupiye').children[idx];
    yeniK.style.visibility = 'hidden';
    ses.kartlariAt();
    await kartUcur(eskiRect, yigin[n - 2], 450); yigin[n - 2].style.visibility = '';   // atılan
    await bekle(200);
    ses.kartAt(); await kartUcur(kasaRect(), yigin[n - 1], 450); yigin[n - 1].style.visibility = ''; // gömülen
    await bekle(250);
    ses.kartAt(); await kartUcur(kasaRect(), yeniK, 520); yeniK.style.visibility = ''; ses.kartCevir();
    ruh('normal');
    await bekle(500);
  }
  el.faz = gercekFaz; el.krupiyeAcik = true; maske = null;
  if (gercekFaz !== 'bitti') { mesgul = false; ciz(); return; }
  // Hesaplaşma: fişler daireler doluyken
  ciz();
  const spotlar = el.oyuncular.map((p, i) => [p, i]).filter(([p]) => p.katildi && p.durum === 'oynadi');
  // daireleri bitiş öncesi tutarlarla doldur
  for (const [p, i] of spotlar) {
    const s = spotEl(i);
    s.querySelector('.ndaire.ante .yer').appendChild(ustCipEl(p.ante, 34));
    s.querySelector('.ndaire.bet .yer').appendChild(ustCipEl(p.bahis, 34));
  }
  await bekle(500);
  if (degisti) konus.soyle('kasa_kart_cekti', el.krupiyeOyunu ? [konus.el(sinif(el.krupiye).anahtar), 'oldu'] : 'yine_bos');
  for (const [p, i] of spotlar) {
    const ad = g.oyuncular[i].ad, t = p.sonuc.tip;
    if (t === 'kazandi') {
      const k = kombinasyonlar(p.kartlar);
      const odeme = p.bahis * p.sonuc.oran;
      konus.soyle(konus.el(k.ana), k.ikinci != null ? ['ve', konus.el(k.ikinci)] : [], konus.ad(ad), konus.sayi(odeme), 'dolar_odeme',
        odeme >= 10 * el.ante ? ['tebrikler', konus.ad(ad)] : []);
    } else if (t === 'kaybetti') konus.soyle(konus.ad(ad), 'kaybetti');
    else if (t === 'berabere') konus.soyle(konus.ad(ad), 'berabere');
    else if (t === 'oyunyok' && p.satinAldi) konus.soyle(konus.ad(ad), 'berabere');
  }
  // Elif konuşurken ödeme yapılmaz; fişler konuşma bitince gider, çip sesi sonda bir kez çalar.
  await konus.bitince();
  sessizOdeme = true;
  let fisOynadi = false;
  for (const [p, i] of spotlar) {
    fisOynadi = true;
    const s = spotEl(i);
    const ante = s.querySelector('.ndaire.ante'), bet = s.querySelector('.ndaire.bet'), levha = s.querySelector('.nlevha');
    const t = p.sonuc.tip;
    if (t === 'kaybetti') {
      ante.querySelector('.yer').innerHTML = ''; bet.querySelector('.yer').innerHTML = '';
      await fisUcur(bet, kasaRect(), p.ante + p.bahis);
    } else {
      const odeme = p.geri - p.ante - p.bahis; // ante kazancı + bahis ödemesi
      if (odeme > 0) await fisUcur(kasaRect(), bet, odeme, 500);
      ante.querySelector('.yer').innerHTML = ''; bet.querySelector('.yer').innerHTML = '';
      await fisUcur(bet, levha, p.geri, 450);
    }
    if (p.ucret) await fisUcur(s.querySelector('.ncekme'), kasaRect(), p.ucret, 350);
    if (p.sigorta) {
      const sg = s.querySelector('.nsigorta');
      if (p.sigortaGeri) { await fisUcur(kasaRect(), sg, p.sigorta, 450); await fisUcur(sg, levha, p.sigortaGeri, 400); }
      else await fisUcur(sg, kasaRect(), p.sigorta, 350);
    }
  }
  sessizOdeme = false;
  if (fisOynadi) ses.fis(8);
  mesgul = false;
  void g;
  const enBuyuk = Math.max(0, ...el.oyuncular.map(p => (p.katildi ? p.net : 0)));
  if (enBuyuk >= 10 * el.ante) ruh('saskin', 2500);
  else if (el.kasaNet > 0) ruh('gulen', 2500);
  ciz();
}

let sessizOdeme = false; // toplu ödeme sırasında her fiş uçuşu ayrı ses çıkarmasın
let expressBekliyor = false; // dağıtım animasyonu bitene kadar express dairesinde durur

async function dagit() {
  if (mesgul) return;
  ses.acil();
  konus.kilidiAc();
  let yeni;
  try { yeni = novoDagit(N.g); } catch (e) { hata = e.message; panelCiz(); return; }
  gecmiseAt(); hata = ''; N.g = yeni; kaydet();
  mesgul = true; expressBekliyor = true;
  if (yeni.el.krupiyeAcik) maske = { faz: 'karar', krupiyeAcik: false, kasa: kasaCanli({ ...N.g, kasaNet: (N.g.kasaNet || 0) - (yeni.el.kasaNet || 0) }) };
  const el = N.g.el;
  ciz();
  const spotlar = el.oyuncular.map((p, i) => [p, i]).filter(([p]) => p.katildi);
  const gizle = e => { e.style.visibility = 'hidden'; };
  $('n-alan').querySelectorAll('.nkartlar .kart, .nel').forEach(gizle);
  [...$('n-krupiye').children].forEach(gizle);
  $('n-yakilan').querySelectorAll('.yk-kart').forEach(gizle);
  // 10 elde bir kurpiye değişir: "Dealer change"
  if (degisimEli(el.no)) {
    duyuru('<div class="no" style="font-size:clamp(34px,6vw,64px)">DEALER CHANGE</div><div class="kk">Yeni kurpiye masaya geliyor</div>');
    konus.soyle('dealer_change');
    await kurpiyeDegistir(eldekiKurpiye(el.no));
    await bekle(400);
  } else kurpiyeAyarla(eldekiKurpiye(el.no));
  // Girişler daireye
  for (const [p, i] of spotlar) {
    const s = spotEl(i);
    const levha = s.querySelector('.nlevha');
    await fisUcur(levha, s.querySelector('.ndaire.ante'), p.ante, 300);
    await fisUcur(levha, s.querySelector('.ndaire.express'), p.bonus, 300);
  }
  ruh('dagit');
  const sure = ses.karistir() || 0;
  await bekle(Math.min(1500, sure * 700));
  // Novo: dağıtımdan önce 3 kart yakılır
  for (let j = 0; j < YAKILAN_ILK; j++) { await yak(j, 520); await bekle(150); }
  await bekle(250);
  // 5 tur: önce oyuncular, sonra krupiye
  for (let k = 0; k < 5; k++) {
    for (const [, i] of spotlar) {
      const c = spotEl(i).querySelectorAll('.nkartlar .kart')[k];
      ses.kartAt(); await kartUcur(kasaRect(), c, 640); c.style.visibility = ''; await bekle(200);
    }
    const d = $('n-krupiye').children[k];
    ses.kartAt(); await kartUcur(kasaRect(), d, 640); d.style.visibility = ''; await bekle(300);
  }
  ses.kartCevir();
  ruh('normal');
  await bekle(300);
  let galaGosterildi = false;
  // Express hemen: kazanan ödenir, kaybedenin express'i kasaya. Önce Elif bonusları söyler,
  // fişler konuşma bitince gider, çip sesi sonda bir kez çalar.
  for (const [p, i] of spotlar) {
    spotEl(i).querySelector('.nel').style.visibility = '';
    if (p.bonusOdeme) {
      ruh(p.bonusOran >= 30 ? 'saskin' : 'goz', 1600);
      if (p.bonusOran >= 30 && !galaGosterildi) { galaGosterildi = true; gala(true); havaiFisek(); }
      konus.soyle(konus.ad(g0ad(i)), 'bonus_odeme', konus.el(bonusAnahtari(p.ilk)), konus.sayi(p.bonusOdeme - p.bonus), 'dolar');
    }
  }
  await konus.bitince();
  sessizOdeme = true;
  for (const [p, i] of spotlar) {
    const s = spotEl(i);
    const ex = s.querySelector('.ndaire.express');
    if (p.bonusOdeme) {
      await fisUcur(kasaRect(), ex, p.bonusOdeme - p.bonus, 500);
      ex.querySelector('.yer').innerHTML = '';
      await fisUcur(ex, s.querySelector('.nlevha'), p.bonusOdeme, 450);
    } else {
      // bonus yok: express kasaya
      ex.querySelector('.yer').innerHTML = '';
      await fisUcur(ex, kasaRect(), p.bonus, 350);
    }
  }
  sessizOdeme = false;
  if (spotlar.length) ses.fis(spotlar.length > 1 ? 8 : 4);
  expressBekliyor = false;
  mesgul = false;
  ciz();
  if (N.g.el.faz !== 'karar' && N.g.el.faz !== 'cekme') await sonAnimasyon({ el: { ...N.g.el, krupiyeAcik: false, faz: 'karar' } }, N.g);
}

function yukleAc() {
  const g = N.g;
  perdeAc(`<div style="font-size:20px;font-weight:800">Para yükle</div>
    <label>Oyuncu<select id="y-kim">${g.oyuncular.map((o, i) => `<option value="${i}">${kacis(o.ad)} · ${para(o.fis)}</option>`).join('')}</select></label>
    <label>Tutar<select id="y-tutar">${[100, 250, 500, 1000, 2000].map(t => `<option value="${t}" ${t === g.baslangicFis ? 'selected' : ''}>${para(t)}</option>`).join('')}</select></label>
    <div class="hata" id="y-hata"></div>
    <div class="satir"><button class="btn-ikincil" id="y-iptal">Vazgeç</button><button class="btn-ana" id="y-ok">Yükle</button></div>`,
  k => {
    k.querySelector('#y-iptal').onclick = perdeKapat;
    k.querySelector('#y-ok').onclick = () => {
      try {
        const yeni = paraYukle(N.g, Number(k.querySelector('#y-kim').value), Number(k.querySelector('#y-tutar').value));
        gecmiseAt(); N.g = yeni; kaydet(); perdeKapat(); ses.fis(5); ciz();
      } catch (e) { k.querySelector('#y-hata').textContent = e.message; }
    };
  });
}

function odemeTablosu() {
  const satir = (ad, v) => `<div><span>${ad}</span><b>${v}:1</b></div>`;
  const ana = [['Royal flush', ODEME.RF], ['Renkli kent', ODEME.SF], ['Kare', ODEME[7]], ['Full', ODEME[6]], ['Renk', ODEME[5]],
    ['Kent', ODEME[4]], ['Üçlü', ODEME[3]], ['İki çift', ODEME[2]], ['Çift', ODEME[1]], ['As-Papaz', ODEME.AK]];
  const ex = [['Royal flush', BONUS.RF], ['Renkli kent', BONUS.SF], ['Kare', BONUS[7]], ['5 surat', BONUS.SURAT], ['Full', BONUS[6]], ['Renk', BONUS[5]],
    ['Kent', BONUS[4]], ['Üçlü', BONUS[3]], ['As-Papaz-Kız', BONUS.AKQ], ['Sahte renk', BONUS.SAHTE]];
  $('n-tablo-bet').innerHTML = '<div class="bas">BET</div>' + ana.map(([a, v]) => satir(a, v)).join('');
  $('n-tablo-ex').innerHTML = '<div class="bas">EXPRESS</div>' + ex.map(([a, v]) => satir(a, v)).join('');
}

export function novoBagla() {
  odemeTablosu();
  krupiyeKur($('n-krupiye-kadin'));
  $('n-yazi').onclick = () => $('e-novo').classList.toggle('tablo-acik');
  $('n-alan').addEventListener('click', e => { if (e.target.id !== 'n-yazi') $('e-novo').classList.remove('tablo-acik'); });
  $('n-ses').onclick = () => { ses.acil(); ses.sesAyarla(!ses.sesAcikMi()); $('n-ses').textContent = ses.sesAcikMi() ? '🔊' : '🔇'; };
  $('n-geri').onclick = async () => {
    if (!N.gecmis.length || mesgul) return;
    if (!(await onayla('Son hamle geri alınsın mı?', 'Geri al'))) return;
    N.g = JSON.parse(N.gecmis.pop()); secimModu = false; secili.clear(); hata = ''; kurpiyeAyarla(eldekiKurpiye(N.g.elNo || 1));
    kaydet(); ciz();
  };
  $('n-menu').onclick = () => {
    perdeAc(`<div style="font-size:20px;font-weight:800">Novo masası</div>
      <button class="btn-ikincil" id="nm-yukle">Para yükle</button>
      <button class="btn-ikincil" id="nm-konus">Seslendirme: ${konus.acikMi() ? 'Açık' : 'Kapalı'}</button>
      <button class="btn-ikincil" id="nm-ortam">Casino uğultusu: ${ses.ortamAcikMi() ? 'Açık' : 'Kapalı'}</button>
      <button class="btn-ikincil" id="nm-kutlama">Büyük bonus kutlamasını göster</button>
      <button class="btn-ikincil" id="nm-yeniden">Baştan başlat (herkese ${para(N.g.baslangicFis)})</button>
      <button class="btn-tehlike" id="nm-kapat">Masayı kapat</button>
      <button class="btn-ana" id="nm-tamam">Kapat</button>`, k => {
      k.querySelector('#nm-tamam').onclick = perdeKapat;
      k.querySelector('#nm-ortam').onclick = e => { ses.acil(); ses.ortamAyarla(!ses.ortamAcikMi()); e.target.textContent = 'Casino uğultusu: ' + (ses.ortamAcikMi() ? 'Açık' : 'Kapalı'); };
      k.querySelector('#nm-konus').onclick = e => { konus.ayarla(!konus.acikMi()); e.target.textContent = 'Seslendirme: ' + (konus.acikMi() ? 'Açık' : 'Kapalı'); if (konus.acikMi()) { konus.kilidiAc(); konus.soyle('seslendirme_acik'); } };
      k.querySelector('#nm-kutlama').onclick = async () => {
        perdeKapat();
        if (mesgul) return;
        ses.acil(); konus.kilidiAc();
        // Önizleme: oyun durumu değişmez, yalnız 30 kat ve üstü express kutlaması oynar
        ruh('saskin', 1600); gala(true); havaiFisek();
        konus.soyle('tebrikler', 'bonus_odeme', konus.el('7'), konus.sayi(5000), 'dolar');
        ses.fis(8);
        await bekle(9000);
        if (!mesgul) gala(false);
      };
      k.querySelector('#nm-yukle').onclick = () => { perdeKapat(); if (!N.g.el || N.g.el.faz === 'bitti') yukleAc(); };
      k.querySelector('#nm-yeniden').onclick = async () => {
        perdeKapat();
        if (!(await onayla(`Herkes yeniden ${para(N.g.baslangicFis)} ile başlasın mı? Kasanın bu oyun sayacı sıfırlanır.`, 'Başlat'))) return;
        gecmiseAt(); N.g = novoYenidenBaslat(N.g); kaydet(); ciz();
      };
      k.querySelector('#nm-kapat').onclick = async () => {
        perdeKapat();
        if (!(await onayla('Novo masası silinsin mi?', 'Sil'))) return;
        try { localStorage.removeItem(ANAHTAR); } catch (e) {}
        N = null; ekranGoster('e-giris');
      };
    });
  };
  window.addEventListener('resize', () => { if (N && document.querySelector('#e-novo.etkin') && !mesgul) ciz(); });
}
