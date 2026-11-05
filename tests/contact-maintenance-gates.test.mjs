import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { contactVerificationMode, validateMaintenanceRecords, validateMaintenanceEvidence, validateVerifierRemoval } from '../scripts/contact-maintenance-gates.mjs';
import { validateHumanPanelExport, securityConfigurationFingerprint, validateActivationTransition, validateActivationEvidence } from '../scripts/contact-activation-gates.mjs';
import { evidenceDigest } from '../verification/contact/evidence-review.mjs';
const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url)));
const enabledBindings = ['CONTACT_ENABLED','CONTACT_RETENTION_APPROVED'].map(name => ({name,type:'plain_text',text:'true'}));
const id = '00000000-0000-4000-8000-000000000001';

// Fabricated observations only. Nothing is written to release evidence or a real session.
function fixture() {
  const start = Date.now()-1000000, stamp = ms => new Date(start+ms).toISOString();
  const subjectHash='a'.repeat(64), packageHash='c'.repeat(64), privacyHash='d'.repeat(64), settings={bindings:enabledBindings};
  const panel={schema:'neraium.isolated-contact-verifier.v1',candidate_only:true,scenario_checks_complete:true,next_step:null,session_id:'b'.repeat(32),hostname:'neraium-contact-verifier.fixture.workers.dev',subject_sha256:subjectHash,started_at:stamp(0),completed_at:stamp(700000),expires_at:stamp(1200000),rate_limit_statuses:[400,429],results:[]};
  for (const [i, scenario] of ['success','replay','failure','recovery','expiry','validation'].entries()) {
    const positive=['success','failure','recovery'].includes(scenario);
    panel.results.push({scenario,http_status:{success:200,replay:400,failure:502,recovery:200,expiry:400,validation:400}[scenario],observed_at:stamp([10000,20000,30000,40000,660000,670000][i]),challenge_checked:scenario!=='validation',challenge_valid:positive,provider_success:scenario==='validation'?null:positive,context_matches:positive,duplicate_or_expired:['replay','expiry'].includes(scenario),...(scenario==='expiry'?{captured_at:stamp(350000),captured_age_seconds:310}:{})});
  }
  const isolatedConfig=JSON.parse(JSON.stringify(config));
  // Use the actual dedicated candidate shape, never a production configuration as the verifier.
  const isolatedBase=structuredClone(isolatedDraft);
  Object.assign(isolatedBase.vars,{VERIFIER_ENABLED:'true',VERIFIER_HOSTNAME:panel.hostname,TURNSTILE_SITE_KEY:'separate_fixture_site_key_000000'});
  const digest=evidenceDigest(panel);
  const boundary={schema:'neraium.verifier-boundaries.v1',account_id:config.account_id,production_worker:config.name,production:{status:'verified',bindings_match_local:true,settings_sha256:evidenceDigest(settings),...Object.fromEntries(['routes_sha256','domains_sha256','subdomain_sha256','schedules_sha256','latest_deployment_sha256'].map(k=>[k,'e'.repeat(64)]))},live:{status:'verified',intake_enabled:true,site_key_matches_local:true,contact_status:200,homepage_status:200,homepage_sha256:'f'.repeat(64),asset_hashes:{'/styles.css?v=fixture':'f'.repeat(64),'/scripts.js?v=fixture':'f'.repeat(64)}},isolated_worker_exists:false,dns:{status:'unverified'}};
  const record={schema:'neraium.contact-maintenance.v1',configuration_fingerprint:securityConfigurationFingerprint(config),privacy_sha256:privacyHash,subject_sha256:subjectHash,
    isolated:{panel,configuration:isolatedBase,deployment_artifact_verified:true,inspected_by:'Synthetic inspector',expectation:{hostname:panel.hostname,session_id:panel.session_id,subject_sha256:subjectHash,server_export_sha256:digest,deployment_version_id:id,reviewed_package_sha256:packageHash},attestation:{human_operated:true,confirmed_by_user:true,operator:'Synthetic test operator',confirmed_at:stamp(710000),server_export_sha256:digest}},
    production:{hostname:'neraium.com',site_key:config.vars.TURNSTILE_SITE_KEY,human_operated:true,confirmed_by_user:true,operator:'Synthetic test operator',started_at:stamp(0),completed_at:stamp(800000),test_identifier:id,success_accepted:true,exact_request_replayed:true,replay_response_error:'Security verification expired or failed. Please try again.',validation_response_error:'Please check the fields and complete the security verification.',rate_limit_statuses:[400,429],rate_limit_observed_at:stamp(50000),results:['success','replay','validation'].map((scenario,i)=>({scenario,http_status:[200,400,400][i],observed_at:stamp(10000+i*10000),diagnostic_id:id})),receipt:{verified:true,method:'Visual verification in Zoho Mail Inbox',sender:config.vars.CONTACT_FROM,recipient:config.vars.CONTACT_TO,subject:'Neraium evaluation inquiry',test_identifier:id,observed_at:stamp(700000)}},
    before:{...structuredClone(boundary),observed_at:stamp(-1000)},after:{...structuredClone(boundary),observed_at:stamp(850000)},
    cleanup:{hostname:panel.hostname,session_id:panel.session_id,site_key:isolatedBase.vars.TURNSTILE_SITE_KEY,verified_at:stamp(840000),access_denied:true,worker_removed:true,widget_removed:true,secrets_removed:true,storage_removed:true,private_files_removed:true,production_intake_enabled:true}};
  seal(record,stamp(860000));
  return {record,context:{config:isolatedConfig,settings,subjectHash,packageHash,privacyHash}};
}
const isolatedDraft=JSON.parse(await readFile(new URL('../verification/contact/wrangler.jsonc', import.meta.url)));
function seal(record,confirmedAt=record.confirmation?.confirmed_at) {
  const {confirmation,...observations}=record;
  record.confirmation={human_operated:true,confirmed_by_user:true,operator:'Synthetic test operator',confirmed_at:confirmedAt,evidence_sha256:evidenceDigest(observations)};
}

