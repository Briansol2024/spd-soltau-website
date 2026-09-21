// Client-Skript: Interaktion + Bewegung (nach Referenz-Entwurf D). Inhalte kommen aus window.SPD (im Build eingebettet).
import { setBase, url, newsCard, eventsGrouped, personCard, pollButtons, esc } from './render.mjs';

const SPD = window.SPD || {};
setBase(SPD.base || '');
// Website aus der App heraus geöffnet (Globus im App-Kopf, installierte App oder ?app=1 zum Ausprobieren): oben ein Streifen zurück
// zum Mitgliederbereich. Der Mitgliederbereich selbst ist die App und braucht keinen.
const isApp = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || /[?&]app=1/.test(location.search);
const onMembers = /\/mitglieder\//.test(location.pathname);
let meName = null; try { meName = JSON.parse(localStorage.getItem('spd-me') || 'null')?.name || null; } catch (e) { /* ohne Speicher */ }
let fromApp = null; try { fromApp = sessionStorage.getItem('spd-from-app'); } catch (e) { /* ohne Speicher */ }
if (onMembers) { try { sessionStorage.removeItem('spd-from-app'); } catch (e) { /* egal */ } }
else if ((isApp && meName) || fromApp) {
  // Nur wer angemeldet ist (oder gerade aus der App kommt) bekommt den Streifen – Besucher sehen die Website wie gewohnt
  document.documentElement.classList.add('from-app');
  const back = document.querySelector('#app-return a');
  if (back) {
    if (fromApp && fromApp.startsWith('?')) back.href = back.getAttribute('href') + fromApp; // aus der Vorschau (?demo) zurück in die Vorschau
    if (!meName) back.lastChild.textContent = 'Zum Mitgliederbereich';
  }
}
document.addEventListener('click', e => { if (e.target.closest('[data-website]')) { try { sessionStorage.setItem('spd-from-app', /^\?demo/.test(location.search) ? location.search : '1'); } catch (err) { /* egal */ } } });
// Personen-Symbol im Website-Kopf: nach der Anmeldung die Initialen
try { const ml = document.getElementById('member-link'); if (meName && ml) { const ini = meName.split(/\s+/).map(x => x[0]).join('').slice(0, 2).toUpperCase(); ml.innerHTML = `<b>${esc(ini)}</b>`; ml.setAttribute('aria-label', `Mitgliederbereich – angemeldet als ${meName}`); ml.title = `Mitgliederbereich – ${meName}`; } } catch (e) { /* egal */ }
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Menü ----------
const nav = $('#nav'), burger = $('#burger');
burger?.addEventListener('click', () => {
  const o = nav.classList.toggle('open');
  burger.setAttribute('aria-expanded', o);
  burger.setAttribute('aria-label', o ? 'Menü schließen' : 'Menü öffnen');
});

// ---------- Aktuelles: Filter ----------
const allNews = $('#all-news');
if (allNews && SPD.news) {
  $$('.filter .chip').forEach(b => b.addEventListener('click', () => {
    $$('.filter .chip').forEach(x => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
    const cat = b.dataset.cat;
    allNews.innerHTML = SPD.news.filter(n => cat === 'alle' || n.cat === cat).map(newsCard).join('') || '<p class="muted">Keine Beiträge in dieser Kategorie.</p>';
  }));
}

// ---------- Termine: nur öffentliche ----------
const onlyPublic = $('#only-public'), allEv = $('#all-events');
if (onlyPublic && allEv && SPD.events) {
  onlyPublic.addEventListener('change', () => {
    const list = SPD.events.filter(e => !onlyPublic.checked || e.typ === 'Öffentlich' || e.typ === 'Rat');
    allEv.innerHTML = list.length ? eventsGrouped(list, true) : '<p class="muted">Keine Termine in dieser Auswahl.</p>';
  });
}

// ---------- Wer kümmert sich um was? ----------
const themenEl = $('#themen'), ansprechEl = $('#ansprech');
if (themenEl && ansprechEl && SPD.people) {
  $$('.chip', themenEl).forEach((c, i) => c.addEventListener('click', () => {
    $$('.chip', themenEl).forEach((x, j) => x.setAttribute('aria-pressed', String(i === j)));
    const t = SPD.themen[i];
    ansprechEl.innerHTML = SPD.people.filter(p => p.themen.includes(t)).map(personCard).join('');
  }));
}

// ---------- Umfrage (lokal gespeichert, nur in diesem Browser) ----------
const pollEl = $('#poll');
if (pollEl && SPD.poll) {
  let myVote = null; try { myVote = localStorage.getItem('spd-poll'); } catch (e) { /* ohne Speicher */ }
  const render = () => { pollEl.innerHTML = pollButtons(SPD.poll, myVote); };
  pollEl.addEventListener('click', e => {
    const b = e.target.closest('button[data-i]'); if (!b || myVote !== null) return;
    myVote = b.dataset.i; try { localStorage.setItem('spd-poll', myVote); } catch (err) { /* ohne Speicher */ }
    render();
  });
  if (myVote !== null) render();
}

// ---------- Kontakt: Themen-Chips ----------
const kt = $('#k-topics');
kt?.addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  $$('.chip', kt).forEach(c => c.setAttribute('aria-pressed', 'false'));
  b.setAttribute('aria-pressed', 'true');
  const th = $('#k-thema'); if (th) th.value = b.textContent.trim();
});

