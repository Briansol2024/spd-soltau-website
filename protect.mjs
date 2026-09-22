// Testphase: verschlüsselt alle HTML-Seiten in dist/ mit einem Passwort (StatiCrypt, AES im Browser).
// Ergebnis liegt in dist-protected/. Ohne PREVIEW_PASSWORD wird dist/ unverändert übernommen.
//
//   PREVIEW_PASSWORD="geheim" node protect.mjs

import { spawnSync } from 'node:child_process';
import { cp, rm, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'dist');
const OUT = path.join(__dirname, 'dist-protected');
// Passwort aus .env, falls nicht als Umgebungsvariable gesetzt
if (!process.env.PREVIEW_PASSWORD && existsSync(path.join(__dirname, '.env'))) {
  const m = readFileSync(path.join(__dirname, '.env'), 'utf8').match(/^\s*PREVIEW_PASSWORD\s*=\s*(.*?)\s*$/m);
  if (m) process.env.PREVIEW_PASSWORD = m[1].replace(/^"(.*)"$/, '$1');
}
// Ab dem Startzeitpunkt (LAUNCH_AT, siehe build.mjs) ist die Seite offen – auch wenn das Passwort noch gesetzt ist
const gestartet = process.env.LAUNCH_AT && Date.parse(process.env.LAUNCH_AT) <= Date.now();
const pw = gestartet ? '' : process.env.PREVIEW_PASSWORD;
if (gestartet) console.log('[protect] Startzeitpunkt erreicht – kein Passwortschutz.');

await rm(OUT, { recursive: true, force: true });
if (!pw) {
  await cp(SRC, OUT, { recursive: true });
  console.log('[protect] Kein PREVIEW_PASSWORD gesetzt – dist/ wurde unverschlüsselt nach dist-protected/ kopiert.');
  process.exit(0);
}
await mkdir(OUT, { recursive: true });
// Alles kopieren (Assets bleiben frei zugänglich), HTML-Dateien werden anschließend verschlüsselt überschrieben
await cp(SRC, OUT, { recursive: true });
const cli = path.join(__dirname, 'node_modules', 'staticrypt', 'cli', 'index.js');
const args = [cli,
  SRC, '-r', '-d', OUT, '-p', pw, '-c', 'false',
  '--remember', '30', '--short',
  '--template-error', 'Falsches Passwort.',
  '--template-remember', 'Auf diesem Gerät merken',
  '--template-title', 'SPD Soltau – Vorschau',
  '--template-instructions', 'Diese Vorschau ist nur für den Vorstand bestimmt. Bitte Passwort eingeben.',
  '--template-button', 'Öffnen',
  '--template-placeholder', 'Passwort',
  '--template-color-primary', '#E3000F',
  '--template-color-secondary', '#0F0F0F',
];
const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
if (r.status !== 0) { console.error('[protect] StatiCrypt fehlgeschlagen'); process.exit(r.status || 1); }
// StatiCrypt legt die Ausgabe unter dist-protected/dist/ ab → eine Ebene nach oben ziehen
const nested = path.join(OUT, 'dist');
await cp(nested, OUT, { recursive: true, force: true });
await rm(nested, { recursive: true, force: true });
// Die Countdown-Seite (/bald/ und ggf. die Startseite) bleibt ohne Passwort – sie ist für alle gedacht
for (const rel of ['bald/index.html', 'index.html']) {
  const src = path.join(SRC, rel);
  if (existsSync(src) && readFileSync(src, 'utf8').includes('data-countdown')) { await cp(src, path.join(OUT, rel), { force: true }); console.log('[protect] offen gelassen:', rel); }
}
// „So bekommst du die App“ bleibt ohne Passwort – der Link wird vor dem Start in der Mitglieder-Gruppe geteilt
for (const rel of ['app/index.html']) {
  const src = path.join(SRC, rel);
  if (existsSync(src)) { await cp(src, path.join(OUT, rel), { force: true }); console.log('[protect] offen gelassen:', rel); }
}
// HTML unter assets/ (Overlay-Bühne für die Werkstatt-Vorschau) ist keine Seite, sondern Baumaterial – bleibt offen
const assetsHtml = async dir => { const { readdir } = await import('node:fs/promises'); const out = []; for (const e of await readdir(dir, { withFileTypes: true })) { const f = path.join(dir, e.name); if (e.isDirectory()) out.push(...await assetsHtml(f)); else if (/\.html$/i.test(e.name)) out.push(f); } return out; };
if (existsSync(path.join(SRC, 'assets'))) for (const f of await assetsHtml(path.join(SRC, 'assets'))) { const rel = path.relative(SRC, f); await cp(f, path.join(OUT, rel), { force: true }); console.log('[protect] offen gelassen:', rel); }
console.log('[protect] Fertig: dist-protected/ ist passwortgeschützt.');
