// Drehbücher der Hilfevideos: je Thema (src/lib/hilfe.mjs) die Aktionen zu den Schritten – die Texte kommen aus hilfe.mjs.
// Genutzt von keynote-hilfe.mjs (Keynote-Look). Aktionen: S.tap/point/type/fill/select/nav/more/hash/scroll/overlay/browser/stagePoint.
import { sleep } from './keynote-lib.mjs';

export const SCRIPTS = {
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
      async () => { await S.stagePoint('#dots'); await S.overlay({ kind: 'dropdown', left: 30, right: 30, top: 'auto', bottom: 110, width: 420, items: [{ label: 'Neuer Tab', icon: 'tab' }, { label: 'Teilen …', icon: 'share' }, { label: 'Lesezeichen hinzufügen', icon: 'star' }, { label: 'Zum Home-Bildschirm', icon: 'plus' }, { label: 'Reader anzeigen', icon: 'text' }, { label: 'Auf der Seite suchen', icon: 'search' }], highlight: 3 }); },
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
    async () => { await S.point('.rsvp >> nth=0 >> .ride-list .share, .rsvp >> nth=0 >> .ride-list, .rsvp >> nth=0 >> details.rides'); },
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
    async () => { await S.nav('mitmachen'); },
    async () => { await S.tap('.poll:not(:has([data-vote-save])) >> nth=0 >> [data-vote="0"]'); },
    async () => { await S.point('.poll:not(:has([data-vote-save])) >> nth=0 >> .poll-results'); },
    async () => { await S.scroll('.poll [data-vote-save]'); await S.tap('.poll:has([data-vote-save]) [data-vote="1"]'); await S.tap('.poll:has([data-vote-save]) [data-vote="2"]'); await S.tap('.poll [data-vote-save]'); },
  ] }),
  dokumente: S => ({ start: 'start', steps: [
    async () => { await S.more('wissen'); },
    async () => { await S.point('.doc-title'); },
    async () => { await S.more('rat'); },
    async () => { await S.point('.rat .tops .top >> nth=0, .rat'); },
    async () => { await S.point('.rat >> nth=0 >> a[href^="#rat/fokus-"]'); },
  ] }),
  profil: S => ({ start: 'start', steps: [
    async () => { await S.more('mitglieder'); },
    async () => { await S.point('.member >> nth=1'); },
    async () => { await S.more('profil'); },
    async () => { await S.type('#pf-ort', 'Harber'); await S.type('#pf-tel', '0170 1234567'); await S.tap('#f-profil [name=telefonSichtbar]'); await S.fill('#pf-geb', '1975-05-14'); await S.tap('#f-profil [name=geburtstagSichtbar]'); },
    async () => { await S.tap('#f-profil [type=submit]'); },
  ] }),
  whatsapp: S => ({ start: 'termine', steps: [
    async () => { await S.point('.rsvp >> nth=0 >> .share'); },
    async () => { await S.overlay({ kind: 'sheet', title: 'Teilen', items: [{ label: 'WhatsApp' }, { label: 'Signal' }, { label: 'E-Mail' }, { label: 'Link kopieren' }], highlight: 0 }); await sleep(1400); await S.overlay({ kind: 'sheet', title: 'WhatsApp – An wen senden?', items: [{ label: 'SPD Soltau – Mitglieder' }, { label: 'Ratsfraktion' }, { label: 'Familie' }, { label: 'Nachbarschaft Harber' }], highlight: 0 }); },
    async () => { await S.overlay({ kind: 'dialog', top: '40%', title: 'SPD Soltau – Mitglieder', text: '📅 Sitzung des Soltauer Stadtrates …<br>Zu-/Absage und Mitfahren: spd-soltau.de/mitglieder/#termine/…', buttons: ['Senden'], primary: 0, highlight: 0 }); await sleep(1500); await S.overlayOff(); },
    async () => { await S.point('.rsvp >> nth=0 >> .rsvp-btns'); },
    async () => { await S.nav('start'); await S.scroll('.start-ev .badge'); await S.point('.start-ev .badge'); },
  ] }),
  website: S => ({ start: 'start', steps: [
    async () => { await S.tap('.app-globe'); await S.app().locator('#app-return a').waitFor({ timeout: 25000 }); },
    async () => { await S.app().locator('body').evaluate(() => window.scrollTo({ top: 500, behavior: 'smooth' })); await sleep(1200); },
    async () => { await S.app().locator('body').evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(800); await S.tap('#app-return a'); await S.app().locator('#mb-view').waitFor({ timeout: 25000 }); },
    async () => { await S.page.evaluate(u => loadApp(u), `${S.base}/`); await S.app().locator('#member-link').waitFor({ timeout: 25000 }); await sleep(600); await S.point('#member-link'); },
  ] }),
};
// Plattform-abhängige Schrittlisten (steps als Objekt) auflösen
for (const id of Object.keys(SCRIPTS)) {
  const orig = SCRIPTS[id];
  SCRIPTS[id] = S => { const sc = orig(S); if (sc.steps && !Array.isArray(sc.steps)) sc.steps = sc.steps[S.plat] || sc.steps.alle || []; return sc; };
}
