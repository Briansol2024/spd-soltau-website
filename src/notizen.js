// Notizen im Sitzungsmodus: je Sitzung und Mitglied eine private Notiz – als Text und als Stift-Skizze (Tablet + Stift,
// Finger oder Maus). Liegt in der Sammlung `SitzungNotizen` (nur der Verfasser liest sie), zusätzlich lokal als Sicherung.
// Teilen: in den verschlüsselten Sitzungs-Chat (Text + Bild), über das Teilen-Menü des Geräts oder als PNG.
export function makeNotizen(ctx) {
  const { db, store, esc, $, $$, msg, busy, errText, shareText, me } = ctx;
  const BREITE = 1000; // Striche werden auf 1000 Einheiten Breite normiert – so passen sie auf jede Bildschirmgröße
  const FARBEN = [['#0F0F0F', 'Schwarz'], ['#E3000F', 'Rot'], ['#1E5AA8', 'Blau'], ['#177A38', 'Grün']];
  let panel = null, notiz = null, sitzung = null, strokes = [], dirty = false, saveTimer = null, tab = 'text';
  let fingerZeichnet = true, stiftGesehen = false, aktiv = null, farbe = FARBEN[0][0], breite = 3, radierer = false;
  const lokalKey = () => `spd-notiz-${sitzung._id}`;

  async function laden(r) {
    sitzung = r;
    let row = null;
    try { row = (await db.list('SitzungNotizen', { eq: { sitzungId: r._id, memberId: me().id }, limit: 1 }))[0] || null; } catch (e) { row = null; }
    const lokal = store.get(lokalKey());
    // Lokale Sicherung gewinnt, wenn sie jünger ist (z. B. Speichern ohne Netz)
    if (lokal && (!row || (lokal.zeit || 0) > new Date(row._updatedDate || 0).getTime())) notiz = { ...(row || {}), text: lokal.text || '', skizze: lokal.skizze || '' };
    else notiz = row ? { ...row } : { text: '', skizze: '' };
    try { strokes = notiz.skizze ? JSON.parse(notiz.skizze) : []; } catch (e) { strokes = []; }
  }
  function merken() {
    dirty = true; store.set(lokalKey(), { text: notiz.text, skizze: JSON.stringify(strokes), zeit: Date.now() });
    clearTimeout(saveTimer); saveTimer = setTimeout(speichern, 1500); status('wird gespeichert …');
  }
  async function speichern() {
    if (!dirty || !sitzung) return;
    const data = { ...notiz, sitzungId: sitzung._id, memberId: me().id, name: me().name, title: `${me().name} – Notizen ${sitzung.gremium || ''}`, text: notiz.text, skizze: JSON.stringify(strokes) };
    try {
      notiz = notiz._id ? await db.update('SitzungNotizen', data) : await db.insert('SitzungNotizen', data);
      dirty = false; store.del(lokalKey()); status('gespeichert');
    } catch (e) { status('nur auf diesem Gerät gesichert – ' + errText(e)); }
  }
  const status = t => { const el = panel && $('#nz-status', panel); if (el) el.textContent = t; };

  // ---- Panel ----
  async function oeffnen(r, top) {
    if (!notiz || sitzung?._id !== r._id) await laden(r);
    schliessen(false);
    panel = document.createElement('div'); panel.className = 'notiz-panel'; panel.id = 'notiz-panel';
    panel.innerHTML = `<div class="notiz-kopf"><div class="notiz-kopf-text"><b>Meine Notizen</b><span class="small">${esc(r.gremium || 'Sitzung')} · privat, bis du teilst · <span class="notiz-status" id="nz-status"></span></span></div><button type="button" class="mb-sheet-close" id="nz-zu" aria-label="Schließen">✕</button></div>
      <div class="notiz-tabs" role="tablist"><button type="button" class="chip" data-tab="text" aria-pressed="${tab === 'text'}">Text</button><button type="button" class="chip" data-tab="stift" aria-pressed="${tab === 'stift'}">Stift</button></div>
      <div class="notiz-body" id="nz-body"></div>
      <div class="notiz-fuss"><button type="button" class="btn btn-rot btn-sm" id="nz-chat">In den Chat teilen</button><button type="button" class="btn btn-line btn-sm" id="nz-teilen">Teilen …</button><a class="btn btn-line btn-sm" id="nz-png" hidden download="Notizen.png">Skizze als Bild</a></div>`;
    document.body.appendChild(panel); document.body.classList.add('sheet-open');
    $('#nz-zu', panel).addEventListener('click', () => schliessen(true));
    $$('[data-tab]', panel).forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; $$('[data-tab]', panel).forEach(x => x.setAttribute('aria-pressed', String(x === b))); body(top); }));
    $('#nz-chat', panel).addEventListener('click', () => teilenChat());
    $('#nz-teilen', panel).addEventListener('click', () => teilenSystem());
    body(top);
  }
  function schliessen(speichernJetzt) {
    if (panel) { panel.remove(); panel = null; document.body.classList.remove('sheet-open'); }
    if (speichernJetzt && dirty) { clearTimeout(saveTimer); speichern(); }
  }
  function body(top) {
    const b = $('#nz-body', panel);
    if (tab === 'text') {
      b.innerHTML = `<div class="notiz-text"><div class="mb-actions"><button type="button" class="linkbtn" id="nz-top">+ TOP ${esc(top?.nr || '')} als Überschrift</button><span class="small muted">Wird automatisch gespeichert.</span></div><textarea id="nz-ta" placeholder="Was du dir merken willst – Stichworte reichen.">${esc(notiz.text || '')}</textarea></div>`;
      const ta = $('#nz-ta', b);
      ta.addEventListener('input', () => { notiz.text = ta.value; merken(); });
      $('#nz-top', b).addEventListener('click', () => { const z = `\n\nTOP ${top?.nr || ''}${top?.titel ? ' – ' + top.titel : ''}\n`; ta.value = (ta.value.replace(/\s+$/, '') + z).replace(/^\n+/, ''); notiz.text = ta.value; ta.focus(); ta.selectionStart = ta.selectionEnd = ta.value.length; merken(); });
      ta.focus();
    } else {
      b.innerHTML = `<div class="notiz-stift">
        <div class="notiz-werkzeug">${FARBEN.map(([c, n]) => `<button type="button" class="nz-farbe" data-farbe="${c}" style="background:${c}" aria-label="${n}" aria-pressed="${c === farbe && !radierer}"></button>`).join('')}<button type="button" class="chip" data-breite="3" aria-pressed="${breite === 3}">Dünn</button><button type="button" class="chip" data-breite="7" aria-pressed="${breite === 7}">Dick</button><button type="button" class="chip" id="nz-radierer" aria-pressed="${radierer}">Radierer</button><button type="button" class="chip" id="nz-undo">Rückgängig</button><button type="button" class="chip" id="nz-leer">Alles löschen</button><button type="button" class="chip" id="nz-finger" aria-pressed="${!fingerZeichnet}" title="Mit dem Stift zeichnen, mit dem Finger blättern">Finger blättert</button></div>
        <div class="notiz-blatt" id="nz-blatt"><canvas id="nz-canvas"></canvas></div>
        <p class="small muted">Stift, Finger oder Maus. Mit „Finger blättert“ zeichnet nur der Stift – der Finger scrollt (Handballen stört dann nicht).</p></div>`;
      canvasStart();
      $$('.nz-farbe', b).forEach(x => x.addEventListener('click', () => { farbe = x.dataset.farbe; radierer = false; werkzeugZeigen(); }));
      $$('[data-breite]', b).forEach(x => x.addEventListener('click', () => { breite = +x.dataset.breite; werkzeugZeigen(); }));
      $('#nz-radierer', b).addEventListener('click', () => { radierer = !radierer; werkzeugZeigen(); });
      $('#nz-undo', b).addEventListener('click', () => { strokes.pop(); zeichnen(); merken(); });
      $('#nz-leer', b).addEventListener('click', () => { if (strokes.length && !confirm('Skizze wirklich komplett löschen?')) return; strokes = []; zeichnen(); merken(); });
      $('#nz-finger', b).addEventListener('click', () => { fingerZeichnet = !fingerZeichnet; werkzeugZeigen(); });
      werkzeugZeigen();
    }
    const png = $('#nz-png', panel); png.hidden = !strokes.length;
  }
  function werkzeugZeigen() {
    if (!panel) return;
    $$('.nz-farbe', panel).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.farbe === farbe && !radierer)));
    $$('[data-breite]', panel).forEach(x => x.setAttribute('aria-pressed', String(+x.dataset.breite === breite)));
    $('#nz-radierer', panel)?.setAttribute('aria-pressed', String(radierer));
    $('#nz-finger', panel)?.setAttribute('aria-pressed', String(!fingerZeichnet));
    const c = $('#nz-canvas', panel); if (c) c.style.touchAction = fingerZeichnet ? 'none' : 'pan-y';
  }

  // ---- Zeichenfläche: Striche in Blattkoordinaten (Breite 1000, Höhe 1400 – etwa DIN A4) ----
  const HOEHE = 1400;
  let canvas = null, cx = null, scale = 1;
  function canvasStart() {
    canvas = $('#nz-canvas', panel); const blatt = $('#nz-blatt', panel);
    const w = Math.max(280, blatt.clientWidth - 2); scale = w / BREITE;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(HOEHE * scale * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = Math.round(HOEHE * scale) + 'px';
    cx = canvas.getContext('2d'); cx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0); cx.lineCap = 'round'; cx.lineJoin = 'round';
    zeichnen();
    const pos = e => { const b = canvas.getBoundingClientRect(); return [(e.clientX - b.left) / scale, (e.clientY - b.top) / scale, e.pressure || 0.5]; };
    canvas.addEventListener('pointerdown', e => {
      if (e.pointerType === 'pen') { if (!stiftGesehen) { stiftGesehen = true; fingerZeichnet = false; werkzeugZeigen(); } }
      else if (e.pointerType === 'touch' && !fingerZeichnet) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.preventDefault(); canvas.setPointerCapture(e.pointerId);
      aktiv = { farbe, breite, radierer, punkte: [pos(e)] };
    });
    canvas.addEventListener('pointermove', e => {
      if (!aktiv) return; e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of evs) { const p = pos(ev); const l = aktiv.punkte[aktiv.punkte.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) < 1.5) continue; aktiv.punkte.push(p); segment(aktiv, aktiv.punkte.length - 2); }
    });
    const ende = e => { if (!aktiv) return; if (aktiv.punkte.length === 1) { aktiv.punkte.push([aktiv.punkte[0][0] + 0.1, aktiv.punkte[0][1], aktiv.punkte[0][2]]); segment(aktiv, 0); } aktiv.punkte = aktiv.punkte.map(p => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10, Math.round(p[2] * 100) / 100]); strokes.push(aktiv); aktiv = null; merken(); const png = $('#nz-png', panel); if (png) png.hidden = false; };
    canvas.addEventListener('pointerup', ende); canvas.addEventListener('pointercancel', ende);
  }
  function stil(c, s) { c.globalCompositeOperation = s.radierer ? 'destination-out' : 'source-over'; c.strokeStyle = s.farbe; }
  function segment(s, i, c = cx) {
    const a = s.punkte[i], b = s.punkte[i + 1]; if (!a || !b) return;
    stil(c, s); c.lineWidth = s.radierer ? 24 : s.breite * (0.6 + (b[2] || 0.5)); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
  }
  function zeichnen(c = cx, hintergrund = false) {
    if (!c) return;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, c.canvas.width, c.canvas.height); c.restore();
    if (hintergrund) { c.save(); c.globalCompositeOperation = 'source-over'; c.fillStyle = '#fff'; c.fillRect(0, 0, BREITE, HOEHE); c.restore(); }
    for (const s of strokes) for (let i = 0; i < s.punkte.length - 1; i++) segment(s, i, c);
    c.globalCompositeOperation = 'source-over';
  }
  // Skizze als PNG (nur der beschriebene Teil, weißer Hintergrund)
  function skizzePng() {
    if (!strokes.length) return '';
    const maxY = Math.min(HOEHE, Math.max(...strokes.flatMap(s => s.punkte.map(p => p[1]))) + 40);
    const off = document.createElement('canvas'); const k = 1.2; off.width = Math.round(BREITE * k); off.height = Math.round(maxY * k);
    const c = off.getContext('2d'); c.setTransform(k, 0, 0, k, 0, 0); c.lineCap = 'round'; c.lineJoin = 'round';
    c.fillStyle = '#fff'; c.fillRect(0, 0, BREITE, maxY);
    for (const s of strokes) for (let i = 0; i < s.punkte.length - 1; i++) segment(s, i, c);
    return off.toDataURL('image/png');
  }
  const kopfzeile = () => `📝 Notizen von ${me().name} – ${sitzung.gremium || 'Sitzung'} ${sitzung.sitzung || ''}`;

  // ---- Teilen ----
  async function teilenChat() {
    const bild = skizzePng(); const text = (notiz.text || '').trim();
    if (!text && !bild) { msg($('#nz-body', panel), 'Noch keine Notiz – schreib erst etwas oder zeichne.'); return; }
    const btn = $('#nz-chat', panel); busy(btn, true);
    try { await ctx.chatSenden({ text: `${kopfzeile()}${text ? '\n' + text : ''}`, bild }); status('im Chat geteilt'); }
    catch (e) { status('Chat: ' + errText(e)); }
    busy(btn, false);
  }
  async function teilenSystem() {
    const bild = skizzePng(); const text = `${kopfzeile()}\n${(notiz.text || '').trim()}`;
    try {
      if (bild && navigator.canShare) {
        const blob = await (await fetch(bild)).blob(); const file = new File([blob], 'Notizen.png', { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) { await navigator.share({ title: 'Notizen', text, files: [file] }); return; }
      }
    } catch (e) { /* abgebrochen oder nicht möglich – dann nur Text */ }
    await shareText(text);
  }
  function pngLink() { const a = panel && $('#nz-png', panel); if (!a) return; a.addEventListener('click', () => { a.href = skizzePng(); }); }
  // Beim Verlassen des Sitzungsmodus: Panel zu, offene Änderungen speichern
  function beenden() { schliessen(true); notiz = null; sitzung = null; strokes = []; }
  const oeffnenMit = async (r, top) => { await oeffnen(r, top); pngLink(); };
  const hatNotiz = () => !!(notiz && ((notiz.text || '').trim() || strokes.length));
  return { oeffnen: oeffnenMit, schliessen, beenden, laden, hatNotiz };
}
