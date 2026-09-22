// Gemeinsame Render-Bausteine – laufen im Build (Node) und im Browser (site.js).
// Alle Funktionen geben HTML-Strings zurück; Nutzdaten werden immer über esc() maskiert.

export const MONL = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
export const MONS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
export const WD = ['So','Mo','Di','Mi','Do','Fr','Sa'];

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const D = s => new Date(String(s).slice(0, 10) + 'T00:00:00');
export const fmt = s => { const x = D(s); return `${x.getDate()}. ${MONL[x.getMonth()]} ${x.getFullYear()}`; };
// Kürzt Anrisstexte so, dass ganze Sätze stehen bleiben: bis n Zeichen, Schnitt am letzten Satzende;
// gibt es kein Satzende, am Wortende mit Auslassungszeichen.
export const short = (t, n) => {
  t = String(t ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n + 1);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (end > n * 0.4) return cut.slice(0, end + 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 20)) + ' …';
};
export const initials = n => String(n).split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('');

let BASE = '';
export function setBase(b) { BASE = b || ''; }
export const url = p => `${BASE}${p}`;

// Foto oder Platzhalter (Streifenfläche wie im Entwurf)
export function ph(label, cls = '') {
  return `<div class="ph ${cls}"><span>${esc(label)}</span></div>`;
}
// Bildfläche: echtes Foto (wenn vorhanden) oder Platzhalter; `inner` wird vorangestellt (z. B. Kategorie-Tag)
export function photo(img, label, cls = '', inner = '') {
  if (img && img.url) {
    return `<div class="ph ${cls} has-img">${inner}<img src="${esc(img.url)}" alt="${esc(img.alt || label || '')}" loading="lazy" decoding="async"></div>`;
  }
  return `<div class="ph ${cls}">${inner}<span>${esc(label ? `Foto: ${label}` : 'Foto folgt')}</span></div>`;
}

export function newsCard(n) {
  return `<a class="card" href="${url(`/aktuelles/${n.slug}/`)}">${photo(n.img, n.imgLabel || n.title, '', `<span class="tag">${esc(n.cat)}</span>`)}<div class="card-body"><span class="date">${fmt(n.date)}</span><h3>${esc(n.title)}</h3>${n.teaser ? `<p>${esc(short(n.teaser, 180))}</p>` : ''}<span class="weiter">Weiterlesen</span></div></a>`;
}

export function badge(t) {
  const c = t === 'Öffentlich' || t === 'Rat' ? 'badge-off' : t === 'Mitglieder' || t === 'Vorstand' ? 'badge-mit' : '';
  return `<span class="badge ${c}">${esc(t)}</span>`;
}

export function eventRow(e, withInfo) {
  const x = D(e.date);
  const title = e.url ? `<a href="${esc(e.url)}" style="color:inherit;text-decoration:none">${esc(e.title)}</a>` : esc(e.title);
  return `<div class="event"><div class="event-date"><b>${String(x.getDate()).padStart(2, '0')}</b><span>${WD[x.getDay()]} · ${MONS[x.getMonth()]}</span></div><div><h3>${title}</h3><div class="meta">${esc(e.zeit)}${e.ort ? ' · ' + esc(e.ort) : ''}</div>${withInfo && e.info ? `<div class="info">${esc(e.info)}</div>` : ''}${withInfo ? `<a class="share" href="#" data-share="${esc(`📅 ${e.title}\n${fmt(e.date)}${e.zeit ? ', ' + e.zeit : ''}${e.ort ? ' · ' + e.ort : ''}`)}" target="_blank" rel="noopener">Per WhatsApp teilen</a>` : ''}</div>${badge(e.typ)}</div>`;
}

