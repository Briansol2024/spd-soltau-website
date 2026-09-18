// Rechte, Vorstand und Benachrichtigungs-Zuordnung der App – läuft im Browser (Mitgliederbereich) und im Push-Dienst.
//
// Alle Einstellungen liegen als „Schnappschüsse“ in der Wix-Sammlung `Benachrichtigungen`: Jedes Speichern legt
// ein neues Element an { thema, empfaenger: [Mitglieds-IDs], namen, von }. Es gilt jeweils der neueste Schnappschuss
// eines Themas – aber nur, wenn ihn jemand gespeichert hat, der das darf. Themen der Rechte heißen `recht:<schlüssel>`,
// der Vorstand selbst heißt `vorstand`.
//
// Grundregeln:
//   • Ausgangspunkt ist der Vorstand laut Wix-Rolle „Vorstandsmitglied“ (AppMitglieder.vorstand, vom Push-Dienst gepflegt).
//   • Wer „verwaltung“ hat (Standard: der Vorstand), darf den Vorstand, alle Rechte und die Benachrichtigungen festlegen.
//   • Solange für ein Recht/Thema nichts gespeichert ist, gilt der gesamte Vorstand.
//   • „verwaltung“ und „vorstand“ zählen nur, wenn sie ein Vorstandsmitglied (laut Wix-Rolle) oder ein bisheriger
//     Verwalter gespeichert hat – so kann sich niemand über Umwege selbst Rechte geben.

export const RIGHTS = [
  ['beitraege', 'Beiträge für „Aktuelles“ schreiben und veröffentlichen'],
  ['termine', 'Termine anlegen und absagen'],
  ['umfragen', 'Umfragen anlegen und schließen'],
  ['helfer', 'Helferlisten anlegen'],
  ['dokumente', 'Dokumente einstellen'],
  ['rat', 'Ratsvorbereitung pflegen'],
  ['nachrichten', 'Nachricht an alle senden'],
  ['freigaben', 'Eingang bearbeiten (Registrierungen freischalten, Buchungen und Anfragen)'],
  ['verwaltung', 'Vorstand, Rechte und Benachrichtigungen festlegen'],
];

export const BOARD_TOPICS = [
  ['registrierung', 'Neue Registrierungsanfragen', 'Jemand möchte in den Mitgliederbereich und wartet auf Freigabe.'],
  ['buchung', 'Buchungsanfragen Roter Bahnhof', 'Eine Anfrage über das Buchungsformular ist eingegangen.'],
  ['anfrage', 'Kontakt- und Mitgliedsanfragen', 'Jemand hat das Kontakt- oder Mitmachen-Formular abgeschickt.'],
  ['zusage', 'Zu- und Absagen zu Terminen', 'Ein Mitglied hat zu einem Termin zu- oder abgesagt.'],
  ['geburtstag', 'Geburtstage und Jubiläen', 'Ein Mitglied hat heute Geburtstag oder ein rundes Mitgliedsjubiläum.'],
];

// Sichtbarkeit: was ein Mitglied im Mitgliederbereich zu sehen bekommt (Standard: alle Mitglieder, Vorstandstermine nur Vorstand).
// Modus je Schlüssel: 'alle' | 'vorstand' | 'auswahl' (dann gilt die Liste empfaenger). Vorstand und Verwalter sehen immer alles.
export const VISIBILITY = [
  ['termine:Öffentlich', 'Öffentliche Termine'],
  ['termine:Rat', 'Ratstermine (Rat, Ausschüsse)'],
  ['termine:Mitglieder', 'Mitgliedertermine'],
  ['termine:Fraktion', 'Fraktionstermine'],
  ['termine:Vorstand', 'Vorstandstermine'],
  ['helfer', 'Helferlisten'],
  ['umfragen', 'Umfragen'],
  ['dokumente', 'Dokumente'],
  ['rat', 'Ratsvorbereitung'],
  ['mitglieder', 'Mitgliederverzeichnis'],
];
export const VISIBILITY_DEFAULT = { 'termine:Vorstand': 'vorstand' };

export const RIGHT_KEYS = RIGHTS.map(r => r[0]);
export const TOPIC_KEYS = BOARD_TOPICS.map(t => t[0]);
export const VIS_KEYS = VISIBILITY.map(v => v[0]);

// snaps: alle Schnappschüsse, neueste zuerst (_createdDate absteigend); people: AppMitglieder (memberId, vorstand = Wix-Rolle)
// Ergebnis: { board:Set (wirksamer Vorstand), wixBoard:Set, rights:{key:Set}, routing:{topic:string[]}, snap:{thema:item} }
export function evaluateSettings(snaps, people) {
  const wixBoard = new Set(people.filter(p => p && p.vorstand && p.memberId).map(p => p.memberId));
  const known = new Set(people.map(p => p.memberId));
  const clean = ids => (Array.isArray(ids) ? ids : []).filter(id => known.size === 0 || known.has(id));
  const latestBy = allowed => {
    const m = new Map();
    for (const s of snaps) if (s && s.thema && !m.has(s.thema) && allowed(s._owner)) m.set(s.thema, s);
    return m;
  };
  // Stufe 1: Verwalter und Vorstand dürfen nur der Wix-Vorstand oder bisherige Verwalter festlegen
  const l1 = latestBy(o => wixBoard.has(o));
  let verwaltung = new Set(l1.has('recht:verwaltung') ? clean(l1.get('recht:verwaltung').empfaenger) : [...wixBoard]);
  const trusted1 = new Set([...wixBoard, ...verwaltung]);
  const l2 = latestBy(o => trusted1.has(o));
  if (l2.has('recht:verwaltung')) verwaltung = new Set(clean(l2.get('recht:verwaltung').empfaenger));
  const board = new Set(l2.has('vorstand') ? clean(l2.get('vorstand').empfaenger) : [...wixBoard]);
  // Stufe 2: alles andere darf, wer „verwaltung“ hat oder zum (wirksamen) Vorstand gehört
  const trusted = new Set([...board, ...verwaltung, ...wixBoard]);
  const l3 = latestBy(o => trusted.has(o));
  const rights = {};
  for (const k of RIGHT_KEYS) {
    if (k === 'verwaltung') { rights[k] = verwaltung; continue; }
    const s = l3.get('recht:' + k);
    rights[k] = new Set(s ? clean(s.empfaenger) : [...board]);
  }
  const routing = {};
  for (const k of TOPIC_KEYS) { const s = l3.get(k); routing[k] = s ? clean(s.empfaenger) : [...board]; }
  const sicht = {};
  for (const k of VIS_KEYS) {
    const s = l3.get('sicht:' + k);
    const modus = s ? (s.modus || 'alle') : (VISIBILITY_DEFAULT[k] || 'alle');
    sicht[k] = { modus, ids: new Set(modus === 'auswahl' ? clean(s ? s.empfaenger : []) : []) };
  }
  const snap = {}; for (const [k, v] of l3) snap[k] = v;
  return { board, wixBoard, rights, routing, sicht, snap, trusted };
}

export const can = (settings, memberId, right) => !!(settings && settings.rights[right] && settings.rights[right].has(memberId));
// Darf dieses Mitglied den Bereich/Termintyp sehen? Vorstand und Verwalter sehen immer alles.
export function canSee(settings, memberId, key) {
  if (!settings) return true;
  if (settings.board.has(memberId) || settings.rights.verwaltung?.has(memberId)) return true;
  const v = settings.sicht[key];
  if (!v) return true;
  if (v.modus === 'alle') return true;
  if (v.modus === 'vorstand') return false;
  return v.ids.has(memberId);
}
