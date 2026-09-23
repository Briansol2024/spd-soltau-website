// Mitgliederbereich (/mitglieder/): Anmeldung und Registrierung über das Wix-Mitgliederkonto, danach
// Termine (Zu-/Absagen, Helferlisten, Fahrgemeinschaften), Umfragen, Dokumente, Ratsvorbereitung, Ratsarbeit (Fraktion),
// Mitgliederverzeichnis, Profil (Push, App) und die Werkzeuge des Vorstands (Eingang, Wer wird benachrichtigt,
// Rechte, Nachricht an alle). Alle Daten liegen bei Wix (Mitgliederkonten + CMS-Sammlungen).
// Mit ?demo läuft alles mit Beispieldaten im Speicher (Vorschau für den Vorstand).
// Wird mit esbuild zu assets/mitglieder.js gebündelt.
import { createClient, OAuthStrategy } from '@wix/sdk';
import * as items from '@wix/wix-data-items-sdk';
import * as members from '@wix/auto_sdk_members_members';
import { esc, D, WD, MONS, MONL } from './render.mjs';
import { RIGHTS, BOARD_TOPICS, GROUPS, VISIBILITY, evaluateSettings, canSee, groupLabels } from './lib/rights.mjs';
import { HELP_TOPICS, PLATFORMS, stepsFor, topicById, videoName, posterName, guessPlatform } from './lib/hilfe.mjs';
import * as FB from './lib/feedback.mjs';
import { BEREICHE as RAT_BEREICHE, bereichVon, gremiumVon } from './lib/rat.mjs';
import { makeDemoClient } from './demo.js';
import { makeNotizen, strokesToPng } from './notizen.js';
import { makeRueckblick } from './rueckblick.js';
import { makeFilm } from './film.js';
import { FILM_TEAM } from './lib/film.mjs';
import { makeRatsarbeit } from './ratsarbeit.js';
import { makeSchluessel } from './schluessel.js';
import { makeVorstand } from './vorstand.js';
import { makeVorstandMehr } from './vorstand-mehr.js';
import { makeStatistik } from './statistik.js';
import { makeMitreden, standSetzen } from './mitreden.js';
import { makeBereiche } from './bereiche.js';
import { stammtischConfig, istStammtisch, STAMMTISCH_DEFAULT } from './lib/stammtisch.mjs';

const SPD = window.SPD || {};
const CFG = (SPD.app = SPD.app || {});
const app = document.getElementById('mitglieder-app');
if (!app) throw new Error('Mitgliederbereich: Container fehlt');
const $ = (s, r = app) => r.querySelector(s);
const $$ = (s, r = app) => [...r.querySelectorAll(s)];
// Demo-Modus (?demo, Beispieldaten) ist der Vorführschalter für Brians Konto: auf localhost immer, sonst nur solange
// weber.soltau@gmail.com angemeldet ist (die Anmeldung setzt das Merkmal „spd-tester“, das Abmelden löscht es wieder).
// Alle anderen landen bei ?demo in der normalen Anmeldung; einen öffentlichen Demo-Link gibt es nicht.
const TESTER = ['weber.soltau@gmail.com'];
const istTester = () => { try { return /^(localhost|127\.0\.0\.1)$/.test(location.hostname) || localStorage.getItem('spd-tester') === '1'; } catch (e) { return false; } };
const demoGewuenscht = /[?&]demo\b/.test(location.search);
if (demoGewuenscht && !istTester()) location.replace(location.pathname + location.hash);
const DEMO = demoGewuenscht && istTester();
const VIDEO = /[?&]video\b/.test(location.search); // Aufnahme der Hilfevideos: ohne Vorschau-Hinweis
// Drei Demo-Rollen: Mitglied (keine Rollen, keine Rechte), Ratsmitglied (Rat + Fraktion, keine Vorstandsrechte), Vorstand (alles)
const DEMO_ROLLEN = [
  ['mitglied', 'Mitglied', 'Keine Rollen, keine Rechte – so sieht es für die meisten aus.'],
  ['rat', 'Ratsmitglied', 'Dazu Sitzungen und Ratsarbeit – aber ohne Vorstandsrechte: keine Umfragen, Termine oder Einstellungen anlegen.'],
  ['vorstand', 'Vorstand', 'Alles, mit Beispieldaten – auch Eingang, Rechte und Statistik.'],
];
const DEMO_ROLLE = !DEMO ? '' : (r => DEMO_ROLLEN.some(([k]) => k === r) ? r : VIDEO || /[?&]mitglied/.test(location.search) ? 'mitglied' : 'vorstand')((location.search.match(/[?&]demo=([a-z]+)/) || [])[1] || ''); // demo=rat gewinnt auch bei video
const demoName = r => (DEMO_ROLLEN.find(([k]) => k === r) || [])[1] || '';
const REDIRECT = location.origin + location.pathname.replace(/index\.html$/, '');
const BASE = SPD.base || '.';
const TOPICS = { news: 'Aktuelles (neue Beiträge)', termine: 'Termine (neu + Erinnerung am Vortag)', mitglieder: 'Mitglieder-Infos (Umfragen, Helferlisten, Mitfahrgesuche, Dokumente, Nachrichten)' };
const ORTE = ['Kernstadt', 'Ahlften', 'Brock', 'Deimern', 'Dittmern', 'Friedrichseck', 'Harber', 'Hötzingen', 'Leitzingen', 'Marbostel', 'Meinern', 'Mittelstendorf', 'Moide', 'Oeningen', 'Tetendorf', 'Wolterdingen', 'Woltem'];
const SECTIONS = [
  ['start', 'Start'], ['termine', 'Termine'], ['umfragen', 'Umfragen'], ['dokumente', 'Dokumente'],
  ['rat', 'Sitzungen'], ['versammlung', 'Versammlung'], ['wahlkampf', 'Wahlkampf'], ['planung', 'Jahresplan'], ['wissen', 'Wissen'], ['ideen', 'Ideen'],
  ['ratsarbeit', 'Ratsarbeit'], ['beitraege', 'Beiträge'], ['mitglieder', 'Mitglieder'], ['profil', 'Profil'], ['vorstand', 'Vorstand'], ['hilfe', 'Hilfe'],
];
const ORTE_TERMIN = ['Roter Bahnhof, Am Bahnhof 1t', 'Altes Rathaus', 'Alte Reithalle', 'Marktplatz', 'Online'];

// ---------- Speicher (nur dieses Gerät) ----------
const store = {
  get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ohne Speicher */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ohne Speicher */ } },
};
// Eingang (vom Service Worker befüllt, wenn Push-Nachrichten für den Vorstand eintreffen)
function idb() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('spd-app', 1);
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains('inbox')) db.createObjectStore('inbox', { keyPath: 'id' }); };
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
}
let demoInbox = [];
async function inboxAll() {
  if (DEMO) return demoInbox;
  try { const db = await idb(); return await new Promise((res, rej) => { const q = db.transaction('inbox').objectStore('inbox').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error); }); }
  catch (e) { return []; }
}
async function inboxPut(item) {
  if (DEMO) { const i = demoInbox.findIndex(x => x.id === item.id); if (i >= 0) demoInbox[i] = item; else demoInbox.push(item); return; }
  try { const db = await idb(); await new Promise((res, rej) => { const t = db.transaction('inbox', 'readwrite'); t.objectStore('inbox').put(item); t.oncomplete = res; t.onerror = () => rej(t.error); }); } catch (e) { /* egal */ }
}

// ---------- Wix-Client (oder Vorschau-Attrappe) ----------
const client = DEMO ? makeDemoClient(SPD, { rolle: DEMO_ROLLE }) : createClient({
  modules: { items, members },
  auth: OAuthStrategy({ clientId: CFG.clientId, tokens: store.get('spd-tokens') || undefined }),
});
if (DEMO) demoInbox = client.inbox;
const saveTokens = () => { if (!DEMO) store.set('spd-tokens', client.auth.getTokens()); };
// Im Demo-Modus sollen Bestellungen an den Overlay-Agenten trotzdem echt laufen: Brians echte Anmeldung liegt im Hintergrund
// (Tokens im Speicher). Liefert { db, me } mit echtem Wix-Client – oder null, wenn niemand echt angemeldet ist.
let echtCache = null;
async function echtesKonto() {
  if (!DEMO) return { db, me };
  if (echtCache) return echtCache;
  const tokens = store.get('spd-tokens'); if (!tokens) return null;
  try {
    const c = createClient({ modules: { items, members }, auth: OAuthStrategy({ clientId: CFG.clientId, tokens }) });
    const { member } = await c.members.getCurrentMember({ fieldsets: ['FULL'] });
    if (!member?._id) return null;
    const edb = {
      async list(col, { eq = {}, desc = null, limit = 100 } = {}) { let q = c.items.query(col); for (const [k, v] of Object.entries(eq)) q = q.eq(k, v); if (desc) q = q.descending(desc); return (await q.limit(limit).find()).items; },
      insert: (col, data) => c.items.insert(col, data), update: (col, item) => c.items.update(col, item),
    };
    const name = [member.contact?.firstName, member.contact?.lastName].filter(Boolean).join(' ') || member.profile?.nickname || member.loginEmail;
    echtCache = { db: edb, me: { id: member._id, name, email: member.loginEmail || '' } };
    return echtCache;
  } catch (e) { return null; }
}
const errText = e => e?.details?.applicationError?.description || e?.message || String(e);
const db = {
  // Wix erlaubt höchstens 1000 Einträge je Abfrage (WDE0077) – größere Wünsche holen wir seitenweise,
  // sonst kommt gar nichts zurück (das ließ Umfragen früher immer „0 Stimmen“ anzeigen).
  async list(col, { eq = {}, desc = null, asc = null, limit = 500 } = {}) {
    const bauen = () => { let q = client.items.query(col); for (const [k, v] of Object.entries(eq)) q = q.eq(k, v); if (desc) q = q.descending(desc); if (asc) q = q.ascending(asc); return q; };
    if (limit <= 1000) return (await bauen().limit(limit).find()).items;
    const alle = [];
    for (let seite = 0; alle.length < limit; seite++) {
      const teil = (await bauen().limit(1000).skip(seite * 1000).find()).items;
      alle.push(...teil);
      if (teil.length < 1000) break;
    }
    return alle.slice(0, limit);
  },
  insert: (col, data) => client.items.insert(col, data),
  update: (col, item) => client.items.update(col, item),
  remove: (col, id) => client.items.remove(col, id),
};

