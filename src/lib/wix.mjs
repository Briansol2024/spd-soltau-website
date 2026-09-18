// Anbindung an das Wix-Backend (Headless): Blog, Events, CMS-Sammlungen.
// Läuft nur im Build (Node). Jede Quelle ist unabhängig abgesichert – fällt eine aus,
// bleiben die Fallback-Inhalte für genau diese Quelle stehen.

import { createClient, OAuthStrategy } from '@wix/sdk';
import { posts, categories } from '@wix/blog';
import { wixEventsV2 } from '@wix/events';
import { items } from '@wix/data';

const log = (...a) => console.log('[wix]', ...a);

export function makeClient(clientId) {
  return createClient({
    modules: { posts, categories, wixEventsV2, items },
    auth: OAuthStrategy({ clientId }),
  });
}

// ---------- Hilfen ----------

// Wix-Bild-URI (wix:image://v1/<id>/<name>#originWidth=..) → https-URL mit Zuschnitt
export function wixImageUrl(v, w = 1200, h = 800) {
  if (!v) return null;
  const s = typeof v === 'string' ? v : (v.url || v.src || v.id || '');
  if (!s) return null;
  if (/^https?:\/\//.test(s)) return s;
  const m = s.match(/^wix:image:\/\/v1\/([^/#]+)(?:\/([^#]*))?(#.*)?$/);
  if (!m) return null;
  const id = m[1];
  const name = decodeURIComponent(m[2] || id);
  return `https://static.wixstatic.com/media/${id}/v1/fill/w_${w},h_${h},al_c,q_85,enc_auto/${encodeURIComponent(name)}`;
}

const pick = (obj, keys) => { for (const k of keys) { if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k]; } return undefined; };
const flat = it => (it && it.data && typeof it.data === 'object' && !it.title && !it.name) ? { _id: it._id, ...it.data } : it;

export const slugify = s => String(s).toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'beitrag';

const BERLIN = 'Europe/Berlin';
export function isoDateBerlin(d) { // → 'YYYY-MM-DD' in deutscher Zeit
  return new Intl.DateTimeFormat('sv-SE', { timeZone: BERLIN, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
}
export function timeBerlin(d) {
  return new Intl.DateTimeFormat('de-DE', { timeZone: BERLIN, hour: '2-digit', minute: '2-digit' }).format(new Date(d)) + ' Uhr';
}

// ---------- Ricos (Wix-Rich-Text) → HTML ----------
const escHtml = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function inline(nodes = []) {
  return nodes.map(n => {
    if (n.type === 'TEXT') {
      let t = escHtml(n.textData?.text ?? '');
      const decos = n.textData?.decorations || [];
      for (const d of decos) {
        if (d.type === 'BOLD') t = `<strong>${t}</strong>`;
        else if (d.type === 'ITALIC') t = `<em>${t}</em>`;
        else if (d.type === 'UNDERLINE') t = `<u>${t}</u>`;
        else if (d.type === 'LINK') {
          const href = d.linkData?.link?.url || '#';
          const ext = /^https?:\/\//.test(href) && !href.includes('spd-soltau.de');
          t = `<a href="${escHtml(href)}"${ext ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
        }
      }
      return t;
    }
    if (n.type === 'LINE_BREAK') return '<br>';
    return inline(n.nodes || []);
  }).join('');
}

export function ricosToHtml(rich, opts = {}) {
  if (!rich || !Array.isArray(rich.nodes)) return '';
  let skipId = opts.skipImageId || null; // Titelbild nicht noch einmal im Text zeigen
  const block = n => {
    switch (n.type) {
      case 'PARAGRAPH': { const t = inline(n.nodes); return t.trim() ? `<p>${t}</p>` : ''; }
      case 'HEADING': { const l = Math.min(Math.max(n.headingData?.level || 2, 2), 4); return `<h${l}>${inline(n.nodes)}</h${l}>`; }
      case 'BULLETED_LIST': return `<ul>${(n.nodes || []).map(li => `<li>${(li.nodes || []).map(block).join('')}</li>`).join('')}</ul>`;
      case 'ORDERED_LIST': return `<ol>${(n.nodes || []).map(li => `<li>${(li.nodes || []).map(block).join('')}</li>`).join('')}</ol>`;
      case 'BLOCKQUOTE': return `<blockquote>${(n.nodes || []).map(block).join('')}</blockquote>`;
      case 'DIVIDER': return '<hr>';
      case 'IMAGE': {
        const src = n.imageData?.image?.src; const id = src?.id || src?.url;
        if (skipId && id && String(id).includes(skipId)) { skipId = null; return ''; }
        const u = id ? wixImageUrl(id.startsWith('wix:') || id.startsWith('http') ? id : `wix:image://v1/${id}/bild.jpg`, 1400, 900) : null;
        const alt = n.imageData?.altText || n.imageData?.caption || '';
        return u ? `<figure><img src="${escHtml(u)}" alt="${escHtml(alt)}" loading="lazy">${n.imageData?.caption ? `<figcaption>${escHtml(n.imageData.caption)}</figcaption>` : ''}</figure>` : '';
      }
      case 'GALLERY': {
        const imgs = (n.galleryData?.items || []).map(it => it.image?.media?.src?.id).filter(Boolean);
        return imgs.length ? `<div class="gallery">${imgs.map(id => `<img src="${escHtml(wixImageUrl(`wix:image://v1/${id}/bild.jpg`, 900, 700))}" alt="" loading="lazy">`).join('')}</div>` : '';
      }
      case 'VIDEO': { const u = n.videoData?.video?.src?.url; return u ? `<p><a href="${escHtml(u)}" target="_blank" rel="noopener">Video ansehen</a></p>` : ''; }
      default: return (n.nodes || []).map(block).join('');
    }
  };
  return rich.nodes.map(block).join('\n');
}

// ---------- Quellen ----------

const CAT_MAP = [[/fraktion|rat/i, 'Fraktion'], [/presse/i, 'Pressemitteilung'], [/ortsverein|verein/i, 'Ortsverein']];
function mapCategory(labels) {
  for (const l of labels) for (const [re, cat] of CAT_MAP) if (re.test(l)) return cat;
  return labels[0] || 'Ortsverein';
}

// Blog-Kategorien (für das Beitragsformular im Mitgliederbereich)
export async function fetchCategories(client) {
  const res = await client.categories.queryCategories().find().catch(() => ({ items: [] }));
  return (res.items || []).map(c => ({ id: c._id, label: c.label }));
}

export async function fetchNews(client) {
  const catRes = await client.categories.queryCategories().find().catch(() => ({ items: [] }));
  const cats = new Map((catRes.items || []).map(c => [c._id, c.label]));
  const res = await client.posts.queryPosts().limit(60).descending('firstPublishedDate').find();
  const list = res.items || [];
  log('Blog-Beiträge:', list.length);
  const out = [];
  for (const post of list) {
    let bodyHtml = '';
    const media = post.media?.wixMedia?.image || post.coverMedia?.image || post.media?.image;
    const coverId = (typeof media === 'string' ? media : (media?.id || media?.url || '')).match(/([0-9a-f]+_[0-9a-f]+~mv2\.[a-z]+)/)?.[1] || null;
    try {
      const full = await client.posts.getPost(post._id, { fieldsets: ['RICH_CONTENT', 'CONTENT_TEXT'] });
      const p = full.post || full;
      bodyHtml = ricosToHtml(p.richContent, { skipImageId: coverId });
      if (!bodyHtml && p.contentText) bodyHtml = p.contentText.split(/\n{2,}/).map(t => `<p>${escHtml(t.trim())}</p>`).join('');
    } catch (e) { log('Beitragsinhalt nicht ladbar:', post.title, e.message); }
    const imgUrl = wixImageUrl(media, 1400, 900);
    const labels = (post.categoryIds || []).map(id => cats.get(id)).filter(Boolean);
    out.push({
      id: post._id,
      slug: post.slug || slugify(post.title),
      cat: mapCategory(labels),
      date: isoDateBerlin(post.firstPublishedDate || post._createdDate || Date.now()),
      title: post.title,
      teaser: post.excerpt || '',
      img: imgUrl ? { url: imgUrl, alt: post.title } : null,
      imgLabel: post.title,
      bodyHtml,
    });
  }
  return out;
}

// Terminart aus Titel und Kurzbeschreibung (App-Termine tragen dort z. B. „Nur für Mitglieder“)
function eventType(title = '', info = '') {
  const t = `${title} ${info}`;
  if (/fraktion/i.test(t)) return 'Fraktion';
  if (/vorstand|mitglieder|klausur/i.test(t)) return 'Mitglieder';
  return 'Öffentlich';
}

export async function fetchEvents(client) {
  const res = await client.wixEventsV2.queryEvents().limit(100).find();
  const list = res.items || [];
  log('Events:', list.length);
  const today = isoDateBerlin(Date.now());
  return list
    .filter(e => e.status !== 'CANCELED')
    .map(e => {
      const s = e.dateAndTimeSettings || {};
      const start = s.startDate || e.scheduling?.config?.startDate;
      const date = start ? isoDateBerlin(start) : today;
      const tbd = s.dateAndTimeTbd || s.timeTbd;
      return {
        id: e._id,
        slug: e.slug,
        date,
        title: e.title,
        ort: e.location?.name || e.location?.address?.formatted || '',
        zeit: tbd ? 'Uhrzeit folgt' : (start ? timeBerlin(start) : ''),
        typ: eventType(e.title, e.shortDescription || ''),
        info: e.shortDescription || '',
        url: null,
      };
    })
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function fetchCollection(client, id) {
  const res = await client.items.query(id).limit(200).find();
  const list = (res.items || []).map(flat);
  log(`Sammlung ${id}:`, list.length);
  return list;
}

const asList = v => Array.isArray(v) ? v : (typeof v === 'string' && v.trim() ? v.split(/[,;]/).map(s => s.trim()).filter(Boolean) : []);

export async function fetchPeople(client, collectionId = 'KandidatinnenzurStadtratswahl') {
  const list = await fetchCollection(client, collectionId);
  return list
    .map(d => ({
      // Sammlung „Kandidat*innen“: title = Name, description = Beruf, text = Kurztext, title1 = Listenplatz, image = Foto
      name: pick(d, ['name', 'title']) || '',
      job: pick(d, ['beruf', 'job', 'taetigkeit', 'description', 'shortDescription']) || '',
      role: pick(d, ['rolle', 'role', 'funktion', 'position', 'jobTitle']) || '',
      text: pick(d, ['beschreibung', 'kurztext', 'text']) || '',
      themen: asList(pick(d, ['themen', 'tags', 'schwerpunkte'])),
      listenplatz: Number(pick(d, ['listenplatz', 'platz', 'order', 'title1'])) || 999,
      photo: (() => { const u = wixImageUrl(pick(d, ['foto', 'photo', 'bild', 'image']), 600, 750); return u ? { url: u } : null; })(),
    }))
    .filter(p => p.name)
    .sort((a, b) => a.listenplatz - b.listenplatz);
}

export async function fetchVorstand(client, collectionId = 'Team') {
  const list = await fetchCollection(client, collectionId);
  const sortKey = d => { const k = Object.keys(d).find(k => k.startsWith('_manualSort')); return k ? String(d[k]) : ''; };
  return list
    .map(d => ({
      // Sammlung „Vorstand“ (ID Team): title = Name, jobTitle = Position, shortDescription = Beruf, photo = Foto
      name: pick(d, ['name', 'title']) || '',
      position: pick(d, ['position', 'funktion', 'rolle', 'jobTitle']) || '',
      job: pick(d, ['beruf', 'job', 'shortDescription']) || '',
      photo: (() => { const u = wixImageUrl(pick(d, ['photo', 'foto', 'bild', 'image']), 600, 750); return u ? { url: u } : null; })(),
      sort: sortKey(d),
    }))
    .filter(p => p.name)
    .sort((a, b) => a.sort.localeCompare(b.sort));
}

// Instagram: Die Wix-Instagram-App hält die letzten Beiträge in einer App-Sammlung vor (Bild, Text, Link, Likes).
export async function fetchInstagram(client, collectionId = '@vanyadoing/instagram/ig-media') {
  const list = await fetchCollection(client, collectionId);
  const ts = d => new Date(d.timestamp || d._createdDate || 0).getTime();
  return list
    .filter(d => d.mediaUrl && d.mediaType !== 'VIDEO')
    .sort((a, b) => ts(b) - ts(a))
    .slice(0, 6)
    .map(d => ({
      id: d.shortcode || d.igMediaId,
      url: d.permalink || 'https://www.instagram.com/spd_soltau/',
      img: d.mediaUrl,
      // Mehrfach-Posts: alle Bilder (erstes = Titelbild)
      images: (Array.isArray(d.children) && d.children.length ? d.children.map(ch => ch.mediaUrl || ch.imageUrl).filter(Boolean) : [d.mediaUrl]),
      caption: d.caption || '',
      date: isoDateBerlin(d.timestamp || Date.now()),
      likes: d.metrics?.likes ?? null,
      comments: d.metrics?.comments ?? null,
    }));
}
