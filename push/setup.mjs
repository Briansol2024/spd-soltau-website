// Einrichtung des Push-Dienstes:
//   1. erzeugt die VAPID-Schlüssel (einmalig) und trägt sie in .env ein,
//   2. prüft den Wix-Admin-API-Schlüssel (falls vorhanden) und
//   3. legt die Felder der App-Sammlungen im Wix-CMS an, damit sie im Dashboard als Spalten sichtbar sind.
//   node push/setup.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import webpush from 'web-push';
import { ROOT, env, adminClient, log } from './lib.mjs';

const envFile = path.join(ROOT, '.env');
let envText = existsSync(envFile) ? readFileSync(envFile, 'utf8') : '';
const add = (k, v) => { if (!envText.match(new RegExp(`^${k}=`, 'm'))) { envText += `${envText.endsWith('\n') || !envText ? '' : '\n'}${k}=${v}\n`; process.env[k] = v; return true; } return false; };

// 1) VAPID
if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
  const keys = webpush.generateVAPIDKeys();
  add('VAPID_PUBLIC_KEY', keys.publicKey); add('VAPID_PRIVATE_KEY', keys.privateKey);
  add('VAPID_SUBJECT', 'mailto:weber.soltau@gmail.com');
  log('VAPID-Schlüssel erzeugt und in .env eingetragen.');
} else log('VAPID-Schlüssel vorhanden.');
add('WIX_SITE_ID', '2678f727-8329-4f07-95bd-755df04f685d');
if (!env.WIX_API_KEY) add('WIX_API_KEY', '');
writeFileSync(envFile, envText, 'utf8');

// 2) Admin-Zugang
if (!env.WIX_API_KEY) {
  console.log(`
Noch offen: der Admin-API-Schlüssel von Wix.
  1. https://manage.wix.com/account/api-keys → „API-Schlüssel erstellen“
  2. Name z. B. „SPD Soltau Push-Dienst“, Berechtigungen: Wix CMS (Alle), Mitglieder & Kontakte (Alle), Blog (Lesen), Events (Lesen)
  3. Schlüssel kopieren und in .env eintragen:  WIX_API_KEY=…
  4. danach noch einmal:  node push/setup.mjs
`);
  process.exit(0);
}
const client = adminClient();
try {
  const res = await client.members.listMembers({ fieldsets: ['FULL'], paging: { limit: 1 } });
  log('Admin-Zugang funktioniert (Mitglieder erreichbar, gesamt ca.', res.metadata?.total ?? '?', ').');
} catch (e) { console.error('Admin-Zugang fehlgeschlagen:', e.message); process.exit(1); }

// 3) Felder der Sammlungen (nur Anzeige im Dashboard – die Daten werden auch ohne Felder gespeichert)
const T = (key, displayName, type = 'TEXT') => ({ key, displayName, type });
const SCHEMA = {
  Zusagen: [T('eventTitel', 'Termin'), T('eventDatum', 'Datum'), T('status', 'Status'), T('grund', 'Grund'), T('name', 'Mitglied'), T('memberId', 'Mitglieds-ID'), T('eventId', 'Termin-ID')],
  PushSubscriptions: [T('name', 'Name'), T('memberId', 'Mitglieds-ID'), T('themen', 'Themen', 'ARRAY_STRING'), T('aktiv', 'Aktiv', 'BOOLEAN'), T('endpoint', 'Endpoint'), T('keys', 'Schlüssel'), T('ua', 'Gerät'), T('standalone', 'Als App', 'BOOLEAN')],
  Benachrichtigungen: [T('thema', 'Thema'), T('namen', 'Empfänger', 'ARRAY_STRING'), T('empfaenger', 'Empfänger-IDs', 'ARRAY_STRING'), T('von', 'Gespeichert von')],
  Aktionen: [T('typ', 'Aktion'), T('status', 'Status'), T('von', 'Von'), T('ergebnis', 'Ergebnis'), T('erledigtAm', 'Erledigt am'), T('payload', 'Daten')],
  AppMitglieder: [T('name', 'Name'), T('rollen', 'Rollen', 'ARRAY_STRING'), T('vorstand', 'Vorstand', 'BOOLEAN'), T('pushAktiv', 'Push aktiv', 'BOOLEAN'), T('memberId', 'Mitglieds-ID'), T('status', 'Status')],
  Buchungen: [T('name', 'Name'), T('organisation', 'Verein/Gruppe'), T('datum', 'Datum'), T('von', 'Von'), T('bis', 'Bis'), T('zweck', 'Anlass'), T('personen', 'Personen'), T('email', 'E-Mail'), T('telefon', 'Telefon'), T('nachricht', 'Nachricht'), T('status', 'Status'), T('bearbeitetVon', 'Bearbeitet von'), T('bearbeitetAm', 'Bearbeitet am')],
  PushLog: [T('key', 'Schlüssel'), T('titel', 'Titel'), T('empfaenger', 'Empfänger', 'NUMBER')],
};
for (const [id, fields] of Object.entries(SCHEMA)) {
  try {
    const col = await client.collections.getDataCollection(id);
    const have = new Set((col.fields || []).map(f => f.key));
    let n = 0;
    for (const f of fields) {
      if (have.has(f.key)) continue;
      try { await client.collections.createDataCollectionField(id, { field: f }); n++; }
      catch (e) { log(`  ${id}.${f.key}: ${e.message}`); }
    }
    log(`Sammlung ${id}: ${n} Feld(er) ergänzt`);
  } catch (e) { log(`Sammlung ${id} nicht erreichbar: ${e.message}`); }
}
console.log(`
Fertig. Nächste Schritte:
  node build.mjs && node protect.mjs      (Website neu bauen – der öffentliche VAPID-Schlüssel steckt im Build)
  node push/send.mjs --test               (Testnachricht an alle Geräte mit aktivierten Benachrichtigungen)
  „push\\Push-Dienst einrichten.cmd“      (Aufgabenplanung: alle 5 Minuten automatisch)
`);
