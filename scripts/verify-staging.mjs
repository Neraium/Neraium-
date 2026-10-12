import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const origin = process.env.NERAIUM_STAGING_URL || 'http://127.0.0.1:4180';
const url = new URL(origin);
const isLocal = url.origin === 'http://127.0.0.1:4180';
const isStaging = url.protocol === 'https:' && url.hostname.startsWith('neraium-phase2-staging-1f2b51c.') && url.hostname.endsWith('.workers.dev');
assert.ok(isLocal || isStaging, 'Verification is restricted to the isolated staging Worker or its local preview.');
fs.mkdirSync('artifacts/staging/screenshots', { recursive: true });
const routes = ['/', '/platform', '/applications', '/water-wastewater', '/hospitality', '/infrastructure', '/methodology', '/evidence', '/security', '/pilot', '/company', '/operator-brief', '/contact', '/privacy'];
const browser = await chromium.launch();
const errors = []; let checks = 0;
try {
for (const viewport of [{width:1440,height:1000}, {width:768,height:1024}, {width:390,height:844}]) {
 const page = await browser.newPage({ viewport });
 const initialConfig = await page.request.get(origin+'/api/contact-config');
 assert.equal(initialConfig.status(), 200);
 assert.deepEqual(await initialConfig.json(), { enabled: false });
 await page.route('**/api/contact', route => { assert.notEqual(route.request().method(), 'POST', 'Staging must not submit inquiries'); return route.continue(); });
 page.on('pageerror', e=>errors.push(e.message));
 page.on('console', m=>{if(m.type()==='error')errors.push(m.text());});
 for (const route of routes) {
  const response = await page.goto(origin+route, {waitUntil:'networkidle'});
  assert.equal(response.status(),200,route);
  const headers=response.headers();
  assert.match(headers['x-robots-tag'],/noindex/);
  assert.match(headers['content-security-policy'],/default-src 'self'/);
  assert.equal(headers['x-content-type-options'],'nosniff');
  assert.equal(headers['x-frame-options'],'DENY');
  assert.equal(await page.locator('h1').count(),1);
  await page.locator('footer').scrollIntoViewIfNeeded();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),true,route);
  await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0));
  for(const link of await page.locator('.nav a, .header-action').evaluateAll(links=>links.map(a=>a.getAttribute('href'))))assert.ok(link.startsWith('/')&&!link.startsWith('//'));
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:`artifacts/staging/screenshots/${viewport.width}-${route.slice(1)||'home'}.png`,fullPage:true,animations:'disabled'});
  checks++;
 }
 await page.goto(origin+'/contact');
 await page.locator('#name').fill('Staging QA');
 await page.locator('#email').fill('qa@example.com');
 await page.locator('#organization').fill('Local validation');
 await page.locator('#facility').fill('Representative infrastructure');
 let posts=0;page.on('request',r=>{if(r.method()==='POST')posts++;});
 await page.locator('#contact-form button[type="submit"]').click();
 assert.match(await page.locator('#form-feedback').innerText(),/email draft is ready/);
 assert.match(await page.locator('#form-feedback a').getAttribute('href'),/^mailto:/);
 assert.equal(posts,0);
 const config=await page.request.get(origin+'/api/contact-config');
 assert.deepEqual(await config.json(),{enabled:false});
 const legacy=await page.request.get(origin+'/platform.html',{maxRedirects:0});assert.equal(legacy.status(),301);assert.equal(legacy.headers().location,'/platform');
 for(const path of ['/sample-finding-pack.pdf','/assets/images/neraium-brand-preview.png','/missing/nested/path'])assert.equal((await page.request.get(origin+path)).status(),404);
 const robots=await page.request.get(origin+'/robots.txt');assert.match(await robots.text(),/Disallow: \//);
 assert.match(await page.locator('link[rel="canonical"]').getAttribute('href'),/^https:\/\/www.neraium.com\//);
 await page.close();
}
assert.deepEqual(errors,[]);
const result={origin,route_viewport_checks:checks,viewports:[1440,768,390],contact:'email draft only; no POST',indexing:'noindex header and robots disallow',console_errors:errors,passed:true};
fs.writeFileSync('artifacts/staging/qa.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
