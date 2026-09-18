// Mitgliederbereich (/mitglieder/): Anmeldung und Registrierung über das Wix-Mitgliederkonto,
// Zu-/Absagen zu Terminen, Push-Benachrichtigungen, App-Installation und die Werkzeuge des Vorstands
// (wer wird benachrichtigt, Eingang mit Registrierungs- und Buchungsanfragen, Nachricht an alle).
// Alle Daten liegen bei Wix (Mitglieder, CMS-Sammlungen). Wird mit esbuild zu assets/mitglieder.js gebündelt.
import { createClient, OAuthStrategy } from '@wix/sdk';
import * as items from '@wix/wix-data-items-sdk';
import * as members from '@wix/auto_sdk_members_members';
import { esc, D, WD, MONS, MONL } from './render.mjs';

const SPD = window.SPD || {};
const CFG = SPD.app || {};
const app = document.getElementById('mitglieder-app');
if (!app) throw new Error('Mitgliederbereich: Container fehlt');
const $ = (s, r = app) => r.querySelector(s);
const $$ = (s, r = app) => [...r.querySelectorAll(s)];
const REDIRECT = location.origin + location.pathname.replace(/index\.html$/, '');
const TOPICS = { news: 'Aktuelles (neue Beiträge)', termine: 'Termine (neu + Erinnerung am Vortag)', mitglieder: 'Mitglieder-Infos vom Vorstand' };
const BOARD_TOPICS = [
  ['registrierung', 'Neue Registrierungsanfragen', 'Jemand möchte sich im Mitgliederbereich anmelden und wartet auf Freigabe.'],
  ['buchung', 'Buchungsanfragen Roter Bahnhof', 'Eine Anfrage über das Buchungsformular ist eingegangen.'],
  ['zusage', 'Zu- und Absagen zu Terminen', 'Ein Mitglied hat zu einem Termin zu- oder abgesagt.'],
];

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
async function inboxAll() {
  try { const db = await idb(); return await new Promise((res, rej) => { const q = db.transaction('inbox').objectStore('inbox').getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => rej(q.error); }); }
  catch (e) { return []; }
}
async function inboxPut(item) {
  try { const db = await idb(); await new Promise((res, rej) => { const t = db.transaction('inbox', 'readwrite'); t.objectStore('inbox').put(item); t.oncomplete = res; t.onerror = () => rej(t.error); }); } catch (e) { /* egal */ }
}

// ---------- Wix-Client ----------
const client = createClient({
  modules: { items, members },
  auth: OAuthStrategy({ clientId: CFG.clientId, tokens: store.get('spd-tokens') || undefined }),
});
const saveTokens = () => store.set('spd-tokens', client.auth.getTokens());
const errText = e => e?.details?.applicationError?.description || e?.message || String(e);
const isPermissionError = e => /WDE0027|WDE0028|permission|403/i.test(errText(e) + ' ' + (e?.details?.applicationError?.code || ''));

let me = null;           // { id, name, email, vorstand, rollen }
let deferredInstall = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; $('#install-btn')?.removeAttribute('hidden'); });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

// ---------- Bausteine ----------
const view = html => { app.innerHTML = html; };
const msg = (el, text, kind = 'err') => { if (!el) return; el.hidden = !text; el.className = `note note-${kind}`; el.textContent = text || ''; };
const busy = (btn, on) => { if (!btn) return; btn.disabled = on; btn.classList.toggle('busy', on); };
const fmtDate = s => { const x = D(s); return `${WD[x.getDay()]}, ${x.getDate()}. ${MONL[x.getMonth()]} ${x.getFullYear()}`; };
const fmtWhen = iso => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr'; };

