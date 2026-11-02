// Ratsfraktion 2026–2031 – die eine Quelle für Fraktionsseite, Personenprofile und Startseite.
// Ämter, Ausschüsse und Gremien stehen nur hier; Fotos, Berufe und Kurztexte kommen wie auf
// „Unsere 11 im Stadtrat“ aus der Kandidat*innen-Sammlung.
//
// Grundlage: Beschlüsse der Fraktion und die Vorlagen zur konstituierenden Ratssitzung am 03.11.2026
// (ris.stadt-soltau.de: BV/087, BV/089, BV/090, BV/095, BV/105/1). Öffentlich erst ab FRAKTION.ab –
// davor baut der 30-Minuten-Build die alte Fraktionsseite. Lokal vorher ansehen: FRAKTION_VORSCHAU=1.
//
// Bewusst nicht aufgenommen (sollen nicht öffentlich werden): fachkundige Personen im Aufsichtsrat
// der Stadtwerke und die Kuratorien der Kindertagesstätten.

export const FRAKTION = {
  ab: '2026-11-03T19:00:00+01:00',
  wahlperiode: '2026–2031',
  sitze: 11,
  sitzeRat: 34,

  // Reihenfolge auf allen Seiten: nach Funktion
  mitglieder: ['Birhat Kaçar', 'Manuela Bartels', 'Reiner Klatt', 'Harald Garbers', 'Brian Weber', 'Siegfried Belz',
    'Christian Frost', 'Inna Herold', 'Bernd Ingendahl', 'Igor Mamanow', 'Valerij Stroh'],

  // Fraktionsvorstand, gewählt für zweieinhalb Jahre. titel = Bezeichnung an der Person
  vorstand: [
    { funktion: 'Fraktionsvorsitz', name: 'Birhat Kaçar', titel: 'Fraktionsvorsitzender' },
    { funktion: 'Stellvertretender Vorsitz', name: 'Manuela Bartels', titel: 'stellvertretende Fraktionsvorsitzende' },
    { funktion: 'Stellvertretender Vorsitz', name: 'Reiner Klatt', titel: 'stellvertretender Fraktionsvorsitzender' },
    { funktion: 'Finanzverantwortung', name: 'Harald Garbers', titel: 'Finanzverantwortlicher' },
    { funktion: 'Schriftführung', name: 'Brian Weber', titel: 'Schriftführer' },
  ],
  vorstandAmtszeit: 'zweieinhalb Jahre',

  // Ämter im Rat (gewählt in der konstituierenden Sitzung)
  ratsaemter: [
    { amt: 'Ratsvorsitz', name: 'Harald Garbers', titel: 'Ratsvorsitzender' },
    { amt: 'Stellvertretung des Bürgermeisters', name: 'Manuela Bartels', titel: 'stellvertretende Bürgermeisterin' },
  ],

  // Fachausschüsse des Rates. sitze = Ratsmitglieder mit Stimmrecht; themen steuern die Ansprechpartner-Filter
  ausschuesse: [
    { id: 'bau', name: 'Bauausschuss', genitiv: 'des Bauausschusses', sitze: 11, themen: ['Bauen'],
      vorsitz: { name: 'Siegfried Belz', titel: 'Vorsitzender' },
      spd: ['Siegfried Belz', 'Igor Mamanow', 'Reiner Klatt', 'Valerij Stroh'] },
    { id: 'finanz', name: 'Finanzausschuss', genitiv: 'des Finanzausschusses', sitze: 11, themen: ['Wirtschaft', 'Finanzen'],
      spd: ['Bernd Ingendahl', 'Inna Herold', 'Igor Mamanow', 'Reiner Klatt'] },
    { id: 'sozial', name: 'Sozialausschuss', genitiv: 'des Sozialausschusses', sitze: 9, themen: ['Soziales', 'Sport'],
      spd: ['Christian Frost', 'Manuela Bartels', 'Brian Weber'] },
    { id: 'schule', name: 'Schulausschuss', genitiv: 'des Schulausschusses', sitze: 9, vorher: 7, themen: ['Schule'],
      vorsitz: { name: 'Christian Frost', titel: 'Vorsitzender' },
      spd: ['Christian Frost', 'Inna Herold', 'Manuela Bartels'] },
    { id: 'kultur', name: 'Kulturausschuss', genitiv: 'des Kulturausschusses', sitze: 9, vorher: 7, themen: ['Kultur'],
      spd: ['Manuela Bartels', 'Harald Garbers', 'Bernd Ingendahl'] },
    { id: 'feuer', name: 'Feuer- und Katastrophenschutzausschuss', genitiv: 'des Feuer- und Katastrophenschutzausschusses',
      sitze: 9, vorher: 7, frueher: 'Feuerschutzausschuss', themen: ['Feuerwehr'],
      vorsitz: { name: 'Birhat Kaçar', titel: 'Vorsitzender' },
      spd: ['Birhat Kaçar', 'Brian Weber', 'Harald Garbers'] },
  ],

  // Reihenfolge der Themenfilter
  themen: ['Bauen', 'Wirtschaft', 'Finanzen', 'Schule', 'Soziales', 'Sport', 'Kultur', 'Feuerwehr'],

  // Verwaltungsausschuss: acht Beigeordnete und der Bürgermeister; je Beigeordnetem eine persönliche Vertretung
  verwaltungsausschuss: {
    beigeordnete: 8,
    spd: [
      { name: 'Birhat Kaçar', titel: 'Beigeordneter', vertretung: 'Harald Garbers' },
      { name: 'Manuela Bartels', titel: 'Beigeordnete', vertretung: 'Igor Mamanow' },
      { name: 'Reiner Klatt', titel: 'Beigeordneter', vertretung: 'Inna Herold' },
    ],
  },

  // Aufsichtsräte und weitere Gremien – nur diese werden veröffentlicht.
  // bestaetigt: false = erscheint erst, wenn die Besetzung feststeht
  gremien: [
    { name: 'Aufsichtsrat der Stadtwerke Soltau', zusatz: 'GmbH & Co. KG', art: 'Aufsichtsrat', spd: ['Birhat Kaçar', 'Harald Garbers'] },
    { name: 'Aufsichtsrat der AWS', zusatz: 'Ansiedlungs- und Wohnungsbaugesellschaft mbH Soltau', art: 'Aufsichtsrat', spd: ['Reiner Klatt', 'Igor Mamanow', 'Siegfried Belz'] },
    { name: 'Kuratorium der Stiftung Spiel', zusatz: 'Spielmuseum und felto-Filzwelt Soltau', art: 'Kuratorium', spd: ['Bernd Ingendahl'] },
    { name: 'Arbeitsgruppe für Bürgerbeteiligungen', zusatz: 'Verwaltung und Politik', art: 'Arbeitsgruppe', spd: ['Birhat Kaçar'], bestaetigt: false },
  ],

  // Die Kurztexte stammen aus dem Wahlkampf (Kandidat*innen-Sammlung). Was dort zur alten Wahlperiode gehört, wird hier berichtigt,
  // bis der Text in Wix angepasst ist – passt der Text nicht mehr, greift die Zeile einfach nicht.
  textKorrekturen: [
    ['Als Sozialarbeiter, stellvertretender Bürgermeister und erfahrener Kommunalpolitiker', 'Als Sozialarbeiter und erfahrener Kommunalpolitiker'],
  ],
};

