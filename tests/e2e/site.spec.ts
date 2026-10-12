import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const publicPages = [
  { path: '/', purpose: /See degradation/i, canonical: 'https://www.neraium.com/' },
  { path: '/platform', purpose: /Understand the system/i, canonical: 'https://www.neraium.com/platform' },
  { path: '/evidence', purpose: /What changed, what supports it/i, canonical: 'https://www.neraium.com/evidence' },
  { path: '/applications', purpose: /Different infrastructure/i, canonical: 'https://www.neraium.com/applications' },
  { path: '/pilot', purpose: /Start with history/i, canonical: 'https://www.neraium.com/pilot' },
  { path: '/methodology', purpose: /Establish expected behavior/i, canonical: 'https://www.neraium.com/methodology' },
  { path: '/security', purpose: /Read-only by design/i, canonical: 'https://www.neraium.com/security' },
  { path: '/company', purpose: /Infrastructure deserves/i, canonical: 'https://www.neraium.com/company' },
  { path: '/operator-brief', purpose: /What a Neraium finding means/i, canonical: 'https://www.neraium.com/operator-brief' },
  { path: '/contact', purpose: /one system and one review question/i, canonical: 'https://www.neraium.com/contact' },
  { path: '/privacy', purpose: /Public inquiry, clearly bounded/i, canonical: 'https://www.neraium.com/privacy' },
] as const;

const navLinks = ['Platform','How It Works','Industries','Evaluation','Company'] as const;

async function openPrimaryNavigation(page: Page) {
  const toggle = page.locator('.nav-toggle');
  if (await toggle.isVisible()) {
    await expect(toggle).toHaveAccessibleName(/open navigation/i);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }
}

for (const sitePage of publicPages) {
  test.describe(sitePage.path, () => {
    test('loads with accessible landmarks, route-specific heading, metadata, and no console errors', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      const response = await page.goto(sitePage.path, { waitUntil: 'load' });
      expect(response?.ok()).toBe(true);
      await expect(page).toHaveTitle(/Neraium/i);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(sitePage.purpose);
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', sitePage.canonical);
      expect(errors).toEqual([]);
    });

    test('supports navigation, CTA, and keyboard focus', async ({ page }) => {
      await page.goto(sitePage.path);
      await page.keyboard.press('Tab');
      await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
      await expect(page.getByRole('link', { name: 'Skip to content' })).toHaveCSS('outline-style', 'solid');
      await expect(page.locator('.header-action')).toHaveAttribute('href', '/contact');
      await openPrimaryNavigation(page);
      const navigation = page.getByRole('navigation', { name: 'Main navigation' });
      for (const label of navLinks) await expect(navigation.getByRole('link', { name: label, exact: true })).toBeVisible();
    });

    test('has no horizontal overflow and loads local images with alt text', async ({ page }) => {
      await page.goto(sitePage.path);
      await page.locator('footer').scrollIntoViewIfNeeded();
      const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, document: document.documentElement.scrollWidth }));
      expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
      const images = page.locator('img');
      for (let index = 0; index < await images.count(); index += 1) {
        const image = images.nth(index);
        await expect(image).toHaveAttribute('alt', /\S/);
        await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      }
    });

    test('captures visual review screenshots', async ({ page }, testInfo) => {
      await page.goto(sitePage.path, { waitUntil: 'networkidle' });
      for (const image of await page.locator('img[loading="lazy"]').all()) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      const slug = sitePage.path.slice(1) || 'index';
      await page.screenshot({ path: path.join('playwright-screenshots', testInfo.project.name, `${slug}-full-page.png`), fullPage: true, animations: 'disabled' });
      for (const [selector, name] of [['.hero, .page-hero','hero'],['#how-it-works','product-flow'],['#capabilities','capabilities'],['#method-concepts','method-concepts'],['#evidence','evidence'],['#evaluation','evaluation'],['#maintenance','operator-view'],['#security','security'],['#applications','applications'],['#founder','founder'],['#contact','contact']] as const) {
        const target = page.locator(selector).first();
        if (await target.count()) {
          await target.scrollIntoViewIfNeeded();
          await target.screenshot({ path: path.join('playwright-screenshots', testInfo.project.name, `${slug}-${name}.png`), animations: 'disabled' });
        }
      }
    });
  });
}

