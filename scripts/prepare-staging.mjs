import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

const release = '1f2b51c312e299f590c5d79338ca0a2e7a67178c';
const destination = 'dist-staging';
const config = JSON.parse(await readFile('wrangler.staging.jsonc', 'utf8'));
const production = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
const expected = {
  name: 'neraium-phase2-staging-1f2b51c', main: 'worker/index.mjs', compatibility_date: '2026-08-05',
  workers_dev: true, preview_urls: false, routes: [],
  assets: { directory: './dist-staging', binding: 'ASSETS', html_handling: 'auto-trailing-slash', not_found_handling: '404-page', run_worker_first: ['/api/*'] },
  vars: { CONTACT_ENABLED: 'false', CONTACT_RETENTION_APPROVED: 'false' },
};
for (const [key, value] of Object.entries(expected)) {
  if (JSON.stringify(config[key]) !== JSON.stringify(value)) throw new Error(`Unsafe staging configuration: ${key}`);
}
const allowed = new Set(['$schema', ...Object.keys(expected)]);
if (Object.keys(config).some(key => !allowed.has(key)) || config.name === production.name) throw new Error('Staging must have a separate identity and no additional bindings or routes.');
const digest = buffer => createHash('sha256').update(buffer).digest('hex');
async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing symlink: ${relative}`);
    if (entry.isDirectory()) result.push(...await files(path.join(directory, entry.name), relative));
    else if (entry.isFile()) result.push(relative);
    else throw new Error(`Unexpected input: ${relative}`);
  }
  return result.sort();
}
const approvedProductionConfig = execFileSync('git', ['show', `${release}:wrangler.jsonc`]);
if (digest(await readFile('wrangler.jsonc')) !== digest(approvedProductionConfig)) throw new Error('Production configuration differs from the verified release.');
const publicFiles = await files('dist');
const workerFiles = ['worker/index.mjs', 'worker/contact.mjs'];
const manifest = { release_commit: release, staging_worker: config.name, files: {}, worker: {}, staging_overrides: ['_headers', 'robots.txt'] };
for (const file of [...publicFiles, ...workerFiles]) {
  const bytes = await readFile(workerFiles.includes(file) ? file : path.join('dist', file));
  const committed = execFileSync('git', ['show', `${release}:${file}`], { maxBuffer: 26 * 1024 * 1024 });
  if (digest(bytes) !== digest(committed)) throw new Error(`Package differs from the verified release: ${file}`);
  (workerFiles.includes(file) ? manifest.worker : manifest.files)[file] = digest(bytes);
}
await rm(destination, { recursive: true, force: true });
await cp('dist', destination, { recursive: true });
const headers = await readFile(path.join(destination, '_headers'), 'utf8');
await writeFile(path.join(destination, '_headers'), headers.replace('/*\n', '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n'));
await writeFile(path.join(destination, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
for (const file of manifest.staging_overrides) manifest.files[file] = digest(await readFile(path.join(destination, file)));
// Release evidence stays outside the public asset directory.
await mkdir('artifacts/staging', { recursive: true });
await writeFile('artifacts/staging/manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${publicFiles.length} static files and ${workerFiles.length} verified Worker modules from ${release}.`);
console.log('Staging has no production routes or service bindings; contact submission remains disabled.');