export const textBerichtigen = (text, F = FRAKTION) => F.textKorrekturen.reduce((t, [alt, neu]) => t.split(alt).join(neu), String(text || ''));

export const slugOf = name => String(name).toLowerCase().replace(/ç/g, 'c').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = n => String(n).toLowerCase().replace(/ç/g, 'c').replace(/é/g, 'e').replace(/\s+/g, ' ').trim();
const gross = s => s.charAt(0).toUpperCase() + s.slice(1);

// Alles, was die Seiten brauchen, aus den Daten oben abgeleitet – damit jedes Amt überall gleich heißt.
// people: Kandidat*innen-Sammlung (Foto, Beruf, Kurztext)
export function fraktionDaten(people = [], F = FRAKTION) {
  const byName = new Map(people.map(p => [norm(p.name), p]));
  const gremien = F.gremien.filter(g => g.bestaetigt !== false);
  const ausschuesse = F.ausschuesse.map(a => ({ ...a, spd: a.vorsitz ? [a.vorsitz.name, ...a.spd.filter(n => n !== a.vorsitz.name)] : a.spd }));
  const vorsitze = ausschuesse.filter(a => a.vorsitz).map(a => ({ ausschuss: a, name: a.vorsitz.name, titel: `${a.vorsitz.titel} ${a.genitiv}` }));

  const mitglieder = F.mitglieder.map(name => {
    const p = byName.get(norm(name)) || {};
    const fraktion = F.vorstand.find(v => v.name === name);
    const rat = F.ratsaemter.filter(r => r.name === name);
    const vorsitz = vorsitze.filter(v => v.name === name);
    // Titel auf Karten: Amt im Rat und Amt in der Fraktion; sonst ein Ausschussvorsitz; sonst „Ratsmitglied“
    const teile = [...rat.map(r => r.titel), ...(fraktion ? [fraktion.titel] : [])];
    const titel = gross(teile.length ? teile.join(' und ') : vorsitz.length ? vorsitz[0].titel : 'Ratsmitglied');
    const sitze = ausschuesse.filter(a => a.spd.includes(name));
    const va = F.verwaltungsausschuss.spd.find(b => b.name === name);
    const vaVertretung = F.verwaltungsausschuss.spd.find(b => b.vertretung === name);
    // Alle veröffentlichten Funktionen, gruppiert
    const funktionen = [
      ...(fraktion ? [{ gruppe: 'Fraktion', text: gross(fraktion.titel) }] : []),
      ...rat.map(r => ({ gruppe: 'Rat', text: gross(r.titel) })),
      ...(va ? [{ gruppe: 'Rat', text: `${va.titel} im Verwaltungsausschuss` }] : []),
      ...(vaVertretung ? [{ gruppe: 'Rat', text: `Persönliche Vertretung von ${vaVertretung.name} im Verwaltungsausschuss` }] : []),
      ...sitze.map(a => ({ gruppe: 'Ausschüsse', text: a.vorsitz?.name === name ? `${a.vorsitz.titel} ${a.genitiv}` : `Mitglied ${a.genitiv}`, ausschuss: a.id, vorsitz: a.vorsitz?.name === name })),
      ...gremien.filter(g => g.spd.includes(name)).map(g => ({ gruppe: 'Gremien', text: g.name })),
    ];
    return {
      name, slug: slugOf(name), titel, job: p.job || '', text: textBerichtigen(p.text, F), photo: p.photo || null,
      vorstand: !!fraktion, funktionen,
      ausschuesse: sitze.map(a => a.id),
      themen: F.themen.filter(t => sitze.some(a => a.themen.includes(t))),
    };
  });
  const person = name => mitglieder.find(m => m.name === name);
  return {
    ...F, ausschuesse, gremien, mitglieder, person,
    vorsitze,
    fuehrung: F.vorstand.map(v => ({ ...v, person: person(v.name) })),
    // Ansprechpartner je Thema: SPD-Mitglieder der zuständigen Ausschüsse, Vorsitz zuerst
    ansprech: F.themen.map(t => ({ thema: t, ausschuesse: ausschuesse.filter(a => a.themen.includes(t)), personen: [...new Set(ausschuesse.filter(a => a.themen.includes(t)).flatMap(a => a.spd))].map(person) })),
  };
}
