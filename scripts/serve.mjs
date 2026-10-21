// Static server for the hosted build: http://localhost:4173 serves dist/<industry>/site/.
// `node scripts/serve.mjs --industry=utilities` (defaults to the first pack).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { ROOT, selectedPacks } from './lib/content.mjs';

const id = selectedPacks()[0];
const dir = join(ROOT, 'dist', id, 'site');
const port = Number(process.env.PORT || 4173);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
createServer((req, res) => {
  const path = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  let file = join(dir, path);
  if (!file.startsWith(dir)) { res.writeHead(403).end(); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404).end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' }).end(readFileSync(file));
}).listen(port, () => console.log(`Serving dist/${id}/site at http://localhost:${port}`));
