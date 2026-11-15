const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT ?? 4173);
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};

function proxyToOllama(request, response, apiPath, body = null) {
  const payload = body ? Buffer.from(JSON.stringify(body)) : null;
  const upstream = http.request({
    hostname: '127.0.0.1',
    port: 11434,
    path: apiPath,
    method: request.method,
    headers: payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {},
    timeout: 180_000,
  }, (ollamaResponse) => {
    response.writeHead(ollamaResponse.statusCode || 502, {
      'Content-Type': ollamaResponse.headers['content-type'] || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    ollamaResponse.pipe(response);
  });
  upstream.on('timeout', () => upstream.destroy(new Error('Ollama request timed out')));
  upstream.on('error', (error) => {
    if (response.headersSent) return response.destroy(error);
    response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ error: `Ollama is unavailable: ${error.message}` }));
  });
  if (payload) upstream.end(payload);
  else upstream.end();
}

function chatWithInstalledLocalModel(request, response, payload) {
  if (/cloud/i.test(payload.model)) {
    response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ error: 'Cloud models are disabled. Select a model installed for local inference.' }));
    return;
  }
  const check = http.get({ hostname: '127.0.0.1', port: 11434, path: '/api/tags', timeout: 10_000 }, (tagsResponse) => {
    let raw = '';
    tagsResponse.setEncoding('utf8');
    tagsResponse.on('data', (chunk) => { raw += chunk; });
    tagsResponse.on('end', () => {
      if (tagsResponse.statusCode !== 200) {
        response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: 'Could not verify local Ollama models.' }));
        return;
      }
      let models;
      try { models = JSON.parse(raw).models || []; } catch {
        response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: 'Ollama returned an invalid local model list.' }));
        return;
      }
      if (!models.some((model) => model.name === payload.model)) {
        response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
        response.end(JSON.stringify({ error: 'The selected model is not installed locally. Refresh the model list and choose a local model.' }));
        return;
      }
      proxyToOllama(request, response, '/api/chat', payload);
    });
  });
  check.on('timeout', () => check.destroy(new Error('Ollama model lookup timed out')));
  check.on('error', (error) => {
    if (response.headersSent) return response.destroy(error);
    response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ error: `Ollama is unavailable: ${error.message}` }));
  });
}

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  } catch {
    response.writeHead(400).end('Invalid URL');
    return;
  }

  if (pathname === '/api/ollama/models' && request.method === 'GET') {
    proxyToOllama(request, response, '/api/tags');
    return;
  }
  if (pathname === '/api/ollama/chat' && request.method === 'POST') {
    let rawBody = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      rawBody += chunk;
      if (rawBody.length > 64_000) {
        response.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ error: 'Request is too large' }));
        request.destroy();
      }
    });
    request.on('end', () => {
      if (response.writableEnded) return;
      let payload;
      try { payload = JSON.parse(rawBody); } catch {
        response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ error: 'Invalid JSON body' }));
        return;
      }
      if (!payload || typeof payload.model !== 'string' || !Array.isArray(payload.messages) || payload.messages.length === 0) {
        response.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ error: 'A model and chat messages are required' }));
        return;
      }
      chatWithInstalledLocalModel(request, response, payload);
    });
    return;
  }
  if (pathname.startsWith('/api/')) {
    response.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' }).end(JSON.stringify({ error: 'API route not found' }));
    return;
  }

  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(ROOT, relativePath);
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile()) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(response);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Valmed is available at http://localhost:${server.address().port}`);
});
