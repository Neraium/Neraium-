import { cp, mkdir, rm, stat, lstat, readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const outputDir = 'dist';
const publicAssets = [
  '.well-known',
  '_headers',
  '_redirects',
  '404.html',
  'assets/images',
  'company.html',
  'contact.html',
  'evidence.html',
  'favicon.ico',
  'index.html',
  'methodology.html',
  'operator-brief.html',
  'pilot.html',
  'platform.html',
  'privacy.html',
  'robots.txt',
  'sample-finding-pack.pdf',
  'scripts.js',
  'security.html',
  'site.webmanifest',
  'sitemap.xml',
  'styles.css',
  'technical.html',
];
const imageDir = path.join('assets', 'images');
const imageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);
const imageSignatures = {
  '.jpg': (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  '.jpeg': (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  '.png': (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  '.webp': (buffer) => buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP',
  '.svg': (buffer) => buffer.toString('utf8', 0, Math.min(buffer.length, 256)).trimStart().startsWith('<svg'),
};

function assertSafeAssetPath(asset) {
  const normalized = path.posix.normalize(asset.replaceAll(path.sep, '/'));
  if (path.isAbsolute(asset) || normalized.startsWith('../') || normalized.includes('/../')) {
    throw new Error(`Unsafe public asset path: ${asset}`);
  }
}

async function assertNoSymlinks(root) {
  const rootStat = await lstat(root);
  if (rootStat.isSymbolicLink()) throw new Error(`Refusing to copy symlink: ${root}`);
  if (!rootStat.isDirectory()) return;
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(root, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing to copy symlink: ${entryPath}`);
    if (entry.isDirectory()) await assertNoSymlinks(entryPath);
  }
}

function collectReferencedImages(text) {
  const refs = new Set();
  const patterns = [
    /<img\b[^>]*\bsrc=["']([^"']+)["']/gi,
    /<img\b[^>]*\bsrcset=["']([^"']+)["']/gi,
    /<meta\b[^>]*(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*\bcontent=["']([^"']+)["']/gi,
    /url\(["']?([^"')]+)["']?\)/gi,
    /"src"\s*:\s*"([^"]+)"/gi,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      for (const candidate of match[1].split(',')) {
        let value = candidate.trim().split(/\s+/, 1)[0];
        if (value.startsWith('https://www.neraium.com/')) value = value.replace('https://www.neraium.com', '');
        if (!value.startsWith('/assets/images/')) continue;
        refs.add(value.split(/[?#]/, 1)[0]);
      }
    }
  }
  return refs;
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const asset of publicAssets) {
  assertSafeAssetPath(asset);
  if (!existsSync(asset)) throw new Error(`Expected public asset is missing: ${asset}`);
  await assertNoSymlinks(asset);
  await cp(asset, path.join(outputDir, asset), { recursive: true });
}

const referencedImages = new Set();
for (const file of ['404.html', 'company.html', 'contact.html', 'evidence.html', 'index.html', 'methodology.html', 'operator-brief.html', 'pilot.html', 'platform.html', 'privacy.html', 'security.html', 'site.webmanifest', 'styles.css', 'technical.html']) {
  const text = await readFile(file, 'utf8');
  for (const ref of collectReferencedImages(text)) referencedImages.add(ref);
}

for (const ref of referencedImages) {
  const sourcePath = ref.slice(1);
  const distPath = path.join(outputDir, sourcePath);
  if (!existsSync(distPath)) throw new Error(`Referenced image was not copied to dist: ${ref}`);
  const fileStat = await stat(distPath);
  if (!fileStat.isFile() || fileStat.size === 0) throw new Error(`Invalid empty image in dist: ${ref}`);
  if (fileStat.size > 25 * 1024 * 1024) throw new Error(`Image exceeds Cloudflare 25 MiB limit: ${ref}`);
  const ext = path.extname(distPath).toLowerCase();
  if (!imageExtensions.has(ext)) throw new Error(`Unsupported image extension: ${ref}`);
  const buffer = await readFile(distPath);
  if (!imageSignatures[ext](buffer)) throw new Error(`Invalid image signature: ${ref}`);
}

console.log(`Copied ${publicAssets.length} public assets to ${outputDir}/ and validated ${referencedImages.size} image references.`);
