// Seitenvorlagen – 1:1 nach Referenz-Entwurf D, mit echten Links und Inhalten aus dem Build.
import { esc, fmt, url, newsCard, eventRow, eventsGrouped, personCard, zielAccordion, zieleGrid, tickerItems, pollButtons, instaTiles, photo } from './render.mjs';

const NAV = [
  ['/aktuelles/', 'Aktuelles'], ['/termine/', 'Termine'], ['/fraktion/', 'Fraktion'], ['/ortsverein/', 'Ortsverein'],
  ['/ziele/', 'Ziele'], ['/mitmachen/', 'Mitmachen'], ['/kontakt/', 'Kontakt'],
];

export function layout({ site, path, title, description, content, clientData = {}, noindex = false, ogImage = null }) {
  const fullTitle = path === '/' ? `${site.name} – ${site.claim}` : `${title} – ${site.name}`;
  const canonical = site.url ? `${site.url}${path}` : '';
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || site.description)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}
${canonical ? `<link rel="canonical" href="${esc(canonical)}">` : ''}
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description || site.description)}">
<meta property="og:type" content="website">
${canonical ? `<meta property="og:url" content="${esc(canonical)}">` : ''}
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
<meta name="theme-color" content="#E3000F">
<link rel="icon" href="${url('/assets/favicon.svg')}" type="image/svg+xml">
<link rel="stylesheet" href="${url('/assets/fonts.css')}">
<link rel="stylesheet" href="${url('/assets/styles.css')}">
<script>window.SPD=${JSON.stringify({ base: url(''), ...clientData }).replace(/</g, '\\u003c')};</script>
</head>
<body>
<div id="site">
<header class="header">
  <div class="wrap">
    <a class="logo" href="${url('/index.html')}" aria-label="SPD Soltau – Startseite"><img src="${url('/assets/images/logo-spd-soltau.png')}" alt="SPD Soltau" width="96" height="64" decoding="async"></a>
    <nav class="nav" id="nav" aria-label="Hauptnavigation">
      ${NAV.map(([p, label]) => `<a href="${url(p)}"${path.startsWith(p) ? ' class="active" aria-current="page"' : ''}>${label}</a>`).join('\n      ')}
    </nav>
    <a class="btn btn-schwarz cta" href="${url('/mitmachen/')}">Mitglied werden</a>
    <button class="burger" id="burger" aria-expanded="false" aria-controls="nav" aria-label="Menü öffnen">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><path d="M3 7h18M3 12h18M3 17h18"/></svg>
    </button>
  </div>
</header>

<main>
${content}
</main>

<footer class="footer">
  <div class="ticker ticker-claim" aria-hidden="true"><div class="ticker-track">${'<span>Aus Liebe zu Soltau</span><span>Stärkste Kraft im Rat</span><span>Danke, Soltau</span><span>Jetzt beginnt die Arbeit</span>'.repeat(4)}</div></div>
  <div class="wrap">
    <div class="claim">Aus Liebe<br>zu Soltau.</div>
    <div class="grid">
      <div>
        <a class="logo" href="${url('/index.html')}" aria-label="SPD Soltau – Startseite"><img src="${url('/assets/images/logo-spd-soltau.png')}" alt="SPD Soltau" width="96" height="64" decoding="async"></a>
        <p style="margin-top:16px;max-width:36ch">SPD Ortsverein Soltau<br>Am Bahnhof 1t · 29614 Soltau</p>
        <p style="margin-top:12px"><a href="https://www.instagram.com/spd_soltau/" target="_blank" rel="noopener">Instagram @spd_soltau</a></p>
      </div>
      <div><h4>Politik</h4><ul><li><a href="${url('/aktuelles/')}">Aktuelles</a></li><li><a href="${url('/fraktion/')}">Ratsfraktion</a></li><li><a href="${url('/ziele/')}">10-Punkte-Plan</a></li><li><a href="${url('/termine/')}">Termine</a></li></ul></div>
      <div><h4>Ortsverein</h4><ul><li><a href="${url('/ortsverein/')}">Wer wir sind</a></li><li><a href="${url('/mitmachen/')}">Mitglied werden</a></li><li><a href="${url('/kontakt/')}">Kontakt</a></li></ul></div>
      <div><h4>SPD</h4><ul><li><a href="https://www.spd.de" target="_blank" rel="noopener">SPD Deutschland</a></li><li><a href="https://www.spd-niedersachsen.de" target="_blank" rel="noopener">SPD Niedersachsen</a></li></ul></div>
    </div>
    <div class="bottom">
      <span>© ${new Date().getFullYear()} SPD Ortsverein Soltau</span>
      <span><a href="${url('/impressum/')}">Impressum</a> · <a href="${url('/datenschutz/')}">Datenschutz</a> · <a href="${url('/transparenz/')}">Transparenz</a></span>
    </div>
  </div>