test('contact form validates practical fields and prepares an email without fake submission', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST') posts.push(request.url());
  });
  await page.goto('/contact');
  await page.locator('#contact-form button[type="submit"]').click();
  await expect(page.locator('#name')).toBeFocused();
  await page.locator('#name').fill('Alex Morgan');
  await page.locator('#email').fill('alex@example.com');
  await page.locator('#organization').fill('Example Facilities');
  await page.locator('#facility').fill('Central plant');
  await page.locator('#review-question').fill('Has pumping response changed across comparable periods?');
  await page.locator('#contact-form button[type="submit"]').click();
  await expect(page.locator('#form-feedback')).toBeFocused();
  await expect(page.locator('#form-feedback')).toContainText(/email draft is ready/i);
  await expect(page.locator('#form-feedback a')).toHaveAttribute('href', /^mailto:craig@neraium[.]com[?]/);
  expect(posts).toEqual([]);
});

test('respects reduced motion preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  expect(scrollBehavior).toBe('auto');
});

test('mobile navigation exposes the contact path and moves keyboard focus predictably', async ({ page }, testInfo) => {
  await page.goto('/');
  const toggle = page.locator('.nav-toggle');
  const mobileContact = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Request an Evaluation' });
  if (await toggle.isVisible()) {
    await toggle.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Platform' })).toBeFocused();
    await expect(mobileContact).toBeVisible();
    const target = await toggle.boundingBox();
    expect(target?.width).toBeGreaterThanOrEqual(44);
    expect(target?.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: path.join('playwright-screenshots', testInfo.project.name, 'navigation-open.png'), animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(toggle).toBeFocused();
  } else {
    await expect(page.locator('.header-action')).toBeVisible();
    await expect(mobileContact).toBeHidden();
  }
});

test('header logo and controls stay proportionate and aligned across viewports', async ({ page }) => {
  await page.goto('/');
  const header = page.locator('.site-header');
  const brand = page.locator('.brand');
  const logo = page.locator('.brand-lockup');
  const toggle = page.locator('.nav-toggle');
  const viewport = page.viewportSize();

  await expect(logo).toHaveAttribute('src', '/assets/images/neraium-logo-lockup.svg');
  await expect.poll(() => logo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);

  const headerBox = await header.boundingBox();
  const brandBox = await brand.boundingBox();
  const logoBox = await logo.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(brandBox).not.toBeNull();
  expect(logoBox).not.toBeNull();
  expect(logoBox?.width).toBe(brandBox?.width);
  expect(logoBox?.height).toBe(brandBox?.height);

  if ((viewport?.width ?? 0) <= 560) {
    expect(headerBox?.height).toBeLessThanOrEqual(126);
    expect(brandBox?.width).toBe(100);
    expect(brandBox?.height).toBeCloseTo(100 * 833 / 1146, 0);
    expect((logoBox?.width ?? 0) / (logoBox?.height ?? 1)).toBeCloseTo(1146 / 833, 2);
  } else {
    expect(brandBox?.width).toBe(108);
  }

  if (await toggle.isVisible()) {
    const toggleBox = await toggle.boundingBox();
    expect(toggleBox?.width).toBeGreaterThanOrEqual(44);
    expect(toggleBox?.height).toBeGreaterThanOrEqual(44);
    expect((brandBox?.x ?? 0) + (brandBox?.width ?? 0)).toBeLessThan(toggleBox?.x ?? 0);
    const brandCenter = (brandBox?.y ?? 0) + (brandBox?.height ?? 0) / 2;
    const toggleCenter = (toggleBox?.y ?? 0) + (toggleBox?.height ?? 0) / 2;
    expect(Math.abs(brandCenter - toggleCenter)).toBeLessThanOrEqual(1);
  } else {
    const navBox = await page.locator('.nav').boundingBox();
    expect((brandBox?.x ?? 0) + (brandBox?.width ?? 0)).toBeLessThanOrEqual(navBox?.x ?? 0);
  }
});

test('Cloudflare preview enforces clean routes, redirects, security headers, and the nested custom 404', async ({ page, request }, testInfo) => {
  const clean = await request.get('/platform');
  expect(clean.status()).toBe(200);
  expect(clean.headers()['content-security-policy']).toContain("default-src 'self'");
  expect(clean.headers()['cross-origin-opener-policy']).toBe('same-origin');
  expect(clean.headers()['strict-transport-security']).toContain('max-age=31536000');

  const legacy = await request.get('/platform.html', { maxRedirects: 0 });
  expect(legacy.status()).toBe(301);
  expect(legacy.headers().location).toBe('/platform');
  const retired = await request.get('/analysis', { maxRedirects: 0 });
  expect(retired.status()).toBe(301);
  expect(retired.headers().location).toBe('/platform');
  const applications = await request.get('/applications');
  expect(applications.status()).toBe(200);
  const industries = await request.get('/industries', { maxRedirects: 0 });
  expect(industries.status()).toBe(301);
  expect(industries.headers().location).toBe('/applications');
  const technical = await request.get('/technical', { maxRedirects: 0 });
  expect(technical.status()).toBe(301);
  expect(technical.headers().location).toBe('/applications');

  const response = await page.goto('/definitely-missing/nested/page', { waitUntil: 'networkidle' });
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/outside the current site map/i);
  await expect(page.locator('link[rel="stylesheet"]')).toHaveAttribute('href', /^\/styles[.]css[?]/);
  await expect(page.locator('script[src]')).toHaveAttribute('src', /^\/scripts[.]js[?]/);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
  await expect(page.getByRole('banner')).toHaveCSS('position', 'sticky');
  await page.screenshot({ path: path.join('playwright-screenshots', testInfo.project.name, '404-nested-full-page.png'), fullPage: true, animations: 'disabled' });
});


