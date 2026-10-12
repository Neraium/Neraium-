import { spawnSync } from 'node:child_process';
import { checkConfiguration } from './check-cloudflare-config.mjs';

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, CI: 'true', CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false' } });
  if (result.status !== 0) throw new Error(`${command} failed; deployment stopped.`);
}
try {
  const before = await checkConfiguration();
  run('npm', ['run', 'build']);
  run('./node_modules/.bin/wrangler', ['deploy', '--config', 'wrangler.jsonc', '--dry-run', '--outdir', 'artifacts/production/worker']);
  // Compare again immediately before upload. CI + --strict rejects override warnings.
  await checkConfiguration();
  run('./node_modules/.bin/wrangler', ['deploy', '--config', 'wrangler.jsonc', '--strict']);
  const after = await checkConfiguration();
  if (before.secrets.some(name => !after.secrets.includes(name))) throw new Error('Post-deployment secret inventory differs; inspect production immediately.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