// ---------- Personen-Fenster ----------
const dlg = $('#person-dialog');
const findPerson = name => [...(SPD.rat || []), ...(SPD.people || []), ...(SPD.vorstand || []), ...(SPD.fraktion || [])].find(p => p.name === name);
document.addEventListener('click', e => {
  const b = e.target.closest('.person,.tm'); if (!b || !dlg) return;
  const p = findPerson(b.dataset.name); if (!p) return;
  $('#dlg-job').textContent = p.job || '';
  $('#dlg-name').textContent = p.name;
  $('#dlg-rolle').textContent = p.role || ''; $('#dlg-rolle').hidden = !p.role;
  $('#dlg-text').textContent = p.text || ''; $('#dlg-text').hidden = !p.text;
  const ph = $('#dlg-photo');
  if (p.photo?.url) { ph.innerHTML = `<img src="${esc(p.photo.url)}" alt="${esc(p.name)}">`; ph.hidden = false; } else { ph.hidden = true; ph.innerHTML = ''; }
  dlg.showModal();
});
$('#dlg-close')?.addEventListener('click', () => dlg.close());
dlg?.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
dlg?.querySelector('a')?.addEventListener('click', () => dlg.close());

// ---------- Instagram-Fenster: Bilder-Karussell, Text, Likes – alles auf der eigenen Seite ----------
const idlg = $('#insta-dialog');
if (idlg && SPD.insta && SPD.insta.length) {
  const track = $('#insta-track'), dots = $('#insta-dots');
  let post = 0, slide = 0;
  const fmtDate = s => { const d = new Date(s + 'T00:00:00'); return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }); };
  const linkify = t => esc(t).replace(/(#[\wäöüÄÖÜß]+)/g, '<span class="hashtag">$1</span>').replace(/\n/g, '<br>');
  const showSlide = i => {
    const p = SPD.insta[post]; slide = (i + p.images.length) % p.images.length;
    track.style.transform = `translateX(-${slide * 100}%)`;
    $$('.insta-dots i').forEach((d, k) => d.classList.toggle('on', k === slide));
  };
  const showPost = k => {
    post = (k + SPD.insta.length) % SPD.insta.length; const p = SPD.insta[post];
    track.innerHTML = p.images.map(src => `<div class="insta-slide"><img src="${esc(src.startsWith('/') ? url(src) : src)}" alt="" decoding="async"></div>`).join('');
    dots.innerHTML = p.images.length > 1 ? p.images.map(() => '<i></i>').join('') : '';
    idlg.classList.toggle('single', p.images.length < 2);
    $('#insta-date').textContent = fmtDate(p.date);
    $('#insta-caption').innerHTML = linkify(p.caption || '');
    $('#insta-likes').textContent = p.likes != null ? `♥ ${p.likes}` : '';
    $('#insta-comments').textContent = p.comments != null ? `${p.comments} Kommentare` : '';
    $('#insta-link').href = p.url;
    $('#insta-caption').scrollTop = 0;
    showSlide(0);
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-insta]'); if (!b) return;
    showPost(+b.dataset.insta); idlg.showModal();
  });
  $('#insta-prev').addEventListener('click', () => showSlide(slide - 1));
  $('#insta-next').addEventListener('click', () => showSlide(slide + 1));
  $('#insta-prevpost').addEventListener('click', () => showPost(post - 1));
  $('#insta-nextpost').addEventListener('click', () => showPost(post + 1));
  $('#insta-close').addEventListener('click', () => idlg.close());
  idlg.addEventListener('click', e => { if (e.target === idlg) idlg.close(); });
  idlg.addEventListener('keydown', e => { if (e.key === 'ArrowRight') showSlide(slide + 1); if (e.key === 'ArrowLeft') showSlide(slide - 1); });
  // Wischen auf dem Handy
  let x0 = null;
  track.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  track.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) showSlide(slide + (dx < 0 ? 1 : -1)); x0 = null; });
}

