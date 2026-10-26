// Vorstand – Übersicht als große Kacheln (statt Reiterleiste), damit es auch mit zehn Werkzeugen übersichtlich bleibt:
// Anliegen & Anfragen (verschlüsselte Vorgänge mit Zuständigkeit, Status und Notizen), Nachricht an alle, Newsletter, Presse,
// Jahresplan, Benachrichtigen, Gruppen, Rechte, Sichtbarkeit, WhatsApp. Die klassischen Einstellungs-Tafeln liefert members.js
// über `ctx.tafeln`; Newsletter/Presse/Jahresplan kommen aus vorstand-mehr.js.
export function makeVorstand(ctx) {
  const { db, DEMO, esc, $, $$, msg, busy, route, sectionHead, fmtWhen, nl2br, ICON, schluessel, inboxAll, inboxPut, errText } = ctx;
  const me = () => ctx.me, people = () => ctx.people, settings = () => ctx.settings;
  const state = { showDone: false, timer: null, tab: null, planAlt: false };
  const KACHELN = [
    ['anliegen', 'Anliegen & Anfragen', 'Registrierungen, Mietanfragen, Kontakt', 'freigaben', ICON.inbox],
    ['nachricht', 'Nachricht an alle', 'Push an alle Mitglieder', 'nachrichten', ICON.share],
    ['newsletter', 'Newsletter', 'Beiträge und Termine per E-Mail', 'newsletter', ICON.doc],
    ['presse', 'Presse', 'Kontakte und Pressemitteilungen', 'presse', ICON.edit],
    ['jahresplan', 'Jahresplan', 'Sommerfest, Versammlung & Co. planen', 'planung', ICON.cal],
    ['wer', 'Benachrichtigen', 'Wer bekommt welche Push-Nachricht?', 'verwaltung', ICON.users],
    ['gruppen', 'Gruppen', 'Vorstand, Rat, Fraktion', 'verwaltung', ICON.users],
    ['rechte', 'Rechte', 'Wer darf was?', 'verwaltung', ICON.check],
    ['sicht', 'Sichtbarkeit', 'Wer sieht was?', 'verwaltung', ICON.help],
    ['whatsapp', 'WhatsApp-Gruppen', 'Einladungslinks für Mitglieder', 'verwaltung', ICON.link],
    ['stammtisch', 'Stammtisch-Umfrage', 'Lokale für „Wo treffen wir uns?“', 'verwaltung', ICON.poll],
    ['statistik', 'Statistik', 'Aufrufe, Besuche, Quellen – ohne Cookies', 'statistik', ICON.chart],
    ['mitreden', 'Mitreden (Website)', 'Startseite, Anliegen, Fragen, Abstimmungen, Baustellen', 'verwaltung', ICON.hand],
  ];
  const erlaubt = () => KACHELN.filter(k => me().can(k[3]));
  const ALT = { eingang: 'anliegen' };

  async function sec(v) {
    clearTimeout(state.timer);
    const parts = location.hash.split('/');
    let wanted = (parts[1] || '').replace(/-.*$/, '');
    wanted = ALT[wanted] || wanted;
    const kacheln = erlaubt();
    const cur = kacheln.find(k => k[0] === wanted);
    if (!cur) {
      let counts = {};
      try { counts.anliegen = await badge(); } catch (e) { counts.anliegen = 0; }
      v.innerHTML = `${sectionHead('Vorstand', 'Werkzeuge für die Vorstandsarbeit')}
      <div class="vs-grid">${kacheln.map(([k, t, h, , icon]) => `<a class="vs-kachel" href="${k === 'jahresplan' ? '#planung' : '#vorstand/' + k}"><span class="vs-ico">${icon}</span><span class="vs-txt"><b>${esc(t)}${counts[k] ? ` <b class="mb-badge">${counts[k]}</b>` : ''}</b><small>${esc(h)}</small></span>${ICON.chev}</a>`).join('')}</div>`;
      return;
    }
    v.innerHTML = `<p class="small rz-zurueck"><a href="#vorstand">← Vorstand</a></p><div id="vs-panel"></div>`;
    const panel = $('#vs-panel', v);
    if (cur[0] === 'anliegen') { await anliegen(panel, parts[1]); return; }
    if (cur[0] === 'mitreden') { await ctx.mitreden.sec(panel, parts[1]); return; }
    if (ctx.tafeln[cur[0]]) { await ctx.tafeln[cur[0]](panel); return; }
    if (ctx.mehr[cur[0]]) { await ctx.mehr[cur[0]](panel); return; }
    panel.innerHTML = '<p class="muted">Kommt bald.</p>';
  }

  // ---- Anliegen & Anfragen: Vorgänge (verschlüsselt, vom Push-Dienst angelegt) + Push-Nachrichten, die auf diesem Gerät ankamen ----
  const FINAL = /freigeschaltet|abgelehnt|bestätigt|erledigt|beantwortet/i;
  const istErledigt = it => !!it.erledigtAm || FINAL.test(it.status || '');
  const LABEL = { registrierung: 'Registrierung', buchung: 'Buchung', anfrage: 'Anfrage' };
  const TABS = [['registrierung', 'Mitgliederanfragen'], ['buchung', 'Mietanfragen'], ['anfrage', 'Allgemeine Anfragen']];
  async function ladeVorgaenge() {
    const rows = await db.list('Vorgaenge', { desc: '_createdDate', limit: 300 }).catch(() => []);
    const list = [];
    for (const r of rows) {
      const d = await schluessel.decJson('vorstand', r.daten);
      const notiz = r.notiz ? (await schluessel.decJson('vorstand', r.notiz)).text || '' : '';
      list.push({ id: r.key || r._id, row: r, typ: r.typ || 'anfrage', title: d.title || 'Vorgang', body: d.body || '', details: d.details || {}, payload: d.payload || {}, status: r.status || 'offen', zustaendig: r.zustaendig || '', zustaendigName: r.zustaendigName || '', notiz, receivedAt: new Date(r._createdDate).getTime(), remote: true, done: istErledigt(r) });
    }
    return list;
  }
  // ---- Belegungsplan Roter Bahnhof: alle Mietanfragen nach gebuchtem Tag – wer, wann angefragt, wann zu- oder abgesagt (Brian, 26.10.2026) ----
  const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const WT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const buchungTag = it => { const w = String(it.details?.Wann || ''); const iso = w.match(/\d{4}-\d{2}-\d{2}/); if (iso) return iso[0]; const de = w.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/); return de ? `${de[3]}-${de[2].padStart(2, '0')}-${de[1].padStart(2, '0')}` : ''; };
  const buchungStand = it => /bestätigt|annehmen/i.test(it.status || '') ? 'zugesagt' : /abgelehnt|ablehnen/i.test(it.status || '') ? 'abgesagt' : 'offen';
  const bearbeiter = it => (String(it.status || '').match(/\bvon (.+)$/)?.[1] || it.row?.geaendertVon || '').trim();
  const zeitpunkt = t => t ? new Date(t).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' Uhr' : '';
  const STAND_BADGE = { zugesagt: 'badge-mit', offen: 'badge-off', abgesagt: '' };
  function belegungInhalt(list) {
    const heute = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
    const alle = list.filter(it => it.typ === 'buchung').map(it => ({ it, tag: buchungTag(it), stand: buchungStand(it) }));
    const ohneTag = alle.filter(b => !b.tag).length;
    const zeigen = alle.filter(b => b.tag && (state.planAlt || b.tag.slice(0, 7) >= heute.slice(0, 7)))
      .sort((a, b) => a.tag.localeCompare(b.tag) || (a.it.receivedAt || 0) - (b.it.receivedAt || 0));
    const zugesagtAm = tag => alle.filter(b => b.tag === tag && b.stand === 'zugesagt').length;
    if (!zeigen.length) return `<p class="muted">${state.planAlt ? 'Noch keine Mietanfragen.' : 'Keine Buchungen ab diesem Monat.'}</p>`;
    return [...new Set(zeigen.map(b => b.tag.slice(0, 7)))].map(monat => {
      const imMonat = zeigen.filter(b => b.tag.startsWith(monat));
      const [j, m] = monat.split('-').map(Number);
      const tage = new Date(j, m, 0).getDate(), versatz = (new Date(j, m - 1, 1).getDay() + 6) % 7;
      // Ein Tag zeigt den „stärksten“ Stand: zugesagt vor offen vor abgesagt
      const standAm = tag => ['zugesagt', 'offen', 'abgesagt'].find(s => imMonat.some(b => b.tag === tag && b.stand === s));
      const zellen = Array.from({ length: tage }, (_, i) => {
        const tag = `${monat}-${String(i + 1).padStart(2, '0')}`, s = standAm(tag), h = tag === heute ? ' bp-heute' : '';
        return s ? `<button type="button" class="bp-${s}${h}" data-bp-tag="${tag}" aria-label="${i + 1}. ${MONATE[m - 1]}: ${s}">${i + 1}</button>` : `<span class="${h.trim()}">${i + 1}</span>`;
      });
      return `<section class="bp-monat">
        <h4>${MONATE[m - 1]} ${j}</h4>
        <div class="bp-kal">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(t => `<span class="bp-wt">${t}</span>`).join('')}${'<span></span>'.repeat(versatz)}${zellen.join('')}</div>
        <ul class="bp-liste">${imMonat.map(({ it, tag, stand }) => {
          const d = it.details || {}, uhr = String(d.Wann || '').replace(/\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4}/, '').trim();
          const erledigt = stand === 'offen' ? '' : ` · <b>${stand}</b> ${esc(zeitpunkt(it.row?.erledigtAm))}${bearbeiter(it) ? ' von ' + esc(bearbeiter(it)) : ''}`;
          const warnung = (stand === 'zugesagt' && zugesagtAm(tag) > 1) ? '<span class="bp-warn">doppelt zugesagt</span>' : (stand === 'offen' && zugesagtAm(tag)) ? '<span class="bp-warn">Tag schon vergeben</span>' : '';
          return `<li class="bp-eintrag bp-${stand}" data-bp-eintrag="${tag}">
            <div class="bp-tag"><b>${Number(tag.slice(8))}</b><span>${WT[new Date(tag + 'T12:00:00').getDay()]}</span></div>
            <div class="bp-text"><b class="bp-wer">${esc(d.Name || '?')}${d['Verein/Gruppe'] ? ' (' + esc(d['Verein/Gruppe']) + ')' : ''}</b>${warnung}
              <span class="small">${[uhr, d.Anlass, d.Personen ? d.Personen + ' Personen' : ''].filter(Boolean).map(esc).join(' · ')}</span>
              <span class="small muted">angefragt ${esc(zeitpunkt(it.receivedAt))}${erledigt}</span></div>
            <span class="badge ${STAND_BADGE[stand]}">${stand}</span>
          </li>`; }).join('')}</ul>
      </section>`; }).join('') + (ohneTag ? `<p class="small muted">${ohneTag} Anfrage(n) ohne erkennbares Datum – siehe „Anfragen“.</p>` : '');
  }
  function belegungsplan(box, list) {
    const ziel = $('#bp', box);
    ziel.innerHTML = belegungInhalt(list);
    $('#bp-alt', box).onchange = e => { state.planAlt = e.target.checked; belegungsplan(box, list); };
    ziel.onclick = e => {
      const b = e.target.closest('[data-bp-tag]'); if (!b) return;
      const li = $(`[data-bp-eintrag="${b.dataset.bpTag}"]`, ziel); if (!li) return;
      li.scrollIntoView({ behavior: 'smooth', block: 'center' }); li.classList.add('bp-blink'); setTimeout(() => li.classList.remove('bp-blink'), 1600);
    };
  }
  async function anliegen(box, sub) {
    const status = await schluessel.laden('vorstand').catch(() => 'fehler');
    if (status !== 'ok') {
      box.innerHTML = `${sectionHead('Anliegen & Anfragen', 'Registrierungen, Mietanfragen, Kontakt')}${schluessel.warteKarte(status, 'die Anliegen, Buchungen und Registrierungen')}`;
      $('[data-schluessel-neu]', box)?.addEventListener('click', () => { schluessel.neu(); route(); });
      if (status === 'wartet') state.timer = setTimeout(() => { schluessel.vergessen(); if (location.hash.startsWith('#vorstand')) route(); }, 30000);
      return;
    }
    const remote = await ladeVorgaenge();
    const local = (await inboxAll()).map(l => ({ ...l, typ: l.data?.typ || 'anfrage', details: l.data?.details || {}, payload: l.data || {}, done: !!l.done, status: l.done || 'offen' }));
    const seen = new Set(remote.map(r => r.id));
    const list = [...remote, ...local.filter(l => !seen.has(l.id))].sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0));
    const count = t => list.filter(it => it.typ === t && !it.done).length;
    const wantedTab = (sub || '').split('-')[1];
    const tab = TABS.some(([k]) => k === wantedTab) ? wantedTab : state.tab || (TABS.find(([k]) => count(k))?.[0] || 'registrierung');
    state.tab = tab;
    const shown = list.filter(it => it.typ === tab && (state.showDone || !it.done));
    const zust = people().filter(p => settings().rights.freigaben?.has(p.memberId) || settings().board.has(p.memberId));
    const plan = tab === 'buchung' && (sub || '').split('-')[2] === 'plan';
    const kopf = `${sectionHead('Anliegen & Anfragen', `${list.filter(it => !it.done).length} offen`)}
    <nav class="inbox-tabs">${TABS.map(([k, l]) => `<a href="#vorstand/anliegen-${k}" class="chip" aria-pressed="${k === tab}">${l}${count(k) ? ` <b>${count(k)}</b>` : ''}</a>`).join('')}${plan ? '' : `<label class="check small"><input type="checkbox" id="inbox-done" ${state.showDone ? 'checked' : ''}> <span>Erledigte anzeigen</span></label>`}</nav>
    ${tab === 'buchung' ? `<nav class="inbox-tabs" aria-label="Ansicht"><a href="#vorstand/anliegen-buchung" class="chip" aria-pressed="${!plan}">Anfragen</a><a href="#vorstand/anliegen-buchung-plan" class="chip" aria-pressed="${plan}">Belegungsplan</a>${plan ? `<label class="check small"><input type="checkbox" id="bp-alt" ${state.planAlt ? 'checked' : ''}> <span>Vergangene Monate anzeigen</span></label>` : ''}</nav>` : ''}`;
    if (plan) {
      box.innerHTML = `${kopf}<p class="bp-legende small"><span><i class="bp-farbe bp-zugesagt"></i>zugesagt</span><span><i class="bp-farbe bp-offen"></i>offen</span><span><i class="bp-farbe bp-abgesagt"></i>abgesagt</span><span>Tag antippen → Eintrag</span></p><div id="bp"></div>`;
      belegungsplan(box, list);
      return;
    }
    box.innerHTML = `${kopf}
    ${shown.length ? '' : `<p class="muted">${state.showDone ? 'Nichts in diesem Bereich.' : 'Nichts Offenes in diesem Bereich.'}</p>`}
    ${shown.map(it => {
      const aktionen = it.done ? '' : it.typ === 'registrierung'
        ? `<button class="btn btn-rot btn-sm" data-act="mitglied_freigeben">Freischalten</button><button class="btn btn-line btn-sm" data-act="mitglied_ablehnen">Ablehnen</button>`
        : it.typ === 'buchung' ? `<button class="btn btn-rot btn-sm" data-act="buchung_annehmen">Annehmen</button><button class="btn btn-line btn-sm" data-act="buchung_ablehnen">Ablehnen</button>`
          : `<button class="btn btn-rot btn-sm" data-act="anfrage_erledigt">Beantwortet ✓</button>${ctx.mitreden && it.details['Darf veröffentlicht werden'] === 'ja' ? '<button class="btn btn-line btn-sm" data-anliegen-oeffentlich>Als Anliegen veröffentlichen</button>' : ''}`;
      const inArbeit = /in Arbeit/.test(it.status);
      return `<article class="inbox-item${it.done ? ' erledigt' : ''}" data-id="${esc(it.id)}">
      <div class="vg-kopf"><span class="tag ${it.typ === 'buchung' ? 'tag-schwarz' : ''}">${esc(LABEL[it.typ] || 'Info')}</span> <span class="small muted">${esc(fmtWhen(it.receivedAt))}</span><span class="badge ${it.done ? '' : inArbeit ? 'badge-mit' : 'badge-off'}">${esc(it.done ? it.status : inArbeit ? 'in Arbeit' : 'offen')}</span>${it.zustaendigName ? `<span class="small">zuständig: <b>${esc(it.zustaendigName)}</b></span>` : ''}</div>
      <h4>${esc(it.title || '')}</h4>
      <p class="small">${nl2br(it.body || '')}</p>
      ${Object.keys(it.details).length ? `<dl class="inbox-details">${Object.entries(it.details).filter(([, val]) => val).map(([k, val]) => `<dt>${esc(k)}</dt><dd>${/@/.test(val) ? `<a href="mailto:${esc(val)}">${esc(val)}</a>` : /^[\d +\/-]{6,}$/.test(val) ? `<a href="tel:${esc(val)}">${esc(val)}</a>` : nl2br(val)}</dd>`).join('')}</dl>` : ''}
      ${it.remote && !it.done ? `<div class="vg-zeile">
        <label class="vg-feld">Zuständig <select data-zust><option value="">– niemand –</option>${zust.map(p => `<option value="${esc(p.memberId)}" ${p.memberId === it.zustaendig ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>
        ${it.typ === 'anfrage' ? `<label class="vg-feld">Stand <select data-stand><option value="offen" ${!inArbeit ? 'selected' : ''}>offen</option><option value="in Arbeit" ${inArbeit ? 'selected' : ''}>in Arbeit</option></select></label>` : ''}
      </div>` : ''}
      ${it.remote ? `<details class="vg-notiz" ${it.notiz ? 'open' : ''}><summary>Notiz${it.notiz ? ' ✎' : ''}</summary><textarea rows="3" data-notiz placeholder="Was wurde besprochen, was ist zu tun? (verschlüsselt, nur für den Vorstand)">${esc(it.notiz)}</textarea><div class="mb-actions"><button class="btn btn-schwarz btn-sm" data-notiz-save>Notiz speichern</button></div></details>` : ''}
      <div class="mb-actions">${aktionen}${it.details['E-Mail'] ? `<a class="btn btn-line btn-sm" href="mailto:${esc(it.details['E-Mail'])}?subject=${encodeURIComponent('Ihre Anfrage an die SPD Soltau')}">Antworten</a>` : ''}</div>
      <p class="note" hidden></p>
    </article>`; }).join('')}`;
    $('#inbox-done', box)?.addEventListener('change', e => { state.showDone = e.target.checked; anliegen(box, sub); });
    const finde = el => list.find(x => x.id === el.closest('.inbox-item').dataset.id);
    box.addEventListener('change', async e => {
      const it = finde(e.target); if (!it || !it.remote) return;
      const note = e.target.closest('.inbox-item').querySelector(':scope > .note');
      try {
        if (e.target.matches('[data-zust]')) { const p = people().find(x => x.memberId === e.target.value); it.row = await db.update('Vorgaenge', { ...it.row, zustaendig: e.target.value, zustaendigName: p?.name || '', geaendertVon: me().name }); msg(note, p ? `${p.name} ist jetzt zuständig.` : 'Zuständigkeit entfernt.', 'ok'); }
        if (e.target.matches('[data-stand]')) { it.row = await db.update('Vorgaenge', { ...it.row, status: e.target.value, geaendertVon: me().name }); msg(note, 'Stand gespeichert.', 'ok'); }
      } catch (err) { msg(note, 'Nicht gespeichert: ' + errText(err)); }
    });
    box.addEventListener('click', e => {
      const b = e.target.closest('[data-anliegen-oeffentlich]'); if (!b) return; const it = finde(b); if (!it) return;
      const d = it.details || {}; ctx.mitreden.anliegenAus({ titel: (d.Thema && d.Thema !== 'Sonstiges' ? d.Thema + ': ' : '') + String(d.Nachricht || '').split(/[.!?\n]/)[0].slice(0, 100), kategorie: d.Thema || 'Sonstiges', ort: d.Wohnort || '', text: String(d.Nachricht || '').slice(0, 600), anfrageId: it.payload?.anfrageId || '' });
    });
    box.addEventListener('click', async e => {
      const b = e.target.closest('button[data-act],button[data-notiz-save]'); if (!b) return;
      const art = b.closest('.inbox-item'); const it = finde(b); if (!it) return;
      const note = art.querySelector(':scope > .note');
      busy(b, true);
      try {
        if (b.dataset.notizSave !== undefined) {
          const text = art.querySelector('[data-notiz]').value.trim();
          it.row = await db.update('Vorgaenge', { ...it.row, notiz: await schluessel.encJson('vorstand', { text }), geaendertVon: me().name });
          it.notiz = text; msg(note, 'Notiz gespeichert.', 'ok'); busy(b, false); return;
        }
        await db.insert('Aktionen', { title: `${b.dataset.act}: ${it.title || ''}`, typ: b.dataset.act, payload: JSON.stringify({ ...(it.payload || {}), typ: it.typ, id: it.id, details: it.details }), status: 'offen', von: me().name });
        const text = b.textContent.trim().replace(' ✓', '') + (DEMO ? '' : ' (wird ausgeführt)');
        if (it.remote) { try { it.row = await db.update('Vorgaenge', { ...it.row, status: text, erledigtAm: new Date().toISOString(), geaendertVon: me().name }); } catch (err) { /* Dienst setzt den Status */ } }
        else { it.done = text; await inboxPut({ ...it, done: text }); }
        anliegen(box, sub);
      } catch (err) { msg(note, 'Nicht gespeichert: ' + errText(err)); busy(b, false); }
    });
  }
  // Zähler: offene Vorgänge (nur Metadaten) + ungelesene Push-Einträge auf diesem Gerät
  async function badge() {
    let n = 0;
    try { n += (await db.list('Vorgaenge', { limit: 300 })).filter(v => !istErledigt(v)).length; } catch (e) { /* kein Zugriff */ }
    try { const local = await inboxAll(); n += local.filter(l => !l.done).length; } catch (e) { /* egal */ }
    return n;
  }
  return { sec, badge };
}
