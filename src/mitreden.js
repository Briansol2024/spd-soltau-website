// Vorstand → Mitreden (Website): Startseiten-Schalter (nur Brian) und Video, Anliegen-Ranking, Fragen beantworten,
// Abstimmungen („Was daraus wurde“), Baustellen mit Karte. Jede Änderung setzt Startseite.stand – der Push-Dienst baut die Website
// dann innerhalb von fünf Minuten neu. Zähler („Betrifft mich auch“) und Abstimmungsergebnisse verdichtet der Push-Dienst.
import { KARTE, kartePx, karteLatLng, karteHtml, setBase } from './render.mjs';

export const KATEGORIEN = ['Straßen & Verkehr', 'Kita & Schule', 'Wohnen', 'Ortschaften', 'Ratsentscheidung', 'Sonstiges'];
export const STAENDE = [['neu', 'Neu'], ['nachgefragt', 'Wir haben nachgefragt'], ['antwort', 'Antwort da']];
export const ARTEN = [['Baustelle', 'Baustelle'], ['Sperrung', 'Sperrung'], ['Geplant', 'Geplant']];

// Startseite.stand = jetzt → Website wird neu gebaut (Eintrag anlegen, falls es ihn noch nicht gibt)
export async function standSetzen(db, patch = {}) {
  const [s] = await db.list('Startseite', { limit: 1 }).catch(() => []);
  const daten = { ...(s || { title: 'Startseite', variante: 'klassisch' }), ...patch, stand: new Date().toISOString() };
  return s ? db.update('Startseite', daten) : db.insert('Startseite', daten);
}

