// Überträgt die E-Mail-Zugangsdaten aus .env als Secrets ins GitHub-Repository (für den Push-Dienst auf GitHub Actions)
// und schickt auf Wunsch eine Testmail. Die Werte werden dabei nie angezeigt.
//
//   node tools/mail-secrets.mjs          # Secrets setzen
//   node tools/mail-secrets.mjs --test   # zusätzlich Testmail an VORSTAND_EMAILS (über den lokalen SMTP-Zugang)
import { spawnSync } from 'node:child_process';
import { loadEnv, env, log } from '../push/lib.mjs';
import { mail, mailBereit } from '../push/mail.mjs';

loadEnv();
const KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM', 'MAIL_REPLY_TO'];
const fehlt = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM'].filter(k => !env[k]);
if (fehlt.length) { console.error('In .env fehlen: ' + fehlt.join(', ')); process.exit(1); }
for (const k of KEYS) {
  if (!env[k]) continue;
  const r = spawnSync('gh', ['secret', 'set', k], { input: env[k], stdio: ['pipe', 'inherit', 'inherit'], shell: process.platform === 'win32' });
  if (r.status !== 0) { console.error('Secret ' + k + ' konnte nicht gesetzt werden'); process.exit(1); }
  log('Secret gesetzt: ' + k);
}
if (process.argv.includes('--test')) {
  if (!mailBereit()) { console.error('SMTP nicht vollständig'); process.exit(1); }
  const an = (env.VORSTAND_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
  await mail({ to: an, subject: 'Testmail der SPD-Soltau-Website', text: 'Moin!\n\nWenn diese Mail ankommt, ist der Versand von Newsletter, Pressemitteilungen und Newsletter-Bestätigungen eingerichtet.\n\nSPD Ortsverein Soltau' });
  log('Testmail verschickt an ' + an.join(', '));
}
