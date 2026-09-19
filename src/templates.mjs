// Seitenvorlagen – 1:1 nach Referenz-Entwurf D, mit echten Links und Inhalten aus dem Build.
import { esc, fmt, url, short, newsCard, eventRow, eventsGrouped, personCard, zielAccordion, zieleGrid, tickerItems, pollButtons, instaTiles, photo, teamCard, byRole, eventRowMini, zielCards, zielBlocks, zielJump, zielAccordionFotos } from './render.mjs';
import { stadtKacheln } from './lib/stadt.mjs';

const NAV = [
  ['/aktuelles/', 'Aktuelles'], ['/termine/', 'Termine'], ['/fraktion/', 'Fraktion'], ['/ortsverein/', 'Vorstand'],
  ['/ziele/', 'Ziele'], ['/mitmachen/', 'Mitmachen'], ['/kontakt/', 'Kontakt'],
];

export function layout({ site, path, title, description, content, clientData = {}, noindex = false, ogImage = null, welcome = null }) {
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
${welcome ? `<script>(function(){try{var n=Date.now();if(n>=${welcome[0]}&&n<${welcome[1]}&&!localStorage.getItem('spd-willkommen')){location.replace('${url('/bald/')}?willkommen=1')}}catch(e){}})()</script>` : ''}
<link rel="icon" href="${url('/assets/favicon.svg')}" type="image/svg+xml">
<link rel="manifest" href="${url('/manifest.webmanifest')}">
<link rel="apple-touch-icon" href="${url('/assets/icons/apple-touch-icon.png')}">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="SPD Soltau">
<meta name="mobile-web-app-capable" content="yes">
${path === '/' ? `<script>(function(){try{if((matchMedia('(display-mode: standalone)').matches||navigator.standalone===true)&&localStorage.getItem('spd-tokens')&&!sessionStorage.getItem('spd-web')){sessionStorage.setItem('spd-web','1');location.replace('${url('/mitglieder/')}');}}catch(e){}})();</script>` : ''}
<link rel="stylesheet" href="${url('/assets/fonts.css')}">
<link rel="stylesheet" href="${url('/assets/styles.css')}">
<script>window.SPD=${JSON.stringify({ base: url(''), ...clientData }).replace(/</g, '\\u003c')};</script>
</head>
<body>
<div id="site">
${path.startsWith('/mitglieder/') ? `<header class="app-header">
  <div class="wrap">
    <a class="app-logo" href="${url('/mitglieder/')}" aria-label="Mitgliederbereich – Start">SPD</a>
    <span class="app-title"><span class="long">Mitgliederbereich</span><span class="short">Mitglieder</span></span>
    <a class="app-globe" href="${url('/index.html')}" data-website title="Zur Website spd-soltau.de"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg><span>Website</span></a>
    <a class="app-me" id="app-me" href="#profil" hidden aria-label="Mein Profil"></a>
  </div>
</header>` : `<div class="app-return" id="app-return">
  <a href="${url('/mitglieder/')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>Zurück zum Mitgliederbereich</a><span>SPD Soltau App</span>
</div>
<header class="header">
  <div class="wrap">
    <a class="logo" href="${url('/index.html')}" aria-label="SPD Soltau – Startseite"><img src="${url('/assets/images/logo-spd-soltau-weiss.png')}" alt="SPD Soltau" width="88" height="60" decoding="async"></a>
    <span class="slogan">Aus Liebe<br>zu Soltau</span>
    <nav class="nav" id="nav" aria-label="Hauptnavigation">
      ${NAV.map(([p, label]) => `<a href="${url(p)}"${path.startsWith(p) ? ' class="active" aria-current="page"' : ''}>${label}</a>`).join('\n      ')}
    </nav>
    <a class="btn btn-schwarz cta" href="${url('/mitmachen/')}">Mitglied werden</a>
    <a class="member-link" id="member-link" href="${url('/mitglieder/')}" aria-label="Mitgliederbereich – Anmelden" title="Mitgliederbereich"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg></a>
    <button class="burger" id="burger" aria-expanded="false" aria-controls="nav" aria-label="Menü öffnen">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square"><path d="M3 7h18M3 12h18M3 17h18"/></svg>
    </button>
  </div>
</header>`}

<main>
${content}
${path.startsWith('/mitglieder/') ? '' : pageEnd()}
</main>

${path.startsWith('/mitglieder/') ? `<footer class="app-footer"><span>© ${new Date().getFullYear()} SPD Ortsverein Soltau</span><span><a href="${url('/impressum/')}" data-website>Impressum</a> · <a href="${url('/datenschutz/')}" data-website>Datenschutz</a></span></footer>` : `<footer class="footer">
  <div class="ticker ticker-claim" aria-hidden="true"><div class="ticker-track">${'<span>Aus Liebe zu Soltau</span><span>Stärkste Kraft im Rat</span><span>Danke, Soltau</span><span>Jetzt beginnt die Arbeit</span>'.repeat(4)}</div></div>
  <div class="wrap">
    <div class="claim">Aus Liebe<br>zu Soltau.</div>
    <div class="grid">
      <div>
        <a class="logo" href="${url('/index.html')}" aria-label="SPD Soltau – Startseite"><img src="${url('/assets/images/logo-spd-soltau-weiss.png')}" alt="SPD Soltau" width="88" height="60" decoding="async"></a>
        <p style="margin-top:16px;max-width:36ch">SPD Ortsverein Soltau<br>Am Bahnhof 1t · 29614 Soltau</p>
        <p style="margin-top:12px"><a href="https://www.instagram.com/spd_soltau/" target="_blank" rel="noopener">Instagram @spd_soltau</a></p>
      </div>
      <div><h4>Politik</h4><ul><li><a href="${url('/aktuelles/')}">Aktuelles</a></li><li><a href="${url('/fraktion/')}">Ratsfraktion</a></li><li><a href="${url('/stadtrat-2026/')}">Unsere 11 im Stadtrat</a></li><li><a href="${url('/ziele/')}">10-Punkte-Plan</a></li><li><a href="${url('/termine/')}">Termine</a></li></ul></div>
      <div><h4>Ortsverein</h4><ul><li><a href="${url('/ortsverein/')}">Vorstand</a></li><li><a href="${url('/mitmachen/')}">Mitglied werden</a></li><li><a href="${url('/roter-bahnhof/')}">Roter Bahnhof buchen</a></li><li><a href="${url('/kontakt/')}">Kontakt</a></li><li><a href="${url('/mitglieder/')}">Mitgliederbereich &amp; App</a></li></ul></div>
      <div><h4>SPD</h4><ul><li><a href="https://www.spd.de" target="_blank" rel="noopener">SPD Deutschland</a></li><li><a href="https://www.spd-niedersachsen.de" target="_blank" rel="noopener">SPD Niedersachsen</a></li></ul></div>
    </div>
    <div class="bottom">
      <span>© ${new Date().getFullYear()} SPD Ortsverein Soltau</span>
      <span><a href="${url('/impressum/')}">Impressum</a> · <a href="${url('/datenschutz/')}">Datenschutz</a> · <a href="${url('/transparenz/')}">Transparenz</a></span>
    </div>
  </div>
</footer>`}
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

<dialog id="insta-dialog" class="insta-dialog" aria-label="Instagram-Beitrag">
  <div class="insta-box">
    <button class="close" type="button" aria-label="Schließen" id="insta-close">×</button>
    <div class="insta-stage">
      <div class="insta-track" id="insta-track"></div>
      <button class="insta-nav prev" type="button" id="insta-prev" aria-label="Vorheriges Bild">‹</button>
      <button class="insta-nav next" type="button" id="insta-next" aria-label="Nächstes Bild">›</button>
      <div class="insta-dots" id="insta-dots"></div>
    </div>
    <div class="insta-body">
      <div class="insta-head"><b>@spd_soltau</b><span class="date" id="insta-date"></span></div>
      <p id="insta-caption"></p>
      <div class="insta-meta"><span id="insta-likes"></span><span id="insta-comments"></span></div>
      <div class="insta-actions">
        <button class="btn btn-line" type="button" id="insta-prevpost">‹ Neuer</button>
        <a class="btn btn-rot" id="insta-link" href="https://www.instagram.com/spd_soltau/" target="_blank" rel="noopener">Auf Instagram ansehen</a>
        <button class="btn btn-line" type="button" id="insta-nextpost">Älter ›</button>
      </div>
    </div>
  </div>
</dialog>

<div class="progress" id="progress" aria-hidden="true"></div>
<button class="totop" id="totop" type="button" aria-label="Nach oben"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>
<script type="module" src="${url('/assets/site.js')}"></script>
</body>
</html>
`;
}

// Ende jeder Website-Seite (Wunsch Vorsitz): drei Kästen – Vorstand, Ratsfraktion, Roter Bahnhof – und „Nichts verpassen“
const pageEnd = () => `
<div class="wrap section page-end">
  <div class="cols boxes end-boxes">
    <a class="box box-schwarz" href="${url('/ortsverein/')}">
      <span class="tag">Ortsverein</span>
      <h3>Unser Vorstand</h3>
      <p class="small">Wer den Ortsverein führt, wo wir uns treffen und wie Sie uns erreichen.</p>
      <span class="btn btn-rot">Vorstand kennenlernen</span>
    </a>
    <a class="box box-rot" href="${url('/fraktion/')}">
      <span class="tag tag-schwarz">Stadtrat</span>
      <h3>Unsere Ratsfraktion</h3>
      <p class="small">Die SPD im Rat der Stadt Soltau: Ratsmitglieder, Themen, Anträge.</p>
      <span class="btn btn-weiss">Zur Fraktion</span>
    </a>
    <a class="box" href="${url('/roter-bahnhof/')}">
      <span class="tag">Treffpunkt</span>
      <h3>Roter Bahnhof buchen</h3>
      <p class="small">Unser Treffpunkt am Bahnhof steht auch Vereinen und Gruppen offen. Termin anfragen – wir melden uns.</p>
      <span class="btn btn-schwarz">Anfrage stellen</span>
    </a>
  </div>
</div>
<div class="band-rot">
  <div class="wrap section newsletter">
    <div style="display:grid;gap:12px">
      <h2 class="title">Nichts verpassen.</h2>
      <p style="font-size:19px">Etwa einmal im Monat: Was im Stadtrat entschieden wurde, was ansteht, wo wir uns treffen.</p>
    </div>
    <form class="wix-form abo-form" id="form-news" data-collection="Abonnenten" novalidate>
      <div class="form-fields" style="display:contents">
        <label for="nl-mail" style="position:absolute;left:-9999px">E-Mail-Adresse</label>
        <input id="nl-mail" name="email" type="email" required placeholder="E-Mail-Adresse" autocomplete="email">
        <input type="hidden" name="typ" value="anmeldung"><input type="hidden" name="quelle" value="startseite">
        <button class="btn btn-schwarz" type="submit">Anmelden</button>
      </div>
      <p class="note" hidden></p>
      <p class="form-ok" hidden>Danke! Bitte bestätigen Sie die Anmeldung über den Link in Ihrer E-Mail (auch im Spam-Ordner nachsehen).</p>
    </form>
  </div>
</div>`;

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
  const upcoming = d.events.filter(e => e.typ === 'Öffentlich' || e.typ === 'Rat').slice(0, 4); // Website: nur öffentliche Termine
  // Laufband: bis zur Stichwahl der Wahlaufruf, danach die nächsten Termine
  const band = d.stichwahl ? `<span>Am 27.09. Zinke zum Landrat wählen!</span>`.repeat(6) : (tickerItems(d.events).repeat(2) || '<span>Termine folgen</span><span>Termine folgen</span>');
  return `
<section>
  <div class="hero${d.site.heroVideoId ? ' has-video' : ''}">
    ${heroMedia(d.site)}
    <div class="wrap">
      <div class="hero-text">
        <h1 class="hero-moin" aria-label="Moin!"><span class="ln"><span class="moin" aria-hidden="true"><i>M</i><i>o</i><i>i</i><i>n</i><i class="bang">!</i></span></span></h1>
        <div class="hero-box">
          <p>Schön, dass Sie da sind. Danke für das große Vertrauen bei der Kommunalwahl – für jede einzelne Stimme. Wir wissen, dass daraus Verantwortung entsteht, und wir bleiben ansprechbar: im Stadtrat, im Roten Bahnhof und bei Ihnen vor Ort.</p>
          <a class="btn btn-rot" href="${url('/stadtrat-2026/')}">Unsere 11 Gewählten</a>
        </div>
      </div>
      ${heroPhoto(d.site)}
    </div>
  </div>
  <div class="ticker ticker-slow" aria-label="${d.stichwahl ? 'Stichwahl' : 'Nächste Termine'}"><div class="ticker-track" id="ticker">${band}</div></div>

  ${d.stichwahl ? `<div class="band-schwarz zinke-band"><div class="wrap section zinke">
    <a class="zinke-banner" href="${esc(d.stichwahl.website)}" target="_blank" rel="noopener"><img src="${url('/assets/images/zinke-banner.jpg')}" alt="Keine halben Sachen. Ein Landkreis, ein Landrat – Zinke, Heidekreis" width="1536" height="768" loading="lazy" decoding="async"></a>
    <div class="zinke-text">
      <div>
        <span class="tag">Stichwahl am ${esc(d.stichwahl.datumKurz)}</span>
        <h2 class="title">Sebastian Zinke<br>zum Landrat wählen</h2>
      </div>
      <div>
        <p>${esc(d.stichwahl.kurz)}</p>
        <div class="hero-actions"><a class="btn btn-rot" href="${esc(d.stichwahl.website)}" target="_blank" rel="noopener">Mehr über Sebastian Zinke</a></div>
      </div>
    </div>
  </div></div>` : ''}

  <div class="wrap${d.stichwahl ? '' : ' section'}" style="padding-block:56px">
    <div class="section-head" style="margin-bottom:24px"><h2 class="title">Was können wir<br>für Sie tun?</h2></div>
    <div class="quick ${d.stadt ? 'quick-3' : 'quick-2'}">
      <a href="${url('/kontakt/')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/></svg><b>Ich habe ein Anliegen</b><small>Schlagloch, Kita-Platz, Ratsbeschluss – schreiben Sie uns. Wir antworten in der Regel innerhalb einer Woche.</small></a>
      <a href="${url('/mitmachen/')}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 14.5a5 5 0 0 1 6 5"/></svg><b>Ich will vorbeikommen oder mitmachen</b><small>Ratssitzungen sind öffentlich, der Rote Bahnhof steht offen – als Gast, Helferin oder Mitglied.</small></a>
      ${rathausKachel(d)}
    </div>
    ${d.stadt ? `<p class="quick-stand">Aus Rat &amp; Rathaus: automatisch aus den öffentlichen Seiten der Stadt Soltau · Stand ${esc(standText(d.stadt.stand))}</p>` : ''}
  </div>

  <div class="band-rot">
    <div class="wrap" style="padding-block:40px">
      <span class="tag tag-schwarz" style="margin-bottom:18px">Soltau in Zahlen</span>
      <div class="stats">
        ${d.site.facts.map(([n, t]) => `<div class="stat"><b>${esc(n)}</b><span>${esc(t)}</span></div>`).join('')}
      </div>
    </div>
  </div>

  <div class="wrap section">
    <div class="section-head">
      <h2 class="title">Aktuelles</h2>
      <a class="more" href="${url('/aktuelles/')}">Alle Beiträge</a>
    </div>
    <div class="news" id="start-news">${d.news.slice(0, 5).map(newsCard).join('')}</div>
  </div>

  <div class="band-grau">
    <div class="wrap section">
      <div class="section-head">
        <h2 class="title">@spd_soltau</h2>
        <a class="more" href="https://www.instagram.com/spd_soltau/" target="_blank" rel="noopener">Auf Instagram folgen</a>
      </div>
      <div class="insta" id="insta" style="--n:${Math.min(Math.max(d.insta.length,3),6)}">${instaTiles(d.insta)}</div>
    </div>
  </div>

  <div class="wrap section">
    <div class="section-head">
      <h2 class="title">Termine</h2>
      <a class="more" href="${url('/termine/')}">Alle Termine</a>
    </div>
    <div class="events-mini" id="start-events">${upcoming.length ? upcoming.map(eventRowMini).join('') : '<p class="muted">Aktuell sind keine Termine eingetragen.</p>'}</div>
  </div>

  <div id="umfrage-box" class="umfrage-box" hidden></div>
</section>`;
}

// ---------- Aus Rat & Rathaus: automatisch aus den öffentlichen Quellen der Stadt (src/lib/stadt.mjs) ----------
const RR_ICON = {
  mitreden: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 0 1-8 8H8l-5 3 1.2-4.4A8 8 0 1 1 21 12z"/></svg>',
  sitzung: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l10 5H2z"/></svg>',
  amtsblatt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 14.3 7.2 16.9l.9-5.4L4.2 7.7l5.4-.8z"/></svg>',
  rathaus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/></svg>',
  baustelle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21h16M9 21l2.5-16h1L15 21M6.5 15h11M7.8 9h8.4"/></svg>',
};
const standText = iso => new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)).replace('.,', ',') + ' Uhr';
const kurzText = (t, n = 90) => { t = String(t || '').split(';')[0].trim(); return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + ' …' : t; };
// Dritte Bürger-Kachel „Ich will wissen, was im Rathaus läuft“ – gleiche Form wie die zwei anderen, mit den drei aktuellsten Punkten
export function rathausKachel(d) {
  const k = stadtKacheln(d.stadt, 3);
  if (!k.length) return '';
  return `<div class="quick-live">
        <a class="quick-live-head" href="${url('/rat-und-rathaus/')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2l10 5H2z"/></svg><b>Ich will wissen, was im Rathaus läuft</b></a>
        <div class="quick-live-list">${k.map(t => `<a href="${esc(t.url)}" target="_blank" rel="noopener">${RR_ICON[t.art] || ''}<span><small>${esc(t.kurz)}</small><b>${esc(kurzText(t.titel, 70))}</b></span></a>`).join('')}</div>
        <a class="quick-live-more" href="${url('/rat-und-rathaus/')}">Alle Meldungen →</a>
      </div>`;
}
export function ratRathausPage(d) {
  const s = d.stadt || { sitzungen: [], rathaus: [], amtsblatt: [], mitreden: [], baustellen: [], quellen: {}, stand: new Date().toISOString() };
  const tag = iso => iso ? `${['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(iso + 'T12:00:00').getDay()]} ${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '';
  const kurz = iso => iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.` : '';
  const rathaus = s.rathaus.filter(r => r.relevant).slice(0, 8);
  const leer = t => `<p class="muted small">${t}</p>`;
  return `
<section>
  ${pageHead('Automatisch aktuell', 'Aus Rat &amp;<br>Rathaus', 'Was die Stadt Soltau öffentlich bekannt gibt – Sitzungen, Amtsblatt, Meldungen aus dem Rathaus und Verfahren, bei denen Sie mitreden können. Gesammelt an einem Ort, alle 30 Minuten neu.')}
  <div class="wrap section rr-page">
    ${s.mitreden.length ? `<div class="rr-mitreden">${RR_ICON.mitreden}<div><span class="tag">Jetzt mitreden</span>${s.mitreden.map(m => `<p><b>${esc(m.titel)}</b> – ${esc(m.text)}${m.bis ? ` <a class="rr-frist" href="${esc(m.url)}" target="_blank" rel="noopener">Stellung nehmen · bis ${esc(kurz(m.bis))}</a>` : ''}</p>`).join('')}</div></div>` : ''}
    <div class="rr-cols">
      <div class="rr-card">
        <h3>${RR_ICON.sitzung}Nächste Sitzungen</h3>
        ${s.sitzungen.length ? s.sitzungen.slice(0, 8).map(x => `<a class="rr-item" href="${esc(x.url)}" target="_blank" rel="noopener"><span class="rr-when">${esc(tag(x.datum))}<br><span>${esc(x.zeit)} Uhr</span></span><span><b>${esc(x.gremiumLang)}</b><br><small>${esc(x.ort)} · öffentlich${x.tagesordnung ? ' · Tagesordnung' : ''}</small></span></a>`).join('') : leer('Keine kommenden Sitzungen gemeldet.')}
        <p class="rr-quelle">Quelle: <a href="https://ris.stadt-soltau.de/bi/infobi.asp" target="_blank" rel="noopener">Bürgerinformationssystem der Stadt Soltau</a></p>
      </div>
      <div class="rr-card">
        <h3>${RR_ICON.rathaus}Aus dem Rathaus</h3>
        ${rathaus.length ? rathaus.map(r => `<a class="rr-item" href="${esc(r.url)}" target="_blank" rel="noopener"><span><small>${esc(kurz(r.datum))}</small><br><b>${esc(r.titel)}</b>${r.teaser ? `<br><span class="rr-teaser">${esc(r.teaser)}</span>` : ''}</span></a>`).join('') : leer('Keine Meldungen.')}
        <p class="rr-quelle">Quelle: <a href="https://www.soltau.de/home/aktuelles/neuigkeiten.aspx" target="_blank" rel="noopener">soltau.de – Neuigkeiten</a> (Überschrift und Anriss, der Text steht bei der Stadt)</p>
      </div>
      <div class="rr-card">
        <h3>${RR_ICON.amtsblatt}Amtsblatt</h3>
        ${s.amtsblatt.length ? s.amtsblatt.slice(0, 8).map(a => `<a class="rr-item" href="${esc(a.url)}" target="_blank" rel="noopener"><span><small>${esc(kurz(a.datum))} · Amtsblatt ${esc(a.nummer)} · PDF</small><br><b>${esc(a.thema || 'Amtliche Bekanntmachungen')}</b></span></a>`).join('') : leer('Keine Ausgaben gefunden.')}
        ${s.baustellen.length ? `<h4 class="rr-sub">${RR_ICON.baustelle}Baustellen &amp; Sperrungen</h4>${s.baustellen.map(b => `<a class="rr-item" href="${esc(b.url)}" target="_blank" rel="noopener"><span><small>${esc(kurz(b.datum))}</small><br><b>${esc(b.titel)}</b></span></a>`).join('')}` : ''}
        <p class="rr-quelle">Quelle: <a href="https://www.soltau.de/home/aktuelles/bekanntmachungen_der_stadt_soltau.aspx" target="_blank" rel="noopener">Amtsblatt der Stadt Soltau</a> (amtliche Bekanntmachungen)</p>
      </div>
    </div>
    <div class="rr-meinung"><b>Unsere Meinung dazu?</b><span>Zu den Themen aus Rat und Rathaus schreibt die Fraktion unter „Aktuelles“.</span><a class="btn btn-rot" href="${url('/aktuelles/')}">Aktuelles lesen</a></div>
    <p class="small muted">Stand ${esc(standText(s.stand))}. Diese Seite füllt sich automatisch aus den öffentlichen Seiten der Stadt Soltau; wir zeigen Überschriften, Termine und Links – die Inhalte selbst liegen bei der Stadt.</p>
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
      <h3 style="margin-top:8px">Kalender abonnieren</h3>
      <p class="small">Alle öffentlichen Termine automatisch im Handy-Kalender – neue Termine erscheinen von selbst.</p>
      <a class="btn btn-weiss" href="${url('/assets/termine.ics')}" data-webcal style="justify-self:start">Termine abonnieren</a>
    </div>
  </div>
</section>`;
}

// Ortsverein und Fraktion haben dieselbe Struktur (Wunsch Vorsitz): Kopf → Zahlenband → Team nach Funktion → zwei Kästen → Beiträge
function teamPage({ tag, h1, lead, stats, people, teamTitle, teamHint, boxA, boxB, news, newsTitle }) {
  return `
<section>
  ${pageHead(tag, h1, lead)}
  <div class="band-rot"><div class="wrap" style="padding-block:40px">
    <div class="stats">${stats.map(([n, t]) => `<div class="stat"><b>${esc(n)}</b><span>${esc(t)}</span></div>`).join('')}</div>
  </div></div>
  <div class="wrap section">
    <div class="section-head"><h2 class="title">${teamTitle}</h2>${teamHint ? `<span class="muted">${esc(teamHint)}</span>` : ''}</div>
    <div class="team">${byRole(people).map(teamCard).join('') || '<p class="muted">Wird nach der konstituierenden Sitzung eingetragen.</p>'}</div>
  </div>
  <div class="wrap section" style="padding-top:0">
    <div class="cols cols-2">${boxA}${boxB}</div>
  </div>
  <div class="band-schwarz"><div class="wrap section">
    <div class="section-head"><h2 class="title">${newsTitle}</h2><a class="more" href="${url('/aktuelles/')}">Alle Beiträge</a></div>
    <div class="news">${news.map(newsCard).join('')}</div>
  </div></div>
</section>`;
}

export function fraktionPage(d) {
  const chair = byRole(d.fraktion).find(p => /vorsitz/i.test(p.role) && !/stellv/i.test(p.role));
  return teamPage({
    tag: 'SPD-Ratsfraktion', h1: 'Unsere Fraktion<br>im Stadtrat',
    lead: 'Seit dem 13. September 2026 erstmals stärkste Fraktion im Rat der Stadt Soltau. Wir erklären Entscheidungen, bleiben ansprechbar und setzen den 10-Punkte-Plan um.',
    stats: [['Nr. 1', 'Erstmals stärkste Fraktion'], ['11', 'Gewählte Ratsmitglieder'], ['1. Nov.', 'Beginn der Wahlperiode 2026–31'], ['10', 'Punkte für Soltau']],
    people: d.fraktion, teamTitle: 'Ratsmitglieder', teamHint: 'Sortiert nach Funktion · Klick öffnet das Kurzprofil',
    boxA: `<div class="box box-schwarz">
        <h3>Fraktionsvorsitz</h3>
        <p><b style="color:#fff;font:800 24px/1 var(--display);text-transform:uppercase">${esc(chair ? chair.name : 'Birhat Kaçar')}</b><br><span class="small">${esc(chair ? chair.role : 'Fraktionsvorsitzender, stellv. Bürgermeister')}</span></p>
        <dl><dt>Sitzungen</dt><dd>Vor jeder Ratssitzung, Altes Rathaus</dd><dt>Sprechstunde</dt><dd>Nach Vereinbarung</dd></dl>
        <a class="btn btn-rot" href="${url('/kontakt/')}" style="justify-self:start">Fraktion kontaktieren</a>
      </div>`,
    boxB: `<div class="box box-rot">
        <span class="tag tag-schwarz" style="justify-self:start">Ab 1. November 2026</span>
        <h3>Die neue Fraktion</h3>
        <p class="small">Bei der Kommunalwahl am 13. September wurden elf SPD-Ratsmitglieder gewählt – erstmals stärkste Fraktion im Rat.</p>
        <a class="btn btn-weiss" href="${url('/stadtrat-2026/')}" style="justify-self:start">Unsere 11 Gewählten</a>
      </div>`,
    news: (d.news.filter(n => n.cat === 'Fraktion').slice(0, 3).length ? d.news.filter(n => n.cat === 'Fraktion') : d.news).slice(0, 3), newsTitle: 'Aus dem Rat',
  });
}

export function ortsvereinPage(d) {
  const people = d.vorstand.map(v => ({ name: v.name, job: v.job, role: v.position, photo: v.photo, text: '' }));
  const chairs = byRole(people).filter(p => /vorsitz/i.test(p.role) && !/stellv/i.test(p.role));
  return teamPage({
    tag: 'SPD Ortsverein Soltau', h1: 'Unser Vorstand',
    lead: 'Menschen aus unterschiedlichen Generationen, Berufen und Teilen unserer Stadt. Uns verbindet eine Überzeugung: Soltau kann mehr.',
    stats: [[String(d.vorstand.length), 'Mitglieder im Vorstand'], ['16 + 1', 'Ortschaften und Kernstadt'], ['Roter Bahnhof', 'Unser Treffpunkt am Bahnhof'], [String(d.people.length), 'Kandidatinnen und Kandidaten 2026']],
    people, teamTitle: 'Vorstand', teamHint: 'Sortiert nach Funktion · Klick öffnet das Kurzprofil',
    boxA: `<div class="box box-schwarz">
        <h3>Vorsitz</h3>
        <p>${chairs.map(c => `<b style="color:#fff;font:800 24px/1 var(--display);text-transform:uppercase">${esc(c.name)}</b><br><span class="small">${esc(c.role)}</span>`).join('<br><br>') || '<span class="small">Wird eingetragen.</span>'}</p>
        <dl><dt>Treffpunkt</dt><dd>Roter Bahnhof, Am Bahnhof 1t</dd><dt>Sprechstunde</dt><dd>Nach Vereinbarung</dd></dl>
        <a class="btn btn-rot" href="${url('/kontakt/')}" style="justify-self:start">Vorstand kontaktieren</a>
      </div>`,
    boxB: `<div class="box box-rot">
        <h3>Mitglied werden</h3>
        <p class="small">Mitgestalten statt zuschauen. Im Rat, am Infostand oder im Hintergrund – es gibt viele Wege.</p>
        <a class="btn btn-weiss" href="${url('/mitmachen/')}" style="justify-self:start">Jetzt mitmachen</a>
      </div>`,
    news: (d.news.filter(n => n.cat === 'Ortsverein').slice(0, 3).length ? d.news.filter(n => n.cat === 'Ortsverein') : d.news).slice(0, 3), newsTitle: 'Aus dem Ortsverein',
  });
}

export function zielePage(d) {
  return `
<section>
  ${pageHead('Unsere Ziele', 'Der 10-Punkte-<br>Plan', 'Soltau kann mehr. Dafür braucht es klare Prioritäten, verlässliche Entscheidungen und den Mut, wichtige Projekte endlich umzusetzen.')}
  <div class="wrap section za-list" id="ziele-list">${zielAccordionFotos(d.ziele)}</div>
  <div class="band-rot"><div class="wrap section versprechen">
    <div>
      <span class="tag tag-schwarz">Unser Versprechen</span>
      <h2 class="title">Entscheiden.<br>Finanzieren.<br>Umsetzen.</h2>
    </div>
    <div>
      <p style="font-size:19px">Wir wollen Projekte nicht über Jahre diskutieren, sondern Entscheidungen treffen, Finanzierung sichern und anschließend umsetzen. Woran wir uns messen lassen: an dem, was in Soltau tatsächlich passiert.</p>
      ${d.site.programmPdf ? `<a class="btn btn-schwarz" href="${esc(d.site.programmPdf)}" target="_blank" rel="noopener" style="margin-top:18px">Das ausführliche Wahlprogramm</a>` : ''}
    </div>
  </div></div>
</section>`;
}

export function mitmachenPage(d) {
  return `
<section>
  ${pageHead('Mitmachen', 'Soltau<br>mitgestalten', 'Ob Mitgliedschaft, Newsletter oder ein Nachmittag am Infostand – jede Unterstützung zählt.')}
  <div class="wrap section split">
    <form class="form wix-form" id="form-mitglied" data-collection="Anfragen" novalidate>
      <input type="hidden" name="typ" value="mitglied">
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
        <label class="check"><input type="checkbox" id="m-ds" required> <span>Ich habe die <a href="${url('/datenschutz/')}">Datenschutzhinweise</a> gelesen.</span></label>
        <p class="note" hidden></p>
        <button class="btn btn-rot" type="submit" style="justify-self:start">Absenden</button>
      </div>
      <p class="form-ok" hidden>Danke! Wir melden uns in den nächsten Tagen bei Ihnen.</p>
    </form>
    <div style="display:grid;gap:20px">
      <div class="box">
        <h3>Newsletter</h3>
        <form class="wix-form abo-form" id="form-news-page" data-collection="Abonnenten" novalidate style="display:grid;gap:10px">
          <input type="hidden" name="typ" value="anmeldung"><input type="hidden" name="quelle" value="mitmachen">
          <div class="form-fields field"><label for="nl-mail-page">E-Mail-Adresse</label><input id="nl-mail-page" name="email" type="email" required autocomplete="email"><button class="btn btn-schwarz" type="submit" style="justify-self:start;margin-top:8px">Anmelden</button></div>
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
    <form class="form wix-form" id="form-kontakt" data-collection="Anfragen" novalidate>
      <input type="hidden" name="typ" value="kontakt"><input type="hidden" name="thema" id="k-thema" value="Straßen &amp; Verkehr">
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
        <label class="check"><input type="checkbox" id="k-ds" required> <span>Ich habe die <a href="${url('/datenschutz/')}">Datenschutzhinweise</a> gelesen.</span></label>
        <p class="note" hidden></p>
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
      <a class="karte" href="https://www.openstreetmap.org/?mlat=52.9833&amp;mlon=9.8310#map=18/52.9833/9.8310" target="_blank" rel="noopener" aria-label="Karte öffnen: Roter Bahnhof, Am Bahnhof 1t, 29614 Soltau (OpenStreetMap)">
        <img src="${url('/assets/images/luftbild-roter-bahnhof.jpg')}" alt="Luftbild: der Rote Bahnhof am Bahnhof Soltau" width="1200" height="800" loading="lazy" decoding="async">
        <span class="karte-pin" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 22s7-7.1 7-12.5A7 7 0 0 0 5 9.5C5 14.9 12 22 12 22z" fill="#E3000F" stroke="#fff" stroke-width="1.5"/><circle cx="12" cy="9.5" r="2.6" fill="#fff"/></svg></span>
        <span class="karte-label"><b>Roter Bahnhof</b><span>Am Bahnhof 1t · Karte öffnen</span></span>
        <small class="karte-credit">Luftbild: LGLN (2026), CC BY 4.0</small>
      </a>
    </div>
  </div>
</section>`;
}

const legal = (tag, h1, html) => `
<section>
  <div class="page-head"><div class="wrap"><span class="tag">${esc(tag)}</span><h1 class="title">${h1}</h1></div></div>
  <div class="wrap section prose">${html}</div>
</section>`;

// Newsletter: Bestätigung (Double-Opt-in) und Abmeldung über Links aus den E-Mails – site.js meldet das Token an die Sammlung Abonnenten
export function newsletterPage(d) {
  return `
<section>
  ${pageHead('Newsletter', 'Nichts<br>verpassen', 'Etwa einmal im Monat: Was im Stadtrat entschieden wurde, was ansteht, wo wir uns treffen.')}
  <div class="wrap section" style="max-width:720px">
    <div id="abo-status" class="mb-card"><p>Einen Moment …</p></div>
    <div class="box" style="margin-top:28px">
      <h3>Neu anmelden</h3>
      <form class="wix-form abo-form" id="form-news-nl" data-collection="Abonnenten" novalidate style="display:grid;gap:10px">
        <input type="hidden" name="typ" value="anmeldung"><input type="hidden" name="quelle" value="newsletterseite">
        <div class="form-fields field"><label for="nl-mail-nl">E-Mail-Adresse</label><input id="nl-mail-nl" name="email" type="email" required autocomplete="email"><button class="btn btn-schwarz" type="submit" style="justify-self:start">Anmelden</button></div>
        <p class="note" hidden></p>
        <p class="form-ok" hidden>Danke! Bitte bestätigen Sie die Anmeldung über den Link in Ihrer E-Mail.</p>
      </form>
      <p class="small muted">Sie können sich jederzeit über den Link am Ende jeder Ausgabe abmelden. Hinweise zum Datenschutz: <a href="${url('/datenschutz/')}">Datenschutzerklärung</a>.</p>
    </div>
  </div>
</section>`;
}

export function impressumPage(d) {
  const mail = d.site.email ? `<a href="mailto:${esc(d.site.email)}">${esc(d.site.email)}</a>` : '<span class="legal-todo">E-Mail-Adresse wird ergänzt</span>';
  return legal('Rechtliches', 'Impressum', `
    <h2>Angaben gemäß § 5 DDG</h2>
    <p><b>SPD Ortsverein Soltau</b><br>Am Bahnhof 1t („Roter Bahnhof“)<br>29614 Soltau</p>
    <p>Der SPD Ortsverein Soltau ist eine Gliederung der Sozialdemokratischen Partei Deutschlands (SPD), einer Partei im Sinne des Parteiengesetzes, innerhalb des SPD-Unterbezirks Heidekreis und des SPD-Landesverbands Niedersachsen (Odeonstraße 15/16, 30159 Hannover).</p>
    <p><b>Vertreten durch</b> die Vorsitzenden Laura Elbers Gutiérrez und Birhat Kaçar.</p>
    <p><b>Kontakt</b><br>E-Mail: ${mail}<br>Internet: <a href="https://www.spd-soltau.de">www.spd-soltau.de</a></p>
    <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
    <p>Birhat Kaçar<br>Am Bahnhof 1t<br>29614 Soltau</p>
    <h2>Ratsfraktion</h2>
    <p>Die Seiten „Fraktion“, „Unsere 11 im Stadtrat“ und „Aus Rat &amp; Rathaus“ informieren über die Arbeit der SPD-Fraktion im Rat der Stadt Soltau. Fraktionsvorsitz: Birhat Kaçar. Die Fraktion ist Teil des Rates der Stadt Soltau (Poststraße 12, 29614 Soltau); die dort verlinkten amtlichen Informationen (Bürgerinformationssystem, Amtsblatt) stammen von der Stadt Soltau.</p>
    <h2>Haftung für Inhalte</h2>
    <p>Wir erstellen die Inhalte dieser Seiten mit großer Sorgfalt. Für Richtigkeit, Vollständigkeit und Aktualität können wir dennoch keine Gewähr übernehmen. Beiträge geben die Auffassung des Ortsvereins bzw. der Fraktion wieder; Berichte aus dem Rat sind keine amtlichen Protokolle – maßgeblich sind die Veröffentlichungen der Stadt Soltau.</p>
    <h2>Haftung für Links</h2>
    <p>Unsere Seiten enthalten Links zu externen Websites (u. a. Stadt Soltau, Bürgerinformationssystem, Instagram, SPD-Gliederungen). Auf deren Inhalte haben wir keinen Einfluss; für sie ist der jeweilige Anbieter verantwortlich. Zum Zeitpunkt der Verlinkung waren keine Rechtsverstöße erkennbar. Bei Bekanntwerden von Rechtsverletzungen entfernen wir den Link umgehend.</p>
    <h2>Urheberrecht</h2>
    <p>Texte, Fotos und Grafiken auf diesen Seiten unterliegen dem deutschen Urheberrecht. Fotos: SPD Ortsverein Soltau, sofern nicht anders angegeben; das Bildmaterial zur Landratswahl wird mit Erlaubnis von Sebastian Zinke verwendet. Amtliche Werke der Stadt Soltau (Amtsblatt, Bekanntmachungen) sind gemeinfrei (§ 5 UrhG); von Meldungen der Stadt übernehmen wir lediglich Überschrift und Anriss mit Quellenangabe und Link. Eine Nutzung unserer Inhalte über das Zitatrecht hinaus bedarf der Zustimmung.</p>
    <h2>Technik</h2>
    <p>Die Website wird als statische Seite über GitHub Pages ausgeliefert; Inhalte werden im Redaktionssystem von Wix gepflegt. Einzelheiten zur Datenverarbeitung: <a href="${url('/datenschutz/')}">Datenschutzerklärung</a>.</p>`);
}

export function datenschutzPage(d) {
  const mail = d.site.email ? `<a href="mailto:${esc(d.site.email)}">${esc(d.site.email)}</a>` : '<span class="legal-todo">E-Mail-Adresse wird ergänzt</span>';
  return legal('Rechtliches', 'Datenschutz', `
    <p class="lead">Kurz gesagt: Diese Website kommt ohne Tracking und ohne Werbe-Cookies aus. Was wir verarbeiten, wofür und wie lange, steht hier – verständlich und vollständig nach Art. 13 DSGVO.</p>
    <h2>1. Verantwortlich</h2>
    <p>SPD Ortsverein Soltau, Am Bahnhof 1t, 29614 Soltau, vertreten durch die Vorsitzenden Laura Elbers Gutiérrez und Birhat Kaçar.<br>E-Mail: ${mail}</p>
    <p>Bei Fragen zum Datenschutz wenden Sie sich an diese Adresse. Der SPD-Landesverband Niedersachsen hat eine Datenschutzbeauftragte bzw. einen Datenschutzbeauftragten bestellt (SPD Landesverband Niedersachsen, Odeonstraße 15/16, 30159 Hannover).</p>
    <h2>2. Aufruf der Website (Hosting)</h2>
    <p>Die Seiten werden als statische Dateien über <b>GitHub Pages</b> ausgeliefert (GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA; in Europa: GitHub B.V., Amsterdam). Beim Aufruf verarbeitet GitHub technisch notwendige Verbindungsdaten: IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, Browser- und Betriebssystemangaben. Diese Daten dienen der Auslieferung und der Sicherheit der Seiten. Rechtsgrundlage ist unser berechtigtes Interesse an einem sicheren, stabilen Betrieb (Art. 6 Abs. 1 lit. f DSGVO). GitHub ist unter dem EU-US Data Privacy Framework zertifiziert; damit besteht für die Übermittlung in die USA ein Angemessenheitsbeschluss der EU-Kommission. Weitere Informationen: <a href="https://docs.github.com/de/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener">Datenschutzerklärung von GitHub</a>.</p>
    <p>Wir selbst führen keine Besucherstatistik und setzen keine Analyse-Werkzeuge ein.</p>
    <h2>3. Inhalte, Fotos und Video aus dem Redaktionssystem (Wix)</h2>
    <p>Texte, Termine, Fotos und das Hintergrundvideo der Startseite werden im Redaktionssystem von <b>Wix</b> gepflegt (Wix.com Ltd., 40 Namal Tel Aviv St., Tel Aviv, Israel). Fotos und Videos werden beim Aufruf direkt von Wix-Servern geladen (static.wixstatic.com, video.wixstatic.com); dabei wird Ihre IP-Adresse an Wix übermittelt. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Auslieferung der Inhalte). Für Israel besteht ein Angemessenheitsbeschluss der EU-Kommission; mit Wix besteht ein Vertrag zur Auftragsverarbeitung. Weitere Informationen: <a href="https://de.wix.com/about/privacy" target="_blank" rel="noopener">Datenschutzerklärung von Wix</a>.</p>
    <p><b>E-Mail:</b> Unser Postfach info@spd-soltau.de wird bei Google Workspace (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland) betrieben; Google ist als Auftragsverarbeiter gebunden und für den Datenschutzrahmen EU–USA zertifiziert. Wer uns eine E-Mail schreibt, dessen Nachricht wird dort verarbeitet und so lange gespeichert, wie es für die Bearbeitung nötig ist (Art. 6 Abs. 1 lit. f DSGVO).</p>
    <h2>4. Kontakt-, Mitmach- und Buchungsformulare</h2>
    <p>Wenn Sie ein Formular abschicken (Kontakt, Mitglied werden, Roter Bahnhof buchen), speichern wir die eingegebenen Angaben (z. B. Name, E-Mail-Adresse, Telefon, Nachricht, Wunschtermin) im Redaktionssystem von Wix und verarbeiten sie ausschließlich, um Ihr Anliegen zu bearbeiten. Zuständige Vorstandsmitglieder werden über eine neue Anfrage benachrichtigt; die Inhalte der Anfrage sind dabei verschlüsselt abgelegt und nur für die Bearbeitenden lesbar. Rechtsgrundlage: Art. 6 Abs. 1 lit. b DSGVO (Bearbeitung Ihrer Anfrage) bzw. lit. f (Beantwortung allgemeiner Anfragen). Anfragen löschen wir, sobald sie erledigt sind, spätestens nach zwölf Monaten; Buchungsanfragen nach Ablauf des gebuchten Termins zuzüglich der handelsrechtlichen Aufbewahrung, soweit eine Kostenbeteiligung anfällt.</p>
    <h2>5. Newsletter</h2>
    <p>Für den Newsletter speichern wir Ihre E-Mail-Adresse, den Zeitpunkt der Anmeldung und der Bestätigung. Die Anmeldung erfolgt im Double-Opt-in-Verfahren: Erst nach dem Klick auf den Bestätigungslink werden Sie in den Verteiler aufgenommen. Der Versand erfolgt über einen E-Mail-Server, den der Ortsverein nutzt; wir setzen keine Öffnungs- oder Klickmessung ein. Rechtsgrundlage: Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO). Sie können sie jederzeit über den Link am Ende jeder Ausgabe oder per E-Mail an uns widerrufen; Ihre Adresse wird dann aus dem Verteiler entfernt.</p>
    <h2>6. Mitgliederbereich und App</h2>
    <p>Unter <a href="${url('/mitglieder/')}">Mitgliederbereich</a> können sich Mitglieder des SPD Ortsvereins Soltau registrieren. Dabei werden verarbeitet:</p>
    <ul>
      <li><b>Mitgliederkonto</b> (Name, E-Mail-Adresse, Passwort – bei Wix verschlüsselt gespeichert). Der Vorstand prüft vor der Freischaltung, dass es sich um ein Mitglied handelt. Da die Zugehörigkeit zu einer Partei eine besondere Kategorie personenbezogener Daten ist, stützen wir diese Verarbeitung auf Art. 9 Abs. 2 lit. d DSGVO (Verarbeitung durch eine politische Organisation für ihre Mitglieder) und Art. 6 Abs. 1 lit. b DSGVO (Nutzungsverhältnis).</li>
      <li><b>Freiwillige Profilangaben</b> (Ortsteil, Telefon, Geburtstag, Eintrittsjahr) und die Entscheidung, ob Sie im Mitgliederverzeichnis stehen und was andere Mitglieder davon sehen – auf Grundlage Ihrer Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), jederzeit im Profil änderbar.</li>
      <li><b>Nutzung der Funktionen</b>: Zu- und Absagen zu Terminen (mit optionalem Grund, den nur der Vorstand sieht), Umfrageantworten (Umfragen sind nicht geheim – der Vorstand kann die Abstimmung einsehen), Helferlisten, Fahrgemeinschaften, Ideen, Dokumente, Sitzungen, Versammlungen und Wahlkampf-Listen. Diese Angaben sind für die angemeldeten Mitglieder sichtbar, soweit der Vorstand die Sichtbarkeit nicht einschränkt. Rechtsgrundlage: Art. 6 Abs. 1 lit. b und f DSGVO.</li>
      <li><b>Verschlüsselte Bereiche</b>: Aufgaben, Dokumente und Anträge der Ratsfraktion sowie Anliegen an den Vorstand werden mit einem Schlüssel verschlüsselt, den nur die Geräte der jeweils berechtigten Mitglieder erhalten. Wix speichert diese Inhalte nur in verschlüsselter Form.</li>
      <li><b>Push-Benachrichtigungen</b> (freiwillig): Wenn Sie sie einschalten, speichern wir die Adresse, die Ihr Browser dafür vergibt, und Ihre Themenauswahl. Die Zustellung läuft über den Push-Dienst Ihres Geräteherstellers (Google, Apple oder Mozilla). Rechtsgrundlage: Ihre Einwilligung (Art. 6 Abs. 1 lit. a DSGVO), widerrufbar in der App unter Profil oder in den Browsereinstellungen.</li>
      <li><b>Roboter-Prüfung bei der Registrierung</b>: Zum Schutz vor automatisierten Anmeldungen nutzt das Registrierungsformular Google reCAPTCHA Enterprise (Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Irland). Das Skript wird erst geladen, wenn Wix eine Prüfung verlangt; dabei werden Ihre IP-Adresse und Angaben zum Nutzungsverhalten an Google übermittelt. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO (Schutz vor Missbrauch). Informationen: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">Datenschutzerklärung von Google</a>.</li>
      <li><b>Speicherung auf Ihrem Gerät</b>: Der Mitgliederbereich speichert Anmeldedaten (Zugangstoken), Einstellungen und – als installierbare App – Seiteninhalte für die Offline-Nutzung im Browser (Local Storage, IndexedDB, Service Worker). Das ist für die Funktion erforderlich (§ 25 Abs. 2 TDDDG) und wird beim Abmelden bzw. Löschen der Website-Daten entfernt.</li>
      <li><b>Kalender-Abo</b>: Die Terminliste für Mitglieder ist über eine geheime Adresse abrufbar, die nur im Mitgliederbereich angezeigt wird. Ihr Kalenderprogramm ruft sie regelmäßig ab.</li>
    </ul>
    <p>Der Vorstand kann im Redaktionssystem von Wix die gespeicherten Daten des Mitgliederbereichs einsehen, soweit sie nicht verschlüsselt sind. Konten und zugehörige Daten löschen wir auf Wunsch oder beim Ende der Mitgliedschaft.</p>
    <h2>7. Inhalte der Stadt Soltau, Instagram und externe Links</h2>
    <p>Der Bereich „Aus Rat &amp; Rathaus“ zeigt Überschriften, Termine und Links, die unser Bau-Roboter regelmäßig von den öffentlichen Seiten der Stadt Soltau abruft – dabei werden keine Daten von Ihnen verarbeitet. Instagram-Beiträge zeigen wir als selbst gespeicherte Vorschaubilder; erst beim Klick auf einen Beitrag gelangen Sie zu Instagram (Meta Platforms Ireland Ltd.), wo deren Datenschutzbestimmungen gelten. Gleiches gilt für alle anderen externen Links.</p>
    <h2>8. Schriften, Karten, Cookies</h2>
    <p>Schriften werden von unserem eigenen Server geladen (keine Google Fonts). Wir binden keine Kartendienste und keine Social-Media-Plugins ein; das Luftbild auf der Kontaktseite ist ein bei uns gespeichertes Bild (Quelle: Landesamt für Geoinformation und Landesvermessung Niedersachsen, CC BY 4.0), der Kartenlink führt erst nach Klick zu OpenStreetMap. Technisch notwendige Speicherung auf Ihrem Gerät erfolgt nur im Mitgliederbereich (siehe 6) und für den Passwortschutz der Testversion; Werbe- oder Tracking-Cookies setzen wir nicht. Ein Cookie-Banner ist daher nicht erforderlich.</p>
    <p><b>Reichweitenmessung ohne Cookies:</b> Um zu wissen, welche Seiten gelesen werden, zählen wir Seitenaufrufe. Dabei übermittelt Ihr Browser an unser Redaktionssystem (Wix) die aufgerufene Seite, die Herkunft nur als Domain (z. B. „google.com“ oder „direkt“), die Geräteklasse (Handy, Tablet, PC), die Browsersprache, die Bildschirmbreite gerundet und die Ladezeit. Es werden keine IP-Adressen gespeichert, keine Kennungen vergeben und keine Cookies gesetzt; einzelne Personen sind nicht erkennbar. Die Einzeleinträge werden innerhalb weniger Minuten zu Tageszahlen zusammengefasst und gelöscht. Rechtsgrundlage ist unser berechtigtes Interesse an der Verbesserung der Website (Art. 6 Abs. 1 lit. f DSGVO).</p>
    <h2>9. Ihre Rechte</h2>
    <p>Sie haben das Recht auf Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO), auf Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21). Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen. Wenden Sie sich dafür an die oben genannte Adresse.</p>
    <p>Sie haben außerdem das Recht, sich bei einer Aufsichtsbehörde zu beschweren. Zuständig ist die Landesbeauftragte für den Datenschutz Niedersachsen, Prinzenstraße 5, 30159 Hannover, <a href="https://lfd.niedersachsen.de" target="_blank" rel="noopener">lfd.niedersachsen.de</a>.</p>
    <h2>10. Sicherheit und Änderungen</h2>
    <p>Alle Seiten werden verschlüsselt über HTTPS übertragen. Wir passen diese Erklärung an, wenn sich die Website oder die Rechtslage ändert. Stand: ${esc(new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }))}.</p>`);
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

// ---------- Kommunalwahl 2026: Unsere 11 im Stadtrat ----------
const mandatCard = p => `<button class="person" type="button" data-name="${esc(p.name)}">${p.photo && p.photo.url ? `<div class="avatar has-img"><img src="${esc(p.photo.url)}" alt="${esc(p.name)}" loading="lazy" decoding="async"><span></span></div>` : `<div class="avatar"><span>${esc(p.name.split(' ').map(x => x[0]).slice(0, 2).join(''))}</span></div>`}<div class="plate"><b>${esc(p.name)}</b><small>${esc(p.job)}</small><span class="rolle">${p.art === 'direkt' ? `${p.stimmen.toLocaleString('de-DE')} Stimmen · direkt` : `Listenplatz ${p.listenplatz} · Liste`}</span></div></button>`;

export function stadtratPage(d) {
  const w = d.wahl, nr = d.nachruecker;
  const max = Math.max(...w.sitze.map(x => x[1]));
  const small = p => `<button class="person" type="button" data-name="${esc(p.name)}">${p.photo && p.photo.url ? `<div class="avatar has-img"><img src="${esc(p.photo.url)}" alt="${esc(p.name)}" loading="lazy" decoding="async"><span></span></div>` : `<div class="avatar"><span>${esc(p.name.split(' ').map(x => x[0]).slice(0, 2).join(''))}</span></div>`}<div class="plate"><b>${esc(p.name)}</b><small>${esc(p.job)}</small><span class="rolle">${p.stimmen.toLocaleString('de-DE')} Stimmen · Listenplatz ${p.listenplatz}</span></div></button>`;
  return `
