// Vorschau-Modus des Mitgliederbereichs (/mitglieder/?demo): tut so, als wäre man angemeldet, und arbeitet mit
// Beispieldaten im Speicher – nichts wird bei Wix gespeichert. Damit kann sich der Vorstand alles ansehen,
// bevor die ersten Konten freigeschaltet sind.

const uid = () => 'demo-' + Math.random().toString(36).slice(2, 10);
const iso = (d = new Date()) => d.toISOString();
const daysAgo = n => iso(new Date(Date.now() - n * 864e5));
const inDays = n => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

export function makeDemoClient(SPD) {
  const ME = 'demo-me';
  const pool = [...(SPD.vorstand || []), ...(SPD.rat || []), ...(SPD.fraktion || [])].map(p => p.name).filter(Boolean);
  const names = [...new Set(pool)].filter(n => !/brian weber/i.test(n)).slice(0, 14);
  if (!names.length) names.push('Birhat Kaçar', 'Manuela Bartels', 'Inna Herold', 'Reiner Klatt', 'Karin Ruland', 'Harald Garbers');
  const people = ['Brian Weber', ...names].map((name, i) => ({ _id: uid(), memberId: i === 0 ? ME : 'demo-m' + i, name, vorstand: i < 5, rollen: i < 5 ? ['Vorstandsmitglied'] : i < 11 ? ['Ratsmitglied'] : ['Mitglied'], pushAktiv: i % 3 !== 1, status: 'aktiv', title: name }));
  const ids = people.map(p => p.memberId);
  const ev = (SPD.events || []).slice(0, 6);
  const e0 = ev[0] || { id: 'ev-demo-1', title: 'Fraktionssitzung', date: inDays(5), zeit: '19:00 Uhr', ort: 'Altes Rathaus', typ: 'Fraktion' };
  const e1 = ev[1] || { id: 'ev-demo-2', title: 'Infostand Wochenmarkt', date: inDays(9), zeit: '09:00 Uhr', ort: 'Marktplatz', typ: 'Öffentlich' };

  const data = {
    AppMitglieder: people,
    Benachrichtigungen: [
      { _id: uid(), _owner: ME, _createdDate: daysAgo(3), thema: 'registrierung', empfaenger: [ME, ids[1]], namen: ['Brian Weber', people[1].name], von: 'Brian Weber' },
      { _id: uid(), _owner: ME, _createdDate: daysAgo(3), thema: 'recht:umfragen', empfaenger: [ME, ids[1], ids[2]], namen: ['Brian Weber', people[1].name, people[2].name], von: 'Brian Weber' },
      { _id: uid(), _owner: ME, _createdDate: daysAgo(3), thema: 'whatsapp', empfaenger: [], gruppen: [{ name: 'SPD Soltau – Mitglieder', url: 'https://chat.whatsapp.com/BEISPIEL1' }, { name: 'Ratsfraktion', url: 'https://chat.whatsapp.com/BEISPIEL2' }], von: 'Brian Weber' },
    ],
    Zusagen: [
      { _id: uid(), _owner: ids[1], eventId: e0.id, eventTitel: e0.title, eventDatum: e0.date, status: 'zusage', grund: '', memberId: ids[1], name: people[1].name, _createdDate: daysAgo(2) },
      { _id: uid(), _owner: ids[2], eventId: e0.id, eventTitel: e0.title, eventDatum: e0.date, status: 'zusage', grund: '', memberId: ids[2], name: people[2].name, _createdDate: daysAgo(1) },
      { _id: uid(), _owner: ids[3], eventId: e0.id, eventTitel: e0.title, eventDatum: e0.date, status: 'absage', grund: 'Spätschicht', memberId: ids[3], name: people[3].name, _createdDate: daysAgo(1) },
      { _id: uid(), _owner: ids[4], eventId: e1.id, eventTitel: e1.title, eventDatum: e1.date, status: 'zusage', grund: '', memberId: ids[4], name: people[4].name, _createdDate: daysAgo(1) },
    ],
    Umfragen: [
      { _id: 'demo-u1', _owner: ME, _createdDate: daysAgo(2), frage: 'Sommerfest am 12. oder 19. Juli?', beschreibung: 'Der Rote Bahnhof ist an beiden Tagen frei.', optionen: ['12. Juli', '19. Juli', 'Mir egal'], mehrfach: false, offen: true, endetAm: inDays(6), von: 'Brian Weber', title: 'Sommerfest' },
      { _id: 'demo-u2', _owner: ids[1], _createdDate: daysAgo(20), frage: 'Welche Themen sollen wir 2027 in den Vordergrund stellen?', beschreibung: '', optionen: ['Kita & Schule', 'Verkehr & Bahn', 'Wohnen', 'Ortschaften'], mehrfach: true, offen: false, endetAm: daysAgo(5).slice(0, 10), von: people[1].name, title: 'Themen 2027' },
    ],
    UmfragenOeffentlich: [
      { _id: 'demo-u3', _owner: ME, _createdDate: daysAgo(1), frage: 'Was soll die neue Ratsmehrheit zuerst anpacken?', optionen: ['Kita-Plätze', 'Radwege', 'Bahnhofsumfeld', 'Ortschaften stärken'], mehrfach: false, offen: true, endetAm: inDays(10), von: 'Brian Weber', title: 'Umfrage der Woche' },
    ],
    Stimmen: [
      ...ids.slice(1, 9).map((id, i) => ({ _id: uid(), _owner: id, umfrageId: 'demo-u1', auswahl: [i % 3 === 0 ? 1 : 0], memberId: id, _createdDate: daysAgo(1) })),
      ...ids.slice(1, 12).map((id, i) => ({ _id: uid(), _owner: id, umfrageId: 'demo-u2', auswahl: [i % 4, (i + 1) % 4], memberId: id, _createdDate: daysAgo(10) })),
      ...Array.from({ length: 37 }, (_, i) => ({ _id: uid(), _owner: 'demo-v' + i, umfrageId: 'demo-u3', auswahl: [i % 7 === 0 ? 3 : i % 3], memberId: '', _createdDate: daysAgo(0) })),
    ],
    Helferlisten: [
      { _id: 'demo-h1', _owner: ME, _createdDate: daysAgo(4), titel: 'Infostand Wochenmarkt', eventId: e1.id, datum: e1.date, ort: 'Marktplatz', beschreibung: 'Aufbau 8:30 Uhr, Stand bis 13 Uhr. Flyer und Zelt sind im Roten Bahnhof.', schichten: [{ id: 's1', zeit: '08:30–10:30', plaetze: 2 }, { id: 's2', zeit: '10:30–13:00', plaetze: 3 }], von: 'Brian Weber', title: 'Infostand Wochenmarkt' },
      { _id: 'demo-h2', _owner: ids[1], _createdDate: daysAgo(2), titel: 'Plakate abhängen', eventId: '', datum: inDays(3), ort: 'Treffpunkt Roter Bahnhof', beschreibung: 'Zwei Autos mit Anhänger wären super.', schichten: [{ id: 's1', zeit: '17:00–19:00', plaetze: 6 }], von: people[1].name, title: 'Plakate abhängen' },
    ],
    Helfer: [
      { _id: uid(), _owner: ids[2], listeId: 'demo-h1', schichtId: 's1', memberId: ids[2], name: people[2].name },
      { _id: uid(), _owner: ids[3], listeId: 'demo-h1', schichtId: 's2', memberId: ids[3], name: people[3].name },
      { _id: uid(), _owner: ids[5], listeId: 'demo-h2', schichtId: 's1', memberId: ids[5], name: people[5].name },
      { _id: uid(), _owner: ids[6], listeId: 'demo-h2', schichtId: 's1', memberId: ids[6], name: people[6].name },
    ],
    Dokumente: [
      { _id: uid(), _owner: ME, _createdDate: daysAgo(6), titel: 'Protokoll Vorstandssitzung 09/2026', kategorie: 'Protokoll', datum: daysAgo(8).slice(0, 10), url: 'https://www.spd-soltau.de/', beschreibung: 'Beschlüsse zur Website, Sommerfest, Haushalt.', von: 'Brian Weber', title: 'Protokoll Vorstandssitzung 09/2026' },
      { _id: uid(), _owner: ids[1], _createdDate: daysAgo(30), titel: 'Antrag: Sanierung Radweg Harber', kategorie: 'Antrag', datum: daysAgo(31).slice(0, 10), url: 'https://www.spd-soltau.de/', beschreibung: 'Antrag der Fraktion an den Bauausschuss.', von: people[1].name, title: 'Antrag: Sanierung Radweg Harber' },
      { _id: uid(), _owner: ME, _createdDate: daysAgo(40), titel: 'Satzung des Ortsvereins', kategorie: 'Sonstiges', datum: '2024-03-01', url: 'https://www.spd-soltau.de/', beschreibung: '', von: 'Brian Weber', title: 'Satzung des Ortsvereins' },
    ],
    Ratsvorbereitung: [
      { _id: uid(), _owner: ids[1], _createdDate: daysAgo(1), sitzung: inDays(12), gremium: 'Rat der Stadt Soltau', titel: 'Konstituierende Sitzung', link: 'https://www.soltau.de/', tops: [
        { nr: '3', titel: 'Wahl der stellvertretenden Bürgermeister*innen', position: 'dafür', einordnung: 'Wir schlagen Birhat Kaçar vor.' },
        { nr: '5', titel: 'Besetzung der Ausschüsse', position: 'offen', einordnung: 'Verteilung nach Hare/Niemeyer – Details in der Fraktionssitzung.' },
        { nr: '7', titel: 'Haushaltssatzung 2027 – Einbringung', position: 'offen', einordnung: 'Erst Einbringung, Beschluss im Dezember.' },
      ], von: people[1].name, title: 'Konstituierende Sitzung' },
    ],
    Profile: [
      { _id: uid(), _owner: ME, memberId: ME, name: 'Brian Weber', ort: 'Kernstadt', telefon: '', telefonSichtbar: false, emailSichtbar: true, email: 'weber.soltau@gmail.com', geburtstag: '', geburtstagSichtbar: false, eintritt: 2019, fahreAb: 'Kernstadt' },
      { _id: uid(), _owner: ids[1], memberId: ids[1], name: people[1].name, ort: 'Kernstadt', telefon: '0171 0000000', telefonSichtbar: true, emailSichtbar: false, geburtstag: inDays(3).slice(5), geburtstagSichtbar: true, eintritt: 2001 },
      { _id: uid(), _owner: ids[2], memberId: ids[2], name: people[2].name, ort: 'Harber', telefon: '', telefonSichtbar: false, emailSichtbar: true, email: 'beispiel@example.com', geburtstag: inDays(20).slice(5), geburtstagSichtbar: true, eintritt: 2016 },
      { _id: uid(), _owner: ids[4], memberId: ids[4], name: people[4].name, ort: 'Wolterdingen', telefon: '', telefonSichtbar: false, emailSichtbar: false, geburtstag: '', geburtstagSichtbar: false, eintritt: 1986 },
    ],
    Fahrgemeinschaften: [
      { _id: uid(), _owner: ids[2], eventId: e0.id, eventTitel: e0.title, eventDatum: e0.date, typ: 'biete', ab: 'Harber', plaetze: 3, zeit: '18:30', memberId: ids[2], name: people[2].name, hinweis: '' },
      { _id: uid(), _owner: ids[7], eventId: e0.id, eventTitel: e0.title, eventDatum: e0.date, typ: 'suche', ab: 'Wolterdingen', plaetze: 1, zeit: '', memberId: ids[7], name: people[7].name, hinweis: '' },
    ],
    Aktionen: [], PushSubscriptions: [], Buchungen: [], Anfragen: [],
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
  const members = { async getCurrentMember() { return { member: { _id: ME, loginEmail: 'weber.soltau@gmail.com', status: 'APPROVED', contact: { firstName: 'Brian', lastName: 'Weber' }, profile: { nickname: 'Brian Weber' } } }; } };
  const auth = { loggedIn: () => true, getTokens: () => ({}), setTokens() {}, async logout() { return { logoutUrl: null }; } };
  // Beispiel-Eingang (Registrierung, Buchung, Anfrage) – wie er nach Push-Nachrichten aussähe
  const inbox = [
    { id: 'demo-in-1', title: 'Neue Registrierungsanfrage', body: 'Nina Beispiel (nina@example.com) möchte in den Mitgliederbereich.', receivedAt: Date.now() - 3600e3, done: '', data: { typ: 'registrierung', id: 'demo-in-1', memberId: 'demo-neu', name: 'Nina Beispiel', details: { Name: 'Nina Beispiel', 'E-Mail': 'nina@example.com', Registriert: 'heute, 09:12 Uhr' } } },
    { id: 'demo-in-2', title: 'Buchungsanfrage Roter Bahnhof', body: 'TSV Soltau (Jugendabteilung): 10.10.2026 18:00–21:00 Uhr – Elternabend', receivedAt: Date.now() - 7200e3, done: '', data: { typ: 'buchung', id: 'demo-in-2', buchungId: 'demo-b1', details: { Name: 'Petra Muster', 'Verein/Gruppe': 'TSV Soltau', Wann: '10.10.2026 18:00–21:00 Uhr', Anlass: 'Elternabend', Personen: '25', 'E-Mail': 'petra@example.com', Telefon: '05191 000000' } } },
    { id: 'demo-in-3', title: 'Anfrage über die Website', body: 'Max Mustermann: Wann wird der Radweg nach Harber saniert?', receivedAt: Date.now() - 86400e3, done: 'Erledigt', data: { typ: 'anfrage', id: 'demo-in-3', anfrageId: 'demo-a1', details: { Art: 'Kontakt', Thema: 'Verkehr', Name: 'Max Mustermann', 'E-Mail': 'max@example.com', Nachricht: 'Wann wird der Radweg nach Harber saniert?' } } },
  ];
  return { items, members, auth, demo: true, inbox, ME };
}
