// Filmdreh – nur für das Filmteam (src/lib/film.mjs: FILM_TEAM). Ein Projekt = ein Video, in drei Schritten:
//   1 Skript (Take für Take – selbst oder mit Claude), 2 Overlays (Werkstatt → Agent rendert), 3 Drehen (Drehmodus:
//   ein Take groß auf dem Bildschirm, Kamera, Satz, Overlay). Dazu Material (Dateien/Links) und die Vorlagen.
// Claude: über das eigene Claude-Abo – Auftrag kopieren, in Claude einfügen (oder dort sprechen), Antwort zurück einfügen. Kein Server, kein Schlüssel, keine Kosten.
import { FILM_ARTEN, FILM_STATUS, OVERLAY_TYPEN, overlayTyp, overlayClip, AUFTRAG, antwortLesen } from './lib/film.mjs';
import { TEIL_BYTES, toB64 } from './lib/rat.mjs';

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
    let sagt = '', overlay = '', rest = [], modus = '';
    for (const z of zeilen.slice(1)) {
      if (/^\s*Du sagst:/i.test(z)) { modus = 'sagt'; sagt += z.replace(/^\s*Du sagst:\s*/i, '') + '\n'; continue; }
      if (/^\s*Overlay:/i.test(z)) { modus = 'overlay'; overlay += z.replace(/^\s*Overlay:\s*/i, '') + ' '; continue; }
      if (modus === 'sagt') sagt += z + '\n'; else if (modus === 'overlay') overlay += z + ' '; else rest.push(z);
    }
    sagt = sagt.trim().replace(/^[„"“]/, '').replace(/[“"”]$/, '').trim(); overlay = overlay.trim();
    return { nr: i + 1, bild, text: sagt || rest.join('\n').trim(), overlay, notiz: sagt ? rest.join('\n').trim() : '' };
  });
  return text.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).map((t, i) => ({ nr: i + 1, bild: (t.match(/\[(?:Bild|Kamera)[^\]]*\]/i) || [''])[0].replace(/^\[|\]$/g, ''), text: t.replace(/\[[^\]]*\]\s*/g, '').trim(), overlay: (t.match(/\[Overlay:\s*([^\]]+)\]/i) || [])[1] || '', notiz: '' }));
}

