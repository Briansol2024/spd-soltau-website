// Fallback-Inhalte: werden benutzt, solange keine Wix-Client-ID gesetzt ist
// oder eine Wix-Quelle nicht erreichbar ist. Entspricht dem Referenz-Entwurf D.
// Sobald das Wix-Backend angebunden ist, kommen Beiträge, Termine und Personen von dort.

const p = (...paras) => paras.map(t => `<p>${t}</p>`).join('');

export const NEWS = [
  { id: 'n1', slug: 'historisches-ergebnis-staerkste-fraktion', cat: 'Ortsverein', date: '2026-09-14', imgLabel: 'Wahlabend im Roten Bahnhof', img: null,
    title: 'Historisches Ergebnis: SPD erstmals stärkste Fraktion im Stadtrat',
    teaser: 'Zum ersten Mal in der Geschichte der Stadt stellt die SPD die stärkste Fraktion im Rat. Wir sagen Danke – und wissen, dass daraus Verantwortung entsteht.',
    bodyHtml: p('Zum ersten Mal in der Geschichte der Stadt Soltau ist die SPD stärkste Fraktion im Rat. Für uns ist das ein besonderer Moment – und vor allem ein großer Vertrauensbeweis, für den wir uns von Herzen bedanken.', 'Wir wissen, wie groß dieses Vertrauen ist, und wir wissen, dass daraus Verantwortung entsteht. Das Ergebnis ist kein Grund, sich zurückzulehnen. Es ist ein Vorschuss für die kommenden fünf Jahre.', 'Wir werden ordentlich arbeiten, zuhören, ansprechbar bleiben und Entscheidungen erklären. Danke an alle, die uns ihre Stimme gegeben haben. Jetzt beginnt die Arbeit.') },
  { id: 'n2', slug: 'erste-fraktionssitzung-nach-der-wahl', cat: 'Fraktion', date: '2026-09-16', imgLabel: 'Altes Rathaus', img: null,
    title: 'Erste Fraktionssitzung nach der Wahl',
    teaser: 'Die SPD-Ratsfraktion kommt im Alten Rathaus zusammen, um die Ratssitzung am 1. Oktober vorzubereiten und die Aufgaben für die neue Wahlperiode zu verteilen.',
    bodyHtml: p('Am Mittwoch, 16. September, trifft sich die SPD-Ratsfraktion im Alten Rathaus zu ihrer ersten Sitzung nach der Kommunalwahl.', 'Auf der Tagesordnung: die Vorbereitung der Ratssitzung am 1. Oktober, die Aufgabenverteilung in der neuen Fraktion und erste Schritte für die Umsetzung des 10-Punkte-Plans.', 'Die neue Wahlperiode beginnt am 1. November 2026. Bis dahin arbeiten bisherige und neue Ratsmitglieder eng zusammen, damit der Übergang reibungslos läuft.') },
  { id: 'n3', slug: 'was-der-10-punkte-plan-jetzt-bedeutet', cat: 'Fraktion', date: '2026-09-15', imgLabel: 'Marktstraße', img: null,
    title: 'Was der 10-Punkte-Plan jetzt konkret bedeutet',
    teaser: 'Zehn Punkte, fünf Jahre: Mit dem Wahlergebnis im Rücken geht es um die Umsetzung. Welche Vorhaben zuerst anstehen – und wo der Rat bald entscheiden muss.',
    bodyHtml: p('Zehn Punkte, fünf Jahre: Mit dem Wahlergebnis im Rücken geht es jetzt um die Umsetzung. Wir erklären, welche Vorhaben zuerst anstehen und wo der Rat in den kommenden Monaten Entscheidungen treffen muss.', 'Ganz oben auf der Liste: die Sanierung der Marktstraße, der Neubau der Wilhelm-Busch-Schule und die Unterführung am Bahnübergang Walsroder Straße.', 'Zu jedem Vorhaben werden wir hier regelmäßig über den Sachstand berichten – auch dann, wenn es langsamer vorangeht als erhofft.') },
  { id: 'n4', slug: 'danke-fuer-die-gespraeche-auf-dem-wochenmarkt', cat: 'Ortsverein', date: '2026-09-12', imgLabel: 'Wochenmarkt Soltau', img: null,
    title: 'Danke für die Gespräche auf dem Wochenmarkt',
    teaser: 'Ein letztes Mal vor der Wahl standen wir auf dem Soltauer Wochenmarkt. Viele Begegnungen, viel Zuspruch – und ein Aufruf: wählen gehen.',
    bodyHtml: p('Ein letztes Mal vor der Wahl war unser Team auf dem Soltauer Wochenmarkt. Wir bedanken uns für die vielen Gespräche, Begegnungen und den großen Zuspruch der vergangenen Wochen.', 'Es war eine intensive Zeit, die wir so schnell nicht vergessen werden. Am Wahltag waren die Wahllokale von 8 bis 18 Uhr geöffnet – und viele Soltauerinnen und Soltauer haben ihre Stimme abgegeben.') },
  { id: 'n5', slug: 'roeders-tec-partner-der-feuerwehr', cat: 'Pressemitteilung', date: '2026-08-17', imgLabel: 'Übergabe der Plakette', img: null,
    title: 'Röders TEC erhält Förderplakette „Partner der Feuerwehr“',
    teaser: 'Das Soltauer Unternehmen wird für seine Unterstützung der Freiwilligen Feuerwehr ausgezeichnet. Wir gratulieren – Ehrenamt braucht starke Partner.',
    bodyHtml: p('Das Soltauer Unternehmen Röders TEC ist mit der Förderplakette „Partner der Feuerwehr“ ausgezeichnet worden. Die Plakette würdigt Arbeitgeber, die ihre Beschäftigten für Einsätze der Freiwilligen Feuerwehr freistellen und das Ehrenamt aktiv unterstützen.', 'Für uns ist klar: Die Feuerwehr gehört zur grundlegenden Sicherheitsinfrastruktur unserer Stadt. Wer im Ehrenamt Verantwortung übernimmt, braucht Arbeitgeber, die das mittragen – und eine Stadt, die in Gebäude, Fahrzeuge und Ausstattung investiert.') },
  { id: 'n6', slug: 'infostand-auf-dem-wochenmarkt', cat: 'Ortsverein', date: '2026-08-08', imgLabel: 'Infostand', img: null,
    title: 'Infostand auf dem Wochenmarkt',
    teaser: 'Bei Kaffee und Gesprächen: Unser Team stellte den 10-Punkte-Plan vor und sammelte Anliegen aus Kernstadt und Ortschaften.',
    bodyHtml: p('Bei bestem Wetter hat unser Team am Samstag den 10-Punkte-Plan auf dem Wochenmarkt vorgestellt. Viele Besucherinnen und Besucher nutzten die Gelegenheit, mit unseren Kandidatinnen und Kandidaten ins Gespräch zu kommen.', 'Besonders häufig genannt: die Innenstadt, bezahlbarer Wohnraum und der Bahnübergang Walsroder Straße. Anregungen aus den Ortschaften haben wir mitgenommen.') },
];

