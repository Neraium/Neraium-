import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

export const inventorySurfaces = ['mailbox-forwarding','mailbox-filter-actions','organization-routing-copies','organization-archives-journaling','clients-exports-integrations','provider-backups'];
const requireGate = (passed, message) => { if (!passed) throw Error(`Contact activation held: ${message}`); };
const knownText = value => typeof value === 'string' && Boolean(value.trim()) && !/\b(unknown|unassigned|pending|tbd)\b/i.test(value);
export const securityConfigurationFingerprint = config => createHash('sha256').update(JSON.stringify({ name:config.name,account_id:config.account_id,hostnames:config.vars.CONTACT_HOSTNAMES,sitekey:config.vars.TURNSTILE_SITE_KEY,from:config.vars.CONTACT_FROM,to:config.vars.CONTACT_TO,routes:config.routes,ratelimits:config.ratelimits })).digest('hex');
export async function securityCodeFingerprint() {
  const hash=createHash('sha256');
  for(const path of ['worker/contact.mjs','worker/zoho-mail.mjs','.planning/contact-activation/human-probe.mjs']) hash.update(path).update('\0').update(await readFile(path)).update('\0');
  return hash.digest('hex');
}
export function validateGateRecords({ owner, inventory, human, live, privacyHash, codeHash, config }) {
  requireGate(owner.receipt?.verified === true && owner.receipt.method === 'Visual verification in Zoho Mail Inbox'
    && owner.receipt.sender === 'website@neraium.com' && owner.receipt.recipient === 'craig@neraium.com'
    && owner.receipt.subject === 'Neraium evaluation inquiry' && owner.receipt.message_timestamp === '2026-10-13T01:05:12.798Z', 'actual Inbox receipt');
  const policy = owner.retention?.noncustomer_inquiries;
  requireGate(policy?.delete_within_days_of_last_correspondence === 90 && ['Received','Sent','Trash'].every(s=>policy.covers?.includes(s))
    && Boolean(owner.retention.customer_records) && Boolean(owner.retention.approved_at), 'explicit retention approval');
  requireGate(inventory.forwarding_inventory_complete === true && inventory.additional_copy_inventory_complete === true, 'forwarding and copy inventory incomplete');
  requireGate(inventory.owner_attested === true && knownText(inventory.confirmed_by), 'owner copy inventory confirmation missing');
  requireGate(Array.isArray(inventory.unknown_surfaces) && inventory.unknown_surfaces.length === 0, 'unresolved copy surfaces remain');
  for (const id of inventorySurfaces) {
    const surface = inventory.surfaces?.find(s=>s.id===id);
    requireGate(surface && knownText(surface.inspected_by) && Number.isFinite(Date.parse(surface.inspected_at)) && knownText(surface.method), `inspection missing: ${id}`);
    requireGate(['inspected-none','copies-present','provider-managed'].includes(surface.status), `unknown copy surface: ${id}`);
    if (surface.status === 'inspected-none') requireGate(Array.isArray(surface.copies) && surface.copies.length === 0, `contradictory empty inventory: ${id}`);
    if (surface.status === 'copies-present') {
      requireGate(Array.isArray(surface.copies) && surface.copies.length > 0, `copy locations missing: ${id}`);
      for (const copy of surface.copies) requireGate(knownText(copy.destination) && knownText(copy.deletion_owner) && copy.retention_days === 90 && copy.associated_sent_trash_covered === true, `copy deletion ownership/policy incomplete: ${id}`);
    }
    if (surface.status === 'provider-managed') requireGate(id === 'provider-backups' && knownText(surface.terms_reference) && knownText(surface.oversight_owner), 'provider backup handling incomplete');
  }
  requireGate(human?.human_operated === true && human.confirmed_by_user === true && Boolean(human.operator)
    && ['neraium.com','www.neraium.com'].includes(human.hostname) && Number.isFinite(Date.parse(human.completed_at)), 'human-operated challenge evidence missing');
  requireGate(human.configuration_fingerprint === securityConfigurationFingerprint(config), 'human verification configuration is stale');
  requireGate(knownText(codeHash) && human.code_fingerprint === codeHash, 'human verification code is stale');
  const started=Date.parse(human.started_at),completed=Date.parse(human.completed_at),now=Date.now();
  requireGate(Number.isFinite(started) && completed >= started && completed <= now && completed-started <= 1200000 && now-completed <= 604800000, 'human session timestamps are stale or invalid');
  const expected = { success:200, replay:400, expiry:400, failure:502, recovery:200, invalid:400, validation:400 };
  const times={};
  for (const [scenario, status] of Object.entries(expected)) {
    const result = human.results?.find(r=>r.scenario===scenario && r.http_status===status);
    requireGate(Boolean(result), `human test missing/failed: ${scenario}`);
    times[scenario]=Date.parse(result.observed_at);
    requireGate(Number.isFinite(times[scenario]) && times[scenario] >= started && times[scenario] <= completed, `test timestamp invalid: ${scenario}`);
    if (['success','failure','recovery'].includes(scenario)) requireGate(result.challenge_checked === true && result.challenge_valid === true, `real challenge failed: ${scenario}`);
    if (['replay','expiry'].includes(scenario)) requireGate(result.challenge_checked === true && result.duplicate_or_expired === true && result.challenge_valid === false, `duplicate/expiry rejection unverified: ${scenario}`);
    if (scenario === 'expiry') requireGate(result.captured_age_seconds >= 310 && human.unused_expiry_token_frozen === true && Date.parse(result.captured_at) >= started && times.expiry-Date.parse(result.captured_at) >= 310000, 'genuine unused-token expiry unverified');
  }
  requireGate(times.replay >= times.success && times.recovery >= times.failure, 'replay/recovery test ordering invalid');
  requireGate(live.results?.rate_limit_statuses?.includes(429) && live.cleanup?.temporary_secret_removed === true && live.endpoint_removed === true, 'live limiter or probe cleanup unverified');
  requireGate(human.probe_removed === true && human.temporary_secret_removed === true, 'human probe cleanup unverified');
  requireGate(Date.parse(human.cleanup_verified_at) >= completed && Date.parse(human.cleanup_verified_at) <= now, 'human cleanup evidence predates tests or is in the future');
  requireGate(owner.retention.public_privacy_sha256 === privacyHash, 'approved-policy privacy notice differs');
  requireGate(config.vars.CONTACT_DELIVERY === 'zoho' && config.vars.ZOHO_DATA_CENTER === 'us', 'verified Zoho provider/region missing');
}
export async function validateActivationEvidence(config) {
  const base = '.planning/contact-activation/';
  const parse = async name => JSON.parse(await readFile(base+name,'utf8'));
  const [owner,inventory,human,live,privacy,codeHash] = await Promise.all([parse('owner-confirmations.json'),parse('forwarding-inventory.json'),parse('human-security.json'),parse('live-security.json'),readFile('privacy.html'),securityCodeFingerprint()]);
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