test('email fallback preserves entered text safely and clears a stale draft after editing', async ({ page }) => {
  await page.goto('/contact');
  await page.locator('#name').fill('Alex & <script>alert(1)</script>');
  await page.locator('#email').fill('alex@example.com');
  await page.locator('#organization').fill('Water operations');
  await page.locator('#facility').fill('Municipal wastewater');
  await page.locator('#review-question').fill('Has power changed relative to delivered flow?');
  await page.getByRole('button', { name: 'Prepare email request' }).click();
  const feedback = page.locator('#form-feedback');
  await expect(feedback).toContainText('email draft is ready');
  const href = await feedback.locator('a').getAttribute('href');
  const body = new URL(href!).searchParams.get('body');
  expect(body).toContain('Alex & <script>alert(1)</script>');
  await page.getByText('No email application? Copy the request').click();
  await expect(feedback).toContainText('has not sent your request');
  await page.getByRole('button', { name: 'Select request text' }).click();
  await expect(page.locator('#prepared-request')).toBeFocused();
  await expect(page.locator('#prepared-request')).toHaveValue(body!);
  expect(await page.locator('#prepared-request').evaluate((field: HTMLTextAreaElement) => field.selectionEnd - field.selectionStart)).toBe(body!.length);
  await page.locator('#organization').fill('Updated organization');
  await expect(feedback).toBeEmpty();
});

test('navigation remains available without JavaScript on mobile', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4179/');
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Industries' })).toBeVisible();
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Industries' }).click();
  await expect(page).toHaveURL(/applications/);
  await context.close();
});
