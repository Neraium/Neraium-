// Temporary operator-only module. Install only for a staffed, time-bounded session.
import { handleContact } from './contact.mjs';
const path = '/api/contact-verification';
const headers = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY' };
const equal = (a, b) => { let diff = a.length ^ b.length; for (let i = 0; i < b.length; i++) diff |= (a.charCodeAt(i) || 0) ^ b.charCodeAt(i); return diff === 0; };
const json = (value, status = 200) => Response.json(value, { status, headers });
async function bounded(request, maximum) {
  const reader = request.body?.getReader(); if (!reader) throw Error();
  const chunks = []; let size = 0;
  while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > maximum) { await reader.cancel(); throw Error(); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}
const script = `
const state={token:null,tokenGeneration:-1,generation:0,lastUsedGeneration:-1,successToken:null,successGeneration:-1,failureGeneration:-1,recoveryGeneration:-1,expiredToken:null,capturedAt:null,startedAt:new Date().toISOString(),results:[],usedTokens:new Set(),completed:new Set(),pending:false};
const status=document.querySelector('#status');
const output=document.querySelector('#results');
let widget;
window.onHumanTurnstileReady=()=>{widget=turnstile.render('#challenge',{sitekey:document.body.dataset.sitekey,action:'evaluation',callback:token=>{if(state.usedTokens.has(token)){state.token=null;status.textContent='Cloudflare returned an already-used challenge. Reset and complete a fresh challenge.';return;}state.token=token;state.tokenGeneration=state.generation;status.textContent='Human challenge completed. Choose a test.';},'expired-callback':()=>{state.token=null;state.tokenGeneration=-1;status.textContent='Challenge expired. Reset for a fresh challenge.';},'error-callback':()=>{state.token=null;state.tokenGeneration=-1;status.textContent='Challenge failed. Reset and complete it manually.';}});};
document.querySelector('#reset').onclick=()=>{if(state.pending){status.textContent='Wait for the current test to finish.';return;}state.generation++;state.token=null;state.tokenGeneration=-1;if(widget===undefined){window.onHumanTurnstileReady();}else{turnstile.reset(widget);}status.textContent='Complete the new challenge manually.';};
document.querySelector('#capture').onclick=()=>{if(!state.token||state.usedTokens.has(state.token)||state.tokenGeneration<=state.lastUsedGeneration){status.textContent='Reset and complete a fresh challenge before capturing an unused expiry token.';return;}state.expiredToken=state.token;state.capturedAt=Date.now();state.token=null;state.tokenGeneration=-1;turnstile.remove(widget);widget=undefined;status.textContent='Unused expiry token frozen in tab memory and removed from other tests. Wait at least 310 seconds before the expiry test. Do not close this tab.';};
document.querySelectorAll('[data-scenario]').forEach(button=>{button.onclick=async()=>{
 const scenario=button.dataset.scenario;
 if(state.pending||state.completed.has(scenario)){status.textContent='This test is already running or complete.';return;}
 const token=scenario==='replay'?state.successToken:scenario==='expiry'?state.expiredToken:(scenario==='invalid'||scenario==='validation'?'invalid-token':state.token);
 if(!token){status.textContent='A human-completed token is required.';return;}
 if(['success','failure','recovery'].includes(scenario)&&state.usedTokens.has(token)){status.textContent='That challenge token was already used. Reset and complete a fresh challenge.';return;}
 if(scenario==='failure'&&state.successGeneration>=0&&state.tokenGeneration<=state.successGeneration){status.textContent='Reset and complete a fresh challenge after success and replay.';return;}
 if(scenario==='recovery'&&(state.generation===0||state.tokenGeneration<=state.lastUsedGeneration)){status.textContent='Reset and complete a fresh challenge after the failed provider attempt.';return;}
 if(scenario==='expiry'&&Date.now()-state.capturedAt<310000){status.textContent='Wait until the captured token is at least 310 seconds old.';return;}
 if(scenario==='success'){state.successToken=token;state.successGeneration=state.tokenGeneration;}
 if(scenario==='failure')state.failureGeneration=state.tokenGeneration;
 if(scenario==='recovery')state.recoveryGeneration=state.tokenGeneration;
 if(['success','failure','recovery','expiry'].includes(scenario)){state.usedTokens.add(token);state.lastUsedGeneration=state.tokenGeneration;if(state.token===token){state.token=null;state.tokenGeneration=-1;}}
 state.pending=true;document.querySelectorAll('[data-scenario]').forEach(item=>item.disabled=true);
 try{const response=await fetch('${path}/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenario,token,capturedAgeSeconds:scenario==='expiry'?Math.floor((Date.now()-state.capturedAt)/1000):null})});
 const result=await response.json();
 // Only server-selected metadata is shown/exported. Tokens remain in tab memory.
 state.results.push({scenario,http_status:response.status,observed_at:result.observed_at??new Date().toISOString(),challenge_checked:result.challenge_checked===true,challenge_valid:result.challenge_valid===true,duplicate_or_expired:result.duplicate_or_expired===true,captured_age_seconds:scenario==='expiry'?Math.floor((Date.now()-state.capturedAt)/1000):null,captured_at:scenario==='expiry'?new Date(state.capturedAt).toISOString():null});
 output.value=JSON.stringify({human_operated:true,hostname:location.hostname,started_at:state.startedAt,completed_at:new Date().toISOString(),results:state.results},null,2);
 if(response.status===429){if(scenario==='success'){state.successToken=null;state.successGeneration=-1;}if(scenario==='failure')state.failureGeneration=-1;if(scenario==='recovery')state.recoveryGeneration=-1;status.textContent='Recorded HTTP 429. Wait at least 65 seconds; reset and complete a fresh challenge before retrying a challenge-based test.';}
 else{state.completed.add(scenario);status.textContent='Recorded HTTP '+response.status+'. Follow the next step using a fresh challenge when instructed.';}
 }catch{status.textContent='Test unavailable. No email was sent. Preserve the recorded results and retry only after the session is checked.';}finally{state.pending=false;document.querySelectorAll('[data-scenario]').forEach(item=>{item.disabled=state.completed.has(item.dataset.scenario);});}
};});
`;
function html(env, config, authenticated) {
  const nonce = crypto.randomUUID();
  const handoff = `(()=>{const fragment=location.hash;const match=fragment.match(/^#neraium-v1=([a-f0-9]{32})_([a-f0-9]{64})$/);history.replaceState(null,'','${path}');if(!match)return;const body=new URLSearchParams({session:match[1],token:match[2]});fetch('${path}/redeem',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,credentials:'same-origin',redirect:'follow'}).then(response=>{if(response.ok&&response.redirected&&new URL(response.url).pathname==='${path}')location.replace('${path}');else document.body.textContent='Authentication link unavailable. Request a new private session.';}).catch(()=>{document.body.textContent='Authentication service unavailable.';});})();`;
  const body = authenticated ? `<p>This synthetic test cannot send email. Public contact stays disabled.</p><p>Session expires at ${new Date(config.expires_at).toISOString()}. The existing limiter allows 5 requests per 60 seconds; the expiry wait naturally clears it. If you see 429, wait 65 seconds and use a fresh challenge.</p><p>The page freezes the exact success token for replay and blocks reused challenge tokens for other scenarios. Complete success, then replay immediately. Reset for each new challenge. The prior provider failure result is retained; reset and solve a fresh challenge before recovery. Reset, solve, capture one unused token, wait 310 seconds, then test expiry. Invalid already has a verified result and need not be repeated. Run validation after the expiry wait.</p><div id="challenge"></div><button id="reset">Reset challenge</button><button id="capture">Capture unused expiry token</button><p id="status">Complete the real challenge manually.</p>${['success','replay','failure','recovery','expiry','invalid','validation'].map(s=>`<button data-scenario="${s}">${s}</button>`).join(' ')}<p>Copy only the sanitized results below to the activation operator. Never copy a token, cookie or password.</p><textarea id="results" rows="20" cols="80" readonly></textarea><script nonce="${nonce}">${script}</script><script nonce="${nonce}" src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onHumanTurnstileReady&render=explicit" async defer></script>`
    : `<p>Authorized operator only. Use the single-use private test link. It is removed from this address before redemption.</p><script nonce="${nonce}">${handoff}</script>`;
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Neraium private contact verification</title><body data-sitekey="${env.TURNSTILE_SITE_KEY}"><h1>Private contact security verification</h1>${body}</body></html>`, { headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': `default-src 'none'; script-src 'nonce-${nonce}' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; form-action 'self'; base-uri 'none'; frame-ancestors 'none'` } });
}
export async function humanProbe(request, env) {
  try {
    const url = new URL(request.url);
    if (url.protocol !== 'https:') return json({ error: 'Not found.' }, 404);
    const config = JSON.parse(env.CONTACT_VERIFICATION_KEY ?? 'null');
    if (!config || !/^[a-f0-9]{32}$/.test(config.session_id) || !/^[a-f0-9]{64}$/.test(config.token_sha256)
      || !Number.isFinite(config.link_expires_at) || !Number.isFinite(config.expires_at)
      || Date.now() >= config.expires_at || config.expires_at > Date.now() + 2400000
      || config.link_expires_at > Date.now() + 1800000 || config.link_expires_at > config.expires_at
      || env.CONTACT_ENABLED !== 'false' || env.CONTACT_RETENTION_APPROVED !== 'false') return json({ error: 'Not found.' }, 404);
    if (!['neraium.com','www.neraium.com'].includes(url.hostname)) return json({ error: 'Not found.' }, 404);
    const cookie = (request.headers.get('cookie') ?? '').split(';').map(s=>s.trim()).find(s=>s.startsWith('__Secure-contact-probe='))?.slice('__Secure-contact-probe='.length) ?? '';
    const authenticated = equal(cookie, config.session_id);
    if (request.method === 'GET' && url.pathname === path) return html(env, config, authenticated);
    if (request.method !== 'POST' || request.headers.get('origin') !== url.origin) return json({ error: 'Rejected.' }, 403);
    if (url.pathname === `${path}/redeem`) {
      if (request.headers.get('content-type')?.split(';')[0] !== 'application/x-www-form-urlencoded') return json({ error: 'Rejected.' }, 415);
      const ip = request.headers.get('CF-Connecting-IP'); if (!ip) return json({ error: 'Unavailable.' }, 503);
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ip));
      const key = Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
      if ((await env.CONTACT_RATE_LIMITER.limit({key:`contact-probe-login:${key}`}))?.success !== true) return json({ error: 'Try later.' }, 429);
      const data = new URLSearchParams(await bounded(request, 1024));
      const session = data.get('session') ?? '', token = data.get('token') ?? '';
      if (!equal(session, config.session_id) || !/^[a-f0-9]{64}$/.test(token) || Date.now() >= config.link_expires_at) return json({ error: 'Link expired or unavailable.' }, 404);
      const tokenDigest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
      const tokenHash = Array.from(new Uint8Array(tokenDigest),b=>b.toString(16).padStart(2,'0')).join('');
      if (!equal(tokenHash, config.token_sha256)) return json({ error: 'Link expired or unavailable.' }, 404);
      const objectId = env.CONTACT_VERIFICATION_SESSIONS.idFromName(config.session_id);
      const consumed = await env.CONTACT_VERIFICATION_SESSIONS.get(objectId).fetch('https://session.invalid/consume', {method:'POST'});
      if (consumed.status !== 204) return json({ error: 'Link expired or unavailable.' }, 404);
      return new Response(null, { status: 303, headers: { ...headers, Location: path,
        'Set-Cookie': `__Secure-contact-probe=${config.session_id}; Secure; HttpOnly; SameSite=Strict; Path=${path}; Max-Age=${Math.floor((config.expires_at-Date.now())/1000)}` } });
    }
    if (!authenticated) return json({ error: 'Not found.' }, 404);
    if (url.pathname !== `${path}/test` || request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({ error:'Rejected.' }, 400);
    const data = JSON.parse(await bounded(request, 4096));
    if (!['success','replay','expiry','failure','recovery','invalid','validation'].includes(data.scenario) || typeof data.token !== 'string' || data.token.length > 2048) return json({ error:'Rejected.' }, 400);
    if (data.scenario === 'expiry' && (!Number.isFinite(data.capturedAgeSeconds) || data.capturedAgeSeconds < 310)) return json({ error: 'Token not aged.' }, 400);
    const payload = { name: 'Neraium contact security verification', email: data.scenario === 'validation' ? 'invalid' : 'craig@neraium.com', organization: 'Neraium', facility: 'Website security verification', token: data.token, 'review-question': 'Synthetic test; no email delivery capability.' };
    const synthetic = new Request(`${url.origin}/api/contact`, { method: 'POST', headers: { Origin: url.origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': request.headers.get('CF-Connecting-IP') ?? '' }, body: JSON.stringify(payload) });
    const isolated = { CONTACT_ENABLED:'true', CONTACT_RETENTION_APPROVED:'true', CONTACT_DELIVERY:'cloudflare',
      CONTACT_FROM:env.CONTACT_FROM, CONTACT_TO:env.CONTACT_TO, CONTACT_HOSTNAMES:env.CONTACT_HOSTNAMES,
      TURNSTILE_SITE_KEY:env.TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY:env.TURNSTILE_SECRET_KEY, CONTACT_RATE_LIMITER:env.CONTACT_RATE_LIMITER,
      EMAIL:{send:async()=>{if(data.scenario==='failure')throw Error();return {messageId:'synthetic-no-email'};}} };
    const result = { scenario:data.scenario, observed_at:new Date().toISOString(), challenge_checked:false, challenge_valid:false, duplicate_or_expired:false };
    const verifier = async (...args) => { const response=await fetch(...args); result.challenge_checked=true; if(response.ok){const checked=await response.clone().json();result.challenge_valid=checked.success===true&&checked.hostname===url.hostname&&checked.action==='evaluation';result.duplicate_or_expired=Array.isArray(checked['error-codes'])&&checked['error-codes'].includes('timeout-or-duplicate');}return response; };
    const response = await handleContact(synthetic, isolated, verifier);
    return json(result, response.status);
  } catch { return json({ error:'Verification unavailable.' }, 503); }
}

export class ContactVerificationSession {
  constructor(state) { this.state = state; }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/consume') return new Response(null, {status:404});
    const accepted = await this.state.storage.transaction(async transaction => {
      if (await transaction.get('single-use-link-consumed')) return false;
      await transaction.put('single-use-link-consumed', Date.now());
      return true;
    });
    return new Response(null, {status:accepted ? 204 : 409});
  }
}
