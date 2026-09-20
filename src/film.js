// Filmdreh – nur für das Filmteam (src/lib/film.mjs: FILM_TEAM). Ein Projekt = ein Video, in drei Schritten:
//   1 Skript (Take für Take – selbst oder mit Claude), 2 Overlays (Werkstatt → Agent rendert), 3 Drehen (Drehmodus:
//   ein Take groß auf dem Bildschirm, Kamera, Satz, Overlay). Dazu Material (Dateien/Links) und die Vorlagen.
// Claude: über das eigene Claude-Abo – Auftrag kopieren, in Claude einfügen (oder dort sprechen), Antwort zurück einfügen. Kein Server, kein Schlüssel, keine Kosten.
import { FILM_ARTEN, FILM_STATUS, OVERLAY_TYPEN, ANIMATIONEN, FARBEN, TEMPI, overlayTyp, overlayClip, AUFTRAG, antwortLesen } from './lib/film.mjs';
import { TEIL_BYTES, toB64, teileLaden } from './lib/rat.mjs';
import { skizzeLesen, skizzeSvg, skizzeText, overlayKurz } from './lib/storyboard.mjs';

const MAX_UPLOAD = 40 * 1024 * 1024;
// Takes aus dem Skript lesen – Take-Format, sonst Absätze
export function takesAus(skript) {
  let text = String(skript || '').replace(/\r/g, '');
  const dp = text.match(/^\s*(?:\*\*)?DREHPLAN(?:\*\*)?\s*:?\s*$/im); if (dp) text = text.slice(0, dp.index); // Drehplan gehört nicht zu den Takes
  const bloecke = text.split(/\n(?=\s*TAKE\s*\d+)/i).map(b => b.trim()).filter(b => /^TAKE\s*\d+/i.test(b));
  if (bloecke.length) return bloecke.map((b, i) => {
    const zeilen = b.split('\n'); const kopf = zeilen[0];
    const bild = kopf.replace(/^TAKE\s*\d+\s*[·–-]?\s*/i, '').replace(/^\s*Bild:\s*/i, '').trim();
    // „Du sagst:“ darf über mehrere Zeilen gehen – bis zur nächsten Zeile mit „Overlay:“
    let sagt = '', overlay = '', rest = [], modus = '', skizze = '';
    for (const z of zeilen.slice(1)) {
      if (/^\s*(?:Skizze|Storyboard):/i.test(z)) { modus = ''; skizze = z.trim(); continue; }
      if (/^\s*Du sagst:/i.test(z)) { modus = 'sagt'; sagt += z.replace(/^\s*Du sagst:\s*/i, '') + '\n'; continue; }
      if (/^\s*Overlay:/i.test(z)) { modus = 'overlay'; overlay += z.replace(/^\s*Overlay:\s*/i, '') + ' '; continue; }
      if (modus === 'sagt') sagt += z + '\n'; else if (modus === 'overlay') overlay += z + ' '; else rest.push(z);
    }
    sagt = sagt.trim().replace(/^[„"“]/, '').replace(/[“"”]$/, '').trim(); overlay = overlay.trim();
    return { nr: i + 1, bild, text: sagt || rest.join('\n').trim(), overlay, notiz: sagt ? rest.join('\n').trim() : '', skizze: skizzeLesen(skizze, bild, overlay) };
  });
  return text.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).map((t, i) => ({ nr: i + 1, skizze: skizzeLesen('', (t.match(/\[(?:Bild|Kamera)[^\]]*\]/i) || [''])[0], ''), bild: (t.match(/\[(?:Bild|Kamera)[^\]]*\]/i) || [''])[0].replace(/^\[|\]$/g, ''), text: t.replace(/\[[^\]]*\]\s*/g, '').trim(), overlay: (t.match(/\[Overlay:\s*([^\]]+)\]/i) || [])[1] || '', notiz: '' }));
}

