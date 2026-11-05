// Release-only maintenance policy. No production handler or activation override.
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { validateGateRecords, securityConfigurationFingerprint, verifyHistoricalSecurityEvidence } from './contact-activation-gates.mjs';
import { recognizeIsolatedEvidence, evidenceDigest } from '../verification/contact/evidence-review.mjs';
import { subject } from '../verification/contact/subject-identity.mjs';
import { validateIsolatedConfig } from './review-isolated-verifier.mjs';

const anchor = '80cfbb5688e9be5d5176ba9f4c9f0a2a3581f035';
const hold = (ok, reason) => { if (!ok) throw Error(`Contact maintenance held: ${reason}`); };
const sha = value => createHash('sha256').update(value).digest('hex');
const active = config => config?.vars?.CONTACT_ENABLED === 'true' && config?.vars?.CONTACT_RETENTION_APPROVED === 'true';
const known = value => typeof value === 'string' && value.trim() && !/\b(unknown|pending|tbd|unassigned)\b/i.test(value);
const uuid = value => /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value ?? '');
function noCredentials(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    hold(!/^(?:token|ticket|cookie|password|secret|private_url|authorization|VERIFIER_ACCESS|TURNSTILE_SECRET_KEY|ZOHO_.*)$/i.test(key), 'raw credentials must not be recorded');
    noCredentials(item);
  }
}

export function contactVerificationMode(current, remoteBindings, { expectedConfig } = {}) {
  // Every transition, including explicit --activate-contact, retains activation checks.
  if (!active(current) || expectedConfig) return 'activation';
  const remote = name => remoteBindings.find(b => b.name === name && b.type === 'plain_text')?.text;
  return remote('CONTACT_ENABLED') === 'true' && remote('CONTACT_RETENTION_APPROVED') === 'true' ? 'maintenance' : 'activation';
}