</footer>
</div>

<dialog id="person-dialog" aria-labelledby="dlg-name">
  <div class="dlg">
    <button class="close" type="button" aria-label="Schließen" id="dlg-close">×</button>
    <div class="dlg-photo" id="dlg-photo" hidden></div>
    <span class="date" id="dlg-job"></span>
    <h3 id="dlg-name"></h3>
    <p class="rolle" id="dlg-rolle"></p>
    <p id="dlg-text"></p>
    <a class="btn btn-rot" href="${url('/kontakt/')}" style="margin-top:8px">Nachricht schreiben</a>
  </div>
</dialog>

<div class="progress" id="progress" aria-hidden="true"></div>
<button class="totop" id="totop" type="button" aria-label="Nach oben"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
<script type="module" src="${url('/assets/site.js')}"></script>
</body>
</html>
`;
}

const pageHead = (tag, h1, lead) => `
  <div class="page-head"><div class="wrap">
    <span class="tag">${esc(tag)}</span>
    <h1 class="title">${h1}</h1>
    ${lead ? `<p class="lead">${esc(lead)}</p>` : ''}
  </div></div>`;

const heroPhoto = (site) => site.heroVideoId ? '' : site.heroImage
  ? `<div class="ph has-img"><img src="${esc(site.heroImage)}" alt="${esc(site.heroImageAlt || '')}" decoding="async" fetchpriority="high"></div>`
  : `<div class="ph"><span>Foto: Wahlabend, Roter Bahnhof</span></div>`;
// Drohnenvideo als Hintergrund: Quelle wird per Skript passend zur Bildschirmbreite gesetzt (480p/720p),
// bei „Bewegung reduzieren“ bleibt das Standbild stehen.
const heroMedia = (site) => site.heroVideoId
  ? `<div class="hero-media" aria-hidden="true"${site.heroPoster ? ` style="background-image:url('${esc(site.heroPoster)}')"` : ''}><video id="hero-video" muted loop playsinline preload="none"${site.heroPoster ? ` poster="${esc(site.heroPoster)}"` : ''}></video></div>`
  : '';

export function startPage(d) {
  const upcoming = d.events.slice(0, 3);
  const erk = d.news.find(n => n.cat === 'Fraktion') || d.news[0];
  const themen = d.themen;
  return `
