// Vorschau-Modus des Mitgliederbereichs (/mitglieder/?demo): tut so, als wäre man angemeldet, und arbeitet mit
// Beispieldaten im Speicher – nichts wird bei Wix gespeichert. Damit kann sich der Vorstand alles ansehen,
// bevor die ersten Konten freigeschaltet sind.

const uid = () => 'demo-' + Math.random().toString(36).slice(2, 10);
const iso = (d = new Date()) => d.toISOString();
const daysAgo = n => iso(new Date(Date.now() - n * 864e5));
// Beispiel-Statistik: 70 Tage mit plausiblen, festen Zahlen (kein Zufall, damit die Vorschau immer gleich aussieht)
function statistikDemo() {
  const out = [];
  const seiten = ['/', '/aktuelles/', '/termine/', '/stadtrat-2026/', '/rat-und-rathaus/', '/mitmachen/', '/kontakt/', '/ziele/', '/fraktion/', '/ortsverein/', '/aktuelles/radweg-harber-sanierung/', '/aktuelles/haushalt-2027-was-drin-steckt/', '/roter-bahnhof/', '/mitglieder/'];
  const gew = [30, 12, 10, 9, 8, 5, 4, 4, 3, 3, 5, 4, 2, 6];
  for (let i = 69; i >= 0; i--) {
    const tag = daysAgo(i).slice(0, 10), wd = (new Date(tag + 'T12:00:00').getDay() + 6) % 7;
    const basis = 60 + Math.round(40 * Math.sin(i / 5)) + (wd >= 5 ? -15 : 0) + (i < 3 ? 120 : 0) + (i === 17 ? 90 : 0);
    const aufrufe = Math.max(20, basis), besuche = Math.round(aufrufe * 0.55);
    const s = {}; const g = gew.reduce((a, b) => a + b, 0); seiten.forEach((p, k) => { s[p] = Math.round(aufrufe * gew[k] / g); });
    const stunden = Array.from({ length: 24 }, (_, h) => Math.round(aufrufe * [1, 0, 0, 0, 0, 1, 2, 4, 5, 5, 5, 5, 6, 5, 4, 4, 5, 6, 8, 9, 8, 6, 4, 2][h] / 100));
    out.push({ _id: 'demo-st-' + tag, tag, title: tag, aufrufe, besuche, daten: JSON.stringify({ aufrufe, besuche, app: Math.round(aufrufe * 0.12), seiten: s, quellen: { direkt: Math.round(besuche * 0.42), 'google.com': Math.round(besuche * 0.3), 'instagram.com': Math.round(besuche * 0.16), 'facebook.com': Math.round(besuche * 0.07), 'spd-heidekreis.de': Math.round(besuche * 0.05) }, geraete: { handy: Math.round(aufrufe * 0.66), pc: Math.round(aufrufe * 0.3), tablet: Math.round(aufrufe * 0.04) }, sprachen: { de: Math.round(aufrufe * 0.95), en: Math.round(aufrufe * 0.03), tr: Math.round(aufrufe * 0.02) }, stunden, ereignisse: { instagram: Math.round(aufrufe * 0.05), 'kalender-abo': i % 4 === 0 ? 1 : 0, 'formular:Anfragen': i % 9 === 0 ? 1 : 0, 'formular:Abonnenten': i % 6 === 0 ? 1 : 0, mitgliederbereich: Math.round(aufrufe * 0.06), 'umfrage:stimme': Math.round(aufrufe * 0.04), 'app-installiert': i % 12 === 0 ? 1 : 0 }, lade: { summe: aufrufe * (900 + (i % 7) * 60), n: aufrufe } }) });
  }
  return out;
}
const inDays = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

