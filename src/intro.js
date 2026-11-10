/* Intro „Soltau wird Herz“ (Startseite, seit 10.11.2026): Auf dunklem Grund zeichnet eine leuchtende Linie mit Funkenschweif
   den Umriss des Stadtgebiets, die Stadt wird markiert. Dann fließt der Umriss zum Herz, das sich rot füllt und schlägt;
   darunter erscheint „Aus Liebe zu Soltau ♥“. Im Herz läuft das Drohnenvideo – man fliegt hindurch, Logo und Spruch fliegen
   an ihren Platz in der Kopfzeile, und die Startseite („Moin!“) baut sich auf.
   Ob es läuft, entscheidet das kleine Skript im Seitenkopf (templates.mjs → layout): bei jedem Laden der Startseite
   (Wunsch Vorstand 10.11.2026), nur nicht bei „Bewegung reduzieren“ und nicht, wenn die Adresse auf einen Abschnitt
   zeigt (#…). Dann trägt <html> die Klasse intro-an.
   Die Umrisspunkte setzt build.mjs aus src/data-soltau-umriss.mjs ein.
   Flüssig auch auf gedrosselten Handys (Energiesparmodus): Der Umriss beginnt erst, wenn die Seite dahinter fertig
   aufgebaut ist. Dabei misst das Intro, ob das Gerät gedrosselt ist (nie mehr als 40 Bilder/s – das iPhone im
   Energiesparmodus rechnet Bild-für-Bild-Animationen nur mit 30 – oder es wird nicht ruhig). Dann läuft die leichte
   Fassung: ohne Funken und Leuchtschein, und Herzschlag, Echo und Flug durchs Herz laufen als eigene Ebenen auf dem
   Grafikchip (CSS-Transform), den das Handy auch im Energiesparmodus mit voller Bildrate laufen lässt.
   Zum Ausprobieren: ?intro=leicht bzw. ?intro=voll an die Adresse hängen. */
