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
  try {
    await wixInsert(f.dataset.collection, data);
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