<section>
  ${pageHead('Kommunalwahl 2026', 'Unsere 11<br>im Stadtrat', 'Am 13. September haben die Soltauerinnen und Soltauer gewählt. 9.268 Stimmen und 30,8 Prozent machen die SPD zum ersten Mal zur stärksten Fraktion im Rat – mit elf von 34 Sitzen. Danke für dieses Vertrauen. Die neue Wahlperiode beginnt am 1. November 2026.')}
  <div class="band-rot"><div class="wrap" style="padding-block:40px">
    <div class="stats">
      <div class="stat"><b>9.268</b><span>Stimmen für die SPD</span></div>
      <div class="stat"><b>30,8 %</b><span>Stärkste Kraft in Soltau</span></div>
      <div class="stat"><b>11</b><span>von 34 Sitzen im Rat</span></div>
      <div class="stat"><b>58,8 %</b><span>Wahlbeteiligung</span></div>
    </div>
  </div></div>
  <div class="wrap section">
    <div class="section-head"><h2 class="title">Die gewählten<br>Ratsmitglieder</h2><span class="muted">Reihenfolge nach Stimmen · Klick öffnet das Kurzprofil</span></div>
    <div class="people rat" id="rat">${d.rat.map(mandatCard).join('')}</div>
    <p class="small muted" style="margin-top:16px">Acht Sitze wurden über die persönlichen Stimmen vergeben („direkt“), drei über die Reihenfolge der Liste – so sieht es das niedersächsische Kommunalwahlrecht vor.</p>
  </div>
  <div class="band-grau"><div class="wrap section split">
    <div>
      <div class="section-head"><h2 class="title">Wer nachrückt</h2></div>
      <p style="margin-bottom:18px">Scheidet ein Ratsmitglied aus, rückt eine Ersatzperson nach. Für die acht direkt gewählten Sitze gilt die Reihenfolge der Stimmen, für die drei Listensitze die Reihenfolge der Liste.</p>
      <h3 style="font:800 22px/1 var(--display);text-transform:uppercase;margin-bottom:12px">Nach Stimmen</h3>
      <div class="ansprech" style="margin-bottom:28px">${nr.nachStimmen.map(small).join('')}</div>
      <h3 style="font:800 22px/1 var(--display);text-transform:uppercase;margin-bottom:12px">Nach Liste</h3>
      <div class="ansprech">${nr.nachListe.map(small).join('')}</div>
    </div>
    <div style="display:grid;gap:20px">
      <div class="box box-schwarz">
        <h3>Sitzverteilung im neuen Rat</h3>
        <ul class="seats">${w.sitze.map(([p, n]) => `<li><span class="seats-name">${esc(p)}</span><span class="seats-bar"><i style="width:${Math.round(n / max * 100)}%"></i></span><span class="seats-n">${n}</span></li>`).join('')}</ul>
        <p class="small" style="opacity:.8">34 Sitze insgesamt · Wahlbeteiligung 58,8 %</p>
      </div>
      <div class="box">
        <h3>Zum Ergebnis</h3>
        <p class="small">Vorläufiges amtliches Endergebnis der Stadt Soltau, Stand ${esc(w.stand)}. Die verbindliche Reihenfolge der Ersatzpersonen stellt der Wahlausschuss mit dem amtlichen Endergebnis fest.</p>
        <a class="btn btn-line" href="${esc(w.quelle)}" target="_blank" rel="noopener" style="justify-self:start">Amtliches Ergebnis</a>
      </div>
    </div>
  </div></div>
  <div class="wrap section">
    <div class="section-head"><h2 class="title">Alle 27 Kandidatinnen<br>und Kandidaten</h2><a class="more" href="${url('/ortsverein/')}">Zum Vorstand</a></div>
    <div class="ergebnis-tabelle"><table>
      <thead><tr><th>Platz</th><th>Name</th><th>Liste</th><th>Stimmen</th><th></th></tr></thead>
      <tbody>${w.alle.map(([name, st, lp], i) => { const g = w.gewaehlt.find(x => x.name === name); return `<tr class="${g ? 'gewaehlt' : ''}"><td>${i + 1}</td><td>${esc(name)}</td><td>${lp}</td><td>${st.toLocaleString('de-DE')}</td><td>${g ? `<span class="badge badge-mit">${g.art === 'direkt' ? 'gewählt' : 'gewählt (Liste)'}</span>` : ''}</td></tr>`; }).join('')}</tbody>
    </table></div>
  </div>
