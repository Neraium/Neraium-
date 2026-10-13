import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleContact, configured } from '../worker/contact.mjs';
const valid = { name: 'Alex Morgan', email: 'alex@example.com', organization: 'Example Water', facility: 'Treatment plant', token: 'test-token', website: '' };
function fixture() {
  const sent = [];
  const env = { CONTACT_ENABLED: 'true', CONTACT_RETENTION_APPROVED: 'true', CONTACT_FROM: 'inquiry@neraium.com', CONTACT_TO: 'craig@neraium.com', CONTACT_HOSTNAMES: 'www.neraium.com,neraium.com', TURNSTILE_SITE_KEY: 'public-key', TURNSTILE_SECRET_KEY: 'never-expose', EMAIL: { send: async message => { sent.push(message); return { messageId: 'receipt' }; } }, CONTACT_RATE_LIMITER: { limit: async () => ({ success: true }) } };
  const verify = async () => Response.json({ success: true, hostname: 'www.neraium.com', action: 'evaluation' });
  return { env, sent, verify };
}
const request = (data = valid, headers = {}, method = 'POST') => new Request('https://www.neraium.com/api/contact', { method, headers: { Origin: 'https://www.neraium.com', 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1', ...headers }, ...(method === 'POST' ? { body: typeof data === 'string' ? data : JSON.stringify(data) } : {}) });
test('configuration fails closed for each missing dependency and discloses no secrets', async () => {
  for (const key of ['CONTACT_ENABLED','CONTACT_RETENTION_APPROVED','CONTACT_FROM','CONTACT_TO','CONTACT_HOSTNAMES','EMAIL','CONTACT_RATE_LIMITER','TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY']) {
    const { env, sent, verify } = fixture(); delete env[key];
    assert.equal(configured(env), false);
    assert.equal((await handleContact(request(), env, verify)).status, 503);
    const config = await handleContact(new Request('https://www.neraium.com/api/contact-config'), env, verify);
    assert.deepEqual(await config.json(), { enabled: false }); assert.equal(sent.length, 0);
  }
});
test('configuration rejects dummy challenge keys and malformed settings', async () => {
  const dummyKeys = ['1x00000000000000000000AA', '2x00000000000000000000AB', '1x00000000000000000000BB', '2x00000000000000000000BB', '3x00000000000000000000FF', '1x0000000000000000000000000000000AA', '2x0000000000000000000000000000000AA', '3x0000000000000000000000000000000AA'];
  for (const key of ['TURNSTILE_SITE_KEY', 'TURNSTILE_SECRET_KEY', 'CONTACT_HOSTNAMES']) {
    for (const value of [false, true, {}, [], ' ', ...(key !== 'CONTACT_HOSTNAMES' ? dummyKeys : [', ,'])]) {
      const { env, sent, verify } = fixture(); env[key] = value;
      assert.equal(configured(env), false);
      assert.equal((await handleContact(request(), env, verify)).status, 503);
      const config = await handleContact(new Request('https://www.neraium.com/api/contact-config'), env, verify);
      assert.deepEqual(await config.json(), { enabled: false });
      assert.equal(sent.length, 0);
    }
  }
});
test('success follows provider acceptance and keeps destination server-owned', async () => {
  const { env, sent, verify } = fixture();
  const response = await handleContact(request(), env, verify);
  assert.equal(response.status, 200); assert.equal((await response.json()).accepted, true);
  assert.equal(sent.length, 1); assert.equal(sent[0].to, env.CONTACT_TO); assert.equal(sent[0].replyTo, valid.email);
  assert.match(sent[0].text, /Treatment plant/); assert.equal(response.headers.get('cache-control'), 'no-store');
});
for (const [name, data] of [
  ['missing field', { ...valid, name: ' ' }], ['oversized field', { ...valid, organization: 'a'.repeat(161) }],
  ['email injection', { ...valid, email: 'a@example.com\r\nBcc: victim@example.com' }],
  ['invalid email', { ...valid, email: 'invalid' }], ['unknown field', { ...valid, to: 'attacker@example.com' }],
  ['prototype field', { ...valid, toString: 'override' }], ['honeypot', { ...valid, website: 'spam' }],
  ['missing challenge', { ...valid, token: '' }], ['oversized challenge', { ...valid, token: 'a'.repeat(2049) }],
  ['wrong type', { ...valid, name: [] }], ['bad contact choice', { ...valid, 'preferred-contact': 'Other' }],
  ['malformed JSON', '{'], ['null JSON', 'null'], ['array JSON', '[]'],
]) test(`rejects ${name} without delivery`, async () => {
  const { env, sent, verify } = fixture(); assert.equal((await handleContact(request(data), env, verify)).status, 400); assert.equal(sent.length, 0);
});
test('oversized body rejected with and without content-length', async () => {
  const { env, sent, verify } = fixture();
  assert.equal((await handleContact(request('a'.repeat(8193)), env, verify)).status, 413);
  assert.equal((await handleContact(request(valid, { 'Content-Length': '8193' }), env, verify)).status, 413);
  assert.equal(sent.length, 0);
});
test('rejects foreign origin, disallowed host, missing origin and invalid media type', async () => {
  const { env, sent, verify } = fixture();
  for (const headers of [{ Origin: 'https://attacker.example' }, { Origin: '' }]) assert.equal((await handleContact(request(valid, headers), env, verify)).status, 403);
  assert.equal((await handleContact(request(valid, { 'Content-Type': 'text/plain' }), env, verify)).status, 415);
  env.CONTACT_HOSTNAMES = 'other.example'; assert.equal((await handleContact(request(), env, verify)).status, 403); assert.equal(sent.length, 0);
});
test('rate limit, rate service failure and missing edge IP never send', async () => {
  const { env, sent, verify } = fixture();
  env.CONTACT_RATE_LIMITER.limit = async () => ({ success: false });
  const response = await handleContact(request(), env, verify); assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '60');
  env.CONTACT_RATE_LIMITER.limit = async () => { throw Error('provider sensitive detail'); };
  assert.equal((await handleContact(request(), env, verify)).status, 502);
  assert.equal((await handleContact(request(valid, { 'CF-Connecting-IP': '' }), env, verify)).status, 503); assert.equal(sent.length, 0);
});
test('stage diagnostics distinguish limiter, Turnstile and Zoho failures without private data', async () => {
  const original = console.info; const events = [];
  console.info = line => events.push(JSON.parse(line));
  try {
    {
      const { env, verify } = fixture(); env.CONTACT_RATE_LIMITER.limit = async () => ({ success: false });
      assert.equal((await handleContact(request(), env, verify)).status, 429);
    }
    {
      const { env } = fixture();
      assert.equal((await handleContact(request(), env, async () => { throw Error('private inquiry and provider details'); })).status, 502);
    }
    {
      const { env, verify } = zohoFixture(); let calls = 0;
      assert.equal((await handleContact(request(), env, verify, async () => {
        calls++; return new Response('', { status: calls === 1 ? 403 : 200 });
      })).status, 502);
    }
  } finally { console.info = original; }
  assert.deepEqual(events.map(({ stage, category }) => [stage, category]), [
    ['rate_limit', 'rejected'],
    ['turnstile_server_verification', 'network_error'],
    ['zoho_oauth_refresh', 'http_rejected'],
  ]);
  const serialized = JSON.stringify(events);
  assert.doesNotMatch(serialized, /Alex Morgan|alex@example\.com|192\.0\.2\.1|private inquiry|provider details|test-secret|test-refresh/);
  assert.equal(events[2].httpStatus, 403);
});
test('failed, mismatched, expired or unavailable challenges never send', async () => {
  const { env, sent } = fixture();
  for (const result of [null, { success: 'true', hostname: 'www.neraium.com', action: 'evaluation' }, { success: false }, { success: true, hostname: 'attacker.example', action: 'evaluation' }, { success: true, hostname: 'www.neraium.com', action: 'other' }]) assert.equal((await handleContact(request(), env, async () => Response.json(result))).status, 400);
  assert.equal((await handleContact(request(), env, async () => new Response('', { status: 503 }))).status, 503);
  assert.equal((await handleContact(request(), env, async () => { throw Error('secret'); })).status, 502); assert.equal(sent.length, 0);
});
test('delivery failure and missing provider acknowledgement cannot return success', async () => {
  const { env, verify } = fixture();
  for (const send of [async () => { throw Error('secret provider response'); }, ...[undefined, {}, { messageId: '' }, { messageId: ' ' }, { messageId: true }, { messageId: 123 }].map(receipt => async () => receipt)]) {
    env.EMAIL.send = send; const response = await handleContact(request(), env, verify); assert.equal(response.status, 502);
    const text = await response.text(); assert.doesNotMatch(text, /accepted|secret provider/);
  }
});
test('malformed rate limiter acknowledgements never reach verification or delivery', async () => {
  const { env, sent } = fixture();
  for (const result of [undefined, null, {}, { success: 'true' }, { success: 1 }]) {
    env.CONTACT_RATE_LIMITER.limit = async () => result;
    assert.equal((await handleContact(request(), env, async () => { assert.fail('Verification must not run'); })).status, 429);
  }
  assert.equal(sent.length, 0);
});
test('method and unknown API route have explicit responses', async () => {
  const { env, verify } = fixture();
  const response = await handleContact(request(undefined, {}, 'GET'), env, verify); assert.equal(response.status, 405); assert.equal(response.headers.get('allow'), 'POST');
  assert.equal((await handleContact(new Request('https://www.neraium.com/api/unknown'), env, verify)).status, 404);
});

function zohoFixture() {
  const result = fixture();
  Object.assign(result.env, { CONTACT_DELIVERY: 'zoho', CONTACT_FROM: 'website@neraium.com', ZOHO_CLIENT_ID: 'test-client', ZOHO_CLIENT_SECRET: 'test-secret', ZOHO_REFRESH_TOKEN: 'test-refresh', ZOHO_ACCOUNT_ID: '123456', ZOHO_DATA_CENTER: 'us' });
  delete result.env.EMAIL;
  return result;
}
test('Zoho sends only after validation, Turnstile and rate limiting, using fixed Neraium addresses', async () => {
  const { env, verify } = zohoFixture(); const calls = [];
  const deliver = async (url, options) => {
    calls.push({ url, options });
    return Response.json(calls.length === 1 ? { access_token: 'test-access', expires_in: 3600 } : { status: { code: 200 } });
  };
  assert.equal((await handleContact(request(), env, verify, deliver)).status, 200);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://accounts.zoho.com/oauth/v2/token');
  assert.equal(calls[0].options.body.get('grant_type'), 'refresh_token');
  assert.equal(calls[1].url, 'https://mail.zoho.com/api/accounts/123456/messages');
  const body = JSON.parse(calls[1].options.body);
  assert.equal(body.fromAddress, 'website@neraium.com'); assert.equal(body.toAddress, 'craig@neraium.com');
  assert.equal(body.mailFormat, 'plaintext'); assert.match(body.content, /Visitor email \(reply to this address\): alex@example.com/);
  assert.equal(Object.hasOwn(body, 'replyTo'), false);
  for (const call of calls) { assert.equal(call.options.redirect, 'error'); assert.ok(call.options.signal instanceof AbortSignal); }
});
test('Zoho fails closed for missing credentials, invalid region, account path injection and foreign sender', async () => {
  for (const key of ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'ZOHO_ACCOUNT_ID']) {
    const { env } = zohoFixture(); delete env[key]; assert.equal(configured(env), false);
  }
  for (const [key, value] of [['ZOHO_DATA_CENTER', 'toString'], ['ZOHO_DATA_CENTER', 'https://attacker.example'], ['ZOHO_ACCOUNT_ID', '../messages'], ['CONTACT_FROM', 'sender@professionalpoolcare.com'], ['CONTACT_TO', 'other@example.com'], ['CONTACT_DELIVERY', 'unknown']]) {
    const { env } = zohoFixture(); env[key] = value; assert.equal(configured(env), false);
  }
});
test('Zoho provider failures are generic, have no retries, and cannot claim acceptance', async () => {
  const failures = [
    new Response('', { status: 401 }), Response.json({ error: 'sensitive authorization error' }),
    Response.json({ access_token: '', expires_in: 3600 }), Response.json({ access_token: 'a', expires_in: 10 }),
    new Response('malformed'),
  ];
  for (const tokenResponse of failures) {
    const { env, verify } = zohoFixture(); let calls = 0;
    const response = await handleContact(request(), env, verify, async () => { calls++; return tokenResponse; });
    assert.equal(response.status, 502); assert.equal(calls, 1); assert.doesNotMatch(await response.text(), /accepted|sensitive|test-secret/);
  }
  for (const sendResponse of [new Response('', { status: 403 }), Response.json({ status: { code: 400 } }), Response.json({ status: { code: '200' } }), Response.json({}), new Response('malformed'), null]) {
    const { env, verify } = zohoFixture(); let calls = 0;
    const response = await handleContact(request(), env, verify, async () => {
      calls++; if (calls === 1) return Response.json({ access_token: 'a', expires_in: 3600 });
      if (!sendResponse) throw new DOMException('sensitive detail', 'TimeoutError'); return sendResponse;
    });
    assert.equal(response.status, 502); assert.equal(calls, 2); assert.doesNotMatch(await response.text(), /accepted|sensitive/);
  }
});
test('Zoho OAuth is never called when retention, validation, Turnstile or limiter rejects', async () => {
  for (const scenario of ['retention', 'disabled', 'validation', 'challenge', 'limit']) {
    const { env, verify } = zohoFixture(); let data = valid; let challenge = verify;
    if (scenario === 'retention') env.CONTACT_RETENTION_APPROVED = 'false';
    if (scenario === 'disabled') env.CONTACT_ENABLED = 'false';
    if (scenario === 'validation') data = { ...valid, email: 'invalid' };
    if (scenario === 'challenge') challenge = async () => Response.json({ success: false });
    if (scenario === 'limit') env.CONTACT_RATE_LIMITER.limit = async () => ({ success: false });
    const response = await handleContact(request(data), env, challenge, async () => assert.fail('No provider request allowed'));
    assert.ok(response.status >= 400);
  }
});

test('Zoho retries once after an explicit HTTP or API 401, but never after ambiguous send outcomes', async () => {
  const { sendZoho } = await import('../worker/zoho-mail.mjs');
  for (const unauthorized of [
    new Response('', { status: 401 }),
    Response.json({ status: { code: 401 } }),
  ]) {
    const { env } = zohoFixture(); let tokens = 0; let sends = 0; const usedTokens = [];
    const fakeFetch = async (url, options) => {
      if (url.includes('/oauth/')) { tokens++; return Response.json({ access_token: `token-${tokens}`, expires_in: 3600 }); }
      sends++; usedTokens.push(options.headers.Authorization);
      return sends === 1 ? unauthorized : Response.json({ status: { code: 200 } });
    };
    const receipt = await sendZoho(env, 'test inquiry', fakeFetch);
    assert.deepEqual(receipt, { httpStatus: 200, providerCode: 200, authRetry: true });
    assert.equal(tokens, 2); assert.equal(sends, 2);
    assert.notEqual(usedTokens[0], usedTokens[1]);
  }

  {
    const { env } = zohoFixture(); let tokens = 0; let sends = 0;
    const fakeFetch = async url => {
      if (url.includes('/oauth/')) { tokens++; return Response.json({ access_token: 'one-token', expires_in: 3600 }); }
      sends++; throw new DOMException('private provider details', 'TimeoutError');
    };
    await assert.rejects(sendZoho(env, 'test inquiry', fakeFetch), error => error.stage === 'zoho_api_send' && error.category === 'timeout');
    assert.equal(tokens, 1); assert.equal(sends, 1);
  }
});

test('Zoho access token remains cached per Worker environment', async () => {
  const { sendZoho } = await import('../worker/zoho-mail.mjs');
  const originalFetch = globalThis.fetch;
  try {
    const { env } = zohoFixture(); let tokens = 0; let sends = 0;
    globalThis.fetch = async url => {
      if (url.includes('/oauth/')) { tokens++; return Response.json({ access_token: `token-${tokens}`, expires_in: 3600 }); }
      sends++; return Response.json({ status: { code: 200 } });
    };
    await sendZoho(env, 'test inquiry');
    await sendZoho(env, 'test inquiry');
    await sendZoho({ ...env }, 'distinct environment');
    assert.equal(tokens, 2); assert.equal(sends, 3);
  } finally { globalThis.fetch = originalFetch; }
});
