// Zusatzangaben zu einzelnen Terminen.
//
// Wix liefert über die Schnittstelle nur Titel, Zeit, Ort und Art - der Beschreibungstext
// kommt dort nicht mit. Für Termine, die von außen kommen (Kreisverband, Bundestagsbüro,
// Partner) tragen wir Hinweis und Link deshalb hier ein. Schlüssel ist die Termin-ID aus Wix;
// die steht in der Adresse des Termins im Wix-Dashboard oder kommt aus tools/termin-anlegen.mjs.
//
//   info     eine Zeile unter dem Termin (Hinweis, Anmeldung, Besonderheiten)
//   link     Adresse, auf die der Knopf führt
//   linkText Beschriftung des Knopfes (ohne Angabe: „Mehr erfahren“)
export const TERMIN_ZUSATZ = {
  // Gesundheitspolitik: Lars Klingbeil im Gespräch mit Christos Pantazis, 1. Oktober 2026
  'e4d3c434-b3a5-4c05-8304-dc1935ed9899': {
    info: 'Anmeldung bis 25. September über die Homepage von Lars Klingbeil erforderlich, die Plätze sind begrenzt. '
        + 'Am Veranstaltungstag wird der Personalausweis kontrolliert, Taschen nur bis DIN-A4-Größe.',
    link: 'https://www.lars-klingbeil.de/termin/austausch-ueber-gesundheitspolitik-lars-klingbeil-laedt-zum-gespraech-mit-christos-pantazis-nach-soltau-ein/',
    linkText: 'Zur Anmeldung',
  },
};
