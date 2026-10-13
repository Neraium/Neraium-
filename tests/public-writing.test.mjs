import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

// Follow the public build allowlist. Archives, evidence records, and dependencies stay outside this check.
async function textFiles(file) {
  if ((await stat(file)).isDirectory()) return (await Promise.all((await readdir(file)).map(name => textFiles(path.join(file, name))))).flat();
  return /\.(html|css|js|mjs|svg|json|xml|txt|webmanifest)$/.test(file) || /(?:_headers|_redirects)$/.test(file) ? [file] : [];
}

test('public content and dynamic response sources contain no em dashes', async () => {
  const build = await readFile('scripts/build-static-site.mjs', 'utf8');
  const manifest = build.match(/const publicAssets = \[([\s\S]*?)\];/);
  assert.ok(manifest, 'public build manifest must be discoverable');
  const assets = [...manifest[1].matchAll(/'([^']+)'/g)].map(match => match[1]);
  const files = (await Promise.all([...assets, 'worker'].map(textFiles))).flat();
  assert.ok(files.length > 20, 'public content coverage must not silently disappear');
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    // Literal, HTML named/numeric entities, and JavaScript/CSS Unicode escapes.
    assert.doesNotMatch(text, /\u2014|&mdash;|&#0*8212;|&#x0*2014;|\\u(?:2014|\{2014\})|\\0*2014(?:\s|$)/i, file);
  }
});
