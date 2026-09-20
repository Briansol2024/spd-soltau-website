// Schnellcheck zwischen zwei Läufen des Push-Dienstes: Wartet etwas, das sofort dran sein sollte?
//   - ein Overlay-Auftrag mit Status „wartet“, der nicht auf fehlende Fotos wartet
//   - ein hochgeladenes Foto/eine Datei, deren Teile vollständig sind
// Exit 0 = ja (der Aufrufer startet dann sofort send.mjs), Exit 1 = nein. Läuft in push.yml alle 20 Sekunden.
import { adminClient, queryAll } from './lib.mjs';

const client = await adminClient();
const gruende = [];
try {
  const auftraege = await queryAll(client, 'Auftraege', q => q.eq('status', 'wartet'));
  const offen = auftraege.filter(a => !/^Wartet auf/.test(a.schritt || ''));
  if (offen.length) gruende.push(`${offen.length} Auftrag/Aufträge`);
  const dateien = await queryAll(client, 'FilmMaterial', q => q.eq('status', 'wartet'));
  for (const m of dateien) {
    const teile = await queryAll(client, 'FilmTeile', q => q.eq('materialId', m._id).fields('nr'));
    if (teile.length >= (m.teile || 1)) { gruende.push(`Datei ${m.name || m._id}`); break; }
  }
} catch (e) { console.log('[schnell] Prüfung fehlgeschlagen:', e.message); process.exit(1); }
if (gruende.length) { console.log('[schnell] sofort dran:', gruende.join(', ')); process.exit(0); }
process.exit(1);
