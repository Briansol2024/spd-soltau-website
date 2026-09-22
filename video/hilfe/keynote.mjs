// Keynote-Rundgänge (Hochkant 720×1280): dramatisch statt Schritt-für-Schritt – Kapitelwörter, Kamerafahrten aufs Handy,
// große Schlagzeilen. Bühne: keynote.html, App: Demo-Modus mit Beispieldaten. Ohne Ton, Musik kommt in compose_tour.py (keynote.wav).
//   node video/hilfe/keynote.mjs              beide (mitglieder, rat)
//   node video/hilfe/keynote.mjs rat          nur einen
//   DEBUG=1 …                                 nach jedem Schritt ein Bild nach video/hilfe/tmp/kn-*.png
// Voraussetzung: Website gebaut (node build.mjs) und Server auf http://localhost:8080 (node serve.mjs)
import { record, beat, sleep, closeBrowser } from './keynote-lib.mjs';

const only = process.argv[2] || 'alle';

const TOUREN = {
  mitglieder: { name: 'keynote-mitglieder', rolle: 'mitglied', script: async S => {
    // ---- Intro: schwarz, Worte ----
    await S.load('start');
    await S.cover(['Die App.', '*Für alle Mitglieder.'], 'SPD Soltau · Mitgliederbereich');
    await S.kicker('SPD Soltau'); await sleep(900);
    await S.word('Moin.', 1400); await S.kicker('');
    await S.head(['Eine App.', 'Für alle', 'Mitglieder.'], { pos: 'center' }); await sleep(2300); await S.headOff(); await sleep(200);
    // ---- Handy tritt auf ----
    await S.phone('in'); await sleep(1100); await S.calibrate('.mb-tabbar');
    await S.kicker('Der Mitgliederbereich');
    await beat(S, ['Alles, was du brauchst.', '*An einem Ort.'], 2600);
    await S.kicker('');
    // ---- Termine ----
    await S.word('Termine.', 1500);
    await S.nav('termine'); await sleep(300);
    await S.cam('.rsvp >> nth=0 >> .rsvp-btns', { s: 1.75, cy: 520 });
    await S.tap('.rsvp >> nth=0 >> [data-status="zusage"]'); await sleep(300);
    await beat(S, ['Ein Tipp.', '*Zugesagt.'], 2000, { over: true });
    await S.tap('.rsvp >> nth=0 >> details.rides summary'); await sleep(300);
    await S.select('.rsvp >> nth=0 >> .ride-form select[name=typ]', 'biete'); await S.fill('.rsvp >> nth=0 >> .ride-form [name=ab]', 'Harber'); await S.fill('.rsvp >> nth=0 >> .ride-form [name=zeit]', '17:30');
    await S.cam('.rsvp >> nth=0 >> .ride-form [type=submit]', { s: 1.75, cy: 520, ms: 700 });
    await S.tap('.rsvp >> nth=0 >> .ride-form [type=submit]'); await sleep(500); await S.cam('.rsvp >> nth=0 >> details.rides summary', { s: 1.75, cy: 520, ms: 500 });
    await beat(S, ['Mitfahren?', '*Geregelt.'], 2000, { over: true });
    await S.cam('.hl-embed .shift >> nth=0', { s: 1.75, cy: 520 });
    await S.tap('.hl-embed .shift button[data-shift]:not([disabled])'); await sleep(500); await S.cam('.hl-embed .shift button[aria-pressed="true"], .hl-embed .shift >> nth=0', { s: 1.75, cy: 520, ms: 500 });
    await beat(S, ['Helfen.', '*Eingetragen.'], 2000, { over: true });
    await S.cam('#kalender', { s: 1.4, cy: 560 });
    await beat(S, ['Jeder Termin.', '*In deinem Kalender.'], 2300, { over: true });
    await S.camReset();
    // ---- Mitmachen ----
    await S.word('Mitmachen.', 1500);
    await S.nav('mitmachen'); await sleep(300);
    await S.cam('.poll:not(:has([data-vote-save])) >> nth=0', { s: 1.55, cy: 560 });
    await S.tap('.poll:not(:has([data-vote-save])) >> nth=0 >> [data-vote="0"]'); await sleep(500);
    await beat(S, ['Deine Stimme.', '*Sofort gezählt.'], 2200, { over: true });
    await S.hash('ideen'); await S.cam('.idee-like:not(.an) >> nth=0', { s: 1.6, cy: 540 });
    await S.tap('.idee-like:not(.an) >> nth=0'); await sleep(300);
    await beat(S, ['Deine Idee.', '*Für alle sichtbar.'], 2200, { over: true });
    await S.camReset(); await S.hash('versammlung'); await sleep(300);
    await beat(S, ['Versammlungen.', '*Abstimmen per Handy.'], 2300);
    // ---- Wissen ----
    await S.word('Wissen.', 1500);
    await S.nav('wissen'); await sleep(300);
    await beat(S, ['Protokolle. Anträge.', '*Alles da.'], 2200);
    await S.hash('wissen/grundwissen'); await S.cam('.doc-cat >> nth=0', { s: 1.45, cy: 520 });
    await beat(S, ['Kommunalpolitik.', '*In zehn Kapiteln.'], 2200, { over: true });
    await S.camReset(); await S.hash('wissen'); await S.cam('.chip[data-q="Kita"]', { s: 1.6, cy: 500 });
    await S.tap('.chip[data-q="Kita"]'); await sleep(500);
    await beat(S, ['Ein Wort.', '*Alles gefunden.'], 2200, { over: true });
    await S.camReset();
    // ---- Immer dabei ----
    await S.word('Immer dabei.', 1500, true);
    await S.more('profil'); await S.cam('#push-on', { s: 1.7, cy: 520 });
    await S.tap('#push-on'); await sleep(400);
    await beat(S, ['Etwas Neues?', '*Du erfährst es zuerst.'], 2300, { over: true });
    await S.cam('h3:has-text("Als App")', { s: 1.45, cy: 480 });
    await beat(S, ['Ohne App-Store.', '*Direkt aufs Handy.'], 2300, { over: true });
    await S.camReset();
    // ---- Und du? Registrieren ----
    await S.word('Und du?', 1400);
    await S.load('registrieren', '#f-register'); await S.tap('.mb-tabs [data-tab="register"]');
    await S.cam('#r-vn', { s: 1.5, cy: 430 });
    await S.type('#r-vn', 'Max', 60); await S.fill('#r-nn', 'Mustermann'); await S.fill('#r-mail', 'max.mustermann@example.de'); await S.fill('#r-pw', 'Soltau2026!'); await S.fill('#r-pw2', 'Soltau2026!');
    await beat(S, ['Name. E-Mail.', '*Passwort.'], 1900, { over: true });
    await S.camReset(); await S.tap('#r-ds'); await S.tap('#f-register [type=submit]'); await S.app().locator('#f-verify').waitFor({ timeout: 8000 }); await sleep(300);
    await S.type('#v-code', '482913', 70); await S.tap('#f-verify [type=submit]'); await sleep(500);
    await beat(S, ['Ein Code.', '*Freigeschaltet.'], 2200);
    // ---- Finale ----
    await S.phone('out'); await sleep(700);
    await S.flash(); await S.word('Heute.', 1500); await S.phone('out');
    await S.end({ big: 'Jetzt<br>registrieren.', adr: 'spd-soltau.de/mitglieder', sub: 'Fünf Minuten – und du bist dabei.' }); await sleep(4200);
  } },
  rat: { name: 'keynote-ratsmitglieder', rolle: 'rat', script: async S => {
    await S.load('start');
    await S.cover(['Für den Rat.', '*Sitzungen. Ratsarbeit.'], 'SPD Soltau · Fraktion');
    await S.kicker('SPD Soltau · Fraktion'); await sleep(900);
    await S.word('Für den Rat.', 1500, true); await S.kicker('');
    await S.head(['Alles für Mitglieder.', '*Und mehr.'], { pos: 'center' }); await sleep(2200); await S.headOff(); await sleep(200);
    await S.phone('in'); await sleep(1100); await S.calibrate('.mb-tabbar');
    await S.cam('.mb-tabbar [data-tab="ratsarbeit"]', { s: 1.7, cy: 640 });
    await beat(S, ['Ratsarbeit.', '*Ein Tipp entfernt.'], 2200, { over: true });
    await S.camReset();
    // ---- Ratsarbeit ----
    await S.word('Ratsarbeit.', 1500);
    await S.nav('ratsarbeit'); await sleep(300);
    await S.cam('.rz-t >> nth=0', { s: 1.55, cy: 520 });
    await S.tap('.rz-hak >> nth=0'); await sleep(300);
    await beat(S, ['Aufgabe erledigt.', '*Ein Haken.'], 2100, { over: true });
    await S.cam('.rz-dok >> nth=0', { s: 1.5, cy: 540 });
    await beat(S, ['Anträge.', '*Vom Entwurf zum Beschluss.'], 2300, { over: true, small: true });
    await S.camReset(); await S.tap('a[href="#ratsarbeit/b-bau"]'); await sleep(600);
    await beat(S, ['Jeder Ausschuss.', '*Aufgaben. Dokumente. Leute.'], 2400, { small: true });
    // ---- Sitzungen ----
    await S.word('Sitzungen.', 1500);
    await S.more('rat'); await sleep(300);
    await S.cam('.rat >> nth=0 >> .top >> nth=0', { s: 1.55, cy: 540 });
    await beat(S, ['Unsere Haltung.', '*Zu jedem Punkt.'], 2300, { over: true });
    await S.camReset();
    // ---- Sitzungsmodus ----
    await S.word('Sitzungsmodus.', 1500, true);
    await S.tap('.rat >> nth=0 >> a[href^="#rat/fokus-"]'); await S.app().locator('#fo-top').waitFor({ timeout: 8000 }); await sleep(400);
    await S.tap('#fo-verstanden').catch(() => {});
    await S.cam('#fo-top', { s: 1.3, cy: 560 });
    await beat(S, ['Ein Punkt.', '*Groß und klar.'], 2200, { over: true });
    await S.cam('#fo-leiten', { s: 1.6, cy: 520, ms: 700 }); await S.tap('#fo-leiten'); await sleep(500); await S.cam('#fo-leiten', { s: 1.6, cy: 520, ms: 400 });
    await beat(S, ['Ich leite.', '*Alle Geräte folgen.'], 2100, { over: true });
    await S.cam('#fo-next', { s: 1.5, cy: 560, ms: 700 }); await S.tap('#fo-next'); await sleep(400); await S.cam('#fo-top', { s: 1.3, cy: 560, ms: 700 });
    await beat(S, ['Nächster Punkt.', '*Bei allen zugleich.'], 2000, { over: true });
    await S.cam('.fokus-beschluss', { s: 1.6, cy: 520 });
    await S.tap('[data-beschluss="angenommen"]'); await sleep(500); await S.cam('#fo-abst', { s: 1.6, cy: 520, ms: 500 }); await S.type('#fo-abst', '19 : 10', 70); await S.page.keyboard.press('Enter'); await sleep(700);
    await S.phone('dim'); await S.counterText('19 : 10', 'Angenommen'); await sleep(1900); await S.counterOff(); await S.phone('in'); await sleep(500);
    await beat(S, ['Ergebnis.', '*Nur die Leitung trägt ein.'], 2200, { over: true, small: true });
    await S.camReset();
    await S.tap('#fo-notizen'); await sleep(500); await S.type('#nz-ta', 'Nachfragen: Kosten Radspur?', 40); await sleep(500);
    await beat(S, ['Deine Notizen.', '*Nur für dich.'], 2000);
    await S.tap('#nz-zu'); await sleep(300);
    await S.tap('#fo-chat-toggle'); await sleep(400); await S.cam('#fo-chat-in', { s: 1.4, cy: 560 });
    await S.type('#fo-chat-in', 'Bleiben wir bei dafür?', 40); await S.tap('#fo-chat-form button[type=submit]'); await sleep(400);
    await beat(S, ['Fraktions-Chat.', '*Leise abgestimmt.'], 2200, { over: true });
    await S.camReset(); await S.tap('a.btn:has-text("Beenden")'); await sleep(700);
    await S.cam('.rat >> nth=0 >> .top-ergebnis', { s: 1.5, cy: 560 });
    await beat(S, ['Nach der Sitzung.', '*Für alle nachlesbar.'], 2300, { over: true });
    await S.camReset();
    // ---- Finale ----
    await S.phone('out'); await sleep(700);
    await S.flash(); await S.word('Bereit?', 1500); await S.phone('out');
    await S.end({ big: 'Fragen?<br>Der Vorstand hilft.', adr: 'spd-soltau.de/mitglieder', sub: 'Ratsarbeit und Sitzungen – ab heute in der App.' }); await sleep(4000);
  } },
};