export function makeMitreden(ctx) {
  const { db, esc, $, $$, msg, busy, errText, sectionHead, ICON, DEMO, BASE, istBrian, fmtWhen } = ctx;
  const me = () => ctx.me;
  const st = { tab: 'startseite', karteNeu: null };
  setBase(BASE);
  const TABS = [['startseite', 'Startseite'], ['anliegen', 'Anliegen'], ['fragen', 'Fragen'], ['abstimmungen', 'Abstimmungen'], ['baustellen', 'Baustellen']];
  const datum = s => { const m = String(s || '').match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
  const heute = () => new Date().toISOString().slice(0, 10);
  const hinweisBau = 'Die Website übernimmt Änderungen innerhalb von fünf Minuten.';

  async function sec(v, sub) {
    const t = (sub || '').split('-')[1]; if (TABS.some(x => x[0] === t)) st.tab = t;
    v.innerHTML = `${sectionHead('Mitreden (Website)', 'Was Bürgerinnen und Bürger auf spd-soltau.de mitmachen können')}
    <div class="mb-tabs" role="tablist">${TABS.map(([k, l]) => `<button type="button" class="mb-tab${st.tab === k ? ' aktiv' : ''}" role="tab" aria-selected="${st.tab === k}" data-tab="${k}">${l}</button>`).join('')}</div>
    <div id="mr-panel"><p class="muted">Lädt …</p></div>`;
    $$('.mb-tab', v).forEach(b => b.addEventListener('click', () => { st.tab = b.dataset.tab; location.hash = '#vorstand/mitreden-' + st.tab; }));
    const p = $('#mr-panel', v);
    try { await ({ startseite, anliegen, fragen, abstimmungen, baustellen })[st.tab](p); } catch (e) { p.innerHTML = `<p class="note note-err">Das konnte nicht geladen werden: ${esc(errText(e))}</p>`; }
  }

  // ---------- Startseite: Schalter (nur Brian) + Video ----------
  async function startseite(p) {
    const [s] = await db.list('Startseite', { limit: 1 }).catch(() => []); const v = s?.variante === 'mitreden' ? 'mitreden' : 'klassisch';
    p.innerHTML = `
    <section class="mb-sub"><h4 class="doc-cat">Startseite <span class="small muted">welche Fassung die Öffentlichkeit sieht</span></h4>
      ${istBrian() ? `<div class="mr-schalter">
        <label class="mr-wahl ${v === 'klassisch' ? 'aktiv' : ''}"><input type="radio" name="variante" value="klassisch" ${v === 'klassisch' ? 'checked' : ''}><span><b>1 · Klassisch</b><small>Wie bisher: „Was können wir für Sie tun?“ mit Anliegen, Mitmachen und Rathaus-Kachel.</small></span></label>
        <label class="mr-wahl ${v === 'mitreden' ? 'aktiv' : ''}"><input type="radio" name="variante" value="mitreden" ${v === 'mitreden' ? 'checked' : ''}><span><b>2 · Mitreden</b><small>Video mit Anschluss, Kacheln „Mitreden“ mit lebenden Zahlen, Menüpunkt „Mitreden“, Rathaus-Kachel bleibt.</small></span></label>
      </div><p class="small muted" id="mr-schalter-msg">Umschalten dauert bis zu fünf Minuten – dann ist die Website neu gebaut. Du kannst jederzeit zurück.</p>` : `<p class="small muted">Aktiv: <b>${v === 'mitreden' ? '2 · Mitreden' : '1 · Klassisch'}</b>. Umschalten kann nur Brian.</p>`}
    </section>
    <section class="mb-sub"><h4 class="doc-cat">Video mit Anschluss <span class="small muted">oben auf der Startseite (Fassung 2) und unter /mitreden/</span></h4>
      <form class="form mb-form" id="mr-video" novalidate>
        <div class="field"><label for="mv-titel">Titel</label><input id="mv-titel" name="videoTitel" type="text" maxlength="90" value="${esc(s?.videoTitel || '')}" placeholder="z. B. Drei Entscheidungen, die Soltau verändern"></div>
        <div class="field"><label for="mv-url">Adresse des Videos <span class="muted">(Instagram, YouTube …)</span></label><input id="mv-url" name="videoUrl" type="url" value="${esc(s?.videoUrl || '')}" placeholder="https://www.instagram.com/reel/…"></div>
        <div class="field"><label for="mv-text">Unterzeile</label><input id="mv-text" name="videoText" type="text" maxlength="160" value="${esc(s?.videoText || '')}" placeholder="Ratsbericht vom 2. Oktober – 45 Sekunden mit Brian Weber"></div>
        <div class="mb-2"><div class="field"><label for="mv-kap">Kapitel <span class="muted">(eine Zeile je Thema: 0:04 Marktstraße)</span></label><textarea id="mv-kap" name="videoKapitel" rows="4">${esc(s?.videoKapitel || '')}</textarea></div>
        <div class="field"><label for="mv-bild">Vorschaubild <span class="muted">(Adresse, optional)</span></label><input id="mv-bild" name="videoBild" type="url" value="${esc(s?.videoBild || '')}"><label for="mv-datum" style="margin-top:10px">Datum</label><input id="mv-datum" name="videoDatum" type="date" value="${esc(s?.videoDatum || heute())}"></div></div>
        <p class="note" hidden></p>
        <div class="mb-actions"><button class="btn btn-rot" type="submit">Speichern</button><button class="btn btn-line" type="button" id="mv-leer">Kein Video zeigen</button></div>
      </form>
    </section>`;
    $$('input[name="variante"]', p).forEach(r => r.addEventListener('change', async e => {
      if (!istBrian()) return; const m = $('#mr-schalter-msg', p);
      try { await standSetzen(db, { variante: e.target.value }); $$('.mr-wahl', p).forEach(l => l.classList.toggle('aktiv', l.querySelector('input').value === e.target.value)); m.textContent = `Gespeichert: Fassung ${e.target.value === 'mitreden' ? '2 · Mitreden' : '1 · Klassisch'}. ${hinweisBau}`; }
      catch (err) { m.textContent = 'Nicht gespeichert: ' + errText(err); }
    }));
    const f = $('#mr-video', p);
    f.addEventListener('submit', async e => {
      e.preventDefault(); const fd = new FormData(f); const btn = f.querySelector('[type=submit]'); busy(btn, true);
      const patch = {}; for (const k of ['videoTitel', 'videoUrl', 'videoText', 'videoKapitel', 'videoBild', 'videoDatum']) patch[k] = String(fd.get(k) || '').trim();
      try { await standSetzen(db, patch); msg(f.querySelector('.note'), 'Gespeichert. ' + hinweisBau, 'ok'); } catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); }
      busy(btn, false);
    });
    $('#mv-leer', p).addEventListener('click', async () => { try { await standSetzen(db, { videoUrl: '', videoTitel: '', videoText: '', videoKapitel: '', videoBild: '' }); startseite(p); } catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); } });
  }

  // ---------- Anliegen: Ranking pflegen ----------
  async function anliegen(p, vorbelegt = null) {
    const liste = (await db.list('AnliegenOeffentlich', { desc: '_createdDate', limit: 200 }).catch(() => [])).sort((a, b) => (+b.zaehler || 0) - (+a.zaehler || 0));
    const neu = vorbelegt || (st.anliegenNeu ? st.anliegenNeu : null); st.anliegenNeu = null;
    const formular = (a, id) => `<form class="form mb-form mr-form" data-id="${esc(id || '')}" novalidate>
        <div class="field"><label>Titel <span class="muted">(anonym, ohne Namen)</span></label><input name="titel" type="text" required maxlength="120" value="${esc(a.titel || '')}" placeholder="z. B. Zebrastreifen Poststraße, Ecke Grundschule"></div>
        <div class="mb-2"><div class="field"><label>Kategorie</label><select name="kategorie">${KATEGORIEN.map(k => `<option ${a.kategorie === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></div><div class="field"><label>Ort <span class="muted">(Straße, Ortsteil)</span></label><input name="ort" type="text" maxlength="80" value="${esc(a.ort || '')}"></div></div>
        <div class="field"><label>Worum es geht <span class="muted">(kurz, öffentlich)</span></label><textarea name="text" rows="3" maxlength="600">${esc(a.text || '')}</textarea></div>
        <div class="mb-2"><div class="field"><label>Stand</label><select name="stand">${STAENDE.map(([k, l]) => `<option value="${k}" ${(a.stand || 'neu') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div><div class="field"><label>Datum</label><input name="datum" type="date" value="${esc(a.datum || heute())}"></div></div>
        <div class="field"><label>Unsere Antwort <span class="muted">(was wir getan haben – öffentlich)</span></label><textarea name="spd" rows="3" maxlength="800">${esc(a.spd || '')}</textarea></div>
        <label class="check"><input type="checkbox" name="sichtbar" ${a.sichtbar !== false ? 'checked' : ''}> <span>Auf der Website sichtbar</span></label>
        <p class="note" hidden></p>
        <div class="mb-actions"><button class="btn btn-rot btn-sm" type="submit">${id ? 'Speichern' : 'Veröffentlichen'}</button>${id ? '<button class="btn btn-line btn-sm" type="button" data-weg>Löschen</button>' : ''}</div>
      </form>`;
    p.innerHTML = `
    <p class="small muted">Anliegen erscheinen unter „Was Soltau bewegt“, sortiert nach „Betrifft mich auch“. Veröffentliche nur, was die Absenderin oder der Absender erlaubt hat (Häkchen im Kontaktformular) – ohne Namen und Adresse. Die drei meistunterstützten gehören jeden Monat in die Fraktionssitzung; trag hier ein, was ihr erreicht habt.</p>
    <details class="mb-details" id="mr-neu" ${neu ? 'open' : ''}><summary>Neues Anliegen veröffentlichen</summary>${formular(neu || {}, '')}</details>
    <div class="mr-liste">${liste.map((a, i) => `<details class="mb-details mr-eintrag ${a.sichtbar === false ? 'aus' : ''}"><summary><span class="rang">${i + 1}</span> ${esc(a.titel || '')} <span class="small muted">· ${+a.zaehler || 0} × betrifft mich auch · ${esc((STAENDE.find(x => x[0] === a.stand) || STAENDE[0])[1])}${a.sichtbar === false ? ' · unsichtbar' : ''}</span></summary>${formular(a, a._id)}</details>`).join('') || '<p class="muted">Noch nichts veröffentlicht.</p>'}</div>`;
    $$('form.mr-form', p).forEach(f => {
      f.addEventListener('submit', async e => {
        e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; }
        const fd = new FormData(f); const btn = f.querySelector('[type=submit]'); busy(btn, true);
        const daten = { titel: fd.get('titel').trim(), title: fd.get('titel').trim(), kategorie: fd.get('kategorie'), ort: fd.get('ort').trim(), text: fd.get('text').trim(), stand: fd.get('stand'), datum: fd.get('datum'), spd: fd.get('spd').trim(), sichtbar: !!fd.get('sichtbar') };
        try {
          if (f.dataset.id) { const alt = liste.find(x => x._id === f.dataset.id); await db.update('AnliegenOeffentlich', { ...alt, ...daten }); }
          else await db.insert('AnliegenOeffentlich', { ...daten, zaehler: 0, anfrageId: neu?.anfrageId || '' });
          await standSetzen(db); anliegen(p);
        } catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
      });
      f.querySelector('[data-weg]')?.addEventListener('click', async () => { if (!confirm('Dieses Anliegen von der Website nehmen und löschen?')) return; try { await db.remove('AnliegenOeffentlich', f.dataset.id); await standSetzen(db); anliegen(p); } catch (err) { msg(f.querySelector('.note'), 'Nicht gelöscht: ' + errText(err)); } });
    });
  }

  // ---------- Fragen: Eingang beantworten, Antworten pflegen ----------
  async function fragen(p) {
    const [eingang, oeff] = await Promise.all([db.list('Fragen', { desc: '_createdDate', limit: 200 }).catch(() => []), db.list('FragenOeffentlich', { desc: '_createdDate', limit: 200 }).catch(() => [])]);
    const offen = eingang.filter(f => f.status !== 'beantwortet' && f.status !== 'verworfen');
    const antwortForm = (f, o) => `<form class="form mb-form mr-form" data-frage="${esc(f?._id || '')}" data-id="${esc(o?._id || '')}" novalidate>
        <div class="field"><label>Frage <span class="muted">(so erscheint sie – gern kürzen)</span></label><input name="frage" type="text" required maxlength="200" value="${esc(o?.frage || f?.frage || '')}"></div>
        <div class="mb-2"><div class="field"><label>Von</label><input name="wer" type="text" maxlength="40" value="${esc(o?.wer || (f?.anonym || !f?.name ? 'Anonym' : String(f.name).split(' ')[0]))}"></div><div class="field"><label>Datum</label><input name="datum" type="date" value="${esc(o?.datum || String(f?._createdDate || heute()).slice(0, 10))}"></div></div>
        <div class="field"><label>Antwort</label><textarea name="antwort" rows="4" maxlength="1200" required>${esc(o?.antwort || '')}</textarea></div>
        <div class="mb-2"><div class="field"><label>Antwort von</label><input name="antwortVon" type="text" maxlength="60" value="${esc(o?.antwortVon || me().name)}"></div><div class="field"><label>Video-Antwort <span class="muted">(Adresse, optional)</span></label><input name="videoUrl" type="url" value="${esc(o?.videoUrl || '')}"></div></div>
        <label class="check"><input type="checkbox" name="sichtbar" ${!o || o.sichtbar !== false ? 'checked' : ''}> <span>Auf der Website sichtbar</span></label>
        <p class="note" hidden></p>
        <div class="mb-actions"><button class="btn btn-rot btn-sm" type="submit">${o ? 'Speichern' : 'Antwort veröffentlichen'}</button>${f && !o ? '<button class="btn btn-line btn-sm" type="button" data-verwerfen>Nicht veröffentlichen</button>' : ''}${o ? '<button class="btn btn-line btn-sm" type="button" data-weg>Löschen</button>' : ''}</div>
      </form>`;
    p.innerHTML = `
    <section class="mb-sub"><h4 class="doc-cat">Eingang <span class="small muted">${offen.length} offen – jede Frage bekommt eine Antwort, spätestens am Monatsende</span></h4>
      ${offen.map(f => `<details class="mb-details mr-eintrag"><summary>${esc(f.frage || '')} <span class="small muted">· ${esc(f.anonym ? 'anonym' : f.name || 'ohne Namen')}${f.email ? ' · ' + esc(f.email) : ''} · ${esc(fmtWhen(f._createdDate))}${f.quelle && f.quelle !== 'Website' ? ' · zu „' + esc(f.quelle) + '“' : ''}</span></summary>${antwortForm(f, null)}</details>`).join('') || '<p class="muted">Keine offenen Fragen.</p>'}
    </section>
    <section class="mb-sub"><h4 class="doc-cat">Beantwortet <span class="small muted">${oeff.length} auf der Website</span></h4>
      ${oeff.map(o => `<details class="mb-details mr-eintrag ${o.sichtbar === false ? 'aus' : ''}"><summary>${esc(o.frage || '')} <span class="small muted">· ${+o.zaehler || 0} × interessiert mich auch${o.sichtbar === false ? ' · unsichtbar' : ''}</span></summary>${antwortForm(null, o)}</details>`).join('') || '<p class="muted">Noch keine Antwort veröffentlicht.</p>'}
    </section>`;
    $$('form.mr-form', p).forEach(f => {
      f.addEventListener('submit', async e => {
        e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; }
        const fd = new FormData(f); const btn = f.querySelector('[type=submit]'); busy(btn, true);
        const daten = { frage: fd.get('frage').trim(), title: fd.get('frage').trim(), wer: fd.get('wer').trim() || 'Anonym', datum: fd.get('datum'), antwort: fd.get('antwort').trim(), antwortVon: fd.get('antwortVon').trim(), videoUrl: fd.get('videoUrl').trim(), sichtbar: !!fd.get('sichtbar') };
        try {
          if (f.dataset.id) { const alt = oeff.find(x => x._id === f.dataset.id); await db.update('FragenOeffentlich', { ...alt, ...daten }); }
          else { await db.insert('FragenOeffentlich', { ...daten, zaehler: 0, frageId: f.dataset.frage }); const q = eingang.find(x => x._id === f.dataset.frage); if (q) await db.update('Fragen', { ...q, status: 'beantwortet' }); }
          await standSetzen(db); fragen(p);
        } catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
      });
      f.querySelector('[data-verwerfen]')?.addEventListener('click', async () => { const q = eingang.find(x => x._id === f.dataset.frage); if (!q) return; try { await db.update('Fragen', { ...q, status: 'verworfen' }); fragen(p); } catch (err) { msg(f.querySelector('.note'), errText(err)); } });
      f.querySelector('[data-weg]')?.addEventListener('click', async () => { if (!confirm('Antwort von der Website nehmen und löschen?')) return; try { await db.remove('FragenOeffentlich', f.dataset.id); await standSetzen(db); fragen(p); } catch (err) { msg(f.querySelector('.note'), errText(err)); } });
    });
  }

  // ---------- Abstimmungen: „Was daraus wurde“, schließen ----------
  async function abstimmungen(p) {
    const liste = (await db.list('UmfragenOeffentlich', { desc: '_createdDate', limit: 100 }).catch(() => [])).filter(u => u.mitreden);
    p.innerHTML = `
    <p class="small muted">Neue Abstimmungen legst du unter <a href="#umfragen">Umfragen</a> an – mit dem Häkchen „Auf der Website unter Mitreden“. Hier trägst du hinterher ein, was daraus wurde, und schließt die Abstimmung. Ergebnisse zählt der Push-Dienst alle fünf Minuten.</p>
    ${liste.map(u => { let erg = []; try { erg = JSON.parse(u.ergebnis || '[]'); } catch (e) { erg = []; } return `<details class="mb-details mr-eintrag" ${u.offen ? 'open' : ''}><summary>${esc(u.frage)} <span class="small muted">· ${u.offen ? 'läuft' : 'beendet'}${u.endetAm ? ' · bis ' + esc(datum(u.endetAm)) : ''} · ${+u.stimmen || 0} Stimmen</span></summary>
      <div class="mr-ergebnis">${(u.optionen || []).map((o, i) => `<div class="small"><b>${esc(o)}</b>: ${Number(erg[i]) || 0}</div>`).join('')}</div>
      <form class="form mb-form mr-form" data-id="${esc(u._id)}" novalidate>
        <div class="field"><label>Was daraus wurde <span class="muted">(öffentlich, unter dem Ergebnis)</span></label><textarea name="folge" rows="3" maxlength="600">${esc(u.folge || '')}</textarea></div>
        <label class="check"><input type="checkbox" name="offen" ${u.offen ? 'checked' : ''}> <span>Abstimmung läuft (offen)</span></label>
        <p class="note" hidden></p>
        <div class="mb-actions"><button class="btn btn-rot btn-sm" type="submit">Speichern</button></div>
      </form></details>`; }).join('') || '<p class="muted">Noch keine Abstimmung für die Website.</p>'}`;
    $$('form.mr-form', p).forEach(f => f.addEventListener('submit', async e => {
      e.preventDefault(); const fd = new FormData(f); const btn = f.querySelector('[type=submit]'); busy(btn, true);
      try { const alt = liste.find(x => x._id === f.dataset.id); await db.update('UmfragenOeffentlich', { ...alt, folge: fd.get('folge').trim(), offen: !!fd.get('offen') }); await standSetzen(db); msg(f.querySelector('.note'), 'Gespeichert. ' + hinweisBau, 'ok'); }
      catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); }
      busy(btn, false);
    }));
  }

  // ---------- Baustellen: Liste + Karte zum Antippen ----------
  async function baustellen(p) {
    const liste = await db.list('Baustellen', { desc: '_createdDate', limit: 200 }).catch(() => []);
    const farbe = { Baustelle: '#B7791F', Sperrung: '#E3000F', Geplant: '#005BA4' };
    const pins = liste.filter(b => b.lat && b.lng).map((b, i) => ({ id: b._id, lat: b.lat, lng: b.lng, nr: i + 1, farbe: b.aktiv === false ? '#999' : farbe[b.art] || '#E3000F', titel: b.titel }));
    if (st.karteNeu) pins.push({ id: 'neu', lat: st.karteNeu.lat, lng: st.karteNeu.lng, nr: '+', farbe: '#0F0F0F', titel: 'Neu' });
    const formular = (b, id) => `<form class="form mb-form mr-form" data-id="${esc(id || '')}" novalidate>
        <div class="mb-2"><div class="field"><label>Titel <span class="muted">(Straße, Ort)</span></label><input name="titel" type="text" required maxlength="80" value="${esc(b.titel || '')}" placeholder="z. B. Marktstraße"></div><div class="field"><label>Art</label><select name="art">${ARTEN.map(([k, l]) => `<option value="${k}" ${(b.art || 'Baustelle') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
        <div class="field"><label>Dauer <span class="muted">(z. B. „halbseitig, bis 30. Oktober“)</span></label><input name="bis" type="text" maxlength="120" value="${esc(b.bis || '')}"></div>
        <div class="field"><label>Was</label><textarea name="was" rows="2" maxlength="400">${esc(b.was || '')}</textarea></div>
        <div class="field"><label>Warum</label><textarea name="warum" rows="2" maxlength="400">${esc(b.warum || '')}</textarea></div>
        <div class="field"><label>Umleitung</label><textarea name="umleitung" rows="2" maxlength="400">${esc(b.umleitung || '')}</textarea></div>
        <div class="field"><label>Unsere Einordnung <span class="muted">(optional)</span></label><textarea name="spd" rows="2" maxlength="400">${esc(b.spd || '')}</textarea></div>
        <div class="mb-2"><div class="field"><label>Quelle <span class="muted">(z. B. Bekanntmachung der Stadt vom …)</span></label><input name="quelle" type="text" maxlength="120" value="${esc(b.quelle || '')}"></div><div class="field"><label>Position</label><input name="pos" type="text" readonly value="${b.lat ? (+b.lat).toFixed(5) + ', ' + (+b.lng).toFixed(5) : ''}" placeholder="auf der Karte antippen"></div></div>
        <label class="check"><input type="checkbox" name="aktiv" ${b.aktiv !== false ? 'checked' : ''}> <span>Aktiv (auf der Website)</span></label>
        <p class="note" hidden></p>
        <div class="mb-actions"><button class="btn btn-rot btn-sm" type="submit">${id ? 'Speichern' : 'Eintragen'}</button>${id ? '<button class="btn btn-line btn-sm" type="button" data-weg>Löschen</button>' : ''}</div>
      </form>`;
    p.innerHTML = `
    <p class="small muted">Tippe auf die Karte, wo die Baustelle ist – dann ausfüllen. Quelle sind die Bekanntmachungen der Stadt; die Einordnung ist unsere. Aktive Einträge erscheinen unter „Wo wird gebaut?“.</p>
    ${karteHtml(pins, { id: 'mr-karte', hoehe: 380 })}
    <details class="mb-details" id="mr-neu" ${st.karteNeu ? 'open' : ''}><summary>Neue Baustelle ${st.karteNeu ? '(Position gesetzt)' : ''}</summary>${formular(st.karteNeu ? { lat: st.karteNeu.lat, lng: st.karteNeu.lng } : {}, '')}</details>
    <div class="mr-liste">${liste.map((b, i) => `<details class="mb-details mr-eintrag ${b.aktiv === false ? 'aus' : ''}" data-id="${esc(b._id)}"><summary><span class="rang" style="background:${farbe[b.art] || '#E3000F'}">${i + 1}</span> ${esc(b.titel || '')} <span class="small muted">· ${esc(b.art || '')}${b.bis ? ' · ' + esc(b.bis) : ''}${b.aktiv === false ? ' · inaktiv' : ''}</span></summary>${formular(b, b._id)}</details>`).join('') || '<p class="muted">Noch keine Baustelle eingetragen.</p>'}</div>`;
    const karte = $('#mr-karte', p); const flaeche = $('.karte-flaeche', karte);
    if (!st.karteNeu) { karte.scrollTo({ left: (flaeche.offsetWidth - karte.clientWidth) / 2, top: (flaeche.offsetHeight - karte.clientHeight) / 2 }); }
    else { const { px, py } = kartePx(st.karteNeu.lat, st.karteNeu.lng); karte.scrollTo({ left: Math.max(0, px - karte.clientWidth / 2), top: Math.max(0, py - karte.clientHeight / 2) }); }
    karte.addEventListener('click', e => {
      const pin = e.target.closest('.karte-pin');
      if (pin && pin.dataset.pin !== 'neu') { const d = $(`.mr-eintrag[data-id="${pin.dataset.pin}"]`, p); if (d) { d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); } return; }
      const r = flaeche.getBoundingClientRect(); const px = e.clientX - r.left, py = e.clientY - r.top; if (px < 0 || py < 0 || px > r.width || py > r.height) return;
      const offenes = $$('details.mr-eintrag[open] form', p)[0];
      if (offenes) { const { lat, lng } = karteLatLng(px, py); offenes.dataset.lat = lat; offenes.dataset.lng = lng; offenes.querySelector('[name=pos]').value = lat.toFixed(5) + ', ' + lng.toFixed(5); msg(offenes.querySelector('.note'), 'Position geändert – Speichern nicht vergessen.', 'ok'); return; }
      st.karteNeu = karteLatLng(px, py); baustellen(p);
    });
    $$('form.mr-form', p).forEach(f => {
      f.addEventListener('submit', async e => {
        e.preventDefault(); if (!f.checkValidity()) { f.reportValidity(); return; }
        const fd = new FormData(f); const btn = f.querySelector('[type=submit]'); busy(btn, true);
        const alt = f.dataset.id ? liste.find(x => x._id === f.dataset.id) : null;
        const lat = f.dataset.lat ? +f.dataset.lat : (alt?.lat || st.karteNeu?.lat || 0), lng = f.dataset.lng ? +f.dataset.lng : (alt?.lng || st.karteNeu?.lng || 0);
        if (!lat || !lng) { msg(f.querySelector('.note'), 'Bitte erst auf der Karte antippen, wo die Baustelle ist.'); busy(btn, false); return; }
        const daten = { titel: fd.get('titel').trim(), title: fd.get('titel').trim(), art: fd.get('art'), bis: fd.get('bis').trim(), was: fd.get('was').trim(), warum: fd.get('warum').trim(), umleitung: fd.get('umleitung').trim(), spd: fd.get('spd').trim(), quelle: fd.get('quelle').trim(), aktiv: !!fd.get('aktiv'), lat, lng };
        try {
          if (alt) await db.update('Baustellen', { ...alt, ...daten }); else await db.insert('Baustellen', daten);
          st.karteNeu = null; await standSetzen(db); baustellen(p);
        } catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
      });
      f.querySelector('[data-weg]')?.addEventListener('click', async () => { if (!confirm('Baustelle löschen?')) return; try { await db.remove('Baustellen', f.dataset.id); await standSetzen(db); baustellen(p); } catch (err) { msg(f.querySelector('.note'), errText(err)); } });
    });
  }

  // Aus dem Anfragen-Eingang: „Als Anliegen veröffentlichen“ – Werte vorbelegen und den Anliegen-Reiter öffnen
  function anliegenAus(vorbelegt) { st.anliegenNeu = vorbelegt; st.tab = 'anliegen'; location.hash = '#vorstand/mitreden-anliegen'; }

  return { sec, anliegenAus, standSetzen: () => standSetzen(db) };
}