// ---------- Formulare (Testphase: keine Übertragung, nur Bestätigung) ----------
$$('form.mock').forEach(f => f.addEventListener('submit', e => {
  e.preventDefault();
  if (!f.checkValidity()) { f.reportValidity(); return; }
  f.querySelector('.form-fields').hidden = true; f.querySelector('.form-ok').hidden = false;
}));

// ===== Bewegung =====
const site = $('#site'), header = $('.header') || $('.app-header'), progress = $('#progress'), totop = $('#totop'), heroPh = $('.hero .ph');
const RV_SEL = '.za,.section-head,.page-head>*,.card,.event,.ev-mini,.person,.tm,.box,.ziel,.zk,.ziele-grid a,.insta .ph,.stat,.col,.quick a,.month,.filter,.themen,.toggle,.article>*,.prose>*,.newsletter>*,form.mock,.footer .grid>*,.footer .claim,.poll,.zinke>*';
const io = new IntersectionObserver(entries => {
  const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
  vis.forEach((e, i) => { const el = e.target; io.unobserve(el); setTimeout(() => { el.classList.add('in'); setTimeout(() => el.classList.add('done'), 800); }, REDUCED ? 0 : Math.min(i, 10) * 50); });
}, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
function arm() {
  site.querySelectorAll(RV_SEL).forEach(el => {
    if (el.classList.contains('rv') || el.closest('.hero') || el.closest('#mitglieder-app') || (el.parentElement && el.parentElement.closest('.rv'))) return;
    el.classList.add('rv');
    if (el.matches('.section-head,.page-head>*')) el.classList.add('rv-l');
    if (el.matches('.insta .ph,.stat')) el.classList.add('rv-s');
    io.observe(el);
  });
  armCounters();
}
let armQueued = false;
new MutationObserver(() => { if (armQueued) return; armQueued = true; requestAnimationFrame(() => { armQueued = false; arm(); }); }).observe(site, { childList: true, subtree: true });

// Zahlen zählen hoch
const cio = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; cio.unobserve(e.target);
  const el = e.target, n = +el.dataset.count; if (REDUCED) { el.textContent = n; return; }
  const t0 = performance.now(), dur = 1200;
  const step = t => { const p = Math.min(1, (t - t0) / dur); el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}), { threshold: .5 });
function armCounters() {
  site.querySelectorAll('.stat b').forEach(el => { if (el.dataset.count !== undefined) return; const t = el.textContent.trim(); if (!/^\d+$/.test(t)) return; el.dataset.count = t; el.textContent = '0'; cio.observe(el); });
}

// Scrollen: Header, Fortschritt, Parallaxe, nach oben
function onScroll() {
  const top = window.scrollY, h = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  header.classList.toggle('scrolled', top > 24);
  progress.style.width = (Math.min(1, top / h) * 100) + '%';
  totop.classList.toggle('show', top > 500);
  if (heroPh && !REDUCED) heroPh.style.setProperty('--py', Math.min(top * .15, 140) + 'px');
}
addEventListener('scroll', onScroll, { passive: true });
totop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
arm(); onScroll();

// Hero-Video: passende Qualität laden, bei „Bewegung reduzieren“ nur Standbild
const heroVideo = $('#hero-video');
if (heroVideo && SPD.heroVideo && !REDUCED) {
  const q = innerWidth < 700 ? '480p' : '720p';
  heroVideo.src = `${SPD.heroVideo.base}/${q}/mp4/file.mp4`;
  const tryPlay = () => heroVideo.play().catch(() => { /* Autoplay (noch) blockiert → Standbild bleibt */ });
  heroVideo.addEventListener('canplay', () => { heroVideo.classList.add('ready'); tryPlay(); }, { once: true });
  tryPlay();
  // Falls der Browser Autoplay erst nach einer Berührung erlaubt
  ['touchstart', 'scroll', 'click'].forEach(ev => addEventListener(ev, () => { if (heroVideo.paused) tryPlay(); }, { passive: true, once: true }));
  document.addEventListener('visibilitychange', () => { if (!document.hidden && heroVideo.paused) tryPlay(); });
}

// Lichtkegel im Hero folgt der Maus
const hero = $('.hero');
hero?.addEventListener('mousemove', e => { const r = hero.getBoundingClientRect(); hero.style.setProperty('--mx', (e.clientX - r.left) + 'px'); hero.style.setProperty('--my', (e.clientY - r.top) + 'px'); });

