// Push-Dienst der SPD-Soltau-App. Läuft regelmäßig (z. B. alle 5 Minuten) mit dem Wix-Admin-API-Schlüssel und
//   1. gleicht die Wix-Mitglieder mit der Sammlung AppMitglieder ab (Name, Rollen, „Push aktiv“),
//   2. führt Aktionen des Vorstands aus (Registrierung freischalten/ablehnen, Buchung annehmen/ablehnen, Nachricht an alle),
//   3. schickt Push-Nachrichten: neue Beiträge, neue Termine, Erinnerung am Vortag, Registrierungs- und Buchungsanfragen,
//      Zu-/Absagen – Vorstands-Themen gehen an die in „Wer wird benachrichtigt?“ eingetragenen Personen.
// Jede Nachricht wird in PushLog vermerkt, damit nichts doppelt verschickt wird.
//
//   node push/send.mjs            normaler Lauf
//   node push/send.mjs --test     Testnachricht an alle aktiven Geräte
//   node push/send.mjs --dry      nichts senden, nur zeigen, was gesendet würde
import webpush from 'web-push';
import { adminClient, memberClient, queryAll, env, isoDate, hourBerlin, fmtDe, log } from './lib.mjs';
import { evaluateSettings, canSee } from '../src/lib/rights.mjs';
import { eventType, isPublicType } from '../src/lib/wix.mjs';

const DRY = process.argv.includes('--dry');
const TEST = process.argv.includes('--test');
const VORSTAND_RE = new RegExp(env.VORSTAND_ROLLE || 'vorstand', 'i');
// Startvorstand: Diese E-Mail-Adressen werden beim ersten Lauf freigeschaltet und als Vorstand gesetzt, solange bei Wix
// noch niemand die Rolle „Vorstandsmitglied“ hat – danach regelt die App unter „Wer darf was?“ alles Weitere.
const BOOT = (env.VORSTAND_EMAILS || '').toLowerCase().split(/[,; ]+/).filter(Boolean);
const SITE = (env.PUSH_SITE_URL || env.SITE_URL || '').replace(/\/$/, '');
const NOW = Date.now();
const H = 3600 * 1000;
const PUSH_HOSTS = /(^|\.)(push\.apple\.com|fcm\.googleapis\.com|android\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com|push\.mozilla\.com|web\.push\.apple\.com|wns2-.*\.notify\.windows\.com|.*\.push\.ovh\.net)$/i;

if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) { console.error('VAPID-Schlüssel fehlen – bitte zuerst: node push/setup.mjs'); process.exit(1); }
webpush.setVapidDetails(env.VAPID_SUBJECT || 'mailto:weber.soltau@gmail.com', env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

const client = adminClient();
const stats = { gesendet: 0, fehler: 0, entfernt: 0 };

// ---------- Abonnements ----------
async function loadSubscriptions() {
  const all = await queryAll(client, 'PushSubscriptions', q => q.descending('_createdDate'));
  const latest = new Map(); const stale = [];
  for (const s of all) {
    if (!s.endpoint) continue;
    if (latest.has(s.endpoint)) { stale.push(s); continue; }
    latest.set(s.endpoint, s);
  }
  // ältere Einträge desselben Geräts aufräumen
  for (const s of stale.slice(0, 50)) { if (!DRY) await client.items.remove('PushSubscriptions', s._id).catch(() => {}); }
  const subs = [...latest.values()].filter(s => s.aktiv !== false && s.keys && (() => { try { return PUSH_HOSTS.test(new URL(s.endpoint).hostname); } catch (e) { return false; } })());
  for (const s of subs) { try { s.keysObj = typeof s.keys === 'string' ? JSON.parse(s.keys) : s.keys; } catch (e) { s.keysObj = null; } }
  log(`Abonnements: ${subs.length} aktiv (${all.length} Einträge, ${stale.length} veraltet)`);
  return subs.filter(s => s.keysObj?.p256dh && s.keysObj?.auth);
}

// ---------- Protokoll (Doppelversand vermeiden) ----------
async function loadLog() {
  const items = await queryAll(client, 'PushLog', q => q.descending('_createdDate'));
  const keys = new Set(items.map(i => i.key));
  // Einträge älter als 120 Tage löschen
  for (const it of items.filter(i => NOW - new Date(i._createdDate).getTime() > 120 * 24 * H).slice(0, 50)) { if (!DRY) await client.items.remove('PushLog', it._id).catch(() => {}); }
  return keys;
}
async function logKey(key, info = {}) {
  if (DRY) return;
  await client.items.insert('PushLog', { title: key, key, ...info }).catch(e => log('PushLog-Fehler', e.message));
}

// ---------- Senden ----------
async function send(subs, payload, key, logKeys) {
  if (!subs.length) { log(`  ${key}: keine Empfänger (wird beim nächsten Lauf erneut versucht)`); return; }
  log(`  ${key}: „${payload.title}“ → ${subs.length} Gerät(e)${DRY ? ' (Trockenlauf)' : ''}`);
  if (DRY) return;
  const body = JSON.stringify(payload);
  let ok = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keysObj }, body, { TTL: 24 * 3600, urgency: 'normal' });
      ok++; stats.gesendet++;
    } catch (e) {
      stats.fehler++;
      if (e.statusCode === 404 || e.statusCode === 410) { stats.entfernt++; await client.items.remove('PushSubscriptions', s._id).catch(() => {}); s.aktiv = false; }
      else log('  Fehler', e.statusCode || '', e.body?.slice?.(0, 120) || e.message);
    }
  }
  if (logKeys) { logKeys.add(key); await logKey(key, { empfaenger: ok, titel: payload.title }); }
}
const byTopic = (subs, topic) => subs.filter(s => (s.themen || []).includes(topic));
const byMembers = (subs, ids) => subs.filter(s => s.memberId && ids.includes(s.memberId));
const memberSubs = subs => subs.filter(s => !!s.memberId);
// nur Geräte von Mitgliedern, die den Bereich/Termintyp laut „Wer sieht was?“ sehen dürfen
const whoSees = (st, subs, key) => memberSubs(subs).filter(s => canSee(st, s.memberId, key));
const url = p => (SITE ? SITE : '') + p;
const INBOX = '/mitglieder/#vorstand/eingang';

