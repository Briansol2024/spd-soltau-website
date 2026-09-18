// Ratsarbeit (Working Space der Fraktion): Bereiche, Dokumentarten und die Verschlüsselung – läuft im Browser und im Push-Dienst.
//
// Warum verschlüsselt? Wix-Sammlungen kennen nur „alle Mitglieder“ oder „nur der Ersteller“ – keine Gruppe „Fraktion“.
// Deshalb liegen Aufgabentexte und Dokumente nur verschlüsselt bei Wix (AES-GCM, ein gemeinsamer Schlüssel der Fraktion).
// Den Schlüssel verteilt der Push-Dienst: Jedes Gerät eines Mitglieds erzeugt ein RSA-Schlüsselpaar und legt den öffentlichen
// Teil in `RatSchluessel` ab (lesen darf dort nur der Ersteller selbst). Gehört das Mitglied zur Fraktion, verpackt der Dienst den
// Fraktionsschlüssel damit; das Gerät packt ihn aus und behält ihn nur im Arbeitsspeicher. Fällt jemand aus der Fraktion, löscht der
// Dienst dessen Einträge – beim nächsten Öffnen ist der Bereich zu. Unverschlüsselt bleiben nur Bereich, Frist, Status und die
// Zuständigen, damit der Push-Dienst erinnern kann.
export const BEREICHE = [
  { id: 'rat', name: 'Fraktion / Rat', kind: 'Alle Ratsmitglieder', kachel: 'Rat' },
  { id: 'stadt', name: 'Stadtentwicklung', kind: 'Ausschuss', kachel: 'ST' },
  { id: 'soziales', name: 'Soziales', kind: 'Ausschuss', kachel: 'SO' },
  { id: 'schule', name: 'Schule & Kultur', kind: 'Ausschuss', kachel: 'SK' },
  { id: 'wirtschaft', name: 'Wirtschaft', kind: 'Ausschuss', kachel: 'WI' },
];
export const bereichVon = id => BEREICHE.find(b => b.id === id) || BEREICHE[0];
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