// Claim im Footer buchstabenweise
const claim = $('.footer .claim');
if (claim) { let i = 0; [...claim.childNodes].forEach(n => { if (n.nodeType !== 3) return; const frag = document.createDocumentFragment(); [...n.textContent].forEach(ch => { const s = document.createElement('span'); s.textContent = ch; s.style.setProperty('--i', i++); frag.appendChild(s); }); n.replaceWith(frag); }); }

// Sanftes Scrollen zu Ankern auf derselben Seite (z. B. „Ich suche eine Ansprechperson“)
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const href = a.getAttribute('href'); if (!/^#[A-Za-z][\w-]*$/.test(href)) return; // App-Routen wie #hilfe/zusagen sind keine Anker
  const t = document.querySelector(href); if (!t) return;
  e.preventDefault(); t.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
});

// ---------- App: Service Worker (installierbar, offline, Push) ----------
if ('serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register(new URL(`${SPD.base || '.'}/sw.js`, location.href)).catch(() => { /* z. B. http ohne localhost */ });
  });
}

// ---------- Formulare, die direkt in eine Wix-Sammlung schreiben (Buchungsanfrage) ----------
// Kleiner Direktzugriff auf die Wix-Daten-API mit Besucher-Token – ohne das große SDK-Bundle.
async function wixVisitorToken() {
  try { const t = JSON.parse(sessionStorage.getItem('spd-vt') || 'null'); if (t && t.exp > Date.now() + 60000) return t.v; } catch (e) { /* neu holen */ }
  const r = await fetch('https://www.wixapis.com/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: SPD.app?.clientId, grantType: 'anonymous' }) });
  if (!r.ok) throw new Error('Kein Zugang zur Wix-API (' + r.status + ')');
  const j = await r.json();
  try { sessionStorage.setItem('spd-vt', JSON.stringify({ v: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 })); } catch (e) { /* ohne Speicher */ }
  return j.access_token;
}
export async function wixInsert(collection, data) {
  const token = await wixVisitorToken();
  const r = await fetch('https://www.wixapis.com/wix-data/v2/items', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token }, body: JSON.stringify({ dataCollectionId: collection, dataItem: { data } }) });
  if (!r.ok) throw new Error('Speichern fehlgeschlagen (' + r.status + ')');
  return (await r.json()).dataItem;
}
$$('form.wix-form').forEach(f => f.addEventListener('submit', async e => {
  e.preventDefault();
  if (!f.checkValidity()) { f.reportValidity(); return; }
  const btn = f.querySelector('[type=submit]'), note = f.querySelector('.note');
  btn.disabled = true; if (note) note.hidden = true;
  const data = { status: f.dataset.collection === 'Abonnenten' ? 'neu' : 'offen' };
  new FormData(f).forEach((v, k) => { data[k] = String(v).trim(); });
  data.title = f.dataset.collection === 'Abonnenten' ? `Anmeldung ${data.email || ''}` : [data.typ ? { kontakt: 'Kontakt', mitglied: 'Mitgliedsanfrage' }[data.typ] || data.typ : '', data.name || '', data.datum || '', data.von || ''].filter(Boolean).join(' – ');
  if (f.dataset.collection === 'Fragen') { data.title = 'Frage: ' + String(data.frage || '').slice(0, 60); data.anonym = data.anonym === 'ja'; delete data.typ; }
  if (data.oeffentlichOk !== undefined) data.oeffentlichOk = data.oeffentlichOk === 'ja';
  try {
    await wixInsert(f.dataset.collection, data);
    zaehlen('ereignis', 'formular:' + f.dataset.collection);
    f.querySelector('.form-fields').hidden = true; f.querySelector('.form-ok').hidden = false;
  } catch (err) {
    if (note) { note.hidden = false; note.className = 'note note-err'; note.textContent = 'Die Anfrage konnte nicht gesendet werden (' + err.message + '). Bitte später noch einmal versuchen oder über die Kontaktseite schreiben.'; }
    btn.disabled = false;
  }
}));