<section>
  <div class="hero${d.site.heroVideoId ? ' has-video' : ''}">
    ${heroMedia(d.site)}
    <div class="wrap">
      <div class="hero-text">
        <span class="tag">Kommunalwahl 2026 · Danke, Soltau!</span>
        <h1><span class="ln"><span>Stärkste</span></span><span class="ln"><span>Kraft</span></span><span class="ln"><em>im Rat.</em></span></h1>
        <p>Zum ersten Mal in der Geschichte der Stadt stellt die SPD die stärkste Fraktion im Soltauer Stadtrat. Jetzt beginnt die Arbeit.</p>
        <div class="hero-actions">
          <a class="btn btn-rot" href="${url('/ziele/')}">Unsere 10 Punkte</a>
          <a class="btn btn-line-weiss" href="${url('/mitmachen/')}">Mitmachen</a>
        </div>
      </div>
      ${heroPhoto(d.site)}
    </div>
  </div>
  <div class="ticker" aria-label="Nächste Termine"><div class="ticker-track" id="ticker">${tickerItems(d.events).repeat(2) || '<span>Termine folgen</span><span>Termine folgen</span>'}</div></div>

  <div class="band-grau">
    <div class="wrap" style="padding-block:56px">
      <div class="section-head" style="margin-bottom:24px"><h2 class="title" style="font-size:clamp(34px,4.8cqw,56px)">Was können wir<br>für Sie tun?</h2></div>
      <div class="quick">
        <a href="${url('/kontakt/')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg><b>Ich habe ein Anliegen</b><small>Schlagloch, Kita-Platz, Ratsbeschluss – schreiben Sie uns.</small></a>
        <a href="${url('/termine/')}"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg><b>Ich will vorbeikommen</b><small>Ratssitzungen sind öffentlich. Alle Termine auf einen Blick.</small></a>
        <a href="#ansprech-section"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5a5 5 0 0 1 6 5"/></svg><b>Ich suche eine Ansprechperson</b><small>Wer kümmert sich um Schule, Verkehr oder die Ortschaften?</small></a>
        <a href="${url('/mitmachen/')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/><circle cx="12" cy="12" r="9.5"/></svg><b>Ich will mitmachen</b><small>Mitglied werden, Newsletter oder ein Nachmittag am Infostand.</small></a>
      </div>
    </div>
  </div>

  <div class="wrap section">
    <div class="section-head">
      <h2 class="title">Aktuelles</h2>
      <a class="more" href="${url('/aktuelles/')}">Alle Beiträge</a>
    </div>
    <div class="news" id="start-news">${d.news.slice(0, 3).map(newsCard).join('')}</div>
  </div>

  <div class="band-rot">
    <div class="wrap" style="padding-block:40px">
      <div class="stats">
        <div class="stat"><b>Nr. 1</b><span>Erstmals stärkste Fraktion im Stadtrat</span></div>
        <div class="stat"><b>${d.people.length}</b><span>Menschen im Team</span></div>
        <div class="stat"><b>16+1</b><span>Ortschaften und Kernstadt</span></div>
        <div class="stat"><b>10</b><span>Punkte für Soltau</span></div>
      </div>
    </div>
  </div>

  <div class="wrap section" id="ansprech-section">
    <div class="section-head"><h2 class="title">Wer kümmert sich<br>um was?</h2><a class="more" href="${url('/ortsverein/')}">Das ganze Team</a></div>
    <div class="themen" role="group" aria-label="Thema wählen" id="themen">${themen.map((t, i) => `<button class="chip" type="button" aria-pressed="${i === 0}">${esc(t)}</button>`).join('')}</div>
    <div class="ansprech" id="ansprech">${d.people.filter(p => p.themen.includes(themen[0])).map(personCard).join('')}</div>
  </div>

  <div class="band-grau">
    <div class="wrap section">
      <div class="section-head">
        <h2 class="title">Termine</h2>
        <a class="more" href="${url('/termine/')}">Alle Termine</a>
      </div>
      <div class="events" id="start-events">${upcoming.length ? upcoming.map(e => eventRow(e, false)).join('') : '<p class="muted">Aktuell sind keine Termine eingetragen.</p>'}</div>
    </div>
  </div>

  <div class="wrap section split">
    <div>
      <span class="tag">Ihre Meinung</span>
      <h2 class="title" style="margin:18px 0 10px">Was sollte Soltau jetzt als Erstes anpacken?</h2>
      <p class="muted" style="margin-bottom:20px">Eine Stimme pro Person. Das Ergebnis sehen Sie sofort.</p>
      <div class="poll" id="poll">${pollButtons(d.poll, null)}</div>
    </div>
    <div style="display:grid;gap:20px">
      ${erk ? `<div class="box box-schwarz">
        <span class="tag">Aus dem Rat erklärt</span>
        <h3>${esc(erk.title)}</h3>
        <p class="small">${esc(erk.teaser)}</p>
        <a class="btn btn-rot" href="${url(`/aktuelles/${erk.slug}/`)}" style="justify-self:start">Weiterlesen</a>
      </div>` : ''}
      <div class="box box-rot">
        <h3>Ihr Anliegen</h3>
        <p class="small">Schlagloch, Kita-Platz, Ratsbeschluss – wir antworten in der Regel innerhalb einer Woche.</p>
        <a class="btn btn-weiss" href="${url('/kontakt/')}" style="justify-self:start">Anliegen senden</a>
      </div>
      <div class="box">
        <h3>Roter Bahnhof buchen</h3>
        <p class="small">Unser Treffpunkt am Bahnhof steht auch Vereinen und Gruppen offen. Termin anfragen – wir melden uns.</p>
        <a class="btn btn-schwarz" href="${esc(d.site.bookingUrl)}" target="_blank" rel="noopener" style="justify-self:start">Anfrage stellen</a>
      </div>
    </div>
  </div>

  <div class="band-schwarz">
    <div class="wrap section">
      <div class="section-head">
        <h2 class="title">Unsere 10 Punkte<br>für Soltau</h2>
        <a class="more" href="${url('/ziele/')}">Zum Plan</a>
      </div>
      <div class="ziele-grid" id="start-ziele">${zieleGrid(d.ziele)}</div>
    </div>
  </div>

  <div class="wrap section">
    <div class="section-head">
      <h2 class="title">@spd_soltau</h2>
      <a class="more" href="https://www.instagram.com/spd_soltau/" target="_blank" rel="noopener">Auf Instagram folgen</a>
    </div>
    <div class="insta" id="insta" style="--n:${Math.min(Math.max(d.insta.length,3),6)}">${instaTiles(d.insta)}</div>
  </div>

  <div class="band-rot">
    <div class="wrap section newsletter">
      <div style="display:grid;gap:12px">
        <h2 class="title">Nichts verpassen.</h2>
        <p style="font-size:19px">Etwa einmal im Monat: Was im Stadtrat entschieden wurde, was ansteht, wo wir uns treffen.</p>
      </div>
      <form class="mock" id="form-news-start" novalidate>
        <div class="form-fields" style="display:contents">
          <label for="nl-mail-start" style="position:absolute;left:-9999px">E-Mail-Adresse</label>
          <input id="nl-mail-start" type="email" required placeholder="E-Mail-Adresse">
          <button class="btn btn-schwarz" type="submit">Anmelden</button>
        </div>
        <p class="form-ok" hidden>Danke! Bitte bestätigen Sie die Anmeldung über den Link in Ihrer E-Mail.</p>
      </form>
    </div>
  </div>
