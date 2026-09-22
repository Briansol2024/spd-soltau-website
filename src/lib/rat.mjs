// Ratsarbeit (Working Space der Fraktion): Bereiche, Dokumentarten und die Verschlüsselung – läuft im Browser und im Push-Dienst.
//
// Warum verschlüsselt? Wix-Sammlungen kennen nur „alle Mitglieder“ oder „nur der Ersteller“ – keine Gruppe „Fraktion“.
// Deshalb liegen Aufgabentexte und Dokumente nur verschlüsselt bei Wix (AES-GCM, ein gemeinsamer Schlüssel der Fraktion).
// Den Schlüssel verteilt der Push-Dienst: Jedes Gerät eines Mitglieds erzeugt ein RSA-Schlüsselpaar und legt den öffentlichen
// Teil in `RatSchluessel` ab (lesen darf dort nur der Ersteller selbst). Gehört das Mitglied zur Fraktion, verpackt der Dienst den
// Fraktionsschlüssel damit; das Gerät packt ihn aus und behält ihn nur im Arbeitsspeicher. Fällt jemand aus der Fraktion, löscht der
// Dienst dessen Einträge – beim nächsten Öffnen ist der Bereich zu. Unverschlüsselt bleiben nur Bereich, Frist, Status und die
// Zuständigen, damit der Push-Dienst erinnern kann.
// Die Ausschüsse und Gremien des Rates der Stadt Soltau (Stand Wahlperiode 2026–31) – dazu die Fraktion selbst
export const BEREICHE = [
  { id: 'rat', name: 'Fraktion / Rat', kind: 'Alle Ratsmitglieder', kachel: 'Rat', gremium: 'Rat der Stadt Soltau' },
  { id: 'bau', name: 'Bau', kind: 'Ausschuss', kachel: 'BA', gremium: 'Bauausschuss' },
  { id: 'wirtschaft', name: 'Wirtschaft, Finanzen', kind: 'Ausschuss', kachel: 'WF', gremium: 'Ausschuss für Wirtschaft und Finanzen' },
  { id: 'feuerschutz', name: 'Feuerschutz', kind: 'Ausschuss', kachel: 'FS', gremium: 'Feuerschutzausschuss' },
  { id: 'schule', name: 'Schule', kind: 'Ausschuss', kachel: 'SC', gremium: 'Schulausschuss' },
  { id: 'kultur', name: 'Kultur', kind: 'Ausschuss', kachel: 'KU', gremium: 'Kulturausschuss' },
  { id: 'soziales', name: 'Soziales', kind: 'Ausschuss', kachel: 'SO', gremium: 'Sozialausschuss' },
  { id: 'stadtwerke', name: 'Aufsichtsrat Stadtwerke', kind: 'Aufsichtsrat', kachel: 'SW', gremium: 'Aufsichtsrat Stadtwerke' },
  { id: 'aws', name: 'Aufsichtsrat AWS', kind: 'Aufsichtsrat', kachel: 'AWS', gremium: 'Aufsichtsrat AWS' },
];
// Frühere Kennungen (vor der Entscheidung, die Ausschüsse nicht zusammenzulegen) auf die heutigen abbilden
const ALT = { stadt: 'bau' };
export const bereichVon = id => BEREICHE.find(b => b.id === (ALT[id] || id)) || BEREICHE[0];
export const AUSSCHUESSE = BEREICHE.filter(b => b.kind !== 'Alle Ratsmitglieder');
// Gremiumsname für Sitzungen: „Bauausschuss“, „Aufsichtsrat Stadtwerke“ – für Rat/Fraktion der Rat selbst
export const gremiumVon = id => bereichVon(id).gremium || 'Ausschuss ' + bereichVon(id).name;
export const DOK_ARTEN = ['Protokoll', 'Bericht', 'Vorlage', 'Antrag', 'Sonstiges'];
export const TEIL_BYTES = 288 * 1024;        // Rohbytes je Dateiteil (Base64 ≈ 393 KB; ein Wix-Element darf 512 KB haben)
export const MAX_DATEI = 10 * 1024 * 1024;   // größte Datei
export const ERINNERUNG_TAGE = 2;            // Erinnerung so viele Tage vor der Frist

const subtle = () => globalThis.crypto.subtle;
const enc = new TextEncoder(), dec = new TextDecoder();

// Base64 ohne Rekursionsgrenze (große Dateiteile)
export function toB64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function fromB64(str) { const s = atob(str); const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out; }
// Interne Datei (Foto, Clip, ZIP) aus den Dateiteilen zusammensetzen – die liegen nur für angemeldete Mitglieder lesbar bei Wix
export async function teileLaden(db, materialId, mime = 'application/octet-stream', fortschritt = null) {
  const teile = (await db.list('FilmTeile', { eq: { materialId }, limit: 500 })).sort((a, b) => a.nr - b.nr);
  if (!teile.length) throw new Error('Datei nicht (mehr) vorhanden');
  const stuecke = teile.map((t, i) => { if (fortschritt) fortschritt(i + 1, teile.length); return fromB64(t.daten || ''); });
  return new Blob(stuecke, { type: mime });
}

// ---- Fraktionsschlüssel (AES-GCM 256) ----
export const neuerFraktionsschluessel = () => toB64(globalThis.crypto.getRandomValues(new Uint8Array(32)));
export const importAes = raw => subtle().importKey('raw', typeof raw === 'string' ? fromB64(raw) : raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
export async function encryptBytes(key, bytes) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv }, key, bytes));
  const out = new Uint8Array(iv.length + ct.length); out.set(iv); out.set(ct, iv.length);
  return toB64(out);
}
export async function decryptBytes(key, str) {
  const all = fromB64(str);
  return new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv: all.subarray(0, 12) }, key, all.subarray(12)));
}
export const encryptJson = (key, obj) => encryptBytes(key, enc.encode(JSON.stringify(obj)));
export const decryptJson = async (key, str) => JSON.parse(dec.decode(await decryptBytes(key, str)));

// ---- Geräteschlüssel (RSA-OAEP), mit dem der Dienst den Fraktionsschlüssel für genau dieses Gerät verpackt ----
const RSA = { name: 'RSA-OAEP', hash: 'SHA-256' };
export async function neuesGeraet() {
  const kp = await subtle().generateKey({ ...RSA, modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]) }, true, ['wrapKey', 'unwrapKey', 'encrypt', 'decrypt']);
  return { id: toB64(globalThis.crypto.getRandomValues(new Uint8Array(9))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 12), pub: await subtle().exportKey('jwk', kp.publicKey), priv: await subtle().exportKey('jwk', kp.privateKey) };
}
// Dienst: Fraktionsschlüssel (Base64-Rohbytes) mit dem öffentlichen Geräteschlüssel verpacken
export async function verpacken(schluesselB64, pubJwk) {
  const pub = await subtle().importKey('jwk', pubJwk, RSA, false, ['encrypt']);
  return toB64(new Uint8Array(await subtle().encrypt(RSA, pub, fromB64(schluesselB64))));
}
// Gerät: verpackten Schlüssel auspacken → AES-Schlüssel (nur im Speicher)
export async function auspacken(verpackt, privJwk) {
  const priv = await subtle().importKey('jwk', privJwk, RSA, false, ['decrypt']);
  const raw = new Uint8Array(await subtle().decrypt(RSA, priv, fromB64(verpackt)));
  return importAes(raw);
}
