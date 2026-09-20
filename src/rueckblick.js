// Sitzungsrückblick – nur für Brian (Öffentlichkeitsarbeit): alle Beschlüsse einer Sitzung mit Ja/Nein/Enthaltung,
// die freigegebenen Notizen aller Teilnehmenden, ein fertiges Instagram-Skript (nur aus öffentlich Sagbarem: Titel,
// Haltung, Argumente, Ergebnis – nie aus „intern besprochen“) und Ergebnis-Kacheln als PNG für Post oder Story.
export function makeRueckblick(ctx) {
  const { db, esc, $, $$, msg, busy, errText, shareText, nl2br, sectionHead, fmtDate, BESCHLUSS, beschlussLabel, hatErgebnis, posBadge, beschlussBadge, strokesToPng, me } = ctx;
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
    const L = [];
    L.push(`🎬 ${r.gremium || 'Sitzung'} vom ${datum} – ${variante === 'kurz' ? 'Reel, ca. 45 Sekunden' : 'ausführlich, ca. 90 Sekunden'}`);
    L.push('');
    L.push(`[INTRO – du in die Kamera · Overlay: „${istRat ? 'Ratssitzung' : r.gremium} ${String(r.sitzung || '').slice(8, 10)}.${String(r.sitzung || '').slice(5, 7)}.“]`);
    L.push(`Moin Soltau! ${istRat ? 'Ratssitzung' : r.gremium} – ${tops.length} Punkte, ${ent.length} ${ent.length === 1 ? 'Entscheidung' : 'Entscheidungen'}. Das Wichtigste in ${variante === 'kurz' ? '45 Sekunden' : 'anderthalb Minuten'}.`);
    L.push('');
    for (const t of wahl) {
      const z = zahlen(t);
      const stand = z.da ? `${z.ja}:${z.nein}${z.enth ? ':' + z.enth : ''}` : '';
      L.push(`[TOP ${t.nr || ''} – ${t.titel} · Overlay: „${kurzTitel(t.titel)}: ${beschlussLabel(t.beschluss) || 'Ergebnis'}${stand ? ' ' + stand : ''}“]`);
      const haltung = { 'dafür': 'Wir haben dafür gestimmt.', dagegen: 'Wir haben dagegen gestimmt.', Enthaltung: 'Wir haben uns enthalten.', 'Änderungsantrag': 'Wir hatten einen Änderungsantrag gestellt.' }[t.position] || '';
      const zahlSatz = z.da ? ` mit ${z.ja} zu ${z.nein}${z.enth ? ` bei ${z.enth} ${z.enth === 1 ? 'Enthaltung' : 'Enthaltungen'}` : ''}` : '';
      const erg = { angenommen: `Ergebnis: angenommen${zahlSatz}.`, abgelehnt: `Ergebnis: abgelehnt${zahlSatz}.`, geaendert: `Ergebnis: in geänderter Fassung angenommen${zahlSatz}.`, vertagt: 'Ergebnis: vertagt – das kommt noch mal auf den Tisch.', zurueckgezogen: 'Ergebnis: zurückgezogen.', kenntnis: 'Der Rat hat das zur Kenntnis genommen.' }[t.beschluss] || (t.ergebnis ? `Ergebnis: ${t.ergebnis}` : '');
      L.push([`${t.titel}.`, satz1(t.einordnung), haltung, erg, t.ergebnis && t.beschluss ? `(${t.ergebnis})` : ''].filter(Boolean).join(' '));
      L.push('');
    }
    if (ent.length > wahl.length) { L.push(`[Schnell hintereinander, nur Overlay – ${ent.length - wahl.length} weitere Punkte]`); for (const t of ent.slice(wahl.length)) L.push(`• ${kurzTitel(t.titel)}: ${beschlussLabel(t.beschluss) || t.ergebnis || ''}`); L.push(''); }
    L.push('[OUTRO – Overlay: „spd-soltau.de“]');
    L.push('Alle Vorlagen und Ergebnisse findet ihr auf spd-soltau.de. Fragen dazu? Schreibt uns – wir antworten. Bis zur nächsten Sitzung!');
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
    const ent = () => tops.filter(hatErgebnis);
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
        <div class="mb-actions"><button type="button" class="btn btn-rot btn-sm" id="rb-kachel">Übersichtskachel (4:5) erzeugen</button><span class="small muted">Alle Entscheidungen auf einem Bild – als Post oder als Abschluss im Reel. Kachel je Punkt: oben beim Punkt.</span></div>
        <div id="rb-bilder" class="rb-bilder"></div>
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
