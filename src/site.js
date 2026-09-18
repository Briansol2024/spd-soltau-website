// Client-Skript: Interaktion + Bewegung (nach Referenz-Entwurf D). Inhalte kommen aus window.SPD (im Build eingebettet).
import { setBase, newsCard, eventsGrouped, personCard, pollButtons, esc } from './render.mjs';

const SPD = window.SPD || {};
setBase(SPD.base || '');
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
    const list = SPD.events.filter(e => !onlyPublic.checked || e.typ === 'Öffentlich');
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
});

// ---------- Personen-Fenster ----------
const dlg = $('#person-dialog');
const findPerson = name => [...(SPD.rat || []), ...(SPD.people || []), ...(SPD.vorstand || []), ...(SPD.fraktion || [])].find(p => p.name === name);
document.addEventListener('click', e => {
  const b = e.target.closest('.person'); if (!b || !dlg) return;
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

// ---------- Formulare (Testphase: keine Übertragung, nur Bestätigung) ----------
$$('form.mock').forEach(f => f.addEventListener('submit', e => {
  e.preventDefault();
  if (!f.checkValidity()) { f.reportValidity(); return; }
  f.querySelector('.form-fields').hidden = true; f.querySelector('.form-ok').hidden = false;
}));

// ===== Bewegung =====
const site = $('#site'), header = $('.header'), progress = $('#progress'), totop = $('#totop'), heroPh = $('.hero .ph');
const RV_SEL = '.section-head,.page-head>*,.card,.event,.person,.box,.ziel,.ziele-grid a,.insta .ph,.stat,.col,.quick a,.month,.filter,.themen,.toggle,.article>*,.prose>*,.newsletter>*,form.mock,.footer .grid>*,.footer .claim,.poll';
const io = new IntersectionObserver(entries => {
  const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
  vis.forEach((e, i) => { const el = e.target; io.unobserve(el); setTimeout(() => { el.classList.add('in'); setTimeout(() => el.classList.add('done'), 800); }, REDUCED ? 0 : Math.min(i, 10) * 50); });
}, { threshold: 0, rootMargin: '0px 0px -6% 0px' });
function arm() {
  site.querySelectorAll(RV_SEL).forEach(el => {
    if (el.classList.contains('rv') || el.closest('.hero') || (el.parentElement && el.parentElement.closest('.rv'))) return;
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
  const t = document.querySelector(a.getAttribute('href')); if (!t) return;
  e.preventDefault(); t.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
});
