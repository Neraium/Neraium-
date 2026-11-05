import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createVerifier} from '../verification/contact/index.mjs';
import {IsolatedVerificationSession} from '../verification/contact/session.mjs';
import {loginScript,panelScript} from '../verification/contact/panel.mjs';
import {validateIsolatedConfig,validateIsolatedEnableTransition,validateIsolatedRetirementConfig,reviewIsolatedVerifier} from '../scripts/review-isolated-verifier.mjs';
const sha=value=>createHash('sha256').update(value).digest('hex');
const host='neraium-contact-verifier.fixture.workers.dev',origin='https://'+host;
const ticket='c'.repeat(64),cookie='d'.repeat(64),id='b'.repeat(32);
class Storage{
  values=new Map();queue=Promise.resolve();
  async transaction(fn){let release;const previous=this.queue;this.queue=new Promise(r=>release=r);await previous;try{return await fn({get:async key=>structuredClone(this.values.get(key)),put:async(key,value)=>this.values.set(key,structuredClone(value))});}finally{release();}}
  async setAlarm(value){this.alarm=value;}
  async deleteAll(){this.values.clear();}
}
function fixture(){
  let now=Date.now(),calls=0,limitAfter=Infinity,network=[];const storage=new Storage(),session=new IsolatedVerificationSession({storage});session.now=()=>now;
  const used=new Set();let challengeMode='normal';
  const env={VERIFIER_ENABLED:'true',VERIFIER_HOSTNAME:host,TURNSTILE_SITE_KEY:'fixture-site-key-0000000000',TURNSTILE_SECRET_KEY:'fixture-secret-key-000000000',
    VERIFIER_ACCESS:JSON.stringify({session_id:id,ticket_sha256:sha(ticket),cookie_token:cookie,issued_at:now,link_expires_at:now+600000,expires_at:now+1200000}),
    VERIFIER_RATE_LIMITER:{limit:async()=>({success:++calls<=limitAfter})},
    VERIFIER_SESSIONS:{idFromName:name=>{assert.equal(name,id);return name;},get:()=>({fetch:r=>session.fetch(r)})}};
  const worker=createVerifier({now:()=>now,verifyFetch:async(url,options)=>{assert.equal(url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');assert.equal(options.redirect,'manual');network.push(url);const token=JSON.parse(options.body).response;
    if(challengeMode==='malformed')return Response.json({});
    if(challengeMode==='invalid-secret')return Response.json({success:false,'error-codes':['invalid-input-secret']});
    if(challengeMode==='wrong-context')return Response.json({success:true,hostname:'another-origin.workers.dev',action:'evaluation'});
    if(challengeMode==='redirect')return new Response(null,{status:302,headers:{Location:'https://mail.example/blocked'}});
    if(challengeMode==='error')throw Error('credential-containing error must not escape');
    const success=challengeMode!=='expired'&&!used.has(token);used.add(token);return Response.json({success,hostname:host,action:'evaluation',...(!success?{'error-codes':['timeout-or-duplicate']}:{})});}});
  const request=(suffix='',body,auth=false,options={})=>new Request(origin+'/verify'+suffix,{method:body===undefined?'GET':'POST',headers:{Origin:options.origin??origin,'Content-Type':options.type??'application/json','CF-Connecting-IP':'192.0.2.10',...(auth?{Cookie:'__Secure-neraium-isolated-verifier='+cookie}:{}),...options.headers},...(body!==undefined?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
  const send=(suffix,body,auth=true,options)=>worker.fetch(request(suffix,body,auth,options),env);
  const redeem=()=>send('/redeem',{session:id,ticket},false);
  return{env,worker,storage,session,request,send,redeem,network,advance:ms=>{now+=ms;},mode:value=>{challengeMode=value;},rateAfter:value=>{calls=0;limitAfter=value;}};
}
const testStep=async(f,scenario,token)=>{const r=await f.send('/test',{scenario,token});return{status:r.status,...await r.json()};};
async function throughRecovery(f){assert.equal((await f.redeem()).status,200);for(const[scenario,token]of [['success','success-token'],['replay','success-token'],['failure','failure-token'],['recovery','recovery-token']]){const result=await testStep(f,scenario,token);assert.equal(result.status,200);assert(result.results.some(r=>r.scenario===scenario));}}

test('dedicated disabled config and source identity pass strict local review; dangerous surfaces fail closed',async()=>{
 const config=JSON.parse(await readFile('verification/contact/wrangler.jsonc')),production=JSON.parse(await readFile('wrangler.jsonc'));
 assert.equal((await reviewIsolatedVerifier()).existing_production_gate_accepts_isolated_evidence,false);
 for(const mutate of [c=>{c.routes=[{pattern:'neraium.com/*'}];},c=>{c.assets={directory:'../../dist'};},c=>{c.send_email=[{name:'EMAIL'}];},c=>{c.name='website';},c=>{c.account_id='wrong-account';},c=>{c.ratelimits[0].namespace_id='1001';},c=>{c.durable_objects.bindings[0].class_name='ContactVerificationSession';},c=>{c.migrations=production.migrations;},c=>{c.vars.CONTACT_ENABLED='false';},c=>{c.secrets.required.push('ZOHO_REFRESH_TOKEN');},c=>{c.observability.enabled=true;}]){const changed=structuredClone(config);mutate(changed);assert.throws(()=>validateIsolatedConfig(changed,production),/held/);}
 assert.throws(()=>validateIsolatedConfig(config,production,{deploymentCandidate:true}),/disabled/);
 const live=structuredClone(config);Object.assign(live.vars,{VERIFIER_ENABLED:'true',VERIFIER_HOSTNAME:host,TURNSTILE_SITE_KEY:production.vars.TURNSTILE_SITE_KEY});assert.throws(()=>validateIsolatedConfig(live,production,{deploymentCandidate:true}),/production Turnstile/);
});
test('unauthenticated access cannot reach state/challenges; ticket redemption is one-use and scoped',async()=>{
 const f=fixture();const page=await f.worker.fetch(f.request(),f.env);const html=await page.text();assert(!html.includes('turnstile.render'));assert(!html.includes(ticket));assert(!html.includes(cookie));assert.equal((await f.send('/state',{},false)).status,404);
 const responses=await Promise.all([f.redeem(),f.redeem()]);assert.deepEqual(responses.map(r=>r.status).sort(),[200,404]);
 const header=responses.find(r=>r.status===200).headers.get('set-cookie');for(const flag of ['Secure','HttpOnly','SameSite=Strict','Path=/verify'])assert(header.includes(flag));assert.equal(f.network.length,0);
 assert.equal((await f.send('/state',{},true,{headers:{Cookie:'__Secure-neraium-isolated-verifier='+id}})).status,404);
});
test('fragment credential is removed before same-origin POST and never placed in a query string',async()=>{
 const order=[];let posted;const context={location:{hash:`#neraium-isolated-v1=${id}_${ticket}`,pathname:'/verify',replace:url=>{assert.equal(url,'/verify');order.push('redirect');}},history:{replaceState:(_a,_b,url)=>{assert.equal(url,'/verify');order.push('clean');}},fetch:async(url,options)=>{assert.equal(url,'/verify/redeem');posted=options;order.push('fetch');return{ok:true};},document:{querySelector:()=>({textContent:''})}};
 runInNewContext(loginScript,context);await new Promise(r=>setImmediate(r));assert.deepEqual(order,['clean','fetch','redirect']);assert.equal(posted.credentials,'same-origin');assert.equal(JSON.parse(posted.body).ticket,ticket);
});
test('disabled, wrong host, HTTP, malformed config, test keys, long sessions, and mail bindings fail closed',async()=>{
 for(const mutate of [e=>{e.VERIFIER_ENABLED='false';},e=>{e.VERIFIER_HOSTNAME='neraium.com';},e=>{e.VERIFIER_ACCESS='{';},e=>{e.VERIFIER_ACCESS='null';},e=>{e.TURNSTILE_SITE_KEY='1x00000000000000000000AA';},e=>{const c=JSON.parse(e.VERIFIER_ACCESS);c.expires_at+=1200001;e.VERIFIER_ACCESS=JSON.stringify(c);},e=>{Object.defineProperty(e,'EMAIL',{enumerable:true,get(){throw Error('Mail capability read');}});},e=>{e.ZOHO_REFRESH_TOKEN='forbidden';}]){const f=fixture();mutate(f.env);assert.equal((await f.worker.fetch(f.request(),f.env)).status,404);assert.equal(f.network.length,0);}
 const f=fixture();assert.equal((await f.worker.fetch(new Request('http://'+host+'/verify'),f.env)).status,404);assert.equal((await f.worker.fetch(new Request('https://neraium.com/verify'),f.env)).status,404);assert.equal((await f.worker.fetch(new Request(origin+'/verify?ticket=unwanted'),f.env)).status,404);
});
test('CSRF, wrong ticket, excessive input, missing IP and login rate rejection do not grant access',async()=>{
 const f=fixture();assert.equal((await f.send('/redeem',{session:id,ticket},false,{origin:'https://evil.example'})).status,403);
 assert.equal((await f.send('/redeem',{session:id,ticket:'f'.repeat(64)},false)).status,404);
 assert.equal((await f.send('/redeem','x'.repeat(4097),false)).status,503);
 assert.equal((await f.send('/redeem',{session:id,ticket},false,{headers:{'CF-Connecting-IP':''}})).status,503);
 f.rateAfter(0);assert.equal((await f.redeem()).status,429);assert.equal(f.storage.values.get('session').consumed,false);
});
test('full server-owned synthetic sequence enforces exact replay, fresh tokens, genuine expiry duration and no-mail evidence',async()=>{
 const f=fixture();await throughRecovery(f);
 assert.equal((await f.send('/capture',{token:'recovery-token'})).status,409);
 assert.equal((await f.send('/capture',{token:'captured-unused-token'})).status,200);
 assert.equal((await testStep(f,'expiry','captured-unused-token')).status,409);
 f.advance(310000);f.mode('expired');const expiry=await testStep(f,'expiry','captured-unused-token');assert.equal(expiry.status,200);assert.equal(expiry.results.at(-1).captured_age_seconds,310);assert.equal(expiry.results.at(-1).challenge_valid,false);
 const validation=await testStep(f,'validation','invalid-token');assert.equal(validation.results.at(-1).challenge_checked,false);
 f.rateAfter(3);const complete=await testStep(f,'rate-limit','rate-probe');assert.equal(complete.scenario_checks_complete,true);assert(complete.rate_limit_statuses.includes(429));assert.equal(complete.results.length,6);assert.equal(complete.candidate_only,true);assert(!Object.hasOwn(complete,'human_operated'));
 const serialized=JSON.stringify(complete)+JSON.stringify([...f.storage.values.values()]);for(const sensitive of [ticket,cookie,'success-token','failure-token','recovery-token','captured-unused-token'])assert(!serialized.includes(sensitive));assert(f.network.every(u=>u==='https://challenges.cloudflare.com/turnstile/v0/siteverify'));
});
test('scenario order, token reuse and parallel attempts cannot manufacture evidence',async()=>{
 const f=fixture();await f.redeem();assert.equal((await testStep(f,'recovery','x')).status,409);
 await testStep(f,'success','first-token');assert.equal((await testStep(f,'replay','different-token')).status,409);await testStep(f,'replay','first-token');assert.equal((await testStep(f,'failure','first-token')).status,409);
 const attempts=await Promise.all([testStep(f,'failure','new-token-a'),testStep(f,'failure','new-token-b')]);assert.equal(attempts.filter(r=>r.status===200).length,1);assert.equal(attempts.filter(r=>r.status===409).length,1);
});
test('network/redirect failures never follow provider URLs or produce a passed observation',async()=>{
 for(const mode of ['redirect','error']){const f=fixture();await f.redeem();f.mode(mode);const r=await testStep(f,'success','sensitive-value');assert.equal(r.results.length,0);assert.equal(r.next_step,'success');assert.equal(r.attempts[0].passed,false);assert(!JSON.stringify(r).includes('sensitive-value'));assert.equal(f.network.length,1);}
});
test('revocation, fixed expiry, expired redemption and storage alarm remove access',async()=>{
 const f=fixture();await f.redeem();assert.equal((await f.send('/logout',{})).status,200);assert.equal((await f.worker.fetch(f.request('',undefined,true),f.env)).status,404);assert.equal((await f.send('/state',{})).status,404);
 const old=fixture();old.advance(600001);assert.equal((await old.redeem()).status,404);
 const expired=fixture();await expired.redeem();expired.advance(1200001);assert.equal((await expired.send('/state',{})).status,404);await expired.session.alarm();assert.equal(expired.storage.values.size,0);
});

test('retirement removes only the isolated Worker capabilities and appends its own deletion ledger',async()=>{
 const before=JSON.parse(await readFile('verification/contact/wrangler.jsonc')),after=JSON.parse(await readFile('verification/contact/wrangler.retire.jsonc')),production=JSON.parse(await readFile('wrangler.jsonc'));
 assert.equal(validateIsolatedRetirementConfig(before,after,production).retirement_only,true);
 for(const mutate of [c=>{c.name=production.name;},c=>{c.migrations=production.migrations;},c=>{c.migrations.shift();},c=>{c.durable_objects=before.durable_objects;},c=>{c.routes=[];}]){const changed=structuredClone(after);mutate(changed);assert.throws(()=>validateIsolatedRetirementConfig(before,changed,production),/retirement/);}
 const tombstone=(await import('../verification/contact/retire.mjs')).default;assert.equal(tombstone.fetch(new Request('https://example.invalid/verify')).status,404);
});

test('a captured expiry token cannot be retried after an unexpected valid result or consumed request',async()=>{
 const f=fixture();await throughRecovery(f);await f.send('/capture',{token:'fresh-capture'});f.advance(310000);const failed=await testStep(f,'expiry','fresh-capture');assert.equal(failed.results.length,4);assert.equal(failed.attempts.at(-1).passed,false);assert.equal(failed.attempts.at(-1).provider_success,true);
 f.mode('expired');const retry=await testStep(f,'expiry','fresh-capture');assert.equal(retry.status,409);assert.match(retry.error,/already been attempted/);
});

test('browser validation and rate-probe controls use distinct synthetic tokens and permit a fresh rate-probe identifier',async()=>{
 const buttons=['validation','rate-limit'].map(step=>({dataset:{step},disabled:false})),status={textContent:''},output={value:''},reset={},revoke={},posted=[];
 const snapshot=next=>({next_step:next,results:[],scenario_checks_complete:next===null});
 const context={document:{querySelector:s=>s==='#status'?status:s==='#evidence'?output:s==='#reset'?reset:s==='#revoke'?revoke:null,querySelectorAll:()=>buttons},window:{},crypto:{randomUUID:()=> 'fixture-rate-identifier'},fetch:async(url,options)=>{if(url.endsWith('/state'))return Response.json(snapshot('validation'));const data=JSON.parse(options.body);posted.push(data);return Response.json(snapshot(data.scenario==='validation'?'rate-limit':null));}};
 runInNewContext(panelScript,context);await new Promise(r=>setImmediate(r));await buttons[0].onclick();await buttons[1].onclick();
 assert.equal(posted.length,2);assert.notEqual(posted[0].token,posted[1].token);assert.match(posted[1].token,/^isolated-rate-probe-/);
});

test('a valid provider token for the wrong hostname cannot be reported as expiry',async()=>{
 const f=fixture();await throughRecovery(f);await f.send('/capture',{token:'wrong-context-capture'});f.advance(310000);f.mode('wrong-context');const result=await testStep(f,'expiry','wrong-context-capture');assert.equal(result.results.length,4);assert.equal(result.attempts.at(-1).http_status,400);assert.equal(result.attempts.at(-1).provider_success,true);assert.equal(result.attempts.at(-1).context_matches,false);assert.equal(result.attempts.at(-1).passed,false);
});

test('malformed provider responses or invalid-secret failures cannot qualify captured expiry',async()=>{
 for(const mode of ['malformed','invalid-secret']){const f=fixture();await throughRecovery(f);await f.send('/capture',{token:'capture-'+mode});f.advance(310000);f.mode(mode);const result=await testStep(f,'expiry','capture-'+mode);assert.equal(result.results.length,4);assert.equal(result.attempts.at(-1).passed,false);if(mode==='malformed'){assert.equal(result.attempts.at(-1).challenge_checked,false);assert.equal(result.attempts.at(-1).provider_success,null);}else assert.equal(result.attempts.at(-1).duplicate_or_expired,false);}
});

test('configured staging and enable transition preserve all inputs except the dedicated flag',async()=>{
 const c=JSON.parse(await readFile('verification/contact/wrangler.jsonc')),production=JSON.parse(await readFile('wrangler.jsonc'));
 Object.assign(c.vars,{VERIFIER_HOSTNAME:host,TURNSTILE_SITE_KEY:'independent-widget-site-key-00000'});const enabled=structuredClone(c);enabled.vars.VERIFIER_ENABLED='true';
 assert.equal(validateIsolatedEnableTransition(c,enabled,production).production_gate_satisfied,false);
 const changed=structuredClone(enabled);changed.vars.TURNSTILE_SITE_KEY='another-widget-site-key-000000';assert.throws(()=>validateIsolatedEnableTransition(c,changed,production),/only/);
 assert.throws(()=>validateIsolatedConfig(JSON.parse('{}'),production,{configuredInputs:true}),/surface/);
});
