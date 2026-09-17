// Testphase: verschlüsselt alle HTML-Seiten in dist/ mit einem Passwort (StatiCrypt, AES im Browser).
// Ergebnis liegt in dist-protected/. Ohne PREVIEW_PASSWORD wird dist/ unverändert übernommen.
//
//   PREVIEW_PASSWORD="geheim" node protect.mjs

import { spawnSync } from 'node:child_process';
import { cp, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'dist');
const OUT = path.join(__dirname, 'dist-protected');
const pw = process.env.PREVIEW_PASSWORD;

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
console.log('[protect] Fertig: dist-protected/ ist passwortgeschützt.');
