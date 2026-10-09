import http from 'node:http';

const PORT = process.env.PORT || 8787;
const TTL = 45000;
const seen = new Map();

function count() {
  const now = Date.now();
  for (const [id, t] of seen) if (now - t > TTL) seen.delete(id);
  return seen.size;
}

function reply(res) {
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ online: count() }));
}

http.createServer((req, res) => {
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type');
  if (req.method === 'OPTIONS') return res.end();
  if (!req.url.startsWith('/presence')) { res.statusCode = 404; return res.end(); }
  if (req.method !== 'POST') return reply(res);
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 10000) req.destroy(); });
  req.on('end', () => {
    try {
      const { id } = JSON.parse(body);
      if (typeof id === 'string' && id.length < 64) seen.set(id, Date.now());
    } catch {}
    reply(res);
  });
}).listen(PORT, () => console.log(`Presence server on :${PORT}`));
