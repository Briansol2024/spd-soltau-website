// Countdown-Seite („Wartungsseite“) bis zum Start der neuen Website: eigenständige Seite ohne Layout,
// Drohnenvideo von Soltau als Hintergrund, große laufende Zahlen, Ticker mit dem, was kommt, Konfetti um Punkt null.
// Liegt immer unter /bald/ (ohne Passwortschutz); mit LAUNCH_AT in der Zukunft wird sie zusätzlich zur Startseite (echte Startseite dann unter /start/, Knopf „Anmelden“)
// und der stündliche/halbstündliche Build tauscht sie um Punkt null gegen die echte Startseite (die Seite lädt dann selbst nach).
import { esc, url } from './render.mjs';

const TEASER = ['Termine mit Zusage per Fingertipp', 'Mitgliederbereich als App', 'Live aus Rat & Rathaus', 'Umfrage der Woche', 'Ideen für Soltau einreichen', 'Der Rote Bahnhof zum Anfragen', 'Unsere 11 im Stadtrat', 'Newsletter – nichts verpassen', 'Was können wir für Sie tun?'];

export function countdownPage(d, { launchAt, atRoot = false }) {
  const site = d.site;
  const when = new Date(launchAt);
  const datum = when.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' });
  const uhr = when.toLocaleTimeString('de-DE', { hour: 'numeric', minute: '2-digit', timeZone: 'Europe/Berlin' });
  const video = site.heroVideoId ? `https://video.wixstatic.com/video/${site.heroVideoId}` : '';
  const poster = site.heroPoster || '';
  const title = 'Bald: die neue spd-soltau.de';
  const desc = `Am ${datum} um ${uhr} Uhr startet die neue Website der SPD Soltau – mit Mitgliederbereich als App, Terminen zum Zusagen und allem aus Rat & Rathaus.`;
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#0F0F0F">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
${site.url ? `<meta property="og:image" content="${esc(site.url + '/assets/images/hero-poster.jpg')}">` : ''}
<link rel="icon" href="${url('/assets/favicon.svg')}" type="image/svg+xml">
<link rel="preload" href="${url('/assets/fonts/thesans-spd-versal-extrabold.woff2')}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${url('/assets/fonts.css')}">
<style>
:root{--rot:#E3000F;--schwarz:#0F0F0F;--weiss:#fff;--display:'TheSans SPD Versal','TheSans SPD','Segoe UI',Arial,sans-serif;--body:'TheSans SPD','Segoe UI',Arial,sans-serif;--ease:cubic-bezier(.2,.7,.2,1)}
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{height:100%}
body{margin:0;background:var(--schwarz);color:var(--weiss);font-family:var(--body);font-size:17px;line-height:1.5;-webkit-font-smoothing:antialiased;overflow-x:hidden}
.stage{position:relative;min-height:100svh;display:grid;grid-template-rows:auto 1fr auto;isolation:isolate}
.bg{position:fixed;inset:0;z-index:-2;background:#0F0F0F center/cover no-repeat${poster ? ` url('${esc(poster)}')` : ''}}
.bg video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 1.6s ease}
.bg video.ready{opacity:1}
.bg::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(15,15,15,.55) 0%,rgba(15,15,15,.35) 40%,rgba(15,15,15,.9) 100%),radial-gradient(60% 50% at 50% 100%,rgba(227,0,15,.55),transparent 70%)}
.glow{position:fixed;z-index:-1;width:60vmax;height:60vmax;border-radius:50%;filter:blur(90px);opacity:.35;background:var(--rot);animation:drift 22s ease-in-out infinite alternate;pointer-events:none}
.glow.g2{left:auto;right:-20vmax;top:-10vmax;animation-duration:31s;opacity:.22}
.glow.g1{left:-25vmax;bottom:-30vmax}
@keyframes drift{from{transform:translate(0,0) scale(1)}to{transform:translate(12vmax,-8vmax) scale(1.15)}}
.top{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px clamp(18px,4vw,48px)}
.top img{display:block;height:56px;width:auto}
.top-r{display:flex;align-items:center;gap:14px}
.top .tag{font:800 12px/1 var(--display);letter-spacing:.22em;text-transform:uppercase;background:var(--rot);padding:9px 12px 8px;animation:fadeDown .8s var(--ease) both .3s}
.login{display:inline-flex;align-items:center;gap:6px;color:#fff;opacity:.7;font:700 12px/1 var(--display);letter-spacing:.18em;text-transform:uppercase;text-decoration:none;padding:8px 4px;transition:opacity .2s}
.login:hover{opacity:1}
.login svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
main{display:grid;place-items:center;padding:10px clamp(18px,4vw,48px) 28px;text-align:center}
.eyebrow{font:700 clamp(13px,1.6vw,16px)/1 var(--body);letter-spacing:.28em;text-transform:uppercase;opacity:.85;animation:fadeDown .8s var(--ease) both .4s}
h1{font:800 clamp(64px,12vw,150px)/.88 var(--display);text-transform:uppercase;margin:12px 0 4px;letter-spacing:-.01em;text-wrap:balance}
h1 .ln{display:block;overflow:hidden;padding:.06em 0}
h1 i{display:inline-block;font-style:normal;animation:moinIn 1s cubic-bezier(.2,.9,.25,1.25) both;transform-origin:50% 100%}
h1 i.rot{color:var(--rot)}
h1 i.sp{width:.28em}
@keyframes moinIn{0%{transform:translateY(115%) rotate(8deg);opacity:0}55%{opacity:1}100%{transform:none;opacity:1}}
.sub{font:700 clamp(20px,3vw,30px)/1.2 var(--display);text-transform:uppercase;letter-spacing:.02em;margin:0 0 26px;animation:fadeDown .8s var(--ease) both 1.1s}
.sub b{color:var(--rot)}
.cd{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:clamp(8px,1.6vw,18px);width:min(100%,760px);animation:fadeDown .9s var(--ease) both 1.3s}
.cd-box{position:relative;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);padding:clamp(12px,2vw,22px) 6px clamp(10px,1.6vw,16px);overflow:hidden}
.cd-box::before{content:"";position:absolute;left:0;right:0;top:0;height:4px;background:var(--rot)}
.cd-num{display:block;font:800 clamp(44px,9vw,88px)/1 var(--display);font-variant-numeric:tabular-nums;letter-spacing:-.02em}
.cd-num.roll{animation:roll .55s cubic-bezier(.2,.9,.25,1.2)}
@keyframes roll{0%{transform:translateY(38%);opacity:0;filter:blur(4px)}100%{transform:none;opacity:1;filter:none}}
.cd-lab{display:block;margin-top:6px;font:700 clamp(11px,1.3vw,14px)/1 var(--body);letter-spacing:.24em;text-transform:uppercase;opacity:.8}
.bar{width:min(100%,760px);height:3px;background:rgba(255,255,255,.15);margin:20px 0 10px;overflow:hidden;animation:fadeIn 1s both 1.6s}
.bar i{display:block;height:100%;width:0;background:var(--rot);transition:width 1s linear}
.wann{font-size:clamp(14px,1.6vw,17px);opacity:.85;animation:fadeIn 1s both 1.7s}
.wann b{font-weight:700}
.acts{display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:22px;animation:fadeIn 1s both 1.9s}
.btn{display:inline-flex;align-items:center;gap:10px;min-height:52px;padding:0 22px;border:2px solid #fff;background:transparent;color:#fff;font:800 15px/1 var(--display);letter-spacing:.14em;text-transform:uppercase;text-decoration:none;cursor:pointer;transition:background .2s,color .2s,transform .2s var(--ease)}
.btn:hover{background:#fff;color:var(--schwarz);transform:translateY(-2px)}
.btn.rot{background:var(--rot);border-color:var(--rot)}
.btn.rot:hover{background:#fff;border-color:#fff;color:var(--rot)}
.btn svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.note{margin-top:14px;font-size:14px;opacity:.75;min-height:20px}
.teilen{margin:18px auto 0;width:min(100%,560px);padding:18px;background:rgba(15,15,15,.72);border:1px solid rgba(255,255,255,.2);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:grid;gap:12px;animation:fadeDown .3s var(--ease) both}
.teilen>b{font:800 14px/1 var(--display);letter-spacing:.2em;text-transform:uppercase}
.teilen-btns{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.teilen-btns .btn{min-height:46px;padding:0 16px;font-size:14px}
.teilen input{width:100%;font:inherit;font-size:15px;padding:12px;border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);color:#fff;text-align:center}
.ticker{position:relative;overflow:hidden;border-top:1px solid rgba(255,255,255,.14);background:rgba(15,15,15,.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:12px 0;animation:fadeIn 1s both 2s}
.ticker ul{display:flex;gap:0;margin:0;padding:0;list-style:none;width:max-content;animation:marquee 46s linear infinite}
.ticker li{white-space:nowrap;padding:0 26px;font:800 clamp(15px,1.8vw,20px)/1 var(--display);text-transform:uppercase;letter-spacing:.06em}
.ticker li::before{content:"";display:inline-block;width:9px;height:9px;background:var(--rot);margin-right:26px;vertical-align:middle;transform:rotate(45deg)}
@keyframes marquee{to{transform:translateX(-50%)}}
@keyframes fadeDown{from{opacity:0;transform:translateY(-10px)}}
@keyframes fadeIn{from{opacity:0}}
canvas.konfetti{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:5}
body.live h1 i{animation:hop .7s cubic-bezier(.3,1.6,.5,1) both}
@keyframes hop{0%{transform:translateY(0)}40%{transform:translateY(-.25em) rotate(-4deg)}100%{transform:none}}
body.live .cd-box::before{background:#fff}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media (max-width:640px){.cd{grid-template-columns:repeat(2,minmax(0,1fr))}.top img{height:44px}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}.bg video{display:none}.glow{display:none}}
</style>
</head>
<body data-countdown="${esc(launchAt)}"${atRoot ? ' data-root' : ''}>
<div class="bg" aria-hidden="true">${video ? `<video id="bgv" muted loop playsinline preload="none"${poster ? ` poster="${esc(poster)}"` : ''}></video>` : ''}</div>
<div class="glow g1" aria-hidden="true"></div><div class="glow g2" aria-hidden="true"></div>
<div class="stage">
  <header class="top">
    <img src="${url('/assets/images/logo-spd-soltau-weiss.png')}" alt="SPD Soltau" width="88" height="60">
    <span class="top-r"><a class="login" href="${atRoot ? url('/start/index.html') : url('/index.html')}" title="Vorschau für den Vorstand – mit Passwort"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>Anmelden</a><span class="tag" id="tag">Bald online</span></span>
  </header>
  <main>
    <div>
      <p class="eyebrow">Die neue spd-soltau.de</p>
      <h1 id="h1" aria-label="Moin, Soltau!"><span class="ln"><i style="animation-delay:.1s">M</i><i style="animation-delay:.16s">o</i><i style="animation-delay:.22s">i</i><i style="animation-delay:.28s">n</i><i class="rot" style="animation-delay:.34s">,</i></span><span class="ln"><i style="animation-delay:.42s">S</i><i style="animation-delay:.48s">o</i><i style="animation-delay:.54s">l</i><i style="animation-delay:.6s">t</i><i style="animation-delay:.66s">a</i><i style="animation-delay:.72s">u</i><i class="rot" style="animation-delay:.8s">!</i></span></h1>
      <p class="sub" id="sub">Da kommt <b>was Neues</b> auf Sie zu.</p>
      <div class="cd" id="cd" aria-hidden="true">
        <div class="cd-box"><span class="cd-num" data-u="d">–</span><span class="cd-lab" data-l="d">Tage</span></div>
        <div class="cd-box"><span class="cd-num" data-u="h">–</span><span class="cd-lab">Stunden</span></div>
        <div class="cd-box"><span class="cd-num" data-u="m">–</span><span class="cd-lab">Minuten</span></div>
        <div class="cd-box"><span class="cd-num" data-u="s">–</span><span class="cd-lab">Sekunden</span></div>
      </div>
      <p class="sr" id="sr" aria-live="polite"></p>
      <div class="bar" aria-hidden="true"><i id="bar"></i></div>
      <p class="wann" id="wann">Start am <b>${esc(datum)}</b> um <b>${esc(uhr)} Uhr</b></p>
      <div class="acts">
        <button class="btn" type="button" id="share"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>Weitersagen</button>
        <a class="btn" href="https://www.instagram.com/spd_soltau/" target="_blank" rel="noopener">Instagram</a>
        <a class="btn rot" id="go" href="${url('/index.html')}" hidden>Zur neuen Website</a>
      </div>
      <div class="teilen" id="teilen" hidden>
        <b>Weitersagen</b>
        <div class="teilen-btns">
          <a class="btn" id="t-wa" href="#" target="_blank" rel="noopener">WhatsApp</a>
          <a class="btn" id="t-mail" href="#">E-Mail</a>
          <button class="btn" type="button" id="t-copy">Link kopieren</button>
        </div>
        <input id="t-link" type="text" readonly aria-label="Link zum Kopieren">
      </div>
      <p class="note" id="note">${site.email ? `Bis dahin erreichen Sie uns unter <a href="mailto:${esc(site.email)}" style="color:#fff">${esc(site.email)}</a>.` : ''}</p>
    </div>
  </main>
  <footer class="ticker" aria-hidden="true"><ul>${[...TEASER, ...TEASER].map(t => `<li>${esc(t)}</li>`).join('')}</ul></footer>
</div>
<script>
(() => {
  const WILLKOMMEN = new URLSearchParams(location.search).has('willkommen'); // Erstbesuch nach dem Start: Null + Konfetti, dann zur Website
  const ZIEL = WILLKOMMEN ? Date.now() - 1 : Date.parse(document.body.dataset.countdown);
  const merken = () => { try { localStorage.setItem('spd-willkommen', '1'); } catch (e) { /* egal */ } };
  const START = ZIEL - 3 * 86400000; // Balken: die letzten drei Tage
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = s => document.querySelector(s);
  const num = { d: $('[data-u="d"]'), h: $('[data-u="h"]'), m: $('[data-u="m"]'), s: $('[data-u="s"]') };
  const set = (el, v) => { const t = String(v).padStart(2, '0'); if (el.textContent === t) return; el.textContent = t; if (!REDUCED) { el.classList.remove('roll'); void el.offsetWidth; el.classList.add('roll'); } };
  let live = false, minuteShown = -1;
  const tick = () => {
    const rest = Math.max(0, ZIEL - Date.now());
    const d = Math.floor(rest / 86400000), h = Math.floor(rest / 3600000) % 24, m = Math.floor(rest / 60000) % 60, s = Math.floor(rest / 1000) % 60;
    set(num.d, d); set(num.h, h); set(num.m, m); set(num.s, s);
    $('[data-l="d"]').textContent = d === 1 ? 'Tag' : 'Tage';
    $('#bar').style.width = Math.min(100, Math.max(0, (Date.now() - START) / (ZIEL - START) * 100)) + '%';
    const mm = Math.floor(rest / 60000);
    if (mm !== minuteShown) { minuteShown = mm; $('#sr').textContent = rest ? 'Noch ' + d + ' Tage, ' + h + ' Stunden und ' + m + ' Minuten bis zum Start.' : 'Die neue Website ist online.'; }
    if (!rest && !live) online();
  };
  const online = () => {
    live = true; document.body.classList.add('live'); merken();
    $('#tag').textContent = 'Jetzt online';
    $('#sub').innerHTML = 'Die neue Website ist <b>da</b>.';
    $('#wann').textContent = document.body.hasAttribute('data-root') ? 'Einen Moment – die Seite wird gerade aufgeschaltet …' : WILLKOMMEN ? 'Seit ${esc(datum)}, ${esc(uhr)} Uhr online – viel Spaß beim Entdecken!' : 'Viel Spaß beim Entdecken!';
    $('#go').hidden = false; $('#note').textContent = '';
    if (!REDUCED) konfetti();
    if (document.body.hasAttribute('data-root') && !WILLKOMMEN) {
      // Startseite ist noch der Countdown: nachsehen, ob der Build schon durch ist, dann neu laden
      $('#go').addEventListener('click', e => { e.preventDefault(); location.reload(); });
      const pruefen = async () => { try { const t = await (await fetch(location.pathname, { cache: 'no-store' })).text(); if (!t.includes('data-countdown')) { location.reload(); return; } } catch (e) { /* später wieder */ } setTimeout(pruefen, 20000); };
      setTimeout(pruefen, 5000);
    }
  };
  tick(); setInterval(tick, 1000);

  // Konfetti in Rot, Weiß und Schwarz
  function konfetti() {
    const c = document.createElement('canvas'); c.className = 'konfetti'; document.body.appendChild(c);
    const ctx = c.getContext('2d'); const dpr = Math.min(2, devicePixelRatio || 1);
    const size = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; }; size(); addEventListener('resize', size);
    const P = []; const farben = ['#E3000F', '#ffffff', '#1C1B1B', '#ff5a63'];
    for (let i = 0; i < 220; i++) P.push({ x: Math.random() * c.width, y: -Math.random() * c.height * .5, w: (6 + Math.random() * 8) * dpr, h: (8 + Math.random() * 12) * dpr, vx: (Math.random() - .5) * 3 * dpr, vy: (2 + Math.random() * 4) * dpr, r: Math.random() * Math.PI, vr: (Math.random() - .5) * .2, f: farben[i % farben.length] });
    const t0 = performance.now();
    const frame = t => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of P) { p.x += p.vx; p.y += p.vy; p.r += p.vr; p.vy += .02 * dpr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.f; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); }
      if (t - t0 < 9000) requestAnimationFrame(frame); else c.remove();
    };
    requestAnimationFrame(frame);
  }

  // Hintergrundvideo (Drohnenflug über Soltau) – nur ohne „Bewegung reduzieren“
  const v = $('#bgv');
  if (v && !REDUCED) {
    v.src = '${video}/' + (innerWidth < 700 ? '480p' : '720p') + '/mp4/file.mp4';
    v.playbackRate = .85;
    const play = () => v.play().catch(() => {});
    v.addEventListener('canplay', () => { v.classList.add('ready'); play(); }, { once: true });
    play();
    ['touchstart', 'click', 'scroll'].forEach(ev => addEventListener(ev, () => { if (v.paused) play(); }, { passive: true, once: true }));
  }

  // Weitersagen: System-Menü des Geräts (Handy, nur über https), sonst ein kleines Blatt mit WhatsApp, E-Mail und Link kopieren
  const LINK = '${esc((site.url || '').replace(/\/$/, ''))}' ? '${esc((site.url || '').replace(/\/$/, ''))}/' : location.origin + '/';
  const TEXT = 'Die neue Website der SPD Soltau startet am ${esc(datum)} um ${esc(uhr)} Uhr – schau mal:';
  const blatt = $('#teilen');
  $('#t-wa').href = 'https://wa.me/?text=' + encodeURIComponent(TEXT + ' ' + LINK);
  $('#t-mail').href = 'mailto:?subject=' + encodeURIComponent('Die neue spd-soltau.de') + '&body=' + encodeURIComponent(TEXT + '\\n' + LINK);
  $('#t-link').value = LINK;
  $('#share').addEventListener('click', async () => {
    try { if (navigator.share) { await navigator.share({ title: document.title, text: TEXT, url: LINK }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    blatt.hidden = !blatt.hidden;
    if (!blatt.hidden) blatt.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
  $('#t-copy').addEventListener('click', async () => {
    const inp = $('#t-link'); let ok = false;
    try { if (navigator.clipboard) { await navigator.clipboard.writeText(LINK); ok = true; } } catch (e) { /* unten */ }
    if (!ok) { try { inp.focus(); inp.select(); inp.setSelectionRange(0, 99999); ok = document.execCommand('copy'); } catch (e) { ok = false; } }
    $('#t-copy').textContent = ok ? 'Kopiert ✓' : 'Bitte markieren und kopieren';
    setTimeout(() => { $('#t-copy').textContent = 'Link kopieren'; }, 2500);
  });
  $('#t-link').addEventListener('focus', e => e.target.select());
})();
</script>
</body>
</html>`;
}