export function validateMaintenanceRecords(record, { config, settings, subjectHash, packageHash, privacyHash, now = Date.now() }) {
  hold(active(config), 'maintenance requires already-active intake');
  hold(contactVerificationMode(config, settings?.bindings ?? []) === 'maintenance', 'remote intake is not already active');
  hold(record?.schema === 'neraium.contact-maintenance.v1', 'fresh maintenance evidence missing; follow verification/contact/MAINTENANCE.md');
  noCredentials(record);
  hold(record.configuration_fingerprint === securityConfigurationFingerprint(config), 'configuration changed');
  hold(record.privacy_sha256 === privacyHash && record.subject_sha256 === subjectHash, 'Privacy or handler identity changed');
  const isolated = record.isolated;
  hold(isolated?.expectation?.subject_sha256 === subjectHash && isolated.expectation.reviewed_package_sha256 === packageHash, 'isolated source/package differs');
  const recognized = recognizeIsolatedEvidence(isolated.panel, isolated.expectation, isolated.attestation, { now });
  hold(recognized.proves_production_hostname === false, 'isolated evidence scope changed');
  validateIsolatedConfig(isolated.configuration, config, { deploymentCandidate: true });
  hold(isolated.configuration.vars.VERIFIER_HOSTNAME === isolated.panel.hostname && isolated.deployment_artifact_verified === true && known(isolated.inspected_by), 'independent isolated deployment/configuration review missing');

  const production = record.production;
  hold(production?.hostname === 'neraium.com' && production.site_key === config.vars.TURNSTILE_SITE_KEY, 'actual production origin/widget required');
  const started = Date.parse(production.started_at), completed = Date.parse(production.completed_at);
  hold(Number.isFinite(started) && completed >= started && completed <= now && completed-started <= 1200000 && now-completed <= 604800000, 'production session stale or invalid');
  hold(production.human_operated === true && production.confirmed_by_user === true && known(production.operator), 'actual production human confirmation required');
  hold(Array.isArray(production.results) && production.results.length === 3, 'production success/replay/validation required');
  let previous = started;
  const statuses = { success: 200, replay: 400, validation: 400 };
  for (const [index, scenario] of Object.keys(statuses).entries()) {
    const result = production.results[index], at = Date.parse(result?.observed_at);
    hold(result?.scenario === scenario && result.http_status === statuses[scenario] && Number.isFinite(at) && at >= previous && at <= completed && uuid(result.diagnostic_id), `production ${scenario} missing/invalid`);
    previous = at;
  }
  hold(production.success_accepted === true && production.exact_request_replayed === true && production.replay_response_error === 'Security verification expired or failed. Please try again.' && production.validation_response_error === 'Please check the fields and complete the security verification.', 'production response semantics unverified');
  hold(Array.isArray(production.rate_limit_statuses) && production.rate_limit_statuses.length <= 8 && production.rate_limit_statuses.every(n => [400,429].includes(n)) && production.rate_limit_statuses.includes(429), 'production limiter rejection missing');
  hold(Date.parse(production.rate_limit_observed_at) >= previous && Date.parse(production.rate_limit_observed_at) <= completed, 'production limiter timing invalid');
  const receipt = production.receipt;
  hold(receipt?.verified === true && receipt.method === 'Visual verification in Zoho Mail Inbox' && receipt.sender === config.vars.CONTACT_FROM && receipt.recipient === config.vars.CONTACT_TO && receipt.subject === 'Neraium evaluation inquiry' && uuid(receipt.test_identifier), 'fresh actual Inbox receipt missing');
  hold(Date.parse(receipt.observed_at) >= Date.parse(production.results[0].observed_at) && Date.parse(receipt.observed_at) <= completed && receipt.test_identifier === production.test_identifier, 'Inbox receipt is not bound to this inquiry');

  const before = record.before, after = record.after, cleanup = record.cleanup;
  const earliest = Math.min(started, Date.parse(isolated.panel.started_at));
  const latest = Math.max(completed, Date.parse(isolated.panel.completed_at));
  hold(before?.schema === 'neraium.verifier-boundaries.v1' && after?.schema === before.schema && Date.parse(before.observed_at) <= earliest && earliest-Date.parse(before.observed_at) <= 86400000 && Date.parse(after.observed_at) >= latest && Date.parse(after.observed_at) <= now && now-Date.parse(after.observed_at) <= 604800000, 'session boundary captures missing/stale');
  for (const snapshot of [before, after]) {
    hold(snapshot.account_id === config.account_id && snapshot.production_worker === config.name && snapshot.production?.status === 'verified' && snapshot.production.bindings_match_local === true && snapshot.live?.status === 'verified' && snapshot.live.intake_enabled === true && snapshot.live.site_key_matches_local === true && snapshot.isolated_worker_exists === false, 'production boundary or isolated removal unverified');
    for (const key of ['settings_sha256','routes_sha256','domains_sha256','subdomain_sha256','schedules_sha256','latest_deployment_sha256']) hold(/^[a-f0-9]{64}$/.test(snapshot.production[key] ?? ''), `boundary ${key} missing`);
    hold(snapshot.live.contact_status === 200 && snapshot.live.homepage_status === 200 && /^[a-f0-9]{64}$/.test(snapshot.live.homepage_sha256 ?? '') && Object.keys(snapshot.live.asset_hashes ?? {}).length === 2 && Object.values(snapshot.live.asset_hashes).every(hash => /^[a-f0-9]{64}$/.test(hash)), 'public boundary incomplete');
  }
  hold(isDeepStrictEqual(before.production, after.production) && isDeepStrictEqual(before.live, after.live), 'production changed during verification');
  // DNS is outside this route-free workers.dev operation. Unknown DNS is not promoted to verified.
  hold(after.production.settings_sha256 === evidenceDigest(settings), 'current production settings differ from verified session');
  hold(cleanup?.hostname === isolated.panel.hostname && cleanup.session_id === isolated.panel.session_id && cleanup.site_key === isolated.configuration.vars.TURNSTILE_SITE_KEY, 'cleanup resource identity differs');
  hold(Date.parse(cleanup.verified_at) >= latest && Date.parse(cleanup.verified_at) <= Date.parse(after.observed_at), 'cleanup time invalid');
  for (const key of ['access_denied','worker_removed','widget_removed','secrets_removed','storage_removed','private_files_removed','production_intake_enabled']) hold(cleanup[key] === true, `cleanup ${key} unverified`);
  const { confirmation, ...observations } = record;
  hold(confirmation?.human_operated === true && confirmation.confirmed_by_user === true && known(confirmation.operator) && confirmation.evidence_sha256 === evidenceDigest(observations) && Date.parse(confirmation.confirmed_at) >= Date.parse(after.observed_at) && Date.parse(confirmation.confirmed_at) <= now, 'actual confirmation must bind the complete evidence');
  return { mode: 'maintenance', isolated_scope: recognized.recognized_scope, production_hostname_verified_separately: true };
}

