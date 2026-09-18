// Hilfe & Anleitungen für alle Mitglieder (Vorstands-Werkzeuge erklärt der Vorstand persönlich): Themen, Reihenfolge und Schritt-Texte –
// eine Quelle für die Hilfeseite (Text) und die Hilfevideos
// (video/hilfe/record.mjs zeichnet je Thema und Plattform ein Video mit genau diesen Schritten als Untertitel auf).
//
// Platzhalter in den Schritten werden je Plattform ersetzt:
//   {tippe} Tippe/Klicke · {tipp} Tipp/Klick · {leiste} „unten in der Leiste“/„links in der Seitenleiste“ · {mehr} „Mehr“-Knopf/Seitenleiste
// Schritte können je Plattform abweichen: steps.alle (Standard) und/oder steps.android/ios/windows/macos.

export const PLATFORMS = [
  ['android', 'Android', 'Handy oder Tablet mit Android (Chrome)'],
  ['ios', 'iPhone / iPad', 'iPhone oder iPad (Safari)'],
  ['windows', 'Windows', 'PC oder Laptop mit Windows (Chrome oder Edge)'],
  ['macos', 'Mac', 'Mac (Safari oder Chrome)'],
];
export const isMobile = p => p === 'android' || p === 'ios';

const T = {
  android: { tippe: 'Tippe', tipp: 'Tipp', leiste: 'unten in der Leiste', mehr: '„Mehr“ unten rechts', geraet: 'Handy' },
  ios: { tippe: 'Tippe', tipp: 'Tipp', leiste: 'unten in der Leiste', mehr: '„Mehr“ unten rechts', geraet: 'iPhone' },
  windows: { tippe: 'Klicke', tipp: 'Klick', leiste: 'links in der Seitenleiste', mehr: 'die Seitenleiste links', geraet: 'PC' },
  macos: { tippe: 'Klicke', tipp: 'Klick', leiste: 'links in der Seitenleiste', mehr: 'die Seitenleiste links', geraet: 'Mac' },
};
// Platzhalter mitten im Satz werden kleingeschrieben („Zum Zusagen tippe auf …“), am Satzanfang groß
export const fill = (text, platform) => text.replace(/\{(\w+)\}/g, (m, k, offset) => {
  const v = (T[platform] || T.android)[k]; if (v === undefined) return m;
  const before = text.slice(0, offset).trim();
  const start = !before || /[.!?:–]$/.test(before);
  return start ? v : v.charAt(0).toLowerCase() + v.slice(1);
});

// Schritte eines Themas für eine Plattform (mit ersetzten Platzhaltern)
export const stepsFor = (topic, platform) => (topic.steps[platform] || topic.steps.alle || []).map(s => fill(s, platform));

