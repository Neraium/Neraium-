import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizedContactDiagnostics, recordContactDiagnostics } from '../scripts/tail-contact-diagnostics.mjs';
import { mkdtempSync, readFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

test('retains successive sanitized events with private file permissions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'neraium-diagnostics-'));
  try {
    const path = join(dir, 'events.jsonl');
    const event = { event: 'contact_diagnostic', stage: 'contact_configuration', category: 'disabled', responseStatus: 503, inquiry: 'private inquiry', credential: 'private credential' };
    recordContactDiagnostics(JSON.stringify(event), path, '2026-10-13T13:00:00.000Z');
    recordContactDiagnostics(JSON.stringify(JSON.stringify(event)), path, '2026-10-13T13:01:00.000Z');
    const stored = readFileSync(path, 'utf8');
    assert.equal(stored.trim().split('\n').length, 2);
    assert.doesNotMatch(stored, /inquiry|credential/);
    assert.equal(statSync(path).mode & 0o777, 0o600);
  } finally { rmSync(dir, { recursive: true }); }
});
