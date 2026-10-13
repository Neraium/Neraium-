import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { ContactVerificationSession, humanProbe } from '../.planning/contact-activation/human-probe.mjs';

const token='c'.repeat(64); // Fabricated fixture only.
const sessionId='b'.repeat(32);
const tokenHash=createHash('sha256').update(token).digest('hex');
const now=Date.now();
class Storage {
  values=new Map(); queue=Promise.resolve();
  async transaction(fn) {
    let release; const previous=this.queue; this.queue=new Promise(resolve=>release=resolve); await previous;
    try { return await fn({get:key=>this.values.get(key),put:(key,value)=>this.values.set(key,value)}); }
    finally { release(); }
  }
}
const state=()=>{const sessionStore=new ContactVerificationSession({storage:new Storage()});return {CONTACT_VERIFICATION_KEY:JSON.stringify({session_id:sessionId,token_sha256:tokenHash,link_expires_at:now+600000,expires_at:now+1200000}),CONTACT_ENABLED:'false',CONTACT_RETENTION_APPROVED:'false',CONTACT_FROM:'website@neraium.com',CONTACT_TO:'craig@neraium.com',CONTACT_HOSTNAMES:'neraium.com,www.neraium.com',TURNSTILE_SITE_KEY:'local-fixture-site',TURNSTILE_SECRET_KEY:'local-fixture-secret',CONTACT_RATE_LIMITER:{limit:async()=>({success:true})},CONTACT_VERIFICATION_SESSIONS:{idFromName:name=>name,get:id=>({fetch:(url,init)=>{assert.equal(id,sessionId);return sessionStore.fetch(new Request(url,init));}})},_testSessionStore:sessionStore,get EMAIL(){throw Error('Real mail binding accessed');},get ZOHO_CLIENT_ID(){throw Error('Zoho credentials accessed');}};};
const request=(suffix='',method='GET',{body,cookie,origin='https://neraium.com',contentType}={})=>new Request(`https://neraium.com/api/contact-verification${suffix}`,{method,headers:{...(origin?{Origin:origin}:{}),...(contentType?{'Content-Type':contentType}:{}),...(cookie?{Cookie:`__Secure-contact-probe=${cookie}`}:{ }),'CF-Connecting-IP':'192.0.2.1'},...(body!==undefined?{body}:{})});
const redeem=(value=token,id=sessionId)=>request('/redeem','POST',{body:new URLSearchParams({session:id,token:value}),contentType:'application/x-www-form-urlencoded'});

test('fragment handoff is stripped before a credentialed same-origin fetch and never rendered into HTML',async()=>{
  const response=await humanProbe(request(),state());
  const html=await response.text();
  assert.equal(response.status,200);
  assert(!html.includes(token));
  assert(!html.includes('type="password"'));
  const script=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];
  const order=[];let posted;
  const location={hash:`#neraium-v1=${sessionId}_${token}`,pathname:'/api/contact-verification',search:'',replace:url=>{assert.equal(url,'/api/contact-verification');order.push('redirect');}};
  const context={location,history:{replaceState:(_a,_b,url)=>{assert.equal(url,'/api/contact-verification');order.push('clean');}},URL,URLSearchParams,
    fetch:async(url,init)=>{order.push('fetch');posted={url,init};return {ok:true,redirected:true,url:'https://neraium.com/api/contact-verification',status:200};},
    document:{body:{textContent:''}}};
  runInNewContext(script,context);
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(order,['clean','fetch','redirect']);
  assert.equal(posted.url,'/api/contact-verification/redeem');
  assert.equal(posted.init.method,'POST');
  assert.equal(posted.init.credentials,'same-origin');
  assert.equal(posted.init.redirect,'follow');
  assert.equal(posted.init.headers['Content-Type'],'application/x-www-form-urlencoded');
  const body=new URLSearchParams(posted.init.body);
  assert.deepEqual([body.get('session'),body.get('token')],[sessionId,token]);
});

test('link redemption returns a clean redirect and an HTTP-only scoped session cookie',async()=>{
  const response=await humanProbe(redeem(),state());
  assert.equal(response.status,303);
  assert.equal(response.headers.get('location'),'/api/contact-verification');
  const cookie=response.headers.get('set-cookie');
  for(const flag of ['HttpOnly','Secure','SameSite=Strict','Path=/api/contact-verification'])assert(cookie.includes(flag));
  const page=await humanProbe(request('', 'GET',{cookie:sessionId}),state());
  assert.equal(page.status,200);assert((await page.text()).includes('This synthetic test cannot send email.'));
});

test('durable one-use marker atomically allows only one concurrent redemption',async()=>{
  const oneUse=new ContactVerificationSession({storage:new Storage()});
  const results=await Promise.all([oneUse.fetch(new Request('https://session.invalid/consume',{method:'POST'})),oneUse.fetch(new Request('https://session.invalid/consume',{method:'POST'}))]);
  assert.deepEqual(results.map(r=>r.status).sort(),[204,409]);
  assert.equal((await oneUse.fetch(new Request('https://session.invalid/consume',{method:'POST'}))).status,409);
});

