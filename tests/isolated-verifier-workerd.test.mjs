import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
const host='neraium-contact-verifier.fixture.workers.dev',origin='https://'+host;
const ticket='c'.repeat(64),cookie='d'.repeat(64),sessionId='b'.repeat(32);
const sha=s=>createHash('sha256').update(s).digest('hex');
const moduleFiles=['verification/contact/index.mjs','verification/contact/session.mjs','verification/contact/panel.mjs','verification/contact/subject-identity.mjs','worker/contact.mjs','worker/zoho-mail.mjs'];
const modules=await Promise.all(moduleFiles.map(async path=>({type:'ESModule',path:resolve(path),contents:await readFile(path,'utf8')})));
async function runtime(outboundService,run){
 const now=Date.now();
 const mf=new Miniflare(convertV4MiniflareOptions({host:'127.0.0.1',cf:false,telemetry:{enabled:false},compatibilityDate:'2026-08-05',
  modules,durableObjects:{VERIFIER_SESSIONS:{className:'IsolatedVerificationSession',useSQLite:true}},
  ratelimits:{VERIFIER_RATE_LIMITER:{namespace_id:'20261105',simple:{limit:100,period:60}}},
  bindings:{VERIFIER_ENABLED:'true',VERIFIER_HOSTNAME:host,TURNSTILE_SITE_KEY:'fixture-site-key-0000000000',TURNSTILE_SECRET_KEY:'fixture-secret-key-000000000',VERIFIER_ACCESS:JSON.stringify({session_id:sessionId,ticket_sha256:sha(ticket),cookie_token:cookie,issued_at:now,link_expires_at:now+600000,expires_at:now+1200000})},outboundService}));
 const send=(suffix,body,auth=false)=>mf.dispatchFetch(origin+'/verify'+suffix,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.123',...(auth?{Cookie:'__Secure-neraium-isolated-verifier='+cookie}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
 try{return await run(send,mf);}finally{await mf.dispose();}
}

test('workerd SQLite one-use redemption, isolated success/failure/recovery and zero mail egress',async()=>{
 const calls=[],used=new Set();
 await runtime(async request=>{calls.push(request.url);assert.equal(request.url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');const token=(await request.json()).response;const success=!used.has(token);used.add(token);return Response.json({success,hostname:host,action:'evaluation',...(!success?{'error-codes':['timeout-or-duplicate']}:{})});},async send=>{
  const login=await send('');assert.equal(login.status,200);assert(! (await login.text()).includes(ticket));
  assert.equal((await send('/state',{},true)).status,404);
  const double=await Promise.all([send('/redeem',{session:sessionId,ticket}),send('/redeem',{session:sessionId,ticket})]);assert.deepEqual(double.map(r=>r.status).sort(),[200,404]);
  for(const[scenario,token]of [['success','fixture-success'],['replay','fixture-success'],['failure','fixture-failure'],['recovery','fixture-recovery']]){const r=await send('/test',{scenario,token},true);assert.equal(r.status,200);const result=await r.json();assert(result.results.some(x=>x.scenario===scenario));assert(!JSON.stringify(result).includes(token));}
  assert.equal((await send('/logout',{},true)).status,200);assert.equal((await send('/state',{},true)).status,404);
 });assert.equal(calls.length,4);assert(calls.every(url=>url==='https://challenges.cloudflare.com/turnstile/v0/siteverify'));
});
test('workerd challenge redirects fail closed without following or sending credentials to another host',async()=>{
 const calls=[];await runtime(async request=>{calls.push(request.url);return new Response(null,{status:302,headers:{Location:'https://not-allowed.invalid/leak'}});},async send=>{
  assert.equal((await send('/redeem',{session:sessionId,ticket})).status,200);
  const r=await send('/test',{scenario:'success',token:'fixture-token'},true);const result=await r.json();assert.equal(result.results.length,0);assert.equal(result.next_step,'success');assert.equal(result.attempts[0].passed,false);
 });assert.deepEqual(calls,['https://challenges.cloudflare.com/turnstile/v0/siteverify']);
});
