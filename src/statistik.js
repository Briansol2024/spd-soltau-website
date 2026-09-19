// Statistik der Website (Vorstand → Statistik): Tageswerte aus der Sammlung „Statistik“, die der Push-Dienst aus den
// kurzlebigen Rohdaten (Seitenaufrufe) verdichtet. Ohne Cookies, ohne IP-Adressen – gezählt werden Aufrufe, keine Personen.
// Je Tag: aufrufe, besuche (Einstiege von außen), app (aus der installierten App), seiten, quellen, geraete, sprachen,
// stunden[24], ereignisse (Klicks auf wichtige Knöpfe, Formulare), lade {summe, n} (Ladezeit).
export function makeStatistik(ctx) {
  const { db, esc, $, $$, store, ICON, SPD, sectionHead, todayIso } = ctx;
  const ZEIT = [['7', '7 Tage'], ['30', '30 Tage'], ['90', '90 Tage'], ['365', '12 Monate']];
  const TITEL = { '/': 'Startseite', '/bald/': 'Countdown-Seite', '/willkommen/': 'Willkommensseite', '/aktuelles/': 'Aktuelles', '/termine/': 'Termine', '/stadtrat-2026/': 'Unsere 11 im Stadtrat', '/fraktion/': 'Fraktion', '/ortsverein/': 'Vorstand', '/ziele/': 'Unsere Ziele', '/mitmachen/': 'Mitmachen', '/kontakt/': 'Kontakt', '/roter-bahnhof/': 'Roter Bahnhof', '/newsletter/': 'Newsletter', '/rat-und-rathaus/': 'Aus Rat & Rathaus', '/mitglieder/': 'Mitgliederbereich', '/impressum/': 'Impressum', '/datenschutz/': 'Datenschutz', '/transparenz/': 'Transparenz', '/start/': 'Startseite (Vorschau)', '/404': 'Seite nicht gefunden' };
  const QUELLE = { direkt: 'Direkt – Adresse eingetippt, Lesezeichen, WhatsApp, App', intern: 'Innerhalb der Website', 'google.com': 'Google', 'google.de': 'Google', 'bing.com': 'Bing', 'duckduckgo.com': 'DuckDuckGo', 'ecosia.org': 'Ecosia', 'instagram.com': 'Instagram', 'facebook.com': 'Facebook', 'wa.me': 'WhatsApp', 'whatsapp.com': 'WhatsApp', 't.co': 'X / Twitter', 'linkedin.com': 'LinkedIn', 'spd.de': 'spd.de', 'spd-heidekreis.de': 'SPD Heidekreis', 'soltau.de': 'soltau.de', 'unbekannt': 'Unbekannt' };
  const EREIGNIS = { instagram: 'Instagram angeklickt', 'kalender-abo': 'Termine abonniert (Kalender)', 'e-mail': 'E-Mail-Adresse angeklickt', telefon: 'Telefonnummer angeklickt', mitgliederbereich: 'Mitgliederbereich geöffnet', teilen: 'Termin geteilt', pdf: 'PDF geöffnet', 'app-installiert': 'App installiert', 'formular:Anfragen': 'Anliegen / Anfrage gesendet', 'formular:Buchungen': 'Roter Bahnhof angefragt', 'formular:Abonnenten': 'Newsletter abonniert', 'umfrage:stimme': 'Umfrage der Woche: abgestimmt', 'countdown:weitersagen': 'Countdown weitergesagt', 'countdown:instagram': 'Countdown: Instagram angeklickt', 'countdown:anmelden': 'Countdown: Vorschau geöffnet', 'countdown:website': 'Willkommen: „Zur neuen Website“' };
  const GERAET = { handy: 'Handy', tablet: 'Tablet', pc: 'PC / Laptop' };
  const WOCHE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const titel = p => TITEL[p] || (p.startsWith('/aktuelles/') ? ((SPD.news || []).find(n => `/aktuelles/${n.slug}/` === p)?.title || p.slice(11, -1)) : p);
  const quelle = q => QUELLE[q] || q;
  const ereignis = e => EREIGNIS[e] || e;
  const parse = s => { try { return JSON.parse(s || '{}') || {}; } catch (e) { return {}; } };
  const inDays = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const num = n => (n || 0).toLocaleString('de-DE');
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  const kurz = t => `${t.slice(8, 10)}.${t.slice(5, 7)}.`;

  async function statistik(panel) {
    const alle = (await db.list('Statistik', { desc: 'tag', limit: 400 }).catch(() => [])).map(x => ({ tag: x.tag, d: parse(x.daten) })).filter(x => /^\d{4}-\d{2}-\d{2}$/.test(x.tag || '')).sort((a, b) => a.tag.localeCompare(b.tag));
    let zeit = store.get('spd-stat-zeit') || '30';
    const render = () => {
      const n = Number(zeit), heute = todayIso();
      const von = inDays(heute, -(n - 1)), vorVon = inDays(heute, -(2 * n - 1));
      const jetzt = alle.filter(x => x.tag >= von && x.tag <= heute), vorher = alle.filter(x => x.tag >= vorVon && x.tag < von);
      const summe = docs => docs.reduce((s, x) => { s.aufrufe += x.d.aufrufe || 0; s.besuche += x.d.besuche || 0; s.app += x.d.app || 0; s.ladeS += x.d.lade?.summe || 0; s.ladeN += x.d.lade?.n || 0; return s; }, { aufrufe: 0, besuche: 0, app: 0, ladeS: 0, ladeN: 0 });
      const S = summe(jetzt), V = summe(vorher);
      const delta = (a, b) => { if (!b) return ''; const p = Math.round((a - b) / b * 100); return `<small class="${p > 0 ? 'st-plus' : p < 0 ? 'st-minus' : ''}">${p > 0 ? '+' : ''}${p} % zum Zeitraum davor</small>`; };
      const merge = key => { const m = {}; for (const x of jetzt) for (const [k, v] of Object.entries(x.d[key] || {})) m[k] = (m[k] || 0) + v; return Object.entries(m).sort((a, b) => b[1] - a[1]); };
      const stunden = Array(24).fill(0); for (const x of jetzt) (x.d.stunden || []).forEach((v, i) => { stunden[i] += v || 0; });
      const woche = Array(7).fill(0); for (const x of jetzt) woche[(new Date(x.tag + 'T12:00:00').getDay() + 6) % 7] += x.d.aufrufe || 0;
      // Zeitreihe: je Tag, bei 12 Monaten je Woche
      const reihe = [];
      if (n <= 90) for (let i = n - 1; i >= 0; i--) { const t = inDays(heute, -i); const x = alle.find(y => y.tag === t); reihe.push({ label: kurz(t), voll: new Date(t + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' }), aufrufe: x?.d.aufrufe || 0, besuche: x?.d.besuche || 0 }); }
      else for (let w = 51; w >= 0; w--) { const bis = inDays(heute, -w * 7), ab = inDays(bis, -6); const xs = alle.filter(y => y.tag >= ab && y.tag <= bis); reihe.push({ label: kurz(ab), voll: `Woche ${kurz(ab)} – ${kurz(bis)}`, aufrufe: xs.reduce((s, y) => s + (y.d.aufrufe || 0), 0), besuche: xs.reduce((s, y) => s + (y.d.besuche || 0), 0) }); }
      const seiten = merge('seiten'), quellen = merge('quellen'), geraete = merge('geraete'), sprachen = merge('sprachen'), ereignisse = merge('ereignisse');
      const beitraege = seiten.filter(([p]) => p.startsWith('/aktuelles/') && p !== '/aktuelles/');
      const seitenSumme = seiten.reduce((s, [, v]) => s + v, 0), quellenSumme = quellen.reduce((s, [, v]) => s + v, 0), geraeteSumme = geraete.reduce((s, [, v]) => s + v, 0);
      const balken = (list, label, summe, max = 12) => list.length ? `<div class="st-liste">${list.slice(0, max).map(([k, v]) => `<div class="st-zeile"><span class="st-lab" title="${esc(k)}">${esc(label(k))}</span><span class="st-bar"><i style="width:${pct(v, list[0][1])}%"></i></span><b>${num(v)}</b><small>${pct(v, summe)} %</small></div>`).join('')}</div>` : '<p class="muted small">Noch nichts gezählt.</p>';
      const mini = (werte, labels) => { const max = Math.max(1, ...werte); return `<div class="st-mini">${werte.map((v, i) => `<span title="${esc(labels[i])}: ${num(v)}"><i style="height:${Math.round(v / max * 100)}%"></i><small>${esc(labels[i])}</small></span>`).join('')}</div>`; };
      const max = Math.max(1, ...reihe.map(r => r.aufrufe));
      const W = 1000, H = 160, bw = W / reihe.length;
      const chart = `<svg class="st-chart" viewBox="0 0 ${W} ${H + 24}" preserveAspectRatio="none" role="img" aria-label="Aufrufe und Besuche im Verlauf">${[0.5, 1].map(f => `<line x1="0" x2="${W}" y1="${H - H * f}" y2="${H - H * f}" class="st-grid"/>`).join('')}${reihe.map((r, i) => { const h1 = Math.round(r.aufrufe / max * H), h2 = Math.round(r.besuche / max * H); return `<g><title>${esc(r.voll)}: ${num(r.aufrufe)} Aufrufe, ${num(r.besuche)} Besuche</title><rect x="${(i * bw + bw * 0.12).toFixed(1)}" y="${H - h1}" width="${(bw * 0.76).toFixed(1)}" height="${h1}" class="st-a"/><rect x="${(i * bw + bw * 0.12).toFixed(1)}" y="${H - h2}" width="${(bw * 0.76).toFixed(1)}" height="${h2}" class="st-b"/></g>`; }).join('')}${reihe.map((r, i) => (reihe.length <= 14 || i % Math.ceil(reihe.length / 10) === 0) ? `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${H + 18}" class="st-x">${esc(r.label)}</text>` : '').join('')}</svg>`;
      const seit = alle[0]?.tag;
      panel.innerHTML = `${sectionHead('Statistik', 'Aufrufe der Website – ohne Cookies, ohne IP-Adressen, ohne Personen')}
      <div class="mb-tabs st-zeit">${ZEIT.map(([k, l]) => `<button type="button" class="chip" data-zeit="${k}" aria-pressed="${k === zeit}">${l}</button>`).join('')}<button type="button" class="chip st-csv" data-csv>CSV</button></div>
      ${alle.length ? '' : '<p class="note note-info">Noch keine Daten. Die Zählung läuft, sobald die Website unter spd-soltau.de aufgerufen wird – die ersten Tageswerte erscheinen nach wenigen Minuten.</p>'}
      <div class="st-kpis">
        <div class="st-kpi"><b>${num(S.aufrufe)}</b><span>Seitenaufrufe</span>${delta(S.aufrufe, V.aufrufe)}</div>
        <div class="st-kpi"><b>${num(S.besuche)}</b><span>Besuche</span>${delta(S.besuche, V.besuche)}</div>
        <div class="st-kpi"><b>${S.besuche ? (S.aufrufe / S.besuche).toFixed(1).replace('.', ',') : '–'}</b><span>Seiten je Besuch</span></div>
        <div class="st-kpi"><b>${num(S.app)}</b><span>Aufrufe aus der App</span></div>
        <div class="st-kpi"><b>${S.ladeN ? (S.ladeS / S.ladeN / 1000).toFixed(1).replace('.', ',') + ' s' : '–'}</b><span>Ø Ladezeit</span></div>
      </div>
      <section class="mb-sub"><h4 class="doc-cat">Verlauf <span class="small muted">${n <= 90 ? 'je Tag' : 'je Woche'} · <i class="st-leg st-leg-a"></i> Aufrufe <i class="st-leg st-leg-b"></i> Besuche</span></h4>${chart}</section>
      <div class="st-grid">
        <section class="mb-sub"><h4 class="doc-cat">Seiten <span class="small muted">${num(seitenSumme)} Aufrufe</span></h4>${balken(seiten, titel, seitenSumme, 15)}</section>
        <section class="mb-sub"><h4 class="doc-cat">Beiträge</h4>${balken(beitraege, titel, seitenSumme, 10)}</section>
        <section class="mb-sub"><h4 class="doc-cat">Woher die Besuche kommen <span class="small muted">${num(quellenSumme)} Einstiege</span></h4>${balken(quellen.filter(([k]) => k !== 'intern'), quelle, quellenSumme)}</section>
        <section class="mb-sub"><h4 class="doc-cat">Was die Leute tun</h4>${balken(ereignisse, ereignis, ereignisse.reduce((s, [, v]) => s + v, 0))}</section>
        <section class="mb-sub"><h4 class="doc-cat">Geräte</h4>${balken(geraete, k => GERAET[k] || k, geraeteSumme)}<h4 class="doc-cat" style="margin-top:18px">Sprache des Browsers</h4>${balken(sprachen, k => k.toUpperCase(), geraeteSumme, 5)}</section>
        <section class="mb-sub"><h4 class="doc-cat">Uhrzeit</h4>${mini(stunden, stunden.map((_, i) => i % 3 === 0 ? String(i) : ''))}<h4 class="doc-cat" style="margin-top:18px">Wochentag</h4>${mini(woche, WOCHE)}</section>
      </div>
      <p class="small muted st-fuss">Gezählt wird jeder Seitenaufruf mit Seite, Herkunft (nur die Domain), Gerät, Browsersprache und Ladezeit – keine IP-Adresse, keine Kennung, kein Cookie. „Besuche“ sind Aufrufe, die von außen kommen (Adresse eingetippt, Suchmaschine, Link). Der Push-Dienst verdichtet die Einträge alle paar Minuten zu Tageswerten und löscht die Rohdaten.${seit ? ` Daten seit ${esc(new Date(seit + 'T12:00:00').toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }))}.` : ''}</p>`;
      $$('[data-zeit]', panel).forEach(b => b.addEventListener('click', () => { zeit = b.dataset.zeit; store.set('spd-stat-zeit', zeit); render(); }));
      $('[data-csv]', panel).addEventListener('click', () => {
        const zeilen = [['Tag', 'Aufrufe', 'Besuche', 'App', 'Ø Ladezeit (ms)', 'Top-Seite'], ...jetzt.map(x => { const top = Object.entries(x.d.seiten || {}).sort((a, b) => b[1] - a[1])[0]; return [x.tag, x.d.aufrufe || 0, x.d.besuche || 0, x.d.app || 0, x.d.lade?.n ? Math.round(x.d.lade.summe / x.d.lade.n) : '', top ? `${top[0]} (${top[1]})` : '']; })];
        const csv = zeilen.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = `spd-soltau-statistik-${von}-${heute}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      });
    };
    render();
  }
  return { statistik };
}
