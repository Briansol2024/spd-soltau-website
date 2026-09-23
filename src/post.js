// Post: Kurznachrichten von Mitglied zu Mitglied – immer zwischen genau zwei Personen.
// Jede Nachricht liegt zweimal in der Sammlung „Postfach“: einmal beim Absender (richtung 'aus'),
// einmal beim Empfänger (richtung 'ein'). Lesen kann eine Zeile nur, wem sie gehört.
// Die Kopie für den Empfänger legt der Push-Dienst an (Auftrag „post“) – deshalb dauert die
// Zustellung bis zu fünf Minuten; so lange steht beim Absender „wird zugestellt“.
export function makePost(ctx) {
  const { db, esc, $, $$, msg, busy, route, sectionHead, fmtWhen, nl2br, ICON, ich, errText, leute, DEMO } = ctx;
  let zeilen = null;

  const laden = async () => (zeilen = await db.list('Postfach', { desc: '_createdDate', limit: 500 }).catch(() => []));
  const wann = r => r.gesendetAm || r._createdDate;
  const name = id => (leute().find(p => p.memberId === id) || {}).name || '';

  // Alle Nachrichten nach Gesprächspartner sortieren
  function faeden(rows) {
    const map = new Map();
    for (const r of rows) {
      if (!r.partnerId) continue;
      if (!map.has(r.partnerId)) map.set(r.partnerId, { id: r.partnerId, name: r.partnerName || name(r.partnerId) || 'Mitglied', rows: [] });
      map.get(r.partnerId).rows.push(r);
    }
    const out = [...map.values()];
    for (const f of out) {
      f.rows.sort((a, b) => String(wann(a)).localeCompare(String(wann(b))));
      f.letzte = f.rows[f.rows.length - 1];
      f.ungelesen = f.rows.filter(r => r.richtung === 'ein' && !r.gelesen).length;
    }
    return out.sort((a, b) => String(wann(b.letzte)).localeCompare(String(wann(a.letzte))));
  }

  async function badge() {
    const rows = zeilen || await laden();
    return rows.filter(r => r.richtung === 'ein' && !r.gelesen).length;
  }

  // ---------- Übersicht ----------
  async function sec(v) {
    const rows = await laden();
    const partnerId = (location.hash.split('/')[1] || '').trim();
    if (partnerId) return faden(v, rows, partnerId);

    const liste = faeden(rows);
    const mail = await mailWunsch();
    const andere = leute().filter(p => p.memberId && p.memberId !== ich().id && p.status !== 'inaktiv');
    v.innerHTML = `
    ${sectionHead('Post', 'Kurznachrichten zwischen dir und einem anderen Mitglied')}
    <label class="post-mail"><input type="checkbox" id="post-mail" ${mail ? 'checked' : ''}> Neue Nachrichten auch per E-Mail bekommen</label>
    <details class="mb-details post-neu" id="post-neu">
      <summary>Neue Nachricht</summary>
      <form class="form mb-form" id="f-post" novalidate>
        <div class="field"><label for="post-an">An wen?</label>
          <select id="post-an" name="an" required>
            <option value="">– bitte wählen –</option>
            ${andere.map(p => `<option value="${esc(p.memberId)}">${esc(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field"><label for="post-text">Nachricht</label><textarea id="post-text" name="text" rows="4" required maxlength="1500" placeholder="Kurz Bescheid geben …"></textarea></div>
        <p class="note" hidden></p>
        <div class="mb-actions"><button class="btn btn-rot btn-sm" type="submit">Senden</button></div>
      </form>
    </details>
    ${liste.length ? `<div class="post-liste">${liste.map(f => `<a class="post-faden-zeile${f.ungelesen ? ' neu' : ''}" href="#post/${esc(f.id)}">
      <span class="post-avatar" aria-hidden="true">${esc(initialen(f.name))}</span>
      <span class="post-mitte"><b>${esc(f.name)}</b><span class="post-vorschau">${esc(kurz(f.letzte))}</span></span>
      <span class="post-rechts"><span class="small muted">${esc(fmtWhen(wann(f.letzte)))}</span>${f.ungelesen ? `<b class="post-zahl">${f.ungelesen}</b>` : ''}</span>
    </a>`).join('')}</div>`
      : '<p class="muted">Noch keine Nachrichten. Schreib die erste – oben auf „Neue Nachricht“.</p>'}
    <p class="small muted post-hinweis">Nachrichten sind immer nur zwischen euch beiden sichtbar. Die Zustellung übernimmt der Dienst der App – das dauert bis zu fünf Minuten. E-Mail-Adressen und Telefonnummern bleiben verborgen.</p>`;

    $('#post-mail')?.addEventListener('change', async e => {
      const an = e.target.checked;
      try { await mailWunschSetzen(an); msg(null, ''); } catch (err) { e.target.checked = !an; alert('Nicht gespeichert: ' + errText(err)); }
    });
    $('#f-post')?.addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
      const fd = new FormData(f), an = fd.get('an'), text = String(fd.get('text')).trim();
      const btn = f.querySelector('[type=submit]'); busy(btn, true);
      try {
        await senden(an, (andere.find(p => p.memberId === an) || {}).name || 'Mitglied', text);
        location.hash = '#post/' + an; route();
      } catch (err) { msg(f.querySelector('.note'), 'Nicht gesendet: ' + errText(err)); busy(btn, false); }
    });
  }

  // ---------- Ein Gespräch ----------
  async function faden(v, rows, partnerId) {
    const alle = rows.filter(r => r.partnerId === partnerId).sort((a, b) => String(wann(a)).localeCompare(String(wann(b))));
    const partnerName = alle[0]?.partnerName || name(partnerId) || 'Mitglied';
    v.innerHTML = `
    <p class="post-zurueck"><a class="linkbtn" href="#post">← Alle Nachrichten</a></p>
    ${sectionHead(partnerName, 'Nur ihr beide seht diese Nachrichten')}
    <div class="post-faden">
      ${alle.length ? alle.map(r => `<div class="post-b ${r.richtung === 'aus' ? 'aus' : 'ein'}">
        <p>${nl2br(esc(r.text || ''))}</p>
        <span class="post-zeit">${esc(fmtWhen(wann(r)))}${r.richtung === 'aus' ? (r.zugestellt ? ' · zugestellt' : ' · wird zugestellt …') : ''}</span>
      </div>`).join('') : '<p class="muted">Noch nichts geschrieben.</p>'}
    </div>
    <form class="form mb-form post-form" id="f-faden" novalidate>
      <div class="field"><label for="faden-text">Antworten</label><textarea id="faden-text" name="text" rows="3" required maxlength="1500" placeholder="Nachricht an ${esc(partnerName)} …"></textarea></div>
      <p class="note" hidden></p>
      <div class="mb-actions"><button class="btn btn-rot btn-sm" type="submit">Senden</button></div>
    </form>`;

    $('#f-faden').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target; if (!f.checkValidity()) { f.reportValidity(); return; }
      const text = String(new FormData(f).get('text')).trim();
      const btn = f.querySelector('[type=submit]'); busy(btn, true);
      try { await senden(partnerId, partnerName, text); route(); }
      catch (err) { msg(f.querySelector('.note'), 'Nicht gesendet: ' + errText(err)); busy(btn, false); }
    });

    // Gelesen-Vermerke nachziehen
    const neu = alle.filter(r => r.richtung === 'ein' && !r.gelesen);
    if (neu.length) {
      for (const r of neu) await db.update('Postfach', { ...r, gelesen: true }).catch(() => {});
      zeilen = null;
      ctx.badgesNeu?.();
    }
  }

  // ---------- Senden: eigene Kopie sofort, Zustellung über den Dienst ----------
  async function senden(an, anName, text) {
    const nachrichtId = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
    const gesendetAm = new Date().toISOString();
    await db.insert('Postfach', { richtung: 'aus', partnerId: an, partnerName: anName, text, gelesen: true, zugestellt: false, nachrichtId, gesendetAm, title: `An ${anName}` });
    await db.insert('Aktionen', { title: `Post an ${anName}`, typ: 'post', payload: JSON.stringify({ an, anName, text, nachrichtId, gesendetAm, vonName: ich().name }), status: 'offen', von: ich().name });
    zeilen = null;
  }

  // ---------- Haken „auch per E-Mail“ (steht im eigenen Profil) ----------
  async function meinProfil() {
    const r = await db.list('Profile', { eq: { memberId: ich().id }, limit: 1 }).catch(() => []);
    return r[0] || null;
  }
  async function mailWunsch() { return !!(await meinProfil())?.postMail; }
  async function mailWunschSetzen(an) {
    const p = await meinProfil();
    if (p) await db.update('Profile', { ...p, postMail: an });
    else await db.insert('Profile', { memberId: ich().id, name: ich().name, title: ich().name, postMail: an, verzeichnisSichtbar: false });
  }

  const kurz = r => `${r.richtung === 'aus' ? 'Du: ' : ''}${String(r.text || '').replace(/\s+/g, ' ').slice(0, 70)}${String(r.text || '').length > 70 ? '…' : ''}`;
  const initialen = n => String(n || '').split(/\s+/).map(x => x[0]).filter(Boolean).join('').slice(0, 2).toUpperCase() || '·';

  return { sec, badge, neuLaden: () => { zeilen = null; } };
}
