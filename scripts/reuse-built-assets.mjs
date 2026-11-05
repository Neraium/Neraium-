// Reuse a completed static build only when its complete source/output package matches.
import { readFile, writeFile, readdir, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const roots = ['.well-known','_headers','_redirects','404.html','applications.html','water-wastewater.html','hospitality.html','infrastructure.html','assets/images','assets/fonts','company.html','contact.html','evidence.html','favicon.ico','index.html','methodology.html','operator-brief.html','pilot.html','platform.html','privacy.html','robots.txt','scripts.js','security.html','site.webmanifest','sitemap.xml','styles.css','technical.html'];
async function safePath(path) {
  const parts = path.split('/');
  for (let n=1;n<=parts.length;n++) assert(!(await lstat(parts.slice(0,n).join('/'))).isSymbolicLink(), 'Asset symlink refused.');
}
async function files(path, omitPreview = false, directories = []) {
  await safePath(path);
  const stat = await lstat(path);
  if (stat.isFile()) return omitPreview && ['neraium-brand-preview.png','neraium-social.jpg','neraium-social-horizontal.png'].includes(path.split('/').at(-1)) ? [] : [path];
  assert(stat.isDirectory(), 'Unexpected asset type.');
  directories.push(path);
  const result=[];
  for(const entry of await readdir(path)) result.push(...await files(`${path}/${entry}`,omitPreview,directories));
  return result;
}
export async function reuseBuiltAssets({ refreshMetadata = false } = {}) {
  const buildSource=await readFile('scripts/build-static-site.mjs','utf8');
  const manifest=buildSource.match(/const publicAssets = \[([\s\S]*?)\n\];/)?.[1];
  assert(manifest, 'Build manifest unavailable; refuse reuse.');
  assert.deepEqual([...manifest.matchAll(/'([^']+)'/g)].map(m=>m[1]),roots,'Build allowlist changed; refuse reuse.');
  const sourceFiles=[],sourceDirectories=[],outputDirectories=[];
  for(const root of roots) sourceFiles.push(...await files(root,true,sourceDirectories));
  const outputFiles=(await files('dist',false,outputDirectories)).map(path=>path.slice('dist/'.length));
  assert.deepEqual([...outputFiles].sort(),[...sourceFiles,'release.json'].sort(),'Missing or unexpected built asset.');
  const expectedDirectories=new Set(sourceDirectories);
  for(const path of [...sourceDirectories,...sourceFiles]) {
    const parts=path.split('/');for(let n=1;n<parts.length;n++)expectedDirectories.add(parts.slice(0,n).join('/'));
  }
  assert.deepEqual(outputDirectories.filter(path=>path!=='dist').map(path=>path.slice(5)).sort(),[...expectedDirectories].sort(),'Missing or unexpected built directory.');
  const release=JSON.parse(await readFile('dist/release.json','utf8'));
  assert(/^neraium-[a-f0-9]{16}$/.test(release.version));
  const outputHeaders=await readFile('dist/_headers','utf8');
  const inserted=outputHeaders.match(/^  X-Neraium-Release: .*$/gm)??[];
  assert.deepEqual(inserted,[`  X-Neraium-Release: ${release.version}`],'Unexpected generated release header.');
  const pristineHeaders=outputHeaders.replace(`  X-Neraium-Release: ${release.version}\n`,'');
  const bytes=new Map();
  for(const path of sourceFiles) {
    const source=await readFile(path);
    const output=path==='_headers'?Buffer.from(pristineHeaders):await readFile(`dist/${path}`);
    assert(source.equals(output),`Built asset differs: ${path}`);
    bytes.set(`dist/${path}`,source);
  }
  const workerFiles=['worker/index.mjs','worker/contact.mjs','worker/zoho-mail.mjs','wrangler.jsonc'];
  const entrypoint=await readFile('worker/index.mjs','utf8');
  if(entrypoint.includes("'./contact-human-verification.mjs'")) workerFiles.push('worker/contact-human-verification.mjs');
  for(const path of workerFiles) { await safePath(path); bytes.set(path,await readFile(path)); }
  const digest=createHash('sha256');
  for(const path of [...bytes.keys()].sort()) digest.update(path).update('\0').update(bytes.get(path)).update('\0');
  const version=`neraium-${digest.digest('hex').slice(0,16)}`;
  const assetRevision=bytes.get('dist/index.html').toString().match(/href="\/styles\.css\?v=([^"]+)"/)?.[1];
  assert(assetRevision && release.canonical==='https://neraium.com');
  if(refreshMetadata) {
    await writeFile('dist/release.json',JSON.stringify({version,canonical:'https://neraium.com',assetRevision})+'\n');
    await writeFile('dist/_headers',pristineHeaders.replace('/*\n',`/*\n  X-Neraium-Release: ${version}\n`));
  } else {
    assert.equal(release.version,version,'Worker/configuration changed after release metadata preparation.');
    assert.equal(release.assetRevision,assetRevision,'Built release asset revision differs.');
  }
  console.log(`Completed static assets verified for reuse (${sourceFiles.length} files); no static build or redesign performed.`);
  return {version,sourceFiles:sourceFiles.length};
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try { await reuseBuiltAssets(); } catch {console.error('Built asset reuse held: source/output identity verification failed. No build repeated.');process.exitCode=1;}
}
