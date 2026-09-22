// Keynote-Rundgänge (Hochkant 720×1280): dramatisch statt Schritt-für-Schritt – Kapitelwörter, Kamerafahrten aufs Handy,
// große Schlagzeilen. Bühne: keynote.html, App: Demo-Modus mit Beispieldaten. Ohne Ton, Musik kommt in compose_tour.py (keynote.wav).
//   node video/hilfe/keynote.mjs              beide (mitglieder, rat)
//   node video/hilfe/keynote.mjs rat          nur einen
//   DEBUG=1 …                                 nach jedem Schritt ein Bild nach video/hilfe/tmp/kn-*.png
// Voraussetzung: Website gebaut (node build.mjs) und Server auf http://localhost:8080 (node serve.mjs)
import { chromium } from 'playwright';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:8080';
const HERE = path.resolve('video/hilfe');
const TMP = path.join(HERE, 'tmp');
const STAGE = pathToFileURL(path.join(HERE, 'keynote.html')).href;
const only = process.argv[2] || 'alle';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const W = 720, H = 1280, APP_W = 412, ZOOM = 480 / APP_W;

await mkdir(TMP, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu-vsync', '--autoplay-policy=no-user-gesture-required'] });

async function record(t) {
  const out = path.join(TMP, t.name + '.webm');
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, locale: 'de-DE',
    recordVideo: { dir: TMP, size: { width: W, height: H } },
  });
  await ctx.addInitScript(z => {
    if (window.top === window) return;
    const apply = () => { document.documentElement.style.zoom = String(z); };
    if (document.documentElement) apply(); else new MutationObserver((m, o) => { if (document.documentElement) { apply(); o.disconnect(); } }).observe(document, { childList: true });
  }, ZOOM);
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(STAGE);
  await page.evaluate(() => setup());
  const app = () => page.frameLocator('#app');
  const Q = t.rolle === 'mitglied' ? '?demo&video' : `?demo=${t.rolle}&video`;
  let K = 1, nr = 0; // Chrome liefert getBoundingClientRect im iframe bereits in gezoomten Pixeln (Bühnenmaß) – calibrate() prüft das
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const S = {
    page, app,
    async load(hash, wait) {
      await ev(u => loadApp(u), `${BASE}/mitglieder/${Q}&r=${Date.now()}#${hash}`);
      await app().locator(wait || '#mb-view .section-head, #mb-view .start-grid, #f-login, #f-register').first().waitFor({ timeout: 15000 });
      await app().locator('body').evaluate(() => { const st = document.createElement('style'); st.textContent = '.mb-sheet a[data-sec="filmdreh"],.mb-sheet a[href="#demo"],section.tester,.demo-note{display:none!important}'; document.head.append(st); }).catch(() => {});
      await sleep(500);
    },
    // Ruhe-Koordinaten (Bühne, Kamera in Ruhe) eines App-Elements – scrollt es vorher in die Mitte
    async rect(sel) {
      const loc = app().locator(sel).first();
      // nicht scrollIntoView: das würde auch die Bühne (#screen, Fenster) verschieben – nur das App-Fenster selbst scrollen
      await loc.evaluate(el => { const b = el.getBoundingClientRect(); window.scrollBy({ top: b.top + b.height / 2 - innerHeight / 2, left: 0, behavior: 'instant' }); });
      await sleep(350);
      await ev(() => { document.getElementById('screen').scrollTop = 0; document.getElementById('screen').scrollLeft = 0; window.scrollTo(0, 0); });
      const r2 = await loc.evaluate(el => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
      const s0 = await ev(() => window.SCREEN0);
      return { x: s0.x + r2.x * K, y: s0.y + r2.y * K, w: r2.w * K, h: r2.h * K, cx: s0.x + (r2.x + r2.w / 2) * K, cy: s0.y + (r2.y + r2.h / 2) * K, loc };
    },
    async calibrate(sel) {
      const loc = app().locator(sel).first();
      const bb = await loc.boundingBox(); const r = await loc.evaluate(el => el.getBoundingClientRect().width);
      if (bb && r) K = bb.width / r;
      console.log(`  Kalibrierung K=${K.toFixed(3)}${bb ? '' : ' (kein boundingBox)'}`);
    },
    async cam(sel, { s = 1.7, cy = 600, ms = 900 } = {}) { const r = await S.rect(sel); await ev(o => camTo(o), { s, px: r.cx, py: r.cy, cx: 360, cy, ms }); await sleep(ms + 80); return r; },
    async camReset(ms = 800) { await ev(m => camReset(m), ms); await sleep(ms + 60); },
    async ripple(r) { const p = await ev(([x, y]) => toStage(x, y), [r.cx, r.cy]); await ev(([x, y]) => tapAt(x, y), [p.x, p.y]); await sleep(420); },
    async tap(sel) { const r = await S.rect(sel); await S.ripple(r); await r.loc.evaluate(el => el.click()); await sleep(450); },
    async type(sel, text, delay = 34) { const r = await S.rect(sel); await S.ripple(r); await r.loc.pressSequentially(text, { delay, timeout: 8000 }); await sleep(200); },
    async fill(sel, v) { await app().locator(sel).first().fill(v); await ev(() => window.scrollTo(0, 0)); await sleep(150); },
    async select(sel, v) { await app().locator(sel).first().selectOption(v); await sleep(200); },
    async hash(h) { await app().locator('body').evaluate((b, h) => { location.hash = h; }, h); await sleep(900); },
    async scrollTo(sel) { await app().locator(sel).first().evaluate(el => { const b = el.getBoundingClientRect(); window.scrollBy({ top: b.top + b.height / 2 - innerHeight / 2, behavior: 'smooth' }); }).catch(() => {}); await sleep(800); },
    async nav(sec) { await S.tap(`.mb-tabbar [data-tab="${sec}"]`); await sleep(500); },
    async more(sec) { await S.tap('#mb-more'); await sleep(450); await S.tap(`.mb-sheet a[data-sec="${sec}"]`); await sleep(600); },
    // Bühne
    kicker: text => ev(x => kicker(x), text),
    head: (lines, o = {}) => ev(a => headline(a), { lines, ...o }),
    headOff: () => ev(() => headOff()),
    mode: '',
    async word(text, hold = 1500, klein = false) { await ev(() => headOff()); if (S.mode === 'in') await ev(() => phone('dim')); await ev(([x, k]) => word(x, k), [text, klein]); await sleep(hold); await ev(() => wordOff()); await ev(m => phone(m), S.mode); await sleep(450); },
    async phone(mode) { S.mode = mode; await ev(m => phone(m), mode); },
    counter: (a, b, label, ms) => ev(o => counter(o.a, o.b, o.label, o.ms), { a, b, label, ms }),
    counterText: (text, label) => ev(o => counterText(o.text, o.label), { text, label }),
    counterOff: () => ev(() => counterOff()),
    flash: () => ev(() => flash()),
    logo: on => ev(o => logo(o), on),
    end: o => ev(x => endCard(x), o),
    async snap(label) { nr++; if (process.env.DEBUG) await page.screenshot({ path: path.join(TMP, `kn-${t.name}-${String(nr).padStart(2, '0')}-${label}.png`) }); },
  };
  const t0 = Date.now();
  try {
    await t.script(S);
  } catch (e) { console.log(`  ! ${t.name}:`, e.message.split('\n')[0]); }
  finally {
    const v = page.video();
    await ctx.close();
    const p = await v.path();
    await rename(p, out);
    await writeFile(path.join(TMP, t.name + '.json'), JSON.stringify({ name: t.name, seconds: (Date.now() - t0) / 1000, errors }), 'utf8');
    console.log(`  ${t.name}: ${((Date.now() - t0) / 1000).toFixed(0)} s${errors.length ? ' – Fehler: ' + errors[0] : ''}`);
  }
}