test('only an already-active remote with no activation transition selects maintenance',()=>{
  assert.equal(contactVerificationMode(config,enabledBindings),'maintenance');
  for(const bindings of [[],enabledBindings.slice(1),enabledBindings.map(b=>({...b,text:'false'})),enabledBindings.map(b=>({...b,type:'secret_text'}))]) assert.equal(contactVerificationMode(config,bindings),'activation');
  const disabled=structuredClone(config);disabled.vars.CONTACT_ENABLED='false';disabled.vars.CONTACT_RETENTION_APPROVED='false';
  assert.equal(contactVerificationMode(config,enabledBindings,{expectedConfig:disabled}),'activation');
  assert.equal(contactVerificationMode(disabled,enabledBindings),'activation');
  assert.throws(()=>validateActivationTransition(config,config),/baseline must be disabled/);
});

test('maintenance accepts separate fresh scopes and truthful enabled-intake cleanup; DNS is not a gate',()=>{
  const f=fixture();assert.deepEqual(validateMaintenanceRecords(f.record,f.context),{mode:'maintenance',isolated_scope:'isolated-handler-security-controls-only',production_hostname_verified_separately:true});
  assert.equal(f.record.before.dns.status,'unverified');
  assert.throws(()=>validateHumanPanelExport(f.record.isolated.panel),/human-operated/);
});

