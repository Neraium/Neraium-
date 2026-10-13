import { spawnSync, execFileSync } from 'node:child_process';
import { checkConfiguration } from './check-cloudflare-config.mjs';
import { validateActivationTransition, validateContactDisableTransition, validateProbeProvisionTransition, validateProbeRetirementTransition } from './contact-activation-gates.mjs';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { reuseBuiltAssets } from './reuse-built-assets.mjs';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, CI: 'true', CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false' } });
  if (result.status !== 0) throw new Error(`${command} failed; deployment stopped.`);
}
export async function deployProduction({ transitionFrom, disableContactFrom, provisionProbeFrom, retireProbeFrom, reuseAssets = false } = {}) {
  const localConfig = JSON.parse(await readFile('wrangler.jsonc','utf8'));
  if (transitionFrom) validateActivationTransition(transitionFrom,localConfig);
  if (disableContactFrom) validateContactDisableTransition(disableContactFrom,localConfig);
  if (provisionProbeFrom) validateProbeProvisionTransition(provisionProbeFrom,localConfig);
  if (retireProbeFrom) validateProbeRetirementTransition(retireProbeFrom,localConfig);
  const baseline = transitionFrom ?? disableContactFrom ?? provisionProbeFrom ?? retireProbeFrom;
  const compare = () => checkConfiguration(baseline ? { expectedConfig: baseline, validateTransition: false } : {});
  const before = await compare();
  if (reuseAssets) await reuseBuiltAssets({refreshMetadata:true});
  else run('npm', ['run', 'build']);
  run('./node_modules/.bin/wrangler', ['deploy', '--config', 'wrangler.jsonc', '--dry-run', '--outdir', 'artifacts/production/worker']);
  // Compare again immediately before upload. CI + --strict rejects override warnings.
  await compare();
  if (reuseAssets) await reuseBuiltAssets();
  run('./node_modules/.bin/wrangler', ['deploy', '--config', 'wrangler.jsonc', '--strict']);
  const after = await checkConfiguration();
  if (before.secrets.some(name => !after.secrets.includes(name))) throw new Error('Post-deployment secret inventory differs; inspect production immediately.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const transitionFrom = process.argv.includes('--activate-contact') ? JSON.parse(await readFile('.planning/contact-activation/disabled-baseline.json','utf8')) : undefined;
    const disableContactFrom = process.argv.includes('--disable-contact')
      ? JSON.parse(execFileSync('git',['show','HEAD:wrangler.jsonc'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}))
      : undefined;
    await deployProduction({ transitionFrom, disableContactFrom, reuseAssets:process.argv.includes('--reuse-assets') });
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
