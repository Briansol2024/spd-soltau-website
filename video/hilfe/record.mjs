// Zeichnet die Hilfevideos auf: je Thema (src/lib/hilfe.mjs) und Plattform ein Screencast der Demo-App auf der Bühne (stage.html)
// mit Titelkarte, Untertiteln (die Schritte), Tipp-/Maus-Anzeige und nachgebauten System-Dialogen. Ohne Ton – Musik kommt in compose.py.
//   node video/hilfe/record.mjs                 alle Themen, alle Plattformen (vorhandene werden übersprungen)
//   node video/hilfe/record.mjs 05 ios          nur Thema 05 für iOS (oder: 05 alle / alle ios)
//   FORCE=1 …                                  vorhandene Aufnahmen neu machen
// Voraussetzung: Website gebaut (node build.mjs) und Server auf http://localhost:8080 (node serve.mjs)
import { chromium } from 'playwright';
import { mkdir, rename, rm, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { HELP_TOPICS, PLATFORMS, stepsFor, videoName } from '../../src/lib/hilfe.mjs';

const BASE = process.env.BASE || 'http://localhost:8080';
const HERE = path.resolve('video/hilfe');
const TMP = path.join(HERE, 'tmp');
const STAGE = pathToFileURL(path.join(HERE, 'stage.html')).href;
const [onlyTopic = 'alle', onlyPlat = 'alle'] = process.argv.slice(2);
const FORCE = !!process.env.FORCE;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Bühnen-Maße: Handyvideos 720×1280, PC 1280×720
const PROFILES = {
  android: { mobile: true, W: 720, H: 1280, appW: 412, appH: 700, screenW: 480, deviceTop: 96 },
  ios: { mobile: true, W: 720, H: 1280, appW: 390, appH: 700, screenW: 480, deviceTop: 96 },
  windows: { mobile: false, W: 1280, H: 720, appW: 1180, appH: 480, screenW: 1180, deviceTop: 76 },
  macos: { mobile: false, W: 1280, H: 720, appW: 1180, appH: 480, screenW: 1180, deviceTop: 76 },
};
const holdFor = text => Math.min(9, Math.max(3.4, 2.4 + text.length * 0.048)) * 1000;

await mkdir(TMP, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu-vsync', '--autoplay-policy=no-user-gesture-required'] });

async function recordOne(topic, plat) {
  const P = PROFILES[plat];
  const zoom = P.screenW / P.appW;
  const screenH = P.mobile ? 40 + Math.round(P.appH * zoom) + 26 : 36 + P.appH;
  const name = videoName(topic, plat);
  const out = path.join(TMP, name + '.webm');
  if (!FORCE) { try { await stat(out); console.log('  übersprungen (vorhanden):', name); return; } catch (e) { /* aufnehmen */ } }
  const ctx = await browser.newContext({
    viewport: { width: P.W, height: P.H }, deviceScaleFactor: 1, isMobile: P.mobile, hasTouch: P.mobile, locale: 'de-DE',
    recordVideo: { dir: TMP, size: { width: P.W, height: P.H } },
  });
  // Die App im iframe läuft vergrößert (Zoom), damit sie im Video groß und scharf ist
  await ctx.addInitScript(z => {
    if (window.top === window) return;
    const apply = () => { document.documentElement.style.zoom = String(z); };
    if (document.documentElement) apply(); else new MutationObserver((m, o) => { if (document.documentElement) { apply(); o.disconnect(); } }).observe(document, { childList: true });
  }, zoom);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(STAGE);
  await page.evaluate(c => setup(c), { plat: plat, mobile: P.mobile, W: P.W, H: P.H, screenW: P.screenW, screenH, deviceTop: P.deviceTop, n: topic.n, title: topic.title });
  const app = () => page.frameLocator('#app');
  const S = {
    page, plat, mobile: P.mobile, app,
    async load(hash, opts = {}) {
      const url = `${BASE}/mitglieder/?demo&video&r=${Date.now()}${opts.query || ''}#${hash}`; // r=…: erzwingt Neuladen, auch wenn sich nur der #-Teil ändert
      await page.evaluate(u => loadApp(u), url);
      await app().locator(opts.wait || '#mb-view .section-head, #mb-view .start-grid, #f-login, #f-register').first().waitFor({ timeout: 15000 });
      await sleep(600);
    },
    async point(sel) {
      const loc = app().locator(sel).first();
      await loc.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
      await sleep(250);
      const b = await loc.boundingBox();
      if (b) await S.pointAt(b.x + b.width / 2, b.y + Math.min(b.height / 2, 40));
      return loc;
    },
    async pointAt(x, y) {
      if (P.mobile) { await page.evaluate(([x, y]) => tapAt(x, y), [x, y]); await sleep(450); }
      else { await page.evaluate(([x, y]) => cursorTo(x, y), [x, y]); await sleep(650); await page.evaluate(([x, y]) => ringAt(x, y), [x, y]); await sleep(280); }
    },
    async tap(sel) { const loc = await S.point(sel); await loc.click({ timeout: 8000 }); await sleep(500); },
    async type(sel, text) { const loc = await S.point(sel); await loc.click({ timeout: 8000 }); await loc.pressSequentially(text, { delay: 42 }); await sleep(250); },
    async fill(sel, value) { const loc = await S.point(sel); await loc.fill(value); await sleep(300); },
    async select(sel, value) { const loc = await S.point(sel); await loc.selectOption(value); await sleep(400); },
    async nav(sec) { if (P.mobile) await S.tap(`.mb-tabbar [data-tab="${sec}"]`); else await S.tap(`.mb-side a[data-sec="${sec}"]`); await sleep(500); },
    async more(sec) { if (P.mobile) { await S.tap('#mb-more'); await sleep(500); await S.tap(`.mb-sheet a[data-sec="${sec}"]`); } else await S.tap(`.mb-side a[data-sec="${sec}"]`); await sleep(600); },
    async hash(h) { await app().locator('body').evaluate((b, h) => { location.hash = h; }, h); await sleep(900); },
    async scroll(sel) { await app().locator(sel).first().evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' })).catch(() => {}); await sleep(900); },
    async overlay(spec) { await page.evaluate(s => overlay(s), spec); await sleep(500); const t = await page.evaluate(() => overlayTarget()); if (t) await S.pointAt(t.x, t.y); },
    async overlayOff() { await page.evaluate(() => overlayOff()); await sleep(300); },
    async browser(on, url) { await page.evaluate(([o, u]) => setBrowser(o, u), [on, url || '']); },
    async stagePoint(sel) { const b = await page.locator(sel).boundingBox(); if (b) await S.pointAt(b.x + b.width / 2, b.y + b.height / 2); },
  };
  const script = SCRIPTS[topic.id] ? SCRIPTS[topic.id](S) : { start: 'start', steps: [] };
  const t0 = Date.now();
  try {
    await S.load(script.start || 'start', script.loadOpts || {});
    await page.evaluate(() => showTitle(true)); await sleep(2800); await page.evaluate(() => showTitle(false)); await sleep(400);
    if (script.before) await script.before();
    const steps = stepsFor(topic, plat);
    for (let i = 0; i < steps.length; i++) {
      await page.evaluate(([n, t]) => caption(n, t), [i + 1, steps[i]]);
      const act = script.steps[i];
      if (act) { try { await act(); } catch (e) { console.log(`  ! Schritt ${i + 1} (${name}):`, e.message.split('\n')[0]); } }
      await sleep(holdFor(steps[i]));
    }
    await page.evaluate(() => caption(0, '')); await sleep(400);
    await page.evaluate(() => showEnd(true)); await sleep(2600);
  } finally {
    const v = page.video();
    await ctx.close();
    const p = await v.path();
    await rename(p, out);
    await writeFile(path.join(TMP, name + '.json'), JSON.stringify({ name, plat, seconds: (Date.now() - t0) / 1000, errors }), 'utf8');
    console.log(`  ${name}: ${((Date.now() - t0) / 1000).toFixed(0)} s${errors.length ? ' – Fehler: ' + errors[0] : ''}`);
  }
}

// ---------- Drehbücher: je Thema die Aktionen zu den Schritten (Texte kommen aus hilfe.mjs) ----------
const SCRIPTS = {
  registrieren: S => ({ start: 'registrieren', loadOpts: { wait: '#f-register' }, steps: [
    async () => { await S.tap('.mb-tabs [data-tab="register"]'); },
    async () => { await S.type('#r-vn', 'Max'); await S.type('#r-nn', 'Mustermann'); await S.type('#r-mail', 'max.mustermann@example.de'); await S.type('#r-pw', 'Soltau2026!'); await S.type('#r-pw2', 'Soltau2026!'); },
    async () => { await S.tap('#r-ds'); await S.tap('#f-register [type=submit]'); await S.app().locator('#f-verify').waitFor({ timeout: 8000 }); },
    async () => { await S.type('#v-code', '482913'); await S.tap('#f-verify [type=submit]'); },
    async () => { await S.point('#pending-back'); },
    async () => { await S.tap('#pending-back'); await S.type('#l-mail', 'max.mustermann@example.de'); await S.type('#l-pw', 'Soltau2026!'); await S.tap('#f-login [type=submit]'); await S.app().locator('#mb-view .start-grid').waitFor({ timeout: 25000 }); },
    async () => { await S.load('anmelden', { wait: '#f-login' }); await S.tap('#l-reset'); },
  ] }),
  installieren: S => ({ start: 'start', before: async () => { await S.browser(true, 'spd-soltau.de/mitglieder'); }, steps: {
    android: [
      async () => { await S.stagePoint('#url'); },
      async () => { await S.stagePoint('#dots'); await S.overlay({ kind: 'dropdown', right: 14, top: 60, width: 300, items: [{ label: 'Neuer Tab', icon: 'plus' }, { label: 'Neuer Inkognitotab' }, { label: 'Verlauf' }, { label: 'Downloads' }, { label: 'Lesezeichen', icon: 'star' }, { label: 'App installieren', icon: 'install' }, { label: 'Teilen …', icon: 'share' }, { label: 'Auf der Seite suchen', icon: 'search' }], highlight: 5 }); },
      async () => { await S.overlay({ kind: 'dialog', icon: true, title: 'SPD Soltau installieren?', text: 'spd-soltau.de', buttons: ['Abbrechen', 'Installieren'], primary: 1, highlight: 1 }); },
      async () => { await S.overlay({ kind: 'home' }); },
      async () => { await S.overlayOff(); await S.browser(false); await S.point('.mb-head .title'); },
    ],
    ios: [
      async () => { await S.stagePoint('#url'); },
      async () => { await S.stagePoint('#dots'); await S.overlay({ kind: 'sheet', apps: true, items: [{ label: 'Kopieren', icon: 'copy' }, { label: 'Zur Leseliste hinzufügen', icon: 'book' }, { label: 'Lesezeichen hinzufügen', icon: 'star' }, { label: 'Zum Home-Bildschirm', icon: 'plus' }, { label: 'Auf der Seite suchen', icon: 'search' }, { label: 'Drucken', icon: 'print' }], highlight: 3 }); },
      async () => { await S.overlay({ kind: 'dialog', icon: true, title: 'Zum Home-Bildschirm', text: 'SPD Soltau<br><span style="color:#888">spd-soltau.de/mitglieder</span>', buttons: ['Abbrechen', 'Hinzufügen'], primary: 1, highlight: 1 }); },
      async () => { await S.overlay({ kind: 'home' }); },
      async () => { await S.overlayOff(); await S.browser(false); await S.point('.mb-head .title'); },
    ],
    windows: [
      async () => { await S.stagePoint('#url'); },
      async () => { await S.stagePoint('#dots'); await S.overlay({ kind: 'dialog', icon: true, top: '22%', width: 380, title: 'SPD Soltau installieren?', text: 'Herausgeber: spd-soltau.de', buttons: ['Nicht jetzt', 'Installieren'], primary: 1, highlight: 1 }); },
      async () => { await S.overlayOff(); await S.browser(false); await S.stagePoint('#titlebar .win'); },
      async () => { await S.overlay({ kind: 'toast', top: 90, title: 'SPD Soltau', text: 'Installiert – im Startmenü unter S' }); },
    ],
    macos: [
      async () => { await S.stagePoint('#url'); },
      async () => { await S.overlay({ kind: 'menubar', open: 'Ablage', items: [{ label: 'Neues Fenster' }, { label: 'Neues privates Fenster' }, { label: 'Neuer Tab' }, { label: 'Datei öffnen …' }, { label: 'Zum Dock hinzufügen', icon: 'install' }, { label: 'Als PDF exportieren …' }, { label: 'Drucken …', icon: 'print' }], highlight: 4 }); },
      async () => { await S.overlay({ kind: 'dialog', icon: true, title: 'Zum Dock hinzufügen', text: 'SPD Soltau<br><span style="color:#888">spd-soltau.de/mitglieder</span>', buttons: ['Abbrechen', 'Hinzufügen'], primary: 1, highlight: 1 }); },
      async () => { await S.overlayOff(); await S.browser(false); await S.overlay({ kind: 'toast', top: 90, title: 'SPD Soltau', text: 'Liegt jetzt im Dock' }); },
    ],
  } }),
  benachrichtigungen: S => ({ start: 'start', steps: S.plat === 'ios' ? [
    async () => { await S.point('.mb-head .title'); },
    async () => { await S.more('profil'); await S.scroll('#push-card'); },
    async () => { await S.tap('#push-on'); await S.overlay({ kind: 'dialog', icon: true, title: '„SPD Soltau“ möchte dir Mitteilungen senden', text: 'Mitteilungen können Hinweise, Töne und Symbolkennzeichen sein.', buttons: ['Nicht erlauben', 'Erlauben'], primary: 1, highlight: 1 }); await sleep(1500); await S.overlayOff(); },
    async () => { await S.point('#push-topics'); },
    async () => { await S.point('#push-on'); },
  ] : [
    async () => { await S.more('profil'); await S.scroll('#push-card'); },
    async () => { await S.tap('#push-on'); },
    async () => { await S.overlay(S.plat === 'macos' ? { kind: 'dialog', icon: true, title: '„SPD Soltau“ möchte dir Mitteilungen senden', buttons: ['Nicht erlauben', 'Erlauben'], primary: 1, highlight: 1 } : { kind: 'dialog', top: S.mobile ? '30%' : '22%', title: 'spd-soltau.de möchte Benachrichtigungen senden', buttons: ['Blockieren', 'Zulassen'], primary: 1, highlight: 1 }); await sleep(1500); await S.overlayOff(); },
    async () => { await S.point('#push-topics'); },
    async () => { await S.point('#push-on'); },
  ] }),
  ueberblick: S => ({ start: 'start', steps: [
    async () => { await S.point('.start-grid'); },
    async () => { if (S.mobile) await S.point('.mb-tabbar'); else await S.point('.mb-side'); },
    async () => { if (S.mobile) { await S.tap('#mb-more'); await sleep(1600); await S.tap('.mb-sheet-close'); } else { await S.point('.mb-side .mb-group:nth-child(2)'); } },
    async () => { await S.tap('.app-globe'); await S.app().locator('#app-return a').waitFor({ timeout: 25000 }); await sleep(1500); await S.tap('#app-return a'); await S.app().locator('#mb-view').waitFor({ timeout: 25000 }); },
    async () => { await S.point('#app-me'); if (S.mobile) { await S.tap('#mb-more'); await sleep(400); await S.point('.mb-sheet .mb-logout'); await sleep(800); await S.tap('.mb-sheet-close'); } else await S.point('.mb-side .mb-logout'); },
  ] }),
  zusagen: S => ({ start: 'start', steps: [
    async () => { await S.nav('termine'); },
    async () => { await S.point('.rsvp >> nth=0 >> .meta'); },
    async () => { await S.tap('.rsvp >> nth=0 >> [data-status="zusage"]'); },
    async () => { await S.tap('.rsvp >> nth=1 >> [data-status="absage"]'); await S.type('.rsvp >> nth=1 >> .rsvp-grund input', 'Schicht'); await S.tap('.rsvp >> nth=1 >> [data-save-grund]'); },
    async () => { await S.tap('.rsvp >> nth=1 >> [data-status="zusage"]'); },
  ] }),
  helfen: S => ({ start: 'termine', steps: [
    async () => { await S.scroll('.hl-embed'); },
    async () => { await S.point('.hl-embed .shift >> nth=0'); },
    async () => { await S.tap('.hl-embed .shift button[data-shift]:not([disabled])'); },
    async () => { await S.tap('.hl-embed .shift button[aria-pressed="true"]'); },
    async () => { await S.scroll('#helferlisten, #kalender'); },
  ] }),
  mitfahren: S => ({ start: 'termine', steps: [
    async () => { await S.tap('.rsvp >> nth=0 >> details.rides summary'); },
    async () => { await S.select('.rsvp >> nth=0 >> .ride-form select[name=typ]', 'biete'); await S.fill('.rsvp >> nth=0 >> .ride-form [name=ab]', ''); await S.type('.rsvp >> nth=0 >> .ride-form [name=ab]', 'Harber'); await S.fill('.rsvp >> nth=0 >> .ride-form [name=zeit]', '17:30'); },
    async () => { await S.tap('.rsvp >> nth=0 >> .ride-form [type=submit]'); },
    async () => { await S.point('.rsvp >> nth=0 >> .ride .wa'); },
  ] }),
  kalender: S => ({ start: 'termine', steps: {
    android: [
      async () => { await S.scroll('#kalender'); },
      async () => { await S.tap('#kalender [data-copy]'); },
      async () => { await S.overlay({ kind: 'dialog', top: '34%', width: 380, title: 'Per URL', text: '<div style="border:1px solid #ccc;border-radius:6px;padding:10px;font-size:15px;color:#333">https://www.spd-soltau.de/assets/termine-intern-….ics</div>', buttons: ['Abbrechen', 'Kalender hinzufügen'], primary: 1, highlight: 1 }); },
      async () => { await S.overlayOff(); await S.overlay({ kind: 'toast', top: 80, title: 'Google Kalender', text: 'SPD Soltau – Termine hinzugefügt' }); },
    ],
    ios: [
      async () => { await S.scroll('#kalender'); },
      async () => { await S.point('#kalender a[href^="webcal"]'); },
      async () => { await S.overlay({ kind: 'dialog', title: 'Kalender abonnieren?', text: 'Der Kalender „SPD Soltau – Termine“ wird zu deinen abonnierten Kalendern hinzugefügt.', buttons: ['Abbrechen', 'Abonnieren'], primary: 1, highlight: 1 }); await sleep(2200); await S.overlay({ kind: 'dialog', title: 'SPD Soltau – Termine', text: 'Abonniert ✓', buttons: ['Fertig'], primary: 0, highlight: 0 }); },
      async () => { await S.overlayOff(); await S.overlay({ kind: 'toast', top: 80, title: 'Kalender', text: 'Neue Termine erscheinen automatisch' }); },
    ],
    windows: [
      async () => { await S.scroll('#kalender'); },
      async () => { await S.tap('#kalender [data-copy]'); },
      async () => { await S.overlay({ kind: 'dialog', top: '36%', width: 460, title: 'Aus dem Internet abonnieren', text: '<div style="border:1px solid #ccc;padding:8px;font-size:14px;color:#333">https://www.spd-soltau.de/assets/termine-intern-….ics</div>', buttons: ['Abbrechen', 'Importieren'], primary: 1, highlight: 1 }); },
      async () => { await S.overlay({ kind: 'dialog', top: '36%', width: 460, title: 'Per URL – Google Kalender', text: '<div style="border:1px solid #ccc;padding:8px;font-size:14px;color:#333">https://www.spd-soltau.de/assets/termine-intern-….ics</div>', buttons: ['Kalender hinzufügen'], primary: 0, highlight: 0 }); },
    ],
    macos: [
      async () => { await S.scroll('#kalender'); },
      async () => { await S.point('#kalender a[href^="webcal"]'); },
      async () => { await S.overlay({ kind: 'dialog', title: 'Kalenderabonnement', text: 'Kalender-URL: webcal://www.spd-soltau.de/assets/termine-intern-….ics', buttons: ['Abbrechen', 'Abonnieren'], primary: 1, highlight: 1 }); await sleep(2200); await S.overlay({ kind: 'dialog', title: '„SPD Soltau – Termine“', text: 'Automatisch aktualisieren: Jeden Tag', buttons: ['Abbrechen', 'OK'], primary: 1, highlight: 1 }); },
      async () => { await S.overlayOff(); },
    ],
  } }),
  umfragen: S => ({ start: 'start', steps: [
    async () => { await S.nav('umfragen'); },
    async () => { await S.tap('.poll:not(:has([data-vote-save])) >> nth=0 >> [data-vote="0"]'); },
    async () => { await S.point('.poll:not(:has([data-vote-save])) >> nth=0 >> .poll-results'); },
    async () => { await S.scroll('.poll [data-vote-save]'); await S.tap('.poll:has([data-vote-save]) [data-vote="1"]'); await S.tap('.poll:has([data-vote-save]) [data-vote="2"]'); await S.tap('.poll [data-vote-save]'); },
  ] }),
  dokumente: S => ({ start: 'start', steps: [
    async () => { await S.more('dokumente'); },
    async () => { await S.point('.doc-title'); },
    async () => { await S.more('rat'); },
    async () => { await S.point('.rat .tops, .rat'); },
  ] }),
  profil: S => ({ start: 'start', steps: [
    async () => { await S.more('mitglieder'); },
    async () => { await S.point('.member >> nth=1'); },
    async () => { await S.more('profil'); },
    async () => { await S.type('#pf-ort', 'Harber'); await S.type('#pf-tel', '0170 1234567'); await S.tap('#f-profil [name=telefonSichtbar]'); await S.fill('#pf-geb', '1975-05-14'); await S.tap('#f-profil [name=geburtstagSichtbar]'); },
    async () => { await S.tap('#f-profil [type=submit]'); },
  ] }),
  whatsapp: S => ({ start: 'termine', steps: [
    async () => { await S.point('.rsvp >> nth=0 >> .wa'); },
    async () => { await S.overlay({ kind: 'sheet', title: 'WhatsApp – An wen senden?', items: [{ label: 'SPD Soltau – Mitglieder' }, { label: 'Ratsfraktion' }, { label: 'Familie' }, { label: 'Nachbarschaft Harber' }], highlight: 0 }); },
    async () => { await S.overlay({ kind: 'dialog', top: '40%', title: 'SPD Soltau – Mitglieder', text: '📅 Sitzung des Soltauer Stadtrates …<br>Zu-/Absage und Mitfahren: spd-soltau.de/mitglieder/#termine/…', buttons: ['Senden'], primary: 0, highlight: 0 }); await sleep(1500); await S.overlayOff(); },
    async () => { await S.point('.rsvp >> nth=0 >> .rsvp-btns'); },
    async () => { await S.nav('start'); await S.scroll('.start-ev .badge'); await S.point('.start-ev .badge'); },
  ] }),
  website: S => ({ start: 'start', steps: [
    async () => { await S.tap('.app-globe'); await S.app().locator('#app-return a').waitFor({ timeout: 25000 }); },
    async () => { await S.app().locator('body').evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' })); await sleep(1200); },
    async () => { await S.app().locator('body').evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(800); await S.tap('#app-return a'); await S.app().locator('#mb-view').waitFor({ timeout: 25000 }); },
    async () => { await S.page.evaluate(u => loadApp(u), `${BASE}/`); await S.app().locator('#member-link').waitFor({ timeout: 25000 }); await sleep(600); await S.point('#member-link'); },
  ] }),
};
// Plattform-abhängige Schrittlisten (steps als Objekt) auflösen
for (const id of Object.keys(SCRIPTS)) {
  const orig = SCRIPTS[id];
  SCRIPTS[id] = S => { const sc = orig(S); if (sc.steps && !Array.isArray(sc.steps)) sc.steps = sc.steps[S.plat] || sc.steps.alle || []; return sc; };
}

const topics = HELP_TOPICS.filter(t => onlyTopic === 'alle' || t.n === onlyTopic || t.id === onlyTopic);
const plats = PLATFORMS.map(p => p[0]).filter(p => onlyPlat === 'alle' || p === onlyPlat);
console.log(`Aufnahme: ${topics.length} Themen × ${plats.length} Plattformen`);
for (const t of topics) {
  console.log(`${t.n} ${t.title}`);
  for (const p of plats) await recordOne(t, p);
}
await browser.close();
console.log('fertig');
