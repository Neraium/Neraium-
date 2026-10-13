import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,cp,mkdtemp,rm,symlink,rename} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {reuseBuiltAssets} from '../scripts/reuse-built-assets.mjs';

test('verified reuse rejects stale assets, extra output, ancestor symlinks and changed Worker code',async()=>{
  const original=process.cwd();
  const buildSource=await readFile('scripts/build-static-site.mjs','utf8');
  const roots=[...buildSource.match(/const publicAssets = \[([\s\S]*?)\n\];/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
  const fixture=await mkdtemp(join(tmpdir(),'neraium-asset-reuse-'));
  try {
    process.chdir(fixture);
    await mkdir('scripts');await writeFile('scripts/build-static-site.mjs',buildSource);
    for(const path of roots){
      if(['.well-known','assets/images','assets/fonts'].includes(path)){
        await mkdir(path,{recursive:true});await writeFile(`${path}/fixture.bin`,'public fixture bytes');
      }else{await mkdir(dirname(path),{recursive:true});await writeFile(path,path==='_headers'?'/*\n  Cache-Control: no-store\n':path==='index.html'?'<link href="/styles.css?v=fixture">':'public fixture');}
    }
    await mkdir('worker');
    for(const name of ['index.mjs','contact.mjs','zoho-mail.mjs'])await writeFile(`worker/${name}`,'fixture worker');
    await writeFile('wrangler.jsonc','{}');await mkdir('dist');
    for(const path of roots)await cp(path,`dist/${path}`,{recursive:true});
    await writeFile('dist/release.json',JSON.stringify({version:'neraium-aaaaaaaaaaaaaaaa',canonical:'https://neraium.com',assetRevision:'fixture'}));
    await writeFile('dist/_headers','/*\n  X-Neraium-Release: neraium-aaaaaaaaaaaaaaaa\n  Cache-Control: no-store\n');
    await reuseBuiltAssets({refreshMetadata:true});
    await assert.doesNotReject(()=>reuseBuiltAssets());
    await writeFile('dist/privacy.html','stale output');await assert.rejects(()=>reuseBuiltAssets(),/Built asset differs/);await cp('privacy.html','dist/privacy.html');
    await writeFile('dist/unmanaged.json','fixture');await assert.rejects(()=>reuseBuiltAssets(),/unexpected built asset/);await rm('dist/unmanaged.json');
    await rename('assets','original-assets');await symlink('original-assets','assets');await assert.rejects(()=>reuseBuiltAssets(),/symlink/);await rm('assets');await rename('original-assets','assets');
    await writeFile('worker/contact.mjs','changed worker');await assert.rejects(()=>reuseBuiltAssets(),/changed after release/);
  }finally{process.chdir(original);await rm(fixture,{recursive:true,force:true});}
});
