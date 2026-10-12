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
