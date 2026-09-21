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
  Benachrichtigungen: [T('thema', 'Thema'), T('namen', 'Empfänger', 'ARRAY_STRING'), T('empfaenger', 'Empfänger-IDs', 'ARRAY_STRING'), T('von', 'Gespeichert von'), T('muster', 'Muster'), T('lokale', 'Lokale', 'ARRAY_STRING')],
  Aktionen: [T('typ', 'Aktion'), T('status', 'Status'), T('von', 'Von'), T('ergebnis', 'Ergebnis'), T('erledigtAm', 'Erledigt am'), T('payload', 'Daten')],
  AppMitglieder: [T('name', 'Name'), T('rollen', 'Rollen', 'ARRAY_STRING'), T('vorstand', 'Vorstand', 'BOOLEAN'), T('pushAktiv', 'Push aktiv', 'BOOLEAN'), T('memberId', 'Mitglieds-ID'), T('status', 'Status')],
  Buchungen: [T('name', 'Name'), T('organisation', 'Verein/Gruppe'), T('datum', 'Datum'), T('von', 'Von'), T('bis', 'Bis'), T('zweck', 'Anlass'), T('personen', 'Personen'), T('email', 'E-Mail'), T('telefon', 'Telefon'), T('nachricht', 'Nachricht'), T('status', 'Status'), T('bearbeitetVon', 'Bearbeitet von'), T('bearbeitetAm', 'Bearbeitet am')],
  PushLog: [T('key', 'Schlüssel'), T('titel', 'Titel'), T('empfaenger', 'Empfänger', 'NUMBER')],
  Umfragen: [T('frage', 'Frage'), T('beschreibung', 'Erläuterung'), T('optionen', 'Antworten', 'ARRAY_STRING'), T('mehrfach', 'Mehrfachauswahl', 'BOOLEAN'), T('offen', 'Offen', 'BOOLEAN'), T('endetAm', 'Läuft bis'), T('von', 'Von'), T('eventId', 'Termin-ID'), T('nurZusagen', 'Nur für Zusagen', 'BOOLEAN')],
  UmfragenOeffentlich: [T('frage', 'Frage'), T('beschreibung', 'Erläuterung'), T('optionen', 'Antworten', 'ARRAY_STRING'), T('mehrfach', 'Mehrfachauswahl', 'BOOLEAN'), T('offen', 'Offen', 'BOOLEAN'), T('endetAm', 'Läuft bis'), T('von', 'Von'), T('maxWahl', 'Höchstens Kreuze', 'NUMBER'), T('folge', 'Was daraus wurde'), T('ergebnis', 'Ergebnis (JSON)'), T('mitreden', 'Auf „Sie entscheiden mit“', 'BOOLEAN'), T('stimmen', 'Abgegebene Stimmen', 'NUMBER')],
  Stimmen: [T('umfrageId', 'Umfrage-ID'), T('name', 'Name'), T('memberId', 'Mitglieds-ID'), T('auswahl', 'Auswahl (Index)', 'ARRAY_STRING')],
  Helferlisten: [T('titel', 'Titel'), T('datum', 'Datum'), T('ort', 'Ort'), T('eventTitel', 'Termin'), T('beschreibung', 'Beschreibung'), T('von', 'Von')],
  Helfer: [T('listeId', 'Liste-ID'), T('schichtId', 'Schicht'), T('name', 'Name'), T('memberId', 'Mitglieds-ID')],
  Dokumente: [T('titel', 'Titel'), T('kategorie', 'Kategorie'), T('datum', 'Datum'), T('url', 'Link'), T('datei', 'Datei', 'DOCUMENT'), T('beschreibung', 'Beschreibung'), T('von', 'Von')],
  Ratsvorbereitung: [T('b', 'Bereich/Ausschuss'), T('protokoll', 'Ergebnisse trägt ein (ID)'), T('ergebnisNur', 'Nur Sitzungsleitung trägt Ergebnisse ein', 'BOOLEAN'), T('aktuell', 'Aktueller Punkt', 'NUMBER'), T('skript', 'Instagram-Skript'), T('veroeffentlicht', 'Ratsbericht online', 'BOOLEAN'), T('berichtText', 'Ratsbericht – Einleitung'), T('veroeffentlichtAm', 'Ratsbericht seit'), T('typ', 'Art'), T('gremium', 'Gremium'), T('sitzung', 'Sitzung am'), T('zeit', 'Uhrzeit'), T('ort', 'Ort'), T('titel', 'Titel'), T('link', 'Link'), T('hinweis', 'Hinweis'), T('von', 'Von')],
  Profile: [T('name', 'Name'), T('memberId', 'Mitglieds-ID'), T('verzeichnisSichtbar', 'Im Verzeichnis', 'BOOLEAN'), T('ort', 'Ortsteil'), T('telefon', 'Telefon'), T('telefonSichtbar', 'Telefon sichtbar', 'BOOLEAN'), T('email', 'E-Mail'), T('emailSichtbar', 'E-Mail sichtbar', 'BOOLEAN'), T('geburtstag', 'Geburtstag'), T('geburtstagSichtbar', 'Geburtstag sichtbar', 'BOOLEAN'), T('eintritt', 'Eintrittsjahr', 'NUMBER'), T('fahreAb', 'Fährt ab')],
  Fahrgemeinschaften: [T('eventTitel', 'Termin'), T('eventDatum', 'Datum'), T('typ', 'Biete/Suche'), T('ab', 'Ab'), T('plaetze', 'Plätze', 'NUMBER'), T('zeit', 'Abfahrt'), T('name', 'Name'), T('memberId', 'Mitglieds-ID')],
  Eingang: [T('typ', 'Art'), T('key', 'Schlüssel'), T('memberId', 'Für Mitglied'), T('body', 'Text'), T('status', 'Status'), T('payload', 'Daten')],
  Anfragen: [T('typ', 'Art'), T('thema', 'Thema'), T('name', 'Name'), T('email', 'E-Mail'), T('ort', 'Wohnort/Straße'), T('interesse', 'Interesse'), T('nachricht', 'Nachricht'), T('status', 'Status'), T('bearbeitetVon', 'Bearbeitet von'), T('bearbeitetAm', 'Bearbeitet am'), T('oeffentlichOk', 'Darf anonym veröffentlicht werden', 'BOOLEAN'), T('veroeffentlicht', 'Als Anliegen veröffentlicht', 'BOOLEAN')],
};
// Sammlungen der Ratsarbeit, der Vorgänge, Versammlungen, des Wahlkampfs, Jahresplans, der Presse und des Newsletters – werden hier angelegt, mit passenden Rechten:
//   RatGeheim: der Fraktionsschlüssel, nur für den Dienst (Admin). RatSchluessel: Geräteschlüssel der Mitglieder – jedes Mitglied liest
//   nur seine eigenen Einträge, verpacken/löschen darf nur der Dienst. Aufgaben, Dokumente, Dateiteile: alle Mitglieder, Inhalte verschlüsselt.
const P = (read, insert, update, remove) => ({ read, insert, update, remove });
const RAT = {
  RatGeheim: { displayName: 'Rat – Schlüssel (nur Dienst)', permissions: P('ADMIN', 'ADMIN', 'ADMIN', 'ADMIN'), fields: [T('schluessel', 'Schlüssel'), T('gruppe', 'Gruppe')] },
  RatSchluessel: { displayName: 'Rat – Geräteschlüssel', permissions: P('SITE_MEMBER_AUTHOR', 'SITE_MEMBER', 'ADMIN', 'ADMIN'), fields: [T('memberId', 'Mitglieds-ID'), T('name', 'Name'), T('geraet', 'Gerät'), T('status', 'Status'), T('pub', 'Öffentlicher Schlüssel'), T('verpackt', 'Verpackter Fraktionsschlüssel'), T('verpacktVorstand', 'Verpackter Vorstandsschlüssel')] },
  RatAufgaben: { displayName: 'Rat – Aufgaben', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('b', 'Bereich'), T('status', 'Status'), T('frist', 'Frist'), T('wer', 'Zuständig (IDs)', 'ARRAY_STRING'), T('werNamen', 'Zuständig', 'ARRAY_STRING'), T('von', 'Angelegt von (ID)'), T('vonName', 'Angelegt von'), T('daten', 'Inhalt (verschlüsselt)'), T('erinnert', 'Erinnert', 'BOOLEAN'), T('erledigtAm', 'Erledigt am')] },
  RatDokumente: { displayName: 'Rat – Dokumente', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('b', 'Bereich'), T('kat', 'Art'), T('art', 'Datei/Link'), T('von', 'Von (ID)'), T('vonName', 'Von'), T('daten', 'Inhalt (verschlüsselt)'), T('dateiId', 'Datei-ID'), T('teile', 'Teile', 'NUMBER'), T('groesse', 'Größe (Bytes)', 'NUMBER')] },
  RatDateiTeile: { displayName: 'Rat – Dateiteile', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'ADMIN', 'SITE_MEMBER'), fields: [T('dateiId', 'Datei-ID'), T('nr', 'Nr.', 'NUMBER'), T('daten', 'Daten (verschlüsselt)')] },
  RatAntraege: { displayName: 'Rat – Anträge', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('b', 'Bereich'), T('status', 'Status'), T('gremium', 'Gremium'), T('sitzung', 'Sitzung am'), T('von', 'Von (ID)'), T('vonName', 'Von'), T('daten', 'Inhalt (verschlüsselt)'), T('zustimmung', 'Zustimmung (IDs)', 'ARRAY_STRING'), T('eingereichtAm', 'Eingereicht am')] },
  // Vorgänge: Anliegen, Buchungen, Registrierungen für den Vorstand – vom Dienst angelegt, Inhalt mit dem Vorstandsschlüssel verschlüsselt
  Vorgaenge: { displayName: 'Vorstand – Vorgänge (verschlüsselt)', permissions: P('SITE_MEMBER', 'ADMIN', 'SITE_MEMBER', 'ADMIN'), fields: [T('typ', 'Art'), T('key', 'Schlüssel'), T('status', 'Status'), T('zustaendig', 'Zuständig (ID)'), T('zustaendigName', 'Zuständig'), T('daten', 'Inhalt (verschlüsselt)'), T('notiz', 'Notizen (verschlüsselt)'), T('erinnertAm', 'Erinnert am'), T('erledigtAm', 'Erledigt am'), T('geaendertVon', 'Geändert von')] },
  // Filmdreh (Regie-Modus): Projekte, Material (Dateien landen über den Dienst im Medienmanager), Dateiteile beim Hochladen
  FilmProjekte: { displayName: 'Filmdreh – Projekte', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('titel', 'Titel'), T('art', 'Art'), T('status', 'Status'), T('datum', 'Termin'), T('skript', 'Skript'), T('drehplan', 'Drehplan'), T('notizen', 'Notizen'), T('overlays', 'Overlays (JSON)'), T('ki', 'KI-Unterhaltung (JSON)'), T('takesFertig', 'Takes im Kasten (JSON)'), T('kiWunsch', 'Wunsch an Claude'), T('sitzungId', 'Sitzung (Rückblick)'), T('von', 'Von'), T('memberId', 'Mitglieds-ID')] },
  FilmMaterial: { displayName: 'Filmdreh – Material', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('projektId', 'Projekt'), T('art', 'Art'), T('titel', 'Titel'), T('url', 'Adresse'), T('name', 'Dateiname'), T('mime', 'Typ'), T('groesse', 'Größe', 'NUMBER'), T('teile', 'Teile', 'NUMBER'), T('status', 'Status'), T('fehler', 'Fehler'), T('von', 'Von'), T('memberId', 'Mitglieds-ID'), T('auftragId', 'Auftrag')] },
  FilmTeile: { displayName: 'Filmdreh – Dateiteile (Fotos bleiben hier)', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'ADMIN', 'ADMIN'), fields: [T('materialId', 'Material'), T('nr', 'Nr.', 'NUMBER'), T('daten', 'Daten (Base64)')] },
  // Aufträge an den Overlay-Agenten (GitHub Actions): nur der Auftraggeber liest, der Dienst schreibt Status und Download
  Auftraege: { displayName: 'Aufträge (Overlay-Agent)', permissions: P('SITE_MEMBER_AUTHOR', 'SITE_MEMBER', 'ADMIN', 'SITE_MEMBER_AUTHOR'), fields: [T('typ', 'Art'), T('status', 'Status'), T('titel', 'Titel'), T('sitzungId', 'Sitzung'), T('memberId', 'Mitglieds-ID'), T('von', 'Von'), T('manifest', 'Manifest (JSON)'), T('url', 'Download'), T('dateiName', 'Datei'), T('dateien', 'Dateien', 'NUMBER'), T('groesse', 'Größe (Bytes)', 'NUMBER'), T('fehler', 'Fehler'), T('benachrichtigt', 'Benachrichtigt', 'BOOLEAN'), T('gestartetAm', 'Gestartet'), T('fertigAm', 'Fertig'), T('fortschritt', 'Fortschritt %', 'NUMBER'), T('schritt', 'Schritt'), T('projektId', 'Filmprojekt'), T('materialAngelegt', 'Im Material', 'BOOLEAN')] },
  // Ratsberichte für die Website: öffentlich lesbar, nur der Dienst schreibt (Kopie der freigegebenen, öffentlich sagbaren Teile einer Sitzung)
  Ratsberichte: { displayName: 'Ratsberichte (öffentlich)', permissions: P('ANYONE', 'ADMIN', 'ADMIN', 'ADMIN'), fields: [T('sitzungId', 'Sitzung'), T('gremium', 'Gremium'), T('datum', 'Datum'), T('zeit', 'Uhrzeit'), T('ort', 'Ort'), T('titel', 'Titel'), T('bereich', 'Bereich'), T('text', 'Einleitung'), T('tops', 'Punkte (JSON)'), T('veroeffentlichtAm', 'Veröffentlicht')] },
  // Sitzungsmodus: Chat der Fraktion/des Vorstands während einer Sitzung – Inhalt mit dem Gruppenschlüssel verschlüsselt
  SitzungChat: { displayName: 'Sitzungen – Chat (verschlüsselt)', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'ADMIN', 'SITE_MEMBER_AUTHOR'), fields: [T('sitzungId', 'Sitzung'), T('name', 'Von'), T('memberId', 'Mitglieds-ID'), T('daten', 'Nachricht (verschlüsselt)')] },
  // Notizen im Sitzungsmodus: privat je Mitglied und Sitzung (Text + Stift-Skizze als Strichdaten)
  SitzungNotizen: { displayName: 'Sitzungen – Notizen', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER_AUTHOR', 'SITE_MEMBER_AUTHOR'), fields: [T('sitzungId', 'Sitzung'), T('name', 'Von'), T('memberId', 'Mitglieds-ID'), T('text', 'Text'), T('skizze', 'Skizze (Striche)'), T('freigabe', 'Für Rückblick freigegeben', 'BOOLEAN')] },
  // Wünsche & Ideen zur App: jedes Mitglied sieht nur die eigenen Einträge; der Dienst mailt sie und setzt den Status
  Feedback: { displayName: 'App – Wünsche & Ideen', permissions: P('SITE_MEMBER_AUTHOR', 'SITE_MEMBER', 'ADMIN', 'ADMIN'), fields: [T('wo', 'Wo'), T('was', 'Was'), T('bereich', 'Bereich'), T('prio', 'Wichtig'), T('text', 'Text'), T('name', 'Von'), T('email', 'E-Mail'), T('memberId', 'Mitglieds-ID'), T('geraet', 'Gerät'), T('seite', 'Seite'), T('status', 'Status')] },
  // Mitfahren: wer bei welchem Angebot (Fahrgemeinschaften) mitfährt – jedes Mitglied trägt sich selbst ein; löschen darf auch der Fahrer (räumt beim Zurückziehen auf)
  Mitfahrten: { displayName: 'Termine – Mitfahrten', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER_AUTHOR', 'SITE_MEMBER'), fields: [T('fahrtId', 'Angebot-ID'), T('eventId', 'Termin-ID'), T('eventTitel', 'Termin'), T('name', 'Name'), T('memberId', 'Mitglieds-ID')] },
  Versammlungen: { displayName: 'Versammlungen', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('titel', 'Titel'), T('datum', 'Datum'), T('zeit', 'Uhrzeit'), T('ort', 'Ort'), T('status', 'Status'), T('tops', 'Tagesordnung (JSON)'), T('antraege', 'Anträge (JSON)'), T('anwesend', 'Anwesend (IDs)', 'ARRAY_STRING'), T('protokoll', 'Protokoll'), T('von', 'Von')] },
  Abstimmungen: { displayName: 'Versammlungen – Stimmen', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER_AUTHOR', 'SITE_MEMBER_AUTHOR'), fields: [T('versammlungId', 'Versammlung'), T('antragId', 'Antrag'), T('memberId', 'Mitglieds-ID'), T('name', 'Name'), T('stimme', 'Stimme')] },
  WkStrassen: { displayName: 'Wahlkampf – Straßen', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('ort', 'Ortsteil'), T('strasse', 'Straße'), T('status', 'Status'), T('von', 'Von'), T('datum', 'Datum'), T('notiz', 'Notiz')] },
  WkPlakate: { displayName: 'Wahlkampf – Plakate', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('standort', 'Standort'), T('status', 'Status'), T('foto', 'Foto (Daten-URL)'), T('von', 'Von'), T('datum', 'Datum'), T('notiz', 'Notiz')] },
  Planungen: { displayName: 'Jahresplan – Planungen', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('titel', 'Titel'), T('datum', 'Datum'), T('vorlage', 'Vorlage', 'BOOLEAN'), T('aufgaben', 'Aufgaben (JSON)'), T('von', 'Von'), T('vonId', 'Von (ID)')] },
  Pressekontakte: { displayName: 'Presse – Kontakte', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('name', 'Name'), T('redaktion', 'Redaktion'), T('email', 'E-Mail'), T('telefon', 'Telefon'), T('notiz', 'Notiz'), T('von', 'Von')] },
  Abonnenten: { displayName: 'Newsletter – Abonnenten', permissions: P('ADMIN', 'ANYONE', 'ADMIN', 'ADMIN'), fields: [T('email', 'E-Mail'), T('typ', 'Art'), T('token', 'Token'), T('status', 'Status'), T('quelle', 'Quelle')] },
  Ideen: { displayName: 'Ideen der Mitglieder', permissions: P('SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('titel', 'Idee'), T('text', 'Dazu'), T('von', 'Von (ID)'), T('vonName', 'Von'), T('status', 'Stand'), T('likes', 'Gefällt (IDs)', 'ARRAY_STRING'), T('antwort', 'Rückmeldung')] },
  Newsletter: { displayName: 'Newsletter – Archiv', permissions: P('SITE_MEMBER', 'ADMIN', 'ADMIN', 'ADMIN'), fields: [T('betreff', 'Betreff'), T('ziel', 'An'), T('empfaenger', 'Empfänger', 'NUMBER'), T('text', 'Text'), T('gesendetAm', 'Gesendet am'), T('von', 'Von')] },
  // Mitreden (öffentliche Website): Startseiten-Schalter und Video, Anliegen-Ranking, Fragen, Baustellen, Unterstützung („Betrifft mich auch“)
  Startseite: { displayName: 'Website – Startseite (Schalter, Video)', permissions: P('ANYONE', 'SITE_MEMBER', 'SITE_MEMBER', 'ADMIN'), fields: [T('variante', 'Variante (klassisch/mitreden)'), T('videoTitel', 'Video – Titel'), T('videoUrl', 'Video – Adresse'), T('videoText', 'Video – Unterzeile'), T('videoKapitel', 'Video – Kapitel (Zeile: 0:04 Thema)'), T('videoDatum', 'Video – Datum'), T('videoBild', 'Video – Vorschaubild'), T('stand', 'Inhalt geändert am')] },
  AnliegenOeffentlich: { displayName: 'Mitreden – Was Soltau bewegt', permissions: P('ANYONE', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('anfrageId', 'Anfrage'), T('titel', 'Titel (anonym)'), T('kategorie', 'Kategorie'), T('ort', 'Ort'), T('text', 'Worum es geht'), T('stand', 'Stand (neu/nachgefragt/antwort)'), T('spd', 'Unsere Antwort'), T('zaehler', 'Betrifft mich auch', 'NUMBER'), T('sichtbar', 'Sichtbar', 'BOOLEAN'), T('datum', 'Datum')] },
  Fragen: { displayName: 'Mitreden – Fragen (Eingang)', permissions: P('SITE_MEMBER', 'ANYONE', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('frage', 'Frage'), T('name', 'Name'), T('email', 'E-Mail'), T('anonym', 'Anonym', 'BOOLEAN'), T('status', 'Status'), T('quelle', 'Woher (Seite/Video)')] },
  FragenOeffentlich: { displayName: 'Mitreden – Beantwortete Fragen', permissions: P('ANYONE', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('frageId', 'Frage (Eingang)'), T('frage', 'Frage'), T('wer', 'Von (Vorname oder Anonym)'), T('datum', 'Datum'), T('antwort', 'Antwort'), T('antwortVon', 'Antwort von'), T('videoUrl', 'Video-Antwort'), T('zaehler', 'Interessiert mich auch', 'NUMBER'), T('sichtbar', 'Sichtbar', 'BOOLEAN')] },
  Baustellen: { displayName: 'Mitreden – Baustellen und Sperrungen', permissions: P('ANYONE', 'SITE_MEMBER', 'SITE_MEMBER', 'SITE_MEMBER'), fields: [T('titel', 'Titel'), T('art', 'Art (Baustelle/Sperrung/Geplant)'), T('bis', 'Dauer'), T('was', 'Was'), T('warum', 'Warum'), T('umleitung', 'Umleitung'), T('spd', 'Unsere Einordnung'), T('lat', 'Breite', 'NUMBER'), T('lng', 'Länge', 'NUMBER'), T('aktiv', 'Aktiv', 'BOOLEAN'), T('quelle', 'Quelle')] },
  Unterstuetzung: { displayName: 'Mitreden – Betrifft mich auch (Rohdaten)', permissions: P('ANYONE', 'ANYONE', 'ADMIN', 'ADMIN'), fields: [T('zielId', 'Ziel'), T('typ', 'Art (anliegen/frage)'), T('geraet', 'Gerät (Hash)')] },
  // Statistik ohne Cookies: Rohdaten (jeder darf anlegen, nur der Dienst liest und löscht sie nach wenigen Minuten) und Tageswerte
  Seitenaufrufe: { displayName: 'Statistik – Seitenaufrufe (Rohdaten, kurzlebig)', permissions: P('ADMIN', 'ANYONE', 'ADMIN', 'ADMIN'), fields: [T('typ', 'Art'), T('pfad', 'Seite'), T('name', 'Ereignis'), T('ref', 'Herkunft'), T('quelle', 'Quelle'), T('geraet', 'Gerät'), T('sprache', 'Sprache'), T('breite', 'Breite', 'NUMBER'), T('eintritt', 'Einstieg', 'BOOLEAN'), T('app', 'App', 'BOOLEAN'), T('ladezeit', 'Ladezeit (ms)', 'NUMBER'), T('tag', 'Tag'), T('stunde', 'Stunde', 'NUMBER')] },
  Statistik: { displayName: 'Statistik – Tageswerte', permissions: P('SITE_MEMBER', 'ADMIN', 'ADMIN', 'ADMIN'), fields: [T('tag', 'Tag'), T('aufrufe', 'Aufrufe', 'NUMBER'), T('besuche', 'Besuche', 'NUMBER'), T('daten', 'Daten (JSON)')] },
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
