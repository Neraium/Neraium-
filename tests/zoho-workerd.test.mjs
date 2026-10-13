import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url)));
const source = await readFile(new URL('../worker/zoho-mail.mjs', import.meta.url), 'utf8');
const bindings = { CONTACT_FROM: 'website@neraium.com', CONTACT_TO: 'craig@neraium.com', ZOHO_CLIENT_ID: 'test-client', ZOHO_CLIENT_SECRET: 'test-secret', ZOHO_REFRESH_TOKEN: 'test-refresh', ZOHO_ACCOUNT_ID: '123', ZOHO_DATA_CENTER: 'us' };
async function delivery(outboundService) {
  const mf = new Miniflare(convertV4MiniflareOptions({
    host: '127.0.0.1', cf: false, telemetry: { enabled: false },
    compatibilityDate: config.compatibility_date, bindings, outboundService,
    modules: [
      { type: 'ESModule', path: resolve('worker/runtime-test.mjs'), contents: `import { sendZoho } from './zoho-mail.mjs'; export default { async fetch(request, env) { try { return Response.json(await sendZoho(env, 'Controlled runtime test')); } catch(e) { return Response.json({ stage:e.stage, category:e.category, httpStatus:e.httpStatus }); } } };` },
      { type: 'ESModule', path: resolve('worker/zoho-mail.mjs'), contents: source },
    ],
  }));
  try { return await (await mf.dispatchFetch('http://localhost')).json(); }
  finally { await mf.dispose(); }
}
const grant = () => Response.json({ access_token: 'test-access', expires_in: 3600 });

test('Zoho delivery works in workerd with one refresh and one send', async () => {
  const calls = [];
  const result = await delivery(async request => {
    calls.push(new URL(request.url).pathname);
    if (request.url.includes('/oauth/')) {
      assert.equal(new URLSearchParams(await request.text()).get('refresh_token'), 'test-refresh');
      return grant();
    }
    assert.equal(request.headers.get('Authorization'), 'Zoho-oauthtoken test-access');
    return Response.json({ status: { code: 200 } });
  });
  assert.equal(result.providerCode, 200);
  assert.deepEqual(calls, ['/oauth/v2/token', '/api/accounts/123/messages']);
});

for (const stage of ['zoho_oauth_refresh', 'zoho_api_send']) {
  test(`workerd rejects ${stage} redirects without following or resending`, async () => {
    let calls = 0;
    const result = await delivery(async request => {
      calls++;
      if (stage === 'zoho_api_send' && request.url.includes('/oauth/')) return grant();
      return new Response(null, { status: 302, headers: { Location: 'https://unexpected.example/credentials' } });
    });
    assert.deepEqual(result, { stage, category: 'http_rejected', httpStatus: 302 });
    assert.equal(calls, stage === 'zoho_oauth_refresh' ? 1 : 2);
  });
}
