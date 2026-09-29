// Probe für den Spam-Filter (src/lib/spam.mjs).
//
// Zwei Fragen, und die zweite ist die wichtigere:
//   1. Fängt er die Bot-Einsendungen vom 29.09.2026?
//   2. Lässt er echte Bürgeranliegen in Ruhe?
//
// Ein übersehenes Anliegen ist ein echter Schaden, eine Spam-Zeile im Eingang
// nur lästig. Deshalb stehen unten deutlich mehr echte Fälle als Bot-Fälle -
// darunter absichtlich die unbequemen: ein Name mit Binnengroßschreibung, ein
// deutsches Wort mit acht Konsonanten am Stück, eine Ein-Wort-Nachricht und
// jemand, der am selben Tag zweimal schreibt.
//
// Aufruf: node tools/spam-probe.mjs
import { bewerten, postfach, zufallszeichen } from '../src/lib/spam.mjs';

const stunde = 3600 * 1000;
const jetzt = Date.now();

/** Die beiden echten Einsendungen aus dem Eingang, Wort für Wort. */
const BOT = [
  {
    _id: 'b1', _createdDate: new Date(jetzt).toISOString(),
    typ: 'kontakt', thema: 'Straßen & Verkehr',
    name: 'uYzEzVwfKYFdFbAcwJrxEPV',
    email: 'z.it.a.miz1.2.2@gmail.com',
    ort: 'TvLWpYquWcUOdwRwJltCpsKr',
    nachricht: 'yjexRLpQeOwzkzkKFPzit',
  },
  {
    _id: 'b2', _createdDate: new Date(jetzt + 4000).toISOString(),
    typ: 'mitglied',
    name: 'gkIWeFjYsSfntuNLGtbjjh',
    email: 'z.it.a.miz1.2.2@gmail.com',
    ort: 'UZEocbHHfFVhCYbu',
    nachricht: 'CdWBnOoLWFEsoiMf',
  },
];

/** Erfundene, aber realistische Anliegen - die müssen durchkommen. */
const ECHT = [
  {
    _id: 'e1', _createdDate: new Date(jetzt).toISOString(),
    name: 'Peter Müller', email: 'p.mueller@t-online.de', ort: 'Walsroder Straße',
    nachricht: 'Die Straße vor unserem Haus ist seit Monaten aufgerissen. Wann geht es da weiter?',
  },
  {
    _id: 'e2', _createdDate: new Date(jetzt).toISOString(),
    name: 'Anne-Katrin Schröder-Wittenberg', email: 'ak.schroeder@gmx.de', ort: 'Wolterdingen',
    nachricht: 'Ich würde gern im Ortsverein mitmachen. Wen spreche ich am besten an?',
  },
  {
    // Binnengroßschreibung im Namen - der Grund, warum die Regel vier Wechsel verlangt
    _id: 'e3', _createdDate: new Date(jetzt).toISOString(),
    name: 'Fiona McDonald', email: 'fiona.mcdonald@gmail.com', ort: 'Soltau',
    nachricht: 'Gibt es in Soltau noch freie Kita-Plätze für das kommende Jahr?',
  },
  {
    // Deutsches Wort mit acht Konsonanten am Stück
    _id: 'e4', _createdDate: new Date(jetzt).toISOString(),
    name: 'Hans-Jürgen Angstschweiß', email: 'hj.a@web.de', ort: 'Bispingen',
    nachricht: 'Mich interessiert die Wiederholungsprüfung der Spielplätze.',
  },
  {
    // Knappe Nachricht aus einem einzigen Wort
    _id: 'e5', _createdDate: new Date(jetzt).toISOString(),
    name: 'M. Ahlers', email: 'ahlers@posteo.de', ort: 'Dorfmark',
    nachricht: 'Mitgliedsantrag',
  },
  {
    // Derselbe Mensch schreibt am selben Tag zweimal - Kontakt und Mitgliedschaft
    _id: 'e6', _createdDate: new Date(jetzt).toISOString(),
    name: 'Birte Tarnowski', email: 'b.tarnowski@gmail.com', ort: 'Soltau',
    nachricht: 'Wann ist die nächste Ratssitzung öffentlich?',
  },
  {
    _id: 'e7', _createdDate: new Date(jetzt + stunde).toISOString(),
    name: 'Birte Tarnowski', email: 'b.tarnowski@gmail.com', ort: 'Soltau',
    nachricht: 'Nachtrag: Ich würde auch gern dem Ortsverein beitreten.',
  },
  {
    // Jemand schickt einen Link mit - ein Bürger darf das
    _id: 'e8', _createdDate: new Date(jetzt).toISOString(),
    name: 'Klaus Reimers', email: 'k.reimers@freenet.de', ort: 'Soltau',
    nachricht: 'Hier der Artikel, den ich meinte: https://www.soltau.de/aktuelles - bitte ansehen.',
  },
];

let fehler = 0;
const sagen = (gut, text) => { if (!gut) fehler += 1; console.log(`${gut ? 'ok  ' : 'FEHL'} ${text}`); };

console.log('Postfach-Normalisierung');
sagen(postfach('z.it.a.miz1.2.2@gmail.com') === 'zitamiz122@gmail.com',
      'Gmail-Punkte fallen weg  -> ' + postfach('z.it.a.miz1.2.2@gmail.com'));
sagen(postfach('Max.Mustermann+spd@GoogleMail.com') === 'maxmustermann@gmail.com',
      'Plus-Zusatz und googlemail  -> ' + postfach('Max.Mustermann+spd@GoogleMail.com'));
sagen(postfach('p.mueller@t-online.de') === 'p.mueller@t-online.de',
      'anderswo bleiben Punkte stehen  -> ' + postfach('p.mueller@t-online.de'));

console.log('\nEinzelworte');
for (const w of ['uYzEzVwfKYFdFbAcwJrxEPV', 'TvLWpYquWcUOdwRwJltCpsKr', 'gkIWeFjYsSfntuNLGtbjjh']) {
  sagen(zufallszeichen(w), `erkannt als Salat: ${w}`);
}
// Zufallsketten in Kleinschrift - die faengt die Grossschreibungsregel nicht
for (const w of ['qwkjhfdlkjhsdf', 'zzzxcvbnmlkjhg']) {
  sagen(zufallszeichen(w), `erkannt als Salat: ${w}`);
}
// Deutsche Woerter, die meine ersten Schwellen faelschlich gemeldet hatten
for (const w of ['Wolterdingen', 'Schwarmstedt', 'Mitgliedsantrag', 'Ratsentscheidung',
                 'Walsroder', 'Angstschweiss', 'Schwarzschild', 'Fussgaengerzone',
                 'Staedtebaufoerderung', 'Wiederholungspruefung']) {
  sagen(!zufallszeichen(w), `nicht als Salat: ${w}`);
}

console.log('\nDie beiden Bot-Einsendungen');
for (const a of BOT) {
  const b = bewerten(a, BOT);
  sagen(b.spam, `${a._id}: ${b.punkte} Punkte – ${b.gruende.join('; ')}`);
}

console.log('\nEchte Anliegen (dürfen NICHT als Spam gelten)');
for (const a of ECHT) {
  const b = bewerten(a, ECHT);
  sagen(!b.spam, `${a._id} ${String(a.name).padEnd(32)} ${b.punkte} Punkte`
    + (b.gruende.length ? ` – ${b.gruende.join('; ')}` : ''));
}

console.log('');
console.log(fehler === 0 ? 'Alle Proben bestanden.' : `${fehler} Probe(n) fehlgeschlagen.`);
process.exit(fehler === 0 ? 0 : 1);
