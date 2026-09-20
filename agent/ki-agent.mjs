// KI-Agent der SPD-Soltau-App – läuft auf dem SKM-Server (Windows, Aufgabenplanung „SPD Soltau KI-Agent“).
// Holt alle 15 Sekunden Anfragen aus der Wix-Sammlung `KiAuftraege` (Filmdreh → „Unser KI-Agent“), lässt Claude Code
// mit dem Abo-Login des Servers antworten (Befehl `claude -p`, Prompt über stdin) und schreibt Skript, Overlays und
// Rückfrage zurück. Dazu ein Herzschlag in `KiStatus` (die App zeigt „Agent online/offline“, der Push-Dienst schlägt
// Alarm, wenn er ausbleibt) und ein Push an den Fragenden, sobald die Antwort da ist.
//   node agent/ki-agent.mjs            (Dauerbetrieb)      node agent/ki-agent.mjs --einmal   (ein Durchlauf, zum Testen)
import { spawn } from 'node:child_process';
import os from 'node:os';
import webpush from 'web-push';
import { adminClient, queryAll, env, log } from '../push/lib.mjs';
import { FILM_TEAM, AUFTRAG, antwortLesen } from '../src/lib/film.mjs';

const client = adminClient();
// Befehl: CLAUDE_BIN aus .env, sonst die npm-Installation des Nutzers (unter der Aufgabenplanung fehlt PATH/APPDATA gern)
import { existsSync as _ex } from 'node:fs';
import _path from 'node:path';
import { fileURLToPath } from 'node:url';
const _exe = d => d && _path.join(d, 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
const _hier = _path.dirname(fileURLToPath(import.meta.url));
const CLAUDE = env.CLAUDE_BIN || [_path.join(_hier, 'claude', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe'), _exe(process.env.APPDATA), _exe(_path.join(os.homedir(), 'AppData', 'Roaming'))].find(f => f && _ex(f)) || 'claude';
const MODELL = env.KI_MODELL || '';
const EINMAL = process.argv.includes('--einmal');
const VERSION = '1.0';
let angemeldet = null; // null = unbekannt, false = „Not logged in“
let mitglieder = { zeit: 0, mails: new Map() };

async function claude(prompt) {
  return new Promise((resolve, reject) => {
    const p = spawn(CLAUDE, ['-p', '--output-format', 'text', ...(MODELL ? ['--model', MODELL] : [])], { shell: /\.cmd$|\.bat$/i.test(CLAUDE) || CLAUDE === 'claude', env: { ...process.env, HOME: process.env.HOME || process.env.USERPROFILE || '' }, windowsHide: true });
    let out = '', err = ''; const t = setTimeout(() => { p.kill(); reject(new Error('Claude hat nach 4 Minuten nicht geantwortet')); }, 4 * 60 * 1000);
    p.stdout.on('data', d => { out += d; }); p.stderr.on('data', d => { err += d; });
    p.on('error', e => { clearTimeout(t); reject(e); });
    p.on('close', code => { clearTimeout(t); const text = out.trim(); if (/not logged in|please run \/login/i.test(text + err)) { angemeldet = false; reject(new Error('Claude ist auf dem Server nicht angemeldet – im Terminal „claude“ starten und /login ausführen.')); return; } if (code !== 0 && !text) { reject(new Error((err || 'claude beendet mit ' + code).trim().slice(0, 300))); return; } angemeldet = true; resolve(text); });
    p.stdin.on('error', () => {}); p.stdin.end(prompt);
  });
}
async function mailsLaden() {
  if (Date.now() - mitglieder.zeit < 60 * 60 * 1000) return mitglieder.mails;
  const m = new Map();
  try { for (let offset = 0; ; offset += 100) { const res = await client.members.listMembers({ fieldsets: ['FULL'], paging: { limit: 100, offset } }); for (const x of res.members || []) m.set(x._id, (x.loginEmail || '').toLowerCase()); if ((res.members || []).length < 100) break; } mitglieder = { zeit: Date.now(), mails: m }; } catch (e) { log('Mitglieder:', e.message); }
  return mitglieder.mails;
}
async function herzschlag(info = '') {
  try {
    const [alt] = await queryAll(client, 'KiStatus', q => q.eq('key', 'agent'));
    const neu = { ...(alt || {}), title: 'agent', key: 'agent', zuletzt: new Date().toISOString(), host: os.hostname(), angemeldet: angemeldet !== false, version: VERSION, info };
    if (alt) await client.items.update('KiStatus', neu); else await client.items.insert('KiStatus', neu);
  } catch (e) { log('Herzschlag:', e.message); }
}
async function push(memberId, titel, text, link) {
  try {
    if (!env.VAPID_PRIVATE_KEY || !env.VAPID_PUBLIC_KEY || !memberId) return;
    webpush.setVapidDetails(env.VAPID_SUBJECT || 'mailto:weber.soltau@gmail.com', env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
    const subs = (await queryAll(client, 'PushSubscriptions', q => q.eq('memberId', memberId))).filter(s => s.aktiv !== false && s.endpoint && s.keys);
    for (const s of subs) { try { await webpush.sendNotification({ endpoint: s.endpoint, keys: typeof s.keys === 'string' ? JSON.parse(s.keys) : s.keys }, JSON.stringify({ title: titel, body: text, tag: 'ki:' + Date.now(), url: link }), { TTL: 3600 }); } catch (e) { /* Gerät weg */ } }
  } catch (e) { log('Push:', e.message); }
}
async function bearbeiten(a) {
  const mails = await mailsLaden();
  if (!FILM_TEAM.includes(mails.get(a.memberId) || '')) { await client.items.update('KiAuftraege', { ...a, status: 'fehler', fehler: 'Nicht freigegeben (nur Filmteam).' }); return; }
  const t0 = Date.now();
  a = await client.items.update('KiAuftraege', { ...a, status: 'laeuft', gestartetAm: new Date().toISOString() });
  log(`Anfrage ${a._id} von ${a.von}: „${String(a.wunsch || '').slice(0, 60)}“`);
  try {
    let verlauf = []; try { verlauf = JSON.parse(a.verlauf || '[]'); } catch (e) { verlauf = []; }
    let overlaysVorher = []; try { overlaysVorher = JSON.parse(a.overlaysVorher || '[]'); } catch (e) { overlaysVorher = []; }
    const prompt = AUFTRAG({ titel: a.titel, art: a.art, datum: a.datum, skript: a.skriptVorher }, overlaysVorher, a.wunsch, verlauf);
    const text = await claude(prompt);
    const r = antwortLesen(text) || { skript: '', overlays: null, hinweis: text };
    const dauer = Math.round((Date.now() - t0) / 1000);
    await client.items.update('KiAuftraege', { ...a, status: 'fertig', antwort: text.slice(0, 20000), skript: r.skript || '', overlays: r.overlays ? JSON.stringify(r.overlays) : '', hinweis: (r.hinweis || '').slice(0, 2000), fertigAm: new Date().toISOString(), dauer, fehler: '' });
    log(`  fertig nach ${dauer} s – ${r.skript ? (r.skript.match(/TAKE\s*\d+/gi) || []).length + ' Takes' : 'kein Skript'}${r.overlays ? `, ${r.overlays.length} Overlays` : ''}`);
    await push(a.memberId, 'Claude ist fertig', r.skript ? `Skript für „${a.titel}“ liegt im Filmdreh – ${(r.skript.match(/TAKE\s*\d+/gi) || []).length} Takes.` : (r.hinweis || 'Antwort ist da.').slice(0, 140), (env.SITE_URL || 'https://spd-soltau.de') + '/mitglieder/#filmdreh/p-' + a.projektId);
  } catch (e) {
    log('  Fehler:', e.message);
    await client.items.update('KiAuftraege', { ...a, status: 'fehler', fehler: String(e.message || e).slice(0, 300), fertigAm: new Date().toISOString() }).catch(() => {});
    await push(a.memberId, 'Claude konnte nicht antworten', String(e.message || e).slice(0, 140), (env.SITE_URL || 'https://spd-soltau.de') + '/mitglieder/#filmdreh/p-' + a.projektId);
  }
}
async function durchlauf() {
  const offen = (await queryAll(client, 'KiAuftraege', q => q.eq('status', 'wartet'))).sort((x, y) => String(x._createdDate).localeCompare(String(y._createdDate)));
  for (const a of offen) { await bearbeiten(a); await herzschlag('arbeitet'); }
  // hängen gebliebene (Server war mittendrin weg)
  for (const a of await queryAll(client, 'KiAuftraege', q => q.eq('status', 'laeuft'))) if (Date.now() - new Date(a.gestartetAm || a._createdDate).getTime() > 10 * 60 * 1000) await client.items.update('KiAuftraege', { ...a, status: 'fehler', fehler: 'Abgebrochen – bitte noch einmal schicken.' }).catch(() => {});
}
// Nur eine Instanz: Sperrdatei mit Prozessnummer (die Aufgabenplanung ruft alle 5 Minuten – läuft der Agent schon, ist hier Schluss)
import { readFileSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import path from 'node:path';
const LOCK = path.join(path.dirname(fileURLToPath(import.meta.url)), 'agent.lock');
if (!EINMAL && existsSync(LOCK)) { const pid = +readFileSync(LOCK, 'utf8'); let lebt = false; try { process.kill(pid, 0); lebt = pid !== process.pid; } catch (e) { lebt = false; } if (lebt) { console.log('Agent läuft bereits (PID ' + pid + ')'); process.exit(0); } }
if (!EINMAL) { writeFileSync(LOCK, String(process.pid)); for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { try { unlinkSync(LOCK); } catch (e) { /* egal */ } process.exit(0); }); }
log(`KI-Agent startet auf ${os.hostname()} (Befehl: ${CLAUDE}${MODELL ? ', Modell ' + MODELL : ''}; Profil ${process.env.USERPROFILE || '-'}, APPDATA ${process.env.APPDATA || '-'}, HOME ${process.env.HOME || '-'})`);
// Anmeldung prüfen, ohne eine Anfrage zu verbrauchen
try { await claude('Antworte nur mit OK.'); log('Claude angemeldet.'); } catch (e) { log('Claude:', e.message); }
await herzschlag('gestartet');
if (EINMAL) { await durchlauf(); await herzschlag('einmal'); process.exit(0); }
let n = 0;
for (;;) {
  try { await durchlauf(); } catch (e) { log('Durchlauf:', e.message); }
  if (n++ % 4 === 0) await herzschlag('wartet');
  await new Promise(r => setTimeout(r, 15000));
}
