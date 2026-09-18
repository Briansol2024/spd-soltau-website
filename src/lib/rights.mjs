// Rechte und Benachrichtigungs-Zuordnung der App – läuft im Browser (Mitgliederbereich) und im Push-Dienst.
//
// Beide Einstellungen liegen als „Schnappschüsse“ in der Wix-Sammlung `Benachrichtigungen`: Jedes Speichern legt
// ein neues Element an { thema, empfaenger: [Mitglieds-IDs], namen, von }. Es gilt jeweils der neueste Schnappschuss
// eines Themas – aber nur, wenn ihn jemand gespeichert hat, der das darf. Themen der Rechte heißen `recht:<schlüssel>`.
//
// Grundregel: Solange für ein Recht/Thema nichts gespeichert ist, gilt der gesamte Vorstand (Wix-Rolle „Vorstandsmitglied“).
// Das Recht „verwaltung“ (Rechte und Benachrichtigungen festlegen) kann nur der Vorstand selbst vergeben – so kann sich
// niemand über Umwege selbst Rechte geben.

export const RIGHTS = [
  ['umfragen', 'Umfragen anlegen und schließen'],
  ['helfer', 'Helferlisten anlegen'],
  ['dokumente', 'Dokumente einstellen'],
  ['rat', 'Ratsvorbereitung pflegen'],
  ['nachrichten', 'Nachricht an alle senden'],
  ['freigaben', 'Eingang bearbeiten (Registrierungen freischalten, Buchungen und Anfragen)'],
  ['verwaltung', 'Rechte und Benachrichtigungen festlegen'],
];

export const BOARD_TOPICS = [
  ['registrierung', 'Neue Registrierungsanfragen', 'Jemand möchte in den Mitgliederbereich und wartet auf Freigabe.'],
  ['buchung', 'Buchungsanfragen Roter Bahnhof', 'Eine Anfrage über das Buchungsformular ist eingegangen.'],
  ['anfrage', 'Kontakt- und Mitgliedsanfragen', 'Jemand hat das Kontakt- oder Mitmachen-Formular abgeschickt.'],
  ['zusage', 'Zu- und Absagen zu Terminen', 'Ein Mitglied hat zu einem Termin zu- oder abgesagt.'],
  ['geburtstag', 'Geburtstage und Jubiläen', 'Ein Mitglied hat heute Geburtstag oder ein rundes Mitgliedsjubiläum.'],
];

export const RIGHT_KEYS = RIGHTS.map(r => r[0]);
export const TOPIC_KEYS = BOARD_TOPICS.map(t => t[0]);

// snaps: alle Schnappschüsse, neueste zuerst (_createdDate absteigend); people: AppMitglieder (memberId, vorstand)
// Ergebnis: { board:Set, rights:{key:Set}, routing:{topic:string[]}, snap:{thema:item} }
export function evaluateSettings(snaps, people) {
  const board = new Set(people.filter(p => p && p.vorstand && p.memberId).map(p => p.memberId));
  const known = new Set(people.map(p => p.memberId));
  const latestBy = allowed => {
    const m = new Map();
    for (const s of snaps) if (s && s.thema && !m.has(s.thema) && allowed(s._owner)) m.set(s.thema, s);
    return m;
  };
  const clean = ids => (Array.isArray(ids) ? ids : []).filter(id => known.size === 0 || known.has(id));
  // Stufe 1: „verwaltung“ darf nur der Vorstand vergeben
  const l1 = latestBy(o => board.has(o));
  const verwaltung = new Set(l1.has('recht:verwaltung') ? clean(l1.get('recht:verwaltung').empfaenger) : [...board]);
  // Stufe 2: alles andere darf, wer „verwaltung“ hat (oder Vorstand ist)
  const trusted = new Set([...board, ...verwaltung]);
  const l2 = latestBy(o => trusted.has(o));
  const rights = {};
  for (const k of RIGHT_KEYS) {
    if (k === 'verwaltung') { rights[k] = verwaltung; continue; }
    const s = l2.get('recht:' + k);
    rights[k] = new Set(s ? clean(s.empfaenger) : [...board]);
  }
  const routing = {};
  for (const k of TOPIC_KEYS) { const s = l2.get(k); routing[k] = s ? clean(s.empfaenger) : [...board]; }
  const snap = {}; for (const [k, v] of l2) snap[k] = v;
  return { board, rights, routing, snap };
}

export const can = (settings, memberId, right) => !!(settings && settings.rights[right] && settings.rights[right].has(memberId));
