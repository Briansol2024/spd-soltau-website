// Overlay-Clips für Instagram-Videos (Reels/Stories, 1080×1920, 30 Bilder/s) aus stage.html:
// Intro „Moin, Soltau!“, Schlusskarte, Bauchbinden (Name + Rolle) und Wort-Popper neben der Person.
// Jedes Bild wird einzeln gerendert (Animationen pausiert und gespult), dann packt ffmpeg daraus
//   *-gruen.mp4  – auf Greenscreen-Grün (#00B140) für CapCut & Co. (Chroma-Key)
//   *-alpha.mov  – ProRes 4444 mit echter Transparenz für DaVinci Resolve, Premiere, Final Cut, CapCut am PC
//
//   node video/insta/render.mjs                 # alles
//   node video/insta/render.mjs intro outro     # nur bestimmte Clips (Anfang des Namens reicht)
//   node video/insta/render.mjs binde "Max Mustermann" "Beisitzer"        # eigene Bauchbinde
//   node video/insta/render.mjs wort "Neue|*Website" links                 # eigener Wort-Popper (* rot, # Kasten, - mittel, _ klein)
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { mkdir, rm, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const FFMPEG = require('ffmpeg-static');
const FPS = 30, W = 1080, H = 1920, GRUEN = '0x00B140';
const OUT = path.join(__dirname, 'out'), TMP = path.join(__dirname, 'tmp');
const STAGE = pathToFileURL(path.join(__dirname, 'stage.html')).href;

// Wer bekommt eine Bauchbinde (Vorstand + gewählte Ratsmitglieder; wer beides ist, bekommt eine kombinierte)
const BINDEN = [
  ['Laura Elbers Gutiérrez', 'Vorsitzende SPD Soltau'], ['Birhat Kaçar', 'Vorsitzender · Fraktionsvorsitzender'],
  ['Brian Weber', 'Stellv. Vorsitzender · Ratsmitglied'], ['Jamie Prüser', 'Stellv. Vorsitzender'], ['Karin Ruland', 'Finanzverantwortliche'],
  ['Manuela Bartels', 'Beisitzerin · Ratsfrau'], ['Thomas Sandkühler', 'Beisitzer'], ['Bianca Ort', 'Beisitzerin'], ['Siegfried Belz', 'Beisitzer · Ratsmitglied'],
  ['André Küsel', 'Beisitzer'], ['Inna Herold', 'Ratsfrau'], ['Reiner Klatt', 'Ratsmitglied'], ['Valerij Stroh', 'Ratsmitglied'],
  ['Christian Frost', 'Ratsmitglied · Kreistag'], ['Bernd Ingendahl', 'Ratsmitglied'], ['Harald Garbers', 'Ratsmitglied'], ['Igor Mamanow', 'Ratsmitglied'],
];
// Wort-Popper: Zeilen mit | trennen; * = rot, # = roter Kasten, - = mittelgroß, _ = klein
const WORTE = [
  ['neue-website', 'Neue|*Website'], ['ab-dienstag-18-uhr', '_Ab Dienstag|#18 Uhr'], ['spd-soltau-de', '_Jetzt neu|-spd-soltau.de'],
  ['mitglieder-app', 'Mitglieder-|*App'], ['jetzt-mitreden', 'Jetzt|*mitreden'], ['aus-liebe-zu-soltau', 'Aus Liebe|zu|*Soltau'],
  ['moin-soltau', 'Moin|*Soltau!'], ['11-sitze-im-rat', '#11 Sitze|im Rat'], ['stichwahl-27-sept', 'Stichwahl|#27. Sept.'], ['danke', 'Danke|*Soltau!'],
];
const slug = s => s.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function clips() {
  const list = [
    { id: 'intro', dauer: 4.0, q: { clip: 'intro' } },
    { id: 'outro', dauer: 6.0, q: { clip: 'outro' } },
    { id: 'outro-rot', dauer: 6.0, q: { clip: 'outro', bg: 'rot', text: 'Mitmachen? Alles auf spd-soltau.de/mitmachen' }, opak: true },
  ];
  for (const [name, rolle] of BINDEN) list.push({ id: 'binde-' + slug(name), dauer: 6.0, q: { clip: 'binde', name, rolle } });
  for (const [id, text] of WORTE) for (const seite of ['links', 'rechts']) list.push({ id: `wort-${id}-${seite}`, dauer: 3.0, q: { clip: 'wort', text, seite } });
  return list;
}

async function render(page, c) {
  const dir = path.join(TMP, c.id);
  await rm(dir, { recursive: true, force: true }); await mkdir(dir, { recursive: true });
  const q = new URLSearchParams({ ...c.q, bg: c.opak ? (c.q.bg || 'rot') : 'keins' });
  await page.goto(`${STAGE}?${q}`);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode().catch(() => {}))); });
  const n = Math.round(c.dauer * FPS);
  for (let i = 0; i < n; i++) {
    await page.evaluate(t => window.seek(t), i * 1000 / FPS);
    await page.screenshot({ path: path.join(dir, `f${String(i).padStart(4, '0')}.png`), omitBackground: !c.opak, type: 'png' });
  }
  return dir;
}
function encode(c, dir) {
  const frames = path.join(dir, 'f%04d.png');
  const run = args => { const r = spawnSync(FFMPEG, ['-y', '-loglevel', 'error', ...args], { stdio: 'inherit' }); if (r.status !== 0) throw new Error('ffmpeg: ' + c.id); };
  if (c.opak) {
    run(['-framerate', String(FPS), '-i', frames, '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(OUT, `${c.id}.mp4`)]);
    return [`${c.id}.mp4`];
  }
  run(['-framerate', String(FPS), '-i', frames, '-f', 'lavfi', '-i', `color=c=${GRUEN}:s=${W}x${H}:r=${FPS}`, '-filter_complex', '[1:v][0:v]overlay=shortest=1:format=auto,format=yuv420p', '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-movflags', '+faststart', path.join(OUT, `${c.id}-gruen.mp4`)]);
  run(['-framerate', String(FPS), '-i', frames, '-c:v', 'prores_ks', '-profile:v', '4444', '-pix_fmt', 'yuva444p10le', '-vendor', 'apl0', path.join(OUT, `${c.id}-alpha.mov`)]);
  return [`${c.id}-gruen.mp4`, `${c.id}-alpha.mov`];
}

const args = process.argv.slice(2);
let list = clips();
if (args[0] === 'binde' && args[1]) list = [{ id: 'binde-' + slug(args[1]), dauer: 6.0, q: { clip: 'binde', name: args[1], rolle: args[2] || 'SPD Soltau' } }];
else if (args[0] === 'wort' && args[1]) list = [{ id: `wort-${slug(args[1].replace(/[|*#_-]/g, ' '))}-${args[2] === 'rechts' ? 'rechts' : 'links'}`, dauer: 3.0, q: { clip: 'wort', text: args[1], seite: args[2] || 'links' } }];
else if (args.length) list = list.filter(c => args.some(a => c.id.startsWith(a)));

await mkdir(OUT, { recursive: true }); await mkdir(TMP, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const t0 = Date.now();
for (const c of list) {
  const dir = await render(page, c);
  const files = encode(c, dir);
  await rm(dir, { recursive: true, force: true });
  console.log(`[insta] ${c.id} → ${files.join(', ')}  (${Math.round((Date.now() - t0) / 1000)} s)`);
}
await browser.close();
console.log(`[insta] fertig: ${list.length} Clips in video/insta/out/ (${(await readdir(OUT)).length} Dateien)`);
