// GET-only inspector. It cannot deploy, change DNS/routes, upload secrets, or waive a gate.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {cloudflare,compareBindings} from './check-cloudflare-config.mjs';
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])])):value;
const digest=value=>createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
const sortBy=(items,key)=>[...items].sort((a,b)=>String(a[key]).localeCompare(String(b[key])));
export async function captureBoundaries(config,{api=cloudflare,liveFetch=fetch}={}){
  const root=`accounts/${config.account_id}/workers`,worker=`${root}/scripts/${config.name}`;
  const snapshot={schema:'neraium.verifier-boundaries.v1',observed_at:new Date().toISOString(),mode:'read-only GET requests',account_id:config.account_id,production_worker:config.name};
  try{
    const [settings,routes,domains,subdomain,schedules,deployments]=await Promise.all([
      api(`${worker}/settings`),api(`${root}/services/${config.name}/environments/production/routes?show_zonename=true`),
      api(`${root}/domains`),api(`${worker}/subdomain`),api(`${worker}/schedules`),api(`${worker}/deployments`)]);
    const comparison=compareBindings(config,settings.bindings);
    snapshot.production={status:'verified',settings_sha256:digest(settings),routes_sha256:digest(sortBy(routes,'pattern')),
      domains_sha256:digest(sortBy(domains.filter(d=>d.service===config.name&&d.environment==='production'),'hostname')),
      subdomain_sha256:digest(subdomain),schedules_sha256:digest(schedules),latest_deployment_sha256:digest(deployments.deployments?.[0]??null),
      bindings_match_local:comparison.differences.length===0,binding_differences:comparison.differences};
  }catch(e){snapshot.production={status:'unverified',reason:e.message};}
  try{
    const zones=await api('zones?name=neraium.com');
    if(!Array.isArray(zones)||zones.length!==1||zones[0].name!=='neraium.com')throw Error('Exact DNS zone not available.');
    const records=[];let page=1;
    while(true){const chunk=await api(`zones/${zones[0].id}/dns_records?per_page=100&page=${page}`);if(!Array.isArray(chunk))throw Error('DNS listing unavailable.');records.push(...chunk);if(chunk.length<100)break;if(++page>100)throw Error('DNS listing exceeds review limit.');}
    snapshot.dns={status:'verified',records_sha256:digest(sortBy(records,'id')),record_count:records.length};
  }catch(e){snapshot.dns={status:'unverified',reason:e.message};}
  try{
    const [contact,home]=await Promise.all([liveFetch('https://neraium.com/api/contact-config',{headers:{'Cache-Control':'no-cache'}}),liveFetch('https://neraium.com/',{headers:{'Cache-Control':'no-cache'}})]);
    const c=await contact.json(),html=await home.text();const assets=[...html.matchAll(/(?:href|src)="(\/(?:styles\.css|scripts\.js)[^"]*)"/g)].map(m=>m[1]);
    if(!html.includes('Neraium')||assets.length!==2)throw Error('Exact public homepage assets unavailable.');
    const assetHashes={};for(const path of assets){const response=await liveFetch('https://neraium.com'+path,{headers:{'Cache-Control':'no-cache'}});if(!response.ok)throw Error('Public asset unavailable.');assetHashes[path]=digest(await response.text());}
    snapshot.live={status:'verified',contact_status:contact.status,intake_enabled:c.enabled===true,site_key_matches_local:c.siteKey===config.vars.TURNSTILE_SITE_KEY,homepage_status:home.status,public_release:home.headers.get('X-Neraium-Release'),homepage_sha256:digest(html),asset_hashes:assetHashes};
  }catch{snapshot.live={status:'unverified',reason:'Public GET/HEAD inspection failed.'};}
  try{await api(`${root}/scripts/neraium-contact-verifier/settings`);snapshot.isolated_worker_exists=true;}catch(e){snapshot.isolated_worker_exists=/HTTP 404/.test(e.message)?false:null;}
  return snapshot;
}
export function compareBoundaries(before,after){
  const failures=[],checks={};
  for(const name of ['production','dns','live']){
    if(before[name]?.status!=='verified'||after[name]?.status!=='verified'){checks[name]='unverified';failures.push(`${name} unverified`);}
    else if(digest(before[name])!==digest(after[name])){checks[name]='changed';failures.push(`${name} changed`);}
    else checks[name]='unchanged';
  }
  if(before.account_id!==after.account_id||before.production_worker!==after.production_worker)failures.push('production identity differs');
  if(after.live?.intake_enabled!==true||after.production?.bindings_match_local!==true)failures.push('intake disabled or bindings differ');
  return{production_invariance_verified:failures.length===0,checks,failures,isolated_worker_state:after.isolated_worker_exists,production_gate_satisfied:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const output=process.argv[2];if(!output)throw Error('Usage: node scripts/inspect-isolated-verifier-boundaries.mjs OUTPUT_JSON [BASELINE_JSON]');
    if(process.argv[3]&&resolve(output)===resolve(process.argv[3]))throw Error('Output must not overwrite the baseline.');
    const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));const current=await captureBoundaries(config);
    if(process.argv[3])current.comparison=compareBoundaries(JSON.parse(await readFile(process.argv[3],'utf8')),current);
    await writeFile(output,JSON.stringify(current,null,2)+'\n',{flag:'wx'});
    console.log(`GET-only snapshot saved. Production: ${current.production.status}; DNS: ${current.dns.status}; intake: ${current.live.intake_enabled===true?'enabled':'unverified'}.`);
    if(current.comparison&&!current.comparison.production_invariance_verified)process.exitCode=1;
  }catch(e){console.error(e.message);process.exitCode=1;}
}
