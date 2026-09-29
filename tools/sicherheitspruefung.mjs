// Sicherheitsprüfung: Was kann ein FREMDER mit dem öffentlichen Zugangsschlüssel?
//
// Die Website holt sich für Formulare und Umfragen ein anonymes Besucher-Token
// (site.js, wixVisitorToken). Der dafür nötige Schlüssel steht im Quelltext der
// Seite - er MUSS dort stehen, sonst könnte kein Besucher ein Formular
// abschicken. Die Frage ist deshalb nicht, ob jemand diesen Schlüssel bekommt,
// sondern WAS er damit anfangen kann.
//
// Dieses Skript stellt genau diese Frage an die eigene Seite: Es besorgt sich
// ein Besucher-Token und probiert jede Sammlung auf Lesen und auf Schreiben.
//
// ES LIEST KEINE INHALTE AUS. Gemeldet werden nur: erlaubt/verweigert, die
// Anzahl der Einträge und die FELDNAMEN. Wer prüfen will, ob Mitgliederdaten
// offen liegen, will nicht dieselben Daten noch einmal irgendwohin kopieren.
//
// Aufruf:  node tools/sicherheitspruefung.mjs
//          node tools/sicherheitspruefung.mjs --schreiben   (testet auch Schreibrechte)
//
// ACHTUNG beim Schreibtest: Nachgemessen erlaubt Wix dem Besucher-Token zwar das
// ANLEGEN, aber nicht das Löschen (WDE0027). Jede Sammlung, die sich beschreiben
// lässt, behält also eine Zeile „PRUEFUNG-<Zeitstempel>". Die stehen am Ende noch
// einmal aufgelistet und gehören im Wix-Dashboard von Hand gelöscht.

const SCHLUESSEL = process.env.WIX_CLIENT_ID || '730eceea-23ad-4368-a92f-cd670dd9531d';
const SCHREIBTEST = process.argv.includes('--schreiben');

/**
 * Alle Sammlungen, die im Code vorkommen (ermittelt mit grep über src/, push/,
 * tools/ und build.mjs). Die Einstufung sagt, was erlaubt sein DARF:
 *
 *   oeffentlich    steht ohnehin auf der Website  -> lesen ok
 *   nur-schreiben  nimmt Einsendungen entgegen    -> schreiben ok, lesen NIEMALS
 *   geschlossen    gehört Mitgliedern oder dem Rat -> weder noch
 */
const SAMMLUNGEN = [
  ['UmfragenOeffentlich', 'oeffentlich'],
  ['Unterstuetzung', 'oeffentlich'],
  ['Team', 'oeffentlich'],
  ['Team1', 'oeffentlich'],
  ['Ratsberichte', 'oeffentlich'],
  ['Startseite', 'oeffentlich'],

  ['Anfragen', 'nur-schreiben'],
  ['Buchungen', 'nur-schreiben'],
  ['Abonnenten', 'nur-schreiben'],
  ['Stimmen', 'nur-schreiben'],
  ['Seitenaufrufe', 'nur-schreiben'],
  ['Fragen', 'nur-schreiben'],
  ['Feedback', 'nur-schreiben'],
  ['Ideen', 'nur-schreiben'],
  ['Newsletter', 'nur-schreiben'],

  ['Profile', 'geschlossen'],
  ['AppMitglieder', 'geschlossen'],
  /* Absicht, kein Versehen: Auch Besucher OHNE Anmeldung dürfen Push für
     Beiträge und Termine einschalten (members.js, pushSubscribe: die Themen
     sind `Object.keys(TOPICS).filter(k => me || k !== 'mitglieder')`). Deshalb
     muss die Sammlung Einträge von jedem annehmen - wie ein Formular. Lesen
     bleibt verboten, und alles Interne hängt an einer `memberId` mit
     Rechteprüfung. */
  ['PushSubscriptions', 'nur-schreiben'],
  ['PushLog', 'geschlossen'],
  ['Benachrichtigungen', 'geschlossen'],
  ['Zusagen', 'geschlossen'],
  ['Helferlisten', 'geschlossen'],
  ['Helfer', 'geschlossen'],
  ['Fahrgemeinschaften', 'geschlossen'],
  ['Mitfahrten', 'geschlossen'],
  ['Umfragen', 'geschlossen'],
  ['Dokumente', 'geschlossen'],
  ['Ratsvorbereitung', 'geschlossen'],
  ['Aktionen', 'geschlossen'],
  ['Postfach', 'geschlossen'],
  ['Vorgaenge', 'geschlossen'],
  ['Planungen', 'geschlossen'],
  ['Statistik', 'geschlossen'],
  ['Kalenderlinks', 'geschlossen'],
  ['RatAntraege', 'geschlossen'],
  ['RatAufgaben', 'geschlossen'],
  ['RatDokumente', 'geschlossen'],
  ['RatDateiTeile', 'geschlossen'],
  ['RatGeheim', 'geschlossen'],
  ['RatSchluessel', 'geschlossen'],
  ['Auftraege', 'geschlossen'],
  ['FilmMaterial', 'geschlossen'],
  ['FilmTeile', 'geschlossen'],
];