export const HELP_TOPICS = [
  {
    n: '01', id: 'registrieren', group: 'Erste Schritte', title: 'Registrieren und Anmelden',
    intro: 'Ein Konto anlegen, die E-Mail-Adresse bestätigen, vom Vorstand freischalten lassen – und dann anmelden.',
    steps: { alle: [
      'Öffne den Mitgliederbereich und {tippe} oben auf „Registrieren“.',
      'Trage Vorname, Nachname, E-Mail-Adresse und ein Passwort mit mindestens 8 Zeichen ein.',
      'Bestätige die Datenschutzhinweise und {tippe} auf „Registrieren“.',
      'Du bekommst eine E-Mail mit einem Code. Gib den Code ein und {tippe} auf „Bestätigen“.',
      'Jetzt prüft der Vorstand, dass du Mitglied bist, und schaltet dich frei. Du bekommst eine E-Mail.',
      'Danach: E-Mail-Adresse und Passwort eingeben und auf „Anmelden“ {tippe}n – fertig.',
      'Passwort vergessen? Über „Passwort vergessen“ bekommst du einen Link zum Zurücksetzen.',
    ] },
  },
  {
    n: '02', id: 'installieren', group: 'Erste Schritte', title: 'Die App installieren',
    intro: 'Die SPD Soltau App kommt ohne App-Store aufs Gerät: direkt aus dem Browser auf den Startbildschirm bzw. ins Startmenü.',
    steps: {
      android: [
        'Öffne spd-soltau.de/mitglieder/ in Chrome und melde dich an.',
        'Tippe rechts oben in Chrome auf die drei Punkte.',
        'Tippe im Menü auf „App installieren“ (oder „Zum Startbildschirm hinzufügen“).',
        'Bestätige mit „Installieren“. Das Symbol „SPD Soltau“ liegt jetzt auf deinem Startbildschirm.',
        'Öffne die App über das Symbol – angemeldete Mitglieder landen direkt im Mitgliederbereich.',
      ],
      ios: [
        'Öffne spd-soltau.de/mitglieder/ in Safari und melde dich an.',
        'Tippe unten in der Mitte auf das Teilen-Symbol (Viereck mit Pfeil nach oben).',
        'Wische im Menü nach unten und tippe auf „Zum Home-Bildschirm“.',
        'Tippe rechts oben auf „Hinzufügen“. Das Symbol „SPD Soltau“ liegt jetzt auf deinem Home-Bildschirm.',
        'Öffne die App über das Symbol – nur so bekommst du auf dem iPhone auch Push-Nachrichten.',
      ],
      windows: [
        'Öffne spd-soltau.de/mitglieder/ in Chrome oder Edge und melde dich an.',
        'Klicke rechts in der Adressleiste auf das Installieren-Symbol (Bildschirm mit Pfeil).',
        'Bestätige mit „Installieren“. Die App öffnet sich in einem eigenen Fenster.',
        'Du findest „SPD Soltau“ jetzt im Startmenü – bei Bedarf an die Taskleiste anheften.',
      ],
      macos: [
        'Öffne spd-soltau.de/mitglieder/ in Safari und melde dich an.',
        'Klicke in der Menüleiste auf „Ablage“ und dann auf „Zum Dock hinzufügen“.',
        'Bestätige mit „Hinzufügen“. Die App liegt jetzt im Dock und öffnet sich in einem eigenen Fenster.',
        'In Chrome geht es genauso: Installieren-Symbol rechts in der Adressleiste, dann „Installieren“.',
      ],
    },
  },
  {
    n: '03', id: 'benachrichtigungen', group: 'Erste Schritte', title: 'Benachrichtigungen einschalten',
    intro: 'Neue Termine, Erinnerungen am Vortag, Umfragen und Nachrichten des Vorstands kommen als Push-Nachricht aufs Gerät.',
    steps: {
      alle: [
        'Öffne {mehr} und {tippe} auf „Mein Profil“.',
        'Unter „Aufs Handy“ schaltest du „Benachrichtigungen auf diesem Gerät“ ein.',
        'Dein Gerät fragt nach der Erlaubnis – {tippe} auf „Zulassen“.',
        'Jetzt wählst du die Themen: Aktuelles, Termine und Mitglieder-Infos. Fertig – die Auswahl ist sofort gespeichert.',
        'Ausschalten geht jederzeit über denselben Schalter.',
      ],
      ios: [
        'Wichtig: Auf dem iPhone gibt es Push-Nachrichten nur in der installierten App (siehe Video 02).',
        'Öffne die App, tippe auf „Mehr“ unten rechts und dann auf „Mein Profil“.',
        'Unter „Aufs Handy“ schaltest du „Benachrichtigungen auf diesem Gerät“ ein und bestätigst die Frage des iPhones mit „Erlauben“.',
        'Jetzt wählst du die Themen: Aktuelles, Termine und Mitglieder-Infos.',
        'Ausschalten geht jederzeit an derselben Stelle – oder in den iPhone-Einstellungen unter „Mitteilungen“.',
      ],
    },
  },
  {
    n: '04', id: 'ueberblick', group: 'Erste Schritte', title: 'Die App im Überblick',
    intro: 'Wo ist was: Start, die Leiste, „Mehr“ und der Weg zur Website.',
    steps: {
      alle: [
        'Nach der Anmeldung siehst du „Start“: die nächsten Termine, offene Umfragen, neue Dokumente und Geburtstage.',
        'Die wichtigsten Bereiche findest du {leiste}: Start, Termine, Umfragen und Dokumente.',
        'Über {mehr} erreichst du alle weiteren Bereiche: Dokumente, Ratsvorbereitung, Mitglieder, Profil und mehr.',
        'Der Globus-Knopf oben rechts bringt dich zur Website. Über den schwarzen Streifen „Zurück zum Mitgliederbereich“ kommst du wieder in die App.',
        'Deine Initialen oben rechts führen zu deinem Profil. Abmelden findest du ganz unten in der Bereichsliste.',
      ],
    },
  },
  {
    n: '05', id: 'zusagen', group: 'Termine', title: 'Termine: zusagen und absagen',
    intro: 'Mit einem Tipp sagst du zu oder ab – so weiß der Vorstand, mit wie vielen er rechnen kann.',
    steps: { alle: [
      '{tippe} {leiste} auf „Termine“.',
      'Bei jedem Termin siehst du Datum, Uhrzeit, Ort und für wen er ist (Öffentlich, Rat, Mitglieder, Fraktion, Vorstand).',
      'Zum Zusagen {tippe} auf „Ich komme“. Dein Name erscheint bei den Zusagen.',
      'Kannst du nicht? {tippe} auf „Ich kann nicht“ – optional mit Grund, den nur der Vorstand sieht.',
      'Umentschieden? Einfach den anderen Knopf {tippe}n. Am Vortag erinnert dich die App per Push.',
    ] },
  },
  {
    n: '06', id: 'helfen', group: 'Termine', title: 'Helferlisten: mithelfen',
    intro: 'Infostand, Sommerfest, Plakate – in Helferlisten trägst du dich für eine Schicht ein.',
    steps: { alle: [
      '{tippe} {leiste} auf „Termine“. Helferlisten hängen direkt am jeweiligen Termin.',
      'Jede Schicht zeigt Zeit, wie viele Plätze es gibt und wer schon dabei ist.',
      '{tippe} bei einer Schicht auf „Ich helfe mit“ – dein Name steht sofort in der Liste.',
      'Doch keine Zeit? {tippe} erneut auf den Knopf, dann bist du wieder ausgetragen.',
      'Listen ohne festen Termin findest du weiter unten unter „Weitere Helferlisten“.',
    ] },
  },
  {
    n: '07', id: 'mitfahren', group: 'Termine', title: 'Fahrgemeinschaften',
    intro: 'Plätze anbieten oder eine Mitfahrt suchen – direkt am Termin.',
    steps: { alle: [
      '{tippe} bei einem Termin auf „Mitfahren“.',
      'Wähle „biete Plätze an“ oder „suche eine Mitfahrt“, trage deinen Ortsteil und die Abfahrtszeit ein.',
      '{tippe} auf „Eintragen“. Alle Mitglieder sehen jetzt deinen Eintrag mit deinem Namen.',
      'Mit dem WhatsApp-Knopf schickst du dein Angebot auch in eure Gruppe. Löschen geht jederzeit über „löschen“.',
    ] },
  },
  {
    n: '08', id: 'kalender', group: 'Termine', title: 'Kalender abonnieren',
    intro: 'Alle Termine automatisch im eigenen Kalender – neue Termine erscheinen von selbst.',
    steps: {
      android: [
        'Tippe unten auf „Termine“ und wische ganz nach unten zu „Kalender abonnieren“.',
        'Tippe auf „Adresse kopieren“.',
        'Öffne den Google Kalender im Browser (calendar.google.com): links bei „Weitere Kalender“ auf „+“ und „Per URL“.',
        'Füge die Adresse ein und tippe auf „Kalender hinzufügen“. Die Termine erscheinen auch in der Kalender-App auf dem Handy.',
      ],
      ios: [
        'Tippe unten auf „Termine“ und wische ganz nach unten zu „Kalender abonnieren“.',
        'Tippe auf „Alle Termine (Mitglieder)“.',
        'Das iPhone fragt „Kalender abonnieren?“ – tippe auf „Abonnieren“ und dann auf „Fertig“.',
        'Die SPD-Termine stehen jetzt in deiner Kalender-App und aktualisieren sich von selbst.',
      ],
      windows: [
        'Klicke links auf „Termine“ und scrolle ganz nach unten zu „Kalender abonnieren“.',
        'Klicke auf „Adresse kopieren“.',
        'In Outlook: Kalender → „Kalender hinzufügen“ → „Aus dem Internet abonnieren“, Adresse einfügen, „Importieren“.',
        'Im Google Kalender: „Weitere Kalender“ → „+“ → „Per URL“, Adresse einfügen, „Kalender hinzufügen“.',
      ],
      macos: [
        'Klicke links auf „Termine“ und scrolle ganz nach unten zu „Kalender abonnieren“.',
        'Klicke auf „Alle Termine (Mitglieder)“ – die Kalender-App öffnet sich.',
        'Bestätige mit „Abonnieren“ und dann mit „OK“. Tipp: „Automatisch aktualisieren“ auf „Jeden Tag“ stellen.',
        'Die SPD-Termine stehen jetzt im Kalender – und mit iCloud auch auf iPhone und iPad.',
      ],
    },
  },
  {
    n: '09', id: 'umfragen', group: 'Mitmachen', title: 'Umfragen: abstimmen',
    intro: 'Sommerfest-Termin, Themen für den Rat, Meinungsbild – mit einem Tipp stimmst du ab.',
    steps: { alle: [
      '{tippe} {leiste} auf „Umfragen“ – oder direkt auf eine offene Umfrage auf der Startseite.',
      '{tippe} auf deine Antwort – die Stimme zählt sofort und du siehst das Zwischenergebnis.',
      'Bei Mehrfachauswahl hakst du mehrere Antworten an – dann {tippe} auf „Auswahl speichern“.',
      'Du kannst deine Stimme bis zum Ende der Umfrage noch ändern. Abgeschlossene Umfragen stehen darunter.',
    ] },
  },
  {
    n: '10', id: 'dokumente', group: 'Mitmachen', title: 'Dokumente und Ratsvorbereitung',
    intro: 'Protokolle, Anträge, Vorlagen – und die Tagesordnung der nächsten Ratssitzung mit der Einordnung der Fraktion.',
    steps: { alle: [
      'Öffne {mehr} und {tippe} auf „Dokumente“.',
      'Die Dokumente sind nach Art sortiert: Protokolle, Anträge, Beschlüsse, Vorlagen. {tippe} auf einen Titel, um es zu öffnen.',
      'Über {mehr} findest du auch „Ratsvorbereitung“.',
      'Dort steht die Tagesordnung der nächsten Sitzung – jeder Punkt mit der Einordnung der SPD-Fraktion.',
    ] },
  },
  {
    n: '11', id: 'profil', group: 'Mitmachen', title: 'Mitglieder und mein Profil',
    intro: 'Wer ist wer im Ortsverein – und welche Angaben du selbst freigibst.',
    steps: { alle: [
      'Öffne {mehr} und {tippe} auf „Mitglieder“.',
      'Du siehst alle Mitglieder mit ihrer Rolle (Vorstand, Rat, Fraktion) und den Kontaktdaten, die sie freigegeben haben.',
      'Öffne {mehr} und {tippe} auf „Mein Profil“.',
      'Hier trägst du Ortsteil, Telefon, Geburtstag oder Eintrittsjahr ein – und entscheidest je Angabe, ob andere sie sehen.',
      '{tippe} auf „Profil speichern“. Geburtstage mit Freigabe erscheinen auf der Startseite.',
    ] },
  },
  {
    n: '12', id: 'whatsapp', group: 'Mitmachen', title: 'Per WhatsApp teilen',
    intro: 'Termine, Helferlisten und Umfragen mit einem Tipp in eure WhatsApp-Gruppe schicken.',
    steps: { alle: [
      'Bei jedem Termin, jeder Helferliste und jeder Umfrage gibt es einen „WhatsApp“-Knopf.',
      '{tippe} darauf – WhatsApp öffnet sich mit einem fertigen Text und dem Link in die App.',
      'Wähle die Gruppe oder Person aus und schicke die Nachricht ab.',
      'Wer den Link antippt, landet direkt beim Termin oder der Liste und kann zusagen oder sich eintragen.',
      'Die Einladungslinks eurer Gruppen findest du auf der Startseite unter „Unsere WhatsApp-Gruppen“.',
    ] },
  },
  {
    n: '13', id: 'website', group: 'Mitmachen', title: 'Zur Website und zurück',
    intro: 'Website und Mitgliederbereich sind getrennt – so wechselst du zwischen beiden.',
    steps: { alle: [
      '{tippe} oben rechts auf den Globus „Website“.',
      'Die Website öffnet sich – mit Aktuelles, Terminen, Fraktion, Roter Bahnhof und Kontakt.',
      'Oben bleibt ein schwarzer Streifen: „Zurück zum Mitgliederbereich“. Ein {tipp} bringt dich in die App zurück.',
      'Auf der Website führt das Personen-Symbol oben rechts ebenfalls in den Mitgliederbereich.',
    ] },
  },
];

export const topicById = id => HELP_TOPICS.find(t => t.id === id);
export const videoName = (topic, platform) => `${topic.n}-${topic.id}-${platform}`;
export const posterName = (topic, portrait = false) => `${topic.n}-${topic.id}${portrait ? '-hoch' : ''}`;
// Plattform des aktuellen Geräts erraten
export function guessPlatform(ua = navigator.userAgent, touch = navigator.maxTouchPoints > 1) {
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua) || (/mac/i.test(ua) && touch)) return 'ios';
  if (/mac/i.test(ua)) return 'macos';
  return 'windows';
}
