// Baustellen für „Wo wird gebaut?“: automatisch von soltau.de (Aktuelles → Baustellen) plus eigene Einträge aus dem Mitgliederbereich.
// Straßen werden über ihre Namen auf der Karte verortet (Straßenmitten aus OpenStreetMap, einmal geholt: strassen-soltau.json).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const STRASSEN = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'strassen-soltau.json'), 'utf8'));
const NAMEN = Object.keys(STRASSEN).sort((a, b) => b.length - a.length); // längste zuerst („Winsener Straße“ vor „Straße“)
const norm = s => String(s || '').replace(/\bstr\./gi, 'straße').replace(/straße/gi, 'straße').toLowerCase();

// Erste Straße, die im Text vorkommt → [lat, lng]
export function strasseFinden(text) {
  const t = norm(text);
  for (const n of NAMEN) { const k = norm(n); if (k.length >= 4 && t.includes(k)) return { name: n, lat: STRASSEN[n][0], lng: STRASSEN[n][1] }; }
  return null;
}
const fmt = s => { const m = String(s || '').match(/^(\d{4})-(\d\d)-(\d\d)$/); return m ? `${+m[3]}.${+m[2]}.${m[1]}` : ''; };

// Meldungen der Stadt → Einträge in der Form der eigenen Baustellen
export function autoBaustellen(meldungen, heute = new Date().toISOString().slice(0, 10)) {
  return (meldungen || []).filter(m => !m.bis || m.bis >= heute).map(m => {
    const voll = `${m.titel} ${m.text || m.teaser || ''}`;
    const art = /vollsperrung|gesperrt|sperrung/i.test(voll) ? 'Sperrung' : (m.von && m.von > heute) || /geplant|voraussichtlich ab|beginnt am/i.test(voll) ? 'Geplant' : 'Baustelle';
    const s = strasseFinden(voll);
    const dauer = m.von && m.bis ? `${fmt(m.von)} bis ${fmt(m.bis)}` : m.bis ? `bis ${fmt(m.bis)}` : m.von ? `ab ${fmt(m.von)}` : '';
    return { id: 'stadt-' + (m.url || m.titel).replace(/\W+/g, '-').slice(-40), titel: m.titel.replace(/^(Vollsperrung|Sperrung|Baustelle|Baumaßnahme)\s+(der|des|in der|im|am)?\s*/i, '').trim() || m.titel, art, bis: dauer, was: (m.text || m.teaser || '').slice(0, 500), warum: m.grund || '', umleitung: '', spd: '', lat: s ? s.lat : 0, lng: s ? s.lng : 0, strasse: s ? s.name : '', quelle: `Stadt Soltau${m.datum ? ', Meldung vom ' + fmt(m.datum) : ''}`, url: m.url || '', auto: true };
  });
}
// Eigene Einträge gehen vor: gleiche Straße im Titel → die Stadtmeldung liefert nur noch den Link
export function baustellenZusammen(eigene, auto) {
  const out = eigene.map(e => ({ ...e, auto: false }));
  for (const a of auto) {
    const treffer = out.find(e => a.strasse && norm(e.titel).includes(norm(a.strasse)));
    if (treffer) { if (!treffer.url) treffer.url = a.url; if (!treffer.quelle) treffer.quelle = a.quelle; continue; }
    out.push(a);
  }
  return out;
}
