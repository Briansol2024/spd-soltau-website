// Vorstand – Newsletter und Presse. Beides erzeugt Aufträge (Sammlung `Aktionen`), die der Push-Dienst per E-Mail verschickt
// (SMTP-Zugang in .env). Verschickte Ausgaben stehen im Archiv (Sammlung `Newsletter`), Pressekontakte in `Pressekontakte`.
export function makeVorstandMehr(ctx) {
  const { db, DEMO, esc, $, $$, msg, busy, route, sectionHead, fmtShort, fmtWhen, todayIso, nl2br, errText, ICON, appLink, SPD } = ctx;
  const me = () => ctx.me;
  const publicTypes = new Set(['Öffentlich', 'Rat']);
  const siteUrl = () => new URL((SPD.base || '.') + '/', location.href).href.replace(/\/$/, '');

  // ---------- Newsletter ----------
  async function newsletter(panel) {
    const [archiv] = await Promise.all([db.list('Newsletter', { desc: '_createdDate', limit: 30 }).catch(() => [])]);
    const status = archiv.find(a => a.ziel === 'status'); const ausgaben = archiv.filter(a => a.ziel !== 'status');
    const news = (SPD.news || []).slice(0, 8), events = (SPD.events || []).filter(e => e.date >= todayIso()).slice(0, 10);
    const smtp = SPD.app?.smtp;
    panel.innerHTML = `${sectionHead('Newsletter', 'Beiträge und Termine per E-Mail – an Mitglieder oder an alle Abonnent*innen')}
    ${smtp === false ? '<p class="note note-info">Der E-Mail-Versand ist noch nicht eingerichtet (SMTP-Zugang in der .env des Push-Dienstes). Du kannst den Newsletter trotzdem zusammenstellen – er wird verschickt, sobald der Zugang da ist.</p>' : ''}
    <form class="form mb-form nl-form" id="f-nl" novalidate>
      <div class="field"><label for="nl-betreff">Betreff</label><input id="nl-betreff" type="text" required maxlength="100" placeholder="z. B. SPD Soltau – Neues aus dem Rat, Oktober"></div>
      <div class="field"><label for="nl-vorwort">Persönliche Zeilen vorweg</label><textarea id="nl-vorwort" rows="4" placeholder="Liebe Mitglieder, …"></textarea></div>
      <div class="field"><span class="field-label">Beiträge mitschicken</span><div class="nl-liste">${news.map(n => `<label class="check"><input type="checkbox" name="beitrag" value="${esc(n.slug)}" ${news.indexOf(n) < 3 ? 'checked' : ''}> <span>${esc(n.title)} <span class="muted">· ${esc(fmtShort(n.date))}</span></span></label>`).join('') || '<span class="small muted">Keine Beiträge.</span>'}</div></div>
      <div class="field"><span class="field-label">Termine mitschicken</span><div class="nl-liste">${events.map(e => `<label class="check"><input type="checkbox" name="termin" value="${esc(e.id)}" data-typ="${esc(e.typ || 'Öffentlich')}" ${events.indexOf(e) < 4 ? 'checked' : ''}> <span>${esc(fmtShort(e.date))} ${esc(e.title)} <span class="muted">· ${esc(e.typ || '')}</span></span></label>`).join('') || '<span class="small muted">Keine Termine.</span>'}</div></div>
      <div class="field"><label for="nl-ziel">An wen?</label><select id="nl-ziel"><option value="mitglieder">Alle Mitglieder (E-Mail-Adressen der Mitgliederkonten)</option><option value="abonnenten">Abonnent*innen von „Nichts verpassen“${status ? ` (${status.empfaenger || 0})` : ''} – nur öffentliche Inhalte</option><option value="beide">Beide</option></select></div>
      <p class="small muted">Bei Abonnent*innen werden interne Termine automatisch weggelassen. Jede E-Mail enthält einen Abmelde-Link.</p>
      <p class="note" id="nl-msg" hidden></p>
      <div class="mb-actions"><button class="btn btn-line" type="button" id="nl-vorschau">Vorschau</button><button class="btn btn-rot" type="submit">Verschicken</button></div>
      <div id="nl-preview" class="nl-preview" hidden></div>
    </form>
    ${ausgaben.length ? `<section class="mb-sub">${sectionHead('Verschickt')}<div class="doc-list">${ausgaben.map(a => `<article class="doc"><div class="doc-body"><b>${esc(a.betreff || a.title)}</b><p class="small muted">${esc(fmtWhen(a.gesendetAm || a._createdDate))} · ${esc({ mitglieder: 'Mitglieder', abonnenten: 'Abonnent*innen', beide: 'Mitglieder + Abonnent*innen', presse: 'Presse' }[a.ziel] || a.ziel)} · ${a.empfaenger || 0} Empfänger · ${esc(a.von || '')}</p></div></article>`).join('')}</div></section>` : ''}`;
    const lesen = () => {
      const ziel = $('#nl-ziel', panel).value;
      const beitraege = $$('input[name=beitrag]:checked', panel).map(c => c.value);
      const termine = $$('input[name=termin]:checked', panel).filter(c => ziel === 'mitglieder' || publicTypes.has(c.dataset.typ)).map(c => c.value);
      return { betreff: $('#nl-betreff', panel).value.trim(), vorwort: $('#nl-vorwort', panel).value.trim(), beitraege, termine, ziel };
    };
    const vorschau = v => {
      const ns = news.filter(n => v.beitraege.includes(n.slug)), es = events.filter(e => v.termine.includes(e.id));
      return `<div class="nl-mail"><div class="nl-mail-kopf">SPD Soltau · Aus Liebe zu Soltau</div><h3>${esc(v.betreff || 'Betreff')}</h3>${v.vorwort ? `<p>${nl2br(v.vorwort)}</p>` : ''}
        ${ns.length ? `<h4>Aktuelles</h4>${ns.map(n => `<p><b>${esc(n.title)}</b><br>${esc(n.teaser || '')}<br><a href="${esc(siteUrl() + '/aktuelles/' + n.slug + '/')}">Weiterlesen</a></p>`).join('')}` : ''}
        ${es.length ? `<h4>Termine</h4>${es.map(e => `<p><b>${esc(fmtShort(e.date))}</b> ${esc(e.title)}${e.zeit ? ', ' + esc(e.zeit) : ''}${e.ort ? ' · ' + esc(e.ort) : ''}</p>`).join('')}` : ''}
        <p class="small muted">SPD Ortsverein Soltau · Am Bahnhof 1t · 29614 Soltau · <a href="#">Abmelden</a></p></div>`;
    };
    $('#nl-vorschau', panel).addEventListener('click', () => { const pv = $('#nl-preview', panel); pv.hidden = false; pv.innerHTML = vorschau(lesen()); pv.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    $('#f-nl', panel).addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
      const v = lesen(); const btn = f.querySelector('[type=submit]'); busy(btn, true);
      if (!v.beitraege.length && !v.termine.length && !v.vorwort) { msg($('#nl-msg', panel), 'Bitte mindestens ein paar Zeilen, einen Beitrag oder einen Termin auswählen.'); busy(btn, false); return; }
      try {
        await db.insert('Aktionen', { title: `Newsletter: ${v.betreff}`, typ: 'newsletter', payload: JSON.stringify(v), status: 'offen', von: me().name });
        msg($('#nl-msg', panel), DEMO ? 'In der echten App verschickt der Push-Dienst den Newsletter in den nächsten Minuten.' : 'Eingereicht – der Push-Dienst verschickt den Newsletter in den nächsten Minuten. Er erscheint dann unten unter „Verschickt“.', 'ok');
      } catch (err) { msg($('#nl-msg', panel), 'Nicht gespeichert: ' + errText(err)); }
      busy(btn, false);
    });
  }

  // ---------- Presse ----------
  async function presse(panel) {
    const kontakte = (await db.list('Pressekontakte', { asc: 'redaktion', limit: 200 }).catch(() => []));
    const news = (SPD.news || []).slice(0, 10);
    const gesendet = (await db.list('Newsletter', { desc: '_createdDate', limit: 30 }).catch(() => [])).filter(a => a.ziel === 'presse');
    panel.innerHTML = `${sectionHead('Presse', 'Kontakte der Redaktionen und Pressemitteilungen aus einem Beitrag')}
    <div class="mb-grid">
      <div>
        <h4 class="doc-cat">Pressemitteilung verschicken</h4>
        <form class="form mb-form" id="f-pm" novalidate>
          <div class="field"><label for="pm-beitrag">Beitrag</label><select id="pm-beitrag">${news.map(n => `<option value="${esc(n.slug)}">${esc(n.title)}</option>`).join('') || '<option value="">(keine Beiträge)</option>'}</select></div>
          <div class="field"><label for="pm-anschreiben">Anschreiben (steht über dem Beitrag)</label><textarea id="pm-anschreiben" rows="4">Sehr geehrte Damen und Herren,

anbei eine Pressemitteilung der SPD Soltau. Für Rückfragen stehe ich gern zur Verfügung.

Mit freundlichen Grüßen
${esc(me().name)}</textarea></div>
          <p class="small muted">Geht als einzelne E-Mail an jeden Kontakt (${kontakte.length}), mit Überschrift, Anriss, Text und Link zum Beitrag.</p>
          <p class="note" id="pm-msg" hidden></p>
          <div class="mb-actions"><button class="btn btn-rot" type="submit" ${kontakte.length && news.length ? '' : 'disabled'}>An ${kontakte.length} Kontakte schicken</button>${kontakte.length ? `<button class="btn btn-line btn-sm" type="button" id="pm-kopieren">Adressen kopieren</button>` : ''}</div>
        </form>
        ${gesendet.length ? `<section class="mb-sub">${sectionHead('Verschickt')}<div class="doc-list">${gesendet.map(a => `<article class="doc"><div class="doc-body"><b>${esc(a.betreff || a.title)}</b><p class="small muted">${esc(fmtWhen(a.gesendetAm || a._createdDate))} · ${a.empfaenger || 0} Kontakte · ${esc(a.von || '')}</p></div></article>`).join('')}</div></section>` : ''}
      </div>
      <div class="mb-aside">
        <div class="mb-card" id="pk-card">
          <h3>Kontakte</h3>
          ${kontakte.length ? `<div class="pk-liste">${kontakte.map(k => `<div class="pk" data-id="${esc(k._id)}"><b>${esc(k.name || k.redaktion)}</b><span class="small muted">${esc(k.redaktion || '')}${k.email ? ' · ' + esc(k.email) : ''}${k.telefon ? ' · ' + esc(k.telefon) : ''}</span>${k.notiz ? `<span class="small">${esc(k.notiz)}</span>` : ''}<button type="button" class="linkbtn" data-pk-del>entfernen</button></div>`).join('')}</div>` : '<p class="small muted">Noch keine Kontakte – Böhme-Zeitung, Heidekurier, NDR … hier eintragen.</p>'}
          <details class="mb-details"><summary>Kontakt hinzufügen</summary>
            <form class="form mb-form" id="f-pk" novalidate>
              <div class="field"><label for="pk-red">Redaktion</label><input id="pk-red" type="text" required placeholder="z. B. Böhme-Zeitung"></div>
              <div class="field"><label for="pk-name">Ansprechpartner*in</label><input id="pk-name" type="text" placeholder="Name"></div>
              <div class="field"><label for="pk-mail">E-Mail</label><input id="pk-mail" type="email" required placeholder="redaktion@…"></div>
              <div class="field"><label for="pk-tel">Telefon</label><input id="pk-tel" type="tel"></div>
              <div class="field"><label for="pk-notiz">Notiz</label><input id="pk-notiz" type="text" placeholder="z. B. Redaktionsschluss Di 16 Uhr"></div>
              <p class="note" hidden></p>
              <div class="mb-actions"><button class="btn btn-schwarz btn-sm" type="submit">Speichern</button></div>
            </form>
          </details>
        </div>
      </div>
    </div>`;
    $('#f-pk', panel).addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
      const btn = f.querySelector('[type=submit]'); busy(btn, true);
      try { await db.insert('Pressekontakte', { title: $('#pk-red', panel).value.trim(), redaktion: $('#pk-red', panel).value.trim(), name: $('#pk-name', panel).value.trim(), email: $('#pk-mail', panel).value.trim(), telefon: $('#pk-tel', panel).value.trim(), notiz: $('#pk-notiz', panel).value.trim(), von: me().name }); presse(panel); }
      catch (err) { msg(f.querySelector('.note'), 'Nicht gespeichert: ' + errText(err)); busy(btn, false); }
    });
    panel.addEventListener('click', async e => {
      const d = e.target.closest('[data-pk-del]'); if (d) { if (!confirm('Kontakt entfernen?')) return; try { await db.remove('Pressekontakte', d.closest('.pk').dataset.id); presse(panel); } catch (err) { alert(errText(err)); } return; }
      if (e.target.closest('#pm-kopieren')) { try { await navigator.clipboard.writeText(kontakte.map(k => k.email).filter(Boolean).join(', ')); msg($('#pm-msg', panel), 'Adressen kopiert – für dein E-Mail-Programm.', 'ok'); } catch (err) { msg($('#pm-msg', panel), kontakte.map(k => k.email).join(', '), 'info'); } }
    });
    $('#f-pm', panel).addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; const btn = f.querySelector('[type=submit]'); busy(btn, true);
      const n = news.find(x => x.slug === $('#pm-beitrag', panel).value); if (!n) { busy(btn, false); return; }
      try {
        await db.insert('Aktionen', { title: `Pressemitteilung: ${n.title}`, typ: 'presse', payload: JSON.stringify({ slug: n.slug, betreff: `Pressemitteilung SPD Soltau: ${n.title}`, anschreiben: $('#pm-anschreiben', panel).value.trim(), empfaenger: kontakte.map(k => ({ email: k.email, name: k.name, redaktion: k.redaktion })) }), status: 'offen', von: me().name });
        msg($('#pm-msg', panel), DEMO ? 'In der echten App verschickt der Push-Dienst die Pressemitteilung in den nächsten Minuten.' : 'Eingereicht – der Push-Dienst verschickt die E-Mails in den nächsten Minuten.', 'ok');
      } catch (err) { msg($('#pm-msg', panel), 'Nicht gespeichert: ' + errText(err)); }
      busy(btn, false);
    });
  }
  return { newsletter, presse };
}