export function eventsGrouped(list, withInfo) {
  if (!list.length) return '<p class="muted">Aktuell sind keine Termine eingetragen.</p>';
  const groups = new Map();
  list.forEach(e => { const x = D(e.date); const k = `${MONL[x.getMonth()]} ${x.getFullYear()}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); });
  return [...groups].map(([m, es]) => `<div class="month">${m}</div><div class="events">${es.map(e => eventRow(e, withInfo)).join('')}</div>`).join('');
}

export function avatar(p) {
  if (p.photo && p.photo.url) {
    return `<div class="avatar has-img"><img src="${esc(p.photo.url)}" alt="${esc(p.name)}" loading="lazy" decoding="async"><span></span></div>`;
  }
  return `<div class="avatar"><span>${initials(p.name)}</span></div>`;
}

export function personCard(p) {
  return `<button class="person" type="button" data-name="${esc(p.name)}">${avatar(p)}<div class="plate"><b>${esc(p.name)}</b><small>${esc(p.job)}</small>${p.role ? `<span class="rolle">${esc(p.role)}</span>` : ''}</div></button>`;
}

export function zielAccordion(ziele) {
  return ziele.map((z, i) => `<details class="ziel"${i === 0 ? ' open' : ''}><summary><span class="num">${String(i + 1).padStart(2, '0')}</span><span>${esc(z.title)}</span></summary><div class="ziel-body"><p>${esc(z.intro)}</p><p><b>Konkret wollen wir:</b></p><ul>${z.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></details>`).join('');
}

export function zieleGrid(ziele) {
  return ziele.map((z, i) => `<a href="${url('/ziele/')}"><span class="num">${String(i + 1).padStart(2, '0')}</span><span>${esc(z.title)}</span></a>`).join('');
}

export function tickerItems(events) {
  return events.map(e => { const x = D(e.date); return `<span>${WD[x.getDay()]} ${x.getDate()}. ${MONS[x.getMonth()]} – ${esc(e.title)}${e.ort ? ' · ' + esc(e.ort) : ''}</span>`; }).join('');
}

export function pollButtons(poll, myVote) {
  const voted = myVote !== null && myVote !== undefined;
  const total = poll.reduce((s, o) => s + o.count, 0) + (voted ? 1 : 0);
  return poll.map((o, i) => {
    const n = o.count + (voted && String(i) === String(myVote) ? 1 : 0);
    const pct = Math.round(n / total * 100);
    return `<button type="button" data-i="${i}" class="${voted && String(i) === String(myVote) ? 'mine' : ''}" ${voted ? 'disabled' : ''}><span class="bar" style="width:${voted ? pct : 0}%"></span><span>${esc(o.label)}</span><span class="pct">${voted ? pct + ' %' : ''}</span></button>`;
  }).join('');
}

export function instaTiles(items) {
  const heart = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8 3.5 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.5 0 6 3.5 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  const multi = '<svg class="multi" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="14" height="14" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v11"/></svg>';
  return items.map((i, k) => {
    const label = i.label || (i.caption ? i.caption.replace(/\s+/g, ' ').trim().slice(0, 48) + (i.caption.length > 48 ? '…' : '') : 'Instagram');
    if (!i.img) return `<a class="ph" href="${esc(i.url || 'https://www.instagram.com/spd_soltau/')}" target="_blank" rel="noopener"><span>${heart}${i.likes ? esc(i.likes) + ' · ' : ''}${esc(label)}</span></a>`;
    return `<button class="ph has-img" type="button" data-insta="${k}" aria-label="Instagram-Beitrag öffnen: ${esc(label)}">${(i.images || []).length > 1 ? multi : ''}<img src="${esc(i.img)}" alt="" loading="lazy" decoding="async"><span>${heart}${i.likes ? esc(i.likes) + ' · ' : ''}${esc(label)}</span></button>`;
  }).join('');
}

// ---------- Neu (Wunsch Vorsitz, 18.09.2026): Team-Karten mit großem Namen, schlanke Terminzeilen, Ziel-Karten mit Piktogrammen ----------
// Reihenfolge nach Funktion: Vorsitz → Stellvertretung → Finanzen/Geschäftsführung → Schriftführung → Beisitz → übrige
export function roleRank(role = '') {
  const r = String(role).toLowerCase();
  if (/stellv|stellvertret/.test(r)) return 1;
  if (/vorsitz/.test(r)) return 0;
  if (/finanz|kasse|schatz|geschäftsf|geschaeftsf/.test(r)) return 2;
  if (/schriftf/.test(r)) return 3;
  if (/beisitz/.test(r)) return 4;
  if (r.trim()) return 5;
  return 6;
}
export const byRole = list => list.map((p, i) => [p, i]).sort((a, b) => roleRank(a[0].role) - roleRank(b[0].role) || a[1] - b[1]).map(x => x[0]);

// Team-Karte: quadratisches Foto (schlicht), großer Name, Funktion in Rot, Beruf klein
export function teamCard(p) {
  const img = p.photo && p.photo.url ? `<img src="${esc(p.photo.url)}" alt="${esc(p.name)}" loading="lazy" decoding="async">` : `<span>${initials(p.name)}</span>`;
  return `<button class="tm" type="button" data-name="${esc(p.name)}"><div class="tm-photo">${img}</div><div class="tm-name">${esc(p.name)}</div>${p.role ? `<div class="tm-role">${esc(p.role)}</div>` : ''}${p.job ? `<div class="tm-job">${esc(p.job)}</div>` : ''}</button>`;
}

// Schlanke Terminzeile für die Startseite: Datum, Titel, Uhrzeit · Ort
export function eventRowMini(e) {
  const x = D(e.date);
  const title = e.url ? `<a href="${esc(e.url)}">${esc(e.title)}</a>` : esc(e.title);
  return `<div class="ev-mini"><div class="ev-mini-date"><b>${String(x.getDate()).padStart(2, '0')}</b><span>${WD[x.getDay()]} · ${MONS[x.getMonth()]}</span></div><div class="ev-mini-body"><h3>${title}</h3><div class="meta">${esc(e.zeit)}${e.ort ? ' · ' + esc(e.ort) : ''}</div></div></div>`;
}

// Piktogramme zu den 10 Punkten (Reihenfolge wie im Programm)
const ZIEL_ICONS = [
  '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M9 11h2M13 11h2"/>',                                   // Innenstadt
  '<path d="M4 19V9l8-5 8 5v10M4 19h16M9 19v-5h6v5M12 4v3"/><circle cx="12" cy="11" r="1.5"/>',            // Kitas und Schulen
  '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18M3 12h18M6.5 6.5c3 3 8 3 11 0M6.5 17.5c3-3 8-3 11 0"/>', // Sport und Therme
  '<path d="M12 3c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 1-6 1-8z"/><path d="M4 21h16"/>', // Feuerwehr
  '<path d="M3 20h18M6 20V10l4-3 4 3v10M14 20V13l4-3 3 3v7M9 20v-4h2v4"/>',                               // Ortschaften
  '<path d="M3 11l9-7 9 7v10H3zM10 21v-6h4v6"/>',                                                         // Wohnen
  '<path d="M3 21h18M5 21V9h6v12M13 21V4h6v17M8 12h0M8 15h0M8 18h0M16 8h0M16 11h0M16 14h0M16 17h0"/>',    // Arbeitsplätze
  '<path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/><circle cx="12" cy="12" r="4"/>', // Energie
  '<path d="M3 17h18M5 17l2-6h10l2 6M7 17v2M17 17v2M9 11V8h6v3"/><circle cx="8" cy="17" r="1"/><circle cx="16" cy="17" r="1"/>', // Verkehr
  '<circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20c0-3.3 2.7-6 6-6s6 2.7 6 6M10 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>', // Zusammenhalt
];
const zielIcon = i => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ZIEL_ICONS[i % ZIEL_ICONS.length]}</svg>`;

// Ziel-Karten: Kachel mit Nummer und Piktogramm, aufklappbarer Text
export function zielCards(ziele) {
  return ziele.map((z, i) => `<details class="zk"${i === 0 ? ' open' : ''}><summary><span class="zk-tile"><span class="zk-num">${String(i + 1).padStart(2, '0')}</span>${zielIcon(i)}</span><span class="zk-title">${esc(z.title)}</span><span class="zk-plus" aria-hidden="true"></span></summary><div class="zk-body"><p>${esc(z.intro)}</p><p><b>Konkret wollen wir:</b></p><ul>${z.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></details>`).join('');
}
export function zieleTiles(ziele) {
  return ziele.map((z, i) => `<a class="zt" href="${url('/ziele/')}#ziel-${i + 1}"><span class="zk-tile">${zielIcon(i)}</span><span class="zk-num">${String(i + 1).padStart(2, '0')}</span><span>${esc(z.title)}</span></a>`).join('');
}

// Wahlprogramm-Seite: jeder Punkt als breiter Block – Foto (Wix-Medien) und Text im Wechsel, große Nummer, Sprungleiste oben
export const zielImg = (z, w = 1200, h = 800) => z.img ? `https://static.wixstatic.com/media/${z.img.id}/v1/fill/w_${w},h_${h},al_${z.img.al || 'c'},q_82,enc_auto/${z.img.id}` : null;
export function zielJump(ziele) {
  return `<nav class="zj" aria-label="Zu Punkt springen">${ziele.map((z, i) => `<a href="#ziel-${i + 1}"><b>${String(i + 1).padStart(2, '0')}</b><span>${esc(z.title)}</span></a>`).join('')}</nav>`;
}
export function zielBlocks(ziele) {
  return ziele.map((z, i) => {
    const n = String(i + 1).padStart(2, '0');
    const src = zielImg(z, 1200, 800), src2 = zielImg(z, 720, 480);
    const pic = src ? `<div class="zb-pic"><img src="${src2}" srcset="${src2} 720w, ${src} 1200w" sizes="(max-width: 800px) 100vw, 50vw" alt="${esc(z.img.alt || '')}" loading="lazy" decoding="async"><b class="zb-num" aria-hidden="true">${n}</b></div>` : `<div class="zb-pic zb-pic-leer"><b class="zb-num" aria-hidden="true">${n}</b></div>`;
    return `<article class="zb${i % 2 ? ' zb-rev' : ''}" id="ziel-${i + 1}">${pic}<div class="zb-text"><span class="zb-kicker">Punkt ${i + 1} von ${ziele.length}</span><h2 class="title">${esc(z.title)}</h2><p class="zb-intro">${esc(z.intro)}</p><ul class="zb-list">${z.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></article>`;
  }).join('');
}

// Ziele als Akkordeon (nur eins offen): zugeklappt ein Fotostreifen mit Nummer und Titel, aufgeklappt wächst das Foto,
// die Nummer wird groß, darunter erscheinen Einleitung und Punkte
export function zielAccordionFotos(ziele) {
  return ziele.map((z, i) => {
    const n = String(i + 1).padStart(2, '0');
    const src = zielImg(z, 1400, 700), src2 = zielImg(z, 800, 400);
    const img = src ? `<img src="${src2}" srcset="${src2} 800w, ${src} 1400w" sizes="(max-width: 800px) 100vw, 1240px" alt="${esc(z.img.alt || '')}" loading="${i < 3 ? 'eager' : 'lazy'}" decoding="async">` : '';
    return `<article class="za" id="ziel-${i + 1}">
      <button class="za-head" type="button" aria-expanded="false" aria-controls="ziel-${i + 1}-body">
        <span class="za-pic">${img}</span>
        <span class="za-overlay"><b class="za-num">${n}</b><span class="za-title">${esc(z.title)}</span><span class="za-plus" aria-hidden="true"></span></span>
      </button>
      <div class="za-body" id="ziel-${i + 1}-body"><div class="za-inner"><div class="za-cols"><p class="za-intro">${esc(z.intro)}</p><ul class="zb-list">${z.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div></div>
    </article>`;
  }).join('');
}

// ---------- Karte (Soltau, selbst gehostete OpenStreetMap-Kacheln, Zoom 15) ----------
// Die Kacheln liegen unter assets/images/karte/ – kein Abruf von fremden Servern beim Besuch. © OpenStreetMap-Mitwirkende (ODbL).
// Zoom 14, 8 × 8 Kacheln ≈ 12 km × 12 km: Kernstadt und die Ortschaften (Wiedingen, Ahlften, Harber, Wolterdingen, Woltem, Tetendorf, Hötzingen).
export const KARTE = { z: 14, x0: 8636, y0: 5335, w: 8, h: 8, tile: 256 };
export function kartePx(lat, lng) {
  const n = 2 ** KARTE.z, r = lat * Math.PI / 180;
  const x = (lng + 180) / 360 * n, y = (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n;
  return { px: (x - KARTE.x0) * KARTE.tile, py: (y - KARTE.y0) * KARTE.tile };
}
export function karteLatLng(px, py) {
  const n = 2 ** KARTE.z, x = KARTE.x0 + px / KARTE.tile, y = KARTE.y0 + py / KARTE.tile;
  return { lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n))) * 180 / Math.PI, lng: x / n * 360 - 180 };
}
// Kartenbild mit Pins: pins = [{ id, lat, lng, nr, farbe, titel }]; Breite/Höhe = 1536 px, scrollbar im Rahmen
export function karteHtml(pins, { id = 'karte', hoehe = 480 } = {}) {
  const W = KARTE.w * KARTE.tile, H = KARTE.h * KARTE.tile;
  const kacheln = [];
  for (let dy = 0; dy < KARTE.h; dy++) for (let dx = 0; dx < KARTE.w; dx++) kacheln.push(`<img src="${url(`/assets/images/karte/${KARTE.z}-${KARTE.x0 + dx}-${KARTE.y0 + dy}.png`)}" alt="" loading="lazy" decoding="async" width="${KARTE.tile}" height="${KARTE.tile}" style="left:${dx * KARTE.tile}px;top:${dy * KARTE.tile}px">`);
  const marker = pins.filter(p => p.lat && p.lng).map(p => { const { px, py } = kartePx(+p.lat, +p.lng); if (px < 0 || py < 0 || px > W || py > H) return ''; return `<button type="button" class="karte-pin" data-pin="${esc(p.id)}" style="left:${px.toFixed(0)}px;top:${py.toFixed(0)}px;--pf:${esc(p.farbe || '#E3000F')}" aria-label="${esc(p.titel || '')}"><span></span><b>${esc(String(p.nr ?? ''))}</b></button>`; }).join('');
  return `<div class="karte" id="${esc(id)}" style="height:${hoehe}px"><div class="karte-flaeche" style="width:${W}px;height:${H}px">${kacheln.join('')}${marker}</div><span class="karte-quelle">© OpenStreetMap-Mitwirkende</span></div>`;
}