export const EVENTS = [
  { id: 'e1', date: '2026-09-16', title: 'Sitzung der SPD-Ratsfraktion', ort: 'Altes Rathaus', zeit: '19:00 Uhr', typ: 'Fraktion', info: 'Vorbereitung der Ratssitzung am 1. Oktober.' },
  { id: 'e2', date: '2026-10-01', title: 'Sitzung des Soltauer Stadtrates', ort: 'Alte Reithalle', zeit: '18:00 Uhr', typ: 'Rat', info: 'Öffentliche Ratssitzung – Zuhören ausdrücklich erwünscht.' },
  { id: 'e3', date: '2026-10-05', title: 'Vorstandssitzung', ort: 'Roter Bahnhof', zeit: '19:00 Uhr', typ: 'Mitglieder', info: 'Sitzung des Ortsvereinsvorstands.' },
  { id: 'e4', date: '2026-10-10', title: 'Infostand auf dem Wochenmarkt', ort: 'Marktplatz', zeit: '9–12 Uhr', typ: 'Öffentlich', info: 'Kommen Sie vorbei – wir freuen uns auf Ihre Anliegen.' },
  { id: 'e5', date: '2026-11-05', title: 'Konstituierende Sitzung des neuen Stadtrates', ort: 'Alte Reithalle', zeit: '18:00 Uhr', typ: 'Rat', info: 'Beginn der Wahlperiode 2026–2031. Termin wird von der Stadt bestätigt.' },
  { id: 'e6', date: '2026-12-03', title: 'Mitgliederversammlung mit Jahresrückblick', ort: 'Roter Bahnhof', zeit: '19:00 Uhr', typ: 'Mitglieder', info: 'Rückblick auf das Wahljahr und Ausblick auf 2027.' },
];

