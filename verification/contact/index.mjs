import { handleContact } from '../../worker/contact.mjs';
import { IsolatedVerificationSession } from './session.mjs';
import { page } from './panel.mjs';
import { subject } from './subject-identity.mjs';
export { IsolatedVerificationSession };

const path='/verify';
const cookieName='__Secure-neraium-isolated-verifier';
const allowedBindings=new Set(['VERIFIER_ENABLED','VERIFIER_HOSTNAME','TURNSTILE_SITE_KEY','TURNSTILE_SECRET_KEY','VERIFIER_ACCESS','VERIFIER_RATE_LIMITER','VERIFIER_SESSIONS']);
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
const equal=(a,b)=>{let diff=a.length^b.length;for(let i=0;i<b.length;i++)diff|=(a.charCodeAt(i)||0)^b.charCodeAt(i);return diff===0;};
const headers={ 'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",'X-Robots-Tag':'noindex, nofollow' };
const json=(body,status=200,extra={})=>Response.json(body,{status,headers:{...headers,...extra}});
const denied=()=>json({error:'Not found.'},404);
const jsonBody=async request=>{
  const reader=request.body?.getReader();if(!reader)throw Error();let size=0;const chunks=[];
  while(true){const{value,done}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw Error();}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
};
const realKey=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{20,128}$/.test(value)&&!/^[123]x0{20,}(?:AA|AB|BB|FF)$/.test(value);
function configuration(env,now){
  if(Object.keys(env).some(key=>!allowedBindings.has(key))||env.VERIFIER_ENABLED!=='true')return null;
  if(!/^neraium-contact-verifier\.[a-z0-9][a-z0-9-]*\.workers\.dev$/.test(env.VERIFIER_HOSTNAME??''))return null;
  if(!realKey(env.TURNSTILE_SITE_KEY)||!realKey(env.TURNSTILE_SECRET_KEY)||typeof env.VERIFIER_RATE_LIMITER?.limit!=='function'||typeof env.VERIFIER_SESSIONS?.idFromName!=='function'||typeof env.VERIFIER_SESSIONS?.get!=='function')return null;
  if(typeof env.VERIFIER_ACCESS!=='string'||env.VERIFIER_ACCESS.length>1536)return null;
  let config;try{config=JSON.parse(env.VERIFIER_ACCESS);}catch{return null;}
  if(!config||typeof config!=='object'||Array.isArray(config))return null;
  if(!/^[a-f0-9]{32}$/.test(config.session_id??'')||!['ticket_sha256','cookie_token'].every(k=>/^[a-f0-9]{64}$/.test(config[k]??'')))return null;
  if(![config.issued_at,config.link_expires_at,config.expires_at].every(Number.isFinite)||config.issued_at>now||config.expires_at<=now||config.expires_at<=config.issued_at||config.expires_at-config.issued_at>1200000||config.link_expires_at<=config.issued_at||config.link_expires_at>config.issued_at+600000||config.link_expires_at>config.expires_at)return null;
  return config;
}

// Dependency injection is used only by local tests. Default production export uses real fetch/time.
export function createVerifier({verifyFetch=fetch,now=()=>Date.now()}={}){
  return {async fetch(request,env){
    try{
      const config=configuration(env,now());if(!config)return denied();
      const url=new URL(request.url);
      if(url.protocol!=='https:'||url.hostname!==env.VERIFIER_HOSTNAME||url.port||url.search||!['/verify','/verify/redeem','/verify/state','/verify/capture','/verify/test','/verify/logout'].includes(url.pathname))return denied();
      if(!['GET','POST'].includes(request.method))return json({error:'Use GET or POST.'},405,{Allow:'GET, POST'});
      if(request.method==='POST'&&(request.headers.get('origin')!==url.origin||(request.headers.has('sec-fetch-site')&&request.headers.get('sec-fetch-site')!=='same-origin')))return json({error:'Origin rejected.'},403);
      if(request.method==='POST'&&(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='application/json'||Number(request.headers.get('content-length'))>4096))return json({error:'Use bounded JSON.'},400);
      const stub=env.VERIFIER_SESSIONS.get(env.VERIFIER_SESSIONS.idFromName(config.session_id));
      const state=async(operation,data={})=>stub.fetch(new Request('https://isolated-session.invalid/'+operation,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}));
      const init=await state('init',{id:config.session_id,issued_at:config.issued_at,expires_at:config.expires_at,hostname:url.hostname,subject_sha256:subject.sha256});if(!init.ok)return denied();
      const cookie=(request.headers.get('cookie')??'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1)??'';
      const authenticated=equal(cookie,config.cookie_token);
      if(url.pathname===path&&request.method==='GET'){
        if(authenticated&&!(await state('state')).ok)return denied();
        const nonce=crypto.randomUUID().replaceAll('-','');
        return new Response(page(env.TURNSTILE_SITE_KEY,authenticated,nonce),{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':`default-src 'none'; script-src 'nonce-${nonce}' https://challenges.cloudflare.com; style-src 'nonce-${nonce}'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`}});
      }
      if(request.method!=='POST')return denied();
      if(url.pathname===path+'/redeem'){
        const ip=request.headers.get('CF-Connecting-IP');if(!ip)return json({error:'Unavailable.'},503);
        if((await env.VERIFIER_RATE_LIMITER.limit({key:'isolated-login:'+await hash(ip)}))?.success!==true)return json({error:'Try later.'},429);
        const body=await jsonBody(request);
        if(now()>=config.link_expires_at||body?.session!==config.session_id||!/^[a-f0-9]{64}$/.test(body?.ticket??'')||!equal(await hash(body.ticket),config.ticket_sha256))return denied();
        if(!(await state('consume')).ok)return denied();
        return json({authenticated:true},200,{'Set-Cookie':`${cookieName}=${config.cookie_token}; Secure; HttpOnly; SameSite=Strict; Path=${path}; Max-Age=${Math.floor((config.expires_at-now())/1000)}`});
      }
      if(!authenticated)return denied();
      if(url.pathname===path+'/logout'){
        await state('revoke');return json({revoked:true},200,{'Set-Cookie':`${cookieName}=; Secure; HttpOnly; SameSite=Strict; Path=${path}; Max-Age=0`});
      }
      if(url.pathname===path+'/state'){
        const result=await state('state');return json(await result.json(),result.status);
      }
      const body=await jsonBody(request);
      if(!body||typeof body.token!=='string'||!body.token||body.token.length>2048)return json({error:'A bounded challenge token is required.'},400);
      if(url.pathname===path+'/capture'){
        const result=await state('capture',{hash:await hash(body.token)});return json(await result.json(),result.status);
      }
      if(!['success','replay','failure','recovery','expiry','validation','rate-limit'].includes(body.scenario))return json({error:'Unknown scenario.'},400);
      const ip=request.headers.get('CF-Connecting-IP');if(!ip)return json({error:'Unavailable.'},503);
      const begin=await state('begin',{scenario:body.scenario,hash:await hash(body.token)});
      if(!begin.ok)return json(await begin.json(),begin.status);
      const {lease}=await begin.json();
      const observed={lease,status:503,challenge_checked:false,challenge_valid:false,duplicate_or_expired:false};
      try{
        // Deliberate allowlist: no production EMAIL, Zoho, ASSETS or service binding can enter.
        const isolated={CONTACT_ENABLED:'true',CONTACT_RETENTION_APPROVED:'true',CONTACT_DELIVERY:'cloudflare',
          CONTACT_FROM:'website@neraium.com',CONTACT_TO:'craig@neraium.com',CONTACT_HOSTNAMES:url.hostname,
          TURNSTILE_SITE_KEY:env.TURNSTILE_SITE_KEY,TURNSTILE_SECRET_KEY:env.TURNSTILE_SECRET_KEY,
          CONTACT_RATE_LIMITER:env.VERIFIER_RATE_LIMITER,
          EMAIL:{send:async()=>{if(body.scenario==='failure')throw Error('Synthetic failure');return{messageId:'isolated-no-email'};}}};
        const invoke=async(invalid=false)=>{
          const payload={name:'Isolated security verification',email:invalid?'invalid':'craig@neraium.com',organization:'Neraium',facility:'Isolated verifier',token:body.token};
          const synthetic=new Request(url.origin+'/api/contact',{method:'POST',headers:{Origin:url.origin,'Content-Type':'application/json','CF-Connecting-IP':ip},body:JSON.stringify(payload)});
          const verify=async(target,options)=>{
            if(target!=='https://challenges.cloudflare.com/turnstile/v0/siteverify'||options?.method!=='POST')throw Error('Egress denied');
            const r=await verifyFetch(target,{...options,redirect:'manual'});
            if(r.ok){
              const checked=await r.clone().json();
              if(typeof checked?.success!=='boolean')throw Error('Malformed verification response');
              observed.challenge_checked=true;
              observed.provider_success=checked.success;
              observed.context_matches=checked.hostname===url.hostname&&checked.action==='evaluation';
              observed.challenge_valid=observed.provider_success&&observed.context_matches;
              observed.duplicate_or_expired=Array.isArray(checked['error-codes'])&&checked['error-codes'].includes('timeout-or-duplicate');
            }
            return r;
          };
          return handleContact(synthetic,isolated,verify,async()=>{throw Error('External delivery denied');});
        };
        if(body.scenario==='rate-limit'){
          observed.statuses=[];
          for(let i=0;i<8;i++){const r=await invoke(true);observed.statuses.push(r.status);if(r.status===429)break;}
          observed.status=observed.statuses.at(-1);
        }else observed.status=(await invoke(body.scenario==='validation')).status;
      }finally{
        const finished=await state('finish',observed);
        return json(await finished.json(),finished.status);
      }
    }catch{return json({error:'Private verification unavailable.'},503);}
  }};
}
export default createVerifier();
