import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {chromium} from 'playwright';
const origin='https://neraium-contact-verifier.fixture.workers.dev',host=new URL(origin).hostname;
const ticket='c'.repeat(64),cookie='d'.repeat(64),id='b'.repeat(32),sha=s=>createHash('sha256').update(s).digest('hex');
const moduleFiles=['verification/contact/index.mjs','verification/contact/session.mjs','verification/contact/panel.mjs','verification/contact/subject-identity.mjs','worker/contact.mjs','worker/zoho-mail.mjs'];
const modules=await Promise.all(moduleFiles.map(async path=>({type:'ESModule',path:resolve(path),contents:await readFile(path,'utf8')})));
for(const width of [320,1440])test(`local browser fixture ${width}px: private link, manual controls, sanitized evidence, focus and revocation`,async()=>{
 const now=Date.now(),seen=new Set();
 const mf=new Miniflare(convertV4MiniflareOptions({host:'127.0.0.1',cf:false,telemetry:{enabled:false},compatibilityDate:'2026-08-05',modules,
  durableObjects:{VERIFIER_SESSIONS:{className:'IsolatedVerificationSession',useSQLite:true}},
  ratelimits:{VERIFIER_RATE_LIMITER:{namespace_id:'20261105',simple:{limit:100,period:60}}},
  bindings:{VERIFIER_ENABLED:'true',VERIFIER_HOSTNAME:host,TURNSTILE_SITE_KEY:'fixture-site-key-0000000000',TURNSTILE_SECRET_KEY:'fixture-secret-key-000000000',VERIFIER_ACCESS:JSON.stringify({session_id:id,ticket_sha256:sha(ticket),cookie_token:cookie,issued_at:now,link_expires_at:now+600000,expires_at:now+1200000})},
  outboundService:async request=>{assert.equal(request.url,'https://challenges.cloudflare.com/turnstile/v0/siteverify');const token=(await request.json()).response,success=!seen.has(token);seen.add(token);return Response.json({success,hostname:host,action:'evaluation',...(!success?{'error-codes':['timeout-or-duplicate']}:{})});}}));
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const r=route.request();
   if(r.url().startsWith('https://challenges.cloudflare.com/turnstile/v0/api.js'))return route.fulfill({contentType:'application/javascript',body:`let n=0;window.turnstile={render:(_selector,options)=>{const b=document.createElement('button');b.id='fixture-solve';b.textContent='Solve local fixture challenge';b.onclick=()=>options.callback('fixture-browser-token-'+(++n));document.querySelector('#challenge').appendChild(b);return 1;},reset:()=>{},remove:()=>{document.querySelector('#challenge').replaceChildren();}};window.verifierReady();`});
   if(r.url()===origin+'/__audit/axe.js')return route.fulfill({contentType:'application/javascript',body:await readFile('node_modules/axe-core/axe.min.js','utf8')});
   assert.equal(new URL(r.url()).origin,origin,'Unexpected browser egress');
   const response=await mf.dispatchFetch(r.url(),{method:r.method(),headers:{...r.headers(),'CF-Connecting-IP':'192.0.2.19'},...(r.postDataBuffer()?{body:r.postDataBuffer()}:{})});
   await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
  });
  await page.goto(origin+'/verify#neraium-isolated-v1='+id+'_'+ticket);
  await page.waitForFunction(()=>document.querySelector('#evidence')?.value.includes('success'));
  assert.equal(page.url(),origin+'/verify');
  await page.locator('#fixture-solve').click();await page.getByRole('button',{name:'success',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#evidence').value.includes('"next_step": "replay"'));
  await page.getByRole('button',{name:'replay',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#evidence').value.includes('"next_step": "failure"'));
  for(const scenario of ['failure','recovery']){await page.getByRole('button',{name:'Reset challenge',exact:true}).click();await page.locator('#fixture-solve').click();await page.getByRole('button',{name:scenario,exact:true}).click();const next=scenario==='failure'?'recovery':'capture';await page.waitForFunction(next=>document.querySelector('#evidence').value.includes('"next_step": "'+next+'"'),next);}
  const exported=await page.locator('#evidence').inputValue();assert.equal(JSON.parse(exported).results.length,4);assert(!exported.includes('fixture-browser-token'));assert(!exported.includes(cookie));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  // Audit fixture injection uses the existing nonce, without weakening the served CSP.
  const nonce=await page.locator('script[nonce]').first().evaluate(e=>e.nonce);
  await page.evaluate(({url,nonce})=>new Promise((resolve,reject)=>{const script=document.createElement('script');script.nonce=nonce;script.src=url;script.onload=resolve;script.onerror=reject;document.head.appendChild(script);}),{url:origin+'/__audit/axe.js',nonce});
  const audit=await page.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}}));
  assert.deepEqual(audit.violations.map(v=>v.id),[]);
  await page.getByRole('button',{name:'Revoke private session'}).focus();assert.equal(await page.getByRole('button',{name:'Revoke private session'}).evaluate(e=>e===document.activeElement),true);
  await mkdir('.planning/isolated-verifier-20261105',{recursive:true});await page.screenshot({path:`.planning/isolated-verifier-20261105/panel-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Revoke private session'}).click();await page.getByText('Private session revoked.',{exact:false}).waitFor();
  assert.deepEqual(errors,[]);
 }finally{await browser.close();await mf.dispose();}
});
