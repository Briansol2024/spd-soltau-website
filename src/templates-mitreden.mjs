// Mitreden – die öffentlichen Angebote für Bürgerinnen und Bürger (Variante 2 der Startseite und die Seiten unter /mitreden/):
//   Video mit Anschluss, Was Soltau bewegt (Anliegen-Ranking), Fragen Sie uns, Sie entscheiden mit (Abstimmungen), Wo wird gebaut? (Baustellen).
// Inhalte pflegt der Vorstand im Mitgliederbereich (Vorstand → Mitreden); Zähler und Ergebnisse verdichtet der Push-Dienst.
import { esc, url, karteHtml } from './render.mjs';
import { pageHead, rathausKachel } from './templates.mjs';

const STAND = { neu: ['Neu', 'st-neu'], nachgefragt: ['Wir haben nachgefragt', 'st-nachgefragt'], antwort: ['Antwort da', 'st-antwort'] };
const ART_FARBE = { Baustelle: '#B7791F', Sperrung: '#E3000F', Geplant: '#005BA4' };
const datum = s => { const m = String(s || '').match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? `${m[3]}.${m[2]}.${m[1]}` : String(s || ''); };
const kapitel = s => String(s || '').split('\n').map(z => z.trim()).filter(Boolean).map(z => { const m = z.match(/^(\d+:\d\d)\s*[–\-·]?\s*(.+)$/); return m ? { zeit: m[1], name: m[2] } : { zeit: '', name: z }; });
const videoLink = (u, zeit) => { if (!u) return '#'; if (!zeit || !/youtu/.test(u)) return u; const [m, sek] = zeit.split(':').map(Number); return u + (u.includes('?') ? '&' : '?') + 't=' + (m * 60 + sek) + 's'; };
const PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4z" fill="currentColor" stroke="none"/></svg>';