// ---------- „So bekommst du die App“: je Plattform ein kurzer Clip, gleicher Anfang und Schluss ----------
const appIntro = async (S, kicker) => {
  await S.load('start');
  await S.cover(['So bekommst du', '*die App.'], kicker, S.mode === 'desktop' ? { s: 1, cy: 470, rot: -3 } : {});
  await S.kicker('So bekommst du die App'); await sleep(900);
  await S.word('Die App.', 1400); await S.kicker('');
  await S.head(['Kein App-Store.', '*Kein Download.'], { pos: 'center' }); await sleep(2100); await S.headOff(); await sleep(200);
  await S.kicker(kicker); await S.browser(true, 'spd-soltau.de/mitglieder');
  await S.phone('in'); await sleep(1100); await S.calibrate('.mb-tabbar, .mb-side, .mb-head');
};
const appEnde = async (S, zeilen) => {
  await S.kicker('');
  if (zeilen) await beat(S, zeilen, 2400, { small: true });
  await S.phone('out'); await sleep(600);
  await S.flash(); await S.word('Fertig.', 1400); await S.phone('out');
  await S.end({ big: 'Jetzt<br>ausprobieren.', adr: 'spd-soltau.de/mitglieder', sub: 'Fragen? Der Vorstand hilft.' }); await sleep(3800);
};
const APP = {
  android: { name: 'app-android', rolle: 'mitglied', plat: 'android', mode: 'phone', script: async S => {
    await appIntro(S, 'Android · Chrome');
    await S.camStage('#url', { s: 1.7, cy: 520 });
    await beat(S, ['~spd‑soltau.de/mitglieder', '*in Chrome öffnen.'], 2300, { over: true, small: true });
    await S.camStage('#dots', { s: 1.9, cy: 520, ms: 700 }); await S.tapStage('#dots');
    await S.overlay({ kind: 'dropdown', right: 14, top: 60, width: 300, items: [{ label: 'Neuer Tab', icon: 'tab' }, { label: 'Neuer Inkognitotab' }, { label: 'Verlauf' }, { label: 'Downloads' }, { label: 'Lesezeichen', icon: 'star' }, { label: 'App installieren', icon: 'install' }, { label: 'Teilen …', icon: 'share' }, { label: 'Auf der Seite suchen', icon: 'search' }], highlight: 5 });
    await sleep(400); await S.camStage('#overlay .hl', { s: 1.6, cy: 560, ms: 700 }); await S.tapStage('#overlay .hl');
    await beat(S, ['Drei Punkte.', '*App installieren.'], 2200, { over: true });
    await S.overlay({ kind: 'dialog', icon: true, title: 'SPD Soltau installieren?', text: 'spd-soltau.de', buttons: ['Abbrechen', 'Installieren'], primary: 1, highlight: 1 });
    await sleep(300); await S.camStage('#overlay .btn.hl', { s: 1.6, cy: 560, ms: 700 }); await S.tapStage('#overlay .btn.hl');
    await beat(S, ['Installieren.', '*Das war es schon.'], 2100, { over: true });
    await S.overlay({ kind: 'home' }); await S.camReset();
    await beat(S, ['Liegt auf dem', '*Startbildschirm.'], 2300);
    await S.overlayOff(); await S.browser(false);
    await appEnde(S, ['Öffnet wie jede App –', '*direkt im Mitgliederbereich.']);
  } },
  ios: { name: 'app-iphone', rolle: 'mitglied', plat: 'ios', mode: 'phone', script: async S => {
    await appIntro(S, 'iPhone · Safari');
    await S.camStage('#url', { s: 1.7, cy: 640 });
    await beat(S, ['~spd‑soltau.de/mitglieder', '*in Safari öffnen.'], 2300, { over: true, small: true });
    await S.camStage('#dots', { s: 1.9, cy: 640, ms: 700 }); await S.tapStage('#dots');
    await S.overlay({ kind: 'dropdown', left: 30, right: 30, top: 'auto', bottom: 110, width: 420, items: [{ label: 'Neuer Tab', icon: 'tab' }, { label: 'Teilen …', icon: 'share' }, { label: 'Lesezeichen hinzufügen', icon: 'star' }, { label: 'Zum Home-Bildschirm', icon: 'plus' }, { label: 'Reader anzeigen', icon: 'text' }, { label: 'Auf der Seite suchen', icon: 'search' }], highlight: 3 });
    await sleep(400); await S.camStage('#overlay .hl', { s: 1.6, cy: 600, ms: 700 }); await S.tapStage('#overlay .hl');
    await beat(S, ['Die drei Punkte.', '*Zum Home-Bildschirm.'], 2300, { over: true });
    await S.overlay({ kind: 'dialog', icon: true, title: 'Zum Home-Bildschirm', text: 'SPD Soltau<br><span style="color:#888">spd-soltau.de/mitglieder</span>', buttons: ['Abbrechen', 'Hinzufügen'], primary: 1, highlight: 1 });
    await sleep(300); await S.camStage('#overlay .btn.hl', { s: 1.6, cy: 560, ms: 700 }); await S.tapStage('#overlay .btn.hl');
    await beat(S, ['Hinzufügen.', '*Das war es schon.'], 2100, { over: true });
    await S.overlay({ kind: 'home' }); await S.camReset();
    await beat(S, ['Liegt auf dem', '*Home-Bildschirm.'], 2300);
    await S.overlayOff(); await S.browser(false);
    await appEnde(S, ['Wichtig am iPhone:', '*Nur so gibt es Push-Nachrichten.']);
  } },
  windows: { name: 'app-windows', rolle: 'mitglied', plat: 'windows', mode: 'desktop', script: async S => {
    await appIntro(S, 'Windows · Chrome oder Edge');
    await S.camStage('#url', { s: 1.9, cy: 640 });
    await beat(S, ['~spd‑soltau.de/mitglieder', '*in Chrome oder Edge.'], 2300, { over: true, small: true });
    await S.camStage('#dots', { s: 2.4, cy: 640, ms: 800 }); await S.tapStage('#dots');
    await beat(S, ['Rechts in der Adressleiste:', '*das Installieren-Symbol.'], 2400, { over: true, small: true });
    await S.overlay({ kind: 'dialog', icon: true, top: '45%', width: 360, title: 'SPD Soltau installieren?', text: 'Herausgeber: spd-soltau.de', buttons: ['Nicht jetzt', 'Installieren'], primary: 1, highlight: 1 });
    await sleep(300); await S.camStage('#overlay .btn.hl', { s: 1.9, cy: 640, ms: 700 }); await S.tapStage('#overlay .btn.hl');
    await beat(S, ['Installieren.', '*Eigenes Fenster.'], 2100, { over: true });
    await S.overlayOff(); await S.browser(false); await S.camReset();
    await S.overlay({ kind: 'toast', top: 50, title: 'SPD Soltau', text: 'Installiert – im Startmenü unter S' }); await sleep(300);
    await beat(S, ['Im Startmenü.', '*Wie jedes Programm.'], 2300);
    await S.overlayOff();
    await appEnde(S, ['Bei Bedarf an die', '*Taskleiste anheften.']);
  } },
  macos: { name: 'app-mac', rolle: 'mitglied', plat: 'macos', mode: 'desktop', script: async S => {
    await appIntro(S, 'Mac · Safari');
    await S.camStage('#url', { s: 1.9, cy: 640 });
    await beat(S, ['~spd‑soltau.de/mitglieder', '*in Safari öffnen.'], 2300, { over: true, small: true });
    await S.camReset(600);
    await S.overlay({ kind: 'menubar', open: 'Ablage', items: [{ label: 'Neues Fenster' }, { label: 'Neues privates Fenster' }, { label: 'Neuer Tab' }, { label: 'Datei öffnen …' }, { label: 'Zum Dock hinzufügen', icon: 'install' }, { label: 'Als PDF exportieren …' }, { label: 'Drucken …', icon: 'print' }], highlight: 4 });
    await sleep(300); await S.camStage('#overlay .hl', { s: 1.9, cy: 600, ms: 800 }); await S.tapStage('#overlay .hl');
    await beat(S, ['Menü „Ablage“.', '*Zum Dock hinzufügen.'], 2300, { over: true });
    await S.overlay({ kind: 'dialog', icon: true, top: '45%', width: 360, title: 'Zum Dock hinzufügen', text: 'SPD Soltau<br><span style="color:#888">spd-soltau.de/mitglieder</span>', buttons: ['Abbrechen', 'Hinzufügen'], primary: 1, highlight: 1 });
    await sleep(300); await S.camStage('#overlay .btn.hl', { s: 1.9, cy: 640, ms: 700 }); await S.tapStage('#overlay .btn.hl');
    await beat(S, ['Hinzufügen.', '*Das war es schon.'], 2100, { over: true });
    await S.overlayOff(); await S.browser(false); await S.camReset();
    await S.overlay({ kind: 'toast', top: 50, title: 'SPD Soltau', text: 'Liegt jetzt im Dock' }); await sleep(300);
    await beat(S, ['Im Dock.', '*Wie jede App.'], 2300);
    await S.overlayOff();
    await appEnde(S, ['In Chrome am Mac genauso:', '*Symbol in der Adressleiste.']);
  } },
};
Object.assign(TOUREN, APP);

for (const key of Object.keys(TOUREN)) {
  if (only !== 'alle' && only !== key) continue;
  console.log('Aufnahme:', TOUREN[key].name);
  await record(TOUREN[key]);
}
await closeBrowser();
console.log('fertig');
