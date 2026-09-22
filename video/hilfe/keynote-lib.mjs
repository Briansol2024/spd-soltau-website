// Gemeinsame Aufnahme-Bibliothek der Keynote-Videos (Bühne keynote.html): Browser, Kamera, Schlagzeilen, Overlays – genutzt von keynote.mjs (Rundgänge) und keynote-hilfe.mjs (Hilfevideos).
import { chromium } from 'playwright';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const BASE = process.env.BASE || 'http://localhost:8080';
const HERE = path.resolve('video/hilfe');
const TMP = path.join(HERE, 'tmp');
const STAGE = pathToFileURL(path.join(HERE, 'keynote.html')).href;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const W = 720, H = 1280;
const zoomFor = t => t.mode === 'desktop' ? 1 : 480 / 412; // Handy: CSS-Zoom im iframe; PC: die Bühne skaliert den ganzen iframe (Transform), damit das PC-Layout bleibt

export { sleep };
await mkdir(TMP, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu-vsync', '--autoplay-policy=no-user-gesture-required'] });
export const closeBrowser = () => browser.close();

export async function record(t) {
  const out = path.join(TMP, t.name + '.webm');
  const ctx = await browser.newContext({
    viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: false, hasTouch: false, locale: 'de-DE',
    recordVideo: { dir: TMP, size: { width: W, height: H } },
  });
  const tVideo = Date.now(); let trim = 0; // Cover-Zeitpunkt: compose_tour.py schneidet davor alles weg, damit das erste Bild das Cover ist
  await ctx.addInitScript(z => {
    if (window.top === window) return;
    const apply = () => { document.documentElement.style.zoom = String(z); };
    if (document.documentElement) apply(); else new MutationObserver((m, o) => { if (document.documentElement) { apply(); o.disconnect(); } }).observe(document, { childList: true });
  }, zoomFor(t));
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(STAGE);
  await page.evaluate(c => setup(c), { plat: t.plat || 'android', mode: t.mode || 'phone' });
  const app = () => page.frameLocator('#app');
  const Q = t.rolle === 'mitglied' ? '?demo&video' : `?demo=${t.rolle}&video`;
  let K = t.mode === 'desktop' ? 680 / 1180 : 1, nr = 0; // Handy: Chrome liefert getBoundingClientRect im iframe bereits in gezoomten Pixeln; PC: iframe per Transform verkleinert
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const S = {
    page, app,
    base: BASE,
    async load(hash, opts) {
      const wait = typeof opts === 'string' ? opts : opts?.wait;
      await ev(u => loadApp(u), `${BASE}/mitglieder/${Q}&r=${Date.now()}${(opts && opts.query) || ''}#${hash}`);
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
      if (bb && r && t.mode !== 'desktop') K = bb.width / r;
      console.log(`  Kalibrierung K=${K.toFixed(3)}${bb ? '' : ' (kein boundingBox)'}`);
    },
    async cam(sel, { s = 1.7, cy = 600, ms = 900 } = {}) { const r = await S.rect(sel); await ev(o => camTo(o), { s, px: r.cx, py: r.cy, cx: 360, cy, ms }); await sleep(ms + 80); return r; },
    async camReset(ms = 800) { await ev(m => camReset(m), ms); await sleep(ms + 60); },
    async ripple(r) { const p = await ev(([x, y]) => toStage(x, y), [r.cx, r.cy]); await ev(([x, y]) => tapAt(x, y), [p.x, p.y]); await sleep(420); },
    async tap(sel) { const r = S.auto ? await S.cam(sel, { s: 1.55, cy: 560, ms: 700 }) : await S.rect(sel); await S.ripple(r); await r.loc.evaluate(el => el.click()); await sleep(450); },
    async type(sel, text, delay = 34) { const r = S.auto ? await S.cam(sel, { s: 1.55, cy: 520, ms: 700 }) : await S.rect(sel); await S.ripple(r); await r.loc.pressSequentially(text, { delay, timeout: 8000 }); await sleep(200); },
    async fill(sel, v) { await app().locator(sel).first().fill(v); await ev(() => window.scrollTo(0, 0)); await sleep(150); },
    async select(sel, v) { await app().locator(sel).first().selectOption(v); await sleep(200); },
    async hash(h) { await app().locator('body').evaluate((b, h) => { location.hash = h; }, h); await sleep(900); },
    async scrollTo(sel) { await app().locator(sel).first().evaluate(el => { const b = el.getBoundingClientRect(); window.scrollBy({ top: b.top + b.height / 2 - innerHeight / 2, behavior: 'smooth' }); }).catch(() => {}); await sleep(800); },
    async nav(sec) { if (S.mobile) await S.tap(`.mb-tabbar [data-tab="${sec}"]`); else await S.tap(`.mb-side a[data-sec="${sec}"]`); await sleep(500); },
    async more(sec) { if (S.mobile) { await S.tap('#mb-more'); await sleep(450); await S.tap(`.mb-sheet a[data-sec="${sec}"]`); } else await S.tap(`.mb-side a[data-sec="${sec}"]`); await sleep(600); },
    // Bühne
    // Browserleiste und nachgebaute System-Oberflächen (Menüs, Dialoge, Startbildschirm)
    browser: (on, url) => ev(([o, u]) => setBrowser(o, u), [on, url || '']),
    async overlay(spec) { await ev(sp => overlay(sp), spec); await sleep(350); if (S.auto) await S.overlayHl(); },
    overlayOff: () => ev(() => overlayOff()),
    async stageRect(sel) { const r = await ev(x => stageRect(x), sel); if (!r) throw new Error('Bühnenelement fehlt: ' + sel); return r; },
    async camStage(sel, { s = 1.7, cy = 600, ms = 900 } = {}) { const r = await S.stageRect(sel); await ev(o => camTo(o), { s, px: r.cx, py: r.cy, cx: 360, cy, ms }); await sleep(ms + 80); return r; },
    async tapStage(sel) { const r = await S.stageRect(sel); await S.ripple(r); await sleep(300); },
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
    // ---- Für die Hilfevideos (Drehbücher aus hilfe-scripts.mjs): dieselben Namen wie in record.mjs ----
    plat: t.plat || 'android', mobile: (t.mode || 'phone') === 'phone', auto: false,
    async point(sel) { const r = S.auto ? await S.cam(sel, { s: 1.55, cy: 560, ms: 800 }) : await S.rect(sel); await S.ripple(r); return r.loc; },
    async pointAt(x, y) { await ev(([x, y]) => tapAt(x, y), [x, y]); await sleep(400); },
    async scroll(sel) { await S.scrollTo(sel); if (S.auto) await S.cam(sel, { s: 1.35, cy: 560, ms: 800 }); },
    async stagePoint(sel) { if (S.auto) await S.camStage(sel, { s: 1.7, cy: 560, ms: 800 }); await S.tapStage(sel); },
    async overlayHl() { const hl = await ev(() => !!document.querySelector('#overlay .hl')); if (hl && S.auto) { await S.camStage('#overlay .hl', { s: 1.5, cy: 560, ms: 800 }); await S.tapStage('#overlay .hl'); } else if (S.auto) await S.camReset(700); },
    caption: (n, text) => ev(([n, x]) => caption(n, x), [n, text]),
    intro: (kickerText, text) => ev(([k, x]) => intro(k, x), [kickerText, text]),
    async snap(label) { nr++; if (process.env.DEBUG) await page.screenshot({ path: path.join(TMP, `kn-${t.name}-${String(nr).padStart(2, '0')}-${label}.png`) }); },
    // Cover: das erste Bild des Videos (Vorschau beim Teilen) – Handy mit der App, große Zeile, Logo; danach schwarz und der eigentliche Anfang
    async cover(lines, kickerText, { s = .78, cy = 440, rot = -6 } = {}) {
      await S.phone('in'); await ev(o => camTo(o), { s, cy, ms: 0, rot }); await S.logo(true); await S.kicker(kickerText);
      await S.head(lines, { pos: 'bottom', over: true, xl: true }); await sleep(1400);
      trim = (Date.now() - tVideo) / 1000 + 0.15;
      await S.snap('cover'); await sleep(2000);
      await S.headOff(); await S.kicker(''); await S.logo(false); await S.phone('out'); await sleep(900);
      await ev(() => camReset(0)); await S.phone(''); await sleep(300);
    },
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
    await writeFile(path.join(TMP, t.name + '.json'), JSON.stringify({ name: t.name, seconds: (Date.now() - t0) / 1000, trim, errors }), 'utf8');
    console.log(`  ${t.name}: ${((Date.now() - t0) / 1000).toFixed(0)} s${errors.length ? ' – Fehler: ' + errors[0] : ''}`);
  }
}

// Ein „Beat“: Schlagzeile zeigen, halten, ausblenden
export const beat = async (S, lines, hold, o = {}) => { await S.head(lines, o); await sleep(hold); await S.snap(lines[0].replace(/\W+/g, '-').slice(0, 20)); await S.headOff(); await sleep(150); };
