import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { execFileSync } from 'node:child_process';

export const inventorySurfaces = ['mailbox-forwarding','mailbox-filter-actions','organization-routing-copies','organization-archives-journaling','clients-exports-integrations','provider-backups'];
const requireGate = (passed, message) => { if (!passed) throw Error(`Contact activation held: ${message}`); };
const knownText = value => typeof value === 'string' && Boolean(value.trim()) && !/\b(unknown|unassigned|pending|tbd)\b/i.test(value);
export const securityConfigurationFingerprint = config => createHash('sha256').update(JSON.stringify({ name:config.name,account_id:config.account_id,hostnames:config.vars.CONTACT_HOSTNAMES,sitekey:config.vars.TURNSTILE_SITE_KEY,from:config.vars.CONTACT_FROM,to:config.vars.CONTACT_TO,routes:config.routes,ratelimits:config.ratelimits })).digest('hex');
export async function securityCodeFingerprint() {
  const hash=createHash('sha256');
  for(const path of ['worker/contact.mjs','worker/zoho-mail.mjs','.planning/contact-activation/human-probe.mjs']) hash.update(path).update('\0').update(await readFile(path)).update('\0');
  return hash.digest('hex');
}

function extractSecurityControls(source) {
  const constants = source.match(/const EMAIL = [\s\S]*?const fields = \{[^\n]*\}/);
  const configured = source.match(/export function configured\(env\) \{[\s\S]*?\n\}/);
  const payload = source.match(/function validPayload\(data\) \{[\s\S]*?(?=\nasync function boundedBody\()/);
  const body = source.match(/async function boundedBody\(request\) \{[\s\S]*?(?=\nexport async function handleContact\()/);
  const origin = source.match(/if \(!allowed\.includes\(url\.hostname\) \|\| request\.headers\.get\('origin'\) !== url\.origin\)/);
  const mediaType = source.match(/if \([^\n]*content-type[^\n]*application\/json'\)/);
  const contentLength = source.match(/if \(Number\(request\.headers\.get\('content-length'\)\) > 8192\)/);
  const rateKey = source.match(/const digest = await crypto\.subtle\.digest\('SHA-256',[^\n]+/);
  const limiter = source.match(/const limit = await env\.CONTACT_RATE_LIMITER\.limit\([^\n]+/);
  const limitCheck = source.match(/limit\?\.success !== true/);
  const turnstileCall = source.match(/verifyFetch\('https:\/\/challenges\.cloudflare\.com\/turnstile\/v0\/siteverify',[\s\S]*?\n\s*\}\);/);
  const challengeCheck = source.match(/if \(result\?\.success !== true \|\| result\.hostname !== url\.hostname \|\| result\.action !== 'evaluation'\)/);
  const parts = [constants,configured,payload,body,origin,mediaType,contentLength,rateKey,limiter,limitCheck,turnstileCall,challengeCheck];
  if (parts.some(part => !part)) throw Error('Security-control fingerprint source is incomplete.');
  return parts.map(part => part[0].split('\n').map(line => line.trim()).join('\n')).join('\0');
}

function revisionSource(revision, path) {
  if (!revision || path.startsWith('.planning/')) return readFile(path, 'utf8');
  return execFileSync('git',['show',`${revision}:${path}`],{encoding:'utf8',stdio:['ignore','pipe','ignore']});
}

async function sourceFingerprint(revision) {
  const hash=createHash('sha256');
  for(const path of ['worker/contact.mjs','worker/zoho-mail.mjs','.planning/contact-activation/human-probe.mjs']) {
    const content=await revisionSource(revision,path);
    hash.update(path).update('\0').update(content).update('\0');
  }
  return hash.digest('hex');
}

async function securityControlsFingerprint(revision) {
  const [contact,zoho,probe]=await Promise.all([
    revisionSource(revision,'worker/contact.mjs'),
    revisionSource(revision,'worker/zoho-mail.mjs'),
    revisionSource(revision,'.planning/contact-activation/human-probe.mjs'),
  ]);
  const hash=createHash('sha256');
  hash.update(extractSecurityControls(contact)).update('\0').update(probe).update('\0');
  // The sender and authorization boundaries are fixed independently from mail handling.
  hash.update(zoho.match(/export function zohoConfigured\(env\) \{[\s\S]*?\n\}/)?.[0] ?? 'missing-zoho-authorization-boundary');
  return hash.digest('hex');
}

export async function verifyHistoricalSecurityEvidence(humanCodeFingerprint) {
  const current=await securityCodeFingerprint();
  if(current===humanCodeFingerprint)return humanCodeFingerprint;
  const revisions=execFileSync('git',['log','--format=%H','-n','40'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim().split('\n').filter(Boolean);
  let testedRevision;
  for(const revision of revisions) {
    try { if(await sourceFingerprint(revision)===humanCodeFingerprint){testedRevision=revision;break;} }
    catch { /* Older revisions may predate one of the fingerprinted files. */ }
  }
  requireGate(Boolean(testedRevision),'human verification code has no matching repository revision');
  const [testedControls,currentControls]=await Promise.all([
    securityControlsFingerprint(testedRevision),securityControlsFingerprint(null),
  ]);
  requireGate(testedControls===currentControls,'human verification security controls changed; fresh human verification required');
  return humanCodeFingerprint;
}
export function validateHumanPanelExport(human, now = Date.now()) {
  requireGate(human?.human_operated === true && ['neraium.com','www.neraium.com'].includes(human.hostname), 'human-operated panel export missing');
  const started=Date.parse(human.started_at),completed=Date.parse(human.completed_at);
  requireGate(Number.isFinite(started) && completed >= started && completed <= now && completed-started <= 1200000 && now-completed <= 604800000, 'human session timestamps are stale or invalid');
  const expected = { success:200, replay:400, failure:502, recovery:200, expiry:400, validation:400 };
  requireGate(Array.isArray(human.results) && human.results.length === Object.keys(expected).length, 'panel export must contain exactly the six reported scenarios');
  const times={};
  for (const [scenario, status] of Object.entries(expected)) {
    const matches=human.results.filter(result=>result.scenario===scenario);
    requireGate(matches.length === 1 && matches[0].http_status === status, `human test missing/failed: ${scenario}`);
    const result=matches[0];
    times[scenario]=Date.parse(result.observed_at);
    requireGate(Number.isFinite(times[scenario]) && times[scenario] >= started && times[scenario] <= completed, `test timestamp invalid: ${scenario}`);
    if (['success','failure','recovery'].includes(scenario)) requireGate(result.challenge_checked === true && result.challenge_valid === true, `real challenge failed: ${scenario}`);
    if (scenario === 'replay') requireGate(result.challenge_checked === true && result.duplicate_or_expired === true && result.challenge_valid === false, 'exact-token replay rejection unverified');
    if (scenario === 'expiry') requireGate(result.challenge_checked === true && result.challenge_valid === false
      && result.captured_age_seconds >= 310
      && Number.isFinite(Date.parse(result.captured_at)) && Date.parse(result.captured_at) >= started
      && times.expiry-Date.parse(result.captured_at) >= 310000, 'genuine unused-token expiry unverified');
    if (scenario === 'validation') requireGate(result.challenge_checked === false && result.challenge_valid === false, 'field validation did not stop before challenge verification');
  }
  requireGate(times.replay >= times.success && times.recovery >= times.failure, 'replay/recovery test ordering invalid');
  return { started, completed, times };
}
export function validateGateRecords({ owner, inventory, human, live, privacyHash, codeHash, config }, now = Date.now()) {
  requireGate(owner.receipt?.verified === true && owner.receipt.method === 'Visual verification in Zoho Mail Inbox'
    && owner.receipt.sender === 'website@neraium.com' && owner.receipt.recipient === 'craig@neraium.com'
    && owner.receipt.subject === 'Neraium evaluation inquiry' && owner.receipt.message_timestamp === '2026-10-13T01:05:12.798Z', 'actual Inbox receipt');
  const policy = owner.retention?.noncustomer_inquiries;
  requireGate(policy?.delete_within_days_of_last_correspondence === 90 && ['Received','Sent','Trash'].every(s=>policy.covers?.includes(s))
    && Boolean(owner.retention.customer_records) && Boolean(owner.retention.approved_at), 'explicit retention approval');
  const unknownSurfaces = inventory.unknown_surfaces;
  const waiver = owner.retention?.copy_inventory_waiver;
  const hasOwnerWaiver = waiver?.authorized === true
    && waiver.source === 'Explicit owner authorization in Codex on 2026-10-13'
    && waiver.unknown_surfaces_acknowledged === true
    && Array.isArray(unknownSurfaces) && unknownSurfaces.length > 0
    && Array.isArray(waiver.surfaces)
    && isDeepStrictEqual([...waiver.surfaces].sort(), [...unknownSurfaces].sort());
  if (hasOwnerWaiver) {
    requireGate(inventory.forwarding_inventory_complete === false && inventory.additional_copy_inventory_complete === false
      && inventory.owner_attested === false, 'waiver must preserve incomplete inventory status');
    const actualUnknown = inventorySurfaces.filter(id=>inventory.surfaces?.find(s=>s.id===id)?.status === 'unknown');
    requireGate(isDeepStrictEqual([...actualUnknown].sort(), [...unknownSurfaces].sort()), 'waiver does not match the recorded unknown surfaces');
  } else {
    requireGate(inventory.forwarding_inventory_complete === true && inventory.additional_copy_inventory_complete === true, 'forwarding and copy inventory incomplete');
    requireGate(inventory.owner_attested === true && knownText(inventory.confirmed_by), 'owner copy inventory confirmation missing');
    requireGate(Array.isArray(unknownSurfaces) && unknownSurfaces.length === 0, 'unresolved copy surfaces remain');
    for (const id of inventorySurfaces) {
      const surface = inventory.surfaces?.find(s=>s.id===id);
      const inspectionEvidenceAt=surface?.inspected_at ?? surface?.confirmed_at;
      requireGate(surface && knownText(surface.inspected_by) && Number.isFinite(Date.parse(inspectionEvidenceAt)) && knownText(surface.method), `inspection missing: ${id}`);
      requireGate(['inspected-none','copies-present','provider-managed'].includes(surface.status), `unknown copy surface: ${id}`);
      if (surface.status === 'inspected-none') requireGate(Array.isArray(surface.copies) && surface.copies.length === 0, `contradictory empty inventory: ${id}`);
      if (surface.status === 'copies-present') {
        requireGate(Array.isArray(surface.copies) && surface.copies.length > 0, `copy locations missing: ${id}`);
        for (const copy of surface.copies) requireGate(knownText(copy.destination) && knownText(copy.deletion_owner) && copy.retention_days === 90 && copy.associated_sent_trash_covered === true, `copy deletion ownership/policy incomplete: ${id}`);
      }
      if (surface.status === 'provider-managed') requireGate(id === 'provider-backups' && knownText(surface.terms_reference) && knownText(surface.oversight_owner), 'provider backup handling incomplete');
    }
  }
  const { started, completed, times } = validateHumanPanelExport(human, now);
  requireGate(human.confirmed_by_user === true && Boolean(human.operator), 'owner confirmation of human-operated challenge evidence missing');
  requireGate(human.configuration_fingerprint === securityConfigurationFingerprint(config), 'human verification configuration is stale');
  requireGate(knownText(codeHash) && human.code_fingerprint === codeHash, 'human verification code is stale');
  const cleanup=live.current_cleanup_verification;
  requireGate(live.results?.rate_limit_statuses?.includes(429), 'live rate limiter evidence missing');
  requireGate(cleanup?.endpoint_status === 404 && cleanup.temporary_secret_removed === true
    && cleanup.temporary_local_key_deleted === true && cleanup.temporary_storage_removed === true
    && cleanup.public_contact_enabled === false && cleanup.contact_flags_false === true
    && Date.parse(cleanup.verified_at) >= completed && Date.parse(cleanup.verified_at) <= now
    && cleanup.configuration_fingerprint === securityConfigurationFingerprint(config), 'current live probe cleanup/configuration unverified');
  requireGate(human.probe_removed === true && human.temporary_secret_removed === true, 'human probe cleanup unverified');
  requireGate(Date.parse(human.cleanup_verified_at) >= completed && Date.parse(human.cleanup_verified_at) <= now, 'human cleanup evidence predates tests or is in the future');
  requireGate(owner.retention.public_privacy_sha256 === privacyHash, 'approved-policy privacy notice differs');
  requireGate(config.vars.CONTACT_DELIVERY === 'zoho' && config.vars.ZOHO_DATA_CENTER === 'us', 'verified Zoho provider/region missing');
}
export async function validateActivationEvidence(config) {
  const base = '.planning/contact-activation/';
  const parse = async name => JSON.parse(await readFile(base+name,'utf8'));
  const [owner,inventory,humanMetadata,panelExport,live,privacy] = await Promise.all([parse('owner-confirmations.json'),parse('forwarding-inventory.json'),parse('human-security.json'),parse('owner-reported-panel-export.json'),parse('live-security.json'),readFile('privacy.html')]);
  // Keep the owner's panel observations authoritative and verbatim. The companion
  // record supplies operator confirmation, fingerprints and cleanup attestations.
  const human = { ...humanMetadata, ...panelExport };
  const codeHash=await verifyHistoricalSecurityEvidence(human.code_fingerprint);
  validateGateRecords({owner,inventory,human,live,config,codeHash,privacyHash:createHash('sha256').update(privacy).digest('hex')});
}
export function validateActivationTransition(before, after) {
  requireGate(before.vars.CONTACT_ENABLED === 'false' && before.vars.CONTACT_RETENTION_APPROVED === 'false', 'transition baseline must be disabled');
  requireGate(after.vars.CONTACT_ENABLED === 'true' && after.vars.CONTACT_RETENTION_APPROVED === 'true', 'transition must enable both approved flags');
  requireGate(after.vars.CONTACT_DELIVERY === 'zoho' && after.vars.ZOHO_DATA_CENTER === 'us', 'transition provider/region mismatch');
  requireGate(!(before.durable_objects?.bindings ?? []).some(binding=>binding.name==='CONTACT_VERIFICATION_SESSIONS')
    && !(after.durable_objects?.bindings ?? []).some(binding=>binding.name==='CONTACT_VERIFICATION_SESSIONS'), 'temporary single-use verification storage must be retired before activation');
  const omit = config => ({...config,vars:Object.fromEntries(Object.entries(config.vars).filter(([key])=>!['CONTACT_ENABLED','CONTACT_RETENTION_APPROVED','CONTACT_DELIVERY','ZOHO_DATA_CENTER'].includes(key)))});
  requireGate(isDeepStrictEqual(omit(before),omit(after)), 'transition changes existing resources or unrelated configuration');
}
export function validateContactDisableTransition(before, after) {
  requireGate(before.vars.CONTACT_ENABLED === 'true' && before.vars.CONTACT_RETENTION_APPROVED === 'true', 'disable baseline must be live and retention-approved');
  requireGate(after.vars.CONTACT_ENABLED === 'false' && after.vars.CONTACT_RETENTION_APPROVED === 'false', 'disable transition must turn off both contact flags');
  const omitFlags = config => ({...config,vars:Object.fromEntries(Object.entries(config.vars).filter(([key])=>!['CONTACT_ENABLED','CONTACT_RETENTION_APPROVED'].includes(key)))});
  requireGate(isDeepStrictEqual(omitFlags(before),omitFlags(after)), 'disable transition changes existing resources or unrelated configuration');
}
export function validateProbeProvisionTransition(before, after) {
  requireGate(before.vars.CONTACT_ENABLED === 'false' && before.vars.CONTACT_RETENTION_APPROVED === 'false', 'private test provisioning requires disabled public contact');
  requireGate(!before.durable_objects && !before.migrations, 'unexpected pre-existing Durable Object state');
  const expected = structuredClone(before);
  expected.durable_objects = {bindings:[{name:'CONTACT_VERIFICATION_SESSIONS',class_name:'ContactVerificationSession'}]};
  expected.migrations = [{tag:'contact-verification-session-v1',new_sqlite_classes:['ContactVerificationSession']}];
  requireGate(isDeepStrictEqual(after,expected), 'private test provisioning changes configuration beyond its isolated single-use store');
}
export function validateProbeRetirementTransition(before, after) {
  requireGate(before.vars.CONTACT_ENABLED === 'false' && before.vars.CONTACT_RETENTION_APPROVED === 'false', 'private test retirement requires disabled public contact');
  requireGate(isDeepStrictEqual(before.durable_objects,{bindings:[{name:'CONTACT_VERIFICATION_SESSIONS',class_name:'ContactVerificationSession'}]})
    && isDeepStrictEqual(before.migrations,[{tag:'contact-verification-session-v1',new_sqlite_classes:['ContactVerificationSession']}]), 'unexpected private test storage state');
  const expected = structuredClone(before);
  delete expected.durable_objects;
  expected.migrations = [...before.migrations,{tag:'contact-verification-session-v2',deleted_classes:['ContactVerificationSession']}];
  requireGate(isDeepStrictEqual(after,expected), 'private test retirement changes unrelated configuration or fails to delete its store');
}
