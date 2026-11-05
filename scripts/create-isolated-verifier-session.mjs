// Explicit local preparation only. No Cloudflare calls, deploys, or credential output.
import {lstat,realpath,open,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {randomBytes,createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';
const hostnamePattern=/^neraium-contact-verifier\.[a-z0-9][a-z0-9-]*\.workers\.dev$/;
const sha=value=>createHash('sha256').update(value).digest('hex');
async function privateDirectory(directory,hostname){
  if(!hostnamePattern.test(hostname))throw Error('A reviewed dedicated workers.dev hostname is required.');
  const stat=await lstat(directory);
  if(!stat.isDirectory()||stat.isSymbolicLink()||stat.uid!==process.getuid()||(stat.mode&0o777)!==0o700)throw Error('Use an existing owner-only 0700 directory outside the checkout.');
  const canonical=await realpath(directory),root=await realpath(fileURLToPath(new URL('..',import.meta.url)));
  if(canonical===root||canonical.startsWith(root+'/'))throw Error('Credentials must remain outside the repository.');
  return canonical;
}
async function privateFile(directory,name){
  const path=join(directory,name),stat=await lstat(path);
  if(!stat.isFile()||stat.isSymbolicLink()||stat.uid!==process.getuid()||(stat.mode&0o777)!==0o600)throw Error('Private input must be an owner-only 0600 regular file.');
  if(stat.size>4096)throw Error('Private input exceeds the bounded size.');
  return readFile(path,'utf8');
}
async function exclusiveJson(path,value){
  const handle=await open(path,'wx',0o600);
  try{await handle.writeFile(JSON.stringify(value,null,2)+'\n');}finally{await handle.close();}
}
export async function createPrivateVerifierSession(directory,hostname){
  const canonical=await privateDirectory(directory,hostname);
  const sessionId=randomBytes(16).toString('hex'),ticket=randomBytes(32).toString('hex'),cookie=randomBytes(32).toString('hex'),issued=Date.now();
  const access={session_id:sessionId,ticket_sha256:sha(ticket),cookie_token:cookie,issued_at:issued,link_expires_at:issued+600000,expires_at:issued+1200000};
  const file=join(canonical,'isolated-verifier-session.json');
  await exclusiveJson(file,{VERIFIER_ACCESS:JSON.stringify(access),private_url:`https://${hostname}/verify#neraium-isolated-v1=${sessionId}_${ticket}`});
  return{credential_file:file,session_expires_at:new Date(access.expires_at).toISOString(),redemption_expires_at:new Date(access.link_expires_at).toISOString(),uploaded:false};
}
export async function createPrivateVerifierUpload(directory,hostname){
  const canonical=await privateDirectory(directory,hostname);
  const source=await privateFile(canonical,'isolated-verifier-session.json');
  const secret=(await privateFile(canonical,'turnstile-widget-secret.txt')).trim();
  let record,access,url;
  try{record=JSON.parse(source);access=JSON.parse(record.VERIFIER_ACCESS);url=new URL(record.private_url);}catch{throw Error('Private session file is invalid; values suppressed.');}
  const match=/^#neraium-isolated-v1=([a-f0-9]{32})_([a-f0-9]{64})$/.exec(url.hash);
  const now=Date.now();
  if(url.origin!==`https://${hostname}`||url.pathname!=='/verify'||url.search||!match||match[1]!==access.session_id||sha(match[2])!==access.ticket_sha256||!/^[a-f0-9]{64}$/.test(access.cookie_token??'')||![access.issued_at,access.link_expires_at,access.expires_at].every(Number.isFinite)||access.issued_at>now||access.link_expires_at<=now||access.expires_at-access.issued_at>1200000||access.link_expires_at-access.issued_at>600000||access.expires_at<access.link_expires_at)throw Error('Private session identity or time bounds differ.');
  if(!/^[A-Za-z0-9_-]{20,128}$/.test(secret)||/^[123]x0{20,}(?:AA|AB|BB|FF)$/.test(secret))throw Error('A separate real widget secret is required; values suppressed.');
  const file=join(canonical,'upload-secrets.json');
  await exclusiveJson(file,{VERIFIER_ACCESS:record.VERIFIER_ACCESS,TURNSTILE_SECRET_KEY:secret});
  return{credential_file:file,session_expires_at:new Date(access.expires_at).toISOString(),uploaded:false};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  try{
    const upload=process.argv[2]==='--upload',args=process.argv.slice(upload?3:2);
    if(args.length!==2)throw Error('Usage: node scripts/create-isolated-verifier-session.mjs [--upload] PRIVATE_0700_DIRECTORY REVIEWED_HOSTNAME');
    const result=await(upload?createPrivateVerifierUpload:createPrivateVerifierSession)(args[0],args[1]);
    console.log(`Private file created at ${result.credential_file}; access expires ${result.session_expires_at}. Nothing uploaded; secret values suppressed.`);
  }catch(e){console.error(e.message);process.exitCode=1;}
}
