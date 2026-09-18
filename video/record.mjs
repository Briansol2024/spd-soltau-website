// Zeichnet einen Screencast der Website im Handyformat auf (Echtzeit, mit laufendem Drohnenvideo).
// Nutzt das installierte Google Chrome (spielt H.264 ab). Ausgabe: video/tmp/screencast.webm
//   node video/record.mjs [http://localhost:8080]
import { chromium } from 'playwright';
import { rename, readdir, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] || 'http://localhost:8080';
const TMP = path.resolve('video/tmp');
const W = 540, H = 1170; // Handy-Layout (CSS-Pixel); aufgenommen wird mit Zoom 2 → 1080×2340
const Z = 2;
await mkdir(TMP, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--autoplay-policy=no-user-gesture-required', '--disable-gpu-vsync'] });
const ctx = await browser.newContext({
  viewport: { width: W * Z, height: H * Z }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'de-DE',
  recordVideo: { dir: TMP, size: { width: W * Z, height: H * Z } },
});
// Die Aufnahme läuft in CSS-Pixeln – per Zoom wird das Handy-Layout in voller Auflösung gerendert
await ctx.addInitScript(z => {
  const apply = () => { document.documentElement.style.zoom = String(z); };
  if (document.documentElement) apply(); else new MutationObserver((m, o) => { if (document.documentElement) { apply(); o.disconnect(); } }).observe(document, { childList: true });
}, Z);
const page = await ctx.newPage();
const t0 = Date.now();
const log = (...a) => console.log(((Date.now() - t0) / 1000).toFixed(1) + 's', ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Sanft scrollen (Ease-in-out), Dauer in ms
async function scrollTo(y, ms) {
  await page.evaluate(([y, ms]) => new Promise(res => {
    const y0 = window.scrollY, d = y - y0, t0 = performance.now();
    const step = t => { const p = Math.min(1, (t - t0) / ms); const e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; window.scrollTo(0, y0 + d * e); if (p < 1) requestAnimationFrame(step); else res(); };
    requestAnimationFrame(step);
  }), [y, ms]);
}
const yOf = sel => page.evaluate(s => { const el = document.querySelector(s); const hh = document.querySelector('.header').getBoundingClientRect().height; return el ? el.getBoundingClientRect().top + window.scrollY - hh : 0; }, sel);

// ---- Szene 1: Startseite (Hero mit Video, Kacheln, Aktuelles, Termine)
await page.goto(BASE + '/', { waitUntil: 'load' });
await page.addStyleTag({ content: `.hero.has-video .wrap{min-height:${H - 72}px!important}` }); // vh-Einheiten zählen mit Zoom doppelt
await page.waitForSelector('.hero h1'); await page.evaluate(() => document.fonts.ready); await sleep(500);
await page.evaluate(() => document.getElementById('hero-video')?.play().catch(() => {}));
log('Start geladen');
await sleep(2600);                                   // Hero ansehen
await scrollTo(await yOf('.quick'), 1200); await sleep(900);
await scrollTo(await yOf('#start-news') - 40 * Z, 1200); await sleep(900);
// Beitragsreihe seitlich wischen
await page.evaluate(() => { const r = document.getElementById('start-news'); r.scrollTo({ left: r.clientWidth * 0.86, behavior: 'smooth' }); });
await sleep(1000);
await scrollTo(await yOf('#start-events') - 40 * Z, 1200); await sleep(1000);
log('Szene 1 fertig');

// ---- Szene 2: Unsere 11 im Stadtrat
await page.goto(BASE + '/stadtrat-2026/', { waitUntil: 'load' });
await sleep(1000);
await scrollTo(await yOf('#rat') - 40 * Z, 1200); await sleep(600);
await scrollTo((await yOf('#rat')) + 900 * Z, 2400); await sleep(500);
log('Szene 2 fertig');

// ---- Szene 3: Anliegen senden
await page.goto(BASE + '/kontakt/', { waitUntil: 'load' });
await sleep(800);
await scrollTo(await yOf('#form-kontakt') - 30 * Z, 1100); await sleep(500);
await page.click('#k-topics .chip:nth-child(2)'); await sleep(500);
await page.fill('#k-name', 'Max Mustermann'); await sleep(250);
await page.type('#k-msg', 'Wann wird der Radweg nach Harber saniert?', { delay: 28 }); await sleep(900);
log('Szene 3 fertig');

await ctx.close();
await browser.close();
// Playwright benennt die Datei zufällig – umbenennen
const files = (await readdir(TMP)).filter(f => f.endsWith('.webm'));
const newest = files.map(f => ({ f, t: (path.join(TMP, f)) })).pop();
await rm(path.join(TMP, 'screencast.webm'), { force: true });
await rename(path.join(TMP, newest.f), path.join(TMP, 'screencast.webm'));
log('Aufnahme gespeichert: video/tmp/screencast.webm');