</section>`;
}

export function aktuellesPage(d) {
  const cats = [...new Set(d.news.map(n => n.cat))];
  const labels = { Fraktion: 'Aus der Fraktion', Ortsverein: 'Ortsverein', Pressemitteilung: 'Presse' };
  return `
<section>
  ${pageHead('Aktuelles', 'Neues aus Rat<br>und Ortsverein')}
  <div class="wrap section">
    <div class="filter" role="group" aria-label="Beiträge filtern">
      <button class="chip" data-cat="alle" aria-pressed="true">Alle</button>
      ${cats.map(c => `<button class="chip" data-cat="${esc(c)}" aria-pressed="false">${esc(labels[c] || c)}</button>`).join('')}
    </div>
    <div class="news" id="all-news">${d.news.map(newsCard).join('')}</div>
  </div>
</section>`;
}

export function beitragPage(d, n) {
  return `
<section>
  <div class="wrap article">
    <a class="back" href="${url('/aktuelles/')}">← Alle Beiträge</a>
    <span class="tag">${esc(n.cat)}</span>
    <h1>${esc(n.title)}</h1>
    <span class="date">${fmt(n.date)}</span>
    ${n.teaser ? `<p class="lead">${esc(n.teaser)}</p>` : ''}
    ${photo(n.img, n.imgLabel || n.title)}
    <div class="body">${n.bodyHtml || ''}</div>
    <div class="box box-schwarz"><b style="font:800 26px/1 var(--display);text-transform:uppercase;color:#fff">Fragen zu diesem Beitrag?</b><p class="small">Schreiben Sie uns – wir antworten in der Regel innerhalb einer Woche.</p><a class="btn btn-rot" href="${url('/kontakt/')}" style="justify-self:start">Anliegen senden</a></div>
  </div>
</section>`;
}

export function terminePage(d) {
  return `
<section>
  ${pageHead('Termine', 'Wann und wo<br>wir uns treffen', 'Ratssitzungen sind öffentlich – kommen Sie vorbei. Fraktions- und Vorstandssitzungen sind für Mitglieder offen.')}
  <div class="wrap section split">
    <div>
      <label class="toggle"><input type="checkbox" id="only-public"> Nur öffentliche Termine</label>
      <div id="all-events">${eventsGrouped(d.events, true)}</div>
    </div>
    <div class="box box-schwarz">
      <h3>Orte</h3>
      <dl>
        <dt>Roter Bahnhof</dt><dd>Am Bahnhof 1t – Treffpunkt des Ortsvereins</dd>
        <dt>Altes Rathaus</dt><dd>Sitzungen der SPD-Ratsfraktion</dd>
        <dt>Alte Reithalle</dt><dd>Sitzungen des Stadtrates</dd>
      </dl>
    </div>
  </div>
</section>`;
}

export function fraktionPage(d) {
  const chair = d.vorstand.find(v => /Kaçar|Kacar/.test(v.name)) || null;
  return `
