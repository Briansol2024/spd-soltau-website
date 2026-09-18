// Build: holt Inhalte aus dem Wix-Backend (falls WIX_CLIENT_ID gesetzt), rendert alle Seiten nach dist/.
//
// Umgebungsvariablen (alle optional):
//   WIX_CLIENT_ID   Client-ID der Wix-Headless-OAuth-App → echte Inhalte statt Fallback
//   SITE_URL        z. B. https://www.spd-soltau.de (für canonical/sitemap)
//   BASE_PATH       z. B. /spd-soltau-website, wenn die Seite unter einem Unterpfad liegt (GitHub Pages ohne eigene Domain)
//   NOINDEX=1       Suchmaschinen aussperren (Testphase)
//   HERO_IMAGE      URL des Hero-Fotos, SITE_EMAIL Kontaktadresse, PROGRAMM_PDF Link zum Wahlprogramm
//   CNAME           eigene Domain für GitHub Pages (schreibt dist/CNAME)

import { mkdir, writeFile, copyFile, readFile, rm, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as fallback from './src/data-fallback.mjs';
import { WAHL, STICHWAHL, nachruecker } from './src/data-wahl2026.mjs';
import { setBase } from './src/render.mjs';
import * as T from './src/templates.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'dist');
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

const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#E3000F"/><text x="32" y="44" font-family="Arial Black,Arial,sans-serif" font-weight="900" font-size="30" fill="#fff" text-anchor="middle">SPD</text></svg>`;

async function main() {
  const t0 = Date.now();
  await rm(OUT, { recursive: true, force: true });
  await mkdir(path.join(OUT, 'assets'), { recursive: true });

  const d = await loadData();
  // Instagram-Bilder auf den eigenen Host holen (Besucher haben so keinen Kontakt zu Instagram-Servern)
  if (d.source.insta === 'wix') {
    await mkdir(path.join(OUT, 'assets', 'insta'), { recursive: true });
    for (const it of d.insta) {
      try {
        const res = await fetch(it.img);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const file = `${it.id}.jpg`;
        const buf = Buffer.from(await res.arrayBuffer());
        // auf Kachelgröße verkleinern (quadratisch, 720 px) – spart bis zu 90 % Datenvolumen
        const { default: sharp } = await import('sharp');
        const small = await sharp(buf).resize(720, 720, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
        await writeFile(path.join(OUT, 'assets', 'insta', file), small);
        it.img = `${BASE}/assets/insta/${file}`;
      } catch (e) { console.log('[build] Instagram-Bild nicht ladbar:', it.id, e.message); it.img = null; }
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
    news: d.news.map(n => ({ slug: n.slug, cat: n.cat, date: n.date, title: n.title, teaser: n.teaser, img: n.img, imgLabel: n.imgLabel })),
    heroVideo: site.heroVideoId ? { base: `https://video.wixstatic.com/video/${site.heroVideoId}`, poster: site.heroPoster } : null,
  };
  const page = (rel, pth, title, description, content, extra = {}) =>
    write(rel, T.layout({ site, path: pth, title, description, content, clientData, noindex, ...extra }));

  const pages = [
    ['index.html', '/', 'Start', '', T.startPage(d)],
    ['aktuelles/index.html', '/aktuelles/', 'Aktuelles', 'Neues aus Rat und Ortsverein: Berichte aus der Fraktion, Pressemitteilungen und Einblicke in unsere Arbeit.', T.aktuellesPage(d)],
    ['termine/index.html', '/termine/', 'Termine', 'Ratssitzungen, Fraktions- und Vorstandssitzungen, Infostände – wann und wo wir uns treffen.', T.terminePage(d)],
    ['stadtrat-2026/index.html', '/stadtrat-2026/', 'Unsere 11 im Stadtrat', 'Kommunalwahl 2026: Die elf gewählten SPD-Ratsmitglieder für Soltau, die Sitzverteilung im neuen Rat und wer nachrückt.', T.stadtratPage(d)],
    ['fraktion/index.html', '/fraktion/', 'Fraktion', 'Die SPD-Ratsfraktion im Stadtrat Soltau: Mitglieder, Anträge und Entscheidungen erklärt.', T.fraktionPage(d)],
    ['ortsverein/index.html', '/ortsverein/', 'Ortsverein', 'Der SPD Ortsverein Soltau: Vorstand, Team und der Rote Bahnhof.', T.ortsvereinPage(d)],
    ['ziele/index.html', '/ziele/', 'Unsere Ziele', 'Der 10-Punkte-Plan der SPD Soltau für die Wahlperiode 2026 bis 2031.', T.zielePage(d)],
    ['mitmachen/index.html', '/mitmachen/', 'Mitmachen', 'Mitglied werden, Newsletter oder ein Nachmittag am Infostand – so können Sie Soltau mitgestalten.', T.mitmachenPage(d)],
    ['kontakt/index.html', '/kontakt/', 'Kontakt', 'Ihr Anliegen an die SPD Soltau: Schlagloch, Kita-Platz, Ratsbeschluss – wir antworten.', T.kontaktPage(d)],
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
