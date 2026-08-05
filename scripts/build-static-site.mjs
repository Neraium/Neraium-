import { cp, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const outputDir = 'dist';
const publicAssets = [
  '.well-known',
  '404.html',
  'Craig.jpg',
  'Craig.png.jpg',
  'IMG_9010.png',
  'android-chrome-192x192.png',
  'android-chrome-512x512.png',
  'apple-touch-icon.png',
  'company.html',
  'contact.html',
  'diagram-threshold-vs-relationships.jpeg',
  'diagram-where-it-fits.jpeg',
  'evidence.html',
  'favicon-16x16.png',
  'favicon-32x32.png',
  'favicon.ico',
  'founder-contact.jpeg',
  'hero.png',
  'index.html',
  'infra-bg-1.jpg',
  'infra-bg-2.jpg',
  'methodology.html',
  'neraium-logo.jpeg',
  'neraium-product-preview.png',
  'operator-brief.html',
  'pilot.html',
  'platform.html',
  'results-drift.jpeg',
  'results-instability.jpeg',
  'robots.txt',
  'sample-finding-pack.pdf',
  'scripts.js',
  'security.html',
  'site.webmanifest',
  'sitemap.xml',
  'styles.css',
  'technical.html',
];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const asset of publicAssets) {
  if (!existsSync(asset)) {
    throw new Error(`Expected public asset is missing: ${asset}`);
  }
  await cp(asset, path.join(outputDir, asset), { recursive: true });
}

console.log(`Copied ${publicAssets.length} public assets to ${outputDir}/`);