(function () {
  const d = document, w = window, html = d.documentElement;
  if (!html.classList.contains('intro-an') || !d.querySelector('.hero-neu')) { html.classList.remove('intro-an'); return; }
  // Beim Neuladen nicht an die alte Stelle springen: das Intro beginnt und endet immer oben an der Startseite
  try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) { /* egal */ }
  if (w.scrollY) w.scrollTo(0, 0);                    // nur wenn nötig – scrollTo erzwingt sonst früh ein teures Layout
  let leicht = /[?&]intro=leicht\b/.test(location.search) ? true : /[?&]intro=voll\b/.test(location.search) ? false : null;
  const erzwungen = leicht !== null;
  const SOLTAU = /*PUNKTE*/[];
  const ORT = [-0.0211, 0.076];                       // Ortspunkt (BKG), relativ zur Umrissbreite
  const KOORD = [52.987347, 9.837525];                // Stadt Soltau, BKG-Punkt
  const HERZ = 'M50 90C47 86 0 58 0 28C0 11 12 0 27 0C38 0 46 7 50 16C54 7 62 0 73 0C88 0 100 11 100 28C100 58 53 86 50 90Z';
  // Tempo des ganzen Intros: 1 = schnell (gut 3 s), 1.4 = Mittelweg (gut 4 s), 1.85 ≈ erste Fassung (knapp 6 s)
  const TEMPO = 1.4;
  html.classList.add('intro-laeuft', 'intro-hell', 'intro-logo', 'intro-slogan');

  const st = d.createElement('style');
  st.textContent = `
    html.intro-laeuft { overflow: hidden; scrollbar-gutter: stable }
    html.intro-logo .header .logo img { visibility: hidden }
    html.intro-slogan .header .slogan { visibility: hidden; animation: none }
    .header .wrap > * { transition: opacity ${.45 * TEMPO}s ease }
    html.intro-laeuft .header .wrap > :not(.logo):not(.slogan) { opacity: 0 }
    .hero-media::after { transition: opacity ${.7 * TEMPO}s ease }
    html.intro-hell .hero-media::after { opacity: 0 }
    #intro { position: fixed; inset: 0; z-index: 9999; overflow: hidden; cursor: pointer; background: transparent }
    #intro svg.buehne, #intro canvas { position: absolute; inset: 0; width: 100%; height: 100% }
    #intro canvas { pointer-events: none }
    #intro .logo { position: absolute; left: 50%; top: max(26px, 5vh); height: clamp(46px, 7vh, 70px); width: auto; transform: translateX(-50%); transform-origin: 0 0; opacity: 0 }
    #intro .ort { position: absolute; color: #fff; font: 800 14px/1.15 'TheSans SPD Versal', Arial, sans-serif; letter-spacing: .2em; text-transform: uppercase; white-space: nowrap; opacity: 0 }
    #intro .ort span { display: block; font: 700 12px/1.3 'TheSans SPD Versal', Arial, sans-serif; letter-spacing: .14em; color: rgba(255,255,255,.66); margin-top: 5px; font-variant-numeric: tabular-nums }
    /* „Aus Liebe zu Soltau ♥“: genaue Kopie des Spruchs aus der Kopfzeile, vergrößert unter dem Herz; fliegt am Ende an seinen Platz */
    #intro .claim { position: absolute; left: 0; top: 0; margin: 0; color: #fff; text-transform: uppercase; white-space: nowrap; transform-origin: 0 0; animation: none; border-left-color: transparent }
    #intro .claim i { display: inline-block; font-style: normal; white-space: pre; opacity: 0 }
    #intro .claim .slogan-herz { display: inline-block; width: .9em; height: .81em; margin-left: .3em; vertical-align: -.04em; overflow: visible; opacity: 0; transform-origin: 50% 60% }
    #intro .claim .slogan-herz path { fill: #E3000F }
    #intro .claim.mitte { left: 0; right: 0; text-align: center; font: 800 clamp(15px, 4.4vw, 20px)/1.1 'TheSans SPD Versal', Arial, sans-serif; letter-spacing: .3em; border: 0 }
    #intro svg.ebene { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; will-change: transform, opacity }
    #intro .weiter { position: absolute; right: 16px; bottom: 16px; z-index: 5; height: 36px; padding: 0 14px; border: 1px solid rgba(255,255,255,.3); border-radius: 18px;
      background: rgba(255,255,255,.06); color: rgba(255,255,255,.85); font: 700 12px/1 'TheSans SPD Versal', Arial, sans-serif; letter-spacing: .14em; text-transform: uppercase; cursor: pointer }
  `;
  d.head.appendChild(st);

  const ov = d.createElement('div'); ov.id = 'intro'; ov.setAttribute('aria-hidden', 'true');
  ov.innerHTML = `<svg class="buehne"><defs>
      <radialGradient id="in-glut" cx="50%" cy="48%" r="72%"><stop offset="0" stop-color="#2b080a"/><stop offset=".5" stop-color="#130c0c"/><stop offset="1" stop-color="#060505"/></radialGradient>
      <pattern id="in-raster" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="1" fill="#fff" fill-opacity=".22"/></pattern>
      <filter id="in-glow" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <mask id="in-loch" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><rect width="100%" height="100%" fill="#fff"/><path class="loch" d="${HERZ}" fill="#000" fill-opacity="0"/></mask></defs>
    <g mask="url(#in-loch)"><rect width="100%" height="100%" fill="url(#in-glut)"/><rect class="raster" width="100%" height="100%" fill="url(#in-raster)" opacity="0"/></g>
    <g class="welt"><path class="geist" fill="none" stroke="#fff" stroke-opacity="0" stroke-linejoin="round"/><g class="echos"></g>
      <path class="herzfl" d="${HERZ}" fill="#E3000F" fill-opacity="0" filter="url(#in-glow)"/>
      <path class="spur" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" filter="url(#in-glow)"/></g>
    <path class="leit" fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="1.4" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
    <circle class="ring" fill="none" stroke="#E3000F" stroke-width="2" r="0"/><circle class="ring" fill="none" stroke="#E3000F" stroke-width="2" r="0"/><circle class="pin" fill="#E3000F" stroke="#fff" stroke-width="2" r="0"/>
    <circle class="punkt" r="3.5" fill="#fff" stroke="#E3000F" stroke-opacity=".55" stroke-width="5" display="none"/></svg>
    <canvas></canvas><img class="logo" alt="">
    <div class="ort">Stadt Soltau<span>00,0000° N · 0,0000° O</span></div><div class="claim"></div>`;
  d.body.appendChild(ov);
  html.classList.remove('intro-an');                 // die dunkle Vorab-Decke (styles.css) wird jetzt vom Intro abgelöst
  const $ = s => ov.querySelector(s);
  const welt = $('.welt'), loch = $('.loch'), geist = $('.geist'), spur = $('.spur'), herzfl = $('.herzfl'), echos = $('.echos');
  const raster = $('.raster'), leit = $('.leit'), pin = $('.pin'), ringe = [...ov.querySelectorAll('.ring')], logo = $('.logo'), ort = $('.ort'), claim = $('.claim');
  const buehne = $('.buehne'), punkt = $('.punkt');
  const cv = $('canvas'), cx2 = cv.getContext('2d');
  const kopfLogo = d.querySelector('.header .logo img'); if (kopfLogo) logo.src = kopfLogo.currentSrc || kopfLogo.src;

  // ---------- Hilfen ----------
  // zeit(): Bild-für-Bild-Ablauf; merkt sich nebenbei die Abstände der Bilder, um Holpern zu erkennen (siehe holprig)
  const takte = [];
  const zeit = (dauer, fn, ease = p => p) => new Promise(ok => { const t0 = performance.now(); let vor = 0; (function f(t) { if (vor && t > vor) { takte.push(t - vor); if (takte.length > 120) takte.shift(); } vor = t; const p = Math.max(0, Math.min(1, (t - t0) / (dauer * TEMPO))); fn(ease(p)); if (p < 1 && !abbruch) requestAnimationFrame(f); else ok(); })(t0); });
  // Holprig: im Mittel unter 40 Bildern/s oder mehr als jedes zehnte Bild verspätet – dann übernimmt ab dem Herz der Grafikchip
  const holprig = () => { const a = takte.slice(-60).sort((x, y) => x - y); return a.length >= 12 && (a[a.length >> 1] > 25 || a[Math.floor(a.length * .9)] > 34); };
  const warte = ms => new Promise(r => setTimeout(r, ms * TEMPO));
  const T = o => Object.assign({}, o, { duration: o.duration * TEMPO, delay: (o.delay || 0) * TEMPO });   // Zeiten für animate()
  const inOut = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  const aus = p => 1 - Math.pow(1 - p, 3);
  const expoIn = p => p === 0 ? 0 : Math.pow(2, 10 * p - 10);
  const clamp = v => Math.max(0, Math.min(1, v));
  const pfad = P => 'M' + P.map(([x, y]) => x.toFixed(2) + ' ' + y.toFixed(2)).join('L') + 'Z';
  const flaeche = P => { let s = 0; for (let i = 0; i < P.length; i++) { const [a, b] = P[i], [c, e] = P[(i + 1) % P.length]; s += a * e - c * b; } return s; };
  let abbruch = false, raus = false;

  // ---------- Maße ----------
  let W, H, k, cx, cy, A, B, Ws, z = 1, dpr = Math.min(2, w.devicePixelRatio || 1);
  function messen() {
    W = w.innerWidth; H = w.innerHeight;
    const hoch = W <= 600;
    const hw = hoch ? W * .58 : Math.min(W * .27, H * .4);       // Herzbreite in px
    k = hw / 100; cx = W / 2; cy = H * (hoch ? .47 : .5);
    Ws = Math.min(155, (W * .92) / k);
    cv.width = W * dpr; cv.height = H * dpr; cx2.setTransform(dpr, 0, 0, dpr, 0, 0);
    const N = SOLTAU.length / 2;
    const m = d.createElementNS('http://www.w3.org/2000/svg', 'path'); m.setAttribute('d', HERZ); welt.appendChild(m);
    const L = m.getTotalLength();
    B = Array.from({ length: N }, (_, i) => { const p = m.getPointAtLength(L * i / N); return [p.x, p.y]; }); m.remove();
    A = Array.from({ length: N }, (_, i) => [50 + SOLTAU[2 * i] * Ws, 46 + SOLTAU[2 * i + 1] * Ws]);
    if (Math.sign(flaeche(A)) !== Math.sign(flaeche(B))) A.reverse();
    let u = 0; A.forEach((p, i) => { if (p[1] > A[u][1]) u = i; }); A = A.slice(u).concat(A.slice(0, u));
    lage();
  }
  const sx = x => cx + (x - 50) * k * z, sy = y => cy + (y - 46) * k * z;    // Herz-Einheiten → Bildschirm
  let lochAuf = false;                                // das Loch in der Maske zählt erst am Ende – vorher nicht neu zeichnen (spart viel)
  function lage() {
    const t = `translate(${cx} ${cy}) scale(${k * z}) translate(-50 -46)`;
    welt.setAttribute('transform', t); if (lochAuf) loch.setAttribute('transform', t);
    geist.setAttribute('stroke-width', (1.1 / (k * z)).toFixed(4));
    spur.setAttribute('stroke-width', (spurBreite / (k * z)).toFixed(4));
  }
  let spurBreite = 2.4;

  // ---------- Funken (Canvas) ----------
  const funken = []; let kopf = null, malen = true;
  function funkenLauf() {
    cx2.clearRect(0, 0, W, H);
    cx2.globalCompositeOperation = 'lighter';
    for (let i = funken.length - 1; i >= 0; i--) {
      const f = funken[i]; f.l -= 16; if (f.l <= 0) { funken.splice(i, 1); continue; }
      f.x += f.vx; f.y += f.vy; f.vx *= .97; f.vy = f.vy * .97 + .015;
      const a = f.l / f.L;
      cx2.fillStyle = f.rot ? `rgba(255,70,80,${a * .9})` : `rgba(255,236,236,${a})`;
      cx2.beginPath(); cx2.arc(f.x, f.y, f.r * (.4 + .6 * a), 0, 6.283); cx2.fill();
    }
    if (kopf) {
      const g = cx2.createRadialGradient(kopf.x, kopf.y, 0, kopf.x, kopf.y, 26);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.18, 'rgba(255,215,215,.9)'); g.addColorStop(.45, 'rgba(227,0,15,.45)'); g.addColorStop(1, 'rgba(227,0,15,0)');
      cx2.fillStyle = g; cx2.beginPath(); cx2.arc(kopf.x, kopf.y, 26, 0, 6.283); cx2.fill();
    }
    cx2.globalCompositeOperation = 'source-over';
    if (malen && (kopf || funken.length)) requestAnimationFrame(funkenLauf);   // ohne Funken nicht weiter jedes Bild leeren
  }
  function spruehen(x, y, n) {
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, v = .3 + Math.random() * 1.6, L = 380 + Math.random() * 520;
      funken.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .2, r: .8 + Math.random() * 1.6, l: L, L, rot: Math.random() < .45 }); }
  }

  // ---------- Herzecho ----------
  function echo(stark) {
    const p = d.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('d', HERZ); p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#E3000F'); echos.appendChild(p);
    zeit(stark ? 620 : 520, q => {
      const s = 1 + (stark ? .75 : .5) * q;
      p.setAttribute('transform', `translate(50 46) scale(${s}) translate(-50 -46)`);
      p.setAttribute('stroke-width', ((stark ? 2.4 : 1.6) / (k * z * s)).toFixed(4)); p.setAttribute('stroke-opacity', (1 - q) * .9);
    }, aus).then(() => p.remove());
  }
  const schlag = p => { const t = p * 660; const b = (t0, a, dd) => (t > t0 && t < t0 + dd) ? a * Math.sin(Math.PI * (t - t0) / dd) : 0; return 1 + b(0, .1, 210) + b(260, .055, 200); };

  // ---------- Spruch „Aus Liebe zu Soltau ♥“ ----------
  // Der Spruch wird aus der Kopfzeile kopiert (gleiche Schrift, gleiche Zeilen, gleiches Herz) und genau auf dessen Platz gelegt,
  // aber vergrößert und unter das große Herz verschoben. Am Ende fällt nur die Verschiebung weg – er landet pixelgenau neben dem Logo.
  let zeichen = [], claimHerz = null, ziel = null, claimStart = 'none', randFarbe = 'rgba(255,255,255,.55)';
  function claimBauen() {
    const sl = d.querySelector('.header .slogan');
    ziel = sl && sl.getClientRects().length ? sl.getBoundingClientRect() : null;
    claim.innerHTML = '';
    const teile = sl ? [...sl.childNodes] : [d.createTextNode('Aus Liebe zu Soltau')];
    teile.forEach(n => {
      if (n.nodeType === 3) [...n.textContent].forEach(c => { const i = d.createElement('i'); i.textContent = c; claim.appendChild(i); });
      else claim.appendChild(n.cloneNode(true));
    });
    zeichen = [...claim.querySelectorAll('i')]; claimHerz = claim.querySelector('.slogan-herz');
    if (!ziel) {                                   // sehr schmale Handys: kein Spruch in der Kopfzeile – mittig zeigen, am Ende ausblenden
      claim.classList.add('mitte'); claim.querySelectorAll('br').forEach(b => b.replaceWith(d.createTextNode(' ')));
      claim.style.top = (cy + 44 * k + Math.max(30, H * .05)) + 'px'; return;
    }
    const cs = getComputedStyle(sl);
    ['fontFamily', 'fontWeight', 'fontSize', 'lineHeight', 'letterSpacing', 'paddingLeft', 'borderLeftWidth', 'borderLeftStyle'].forEach(p => (claim.style[p] = cs[p]));
    randFarbe = cs.borderLeftColor;
    Object.assign(claim.style, { left: ziel.left + 'px', top: ziel.top + 'px', width: ziel.width + 'px', height: ziel.height + 'px' });
    // Größe: etwa so breit wie das Herz; waagerecht mittig (nur der Text, ohne den Strich links), mit Abstand unter dem Herz
    const rand = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
    const S = Math.min(3.4, Math.max(1.6, 100 * k * .9 / ziel.width));
    const x0 = cx - S * (ziel.width + rand) / 2, y0 = cy + 44 * k + Math.max(26, H * .042);
    claimStart = `translate(${(x0 - ziel.left).toFixed(1)}px, ${(y0 - ziel.top).toFixed(1)}px) scale(${S.toFixed(3)})`;
    claim.style.transform = claimStart;
  }

  // ---------- Ruhe abwarten und Gerät einschätzen ----------
  // Wartet, bis vier Bilder in Folge ohne Hänger kommen (die Seite dahinter ist dann aufgebaut), mindestens `mindest` ms,
  // höchstens gut 1 s. Gedrosselt: das Gerät liefert nie mehr als 40 Bilder/s, oder es wird in der Zeit nicht ruhig.
  function ruhe(mindest) {
    return new Promise(ok => {
      const t0 = performance.now(); let vor = 0, ruhig = 0, min = Infinity;
      requestAnimationFrame(function f(t) {
        if (vor) { const dt = t - vor; min = Math.min(min, dt); ruhig = dt < Math.max(22, min * 1.6) ? ruhig + 1 : 0; }
        vor = t; const lang = t - t0;
        if ((ruhig >= 4 && lang >= mindest) || lang > 1100 || raus) ok({ gedrosselt: lang > 1100 || min > 25 });
        else requestAnimationFrame(f);
      });
    });
  }

  // ---------- Leichte Fassung: Herz-Fenster als eigene Ebenen für den Grafikchip ----------
  // Ab dem fertigen Herz ersetzen einzelne Ebenen die Bühne: dunkler Grund mit herzförmigem Loch (anfangs vom roten Herz
  // verdeckt), rotes Herz, Rand rot/weiß und die Echos. Bewegt werden sie nur per CSS-Transform und Deckkraft – das rechnet
  // der Grafikchip, unabhängig davon, wie stark das Handy den Rest drosselt. Gleiche Lage und Größe wie in der vollen Fassung.
  let fenster = null;
  function fensterEbenen() {
    const g = `translate(${cx} ${cy}) scale(${k}) translate(-50 -46)`, m = 6;          // m: Rand um das Herz für die Linie
    const box = { left: cx - 50 * k - m, top: cy - 46 * k - m, w: 100 * k + 2 * m, h: 90 * k + 2 * m };
    const neu = html => { const t = d.createElement('div'); t.innerHTML = html.trim(); return t.firstChild; };
    // Herzgroße Ebene (Herz-Einheiten im viewBox), Drehpunkt = Herzmitte wie bei der vollen Fassung
    const herzEbene = inhalt => {
      const e = neu(`<svg class="ebene" viewBox="${-m / k} ${-m / k} ${100 + 2 * m / k} ${90 + 2 * m / k}">${inhalt}</svg>`);
      Object.assign(e.style, { left: box.left + 'px', top: box.top + 'px', width: box.w + 'px', height: box.h + 'px', transformOrigin: `${cx - box.left}px ${cy - box.top}px` });
      return e;
    };
    const grund = neu(`<svg class="ebene"><defs>
        <radialGradient id="in-glut2" cx="50%" cy="48%" r="72%"><stop offset="0" stop-color="#2b080a"/><stop offset=".5" stop-color="#130c0c"/><stop offset="1" stop-color="#060505"/></radialGradient>
        <pattern id="in-raster2" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="13" cy="13" r="1" fill="#fff" fill-opacity=".22"/></pattern>
        <mask id="in-loch2" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%"><rect width="100%" height="100%" fill="#fff"/><path d="${HERZ}" transform="${g}" fill="#000"/></mask></defs>
      <g mask="url(#in-loch2)"><rect width="100%" height="100%" fill="url(#in-glut2)"/><rect class="raster2" width="100%" height="100%" fill="url(#in-raster2)"/></g></svg>`);
    grund.style.transformOrigin = `${cx}px ${cy}px`;
    const herz = herzEbene(`<path d="${HERZ}" fill="#E3000F"/>`);
    const randRot = herzEbene(`<path d="${HERZ}" fill="none" stroke="rgb(245,40,50)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`);
    const randWeiss = herzEbene(`<path d="${HERZ}" fill="none" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>`);
    randWeiss.style.opacity = 0;
    buehne.after(grund, herz, randRot, randWeiss);
    buehne.style.visibility = 'hidden';                // im selben Bild ausgetauscht – kein Flackern
    const ani = (el, kf, dauer, mehr = {}) => el.animate(kf, T({ duration: dauer, fill: 'forwards', ...mehr }));
    return {
      // Herzschlag wie schlag(): zwei Stöße (×1,10 und ×1,055), Herz und Rand gemeinsam
      schlag(dauer) {
        const kf = [[0, 1], [105, 1.1], [210, 1], [260, 1], [360, 1.055], [460, 1], [660, 1]].map(([t, s]) => ({ offset: t / 660, transform: `scale(${s})`, easing: 'ease-in-out' }));
        [herz, randRot].forEach(el => ani(el, kf, dauer));
      },
      echo(stark) {
        const e = herzEbene(`<path d="${HERZ}" fill="none" stroke="#E3000F" stroke-width="${stark ? 2.4 : 1.6}" vector-effect="non-scaling-stroke"/>`);
        herz.before(e);
        ani(e, [{ transform: 'none', opacity: .9 }, { transform: `scale(${stark ? 1.75 : 1.5})`, opacity: 0 }], stark ? 620 : 520, { easing: 'cubic-bezier(.33,1,.68,1)' }).finished.then(() => e.remove(), () => {});
      },
      // Herz wird Fenster: rote Füllung blendet aus (darunter liegt schon das Loch), Rand wird weiß, Raster tritt zurück
      oeffnen() {
        ani(herz, [{ opacity: 1 }, { opacity: 0 }], 240, { easing: 'ease-out' });
        ani(randRot, [{ opacity: 1 }, { opacity: 0 }], 240); ani(randWeiss, [{ opacity: 0 }, { opacity: 1 }], 240);
        const r = grund.querySelector('.raster2'); r.animate([{ opacity: 1 }, { opacity: 0 }], T({ duration: 240, fill: 'forwards' }));
      },
      // Flug durchs Herz: Grund (mit Loch) und weißer Rand werden um die Herzmitte vergrößert – wie z = 1 … Z mit p³
      fliegen(Z, dauer) {
        const kurve = 'cubic-bezier(.32,0,.67,0)';
        const a = ani(grund, [{ transform: 'none' }, { transform: `scale(${Z})` }], dauer, { easing: kurve });
        ani(randWeiss, [{ transform: 'none' }, { transform: `scale(${Z})` }], dauer, { easing: kurve });
        randWeiss.animate([{ opacity: 1 }, { opacity: 0 }], T({ duration: dauer * .55, easing: 'ease-in', fill: 'forwards', composite: 'replace' }));
        return a.finished.catch(() => {});
      },
    };
  }

  // ---------- Ablauf ----------

  (d.fonts ? Promise.race([Promise.all([d.fonts.load("800 60px 'TheSans SPD Versal'"), d.fonts.load("400 18px 'TheSans SPD'")]), new Promise(r => setTimeout(r, 500))]) : Promise.resolve()).then(async () => {
    messen();
    geist.setAttribute('d', pfad(A)); spur.setAttribute('d', pfad(A));
    claimBauen();
    raster.animate([{ opacity: 0 }, { opacity: 1 }], T({ duration: 600, easing: 'ease-out', fill: 'forwards' }));
    logo.animate([{ opacity: 0, transform: 'translateX(-50%) translateY(-10px)' }, { opacity: 1, transform: 'translateX(-50%)' }], T({ duration: 450, delay: 40, easing: 'cubic-bezier(.2,.75,.15,1)', fill: 'forwards' }));
    geist.animate([{ strokeOpacity: 0 }, { strokeOpacity: .16 }], T({ duration: 350, delay: 60, fill: 'forwards' }));
    // Erst loslegen, wenn die Seite dahinter fertig aufgebaut ist – und dabei messen, ob das Gerät gedrosselt ist
    const r = await ruhe(100 * TEMPO); if (raus) return;
    if (leicht === null) leicht = r.gedrosselt;
    html.dataset.intro = leicht ? 'leicht' : 'voll';
    if (leicht) { spur.removeAttribute('filter'); herzfl.removeAttribute('filter'); punkt.removeAttribute('display'); }
    else requestAnimationFrame(funkenLauf);

    // 1) Umriss zeichnen, Leuchtkopf mit Funken (leicht: nur ein Leuchtpunkt). Punkt auf dem Umriss ohne SVG-Abfrage je Bild.
    const seg = A.map((p, i) => { const q = A[(i + 1) % A.length]; return Math.hypot(q[0] - p[0], q[1] - p[1]); }), ges = seg.reduce((s, l) => s + l, 0);
    const punktBei = e => { let s = e * ges, i = 0; while (i < seg.length - 1 && s > seg[i]) s -= seg[i++]; const p = A[i], q = A[(i + 1) % A.length], f = seg[i] ? Math.min(1, s / seg[i]) : 0; return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]; };
    let pinDa = false;
    await zeit(680, e => {
      if (raus) return;
      spur.setAttribute('stroke-dashoffset', 1 - e);
      const p = punktBei(e); kopf = { x: sx(p[0]), y: sy(p[1]) };
      if (leicht) { punkt.setAttribute('cx', kopf.x.toFixed(1)); punkt.setAttribute('cy', kopf.y.toFixed(1)); } else spruehen(kopf.x, kopf.y, 3);
      if (!pinDa && e > .4) { pinDa = true; stadtMarkieren(); }
    }, inOut);
    kopf = null; punkt.setAttribute('display', 'none'); if (raus) return;
    await warte(140); if (raus) return;

    // 2) Markierung weg, Umriss fließt zum Herz
    [ort, leit, pin, ...ringe].forEach(el => el.animate([{ opacity: 1 }, { opacity: 0 }], T({ duration: 180, fill: 'forwards' })));
    geist.animate([{ strokeOpacity: .16 }, { strokeOpacity: 0 }], T({ duration: 300, fill: 'forwards' }));
    const VER = .4, N = A.length;
    let fuellung = false;
    await zeit(580, Q => {
      if (raus) return;
      const P = A.map((a, i) => { const q = inOut(clamp((Q - VER * i / N) / (1 - VER))); return [a[0] + (B[i][0] - a[0]) * q, a[1] + (B[i][1] - a[1]) * q]; });
      spur.setAttribute('d', pfad(P));
      const r = Math.round(255 - 10 * Q), g = Math.round(255 - 215 * Q), b = Math.round(255 - 205 * Q);
      spur.setAttribute('stroke', `rgb(${r},${g},${b})`);
      if (!fuellung && Q > .72) { fuellung = true; herzfl.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], T({ duration: 220, easing: 'ease-out', fill: 'forwards' })); }
    });
    if (raus) return;
    spur.setAttribute('d', HERZ);
    // War es bis hier holprig (z. B. Android im Energiesparmodus, der am Anfang ruhig wirkte), ab jetzt die leichte Fassung
    if (!leicht && !erzwungen && holprig()) { leicht = true; html.dataset.intro = 'leicht (unterwegs)'; }
    if (leicht) fenster = fensterEbenen();            // ab hier übernimmt der Grafikchip

    // 3) Herzschlag mit Echo, Spruch erscheint
    const ec = s => (fenster ? fenster.echo(s) : echo(s));
    ec(true); setTimeout(() => !raus && ec(false), 170 * TEMPO);
    // Am Ende erscheint „Aus Liebe zu Soltau“, das kleine Herz schlägt mit
    zeichen.forEach((el, i) => el.animate([{ opacity: 0, transform: 'translateY(.4em)' }, { opacity: 1, transform: 'none' }], T({ duration: 320, delay: 20 + i * 16, easing: 'cubic-bezier(.2,.75,.15,1)', fill: 'forwards' })));
    if (claimHerz) claimHerz.animate([{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1.4)', offset: .5 }, { opacity: 1, transform: 'scale(.9)', offset: .75 }, { opacity: 1, transform: 'none' }], T({ duration: 460, delay: 40 + zeichen.length * 16, easing: 'ease-out', fill: 'forwards' }));
    if (fenster) { fenster.schlag(420); await warte(420); }
    else { await zeit(420, p => { if (!raus) { z = schlag(p); lage(); } }); z = 1; lage(); }
    await warte(260); if (raus) return;
    ausgang();
  });

  function stadtMarkieren() {
    const px = sx(50 + ORT[0] * Ws), py = sy(46 + ORT[1] * Ws), hoch = W <= 600;
    pin.setAttribute('cx', px); pin.setAttribute('cy', py); ringe.forEach(r => { r.setAttribute('cx', px); r.setAttribute('cy', py); });
    zeit(300, q => pin.setAttribute('r', (q < .6 ? 7.5 * q / .6 : 7.5 - 2 * (q - .6) / .4).toFixed(2)));
    ringe.forEach((r, i) => setTimeout(() => zeit(700, q => { r.setAttribute('r', 6 + 46 * q); r.setAttribute('stroke-opacity', 1 - q); }, aus), i * 160 * TEMPO));
    // Beschriftung: am Rechner mit Linie nach rechts oben, am Handy mittig unter dem Umriss
    let unten = -Infinity; A.forEach(p => { unten = Math.max(unten, sy(p[1])); });
    if (hoch) { ort.style.left = '0'; ort.style.right = '0'; ort.style.textAlign = 'center'; ort.style.top = (unten + 26) + 'px'; }
    else {
      const ex = px + Math.min(W * .16, 230), ey = py - Math.min(H * .2, 150);
      leit.setAttribute('d', `M${px} ${py}L${ex} ${ey}L${ex + 150} ${ey}`);
      leit.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], T({ duration: 260, delay: 50, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' }));
      ort.style.left = (ex + 4) + 'px'; ort.style.top = (ey - 46) + 'px';
    }
    ort.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], T({ duration: 240, delay: 120, fill: 'forwards' }));
    const sp = ort.querySelector('span'), fmt = v => v.toLocaleString('de-DE', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    setTimeout(() => zeit(420, q => { sp.textContent = `${fmt(KOORD[0] * q)}° N · ${fmt(KOORD[1] * q)}° O`; }, aus), 120 * TEMPO);
  }

  async function ausgang() {
    if (raus) return; raus = true;
    if (!A) { abbruch = true; Intro.weg(); return; }
    ov.getAnimations({ subtree: true }).forEach(a => { try { a.finish(); } catch (e) {} });
    kopf = null; z = 1; spurBreite = 2; lochAuf = true; lage();
    spur.setAttribute('d', HERZ); spur.setAttribute('stroke-dashoffset', 0);
    [ort, leit, pin, ...ringe].forEach(el => (el.style.opacity = 0)); punkt.setAttribute('display', 'none');
    if (leicht && !fenster) fenster = fensterEbenen();   // „Überspringen“ vor dem fertigen Herz
    // Herz wird zum Fenster: rote Füllung blendet aus, darunter das Video
    if (fenster) fenster.oeffnen();
    else {
      loch.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], T({ duration: 240, easing: 'ease-out', fill: 'forwards' }));
      herzfl.animate([{ fillOpacity: 1 }, { fillOpacity: 0 }], T({ duration: 240, easing: 'ease-out', fill: 'forwards' }));
      spur.animate([{ stroke: 'rgb(245,40,50)' }, { stroke: '#ffffff' }], T({ duration: 240, fill: 'forwards' }));
    }
    await warte(220);
    // Durch das Herz fliegen
    // Logo und Spruch mit Herz fliegen gleichzeitig an ihren Platz in der Kopfzeile
    zeichen.forEach(el => (el.style.opacity = 1)); if (claimHerz) claimHerz.style.opacity = 1;
    if (ziel) claim.animate([{ transform: claimStart, borderLeftColor: 'rgba(255,255,255,0)' }, { transform: 'none', borderLeftColor: randFarbe }], T({ duration: 620, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' }));
    else claim.animate([{ opacity: 1 }, { opacity: 0 }], T({ duration: 200, fill: 'forwards' }));
    Intro.flieg(logo, d.querySelector('.header .logo img'), 620);
    const Z = 1.35 * Math.hypot(W, H) / 2 / (26 * k);
    let gestartet = false;
    const starten = () => { if (gestartet) return; gestartet = true; html.classList.remove('intro-laeuft'); w.StartNeu && StartNeu.auftritt(); setTimeout(() => html.classList.remove('intro-hell'), 300 * TEMPO); };
    if (fenster) { setTimeout(starten, 650 * Math.cbrt(.4) * TEMPO); await fenster.fliegen(Z, 650); starten(); }   // wie q = p³ > .4
    else await zeit(650, q => { z = 1 + (Z - 1) * q; lage(); if (q > .4) starten(); }, p => p * p * p);
    malen = false;
    Intro.weg();
  }

  w.Intro = {
    flieg(el, ziel, D) {
      if (!ziel || !ziel.getClientRects().length) return el.animate([{ opacity: 1 }, { opacity: 0 }], T({ duration: 300, fill: 'forwards' }));
      const a = el.getBoundingClientRect(), b = ziel.getBoundingClientRect(), s = b.height / a.height;
      const von = getComputedStyle(el).transform, basis = von === 'none' ? '' : von + ' ';
      return el.animate([{ transform: basis || 'none' }, { transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) ${basis}scale(${s})` }], T({ duration: D, easing: 'cubic-bezier(.65,0,.25,1)', fill: 'forwards' }));
    },
    weg() {
      ov.remove(); html.classList.remove('intro-logo', 'intro-slogan', 'intro-laeuft', 'intro-hell');
      if (w.StartNeu) StartNeu.auftritt(); else d.querySelector('.hero-neu')?.classList.add('hn-los');   // falls site.js fehlt
    },
  };
  const b = d.createElement('button'); b.className = 'weiter'; b.type = 'button'; b.textContent = 'Überspringen'; ov.appendChild(b);
  ov.addEventListener('click', ausgang);
  d.addEventListener('keydown', e => { if (d.getElementById('intro') && /^(Escape|Enter| )$/.test(e.key)) { e.preventDefault(); ausgang(); } });
})();
