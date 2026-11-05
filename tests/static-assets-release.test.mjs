import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertCandidate, assertUnchanged, controls, fingerprint, settingsFingerprint, versionForm, request, approvedBytes } from '../scripts/deploy-static-assets.mjs';

test('approved package comparison handles existing image assets larger than one MiB',async()=>{
  const path='assets/images/diagram-threshold-vs-relationships.jpg';
  const original=approvedBytes(path);
  assert(original.length>1024*1024);
  assert.deepEqual(original,await readFile(path));
});

function fixture() {
  const previous={number:42,resources:{script:{etag:'same-deployed-script-content',handlers:['fetch'],last_deployed_from:'wrangler'},script_runtime:{compatibility_date:'2026-08-05',migration_tag:'contact-verification-session-v2',usage_model:'standard',assets:{html_handling:'auto-trailing-slash',not_found_handling:'404-page',base_path:'/',raw_run_worker_first:['/api/*'],raw_headers:'old headers',raw_redirects:'old redirects'}},bindings:[{name:'ASSETS',type:'assets'},{name:'CONTACT_ENABLED',type:'plain_text',text:'true'},{name:'CONTACT_RETENTION_APPROVED',type:'plain_text',text:'true'},{name:'TURNSTILE_SECRET_KEY',type:'secret_text'},{name:'CONTACT_RATE_LIMITER',type:'ratelimit',namespace_id:'1001',simple:{limit:5,period:60}}]}};
  const assets={sha256:'synthetic-package-digest',bytes:new Map([['_headers',Buffer.from('approved headers')],['_redirects',Buffer.from('approved redirects')]])};
  const next=structuredClone(previous);next.number++;next.resources.script.last_deployed_from='api';next.resources.script_runtime.assets.raw_headers='approved headers';next.resources.script_runtime.assets.raw_redirects='approved redirects';
  return {previous,next,assets};
}
test('asset scope permits only approved headers/redirects and informational release labels',()=>{
  const f=fixture();assert.doesNotThrow(()=>assertCandidate(f.previous,f.next,f.assets));
  assert.equal(fingerprint(controls(f.previous)),fingerprint(controls(f.next)));
  assert.equal(settingsFingerprint({bindings:[],annotations:{'workers/message':'old'}}),settingsFingerprint({bindings:[],annotations:{'workers/message':'new'}}));
  assert.notEqual(settingsFingerprint({bindings:[]}),settingsFingerprint({bindings:[{name:'secret',type:'secret_text'}]}));
});
test('asset scope rejects every contact code, routing, binding, secret or compatibility change',()=>{
  for(const mutate of [
    v=>v.number++,v=>v.resources.script.etag='new-code',v=>v.resources.script.handlers.push('scheduled'),
    v=>v.resources.script_runtime.compatibility_date='2026-11-05',v=>v.resources.script_runtime.compatibility_flags=['nodejs_compat'],
    v=>v.resources.script_runtime.migration_tag='reset-history',v=>v.resources.script_runtime.usage_model='changed',
    v=>v.resources.bindings.pop(),v=>v.resources.bindings.push({name:'EXTRA',type:'secret_text'}),
    v=>v.resources.bindings[1].text='false',v=>v.resources.bindings[3].name='OTHER_SECRET',v=>v.resources.bindings[4].simple.limit=50,
    v=>v.resources.script_runtime.assets.raw_run_worker_first=[],v=>v.resources.script_runtime.assets.base_path='/new',
    v=>v.resources.script_runtime.assets.serve_directly=false,v=>v.resources.script_runtime.assets.static_routing={user_worker:[]},
    v=>v.resources.script_runtime.assets.raw_headers='unapproved',v=>v.resources.script_runtime.assets.raw_redirects='unapproved',
  ]) {const f=fixture();mutate(f.next);assert.throws(()=>assertCandidate(f.previous,f.next,f.assets),/Static release held/);}
});
test('upload metadata reuses exact module bytes and inherits every binding without reading secret values',async()=>{
  const f=fixture(),bytes=Buffer.from('export default { fetch() { return new Response("unchanged"); } };');
  const before={version:f.previous,code:{entrypoint:'index.js',modules:[{name:'index.js',type:'application/javascript+module',bytes}]},state:{asset_routing:{run_worker_first:['/api/*'],base_path:'/',html_handling:'auto-trailing-slash',not_found_handling:'404-page'}}};
  const form=versionForm(before,f.assets,'synthetic-upload-token');
  assert.deepEqual(Buffer.from(await form.get('index.js').arrayBuffer()),bytes);
  const metadata=JSON.parse(form.get('metadata'));
  assert.deepEqual(metadata.bindings,[{name:'ASSETS',type:'assets'},...f.previous.resources.bindings.slice(1).map(b=>({name:b.name,type:'inherit'}))]);
  assert.equal(metadata.compatibility_date,f.previous.resources.script_runtime.compatibility_date);
  for(const key of ['routes','migrations','keep_vars','keep_assets','workers_dev','secrets'])assert.equal(Object.hasOwn(metadata,key),false);
  assert.equal(metadata.assets.config._headers,'approved headers');
  assert.equal(metadata.assets.config._redirects,'approved redirects');
  assert.deepEqual(metadata.assets.config.run_worker_first,['/api/*']);
});
test('intervening deployments, code, secret/settings, routes or unreviewed uploads stop publishing',()=>{
  const baseline={version_id:'baseline',latest_version_id:'baseline',deployment_id:'existing',code_sha256:'code',controls_sha256:'controls',settings_sha256:'settings',infrastructure_sha256:'routes'};
  assert.doesNotThrow(()=>assertUnchanged(baseline,structuredClone(baseline)));
  for(const key of Object.keys(baseline)){const changed={...baseline,[key]:'changed'};assert.throws(()=>assertUnchanged(baseline,changed),/production drifted/);}
  assert.doesNotThrow(()=>assertUnchanged(baseline,{...baseline,latest_version_id:'reviewed-candidate'},{latest:'reviewed-candidate'}));
  assert.throws(()=>assertUnchanged(baseline,{...baseline,version_id:'new',latest_version_id:'reviewed-candidate'},{latest:'reviewed-candidate'}),/production drifted/);
});
test('API failures suppress provider bodies and credentials rather than retrying a write',async()=>{
  const original=globalThis.fetch;let calls=0;
  try {
    globalThis.fetch=async()=>{calls++;return Response.json({success:false,errors:[{message:'synthetic sensitive upstream detail'}]},{status:403});};
    await assert.rejects(request('test',{method:'POST',body:'{}'},'synthetic-credential'),error=>!error.message.includes('synthetic')&&/HTTP 403/.test(error.message));
    assert.equal(calls,1);
  }finally{globalThis.fetch=original;}
});