// ===== Anmeldung / Registrierung =====
function renderAuth(tab = 'login', hint = '') {
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
        <label class="check"><input type="checkbox" id="r-ds" required> <span>Ich habe die <a href="${esc(SPD.base)}/datenschutz/">Datenschutzhinweise</a> gelesen. Meine Daten werden im Mitgliederkonto bei Wix gespeichert.</span></label>
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
    </div>
    <div class="mb-side">
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
  const params = {
    email: $('#r-mail').value.trim(), password: $('#r-pw').value,
    profile: { firstName: $('#r-vn').value.trim(), lastName: $('#r-nn').value.trim(), nickname: `${$('#r-vn').value.trim()} ${$('#r-nn').value.trim()}`.trim(), privacyStatus: 'PRIVATE' },
  };
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
  try {
    await client.auth.sendPasswordResetEmail($('#p-mail').value.trim(), REDIRECT);
    msg($('#p-msg'), 'E-Mail ist unterwegs. Bitte Posteingang (und Spam-Ordner) prüfen.', 'ok');
  } catch (err) { msg($('#p-msg'), 'Das hat nicht geklappt: ' + errText(err)); }
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

// Ergebnis von login/register/processVerification auswerten
async function handleAuthState(res, mode) {
  const target = mode === 'login' ? $('#l-msg') : mode === 'register' ? $('#r-msg') : $('#v-msg');
  switch (res.loginState) {
    case 'SUCCESS': return finishLogin(res.data.sessionToken);
    case 'EMAIL_VERIFICATION_REQUIRED': return renderVerify(res);
    case 'OWNER_APPROVAL_REQUIRED': return renderPending();
    case 'FAILURE': {
      const t = { invalidEmail: 'Diese E-Mail-Adresse ist ungültig oder unbekannt.', invalidPassword: 'Das Passwort ist falsch.', emailAlreadyExists: 'Für diese E-Mail-Adresse gibt es schon ein Konto. Bitte anmelden oder Passwort zurücksetzen.', resetPassword: 'Bitte setze dein Passwort zurück („Passwort vergessen“).', missingCaptchaToken: 'Bitte die Roboter-Prüfung abschließen.', invalidCaptchaToken: 'Die Roboter-Prüfung ist fehlgeschlagen. Bitte noch einmal.' }[res.errorCode];
      msg(target, t || ('Fehler: ' + (res.error || 'unbekannt')));
      if (res.errorCode === 'invalidEmail' && mode === 'login') msg(target, 'Kein Konto mit dieser E-Mail-Adresse – oder es ist noch nicht vom Vorstand freigeschaltet.');
      return;
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
    <p class="small muted">Das dauert in der Regel nicht lange. Bei Fragen: <a href="${esc(SPD.base)}/kontakt/">Kontakt</a>.</p>
    <div class="mb-actions"><button class="btn btn-line" type="button" id="pending-back">Zur Anmeldung</button></div>
  </div>`);
  $('#pending-back').addEventListener('click', () => renderAuth('login'));
}

// Sitzung abschließen: Wix leitet einmal über seine Autorisierungsseite und zurück (funktioniert auch auf dem Handy)
async function finishLogin(sessionToken) {
  const oauthData = client.auth.generateOAuthData(REDIRECT, REDIRECT);
  store.set('spd-oauth', oauthData);
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
  try {
    const tokens = await client.auth.getMemberTokens(q.get('code'), q.get('state'), oauthData);
    client.auth.setTokens(tokens); saveTokens(); store.del('spd-oauth');
  } catch (err) { renderAuth('login'); msg($('#l-msg'), 'Anmeldung fehlgeschlagen: ' + errText(err)); return true; }
  return false;
}

async function logout() {
  let logoutUrl = null;
  try { ({ logoutUrl } = await client.auth.logout(REDIRECT)); } catch (e) { /* lokal abmelden reicht */ }
  store.del('spd-tokens'); store.del('spd-oauth');
  location.href = logoutUrl || REDIRECT;
}

// ===== Mitgliederbereich =====
async function loadMe() {
  const { member } = await client.members.getCurrentMember({ fieldsets: ['FULL'] });
  const c = member.contact || {}, p = member.profile || {};
  const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || p.nickname || member.loginEmail;
  me = { id: member._id, name, email: member.loginEmail, rollen: [], vorstand: false, status: member.status };
  // Rollen kommen aus der vom Push-Dienst gepflegten Sammlung AppMitglieder
  try {
    const r = await client.items.query('AppMitglieder').eq('memberId', me.id).find();
    const it = r.items[0]; if (it) { me.rollen = it.rollen || []; me.vorstand = !!it.vorstand; if (it.name) me.name = it.name; }
  } catch (e) { /* Sammlung noch leer oder nicht lesbar */ }
  return me;
}

async function renderHome() {
  const events = (SPD.events || []).slice(0, 30);
  view(`
  <div class="mb-head">
    <div><span class="tag">Angemeldet</span><h2 class="title">Moin, ${esc(me.name.split(' ')[0] || me.name)}!</h2><p class="muted small">${esc(me.email)}${me.vorstand ? ' · Vorstand' : ''}</p></div>
    <button class="btn btn-line" type="button" id="logout">Abmelden</button>
  </div>
  <nav class="mb-nav" aria-label="Bereiche">
    <a href="#termine" class="chip">Termine</a>
    <a href="#push" class="chip">Benachrichtigungen</a>
    ${me.vorstand ? '<a href="#eingang" class="chip">Eingang</a><a href="#wer" class="chip">Wer wird benachrichtigt</a><a href="#nachricht" class="chip">Nachricht senden</a>' : ''}
    <a href="#app-install" class="chip">App</a>
  </nav>
  <section class="mb-section" id="termine">
    <div class="section-head"><h3 class="title">Termine – kommst du?</h3><span class="muted small">Zusagen sehen alle Mitglieder</span></div>
    <div id="rsvp-list" class="rsvp-list"><p class="muted">Lade Termine …</p></div>
  </section>
  <section class="mb-section" id="push">
    <div class="section-head"><h3 class="title">Benachrichtigungen</h3></div>
    <div class="mb-grid">${pushCard(true)}${installCard()}</div>
  </section>
  ${me.vorstand ? `
  <section class="mb-section" id="eingang">
    <div class="section-head"><h3 class="title">Eingang</h3><span class="muted small">Anfragen, die per Push auf diesem Gerät angekommen sind</span></div>
    <div id="inbox"><p class="muted">Lade …</p></div>
  </section>
  <section class="mb-section" id="wer">
    <div class="section-head"><h3 class="title">Wer wird benachrichtigt?</h3><span class="muted small">Gilt für Push-Nachrichten an den Vorstand</span></div>
    <div id="routing"><p class="muted">Lade …</p></div>
  </section>
  <section class="mb-section" id="nachricht">
    <div class="section-head"><h3 class="title">Nachricht an alle</h3><span class="muted small">Push an alle, die Benachrichtigungen aktiviert haben</span></div>
    <form class="form mb-form" id="f-broadcast" novalidate>
      <div class="field"><label for="b-titel">Überschrift</label><input id="b-titel" type="text" required maxlength="60" placeholder="z. B. Mitgliederversammlung verschoben"></div>
      <div class="field"><label for="b-text">Text</label><textarea id="b-text" required maxlength="300" placeholder="Kurz und klar – max. 300 Zeichen"></textarea></div>
      <div class="field"><label for="b-ziel">An wen?</label><select id="b-ziel"><option value="mitglieder">Nur angemeldete Mitglieder</option><option value="alle">Alle Abonnent*innen (auch Besucher)</option></select></div>
      <p class="note" id="b-msg" hidden></p>
      <div class="mb-actions"><button class="btn btn-rot" type="submit">Senden</button></div>
    </form>
  </section>` : ''}
  `);
  $('#logout').addEventListener('click', logout);
  wirePush(); wireInstall();
  renderRsvps(events);
  if (me.vorstand) { renderInbox(); renderRouting(); $('#f-broadcast').addEventListener('submit', onBroadcast); }
  if (location.hash) { const t = $(location.hash); t?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
}

// ---------- Zu-/Absagen ----------
async function renderRsvps(events) {
  const box = $('#rsvp-list'); if (!box) return;
  if (!events.length) { box.innerHTML = '<p class="muted">Aktuell sind keine Termine eingetragen.</p>'; return; }
  let all = [];
  try { all = (await client.items.query('Zusagen').limit(1000).find()).items; }
  catch (e) { box.innerHTML = `<p class="note note-err">Zusagen konnten nicht geladen werden: ${esc(errText(e))}</p>`; return; }
  const byEvent = new Map();
  for (const z of all) { if (!byEvent.has(z.eventId)) byEvent.set(z.eventId, []); byEvent.get(z.eventId).push(z); }
  box.innerHTML = events.map(ev => {
    const list = byEvent.get(ev.id) || [];
    const mine = list.find(z => z.memberId === me.id);
    const ja = list.filter(z => z.status === 'zusage'), nein = list.filter(z => z.status === 'absage');
    const x = D(ev.date);
    return `<article class="rsvp" data-id="${esc(ev.id)}">
      <div class="event-date"><b>${String(x.getDate()).padStart(2, '0')}</b><span>${WD[x.getDay()]} · ${MONS[x.getMonth()]}</span></div>
      <div class="rsvp-body">
        <h4>${esc(ev.title)}</h4>
        <div class="meta">${esc(ev.zeit || '')}${ev.ort ? ' · ' + esc(ev.ort) : ''} · <span class="badge ${ev.typ === 'Öffentlich' ? 'badge-off' : ev.typ === 'Mitglieder' ? 'badge-mit' : ''}">${esc(ev.typ)}</span></div>
        <div class="rsvp-btns">
          <button type="button" class="chip" data-status="zusage" aria-pressed="${mine?.status === 'zusage'}">✓ Ich komme</button>
          <button type="button" class="chip" data-status="absage" aria-pressed="${mine?.status === 'absage'}">✕ Ich kann nicht</button>
        </div>
        <div class="rsvp-grund" ${mine?.status === 'absage' ? '' : 'hidden'}>
          <div class="field"><label>Grund (optional, sieht nur der Vorstand)</label><input type="text" maxlength="120" value="${esc(mine?.grund || '')}" placeholder="z. B. Schicht, Urlaub, krank"></div>
          <button type="button" class="btn btn-schwarz btn-sm" data-save-grund>Speichern</button>
        </div>
        <p class="rsvp-who small"><b>${ja.length}</b> Zusage${ja.length === 1 ? '' : 'n'}${ja.length ? ': ' + esc(ja.map(z => z.name).join(', ')) : ''}${nein.length ? ` · <span class="muted">${nein.length} Absage${nein.length === 1 ? '' : 'n'}</span>` : ''}</p>
        <p class="note" hidden></p>
      </div>
    </article>`;
  }).join('');
  box.addEventListener('click', async e => {
    const b = e.target.closest('button[data-status],button[data-save-grund]'); if (!b) return;
    const art = b.closest('.rsvp'); const ev = events.find(x => x.id === art.dataset.id); if (!ev) return;
    const status = b.dataset.status || (art.querySelector('[data-status][aria-pressed="true"]')?.dataset.status) || 'absage';
    const grund = status === 'absage' ? art.querySelector('.rsvp-grund input').value.trim() : '';
    busy(b, true);
    try {
      await saveRsvp(ev, status, grund);
      $$('[data-status]', art).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.status === status)));
      art.querySelector('.rsvp-grund').hidden = status !== 'absage';
      msg(art.querySelector('.note'), status === 'zusage' ? 'Zugesagt – bis dann!' : 'Abgesagt. Danke für die Rückmeldung.', 'ok');
      renderRsvps(events);
    } catch (err) { msg(art.querySelector('.note'), 'Speichern fehlgeschlagen: ' + errText(err)); }
    busy(b, false);
  });
}
async function saveRsvp(ev, status, grund) {
  const r = await client.items.query('Zusagen').eq('eventId', ev.id).eq('memberId', me.id).find();
  const data = { eventId: ev.id, eventTitel: ev.title, eventDatum: ev.date, status, grund, memberId: me.id, name: me.name, title: `${me.name} – ${ev.title}` };
  if (r.items[0]) await client.items.update('Zusagen', { ...r.items[0], ...data });
  else await client.items.insert('Zusagen', data);
}

// ---------- Push-Benachrichtigungen ----------
function pushCard(loggedIn) {
  const cur = store.get('spd-push');
  const topics = Object.entries(TOPICS).filter(([k]) => loggedIn || k !== 'mitglieder');
  return `<div class="mb-card" id="push-card">
    <h3>Aufs Handy</h3>
    <p class="small">${loggedIn ? 'Neue Beiträge, Termine und Nachrichten vom Vorstand direkt als Mitteilung auf diesem Gerät.' : 'Neue Beiträge und Termine als Mitteilung auf diesem Gerät – auch ohne Anmeldung.'}</p>
    ${pushSupported() ? `
    <label class="toggle"><input type="checkbox" id="push-on" ${cur?.aktiv ? 'checked' : ''}> Benachrichtigungen auf diesem Gerät</label>
    <div class="topics" id="push-topics" ${cur?.aktiv ? '' : 'hidden'}>
      ${topics.map(([k, label]) => `<label class="check"><input type="checkbox" data-topic="${k}" ${!cur || (cur.themen || []).includes(k) ? 'checked' : ''}> ${esc(label)}</label>`).join('')}
      ${loggedIn && me?.vorstand ? '<p class="small muted">Als Vorstandsmitglied bekommst du zusätzlich die Themen, die dir unter „Wer wird benachrichtigt?“ zugeordnet sind.</p>' : ''}
    </div>` : isIOS() && !isStandalone()
      ? '<p class="note note-info">Auf dem iPhone funktionieren Mitteilungen erst, wenn die Seite als App auf dem Home-Bildschirm liegt (siehe rechts).</p>'
      : '<p class="note note-info">Dieser Browser unterstützt keine Web-Benachrichtigungen.</p>'}
    <p class="note" id="push-msg" hidden></p>
  </div>`;
}
function wirePush() {
  const on = $('#push-on'); if (!on) return;
  on.addEventListener('change', async () => {
    busy(on, true);
    try {
      if (on.checked) { await pushSubscribe(); $('#push-topics').hidden = false; msg($('#push-msg'), 'Aktiviert. Zum Testen schickt der Vorstand gelegentlich eine Nachricht.', 'ok'); }
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
  if (!CFG.vapid) throw new Error('Push ist auf diesem Server noch nicht eingerichtet (VAPID-Schlüssel fehlt).');
  if (Notification.permission === 'denied') throw new Error('Mitteilungen sind für diese Seite blockiert. Bitte in den Browser-Einstellungen erlauben.');
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(CFG.vapid) });
  const themen = topicsChosen().length ? topicsChosen() : Object.keys(TOPICS).filter(k => me || k !== 'mitglieder');
  const j = sub.toJSON();
  await client.items.insert('PushSubscriptions', {
    title: me ? me.name : 'Besucher', endpoint: sub.endpoint, keys: JSON.stringify(j.keys), themen, aktiv: true,
    memberId: me?.id || '', name: me?.name || '', ua: navigator.userAgent.slice(0, 160), standalone: isStandalone(),
  });
  saveTokens();
  store.set('spd-push', { aktiv: true, endpoint: sub.endpoint, themen, memberId: me?.id || '' });
}
async function pushUnsubscribe() {
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  if (sub) { try { await client.items.insert('PushSubscriptions', { title: 'abgemeldet', endpoint: sub.endpoint, aktiv: false, themen: [], memberId: me?.id || '' }); } catch (e) { /* egal */ } await sub.unsubscribe(); }
  store.set('spd-push', { aktiv: false });
}
// Nach der Anmeldung: bestehende Geräte-Anmeldung dem Mitglied zuordnen (damit Vorstands-Themen ankommen)
async function pushClaim() {
  const cur = store.get('spd-push'); if (!cur?.aktiv || cur.memberId === me.id || !pushSupported()) return;
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

// ---------- Vorstand: Eingang ----------
async function renderInbox() {
  const box = $('#inbox'); if (!box) return;
  const list = (await inboxAll()).sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0)).slice(0, 50);
  if (!list.length) { box.innerHTML = '<p class="muted">Noch nichts eingegangen. Anfragen erscheinen hier, sobald sie per Push auf diesem Gerät ankommen.</p>'; return; }
  box.innerHTML = list.map(it => {
    const d = it.data || {};
    const actions = it.done ? `<span class="badge">${esc(it.done)}</span>` : d.typ === 'registrierung'
      ? `<button class="btn btn-rot btn-sm" data-act="mitglied_freigeben">Freischalten</button><button class="btn btn-line btn-sm" data-act="mitglied_ablehnen">Ablehnen</button>`
      : d.typ === 'buchung'
        ? `<button class="btn btn-rot btn-sm" data-act="buchung_annehmen">Annehmen</button><button class="btn btn-line btn-sm" data-act="buchung_ablehnen">Ablehnen</button>`
        : '';
    return `<article class="inbox-item" data-id="${esc(it.id)}">
      <div><span class="tag ${d.typ === 'buchung' ? 'tag-schwarz' : ''}">${esc(d.typ === 'registrierung' ? 'Registrierung' : d.typ === 'buchung' ? 'Buchung' : d.typ || 'Info')}</span> <span class="small muted">${esc(fmtWhen(it.receivedAt))}</span></div>
      <h4>${esc(it.title || '')}</h4>
      <p class="small">${esc(it.body || '').replace(/\n/g, '<br>')}</p>
      ${d.details ? `<dl class="inbox-details">${Object.entries(d.details).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : ''}
      <div class="mb-actions">${actions}</div>
      <p class="note" hidden></p>
    </article>`;
  }).join('');
  box.addEventListener('click', async e => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const art = b.closest('.inbox-item'); const it = list.find(x => x.id === art.dataset.id); if (!it) return;
    busy(b, true);
    try {
      await client.items.insert('Aktionen', { title: `${b.dataset.act}: ${it.title || ''}`, typ: b.dataset.act, payload: JSON.stringify(it.data || {}), status: 'offen', von: me.name });
      it.done = b.textContent.trim() + ' (wird ausgeführt)'; await inboxPut(it);
      renderInbox();
    } catch (err) { msg(art.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(b, false); }
  });
}

// ---------- Vorstand: Wer wird benachrichtigt? ----------
async function renderRouting() {
  const box = $('#routing'); if (!box) return;
  let people = [], current = new Map();
  try {
    people = (await client.items.query('AppMitglieder').limit(500).find()).items.filter(p => p.memberId).sort((a, b) => (b.vorstand ? 1 : 0) - (a.vorstand ? 1 : 0) || String(a.name).localeCompare(String(b.name), 'de'));
    const snaps = (await client.items.query('Benachrichtigungen').descending('_createdDate').limit(200).find()).items;
    for (const s of snaps) if (!current.has(s.thema)) current.set(s.thema, s);
  } catch (e) { box.innerHTML = `<p class="note note-err">Konnte die Einstellungen nicht laden: ${esc(errText(e))}</p>`; return; }
  if (!people.length) { box.innerHTML = '<p class="note note-info">Die Mitgliederliste ist noch leer – sie wird vom Push-Dienst automatisch aus den Wix-Mitgliedern befüllt.</p>'; return; }
  box.innerHTML = `
    <p class="small muted">Häkchen setzen = diese Person bekommt eine Push-Nachricht auf ihr Gerät. 📱 = hat Benachrichtigungen aktiviert. Solange für ein Thema nichts gespeichert ist, bekommt der gesamte Vorstand die Nachricht. Änderungen gelten ab der nächsten Nachricht.</p>
    <div class="routing-table"><table>
      <thead><tr><th>Mitglied</th>${BOARD_TOPICS.map(([k, label]) => `<th><span>${esc(label)}</span></th>`).join('')}</tr></thead>
      <tbody>${people.map(p => `<tr><td><b>${esc(p.name)}</b>${p.pushAktiv ? ' 📱' : ''}<br><span class="small muted">${esc((p.rollen || []).join(', ') || 'Mitglied')}</span></td>${BOARD_TOPICS.map(([k]) => `<td><input type="checkbox" data-thema="${k}" data-member="${esc(p.memberId)}" ${(current.get(k)?.empfaenger || []).includes(p.memberId) ? 'checked' : ''} aria-label="${esc(p.name)}: ${esc(k)}"></td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <div class="routing-info">${BOARD_TOPICS.map(([k, label, info]) => `<p class="small"><b>${esc(label)}:</b> ${esc(info)}${current.get(k) ? ` <span class="muted">(zuletzt geändert ${esc(fmtWhen(current.get(k)._createdDate))} von ${esc(current.get(k).von || '–')})</span>` : ''}</p>`).join('')}</div>
    <p class="note" id="routing-msg" hidden></p>
    <div class="mb-actions"><button class="btn btn-rot" type="button" id="routing-save">Speichern</button></div>`;
  $('#routing-save').addEventListener('click', async () => {
    const btn = $('#routing-save'); busy(btn, true); msg($('#routing-msg'), '');
    try {
      for (const [k, label] of BOARD_TOPICS) {
        const ids = $$(`input[data-thema="${k}"]`).filter(c => c.checked).map(c => c.dataset.member);
        const before = current.get(k)?.empfaenger || [];
        if (ids.length === before.length && ids.every(i => before.includes(i))) continue;
        const namen = ids.map(i => people.find(p => p.memberId === i)?.name || i);
        await client.items.insert('Benachrichtigungen', { title: `${label}: ${namen.join(', ') || 'niemand'}`, thema: k, empfaenger: ids, namen, von: me.name });
      }
      msg($('#routing-msg'), 'Gespeichert.', 'ok'); renderRouting();
    } catch (err) { msg($('#routing-msg'), 'Speichern fehlgeschlagen: ' + errText(err)); }
    busy(btn, false);
  });
}

// ---------- Vorstand: Nachricht an alle ----------
async function onBroadcast(e) {
  e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
  const btn = f.querySelector('[type=submit]'); busy(btn, true); msg($('#b-msg'), '');
  try {
    await client.items.insert('Aktionen', { title: `Nachricht: ${$('#b-titel').value.trim()}`, typ: 'nachricht', payload: JSON.stringify({ titel: $('#b-titel').value.trim(), text: $('#b-text').value.trim(), ziel: $('#b-ziel').value }), status: 'offen', von: me.name });
    f.reset(); msg($('#b-msg'), 'Wird in den nächsten Minuten verschickt.', 'ok');
  } catch (err) { msg($('#b-msg'), 'Nicht gespeichert: ' + errText(err)); }
  busy(btn, false);
}

// ===== Start =====
(async function start() {
  if (await completeRedirect()) return;
  if (client.auth.loggedIn()) {
    try { await loadMe(); saveTokens(); await renderHome(); pushClaim(); return; }
    catch (err) { store.del('spd-tokens'); renderAuth('login'); msg($('#l-msg'), 'Sitzung abgelaufen – bitte neu anmelden. (' + errText(err) + ')'); return; }
  }
  renderAuth(location.hash === '#registrieren' ? 'register' : 'login');
})();
