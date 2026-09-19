// Build: holt Inhalte aus dem Wix-Backend (falls WIX_CLIENT_ID gesetzt), rendert alle Seiten nach dist/.
//
// Umgebungsvariablen (alle optional):
//   WIX_CLIENT_ID   Client-ID der Wix-Headless-OAuth-App → echte Inhalte statt Fallback
//   SITE_URL        z. B. https://www.spd-soltau.de (für canonical/sitemap)
//   BASE_PATH       z. B. /spd-soltau-website, wenn die Seite unter einem Unterpfad liegt (GitHub Pages ohne eigene Domain)
//   NOINDEX=1       Suchmaschinen aussperren (Testphase)
//   HERO_IMAGE      URL des Hero-Fotos, SITE_EMAIL Kontaktadresse, PROGRAMM_PDF Link zum Wahlprogramm
//   CNAME           eigene Domain für GitHub Pages (schreibt dist/CNAME)
//   VAPID_PUBLIC_KEY öffentlicher Schlüssel für Push-Benachrichtigungen (siehe push/setup.mjs)

import { mkdir, writeFile, copyFile, readFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fallback from './src/data-fallback.mjs';
import { WAHL, STICHWAHL, nachruecker } from './src/data-wahl2026.mjs';
import { setBase } from './src/render.mjs';
import * as T from './src/templates.mjs';
import esbuild from 'esbuild';
import { createHash } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'dist');
// .env einlesen (gesetzte Umgebungsvariablen haben Vorrang)
if (existsSync(path.join(__dirname, '.env'))) {
  for (const line of (await readFile(path.join(__dirname, '.env'), 'utf8')).split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith('#') && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
}
const env = process.env;
const BASE = (env.BASE_PATH || '').replace(/\/$/, '');
setBase(BASE);

const site = {
  name: 'SPD Soltau',
  claim: 'Aus Liebe zu Soltau',
  description: 'SPD Ortsverein und Ratsfraktion Soltau: Aktuelles aus dem Stadtrat, Termine, unser Team, der 10-Punkte-Plan und Ihr direkter Draht zu uns.',
  url: (env.SITE_URL || '').replace(/\/$/, ''),
  email: env.SITE_EMAIL || '',
  heroImage: env.HERO_IMAGE || '',
  heroImageAlt: 'Soltau aus der Luft',
  programmPdf: env.PROGRAMM_PDF || 'https://www.spd-soltau.de/wahlprogramm',
  bookingUrl: env.BOOKING_URL || 'https://www.spd-soltau.de/book-online',
  // Soltau in Zahlen (Zahlenband auf der Startseite) – bitte bei Bedarf aktualisieren
  facts: [
    ['936', 'Erste urkundliche Erwähnung als „Curtis Salta“'],
    ['22.522', 'Einwohnerinnen und Einwohner (Ende 2025)'],
    ['16 + 1', 'Ortschaften und Kernstadt'],
    ['203,8 km²', 'Stadtgebiet in der Lüneburger Heide'],
  ],
  // Drohnenvideo aus der Wix-Medienverwaltung (wird direkt von Wix' Video-Servern gestreamt)
  heroVideoId: env.HERO_VIDEO_ID === '' ? '' : (env.HERO_VIDEO_ID || 'e83cbb_ce49e360e15046c897e24239d59c4de6'),
  heroPoster: '',
};
const noindex = env.NOINDEX === '1';
// Geheimnis im Dateinamen des internen Kalender-Abos (ICS_TOKEN in .env, sonst abgeleitet)
const icsToken = env.ICS_TOKEN || createHash('sha256').update('spd-ics-' + (env.WIX_CLIENT_ID || '')).digest('hex').slice(0, 20);

// ---------- Kalender-Abo (iCalendar) ----------
function icsFeed(events, name) {
  const t = s => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const nextDay = d => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10).replace(/-/g, ''); };
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SPD Soltau//Website//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${t(name)}`, 'X-WR-TIMEZONE:Europe/Berlin', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H', 'X-PUBLISHED-TTL:PT6H',
    'BEGIN:VTIMEZONE', 'TZID:Europe/Berlin', 'BEGIN:STANDARD', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'END:STANDARD',
    'BEGIN:DAYLIGHT', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'END:DAYLIGHT', 'END:VTIMEZONE'];
  for (const e of events) {
    const m = String(e.zeit || '').match(/(\d{1,2}):(\d{2})/);
    const d = String(e.date).replace(/-/g, '');
    lines.push('BEGIN:VEVENT', `UID:${e.id || d + '-' + t(e.title).slice(0, 20)}@spd-soltau.de`, `DTSTAMP:${stamp}`, `SUMMARY:${t(e.title)}`);
    if (m) {
      const h = +m[1], mi = +m[2]; const endH = Math.min(23, h + 2);
      lines.push(`DTSTART;TZID=Europe/Berlin:${d}T${String(h).padStart(2, '0')}${String(mi).padStart(2, '0')}00`, `DTEND;TZID=Europe/Berlin:${d}T${String(endH).padStart(2, '0')}${String(mi).padStart(2, '0')}00`);
    } else lines.push(`DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${nextDay(e.date)}`);
    if (e.ort) lines.push(`LOCATION:${t(e.ort)}`);
    lines.push(`DESCRIPTION:${t([e.typ, e.info].filter(Boolean).join(' – '))}`, `CATEGORIES:${t(e.typ || 'Termin')}`, 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  // Zeilen über 75 Zeichen werden gefaltet (RFC 5545)
  const fold = l => { const out = []; let rest = l; while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = ' ' + rest.slice(74); } out.push(rest); return out.join('\r\n'); };
  return lines.map(fold).join('\r\n') + '\r\n';
}

