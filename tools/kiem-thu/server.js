// Máy chủ tĩnh + /api/tutor (bundle thật của api/tutor.js) với Gemini giả lập.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.json': 'application/json' };

async function start(root, port, gemini) {
  const out = path.join(__dirname, 'bundle-' + port + '.mjs');
  await esbuild.build({ entryPoints: [path.join(root, 'api/tutor.js')], bundle: true, format: 'esm', platform: 'neutral', outfile: out, logLevel: 'silent' });
  const mod = await import(out + '?t=' + Date.now());
  const handler = mod.default;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('generativelanguage.googleapis.com')) return gemini(u, init);
    return realFetch(url, init);
  };
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.TUTOR_REQUIRE_AUTH = '0';

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://localhost:' + port);
    if (u.pathname.startsWith('/api/tutor')) {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const body = Buffer.concat(chunks);
      const request = new Request(u.href, { method: req.method, headers: req.headers, body: req.method === 'POST' ? body : undefined });
      const waits = [];
      const resp = await handler(request, { waitUntil: (p) => waits.push(p) });
      res.writeHead(resp.status, Object.fromEntries(resp.headers));
      if (resp.body) {
        const reader = resp.body.getReader();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
      }
      res.end();
      return;
    }
    let p = decodeURIComponent(u.pathname);
    if (p === '/') p = '/index.html';
    const file = path.join(root, p);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end('not found');
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(port, r));
  return { server, close: () => new Promise((r) => server.close(r)) };
}

module.exports = { start };