let me = null;          // { id, name, email, vorstand, rollen, can(right) }
let people = [];        // AppMitglieder
let settings = null;    // evaluateSettings(...)
let myProfile = null;   // eigenes Profil
let deferredInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; $('#install-btn')?.removeAttribute('hidden'); });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// ---------- Bausteine ----------
const view = html => { app.innerHTML = html; };
const msg = (el, text, kind = 'err') => { if (!el) return; el.hidden = !text; el.className = `note note-${kind}`; el.textContent = text || ''; };
const busy = (btn, on) => { if (!btn) return; btn.disabled = on; btn.classList.toggle('busy', on); };
const todayIso = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
const fmtDate = s => { if (!s) return ''; const x = D(s); return `${WD[x.getDay()]}, ${x.getDate()}. ${MONL[x.getMonth()]} ${x.getFullYear()}`; };
const fmtShort = s => { if (!s) return ''; const x = D(s); return `${WD[x.getDay()]} ${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.`; };
const fmtWhen = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr'; };
const nameOf = id => people.find(p => p.memberId === id)?.name || '–';
const rolesOf = p => { const g = groupLabels(settings, p.memberId); return (g.length ? g : (p.rollen || []).filter(r => !/^(mitglied|member)$/i.test(r))).join(', ') || 'Mitglied'; };
const dateBox = s => { const x = D(s); return `<div class="event-date"><b>${String(x.getDate()).padStart(2, '0')}</b><span>${WD[x.getDay()]} · ${MONS[x.getMonth()]}</span></div>`; };
const badge = t => `<span class="badge ${t === 'Öffentlich' || t === 'Rat' ? 'badge-off' : t === 'Mitglieder' || t === 'Vorstand' ? 'badge-mit' : ''}">${esc(t)}</span>`;
const nl2br = t => esc(t).replace(/\n/g, '<br>');
const linkOf = d => d.url || (d.datei && String(d.datei).startsWith('wix:document://') ? 'https://docs.wixstatic.com/ugd/' + String(d.datei).replace(/^wix:document:\/\/v1\/ugd\//, '').split('/')[0] : d.datei) || '';
const opt = (list, cur) => list.map(o => `<option${o === cur ? ' selected' : ''}>${esc(o)}</option>`).join('');
// WhatsApp: Text vorbereiten, Gruppe wählt man in WhatsApp selbst (eine offizielle Schnittstelle in Gruppen gibt es nicht)
const WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 12 12 0 0 0 4.6 4.1c1.7.7 2.4.8 3.2.7a2.8 2.8 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';
const waHref = text => 'https://wa.me/?text=' + encodeURIComponent(text);
// Teilen: öffnet das Teilen-Menü des Geräts (WhatsApp, Signal, E-Mail, Kopieren … – was installiert ist); ohne Teilen-Menü
// (mancher PC-Browser) ein eigenes kleines Blatt mit WhatsApp, E-Mail und Kopieren. Der Text endet mit dem Link in die App.
const SHARE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>';
const shareBtn = (text, label = 'Teilen') => `<button type="button" class="btn btn-line btn-sm share" data-share="${esc(text)}" title="Teilen – WhatsApp, E-Mail, kopieren …">${SHARE_ICON}${esc(label)}</button>`;
const waBtn = shareBtn;
async function shareText(text) {
  const m = String(text).match(/https?:\/\/\S+\s*$/); const url = m ? m[0].trim() : ''; const body = m ? text.slice(0, m.index).trim() : text;
  if (navigator.share) { try { await navigator.share(url ? { title: 'SPD Soltau', text: body, url } : { title: 'SPD Soltau', text: body }); } catch (e) { /* abgebrochen */ } return; }
  document.getElementById('share-blatt')?.remove();
  const el = document.createElement('div'); el.className = 'rz-blatt'; el.id = 'share-blatt';
  el.innerHTML = `<div class="rz-blatt-in" role="dialog" aria-label="Teilen"><div class="rz-blatt-kopf"><b>Teilen</b><button type="button" class="mb-sheet-close" data-zu aria-label="Schließen">${ICON.close}</button></div>
    <div class="rz-blatt-inhalt"><p class="small muted">Dieser Browser hat kein Teilen-Menü – so geht es trotzdem:</p>
    <div class="share-opt"><a class="btn btn-line wa" href="${esc(waHref(text))}" target="_blank" rel="noopener">${WA_ICON}WhatsApp</a><a class="btn btn-line" href="mailto:?subject=${encodeURIComponent('SPD Soltau')}&body=${encodeURIComponent(text)}">${ICON.inbox}E-Mail</a><button type="button" class="btn btn-schwarz" data-copy-text>${ICON.doc}Text kopieren</button></div>
    <p class="note" id="share-msg" hidden></p><pre class="share-text">${esc(text)}</pre></div></div>`;
  document.body.appendChild(el); document.body.classList.add('sheet-open');
  el.addEventListener('click', async e => {
    if (e.target === el || e.target.closest('[data-zu]')) { el.remove(); document.body.classList.remove('sheet-open'); return; }
    if (e.target.closest('[data-copy-text]')) { try { await navigator.clipboard.writeText(text); msg(el.querySelector('#share-msg'), 'Kopiert – jetzt einfügen, wo du willst.', 'ok'); } catch (err) { msg(el.querySelector('#share-msg'), 'Kopieren nicht möglich – Text unten markieren und kopieren.'); } }
  });
}
document.addEventListener('click', e => { const b = e.target.closest('button[data-share]'); if (b) shareText(b.dataset.share); });
const appLink = hash => new URL(location.pathname + hash, location.href).href;
const orteList = () => { if (!document.getElementById('orte')) { const dl = document.createElement('datalist'); dl.id = 'orte'; dl.innerHTML = ORTE.map(o => `<option value="${esc(o)}">`).join(''); document.body.appendChild(dl); } };

// ===== Anmeldung / Registrierung =====
// Anmeldebildschirm: keine App-Leiste, kein Initialen-Knopf – zur Website geht es über den Globus im Kopf
function authBar() {
  document.querySelectorAll('.mb-tabbar,.mb-sheet').forEach(el => el.remove());
  document.body.classList.remove('has-tabbar', 'sheet-open');
  const meBtn = document.getElementById('app-me'); if (meBtn) meBtn.hidden = true;
  try { localStorage.removeItem('spd-me'); } catch (e) { /* egal */ }
}
function renderAuth(tab = 'login', hint = '') {
  authBar();
  view(`
  <div class="mb-grid">
    <div class="mb-card">
      <div class="mb-tabs" role="tablist">
        <button type="button" class="chip" data-tab="login" aria-pressed="${tab === 'login'}">Anmelden</button>
        <button type="button" class="chip" data-tab="register" aria-pressed="${tab === 'register'}">Registrieren</button>
      </div>
      ${hint ? `<p class="note note-ok">${esc(hint)}</p>` : ''}
      <form class="form mb-form" id="f-login" ${tab === 'login' ? '' : 'hidden'} novalidate>
        <div class="field"><label for="l-mail">E-Mail-Adresse</label><input id="l-mail" type="email" autocomplete="username" required inputmode="email"></div>
        <div class="field"><label for="l-pw">Passwort</label><input id="l-pw" type="password" autocomplete="current-password" required minlength="4"></div>
        <p class="note" id="l-msg" hidden></p>
        <div class="mb-actions"><button class="btn btn-rot" type="submit">Anmelden</button><button class="btn btn-line" type="button" id="l-reset">Passwort vergessen</button></div>
      </form>
      <form class="form mb-form" id="f-register" ${tab === 'register' ? '' : 'hidden'} novalidate>
        <p class="small muted">Nur für Mitglieder der SPD Soltau. Nach der Registrierung bestätigst du deine E-Mail-Adresse, danach schaltet dich der Vorstand frei.</p>
        <div class="mb-2">
          <div class="field"><label for="r-vn">Vorname</label><input id="r-vn" type="text" autocomplete="given-name" required></div>
          <div class="field"><label for="r-nn">Nachname</label><input id="r-nn" type="text" autocomplete="family-name" required></div>
        </div>
        <div class="field"><label for="r-mail">E-Mail-Adresse</label><input id="r-mail" type="email" autocomplete="email" required inputmode="email"></div>
        <div class="field"><label for="r-pw">Passwort (mindestens 8 Zeichen)</label><input id="r-pw" type="password" autocomplete="new-password" required minlength="8"></div>
        <div class="field"><label for="r-pw2">Passwort wiederholen</label><input id="r-pw2" type="password" autocomplete="new-password" required minlength="8"></div>
        <label class="check"><input type="checkbox" id="r-ds" required> <span>Ich habe die <a href="${esc(BASE)}/datenschutz/">Datenschutzhinweise</a> gelesen. Meine Daten werden im Mitgliederkonto bei Wix gespeichert.</span></label>
        <div id="captcha-box" class="captcha-box" hidden></div>
        <p class="note" id="r-msg" hidden></p>
        <div class="mb-actions"><button class="btn btn-rot" type="submit">Registrieren</button></div>
      </form>
      <form class="form mb-form" id="f-reset" hidden novalidate>
        <p class="small muted">Wir schicken dir eine E-Mail mit einem Link, über den du ein neues Passwort setzen kannst.</p>
        <div class="field"><label for="p-mail">E-Mail-Adresse</label><input id="p-mail" type="email" autocomplete="username" required inputmode="email"></div>
        <p class="note" id="p-msg" hidden></p>
        <div class="mb-actions"><button class="btn btn-rot" type="submit">Link schicken</button><button class="btn btn-line" type="button" id="p-back">Zurück</button></div>
      </form>
      ${istTester() ? '<p class="small muted"><a href="?demo">Demo-Modus öffnen (Beispieldaten)</a></p>' : ''}
      <p class="small"><a class="btn btn-line btn-sm" href="${esc(BASE)}/anmelden-hilfe/">Hilfe: Anmelden &amp; Registrieren (Video)</a></p>
    </div>
    <div class="mb-aside">
      ${pushCard(false)}
      ${installCard()}
    </div>
  </div>`);
  $$('.mb-tabs .chip').forEach(b => b.addEventListener('click', () => {
    $$('.mb-tabs .chip').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    $('#f-login').hidden = b.dataset.tab !== 'login'; $('#f-register').hidden = b.dataset.tab !== 'register'; $('#f-reset').hidden = true;
  }));
  $('#l-reset').addEventListener('click', () => { $('#f-login').hidden = true; $('#f-reset').hidden = false; $('#p-mail').value = $('#l-mail').value; });
  $('#p-back').addEventListener('click', () => { $('#f-reset').hidden = true; $('#f-login').hidden = false; });
  $('#f-login').addEventListener('submit', onLogin);
  $('#f-register').addEventListener('submit', onRegister);
  $('#f-reset').addEventListener('submit', onReset);
  wirePush(); wireInstall();
}

async function onLogin(e) {
  e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
  const btn = f.querySelector('[type=submit]'); busy(btn, true); msg($('#l-msg'), '');
  if (DEMO) { await new Promise(r => setTimeout(r, 600)); location.hash = '#start'; await enterApp(); return; }
  try {
    const res = await client.auth.login({ email: $('#l-mail').value.trim(), password: $('#l-pw').value });
    await handleAuthState(res, 'login');
  } catch (err) { msg($('#l-msg'), 'Anmeldung nicht möglich: ' + errText(err)); }
  busy(btn, false);
}
async function onRegister(e) {
  e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
  if ($('#r-pw').value !== $('#r-pw2').value) { msg($('#r-msg'), 'Die Passwörter stimmen nicht überein.'); return; }
  const btn = f.querySelector('[type=submit]'); busy(btn, true); msg($('#r-msg'), '');
  if (DEMO) { await new Promise(r => setTimeout(r, 600)); renderVerify({ demo: true }); return; }
  const vn = $('#r-vn').value.trim(), nn = $('#r-nn').value.trim();
  const params = { email: $('#r-mail').value.trim(), password: $('#r-pw').value, profile: { firstName: vn, lastName: nn, nickname: `${vn} ${nn}`.trim(), privacyStatus: 'PRIVATE' } };
  try {
    let res = await client.auth.register(params);
    // Wix verlangt je nach Einstellung eine reCAPTCHA-Prüfung (Google-Skript wird nur dann geladen)
    if (needsCaptcha(res)) {
      msg($('#r-msg'), 'Bitte bestätige noch kurz, dass du kein Roboter bist.', 'info');
      const tokens = await captchaTokens(res);
      res = await client.auth.register({ ...params, captchaTokens: tokens });
    }
    await handleAuthState(res, 'register');
  } catch (err) { msg($('#r-msg'), 'Registrierung nicht möglich: ' + errText(err)); }
  busy(btn, false);
}
async function onReset(e) {
  e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
  const btn = f.querySelector('[type=submit]'); busy(btn, true); msg($('#p-msg'), '');
  try { await client.auth.sendPasswordResetEmail($('#p-mail').value.trim(), REDIRECT); msg($('#p-msg'), 'E-Mail ist unterwegs. Bitte Posteingang (und Spam-Ordner) prüfen.', 'ok'); }
  catch (err) { msg($('#p-msg'), 'Das hat nicht geklappt: ' + errText(err)); }
  busy(btn, false);
}
const needsCaptcha = res => res.loginState === 'USER_CAPTCHA_REQUIRED' || res.loginState === 'SILENT_CAPTCHA_REQUIRED' || (res.loginState === 'FAILURE' && (res.errorCode === 'missingCaptchaToken' || res.errorCode === 'invalidCaptchaToken'));
function loadRecaptcha() {
  if (window.grecaptcha?.enterprise) return Promise.resolve();
  return new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'https://www.google.com/recaptcha/enterprise.js?render=explicit&hl=de'; s.async = true;
    s.onload = () => window.grecaptcha.enterprise.ready(res); s.onerror = () => rej(new Error('reCAPTCHA konnte nicht geladen werden')); document.head.appendChild(s);
  });
}
async function captchaTokens(res) {
  await loadRecaptcha();
  const box = $('#captcha-box'); box.hidden = false; box.innerHTML = '';
  const silent = res.loginState === 'SILENT_CAPTCHA_REQUIRED';
  const el = document.createElement('div'); box.appendChild(el);
  return new Promise((resolve, reject) => {
    const id = window.grecaptcha.enterprise.render(el, {
      sitekey: silent ? client.auth.captchaInvisibleSiteKey : client.auth.captchaVisibleSiteKey, size: silent ? 'invisible' : 'normal',
      callback: token => { box.hidden = true; resolve(silent ? { invisibleRecaptchaToken: token } : { recaptchaToken: token }); },
      'error-callback': () => reject(new Error('reCAPTCHA-Fehler')), 'expired-callback': () => reject(new Error('reCAPTCHA abgelaufen, bitte erneut versuchen')),
    });
    if (silent) window.grecaptcha.enterprise.execute(id);
  });
}
async function handleAuthState(res, mode) {
  const target = mode === 'login' ? $('#l-msg') : mode === 'register' ? $('#r-msg') : $('#v-msg');
  switch (res.loginState) {
    case 'SUCCESS': return finishLogin(res.data.sessionToken);
    case 'EMAIL_VERIFICATION_REQUIRED': return renderVerify(res);
    case 'OWNER_APPROVAL_REQUIRED': return renderPending();
    case 'FAILURE': {
      const t = { invalidEmail: mode === 'login' ? 'Kein Konto mit dieser E-Mail-Adresse – oder es ist noch nicht vom Vorstand freigeschaltet.' : 'Diese E-Mail-Adresse ist ungültig.', invalidPassword: 'Das Passwort ist falsch.', emailAlreadyExists: 'Für diese E-Mail-Adresse gibt es schon ein Konto. Bitte anmelden oder Passwort zurücksetzen.', resetPassword: 'Bitte setze dein Passwort zurück („Passwort vergessen“).', missingCaptchaToken: 'Bitte die Roboter-Prüfung abschließen.', invalidCaptchaToken: 'Die Roboter-Prüfung ist fehlgeschlagen. Bitte noch einmal.' }[res.errorCode];
      msg(target, t || ('Fehler: ' + (res.error || 'unbekannt'))); return;
    }
    default: msg(target, 'Unerwarteter Status: ' + res.loginState);
  }
}
function renderVerify(state) {
  view(`
  <div class="mb-card mb-narrow">
    <span class="tag">Schritt 2 von 3</span>
    <h2 class="title">E-Mail bestätigen</h2>
    <p>Wir haben dir einen sechsstelligen Code geschickt. Bitte trage ihn hier ein.</p>
    <form class="form mb-form" id="f-verify" novalidate>
      <div class="field"><label for="v-code">Bestätigungscode</label><input id="v-code" type="text" inputmode="numeric" autocomplete="one-time-code" required minlength="4" maxlength="8"></div>
      <p class="note" id="v-msg" hidden></p>
      <div class="mb-actions"><button class="btn btn-rot" type="submit">Bestätigen</button></div>
    </form>
  </div>`);
  $('#v-code').focus();
  $('#f-verify').addEventListener('submit', async e => {
    e.preventDefault(); const btn = e.target.querySelector('[type=submit]'); busy(btn, true); msg($('#v-msg'), '');
    if (DEMO) { await new Promise(r => setTimeout(r, 600)); renderPending(); return; }
    try { const res = await client.auth.processVerification({ verificationCode: $('#v-code').value.trim() }, state); await handleAuthState(res, 'verify'); }
    catch (err) { msg($('#v-msg'), 'Code nicht akzeptiert: ' + errText(err)); }
    busy(btn, false);
  });
}
function renderPending() {
  view(`
  <div class="mb-card mb-narrow">
    <span class="tag">Fast geschafft</span>
    <h2 class="title">Der Vorstand schaltet dich frei</h2>
    <p>Deine Registrierung ist eingegangen. Ein Vorstandsmitglied prüft, dass du Mitglied der SPD Soltau bist, und schaltet dein Konto frei – du bekommst dann eine E-Mail und kannst dich anmelden.</p>
    <p class="small muted">Das dauert in der Regel nicht lange. Bei Fragen: <a href="${esc(BASE)}/kontakt/">Kontakt</a>.</p>
    <div class="mb-actions"><button class="btn btn-line" type="button" id="pending-back">Zur Anmeldung</button></div>
  </div>`);
  $('#pending-back').addEventListener('click', () => renderAuth('login'));
}
// Sitzung abschließen: Wix leitet einmal über seine Autorisierungsseite und zurück (funktioniert auch auf dem Handy)
async function finishLogin(sessionToken) {
  const oauthData = client.auth.generateOAuthData(REDIRECT, REDIRECT);
  store.set('spd-oauth', oauthData);
  // Ziel merken (z. B. geteilter Link zu einer Helferliste) – die Weiterleitung über Wix verliert den #-Teil
  if (location.hash && !/^#(registrieren|start)?$/.test(location.hash)) store.set('spd-return', location.hash);
  const { authUrl } = await client.auth.getAuthUrl(oauthData, { prompt: 'none', responseMode: 'query', sessionToken });
  location.href = authUrl;
}
async function completeRedirect() {
  const q = new URL(location.href).searchParams;
  if (!q.get('code') && !q.get('error')) return false;
  const oauthData = store.get('spd-oauth');
  history.replaceState(null, '', REDIRECT + (location.hash || ''));
  if (q.get('error')) { renderAuth('login'); msg($('#l-msg'), 'Anmeldung abgebrochen: ' + (q.get('errorDescription') || q.get('error'))); return true; }
  if (!oauthData) { renderAuth('login'); msg($('#l-msg'), 'Die Anmeldung konnte nicht abgeschlossen werden (Sitzungsdaten fehlen). Bitte noch einmal anmelden.'); return true; }
  try { const tokens = await client.auth.getMemberTokens(q.get('code'), q.get('state'), oauthData); client.auth.setTokens(tokens); saveTokens(); store.del('spd-oauth'); }
  catch (err) { renderAuth('login'); msg($('#l-msg'), 'Anmeldung fehlgeschlagen: ' + errText(err)); return true; }
  const back = store.get('spd-return'); if (back) { store.del('spd-return'); history.replaceState(null, '', REDIRECT + back); }
  return false;
}
async function logout() {
  if (DEMO) { location.href = REDIRECT; return; }
  let logoutUrl = null;
  try { ({ logoutUrl } = await client.auth.logout(REDIRECT)); } catch (e) { /* lokal abmelden reicht */ }
  store.del('spd-tokens'); store.del('spd-oauth'); store.del('spd-me');
  try { localStorage.removeItem('spd-tester'); } catch (e) { /* ohne Speicher */ }
  location.href = logoutUrl || REDIRECT;
}

// ===== Mitgliederbereich =====
async function loadMe() {
  const { member } = await client.members.getCurrentMember({ fieldsets: ['FULL'] });
  const c = member.contact || {}, p = member.profile || {};
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || p.nickname || member.loginEmail;
  me = { id: member._id, name, email: member.loginEmail, rollen: [], vorstand: false, can: r => !!settings?.rights[r]?.has(me.id), sees: k => canSee(settings, me.id, k) };
  try { if (TESTER.includes(String(member.loginEmail || '').toLowerCase())) localStorage.setItem('spd-tester', '1'); else localStorage.removeItem('spd-tester'); } catch (e) { /* ohne Speicher */ }
  await loadSettings();
  const mine = people.find(x => x.memberId === me.id);
  if (mine) { me.rollen = mine.rollen || []; me.vorstand = !!mine.vorstand; if (mine.name) me.name = mine.name; }
  try { myProfile = (await db.list('Profile', { eq: { memberId: me.id }, limit: 1 }))[0] || null; } catch (e) { myProfile = null; }
  return me;
}
async function loadSettings() {
  try { people = (await db.list('AppMitglieder')).filter(p => p.memberId).sort((a, b) => (b.vorstand ? 1 : 0) - (a.vorstand ? 1 : 0) || String(a.name).localeCompare(String(b.name), 'de')); } catch (e) { people = []; }
  let snaps = [];
  try { snaps = await db.list('Benachrichtigungen', { desc: '_createdDate' }); } catch (e) { snaps = []; }
  settings = evaluateSettings(snaps, people);
}
const anyRight = () => RIGHTS.some(([k]) => me.can(k));
const inFraktion = () => !!settings?.groups.fraktion.has(me.id); // Ratsarbeit: nur die Gruppe Fraktion (Vorstand → Gruppen), nicht der Vorstand als solcher
const SEC_VIS = { umfragen: 'umfragen', dokumente: 'dokumente', rat: 'rat', mitglieder: 'mitglieder', versammlung: 'versammlung', wahlkampf: 'wahlkampf' };
const secVisible = k => {
  if (k === 'hilfe') return true;
  if (k === 'filmdreh') return istFilmTeam();
  if (k === 'ratsarbeit') return inFraktion();
  if (k === 'vorstand') return anyRight();
  if (k === 'beitraege') return me.can('beitraege');
  if (k === 'wahlkampf') return me.can('wahlkampf') || me.sees('wahlkampf');
  return !SEC_VIS[k] || me.sees(SEC_VIS[k]);
};
// Sammel-Bereiche: mehrere Bereiche unter einem Menüpunkt, oben im Inhalt als Reiter – so bleibt das Menü kurz, alle Links (#umfragen, #versammlung …) gelten weiter
const HUBS = {
  mitmachen: { label: 'Mitmachen', tabs: [['umfragen', 'Umfragen', '#umfragen'], ['ideen', 'Ideen', '#ideen'], ['versammlung', 'Versammlungen', '#versammlung'], ['wahlkampf', 'Wahlkampf', '#wahlkampf']] },
  wissen: { label: 'Dokumente & Wissen', tabs: [['dokumente', 'Dokumente', '#dokumente'], ['grundwissen', 'Grundwissen', '#wissen/grundwissen'], ['wissen', 'Suche', '#wissen']] },
};
const HUB_OF = { umfragen: 'mitmachen', ideen: 'mitmachen', versammlung: 'mitmachen', wahlkampf: 'mitmachen', dokumente: 'wissen', wissen: 'wissen' };
const hubTabs = h => HUBS[h].tabs.filter(([k]) => secVisible(k === 'grundwissen' ? 'wissen' : k));
const hubHome = h => hubTabs(h)[0]?.[2] || '#start';
function hubStrip(key) {
  document.getElementById('mb-hub')?.remove();
  const h = HUB_OF[key]; if (!h) return;
  const tabs = hubTabs(h); if (tabs.length < 2) return;
  const sub = location.hash.split('/')[1] || '';
  const active = key === 'wissen' && (sub === 'grundwissen' || sub.startsWith('g-')) ? 'grundwissen' : key;
  const el = document.createElement('nav'); el.id = 'mb-hub'; el.className = 'mb-hub'; el.setAttribute('aria-label', HUBS[h].label);
  el.innerHTML = `<span class="mb-hub-name">${HUBS[h].label}</span>${tabs.map(([k, l, href]) => `<a class="chip" href="${href}" ${k === active ? 'aria-current="page"' : ''}>${l}</a>`).join('')}`;
  $('#mb-view')?.before(el);
}
const visibleEvents = () => (SPD.events || []).filter(ev => me.sees('termine:' + (ev.typ || 'Öffentlich')));

const ICON = {
  web: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z"/></svg>',
  hand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 13V4.5a1.5 1.5 0 0 1 3 0V12M11 5.5v-2a1.5 1.5 0 1 1 3 0V12M14 5.5a1.5 1.5 0 0 1 3 0V12M17 7.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-2a6 6 0 0 1-5-2.7L3.7 14a1.5 1.5 0 0 1 .5-2 1.9 1.9 0 0 1 2.3.3L8 13.7"/></svg>',
  cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  poll: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
  chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 6-7"/></svg>',
  film: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20M2 15h20M7 4v16M17 4v16"/></svg>',
  flask: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2.2h12.4a1.5 1.5 0 0 0 1.3-2.2L14 9V3"/><path d="M7 15h10"/></svg>',
  doc: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8"/></svg>',
  rat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l10 5H2z"/></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/><circle cx="5" cy="12" r="1.2"/></svg>',
  out: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
  tasks: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M8 13l3 3 5-6"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>',
  chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6"/></svg>',
  list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>',
  idea: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>',
  vote: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16v8H4zM8 12V5h8v7M10 8l1.5 1.5L14.5 6"/></svg>',
  flag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
};
// Gruppierte Bereichsliste – am PC als Seitenleiste, am Handy im „Mehr“-Blatt
// Für alle: fünf Einträge. Arbeitsbereiche nur für die, die sie brauchen (Rat/Fraktion, Vorstand und Rechte). Jahresplan-Aufgaben erreichen Zuständige über die Startseite.
function navGroups() {
  const sec = (k, l, icon, ok = secVisible(k), href = '#' + k) => ok ? [k, l, icon, href] : null;
  const vorstand = !!settings?.board.has(me.id);
  return [
    ['Für alle', [sec('start', 'Start', ICON.home), sec('termine', 'Termine', ICON.cal), sec('mitmachen', 'Mitmachen', ICON.hand, true, hubHome('mitmachen')), sec('wissen', 'Dokumente & Wissen', ICON.doc, true, hubHome('wissen')), sec('mitglieder', 'Mitglieder', ICON.users)]],
    ['Rat & Fraktion', [sec('rat', 'Sitzungen', ICON.rat), sec('ratsarbeit', 'Ratsarbeit', ICON.tasks)]],
    ['Organisation', [sec('vorstand', 'Vorstand', ICON.inbox), sec('planung', 'Jahresplan', ICON.list, vorstand || me.can('planung')), sec('beitraege', 'Beiträge schreiben', ICON.edit), sec('filmdreh', 'Filmdreh', ICON.film), sec('filmdreh', 'Baustein-Werkstatt', ICON.play, secVisible('filmdreh'), '#filmdreh/werkstatt')]],
    ['Persönlich', [sec('profil', 'Mein Profil', ICON.user), sec('hilfe', 'Hilfe & Anleitungen', ICON.help), sec('feedback', 'Wünsche zur App', ICON.idea), istTester() ? ['demo', DEMO ? 'Demo: ' + demoName(DEMO_ROLLE) : 'Demo-Modus', ICON.flask, '#demo'] : null]],
  ].map(([t, items]) => [t, items.filter(Boolean)]).filter(([, items]) => items.length);
}
// Demo-Modus per Schalter (nur Tester): Seite mit der gewünschten Rolle (oder ohne ?demo) neu laden, aktueller Bereich bleibt
const demoLink = rolle => REDIRECT + (rolle ? '?demo=' + rolle : '') + (location.hash && !/^#(anmelden|registrieren|demo)$/.test(location.hash) ? location.hash : '#start');
const baldLink = test => new URL(`${BASE}/bald/?test=${test}`, location.href).href;
// Auswahlblatt: Rolle wählen, Demo beenden, Countdown-Testansichten
function demoBlatt() {
  blatt('Demo-Modus', `<p class="small muted">Vorführung mit Beispieldaten – nichts wird gespeichert. ${DEMO ? `Gerade: <b>${esc(demoName(DEMO_ROLLE))}</b>.` : 'Gerade: <b>aus</b>, du siehst deine echten Daten.'}</p>
    <div class="demo-rollen">${DEMO_ROLLEN.map(([k, n, t]) => `<a class="demo-rolle${DEMO && DEMO_ROLLE === k ? ' aktiv' : ''}" href="${esc(demoLink(k))}"><b>Als ${n}</b><span>${t}</span></a>`).join('')}
    ${DEMO ? `<a class="demo-rolle ende" href="${esc(demoLink(''))}"><b>Demo beenden</b><span>Zurück zu deinen echten Daten.</span></a>` : ''}</div>
    <h4 class="doc-cat demo-test-kopf">Countdown testen</h4>
    <div class="mb-actions"><a class="btn btn-line btn-sm" href="${esc(baldLink(10))}" target="_blank" rel="noopener">Letzte 10 Sekunden</a><a class="btn btn-line btn-sm" href="${esc(baldLink('ende'))}" target="_blank" rel="noopener">Nach dem Start</a></div>
    <p class="small muted">Öffnet sich in einem neuen Tab. Das Gerät merkt sich den Testbesuch nicht – am Dienstag siehst du die echte Willkommensseite.</p>`);
}
function navList() {
  return `${navGroups().map(([title, items]) => `<div class="mb-group"><div class="mb-group-title">${title}</div>${items.map(([k, l, icon, href]) => `<a href="${href}" data-sec="${k}">${icon}<span>${l}</span><b class="mb-badge" data-badge="${k}" hidden></b></a>`).join('')}</div>`).join('')}
  <button type="button" class="mb-logout" data-logout>${ICON.out}<span>Abmelden</span></button>`;
}
function renderShell() {
  const first = me.name.split(' ')[0] || me.name;
  view(`
  ${DEMO && !VIDEO ? `<p class="note note-info demo-note"><b>Demo-Modus – als ${esc(demoName(DEMO_ROLLE))}.</b> Beispieldaten, nichts wird gespeichert. <a href="#demo">Rolle wechseln</a> · <a href="${esc(demoLink(''))}">Demo beenden</a></p>` : ''}
  <div class="mb-layout">
    <aside class="mb-side" aria-label="Bereiche">${navList()}</aside>
    <div class="mb-main">
      <div class="mb-head">
        <div><span class="tag">Angemeldet</span><h2 class="title">Moin, ${esc(first)}!</h2><p class="muted small">${esc(me.email)} · ${esc(rolesOf({ memberId: me.id, rollen: me.rollen }))}</p></div>
      </div>
      <div id="mb-view" class="mb-view"></div>
    </div>
  </div>`);
  // App-Leiste und „Mehr“-Blatt hängen direkt am body (feste Position, unabhängig von Animationen der Seite)
  document.querySelectorAll('.mb-tabbar,.mb-sheet').forEach(el => el.remove());
  // Initialen im App-Kopf (führt zum Profil)
  const meBtn = document.getElementById('app-me');
  if (meBtn) { meBtn.textContent = me.name.split(/\s+/).map(x => x[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '·'; meBtn.hidden = false; meBtn.title = `${me.name} – Mein Profil`; }
  try { localStorage.setItem('spd-me', JSON.stringify({ name: me.name })); } catch (e) { /* egal */ }
  const fourth = anyRight() ? ['vorstand', 'Vorstand', ICON.inbox, '#vorstand'] : inFraktion() ? ['ratsarbeit', 'Ratsarbeit', ICON.tasks, '#ratsarbeit'] : ['wissen', 'Wissen', ICON.doc, hubHome('wissen')];
  const bar = document.createElement('nav'); bar.className = 'mb-tabbar'; bar.setAttribute('aria-label', 'App-Leiste');
  bar.innerHTML = `
    <a href="#start" data-tab="start">${ICON.home}<span>Start</span></a>
    <a href="#termine" data-tab="termine">${ICON.cal}<span>Termine</span></a>
    <a href="${hubHome('mitmachen')}" data-tab="mitmachen">${ICON.hand}<span>Mitmachen</span></a>
    <a href="${fourth[3]}" data-tab="${fourth[0]}">${fourth[2]}<span>${fourth[1]}</span>${fourth[0] === 'vorstand' || fourth[0] === 'ratsarbeit' ? `<b class="mb-badge" data-badge="${fourth[0]}" hidden></b>` : ''}</a>
    <button type="button" data-tab="mehr" id="mb-more" aria-expanded="false" aria-controls="mb-sheet">${ICON.more}<span>Mehr</span></button>`;
  const sheet = document.createElement('div'); sheet.className = 'mb-sheet'; sheet.id = 'mb-sheet'; sheet.hidden = true;
  sheet.innerHTML = `<div class="mb-sheet-panel" role="dialog" aria-label="Weitere Bereiche"><div class="mb-sheet-head"><b>Bereiche</b><button type="button" class="mb-sheet-close" aria-label="Schließen">${ICON.close}</button></div><nav class="mb-sheet-nav">${navList()}</nav></div>`;
  document.body.append(bar, sheet);
  document.body.classList.add('has-tabbar');
  const toggleSheet = open => { sheet.hidden = !open; $('#mb-more', bar).setAttribute('aria-expanded', String(open)); document.body.classList.toggle('sheet-open', open); };
  $('#mb-more', bar).addEventListener('click', () => toggleSheet(sheet.hidden));
  sheet.addEventListener('click', e => { if (e.target === sheet || e.target.closest('.mb-sheet-close') || e.target.closest('a')) toggleSheet(false); });
  document.querySelectorAll('[data-logout]').forEach(b => b.addEventListener('click', logout));
  updateBadges();
}
// Zähler: offene Vorgänge im Eingang (Vorstand), meine offenen Aufgaben (Ratsarbeit)
async function updateBadges() {
  const setBadge = (key, n) => document.querySelectorAll(`[data-badge="${key}"]`).forEach(b => { b.textContent = n > 99 ? '99+' : String(n); b.hidden = !n; });
  if (me.can('freigaben')) setBadge('vorstand', await vorstand.badge());
  if (inFraktion()) setBadge('ratsarbeit', await ratsarbeit.badge());
}
const RENDER = { start: secStart, termine: secTermine, umfragen: secUmfragen, dokumente: secDokumente, rat: secRat, ratsarbeit: v => ratsarbeit.sec(v), beitraege: secBeitraege, mitglieder: secMitglieder, profil: secProfil, vorstand: v => vorstand.sec(v), hilfe: secHilfe, feedback: secFeedback, filmdreh: v => film.sec(v),
  versammlung: v => bereiche.versammlung(v), wahlkampf: v => bereiche.wahlkampf(v), wissen: v => bereiche.wissen(v), planung: v => bereiche.planung(v), ideen: v => bereiche.ideen(v) };
async function route() {
  let key = (location.hash || '#start').slice(1).split('/')[0];
  if (['eingang', 'anliegen', 'wer', 'nachricht', 'rechte'].includes(key)) key = 'vorstand';
  if (key === 'push' || key === 'app-install') key = 'profil';
  if (key === 'mehr') { key = 'start'; $('#mb-more', document.body)?.click(); }
  if (key === 'demo') { const zurueck = route.lastKey || 'start'; history.replaceState(null, '', location.pathname + location.search + '#' + zurueck); if (istTester()) demoBlatt(); if (route.lastKey) return; key = zurueck; }
  if (!RENDER[key] || !secVisible(key)) key = 'start';
  if (key !== 'ratsarbeit') ratsarbeit.blattZu(false);
  if (document.body.classList.contains('fokus-modus') && !(key === 'rat' && /^#rat\/fokus-/.test(location.hash)) && !(key === 'filmdreh' && /^#filmdreh\/dreh-/.test(location.hash))) fokusEnde();
  const navKey = HUB_OF[key] || key;
  document.querySelectorAll('.mb-side a[data-sec],.mb-sheet a[data-sec]').forEach(a => { if (a.dataset.sec === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.querySelectorAll('.mb-tabbar [data-tab]').forEach(a => { if (a.dataset.tab === navKey) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  // Beim Wechsel des Bereichs nach oben zum Inhalt – bei Aktionen innerhalb eines Bereichs (Zusage, Helferliste …) bleibt die Scrollposition
  if (route.lastKey !== key) window.scrollTo({ top: Math.min(window.scrollY, (document.querySelector('.mb-main')?.getBoundingClientRect().top || 0) + window.scrollY - 80), behavior: 'auto' });
  route.lastKey = key;
  let v = $('#mb-view'); if (!v) return;
  const fresh = document.createElement('div'); fresh.id = 'mb-view'; fresh.className = v.className; v.replaceWith(fresh); v = fresh;
  hubStrip(key);
  v.innerHTML = '<p class="muted">Lade …</p>';
  try { await RENDER[key](v); } catch (err) { v.innerHTML = `<p class="note note-err">Das konnte nicht geladen werden: ${esc(errText(err))}</p>`; }
  const sub = location.hash.split('/')[1]; if (sub && key !== 'vorstand' && key !== 'ratsarbeit') document.getElementById(sub)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const sectionHead = (title, extra = '') => `<div class="section-head"><h3 class="title">${title}</h3>${extra ? `<span class="muted small">${extra}</span>` : ''}</div>`;

// ---------- Wünsche & Ideen zur App: Vorauswahl + Text → Sammlung Feedback → der Push-Dienst mailt sie an den Betreuer ----------
const geraetKurz = () => {
  const ua = navigator.userAgent;
  const sys = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac/i.test(ua) ? 'Mac' : /Linux/i.test(ua) ? 'Linux' : 'Gerät';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const app = matchMedia('(display-mode: standalone)').matches || navigator.standalone ? 'als App installiert' : 'im Browser';
  return `${sys} · ${br} · ${innerWidth}×${innerHeight} · ${app}`;
};
async function secFeedback(v) {
  const eigene = await db.list('Feedback', { eq: { memberId: me.id }, desc: '_createdDate', limit: 20 }).catch(() => []);
  const chips = (name, list, cur) => list.map(([k, l]) => `<button type="button" class="chip" data-fb="${name}" data-v="${k}" aria-pressed="${k === cur}">${esc(l)}</button>`).join('');
  const statusText = f => f.status === 'zugestellt' ? 'per E-Mail zugestellt' : 'eingegangen – geht in den nächsten Minuten raus';
  v.innerHTML = `${sectionHead('Wünsche & Ideen zur App', 'Was fehlt? Was nervt? Was wäre super?')}
  <p>Diese App und die Website sind für euch gebaut – und werden mit euren Wünschen besser. Was du hier einträgst, geht direkt per E-Mail an <b>${esc(FB.FEEDBACK_NAME)}</b>, der die Website betreut. Kein Anliegen ist zu klein.</p>
  <form class="form mb-form mb-card fb-form" id="f-fb" novalidate>
    <div class="field"><label>Wo?</label><div class="mb-tabs">${chips('wo', FB.WO, 'app')}</div></div>
    <div class="field"><label>Was?</label><div class="mb-tabs">${chips('was', FB.WAS, 'fehlt')}</div></div>
    <div class="mb-2">
      <div class="field"><label for="fb-bereich">Bereich (optional)</label><select id="fb-bereich" name="bereich"><option value="">– egal / weiß nicht –</option>${FB.BEREICHE.map(([g, items]) => `<optgroup label="${esc(g)}">${items.map(b => `<option>${esc(b)}</option>`).join('')}</optgroup>`).join('')}</select></div>
      <div class="field"><label>Wie wichtig?</label><div class="mb-tabs">${chips('prio', FB.PRIO, 'nett')}</div></div>
    </div>
    <div class="field"><label for="fb-text">Dein Wunsch</label><p class="small muted fb-hint" id="fb-hint">${esc(FB.HINWEIS.fehlt)}</p><textarea id="fb-text" name="text" rows="5" required maxlength="2000"></textarea></div>
    <label class="check"><input type="checkbox" name="geraet" checked><span>Gerätedaten mitschicken – hilft bei Fehlern: <span class="muted">${esc(geraetKurz())}</span></span></label>
    <p class="note" hidden></p>
    <div class="mb-actions"><button class="btn btn-rot" type="submit">Abschicken</button><span class="small muted">Rückfragen kommen per E-Mail an ${esc(me.email || 'deine Adresse')}.</span></div>
  </form>
  ${eigene.length ? `<section class="mb-sub">${sectionHead('Deine bisherigen Wünsche')}<div class="fb-list">${eigene.map(f => `<article class="fb-item ${f.status === 'zugestellt' ? 'ok' : ''}"><div class="small muted">${esc(fmtWhen(f._createdDate))} · ${esc(FB.label(FB.WO, f.wo))} · ${esc(FB.label(FB.WAS, f.was))}${f.bereich ? ' · ' + esc(f.bereich) : ''}${f.prio && f.prio !== 'nett' ? ' · ' + esc(FB.label(FB.PRIO, f.prio)) : ''}</div><p>${nl2br(f.text)}</p><span class="fb-status">${esc(statusText(f))}</span></article>`).join('')}</div></section>` : ''}`;
  const f = $('#f-fb', v); const wahl = { wo: 'app', was: 'fehlt', prio: 'nett' };
  f.addEventListener('click', e => {
    const b = e.target.closest('button[data-fb]'); if (!b) return;
    wahl[b.dataset.fb] = b.dataset.v;
    $$(`button[data-fb="${b.dataset.fb}"]`, f).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    if (b.dataset.fb === 'was') $('#fb-hint', f).textContent = FB.HINWEIS[b.dataset.v] || '';
  });
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const text = $('#fb-text', f).value.trim(); const note = f.querySelector('.note');
    if (text.length < 5) { msg(note, 'Ein Satz reicht – aber ein bisschen mehr als das.'); $('#fb-text', f).focus(); return; }
    const btn = f.querySelector('[type=submit]'); busy(btn, true);
    try {
      await db.insert('Feedback', { wo: wahl.wo, was: wahl.was, prio: wahl.prio, bereich: $('#fb-bereich', f).value, text, name: me.name, memberId: me.id, email: me.email || '', geraet: f.geraet.checked ? `${geraetKurz()} · ${navigator.userAgent.slice(0, 160)}` : '', seite: location.hash, status: 'neu', title: `${FB.label(FB.WAS, wahl.was)} – ${me.name}` });
      msg(note, DEMO ? 'In der echten App geht das jetzt per E-Mail an ' + FB.FEEDBACK_NAME + '.' : 'Danke! Dein Wunsch geht in den nächsten Minuten per E-Mail an ' + FB.FEEDBACK_NAME + '.', 'ok');
      $('#fb-text', f).value = '';
      setTimeout(route, 1200);
    } catch (err) { msg(note, 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
  });
}

// ---------- Hilfe & Anleitungen: nummerierte Videos je Plattform, dazu die Schritte als Text ----------
const HELP_DIR = `${BASE}/assets/hilfe/`;
function secHilfe(v) {
  const id = (location.hash.split('/')[1] || '');
  const topic = topicById(id);
  const chosen = store.get('spd-hilfe-plattform') || guessPlatform();
  const platTabs = `<div class="help-platforms" role="tablist" aria-label="Gerät">${PLATFORMS.map(([k, l]) => `<button type="button" class="chip" data-plat="${k}" aria-pressed="${k === chosen}">${l}</button>`).join('')}</div>`;
  if (!topic) {
    const groups = [...new Set(HELP_TOPICS.map(t => t.group))];
    v.innerHTML = `
    ${sectionHead('Hilfe & Anleitungen', 'Kurze Videos – Schritt für Schritt, ohne Ton')}
    <p class="small muted">Wähle dein Gerät, dann ein Thema. Jedes Video zeigt die Schritte für genau dieses Gerät; darunter stehen sie noch einmal zum Nachlesen.</p>
    ${platTabs}
    ${groups.map(g => `<section class="mb-sub help-group"><h4 class="doc-cat">${esc(g)}</h4><div class="help-grid">${HELP_TOPICS.filter(t => t.group === g).map(t => `
      <a class="help-card" href="#hilfe/${t.id}"><img src="${HELP_DIR}${posterName(t)}.jpg" alt="" loading="lazy" width="640" height="360"><span class="help-card-body"><b>${t.n}</b><span>${esc(t.title)}</span><small>${esc(t.intro)}</small></span></a>`).join('')}</div></section>`).join('')}
    ${!me ? `<p class="mb-actions" style="margin-top:24px"><a class="btn btn-rot" href="#anmelden">Zur Anmeldung</a></p>` : `<section class="mb-sub"><a class="fb-teaser" href="#feedback">${ICON.idea}<span><b>Fehlt dir etwas? Nervt etwas?</b><small>Wünsche und Ideen zur App und zur Website – gehen direkt an ${esc(FB.FEEDBACK_NAME)}.</small></span>${ICON.chev}</a></section>`}`;
  } else {
    const i = HELP_TOPICS.indexOf(topic), prev = HELP_TOPICS[i - 1], next = HELP_TOPICS[i + 1];
    v.innerHTML = `
    <p class="small"><a href="#hilfe">← Alle Anleitungen</a></p>
    ${sectionHead(`${topic.n} · ${esc(topic.title)}`, esc(topic.group))}
    <p>${esc(topic.intro)}</p>
    ${platTabs}
    <div class="help-player" id="help-player"></div>
    <div class="mb-actions help-share" id="help-share"></div>
    <ol class="help-steps" id="help-steps"></ol>
    <div class="mb-actions help-nav">${prev ? `<a class="btn btn-line btn-sm" href="#hilfe/${prev.id}">← ${prev.n} ${esc(prev.title)}</a>` : ''}${next ? `<a class="btn btn-line btn-sm" href="#hilfe/${next.id}">${next.n} ${esc(next.title)} →</a>` : ''}</div>`;
    const show = plat => {
      const name = videoName(topic, plat), portrait = true; // alle Hilfevideos sind hochkant (Keynote-Look), auch die für PC und Mac
      const src = `${HELP_DIR}${name}.mp4`;
      $('#help-player').innerHTML = `<video class="help-video ${portrait ? 'portrait' : 'landscape'}" controls playsinline preload="metadata" poster="${HELP_DIR}${posterName(topic, portrait)}.jpg" src="${src}"></video>`;
      $('#help-steps').innerHTML = stepsFor(topic, plat).map(t => `<li>${esc(t)}</li>`).join('');
      $('#help-share').innerHTML = `<button class="btn btn-rot btn-sm" type="button" id="help-share-btn">${ICON.share}Video teilen</button><a class="btn btn-line btn-sm" href="${src}" download="SPD-Soltau-Hilfe-${name}.mp4">Herunterladen</a><p class="note" id="help-share-msg" hidden></p>`;
      $('#help-share-btn').addEventListener('click', () => shareVideo(topic, plat, src));
    };
    show(chosen);
    v.addEventListener('change-platform', e => show(e.detail));
  }
  $$('.help-platforms .chip', v).forEach(b => b.addEventListener('click', () => {
    $$('.help-platforms .chip', v).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    store.set('spd-hilfe-plattform', b.dataset.plat);
    v.dispatchEvent(new CustomEvent('change-platform', { detail: b.dataset.plat }));
  }));
}

// Video teilen: über das System-Menü des Geräts (WhatsApp, SMS, Mail … – was installiert ist). Wenn möglich die Videodatei selbst,
// sonst der Link zur Anleitung; ohne Teilen-Funktion (mancher PC-Browser) wird der Link kopiert.
async function shareVideo(topic, plat, src) {
  const note = $('#help-share-msg'), btn = $('#help-share-btn');
  const platName = PLATFORMS.find(p => p[0] === plat)?.[1] || plat;
  const title = `${topic.n} ${topic.title} – SPD Soltau App`;
  const url = new URL(`${BASE}/mitglieder/#hilfe/${topic.id}`, location.href).href;
  const text = `Anleitung ${topic.n} „${topic.title}“ für ${platName} – SPD Soltau App`;
  busy(btn, true); msg(note, '');
  try {
    if (navigator.share) {
      let files = null;
      try {
        const blob = await (await fetch(src)).blob();
        const file = new File([blob], `SPD-Soltau-Hilfe-${videoName(topic, plat)}.mp4`, { type: 'video/mp4' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) files = [file];
      } catch (e) { files = null; }
      await navigator.share(files ? { files, title, text } : { title, text, url });
    } else {
      await navigator.clipboard.writeText(`${text}
${url}`);
      msg(note, 'Dieser Browser hat kein Teilen-Menü – der Link zur Anleitung ist kopiert. Zum Weitergeben der Videodatei: „Herunterladen“.', 'info');
    }
  } catch (err) { if (err && err.name !== 'AbortError') msg(note, 'Teilen hat nicht geklappt: ' + errText(err)); }
  busy(btn, false);
}

// ---------- Start: Überblick ----------
async function secStart(v) {
  const events = visibleEvents().slice(0, 3);
  const [zusagen, umfragen, listen, helfer, docs, profiles] = await Promise.all([
    db.list('Zusagen').catch(() => []), db.list('Umfragen', { eq: { offen: true } }).catch(() => []), db.list('Helferlisten').catch(() => []),
    db.list('Helfer').catch(() => []), db.list('Dokumente', { desc: '_createdDate', limit: 3 }).catch(() => []), db.list('Profile').catch(() => []),
  ]);
  const today = todayIso();
  const openLists = listen.filter(l => !l.datum || l.datum >= today);
  const freeSlots = openLists.reduce((n, l) => n + (l.schichten || []).reduce((m, s) => m + Math.max(0, (s.plaetze || 0) - helfer.filter(h => h.listeId === l._id && h.schichtId === s.id).length), 0), 0);
  const bdays = upcomingBirthdays(profiles, 14);
  const ratKarte = await ratsarbeit.startKarte();
  const planKarte = await bereiche.startKarte();
  const ideenKarte = bereiche.ideenKarte();
  const gwKarte = secVisible('wissen') ? bereiche.grundwissenStartKarte() : '';
  v.innerHTML = `
  ${myProfile?.verzeichnisSichtbar || settings.board.has(me.id) ? '' : '<p class="note note-info" style="margin-bottom:20px">Du stehst noch nicht im Mitgliederverzeichnis – andere Mitglieder finden dich also nicht. Einschalten kannst du das unter <a href="#profil">Mein Profil</a>.</p>'}
  <div class="start-grid">
    ${ratKarte}${planKarte}
    <div class="mb-card">
      <h3>Nächste Termine</h3>
      ${events.length ? events.map(ev => { const mine = zusagen.find(z => z.eventId === ev.id && z.memberId === me.id); return `<a class="start-ev" href="#termine/ev-${esc(ev.id)}"><b>${esc(fmtShort(ev.date))}</b> ${esc(ev.title)} <span class="small muted">${esc(ev.zeit || '')}</span>${mine ? `<span class="badge ${mine.status === 'zusage' ? 'badge-mit' : ''}">${mine.status === 'zusage' ? 'zugesagt' : 'abgesagt'}</span>` : '<span class="badge">offen</span>'}</a>`; }).join('') : '<p class="muted small">Keine Termine eingetragen.</p>'}
      <a class="btn btn-schwarz btn-sm" href="#termine">Alle Termine</a>
    </div>
    ${gwKarte}
    ${me.sees('umfragen') || me.sees('helfer') ? `<div class="mb-card">
      <h3>Mitmachen</h3>
      <p class="small">${me.sees('umfragen') ? `<b>${umfragen.length}</b> offene Umfrage${umfragen.length === 1 ? '' : 'n'}` : ''}${me.sees('umfragen') && me.sees('helfer') ? ' · ' : ''}${me.sees('helfer') ? `<b>${freeSlots}</b> freie Helferplätze` : ''}</p>
      ${me.sees('umfragen') ? umfragen.slice(0, 2).map(u => `<a class="start-ev" href="#umfragen/u-${esc(u._id)}">🗳️ ${esc(u.frage)}</a>`).join('') : ''}
      ${me.sees('helfer') ? openLists.slice(0, 2).map(l => `<a class="start-ev" href="#termine/hl-${esc(l._id)}">🙋 ${esc(l.titel)} <span class="small muted">${esc(fmtShort(l.datum))}</span></a>`).join('') : ''}
      <div class="mb-actions">${me.sees('umfragen') ? '<a class="btn btn-schwarz btn-sm" href="#umfragen">Umfragen</a>' : ''}${me.sees('helfer') ? '<a class="btn btn-line btn-sm" href="#termine/helferlisten">Helferlisten</a>' : ''}</div>
    </div>` : ''}
    ${me.sees('dokumente') ? `<div class="mb-card">
      <h3>Neue Dokumente</h3>
      ${docs.length ? docs.map(d => `<a class="start-ev" href="${esc(linkOf(d) || '#dokumente')}" ${linkOf(d) ? 'target="_blank" rel="noopener"' : ''}>📄 ${esc(d.titel)} <span class="small muted">${esc(d.kategorie || '')}</span></a>`).join('') : '<p class="muted small">Noch keine Dokumente.</p>'}
      <a class="btn btn-schwarz btn-sm" href="#dokumente">Alle Dokumente</a>
    </div>` : ''}
    ${(settings.snap.whatsapp?.gruppen || []).length ? `<div class="mb-card"><h3>Unsere WhatsApp-Gruppen</h3><p class="small muted">Die App schickt Push-Nachrichten – in den Gruppen läuft der Austausch. Termine, Helferlisten und Umfragen lassen sich mit einem Tipp dorthin teilen.</p>${settings.snap.whatsapp.gruppen.map(g => `<a class="start-ev" href="${esc(g.url)}" target="_blank" rel="noopener">${WA_ICON} ${esc(g.name)}<span class="badge" style="margin-left:auto">Beitreten</span></a>`).join('')}</div>` : ''}
    ${ideenKarte}
    <div class="mb-card">
      <h3>Geburtstage</h3>
      ${bdays.length ? bdays.map(b => `<p class="small">🎂 <b>${esc(b.name)}</b> – ${esc(b.text)}</p>`).join('') : '<p class="muted small">In den nächsten zwei Wochen keine eingetragenen Geburtstage.</p>'}
      <p class="small muted">Nur wer es im Profil freigibt, erscheint hier.</p>
    </div>
  </div>`;
}
function upcomingBirthdays(profiles, days) {
  const now = new Date(); const out = [];
  for (const p of profiles) {
    if (!p.geburtstagSichtbar || !p.geburtstag) continue;
    const m = String(p.geburtstag).match(/(\d{2})-(\d{2})$/); if (!m) continue;
    let d = new Date(now.getFullYear(), +m[1] - 1, +m[2]);
    if (d < new Date(now.getFullYear(), now.getMonth(), now.getDate())) d = new Date(now.getFullYear() + 1, +m[1] - 1, +m[2]);
    const diff = Math.round((d - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
    if (diff <= days) out.push({ name: p.name, diff, text: diff <= 0 ? 'heute!' : diff === 1 ? 'morgen' : `${d.getDate()}. ${MONL[d.getMonth()]}` });
  }
  return out.sort((a, b) => a.diff - b.diff);
}

// ---------- Termine: Zu-/Absagen, Helferlisten, Fahrgemeinschaften – als Liste oder Monatskalender ----------
// Farben je Termintyp (Punkte im Kalender, Legende)
const TYP_FARBE = { 'Öffentlich': '#3B6FB6', Rat: '#0F0F0F', Mitglieder: '#E3000F', Fraktion: '#F28C00', Vorstand: '#8A8484' };
const ARTEN = Object.keys(TYP_FARBE); // Reihenfolge der Filter-Knoepfe
const cal = { monat: null, tag: null }; // gemerkt, solange die App offen ist
const monatVon = iso => String(iso).slice(0, 7);
function monatsKalender(events, ansichtEvents) {
  const today = todayIso();
  if (!cal.monat) cal.monat = monatVon(today);
  const [jahr, mon] = cal.monat.split('-').map(Number);
  const erster = new Date(jahr, mon - 1, 1), tage = new Date(jahr, mon, 0).getDate();
  const start = (erster.getDay() + 6) % 7; // Montag = 0
  const imMonat = ansichtEvents.filter(e => monatVon(e.date) === cal.monat);
  const proTag = new Map(); for (const e of imMonat) { const k = String(e.date).slice(0, 10); if (!proTag.has(k)) proTag.set(k, []); proTag.get(k).push(e); }
  if (!cal.tag || monatVon(cal.tag) !== cal.monat || !proTag.has(cal.tag)) cal.tag = proTag.has(today) ? today : [...proTag.keys()].sort()[0] || null;
  const zellen = [];
  for (let i = 0; i < start; i++) zellen.push('<span class="cal-leer"></span>');
  for (let t = 1; t <= tage; t++) {
    const iso = `${cal.monat}-${String(t).padStart(2, '0')}`; const evs = proTag.get(iso) || [];
    const typen = [...new Set(evs.map(e => e.typ || 'Öffentlich'))];
    zellen.push(`<button type="button" class="cal-day${iso === today ? ' heute' : ''}${iso === cal.tag ? ' gewaehlt' : ''}${evs.length ? ' hat' : ''}" data-tag="${iso}" ${evs.length ? '' : 'disabled'} aria-label="${t}. ${MONL[mon - 1]}${evs.length ? ', ' + evs.length + ' Termin' + (evs.length === 1 ? '' : 'e') : ''}"><span>${t}</span><span class="cal-dots">${typen.slice(0, 4).map(ty => `<i style="background:${TYP_FARBE[ty] || '#888'}"></i>`).join('')}</span></button>`);
  }
  const legende = Object.entries(TYP_FARBE).filter(([ty]) => ansichtEvents.some(e => (e.typ || 'Öffentlich') === ty)).map(([ty, f]) => `<span><i style="background:${f}"></i>${esc(ty)}</span>`).join('');
  return `<div class="cal">
    <div class="cal-head"><button type="button" class="cal-nav" data-cal="-1" aria-label="Vormonat">‹</button><b>${MONL[mon - 1]} ${jahr}</b><button type="button" class="cal-nav" data-cal="1" aria-label="Nächster Monat">›</button><button type="button" class="linkbtn" data-cal="0">Heute</button><span class="small muted">${imMonat.length} Termin${imMonat.length === 1 ? '' : 'e'}</span></div>
    <div class="cal-grid">${WD.slice(1).concat(WD[0]).map(w => `<span class="cal-wd">${w}</span>`).join('')}${zellen.join('')}</div>
    <div class="cal-legend">${legende || '<span class="muted small">Keine Termine in diesem Monat.</span>'}</div>
  </div>`;
}
async function secTermine(v) {
  // Nach Art filtern: die Auswahl bleibt auf dem Geraet gemerkt, keine Auswahl = alle Arten
  const alleSichtbar = visibleEvents();
  const artenDa = ARTEN.filter(a => alleSichtbar.some(e => (e.typ || 'Öffentlich') === a));
  const arten = new Set(String(store.get('spd-termine-arten') || '').split(',').filter(a => artenDa.includes(a)));
  const sichtbar = arten.size ? alleSichtbar.filter(e => arten.has(e.typ || 'Öffentlich')) : alleSichtbar;
  const events = sichtbar.slice(0, 40);         // was gerade angezeigt wird
  const alleEvents = alleSichtbar.slice(0, 40); // ohne Filter - fuer Auswahllisten
  const [zusagen, listen, helfer, fahrten, terminPolls, stimmen, mitfahrten] = await Promise.all([db.list('Zusagen').catch(() => []), db.list('Helferlisten').catch(() => []), db.list('Helfer').catch(() => []), db.list('Fahrgemeinschaften').catch(() => []), db.list('Umfragen', { eq: { nurZusagen: true } }).catch(() => []), db.list('Stimmen', { limit: 1000 }).catch(() => []), db.list('Mitfahrten', { limit: 1000 }).catch(() => [])]);
  secTermine.polls = { terminPolls: terminPolls.map(u => ({ ...u, col: 'Umfragen' })), stimmen };
  secTermine.mitfahrten = mitfahrten; // wer bei welchem Angebot mitfährt (Sammlung Mitfahrten: fahrtId, memberId, name)
  const today = todayIso();
  const ics = CFG.ics || {};
  // Listen, die an einem angezeigten Termin hängen, stehen direkt im Termin – der Rest unten
  const loseListen = listen.filter(l => (!l.datum || l.datum >= today) && !alleEvents.some(e => e.id === l.eventId));
  orteList();
  if (location.hash === '#termine/monat') store.set('spd-termine-ansicht', 'monat');
  const ansicht = store.get('spd-termine-ansicht') === 'monat' ? 'monat' : 'liste';
  const calHtml = ansicht === 'monat' ? monatsKalender(events, sichtbar) : ''; // setzt cal.tag
  const tagesEvents = ansicht === 'monat' ? sichtbar.filter(e => String(e.date).slice(0, 10) === cal.tag) : [];
  v.innerHTML = `
  ${sectionHead('Termine – kommst du?', 'Zusagen sehen alle Mitglieder, Gründe nur der Vorstand')}
  <div class="mb-tabs termine-ansicht" role="tablist" aria-label="Ansicht"><button type="button" class="chip" data-ansicht="liste" aria-pressed="${ansicht === 'liste'}">Liste</button><button type="button" class="chip" data-ansicht="monat" aria-pressed="${ansicht === 'monat'}">Kalender</button></div>
  ${artenDa.length > 1 ? `<div class="termine-filter" role="group" aria-label="Nach Art filtern">
    <span class="tf-label">Art</span>
    <button type="button" class="chip chip-art" data-art="" aria-pressed="${!arten.size}">Alle</button>
    ${artenDa.map(a => `<button type="button" class="chip chip-art" data-art="${esc(a)}" aria-pressed="${arten.has(a)}"><i style="background:${TYP_FARBE[a]}"></i>${esc(a)}</button>`).join('')}
  </div>` : ''}
  ${me.can('termine') || (me.can('helfer') && me.sees('helfer')) ? `<div class="mb-create">
  ${me.can('termine') ? `<details class="mb-details" id="ev-new"><summary>Termin anlegen</summary>
    <p class="small muted">Wird bei Wix Events eingetragen und erscheint je nach Typ auf der Website und im Kalender-Abo.</p>
    <form class="form mb-form" id="f-event" novalidate>
      <div class="field"><label for="ev-titel">Titel</label><input id="ev-titel" name="titel" type="text" required maxlength="80" placeholder="z. B. Fraktionssitzung"></div>
      <div class="mb-3">
        <div class="field"><label for="ev-datum">Datum</label><input id="ev-datum" name="datum" type="date" required></div>
        <div class="field"><label for="ev-von">Beginn</label><input id="ev-von" name="von" type="time" required value="19:00"></div>
        <div class="field"><label for="ev-bis">Ende</label><input id="ev-bis" name="bis" type="time" value="21:00"></div>
      </div>
      <div class="mb-2">
        <div class="field"><label for="ev-ort">Ort</label><input id="ev-ort" name="ort" type="text" list="orte-termin" required value="Roter Bahnhof, Am Bahnhof 1t"><datalist id="orte-termin">${ORTE_TERMIN.map(o => `<option value="${esc(o)}">`).join('')}</datalist></div>
        <div class="field"><label for="ev-typ">Für wen?</label><select id="ev-typ" name="typ">${typOptionen()}</select></div>
      </div>
      <div class="field"><label for="ev-text">Kurzbeschreibung (optional)</label><textarea id="ev-text" name="beschreibung" rows="2" maxlength="300"></textarea></div>
      <p class="note" hidden></p>
      <div class="mb-actions"><button class="btn btn-rot" type="submit">Termin eintragen</button></div>
    </form></details>` : ''}
  ${me.can('helfer') && me.sees('helfer') ? `<details class="mb-details" id="hl-new"><summary>Helferliste anlegen</summary>${helperForm(alleEvents)}</details>` : ''}
  </div>` : ''}
  ${ansicht === 'monat' ? `${calHtml}
  <div class="cal-tag" id="cal-tag">${cal.tag ? `<h4 class="doc-cat">${esc(fmtDate(cal.tag))}</h4>${tagesEvents.length ? tagesEvents.map(ev => eventCard(ev, zusagen, listen, helfer, fahrten, sichtbar)).join('') : '<p class="muted">An diesem Tag ist nichts eingetragen.</p>'}` : '<p class="muted">Tippe auf einen Tag mit Punkt, um die Termine zu sehen.</p>'}</div>` : ''}
  ${ansicht === 'liste' ? `<div class="rsvp-list" id="rsvp-list">${events.length ? events.map(ev => eventCard(ev, zusagen, listen, helfer, fahrten, events)).join('') : arten.size ? '<p class="muted">Zu dieser Auswahl ist kein Termin eingetragen. <button type="button" class="linkbtn" data-art="">Alle Arten zeigen</button></p>' : '<p class="muted">Aktuell sind keine Termine eingetragen.</p>'}</div>` : ''}
  ${me.sees('helfer') && loseListen.length ? `<section class="mb-sub" id="helferlisten">
    ${sectionHead('Weitere Helferlisten', 'Ohne festen Termin')}
    <div id="hl-list">${loseListen.map(l => helperList(l, helfer, events)).join('')}</div>
  </section>` : ''}
  <section class="mb-sub" id="kalender">
    ${sectionHead('Kalender abonnieren', 'Termine automatisch im Handy-Kalender')}
    <p class="small">Einmal abonnieren – neue Termine erscheinen von selbst im Kalender (iPhone: Link antippen → „Abonnieren“; Android/Google: Kalender → „Per URL hinzufügen“).</p>
    <div class="mb-actions">
      ${ics.intern ? `<a class="btn btn-rot btn-sm" href="${esc(webcal(ics.intern))}">Alle Termine (Mitglieder)</a><button class="btn btn-line btn-sm" type="button" data-copy="${esc(absUrl(ics.intern))}">Adresse kopieren</button>` : ''}
      ${ics.public ? `<a class="btn btn-line btn-sm" href="${esc(webcal(ics.public))}">Nur öffentliche Termine</a>` : ''}
    </div>
    <p class="note" id="ics-msg" hidden></p>
  </section>`;
  wireEvents(v, alleSichtbar, zusagen, listen, helfer, fahrten);
  // Ansicht wechseln, Monat blättern, Tag wählen
  v.addEventListener('click', e => {
    const f = e.target.closest('[data-art]');
    if (f) {
      const art = f.dataset.art;
      if (!art) arten.clear();
      else if (arten.has(art)) arten.delete(art);
      else arten.add(art);
      store.set('spd-termine-arten', [...arten].join(','));
      // Im Kalender zum nächsten passenden Monat springen, damit die Auswahl nicht ins Leere zeigt
      const rest = alleSichtbar.filter(x => !arten.size || arten.has(x.typ || 'Öffentlich'));
      if (cal.monat && rest.length && !rest.some(x => monatVon(x.date) === cal.monat)) cal.monat = monatVon(rest[0].date);
      cal.tag = null; route(); return;
    }
    const a = e.target.closest('[data-ansicht]'); if (a) { store.set('spd-termine-ansicht', a.dataset.ansicht); if (location.hash === '#termine/monat') history.replaceState(null, '', location.pathname + location.search + '#termine'); route(); return; }
    const n = e.target.closest('[data-cal]');
    if (n) {
      if (n.dataset.cal === '0') { cal.monat = monatVon(todayIso()); cal.tag = null; }
      else { const [j, m] = cal.monat.split('-').map(Number); const d = new Date(j, m - 1 + Number(n.dataset.cal), 1); cal.monat = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; cal.tag = null; }
      route(); return;
    }
    const t = e.target.closest('button.cal-day[data-tag]'); if (t) { cal.tag = t.dataset.tag; route(); }
  });
}
const absUrl = rel => new URL(rel, location.href).href;
const webcal = rel => absUrl(rel).replace(/^https?:/, 'webcal:');
// Termin-Formulare: Auswahl „Für wen?“ und Werte aus einem bestehenden Termin
const TYP_WAHL = [['Öffentlich', 'Öffentlich (alle Interessierten)'], ['Rat', 'Ratstermin (öffentlich)'], ['Mitglieder', 'Nur Mitglieder'], ['Fraktion', 'Fraktion'], ['Vorstand', 'Vorstand']];
const typOptionen = (sel = 'Öffentlich') => TYP_WAHL.map(([w, t]) => `<option value="${w}"${w === sel ? ' selected' : ''}>${t}</option>`).join('');
const zeitWert = z => { const m = String(z || '').match(/(\d{1,2}):(\d{2})/); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''; };
const ohneTypHinweis = t => String(t || '').replace(/^\s*(Nur für [^.]{0,30}|Öffentliche Ratssitzung)\.\s*/i, '');
// Formular zum Bearbeiten – steht im Termin selbst, die Änderung geht als Auftrag an den Push-Dienst
function eventForm(ev) {
  const f = `evx-${ev.id}`;
  return `<form class="form mb-form ev-form" hidden novalidate>
    <div class="field"><label for="${f}-titel">Titel</label><input id="${f}-titel" name="titel" type="text" required maxlength="80" value="${esc(ev.title || '')}"></div>
    <div class="mb-3">
      <div class="field"><label for="${f}-datum">Datum</label><input id="${f}-datum" name="datum" type="date" required value="${esc(String(ev.date).slice(0, 10))}"></div>
      <div class="field"><label for="${f}-von">Beginn</label><input id="${f}-von" name="von" type="time" value="${esc(zeitWert(ev.zeit))}"></div>
      <div class="field"><label for="${f}-bis">Ende <span class="muted">(optional)</span></label><input id="${f}-bis" name="bis" type="time"></div>
    </div>
    <div class="mb-2">
      <div class="field"><label for="${f}-ort">Ort</label><input id="${f}-ort" name="ort" type="text" list="orte-termin" required value="${esc(ev.ort || '')}"></div>
      <div class="field"><label for="${f}-typ">Für wen?</label><select id="${f}-typ" name="typ">${typOptionen(ev.typ || 'Öffentlich')}</select></div>
    </div>
    <div class="field"><label for="${f}-text">Kurzbeschreibung (optional)</label><textarea id="${f}-text" name="beschreibung" rows="2" maxlength="300">${esc(ohneTypHinweis(ev.info))}</textarea></div>
    <p class="small muted">Der Titel wirkt mit: steht dort „Fraktion“, „Vorstand“, „Rat“ oder „Ausschuss“, bleibt der Termin dabei. Ende leer lassen heißt: Dauer bleibt wie bisher.</p>
    <p class="note" hidden></p>
    <div class="mb-actions"><button class="btn btn-rot btn-sm" type="submit">Änderung speichern</button><button class="btn btn-line btn-sm" type="button" data-edit-abbruch>Abbrechen</button></div>
  </form>`;
}
function eventCard(ev, zusagen, listen, helfer, fahrten, events = []) {
  const list = zusagen.filter(z => z.eventId === ev.id);
  const mine = list.find(z => z.memberId === me.id);
  const ja = list.filter(z => z.status === 'zusage'), nein = list.filter(z => z.status === 'absage');
  const myLists = listen.filter(l => l.eventId === ev.id);
  const rides = fahrten.filter(f => f.eventId === ev.id);
  return `<article class="rsvp" id="ev-${esc(ev.id)}" data-id="${esc(ev.id)}">
    ${dateBox(ev.date)}
    <div class="rsvp-body">
      <h4>${esc(ev.title)}</h4>
      <div class="meta">${esc(ev.zeit || '')}${ev.ort ? ' · ' + esc(ev.ort) : ''} · ${badge(ev.typ)}</div>
      ${ev.info ? `<p class="small">${esc(ev.info)}</p>` : ''}
      <div class="rsvp-btns">
        <button type="button" class="chip" data-status="zusage" aria-pressed="${mine?.status === 'zusage'}">✓ Ich komme</button>
        <button type="button" class="chip" data-status="absage" aria-pressed="${mine?.status === 'absage'}">✕ Ich kann nicht</button>
        ${waBtn(`📅 ${ev.title}\n${fmtDate(ev.date)}${ev.zeit ? ', ' + ev.zeit : ''}${ev.ort ? ' · ' + ev.ort : ''}\nZu-/Absage und Mitfahren: ${appLink('#termine/ev-' + ev.id)}`)}
      </div>
      <div class="rsvp-grund" ${mine?.status === 'absage' ? '' : 'hidden'}>
        <div class="field"><label>Grund (optional, sieht nur der Vorstand)</label><input type="text" maxlength="120" value="${esc(mine?.grund || '')}" placeholder="z. B. Schicht, Urlaub, krank"></div>
        <button type="button" class="btn btn-schwarz btn-sm" data-save-grund>Speichern</button>
      </div>
      <p class="rsvp-who small"><b>${ja.length}</b> Zusage${ja.length === 1 ? '' : 'n'}${ja.length ? ': ' + esc(ja.map(z => z.name).join(', ')) : ''}${nein.length ? ` · <span class="muted">${nein.length} Absage${nein.length === 1 ? '' : 'n'}</span>` : ''}</p>
      ${terminPoll(ev, mine)}
      ${me.sees('helfer') ? myLists.map(l => helperList(l, helfer, events, true)).join('') : ''}
      ${me.can('termine') && ev.id && !String(ev.id).startsWith('ev-demo') ? `<p class="small ev-tools"><button type="button" class="linkbtn" data-edit-event>Termin bearbeiten</button><span class="muted">·</span><button type="button" class="linkbtn" data-cancel-event>Termin absagen</button></p>
      ${eventForm(ev)}` : ''}
      ${(() => {
        const mitf = secTermine.mitfahrten || [];
        const angebote = rides.filter(r => r.typ === 'biete'), gesuche = rides.filter(r => r.typ !== 'biete');
        const freiGesamt = angebote.reduce((s, r) => s + Math.max(0, (r.plaetze || 1) - mitf.filter(m => m.fahrtId === r._id).length), 0);
        const kurz = [angebote.length ? `${angebote.length} Angebot${angebote.length === 1 ? '' : 'e'}${freiGesamt ? ` · ${freiGesamt} ${freiGesamt === 1 ? 'Platz' : 'Plätze'} frei` : ' · voll'}` : '', gesuche.length ? `${gesuche.length} ${gesuche.length === 1 ? 'sucht' : 'suchen'} eine Mitfahrt` : ''].filter(Boolean).join(' · ');
        return `<details class="mb-details rides" data-ev="${esc(ev.id)}"><summary><span class="rides-titel">🚗 Mitfahren</span>${kurz ? `<span class="rides-kurz">${esc(kurz)}</span>` : ''}</summary>
        ${angebote.length ? `<div class="ride-list">${angebote.map(r => fahrtKarte(r, ev, mitf)).join('')}</div>` : ''}
        ${gesuche.length ? `<div class="ride-list">${gesuche.map(r => fahrtKarte(r, ev, mitf)).join('')}</div>` : ''}
        ${!rides.length ? '<p class="small muted">Noch niemand eingetragen – mach den Anfang.</p>' : ''}
        <p class="fahrt-form-titel">Selbst eintragen</p>
        <p class="small muted">Wer Plätze anbietet, bekommt eine Nachricht, sobald jemand einsteigt, und sieht die Namen. Alle anderen sehen nur, wie viele Plätze noch frei sind.</p>`;
      })()}
        <form class="form mb-form ride-form" novalidate>
          <div class="mb-3">
            <div class="field"><label>Ich …</label><select name="typ"><option value="biete">biete Plätze an</option><option value="suche">suche eine Mitfahrt</option></select></div>
            <div class="field"><label>Ab (Ortsteil)</label><input name="ab" type="text" list="orte" value="${esc(myProfile?.fahreAb || myProfile?.ort || '')}" required></div>
            <div class="field"><label>Plätze / Abfahrt</label><div class="mb-2 tight"><input name="plaetze" type="number" min="1" max="8" value="3" aria-label="Plätze"><input name="zeit" type="time" aria-label="Abfahrt"></div></div>
          </div>
          <p class="note" hidden></p>
          <div class="mb-actions"><button class="btn btn-schwarz btn-sm" type="submit">Eintragen</button></div>
        </form>
      </details>
      <p class="note" hidden></p>
    </div>
  </article>`;
}
// Mitfahren: Angebot mit Sitzplätzen (belegt / frei / dein Platz) und „Ich fahre mit“ – oder ein Gesuch
const initialen = n => String(n || '').split(/\s+/).map(x => x[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '·';
function fahrtKarte(r, ev, mitf) {
  const own = r.memberId === me.id, vorname = String(r.name || '').split(' ')[0];
  const posten = waBtn(`🚗 ${r.typ === 'biete' ? 'Ich biete ' + (r.plaetze || 1) + (r.plaetze === 1 ? ' Platz' : ' Plätze') : 'Ich suche eine Mitfahrt'} ab ${r.ab || '?'} zu „${ev.title}“ (${fmtShort(ev.date)}${r.zeit ? ', ' + r.zeit + ' Uhr' : ''}). Eintragen: ${appLink('#termine/ev-' + ev.id)}`, 'In Gruppe posten');
  if (r.typ !== 'biete') {
    return `<article class="fahrt suche" data-id="${esc(r._id)}"><div class="fahrt-avatar" aria-hidden="true">${initialen(r.name)}</div><div class="fahrt-body">
      <div class="fahrt-kopf"><b>${esc(r.name)}</b> sucht eine Mitfahrt ab <b>${esc(r.ab || '?')}</b>${r.zeit ? ` · ab ${esc(r.zeit)} Uhr` : ''}${r.hinweis ? ` · ${esc(r.hinweis)}` : ''}</div>
      <p class="small muted">${own ? 'Sobald jemand Plätze anbietet, kannst du dort auf „Ich fahre mit“ tippen – dein Gesuch verschwindet dann von selbst.' : `Wer Plätze hat: unten ein Angebot eintragen, dann kann ${esc(vorname)} einsteigen.`}</p>
      ${own ? `<div class="fahrt-actions">${posten}<button type="button" class="linkbtn" data-del-ride>Gesuch löschen</button></div>` : ''}
    </div></article>`;
  }
  const plaetze = Math.max(1, +r.plaetze || 1);
  const dabei = mitf.filter(m => m.fahrtId === r._id).slice(0, plaetze);
  const ich = dabei.find(m => m.memberId === me.id);
  const frei = Math.max(0, plaetze - dabei.length);
  // Wer mitfährt, sieht nur die Person, die die Fahrt anbietet – alle anderen sehen bloß belegt oder frei
  const namenZeigen = own;
  const sitzName = m => !m ? 'frei' : m.memberId === me.id ? 'du' : namenZeigen ? (m.name || 'Mitglied') : 'belegt';
  const sitze = Array.from({ length: plaetze }, (_, i) => { const m = dabei[i]; return `<span class="sitz ${m ? (m.memberId === me.id ? 'du' : 'belegt') : 'frei'}" title="${esc(sitzName(m))}">${ICON.user}</span>`; }).join('');
  return `<article class="fahrt biete${frei ? '' : ' voll'}${ich ? ' dabei' : ''}" data-id="${esc(r._id)}"><div class="fahrt-avatar" aria-hidden="true">${initialen(r.name)}</div><div class="fahrt-body">
    <div class="fahrt-kopf"><b>${esc(r.name)}</b> fährt ab <b>${esc(r.ab || '?')}</b>${r.zeit ? ` · Abfahrt ${esc(r.zeit)} Uhr` : ''}${r.hinweis ? ` · ${esc(r.hinweis)}` : ''}</div>
    <div class="sitze" role="img" aria-label="${frei} von ${plaetze} Plätzen frei">${sitze}</div>
    <p class="small fahrt-frei">${frei ? `<b>${frei}</b> von ${plaetze} ${plaetze === 1 ? 'Platz' : 'Plätzen'} frei` : '<b>Voll</b> – alle Plätze belegt'}${dabei.length ? (namenZeigen ? ` · mit dabei: ${esc(dabei.map(m => m.memberId === me.id ? 'du' : m.name || 'Mitglied').join(', '))} <span class="muted">(Namen siehst nur du)</span>` : ich ? ' · du bist dabei' : '') : ''}</p>
    <div class="fahrt-actions">${own ? `<span class="badge">Dein Angebot</span>${posten}<button type="button" class="linkbtn" data-del-ride>Angebot löschen</button>`
      : ich ? `<button type="button" class="chip" data-mitfahren aria-pressed="true">✓ Ich fahre mit</button><span class="small muted">Nochmal tippen zum Aussteigen</span>`
      : frei ? `<button type="button" class="btn btn-rot btn-sm" data-mitfahren>${ICON.plus}Ich fahre mit</button>` : '<span class="small muted">Vielleicht bietet noch jemand Plätze an.</span>'}</div>
  </div></article>`;
}
// Umfrage zum Termin (z. B. Stammtisch: „Wo treffen wir uns?“) – sichtbar nur für Zusagen (und wer Umfragen verwalten darf)
function terminPoll(ev, mine) {
  const p = secTermine.polls; if (!p) return '';
  const u = p.terminPolls.find(x => x.eventId === ev.id && x.offen !== false);
  if (!u) return '';
  if (mine?.status !== 'zusage' && !me.can('umfragen')) return `<p class="small muted">🍽️ Zu diesem Termin gibt es eine Umfrage („${esc(u.frage)}“) – sie erscheint, sobald du zugesagt hast.</p>`;
  return `<div class="termin-poll">${pollCard(u, p.stimmen, true)}<p class="small muted">Diese Umfrage sehen nur die, die zugesagt haben.</p></div>`;
}
// embedded = innerhalb der Terminkarte (kompakter, ohne Termin-Hinweis)
function helperList(l, helfer, events, embedded = false) {
  const ev = events.find(e => e.id === l.eventId);
  return `<article class="${embedded ? 'hl hl-embed' : 'mb-card hl'}" id="hl-${esc(l._id)}" data-id="${esc(l._id)}">
    <div class="hl-head"><div><h4>${embedded ? '🙋 ' : ''}${esc(embedded ? 'Helfer gesucht: ' + l.titel : l.titel)}</h4><p class="small muted">${esc(fmtDate(l.datum))}${l.ort ? ' · ' + esc(l.ort) : ''}${ev && !embedded ? ' · Termin: ' + esc(ev.title) : ''} · angelegt von ${esc(l.von || '–')}</p></div><div class="mb-actions">${waBtn(`🙋 Helfer gesucht: ${l.titel} – ${fmtDate(l.datum)}${l.ort ? ', ' + l.ort : ''}\n${(l.schichten || []).map(s => s.zeit + ' (' + (s.plaetze || 0) + ' Plätze)').join(', ')}\nEintragen: ${appLink('#termine/hl-' + l._id)}`)}${l._owner === me.id || me.can('helfer') ? '<button type="button" class="linkbtn" data-del-list>Liste löschen</button>' : ''}</div></div>
    ${l.beschreibung ? `<p class="small">${nl2br(l.beschreibung)}</p>` : ''}
    <div class="shifts">${(l.schichten || []).map(s => {
      const who = helfer.filter(h => h.listeId === l._id && h.schichtId === s.id); const mine = who.some(h => h.memberId === me.id); const free = Math.max(0, (s.plaetze || 0) - who.length);
      return `<div class="shift ${free === 0 ? 'full' : ''}"><div><b>${esc(s.zeit || 'Schicht')}</b> <span class="small">${who.length}/${s.plaetze || 0}${free ? ` · noch ${free} frei` : ' · voll'}</span><br><span class="small muted">${who.length ? esc(who.map(h => h.name).join(', ')) : 'noch niemand'}</span></div><button type="button" class="chip" data-shift="${esc(s.id)}" aria-pressed="${mine}" ${!mine && !free ? 'disabled' : ''}>${mine ? '✓ Ich helfe' : 'Ich helfe mit'}</button></div>`;
    }).join('')}</div>
    <p class="note" hidden></p>
  </article>`;
}
function helperForm(events) {
  return `<form class="form mb-form" id="f-hl" novalidate>
    <div class="mb-2">
      <div class="field"><label for="hl-titel">Titel</label><input id="hl-titel" name="titel" type="text" required placeholder="z. B. Infostand Wochenmarkt"></div>
      <div class="field"><label for="hl-ev">Zu welchem Termin? (optional)</label><select id="hl-ev" name="eventId"><option value="">– kein Termin –</option>${events.map(e => `<option value="${esc(e.id)}">${esc(fmtShort(e.date))} ${esc(e.title)}</option>`).join('')}</select></div>
    </div>
    <div class="mb-2">
      <div class="field"><label for="hl-datum">Datum</label><input id="hl-datum" name="datum" type="date" required></div>
      <div class="field"><label for="hl-ort">Ort / Treffpunkt</label><input id="hl-ort" name="ort" type="text"></div>
    </div>
    <div class="field"><label for="hl-text">Was ist zu tun? (optional)</label><textarea id="hl-text" name="beschreibung" rows="2"></textarea></div>
    <div class="field"><label>Schichten (Zeit und Anzahl Helfer*innen)</label>
      <div id="hl-shifts" class="rows"><div class="row mb-2 tight"><input type="text" placeholder="z. B. 09:00–11:00" aria-label="Zeit"><input type="number" min="1" max="30" value="2" aria-label="Plätze"></div></div>
      <button type="button" class="linkbtn" id="hl-add">+ Schicht hinzufügen</button>
    </div>
    <p class="note" hidden></p>
    <div class="mb-actions"><button class="btn btn-rot" type="submit">Liste anlegen</button></div>
  </form>`;
}
function wireEvents(v, events, zusagen, listen, helfer, fahrten) {
  // Umfragen innerhalb von Terminkarten (Stammtisch)
  if (secTermine.polls?.terminPolls.length) wirePolls(v, secTermine.polls.terminPolls, secTermine.polls.stimmen);
  v.addEventListener('click', async e => {
    // Zu-/Absagen
    const b = e.target.closest('button[data-status],button[data-save-grund]');
    if (b) {
      const art = b.closest('.rsvp'); const ev = events.find(x => x.id === art.dataset.id); if (!ev) return;
      const status = b.dataset.status || (art.querySelector('[data-status][aria-pressed="true"]')?.dataset.status) || 'absage';
      const grund = status === 'absage' ? art.querySelector('.rsvp-grund input').value.trim() : '';
      const note = art.querySelector(':scope > .rsvp-body > .note');
      if (status === 'absage' && b.dataset.status) { $$('[data-status]', art).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.status === status))); art.querySelector('.rsvp-grund').hidden = false; }
      busy(b, true);
      try {
        const r = await db.list('Zusagen', { eq: { eventId: ev.id, memberId: me.id }, limit: 1 });
        const data = { eventId: ev.id, eventTitel: ev.title, eventDatum: ev.date, status, grund, memberId: me.id, name: me.name, title: `${me.name} – ${ev.title}` };
        if (r[0]) await db.update('Zusagen', { ...r[0], ...data }); else await db.insert('Zusagen', data);
        if (status === 'zusage' || b.dataset.saveGrund !== undefined) { await route(); const n = document.querySelector(`#ev-${CSS.escape(ev.id)} .rsvp-body > .note`); msg(n, status === 'zusage' ? 'Zugesagt – bis dann!' : 'Abgesagt. Danke für die Rückmeldung.', 'ok'); }
        else { busy(b, false); msg(note, 'Abgesagt – Grund kannst du noch ergänzen.', 'ok'); }
      } catch (err) { msg(note, 'Speichern fehlgeschlagen: ' + errText(err)); busy(b, false); }
      return;
    }
    // Helferlisten: eintragen/austragen, löschen
    const h = e.target.closest('button[data-shift],button[data-del-list]');
    if (h) {
      const art = h.closest('.hl'); const l = listen.find(x => x._id === art.dataset.id); if (!l) return;
      busy(h, true);
      try {
        if (h.dataset.shift) {
          const mine = helfer.find(x => x.listeId === l._id && x.schichtId === h.dataset.shift && x.memberId === me.id);
          if (mine) await db.remove('Helfer', mine._id);
          else await db.insert('Helfer', { listeId: l._id, schichtId: h.dataset.shift, memberId: me.id, name: me.name, title: `${me.name} – ${l.titel}` });
        } else if (confirm('Diese Helferliste wirklich löschen?')) {
          for (const x of helfer.filter(x => x.listeId === l._id)) await db.remove('Helfer', x._id).catch(() => {});
          await db.remove('Helferlisten', l._id);
        } else { busy(h, false); return; }
        route();
      } catch (err) { msg(art.querySelector('.note'), 'Das hat nicht geklappt: ' + errText(err)); busy(h, false); }
      return;
    }
    // Mitfahren: einsteigen oder aussteigen – beim Einsteigen verschwindet das eigene Gesuch zum selben Termin
    const mf = e.target.closest('button[data-mitfahren]');
    if (mf) {
      const fahrtId = mf.closest('.fahrt').dataset.id; const r = fahrten.find(x => x._id === fahrtId); if (!r) return;
      const alle = secTermine.mitfahrten || []; const meins = alle.find(m => m.fahrtId === fahrtId && m.memberId === me.id);
      busy(mf, true);
      try {
        if (meins) await db.remove('Mitfahrten', meins._id);
        else {
          if (alle.filter(m => m.fahrtId === fahrtId).length >= Math.max(1, +r.plaetze || 1)) { msg(mf.closest('.rsvp').querySelector(':scope > .rsvp-body > .note'), 'Gerade voll geworden – jemand war schneller.'); busy(mf, false); return; }
          // Ohne Namen sieht die Person am Steuer nicht, wer mitkommt – sie ist auch die Einzige, die ihn sieht
          const wer = (me.name || myProfile?.name || '').trim() || (prompt('Wie heißt du? Nur wer die Fahrt anbietet, sieht den Namen.') || '').trim();
          if (!wer) { msg(mf.closest('.rsvp').querySelector(':scope > .rsvp-body > .note'), 'Bitte einen Namen angeben – sonst weiß die Person am Steuer nicht, wer mitfährt.'); busy(mf, false); return; }
          await db.insert('Mitfahrten', { fahrtId, eventId: r.eventId, eventTitel: r.eventTitel || '', memberId: me.id, name: wer, title: `${wer} fährt mit ${r.name}` });
          for (const g of fahrten.filter(x => x.eventId === r.eventId && x.typ === 'suche' && x.memberId === me.id)) await db.remove('Fahrgemeinschaften', g._id).catch(() => {});
        }
        route();
      } catch (err) { msg(mf.closest('.rsvp').querySelector(':scope > .rsvp-body > .note'), 'Das hat nicht geklappt: ' + errText(err)); busy(mf, false); }
      return;
    }
    // Angebot oder Gesuch löschen (Mitfahrende werden mit ausgetragen)
    const d = e.target.closest('button[data-del-ride]');
    if (d) {
      const id = d.closest('.fahrt').dataset.id; busy(d, true);
      try { for (const m of (secTermine.mitfahrten || []).filter(x => x.fahrtId === id)) await db.remove('Mitfahrten', m._id).catch(() => {}); await db.remove('Fahrgemeinschaften', id); route(); } catch (err) { busy(d, false); }
      return;
    }
    // Kalender-Adresse kopieren
    const c = e.target.closest('button[data-copy]');
    if (c) { try { await navigator.clipboard.writeText(c.dataset.copy); msg($('#ics-msg'), 'Adresse kopiert – im Kalender unter „Abonnement/Per URL“ einfügen.', 'ok'); } catch (err) { msg($('#ics-msg'), c.dataset.copy, 'info'); } }
  });
  // Termin anlegen / absagen → Auftrag an den Push-Dienst (der trägt es bei Wix Events ein)
  $('#f-event')?.addEventListener('submit', async e => {
    const f = e.target; e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; }
    const fd = new FormData(f); const btn = f.querySelector('[type=submit]'); busy(btn, true);
    const payload = { titel: fd.get('titel').trim(), datum: fd.get('datum'), von: fd.get('von'), bis: fd.get('bis'), ort: fd.get('ort').trim(), typ: fd.get('typ'), beschreibung: fd.get('beschreibung').trim() };
    try {
      await db.insert('Aktionen', { title: `Termin: ${payload.titel} ${payload.datum}`, typ: 'termin_erstellen', payload: JSON.stringify(payload), status: 'offen', von: me.name });
      f.reset(); msg(f.querySelector('.note'), DEMO ? 'In der echten App wird der Termin in den nächsten Minuten bei Wix eingetragen und erscheint dann auf der Website und in der App.' : 'Eingereicht – der Termin wird in den nächsten Minuten bei Wix eingetragen und erscheint dann auf der Website.', 'ok');
    } catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); }
    busy(btn, false);
  });
  // Termin bearbeiten: Formular zeigen und wieder verstecken
  v.addEventListener('click', e => {
    const auf = e.target.closest('button[data-edit-event]');
    if (auf) { const f = auf.closest('.rsvp-body')?.querySelector('form.ev-form'); if (f) { f.hidden = !f.hidden; if (!f.hidden) f.querySelector('input[name=titel]')?.focus(); } return; }
    const zu = e.target.closest('button[data-edit-abbruch]'); if (zu) { const f = zu.closest('form.ev-form'); if (f) f.hidden = true; }
  });
  // Geänderter Termin → Auftrag an den Push-Dienst (der ändert ihn bei Wix Events)
  v.addEventListener('submit', async e => {
    const f = e.target.closest('form.ev-form'); if (!f) return;
    e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; }
    const eventId = f.closest('.rsvp')?.dataset.id || '';
    const fd = new FormData(f); const btn = f.querySelector('[type=submit]'); busy(btn, true);
    const payload = { eventId, titel: fd.get('titel').trim(), datum: fd.get('datum'), von: fd.get('von'), bis: fd.get('bis'), ort: fd.get('ort').trim(), typ: fd.get('typ'), beschreibung: fd.get('beschreibung').trim() };
    try {
      await db.insert('Aktionen', { title: `Termin ändern: ${payload.titel} ${payload.datum}`, typ: 'termin_aendern', payload: JSON.stringify(payload), status: 'offen', von: me.name });
      msg(f.querySelector('.note'), DEMO ? 'In der echten App wird der Termin in den nächsten Minuten bei Wix geändert.' : 'Eingereicht – die Änderung ist in wenigen Minuten bei Wix und erscheint dann auf der Website und in der App.', 'ok');
    } catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); }
    busy(btn, false);
  });
  v.addEventListener('click', async e => {
    const b = e.target.closest('button[data-cancel-event]'); if (!b) return;
    const art = b.closest('.rsvp'); const ev = events.find(x => x.id === art.dataset.id); if (!ev || !confirm(`„${ev.title}“ wirklich absagen? Der Termin wird bei Wix abgesagt und verschwindet von der Website.`)) return;
    busy(b, true);
    try { await db.insert('Aktionen', { title: `Termin absagen: ${ev.title}`, typ: 'termin_absagen', payload: JSON.stringify({ eventId: ev.id, titel: ev.title }), status: 'offen', von: me.name }); msg(art.querySelector(':scope > .rsvp-body > .note'), 'Absage eingereicht – wird in den nächsten Minuten umgesetzt.', 'ok'); }
    catch (err) { msg(art.querySelector(':scope > .rsvp-body > .note'), errText(err)); busy(b, false); }
  });
  // Neue Helferliste
  const f = $('#f-hl');
  if (f) {
    $('#hl-add').addEventListener('click', () => { const r = document.createElement('div'); r.className = 'row mb-2 tight'; r.innerHTML = '<input type="text" placeholder="z. B. 11:00–13:00" aria-label="Zeit"><input type="number" min="1" max="30" value="2" aria-label="Plätze">'; $('#hl-shifts').appendChild(r); });
    f.addEventListener('submit', async e => {
      e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; }
      const btn = f.querySelector('[type=submit]'); busy(btn, true);
      const schichten = $$('#hl-shifts .row').map((r, i) => ({ id: 's' + (i + 1), zeit: r.children[0].value.trim(), plaetze: +r.children[1].value || 1 })).filter(s => s.zeit || s.plaetze);
      try {
        const fd = new FormData(f); const ev = events.find(x => x.id === fd.get('eventId'));
        const neu = await db.insert('Helferlisten', { titel: fd.get('titel').trim(), title: fd.get('titel').trim(), eventId: fd.get('eventId') || '', eventTitel: ev?.title || '', datum: fd.get('datum'), ort: fd.get('ort').trim(), beschreibung: fd.get('beschreibung').trim(), schichten, von: me.name });
        const id = neu?._id || neu?.dataItem?._id;
        location.hash = id ? '#termine/hl-' + id : ev ? '#termine/ev-' + ev.id : '#termine/helferlisten'; route();
      } catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
    });
  }
  // Fahrgemeinschaften
  $$('.ride-form', v).forEach(rf => rf.addEventListener('submit', async e => {
    e.preventDefault(); if (!rf.checkValidity()) { rf.reportValidity(); return; }
    const evId = rf.closest('.rides').dataset.ev; const ev = events.find(x => x.id === evId); const fd = new FormData(rf);
    const btn = rf.querySelector('[type=submit]'); busy(btn, true);
    try {
      await db.insert('Fahrgemeinschaften', { eventId: evId, eventTitel: ev?.title || '', eventDatum: ev?.date || '', typ: fd.get('typ'), ab: fd.get('ab').trim(), plaetze: +fd.get('plaetze') || 1, zeit: fd.get('zeit'), hinweis: '', memberId: me.id, name: me.name, title: `${me.name} – ${ev?.title || ''}` });
      location.hash = `#termine/ev-${evId}`; route();
    } catch (err) { msg(rf.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
  }));
}

// ---------- Umfragen ----------
async function secUmfragen(v) {
  let stimmFehler = '';
  const [intern, pub, stimmen] = await Promise.all([db.list('Umfragen', { desc: '_createdDate' }).catch(() => []), db.list('UmfragenOeffentlich', { desc: '_createdDate' }).catch(() => []), db.list('Stimmen', { limit: 1000 }).catch(e => { stimmFehler = errText(e); return []; })]);
  const meineZusagen = new Set((await db.list('Zusagen', { eq: { memberId: me.id } }).catch(() => [])).filter(z => z.status === 'zusage').map(z => z.eventId));
  const all = [...intern.filter(u => !u.nurZusagen || meineZusagen.has(u.eventId) || me.can('umfragen')).map(u => ({ ...u, col: 'Umfragen' })), ...pub.map(u => ({ ...u, col: 'UmfragenOeffentlich' }))].sort((a, b) => String(b._createdDate).localeCompare(String(a._createdDate)));
  const today = todayIso();
  const open = all.filter(u => u.offen && (!u.endetAm || u.endetAm >= today)), closed = all.filter(u => !open.includes(u));
  v.innerHTML = `
  ${sectionHead('Umfragen', me.can('umfragen') ? 'Du darfst Umfragen anlegen' : 'Umfragen legt der Vorstand an')}
  ${stimmFehler ? `<p class="note note-err">Die abgegebenen Stimmen konnten nicht geladen werden: ${esc(stimmFehler)}</p>` : ''}
  ${me.can('umfragen') ? `<div class="mb-create"><details class="mb-details" id="u-new"><summary>Umfrage anlegen</summary>
    <form class="form mb-form" id="f-umfrage" novalidate>
      <div class="field"><label for="u-frage">Frage</label><input id="u-frage" name="frage" type="text" required maxlength="140" placeholder="z. B. Sommerfest am 12. oder 19. Juli?"></div>
      <div class="field"><label for="u-text">Erläuterung (optional)</label><textarea id="u-text" name="beschreibung" rows="2"></textarea></div>
      <div class="field"><label for="u-opt">Antwortmöglichkeiten (eine pro Zeile)</label><textarea id="u-opt" name="optionen" rows="4" required placeholder="12. Juli&#10;19. Juli&#10;Mir egal"></textarea></div>
      <div class="field"><label for="u-ende">Läuft bis</label><input id="u-ende" name="endetAm" type="date" required value="${new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)}"></div>
      <label class="check"><input type="checkbox" name="mehrfach"> <span>Mehrfachauswahl erlauben</span></label>
      <label class="check"><input type="checkbox" name="oeffentlich"> <span>Öffentlich auf der Startseite („Umfrage der Woche“) – die Auswertung bleibt intern</span></label>
      <label class="check"><input type="checkbox" name="mitreden"> <span>Auf der Website unter <b>Mitreden → „Sie entscheiden mit“</b> – mit sichtbarem Ergebnis und dem Feld „Was daraus wurde“</span></label>
      <div class="field"><label for="u-max">Höchstens so viele Kreuze je Person <span class="muted">(1 = eine Antwort)</span></label><input id="u-max" name="maxWahl" type="number" min="1" max="10" value="1"></div>
      <p class="note" hidden></p>
      <div class="mb-actions"><button class="btn btn-rot" type="submit">Umfrage starten</button></div>
    </form></details></div>` : ''}
  <div class="poll-list">${open.length ? open.map(u => pollCard(u, stimmen, true)).join('') : '<p class="muted">Gerade läuft keine Umfrage.</p>'}</div>
  ${closed.length ? `<section class="mb-sub">${sectionHead('Abgeschlossen')}<div class="poll-list">${closed.slice(0, 10).map(u => pollCard(u, stimmen, false)).join('')}</div></section>` : ''}`;
  wirePolls(v, all, stimmen);
}
function pollCard(u, stimmen, open) {
  const votes = stimmen.filter(s => s.umfrageId === u._id);
  const mine = votes.find(s => s.memberId === me.id);
  const opts = u.optionen || [];
  const gewaehlt = s => (s.auswahl || []).map(Number);   // je nach Herkunft stehen dort Zahlen oder Text
  const counts = opts.map((_, i) => votes.filter(s => gewaehlt(s).includes(i)).length);
  const total = votes.length; const max = Math.max(1, ...counts);
  const showResults = !open || !!mine;
  const isPublic = u.col === 'UmfragenOeffentlich';
  return `<article class="mb-card poll" id="u-${esc(u._id)}" data-id="${esc(u._id)}" data-col="${esc(u.col)}">
    <div class="hl-head"><div><span class="tag ${isPublic ? 'tag-schwarz' : ''}">${isPublic ? 'Öffentlich' : 'Intern'}</span> <span class="small muted">von ${esc(u.von || '–')}${u.endetAm ? ` · ${open ? 'bis' : 'endete'} ${esc(fmtShort(u.endetAm))}` : ''} · ${total} Stimme${total === 1 ? '' : 'n'}</span><h4>${esc(u.frage)}</h4>${u.beschreibung ? `<p class="small">${nl2br(u.beschreibung)}</p>` : ''}</div>
    </div>
    ${showResults ? `<div class="poll-results">${opts.map((o, i) => `<div class="poll-row ${mine && gewaehlt(mine).includes(i) ? 'mine' : ''}"><span class="bar" style="width:${Math.round(counts[i] / max * 100)}%"></span><span class="lbl">${esc(o)}</span><span class="pct">${counts[i]}${total ? ` · ${Math.round(counts[i] / total * 100)} %` : ''}</span></div>`).join('')}</div>${mine && open ? '<p class="small muted">Du hast abgestimmt. Tippe auf eine Antwort, um deine Stimme zu ändern.</p>' : ''}` : ''}
    ${showResults && !isPublic && total && !!settings?.board.has(me.id) ? `<details class="poll-wer"><summary>Wer hat wie gestimmt? <span class="small muted">nur für den Vorstand sichtbar</span></summary>
      ${opts.map((o, i) => { const wer = votes.filter(x => gewaehlt(x).includes(i)).map(x => x.name || people.find(pp => pp.memberId === x.memberId)?.name || 'Unbekannt'); return `<p class="poll-wer-zeile"><b>${esc(o)}</b> <span class="small muted">${wer.length}</span><br><span class="small">${wer.length ? esc(wer.join(', ')) : '–'}</span></p>`; }).join('')}
      ${(() => { const dabei = new Set(votes.map(x => x.memberId).filter(Boolean)); const fehlt = people.filter(pp => pp.status !== 'inaktiv' && !dabei.has(pp.memberId)).map(pp => pp.name); return fehlt.length ? `<p class="poll-wer-zeile"><b>Noch nicht abgestimmt</b> <span class="small muted">${fehlt.length}</span><br><span class="small">${esc(fehlt.join(', '))}</span></p>` : '<p class="poll-wer-zeile"><b>Alle haben abgestimmt.</b></p>'; })()}
    </details>` : ''}
    ${open ? `<div class="poll-vote ${showResults ? 'compact' : ''} ${u.mehrfach ? 'mehrfach' : ''}">${opts.map((o, i) => `<button type="button" class="stimme" data-vote="${i}" aria-pressed="${!!mine && gewaehlt(mine).includes(i)}"><span>${esc(o)}</span></button>`).join('')}${u.mehrfach ? '<button type="button" class="btn btn-schwarz btn-sm" data-vote-save>Auswahl speichern</button>' : ''}</div><p class="small muted">${u.mehrfach ? 'Mehrere Antworten möglich. ' : ''}${isPublic ? 'Diese Umfrage läuft auch öffentlich auf der Startseite; die Auswertung sehen nur Mitglieder.' : 'Der Vorstand sieht, wer wie abgestimmt hat – die Abstimmung ist also nicht geheim.'}</p>` : ''}
    <p class="note" hidden></p>
    ${open ? `<div class="poll-foot"><button type="button" class="linkbtn share" data-share="${esc(`🗳️ Umfrage: ${u.frage}\n${isPublic ? 'Abstimmen auf der Startseite: ' + new URL(BASE + '/', location.href).href : 'Abstimmen im Mitgliederbereich: ' + appLink('#umfragen/u-' + u._id)}`)}">${SHARE_ICON}Teilen</button>${u._owner === me.id || me.can('umfragen') ? `<button type="button" class="linkbtn rot" data-close-poll>${ICON.close}Umfrage schließen</button>` : ''}</div>` : ''}
  </article>`;
}
function wirePolls(v, all, stimmen) {
  v.addEventListener('click', async e => {
    const b = e.target.closest('button[data-vote],button[data-vote-save],button[data-close-poll]'); if (!b) return;
    const art = b.closest('.poll'); const u = all.find(x => x._id === art.dataset.id); if (!u) return;
    const note = art.querySelector(':scope > .note');
    if (b.dataset.closePoll !== undefined) {
      if (!confirm('Umfrage jetzt schließen? Danach kann niemand mehr abstimmen.')) return;
      busy(b, true); try { await db.update(u.col, { ...stripCol(u), offen: false }); route(); } catch (err) { msg(note, errText(err)); busy(b, false); } return;
    }
    let auswahl;
    if (u.mehrfach) {
      if (b.dataset.vote !== undefined) { b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true')); return; }
      auswahl = $$('[data-vote][aria-pressed="true"]', art).map(x => String(x.dataset.vote));
      if (!auswahl.length) { msg(note, 'Bitte mindestens eine Antwort auswählen.'); return; }
    } else auswahl = [String(b.dataset.vote)];
    busy(b, true);
    try {
      const mine = stimmen.find(s => s.umfrageId === u._id && s.memberId === me.id);
      const data = { umfrageId: u._id, auswahl, memberId: me.id, name: me.name, title: `${me.name} – ${u.frage}` };
      if (mine) await db.update('Stimmen', { ...mine, ...data }); else await db.insert('Stimmen', data);
      route();
    } catch (err) { msg(note, 'Stimme nicht gespeichert: ' + errText(err)); busy(b, false); }
  });
  const f = $('#f-umfrage');
  f?.addEventListener('submit', async e => {
    e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; }
    const fd = new FormData(f); const optionen = String(fd.get('optionen')).split('\n').map(s => s.trim()).filter(Boolean);
    if (optionen.length < 2) { msg(f.querySelector('.note'), 'Bitte mindestens zwei Antwortmöglichkeiten.'); return; }
    const btn = f.querySelector('[type=submit]'); busy(btn, true);
    try {
      const col = fd.get('oeffentlich') || fd.get('mitreden') ? 'UmfragenOeffentlich' : 'Umfragen';
      const maxWahl = Math.max(1, Math.min(10, +fd.get('maxWahl') || 1));
      await db.insert(col, { frage: fd.get('frage').trim(), title: fd.get('frage').trim(), beschreibung: fd.get('beschreibung').trim(), optionen, mehrfach: !!fd.get('mehrfach') || maxWahl > 1, offen: true, endetAm: fd.get('endetAm'), von: me.name, vonId: me.id, ...(fd.get('mitreden') ? { mitreden: true, maxWahl, folge: '', ergebnis: '[]', stimmen: 0 } : {}) });
      if (fd.get('mitreden')) await standSetzen(db);
      route();
    } catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
  });
}
const stripCol = u => { const { col, ...rest } = u; return rest; };

// ---------- Dokumente ----------
async function secDokumente(v) {
  const docs = await db.list('Dokumente', { desc: '_createdDate' }).catch(() => []);
  const cats = ['Protokoll', 'Antrag', 'Beschluss', 'Vorlage', 'Sonstiges'];
  const groups = new Map(); for (const d of docs) { const k = d.kategorie || 'Sonstiges'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(d); }
  v.innerHTML = `
  ${sectionHead('Dokumente', 'Protokolle, Anträge, Vorlagen – nur für Mitglieder')}
  ${me.can('dokumente') ? `<div class="mb-create"><details class="mb-details" id="d-new"><summary>Dokument einstellen</summary>
    <form class="form mb-form" id="f-doc" novalidate>
      <div class="mb-2">
        <div class="field"><label for="d-titel">Titel</label><input id="d-titel" name="titel" type="text" required placeholder="z. B. Protokoll Vorstandssitzung 10/2026"></div>
        <div class="field"><label for="d-kat">Kategorie</label><select id="d-kat" name="kategorie">${opt(cats, 'Protokoll')}</select></div>
      </div>
      <div class="mb-2">
        <div class="field"><label for="d-datum">Datum</label><input id="d-datum" name="datum" type="date" required value="${todayIso()}"></div>
        <div class="field"><label for="d-url">Link zur Datei</label><input id="d-url" name="url" type="url" required placeholder="https://…"></div>
      </div>
      <div class="field"><label for="d-text">Kurzbeschreibung (optional)</label><textarea id="d-text" name="beschreibung" rows="2"></textarea></div>
      <p class="small muted">Datei vorher hochladen – z. B. in der Wix-Medienverwaltung oder Dateifreigabe (Link kopieren) oder in einer Cloud (OneDrive, Google Drive, Nextcloud) mit Freigabelink.</p>
      <p class="note" hidden></p>
      <div class="mb-actions"><button class="btn btn-rot" type="submit">Speichern</button></div>
    </form></details></div>` : ''}
  ${docs.length ? [...groups].map(([k, list]) => `<section class="mb-sub"><h4 class="doc-cat">${esc(k)}</h4><div class="doc-list">${list.map(d => `<article class="doc" data-id="${esc(d._id)}"><div class="doc-body"><a class="doc-title" href="${esc(linkOf(d) || '#')}" target="_blank" rel="noopener">📄 ${esc(d.titel)}</a><p class="small muted">${esc(fmtDate(d.datum))} · ${esc(d.von || '–')}</p>${d.beschreibung ? `<p class="small">${nl2br(d.beschreibung)}</p>` : ''}</div><div class="mb-actions">${linkOf(d) ? waBtn(`📄 ${d.titel}${d.kategorie ? ' (' + d.kategorie + ')' : ''}\n${linkOf(d)}`) : ''}${d._owner === me.id || me.can('dokumente') ? '<button type="button" class="linkbtn" data-del-doc>löschen</button>' : ''}</div></article>`).join('')}</div></section>`).join('') : '<p class="muted">Noch keine Dokumente eingestellt.</p>'}`;
  $('#f-doc')?.addEventListener('submit', async e => {
    const f = e.target; e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; }
    const fd = new FormData(f); const btn = f.querySelector('[type=submit]'); busy(btn, true);
    try { await db.insert('Dokumente', { titel: fd.get('titel').trim(), title: fd.get('titel').trim(), kategorie: fd.get('kategorie'), datum: fd.get('datum'), url: fd.get('url').trim(), beschreibung: fd.get('beschreibung').trim(), von: me.name }); route(); }
    catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
  });
  v.addEventListener('click', async e => {
    const b = e.target.closest('button[data-del-doc]'); if (!b || !confirm('Dokument aus der Liste entfernen?')) return;
    busy(b, true); try { await db.remove('Dokumente', b.closest('.doc').dataset.id); route(); } catch (err) { busy(b, false); }
  });
}

// ---------- Sitzungen: Rat, Ausschüsse, Fraktion, Vorstand, Versammlung – Haltung, Diskussion, Ergebnis je Punkt; Sitzungsmodus ----------
const POS = ['offen', 'dafür', 'dagegen', 'Enthaltung', 'Änderungsantrag'];
// Ergebnis eines Punkts: ein Tipp auf den Beschluss, dazu optional das Abstimmungsergebnis (17:12) und eine Anmerkung
const BESCHLUSS = [['angenommen', 'Angenommen'], ['abgelehnt', 'Abgelehnt'], ['geaendert', 'Geändert angenommen'], ['vertagt', 'Vertagt'], ['zurueckgezogen', 'Zurückgezogen'], ['kenntnis', 'Zur Kenntnis genommen']];
const beschlussLabel = k => (BESCHLUSS.find(([x]) => x === k) || [])[1] || '';
const hatErgebnis = t => !!(t && (t.beschluss || t.ergebnis));
const ergebnisText = t => [beschlussLabel(t.beschluss), t.abstimmung ? String(t.abstimmung).trim() : '', t.ergebnis ? String(t.ergebnis).trim() : ''].filter(Boolean).join(' · ');
const beschlussBadge = t => t.beschluss ? `<span class="pos besch-${esc(t.beschluss)}">${esc(beschlussLabel(t.beschluss))}</span>` : '';
const ergebnisVon = t => t.ergebnisVon ? `eingetragen von ${esc(t.ergebnisVon)}${t.ergebnisAm ? ' · ' + esc(new Date(t.ergebnisAm).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })) + ' Uhr' : ''}` : '';
const SITZUNG_TYPEN = ['Rat', 'Ausschuss', 'Fraktion', 'Vorstand', 'Versammlung', 'Sonstiges'];
const typVis = t => ({ Rat: 'Rat', Ausschuss: 'Rat', Fraktion: 'Fraktion', Vorstand: 'Vorstand' }[t] || 'Mitglieder');
const sitzungTyp = r => r.typ || (/vorstand/i.test(r.gremium || '') ? 'Vorstand' : /fraktion/i.test(r.gremium || '') ? 'Fraktion' : /ausschuss/i.test(r.gremium || '') ? 'Ausschuss' : 'Rat');
const fokus = { i: 0 };
async function secRat(v, editId = null, vorlage = null) {
  const all = (await db.list('Ratsvorbereitung', { desc: 'sitzung' }).catch(() => [])).filter(r => me.sees('termine:' + typVis(sitzungTyp(r))));
  const today = todayIso();
  const sub = location.hash.split('/')[1] || '';
  if (sub.startsWith('fokus-')) { const r = all.find(x => x._id === sub.slice(6)); if (r) return fokusSitzung(v, r); }
  if (sub.startsWith('rueckblick-') && istBrian()) { const r = all.find(x => x._id === sub.slice(11)); if (r) return rueckblick.sec(v, r); }
  const next = all.filter(r => (r.sitzung || '') >= today).sort((a, b) => a.sitzung.localeCompare(b.sitzung)), past = all.filter(r => (r.sitzung || '') < today);
  const editing = editId ? all.find(r => r._id === editId) : null;
  // Sitzungen der Stadt aus dem Bürgerinformationssystem (beim Bau geholt) – noch nicht angelegt
  const stadt = (SPD.sitzungen || []).filter(s => s.datum >= today && !all.some(r => r.sitzung === s.datum && String(r.gremium).toLowerCase().includes(String(s.gremium).toLowerCase().split(' ')[0])));
  const form = vorlage ? { typ: /^Rat\b/.test(vorlage.gremium) ? 'Rat' : 'Ausschuss', gremium: vorlage.gremium, sitzung: vorlage.datum, zeit: vorlage.zeit, ort: vorlage.ort, titel: '', link: vorlage.url, hinweis: '', tops: (vorlage.tops || []).map(t => ({ nr: t.nr, titel: t.titel + (t.vorlage ? ` (${t.vorlage})` : ''), position: 'offen', einordnung: '' })) } : editing;
  v.innerHTML = `
  ${sectionHead('Sitzungen', 'Rat, Ausschüsse, Fraktion, Vorstand – unsere Haltung, was besprochen wurde, was rauskam')}
  ${me.can('rat') ? `<div class="mb-create"><details class="mb-details" id="r-new" ${form ? 'open' : ''}><summary>${editing ? 'Sitzung bearbeiten' : vorlage ? 'Sitzung aus dem Bürgerinformationssystem' : 'Sitzung anlegen'}</summary>${ratForm(form)}</details></div>` : ''}
  ${me.can('rat') && stadt.length && !vorlage ? `<section class="rat-stadt"><h4 class="doc-cat">Nächste Sitzungen der Stadt <span class="small muted">(Bürgerinformationssystem, automatisch)</span></h4><div class="doc-list">${stadt.map((s2, i) => `<article class="doc"><div class="doc-body"><b>${esc(s2.gremium)}</b><p class="small muted">${esc(fmtDate(s2.datum))} · ${esc(s2.zeit)} Uhr · ${esc(s2.ort)} · ${s2.tops.length ? `${s2.tops.length} öffentliche Tagesordnungspunkte` : 'Tagesordnung noch nicht veröffentlicht'}</p></div><div class="mb-actions"><button type="button" class="btn btn-schwarz btn-sm" data-uebernehmen="${i}">${s2.tops.length ? 'Tagesordnung übernehmen' : 'Sitzung anlegen'}</button></div></article>`).join('')}</div><p class="small muted">Übernehmen legt die Sitzung mit allen Punkten an – ihr tragt dann nur noch eure Haltung je Punkt ein.</p></section>` : ''}
  <div class="rat-list">${next.length ? next.map(r => ratCard(r)).join('') : '<p class="muted">Keine kommende Sitzung eingetragen.</p>'}</div>
  ${past.length ? `<section class="mb-sub"><h4 class="doc-cat">Vergangene Sitzungen <span class="small muted">mit Ergebnissen</span></h4><div class="rat-list">${past.slice(0, 8).map(r => ratCard(r)).join('')}</div></section>` : ''}`;
  wireRat(v, all, stadt);
}
const posBadge = p => `<span class="pos pos-${esc(String(p || 'offen').replace(/[^a-zä]/gi, '').toLowerCase())}">${esc(p || 'offen')}</span>`;
function ratCard(r) {
  const tops = r.tops || [], entschieden = tops.filter(hatErgebnis).length;
  return `<article class="mb-card rat" data-id="${esc(r._id)}">
    <div class="hl-head"><div><span class="tag ${sitzungTyp(r) === 'Vorstand' ? 'tag-schwarz' : ''}">${esc(sitzungTyp(r))}</span>${r.b && r.b !== 'rat' ? ` <span class="tag tag-weiss">${esc(bereichVon(r.b).name)}</span>` : ''} <span class="small muted">${esc(fmtDate(r.sitzung))}${r.zeit ? ' · ' + esc(r.zeit) + ' Uhr' : ''}${r.ort ? ' · ' + esc(r.ort) : ''}</span><h4>${esc(r.gremium || 'Sitzung')}${r.titel ? ' – ' + esc(r.titel) : ''}</h4></div>
      <div class="mb-actions"><a class="btn btn-rot btn-sm" href="#rat/fokus-${esc(r._id)}">Sitzungsmodus</a>${r.link ? `<a class="btn btn-line btn-sm" href="${esc(r.link)}" target="_blank" rel="noopener">Bürgerinfosystem</a>` : ''}${me.can('rat') ? '<button type="button" class="btn btn-line btn-sm" data-edit-rat>Bearbeiten</button>' : ''}${istBrian() ? `<a class="btn btn-line btn-sm" href="#rat/rueckblick-${esc(r._id)}" title="Nur für dich: Abstimmungen, Notizen, Instagram-Skript, Kacheln">🎬 Rückblick</a>` : ''}</div></div>
    ${tops.length ? `<div class="tops">${tops.map(t => `<div class="top"><div class="top-nr">TOP ${esc(t.nr || '')}</div><div><b>${esc(t.titel)}</b> ${posBadge(t.position)}${hatErgebnis(t) ? `<p class="small top-ergebnis"><b>Ergebnis:</b> ${beschlussBadge(t)} ${esc([t.abstimmung, t.ergebnis].filter(Boolean).join(' · '))}</p>` : ''}${t.einordnung ? `<p class="small">${nl2br(t.einordnung)}</p>` : ''}${t.redner ? `<p class="small muted">Spricht: ${esc(t.redner)}</p>` : ''}</div></div>`).join('')}</div><p class="small muted">${tops.length} Punkte · ${tops.filter(t => t.position && t.position !== 'offen').length} mit Haltung · ${entschieden} mit Ergebnis</p>` : '<p class="small muted">Noch keine Tagesordnungspunkte eingetragen.</p>'}
    ${r.hinweis ? `<p class="small"><b>Hinweis:</b> ${nl2br(r.hinweis)}</p>` : ''}
    <p class="small muted">${r.protokoll ? `Ergebnisse trägt ein: <b>${esc(people.find(p => p.memberId === r.protokoll)?.name || '?')}</b> · ` : ''}Stand: ${esc(fmtWhen(r._updatedDate || r._createdDate))} · ${esc(r.von || '–')}</p>
  </article>`;
}
function ratForm(r) {
  const tops = r?.tops?.length ? r.tops : [{ nr: '', titel: '', position: 'offen', einordnung: '' }];
  return `<form class="form mb-form" id="f-rat" data-id="${esc(r?._id || '')}" novalidate>
    <div class="mb-3">
      <div class="field"><label for="ra-typ">Art</label><select id="ra-typ" name="typ">${opt(SITZUNG_TYPEN, r ? sitzungTyp(r) : 'Rat')}</select></div>
      <div class="field"><label for="ra-b">Ausschuss / Bereich</label><select id="ra-b" name="b"><option value="">– keiner –</option>${RAT_BEREICHE.map(b => `<option value="${b.id}" ${r?.b === b.id ? 'selected' : ''}>${esc(b.kind === 'Ausschuss' ? 'Ausschuss ' + b.name : b.name)}</option>`).join('')}</select><span class="small muted">Verknüpft die Sitzung mit der Ratsarbeit – die Dokumente des Bereichs stehen im Sitzungsmodus zum Nachschlagen.</span></div>
      <div class="field"><label for="ra-gr">Gremium</label><input id="ra-gr" name="gremium" type="text" list="gremien" required value="${esc(r?.gremium || 'Rat der Stadt Soltau')}"><datalist id="gremien"><option value="Rat der Stadt Soltau"><option value="Verwaltungsausschuss"><option value="Bauausschuss"><option value="Ausschuss für Wirtschaft und Finanzen"><option value="Feuerschutzausschuss"><option value="Schulausschuss"><option value="Kulturausschuss"><option value="Sozialausschuss"><option value="Aufsichtsrat Stadtwerke"><option value="Aufsichtsrat AWS"><option value="Fraktionssitzung"><option value="Vorstandssitzung"><option value="Mitgliederversammlung"></datalist></div>
      <div class="field"><label for="ra-datum">Sitzung am</label><input id="ra-datum" name="sitzung" type="date" required value="${esc(r?.sitzung || '')}"></div>
    </div>
    <div class="mb-3">
      <div class="field"><label for="ra-zeit">Uhrzeit</label><input id="ra-zeit" name="zeit" type="time" value="${esc(r?.zeit || '')}"></div>
      <div class="field"><label for="ra-ort">Ort</label><input id="ra-ort" name="ort" type="text" value="${esc(r?.ort || '')}" placeholder="z. B. Alte Reithalle"></div>
      <div class="field"><label for="ra-titel">Titel (optional)</label><input id="ra-titel" name="titel" type="text" value="${esc(r?.titel || '')}" placeholder="z. B. Haushalt 2027"></div>
    </div>
    <div class="field"><label for="ra-protokoll">Ergebnisse trägt ein (Sitzungsleitung / Protokoll)</label><select id="ra-protokoll" name="protokoll"><option value="">– alle mit dem Recht „Ratsvorbereitung pflegen“ –</option>${people.map(p => `<option value="${esc(p.memberId)}" ${r?.protokoll === p.memberId ? 'selected' : ''}>${esc(p.name)}${p.memberId === me.id ? ' (du)' : ''}</option>`).join('')}</select><span class="small muted">Diese Person leitet im Sitzungsmodus („Ich leite“ – alle Geräte folgen ihrem Punkt).</span>
      <label class="check" style="margin-top:8px"><input type="checkbox" name="ergebnisAlle" ${r?.ergebnisAlle ? 'checked' : ''}><span>Alle in der Sitzung dürfen Ergebnisse eintragen. <span class="muted">Sonst nur diese Person und wer „Ratsvorbereitung pflegen“ darf – alle anderen sehen das Ergebnis nur.</span></span></label></div>
    <div class="field"><label for="ra-link">Link (Bürgerinformationssystem, optional)</label><input id="ra-link" name="link" type="url" value="${esc(r?.link || '')}"></div>
    <div class="field"><label>Tagesordnungspunkte – je Punkt: Haltung, Argumente, wer spricht, was intern diskutiert wurde, Ergebnis</label>
      <div id="ra-tops" class="rows">${tops.map(t => topRow(t)).join('')}</div>
      <button type="button" class="linkbtn" id="ra-add">+ Punkt hinzufügen</button>
    </div>
    <div class="field"><label>Zum Nachschlagen im Sitzungsmodus – Dokumente &amp; Links (optional)</label>
      <span class="small muted">Vorlagen, Protokolle, Anträge, Links. Mit TOP-Nummer erscheint das Dokument direkt beim Punkt. Die Dokumente des gewählten Bereichs aus der Ratsarbeit erscheinen von selbst.</span>
      <div id="ra-doks" class="rows">${(Array.isArray(r?.dokumente) ? r.dokumente : []).map(dokRow).join('')}</div>
      <div class="mb-actions"><button type="button" class="linkbtn" id="ra-dok-add">+ Link oder Dokument eintragen</button><select id="ra-dok-pick" aria-label="Aus vorhandenen Dokumenten übernehmen"><option value="">aus vorhandenen Dokumenten übernehmen …</option></select></div>
    </div>
    <div class="field"><label for="ra-hinweis">Hinweis für alle (optional)</label><textarea id="ra-hinweis" name="hinweis" rows="2">${esc(r?.hinweis || '')}</textarea></div>
    <p class="note" hidden></p>
    <div class="mb-actions"><button class="btn btn-rot" type="submit">${r?._id ? 'Änderungen speichern' : 'Sitzung speichern'}</button>${r ? '<button class="btn btn-line" type="button" id="ra-cancel">Abbrechen</button>' : ''}${r?._id ? '<button class="btn btn-line" type="button" id="ra-del">Löschen</button>' : ''}</div>
  </form>`;
}
const topRow = t => `<div class="row top-row"><input type="text" placeholder="Nr." value="${esc(t.nr || '')}" aria-label="TOP-Nummer"><input type="text" placeholder="Titel des Tagesordnungspunkts" value="${esc(t.titel || '')}" aria-label="Titel"><select aria-label="Haltung">${opt(POS, t.position || 'offen')}</select><textarea rows="2" placeholder="Unsere Haltung und Argumente (optional)" aria-label="Argumente">${esc(t.einordnung || '')}</textarea><details class="top-mehr"><summary>Mehr: wer spricht · intern diskutiert · Ergebnis</summary><input type="text" placeholder="Wer spricht dazu?" value="${esc(t.redner || '')}" aria-label="Redner"><textarea rows="2" placeholder="Was wurde bei uns intern besprochen?" aria-label="Diskussion">${esc(t.diskussion || '')}</textarea><textarea rows="2" placeholder="Ergebnis / Beschluss (nach der Sitzung)" aria-label="Ergebnis">${esc(t.ergebnis || '')}</textarea></details><button type="button" class="linkbtn" data-del-top>entfernen</button></div>`;
const topLesen = r => ({ nr: r.children[0].value.trim(), titel: r.children[1].value.trim(), position: r.children[2].value, einordnung: r.children[3].value.trim(), redner: r.querySelector('[aria-label=Redner]').value.trim(), diskussion: r.querySelector('[aria-label=Diskussion]').value.trim(), ergebnis: r.querySelector('[aria-label=Ergebnis]').value.trim() });
const dokRow = d => `<div class="row dok-row"><input type="text" placeholder="TOP" value="${esc(d.top || '')}" aria-label="TOP-Nummer"><input type="text" placeholder="Titel, z. B. Vorlage Haushalt 2027" value="${esc(d.titel || '')}" aria-label="Titel"><input type="text" placeholder="Link (https://… oder #ratsarbeit/…)" value="${esc(d.url || '')}" aria-label="Link"><button type="button" class="linkbtn" data-del-dok aria-label="Entfernen">×</button></div>`;
const dokLesen = r => ({ top: r.children[0].value.trim(), titel: r.children[1].value.trim(), url: r.children[2].value.trim() });
// Auswahlliste „aus vorhandenen Dokumenten übernehmen“: Dokumente aller Mitglieder, dazu Ratsarbeit-Dokumente und Anträge (entschlüsselt)
async function dokPickFuellen(sel) {
  const gruppen = [];
  try { const docs = await db.list('Dokumente', { desc: '_createdDate', limit: 100 }); if (docs.length) gruppen.push(['Dokumente (alle Mitglieder)', docs.map(d => ({ titel: d.titel || d.title, url: d.url || '#dokumente' }))]); } catch (e) { /* ohne */ }
  try { const rz = await ratsarbeit.dokumenteListe(); if (rz.length) gruppen.push(['Ratsarbeit – Dokumente', rz.map(d => ({ titel: `${d.titel || 'Dokument'} (${bereichVon(d.b).name})`, url: '#ratsarbeit/d-' + d._id }))]); } catch (e) { /* ohne */ }
  try { const an = await ratsarbeit.antraegeFuerSuche(); if (an.length) gruppen.push(['Ratsarbeit – Anträge', an.map(a => ({ titel: `Antrag: ${a.titel || 'Antrag'}`, url: '#ratsarbeit/a-' + a._id }))]); } catch (e) { /* ohne */ }
  if (!sel.isConnected) return;
  sel.insertAdjacentHTML('beforeend', gruppen.map(([g, items]) => `<optgroup label="${esc(g)}">${items.map(d => `<option value="${esc(d.url)}" data-titel="${esc(d.titel)}">${esc(d.titel)}</option>`).join('')}</optgroup>`).join(''));
  sel.hidden = !gruppen.length;
}
function wireRat(v, all, stadt = []) {
  const f = $('#f-rat');
  if (f) {
    $('#ra-add').addEventListener('click', () => { const d = document.createElement('div'); d.innerHTML = topRow({}); $('#ra-tops').appendChild(d.firstElementChild); });
    f.addEventListener('click', e => { const b = e.target.closest('button[data-del-top]'); if (b) b.closest('.top-row').remove(); const d = e.target.closest('button[data-del-dok]'); if (d) d.closest('.dok-row').remove(); });
    // Ausschuss/Bereich gewählt → Gremium vorschlagen (solange dort noch der Standard oder ein Vorschlag steht) und Art anpassen
    const vorschlaege = new Set(['', 'Rat der Stadt Soltau', ...RAT_BEREICHE.map(b => gremiumVon(b.id))]);
    $('#ra-b').addEventListener('change', () => { const bid = $('#ra-b').value; if (!bid) return; if (vorschlaege.has($('#ra-gr').value.trim())) $('#ra-gr').value = gremiumVon(bid); if (bid !== 'rat' && $('#ra-typ').value === 'Rat') $('#ra-typ').value = 'Ausschuss'; if (bid === 'rat' && $('#ra-typ').value === 'Ausschuss') $('#ra-typ').value = 'Rat'; });
    $('#ra-typ').addEventListener('change', () => { if ($('#ra-typ').value === 'Ausschuss' && !$('#ra-b').value) $('#ra-b').focus(); });
    $('#ra-dok-add').addEventListener('click', () => { const d = document.createElement('div'); d.innerHTML = dokRow({}); const row = d.firstElementChild; $('#ra-doks').appendChild(row); row.querySelector('input:nth-child(2)').focus(); });
    const pick = $('#ra-dok-pick'); pick.hidden = true; dokPickFuellen(pick);
    pick.addEventListener('change', () => { const o = pick.selectedOptions[0]; if (!o || !o.value) return; const d = document.createElement('div'); d.innerHTML = dokRow({ titel: o.dataset.titel, url: o.value }); $('#ra-doks').appendChild(d.firstElementChild); pick.value = ''; });
    $('#ra-cancel')?.addEventListener('click', () => route());
    $('#ra-del')?.addEventListener('click', async () => { if (!confirm('Sitzung wirklich löschen?')) return; try { await db.remove('Ratsvorbereitung', f.dataset.id); route(); } catch (err) { msg(f.querySelector('.note'), errText(err)); } });
    f.addEventListener('submit', async e => {
      e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; }
      const fd = new FormData(f); const btn = f.querySelector('[type=submit]'); busy(btn, true);
      const tops = $$('#ra-tops .top-row').map(topLesen).filter(t => t.titel);
      const dokumente = $$('#ra-doks .dok-row').map(dokLesen).filter(d => d.titel || d.url).map(d => ({ ...d, titel: d.titel || d.url }));
      const data = { typ: fd.get('typ'), b: fd.get('b') || '', protokoll: fd.get('protokoll') || '', ergebnisAlle: fd.get('ergebnisAlle') === 'on', gremium: fd.get('gremium').trim(), sitzung: fd.get('sitzung'), zeit: fd.get('zeit'), ort: fd.get('ort').trim(), titel: fd.get('titel').trim(), title: `${fd.get('gremium')} ${fd.get('sitzung')}`, link: fd.get('link').trim(), tops, dokumente, hinweis: fd.get('hinweis').trim(), von: me.name };
      try {
        const cur = all.find(r => r._id === f.dataset.id);
        if (cur) await db.update('Ratsvorbereitung', { ...cur, ...data }); else await db.insert('Ratsvorbereitung', data);
        route();
      } catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
    });
  }
  v.addEventListener('click', e => {
    const fo = e.target.closest('a[href^="#rat/fokus-"]');
    if (fo && matchMedia('(pointer: coarse)').matches && !matchMedia('(display-mode: standalone)').matches && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    const u = e.target.closest('button[data-uebernehmen]'); if (u) { secRat(v, null, stadt[+u.dataset.uebernehmen]); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const b = e.target.closest('button[data-edit-rat]'); if (!b) return; secRat(v, b.closest('.rat').dataset.id);
  });
}
// Sitzungsmodus: Vollbild ohne Menü und Kopf – ein Punkt groß auf dem Bildschirm (Haltung, Argumente, wer spricht, intern Besprochenes),
// Ergebnis direkt eintragen, Dokumente zum Nachschlagen (eigene Liste + Ratsarbeit des Bereichs), Bildschirm bleibt an, Erklärung beim ersten Mal.
let wakeLock = null;
async function wachBleiben(an) {
  try {
    if (an && !wakeLock && 'wakeLock' in navigator) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    if (!an && wakeLock) { const w = wakeLock; wakeLock = null; await w.release(); }
  } catch (e) { wakeLock = null; }
  return !!wakeLock;
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && document.body.classList.contains('fokus-modus')) wachBleiben(true); });
// Live: alle Geräte holen alle 6 s den Stand der Sitzung (Ergebnisse, aktueller Punkt der Sitzungsleitung) und den Chat
const live = { timer: null, id: null, r: null, msgs: [], folgen: true, leiten: false, chatOffen: false, ungelesen: 0, gruppe: 'fraktion', chatStatus: null, v: null, erklaertOffen: false };
function liveStop() { clearInterval(live.timer); live.timer = null; live.id = null; live.v = null; }
function fokusEnde() { document.body.classList.remove('fokus-modus'); wachBleiben(false); liveStop(); notizen.beenden(); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); }
const chatZeit = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); };
function chatHtml() {
  const st = live.chatStatus;
  const letzte = live.msgs[live.msgs.length - 1];
  return `<div class="fokus-chat${live.chatOffen ? ' offen' : ''}" id="fo-chat">
    <button type="button" class="fokus-chat-kopf" id="fo-chat-toggle" aria-expanded="${live.chatOffen}"><span class="fokus-chat-titel">💬 ${live.gruppe === 'vorstand' ? 'Vorstands-Chat' : 'Fraktions-Chat'}${live.ungelesen && !live.chatOffen ? ` <b class="mb-badge">${live.ungelesen}</b>` : ''}</span><span class="fokus-chat-vorschau small">${live.chatOffen ? 'nur für uns · verschlüsselt' : letzte ? `${esc(letzte.name.split(' ')[0])}: ${esc(letzte.text.slice(0, 60))}` : 'nur für uns – schnell was klären'}</span><span class="fokus-chat-pfeil">${live.chatOffen ? '▾' : '▴'}</span></button>
    <div class="fokus-chat-body" ${live.chatOffen ? '' : 'hidden'}>
      <div class="fokus-chat-liste" id="fo-chat-liste">${st === 'ok' ? (live.msgs.length ? live.msgs.map(m => `<div class="fokus-msg${m.memberId === me.id ? ' meine' : ''}"><span class="fokus-msg-kopf">${esc(m.memberId === me.id ? 'du' : m.name)} · ${chatZeit(m._createdDate)}</span><span class="fokus-msg-text">${esc(m.text)}</span>${m.bild ? `<a href="${m.bild}" target="_blank" rel="noopener"><img class="fokus-msg-bild" src="${m.bild}" alt="Geteilte Skizze"></a>` : ''}</div>`).join('') : '<p class="small muted">Noch nichts geschrieben. Was hier steht, sehen nur die, die den Gruppenschlüssel haben – und es bleibt in der Sitzung.</p>') : st === null ? '<p class="small muted">Chat wird geladen …</p>' : st === 'wartet' ? '<p class="small muted">Chat noch nicht verfügbar: Der Push-Dienst schaltet den Schlüssel dieses Geräts in den nächsten Minuten frei.</p>' : '<p class="small muted">Chat nicht verfügbar – dafür braucht es den Gruppenschlüssel (Ratsarbeit/Vorstand).</p>'}</div>
      <form class="fokus-chat-form" id="fo-chat-form"><input type="text" id="fo-chat-in" maxlength="500" placeholder="Kurz an alle …" autocomplete="off" ${st === 'ok' ? '' : 'disabled'}><button class="btn btn-rot btn-sm" type="submit" ${st === 'ok' ? '' : 'disabled'}>Senden</button></form>
    </div>
  </div>`;
}
function chatRender(v) {
  const alt = $('#fo-chat', v); if (!alt) return;
  const tippte = $('#fo-chat-in', alt)?.value || '', hatteFokus = document.activeElement?.id === 'fo-chat-in';
  const d = document.createElement('div'); d.innerHTML = chatHtml(); const neu = d.firstElementChild; alt.replaceWith(neu); chatWire(v);
  const inp = $('#fo-chat-in', neu); if (inp) { inp.value = tippte; if (hatteFokus) inp.focus(); }
  const l = $('#fo-chat-liste', neu); if (l) l.scrollTop = l.scrollHeight;
}
function chatWire(v) {
  $('#fo-chat-toggle', v)?.addEventListener('click', () => { live.chatOffen = !live.chatOffen; if (live.chatOffen) live.ungelesen = 0; chatRender(v); if (live.chatOffen) $('#fo-chat-in', v)?.focus(); });
  $('#fo-chat-form', v)?.addEventListener('submit', async e => {
    e.preventDefault(); const inp = $('#fo-chat-in', v); const text = inp.value.trim(); if (!text || live.chatStatus !== 'ok') return;
    inp.value = ''; const btn = e.target.querySelector('button'); busy(btn, true);
    try { await db.insert('SitzungChat', { sitzungId: live.id, memberId: me.id, name: me.name, title: `${me.name} – Chat`, daten: await schluessel.encJson(live.gruppe, { text }) }); await livePoll(true); }
    catch (err) { inp.value = text; msg($('#fo-chat-liste', v), 'Nicht gesendet: ' + errText(err)); }
    busy(btn, false);
  });
}
async function livePoll(sofort = false) {
  const v = live.v; if (!v || !live.id || (!sofort && document.visibilityState !== 'visible')) return;
  const id = live.id;
  // Stand der Sitzung: Ergebnisse, aktueller Punkt der Sitzungsleitung
  try {
    const [neu] = await db.list('Ratsvorbereitung', { eq: { _id: id }, limit: 1 });
    if (neu && live.id === id && neu._updatedDate !== live.r._updatedDate) {
      live.r = neu;
      const folgt = live.folgen && !live.leiten && Number.isInteger(neu.aktuell) && neu.aktuell !== fokus.i;
      if (folgt) fokus.i = neu.aktuell;
      // Wer gerade ein Ergebnis tippt, wird nicht unterbrochen – der neue Stand kommt beim nächsten Wechsel
      if (!['fo-ergebnis', 'fo-abst'].includes(document.activeElement?.id)) fokusSitzung(v, neu, true);
    }
  } catch (e) { /* nächster Versuch in 6 s */ }
  // Chat (verschlüsselt mit dem Gruppenschlüssel)
  if (live.chatStatus === null) { try { live.chatStatus = await schluessel.laden(live.gruppe); } catch (e) { live.chatStatus = 'fehler'; } if (live.id === id) chatRender(v); }
  if (live.chatStatus !== 'ok') return;
  try {
    const rows = await db.list('SitzungChat', { eq: { sitzungId: id }, desc: '_createdDate', limit: 80 });
    if (live.id !== id) return;
    const bekannt = new Set(live.msgs.map(m => m._id));
    const frisch = rows.filter(m => !bekannt.has(m._id));
    if (!frisch.length) return;
    const dec = await Promise.all(frisch.map(async m => { const d = await schluessel.decJson(live.gruppe, m.daten); return { ...m, text: d.text || (d.bild ? '' : '(nicht lesbar)'), bild: /^data:image\//.test(d.bild || '') ? d.bild : '' }; }));
    live.msgs = [...live.msgs, ...dec].sort((a, b) => String(a._createdDate).localeCompare(String(b._createdDate))).slice(-80);
    if (!live.chatOffen) live.ungelesen += dec.filter(m => m.memberId !== me.id).length;
    chatRender(v);
  } catch (e) { /* nächster Versuch */ }
}
const POS_TEXT = { offen: 'noch nicht festgelegt', 'dafür': 'wir stimmen dafür', dagegen: 'wir stimmen dagegen', Enthaltung: 'wir enthalten uns', 'Änderungsantrag': 'wir stellen einen Änderungsantrag' };
function fokusSitzung(v, r, vomPoll = false) {
  const chatTipp = $('#fo-chat-in', v)?.value || '';
  const tops = r.tops || [], docs = Array.isArray(r.dokumente) ? r.dokumente : [];
  const kann = me.can('rat') || (!!r.protokoll && r.protokoll === me.id); // leiten, Ergebnisse immer
  const darfErgebnis = kann || r.ergebnisAlle === true; // Standard: nur Sitzungsleitung/Protokoll (und wer „Ratsvorbereitung pflegen“ darf); alle nur, wenn in der Sitzung freigegeben
  if (live.id !== r._id) {
    liveStop();
    Object.assign(live, { id: r._id, r, v, msgs: [], folgen: !kann, leiten: false, chatOffen: false, ungelesen: 0, chatStatus: null, erklaertOffen: false, gruppe: ['Vorstand', 'Versammlung'].includes(sitzungTyp(r)) ? 'vorstand' : 'fraktion' });
    if (live.folgen && Number.isInteger(r.aktuell)) fokus.i = r.aktuell;
    live.timer = setInterval(() => livePoll(), 6000);
    setTimeout(() => livePoll(true), 50);
  }
  live.r = r; live.v = v;
  fokus.i = Math.min(Math.max(fokus.i, 0), Math.max(tops.length - 1, 0));
  const t = tops[fokus.i] || {};
  const protokollName = r.protokoll ? (people.find(p => p.memberId === r.protokoll)?.name || '') : '';
  document.body.classList.add('fokus-modus');
  const dokLink = d => { const extern = /^https?:/i.test(d.url || ''); return `<a class="fokus-dok" href="${esc(d.url || '#')}" ${extern ? 'target="_blank" rel="noopener"' : ''}>${extern ? ICON.link : ICON.doc}<span>${esc(d.titel || d.url)}</span>${d.top ? `<small>TOP ${esc(d.top)}</small>` : ''}${d.kat ? `<small>${esc(d.kat)}</small>` : ''}</a>`; };
  const nrVon = (x, i) => String(x.nr || i + 1);
  const dazu = docs.filter(d => d.top && String(d.top) === nrVon(t, fokus.i));
  const bereichName = r.b ? bereichVon(r.b).name : '';
  v.innerHTML = `<div class="fokus">
    <div class="fokus-bar"><span class="fokus-bar-tag">Sitzungsmodus</span><b class="fokus-bar-titel">${esc(r.gremium || 'Sitzung')}</b><button type="button" class="fokus-hilfe" id="fo-hilfe" aria-label="So funktioniert der Sitzungsmodus" title="So funktioniert der Sitzungsmodus">?</button><a class="btn btn-line btn-sm fokus-ende" href="#rat">${ICON.close}Beenden</a><span class="small fokus-bar-meta">${esc(fmtDate(r.sitzung))}${r.zeit ? ' · ' + esc(r.zeit) + ' Uhr' : ''}${r.ort ? ' · ' + esc(r.ort) : ''}${r.titel ? ' · ' + esc(r.titel) : ''}</span></div>
    <details class="fokus-erklaert" id="fo-erklaert" ${live.erklaertOffen ? 'open' : ''}><summary>So funktioniert der Sitzungsmodus</summary>
      <ul>
        <li><b>Ein Tagesordnungspunkt pro Bildschirm.</b> Weiter mit „Nächster“, Wischen nach links/rechts oder den Pfeiltasten. Unten stehen alle Punkte – antippen springt hin.</li>
        <li><b>Haltung</b> = so will die Fraktion abstimmen: <span class="pos pos-dafr">dafür</span> <span class="pos pos-dagegen">dagegen</span> <span class="pos pos-enthaltung">Enthaltung</span> <span class="pos pos-nderungsantrag">Änderungsantrag</span> <span class="pos">offen</span></li>
        <li><b>Unsere Haltung &amp; Argumente</b> darfst du laut sagen. <b>Intern besprochen</b> bleibt in der Fraktion.</li>
        <li><b>Es spricht</b> = wer für uns redet. <b>Ergebnis</b> = wie entschieden wurde: ein Tipp auf „Angenommen“, „Abgelehnt“ usw., dazu bei Bedarf das Abstimmungsergebnis (17:12). ${r.ergebnisAlle ? 'Das darf hier jede*r – Name und Uhrzeit stehen dabei, der letzte Eintrag gilt, alle Geräte zeigen ihn nach wenigen Sekunden.' : `In dieser Sitzung trägt es ${protokollName ? esc(protokollName) : 'die Sitzungsleitung'} ein; dein Gerät zeigt es nach wenigen Sekunden.`}</li>
        <li><b>Live:</b> Wer leitet, tippt „Ich leite“ – dann springen alle Geräte, die „folgen“, mit zum aktuellen Punkt. Blättern darfst du trotzdem jederzeit selbst.</li>
        <li><b>Chat</b> unten: schnell etwas an die ${live.gruppe === 'vorstand' ? 'Vorstandsrunde' : 'Fraktion'} – verschlüsselt, nur für die mit Gruppenschlüssel.</li>
        <li><b>Zum Nachschlagen:</b> Vorlagen, Protokolle und Links zu dieser Sitzung stehen beim Punkt und ganz unten${bereichName ? `, dazu die Dokumente aus der Ratsarbeit (${esc(bereichName)})` : ''}.</li>
        <li>Menü und Kopf sind ausgeblendet, der Bildschirm bleibt an. Zurück über <b>Beenden</b> oben rechts.</li>
      </ul>
      <button type="button" class="btn btn-schwarz btn-sm" id="fo-verstanden">Verstanden</button>
    </details>
    <div class="fokus-zeile"><span class="fokus-zaehler">${tops.length ? `Punkt ${fokus.i + 1} von ${tops.length}` : 'keine Punkte'}</span>${kann ? `<button type="button" class="chip" id="fo-leiten" aria-pressed="${live.leiten}" title="Alle Geräte, die folgen, springen mit zu deinem Punkt">${live.leiten ? '✓ Ich leite – alle folgen' : 'Ich leite die Sitzung'}</button>` : `<button type="button" class="chip" id="fo-folgen" aria-pressed="${live.folgen}" title="Zum Punkt der Sitzungsleitung springen">${live.folgen ? '✓ Ich folge der Sitzungsleitung' : 'Der Sitzungsleitung folgen'}</button>`}<button type="button" class="chip" id="fo-notizen" title="Meine Notizen zu dieser Sitzung – Text oder mit dem Stift">✎ Notizen</button><span class="fokus-wach small" id="fo-wach" hidden>● Bildschirm bleibt an</span></div>
    ${!r.ergebnisAlle ? `<p class="small muted fokus-wer">Das Ergebnis trägt ${protokollName ? `<b>${esc(protokollName)}</b>` : 'die Sitzungsleitung'} ein${kann && r.protokoll !== me.id ? ' – und du' : ''}; alle anderen sehen es nach wenigen Sekunden.</p>` : `<p class="small muted fokus-wer">Ergebnisse kann hier jede*r eintragen – ein Tipp genügt, Name und Uhrzeit stehen dabei.${protokollName ? ` Sitzungsleitung: <b>${esc(protokollName)}</b>.` : ''}</p>`}
    ${tops.length ? `<div class="fokus-top" id="fo-top">
      <div class="fokus-nr">TOP ${esc(nrVon(t, fokus.i))}</div>
      <h2 class="fokus-titel">${esc(t.titel || '')}</h2>
      <div class="fokus-haltung-zeile"><div class="fokus-haltung pos-${esc(String(t.position || 'offen').replace(/[^a-zä]/gi, '').toLowerCase())}">${esc(t.position || 'offen')}</div><span class="small muted">${esc(POS_TEXT[t.position] || POS_TEXT.offen)}</span></div>
      ${t.einordnung ? `<div class="fokus-block"><span class="fokus-label">Unsere Haltung &amp; Argumente <small>darf öffentlich gesagt werden</small></span><p>${nl2br(t.einordnung)}</p></div>` : ''}
      ${t.redner ? `<div class="fokus-block"><span class="fokus-label">Es spricht <small>für die Fraktion</small></span><p>${esc(t.redner)}</p></div>` : ''}
      ${t.diskussion ? `<div class="fokus-block intern"><span class="fokus-label">Intern besprochen <small>bleibt in der Fraktion</small></span><p>${nl2br(t.diskussion)}</p></div>` : ''}
      ${dazu.length ? `<div class="fokus-block"><span class="fokus-label">Dazu nachschlagen</span><div class="fokus-doks">${dazu.map(dokLink).join('')}</div></div>` : ''}
      <div class="fokus-block fokus-ergebnis"><span class="fokus-label">Ergebnis <small>wie entschieden wurde</small></span>
        ${hatErgebnis(t) ? `<p class="fokus-ergebnis-text">${beschlussBadge(t)} ${esc([t.abstimmung, t.ergebnis].filter(Boolean).join(' · '))}</p><p class="small muted">${ergebnisVon(t)}</p>` : '<p><span class="muted">noch offen</span></p>'}
        ${darfErgebnis ? (() => { const haupt = BESCHLUSS.slice(0, 2).concat([BESCHLUSS[3]]), weitere = [BESCHLUSS[2], BESCHLUSS[4], BESCHLUSS[5]]; const mehrOffen = weitere.some(([k]) => k === t.beschluss) || !!t.ergebnis; const chip = ([k, l]) => `<button type="button" class="chip" data-beschluss="${k}" aria-pressed="${t.beschluss === k}">${l}</button>`; return `<div class="fokus-beschluss">${haupt.map(chip).join('')}<button type="button" class="chip fokus-mehr" id="fo-mehr" aria-expanded="${mehrOffen}" aria-controls="fo-mehr-box">Mehr ▾</button></div>
        <div class="fokus-beschluss fokus-beschluss-mehr" id="fo-mehr-box" ${mehrOffen ? '' : 'hidden'}>${weitere.map(chip).join('')}<input type="text" id="fo-ergebnis" maxlength="200" placeholder="Anmerkung, z. B. mit unserem Änderungsantrag" value="${esc(t.ergebnis || '')}" aria-label="Anmerkung"></div>
        <div class="fokus-ergebnis-mehr"><label for="fo-abst" class="small muted">Abstimmung</label><input type="text" id="fo-abst" maxlength="30" placeholder="z. B. 17 : 12" value="${esc(t.abstimmung || '')}" aria-label="Abstimmungsergebnis" enterkeyhint="done"></div>
`; })() : ''}
        ${darfErgebnis ? `<div class="mb-actions"><span class="small muted" id="fo-msg"></span>${hatErgebnis(t) ? '<button type="button" class="linkbtn" id="fo-reset">Ergebnis löschen</button>' : ''}</div>` : ''}</div>
    </div>
    <div class="fokus-nav"><button class="btn btn-line" type="button" id="fo-prev" ${fokus.i === 0 ? 'disabled' : ''}>‹ Vorheriger</button><button class="btn btn-rot" type="button" id="fo-next" ${fokus.i >= tops.length - 1 ? 'disabled' : ''}>Nächster ›</button></div>` : '<p class="muted">Diese Sitzung hat noch keine Tagesordnungspunkte.</p>'}
    <details class="fokus-alle" ${tops.length > 1 ? 'open' : ''}><summary>Alle Punkte auf einen Blick</summary>
      <table class="fokus-tabelle"><thead><tr><th>TOP</th><th>Punkt</th><th>Haltung</th><th>Ergebnis</th></tr></thead><tbody>${tops.map((x, i) => `<tr class="${i === fokus.i ? 'aktiv' : ''}" data-i="${i}"><td>${esc(nrVon(x, i))}</td><td>${esc(x.titel)}${x.redner ? `<br><small class="muted">${esc(x.redner)}</small>` : ''}</td><td>${posBadge(x.position)}</td><td>${hatErgebnis(x) ? `${beschlussBadge(x)}${x.abstimmung ? ' ' + esc(x.abstimmung) : ''}${x.ergebnis ? `<br><small class="muted">${esc(x.ergebnis)}</small>` : ''}` : '<span class="muted">–</span>'}</td></tr>`).join('')}</tbody></table>
    </details>
    <section class="fokus-nachschlagen"><h4 class="doc-cat">Zum Nachschlagen</h4>
      <div class="fokus-doks">${r.link ? dokLink({ titel: 'Bürgerinformationssystem – Vorlagen der Stadt', url: r.link }) : ''}${docs.map(dokLink).join('')}</div>
      ${!r.link && !docs.length ? `<p class="small muted">Für diese Sitzung ist noch nichts hinterlegt.${kann ? ' Beim Bearbeiten der Sitzung kannst du Dokumente und Links eintragen.' : ''}</p>` : ''}
      <div id="fo-rz" hidden><h4 class="doc-cat">Aus der Ratsarbeit${bereichName ? ` <span class="small muted">${esc(bereichName)}</span>` : ''}</h4><div class="fokus-doks" id="fo-rz-doks"></div></div>
    </section>
    ${r.hinweis ? `<p class="small fokus-hinweis"><b>Hinweis:</b> ${nl2br(r.hinweis)}</p>` : ''}
    ${istBrian() ? `<p class="small"><a href="#rat/rueckblick-${esc(r._id)}">🎬 Rückblick &amp; Video – Abstimmungen, Notizen, Skript, Kacheln (nur für dich)</a></p>` : ''}
    ${chatHtml()}
  </div>`;
  chatWire(v);
  if (chatTipp) { const inp = $('#fo-chat-in', v); if (inp) inp.value = chatTipp; }
  // Blättern: wer leitet, setzt den aktuellen Punkt für alle; wer selbst blättert, folgt nicht mehr automatisch
  const go = async i => {
    fokus.i = i; if (!kann) live.folgen = false;
    fokusSitzung(v, live.r); window.scrollTo({ top: 0, behavior: 'smooth' });
    if (kann && live.leiten) { try { live.r = await db.update('Ratsvorbereitung', { ...live.r, aktuell: i }); } catch (e) { /* beim nächsten Wechsel */ } }
  };
  $('#fo-leiten', v)?.addEventListener('click', async () => { live.leiten = !live.leiten; if (live.leiten) { try { live.r = await db.update('Ratsvorbereitung', { ...live.r, aktuell: fokus.i }); } catch (e) { /* egal */ } } fokusSitzung(v, live.r); });
  $('#fo-notizen', v)?.addEventListener('click', () => notizen.oeffnen(live.r, t));
  $('#fo-folgen', v)?.addEventListener('click', () => { live.folgen = !live.folgen; if (live.folgen && Number.isInteger(live.r.aktuell)) fokus.i = live.r.aktuell; fokusSitzung(v, live.r); });
  $('#fo-prev', v)?.addEventListener('click', () => go(fokus.i - 1));
  $('#fo-next', v)?.addEventListener('click', () => go(fokus.i + 1));
  $$('.fokus-tabelle tbody tr', v).forEach(tr => tr.addEventListener('click', () => go(+tr.dataset.i)));
  // Erklärung: immer zugeklappt, öffnet nur auf Wunsch (Kopfzeile oder „?“) – und bleibt beim Blättern so, wie man sie gelassen hat
  $('#fo-erklaert', v).addEventListener('toggle', e => { live.erklaertOffen = e.target.open; });
  $('#fo-verstanden', v).addEventListener('click', () => { $('#fo-erklaert', v).open = false; });
  $('#fo-hilfe', v).addEventListener('click', () => { const d = $('#fo-erklaert', v); d.open = !d.open; if (d.open) d.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  // Ergebnis: Beschluss-Chip speichert sofort; Abstimmung/Anmerkung über „Speichern“ (oder Enter); „löschen“ setzt den Punkt zurück
  const ergebnisSpeichern = async (patch, btn) => {
    if (btn) busy(btn, true);
    try {
      const felder = { abstimmung: ($('#fo-abst', v)?.value || '').trim(), ergebnis: ($('#fo-ergebnis', v)?.value || '').trim() };
      const neu = (live.r.tops || tops).map((x, i) => i === fokus.i ? { ...x, ...felder, ...patch, ergebnisVon: patch.leer ? '' : me.name, ergebnisAm: patch.leer ? '' : new Date().toISOString() } : x);
      for (const x of neu) delete x.leer;
      live.r = r = await db.update('Ratsvorbereitung', { ...live.r, tops: neu });
      fokusSitzung(v, live.r, true); const m = $('#fo-msg', v); if (m) m.textContent = patch.leer ? 'Ergebnis gelöscht.' : 'Gespeichert – alle Geräte zeigen es gleich.';
    } catch (err) { const m = $('#fo-msg', v); if (m) m.textContent = 'Nicht gespeichert: ' + errText(err); if (btn) busy(btn, false); }
  };
  $$('[data-beschluss]', v).forEach(b => b.addEventListener('click', () => ergebnisSpeichern({ beschluss: b.getAttribute('aria-pressed') === 'true' ? '' : b.dataset.beschluss }, b)));
  ['#fo-abst', '#fo-ergebnis'].forEach(sel => { const inp = $(sel, v); if (!inp) return; inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); inp.blur(); } }); inp.addEventListener('change', () => ergebnisSpeichern({})); });
  $('#fo-mehr', v)?.addEventListener('click', () => { const box = $('#fo-mehr-box', v), b = $('#fo-mehr', v); box.hidden = !box.hidden; b.setAttribute('aria-expanded', String(!box.hidden)); b.textContent = box.hidden ? 'Mehr ▾' : 'Weniger ▴'; });
  $('#fo-reset', v)?.addEventListener('click', () => { if (confirm('Ergebnis dieses Punkts löschen?')) ergebnisSpeichern({ beschluss: '', abstimmung: '', ergebnis: '', leer: true }); });
  // Wischen auf dem Punkt: nach links = nächster, nach rechts = vorheriger
  const top = $('#fo-top', v); let sx = null, sy = null;
  top?.addEventListener('touchstart', e => { if (e.target.tagName === 'TEXTAREA') return; sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  top?.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null; if (Math.abs(dx) < 60 || Math.abs(dy) > 50) return; if (dx < 0 && fokus.i < tops.length - 1) go(fokus.i + 1); if (dx > 0 && fokus.i > 0) go(fokus.i - 1); }, { passive: true });
  v.onkeydown = e => { if (['TEXTAREA', 'INPUT'].includes(e.target.tagName)) return; if (e.key === 'ArrowRight' && fokus.i < tops.length - 1) go(fokus.i + 1); if (e.key === 'ArrowLeft' && fokus.i > 0) go(fokus.i - 1); };
  v.tabIndex = -1; if (!vomPoll) v.focus({ preventScroll: true });
  wachBleiben(true).then(ok => { const el = $('#fo-wach', v); if (el) el.hidden = !ok; });
  // Dokumente des Bereichs aus der Ratsarbeit (entschlüsselt, nur für Fraktionsmitglieder mit Schlüssel)
  if (r.b) ratsarbeit.dokumenteListe().then(list => {
    const ds = list.filter(d => d.b === r.b).slice(0, 12); const box = $('#fo-rz', v); if (!box || !ds.length) return;
    $('#fo-rz-doks', box).innerHTML = ds.map(d => dokLink({ titel: d.titel || 'Dokument', url: '#ratsarbeit/d-' + d._id, kat: d.kat })).join(''); box.hidden = false;
  }).catch(() => {});
}

// ---------- Beiträge für „Aktuelles“ (Wix Blog) ----------
async function secBeitraege(v) {
  const cats = CFG.blogCats || [];
  let mine = [];
  try { mine = (await db.list('Aktionen', { desc: '_createdDate', limit: 50 })).filter(a => a.typ === 'beitrag_erstellen'); } catch (e) { mine = []; }
  v.innerHTML = `
  ${sectionHead('Beitrag schreiben', 'Erscheint unter „Aktuelles“ auf der Website – Wix bleibt der Speicherort')}
  <form class="form mb-form" id="f-post" novalidate>
    <div class="field"><label for="po-titel">Überschrift</label><input id="po-titel" name="titel" type="text" required maxlength="120" placeholder="z. B. Radweg nach Harber: Sanierung kommt"></div>
    <div class="field"><label for="po-teaser">Anrisstext (1–2 Sätze, erscheint in der Übersicht)</label><textarea id="po-teaser" name="teaser" rows="2" maxlength="300"></textarea></div>
    <div class="field"><label for="po-text">Text</label><textarea id="po-text" name="text" rows="12" required placeholder="Absätze durch Leerzeile trennen.&#10;## Zwischenüberschrift&#10;- Aufzählungspunkt"></textarea><span class="small muted">Leerzeile = neuer Absatz · „## “ am Zeilenanfang = Zwischenüberschrift · „- “ = Aufzählung</span></div>
    <div class="mb-2">
      <div class="field"><label for="po-kat">Kategorie</label><select id="po-kat" name="kategorie">${cats.length ? cats.map(c => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join('') : '<option value="">(Kategorien werden beim Bauen der Website geladen)</option>'}</select></div>
      <div class="field"><label for="po-bild">Titelbild (optional, wird verkleinert)</label><input id="po-bild" name="bild" type="file" accept="image/*"></div>
    </div>
    <div id="po-preview" class="po-preview" hidden></div>
    <label class="check"><input type="checkbox" name="veroeffentlichen" checked> <span>Sofort veröffentlichen (sonst als Entwurf bei Wix ablegen)</span></label>
    <p class="note" hidden></p>
    <div class="mb-actions"><button class="btn btn-rot" type="submit">Beitrag einreichen</button></div>
  </form>
  ${mine.length ? `<section class="mb-sub">${sectionHead('Meine eingereichten Beiträge')}<div class="doc-list">${mine.map(a => { let p = {}; try { p = JSON.parse(a.payload || '{}'); } catch (e) { /* leer */ } return `<article class="doc"><div class="doc-body"><b>${esc(p.titel || a.title)}</b><p class="small muted">${esc(fmtWhen(a._createdDate))} · ${esc({ offen: 'wartet auf Übertragung', erledigt: 'übertragen', fehler: 'Fehler', abgelehnt: 'abgelehnt' }[a.status] || a.status)}${a.ergebnis ? ' – ' + esc(a.ergebnis) : ''}</p></div></article>`; }).join('')}</div></section>` : ''}`;
  let bild = '';
  const entwurf = store.get('spd-beitrag-entwurf');
  if (entwurf) { store.del('spd-beitrag-entwurf'); $('#po-titel').value = entwurf.titel || ''; $('#po-teaser').value = entwurf.teaser || ''; $('#po-text').value = entwurf.text || ''; msg($('#f-post .note'), 'Entwurf aus dem Antrag übernommen – bitte durchlesen, anpassen und einreichen.', 'info'); }
  $('#po-bild').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) { bild = ''; $('#po-preview').hidden = true; return; }
    try { bild = await resizeImage(file, 1280, 0.72); $('#po-preview').hidden = false; $('#po-preview').innerHTML = `<img src="${bild}" alt=""><span class="small muted">${Math.round(bild.length * 0.75 / 1024)} KB</span>`; }
    catch (err) { msg($('#f-post .note'), 'Bild konnte nicht verarbeitet werden: ' + errText(err)); }
  });
  $('#f-post').addEventListener('submit', async e => {
    const f = e.target; e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; }
    const fd = new FormData(f); const btn = f.querySelector('[type=submit]'); busy(btn, true);
    const payload = { titel: fd.get('titel').trim(), teaser: fd.get('teaser').trim(), text: fd.get('text'), kategorieId: fd.get('kategorie') || '', kategorie: $('#po-kat').selectedOptions[0]?.textContent || '', veroeffentlichen: !!fd.get('veroeffentlichen'), bild, autor: me.name, autorId: me.id };
    if (JSON.stringify(payload).length > 480000) { msg(f.querySelector('.note'), 'Das Bild ist zu groß – bitte ein kleineres Foto wählen.'); busy(btn, false); return; }
    try {
      await db.insert('Aktionen', { title: `Beitrag: ${payload.titel}`, typ: 'beitrag_erstellen', payload: JSON.stringify(payload), status: 'offen', von: me.name });
      f.reset(); bild = ''; $('#po-preview').hidden = true;
      msg(f.querySelector('.note'), DEMO ? 'In der echten App wird der Beitrag in den nächsten Minuten bei Wix angelegt und erscheint dann unter „Aktuelles“.' : 'Eingereicht – der Beitrag wird in den nächsten Minuten bei Wix angelegt und erscheint spätestens nach dem nächsten Website-Bau unter „Aktuelles“.', 'ok');
    } catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); }
    busy(btn, false);
  });
}
// Foto im Browser verkleinern (JPEG), damit es durch die Wix-Sammlung passt
function resizeImage(file, max, q) {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q)); };
    img.onerror = () => rej(new Error('Kein gültiges Bild')); img.src = url;
  });
}

