// Weitere Bereiche des Mitgliederbereichs: Versammlung (Tagesordnung, Anträge, Abstimmung per Handy, Protokoll),
// Wahlkampf (Straßenliste, Plakat-Standorte mit Foto), Wissen (Suche über alles) und Jahresplan (Planungen aus Vorlagen mit Aufgaben).
// Alles nach demselben Muster: Liste → Karte → Blatt; große Knöpfe, wenige Worte.
import { GRUNDWISSEN, STUFEN, ERSTE_SCHRITTE, themaById } from './lib/grundwissen.mjs';
export function makeBereiche(ctx) {
  const { db, DEMO, store, esc, $, $$, msg, busy, route, sectionHead, fmtDate, fmtShort, fmtWhen, todayIso, nl2br, errText, ICON, SHARE_ICON, shareBtn, appLink, blatt, blattZu, SPD, ORTE } = ctx;
  const me = () => ctx.me, people = () => ctx.people, settings = () => ctx.settings;
  const nameOf = id => people().find(p => p.memberId === id)?.name || '';
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2)).slice(0, 8);
  const parseJson = (s, d) => { try { return JSON.parse(s || '') ?? d; } catch (e) { return d; } };
  const inDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const personenSelect = (cur, name = 'wer') => `<select name="${name}"><option value="">– niemand –</option>${people().map(p => `<option value="${esc(p.memberId)}" ${p.memberId === cur ? 'selected' : ''}>${esc(p.name)}${p.memberId === me().id ? ' (du)' : ''}</option>`).join('')}</select>`;

  // ======================= Versammlung =======================
  const V_STATUS = { geplant: 'geplant', laeuft: 'läuft gerade', beendet: 'beendet' };
  async function versammlung(v) {
    const sub = location.hash.split('/')[1] || '';
    const list = (await db.list('Versammlungen', { desc: 'datum', limit: 100 }).catch(() => [])).map(x => ({ ...x, tops: parseJson(x.tops, []), antraege: parseJson(x.antraege, []), anwesend: x.anwesend || [] }));
    const today = todayIso();
    const kommend = list.filter(x => x.status !== 'beendet' && (x.datum || '') >= today.slice(0, 10)).sort((a, b) => a.datum.localeCompare(b.datum));
    const laeuft = list.filter(x => x.status === 'laeuft');
    const vergangen = list.filter(x => !kommend.includes(x) && !laeuft.includes(x));
    const kann = me().can('versammlung');
    if (sub.startsWith('v-')) { const x = list.find(y => y._id === sub.slice(2)); if (x) return versammlungDetail(v, x, kann); }
    const karte = x => `<a class="rz-bereich${x.status === 'laeuft' ? ' rat' : ''}" href="#versammlung/v-${esc(x._id)}"><span class="rz-kachel">${esc(x.datum ? x.datum.slice(8, 10) + '.' + x.datum.slice(5, 7) + '.' : '?')}</span><span class="rz-txt"><b>${esc(x.titel)}</b><small>${esc(fmtDate(x.datum))}${x.zeit ? ' · ' + esc(x.zeit) + ' Uhr' : ''}${x.ort ? ' · ' + esc(x.ort) : ''} · ${esc(V_STATUS[x.status] || x.status)}${x.antraege.length ? ` · ${x.antraege.length} Antr${x.antraege.length === 1 ? 'ag' : 'äge'}` : ''}</small></span>${ICON.chev}</a>`;
    v.innerHTML = `${sectionHead('Versammlungen', 'Tagesordnung, Anträge, Abstimmung per Handy, Protokoll')}
    ${kann ? `<div class="mb-create"><details class="mb-details" id="vs-new"><summary>Versammlung anlegen</summary>${versammlungForm(null)}</details></div>` : ''}
    ${laeuft.length ? `<div class="rz-block"><h4 class="rz-h">Jetzt <span>Abstimmen mit dem Handy</span></h4>${laeuft.map(karte).join('')}</div>` : ''}
    <div class="rz-block"><h4 class="rz-h">Nächste Versammlungen</h4>${kommend.filter(x => x.status !== 'laeuft').map(karte).join('') || '<div class="rz-leer">Keine Versammlung geplant.</div>'}</div>
    ${vergangen.length ? `<div class="rz-block"><h4 class="rz-h">Vergangene <span>mit Protokoll und Ergebnissen</span></h4>${vergangen.slice(0, 12).map(karte).join('')}</div>` : ''}`;
    wireVersammlungForm(v, null);
  }
  function versammlungForm(x) {
    const antraege = x?.antraege?.length ? x.antraege : [];
    return `<form class="form mb-form" id="f-vs" data-id="${esc(x?._id || '')}" novalidate>
      <div class="field"><label for="vs-titel">Titel</label><input id="vs-titel" name="titel" type="text" required value="${esc(x?.titel || '')}" placeholder="z. B. Mitgliederversammlung 2026"></div>
      <div class="mb-3">
        <div class="field"><label for="vs-datum">Datum</label><input id="vs-datum" name="datum" type="date" required value="${esc(x?.datum || '')}"></div>
        <div class="field"><label for="vs-zeit">Uhrzeit</label><input id="vs-zeit" name="zeit" type="time" value="${esc(x?.zeit || '19:00')}"></div>
        <div class="field"><label for="vs-ort">Ort</label><input id="vs-ort" name="ort" type="text" value="${esc(x?.ort || 'Roter Bahnhof, Am Bahnhof 1t')}"></div>
      </div>
      <div class="field"><label for="vs-tops">Tagesordnung – ein Punkt je Zeile</label><textarea id="vs-tops" name="tops" rows="6" placeholder="Begrüßung&#10;Bericht des Vorstands&#10;Kassenbericht&#10;Entlastung&#10;Anträge&#10;Verschiedenes">${esc((x?.tops || []).join('\n'))}</textarea></div>
      <div class="field"><label>Anträge (zur Abstimmung)</label><div id="vs-antraege" class="rows">${antraege.map(a => antragRow(a)).join('')}</div><button type="button" class="linkbtn" id="vs-add">+ Antrag hinzufügen</button></div>
      <p class="note" hidden></p>
      <div class="mb-actions"><button class="btn btn-rot" type="submit">${x ? 'Speichern' : 'Versammlung anlegen'}</button>${x ? '<button class="btn btn-line" type="button" id="vs-cancel">Abbrechen</button>' : ''}</div>
    </form>`;
  }
  const antragRow = a => `<div class="row vs-antrag" data-id="${esc(a?.id || uid())}"><input type="text" placeholder="Antrag – Titel" value="${esc(a?.titel || '')}" aria-label="Antragstitel"><textarea rows="2" placeholder="Wortlaut des Antrags" aria-label="Antragstext">${esc(a?.text || '')}</textarea><button type="button" class="linkbtn" data-del-antrag>entfernen</button></div>`;
  function wireVersammlungForm(v, x) {
    const f = $('#f-vs', v); if (!f) return;
    $('#vs-add', f).addEventListener('click', () => { const d = document.createElement('div'); d.innerHTML = antragRow(null); $('#vs-antraege', f).appendChild(d.firstElementChild); });
    f.addEventListener('click', e => { const b = e.target.closest('[data-del-antrag]'); if (b) b.closest('.vs-antrag').remove(); });
    $('#vs-cancel', f)?.addEventListener('click', () => route());
    f.addEventListener('submit', async e => {
      e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; }
      const btn = f.querySelector('[type=submit]'); busy(btn, true);
      const alt = x?.antraege || [];
      const antraege = $$('.vs-antrag', f).map(r => { const id = r.dataset.id; const a = alt.find(y => y.id === id) || { id, status: 'offen' }; return { ...a, titel: r.children[0].value.trim(), text: r.children[1].value.trim() }; }).filter(a => a.titel);
      const tops = $('#vs-tops', f).value.split('\n').map(t => t.trim()).filter(Boolean);
      const data = { titel: $('#vs-titel', f).value.trim(), title: $('#vs-titel', f).value.trim(), datum: $('#vs-datum', f).value, zeit: $('#vs-zeit', f).value, ort: $('#vs-ort', f).value.trim(), tops: JSON.stringify(tops), antraege: JSON.stringify(antraege), status: x?.status || 'geplant', anwesend: x?.anwesend || [], protokoll: x?.protokoll || '', von: me().name };
      try {
        if (x) await db.update('Versammlungen', { ...x, ...data }); else { const neu = await db.insert('Versammlungen', data); location.hash = '#versammlung/v-' + (neu?._id || ''); }
        route();
      } catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
    });
  }
  async function versammlungDetail(v, x, kann, bearbeiten = false) {
    const stimmen = await db.list('Abstimmungen', { eq: { versammlungId: x._id }, limit: 1000 }).catch(() => []);
    const da = x.anwesend.includes(me().id);
    const save = async (aenderung) => { const raw = { ...x, tops: JSON.stringify(x.tops), antraege: JSON.stringify(x.antraege), ...aenderung }; if (aenderung.antraege && typeof aenderung.antraege !== 'string') raw.antraege = JSON.stringify(aenderung.antraege); await db.update('Versammlungen', raw); };
    const ergebnis = a => { const s = stimmen.filter(st => st.antragId === a.id); return { ja: s.filter(st => st.stimme === 'ja').length, nein: s.filter(st => st.stimme === 'nein').length, enth: s.filter(st => st.stimme === 'enthaltung').length, n: s.length }; };
    const meine = a => stimmen.find(st => st.antragId === a.id && st.memberId === me().id)?.stimme;
    v.innerHTML = `<p class="small rz-zurueck"><a href="#versammlung">← Versammlungen</a></p>
    ${sectionHead(esc(x.titel), `${esc(fmtDate(x.datum))}${x.zeit ? ' · ' + esc(x.zeit) + ' Uhr' : ''}${x.ort ? ' · ' + esc(x.ort) : ''} · ${esc(V_STATUS[x.status] || x.status)}`)}
    ${bearbeiten ? `<div class="mb-create">${versammlungForm(x)}</div>` : `
    <div class="mb-actions vs-leiste">
      ${x.status === 'laeuft' && !da ? `<button class="btn btn-rot" type="button" data-vs="dabei">✋ Ich bin da</button>` : ''}
      ${x.status === 'laeuft' && da ? `<span class="badge badge-mit">Du bist als anwesend eingetragen</span>` : ''}
      ${kann && x.status === 'geplant' ? `<button class="btn btn-rot" type="button" data-vs="start">Versammlung starten</button>` : ''}
      ${kann && x.status === 'laeuft' ? `<button class="btn btn-schwarz" type="button" data-vs="ende">Versammlung beenden</button>` : ''}
      ${kann ? `<button class="btn btn-line btn-sm" type="button" data-vs="bearbeiten">Bearbeiten</button>` : ''}
      ${shareBtn(`🗳️ ${x.titel}\n${fmtDate(x.datum)}${x.zeit ? ', ' + x.zeit + ' Uhr' : ''}${x.ort ? ' · ' + x.ort : ''}\nTagesordnung und Anträge: ${appLink('#versammlung/v-' + x._id)}`)}
    </div>
    <div class="mb-grid">
      <div>
        <div class="mb-card"><h3>Tagesordnung</h3>${x.tops.length ? `<ol class="vs-tops">${x.tops.map(t => `<li>${esc(t)}</li>`).join('')}</ol>` : '<p class="small muted">Noch keine Punkte.</p>'}</div>
        <div class="mb-card" style="margin-top:20px"><h3>Anträge</h3>
          ${x.antraege.length ? x.antraege.map(a => { const r = ergebnis(a), mine = meine(a); return `<article class="vs-antrag-karte" data-antrag="${esc(a.id)}">
            <div class="hl-head"><div><h4>${esc(a.titel)}</h4>${a.text ? `<p class="small">${nl2br(a.text)}</p>` : ''}</div><span class="badge ${a.status === 'angenommen' ? 'badge-mit' : a.status === 'abstimmung' ? 'badge-off' : ''}">${esc({ offen: 'noch nicht abgestimmt', abstimmung: 'Abstimmung läuft', angenommen: 'angenommen', abgelehnt: 'abgelehnt' }[a.status] || a.status)}</span></div>
            ${a.status === 'abstimmung' && x.status === 'laeuft' ? (da ? `<div class="rsvp-btns"><button type="button" class="chip" data-stimme="ja" aria-pressed="${mine === 'ja'}">Ja</button><button type="button" class="chip" data-stimme="nein" aria-pressed="${mine === 'nein'}">Nein</button><button type="button" class="chip" data-stimme="enthaltung" aria-pressed="${mine === 'enthaltung'}">Enthaltung</button></div>${mine ? `<p class="small muted">Deine Stimme: ${esc(mine)}. Du kannst sie ändern, solange die Abstimmung läuft.</p>` : ''}` : '<p class="small muted">Zum Abstimmen zuerst oben „Ich bin da“ antippen.</p>') : ''}
            ${a.status === 'angenommen' || a.status === 'abgelehnt' || (kann && a.status === 'abstimmung') ? `<p class="small vs-ergebnis"><b>${r.ja}</b> Ja · <b>${r.nein}</b> Nein · <b>${r.enth}</b> Enthaltung${a.status === 'abstimmung' ? ` · ${r.n} von ${x.anwesend.length} Anwesenden haben abgestimmt` : ''}</p>` : ''}
            ${kann && x.status === 'laeuft' ? `<div class="mb-actions">${a.status === 'offen' ? `<button class="btn btn-schwarz btn-sm" type="button" data-abst="start">Abstimmung starten</button>` : ''}${a.status === 'abstimmung' ? `<button class="btn btn-rot btn-sm" type="button" data-abst="ende">Abstimmung beenden</button>` : ''}${a.status !== 'offen' && a.status !== 'abstimmung' ? `<button class="linkbtn" type="button" data-abst="neu">noch einmal abstimmen</button>` : ''}</div>` : ''}
            <p class="note" hidden></p>
          </article>`; }).join('') : '<p class="small muted">Keine Anträge.</p>'}
        </div>
      </div>
      <div class="mb-aside">
        <div class="mb-card"><h3>Anwesend <span class="small muted">${x.anwesend.length}</span></h3>${x.anwesend.length ? `<p class="small">${esc(x.anwesend.map(nameOf).filter(Boolean).sort().join(', '))}</p>` : '<p class="small muted">Während der Versammlung tippt jede*r auf „Ich bin da“ – so entsteht die Anwesenheitsliste.</p>'}</div>
        ${x.status === 'beendet' || kann ? `<div class="mb-card" style="margin-top:20px"><h3>Protokoll</h3>${kann ? `<textarea id="vs-protokoll" rows="12" class="vs-protokoll" placeholder="Wird beim Beenden vorbefüllt (Anwesende, Beschlüsse).">${esc(x.protokoll || '')}</textarea><div class="mb-actions"><button class="btn btn-schwarz btn-sm" type="button" data-vs="protokoll">Protokoll speichern</button><button class="btn btn-line btn-sm" type="button" data-vs="drucken">Drucken / PDF</button></div>` : `<div class="small vs-protokoll-text">${x.protokoll ? nl2br(x.protokoll) : '<span class="muted">Noch kein Protokoll.</span>'}</div>`}</div>` : ''}
      </div>
    </div>`}
    <p class="note" id="vs-msg" hidden></p>`;
    if (bearbeiten) { wireVersammlungForm(v, x); return; }
    v.onclick = async e => {
      const b = e.target.closest('[data-vs],[data-stimme],[data-abst]'); if (!b) return;
      const note = $('#vs-msg', v); busy(b, true);
      try {
        if (b.dataset.vs === 'bearbeiten') { versammlungDetail(v, x, kann, true); return; }
        if (b.dataset.vs === 'dabei') { await save({ anwesend: [...new Set([...x.anwesend, me().id])] }); route(); return; }
        if (b.dataset.vs === 'start') { await save({ status: 'laeuft' }); route(); return; }
        if (b.dataset.vs === 'ende') {
          if (!confirm('Versammlung beenden? Laufende Abstimmungen werden geschlossen.')) { busy(b, false); return; }
          const antraege = x.antraege.map(a => a.status === 'abstimmung' ? schliessen(a) : a);
          const prot = x.protokoll || protokollVorlage({ ...x, antraege });
          await save({ status: 'beendet', antraege, protokoll: prot }); route(); return;
        }
        if (b.dataset.vs === 'protokoll') { await save({ protokoll: $('#vs-protokoll', v).value }); msg(note, 'Protokoll gespeichert.', 'ok'); busy(b, false); return; }
        if (b.dataset.vs === 'drucken') { druckProtokoll({ ...x, protokoll: $('#vs-protokoll', v)?.value || x.protokoll }); busy(b, false); return; }
        if (b.dataset.stimme) {
          const a = x.antraege.find(y => y.id === b.closest('[data-antrag]').dataset.antrag);
          const mine = stimmen.find(st => st.antragId === a.id && st.memberId === me().id);
          const data = { versammlungId: x._id, antragId: a.id, memberId: me().id, name: me().name, stimme: b.dataset.stimme, title: `${me().name} – ${a.titel}` };
          if (mine) await db.update('Abstimmungen', { ...mine, ...data }); else await db.insert('Abstimmungen', data);
          route(); return;
        }
        if (b.dataset.abst) {
          const id = b.closest('[data-antrag]').dataset.antrag;
          const antraege = x.antraege.map(a => a.id !== id ? a : b.dataset.abst === 'start' ? { ...a, status: 'abstimmung' } : b.dataset.abst === 'ende' ? schliessen(a) : { ...a, status: 'offen', ergebnis: null });
          if (b.dataset.abst === 'neu') for (const st of stimmen.filter(s => s.antragId === id)) await db.remove('Abstimmungen', st._id).catch(() => {});
          await save({ antraege }); route(); return;
        }
      } catch (err) { msg(note, 'Das hat nicht geklappt: ' + errText(err)); busy(b, false); }
    };
    function schliessen(a) { const r = ergebnis(a); return { ...a, status: r.ja > r.nein ? 'angenommen' : 'abgelehnt', ergebnis: r }; }
  }
  const protokollVorlage = x => `Protokoll: ${x.titel}\n${fmtDate(x.datum)}${x.zeit ? ', ' + x.zeit + ' Uhr' : ''}${x.ort ? ', ' + x.ort : ''}\n\nAnwesend (${x.anwesend.length}): ${x.anwesend.map(nameOf).filter(Boolean).sort().join(', ')}\n\nTagesordnung:\n${x.tops.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nBeschlüsse:\n${x.antraege.map(a => `– ${a.titel}: ${a.status === 'angenommen' ? 'angenommen' : a.status === 'abgelehnt' ? 'abgelehnt' : 'nicht abgestimmt'}${a.ergebnis ? ` (${a.ergebnis.ja} Ja, ${a.ergebnis.nein} Nein, ${a.ergebnis.enth} Enthaltungen)` : ''}`).join('\n') || '– keine'}\n\nProtokollführung: ${me().name}`;
  function druckProtokoll(x) {
    document.getElementById('druck')?.remove();
    const el = document.createElement('div'); el.id = 'druck'; el.className = 'druck';
    el.innerHTML = `<div class="druck-kopf"><b>SPD Ortsverein Soltau</b><span>Am Bahnhof 1t · 29614 Soltau</span></div><h1>Protokoll</h1><h2>${esc(x.titel)}</h2><div class="druck-text">${nl2br(x.protokoll || protokollVorlage(x))}</div>`;
    document.body.appendChild(el); document.body.classList.add('drucken');
    const fertig = () => { el.remove(); document.body.classList.remove('drucken'); window.removeEventListener('afterprint', fertig); };
    window.addEventListener('afterprint', fertig); setTimeout(() => window.print(), 50); setTimeout(fertig, 60000);
  }

  // ======================= Wahlkampf =======================
  const WK_STATUS = [['offen', 'offen'], ['verteilt', 'Flyer verteilt'], ['gespraeche', 'Gespräche geführt']];
  async function wahlkampf(v) {
    const tab = (location.hash.split('/')[1] || '') === 'plakate' ? 'plakate' : 'strassen';
    const kann = me().can('wahlkampf');
    const [strassen, plakate] = await Promise.all([db.list('WkStrassen', { asc: 'strasse', limit: 1000 }).catch(() => []), db.list('WkPlakate', { desc: '_createdDate', limit: 500 }).catch(() => [])]);
    const orte = [...new Set(strassen.map(s => s.ort || 'Kernstadt'))].sort((a, b) => a.localeCompare(b, 'de'));
    const fortschritt = list => { const n = list.length, f = list.filter(s => s.status !== 'offen').length; return n ? Math.round(f / n * 100) : 0; };
    v.innerHTML = `${sectionHead('Wahlkampf', 'Wer war schon wo – Straßen und Plakate auf einen Blick')}
    <div class="mb-tabs termine-ansicht" role="tablist"><a class="chip" href="#wahlkampf" aria-pressed="${tab === 'strassen'}">Straßen</a><a class="chip" href="#wahlkampf/plakate" aria-pressed="${tab === 'plakate'}">Plakate</a><a class="chip" href="#termine/helferlisten">Helferlisten →</a></div>
    ${tab === 'strassen' ? `
      ${kann ? `<div class="mb-create"><details class="mb-details"><summary>Straßen anlegen</summary><form class="form mb-form" id="f-wks" novalidate>
        <div class="field"><label for="wks-ort">Ortsteil</label><input id="wks-ort" type="text" list="orte" required value="Kernstadt"></div>
        <div class="field"><label for="wks-list">Straßen – eine je Zeile</label><textarea id="wks-list" rows="6" required placeholder="Marktstraße&#10;Poststraße&#10;Winsener Straße"></textarea></div>
        <p class="note" hidden></p><div class="mb-actions"><button class="btn btn-rot" type="submit">Anlegen</button></div></form></details></div>` : ''}
      ${strassen.length ? `<div class="wk-summe"><b>${fortschritt(strassen)} %</b> der ${strassen.length} Straßen sind erledigt · ${strassen.filter(s => s.status === 'gespraeche').length} mit Haustürgesprächen</div>
      ${orte.map(o => { const l = strassen.filter(s => (s.ort || 'Kernstadt') === o); return `<section class="wk-ort"><h4 class="rz-h">${esc(o)} <span>${fortschritt(l)} % · ${l.length} Straßen</span></h4><div class="wk-balken"><i style="width:${fortschritt(l)}%"></i></div>
        <div class="wk-liste">${l.map(s => `<div class="wk-strasse ${esc(s.status || 'offen')}" data-id="${esc(s._id)}"><b>${esc(s.strasse)}</b><span class="small muted">${s.status !== 'offen' && s.von ? `${esc(s.von)} · ${esc(fmtShort(s.datum || s._updatedDate))}` : 'noch offen'}</span><div class="wk-btns">${WK_STATUS.filter(([k]) => k !== 'offen').map(([k, l2]) => `<button type="button" class="chip" data-wk="${k}" aria-pressed="${s.status === k || (k === 'verteilt' && s.status === 'gespraeche')}">${l2}</button>`).join('')}${kann ? '<button type="button" class="linkbtn" data-wk-del>löschen</button>' : ''}</div></div>`).join('')}</div></section>`; }).join('')}` : '<div class="rz-leer">Noch keine Straßen eingetragen.</div>'}` : `
      <div class="mb-create"><details class="mb-details"><summary>Plakat-Standort eintragen</summary><form class="form mb-form" id="f-wkp" novalidate>
        <div class="field"><label for="wkp-ort">Standort</label><input id="wkp-ort" type="text" required placeholder="z. B. Winsener Straße / Ecke Poststraße, Laterne"></div>
        <div class="field"><label for="wkp-foto">Foto (optional)</label><input id="wkp-foto" type="file" accept="image/*" capture="environment"></div>
        <div class="field"><label for="wkp-notiz">Notiz</label><input id="wkp-notiz" type="text" placeholder="z. B. Genehmigung Nr. 12, Kabelbinder"></div>
        <p class="note" hidden></p><div class="mb-actions"><button class="btn btn-rot" type="submit">Eintragen (hängt)</button></div></form></details></div>
      <div class="wk-summe"><b>${plakate.filter(p => p.status !== 'abgehaengt').length}</b> Plakate hängen · ${plakate.filter(p => p.status === 'abgehaengt').length} abgehängt</div>
      <div class="wk-plakate">${plakate.map(p => `<article class="wk-plakat ${p.status === 'abgehaengt' ? 'ab' : ''}" data-id="${esc(p._id)}">${p.foto ? `<img src="${esc(p.foto)}" alt="" loading="lazy">` : '<div class="wk-nofoto">kein Foto</div>'}<div class="wk-plakat-txt"><b>${esc(p.standort)}</b><span class="small muted">${esc(p.von || '')} · ${esc(fmtShort(p.datum || p._createdDate))}${p.notiz ? ' · ' + esc(p.notiz) : ''}</span><div class="mb-actions"><button type="button" class="chip" data-wkp="${p.status === 'abgehaengt' ? 'haengt' : 'abgehaengt'}">${p.status === 'abgehaengt' ? 'Hängt wieder' : 'Abgehängt ✓'}</button>${p._owner === me().id || kann ? '<button type="button" class="linkbtn" data-wkp-del>löschen</button>' : ''}</div></div></article>`).join('') || '<div class="rz-leer">Noch kein Plakat eingetragen.</div>'}</div>`}`;
    $('#f-wks', v)?.addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
      const btn = f.querySelector('[type=submit]'); busy(btn, true);
      try { const ort = $('#wks-ort', v).value.trim(); for (const st of $('#wks-list', v).value.split('\n').map(x => x.trim()).filter(Boolean)) await db.insert('WkStrassen', { title: st, ort, strasse: st, status: 'offen', von: '', datum: '' }); route(); }
      catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
    });
    $('#f-wkp', v)?.addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
      const btn = f.querySelector('[type=submit]'); busy(btn, true);
      try {
        const file = $('#wkp-foto', v).files[0]; const foto = file ? await ctx.resizeImage(file, 640, 0.6) : '';
        await db.insert('WkPlakate', { title: $('#wkp-ort', v).value.trim(), standort: $('#wkp-ort', v).value.trim(), status: 'haengt', foto, notiz: $('#wkp-notiz', v).value.trim(), von: me().name, datum: todayIso() }); route();
      } catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
    });
    v.addEventListener('click', async e => {
      const b = e.target.closest('[data-wk],[data-wk-del],[data-wkp],[data-wkp-del]'); if (!b) return; busy(b, true);
      try {
        if (b.dataset.wk) { const s = strassen.find(x => x._id === b.closest('.wk-strasse').dataset.id); const neu = s.status === b.dataset.wk ? (b.dataset.wk === 'gespraeche' ? 'verteilt' : 'offen') : b.dataset.wk; await db.update('WkStrassen', { ...s, status: neu, von: neu === 'offen' ? '' : me().name, datum: neu === 'offen' ? '' : todayIso() }); }
        if (b.dataset.wkDel !== undefined) { if (!confirm('Straße löschen?')) { busy(b, false); return; } await db.remove('WkStrassen', b.closest('.wk-strasse').dataset.id); }
        if (b.dataset.wkp) { const p = plakate.find(x => x._id === b.closest('.wk-plakat').dataset.id); await db.update('WkPlakate', { ...p, status: b.dataset.wkp, von: me().name, datum: todayIso() }); }
        if (b.dataset.wkpDel !== undefined) { if (!confirm('Plakat-Standort löschen?')) { busy(b, false); return; } await db.remove('WkPlakate', b.closest('.wk-plakat').dataset.id); }
        route();
      } catch (err) { busy(b, false); alert('Das hat nicht geklappt: ' + errText(err)); }
    });
  }

  // ======================= Wissen: Suche über alles =======================
  async function wissen(v) {
    const sub = location.hash.split('/')[1] || '';
    if (sub === 'grundwissen') return grundwissen(v);
    if (sub.startsWith('g-')) { const t = themaById(sub.slice(2)); if (t) return grundwissenThema(v, t); }
    const q0 = decodeURIComponent(sub.replace(/^s-/, ''));
    v.innerHTML = `${sectionHead('Suche', 'Dokumente, Sitzungen, Versammlungen, Beiträge, Anträge, Jahresplan, Grundwissen – alles, was du sehen darfst')}
    <form class="form wissen-form" id="f-wissen" novalidate><div class="field"><label for="w-q">Suchbegriff</label><input id="w-q" type="search" value="${esc(q0)}" placeholder="z. B. Haushalt, Radweg, Kita, Satzung" autocomplete="off"></div></form>
    <div class="mb-tabs wissen-chips">${['Protokoll', 'Antrag', 'Beschluss', 'Haushalt', 'Satzung', 'Kita', 'Radweg'].map(w => `<button type="button" class="chip" data-q="${esc(w)}">${esc(w)}</button>`).join('')}</div>
    <div id="w-erg"><p class="small muted">Tippe einen Begriff ein – gesucht wird in allem, was du sehen darfst.</p></div>`;
    const quellen = await ladeQuellen();
    const suchen = () => {
      const q = $('#w-q', v).value.trim().toLowerCase();
      const erg = $('#w-erg', v);
      if (q.length < 2) { erg.innerHTML = '<p class="small muted">Mindestens zwei Zeichen.</p>'; return; }
      const treffer = quellen.filter(x => x.text.toLowerCase().includes(q));
      const gruppen = new Map(); for (const t of treffer) { if (!gruppen.has(t.art)) gruppen.set(t.art, []); gruppen.get(t.art).push(t); }
      erg.innerHTML = treffer.length ? [...gruppen].map(([art, list]) => `<section class="mb-sub wissen-gruppe"><h4 class="doc-cat">${esc(art)} <span class="small muted">${list.length}</span></h4><div class="doc-list">${list.slice(0, 20).map(t => `<article class="doc"><div class="doc-body"><a class="doc-title" href="${esc(t.url)}" ${/^https?:/.test(t.url) ? 'target="_blank" rel="noopener"' : ''}>${esc(t.titel)}</a><p class="small muted">${esc(t.meta || '')}</p><p class="small">${esc(auszug(t.text, q))}</p></div></article>`).join('')}</div></section>`).join('') : `<p class="muted">Nichts gefunden zu „${esc(q)}“.</p>`;
    };
    const auszug = (text, q) => { const i = text.toLowerCase().indexOf(q); const s = Math.max(0, i - 60); return (s > 0 ? '… ' : '') + text.slice(s, s + 180).replace(/\s+/g, ' ') + (text.length > s + 180 ? ' …' : ''); };
    $('#w-q', v).addEventListener('input', suchen);
    $('#f-wissen', v).addEventListener('submit', e => { e.preventDefault(); suchen(); });
    v.addEventListener('click', e => { const b = e.target.closest('[data-q]'); if (b) { $('#w-q', v).value = b.dataset.q; suchen(); } });
    if (q0) suchen(); else setTimeout(() => $('#w-q', v).focus(), 50);
  }
  // ----- Grundwissen: Lernpfad in zehn Schritten (01, 02, 03 … wie die Hilfevideos); der Lesestand bleibt auf dem Gerät -----
  const GW_KEY = 'spd-grundwissen';
  const gwStand = () => { const st = store.get(GW_KEY); return st && typeof st === 'object' ? { gelesen: st.gelesen || [], erledigt: st.erledigt || [] } : { gelesen: [], erledigt: [] }; };
  const gwSet = st => store.set(GW_KEY, st);
  const gwGelesen = () => gwStand().gelesen;
  const gwNaechstes = () => GRUNDWISSEN.find(t => !gwGelesen().includes(t.id));
  const absaetze = text => text.split('\n').map(a => `<p>${esc(a).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')}</p>`).join('');
  function grundwissenStartKarte() {
    const n = gwGelesen().length, next = gwNaechstes();
    if (!next) return '';
    return `<div class="mb-card gw-start"><h3>Grundwissen</h3><p class="small">${n ? `<b>${n} von ${GRUNDWISSEN.length}</b> Themen gelesen – weiter mit ${esc(next.nr)} · ${esc(next.titel)}.` : `Neu im Rat oder einfach neugierig? ${GRUNDWISSEN.length} kurze Schritte: Rat, Fraktion, Sitzung, Haushalt – mit den Stellen im Gesetz.`}</p><a class="btn btn-schwarz btn-sm" href="#wissen/g-${esc(next.id)}">${n ? 'Weiterlesen' : 'Anfangen'}</a></div>`;
  }
  function grundwissen(v) {
    const st = gwStand(), n = st.gelesen.length, next = gwNaechstes();
    const minuten = GRUNDWISSEN.reduce((sum, t) => sum + t.minuten, 0);
    v.innerHTML = `${sectionHead('Grundwissen', `Schritt für Schritt in die Ratsarbeit – ${GRUNDWISSEN.length} Themen, die aufeinander aufbauen`)}
    <div class="gw-stand"><div class="gw-balken" role="progressbar" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="${GRUNDWISSEN.length}"><i style="width:${Math.round(n / GRUNDWISSEN.length * 100)}%"></i></div><b>${n} von ${GRUNDWISSEN.length} gelesen</b>${next ? `<a class="btn btn-rot" href="#wissen/g-${esc(next.id)}">${n ? 'Weiter mit' : 'Anfangen mit'} ${esc(next.nr)} · ${esc(next.titel)}</a>` : '<span class="badge badge-mit">Alles gelesen</span>'}</div>
    <p class="small muted">Jedes Thema dauert nur ein paar Minuten, alle zusammen etwa ${minuten}: kurz erklärt, dazu die Stellen im Gesetz und kostenlose Broschüren zum Nachlesen. Am Ende jedes Themas hakst du es ab – der Stand bleibt auf diesem Gerät.</p>
    ${STUFEN.map(stufe => `<section class="mb-sub help-group"><h4 class="doc-cat">${esc(stufe)}</h4><div class="gw-liste">${GRUNDWISSEN.filter(t => t.stufe === stufe).map(t => `<a class="gw-schritt ${st.gelesen.includes(t.id) ? 'gelesen' : ''}" href="#wissen/g-${esc(t.id)}"><b>${esc(t.nr)}</b><span><span class="gw-titel">${esc(t.titel)}</span><small>${esc(t.kurz)} · ${t.minuten} Min.</small></span><i class="gw-hak" aria-label="${st.gelesen.includes(t.id) ? 'gelesen' : 'noch offen'}"></i></a>`).join('')}</div></section>`).join('')}
    <section class="mb-sub help-group gw-check"><h4 class="doc-cat">Checkliste: deine ersten Wochen im Rat <span class="small muted" id="gw-check-stand">${st.erledigt.length} von ${ERSTE_SCHRITTE.length}</span></h4>
      <div class="gw-checkliste">${ERSTE_SCHRITTE.map((text, i) => `<label class="check"><input type="checkbox" data-check="${i}" ${st.erledigt.includes(i) ? 'checked' : ''}><span>${esc(text)}</span></label>`).join('')}</div></section>
    ${n ? '<p class="small" style="margin-top:20px"><button type="button" class="linkbtn" data-reset>Lesestand zurücksetzen</button></p>' : ''}`;
    v.addEventListener('change', e => {
      const c = e.target.closest('[data-check]'); if (!c) return;
      const cur = gwStand(), i = Number(c.dataset.check);
      cur.erledigt = cur.erledigt.filter(x => x !== i); if (c.checked) cur.erledigt.push(i);
      gwSet(cur); $('#gw-check-stand', v).textContent = `${cur.erledigt.length} von ${ERSTE_SCHRITTE.length}`;
    });
    v.addEventListener('click', e => { if (e.target.closest('[data-reset]') && confirm('Lesestand auf diesem Gerät zurücksetzen?')) { gwSet({ gelesen: [], erledigt: gwStand().erledigt }); route(); } });
  }
  function grundwissenThema(v, t) {
    const i = GRUNDWISSEN.indexOf(t), prev = GRUNDWISSEN[i - 1], next = GRUNDWISSEN[i + 1];
    const done = gwGelesen().includes(t.id);
    v.innerHTML = `<p class="small"><a href="#wissen/grundwissen">← Alle Themen</a></p>
    ${sectionHead(`${esc(t.nr)} · ${esc(t.titel)}`, `${esc(t.stufe)} · Thema ${i + 1} von ${GRUNDWISSEN.length} · ${t.minuten} Min.`)}
    <p class="gw-kurz">${esc(t.kurz)}</p>
    <div class="gw-text">${absaetze(t.text)}</div>
    <section class="gw-quellen"><h4 class="doc-cat">Zum Nachlesen</h4>${t.quellen.map(q => `<a class="gw-quelle" href="${esc(q.url)}" target="_blank" rel="noopener"><span>${esc(q.label)}</span><small>${esc(q.lizenz)}</small></a>`).join('')}</section>
    <div class="mb-actions gw-fertig"><button type="button" class="btn ${done ? 'btn-line' : 'btn-rot'}" data-gelesen>${done ? '✓ Gelesen' : next ? `Gelesen – weiter zu ${esc(next.nr)}` : 'Gelesen – fertig'}</button>${shareBtn(`${t.nr} ${t.titel} – Grundwissen für neue Ratsmitglieder: ${appLink('#wissen/g-' + t.id)}`)}</div>
    <div class="mb-actions help-nav">${prev ? `<a class="btn btn-line btn-sm" href="#wissen/g-${esc(prev.id)}">← ${esc(prev.nr)} ${esc(prev.titel)}</a>` : '<span></span>'}${next ? `<a class="btn btn-line btn-sm" href="#wissen/g-${esc(next.id)}">${esc(next.nr)} ${esc(next.titel)} →</a>` : '<a class="btn btn-line btn-sm" href="#wissen/grundwissen">Zur Übersicht →</a>'}</div>`;
    $('[data-gelesen]', v).addEventListener('click', () => {
      const cur = gwStand(); cur.gelesen = cur.gelesen.filter(x => x !== t.id); if (!done) cur.gelesen.push(t.id); gwSet(cur);
      if (!done && next) { location.hash = '#wissen/g-' + next.id; window.scrollTo(0, 0); } else if (!done) location.hash = '#wissen/grundwissen'; else route();
    });
  }
  async function ladeQuellen() {
    const out = [];
    const sieht = k => me().sees(k);
    const [docs, rat, vers, plan] = await Promise.all([sieht('dokumente') ? db.list('Dokumente', { limit: 500 }).catch(() => []) : [], sieht('rat') ? db.list('Ratsvorbereitung', { limit: 300 }).catch(() => []) : [], sieht('versammlung') ? db.list('Versammlungen', { limit: 200 }).catch(() => []) : [], db.list('Planungen', { limit: 200 }).catch(() => [])]);
    for (const d of docs) out.push({ art: 'Dokumente', titel: d.titel, meta: [d.kategorie, fmtShort(d.datum), d.von].filter(Boolean).join(' · '), text: [d.titel, d.kategorie, d.beschreibung].filter(Boolean).join(' '), url: d.url || '#dokumente' });
    for (const r of rat) out.push({ art: 'Ratsvorbereitung', titel: `${r.gremium || 'Sitzung'} ${fmtShort(r.sitzung)}${r.titel ? ' – ' + r.titel : ''}`, meta: `${(r.tops || []).length} Tagesordnungspunkte`, text: [r.gremium, r.titel, r.hinweis, ...(r.tops || []).map(t => `${t.titel} ${t.position || ''} ${t.einordnung || ''}`)].filter(Boolean).join(' '), url: '#rat' });
    for (const x of vers) { const antraege = parseJson(x.antraege, []); out.push({ art: 'Versammlungen & Beschlüsse', titel: x.titel, meta: `${fmtShort(x.datum)} · ${antraege.length} Anträge`, text: [x.titel, ...parseJson(x.tops, []), ...antraege.map(a => `${a.titel} ${a.text || ''} ${a.status || ''}`), x.protokoll].filter(Boolean).join(' '), url: '#versammlung/v-' + x._id }); }
    for (const n of SPD.news || []) out.push({ art: 'Beiträge (Website)', titel: n.title, meta: [n.cat, fmtShort(n.date)].filter(Boolean).join(' · '), text: [n.title, n.teaser].filter(Boolean).join(' '), url: new URL(`${SPD.base || '.'}/aktuelles/${n.slug}/`, location.href).href });
    for (const p of plan) out.push({ art: 'Jahresplan', titel: p.titel, meta: p.vorlage ? 'Vorlage' : fmtShort(p.datum), text: [p.titel, ...parseJson(p.aufgaben, []).map(a => a.titel)].filter(Boolean).join(' '), url: '#planung/p-' + p._id });
    for (const t of GRUNDWISSEN) out.push({ art: 'Grundwissen', titel: `${t.nr} ${t.titel}`, meta: `${t.stufe} · ${t.minuten} Min.`, text: [t.titel, t.kurz, t.text.replace(/\*\*/g, '')].join(' '), url: '#wissen/g-' + t.id });
    if (ctx.antraegeFuerSuche) { try { for (const a of await ctx.antraegeFuerSuche()) out.push({ art: 'Anträge der Fraktion', titel: a.titel, meta: [a.status, a.gremium, fmtShort(a.sitzung)].filter(Boolean).join(' · '), text: [a.titel, a.beschluss, a.begruendung].filter(Boolean).join(' '), url: '#ratsarbeit/a-' + a._id }); } catch (e) { /* ohne Schlüssel */ } }
    return out;
  }

  // ======================= Jahresplan: Planungen aus Vorlagen =======================
  const VORLAGEN_START = [
    { titel: 'Sommerfest', aufgaben: [['Termin und Ort festlegen', 90], ['Genehmigungen und GEMA klären', 60], ['Getränke und Essen bestellen', 21], ['Helferliste anlegen', 30], ['Einladung / Beitrag auf der Website', 28], ['Plakate und Social Media', 21], ['Musik / Programm', 30], ['Aufbau organisieren', 3], ['Abrechnung', -7]] },
    { titel: 'Mitgliederversammlung', aufgaben: [['Termin festlegen und Raum buchen', 60], ['Einladung mit Tagesordnung verschicken (Frist beachten)', 28], ['Berichte Vorstand und Kasse vorbereiten', 14], ['Kassenprüfung', 14], ['Anträge sammeln', 14], ['Versammlung in der App anlegen', 7], ['Protokoll ablegen', -3]] },
    { titel: 'Neujahrsempfang', aufgaben: [['Termin und Gastredner*in', 90], ['Einladungen an Vereine und Presse', 42], ['Catering', 21], ['Ablauf und Reden', 7], ['Pressemitteilung danach', -2]] },
    { titel: 'Infostand', aufgaben: [['Standgenehmigung beantragen', 21], ['Material bestellen (Flyer, Giveaways)', 14], ['Helferliste anlegen', 14], ['Pavillon und Tisch organisieren', 3]] },
  ];
  async function planung(v) {
    const sub = location.hash.split('/')[1] || '';
    const kann = me().can('planung');
    const all = (await db.list('Planungen', { desc: 'datum', limit: 300 }).catch(() => [])).map(p => ({ ...p, aufgaben: parseJson(p.aufgaben, []) }));
    const vorlagen = all.filter(p => p.vorlage), plaene = all.filter(p => !p.vorlage).sort((a, b) => (a.datum || '').localeCompare(b.datum || ''));
    const today = todayIso();
    if (sub.startsWith('p-')) { const p = all.find(x => x._id === sub.slice(2)); if (p) return planungDetail(v, p, kann); }
    const stand = p => { const n = p.aufgaben.length, f = p.aufgaben.filter(a => a.erledigt).length; return `${f} von ${n} erledigt`; };
    const faellig = p => p.aufgaben.filter(a => !a.erledigt && a.faellig && a.faellig < today).length;
    const karte = p => `<a class="rz-bereich" href="#planung/p-${esc(p._id)}"><span class="rz-kachel">${p.datum ? esc(p.datum.slice(8, 10) + '.' + p.datum.slice(5, 7) + '.') : '–'}</span><span class="rz-txt"><b>${esc(p.titel)}</b><small>${p.datum ? esc(fmtDate(p.datum)) + ' · ' : ''}${stand(p)}${faellig(p) ? ` · <span class="spaet">${faellig(p)} überfällig</span>` : ''}</small></span>${ICON.chev}</a>`;
    const meine = plaene.flatMap(p => p.aufgaben.filter(a => a.wer === me().id && !a.erledigt).map(a => ({ ...a, plan: p })));
    v.innerHTML = `${sectionHead('Jahresplan', 'Sommerfest, Versammlung, Infostand – aus Vorlagen mit fertigen Aufgabenpaketen')}
    ${kann ? `<div class="mb-create"><details class="mb-details" id="pl-new"><summary>Planung anlegen</summary>
      <form class="form mb-form" id="f-plan" novalidate>
        <div class="mb-2"><div class="field"><label for="pl-vorlage">Aus Vorlage</label><select id="pl-vorlage"><option value="">– leer beginnen –</option>${[...vorlagen.map(x => ({ id: x._id, titel: x.titel })), ...VORLAGEN_START.filter(s => !vorlagen.some(x => x.titel === s.titel)).map(s => ({ id: 'start:' + s.titel, titel: s.titel + ' (Standard)' }))].map(o => `<option value="${esc(o.id)}">${esc(o.titel)}</option>`).join('')}</select></div>
        <div class="field"><label for="pl-datum">Datum der Veranstaltung</label><input id="pl-datum" type="date" required></div></div>
        <div class="field"><label for="pl-titel">Titel</label><input id="pl-titel" type="text" required placeholder="z. B. Sommerfest 2027"></div>
        <p class="note" hidden></p><div class="mb-actions"><button class="btn btn-rot" type="submit">Planung anlegen</button></div>
      </form></details></div>` : ''}
    ${meine.length ? `<div class="rz-block"><h4 class="rz-h">Meine Aufgaben <span>${meine.length} offen</span></h4><div class="rz-liste">${meine.sort((a, b) => (a.faellig || '9').localeCompare(b.faellig || '9')).map(a => `<a class="rz-zeile" href="#planung/p-${esc(a.plan._id)}" style="text-decoration:none"><span class="rz-hak" style="background:#fff"></span><span class="rz-t"><b>${esc(a.titel)}</b><small class="${a.faellig && a.faellig < today ? 'spaet' : ''}"><span class="rz-tag">${esc(a.plan.titel)}</span>${a.faellig ? 'bis ' + esc(fmtShort(a.faellig)) : ''}</small></span></a>`).join('')}</div></div>` : ''}
    <div class="rz-block"><h4 class="rz-h">Planungen</h4>${plaene.filter(p => !p.datum || p.datum >= inDays(today, -30)).map(karte).join('') || '<div class="rz-leer">Noch nichts geplant.</div>'}</div>
    ${kann ? `<div class="rz-block"><h4 class="rz-h">Vorlagen <span>Aufgabenpakete, jedes Jahr neu nutzbar</span></h4>${[...vorlagen.map(x => `<a class="rz-dok" href="#planung/p-${esc(x._id)}"><span class="rz-ico">${ICON.list}</span><span class="rz-txt"><b>${esc(x.titel)}</b><small>${x.aufgaben.length} Aufgaben</small></span></a>`), ...VORLAGEN_START.filter(s => !vorlagen.some(x => x.titel === s.titel)).map(s => `<div class="rz-dok"><span class="rz-ico">${ICON.list}</span><span class="rz-txt"><b>${esc(s.titel)}</b><small>${s.aufgaben.length} Aufgaben · Standard-Vorlage</small></span></div>`)].join('')}</div>` : ''}
    ${plaene.some(p => p.datum && p.datum < inDays(today, -30)) ? `<details class="mb-details"><summary>Vergangene Planungen</summary>${plaene.filter(p => p.datum && p.datum < inDays(today, -30)).reverse().map(karte).join('')}</details>` : ''}`;
    $('#f-plan', v)?.addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
      const btn = f.querySelector('[type=submit]'); busy(btn, true);
      const datum = $('#pl-datum', v).value, sel = $('#pl-vorlage', v).value;
      let aufgaben = [];
      if (sel.startsWith('start:')) aufgaben = (VORLAGEN_START.find(s => s.titel === sel.slice(6))?.aufgaben || []).map(([t, tage]) => ({ id: uid(), titel: t, tage, faellig: inDays(datum, -tage), wer: '', werName: '', erledigt: false }));
      else if (sel) aufgaben = (vorlagen.find(x => x._id === sel)?.aufgaben || []).map(a => ({ ...a, id: uid(), faellig: inDays(datum, -(a.tage || 0)), wer: '', werName: '', erledigt: false }));
      try { const neu = await db.insert('Planungen', { titel: $('#pl-titel', v).value.trim(), title: $('#pl-titel', v).value.trim(), datum, vorlage: false, aufgaben: JSON.stringify(aufgaben), von: me().name, vonId: me().id }); location.hash = '#planung/p-' + (neu?._id || ''); route(); }
      catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
    });
  }
  async function planungDetail(v, p, kann) {
    const today = todayIso();
    const save = async aufgaben => db.update('Planungen', { ...p, aufgaben: JSON.stringify(aufgaben) });
    const aufgaben = [...p.aufgaben].sort((a, b) => (a.faellig || '9').localeCompare(b.faellig || '9'));
    v.innerHTML = `<p class="small rz-zurueck"><a href="#planung">← Jahresplan</a></p>
    ${sectionHead(esc(p.titel), p.vorlage ? 'Vorlage – Aufgaben mit „Tage vorher“' : `${esc(fmtDate(p.datum))} · ${p.aufgaben.filter(a => a.erledigt).length} von ${p.aufgaben.length} erledigt`)}
    <div class="rz-liste">${aufgaben.map(a => `<div class="rz-zeile${a.erledigt ? ' erl' : ''}" data-id="${esc(a.id)}"><button class="rz-hak" type="button" data-hak ${p.vorlage ? 'disabled' : ''} aria-label="Erledigt">${a.erledigt ? ICON.check : ''}</button><span class="rz-t"><b>${esc(a.titel)}</b><small class="${!a.erledigt && a.faellig && a.faellig < today ? 'spaet' : ''}">${p.vorlage ? `${a.tage} Tage vorher` : `${a.faellig ? 'bis ' + esc(fmtShort(a.faellig)) : ''}${a.werName ? ' · ' + esc(a.werName) : ' · <i>niemand zuständig</i>'}${!a.erledigt && a.faellig && a.faellig < today ? ' – überfällig' : ''}`}</small></span>${kann && !p.vorlage ? `<span class="pl-wer">${personenSelect(a.wer)}</span>` : ''}${kann ? `<button type="button" class="linkbtn" data-del>×</button>` : ''}</div>`).join('') || '<div class="rz-leer">Noch keine Aufgaben.</div>'}</div>
    ${kann ? `<form class="form mb-form pl-add" id="f-pladd" novalidate><div class="mb-2"><div class="field"><label for="pa-titel">Neue Aufgabe</label><input id="pa-titel" type="text" required placeholder="Was ist zu tun?"></div><div class="field"><label for="pa-tage">${p.vorlage ? 'Tage vorher' : 'Fällig am'}</label>${p.vorlage ? '<input id="pa-tage" type="number" value="14">' : `<input id="pa-tage" type="date" value="${esc(p.datum || today)}">`}</div></div><div class="mb-actions"><button class="btn btn-schwarz btn-sm" type="submit">Hinzufügen</button></div></form>
    <div class="mb-actions" style="margin-top:20px">${!p.vorlage ? `<button class="btn btn-line btn-sm" type="button" id="pl-vorlage-speichern">Als Vorlage speichern</button>` : ''}${shareBtn(`📋 ${p.titel}${p.datum ? ' – ' + fmtDate(p.datum) : ''}\n${p.aufgaben.filter(a => !a.erledigt).length} offene Aufgaben\nIn der App: ${appLink('#planung/p-' + p._id)}`)}<button class="linkbtn" type="button" id="pl-del">Löschen</button></div>` : ''}
    <p class="note" id="pl-msg" hidden></p>`;
    v.onclick = async e => {
      const b = e.target.closest('[data-hak],[data-del],#pl-vorlage-speichern,#pl-del'); if (!b) return;
      const note = $('#pl-msg', v); busy(b, true);
      try {
        if (b.dataset.hak !== undefined) { const id = b.closest('.rz-zeile').dataset.id; const a = p.aufgaben.find(x => x.id === id); if (a.wer && a.wer !== me().id && !kann) { msg(note, `Diese Aufgabe gehört ${a.werName}.`); busy(b, false); return; } await save(p.aufgaben.map(x => x.id === id ? { ...x, erledigt: !x.erledigt, erledigtVon: !x.erledigt ? me().name : '' } : x)); route(); return; }
        if (b.dataset.del !== undefined) { const id = b.closest('.rz-zeile').dataset.id; await save(p.aufgaben.filter(x => x.id !== id)); route(); return; }
        if (b.id === 'pl-vorlage-speichern') { await db.insert('Planungen', { titel: p.titel.replace(/\s*\d{4}\s*$/, ''), title: p.titel, datum: '', vorlage: true, aufgaben: JSON.stringify(p.aufgaben.map(a => ({ id: uid(), titel: a.titel, tage: p.datum && a.faellig ? Math.round((new Date(p.datum) - new Date(a.faellig)) / 864e5) : (a.tage || 14) }))), von: me().name, vonId: me().id }); msg(note, 'Als Vorlage gespeichert – im Jahresplan unter „Vorlagen“.', 'ok'); busy(b, false); return; }
        if (b.id === 'pl-del') { if (!confirm('Planung wirklich löschen?')) { busy(b, false); return; } await db.remove('Planungen', p._id); location.hash = '#planung'; route(); return; }
      } catch (err) { msg(note, 'Das hat nicht geklappt: ' + errText(err)); busy(b, false); }
    };
    v.addEventListener('change', async e => {
      const sel = e.target.closest('.pl-wer select'); if (!sel) return;
      const id = sel.closest('.rz-zeile').dataset.id; const person = people().find(x => x.memberId === sel.value);
      try { await save(p.aufgaben.map(x => x.id === id ? { ...x, wer: sel.value, werName: person?.name || '' } : x)); msg($('#pl-msg', v), person ? `${person.name} ist zuständig.` : 'Zuständigkeit entfernt.', 'ok'); } catch (err) { msg($('#pl-msg', v), errText(err)); }
    });
    $('#f-pladd', v)?.addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
      const t = $('#pa-titel', v).value.trim(), val = $('#pa-tage', v).value;
      try { await save([...p.aufgaben, p.vorlage ? { id: uid(), titel: t, tage: +val || 0 } : { id: uid(), titel: t, faellig: val, wer: '', werName: '', erledigt: false }]); route(); } catch (err) { msg($('#pl-msg', v), errText(err)); }
    });
  }
  // Startseiten-Karte: meine Aufgaben aus dem Jahresplan
  async function startKarte() {
    const all = (await db.list('Planungen', { limit: 200 }).catch(() => [])).filter(p => !p.vorlage).map(p => ({ ...p, aufgaben: parseJson(p.aufgaben, []) }));
    const meine = all.flatMap(p => p.aufgaben.filter(a => a.wer === me().id && !a.erledigt).map(a => ({ ...a, plan: p }))).sort((a, b) => (a.faellig || '9').localeCompare(b.faellig || '9'));
    if (!meine.length) return '';
    return `<div class="mb-card"><h3>Jahresplan</h3><p class="small"><b>${meine.length}</b> Aufgabe${meine.length === 1 ? '' : 'n'} für dich</p>${meine.slice(0, 3).map(a => `<a class="start-ev" href="#planung/p-${esc(a.plan._id)}">📋 ${esc(a.titel)} <span class="small muted">${esc(a.plan.titel)}${a.faellig ? ' · bis ' + esc(fmtShort(a.faellig)) : ''}</span></a>`).join('')}<a class="btn btn-schwarz btn-sm" href="#planung">Zum Jahresplan</a></div>`;
  }
  // ======================= Ideen: kurz und knapp, von jedem Mitglied =======================
  const IDEE_STATUS = { neu: 'neu', aufgegriffen: 'wird geprüft', antrag: 'wird Antrag', umgesetzt: 'umgesetzt', abgelehnt: 'nicht weiterverfolgt' };
  async function ideen(v) {
    const list = await db.list('Ideen', { desc: '_createdDate', limit: 200 }).catch(() => []);
    const kann = me().can('rat') || me().can('verwaltung') || ctx.inFraktion();
    v.innerHTML = `${sectionHead('Ideen', 'Kurz aufschreiben, was Soltau besser machen würde – die Fraktion schaut drauf')}
    <form class="form mb-form mb-card idee-form" id="f-idee" novalidate>
      <div class="field"><label for="id-titel">Meine Idee in einem Satz</label><input id="id-titel" type="text" required maxlength="120" placeholder="z. B. Trinkwasserspender auf dem Marktplatz"></div>
      <div class="field"><label for="id-text">Kurz dazu (optional)</label><textarea id="id-text" rows="2" maxlength="500" placeholder="Warum? Wo genau? Zwei Sätze reichen."></textarea></div>
      <p class="note" hidden></p>
      <div class="mb-actions"><button class="btn btn-rot" type="submit">Idee einreichen</button></div>
    </form>
    <div class="idee-liste">${list.map(i => { const likes = i.likes || []; const mag = likes.includes(me().id); return `<article class="idee" data-id="${esc(i._id)}">
      <button type="button" class="idee-like ${mag ? 'an' : ''}" data-like aria-label="Gute Idee">👍<b>${likes.length}</b></button>
      <div class="idee-body"><b>${esc(i.titel)}</b>${i.text ? `<p class="small">${nl2br(i.text)}</p>` : ''}<p class="small muted">${esc(i.vonName || '–')} · ${esc(fmtShort(i._createdDate))} · <span class="badge ${i.status === 'umgesetzt' || i.status === 'antrag' ? 'badge-mit' : ''}">${esc(IDEE_STATUS[i.status] || i.status || 'neu')}</span></p>${i.antwort ? `<p class="small idee-antwort"><b>Rückmeldung:</b> ${nl2br(i.antwort)}</p>` : ''}
        ${kann ? `<details class="idee-tools"><summary>Bearbeiten</summary><div class="mb-2"><label class="vg-feld">Stand <select data-idee-status>${Object.entries(IDEE_STATUS).map(([k, l]) => `<option value="${k}" ${(i.status || 'neu') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div><textarea rows="2" data-idee-antwort placeholder="Kurze Rückmeldung an alle">${esc(i.antwort || '')}</textarea><div class="mb-actions"><button type="button" class="btn btn-schwarz btn-sm" data-idee-save>Speichern</button>${ctx.inFraktion() ? `<button type="button" class="btn btn-line btn-sm" data-idee-antrag>Als Antrag aufgreifen</button>` : ''}${i._owner === me().id || me().can('verwaltung') ? '<button type="button" class="linkbtn" data-idee-del>löschen</button>' : ''}</div></details>` : (i._owner === me().id ? `<button type="button" class="linkbtn" data-idee-del>löschen</button>` : '')}
      </div><p class="note" hidden></p></article>`; }).join('') || '<div class="rz-leer">Noch keine Idee – mach den Anfang.</div>'}</div>`;
    $('#f-idee', v).addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
      const btn = f.querySelector('[type=submit]'); busy(btn, true);
      try { await db.insert('Ideen', { title: $('#id-titel', v).value.trim(), titel: $('#id-titel', v).value.trim(), text: $('#id-text', v).value.trim(), von: me().id, vonName: me().name, status: 'neu', likes: [] }); route(); }
      catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
    });
    v.addEventListener('click', async e => {
      const b = e.target.closest('[data-like],[data-idee-save],[data-idee-antrag],[data-idee-del]'); if (!b) return;
      const art = b.closest('.idee'); const i = list.find(x => x._id === art.dataset.id); if (!i) return;
      const note = art.querySelector(':scope > .note'); busy(b, true);
      try {
        if (b.dataset.like !== undefined) { const likes = new Set(i.likes || []); if (likes.has(me().id)) likes.delete(me().id); else likes.add(me().id); await db.update('Ideen', { ...i, likes: [...likes] }); route(); return; }
        if (b.dataset.ideeSave !== undefined) { await db.update('Ideen', { ...i, status: art.querySelector('[data-idee-status]').value, antwort: art.querySelector('[data-idee-antwort]').value.trim() }); route(); return; }
        if (b.dataset.ideeAntrag !== undefined) { await ctx.ideeZuAntrag(i); await db.update('Ideen', { ...i, status: 'antrag' }); location.hash = '#ratsarbeit/antraege'; route(); return; }
        if (b.dataset.ideeDel !== undefined) { if (!confirm('Idee löschen?')) { busy(b, false); return; } await db.remove('Ideen', i._id); route(); return; }
      } catch (err) { msg(note, 'Das hat nicht geklappt: ' + errText(err)); busy(b, false); }
    });
  }
  const ideenKarte = () => `<div class="mb-card idee-karte"><h3>Deine Idee?</h3><p class="small">Was würde Soltau besser machen? Ein Satz reicht – die Fraktion schaut drauf.</p><a class="btn btn-rot btn-sm" href="#ideen">Idee einreichen</a></div>`;
  return { versammlung, wahlkampf, wissen, planung, ideen, startKarte, ideenKarte, grundwissenStartKarte };
}