test('wrong, expired, cross-origin and rate-limited links fail closed',async()=>{
  const fresh=state();
  assert.equal((await humanProbe(redeem('d'.repeat(64)),fresh)).status,404);
  assert.equal((await humanProbe(redeem(token,'a'.repeat(32)),fresh)).status,404);
  assert.equal((await humanProbe(request('/redeem','POST',{body:new URLSearchParams({session:sessionId,token}),contentType:'application/x-www-form-urlencoded',origin:'https://other.example'}),fresh)).status,403);
  const expired=state();expired.CONTACT_VERIFICATION_KEY=JSON.stringify({session_id:sessionId,token_sha256:tokenHash,link_expires_at:Date.now()-1,expires_at:Date.now()+600000});
  assert.equal((await humanProbe(redeem(),expired)).status,404);
  const limited=state();limited.CONTACT_RATE_LIMITER.limit=async()=>({success:false});
  assert.equal((await humanProbe(redeem(),limited)).status,429);
  assert.equal(fresh._testSessionStore.state.storage.values.has('single-use-link-consumed'),false);
});

test('success, synthetic failure and recovery never access production mail capabilities',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({success:true,hostname:'neraium.com',action:'evaluation'});
  try {for(const [scenario,status]of [['success',200],['failure',502],['recovery',200]]){
    const response=await humanProbe(request('/test','POST',{body:JSON.stringify({scenario,token:'fixture-token'}),contentType:'application/json',cookie:sessionId}),state());assert.equal(response.status,status);const metadata=await response.json();assert.equal(metadata.challenge_valid,true);assert(!JSON.stringify(metadata).includes('fixture-token'));
  }}finally{globalThis.fetch=original;}
});

test('human test panel freezes the exact replay token and requires distinct fresh tokens for later scenarios',async()=>{
  const env=state();
  const response=await humanProbe(request('', 'GET',{cookie:sessionId}),env);
  const html=await response.text();
  const script=html.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1];
  const names=['success','replay','failure','recovery','expiry','invalid','validation'];
  const buttons=names.map(name=>({dataset:{scenario:name},disabled:false,onclick:null}));
  const status={textContent:''},output={value:''},reset={onclick:null},capture={onclick:null};
  let callback,removed=false;
  const sent=[];
  const context={document:{body:{dataset:{sitekey:'fixture-site'}},querySelector:s=>s==='#status'?status:s==='#results'?output:s==='#reset'?reset:s==='#capture'?capture:null,querySelectorAll:()=>buttons},window:{},location:{hostname:'neraium.com'},
    turnstile:{render:(_selector,settings)=>{callback=settings.callback;return 1;},reset:()=>{},remove:()=>{removed=true;}},
    fetch:async(_url,init)=>{const data=JSON.parse(init.body);sent.push(data);const statusByScenario={success:200,replay:400,failure:502,recovery:200};return Response.json({observed_at:new Date().toISOString(),challenge_checked:['success','replay','failure','recovery'].includes(data.scenario),challenge_valid:['success','failure','recovery'].includes(data.scenario),duplicate_or_expired:data.scenario==='replay'}, {status:statusByScenario[data.scenario]??400});}};
  runInNewContext(script,context);
  context.window.onHumanTurnstileReady();
  const button=name=>buttons.find(item=>item.dataset.scenario===name);
  callback('fixture-success-token');
  await button('success').onclick();
  callback('fixture-auto-refresh-token');
  await button('replay').onclick();
  assert.equal(sent[0].token,'fixture-success-token');
  assert.equal(sent[1].token,'fixture-success-token');
  await button('failure').onclick();
  assert.equal(sent.length,2,'failure must require a reset after success/replay');
  assert.match(status.textContent,/Reset and complete a fresh challenge/);
  reset.onclick();callback('fixture-premature-recovery-token');await button('recovery').onclick();
  assert.equal(sent.length,2,'recovery must require a synthetic failure in this session');
  assert.match(status.textContent,/Run the synthetic failure/);
  reset.onclick();callback('fixture-failure-token');await button('failure').onclick();
  assert.equal(sent[2].token,'fixture-failure-token');
  await button('recovery').onclick();
  assert.equal(sent.length,3,'recovery must require a fresh challenge after failure');
  reset.onclick();callback('fixture-recovery-token');await button('recovery').onclick();
  assert.equal(sent[3].token,'fixture-recovery-token');
  reset.onclick();callback('fixture-expiry-token');capture.onclick();
  assert.equal(removed,true,'the unused expiry token is isolated from later scenarios');
  assert.deepEqual(sent.map(item=>item.scenario),['success','replay','failure','recovery']);
  assert(!JSON.stringify(output.value).includes('fixture-'));
});