/** Feldnamen, bei denen es um Personen geht - die sind der Grund für die Prüfung. */
const HEIKEL = /(^|[^a-z])(mail|name|vorname|nachname|telefon|handy|adresse|strasse|straße|plz|wohnort|geburt|iban|passwort|token|schluessel|endpoint|auth)([^a-z]|$)/i;
// „ort" allein stand hier vorher und traf „shortDescription" - ein Fehlalarm.
// Deshalb jetzt mit Wortgrenzen und „wohnort" statt „ort".

async function besucherToken() {
  const r = await fetch('https://www.wixapis.com/oauth2/token', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({clientId: SCHLUESSEL, grantType: 'anonymous'}),
  });
  if (!r.ok) throw new Error(`Kein Besucher-Token (${r.status}) - Schlüssel prüfen`);
  return (await r.json()).access_token;
}

async function lesen(token, sammlung) {
  const r = await fetch('https://www.wixapis.com/wix-data/v2/items/query', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Authorization: token},
    body: JSON.stringify({dataCollectionId: sammlung, query: {paging: {limit: 3}}}),
  });
  if (!r.ok) return {erlaubt: false, code: r.status};
  const j = await r.json();
  const zeilen = j.dataItems || [];
  const felder = new Set();
  for (const z of zeilen) for (const k of Object.keys(z.data || {})) felder.add(k);
  return {
    erlaubt: true,
    anzahl: zeilen.length,
    felder: [...felder].filter(f => !f.startsWith('_')),
  };
}

async function schreiben(token, sammlung) {
  const marke = `PRUEFUNG-${Date.now()}`;
  const r = await fetch('https://www.wixapis.com/wix-data/v2/items', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', Authorization: token},
    body: JSON.stringify({dataCollectionId: sammlung, dataItem: {data: {title: marke, status: 'pruefung'}}}),
  });
  return {erlaubt: r.ok, code: r.status, marke: r.ok ? marke : null};
}

const token = await besucherToken();
console.log(`Besucher-Token geholt mit dem öffentlichen Schlüssel ${SCHLUESSEL.slice(0, 8)}…\n`);

const funde = [];
for (const [sammlung, einstufung] of SAMMLUNGEN) {
  const l = await lesen(token, sammlung);
  let zeile;
  if (!l.erlaubt) {
    zeile = `lesen verweigert (${l.code})`;
  } else {
    const heikel = l.felder.filter(f => HEIKEL.test(f));
    zeile = `LESBAR – ${l.anzahl} Zeile(n) geholt, Felder: ${l.felder.join(', ') || '(keine)'}`;
    if (heikel.length) zeile += `  ⚠ personenbezogen: ${heikel.join(', ')}`;
  }

  // Bewertung gegen die Einstufung
  let urteil = 'ok  ';
  if (l.erlaubt && einstufung !== 'oeffentlich') {
    urteil = 'FUND';
    funde.push({sammlung, was: 'anonym lesbar', felder: l.felder.filter(f => HEIKEL.test(f))});
  }
  console.log(`${urteil} ${sammlung.padEnd(22)} [${einstufung}]  ${zeile}`);

  // Schreibprobe NUR bei Sammlungen, die geschlossen sein sollen. In `Anfragen`,
  // `Buchungen` und `Abonnenten` wird absichtlich von außen geschrieben - eine
  // Testzeile dort löst eine Push-Benachrichtigung beim Vorstand aus, nachts um
  // drei. Dass dort geschrieben werden kann, wissen wir ohnehin.
  if (SCHREIBTEST && einstufung === 'geschlossen') {
    const s = await schreiben(token, sammlung);
    if (s.erlaubt) {
      funde.push({sammlung, was: 'anonym BESCHREIBBAR', marke: s.marke});
      console.log(`FUND ${''.padEnd(22)}   → anonym beschreibbar, Testzeile "${s.marke}" bitte löschen`);
    } else {
      console.log(`     ${''.padEnd(22)}   → schreiben verweigert (${s.code})`);
    }
  }
}

console.log('');
if (!funde.length) {
  console.log('Keine Sammlung offen, die geschlossen sein soll.');
} else {
  console.log(`${funde.length} Fund(e) – das gehört im Wix-Dashboard unter CMS → Sammlung → Berechtigungen geändert:`);
  for (const f of funde) {
    console.log(`  · ${f.sammlung}: ${f.was}` + (f.felder?.length ? ` (u. a. ${f.felder.join(', ')})` : ''));
  }
}
process.exit(funde.length ? 1 : 0);
