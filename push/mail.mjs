// E-Mail-Versand des Push-Dienstes (Newsletter, Pressemitteilungen, Newsletter-Bestätigung) über einen SMTP-Zugang aus .env:
//   SMTP_HOST, SMTP_PORT (587 oder 465), SMTP_USER, SMTP_PASS, MAIL_FROM ("SPD Soltau <info@spd-soltau.de>")
// Ohne diese Werte bleibt jede E-Mail-Aktion mit einem klaren Hinweis stehen – nichts geht verloren.
import nodemailer from 'nodemailer';
import { env, log } from './lib.mjs';

export const mailBereit = () => !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.MAIL_FROM);
let transport = null;
function transporter() {
  if (!transport) transport = nodemailer.createTransport({ host: env.SMTP_HOST, port: +(env.SMTP_PORT || 587), secure: +(env.SMTP_PORT || 587) === 465, auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } });
  return transport;
}
// Eine E-Mail an einen Empfänger (Text + einfache HTML-Fassung)
export async function mail({ to, subject, text, html, replyTo, listUnsubscribe }) {
  if (!mailBereit()) throw new Error('E-Mail-Versand nicht eingerichtet: SMTP_HOST, SMTP_USER, SMTP_PASS und MAIL_FROM fehlen in .env');
  const headers = {};
  if (listUnsubscribe) headers['List-Unsubscribe'] = `<${listUnsubscribe}>`;
  await transporter().sendMail({ from: env.MAIL_FROM, to, subject, text, html: html || textToHtml(text), replyTo: replyTo || env.MAIL_REPLY_TO || undefined, headers });
}
// Viele Empfänger nacheinander (jeder einzeln – keine sichtbaren Adressen, kein BCC-Limit); Fehler je Empfänger werden gezählt
export async function mailAn(empfaenger, machen) {
  let ok = 0, fehler = 0;
  for (const e of empfaenger) {
    try { await mail(await machen(e)); ok++; }
    catch (err) { fehler++; log(`  E-Mail an ${e.email || e}: ${err.message}`); }
  }
  return { ok, fehler };
}
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function textToHtml(text) {
  return `<div style="font:16px/1.5 Arial,sans-serif;color:#222;max-width:640px">${esc(text).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>').replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>').replace(/^/, '<p>').replace(/$/, '</p>')}</div>`;
}
// E-Mail zu einer Nachricht im Posteingang („Post“) – kurz, im Stil der Website
export function postMailHtml({ von, text, link }) {
  return `<div style="background:#f4f2f1;padding:24px 12px">
  <div style="max-width:560px;margin:0 auto;background:#fff;font:16px/1.55 Arial,sans-serif;color:#222">
    <div style="background:#E3000F;color:#fff;padding:16px 22px;font:800 20px/1 'Arial Narrow',Arial,sans-serif;text-transform:uppercase">SPD Soltau <span style="font-size:12px;letter-spacing:.14em;opacity:.9;margin-left:8px">Mitgliederbereich</span></div>
    <div style="padding:24px 22px">
      <p style="margin:0 0 16px"><b>${esc(von)}</b> hat dir im Mitgliederbereich eine Nachricht geschrieben:</p>
      <div style="border-left:4px solid #E3000F;background:#f7f5f4;padding:14px 16px;margin:0 0 20px;white-space:pre-wrap">${esc(text)}</div>
      <p style="margin:0 0 22px"><a href="${esc(link)}" style="display:inline-block;background:#E3000F;color:#fff;text-decoration:none;padding:13px 20px;font:700 15px/1 'Arial Narrow',Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase">In der App antworten</a></p>
      <p style="margin:0;color:#6E6664;font-size:13.5px">Antworten bitte in der App – auf diese E-Mail kann niemand antworten. Du bekommst sie, weil du im Posteingang „auch per E-Mail“ angehakt hast; dort kannst du den Haken jederzeit wieder entfernen.</p>
    </div>
  </div></div>`;
}

// Newsletter-HTML im Stil der Website (rot/schwarz, Barlow-ähnliche Systemschrift)
export function newsletterHtml({ betreff, vorwort, beitraege, termine, siteUrl, abmeldeUrl }) {
  const block = (titel, inner) => `<h2 style="font:800 20px/1.1 'Arial Narrow',Arial,sans-serif;text-transform:uppercase;color:#0F0F0F;margin:28px 0 10px">${esc(titel)}</h2>${inner}`;
  return `<div style="background:#f4f2f1;padding:24px 12px"><div style="max-width:640px;margin:0 auto;background:#fff;font:16px/1.5 Arial,sans-serif;color:#222">
  <div style="background:#E3000F;color:#fff;padding:18px 24px;font:800 22px/1 'Arial Narrow',Arial,sans-serif;text-transform:uppercase">SPD Soltau <span style="font-size:12px;letter-spacing:.14em;opacity:.9;margin-left:10px">Aus Liebe zu Soltau</span></div>
  <div style="padding:24px">
    <h1 style="font:800 26px/1.1 'Arial Narrow',Arial,sans-serif;text-transform:uppercase;margin:0 0 16px;color:#0F0F0F">${esc(betreff)}</h1>
    ${vorwort ? `<p>${esc(vorwort).replace(/\n/g, '<br>')}</p>` : ''}
    ${beitraege.length ? block('Aktuelles', beitraege.map(n => `<p style="margin:0 0 14px"><b>${esc(n.title)}</b><br>${esc(n.teaser || '')}<br><a href="${siteUrl}/aktuelles/${n.slug}/" style="color:#E3000F">Weiterlesen →</a></p>`).join('')) : ''}
    ${termine.length ? block('Termine', termine.map(e => `<p style="margin:0 0 10px"><b style="color:#E3000F">${esc(e.wann)}</b> ${esc(e.title)}${e.zeit ? ', ' + esc(e.zeit) : ''}${e.ort ? ' · ' + esc(e.ort) : ''}</p>`).join('') + `<p><a href="${siteUrl}/termine/" style="color:#E3000F">Alle Termine →</a></p>`) : ''}
  </div>
  <div style="padding:16px 24px;border-top:1px solid #ddd;font-size:12px;color:#666">SPD Ortsverein Soltau · Am Bahnhof 1t · 29614 Soltau · <a href="${siteUrl}/impressum/" style="color:#666">Impressum</a> · <a href="${siteUrl}/datenschutz/" style="color:#666">Datenschutz</a>${abmeldeUrl ? ` · <a href="${abmeldeUrl}" style="color:#666">Newsletter abbestellen</a>` : ''}</div>
  </div></div>`;
}