// Newsletter-Seite: Bestätigen/Abmelden über Token aus der E-Mail
(async () => {
  const box = $('#abo-status'); if (!box) return;
  const q = new URLSearchParams(location.search);
  const token = q.get('bestaetigen') || q.get('abmelden');
  if (!token) { box.innerHTML = '<p>Hier können Sie sich für den Newsletter anmelden – oder über den Link in einer Ausgabe abmelden.</p>'; return; }
  const typ = q.get('bestaetigen') ? 'bestaetigung' : 'abmeldung';
  try {
    await wixInsert('Abonnenten', { title: typ, typ, token, status: 'neu' });
    history.replaceState(null, '', location.pathname);
    box.innerHTML = typ === 'bestaetigung' ? '<h3>Vielen Dank – Ihre Anmeldung ist bestätigt.</h3><p>Die nächste Ausgabe kommt automatisch. Bis dahin: <a href="../aktuelles/">Aktuelles</a>.</p>' : '<h3>Sie sind abgemeldet.</h3><p>Schade – aber jederzeit gern wieder. Sie bekommen keine weiteren Ausgaben.</p>';
  } catch (e) { box.innerHTML = '<p class="note note-err">Das hat gerade nicht geklappt (' + e.message + '). Bitte später noch einmal versuchen.</p>'; }
})();

export async function wixQuery(collection, query) {
  const token = await wixVisitorToken();
  const r = await fetch('https://www.wixapis.com/wix-data/v2/items/query', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token }, body: JSON.stringify({ dataCollectionId: collection, query }) });
  if (!r.ok) throw new Error('Abfrage fehlgeschlagen (' + r.status + ')');
  return ((await r.json()).dataItems || []).map(it => ({ _id: it.id, ...it.data }));
}

