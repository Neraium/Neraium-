// Recognition-only proposal. Not imported by the service or the production release gate.
import {createHash} from 'node:crypto';
const requireEvidence=(ok,message)=>{if(!ok)throw Error('Isolated evidence rejected: '+message);};
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const evidenceDigest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const expectedOrder=['success','replay','failure','recovery','expiry','validation'];
const statuses={success:200,replay:400,failure:502,recovery:200,expiry:400,validation:400};
function rejectCredentials(value){
  if(!value||typeof value!=='object')return;
  for(const [key,item] of Object.entries(value)){
    requireEvidence(!/(?:^|_)(?:token|ticket|cookie|secret|password)(?:_|$)|^(?:VERIFIER_ACCESS|authorization|private_url|ZOHO_.*)$/i.test(key),'credential fields must not be included');
    rejectCredentials(item);
  }
}
export function recognizeIsolatedEvidence(panel,expectation,attestation,{now=Date.now()}={}){
  rejectCredentials(panel);
  requireEvidence(panel?.schema==='neraium.isolated-contact-verifier.v1'&&panel.candidate_only===true,'wrong schema or promoted evidence');
  requireEvidence(panel.scenario_checks_complete===true&&panel.next_step===null,'session incomplete');
  requireEvidence(/^neraium-contact-verifier\.[a-z0-9][a-z0-9-]*\.workers\.dev$/.test(expectation?.hostname??'')&&panel.hostname===expectation.hostname,'isolated origin differs');
  requireEvidence(/^[a-f0-9]{32}$/.test(panel.session_id??'')&&panel.session_id===expectation.session_id,'session identity differs');
  requireEvidence(/^[a-f0-9]{64}$/.test(expectation.subject_sha256??'')&&panel.subject_sha256===expectation.subject_sha256,'source identity differs');
  const started=Date.parse(panel.started_at),completed=Date.parse(panel.completed_at),expires=Date.parse(panel.expires_at);
  requireEvidence([started,completed,expires].every(Number.isFinite)&&started<=completed&&completed<expires&&expires-started<=1200000&&completed<=now&&now-completed<=604800000,'invalid or stale session times');
  requireEvidence(Array.isArray(panel.results)&&panel.results.length===6,'exactly six scenario observations required');
  let previous=started;
  for(let i=0;i<expectedOrder.length;i++){
    const scenario=expectedOrder[i],row=panel.results[i],time=Date.parse(row?.observed_at);
    requireEvidence(row?.scenario===scenario&&row.http_status===statuses[scenario]&&Number.isFinite(time)&&time>=previous&&time<=completed,'scenario order/status/time differs');
    previous=time;
    if(['success','failure','recovery'].includes(scenario))requireEvidence(row.challenge_checked===true&&row.challenge_valid===true&&row.provider_success===true&&row.context_matches===true,'accepted challenge not substantiated');
    if(['replay','expiry'].includes(scenario))requireEvidence(row.challenge_checked===true&&row.challenge_valid===false&&row.provider_success===false&&row.duplicate_or_expired===true,'provider rejection not substantiated');
    if(scenario==='expiry'){
      const captured=Date.parse(row.captured_at),age=Math.floor((time-captured)/1000);
      requireEvidence(Number.isFinite(captured)&&captured>=Date.parse(panel.results[3].observed_at)&&age>=310&&age===row.captured_age_seconds,'unused-token expiry timing differs');
    }
    if(scenario==='validation')requireEvidence(row.challenge_checked===false&&row.challenge_valid===false&&row.provider_success===null,'validation reached the provider');
  }
  requireEvidence(Array.isArray(panel.rate_limit_statuses)&&panel.rate_limit_statuses.length<=8&&panel.rate_limit_statuses.every(v=>[400,429].includes(v))&&panel.rate_limit_statuses.includes(429),'isolated limiter rejection missing');
  const digest=evidenceDigest(panel);
  requireEvidence(expectation.server_export_sha256===digest,'independently retrieved server export differs');
  requireEvidence(attestation?.human_operated===true&&attestation.confirmed_by_user===true&&typeof attestation.operator==='string'&&attestation.operator.trim().length>0&&!/\b(unknown|unassigned|pending|tbd)\b/i.test(attestation.operator),'explicit actual human confirmation required');
  const confirmed=Date.parse(attestation.confirmed_at);
  requireEvidence(Number.isFinite(confirmed)&&confirmed>=completed&&confirmed<=now&&attestation.server_export_sha256===digest,'human confirmation not bound to this export');
  requireEvidence(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(expectation.deployment_version_id??'')&&/^[a-f0-9]{64}$/.test(expectation.reviewed_package_sha256??''),'reviewed deployment/package identity missing');
  return {schema:'neraium.isolated-evidence-recognition.v1',recognized_scope:'isolated-handler-security-controls-only',
    hostname:panel.hostname,session_id:panel.session_id,subject_sha256:panel.subject_sha256,server_export_sha256:digest,
    deployment_version_id:expectation.deployment_version_id,reviewed_package_sha256:expectation.reviewed_package_sha256,
    proves_production_hostname:false,proves_production_widget:false,proves_production_limiter:false,proves_production_delivery:false,
    cleanup_verified:false,production_gate_satisfied:false,release_authorized:false,
    requires_independent_review:['Authenticity of the recorded server retrieval, deployment/package comparison and human confirmation.',
      'Actual separate-resource cleanup and production invariance evidence.',
      'Separately reviewed production evidence policy; the existing gate is unchanged.']};
}