// ---------- Mitglieder: Verzeichnis, Geburtstage, Jubiläen ----------
async function secMitglieder(v) {
  const profiles = await db.list('Profile').catch(() => []);
  const byId = new Map(profiles.map(p => [p.memberId, p]));
  const listed = people.filter(p => byId.get(p.memberId)?.verzeichnisSichtbar || settings.board.has(p.memberId));
  const year = new Date().getFullYear();
  const jub = profiles.filter(p => p.eintritt && [10, 25, 40, 50, 60, 70].includes(year - +p.eintritt)).map(p => ({ name: p.name, jahre: year - +p.eintritt }));
  const bdays = upcomingBirthdays(profiles, 60);
  v.innerHTML = `
  ${sectionHead('Mitglieder', `${listed.length} im Verzeichnis · ${people.length} im Mitgliederbereich`)}
  <p class="small muted">Hier steht nur, wer es im Profil freigegeben hat – der Vorstand immer (er steht auch auf der Website). Kontaktdaten und Geburtstag sind eigene Freigaben. ${myProfile?.verzeichnisSichtbar || settings.board.has(me.id) ? 'Du stehst im Verzeichnis.' : '<b>Du stehst noch nicht im Verzeichnis.</b>'} Ändern: <a href="#profil">Mein Profil</a>.</p>
  <div class="people-list">${listed.map(p => { const pr = byId.get(p.memberId) || {}; return `<div class="member"><b>${esc(p.name)}</b><span class="small muted">${esc(rolesOf(p))}${pr.ort ? ' · ' + esc(pr.ort) : ''}</span>${pr.telefonSichtbar && pr.telefon ? `<a class="small" href="tel:${esc(pr.telefon)}">📞 ${esc(pr.telefon)}</a>` : ''}${pr.emailSichtbar && pr.email ? `<a class="small" href="mailto:${esc(pr.email)}">✉️ ${esc(pr.email)}</a>` : ''}</div>`; }).join('') || (people.length ? '<p class="muted">Noch hat niemand sein Profil für das Verzeichnis freigegeben.</p>' : '<p class="muted">Die Liste wird vom Push-Dienst aus den Wix-Mitgliedern befüllt.</p>')}</div>
  <div class="mb-grid" style="margin-top:28px">
    <div class="mb-card"><h3>Geburtstage (60 Tage)</h3>${bdays.length ? bdays.map(b => `<p class="small">🎂 <b>${esc(b.name)}</b> – ${esc(b.text)}</p>`).join('') : '<p class="small muted">Keine eingetragen.</p>'}</div>
    <div class="mb-card"><h3>Jubiläen ${year}</h3>${jub.length ? jub.map(j => `<p class="small">🌹 <b>${esc(j.name)}</b> – ${j.jahre} Jahre in der SPD</p>`).join('') : '<p class="small muted">Keine runden Jubiläen eingetragen (Eintrittsjahr im Profil).</p>'}</div>
  </div>`;
}

