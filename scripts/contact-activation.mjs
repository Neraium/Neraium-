// Operator-only activation steps. Credentials are read in memory, never printed.
import { readFile, writeFile, lstat, unlink, chmod, rename } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
import { isDeepStrictEqual } from 'node:util';
import { checkConfiguration, cloudflare } from './check-cloudflare-config.mjs';
import { sendZoho, zohoConfigured } from '../worker/zoho-mail.mjs';
import { validateActivationEvidence, validateActivationTransition } from './contact-activation-gates.mjs';

const store = '/home/ubuntu/.config/neraium';
const evidence = '.planning/contact-activation';
const names = ['ZOHO_CLIENT_ID', 'ZOHO_CLIENT_SECRET', 'ZOHO_REFRESH_TOKEN', 'ZOHO_ACCOUNT_ID'];
async function privateFile(name) {
  const path = `${store}/${name}`;
  const stat = await lstat(path);
  assert(stat.isFile() && stat.uid === process.getuid() && (stat.mode & 0o777) === 0o600);
  return readFile(path, 'utf8');
}
async function load() {
  const stat = await lstat(store);
  assert(stat.isDirectory() && stat.uid === process.getuid() && (stat.mode & 0o777) === 0o700);
  const credentials = JSON.parse(await privateFile('zoho-contact.json'));
  const proof = JSON.parse(await privateFile('zoho-contact-verification.json'));
  assert.equal(proof.client_fingerprint, createHash('sha256').update(credentials.ZOHO_CLIENT_ID).digest('hex'));
  assert.equal(credentials.ZOHO_ACCOUNT_ID, proof.ZOHO_ACCOUNT_ID);
  assert.equal(credentials.ZOHO_DATA_CENTER, proof.ZOHO_DATA_CENTER);
  assert.equal(proof.sender, 'website@neraium.com');
  assert.equal(proof.outgoing_allowed, true);
  // This campaign's independently verified data center is US.
  assert.equal(credentials.ZOHO_DATA_CENTER, 'us');
  const env = { ...credentials, CONTACT_FROM: 'website@neraium.com', CONTACT_TO: 'craig@neraium.com' };
  assert(zohoConfigured(env));
  return env;
}
async function token(credentials) {
  const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10000),
    body: new URLSearchParams({ grant_type: 'refresh_token', client_id: credentials.ZOHO_CLIENT_ID,
      client_secret: credentials.ZOHO_CLIENT_SECRET, refresh_token: credentials.ZOHO_REFRESH_TOKEN }),
  });
  assert(response.ok);
  const result = await response.json();
  assert(!result.error && typeof result.access_token === 'string' && result.expires_in > 60);
  return result;
}
async function verify(env) {
  const grant = await token(env);
  if (grant.scope) assert.equal(grant.scope, 'ZohoMail.messages.CREATE');
  const inspection = JSON.parse(await privateFile('zoho-contact-inspection.json'));
  assert.equal(inspection.ZOHO_CLIENT_ID, env.ZOHO_CLIENT_ID);
  assert.equal(inspection.ZOHO_DATA_CENTER, env.ZOHO_DATA_CENTER);
  const access = await token(inspection);
  const response = await fetch('https://mail.zoho.com/api/accounts', {
    headers: { Authorization: `Zoho-oauthtoken ${access.access_token}` },
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  assert(response.ok);
  const result = await response.json();
  assert.equal(result.status?.code, 200);
  const account = result.data.find(a => String(a.accountId) === env.ZOHO_ACCOUNT_ID);
  assert(account && account.enabled === true && account.mailboxStatus === 'enabled' && account.outgoingBlocked === false);
  assert.equal(account.mailboxAddress.toLowerCase(), 'craig@neraium.com');
  assert(account.emailAddress.some(a => a.mailId.toLowerCase() === env.CONTACT_FROM && a.isConfirmed === true));
  assert(account.sendMailDetails.some(a => a.fromAddress.toLowerCase() === env.CONTACT_FROM && a.status === true));
  const summary = { verified_at: new Date().toISOString(), sender_authorized: true,
    refresh_grant_valid: true, scope_reported_by_refresh: Boolean(grant.scope),
    expected_scope: 'ZohoMail.messages.CREATE', data_center: 'us', credentials_secure: true };
  await writeFile(`${evidence}/live-zoho-verification.json`, JSON.stringify(summary, null, 2) + '\n');
  console.log('Zoho refresh and independent sender inspection passed; credential payloads suppressed.');
}
async function inventory(env) {
  const inspection = JSON.parse(await privateFile('zoho-contact-inspection.json'));
  assert.equal(inspection.ZOHO_CLIENT_ID, env.ZOHO_CLIENT_ID);
  assert.equal(inspection.ZOHO_DATA_CENTER, env.ZOHO_DATA_CENTER);
  const access = await token(inspection);
  const response = await fetch(`https://mail.zoho.com/api/accounts/${env.ZOHO_ACCOUNT_ID}`, {
    headers: { Authorization: `Zoho-oauthtoken ${access.access_token}` },
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  assert(response.ok);
  const result = await response.json();
  assert.equal(result.status?.code, 200);
  const account = result.data;
  assert(account && !Array.isArray(account) && String(account.accountId) === env.ZOHO_ACCOUNT_ID);
  const allResponse = await fetch('https://mail.zoho.com/api/accounts', {
    headers: { Authorization: `Zoho-oauthtoken ${access.access_token}` },
    redirect: 'error', signal: AbortSignal.timeout(10000),
  });
  assert(allResponse.ok);
  const all = await allResponse.json();
  assert.equal(all.status?.code, 200);
  const full = all.data.find(a => String(a.accountId) === env.ZOHO_ACCOUNT_ID);
  assert(full);
  const forwardPresent = Object.hasOwn(full, 'mailForward') && Array.isArray(full.mailForward);
  const forwarding = forwardPresent ? full.mailForward.map(entry => {
    assert(typeof entry.mailForwardTo === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.mailForwardTo));
    return { destination: entry.mailForwardTo, status: ['ENABLED','DISABLED','CONFIRMED','UNCONFIRMED'].includes(entry.status) ? entry.status : 'unknown',
      deletion_owner: 'unassigned', policy_coverage_confirmed: false };
  }) : null;
  // Only structural names and explicitly safe settings leave process memory.
  const keys = Object.keys(account).filter(key => /forward|copy|pop|imap|sync|filter|route|backup|archiv/i.test(key));
  console.log(`Account inventory setting fields present: ${keys.join(', ')}`);
  const summary = { inspected_at: new Date().toISOString(), source: 'Zoho GET specific account, accounts.READ',
    mailbox: 'craig@neraium.com', setting_fields_present: keys,
    protocol_access: Object.fromEntries(['popAccessEnabled', 'popBlocked', 'imapAccessEnabled', 'imapBlocked', 'activeSyncEnabled'].map(name => [name, typeof account[name] === 'boolean' ? account[name] : 'unknown'])),
    account_forwarding: { list_explicitly_returned: forwardPresent, destinations: forwarding,
      delete_zoho_copy: typeof full.deleteCopy === 'boolean' ? full.deleteCopy : 'unknown' },
    forwarding_inventory_complete: false, additional_copy_inventory_complete: false,
    deletion_owners: [{ location: 'Zoho mailbox received, Sent and Trash', owner: 'Craig', basis: 'Owner-approved retention policy' }],
    unknown_surfaces: ['Mail filtering/automatic forward actions', 'Organization routing, copy/archive/journaling rules', 'Client downloads, exports, integrations and backups'] };
  await writeFile(`${evidence}/forwarding-inventory.json`, JSON.stringify(summary, null, 2) + '\n');
  console.log('Read-only account inventory saved; uncovered forwarding/copy surfaces remain unknown.');
}
async function loadCloudflare() {
  const raw = await privateFile('cloudflare.env');
  const match = raw.match(/^(?:export\s+)?CLOUDFLARE_API_TOKEN\s*=\s*["']?([^\s"']+)["']?\s*$/m);
  assert(match);
  process.env.CLOUDFLARE_API_TOKEN = match[1];
}
async function install(env) {
  await loadCloudflare();
  const before = await checkConfiguration();
  // Refuse to overwrite an existing installation without reviewing its state.
  assert(!before.secrets.some(name => names.includes(name)));
  const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
  const path = `accounts/${config.account_id}/workers/scripts/${config.name}`;
  const settings = await cloudflare(`${path}/settings`);
  const safeSettings = { ...settings, bindings: settings.bindings.map(b => b.type.startsWith('secret') ? { name: b.name, type: b.type } : b) };
  await writeFile(`${evidence}/pre-secret-settings.json`, JSON.stringify({ ...before, settings: safeSettings }, null, 2) + '\n', { flag: 'wx' });
  await cloudflare(`${path}/secrets-bulk`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/merge-patch+json' },
    body: JSON.stringify({ secrets: Object.fromEntries(names.map(name => [name, { name, type: 'secret_text', text: env[name] }])) }),
    redirect: 'error', signal: AbortSignal.timeout(20000),
  });
  await verifyInstallation();
}
async function verifyInstallation() {
  await loadCloudflare();
  const { settings, ...before } = JSON.parse(await readFile(`${evidence}/pre-secret-settings.json`, 'utf8'));
  const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
  const path = `accounts/${config.account_id}/workers/scripts/${config.name}`;
  const after = await checkConfiguration();
  assert.deepEqual(after.secrets, [...before.secrets, ...names].sort());
  const current = await cloudflare(`${path}/settings`);
  const sanitized = current.bindings.filter(b => !names.includes(b.name)).map(b => b.type.startsWith('secret') ? { name: b.name, type: b.type } : b);
  const sorted = values => [...values].sort((a,b) => a.name.localeCompare(b.name));
  assert.deepEqual(sorted(sanitized), sorted(settings.bindings));
  for (const [key, value] of Object.entries(settings)) {
    if (key === 'annotations') {
      // The bulk endpoint creates a deployment and changes its trigger metadata.
      const withoutTrigger = annotations => Object.fromEntries(Object.entries(annotations ?? {}).filter(([name]) => name !== 'workers/triggered_by'));
      assert.deepEqual(withoutTrigger(current[key]), withoutTrigger(value));
      continue;
    }
    if (!['bindings', 'modified_on'].includes(key) && !isDeepStrictEqual(current[key], value)) {
      console.log(`Post-install setting needs review: ${key}`);
      assert.deepEqual(current[key], value);
    }
  }
  await writeFile(`${evidence}/secret-installation.json`, JSON.stringify({ verified_at: new Date().toISOString(),
    installed_names: names, existing_secrets_preserved: true, resources_preserved: true,
    contact_enabled: false, retention_approved: false, deployment_trigger_metadata_changed: true,
    before: before.deployments, after: after.deployments }, null, 2) + '\n');
  console.log('Four Zoho secrets installed; existing secrets/resources and both false flags verified.');
}
async function send(env) {
  // Exclusive durable attempt marker prevents accidental repeat after timeout or restart.
  const timestamp = new Date().toISOString();
  const path = `${evidence}/controlled-email.json`;
  const result = { timestamp, sender: env.CONTACT_FROM, recipient: env.CONTACT_TO,
    attempted: true, provider_accepted: false, inbox_receipt_verified: false, automatic_retry: false };
  await writeFile(path, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  try {
    await sendZoho(env, `Visitor email (reply to this address): craig@neraium.com\n\nname: Neraium contact delivery verification\n\nemail: craig@neraium.com\n\norganization: Neraium\n\nfacility: Website delivery verification\n\nreview-question: Controlled delivery verification at ${timestamp}. Please confirm actual Inbox receipt, sender and this timestamp. No customer data.`);
    result.provider_accepted = true;
  } catch {
    result.acceptance_ambiguous = true;
  }
  await writeFile(path, JSON.stringify(result, null, 2) + '\n');
  console.log(result.provider_accepted ? `One controlled email accepted by Zoho at ${timestamp}; inbox confirmation still required.` : 'One controlled send attempted; acceptance unconfirmed. Check inbox before any retry.');
}
async function probeSecret(remove = false, rotate = false) {
  await loadCloudflare();
  const before = await checkConfiguration();
  const path = 'accounts/9820361c238dcdeef0b72b24ec3734db/workers/scripts/website';
  const name = 'CONTACT_VERIFICATION_KEY';
  let value;
  if (!remove) {
    const hasSecret = before.secrets.includes(name);
    assert.equal(hasSecret, rotate, rotate ? 'A live owned temporary session is required for rotation.' : 'No previous temporary session may exist.');
    assert(process.stdin.isTTY && process.stdout.isTTY, 'Temporary session provisioning requires a private interactive terminal.');
    const ownershipPath=`${evidence}/human-probe-key-ownership.json`;
    const localPath=`${store}/contact-verification.json`;
    let previousOwnership;
    if (rotate) {
      previousOwnership=JSON.parse(await readFile(ownershipPath,'utf8'));
      const previous=JSON.parse(await privateFile('contact-verification.json'));
      assert.equal(previousOwnership.created_by,'contact-activation.mjs');
      assert.equal(previousOwnership.worker,'website');
      assert.equal(previousOwnership.name,name);
      assert.equal(previousOwnership.session_id,previous.session_id);
      const previousToken=previous.url.match(/_([a-f0-9]{64})$/)?.[1];
      assert(previousToken);
      assert.equal(previousOwnership.token_sha256,createHash('sha256').update(previousToken).digest('hex'));
      assert.equal(previousOwnership.link_expires_at,previous.link_expires_at);
      assert.equal(previousOwnership.expires_at,previous.expires_at);
    }
    const recipe = (await readFile(`${evidence}/human-probe.mjs`,'utf8')).replace("'../../worker/contact.mjs'", "'./contact.mjs'");
    assert.equal(await readFile('worker/contact-human-verification.mjs','utf8'), recipe);
    const token=randomBytes(32).toString('hex'),sessionId=randomBytes(16).toString('hex');
    const expiresAt=Date.now()+2400000,linkExpiresAt=Math.min(Date.now()+1800000,expiresAt);
    const tokenHash=createHash('sha256').update(token).digest('hex');
    const session={session_id:sessionId,token_sha256:tokenHash,link_expires_at:linkExpiresAt,expires_at:expiresAt};
    const url=`https://neraium.com/api/contact-verification#neraium-v1=${sessionId}_${token}`;
    value=JSON.stringify(session);
    const nextPrivate=`${localPath}.next-${sessionId}`;
    const nextOwnership=`${ownershipPath}.next-${sessionId}`;
    await writeFile(nextPrivate,JSON.stringify({url,session_id:sessionId,expires_at:expiresAt,link_expires_at:linkExpiresAt})+'\n',{flag:'wx',mode:0o600});
    await chmod(nextPrivate,0o600);
    await writeFile(nextOwnership,JSON.stringify({created_by:'contact-activation.mjs',worker:'website',name,session_id:sessionId,token_sha256:tokenHash,expires_at:expiresAt,link_expires_at:linkExpiresAt})+'\n',{flag:'wx'});
    if (rotate) {
      const archive=`${ownershipPath}.${new Date().toISOString().replace(/[:.]/g,'-')}.superseded`;
      await writeFile(archive,JSON.stringify(previousOwnership,null,2)+'\n',{flag:'wx'});
    }
    await cloudflare(`${path}/secrets-bulk`, { method: 'PATCH', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify({ secrets: { [name]: { name, type: 'secret_text', text: value } } }) });
    // Replacing this session-bound secret invalidates every credential from the prior session.
    await rename(nextPrivate,localPath);
    await rename(nextOwnership,ownershipPath);
  } else {
    const ownership = JSON.parse(await readFile(`${evidence}/human-probe-key-ownership.json`,'utf8'));
    const session = JSON.parse(await privateFile('contact-verification.json'));
    assert.equal(ownership.created_by,'contact-activation.mjs');
    assert.equal(ownership.worker,'website');
    assert.equal(ownership.name,name);
    assert.equal(ownership.session_id,session.session_id);
    assert.equal(ownership.link_expires_at,session.link_expires_at);
    assert.equal(ownership.expires_at,session.expires_at);
    const token=session.url.match(/_([a-f0-9]{64})$/)?.[1];
    assert(token);
    assert.equal(ownership.token_sha256,createHash('sha256').update(token).digest('hex'));
    assert(before.secrets.includes(name));
  }
  if (remove) {
    await cloudflare(`${path}/secrets-bulk`, { method: 'PATCH', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/merge-patch+json' },
      body: JSON.stringify({ secrets: { [name]: null } }) });
  }
  const after = await checkConfiguration();
  assert.equal(after.secrets.includes(name), !remove);
  console.log(remove ? 'Temporary probe secret removed.' : rotate ? 'Prior private session revoked; fresh 30-minute link installed privately.' : 'Temporary probe secret securely installed.');
}
async function prepareHumanProbe() {
  const indexPath = 'worker/index.mjs';
  const source = await readFile(indexPath, 'utf8');
  assert(!source.includes('humanProbe') && source.includes('  async fetch(request, env) {'));
  const configPath='wrangler.jsonc';
  const configText=await readFile(configPath,'utf8');
  const config=JSON.parse(configText);
  assert(!config.durable_objects && !config.migrations);
  // Refuse to overwrite any existing module, backup, or temporary binding.
  const module = (await readFile(`${evidence}/human-probe.mjs`, 'utf8')).replace("'../../worker/contact.mjs'", "'./contact.mjs'");
  await writeFile(`${evidence}/human-probe-index-before.mjs.txt`, source, { flag:'wx' });
  await writeFile(`${evidence}/human-probe-wrangler-before.jsonc`, configText, {flag:'wx'});
  await writeFile('worker/contact-human-verification.mjs', module, { flag:'wx' });
  const updated = "import { humanProbe, ContactVerificationSession } from './contact-human-verification.mjs';\nexport { ContactVerificationSession };\n" + source.replace('  async fetch(request, env) {', "  async fetch(request, env) {\n    if (new URL(request.url).pathname.startsWith('/api/contact-verification')) return humanProbe(request, env);");
  await writeFile(indexPath, updated);
  config.durable_objects={bindings:[{name:'CONTACT_VERIFICATION_SESSIONS',class_name:'ContactVerificationSession'}]};
  config.migrations=[{tag:'contact-verification-session-v1',new_sqlite_classes:['ContactVerificationSession']}];
  await writeFile(configPath,JSON.stringify(config,null,2)+'\n');
  await writeFile(`${evidence}/human-probe-wrangler-active.jsonc`,JSON.stringify(config,null,2)+'\n',{flag:'wx'});
  console.log('Private link route and isolated single-use store prepared. Provision its guarded temporary binding before installing a link.');
}
async function restoreHumanProbe() {
  const before = await readFile(`${evidence}/human-probe-index-before.mjs.txt`, 'utf8');
  const expected = "import { humanProbe, ContactVerificationSession } from './contact-human-verification.mjs';\nexport { ContactVerificationSession };\n" + before.replace('  async fetch(request, env) {', "  async fetch(request, env) {\n    if (new URL(request.url).pathname.startsWith('/api/contact-verification')) return humanProbe(request, env);");
  assert.equal(await readFile('worker/index.mjs','utf8'), expected);
  const recipe = (await readFile(`${evidence}/human-probe.mjs`,'utf8')).replace("'../../worker/contact.mjs'", "'./contact.mjs'");
  assert.equal(await readFile('worker/contact-human-verification.mjs','utf8'),recipe);
  await loadCloudflare();
  const remote = await checkConfiguration();
  assert(!remote.secrets.includes('CONTACT_VERIFICATION_KEY'));
  const baseline=JSON.parse(await readFile(`${evidence}/human-probe-wrangler-before.jsonc`,'utf8'));
  const active=JSON.parse(await readFile(`${evidence}/human-probe-wrangler-active.jsonc`,'utf8'));
  assert.deepEqual(JSON.parse(await readFile('wrangler.jsonc','utf8')),active);
  const ownership = JSON.parse(await readFile(`${evidence}/human-probe-key-ownership.json`,'utf8'));
  const session = JSON.parse(await privateFile('contact-verification.json'));
  assert.equal(ownership.session_id,session.session_id);
  assert.equal(ownership.token_sha256,createHash('sha256').update(session.url.match(/_([a-f0-9]{64})$/)?.[1]??'').digest('hex'));
  const retired=structuredClone(baseline);
  retired.migrations=[...active.migrations,{tag:'contact-verification-session-v2',deleted_classes:['ContactVerificationSession']}];
  await writeFile('worker/index.mjs', before);
  await unlink('worker/contact-human-verification.mjs');
  await privateFile('contact-verification.json');
  await unlink(`${store}/contact-verification.json`);
  await writeFile('wrangler.jsonc',JSON.stringify(retired,null,2)+'\n');
  console.log('Single-use session material removed and temporary class retired in the guarded deployment plan.');
}
async function deployProbeProvision() {
  await loadCloudflare();
  const baseline=JSON.parse(await readFile(`${evidence}/human-probe-wrangler-before.jsonc`,'utf8'));
  const {deployProduction}=await import('./deploy-production.mjs');
  await deployProduction({provisionProbeFrom:baseline,reuseAssets:true});
}
async function deployProbeRetirement() {
  await loadCloudflare();
  const active=JSON.parse(await readFile(`${evidence}/human-probe-wrangler-active.jsonc`,'utf8'));
  const {deployProduction}=await import('./deploy-production.mjs');
  await deployProduction({retireProbeFrom:active,reuseAssets:true});
}
async function activate() {
  await loadCloudflare();
  const before = JSON.parse(await readFile('wrangler.jsonc','utf8'));
  const after = structuredClone(before);
  Object.assign(after.vars, {CONTACT_ENABLED:'true',CONTACT_RETENTION_APPROVED:'true',CONTACT_DELIVERY:'zoho',ZOHO_DATA_CENTER:'us'});
  await validateActivationEvidence(after);
  validateActivationTransition(before, after);
  await checkConfiguration();
  // Do not write enabled flags or upload anything until every recorded gate passes.
  await writeFile(`${evidence}/disabled-baseline.json`, JSON.stringify(before,null,2)+'\n', {flag:'wx'});
  await writeFile('wrangler.jsonc',JSON.stringify(after,null,2)+'\n');
  const { deployProduction } = await import('./deploy-production.mjs');
  await deployProduction({transitionFrom:before,reuseAssets:true});
}
try {
  const env = await load();
  const mode = process.argv[2];
  assert(['verify', 'inventory', 'install', 'verify-installation', 'send', 'config-check', 'probe-install', 'probe-rotate', 'probe-remove', 'probe-prepare', 'probe-restore', 'probe-provision', 'probe-retire', 'deploy', 'activate'].includes(mode));
  if (mode === 'verify') await verify(env);
  if (mode === 'inventory') await inventory(env);
  if (mode === 'install') await install(env);
  if (mode === 'verify-installation') await verifyInstallation();
  if (mode === 'send') await send(env);
  if (mode === 'config-check') { await loadCloudflare(); await checkConfiguration(); }
  if (mode === 'probe-install') await probeSecret();
  if (mode === 'probe-rotate') await probeSecret(false,true);
  if (mode === 'probe-remove') await probeSecret(true);
  if (mode === 'probe-prepare') await prepareHumanProbe();
  if (mode === 'probe-restore') await restoreHumanProbe();
  if (mode === 'deploy') { await loadCloudflare(); const {deployProduction}=await import('./deploy-production.mjs'); await deployProduction({reuseAssets:true}); }
  if (mode === 'activate') await activate();
  if (mode === 'probe-provision') await deployProbeProvision();
  if (mode === 'probe-retire') await deployProbeRetirement();
} catch {
  console.error('Activation step stopped; sensitive error details suppressed. Inspect sanitized evidence before retrying.');
  process.exitCode = 1;
}
