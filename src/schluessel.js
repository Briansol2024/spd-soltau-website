// Geräteschlüssel des Mitgliederbereichs: Dieses Gerät erzeugt einmal ein RSA-Schlüsselpaar und meldet den öffentlichen Teil in
// `RatSchluessel` an. Der Push-Dienst verpackt damit die Gruppenschlüssel, die dem Mitglied zustehen – `fraktion` (Ratsarbeit)
// und `vorstand` (Vorgänge/Anliegen). Ausgepackt werden sie nur im Arbeitsspeicher. In der Vorschau (?demo) gibt es keine Verschlüsselung.
import { neuesGeraet, auspacken, encryptJson as encJ, decryptJson as decJ } from './lib/rat.mjs';

const FELD = { fraktion: 'verpackt', vorstand: 'verpacktVorstand' };
export function makeSchluessel({ db, store, DEMO, me }) {
  const keys = { fraktion: null, vorstand: null };
  let rowCache = null;
  async function geraet() {
    let g = store.get('spd-rat-geraet');
    if (!g?.priv) { g = await neuesGeraet(); store.set('spd-rat-geraet', g); }
    return g;
  }
  // → 'ok' | 'wartet' | 'fehler'
  async function laden(gruppe) {
    if (DEMO || keys[gruppe]) return 'ok';
    const g = await geraet();
    if (!rowCache) rowCache = (await db.list('RatSchluessel', { eq: { geraet: g.id }, limit: 5 }))[0] || null;
    const row = rowCache;
    if (!row) { await db.insert('RatSchluessel', { title: `${me().name} · ${g.id}`, memberId: me().id, name: me().name, geraet: g.id, pub: JSON.stringify(g.pub), status: 'neu' }); rowCache = { status: 'neu' }; return 'wartet'; }
    const verpackt = row[FELD[gruppe]];
    if (verpackt) { try { keys[gruppe] = await auspacken(verpackt, g.priv); return 'ok'; } catch (e) { return 'fehler'; } }
    return row.status === 'fehler' ? 'fehler' : 'wartet';
  }
  const encJson = (gruppe, obj) => DEMO ? JSON.stringify(obj) : encJ(keys[gruppe], obj);
  const decJson = async (gruppe, s) => { try { return DEMO ? JSON.parse(s || '{}') : await decJ(keys[gruppe], s); } catch (e) { return { titel: '(nicht lesbar – anderer Schlüssel)', unlesbar: true }; } };
  const neu = () => { store.del('spd-rat-geraet'); keys.fraktion = keys.vorstand = null; rowCache = null; };
  const vergessen = () => { rowCache = null; };
  // Hinweiskarte, solange der Dienst den Schlüssel noch nicht freigegeben hat
  const warteKarte = (status, was) => status === 'wartet'
    ? `<div class="mb-card mb-narrow"><h3>Dein Zugang wird eingerichtet</h3><p>Dieses Gerät hat gerade seinen Schlüssel angemeldet. Der Push-Dienst schaltet ihn in den nächsten Minuten frei – danach siehst du hier ${was}. Diese Seite prüft alle 30 Sekunden von selbst nach.</p><p class="small muted">Warum? ${was.charAt(0).toUpperCase() + was.slice(1)} liegen verschlüsselt bei Wix. Nur Geräte berechtigter Mitglieder bekommen den Schlüssel – so kann auch niemand sonst mitlesen.</p></div>`
    : `<div class="mb-card mb-narrow"><h3>Schlüssel dieses Geräts unbrauchbar</h3><p>Bitte den Geräteschlüssel neu anlegen – danach schaltet der Push-Dienst das Gerät in ein paar Minuten wieder frei.</p><div class="mb-actions"><button class="btn btn-rot" type="button" data-schluessel-neu>Schlüssel neu anlegen</button></div></div>`;
  return { laden, key: g => keys[g], encJson, decJson, neu, vergessen, warteKarte };
}
