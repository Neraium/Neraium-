import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,chmod,readFile,writeFile,lstat,rm,symlink,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {createPrivateVerifierSession,createPrivateVerifierUpload} from '../scripts/create-isolated-verifier-session.mjs';

test('private local credential creation is exclusive, 0600, time-bounded, separated from the login cookie, and never returned',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'neraium-isolated-credential-test-'));
 try{await chmod(dir,0o700);const summary=await createPrivateVerifierSession(dir,'neraium-contact-verifier.fixture.workers.dev');
  const record=JSON.parse(await readFile(summary.credential_file,'utf8')),access=JSON.parse(record.VERIFIER_ACCESS),url=new URL(record.private_url),ticket=url.hash.split('_').at(-1);
  assert.equal((await lstat(summary.credential_file)).mode&0o777,0o600);assert.equal(access.ticket_sha256,createHash('sha256').update(ticket).digest('hex'));assert.notEqual(ticket,access.cookie_token);assert.equal(access.expires_at-access.issued_at,1200000);assert.equal(access.link_expires_at-access.issued_at,600000);assert(!JSON.stringify(summary).includes(ticket));assert(!JSON.stringify(summary).includes(access.cookie_token));assert.equal(summary.uploaded,false);assert.equal(url.search,'');
  await assert.rejects(()=>createPrivateVerifierSession(dir,url.hostname),/EEXIST/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('unsafe directory permissions, symlinks, repository paths and production hostname are rejected',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'neraium-isolated-credential-guard-'));
 try{await chmod(dir,0o755);await assert.rejects(()=>createPrivateVerifierSession(dir,'neraium-contact-verifier.fixture.workers.dev'),/0700/);await chmod(dir,0o700);await assert.rejects(()=>createPrivateVerifierSession(dir,'neraium.com'),/dedicated/);const link=dir+'-link';await symlink(dir,link);try{await assert.rejects(()=>createPrivateVerifierSession(link,'neraium-contact-verifier.fixture.workers.dev'),/0700/);}finally{await rm(link);}
  // A private child of the checkout is still an unacceptable credential location.
  const inside=join(process.cwd(),'.planning','isolated-credential-repository-fixture');await mkdir(inside,{mode:0o700});try{await assert.rejects(()=>createPrivateVerifierSession(inside,'neraium-contact-verifier.fixture.workers.dev'),/outside|repository/);}finally{await rm(inside,{recursive:true,force:true});}
 }finally{await rm(dir,{recursive:true,force:true});}
});

test('credential helper rejects a checkout directory even when called from another working directory',async()=>{
 const target=resolve('.planning/isolated-credential-cwd-regression'),outside=await mkdtemp(join(tmpdir(),'neraium-credential-cwd-'));await mkdir(target,{mode:0o700});
 try{const result=spawnSync(process.execPath,[resolve('scripts/create-isolated-verifier-session.mjs'),target,'neraium-contact-verifier.fixture.workers.dev'],{cwd:outside,encoding:'utf8'});assert.notEqual(result.status,0);assert.match(result.stderr,/outside|repository/);await assert.rejects(()=>lstat(join(target,'isolated-verifier-session.json')),/ENOENT/);}
 finally{await rm(target,{recursive:true,force:true});await rm(outside,{recursive:true,force:true});}
});

test('private upload bundle contains exactly two secrets, excludes the link, refuses overwrite and invalid input permissions',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'neraium-upload-fixture-')),host='neraium-contact-verifier.fixture.workers.dev';
 try{await chmod(dir,0o700);await createPrivateVerifierSession(dir,host);const widget=join(dir,'turnstile-widget-secret.txt');await writeFile(widget,'fixture-widget-secret-000000000',{mode:0o600});
  await chmod(widget,0o644);await assert.rejects(()=>createPrivateVerifierUpload(dir,host),/0600/);await chmod(widget,0o600);
  const result=await createPrivateVerifierUpload(dir,host),record=JSON.parse(await readFile(result.credential_file,'utf8'));assert.deepEqual(Object.keys(record).sort(),['TURNSTILE_SECRET_KEY','VERIFIER_ACCESS']);assert(!Object.hasOwn(record,'private_url'));assert.equal((await lstat(result.credential_file)).mode&0o777,0o600);assert(!JSON.stringify(result).includes('fixture-widget-secret'));await assert.rejects(()=>createPrivateVerifierUpload(dir,host),/EEXIST/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('upload preparation rejects a different host, expiry and malformed private JSON without echoing values',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'neraium-upload-invalid-')),host='neraium-contact-verifier.fixture.workers.dev';
 try{await chmod(dir,0o700);const made=await createPrivateVerifierSession(dir,host);await writeFile(join(dir,'turnstile-widget-secret.txt'),'fixture-widget-secret-000000000',{mode:0o600});await assert.rejects(()=>createPrivateVerifierUpload(dir,'neraium-contact-verifier.other.workers.dev'),/identity/);
  const record=JSON.parse(await readFile(made.credential_file,'utf8')),access=JSON.parse(record.VERIFIER_ACCESS);access.link_expires_at=Date.now()-1;record.VERIFIER_ACCESS=JSON.stringify(access);await writeFile(made.credential_file,JSON.stringify(record));await assert.rejects(()=>createPrivateVerifierUpload(dir,host),/time bounds/);
  await writeFile(made.credential_file,'PRIVATE_VALUE_INVALID_JSON');await assert.rejects(()=>createPrivateVerifierUpload(dir,host),e=>/invalid; values suppressed/.test(e.message)&&!e.message.includes('PRIVATE_VALUE'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
