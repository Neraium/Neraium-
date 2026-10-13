// Adapted from Neraium/PPCLV's OAuth + Zoho Mail HTTPS delivery approach.
// Credentials must belong to Neraium; never reuse PPCLV's mailbox credentials.
const regions = Object.freeze({
  us: ['https://accounts.zoho.com', 'https://mail.zoho.com'],
  eu: ['https://accounts.zoho.eu', 'https://mail.zoho.eu'],
  in: ['https://accounts.zoho.in', 'https://mail.zoho.in'],
  au: ['https://accounts.zoho.com.au', 'https://mail.zoho.com.au'],
  jp: ['https://accounts.zoho.jp', 'https://mail.zoho.jp'],
  ca: ['https://accounts.zohocloud.ca', 'https://mail.zohocloud.ca'],
  sa: ['https://accounts.zoho.sa', 'https://mail.zoho.sa'],
  uk: ['https://accounts.zoho.uk', 'https://mail.zoho.uk'],
});
const caches = new WeakMap();
const present = value => typeof value === 'string' && Boolean(value.trim()) && value === value.trim();

export class ZohoDeliveryError extends Error {
  constructor(stage, category, { httpStatus, providerCode } = {}) {
    super('Zoho delivery could not be confirmed.');
    this.name = 'ZohoDeliveryError';
    this.stage = stage;
    this.category = category;
    if (Number.isInteger(httpStatus) && httpStatus >= 100 && httpStatus <= 599) this.httpStatus = httpStatus;
    if (Number.isInteger(providerCode) && providerCode >= 100 && providerCode <= 599) this.providerCode = providerCode;
  }
}

function exceptionCategory(error) {
  return error?.name === 'TimeoutError' || error?.name === 'AbortError' ? 'timeout' : 'network_error';
}

function statusCode(result) {
  const code = result?.status?.code;
  return Number.isInteger(code) && code >= 100 && code <= 599 ? code : undefined;
}

export function zohoConfigured(env) {
  return env.CONTACT_FROM === 'website@neraium.com' && env.CONTACT_TO === 'craig@neraium.com'
    && ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN'].every(key => present(env[key]))
    && typeof env.ZOHO_ACCOUNT_ID === 'string' && /^\d+$/.test(env.ZOHO_ACCOUNT_ID)
    && Object.hasOwn(regions, env.ZOHO_DATA_CENTER ?? 'us');
}

async function accessToken(env, fetchImpl, accountsOrigin) {
  // Cache only in memory, scoped to this environment. Never log or persist tokens.
  const cached = fetchImpl === fetch ? caches.get(env) : undefined;
  if (cached?.expiresAt > Date.now()) return cached.value;
  if (cached?.pending) return cached.pending;
  const pending = (async () => {
    let response;
    try {
      response = await fetchImpl(`${accountsOrigin}/oauth/v2/token`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: new URLSearchParams({ grant_type: 'refresh_token', client_id: env.ZOHO_CLIENT_ID,
          client_secret: env.ZOHO_CLIENT_SECRET, refresh_token: env.ZOHO_REFRESH_TOKEN }),
      });
    } catch (error) {
      throw new ZohoDeliveryError('zoho_oauth_refresh', exceptionCategory(error));
    }
    if (!response.ok) throw new ZohoDeliveryError('zoho_oauth_refresh', 'http_rejected', { httpStatus: response.status });
    let result;
    try { result = await response.json(); }
    catch { throw new ZohoDeliveryError('zoho_oauth_refresh', 'invalid_json', { httpStatus: response.status }); }
    if (result?.error || !present(result?.access_token) || !Number.isFinite(result.expires_in) || result.expires_in <= 60) {
      throw new ZohoDeliveryError('zoho_oauth_refresh', 'invalid_token_response', { httpStatus: response.status });
    }
    if (fetchImpl === fetch) caches.set(env, { value: result.access_token, expiresAt: Date.now() + (Math.min(result.expires_in, 3600) - 60) * 1000 });
    return result.access_token;
  })();
  if (fetchImpl === fetch) caches.set(env, { pending });
  try { return await pending; } catch (error) { if (fetchImpl === fetch) caches.delete(env); throw error; }
}

export async function sendZoho(env, text, fetchImpl = fetch) {
  if (!zohoConfigured(env)) throw new ZohoDeliveryError('zoho_oauth_refresh', 'configuration_unavailable');
  const [accountsOrigin, mailOrigin] = regions[env.ZOHO_DATA_CENTER ?? 'us'];
  const sendOnce = async token => {
    let response;
    try {
      response = await fetchImpl(`${mailOrigin}/api/accounts/${env.ZOHO_ACCOUNT_ID}/messages`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ fromAddress: env.CONTACT_FROM, toAddress: env.CONTACT_TO,
          subject: 'Neraium evaluation inquiry', content: text, mailFormat: 'plaintext', encoding: 'UTF-8' }),
      });
    } catch (error) {
      // A timeout or network failure can follow provider acceptance; never retry these.
      throw new ZohoDeliveryError('zoho_api_send', exceptionCategory(error));
    }
    if (response.status === 401) return { rejected: true, httpStatus: 401 };
    if (!response.ok) throw new ZohoDeliveryError('zoho_api_send', 'http_rejected', { httpStatus: response.status });
    let result;
    try { result = await response.json(); }
    catch { throw new ZohoDeliveryError('zoho_api_send', 'invalid_receipt', { httpStatus: response.status }); }
    const code = statusCode(result);
    if (code === 401) return { rejected: true, httpStatus: response.status, providerCode: code };
    if (code !== 200) throw new ZohoDeliveryError('zoho_api_send', 'api_rejected', { httpStatus: response.status, providerCode: code });
    return { accepted: true, httpStatus: response.status, providerCode: code };
  };

  let token = await accessToken(env, fetchImpl, accountsOrigin);
  let result = await sendOnce(token);
  let authRetry = false;
  if (result.rejected) {
    // Zoho explicitly rejected the message as unauthorized, so it was not accepted.
    // Refresh once and retry only this definitive rejection. Ambiguous outcomes never retry.
    authRetry = true;
    caches.delete(env);
    token = await accessToken(env, fetchImpl, accountsOrigin);
    result = await sendOnce(token);
  }
  if (!result.accepted) {
    if (authRetry) caches.delete(env);
    throw new ZohoDeliveryError('zoho_api_send', authRetry ? 'authorization_rejected_after_refresh' : 'authorization_rejected', result);
  }
  return { httpStatus: result.httpStatus, providerCode: result.providerCode, authRetry };
}
