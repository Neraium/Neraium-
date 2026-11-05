// Read-only preparation/review helper. This file contains no remote API or deployment action.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';
import { subject } from '../verification/contact/subject-identity.mjs';
const digest=value=>createHash('sha256').update(value).digest('hex');
const approvedPrivacy='ad2ca1b1d4073aca46e762637f52fe66885cf93521d5c5ce30ef57f3b66e9de0';
const requireValue=(ok,message)=>{if(!ok)throw Error('Isolated verifier review held: '+message);};
export function validateIsolatedConfig(config,production,{deploymentCandidate=false,configuredInputs=false}={}){
  const top=['$schema','name','main','compatibility_date','workers_dev','preview_urls','vars','ratelimits','durable_objects','migrations','secrets','observability','account_id'];
  requireValue(isDeepStrictEqual(Object.keys(config).sort(),top.sort()),'unexpected configuration surface');
  requireValue(config.account_id===production.account_id,'Cloudflare account differs from reviewed production account');
  requireValue(config.name==='neraium-contact-verifier'&&config.name!==production.name,'dedicated Worker identity required');
  requireValue(config.main==='index.mjs'&&config.compatibility_date===production.compatibility_date,'entry point or compatibility differs');
  requireValue(config.workers_dev===true&&config.preview_urls===false,'only dedicated workers.dev access is allowed');
  requireValue(isDeepStrictEqual(Object.keys(config.vars).sort(),['TURNSTILE_SITE_KEY','VERIFIER_ENABLED','VERIFIER_HOSTNAME']),'unexpected public variable or secret');
  requireValue(['true','false'].includes(config.vars.VERIFIER_ENABLED),'invalid enable flag');
  requireValue(isDeepStrictEqual(config.ratelimits,[{name:'VERIFIER_RATE_LIMITER',namespace_id:'20261105',simple:{limit:5,period:60}}]),'isolated limiter changed');
  requireValue(!production.ratelimits.some(binding=>binding.namespace_id===config.ratelimits[0].namespace_id),'limiter must not share production namespace');
  requireValue(isDeepStrictEqual(config.durable_objects,{bindings:[{name:'VERIFIER_SESSIONS',class_name:'IsolatedVerificationSession'}]}),'private storage binding differs');
  requireValue(isDeepStrictEqual(config.migrations,[{tag:'isolated-verifier-v1',new_sqlite_classes:['IsolatedVerificationSession']}]),'dedicated SQLite history differs');
  requireValue(isDeepStrictEqual(config.secrets,{required:['TURNSTILE_SECRET_KEY','VERIFIER_ACCESS']}),'mail credentials or unknown secrets are forbidden');
  requireValue(isDeepStrictEqual(config.observability,{enabled:false}),'request observability must remain disabled');
  if(deploymentCandidate)requireValue(config.vars.VERIFIER_ENABLED==='true','candidate is disabled');
  if(deploymentCandidate||configuredInputs){
    requireValue(/^neraium-contact-verifier\.[a-z0-9][a-z0-9-]*\.workers\.dev$/.test(config.vars.VERIFIER_HOSTNAME),'reviewed dedicated hostname required');
    requireValue(/^[A-Za-z0-9_-]{20,128}$/.test(config.vars.TURNSTILE_SITE_KEY)&&!/^([123]x0{20,}|review-required)/.test(config.vars.TURNSTILE_SITE_KEY),'real separate widget required');
    requireValue(config.vars.TURNSTILE_SITE_KEY!==production.vars.TURNSTILE_SITE_KEY,'do not reuse or alter the production Turnstile widget');
  }
  return {isolated:true,mail_bindings:false,production_routes:false,production_migration_history_reused:false,deployment_authorized:false};
}
export function validateIsolatedEnableTransition(before,after,production){
  validateIsolatedConfig(before,production,{configuredInputs:true});
  validateIsolatedConfig(after,production,{deploymentCandidate:true});
  requireValue(before.vars.VERIFIER_ENABLED==='false','initial candidate must be disabled');
  const expected=structuredClone(before);expected.vars.VERIFIER_ENABLED='true';
  requireValue(isDeepStrictEqual(after,expected),'enable transition may change only the dedicated flag');
  return {isolated_only:true,production_gate_satisfied:false,deployment_authorized:false};
}
export function validateIsolatedRetirementConfig(before,after,production){
  validateIsolatedConfig(before,production);
  const expected=structuredClone(before);
  delete expected.ratelimits;delete expected.durable_objects;
  expected.main='retire.mjs';expected.vars={VERIFIER_ENABLED:'false'};expected.secrets={required:[]};
  expected.migrations=[...before.migrations,{tag:'isolated-verifier-retire-v1',deleted_classes:['IsolatedVerificationSession']}];
  requireValue(isDeepStrictEqual(after,expected),'retirement must remove only the dedicated verifier capabilities and append its deletion migration');
  return {retirement_only:true,deployment_authorized:false};
}
export async function reviewIsolatedVerifier(){
  const production=JSON.parse(await readFile('wrangler.jsonc','utf8'));
  const isolated=JSON.parse(await readFile('verification/contact/wrangler.jsonc','utf8'));
  const boundaries=validateIsolatedConfig(isolated,production);
  validateIsolatedRetirementConfig(isolated,JSON.parse(await readFile('verification/contact/wrangler.retire.jsonc','utf8')),production);
  const actual={};for(const name of Object.keys(subject.files).sort())actual[name]=digest(await readFile(name));
  requireValue(isDeepStrictEqual(actual,subject.files),'source handler identity is stale');
  requireValue(digest(JSON.stringify(actual))===subject.sha256,'subject identity digest differs');
  const privacyHash=digest(await readFile('privacy.html'));
  const owner=JSON.parse(await readFile('.planning/contact-activation/owner-confirmations.json','utf8'));
  requireValue(privacyHash===approvedPrivacy&&owner.retention.public_privacy_sha256===privacyHash,'approved Privacy identity differs');
  const files=['verification/contact/index.mjs','verification/contact/session.mjs','verification/contact/panel.mjs','verification/contact/subject-identity.mjs','verification/contact/wrangler.jsonc','verification/contact/wrangler.retire.jsonc','verification/contact/retire.mjs','scripts/review-isolated-verifier.mjs','scripts/create-isolated-verifier-session.mjs','verification/contact/README.md','tests/isolated-verifier.test.mjs','tests/isolated-verifier-workerd.test.mjs','tests/isolated-verifier-browser.test.mjs','tests/isolated-verifier-credentials.test.mjs','verification/contact/evidence-review.mjs','verification/contact/EVIDENCE-POLICY.md','verification/contact/OPERATIONS.md','verification/contact/MAINTENANCE.md','scripts/contact-maintenance-gates.mjs','tests/contact-maintenance-gates.test.mjs','verification/contact/.gitignore','scripts/inspect-isolated-verifier-boundaries.mjs','tests/isolated-evidence-review.test.mjs','tests/isolated-boundaries.test.mjs',...Object.keys(subject.files)];
  const hashes={};for(const name of files.sort())hashes[name]=digest(await readFile(name));
  const result={reviewed_at:new Date().toISOString(),...boundaries,package_sha256:digest(JSON.stringify(hashes)),files:hashes,
    subject,approved_privacy_sha256:privacyHash,preparation_only:true,enabled:isolated.vars.VERIFIER_ENABLED==='true',
    existing_production_gate_accepts_isolated_evidence:false,
    pending:['Explicit separate deployment authorization after review.',
      'Dedicated workers.dev hostname and separate real Turnstile widget/secrets; production widget must remain untouched.',
      'Out-of-band one-use access secret with <=20-minute session and <=10-minute redemption window.',
      'Fresh isolated and separate production human evidence plus enabled-intake cleanup required for maintenance; initial activation cannot accept isolated provenance.',
      'Manual human session, actual sanitized evidence, separately confirmed participation, then authenticated revocation/resource cleanup.']};
  await mkdir('.planning/isolated-verifier-20261105',{recursive:true});
  await writeFile('.planning/isolated-verifier-20261105/package-review.json',JSON.stringify(result,null,2)+'\n');
  return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const result=await reviewIsolatedVerifier();console.log(`Preparation review passed: ${result.package_sha256}. Disabled draft only; no deployment authorized or performed.`);}catch(e){console.error(e.message);process.exitCode=1;}}