// ---------- Daten ----------
async function loadData() {
  const d = {
    site,
    news: fallback.NEWS, events: fallback.EVENTS, people: fallback.PEOPLE, vorstand: fallback.VORSTAND,
    fraktion: fallback.PEOPLE.slice(0, 8), ziele: fallback.ZIELE, poll: fallback.POLL, insta: fallback.INSTA,
    source: { news: 'fallback', events: 'fallback', people: 'fallback', vorstand: 'fallback', fraktion: 'fallback', insta: 'fallback' },
  };
  if (!env.WIX_CLIENT_ID) {
    console.log('[build] Keine WIX_CLIENT_ID – Fallback-Inhalte werden verwendet.');
  } else {
    const wix = await import('./src/lib/wix.mjs');
    const client = wix.makeClient(env.WIX_CLIENT_ID);
    const tryLoad = async (key, fn) => {
      try { const v = await fn(); if (v && v.length) { d[key] = v; d.source[key] = 'wix'; } else console.log(`[build] ${key}: leer, Fallback bleibt`); }
      catch (e) { console.log(`[build] ${key}: Fehler (${e.message}), Fallback bleibt`); }
    };
    await tryLoad('news', () => wix.fetchNews(client));
    await tryLoad('events', () => wix.fetchEvents(client));
    await tryLoad('people', () => wix.fetchPeople(client, env.WIX_TEAM_COLLECTION || 'KandidatinnenzurStadtratswahl'));
    await tryLoad('vorstand', () => wix.fetchVorstand(client, env.WIX_VORSTAND_COLLECTION || 'Team'));
    await tryLoad('fraktion', () => wix.fetchPeople(client, env.WIX_FRAKTION_COLLECTION || 'Team1'));
    await tryLoad('insta', () => wix.fetchInstagram(client));
    try { d.blogCats = await wix.fetchCategories(client); } catch (e) { d.blogCats = []; }
  }
  // Ergänzungen aus dem Fallback (Rolle, Text, Themen), falls das CMS diese Felder (noch) nicht hat
  const fb = new Map(fallback.PEOPLE.map(p => [p.name.toLowerCase().replace(/ç/g, 'c'), p]));
  const key = n => String(n).toLowerCase().replace(/ç/g, 'c').replace(/\s+/g, ' ').trim();
  d.people = d.people.map(p => { const f = fb.get(key(p.name)); return f ? { ...p, role: p.role || f.role, text: p.text || f.text, themen: p.themen.length ? p.themen : f.themen } : p; });
  d.fraktion = d.fraktion.map(p => { const f = fb.get(key(p.name)); return f ? { ...p, role: p.role || f.role, text: p.text || f.text, themen: p.themen?.length ? p.themen : f.themen } : { themen: [], ...p }; });
  // Themenliste: feste Reihenfolge, nur Themen mit mindestens einer Person
  const used = new Set(d.people.flatMap(p => p.themen));
  d.themen = [...fallback.THEMEN_ORDER.filter(t => used.has(t)), ...[...used].filter(t => !fallback.THEMEN_ORDER.includes(t))];
  d.news.sort((a, b) => b.date.localeCompare(a.date));
  // Kommunalwahl 2026: gewählte Ratsmitglieder und Ersatzpersonen mit Foto/Beruf aus dem Team
  const norm = n => String(n).toLowerCase().replace(/ç/g, 'c').replace(/é/g, 'e').replace(/-jörg/g, '').replace(/\s+/g, ' ').trim();
  const byName = new Map(d.people.map(p => [norm(p.name), p]));
  const enrich = e => { const p = byName.get(norm(e.name)) || {}; return { ...e, job: p.job || '', text: p.text || '', photo: p.photo || null, themen: p.themen || [] }; };
  d.wahl = WAHL;
  d.rat = WAHL.gewaehlt.map(enrich);
  const nr = nachruecker(WAHL, 3);
  d.nachruecker = { nachStimmen: nr.nachStimmen.map(enrich), nachListe: nr.nachListe.map(enrich) };
  // Stichwahl-Aufruf nur bis zum Wahltag anzeigen
  const heute = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
  d.stichwahl = heute <= STICHWAHL.datum ? STICHWAHL : null;
  // Aus Rat & Rathaus: öffentliche Quellen der Stadt Soltau (ohne Wix); bei Ausfall bleibt der Block weg
  try {
    const { fetchStadt } = await import('./src/lib/stadt.mjs');
    d.stadt = await fetchStadt(m => console.log(m));
    d.source.stadt = Object.entries(d.stadt.quellen).map(([k, v]) => `${k}:${v}`).join(' ');
    if (!Object.values(d.stadt.quellen).includes('ok')) d.stadt = null;
  } catch (e) { console.log('[build] Rat & Rathaus: ' + e.message); d.stadt = null; }
  return d;
}