// ---------- Startseite: Video mit Anschluss ----------
export function videoBlock(d) {
  const v = d.mitreden.start; if (!v.videoUrl) return '';
  const kap = kapitel(v.videoKapitel);
  return `
  <div class="wrap section-sm">
    <div class="video-block">
      <a class="video-karte" href="${esc(v.videoUrl)}" target="_blank" rel="noopener">
        ${v.videoBild ? `<img src="${esc(v.videoBild)}" alt="" loading="lazy">` : ''}
        <span class="tag">Neu · Video</span>
        <span class="video-play">${PLAY}</span>
      </a>
      <div class="video-text">
        <h2 class="title">${esc(v.videoTitel || 'Unser Video')}</h2>
        ${v.videoText ? `<p>${esc(v.videoText)}</p>` : ''}
        ${kap.length ? `<div class="chips">${kap.map(k => `<a class="chip" href="${esc(videoLink(v.videoUrl, k.zeit))}" target="_blank" rel="noopener">${k.zeit ? `<span class="chip-zeit">${esc(k.zeit)}</span>` : ''}${esc(k.name)}</a>`).join('')}</div>` : ''}
        <div class="video-anschluss">
          <b>Dazu habe ich …</b>
          <div class="chips">
            <a class="chip chip-rot" href="${url('/mitreden/fragen/')}?thema=${encodeURIComponent(v.videoTitel || 'Video')}">eine Frage</a>
            <a class="chip chip-rot" href="${url('/kontakt/')}?thema=${encodeURIComponent(v.videoTitel || 'Video')}">ein Anliegen</a>
            <a class="chip chip-rot" href="${url('/kontakt/')}?thema=${encodeURIComponent('Idee zu: ' + (v.videoTitel || 'Video'))}">eine Idee</a>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

// ---------- Startseite: Mitreden-Kacheln (ersetzt „Was können wir für Sie tun?“) ----------
export function mitredenBlock(d) {
  const m = d.mitreden; const top = m.anliegen[0]; const offen = m.umfragen.find(u => u.offen); const stimmen = offen ? offen.stimmen : 0;
  const zahl = (n, t) => `<span class="quick-zahl"><b>${esc(String(n))}</b><small>${esc(t)}</small></span>`;
  return `
  <div class="wrap section" id="mitreden">
    <div class="section-head" style="margin-bottom:24px"><h2 class="title">Informieren<br>&amp; Mitreden</h2><span class="small muted">Wissen, was läuft – und sich einmischen, ohne Parteibuch</span></div>
    <div class="quick quick-mitreden">
      <a href="${url('/mitreden/anliegen/')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8l-4 4z"/><path d="M8 9h8M8 13h5"/></svg><b>Was Soltau bewegt</b><small>${top ? `Meistunterstützt: ${esc(top.titel)}` : 'Anliegen aus der Stadt – und was wir daraus machen.'}</small>${top ? zahl(top.zaehler, 'Betrifft mich auch') : ''}</a>
      <a href="${url('/mitreden/fragen/')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2-2.5 4M12 17h.01"/><circle cx="12" cy="12" r="10"/></svg><b>Fragen Sie uns</b><small>Stellen Sie uns Ihre Frage – auch anonym. Antworten, gern im Video, lesen Sie hier.</small>${m.fragen.length ? zahl(m.fragen.length, 'beantwortet') : ''}</a>
      <a href="${url('/mitreden/abstimmung/')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg><b>Sie entscheiden mit</b><small>${offen ? esc(offen.frage) : 'Kleine Abstimmungen – Ihre Stimme zeigt uns, was Soltau wichtig ist.'}</small>${offen ? zahl(stimmen, 'Stimmen') : ''}</a>
      <a href="${url('/mitreden/baustellen/')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 20h20M4 20V10l8-6 8 6v10M9 20v-6h6v6"/></svg><b>Wo wird gebaut?</b><small>Baustellen und Sperrungen – warum, wie lange, Umleitung.</small>${m.baustellen.length ? zahl(m.baustellen.length, m.baustellen.length === 1 ? 'Baustelle heute' : 'Baustellen heute') : ''}</a>
      <a href="${url('/kontakt/')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg><b>Ich habe ein Anliegen</b><small>Schlagloch, Kita-Platz, Ratsbeschluss – schreiben Sie uns.</small></a>
      ${rathausKachel(d)}
    </div>
  </div>`;
}

// ---------- /mitreden/ – Übersicht ----------
export function mitredenPage(d) {
  return `${pageHead('Ohne Parteibuch', 'Informieren<br>&amp; Mitreden', 'Wissen, was in Soltau läuft – und sich einmischen: Anliegen unterstützen, Fragen stellen, abstimmen, Baustellen verstehen, ins Rathaus schauen.')}
  ${videoBlock(d)}
  ${mitredenBlock(d)}`;
}

// ---------- /mitreden/anliegen/ – Was Soltau bewegt ----------
export function anliegenPage(d) {
  const liste = d.mitreden.anliegen; const kats = [...new Set(liste.map(a => a.kategorie))];
  return `${pageHead('Was Soltau bewegt', 'Anliegen, die<br>viele teilen', 'Anliegen aus der Stadt, sortiert danach, wie viele sagen: Das betrifft mich auch. Kein Bürgerentscheid – ein Stimmungsbild. Wir lesen jedes Anliegen, antworten und sind für Sie da. Was wir erreichen, steht hier.')}
  <div class="wrap section">
    ${kats.length > 1 ? `<div class="chips filter-chips" id="anliegen-filter"><button type="button" class="chip" data-kat="" aria-pressed="true">Alle</button>${kats.map(k => `<button type="button" class="chip" data-kat="${esc(k)}" aria-pressed="false">${esc(k)}</button>`).join('')}</div>` : ''}
    <div class="anliegen-liste" id="anliegen-liste" data-typ="anliegen">
      ${liste.length ? liste.map((a, i) => { const [st, cls] = STAND[a.stand] || STAND.neu; return `
      <article class="anliegen" data-kat="${esc(a.kategorie)}" data-id="${esc(a.id)}">
        <div class="anliegen-kopf"><span class="rang">${i + 1}</span><div><h3>${esc(a.titel)}</h3><span class="small muted">${esc(a.kategorie)}${a.ort ? ' · ' + esc(a.ort) : ''} · seit ${esc(datum(a.datum))}</span></div></div>
        <div class="anliegen-zeile">
          <button type="button" class="btn btn-line btn-sm mit" data-unterstuetzen="${esc(a.id)}" data-typ="anliegen">Betrifft mich auch · <span data-zaehler="${esc(a.id)}">${a.zaehler}</span></button>
          <span class="stand ${cls}">${st}</span>
        </div>
        ${a.text || a.spd ? `<details class="anliegen-mehr"><summary>Worum es geht</summary>${a.text ? `<p>${esc(a.text)}</p>` : ''}${a.spd ? `<p class="spd-antwort"><b>SPD Soltau:</b> ${esc(a.spd)}</p>` : ''}</details>` : ''}
      </article>`; }).join('') : '<p class="muted">Noch kein Anliegen veröffentlicht. Sie machen den Anfang: Anliegen melden und unten das Häkchen setzen, dass es anonym hier erscheinen darf.</p>'}
    </div>
    <div class="mb-actions" style="margin-top:24px"><a class="btn btn-rot" href="${url('/kontakt/')}">Eigenes Anliegen melden</a></div>
    <p class="small muted">Veröffentlicht wird nur mit Ihrem Einverständnis (Häkchen im Formular), ohne Namen und ohne Adresse. Wenn Sie eine E-Mail angeben, melden wir uns bei Ihnen.</p>
  </div>`;
}

// ---------- /mitreden/fragen/ – Fragen Sie uns ----------
export function fragenPage(d) {
  const liste = d.mitreden.fragen;
  return `${pageHead('Fragen Sie uns', 'Ihre Frage<br>an uns', 'Stellen Sie uns Ihre Frage – auch anonym. Wir lesen jede und antworten; ausgewählte Fragen beantworten wir hier öffentlich, gern im Video.')}
  <div class="wrap section">
    <form class="form wix-form frage-form" id="form-frage" data-collection="Fragen" novalidate>
      <input type="hidden" name="quelle" id="frage-quelle" value="Website">
      <div class="form-fields">
        <div class="field"><label for="f-frage">Ihre Frage an die SPD Soltau</label><textarea id="f-frage" name="frage" required placeholder="z. B. Warum dauert der Radweg zur Bundeswehr so lange?"></textarea></div>
        <div class="form-row">
          <div class="field"><label for="f-name">Ihr Vorname <span class="muted">(optional)</span></label><input id="f-name" name="name" type="text" autocomplete="given-name"></div>
          <div class="field"><label for="f-email">E-Mail <span class="muted">(optional – für die Antwort)</span></label><input id="f-email" name="email" type="email" autocomplete="email"></div>
        </div>
        <label class="check"><input type="checkbox" name="anonym" value="ja"><span>Ohne Namen veröffentlichen</span></label>
        <p class="note" hidden></p>
        <button class="btn btn-rot" type="submit" style="justify-self:start">Frage abschicken</button>
        <p class="small muted">Wir antworten persönlich, wenn Sie eine E-Mail angeben; ausgewählte Fragen beantworten wir öffentlich, gern im Video. Veröffentlicht werden nur Frage und Vorname – oder gar kein Name.</p>
      </div>
      <p class="form-ok" hidden><b>Danke – Ihre Frage ist angekommen.</b> Wir lesen sie und melden uns; mit E-Mail-Adresse persönlich.</p>
    </form>
    <div class="section-head" style="margin-top:48px"><h2 class="title">Beantwortet</h2></div>
    <div class="fragen-liste" id="fragen-liste" data-typ="frage">
      ${liste.length ? liste.map(f => `
      <article class="frage-karte" data-id="${esc(f.id)}">
        <div class="frage-kopf"><span class="avatar">${esc((f.wer || 'A').charAt(0).toUpperCase())}</span><div><span class="small muted">${esc(f.wer)} · ${esc(datum(f.datum))}</span><h3>${esc(f.frage)}</h3></div></div>
        ${f.videoUrl ? `<a class="video-antwort" href="${esc(f.videoUrl)}" target="_blank" rel="noopener">${PLAY}<span>Video-Antwort ansehen</span></a>` : ''}
        ${f.antwort ? `<p class="spd-antwort"><b>${esc(f.antwortVon || 'SPD Soltau')}:</b> ${esc(f.antwort)}</p>` : ''}
        <button type="button" class="btn btn-line btn-sm mit" data-unterstuetzen="${esc(f.id)}" data-typ="frage">Interessiert mich auch · <span data-zaehler="${esc(f.id)}">${f.zaehler}</span></button>
      </article>`).join('') : '<p class="muted">Die ersten Antworten erscheinen hier, sobald wir sie veröffentlichen.</p>'}
    </div>
  </div>`;
}

// ---------- /mitreden/abstimmung/ – Sie entscheiden mit ----------
export function abstimmungPage(d) {
  const offen = d.mitreden.umfragen.filter(u => u.offen), vorbei = d.mitreden.umfragen.filter(u => !u.offen);
  const balken = u => { const sum = u.stimmen || u.ergebnis.reduce((a, b) => a + (Number(b) || 0), 0); return `<div class="balken-liste">${u.optionen.map((o, i) => { const n = Number(u.ergebnis[i]) || 0, p = sum ? Math.round(100 * n / sum) : 0; return `<div class="balken-zeile"><span>${esc(o)}</span><span class="balken"><i style="width:${p}%"></i></span><b>${p} %</b></div>`; }).join('')}<p class="small muted">${sum} ${sum === 1 ? 'Stimme' : 'Stimmen'}${u.maxWahl > 1 ? ' · Prozent = Anteil der Abstimmenden, die das angekreuzt haben' : ''}${u.offen ? ' · Zwischenstand, wird alle 30 Minuten aktualisiert' : ''}</p></div>`; };
  return `${pageHead('Sie entscheiden mit', 'Eine Frage,<br>Ihre Kreuze', 'Kleine Abstimmungen zu Dingen, die Soltau bewegen. Ihre Stimme zeigt uns, was den Menschen wichtig ist – das inspiriert unsere Arbeit. Und hier steht hinterher, was daraus wurde.')}
  <div class="wrap section">
    ${offen.length ? offen.map(u => `
    <article class="abstimmung" data-id="${esc(u.id)}" data-max="${u.maxWahl}" data-ergebnis="${esc(JSON.stringify(u.ergebnis))}" data-stimmen="${u.stimmen}">
      <span class="tag">Läuft${u.endetAm ? ' bis ' + esc(datum(u.endetAm)) : ''}</span>
      <h2 class="title" style="margin-top:12px">${esc(u.frage)}</h2>
      ${u.beschreibung ? `<p>${esc(u.beschreibung)}</p>` : ''}
      <p class="small muted" data-hinweis>${u.maxWahl > 1 ? `Bis zu ${u.maxWahl} Kreuze – einfach antippen.` : 'Eine Antwort antippen.'}</p>
      <div class="abst-opts">${u.optionen.map((o, i) => `<button type="button" class="abst-opt" data-i="${i}" aria-pressed="false"><span class="kreuz"></span><span>${esc(o)}</span></button>`).join('')}</div>
      <div class="mb-actions"><button type="button" class="btn btn-rot" data-abstimmen disabled>Abstimmen</button></div>
      <div class="abst-ergebnis" hidden>${balken(u)}</div>
    </article>`).join('') : '<p class="muted">Gerade läuft keine Abstimmung. Die nächste kündigen wir hier und auf Instagram an.</p>'}
    ${vorbei.length ? `<div class="section-head" style="margin-top:48px"><h2 class="title">Was daraus wurde</h2></div>
    ${vorbei.map(u => `<article class="abstimmung vorbei"><span class="small muted">${esc(datum(u.erstellt))}${u.endetAm ? ' bis ' + esc(datum(u.endetAm)) : ''}</span><h3>${esc(u.frage)}</h3>${balken(u)}${u.folge ? `<p class="spd-antwort"><b>Daraus wurde:</b> ${esc(u.folge)}</p>` : '<p class="small muted">Was daraus wird, schreiben wir hier, sobald es etwas zu berichten gibt.</p>'}</article>`).join('')}` : ''}
  </div>`;
}

// ---------- /mitreden/baustellen/ – Wo wird gebaut? ----------
export function baustellenPage(d) {
  const liste = d.mitreden.baustellen; const arten = [...new Set(liste.map(b => b.art))];
  const pins = liste.map((b, i) => ({ id: b.id, lat: b.lat, lng: b.lng, nr: i + 1, farbe: ART_FARBE[b.art] || '#E3000F', titel: b.titel }));
  return `${pageHead('Wo wird gebaut?', 'Baustellen<br>und Sperrungen', 'Was gerade gebaut oder gesperrt ist – und warum, wie lange, mit welcher Umleitung. Die Meldungen der Stadt Soltau kommen automatisch dazu; wo wir mehr wissen, ergänzen wir sie.')}
  <div class="wrap section">
    ${arten.length > 1 ? `<div class="chips filter-chips" id="baustellen-filter"><button type="button" class="chip" data-art="" aria-pressed="true">Alle</button>${arten.map(a => `<button type="button" class="chip" data-art="${esc(a)}" aria-pressed="false">${esc(a === 'Baustelle' ? 'Baustellen' : a === 'Sperrung' ? 'Sperrungen' : a)}</button>`).join('')}</div>` : ''}
    ${liste.length ? karteHtml(pins, { id: 'baustellen-karte', hoehe: 460 }) : ''}
    <div class="baustellen-liste" id="baustellen-liste">
      ${liste.length ? liste.map((b, i) => `
      <article class="baustelle" data-id="${esc(b.id)}" data-art="${esc(b.art)}" style="--pf:${ART_FARBE[b.art] || '#E3000F'}">
        <div class="baustelle-kopf"><span class="rang">${i + 1}</span><div><h3>${esc(b.titel)}</h3><span class="small muted">${esc(b.art)}${b.bis ? ' · ' + esc(b.bis) : ''}${!b.lat ? ' · ohne Kartenpunkt' : ''}</span></div></div>
        <details class="anliegen-mehr"><summary>Was, warum, Umleitung</summary>
          ${b.was ? `<p><b>Was:</b> ${esc(b.was)}</p>` : ''}${b.warum ? `<p><b>Warum:</b> ${esc(b.warum)}</p>` : ''}${b.umleitung ? `<p><b>Umleitung:</b> ${esc(b.umleitung)}</p>` : ''}
          ${b.spd ? `<p class="spd-antwort"><b>SPD Soltau:</b> ${esc(b.spd)}</p>` : ''}${b.quelle || b.url ? `<p class="small muted">Quelle: ${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.quelle || 'Stadt Soltau')}</a>` : esc(b.quelle)}${b.auto ? ' · automatisch übernommen' : ''}</p>` : ''}
        </details>
      </article>`).join('') : '<p class="muted">Gerade ist keine Baustelle eingetragen.</p>'}
    </div>
    <p class="small muted" style="margin-top:20px">Fehlt eine Baustelle oder stimmt etwas nicht? <a href="${url('/kontakt/')}?thema=Baustelle">Melden Sie es uns</a>. Karte: © OpenStreetMap-Mitwirkende, selbst gehostet – beim Besuch werden keine Daten an Dritte übertragen.</p>
  </div>`;
}