const P = (name, job, role, text, themen = []) => ({ name, job, role, text, themen, photo: null });
export const PEOPLE = [
  P('Birhat Kaçar', 'Sozialarbeiter', 'Vorsitzender · Fraktionsvorsitzender · stellv. Bürgermeister', 'Seit 2016 im Stadtrat, seit 2021 im Kreistag. Als Sozialarbeiter bringt er den Blick für die Menschen mit – und den Anspruch, Soltau nicht nur zu verwalten, sondern zu gestalten.', ['Verkehr & Bahn', 'Wohnen & Innenstadt']),
  P('Manuela Bartels', 'Sozialversicherungsfachangestellte', 'Ratsfrau seit 2021 · Sozialausschuss', 'Mutter von drei Kindern, seit 2021 im Stadtrat. Ihre Schwerpunkte: Kitas, Schulen, Familien und ein starkes soziales Netz.', ['Kita & Schule']),
  P('Brian Weber', 'Elektriker & Servicetechniker', '', 'Vater von zwei Kindern und früher aktiver Feuerwehrmann. Ihm sind Sicherheit, Zusammenhalt und eine verlässliche Stadt für Familien wichtig.', ['Feuerwehr & Sicherheit']),
  P('Inna Herold', 'Diplomjuristin & Unternehmerin', '', 'Engagiert in Elternvertretung und Förderverein der Hermann-Billung-Schule. Bringt die Anliegen von Kindern, Eltern und Schulen ein.', ['Kita & Schule']),
  P('Reiner Klatt', 'Pädagoge', 'Rund 30 Jahre im Stadtrat', 'Kaum jemand kennt die Strukturen und Entscheidungen der Stadt über einen so langen Zeitraum.', ['Wohnen & Innenstadt']),
  P('Bernd Ingendahl', 'Versicherungskaufmann', 'Ehem. Kreistagsmitglied', 'Fünf Jahre im Kreistag, besondere Erfahrung in Wirtschaftsfragen. Steht für sachliche Entscheidungen und einen starken Standort.', ['Wirtschaft & Arbeit']),
  P('Harald Garbers', 'Diplom-Wirtschaftsingenieur', '15 Jahre Fraktionsvorsitzender', 'Gehört zu den erfahrensten Kommunalpolitikern im Team. Die Entwicklung der Ortschaften liegt ihm besonders am Herzen.', ['Ortschaften']),
  P('Siegfried Belz', 'Finanzbeamter a.D.', '25 Jahre im Stadtrat', 'Verbindet kommunalpolitische Erfahrung mit einem genauen Blick auf die Finanzen und langfristig tragfähige Entscheidungen.', ['Finanzen']),
  P('Igor Mamanow', 'Unternehmer', 'parteilos', 'Unabhängiger Blick, wirtschaftliche Erfahrung und der Anspruch, gute Ideen umzusetzen statt nur zu diskutieren.', ['Wirtschaft & Arbeit']),
  P('Juliane Mech', 'Verwaltungsfachangestellte i.A.', '', 'Jüngstes Teammitglied. Bringt die Perspektive einer Generation ein, die mit den Entscheidungen von heute noch lange lebt.'),
  P('Alexander Kaul', 'Teamleiter Digitalisierung Windkraft', '', 'Steht für moderne Technik, erneuerbare Energien und praktische Lösungen für ein zukunftsfähiges Soltau.', ['Energie & Digitales']),
  P('Bianca Ort', 'Erzieherin', '', 'Erlebt jeden Tag, was Kinder und Familien brauchen – und möchte Soltau familienfreundlicher machen.', ['Kita & Schule']),
  P('Christian Frost', 'Geschäftsführer', 'Kreistagsabgeordneter', 'Kreistagsabgeordneter und ehemaliges Ratsmitglied. Kennt Stadt- und Kreispolitik und bringt Erfahrung in sozialen Fragen ein.'),
  P('Nancy Weber', 'Tagesmutter', '', 'Begleitet Kinder und Familien im Alltag. Weiß, wie wichtig gute Betreuung und familienfreundliche Rahmenbedingungen sind.', ['Soziales & Jugend']),
  P('Valerij Stroh', 'Handwerker & Technische Leitung', 'parteilos', 'Erfahrung aus Handwerk und Gebäudetechnik. Steht für pragmatische Lösungen, die in der Praxis funktionieren.'),
  P('Karin Ruland', 'Groß- und Außenhandelskauffrau', 'Kassiererin des Ortsvereins', 'Seit zwölf Jahren verantwortlich für die Finanzen des Ortsvereins. Sorgfältiger Umgang mit Geld ist für sie selbstverständlich.', ['Finanzen']),
  P('Regina Grimm', 'Lehrerin & Polizeibeamtin a.D.', '', 'Kennt Bildung und Sicherheit aus eigener Erfahrung – zwei Bereiche, in denen Verantwortung jeden Tag zählt.', ['Feuerwehr & Sicherheit']),
  P('Patrick Ludwig', 'Sozialarbeiter', '', 'Kennt sehr unterschiedliche Lebensrealitäten. Steht für eine soziale Stadt, die Chancen eröffnet und niemanden aus dem Blick verliert.', ['Soziales & Jugend']),
  P('Anke Heusler', 'Musikpädagogin', '', 'Weiß, welchen Wert Bildung, Kultur und Kreativität für Menschen jeden Alters haben.', ['Kultur & Sport']),
  P('Erik Krämer', 'Triebfahrzeugführer', '', 'Kennt Mobilität und Bahnverkehr aus der täglichen Praxis – und weiß, was gute Verbindungen für Soltau bedeuten.', ['Verkehr & Bahn']),
  P('Rainer Grimm', 'Berufsschullehrer', '', 'Kennt die Verbindung von Schule, Ausbildung und Arbeitswelt. Will jungen Menschen gute Chancen ermöglichen.'),
  P('Fabian Langholf', 'IT-Spezialist', '', 'Denkt digital, strukturiert und lösungsorientiert. Möchte, dass Verwaltung und öffentliche Angebote einfacher funktionieren.', ['Energie & Digitales']),
  P('Veikko Diekmann', 'Verkäufer', '', 'Täglicher Umgang mit ganz unterschiedlichen Menschen. Steht für Bodenständigkeit und Politik nah an der Lebenswirklichkeit.'),
  P('Thomas Sandkühler', 'Lehrer', '', 'Kennt die Herausforderungen des Bildungssystems aus eigener Erfahrung. Will Soltau für kommende Generationen stark halten.', ['Kultur & Sport']),
  P('Frank Wille', 'IT-Spezialist', '', 'Technisches Wissen und ein moderner Blick auf Digitalisierung. Digitale Angebote sollen selbstverständlich werden.', ['Energie & Digitales']),
  P('Finn Iwers', 'Sales Coach', 'parteilos · aus Harber', 'Will den Ortschaften eine starke Stimme geben, damit ihre Anliegen im Rathaus gehört werden.', ['Ortschaften']),
  P('Laura Elbers Gutiérrez', 'Industriekauffrau', '', 'Verbindet berufliche Erfahrung mit langjährigem Engagement für Soltau. Steht für soziale, moderne und wirtschaftlich vernünftige Politik.'),
];

