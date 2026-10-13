// Temporary probe operator. Never record browser traces, tokens, headers or bodies.
import { chromium } from 'playwright';
import { readFile, writeFile, lstat } from 'node:fs/promises';
const path = '/home/ubuntu/.config/neraium/contact-verification.json';
async function privateKey() {
  try {
    const stat = await lstat(path);
    if (!stat.isFile() || stat.uid !== process.getuid() || (stat.mode & 0o777) !== 0o600) throw Error();
    const { key } = JSON.parse(await readFile(path, 'utf8'));
    if (typeof key !== 'string' || !/^[a-f0-9]{64}$/.test(key)) throw Error();
    return key;
  } catch { throw Error('Private probe credential unavailable; sensitive details suppressed.'); }
}
const key = await privateKey();
const origin = 'https://neraium.com';
const evidencePath = '.planning/contact-activation/live-security.json';
const evidence = { started_at: new Date().toISOString(), public_flags_false: false,
  endpoint_removed: false, actual_email_sent_by_probe: false, results: {}, complete: false };
let browser;
let page;
let stage = 'negative-tests';
const save = () => writeFile(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
const request = async (scenario, token, authenticated = true) => {
  const response = await fetch(`${origin}/api/contact-verification`, { method: 'POST', redirect: 'error',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify({ scenario, token }), signal: AbortSignal.timeout(20000) });
  return { status: response.status, body: await response.json() };
};
try {
  const config = await fetch(`${origin}/api/contact-config`).then(r => r.json());
  evidence.public_flags_false = config.enabled === false;
  evidence.results.unauthenticated = (await request('valid', 'invalid', false)).status;
  evidence.results.validation = (await request('invalid-field', 'invalid')).status;
  evidence.results.invalid_token = (await request('valid', 'invalid')).status;
  const rates = [];
  for (let n = 0; n < 12; n++) {
    rates.push((await request('valid', 'invalid')).status);
    if (rates.at(-1) === 429) break;
  }
  evidence.results.rate_limit_statuses = rates;
  await save();
  console.log('Live negative-token, field-validation and limiter probes completed; no email path exists.');
  stage = 'browser-launch';
  browser = await chromium.launch({ headless: !process.env.DISPLAY });
  page = await browser.newPage();
  stage = 'live-page-navigation';
  await page.goto(`${origin}/contact`, { waitUntil: 'domcontentloaded' });
  stage = 'widget-script-load';
  await page.addScriptTag({ url: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit' });
  stage = 'widget-render';
  await page.evaluate(() => {
    window.__contactProbe = {};
    const target = document.createElement('div');
    document.body.prepend(target);
    window.__contactProbe.widget = window.turnstile.render(target, {
      sitekey: '0x4AAAAAAFU0ZCXIu-qT_E9P', action: 'evaluation', theme: 'dark',
      callback: value => { window.__contactProbe.token = value; },
      'error-callback': code => { window.__contactProbe.error = String(code); },
    });
  });
  const freshToken = async (reset = false) => {
    if (reset) await page.evaluate(() => { delete window.__contactProbe.token; delete window.__contactProbe.error; window.turnstile.reset(window.__contactProbe.widget); });
    await page.waitForFunction(() => window.__contactProbe.token || window.__contactProbe.error, undefined, { timeout: 45000 });
    return page.evaluate(() => window.__contactProbe.token ?? null);
  };
  stage = 'challenge-completion';
  const token = await freshToken();
  if (!token) {
    evidence.results.real_challenge = 'not_completed';
    await save();
    console.log('Live widget did not issue a valid token in this browser; positive challenge verification remains held.');
  } else {
    // Clear the real limiter window used by the negative tests.
    console.log('Real widget token issued; waiting for limiter window to clear.');
    await new Promise(resolve => setTimeout(resolve, 65000));
    evidence.results.real_challenge = (await request('valid', token)).status;
    evidence.results.replay = (await request('valid', token)).status;
    evidence.results.provider_failure = (await request('provider-failure', await freshToken(true))).status;
    evidence.results.provider_recovery = (await request('valid', await freshToken(true))).status;
    await save();
    const expiring = await freshToken(true);
    console.log('Successful challenge, replay and synthetic recovery probes recorded; waiting for actual token expiry.');
    await new Promise(resolve => setTimeout(resolve, 310000));
    evidence.results.expired_token = (await request('valid', expiring)).status;
    evidence.complete = evidence.public_flags_false && evidence.results.unauthenticated === 404
      && evidence.results.validation === 400 && evidence.results.invalid_token === 400
      && rates.includes(429) && evidence.results.real_challenge === 200 && evidence.results.replay === 400
      && evidence.results.provider_failure === 502 && evidence.results.provider_recovery === 200
      && evidence.results.expired_token === 400;
  }
} catch (error) {
  evidence.inconclusive = true;
  evidence.stopped_at_stage = stage;
  evidence.failure_category = error?.name === 'TimeoutError' ? 'timeout' : /Content Security Policy/i.test(error?.message ?? '') ? 'content-security-policy' : /Failed to load script/i.test(error?.message ?? '') ? 'script-load-failed' : 'unclassified';
  if (page) evidence.widget_state = await page.evaluate(() => ({
    exists: Boolean(window.__contactProbe),
    token_present: Boolean(window.__contactProbe?.token),
    error_code: /^\d+$/.test(window.__contactProbe?.error ?? '') ? window.__contactProbe.error : null,
  })).catch(() => ({ unavailable: true }));
  console.log(`Live security probe stopped at ${stage}; sensitive error details suppressed.`);
} finally {
  await browser?.close();
  evidence.finished_at = new Date().toISOString();
  await save();
  console.log(`Live security evidence saved; complete=${evidence.complete}.`);
}
