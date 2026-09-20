// Sitzungsrückblick – nur für Brian (Öffentlichkeitsarbeit): alle Beschlüsse einer Sitzung mit Ja/Nein/Enthaltung,
// die freigegebenen Notizen aller Teilnehmenden, ein fertiges Instagram-Skript (nur aus öffentlich Sagbarem: Titel,
// Haltung, Argumente, Ergebnis – nie aus „intern besprochen“) und Ergebnis-Kacheln als PNG für Post oder Story.
export function makeRueckblick(ctx) {
  const { db, esc, $, $$, msg, busy, errText, shareText, nl2br, sectionHead, fmtDate, BESCHLUSS, beschlussLabel, hatErgebnis, posBadge, beschlussBadge, strokesToPng, me, echtesKonto, DEMO } = ctx;
  const zahlen = t => {
    if (Number.isFinite(+t.ja) && t.ja !== '' && t.ja !== null && t.ja !== undefined) return { ja: +t.ja || 0, nein: +t.nein || 0, enth: +t.enth || 0, da: true };
    const m = String(t.abstimmung || '').match(/(\d+)\s*[:\/]\s*(\d+)(?:\s*[:\/]\s*(\d+))?/);
    return m ? { ja: +m[1], nein: +m[2], enth: +(m[3] || 0), da: true } : { ja: '', nein: '', enth: '', da: false };
  };
  const imSinne = t => (t.position === 'dafür' && ['angenommen', 'geaendert'].includes(t.beschluss)) || (t.position === 'dagegen' && t.beschluss === 'abgelehnt') || (t.position === 'Änderungsantrag' && t.beschluss === 'geaendert');
  const vorname = n => String(n || '').split(' ')[0];
  const satz1 = s => { const t = String(s || '').replace(/\s+/g, ' ').trim(); const m = t.match(/^.{20,180}?[.!?](\s|$)/); return (m ? m[0] : t.slice(0, 180)).trim(); };
  const kurzTitel = s => String(s || '').replace(/\s*[–-]\s*(Bauabschnitt|Aufstellungsbeschluss|Änderung|Einbringung).*$/i, '').slice(0, 42);

  // ---- Skript ----
  function skript(r, tops, frei, variante) {
    const ent = tops.filter(hatErgebnis);
    const wahl = variante === 'kurz' ? ent.slice(0, 3) : ent;
    const datum = fmtDate(r.sitzung);
    const istRat = /^Rat\b/.test(r.gremium || '');
    const L = []; let nr = 0;
    const take = (bild, text, overlay) => { nr++; L.push(`TAKE ${nr} · ${bild}`); L.push(`Du sagst: „${text}“`); L.push(`Overlay: ${overlay || 'keins'}`); L.push(''); };
    L.push(`🎬 ${r.gremium || 'Sitzung'} vom ${datum} – ${variante === 'kurz' ? 'Reel, ca. 45 Sekunden' : 'ausführlich, ca. 90 Sekunden'} – Take für Take`);
    L.push('');
    const dat = `${String(r.sitzung || '').slice(8, 10)}.${String(r.sitzung || '').slice(5, 7)}.`;
    take('du in die Kamera, Blick direkt rein', `Moin Soltau! ${istRat ? 'Ratssitzung' : r.gremium} – ${tops.length} Punkte, ${ent.length} ${ent.length === 1 ? 'Entscheidung' : 'Entscheidungen'}. Das Wichtigste in ${variante === 'kurz' ? '45 Sekunden' : 'anderthalb Minuten'}.`, `Großer Text „${istRat ? 'Ratssitzung' : r.gremium} ${dat}“ / „So hat der Rat|*entschieden*“ (4 s)`);
    wahl.forEach((t, i) => {
      const z = zahlen(t);
      const stand = z.da ? `${z.ja} : ${z.nein}${z.enth ? ' : ' + z.enth : ''}` : '';
      const lab = beschlussLabel(t.beschluss) || 'Ergebnis';
      const ordnung = ['Erstens', 'Zweitens', 'Drittens', 'Viertens', 'Fünftens', 'Sechstens', 'Siebtens', 'Achtens'][i] || 'Dann';
      take('du in die Kamera', `${ordnung}: ${kurzTitel(t.titel)}.`, `Großer Text „TOP ${t.nr || ''} · ${kurzTitel(t.titel)}“ / „*${lab}*${stand ? '|' + stand : ''}“ (4 s)`);
      const haltung = { 'dafür': 'Wir haben dafür gestimmt.', dagegen: 'Wir haben dagegen gestimmt.', Enthaltung: 'Wir haben uns enthalten.', 'Änderungsantrag': 'Wir hatten einen Änderungsantrag gestellt.' }[t.position] || '';
      const arg = satz1(t.einordnung);
      if (arg || haltung) take('du, etwas näher (oder Vorlage/Foto im Bild)', [arg, haltung].filter(Boolean).join(' '), 'keins – der Satz trägt allein');
      const zahlSatz = z.da ? ` mit ${z.ja} zu ${z.nein}${z.enth ? ` bei ${z.enth} ${z.enth === 1 ? 'Enthaltung' : 'Enthaltungen'}` : ''}` : '';
      const erg = { angenommen: `Ergebnis: angenommen${zahlSatz}.`, abgelehnt: `Ergebnis: abgelehnt${zahlSatz}.`, geaendert: `Ergebnis: in geänderter Fassung angenommen${zahlSatz}.`, vertagt: 'Ergebnis: vertagt – das kommt noch mal auf den Tisch.', zurueckgezogen: 'Ergebnis: zurückgezogen.', kenntnis: 'Der Rat hat das zur Kenntnis genommen.' }[t.beschluss] || (t.ergebnis ? `Ergebnis: ${t.ergebnis}` : '');
      const stempel = { angenommen: 'Stempel „Angenommen“ (3 s)', geaendert: 'Stempel „Angenommen“ (3 s)', abgelehnt: 'Stempel „Abgelehnt“, schwarz (3 s)', vertagt: 'Stempel „Vertagt“ (3 s)', zurueckgezogen: 'Stempel „Zurückgezogen“ (3 s)', kenntnis: 'Stempel „Kenntnis“ (3 s)' }[t.beschluss] || 'keins';
      if (erg) take('du in die Kamera, kurze Pause vor dem Ergebnis', `${erg}${t.ergebnis && t.beschluss ? ' ' + t.ergebnis + '.' : ''}`, stempel);
    });
    if (ent.length > wahl.length) take('du, schneller Schnitt', `Außerdem entschieden: ${ent.slice(wahl.length).map(t => `${kurzTitel(t.titel)} – ${(beschlussLabel(t.beschluss) || t.ergebnis || '').toLowerCase()}`).join(', ')}.`, `Liste „Außerdem entschieden“ / ${ent.slice(wahl.length, wahl.length + 5).map(t => kurzTitel(t.titel)).join(' | ')} (5 s)`);
    take('du in die Kamera, Lächeln', 'Alle Vorlagen und Ergebnisse findet ihr auf spd-soltau.de. Fragen dazu? Schreibt uns – wir antworten. Bis zur nächsten Sitzung!', 'Großer Text „Alle Vorlagen und Ergebnisse“ / „*spd-soltau.de*|/ratsbericht“ (4 s), danach Schlusskarte aus dem Grundkit');
    if (frei.length) {
      L.push(''); L.push('— Stichworte aus den Notizen der Fraktion (zur Inspiration, NICHT veröffentlichen):');
      for (const n of frei) { const z = String(n.text || '').split('\n').map(x => x.trim()).filter(Boolean).slice(0, 3).join(' / '); if (z) L.push(`• ${vorname(n.name)}: ${z.slice(0, 200)}`); else if (n.skizze) L.push(`• ${vorname(n.name)}: Skizze (siehe unten)`); }
    }
    return L.join('\n');
  }

  // ---- Kacheln (Canvas) ----
  async function schriften() { try { await Promise.all(["800 60px 'TheSans SPD Versal'", "800 40px 'TheSans SPD'", "700 40px 'TheSans SPD'", "400 36px 'TheSans SPD'"].map(f => document.fonts.load(f))); } catch (e) { /* Systemschrift */ } }
  const F = { versal: "'TheSans SPD Versal','Barlow Condensed','Arial Narrow',Arial,sans-serif", sans: "'TheSans SPD','Segoe UI',Arial,sans-serif" };
  const ROT = '#E3000F', SCHWARZ = '#0F0F0F', GRAU = '#6B6B6B', GRUEN = '#177A38';
  function zeilen(c, text, max) {
    const out = []; let z = '';
    for (const w of String(text || '').split(/\s+/)) { const t = z ? z + ' ' + w : w; if (c.measureText(t).width > max && z) { out.push(z); z = w; } else z = t; }
    if (z) out.push(z); return out;
  }
  const badgeBreite = (c, text) => { c.font = `800 30px ${F.sans}`; return c.measureText(String(text).toUpperCase()).width + 44; };
  function badge(c, x, y, text, farbe, h = 56) {
    c.font = `800 30px ${F.sans}`; const w = c.measureText(text.toUpperCase()).width + 44;
    c.fillStyle = farbe; c.fillRect(x, y, w, h); c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(text.toUpperCase(), x + 22, y + h / 2 + 2); c.textBaseline = 'alphabetic';
    return w;
  }
  const farbeVon = b => ['angenommen', 'geaendert'].includes(b) ? GRUEN : b === 'abgelehnt' ? ROT : GRAU;
  function kopf(c, W, r, titel) {
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, 2000);
    c.fillStyle = ROT; c.fillRect(0, 0, W, 22);
    c.fillStyle = SCHWARZ; c.font = `800 34px ${F.sans}`; c.fillText('SPD SOLTAU', 60, 92);
    let gr = 82; c.font = `800 ${gr}px ${F.versal}`; while (c.measureText(titel.toUpperCase()).width > W - 120 && gr > 40) { gr -= 4; c.font = `800 ${gr}px ${F.versal}`; }
    c.fillStyle = ROT; c.fillText(titel.toUpperCase(), 60, 190);
    c.fillStyle = GRAU; c.font = `400 36px ${F.sans}`; c.fillText(`${r.gremium || 'Sitzung'} · ${fmtDate(r.sitzung)}`, 60, 246);
  }
  function fuss(c, W, H) { c.fillStyle = SCHWARZ; c.fillRect(0, H - 110, W, 110); c.fillStyle = '#fff'; c.font = `800 34px ${F.sans}`; c.fillText('spd-soltau.de', 60, H - 44); c.fillStyle = ROT; c.font = `800 30px ${F.sans}`; c.textAlign = 'right'; c.fillText('AUS LIEBE ZU SOLTAU', W - 60, H - 44); c.textAlign = 'left'; }
  async function kachelUebersicht(r, tops) {
    await schriften();
    const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    kopf(c, W, r, 'So hat der Rat entschieden');
    const ent = tops.filter(hatErgebnis).slice(0, 6); let y = 320;
    if (!ent.length) { c.fillStyle = GRAU; c.font = `400 40px ${F.sans}`; c.fillText('Noch keine Ergebnisse eingetragen.', 60, y); }
    for (const t of ent) {
      c.fillStyle = '#F2F2F2'; c.fillRect(60, y, W - 120, 148);
      c.fillStyle = farbeVon(t.beschluss); c.fillRect(60, y, 14, 148);
      c.fillStyle = SCHWARZ; c.font = `800 40px ${F.sans}`;
      const zl = zeilen(c, t.titel, W - 120 - 60 - 300).slice(0, 2); zl.forEach((z, i) => c.fillText(z, 100, y + 62 + i * 48));
      const zz = zahlen(t); const lab = beschlussLabel(t.beschluss) || (t.ergebnis || 'Ergebnis').slice(0, 18);
      const bw = badgeBreite(c, lab);
      badge(c, W - 60 - bw, y + 22, lab, farbeVon(t.beschluss));
      if (zz.da) { c.fillStyle = GRAU; c.font = `700 34px ${F.sans}`; c.textAlign = 'right'; c.fillText(`${zz.ja} : ${zz.nein}${zz.enth ? ' : ' + zz.enth : ''}`, W - 60, y + 124); c.textAlign = 'left'; }
      y += 168;
    }
    fuss(c, W, H); return cv.toDataURL('image/png');
  }
  async function kachelTop(r, t) {
    await schriften();
    const W = 1080, H = 1080, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    kopf(c, W, r, 'Ratsentscheidung');
    c.fillStyle = SCHWARZ; c.font = `800 72px ${F.versal}`;
    const zl = zeilen(c, t.titel.toUpperCase(), W - 120).slice(0, 3); zl.forEach((z, i) => c.fillText(z, 60, 360 + i * 80));
    let y = 360 + zl.length * 80 + 20;
    badge(c, 60, y, beschlussLabel(t.beschluss) || 'Ergebnis', farbeVon(t.beschluss), 72); y += 120;
    const z = zahlen(t);
    if (z.da) {
      const spalten = [[z.ja, 'JA', GRUEN], [z.nein, 'NEIN', ROT], [z.enth, 'ENTHALTUNG', GRAU]];
      spalten.forEach(([n, l, f], i) => { const x = 60 + i * 320; c.fillStyle = f; c.font = `800 120px ${F.versal}`; c.fillText(String(n), x, y + 110); c.fillStyle = GRAU; c.font = `700 30px ${F.sans}`; c.fillText(l, x + 4, y + 156); });
      y += 200;
    }
    const haltung = { 'dafür': 'Die SPD hat dafür gestimmt.', dagegen: 'Die SPD hat dagegen gestimmt.', Enthaltung: 'Die SPD hat sich enthalten.', 'Änderungsantrag': 'Mit Änderungsantrag der SPD.' }[t.position] || '';
    c.fillStyle = SCHWARZ; c.font = `700 38px ${F.sans}`; if (haltung) c.fillText(haltung, 60, y + 20);
    if (t.einordnung) { c.fillStyle = GRAU; c.font = `400 34px ${F.sans}`; const frei = Math.floor((H - 140 - (y + 60)) / 44); zeilen(c, satz1(t.einordnung), W - 120).slice(0, Math.max(0, Math.min(3, frei))).forEach((zz, i) => c.fillText(zz, 60, y + 80 + i * 44)); }
    fuss(c, W, H); return cv.toDataURL('image/png');
  }
  // Story-Kachel (9:16), nummeriert – eine je Entscheidung
  async function kachelStory(r, t, i, n) {
    await schriften();
    const W = 1080, H = 1920, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.fillStyle = ROT; c.fillRect(0, 0, W, 26);
    c.fillStyle = SCHWARZ; c.font = `800 38px ${F.sans}`; c.fillText('SPD SOLTAU', 70, 150);
    c.fillStyle = GRAU; c.font = `400 38px ${F.sans}`; c.fillText(`${r.gremium || 'Sitzung'} · ${fmtDate(r.sitzung)}`, 70, 210);
    c.fillStyle = ROT; c.font = `800 60px ${F.versal}`; c.fillText(`ENTSCHEIDUNG ${i}/${n}`, 70, 330);
    c.fillStyle = SCHWARZ; c.font = `800 92px ${F.versal}`;
    const zl = zeilen(c, String(t.titel || '').toUpperCase(), W - 140).slice(0, 4); zl.forEach((z, k) => c.fillText(z, 70, 470 + k * 100));
    let y = 470 + zl.length * 100 + 30;
    badge(c, 70, y, beschlussLabel(t.beschluss) || 'Ergebnis', farbeVon(t.beschluss), 90); y += 150;
    const z = zahlen(t);
    if (z.da) { [[z.ja, 'JA', GRUEN], [z.nein, 'NEIN', ROT], [z.enth, 'ENTHALTUNG', GRAU]].forEach(([nr, l, f], k) => { const x = 70 + k * 320; c.fillStyle = f; c.font = `800 150px ${F.versal}`; c.fillText(String(nr), x, y + 140); c.fillStyle = GRAU; c.font = `700 32px ${F.sans}`; c.fillText(l, x + 6, y + 195); }); y += 260; }
    const haltung = { 'dafür': 'Die SPD hat dafür gestimmt.', dagegen: 'Die SPD hat dagegen gestimmt.', Enthaltung: 'Die SPD hat sich enthalten.', 'Änderungsantrag': 'Mit Änderungsantrag der SPD.' }[t.position] || '';
    if (haltung) { c.fillStyle = SCHWARZ; c.font = `700 44px ${F.sans}`; c.fillText(haltung, 70, y + 30); y += 70; }
    if (t.einordnung) { c.fillStyle = GRAU; c.font = `400 40px ${F.sans}`; const frei = Math.floor((H - 260 - (y + 40)) / 54); zeilen(c, satz1(t.einordnung), W - 140).slice(0, Math.max(0, Math.min(5, frei))).forEach((zz, k) => c.fillText(zz, 70, y + 90 + k * 54)); }
    // Fuß mit Luft für die Instagram-Bedienelemente
    c.fillStyle = SCHWARZ; c.fillRect(0, H - 230, W, 230); c.fillStyle = '#fff'; c.font = `800 40px ${F.sans}`; c.fillText('spd-soltau.de/ratsbericht', 70, H - 130); c.fillStyle = ROT; c.font = `800 34px ${F.sans}`; c.fillText('AUS LIEBE ZU SOLTAU', 70, H - 70);
    return cv.toDataURL('image/png');
  }
  // ZIP ohne Kompression (PNG ist schon komprimiert) – direkt im Browser
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zipStore(files) {
    const enc = new TextEncoder(); const teile = [], zentral = []; let offset = 0;
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data);
      const lok = new Uint8Array(30 + name.length), lv = new DataView(lok.buffer);
      lv.setUint32(0, 0x04034b50, true); lv.setUint16(4, 20, true); lv.setUint16(6, 0x0800, true); lv.setUint32(14, crc, true); lv.setUint32(18, f.data.length, true); lv.setUint32(22, f.data.length, true); lv.setUint16(26, name.length, true); lok.set(name, 30);
      const cd = new Uint8Array(46 + name.length), cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true); cv.setUint16(4, 20, true); cv.setUint16(6, 20, true); cv.setUint16(8, 0x0800, true); cv.setUint32(16, crc, true); cv.setUint32(20, f.data.length, true); cv.setUint32(24, f.data.length, true); cv.setUint16(28, name.length, true); cv.setUint32(42, offset, true); cd.set(name, 46);
      teile.push(lok, f.data); zentral.push(cd); offset += lok.length + f.data.length;
    }
    const cdSize = zentral.reduce((s, c) => s + c.length, 0); const ende = new Uint8Array(22), ev = new DataView(ende.buffer);
    ev.setUint32(0, 0x06054b50, true); ev.setUint16(8, files.length, true); ev.setUint16(10, files.length, true); ev.setUint32(12, cdSize, true); ev.setUint32(16, offset, true);
    return new Blob([...teile, ...zentral, ende], { type: 'application/zip' });
  }
  const dataUrlBytes = u => Uint8Array.from(atob(u.split(',')[1]), ch => ch.charCodeAt(0));
  // Overlay-Manifest für den Agenten (video/insta/render.mjs): Intro, je Entscheidung Text + Stempel, Rest als Liste, Abspann
  const slugify = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'x';
  function overlayManifest(r, tops, alpha, drehplan) {
    const ent = tops.filter(hatErgebnis); const istRat = /^Rat\b/.test(r.gremium || '');
    const dat = `${String(r.sitzung || '').slice(8, 10)}.${String(r.sitzung || '').slice(5, 7)}.`;
    const stempelText = { angenommen: 'Angenommen', geaendert: 'Angenommen', abgelehnt: 'Abgelehnt', vertagt: 'Vertagt', zurueckgezogen: 'Zurückgezogen', kenntnis: 'Kenntnis' };
    const clips = [{ id: 'intro', dauer: 4, q: { clip: 'gross', pos: 'oben', gr: 'm', label: `${istRat ? 'Ratssitzung' : r.gremium || 'Sitzung'} ${dat}`, text: 'So hat der Rat|*entschieden*' } }];
    ent.slice(0, 8).forEach((t, i) => {
      const z = zahlen(t); const lab = beschlussLabel(t.beschluss) || 'Ergebnis'; const nr = t.nr || String(i + 1);
      clips.push({ id: `top${slugify(nr)}-${slugify(kurzTitel(t.titel)).slice(0, 24)}`, dauer: 4, q: { clip: 'gross', pos: 'oben', gr: 'm', label: `TOP ${nr} · ${kurzTitel(t.titel)}`, text: `*${lab}*${z.da ? `|${z.ja} : ${z.nein}${z.enth ? ' : ' + z.enth : ''}` : ''}` } });
      if (stempelText[t.beschluss]) clips.push({ id: `top${slugify(nr)}-stempel`, dauer: 3, q: { clip: 'stempel', text: stempelText[t.beschluss], ...(t.beschluss === 'abgelehnt' ? { art: 'schwarz' } : {}) } });
    });
    if (ent.length > 8) clips.push({ id: 'weitere', dauer: 5, q: { clip: 'liste', titel: 'Außerdem entschieden', text: ent.slice(8, 13).map(t => kurzTitel(t.titel)).join('|') } });
    clips.push({ id: 'abspann', dauer: 4, q: { clip: 'gross', pos: 'oben', gr: 'm', label: 'Alle Vorlagen und Ergebnisse', text: '*spd-soltau.de*|/ratsbericht' } });
    return { titel: `Overlays ${r.gremium || 'Sitzung'} ${r.sitzung || ''}`, hinweis: 'Text-Overlays auf Grün (CapCut: Chroma-Key) – Reihenfolge wie im Drehplan.', nurGruen: !alpha, drehplan, clips };
  }
  const AUFTRAG_TEXT = { wartet: 'Wartet auf den Agenten – er startet innerhalb von 5 Minuten.', gestartet: 'Der Agent rendert – meist 5 bis 10 Minuten. Du bekommst eine Push-Nachricht, sobald die ZIP fertig ist.', laeuft: 'Der Agent rendert – meist 5 bis 10 Minuten. Du bekommst eine Push-Nachricht, sobald die ZIP fertig ist.', fertig: 'Fertig – zum Download bereit.', fehler: 'Das hat nicht geklappt.' };
  const mb = n => n ? `${Math.round(n / 1048576 * 10) / 10} MB` : '';
  async function bildTeilen(dataUrl, name, text) {
    try {
      const blob = await (await fetch(dataUrl)).blob(); const file = new File([blob], name, { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'SPD Soltau', text }); return true; }
    } catch (e) { /* abgebrochen */ }
    return false;
  }

  // ---- Seite ----
  async function sec(v, r) {
    let tops = r.tops || [];
    const notizen = await db.list('SitzungNotizen', { eq: { sitzungId: r._id }, limit: 200 }).catch(() => []);
    const frei = notizen.filter(n => n.freigabe !== false && ((n.text || '').trim() || (n.skizze && n.skizze !== '[]')));
    const privat = notizen.length - frei.length;
    let variante = 'kurz';
    // Bestellungen an den Overlay-Agenten laufen immer echt – auch im Demo (dann über Brians echte Anmeldung im Hintergrund)
    const konto = await (echtesKonto ? echtesKonto() : Promise.resolve({ db, me: me() })).catch(() => null);
    const jobDb = konto?.db || db, jobMe = konto?.me || me();
    const jobsLaden = () => jobDb.list('Auftraege', { eq: { sitzungId: r._id }, desc: '_createdDate', limit: 20 }).catch(() => []);
    let auftraege = konto ? await jobsLaden() : [];
    let pollTimer = null;
    const laeuft = a => ['wartet', 'gestartet', 'laeuft'].includes(a.status);
    const seit = a => { const m = Math.round((Date.now() - new Date(a._createdDate || 0).getTime()) / 60000); return m < 1 ? 'gerade eben' : `seit ${m} Min.`; };
    const prozent = a => a.status === 'fertig' ? 100 : a.status === 'wartet' ? 3 : Math.max(8, Math.min(99, +a.fortschritt || 8));
    const schritt = a => a.status === 'wartet' ? 'Wartet auf den Agenten – der Push-Dienst holt die Bestellung innerhalb von 5 Minuten ab.' : a.status === 'gestartet' ? (a.schritt || 'Agent startet – Rechner wird vorbereitet (etwa 1 Minute).') : a.status === 'laeuft' ? (a.schritt || 'Der Agent rendert …') : '';
    const ent = () => tops.filter(hatErgebnis);
    const berichtVorschlag = () => { const e = ent(); const themen = e.slice(0, 3).map(t => kurzTitel(t.titel)); return `In der Sitzung am ${fmtDate(r.sitzung)} ging es um ${themen.length ? themen.join(', ').replace(/, ([^,]*)$/, ' und $1') : 'mehrere Punkte'}. ${e.length} ${e.length === 1 ? 'Entscheidung' : 'Entscheidungen'} – hier die Ergebnisse und wie wir abgestimmt haben.`; };
    const render = () => {
      const erfolge = tops.filter(imSinne).length;
      v.innerHTML = `<div class="rb">
      <p class="small rz-zurueck"><a href="#rat">← Sitzungen</a> · <a href="#rat/fokus-${esc(r._id)}">Sitzungsmodus</a></p>
      ${sectionHead('Rückblick &amp; Video', `${esc(r.gremium || 'Sitzung')} · ${esc(fmtDate(r.sitzung))} · nur für dich sichtbar`)}
      <div class="rb-stats"><span><b>${tops.length}</b> Punkte</span><span><b>${ent().length}</b> entschieden</span><span><b>${erfolge}</b> in unserem Sinne</span><span><b>${frei.length}</b> Notizen freigegeben${privat ? ` <small class="muted">(${privat} privat)</small>` : ''}</span></div>

      <section class="mb-sub"><h4 class="doc-cat">Abstimmungen <span class="small muted">Ja · Nein · Enthaltung – wird sofort gespeichert</span></h4>
        <div class="rb-liste">${tops.map((t, i) => { const z = zahlen(t); return `<article class="rb-top ${imSinne(t) ? 'ok' : ''}" data-i="${i}">
          <div class="rb-top-kopf"><span class="top-nr">TOP ${esc(t.nr || i + 1)}</span><b>${esc(t.titel)}</b><span class="rb-badges">${posBadge(t.position)} ${beschlussBadge(t)}${imSinne(t) ? '<span class="pos besch-ok">✓ in unserem Sinne</span>' : ''}</span></div>
          <div class="rb-beschluss">${BESCHLUSS.map(([k, l]) => `<button type="button" class="chip" data-beschluss="${k}" aria-pressed="${t.beschluss === k}">${l}</button>`).join('')}</div>
          <div class="rb-zahlen"><label>Ja <input type="number" min="0" max="99" inputmode="numeric" data-z="ja" value="${esc(z.ja)}"></label><label>Nein <input type="number" min="0" max="99" inputmode="numeric" data-z="nein" value="${esc(z.nein)}"></label><label>Enthaltung <input type="number" min="0" max="99" inputmode="numeric" data-z="enth" value="${esc(z.enth)}"></label><input type="text" class="rb-anm" data-z="ergebnis" maxlength="200" placeholder="Anmerkung (öffentlich sagbar)" value="${esc(t.ergebnis || '')}"><span class="small muted rb-msg"></span></div>
          ${t.einordnung ? `<p class="small"><b>Haltung &amp; Argumente (öffentlich):</b> ${esc(t.einordnung)}</p>` : ''}
          ${hatErgebnis(t) ? `<div class="mb-actions"><button type="button" class="linkbtn" data-kachel="${i}">Kachel für diesen Punkt (1080×1080)</button></div>` : ''}
        </article>`; }).join('') || '<p class="muted">Diese Sitzung hat keine Tagesordnungspunkte.</p>'}</div>
      </section>

      <section class="mb-sub"><h4 class="doc-cat">Notizen der Fraktion <span class="small muted">was die Teilnehmenden freigegeben haben</span></h4>
        <div class="rb-notizen">${frei.map(n => `<article class="rb-notiz"><div class="small muted"><b>${esc(n.name || '?')}</b> · ${esc(new Date(n._updatedDate || n._createdDate || 0).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))} Uhr</div>${n.text ? `<p>${nl2br(n.text)}</p>` : ''}${n.skizze && n.skizze !== '[]' ? `<a href="${strokesToPng(n.skizze)}" target="_blank" rel="noopener"><img class="rb-skizze" src="${strokesToPng(n.skizze)}" alt="Skizze von ${esc(n.name || '')}"></a>` : ''}</article>`).join('') || '<p class="small muted">Noch keine freigegebenen Notizen. Jede*r kann die eigene Notiz im Sitzungsmodus mit dem Häkchen „Für den Sitzungsrückblick freigeben“ sichtbar machen.</p>'}</div>
      </section>

      <section class="mb-sub"><h4 class="doc-cat">Instagram-Skript <span class="small muted">nur aus Titel, Haltung &amp; Argumenten, Ergebnis – nichts Internes</span></h4>
        <div class="mb-tabs"><button type="button" class="chip" data-var="kurz" aria-pressed="${variante === 'kurz'}">Reel, ca. 45 s</button><button type="button" class="chip" data-var="lang" aria-pressed="${variante === 'lang'}">Ausführlich, ca. 90 s</button><button type="button" class="chip" id="rb-neu" title="Aus den aktuellen Ergebnissen neu erzeugen">↻ Neu erzeugen</button></div>
        <textarea id="rb-skript" rows="18">${esc(r.skript || skript(r, tops, frei, variante))}</textarea>
        <div class="mb-actions"><button type="button" class="btn btn-rot btn-sm" id="rb-kopieren">Kopieren</button><button type="button" class="btn btn-line btn-sm" id="rb-teilen">Teilen …</button><button type="button" class="btn btn-schwarz btn-sm" id="rb-speichern">Skript speichern</button><span class="small muted" id="rb-skript-msg"></span></div>
        <p class="small muted">Klammern = Regieanweisung und Text-Overlay, der Rest ist dein gesprochener Text. Einfach im Kasten umschreiben, dann speichern.</p>
      </section>

      <section class="mb-sub"><h4 class="doc-cat">Kacheln für Post &amp; Story</h4>
        <div class="mb-actions"><button type="button" class="btn btn-rot btn-sm" id="rb-kachel">Übersichtskachel (4:5)</button><button type="button" class="btn btn-schwarz btn-sm" id="rb-story" ${ent().length ? '' : 'disabled'}>Story-Serie (9:16, ${ent().length} Bilder)</button><span class="small muted">Übersicht als Post oder Abschluss im Reel; die Story-Serie ist nummeriert – ein Bild je Entscheidung. Kachel je Punkt: oben beim Punkt.</span></div>
        <div id="rb-bilder" class="rb-bilder"></div>
      </section>

      <section class="mb-sub"><h4 class="doc-cat">Overlay-Clips für CapCut <span class="small muted">der Overlay-Agent rendert sie für dich</span></h4>
        <p class="small muted">Bestellt die Text-Overlays zu diesem Rückblick (Intro, je Entscheidung Text + Stempel, Abspann) auf Greenscreen-Grün. Ein Helfer in der Cloud rendert sie, packt sie als ZIP und legt sie bei Wix ab – du bekommst eine Push-Nachricht und den Download hier. Der Drehplan (dein Skript) liegt als Textdatei mit dabei.</p>
        <label class="check"><input type="checkbox" id="rb-alpha"><span>Zusätzlich mit echter Transparenz (ProRes .mov, für Resolve/Premiere – macht die ZIP deutlich größer)</span></label>
        <div class="mb-actions"><button type="button" class="btn btn-rot btn-sm" id="rb-overlays" ${ent().length ? '' : 'disabled'}>Overlays erzeugen lassen</button><span class="small muted" id="rb-overlays-msg">${ent().length ? `${Math.min(8, ent().length) * 2 + 2} Clips` : 'Erst Ergebnisse eintragen.'}</span></div>
        ${!konto ? '<p class="note note-info">Im Demo läuft der Agent nur, wenn du im Hintergrund echt angemeldet bist – einmal „Demo beenden“, anmelden, dann wieder in den Demo.</p>' : DEMO ? '<p class="small muted">Demo: Die Bestellung läuft trotzdem echt – über dein echtes Konto, der fertige Download landet hier und als Push auf deinem Handy.</p>' : ''}
        <div class="rb-auftraege">${auftraege.map(a => `<article class="rb-auftrag st-${esc(a.status || 'wartet')}"><div class="rb-auftrag-kopf"><div><b>${esc(a.titel || 'Overlays')}</b><span class="small muted"> · bestellt ${esc(new Date(a._createdDate || 0).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }))} Uhr${laeuft(a) ? ' · ' + esc(seit(a)) : ''}</span></div>${a.status === 'fertig' && a.url ? `<a class="btn btn-rot btn-sm" href="${esc(a.url)}" download="${esc(a.dateiName || 'overlays.zip')}">ZIP herunterladen</a>` : laeuft(a) ? '<span class="rb-spinner" aria-hidden="true"></span>' : ''}</div>
          ${laeuft(a) ? `<div class="rb-balken" role="progressbar" aria-valuenow="${prozent(a)}" aria-valuemin="0" aria-valuemax="100"><span style="width:${prozent(a)}%"></span></div><p class="small muted">${esc(schritt(a))}</p>` : `<p class="small ${a.status === 'fehler' ? 'rot' : 'muted'}">${esc(AUFTRAG_TEXT[a.status] || a.status)}${a.status === 'fehler' && a.fehler ? ' ' + esc(a.fehler) : ''}${a.status === 'fertig' ? ` ${esc(a.dateien || '')} Dateien${a.groesse ? ', ' + mb(a.groesse) : ''}${a.fertigAm && a._createdDate ? ' – Dauer ' + Math.max(1, Math.round((new Date(a.fertigAm) - new Date(a._createdDate)) / 60000)) + ' Min.' : ''}.` : ''}</p>`}
        </article>`).join('')}</div>
      </section>

      <section class="mb-sub"><h4 class="doc-cat">Ratsbericht auf der Website <span class="small muted">spd-soltau.de/ratsbericht</span></h4>
        <p class="small muted">Veröffentlicht werden nur: Gremium, Datum, die Titel der Punkte, unsere Haltung, „Haltung &amp; Argumente“, Beschluss, Abstimmung, Anmerkung und die Einleitung unten. Nichts aus „Intern besprochen“, aus Notizen oder dem Chat.</p>
        <label for="rb-bericht" class="small"><b>Einleitung</b> (optional, steht über den Entscheidungen)</label>
        <textarea id="rb-bericht" rows="3">${esc(r.berichtText || berichtVorschlag())}</textarea>
        <div class="mb-actions">${r.veroeffentlicht ? `<span class="badge badge-mit">Online</span><button type="button" class="btn btn-schwarz btn-sm" id="rb-bericht-update">Text aktualisieren</button><button type="button" class="linkbtn" id="rb-bericht-zurueck">Von der Website nehmen</button>` : `<button type="button" class="btn btn-rot btn-sm" id="rb-bericht-los">Auf der Website veröffentlichen</button>`}<span class="small muted" id="rb-bericht-msg"></span></div>
        <p class="small muted">${r.veroeffentlicht ? `Online seit ${esc(new Date(r.veroeffentlichtAm || r._updatedDate || 0).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))} Uhr. Änderungen an Ergebnissen oder Text übernimmt der Website-Dienst innerhalb von 5 Minuten, die Website baut sich danach neu (etwa 10 Minuten).` : 'Nach dem Klick übernimmt der Website-Dienst den Bericht innerhalb von 5 Minuten und baut die Website neu – nach etwa 10 Minuten ist er online. Später eingetragene Ergebnisse folgen automatisch nach.'}</p>
      </section>
      </div>`;
      wire();
    };
    const speichern = async (i, patch, hinweisEl) => {
      try {
        const neu = tops.map((x, k) => k === i ? { ...x, ...patch } : x);
        r = await db.update('Ratsvorbereitung', { ...r, tops: neu }); tops = r.tops || [];
        if (hinweisEl) hinweisEl.textContent = 'gespeichert';
      } catch (err) { if (hinweisEl) hinweisEl.textContent = 'Nicht gespeichert: ' + errText(err); }
    };
    function wire() {
      // Beschluss-Chips und Zahlen je Punkt
      $$('.rb-top', v).forEach(art => {
        const i = +art.dataset.i;
        $$('[data-beschluss]', art).forEach(b => b.addEventListener('click', async () => { const k = b.getAttribute('aria-pressed') === 'true' ? '' : b.dataset.beschluss; await speichern(i, { beschluss: k, ergebnisVon: me().name, ergebnisAm: new Date().toISOString() }, $('.rb-msg', art)); render(); }));
        const lesen = () => { const g = k => $(`[data-z="${k}"]`, art).value.trim(); const ja = g('ja'), nein = g('nein'), enth = g('enth'); const da = ja !== '' || nein !== ''; return { ja: da ? +ja || 0 : '', nein: da ? +nein || 0 : '', enth: da ? +enth || 0 : '', abstimmung: da ? `${+ja || 0}:${+nein || 0}${+enth ? ':' + (+enth) : ''}` : '', ergebnis: g('ergebnis') }; };
        let timer = null;
        $$('[data-z]', art).forEach(inp => inp.addEventListener('input', () => { clearTimeout(timer); $('.rb-msg', art).textContent = 'wird gespeichert …'; timer = setTimeout(() => speichern(i, lesen(), $('.rb-msg', art)), 900); }));
        $('[data-kachel]', art)?.addEventListener('click', async e => { const b = e.currentTarget; busy(b, true); const url = await kachelTop(r, tops[i]); bildZeigen(url, `Ratsentscheidung-TOP${tops[i].nr || i + 1}.png`, `${tops[i].titel}: ${beschlussLabel(tops[i].beschluss)}`); busy(b, false); });
      });
      // Skript
      $$('[data-var]', v).forEach(b => b.addEventListener('click', () => { variante = b.dataset.var; $$('[data-var]', v).forEach(x => x.setAttribute('aria-pressed', String(x === b))); $('#rb-skript', v).value = skript(r, tops, frei, variante); }));
      $('#rb-neu', v).addEventListener('click', () => { $('#rb-skript', v).value = skript(r, tops, frei, variante); $('#rb-skript-msg', v).textContent = 'neu erzeugt (noch nicht gespeichert)'; });
      $('#rb-kopieren', v).addEventListener('click', async () => { const t = $('#rb-skript', v).value; try { await navigator.clipboard.writeText(t); $('#rb-skript-msg', v).textContent = 'kopiert'; } catch (e) { $('#rb-skript', v).select(); document.execCommand('copy'); $('#rb-skript-msg', v).textContent = 'kopiert'; } });
      $('#rb-teilen', v).addEventListener('click', () => shareText($('#rb-skript', v).value));
      $('#rb-speichern', v).addEventListener('click', async e => { const b = e.currentTarget; busy(b, true); try { r = await db.update('Ratsvorbereitung', { ...r, skript: $('#rb-skript', v).value }); $('#rb-skript-msg', v).textContent = 'gespeichert'; } catch (err) { $('#rb-skript-msg', v).textContent = 'Nicht gespeichert: ' + errText(err); } busy(b, false); });
      $('#rb-kachel', v).addEventListener('click', async e => { const b = e.currentTarget; busy(b, true); const url = await kachelUebersicht(r, tops); bildZeigen(url, `Ratssitzung-${r.sitzung || ''}.png`, `So hat der Rat entschieden – ${r.gremium} ${fmtDate(r.sitzung)}`); busy(b, false); });
      // Story-Serie: alle Entscheidungen als 9:16-Bilder, dazu ZIP
      $('#rb-story', v)?.addEventListener('click', async e => {
        const b = e.currentTarget; busy(b, true);
        const e2 = ent(); const bilder = [];
        for (let i = 0; i < e2.length; i++) bilder.push({ name: `Story-${String(i + 1).padStart(2, '0')}-TOP${slugify(e2[i].nr || i + 1)}.png`, url: await kachelStory(r, e2[i], i + 1, e2.length) });
        const zip = zipStore(bilder.map(x => ({ name: x.name, data: dataUrlBytes(x.url) })));
        const zipUrl = URL.createObjectURL(zip);
        const box = $('#rb-bilder', v);
        box.insertAdjacentHTML('afterbegin', `<figure class="rb-bild rb-serie"><div class="rb-serie-bilder">${bilder.map(x => `<a href="${x.url}" download="${esc(x.name)}"><img src="${x.url}" alt=""></a>`).join('')}</div><figcaption class="mb-actions"><a class="btn btn-schwarz btn-sm" href="${zipUrl}" download="Story-Serie-${esc(r.sitzung || '')}.zip">Alle ${bilder.length} als ZIP</a><span class="small muted">Einzelbild antippen = herunterladen. Reihenfolge = Nummer.</span><button type="button" class="linkbtn" data-weg>entfernen</button></figcaption></figure>`);
        const fig = $('.rb-serie', box); $('[data-weg]', fig).addEventListener('click', () => fig.remove()); fig.scrollIntoView({ behavior: 'smooth', block: 'center' });
        busy(b, false);
      });
      // Overlay-Agent
      $('#rb-overlays', v)?.addEventListener('click', async e => {
        const b = e.currentTarget; busy(b, true);
        try {
          const manifest = overlayManifest(r, tops, $('#rb-alpha', v).checked, $('#rb-skript', v).value);
          if (!konto) throw new Error('nicht echt angemeldet');
          await jobDb.insert('Auftraege', { typ: 'overlays', status: 'wartet', title: manifest.titel, titel: manifest.titel, sitzungId: r._id, memberId: jobMe.id, von: jobMe.name, manifest: JSON.stringify(manifest), benachrichtigt: false, fortschritt: 0, schritt: '' });
          auftraege = await jobsLaden();
          render(); $('#rb-overlays-msg', v).textContent = 'Bestellt.'; $('.rb-auftraege', v)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch (err) { $('#rb-overlays-msg', v).textContent = 'Nicht bestellt: ' + errText(err); busy(b, false); }
      });
      // Ratsbericht
      const bericht = async (patch, btnId) => {
        const b = $(btnId, v); if (b) busy(b, true);
        try { r = await db.update('Ratsvorbereitung', { ...r, berichtText: $('#rb-bericht', v).value.trim(), ...patch }); tops = r.tops || []; render(); $('#rb-bericht-msg', v).textContent = patch.veroeffentlicht === false ? 'Wird von der Website genommen.' : 'Gespeichert – geht innerhalb von 5 Minuten an die Website.'; }
        catch (err) { $('#rb-bericht-msg', v).textContent = 'Nicht gespeichert: ' + errText(err); if (b) busy(b, false); }
      };
      $('#rb-bericht-los', v)?.addEventListener('click', () => bericht({ veroeffentlicht: true, veroeffentlichtAm: new Date().toISOString() }, '#rb-bericht-los'));
      $('#rb-bericht-update', v)?.addEventListener('click', () => bericht({}, '#rb-bericht-update'));
      $('#rb-bericht-zurueck', v)?.addEventListener('click', () => { if (confirm('Den Ratsbericht von der Website nehmen?')) bericht({ veroeffentlicht: false }, '#rb-bericht-zurueck'); });
      // Laufende Aufträge alle 20 s nachsehen, solange die Seite offen ist
      clearInterval(pollTimer);
      if (konto && auftraege.some(laeuft)) pollTimer = setInterval(async () => {
        if (!v.isConnected || !location.hash.startsWith('#rat/rueckblick-')) { clearInterval(pollTimer); return; }
        const neu = await jobsLaden(); if (!neu.length) return;
        const stand = l => JSON.stringify(l.map(a => [a._id, a.status, a.fortschritt, a.schritt]));
        if (stand(neu) !== stand(auftraege) || neu.some(laeuft)) { auftraege = neu; render(); }
      }, 10000);
    }
    function bildZeigen(url, name, text) {
      const box = $('#rb-bilder', v); const id = 'rb-b' + Date.now();
      box.insertAdjacentHTML('afterbegin', `<figure class="rb-bild" id="${id}"><img src="${url}" alt=""><figcaption class="mb-actions"><a class="btn btn-schwarz btn-sm" href="${url}" download="${esc(name)}">Herunterladen</a><button type="button" class="btn btn-line btn-sm" data-share-bild>Teilen …</button><button type="button" class="linkbtn" data-weg>entfernen</button></figcaption></figure>`);
      const fig = $('#' + id, v);
      $('[data-share-bild]', fig).addEventListener('click', async () => { if (!(await bildTeilen(url, name, text))) msg(fig.querySelector('figcaption'), 'Teilen von Bildern geht hier nicht – bitte herunterladen.'); });
      $('[data-weg]', fig).addEventListener('click', () => fig.remove());
      fig.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    render();
  }
  return { sec };
}
