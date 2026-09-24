// Filmdreh (Regie-Modus) – gemeinsam für App und Push-Dienst: wer dazugehört, Projektarten, Overlay-Bausteine
// Wer darf Filme bestellen? Das entscheidet die Wix-Rolle, nicht eine Liste von Adressen:
// Wer den Wix-Auftritt bearbeiten darf (Owner oder Contributor), gehört zum Filmteam.
// So steht keine private Adresse im Code, der an jeden Browser ausgeliefert wird.
export const FILM_ROLLEN = ['owner', 'contributor'];
export const imFilmteam = rollen => (rollen || []).some(r => FILM_ROLLEN.includes(String(r).toLowerCase()));
export const FILM_ARTEN = [['reel', 'Reel / Kurzvideo'], ['story', 'Story'], ['ratsbericht', 'Ratsbericht-Video'], ['hilfe', 'Hilfe-/Erklärvideo'], ['sonstiges', 'Sonstiges']];
export const FILM_STATUS = [['idee', 'Idee'], ['skript', 'Skript'], ['dreh', 'Dreh'], ['schnitt', 'Schnitt'], ['online', 'Online']];
// Overlay-Bausteine der Bühne (video/insta/stage.html): Feld → Adressparameter
export const OVERLAY_TYPEN = [
  { id: 'gross', name: 'Großer Text', dauer: 4, felder: [['label', 'Kleine Zeile darüber (optional)', 'text'], ['text', 'Text – Zeilen mit | trennen, *rot* für Rot', 'text'], ['pos', 'Position', 'select', ['oben', 'Oben'], ['', 'Mitte'], ['unten', 'Unten']], ['gr', 'Größe', 'select', ['m', 'Normal'], ['xl', 'Riesig']]], beispiel: { label: 'Ratssitzung 01.10.', text: 'So hat der Rat|*entschieden*', pos: 'oben', gr: 'm' } },
  { id: 'wort', name: 'Wort-Popper (neben dir)', dauer: 3, felder: [['text', 'Wörter – Zeilen mit |, *rot*, #Kasten, -mittel, _klein', 'text'], ['seite', 'Seite', 'select', ['links', 'Links'], ['rechts', 'Rechts']]], beispiel: { text: 'Neue|*Website*', seite: 'links' } },
  { id: 'liste', name: 'Liste (baut sich auf)', dauer: 5, felder: [['titel', 'Überschrift (optional)', 'text'], ['text', 'Punkte – einer je Zeile', 'lines'], ['art', 'Art', 'select', ['', 'Kästen mit Nummer'], ['fragen', 'Fragen'], ['fokus', 'Fokus – aktueller Punkt im Rahmen, Rest unscharf']]], beispiel: { titel: 'Live aus Rat & Rathaus', text: 'Nächste Sitzungen|Amtsblatt|Baustellen' } },
  { id: 'foto', name: 'Foto-Karte (Polaroid neben dir)', dauer: 5, felder: [['url', 'Foto – aus dem Material des Projekts', 'bild'], ['text', 'Bildunterschrift (optional)', 'text'], ['seite', 'Seite', 'select', ['links', 'Links'], ['rechts', 'Rechts']], ['pos', 'Höhe', 'select', ['oben', 'Oben'], ['mitte', 'Mitte']], ['gr', 'Größe', 'select', ['', 'Normal'], ['gross', 'Groß']], ['rahmen', 'Rahmen', 'select', ['', 'Polaroid-Rahmen'], ['ohne', 'Ohne – nur das Bild']], ['format', 'Format', 'select', ['', 'Polaroid (fast quadratisch)'], ['1-1', '1 : 1'], ['4-5', '4 : 5'], ['3-4', '3 : 4'], ['16-9', '16 : 9'], ['9-16', '9 : 16']], ['ecken', 'Ecken', 'select', ['', 'Eckig'], ['leicht', 'Leicht rund'], ['rund', 'Rund']], ['neigung', 'Neigung', 'select', ['', 'Leicht gedreht'], ['gerade', 'Gerade']]], beispiel: { text: 'Marktstraße heute', seite: 'links', pos: 'oben' } },
  { id: 'riesen', name: 'Riesentitel (für hinter dich)', dauer: 5, felder: [['text', 'Ein Wort – oder zwei Zeilen mit | (*Wort* = Akzentfarbe)', 'text'], ['pos', 'Position', 'select', ['', 'Mitte'], ['oben', 'Oben'], ['unten', 'Unten']]], beispiel: { text: 'Heute' } },
  { id: 'zahl', name: 'Zahl zählt hoch', dauer: 4, felder: [['bis', 'Zielwert (deutsch: 2,4 oder 1.250)', 'text'], ['einheit', 'Einheit dahinter (Mio. €, Wohnungen, %)', 'text'], ['von', 'Startwert (meist 0)', 'text'], ['label', 'Kleine Zeile darüber (optional)', 'text'], ['text', 'Zeile darunter (optional)', 'text'], ['pos', 'Position', 'select', ['', 'Mitte'], ['oben', 'Oben'], ['unten', 'Unten']]], beispiel: { bis: '2,4', einheit: 'Mio. €', von: '0', label: 'Marktstraße', text: 'für Pflaster, Bäume und Licht' } },
  { id: 'balken', name: 'Abstimmungs-Balken', dauer: 5, felder: [['label', 'TOP · Titel', 'text'], ['ja', 'Ja', 'text'], ['nein', 'Nein', 'text'], ['enth', 'Enthaltungen', 'text'], ['beschluss', 'Stempel (Angenommen/Abgelehnt, optional)', 'text'], ['pos', 'Position', 'select', ['', 'Mitte'], ['oben', 'Oben'], ['unten', 'Unten']]], beispiel: { label: 'TOP 9 · Marktstraße', ja: '19', nein: '10', enth: '2', beschluss: 'Angenommen' } },
  { id: 'vorher', name: 'Vorher / Nachher (zwei Fotos)', dauer: 5, felder: [['url1', 'Foto vorher', 'bild'], ['url2', 'Foto nachher', 'bild'], ['text1', 'Beschriftung vorher', 'text'], ['text2', 'Beschriftung nachher', 'text'], ['pos', 'Position', 'select', ['', 'Mitte'], ['oben', 'Oben']]], beispiel: { text1: 'Heute', text2: 'Plan 2027' } },
  { id: 'kommentar', name: 'Kommentar-Karte (Frage aus der Community)', dauer: 6, felder: [['name', 'Name (wie bei Instagram)', 'text'], ['text', 'Der Kommentar', 'text'], ['likes', 'Likes (optional)', 'text'], ['wann', 'Wann (z. B. 2 Std.)', 'text'], ['pos', 'Position', 'select', ['', 'Mitte'], ['oben', 'Oben'], ['unten', 'Unten']]], beispiel: { name: 'anna_s', text: 'Wann kommt endlich der Radweg zur Bundeswehr?', likes: '24', wann: '2 Std.' } },
  { id: 'szene', name: 'Bild-Szene (Foto mit Fahrt, deckend)', dauer: 5, opak: true, felder: [['url', 'Foto', 'bild'], ['text', 'Ortszeile (optional)', 'text'], ['label', 'Kleine Zeile darüber (optional)', 'text'], ['fahrt', 'Fahrt', 'select', ['', 'Langsam ran'], ['raus', 'Langsam weg'], ['links', 'Nach links'], ['rechts', 'Nach rechts']]], beispiel: { text: 'Marktstraße, Soltau', label: 'Heute' } },
  { id: 'kreis', name: 'Bilder-Kreis (um dich herum)', dauer: 13, felder: [['bilder', 'Fotos – je Thema eins, in der Reihenfolge', 'bilder'], ['text', 'Bildunterschriften – eine je Zeile (optional)', 'lines'], ['takt', 'Sekunden je Bild', 'text'], ['art', 'Bewegung', 'select', ['', 'Schritt für Schritt – je Thema eins nach vorn'], ['fliessend', 'Fließend drehen']], ['pos', 'Höhe der Bahn', 'select', ['', 'Brusthöhe'], ['oben', 'Kopfhöhe'], ['unten', 'Hüfthöhe']], ['gr', 'Größe', 'select', ['', 'Normal'], ['gross', 'Groß']], ['rahmen', 'Rahmen', 'select', ['', 'Weißer Rahmen'], ['ohne', 'Ohne – nur das Bild']], ['format', 'Format', 'select', ['', '1 : 1'], ['4-5', '4 : 5'], ['3-4', '3 : 4'], ['16-9', '16 : 9'], ['9-16', '9 : 16']], ['ecken', 'Ecken', 'select', ['', 'Eckig'], ['leicht', 'Leicht rund'], ['rund', 'Rund']]], beispiel: { text: 'Marktstraße|Spielplatz|Radweg|Rathaus', takt: '3' } },
  { id: 'pin', name: 'Karten-Pin', dauer: 4, felder: [['text', 'Ortsname', 'text'], ['url', 'Kartenbild (optional – ohne Bild frei zum Anheften)', 'bild'], ['x', 'Punkt von links (0–100 %)', 'text'], ['y', 'Punkt von oben (0–100 %)', 'text']], beispiel: { text: 'Baugebiet Nord', x: '58', y: '44' } },
  { id: 'schild', name: 'Datenschild (zum Anheften)', dauer: 6, felder: [['titel', 'Überschrift', 'text'], ['text', 'Zeilen – eine je Zeile', 'lines'], ['seite', 'Punkt', 'select', ['links', 'Unten links'], ['rechts', 'Unten rechts'], ['oben', 'Oben']]], beispiel: { titel: 'Baugebiet Nord', text: '40 Wohnungen|Baubeginn 2027|2,4 Mio. €', seite: 'links' } },
  { id: 'stempel', name: 'Stempel', dauer: 3, felder: [['text', 'Wort (kurz)', 'text'], ['art', 'Farbe', 'select', ['', 'Rot'], ['schwarz', 'Schwarz']]], beispiel: { text: 'Angenommen' } },
  { id: 'binde', name: 'Bauchbinde (Name + Rolle)', dauer: 6, felder: [['name', 'Name', 'text'], ['rolle', 'Rolle', 'text']], beispiel: { name: 'Birhat Kaçar', rolle: 'Vorsitzender · Fraktionsvorsitzender' } },
  { id: 'zitat', name: 'Zitat', dauer: 5, felder: [['text', 'Zitat – *fett* für Betonung', 'text'], ['wer', 'Von wem (optional)', 'text']], beispiel: { text: 'Wir brauchen jemanden, der *unabhängig* ist.', wer: 'Sebastian Zinke' } },
  { id: 'aufruf', name: 'Aufruf mit Datum', dauer: 5, felder: [['datum', 'Tag', 'text'], ['monat', 'Monat', 'text'], ['text', 'Text', 'text']], beispiel: { datum: '27.', monat: 'September', text: 'Stichwahl – geht wählen!' } },
  { id: 'intro', name: 'Intro „Moin, Soltau!“', dauer: 4, felder: [['text', 'Tag-Zeile (optional)', 'text']], beispiel: { text: 'Aus Liebe zu Soltau' } },
  { id: 'outro', name: 'Schlusskarte', dauer: 6, felder: [['text', 'Aufruf (optional)', 'text']], beispiel: { text: '' } },
];
// Animationsarten – jeder Baustein kann jede; die Bühne (stage.html) kennt sie als ?anim=
export const ANIMATIONEN = [['', 'Pop', 'springt rein – Standard, energisch'], ['wisch', 'Wischen', 'wischt von der Seite ins Bild – dynamisch, passt zu Bewegung'], ['weich', 'Weich', 'blendet weich ein – ruhig, seriös'], ['fall', 'Fallen', 'fällt von oben und wippt nach – für eine Betonung'], ['zoom', 'Zoom', 'kommt aus der Ferne groß – Auftakt, Überraschung'], ['hoch', 'Hoch', 'schiebt sich von unten hoch – sachlich, wie Nachrichten'], ['dreh', 'Klappen', 'klappt aus der Fläche – Wechsel, „nächster Punkt“'], ['mitte', 'Aus der Mitte', 'öffnet sich von der Mitte nach außen – Titel, Namen'], ['federn', 'Federn', 'federt elastisch ein – Spaß, Kinder, Feste'], ['blitz', 'Blitz', 'kurz hell, dann normal – Zahlen, Ergebnisse, „Achtung“'], ['tipp', 'Tippen', 'Buchstabe für Buchstabe – für Stichworte, Zahlen, Listen']];
OVERLAY_TYPEN.forEach(t => t.felder.push(['anim', 'Animation', 'select', ...ANIMATIONEN.map(([v, l]) => [v, l])]));
export const TEMPI = [['0.5', '½ – halb so schnell'], ['0.75', '¾ – etwas langsamer'], ['', '1 – normal'], ['1.5', '1½ – etwas schneller'], ['2', '2 – doppelt so schnell'], ['3', '3 – sehr schnell']];
OVERLAY_TYPEN.forEach(t => t.felder.push(['tempo', 'Tempo der Animation', 'select', ...TEMPI]));
// Farben: akzent = Farbe der *hervorgehobenen* Wörter, Kästen, Balken (Standard SPD-Rot); akzent2 = Zweitfarbe für ~Wörter~
export const FARBEN = [['#E3000F', 'SPD-Rot'], ['#0F0F0F', 'Schwarz'], ['#FFFFFF', 'Weiß'], ['#FFD200', 'Gelb'], ['#177A38', 'Grün'], ['#005BA4', 'Blau'], ['#F28C00', 'Orange'], ['#6C2C91', 'Lila'], ['#00A3AD', 'Türkis']];
// textfarbe = freie Texte ohne Kasten; akzent = *Wörter*, Kästen, Balken, Pin; akzent2 = ~Wörter~ (nur wo Text so markiert werden kann)
const MIT_TEXT = ['gross', 'wort', 'riesen', 'zitat', 'zahl', 'aufruf', 'liste', 'intro', 'outro'];
const MIT_AKZENT2 = ['gross', 'wort', 'riesen', 'zitat', 'liste', 'zahl'];
const OHNE_AKZENT = ['foto', 'kreis'];
OVERLAY_TYPEN.forEach(t => {
  if (MIT_TEXT.includes(t.id)) t.felder.push(['textfarbe', 'Textfarbe (freier Text)', 'farbe']);
  if (!OHNE_AKZENT.includes(t.id)) t.felder.push(['akzent', 'Akzentfarbe (*Wörter*, Kästen, Balken, Pin)', 'farbe']);
  if (MIT_AKZENT2.includes(t.id)) t.felder.push(['akzent2', 'Zweitfarbe (~Wörter~)', 'farbe']);
});
export const overlayTyp = id => OVERLAY_TYPEN.find(t => t.id === id);
// Aus einem Overlay-Eintrag { typ, dauer, werte } den Clip fürs Manifest bauen (Zeilen-Felder → |)
export function overlayClip(o, i) {
  const t = overlayTyp(o.typ) || OVERLAY_TYPEN[0];
  const q = { clip: t.id };
  for (const [k, , art] of t.felder) { let v = (o.werte || {})[k]; if (v === undefined || v === null || v === '') continue; if (art === 'farbe' && (!/^#[0-9a-f]{6}$/i.test(String(v)) || String(v).toUpperCase() === ({ akzent: '#E3000F', akzent2: '#FFD200', textfarbe: '#FFFFFF' })[k])) continue; if (art === 'lines') v = String(v).split('\n').map(x => x.trim()).filter(Boolean).join('|'); q[k] = String(v); }
  if (t.id === 'kreis' && !q.bilder) q.anzahl = String(Math.max(3, String((o.werte || {}).text || '').split('\n').filter(Boolean).length || 4)); // ohne Fotos: Platzhalter in der Zahl der Themen
  const kurz = String((o.werte || {}).text || (o.werte || {}).name || (o.werte || {}).titel || t.id).replace(/[|*#_\n]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28) || t.id;
  q.dauer = String(+o.dauer || t.dauer); // die Bühne verteilt manche Abläufe (Fokus-Liste, Bild-Fahrt) auf die Clip-Länge
  if (t.opak) q.bg = 'schwarz'; // deckende Clips (Bild-Szene) bekommen keinen Grünschirm
  return { id: `${t.id}-${kurz}`, dauer: +o.dauer || t.dauer, q, ...(t.opak ? { opak: true } : {}) }; // render.mjs stellt die laufende Nummer voran
}

// ---- Claude: Auftrag und Antwort – gemeinsam für App (Abo per Kopieren, API) und den KI-Agenten auf dem SKM-Server ----
import { SKIZZE_ANLEITUNG } from './storyboard.mjs';
export const BAUSTEINE_TEXT = OVERLAY_TYPEN.map(t => `- ${t.id} (${t.name}, ${t.dauer} s): ${t.felder.filter(([k]) => k !== 'anim').map(([k, l, art, ...opts]) => `${k}=${l}${art === 'select' ? ' [' + opts.map(([v, ol]) => `${v || 'leer'}=${ol}`).join(', ') + ']' : ''}`).join('; ')}`).join('\n')
  + `\nFarben als Hex: textfarbe = freier Text ohne Kasten (Standard #FFFFFF), akzent = *hervorgehobene* Wörter, Kästen, Balken, Pin (Standard #E3000F, SPD-Rot – meist so lassen; für Themen wie Umwelt oder Kinder darf es Grün, Gelb, Blau sein), akzent2 = Zweitfarbe für ~Wörter~ (Standard #FFD200). *…* und ~…~ gehen in Großer Text, Riesentitel, Zitat, Liste, Zahl-Unterzeile; im Wort-Popper beginnt eine Zeile mit * oder ~.`
  + `\nJeder Baustein hat zusätzlich anim=Animation: ${ANIMATIONEN.map(([v, l, b]) => `${v || 'pop'} (${b})`).join('; ')}. Zur Aussage passend wählen und über das Video abwechseln – nicht jedes Overlay gleich. Dazu tempo (0.5 = halb so schnell … 3 = sehr schnell, Standard 1): ruhige Aussagen langsamer, Zahlen und Betonungen schneller.
Passende Bausteine für Zahlen und Fakten: zahl (eine Zahl zählt hoch – für jede Summe, Anzahl, Prozent), balken (Abstimmung Ja/Nein/Enthaltung als Balken mit Stempel), vorher (zwei Fotos mit Wischer – url leer lassen), kommentar (Frage aus der Community als Instagram-Kommentar, dann antwortet der Sprecher), szene (Foto bildschirmfüllend mit langsamer Fahrt – B-Roll, wenn es nur Fotos gibt; url leer lassen), pin (Karten-Pin auf einem Ort – ohne Bild zum Anheften per Tracking), kreis (Fotos kreisen um den Sprecher, je Thema kommt das nächste nach vorn; im Feld text je Thema eine Bildunterschrift, bilder leer lassen – wird in CapCut hinter die freigestellte Person gelegt).
Besondere Bausteine: foto = Polaroid-Foto neben dem Sprecher (url leer lassen – das Foto wählt das Team in der App; im Take dazusagen, welches Foto gemeint ist); riesen = ein riesiges Wort, das in CapCut hinter die Person gelegt wird (Kopie mit entferntem Hintergrund darüber); schild = Datenschild mit Linie und Punkt, wird in CapCut per Tracking an ein Gebäude oder Objekt geheftet (Überschrift + 2–3 kurze Zahlen-Zeilen); liste mit art=fokus = Punkte stehen unscharf da und werden nacheinander scharf mit Rahmen.`;
export function AUFTRAG(p, overlays, wunsch, verlauf = []) {
  const art = (FILM_ARTEN.find(([k]) => k === p.art) || [])[1] || p.art || 'Reel';
  const gespraech = verlauf.length ? '\nBISHERIGES GESPRÄCH (neueste zuletzt):\n' + verlauf.map(m => `${m.rolle === 'du' ? 'Nutzer' : 'Du'}: ${String(m.text || '').slice(0, 1200)}`).join('\n') + '\n' : '';
  return `Du bist der Regieassistent der SPD Soltau (Ortsverein und Ratsfraktion in Soltau, Niedersachsen) für kurze Instagram-Videos (Reels, Stories) und Erklärvideos zur Website spd-soltau.de und zur Mitglieder-App.
Stil: informell, persönlich, kurze klare Sätze, kein Amtsdeutsch, zugewandt, gern „Moin Soltau!“, Claim „Aus Liebe zu Soltau“. Sprecher: Brian Weber (stellv. Vorsitzender, Ratsmitglied) oder Birhat Kaçar (Vorsitzender, Fraktionsvorsitzender). Keine Angriffe auf Personen, nichts erfinden – wenn Fakten fehlen, nachfragen.

AUFBAU – immer derselbe, immer Dramatik zuerst:
1. HOOK (Take 1, 2–3 Sekunden): kein „Moin“, keine Vorstellung – erst die Spannung: ein Schlagwort, eine Zahl, eine Frage oder eine Behauptung, die neugierig macht („Drei Entscheidungen, die euch nächstes Jahr Geld kosten.“ / „Zwölf Bäume. Eine Straße. Ein Streit.“). Dazu ein Wort-Popper oder eine Zahl als Overlay.
2. MOIN (Take 2, kurz): „Moin Soltau!“ plus ein Satz, worum es geht – erst jetzt.
3. KERN: höchstens drei Punkte, je Take einer, konkret mit Zahl, Ort, Name; der wichtigste zuerst. Zwischen den Punkten ein Bildwechsel (andere Einstellung, B-Roll vom Ort, Foto-Karte).
4. ENDE: ein Satz Haltung („Wir bleiben dran“), eine Handlung („Fragen? In die Kommentare“), Schlusskarte.
DREH- UND SCHNITTREGELN, die im DREHPLAN stehen müssen: Kamera steht, die Person bewegt sich (geht, setzt sich, zeigt); Ansteckmikro oder nah dran, Licht von vorn; alle 3–5 Sekunden ein Bildwechsel – Schnitt, Punch-in (10–15 % reinzoomen) oder B-Roll (3–5 Sekunden vom Ort, darauf Datenschild oder Pin); Untertitel Wort für Wort; ein leiser Soundeffekt auf jedem Overlay (Whoosh beim Wischen, Pop beim Stempel); Musik leise; nie zwei Overlays gleichzeitig; 30–45 Sekunden.

AUFGABE: Schreib das Skript in TAKES – locker und natürlich, wie jemand, der vor der Kamera einfach erzählt. Ein Take ist eine Einstellung, in der der Sprecher zwei bis vier Sätze am Stück sagt: mit Übergängen („und deshalb“, „das heißt für euch“), ruhig ein Halbsatz, ruhig ein kleines Augenzwinkern. Nicht abgehackt, keine Stichpunkte, keine Aufzählung im Stakkato. Wenige Schnitte: ein Reel (45 s) hat 4–7 Takes, ein Erklärvideo 8–14. Professionell heißt: eine klare Botschaft pro Take, konkrete Zahlen, Orte, Namen; keine Floskeln, keine Parteisprache.
Format je Take, Leerzeile dazwischen:
TAKE 1 · Bild: du in die Kamera, sitzend, Rathaus im Hintergrund (Handy hochkant, Augenhöhe)
Skizze: Einstellung halbnah · Position rechts · Blick Kamera · Kamera steht · Overlay oben links · Hintergrund Rathaus
Du sagst: „… zwei bis vier Sätze am Stück, so wie man spricht …“
Overlay: Großer Text „…“ / „…|*…*“ (4 s) – bei „Stichwort“ einblenden – oder: keins
${SKIZZE_ANLEITUNG}
Overlays sparsam: höchstens eins je Take und nur, wo es die Botschaft trägt (eine Zahl, ein Name, ein Ergebnis). Bausteine (typ → Felder; Zeilen mit | trennen, *Wort* = rot):
${BAUSTEINE_TEXT}
Nach dem letzten Take: in ein, zwei Sätzen fragen, ob das Skript so passt oder was anders soll.
Danach IMMER ein Abschnitt DREHPLAN (Überschrift genau so, dann kurze Zeilen):
DREHPLAN
Aufnahmen vorher: A1 … (Bildschirmaufnahme/Foto/Szene, je 5–10 s), A2 …
Kamera & Ort: Handy hochkant, Augenhöhe, Licht von vorn oder seitlich, ruhiger Hintergrund, Abstand, Ton
Reihenfolge beim Dreh: welche Takes am Stück, jeden zweimal, danach die Aufnahmen A1 …
Schnitt: wo A1/A2 hineingeschnitten werden, Overlays auf Grün (Chroma-Key), Musik leise, Untertitel an
Zum Schluss die Overlays als JSON-Liste in genau dieser Form (in einer Zeile, nach der Überschrift OVERLAYS-JSON, ein Eintrag je Take mit Overlay, gleiche Reihenfolge):
OVERLAYS-JSON
[{"typ":"gross","dauer":4,"werte":{"label":"…","text":"…|*…*","pos":"oben","gr":"m","anim":"weich"}}, {"typ":"stempel","dauer":3,"werte":{"text":"Angenommen","anim":"fall"}}]
Keine Markdown-Formatierung, keine Codeblöcke, keine Einleitung wie „Hier ist“. Wenn der Nutzer nur eine Rückfrage stellt oder eine Änderung wünscht, antworte kurz und liefere danach das komplette überarbeitete Skript samt DREHPLAN und OVERLAYS-JSON erneut.

PROJEKT: „${p.titel}“ (${art}${p.datum ? ', Termin ' + p.datum : ''}).
${p.skript ? 'BISHERIGES SKRIPT:\n' + String(p.skript).slice(0, 4000) + '\n' : ''}${overlays && overlays.length ? 'BISHERIGE OVERLAYS: ' + JSON.stringify(overlays).slice(0, 1500) + '\n' : ''}${gespraech}
WUNSCH: ${wunsch || 'Bitte ein Skript vorschlagen.'}`;
}
// Antworten von Claude, ChatGPT, Gemini & Co. auf unser Take-Format glattziehen: Markdown weg, Überschriften-Varianten vereinheitlichen
export function skriptNormalisieren(text) {
  return String(text || '').replace(/\r/g, '')
    .replace(/```[a-z]*\n?/gi, '')                                   // Codeblöcke
    .replace(/^[ 	]*#{1,6}\s*/gm, '')                                  // Markdown-Überschriften
    .replace(/\*\*|__/g, '')                                         // fett (unser *rot* ist ein einzelnes Sternchen und bleibt)
    .replace(/^[ 	]*(?:[>\-•]\s*)+(?=(?:TAKE|Take)\s*\d)/gm, '')       // Aufzählungszeichen vor TAKE
    .replace(/^[ 	]*(?:TAKE|Take|Szene|Einstellung|Shot)\s*(\d+)\s*[:.)\]–\-·|]*\s*/gm, (m, n) => `TAKE ${n} · `) // „Take 1:“, „Szene 2 –“ → „TAKE 1 · “
    .replace(/^TAKE (\d+) · \s*(?:Bild|Kamera|Einstellung)\s*:\s*/gm, 'TAKE $1 · Bild: ')
    .replace(/^[ 	]*(?:Sprecher(?:in)?|Sprechtext|Sprecher sagt|Text|Du|Brian|Birhat|Ton|O-Ton|Gesprochen)\s*(?:sagt)?\s*:\s*/gim, 'Du sagst: ')
    .replace(/^[ 	]*(?:Einblendung|Overlay-Text|Grafik|Text-Overlay|Overlays?)\s*:\s*/gim, 'Overlay: ')
    .replace(/^[ 	]*(?:Skizze|Storyboard|Bildaufbau|Kadrierung)\s*:\s*/gim, 'Skizze: ')
    .replace(/^[ 	]*(?:DREHPLAN|Drehplan|Dreh-Plan|Shotlist|Produktionsplan)\s*:?\s*$/gm, 'DREHPLAN')
    .replace(/^[ 	]*OVERLAYS?[ -]?JSON\s*:?\s*$/gim, 'OVERLAYS-JSON')
    .trim();
}
// Antwort → { skript (nur Takes), drehplan, overlays, hinweis (Rückfrage) }
export function antwortLesen(text) {
  const t = skriptNormalisieren(text); if (!t) return null;
  let overlays = null; let skript = t;
  const m = t.match(/OVERLAYS-JSON\s*\n?\s*(\[[\s\S]*?\])/i);
  if (m) { try { overlays = JSON.parse(m[1]).filter(o => overlayTyp(o.typ)).map(o => ({ typ: o.typ, dauer: +o.dauer || overlayTyp(o.typ).dauer, werte: o.werte || {} })); } catch (e) { overlays = null; } skript = (t.slice(0, m.index) + t.slice(m.index + m[0].length)).trim(); }
  else { try { const j = JSON.parse(t.match(/\{[\s\S]*\}/)?.[0] || ''); if (j && (j.skript || j.antwort)) { skript = j.skript || j.antwort; if (Array.isArray(j.overlays)) overlays = j.overlays.filter(o => overlayTyp(o.typ)).map(o => ({ typ: o.typ, dauer: +o.dauer || overlayTyp(o.typ).dauer, werte: o.werte || {} })); } } catch (e) { /* Klartext */ } }
  let drehplan = '';
  const dp = skript.match(/^\s*(?:\*\*)?DREHPLAN(?:\*\*)?\s*:?\s*$/im);
  if (dp) { drehplan = skript.slice(dp.index + dp[0].length).trim(); skript = skript.slice(0, dp.index).trim(); }
  const erst = skript.search(/TAKE\s*\d+/i);
  if (erst >= 0) { const bloecke = skript.slice(erst).split(/\n\s*\n/); const vorher = skript.slice(0, erst).trim(); const frage = bloecke.filter(b => !/^\s*TAKE\s*\d+/i.test(b)); return { skript: bloecke.filter(b => /^\s*TAKE\s*\d+/i.test(b)).join('\n\n'), drehplan, overlays, hinweis: (h => /\?/.test(h) || (h.length > 25 && !/^hier ist/i.test(h)) ? h : '')([vorher, frage.join(' ')].filter(Boolean).join(' ').trim()) }; }
  return { skript: '', drehplan, overlays, hinweis: skript };
}
