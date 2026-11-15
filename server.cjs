const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT ?? 4173);
const PUBLIC_PAGES = new Set(['index.html', 'health.html', 'hazards.html', 'anatomy.html', 'assistant.html', 'training.html', 'service-worker.js']);
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

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-origin',
  });
  response.end(JSON.stringify(body));
}

function originAllowed(request) {
  if (!request.headers.origin) return true;
  try {
    const origin = new URL(request.headers.origin);
    const port = server.address()?.port;
    return origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname) && Number(origin.port || 80) === port;
  } catch { return false; }
}

function validChatPayload(payload) {
  if (!payload || typeof payload.model !== 'string' || payload.model.length > 128 || !Array.isArray(payload.messages) || payload.messages.length < 1 || payload.messages.length > 40) return false;
  if (!payload.messages.every((message) => message && ['system', 'user', 'assistant'].includes(message.role) && typeof message.content === 'string' && message.content.length <= 20_000)) return false;
  const options = payload.options || {};
  return options && typeof options === 'object'
    && (options.num_ctx === undefined || (Number.isInteger(options.num_ctx) && options.num_ctx >= 256 && options.num_ctx <= 8192))
    && (options.num_predict === undefined || (Number.isInteger(options.num_predict) && options.num_predict >= 1 && options.num_predict <= 1024))
    && (options.temperature === undefined || (Number.isFinite(options.temperature) && options.temperature >= 0 && options.temperature <= 1));
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

  if (pathname.startsWith('/api/') && !originAllowed(request)) {
    sendJson(response, 403, { error: 'Cross-origin requests are not allowed.' });
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
      if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
        sendJson(response, 415, { error: 'Chat requests must use application/json.' });
        return;
      }
      if (!validChatPayload(payload)) {
        sendJson(response, 400, { error: 'The local chat request has invalid fields or exceeds the allowed context size.' });
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

  const safePath = pathname.replaceAll('\\', '/');
  const relativePath = safePath === '/' ? 'index.html' : safePath.replace(/^\/+/, '');
  const segments = relativePath.split('/');
  const publicPath = PUBLIC_PAGES.has(relativePath) || ['src', 'assets'].includes(segments[0]);
  if (!publicPath || segments.some((segment) => segment.startsWith('.') || segment === '..')) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }).end('Not found');
    return;
  }
  const filePath = path.resolve(ROOT, relativePath);
  if (filePath !== ROOT && !filePath.startsWith(`${ROOT}${path.sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  fs.realpath(filePath, (realPathError, realPath) => {
    if (realPathError || (realPath !== ROOT && !realPath.startsWith(`${ROOT}${path.sep}`))) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' }).end('Not found');
      return;
    }
    fs.stat(realPath, (error, stat) => {
    if (error || !stat.isFile() || !MIME[path.extname(realPath).toLowerCase()]) {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': MIME[path.extname(realPath).toLowerCase()],
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Resource-Policy': 'same-origin',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(realPath).pipe(response);
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Valmed is available at http://localhost:${server.address().port}`);
});
