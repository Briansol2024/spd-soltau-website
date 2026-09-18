// Kleiner lokaler Webserver für dist/ (oder dist-protected/ mit --protected). Nur für die Entwicklung.
//   node serve.mjs [--protected] [--port 8080]
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const root = path.join(__dirname, args.includes('--protected') ? 'dist-protected' : 'dist');
const port = Number(args[args.indexOf('--port') + 1]) || 8080;
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };

http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  let file = path.join(root, p);
  try {
    const s = await stat(file);
    if (s.isDirectory()) { res.writeHead(301, { Location: req.url + '/' }); return res.end(); }
  } catch { file = path.join(root, '404.html'); }
  try {
    const data = await readFile(file);
    res.writeHead(file.endsWith('404.html') ? 404 : 200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('Nicht gefunden'); }
}).listen(port, '127.0.0.1', () => console.log(`Läuft: http://localhost:${port}/  (Ordner: ${path.basename(root)})`));