// Vorstand – entspricht der Wix-Sammlung „Vorstand“ (Stand September 2026)
export const VORSTAND = [
  { name: 'Laura Elbers Gutiérrez', position: 'Vorsitzende', job: 'Auszubildende', photo: null },
  { name: 'Birhat Kaçar', position: 'Vorsitzender', job: 'Sozialarbeiter', photo: null },
  { name: 'Brian Weber', position: 'Stellvertretender Vorsitzender', job: 'Servicetechniker', photo: null },
  { name: 'Jamie Prüser', position: 'Stellvertretender Vorsitzender', job: 'FSJler', photo: null },
  { name: 'Karin Ruland', position: 'Finanzverantwortliche', job: 'Groß- und Außenhandelskauffrau', photo: null },
  { name: 'Manuela Bartels', position: 'Beisitzerin', job: 'Fachberaterin Sozialversicherung', photo: null },
  { name: 'Thomas Sandkühler', position: 'Beisitzer', job: 'Lehrer', photo: null },
  { name: 'Bianca Ort', position: 'Beisitzerin', job: 'Erzieherin', photo: null },
  { name: 'Siegfried Belz', position: 'Beisitzer', job: 'Finanzbeamter', photo: null },
  { name: 'André Küsel', position: 'Beisitzer', job: 'Journalist', photo: null },
];