// rolle: 'vorstand' (alles), 'rat' (Ratsmitglied: Gruppen Rat + Fraktion, keine Vorstandsrechte) oder 'mitglied' (keine Rollen, keine Rechte)
export function makeDemoClient(SPD, { rolle = 'vorstand', mitglied = false } = {}) {
  if (mitglied) rolle = 'mitglied';
  const ichVorstand = rolle === 'vorstand', ichRat = rolle === 'rat';
  mitglied = !ichVorstand; // Max ist kein Vorstand: Einstellungen stammen dann von people[1]
  const ME = 'demo-me';
  const pool = [...(SPD.vorstand || []), ...(SPD.rat || []), ...(SPD.fraktion || [])].map(p => p.name).filter(Boolean);
  const names = [...new Set(pool)].filter(n => !/max mustermann/i.test(n)).slice(0, 14);
  if (!names.length) names.push('Birhat Kaçar', 'Manuela Bartels', 'Inna Herold', 'Reiner Klatt', 'Karin Ruland', 'Harald Garbers');
  while (names.length < 14) names.push('Mitglied ' + (names.length + 1)); // Beispieldaten brauchen 5 Vorstand + 6 Rat + 3 weitere
  const people = ['Max Mustermann', ...names].map((name, i) => ({ _id: uid(), memberId: i === 0 ? ME : 'demo-m' + i, name, vorstand: i < 5 && !(mitglied && i === 0), rollen: i === 0 ? (ichVorstand ? ['Vorstandsmitglied'] : ichRat ? ['Ratsmitglied'] : ['Mitglied']) : i < 5 ? ['Vorstandsmitglied'] : i < 11 ? ['Ratsmitglied'] : ['Mitglied'], pushAktiv: i % 3 !== 1, status: 'aktiv', title: name }));
  const ids = people.map(p => p.memberId);
  const OWNER = mitglied ? ids[1] : ME; // wer die Einstellungen gespeichert hat (muss zum Vorstand gehören)
  const VON = mitglied ? people[1].name : 'Max Mustermann';
  // Zwei Demo-Termine nur im Speicher: Infostand am nächsten Samstag und die Mitgliederversammlung in drei Wochen –
  // daran hängen Helferliste, Zusagen und Fahrgemeinschaften, und die Versammlung passt zum Termin
  const lokal = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const naechsterSamstag = () => { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); return lokal(d); };
  const demoEvents = [
    { id: 'demo-ev-infostand', slug: 'infostand-wochenmarkt', date: naechsterSamstag(), title: 'Infostand auf dem Wochenmarkt', ort: 'Marktplatz', zeit: '09:00 Uhr', typ: 'Öffentlich', info: 'Wir sind mit Zelt, Kaffee und offenen Ohren auf dem Wochenmarkt. Kommt vorbei!', url: null, demo: true },
    { id: 'demo-ev-mv', slug: 'mitgliederversammlung', date: inDays(21), title: 'Mitgliederversammlung', ort: 'Roter Bahnhof, Am Bahnhof 1t', zeit: '19:00 Uhr', typ: 'Mitglieder', info: 'Bericht des Vorstands, Kassenbericht, Anträge – Abstimmung per Handy in der App.', url: null, demo: true },
  ];
  if (Array.isArray(SPD.events) && !SPD.events.some(e => e.demo)) { SPD.events.push(...demoEvents); SPD.events.sort((a, b) => String(a.date).localeCompare(String(b.date))); }
  // Beispieldaten hängen an öffentlichen Terminen, damit sie auch für normale Mitglieder sichtbar sind
  const ev = (SPD.events || []).slice(0, 8);
  const pub = ev.filter(e => e.typ === 'Öffentlich' || e.typ === 'Rat');
  const e0 = pub.find(e => e.typ === 'Rat') || pub.find(e => !e.demo) || pub[0] || ev[0] || { // Sitzung: Zusagen und Fahrgemeinschaften
    id: 'ev-demo-1', title: 'Fraktionssitzung', date: inDays(5), zeit: '19:00 Uhr', ort: 'Altes Rathaus', typ: 'Fraktion' };
  const e1 = pub.find(e => /markt|stammtisch|fest/i.test(e.title)) || pub[1] || e0;

  const data = {
    AppMitglieder: people,
    Benachrichtigungen: [
      { _id: uid(), _owner: OWNER, _createdDate: daysAgo(3), thema: 'registrierung', empfaenger: mitglied ? [ids[1], ids[2]] : [ME, ids[1]], namen: mitglied ? [people[1].name, people[2].name] : ['Max Mustermann', people[1].name], von: VON },
      { _id: uid(), _owner: OWNER, _createdDate: daysAgo(3), thema: 'recht:umfragen', empfaenger: mitglied ? [ids[1], ids[2]] : [ME, ids[1], ids[2]], namen: mitglied ? [people[1].name, people[2].name] : ['Max Mustermann', people[1].name, people[2].name], von: VON },
      { _id: uid(), _owner: OWNER, _createdDate: daysAgo(4), thema: 'gruppe:rat', empfaenger: [...(ichVorstand || ichRat ? [ME] : []), ...ids.slice(5, 11)], namen: [...(ichVorstand || ichRat ? ['Max Mustermann'] : []), ...people.slice(5, 11).map(p => p.name)], von: VON },
      { _id: uid(), _owner: OWNER, _createdDate: daysAgo(4), thema: 'gruppe:fraktion', empfaenger: [ids[2], ...ids.slice(11, 13)], namen: [people[2], ...people.slice(11, 13)].map(p => p.name), von: VON },
      { _id: uid(), _owner: OWNER, _createdDate: daysAgo(2), thema: 'sicht:rat', modus: 'gruppen', gruppen: ['fraktion'], empfaenger: ids.slice(13, 14), namen: people.slice(13, 14).map(p => p.name), von: VON },
      { _id: uid(), _owner: OWNER, _createdDate: daysAgo(3), thema: 'whatsapp', empfaenger: [], gruppen: [{ name: 'SPD Soltau – Mitglieder', url: 'https://chat.whatsapp.com/BEISPIEL1' }, { name: 'Ratsfraktion', url: 'https://chat.whatsapp.com/BEISPIEL2' }], von: VON },
    ],
    Zusagen: [
      ...(ev.find(e => /stammtisch/i.test(e.title)) ? [{ _id: uid(), _owner: ME, eventId: ev.find(e => /stammtisch/i.test(e.title)).id, eventTitel: 'Stammtisch', eventDatum: ev.find(e => /stammtisch/i.test(e.title)).date, status: 'zusage', grund: '', memberId: ME, name: 'Max Mustermann', _createdDate: daysAgo(1) }] : []),
      { _id: uid(), _owner: ids[1], eventId: e0.id, eventTitel: e0.title, eventDatum: e0.date, status: 'zusage', grund: '', memberId: ids[1], name: people[1].name, _createdDate: daysAgo(2) },
      { _id: uid(), _owner: ids[2], eventId: e0.id, eventTitel: e0.title, eventDatum: e0.date, status: 'zusage', grund: '', memberId: ids[2], name: people[2].name, _createdDate: daysAgo(1) },
      { _id: uid(), _owner: ids[3], eventId: e0.id, eventTitel: e0.title, eventDatum: e0.date, status: 'absage', grund: 'Spätschicht', memberId: ids[3], name: people[3].name, _createdDate: daysAgo(1) },
      { _id: uid(), _owner: ids[4], eventId: e1.id, eventTitel: e1.title, eventDatum: e1.date, status: 'zusage', grund: '', memberId: ids[4], name: people[4].name, _createdDate: daysAgo(1) },
      ...[2, 3].map(i => ({ _id: uid(), _owner: ids[i], eventId: 'demo-ev-infostand', eventTitel: 'Infostand auf dem Wochenmarkt', eventDatum: demoEvents[0].date, status: 'zusage', grund: '', memberId: ids[i], name: people[i].name, _createdDate: daysAgo(2) })),
      ...[1, 2, 5, 6, 8, 11].map(i => ({ _id: uid(), _owner: ids[i], eventId: 'demo-ev-mv', eventTitel: 'Mitgliederversammlung', eventDatum: demoEvents[1].date, status: 'zusage', grund: '', memberId: ids[i], name: people[i].name, _createdDate: daysAgo(1) })),
      { _id: uid(), _owner: ids[3], eventId: 'demo-ev-mv', eventTitel: 'Mitgliederversammlung', eventDatum: demoEvents[1].date, status: 'absage', grund: 'Urlaub', memberId: ids[3], name: people[3].name, _createdDate: daysAgo(1) },
    ],
    Umfragen: [
      ...(ev.find(e => /stammtisch/i.test(e.title)) ? [{ _id: 'demo-u5', _owner: OWNER, _createdDate: daysAgo(1), frage: 'Wo treffen wir uns am ' + new Date(ev.find(e => /stammtisch/i.test(e.title)).date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit' }) + '?', beschreibung: 'Die Umfrage sehen nur die, die zugesagt haben. Sie schließt am Tag des Treffens.', optionen: ["Alexander's (Wilhelmstraße 2)", 'Hildes Café & Shop (Frielingen 9)', 'Brauhaus Joh. Albrecht (Winsener Straße 34d)', "Meyn's Hotel (Poststraße 19)", 'La Mamma (Unter den Linden 15)'], mehrfach: false, offen: true, endetAm: ev.find(e => /stammtisch/i.test(e.title)).date, eventId: ev.find(e => /stammtisch/i.test(e.title)).id, nurZusagen: true, von: 'App', title: 'Stammtisch' }] : []),
      { _id: 'demo-u1', _owner: OWNER, _createdDate: daysAgo(2), frage: 'Sommerfest am 12. oder 19. Juli?', beschreibung: 'Der Rote Bahnhof ist an beiden Tagen frei.', optionen: ['12. Juli', '19. Juli', 'Mir egal'], mehrfach: false, offen: true, endetAm: inDays(6), von: VON, title: 'Sommerfest' },
      { _id: 'demo-u4', _owner: ids[1], _createdDate: daysAgo(1), frage: 'Welche Aktionen wünschst du dir 2027?', beschreibung: 'Mehrfachauswahl möglich.', optionen: ['Infostände', 'Haustürgespräche', 'Themenabende', 'Ausflug'], mehrfach: true, offen: true, endetAm: inDays(14), von: VON, title: 'Aktionen 2027' },
      { _id: 'demo-u2', _owner: ids[1], _createdDate: daysAgo(20), frage: 'Welche Themen sollen wir 2027 in den Vordergrund stellen?', beschreibung: '', optionen: ['Kita & Schule', 'Verkehr & Bahn', 'Wohnen', 'Ortschaften'], mehrfach: true, offen: false, endetAm: daysAgo(5).slice(0, 10), von: people[1].name, title: 'Themen 2027' },
    ],
    UmfragenOeffentlich: [
      { _id: 'demo-u3', _owner: OWNER, _createdDate: daysAgo(1), frage: 'Was soll die neue Ratsmehrheit zuerst anpacken?', optionen: ['Kita-Plätze', 'Radwege', 'Bahnhofsumfeld', 'Ortschaften stärken'], mehrfach: false, offen: true, endetAm: inDays(10), von: VON, title: 'Umfrage der Woche' },
    ],
    Stimmen: [
      ...ids.slice(1, 9).map((id, i) => ({ _id: uid(), _owner: id, umfrageId: 'demo-u1', auswahl: [i % 3 === 0 ? 1 : 0], memberId: id, _createdDate: daysAgo(1) })),
      ...ids.slice(5, 9).map((id, i) => ({ _id: uid(), _owner: id, umfrageId: 'demo-u5', auswahl: [i % 2], memberId: id, _createdDate: daysAgo(0.5) })),
      ...ids.slice(1, 12).map((id, i) => ({ _id: uid(), _owner: id, umfrageId: 'demo-u2', auswahl: [i % 4, (i + 1) % 4], memberId: id, _createdDate: daysAgo(10) })),
      ...Array.from({ length: 37 }, (_, i) => ({ _id: uid(), _owner: 'demo-v' + i, umfrageId: 'demo-u3', auswahl: [i % 7 === 0 ? 3 : i % 3], memberId: '', _createdDate: daysAgo(0) })),
    ],
    Helferlisten: [
      { _id: 'demo-h1', _owner: OWNER, _createdDate: daysAgo(4), titel: 'Infostand Wochenmarkt', eventId: e1.id, datum: e1.date, ort: 'Marktplatz', beschreibung: 'Aufbau 8:30 Uhr, Stand bis 13 Uhr. Flyer und Zelt sind im Roten Bahnhof.', schichten: [{ id: 's1', zeit: '08:30–10:30', plaetze: 2 }, { id: 's2', zeit: '10:30–13:00', plaetze: 3 }], von: VON, title: 'Infostand Wochenmarkt' },
      { _id: 'demo-h2', _owner: ids[1], _createdDate: daysAgo(2), titel: 'Plakate abhängen', eventId: '', datum: inDays(3), ort: 'Treffpunkt Roter Bahnhof', beschreibung: 'Zwei Autos mit Anhänger wären super.', schichten: [{ id: 's1', zeit: '17:00–19:00', plaetze: 6 }], von: people[1].name, title: 'Plakate abhängen' },
    ],
    Helfer: [
      { _id: uid(), _owner: ids[2], listeId: 'demo-h1', schichtId: 's1', memberId: ids[2], name: people[2].name },
      { _id: uid(), _owner: ids[3], listeId: 'demo-h1', schichtId: 's2', memberId: ids[3], name: people[3].name },
      { _id: uid(), _owner: ids[5], listeId: 'demo-h2', schichtId: 's1', memberId: ids[5], name: people[5].name },
      { _id: uid(), _owner: ids[6], listeId: 'demo-h2', schichtId: 's1', memberId: ids[6], name: people[6].name },
    ],
    Dokumente: [
      { _id: uid(), _owner: OWNER, _createdDate: daysAgo(6), titel: 'Protokoll Vorstandssitzung 09/2026', kategorie: 'Protokoll', datum: daysAgo(8).slice(0, 10), url: 'https://www.spd-soltau.de/', beschreibung: 'Beschlüsse zur Website, Sommerfest, Haushalt.', von: VON, title: 'Protokoll Vorstandssitzung 09/2026' },
      { _id: uid(), _owner: ids[1], _createdDate: daysAgo(30), titel: 'Antrag: Sanierung Radweg Harber', kategorie: 'Antrag', datum: daysAgo(31).slice(0, 10), url: 'https://www.spd-soltau.de/', beschreibung: 'Antrag der Fraktion an den Bauausschuss.', von: people[1].name, title: 'Antrag: Sanierung Radweg Harber' },
      { _id: uid(), _owner: OWNER, _createdDate: daysAgo(40), titel: 'Satzung des Ortsvereins', kategorie: 'Sonstiges', datum: '2024-03-01', url: 'https://www.spd-soltau.de/', beschreibung: '', von: VON, title: 'Satzung des Ortsvereins' },
    ],
    Ratsvorbereitung: [
      { _id: uid(), _owner: ids[1], _createdDate: daysAgo(1), sitzung: inDays(12), gremium: 'Rat der Stadt Soltau', titel: 'Konstituierende Sitzung', link: 'https://www.soltau.de/', tops: [
        { nr: '3', titel: 'Wahl der stellvertretenden Bürgermeister*innen', position: 'dafür', einordnung: 'Wir schlagen Birhat Kaçar vor.' },
        { nr: '5', titel: 'Besetzung der Ausschüsse', position: 'offen', einordnung: 'Verteilung nach Hare/Niemeyer – Details in der Fraktionssitzung.' },
        { nr: '7', titel: 'Haushaltssatzung 2027 – Einbringung', position: 'offen', einordnung: 'Erst Einbringung, Beschluss im Dezember.', redner: people[5].name, diskussion: 'Kämmerei fragt nach Prioritäten – wir nennen Kita, Radwege, Marktstraße.' },
      ], von: people[1].name, title: 'Konstituierende Sitzung', typ: 'Rat', ort: 'Alte Reithalle' },
      { _id: uid(), _owner: ids[1], _createdDate: daysAgo(3), sitzung: inDays(5), typ: 'Vorstand', gremium: 'Vorstandssitzung', titel: 'Sommerfest und Website', ort: 'Roter Bahnhof', zeit: '19:00', tops: [
        { nr: '1', titel: 'Sommerfest 2027 – Termin', position: 'offen', einordnung: 'Vorschlag: 19. Juni, Rote-Bahnhof-Wiese.', redner: 'Max', diskussion: '', ergebnis: '' },
        { nr: '2', titel: 'Website: neue Bereiche im Mitgliederbereich', position: 'dafür', einordnung: 'Jahresplan und Ideen freischalten.', redner: 'Brian', diskussion: 'Alle wollen die Sitzungsmodus-Ansicht ausprobieren.', ergebnis: '' },
      ], von: people[1].name, title: 'Vorstandssitzung' },
      { _id: uid(), _owner: ids[1], _createdDate: daysAgo(40), sitzung: daysAgo(10).slice(0, 10), typ: 'Rat', gremium: 'Rat der Stadt Soltau', titel: 'Marktstraße', ort: 'Alte Reithalle', zeit: '18:00', tops: [
        { nr: '9', titel: 'Sanierung Marktstraße – Bauabschnitt 1', position: 'dafür', einordnung: 'Mit unserem Änderungsantrag: zwölf zusätzliche Bäume.', redner: people[5].name, diskussion: 'Fraktion einstimmig dafür, Bäume als Bedingung.', ergebnis: 'Beschlossen 21:8 – Änderungsantrag angenommen.' },
        { nr: '10', titel: 'Vergnügungssteuer – Änderung', position: 'dagegen', einordnung: 'Belastet kleine Vereine.', redner: people[6].name, diskussion: '', ergebnis: 'Abgelehnt mit 14:15.' },
      ], von: people[1].name, title: 'Rat der Stadt Soltau' },
    ],
    Profile: [
      { _id: uid(), _owner: ME, memberId: ME, name: 'Max Mustermann', verzeichnisSichtbar: true, ort: 'Kernstadt', telefon: '', telefonSichtbar: false, emailSichtbar: true, email: 'weber.soltau@gmail.com', geburtstag: '', geburtstagSichtbar: false, eintritt: 2019, fahreAb: 'Kernstadt' },
      { _id: uid(), _owner: ids[1], memberId: ids[1], name: people[1].name, verzeichnisSichtbar: true, ort: 'Kernstadt', telefon: '0171 0000000', telefonSichtbar: true, emailSichtbar: false, geburtstag: inDays(3).slice(5), geburtstagSichtbar: true, eintritt: 2001 },
      { _id: uid(), _owner: ids[2], memberId: ids[2], name: people[2].name, verzeichnisSichtbar: true, ort: 'Harber', telefon: '', telefonSichtbar: false, emailSichtbar: true, email: 'beispiel@example.com', geburtstag: inDays(20).slice(5), geburtstagSichtbar: true, eintritt: 2016 },
      { _id: uid(), _owner: ids[4], memberId: ids[4], name: people[4].name, verzeichnisSichtbar: false, ort: 'Wolterdingen', telefon: '', telefonSichtbar: false, emailSichtbar: false, geburtstag: '', geburtstagSichtbar: false, eintritt: 1986 },
      ...ids.slice(5, 10).map((id, i) => ({ _id: uid(), _owner: id, memberId: id, name: people[5 + i].name, verzeichnisSichtbar: i !== 2, ort: ['Kernstadt', 'Harber', 'Wolterdingen', 'Tetendorf', 'Ahlften'][i], telefon: '', telefonSichtbar: false, emailSichtbar: false, geburtstag: '', geburtstagSichtbar: false, eintritt: 2005 + i })),
    ],
    // Ratsarbeit (Fraktion): in der Vorschau unverschlüsselt – in der App liegen `daten` verschlüsselt bei Wix
    RatAufgaben: (() => {
      const R = (n, b, titel, wer, frist, status = 'offen', notiz = '', von = 1) => ({ _id: 'demo-t' + n, _owner: ids[von], _createdDate: daysAgo(n), b, status, frist, wer, werNamen: wer.map(id => people.find(p => p.memberId === id)?.name || ''), von: ids[von], vonName: people[von].name, daten: JSON.stringify({ titel, notiz }), erinnert: false, erledigtAm: status === 'erledigt' ? daysAgo(1) : '' });
      const r = i => ids[5 + i];
      return [
        R(1, 'stadt', 'Fragen an die Kämmerei zum Haushalt 2027 schicken', [r(0)], inDays(6)),
        R(2, 'stadt', 'Ortsbegehung Marktstraße – Termin finden', [r(1), ME], inDays(10), 'offen', 'Vorschlag: Samstagvormittag.'),
        R(3, 'stadt', 'Änderungsantrag „Mehr Bäume in der Marktstraße“ schreiben', [ME], inDays(12), 'offen', 'Antragstext bis Freitag, dann an die Fraktion.'),
        R(4, 'stadt', 'Bericht aus dem Ausschuss schreiben', [r(2)], inDays(-1)),
        R(5, 'rat', 'Protokoll Fraktionssitzung hochladen', [r(3)], inDays(-2), 'erledigt'),
        R(6, 'rat', 'Rednerliste für die Haushaltsdebatte abstimmen', [r(4), ME], inDays(14)),
        R(7, 'soziales', 'Kita-Bedarfsplanung lesen und Fragen notieren', [r(5), r(1)], inDays(8)),
        R(8, 'wirtschaft', 'Termin mit der Wirtschaftsförderung vorbereiten', [r(0), r(2)], inDays(5)),
        R(9, 'schule', 'Fragen zur Ganztags-Vorlage sammeln', [r(2)], inDays(9)),
        R(10, 'rat', 'Pressemitteilung zur Ratssitzung freigeben', [r(4)], inDays(-5), 'erledigt'),
      ];
    })(),
    RatDokumente: [
      { _id: 'demo-d1', _owner: ids[8], _createdDate: daysAgo(1), b: 'rat', kat: 'Protokoll', art: 'datei', von: ids[8], vonName: people[8].name, daten: JSON.stringify({ titel: 'Protokoll Fraktionssitzung', name: 'Protokoll-Fraktion.pdf', typ: 'application/pdf' }), dateiId: '', teile: 0, groesse: 240000 },
      { _id: 'demo-d2', _owner: ids[7], _createdDate: daysAgo(4), b: 'stadt', kat: 'Bericht', art: 'datei', von: ids[7], vonName: people[7].name, daten: JSON.stringify({ titel: 'Bericht Ausschuss Stadtentwicklung', name: 'Bericht-Stadtentwicklung.pdf', typ: 'application/pdf' }), dateiId: '', teile: 0, groesse: 1100000 },
      { _id: 'demo-d3', _owner: ids[5], _createdDate: daysAgo(6), b: 'stadt', kat: 'Vorlage', art: 'link', von: ids[5], vonName: people[5].name, daten: JSON.stringify({ titel: 'Vorlage Haushalt 2027 (Bürgerinfosystem)', url: 'https://ris.stadt-soltau.de/bi/infobi.asp' }) },
      { _id: 'demo-d4', _owner: ids[9], _createdDate: daysAgo(30), b: 'rat', kat: 'Sonstiges', art: 'datei', von: ids[9], vonName: people[9].name, daten: JSON.stringify({ titel: 'Geschäftsordnung des Rates', name: 'Geschaeftsordnung.pdf', typ: 'application/pdf' }), dateiId: '', teile: 0, groesse: 320000 },
      { _id: 'demo-d5', _owner: ids[10], _createdDate: daysAgo(3), b: 'soziales', kat: 'Vorlage', art: 'datei', von: ids[10], vonName: people[10].name, daten: JSON.stringify({ titel: 'Kita-Bedarfsplanung 2027 (Entwurf)', name: 'Kita-Bedarfsplanung.pdf', typ: 'application/pdf' }), dateiId: '', teile: 0, groesse: 2400000 },
    ],
    RatAntraege: [
      { _id: 'demo-a1', _owner: ME, _createdDate: daysAgo(2), b: 'stadt', status: 'abstimmung', gremium: 'Rat der Stadt Soltau', sitzung: inDays(12), von: ME, vonName: 'Max Mustermann', zustimmung: [ids[5], ids[6], ids[7]], daten: JSON.stringify({ titel: 'Mehr Bäume in der Marktstraße', beschluss: 'Der Rat der Stadt Soltau beschließt, im Zuge der Sanierung der Marktstraße mindestens zwölf zusätzliche Straßenbäume zu pflanzen und die Verwaltung zu beauftragen, dafür Fördermittel des Landes zu prüfen.', begruendung: 'Die Marktstraße heizt sich im Sommer stark auf. Bäume spenden Schatten, verbessern das Kleinklima und machen die Innenstadt attraktiver – für Anwohner wie für den Einzelhandel.' }) },
      { _id: 'demo-a2', _owner: ids[5], _createdDate: daysAgo(20), b: 'soziales', status: 'eingereicht', gremium: 'Sozialausschuss', sitzung: inDays(30), von: ids[5], vonName: people[5].name, zustimmung: [ME, ids[5], ids[6], ids[7], ids[8]], eingereichtAm: daysAgo(3), daten: JSON.stringify({ titel: 'Kita-Bedarfsplanung jährlich fortschreiben', beschluss: 'Die Verwaltung wird beauftragt, die Kita-Bedarfsplanung jährlich fortzuschreiben und dem Sozialausschuss jeweils im ersten Quartal vorzulegen.', begruendung: 'Nur mit aktuellen Zahlen lassen sich Plätze rechtzeitig schaffen.' }) },
    ],
    RatDateiTeile: [], RatSchluessel: [],
    // Anliegen (Vorgänge) – in der App verschlüsselt, hier offen
    Vorgaenge: [
      { _id: 'demo-vg1', _createdDate: daysAgo(0.2), typ: 'registrierung', key: 'demo-in-1', status: 'offen', zustaendig: '', zustaendigName: '', daten: JSON.stringify({ title: 'Neue Registrierungsanfrage', body: 'Nina Beispiel (nina@example.com) möchte in den Mitgliederbereich.', details: { Name: 'Nina Beispiel', 'E-Mail': 'nina@example.com', Registriert: 'heute, 09:12 Uhr' }, payload: { memberId: 'demo-neu', name: 'Nina Beispiel' } }) },
      { _id: 'demo-vg2', _createdDate: daysAgo(0.4), typ: 'buchung', key: 'demo-in-2', status: 'offen', zustaendig: ids[1], zustaendigName: people[1].name, daten: JSON.stringify({ title: 'Buchungsanfrage Roter Bahnhof', body: 'TSV Soltau (Jugendabteilung): 10.10.2026 18:00–21:00 Uhr – Elternabend', details: { Name: 'Petra Muster', 'Verein/Gruppe': 'TSV Soltau', Wann: '10.10.2026 18:00–21:00 Uhr', Anlass: 'Elternabend', Personen: '25', 'E-Mail': 'petra@example.com', Telefon: '05191 000000' }, payload: { buchungId: 'demo-b1' } }) },
      { _id: 'demo-vg3', _createdDate: daysAgo(3), typ: 'anfrage', key: 'demo-in-4', status: 'in Arbeit', zustaendig: ME, zustaendigName: 'Max Mustermann', notiz: JSON.stringify({ text: 'Mit Lea telefoniert – kommt zum nächsten Stammtisch.' }), daten: JSON.stringify({ title: 'Mitgliedsantrag über die Website', body: 'Lea Neumann möchte SPD-Mitglied werden.', details: { Art: 'Mitglied werden', Name: 'Lea Neumann', 'E-Mail': 'lea@example.com', Telefon: '0170 0000000', Nachricht: 'Ich bin neu in Soltau und möchte mich einbringen.' }, payload: { anfrageId: 'demo-a2' } }) },
      { _id: 'demo-vg4', _createdDate: daysAgo(9), typ: 'anfrage', key: 'demo-in-3', status: 'beantwortet von Max Mustermann', erledigtAm: daysAgo(6), zustaendig: ME, zustaendigName: 'Max Mustermann', daten: JSON.stringify({ title: 'Anfrage über die Website', body: 'Wann wird der Radweg nach Harber saniert?', details: { Art: 'Kontakt', Thema: 'Verkehr', Name: 'Peter Beispiel', 'E-Mail': 'peter@example.com' }, payload: { anfrageId: 'demo-a1' } }) },
    ],
    Ideen: [
      { _id: 'demo-i1', _owner: ids[12], _createdDate: daysAgo(1), titel: 'Trinkwasserspender auf dem Marktplatz', text: 'Im Sommer wäre das für Familien und ältere Leute super.', von: ids[12], vonName: people[12].name, status: 'neu', likes: [ids[5], ids[6], ME] },
      { _id: 'demo-i2', _owner: ids[13], _createdDate: daysAgo(5), titel: 'Mehr Bänke am Böhme-Ufer', text: '', von: ids[13], vonName: people[13].name, status: 'aufgegriffen', likes: [ids[7]], antwort: 'Nehmen wir in den Bauausschuss mit – Kosten werden geprüft.' },
      { _id: 'demo-i3', _owner: ids[6], _createdDate: daysAgo(20), titel: 'Nachtbus am Wochenende nach Munster', text: 'Viele Jugendliche kommen abends nicht nach Hause.', von: ids[6], vonName: people[6].name, status: 'antrag', likes: [ids[5], ids[8], ids[9], ids[10]] },
    ],
    Versammlungen: [
      { _id: 'demo-vs0', _owner: OWNER, _createdDate: daysAgo(14), titel: 'Außerordentliche Mitgliederversammlung', datum: inDays(0), zeit: '19:00', ort: 'Roter Bahnhof, Am Bahnhof 1t', status: 'laeuft', tops: JSON.stringify(['Begrüßung', 'Sommerfest 2027', 'Stammtisch', 'Verschiedenes']), antraege: JSON.stringify([{ id: 'z1', titel: 'Sommerfest 2027 am 19. Juni', text: 'Der Ortsverein richtet am 19. Juni 2027 ein Sommerfest auf der Wiese am Roten Bahnhof aus. Der Vorstand wird beauftragt, ein Programm vorzubereiten.', status: 'abstimmung' }, { id: 'z2', titel: 'Stammtisch: erstes Getränk geht auf den Ortsverein', text: 'Für neue Mitglieder beim ersten Besuch.', status: 'offen' }]), anwesend: ids.slice(1, 10), protokoll: '', von: VON },
      { _id: 'demo-vs1', _owner: OWNER, _createdDate: daysAgo(10), titel: 'Mitgliederversammlung 2026', datum: inDays(21), zeit: '19:00', ort: 'Roter Bahnhof, Am Bahnhof 1t', status: 'geplant', tops: JSON.stringify(['Begrüßung', 'Bericht des Vorstands', 'Kassenbericht und Entlastung', 'Anträge', 'Verschiedenes']), antraege: JSON.stringify([{ id: 'x1', titel: 'Roter Bahnhof: neue Bestuhlung', text: 'Der Ortsverein stellt 1.500 € für neue Stühle bereit.', status: 'offen' }, { id: 'x2', titel: 'Stammtisch monatlich', text: 'Der Stammtisch findet künftig jeden dritten Freitag statt.', status: 'offen' }]), anwesend: [], protokoll: '', von: VON },
      { _id: 'demo-vs2', _owner: OWNER, _createdDate: daysAgo(200), titel: 'Mitgliederversammlung 2025', datum: daysAgo(190).slice(0, 10), zeit: '19:00', ort: 'Roter Bahnhof', status: 'beendet', tops: JSON.stringify(['Begrüßung', 'Bericht des Vorstands', 'Wahlen', 'Verschiedenes']), antraege: JSON.stringify([{ id: 'y1', titel: 'Website neu aufsetzen', text: 'Die Website wird bis zur Kommunalwahl neu gebaut.', status: 'angenommen', ergebnis: { ja: 18, nein: 1, enth: 2, n: 21 } }]), anwesend: ids.slice(0, 12), protokoll: 'Protokoll: Mitgliederversammlung 2025\nAnwesend: 21 Mitglieder\nBeschlüsse: Website neu aufsetzen – angenommen (18 Ja, 1 Nein, 2 Enthaltungen)', von: VON },
    ],
    Abstimmungen: ids.slice(1, 7).map((id, i) => ({ _id: uid(), _owner: id, versammlungId: 'demo-vs0', antragId: 'z1', memberId: id, name: people[i + 1].name, stimme: i === 4 ? 'nein' : 'ja', title: `${people[i + 1].name} – Sommerfest 2027 am 19. Juni`, _createdDate: daysAgo(0) })),
    WkStrassen: [
      ...['Marktstraße', 'Poststraße', 'Winsener Straße', 'Wilhelmstraße', 'Bergstraße', 'Lüneburger Straße'].map((st, i) => ({ _id: 'demo-ws' + i, _owner: OWNER, ort: 'Kernstadt', strasse: st, status: ['gespraeche', 'verteilt', 'offen', 'verteilt', 'offen', 'offen'][i], von: i < 4 ? people[1 + (i % 4)].name : '', datum: i < 4 ? daysAgo(3 + i).slice(0, 10) : '', title: st })),
      ...['Dorfstraße', 'Am Sportplatz', 'Heideweg'].map((st, i) => ({ _id: 'demo-wh' + i, _owner: OWNER, ort: 'Harber', strasse: st, status: i === 0 ? 'verteilt' : 'offen', von: i === 0 ? people[2].name : '', datum: i === 0 ? daysAgo(2).slice(0, 10) : '', title: st })),
    ],
    WkPlakate: [
      { _id: 'demo-wp1', _owner: ids[5], _createdDate: daysAgo(4), standort: 'Winsener Straße / Ecke Poststraße, Laterne', status: 'haengt', foto: '', notiz: 'Genehmigung Nr. 12', von: people[5].name, datum: daysAgo(4).slice(0, 10), title: 'Plakat' },
      { _id: 'demo-wp2', _owner: ids[6], _createdDate: daysAgo(6), standort: 'Bahnhofsvorplatz, Zaun', status: 'abgehaengt', foto: '', notiz: '', von: people[6].name, datum: daysAgo(1).slice(0, 10), title: 'Plakat' },
    ],
    Planungen: [
      { _id: 'demo-pl1', _owner: OWNER, _createdDate: daysAgo(30), titel: 'Sommerfest 2027', datum: inDays(260), vorlage: false, von: VON, vonId: OWNER, aufgaben: JSON.stringify([{ id: 'p1', titel: 'Termin und Ort festlegen', faellig: inDays(170), wer: ids[1], werName: people[1].name, erledigt: true }, { id: 'p2', titel: 'Genehmigungen und GEMA klären', faellig: inDays(200), wer: ME, werName: 'Max Mustermann', erledigt: false }, { id: 'p3', titel: 'Helferliste anlegen', faellig: inDays(230), wer: '', werName: '', erledigt: false }, { id: 'p4', titel: 'Musik / Programm', faellig: inDays(230), wer: ids[3], werName: people[3].name, erledigt: false }]) },
      { _id: 'demo-pl2', _owner: OWNER, _createdDate: daysAgo(10), titel: 'Mitgliederversammlung 2026', datum: inDays(21), vorlage: false, von: VON, vonId: OWNER, aufgaben: JSON.stringify([{ id: 'q1', titel: 'Einladung mit Tagesordnung verschicken', faellig: inDays(-7), wer: ids[1], werName: people[1].name, erledigt: true }, { id: 'q2', titel: 'Kassenbericht vorbereiten', faellig: inDays(7), wer: ids[4], werName: people[4].name, erledigt: false }, { id: 'q3', titel: 'Versammlung in der App anlegen', faellig: inDays(1), wer: ME, werName: 'Max Mustermann', erledigt: true }, { id: 'q4', titel: 'Getränke besorgen', faellig: inDays(20), wer: ME, werName: 'Max Mustermann', erledigt: false }]) },
      { _id: 'demo-pl3', _owner: OWNER, _createdDate: daysAgo(60), titel: 'Infostand', datum: '', vorlage: true, von: VON, vonId: OWNER, aufgaben: JSON.stringify([{ id: 'r1', titel: 'Standgenehmigung beantragen', tage: 21 }, { id: 'r2', titel: 'Material bestellen', tage: 14 }, { id: 'r3', titel: 'Helferliste anlegen', tage: 14 }, { id: 'r4', titel: 'Pavillon und Tisch organisieren', tage: 3 }]) },
    ],
    Pressekontakte: [
      { _id: 'demo-pk1', _owner: OWNER, redaktion: 'Böhme-Zeitung', name: 'Redaktion Soltau', email: 'redaktion@example.com', telefon: '05191 000000', notiz: 'Redaktionsschluss Di 16 Uhr', von: VON, title: 'Böhme-Zeitung' },
      { _id: 'demo-pk2', _owner: OWNER, redaktion: 'NDR Studio Lüneburg', name: '', email: 'lueneburg@example.com', telefon: '', notiz: '', von: VON, title: 'NDR' },
    ],
    Newsletter: [
      { _id: 'demo-nl0', ziel: 'status', betreff: '', empfaenger: 148, text: JSON.stringify({ aktiv: 148, smtp: true }), gesendetAm: daysAgo(0) },
      { _id: 'demo-nl1', ziel: 'beide', betreff: 'SPD Soltau – Neues aus dem Rat, September', empfaenger: 203, gesendetAm: daysAgo(12), von: VON, text: '' },
      { _id: 'demo-nl2', ziel: 'presse', betreff: 'Pressemitteilung SPD Soltau: Radweg nach Harber: Sanierung kommt', empfaenger: 2, gesendetAm: daysAgo(4), von: VON, text: '' },
    ],
    Statistik: statistikDemo(),
    Fahrgemeinschaften: [
      { _id: 'demo-f1', _owner: ids[2], eventId: e0.id, eventTitel: e0.title, eventDatum: e0.date, typ: 'biete', ab: 'Harber', plaetze: 3, zeit: '18:30', memberId: ids[2], name: people[2].name, hinweis: '' },
      { _id: uid(), _owner: ids[7], eventId: e0.id, eventTitel: e0.title, eventDatum: e0.date, typ: 'suche', ab: 'Wolterdingen', plaetze: 1, zeit: '', memberId: ids[7], name: people[7].name, hinweis: '' },
      { _id: 'demo-f3', _owner: ids[9], eventId: 'demo-ev-mv', eventTitel: 'Mitgliederversammlung', eventDatum: demoEvents[1].date, typ: 'biete', ab: 'Tetendorf', plaetze: 2, zeit: '18:30', memberId: ids[9], name: people[9].name, hinweis: 'Fahre über Ahlften.' },
      { _id: uid(), _owner: ids[11], eventId: 'demo-ev-mv', eventTitel: 'Mitgliederversammlung', eventDatum: demoEvents[1].date, typ: 'suche', ab: 'Harber', plaetze: 1, zeit: '', memberId: ids[11], name: people[11].name, hinweis: '' },
      ...(ev.find(e => /stammtisch/i.test(e.title)) ? [{ _id: 'demo-f5', _owner: ids[12], eventId: ev.find(e => /stammtisch/i.test(e.title)).id, eventTitel: 'Stammtisch', eventDatum: ev.find(e => /stammtisch/i.test(e.title)).date, typ: 'biete', ab: 'Wolterdingen', plaetze: 3, zeit: '18:45', memberId: ids[12], name: people[12].name, hinweis: '' }] : []),
    ],
    Mitfahrten: [
      { _id: uid(), _owner: ids[10], fahrtId: 'demo-f1', eventId: e0.id, eventTitel: e0.title, memberId: ids[10], name: people[10].name, title: `${people[10].name} fährt mit` },
      { _id: uid(), _owner: ids[6], fahrtId: 'demo-f1', eventId: e0.id, eventTitel: e0.title, memberId: ids[6], name: people[6].name, title: `${people[6].name} fährt mit` },
      { _id: uid(), _owner: ids[8], fahrtId: 'demo-f3', eventId: 'demo-ev-mv', eventTitel: 'Mitgliederversammlung', memberId: ids[8], name: people[8].name, title: `${people[8].name} fährt mit` },
      { _id: uid(), _owner: ids[13], fahrtId: 'demo-f5', eventId: ev.find(e => /stammtisch/i.test(e.title))?.id || '', eventTitel: 'Stammtisch', memberId: ids[13], name: people[13].name, title: `${people[13].name} fährt mit` },
    ],
    Aktionen: [
      { _id: uid(), _owner: ME, _createdDate: daysAgo(1), typ: 'beitrag_erstellen', title: 'Beitrag: Radweg nach Harber', payload: JSON.stringify({ titel: 'Radweg nach Harber: Sanierung kommt' }), status: 'erledigt', ergebnis: 'veröffentlicht', von: 'Max Mustermann' },
    ],
    Eingang: [], PushSubscriptions: [], Buchungen: [], Anfragen: [],
  };

  const stripSys = it => it;
  const query = col => {
    const filters = []; let sortKey = null, sortDir = 1, lim = 50, skp = 0;
    const b = {
      eq(k, v) { filters.push(it => it[k] === v); return b; },
      ne(k, v) { filters.push(it => it[k] !== v); return b; },
      hasSome(k, vs) { filters.push(it => (Array.isArray(it[k]) ? it[k] : [it[k]]).some(x => vs.includes(x))); return b; },
      descending(k) { sortKey = k; sortDir = -1; return b; },
      ascending(k) { sortKey = k; sortDir = 1; return b; },
      limit(n) { lim = n; return b; }, skip(n) { skp = n; return b; },
      async find() {
        let list = (data[col] || []).filter(it => filters.every(f => f(it)));
        if (sortKey) list = [...list].sort((a, c) => (String(a[sortKey] ?? '') < String(c[sortKey] ?? '') ? -1 : 1) * sortDir);
        return { items: list.slice(skp, skp + lim).map(stripSys), totalCount: list.length };
      },
    };
    return b;
  };
  const items = {
    query,
    async insert(col, it) { const n = { ...it, _id: uid(), _owner: ME, _createdDate: iso(), _updatedDate: iso() }; (data[col] = data[col] || []).unshift(n); return n; },
    async update(col, it) { const list = data[col] || []; const i = list.findIndex(x => x._id === it._id); const n = { ...it, _updatedDate: iso() }; if (i >= 0) list[i] = n; else list.unshift(n); return n; },
    async remove(col, id) { const list = data[col] || []; const i = list.findIndex(x => x._id === id); if (i >= 0) list.splice(i, 1); return {}; },
    async get(col, id) { return (data[col] || []).find(x => x._id === id); },
  };
  SPD.app = SPD.app || {}; if (!(SPD.app.blogCats || []).length) SPD.app.blogCats = [{ id: 'c1', label: 'Fraktion' }, { id: 'c2', label: 'Ortsverein' }, { id: 'c3', label: 'Pressemitteilung' }];
  const members = { async getCurrentMember() { return { member: { _id: ME, loginEmail: 'max.mustermann@example.de', status: 'APPROVED', contact: { firstName: 'Max', lastName: 'Mustermann' }, profile: { nickname: 'Max Mustermann' } } }; } };
  const auth = { loggedIn: () => true, getTokens: () => ({}), setTokens() {}, async logout() { return { logoutUrl: null }; } };
  // Beispiel-Eingang (Registrierung, Buchung, Anfrage) – wie er nach Push-Nachrichten aussähe
  const inbox = [
    { id: 'demo-in-1', title: 'Neue Registrierungsanfrage', body: 'Nina Beispiel (nina@example.com) möchte in den Mitgliederbereich.', receivedAt: Date.now() - 3600e3, done: '', data: { typ: 'registrierung', id: 'demo-in-1', memberId: 'demo-neu', name: 'Nina Beispiel', details: { Name: 'Nina Beispiel', 'E-Mail': 'nina@example.com', Registriert: 'heute, 09:12 Uhr' } } },
    { id: 'demo-in-2', title: 'Buchungsanfrage Roter Bahnhof', body: 'TSV Soltau (Jugendabteilung): 10.10.2026 18:00–21:00 Uhr – Elternabend', receivedAt: Date.now() - 7200e3, done: '', data: { typ: 'buchung', id: 'demo-in-2', buchungId: 'demo-b1', details: { Name: 'Petra Muster', 'Verein/Gruppe': 'TSV Soltau', Wann: '10.10.2026 18:00–21:00 Uhr', Anlass: 'Elternabend', Personen: '25', 'E-Mail': 'petra@example.com', Telefon: '05191 000000' } } },
    { id: 'demo-in-4', title: 'Mitgliedsantrag über die Website', body: 'Lea Neumann möchte SPD-Mitglied werden.', receivedAt: Date.now() - 5400e3, done: '', data: { typ: 'anfrage', id: 'demo-in-4', anfrageId: 'demo-a2', details: { Art: 'Mitglied werden', Name: 'Lea Neumann', 'E-Mail': 'lea@example.com', Telefon: '0170 0000000', Nachricht: 'Ich bin neu in Soltau und möchte mich einbringen – gern beim nächsten Stammtisch kennenlernen.' } } },
    { id: 'demo-in-3', title: 'Anfrage über die Website', body: 'Max Mustermann: Wann wird der Radweg nach Harber saniert?', receivedAt: Date.now() - 86400e3, done: 'Erledigt', data: { typ: 'anfrage', id: 'demo-in-3', anfrageId: 'demo-a1', details: { Art: 'Kontakt', Thema: 'Verkehr', Name: 'Max Mustermann', 'E-Mail': 'max@example.com', Nachricht: 'Wann wird der Radweg nach Harber saniert?' } } },
  ];
  return { items, members, auth, demo: true, inbox, ME };
}
