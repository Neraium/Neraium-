// Content-only release using Cloudflare's supported asset/version/deployment APIs.
// prepare is GET-only. publish/rollback require explicit, separately authorized invocation.
import { readFile, writeFile, readdir, lstat, mkdir } from 'node:fs/promises';
import { dirname, extname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { inspectProductionConfiguration } from './check-cloudflare-config.mjs';
import { reuseBuiltAssets } from './reuse-built-assets.mjs';

const approved = 'ef820edcffe367884e2b88e6ce73640944af545e';
const root = 'accounts/9820361c238dcdeef0b72b24ec3734db/workers/scripts/website';
const hold = (ok, message) => { if (!ok) throw Error(`Static release held: ${message}`); };
const sha = value => createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(k => [k,canonical(value[k])])) : value;
export const fingerprint = value => sha(JSON.stringify(canonical(value)));
export function settingsFingerprint(settings) {
  const { annotations, ...controls }=settings; // Release labels are not runtime controls.
  return fingerprint(controls);
}
const git = (...args) => execFileSync('git',args,{encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim();
export const approvedBytes = path => execFileSync('git',['show',`${approved}:${path}`],{maxBuffer:32*1024*1024,stdio:['ignore','pipe','ignore']});
const mime = {'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.xml':'application/xml','.txt':'text/plain','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf'};

export async function request(path, options = {}, bearer = process.env.CLOUDFLARE_API_TOKEN) {
  hold(bearer, 'existing Cloudflare credential unavailable');
  const response = await fetch('https://api.cloudflare.com/client/v4/'+path,{...options,redirect:'error',headers:{Authorization:'Bearer '+bearer,...options.headers}});
  let body; try { body=await response.json(); } catch { throw Error(`Cloudflare request failed (HTTP ${response.status}); response suppressed.`); }
  hold(response.ok && body.success === true, `Cloudflare request failed (HTTP ${response.status}); credentials and response suppressed`);
  return body.result;
}

async function packageAssets() {
  hold(!git('status','--porcelain','--untracked-files=no'), 'tracked worktree must be clean');
  // The existing build verifier rejects symlinks, unknown files and source/output drift.
  await reuseBuiltAssets();
  for (const file of ['scripts/build-static-site.mjs','wrangler.jsonc','worker/index.mjs','worker/contact.mjs','worker/zoho-mail.mjs','.planning/contact-activation/owner-confirmations.json','.planning/contact-activation/privacy-approval-20261105.json']) {
    hold(approvedBytes(file).equals(await readFile(file)), `approved configuration/handler/approval changed: ${file}`);
  }
  const files={}, manifest={}, bytes=new Map();
  async function walk(directory) {
    for (const entry of await readdir(directory,{withFileTypes:true})) {
      const path=directory+'/'+entry.name, stat=await lstat(path);
      hold(!stat.isSymbolicLink(), 'asset symlink refused');
      if (stat.isDirectory()) { await walk(path); continue; }
      hold(stat.isFile() && stat.size<=25*1024*1024, 'invalid asset file');
      const name=path.slice('dist/'.length), content=await readFile(path);
      if(name!=='release.json') {
        const original=approvedBytes(name);
        const actual=name==='_headers'?Buffer.from(content.toString().replace(/^  X-Neraium-Release: .*\n/m,'')):content;
        hold(original.equals(actual), `asset differs from approved redesign: ${name}`);
      }
      files[name]={sha256:sha(content),size:content.length}; bytes.set(name,content);
      if(!['_headers','_redirects'].includes(name))manifest['/'+name]={hash:sha(content.toString('base64')+extname(name).slice(1)).slice(0,32),size:content.length};
    }
  }
  await walk('dist');
  hold(files['privacy.html']?.sha256==='ad2ca1b1d4073aca46e762637f52fe66885cf93521d5c5ce30ef57f3b66e9de0','approved Privacy fingerprint differs');
  return {files,manifest,bytes,sha256:fingerprint(files),release:JSON.parse(bytes.get('release.json').toString())};
}

export function controls(version) {
  const { assets, ...runtime }=version.resources.script_runtime;
  const { last_deployed_from, ...script }=version.resources.script;
  runtime.compatibility_flags ??= [];
  return {script,runtime,bindings:[...version.resources.bindings].sort((a,b)=>a.name.localeCompare(b.name))};
}
export function assetRouting(assets) {
  return {html_handling:assets.html_handling,not_found_handling:assets.not_found_handling,base_path:assets.base_path,run_worker_first:assets.raw_run_worker_first};
}
export function assertCandidate(previous, next, assets) {
  // Strict inheritance uses latest; a consecutive version number detects an
  // intervening upload (including a secret rotation) in the pre-upload window.
  hold(Number.isInteger(previous.number) && next.number===previous.number+1, 'intervening version upload; binding inheritance cannot be trusted');
  hold(isDeepStrictEqual(controls(previous),controls(next)), 'candidate changes production code, bindings, secrets or runtime settings');
  const current=next.resources.script_runtime.assets;
  hold(isDeepStrictEqual(assetRouting(previous.resources.script_runtime.assets),assetRouting(current)), 'candidate changes asset/API routing');
  hold(current.raw_headers===assets.bytes.get('_headers').toString() && current.raw_redirects===assets.bytes.get('_redirects').toString(), 'candidate headers/redirects do not match the approved assets');
}

async function liveCode() {
  const response=await fetch('https://api.cloudflare.com/client/v4/'+root+'/content/v2',{redirect:'error',headers:{Authorization:'Bearer '+process.env.CLOUDFLARE_API_TOKEN}});
  hold(response.ok, 'deployed code cannot be read; no asset release permitted');
  const entrypoint=response.headers.get('cf-entrypoint');
  const form=await response.formData(), modules=[];
  for(const [name,file] of form.entries()) {
    hold(typeof file!=='string' && /^[A-Za-z0-9_.\/-]+$/.test(name) && !name.includes('..'), 'unexpected deployed module');
    modules.push({name,type:file.type,bytes:Buffer.from(await file.arrayBuffer())});
  }
  hold(modules.length && modules.some(m=>m.name===entrypoint), 'deployed module entrypoint missing');
  modules.sort((a,b)=>a.name.localeCompare(b.name));
  const hashes=modules.map(m=>({name:m.name,type:m.type,size:m.bytes.length,sha256:sha(m.bytes)}));
  return {entrypoint,modules,hashes,sha256:fingerprint({entrypoint,hashes})};
}

async function capture() {
  const inspected=await inspectProductionConfiguration();
  hold(!inspected.disabled && inspected.current.vars.CONTACT_ENABLED==='true' && inspected.current.vars.CONTACT_RETENTION_APPROVED==='true','asset mode cannot activate or disable intake');
  const deployed=inspected.deployments.deployments[0];
  hold(deployed?.versions?.length===1 && deployed.versions[0].percentage===100,'mixed or missing production deployment');
  const versionId=deployed.versions[0].version_id;
  const [version,latest,code,contactResponse]=await Promise.all([request(root+'/versions/'+versionId),request(root+'/versions?per_page=1'),liveCode(),fetch('https://neraium.com/api/contact-config',{cache:'no-store'})]);
  const contact=await contactResponse.json();
  hold(contactResponse.ok && contact.enabled===true && contact.siteKey===inspected.current.vars.TURNSTILE_SITE_KEY,'live contact configuration differs');
  hold(version.resources.script.etag && version.resources.script_runtime.assets && version.resources.bindings,'complete deployed version unavailable');
  const state={deployment_id:deployed.id,version_id:versionId,latest_version_id:latest.items?.[0]?.id,code_sha256:code.sha256,modules:code.hashes,entrypoint:code.entrypoint,controls_sha256:fingerprint(controls(version)),settings_sha256:settingsFingerprint(inspected.settings),infrastructure_sha256:fingerprint(inspected.infrastructure),asset_routing:assetRouting(version.resources.script_runtime.assets)};
  return {state,version,code};
}
export function assertUnchanged(expected, actual, {latest=expected.version_id}={}) {
  hold(isDeepStrictEqual({...expected,latest_version_id:latest},actual),'production drifted since preparation; regenerate the asset plan');
}

export async function prepare(output) {
  const assets=await packageAssets(), before=await capture();
  hold(before.state.latest_version_id===before.state.version_id,'undeployed version exists; binding inheritance is not safe');
  const differences=[];
  // Compare every public output with its actual current URL; record hashes only.
  const names=Object.keys(assets.manifest); let next=0;
  await Promise.all(Array.from({length:4},async()=>{while(next<names.length){const path=names[next++],response=await fetch('https://neraium.com'+path,{cache:'no-store'}),content=Buffer.from(await response.arrayBuffer()),name=path.slice(1);differences.push({path,status:response.status,deployed_sha256:sha(content),approved_sha256:assets.files[name].sha256,changed:!response.ok||sha(content)!==assets.files[name].sha256});}}));
  const after=await capture();assertUnchanged(before.state,after.state);
  const plan={schema:'neraium.static-release.v1',head:git('rev-parse','HEAD'),approved_source:approved,prepared_at:new Date().toISOString(),baseline:before.state,asset_sha256:assets.sha256,release:assets.release,files:assets.files,differences:differences.sort((a,b)=>a.path.localeCompare(b.path)),rollback_version:before.state.version_id};
  plan.plan_sha256=fingerprint(plan);
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
  console.log(`GET-only asset plan prepared: ${plan.plan_sha256}; ${differences.filter(d=>d.changed).length} changed public files; no upload or deployment.`);
  return plan;
}

async function readPlan(path) {
  const {plan_sha256,...plan}=JSON.parse(await readFile(path,'utf8'));
  hold(plan.schema==='neraium.static-release.v1' && fingerprint(plan)===plan_sha256 && plan.head===git('rev-parse','HEAD') && plan.approved_source===approved,'asset plan is altered or belongs to another revision');
  return {...plan,plan_sha256};
}

async function uploadAssets(assets) {
  const session=await request(root+'/assets-upload-session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({manifest:assets.manifest})});
  hold(typeof session.jwt==='string' && Array.isArray(session.buckets),'asset upload session unavailable');
  if(!session.buckets.length)return session.jwt;
  let completion;
  for(const bucket of session.buckets) {
    const form=new FormData();
    for(const hash of bucket) {
      const path=Object.keys(assets.manifest).find(p=>assets.manifest[p].hash===hash);hold(path,'provider requested unknown asset');
      const name=path.slice(1), type=mime[extname(name)]??'application/octet-stream';
      form.append(hash,new Blob([assets.bytes.get(name).toString('base64')],{type}),hash);
    }
    const result=await request('accounts/9820361c238dcdeef0b72b24ec3734db/workers/assets/upload?base64=true',{method:'POST',body:form},session.jwt);
    if(result.jwt)completion=result.jwt;
  }
  hold(typeof completion==='string','asset upload did not complete');return completion;
}

export function versionForm(before, assets, jwt) {
  const metadata={main_module:before.code.entrypoint,compatibility_date:before.version.resources.script_runtime.compatibility_date,compatibility_flags:before.version.resources.script_runtime.compatibility_flags??[],bindings:before.version.resources.bindings.map(b=>b.type==='assets'?{name:b.name,type:'assets'}:{name:b.name,type:'inherit'}),assets:{jwt,config:{...before.state.asset_routing,_headers:assets.bytes.get('_headers').toString(),_redirects:assets.bytes.get('_redirects').toString()}},annotations:{'workers/message':'Approved Neraium static assets '+assets.sha256.slice(0,16)}};
  const form=new FormData();form.set('metadata',JSON.stringify(metadata));
  for(const module of before.code.modules)form.set(module.name,new Blob([module.bytes],{type:module.type}),module.name);
  return form;
}

export async function publish(path) {
  const plan=await readPlan(path), assets=await packageAssets();
  hold(assets.sha256===plan.asset_sha256 && isDeepStrictEqual(assets.files,plan.files),'approved asset bytes changed');
  let before=await capture();assertUnchanged(plan.baseline,before.state);
  // Write intent before any mutation; never automatically retry ambiguous writes.
  const receiptPath=path+'.deployment.json';
  const receipt={plan_sha256:plan.plan_sha256,rollback_version:plan.rollback_version,status:'upload-starting'};
  await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});
  const jwt=await uploadAssets(assets);
  before=await capture();assertUnchanged(plan.baseline,before.state);
  const uploaded=await request(root+'/versions?bindings_inherit=strict',{method:'POST',body:versionForm(before,assets,jwt)});
  receipt.version_id=uploaded.id;receipt.status='uploaded-not-deployed';await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');
  const candidate=await request(root+'/versions/'+uploaded.id);assertCandidate(before.version,candidate,assets);
  const pending=await capture();assertUnchanged(plan.baseline,pending.state,{latest:uploaded.id});
  const deployment=await request(root+'/deployments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({strategy:'percentage',versions:[{version_id:uploaded.id,percentage:100}]})});
  receipt.deployment_id=deployment.id;receipt.status='deployed-checking';await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');
  const after=await capture();
  hold(after.state.version_id===uploaded.id && after.state.code_sha256===plan.baseline.code_sha256 && after.state.settings_sha256===plan.baseline.settings_sha256 && after.state.infrastructure_sha256===plan.baseline.infrastructure_sha256,'post-release invariants failed; inspect and use guarded rollback');
  assertCandidate(before.version,after.version,assets);
  for(const path of Object.keys(assets.manifest)) {
    const response=await fetch('https://neraium.com'+path,{cache:'no-store'});
    hold(response.ok && sha(Buffer.from(await response.arrayBuffer()))===assets.files[path.slice(1)].sha256,'published assets differ; use guarded rollback');
  }
  receipt.status='verified';receipt.verified_at=new Date().toISOString();await writeFile(receiptPath,JSON.stringify(receipt,null,2)+'\n');
  console.log('Static release verified; production code and contact controls unchanged.');
}

export async function rollback(path) {
  const plan=await readPlan(path);hold(!git('status','--porcelain','--untracked-files=no'),'tracked worktree must be clean');
  const receipt=JSON.parse(await readFile(path+'.deployment.json','utf8'));
  hold(receipt.plan_sha256===plan.plan_sha256 && receipt.version_id && receipt.rollback_version===plan.rollback_version,'release receipt differs');
  const current=await capture(), previous=await request(root+'/versions/'+plan.rollback_version);
  hold(current.state.version_id===receipt.version_id && current.state.latest_version_id===receipt.version_id && fingerprint(controls(previous))===plan.baseline.controls_sha256 && fingerprint(controls(current.version))===plan.baseline.controls_sha256 && current.state.settings_sha256===plan.baseline.settings_sha256 && current.state.infrastructure_sha256===plan.baseline.infrastructure_sha256,'intervening production change; automatic rollback refused');
  await request(root+'/deployments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({strategy:'percentage',versions:[{version_id:plan.rollback_version,percentage:100}]})});
  const restored=await capture();hold(restored.state.version_id===plan.rollback_version && restored.state.code_sha256===plan.baseline.code_sha256 && restored.state.settings_sha256===plan.baseline.settings_sha256 && restored.state.infrastructure_sha256===plan.baseline.infrastructure_sha256,'rollback verification failed');
  receipt.status='rolled-back';receipt.rolled_back_at=new Date().toISOString();await writeFile(path+'.deployment.json',JSON.stringify(receipt,null,2)+'\n');
  console.log('Original version and original assets restored; contact controls unchanged.');
}

if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [action,path,...extra]=process.argv.slice(2);
    hold(path && !extra.length && ['prepare','publish','rollback'].includes(action),'usage: node scripts/deploy-static-assets.mjs prepare|publish|rollback PLAN_JSON');
    await ({prepare,publish,rollback}[action])(path);
  } catch(error) { console.error(error.message);process.exitCode=1; }
}