<section>
  ${pageHead('SPD-Ratsfraktion', 'Unsere Fraktion<br>im Stadtrat', 'Seit dem 13. September 2026 erstmals stärkste Fraktion im Rat der Stadt Soltau. Wir erklären Entscheidungen, bleiben ansprechbar und setzen den 10-Punkte-Plan um.')}
  <div class="band-rot"><div class="wrap" style="padding-block:40px">
    <div class="stats">
      <div class="stat"><b>Nr. 1</b><span>Erstmals stärkste Fraktion</span></div>
      <div class="stat"><b>2026–31</b><span>Wahlperiode</span></div>
      <div class="stat"><b>1. Nov.</b><span>Beginn der Wahlperiode</span></div>
      <div class="stat"><b>10</b><span>Punkte für Soltau</span></div>
    </div>
  </div></div>
  <div class="wrap section split">
    <div>
      <div class="section-head"><h2 class="title">Ratsmitglieder</h2></div>
      <p class="small muted" style="margin-bottom:20px">Die Zusammensetzung der neuen Fraktion wird nach der konstituierenden Sitzung eingetragen.</p>
      <div class="people" id="fraktion-people">${d.fraktion.map(personCard).join('')}</div>
    </div>
    <div style="display:grid;gap:20px">
      <div class="box box-schwarz">
        <h3>Fraktionsvorsitz</h3>
        <p><b style="color:#fff;font:800 24px/1 var(--display);text-transform:uppercase">Birhat Kaçar</b><br><span class="small">Fraktionsvorsitzender, stellv. Bürgermeister</span></p>
        <dl>
          <dt>Sitzungen</dt><dd>Vor jeder Ratssitzung, Altes Rathaus</dd>
          <dt>Sprechstunde</dt><dd>Nach Vereinbarung</dd>
        </dl>
        <a class="btn btn-rot" href="${url('/kontakt/')}" style="justify-self:start">Fraktion kontaktieren</a>
      </div>
      <div class="box">
        <h3>Anträge &amp; Anfragen</h3>
        <ul class="list">
          <li><b>Zeitplan Unterführung Walsroder Straße</b><span class="small muted">Antrag</span></li>
          <li><b>Sachstand Neubau Wilhelm-Busch-Schule</b><span class="small muted">Anfrage</span></li>
          <li><b>Ganztag an den Grundschulen</b><span class="small muted">Antrag</span></li>
        </ul>
        <p class="small muted">Beispiele – später mit Link ins Ratsinformationssystem.</p>
      </div>
    </div>
  </div>
  <div class="band-schwarz"><div class="wrap section">
    <div class="section-head"><h2 class="title">Aus dem Rat</h2><a class="more" href="${url('/aktuelles/')}">Alle Beiträge</a></div>
    <div class="news" id="fraktion-news">${d.news.filter(n => n.cat === 'Fraktion').slice(0, 3).map(newsCard).join('') || d.news.slice(0, 3).map(newsCard).join('')}</div>
  </div></div>
</section>`;
}

export function ortsvereinPage(d) {
  return `
<section>
  ${pageHead('SPD Ortsverein Soltau', 'Wer wir sind', 'Menschen aus unterschiedlichen Generationen, Berufen und Teilen unserer Stadt. Uns verbindet eine Überzeugung: Soltau kann mehr.')}
  <div class="wrap section">
    <div class="section-head"><h2 class="title">Vorstand</h2></div>
    <div class="people vorstand" id="vorstand">${d.vorstand.map(v => personCard({ name: v.name, job: v.job, role: v.position, photo: v.photo, text: '' })).join('')}</div>
  </div>
  <div class="wrap section" style="padding-top:0">
    <div class="cols">
      <div class="col">
        <h3>Roter Bahnhof</h3>
        <p>Unser Treffpunkt am Bahnhof: Hier tagt der Vorstand, hier planen wir Infostände, hier sind Gäste willkommen. Vereine und Gruppen können den Roten Bahnhof anfragen.</p>
        <p><b>Am Bahnhof 1t, 29614 Soltau</b></p>
        <a class="btn btn-rot" href="${esc(d.site.bookingUrl)}" target="_blank" rel="noopener" style="justify-self:start">Roter Bahnhof buchen</a>
      </div>
      <div class="col">
        <h3>Mitglied werden</h3>
        <p>Mitgestalten statt zuschauen. Im Rat, am Infostand oder im Hintergrund – es gibt viele Wege.</p>
        <a class="btn btn-rot" href="${url('/mitmachen/')}" style="justify-self:start">Jetzt mitmachen</a>
      </div>
      <div class="col">
        <h3>Ihr Anliegen</h3>
        <p>Schlagloch, Kita-Platz, Ratsbeschluss – schreiben Sie uns. Wir antworten in der Regel innerhalb einer Woche.</p>
        <a class="btn btn-line" href="${url('/kontakt/')}" style="justify-self:start">Kontakt</a>
      </div>
    </div>
  </div>
  <div class="band-grau"><div class="wrap section">
    <div class="section-head"><h2 class="title">Unser Team</h2><span class="muted">${d.people.length} Menschen aus Kernstadt und Ortschaften</span></div>
    <div class="people" id="all-people">${d.people.map(personCard).join('')}</div>
  </div></div>