// ---------- Profil: eigene Angaben, Push, App ----------
async function secProfil(v) {
  const p = myProfile || {};
  orteList();
  v.innerHTML = `
  ${sectionHead('Mein Profil', 'Freiwillige Angaben – du entscheidest, was andere Mitglieder sehen')}
  <div class="mb-grid">
    <form class="form mb-form mb-card" id="f-profil" novalidate>
      <div class="mb-freigabe"><span class="field-label">Was andere Mitglieder von dir sehen</span>
        <label class="check"><input type="checkbox" name="verzeichnisSichtbar" ${p.verzeichnisSichtbar || settings.board.has(me.id) ? 'checked' : ''} ${settings.board.has(me.id) ? 'disabled' : ''}> <span><b>Ich stehe im Mitgliederverzeichnis</b> – Name, Ortsteil und Gruppe (Vorstand, Rat, Fraktion). ${settings.board.has(me.id) ? 'Als Vorstandsmitglied stehst du immer drin – wie auf der Website.' : 'Ohne dieses Häkchen findet dich niemand in der Liste.'}</span></label>
      </div>
      <div class="mb-2">
        <div class="field"><label for="pf-ort">Ortsteil</label><input id="pf-ort" name="ort" type="text" list="orte" value="${esc(p.ort || '')}"></div>
        <div class="field"><label for="pf-fahre">Fahre meist ab (für Fahrgemeinschaften)</label><input id="pf-fahre" name="fahreAb" type="text" list="orte" value="${esc(p.fahreAb || '')}"></div>
      </div>
      <div class="mb-2">
        <div class="field"><label for="pf-tel">Telefon</label><input id="pf-tel" name="telefon" type="tel" value="${esc(p.telefon || '')}"></div>
        <label class="check" style="align-self:end"><input type="checkbox" name="telefonSichtbar" ${p.telefonSichtbar ? 'checked' : ''}> <span>Telefon für Mitglieder sichtbar</span></label>
      </div>
      <label class="check"><input type="checkbox" name="emailSichtbar" ${p.emailSichtbar ? 'checked' : ''}> <span>E-Mail (${esc(me.email)}) für Mitglieder sichtbar</span></label>
      <div class="mb-2">
        <div class="field"><label for="pf-geb">Geburtstag</label><input id="pf-geb" name="geburtstag" type="date" value="${esc(p.geburtstag || '')}"></div>
        <label class="check" style="align-self:end"><input type="checkbox" name="geburtstagSichtbar" ${p.geburtstagSichtbar ? 'checked' : ''}> <span>Geburtstag (Tag und Monat) anzeigen und den Vorstand erinnern</span></label>
      </div>
      <div class="field"><label for="pf-eintritt">Eintrittsjahr SPD (für Jubiläen)</label><input id="pf-eintritt" name="eintritt" type="number" min="1900" max="${new Date().getFullYear()}" value="${esc(p.eintritt || '')}"></div>
      <p class="note" hidden></p>
      <div class="mb-actions"><button class="btn btn-rot" type="submit">Profil speichern</button></div>
    </form>
    <div class="mb-aside">${pushCard(true)}${installCard()}</div>
  </div>`;
  wirePush(); wireInstall();
  $('#f-profil').addEventListener('submit', async e => {
    const f = e.target; e.preventDefault(); const fd = new FormData(f); const btn = f.querySelector('[type=submit]'); busy(btn, true);
    const data = {
      memberId: me.id, name: me.name, title: me.name, ort: fd.get('ort').trim(), fahreAb: fd.get('fahreAb').trim(),
      verzeichnisSichtbar: !!fd.get('verzeichnisSichtbar') || settings.board.has(me.id),
      telefon: fd.get('telefonSichtbar') ? fd.get('telefon').trim() : '', telefonSichtbar: !!fd.get('telefonSichtbar'),
      email: fd.get('emailSichtbar') ? me.email : '', emailSichtbar: !!fd.get('emailSichtbar'),
      geburtstag: fd.get('geburtstag') || '', geburtstagSichtbar: !!fd.get('geburtstagSichtbar') && !!fd.get('geburtstag'), eintritt: fd.get('eintritt') ? +fd.get('eintritt') : null,
    };
    try {
      myProfile = myProfile?._id ? await db.update('Profile', { ...myProfile, ...data }) : await db.insert('Profile', data);
      msg(f.querySelector('.note'), 'Gespeichert.', 'ok');
    } catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); }
    busy(btn, false);
  });
  if (istTester()) v.insertAdjacentHTML('beforeend', `<section class="mb-sub tester"><h4 class="doc-cat">Testen <span class="small muted">nur für dich sichtbar</span></h4>
    <div class="mb-actions">
      <a class="btn btn-schwarz btn-sm" href="#demo">${ICON.flask}Demo-Modus${DEMO ? `: ${esc(demoName(DEMO_ROLLE))}` : ''}</a>
      <a class="btn btn-line btn-sm" href="${esc(baldLink(10))}" target="_blank" rel="noopener">Countdown: letzte 10 Sekunden</a>
      <a class="btn btn-line btn-sm" href="${esc(baldLink('ende'))}" target="_blank" rel="noopener">Countdown: nach dem Start</a>
    </div>
    <p class="small muted">Demo-Modus = Mitgliederbereich mit Beispieldaten als Mitglied, Ratsmitglied oder Vorstand (nichts wird gespeichert). Die Countdown-Testansichten merken sich den Besuch nicht – am Dienstag siehst du die echte Willkommensseite.</p></section>`);
}

