import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizedContactDiagnostics } from '../scripts/tail-contact-diagnostics.mjs';

test('sanitizes direct Wrangler diagnostic events, including JSON-string envelopes', () => {
  const id = '550e8400-e29b-41d4-a716-446655440000';
  const event = { event: 'contact_diagnostic', diagnosticId: id, stage: 'zoho_api_send', category: 'http_rejected', responseStatus: 502, providerCode: 451, retryAttempted: true, email: 'private@example.com', message: 'private inquiry' };
  const receivedAt = '2026-10-13T12:00:00.000Z';
  assert.deepEqual(sanitizedContactDiagnostics(JSON.stringify(JSON.stringify(event)), receivedAt), [{ receivedAt, event: 'contact_diagnostic', diagnosticId: id, stage: 'zoho_api_send', category: 'http_rejected', responseStatus: 502, providerCode: 451, retryAttempted: true }]);
});

test('extracts supported wrapped log messages and discards unrelated content', () => {
  const id = '550e8400-e29b-41d4-a716-446655440000';
  const wrapped = { event: { logs: [{ message: JSON.stringify({ event: 'contact_frontend_diagnostic', diagnosticId: id, stage: 'response_decode', category: 'invalid_json', responseStatus: 200, body: 'private' }) }, { message: 'private provider text' }] } };
  assert.deepEqual(sanitizedContactDiagnostics(JSON.stringify(wrapped), '2026-10-13T12:00:00.000Z'), [{ receivedAt: '2026-10-13T12:00:00.000Z', event: 'contact_frontend_diagnostic', diagnosticId: id, stage: 'response_decode', category: 'invalid_json', responseStatus: 200 }]);
  assert.deepEqual(sanitizedContactDiagnostics('{ not json'), []);
});