// ---------- Mitglieder abgleichen ----------
async function syncMembers(subs) {
  const list = [];
  for (let offset = 0; ; offset += 100) {
    const res = await client.members.listMembers({ fieldsets: ['FULL'], paging: { limit: 100, offset } });
    list.push(...(res.members || []));
    if ((res.members || []).length < 100) break;
  }
  const pushMembers = new Set(subs.map(s => s.memberId).filter(Boolean));
  const existing = await queryAll(client, 'AppMitglieder');
  const byId = new Map(existing.map(e => [e.memberId, e]));
  const board = new Set(); const approved = []; const pending = []; const emails = new Map();
  for (const m of list) {
    const c = m.contact || {}, p = m.profile || {};
    const name = [c.firstName, c.lastName].filter(Boolean).join(' ') || p.nickname || m.loginEmail || m._id;
    const entry = { memberId: m._id, name, email: m.loginEmail || '', status: m.status, registriert: m._createdDate };
    emails.set(m._id, (m.loginEmail || '').toLowerCase());
    // Startvorstand wartet nicht auf Freigabe
    if (m.status === 'PENDING' && BOOT.includes((m.loginEmail || '').toLowerCase())) {
      log(`  Startvorstand ${name} wird freigeschaltet`);
      if (!DRY) { try { await client.members.approveMember(m._id); m.status = 'APPROVED'; } catch (e) { log('  approveMember', e.message); } }
    }
    if (m.status === 'PENDING') { pending.push(entry); continue; }
    if (m.status !== 'APPROVED') continue;
    let rollen = [];
    try { rollen = ((await client.authorization.getRoles(m._id)).roles || []).map(r => r.title || r.roleKey).filter(Boolean); }
    catch (e) { rollen = byId.get(m._id)?.rollen || []; }
    const vorstand = rollen.some(r => VORSTAND_RE.test(r));
    if (vorstand) board.add(m._id);
    approved.push({ memberId: m._id, name, rollen, vorstand, pushAktiv: pushMembers.has(m._id), status: 'aktiv', title: name });
  }
  // Noch niemand mit Vorstandsrolle bei Wix? Dann übernimmt der Startvorstand aus .env (VORSTAND_EMAILS)
  if (board.size === 0 && BOOT.length) {
    let roleKey = null;
    try { const { roles } = await client.memberRoleDefinition.listMemberRoleDefinitions(); roleKey = (roles || []).find(r => VORSTAND_RE.test(r.title || r.roleKey))?.roleKey || null; } catch (e) { /* ohne Rolle */ }
    for (const a of approved) {
      if (!BOOT.includes(emails.get(a.memberId))) continue;
      a.vorstand = true; a.rollen = [...new Set([...a.rollen, 'Vorstandsmitglied'])]; board.add(a.memberId);
      log(`  Startvorstand: ${a.name}`);
      if (!DRY && roleKey) await client.authorization.assignRole(a.memberId, roleKey).catch(e => log('  assignRole', e.message));
    }
  }
  // Sammlung AppMitglieder auf den Stand bringen (nur Name, Rollen, Push-Status – keine Kontaktdaten)
  if (!DRY) {
    for (const a of approved) {
      const cur = byId.get(a.memberId);
      const same = cur && cur.name === a.name && cur.vorstand === a.vorstand && cur.pushAktiv === a.pushAktiv && JSON.stringify(cur.rollen || []) === JSON.stringify(a.rollen);
      if (same) continue;
      if (cur) await client.items.update('AppMitglieder', { ...cur, ...a }).catch(e => log('AppMitglieder update', e.message));
      else await client.items.insert('AppMitglieder', a).catch(e => log('AppMitglieder insert', e.message));
    }
    const keep = new Set(approved.map(a => a.memberId));
    for (const e of existing) if (!keep.has(e.memberId)) await client.items.remove('AppMitglieder', e._id).catch(() => {});
  }
  log(`Mitglieder: ${approved.length} freigeschaltet, ${pending.length} wartend, Vorstand (Wix-Rolle): ${board.size}`);
  return { approved, pending, board };
}

