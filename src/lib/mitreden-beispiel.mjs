// Beispielinhalte für „Mitreden“ – nur für den lokalen Bau (MITREDEN_BEISPIEL=1) und den Demo-Modus der App. Erfunden, aber typisch für Soltau.
export function beispielMitreden() {
  return {
    start: { variante: 'mitreden', videoTitel: 'Drei Entscheidungen, die Soltau verändern', videoUrl: 'https://www.instagram.com/spd_soltau/', videoText: 'Ratsbericht vom 2. Oktober – Marktstraße, Radweg Bundeswehr, Haushalt 2027. 45 Sekunden mit Brian Weber.', videoKapitel: '0:04 Marktstraße\n0:19 Radweg Bundeswehr\n0:31 Haushalt 2027', videoDatum: '2026-10-03' },
    anliegen: [
      { id: 'b1', titel: 'Zebrastreifen Poststraße, Ecke Grundschule', kategorie: 'Straßen & Verkehr', ort: 'Poststraße', text: 'Morgens zwischen 7:30 und 8 Uhr queren rund 60 Kinder die Poststraße – ohne Übergang, bei Tempo 50.', stand: 'nachgefragt', spd: 'Wir haben die Verwaltung um eine Verkehrszählung gebeten und das Thema für den Ausschuss Stadtentwicklung am 12.11. angemeldet.', zaehler: 37, datum: '2026-09-12' },
      { id: 'b2', titel: 'Kaputte Schaukel am Brockmannsweg', kategorie: 'Kita & Schule', ort: 'Brockmannsweg', text: 'Ein Sitz fehlt, die Kette ist gerissen.', stand: 'antwort', spd: 'Bauhof hat die Schaukel am 4.9. gesperrt, am 16.9. kam die neue. Danke fürs Melden.', zaehler: 21, datum: '2026-09-02' },
      { id: 'b3', titel: 'Laub auf dem Radweg Winsener Straße', kategorie: 'Straßen & Verkehr', ort: 'Winsener Straße', text: 'Bei Nässe rutschig, besonders in der Kurve vor der Tankstelle.', stand: 'antwort', spd: 'Rückfrage beim Bauhof: ab 1. Oktober wird wöchentlich gekehrt.', zaehler: 12, datum: '2026-09-23' },
      { id: 'b4', titel: 'Beleuchtung im Bahnhofstunnel flackert', kategorie: 'Sonstiges', ort: 'Bahnhof', text: 'Abends ist der Tunnel zur Hälfte dunkel.', stand: 'neu', spd: '', zaehler: 5, datum: '2026-09-28' },
    ],
    fragen: [
      { id: 'f1', frage: 'Wann kommt endlich der Radweg zur Bundeswehr?', wer: 'Anna', datum: '2026-09-03', antwort: 'Der Rat hat den Antrag am 2. Oktober vertagt – die Kreisverwaltung muss erst den Grunderwerb klären. Wir haben es für die November-Sitzung wieder auf die Tagesordnung gesetzt.', antwortVon: 'Birhat Kaçar', videoUrl: 'https://www.instagram.com/spd_soltau/', zaehler: 41 },
      { id: 'f2', frage: 'Warum gibt es in Soltau zu wenig Kita-Plätze am Nachmittag?', wer: 'Anonym', datum: '2026-09-11', antwort: 'Es fehlen Erzieherinnen, nicht Räume. Die Stadt zahlt seit August eine Zulage – zwei Gruppen öffnen im Januar nachmittags.', antwortVon: 'Brian Weber', videoUrl: '', zaehler: 27 },
    ],
    baustellen: [
      { id: 'k1', titel: 'Marktstraße', art: 'Sperrung', bis: 'Vollsperrung ab März, bis November 2027', was: 'Neues Pflaster, breitere Gehwege, zwölf Bäume, neue Beleuchtung.', warum: 'Ratsbeschluss vom 2. Oktober (19 : 10).', umleitung: 'Über Poststraße und Celler Straße; Geschäfte bleiben zu Fuß erreichbar.', spd: 'Unser Antrag: die zwölf Bäume. Angenommen.', lat: 52.9868, lng: 9.8425, quelle: 'Bekanntmachung der Stadt vom 3.10.' },
      { id: 'k2', titel: 'Winsener Straße', art: 'Baustelle', bis: 'Halbseitig, bis 30. Oktober', was: '180 Meter Abwasserkanal werden erneuert. Ampelregelung.', warum: 'Kanal von 1961, mehrere Rohrbrüche im Frühjahr.', umleitung: 'Bus 104 über Celler Straße.', spd: 'Wir haben nach dem Radweg gefragt: bleibt frei.', lat: 52.9905, lng: 9.8395, quelle: '' },
      { id: 'k3', titel: 'Bahnhofstunnel', art: 'Geplant', bis: 'Beleuchtung, November', was: 'Neue LED-Beleuchtung und Kameras an den Zugängen.', warum: 'Anliegen aus „Was Soltau bewegt“.', umleitung: 'Keine – Arbeiten nachts.', spd: 'Im Haushalt eingeplant.', lat: 52.9895, lng: 9.8487, quelle: '' },
    ],
    umfragen: [
      { id: 'u1', frage: 'Welche drei Spielplätze sollen 2027 zuerst saniert werden?', beschreibung: 'Der Ausschuss Stadtentwicklung entscheidet am 12. November über die Reihenfolge – Ihre Kreuze nehmen wir mit.', optionen: ['Brockmannsweg', 'Böhmepark', 'Wiesenweg', 'Schulstraße', 'Ahlften, Dorfplatz'], maxWahl: 3, offen: true, endetAm: '2026-10-31', folge: '', ergebnis: [188, 241, 97, 154, 63], stimmen: 316, erstellt: '2026-10-01' },
      { id: 'u0', frage: 'Was soll auf die neue Marktstraße: Bäume, Bänke oder Parkplätze?', beschreibung: '', optionen: ['Bäume', 'Bänke', 'Parkplätze'], maxWahl: 1, offen: false, endetAm: '2026-08-31', folge: 'Unser Änderungsantrag „zwölf Bäume“ – vom Rat am 2. Oktober angenommen, 19 : 10.', ergebnis: [251, 111, 50], stimmen: 412, erstellt: '2026-08-01' },
    ],
  };
}
