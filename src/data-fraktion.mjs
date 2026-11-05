// Ratsfraktion 2026–2031 – die eine Quelle für Fraktionsseite, Personenprofile und Startseite.
// Reihenfolge, Hauptfunktion und weitere Funktionen stehen nur hier, wortgleich nach Brians Vorgabe vom 05.11.2026
// (nach der konstituierenden Ratssitzung am 03.11.2026). Fotos, Berufe und Kurztexte kommen wie auf
// „Unsere 11 im Stadtrat“ aus der Kandidat*innen-Sammlung in Wix.
//
// Bewusst keine Stimmenzahlen und keine Wahlergebnisse: Die stehen nur auf der Wahlseite /stadtrat-2026/.
// Nichts ergänzen, was hier nicht steht – keine erfundenen Ämter, Ausschüsse oder Angaben zu Personen.

export const FRAKTION = {
  ab: '2026-11-03T19:00:00+01:00',
  wahlperiode: '2026–2031',
  sitze: 11,
  sitzeRat: 34,

  titel: 'Unsere Fraktion im Rat der Stadt Soltau',
  einleitung: [
    'Elf Menschen. Unterschiedliche Erfahrungen. Ein gemeinsames Ziel: Soltau voranbringen.',
    'Wir sind die SPD Fraktion im Rat der Stadt Soltau. Mit elf Ratsmitgliedern setzen wir uns für eine soziale, lebenswerte und zukunftsfähige Stadt ein. Wir bringen unterschiedliche berufliche und persönliche Erfahrungen mit, aber uns verbindet der Anspruch, Verantwortung zu übernehmen und unsere Stadt aktiv mitzugestalten.',
  ],

  // Reihenfolge auf allen Seiten. haupt = politische Hauptfunktion (leer = keine), weitere = Funktionen und Mitgliedschaften.
  mitglieder: [
    { name: 'Birhat Kaçar', haupt: 'Fraktionsvorsitzender',
      weitere: ['Mitglied des Verwaltungsausschusses', 'Mitglied des Aufsichtsrates der Stadtwerke Soltau', 'Vorsitzender des Feuerschutzausschusses'] },
    { name: 'Reiner Klatt', haupt: 'Stellvertretender Fraktionsvorsitzender',
      weitere: ['Mitglied des Finanzausschusses', 'Mitglied des Bauausschusses', 'Mitglied des Aufsichtsrates der AWS'] },
    { name: 'Manuela Bartels', haupt: 'Stellvertretende Bürgermeisterin und stellvertretende Fraktionsvorsitzende',
      weitere: ['Mitglied des Sozialausschusses', 'Mitglied des Verwaltungsausschusses'] },
    { name: 'Harald Garbers', haupt: 'Ratsvorsitzender und Finanzverantwortlicher der Fraktion',
      weitere: ['Mitglied des Kulturausschusses'] },
    { name: 'Brian Weber', haupt: 'Schriftführer der Fraktion',
      weitere: ['Mitglied des Feuerschutzausschusses', 'Mitglied des Sozialausschusses', 'Mitglied der Kuratorien der Kindertagesstätten'] },
    { name: 'Siegfried Belz', haupt: 'Vorsitzender des Bauausschusses',
      weitere: ['Mitglied des Aufsichtsrates der AWS'] },
    { name: 'Valerij Stroh', haupt: '',
      weitere: ['Mitglied des Aufsichtsrates der AWS', 'Mitglied des Bauausschusses'] },
    { name: 'Bernd Ingendahl', haupt: '',
      weitere: ['Mitglied des Finanzausschusses', 'Mitglied des Kulturausschusses', 'Mitglied des Kuratoriums der Stiftung Spiel'] },
    { name: 'Igor Mamanow', haupt: '',
      weitere: ['Mitglied des Finanzausschusses', 'Mitglied des Bauausschusses'] },
    { name: 'Inna Herold', haupt: '',
      weitere: ['Mitglied des Finanzausschusses', 'Mitglied des Schulausschusses'] },
    { name: 'Christian Frost', haupt: '',
      weitere: ['Mitglied des Schulausschusses', 'Mitglied des Sozialausschusses'] },
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

// Alles, was die Seiten brauchen. people: Kandidat*innen-Sammlung (Foto, Beruf, Kurztext)
export function fraktionDaten(people = [], F = FRAKTION) {
  const byName = new Map(people.map(p => [norm(p.name), p]));
  const mitglieder = F.mitglieder.map(m => {
    const p = byName.get(norm(m.name)) || {};
    return {
      name: m.name, slug: slugOf(m.name), haupt: m.haupt || '', weitere: [...m.weitere],
      job: p.job || '', text: textBerichtigen(p.text, F), photo: p.photo || null,
    };
  });
  const person = name => mitglieder.find(m => m.name === name);
  return { ...F, mitglieder, person };
}
