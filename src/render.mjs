// Gemeinsame Render-Bausteine – laufen im Build (Node) und im Browser (site.js).
// Alle Funktionen geben HTML-Strings zurück; Nutzdaten werden immer über esc() maskiert.

export const MONL = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
export const MONS = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
export const WD = ['So','Mo','Di','Mi','Do','Fr','Sa'];

export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
export const D = s => new Date(String(s).slice(0, 10) + 'T00:00:00');
export const fmt = s => { const x = D(s); return `${x.getDate()}. ${MONL[x.getMonth()]} ${x.getFullYear()}`; };
// Kürzt Anrisstexte so, dass ganze Sätze stehen bleiben: bis n Zeichen, Schnitt am letzten Satzende;
// gibt es kein Satzende, am Wortende mit Auslassungszeichen.
export const short = (t, n) => {
  t = String(t ?? '').replace(/\s+/g, ' ').trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n + 1);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (end > n * 0.4) return cut.slice(0, end + 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 20)) + ' …';
};
export const initials = n => String(n).split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('');

let BASE = '';
export function setBase(b) { BASE = b || ''; }
export const url = p => `${BASE}${p}`;

// Foto oder Platzhalter (Streifenfläche wie im Entwurf)
export function ph(label, cls = '') {
  return `<div class="ph ${cls}"><span>${esc(label)}</span></div>`;
}
// Bildfläche: echtes Foto (wenn vorhanden) oder Platzhalter; `inner` wird vorangestellt (z. B. Kategorie-Tag)
export function photo(img, label, cls = '', inner = '') {
  if (img && img.url) {
    return `<div class="ph ${cls} has-img">${inner}<img src="${esc(img.url)}" alt="${esc(img.alt || label || '')}" loading="lazy" decoding="async"></div>`;
  }
  return `<div class="ph ${cls}">${inner}<span>${esc(label ? `Foto: ${label}` : 'Foto folgt')}</span></div>`;
}

export function newsCard(n) {
  return `<a class="card" href="${url(`/aktuelles/${n.slug}/`)}">${photo(n.img, n.imgLabel || n.title, '', `<span class="tag">${esc(n.cat)}</span>`)}<div class="card-body"><span class="date">${fmt(n.date)}</span><h3>${esc(n.title)}</h3>${n.teaser ? `<p>${esc(short(n.teaser, 180))}</p>` : ''}<span class="weiter">Weiterlesen</span></div></a>`;
}

export function badge(t) {
  const c = t === 'Öffentlich' ? 'badge-off' : t === 'Mitglieder' ? 'badge-mit' : '';
  return `<span class="badge ${c}">${esc(t)}</span>`;
}

export function eventRow(e, withInfo) {
  const x = D(e.date);
  const title = e.url ? `<a href="${esc(e.url)}" style="color:inherit;text-decoration:none">${esc(e.title)}</a>` : esc(e.title);
  return `<div class="event"><div class="event-date"><b>${String(x.getDate()).padStart(2, '0')}</b><span>${WD[x.getDay()]} · ${MONS[x.getMonth()]}</span></div><div><h3>${title}</h3><div class="meta">${esc(e.zeit)}${e.ort ? ' · ' + esc(e.ort) : ''}</div>${withInfo && e.info ? `<div class="info">${esc(e.info)}</div>` : ''}${withInfo ? `<a class="share" href="#" data-share="${esc(`📅 ${e.title}\n${fmt(e.date)}${e.zeit ? ', ' + e.zeit : ''}${e.ort ? ' · ' + e.ort : ''}`)}" target="_blank" rel="noopener">Per WhatsApp teilen</a>` : ''}</div>${badge(e.typ)}</div>`;
}

