// Filmdreh (Regie-Modus) – gemeinsam für App und Push-Dienst: wer dazugehört, Projektarten, Overlay-Bausteine
export const FILM_TEAM = ['weber.soltau@gmail.com', 'birhat.kacar@web.de'];
export const FILM_ARTEN = [['reel', 'Reel / Kurzvideo'], ['story', 'Story'], ['ratsbericht', 'Ratsbericht-Video'], ['hilfe', 'Hilfe-/Erklärvideo'], ['sonstiges', 'Sonstiges']];
export const FILM_STATUS = [['idee', 'Idee'], ['skript', 'Skript'], ['dreh', 'Dreh'], ['schnitt', 'Schnitt'], ['online', 'Online']];
// Overlay-Bausteine der Bühne (video/insta/stage.html): Feld → Adressparameter
export const OVERLAY_TYPEN = [
  { id: 'gross', name: 'Großer Text', dauer: 4, felder: [['label', 'Kleine Zeile darüber (optional)', 'text'], ['text', 'Text – Zeilen mit | trennen, *rot* für Rot', 'text'], ['pos', 'Position', 'select', ['oben', 'Oben'], ['', 'Mitte'], ['unten', 'Unten']], ['gr', 'Größe', 'select', ['m', 'Normal'], ['xl', 'Riesig']]], beispiel: { label: 'Ratssitzung 01.10.', text: 'So hat der Rat|*entschieden*', pos: 'oben', gr: 'm' } },
  { id: 'wort', name: 'Wort-Popper (neben dir)', dauer: 3, felder: [['text', 'Wörter – Zeilen mit |, *rot*, #Kasten, -mittel, _klein', 'text'], ['seite', 'Seite', 'select', ['links', 'Links'], ['rechts', 'Rechts']]], beispiel: { text: 'Neue|*Website*', seite: 'links' } },
  { id: 'liste', name: 'Liste (baut sich auf)', dauer: 5, felder: [['titel', 'Überschrift (optional)', 'text'], ['text', 'Punkte – einer je Zeile', 'lines'], ['art', 'Art', 'select', ['', 'Haken'], ['fragen', 'Fragen']]], beispiel: { titel: 'Live aus Rat & Rathaus', text: 'Nächste Sitzungen|Amtsblatt|Baustellen' } },
  { id: 'stempel', name: 'Stempel', dauer: 3, felder: [['text', 'Wort (kurz)', 'text'], ['art', 'Farbe', 'select', ['', 'Rot'], ['schwarz', 'Schwarz']]], beispiel: { text: 'Angenommen' } },
  { id: 'binde', name: 'Bauchbinde (Name + Rolle)', dauer: 6, felder: [['name', 'Name', 'text'], ['rolle', 'Rolle', 'text']], beispiel: { name: 'Birhat Kaçar', rolle: 'Vorsitzender · Fraktionsvorsitzender' } },
  { id: 'zitat', name: 'Zitat', dauer: 5, felder: [['text', 'Zitat – *fett* für Betonung', 'text'], ['wer', 'Von wem (optional)', 'text']], beispiel: { text: 'Wir brauchen jemanden, der *unabhängig* ist.', wer: 'Sebastian Zinke' } },
  { id: 'aufruf', name: 'Aufruf mit Datum', dauer: 5, felder: [['datum', 'Tag', 'text'], ['monat', 'Monat', 'text'], ['text', 'Text', 'text']], beispiel: { datum: '27.', monat: 'September', text: 'Stichwahl – geht wählen!' } },
  { id: 'intro', name: 'Intro „Moin, Soltau!“', dauer: 4, felder: [['text', 'Tag-Zeile (optional)', 'text']], beispiel: { text: 'Aus Liebe zu Soltau' } },
  { id: 'outro', name: 'Schlusskarte', dauer: 6, felder: [['text', 'Aufruf (optional)', 'text']], beispiel: { text: '' } },
];
export const overlayTyp = id => OVERLAY_TYPEN.find(t => t.id === id);
// Aus einem Overlay-Eintrag { typ, dauer, werte } den Clip fürs Manifest bauen (Zeilen-Felder → |)
export function overlayClip(o, i) {
  const t = overlayTyp(o.typ) || OVERLAY_TYPEN[0];
  const q = { clip: t.id };
  for (const [k, , art] of t.felder) { let v = (o.werte || {})[k]; if (v === undefined || v === null || v === '') continue; if (art === 'lines') v = String(v).split('\n').map(x => x.trim()).filter(Boolean).join('|'); q[k] = String(v); }
  const kurz = String((o.werte || {}).text || (o.werte || {}).name || (o.werte || {}).titel || t.id).replace(/[|*#_\n]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28) || t.id;
  return { id: `${t.id}-${kurz}`, dauer: +o.dauer || t.dauer, q }; // render.mjs stellt die laufende Nummer voran
}

// ---- Claude: Auftrag und Antwort – gemeinsam für App (Abo per Kopieren, API) und den KI-Agenten auf dem SKM-Server ----
import { SKIZZE_ANLEITUNG } from './storyboard.mjs';
export const BAUSTEINE_TEXT = OVERLAY_TYPEN.map(t => `- ${t.id} (${t.name}, ${t.dauer} s): ${t.felder.map(([k, l]) => `${k}=${l}`).join('; ')}`).join('\n');
export function AUFTRAG(p, overlays, wunsch, verlauf = []) {
  const art = (FILM_ARTEN.find(([k]) => k === p.art) || [])[1] || p.art || 'Reel';
  const gespraech = verlauf.length ? '\nBISHERIGES GESPRÄCH (neueste zuletzt):\n' + verlauf.map(m => `${m.rolle === 'du' ? 'Nutzer' : 'Du'}: ${String(m.text || '').slice(0, 1200)}`).join('\n') + '\n' : '';
  return `Du bist der Regieassistent der SPD Soltau (Ortsverein und Ratsfraktion in Soltau, Niedersachsen) für kurze Instagram-Videos (Reels, Stories) und Erklärvideos zur Website spd-soltau.de und zur Mitglieder-App.
Stil: informell, persönlich, kurze klare Sätze, kein Amtsdeutsch, zugewandt, gern „Moin Soltau!“, Claim „Aus Liebe zu Soltau“. Sprecher: Brian Weber (stellv. Vorsitzender, Ratsmitglied) oder Birhat Kaçar (Vorsitzender, Fraktionsvorsitzender). Keine Angriffe auf Personen, nichts erfinden – wenn Fakten fehlen, nachfragen.

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
[{"typ":"gross","dauer":4,"werte":{"label":"…","text":"…|*…*","pos":"oben","gr":"m"}}, {"typ":"stempel","dauer":3,"werte":{"text":"Angenommen"}}]
Keine Markdown-Formatierung, keine Codeblöcke, keine Einleitung wie „Hier ist“. Wenn der Nutzer nur eine Rückfrage stellt oder eine Änderung wünscht, antworte kurz und liefere danach das komplette überarbeitete Skript samt DREHPLAN und OVERLAYS-JSON erneut.

PROJEKT: „${p.titel}“ (${art}${p.datum ? ', Termin ' + p.datum : ''}).
${p.skript ? 'BISHERIGES SKRIPT:\n' + String(p.skript).slice(0, 4000) + '\n' : ''}${overlays && overlays.length ? 'BISHERIGE OVERLAYS: ' + JSON.stringify(overlays).slice(0, 1500) + '\n' : ''}${gespraech}
WUNSCH: ${wunsch || 'Bitte ein Skript vorschlagen.'}`;
}
// Antwort → { skript (nur Takes), drehplan, overlays, hinweis (Rückfrage) }
export function antwortLesen(text) {
  const t = String(text || '').replace(/\r/g, '').replace(/```[a-z]*\n?/gi, '').trim(); if (!t) return null;
  let overlays = null; let skript = t;
  const m = t.match(/OVERLAYS-JSON\s*\n?\s*(\[[\s\S]*?\])/i);
  if (m) { try { overlays = JSON.parse(m[1]).filter(o => overlayTyp(o.typ)).map(o => ({ typ: o.typ, dauer: +o.dauer || overlayTyp(o.typ).dauer, werte: o.werte || {} })); } catch (e) { overlays = null; } skript = (t.slice(0, m.index) + t.slice(m.index + m[0].length)).trim(); }
  else { try { const j = JSON.parse(t.match(/\{[\s\S]*\}/)?.[0] || ''); if (j && (j.skript || j.antwort)) { skript = j.skript || j.antwort; if (Array.isArray(j.overlays)) overlays = j.overlays.filter(o => overlayTyp(o.typ)).map(o => ({ typ: o.typ, dauer: +o.dauer || overlayTyp(o.typ).dauer, werte: o.werte || {} })); } } catch (e) { /* Klartext */ } }
  let drehplan = '';
  const dp = skript.match(/^\s*(?:\*\*)?DREHPLAN(?:\*\*)?\s*:?\s*$/im);
  if (dp) { drehplan = skript.slice(dp.index + dp[0].length).trim(); skript = skript.slice(0, dp.index).trim(); }
  const erst = skript.search(/TAKE\s*\d+/i);
  if (erst >= 0) { const bloecke = skript.slice(erst).split(/\n\s*\n/); const vorher = skript.slice(0, erst).trim(); const frage = bloecke.filter(b => !/^\s*TAKE\s*\d+/i.test(b)); return { skript: bloecke.filter(b => /^\s*TAKE\s*\d+/i.test(b)).join('\n\n'), drehplan, overlays, hinweis: [vorher, frage.join(' ')].filter(Boolean).join(' ').trim() }; }
  return { skript: '', drehplan, overlays, hinweis: skript };
}
