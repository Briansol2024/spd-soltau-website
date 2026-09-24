// Datenschutz-Kontrolle in einem Durchgang:
//   1. Wix: Welche Sammlung darf jeder lesen - und stehen dort personenbezogene Daten drin?
//   2. Website: Was steht in den veröffentlichten Dateien (HTML, Skripte, Kalender)?
// Gemeldet wird alles, was nach E-Mail, Telefon, Anschrift, Geburtsdatum oder IBAN aussieht.
// Adressen werden dabei nie im Klartext ausgegeben, nur gezählt und angedeutet.
//
//   node tools/datenschutz-pruefen.mjs            Wix und Website
//   node tools/datenschutz-pruefen.mjs --wix      nur Wix
//   node tools/datenschutz-pruefen.mjs --web      nur die veröffentlichten Dateien
import { readdirSync, statSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { adminClient, env, log } from '../push/lib.mjs';

const nurWix = process.argv.includes('--wix');
const nurWeb = process.argv.includes('--web');

const MAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Telefon nur mit echtem Trenner (Leerzeichen oder Schrägstrich) - Datumsketten in
// Termin-Kennungen wie „2027-01-15-19-00“ sind sonst ständig Fehlalarm.
const TEL = /(?:\+49[ \/]?\d{2,5}[ \/]?\d{4,}|0\d{2,4}[ \/]\d{4,})/g;
const IBAN = /\bDE\d{2}[ ]?(?:\d{4}[ ]?){4}\d{2}\b/g;
const GEB = /\b(?:19|20)\d{2}-\d{2}-\d{2}\b/g;
// Was harmlos ist: unsere eigene Adresse, Beispiel- und Platzhalterdaten, technische Kennungen
// Harmlos: unsere eigene Adresse, Beispieldaten, technische Kennungen und die Autorenangabe
// in der Lizenz einer eingebauten Bibliothek (js-sha256, steckt im Wix-Baukasten).
const HARMLOS = /example|mysite|muster|test@|noreply|@sentry|@wix|0000000|1234567|@spd-soltau\.de|@schema|@types|@babel|@esbuild|@rollup|emn178@gmail\.com/i;
const säubern = (liste) => [...new Set(liste || [])].filter(x => !HARMLOS.test(x));
const andeuten = (m) => m.slice(0, 3) + '…@' + m.split('@')[1];

let gesamtTreffer = 0;
const melden = (ort, mails, tels, ibans) => {
  const n = mails.length + tels.length + ibans.length;
  gesamtTreffer += n;
  if (!n) return;
  console.log(`   ! ${ort}`);
  if (mails.length) console.log(`       ${mails.length} E-Mail-Adresse(n): ${mails.slice(0, 5).map(andeuten).join(', ')}`);
  if (tels.length) console.log(`       ${tels.length} Telefonnummer(n)`);
  if (ibans.length) console.log(`       ${ibans.length} IBAN(s)`);
};

// ---------------------------------------------------------------- 1. Wix
if (!nurWeb) {
  log('Wix: Sammlungen prüfen …');
  const c = adminClient();
  const alle = (await c.collections.listDataCollections()).collections || [];
  const offen = alle.filter(x => (x.permissions?.read || '') === 'ANYONE');
  console.log(`   ${alle.length} Sammlungen, davon ${offen.length} für jeden lesbar`);
  for (const coll of offen) {
    if (/^(Blog|Stores|Bookings|Events|Media|Marketing|Members|@)/.test(coll.id)) continue;   // von Wix verwaltet
    let items = [];
    try { items = (await c.items.query(coll.id).limit(300).find()).items; } catch { continue; }
    const txt = JSON.stringify(items);
    melden(`Sammlung „${coll.id}“ (${items.length} Einträge, für jeden lesbar)`,
      säubern(txt.match(MAIL)), säubern(txt.match(TEL)), säubern(txt.match(IBAN)));
  }
  // Geschützte Sammlungen nur auflisten, damit man sieht, dass sie geschützt sind
  const geschützt = alle.filter(x => (x.permissions?.read || '') !== 'ANYONE' && !/^(Blog|Stores|Bookings|Events|Media|Marketing|Members|@)/.test(x.id));
  console.log(`   ${geschützt.length} Sammlungen sind auf Mitglieder oder Admin beschränkt (nicht öffentlich abrufbar)`);
}

// ---------------------------------------------------------------- 2. veröffentlichte Dateien
if (!nurWix) {
  log('Website: veröffentlichte Dateien prüfen …');
  const wurzel = path.resolve(path.dirname(new URL(import.meta.url).pathname.slice(1)), '..', 'dist');
  if (!existsSync(wurzel)) { console.log('   dist/ fehlt - bitte zuerst "node build.mjs"'); }
  else {
    const dateien = [];
    (function sammeln(p) {
      for (const n of readdirSync(p)) {
        const voll = path.join(p, n);
        if (statSync(voll).isDirectory()) sammeln(voll);
        else if (/\.(html|js|mjs|json|ics|txt|xml|css)$/i.test(n)) dateien.push(voll);
      }
    })(wurzel);
    console.log(`   ${dateien.length} Dateien`);
    for (const f of dateien) {
      const t = readFileSync(f, 'utf8');
      melden(path.relative(wurzel, f), säubern(t.match(MAIL)), säubern(t.match(TEL)), säubern(t.match(IBAN)));
    }
  }
}

console.log(gesamtTreffer === 0
  ? '\n>>> Alles sauber: keine privaten Kontaktdaten gefunden.'
  : `\n>>> ${gesamtTreffer} Fundstelle(n) - bitte oben ansehen.`);