// ---------- Push-Benachrichtigungen ----------
function pushCard(loggedIn) {
  const cur = store.get('spd-push');
  const topics = Object.entries(TOPICS).filter(([k]) => loggedIn || k !== 'mitglieder');
  return `<div class="mb-card" id="push-card">
    <h3>Aufs Handy</h3>
    <p class="small">${loggedIn ? 'Neue Beiträge, Termine und Nachrichten vom Vorstand direkt als Mitteilung auf diesem Gerät.' : 'Neue Beiträge und Termine als Mitteilung auf diesem Gerät – auch ohne Anmeldung.'}</p>
    ${pushSupported() || DEMO ? `
    <label class="toggle"><input type="checkbox" id="push-on" ${cur?.aktiv ? 'checked' : ''}> Benachrichtigungen auf diesem Gerät</label>
    <div class="topics" id="push-topics" ${cur?.aktiv ? '' : 'hidden'}>
      ${topics.map(([k, label]) => `<label class="check"><input type="checkbox" data-topic="${k}" ${!cur || (cur.themen || []).includes(k) ? 'checked' : ''}> <span>${esc(label)}</span></label>`).join('')}
      ${loggedIn && me && anyRight() ? '<p class="small muted">Vorstands-Themen (Anfragen, Buchungen …) kommen zusätzlich – wer welche bekommt, steht unter „Vorstand → Wer wird benachrichtigt?“.</p>' : ''}
    </div>` : isIOS() && !isStandalone()
      ? '<p class="note note-info">Auf dem iPhone funktionieren Mitteilungen erst, wenn die Seite als App auf dem Home-Bildschirm liegt (siehe „Als App“).</p>'
      : '<p class="note note-info">Dieser Browser unterstützt keine Web-Benachrichtigungen.</p>'}
    <p class="note" id="push-msg" hidden></p>
  </div>`;
}
function wirePush() {
  const on = $('#push-on'); if (!on) return;
  on.addEventListener('change', async () => {
    busy(on, true);
    try {
      if (on.checked) { await pushSubscribe(); $('#push-topics').hidden = false; msg($('#push-msg'), 'Aktiviert.', 'ok'); }
      else { await pushUnsubscribe(); $('#push-topics').hidden = true; msg($('#push-msg'), 'Benachrichtigungen ausgeschaltet.', 'ok'); }
    } catch (err) { on.checked = !on.checked; msg($('#push-msg'), errText(err)); }
    busy(on, false);
  });
  $$('#push-topics input[data-topic]').forEach(cb => cb.addEventListener('change', async () => {
    try { await pushSubscribe(); msg($('#push-msg'), 'Auswahl gespeichert.', 'ok'); } catch (err) { msg($('#push-msg'), errText(err)); }
  }));
}
const topicsChosen = () => $$('#push-topics input[data-topic]').filter(c => c.checked).map(c => c.dataset.topic);
function b64ToBytes(s) { const p = '='.repeat((4 - s.length % 4) % 4); const b = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); }
async function pushSubscribe() {
  if (DEMO) { store.set('spd-push', { aktiv: true, themen: topicsChosen(), demo: true }); return; }
  if (!CFG.vapid) throw new Error('Push ist auf diesem Server noch nicht eingerichtet (VAPID-Schlüssel fehlt).');
  if (Notification.permission === 'denied') throw new Error('Mitteilungen sind für diese Seite blockiert. Bitte in den Browser-Einstellungen erlauben.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(CFG.vapid) });
  const themen = topicsChosen().length ? topicsChosen() : Object.keys(TOPICS).filter(k => me || k !== 'mitglieder');
  const j = sub.toJSON();
  await client.items.insert('PushSubscriptions', { title: me ? me.name : 'Besucher', endpoint: sub.endpoint, keys: JSON.stringify(j.keys), themen, aktiv: true, memberId: me?.id || '', name: me?.name || '', ua: navigator.userAgent.slice(0, 160), standalone: isStandalone() });
  saveTokens();
  store.set('spd-push', { aktiv: true, endpoint: sub.endpoint, themen, memberId: me?.id || '' });
}
async function pushUnsubscribe() {
  if (DEMO) { store.set('spd-push', { aktiv: false }); return; }
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) { try { await client.items.insert('PushSubscriptions', { title: 'abgemeldet', endpoint: sub.endpoint, aktiv: false, themen: [], memberId: me?.id || '' }); } catch (e) { /* egal */ } await sub.unsubscribe(); }
  store.set('spd-push', { aktiv: false });
}
// Nach der Anmeldung: bestehende Geräte-Anmeldung dem Mitglied zuordnen (damit Vorstands-Themen ankommen)
async function pushClaim() {
  const cur = store.get('spd-push'); if (DEMO || !cur?.aktiv || cur.memberId === me.id || !pushSupported()) return;
  try { await pushSubscribe(); } catch (e) { /* später erneut */ }
}