</section>`;
}

export function zielePage(d) {
  return `
<section>
  ${pageHead('Unsere Ziele', 'Der 10-Punkte-<br>Plan', 'Soltau kann mehr. Dafür braucht es klare Prioritäten, verlässliche Entscheidungen und den Mut, wichtige Projekte endlich umzusetzen.')}
  <div class="wrap section split">
    <div id="ziele-list">${zielAccordion(d.ziele)}</div>
    <div class="box box-rot">
      <h3>Unser Versprechen</h3>
      <p>Wir wollen Projekte nicht über Jahre diskutieren, sondern Entscheidungen treffen, Finanzierung sichern und anschließend umsetzen.</p>
      ${d.site.programmPdf ? `<a class="btn btn-weiss" href="${esc(d.site.programmPdf)}" target="_blank" rel="noopener" style="justify-self:start">Programm als PDF</a>` : ''}
    </div>
  </div>
</section>`;
}

export function mitmachenPage(d) {
  return `
<section>
  ${pageHead('Mitmachen', 'Soltau<br>mitgestalten', 'Ob Mitgliedschaft, Newsletter oder ein Nachmittag am Infostand – jede Unterstützung zählt.')}
  <div class="wrap section split">
    <form class="form mock" id="form-mitglied" novalidate>
      <div class="form-fields" style="display:grid;gap:18px">
        <h2 class="title" style="font-size:40px">Interesse an einer Mitgliedschaft</h2>
        <p class="small muted">Wir melden uns persönlich. Der Beitritt selbst läuft über den SPD-Landesverband.</p>
        <div class="field"><label for="m-name">Name</label><input id="m-name" name="name" type="text" required autocomplete="name"></div>
        <div class="field"><label for="m-mail">E-Mail</label><input id="m-mail" name="email" type="email" required autocomplete="email"></div>
        <div class="field"><label for="m-ort">Wohnort (Kernstadt oder Ortschaft)</label><input id="m-ort" name="ort" type="text" placeholder="z. B. Harber"></div>
        <div class="field"><label for="m-interesse">Was interessiert Sie?</label>
          <select id="m-interesse" name="interesse"><option>Mitglied werden</option><option>Erst einmal reinschnuppern</option><option>Beim Infostand helfen</option><option>Thema einbringen</option></select>
        </div>
        <div class="field"><label for="m-msg">Nachricht (optional)</label><textarea id="m-msg" name="nachricht"></textarea></div>
        <label class="check"><input type="checkbox" id="m-ds" required> Ich habe die <a href="${url('/datenschutz/')}">Datenschutzhinweise</a> gelesen.</label>
        <button class="btn btn-rot" type="submit" style="justify-self:start">Absenden</button>
      </div>
      <p class="form-ok" hidden>Danke! Wir melden uns in den nächsten Tagen bei Ihnen.</p>
    </form>
    <div style="display:grid;gap:20px">
      <div class="box">
        <h3>Newsletter</h3>
        <form class="mock" id="form-news-page" novalidate style="display:grid;gap:10px">
          <div class="form-fields field"><label for="nl-mail-page">E-Mail-Adresse</label><input id="nl-mail-page" type="email" required><button class="btn btn-schwarz" type="submit" style="justify-self:start;margin-top:8px">Anmelden</button></div>
          <p class="form-ok" hidden>Danke! Bitte bestätigen Sie die Anmeldung per E-Mail.</p>
        </form>
      </div>
      <div class="box">
        <h3>Vor Ort helfen</h3>
        <ul class="list">
          <li><b>Infostand Wochenmarkt</b><span class="small muted">samstags</span></li>
          <li><b>Plakatieren &amp; Verteilen</b><span class="small muted">vor Wahlen</span></li>
          <li><b>Veranstaltungen</b><span class="small muted">Auf- und Abbau</span></li>
        </ul>
      </div>
      <div class="box box-schwarz">
        <h3>Spenden</h3>
        <p class="small">Unsere Arbeit finanziert sich aus Mitgliedsbeiträgen und Spenden. Spendenbescheinigungen stellen wir gern aus.</p>
      </div>
    </div>
  </div>