// Der in der App festgelegte Vorstand wird als Wix-Rolle „Vorstandsmitglied“ gespiegelt (Wix bleibt Quelle der Wahrheit)
async function syncBoardRole(st, approved) {
  const wanted = st.board, current = st.wixBoard;
  const diff = [...wanted].filter(id => !current.has(id)).length + [...current].filter(id => !wanted.has(id)).length;
  if (!diff) return;
  let roleKey = null;
  try { const { roles } = await client.memberRoleDefinition.listMemberRoleDefinitions(); roleKey = (roles || []).find(r => VORSTAND_RE.test(r.title || r.roleKey))?.roleKey || null; }
  catch (e) { log('Rollen lesen:', e.message); }
  if (!roleKey) { log('Rolle „Vorstandsmitglied“ bei Wix nicht gefunden – Vorstand bleibt wie in der App festgelegt'); }
  for (const id of wanted) if (!current.has(id)) { log(`  Vorstand: ${approved.find(a => a.memberId === id)?.name || id} → Wix-Rolle setzen`); if (!DRY && roleKey) await client.authorization.assignRole(id, roleKey).catch(e => log('  assignRole', e.message)); }
  for (const id of current) if (!wanted.has(id)) { log(`  Vorstand: ${approved.find(a => a.memberId === id)?.name || id} → Wix-Rolle entfernen`); if (!DRY && roleKey) await client.authorization.unassignRole(id, roleKey).catch(e => log('  unassignRole', e.message)); }
  // AppMitglieder sofort angleichen (nächster Lauf liest die Rolle ohnehin neu)
  if (!DRY) for (const a of approved) {
    const v = wanted.has(a.memberId);
    if (v === !!a.vorstand) continue;
    const cur = (await client.items.query('AppMitglieder').eq('memberId', a.memberId).find()).items[0];
    if (cur) await client.items.update('AppMitglieder', { ...cur, vorstand: v }).catch(() => {});
  }
}

// ---------- Rechte + „Wer wird benachrichtigt?“ (gemeinsame Logik mit dem Mitgliederbereich) ----------
async function loadSettings(approved) {
  const snaps = await queryAll(client, 'Benachrichtigungen', q => q.descending('_createdDate'));
  const st = evaluateSettings(snaps, approved);
  // Schnappschüsse von Absendern ohne Berechtigung zählen nicht – und werden aufgeräumt
  const trusted = new Set([...st.board, ...st.rights.verwaltung]);
  for (const sn of snaps) {
    if (trusted.has(sn._owner)) continue;
    log(`  Einstellung „${sn.thema}“ von unberechtigtem Absender entfernt`);
    if (!DRY) await client.items.remove('Benachrichtigungen', sn._id).catch(() => {});
  }
  for (const [t, ids] of Object.entries(st.routing)) log(`  ${t}: ${ids.length} Empfänger${st.snap[t] ? '' : ' (Standard: gesamter Vorstand)'}`);
  return st;
}
const hasRight = (st, memberId, right) => !!st.rights[right]?.has(memberId);

// Inhalte, die nur mit Recht angelegt werden dürfen: Einträge Unberechtigter werden entfernt
async function moderate(st) {
  const rules = [['Umfragen', 'umfragen'], ['UmfragenOeffentlich', 'umfragen'], ['Helferlisten', 'helfer'], ['Dokumente', 'dokumente'], ['Ratsvorbereitung', 'rat']];
  for (const [col, right] of rules) {
    try {
      const list = await queryAll(client, col);
      for (const it of list) {
        if (hasRight(st, it._owner, right) || st.board.has(it._owner)) continue;
        log(`  ${col}: „${it.titel || it.frage || it._id}“ von ${it.von || it._owner} ohne Recht „${right}“ – entfernt`);
        if (!DRY) await client.items.remove(col, it._id).catch(() => {});
      }
    } catch (e) { log(`Moderation ${col}:`, e.message); }
  }
}