// ---------- App-Installation ----------
function installCard() {
  return `<div class="mb-card" id="install-card">
    <h3>Als App</h3>
    ${isStandalone() ? '<p class="small">✓ Die SPD-Soltau-App ist auf diesem Gerät installiert.</p>' : `
    <p class="small">Auf den Home-Bildschirm legen – dann öffnet sich die Seite wie eine App, ohne Browserleiste, und Mitteilungen kommen zuverlässig an.</p>
    <button class="btn btn-schwarz" type="button" id="install-btn" ${deferredInstall ? '' : 'hidden'}>App installieren</button>
    ${isIOS() ? '<ol class="small install-steps"><li>In Safari unten auf <b>Teilen</b> (Quadrat mit Pfeil) tippen</li><li><b>Zum Home-Bildschirm</b> wählen</li><li>Oben rechts <b>Hinzufügen</b></li></ol>' : '<p class="small muted">Android/Chrome: Menü ⋮ → „App installieren“ bzw. „Zum Startbildschirm hinzufügen“.</p>'}`}
  </div>`;
}
function wireInstall() {
  $('#install-btn')?.addEventListener('click', async () => {
    if (!deferredInstall) return; deferredInstall.prompt(); const { outcome } = await deferredInstall.userChoice;
    if (outcome === 'accepted') { deferredInstall = null; $('#install-btn').hidden = true; }
  });
}

