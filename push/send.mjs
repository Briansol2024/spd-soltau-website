// Push-Dienst der SPD-Soltau-App. Läuft regelmäßig (z. B. alle 5 Minuten) mit dem Wix-Admin-API-Schlüssel und
//   1. gleicht die Wix-Mitglieder mit der Sammlung AppMitglieder ab (Name, Rollen, „Push aktiv“),
//   2. führt Aktionen des Vorstands aus (Registrierung freischalten/ablehnen, Buchung annehmen/ablehnen, Nachricht an alle),
//   3. schickt Push-Nachrichten: neue Beiträge, neue Termine, Erinnerung am Vortag, Registrierungs- und Buchungsanfragen,
//      Zu-/Absagen – Vorstands-Themen gehen an die in „Wer wird benachrichtigt?“ eingetragenen Personen,
//   4. verwaltet die Ratsarbeit der Fraktion: verteilt den Fraktionsschlüssel an die Geräte der Fraktionsmitglieder, räumt Einträge
//      Unberechtigter weg und erinnert an Aufgaben (neu zugeteilt, Frist in zwei Tagen).
// Jede Nachricht wird in PushLog vermerkt, damit nichts doppelt verschickt wird.
//
//   node push/send.mjs            normaler Lauf
//   node push/send.mjs --test     Testnachricht an alle aktiven Geräte
//   node push/send.mjs --dry      nichts senden, nur zeigen, was gesendet würde
import webpush from 'web-push';
import { adminClient, memberClient, queryAll, env, isoDate, hourBerlin, fmtDe, log } from './lib.mjs';
import { evaluateSettings, canSee } from '../src/lib/rights.mjs';
import { eventType, isPublicType } from '../src/lib/wix.mjs';
import * as FB from '../src/lib/feedback.mjs';
import { bereichVon, ERINNERUNG_TAGE, neuerFraktionsschluessel, importAes, decryptJson, encryptJson, verpacken } from '../src/lib/rat.mjs';
import { stammtischConfig, istStammtisch, stammtischFrage } from '../src/lib/stammtisch.mjs';
import { mail, mailAn, mailBereit, newsletterHtml, textToHtml, postMailHtml } from './mail.mjs';
import { randomBytes } from 'node:crypto';

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
const INBOX = '/mitglieder/#vorstand/anliegen';

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
  return { approved, pending, board, emails };
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
  log(`  Gruppen: Vorstand ${st.groups.vorstand.size}, Rat ${st.groups.rat.size}, Fraktion ${st.groups.fraktion.size}`);
  const eingeschraenkt = Object.entries(st.sicht).filter(([, v]) => v.modus !== 'alle').map(([k, v]) => `${k} → Vorstand${[...v.gruppen].map(g => ' + ' + g).join('')}${v.ids.size ? ' + ' + v.ids.size + ' Person(en)' : ''}`);
  if (eingeschraenkt.length) log('  Sichtbarkeit eingeschränkt: ' + eingeschraenkt.join('; '));
  return st;
}
const hasRight = (st, memberId, right) => !!st.rights[right]?.has(memberId);

// Inhalte, die nur mit Recht angelegt werden dürfen: Einträge Unberechtigter werden entfernt
async function moderate(st) {
  const rules = [['Umfragen', 'umfragen'], ['UmfragenOeffentlich', 'umfragen'], ['Helferlisten', 'helfer'], ['Dokumente', 'dokumente'], ['Ratsvorbereitung', 'rat'], ['Versammlungen', 'versammlung'], ['Planungen', 'planung'], ['Pressekontakte', 'presse']];
  for (const [col, right] of rules) {
    try {
      const list = await queryAll(client, col);
      for (const it of list) {
        if (!it._owner || hasRight(st, it._owner, right) || st.board.has(it._owner)) continue; // ohne _owner = vom Dienst angelegt
        log(`  ${col}: „${it.titel || it.frage || it._id}“ von ${it.von || it._owner} ohne Recht „${right}“ – entfernt`);
        if (!DRY) await client.items.remove(col, it._id).catch(() => {});
      }
    } catch (e) { log(`Moderation ${col}:`, e.message); }
  }
}


// ---------- Aktionen des Vorstands ----------
async function processActions(st, subs, logKeys) {
  const open = await queryAll(client, 'Aktionen', q => q.eq('status', 'offen'));
  const NEEDS = { mitglied_freigeben: 'freigaben', mitglied_ablehnen: 'freigaben', buchung_annehmen: 'freigaben', buchung_ablehnen: 'freigaben', anfrage_erledigt: 'freigaben', nachricht: 'nachrichten', termin_erstellen: 'termine', termin_aendern: 'termine', termin_absagen: 'termine', beitrag_erstellen: 'beitraege', newsletter: 'newsletter', presse: 'presse' };
  for (const a of open) {
    let payload = {}; try { payload = JSON.parse(a.payload || '{}'); } catch (e) { /* leer */ }
    const done = async (status, ergebnis) => { log(`  Aktion ${a.typ}: ${ergebnis}`); if (!DRY) await client.items.update('Aktionen', { ...a, status, ergebnis, erledigtAm: new Date().toISOString() }).catch(e => log('Aktion update', e.message)); };
    const need = NEEDS[a.typ];
    if (a.typ !== 'post' && (!need || !hasRight(st, a._owner, need))) { await done('abgelehnt', `Absender hat das Recht „${need || '?'}“ nicht`); continue; }
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
        case 'post': {
          if (!payload.an || !payload.text) throw new Error('Empfänger oder Text fehlt');
          const r = await postZustellen(a, payload, subs, logKeys);
          await done('erledigt', `Nachricht an ${payload.anName || payload.an} zugestellt${r.mail ? ' (auch per E-Mail)' : ''}`); break;
        }
        case 'termin_aendern': {
          await updateWixEvent(payload);
          await done('erledigt', `Termin „${payload.titel || payload.eventId}“ bei Wix Events geändert`); break;
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
        case 'newsletter': {
          if (!mailBereit()) { log('  Newsletter wartet: E-Mail-Versand nicht eingerichtet (SMTP in .env)'); continue; }
          const r = await newsletterSenden(payload, a, st);
          await done('erledigt', `Newsletter „${payload.betreff}“ an ${r.ok} Adressen${r.fehler ? `, ${r.fehler} Fehler` : ''}`); break;
        }
        case 'presse': {
          if (!mailBereit()) { log('  Pressemitteilung wartet: E-Mail-Versand nicht eingerichtet (SMTP in .env)'); continue; }
          const r = await presseSenden(payload, a);
          await done('erledigt', `Pressemitteilung an ${r.ok} Kontakte${r.fehler ? `, ${r.fehler} Fehler` : ''}`); break;
        }
        default: await done('abgelehnt', 'Unbekannte Aktion');
      }
    } catch (e) { await done('fehler', e.message); }
  }
  if (open.length) log(`Aktionen: ${open.length} bearbeitet`);
}

// ---------- Vorgänge: Anliegen, Buchungen, Registrierungen für den Vorstand – ein Eintrag je Vorgang, Inhalt mit dem
// Vorstandsschlüssel verschlüsselt (Sammlung `Vorgaenge`, vom Dienst angelegt; lesen/bearbeiten alle mit Schlüssel). ----------
let vorgangKeys = null, schluesselVersucht = false;
async function inbox(recipients, entry) {
  if (!KEYS.vorstand) { if (!schluesselVersucht) { schluesselVersucht = true; try { await schluesselLaden(); } catch (e) { /* unten */ } } if (!KEYS.vorstand) return; }
  if (vorgangKeys === null) { try { vorgangKeys = new Set((await queryAll(client, 'Vorgaenge')).map(e => e.key)); } catch (e) { vorgangKeys = new Set(); } }
  if (vorgangKeys.has(entry.key)) return;
  if (DRY) { log(`  Vorgang: ${entry.title}`); vorgangKeys.add(entry.key); return; }
  try {
    await client.items.insert('Vorgaenge', { title: 'Vorgang', typ: entry.typ, key: entry.key, status: 'offen', daten: await encryptJson(KEYS.vorstand.aes, { title: entry.title, body: entry.body, details: entry.details || {}, payload: entry.payload || {} }) });
    vorgangKeys.add(entry.key);
  } catch (e) { log(`  Vorgang nicht angelegt: ${e.message}`); }
}
async function inboxDone(key, text) {
  try { for (const e of (await queryAll(client, 'Vorgaenge', q => q.eq('key', key)))) if (!DRY && !/erledigt|freigeschaltet|abgelehnt|bestätigt/.test(e.status || '')) await client.items.update('Vorgaenge', { ...e, status: text, erledigtAm: new Date().toISOString() }).catch(() => {}); } catch (e) { /* egal */ }
}
// Erinnerung: Vorgänge, die seit 7 Tagen offen sind – einmal an die zuständige Person (sonst an die Zuständigen laut „Wer wird benachrichtigt?“)
async function vorgangErinnerungen(st, subs, logKeys) {
  try {
    const offen = (await queryAll(client, 'Vorgaenge')).filter(v => /^(offen|in Arbeit)$/.test(v.status || 'offen') && !v.erinnertAm && NOW - new Date(v._createdDate).getTime() > 7 * 24 * H);
    for (const v of offen) {
      const an = v.zustaendig ? [v.zustaendig] : (st.routing[v.typ] || [...st.board]);
      const key = 'vorgang-erinnerung:' + v._id; if (logKeys.has(key)) continue;
      await send(byMembers(subs, an), { title: 'Wartet seit einer Woche', body: `Ein${v.typ === 'buchung' ? 'e Buchungsanfrage' : v.typ === 'registrierung' ? 'e Registrierung' : ' Anliegen'} ist noch offen${v.zustaendigName ? ' – zuständig: ' + v.zustaendigName : ''}.`, tag: key, url: url('/mitglieder/#vorstand/anliegen') }, key, logKeys);
      if (!DRY) await client.items.update('Vorgaenge', { ...v, erinnertAm: new Date().toISOString() }).catch(() => {});
    }
  } catch (e) { log('Vorgänge (Erinnerung):', e.message); }
}

