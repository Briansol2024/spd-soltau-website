// Legt einen Termin direkt bei Wix Events an - für Termine, die von außen kommen
// (Kreisverband, Bundestagsbüro, Partner) und nicht über die App eingetragen werden.
//
//   node tools/termin-anlegen.mjs --titel "…" --datum 2026-10-01 --von 18:00 --bis 20:00 \
//        --ort "Felto Filzwelt" --adresse "Marktstraße 19, 29614 Soltau" --text "…" [--anmeldung <URL>] [--dry]
//
// Ohne --anmeldung wird keine Anmeldung bei uns angeboten; mit --anmeldung führt der Knopf
// zur fremden Anmeldeseite. Die Zeitrechnung ist dieselbe wie im Push-Dienst (push/send.mjs).
import { adminClient, env, log } from '../push/lib.mjs';

const arg = name => {
  const i = process.argv.indexOf('--' + name);
  return i > -1 ? process.argv[i + 1] : '';
};
const DRY = process.argv.includes('--dry');
const ZONE = env.EVENT_TIMEZONE || 'Europe/Berlin';

// Sommer-/Winterzeit sauber umrechnen (gleiche Rechnung wie im Push-Dienst)
const tzOffset = (tz, date) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date);
  const g = t => +parts.find(x => x.type === t).value;
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - date.getTime();
};
const toUtc = (datum, zeit) => {
  const [y, m, d] = datum.split('-').map(Number);
  const [hh, mm] = (zeit || '19:00').split(':').map(Number);
  const grob = new Date(Date.UTC(y, m - 1, d, hh, mm));
  return new Date(grob.getTime() - tzOffset(ZONE, grob));
};

const titel = arg('titel');
const datum = arg('datum');
if (!titel || !datum) {
  console.log('Bitte mindestens --titel und --datum angeben (Datum als 2026-10-01).');
  process.exit(1);
}
const start = toUtc(datum, arg('von') || '19:00');
let ende = toUtc(datum, arg('bis') || '');
if (!arg('bis') || ende <= start) ende = new Date(start.getTime() + 2 * 3600 * 1000);

const ort = arg('ort') || 'Roter Bahnhof';
const adresse = arg('adresse');
const anmeldung = arg('anmeldung');

// Der Bauplan wird für jeden Versuch neu erzeugt: Die Wix-Bibliothek schreibt die Datumsfelder
// beim Senden um, ein zweiter Versuch mit demselben Objekt läuft sonst auf einen Fehler.
const bauplan = art => ({
  title: titel,
  dateAndTimeSettings: { startDate: new Date(start), endDate: new Date(ende), timeZoneId: ZONE },
  location: { type: 'VENUE', name: adresse ? `${ort}, ${adresse}` : ort, locationTbd: false },
  registration: art === 'EXTERNAL' && anmeldung
    ? { initialType: 'EXTERNAL', external: { registration: anmeldung } }
    : { initialType: 'RSVP' },
  shortDescription: (arg('text') || '').slice(0, 250),
});

const zeigen = p => JSON.stringify({ ...p, dateAndTimeSettings: {
  startDate: start.toISOString(), endDate: ende.toISOString(), timeZoneId: ZONE } }, null, 1);
log('Termin:', zeigen(bauplan(anmeldung ? 'EXTERNAL' : 'RSVP')));
log('Kurztext:', (arg('text') || '').length, 'Zeichen');
if (DRY) { log('Trockenlauf - nichts angelegt.'); process.exit(0); }

const client = adminClient();
let ev;
try {
  ev = await client.wixEventsV2.createEvent(bauplan(anmeldung ? 'EXTERNAL' : 'RSVP'), { draft: false });
} catch (e) {
  // Ältere Wix-Schnittstellen kennen die fremde Anmeldeseite nicht - dann mit unserer eigenen Zusage anlegen
  log('Mit fremder Anmeldeseite abgelehnt, nehme unsere Zusage-Funktion.');
  ev = await client.wixEventsV2.createEvent(bauplan('RSVP'), { draft: false });
}
log('angelegt:', ev?._id, '·', ev?.title);
log('Seite:', ev?.eventPageUrl?.base ? ev.eventPageUrl.base + ev.eventPageUrl.path : '(Link kommt nach dem Seitenbau)');
