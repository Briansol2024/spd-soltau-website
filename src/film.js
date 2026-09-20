// Filmdreh (Regie-Modus) – nur für das Filmteam (src/lib/film.mjs: FILM_TEAM): Videoprojekte mit Skript und Drehplan,
// Material (eigene Dateien → über den Push-Dienst in den Wix-Medienmanager, Links), die Overlay-Werkstatt mit Vorschau und
// Bestellung beim Overlay-Agenten sowie die Vorlagen (Grundkit, fertige Overlay-Pakete, Drehpläne).
import { FILM_ARTEN, FILM_STATUS, OVERLAY_TYPEN, overlayTyp, overlayClip } from './lib/film.mjs';
import { TEIL_BYTES, toB64 } from './lib/rat.mjs';

const MAX_UPLOAD = 40 * 1024 * 1024;
// KI-Regieassistent: spricht direkt mit der Anthropic-API (Claude). Der Schlüssel liegt nur im Speicher dieses Geräts.
const KI_MODELLE = [['claude-sonnet-5', 'Claude Sonnet 5 (schnell, empfohlen)'], ['claude-opus-5', 'Claude Opus 5 (gründlicher, teurer)'], ['claude-haiku-4-5-20251001', 'Claude Haiku 4.5 (günstig)']];
const KI_SYSTEM = (p, overlays) => `Du bist der Regieassistent der SPD Soltau (Ortsverein und Ratsfraktion im niedersächsischen Soltau) für kurze Instagram-Videos (Reels, Stories) und Erklärvideos zur Website spd-soltau.de und zur Mitglieder-App.
Stil: informell, persönlich, klare kurze Sätze, kein Amtsdeutsch, zugewandt, gern mit „Moin Soltau!“, Claim „Aus Liebe zu Soltau“. Sprecher ist meist Brian Weber (stellv. Vorsitzender, Ratsmitglied) oder Birhat Kaçar (Vorsitzender, Fraktionsvorsitzender). Keine Angriffe auf Personen, keine erfundenen Fakten – wenn dir Fakten fehlen, frag nach.
Du schreibst: (1) SKRIPTE – immer TAKE FÜR TAKE, ausführlich: jeder Take ist eine Einstellung mit genau dem Satz (oder zwei kurzen Sätzen), der gesprochen wird – nie ein langer Fließtext, aus dem sich der Sprecher selbst Sätze bauen muss. Format je Take, mit Leerzeile dazwischen:
TAKE 1 · Bild: du in die Kamera (oder: Handy links im Bild, Bildschirmaufnahme A2 …)
Du sagst: „…ein Satz…“
Overlay: Großer Text „Ratssitzung 01.10.“ / „So hat der Rat|*entschieden*“ (4 s) – oder: keins
Ein Reel von 45 Sekunden hat 8–14 Takes; ein Erklärvideo 15–25. Jeder Take bekommt einen Overlay-Vorschlag aus den Bausteinen unten (oder ausdrücklich „keins“). (2) DREHPLÄNE – welche Bildschirmaufnahmen/Einstellungen vorher aufgenommen werden (nummeriert) und welche zu welchem Satz gehören. (3) OVERLAYS aus diesen Bausteinen (typ → Felder):
${OVERLAY_TYPEN.map(t => `- ${t.id} (${t.name}, ${t.dauer} s): ${t.felder.map(([k, l]) => `${k}=${l}`).join('; ')}`).join('\n')}
Text-Regeln in Overlays: Zeilen mit | trennen, *Wort* = rot; Listen-Punkte („lines“) mit Zeilenumbruch.
ARBEITSWEISE: Zuerst ein Skript vorschlagen und ausdrücklich fragen, ob es so passt oder was anders soll. Erst wenn der Nutzer zustimmt, Drehplan und Overlays vorschlagen – die Overlays in derselben Reihenfolge wie die Takes, ein Overlay je Take, der eins hat (Intro/Outro gibt es fertig im Grundkit). Bei Rückfragen kurz antworten.
ANTWORTFORMAT: Immer genau ein JSON-Objekt, ohne Markdown, ohne Text davor oder danach: {"antwort": "Text für den Chat (kurz, freundlich)", "skript": "vollständiges Skript – nur wenn du eines vorschlägst oder änderst", "drehplan": "nur wenn vorgeschlagen", "overlays": [{"typ": "gross", "dauer": 4, "werte": {"label": "…", "text": "…"}}] nur wenn vorgeschlagen}.
PROJEKT: Titel „${p.titel}“, Art: ${p.art || 'reel'}${p.datum ? ', Termin ' + p.datum : ''}.
AKTUELLES SKRIPT: ${p.skript ? p.skript.slice(0, 4000) : '(noch keins)'}
AKTUELLER DREHPLAN: ${p.drehplan ? p.drehplan.slice(0, 2000) : '(noch keiner)'}
AKTUELLE OVERLAYS: ${overlays.length ? JSON.stringify(overlays).slice(0, 2000) : '(noch keine)'}`;
async function claudeFragen(key, model, system, messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model, max_tokens: 4000, system, messages }) });
  if (!res.ok) { let t = ''; try { t = (await res.json()).error?.message || ''; } catch (e) { /* leer */ } throw new Error(res.status === 401 ? 'Schlüssel ungültig' : res.status === 429 ? 'Zu viele Anfragen – kurz warten' : `${res.status} ${t}`.trim()); }
  const j = await res.json(); const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n').trim();
  const m = text.match(/\{[\s\S]*\}/); let out = null; if (m) { try { out = JSON.parse(m[0]); } catch (e) { out = null; } }
  return out && typeof out === 'object' && out.antwort !== undefined ? out : { antwort: text };
}
export function makeFilm(ctx) {
  const { db, esc, $, $$, msg, busy, errText, shareText, nl2br, sectionHead, fmtWhen, ICON, DEMO, BASE, me, echtesKonto, route } = ctx;
  const st = { projekte: [], material: [], auftraege: [], konto: null, timer: null, neuOverlay: null };
  const label = (list, k) => (list.find(([x]) => x === k) || [])[1] || k || '';
  const mb = n => n ? (n > 1048576 ? `${Math.round(n / 1048576 * 10) / 10} MB` : `${Math.round(n / 1024)} KB`) : '';
  const stageUrl = q => `${BASE}/assets/insta/stage.html?${new URLSearchParams({ ...q, bg: 'gruen' })}`;
  const laeuft = a => ['wartet', 'gestartet', 'laeuft'].includes(a.status);

  async function laden() {
    [st.projekte, st.material] = await Promise.all([db.list('FilmProjekte', { desc: '_updatedDate', limit: 100 }).catch(() => []), db.list('FilmMaterial', { desc: '_createdDate', limit: 300 }).catch(() => [])]);
    st.konto = await (echtesKonto ? echtesKonto() : Promise.resolve({ db, me: me() })).catch(() => null);
    st.auftraege = st.konto ? await st.konto.db.list('Auftraege', { desc: '_createdDate', limit: 50 }).catch(() => []) : [];
  }
  const parseJson = (s, d) => { try { return s ? JSON.parse(s) : d; } catch (e) { return d; } };

  // ---------- Übersicht ----------
  function uebersicht(v) {
    const vorlagen = st.material.filter(m => !m.projektId);
    v.innerHTML = `${sectionHead('Filmdreh', 'Regie-Modus für das Filmteam – Skripte, Overlays, Material')}
    <p class="small muted">Nur für das Filmteam sichtbar. Jedes Video ist ein Projekt: Skript und Drehplan schreiben, Overlays in der Werkstatt zusammenstellen und rendern lassen, Material sammeln. Die Vorlagen unten sind die fertigen Pakete aus dem Grundkit.</p>
    <div class="mb-create"><details class="mb-details" id="fp-neu"><summary>Neues Projekt</summary><form class="form mb-form" id="f-projekt" novalidate>
      <div class="mb-2"><div class="field"><label for="fp-titel">Titel</label><input id="fp-titel" name="titel" type="text" required maxlength="100" placeholder="z. B. Ratssitzung Oktober – Reel"></div><div class="field"><label for="fp-art">Art</label><select id="fp-art" name="art">${FILM_ARTEN.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div></div>
      <p class="note" hidden></p><div class="mb-actions"><button class="btn btn-rot" type="submit">Projekt anlegen</button></div></form></details></div>
    <div class="fp-liste">${st.projekte.map(p => { const mat = st.material.filter(m => m.projektId === p._id).length; const jobs = st.auftraege.filter(a => a.projektId === p._id); return `<a class="fp-karte st-${esc(p.status || 'idee')}" href="#filmdreh/p-${esc(p._id)}"><span class="fp-status">${esc(label(FILM_STATUS, p.status || 'idee'))}</span><b>${esc(p.titel)}</b><small>${esc(label(FILM_ARTEN, p.art))}${p.datum ? ' · ' + esc(p.datum) : ''} · ${p.skript ? 'Skript ✓' : 'kein Skript'} · ${parseJson(p.overlays, []).length} Overlays · ${mat} Dateien${jobs.some(laeuft) ? ' · <span class="rot">Agent rendert …</span>' : ''}</small></a>`; }).join('') || '<p class="muted">Noch kein Projekt – leg das erste an.</p>'}</div>
    <section class="mb-sub"><h4 class="doc-cat">Vorlagen &amp; Grundkit <span class="small muted">für alle Videos</span></h4>
      <div class="fm-liste">${vorlagen.map(materialZeile).join('') || '<p class="small muted">Noch keine Vorlagen abgelegt.</p>'}</div>
      <p class="small muted">Grundkit = Intro „Moin, Soltau!“, Schlusskarte, Bauchbinden aller Vorstands- und Ratsmitglieder, Wort-Popper – alles auf Greenscreen-Grün für CapCut (Chroma-Key auf #00B140).</p>
    </section>`;
    $('#f-projekt', v).addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
      const btn = f.querySelector('[type=submit]'); busy(btn, true);
      try { const p = await db.insert('FilmProjekte', { title: f.titel.value.trim(), titel: f.titel.value.trim(), art: f.art.value, status: 'idee', datum: '', skript: '', drehplan: '', notizen: '', overlays: '[]', von: me().name, memberId: me().id }); location.hash = '#filmdreh/p-' + p._id; }
      catch (err) { msg(f.querySelector('.note'), 'Nicht angelegt: ' + errText(err)); busy(btn, false); }
    });
  }
  function materialZeile(m) {
    const link = m.url ? `<a class="btn btn-line btn-sm" href="${esc(m.url)}" ${m.art === 'link' ? 'target="_blank" rel="noopener"' : `download="${esc(m.name || '')}"`}>${m.art === 'link' ? 'Öffnen' : 'Herunterladen'}</a>` : '';
    const status = m.status === 'wartet' ? '<span class="small rot">wird bei Wix abgelegt (bis 5 Min.) …</span>' : m.status === 'fehler' ? `<span class="small rot">Fehler: ${esc(m.fehler || '')}</span>` : '';
    return `<div class="fm-zeile art-${esc(m.art || 'datei')}" data-id="${esc(m._id)}"><span class="rz-ico">${m.art === 'link' ? ICON.link : m.art === 'overlays' ? ICON.play : ICON.doc}</span><div class="fm-text"><b>${esc(m.titel || m.name || 'Datei')}</b><small>${esc([m.name && m.name !== m.titel ? m.name : '', mb(m.groesse), m.von, m._createdDate ? fmtWhen(m._createdDate) : ''].filter(Boolean).join(' · '))}</small>${status}</div>${link}${m.memberId === me().id || m.projektId ? '<button type="button" class="linkbtn" data-del-material aria-label="Entfernen">×</button>' : ''}</div>`;
  }

  // ---------- Projekt ----------
  async function projekt(v, id) {
    const p = st.projekte.find(x => x._id === id); if (!p) { v.innerHTML = '<p class="muted">Projekt nicht gefunden.</p>'; return; }
    const overlays = parseJson(p.overlays, []);
    const material = st.material.filter(m => m.projektId === id);
    const jobs = st.auftraege.filter(a => a.projektId === id);
    const nO = st.neuOverlay || { typ: 'gross', werte: { ...(overlayTyp('gross').beispiel) }, dauer: 4 };
    const typ = overlayTyp(nO.typ) || OVERLAY_TYPEN[0];
    v.innerHTML = `<p class="small rz-zurueck"><a href="#filmdreh">← Filmdreh</a></p>
    ${sectionHead(esc(p.titel), `${esc(label(FILM_ARTEN, p.art))} · angelegt von ${esc(p.von || '–')}`)}
    <div class="mb-tabs fp-statusleiste">${FILM_STATUS.map(([k, l]) => `<button type="button" class="chip" data-status="${k}" aria-pressed="${(p.status || 'idee') === k}">${l}</button>`).join('')}<input type="date" id="fp-datum" value="${esc(p.datum || '')}" aria-label="Drehtag" title="Drehtag / Veröffentlichung"></div>

    <section class="mb-sub"><h4 class="doc-cat">Skript <span class="small muted">wird automatisch gespeichert</span></h4>
      <textarea id="fp-skript" rows="12" placeholder="Was du sagst – Satz für Satz. In eckigen Klammern die Regie: [Overlay: „…“], [Handy: Aufnahme A3] …">${esc(p.skript || '')}</textarea>
      <div class="mb-actions"><button type="button" class="btn btn-line btn-sm" id="fp-skript-teilen">Skript teilen …</button><span class="small muted" id="fp-skript-msg"></span></div>
    </section>
    <section class="mb-sub"><h4 class="doc-cat">Drehplan <span class="small muted">Bildschirmaufnahmen, Reihenfolge, wer was macht</span></h4>
      <textarea id="fp-drehplan" rows="6" placeholder="A1 Startseite scrollen · A2 Registrieren bis Code · … Satz 3: Handy rein, darin A1 …">${esc(p.drehplan || '')}</textarea>
    </section>

    <section class="mb-sub"><h4 class="doc-cat">Overlay-Werkstatt <span class="small muted">zusammenstellen, ansehen, rendern lassen</span></h4>
      <div class="ow">
        <div class="ow-form">
          <div class="field"><label for="ow-typ">Baustein</label><select id="ow-typ">${OVERLAY_TYPEN.map(t => `<option value="${t.id}" ${t.id === typ.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></div>
          ${typ.felder.map(([k, l, art, ...opts]) => art === 'select' ? `<div class="field"><label for="ow-${k}">${esc(l)}</label><select id="ow-${k}" data-feld="${k}">${opts.map(([ov, ol]) => `<option value="${esc(ov)}" ${String(nO.werte[k] ?? '') === ov ? 'selected' : ''}>${esc(ol)}</option>`).join('')}</select></div>` : art === 'lines' ? `<div class="field"><label for="ow-${k}">${esc(l)}</label><textarea id="ow-${k}" data-feld="${k}" rows="4">${esc(String(nO.werte[k] ?? '').replace(/\|/g, '\n'))}</textarea></div>` : `<div class="field"><label for="ow-${k}">${esc(l)}</label><input id="ow-${k}" data-feld="${k}" type="text" value="${esc(nO.werte[k] ?? '')}"></div>`).join('')}
          <div class="mb-2 tight"><div class="field"><label for="ow-dauer">Sekunden</label><input id="ow-dauer" type="number" min="1" max="20" step="0.5" value="${esc(nO.dauer || typ.dauer)}"></div><div class="field"><label>&nbsp;</label><button type="button" class="btn btn-schwarz btn-sm" id="ow-vorschau">▶ Vorschau</button></div></div>
          <div class="mb-actions"><button type="button" class="btn btn-rot btn-sm" id="ow-add">Zur Liste hinzufügen</button></div>
        </div>
        <div class="ow-preview"><div class="ow-frame"><iframe id="ow-iframe" title="Vorschau" src="${esc(stageUrl(overlayClip(nO, 0).q))}" width="1080" height="1920"></iframe></div><p class="small muted">Vorschau auf Grün, so wie der Clip später in CapCut liegt. ▶ startet die Animation neu.</p></div>
      </div>
      <div class="ow-liste" id="ow-liste">${overlays.length ? overlays.map((o, i) => { const t = overlayTyp(o.typ); const c = overlayClip(o, i); return `<div class="ow-item" data-i="${i}"><span class="ow-nr">${String(i + 1).padStart(2, '0')}</span><div><b>${esc(t?.name || o.typ)}</b><small>${esc(Object.entries(c.q).filter(([k]) => k !== 'clip').map(([, val]) => String(val).replace(/\|/g, ' / ')).join(' · ').slice(0, 90))} · ${esc(c.dauer)} s</small></div><div class="mb-actions"><button type="button" class="linkbtn" data-ow="zeigen">ansehen</button><button type="button" class="linkbtn" data-ow="hoch" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="linkbtn" data-ow="runter" ${i === overlays.length - 1 ? 'disabled' : ''}>↓</button><button type="button" class="linkbtn" data-ow="weg">×</button></div></div>`; }).join('') : '<p class="small muted">Noch keine Overlays in der Liste. Links einen Baustein füllen, Vorschau ansehen, hinzufügen.</p>'}</div>
      ${overlays.length ? `<label class="check"><input type="checkbox" id="ow-alpha"><span>Zusätzlich mit echter Transparenz (ProRes .mov – große ZIP)</span></label>
      <div class="mb-actions"><button type="button" class="btn btn-rot" id="ow-rendern">${overlays.length} Overlays rendern lassen</button><span class="small muted" id="ow-msg">${st.konto ? 'Der Agent rendert in der Cloud – meist 5–10 Minuten, Push-Nachricht wenn fertig.' : 'Dafür musst du im Hintergrund echt angemeldet sein.'}</span></div>` : ''}
      ${jobs.length ? `<div class="rb-auftraege">${jobs.map(a => `<article class="rb-auftrag st-${esc(a.status)}"><div class="rb-auftrag-kopf"><div><b>${esc(a.titel || 'Overlays')}</b><span class="small muted"> · ${esc(fmtWhen(a._createdDate))}</span></div>${a.status === 'fertig' && a.url ? `<a class="btn btn-rot btn-sm" href="${esc(a.url)}" download="${esc(a.dateiName || 'overlays.zip')}">ZIP herunterladen</a>` : laeuft(a) ? '<span class="rb-spinner"></span>' : ''}</div>${laeuft(a) ? `<div class="rb-balken"><span style="width:${a.status === 'wartet' ? 3 : Math.max(8, +a.fortschritt || 8)}%"></span></div><p class="small muted">${esc(a.status === 'wartet' ? 'Wartet auf den Agenten (bis 5 Minuten).' : a.schritt || 'Der Agent rendert …')}</p>` : `<p class="small ${a.status === 'fehler' ? 'rot' : 'muted'}">${esc(a.status === 'fertig' ? `Fertig – ${a.dateien || ''} Dateien, ${mb(a.groesse)}.` : a.fehler || a.status)}</p>`}</article>`).join('')}</div>` : ''}
    </section>

    ${kiHtml(p)}

    <section class="mb-sub"><h4 class="doc-cat">Material <span class="small muted">Dateien und Links zu diesem Projekt</span></h4>
      <div class="fm-liste">${material.map(materialZeile).join('') || '<p class="small muted">Noch nichts abgelegt.</p>'}</div>
      <div class="fm-neu">
        <div class="field"><label for="fm-datei">Datei hochladen <span class="muted">(Overlays, Fotos, Musik, Schnittdateien – bis ${Math.round(MAX_UPLOAD / 1048576)} MB)</span></label><input id="fm-datei" type="file" multiple></div>
        <div class="mb-2"><div class="field"><label for="fm-link-titel">… oder Link</label><input id="fm-link-titel" type="text" placeholder="Titel, z. B. CapCut-Projekt"></div><div class="field"><label for="fm-link-url">Adresse</label><input id="fm-link-url" type="url" placeholder="https://…"></div></div>
        <div class="mb-actions"><button type="button" class="btn btn-schwarz btn-sm" id="fm-link-add">Link ablegen</button><span class="small muted" id="fm-msg"></span></div>
        <div class="rb-balken" id="fm-balken" hidden><span style="width:0%"></span></div>
      </div>
    </section>

    <section class="mb-sub"><h4 class="doc-cat">Notizen</h4><textarea id="fp-notizen" rows="4" placeholder="Ideen, To-dos, wer macht was …">${esc(p.notizen || '')}</textarea></section>
    <div class="mb-actions"><button type="button" class="linkbtn" id="fp-loeschen">Projekt löschen</button></div>`;
    wireProjekt(v, p, overlays);
  }

  // ---------- KI-Regieassistent ----------
  const kiKey = () => { try { return localStorage.getItem('spd-claude-key') || ''; } catch (e) { return ''; } };
  const kiModel = () => { try { return localStorage.getItem('spd-claude-model') || KI_MODELLE[0][0]; } catch (e) { return KI_MODELLE[0][0]; } };
  function kiHtml(p) {
    const chat = parseJson(p.ki, []);
    const hatKey = !!kiKey();
    return `<section class="mb-sub ki"><h4 class="doc-cat">KI-Regieassistent <span class="small muted">Claude – Idee rein, Skript raus, dann Overlays</span></h4>
      ${!hatKey ? `<div class="ki-setup"><p class="small">Der Assistent spricht direkt mit Claude (Anthropic). Dafür braucht es einen <b>API-Schlüssel</b> aus deinem Anthropic-Konto (console.anthropic.com → API Keys). Er wird <b>nur auf diesem Gerät</b> gespeichert – nie bei uns, nie bei Wix. Jede Anfrage kostet ein paar Cent auf deinem Konto.</p>
        <div class="mb-2"><div class="field"><label for="ki-key">API-Schlüssel</label><input id="ki-key" type="password" autocomplete="off" placeholder="sk-ant-…"></div><div class="field"><label for="ki-model">Modell</label><select id="ki-model">${KI_MODELLE.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div></div>
        <div class="mb-actions"><button type="button" class="btn btn-schwarz btn-sm" id="ki-key-save">Auf diesem Gerät speichern</button></div></div>`
      : `<div class="ki-chat" id="ki-chat">${chat.length ? chat.map(m => `<div class="ki-msg ${m.rolle}"><span class="ki-wer">${m.rolle === 'du' ? 'Du' : 'Claude'}</span><div class="ki-text">${nl2br(m.text)}</div>${m.vorschlag ? `<div class="ki-vorschlag">${m.vorschlag.skript ? '<button type="button" class="btn btn-rot btn-sm" data-ki="skript">Skript übernehmen</button>' : ''}${m.vorschlag.drehplan ? '<button type="button" class="btn btn-schwarz btn-sm" data-ki="drehplan">Drehplan übernehmen</button>' : ''}${m.vorschlag.overlays?.length ? `<button type="button" class="btn btn-schwarz btn-sm" data-ki="overlays">${m.vorschlag.overlays.length} Overlays in die Werkstatt</button>` : ''}</div>` : ''}</div>`).join('') : '<p class="small muted">Sag dem Assistenten, worum es geht – als Text oder per Mikrofon. Er schreibt ein Skript und fragt nach, ob es passt. Danach kommen Drehplan und Overlays.</p>'}</div>
        <form class="ki-form" id="ki-form"><textarea id="ki-in" rows="2" placeholder="z. B. „Reel über die neue Website, 45 Sekunden, ich rechts im Bild, Handy links“"></textarea><div class="ki-knoepfe"><button type="button" class="btn btn-line btn-sm" id="ki-mic" title="Sprechen statt tippen">🎤</button><button class="btn btn-rot btn-sm" type="submit">Senden</button></div></form>
        <p class="small muted" id="ki-msg">${KI_MODELLE.find(([k]) => k === kiModel())?.[1] || kiModel()} · <button type="button" class="linkbtn" id="ki-neu">Unterhaltung leeren</button> · <button type="button" class="linkbtn" id="ki-key-weg">Schlüssel von diesem Gerät löschen</button></p>`}
    </section>`;
  }
  function wireKi(v, p, overlays, speichern) {
    $('#ki-key-save', v)?.addEventListener('click', () => { const k = $('#ki-key', v).value.trim(); if (!k.startsWith('sk-ant-')) { $('#ki-key', v).focus(); return; } try { localStorage.setItem('spd-claude-key', k); localStorage.setItem('spd-claude-model', $('#ki-model', v).value); } catch (e) { /* ohne Speicher */ } projekt(v, p._id); });
    $('#ki-key-weg', v)?.addEventListener('click', () => { try { localStorage.removeItem('spd-claude-key'); } catch (e) { /* egal */ } projekt(v, p._id); });
    $('#ki-neu', v)?.addEventListener('click', async () => { if (confirm('Unterhaltung mit dem Assistenten leeren?')) { await speichern({ ki: '[]' }); projekt(v, p._id); } });
    const chatEl = $('#ki-chat', v); if (chatEl) chatEl.scrollTop = chatEl.scrollHeight;
    // Mikrofon (Web Speech API – Chrome, Android, iPhone ab iOS 14.5)
    const mic = $('#ki-mic', v); const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (mic && !SR) mic.hidden = true;
    let rec = null;
    mic?.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'de-DE'; rec.interimResults = true; rec.continuous = true; const start = $('#ki-in', v).value;
      rec.onresult = e => { let t = ''; for (const r of e.results) t += r[0].transcript; $('#ki-in', v).value = (start ? start + ' ' : '') + t; };
      rec.onend = () => { rec = null; mic.textContent = '🎤'; mic.classList.remove('aktiv'); };
      rec.onerror = () => { rec = null; mic.textContent = '🎤'; mic.classList.remove('aktiv'); $('#ki-msg', v).textContent = 'Mikrofon nicht verfügbar – bitte tippen.'; };
      rec.start(); mic.textContent = '⏹'; mic.classList.add('aktiv');
    });
    $('#ki-form', v)?.addEventListener('submit', async e => {
      e.preventDefault(); const text = $('#ki-in', v).value.trim(); if (!text) return;
      const chat = parseJson(p.ki, []); chat.push({ rolle: 'du', text, zeit: Date.now() });
      const btn = e.target.querySelector('[type=submit]'); busy(btn, true); $('#ki-msg', v).textContent = 'Claude denkt nach …';
      try {
        const messages = chat.slice(-16).map(m => ({ role: m.rolle === 'du' ? 'user' : 'assistant', content: m.rolle === 'du' ? m.text : JSON.stringify({ antwort: m.text, ...(m.vorschlag || {}) }) }));
        const out = await claudeFragen(kiKey(), kiModel(), KI_SYSTEM(p, overlays), messages);
        const vorschlag = {}; if (out.skript) vorschlag.skript = String(out.skript); if (out.drehplan) vorschlag.drehplan = String(out.drehplan); if (Array.isArray(out.overlays) && out.overlays.length) vorschlag.overlays = out.overlays.filter(o => overlayTyp(o.typ)).map(o => ({ typ: o.typ, dauer: +o.dauer || overlayTyp(o.typ).dauer, werte: o.werte || {} }));
        chat.push({ rolle: 'ki', text: String(out.antwort || ''), vorschlag: Object.keys(vorschlag).length ? vorschlag : null, zeit: Date.now() });
        await speichern({ ki: JSON.stringify(chat.slice(-40)) }); projekt(v, p._id);
      } catch (err) { chat.pop(); $('#ki-msg', v).textContent = 'Das hat nicht geklappt: ' + errText(err); busy(btn, false); }
    });
    $('#ki-chat', v)?.addEventListener('click', async e => {
      const b = e.target.closest('[data-ki]'); if (!b) return;
      const chat = parseJson(p.ki, []); const i = [...$$('.ki-msg', v)].indexOf(b.closest('.ki-msg')); const m = chat[i]; if (!m?.vorschlag) return;
      busy(b, true);
      if (b.dataset.ki === 'skript') await speichern({ skript: m.vorschlag.skript });
      if (b.dataset.ki === 'drehplan') await speichern({ drehplan: m.vorschlag.drehplan });
      if (b.dataset.ki === 'overlays') { const alle = overlays.length && !confirm('Vorhandene Overlays in der Werkstatt ersetzen? (Abbrechen = anhängen)') ? [...overlays, ...m.vorschlag.overlays] : m.vorschlag.overlays; overlays.splice(0, overlays.length, ...alle); await speichern({ overlays: JSON.stringify(overlays) }); }
      projekt(v, p._id);
    });
  }
  function wireProjekt(v, p, overlays) {
    const speichern = async (patch, hinweis) => { try { const neu = await db.update('FilmProjekte', { ...p, ...patch }); Object.assign(p, neu); if (hinweis) $('#fp-skript-msg', v).textContent = hinweis; } catch (err) { $('#fp-skript-msg', v).textContent = 'Nicht gespeichert: ' + errText(err); } };
    const auto = (sel, feld) => { let t = null; $(sel, v).addEventListener('input', e => { clearTimeout(t); $('#fp-skript-msg', v).textContent = 'wird gespeichert …'; t = setTimeout(() => speichern({ [feld]: e.target.value }, 'gespeichert'), 1200); }); };
    auto('#fp-skript', 'skript'); auto('#fp-drehplan', 'drehplan'); auto('#fp-notizen', 'notizen');
    wireKi(v, p, overlays, speichern);
    $$('[data-status]', v).forEach(b => b.addEventListener('click', async () => { await speichern({ status: b.dataset.status }); $$('[data-status]', v).forEach(x => x.setAttribute('aria-pressed', String(x === b))); }));
    $('#fp-datum', v).addEventListener('change', e => speichern({ datum: e.target.value }));
    $('#fp-skript-teilen', v).addEventListener('click', () => shareText(`🎬 ${p.titel}\n\n${$('#fp-skript', v).value}`));
    $('#fp-loeschen', v).addEventListener('click', async () => { if (!confirm('Projekt wirklich löschen? Material und Overlays gehen mit.')) return; try { await db.remove('FilmProjekte', p._id); location.hash = '#filmdreh'; } catch (err) { alert('Nicht gelöscht: ' + errText(err)); } });
    // Werkstatt
    const lesen = () => { const typ = $('#ow-typ', v).value; const werte = {}; $$('[data-feld]', v).forEach(el => { werte[el.dataset.feld] = el.value; }); return { typ, werte, dauer: +$('#ow-dauer', v).value || overlayTyp(typ).dauer }; };
    $('#ow-typ', v).addEventListener('change', () => { const t = overlayTyp($('#ow-typ', v).value); st.neuOverlay = { typ: t.id, werte: { ...t.beispiel }, dauer: t.dauer }; projekt(v, p._id); });
    const vorschau = o => { $('#ow-iframe', v).src = stageUrl(overlayClip(o, 0).q) + '&t=' + Date.now(); };
    $('#ow-vorschau', v).addEventListener('click', () => { st.neuOverlay = lesen(); vorschau(st.neuOverlay); });
    $('#ow-add', v).addEventListener('click', async () => { const o = lesen(); st.neuOverlay = o; overlays.push(o); await speichern({ overlays: JSON.stringify(overlays) }); projekt(v, p._id); });
    $('#ow-liste', v).addEventListener('click', async e => {
      const b = e.target.closest('[data-ow]'); if (!b) return; const i = +b.closest('.ow-item').dataset.i;
      if (b.dataset.ow === 'zeigen') { vorschau(overlays[i]); $('.ow-preview', v).scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      if (b.dataset.ow === 'weg') overlays.splice(i, 1);
      if (b.dataset.ow === 'hoch' && i > 0) [overlays[i - 1], overlays[i]] = [overlays[i], overlays[i - 1]];
      if (b.dataset.ow === 'runter' && i < overlays.length - 1) [overlays[i + 1], overlays[i]] = [overlays[i], overlays[i + 1]];
      await speichern({ overlays: JSON.stringify(overlays) }); projekt(v, p._id);
    });
    $('#ow-rendern', v)?.addEventListener('click', async e => {
      const b = e.currentTarget; busy(b, true);
      try {
        if (!st.konto) throw new Error('nicht echt angemeldet');
        const manifest = { titel: `Overlays ${p.titel}`, hinweis: 'Text-Overlays auf Grün (CapCut: Chroma-Key) – Reihenfolge wie in der Werkstatt.', nurGruen: !$('#ow-alpha', v).checked, drehplan: [p.skript, p.drehplan].filter(Boolean).join('\n\n— DREHPLAN —\n'), clips: overlays.map(overlayClip) };
        await st.konto.db.insert('Auftraege', { typ: 'overlays', status: 'wartet', title: manifest.titel, titel: manifest.titel, projektId: p._id, sitzungId: '', memberId: st.konto.me.id, von: st.konto.me.name, manifest: JSON.stringify(manifest), benachrichtigt: false, fortschritt: 0, schritt: '' });
        st.auftraege = await st.konto.db.list('Auftraege', { desc: '_createdDate', limit: 50 }).catch(() => st.auftraege);
        projekt(v, p._id); $('#ow-msg', v).textContent = 'Bestellt.'; pollen(v, p._id);
      } catch (err) { $('#ow-msg', v).textContent = 'Nicht bestellt: ' + errText(err); busy(b, false); }
    });
    if (st.auftraege.some(a => a.projektId === p._id && laeuft(a))) pollen(v, p._id);
    // Material
    $('#fm-link-add', v).addEventListener('click', async e => {
      const b = e.currentTarget; const titel = $('#fm-link-titel', v).value.trim(), url = $('#fm-link-url', v).value.trim();
      if (!/^https?:\/\//.test(url)) { $('#fm-msg', v).textContent = 'Bitte eine Adresse mit https:// eintragen.'; return; }
      busy(b, true);
      try { await db.insert('FilmMaterial', { title: titel || url, projektId: p._id, art: 'link', titel: titel || url, url, name: '', mime: '', groesse: 0, status: 'fertig', von: me().name, memberId: me().id }); st.material = await db.list('FilmMaterial', { desc: '_createdDate', limit: 300 }); projekt(v, p._id); }
      catch (err) { $('#fm-msg', v).textContent = 'Nicht abgelegt: ' + errText(err); busy(b, false); }
    });
    $('#fm-datei', v).addEventListener('change', async e => {
      const files = [...e.target.files]; if (!files.length) return;
      const balken = $('#fm-balken', v); balken.hidden = false;
      for (const f of files) {
        if (f.size > MAX_UPLOAD) { $('#fm-msg', v).textContent = `${f.name}: zu groß (${mb(f.size)}, bis ${Math.round(MAX_UPLOAD / 1048576)} MB).`; continue; }
        try {
          const buf = new Uint8Array(await f.arrayBuffer()); const teile = Math.max(1, Math.ceil(buf.length / TEIL_BYTES));
          const m = await db.insert('FilmMaterial', { title: f.name, projektId: p._id, art: 'datei', titel: f.name.replace(/\.[^.]+$/, ''), url: '', name: f.name, mime: f.type || 'application/octet-stream', groesse: f.size, teile, status: DEMO ? 'fertig' : 'wartet', von: me().name, memberId: me().id });
          for (let i = 0; i < teile; i++) {
            $('#fm-msg', v).textContent = `${f.name}: Teil ${i + 1} von ${teile} …`; $('span', balken).style.width = Math.round(100 * (i + 1) / teile) + '%';
            if (!DEMO) await db.insert('FilmTeile', { title: `${m._id} ${i}`, materialId: m._id, nr: i, daten: toB64(buf.subarray(i * TEIL_BYTES, (i + 1) * TEIL_BYTES)) });
          }
          $('#fm-msg', v).textContent = DEMO ? `${f.name}: im Demo nur gemerkt.` : `${f.name}: hochgeladen – der Push-Dienst legt die Datei innerhalb von 5 Minuten bei Wix ab.`;
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

  async function sec(v) {
    clearInterval(st.timer);
    await laden();
    const sub = location.hash.split('/')[1] || '';
    if (sub.startsWith('p-')) return projekt(v, sub.slice(2));
    uebersicht(v);
  }
  return { sec };
}
