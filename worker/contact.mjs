import { ZohoDeliveryError, zohoConfigured, sendZoho } from './zoho-mail.mjs';

const EMAIL = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
// Cloudflare's documented dummy keys must never activate public intake.
const TEST_TURNSTILE_KEY = /^[123]x0{20,}(?:AA|AB|BB|FF)$/;
const realChallengeKey = value => typeof value === 'string' && Boolean(value.trim()) && value === value.trim() && !TEST_TURNSTILE_KEY.test(value);
const fields = { name: [100, true], email: [254, true], organization: [160, true], facility: [160, true], 'review-question': [600, false], role: [120, false], 'preferred-contact': [30, false] };
const json = (body, status = 200, extra = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
function diagnostic(stage, category, details = {}) {
  // Only fixed categories and numeric statuses are allowed here. Never pass inquiry,
  // token, IP, provider payload, exception message, URL, or arbitrary header data.
  const event = { event: 'contact_diagnostic', stage, category };
  for (const key of ['httpStatus', 'providerCode', 'responseStatus']) {
    const value = details[key];
    if (Number.isInteger(value) && value >= 100 && value <= 599) event[key] = value;
  }
  console.info(JSON.stringify(event));
}
function exceptionCategory(error) {
  return error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'timeout' : 'network_error';
}
function deliveryConfigured(env) {
  const provider = env.CONTACT_DELIVERY ?? 'cloudflare';
  if (provider === 'zoho') return zohoConfigured(env);
  return provider === 'cloudflare' && typeof env.EMAIL?.send === 'function';
}
export function configured(env) {
  return env.CONTACT_ENABLED === 'true' && env.CONTACT_RETENTION_APPROVED === 'true' && deliveryConfigured(env) && typeof env.CONTACT_RATE_LIMITER?.limit === 'function' && realChallengeKey(env.TURNSTILE_SITE_KEY) && realChallengeKey(env.TURNSTILE_SECRET_KEY) && EMAIL.test(env.CONTACT_FROM || '') && EMAIL.test(env.CONTACT_TO || '') && typeof env.CONTACT_HOSTNAMES === 'string' && env.CONTACT_HOSTNAMES.split(',').some(host => host.trim());
}
function validPayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (Object.keys(data).some(key => !Object.hasOwn(fields, key) && !['website', 'token'].includes(key))) return null;
  const values = {};
  for (const [key, [max, required]] of Object.entries(fields)) {
    const raw = data[key] ?? '';
    if (typeof raw !== 'string' || raw.length > max || /[\x00-\x08\x0b-\x1f\x7f]/.test(raw)) return null;
    values[key] = raw.trim();
    if (required && !values[key]) return null;
  }
  if (!EMAIL.test(values.email) || /[\r\n]/.test(values.email) || !['', 'Email', 'Video call'].includes(values['preferred-contact'])) return null;
  if (typeof data.token !== 'string' || !data.token || data.token.length > 2048 || typeof (data.website ?? '') !== 'string' || data.website) return null;
  return values;
}
async function boundedBody(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Missing body');
  let bytes = 0; const chunks = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > 8192) { await reader.cancel(); throw new RangeError('Too large'); }
    chunks.push(value);
  }
  const body = new Uint8Array(bytes); let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
}
export async function handleContact(request, env, verifyFetch = fetch, deliveryFetch = fetch) {
  const url = new URL(request.url);
  if (url.pathname === '/api/contact-config' && request.method === 'GET') {
    const enabled = configured(env);
    return json({ enabled, ...(enabled ? { siteKey: env.TURNSTILE_SITE_KEY } : {}) });
  }
  if (url.pathname !== '/api/contact') return json({ error: 'Not found.' }, 404);
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405, { Allow: 'POST' });
  if (!configured(env)) return json({ error: 'Online submission is unavailable. Please email craig@neraium.com.' }, 503);
  const allowed = env.CONTACT_HOSTNAMES.split(',').map(host => host.trim());
  if (!allowed.includes(url.hostname) || request.headers.get('origin') !== url.origin) return json({ error: 'Request origin rejected.' }, 403);
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') return json({ error: 'Use JSON.' }, 415);
  if (Number(request.headers.get('content-length')) > 8192) return json({ error: 'Request too large.' }, 413);
  let stage = 'rate_limit';
  try {
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) { diagnostic('rate_limit', 'client_ip_missing'); return json({ error: 'Submission verification unavailable.' }, 503); }
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
    const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    const limit = await env.CONTACT_RATE_LIMITER.limit({ key: `contact:${key}` });
    if (limit?.success !== true) {
      diagnostic('rate_limit', 'rejected', { responseStatus: 429 });
      return json({ error: 'Too many requests. Please try again later.' }, 429, { 'Retry-After': '60' });
    }
    stage = 'payload_validation';
    let data;
    try { data = await boundedBody(request); } catch (error) {
      const status = error instanceof RangeError ? 413 : 400;
      diagnostic(stage, error instanceof RangeError ? 'body_too_large' : 'invalid_body', { responseStatus: status });
      return json({ error: error instanceof RangeError ? 'Request too large.' : 'Invalid request.' }, status);
    }
    const values = validPayload(data);
    if (!values) {
      diagnostic(stage, 'field_rejected', { responseStatus: 400 });
      return json({ error: 'Please check the fields and complete the security verification.' }, 400);
    }
    stage = 'turnstile_server_verification';
    let verification;
    try {
      verification = await verifyFetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: data.token, remoteip: ip }),
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      const category = exceptionCategory(error);
      diagnostic(stage, category, { responseStatus: 502 });
      return json({ error: 'Security verification could not be confirmed. Please try again.' }, 502);
    }
    if (!verification.ok) {
      diagnostic(stage, 'http_rejected', { httpStatus: verification.status, responseStatus: 503 });
      return json({ error: 'Security verification unavailable. Please try again.' }, 503);
    }
    let result;
    try { result = await verification.json(); }
    catch {
      diagnostic(stage, 'invalid_response', { httpStatus: verification.status, responseStatus: 502 });
      return json({ error: 'Security verification could not be confirmed. Please try again.' }, 502);
    }
    if (result?.success !== true || result.hostname !== url.hostname || result.action !== 'evaluation') {
      diagnostic(stage, 'challenge_rejected', { httpStatus: verification.status, responseStatus: 400 });
      return json({ error: 'Security verification expired or failed. Please try again.' }, 400);
    }
    const text = Object.entries(values).filter(([,value]) => value).map(([label,value]) => `${label}: ${value}`).join('\n\n');
    if (env.CONTACT_DELIVERY === 'zoho') {
      const receipt = await sendZoho(env, `Visitor email (reply to this address): ${values.email}\n\n${text}`, deliveryFetch);
      diagnostic('zoho_api_send', receipt.authRetry ? 'accepted_after_auth_refresh' : 'accepted', receipt);
    } else {
      stage = 'email_provider_send';
      const receipt = await env.EMAIL.send({ from: env.CONTACT_FROM, to: env.CONTACT_TO, replyTo: values.email, subject: 'Neraium evaluation inquiry', text });
      if (typeof receipt?.messageId !== 'string' || !receipt.messageId.trim()) {
        diagnostic(stage, 'missing_receipt', { responseStatus: 502 });
        return json({ error: 'Submission could not be confirmed. Please email craig@neraium.com.' }, 502);
      }
    }
    return json({ accepted: true, message: 'Your request has been accepted for email delivery. This does not confirm inbox receipt.' });
  } catch (error) {
    if (error instanceof ZohoDeliveryError) {
      diagnostic(error.stage, error.category, { httpStatus: error.httpStatus, providerCode: error.providerCode, responseStatus: 502 });
    } else {
      diagnostic(stage, exceptionCategory(error), { responseStatus: 502 });
    }
    return json({ error: 'Submission could not be confirmed. Please email craig@neraium.com.' }, 502);
  }
}