</section>`;
}

export function kontaktPage(d) {
  return `
<section>
  ${pageHead('Kontakt', 'Ihr<br>Anliegen', 'Ein Schlagloch in Ihrer Straße, eine Frage zu einer Ratsentscheidung, Kritik oder Lob – wir antworten.')}
  <div class="wrap section split">
    <form class="form mock" id="form-kontakt" novalidate>
      <div class="form-fields" style="display:grid;gap:18px">
        <div class="field"><label for="k-name">Name</label><input id="k-name" name="name" type="text" required autocomplete="name"></div>
        <div class="field"><label for="k-mail">E-Mail</label><input id="k-mail" name="email" type="email" required autocomplete="email"></div>
        <div class="field"><span style="font:700 13px/1 var(--display);letter-spacing:.12em;text-transform:uppercase;color:var(--ink)">Worum geht es?</span>
          <div class="topics" role="group" aria-label="Thema" id="k-topics">
            ${['Straßen & Verkehr', 'Kita & Schule', 'Wohnen', 'Ortschaften', 'Ratsentscheidung', 'Sonstiges'].map((t, i) => `<button type="button" class="chip" aria-pressed="${i === 0}">${esc(t)}</button>`).join('')}
          </div>
        </div>
        <div class="field"><label for="k-ort">Straße / Ortschaft (optional)</label><input id="k-ort" name="ort" type="text" placeholder="z. B. Walsroder Straße"></div>
        <div class="field"><label for="k-msg">Ihr Anliegen</label><textarea id="k-msg" name="nachricht" required></textarea></div>
        <label class="check"><input type="checkbox" id="k-ds" required> Ich habe die <a href="${url('/datenschutz/')}">Datenschutzhinweise</a> gelesen.</label>
        <button class="btn btn-rot" type="submit" style="justify-self:start">Anliegen senden</button>
      </div>
      <p class="form-ok" hidden>Danke! Ihr Anliegen ist angekommen. Wir melden uns – in der Regel innerhalb einer Woche.</p>
    </form>
    <div style="display:grid;gap:20px">
      <div class="box box-schwarz">
        <h3>SPD Ortsverein Soltau</h3>
        <dl>
          <dt>Adresse</dt><dd>Am Bahnhof 1t<br>29614 Soltau</dd>
          ${d.site.email ? `<dt>E-Mail</dt><dd><a href="mailto:${esc(d.site.email)}" style="color:#fff">${esc(d.site.email)}</a></dd>` : ''}
          <dt>Instagram</dt><dd><a href="https://www.instagram.com/spd_soltau/" target="_blank" rel="noopener" style="color:#fff">@spd_soltau</a></dd>
        </dl>
      </div>
      <a class="ph ph-hell" style="min-height:240px;text-decoration:none" href="https://www.openstreetmap.org/search?query=Am%20Bahnhof%201t%2C%2029614%20Soltau" target="_blank" rel="noopener"><span>Karte öffnen: Roter Bahnhof, Am Bahnhof 1t (OpenStreetMap)</span></a>
    </div>
  </div>
</section>`;
}

const legal = (tag, h1, html) => `
<section>
  <div class="page-head"><div class="wrap"><span class="tag">${esc(tag)}</span><h1 class="title">${h1}</h1></div></div>
  <div class="wrap section prose">${html}</div>
