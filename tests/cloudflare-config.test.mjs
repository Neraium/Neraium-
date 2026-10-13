import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { compareBindings } from '../scripts/check-cloudflare-config.mjs';
const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url)));
// These configuration-preservation tests exercise the permanent baseline.
config.vars.CONTACT_ENABLED='false';
config.vars.CONTACT_RETENTION_APPROVED='false';
delete config.durable_objects;
const bindings = [
  { name: 'ASSETS', type: 'assets' },
  ...Object.entries(config.vars).map(([name, text]) => ({ name, text, type: 'plain_text' })),
  { name: 'EMAIL', type: 'send_email', allowed_destination_addresses: ['craig@neraium.com'] },
  { name: 'CONTACT_RATE_LIMITER', type: 'ratelimit', namespace_id: '1001', simple: { limit: 5, period: 60 } },
  ...config.secrets.required.map(name => ({ name, type: 'secret_text' })),
];
test('accepts matching configuration without reading secret values', () => {
  assert.deepEqual(compareBindings(config, bindings), { differences: [], secrets: [...config.secrets.required].sort() });
});
test('blocks missing retention flag and changed contact state', () => {
  const remote = bindings.filter(b => b.name !== 'CONTACT_RETENTION_APPROVED').map(b => b.name === 'CONTACT_ENABLED' ? { ...b, text: 'true' } : b);
  assert.deepEqual(compareBindings(config, remote).differences.sort(), ['Binding differs: CONTACT_ENABLED', 'Binding differs: CONTACT_RETENTION_APPROVED']);
});
test('blocks unrestricted EMAIL and changed rate limiter', () => {
  const remote = bindings.map(b => b.name === 'EMAIL' ? { name: b.name, type: b.type } : b.name === 'CONTACT_RATE_LIMITER' ? { ...b, namespace_id: '1002' } : b);
  assert.deepEqual(compareBindings(config, remote).differences.sort(), ['Binding differs: CONTACT_RATE_LIMITER', 'Binding differs: EMAIL']);
});
test('blocks unknown remote resources rather than dropping them', () => {
  assert.deepEqual(compareBindings(config, [...bindings, { name: 'PRODUCTION_DATA', type: 'kv_namespace', namespace_id: 'example' }]).differences, ['Unmanaged remote binding: PRODUCTION_DATA']);
});
test('requires Turnstile secret and preserves additional secret inventory', () => {
  assert.deepEqual(compareBindings(config, bindings.filter(b => b.name !== 'TURNSTILE_SECRET_KEY')).differences, ['Required secret unavailable: TURNSTILE_SECRET_KEY']);
  assert.deepEqual(compareBindings(config, [...bindings, { name: 'OTHER_SECRET', type: 'secret_text' }]).secrets, ['OTHER_SECRET', ...config.secrets.required].sort());
});
test('requires every declared Zoho secret without retrieving its value', () => {
  for (const name of ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'ZOHO_ACCOUNT_ID']) {
    assert.deepEqual(compareBindings(config, bindings.filter(binding => binding.name !== name)).differences, [`Required secret unavailable: ${name}`]);
  }
});
