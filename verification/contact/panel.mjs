export const loginScript = `
const fragment = location.hash;
history.replaceState(null, '', location.pathname);
const match = /^#neraium-isolated-v1=([a-f0-9]{32})_([a-f0-9]{64})$/.exec(fragment);
if (match) {
  fetch('/verify/redeem', { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify({session:match[1],ticket:match[2]}) })
    .then(response => { if(response.ok) location.replace('/verify'); else document.querySelector('#status').textContent='Private link is unavailable or expired.'; })
    .catch(() => { document.querySelector('#status').textContent='Private verification is unavailable.'; });
}
`;

export const panelScript = `
let token = '', successToken = '', capturedToken = '', widget, next = '', pending = false;
const status = document.querySelector('#status'), output = document.querySelector('#evidence');
function display(data) {
  next = data.next_step;
  output.value = JSON.stringify(data, null, 2);
  document.querySelectorAll('[data-step]').forEach(button => { button.disabled = pending || button.dataset.step !== next; });
  status.textContent = data.scenario_checks_complete ? 'Scenario checks recorded. Copy sanitized evidence and confirm your participation to the operator. Production readiness is still unapproved.' : 'Next step: ' + (next || 'unavailable');
}
async function request(path, body) {
  const response = await fetch('/verify/' + path, {method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  const data = await response.json();
  if (!response.ok) throw Error(data.error || 'Test unavailable.');
  return data;
}
async function refresh() { try { display(await request('state', {})); } catch { status.textContent='Session unavailable or expired. Ask the operator for a new private session.'; } }
window.verifierReady = () => { widget = turnstile.render('#challenge', {sitekey:document.body.dataset.sitekey, action:'evaluation', callback:value=>{token=value;}, 'expired-callback':()=>{token='';}, 'error-callback':()=>{token='';status.textContent='Challenge unavailable. Reset and solve it manually.';}}); };
document.querySelector('#reset').onclick = () => { if(pending)return; token=''; if(widget===undefined) window.verifierReady(); else turnstile.reset(widget); };
document.querySelectorAll('[data-step]').forEach(button => { button.onclick = async () => {
  if(pending || button.dataset.step !== next)return;
  const step=button.dataset.step;
  const value=step==='replay'?successToken:step==='expiry'?capturedToken:step==='validation'?'invalid-validation-token':step==='rate-limit'?'isolated-rate-probe-'+crypto.randomUUID():token;
  if(!value){status.textContent='Reset and manually solve a fresh challenge first.';return;}
  pending=true;document.querySelectorAll('[data-step]').forEach(item=>item.disabled=true);
  try {
    if(step==='capture') { const data=await request('capture',{token:value});capturedToken=value;token='';turnstile.remove(widget);widget=undefined;display(data);status.textContent='Unused token captured. Wait at least 310 seconds before expiry. Keep this tab open.'; }
    else { const data=await request('test',{scenario:step,token:value});if(step==='success' && data.results.some(r=>r.scenario==='success'))successToken=value;token='';display(data); }
  } catch(error) {status.textContent=error.message;}
  finally {pending=false;document.querySelectorAll('[data-step]').forEach(item=>item.disabled=item.dataset.step!==next);}
}; });
document.querySelector('#revoke').onclick = async () => { if(pending)return;try{await request('logout',{});document.body.textContent='Private session revoked. Ask the operator to remove the verifier resources.';}catch{status.textContent='Session may be expired. Ask the operator to confirm removal.';} };
refresh();
`;

export function page(siteKey, authenticated, nonce) {
  const steps=['success','replay','failure','recovery','capture','expiry','validation','rate-limit'];
  const body=authenticated ? `<p>Isolated candidate verification. No email can be sent. Live public intake is not connected to this service.</p><ol><li>Manually solve a challenge and run success, then exact-token replay.</li><li>Reset/solve a fresh challenge for synthetic failure; reset/solve another for recovery.</li><li>Reset/solve a fresh challenge, capture it unused, wait 310 seconds, then run expiry.</li><li>Run validation and the isolated rate-limit check.</li><li>Copy sanitized evidence to the operator. No automatic human attestation or production clearance is issued.</li></ol><div id="challenge"></div><button id="reset" type="button">Reset challenge</button><div>${steps.map(s=>`<button type="button" data-step="${s}" disabled>${s}</button>`).join(' ')}</div><label for="evidence">Sanitized server observations</label><textarea id="evidence" rows="20" cols="65" readonly></textarea><button id="revoke" type="button">Revoke private session</button>` : '<p>Open the one-use private link supplied through your agreed private channel. Credentials must not be pasted into chat or shared in screenshots.</p>';
  const challengeScript=authenticated ? `<script nonce="${nonce}" src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=verifierReady&render=explicit" async defer></script>` : '';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Neraium private security verifier</title><style nonce="${nonce}">body{font:16px/1.65 system-ui,sans-serif;max-width:860px;margin:32px auto;padding:0 20px;background:#101b26;color:#edf5f8}button{min-height:44px;margin:8px 8px 8px 0;padding:10px 16px;cursor:pointer}button:disabled{cursor:default}textarea{display:block;box-sizing:border-box;width:100%;max-width:100%;margin:16px 0;font:12px/1.6 monospace}label{display:block;margin-top:24px}:focus-visible{outline:3px solid #6fddcc;outline-offset:3px}h1{line-height:1.2}#status{overflow-wrap:anywhere}</style></head><body data-sitekey="${authenticated?siteKey:''}"><main><h1>Private contact security verification</h1><p id="status" role="status" aria-live="polite">${authenticated?'Loading session…':'Authentication required.'}</p>${body}</main><script nonce="${nonce}">${authenticated?panelScript:loginScript}</script>${challengeScript}</body></html>`;
}
