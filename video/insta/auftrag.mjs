// Overlay-Agent: rendert einen Auftrag aus der Wix-Sammlung `Auftraege` (typ „overlays“) zu Clips, packt sie als ZIP,
// lädt die ZIP in den Wix-Medienmanager und trägt Download-Link und Status in den Auftrag ein.
// Läuft auf GitHub Actions (.github/workflows/overlays.yml), gestartet vom Push-Dienst, sobald ein Auftrag wartet.
//   node video/insta/auftrag.mjs <auftragId>
import { spawnSync } from 'node:child_process';
import { mkdir, rm, readdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminClient, queryAll, log } from '../../push/lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, 'out');
const id = process.argv[2];
if (!id) { console.error('Auftrag-ID fehlt'); process.exit(1); }
const client = adminClient();

// ZIP ohne Kompression (Videos sind schon komprimiert) – ohne externes Programm
function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) { c ^= b[i]; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; } return (c ^ 0xFFFFFFFF) >>> 0; }
async function zipOhneKompression(dir, namen) {
  const teile = [], zentral = []; let offset = 0;
  for (const n of namen) {
    const data = await readFile(path.join(dir, n)); const name = Buffer.from(n, 'utf8'); const crc = crc32(data);
    const lok = Buffer.alloc(30 + name.length); lok.writeUInt32LE(0x04034b50, 0); lok.writeUInt16LE(20, 4); lok.writeUInt16LE(0x0800, 6); lok.writeUInt32LE(crc, 14); lok.writeUInt32LE(data.length, 18); lok.writeUInt32LE(data.length, 22); lok.writeUInt16LE(name.length, 26); name.copy(lok, 30);
    const cd = Buffer.alloc(46 + name.length); cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(data.length, 20); cd.writeUInt32LE(data.length, 24); cd.writeUInt16LE(name.length, 28); cd.writeUInt32LE(offset, 42); name.copy(cd, 46);
    teile.push(lok, data); zentral.push(cd); offset += lok.length + data.length;
  }
  const cdSize = zentral.reduce((s, c) => s + c.length, 0); const ende = Buffer.alloc(22); ende.writeUInt32LE(0x06054b50, 0); ende.writeUInt16LE(namen.length, 8); ende.writeUInt16LE(namen.length, 10); ende.writeUInt32LE(cdSize, 12); ende.writeUInt32LE(offset, 16);
  return Buffer.concat([...teile, ...zentral, ende]);
}
const setzen = async (a, patch) => { try { return await client.items.update('Auftraege', { ...a, ...patch }); } catch (e) { log('Auftrag speichern:', e.message); return a; } };
let [a] = await queryAll(client, 'Auftraege', q => q.eq('_id', id)).catch(() => []);
if (!a) { console.error('Auftrag nicht gefunden:', id); process.exit(1); }
a = await setzen(a, { status: 'laeuft', gestartetAm: new Date().toISOString(), fehler: '' });
try {
  const manifest = JSON.parse(a.manifest || '{}');
  if (!Array.isArray(manifest.clips) || !manifest.clips.length) throw new Error('Auftrag ohne Clips');
  const name = 'auftrag-' + id.slice(0, 8);
  await mkdir(path.join(__dirname, 'skripte'), { recursive: true });
  await writeFile(path.join(__dirname, 'skripte', name + '.json'), JSON.stringify(manifest), 'utf8');
  await rm(OUT, { recursive: true, force: true }); await mkdir(OUT, { recursive: true });
  log(`Auftrag ${id}: ${manifest.clips.length} Clips rendern …`);
  const r = spawnSync(process.execPath, [path.join(__dirname, 'render.mjs'), 'skript', name], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) throw new Error('Rendern fehlgeschlagen');
  const dateien = (await readdir(OUT)).filter(f => !f.startsWith('.'));
  if (!dateien.length) throw new Error('Keine Dateien entstanden');
  // Drehplan als Textdatei dazu
  if (manifest.drehplan) await writeFile(path.join(OUT, 'DREHPLAN.txt'), manifest.drehplan, 'utf8');
  const zipName = `${(a.titel || 'overlays').replace(/[^\wäöüÄÖÜß-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'overlays'}.zip`;
  const buf = await zipOhneKompression(OUT, (await readdir(OUT)).filter(f => !f.startsWith('.')));
  const groesse = buf.length;
  log(`ZIP: ${zipName} (${Math.round(groesse / 1048576 * 10) / 10} MB) – Upload zu Wix …`);
  const { uploadUrl } = await client.files.generateFileUploadUrl('application/zip', { fileName: zipName, sizeInBytes: String(buf.length), parentFolderId: 'media-root' });
  const res = await fetch(uploadUrl + (uploadUrl.includes('?') ? '&' : '?') + 'filename=' + encodeURIComponent(zipName), { method: 'PUT', headers: { 'Content-Type': 'application/zip' }, body: buf });
  if (!res.ok) throw new Error('Upload fehlgeschlagen (' + res.status + ')');
  const j = await res.json(); const f = j.file || j;
  const url = f.url || '';
  if (!url) throw new Error('Wix hat keine Download-Adresse zurückgegeben');
  await setzen(a, { status: 'fertig', url, dateiName: zipName, dateien: dateien.length + (manifest.drehplan ? 1 : 0), groesse, fertigAm: new Date().toISOString(), fehler: '' });
  log(`Auftrag ${id} fertig: ${url}`);
} catch (e) {
  log('Auftrag fehlgeschlagen:', e.message);
  await setzen(a, { status: 'fehler', fehler: String(e.message || e).slice(0, 300), fertigAm: new Date().toISOString() });
  process.exit(1);
}