// ---------- Vorstand: Tafeln (Einstellungen) – die Übersicht und die Anliegen liefert src/vorstand.js ----------
const tafeln = {
  wer: panel => { panel.innerHTML = `${sectionHead('Wer wird benachrichtigt?', 'Push-Nachrichten an den Vorstand')}<div id="routing"></div>`; renderMatrix('routing', BOARD_TOPICS, k => settings.routing[k], k => k, 'Häkchen = diese Person bekommt eine Push-Nachricht auf ihr Gerät und den Vorgang in ihren Eingang (📱 = hat Push aktiviert). Solange für ein Thema nichts gespeichert ist, bekommt der gesamte Vorstand die Nachricht.'); },
  gruppen: panel => { panel.innerHTML = `${sectionHead('Wer gehört wozu?', 'Vorstand, Rat und Fraktion')}<div id="groups"></div>`; renderMatrix('groups', GROUPS.map(([k, l, i]) => [k, l, i, k === 'vorstand' ? '(Standard: Wix-Rolle „Vorstandsmitglied“)' : '(noch niemand eingetragen)']), k => [...settings.groups[k]], k => k === 'vorstand' ? 'vorstand' : 'gruppe:' + k, 'Häkchen = gehört dazu. Mitglied ist jede freigeschaltete Person. Ratsmitglieder zählen automatisch zur Fraktion. Die Gruppen steuern die Sichtbarkeit (Vorstand → Sichtbarkeit) und stehen im Mitgliederverzeichnis; den Vorstand können nur Vorstandsmitglieder oder Verwalter ändern.'); },
  rechte: panel => { panel.innerHTML = `${sectionHead('Wer darf was?', 'Rechte im Mitgliederbereich')}<div id="rights"></div>`; renderMatrix('rights', RIGHTS.map(([k, l]) => [k, l, '']), k => [...settings.rights[k]], k => 'recht:' + k, 'Häkchen = darf das. Solange für ein Recht nichts gespeichert ist, darf es der gesamte Vorstand (Vorstand → Gruppen). Das Recht „Verwaltung“ können nur Vorstandsmitglieder oder Verwalter ändern.'); },
  sicht: panel => { panel.innerHTML = `${sectionHead('Wer sieht was?', 'Sichtbarkeit im Mitgliederbereich')}<div id="visibility"></div>`; renderVisibility(); },
  nachricht: panel => {
    panel.innerHTML = `${sectionHead('Nachricht an alle', 'Push an alle, die Benachrichtigungen aktiviert haben')}
    <form class="form mb-form" id="f-broadcast" novalidate>
      <div class="field"><label for="b-titel">Überschrift</label><input id="b-titel" type="text" required maxlength="60" placeholder="z. B. Mitgliederversammlung verschoben"></div>
      <div class="field"><label for="b-text">Text</label><textarea id="b-text" required maxlength="300" placeholder="Kurz und klar – max. 300 Zeichen"></textarea></div>
      <div class="field"><label for="b-ziel">An wen?</label><select id="b-ziel"><option value="mitglieder">Nur angemeldete Mitglieder</option><option value="alle">Alle Abonnent*innen (auch Besucher)</option></select></div>
      <p class="note" id="b-msg" hidden></p>
      <div class="mb-actions"><button class="btn btn-rot" type="submit">Senden</button></div>
      <p id="b-wa" class="small" hidden>Dieselbe Nachricht auch woanders hinschicken: <button type="button" class="btn btn-line btn-sm share" data-share="">${SHARE_ICON}Teilen</button></p>
    </form>`;
    $('#f-broadcast').addEventListener('submit', onBroadcast);
  },
  stammtisch: panel => {
    const cfg = stammtischConfig(settings.snap);
    panel.innerHTML = `${sectionHead('Stammtisch-Umfrage', 'Automatisch zu jedem Stammtisch: „Wo treffen wir uns?“')}
    <p class="small muted">Für jeden Termin, dessen Titel das Muster enthält, legt der Push-Dienst eine Umfrage mit den Lokalen an. Sie steht direkt im Termin – sehen und abstimmen kann nur, wer zugesagt hat. Die Umfrage schließt sich am Tag des Treffens von selbst.</p>
    <form class="form mb-form" id="f-st" novalidate>
      <div class="field"><label for="st-muster">Termine, deren Titel enthält</label><input id="st-muster" type="text" required value="${esc(cfg.muster)}"></div>
      <div class="field"><label for="st-lokale">Lokale – eins je Zeile</label><textarea id="st-lokale" rows="10">${esc(cfg.lokale.join('\n'))}</textarea></div>
      <p class="note" id="st-msg" hidden></p>
      <div class="mb-actions"><button class="btn btn-rot" type="submit">Speichern</button><button class="btn btn-line btn-sm" type="button" id="st-standard">Standardliste einsetzen</button></div>
    </form>`;
    $('#st-standard').addEventListener('click', () => { $('#st-lokale').value = STAMMTISCH_DEFAULT.lokale.join('\n'); });
    $('#f-st').addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; const btn = f.querySelector('[type=submit]'); busy(btn, true);
      const lokale = $('#st-lokale').value.split('\n').map(x => x.trim()).filter(Boolean);
      try {
        await db.insert('Benachrichtigungen', { title: `Stammtisch: ${lokale.length} Lokale`, thema: 'stammtisch', muster: $('#st-muster').value.trim() || 'stammtisch', lokale, empfaenger: [], von: me.name });
        await loadSettings(); msg($('#st-msg'), 'Gespeichert – gilt für die nächsten Termine.', 'ok');
      } catch (err) { msg($('#st-msg'), 'Nicht gespeichert: ' + errText(err)); }
      busy(btn, false);
    });
  },
  whatsapp: panel => {
    panel.innerHTML = `${sectionHead('WhatsApp-Gruppen', 'Einladungslinks für Mitglieder')}
    <p class="small muted">Eine Zeile pro Gruppe: <b>Name | Einladungslink</b> (in WhatsApp: Gruppeninfo → „Per Link einladen“). Die Links sehen nur angemeldete Mitglieder – wer den Link hat, kann beitreten. Automatisch in Gruppen posten kann die App nicht (WhatsApp bietet dafür keine Schnittstelle); Termine, Helferlisten und Umfragen haben aber einen „WhatsApp“-Knopf, der den fertigen Text in die Gruppe schickt.</p>
    <form class="form mb-form" id="f-wa" novalidate>
      <div class="field"><label for="wa-list">Gruppen</label><textarea id="wa-list" rows="4" placeholder="Ortsverein | https://chat.whatsapp.com/…&#10;Fraktion | https://chat.whatsapp.com/…">${esc((settings.snap.whatsapp?.gruppen || []).map(g => `${g.name} | ${g.url}`).join('\n'))}</textarea></div>
      <p class="note" id="wa-msg" hidden></p>
      <div class="mb-actions"><button class="btn btn-rot" type="submit">Speichern</button></div>
    </form>`;
    $('#f-wa').addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; const btn = f.querySelector('[type=submit]'); busy(btn, true);
      const gruppen = $('#wa-list').value.split('\n').map(l => l.split('|').map(x => x.trim())).filter(x => x[0] && /^https:\/\/(chat\.whatsapp\.com|wa\.me)\//.test(x[1] || '')).map(([name, url]) => ({ name, url }));
      try {
        await db.insert('Benachrichtigungen', { title: `WhatsApp-Gruppen: ${gruppen.map(g => g.name).join(', ') || 'keine'}`, thema: 'whatsapp', gruppen, empfaenger: [], von: me.name });
        await loadSettings(); msg($('#wa-msg'), `Gespeichert (${gruppen.length} Gruppe${gruppen.length === 1 ? '' : 'n'}).`, 'ok');
      } catch (err) { msg($('#wa-msg'), 'Nicht gespeichert: ' + errText(err)); }
      busy(btn, false);
    });
  },
};
// Sichtbarkeit: je Bereich/Termintyp „alle Mitglieder“ oder eine Kombination aus Gruppen (Rat, Fraktion) und einzelnen Personen
function renderVisibility() {
  const box = $('#visibility'); if (!box) return;
  if (!people.length) { box.innerHTML = '<p class="note note-info">Die Mitgliederliste ist noch leer – sie wird vom Push-Dienst automatisch aus den Wix-Mitgliedern befüllt.</p>'; return; }
  const nonBoard = people.filter(p => !settings.board.has(p.memberId));
  const GRP = GROUPS.filter(([k]) => k !== 'vorstand');
  const describe = v => v.modus === 'alle' ? 'Alle Mitglieder' : ['Vorstand', ...GRP.filter(([k]) => v.gruppen.has(k)).map(([, l]) => l), ...[...v.ids].map(nameOf)].join(' + ');
  box.innerHTML = `
    <p class="small muted">Legt fest, was Mitglieder in der App angezeigt bekommen. Vorstand und Verwalter sehen immer alles; wer zu Rat und Fraktion gehört, steht unter „Gruppen“. Hinweis: Das ist eine Anzeige-Einstellung in der App – Termine, die auf der öffentlichen Website stehen, bleiben dort natürlich sichtbar.</p>
    <div class="vis-list">${VISIBILITY.map(([k, l]) => { const v = settings.sicht[k]; const sn = settings.snap['sicht:' + k]; const restricted = v.modus !== 'alle'; return `
      <div class="vis-row" data-key="${esc(k)}">
        <div class="vis-label"><b>${esc(l)}</b><span class="small muted">${esc(describe(v))}${sn ? ` · geändert ${esc(fmtWhen(sn._createdDate))} von ${esc(sn.von || '–')}` : ' (Standard)'}</span></div>
        <select class="vis-mode" aria-label="${esc(l)}: wer darf das sehen"><option value="alle" ${restricted ? '' : 'selected'}>Alle Mitglieder</option><option value="gruppen" ${restricted ? 'selected' : ''}>Nur Vorstand + Auswahl</option></select>
        <div class="vis-people" ${restricted ? '' : 'hidden'}>
          <span class="vis-fixed">✔ Vorstand</span>
          ${GRP.map(([g, gl]) => `<label class="check"><input type="checkbox" data-group="${g}" ${v.gruppen.has(g) ? 'checked' : ''}> <span><b>${esc(gl)}</b> <span class="muted">(${settings.groups[g].size})</span></span></label>`).join('')}
          <details class="vis-persons" ${v.ids.size ? 'open' : ''}><summary>Einzelne Personen${v.ids.size ? ` (${v.ids.size})` : ''}</summary>
            <div class="vis-persons-list">${nonBoard.map(p => `<label class="check"><input type="checkbox" data-member="${esc(p.memberId)}" ${v.ids.has(p.memberId) ? 'checked' : ''}> <span>${esc(p.name)}</span></label>`).join('') || '<span class="small muted">Alle Mitglieder gehören zum Vorstand.</span>'}</div>
          </details>
        </div>
      </div>`; }).join('')}</div>
    <p class="note" id="vis-msg" hidden></p>
    <div class="mb-actions"><button class="btn btn-rot" type="button" id="vis-save">Speichern</button></div>`;
  box.addEventListener('change', e => { const sel = e.target.closest('.vis-mode'); if (sel) sel.closest('.vis-row').querySelector('.vis-people').hidden = sel.value !== 'gruppen'; });
  $('#vis-save').addEventListener('click', async () => {
    const btn = $('#vis-save'); busy(btn, true); msg($('#vis-msg'), '');
    try {
      let n = 0;
      for (const row of $$('.vis-row', box)) {
        const k = row.dataset.key, v = settings.sicht[k];
        const modus = row.querySelector('.vis-mode').value;
        const gruppen = modus === 'gruppen' ? $$('input[data-group]', row).filter(c => c.checked).map(c => c.dataset.group) : [];
        const ids = modus === 'gruppen' ? $$('input[data-member]', row).filter(c => c.checked).map(c => c.dataset.member) : [];
        const sameSet = (arr, set) => arr.length === set.size && arr.every(i => set.has(i));
        if (modus === v.modus && sameSet(gruppen, v.gruppen) && sameSet(ids, v.ids)) continue;
        const label = VISIBILITY.find(x => x[0] === k)[1];
        const namen = ids.map(nameOf);
        await db.insert('Benachrichtigungen', { title: `Sichtbarkeit ${label}: ${describe({ modus, gruppen: new Set(gruppen), ids: new Set(ids) })}`, thema: 'sicht:' + k, modus, gruppen, empfaenger: ids, namen, von: me.name }); n++;
      }
      await loadSettings(); renderVisibility();
      msg($('#vis-msg'), n ? 'Gespeichert – gilt sofort für alle beim nächsten Öffnen.' : 'Nichts geändert.', 'ok');
    } catch (err) { msg($('#vis-msg'), 'Speichern fehlgeschlagen: ' + errText(err)); busy(btn, false); }
  });
}
// Tabelle Mitglied × Thema/Recht – speichert je geändertem Thema einen Schnappschuss
function renderMatrix(boxId, rows, current, themaOf, hint) {
  const box = $('#' + boxId); if (!box) return;
  if (!people.length) { box.innerHTML = '<p class="note note-info">Die Mitgliederliste ist noch leer – sie wird vom Push-Dienst automatisch aus den Wix-Mitgliedern befüllt.</p>'; return; }
  box.innerHTML = `
    <p class="small muted">${esc(hint)}</p>
    <div class="routing-table"><table>
      <thead><tr><th>Mitglied</th>${rows.map(([k, l]) => `<th><span>${esc(l)}</span></th>`).join('')}</tr></thead>
      <tbody>${people.map(p => `<tr><td><b>${esc(p.name)}</b>${p.pushAktiv ? ' 📱' : ''}<br><span class="small muted">${esc(rolesOf(p))}</span></td>${rows.map(([k]) => `<td><input type="checkbox" data-thema="${esc(themaOf(k))}" data-member="${esc(p.memberId)}" ${(current(k) || []).includes(p.memberId) ? 'checked' : ''} aria-label="${esc(p.name)}: ${esc(k)}"></td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <div class="routing-info">${rows.map(([k, l, i, d]) => { const s = settings.snap[themaOf(k)]; return `<p class="small"><b>${esc(l)}:</b> ${esc(i || '')} ${s ? `<span class="muted">(zuletzt geändert ${esc(fmtWhen(s._createdDate))} von ${esc(s.von || '–')})</span>` : `<span class="muted">${esc(d || '(Standard: gesamter Vorstand)')}</span>`}</p>`; }).join('')}</div>
    <p class="note" id="${boxId}-msg" hidden></p>
    <div class="mb-actions"><button class="btn btn-rot" type="button" id="${boxId}-save">Speichern</button></div>`;
  $(`#${boxId}-save`).addEventListener('click', async () => {
    const btn = $(`#${boxId}-save`); busy(btn, true); msg($(`#${boxId}-msg`), '');
    try {
      let n = 0;
      for (const [k, l] of rows) {
        const thema = themaOf(k);
        const ids = $$(`#${boxId} input[data-thema="${thema}"]`).filter(c => c.checked).map(c => c.dataset.member);
        const before = current(k) || [];
        if (ids.length === before.length && ids.every(i => before.includes(i))) continue;
        const namen = ids.map(nameOf);
        await db.insert('Benachrichtigungen', { title: `${l}: ${namen.join(', ') || 'niemand'}`, thema, empfaenger: ids, namen, von: me.name }); n++;
      }
      await loadSettings();
      renderMatrix(boxId, rows, current, themaOf, hint);
      msg($(`#${boxId}-msg`), n ? 'Gespeichert.' : 'Nichts geändert.', 'ok');
    } catch (err) { msg($(`#${boxId}-msg`), 'Speichern fehlgeschlagen: ' + errText(err)); busy(btn, false); }
  });
}
async function onBroadcast(e) {
  e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
  const btn = f.querySelector('[type=submit]'); busy(btn, true); msg($('#b-msg'), '');
  try {
    await db.insert('Aktionen', { title: `Nachricht: ${$('#b-titel').value.trim()}`, typ: 'nachricht', payload: JSON.stringify({ titel: $('#b-titel').value.trim(), text: $('#b-text').value.trim(), ziel: $('#b-ziel').value }), status: 'offen', von: me.name });
    const teilen = `${$('#b-titel').value.trim()}\n${$('#b-text').value.trim()}`;
    f.reset(); msg($('#b-msg'), DEMO ? 'In der echten App geht die Nachricht in den nächsten Minuten raus.' : 'Wird in den nächsten Minuten verschickt.', 'ok');
    $('#b-wa').hidden = false; $('#b-wa button').dataset.share = teilen;
  } catch (err) { msg($('#b-msg'), 'Nicht gespeichert: ' + errText(err)); }
  busy(btn, false);
}

// Ratsarbeit (Working Space der Fraktion) – eigenes Modul, bekommt Zugriff auf Client, Zustand und Bausteine
const schluessel = makeSchluessel({ db, store, DEMO, me: () => me });
const vorstandMehr = makeVorstandMehr({ db, store, DEMO, esc, $, $$, msg, busy, route, sectionHead, fmtDate, fmtShort, fmtWhen, todayIso, nl2br, errText, opt, ICON, SHARE_ICON, shareText, appLink, get me() { return me; }, get people() { return people; }, get settings() { return settings; }, SPD });
// Blatt (Sheet) für Bereiche außerhalb der Ratsarbeit
function blatt(titel, inner, wire) {
  blattZu();
  const el = document.createElement('div'); el.className = 'rz-blatt'; el.id = 'mb-blatt';
  el.innerHTML = `<div class="rz-blatt-in" role="dialog" aria-label="${esc(titel)}"><div class="rz-blatt-kopf"><b>${esc(titel)}</b><button type="button" class="mb-sheet-close" data-zu aria-label="Schließen">${ICON.close}</button></div><div class="rz-blatt-inhalt">${inner}<p class="note" id="mb-blatt-msg" hidden></p></div></div>`;
  document.body.appendChild(el); document.body.classList.add('sheet-open');
  el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-zu]')) blattZu(); });
  if (wire) wire(el);
}
function blattZu() { document.getElementById('mb-blatt')?.remove(); if (!document.getElementById('rz-blatt')) document.body.classList.remove('sheet-open'); }
const bereiche = makeBereiche({ db, DEMO, store, esc, $, $$, msg, busy, route, sectionHead, fmtDate, fmtShort, fmtWhen, todayIso, nl2br, errText, ICON, SHARE_ICON, shareBtn, shareText, appLink, blatt, blattZu, SPD, ORTE, resizeImage, get me() { return me; }, get people() { return people; }, get settings() { return settings; }, inFraktion, antraegeFuerSuche: () => ratsarbeit.antraegeFuerSuche(), ideeZuAntrag: i => ratsarbeit.ideeZuAntrag(i) });
const statistikMod = makeStatistik({ db, esc, $, $$, store, ICON, SPD, sectionHead, todayIso });
// Mitreden (Website): der Startseiten-Schalter ist allein Brians Sache – nicht Tester, nicht Vorstand
const nurBrian = () => DEMO || String(me?.email || '').toLowerCase() === 'weber.soltau@gmail.com';
const mitredenMod = makeMitreden({ db, esc, $, $$, msg, busy, errText, sectionHead, ICON, DEMO, BASE, istBrian: nurBrian, fmtWhen, get me() { return me; } });
const vorstand = makeVorstand({ db, DEMO, esc, $, $$, msg, busy, route, sectionHead, fmtWhen, nl2br, ICON, schluessel, inboxAll, inboxPut, errText, tafeln, mehr: { ...vorstandMehr, ...statistikMod }, mitreden: mitredenMod, get me() { return me; }, get people() { return people; }, get settings() { return settings; } });
// Notizen im Sitzungsmodus – teilen in den Chat läuft über den Live-Chat der Sitzung
const chatSenden = async ({ text, bild }) => {
  if (live.chatStatus !== 'ok' || !live.id) throw new Error('Chat nicht verfügbar');
  await db.insert('SitzungChat', { sitzungId: live.id, memberId: me.id, name: me.name, title: `${me.name} – Chat`, daten: await schluessel.encJson(live.gruppe, { text, bild: bild || '' }) });
  await livePoll(true);
};
const notizen = makeNotizen({ db, store, esc, $, $$, msg, busy, errText, shareText, chatSenden, me: () => me });
// Sitzungsrückblick (Video, Kacheln) – nur für Brian; im Demo für alle Rollen sichtbar
const istBrian = () => DEMO || TESTER.includes(String(me?.email || '').toLowerCase());
// Filmdreh (Regie-Modus) – nur für das Filmteam (Brian, Birhat); im Demo für alle Rollen sichtbar
const istFilmTeam = () => DEMO || FILM_TEAM.includes(String(me?.email || '').toLowerCase());
const film = makeFilm({ db, esc, $, $$, msg, busy, errText, shareText, nl2br, sectionHead, fmtWhen, ICON, DEMO, BASE, me: () => me, echtesKonto, drehStart: () => { document.body.classList.add('fokus-modus'); wachBleiben(true).then(ok => { const el = document.getElementById('fo-wach'); if (el) el.hidden = !ok; }); } });
// Drehmodus (Filmdreh) am Handy im Vollbild
document.addEventListener('click', e => { const a = e.target.closest('a[href^="#filmdreh/dreh-"]'); if (a && matchMedia('(pointer: coarse)').matches && !matchMedia('(display-mode: standalone)').matches && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); });
const rueckblick = makeRueckblick({ db, esc, $, $$, msg, busy, errText, shareText, nl2br, sectionHead, fmtDate, BESCHLUSS, beschlussLabel, hatErgebnis, posBadge, beschlussBadge, strokesToPng, me: () => me, echtesKonto, DEMO });
const ratsarbeit = makeRatsarbeit({ db, store, DEMO, esc, $, $$, msg, busy, waHref, appLink, ICON, WA_ICON, SHARE_ICON, shareText, schluessel, route, sectionHead, nl2br, errText, get me() { return me; }, get people() { return people; }, get settings() { return settings; } });

// ===== Start =====
async function enterApp() {
  try { await loadMe(); saveTokens(); renderShell(); if (!enterApp.wired) { addEventListener('hashchange', route); enterApp.wired = true; } await route(); pushClaim(); }
  catch (err) { store.del('spd-tokens'); renderAuth('login'); msg($('#l-msg'), 'Sitzung abgelaufen – bitte neu anmelden. (' + errText(err) + ')'); }
}
// Hilfe ohne Anmeldung (Registrieren, Installieren …) – mit Kopf, aber ohne Leiste
function renderHelpOnly() {
  authBar();
  view('<div id="mb-view" class="mb-view"></div>');
  const draw = () => { if (!location.hash.startsWith('#hilfe')) { location.reload(); return; } secHilfe($('#mb-view')); window.scrollTo(0, 0); };
  draw(); addEventListener('hashchange', draw, { once: false });
}
(async function start() {
  if (!DEMO && await completeRedirect()) return;
  // Vorschau der Anmeldung/Registrierung mit Beispieldaten (auch für die Hilfevideos)
  if (DEMO && /^#(registrieren|anmelden)$/.test(location.hash)) { renderAuth(location.hash === '#registrieren' ? 'register' : 'login'); return; }
  if (!DEMO && !client.auth.loggedIn() && location.hash.startsWith('#hilfe')) { renderHelpOnly(); return; }
  if (DEMO || client.auth.loggedIn()) { await enterApp(); return; }
  renderAuth(location.hash === '#registrieren' ? 'register' : 'login');
})();