</section>`;
}

// ---------- Mitgliederbereich (App) ----------
export function mitgliederPage(d) {
  return `
<section>
  <div class="wrap section mb-wrap">
    <div id="mitglieder-app" class="mb-app"><p class="muted">Lade Mitgliederbereich …</p></div>
    <noscript><p class="note note-err">Für den Mitgliederbereich muss JavaScript aktiviert sein.</p></noscript>
  </div>
</section>
<script type="module" src="${url('/assets/mitglieder.js')}"></script>`;
}

// ---------- Roter Bahnhof: Buchungsanfrage ----------
export function roterBahnhofPage(d) {
  return `
<section>
  ${pageHead('Roter Bahnhof', 'Unseren Treffpunkt<br>anfragen', 'Am Bahnhof 1t, 29614 Soltau. Vereine, Initiativen und Gruppen können den Roten Bahnhof für Treffen und kleine Veranstaltungen anfragen.')}
  <div class="wrap section split">
    <form class="form wix-form" id="form-buchung" data-collection="Buchungen" novalidate>
      <div class="form-fields" style="display:grid;gap:18px">
        <h2 class="title" style="font-size:40px">Buchungsanfrage</h2>
        <p class="small muted">Wir melden uns so schnell wie möglich per E-Mail oder Telefon und bestätigen den Termin. Die Anfrage ist unverbindlich.</p>
        <div class="mb-2">
          <div class="field"><label for="b-name">Name</label><input id="b-name" name="name" type="text" required autocomplete="name"></div>
          <div class="field"><label for="b-org">Verein / Gruppe (optional)</label><input id="b-org" name="organisation" type="text" autocomplete="organization"></div>
        </div>
        <div class="mb-2">
          <div class="field"><label for="b-mail">E-Mail</label><input id="b-mail" name="email" type="email" required autocomplete="email"></div>
          <div class="field"><label for="b-tel">Telefon (für Rückfragen)</label><input id="b-tel" name="telefon" type="tel" autocomplete="tel"></div>
        </div>
        <div class="mb-3">
          <div class="field"><label for="b-datum">Datum</label><input id="b-datum" name="datum" type="date" required></div>
          <div class="field"><label for="b-von">Von</label><input id="b-von" name="von" type="time" required></div>
          <div class="field"><label for="b-bis">Bis</label><input id="b-bis" name="bis" type="time" required></div>
        </div>
        <div class="mb-2">
          <div class="field"><label for="b-zweck">Anlass</label><input id="b-zweck" name="zweck" type="text" required placeholder="z. B. Vereinssitzung, Vortrag, Geburtstag"></div>
          <div class="field"><label for="b-personen">Personen (ca.)</label><input id="b-personen" name="personen" type="number" min="1" max="80" inputmode="numeric"></div>
        </div>
        <div class="field"><label for="b-msg">Nachricht (optional)</label><textarea id="b-msg" name="nachricht" placeholder="Besondere Wünsche, Bestuhlung, Technik …"></textarea></div>
        <label class="check"><input type="checkbox" id="b-ds" required> <span>Ich habe die <a href="${url('/datenschutz/')}">Datenschutzhinweise</a> gelesen. Meine Angaben werden zur Bearbeitung der Anfrage gespeichert.</span></label>
        <p class="note" hidden></p>
        <button class="btn btn-rot" type="submit" style="justify-self:start">Anfrage senden</button>
      </div>
      <p class="form-ok" hidden>Danke! Ihre Anfrage ist bei uns eingegangen. Der Vorstand meldet sich in Kürze.</p>
    </form>
    <div style="display:grid;gap:20px">
      <div class="box box-schwarz">
        <h3>Der Rote Bahnhof</h3>
        <dl>
          <dt>Adresse</dt><dd>Am Bahnhof 1t, 29614 Soltau</dd>
          <dt>Platz</dt><dd>Für Sitzungen, Vorträge und kleine Feiern</dd>
          <dt>Ausstattung</dt><dd>Tische, Stühle, Beamer, Küche</dd>
          <dt>Kosten</dt><dd>Nach Absprache – für Vereine und Initiativen in der Regel kostenfrei</dd>
        </dl>
      </div>
      <div class="box">
        <h3>So läuft es</h3>
        <ul class="list">
          <li><b>1. Anfragen</b><span class="small muted">Formular ausfüllen – der Vorstand wird sofort benachrichtigt</span></li>
          <li><b>2. Bestätigung</b><span class="small muted">Wir melden uns per E-Mail oder Telefon</span></li>
          <li><b>3. Schlüssel</b><span class="small muted">Übergabe nach Absprache</span></li>
        </ul>
      </div>
      <div class="box">
        <h3>Lieber direkt sprechen?</h3>
        <p class="small">Schreiben Sie uns über die <a href="${url('/kontakt/')}">Kontaktseite</a> – oder sprechen Sie uns beim nächsten Infostand an.</p>
      </div>
    </div>
  </div>
</section>`;
}