export function makeFilm(ctx) {
  const { db, esc, $, $$, msg, busy, errText, shareText, nl2br, sectionHead, fmtWhen, ICON, DEMO, BASE, me, echtesKonto, drehStart } = ctx;
  const st = { projekte: [], material: [], auftraege: [], konto: null, timer: null, tab: 'skript', neuOverlay: null, take: 0, letztes: '', blobs: {} };
  // ---- Bilder in Bausteinen: Wert ist eine Adresse oder „material:<id>“ (frisch hochgeladen, Wix legt es innerhalb von 5 Min. ab); mehrere mit | ----
  const istBild = m => m.url ? /\.(jpe?g|png|webp)(\?|$)/i.test(m.url) || /^image\//.test(m.mime || '') : /^image\//.test(m.mime || '');
  const bildUrl = (wert, vorschau) => { const m = /^material:(.+)$/.exec(wert); if (!m) return wert; const mat = st.material.find(x => x._id === m[1]); if (mat && !mat.url && mat.status === 'fertig' && !st.blobs[m[1]] && vorschau) internLaden(mat); return (mat && mat.url) || (vorschau ? st.blobs[m[1]] || '' : ''); };
  // Interne Datei einmal aus den Teilen holen, als lokale Adresse merken und die Ansicht nachziehen
  const ladend = new Set();
  function internLaden(mat, dann) {
    if (ladend.has(mat._id)) return; ladend.add(mat._id);
    teileLaden(db, mat._id, mat.mime || 'image/jpeg').then(blob => { st.blobs[mat._id] = URL.createObjectURL(blob); if (dann) dann(blob); else if (/^#filmdreh\//.test(location.hash)) { const v = document.querySelector('#view, main') || document.body; const id = location.hash.split('/')[1] || ''; if (id.startsWith('p-')) projekt(v, id.slice(2)); else if (id === 'werkstatt') projekt(v, WERKSTATT); } }).catch(() => {}).finally(() => ladend.delete(mat._id));
  }
  // Datei (Clip, ZIP, Foto) aus dem Mitgliederbereich herunterladen oder teilen
  async function internHerunterladen(mat, knopf) {
    const orig = knopf?.textContent; if (knopf) { knopf.disabled = true; }
    try {
      const blob = st.blobs[mat._id] ? await (await fetch(st.blobs[mat._id])).blob() : await teileLaden(db, mat._id, mat.mime || 'application/octet-stream', (i, n) => { if (knopf) knopf.textContent = `${Math.round(100 * i / n)} %`; });
      const name = mat.name || 'datei';
      try { const file = new File([blob], name, { type: blob.type }); if (navigator.canShare && navigator.canShare({ files: [file] }) && matchMedia('(pointer: coarse)').matches) { await navigator.share({ files: [file], title: mat.titel || name }); return; } } catch (e) { /* abgebrochen → Download */ }
      const u = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 60000);
    } catch (err) { msg($('#fp-skript-msg', document) || knopf, 'Nicht geladen: ' + errText(err), 'err'); }
    finally { if (knopf) { knopf.disabled = false; knopf.textContent = orig; } }
  }
  const werteAufloesen = (werte, vorschau) => { const w = { ...werte }; for (const k of Object.keys(w)) if (/^url|^bilder$/.test(k)) w[k] = String(w[k] || '').split('|').map(x => bildUrl(x.trim(), vorschau) || (vorschau ? '' : x.trim())).filter(Boolean).join('|'); return w; };
  const offeneFotos = liste => [...new Set(liste.flatMap(o => Object.entries(o.werte || {}).filter(([k]) => /^url|^bilder$/.test(k)).flatMap(([, v]) => String(v || '').split('|'))).filter(x => /^material:/.test(x.trim()) && !bildUrl(x.trim(), false)).map(x => x.trim().slice(9)))];
  // Der Push-Dienst bei GitHub schaut alle 20 Sekunden nach neuen Aufträgen und Uploads (push/schnell.mjs)
  const dienst = { start: 0 };
  const dienstStand = async () => dienst;
  const dienstText = () => '';
  const clipVon = (o, i, vorschau) => overlayClip({ ...o, werte: werteAufloesen(o.werte || {}, vorschau) }, i);
  function bildFeld(p, k, l, wert, mehrfach) {
    const werte = wert.split('|').map(x => x.trim()).filter(Boolean);
    const bilder = st.material.filter(m => (m.projektId === p._id || !m.projektId) && istBild(m) && m.status !== 'fehler');
    const thumbs = werte.map((w, i) => { const u = bildUrl(w, true); const mat = /^material:(.+)$/.exec(w); const m = mat && st.material.find(x => x._id === mat[1]); return `<span class="ow-thumb">${u ? `<img src="${esc(u)}" alt="">` : '<i>?</i>'}<small>${esc(m ? (m.titel || m.name || 'Bild') : w.replace(/^https?:\/\//, '').slice(0, 24))}${m && !m.url && m.status !== 'fertig' ? ' · wird gerade abgelegt (unter einer Minute)' : ''}</small><button type="button" class="linkbtn" data-bild-weg="${i}" aria-label="Entfernen">×</button></span>`; }).join('');
    return `<div class="field ow-bilder" data-bildfeld="${esc(k)}" data-mehrfach="${mehrfach ? 1 : 0}"><label>${esc(l)}</label><input type="hidden" data-feld="${esc(k)}" value="${esc(wert)}">
      <div class="ow-thumbs">${thumbs || `<span class="small muted">${mehrfach ? 'Noch keine Fotos – unten hinzufügen.' : 'Kein Foto – Platzhalter.'}</span>`}</div>
      <div class="ow-bild-aktionen"><label class="btn btn-line btn-sm">Vom Handy hochladen<input type="file" accept="image/*" ${mehrfach ? 'multiple' : ''} hidden data-bild-upload></label>${bilder.length ? `<select class="ow-bild-material" data-bild-material><option value="">Aus dem Material …</option>${bilder.map(m => `<option value="${esc(m.url ? m.url : 'material:' + m._id)}">${esc(m.titel || m.name || 'Bild')}</option>`).join('')}</select>` : ''}<button type="button" class="linkbtn" data-bild-adresse>Bild-Adresse …</button></div>
      <span class="small muted">Fotos werden fürs Video auf 1600 Pixel verkleinert und im Material des Projekts abgelegt.</span></div>`;
  }
  // Foto verkleinern (max. 1600 px, JPEG) und stückweise hochladen wie im Material-Tab; Vorschau sofort über eine lokale Adresse
  async function bildHochladen(file, p) {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => createImageBitmap(file).catch(() => null)); // Handy-Fotos: Drehung aus den Bilddaten übernehmen
    let blob = file;
    if (bmp) { const f = Math.min(1, 1600 / Math.max(bmp.width, bmp.height)); const c = document.createElement('canvas'); c.width = Math.round(bmp.width * f); c.height = Math.round(bmp.height * f); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); blob = await new Promise(r => c.toBlob(r, 'image/jpeg', .86)); }
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
    const buf = new Uint8Array(await blob.arrayBuffer()); const teile = Math.max(1, Math.ceil(buf.length / TEIL_BYTES));
    const m = await db.insert('FilmMaterial', { title: name, projektId: p._id, art: 'datei', titel: file.name.replace(/\.[^.]+$/, ''), url: '', name, mime: 'image/jpeg', groesse: buf.length, teile, status: DEMO ? 'fertig' : 'wartet', von: me().name, memberId: me().id });
    for (let i = 0; i < teile; i++) if (!DEMO) await db.insert('FilmTeile', { title: `${m._id} ${i}`, materialId: m._id, nr: i, daten: toB64(buf.subarray(i * TEIL_BYTES, (i + 1) * TEIL_BYTES)) });
    st.blobs[m._id] = URL.createObjectURL(blob); st.material.unshift(m);
    return m;
  }
  const label = (list, k) => (list.find(([x]) => x === k) || [])[1] || k || '';
  const mb = n => n ? (n > 1048576 ? `${Math.round(n / 1048576 * 10) / 10} MB` : `${Math.round(n / 1024)} KB`) : '';
  const stageUrl = q => `${BASE}/assets/insta/stage.html?${new URLSearchParams({ bg: 'gruen', ...q })}`;
  const laeuft = a => ['wartet', 'gestartet', 'laeuft'].includes(a.status);
  const parseJson = (s, d) => { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } };

  const WERKSTATT = 'werkstatt';
  const werkstattProjekt = () => { let g = {}; try { g = JSON.parse(localStorage.getItem('spd-werkstatt') || '{}'); } catch (e) { /* leer */ } return { _id: WERKSTATT, titel: 'Baustein-Werkstatt', art: 'reel', status: 'skript', skript: '', drehplan: '', notizen: '', overlays: '[]', takesFertig: '[]', ...g }; };
  const werkstattMerken = p => { try { localStorage.setItem('spd-werkstatt', JSON.stringify({ overlays: p.overlays || '[]' })); } catch (e) { /* kein Speicher */ } };
  async function laden() {
    [st.projekte, st.material] = await Promise.all([db.list('FilmProjekte', { desc: '_updatedDate', limit: 100 }).catch(() => []), db.list('FilmMaterial', { desc: '_createdDate', limit: 300 }).catch(() => [])]);
    st.konto = await (echtesKonto ? echtesKonto() : Promise.resolve({ db, me: me() })).catch(() => null);
    st.auftraege = st.konto ? await st.konto.db.list('Auftraege', { desc: '_createdDate', limit: 50 }).catch(() => []) : [];
  }
  // ---------- Übersicht: Projekte + Vorlagen ----------
  function uebersicht(v) {
    const vorlagen = st.material.filter(m => !m.projektId);
    v.innerHTML = `${sectionHead('Filmdreh', 'ein Projekt je Video – Skript, Overlays, Drehen')}
    <div class="mb-create"><details class="mb-details" id="fp-neu"><summary>Neues Video</summary><form class="form mb-form" id="f-projekt" novalidate>
      <div class="mb-2"><div class="field"><label for="fp-titel">Worum geht es?</label><input id="fp-titel" name="titel" type="text" required maxlength="100" placeholder="z. B. Ratssitzung Oktober"></div><div class="field"><label for="fp-art">Art</label><select id="fp-art" name="art">${FILM_ARTEN.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div></div>
      <p class="note" hidden></p><div class="mb-actions"><button class="btn btn-rot" type="submit">Anlegen</button></div></form></details></div>
    <a class="fp-karte fp-werkstatt" href="#filmdreh/werkstatt"><span class="fp-status">Werkstatt</span><b>Baustein-Werkstatt</b><small>Overlays bauen, ansehen, einzeln rendern – ohne Projekt</small></a>
    <div class="fp-liste">${st.projekte.map(p => { const takes = takesAus(p.skript).length, ov = parseJson(p.overlays, []).length, fertig = parseJson(p.takesFertig, []).length; return `<a class="fp-karte st-${esc(p.status || 'idee')}" href="#filmdreh/p-${esc(p._id)}"><span class="fp-status">${esc(label(FILM_STATUS, p.status || 'idee'))}</span><b>${esc(p.titel)}</b><small>${takes ? `${takes} Takes${fertig ? ` · ${fertig} im Kasten` : ''}` : 'noch kein Skript'} · ${ov ? ov + ' Overlays' : 'keine Overlays'}${st.auftraege.some(a => a.projektId === p._id && laeuft(a)) ? ' · <span class="rot">Agent rendert …</span>' : ''}</small></a>`; }).join('') || '<p class="muted">Noch kein Video – leg das erste an.</p>'}</div>
    <section class="mb-sub"><h4 class="doc-cat">Vorlagen <span class="small muted">Grundkit und fertige Overlay-Pakete, für jedes Video</span></h4>
      <div class="fm-liste">${vorlagen.map(materialZeile).join('') || '<p class="small muted">Noch keine Vorlagen abgelegt.</p>'}</div>
    </section>`;
    $('#f-projekt', v).addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
      const btn = f.querySelector('[type=submit]'); busy(btn, true);
      try { const p = await db.insert('FilmProjekte', { title: f.titel.value.trim(), titel: f.titel.value.trim(), art: f.art.value, status: 'idee', datum: '', skript: '', drehplan: '', notizen: '', overlays: '[]', ki: '[]', takesFertig: '[]', von: me().name, memberId: me().id }); st.tab = 'skript'; location.hash = '#filmdreh/p-' + p._id; }
      catch (err) { msg(f.querySelector('.note'), 'Nicht angelegt: ' + errText(err)); busy(btn, false); }
    });
  }
  function materialZeile(m) {
    const link = m.url ? `<a class="btn btn-line btn-sm" href="${esc(m.url)}" ${m.art === 'link' ? 'target="_blank" rel="noopener"' : `download="${esc(m.name || '')}"`}>${m.art === 'link' ? 'Öffnen' : 'Laden'}</a>` : m.status === 'fertig' ? `<button type="button" class="btn btn-line btn-sm" data-intern-laden="${esc(m._id)}">Laden</button>` : '';
    const status = m.status === 'wartet' ? '<span class="small rot">wird gerade abgelegt (unter einer Minute) …</span>' : m.status === 'fehler' ? `<span class="small rot">Fehler: ${esc(m.fehler || '')}</span>` : !m.url && m.status === 'fertig' ? '<span class="small muted">nur für Mitglieder – kein öffentlicher Link</span>' : '';
    return `<div class="fm-zeile art-${esc(m.art || 'datei')}" data-id="${esc(m._id)}"><span class="rz-ico">${m.art === 'link' ? ICON.link : m.art === 'overlays' || /^video\//.test(m.mime || '') ? ICON.play : ICON.doc}</span><div class="fm-text"><b>${esc(m.titel || m.name || 'Datei')}</b><small>${esc([mb(m.groesse), m.von, m._createdDate ? fmtWhen(m._createdDate) : ''].filter(Boolean).join(' · '))}</small>${status}</div>${link}${m.projektId ? '<button type="button" class="linkbtn" data-del-material aria-label="Entfernen">×</button>' : ''}</div>`;
  }

  // ---------- Projekt: drei Schritte ----------
  async function projekt(v, id) {
    const werkstatt = id === WERKSTATT; if (werkstatt) st.tab = 'overlays';
    const p = werkstatt ? werkstattProjekt() : st.projekte.find(x => x._id === id); if (!p) { v.innerHTML = '<p class="muted">Video nicht gefunden.</p>'; return; }
    const overlays = parseJson(p.overlays, []); const takes = takesAus(p.skript); const jobs = st.auftraege.filter(a => a.projektId === id);
    const schritt = (k, nr, titel, text, ok) => `<button type="button" class="fp-schritt${st.tab === k ? ' aktiv' : ''}${ok ? ' ok' : ''}" data-tab="${k}"><span class="fp-schritt-nr">${nr}</span><b>${titel}</b><small>${text}</small></button>`;
    const fertige = werkstatt ? st.material.filter(m => m.projektId === WERKSTATT && m.art === 'overlays' && (m.url || m.status === 'fertig')) : [];
    v.innerHTML = `<p class="small rz-zurueck"><a href="#filmdreh">← Filmdreh</a></p>
    ${sectionHead(esc(p.titel), werkstatt ? 'Bausteine bauen, ansehen, einzeln laden – ohne Projekt' : esc(label(FILM_ARTEN, p.art)))}
    ${werkstatt ? `<p class="small muted">Die Liste hier liegt nur auf diesem Gerät. Für ein Video mit Skript und Drehmodus lieber ein <a href="#filmdreh">Projekt</a> anlegen – dort gibt es dieselbe Werkstatt unter Schritt 2.</p>${fertige.length ? `<section class="mb-sub"><h4 class="doc-cat">Fertige Bausteine <span class="small muted">vom Agenten gerendert</span></h4><div class="fm-liste">${fertige.slice(0, 12).map(materialZeile).join('')}</div></section>` : ''}` : ''}
    <div class="fp-schritte" ${werkstatt ? 'hidden' : ''}>
      ${schritt('skript', '1', 'Skript', takes.length ? `${takes.length} Takes` : 'Take für Take schreiben', takes.length > 0)}
      ${schritt('overlays', '2', 'Overlays', overlays.length ? `${overlays.length} in der Liste` : 'Texte fürs Video', overlays.length > 0)}
      <a class="fp-schritt dreh${takes.length ? '' : ' aus'}" href="${takes.length ? `#filmdreh/dreh-${esc(p._id)}` : '#filmdreh/p-' + esc(p._id)}"><span class="fp-schritt-nr">3</span><b>Drehen</b><small>${takes.length ? 'Drehmodus starten' : 'erst ein Skript'}</small></a>
    </div>
    <div class="fp-inhalt">${st.tab === 'overlays' ? tabOverlays(p, overlays, jobs) : st.tab === 'material' ? tabMaterial(p) : tabSkript(p, takes)}</div>
    <p class="small muted fp-mehr" ${werkstatt ? 'hidden' : ''}><button type="button" class="linkbtn" data-tab="material">Material, Links &amp; Notizen</button> · Stand: ${FILM_STATUS.map(([k, l]) => `<button type="button" class="linkbtn${(p.status || 'idee') === k ? ' fett' : ''}" data-status="${k}">${l}</button>`).join(' ')}</p>`;
    wireProjekt(v, p, overlays);
  }
  function tabSkript(p, takes) {
    return `<section class="fp-block">
      <details class="mb-details ki" ${p.skript ? '' : 'open'}><summary>Skript mit Claude schreiben lassen <span class="small muted">– mit eurem Claude-Abo, kostet nichts extra</span></summary>
        <div class="ki-schritt"><span class="fp-schritt-nr">1</span><div>
          <b>Was stellt ihr euch vor?</b> <span class="small muted">Tippen oder sprechen – oder leer lassen und erst in Claude reden.</span>
          <div class="ki-form"><textarea id="ki-wunsch" rows="2" placeholder="z. B. „Reel über die neue Website, 45 Sekunden, ich rechts im Bild, Handy links“">${esc(p.kiWunsch || '')}</textarea><div class="ki-knoepfe"><button type="button" class="btn btn-line btn-sm" id="ki-mic" title="Sprechen statt tippen">🎤</button></div></div>
          <div class="mb-actions"><button type="button" class="btn btn-rot btn-sm" id="ki-kopieren">Auftrag für Claude kopieren</button><a class="btn btn-line btn-sm" href="https://claude.ai/new" target="_blank" rel="noopener">Claude öffnen</a><span class="small muted" id="ki-msg"></span></div>
          <p class="small muted">Der Auftrag enthält alles, was Claude wissen muss (Stil, Take-Format, Overlay-Bausteine, euer bisheriges Skript). In Claude einfügen, abschicken – dort könnt ihr auch weiterreden oder direkt hineinsprechen.</p>
        </div></div>
        <div class="ki-schritt"><span class="fp-schritt-nr">2</span><div>
          <b>Claudes Antwort hier einfügen</b> <span class="small muted">– einfach alles, was Claude geantwortet hat.</span>
          <textarea id="ki-antwort" rows="4" placeholder="Antwort einfügen …"></textarea>
          <div class="mb-actions"><button type="button" class="btn btn-schwarz btn-sm" id="ki-uebernehmen">Übernehmen</button><span class="small muted">Skript landet unten, der Drehplan darunter, die Overlays in Schritt 2.</span></div>
        </div></div>
      </details>
      <div class="field"><label for="fp-skript">Skript <span class="muted">– Take für Take, speichert von selbst</span></label><textarea id="fp-skript" rows="14" placeholder="TAKE 1 · Bild: du in die Kamera&#10;Du sagst: „Moin Soltau! …“&#10;Overlay: Großer Text „…“ (4 s)">${esc(p.skript || '')}</textarea></div>
      <div class="mb-actions"><span class="small muted" id="fp-skript-msg">${takes.length ? `${takes.length} Takes erkannt` : ''}</span><button type="button" class="linkbtn" id="fp-skript-teilen">Skript teilen …</button></div>
      <details class="mb-details sb" ${takes.length ? 'open' : ''}><summary>Storyboard <span class="small muted">– Skizze je Take: wo ihr steht, was die Kamera macht, wo das Overlay sitzt</span></summary>
        ${takes.length ? `<div class="sb-grid">${takes.map(t => `<figure class="sb-karte"><div class="sb-frame">${skizzeSvg(t.skizze, { typ: overlayKurz(t.overlay) })}</div><figcaption><b>Take ${esc(t.nr)}</b> ${esc(skizzeText(t.skizze))}${t.skizze.ausZeile ? '' : ' <span class="muted">(aus „Bild:“ abgeleitet)</span>'}</figcaption></figure>`).join('')}</div>
        <div class="mb-actions"><button type="button" class="linkbtn" id="fp-sb-teilen">Storyboard als Bild teilen …</button><span class="small muted">Claude schreibt je Take eine „Skizze:“-Zeile mit – ändert ihr sie im Skript, ändert sich die Zeichnung.</span></div>` : '<p class="small muted">Sobald das Skript Takes hat, erscheint hier je Take eine Skizze.</p>'}
      </details>
      <details class="mb-details"><summary>Drehplan (optional)</summary><textarea id="fp-drehplan" rows="5" placeholder="Bildschirmaufnahmen vorher: A1 Startseite scrollen, A2 Registrieren … Wer macht was, wann.">${esc(p.drehplan || '')}</textarea></details>
    </section>`;
  }
  function tabOverlays(p, overlays, jobs) {
    const nO = st.neuOverlay || { typ: 'gross', werte: { ...(overlayTyp('gross').beispiel) }, dauer: 4 }; const typ = overlayTyp(nO.typ) || OVERLAY_TYPEN[0];
    return `<section class="fp-block">
      <p class="small muted">Die Text-Einblendungen fürs Video. Aus Claudes Antwort kommen sie von selbst hier rein; du kannst welche ändern, löschen oder eigene bauen. „Rendern lassen“ macht daraus fertige Clips auf Grün für CapCut – die ZIP kommt als Push-Nachricht und landet unter Material.</p>
      <div class="ow-liste" id="ow-liste">${overlays.length ? overlays.map((o, i) => { const t = overlayTyp(o.typ); const c = clipVon(o, i, true); return `<div class="ow-item" data-i="${i}"><span class="ow-nr">${String(i + 1).padStart(2, '0')}</span><div><b>${esc(t?.name || o.typ)}</b><small>${esc(Object.entries(c.q).filter(([k]) => !['clip', 'anim', 'dauer', 'bg', 'akzent', 'akzent2', 'textfarbe', 'tempo'].includes(k) && !/^url|^bilder$/.test(k)).map(([, val]) => String(val).replace(/\|/g, ' / ')).join(' · ').slice(0, 90))} · ${esc(c.dauer)} s · ${esc((ANIMATIONEN.find(([av]) => av === (o.werte?.anim || '')) || ANIMATIONEN[0])[1])}</small></div><div class="mb-actions"><button type="button" class="linkbtn" data-ow="zeigen">ansehen</button><button type="button" class="linkbtn" data-ow="hoch" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="linkbtn" data-ow="runter" ${i === overlays.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="linkbtn" data-ow="weg">×</button></div></div>`; }).join('') : '<p class="small muted">Noch keine Overlays. Unten einen Baustein bauen – oder im Skript-Schritt Claudes Antwort einfügen.</p>'}</div>
      ${overlays.length ? `<div class="mb-actions"><button type="button" class="btn btn-rot" id="ow-rendern">${overlays.length} Overlays rendern lassen</button><label class="check small"><input type="checkbox" id="ow-alpha"><span>auch mit Transparenz (große ZIP)</span></label></div><p class="small muted" id="ow-msg">${st.konto ? 'Startet innerhalb einer halben Minute, fertig meist nach 2–5 Minuten. Push-Nachricht, wenn die Datei da ist.' : 'Dafür musst du im Hintergrund echt angemeldet sein.'}</p>` : ''}
      ${jobs.length ? `<div class="rb-auftraege">${jobs.map(a => `<article class="rb-auftrag st-${esc(a.status)}"><div class="rb-auftrag-kopf"><div><b>${esc(a.titel || 'Overlays')}</b><span class="small muted"> · ${esc(fmtWhen(a._createdDate))}</span></div>${a.status === 'fertig' && /^material:/.test(a.url || '') ? `<button type="button" class="btn btn-rot btn-sm" data-auftrag-laden="${esc(a.url.slice(9))}" data-name="${esc(a.dateiName || 'overlays.zip')}">${/\.mp4$|\.mov$/i.test(a.dateiName || '') ? 'Clip laden' : 'ZIP laden'}</button>` : a.status === 'fertig' && a.url ? `<a class="btn btn-rot btn-sm" href="${esc(a.url)}" download="${esc(a.dateiName || 'overlays.zip')}">${/\.mp4$|\.mov$/i.test(a.dateiName || '') ? 'Clip laden' : 'ZIP laden'}</a>` : laeuft(a) ? '<span class="rb-spinner"></span>' : ''}</div>${laeuft(a) ? `<div class="rb-balken"><span style="width:${a.status === 'wartet' ? 3 : Math.max(8, +a.fortschritt || 8)}%"></span></div><p class="small muted">${esc(a.status === 'wartet' ? (a.schritt || 'Wartet auf den Render-Roboter bei GitHub – der schaut alle 20 Sekunden nach neuen Aufträgen.') + (dienstText() ? ' ' + dienstText() : '') : a.schritt || 'Der Render-Roboter rendert …')}</p>` : `<p class="small ${a.status === 'fehler' ? 'rot' : 'muted'}">${esc(a.status === 'fertig' ? `Fertig – ${a.dateien || ''} Dateien, ${mb(a.groesse)}.` : a.fehler || a.status)}</p>`}</article>`).join('')}</div>` : ''}
      <details class="mb-details" id="ow-bauen" ${overlays.length ? '' : 'open'}><summary>Baustein bauen</summary>
        <div class="ow">
          <div class="ow-form">
            <div class="field"><label for="ow-typ">Baustein</label><select id="ow-typ">${OVERLAY_TYPEN.map(t => `<option value="${t.id}" ${t.id === typ.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div>
            ${typ.felder.map(([k, l, art, ...opts]) => art === 'select' ? `<div class="field"><label for="ow-${k}">${esc(l)}</label><select id="ow-${k}" data-feld="${k}">${opts.map(([ov, ol]) => `<option value="${esc(ov)}" ${String(nO.werte[k] ?? '') === ov ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select></div>` : art === 'lines' ? `<div class="field"><label for="ow-${k}">${esc(l)}</label><textarea id="ow-${k}" data-feld="${k}" rows="4">${esc(String(nO.werte[k] ?? '').replace(/\|/g, '\n'))}</textarea></div>` : (art === 'bild' || art === 'bilder') ? bildFeld(p, k, l, String(nO.werte[k] ?? ''), art === 'bilder') : art === 'farbe' ? (() => { const std = { akzent: '#E3000F', akzent2: '#FFD200', textfarbe: '#FFFFFF' }[k] || '#FFFFFF'; const akt = /^#[0-9a-f]{6}$/i.test(String(nO.werte[k] || '')) ? String(nO.werte[k]).toUpperCase() : std; return `<div class="field ow-farbe"><label for="ow-${k}">${esc(l)}</label><div class="ow-farbe-zeile"><input id="ow-${k}" data-feld="${k}" type="color" value="${akt}"><div class="ow-farben">${FARBEN.map(([f, n]) => `<button type="button" class="ow-swatch${akt === f ? ' aktiv' : ''}" data-farbe="${f}" data-fuer="ow-${k}" title="${esc(n)}" style="--f:${f}"></button>`).join('')}</div></div></div>`; })() : `<div class="field"><label for="ow-${k}">${esc(l)}</label><input id="ow-${k}" data-feld="${k}" type="text" value="${esc(nO.werte[k] ?? '')}"></div>`).join('')}
            <div class="mb-2 tight"><div class="field"><label for="ow-dauer">Sekunden</label><input id="ow-dauer" type="number" min="1" max="20" step="0.5" value="${esc(nO.dauer || typ.dauer)}"></div><div class="field"><label>&nbsp;</label><button type="button" class="btn btn-schwarz btn-sm" id="ow-vorschau">▶ Vorschau</button></div></div>
            <div class="mb-actions"><button type="button" class="btn btn-rot btn-sm" id="ow-add">In die Liste</button><button type="button" class="btn btn-schwarz btn-sm" id="ow-einzeln">Einzeln rendern &amp; laden</button><label class="check small"><input type="checkbox" id="ow-alpha1"><span>mit Transparenz</span></label></div>
            <p class="small muted" id="ow-einzeln-msg">„Einzeln“ schickt nur diesen Baustein zum Render-Roboter (unser Rechner bei GitHub, keine KI) – nach ein paar Minuten kommt die Datei per Push, sie steht dann oben bei den Aufträgen.</p>
          </div>
          <div class="ow-preview"><div class="ow-frame"><iframe id="ow-iframe" title="Vorschau" src="${esc(stageUrl(clipVon(nO, 0, true).q))}" width="1080" height="1920"></iframe></div>
            <div class="ow-anim"><span class="small muted">Animation – antippen zum Vergleichen:</span><div class="ow-anim-chips">${ANIMATIONEN.map(([av, al, ab]) => `<button type="button" class="chip" data-anim="${esc(av)}" title="${esc(ab)}" aria-pressed="${String(nO.werte.anim || '') === av}">${esc(al)}</button>`).join('')}</div>
            <span class="small muted">Tempo:</span><div class="ow-anim-chips">${TEMPI.map(([tv, tl]) => `<button type="button" class="chip" data-tempo="${esc(tv)}" aria-pressed="${String(nO.werte.tempo || '') === tv}">${esc(tl.split(' – ')[0])}</button>`).join('')}</div></div></div>
        </div>
      </details>
    </section>`;
  }
  function tabMaterial(p) {
    const material = st.material.filter(m => m.projektId === p._id);
    return `<section class="fp-block">
      <div class="fm-liste">${material.map(materialZeile).join('') || '<p class="small muted">Noch nichts abgelegt.</p>'}</div>
      <div class="fm-neu">
        <div class="field"><label for="fm-datei">Datei hochladen <span class="muted">(Overlays, Fotos, Musik – bis ${Math.round(MAX_UPLOAD / 1048576)} MB)</span></label><input id="fm-datei" type="file" multiple></div>
        <div class="mb-2"><div class="field"><label for="fm-link-titel">… oder Link</label><input id="fm-link-titel" type="text" placeholder="Titel, z. B. CapCut-Projekt"></div><div class="field"><label for="fm-link-url">Adresse</label><input id="fm-link-url" type="url" placeholder="https://…"></div></div>
        <div class="mb-actions"><button type="button" class="btn btn-schwarz btn-sm" id="fm-link-add">Link ablegen</button><span class="small muted" id="fm-msg"></span></div>
        <div class="rb-balken" id="fm-balken" hidden><span style="width:0%"></span></div>
      </div>
      <div class="field"><label for="fp-notizen">Notizen</label><textarea id="fp-notizen" rows="4" placeholder="Ideen, To-dos, wer macht was …">${esc(p.notizen || '')}</textarea></div>
      <div class="mb-actions"><input type="date" id="fp-datum" value="${esc(p.datum || '')}" aria-label="Drehtag" title="Drehtag / Veröffentlichung"><button type="button" class="linkbtn" id="fp-loeschen">Video löschen</button></div>
    </section>`;
  }

  function wireProjekt(v, p, overlays) {
    const werkstatt = p._id === WERKSTATT;
    const speichern = async (patch, hinweis) => { if (werkstatt) { Object.assign(p, patch); werkstattMerken(p); return; } try { const neu = await db.update('FilmProjekte', { ...p, ...patch }); Object.assign(p, neu); const m = $('#fp-skript-msg', v); if (m && hinweis) m.textContent = hinweis; } catch (err) { const m = $('#fp-skript-msg', v) || $('#ki-msg', v); if (m) m.textContent = 'Nicht gespeichert: ' + errText(err); } };
    const auto = (sel, feld) => { const el = $(sel, v); if (!el) return; let t = null; el.addEventListener('input', e => { clearTimeout(t); const m = $('#fp-skript-msg', v); if (m) m.textContent = 'wird gespeichert …'; t = setTimeout(() => speichern({ [feld]: e.target.value }, feld === 'skript' ? `gespeichert · ${takesAus(e.target.value).length} Takes erkannt` : 'gespeichert'), 1200); }); };
    auto('#fp-skript', 'skript'); auto('#fp-drehplan', 'drehplan'); auto('#fp-notizen', 'notizen');
    $$('[data-tab]', v).forEach(b => b.addEventListener('click', () => { st.tab = b.dataset.tab; projekt(v, p._id); }));
    $$('[data-status]', v).forEach(b => b.addEventListener('click', async () => { await speichern({ status: b.dataset.status }); projekt(v, p._id); }));
    $('#fp-datum', v)?.addEventListener('change', e => speichern({ datum: e.target.value }));
    $('#fp-skript-teilen', v)?.addEventListener('click', () => shareText(`🎬 ${p.titel}\n\n${$('#fp-skript', v).value}`));
    $('#fp-sb-teilen', v)?.addEventListener('click', async e => { const b = e.currentTarget; busy(b, true); try { await storyboardTeilen(p, takesAus($('#fp-skript', v).value)); } catch (err) { msg($('#fp-skript-msg', v), 'Bild nicht erstellt: ' + errText(err), 'err'); } busy(b, false); });
    $('#fp-loeschen', v)?.addEventListener('click', async () => { if (!confirm('Video wirklich löschen?')) return; try { await db.remove('FilmProjekte', p._id); location.hash = '#filmdreh'; } catch (err) { alert('Nicht gelöscht: ' + errText(err)); } });
    // ---- Claude: Auftrag kopieren, Antwort einfügen ----
    const wunsch = () => $('#ki-wunsch', v)?.value.trim() || '';
    const uebernehmen = async text => {
      const r = antwortLesen(text); if (!r || !r.skript) { $('#ki-msg', v).textContent = 'In der Antwort war kein Skript im Take-Format – bitte Claude um „Take für Take“ bitten.'; return; }
      const patch = { skript: r.skript, kiWunsch: wunsch() };
      if (r.overlays?.length) patch.overlays = JSON.stringify(r.overlays);
      if (r.drehplan) patch.drehplan = r.drehplan;
      await speichern(patch); st.tab = 'skript'; projekt(v, p._id);
      $('#ki-msg', v).textContent = `Übernommen: ${takesAus(r.skript).length} Takes${r.overlays?.length ? `, ${r.overlays.length} Overlays` : ''}${r.drehplan ? ', Drehplan' : ''}.${r.hinweis ? ' Claude fragt: ' + r.hinweis.slice(0, 120) : ''}`;
    };
    $('#ki-kopieren', v)?.addEventListener('click', async () => {
      const text = AUFTRAG(p, overlays, wunsch()); await speichern({ kiWunsch: wunsch() });
      try { await navigator.clipboard.writeText(text); $('#ki-msg', v).textContent = 'Kopiert – jetzt in Claude einfügen.'; } catch (e) { await shareText(text); }
    });
    $('#ki-uebernehmen', v)?.addEventListener('click', () => uebernehmen($('#ki-antwort', v).value));
    const mic = $('#ki-mic', v); const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (mic && !SR) mic.hidden = true;
    let rec = null;
    mic?.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      const ziel = $('#ki-wunsch', v);
      rec = new SR(); rec.lang = 'de-DE'; rec.interimResults = true; rec.continuous = true; const start = ziel.value;
      rec.onresult = ev => { let t = ''; for (const r of ev.results) t += r[0].transcript; ziel.value = (start ? start + ' ' : '') + t; };
      rec.onend = () => { rec = null; mic.textContent = '🎤'; mic.classList.remove('aktiv'); };
      rec.onerror = () => { rec = null; mic.textContent = '🎤'; mic.classList.remove('aktiv'); $('#ki-msg', v).textContent = 'Mikrofon nicht verfügbar – bitte tippen.'; };
      rec.start(); mic.textContent = '⏹'; mic.classList.add('aktiv');
    });
    // ---- Werkstatt ----
    const lesen = () => { const typ = $('#ow-typ', v).value; const werte = {}; $$('[data-feld]', v).forEach(el => { werte[el.dataset.feld] = el.value; }); return { typ, werte, dauer: +$('#ow-dauer', v).value || overlayTyp(typ).dauer }; };
    $('#ow-typ', v)?.addEventListener('change', () => { const t = overlayTyp($('#ow-typ', v).value); st.neuOverlay = { typ: t.id, werte: { ...t.beispiel }, dauer: t.dauer }; projekt(v, p._id); $('#ow-bauen', v).open = true; });
    const vorschau = o => { const f = $('#ow-iframe', v); if (f) f.src = stageUrl(clipVon(o, 0, true).q) + '&t=' + Date.now(); };
    // Bildwahl: Upload vom Handy, aus dem Material, Adresse, entfernen
    const bildSetzen = (feld, werte) => { const inp = $(`[data-bildfeld="${feld}"] input[data-feld]`, v); if (inp) inp.value = werte.filter(Boolean).join('|'); st.neuOverlay = lesen(); projekt(v, p._id); $('#ow-bauen', v).open = true; };
    const bildWerte = feld => ($(`[data-bildfeld="${feld}"] input[data-feld]`, v)?.value || '').split('|').map(x => x.trim()).filter(Boolean);
    v.addEventListener('click', e => {
      const b = e.target.closest('[data-auftrag-laden], [data-intern-laden]'); if (!b) return;
      const id = b.dataset.auftragLaden || b.dataset.internLaden; const mat = st.material.find(x => x._id === id) || { _id: id, name: b.dataset.name || 'datei', mime: /\.mp4$/i.test(b.dataset.name || '') ? 'video/mp4' : /\.mov$/i.test(b.dataset.name || '') ? 'video/quicktime' : 'application/zip' };
      internHerunterladen(mat, b);
    });
    $$('.ow-swatch', v).forEach(b => b.addEventListener('click', () => { const inp = document.getElementById(b.dataset.fuer); if (!inp) return; inp.value = b.dataset.farbe; b.parentElement.querySelectorAll('.ow-swatch').forEach(x => x.classList.toggle('aktiv', x === b)); st.neuOverlay = lesen(); vorschau(st.neuOverlay); }));
    $$('.ow-farbe input[type=color]', v).forEach(inp => inp.addEventListener('change', () => { st.neuOverlay = lesen(); vorschau(st.neuOverlay); }));
    $$('[data-bild-upload]', v).forEach(inp => inp.addEventListener('change', async e => {
      const box = e.currentTarget.closest('[data-bildfeld]'); const feld = box.dataset.bildfeld, mehrfach = box.dataset.mehrfach === '1'; const files = [...e.currentTarget.files]; if (!files.length) return;
      const lab = e.currentTarget.closest('label'); lab.textContent = 'Lädt hoch …';
      const neu = []; for (const f of files) { try { const m = await bildHochladen(f, p); neu.push('material:' + m._id); } catch (err) { msg($('#fp-skript-msg', v) || lab, 'Foto nicht hochgeladen: ' + errText(err), 'err'); } }
      bildSetzen(feld, mehrfach ? [...bildWerte(feld), ...neu] : neu.slice(0, 1));
    }));
    $$('[data-bild-material]', v).forEach(sel => sel.addEventListener('change', e => { const box = e.currentTarget.closest('[data-bildfeld]'); if (!e.currentTarget.value) return; bildSetzen(box.dataset.bildfeld, box.dataset.mehrfach === '1' ? [...bildWerte(box.dataset.bildfeld), e.currentTarget.value] : [e.currentTarget.value]); }));
    $$('[data-bild-adresse]', v).forEach(b => b.addEventListener('click', e => { const box = e.currentTarget.closest('[data-bildfeld]'); const u = (window.prompt('Bild-Adresse (https://…)') || '').trim(); if (!/^https?:\/\//.test(u)) return; bildSetzen(box.dataset.bildfeld, box.dataset.mehrfach === '1' ? [...bildWerte(box.dataset.bildfeld), u] : [u]); }));
    $$('[data-bild-weg]', v).forEach(b => b.addEventListener('click', e => { const box = e.currentTarget.closest('[data-bildfeld]'); const w = bildWerte(box.dataset.bildfeld); w.splice(+e.currentTarget.dataset.bildWeg, 1); bildSetzen(box.dataset.bildfeld, w); }));
    $('#ow-vorschau', v)?.addEventListener('click', () => { st.neuOverlay = lesen(); vorschau(st.neuOverlay); });
    $$('.ow-anim-chips [data-tempo]', v).forEach(b => b.addEventListener('click', () => { const sel = $('#ow-tempo', v); if (sel) sel.value = b.dataset.tempo; $$('.ow-anim-chips [data-tempo]', v).forEach(x => x.setAttribute('aria-pressed', String(x === b))); st.neuOverlay = lesen(); vorschau(st.neuOverlay); }));
    $$('.ow-anim-chips [data-anim]', v).forEach(b => b.addEventListener('click', () => { const sel = $('#ow-anim', v); if (sel) sel.value = b.dataset.anim; $$('.ow-anim-chips [data-anim]', v).forEach(x => x.setAttribute('aria-pressed', String(x === b))); st.neuOverlay = lesen(); vorschau(st.neuOverlay); }));
    $('#ow-add', v)?.addEventListener('click', async () => { const o = lesen(); st.neuOverlay = o; overlays.push(o); await speichern({ overlays: JSON.stringify(overlays) }); projekt(v, p._id); });
    $('#ow-liste', v)?.addEventListener('click', async e => {
      const b = e.target.closest('[data-ow]'); if (!b) return; const i = +b.closest('.ow-item').dataset.i;
      if (b.dataset.ow === 'zeigen') { st.neuOverlay = overlays[i]; projekt(v, p._id); $('#ow-bauen', v).open = true; vorschau(overlays[i]); $('.ow-preview', v)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (b.dataset.ow === 'weg') overlays.splice(i, 1);
      if (b.dataset.ow === 'hoch' && i > 0) [overlays[i - 1], overlays[i]] = [overlays[i], overlays[i - 1]];
      if (b.dataset.ow === 'runter' && i < overlays.length - 1) [overlays[i + 1], overlays[i]] = [overlays[i], overlays[i + 1]];
      await speichern({ overlays: JSON.stringify(overlays) }); projekt(v, p._id);
    });
    const bestellen = async (liste, titel, nurGruen, mitDrehplan, msgEl) => {
      if (!st.konto) throw new Error('nicht echt angemeldet');
      const offen = offeneFotos(liste);
      const manifest = { titel, hinweis: 'Text-Overlays auf Grün (CapCut: Chroma-Key) – Reihenfolge wie in der Liste.', nurGruen, drehplan: mitDrehplan ? [p.skript, p.drehplan].filter(Boolean).join('\n\n— DREHPLAN —\n') : '', clips: liste.map((o, i) => clipVon(o, i, false)), wartetAuf: offen };
      const schritt = offen.length ? `Wartet auf ${offen.length === 1 ? 'ein Foto' : offen.length + ' Fotos'} – ${offen.length === 1 ? 'es wird' : 'sie werden'} gerade abgelegt (unter einer Minute), danach startet der Render-Roboter von selbst.` : '';
      await st.konto.db.insert('Auftraege', { typ: 'overlays', status: 'wartet', title: manifest.titel, titel: manifest.titel, projektId: p._id, sitzungId: '', memberId: st.konto.me.id, von: st.konto.me.name, manifest: JSON.stringify(manifest), benachrichtigt: false, fortschritt: 0, schritt });
      dienstStand().then(() => projekt(v, p._id));
      st.auftraege = await st.konto.db.list('Auftraege', { desc: '_createdDate', limit: 50 }).catch(() => st.auftraege);
      projekt(v, p._id); pollen(v, p._id);
    };
    $('#ow-rendern', v)?.addEventListener('click', async e => {
      const b = e.currentTarget; busy(b, true);
      try { await bestellen(overlays, `Overlays ${p.titel}`, !$('#ow-alpha', v).checked, !werkstatt); } catch (err) { $('#ow-msg', v).textContent = 'Nicht bestellt: ' + errText(err); busy(b, false); }
    });
    $('#ow-einzeln', v)?.addEventListener('click', async e => {
      const b = e.currentTarget; busy(b, true); const o = lesen(); st.neuOverlay = o; const t = overlayTyp(o.typ);
      const kurz = String(o.werte.text || o.werte.name || o.werte.titel || o.werte.label || o.werte.bis || '').replace(/[|*#_\n]/g, ' ').trim().slice(0, 30);
      try { await bestellen([o], `Baustein ${t?.name.replace(/\s*\(.*\)\s*$/, '') || o.typ}${kurz ? ' – ' + kurz : ''}`, !$('#ow-alpha1', v).checked, false); $('#ow-bauen', v)?.scrollIntoView({ behavior: 'smooth' }); }
      catch (err) { $('#ow-einzeln-msg', v).textContent = 'Nicht bestellt: ' + errText(err); busy(b, false); }
    });
    if (st.auftraege.some(a => a.projektId === p._id && laeuft(a))) { pollen(v, p._id); if (st.auftraege.some(a => a.projektId === p._id && a.status === 'wartet') && !dienst.start) dienstStand().then(() => { if (v.isConnected) projekt(v, p._id); }); }
    if (st.material.some(m => (m.projektId === p._id) && !m.url && m.status === 'wartet')) { if (!dienst.start) dienstStand().then(() => { if (v.isConnected && st.tab === 'overlays') projekt(v, p._id); }); if (!st.auftraege.some(a => a.projektId === p._id && laeuft(a))) pollen(v, p._id); }
    // ---- Material ----
    $('#fm-link-add', v)?.addEventListener('click', async e => {
      const b = e.currentTarget; const titel = $('#fm-link-titel', v).value.trim(), url = $('#fm-link-url', v).value.trim();
      if (!/^https?:\/\//.test(url)) { $('#fm-msg', v).textContent = 'Bitte eine Adresse mit https:// eintragen.'; return; }
      busy(b, true);
      try { await db.insert('FilmMaterial', { title: titel || url, projektId: p._id, art: 'link', titel: titel || url, url, name: '', mime: '', groesse: 0, status: 'fertig', von: me().name, memberId: me().id }); st.material = await db.list('FilmMaterial', { desc: '_createdDate', limit: 300 }); projekt(v, p._id); }
      catch (err) { $('#fm-msg', v).textContent = 'Nicht abgelegt: ' + errText(err); busy(b, false); }
    });
    $('#fm-datei', v)?.addEventListener('change', async e => {
      const files = [...e.target.files]; if (!files.length) return; const balken = $('#fm-balken', v); balken.hidden = false;
      for (const f of files) {
        if (f.size > MAX_UPLOAD) { $('#fm-msg', v).textContent = `${f.name}: zu groß (${mb(f.size)}).`; continue; }
        try {
          const buf = new Uint8Array(await f.arrayBuffer()); const teile = Math.max(1, Math.ceil(buf.length / TEIL_BYTES));
          const m = await db.insert('FilmMaterial', { title: f.name, projektId: p._id, art: 'datei', titel: f.name.replace(/\.[^.]+$/, ''), url: '', name: f.name, mime: f.type || 'application/octet-stream', groesse: f.size, teile, status: DEMO ? 'fertig' : 'wartet', von: me().name, memberId: me().id });
          for (let i = 0; i < teile; i++) { $('#fm-msg', v).textContent = `${f.name}: Teil ${i + 1} von ${teile} …`; $('span', balken).style.width = Math.round(100 * (i + 1) / teile) + '%'; if (!DEMO) await db.insert('FilmTeile', { title: `${m._id} ${i}`, materialId: m._id, nr: i, daten: toB64(buf.subarray(i * TEIL_BYTES, (i + 1) * TEIL_BYTES)) }); }
          $('#fm-msg', v).textContent = DEMO ? `${f.name}: im Demo nur gemerkt.` : `${f.name}: hochgeladen – wird innerhalb einer Minute abgelegt.`;
        } catch (err) { $('#fm-msg', v).textContent = `${f.name}: ${errText(err)}`; }
      }
      st.material = await db.list('FilmMaterial', { desc: '_createdDate', limit: 300 }).catch(() => st.material); projekt(v, p._id);
    });
    v.addEventListener('click', async e => {
      const d = e.target.closest('[data-del-material]'); if (!d) return; const id = d.closest('.fm-zeile').dataset.id;
      if (!confirm('Eintrag entfernen?')) return;
      try { await db.remove('FilmMaterial', id); st.material = st.material.filter(m => m._id !== id); projekt(v, p._id); } catch (err) { alert('Nicht entfernt: ' + errText(err)); }
    });
  }
  function pollen(v, id) {
    clearInterval(st.timer);
    st.timer = setInterval(async () => {
      if (!v.isConnected || !/^#filmdreh\/(p-|werkstatt)/.test(location.hash) || !st.konto) { clearInterval(st.timer); return; }
      const neu = await st.konto.db.list('Auftraege', { desc: '_createdDate', limit: 50 }).catch(() => null); if (!neu) return;
      const vorher = dienst.start; if (neu.some(a => a.projektId === id && a.status === 'wartet')) await dienstStand();
      if (st.material.some(m => m.status === 'wartet')) { const mat = await db.list('FilmMaterial', { desc: '_createdDate', limit: 300 }).catch(() => null); if (mat && JSON.stringify(mat.map(m => [m._id, m.status])) !== JSON.stringify(st.material.map(m => [m._id, m.status]))) { st.material = mat; projekt(v, id); } }
      const stand = l => JSON.stringify(l.filter(a => a.projektId === id).map(a => [a._id, a.status, a.fortschritt, a.schritt]));
      if (stand(neu) !== stand(st.auftraege) || dienst.start !== vorher) { st.auftraege = neu; st.material = await db.list('FilmMaterial', { desc: '_createdDate', limit: 300 }).catch(() => st.material); projekt(v, id); }
      if (!neu.some(a => a.projektId === id && laeuft(a))) clearInterval(st.timer);
    }, 10000);
  }

  // ---------- Drehmodus: ein Take groß, Kamera, Satz, Overlay ----------
  // Storyboard als ein Bild (3 Spalten): Skizze + Take-Nummer + Kurztext
  async function storyboardTeilen(p, takes) {
    if (!takes.length) return;
    const SP = 3, BW = 270, BH = 480, PAD = 24, CAP = 96, KOPF = 90;
    const zeilen = Math.ceil(takes.length / SP);
    const c = document.createElement('canvas'); c.width = PAD * 2 + SP * BW + (SP - 1) * PAD; c.height = KOPF + zeilen * (BH + CAP + PAD) + PAD;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = '#0F0F0F'; g.font = '700 30px system-ui, sans-serif'; g.fillText(`Storyboard – ${p.titel}`.slice(0, 60), PAD, 46);
    g.fillStyle = '#7C7676'; g.font = '18px system-ui, sans-serif'; g.fillText(`${takes.length} Takes${p.datum ? ' · ' + p.datum : ''} · SPD Soltau`, PAD, 74);
    const bild = svg => new Promise((ok, nein) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => nein(new Error('SVG')); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
    const wrap = (text, x, y, breite, zeile) => { const w = text.split(' '); let l = ''; for (const wort of w) { const t = l ? l + ' ' + wort : wort; if (g.measureText(t).width > breite && l) { g.fillText(l, x, y); y += zeile; l = wort; } else l = t; } if (l) g.fillText(l, x, y); };
    for (let i = 0; i < takes.length; i++) {
      const t = takes[i]; const x = PAD + (i % SP) * (BW + PAD), y = KOPF + Math.floor(i / SP) * (BH + CAP + PAD);
      g.drawImage(await bild(skizzeSvg(t.skizze, { typ: overlayKurz(t.overlay) })), x, y, BW, BH);
      g.fillStyle = '#E3000F'; g.font = '700 20px system-ui, sans-serif'; g.fillText(`TAKE ${t.nr}`, x, y + BH + 26);
      g.fillStyle = '#232222'; g.font = '15px system-ui, sans-serif'; wrap(skizzeText(t.skizze), x, y + BH + 50, BW, 19);
    }
    const dataUrl = c.toDataURL('image/png'); const name = `storyboard-${String(p.titel || 'video').toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-').slice(0, 40)}.png`;
    try { const blob = await (await fetch(dataUrl)).blob(); const file = new File([blob], name, { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Storyboard', text: p.titel }); return; } } catch (e) { /* abgebrochen oder kein Teilen */ }
    const a = document.createElement('a'); a.href = dataUrl; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  }
  function dreh(v, p) {
    const takes = takesAus(p.skript); if (!takes.length) { location.hash = '#filmdreh/p-' + p._id; return; }
    const fertig = new Set(parseJson(p.takesFertig, []));
    st.take = Math.min(Math.max(st.take, 0), takes.length - 1);
    const t = takes[st.take]; const imKasten = fertig.has(t.nr);
    drehStart?.();
    v.innerHTML = `<div class="fokus dreh">
      <div class="fokus-bar"><span class="fokus-bar-tag">Drehmodus</span><b class="fokus-bar-titel">${esc(p.titel)}</b><a class="btn btn-line btn-sm fokus-ende" href="#filmdreh/p-${esc(p._id)}">${ICON.close}Beenden</a><span class="small fokus-bar-meta">${takes.length} Takes · ${fertig.size} im Kasten${p.datum ? ' · ' + esc(p.datum) : ''}</span></div>
      <div class="fokus-zeile"><span class="fokus-zaehler">Take ${st.take + 1} von ${takes.length}</span><button type="button" class="chip" id="dr-kasten" aria-pressed="${imKasten}">${imKasten ? '✓ Im Kasten' : 'Im Kasten?'}</button><span class="fokus-wach small" id="fo-wach" hidden>● Bildschirm bleibt an</span></div>
      <div class="fokus-top dreh-take${imKasten ? ' ok' : ''}" id="fo-top">
        <div class="fokus-nr">TAKE ${esc(t.nr)}</div>
        <div class="dreh-bild"><div class="sb-frame">${skizzeSvg(t.skizze, { typ: overlayKurz(t.overlay) })}</div><div><span class="fokus-label">Kamera &amp; Bild</span>${t.bild ? `<p>${esc(t.bild)}</p>` : ''}<p class="sb-text">${esc(skizzeText(t.skizze))}</p></div></div>
        <div class="dreh-text"><span class="fokus-label">Du sagst</span><p class="dreh-satz">${nl2br(t.text)}</p></div>
        ${t.overlay ? `<div class="dreh-overlay"><span class="fokus-label">Overlay dazu</span><p>${esc(t.overlay)}</p></div>` : ''}
        ${t.notiz ? `<p class="small muted">${nl2br(t.notiz)}</p>` : ''}
      </div>
      <div class="fokus-nav"><button class="btn btn-line" type="button" id="fo-prev" ${st.take === 0 ? 'disabled' : ''}>‹ Vorheriger</button><button class="btn btn-rot" type="button" id="fo-next" ${st.take >= takes.length - 1 ? 'disabled' : ''}>Nächster ›</button></div>
      <details class="fokus-alle"><summary>Alle Takes</summary><ol class="dreh-liste">${takes.map((x, i) => `<li class="${i === st.take ? 'aktiv' : ''}${fertig.has(x.nr) ? ' ok' : ''}" data-i="${i}">${fertig.has(x.nr) ? '✓ ' : ''}${esc(x.text.slice(0, 90))}${x.text.length > 90 ? '…' : ''}</li>`).join('')}</ol></details>
      <p class="small muted">Wischen oder Pfeiltasten blättern. „Im Kasten“ merkt sich, was schon gedreht ist. Menü und Kopf sind ausgeblendet, der Bildschirm bleibt an.</p>
    </div>`;
    const go = i => { st.take = i; dreh(v, p); window.scrollTo({ top: 0, behavior: 'smooth' }); };
    $('#fo-prev', v).addEventListener('click', () => go(st.take - 1)); $('#fo-next', v).addEventListener('click', () => go(st.take + 1));
    $$('.dreh-liste li', v).forEach(li => li.addEventListener('click', () => go(+li.dataset.i)));
    $('#dr-kasten', v).addEventListener('click', async () => { if (fertig.has(t.nr)) fertig.delete(t.nr); else fertig.add(t.nr); try { Object.assign(p, await db.update('FilmProjekte', { ...p, takesFertig: JSON.stringify([...fertig]) })); } catch (e) { /* beim nächsten Mal */ } dreh(v, p); });
    const top = $('#fo-top', v); let sx = null, sy = null;
    top.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    top.addEventListener('touchend', e => { if (sx === null) return; const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy; sx = null; if (Math.abs(dx) < 60 || Math.abs(dy) > 50) return; if (dx < 0 && st.take < takes.length - 1) go(st.take + 1); if (dx > 0 && st.take > 0) go(st.take - 1); }, { passive: true });
    v.onkeydown = e => { if (['TEXTAREA', 'INPUT'].includes(e.target.tagName)) return; if (e.key === 'ArrowRight' && st.take < takes.length - 1) go(st.take + 1); if (e.key === 'ArrowLeft' && st.take > 0) go(st.take - 1); };
    v.tabIndex = -1; v.focus({ preventScroll: true });
  }

  async function sec(v) {
    clearInterval(st.timer);
    await laden();
    const sub = location.hash.split('/')[1] || '';
    if (sub.startsWith('dreh-')) { const p = st.projekte.find(x => x._id === sub.slice(5)); if (p) return dreh(v, p); }
    if (sub === 'werkstatt') { st.letztes = sub; return projekt(v, WERKSTATT); }
    if (sub.startsWith('p-')) { if (st.letztes !== sub) { st.tab = 'skript'; st.take = 0; } st.letztes = sub; return projekt(v, sub.slice(2)); }
    uebersicht(v);
  }
  return { sec, takesAus };
}
