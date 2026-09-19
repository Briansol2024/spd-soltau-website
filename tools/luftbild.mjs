// Luftbild des Roten Bahnhofs für die Kontaktseite – aus den offenen Orthophotos des Landes Niedersachsen (LGLN, DOP20, CC BY 4.0).
// Wird einmal erzeugt und im Repo abgelegt (src/images/luftbild-roter-bahnhof.jpg); der Build kopiert es nach assets/images/.
//
//   node tools/luftbild.mjs            # Standard: Roter Bahnhof, 300 × 200 m
//   node tools/luftbild.mjs 52.9833 9.8310 300   # Mitte (Breite, Länge) und Ausschnittsbreite in Metern
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const [lat, lon, breite] = [Number(process.argv[2] || 52.9833), Number(process.argv[3] || 9.8310), Number(process.argv[4] || 300)];
const R = 6378137;
const merc = (la, lo) => [R * lo * Math.PI / 180, R * Math.log(Math.tan(Math.PI / 4 + la * Math.PI / 360))];
const [x, y] = merc(lat, lon);
const k = 1 / Math.cos(lat * Math.PI / 180); // Web-Mercator streckt mit der Breite – so bleibt der Ausschnitt in Metern korrekt
const w = breite * k, h = breite * k * 2 / 3;
const bbox = [x - w / 2, y - h / 2, x + w / 2, y + h / 2].join(',');
const url = `https://opendata.lgln.niedersachsen.de/doorman/noauth/dop_wms?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS=ni_dop20&STYLES=&CRS=EPSG:3857&BBOX=${bbox}&WIDTH=1800&HEIGHT=1200&FORMAT=image/jpeg`;
const res = await fetch(url);
if (!res.ok) throw new Error('WMS ' + res.status);
const { default: sharp } = await import('sharp');
const buf = await sharp(Buffer.from(await res.arrayBuffer())).resize(1200, 800).jpeg({ quality: 80, mozjpeg: true }).toBuffer();
const out = path.join(__dirname, '..', 'src', 'images', 'luftbild-roter-bahnhof.jpg');
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, buf);
console.log(`Luftbild gespeichert: ${out} (${Math.round(buf.length / 1024)} KB, Mitte ${lat}, ${lon}, ${breite} m breit) – Quelle: LGLN (${new Date().getFullYear()}) CC BY 4.0`);
