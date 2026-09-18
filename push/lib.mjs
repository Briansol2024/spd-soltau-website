// Gemeinsames für die Push-Werkzeuge: .env lesen, Wix-Admin-Client, kleine Helfer.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient, ApiKeyStrategy, OAuthStrategy } from '@wix/sdk';
import { items, collections } from '@wix/data';
import { members, authorization, memberRoleDefinition } from '@wix/members';
import { posts, draftPosts, categories } from '@wix/blog';
import { wixEventsV2 } from '@wix/events';
import { files } from '@wix/media';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// .env einlesen (ohne zusätzliche Abhängigkeit); vorhandene Umgebungsvariablen haben Vorrang
export function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m || line.trim().startsWith('#')) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
  }
}
loadEnv();
export const env = process.env;

export function adminClient() {
  if (!env.WIX_API_KEY || !env.WIX_SITE_ID) {
    throw new Error('WIX_API_KEY und WIX_SITE_ID fehlen in .env – siehe push/README.md (Admin-API-Schlüssel im Wix-Dashboard erstellen).');
  }
  return createClient({
    modules: { items, collections, members, authorization, memberRoleDefinition, posts, draftPosts, categories, wixEventsV2, files },
    auth: ApiKeyStrategy({ siteId: env.WIX_SITE_ID, apiKey: env.WIX_API_KEY }),
  });
}

// Client, der im Namen eines Mitglieds schreibt (Server-Anmeldung mit Admin-Schlüssel) – für den persönlichen Eingang
const memberClients = new Map();
export async function memberClient(memberId) {
  if (memberClients.has(memberId)) return memberClients.get(memberId);
  const base = createClient({ modules: { items }, auth: OAuthStrategy({ clientId: env.WIX_CLIENT_ID }) });
  const tokens = await base.auth.getMemberTokensForExternalLogin(memberId, env.WIX_API_KEY);
  const c = createClient({ modules: { items }, auth: OAuthStrategy({ clientId: env.WIX_CLIENT_ID, tokens }) });
  memberClients.set(memberId, c);
  return c;
}

// Alle Elemente einer Sammlung (seitenweise), optional mit Filter-Funktion auf die Query
export async function queryAll(client, collection, tune = q => q, pageSize = 200) {
  const out = [];
  for (let skip = 0; ; skip += pageSize) {
    const res = await tune(client.items.query(collection)).limit(pageSize).skip(skip).find();
    out.push(...res.items);
    if (res.items.length < pageSize) break;
  }
  return out;
}

export const BERLIN = 'Europe/Berlin';
export const isoDate = d => new Intl.DateTimeFormat('sv-SE', { timeZone: BERLIN, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(d));
export const hourBerlin = d => +new Intl.DateTimeFormat('de-DE', { timeZone: BERLIN, hour: 'numeric', hourCycle: 'h23' }).format(new Date(d));
export const fmtDe = d => new Date(d).toLocaleString('de-DE', { timeZone: BERLIN, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
