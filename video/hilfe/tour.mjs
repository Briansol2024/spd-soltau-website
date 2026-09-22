// Rundgang-Videos (Hochkant, fürs Handy): ein Video zeigt alle Funktionen für Mitglieder, das zweite die Zusatzfunktionen für Ratsmitglieder.
// Gleiche Bühne wie die Hilfevideos (stage.html), die Demo-App läuft mit Beispieldaten – nichts wird gespeichert. Ohne Ton, Musik kommt in compose.py.
//   node video/hilfe/tour.mjs                alle Rundgänge (mitglieder, rat)
//   node video/hilfe/tour.mjs rat            nur einen
// Voraussetzung: Website gebaut (node build.mjs) und Server auf http://localhost:8080 (node serve.mjs)
import { chromium } from 'playwright';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:8080';
const HERE = path.resolve('video/hilfe');
const TMP = path.join(HERE, 'tmp');
const STAGE = pathToFileURL(path.join(HERE, 'stage.html')).href;
const only = process.argv[2] || 'alle';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Handy-Bühne 720×1280 (wie Profil android in record.mjs)
const P = { mobile: true, W: 720, H: 1280, appW: 412, appH: 700, screenW: 480, deviceTop: 96 };
const holdFor = text => Math.min(9.5, Math.max(3.6, 2.6 + text.length * 0.05)) * 1000;

