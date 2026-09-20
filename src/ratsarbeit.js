// Ratsarbeit – der Working Space der Fraktion im Mitgliederbereich: Meine Aufgaben, Bereiche (Fraktion/Rat + vier Ausschüsse)
// mit Aufgaben und Dokumenten, „Alle Aufgaben“ nach Bereich oder Person, Anträge (Entwurf → Abstimmung in der Fraktion →
// eingereicht → entschieden, mit Druck-/PDF-Ansicht und Übergabe an „Beiträge“). Ohne Chats – gesprochen wird in WhatsApp.
// Sichtbar nur für Mitglieder der Gruppe „Fraktion“ (Vorstand → Gruppen). Inhalte liegen verschlüsselt bei Wix, siehe lib/rat.mjs.
import { BEREICHE, bereichVon, DOK_ARTEN, TEIL_BYTES, MAX_DATEI, encryptBytes, decryptBytes } from './lib/rat.mjs';

export const GREMIEN = ['Rat der Stadt Soltau', 'Verwaltungsausschuss', 'Bauausschuss', 'Finanzausschuss', 'Sozialausschuss', 'Schulausschuss', 'Kulturausschuss', 'Feuerschutzausschuss'];
const ANTRAG_STATUS = [['entwurf', 'Entwurf'], ['abstimmung', 'In der Fraktion abstimmen'], ['eingereicht', 'Eingereicht'], ['beschlossen', 'Beschlossen'], ['abgelehnt', 'Abgelehnt'], ['zurueckgezogen', 'Zurückgezogen']];
const statusLabel = k => (ANTRAG_STATUS.find(x => x[0] === k) || [k, k])[1];
export function makeRatsarbeit(ctx) {
  const { db, store, DEMO, esc, $, $$, msg, busy, waHref, appLink, ICON, route, sectionHead, nl2br, schluessel } = ctx;
  const me = () => ctx.me, people = () => ctx.people, settings = () => ctx.settings;
  const state = { sicht: { gruppierung: 'bereich', erlZeigen: false }, timer: null, tasks: [], docs: [], antraege: [] };
  const key = () => schluessel.key('fraktion');
  const heute = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
  const inDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const fmtFrist = f => f ? new Date(f + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }) : '';
  const fmtTag = z => z ? new Date(z).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
  const fraktion = () => people().filter(p => settings().groups.fraktion.has(p.memberId));
  const inFraktion = () => !!settings()?.groups.fraktion.has(me().id);
  const nameOf = id => people().find(p => p.memberId === id)?.name || '';
  const vorname = n => String(n || '').split(' ')[0];
  const namen = t => (t.wer || []).map((id, i) => id === me().id ? 'Du' : vorname(nameOf(id) || (t.werNamen || [])[i] || '?')).join(', ');
  const nachFrist = (a, b) => (a.frist || '9').localeCompare(b.frist || '9');
  const groesse = n => n > 1e6 ? (n / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';

  // ---- Schlüssel: Vorschau ohne Verschlüsselung, sonst Fraktionsschlüssel dieses Geräts (src/schluessel.js) ----
  const encJson = obj => schluessel.encJson('fraktion', obj);
  const decJson = s => schluessel.decJson('fraktion', s);
  async function laden() {
    const [tasks, docs, antraege] = await Promise.all([db.list('RatAufgaben', { limit: 500 }).catch(() => []), db.list('RatDokumente', { desc: '_createdDate', limit: 500 }).catch(() => []), db.list('RatAntraege', { desc: '_createdDate', limit: 300 }).catch(() => [])]);
    state.tasks = await Promise.all(tasks.map(async t => ({ ...t, wer: t.wer || [], ...(await decJson(t.daten)) })));
    state.docs = await Promise.all(docs.map(async d => ({ ...d, ...(await decJson(d.daten)) })));
    state.antraege = await Promise.all(antraege.map(async a => ({ ...a, zustimmung: a.zustimmung || [], ...(await decJson(a.daten)) })));
    state.sitzungen = (await db.list('Ratsvorbereitung', { desc: 'sitzung', limit: 200 }).catch(() => [])).filter(r => r.b);
  }
  // Kommende Sitzungen eines Bereichs/Ausschusses – mit Sprung in den Sitzungsmodus
  const fmtKurz = s => { if (!s) return ''; const d = new Date(s + 'T12:00:00'); return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }); };
  const sitzungZeile = r => `<a class="rz-dok" href="#rat/fokus-${esc(r._id)}"><span class="rz-ico">${ICON.rat}</span><span class="rz-txt"><b>${esc(r.gremium || 'Sitzung')}${r.titel ? ' – ' + esc(r.titel) : ''}</b><small>${esc(fmtKurz(r.sitzung))}${r.zeit ? ' · ' + esc(r.zeit) + ' Uhr' : ''}${r.ort ? ' · ' + esc(r.ort) : ''} · ${(r.tops || []).length} Punkte · Sitzungsmodus</small></span></a>`;

  // ---- Bausteine ----
  const zeile = (t, mitBereich) => {
    const spaet = t.frist && t.frist < heute() && t.status !== 'erledigt';
    return `<div class="rz-zeile${t.status === 'erledigt' ? ' erl' : ''}" data-id="${esc(t._id)}"><button class="rz-hak" type="button" data-hak aria-label="${t.status === 'erledigt' ? 'Wieder öffnen' : 'Als erledigt abhaken'}">${t.status === 'erledigt' ? ICON.check : ''}</button><a class="rz-t" href="#ratsarbeit/t-${esc(t._id)}"><b>${esc(t.titel || 'Aufgabe')}</b><small class="${spaet ? 'spaet' : ''}">${mitBereich ? `<span class="rz-tag">${esc(bereichVon(t.b).name)}</span>` : ''}${esc(namen(t))}${t.frist ? ' · bis ' + fmtFrist(t.frist) + (spaet ? ' – überfällig' : '') : ''}</small></a></div>`;
  };
  const dokZeile = d => `<a class="rz-dok" href="#ratsarbeit/d-${esc(d._id)}"><span class="rz-ico${d.art === 'link' ? ' link' : ''}">${d.art === 'link' ? ICON.link : ICON.doc}</span><span class="rz-txt"><b>${esc(d.titel || 'Dokument')}</b><small>${esc(d.kat || '')} · ${d.art === 'link' ? 'Link' : esc(((d.name || '').split('.').pop() || 'Datei').toUpperCase()) + (d.groesse ? ' · ' + groesse(d.groesse) : '')} · ${esc(d.vonName || '')} · ${fmtTag(d._createdDate)}</small></span></a>`;
  const offen = id => state.tasks.filter(t => t.b === id && t.status !== 'erledigt').length;

  function start() {
    const meine = state.tasks.filter(t => t.wer.includes(me().id) && t.status !== 'erledigt').sort(nachFrist);
    const alleOffen = state.tasks.filter(t => t.status !== 'erledigt').length;
    return `<div class="rz-seite">
      ${sectionHead('Ratsarbeit', `Aufgaben und Dokumente der Fraktion – ${fraktion().length} Personen`)}
      <div class="rz-block">
        <h4 class="rz-h">Meine Aufgaben <span>${meine.length ? meine.length + ' offen' : 'nichts offen'}</span></h4>
        <div class="rz-liste">${meine.map(t => zeile(t, true)).join('') || '<div class="rz-leer">Du hast gerade nichts Offenes.</div>'}</div>
        <a class="btn btn-line rz-breit" href="#ratsarbeit/alle">${ICON.list}Alle Aufgaben der Fraktion (${alleOffen} offen)</a>
      </div>
      <div class="rz-block">
        <h4 class="rz-h">Anträge <span>${state.antraege.filter(a => ['entwurf', 'abstimmung'].includes(a.status)).length} in Arbeit</span></h4>
        <div class="rz-liste">${state.antraege.filter(a => ['entwurf', 'abstimmung'].includes(a.status)).slice(0, 3).map(antragZeile).join('') || '<div class="rz-leer">Kein Antrag in Arbeit.</div>'}</div>
        <a class="btn btn-line rz-breit" href="#ratsarbeit/antraege">${ICON.edit}Alle Anträge (${state.antraege.length})</a>
      </div>
      <div class="rz-block">
        <h4 class="rz-h">Bereiche / Ausschüsse</h4>
        ${BEREICHE.map(b => `<a class="rz-bereich${b.id === 'rat' ? ' rat' : ''}" href="#ratsarbeit/b-${b.id}"><span class="rz-kachel">${b.kachel}</span><span class="rz-txt"><b>${esc(b.name)}</b><small>${offen(b.id)} offene Aufgabe${offen(b.id) === 1 ? '' : 'n'} · ${state.docs.filter(d => d.b === b.id).length} Dokumente</small></span>${ICON.chev}</a>`).join('')}
      </div>
      <p class="small muted">Gesprochen wird weiter in WhatsApp – hier stehen nur Aufgaben und Dokumente. Alles liegt verschlüsselt bei Wix; lesen können es nur Geräte von Fraktionsmitgliedern.</p>
    </div>`;
  }
  function alle() {
    const offenL = state.tasks.filter(t => t.status !== 'erledigt').sort(nachFrist);
    const gruppen = state.sicht.gruppierung === 'person'
      ? fraktion().map(p => [p.name + (p.memberId === me().id ? ' (du)' : ''), offenL.filter(t => t.wer.includes(p.memberId))]).filter(g => g[1].length)
      : BEREICHE.map(b => [b.name, offenL.filter(t => t.b === b.id)]).filter(g => g[1].length);
    return `<div class="rz-seite">
      <p class="small rz-zurueck"><a href="#ratsarbeit">← Ratsarbeit</a></p>
      ${sectionHead('Alle Aufgaben', `Wer macht was bis wann – ${offenL.length} offen`)}
      <div class="rz-umschalt"><button type="button" class="chip" data-gruppe="bereich" aria-pressed="${state.sicht.gruppierung === 'bereich'}">Nach Bereich</button><button type="button" class="chip" data-gruppe="person" aria-pressed="${state.sicht.gruppierung === 'person'}">Nach Person</button></div>
      ${gruppen.map(([n, ts]) => `<div class="rz-gruppe"><h4 class="rz-g">${esc(n)} <span>${ts.length}</span></h4>${ts.map(t => zeile(t, state.sicht.gruppierung === 'person')).join('')}</div>`).join('') || '<div class="rz-leer">Nichts offen.</div>'}
      <button class="btn btn-rot rz-breit" type="button" data-neu="aufgabe">${ICON.plus}Neue Aufgabe</button>
    </div>`;
  }
  function bereich(id) {
    const b = bereichVon(id);
    const ts = state.tasks.filter(t => t.b === b.id), offenL = ts.filter(t => t.status !== 'erledigt').sort(nachFrist), erl = ts.filter(t => t.status === 'erledigt').sort((x, y) => String(y.erledigtAm || '').localeCompare(String(x.erledigtAm || '')));
    const ds = state.docs.filter(d => d.b === b.id);
    return `<div class="rz-seite" data-bereich="${b.id}">
      <p class="small rz-zurueck"><a href="#ratsarbeit">← Ratsarbeit</a></p>
      ${sectionHead(esc(b.name), esc(b.kind))}
      <div class="rz-block">
        <h4 class="rz-h">Aufgaben <span>${offenL.length} offen</span></h4>
        <div class="rz-liste">${offenL.map(t => zeile(t, false)).join('') || '<div class="rz-leer">Nichts offen.</div>'}</div>
        <button class="btn btn-rot rz-breit" type="button" data-neu="aufgabe">${ICON.plus}Neue Aufgabe</button>
        ${erl.length ? `<button class="linkbtn" type="button" data-erl>${state.sicht.erlZeigen ? 'Erledigte ausblenden' : `${erl.length} erledigte anzeigen`}</button>${state.sicht.erlZeigen ? `<div class="rz-liste">${erl.slice(0, 30).map(t => zeile(t, false)).join('')}</div>` : ''}` : ''}
      </div>
      ${(() => { const kommend = (state.sitzungen || []).filter(r => r.b === b.id && (r.sitzung || '') >= heute()).sort((x, y) => x.sitzung.localeCompare(y.sitzung)).slice(0, 3); return `<div class="rz-block">
        <h4 class="rz-h">Sitzungen <span>${kommend.length ? 'nächste ' + kommend.length : 'keine geplant'}</span></h4>
        <div class="rz-liste">${kommend.map(sitzungZeile).join('') || `<div class="rz-leer">Keine kommende Sitzung für ${esc(b.name)} eingetragen – unter „Sitzungen“ anlegen (Art: Ausschuss).</div>`}</div>
        <a class="btn btn-line rz-breit" href="#rat">${ICON.rat}Alle Sitzungen</a>
      </div>`; })()}
      <div class="rz-block">
        <h4 class="rz-h">Dokumente <span>${ds.length}</span></h4>
        <div class="rz-liste">${ds.map(dokZeile).join('') || '<div class="rz-leer">Noch keine Dokumente.</div>'}</div>
        <button class="btn btn-line rz-breit" type="button" data-neu="dok">${ICON.upload}Dokument hochladen oder verlinken</button>
      </div>
    </div>`;
  }

  // ---- Anträge der Fraktion ----
  const antragZeile = a => `<a class="rz-dok" href="#ratsarbeit/a-${esc(a._id)}"><span class="rz-ico${a.status === 'abstimmung' ? ' link' : ''}">${ICON.edit}</span><span class="rz-txt"><b>${esc(a.titel || 'Antrag')}</b><small>${esc(statusLabel(a.status))}${a.status === 'abstimmung' ? ` · ${a.zustimmung.length} dafür` : ''} · ${esc(a.gremium || '')}${a.sitzung ? ' · ' + fmtFrist(a.sitzung) : ''} · ${esc(a.vonName || '')}</small></span></a>`;
  function antraege() {
    const grp = (keys, titel) => { const l = state.antraege.filter(a => keys.includes(a.status)); return l.length ? `<div class="rz-gruppe"><h4 class="rz-g">${titel} <span>${l.length}</span></h4>${l.map(antragZeile).join('')}</div>` : ''; };
    return `<div class="rz-seite" data-antraege>
      <p class="small rz-zurueck"><a href="#ratsarbeit">← Ratsarbeit</a></p>
      ${sectionHead('Anträge', 'Entwurf → Abstimmung in der Fraktion → eingereicht → entschieden')}
      <button class="btn btn-rot rz-breit" type="button" data-neu="antrag">${ICON.plus}Neuer Antrag</button>
      ${grp(['abstimmung'], 'In der Fraktion abstimmen') + grp(['entwurf'], 'Entwürfe') + grp(['eingereicht'], 'Eingereicht') + grp(['beschlossen', 'abgelehnt', 'zurueckgezogen'], 'Entschieden') || '<div class="rz-leer">Noch kein Antrag. Der erste dauert fünf Minuten: Titel, Beschlussvorschlag, Begründung – fertig.</div>'}
      <p class="small muted">Ein Antrag wird hier geschrieben und in der Fraktion abgestimmt (Daumen hoch), dann als PDF gedruckt und bei der Verwaltung eingereicht. Mit „Als Beitrag vorbereiten“ wird daraus mit einem Klick der Entwurf für „Aktuelles“.</p>
    </div>`;
  }
  const antragText = a => `Antrag der SPD-Fraktion: ${a.titel}\n${a.gremium || ''}${a.sitzung ? ', Sitzung am ' + fmtTag(a.sitzung) : ''}\nBeschlussvorschlag: ${a.beschluss || ''}\nIn der App: ${appLink('#ratsarbeit/a-' + a._id)}`;
  function druckAntrag(a) {
    document.getElementById('druck')?.remove();
    const el = document.createElement('div'); el.id = 'druck'; el.className = 'druck';
    const heute = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' });
    el.innerHTML = `<div class="druck-kopf"><b>SPD-Fraktion im Rat der Stadt Soltau</b><span>Am Bahnhof 1t · 29614 Soltau · www.spd-soltau.de</span></div>
      <p class="druck-an">An den Bürgermeister der Stadt Soltau<br>zur Weiterleitung an ${esc(a.gremium || 'den Rat der Stadt Soltau')}</p>
      <p class="druck-datum">Soltau, ${heute}</p>
      <h1>Antrag${a.sitzung ? ` zur Sitzung am ${esc(fmtTag(a.sitzung))}` : ''}</h1>
      <h2>${esc(a.titel || '')}</h2>
      <h3>Beschlussvorschlag</h3><div class="druck-text">${nl2br(a.beschluss || '')}</div>
      <h3>Begründung</h3><div class="druck-text">${nl2br(a.begruendung || '')}</div>
      <p class="druck-unterschrift">Für die SPD-Fraktion<br><br><br>${esc(a.vonName || me().name)}</p>`;
    document.body.appendChild(el); document.body.classList.add('drucken');
    const fertig = () => { el.remove(); document.body.classList.remove('drucken'); window.removeEventListener('afterprint', fertig); };
    window.addEventListener('afterprint', fertig);
    setTimeout(() => window.print(), 50);
    setTimeout(fertig, 60000);
  }
  function antragBlatt(id) {
    const a = id ? state.antraege.find(x => x._id === id) : { b: 'rat', status: 'entwurf', gremium: GREMIEN[0], sitzung: '', titel: '', beschluss: '', begruendung: '', zustimmung: [] };
    if (!a) return;
    const dafuer = a.zustimmung.includes(me().id);
    const offen = ['entwurf', 'abstimmung'].includes(a.status);
    blatt(id ? 'Antrag' : 'Neuer Antrag', `
      <div class="field"><label for="an-titel">Worum geht es? (Betreff)</label><input id="an-titel" type="text" value="${esc(a.titel)}" placeholder="z. B. Mehr Bäume in der Marktstraße" maxlength="140"></div>
      <div class="mb-2">
        <div class="field"><label for="an-gremium">Gremium</label><input id="an-gremium" type="text" list="gremien-liste" value="${esc(a.gremium || '')}"><datalist id="gremien-liste">${GREMIEN.map(g => `<option value="${esc(g)}">`).join('')}</datalist></div>
        <div class="field"><label for="an-sitzung">Für die Sitzung am</label><input id="an-sitzung" type="date" value="${esc(a.sitzung || '')}"></div>
      </div>
      <div class="field"><label for="an-b">Bereich</label><select id="an-b">${BEREICHE.map(b => `<option value="${b.id}" ${b.id === a.b ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="an-beschluss">Beschlussvorschlag – was soll der Rat beschließen?</label><textarea id="an-beschluss" rows="4" placeholder="Der Rat der Stadt Soltau beschließt, …">${esc(a.beschluss || '')}</textarea></div>
      <div class="field"><label for="an-begr">Begründung</label><textarea id="an-begr" rows="6" placeholder="Warum ist das wichtig? Kurz und konkret.">${esc(a.begruendung || '')}</textarea></div>
      ${id ? `<p class="small muted">Status: <b>${esc(statusLabel(a.status))}</b>${a.status === 'abstimmung' ? ` · ${a.zustimmung.length} von ${fraktion().length} dafür${a.zustimmung.length ? ': ' + esc(a.zustimmung.map(x => vorname(nameOf(x))).join(', ')) : ''}` : ''} · angelegt von ${esc(a.vonName || '–')} am ${fmtTag(a._createdDate)}${a.eingereichtAm ? ` · eingereicht ${fmtTag(a.eingereichtAm)}` : ''}</p>` : ''}
      <div class="mb-actions">
        ${offen || !id ? `<button class="btn btn-rot" type="button" id="an-speichern">${id ? 'Speichern' : 'Antrag anlegen'}</button>` : ''}
        ${id && a.status === 'entwurf' ? `<button class="btn btn-schwarz btn-sm" type="button" data-status="abstimmung">In der Fraktion abstimmen</button>` : ''}
        ${id && a.status === 'abstimmung' ? `<button class="btn ${dafuer ? 'btn-schwarz' : 'btn-line'} btn-sm" type="button" id="an-dafuer">👍 ${dafuer ? 'Ich bin dafür' : 'Dafür stimmen'}</button><button class="btn btn-line btn-sm" type="button" data-status="eingereicht">Eingereicht ✓</button>` : ''}
        ${id && a.status === 'eingereicht' ? `<button class="btn btn-line btn-sm" type="button" data-status="beschlossen">Beschlossen</button><button class="btn btn-line btn-sm" type="button" data-status="abgelehnt">Abgelehnt</button>` : ''}
      </div>
      ${id ? `<div class="mb-actions">
        <button class="btn btn-line btn-sm" type="button" id="an-druck">${ICON.doc}Drucken / als PDF</button>
        <button class="btn btn-line btn-sm" type="button" id="an-beitrag">${ICON.edit}Als Beitrag vorbereiten</button>
        <button class="btn btn-line btn-sm share" type="button" id="an-teilen">${ctx.SHARE_ICON}Teilen</button>
        ${offen ? `<button class="linkbtn" type="button" data-status="zurueckgezogen">Zurückziehen</button>` : ''}<button class="linkbtn" type="button" id="an-loeschen">Löschen</button>
      </div>` : ''}`, el => {
      const lesen = () => ({ titel: $('#an-titel', el).value.trim(), gremium: $('#an-gremium', el).value.trim(), sitzung: $('#an-sitzung', el).value, b: $('#an-b', el).value, beschluss: $('#an-beschluss', el).value.trim(), begruendung: $('#an-begr', el).value.trim() });
      const rawA = x => { const { titel, beschluss, begruendung, unlesbar, ...rest } = x; return rest; };
      const speichern = async (extra = {}) => {
        const v = lesen(); if (!v.titel) { $('#an-titel', el).focus(); return; }
        const btn = $('#an-speichern', el); busy(btn, true);
        try {
          const data = { ...rawA(a), title: 'Antrag', b: v.b, gremium: v.gremium, sitzung: v.sitzung, status: a.status || 'entwurf', daten: await encJson({ titel: v.titel, beschluss: v.beschluss, begruendung: v.begruendung }), ...extra };
          if (id) await db.update('RatAntraege', data); else await db.insert('RatAntraege', { ...data, von: me().id, vonName: me().name, zustimmung: [] });
          blattZu(); await route();
        } catch (err) { msg($('#rz-msg', el), 'Nicht gespeichert: ' + ctx.errText(err)); busy(btn, false); }
      };
      $('#an-speichern', el)?.addEventListener('click', () => speichern());
      $$('[data-status]', el).forEach(b => b.addEventListener('click', () => speichern({ status: b.dataset.status, ...(b.dataset.status === 'eingereicht' ? { eingereichtAm: new Date().toISOString() } : {}) })));
      $('#an-dafuer', el)?.addEventListener('click', () => { const z = new Set(a.zustimmung); if (z.has(me().id)) z.delete(me().id); else z.add(me().id); speichern({ zustimmung: [...z] }); });
      $('#an-druck', el)?.addEventListener('click', () => druckAntrag({ ...a, ...lesen() }));
      $('#an-beitrag', el)?.addEventListener('click', () => { const v = lesen(); store.set('spd-beitrag-entwurf', { titel: `SPD beantragt: ${v.titel}`, teaser: (v.beschluss || '').slice(0, 280), text: `Die SPD-Fraktion hat ${v.gremium ? 'für ' + v.gremium : 'für den Rat'}${v.sitzung ? ' (Sitzung am ' + fmtTag(v.sitzung) + ')' : ''} folgenden Antrag gestellt:\n\n## Beschlussvorschlag\n\n${v.beschluss}\n\n## Begründung\n\n${v.begruendung}` }); blattZu(false); location.hash = '#beitraege'; });
      $('#an-teilen', el)?.addEventListener('click', () => ctx.shareText(antragText({ ...a, ...lesen() })));
      $('#an-loeschen', el)?.addEventListener('click', async () => { if (!confirm('Antrag wirklich löschen?')) return; try { await db.remove('RatAntraege', id); blattZu(); await route(); } catch (err) { msg($('#rz-msg', el), ctx.errText(err)); } });
      setTimeout(() => $('#an-titel', el).focus(), 60);
    });
  }

  // ---- Blatt (Aufgabe/Dokument/Antrag) – hängt am body, damit es über der App-Leiste liegt ----
  function blatt(titel, inner, wire) {
    blattZu(false);
    const el = document.createElement('div'); el.className = 'rz-blatt'; el.id = 'rz-blatt';
    el.innerHTML = `<div class="rz-blatt-in" role="dialog" aria-label="${esc(titel)}"><div class="rz-blatt-kopf"><b>${esc(titel)}</b><button type="button" class="mb-sheet-close" data-zu aria-label="Schließen">${ICON.close}</button></div><div class="rz-blatt-inhalt">${inner}<p class="note" id="rz-msg" hidden></p></div></div>`;
    document.body.appendChild(el); document.body.classList.add('sheet-open');
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-zu]')) blattZu(); });
    if (wire) wire(el);
  }
  function blattZu(zurueck = true) {
    document.getElementById('rz-blatt')?.remove(); document.body.classList.remove('sheet-open');
    if (zurueck && /^#ratsarbeit\/[tda]-/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search + (state.zurueckHash || '#ratsarbeit'));
  }
  const waAufgabe = t => `📌 Aufgabe (${bereichVon(t.b).name}): ${t.titel}\n${namen(t)}${t.frist ? ' · bis ' + fmtFrist(t.frist) : ''}\nIn der App: ${appLink('#ratsarbeit/t-' + t._id)}`;
  const raw = t => { const { titel, notiz, unlesbar, name, typ, url, ...rest } = t; return rest; };
  function aufgabeBlatt(id, bereichId) {
    const t = id ? state.tasks.find(x => x._id === id) : { b: bereichId || 'rat', titel: '', status: 'offen', wer: [me().id], frist: inDays(7), notiz: '' };
    if (!t) { msg($('#rz-msg'), 'Aufgabe nicht gefunden.'); return; }
    const pers = fraktion().map(p => `<label><input type="checkbox" name="wer" value="${esc(p.memberId)}" ${t.wer.includes(p.memberId) ? 'checked' : ''}>${esc(p.name)}${p.memberId === me().id ? ' (du)' : ''}</label>`).join('');
    blatt(id ? 'Aufgabe' : 'Neue Aufgabe', `
      <div class="field"><label for="a-titel">Was ist zu tun?</label><input id="a-titel" type="text" value="${esc(t.titel)}" placeholder="z. B. Antrag Radweg schreiben" maxlength="120"></div>
      <div class="field"><label for="a-b">Bereich</label><select id="a-b">${BEREICHE.map(b => `<option value="${b.id}" ${b.id === t.b ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Wer kümmert sich?</label><div class="rz-pers">${pers || '<span class="small muted">Noch niemand in der Gruppe Fraktion (Vorstand → Gruppen).</span>'}</div></div>
      <div class="field"><label for="a-frist">Bis wann?</label><input id="a-frist" type="date" value="${esc(t.frist || '')}"></div>
      <div class="field"><label for="a-text">Notiz (optional)</label><textarea id="a-text" rows="3" placeholder="Kurz, was wichtig ist">${esc(t.notiz || '')}</textarea></div>
      ${id ? `<p class="small muted">Angelegt von ${esc(t.vonName || '–')} am ${fmtTag(t._createdDate)}${t.status === 'erledigt' ? ` · erledigt ${fmtTag(t.erledigtAm)}` : ''}</p>` : ''}
      <div class="mb-actions"><button class="btn btn-rot" type="button" id="a-speichern">${id ? 'Speichern' : 'Aufgabe anlegen'}</button>${id ? `<button class="btn btn-line btn-sm share" type="button" id="a-wa">${ctx.SHARE_ICON}Teilen / erinnern</button>${t.status !== 'erledigt' ? `<button class="btn btn-line btn-sm" type="button" id="a-erl">${ICON.check}Erledigt</button>` : ''}<button class="linkbtn" type="button" id="a-loeschen">Löschen</button>` : ''}</div>`, el => {
      const lesen = () => ({ titel: $('#a-titel', el).value.trim(), b: $('#a-b', el).value, wer: $$('input[name=wer]:checked', el).map(x => x.value), frist: $('#a-frist', el).value, notiz: $('#a-text', el).value.trim() });
      const speichern = async (extra = {}) => {
        const v = lesen(); if (!v.titel) { $('#a-titel', el).focus(); return false; }
        const btn = $('#a-speichern', el); busy(btn, true);
        try {
          const data = { ...raw(t), title: 'Aufgabe', b: v.b, status: extra.status || t.status || 'offen', frist: v.frist, wer: v.wer, werNamen: v.wer.map(nameOf), daten: await encJson({ titel: v.titel, notiz: v.notiz }), ...extra };
          if (id) await db.update('RatAufgaben', data); else await db.insert('RatAufgaben', { ...data, von: me().id, vonName: me().name, erinnert: false });
          blattZu(); await route(); return true;
        } catch (err) { msg($('#rz-msg', el), 'Nicht gespeichert: ' + ctx.errText(err)); busy(btn, false); return false; }
      };
      $('#a-speichern', el).addEventListener('click', () => speichern());
      $('#a-wa', el)?.addEventListener('click', () => ctx.shareText(waAufgabe({ ...t, ...lesen() })));
      $('#a-erl', el)?.addEventListener('click', () => speichern({ status: 'erledigt', erledigtAm: new Date().toISOString() }));
      $('#a-loeschen', el)?.addEventListener('click', async () => { if (!confirm('Aufgabe wirklich löschen?')) return; try { await db.remove('RatAufgaben', id); blattZu(); await route(); } catch (err) { msg($('#rz-msg', el), ctx.errText(err)); } });
      setTimeout(() => $('#a-titel', el).focus(), 60);
    });
  }
  function dokBlatt(id, bereichId) {
    const d = id ? state.docs.find(x => x._id === id) : null;
    if (id && !d) return;
    if (d) {
      blatt(d.kat || 'Dokument', `<div><b class="rz-doktitel">${esc(d.titel || 'Dokument')}</b><p class="small muted">${d.art === 'link' ? 'Link' : esc(d.name || 'Datei') + (d.groesse ? ' · ' + groesse(d.groesse) : '')} · von ${esc(d.vonName || '–')} · ${fmtTag(d._createdDate)} · ${esc(bereichVon(d.b).name)}</p></div>
        <div class="mb-actions" id="d-aktionen">${d.art === 'link' ? `<a class="btn btn-rot" href="${esc(d.url || '#')}" target="_blank" rel="noopener">${ICON.link}Link öffnen</a>` : `<button class="btn btn-rot" type="button" id="d-laden">${ICON.doc}Datei öffnen</button>`}<button class="btn btn-line btn-sm share" type="button" data-share="${esc(`📄 ${d.titel} (${d.kat || 'Dokument'})${d.art === 'link' && d.url ? '\n' + d.url : ''}\nIn der App: ${appLink('#ratsarbeit/b-' + d.b)}`)}">${ctx.SHARE_ICON}Teilen</button>${d._owner === me().id || ctx.me.can('verwaltung') ? '<button class="linkbtn" type="button" id="d-loeschen">Entfernen</button>' : ''}</div>
        <div id="d-fertig" class="mb-actions" hidden></div>`, el => {
        $('#d-laden', el)?.addEventListener('click', async () => {
          const btn = $('#d-laden', el); busy(btn, true); msg($('#rz-msg', el), '');
          try {
            if (DEMO || !d.teile) { msg($('#rz-msg', el), 'In der Vorschau gibt es keine echte Datei – in der App öffnet sich hier das Dokument.', 'info'); busy(btn, false); return; }
            const teile = await db.list('RatDateiTeile', { eq: { dateiId: d.dateiId }, asc: 'nr', limit: 200 });
            if (teile.length !== d.teile) throw new Error(`Datei unvollständig (${teile.length} von ${d.teile} Teilen)`);
            const parts = [];
            for (const [i, teil] of teile.entries()) { msg($('#rz-msg', el), `Entschlüssele … Teil ${i + 1} von ${teile.length}`, 'info'); parts.push(await decryptBytes(key(), teil.daten)); }
            const blob = new Blob(parts, { type: d.typ || 'application/octet-stream' });
            const objUrl = URL.createObjectURL(blob);
            const file = new File([blob], d.name || 'Dokument', { type: blob.type });
            const kann = !!(navigator.share && navigator.canShare && navigator.canShare({ files: [file] }));
            $('#d-fertig', el).hidden = false;
            $('#d-fertig', el).innerHTML = `<a class="btn btn-rot" href="${objUrl}" download="${esc(d.name || 'Dokument')}" target="_blank" rel="noopener">${ICON.doc}Öffnen / speichern</a>${kann ? `<button class="btn btn-line" type="button" id="d-teilen">${ICON.share}Teilen</button>` : ''}`;
            $('#d-teilen', el)?.addEventListener('click', () => navigator.share({ files: [file], title: d.titel }).catch(() => {}));
            msg($('#rz-msg', el), 'Datei ist entschlüsselt und bereit.', 'ok'); btn.hidden = true;
          } catch (err) { msg($('#rz-msg', el), 'Datei konnte nicht geladen werden: ' + ctx.errText(err)); busy(btn, false); }
        });
        $('#d-loeschen', el)?.addEventListener('click', async () => {
          if (!confirm('Dokument wirklich entfernen?')) return;
          try {
            if (d.dateiId && !DEMO) for (const teil of await db.list('RatDateiTeile', { eq: { dateiId: d.dateiId }, limit: 200 })) await db.remove('RatDateiTeile', teil._id).catch(() => {});
            await db.remove('RatDokumente', id); blattZu(); await route();
          } catch (err) { msg($('#rz-msg', el), ctx.errText(err)); }
        });
      });
      return;
    }
    blatt('Dokument hinzufügen', `
      <div class="field"><label>Art</label><div class="rz-umschalt"><button type="button" class="chip" data-art="datei" aria-pressed="true">Datei hochladen</button><button type="button" class="chip" data-art="link" aria-pressed="false">Link</button></div></div>
      <div class="field" id="f-datei"><label for="d-file">Datei (PDF, Foto, Word … bis ${Math.round(MAX_DATEI / 1048576)} MB)</label><input id="d-file" type="file" accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.txt"></div>
      <div class="field" id="f-link" hidden><label for="d-url">Link</label><input id="d-url" type="url" placeholder="https://…"></div>
      <div class="field"><label for="d-titel">Titel</label><input id="d-titel" type="text" placeholder="z. B. Protokoll Ausschuss 14.10." maxlength="120"></div>
      <div class="mb-2">
        <div class="field"><label for="d-kat">Art des Dokuments</label><select id="d-kat">${DOK_ARTEN.map(k => `<option>${k}</option>`).join('')}</select></div>
        <div class="field"><label for="d-b">Bereich</label><select id="d-b">${BEREICHE.map(b => `<option value="${b.id}" ${b.id === (bereichId || 'rat') ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
      </div>
      <div class="mb-actions"><button class="btn btn-rot" type="button" id="d-speichern">Hinzufügen</button></div>`, el => {
      let art = 'datei';
      $$('[data-art]', el).forEach(x => x.addEventListener('click', () => { art = x.dataset.art; $$('[data-art]', el).forEach(y => y.setAttribute('aria-pressed', String(y === x))); $('#f-datei', el).hidden = art !== 'datei'; $('#f-link', el).hidden = art !== 'link'; }));
      $('#d-file', el).addEventListener('change', e => { const f = e.target.files[0]; if (f && !$('#d-titel', el).value) $('#d-titel', el).value = f.name.replace(/\.[^.]+$/, ''); });
      $('#d-speichern', el).addEventListener('click', async () => {
        const titel = $('#d-titel', el).value.trim(); if (!titel) { $('#d-titel', el).focus(); return; }
        const f = $('#d-file', el).files[0], url = $('#d-url', el).value.trim();
        const note = $('#rz-msg', el), btn = $('#d-speichern', el);
        if (art === 'link' && !/^https?:\/\//.test(url)) { msg(note, 'Bitte einen Link mit https:// eintragen.'); return; }
        if (art === 'datei' && !f) { msg(note, 'Bitte eine Datei auswählen.'); return; }
        if (art === 'datei' && f.size > MAX_DATEI) { msg(note, `Die Datei ist zu groß (${groesse(f.size)}) – bis ${Math.round(MAX_DATEI / 1048576)} MB sind möglich.`); return; }
        busy(btn, true); msg(note, '');
        try {
          const base = { title: 'Dokument', b: $('#d-b', el).value, kat: $('#d-kat', el).value, art, von: me().id, vonName: me().name };
          if (art === 'link') await db.insert('RatDokumente', { ...base, daten: await encJson({ titel, url }) });
          else {
            const dateiId = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2));
            let teile = 0;
            if (!DEMO) {
              const buf = new Uint8Array(await f.arrayBuffer()); teile = Math.ceil(buf.length / TEIL_BYTES) || 1;
              for (let i = 0; i < teile; i++) {
                msg(note, `Verschlüssele und lade hoch … Teil ${i + 1} von ${teile}`, 'info');
                await db.insert('RatDateiTeile', { title: `${dateiId} ${i}`, dateiId, nr: i, daten: await encryptBytes(key(), buf.subarray(i * TEIL_BYTES, (i + 1) * TEIL_BYTES)) });
              }
            }
            await db.insert('RatDokumente', { ...base, daten: await encJson({ titel, name: f.name, typ: f.type }), dateiId, teile, groesse: f.size });
          }
          blattZu(); await route();
        } catch (err) { msg(note, 'Nicht gespeichert: ' + ctx.errText(err)); busy(btn, false); }
      });
    });
  }

  // ---- Bereich rendern ----
  async function sec(v) {
    clearTimeout(state.timer);
    const sub = location.hash.split('/')[1] || '';
    const status = await schluessel.laden('fraktion').catch(e => { v.innerHTML = `<p class="note note-err">Schlüssel konnte nicht geprüft werden: ${esc(ctx.errText(e))}</p>`; return null; });
    if (!status) return;
    if (status !== 'ok') {
      v.innerHTML = `${sectionHead('Ratsarbeit', 'Aufgaben und Dokumente der Fraktion')}${schluessel.warteKarte(status, 'die Aufgaben, Dokumente und Anträge der Fraktion')}`;
      $('[data-schluessel-neu]', v)?.addEventListener('click', () => { schluessel.neu(); route(); });
      if (status === 'wartet') state.timer = setTimeout(() => { schluessel.vergessen(); if (location.hash.startsWith('#ratsarbeit')) route(); }, 30000);
      return;
    }
    await laden();
    // Aufgabe/Dokument (#ratsarbeit/t-… bzw. d-…) öffnet als Blatt über der zuletzt gezeigten Seite
    let hash = location.hash.split('?')[0];
    if (/^#ratsarbeit\/[tda]-/.test(hash)) hash = state.zurueckHash || '#ratsarbeit'; else state.zurueckHash = hash;
    const teil = hash.split('/')[1] || '';
    const seite = teil === 'alle' ? 'alle' : teil === 'antraege' ? 'antraege' : teil.startsWith('b-') ? 'bereich' : 'start';
    const bereichId = seite === 'bereich' ? teil.slice(2) : null;
    v.innerHTML = `<div class="rz" data-seite="${seite}"><div class="rz-links">${start()}</div><div class="rz-rechts">${seite === 'bereich' ? bereich(bereichId) : seite === 'antraege' ? antraege() : alle()}</div></div>`;
    v.onclick = async e => {
      const g = e.target.closest('[data-gruppe]'); if (g) { state.sicht.gruppierung = g.dataset.gruppe; route(); return; }
      const er = e.target.closest('[data-erl]'); if (er) { state.sicht.erlZeigen = !state.sicht.erlZeigen; route(); return; }
      const neu = e.target.closest('[data-neu]'); if (neu) { const bid = neu.closest('.rz-seite')?.dataset.bereich || null; if (neu.dataset.neu === 'aufgabe') aufgabeBlatt(null, bid); else if (neu.dataset.neu === 'antrag') antragBlatt(null); else dokBlatt(null, bid); return; }
      const hak = e.target.closest('[data-hak]');
      if (hak) {
        const row = hak.closest('.rz-zeile'); const t = state.tasks.find(x => x._id === row.dataset.id); if (!t) return;
        busy(hak, true);
        const erledigt = t.status !== 'erledigt';
        try { await db.update('RatAufgaben', { ...raw(t), status: erledigt ? 'erledigt' : 'offen', erledigtAm: erledigt ? new Date().toISOString() : '' }); await route(); }
        catch (err) { busy(hak, false); alert('Nicht gespeichert: ' + ctx.errText(err)); }
      }
    };
    // Aufgabe oder Dokument direkt per Link (#ratsarbeit/t-… bzw. d-…) – z. B. aus einer Push-Nachricht
    if (sub.startsWith('t-')) aufgabeBlatt(sub.slice(2), bereichId); else if (sub.startsWith('d-')) dokBlatt(sub.slice(2), bereichId); else if (sub.startsWith('a-')) antragBlatt(sub.slice(2));
  }

  // Zähler für die Navigation: meine offenen Aufgaben (nur Metadaten, ohne Entschlüsselung)
  async function badge() {
    if (!inFraktion()) return 0;
    try { return (await db.list('RatAufgaben', { eq: { status: 'offen' }, limit: 500 })).filter(t => (t.wer || []).includes(me().id)).length; } catch (e) { return 0; }
  }
  // Karte für die Startseite des Mitgliederbereichs
  async function startKarte() {
    if (!inFraktion()) return '';
    let mine = [];
    try { mine = (await db.list('RatAufgaben', { eq: { status: 'offen' }, limit: 500 })).filter(t => (t.wer || []).includes(me().id)).sort(nachFrist); } catch (e) { mine = []; }
    const titel = async t => (DEMO || key()) ? (await decJson(t.daten)).titel || 'Aufgabe' : `Aufgabe · ${bereichVon(t.b).name}`;
    const rows = await Promise.all(mine.slice(0, 3).map(async t => `<a class="start-ev" href="#ratsarbeit/t-${esc(t._id)}">📌 ${esc(await titel(t))} <span class="small muted">${t.frist ? 'bis ' + esc(fmtFrist(t.frist)) : ''}</span>${t.frist && t.frist < heute() ? '<span class="badge badge-mit">überfällig</span>' : ''}</a>`));
    return `<div class="mb-card"><h3>Ratsarbeit</h3><p class="small">${mine.length ? `<b>${mine.length}</b> offene Aufgabe${mine.length === 1 ? '' : 'n'} für dich` : 'Keine offenen Aufgaben für dich.'}</p>${rows.join('')}<a class="btn btn-schwarz btn-sm" href="#ratsarbeit">Zur Ratsarbeit</a></div>`;
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('rz-blatt')) blattZu(); });
  // Für die Suche (Wissen): Anträge entschlüsselt – nur mit Schlüssel
  async function antraegeFuerSuche() {
    if (!inFraktion() || (await schluessel.laden('fraktion')) !== 'ok') return [];
    const rows = await db.list('RatAntraege', { limit: 300 }).catch(() => []);
    return Promise.all(rows.map(async a => ({ ...a, ...(await decJson(a.daten)) })));
  }
  // Idee eines Mitglieds als Antragsentwurf übernehmen
  async function ideeZuAntrag(i) {
    if ((await schluessel.laden('fraktion')) !== 'ok') throw new Error('Fraktionsschlüssel auf diesem Gerät noch nicht freigeschaltet');
    await db.insert('RatAntraege', { title: 'Antrag', b: 'rat', gremium: GREMIEN[0], sitzung: '', status: 'entwurf', von: me().id, vonName: me().name, zustimmung: [], daten: await encJson({ titel: i.titel, beschluss: '', begruendung: `${i.text || ''}\n\n(Idee von ${i.vonName || 'einem Mitglied'})`.trim() }) });
  }
  // Alle Dokumente der Ratsarbeit mit entschlüsseltem Titel – für das Sitzungsformular (Auswahl) und den Sitzungsmodus (Nachschlagen)
  async function dokumenteListe() {
    if (!inFraktion() || (await schluessel.laden('fraktion')) !== 'ok') return [];
    const rows = await db.list('RatDokumente', { desc: '_createdDate', limit: 300 }).catch(() => []);
    return Promise.all(rows.map(async d => ({ ...d, ...(await decJson(d.daten)) })));
  }
  return { sec, badge, startKarte, inFraktion, blattZu, antraegeFuerSuche, ideeZuAntrag, dokumenteListe };
}
