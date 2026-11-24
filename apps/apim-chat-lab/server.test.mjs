import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from './server.mjs';

const key = 'fixture-key-not-for-browser';
const id = 'a56e3731-4296-41f6-a757-cb215a4957e3';
const baseUrl = 'https://test-gateway.azure-api.net/project-x/openai/v1';

async function setup(t, options) {
  const server = createApp({ label: 'Project X', project: 'pamadigiproject1_proj1',
    model: 'modelprojectX', baseUrl, key, requireLogin: false, ...options });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise((resolve) => server.close(resolve)));
  return `http://127.0.0.1:${server.address().port}`;
}

function chat(origin, body, requestOrigin = origin) {
  return fetch(`${origin}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: requestOrigin },
    body: JSON.stringify(body),
  });
}

test('browser sees the APIM URL but only the server sends the key; records status, token counts, and request ID', async (t) => {
  const origin = await setup(t, { send: async (target, request) => {
    assert.equal(target, `${baseUrl}/chat/completions`);
    assert.equal(request.headers['api-key'], key);
    assert.equal(request.redirect, 'error');
    assert.deepEqual(JSON.parse(request.body), { model: 'modelprojectX', messages: [{ role: 'user', content: 'Uji.' }] });
    return Response.json({ choices: [{ message: { content: '<b>Teks</b>' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 8, completion_tokens: 0, total_tokens: 8 } }, { headers: { 'x-pamadigi-request-id': id } });
  } });
  const config = await (await fetch(`${origin}/api/config`)).text();
  assert.ok(JSON.parse(config).ready);
  assert.ok(!config.includes(key));
  const home = await fetch(origin);
  assert.equal(home.headers.get('referrer-policy'), 'same-origin');
  const html = await home.text();
  assert.match(html, /Tulis pesan/);
  assert.ok(!html.includes(key));
  const reply = await chat(origin, { question: ' Uji. ', model: 'not-allowed' });
  const result = await reply.json();
  assert.equal(reply.status, 200);
  assert.equal(result.requestId, id);
  assert.deepEqual(result.usage, { input: 8, output: 0, total: 8 });
  assert.equal(result.answer, '<b>Teks</b>');
});

test('blocks unconfigured, anonymous, cross-origin and invalid requests without reaching APIM', async (t) => {
  const send = async () => assert.fail('Must not reach gateway');
  const origin = await setup(t, { send });
  assert.equal((await chat(origin, { question: '' })).status, 400);
  assert.equal((await chat(origin, { question: 'x'.repeat(701) })).status, 400);
  assert.equal((await chat(origin, { question: 'x'.repeat(9000) })).status, 400);
  assert.equal((await chat(origin, { question: 'Hi' }, 'https://example.test')).status, 403);
  const offline = await setup(t, { send, key: '' });
  assert.equal((await chat(offline, { question: 'Hi' })).status, 503);
  const protectedApp = await setup(t, { send, requireLogin: true, origin: 'https://app.example.test' });
  assert.equal((await fetch(`${protectedApp}/api/config`)).status, 401);
});

test('keeps rate limit HTTP status and sanitizes backend errors and unexpected IDs', async (t) => {
  const origin = await setup(t, { send: async () => new Response(key, {
    status: 429, headers: { 'x-pamadigi-request-id': key },
  }) });
  const reply = await chat(origin, { question: 'Hi' });
  assert.equal(reply.status, 429);
  const result = await reply.json();
  assert.equal(result.requestId, null);
  assert.match(result.message, /Terlalu banyak/);
  assert.ok(!JSON.stringify(result).includes(key));
});
