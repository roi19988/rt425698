const http = require('node:http');
const { identifyPlant } = require('./plantnet.cjs');
const { validateIdentification } = require('../src/validation.cjs');
const { explainPlant } = require('./gemini.cjs');
const key = process.env.PLANTNET_API_KEY;
if (!key) { console.error('Missing PLANTNET_API_KEY in server/.env'); process.exit(1); }
const port = Number(process.env.PORT || 4040);
const host = process.env.HOST || '127.0.0.1';
let active = 0;
let recent = [];
function send(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) return send(res, 403, { error: 'Origin not allowed' });
  if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  if (req.url === '/health' && req.method === 'GET') return send(res, 200, { status: 'ok', provider: 'plantnet', explanations: Boolean(process.env.GEMINI_API_KEY) });
  if (req.url !== '/identify' || req.method !== 'POST') return send(res, 404, { error: 'Not found' });
  if (!req.headers['content-type']?.startsWith('application/json')) return send(res, 415, { error: 'JSON required' });
  recent = recent.filter(time => Date.now() - time < 60000);
  if (active >= 2 || recent.length >= 10) return send(res, 429, { error: 'יותר מדי בקשות. נסו שוב בעוד דקה.' });
  active++; recent.push(Date.now());
  try {
    let size = 0; const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 31000000) { send(res, 413, { error: 'התמונות גדולות מדי.' }); req.destroy(); return; }
      chunks.push(chunk);
    }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return send(res, 400, { error: 'Invalid JSON' }); }
    if (!body || typeof body !== 'object') return send(res, 400, { error: 'Invalid request' });
    const identified = await identifyPlant(body.images, body.previousIdentification, key);
    const result = await explainPlant(identified, body.images, process.env.GEMINI_API_KEY);
    send(res, 200, validateIdentification(result));
  } catch (error) {
    // Do not log provider URLs or raw exceptions: URLs contain the secret key.
    send(res, error.status || 502, { error: error.message || 'שירות הזיהוי אינו זמין.' });
  } finally { active--; }
});
server.requestTimeout = 120000;
server.headersTimeout = 15000;
server.listen(port, host, () => console.log(`Local development API: http://${host}:${port}/identify (Pl@ntNet${process.env.GEMINI_API_KEY ? ' + Gemini' : ''})`));
