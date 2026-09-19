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
import { makeDemoClient } from './demo.js';
import { makeRatsarbeit } from './ratsarbeit.js';
import { makeSchluessel } from './schluessel.js';

const SPD = window.SPD || {};
const CFG = (SPD.app = SPD.app || {});
const app = document.getElementById('mitglieder-app');
if (!app) throw new Error('Mitgliederbereich: Container fehlt');
const $ = (s, r = app) => r.querySelector(s);
const $$ = (s, r = app) => [...r.querySelectorAll(s)];
const DEMO = /[?&]demo\b/.test(location.search);
const VIDEO = /[?&]video\b/.test(location.search); // Aufnahme der Hilfevideos: ohne Vorschau-Hinweis
const REDIRECT = location.origin + location.pathname.replace(/index\.html$/, '');
const BASE = SPD.base || '.';
const TOPICS = { news: 'Aktuelles (neue Beiträge)', termine: 'Termine (neu + Erinnerung am Vortag)', mitglieder: 'Mitglieder-Infos (Umfragen, Helferlisten, Dokumente, Nachrichten)' };
const ORTE = ['Kernstadt', 'Ahlften', 'Brock', 'Deimern', 'Dittmern', 'Friedrichseck', 'Harber', 'Hötzingen', 'Leitzingen', 'Marbostel', 'Meinern', 'Mittelstendorf', 'Moide', 'Oeningen', 'Tetendorf', 'Wolterdingen', 'Woltem'];
const SECTIONS = [
  ['start', 'Start'], ['termine', 'Termine'], ['umfragen', 'Umfragen'], ['dokumente', 'Dokumente'],
  ['rat', 'Rat'], ['ratsarbeit', 'Ratsarbeit'], ['beitraege', 'Beiträge'], ['mitglieder', 'Mitglieder'], ['profil', 'Profil'], ['vorstand', 'Vorstand'], ['hilfe', 'Hilfe'],
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
const client = DEMO ? makeDemoClient(SPD, { mitglied: VIDEO || /[?&]mitglied\b/.test(location.search) }) : createClient({
  modules: { items, members },
  auth: OAuthStrategy({ clientId: CFG.clientId, tokens: store.get('spd-tokens') || undefined }),
});
if (DEMO) demoInbox = client.inbox;
const saveTokens = () => { if (!DEMO) store.set('spd-tokens', client.auth.getTokens()); };
const errText = e => e?.details?.applicationError?.description || e?.message || String(e);
const db = {
  async list(col, { eq = {}, desc = null, asc = null, limit = 500 } = {}) {
    let q = client.items.query(col);
    for (const [k, v] of Object.entries(eq)) q = q.eq(k, v);
    if (desc) q = q.descending(desc); if (asc) q = q.ascending(asc);
    return (await q.limit(limit).find()).items;
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
      <p class="small muted">Noch kein Konto und nur mal reinschauen? <a href="?demo">Vorschau mit Beispieldaten öffnen</a></p>
      <p class="small"><a class="btn btn-line btn-sm" href="#hilfe">Hilfe &amp; Anleitungen (Videos)</a></p>
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
  location.href = logoutUrl || REDIRECT;
}

// ===== Mitgliederbereich =====
async function loadMe() {
  const { member } = await client.members.getCurrentMember({ fieldsets: ['FULL'] });
  const c = member.contact || {}, p = member.profile || {};
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || p.nickname || member.loginEmail;
  me = { id: member._id, name, email: member.loginEmail, rollen: [], vorstand: false, can: r => !!settings?.rights[r]?.has(me.id), sees: k => canSee(settings, me.id, k) };
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
const SEC_VIS = { umfragen: 'umfragen', dokumente: 'dokumente', rat: 'rat', mitglieder: 'mitglieder' };
const secVisible = k => k === 'hilfe' || (k === 'ratsarbeit' ? inFraktion() : (k !== 'vorstand' || anyRight()) && (k !== 'beitraege' || me.can('beitraege')) && (!SEC_VIS[k] || me.sees(SEC_VIS[k])));
const visibleEvents = () => (SPD.events || []).filter(ev => me.sees('termine:' + (ev.typ || 'Öffentlich')));

const ICON = {
  web: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
  home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6H9v6H5a2 2 0 0 1-2-2z"/></svg>',
  cal: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  poll: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
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
};
// Gruppierte Bereichsliste – am PC als Seitenleiste, am Handy im „Mehr“-Blatt
function navGroups() {
  const sec = (k, l, icon) => secVisible(k) ? [k, l, icon] : null;
  return [
    ['Für alle', [sec('start', 'Start', ICON.home), sec('termine', 'Termine', ICON.cal), sec('umfragen', 'Umfragen', ICON.poll), sec('dokumente', 'Dokumente', ICON.doc), sec('rat', 'Ratsvorbereitung', ICON.rat), sec('mitglieder', 'Mitglieder', ICON.users)]],
    ['Fraktion', [sec('ratsarbeit', 'Ratsarbeit', ICON.tasks)]],
    ['Persönlich', [sec('profil', 'Mein Profil', ICON.user), sec('beitraege', 'Beiträge schreiben', ICON.edit), sec('hilfe', 'Hilfe & Anleitungen', ICON.help)]],
    ['Vorstand', [sec('vorstand', 'Vorstand', ICON.inbox)]],
  ].map(([t, items]) => [t, items.filter(Boolean)]).filter(([, items]) => items.length);
}
function navList() {
  return `${navGroups().map(([title, items]) => `<div class="mb-group"><div class="mb-group-title">${title}</div>${items.map(([k, l, icon]) => `<a href="#${k}" data-sec="${k}">${icon}<span>${l}</span><b class="mb-badge" data-badge="${k}" hidden></b></a>`).join('')}</div>`).join('')}
  <button type="button" class="mb-logout" data-logout>${ICON.out}<span>Abmelden</span></button>`;
}
function renderShell() {
  const first = me.name.split(' ')[0] || me.name;
  view(`
  ${DEMO && !VIDEO ? '<p class="note note-info demo-note"><b>Vorschau mit Beispieldaten.</b> So sieht der Mitgliederbereich nach der Anmeldung aus – Änderungen werden hier nicht gespeichert. <a href="./">Zur echten Anmeldung</a></p>' : ''}
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
  const fourth = anyRight() ? ['vorstand', 'Vorstand', ICON.inbox] : inFraktion() ? ['ratsarbeit', 'Ratsarbeit', ICON.tasks] : secVisible('dokumente') ? ['dokumente', 'Dokumente', ICON.doc] : ['profil', 'Profil', ICON.user];
  const bar = document.createElement('nav'); bar.className = 'mb-tabbar'; bar.setAttribute('aria-label', 'App-Leiste');
  bar.innerHTML = `
    <a href="#start" data-tab="start">${ICON.home}<span>Start</span></a>
    <a href="#termine" data-tab="termine">${ICON.cal}<span>Termine</span></a>
    <a href="#umfragen" data-tab="umfragen">${ICON.poll}<span>Umfragen</span></a>
    <a href="#${fourth[0]}" data-tab="${fourth[0]}">${fourth[2]}<span>${fourth[1]}</span>${fourth[0] === 'vorstand' || fourth[0] === 'ratsarbeit' ? `<b class="mb-badge" data-badge="${fourth[0]}" hidden></b>` : ''}</a>
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
  if (anyRight()) {
    let n = 0;
    try { n += (await db.list('Eingang', { eq: { status: 'offen' }, limit: 100 })).length; } catch (e) { /* kein Zugriff */ }
    try { const local = await inboxAll(); n += local.filter(l => !l.done).length; } catch (e) { /* egal */ }
    setBadge('vorstand', n);
  }
  if (inFraktion()) setBadge('ratsarbeit', await ratsarbeit.badge());
}
const RENDER = { start: secStart, termine: secTermine, umfragen: secUmfragen, dokumente: secDokumente, rat: secRat, ratsarbeit: v => ratsarbeit.sec(v), beitraege: secBeitraege, mitglieder: secMitglieder, profil: secProfil, vorstand: secVorstand, hilfe: secHilfe };
async function route() {
  let key = (location.hash || '#start').slice(1).split('/')[0];
  if (['eingang', 'wer', 'nachricht', 'rechte'].includes(key)) key = 'vorstand';
  if (key === 'push' || key === 'app-install') key = 'profil';
  if (key === 'mehr') { key = 'start'; $('#mb-more', document.body)?.click(); }
  if (!RENDER[key] || !secVisible(key)) key = 'start';
  if (key !== 'ratsarbeit') ratsarbeit.blattZu(false);
  document.querySelectorAll('.mb-side a[data-sec],.mb-sheet a[data-sec]').forEach(a => { if (a.dataset.sec === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  document.querySelectorAll('.mb-tabbar [data-tab]').forEach(a => { if (a.dataset.tab === key) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  // Beim Wechsel des Bereichs nach oben zum Inhalt – bei Aktionen innerhalb eines Bereichs (Zusage, Helferliste …) bleibt die Scrollposition
  if (route.lastKey !== key) window.scrollTo({ top: Math.min(window.scrollY, (document.querySelector('.mb-main')?.getBoundingClientRect().top || 0) + window.scrollY - 80), behavior: 'auto' });
  route.lastKey = key;
  let v = $('#mb-view'); if (!v) return;
  const fresh = document.createElement('div'); fresh.id = 'mb-view'; fresh.className = v.className; v.replaceWith(fresh); v = fresh;
  v.innerHTML = '<p class="muted">Lade …</p>';
  try { await RENDER[key](v); } catch (err) { v.innerHTML = `<p class="note note-err">Das konnte nicht geladen werden: ${esc(errText(err))}</p>`; }
  const sub = location.hash.split('/')[1]; if (sub && key !== 'vorstand' && key !== 'ratsarbeit') document.getElementById(sub)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
const sectionHead = (title, extra = '') => `<div class="section-head"><h3 class="title">${title}</h3>${extra ? `<span class="muted small">${extra}</span>` : ''}</div>`;

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
    ${!me ? `<p class="mb-actions" style="margin-top:24px"><a class="btn btn-rot" href="#anmelden">Zur Anmeldung</a></p>` : ''}`;
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
      const name = videoName(topic, plat), portrait = plat === 'android' || plat === 'ios';
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
  v.innerHTML = `
  ${myProfile?.verzeichnisSichtbar || settings.board.has(me.id) ? '' : '<p class="note note-info" style="margin-bottom:20px">Du stehst noch nicht im Mitgliederverzeichnis – andere Mitglieder finden dich also nicht. Einschalten kannst du das unter <a href="#profil">Mein Profil</a>.</p>'}
  <div class="start-grid">
    ${ratKarte}
    <div class="mb-card">
      <h3>Nächste Termine</h3>
      ${events.length ? events.map(ev => { const mine = zusagen.find(z => z.eventId === ev.id && z.memberId === me.id); return `<a class="start-ev" href="#termine/ev-${esc(ev.id)}"><b>${esc(fmtShort(ev.date))}</b> ${esc(ev.title)} <span class="small muted">${esc(ev.zeit || '')}</span>${mine ? `<span class="badge ${mine.status === 'zusage' ? 'badge-mit' : ''}">${mine.status === 'zusage' ? 'zugesagt' : 'abgesagt'}</span>` : '<span class="badge">offen</span>'}</a>`; }).join('') : '<p class="muted small">Keine Termine eingetragen.</p>'}
      <a class="btn btn-schwarz btn-sm" href="#termine">Alle Termine</a>
    </div>
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
  const events = visibleEvents().slice(0, 40);
  const [zusagen, listen, helfer, fahrten] = await Promise.all([db.list('Zusagen').catch(() => []), db.list('Helferlisten').catch(() => []), db.list('Helfer').catch(() => []), db.list('Fahrgemeinschaften').catch(() => [])]);
  const today = todayIso();
  const ics = CFG.ics || {};
  // Listen, die an einem angezeigten Termin hängen, stehen direkt im Termin – der Rest unten
  const loseListen = listen.filter(l => (!l.datum || l.datum >= today) && !events.some(e => e.id === l.eventId));
  orteList();
  if (location.hash === '#termine/monat') store.set('spd-termine-ansicht', 'monat');
  const ansicht = store.get('spd-termine-ansicht') === 'monat' ? 'monat' : 'liste';
  const alleSichtbar = visibleEvents();
  const calHtml = ansicht === 'monat' ? monatsKalender(events, alleSichtbar) : ''; // setzt cal.tag
  const tagesEvents = ansicht === 'monat' ? alleSichtbar.filter(e => String(e.date).slice(0, 10) === cal.tag) : [];
  v.innerHTML = `
  ${sectionHead('Termine – kommst du?', 'Zusagen sehen alle Mitglieder, Gründe nur der Vorstand')}
  <div class="mb-tabs termine-ansicht" role="tablist" aria-label="Ansicht"><button type="button" class="chip" data-ansicht="liste" aria-pressed="${ansicht === 'liste'}">Liste</button><button type="button" class="chip" data-ansicht="monat" aria-pressed="${ansicht === 'monat'}">Kalender</button></div>
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
        <div class="field"><label for="ev-typ">Für wen?</label><select id="ev-typ" name="typ"><option value="Öffentlich">Öffentlich (alle Interessierten)</option><option value="Rat">Ratstermin (öffentlich)</option><option value="Mitglieder">Nur Mitglieder</option><option value="Fraktion">Fraktion</option><option value="Vorstand">Vorstand</option></select></div>
      </div>
      <div class="field"><label for="ev-text">Kurzbeschreibung (optional)</label><textarea id="ev-text" name="beschreibung" rows="2" maxlength="300"></textarea></div>
      <p class="note" hidden></p>
      <div class="mb-actions"><button class="btn btn-rot" type="submit">Termin eintragen</button></div>
    </form></details>` : ''}
  ${me.can('helfer') && me.sees('helfer') ? `<details class="mb-details" id="hl-new"><summary>Helferliste anlegen</summary>${helperForm(events)}</details>` : ''}
  </div>` : ''}
  ${ansicht === 'monat' ? `${calHtml}
  <div class="cal-tag" id="cal-tag">${cal.tag ? `<h4 class="doc-cat">${esc(fmtDate(cal.tag))}</h4>${tagesEvents.length ? tagesEvents.map(ev => eventCard(ev, zusagen, listen, helfer, fahrten, alleSichtbar)).join('') : '<p class="muted">An diesem Tag ist nichts eingetragen.</p>'}` : '<p class="muted">Tippe auf einen Tag mit Punkt, um die Termine zu sehen.</p>'}</div>` : ''}
  ${ansicht === 'liste' ? `<div class="rsvp-list" id="rsvp-list">${events.length ? events.map(ev => eventCard(ev, zusagen, listen, helfer, fahrten, events)).join('') : '<p class="muted">Aktuell sind keine Termine eingetragen.</p>'}</div>` : ''}
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
      ${me.sees('helfer') ? myLists.map(l => helperList(l, helfer, events, true)).join('') : ''}
      ${me.can('termine') && ev.id && !String(ev.id).startsWith('ev-demo') ? '<p class="small"><button type="button" class="linkbtn" data-cancel-event>Termin absagen</button></p>' : ''}
      <details class="mb-details rides" data-ev="${esc(ev.id)}"><summary>🚗 Mitfahren${rides.length ? ` (${rides.length})` : ''}</summary>
        <div class="ride-list">${rides.length ? rides.map(r => `<p class="small ride" data-id="${esc(r._id)}">${r.typ === 'biete' ? '🚗' : '🙋'} <b>${esc(r.name)}</b> ${r.typ === 'biete' ? `bietet ${r.plaetze || 1} Platz${(r.plaetze || 1) === 1 ? '' : 'e'}` : 'sucht eine Mitfahrgelegenheit'} ab ${esc(r.ab || '?')}${r.zeit ? ', ' + esc(r.zeit) + ' Uhr' : ''}${r.hinweis ? ' – ' + esc(r.hinweis) : ''}${r.memberId === me.id ? ` ${waBtn(`🚗 ${r.typ === 'biete' ? 'Ich biete ' + (r.plaetze || 1) + ' Platz/Plätze' : 'Ich suche eine Mitfahrgelegenheit'} ab ${r.ab || '?'} zu „${ev.title}“ (${fmtShort(ev.date)}${r.zeit ? ', ' + r.zeit + ' Uhr' : ''}). Eintragen: ${appLink('#termine/ev-' + ev.id)}`, 'In Gruppe posten')} <button type="button" class="linkbtn" data-del-ride>löschen</button>` : ''}</p>`).join('') : '<p class="small muted">Noch keine Einträge.</p>'}</div>
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
    // Fahrgemeinschaft löschen
    const d = e.target.closest('button[data-del-ride]');
    if (d) { const id = d.closest('.ride').dataset.id; busy(d, true); try { await db.remove('Fahrgemeinschaften', id); route(); } catch (err) { busy(d, false); } return; }
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
  const [intern, pub, stimmen] = await Promise.all([db.list('Umfragen', { desc: '_createdDate' }).catch(() => []), db.list('UmfragenOeffentlich', { desc: '_createdDate' }).catch(() => []), db.list('Stimmen', { limit: 2000 }).catch(() => [])]);
  const all = [...intern.map(u => ({ ...u, col: 'Umfragen' })), ...pub.map(u => ({ ...u, col: 'UmfragenOeffentlich' }))].sort((a, b) => String(b._createdDate).localeCompare(String(a._createdDate)));
  const today = todayIso();
  const open = all.filter(u => u.offen && (!u.endetAm || u.endetAm >= today)), closed = all.filter(u => !open.includes(u));
  v.innerHTML = `
  ${sectionHead('Umfragen', me.can('umfragen') ? 'Du darfst Umfragen anlegen' : 'Umfragen legt der Vorstand an')}
  ${me.can('umfragen') ? `<div class="mb-create"><details class="mb-details" id="u-new"><summary>Umfrage anlegen</summary>
    <form class="form mb-form" id="f-umfrage" novalidate>
      <div class="field"><label for="u-frage">Frage</label><input id="u-frage" name="frage" type="text" required maxlength="140" placeholder="z. B. Sommerfest am 12. oder 19. Juli?"></div>
      <div class="field"><label for="u-text">Erläuterung (optional)</label><textarea id="u-text" name="beschreibung" rows="2"></textarea></div>
      <div class="field"><label for="u-opt">Antwortmöglichkeiten (eine pro Zeile)</label><textarea id="u-opt" name="optionen" rows="4" required placeholder="12. Juli&#10;19. Juli&#10;Mir egal"></textarea></div>
      <div class="field"><label for="u-ende">Läuft bis</label><input id="u-ende" name="endetAm" type="date" required value="${new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)}"></div>
      <label class="check"><input type="checkbox" name="mehrfach"> <span>Mehrfachauswahl erlauben</span></label>
      <label class="check"><input type="checkbox" name="oeffentlich"> <span>Öffentlich auf der Startseite („Umfrage der Woche“) – die Auswertung bleibt intern</span></label>
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
  const counts = opts.map((_, i) => votes.filter(s => (s.auswahl || []).includes(i)).length);
  const total = votes.length; const max = Math.max(1, ...counts);
  const showResults = !open || !!mine;
  const isPublic = u.col === 'UmfragenOeffentlich';
  return `<article class="mb-card poll" id="u-${esc(u._id)}" data-id="${esc(u._id)}" data-col="${esc(u.col)}">
    <div class="hl-head"><div><span class="tag ${isPublic ? 'tag-schwarz' : ''}">${isPublic ? 'Öffentlich' : 'Intern'}</span> <span class="small muted">von ${esc(u.von || '–')}${u.endetAm ? ` · ${open ? 'bis' : 'endete'} ${esc(fmtShort(u.endetAm))}` : ''} · ${total} Stimme${total === 1 ? '' : 'n'}</span><h4>${esc(u.frage)}</h4>${u.beschreibung ? `<p class="small">${nl2br(u.beschreibung)}</p>` : ''}</div>
      <div class="mb-actions">${open ? waBtn(`🗳️ Umfrage: ${u.frage}\n${isPublic ? 'Abstimmen auf der Startseite: ' + new URL(BASE + '/', location.href).href : 'Abstimmen im Mitgliederbereich: ' + appLink('#umfragen/u-' + u._id)}`) : ''}${open && (u._owner === me.id || me.can('umfragen')) ? '<button type="button" class="linkbtn" data-close-poll>Umfrage schließen</button>' : ''}</div></div>
    ${showResults ? `<div class="poll-results">${opts.map((o, i) => `<div class="poll-row ${mine && (mine.auswahl || []).includes(i) ? 'mine' : ''}"><span class="bar" style="width:${Math.round(counts[i] / max * 100)}%"></span><span class="lbl">${esc(o)}</span><span class="pct">${counts[i]}${total ? ` · ${Math.round(counts[i] / total * 100)} %` : ''}</span></div>`).join('')}</div>${mine && open ? '<p class="small muted">Du hast abgestimmt. Tippe auf eine Antwort, um deine Stimme zu ändern.</p>' : ''}` : ''}
    ${open ? `<div class="poll-vote ${showResults ? 'compact' : ''}">${opts.map((o, i) => `<button type="button" class="chip" data-vote="${i}" aria-pressed="${!!mine && (mine.auswahl || []).includes(i)}">${esc(o)}</button>`).join('')}${u.mehrfach ? '<button type="button" class="btn btn-schwarz btn-sm" data-vote-save>Auswahl speichern</button>' : ''}</div><p class="small muted">${u.mehrfach ? 'Mehrere Antworten möglich. ' : ''}${isPublic ? 'Diese Umfrage läuft auch öffentlich auf der Startseite; die Auswertung sehen nur Mitglieder.' : 'Der Vorstand kann im CMS sehen, wer wie abgestimmt hat – die Abstimmung ist also nicht geheim.'}</p>` : ''}
    <p class="note" hidden></p>
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
      auswahl = $$('[data-vote][aria-pressed="true"]', art).map(x => +x.dataset.vote);
      if (!auswahl.length) { msg(note, 'Bitte mindestens eine Antwort auswählen.'); return; }
    } else auswahl = [+b.dataset.vote];
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
      const col = fd.get('oeffentlich') ? 'UmfragenOeffentlich' : 'Umfragen';
      await db.insert(col, { frage: fd.get('frage').trim(), title: fd.get('frage').trim(), beschreibung: fd.get('beschreibung').trim(), optionen, mehrfach: !!fd.get('mehrfach'), offen: true, endetAm: fd.get('endetAm'), von: me.name, vonId: me.id });
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

// ---------- Ratsvorbereitung ----------
const POS = ['offen', 'dafür', 'dagegen', 'Enthaltung', 'Änderungsantrag'];
async function secRat(v, editId = null, vorlage = null) {
  const all = await db.list('Ratsvorbereitung', { desc: 'sitzung' }).catch(() => []);
  const today = todayIso();
  const next = all.filter(r => (r.sitzung || '') >= today).sort((a, b) => a.sitzung.localeCompare(b.sitzung)), past = all.filter(r => (r.sitzung || '') < today);
  const editing = editId ? all.find(r => r._id === editId) : null;
  // Sitzungen der Stadt aus dem Bürgerinformationssystem (beim Bau geholt) – noch nicht in der Ratsvorbereitung
  const stadt = (SPD.sitzungen || []).filter(s => s.datum >= today && !all.some(r => r.sitzung === s.datum && String(r.gremium).toLowerCase().includes(String(s.gremium).toLowerCase().split(' ')[0])));
  const form = vorlage ? { gremium: vorlage.gremium, sitzung: vorlage.datum, zeit: vorlage.zeit, titel: '', link: vorlage.url, hinweis: '', tops: (vorlage.tops || []).map(t => ({ nr: t.nr, titel: t.titel + (t.vorlage ? ` (${t.vorlage})` : ''), position: 'offen', einordnung: '' })) } : editing;
  v.innerHTML = `
  ${sectionHead('Ratsvorbereitung', 'Tagesordnung mit der Einordnung der Fraktion – nur intern')}
  ${me.can('rat') ? `<div class="mb-create"><details class="mb-details" id="r-new" ${form ? 'open' : ''}><summary>${editing ? 'Sitzung bearbeiten' : vorlage ? 'Sitzung aus dem Bürgerinformationssystem' : 'Sitzung anlegen'}</summary>${ratForm(form)}</details></div>` : ''}
  ${me.can('rat') && stadt.length && !vorlage ? `<section class="rat-stadt"><h4 class="doc-cat">Nächste Sitzungen der Stadt <span class="small muted">(Bürgerinformationssystem, automatisch)</span></h4><div class="doc-list">${stadt.map((s2, i) => `<article class="doc"><div class="doc-body"><b>${esc(s2.gremium)}</b><p class="small muted">${esc(fmtDate(s2.datum))} · ${esc(s2.zeit)} Uhr · ${esc(s2.ort)} · ${s2.tops.length ? `${s2.tops.length} öffentliche Tagesordnungspunkte` : 'Tagesordnung noch nicht veröffentlicht'}</p></div><div class="mb-actions"><button type="button" class="btn btn-schwarz btn-sm" data-uebernehmen="${i}">${s2.tops.length ? 'Tagesordnung übernehmen' : 'Sitzung anlegen'}</button></div></article>`).join('')}</div><p class="small muted">Übernehmen legt die Sitzung mit allen Punkten an – die Fraktion trägt dann nur noch ihre Haltung je Punkt ein.</p></section>` : ''}
  <div class="rat-list">${next.length ? next.map(r => ratCard(r)).join('') : '<p class="muted">Keine kommende Sitzung eingetragen.</p>'}</div>
  ${past.length ? `<section class="mb-sub"><h4 class="doc-cat">Vergangene Sitzungen</h4><div class="rat-list">${past.slice(0, 6).map(r => ratCard(r)).join('')}</div></section>` : ''}`;
  wireRat(v, all, stadt);
}
function ratCard(r) {
  return `<article class="mb-card rat" data-id="${esc(r._id)}">
    <div class="hl-head"><div><span class="tag">${esc(r.gremium || 'Rat')}</span> <span class="small muted">${esc(fmtDate(r.sitzung))}${r.zeit ? ' · ' + esc(r.zeit) + ' Uhr' : ''}${r.ort ? ' · ' + esc(r.ort) : ''}</span><h4>${esc(r.titel || 'Sitzung')}</h4></div>
      <div class="mb-actions">${r.link ? `<a class="btn btn-line btn-sm" href="${esc(r.link)}" target="_blank" rel="noopener">Ratsinfo</a>` : ''}${me.can('rat') ? '<button type="button" class="btn btn-line btn-sm" data-edit-rat>Bearbeiten</button>' : ''}</div></div>
    ${(r.tops || []).length ? `<div class="tops">${r.tops.map(t => `<div class="top"><div class="top-nr">TOP ${esc(t.nr || '')}</div><div><b>${esc(t.titel)}</b> <span class="pos pos-${esc((t.position || 'offen').replace(/[^a-zä]/gi, '').toLowerCase())}">${esc(t.position || 'offen')}</span>${t.einordnung ? `<p class="small">${nl2br(t.einordnung)}</p>` : ''}</div></div>`).join('')}</div>` : '<p class="small muted">Noch keine Tagesordnungspunkte eingetragen.</p>'}
    ${r.hinweis ? `<p class="small"><b>Hinweis:</b> ${nl2br(r.hinweis)}</p>` : ''}
    <p class="small muted">Stand: ${esc(fmtWhen(r._updatedDate || r._createdDate))} · ${esc(r.von || '–')}</p>
  </article>`;
}
function ratForm(r) {
  const tops = r?.tops?.length ? r.tops : [{ nr: '', titel: '', position: 'offen', einordnung: '' }];
  return `<form class="form mb-form" id="f-rat" data-id="${esc(r?._id || '')}" novalidate>
    <div class="mb-3">
      <div class="field"><label for="ra-gr">Gremium</label><input id="ra-gr" name="gremium" type="text" list="gremien" required value="${esc(r?.gremium || 'Rat der Stadt Soltau')}"><datalist id="gremien"><option value="Rat der Stadt Soltau"><option value="Verwaltungsausschuss"><option value="Bauausschuss"><option value="Sozialausschuss"><option value="Finanzausschuss"><option value="Fraktionssitzung"></datalist></div>
      <div class="field"><label for="ra-datum">Sitzung am</label><input id="ra-datum" name="sitzung" type="date" required value="${esc(r?.sitzung || '')}"></div>
      <div class="field"><label for="ra-zeit">Uhrzeit</label><input id="ra-zeit" name="zeit" type="time" value="${esc(r?.zeit || '')}"></div>
    </div>
    <div class="mb-2">
      <div class="field"><label for="ra-titel">Titel</label><input id="ra-titel" name="titel" type="text" value="${esc(r?.titel || '')}" placeholder="z. B. Haushalt 2027"></div>
      <div class="field"><label for="ra-link">Link (Ratsinformationssystem, optional)</label><input id="ra-link" name="link" type="url" value="${esc(r?.link || '')}"></div>
    </div>
    <div class="field"><label>Tagesordnungspunkte</label>
      <div id="ra-tops" class="rows">${tops.map(t => topRow(t)).join('')}</div>
      <button type="button" class="linkbtn" id="ra-add">+ TOP hinzufügen</button>
    </div>
    <div class="field"><label for="ra-hinweis">Hinweis für die Fraktion (optional)</label><textarea id="ra-hinweis" name="hinweis" rows="2">${esc(r?.hinweis || '')}</textarea></div>
    <p class="note" hidden></p>
    <div class="mb-actions"><button class="btn btn-rot" type="submit">${r?._id ? 'Änderungen speichern' : 'Sitzung speichern'}</button>${r ? '<button class="btn btn-line" type="button" id="ra-cancel">Abbrechen</button>' : ''}${r?._id ? '<button class="btn btn-line" type="button" id="ra-del">Löschen</button>' : ''}</div>
  </form>`;
}
const topRow = t => `<div class="row top-row"><input type="text" placeholder="Nr." value="${esc(t.nr || '')}" aria-label="TOP-Nummer"><input type="text" placeholder="Titel des Tagesordnungspunkts" value="${esc(t.titel || '')}" aria-label="Titel"><select aria-label="Position">${opt(POS, t.position || 'offen')}</select><textarea rows="2" placeholder="Einordnung der Fraktion (optional)" aria-label="Einordnung">${esc(t.einordnung || '')}</textarea><button type="button" class="linkbtn" data-del-top>entfernen</button></div>`;
function wireRat(v, all, stadt = []) {
  const f = $('#f-rat');
  if (f) {
    $('#ra-add').addEventListener('click', () => { const d = document.createElement('div'); d.innerHTML = topRow({}); $('#ra-tops').appendChild(d.firstElementChild); });
    f.addEventListener('click', e => { const b = e.target.closest('button[data-del-top]'); if (b) b.closest('.top-row').remove(); });
    $('#ra-cancel')?.addEventListener('click', () => route());
    $('#ra-del')?.addEventListener('click', async () => { if (!confirm('Sitzung wirklich löschen?')) return; try { await db.remove('Ratsvorbereitung', f.dataset.id); route(); } catch (err) { msg(f.querySelector('.note'), errText(err)); } });
    f.addEventListener('submit', async e => {
      e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; }
      const fd = new FormData(f); const btn = f.querySelector('[type=submit]'); busy(btn, true);
      const tops = $$('#ra-tops .top-row').map(r => ({ nr: r.children[0].value.trim(), titel: r.children[1].value.trim(), position: r.children[2].value, einordnung: r.children[3].value.trim() })).filter(t => t.titel);
      const data = { gremium: fd.get('gremium').trim(), sitzung: fd.get('sitzung'), zeit: fd.get('zeit'), titel: fd.get('titel').trim(), title: `${fd.get('gremium')} ${fd.get('sitzung')}`, link: fd.get('link').trim(), tops, hinweis: fd.get('hinweis').trim(), von: me.name };
      try {
        const cur = all.find(r => r._id === f.dataset.id);
        if (cur) await db.update('Ratsvorbereitung', { ...cur, ...data }); else await db.insert('Ratsvorbereitung', data);
        route();
      } catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
    });
  }
  v.addEventListener('click', e => {
    const u = e.target.closest('button[data-uebernehmen]'); if (u) { secRat(v, null, stadt[+u.dataset.uebernehmen]); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    const b = e.target.closest('button[data-edit-rat]'); if (!b) return; secRat(v, b.closest('.rat').dataset.id);
  });
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

// ---------- Vorstand ----------
async function secVorstand(v) {
  const panels = [
    me.can('freigaben') && ['eingang', 'Eingang'],
    me.can('verwaltung') && ['wer', 'Benachrichtigen'],
    me.can('verwaltung') && ['gruppen', 'Gruppen'],
    me.can('verwaltung') && ['rechte', 'Rechte'],
    me.can('verwaltung') && ['sicht', 'Sichtbarkeit'],
    me.can('nachrichten') && ['nachricht', 'Nachricht'],
    me.can('verwaltung') && ['whatsapp', 'WhatsApp'],
  ].filter(Boolean);
  const wanted = (location.hash.split('/')[1] || '').replace(/-.*$/, '');
  const cur = panels.find(([k]) => k === wanted)?.[0] || panels[0]?.[0];
  v.innerHTML = `
  <nav class="mb-subnav" id="vs-nav">${panels.map(([k, l]) => `<a href="#vorstand/${k}" ${k === cur ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
  <div id="vs-panel"></div>`;
  const panel = $('#vs-panel');
  if (cur === 'eingang') { panel.innerHTML = `${sectionHead('Eingang', 'Anfragen an den Vorstand – persönlich für dich abgelegt')}<div id="inbox"><p class="muted">Lade …</p></div>`; renderInbox(); }
  if (cur === 'wer') { panel.innerHTML = `${sectionHead('Wer wird benachrichtigt?', 'Push-Nachrichten an den Vorstand')}<div id="routing"></div>`; renderMatrix('routing', BOARD_TOPICS, k => settings.routing[k], k => k, 'Häkchen = diese Person bekommt eine Push-Nachricht auf ihr Gerät und den Vorgang in ihren Eingang (📱 = hat Push aktiviert). Solange für ein Thema nichts gespeichert ist, bekommt der gesamte Vorstand die Nachricht.'); }
  if (cur === 'gruppen') { panel.innerHTML = `${sectionHead('Wer gehört wozu?', 'Vorstand, Rat und Fraktion')}<div id="groups"></div>`; renderMatrix('groups', GROUPS.map(([k, l, i]) => [k, l, i, k === 'vorstand' ? '(Standard: Wix-Rolle „Vorstandsmitglied“)' : '(noch niemand eingetragen)']), k => [...settings.groups[k]], k => k === 'vorstand' ? 'vorstand' : 'gruppe:' + k, 'Häkchen = gehört dazu. Mitglied ist jede freigeschaltete Person. Ratsmitglieder zählen automatisch zur Fraktion. Die Gruppen steuern die Sichtbarkeit (Vorstand → Sichtbarkeit) und stehen im Mitgliederverzeichnis; den Vorstand können nur Vorstandsmitglieder oder Verwalter ändern.'); }
  if (cur === 'rechte') { panel.innerHTML = `${sectionHead('Wer darf was?', 'Rechte im Mitgliederbereich')}<div id="rights"></div>`; renderMatrix('rights', RIGHTS.map(([k, l]) => [k, l, '']), k => [...settings.rights[k]], k => 'recht:' + k, 'Häkchen = darf das. Solange für ein Recht nichts gespeichert ist, darf es der gesamte Vorstand (Vorstand → Gruppen). Das Recht „Verwaltung“ können nur Vorstandsmitglieder oder Verwalter ändern.'); }
  if (cur === 'sicht') { panel.innerHTML = `${sectionHead('Wer sieht was?', 'Sichtbarkeit im Mitgliederbereich')}<div id="visibility"></div>`; renderVisibility(); }
  if (cur === 'nachricht') {
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
  }
  if (cur === 'whatsapp') {
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
  }
}
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
async function renderInbox() {
  const box = $('#inbox'); if (!box) return;
  // Zwei Quellen: die eigenen Einträge in der Sammlung Eingang (vom Push-Dienst für jedes Vorstandsmitglied angelegt)
  // und die Push-Nachrichten, die auf diesem Gerät angekommen sind
  let remote = [];
  try { remote = (await db.list('Eingang', { desc: '_createdDate', limit: 100 })).map(r => ({ id: r.key || r._id, _id: r._id, title: r.title, body: r.body, data: { typ: r.typ, id: r.key, ...(r.payload ? JSON.parse(r.payload) : {}), details: r.details || {} }, receivedAt: new Date(r._createdDate).getTime(), done: r.status && r.status !== 'offen' ? r.status : '', remote: true })); } catch (e) { remote = []; }
  const local = await inboxAll();
  const seen = new Set(remote.map(r => r.id));
  const list = [...remote, ...local.filter(l => !seen.has(l.id))].sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0)).slice(0, 100);
  const LABEL = { registrierung: 'Registrierung', buchung: 'Buchung', anfrage: 'Anfrage' };
  const TABS = [['registrierung', 'Mitgliederanfragen'], ['buchung', 'Mietanfragen'], ['anfrage', 'Allgemeine Anfragen']];
  const count = t => list.filter(it => (it.data?.typ || 'anfrage') === t && !it.done).length;
  const wantedTab = (location.hash.split('/')[1] || '').split('-')[1];
  const tab = TABS.some(([k]) => k === wantedTab) ? wantedTab : (TABS.find(([k]) => count(k))?.[0] || 'registrierung');
  const showDone = !!renderInbox.showDone;
  const shown = list.filter(it => (it.data?.typ || 'anfrage') === tab && (showDone || !it.done));
  box.innerHTML = `<nav class="inbox-tabs">${TABS.map(([k, l]) => `<a href="#vorstand/eingang-${k}" class="chip" aria-pressed="${k === tab}">${l}${count(k) ? ` <b>${count(k)}</b>` : ''}</a>`).join('')}<label class="check small"><input type="checkbox" id="inbox-done" ${showDone ? 'checked' : ''}> <span>Erledigte anzeigen</span></label></nav>` + (shown.length ? '' : `<p class="muted">${showDone ? 'Nichts in diesem Bereich.' : 'Nichts Offenes in diesem Bereich.'}</p>`) + shown.map(it => {
    const d = it.data || {};
    const actions = it.done ? '' : d.typ === 'registrierung'
      ? `<button class="btn btn-rot btn-sm" data-act="mitglied_freigeben">Freischalten</button><button class="btn btn-line btn-sm" data-act="mitglied_ablehnen">Ablehnen</button>`
      : d.typ === 'buchung' ? `<button class="btn btn-rot btn-sm" data-act="buchung_annehmen">Annehmen</button><button class="btn btn-line btn-sm" data-act="buchung_ablehnen">Ablehnen</button>`
        : d.typ === 'anfrage' ? `<button class="btn btn-rot btn-sm" data-act="anfrage_erledigt">Erledigt</button>` : '';
    return `<article class="inbox-item" data-id="${esc(it.id)}">
      <div><span class="tag ${d.typ === 'buchung' ? 'tag-schwarz' : ''}">${esc(LABEL[d.typ] || d.typ || 'Info')}</span> <span class="small muted">${esc(fmtWhen(it.receivedAt))}</span>${it.done ? ` <span class="badge">${esc(it.done)}</span>` : ''}</div>
      <h4>${esc(it.title || '')}</h4>
      <p class="small">${nl2br(it.body || '')}</p>
      ${d.details ? `<dl class="inbox-details">${Object.entries(d.details).filter(([, val]) => val).map(([k, val]) => `<dt>${esc(k)}</dt><dd>${/@/.test(val) ? `<a href="mailto:${esc(val)}">${esc(val)}</a>` : /^[\d +\/-]{6,}$/.test(val) ? `<a href="tel:${esc(val)}">${esc(val)}</a>` : nl2br(val)}</dd>`).join('')}</dl>` : ''}
      <div class="mb-actions">${actions}</div>
      <p class="note" hidden></p>
    </article>`;
  }).join('');
  $('#inbox-done')?.addEventListener('change', e => { renderInbox.showDone = e.target.checked; renderInbox(); });
  updateBadges();
  box.onclick = async e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const art = b.closest('.inbox-item'); const it = list.find(x => x.id === art.dataset.id); if (!it) return;
    busy(b, true);
    try {
      await db.insert('Aktionen', { title: `${b.dataset.act}: ${it.title || ''}`, typ: b.dataset.act, payload: JSON.stringify(it.data || {}), status: 'offen', von: me.name });
      it.done = b.textContent.trim() + (DEMO ? '' : ' (wird ausgeführt)');
      if (it.remote && it._id) { try { const cur = (await db.list('Eingang', { eq: { _id: it._id }, limit: 1 }))[0]; if (cur) await db.update('Eingang', { ...cur, status: it.done }); } catch (e) { /* lokal reicht */ } }
      else await inboxPut(it);
      renderInbox();
    } catch (err) { msg(art.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(b, false); }
  };
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
