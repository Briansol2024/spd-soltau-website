// Grundwissen für neue Ratsmitglieder – ein Lernpfad in zehn Schritten, die aufeinander aufbauen (wie die Hilfevideos: 01, 02, 03 …).
// Die Texte sind unsere eigenen kurzen Einführungen; verlinkt werden nur öffentliche, frei nutzbare Quellen:
// Gesetze und Ortsrecht sind amtliche Werke (§ 5 UrhG, gemeinfrei), die Broschüren der Landes-/Bundeszentrale für politische Bildung
// und der Friedrich-Ebert-Stiftung sind kostenlos und werden verlinkt (nicht kopiert), das KommunalWiki steht unter CC BY-SA.
// Paragrafen sind Einstiegshilfen – maßgeblich ist immer der aktuelle Gesetzestext. Absätze durch Zeilenumbruch, **fett** möglich.
export const QUELLEN = {
  nkomvg: { label: 'NKomVG – Niedersächsisches Kommunalverfassungsgesetz (Volltext)', url: 'https://voris.wolterskluwer-online.de/browse/document/3c39baa1-2807-36c5-87ac-ed99466e87f7', lizenz: 'Gesetz · gemeinfrei' },
  nkomvgMi: { label: 'NKomVG als PDF beim Innenministerium', url: 'https://www.mi.niedersachsen.de/download/61951/Niedersaechsisches_Kommunalverfassungsgesetz_NKomVG_.pdf', lizenz: 'Gesetz · gemeinfrei' },
  ortsrecht: { label: 'Ortsrecht der Stadt Soltau – Hauptsatzung, Geschäftsordnung, Aufwandsentschädigungssatzung', url: 'https://www.soltau.de/home/buergerservice/ortsrecht.aspx', lizenz: 'amtlich · gemeinfrei' },
  ris: { label: 'Bürgerinformationssystem – Sitzungen, Vorlagen, Protokolle', url: 'https://ris.stadt-soltau.de/bi/infobi.asp', lizenz: 'öffentlich' },
  amtsblatt: { label: 'Amtsblatt der Stadt Soltau', url: 'https://www.soltau.de/home/aktuelles/bekanntmachungen_der_stadt_soltau.aspx', lizenz: 'amtlich · gemeinfrei' },
  lpb: { label: 'Landeszentrale für politische Bildung: Infobroschüre zur Kommunalwahl 2026 (PDF)', url: 'https://www.wahlen-in-niedersachsen.de/wp-content/uploads/2026/07/260707_LpB_Infobroschuere_Kommunalwahl_barrierefrei.pdf', lizenz: 'kostenlos' },
  bpb: { label: 'Bundeszentrale für politische Bildung: Heft „Kommunalpolitik“ (izpb 333)', url: 'https://www.bpb.de/shop/zeitschriften/izpb/kommunalpolitik-333/', lizenz: 'kostenlos · CC BY-NC-ND' },
  fes: { label: 'Friedrich-Ebert-Stiftung: Reihe „Grundwissen Kommunalpolitik“ – 15 Bände', url: 'https://www.fes.de/kommunalakademie/grundwissen-kommunalpolitik', lizenz: 'kostenlos' },
  fesAkademie: { label: 'KommunalAkademie der Friedrich-Ebert-Stiftung – Seminare für neue Ratsmitglieder', url: 'https://www.fes.de/kommunalakademie', lizenz: 'kostenlos' },
  wiki: { label: 'KommunalWiki (Heinrich-Böll-Stiftung): Einführungen in die Kommunalpolitik', url: 'https://kommunalwiki.boell.de/index.php/Einf%C3%BChrungen_in_die_Grundlagen_der_Kommunalpolitik', lizenz: 'CC BY-SA' },
  sgk: { label: 'SGK Niedersachsen – sozialdemokratische Kommunalpolitik, Seminare', url: 'https://www.sgk-niedersachsen.de/', lizenz: 'SPD-nah' },
  baugb: { label: 'Baugesetzbuch (BauGB) – Volltext', url: 'https://www.gesetze-im-internet.de/bbaug/', lizenz: 'Gesetz · gemeinfrei' },
};
const Q = (...k) => k.map(x => QUELLEN[x]);
export const STUFEN = ['Grundlagen', 'Im Rat', 'Die großen Themen', 'Weiter'];
export const GRUNDWISSEN = [
  { nr: '01', id: 'aufbau', stufe: 'Grundlagen', titel: 'Wie Soltau regiert wird', kurz: 'Rat, Verwaltungsausschuss, Bürgermeister – wer entscheidet was', minuten: 5,
    text: `Die Stadt hat drei Organe, die zusammenspielen: der **Rat** (die gewählte Vertretung, in der auch der Bürgermeister Sitz und Stimme hat), der **Verwaltungsausschuss** (der nicht öffentliche „Hauptausschuss“ aus Bürgermeister und Ratsmitgliedern) und der **Bürgermeister** als Hauptverwaltungsbeamter, der die Verwaltung leitet (§ 7 NKomVG).
Der Rat entscheidet die grundsätzlichen Dinge: Haushalt, Satzungen, Bebauungspläne, große Investitionen (§ 58). Der Verwaltungsausschuss bereitet die Ratsbeschlüsse vor und entscheidet alles, was weder dem Rat noch dem Bürgermeister zugewiesen ist (§ 76). Der Bürgermeister führt die „Geschäfte der laufenden Verwaltung“ und setzt Beschlüsse um (§ 85).
Für die Ortschaften gibt es Ortsräte oder Ortsvorsteher (§§ 90 ff.). Was genau in Soltau gilt – Zahl der Ausschüsse, Ortschaften, Wertgrenzen –, steht in der **Hauptsatzung**.`,
    quellen: Q('nkomvg', 'ortsrecht', 'lpb') },
  { nr: '02', id: 'mandat', stufe: 'Grundlagen', titel: 'Deine Rechte und Pflichten', kurz: 'Freies Mandat, Verschwiegenheit, Befangenheit, Auskunft, Entschädigung', minuten: 6,
    text: `Als Ratsmitglied hast du ein **freies Mandat**: Du entscheidest nach deiner Überzeugung und bist an keine Weisung gebunden (§ 54 NKomVG) – auch nicht an die der Fraktion. Fraktionsdisziplin ist eine politische Verabredung, keine rechtliche Pflicht.
**Verschwiegenheit**: Was in nicht öffentlicher Sitzung besprochen wird (Verwaltungsausschuss, nicht öffentliche Teile), bleibt dort (§ 40). **Mitwirkungsverbot**: Betrifft ein Beschluss dich, deine Angehörigen oder deinen Arbeitgeber unmittelbar, darfst du nicht mitberaten und nicht mitstimmen – und musst das vorher anzeigen (§ 41). Wer das übersieht, riskiert, dass der Beschluss unwirksam ist.
**Auskunft und Akteneinsicht**: Du kannst vom Bürgermeister Auskunft verlangen, die Fraktion hat Anspruch auf Akteneinsicht (§ 56). **Entschädigung**: Für Sitzungen und Aufwand gibt es eine Aufwandsentschädigung und Ersatz von Verdienstausfall (§ 55) – die Beträge stehen in der Aufwandsentschädigungssatzung der Stadt. Dein Arbeitgeber muss dich für Sitzungen freistellen.`,
    quellen: Q('nkomvg', 'ortsrecht', 'fes') },
  { nr: '03', id: 'fraktion', stufe: 'Grundlagen', titel: 'Die Fraktion', kurz: 'Was eine Fraktion darf, wie sie arbeitet – und wofür die Ratsarbeit in der App da ist', minuten: 4,
    text: `Ratsmitglieder derselben Partei schließen sich zur **Fraktion** zusammen (§ 57 NKomVG). Die Fraktion hat eigene Rechte: Sitze in den Ausschüssen nach ihrer Stärke, Antragsrecht, Akteneinsicht, Redezeit – und sie kann Mittel für ihre Arbeit bekommen.
Die **Fraktionssitzung** ist nicht öffentlich. Hier wird die Linie für die nächste Rats- und Ausschusssitzung besprochen: Wie stimmen wir? Wer spricht? Welche Anträge stellen wir? Genau dafür gibt es in der App die Bereiche **Sitzungen** (Haltung je Tagesordnungspunkt, Sitzungsmodus) und **Ratsarbeit** (Aufgaben, Dokumente, Anträge mit Abstimmung in der Fraktion).
Der **Fraktionsvorsitz** vertritt die Fraktion nach außen, koordiniert und spricht im Rat für sie – deshalb laufen Anträge über ihn.`,
    quellen: Q('nkomvg', 'fes', 'sgk') },
  { nr: '04', id: 'sitzung', stufe: 'Im Rat', titel: 'Wie eine Sitzung läuft', kurz: 'Einladung, Tagesordnung, Öffentlichkeit, Beschlussfähigkeit, Abstimmen', minuten: 6,
    text: `Der Ratsvorsitz lädt mit **Tagesordnung** ein; die Ladungsfrist steht in der Geschäftsordnung (§ 59 NKomVG). Ratssitzungen und Fachausschüsse sind **öffentlich** (§ 64) – Bürgerinnen und Bürger dürfen zuhören. Nicht öffentlich wird es nur bei Personal-, Grundstücks- oder Vertragsangelegenheiten und im Verwaltungsausschuss.
**Beschlussfähig** ist der Rat, wenn mehr als die Hälfte der Mitglieder anwesend ist (§ 65). Beschlüsse brauchen die **Mehrheit der Ja- und Nein-Stimmen**; Enthaltungen zählen nicht mit (§ 66). Bei Wahlen wird geheim abgestimmt, wenn ein Mitglied es verlangt (§ 67).
Praktisch: Vor der Sitzung die Vorlagen im Bürgerinformationssystem lesen, in der Fraktion die Haltung festlegen, in der Sitzung den **Sitzungsmodus** der App nutzen – dort steht je Punkt, was wir wollen und wer spricht. Redezeiten, Anträge zur Geschäftsordnung und den Ablauf regelt die **Geschäftsordnung des Rates**.`,
    quellen: Q('nkomvg', 'ortsrecht', 'ris') },
  { nr: '05', id: 'ausschuesse', stufe: 'Im Rat', titel: 'Ausschüsse', kurz: 'Fachausschüsse, Verwaltungsausschuss, Ausschüsse nach besonderen Vorschriften', minuten: 4,
    text: `Der Rat bildet **Fachausschüsse** – etwa für Bauen, Finanzen, Soziales, Schule und Kultur –, die Beschlüsse vorbereiten und in Fachfragen beraten (§ 71 NKomVG). Die aktuelle Liste der Soltauer Ausschüsse steht im Bürgerinformationssystem. Die Sitze werden nach dem Stärkeverhältnis der Fraktionen verteilt; die Fraktion benennt ihre Mitglieder und kann, soweit Gesetz und Hauptsatzung das zulassen, auch sachkundige Personen entsenden, die nicht im Rat sitzen.
Der **Verwaltungsausschuss** ist der wichtigste Ausschuss (§§ 74–76): nicht öffentlich, bereitet alle Ratsbeschlüsse vor und entscheidet vieles selbst. Daneben gibt es Ausschüsse **nach besonderen Rechtsvorschriften** (zum Beispiel den Jugendhilfeausschuss), für die eigene Gesetze gelten.
Für uns heißt das: In jedem Ausschuss sitzt jemand von uns – die Ausschussmitglieder berichten in der Fraktion. Dafür gibt es in der Ratsarbeit die Bereiche je Ausschuss.`,
    quellen: Q('nkomvg', 'ortsrecht', 'fes') },
  { nr: '06', id: 'antraege', stufe: 'Im Rat', titel: 'Anträge, Anfragen, Bürgerbeteiligung', kurz: 'Wie ein Antrag in den Rat kommt – und wie Bürgerinnen und Bürger mitreden', minuten: 5,
    text: `Ein **Antrag** ist der Weg, etwas auf die Tagesordnung zu bringen: Beschlussvorschlag plus Begründung, schriftlich an den Bürgermeister zur Weiterleitung an das zuständige Gremium (Form und Fristen: Geschäftsordnung). Die Verwaltung erstellt dazu eine Vorlage mit Stellungnahme; beraten wird meist zuerst im Fachausschuss, beschlossen im Rat oder Verwaltungsausschuss.
**Anfragen** klären Sachverhalte („Wann wird der Radweg saniert?“) – mündlich in der Sitzung oder schriftlich; die Verwaltung muss antworten.
Auch Einwohnerinnen und Einwohner können Themen setzen: **Einwohnerantrag** (§ 31 NKomVG), **Bürgerbegehren und Bürgerentscheid** (§§ 32, 33), **Einwohnerfragestunde** in Ratssitzungen und die öffentliche Auslegung bei Bebauungsplänen. In der App schreiben Fraktionsmitglieder Anträge unter Ratsarbeit → Anträge (mit Druckvorlage), alle Mitglieder bringen **Ideen** ein.`,
    quellen: Q('nkomvg', 'ortsrecht', 'wiki') },
  { nr: '07', id: 'haushalt', stufe: 'Die großen Themen', titel: 'Den Haushalt lesen', kurz: 'Ergebnis- und Finanzhaushalt, Investitionen, Kredite – was der Rat entscheidet', minuten: 7,
    text: `Der **Haushaltsplan** ist das wichtigste Steuerungsinstrument des Rates (§§ 110 ff. NKomVG). Niedersachsen bucht doppisch, also wie ein Unternehmen: Der **Ergebnishaushalt** zeigt Erträge und Aufwendungen (kommt die Stadt im Jahr über die Runden?), der **Finanzhaushalt** die tatsächlichen Zahlungen und die **Investitionen** (Schulen, Straßen, Kita-Neubau). Dazu kommen Stellenplan und Wirtschaftspläne der Eigenbetriebe.
Der Rat beschließt die **Haushaltssatzung** mit dem Plan – meist zum Jahresende. Die Kommunalaufsicht (der Landkreis) prüft sie und genehmigt die genehmigungspflichtigen Teile, etwa Kredite. Bis der Haushalt gilt, herrscht vorläufige Haushaltsführung: nur Pflichtausgaben.
Lesetipp: erst den Vorbericht des Kämmerers, dann die Zusammenfassung von Ergebnis- und Finanzhaushalt, dann die Investitionsliste – dort stehen die politischen Entscheidungen. Die Haushaltssatzung wird im Amtsblatt bekannt gemacht, der Plan liegt öffentlich aus.`,
    quellen: Q('nkomvg', 'amtsblatt', 'fes', 'bpb') },
  { nr: '08', id: 'bauen', stufe: 'Die großen Themen', titel: 'Planen und Bauen', kurz: 'Flächennutzungsplan, Bebauungsplan, Beteiligung – der häufigste Stoff im Rat', minuten: 6,
    text: `Viele Ratsvorlagen drehen sich um **Bauleitplanung** nach dem Baugesetzbuch: Der **Flächennutzungsplan** legt grob fest, was wo möglich ist (Wohnen, Gewerbe, Grün); der **Bebauungsplan** regelt verbindlich für ein Gebiet, was gebaut werden darf. Beide beschließt der Rat.
Der Weg: Aufstellungsbeschluss → frühzeitige Beteiligung → Entwurf → **öffentliche Auslegung** (in der Regel ein Monat, § 3 BauGB – hier kann jede und jeder Stellung nehmen; auf unserer Website unter „Jetzt mitreden“) → Abwägung der Stellungnahmen → Satzungsbeschluss → Bekanntmachung im Amtsblatt. Der Bauausschuss bereitet vor, der Rat entscheidet.
Worauf wir achten: Wurden Einwände ernsthaft abgewogen? Was sagen Umwelt- und Verkehrsgutachten? Was kostet es die Stadt (Erschließung, Folgekosten)? Und passt das Vorhaben zu unseren Zielen – Wohnen, Klima, Ortschaften?`,
    quellen: Q('baugb', 'ris', 'fes') },
  { nr: '09', id: 'verwaltung', stufe: 'Die großen Themen', titel: 'Rat und Verwaltung', kurz: 'Wie man mit dem Rathaus zusammenarbeitet – und wo die Grenzen sind', minuten: 4,
    text: `Der Rat **entscheidet und kontrolliert**, die Verwaltung **bereitet vor und führt aus**. Der Bürgermeister leitet die Verwaltung und ist zugleich Vorsitzender des Verwaltungsausschusses. Beschlüssen, die gegen geltendes Recht verstoßen, muss er widersprechen; Beschlüssen, die dem Wohl der Stadt schaden, kann er widersprechen (§ 88 NKomVG).
Gute Ratsarbeit heißt: Fragen früh und sachlich stellen (Anfrage, Gespräch mit der Fachbereichsleitung), Vorlagen genau lesen, Alternativen als Antrag formulieren statt nur zu kritisieren – und Ergebnisse festhalten (in der App unter Sitzungen → Ergebnis). Einzelne Ratsmitglieder haben kein Weisungsrecht gegenüber den Beschäftigten der Stadt; der Weg führt immer über Gremium oder Bürgermeister.
Termine, Vorlagen und Protokolle stehen im Bürgerinformationssystem; das Amtsblatt veröffentlicht Satzungen und Bekanntmachungen.`,
    quellen: Q('nkomvg', 'ris', 'amtsblatt') },
  { nr: '10', id: 'lernen', stufe: 'Weiter', titel: 'Weiterlernen', kurz: 'Kostenlose Broschüren, Seminare und Nachschlagewerke', minuten: 3,
    text: `Für den Einstieg reichen drei Dinge: die **Infobroschüre der Landeszentrale** zur Kommunalwahl 2026 (kurz, verständlich, für Niedersachsen), das **Heft „Kommunalpolitik“ der Bundeszentrale** und die Reihe **„Grundwissen Kommunalpolitik“ der Friedrich-Ebert-Stiftung** – 15 kostenlose Bände, darunter „Rats- und Fraktionsarbeit“, „Der kommunale Haushalt“ und „Planen und Bauen“.
Wer es praktisch mag: Die **KommunalAkademie der FES** und die **SGK Niedersachsen** bieten Seminare speziell für neue Ratsmitglieder. Das **KommunalWiki** der Böll-Stiftung ist ein gutes Nachschlagewerk.
Und Fragen an die Fraktion sind immer erlaubt – dafür gibt es die Fraktionssitzung, den Stammtisch und die WhatsApp-Gruppe.`,
    quellen: Q('lpb', 'bpb', 'fes', 'fesAkademie', 'sgk', 'wiki') },
];
// Checkliste für die ersten Wochen – zum Abhaken auf der Übersicht
export const ERSTE_SCHRITTE = [
  'Verpflichtung in der konstituierenden Sitzung – ab dann gilt die Verschwiegenheit für nicht öffentliche Beratungen.',
  'Zugang zum Bürgerinformationssystem (Ratsinfo) bei der Stadt beantragen; Sitzungskalender in der App abonnieren.',
  'Aufwandsentschädigung: Bankverbindung angeben und Freistellung beim Arbeitgeber klären.',
  'In der Fraktion klären: Wer sitzt in welchem Ausschuss? Termine, WhatsApp-Gruppe, Ratsarbeit in der App.',
  'Die ersten Vorlagen des eigenen Ausschusses lesen und Fragen für die Fraktionssitzung notieren.',
  'Die Broschüre der Landeszentrale (Thema 10) einmal durchlesen – eine halbe Stunde, dann kennst du die Grundbegriffe.',
];
export const themaById = id => GRUNDWISSEN.find(t => t.id === id);