await mkdir(TMP, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu-vsync', '--autoplay-policy=no-user-gesture-required'] });

// ---------- Die beiden Rundgänge: Kapitel mit Untertiteln und Aktionen ----------
const TOUREN = {
  mitglieder: {
    name: 'rundgang-mitglieder', rolle: 'mitglied',
    title: 'Der Mitgliederbereich', plat: 'Für alle Mitglieder', sub: 'Ein Rundgang in drei Minuten – ohne Ton, einfach mitlesen.',
    top: 'Der Mitgliederbereich', badge: 'Rundgang',
    ende: ['Jetzt<br>registrieren!', 'spd-soltau.de/mitglieder'],
    start: 'registrieren', wait: '#f-register',
    kapitel: S => [
      ['Registrieren', [
        ['Einmal registrieren: Name, E-Mail-Adresse und ein Passwort – mehr braucht es nicht.', async () => {
          await S.tap('.mb-tabs [data-tab="register"]');
          await S.type('#r-vn', 'Max'); await S.type('#r-nn', 'Mustermann'); await S.type('#r-mail', 'max.mustermann@example.de'); await S.type('#r-pw', 'Soltau2026!'); await S.type('#r-pw2', 'Soltau2026!');
        }],
        ['Datenschutz bestätigen, „Registrieren“ – dann kommt ein Code per E-Mail.', async () => {
          await S.tap('#r-ds'); await S.tap('#f-register [type=submit]'); await S.app().locator('#f-verify').waitFor({ timeout: 8000 });
          await S.type('#v-code', '482913'); await S.tap('#f-verify [type=submit]');
        }],
        ['Der Vorstand prüft kurz, dass du Mitglied bist, und schaltet dich frei. Danach: anmelden – fertig.', async () => { await S.point('#pending-back'); }],
      ]],
      ['Start', [
        ['Die Startseite zeigt, was gerade wichtig ist: nächste Termine, offene Umfragen, neue Dokumente.', async () => {
          await S.load('start'); await S.point('.start-grid'); await S.scrollBy(420);
        }],
        ['Unten die Leiste: Start, Termine, Mitmachen, Wissen – und „Mehr“ für alles Weitere.', async () => {
          await S.point('.mb-tabbar'); await S.tap('#mb-more'); await sleep(1400); await S.tap('.mb-sheet-close');
        }],
      ]],
      ['Termine', [
        ['Termine: Ein Tipp auf „Ich komme“ – und der Vorstand weiß, mit wem er rechnen kann.', async () => {
          await S.nav('termine'); await S.tap('.rsvp >> nth=0 >> [data-status="zusage"]');
        }],
        ['Absagen geht genauso – gern mit einem kurzen Grund.', async () => {
          await S.tap('.rsvp >> nth=1 >> [data-status="absage"]'); await S.type('.rsvp >> nth=1 >> .rsvp-grund input', 'Schicht'); await S.tap('.rsvp >> nth=1 >> [data-save-grund]');
        }],
        ['Mitfahren: Platz im Auto anbieten oder eine Mitfahrt suchen – direkt am Termin.', async () => {
          await S.tap('.rsvp >> nth=0 >> details.rides summary');
          await S.select('.rsvp >> nth=0 >> .ride-form select[name=typ]', 'biete'); await S.fill('.rsvp >> nth=0 >> .ride-form [name=ab]', ''); await S.type('.rsvp >> nth=0 >> .ride-form [name=ab]', 'Harber'); await S.fill('.rsvp >> nth=0 >> .ride-form [name=zeit]', '17:30');
          await S.tap('.rsvp >> nth=0 >> .ride-form [type=submit]'); await sleep(900); await S.point('.rsvp >> nth=0 >> .ride-list');
        }],
        ['Helferlisten: Schicht antippen – schon bist du eingetragen.', async () => {
          await S.scroll('.hl-embed .shift'); await S.tap('.hl-embed .shift button[data-shift]:not([disabled])');
        }],
        ['Teilen: jeden Termin mit einem Tipp per WhatsApp an die Gruppe schicken.', async () => {
          await S.point('.rsvp >> nth=0 >> .share');
          await S.overlay({ kind: 'sheet', title: 'Teilen', items: [{ label: 'WhatsApp' }, { label: 'Signal' }, { label: 'E-Mail' }, { label: 'Link kopieren' }], highlight: 0 }); await sleep(1600); await S.overlayOff();
        }],
        ['Kalender abonnieren: alle Termine landen automatisch im Kalender auf deinem Handy.', async () => {
          await S.scroll('#kalender'); await S.point('#kalender [data-copy]');
        }],
      ]],
      ['Mitmachen', [
        ['Mitmachen – Umfragen: abstimmen mit einem Tipp, das Ergebnis siehst du sofort.', async () => {
          await S.nav('mitmachen'); await S.tap('.poll:not(:has([data-vote-save])) >> nth=0 >> [data-vote="0"]');
        }],
        ['Ideen: eigene Vorschläge einreichen – und gute Ideen anderer unterstützen.', async () => {
          await S.hash('ideen'); await S.tap('.idee-like:not(.an) >> nth=0');
        }],
        ['Versammlungen: Tagesordnung, Abstimmen mit dem Handy, Protokolle und Ergebnisse.', async () => {
          await S.hash('versammlung'); await S.scrollBy(300);
        }],
      ]],
      ['Dokumente & Wissen', [
        ['Dokumente: Protokolle, Anträge, Vorlagen – alles an einem Ort, nur für Mitglieder.', async () => {
          await S.nav('wissen'); await S.point('.doc-title');
        }],
        ['Grundwissen: kurze Kapitel, wie Kommunalpolitik in Soltau funktioniert – zum Anfangen.', async () => {
          await S.hash('wissen/grundwissen'); await S.point('.doc-cat'); await S.scrollBy(320);
        }],
        ['Suche: ein Wort eingeben – findet Dokumente, Wissen und Termine.', async () => {
          await S.hash('wissen'); await S.tap('.chip[data-q="Kita"]');
        }],
      ]],
      ['Mitglieder', [
        ['Mitglieder: wer ist wer – mit Geburtstagen und Jubiläen. Du entscheidest, was andere von dir sehen.', async () => {
          await S.more('mitglieder'); await S.point('.member >> nth=1'); await S.scrollBy(500);
        }],
      ]],
      ['Mein Profil', [
        ['Mein Profil: Ort, Telefon, Geburtstag – jede Angabe freiwillig, Sichtbarkeit per Haken.', async () => {
          await S.more('profil'); await S.fill('#pf-ort', ''); await S.type('#pf-ort', 'Harber'); await S.type('#pf-tel', '0170 1234567'); await S.tap('#f-profil [name=telefonSichtbar]');
        }],
        ['Benachrichtigungen: eine Nachricht aufs Handy, wenn es etwas Neues gibt – du wählst die Themen.', async () => {
          await S.scroll('#push-card'); await S.tap('#push-on'); await sleep(600); await S.point('#push-topics');
        }],
        ['Als App: der Mitgliederbereich kommt ohne App-Store auf den Startbildschirm – Anleitung unter „Hilfe“.', async () => {
          await S.scroll('h3:has-text("Als App")'); await S.point('h3:has-text("Als App")');
        }],
      ]],
      ['Hilfe', [
        ['Hilfe & Anleitungen: zu jedem Schritt ein kurzes Video – für Android, iPhone, Windows und Mac.', async () => {
          await S.more('hilfe'); await S.point('.chip[data-plat="android"]'); await S.scrollBy(380);
        }],
        ['Wünsche zur App: Fehlt etwas? Schreib es uns direkt aus der App – wir lesen alles.', async () => {
          await S.more('feedback'); await S.tap('.chip[data-fb="was"][data-v="fehlt"]'); await S.point('#fb-text, textarea');
        }],
      ]],
    ],
  },
  rat: {
    name: 'rundgang-ratsmitglieder', rolle: 'rat',
    title: 'Für Ratsmitglieder', plat: 'Mitgliederbereich · Zusatzfunktionen', sub: 'Was Ratsmitglieder zusätzlich sehen – ohne Ton, einfach mitlesen.',
    top: 'Für Ratsmitglieder', badge: 'Rundgang',
    ende: ['Fragen?<br>Der Vorstand hilft.', 'spd-soltau.de/mitglieder'],
    start: 'start',
    kapitel: S => [
      ['Überblick', [
        ['Als Ratsmitglied siehst du zwei Bereiche zusätzlich: „Ratsarbeit“ unten in der Leiste – und „Sitzungen“.', async () => {
          await S.point('.mb-tabbar [data-tab="ratsarbeit"]'); await sleep(600); await S.tap('#mb-more'); await sleep(500); await S.point('.mb-sheet a[data-sec="rat"]'); await sleep(800); await S.tap('.mb-sheet-close');
        }],
        ['Auf der Startseite oben: deine offenen Aufgaben aus der Ratsarbeit.', async () => { await S.point('.start-grid'); }],
      ]],
      ['Ratsarbeit', [
        ['Ratsarbeit: deine Aufgaben – wer kümmert sich, bis wann. Erledigt? Haken setzen.', async () => {
          await S.nav('ratsarbeit'); await S.point('.rz-t >> nth=0'); await S.tap('.rz-hak >> nth=0');
        }],
        ['Anträge der Fraktion: Stand auf einen Blick – von der Idee bis zum Beschluss.', async () => {
          await S.scroll('.rz-dok'); await S.point('.rz-dok >> nth=0');
        }],
        ['Bereiche und Ausschüsse: je Ausschuss die Aufgaben und Dokumente – und wer dort für uns sitzt.', async () => {
          await S.tap('a[href="#ratsarbeit/b-stadt"]'); await sleep(800); await S.scrollBy(300);
        }],
        ['Neue Aufgabe anlegen: Bereich, Personen, Frist – alle Beteiligten sehen sie sofort.', async () => {
          await S.hash('ratsarbeit'); await S.scrollBy(900); await S.scroll('[data-neu="aufgabe"]'); await S.tap('[data-neu="aufgabe"]'); await sleep(900); await S.point('#rz-blatt input, #rz-blatt select');
        }],
      ]],
      ['Sitzungen', [
        ['Sitzungen: Rat, Ausschüsse, Fraktion – mit Tagesordnung, unserer Haltung und den Ergebnissen.', async () => {
          await S.blattZu(); await S.more('rat'); await S.point('.rat >> nth=0 >> .hl-head');
        }],
        ['Je Tagesordnungspunkt: Haltung, Argumente, wer für uns spricht – vorbereitet in der Fraktion.', async () => {
          await S.point('.rat >> nth=0 >> .top >> nth=0'); await S.scrollBy(260);
        }],
      ]],
      ['Sitzungsmodus', [
        ['Sitzungsmodus: ein Punkt groß auf dem Bildschirm – und der Bildschirm bleibt an.', async () => {
          await S.scroll('.rat >> nth=0'); await S.tap('.rat >> nth=0 >> a[href^="#rat/fokus-"]'); await S.app().locator('#fo-top').waitFor({ timeout: 8000 }); await sleep(600);
          await S.tap('#fo-verstanden').catch(() => {}); await S.point('#fo-top');
        }],
        ['Ergebnis direkt eintragen – ein Tipp, Abstimmung dazu, speichern. Alle sehen es sofort.', async () => {
          await S.scroll('[data-beschluss="angenommen"]'); await S.tap('[data-beschluss="angenommen"]'); await S.type('#fo-abst', '19 : 10'); await S.tap('#fo-save');
        }],
        ['Nächster Punkt: die Sitzungsleitung blättert, alle Geräte folgen.', async () => {
          await S.scroll('#fo-next'); await S.tap('#fo-next');
        }],
        ['Notizen nur für dich – und die Dokumente des Bereichs zum Nachschlagen.', async () => {
          await S.scroll('#fo-notizen'); await S.tap('#fo-notizen'); await sleep(600); await S.type('#nz-ta', 'Nachfragen: Kosten Radspur?'); await sleep(900); await S.tap('#nz-zu'); await S.scroll('#fo-rz-doks'); await S.point('#fo-rz-doks');
        }],
        ['Fraktions-Chat: kurz abstimmen, ohne dass es jemand im Saal mitbekommt.', async () => {
          await S.scroll('#fo-chat-toggle'); await S.tap('#fo-chat-toggle'); await S.type('#fo-chat-in', 'Bleiben wir bei dafür?'); await S.tap('#fo-chat-form button[type=submit]');
        }],
        ['Beenden – die Ergebnisse stehen bei der Sitzung, für alle Mitglieder nachlesbar.', async () => {
          await S.scroll('a.btn:has-text("Beenden")'); await S.tap('a.btn:has-text("Beenden")'); await sleep(800); await S.point('.rat >> nth=0 >> .top-ergebnis, .rat >> nth=0');
        }],
      ]],
    ],
  },
};

async function recordTour(t) {
  const zoom = P.screenW / P.appW;
  const screenH = 40 + Math.round(P.appH * zoom) + 26;
  const out = path.join(TMP, t.name + '.webm');
  const ctx = await browser.newContext({
    viewport: { width: P.W, height: P.H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'de-DE',
    recordVideo: { dir: TMP, size: { width: P.W, height: P.H } },
  });
  await ctx.addInitScript(z => {
    if (window.top === window) return;
    const apply = () => { document.documentElement.style.zoom = String(z); };
    if (document.documentElement) apply(); else new MutationObserver((m, o) => { if (document.documentElement) { apply(); o.disconnect(); } }).observe(document, { childList: true });
  }, zoom);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(STAGE);
  await page.evaluate(c => setup(c), { plat: 'android', mobile: true, W: P.W, H: P.H, screenW: P.screenW, screenH, deviceTop: P.deviceTop, n: '', title: t.title });
  // Bühnentexte für den Rundgang (statt Plattform und Themennummer)
  await page.evaluate(([top, badge, plat, sub, endeGross, endeAdr]) => {
    document.querySelector('#top .t').textContent = top; document.querySelector('#top-badge').textContent = badge;
    document.querySelector('#title-plat').textContent = plat; document.querySelector('#title-num').style.display = 'none'; document.querySelector('#title .sub').textContent = sub;
    document.querySelector('#end .big').innerHTML = endeGross; document.querySelector('#end .adr').textContent = endeAdr;
  }, [t.top, t.badge, t.plat, t.sub, t.ende[0], t.ende[1]]);
  const app = () => page.frameLocator('#app');
  const Q = t.rolle === 'mitglied' ? '?demo&video' : `?demo=${t.rolle}&video`;
  const S = {
    page, app,
    async load(hash, opts = {}) {
      const url = `${BASE}/mitglieder/${Q}&r=${Date.now()}#${hash}`;
      await page.evaluate(u => loadApp(u), url);
      await app().locator(opts.wait || '#mb-view .section-head, #mb-view .start-grid, #f-login, #f-register').first().waitFor({ timeout: 15000 });
      // Nur-Tester-Einträge (Demo-Umschalter, Filmdreh, Testen-Kasten) ausblenden – die sehen normale Mitglieder nicht
      await app().locator('body').evaluate(() => { const st = document.createElement('style'); st.textContent = '.mb-sheet a[data-sec="filmdreh"],.mb-sheet a[href="#demo"],.mb-side a[href="#demo"],.mb-side a[data-sec="filmdreh"],section.tester{display:none!important}'; document.head.append(st); }).catch(() => {});
      await sleep(700);
    },
    async point(sel) {
      const loc = app().locator(sel).first();
      await loc.scrollIntoViewIfNeeded({ timeout: 8000 }).catch(() => {});
      await sleep(250);
      const b = await loc.boundingBox({ timeout: 4000 }).catch(() => null);
      if (b) await S.pointAt(b.x + b.width / 2, b.y + Math.min(b.height / 2, 40));
      return loc;
    },
    async pointAt(x, y) { await page.evaluate(([x, y]) => tapAt(x, y), [x, y]); await sleep(450); },
    async tap(sel) { const loc = await S.point(sel); try { await loc.click({ timeout: 4000 }); } catch (e) { await loc.evaluate(el => el.click()); } await sleep(500); },
    async type(sel, text) { const loc = await S.point(sel); await loc.click({ timeout: 8000 }); await loc.pressSequentially(text, { delay: 40 }); await sleep(250); },
    async fill(sel, value) { const loc = await S.point(sel); await loc.fill(value); await sleep(300); },
    async select(sel, value) { const loc = await S.point(sel); await loc.selectOption(value); await sleep(400); },
    async nav(sec) { await S.tap(`.mb-tabbar [data-tab="${sec}"]`); await sleep(600); },
    async more(sec) { await S.tap('#mb-more'); await sleep(500); await S.tap(`.mb-sheet a[data-sec="${sec}"]`); await sleep(700); },
    async hash(h) { await app().locator('body').evaluate((b, h) => { location.hash = h; }, h); await sleep(1000); },
    async scroll(sel) { await app().locator(sel).first().evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' })).catch(() => {}); await sleep(900); },
    async scrollBy(px) { await app().locator('body').evaluate((b, px) => window.scrollBy({ top: px, behavior: 'smooth' }), px); await sleep(900); },
    async blattZu() { await app().locator('body').evaluate(() => { document.querySelector('#rz-blatt [data-zu]')?.click(); }).catch(() => {}); await sleep(400); },
    async overlay(spec) { await page.evaluate(s => overlay(s), spec); await sleep(500); const tg = await page.evaluate(() => overlayTarget()); if (tg) await S.pointAt(tg.x, tg.y); },
    async overlayOff() { await page.evaluate(() => overlayOff()); await sleep(300); },
  };
  const t0 = Date.now();
  let nr = 0;
  try {
    await S.load(t.start, { wait: t.wait });
    await page.evaluate(() => showTitle(true)); await sleep(3200); await page.evaluate(() => showTitle(false)); await sleep(400);
    const kapitel = t.kapitel(S);
    for (let k = 0; k < kapitel.length; k++) {
      const [, steps] = kapitel[k];
      for (const [text, act] of steps) {
        nr++;
        await page.evaluate(([n, tx]) => caption(n, tx), [k + 1, text]);
        const ta = Date.now();
        try { await act(); } catch (e) { console.log(`  ! ${t.name} Schritt ${nr}:`, e.message.split('\n')[0]); }
        if (process.env.DEBUG) await page.screenshot({ path: path.join(TMP, `dbg-${t.name}-${String(nr).padStart(2, '0')}.png`) });
        await sleep(Math.max(1200, holdFor(text) - (Date.now() - ta)));
      }
    }
    await page.evaluate(() => caption(0, '')); await sleep(400);
    await page.evaluate(() => showEnd(true)); await sleep(3400);
  } finally {
    const v = page.video();
    await ctx.close();
    const p = await v.path();
    await rename(p, out);
    await writeFile(path.join(TMP, t.name + '.json'), JSON.stringify({ name: t.name, seconds: (Date.now() - t0) / 1000, errors }), 'utf8');
    console.log(`  ${t.name}: ${((Date.now() - t0) / 1000).toFixed(0)} s, ${nr} Schritte${errors.length ? ' – Fehler: ' + errors[0] : ''}`);
  }
}

for (const key of Object.keys(TOUREN)) {
  if (only !== 'alle' && only !== key) continue;
  console.log('Aufnahme:', TOUREN[key].name);
  await recordTour(TOUREN[key]);
}
await browser.close();
console.log('fertig');
