import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';
import { pathToFileURL } from 'node:url';

export async function cloudflare(path, options = {}) {
  if (!process.env.CLOUDFLARE_API_TOKEN) throw new Error('Load the existing Cloudflare API token into the environment before comparing or deploying.');
  const response = await fetch(`https://api.cloudflare.com/client/v4/${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`, ...options.headers },
  });
  const body = await response.json();
  // Do not print request bodies, binding values, credentials, or API error payloads.
  if (!response.ok || !body.success) throw new Error(`Cloudflare inspection failed: ${path} (HTTP ${response.status}).`);
  return body.result;
}

export function compareBindings(config, bindings) {
  const expected = [
    { name: config.assets.binding, type: 'assets' },
    ...Object.entries(config.vars).map(([name, text]) => ({ name, type: 'plain_text', text })),
    ...config.send_email.map(binding => ({ ...binding, type: 'send_email' })),
    ...config.ratelimits.map(binding => ({ ...binding, type: 'ratelimit' })),
  ];
  const differences = [];
  const secrets = bindings.filter(binding => ['secret_text', 'secret_key'].includes(binding.type)).map(binding => binding.name).sort();
  for (const name of config.secrets.required) {
    if (!secrets.includes(name)) differences.push(`Required secret unavailable: ${name}`);
    if (Object.hasOwn(config.vars, name)) differences.push(`Secret conflicts with public variable: ${name}`);
  }
  for (const binding of expected) {
    const actual = bindings.find(candidate => candidate.name === binding.name);
    if (!isDeepStrictEqual(binding, actual)) differences.push(`Binding differs: ${binding.name}`);
  }
  for (const binding of bindings) {
    if (!secrets.includes(binding.name) && !expected.some(candidate => candidate.name === binding.name)) differences.push(`Unmanaged remote binding: ${binding.name}`);
  }
  return { differences, secrets };
}

export async function checkConfiguration() {
  // wrangler.jsonc deliberately uses JSON syntax so this check needs no second parser.
  const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
  if (config.name !== 'website' || config.account_id !== '9820361c238dcdeef0b72b24ec3734db') throw new Error('Unexpected production Worker or account.');
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_ACCOUNT_ID !== config.account_id) throw new Error('Environment account differs from production configuration.');
  if (config.vars.CONTACT_ENABLED !== 'false' || config.vars.CONTACT_RETENTION_APPROVED !== 'false') throw new Error('Production contact and retention flags must remain false.');
  if (config.keep_vars) throw new Error('Production public variables must be fully represented in wrangler.jsonc.');
  const root = `accounts/${config.account_id}/workers`;
  const script = `${root}/scripts/${config.name}`;
  const [settings, routes, domains, subdomain, schedules, deployments] = await Promise.all([
    cloudflare(`${script}/settings`),
    cloudflare(`${root}/services/${config.name}/environments/production/routes?show_zonename=true`),
    cloudflare(`${root}/domains`),
    cloudflare(`${script}/subdomain`),
    cloudflare(`${script}/schedules`),
    cloudflare(`${script}/deployments`),
  ]);
  const { differences, secrets } = compareBindings(config, settings.bindings);
  const actualRoutes = [
    ...routes.map(route => ({ pattern: route.pattern, zone_name: route.zone_name })),
    ...domains.filter(domain => domain.service === config.name && domain.environment === 'production').map(domain => ({
      pattern: domain.hostname, zone_name: domain.zone_name, custom_domain: true,
      enabled: domain.enabled, previews_enabled: domain.previews_enabled,
    })),
  ];
  const sorted = values => [...values].sort((a, b) => a.pattern.localeCompare(b.pattern));
  if (!isDeepStrictEqual(sorted(config.routes), sorted(actualRoutes))) differences.push('Production routes/custom domains differ.');
  if (settings.compatibility_date !== config.compatibility_date || !isDeepStrictEqual(settings.compatibility_flags || [], config.compatibility_flags || [])) differences.push('Compatibility settings differ.');
  if (subdomain.enabled !== config.workers_dev || subdomain.previews_enabled !== config.preview_urls) differences.push('Workers.dev/preview settings differ.');
  if (schedules.schedules.length) differences.push('Unmanaged production cron schedules.');
  if (settings.tail_consumers?.length || settings.logpush || settings.placement?.mode || settings.limits || settings.observability?.enabled || settings.tags?.length) differences.push('Additional production settings require explicit reconciliation.');
  if (differences.length) throw new Error(`Deployment blocked:\n${differences.join('\n')}`);
  console.log('Remote configuration matches: public variables, all resource bindings, both production domains, and disabled contact.');
  console.log(`Existing secret names verified (values never retrieved): ${secrets.join(', ')}`);
  console.log(`Current deployment: ${deployments.deployments[0]?.id}; version: ${deployments.deployments[0]?.versions.map(version => version.version_id).join(', ')}`);
  return { secrets, deployments };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await checkConfiguration(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
