import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const allowedEvents = new Set(['contact_diagnostic', 'contact_frontend_diagnostic']);
const numericFields = ['httpStatus', 'providerCode', 'responseStatus'];

export function sanitizedContactDiagnostics(line, receivedAt = new Date().toISOString()) {
  let root;
  try {
    root = JSON.parse(line);
    if (typeof root === 'string') root = JSON.parse(root);
  } catch { return []; }
  const candidates = [];
  const collect = value => {
    if (!value || typeof value !== 'object') return;
    if (allowedEvents.has(value.event)) candidates.push(value);
    if (value.event && typeof value.event === 'object') collect(value.event);
    if (Array.isArray(value.logs)) {
      for (const log of value.logs) {
        const messages = typeof log?.message === 'string' ? [log.message]
          : Array.isArray(log?.message) ? log.message.filter(item => typeof item === 'string') : [];
        for (const message of messages) {
          try { collect(JSON.parse(message)); } catch { /* Suppress unrelated provider/runtime log text. */ }
        }
      }
    }
  };
  collect(root);
  return candidates.map(item => {
    const safe = { receivedAt, event: item.event };
    if (typeof item.diagnosticId === 'string' && /^[0-9a-f-]{36}$/.test(item.diagnosticId)) safe.diagnosticId = item.diagnosticId;
    for (const key of ['stage', 'category']) if (typeof item[key] === 'string' && /^[a-z_]{1,48}$/.test(item[key])) safe[key] = item[key];
    for (const key of numericFields) if (Number.isInteger(item[key]) && item[key] >= 100 && item[key] <= 599) safe[key] = item[key];
    return safe;
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const child = spawn('./node_modules/.bin/wrangler', ['tail', 'website', '--format', 'json'], { stdio: ['ignore', 'pipe', 'ignore'] });
  let buffer = '';
  const heartbeat = setInterval(() => process.stdout.write(`${JSON.stringify({ tail: 'connected-or-waiting' })}\n`), 30000);
  child.stdout.on('data', chunk => {
    buffer += chunk;
    for (;;) {
      const end = buffer.indexOf('\n');
      if (end < 0) break;
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
      for (const event of sanitizedContactDiagnostics(line)) process.stdout.write(`${JSON.stringify(event)}\n`);
    }
  });
  child.on('close', code => { clearInterval(heartbeat); process.stdout.write(`${JSON.stringify({ tail: 'closed', exit: code })}\n`); process.exitCode = code ?? 1; });
  process.on('SIGINT', () => child.kill('SIGINT'));
}
