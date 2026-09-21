// „Aus Rat & Rathaus“: liest beim Bau die öffentlichen Seiten der Stadt Soltau – Bürgerinformationssystem (nächste Sitzungen),
// soltau.de (Neuigkeiten, Amtsblatt, Bauleitplanung/Beteiligung, Baustellen). Keine KI, keine Schlüssel: Die Seiten sind
// strukturiert, wir übernehmen Überschrift, Datum und Link per Mustervergleich. Amtliche Bekanntmachungen sind gemeinfrei (§ 5 UrhG),
// von Rathaus-Meldungen übernehmen wir nur Titel und einen Anrisssatz. Fällt eine Quelle aus, bleibt ihre Liste leer.
const RIS = 'https://ris.stadt-soltau.de/bi/';
const STADT = 'https://www.soltau.de/';
const UA = 'Mozilla/5.0 (compatible; spd-soltau-website-build; +https://www.spd-soltau.de)';

const unescapeHtml = s => String(s || '').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&szlig;/g, 'ß').replace(/&auml;/g, 'ä').replace(/&ouml;/g, 'ö').replace(/&uuml;/g, 'ü').replace(/&Auml;/g, 'Ä').replace(/&Ouml;/g, 'Ö').replace(/&Uuml;/g, 'Ü');
const text = s => unescapeHtml(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const isoOf = de => { const m = String(de).match(/(\d{2})\.(\d{2})\.(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : ''; };
const abs = (href, base) => { try { return new URL(href, base).href; } catch (e) { return ''; } };

async function get(url, timeout = 15000) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'user-agent': UA, accept: 'text/html' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.text();
  } finally { clearTimeout(t); }
}

// ---- Bürgerinformationssystem: nächste Sitzungen (Startseite) + Links zur Tagesordnung aus dem Monatskalender, falls schon veröffentlicht ----
const ORT_KURZ = o => text(o).replace(/^Soltau,\s*/i, '').replace(/,?\s*29614\s*Soltau\s*$/i, '').replace(/^in der Alten Reithalle/i, 'Alte Reithalle').replace(/^Sitzungssaal des Alten Rathauses/i, 'Altes Rathaus').replace(/^(in der|im|in)\s+/i, '');
const GREMIUM = g => /^Rat$/i.test(g) ? 'Rat der Stadt Soltau' : g;
export async function fetchSitzungen() {
  const html = await get(RIS + 'infobi.asp');
  const out = [];
  const re = /<abbr title="[^"]*" class="smc weekday">(\w{2})<\/abbr>[\s\S]*?class="smc-el-h ">\s*(\d{2}\.\d{2}\.\d{4})\s+([^<]+?)\s*<!--[\s\S]*?<li class="list-inline-item">([^<]*?)<\/li>\s*<li class="list-inline-item">([^<]*?)<\/li>/g;
  let m;
  while ((m = re.exec(html))) {
    const datum = isoOf(m[2]);
    out.push({ wochentag: m[1], datum, zeit: text(m[4]).replace(/\s*Uhr$/, ''), gremium: text(m[3]), gremiumLang: GREMIUM(text(m[3])), ort: ORT_KURZ(m[5]), url: `${RIS}si0040.asp?__cjahr=${datum.slice(0, 4)}&__cmonat=${+datum.slice(5, 7)}&__canz=1&__cselect=0`, tagesordnung: false });
  }
  // Links zur Tagesordnung (si0057.asp?__ksinr=…) stehen im Monatskalender, sobald die Einladung veröffentlicht ist
  const monate = [...new Set(out.map(s => s.datum.slice(0, 7)))].slice(0, 2);
  for (const ym of monate) {
    try {
      const kal = await get(`${RIS}si0040.asp?__cjahr=${ym.slice(0, 4)}&__cmonat=${+ym.slice(5, 7)}&__canz=1&__cselect=0`);
      const rows = kal.split(/<tr\b/).slice(1);
      for (const row of rows) {
        const link = row.match(/href="(si0057\.asp\?__ksinr=\d+)"/); if (!link) continue;
        const tag = row.match(/class="weekday">(\d{1,2})<\/span>/); const name = row.match(/class="smc-el-h ">\s*([^<]+?)\s*</);
        if (!tag || !name) continue;
        const datum = `${ym}-${String(+tag[1]).padStart(2, '0')}`;
        const s = out.find(x => x.datum === datum && x.gremium === text(name[1]));
        if (s) { s.url = RIS + link[1]; s.tagesordnung = true; }
      }
    } catch (e) { /* Kalender nicht erreichbar – Link auf den Monat bleibt */ }
  }
  // Tagesordnung der Sitzungen, die schon eine haben (öffentlicher Teil: „Ö 1 …“), für die Ratsvorbereitung in der App
  for (const s of out.filter(x => x.tagesordnung).slice(0, 6)) {
    try { s.tops = await fetchTagesordnung(s.url); } catch (e) { s.tops = []; }
  }
  return out;
}
export async function fetchTagesordnung(url) {
  const html = await get(url);
  const tops = [];
  for (const row of html.split('<tr').slice(1)) {
    const nr = row.match(/class="badge">([^<]+)<\/span>/); const titel = row.match(/smc-card-header-title-simple">([\s\S]*?)<\/div>/);
    if (!nr || !titel) continue;
    const n = text(nr[1]); if (!/^Ö/.test(n)) continue; // nur der öffentliche Teil
    const vorlage = row.match(/href="(vo0050\.asp\?__kvonr=\d+)"[^>]*>([^<]+)</);
    tops.push({ nr: n.replace(/^Ö\s*/, ''), titel: text(titel[1]), vorlage: vorlage ? text(vorlage[2]) : '', vorlageUrl: vorlage ? RIS + vorlage[1] : '' });
  }
  return tops;
}

// ---- soltau.de: Neuigkeiten / Bauleitplanung / Baustellen (alle als „NewsItem“ aufgebaut) ----
function parseNewsItems(html, base) {
  const out = [];
  for (const block of html.split('<div class="NewsItem"').slice(1)) {
    const titel = text((block.match(/data-title="([^"]*)"/) || [])[1]);
    const href = (block.match(/class="NewsItem-titlelink">|href="([^"]+)"[^>]*title="weiterlesen"/) && block.match(/href="([^"]+)"[^>]*title="weiterlesen"/) || [])[1] || '';
    const preview = text((block.match(/<\/h3>([\s\S]*?)<\/div>/) || [])[1]);
    const datum = isoOf(preview);
    const teaser = preview.replace(/^\d{2}\.\d{2}\.\d{4},?\s*/, '').trim();
    const bild = (block.match(/class="NewsItem-image" src="([^"]+)"/) || [])[1] || '';
    if (titel) out.push({ titel, datum, teaser, url: abs(href, base), bild: bild ? abs(bild, base) : '' });
  }
  return out;
}
// Politisch bzw. für Bürger relevant – Feste, Kino, Wettbewerbe bleiben draußen
const RELEVANT = /wahl|\brat\b|rats|haushalt|bebauungsplan|flächennutzung|kita|schule|ganztag|verkehr|bahn|straße|radweg|sanierung|wohn|gewerbe|bürgerbeteiligung|beteiligung|wärme|feuerwehr|jugend|senioren|steuer|gebühr|verwaltung|bürgermeister|stadtentwicklung|innenstadt|marktstraße|bahnhof|umwelt|klima|hochwasser|abfall|laub|grüngut|sperrung|baustelle|stellenaus|satzung|sitzung|ausschuss|neubau|umbau|quartier|kindergarten|bürgerbüro|online|stadtradeln|bürgerservice|personalausweis|wohnsitz/i;
const UNWICHTIG = /\bfest\b|kino|konzert|manga|lesefieber|chorwettbewerb|karrieretag|fotowettbewerb|rock im hagen|bauernmarkt|tag der offenen|lauschtour|theater|ausstellung|fräulein|laternen|wunschbaum|public viewing|sommerferien|zukunftstag|austausch|jubiläum|gewinnt|geschichten|lesung|bücherei|bibliothek/i;
export async function fetchRathaus() {
  const html = await get(STADT + 'home/aktuelles/neuigkeiten.aspx');
  return parseNewsItems(html, STADT).map(n => ({ ...n, relevant: RELEVANT.test(n.titel + ' ' + n.teaser) && !UNWICHTIG.test(n.titel) })).filter(n => n.datum).sort((a, b) => b.datum.localeCompare(a.datum));
}
export async function fetchMitreden() {
  const html = await get(STADT + 'home/aktuelles/aktuelle-bauleitplaverfahren-shortcut.aspx');
  return parseNewsItems(html, STADT).map(n => {
    const zr = n.teaser.match(/vom\s+(\d{2}\.\d{2}\.\d{4})\s+bis\s+(?:einschließlich\s+)?(\d{2}\.\d{2}\.\d{4})/i);
    return { titel: n.titel.replace(/\s*"([^"]*)"\s*$/, ' „$1“'), url: n.url, text: n.teaser, von: zr ? isoOf(zr[1]) : '', bis: zr ? isoOf(zr[2]) : '' };
  });
}
export async function fetchBaustellen() {
  const html = await get(STADT + 'home/aktuelles/baustellen.aspx');
  return parseNewsItems(html, STADT).sort((a, b) => b.datum.localeCompare(a.datum));
}
// Baustellen mit Detailseite: Text, Zeitraum („vom 7. September bis 27. November 2026“), Grund („Aufgrund einer Leitungsverlegung“)
export async function fetchBaustellenDetails(items) {
  const MON = { januar: 1, februar: 2, märz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12 };
  const iso = (t, m, j) => `${j}-${String(MON[m.toLowerCase()] || +m || 0).padStart(2, '0')}-${String(+t).padStart(2, '0')}`;
  const out = [];
  for (const it of items.slice(0, 15)) {
    let body = '';
    try {
      const h = await get(it.url, 12000);
      const m = h.match(/class="ArticleCreate-content">([\s\S]*?)<\/div>\s*<\/div>/) || h.match(/class="DetailView-description">([\s\S]*?)<\/div>\s*<\/div>/);
      body = text((m ? m[1] : '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')).replace(/^\s*\d{2}\.\d{2}\.\d{4},?\s*/, '').trim().slice(0, 1200) || it.teaser || '';
    } catch (e) { body = it.teaser || ''; }
    const voll = `${it.titel} ${body}`;
    // Zeitraum
    let von = '', bis = '';
    const z1 = voll.match(/vom\s+(\d{1,2})\.\s*(\w+)?\.?\s*(\d{4})?\s+bis\s+(?:zum\s+)?(\d{1,2})\.\s*(\w+)\.?\s*(\d{4})/i);
    const z2 = voll.match(/bis\s+(?:zum\s+|voraussichtlich\s+)?(\d{1,2})\.\s*(\w+)\.?\s*(\d{4})/i);
    const z3 = voll.match(/ab\s+(?:dem\s+)?(\d{1,2})\.\s*(\w+)\.?\s*(\d{4})/i);
    if (z1) { von = iso(z1[1], z1[2] || z1[5], z1[3] || z1[6]); bis = iso(z1[4], z1[5], z1[6]); }
    else if (z2) bis = iso(z2[1], z2[2], z2[3]);
    if (!von && z3) von = iso(z3[1], z3[2], z3[3]);
    const grund = (voll.match(/(?:Aufgrund|Wegen)\s+(.+?)(?=\s+(?:ist|wird|werden|sind|muss|müssen|kommt|kann)\b|,|\.)/i) || voll.match(/Grund:\s*([^.]{5,120})/i) || [])[1] || '';
    out.push({ ...it, text: body, von, bis, grund: grund.trim() });
  }
  return out;
}
// ---- Amtsblatt: Datum, Nummer, Themen, PDF ----
export async function fetchAmtsblatt() {
  const html = await get(STADT + 'home/aktuelles/bekanntmachungen_der_stadt_soltau.aspx');
  const out = [];
  const re = /<a class="Document sortItem" href="([^"]+)"[^>]*data-title="([^"]*)"[^>]*data-date="(\d{8})"[\s\S]*?class="Document-previewText">([\s\S]*?)<\/span>/g;
  let m;
  while ((m = re.exec(html))) {
    const t = text(m[2]); const nr = (t.match(/Nr\.?\s*(\d+)/i) || [])[1] || '';
    out.push({ datum: `${m[3].slice(0, 4)}-${m[3].slice(4, 6)}-${m[3].slice(6, 8)}`, nummer: nr ? 'Nr. ' + nr : t.replace(/^\d{2}\.\d{2}\.\d{4}\s*-\s*/, ''), thema: text(m[4]), url: abs(m[1], STADT) });
  }
  return out.sort((a, b) => b.datum.localeCompare(a.datum));
}

// ---- alles zusammen, jede Quelle für sich abgesichert ----
export async function fetchStadt(log = () => {}) {
  const heute = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
  const d = { stand: new Date().toISOString(), heute, sitzungen: [], rathaus: [], amtsblatt: [], mitreden: [], baustellen: [], quellen: {} };
  const jobs = [['sitzungen', fetchSitzungen], ['rathaus', fetchRathaus], ['amtsblatt', fetchAmtsblatt], ['mitreden', fetchMitreden], ['baustellen', fetchBaustellen]];
  await Promise.all(jobs.map(async ([k, fn]) => {
    try { d[k] = await fn(); d.quellen[k] = d[k].length ? 'ok' : 'leer'; }
    catch (e) { d.quellen[k] = 'fehler'; log(`[stadt] ${k}: ${e.message}`); }
  }));
  d.sitzungen = d.sitzungen.filter(s => s.datum >= heute).sort((a, b) => a.datum.localeCompare(b.datum) || a.zeit.localeCompare(b.zeit));
  d.mitreden = d.mitreden.filter(m => !m.bis || m.bis >= heute);
  d.rathaus = d.rathaus.slice(0, 30);
  d.amtsblatt = d.amtsblatt.slice(0, 12);
  d.baustellen = d.baustellen.slice(0, 5);
  return d;
}

// Kacheln für die Startseite: das Wichtigste zuerst, höchstens vier
export function stadtKacheln(d, max = 4) {
  if (!d) return [];
  const fmtTag = iso => iso ? `${['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(iso + 'T12:00:00').getDay()]} ${iso.slice(8, 10)}.${iso.slice(5, 7)}.` : '';
  const kurz = iso => iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.` : '';
  const k = [];
  const mit = d.mitreden[0];
  if (mit) k.push({ art: 'mitreden', kicker: `Jetzt mitreden${mit.bis ? ' · bis ' + kurz(mit.bis) : ''}`, kurz: `Mitreden${mit.bis ? ' bis ' + kurz(mit.bis) : ''}`, titel: mit.titel, sub: 'Öffentliche Auslegung – Stellungnahme möglich', url: mit.url, dunkel: true });
  const s = d.sitzungen[0];
  if (s) k.push({ art: 'sitzung', kicker: `Nächste Sitzung · ${fmtTag(s.datum)}, ${s.zeit}`, kurz: `${fmtTag(s.datum)}, ${s.zeit} Uhr`, titel: s.gremiumLang, sub: `${s.ort}${s.tagesordnung ? ' · Tagesordnung' : ' · Bürgerinfosystem'}`, url: s.url });
  const a = d.amtsblatt[0];
  if (a) k.push({ art: 'amtsblatt', kicker: `Amtsblatt ${a.nummer} · ${kurz(a.datum)}`, kurz: `Amtsblatt ${a.nummer}`, titel: a.thema || 'Amtliche Bekanntmachungen', sub: 'PDF auf soltau.de', url: a.url });
  const r = d.rathaus.find(x => x.relevant) || d.rathaus[0];
  if (r) k.push({ art: 'rathaus', kicker: `Rathaus · ${kurz(r.datum)}`, kurz: `Rathaus · ${kurz(r.datum)}`, titel: r.titel, sub: r.teaser || 'Meldung der Stadt Soltau', url: r.url });
  const s2 = d.sitzungen[1];
  if (s2) k.push({ art: 'sitzung', kicker: `Sitzung · ${fmtTag(s2.datum)}, ${s2.zeit}`, kurz: `${fmtTag(s2.datum)}, ${s2.zeit} Uhr`, titel: s2.gremiumLang, sub: `${s2.ort}${s2.tagesordnung ? ' · Tagesordnung' : ''}`, url: s2.url });
  const b = d.baustellen[0];
  if (b) k.push({ art: 'baustelle', kicker: `Baustelle · ${kurz(b.datum)}`, kurz: `Baustelle · ${kurz(b.datum)}`, titel: b.titel, sub: b.teaser || 'Meldung der Stadt Soltau', url: b.url });
  if (!mit && k.length) k[0].dunkel = true;
  return k.slice(0, max);
}
