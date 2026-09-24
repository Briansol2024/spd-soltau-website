// Overlay-Agent: rendert einen Auftrag aus der Wix-Sammlung `Auftraege` (typ „overlays“) zu Clips, packt sie als ZIP,
// lädt die ZIP in den Wix-Medienmanager und trägt Download-Link und Status in den Auftrag ein.
// Läuft auf GitHub Actions (.github/workflows/overlays.yml), gestartet vom Push-Dienst, sobald ein Auftrag wartet.
//   node video/insta/auftrag.mjs <auftragId>
import { spawn } from 'node:child_process';
import webpush from 'web-push';
import { mkdir, rm, readdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
a = await setzen(a, { status: 'laeuft', gestartetAm: a.gestartetAm || new Date().toISOString(), fehler: '', fortschritt: 5, schritt: 'Rechner läuft – Browser wird vorbereitet.' });
// Push direkt vom Agenten (sofort statt beim nächsten Lauf des Push-Dienstes)
async function melden(titel, text, link) {
  try {
    if (!process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_PUBLIC_KEY || !a.memberId) return false;
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:info@spd-soltau.de', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const subs = (await queryAll(client, 'PushSubscriptions', q => q.eq('memberId', a.memberId))).filter(s => s.aktiv !== false && s.endpoint && s.keys);
    let ok = 0;
    for (const s of subs) { try { await webpush.sendNotification({ endpoint: s.endpoint, keys: typeof s.keys === 'string' ? JSON.parse(s.keys) : s.keys }, JSON.stringify({ title: titel, body: text, tag: 'auftrag:' + id, url: link }), { TTL: 24 * 3600 }); ok++; } catch (e) { /* Gerät weg */ } }
    log(`Push an ${ok} Gerät(e)`); return ok > 0;
  } catch (e) { log('Push:', e.message); return false; }
}
try {
  const manifest = JSON.parse(a.manifest || '{}');
  if (!Array.isArray(manifest.clips) || !manifest.clips.length) throw new Error('Auftrag ohne Clips');
  const name = 'auftrag-' + id.slice(0, 8);
  await mkdir(path.join(__dirname, 'skripte'), { recursive: true });
  // Interne Fotos (material:<id>) aus den Dateiteilen holen – sie liegen nur für Mitglieder lesbar bei Wix, nie an einer öffentlichen Adresse
  const bilderDir = path.join(__dirname, 'tmp', 'bilder-' + id.slice(0, 8)); await mkdir(bilderDir, { recursive: true });
  const feld = /^url|^bilder$/; const geholt = new Map();
  for (const c of manifest.clips) for (const [k, v] of Object.entries(c.q || {})) if (feld.test(k)) {
    c.q[k] = (await Promise.all(String(v).split('|').map(async x => {
      const mid = /^material:(.+)$/.exec(x.trim())?.[1]; if (!mid) return x;
      if (!geholt.has(mid)) {
        const teile = (await queryAll(client, 'FilmTeile', q => q.eq('materialId', mid))).sort((a, b) => a.nr - b.nr);
        if (!teile.length) { log(`  Foto ${mid}: keine Dateiteile – Platzhalter`); geholt.set(mid, ''); }
        else { const f = path.join(bilderDir, mid + '.jpg'); await writeFile(f, Buffer.concat(teile.map(t => Buffer.from(t.daten || '', 'base64')))); geholt.set(mid, pathToFileURL(f).href); log(`  Foto ${mid}: ${teile.length} Teile geholt`); }
      }
      return geholt.get(mid);
    }))).filter(Boolean).join('|');
  }
  await writeFile(path.join(__dirname, 'skripte', name + '.json'), JSON.stringify(manifest), 'utf8');
  await rm(OUT, { recursive: true, force: true }); await mkdir(OUT, { recursive: true });
  const n = manifest.clips.length; let fertigClips = 0;
  log(`Auftrag ${id}: ${n} Clips rendern …`);
  await new Promise((resolve, reject) => {
    const p = spawn(process.execPath, [path.join(__dirname, 'render.mjs'), 'skript', name], { env: process.env });
    let rest = '';
    p.stdout.on('data', d => { rest += d.toString(); const zeilen = rest.split('\n'); rest = zeilen.pop(); for (const z of zeilen) { process.stdout.write(z + '\n'); const m = z.match(/^\[insta\] \S+-(\d\d)-(\S+) →/); if (m) { fertigClips = +m[1]; const clip = manifest.clips[fertigClips - 1]; const label = clip?.q?.label || clip?.q?.text || clip?.id || ''; setzen(a, { fortschritt: 5 + Math.round(80 * fertigClips / n), schritt: `Clip ${fertigClips} von ${n} fertig: ${String(label).replace(/[|*#_]/g, ' ').slice(0, 60)}` }).then(x => { a = x; }); } } });
    p.stderr.on('data', d => process.stderr.write(d));
    p.on('close', code => code === 0 ? resolve() : reject(new Error('Rendern fehlgeschlagen')));
  });
  a = await setzen(a, { fortschritt: 88, schritt: 'Alle Clips fertig – ZIP wird gepackt.' });
  const dateien = (await readdir(OUT)).filter(f => !f.startsWith('.'));
  if (!dateien.length) throw new Error('Keine Dateien entstanden');
  // Drehplan als Textdatei dazu
  if (manifest.drehplan) await writeFile(path.join(OUT, 'DREHPLAN.txt'), manifest.drehplan, 'utf8');
  // Eine einzelne Datei (Baustein „einzeln rendern“) geht direkt als Video hoch – kein ZIP, am Handy sofort in CapCut zu öffnen
  const alle = (await readdir(OUT)).filter(f => !f.startsWith('.'));
  const einzeln = alle.length === 1 && /\.(mp4|mov)$/i.test(alle[0]);
  const zipName = einzeln ? alle[0] : `${(a.titel || 'overlays').replace(/[^\wäöüÄÖÜß-]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'overlays'}.zip`;
  const mime = einzeln ? (/\.mov$/i.test(alle[0]) ? 'video/quicktime' : 'video/mp4') : 'application/zip';
  const buf = einzeln ? await readFile(path.join(OUT, alle[0])) : await zipOhneKompression(OUT, alle);
  const groesse = buf.length;
  log(`${einzeln ? 'Datei' : 'ZIP'}: ${zipName} (${Math.round(groesse / 1048576 * 10) / 10} MB) – Ablage im Mitgliederbereich …`);
  a = await setzen(a, { fortschritt: 93, schritt: `${einzeln ? 'Clip' : 'ZIP'} (${Math.round(groesse / 1048576 * 10) / 10} MB) wird im Mitgliederbereich abgelegt.` });
  // Datei in Teilen (288 KB) ablegen – nur für angemeldete Mitglieder lesbar, kein öffentlicher Link
  const TEIL = 288 * 1024; const nTeile = Math.max(1, Math.ceil(buf.length / TEIL));
  const mat = await client.items.insert('FilmMaterial', { title: a.titel || 'Overlays', projektId: a.projektId || '', art: 'overlays', titel: a.titel || 'Overlays', url: '', name: zipName, mime, groesse: buf.length, teile: nTeile, status: 'fertig', von: a.von || '', memberId: a.memberId || '', auftragId: a._id });
  for (let i = 0; i < nTeile; i += 20) await Promise.all(Array.from({ length: Math.min(20, nTeile - i) }, (_, j) => client.items.insert('FilmTeile', { title: `${mat._id} ${i + j}`, materialId: mat._id, nr: i + j, daten: buf.subarray((i + j) * TEIL, (i + j + 1) * TEIL).toString('base64') })));
  const url = 'material:' + mat._id;
  const appUrl = (process.env.SITE_URL || 'https://spd-soltau.de').replace(/\/$/, '') + '/mitglieder/#filmdreh' + (a.projektId === 'werkstatt' ? '/werkstatt' : a.projektId ? '/p-' + a.projektId : '');
  const gemeldet = await melden(einzeln ? 'Baustein fertig – zum Download bereit' : 'Overlays fertig – zum Download bereit', `${a.titel || 'Overlay-Clips'} (${Math.round(groesse / 1048576 * 10) / 10} MB, ${dateien.length + (manifest.drehplan ? 1 : 0)} Dateien). Antippen – der Download steht in der App.`, appUrl);
  await setzen(a, { status: 'fertig', url, dateiName: zipName, dateien: dateien.length + (manifest.drehplan ? 1 : 0), groesse, fertigAm: new Date().toISOString(), fehler: '', fortschritt: 100, schritt: 'Fertig.', benachrichtigt: gemeldet, materialAngelegt: true });
  log(`Auftrag ${id} fertig: ${url}`);
} catch (e) {
  log('Auftrag fehlgeschlagen:', e.message);
  const gemeldet = await melden('Overlays: das hat nicht geklappt', String(e.message || e).slice(0, 140), (process.env.SITE_URL || 'https://spd-soltau.de') + '/mitglieder/#rat');
  await setzen(a, { status: 'fehler', fehler: String(e.message || e).slice(0, 300), fertigAm: new Date().toISOString(), benachrichtigt: gemeldet });
  process.exit(1);
}