// ---------- Aktionen des Vorstands ----------
async function processActions(st, subs, logKeys) {
  const open = await queryAll(client, 'Aktionen', q => q.eq('status', 'offen'));
  const NEEDS = { mitglied_freigeben: 'freigaben', mitglied_ablehnen: 'freigaben', buchung_annehmen: 'freigaben', buchung_ablehnen: 'freigaben', anfrage_erledigt: 'freigaben', nachricht: 'nachrichten', termin_erstellen: 'termine', termin_absagen: 'termine', beitrag_erstellen: 'beitraege' };
  for (const a of open) {
    let payload = {}; try { payload = JSON.parse(a.payload || '{}'); } catch (e) { /* leer */ }
    const done = async (status, ergebnis) => { log(`  Aktion ${a.typ}: ${ergebnis}`); if (!DRY) await client.items.update('Aktionen', { ...a, status, ergebnis, erledigtAm: new Date().toISOString() }).catch(e => log('Aktion update', e.message)); };
    const need = NEEDS[a.typ];
    if (!need || !hasRight(st, a._owner, need)) { await done('abgelehnt', `Absender hat das Recht „${need || '?'}“ nicht`); continue; }
    try {
      switch (a.typ) {
        case 'mitglied_freigeben':
          if (!payload.memberId) throw new Error('memberId fehlt');
          await client.members.approveMember(payload.memberId); await inboxDone('registrierung:' + payload.memberId, `freigeschaltet von ${a.von || ''}`); await done('erledigt', `Mitglied ${payload.name || payload.memberId} freigeschaltet`); break;
        case 'mitglied_ablehnen':
          if (!payload.memberId) throw new Error('memberId fehlt');
          await client.members.blockMember(payload.memberId); await inboxDone('registrierung:' + payload.memberId, `abgelehnt von ${a.von || ''}`); await done('erledigt', `Registrierung ${payload.name || payload.memberId} abgelehnt (blockiert)`); break;
        case 'buchung_annehmen': case 'buchung_ablehnen': {
          if (!payload.buchungId) throw new Error('buchungId fehlt');
          const b = await client.items.get('Buchungen', payload.buchungId);
          const status = a.typ === 'buchung_annehmen' ? 'bestätigt' : 'abgelehnt';
          if (!DRY) await client.items.update('Buchungen', { ...b, status, bearbeitetVon: a.von || '', bearbeitetAm: new Date().toISOString() });
          await inboxDone('buchung:' + b._id, `${status} von ${a.von || ''}`);
          await done('erledigt', `Buchung ${b.name || ''} ${b.datum || ''}: ${status} – Bitte die anfragende Person informieren (${b.email || ''} ${b.telefon || ''})`);
          break;
        }
        case 'anfrage_erledigt': {
          if (!payload.anfrageId) throw new Error('anfrageId fehlt');
          const an = await client.items.get('Anfragen', payload.anfrageId);
          if (!DRY) await client.items.update('Anfragen', { ...an, status: 'erledigt', bearbeitetVon: a.von || '', bearbeitetAm: new Date().toISOString() });
          await inboxDone('anfrage:' + an._id, `erledigt von ${a.von || ''}`);
          await done('erledigt', `Anfrage von ${an.name || ''} als erledigt markiert`); break;
        }
        case 'termin_erstellen': {
          const ev = await createWixEvent(payload);
          await done('erledigt', `Termin „${payload.titel}“ bei Wix Events angelegt (${ev?._id || '?'})`); break;
        }
        case 'termin_absagen': {
          if (!payload.eventId) throw new Error('eventId fehlt');
          if (!DRY) await client.wixEventsV2.cancelEvent(payload.eventId);
          await done('erledigt', `Termin „${payload.titel || payload.eventId}“ abgesagt`); break;
        }
        case 'beitrag_erstellen': {
          const r = await createBlogPost(payload);
          await done('erledigt', payload.veroeffentlichen ? `Beitrag „${payload.titel}“ veröffentlicht` : `Beitrag „${payload.titel}“ als Entwurf bei Wix abgelegt`); break;
        }
        case 'nachricht': {
          const to = payload.ziel === 'alle' ? subs : memberSubs(subs);
          await send(to, { title: payload.titel || 'SPD Soltau', body: payload.text || '', tag: 'nachricht-' + a._id, url: url('/mitglieder/') }, 'nachricht:' + a._id, logKeys);
          await done('erledigt', `Nachricht an ${to.length} Geräte`); break;
        }
        default: await done('abgelehnt', 'Unbekannte Aktion');
      }
    } catch (e) { await done('fehler', e.message); }
  }
  if (open.length) log(`Aktionen: ${open.length} bearbeitet`);
}

