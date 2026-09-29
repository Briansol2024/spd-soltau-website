/* Erkennt Formular-Spam in den Anfragen.
 *
 * ANLASS (29.09.2026, 01:39 Uhr): Zwei Einsendungen in derselben Minute, über
 * zwei verschiedene Formulare, jedes Freitextfeld Buchstabensalat, beide Male
 * dieselbe Gmail-Adresse mit eingestreuten Punkten. Ein Bot, der prüft, ob die
 * Formulare funktionieren. Wenn ja, kommt später der echte Spam.
 *
 * WARUM DIE PRÜFUNG HIER UND NICHT IM BROWSER STEHT
 * Die Formulare schreiben mit einem anonymen Besucher-Token direkt in die
 * Wix-Sammlung. Der dafür nötige Schlüssel steht zwangsläufig im Quelltext der
 * Seite - sonst könnte kein Besucher etwas abschicken. Wer ihn liest, schreibt
 * ohne unsere Seite. Eine Honigfalle im Browser hilft dagegen nicht; sie fängt
 * nur die Bots, die tatsächlich das Formular ausfüllen. Gegen den Rest hilft
 * nur eine Prüfung beim Ankommen - und die läuft im Push-Dienst.
 *
 * DER GRUNDSATZ: LIEBER EINEN SPAM DURCHLASSEN ALS EIN ANLIEGEN WEGWERFEN.
 * Ein übersehenes Bürgeranliegen ist ein echter Schaden, eine Spam-Zeile im
 * Eingang nur lästig. Deshalb entscheidet nicht ein einzelnes Merkmal, sondern
 * eine Summe: Es müssen mindestens zwei unabhängige Auffälligkeiten
 * zusammenkommen. Und nichts wird gelöscht - der Status wird auf „spam"
 * gesetzt, die Zeile bleibt im Wix-Dashboard nachlesbar.
 */

/** Ab dieser Punktzahl gilt eine Anfrage als Spam. Zwei starke Merkmale. */
export const SCHWELLE = 4;

/**
 * Sieht ein Wort maschinell erzeugt aus?
 *
 * Das treffsicherste Merkmal ist der ständige Wechsel zwischen Groß- und
 * Kleinbuchstaben INNERHALB eines Wortes. „uYzEzVwfKYFdFbAcwJrxEPV" wechselt
 * 15-mal auf 23 Zeichen. Ein deutscher Name wechselt ein- bis zweimal
 * („McDonald", „DeVries"), ein Ortsname meist gar nicht. Zusätzlich zählt eine
 * lange Kette ohne Selbstlaut: „wzkzkKFP" hat acht Konsonanten am Stück, im
 * Deutschen sind vier die Ausnahme („Angstschweiß").
 */
export function zufallszeichen(wort) {
  const w = String(wort || '').trim();
  if (w.length < 10) return false;               // kurze Wörter sind zu unsicher
  if (/\s/.test(w)) return false;                // mehrere Wörter: einzeln prüfen
  if (!/^[A-Za-zÄÖÜäöüß-]+$/.test(w)) return false;

  let wechsel = 0;
  for (let i = 1; i < w.length; i += 1) {
    const a = w[i - 1], b = w[i];
    const aGross = a === a.toUpperCase() && a !== a.toLowerCase();
    const bGross = b === b.toUpperCase() && b !== b.toLowerCase();
    if (aGross !== bGross) wechsel += 1;
  }
  if (wechsel >= 4 && wechsel / w.length >= 0.35) return true;

  // Zufallsketten in Kleinschrift verraten sich anders: durch Konsonanten.
  // Die Schwellen sind nachgemessen und bewusst hoch, weil Deutsch
  // konsonantenreicher ist, als man denkt: „Ratsentscheidung" hat mit „ntsch"
  // fünf am Stück, „Angstschweiss" mit „ngstschw" acht, und „Schwarmstedt"
  // kommt auf nur 17 Prozent Selbstlaute. Alle drei hatten meine ersten
  // Schwellen fälschlich als Salat gemeldet. Neun am Stück schafft ein
  // deutsches Wort praktisch nicht mehr - eine Zufallskette mühelos.
  if (/[bcdfghjklmnpqrstvwxyzß]{9,}/i.test(w)) return true;

  const selbstlaute = (w.match(/[aeiouäöüy]/gi) || []).length;
  if (w.length >= 12 && selbstlaute / w.length < 0.12) return true;

  return false;
}

