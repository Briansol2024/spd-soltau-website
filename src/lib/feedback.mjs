// Wünsche & Ideen zur App und zur Website – Vorauswahl, gemeinsam für den Mitgliederbereich (Formular) und den
// Push-Dienst (E-Mail an den Betreuer der Website). Jeder Eintrag landet in der Wix-Sammlung `Feedback`; der Dienst
// schickt ihn per E-Mail an FEEDBACK_EMAIL (in .env überschreibbar) und setzt danach status = 'zugestellt'.

export const FEEDBACK_EMAIL = 'weber.soltau@gmail.com';
export const FEEDBACK_NAME = 'Brian Weber';

export const WO = [['app', 'App (Mitgliederbereich)'], ['website', 'Website spd-soltau.de'], ['beides', 'Beides / weiß nicht']];
export const WAS = [['fehlt', 'Funktion fehlt'], ['fehler', 'Fehler'], ['kompliziert', 'Zu kompliziert'], ['inhalt', 'Text / Inhalt'], ['design', 'Design'], ['lob', 'Lob'], ['sonstiges', 'Sonstiges']];
export const PRIO = [['nett', 'Wäre nett'], ['wichtig', 'Wichtig'], ['dringend', 'Dringend']];
export const BEREICHE = [
  ['App', ['Start', 'Termine & Kalender', 'Mitfahren', 'Umfragen', 'Ideen', 'Versammlungen', 'Dokumente & Grundwissen', 'Mitgliederverzeichnis', 'Sitzungen', 'Ratsarbeit', 'Vorstand', 'Profil & Push', 'Hilfe & Anleitungen']],
  ['Website', ['Startseite', 'Aktuelles', 'Termine', 'Rat & Rathaus', 'Ziele', 'Mitmachen', 'Kontakt', 'Newsletter', 'Sonstiges']],
];
// Was der Textkasten je nach Auswahl fragt
export const HINWEIS = {
  fehlt: 'Was fehlt dir? Wofür würdest du es nutzen? Ein, zwei Sätze reichen.',
  fehler: 'Was hast du gemacht, was ist passiert – und was hättest du erwartet?',
  kompliziert: 'Wo bist du hängen geblieben? Was war unklar?',
  inhalt: 'Welcher Text oder welche Angabe stimmt nicht – und wie soll es richtig heißen?',
  design: 'Was gefällt dir nicht – und hast du ein Beispiel, wie es besser aussehen könnte?',
  lob: 'Was gefällt dir? Das lesen wir auch gern. 🌹',
  sonstiges: 'Schreib einfach, was dir auf dem Herzen liegt.',
};
export const label = (list, k) => (list.find(([x]) => x === k) || [])[1] || k || '';