async function historicalActivation(config) {
  const archived = path => execFileSync('git', ['show', `${anchor}:${path}`], { encoding: 'utf8', stdio: ['ignore','pipe','ignore'] });
  const parse = name => JSON.parse(archived(`.planning/contact-activation/${name}`));
  const baseline = JSON.parse(archived('wrangler.jsonc'));
  hold(active(baseline) && active(config) && isDeepStrictEqual(baseline, config), 'maintenance cannot change production configuration or enable first-time intake');
  for (const path of ['worker/index.mjs','worker/contact.mjs','worker/zoho-mail.mjs','.planning/contact-activation/human-probe.mjs']) hold(archived(path) === await readFile(path,'utf8'), 'production handler/security controls changed; fresh activation review required');
  const human = { ...parse('human-security.json'), ...parse('owner-reported-panel-export.json') }, live = parse('live-security.json');
  // Immutable historical activation is checked at its actual cleanup time, never as fresh maintenance evidence.
  const at = Date.parse(live.current_cleanup_verification.verified_at) + 1000;
  const codeHash = await verifyHistoricalSecurityEvidence(human.code_fingerprint);
  validateGateRecords({ config: baseline, human, live, owner: parse('owner-confirmations.json'), inventory: parse('forwarding-inventory.json'), privacyHash: sha(archived('privacy.html')), codeHash }, at);
  // Current approvals cannot be substituted by the archived owner record.
  validateGateRecords({ config, human, live, owner: JSON.parse(await readFile('.planning/contact-activation/owner-confirmations.json','utf8')), inventory: JSON.parse(await readFile('.planning/contact-activation/forwarding-inventory.json','utf8')), privacyHash: sha(await readFile('privacy.html')), codeHash }, at);
}

export async function validateMaintenanceEvidence(config, settings, api) {
  await historicalActivation(config);
  let record;
  try { record = JSON.parse(await readFile('.planning/contact-maintenance/evidence.json','utf8')); }
  catch { throw Error('Contact maintenance held: fresh maintenance evidence missing; follow verification/contact/MAINTENANCE.md'); }
  for (const [path, expected] of Object.entries(subject.files)) hold(sha(await readFile(path)) === expected, 'isolated subject differs from production source');
  const manifest = JSON.parse(await readFile('verification/contact/review-manifest.json','utf8'));
  const files = {};
  for (const [path, expected] of Object.entries(manifest.files)) { files[path] = sha(await readFile(path)); hold(files[path] === expected, 'reviewed isolated package changed'); }
  hold(sha(JSON.stringify(files)) === manifest.package_sha256, 'reviewed package fingerprint invalid');
  const result = validateMaintenanceRecords(record, { config, settings, subjectHash: subject.sha256, packageHash: manifest.package_sha256, privacyHash: sha(await readFile('privacy.html')) });
  // A hand-written cleanup checkbox cannot conceal an extant verifier Worker.
  await validateVerifierRemoval(config, api);
  return result;
}

export async function validateVerifierRemoval(config, api) {
  let absent = false;
  try { await api(`accounts/${config.account_id}/workers/scripts/neraium-contact-verifier/settings`); }
  catch (error) { absent = /\(HTTP 404\)/.test(error.message); }
  hold(absent, 'isolated verifier removal not independently confirmed');
}
