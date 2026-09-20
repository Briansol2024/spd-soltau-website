// Storyboard: je Take eine Skizze – Einstellung, wer wo steht, Blick, Kamerabewegung, wo das Overlay sitzt.
// Claude schreibt je Take eine Zeile „Skizze: Einstellung halbnah · Position rechts · Blick Kamera · Kamera steht · Overlay oben links · Hintergrund Rathaus“;
// fehlt sie, wird die Skizze aus der „Bild:“-Zeile abgeleitet. Gezeichnet wird ein 9:16-Rahmen als SVG.

export const EINSTELLUNGEN = [['nah', 'Nah', 'Kopf und Schultern'], ['halbnah', 'Halbnah', 'bis zur Brust'], ['amerikanisch', 'Amerikanisch', 'bis zu den Knien'], ['totale', 'Totale', 'ganze Person mit Umgebung']];
export const KAMERA = [['steht', 'Kamera steht'], ['schwenk-links', 'Schwenk nach links'], ['schwenk-rechts', 'Schwenk nach rechts'], ['zoom-rein', 'Zoom rein'], ['zoom-raus', 'Zoom raus'], ['heran', 'Kamera fährt heran'], ['hand', 'Handkamera, leicht bewegt']];
export const BLICK = [['kamera', 'Blick in die Kamera'], ['seite', 'Blick zur Seite'], ['handy', 'Blick aufs Handy'], ['zueinander', 'Blick zueinander']];
const POS_X = { links: 27, mitte: 45, rechts: 63 };
const label = (liste, k) => (liste.find(e => e[0] === k) || liste[0])[1];

// Anleitung für den Claude-Auftrag (und die Projektanweisung)
export const SKIZZE_ANLEITUNG = `Die Zeile „Skizze:“ ist Pflicht – die App zeichnet daraus das Storyboard. Genau diese sechs Angaben, mit „·“ getrennt, nur diese Wörter:
Einstellung nah (Kopf und Schultern) / halbnah (bis zur Brust) / amerikanisch (bis zu den Knien) / totale (ganze Person mit Umgebung) · Position links / mitte / rechts – bei zwei Personen „Position Brian links, Birhat rechts“ · Blick Kamera / seitlich / Handy / zueinander · Kamera steht / Schwenk nach links / Schwenk nach rechts / Zoom rein / Zoom raus / fährt heran / Handkamera · Overlay oben, mitte oder unten, dazu links oder rechts (nie über dem Gesicht: steht der Sprecher rechts, sitzt das Overlay links) – oder Overlay keins · Hintergrund in zwei, drei Wörtern.
Abwechslung über die Takes: nicht jeder Take dieselbe Einstellung, aber auch kein ständiger Wechsel – zwei, drei Wechsel je Reel reichen; Bewegung (Zoom rein, fährt heran) nur für die wichtigste Aussage.`;