export function makeFilm(ctx) {
  const { db, esc, $, $$, msg, busy, errText, shareText, nl2br, sectionHead, fmtWhen, ICON, DEMO, BASE, me, echtesKonto, drehStart } = ctx;
  const st = { projekte: [], material: [], auftraege: [], konto: null, timer: null, tab: 'skript', neuOverlay: null, take: 0, letztes: '' };
  const label = (list, k) => (list.find(([x]) => x === k) || [])[1] || k || '';
  const mb = n => n ? (n > 1048576 ? `${Math.round(n / 1048576 * 10) / 10} MB` : `${Math.round(n / 1024)} KB`) : '';
  const stageUrl = q => `${BASE}/assets/insta/stage.html?${new URLSearchParams({ ...q, bg: 'gruen' })}`;
  const laeuft = a => ['wartet', 'gestartet', 'laeuft'].includes(a.status);
  const parseJson = (s, d) => { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } };

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
    const link = m.url ? `<a class="btn btn-line btn-sm" href="${esc(m.url)}" ${m.art === 'link' ? 'target="_blank" rel="noopener"' : `download="${esc(m.name || '')}"`}>${m.art === 'link' ? 'Öffnen' : 'Laden'}</a>` : '';
    const status = m.status === 'wartet' ? '<span class="small rot">wird abgelegt (bis 5 Min.) …</span>' : m.status === 'fehler' ? `<span class="small rot">Fehler: ${esc(m.fehler || '')}</span>` : '';
    return `<div class="fm-zeile art-${esc(m.art || 'datei')}" data-id="${esc(m._id)}"><span class="rz-ico">${m.art === 'link' ? ICON.link : m.art === 'overlays' ? ICON.play : ICON.doc}</span><div class="fm-text"><b>${esc(m.titel || m.name || 'Datei')}</b><small>${esc([mb(m.groesse), m.von, m._createdDate ? fmtWhen(m._createdDate) : ''].filter(Boolean).join(' · '))}</small>${status}</div>${link}${m.projektId ? '<button type="button" class="linkbtn" data-del-material aria-label="Entfernen">×</button>' : ''}</div>`;
  }

  // ---------- Projekt: drei Schritte ----------
  async function projekt(v, id) {
    const p = st.projekte.find(x => x._id === id); if (!p) { v.innerHTML = '<p class="muted">Video nicht gefunden.</p>'; return; }
    const overlays = parseJson(p.overlays, []); const takes = takesAus(p.skript); const jobs = st.auftraege.filter(a => a.projektId === id);
    const schritt = (k, nr, titel, text, ok) => `<button type="button" class="fp-schritt${st.tab === k ? ' aktiv' : ''}${ok ? ' ok' : ''}" data-tab="${k}"><span class="fp-schritt-nr">${nr}</span><b>${titel}</b><small>${text}</small></button>`;
    v.innerHTML = `<p class="small rz-zurueck"><a href="#filmdreh">← Filmdreh</a></p>
    ${sectionHead(esc(p.titel), esc(label(FILM_ARTEN, p.art)))}
    <div class="fp-schritte">
      ${schritt('skript', '1', 'Skript', takes.length ? `${takes.length} Takes` : 'Take für Take schreiben', takes.length > 0)}
      ${schritt('overlays', '2', 'Overlays', overlays.length ? `${overlays.length} in der Liste` : 'Texte fürs Video', overlays.length > 0)}
      <a class="fp-schritt dreh${takes.length ? '' : ' aus'}" href="${takes.length ? `#filmdreh/dreh-${esc(p._id)}` : '#filmdreh/p-' + esc(p._id)}"><span class="fp-schritt-nr">3</span><b>Drehen</b><small>${takes.length ? 'Drehmodus starten' : 'erst ein Skript'}</small></a>
    </div>
    <div class="fp-inhalt">${st.tab === 'overlays' ? tabOverlays(p, overlays, jobs) : st.tab === 'material' ? tabMaterial(p) : tabSkript(p, takes)}</div>
    <p class="small muted fp-mehr"><button type="button" class="linkbtn" data-tab="material">Material, Links &amp; Notizen</button> · Stand: ${FILM_STATUS.map(([k, l]) => `<button type="button" class="linkbtn${(p.status || 'idee') === k ? ' fett' : ''}" data-status="${k}">${l}</button>`).join(' ')}</p>`;
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
      <details class="mb-details"><summary>Drehplan (optional)</summary><textarea id="fp-drehplan" rows="5" placeholder="Bildschirmaufnahmen vorher: A1 Startseite scrollen, A2 Registrieren … Wer macht was, wann.">${esc(p.drehplan || '')}</textarea></details>
    </section>`;
  }
  function tabOverlays(p, overlays, jobs) {
    const nO = st.neuOverlay || { typ: 'gross', werte: { ...(overlayTyp('gross').beispiel) }, dauer: 4 }; const typ = overlayTyp(nO.typ) || OVERLAY_TYPEN[0];
    return `<section class="fp-block">
      <p class="small muted">Die Text-Einblendungen fürs Video. Aus Claudes Antwort kommen sie von selbst hier rein; du kannst welche ändern, löschen oder eigene bauen. „Rendern lassen“ macht daraus fertige Clips auf Grün für CapCut – die ZIP kommt als Push-Nachricht und landet unter Material.</p>
      <div class="ow-liste" id="ow-liste">${overlays.length ? overlays.map((o, i) => { const t = overlayTyp(o.typ); const c = overlayClip(o, i); return `<div class="ow-item" data-i="${i}"><span class="ow-nr">${String(i + 1).padStart(2, '0')}</span><div><b>${esc(t?.name || o.typ)}</b><small>${esc(Object.entries(c.q).filter(([k]) => k !== 'clip').map(([, val]) => String(val).replace(/\|/g, ' / ')).join(' · ').slice(0, 90))} · ${esc(c.dauer)} s</small></div><div class="mb-actions"><button type="button" class="linkbtn" data-ow="zeigen">ansehen</button><button type="button" class="linkbtn" data-ow="hoch" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="linkbtn" data-ow="runter" ${i === overlays.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="linkbtn" data-ow="weg">×</button></div></div>`; }).join('') : '<p class="small muted">Noch keine Overlays. Unten einen Baustein bauen – oder im Skript-Schritt Claudes Antwort einfügen.</p>'}</div>
      ${overlays.length ? `<div class="mb-actions"><button type="button" class="btn btn-rot" id="ow-rendern">${overlays.length} Overlays rendern lassen</button><label class="check small"><input type="checkbox" id="ow-alpha"><span>auch mit Transparenz (große ZIP)</span></label></div><p class="small muted" id="ow-msg">${st.konto ? 'Meist 3–10 Minuten. Push-Nachricht, wenn die ZIP fertig ist.' : 'Dafür musst du im Hintergrund echt angemeldet sein.'}</p>` : ''}
      ${jobs.length ? `<div class="rb-auftraege">${jobs.map(a => `<article class="rb-auftrag st-${esc(a.status)}"><div class="rb-auftrag-kopf"><div><b>${esc(a.titel || 'Overlays')}</b><span class="small muted"> · ${esc(fmtWhen(a._createdDate))}</span></div>${a.status === 'fertig' && a.url ? `<a class="btn btn-rot btn-sm" href="${esc(a.url)}" download="${esc(a.dateiName || 'overlays.zip')}">ZIP laden</a>` : laeuft(a) ? '<span class="rb-spinner"></span>' : ''}</div>${laeuft(a) ? `<div class="rb-balken"><span style="width:${a.status === 'wartet' ? 3 : Math.max(8, +a.fortschritt || 8)}%"></span></div><p class="small muted">${esc(a.status === 'wartet' ? 'Wartet auf den Agenten (bis 5 Minuten).' : a.schritt || 'Der Agent rendert …')}</p>` : `<p class="small ${a.status === 'fehler' ? 'rot' : 'muted'}">${esc(a.status === 'fertig' ? `Fertig – ${a.dateien || ''} Dateien, ${mb(a.groesse)}.` : a.fehler || a.status)}</p>`}</article>`).join('')}</div>` : ''}
      <details class="mb-details" id="ow-bauen" ${overlays.length ? '' : 'open'}><summary>Baustein bauen</summary>
        <div class="ow">
          <div class="ow-form">
            <div class="field"><label for="ow-typ">Baustein</label><select id="ow-typ">${OVERLAY_TYPEN.map(t => `<option value="${t.id}" ${t.id === typ.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div>
            ${typ.felder.map(([k, l, art, ...opts]) => art === 'select' ? `<div class="field"><label for="ow-${k}">${esc(l)}</label><select id="ow-${k}" data-feld="${k}">${opts.map(([ov, ol]) => `<option value="${esc(ov)}" ${String(nO.werte[k] ?? '') === ov ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select></div>` : art === 'lines' ? `<div class="field"><label for="ow-${k}">${esc(l)}</label><textarea id="ow-${k}" data-feld="${k}" rows="4">${esc(String(nO.werte[k] ?? '').replace(/\|/g, '\n'))}</textarea></div>` : `<div class="field"><label for="ow-${k}">${esc(l)}</label><input id="ow-${k}" data-feld="${k}" type="text" value="${esc(nO.werte[k] ?? '')}"></div>`).join('')}
            <div class="mb-2 tight"><div class="field"><label for="ow-dauer">Sekunden</label><input id="ow-dauer" type="number" min="1" max="20" step="0.5" value="${esc(nO.dauer || typ.dauer)}"></div><div class="field"><label>&nbsp;</label><button type="button" class="btn btn-schwarz btn-sm" id="ow-vorschau">▶ Vorschau</button></div></div>
            <div class="mb-actions"><button type="button" class="btn btn-rot btn-sm" id="ow-add">In die Liste</button></div>
          </div>
          <div class="ow-preview"><div class="ow-frame"><iframe id="ow-iframe" title="Vorschau" src="${esc(stageUrl(overlayClip(nO, 0).q))}" width="1080" height="1920"></iframe></div></div>
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
    const speichern = async (patch, hinweis) => { try { const neu = await db.update('FilmProjekte', { ...p, ...patch }); Object.assign(p, neu); const m = $('#fp-skript-msg', v); if (m && hinweis) m.textContent = hinweis; } catch (err) { const m = $('#fp-skript-msg', v) || $('#ki-msg', v); if (m) m.textContent = 'Nicht gespeichert: ' + errText(err); } };
    const auto = (sel, feld) => { const el = $(sel, v); if (!el) return; let t = null; el.addEventListener('input', e => { clearTimeout(t); const m = $('#fp-skript-msg', v); if (m) m.textContent = 'wird gespeichert …'; t = setTimeout(() => speichern({ [feld]: e.target.value }, feld === 'skript' ? `gespeichert · ${takesAus(e.target.value).length} Takes erkannt` : 'gespeichert'), 1200); }); };
    auto('#fp-skript', 'skript'); auto('#fp-drehplan', 'drehplan'); auto('#fp-notizen', 'notizen');
    $$('[data-tab]', v).forEach(b => b.addEventListener('click', () => { st.tab = b.dataset.tab; projekt(v, p._id); }));
    $$('[data-status]', v).forEach(b => b.addEventListener('click', async () => { await speichern({ status: b.dataset.status }); projekt(v, p._id); }));
    $('#fp-datum', v)?.addEventListener('change', e => speichern({ datum: e.target.value }));
    $('#fp-skript-teilen', v)?.addEventListener('click', () => shareText(`🎬 ${p.titel}\n\n${$('#fp-skript', v).value}`));
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
    const vorschau = o => { const f = $('#ow-iframe', v); if (f) f.src = stageUrl(overlayClip(o, 0).q) + '&t=' + Date.now(); };
    $('#ow-vorschau', v)?.addEventListener('click', () => { st.neuOverlay = lesen(); vorschau(st.neuOverlay); });
    $('#ow-add', v)?.addEventListener('click', async () => { const o = lesen(); st.neuOverlay = o; overlays.push(o); await speichern({ overlays: JSON.stringify(overlays) }); projekt(v, p._id); });
    $('#ow-liste', v)?.addEventListener('click', async e => {
      const b = e.target.closest('[data-ow]'); if (!b) return; const i = +b.closest('.ow-item').dataset.i;
      if (b.dataset.ow === 'zeigen') { st.neuOverlay = overlays[i]; projekt(v, p._id); $('#ow-bauen', v).open = true; vorschau(overlays[i]); $('.ow-preview', v)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (b.dataset.ow === 'weg') overlays.splice(i, 1);
      if (b.dataset.ow === 'hoch' && i > 0) [overlays[i - 1], overlays[i]] = [overlays[i], overlays[i - 1]];
      if (b.dataset.ow === 'runter' && i < overlays.length - 1) [overlays[i + 1], overlays[i]] = [overlays[i], overlays[i + 1]];
      await speichern({ overlays: JSON.stringify(overlays) }); projekt(v, p._id);
    });
    $('#ow-rendern', v)?.addEventListener('click', async e => {
      const b = e.currentTarget; busy(b, true);
      try {
        if (!st.konto) throw new Error('nicht echt angemeldet');
        const manifest = { titel: `Overlays ${p.titel}`, hinweis: 'Text-Overlays auf Grün (CapCut: Chroma-Key) – Reihenfolge wie in der Liste.', nurGruen: !$('#ow-alpha', v).checked, drehplan: [p.skript, p.drehplan].filter(Boolean).join('\n\n— DREHPLAN —\n'), clips: overlays.map(overlayClip) };
        await st.konto.db.insert('Auftraege', { typ: 'overlays', status: 'wartet', title: manifest.titel, titel: manifest.titel, projektId: p._id, sitzungId: '', memberId: st.konto.me.id, von: st.konto.me.name, manifest: JSON.stringify(manifest), benachrichtigt: false, fortschritt: 0, schritt: '' });
        st.auftraege = await st.konto.db.list('Auftraege', { desc: '_createdDate', limit: 50 }).catch(() => st.auftraege);
        projekt(v, p._id); pollen(v, p._id);
      } catch (err) { $('#ow-msg', v).textContent = 'Nicht bestellt: ' + errText(err); busy(b, false); }
    });
    if (st.auftraege.some(a => a.projektId === p._id && laeuft(a))) pollen(v, p._id);
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
          $('#fm-msg', v).textContent = DEMO ? `${f.name}: im Demo nur gemerkt.` : `${f.name}: hochgeladen – wird innerhalb von 5 Minuten bei Wix abgelegt.`;
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
      if (!v.isConnected || !location.hash.startsWith('#filmdreh/p-') || !st.konto) { clearInterval(st.timer); return; }
      const neu = await st.konto.db.list('Auftraege', { desc: '_createdDate', limit: 50 }).catch(() => null); if (!neu) return;
      const stand = l => JSON.stringify(l.filter(a => a.projektId === id).map(a => [a._id, a.status, a.fortschritt, a.schritt]));
      if (stand(neu) !== stand(st.auftraege)) { st.auftraege = neu; st.material = await db.list('FilmMaterial', { desc: '_createdDate', limit: 300 }).catch(() => st.material); projekt(v, id); }
      if (!neu.some(a => a.projektId === id && laeuft(a))) clearInterval(st.timer);
    }, 10000);
  }

  // ---------- Drehmodus: ein Take groß, Kamera, Satz, Overlay ----------
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
        ${t.bild ? `<div class="dreh-bild"><span class="fokus-label">Kamera &amp; Bild</span><p>${esc(t.bild)}</p></div>` : ''}
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
    if (sub.startsWith('p-')) { if (st.letztes !== sub) { st.tab = 'skript'; st.take = 0; } st.letztes = sub; return projekt(v, sub.slice(2)); }
    uebersicht(v);
  }
  return { sec, takesAus };
}
