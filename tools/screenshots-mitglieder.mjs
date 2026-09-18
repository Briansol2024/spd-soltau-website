// Screenshots des Mitgliederbereichs (Vorschau-Modus) für die Abstimmung mit dem Vorstand
//   node tools/screenshots-mitglieder.mjs [Zielordner]   (Server auf http://localhost:8080 muss laufen)
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
const OUT = process.argv[2] || 'video/out/shots';
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const shots = [
  ['start', '#start'], ['termine', '#termine'], ['umfragen', '#umfragen'], ['dokumente', '#dokumente'], ['rat', '#rat'], ['mitglieder', '#mitglieder'], ['profil', '#profil'], ['vorstand', '#vorstand'],
];
for (const [w, h, name, mobile] of [[1280, 900, 'desktop', false], [390, 844, 'handy', true]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, locale: 'de-DE', reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  for (const [key, hash] of shots) {
    await page.goto(`http://localhost:8080/mitglieder/?demo${hash}`, { waitUntil: 'load' });
    await page.waitForSelector('#mb-view .section-head, #mb-view .start-grid', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(700);
    // Kopfbereich der Seite abschneiden, damit der App-Teil im Bild ist
    const y = await page.evaluate(() => document.querySelector('.mb-wrap').getBoundingClientRect().top + window.scrollY - 16);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelectorAll('.rv').forEach(el => el.classList.add('in', 'done')));
    await page.waitForTimeout(400);
    const bottom = await page.evaluate(() => document.querySelector('.mb-wrap').getBoundingClientRect().bottom + window.scrollY + 8);
    await page.screenshot({ path: `${OUT}/${name}-${key}.png`, fullPage: true, clip: { x: 0, y, width: w, height: Math.min(bottom - y, key === 'vorstand' ? (mobile ? 5200 : 3400) : mobile ? 2600 : 1600) } });
    console.log('ok', name, key);
  }
  await ctx.close();
}
await browser.close();