// Zeile (oder Bild-Text) → { einstellung, personen:[{name,x}], blick, kamera, overlay:{v,h}|null, hintergrund, ausZeile }
export function skizzeLesen(zeile, bild = '', overlayText = '') {
  const s = String(zeile || '').replace(/^\s*(?:Skizze|Storyboard)\s*:\s*/i, '').trim();
  const b = String(bild || '');
  const lo = t => String(t || '').toLowerCase();
  // Beschriftete Angaben – unabhängig davon, ob mit „·“, „;“ oder Komma getrennt
  const feld = (name, bis = '[·;|,]') => (s.match(new RegExp(name + '\s*:?\s*([^' + bis.slice(1, -1) + ']+)', 'i')) || [])[1]?.trim() || '';
  const pick = (text, regeln, std) => { const t = lo(text); for (const [k, re] of regeln) if (re.test(t)) return k; return std; };
  const EIN = [['halbnah', /halb\s*-?\s*nah/], ['amerikanisch', /amerikanisch|knie/], ['totale', /totale|ganze person|ganzer körper|von weitem|\bweit\b/], ['nah', /\bnah\b|nahaufnahme|close|großaufnahme/]];
  const KAM = [['schwenk-links', /schwenk[^·;|,]*links/], ['schwenk-rechts', /schwenk/], ['zoom-raus', /zoom[^·;|,]*(raus|zurück|weg)|rauszoom/], ['zoom-rein', /zoom|ranzoom/], ['heran', /fährt|fahrt|heran|näher ran|dolly|kommt näher/], ['hand', /handkamera|aus der hand|bewegt|wackel|geht mit|läuft mit|mitgehen/]];
  const BLI = [['handy', /handy|telefon|display|bildschirm|tablet/], ['zueinander', /zueinander|zum anderen|zu brian|zu birhat|ins gespräch/], ['seite', /seite|seitlich|weg|vorbei|nach links|nach rechts|ins leere/]];
  // Einstellung
  const einstellung = pick(feld('einstellung') || s, EIN, '') || pick(b, EIN, 'halbnah');
  // Personen und Position („Position rechts“ oder „Position Brian links, Birhat rechts“)
  const posText = feld('position', '[·;|]') || s.replace(/overlay[^·;|,]*/i, '');
  const personen = [];
  const re = /(brian|birhat|du|ich|sprecherin|sprecher)\s*(?:steht|sitzt|ist|:)?\s*(?:in der\s+)?(links|rechts|mitte|mittig)/gi; let m;
  while ((m = re.exec(posText)) && personen.length < 2) personen.push({ name: /^(du|ich|sprecher)/i.test(m[1]) ? '' : m[1][0].toUpperCase() + m[1].slice(1).toLowerCase(), x: POS_X[lo(m[2]).replace('mittig', 'mitte')] });
  if (!personen.length) {
    const pos = (lo(posText).match(/\b(links|rechts|mitte|mittig)\b/) || [])[1] || (lo(b).match(/\b(links|rechts|mittig|in der mitte)\b/) || [])[1] || 'mitte';
    personen.push({ name: '', x: POS_X[pos.replace('mittig', 'mitte').replace('in der mitte', 'mitte')] || POS_X.mitte });
    if (/\b(zu zweit|beide|zwei personen|brian und birhat|birhat und brian)\b/i.test(s + ' ' + b)) personen.push({ name: '', x: personen[0].x === POS_X.links ? POS_X.rechts : POS_X.links });
  }
  if (personen.length === 2) { if (personen[0].x === personen[1].x) personen[1].x = personen[0].x === POS_X.links ? POS_X.rechts : POS_X.links; personen.forEach((p, i) => { if (p.x === POS_X.mitte) p.x = i ? POS_X.rechts : POS_X.links; }); }
  // Blick
  const blickText = feld('blick');
  const blick = blickText ? pick(blickText, BLI, 'kamera') : pick(b, [['handy', /aufs handy|ins handy|auf das handy|aufs tablet/], ['zueinander', /zueinander|im gespräch/]], 'kamera');
  // Kamera (nicht „Blick Kamera“)
  const kamM = s.match(/(?:^|[·;|,]\s*)kamera\s*:?\s*([^·;|,]+)/i);
  const kamera = kamM ? pick(kamM[1], KAM, 'steht') : pick(s.replace(/blick[^·;|,]*/i, ''), KAM, '') || pick(b, KAM, 'steht');
  // Overlay-Platz – nie über dem Gesicht: ohne Angabe auf die freie Seite
  const ovTeil = feld('overlay'); const ovLo = lo(ovTeil || overlayText || '');
  let overlay = null;
  if (!/^\s*kein/i.test(ovTeil || overlayText || 'keins')) {
    const v = /unten/.test(ovLo) ? 'unten' : /mitte|mittig|neben/.test(ovLo) ? 'mitte' : 'oben';
    const spr = personen[0].x; const frei = personen.length === 2 ? '' : spr === POS_X.rechts ? 'links' : spr === POS_X.links ? 'rechts' : '';
    const h = /links/.test(ovLo) ? 'links' : /rechts/.test(ovLo) ? 'rechts' : (v === 'mitte' ? (frei || 'rechts') : (ovTeil ? '' : frei));
    overlay = { v, h };
  }
  // Hintergrund
  const hg = feld('hintergrund', '[·;|]')
    || (b.match(/hintergrund\s*:?\s*([^,;()]+)/i) || [])[1]?.trim()
    || (b.match(/\b(rathaus|roter bahnhof|marktstraße|büro|draußen|park|wohnzimmer|küche|straße|fraktionszimmer|alte reithalle|ratssaal|wand|regal)\b/i) || [])[1] || '';
  return { einstellung, personen, blick, kamera, overlay, hintergrund: hg ? hg[0].toUpperCase() + hg.slice(1) : '', ausZeile: !!s };
}

