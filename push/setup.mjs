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
add('VORSTAND_EMAILS', 'weber.soltau@gmail.com');
add('ICS_TOKEN', [...Array(20)].map(() => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join(''));
if (!env.WIX_API_KEY) add('WIX_API_KEY', '');
writeFileSync(envFile, envText, 'utf8');

// 2) Admin-Zugang
if (!env.WIX_API_KEY) {
  console.log(`
Noch offen: der Admin-API-Schlüssel von Wix.
  1. https://manage.wix.com/account/api-keys → „API-Schlüssel erstellen“
  2. Name „SPD Soltau Push-Dienst“, Sites: nur SPD Soltau, Berechtigungen: „Alle Website-Berechtigungen“
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
  Umfragen: [T('frage', 'Frage'), T('beschreibung', 'Erläuterung'), T('optionen', 'Antworten', 'ARRAY_STRING'), T('mehrfach', 'Mehrfachauswahl', 'BOOLEAN'), T('offen', 'Offen', 'BOOLEAN'), T('endetAm', 'Läuft bis'), T('von', 'Von')],
  UmfragenOeffentlich: [T('frage', 'Frage'), T('beschreibung', 'Erläuterung'), T('optionen', 'Antworten', 'ARRAY_STRING'), T('mehrfach', 'Mehrfachauswahl', 'BOOLEAN'), T('offen', 'Offen', 'BOOLEAN'), T('endetAm', 'Läuft bis'), T('von', 'Von')],
  Stimmen: [T('umfrageId', 'Umfrage-ID'), T('name', 'Name'), T('memberId', 'Mitglieds-ID'), T('auswahl', 'Auswahl (Index)', 'ARRAY_STRING')],
  Helferlisten: [T('titel', 'Titel'), T('datum', 'Datum'), T('ort', 'Ort'), T('eventTitel', 'Termin'), T('beschreibung', 'Beschreibung'), T('von', 'Von')],
  Helfer: [T('listeId', 'Liste-ID'), T('schichtId', 'Schicht'), T('name', 'Name'), T('memberId', 'Mitglieds-ID')],
  Dokumente: [T('titel', 'Titel'), T('kategorie', 'Kategorie'), T('datum', 'Datum'), T('url', 'Link'), T('datei', 'Datei', 'DOCUMENT'), T('beschreibung', 'Beschreibung'), T('von', 'Von')],
  Ratsvorbereitung: [T('gremium', 'Gremium'), T('sitzung', 'Sitzung am'), T('zeit', 'Uhrzeit'), T('titel', 'Titel'), T('link', 'Link'), T('hinweis', 'Hinweis'), T('von', 'Von')],
  Profile: [T('name', 'Name'), T('memberId', 'Mitglieds-ID'), T('verzeichnisSichtbar', 'Im Verzeichnis', 'BOOLEAN'), T('ort', 'Ortsteil'), T('telefon', 'Telefon'), T('telefonSichtbar', 'Telefon sichtbar', 'BOOLEAN'), T('email', 'E-Mail'), T('emailSichtbar', 'E-Mail sichtbar', 'BOOLEAN'), T('geburtstag', 'Geburtstag'), T('geburtstagSichtbar', 'Geburtstag sichtbar', 'BOOLEAN'), T('eintritt', 'Eintrittsjahr', 'NUMBER'), T('fahreAb', 'Fährt ab')],
  Fahrgemeinschaften: [T('eventTitel', 'Termin'), T('eventDatum', 'Datum'), T('typ', 'Biete/Suche'), T('ab', 'Ab'), T('plaetze', 'Plätze', 'NUMBER'), T('zeit', 'Abfahrt'), T('name', 'Name'), T('memberId', 'Mitglieds-ID')],
  Eingang: [T('typ', 'Art'), T('key', 'Schlüssel'), T('memberId', 'Für Mitglied'), T('body', 'Text'), T('status', 'Status'), T('payload', 'Daten')],
  Anfragen: [T('typ', 'Art'), T('thema', 'Thema'), T('name', 'Name'), T('email', 'E-Mail'), T('ort', 'Wohnort/Straße'), T('interesse', 'Interesse'), T('nachricht', 'Nachricht'), T('status', 'Status'), T('bearbeitetVon', 'Bearbeitet von'), T('bearbeitetAm', 'Bearbeitet am')],
};
// Sammlungen der Ratsarbeit (Working Space der Fraktion) – werden hier angelegt, mit passenden Rechten:
//   RatGeheim: der Fraktionsschlüssel, nur für den Dienst (Admin). RatSchluessel: Geräteschlüssel der Mitglieder – jedes Mitglied liest
//   nur seine eigenen Einträge, verpacken/löschen darf nur der Dienst. Aufgaben, Dokumente, Dateiteile: alle Mitglieder, Inhalte verschlüsselt.
const P = (read, insert, update, remove) => ({ read, insert, update, remove });
const RAT = {
  RatGeheim: { displayName: 'Rat – Schlüssel (nur Dienst)', permissions: P('ADMIN', 'ADMIN', 'ADMIN', 'ADMIN'), fields: [T('schluessel', 'Schlüssel')] },
  RatSchluessel: { displayName: 'Rat – Geräteschlüssel', permissions: P('SITE_MEMBER_AUTHOR', 'SITE_MEMBER', 'ADMIN', 'ADMIN'), fields: [T('memberId', 'Mitglieds-ID'), T('name', 'Name'), T('geraet', 'Gerät'), T('status', 'Status'), T('pub', 'Öffentlicher Schlüssel'), T('verpackt', 'Verpackter Fraktionsschlüssel')] },
  RatAufgaben: { displayName: 'Rat – Aufgaben', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('b', 'Bereich'), T('status', 'Status'), T('frist', 'Frist'), T('wer', 'Zuständig (IDs)', 'ARRAY_STRING'), T('werNamen', 'Zuständig', 'ARRAY_STRING'), T('von', 'Angelegt von (ID)'), T('vonName', 'Angelegt von'), T('daten', 'Inhalt (verschlüsselt)'), T('erinnert', 'Erinnert', 'BOOLEAN'), T('erledigtAm', 'Erledigt am')] },
  RatDokumente: { displayName: 'Rat – Dokumente', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('b', 'Bereich'), T('kat', 'Art'), T('art', 'Datei/Link'), T('von', 'Von (ID)'), T('vonName', 'Von'), T('daten', 'Inhalt (verschlüsselt)'), T('dateiId', 'Datei-ID'), T('teile', 'Teile', 'NUMBER'), T('groesse', 'Größe (Bytes)', 'NUMBER')] },
  RatDateiTeile: { displayName: 'Rat – Dateiteile', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'ADMIN', 'SITE_MEMBER'), fields: [T('dateiId', 'Datei-ID'), T('nr', 'Nr.', 'NUMBER'), T('daten', 'Daten (verschlüsselt)')] },
};
for (const [id, def] of Object.entries(RAT)) {
  SCHEMA[id] = def.fields;
  try { await client.collections.getDataCollection(id); continue; } catch (e) { /* fehlt noch */ }
  try {
    await client.collections.createDataCollection({ _id: id, displayName: def.displayName, permissions: def.permissions, fields: def.fields });
    log(`Sammlung ${id} angelegt (${Object.entries(def.permissions).map(([k, v]) => k + ': ' + v).join(', ')})`);
  } catch (e) { log(`Sammlung ${id} konnte nicht angelegt werden: ${e.message}`); }
}
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
