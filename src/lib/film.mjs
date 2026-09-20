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