// ---------- Wix Events: Termine aus der App anlegen und ändern ----------
const EV_ZONE = 'Europe/Berlin';
// Berliner Ortszeit → UTC-Zeitpunkt (Sommer-/Winterzeit über Intl)
const tzOffset = (tz, date) => { const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date); const g = t => +parts.find(x => x.type === t).value; return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - date.getTime(); };
const toUtc = (dateStr, timeStr) => { const [y, m, d] = dateStr.split('-').map(Number); const [hh, mm] = (timeStr || '19:00').split(':').map(Number); const guess = new Date(Date.UTC(y, m - 1, d, hh, mm)); return new Date(guess.getTime() - tzOffset(EV_ZONE, guess)); };
const berlinDatum = d => new Intl.DateTimeFormat('sv-SE', { timeZone: EV_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const berlinZeit = d => new Intl.DateTimeFormat('de-DE', { timeZone: EV_ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
// Damit „Für wen?“ auch wirkt: die Art wird aus Titel und Kurztext gelesen – nur wenn der Titel allein nicht reicht, kommt ein Hinweis davor
const TYP_HINWEIS = { Mitglieder: 'Nur für Mitglieder.', Fraktion: 'Nur für die Fraktion.', Vorstand: 'Nur für den Vorstand.', Rat: 'Öffentliche Ratssitzung.' };
const typHinweis = (titel, typ) => !typ || eventType(titel, '') === typ ? '' : (TYP_HINWEIS[typ] || '');
async function createWixEvent(p) {
  const zone = EV_ZONE;
  const start = toUtc(p.datum, p.von || '19:00');
  let end = toUtc(p.datum, p.bis || p.von || '21:00'); if (end <= start) end = new Date(start.getTime() + 2 * 3600 * 1000);
  const hinweis = typHinweis(p.titel, p.typ);
  const event = {
    title: p.titel,
    dateAndTimeSettings: { startDate: start, endDate: end, timeZoneId: zone },
    location: { type: 'VENUE', name: p.ort || 'Roter Bahnhof', locationTbd: false },
    registration: { initialType: 'RSVP' },
    shortDescription: [hinweis, p.beschreibung].filter(Boolean).join(' ').slice(0, 250),
  };
  if (DRY) { log('  (Trockenlauf) Event:', JSON.stringify(event)); return null; }
  return client.wixEventsV2.createEvent(event, { draft: false });
}

// Termin ändern: leere Felder bleiben, wie sie bei Wix stehen (z. B. Ende leer → Dauer bleibt gleich)
async function updateWixEvent(p) {
  if (!p.eventId) throw new Error('eventId fehlt');
  const alt = await client.wixEventsV2.getEvent(p.eventId);
  const zeiten = alt?.dateAndTimeSettings || {};
  const altStart = zeiten.startDate ? new Date(zeiten.startDate) : null;
  const altEnde = zeiten.endDate ? new Date(zeiten.endDate) : null;
  const dauer = altStart && altEnde && altEnde > altStart ? altEnde - altStart : 2 * 3600 * 1000;
  const datum = p.datum || (altStart ? berlinDatum(altStart) : '');
  if (!datum) throw new Error('Datum fehlt');
  const start = toUtc(datum, p.von || (altStart ? berlinZeit(altStart) : '19:00'));
  let ende = p.bis ? toUtc(datum, p.bis) : new Date(start.getTime() + dauer);
  if (ende <= start) ende = new Date(start.getTime() + 2 * 3600 * 1000);
  const titel = (p.titel || alt?.title || '').trim();
  const event = {
    title: titel,
    dateAndTimeSettings: { startDate: start, endDate: ende, timeZoneId: EV_ZONE },
    location: { type: 'VENUE', name: p.ort || alt?.location?.name || 'Roter Bahnhof', locationTbd: false },
    shortDescription: [typHinweis(titel, p.typ), p.beschreibung].filter(Boolean).join(' ').slice(0, 250),
  };
  if (DRY) { log('  (Trockenlauf) Termin ändern:', p.eventId, JSON.stringify(event)); return null; }
  return client.wixEventsV2.updateEvent(p.eventId, { event });
}

// ---------- Post: Nachricht von Mitglied zu Mitglied zustellen ----------
// Die Kopie beim Empfänger wird in seinem Namen angelegt – so kann nur er sie lesen.
async function postZustellen(a, p, subs, logKeys) {
  const von = a._owner || '';
  const key = 'post:' + (p.nachrichtId || a._id);
  if (!DRY) {
    const mc = await memberClient(p.an);
    await mc.items.insert('Postfach', {
      richtung: 'ein', partnerId: von, partnerName: p.vonName || 'Mitglied', text: p.text,
      gelesen: false, zugestellt: true, nachrichtId: p.nachrichtId || '', gesendetAm: p.gesendetAm || new Date().toISOString(),
      title: `Von ${p.vonName || 'Mitglied'}`,
    });
    // die Kopie beim Absender als zugestellt markieren
    for (const r of await queryAll(client, 'Postfach', q => q.eq('nachrichtId', p.nachrichtId || ''))) {
      if (r.richtung === 'aus' && !r.zugestellt) await client.items.update('Postfach', { ...r, zugestellt: true }).catch(() => {});
    }
  }
  await send(byMembers(subs, [p.an]), { title: `Nachricht von ${p.vonName || 'einem Mitglied'}`, body: String(p.text).slice(0, 140), tag: key, url: url('/mitglieder/#post/' + von) }, key, logKeys);
  // auf Wunsch zusätzlich per E-Mail
  let perMail = false;
  try {
    const profil = (await queryAll(client, 'Profile', q => q.eq('memberId', p.an)))[0];
    if (profil?.postMail && mailBereit()) {
      const m = await client.members.getMember(p.an, { fieldsets: ['FULL'] }).catch(() => null);
      const adresse = m?.loginEmail || m?.member?.loginEmail || '';
      if (adresse) {
        const link = url('/mitglieder/#post/' + von);
        const wer = p.vonName || 'Ein Mitglied';
        const text = `${wer} hat dir im Mitgliederbereich eine Nachricht geschrieben:\n\n${p.text}\n\nAntworten kannst du in der App: ${link}\n\nAuf diese E-Mail kann niemand antworten. Du bekommst sie, weil du im Posteingang „auch per E-Mail“ angehakt hast.`;
        if (!DRY) await mail({ to: adresse, subject: `Nachricht von ${wer}`, text, html: postMailHtml({ von: wer, text: p.text, link }) });
        perMail = true;
      }
    }
  } catch (e) { log('  Post-E-Mail:', e.message); }
  return { mail: perMail };
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
      const details = { Art: art, Thema: a.thema || '', Name: a.name || '', 'E-Mail': a.email || '', Wohnort: a.ort || '', Interesse: a.interesse || '', Nachricht: a.nachricht || '', 'Darf veröffentlicht werden': a.oeffentlichOk === true || a.oeffentlichOk === 'ja' ? 'ja' : '' };
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

// ---------- Ratsarbeit: Schlüssel verteilen, aufräumen, erinnern ----------
// Siehe src/lib/rat.mjs. Maßgeblich ist immer `_owner` (von Wix gesetzt), nie ein selbst eingetragenes Feld.
// Zwei Gruppenschlüssel in RatGeheim: `fraktion` (Ratsarbeit) und `vorstand` (Vorgänge/Anliegen). Wer den Vorstandsschlüssel bekommt:
// Vorstand, Verwalter und alle mit dem Recht „freigaben“.
const KEYS = {};
async function schluesselLaden() {
  const rows = await queryAll(client, 'RatGeheim');
  for (const gruppe of ['fraktion', 'vorstand']) {
    let row = rows.find(r => (r.gruppe || 'fraktion') === gruppe);
    if (!row) {
      if (DRY) { log(`Schlüssel „${gruppe}“ würde angelegt`); continue; }
      row = await client.items.insert('RatGeheim', { title: `${gruppe === 'fraktion' ? 'Fraktions' : 'Vorstands'}schlüssel (nicht löschen – sonst sind die verschlüsselten Inhalte unlesbar)`, gruppe, schluessel: neuerFraktionsschluessel() });
      log(`Schlüssel „${gruppe}“ angelegt (Sammlung RatGeheim – bitte nie löschen)`);
    } else if (!row.gruppe && !DRY) await client.items.update('RatGeheim', { ...row, gruppe }).catch(() => {});
    KEYS[gruppe] = { roh: row.schluessel, aes: await importAes(row.schluessel) };
  }
}
const vorstandKreis = st => new Set([...st.board, ...st.rights.verwaltung, ...st.rights.freigaben]);
async function ratSync(st, subs, logKeys) {
  const fraktion = st.groups.fraktion, vorstand = vorstandKreis(st);
  try { await schluesselLaden(); } catch (e) { log('Schlüssel:', e.message); return; }
  if (!KEYS.fraktion || !KEYS.vorstand) return;
  const aes = KEYS.fraktion.aes;
  // 1) Geräteschlüssel: je Gruppe verpacken, wenn das Mitglied dazugehört; Gerät entfernen, wenn es zu keiner Gruppe mehr gehört
  try {
    const rows = await queryAll(client, 'RatSchluessel');
    let ok = 0, weg = 0;
    for (const r of rows) {
      const darf = { fraktion: fraktion.has(r._owner), vorstand: vorstand.has(r._owner) };
      if (!darf.fraktion && !darf.vorstand) { weg++; if (!DRY) await client.items.remove('RatSchluessel', r._id).catch(() => {}); continue; }
      const soll = { verpackt: darf.fraktion, verpacktVorstand: darf.vorstand };
      const aenderung = {};
      try {
        const pub = JSON.parse(r.pub || '{}');
        if (soll.verpackt && !r.verpackt) aenderung.verpackt = await verpacken(KEYS.fraktion.roh, pub);
        if (!soll.verpackt && r.verpackt) aenderung.verpackt = '';
        if (soll.verpacktVorstand && !r.verpacktVorstand) aenderung.verpacktVorstand = await verpacken(KEYS.vorstand.roh, pub);
        if (!soll.verpacktVorstand && r.verpacktVorstand) aenderung.verpacktVorstand = '';
        if (!Object.keys(aenderung).length && r.status === 'aktiv') continue;
        if (!DRY) await client.items.update('RatSchluessel', { ...r, ...aenderung, status: 'aktiv' });
        ok++;
      } catch (e) { log(`  Geräteschlüssel von ${r.name || r._owner} unbrauchbar: ${e.message}`); if (!DRY) await client.items.update('RatSchluessel', { ...r, status: 'fehler' }).catch(() => {}); }
    }
    log(`Schlüssel: ${rows.length} Gerät(e), ${ok} neu/aktualisiert, ${weg} entfernt · Fraktion ${fraktion.size}, Vorstandskreis ${vorstand.size}`);
  } catch (e) { log('Schlüssel (Geräte):', e.message); }
  // 2) Einträge, die nicht von Fraktionsmitgliedern stammen, entfernen
  let aufgaben = [], dokumente = [];
  try {
    aufgaben = await queryAll(client, 'RatAufgaben'); dokumente = await queryAll(client, 'RatDokumente');
    for (const [col, list] of [['RatAufgaben', aufgaben], ['RatDokumente', dokumente]]) {
      for (const it of list.filter(x => !fraktion.has(x._owner))) {
        log(`  ${col}: Eintrag von ${it.vonName || it._owner} (nicht in der Fraktion) entfernt`);
        if (!DRY) await client.items.remove(col, it._id).catch(() => {});
      }
    }
    const teile = await queryAll(client, 'RatDateiTeile', q => q.descending('_createdDate'));
    const dateien = new Set(dokumente.map(d => d.dateiId).filter(Boolean));
    for (const t of teile) {
      // Teile Unberechtigter sofort weg; verwaiste Teile (Dokument gelöscht oder Upload abgebrochen) nach einem Tag
      const fremd = !fraktion.has(t._owner), verwaist = !dateien.has(t.dateiId) && NOW - new Date(t._createdDate).getTime() > 24 * H;
      if (fremd || verwaist) { if (!DRY) await client.items.remove('RatDateiTeile', t._id).catch(() => {}); }
    }
  } catch (e) { log('Ratsarbeit (Aufräumen):', e.message); }
  // 3) Erinnerungen: neue Aufgabe für dich (48 h), Frist in zwei Tagen; neue Dokumente an die Fraktion
  const lesen = async it => { try { return await decryptJson(aes, it.daten); } catch (e) { return {}; } };
  const today = isoDate(NOW), bald = isoDate(NOW + ERINNERUNG_TAGE * 24 * H);
  const fristText = f => f ? new Date(f + 'T12:00:00').toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit' }) : '';
  for (const t of aufgaben.filter(x => fraktion.has(x._owner) && x.status !== 'erledigt')) {
    const wer = (t.wer || []).filter(id => fraktion.has(id));
    if (!wer.length) continue;
    const keyNeu = 'rataufgabe:' + t._id;
    const link = url('/mitglieder/#ratsarbeit/t-' + t._id);
    if (NOW - new Date(t._createdDate).getTime() <= 48 * H && !logKeys.has(keyNeu)) {
      const d = await lesen(t);
      const an = byMembers(subs, wer.filter(id => id !== t._owner));
      if (an.length) await send(an, { title: 'Neue Aufgabe für dich', body: `${d.titel || 'Aufgabe'} · ${bereichVon(t.b).name}${t.frist ? ' · bis ' + fristText(t.frist) : ''} (von ${t.vonName || '?'})`, tag: keyNeu, url: link }, keyNeu, logKeys);
      else { logKeys.add(keyNeu); await logKey(keyNeu, { titel: 'ohne Empfänger' }); }
    }
    if (t.frist && t.frist <= bald && t.frist >= today && !t.erinnert) {
      const keyRem = 'raterinnerung:' + t._id; if (logKeys.has(keyRem)) continue;
      const d = await lesen(t);
      await send(byMembers(subs, wer), { title: t.frist === today ? 'Heute fällig' : 'Bald fällig: ' + fristText(t.frist), body: `${d.titel || 'Aufgabe'} · ${bereichVon(t.b).name}`, tag: keyRem, url: link }, keyRem, logKeys);
      if (!DRY) await client.items.update('RatAufgaben', { ...t, erinnert: true }).catch(e => log('  erinnert-Markierung:', e.message));
    }
  }
  for (const d of dokumente.filter(x => fraktion.has(x._owner) && NOW - new Date(x._createdDate).getTime() <= 48 * H)) {
    const key = 'ratdokument:' + d._id; if (logKeys.has(key)) continue;
    const inhalt = await lesen(d);
    await send(byTopic(byMembers(subs, [...fraktion].filter(id => id !== d._owner)), 'mitglieder'), { title: 'Neu in der Ratsarbeit: ' + (inhalt.titel || d.kat || 'Dokument'), body: `${d.kat || 'Dokument'} · ${bereichVon(d.b).name} · von ${d.vonName || '?'}`, tag: key, url: url('/mitglieder/#ratsarbeit/b-' + d.b) }, key, logKeys);
  }
}

// ---------- Newsletter, Presse, Abonnenten (E-Mail) ----------
const SITE_URL = SITE || 'https://www.spd-soltau.de';
async function mitgliederMails() {
  const out = [];
  for (let offset = 0; ; offset += 100) {
    const res = await client.members.listMembers({ fieldsets: ['FULL'], paging: { limit: 100, offset } });
    for (const m of res.members || []) if (m.status === 'APPROVED' && m.loginEmail) out.push({ email: m.loginEmail, name: [m.contact?.firstName, m.contact?.lastName].filter(Boolean).join(' ') });
    if ((res.members || []).length < 100) break;
  }
  return out;
}
async function abonnentenAktiv() { return (await queryAll(client, 'Abonnenten', q => q.eq('status', 'aktiv'))).filter(a => a.email); }
const dedupe = list => { const seen = new Set(); return list.filter(e => { const k = String(e.email).toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }); };
async function newsletterSenden(p, a, st) {
  const posts = (await client.posts.queryPosts().descending('firstPublishedDate').limit(30).find().catch(() => ({ items: [] }))).items || [];
  const beitraege = (p.beitraege || []).map(slug => posts.find(x => x.slug === slug)).filter(Boolean).map(x => ({ slug: x.slug, title: x.title, teaser: x.excerpt || '' }));
  const evs = (await client.wixEventsV2.queryEvents().limit(100).find().catch(() => ({ items: [] }))).items || [];
  const termine = (p.termine || []).map(id => evs.find(e => e._id === id)).filter(Boolean).map(e => ({ id: e._id, title: e.title, typ: eventType(e.title, e.shortDescription), wann: new Date(e.dateAndTimeSettings?.startDate || 0).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit' }), zeit: new Date(e.dateAndTimeSettings?.startDate || 0).toLocaleTimeString('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit' }) + ' Uhr', ort: e.location?.name || '' }));
  const text = ({ oeffentlich }) => { const ts = termine.filter(t => !oeffentlich || isPublicType(t.typ)); return `${p.betreff}\n\n${p.vorwort || ''}\n\n${beitraege.length ? 'AKTUELLES\n' + beitraege.map(n => `${n.title}\n${n.teaser}\n${SITE_URL}/aktuelles/${n.slug}/`).join('\n\n') + '\n\n' : ''}${ts.length ? 'TERMINE\n' + ts.map(t => `${t.wann} ${t.title}, ${t.zeit}${t.ort ? ' · ' + t.ort : ''}`).join('\n') + '\n\n' : ''}SPD Ortsverein Soltau · Am Bahnhof 1t · 29614 Soltau`; };
  const empfaenger = [];
  if (p.ziel === 'mitglieder' || p.ziel === 'beide') for (const m of await mitgliederMails()) empfaenger.push({ ...m, oeffentlich: false });
  if (p.ziel === 'abonnenten' || p.ziel === 'beide') for (const ab of await abonnentenAktiv()) empfaenger.push({ email: ab.email, token: ab.token, oeffentlich: true });
  const liste = dedupe(empfaenger);
  const r = await mailAn(liste, async e => {
    const abmeldeUrl = e.token ? `${SITE_URL}/newsletter/?abmelden=${e.token}` : '';
    return { to: e.email, subject: p.betreff, text: text(e) + (abmeldeUrl ? `\nAbmelden: ${abmeldeUrl}` : ''), html: newsletterHtml({ betreff: p.betreff, vorwort: p.vorwort, beitraege, termine: termine.filter(t => !e.oeffentlich || isPublicType(t.typ)), siteUrl: SITE_URL, abmeldeUrl }), listUnsubscribe: abmeldeUrl || undefined };
  });
  if (!DRY) await client.items.insert('Newsletter', { title: p.betreff, betreff: p.betreff, ziel: p.ziel, empfaenger: r.ok, text: text({ oeffentlich: p.ziel !== 'mitglieder' }), gesendetAm: new Date().toISOString(), von: a.von || '' }).catch(e => log('Archiv:', e.message));
  return r;
}
async function presseSenden(p, a) {
  const posts = (await client.posts.queryPosts().descending('firstPublishedDate').limit(30).find().catch(() => ({ items: [] }))).items || [];
  const post = posts.find(x => x.slug === p.slug);
  const link = post ? `${SITE_URL}/aktuelles/${post.slug}/` : SITE_URL;
  const body = `${p.anschreiben || ''}\n\n${post?.title || ''}\n\n${post?.excerpt || ''}\n\nVollständiger Text und Bild: ${link}\n\nSPD Ortsverein Soltau · Am Bahnhof 1t · 29614 Soltau`;
  const r = await mailAn(dedupe(p.empfaenger || []), async e => ({ to: e.email, subject: p.betreff, text: body, html: textToHtml(body) }));
  if (!DRY) await client.items.insert('Newsletter', { title: p.betreff, betreff: p.betreff, ziel: 'presse', empfaenger: r.ok, text: body, gesendetAm: new Date().toISOString(), von: a.von || '' }).catch(e => log('Archiv:', e.message));
  return r;
}
// Abonnenten: Anmeldung (Formular „Nichts verpassen“) → Bestätigungsmail (Double-Opt-in) → aktiv; Abmeldung über Link
async function abonnenten() {
  try {
    const rows = await queryAll(client, 'Abonnenten', q => q.descending('_createdDate'));
    const aktive = rows.filter(r => r.status === 'aktiv');
    for (const r of rows) {
      if (r.typ === 'anmeldung' && (!r.status || r.status === 'neu') && r.email) {
        const schonAktiv = aktive.some(a => a.email.toLowerCase() === r.email.toLowerCase());
        const token = randomBytes(12).toString('hex');
        if (!DRY) await client.items.update('Abonnenten', { ...r, token, status: schonAktiv ? 'doppelt' : (mailBereit() ? 'bestaetigung-gesendet' : 'wartet-smtp') });
        if (!schonAktiv && mailBereit() && !DRY) {
          const link = `${SITE_URL}/newsletter/?bestaetigen=${token}`;
          try { await mail({ to: r.email, subject: 'Bitte bestätigen: Newsletter der SPD Soltau', text: `Moin!\n\nSie haben sich für den Newsletter der SPD Soltau angemeldet. Bitte bestätigen Sie das mit einem Klick:\n${link}\n\nWenn Sie das nicht waren, ignorieren Sie diese E-Mail einfach.\n\nSPD Ortsverein Soltau · Am Bahnhof 1t · 29614 Soltau` }); }
          catch (e) { log('  Bestätigungsmail:', e.message); }
        }
      }
      if (r.typ === 'bestaetigung' && r.token && r.status !== 'verarbeitet') {
        const an = rows.find(x => x.typ === 'anmeldung' && x.token === r.token);
        if (an && !DRY) { await client.items.update('Abonnenten', { ...an, status: 'aktiv', bestaetigtAm: new Date().toISOString() }); await client.items.update('Abonnenten', { ...r, status: 'verarbeitet' }); log(`  Newsletter: ${an.email} bestätigt`); }
      }
      if (r.typ === 'abmeldung' && r.token && r.status !== 'verarbeitet') {
        const an = rows.find(x => x.typ === 'anmeldung' && x.token === r.token);
        if (an && !DRY) { await client.items.update('Abonnenten', { ...an, status: 'abgemeldet', abgemeldetAm: new Date().toISOString() }); await client.items.update('Abonnenten', { ...r, status: 'verarbeitet' }); log(`  Newsletter: ${an.email} abgemeldet`); }
      }
    }
    // Zähler für die App (Sammlung Newsletter, Eintrag „status“)
    const n = rows.filter(r => r.status === 'aktiv').length;
    const statusRow = (await queryAll(client, 'Newsletter', q => q.eq('ziel', 'status')))[0];
    const daten = { title: 'status', betreff: '', ziel: 'status', empfaenger: n, text: JSON.stringify({ aktiv: n, smtp: mailBereit() }), gesendetAm: new Date().toISOString() };
    if (!DRY) { if (statusRow) await client.items.update('Newsletter', { ...statusRow, ...daten }); else await client.items.insert('Newsletter', daten); }
  } catch (e) { log('Abonnenten:', e.message); }
}

// ---------- Stammtisch: Umfrage „Wo treffen wir uns?“ je Termin, nur für Zusagen; schließt am Tag des Treffens ----------
async function stammtisch(st) {
  try {
    const cfg = stammtischConfig(st.snap);
    const res = await client.wixEventsV2.queryEvents().limit(100).find();
    const today = isoDate(NOW);
    const polls = await queryAll(client, 'Umfragen', q => q.eq('nurZusagen', true));
    for (const e of res.items || []) {
      if (e.status === 'CANCELED' || !e.dateAndTimeSettings?.startDate) continue;
      const date = isoDate(e.dateAndTimeSettings.startDate);
      if (date < today || NOW + 45 * 24 * H < new Date(e.dateAndTimeSettings.startDate).getTime()) continue;
      if (!istStammtisch({ title: e.title }, cfg) || polls.some(p => p.eventId === e._id)) continue;
      const wann = new Date(e.dateAndTimeSettings.startDate).toLocaleDateString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'long', day: '2-digit', month: '2-digit' });
      log(`  Stammtisch-Umfrage für „${e.title}“ am ${date}`);
      if (!DRY) await client.items.insert('Umfragen', { title: stammtischFrage(wann), frage: stammtischFrage(wann), beschreibung: 'Die Umfrage sehen nur die, die zugesagt haben. Sie schließt am Tag des Treffens.', optionen: cfg.lokale, mehrfach: false, offen: true, endetAm: date, eventId: e._id, nurZusagen: true, von: 'App' });
    }
    for (const p of polls.filter(p => p.offen !== false && p.endetAm && p.endetAm < today)) if (!DRY) await client.items.update('Umfragen', { ...p, offen: false }).catch(() => {});
  } catch (e) { log('Stammtisch:', e.message); }
}

// ---------- Erinnerungen: Anträge/Ideen an den Fraktionsvorsitz, Jahresplan-Aufgaben, Helfer am Vortag ----------
async function weitereErinnerungen(st, subs, logKeys) {
  const heute = isoDate(NOW), morgen = isoDate(NOW + 24 * H), bald = isoDate(NOW + 2 * 24 * H);
  // Neue Anträge (48 h) → „Wer prüft Anträge“ (Thema antrag), ohne den Verfasser
  try {
    if (KEYS.fraktion) for (const a of (await queryAll(client, 'RatAntraege')).filter(x => NOW - new Date(x._createdDate).getTime() <= 48 * H)) {
      const key = 'antrag-neu:' + a._id; if (logKeys.has(key)) continue;
      let d = {}; try { d = await decryptJson(KEYS.fraktion.aes, a.daten); } catch (e) { /* ohne Titel */ }
      await send(byMembers(subs, (st.routing.antrag || []).filter(id => id !== a._owner)), { title: 'Neuer Antrag zur Prüfung', body: `${d.titel || 'Antrag'} – von ${a.vonName || '?'}`, tag: key, url: url('/mitglieder/#ratsarbeit/a-' + a._id) }, key, logKeys);
    }
  } catch (e) { log('Anträge:', e.message); }
  try {
    for (const i of (await queryAll(client, 'Ideen')).filter(x => NOW - new Date(x._createdDate).getTime() <= 48 * H)) {
      const key = 'idee-neu:' + i._id; if (logKeys.has(key)) continue;
      await send(byMembers(subs, (st.routing.antrag || []).filter(id => id !== i._owner)), { title: 'Neue Idee von ' + (i.vonName || 'einem Mitglied'), body: i.titel || '', tag: key, url: url('/mitglieder/#ideen') }, key, logKeys);
    }
  } catch (e) { log('Ideen:', e.message); }
  // Jahresplan: Aufgaben, die in zwei Tagen fällig sind (oder überfällig, einmal)
  try {
    for (const p of (await queryAll(client, 'Planungen')).filter(x => !x.vorlage)) {
      let aufgaben = []; try { aufgaben = JSON.parse(p.aufgaben || '[]'); } catch (e) { continue; }
      for (const a of aufgaben.filter(x => x.wer && !x.erledigt && x.faellig && x.faellig <= bald)) {
        const key = `planung:${p._id}:${a.id}:${a.faellig}`; if (logKeys.has(key)) continue;
        await send(byMembers(subs, [a.wer]), { title: a.faellig < heute ? 'Überfällig: ' + a.titel : 'Bald fällig: ' + a.titel, body: `${p.titel} · bis ${fmtDe(a.faellig + 'T12:00:00').slice(0, 10)}`, tag: key, url: url('/mitglieder/#planung/p-' + p._id) }, key, logKeys);
      }
    }
  } catch (e) { log('Jahresplan:', e.message); }
  // Helferlisten: am Vortag ab 17 Uhr an alle Eingetragenen
  try {
    if (hourBerlin(NOW) >= 17) {
      const listen = (await queryAll(client, 'Helferlisten')).filter(l => l.datum === morgen);
      if (listen.length) {
        const helfer = await queryAll(client, 'Helfer');
        for (const l of listen) for (const h of helfer.filter(x => x.listeId === l._id && x.memberId)) {
          const key = `helfer-erinnerung:${l._id}:${h.memberId}`; if (logKeys.has(key)) continue;
          const schicht = (l.schichten || []).find(s => s.id === h.schichtId);
          await send(byMembers(subs, [h.memberId]), { title: 'Morgen hilfst du mit: ' + l.titel, body: [schicht?.zeit, l.ort].filter(Boolean).join(' · ') || 'Danke, dass du dabei bist!', tag: key, url: url('/mitglieder/#termine/hl-' + l._id) }, key, logKeys);
        }
      }
    }
  } catch (e) { log('Helfer-Erinnerung:', e.message); }
}

// ---------- Mitfahren: Gesuch an alle (die den Termin sehen), Angebot an die Suchenden, Einsteigen an den Fahrer ----------
async function mitfahren(st, subs, logKeys) {
  const recent = it => NOW - new Date(it._createdDate || 0).getTime() <= 48 * H;
  const vorname = n => String(n || 'Jemand').split(' ')[0];
  const plaetzeText = n => `${n} ${n === 1 ? 'Platz' : 'Plätze'}`;
  try {
    const fahrten = await queryAll(client, 'Fahrgemeinschaften');
    const neu = fahrten.filter(recent);
    const mitf = (await queryAll(client, 'Mitfahrten')).filter(m => m.fahrtId);
    if (!neu.length && !mitf.some(recent)) return;
    // Termine (Typ für „Wer sieht was?“, Uhrzeit) – Einträge tragen nur Titel und Datum
    const events = new Map();
    try { for (const e of (await client.wixEventsV2.queryEvents().limit(100).find()).items || []) events.set(e._id, { typ: eventType(e.title, e.shortDescription), start: e.dateAndTimeSettings?.startDate }); } catch (e) { log('Mitfahren – Termine:', e.message); }
    const wann = f => { const ev = events.get(f.eventId); const d = ev?.start ? new Date(ev.start) : f.eventDatum ? new Date(f.eventDatum + 'T12:00:00') : null; if (!d) return ''; const s = d.toLocaleString('de-DE', { timeZone: 'Europe/Berlin', weekday: 'short', day: '2-digit', month: '2-digit', ...(ev?.start ? { hour: '2-digit', minute: '2-digit' } : {}) }); return ev?.start ? s + ' Uhr' : s; };
    const ziel = f => url('/mitglieder/#termine/ev-' + f.eventId);
    for (const f of neu) {
      const key = `mitfahrt-${f.typ === 'biete' ? 'angebot' : 'gesuch'}:${f._id}`; if (logKeys.has(key)) continue;
      const typ = events.get(f.eventId)?.typ || 'Öffentlich';
      if (f.typ === 'suche') {
        // alle Mitglieder mit Thema „Mitglieder-Infos“, die diesen Termintyp sehen – außer dem Suchenden selbst
        const to = byTopic(whoSees(st, subs, 'termine:' + typ), 'mitglieder').filter(s => s.memberId !== f.memberId);
        await send(to, { title: `🙋 ${vorname(f.name)} sucht eine Mitfahrt ab ${f.ab || '?'}`, body: `${f.eventTitel || 'Termin'} · ${wann(f)}. Du fährst auch? Trag ein Angebot ein – dann kann ${vorname(f.name)} einsteigen.`, tag: key, url: ziel(f) }, key, logKeys);
      } else {
        // Angebot: an alle, die zu diesem Termin eine Mitfahrt suchen (ohne den Fahrer)
        const suchende = [...new Set(fahrten.filter(x => x.eventId === f.eventId && x.typ === 'suche' && x.memberId && x.memberId !== f.memberId).map(x => x.memberId))];
        if (!suchende.length) { logKeys.add(key); await logKey(key, { empfaenger: 0, titel: 'Angebot ohne Suchende' }); continue; }
        await send(byMembers(subs, suchende), { title: `🚗 ${f.name} fährt ab ${f.ab || '?'} – ${plaetzeText(Math.max(1, +f.plaetze || 1))} frei`, body: `${f.eventTitel || 'Termin'} · ${wann(f)}${f.zeit ? ' · Abfahrt ' + f.zeit + ' Uhr' : ''}. Jetzt einsteigen: „Ich fahre mit“.`, tag: key, url: ziel(f) }, key, logKeys);
      }
    }
    // Einsteigen: der Fahrer erfährt, wer mitfährt und wie viele Plätze noch frei sind
    for (const m of mitf.filter(recent)) {
      const key = 'mitfahrt-dabei:' + m._id; if (logKeys.has(key)) continue;
      const f = fahrten.find(x => x._id === m.fahrtId);
      if (!f || !f.memberId || f.memberId === m.memberId) { logKeys.add(key); await logKey(key, { empfaenger: 0, titel: 'Mitfahrt ohne Angebot' }); continue; }
      const frei = Math.max(0, Math.max(1, +f.plaetze || 1) - mitf.filter(x => x.fahrtId === f._id).length);
      await send(byMembers(subs, [f.memberId]), { title: `${m.name || 'Jemand'} fährt bei dir mit`, body: `${f.eventTitel || 'Termin'} · ${wann(f)} · ${frei ? 'noch ' + plaetzeText(frei) + ' frei' : 'alle Plätze belegt'}`, tag: key, url: ziel(f) }, key, logKeys);
    }
  } catch (e) { log('Mitfahren:', e.message); }
}

// ---------- Wünsche & Ideen zur App: per E-Mail an den Betreuer der Website (dazu ein Push an ihn), Status → zugestellt ----------
const FEEDBACK_AN = (env.FEEDBACK_EMAIL || FB.FEEDBACK_EMAIL).toLowerCase();
async function feedback(subs, approved, emails, logKeys) {
  try {
    const offen = (await queryAll(client, 'Feedback', q => q.descending('_createdDate'))).filter(f => f.status !== 'zugestellt');
    if (!offen.length) return;
    const betreuer = approved.find(a => (emails.get(a.memberId) || '') === FEEDBACK_AN);
    for (const f of offen) {
      const kopf = `${FB.label(FB.WAS, f.was)} · ${FB.label(FB.WO, f.wo)}${f.bereich ? ' · ' + f.bereich : ''}`;
      const keyPush = 'feedback-push:' + f._id;
      if (betreuer && !logKeys.has(keyPush)) await send(byMembers(subs, [betreuer.memberId]), { title: `${f.name || 'Mitglied'}: ${FB.label(FB.WAS, f.was)}`, body: (f.text || '').slice(0, 160), tag: keyPush, url: url('/mitglieder/#feedback') }, keyPush, logKeys);
      if (!mailBereit()) { log(`  Feedback ${f._id}: E-Mail wartet auf den SMTP-Zugang`); continue; }
      const keyMail = 'feedback-mail:' + f._id; if (logKeys.has(keyMail)) continue;
      const betreff = `[SPD-App] ${kopf} – von ${f.name || 'Mitglied'}`;
      const text = `Moin!

Neuer Eintrag unter „Wünsche & Ideen zur App“ – von ${f.name || 'Mitglied'}${f.email ? ` (${f.email})` : ''}, ${fmtDe(f._createdDate || NOW)} Uhr.

Wo:       ${FB.label(FB.WO, f.wo)}
Was:      ${FB.label(FB.WAS, f.was)}
Bereich:  ${f.bereich || '–'}
Wichtig:  ${FB.label(FB.PRIO, f.prio)}

${f.text || ''}

${f.geraet ? 'Gerät: ' + f.geraet + '\n' : ''}${f.seite ? 'Seite in der App: ' + f.seite + '\n' : ''}
— Automatisch aus dem Mitgliederbereich. Antworten geht direkt an ${f.name || 'das Mitglied'}.`;
      if (DRY) { log(`  Feedback ${f._id}: „${betreff}“ → ${FEEDBACK_AN} (Trockenlauf)`); continue; }
      await mail({ to: FEEDBACK_AN, subject: betreff, text, replyTo: f.email || undefined });
      logKeys.add(keyMail); await logKey(keyMail, { empfaenger: 1, titel: betreff });
      await client.items.update('Feedback', { ...f, status: 'zugestellt' }).catch(e => log('  Feedback-Status', e.message));
      log(`  Feedback ${f._id}: E-Mail an ${FEEDBACK_AN}`);
    }
  } catch (e) { log('Feedback:', e.message); }
}

// ---------- GitHub: Workflows auf Bestellung starten (Overlay-Agent, Website-Bau) ----------
async function workflowStarten(datei, inputs = {}) {
  const token = env.GITHUB_TOKEN, repo = env.GITHUB_REPOSITORY || 'Briansol2024/spd-soltau-website';
  if (!token) throw new Error('kein GITHUB_TOKEN (läuft nur auf GitHub Actions)');
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${datei}/dispatches`, { method: 'POST', headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }, body: JSON.stringify({ ref: 'main', inputs }) });
  if (res.status !== 204) throw new Error(`${datei}: ${res.status} ${(await res.text()).slice(0, 120)}`);
}
// ---------- Neuer Zusagen-Kalender: die Datei entsteht beim Seitenbau – also gleich einen anstoßen ----------
async function kalenderBauen(logKeys) {
  try {
    const neue = (await queryAll(client, 'Kalenderlinks')).filter(k => k.schluessel && NOW - new Date(k._createdDate || 0).getTime() < 24 * H);
    const offen = neue.filter(k => !logKeys.has('kalender-bau:' + k._id));
    if (!offen.length) return;
    // Liegt die Datei schon auf dem Server? Dann reicht der Vermerk.
    const fertig = [];
    for (const k of offen) {
      const r = await fetch(url(`/assets/kalender/${k.schluessel}.ics`), { method: 'HEAD' }).catch(() => null);
      if (r && r.ok) fertig.push(k);
    }
    for (const k of fertig) { logKeys.add('kalender-bau:' + k._id); await logKey('kalender-bau:' + k._id, { empfaenger: 0, titel: `Kalender von ${k.name || k.memberId} liegt bereit` }); }
    const warten = offen.filter(k => !fertig.includes(k));
    if (!warten.length) return;
    if (DRY) { log(`  Zusagen-Kalender: ${warten.length} neu – würde die Website neu bauen`); return; }
    await workflowStarten('deploy.yml').catch(e => log('  Kalender-Bau:', e.message));
    log(`  Zusagen-Kalender: ${warten.length} neu – Website wird gebaut`);
  } catch (e) { log('Zusagen-Kalender:', e.message); }
}

// ---------- Meilensteine: Website neu bauen, sobald ein Zeitpunkt überschritten ist (Start der Website, Tag nach der Stichwahl) ----------
// Der halbstündliche Zeitplan-Bau kommt bei GitHub oft Stunden zu spät – hier läuft es zuverlässig alle 5 Minuten.
let letzterBau = null; // Zeitpunkt des letzten Website-Baus (einmal je Lauf abgefragt)
async function deployWenn(grund, zeitpunkt) {
  const token = env.GITHUB_TOKEN, repo = env.GITHUB_REPOSITORY || 'Briansol2024/spd-soltau-website'; if (!token || !zeitpunkt || NOW < zeitpunkt) return false;
  try {
    if (letzterBau === null) { const r = await (await fetch(`https://api.github.com/repos/${repo}/actions/workflows/deploy.yml/runs?per_page=1`, { headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' } })).json(); letzterBau = Date.parse(r.workflow_runs?.[0]?.created_at || 0); }
    if (letzterBau >= zeitpunkt) return false;
    if (DRY) { log(`  ${grund}: würde die Website neu bauen`); return true; }
    await workflowStarten('deploy.yml'); letzterBau = NOW; log(`  ${grund} – Website wird neu gebaut`); return true;
  } catch (e) { log('  Neu bauen:', e.message); return false; }
}
async function meilensteine() {
  for (const [name, t] of [['Start der Website', env.LAUNCH_AT], ['Tag nach der Stichwahl', '2026-09-28T00:05:00+02:00']]) { const z = Date.parse(t || ''); if (z && NOW - z < 6 * 3600 * 1000 && await deployWenn(`Meilenstein „${name}“ erreicht`, z)) break; }
}
// ---------- Mitreden (Website): Zähler und Ergebnisse verdichten, neue Fragen melden, Website bei Änderungen neu bauen ----------
async function mitreden(subs, routing, logKeys) {
  try {
    const heute = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
    // „Betrifft mich auch“ / „Interessiert mich auch“ → Zähler
    const rohe = await queryAll(client, 'Unterstuetzung'); const n = {}; for (const r of rohe) { const k = (r.typ || '') + ':' + r.zielId; n[k] = (n[k] || 0) + 1; }
    for (const [col, typ] of [['AnliegenOeffentlich', 'anliegen'], ['FragenOeffentlich', 'frage']]) for (const it of await queryAll(client, col)) { const z = n[typ + ':' + it._id] || 0; if ((Number(it.zaehler) || 0) !== z && !DRY) await client.items.update(col, { ...it, zaehler: z }); }
    // Abstimmungen: Stimmen zählen, abgelaufene schließen
    let geaendert = 0;
    for (const u of await queryAll(client, 'UmfragenOeffentlich', q => q.eq('mitreden', true))) {
      const alle = await queryAll(client, 'Stimmen', q => q.eq('umfrageId', u._id));
      // Je Gerät zählt nur die letzte Stimme – wer mehrfach abstimmt, verändert das Ergebnis also nicht
      const proGeraet = new Map();
      const st = alle.filter(x => { const g = (x.geraet || '').trim(); if (!g) return true; const alt = proGeraet.get(g); if (alt && new Date(alt._createdDate) >= new Date(x._createdDate)) return false; proGeraet.set(g, x); return true; })
        .filter(x => { const g = (x.geraet || '').trim(); return !g || proGeraet.get(g) === x; });
      const counts = (u.optionen || []).map(() => 0); for (const s of st) for (const a of (s.auswahl || [])) { const i = +a; if (counts[i] !== undefined) counts[i]++; }
      const erg = JSON.stringify(counts); const zu = u.offen && u.endetAm && u.endetAm < heute;
      if (erg !== (u.ergebnis || '[]') || (Number(u.stimmen) || 0) !== st.length || zu) { if (!DRY) await client.items.update('UmfragenOeffentlich', { ...u, ergebnis: erg, stimmen: st.length, offen: zu ? false : u.offen }); if (zu) geaendert++; }
    }
    // neue Fragen → Vorstand (wie Anfragen)
    for (const f of await queryAll(client, 'Fragen', q => q.eq('status', 'offen'))) {
      const key = 'frage:' + f._id; if (logKeys.has(key) || NOW - new Date(f._createdDate).getTime() > 14 * 24 * H) continue;
      await send(byMembers(subs, routing.anfrage), { title: 'Neue Frage von der Website', body: String(f.frage || '').slice(0, 160), tag: key, url: url('/mitglieder/#vorstand/mitreden-fragen') }, key, logKeys);
    }
    // Inhalt geändert (Vorstand → Mitreden) oder Abstimmung geschlossen → Website neu bauen
    const [start] = await queryAll(client, 'Startseite', q => q.limit(1));
    let stand = Date.parse(start?.stand || 0) || 0; if (geaendert) stand = Math.max(stand, NOW);
    if (stand) await deployWenn('Mitreden: Inhalt geändert', stand);
    // Ergebnisse alle 30 Minuten auf die Website (Zähler ändern sich laufend – nicht bei jedem Klick bauen)
  } catch (e) { log('Mitreden:', e.message); }
}
// ---------- Overlay-Agent: wartende Aufträge starten, fertige melden ----------
// Verweise material:<id> im Manifest durch die Wix-Adresse ersetzen; gibt einen Wartetext zurück, solange Fotos fehlen
async function fotosNachtragen(a) {
  let m; try { m = JSON.parse(a.manifest || '{}'); } catch (e) { return ''; }
  const refs = new Set(); const feld = /^url|^bilder$/;
  for (const c of m.clips || []) for (const [k, v] of Object.entries(c.q || {})) if (feld.test(k)) for (const x of String(v).split('|')) if (/^material:/.test(x.trim())) refs.add(x.trim().slice(9));
  if (!refs.size) return '';
  const material = await queryAll(client, 'FilmMaterial', q => q.in('_id', [...refs]));
  const fertig = id => { const x = material.find(y => y._id === id); return !!x && (x.status === 'fertig' || !!x.url); };
  const fehlen = [...refs].filter(id => !fertig(id));
  if (fehlen.length) return `Wartet auf ${fehlen.length === 1 ? 'ein Foto' : fehlen.length + ' Fotos'} – ${fehlen.length === 1 ? 'es wird' : 'sie werden'} gerade abgelegt (meist unter 5 Minuten), danach startet der Render-Roboter von selbst.`;
  // Fotos mit öffentlicher Adresse (ältere Uploads) direkt eintragen; interne Fotos (material:…) holt sich der Agent selbst aus den Dateiteilen
  for (const c of m.clips || []) for (const [k, v] of Object.entries(c.q || {})) if (feld.test(k)) c.q[k] = String(v).split('|').map(x => { const id = /^material:(.+)$/.exec(x.trim())?.[1]; const mat = id && material.find(y => y._id === id); return mat && mat.url ? mat.url : x; }).filter(Boolean).join('|');
  delete m.wartetAuf; a.manifest = JSON.stringify(m);
  if (!DRY) await client.items.update('Auftraege', { ...a, manifest: a.manifest, schritt: 'Fotos da – Render-Roboter startet.' }).catch(() => {});
  return '';
}
async function auftraege(subs, approved, emails, logKeys) {
  try {
    const liste = await queryAll(client, 'Auftraege', q => q.ne('status', 'erledigt'));
    for (const a of liste) {
      const wer = approved.find(m => m.memberId === a.memberId);
      if (a.status === 'wartet') {
        if (!wer || !TESTER_MAILS.includes((emails.get(a.memberId) || '').toLowerCase())) { log(`  Auftrag ${a._id}: nicht freigegeben (${emails.get(a.memberId) || 'unbekannt'})`); if (!DRY) await client.items.update('Auftraege', { ...a, status: 'fehler', fehler: 'Nicht freigegeben' }).catch(() => {}); continue; }
        // Fotos, die beim Bestellen noch nicht bei Wix lagen (material:<id>): Adresse nachtragen, sonst weiter warten
        const warten = await fotosNachtragen(a); if (warten) { if (!DRY) await client.items.update('Auftraege', { ...a, schritt: warten }).catch(() => {}); log(`  Auftrag ${a._id}: ${warten}`); continue; }
        if (DRY) { log(`  Auftrag ${a._id}: würde Overlay-Agent starten (Trockenlauf)`); continue; }
        try { await workflowStarten('overlays.yml', { auftrag: a._id }); await client.items.update('Auftraege', { ...a, status: 'gestartet', gestartetAm: new Date().toISOString(), fortschritt: 3, schritt: 'Agent gestartet – der Rechner in der Cloud fährt hoch (etwa 1 Minute).' }); log(`  Auftrag ${a._id}: Overlay-Agent gestartet`); }
        catch (e) { log('  Auftrag starten:', e.message); await client.items.update('Auftraege', { ...a, status: 'fehler', fehler: 'Agent konnte nicht gestartet werden: ' + e.message.slice(0, 160) }).catch(() => {}); }
        continue;
      }
      // hängen geblieben (Agent nach 45 Minuten nicht fertig)
      if (['gestartet', 'laeuft'].includes(a.status) && a.gestartetAm && NOW - new Date(a.gestartetAm).getTime() > 45 * 60 * 1000) {
        await client.items.update('Auftraege', { ...a, status: 'fehler', fehler: 'Der Agent hat nicht geantwortet – bitte noch einmal bestellen.' }).catch(() => {}); continue;
      }
      if (['fertig', 'fehler'].includes(a.status) && !a.benachrichtigt && wer) {
        const key = 'auftrag:' + a._id + ':' + a.status;
        const mb = a.groesse ? ` (${Math.round(a.groesse / 1048576 * 10) / 10} MB)` : '';
        await send(byMembers(subs, [wer.memberId]), a.status === 'fertig'
          ? { title: 'Overlays fertig – zum Download bereit', body: `${a.titel || 'Overlay-Clips'}${mb} – ${a.dateien || ''} Dateien. Antippen zum Herunterladen.`, tag: key, url: /^https?:/.test(a.url || '') ? a.url : url('/mitglieder/#filmdreh' + (a.projektId && a.projektId !== 'werkstatt' ? '/p-' + a.projektId : a.projektId === 'werkstatt' ? '/werkstatt' : '')) }
          : { title: 'Overlays: das hat nicht geklappt', body: (a.fehler || 'Unbekannter Fehler').slice(0, 160), tag: key, url: url('/mitglieder/#rat') }, key, logKeys);
        if (!DRY) await client.items.update('Auftraege', { ...a, benachrichtigt: true }).catch(() => {});
      }
    }
  } catch (e) { log('Aufträge:', e.message); }
}
// ---------- Filmdreh: hochgeladene Dateiteile zusammensetzen → Medienmanager; fertige Overlay-Aufträge ins Projektmaterial ----------
async function filmUploads(subs, logKeys) {
  try {
    const offen = await queryAll(client, 'FilmMaterial', q => q.eq('status', 'wartet'));
    for (const m of offen) {
      const teile = (await queryAll(client, 'FilmTeile', q => q.eq('materialId', m._id))).sort((a, b) => a.nr - b.nr);
      if (teile.length < (m.teile || 1)) { if (NOW - new Date(m._createdDate).getTime() > 40 * 60 * 1000) { if (!DRY) await client.items.update('FilmMaterial', { ...m, status: 'fehler', fehler: 'Upload unvollständig – bitte noch einmal hochladen.' }); } continue; }
      if (DRY) { log(`  Film: würde ${m.name} (${teile.length} Teile) ablegen`); continue; }
      // Fotos bleiben in den Dateiteilen (nur für angemeldete Mitglieder lesbar) – kein öffentlicher Link im Medienmanager
      if (/^image\//.test(m.mime || '')) {
        await client.items.update('FilmMaterial', { ...m, status: 'fertig', art: 'bild', url: '', fehler: '' });
        log(`  Film: ${m.name} bleibt intern (${teile.length} Teile)`);
        if (m.memberId) await send(byMembers(subs, [m.memberId]), { title: 'Foto bereit: ' + (m.titel || m.name), body: 'Liegt jetzt im Filmdreh – nur für Mitglieder sichtbar.', tag: 'film:' + m._id, url: url('/mitglieder/#filmdreh' + (m.projektId ? '/p-' + m.projektId : '')) }, 'film:' + m._id, logKeys);
        continue;
      }
      try {
        const buf = Buffer.concat(teile.map(t => Buffer.from(t.daten || '', 'base64')));
        const name = (m.name || 'datei').replace(/[^\wäöüÄÖÜß.-]+/g, '-');
        const { uploadUrl } = await client.files.generateFileUploadUrl(m.mime || 'application/octet-stream', { fileName: name, sizeInBytes: String(buf.length), parentFolderId: 'media-root' });
        const res = await fetch(uploadUrl + (uploadUrl.includes('?') ? '&' : '?') + 'filename=' + encodeURIComponent(name), { method: 'PUT', headers: { 'Content-Type': m.mime || 'application/octet-stream' }, body: buf });
        if (!res.ok) throw new Error('Upload ' + res.status);
        const j = await res.json(); const f = j.file || j; const dateiUrl = f.url || '';
        await client.items.update('FilmMaterial', { ...m, status: dateiUrl ? 'fertig' : 'fehler', url: dateiUrl, fehler: dateiUrl ? '' : 'Keine Adresse von Wix' });
        const ids = teile.map(t => t._id); for (let i = 0; i < ids.length; i += 100) await client.items.bulkRemove('FilmTeile', ids.slice(i, i + 100)).catch(() => {});
        log(`  Film: ${name} abgelegt (${Math.round(buf.length / 1024)} KB)`);
        if (m.memberId) await send(byMembers(subs, [m.memberId]), { title: 'Datei bereit: ' + (m.titel || name), body: 'Liegt jetzt im Filmdreh-Projekt.', tag: 'film:' + m._id, url: url('/mitglieder/#filmdreh' + (m.projektId ? '/p-' + m.projektId : '')) }, 'film:' + m._id, logKeys);
      } catch (e) { log('  Film-Upload:', e.message); await client.items.update('FilmMaterial', { ...m, status: 'fehler', fehler: e.message.slice(0, 160) }).catch(() => {}); }
    }
    // Dateiteile ohne Material (gelöscht) aufräumen – Fotos und Clips liegen dauerhaft in den Teilen
    try {
      const material = new Set((await queryAll(client, 'FilmMaterial')).map(m => m._id));
      const verwaist = (await queryAll(client, 'FilmTeile', q => q.fields('materialId'))).filter(t => t.materialId && !material.has(t.materialId)).map(t => t._id);
      for (let i = 0; i < verwaist.length && !DRY; i += 100) await client.items.bulkRemove('FilmTeile', verwaist.slice(i, i + 100)).catch(() => {});
      if (verwaist.length) log(`  Film: ${verwaist.length} verwaiste Dateiteile entfernt`);
    } catch (e) { log('  Film-Aufräumen:', e.message); }
    // Fertige Overlay-Aufträge eines Projekts als Material ablegen (dann sehen beide im Team den Download)
    for (const a of await queryAll(client, 'Auftraege', q => q.eq('status', 'fertig'))) {
      if (!a.projektId || a.materialAngelegt || !a.url || /^material:/.test(a.url)) continue;
      if (DRY) continue;
      await client.items.insert('FilmMaterial', { title: a.titel || 'Overlays', projektId: a.projektId, art: 'overlays', titel: a.titel || 'Overlays', url: a.url, name: a.dateiName || 'overlays.zip', mime: /\.mp4$/i.test(a.dateiName || '') ? 'video/mp4' : /\.mov$/i.test(a.dateiName || '') ? 'video/quicktime' : 'application/zip', groesse: a.groesse || 0, status: 'fertig', von: a.von || '', memberId: a.memberId || '', auftragId: a._id }).catch(e => log('  Film-Material:', e.message));
      await client.items.update('Auftraege', { ...a, materialAngelegt: true }).catch(() => {});
    }
  } catch (e) { log('Filmdreh:', e.message); }
}
// ---------- Ratsberichte: freigegebene Sitzungen als öffentliche Kopie (nur öffentlich sagbare Felder) – danach Website neu bauen ----------
const TESTER_MAILS = ['weber.soltau@gmail.com', 'birhat.kacar@web.de']; // dürfen den Overlay-Agenten bestellen (Filmteam)
async function ratsberichte() {
  try {
    const sitzungen = await queryAll(client, 'Ratsvorbereitung');
    const berichte = await queryAll(client, 'Ratsberichte');
    let geaendert = false;
    for (const r of sitzungen) {
      const alt = berichte.find(b => b.sitzungId === r._id);
      if (!r.veroeffentlicht) { if (alt) { if (!DRY) await client.items.remove('Ratsberichte', alt._id); geaendert = true; log(`  Ratsbericht entfernt: ${r.gremium} ${r.sitzung}`); } continue; }
      const tops = (r.tops || []).map((t, i) => ({ nr: t.nr || String(i + 1), titel: t.titel || '', position: t.position || 'offen', einordnung: t.einordnung || '', beschluss: t.beschluss || '', abstimmung: t.abstimmung || '', ja: t.ja ?? '', nein: t.nein ?? '', enth: t.enth ?? '', ergebnis: t.ergebnis || '' }));
      const neu = { title: `${r.gremium || 'Sitzung'} ${r.sitzung || ''}`, sitzungId: r._id, gremium: r.gremium || '', datum: r.sitzung || '', zeit: r.zeit || '', ort: r.ort || '', titel: r.titel || '', bereich: r.b || '', text: r.berichtText || '', tops: JSON.stringify(tops), veroeffentlichtAm: r.veroeffentlichtAm || r._updatedDate || '' };
      const gleich = alt && ['gremium', 'datum', 'zeit', 'ort', 'titel', 'bereich', 'text', 'tops'].every(k => String(alt[k] ?? '') === String(neu[k] ?? ''));
      if (gleich) continue;
      if (!DRY) { if (alt) await client.items.update('Ratsberichte', { ...alt, ...neu }); else await client.items.insert('Ratsberichte', neu); }
      geaendert = true; log(`  Ratsbericht ${alt ? 'aktualisiert' : 'angelegt'}: ${neu.title}`);
    }
    if (geaendert && !DRY) { try { await workflowStarten('deploy.yml'); log('  Website-Bau gestartet (Ratsbericht)'); } catch (e) { log('  Website-Bau:', e.message); } }
  } catch (e) { log('Ratsberichte:', e.message); }
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
  const { approved, pending, emails } = await syncMembers(subs);
  // ---- Statistik: Rohdaten (Seitenaufrufe) zu Tageswerten verdichten und löschen – so bleibt nichts Personenbezogenes liegen ----
async function statistik() {
  let roh = [];
  try { roh = await queryAll(client, 'Seitenaufrufe', q => q.ascending('_createdDate'), 500); } catch (e) { log('Statistik: Rohdaten nicht lesbar', e.message); return; }
  if (!roh.length) return;
  const tagVon = r => (/^\d{4}-\d{2}-\d{2}$/.test(r.tag || '') ? r.tag : isoDate(r._createdDate));
  const tage = new Map();
  for (const r of roh) {
    const t = tagVon(r);
    if (!tage.has(t)) { const cur = (await client.items.query('Statistik').eq('tag', t).find()).items[0]; tage.set(t, cur ? { ...cur, d: JSON.parse(cur.daten || '{}') } : { tag: t, title: t, d: {} }); }
    const doc = tage.get(t), d = doc.d;
    d.seiten ||= {}; d.quellen ||= {}; d.geraete ||= {}; d.sprachen ||= {}; d.ereignisse ||= {}; d.lade ||= { summe: 0, n: 0 }; if (!Array.isArray(d.stunden) || d.stunden.length !== 24) d.stunden = Array(24).fill(0);
    const inc = (o, k, n = 1) => { if (k) o[k] = (o[k] || 0) + n; };
    if (r.typ === 'ereignis') { inc(d.ereignisse, String(r.name || '?').slice(0, 60)); continue; }
    d.aufrufe = (d.aufrufe || 0) + 1;
    if (r.eintritt) { d.besuche = (d.besuche || 0) + 1; inc(d.quellen, String(r.quelle || r.ref || 'direkt').slice(0, 60)); }
    if (r.app) d.app = (d.app || 0) + 1;
    inc(d.seiten, String(r.pfad || '/').slice(0, 120)); inc(d.geraete, r.geraet || 'pc'); inc(d.sprachen, (r.sprache || '?').slice(0, 5));
    if (Number.isInteger(r.stunde) && r.stunde >= 0 && r.stunde < 24) d.stunden[r.stunde]++;
    if (r.ladezeit > 0 && r.ladezeit < 60000) { d.lade.summe += r.ladezeit; d.lade.n++; }
  }
  if (DRY) { log(`Statistik: ${roh.length} Rohdaten → ${tage.size} Tag(e) (nicht gespeichert)`); return; }
  for (const doc of tage.values()) {
    const item = { ...doc, aufrufe: doc.d.aufrufe || 0, besuche: doc.d.besuche || 0, daten: JSON.stringify(doc.d) }; delete item.d;
    try { if (item._id) await client.items.update('Statistik', item); else await client.items.insert('Statistik', item); } catch (e) { log('Statistik speichern', e.message); return; }
  }
  const ids = roh.map(r => r._id);
  for (let i = 0; i < ids.length; i += 100) { try { await client.items.bulkRemove('Seitenaufrufe', ids.slice(i, i + 100)); } catch (e) { log('Statistik: Rohdaten löschen', e.message); } }
  log(`Statistik: ${roh.length} Aufrufe/Ereignisse in ${tage.size} Tag(e) verdichtet`);
}

const st = await loadSettings(approved);
  await syncBoardRole(st, approved);
  await moderate(st);
  await processActions(st, subs, logKeys);
  await contentPushes(st, subs, logKeys);
  await memberPushes(st, subs, logKeys);
  await ratSync(st, subs, logKeys);
  await boardPushes(subs, pending, st.routing, logKeys);
  await vorgangErinnerungen(st, subs, logKeys);
  await stammtisch(st);
  await weitereErinnerungen(st, subs, logKeys);
  await mitfahren(st, subs, logKeys);
  await kalenderBauen(logKeys);   // neue Zusagen-Kalender brauchen einen Seitenbau
  await feedback(subs, approved, emails, logKeys);
  await filmUploads(subs, logKeys); // erst Fotos ablegen – dann können Aufträge, die darauf warten, sofort starten
  await auftraege(subs, approved, emails, logKeys);
  await ratsberichte();
  await meilensteine();
  await mitreden(subs, st.routing, logKeys);
  await abonnenten();
  await statistik();
  log('fertig', stats);
})().catch(e => { console.error('Push-Dienst abgebrochen:', e.message, e.details ? JSON.stringify(e.details).slice(0, 300) : ''); process.exit(1); });