// ---------- Persönlicher Eingang: eine Kopie je Empfänger, geschrieben im Namen des Mitglieds ----------
// Vorteil: nur die betreffende Person kann ihren Eingang lesen (Sammlung „Eingang“: Ersteller sehen nur eigene Elemente).
let inboxKeys = null;
async function inbox(recipients, entry) {
  if (inboxKeys === null) { try { inboxKeys = new Set((await queryAll(client, 'Eingang')).map(e => `${e.key}|${e.memberId}`)); } catch (e) { inboxKeys = new Set(); } }
  for (const memberId of recipients) {
    const k = `${entry.key}|${memberId}`; if (inboxKeys.has(k)) continue;
    if (DRY) { log(`  Eingang → ${memberId}: ${entry.title}`); continue; }
    try {
      const mc = await memberClient(memberId);
      await mc.items.insert('Eingang', { title: entry.title, key: entry.key, memberId, typ: entry.typ, body: entry.body, details: entry.details || {}, payload: JSON.stringify(entry.payload || {}), status: 'offen' });
      inboxKeys.add(k);
    } catch (e) { log(`  Eingang für ${memberId} nicht möglich: ${e.message} (API-Schlüssel braucht „Serveranmeldung für Mitglieder“)`); }
  }
}
async function inboxDone(key, text) {
  try { for (const e of (await queryAll(client, 'Eingang', q => q.eq('key', key)))) if (!DRY) await client.items.update('Eingang', { ...e, status: text }).catch(() => {}); } catch (e) { /* egal */ }
}

// ---------- Wix Events: Termin aus der App anlegen ----------
async function createWixEvent(p) {
  const zone = 'Europe/Berlin';
  // Berliner Ortszeit → UTC-Zeitpunkt (Sommer-/Winterzeit über Intl)
  const tzOffset = (tz, date) => { const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date); const g = t => +parts.find(x => x.type === t).value; return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - date.getTime(); };
  const toUtc = (dateStr, timeStr) => { const [y, m, d] = dateStr.split('-').map(Number); const [hh, mm] = (timeStr || '19:00').split(':').map(Number); const guess = new Date(Date.UTC(y, m - 1, d, hh, mm)); return new Date(guess.getTime() - tzOffset(zone, guess)); };
  const start = toUtc(p.datum, p.von || '19:00');
  let end = toUtc(p.datum, p.bis || p.von || '21:00'); if (end <= start) end = new Date(start.getTime() + 2 * 3600 * 1000);
  const typHinweis = p.typ && p.typ !== 'Öffentlich' ? `Nur für ${p.typ === 'Mitglieder' ? 'Mitglieder' : p.typ}.` : '';
  const event = {
    title: p.titel,
    dateAndTimeSettings: { startDate: start, endDate: end, timeZoneId: zone },
    location: { type: 'VENUE', name: p.ort || 'Roter Bahnhof', locationTbd: false },
    registration: { initialType: 'RSVP' },
    shortDescription: [typHinweis, p.beschreibung].filter(Boolean).join(' ').slice(0, 250),
  };
  if (DRY) { log('  (Trockenlauf) Event:', JSON.stringify(event)); return null; }
  return client.wixEventsV2.createEvent(event, { draft: false });
}

