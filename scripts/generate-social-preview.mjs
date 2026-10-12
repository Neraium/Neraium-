// Code-rendered brand artwork; no product UI or operational results.
// Run manually after changing this composition: node scripts/generate-social-preview.mjs
import { chromium } from 'playwright';
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Neraium social preview artwork</title><style>
    *{box-sizing:border-box}body{margin:0;background:#08121f;color:#f2f4f2;font-family:Arial,Helvetica,sans-serif;padding:70px;width:1200px;height:630px;position:relative}
    .brand{font-size:32px;letter-spacing:-1px}.brand span{color:#91e0cf}.category{font-size:13px;letter-spacing:2px;color:#91e0cf;margin-top:72px;text-transform:uppercase}
    h1{font-size:78px;font-weight:500;letter-spacing:-4px;line-height:1.06;margin:24px 0 30px}h1 span{color:#91e0cf}.foot{font-size:19px;color:#b7c3cc;border-top:1px solid #304252;padding-top:25px}
    .system{position:absolute;right:80px;top:210px;width:200px;height:210px}.line{position:absolute;width:140px;height:140px;border:1px solid #4c716e;transform:rotate(45deg);top:35px;left:35px}.node{position:absolute;width:20px;height:20px;background:#91e0cf}.a{top:25px;left:25px}.b{top:25px;right:25px}.c{bottom:25px;left:25px}.d{bottom:25px;right:25px}.center{position:absolute;top:95px;left:95px;width:20px;height:20px;border:1px solid #91e0cf;background:#102c34}
  </style><body><div class="brand">Neraium<span>.</span></div><div class="category">Systemic Infrastructure Intelligence</div><h1>See degradation<br>before systems <span>fail.</span></h1><div class="foot">Understand the relationships. Recognize the change.</div><div class="system" aria-hidden="true"><div class="line"></div><div class="node a"></div><div class="node b"></div><div class="node c"></div><div class="node d"></div><div class="center"></div></div></body></html>`);
  await page.screenshot({ path: 'assets/images/neraium-social.png' });
} finally { await browser.close(); }