/** Ein ganzer Text gilt als Salat, wenn seine langen Wörter es sind. */
export function textIstSalat(text) {
  const woerter = String(text || '').trim().split(/\s+/).filter(w => w.length >= 10);
  if (!woerter.length) return false;
  return woerter.every(zufallszeichen);
}

/**
 * Ein Postfach auf seine wahre Form bringen.
 *
 * Gmail überliest Punkte im Namensteil und alles hinter einem Plus. Aus
 * „z.it.a.miz1.2.2@gmail.com" wird damit „zitamiz122@gmail.com" - und zwei
 * scheinbar verschiedene Absender sind derselbe. Genau dieser Trick stand in
 * den beiden Einsendungen vom 29.09.2026.
 */
export function postfach(adresse) {
  const a = String(adresse || '').trim().toLowerCase();
  const [name = '', wirt = ''] = a.split('@');
  if (!wirt) return a;
  let n = name.split('+')[0];
  if (/^(gmail|googlemail)\.com$/.test(wirt)) n = n.replace(/\./g, '');
  return `${n}@${wirt.replace(/^googlemail\.com$/, 'gmail.com')}`;
}

/**
 * Eine Anfrage bewerten.
 *
 * @param {object} a       die Zeile aus der Sammlung `Anfragen`
 * @param {object[]} umfeld andere Anfragen zum Vergleich (für Wiederholungen)
 * @returns {{punkte:number, gruende:string[], spam:boolean}}
 */
export function bewerten(a, umfeld = []) {
  const gruende = [];
  let punkte = 0;
  const zaehlen = (p, grund) => { punkte += p; gruende.push(grund); };

  const name = a.name || '';
  const ort = a.ort || '';
  const nachricht = a.nachricht || a.interesse || '';

  if (zufallszeichen(name)) zaehlen(2, 'Name ist Buchstabensalat');
  if (zufallszeichen(ort)) zaehlen(2, 'Wohnort ist Buchstabensalat');
  if (textIstSalat(nachricht)) zaehlen(2, 'Nachricht ist Buchstabensalat');

  // Dasselbe Postfach mehrfach in kurzer Zeit - egal wie es geschrieben wurde.
  const meins = postfach(a.email);
  if (meins) {
    const zeit = new Date(a._createdDate || Date.now()).getTime();
    const gleiche = umfeld.filter(x =>
      x._id !== a._id
      && postfach(x.email) === meins
      && Math.abs(new Date(x._createdDate || 0).getTime() - zeit) < 24 * 3600 * 1000);
    if (gleiche.length >= 1) {
      zaehlen(2, `dasselbe Postfach ${gleiche.length + 1}-mal binnen eines Tages`);
    }
  }

  // Eine Nachricht, die aus einem einzigen langen Wort ohne Leerzeichen besteht
  const roh = String(nachricht).trim();
  if (roh.length >= 10 && !/\s/.test(roh)) zaehlen(1, 'Nachricht ohne ein einziges Leerzeichen');

  // Klassischer Werbespam: Links in einer Erstanfrage
  if (/https?:\/\/|\[url=|<a\s/i.test(roh)) zaehlen(1, 'Link in der Nachricht');

  // Kyrillisch oder CJK in einer Anfrage an einen Ortsverein in der Heide
  if (/[Ѐ-ӿ一-鿿]/.test(`${name} ${ort} ${roh}`)) zaehlen(1, 'fremdes Schriftsystem');

  return { punkte, gruende, spam: punkte >= SCHWELLE };
}