// Kurztext unter der Skizze
export function skizzeText(sk) {
  const pos = sk.personen.length === 2 ? sk.personen.map(p => `${p.name || 'einer'} ${xName(p.x)}`).join(', ') : `du ${xName(sk.personen[0].x)}`;
  return [label(EINSTELLUNGEN, sk.einstellung), pos, label(BLICK, sk.blick), label(KAMERA, sk.kamera), sk.overlay ? `Overlay ${sk.overlay.v}${sk.overlay.h ? ' ' + sk.overlay.h : ''}` : 'kein Overlay', sk.hintergrund ? 'Hintergrund ' + sk.hintergrund : ''].filter(Boolean).join(' · ');
}
const xName = x => x === POS_X.links ? 'links' : x === POS_X.rechts ? 'rechts' : 'in der Mitte';

// Skizze als Zeile fürs Skript (für automatisch erzeugte Skripte)
export function skizzeZeile({ einstellung = 'halbnah', position = 'mitte', blick = 'Kamera', kamera = 'steht', overlay = 'oben', hintergrund = '' } = {}) {
  return `Skizze: Einstellung ${einstellung} · Position ${position} · Blick ${blick} · Kamera ${kamera} · Overlay ${overlay}${hintergrund ? ' · Hintergrund ' + hintergrund : ''}`;
}