// Ein „Beat“: Schlagzeile zeigen, halten, ausblenden
const beat = async (S, lines, hold, o = {}) => { await S.head(lines, o); await sleep(hold); await S.snap(lines[0].replace(/\W+/g, '-').slice(0, 20)); await S.headOff(); await sleep(150); };

const TOUREN = {
  mitglieder: { name: 'keynote-mitglieder', rolle: 'mitglied', script: async S => {
    // ---- Intro: schwarz, Worte ----
    await S.load('start');
    await sleep(400);
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
    await sleep(400);
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
    await S.camReset(); await S.tap('a[href="#ratsarbeit/b-stadt"]'); await sleep(600);
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
    await S.cam('[data-beschluss="angenommen"]', { s: 1.6, cy: 500 });
    await S.tap('[data-beschluss="angenommen"]'); await S.type('#fo-abst', '19 : 10', 60); await S.tap('#fo-save'); await sleep(400);
    await S.phone('dim'); await S.counterText('19 : 10', 'Angenommen'); await sleep(1900); await S.counterOff(); await S.phone('in'); await sleep(500);
    await beat(S, ['Ergebnis.', '*Sofort bei allen.'], 2000, { over: true });
    await S.cam('#fo-next', { s: 1.5, cy: 560, ms: 700 }); await S.tap('#fo-next'); await sleep(400); await S.cam('#fo-top', { s: 1.3, cy: 560, ms: 700 });
    await beat(S, ['Nächster Punkt.', '*Alle Geräte folgen.'], 2100, { over: true });
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
    await S.flash(); await S.word('Bereit.', 1500); await S.phone('out');
    await S.end({ big: 'Fragen?<br>Der Vorstand hilft.', adr: 'spd-soltau.de/mitglieder', sub: 'Ratsarbeit und Sitzungen – ab heute in der App.' }); await sleep(4000);
  } },
};

for (const key of Object.keys(TOUREN)) {
  if (only !== 'alle' && only !== key) continue;
  console.log('Aufnahme:', TOUREN[key].name);
  await record(TOUREN[key]);
}
await browser.close();
console.log('fertig');