// ---------- Ausgabe ----------
// Interne Links werden relativ zur Seitentiefe geschrieben ("../aktuelles/"), damit die Seite unter jedem
// Pfad, Port oder Proxy funktioniert. Absolute Adressen (canonical, og:url, sitemap) bleiben absolut.
function relativize(html, rel) {
  const depth = rel.split('/').length - 1;
  const prefix = depth === 0 ? './' : '../'.repeat(depth);
  return html
    .replace(/(href|src|poster)="\/(?!\/)/g, `$1="${prefix}`)
    .replace(/url\('\/(?!\/)/g, `url('${prefix}`)
    .replace('"base":""', `"base":"${prefix.replace(/\/$/, '')}"`);
}
async function write(rel, html) {
  const file = path.join(OUT, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, rel.endsWith('.html') && !BASE ? relativize(html, rel) : html, 'utf8');
}

async function copyFonts() {
  // SPD-Hausschrift „TheSans SPD“ (aus der Wix-Medienverwaltung des Ortsvereins), selbst gehostet
  const fontsDir = path.join(OUT, 'assets', 'fonts');
  await mkdir(fontsDir, { recursive: true });
  const specs = [
    ['thesans-spd-regular', 'TheSans SPD', 400, 'normal'],
    ['thesans-spd-bold', 'TheSans SPD', 700, 'normal'],
    ['thesans-spd-extrabold', 'TheSans SPD', 800, 'normal'],
    ['thesans-spd-versal-extrabold', 'TheSans SPD Versal', 800, 'normal'],
    ['thesans-spd-versal-bold-italic', 'TheSans SPD Versal', 700, 'italic'],
  ];
  let css = '';
  for (const [file, family, weight, style] of specs) {
    const src = path.join(__dirname, 'src', 'fonts', `${file}.woff2`);
    if (!existsSync(src)) { console.log('[build] Schrift fehlt:', src); continue; }
    await copyFile(src, path.join(fontsDir, `${file}.woff2`));
    css += `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:swap;src:url(fonts/${file}.woff2) format('woff2')}\n`;
  }
  await writeFile(path.join(OUT, 'assets', 'fonts.css'), css, 'utf8');
}

// ---------- App: Mitgliederbereich-Bundle, Service Worker, Manifest, Icons ----------
async function buildApp() {
  const buildId = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
  // Mitgliederbereich: Wix-SDK + eigene Logik als ein Modul gebündelt
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src', 'members.js')], outfile: path.join(OUT, 'assets', 'mitglieder.js'),
    bundle: true, minify: true, format: 'esm', platform: 'browser', target: ['es2020', 'safari15'], logLevel: 'warning',
    define: { 'process.env.NODE_ENV': '"production"' }, banner: { js: `/* SPD Soltau – Mitgliederbereich, Build ${buildId} */` },
  });
  const sw = await readFile(path.join(__dirname, 'src', 'sw.js'), 'utf8');
  await writeFile(path.join(OUT, 'sw.js'), sw.replace('__BUILD__', buildId), 'utf8');
  await writeFile(path.join(OUT, 'offline.html'), `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline – SPD Soltau</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#E3000F;color:#fff;font-family:'TheSans SPD','Segoe UI',Arial,sans-serif;text-align:center;padding:24px}h1{font-size:40px;margin:0 0 12px;text-transform:uppercase}a{color:#fff}</style></head><body><div><h1>Gerade offline</h1><p>Diese Seite ist noch nicht gespeichert. Sobald wieder Netz da ist, klappt es.</p><p><a href="./">Zur Startseite</a></p></div></body></html>`, 'utf8');
  const manifest = {
    id: './', name: 'SPD Soltau', short_name: 'SPD Soltau', description: site.description, lang: 'de', dir: 'ltr',
    start_url: './index.html', scope: './', display: 'standalone', orientation: 'portrait', background_color: '#E3000F', theme_color: '#E3000F',
    icons: [
      { src: 'assets/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'assets/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Mitgliederbereich', url: './mitglieder/', icons: [{ src: 'assets/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Termine', url: './mitglieder/#termine', icons: [{ src: 'assets/icons/icon-192.png', sizes: '192x192' }] },
      { name: 'Aktuelles', url: './aktuelles/', icons: [{ src: 'assets/icons/icon-192.png', sizes: '192x192' }] },
    ],
  };
  await writeFile(path.join(OUT, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2), 'utf8');
  // Icons aus dem weißen Logo auf SPD-Rot (maskable: Logo kleiner, damit runde Masken nichts abschneiden)
  const { default: sharp } = await import('sharp');
  const logo = path.join(__dirname, 'src', 'images', 'logo-spd-soltau-weiss.png');
  const iconDir = path.join(OUT, 'assets', 'icons');
  await mkdir(iconDir, { recursive: true });
  const icon = async (size, file, inner, bg = { r: 227, g: 0, b: 15, alpha: 1 }) => {
    const l = await sharp(logo).resize(Math.round(size * inner), Math.round(size * inner), { fit: 'inside' }).png().toBuffer();
    await sharp({ create: { width: size, height: size, channels: 4, background: bg } }).composite([{ input: l, gravity: 'centre' }]).png().toFile(path.join(iconDir, file));
  };
  await icon(192, 'icon-192.png', 0.78);
  await icon(512, 'icon-512.png', 0.78);
  await icon(512, 'maskable-512.png', 0.6);
  await icon(180, 'apple-touch-icon.png', 0.78);
  await icon(96, 'badge-96.png', 0.9, { r: 0, g: 0, b: 0, alpha: 0 });
}

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#E3000F"/><text x="32" y="44" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="30" fill="#fff" text-anchor="middle">SPD</text></svg>`;

async function main() {
  const t0 = Date.now();
  await rm(OUT, { recursive: true, force: true });
  await mkdir(path.join(OUT, 'assets'), { recursive: true });

  const d = await loadData();
  // Instagram-Bilder auf den eigenen Host holen (Besucher haben so keinen Kontakt zu Instagram-Servern)
  if (d.source.insta === 'wix') {
    await mkdir(path.join(OUT, 'assets', 'insta'), { recursive: true });
    const { default: sharp } = await import('sharp');
    for (const it of d.insta) {
      const local = [];
      for (const [k, src] of (it.images || [it.img]).entries()) {
        try {
          const res = await fetch(src);
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const buf = Buffer.from(await res.arrayBuffer());
          const file = `${it.id}-${k + 1}.jpg`;
          // Ansichtsgröße (max. 1080 px Kante), Kachel nutzt das erste Bild
          const img = await sharp(buf).resize(1080, 1080, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
          await writeFile(path.join(OUT, 'assets', 'insta', file), img);
          if (k === 0) {
            const thumb = await sharp(buf).resize(720, 720, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
            await writeFile(path.join(OUT, 'assets', 'insta', `${it.id}.jpg`), thumb);
          }
          local.push(`${BASE}/assets/insta/${file}`);
        } catch (e) { console.log('[build] Instagram-Bild nicht ladbar:', it.id, k + 1, e.message); }
      }
      it.images = local;
      it.img = local.length ? `${BASE}/assets/insta/${it.id}.jpg` : null;
    }
  }
  // Standbild des Hero-Videos lokal ablegen (schneller erster Eindruck, Fallback bei „Bewegung reduzieren“)
  if (site.heroVideoId) {
    try {
      const res = await fetch(`https://static.wixstatic.com/media/${site.heroVideoId}f000.jpg/v1/fill/w_1600,h_900,al_c,q_85/poster.jpg`);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const { default: sharp } = await import('sharp');
      const buf = await sharp(Buffer.from(await res.arrayBuffer())).resize(1600, 900, { fit: 'cover' }).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
      await mkdir(path.join(OUT, 'assets', 'images'), { recursive: true });
      await writeFile(path.join(OUT, 'assets', 'images', 'hero-poster.jpg'), buf);
      site.heroPoster = `${BASE}/assets/images/hero-poster.jpg`;
    } catch (e) { console.log('[build] Hero-Standbild nicht ladbar:', e.message); }
  }
  const clientData = {
    people: d.people.map(p => ({ name: p.name, job: p.job, role: p.role, text: p.text, themen: p.themen, photo: p.photo })),
    vorstand: d.vorstand.map(v => ({ name: v.name, job: v.job, role: v.position, text: '', themen: [], photo: v.photo })),
    fraktion: d.fraktion.map(p => ({ name: p.name, job: p.job, role: p.role, text: p.text, themen: p.themen || [], photo: p.photo })),
    rat: d.rat.map(p => ({ name: p.name, job: p.job, role: p.art === 'direkt' ? `${p.stimmen.toLocaleString('de-DE')} Stimmen · direkt gewählt` : `Listenplatz ${p.listenplatz} · über die Liste gewählt`, text: p.text, themen: [], photo: p.photo })),
    themen: d.themen,
    events: d.events,
    // Sitzungen der Stadt (Bürgerinformationssystem) mit Tagesordnung – für die Ratsvorbereitung in der App
    sitzungen: (d.stadt?.sitzungen || []).slice(0, 8).map(s => ({ datum: s.datum, zeit: s.zeit, gremium: s.gremiumLang, ort: s.ort, url: s.url, tops: s.tops || [] })),
    news: d.news.map(n => ({ slug: n.slug, cat: n.cat, date: n.date, title: n.title, teaser: n.teaser, img: n.img, imgLabel: n.imgLabel })),
    insta: d.insta.map(i => ({ id: i.id, url: i.url, images: i.images || [], caption: i.caption, date: i.date, likes: i.likes, comments: i.comments })),
    heroVideo: site.heroVideoId ? { base: `https://video.wixstatic.com/video/${site.heroVideoId}`, poster: site.heroPoster } : null,
    app: { clientId: env.WIX_CLIENT_ID || '', vapid: env.VAPID_PUBLIC_KEY || '', blogCats: d.blogCats || [], ics: { public: `${BASE}/assets/termine.ics`, intern: `${BASE}/assets/termine-intern-${icsToken}.ics` } },
  };
  // Kalender-Abos (ICS): öffentlich nur die öffentlichen Termine, intern alle (Adresse mit Geheimnis, nur im Mitgliederbereich verlinkt)
  await writeFile(path.join(OUT, 'assets', 'termine.ics'), icsFeed(d.events.filter(e => e.typ === 'Öffentlich' || e.typ === 'Rat'), 'SPD Soltau – Termine'), 'utf8');
  await writeFile(path.join(OUT, 'assets', `termine-intern-${icsToken}.ics`), icsFeed(d.events, 'SPD Soltau – alle Termine (Mitglieder)'), 'utf8');
  const page = (rel, pth, title, description, content, extra = {}) =>
    write(rel, T.layout({ site, path: pth, title, description, content, clientData, noindex, ...extra }));

  const pages = [
    ['index.html', '/', 'Start', '', T.startPage(d)],
    ['aktuelles/index.html', '/aktuelles/', 'Aktuelles', 'Neues aus Rat und Ortsverein: Berichte aus der Fraktion, Pressemitteilungen und Einblicke in unsere Arbeit.', T.aktuellesPage(d)],
    ['termine/index.html', '/termine/', 'Termine', 'Ratssitzungen, Fraktions- und Vorstandssitzungen, Infostände – wann und wo wir uns treffen.', T.terminePage(d)],
    ['stadtrat-2026/index.html', '/stadtrat-2026/', 'Unsere 11 im Stadtrat', 'Kommunalwahl 2026: Die elf gewählten SPD-Ratsmitglieder für Soltau, die Sitzverteilung im neuen Rat und wer nachrückt.', T.stadtratPage(d)],
    ['fraktion/index.html', '/fraktion/', 'Fraktion', 'Die SPD-Ratsfraktion im Stadtrat Soltau: Mitglieder, Anträge und Entscheidungen erklärt.', T.fraktionPage(d)],
    ['ortsverein/index.html', '/ortsverein/', 'Vorstand', 'Der Vorstand des SPD Ortsvereins Soltau: Wer den Ortsverein führt, Treffpunkt Roter Bahnhof, Kontakt.', T.ortsvereinPage(d)],
    ['ziele/index.html', '/ziele/', 'Unsere Ziele', 'Der 10-Punkte-Plan der SPD Soltau für die Wahlperiode 2026 bis 2031.', T.zielePage(d)],
    ['mitmachen/index.html', '/mitmachen/', 'Mitmachen', 'Mitglied werden, Newsletter oder ein Nachmittag am Infostand – so können Sie Soltau mitgestalten.', T.mitmachenPage(d)],
    ['kontakt/index.html', '/kontakt/', 'Kontakt', 'Ihr Anliegen an die SPD Soltau: Schlagloch, Kita-Platz, Ratsbeschluss – wir antworten.', T.kontaktPage(d)],
    ['roter-bahnhof/index.html', '/roter-bahnhof/', 'Roter Bahnhof', 'Den Roten Bahnhof in Soltau für Treffen, Vorträge und kleine Veranstaltungen anfragen.', T.roterBahnhofPage(d)],
    ['newsletter/index.html', '/newsletter/', 'Newsletter', 'Newsletter der SPD Soltau: anmelden, bestätigen, abmelden.', T.newsletterPage(d)],
    ['rat-und-rathaus/index.html', '/rat-und-rathaus/', 'Aus Rat & Rathaus', 'Sitzungen des Rates, Amtsblatt, Meldungen aus dem Rathaus und laufende Beteiligungen – automatisch aus den öffentlichen Quellen der Stadt Soltau.', T.ratRathausPage(d)],
    ['mitglieder/index.html', '/mitglieder/', 'Mitgliederbereich', 'Mitgliederbereich der SPD Soltau: Anmelden, Termine zusagen, Benachrichtigungen, App.', T.mitgliederPage(d)],
    ['impressum/index.html', '/impressum/', 'Impressum', 'Impressum des SPD Ortsvereins Soltau.', T.impressumPage(d)],
    ['datenschutz/index.html', '/datenschutz/', 'Datenschutz', 'Datenschutzhinweise der Website des SPD Ortsvereins Soltau.', T.datenschutzPage(d)],
    ['transparenz/index.html', '/transparenz/', 'Transparenz', 'Transparenzbekanntmachung zur Kommunalwahl 2026.', T.transparenzPage(d)],
  ];
  for (const [rel, pth, title, desc, html] of pages) await page(rel, pth, title, desc, html);
  for (const n of d.news) await page(`aktuelles/${n.slug}/index.html`, `/aktuelles/${n.slug}/`, n.title, n.teaser, T.beitragPage(d, n), { ogImage: n.img?.url || null });
  await write('404.html', T.layout({ site, path: '/404', title: 'Seite nicht gefunden', description: '', content: T.notFoundPage(d), clientData, noindex: true }));

  // Assets
  await copyFile(path.join(__dirname, 'src', 'styles.css'), path.join(OUT, 'assets', 'styles.css'));
  await copyFile(path.join(__dirname, 'src', 'site.js'), path.join(OUT, 'assets', 'site.js'));
  await copyFile(path.join(__dirname, 'src', 'render.mjs'), path.join(OUT, 'assets', 'render.mjs'));
  await writeFile(path.join(OUT, 'assets', 'favicon.svg'), FAVICON, 'utf8');
  await copyFonts();
  // Hilfevideos und Poster (src/hilfe → assets/hilfe), sofern vorhanden
  const helpDir = path.join(__dirname, 'src', 'hilfe');
  if (existsSync(helpDir)) {
    await mkdir(path.join(OUT, 'assets', 'hilfe'), { recursive: true });
    for (const f of await readdir(helpDir)) if (/\.(mp4|jpg|webp|vtt)$/.test(f)) await copyFile(path.join(helpDir, f), path.join(OUT, 'assets', 'hilfe', f));
  }
  await buildApp();
  const imgDir = path.join(__dirname, 'src', 'images');
  if (existsSync(imgDir)) {
    await mkdir(path.join(OUT, 'assets', 'images'), { recursive: true });
    for (const f of await readdir(imgDir)) await copyFile(path.join(imgDir, f), path.join(OUT, 'assets', 'images', f));
  }

  // Suchmaschinen & Hosting
  await writeFile(path.join(OUT, '.nojekyll'), '', 'utf8');
  if (env.CNAME) await writeFile(path.join(OUT, 'CNAME'), env.CNAME + '\n', 'utf8');
  const urls = [...pages.map(p => p[1]), ...d.news.map(n => `/aktuelles/${n.slug}/`)];
  if (site.url && !noindex) {
    await writeFile(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${site.url}${BASE}${u}</loc></url>`).join('\n')}\n</urlset>\n`, 'utf8');
    await writeFile(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${site.url}${BASE}/sitemap.xml\n`, 'utf8');
  } else {
    await writeFile(path.join(OUT, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');
  }
  await writeFile(path.join(OUT, 'build-info.json'), JSON.stringify({ builtAt: new Date().toISOString(), source: d.source, counts: { news: d.news.length, events: d.events.length, people: d.people.length, vorstand: d.vorstand.length } }, null, 2), 'utf8');
  console.log(`[build] Fertig: ${urls.length} Seiten in ${Date.now() - t0} ms → dist/  Quellen:`, d.source);
}

main().catch(e => { console.error(e); process.exit(1); });
