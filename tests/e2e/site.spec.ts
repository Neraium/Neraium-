import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const publicPages = [
  { path: '/', purpose: /Know when your system starts behaving differently/i, canonical: 'https://neraium.com/' },
  { path: '/platform', purpose: /See when infrastructure starts behaving differently/i, canonical: 'https://neraium.com/platform' },
  { path: '/evidence', purpose: /What changed, what supports it/i, canonical: 'https://neraium.com/evidence' },
  { path: '/applications', purpose: /Water systems and central plants/i, canonical: 'https://neraium.com/applications' },
  { path: '/pilot', purpose: /Test Neraium against an event your team already knows/i, canonical: 'https://neraium.com/pilot' },
  { path: '/methodology', purpose: /Establish expected behavior/i, canonical: 'https://neraium.com/methodology' },
  { path: '/security', purpose: /Read-only by design/i, canonical: 'https://neraium.com/security' },
  { path: '/company', purpose: /Built from the gap between what the dashboard/i, canonical: 'https://neraium.com/company' },
  { path: '/operator-brief', purpose: /What a Neraium finding means/i, canonical: 'https://neraium.com/operator-brief' },
  { path: '/contact', purpose: /Request a free historical evaluation/i, canonical: 'https://neraium.com/contact' },
  { path: '/privacy', purpose: /Public inquiry, clearly bounded/i, canonical: 'https://neraium.com/privacy' },
] as const;

const navLinks = ['Platform','How It Works','Applications','Evaluation','Company'] as const;

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
        await image.scrollIntoViewIfNeeded();
        await expect(image).toHaveAttribute('alt', /\S/);
        await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      }
    });

    test('captures visual review screenshots', async ({ page }, testInfo) => {
      await page.goto(sitePage.path, { waitUntil: 'networkidle' });
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

test('homepage routes buyers to the software, the examples, and the free evaluation', async ({ page, request }) => {
  await page.goto('/');
  const hero = page.locator('.home-hero');
  const demo = hero.getByRole('link', { name: 'Run the interactive demo' });
  const freeEvaluation = hero.getByRole('link', { name: 'Request a free historical evaluation' });
  await expect(demo).toHaveAttribute('href', 'https://demo.neraium.com/');
  await demo.focus();
  await page.keyboard.press('Tab');
  await expect(freeEvaluation).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL('/contact');

  for (const route of ['/', '/applications']) {
    await page.goto(route);
    const applications = page.locator('#applications');
    await expect(applications.getByRole('link', { name: /open the aeration replay/i }))
      .toHaveAttribute('href', 'https://demo.neraium.com/replay?scenario=aeration');
    await applications.getByRole('link', { name: /read the illustrative chilled-water finding/i }).click();
    await expect(page).toHaveURL('/evidence#finding-title');
    await expect(page.locator('#finding-title')).toBeVisible();
  }

  await page.goto('/');
  await page.getByRole('link', { name: /review the evaluation process/i }).click();
  await expect(page).toHaveURL('/pilot');
  for (const option of ['Hosted', 'Portable']) {
    await expect(page.getByRole('heading', { name: option, exact: true })).toBeVisible();
  }
  const printable = await request.get('/sample-finding-pack.pdf');
  expect(printable.ok()).toBe(true);
  expect(printable.headers()['content-type']).toContain('application/pdf');
});

test('contact requires only name and organization and prepares a local draft', async ({ page }) => {
  const posts: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'POST') posts.push(request.url());
  });

  await page.goto('/contact');
  const form = page.locator('#contact-form');
  const prepare = form.getByRole('button', { name: 'Open email draft' });
  const name = form.getByLabel('Name', { exact: true });
  const organization = form.getByLabel('Organization', { exact: true });

  await expect(page.getByRole('link', { name: 'craig@neraium.com' }))
    .toHaveAttribute('href', /^mailto:craig@neraium[.]com[?]/);
  await expect(form).toContainText('Please keep event details, dates, and telemetry out of this first message.');
  await prepare.click();
  await expect(name).toBeFocused();
  await name.fill('Alex Morgan');
  await prepare.click();
  await expect(organization).toBeFocused();
  await organization.fill('Example Facilities');

  await form.getByLabel('System type (optional)').focus();
  await page.keyboard.press('Tab');
  await expect(prepare).toBeFocused();
  await page.keyboard.press('Enter');
  const feedback = page.locator('#form-feedback');
  await expect(feedback).toBeFocused();
  await expect(feedback).toContainText(/email draft is ready/i);
  await page.keyboard.press('Tab');
  const emailLink = feedback.getByRole('link', { name: 'Continue to your email app' });
  await expect(emailLink).toBeFocused();

  const draft = new URL((await emailLink.getAttribute('href'))!);
  expect(draft.protocol).toBe('mailto:');
  expect(draft.pathname).toBe('craig@neraium.com');
  expect(draft.searchParams.get('subject')).toBe('Neraium Historical Evaluation');
  expect(draft.searchParams.get('body')?.split('\r\n\r\n')).toEqual([
    'I would like to discuss a free historical evaluation.',
    'Name: Alex Morgan',
    'Organization: Example Facilities',
  ]);
  expect(posts).toEqual([]);
});