// ---------- Reichweitenmessung ohne Cookies ----------
// Ein Eintrag je Seitenaufruf in der Sammlung „Seitenaufrufe“: Seite, Herkunft (nur die Domain), Gerät, Browsersprache, Ladezeit –
// keine IP-Adresse, keine Kennung, kein Cookie. Der Push-Dienst verdichtet die Einträge alle paar Minuten zu Tageswerten und löscht
// die Rohdaten (Auswertung: Mitgliederbereich → Vorstand → Statistik). Klicks auf wichtige Knöpfe zählen als „Ereignis“.
function zaehlen(typ, name) {
  if (!SPD.app?.clientId) return;
  let ref = 'direkt', eintritt = true;
  try {
    if (document.referrer) {
      const h = new URL(document.referrer).hostname.replace(/^(www|m|l|lm)\./, '');
      if (h === location.hostname.replace(/^www\./, '')) { ref = 'intern'; eintritt = false; } else ref = h;
    }
  } catch (e) { ref = 'unbekannt'; }
  const q = new URLSearchParams(location.search);
  const nav = performance.getEntriesByType ? performance.getEntriesByType('navigation')[0] : null;
  const now = new Date();
  const wurzel = new URL(url('/'), location.href).pathname; // '/' – oder '/spd-soltau-website/' bei BASE_PATH
  const pfad = ('/' + location.pathname.slice(wurzel.length)).replace(/index\.html$/, '').replace(/\/+/g, '/') || '/';
  const data = {
    typ, pfad, name: name || '', ref, quelle: q.get('utm_source') || (q.get('fbclid') ? 'facebook.com' : ''),
    geraet: matchMedia('(pointer: coarse)').matches ? (innerWidth >= 700 ? 'tablet' : 'handy') : 'pc',
    sprache: (navigator.language || '').slice(0, 2).toLowerCase(), breite: Math.round(innerWidth / 100) * 100,
    eintritt: typ === 'seite' && eintritt, app: matchMedia('(display-mode: standalone)').matches,
    ladezeit: nav ? Math.round(nav.domContentLoadedEventEnd || 0) : 0,
    tag: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`, stunde: now.getHours(),
    title: typ === 'seite' ? pfad : name || '',
  };
  return wixInsert('Seitenaufrufe', data).catch(() => {});
}
window.spdZaehlen = zaehlen;
if (!navigator.webdriver && location.hostname !== 'localhost') {
  addEventListener('load', () => setTimeout(() => zaehlen('seite'), 600));
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href], [data-track], [data-share]'); if (!a) return;
    const t = a.dataset.track || (a.matches('a[href*="instagram.com"]') ? 'instagram' : a.matches('a[data-webcal]') ? 'kalender-abo' : a.matches('a[href^="mailto:"]') ? 'e-mail' : a.matches('a[href^="tel:"]') ? 'telefon' : a.matches('a[href*="/mitglieder/"]') ? 'mitgliederbereich' : a.matches('[data-share]') ? 'teilen' : /\.pdf(\?|$)/i.test(a.href || '') ? 'pdf' : '');
    if (t) zaehlen('ereignis', t);
  });
  addEventListener('appinstalled', () => zaehlen('ereignis', 'app-installiert'));
}

// ---------- Termine per WhatsApp teilen (Text + Link auf die Terminseite) ----------
const wireShare = () => $$('a[data-share]:not([data-ready])').forEach(a => { a.dataset.ready = '1'; a.href = 'https://wa.me/?text=' + encodeURIComponent(a.dataset.share + '\n' + new URL(url('/termine/'), location.href).href); });
wireShare(); new MutationObserver(wireShare).observe(document.body, { childList: true, subtree: true });

// ---------- Kalender-Abo: webcal-Link aus der ICS-Adresse ----------
$$('a[data-webcal]').forEach(a => { a.href = new URL(a.getAttribute('href'), location.href).href.replace(/^https?:/, 'webcal:'); });

// ---------- Startseite: Umfrage der Woche (öffentliche Umfrage aus dem Mitgliederbereich) ----------
const ubox = $('#umfrage-box');
if (ubox && SPD.app?.clientId) {
  (async () => {
    let u; try { [u] = await wixQuery('UmfragenOeffentlich', { filter: { offen: true }, sort: [{ fieldName: '_createdDate', order: 'DESC' }], paging: { limit: 1 } }); } catch (e) { return; }
    const today = new Date().toISOString().slice(0, 10);
    if (!u || (u.endetAm && u.endetAm < today) || !Array.isArray(u.optionen)) return;
    const key = 'spd-umfrage-' + u._id; let voted = null; try { voted = localStorage.getItem(key); } catch (e) { /* ohne Speicher */ }
    const render = () => {
      ubox.hidden = false;
      ubox.innerHTML = `<div class="wrap"><div class="umfrage"><span class="tag tag-weiss">Umfrage der Woche</span><h3>${esc(u.frage)}</h3>${u.beschreibung ? `<p>${esc(u.beschreibung)}</p>` : ''}
        ${voted === null ? `<div class="umfrage-opts">${u.optionen.map((o, i) => `<button type="button" class="btn btn-weiss" data-i="${i}">${esc(o)}</button>`).join('')}</div><p class="small">${u.endetAm ? 'Läuft bis ' + esc(u.endetAm.split('-').reverse().join('.')) + '. ' : ''}Eine Stimme pro Gerät – die Auswertung stellt die SPD Soltau vor.</p>`
          : `<p><b>Danke für Ihre Stimme${u.optionen[+voted] ? ' für „' + esc(u.optionen[+voted]) + '“' : ''}!</b> Das Ergebnis stellen wir nach Ende der Umfrage vor.</p>`}</div></div>`;
    };
    render();
    ubox.addEventListener('click', async e => {
      const b = e.target.closest('button[data-i]'); if (!b) return;
      $$('button', ubox).forEach(x => x.disabled = true);
      try {
        await wixInsert('Stimmen', { umfrageId: u._id, auswahl: [+b.dataset.i], memberId: '', name: 'Besucher', title: 'Besucher – ' + u.frage });
        zaehlen('ereignis', 'umfrage:stimme');
        voted = b.dataset.i; try { localStorage.setItem(key, voted); } catch (err) { /* ohne Speicher */ }
      } catch (err) { $$('button', ubox).forEach(x => x.disabled = false); return; }
      render();
    });
  })();
}

// ---------- Ziele: Akkordeon, immer nur eins offen ----------
const zaList = $('#ziele-list');
if (zaList) {
  const items = $$('.za', zaList);
  const setOpen = (el, open) => { el.classList.toggle('open', open); el.querySelector('.za-head').setAttribute('aria-expanded', String(open)); };
  const openOnly = (el, scroll = true) => {
    items.forEach(x => setOpen(x, x === el));
    if (scroll) setTimeout(() => el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' }), 420);
  };
  zaList.addEventListener('click', e => {
    const head = e.target.closest('.za-head'); if (!head) return;
    const el = head.closest('.za');
    if (el.classList.contains('open')) setOpen(el, false); else openOnly(el);
  });
  const fromHash = () => { const m = location.hash.match(/^#ziel-(\d+)$/); if (!m) return; const el = document.getElementById('ziel-' + m[1]); if (el) openOnly(el); };
  addEventListener('hashchange', fromHash); fromHash();
  document.addEventListener('click', e => { const a = e.target.closest('.zj a'); if (!a) return; e.preventDefault(); history.replaceState(null, '', a.getAttribute('href')); fromHash(); });
}

// ---------- Mitreden: Thema aus der Adresse (?thema=…) in Kontakt- und Fragen-Formular übernehmen ----------
(() => {
  const thema = new URLSearchParams(location.search).get('thema'); if (!thema) return;
  const kt = $('#k-topics'), th = $('#k-thema');
  if (th) { th.value = thema; $$('.chip', kt || document).forEach(c => c.setAttribute('aria-pressed', String(c.textContent.trim() === thema))); const msg = $('#k-msg'); if (msg && !msg.value) msg.value = `Zu „${thema}“: `; }
  const fq = $('#frage-quelle'); if (fq) fq.value = thema;
  const ff = $('#f-frage'); if (ff && !ff.value) ff.placeholder = `Ihre Frage zu „${thema}“ …`;
})();

// ---------- Mitreden: „Betrifft mich auch“ / „Interessiert mich auch“ – ein Klick je Gerät, Zähler live ----------
(() => {
  const liste = $('[data-typ="anliegen"], [data-typ="frage"]'); if (!liste || !SPD.app?.clientId) return;
  const typ = liste.dataset.typ; const key = 'spd-mit-' + typ;
  let meine = []; try { meine = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { meine = []; }
  let geraet = ''; try { geraet = localStorage.getItem('spd-geraet') || ''; if (!geraet) { geraet = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('spd-geraet', geraet); } } catch (e) { geraet = 'ohne'; }
  const markieren = () => $$('[data-unterstuetzen]', liste).forEach(b => b.setAttribute('aria-pressed', String(meine.includes(b.dataset.unterstuetzen))));
  markieren();
  // Zähler frisch aus den Rohdaten (der Bau-Stand kann ein paar Minuten alt sein)
  (async () => {
    try {
      const rohe = await wixQuery('Unterstuetzung', { filter: { typ }, paging: { limit: 1000 } });
      const n = {}; for (const r of rohe) n[r.zielId] = (n[r.zielId] || 0) + 1;
      $$('[data-zaehler]', liste).forEach(el => { if (n[el.dataset.zaehler] !== undefined) el.textContent = n[el.dataset.zaehler]; });
      if (typ === 'anliegen') { const box = $('#anliegen-liste'); const karten = $$('.anliegen', box).sort((a, b) => (n[b.dataset.id] || 0) - (n[a.dataset.id] || 0)); karten.forEach((k, i) => { box.append(k); const r = $('.rang', k); if (r) r.textContent = i + 1; }); }
    } catch (e) { /* Zähler bleiben wie gebaut */ }
  })();
  liste.addEventListener('click', async e => {
    const b = e.target.closest('[data-unterstuetzen]'); if (!b) return;
    const id = b.dataset.unterstuetzen; if (meine.includes(id)) return;
    b.disabled = true;
    try {
      await wixInsert('Unterstuetzung', { zielId: id, typ, geraet, title: typ + ' ' + id });
      meine.push(id); try { localStorage.setItem(key, JSON.stringify(meine)); } catch (err) { /* ohne Speicher */ }
      const z = $(`[data-zaehler="${id}"]`, liste); if (z) z.textContent = (parseInt(z.textContent, 10) || 0) + 1;
      zaehlen('ereignis', 'mitreden:' + typ);
      markieren();
    } catch (err) { /* nichts – Knopf bleibt */ }
    b.disabled = false;
  });
})();

// ---------- Mitreden: Filter-Chips (Anliegen nach Kategorie, Baustellen nach Art) ----------
$$('.filter-chips').forEach(box => box.addEventListener('click', e => {
  const c = e.target.closest('.chip'); if (!c) return;
  $$('.chip', box).forEach(x => x.setAttribute('aria-pressed', String(x === c)));
  const attr = c.dataset.kat !== undefined ? 'kat' : 'art'; const wert = c.dataset[attr];
  $$(`[data-${attr}]`, box.parentElement).forEach(el => { if (el.classList.contains('chip')) return; el.hidden = !!wert && el.dataset[attr] !== wert; });
  const pins = $$('.karte-pin'); if (pins.length) { const sichtbar = new Set($$('.baustelle:not([hidden])').map(x => x.dataset.id)); pins.forEach(p => { p.hidden = !sichtbar.has(p.dataset.pin); }); }
}));

// ---------- Mitreden: Abstimmung mit bis zu N Kreuzen, Ergebnis nach der Stimme ----------
$$('.abstimmung[data-id]').forEach(art => {
  const id = art.dataset.id, max = Math.max(1, +art.dataset.max || 1), key = 'spd-abst-' + id;
  const opts = $$('.abst-opt', art), knopf = $('[data-abstimmen]', art), erg = $('.abst-ergebnis', art), hinweis = $('[data-hinweis]', art);
  let gewaehlt = []; let fertig = null; try { fertig = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { fertig = null; }
  const zeigeErgebnis = wahl => {
    opts.forEach(o => { o.disabled = true; o.setAttribute('aria-pressed', String(wahl.includes(+o.dataset.i))); });
    knopf.hidden = true; if (hinweis) hinweis.textContent = 'Danke – Ihre Kreuze sind gezählt.';
    // eigene Stimme in den Zwischenstand einrechnen
    let e = []; try { e = JSON.parse(art.dataset.ergebnis || '[]'); } catch (err) { e = []; }
    const n = opts.map((_, i) => (Number(e[i]) || 0) + (wahl.includes(i) ? 1 : 0)); const sum = (+art.dataset.stimmen || 0) + 1;
    $$('.balken-zeile', erg).forEach((z, i) => { const p = sum ? Math.round(100 * n[i] / sum) : 0; $('.balken i', z).style.width = p + '%'; $('b', z).textContent = p + ' %'; });
    const st = $('.small', erg); if (st) st.textContent = `${sum} ${sum === 1 ? 'Stimme' : 'Stimmen'}${max > 1 ? ' · Prozent = Anteil der Abstimmenden, die das angekreuzt haben' : ''} · Zwischenstand, wird alle 30 Minuten aktualisiert`;
    erg.hidden = false;
  };
  if (Array.isArray(fertig)) { zeigeErgebnis(fertig); return; }
  opts.forEach(o => o.addEventListener('click', () => {
    const i = +o.dataset.i;
    if (gewaehlt.includes(i)) gewaehlt = gewaehlt.filter(x => x !== i); else if (max === 1) gewaehlt = [i]; else if (gewaehlt.length < max) gewaehlt.push(i);
    opts.forEach(x => x.setAttribute('aria-pressed', String(gewaehlt.includes(+x.dataset.i))));
    knopf.disabled = !gewaehlt.length; if (hinweis) hinweis.textContent = max > 1 ? `${gewaehlt.length} von ${max} gewählt` : 'Eine Antwort antippen.';
  }));
  knopf.addEventListener('click', async () => {
    if (!gewaehlt.length) return; knopf.disabled = true;
    try {
      await wixInsert('Stimmen', { umfrageId: id, auswahl: gewaehlt.map(String), memberId: '', name: 'Besucher', title: 'Besucher – ' + ($('.title', art)?.textContent || '').slice(0, 60) });
      zaehlen('ereignis', 'mitreden:abstimmung');
      try { localStorage.setItem(key, JSON.stringify(gewaehlt)); } catch (e) { /* ohne Speicher */ }
      zeigeErgebnis(gewaehlt);
    } catch (e) { knopf.disabled = false; if (hinweis) hinweis.textContent = 'Das hat gerade nicht geklappt – bitte noch einmal.'; }
  });
});

// ---------- Mitreden: Baustellen – Pin und Karte zeigen aufeinander ----------
(() => {
  const karte = $('#baustellen-karte'), liste = $('#baustellen-liste'); if (!karte || !liste) return;
  const aktiv = id => { $$('.karte-pin', karte).forEach(p => p.classList.toggle('aktiv', p.dataset.pin === id)); $$('.baustelle', liste).forEach(k => { k.classList.toggle('aktiv', k.dataset.id === id); if (k.dataset.id === id) { $('details', k)?.setAttribute('open', ''); } }); };
  karte.addEventListener('click', e => { const p = e.target.closest('.karte-pin'); if (!p) return; aktiv(p.dataset.pin); $(`.baustelle[data-id="${p.dataset.pin}"]`, liste)?.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'center' }); });
  liste.addEventListener('click', e => { const k = e.target.closest('.baustelle'); if (!k || e.target.closest('a')) return; aktiv(k.dataset.id); const p = $(`.karte-pin[data-pin="${k.dataset.id}"]`, karte); if (p) karte.scrollTo({ left: Math.max(0, p.offsetLeft - karte.clientWidth / 2), top: Math.max(0, p.offsetTop - karte.clientHeight / 2), behavior: REDUCED ? 'auto' : 'smooth' }); });
  // Karte anfangs auf den ersten Pin (oder die Mitte) stellen
  const erst = $('.karte-pin', karte); karte.scrollTo({ left: erst ? Math.max(0, erst.offsetLeft - karte.clientWidth / 2) : (karte.scrollWidth - karte.clientWidth) / 2, top: erst ? Math.max(0, erst.offsetTop - karte.clientHeight / 2) : (karte.scrollHeight - karte.clientHeight) / 2 });
})();
