import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/app.css', ['app.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);
const requestIdPattern = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
const headers = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
  'Referrer-Policy': 'same-origin',
  'X-Content-Type-Options': 'nosniff',
};

function json(res, status, value) {
  res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

class BadInput extends Error {}

async function readQuestion(req) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    bytes += chunk.length;
    if (bytes > 4096) {
      req.resume();
      throw new BadInput('Pesan terlalu besar.');
    }
    chunks.push(chunk);
  }
  let payload;
  try {
    payload = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new BadInput('Kirim pesan dalam format JSON.');
  }
  const question = typeof payload?.question === 'string' ? payload.question.trim() : '';
  if (!question || question.length > 700) throw new BadInput('Tulis pesan antara 1 dan 700 karakter.');
  return question;
}

function count(value) {
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function gatewayError(status) {
  if (status === 401) return 'APIM menolak kredensial. Cek subscription key aplikasi ini.';
  if (status === 403) return 'Akses atau kuota ditolak. Cek scope key dan batas panggilan di APIM.';
  if (status === 429) return 'Terlalu banyak panggilan. Tunggu sebentar sebelum mencoba lagi.';
  if (status === 400 || status === 413) return 'Gateway atau model menolak format pesan.';
  return 'Gateway atau model belum merespons dengan benar.';
}

export function createApp({
  label = 'Gateway Lab', project = '', model = '', baseUrl = '', key = '',
  origin, requireLogin = true, send = fetch,
} = {}) {
  const host = baseUrl ? new URL(baseUrl) : null;
  if (host && (host.protocol !== 'https:' || !host.hostname.endsWith('.azure-api.net') ||
    host.username || host.password || host.search || host.hash || host.port ||
    !/^\/(?:main|project-x|project-y)\/openai\/v1\/?$/.test(host.pathname))) {
    throw new Error('Gunakan Base URL APIM lab yang sudah disetujui.');
  }
  const endpoint = host ? `${baseUrl.replace(/\/$/, '')}/chat/completions` : null;
  if (requireLogin && !origin) throw new Error('APP_ORIGIN harus diisi di Azure.');

  return createServer(async (req, res) => {
    try {
      if (requireLogin && !req.headers['x-ms-client-principal-id']) {
        return json(res, 401, { message: 'Masuk dengan akun yang diizinkan untuk memakai demo.' });
      }

      if (req.method === 'GET' && assets.has(req.url)) {
        const [file, type] = assets.get(req.url);
        const body = await readFile(new URL(`public/${file}`, import.meta.url));
        res.writeHead(200, { ...headers, 'Content-Type': type });
        return res.end(body);
      }
      if (req.method === 'GET' && req.url === '/api/config') {
        return json(res, 200, { label, project, model, baseUrl, ready: Boolean(endpoint && key) });
      }
      if (req.method !== 'POST' || req.url !== '/api/chat') {
        return json(res, 404, { message: 'Halaman tidak ditemukan.' });
      }
      const expectedOrigin = origin ?? `http://${req.headers.host}`;
      if (req.headers.origin !== expectedOrigin ||
        !/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? '')) {
        return json(res, 403, { message: 'Kirim dari halaman demo ini.' });
      }
      if (!endpoint || !key) return json(res, 503, { message: 'Gateway belum tersambung.' });

      const question = await readQuestion(req);
      const start = performance.now();
      let reply;
      try {
        reply = await send(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'api-key': key },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: question }] }),
          redirect: 'error',
          signal: AbortSignal.timeout(55_000),
        });
      } catch (error) {
        if (!(error instanceof TypeError) && error.name !== 'TimeoutError') throw error;
        console.warn('APIM transport failed:', error.name);
        return json(res, error.name === 'TimeoutError' ? 504 : 502, {
          message: 'Tidak bisa menjangkau APIM. Coba lagi setelah koneksi pulih.',
        });
      }
      const elapsedMs = Math.round(performance.now() - start);
      const id = reply.headers.get('x-pamadigi-request-id');
      const requestId = id && requestIdPattern.test(id) ? id : null;
      if (!reply.ok) {
        await reply.body?.cancel();
        return json(res, reply.status, { message: gatewayError(reply.status), requestId, elapsedMs });
      }
      let result;
      try {
        result = await reply.json();
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        return json(res, 502, { message: 'Format respons gateway tidak dikenali.', requestId, elapsedMs });
      }
      const text = result?.choices?.[0]?.message?.content;
      const finish = result?.choices?.[0]?.finish_reason;
      const usage = result?.usage;
      const counts = { input: count(usage?.prompt_tokens), output: count(usage?.completion_tokens), total: count(usage?.total_tokens) };
      return json(res, 200, {
        answer: typeof text === 'string' && text.trim() ? text : null,
        finish: ['stop', 'length', 'content_filter'].includes(finish) ? finish : null,
        usage: counts, requestId, elapsedMs,
      });
    } catch (error) {
      if (error instanceof BadInput) {
        return json(res, 400, { message: error.message });
      }
      console.error('Demo request failed:', error.name);
      if (!res.headersSent) return json(res, 500, { message: 'Ada gangguan di Web App.' });
      res.destroy();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const env = process.env;
  const deployed = Boolean(env.WEBSITE_SITE_NAME);
  const port = Number(env.PORT ?? 3000);
  createApp({
    label: env.APP_LABEL, project: env.FOUNDRY_PROJECT, model: env.DEPLOYMENT_NAME,
    baseUrl: env.APIM_BASE_URL, key: env.APIM_SUBSCRIPTION_KEY, origin: env.APP_ORIGIN,
    requireLogin: deployed,
  }).listen(port, deployed ? '0.0.0.0' : '127.0.0.1', () => console.log(`Gateway Lab listening on ${port}`));
}