test('maintenance rejects absent, stale, automated or mixed evidence without falling back to activation',()=>{
  const mutations=[
    r=>r.schema='initial-activation',r=>r.configuration_fingerprint='changed',r=>r.privacy_sha256='changed',r=>r.subject_sha256='changed',
    r=>r.isolated.attestation.human_operated=false,r=>r.isolated.expectation.subject_sha256='changed',r=>r.isolated.expectation.reviewed_package_sha256='changed',
    r=>r.isolated.panel.results[2].provider_success=false,r=>r.isolated.panel.results[4].captured_age_seconds=100,r=>r.isolated.panel.rate_limit_statuses=[400],
    r=>r.isolated.deployment_artifact_verified=false,r=>r.isolated.configuration.vars.TURNSTILE_SITE_KEY=config.vars.TURNSTILE_SITE_KEY,
    r=>r.production.hostname=r.isolated.panel.hostname,r=>r.production.site_key='changed',r=>r.production.human_operated=false,
    r=>r.production.completed_at='2020-01-01',r=>r.production.results[1].http_status=429,r=>r.production.exact_request_replayed=false,
    r=>r.production.replay_response_error='field validation failed',r=>r.production.validation_response_error='challenge rejected',
    r=>r.production.rate_limit_statuses=[400],r=>r.production.rate_limit_observed_at='2020-01-01',r=>r.production.receipt.verified=false,r=>r.production.receipt.test_identifier='different',
    r=>r.after.live.intake_enabled=false,r=>r.after.isolated_worker_exists=true,r=>r.after.production.settings_sha256='changed',r=>r.after.observed_at='2020-01-01',
    r=>r.cleanup.storage_removed=false,r=>r.cleanup.private_files_removed=false,r=>r.cleanup.production_intake_enabled=false,r=>r.cleanup.site_key='other_widget',r=>r.cleanup.session_id='other_session',
    r=>r.confirmation.confirmed_by_user=false,r=>r.token='must not persist',
  ];
  assert.throws(()=>validateMaintenanceRecords(null,fixture().context),/missing/);
  for(const mutate of mutations){const f=fixture();mutate(f.record);if(f.record.confirmation.confirmed_by_user)seal(f.record);assert.throws(()=>validateMaintenanceRecords(f.record,f.context),/held|rejected|review held/);}
  const inactive=fixture();inactive.context.settings.bindings=[];
  assert.throws(()=>validateMaintenanceRecords(inactive.record,inactive.context),/remote intake/);
});

test('resealing cannot repair missing security proof; confirmation binds the whole observation set',()=>{
  const f=fixture();f.record.production.receipt.observed_at=f.record.production.started_at;seal(f.record);
  assert.throws(()=>validateMaintenanceRecords(f.record,f.context),/Inbox receipt/);
  const changed=fixture();changed.record.cleanup.verified_at=new Date(Date.now()-120000).toISOString();
  assert.throws(()=>validateMaintenanceRecords(changed.record,changed.context),/cleanup time|confirmation/);
  const stale=fixture();assert.throws(()=>validateMaintenanceRecords(stale.record,{...stale.context,now:Date.now()+604800000}),/stale/);
});

test('maintenance cannot authorize a first activation or change production configuration',async()=>{
  const disabled=structuredClone(config);disabled.vars.CONTACT_ENABLED='false';disabled.vars.CONTACT_RETENTION_APPROVED='false';
  await assert.rejects(validateMaintenanceEvidence(disabled,{},async()=>{}),/cannot change production configuration/);
  const changed=structuredClone(config);changed.vars.CONTACT_TO='different@example.com';
  await assert.rejects(validateMaintenanceEvidence(changed,{},async()=>{}),/cannot change production configuration/);
});

test('cleanup independently requires actual verifier absence, never a403 or network failure',async()=>{
  await assert.doesNotReject(validateVerifierRemoval(config,async path=>{assert.match(path,/scripts\/neraium-contact-verifier\/settings$/);throw Error('inspection (HTTP 404).');}));
  for(const api of [async()=>({}),async()=>{throw Error('inspection (HTTP 403).');},async()=>{throw Error('network error');}]) await assert.rejects(validateVerifierRemoval(config,api),/removal not independently/);
});

test('the initial activation entry point still uses the real clock and rejects expired owner evidence',async()=>{
  await assert.rejects(validateActivationEvidence(config),/human session timestamps are stale or invalid/);
});