// SVG-Skizze (9:16), zeichnet Figur(en), Blick, Kamerabewegung und Overlay-Platz
export function skizzeSvg(sk, { typ = '' } = {}) {
  const W = 90, H = 160, ROT = '#E3000F', INK = '#232222', HELL = '#F4F2EE', LINIE = '#DAD5D3', MUTED = '#8F8A88';
  const out = [];
  const pfeil = (x1, y1, x2, y2, farbe = ROT) => { const a = Math.atan2(y2 - y1, x2 - x1), k = 3.2; return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${farbe}" stroke-width="1.6" stroke-linecap="round"/><path d="M${x2} ${y2} L${x2 - k * Math.cos(a - 0.5)} ${y2 - k * Math.sin(a - 0.5)} L${x2 - k * Math.cos(a + 0.5)} ${y2 - k * Math.sin(a + 0.5)} Z" fill="${farbe}"/>`; };
  // Rahmen + Drittel
  out.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="5" fill="${HELL}" stroke="${INK}" stroke-width="1"/>`);
  out.push(`<g stroke="${LINIE}" stroke-width="0.6" stroke-dasharray="2 2"><line x1="30" y1="1" x2="30" y2="${H - 1}"/><line x1="60" y1="1" x2="60" y2="${H - 1}"/><line x1="1" y1="53" x2="${W - 1}" y2="53"/><line x1="1" y1="107" x2="${W - 1}" y2="107"/></g>`);
  // Figur je Einstellung: Kopfradius, Kopfmitte, ob Beine sichtbar
  const F = { nah: { r: 16, y: 72 }, halbnah: { r: 11, y: 52 }, amerikanisch: { r: 10, y: 46, beine: true }, totale: { r: 5.5, y: 42, beine: true, boden: true } }[sk.einstellung] || { r: 11, y: 52 };
  if (F.boden) out.push(`<line x1="1" y1="118" x2="${W - 1}" y2="118" stroke="${MUTED}" stroke-width="0.6"/>`);
  const zwei = sk.personen.length === 2;
  sk.personen.forEach((p, i) => {
    const r = F.r * (zwei ? 0.85 : 1), cx = p.x, cy = F.y; const schulter = cy + r * 1.15, breite = r * 3.3;
    const torsoH = F.beine ? r * 5.4 : H; // Rumpf ≈ 2,7 Köpfe; ohne Beine läuft er aus dem Bild
    out.push(`<path d="M${cx - breite / 2} ${schulter + torsoH} L${cx - breite / 2} ${schulter + r * 0.9} Q${cx - breite / 2} ${schulter} ${cx - breite / 2 + r * 0.9} ${schulter} L${cx + breite / 2 - r * 0.9} ${schulter} Q${cx + breite / 2} ${schulter} ${cx + breite / 2} ${schulter + r * 0.9} L${cx + breite / 2} ${schulter + torsoH} Z" fill="${INK}" opacity="0.82"/>`);
    if (F.beine) { const oben = schulter + torsoH, lang = F.boden ? 118 - oben : H; out.push(`<rect x="${cx - breite * 0.42}" y="${oben - 1}" width="${breite * 0.34}" height="${lang + 1}" fill="${INK}" opacity="0.82"/><rect x="${cx + breite * 0.08}" y="${oben - 1}" width="${breite * 0.34}" height="${lang + 1}" fill="${INK}" opacity="0.82"/>`); }
    out.push(`<line x1="${cx}" y1="${cy + r * 0.8}" x2="${cx}" y2="${schulter + 1}" stroke="${INK}" stroke-width="${r * 0.55}" opacity="0.82"/>`);
    out.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${HELL}" stroke="${INK}" stroke-width="1.2"/>`);
    // Augen zeigen den Blick
    let dx = 0, dy = -r * 0.12;
    if (sk.blick === 'seite') dx = r * 0.4 * (i ? -1 : 1);
    if (sk.blick === 'zueinander') dx = r * 0.4 * (zwei ? (i ? -1 : 1) : 1);
    if (sk.blick === 'handy') dy = r * 0.32;
    out.push(`<circle cx="${cx - r * 0.36 + dx}" cy="${cy + dy}" r="${Math.max(1, r * 0.11)}" fill="${INK}"/><circle cx="${cx + r * 0.36 + dx}" cy="${cy + dy}" r="${Math.max(1, r * 0.11)}" fill="${INK}"/>`);
    if (sk.blick === 'handy') out.push(`<rect x="${cx + r * 0.7}" y="${schulter + r * 0.6}" width="${r * 0.9}" height="${r * 1.5}" rx="1" fill="${HELL}" stroke="${INK}" stroke-width="0.9"/>`);
    if (p.name) out.push(`<text x="${cx}" y="${Math.min(H - 4, schulter + r * 2.8)}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5.5" font-weight="700" fill="${HELL}">${p.name}</text>`);
  });
  // Kamerabewegung
  const k = sk.kamera;
  if (k === 'schwenk-links' || k === 'schwenk-rechts') { const sy = sk.overlay?.v === 'oben' ? 150 : 9; out.push(k === 'schwenk-links' ? pfeil(66, sy, 24, sy) : pfeil(24, sy, 66, sy), `<text x="45" y="${sy === 9 ? 16.5 : 146}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5" fill="${ROT}" font-weight="700">Schwenk</text>`); }
  if (k === 'zoom-rein') out.push(pfeil(9, 9, 22, 22), pfeil(81, 9, 68, 22), pfeil(9, 151, 22, 138), pfeil(81, 151, 68, 138));
  if (k === 'zoom-raus') out.push(pfeil(22, 22, 9, 9), pfeil(68, 22, 81, 9), pfeil(22, 138, 9, 151), pfeil(68, 138, 81, 151));
  if (k === 'heran') out.push(pfeil(45, 152, 45, 128), `<text x="45" y="157" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5" fill="${ROT}" font-weight="700">ran</text>`);
  if (k === 'hand') out.push(`<path d="M8 150 q4 -5 8 0 t8 0 t8 0" fill="none" stroke="${ROT}" stroke-width="1.4" stroke-linecap="round"/>`);
  // Overlay-Platz
  if (sk.overlay) {
    const y = { oben: 9, mitte: 66, unten: 121 }[sk.overlay.v] || 9, h = 30;
    const x = sk.overlay.h === 'links' ? 5 : sk.overlay.h === 'rechts' ? 35 : 8, w = sk.overlay.h ? 50 : 74;
    out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="${ROT}" fill-opacity="0.12" stroke="${ROT}" stroke-width="1.1" stroke-dasharray="3 2"/>`);
    out.push(`<text x="${x + w / 2}" y="${y + h / 2 + 2}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="5.2" font-weight="700" fill="${ROT}" stroke="${HELL}" stroke-width="1.4" paint-order="stroke" stroke-linejoin="round">${esc((typ || 'Overlay').slice(0, 14))}</text>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * 2}" height="${H * 2}" role="img" aria-label="${esc(skizzeText(sk))}">${out.join('')}</svg>`;
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Overlay-Typ aus der Overlay-Zeile eines Takes („Großer Text …“ → Großer Text)
export function overlayKurz(text) {
  const t = String(text || ''); if (!t || /^\s*keins?\b/i.test(t)) return '';
  const m = t.match(/großer text|wort-?popper|liste|stempel|bauchbinde|zitat|aufruf|intro|schlusskarte|outro/i);
  return m ? m[0].replace(/^./, c => c.toUpperCase()) : 'Overlay';
}
