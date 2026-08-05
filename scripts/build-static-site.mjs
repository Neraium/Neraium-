#!/usr/bin/env node
import { cp, mkdir, rm, stat, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const dist = path.join(root, 'dist');
const maxAssetBytes = 25 * 1024 * 1024;
const publicFiles = [
  'index.html','platform.html','evidence.html','technical.html','security.html','pilot.html','methodology.html','company.html','operator-brief.html','contact.html','404.html',
  'styles.css','scripts.js','site.webmanifest','robots.txt','sitemap.xml',
  'favicon.ico','favicon-16x16.png','favicon-32x32.png','apple-touch-icon.png','android-chrome-192x192.png','android-chrome-512x512.png',
  'neraium-logo.jpeg','neraium-product-preview.png','infra-bg-1.jpg','infra-bg-2.jpg','diagram-threshold-vs-relationships.jpeg','founder-contact.jpeg',
  '.well-known/security.txt',
];
const forbiddenSegments = new Set(['node_modules','.git','tests','test-results','playwright-report','playwright-screenshots','__pycache__','.cache']);
const forbiddenExtensions = new Set(['.py','.ts','.md']);
const siteOrigin = 'https://www.neraium.com';

function fail(message) { console.error(`Build failed: ${message}`); process.exit(1); }
function normalizeLocalRef(raw) {
  if (!raw || raw.startsWith('#') || raw.startsWith('?')) return null;
  let value = raw.trim().split('#', 1)[0].split('?', 1)[0];
  if (!value || value.startsWith('mailto:') || value.startsWith('tel:') || value.startsWith('javascript:')) return null;
  if (value.startsWith(siteOrigin)) value = value.slice(siteOrigin.length) || '/index.html';
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null;
  if (value === '/') value = '/index.html';
  return value.replace(/^\/+/, '');
}
function assertSafePublicPath(rel) {
  const parts = rel.split(/[\\/]+/);
  if (parts.some((part) => forbiddenSegments.has(part))) fail(`refusing to copy forbidden path ${rel}`);
  if (forbiddenExtensions.has(path.extname(rel))) fail(`refusing to copy internal-only file type ${rel}`);
}
async function assertExists(rel, source) {
  const file = path.join(root, rel);
  if (!existsSync(file)) fail(`${source} references missing public asset: ${rel}`);
}
function extractRefsFromHtml(text) {
  const refs = [];
  const attrPattern = /\b(?:src|href)=(['"])(.*?)\1/gi;
  for (const match of text.matchAll(attrPattern)) refs.push(match[2]);
  const metaImagePattern = /<meta\b(?=[^>]*(?:property|name)=(['"])(?:og:image|twitter:image)\1)[^>]*content=(['"])(.*?)\2[^>]*>/gi;
  for (const match of text.matchAll(metaImagePattern)) refs.push(match[3]);
  return refs;
}
function extractRefsFromCss(text) {
  return [...text.matchAll(/url\((['"]?)(.*?)\1\)/gi)].map((match) => match[2]);
}
async function collectFiles(dir = dist) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(full));
    else files.push(full);
  }
  return files;
}

for (const rel of publicFiles) {
  assertSafePublicPath(rel);
  await assertExists(rel, 'build manifest');
}

const requiredRefs = new Set();
for (const rel of publicFiles.filter((file) => file.endsWith('.html'))) {
  const html = await import('node:fs/promises').then((fs) => fs.readFile(path.join(root, rel), 'utf8'));
  for (const ref of extractRefsFromHtml(html)) {
    const local = normalizeLocalRef(ref);
    if (local) requiredRefs.add(local);
  }
}
const css = await import('node:fs/promises').then((fs) => fs.readFile(path.join(root, 'styles.css'), 'utf8'));
for (const ref of extractRefsFromCss(css)) {
  const local = normalizeLocalRef(ref);
  if (local) requiredRefs.add(local);
}
const manifest = JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile(path.join(root, 'site.webmanifest'), 'utf8')));
for (const icon of manifest.icons ?? []) {
  const local = normalizeLocalRef(icon.src);
  if (local) requiredRefs.add(local);
}
const sitemap = await import('node:fs/promises').then((fs) => fs.readFile(path.join(root, 'sitemap.xml'), 'utf8'));
for (const loc of sitemap.matchAll(/<loc>(.*?)<\/loc>/g)) {
  const local = normalizeLocalRef(loc[1]);
  if (local) requiredRefs.add(local);
}
for (const rel of requiredRefs) {
  await assertExists(rel, 'runtime content');
  if (!publicFiles.includes(rel)) fail(`referenced public asset is not listed in the deterministic build manifest: ${rel}`);
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const rel of publicFiles) {
  const from = path.join(root, rel);
  const to = path.join(dist, rel);
  await mkdir(path.dirname(to), { recursive: true });
  await cp(from, to, { dereference: false, errorOnExist: false, force: true });
}

const files = await collectFiles();
let totalBytes = 0;
let largest = { rel: '', size: 0 };
for (const file of files) {
  const rel = path.relative(dist, file);
  assertSafePublicPath(rel);
  const info = await stat(file);
  totalBytes += info.size;
  if (info.size > largest.size) largest = { rel, size: info.size };
  if (info.size > maxAssetBytes) fail(`${rel} is ${(info.size / 1024 / 1024).toFixed(2)} MiB, exceeding Cloudflare's 25 MiB per-asset limit`);
}
console.log(`Built dist with ${files.length} assets, ${(totalBytes / 1024).toFixed(1)} KiB total. Largest: ${largest.rel} (${(largest.size / 1024).toFixed(1)} KiB).`);
