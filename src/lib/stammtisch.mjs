// Stammtisch-Umfrage: Zu jedem Termin, dessen Titel zum Muster passt (Standard: „Stammtisch“), legt der Push-Dienst automatisch
// eine Umfrage „Wo treffen wir uns?“ mit den Lokalen an. Sie steht direkt im Termin und nur, wer zugesagt hat, sieht und
// beantwortet sie (Feld `nurZusagen`). Muster und Lokale pflegt der Vorstand in der App (Schnappschuss `stammtisch`).
export const STAMMTISCH_DEFAULT = {
  muster: 'stammtisch',
  lokale: [
    "Alexander's (Wilhelmstraße 2)",
    'Hildes Café & Shop (Frielingen 9)',
    'Brauhaus Joh. Albrecht (Winsener Straße 34d)',
    'Delphi (Wilhelmstraße 4)',
    'Don Camillo (Hagen 9)',
    "Meyn's Hotel (Poststraße 19)",
    'Medaillon (Poststraße 10)',
    'La Mamma (Unter den Linden 15)',
    'Zum Postillion (Bergstraße 10)',
    'Friends Bar Restaurant (Lüneburger Straße 14)',
  ],
};
export function stammtischConfig(snap) {
  const s = snap && snap.stammtisch;
  return { muster: (s && s.muster) || STAMMTISCH_DEFAULT.muster, lokale: (s && Array.isArray(s.lokale) && s.lokale.length) ? s.lokale : STAMMTISCH_DEFAULT.lokale };
}
export function istStammtisch(ev, cfg) {
  try { return new RegExp(cfg.muster, 'i').test(ev.title || ''); } catch (e) { return /stammtisch/i.test(ev.title || ''); }
}
export const stammtischFrage = datum => `Wo treffen wir uns am ${datum}?`;
