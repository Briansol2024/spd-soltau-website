// Datenschutz-Kontrolle: Was kann ein beliebiger Besucher ohne Anmeldung aus unseren
// Wix-Sammlungen auslesen? Meldet jede private Adresse und Telefonnummer, die dabei sichtbar wird.
// Regelmäßig laufen lassen, besonders nachdem im Wix-Dashboard etwas geändert wurde:
//   node tools/datenschutz-pruefen.mjs
import * as wix from '../src/lib/wix.mjs';
import { env } from '../push/lib.mjs';
const client = wix.makeClient(env.WIX_CLIENT_ID);
const MAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g;
const TEL = /(?<!\d)(?:\+49|0)[0-9][0-9 \/-]{6,}/g;
let treffer = 0;
for (const c of ['KandidatinnenzurStadtratswahl','KandidatinnenzurKreistagswahl','Team','Team1','Team2','Team11',
                 'Ratsberichte','AnliegenOeffentlich','FragenOeffentlich','UmfragenOeffentlich','Unterstuetzung','Baustellen','Startseite']) {
  try {
    const r = await client.items.query(c).limit(200).find();
    const txt = JSON.stringify(r.items);
    const mails = [...new Set(txt.match(MAIL) || [])].filter(m => !/example|mysite|muster|spd-soltau\.de/i.test(m));
    const tels = [...new Set(txt.match(TEL) || [])].filter(t => !/0000000|1234567/.test(t));
    console.log(`${c.padEnd(32)} ${String(r.items.length).padStart(3)} Einträge  Adressen: ${mails.length}  Telefon: ${tels.length}`);
    treffer += mails.length + tels.length;
  } catch { console.log(`${c.padEnd(32)} gesperrt`); }
}
console.log(treffer === 0 ? '\n>>> Keine privaten Kontaktdaten mehr öffentlich abrufbar.' : `\n>>> ACHTUNG: noch ${treffer} Fundstellen`);
