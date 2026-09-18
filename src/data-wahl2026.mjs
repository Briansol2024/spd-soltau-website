// Kommunalwahl 13. September 2026 – Stadtratswahl Soltau
// Quelle: Vorläufiges amtliches Endergebnis, Stadt Soltau / wahlen.heidekreis.de (Stand 15.09.2026, 10:04 Uhr)
// Die verbindliche Reihenfolge der Ersatzpersonen stellt der Wahlausschuss mit dem amtlichen Endergebnis fest.

export const WAHL = {
  datum: '2026-09-13',
  stand: '15. September 2026',
  quelle: 'https://wahlen.heidekreis.de/20260913/03358021/praesentation/ergebnis.html?wahl_id=268&stimmentyp=0&id=ebene_-132_id_206',
  wahlperiodeStart: '2026-11-01',
  sitzeGesamt: 34,
  wahlberechtigte: 17728,
  waehler: 10424,
  beteiligung: 58.8,
  // Sitzverteilung im neuen Rat
  sitze: [['SPD', 11], ['CDU', 7], ['AfD', 6], ['BürgerUnion', 4], ['GRÜNE', 4], ['FDP', 1], ['DSW', 1]],
  spd: { stimmen: 9268, prozent: 30.76, kandidatenstimmen: 6802, parteistimmen: 2466, sitze: 11 },
  // Gewählte SPD-Ratsmitglieder: „direkt“ = über die persönlichen Stimmen, „liste“ = über die Listenreihenfolge
  gewaehlt: [
    { name: 'Birhat Kaçar', stimmen: 3875, art: 'direkt', listenplatz: 1 },
    { name: 'Manuela Bartels', stimmen: 477, art: 'direkt', listenplatz: 2 },
    { name: 'Inna Herold', stimmen: 397, art: 'direkt', listenplatz: 4 },
    { name: 'Reiner Klatt', stimmen: 282, art: 'direkt', listenplatz: 5 },
    { name: 'Brian Weber', stimmen: 184, art: 'direkt', listenplatz: 3 },
    { name: 'Valerij Stroh', stimmen: 158, art: 'direkt', listenplatz: 15 },
    { name: 'Christian Frost', stimmen: 149, art: 'direkt', listenplatz: 13 },
    { name: 'Siegfried Belz', stimmen: 133, art: 'direkt', listenplatz: 8 },
    { name: 'Bernd Ingendahl', stimmen: 36, art: 'liste', listenplatz: 6 },
    { name: 'Harald Garbers', stimmen: 112, art: 'liste', listenplatz: 7 },
    { name: 'Igor Mamanow', stimmen: 123, art: 'liste', listenplatz: 9 },
  ],
  // Alle 27 Kandidat*innen mit Stimmen und Listenplatz
  alle: [
    ['Birhat Kaçar', 3875, 1], ['Manuela Bartels', 477, 2], ['Inna Herold', 397, 4], ['Reiner Klatt', 282, 5], ['Brian Weber', 184, 3],
    ['Valerij Stroh', 158, 15], ['Christian Frost', 149, 13], ['Siegfried Belz', 133, 8], ['Igor Mamanow', 123, 9], ['Bianca Ort', 115, 12],
    ['Harald Garbers', 112, 7], ['Juliane Mech', 112, 10], ['Finn Iwers', 91, 26], ['Laura Elbers Gutiérrez', 85, 27], ['Alexander Kaul', 81, 11],
    ['Thomas Sandkühler', 65, 24], ['Anke Heusler', 59, 19], ['Fabian Langholf', 49, 22], ['Patrick Ludwig', 49, 18], ['Nancy Weber', 44, 14],
    ['Regina Grimm', 43, 17], ['Bernd Ingendahl', 36, 6], ['Karin Ruland', 22, 16], ['Rainer Grimm', 17, 21], ['Veikko Diekmann', 16, 23],
    ['Frank Wille', 16, 25], ['Erik Krämer', 12, 20],
  ],
};

// Ersatzpersonen nach § 38 NKWG: für Sitze aus der Personenwahl in der Reihenfolge der Stimmen,
// für Sitze aus der Listenwahl in der Reihenfolge des Wahlvorschlags.
export function nachruecker(w, n = 3) {
  const elected = new Set(w.gewaehlt.map(g => g.name));
  const rest = w.alle.filter(([name]) => !elected.has(name));
  const nachStimmen = [...rest].sort((a, b) => b[1] - a[1]).slice(0, n).map(([name, stimmen, lp]) => ({ name, stimmen, listenplatz: lp }));
  const nachListe = [...rest].sort((a, b) => a[2] - b[2]).slice(0, n).map(([name, stimmen, lp]) => ({ name, stimmen, listenplatz: lp }));
  return { nachStimmen, nachListe };
}

// Landrats-Stichwahl Heidekreis – Unterstützung für Sebastian Zinke (SPD)
// Quellen: spd-heidekreis.de/landratswahl-2026, sebastian-zinke.de, Presseberichte zum Ergebnis des ersten Wahlgangs
export const STICHWAHL = {
  datum: '2026-09-27',
  datumText: 'Sonntag, 27. September 2026',
  kandidat: 'Sebastian Zinke',
  amt: 'Landrat des Heidekreises',
  ersterWahlgang: { prozent: 37.2, stimmen: 26486 },
  kurz: 'Geboren 1981 in Walsrode, Landtagsabgeordneter für den Heidekreis und seit über 20 Jahren kommunalpolitisch engagiert. Er kennt unsere Städte und Dörfer, Vereine und Unternehmen – und bringt gute Kontakte nach Hannover und Berlin mit, um für den Heidekreis mehr zu bewegen.',
  schwerpunkte: [
    ['Wirtschaft', 'Energieprojekte und Tourismus schaffen Arbeitsplätze und Wohlstand vor Ort.'],
    ['Bildung', 'Schulen und Kitas modernisieren für beste Chancen unserer Kinder.'],
    ['Sicherheit', 'Feuerwehr, Polizei, Rettungs- und Hilfsorganisationen stärken.'],
    ['Lebensqualität', 'Gesundheit, Mobilität und digitale Verwaltung einfach nutzbar machen.'],
    ['Heimat', 'Landwirtschaft, Natur und Kulturlandschaften bewahren.'],
  ],
  website: 'https://sebastian-zinke.de/',
  wahlinfo: 'https://www.soltau.de/home/aktuelles/wahlen.aspx',
  foto: '/assets/images/sebastian-zinke.jpg',
  fotoQuelle: 'Nominierung im Kulturhaus Schneverdingen, Foto: SPD Soltau',
};