</section>`;

export function impressumPage(d) {
  return legal('Rechtliches', 'Impressum', `
    <p><b>SPD Ortsverein Soltau</b><br>Am Bahnhof 1t<br>29614 Soltau</p>
    <p>Vertreten durch den Vorstand: Laura Elbers Gutiérrez und Birhat Kaçar (Vorsitzende).<br>Verantwortlich im Sinne des Presserechts: Birhat Kaçar, Anschrift wie oben.</p>
    ${d.site.email ? `<p>E-Mail: <a href="mailto:${esc(d.site.email)}">${esc(d.site.email)}</a></p>` : ''}
    <p>Der SPD Ortsverein Soltau ist eine Gliederung der Sozialdemokratischen Partei Deutschlands (SPD Landesverband Niedersachsen).</p>
    <p class="small muted">Bitte vor Veröffentlichung mit dem Impressum-Muster des SPD-Landesverbands abgleichen.</p>`);
}

export function datenschutzPage(d) {
  return legal('Rechtliches', 'Datenschutz', `
    <p>Diese Website wird als statische Seite ausgeliefert und setzt keine Tracking-Cookies. Es werden keine Schriften oder Skripte von Google oder anderen Drittanbietern nachgeladen.</p>
    <h2>Hosting</h2>
    <p>Beim Aufruf der Seite verarbeitet der Hosting-Anbieter technisch notwendige Verbindungsdaten (IP-Adresse, Zeitpunkt, aufgerufene Seite) in Server-Protokollen.</p>
    <h2>Bilder aus dem Redaktionssystem</h2>
    <p>Fotos zu Beiträgen und Personen werden über das Content-Management-System von Wix (Wix.com Ltd.) ausgeliefert. Dabei wird Ihre IP-Adresse an die Server von Wix übermittelt.</p>
    <h2>Kontakt- und Mitmachformulare</h2>
    <p>Angaben aus den Formularen werden ausschließlich zur Bearbeitung Ihrer Anfrage genutzt und nicht an Dritte weitergegeben.</p>
    <h2>Newsletter</h2>
    <p>Die Anmeldung erfolgt im Double-Opt-in-Verfahren. Eine Abmeldung ist jederzeit über den Link in jeder E-Mail möglich.</p>
    <p class="small muted">Bitte vor Veröffentlichung durch die Datenschutzerklärung des SPD-Landesverbands ergänzen (Verantwortliche Stelle, Rechtsgrundlagen, Betroffenenrechte).</p>`);
}

export function transparenzPage(d) {
  return legal('Rechtliches', 'Transparenz', `
    <p>Transparenzinformationen zu den politischen Werbemaßnahmen des SPD Ortsvereins Soltau im Zusammenhang mit der Kommunalwahl in Niedersachsen am 13. September 2026.</p>
    <h2>Sponsor der politischen Werbung</h2>
    <p>SPD Ortsverein Soltau, Am Bahnhof 1t, 29614 Soltau. Art des Sponsors: Partei beziehungsweise Parteiverband.</p>
    <h2>Verantwortlich</h2>
    <p>Birhat Kaçar, Vorsitzender des SPD Ortsvereins Soltau, Am Bahnhof 1t, 29614 Soltau.</p>
    <h2>Kontrollierende Einrichtung</h2>
    <p>SPD Landesverband Niedersachsen. Der SPD Ortsverein Soltau ist eine Gliederung der Sozialdemokratischen Partei Deutschlands.</p>
    <h2>Kampagne</h2>
    <p>Bezeichnung: Kommunalwahl 2026 des SPD Ortsvereins Soltau. Zweck: Wahlwerbung zur Kommunalwahl 2026. Zeitraum: 1. Juli bis 13. September 2026. Werbeformen: Wahlplakate, Großflächenplakate, Bauzaunbanner, Flyer, Broschüren, Wurfsendungen, Beiträge und Werbung in sozialen Medien, Inhalte auf den Internetseiten des Ortsvereins.</p>
    <h2>Finanzierung</h2>
    <p>Finanziert durch den SPD Ortsverein Soltau aus Parteimitteln und freiwilligen Spenden. Voraussichtliche Gesamtkosten der Kampagne: rund 9.000 Euro.</p>
    <ul>
      <li>Großflächenplakat Walsroder Straße: 1 Stück, rund 600 Euro, Anbieter 123-Plakat, Gestaltung Birhat Kaçar</li>
      <li>Großflächenplakat Almhöhe: 1 Stück, 455 Euro, Anbieter plakat-verkauft.de, Gestaltung Birhat Kaçar</li>
    </ul>
    <h2>Meldung möglicher Verstöße</h2>
    <p>Hinweise oder Beschwerden zu politischen Werbemaßnahmen des SPD Ortsvereins Soltau: SPD Ortsverein Soltau, Am Bahnhof 1t, 29614 Soltau.</p>`);
}

export function notFoundPage(d) {
  return `
<section>
  ${pageHead('404', 'Seite nicht<br>gefunden')}
  <div class="wrap section prose">
    <p>Diese Seite gibt es nicht (mehr). Vielleicht hilft die <a href="${url('/')}">Startseite</a> oder das Menü weiter.</p>
  </div>
</section>`;
}