test('contact draft is cleared after edits and form reset', async ({ page }) => {
  await page.goto('/contact');
  await page.getByLabel('Name', { exact: true }).fill('Original name');
  await page.getByLabel('Organization', { exact: true }).fill('Example');
  const systemType = page.getByLabel('System type (optional)');
  await systemType.fill('Pumping plant');
  const prepare = page.getByRole('button', { name: 'Open email draft' });
  const feedback = page.locator('#form-feedback');
  const draft = feedback.getByRole('link');

  await prepare.click();
  await expect(draft).toHaveAttribute('href', /Original%20name/);
  await expect(draft).toHaveAttribute('href', /System%20type%3A%20Pumping%20plant/);
  await page.getByLabel('Name', { exact: true }).fill('Revised name');
  await expect(feedback).toBeEmpty();
  await expect(feedback).not.toHaveAttribute('data-state');
  await prepare.click();
  await expect(draft).toHaveAttribute('href', /Revised%20name/);
  await expect(draft).not.toHaveAttribute('href', /Original%20name/);
  await systemType.clear();
  await expect(feedback).toBeEmpty();
  await prepare.click();
  await expect(draft).not.toHaveAttribute('href', /System%20type/);
  await page.locator('#contact-form').evaluate((form: HTMLFormElement) => form.reset());
  await expect(feedback).toBeEmpty();
});

test('homepage stays compact on phones with readable chart labels', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: /which signals moved together/i });
  await expect(panel.getByText('Pearson correlation (r)', { exact: false })).toBeVisible();
  await expect(panel.getByText('SII withheld qualification in all 10 windows.')).toBeVisible();
  await expect(panel.getByRole('heading', { level: 3 })).toHaveText([
    'Dissolved oxygen & delivered air',
    'Dissolved oxygen & blower command',
    'Delivered air & blower command',
  ]);
  await expect(panel.locator('dd')).toHaveText([
    '-0.313741', '+0.057774', '-0.321915', '+0.049456', '+0.999921', '+0.999941',
  ]);
  await expect(panel.getByRole('link', { name: /six-signal investigation/i }))
    .toHaveAttribute('href', 'https://demo.neraium.com/replay?scenario=aeration');
  const axes = panel.locator('.pair-ticks');
  await expect(axes).toHaveCount(3);
  for (const axis of await axes.all()) {
    await expect(axis.locator('span')).toHaveText(['−1', '0', '+1']);
    await expect(axis).toBeVisible();
    expect(await axis.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(13);
  }
  const viewport = page.viewportSize();
  if (viewport && viewport.width <= 430) {
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(4400);
  }
  if (viewport?.width === 390 && viewport.height === 844) {
    await expect(panel.getByRole('listitem').last()).toBeInViewport({ ratio: 1 });
  }
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

  await expect(logo).toHaveAttribute('src', '/assets/images/neraium-logo-navy.jpg');
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
    expect(brandBox?.width).toBe(160);
    expect(brandBox?.height).toBeCloseTo(160 * 759 / 1034, 0);
    expect((logoBox?.width ?? 0) / (logoBox?.height ?? 1)).toBeCloseTo(1034 / 759, 2);
  } else {
    expect(brandBox?.width).toBe(128);
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