// ---------- Wix Blog: Beitrag aus der App anlegen (Text → Ricos, Titelbild in die Medienverwaltung) ----------
function textToRicos(text) {
  const nodes = []; let list = null;
  const para = t => ({ type: 'PARAGRAPH', id: '', nodes: [{ type: 'TEXT', id: '', nodes: [], textData: { text: t, decorations: [] } }], paragraphData: {} });
  for (const raw of String(text || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (/^[-*•] /.test(line)) { if (!list) { list = { type: 'BULLETED_LIST', id: '', nodes: [], bulletedListData: {} }; nodes.push(list); } list.nodes.push({ type: 'LIST_ITEM', id: '', nodes: [para(line.replace(/^[-*•] /, ''))] }); continue; }
    list = null;
    if (!line) continue;
    if (/^#{1,3} /.test(line)) nodes.push({ type: 'HEADING', id: '', nodes: [{ type: 'TEXT', id: '', nodes: [], textData: { text: line.replace(/^#+ /, ''), decorations: [] } }], headingData: { level: 2 } });
    else nodes.push(para(line));
  }
  return { nodes, metadata: { version: 1 } };
}
async function uploadCover(dataUrl, name) {
  const m = String(dataUrl || '').match(/^data:(image\/[a-z]+);base64,(.+)$/); if (!m) return null;
  const buf = Buffer.from(m[2], 'base64');
  const { uploadUrl } = await client.files.generateFileUploadUrl(m[1], { fileName: name, sizeInBytes: String(buf.length), parentFolderId: 'media-root' });
  const res = await fetch(uploadUrl + (uploadUrl.includes('?') ? '&' : '?') + 'filename=' + encodeURIComponent(name), { method: 'PUT', headers: { 'Content-Type': m[1] }, body: buf });
  if (!res.ok) throw new Error('Upload fehlgeschlagen (' + res.status + ')');
  const j = await res.json();
  const f = j.file || j;
  return f.url || f.id || f._id || null;
}
async function createBlogPost(p) {
  const draft = { title: p.titel, excerpt: p.teaser || undefined, richContent: textToRicos(p.text), categoryIds: p.kategorieId ? [p.kategorieId] : undefined, commentingEnabled: false };
  if (p.bild) {
    try { const media = await uploadCover(p.bild, `beitrag-${Date.now()}.jpg`); if (media) draft.media = { wixMedia: { image: media }, displayed: true, custom: true }; }
    catch (e) { log('  Titelbild:', e.message); }
  }
  if (DRY) { log('  (Trockenlauf) Beitrag:', draft.title); return null; }
  const { draftPost } = await client.draftPosts.createDraftPost(draft, { publish: !!p.veroeffentlichen });
  return draftPost;
}

// ---------- Inhalte: Beiträge, Termine, Erinnerungen ----------
async function contentPushes(st, subs, logKeys) {
  // Neue Blog-Beiträge (in den letzten 48 Stunden veröffentlicht)
  try {
    const res = await client.posts.queryPosts().descending('firstPublishedDate').limit(10).find();
    for (const p of res.items || []) {
      const t = new Date(p.firstPublishedDate || 0).getTime();
      if (NOW - t > 48 * H) continue;
      const key = 'post:' + p._id; if (logKeys.has(key)) continue;
      await send(byTopic(subs, 'news'), { title: 'Neu: ' + p.title, body: (p.excerpt || '').slice(0, 160), tag: key, url: url(`/aktuelles/${p.slug}/`) }, key, logKeys);
    }
  } catch (e) { log('Beiträge:', e.message); }
  // Termine: neu angelegt (48 h) und Erinnerung am Vortag ab 17 Uhr
  try {
    const res = await client.wixEventsV2.queryEvents().limit(100).find();
    const today = isoDate(NOW), tomorrow = isoDate(NOW + 24 * H), hour = hourBerlin(NOW);
    for (const e of res.items || []) {
      if (e.status === 'CANCELED') continue;
      const start = e.dateAndTimeSettings?.startDate; if (!start) continue;
      const date = isoDate(start); if (date < today) continue;
      const when = new Date(start).toLocaleString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      const ort = e.location?.name ? ' · ' + e.location.name : '';
      const typ = eventType(e.title, e.shortDescription);
      // öffentliche Termine an alle Abonnenten des Themas, interne nur an Mitglieder, die diesen Termintyp sehen dürfen
      const target = byTopic(isPublicType(typ) ? subs : whoSees(st, subs, 'termine:' + typ), 'termine');
      const created = new Date(e._createdDate || 0).getTime();
      const keyNew = 'event:' + e._id;
      if (NOW - created <= 48 * H && !logKeys.has(keyNew)) await send(target, { title: 'Neuer Termin: ' + e.title, body: when + ' Uhr' + ort, tag: keyNew, url: url('/termine/') }, keyNew, logKeys);
      const keyRem = 'erinnerung:' + e._id;
      if (date === tomorrow && hour >= 17 && !logKeys.has(keyRem)) await send(target, { title: 'Morgen: ' + e.title, body: when + ' Uhr' + ort, tag: keyRem, url: url('/mitglieder/#termine') }, keyRem, logKeys);
    }
  } catch (e) { log('Termine:', e.message); }
}

// ---------- Mitglieder-Infos: neue Umfragen, Helferlisten, Dokumente, Ratsvorbereitung ----------
async function memberPushes(st, subs, logKeys) {
  const to = key => byTopic(whoSees(st, subs, key), 'mitglieder');
  const recent = it => NOW - new Date(it._createdDate || 0).getTime() <= 48 * H;
  const sources = [
    ['Umfragen', 'umfragen', u => ({ title: 'Neue Umfrage: ' + u.frage, body: (u.beschreibung || 'Jetzt abstimmen im Mitgliederbereich.').slice(0, 140), url: url('/mitglieder/#umfragen') })],
    ['UmfragenOeffentlich', 'umfragen', u => ({ title: 'Neue Umfrage: ' + u.frage, body: 'Läuft auch öffentlich auf der Startseite – Auswertung intern.', url: url('/mitglieder/#umfragen') })],
    ['Helferlisten', 'helfer', l => ({ title: 'Helfer gesucht: ' + l.titel, body: [l.datum ? fmtDe(l.datum + 'T12:00:00').slice(0, 10) : '', l.ort, (l.schichten || []).map(s => s.zeit).join(', ')].filter(Boolean).join(' · '), url: url('/mitglieder/#termine/helferlisten') })],
    ['Dokumente', 'dokumente', d => ({ title: 'Neues Dokument: ' + d.titel, body: [d.kategorie, d.beschreibung].filter(Boolean).join(' – ').slice(0, 140), url: url('/mitglieder/#dokumente') })],
    ['Ratsvorbereitung', 'rat', r => ({ title: 'Ratsvorbereitung: ' + (r.titel || r.gremium || 'Sitzung'), body: `${r.gremium || ''} am ${r.sitzung ? fmtDe(r.sitzung + 'T12:00:00').slice(0, 10) : ''} – ${(r.tops || []).length} Tagesordnungspunkte mit Einordnung`, url: url('/mitglieder/#rat') })],
  ];
  const PREFIX = { umfragen: 'umfrage', helfer: 'helfer', dokumente: 'dokument', rat: 'rat' };
  for (const [col, vis, make] of sources) {
    try {
      for (const it of (await queryAll(client, col, q => q.descending('_createdDate'))).filter(recent)) {
        const key = `${PREFIX[vis]}:${it._id}`; if (logKeys.has(key)) continue;
        await send(to(vis), { ...make(it), tag: key }, key, logKeys);
      }
    } catch (e) { log(`${col}:`, e.message); }
  }
}

// ---------- Vorstand: Registrierungen, Buchungen, Anfragen, Zu-/Absagen, Geburtstage ----------
async function boardPushes(subs, pending, routing, logKeys) {
  for (const m of pending) {
    const key = 'registrierung:' + m.memberId;
    const entry = { key, typ: 'registrierung', title: 'Neue Registrierungsanfrage', body: `${m.name} (${m.email}) möchte in den Mitgliederbereich.`, details: { Name: m.name, 'E-Mail': m.email, Registriert: fmtDe(m.registriert) }, payload: { memberId: m.memberId, name: m.name } };
    await inbox(routing.registrierung, entry);
    if (logKeys.has(key)) continue;
    await send(byMembers(subs, routing.registrierung), {
      title: entry.title, body: entry.body + ' Freischalten oder ablehnen im Eingang.', tag: key, url: url(INBOX),
      data: { typ: 'registrierung', id: key, memberId: m.memberId, name: m.name, details: entry.details },
    }, key, logKeys);
  }
  // Kontakt- und Mitgliedsanfragen (Formulare der Website)
  try {
    const open = await queryAll(client, 'Anfragen', q => q.eq('status', 'offen').descending('_createdDate'));
    for (const a of open) {
      const key = 'anfrage:' + a._id;
      if (NOW - new Date(a._createdDate).getTime() > 14 * 24 * H) continue;
      const art = a.typ === 'mitglied' ? 'Mitgliedsanfrage' : 'Kontaktanfrage';
      const text = a.nachricht || a.interesse || '';
      const details = { Art: art, Thema: a.thema || '', Name: a.name || '', 'E-Mail': a.email || '', Wohnort: a.ort || '', Interesse: a.interesse || '', Nachricht: a.nachricht || '' };
      await inbox(routing.anfrage, { key, typ: 'anfrage', title: art + (a.thema ? ': ' + a.thema : ''), body: `${a.name || '?'}: ${text}`.slice(0, 180), details, payload: { anfrageId: a._id } });
      if (logKeys.has(key)) continue;
      await send(byMembers(subs, routing.anfrage), {
        title: art + (a.thema ? ': ' + a.thema : ''), body: `${a.name || '?'}: ${text}`.slice(0, 180), tag: key, url: url(INBOX),
        data: { typ: 'anfrage', id: key, anfrageId: a._id, details },
      }, key, logKeys);
    }
  } catch (e) { log('Anfragen:', e.message); }
  // Geburtstage und Jubiläen (aus den freiwilligen Profilangaben), morgens ab 8 Uhr
  try {
    if (hourBerlin(NOW) >= 8) {
      const today = isoDate(NOW), year = today.slice(0, 4), md = today.slice(5);
      const profiles = await queryAll(client, 'Profile');
      for (const p of profiles) {
        const ev = [];
        if (p.geburtstagSichtbar && String(p.geburtstag || '').endsWith(md)) ev.push(`${p.name} hat heute Geburtstag 🎂`);
        const jahre = p.eintritt ? +year - +p.eintritt : 0;
        if ([10, 25, 40, 50, 60, 70].includes(jahre) && md === '01-01') ev.push(`${p.name} ist ${jahre} Jahre in der SPD 🌹`);
        for (const text of ev) {
          const key = `geburtstag:${p.memberId}:${year}:${text.includes('Jahre') ? 'jub' : 'gb'}`; if (logKeys.has(key)) continue;
          await send(byMembers(subs, routing.geburtstag), { title: text.includes('Jahre') ? 'Jubiläum' : 'Geburtstag', body: text, tag: key, url: url('/mitglieder/#mitglieder') }, key, logKeys);
        }
      }
    }
  } catch (e) { log('Geburtstage:', e.message); }
  try {
    const open = await queryAll(client, 'Buchungen', q => q.eq('status', 'offen').descending('_createdDate'));
    for (const b of open) {
      const key = 'buchung:' + b._id;
      if (NOW - new Date(b._createdDate).getTime() > 14 * 24 * H) continue;
      const zeit = [b.datum, b.von && b.bis ? `${b.von}–${b.bis} Uhr` : ''].filter(Boolean).join(' ');
      await inbox(routing.buchung, { key, typ: 'buchung', title: 'Buchungsanfrage Roter Bahnhof', body: `${b.name || '?'}${b.organisation ? ' (' + b.organisation + ')' : ''}: ${zeit} – ${b.zweck || ''}`, details: { Name: b.name || '', 'Verein/Gruppe': b.organisation || '', Wann: zeit, Anlass: b.zweck || '', Personen: b.personen || '', 'E-Mail': b.email || '', Telefon: b.telefon || '', Nachricht: b.nachricht || '' }, payload: { buchungId: b._id } });
      if (logKeys.has(key)) continue;
      await send(byMembers(subs, routing.buchung), {
        title: 'Buchungsanfrage Roter Bahnhof', body: `${b.name || '?'}${b.organisation ? ' (' + b.organisation + ')' : ''}: ${zeit} – ${b.zweck || ''}`, tag: key, url: url(INBOX),
        data: { typ: 'buchung', id: key, buchungId: b._id, details: { Name: b.name || '', 'Verein/Gruppe': b.organisation || '', Wann: zeit, Anlass: b.zweck || '', Personen: b.personen || '', 'E-Mail': b.email || '', Telefon: b.telefon || '', Nachricht: b.nachricht || '' } },
      }, key, logKeys);
    }
  } catch (e) { log('Buchungen:', e.message); }
  try {
    const recent = await queryAll(client, 'Zusagen', q => q.descending('_updatedDate'));
    for (const z of recent) {
      const t = new Date(z._updatedDate || z._createdDate).getTime(); if (NOW - t > 24 * H) continue;
      const key = 'zusage:' + z._id + ':' + new Date(t).toISOString().slice(0, 16); if (logKeys.has(key)) continue;
      const what = z.status === 'zusage' ? 'kommt zu' : 'sagt ab für';
      await send(byMembers(subs, routing.zusage).filter(s => s.memberId !== z.memberId), { title: `${z.name} ${what}: ${z.eventTitel}`, body: (z.eventDatum ? fmtDe(z.eventDatum + 'T12:00:00').slice(0, 10) : '') + (z.grund ? ' · Grund: ' + z.grund : ''), tag: 'zusage-' + z.eventId, url: url('/mitglieder/#termine') }, key, logKeys);
    }
  } catch (e) { log('Zusagen:', e.message); }
}

// ---------- Ablauf ----------
(async () => {
  log('Push-Dienst startet' + (DRY ? ' (Trockenlauf)' : ''));
  const subs = await loadSubscriptions();
  if (TEST) {
    await send(subs, { title: 'Test: SPD Soltau App', body: 'Wenn du das liest, funktionieren die Benachrichtigungen. 🌹', tag: 'test', url: url('/mitglieder/') }, 'test:' + NOW, null);
    log('fertig', stats); return;
  }
  const logKeys = await loadLog();
  const { approved, pending } = await syncMembers(subs);
  const st = await loadSettings(approved);
  await syncBoardRole(st, approved);
  await moderate(st);
  await processActions(st, subs, logKeys);
  await contentPushes(st, subs, logKeys);
  await memberPushes(st, subs, logKeys);
  await boardPushes(subs, pending, st.routing, logKeys);
  log('fertig', stats);
})().catch(e => { console.error('Push-Dienst abgebrochen:', e.message, e.details ? JSON.stringify(e.details).slice(0, 300) : ''); process.exit(1); });