export function eventsGrouped(list, withInfo) {
  if (!list.length) return '<p class="muted">Aktuell sind keine Termine eingetragen.</p>';
  const groups = new Map();
  list.forEach(e => { const x = D(e.date); const k = `${MONL[x.getMonth()]} ${x.getFullYear()}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(e); });
  return [...groups].map(([m, es]) => `<div class="month">${m}</div><div class="events">${es.map(e => eventRow(e, withInfo)).join('')}</div>`).join('');
}

export function avatar(p) {
  if (p.photo && p.photo.url) {
    return `<div class="avatar has-img"><img src="${esc(p.photo.url)}" alt="${esc(p.name)}" loading="lazy" decoding="async"><span></span></div>`;
  }
  return `<div class="avatar"><span>${initials(p.name)}</span></div>`;
}

export function personCard(p) {
  return `<button class="person" type="button" data-name="${esc(p.name)}">${avatar(p)}<div class="plate"><b>${esc(p.name)}</b><small>${esc(p.job)}</small>${p.role ? `<span class="rolle">${esc(p.role)}</span>` : ''}</div></button>`;
}

export function zielAccordion(ziele) {
  return ziele.map((z, i) => `<details class="ziel"${i === 0 ? ' open' : ''}><summary><span class="num">${String(i + 1).padStart(2, '0')}</span><span>${esc(z.title)}</span></summary><div class="ziel-body"><p>${esc(z.intro)}</p><p><b>Konkret wollen wir:</b></p><ul>${z.points.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></details>`).join('');
}

export function zieleGrid(ziele) {
  return ziele.map((z, i) => `<a href="${url('/ziele/')}"><span class="num">${String(i + 1).padStart(2, '0')}</span><span>${esc(z.title)}</span></a>`).join('');
}

export function tickerItems(events) {
  return events.map(e => { const x = D(e.date); return `<span>${WD[x.getDay()]} ${x.getDate()}. ${MONS[x.getMonth()]} – ${esc(e.title)}${e.ort ? ' · ' + esc(e.ort) : ''}</span>`; }).join('');
}

export function pollButtons(poll, myVote) {
  const voted = myVote !== null && myVote !== undefined;
  const total = poll.reduce((s, o) => s + o.count, 0) + (voted ? 1 : 0);
  return poll.map((o, i) => {
    const n = o.count + (voted && String(i) === String(myVote) ? 1 : 0);
    const pct = Math.round(n / total * 100);
    return `<button type="button" data-i="${i}" class="${voted && String(i) === String(myVote) ? 'mine' : ''}" ${voted ? 'disabled' : ''}><span class="bar" style="width:${voted ? pct : 0}%"></span><span>${esc(o.label)}</span><span class="pct">${voted ? pct + ' %' : ''}</span></button>`;
  }).join('');
}

export function instaTiles(items) {
  const heart = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8 3.5 4.5 7 4.5c2 0 3.4 1.1 5 3 1.6-1.9 3-3 5-3 3.5 0 6 3.5 4.5 7.3C19.5 16.4 12 21 12 21z"/></svg>';
  const multi = '<svg class="multi" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="14" height="14" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v11"/></svg>';
  return items.map((i, k) => {
    const label = i.label || (i.caption ? i.caption.replace(/\s+/g, ' ').trim().slice(0, 48) + (i.caption.length > 48 ? '…' : '') : 'Instagram');
    if (!i.img) return `<a class="ph" href="${esc(i.url || 'https://www.instagram.com/spd_soltau/')}" target="_blank" rel="noopener"><span>${heart}${i.likes ? esc(i.likes) + ' · ' : ''}${esc(label)}</span></a>`;
    return `<button class="ph has-img" type="button" data-insta="${k}" aria-label="Instagram-Beitrag öffnen: ${esc(label)}">${(i.images || []).length > 1 ? multi : ''}<img src="${esc(i.img)}" alt="" loading="lazy" decoding="async"><span>${heart}${i.likes ? esc(i.likes) + ' · ' : ''}${esc(label)}</span></button>`;
  }).join('');
}