export const THEMEN_ORDER = ['Kita & Schule', 'Feuerwehr & Sicherheit', 'Ortschaften', 'Verkehr & Bahn', 'Wohnen & Innenstadt', 'Wirtschaft & Arbeit', 'Finanzen', 'Soziales & Jugend', 'Energie & Digitales', 'Kultur & Sport'];

export const ZIELE = [
  { title: 'Innenstadt endlich sanieren', intro: 'Unsere Innenstadt ist das Herz der Stadt. Nach Jahren der Planung muss jetzt die Umsetzung folgen.', points: ['Sanierung und Neugestaltung der Marktstraße beginnen', 'Rathausquartier Schritt für Schritt modernisieren', 'Mehr Bäume, Schatten, Sitzmöglichkeiten und barrierefreie Wege', 'Leerstände aktiv nutzen und neue Angebote in die Innenstadt holen'] },
  { title: 'Kitas und Schulen stärken', intro: 'Gute Bildung beginnt mit verlässlicher Betreuung und guten Bedingungen zum Lernen.', points: ['Ausreichend Kita-Plätze schaffen, bestehende Einrichtungen erhalten', 'Neubau der Wilhelm-Busch-Schule voranbringen, Zukunft der Freudenthalschule klären', 'Ganztag an den Grundschulen zuverlässig ausbauen', 'Moderne digitale Ausstattung und zeitgemäße Lernräume'] },
  { title: 'Sport und Therme erneuern', intro: 'Vereine leisten jeden Tag wichtige Arbeit – dafür brauchen sie vernünftige Bedingungen.', points: ['Beschlossene Modernisierung der Sportplätze endlich umsetzen', 'Verlässliche, zeitgemäße Trainingsbedingungen für Vereine', 'Therme baulich und energetisch weiterentwickeln', 'Schwimmunterricht und bezahlbare Freizeitangebote sichern'] },
  { title: 'Feuerwehr stärken', intro: 'Die Feuerwehr gehört zur grundlegenden Sicherheitsinfrastruktur – keine freiwillige Zusatzleistung.', points: ['Neubauten und Sanierungen von Feuerwehrhäusern umsetzen, z. B. in Wolterdingen', 'Fahrzeuge rechtzeitig ersetzen und langfristig einplanen', 'Moderne Schutzkleidung und technische Ausstattung', 'Ortsfeuerwehren und Nachwuchsarbeit dauerhaft stärken'] },
  { title: 'Ortschaften voranbringen', intro: 'Soltau besteht aus der Kernstadt und 16 Ortschaften. Stadtentwicklung hört nicht an der Kernstadtgrenze auf.', points: ['Neue Wohnmöglichkeiten und Bauplätze in den Ortschaften', 'Priorisierte Projekte aus dem Ortschaftsentwicklungskonzept umsetzen', 'Sichere Radwege zwischen Kernstadt und Ortschaften', 'Dorfgemeinschaftshäuser, Treffpunkte und Ehrenamt erhalten'] },
  { title: 'Bezahlbar wohnen', intro: 'Soltau braucht Wohnungen für unterschiedliche Lebensphasen und Einkommen – nicht nur neue Baugebiete.', points: ['Wohnbauflächen wie an der Tetendorfer Straße zügig entwickeln', 'Mehr Flächen für Mehrfamilienhäuser und kleinere Wohnungen', 'AWS stärker für bezahlbaren Wohnraum nutzen', 'Leerstände und vorhandene Flächen für Wohnraum aktivieren'] },
  { title: 'Arbeitsplätze schaffen', intro: 'Soltau ist einer der wichtigsten Wirtschaftsstandorte im Heidekreis. Diesen Vorsprung wollen wir ausbauen.', points: ['Gewerbeflächen in Soltau Ost weiterentwickeln', 'Flächen für Handwerk, Mittelstand und Soltauer Unternehmen', 'AWS als aktive Wirtschaftsförderung stärken', 'Bei Neuansiedlungen auf Arbeitsplätze und langfristigen Nutzen achten'] },
  { title: 'Energie nutzen', intro: 'Soltau soll von Windkraft und Photovoltaik nicht nur die Auswirkungen tragen, sondern wirtschaftlich profitieren.', points: ['Geeignete Flächen für Windkraft und Photovoltaik gezielt nutzen', 'Stadtwerke stärker an neuen Energieprojekten beteiligen', 'Photovoltaik auf kommunalen Gebäuden ausbauen', 'Kommunale Wärmeplanung in konkrete Projekte übersetzen'] },
  { title: 'Verkehr verbessern', intro: 'Verkehr lässt sich nicht verbieten – er muss besser gesteuert werden. Wer unterwegs ist, soll sicher ankommen.', points: ['Unterführung am Bahnübergang Walsroder Straße mit höchster Priorität', 'Verbindliches Maßnahmenpaket 2027–2029 aus dem Verkehrsentwicklungsplan', 'Durchgängiges Radwegenetz zu Schulen, Gewerbegebieten und Ortschaften', 'Zuverlässige Heidebahn und bessere Bahnverbindungen'] },
  { title: 'Zusammenhalt fördern', intro: 'Eine Stadt lebt von Menschen, die Verantwortung übernehmen, Vereine organisieren und füreinander da sind.', points: ['YouZe gemeinsam mit jungen Menschen weiterentwickeln', 'Jugendbeteiligung und Jugendforum dauerhaft stärken', 'Mehr frei zugängliche Treffpunkte für junge Menschen', 'Vereine, soziale Einrichtungen und Ehrenamt verlässlich unterstützen'] },
];

export const POLL = [
  { label: 'Innenstadt beleben', count: 128 },
  { label: 'Mehr bezahlbaren Wohnraum schaffen', count: 96 },
  { label: 'Straßen und Verkehr verbessern', count: 143 },
  { label: 'Wirtschaft und Arbeitsplätze stärken', count: 61 },
  { label: 'Schulen und Kitas modernisieren', count: 118 },
  { label: 'Ortschaften stärker berücksichtigen', count: 74 },
];

export const INSTA = [
  { likes: 247, label: 'Wahlabend' }, { likes: 266, label: 'Wochenmarkt' }, { likes: 202, label: 'Birhat Kaçar' },
  { likes: 155, label: 'Noch 4 Tage' }, { likes: 72, label: 'Manuela Bartels' }, { likes: 131, label: 'Plakatieren' },
];
