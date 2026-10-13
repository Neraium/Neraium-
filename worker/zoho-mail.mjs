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
    const response = await fetchImpl(`${accountsOrigin}/oauth/v2/token`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'refresh_token', client_id: env.ZOHO_CLIENT_ID,
        client_secret: env.ZOHO_CLIENT_SECRET, refresh_token: env.ZOHO_REFRESH_TOKEN }),
    });
    if (!response.ok) throw Error('Email authorization unavailable.');
    const result = await response.json();
    if (result?.error || !present(result?.access_token) || !Number.isFinite(result.expires_in) || result.expires_in <= 60) throw Error('Email authorization unavailable.');
    if (fetchImpl === fetch) caches.set(env, { value: result.access_token, expiresAt: Date.now() + (Math.min(result.expires_in, 3600) - 60) * 1000 });
    return result.access_token;
  })();
  if (fetchImpl === fetch) caches.set(env, { pending });
  try { return await pending; } catch (error) { if (fetchImpl === fetch) caches.delete(env); throw error; }
}
export async function sendZoho(env, text, fetchImpl = fetch) {
  if (!zohoConfigured(env)) throw Error('Email delivery unavailable.');
  const [accountsOrigin, mailOrigin] = regions[env.ZOHO_DATA_CENTER ?? 'us'];
  const token = await accessToken(env, fetchImpl, accountsOrigin);
  // Do not retry a send: a timeout or malformed receipt may still have delivered it.
  const response = await fetchImpl(`${mailOrigin}/api/accounts/${env.ZOHO_ACCOUNT_ID}/messages`, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(5000),
    headers: { Authorization: `Zoho-oauthtoken ${token}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ fromAddress: env.CONTACT_FROM, toAddress: env.CONTACT_TO,
      subject: 'Neraium evaluation inquiry', content: text, mailFormat: 'plaintext', encoding: 'UTF-8' }),
  });
  if (response.status === 401) caches.delete(env);
  if (!response.ok) throw Error('Email delivery unavailable.');
  const result = await response.json();
  if (result?.status?.code === 401) caches.delete(env);
  if (result?.status?.code !== 200) throw Error('Email delivery unconfirmed.');
  // Provider acceptance is not inbox receipt. No undocumented Reply-To parameter.
}
