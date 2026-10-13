import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateGateRecords, validateHumanPanelExport, validateActivationTransition, validateContactDisableTransition, inventorySurfaces, securityConfigurationFingerprint, verifyHistoricalSecurityEvidence } from '../scripts/contact-activation-gates.mjs';
const before = JSON.parse(await readFile(new URL('../wrangler.jsonc',import.meta.url)));
// Production activation is modeled after the guarded temporary-verifier retirement.
before.vars.CONTACT_ENABLED='false';
before.vars.CONTACT_RETENTION_APPROVED='false';
delete before.durable_objects;
if(before.migrations?.at(-1)?.tag==='contact-verification-session-v1')before.migrations=before.migrations.slice(0,-1);
const after = structuredClone(before);
Object.assign(after.vars,{CONTACT_ENABLED:'true',CONTACT_RETENTION_APPROVED:'true',CONTACT_DELIVERY:'zoho',ZOHO_DATA_CENTER:'us'});
function records() {
  const completed=Date.now()-60000,started=completed-900000;
  const minutes={success:1,replay:2,failure:3,recovery:4,expiry:11,validation:12};
  const human = {human_operated:true,confirmed_by_user:true,operator:'Test owner',hostname:'neraium.com',started_at:new Date(started).toISOString(),completed_at:new Date(completed).toISOString(),cleanup_verified_at:new Date(completed+30000).toISOString(),configuration_fingerprint:securityConfigurationFingerprint(after),code_fingerprint:'test-code-hash',probe_removed:true,temporary_secret_removed:true,
    results:Object.entries({success:200,replay:400,expiry:400,failure:502,recovery:200,validation:400}).map(([scenario,http_status])=>({scenario,http_status,observed_at:new Date(started+minutes[scenario]*60000).toISOString(),captured_at:scenario==='expiry'?new Date(started+300000).toISOString():null,challenge_checked:scenario!=='validation',challenge_valid:['success','failure','recovery'].includes(scenario),duplicate_or_expired:scenario==='replay',captured_age_seconds:scenario==='expiry'?360:null}))};
  return {config:after,privacyHash:'test-privacy-hash',codeHash:'test-code-hash',human,
    owner:{receipt:{verified:true,method:'Visual verification in Zoho Mail Inbox',sender:'website@neraium.com',recipient:'craig@neraium.com',subject:'Neraium evaluation inquiry',message_timestamp:'2026-10-13T01:05:12.798Z'},retention:{approved_at:'2026-10-13T01:00:00Z',noncustomer_inquiries:{delete_within_days_of_last_correspondence:90,covers:['Received','Sent','Trash']},customer_records:'Separate policy',public_privacy_sha256:'test-privacy-hash'}},
    inventory:{forwarding_inventory_complete:true,additional_copy_inventory_complete:true,owner_attested:true,confirmed_by:'Test owner',unknown_surfaces:[],surfaces:inventorySurfaces.map(id=>({id,inspected_by:'Test owner',inspected_at:'2026-10-13T01:00:00Z',method:'Test fixture only',status:'inspected-none',copies:[]}))},
    live:{results:{rate_limit_statuses:[400,429]},current_cleanup_verification:{endpoint_status:404,temporary_secret_removed:true,temporary_local_key_deleted:true,temporary_storage_removed:true,public_contact_enabled:false,contact_flags_false:true,verified_at:new Date(Date.now()-1000).toISOString(),configuration_fingerprint:securityConfigurationFingerprint(after)}}};
}
test('permits only an approved transition preserving every resource',()=>{
  assert.doesNotThrow(()=>validateActivationTransition(before,after));
  for(const mutate of [c=>c.routes.pop(),c=>c.ratelimits[0].namespace_id='2000',c=>c.send_email[0].allowed_destination_addresses.push('other@example.com'),c=>c.vars.TURNSTILE_SITE_KEY='changed',c=>c.assets.run_worker_first=[],c=>c.secrets.required.pop()]){
    const changed=structuredClone(after);mutate(changed);assert.throws(()=>validateActivationTransition(before,changed),/changes existing resources/);
  }
});
test('contact disable transition allows only both contact flags to be turned off',()=>{
  const live=structuredClone(after);
  const disabled=structuredClone(live);
  disabled.vars.CONTACT_ENABLED='false';
  disabled.vars.CONTACT_RETENTION_APPROVED='false';
  assert.doesNotThrow(()=>validateContactDisableTransition(live,disabled));
  disabled.vars.CONTACT_TO='elsewhere@example.com';
  assert.throws(()=>validateContactDisableTransition(live,disabled),/unrelated configuration/);
});
test('complete synthetic fixture passes without authorizing real activation',()=>assert.doesNotThrow(()=>validateGateRecords(records())));
test('owner panel export validates all six original scenarios verbatim',async()=>{
  const panel=JSON.parse(await readFile(new URL('../.planning/contact-activation/owner-reported-panel-export.json',import.meta.url),'utf8'));
  assert.equal(validateHumanPanelExport(panel).times.expiry,Date.parse('2026-10-13T05:58:31.753Z'));
  assert.equal(panel.results.find(x=>x.scenario==='expiry').duplicate_or_expired,false);
  assert.throws(()=>validateHumanPanelExport({...panel,results:panel.results.filter(x=>x.scenario!=='recovery')}),/exactly the six/);
});
test('delivery-only source changes retain human verification only when security controls match the tested revision',async()=>{
  const human=JSON.parse(await readFile(new URL('../.planning/contact-activation/human-security.json',import.meta.url),'utf8'));
  assert.equal(await verifyHistoricalSecurityEvidence(human.code_fingerprint),human.code_fingerprint);
  await assert.rejects(verifyHistoricalSecurityEvidence('unrecognized-human-test-source'),/no matching repository revision/);
});
test('expiry proof does not depend on the provider duplicate-or-expired diagnostic',()=>{
  const r=records();
  const expiry=r.human.results.find(x=>x.scenario==='expiry');
  expiry.duplicate_or_expired=false;
  assert.doesNotThrow(()=>validateGateRecords(r));
  expiry.challenge_checked=false;
  assert.throws(()=>validateGateRecords(r),/genuine unused-token expiry unverified/);
  const replay=records();
  replay.human.results.find(x=>x.scenario==='replay').duplicate_or_expired=false;
  assert.throws(()=>validateGateRecords(replay),/exact-token replay rejection unverified/);
});
test('missing approval, receipt, copy surface or named owner holds activation',()=>{
  for(const mutate of [r=>r.owner.receipt.verified=false,r=>r.owner.retention.noncustomer_inquiries.covers.pop(),r=>r.inventory.forwarding_inventory_complete=false,r=>r.inventory.surfaces.pop(),r=>{r.inventory.surfaces[0].status='copies-present';r.inventory.surfaces[0].copies=[{destination:'Copy mailbox',deletion_owner:'unassigned',retention_days:90,associated_sent_trash_covered:true}]}]){
    const r=records();mutate(r);assert.throws(()=>validateGateRecords(r),/activation held/);
  }
});
test('automation, stale configuration, masked failures and inadequate expiry cannot pass',()=>{
  for(const mutate of [r=>r.human.human_operated=false,r=>r.human.confirmed_by_user=false,r=>r.human.configuration_fingerprint='stale',r=>r.human.results.find(x=>x.scenario==='replay').http_status=429,r=>r.human.results.find(x=>x.scenario==='failure').challenge_valid=false,r=>r.human.results.find(x=>x.scenario==='expiry').captured_age_seconds=300,r=>r.human.cleanup_verified_at='2026-10-12T01:00:00Z',r=>r.owner.retention.public_privacy_sha256='changed']){
    const r=records();mutate(r);assert.throws(()=>validateGateRecords(r),/activation held/);
  }
});
test('unknown provider ownership and future or reordered evidence hold activation',()=>{
  for(const mutate of [r=>r.inventory.unknown_surfaces.push('Unchecked exports'),r=>{const s=r.inventory.surfaces.at(-1);s.status='provider-managed';s.terms_reference='Provider terms';s.oversight_owner='unassigned';},r=>r.human.code_fingerprint='stale',r=>r.human.results[0].observed_at=new Date(Date.now()+60000).toISOString(),r=>r.human.results.find(x=>x.scenario==='replay').observed_at=r.human.started_at]){
    const r=records();mutate(r);assert.throws(()=>validateGateRecords(r),/activation held/);
  }
});
test('owner confirmation timestamp can accompany a separately reported inspection',()=>{
  const r=records();
  const surface=r.inventory.surfaces[0];
  surface.inspected_at=null;
  surface.confirmed_at='2026-10-13T01:01:00Z';
  assert.doesNotThrow(()=>validateGateRecords(r));
});
test('stale cleanup evidence cannot authorize activation after a temporary verifier deployment',()=>{
  const r=records();
  r.live.current_cleanup_verification.temporary_storage_removed=false;
  assert.throws(()=>validateGateRecords(r),/current live probe cleanup\/configuration unverified/);
  const stale=records();
  stale.live.current_cleanup_verification.verified_at=new Date(Date.now()-86400000).toISOString();
  assert.throws(()=>validateGateRecords(stale),/current live probe cleanup\/configuration unverified/);
});
test('explicit owner waiver allows activation with copy surfaces preserved as unknown',()=>{
  const r=records();
  const surfaces=['mailbox-filter-actions','organization-routing-copies','organization-archives-journaling','clients-exports-integrations','provider-backups'];
  r.inventory.forwarding_inventory_complete=false;
  r.inventory.additional_copy_inventory_complete=false;
  r.inventory.owner_attested=false;
  r.inventory.unknown_surfaces=surfaces;
  r.inventory.surfaces=inventorySurfaces.map(id=>({id,status:id==='mailbox-forwarding'?'inspected-none':'unknown',...(id==='mailbox-forwarding'?{inspected_by:'Owner (reported)',confirmed_at:'2026-10-13T01:00:00Z',method:'Owner report',copies:[]}:{})}));
  r.owner.retention.copy_inventory_waiver={authorized:true,source:'Explicit owner authorization in Codex on 2026-10-13',unknown_surfaces_acknowledged:true,surfaces};
  assert.doesNotThrow(()=>validateGateRecords(r));
  r.inventory.surfaces.find(s=>s.id==='provider-backups').status='inspected-none';
  assert.throws(()=>validateGateRecords(r),/waiver does not match the recorded unknown surfaces/);
});
