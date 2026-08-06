import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';

const publicPages = [
  { path: '/index.html', purpose: /Identify persistent changes/i },
  { path: '/platform.html', purpose: /relationship-level review/i },
  { path: '/evidence.html', purpose: /Structured findings/i },
  { path: '/technical.html', purpose: /Operational systems/i },
  { path: '/pilot.html', purpose: /Historical Evaluation/i },
  { path: '/methodology.html', purpose: /Baseline, comparison, persistence/i },
  { path: '/security.html', purpose: /Read-only by design/i },
  { path: '/company.html', purpose: /practical infrastructure investigation/i },
  { path: '/operator-brief.html', purpose: /Printable engineering/i },
  { path: '/contact.html', purpose: /one system and one review question/i },
] as const;

const navLinks = ['Platform','Evidence','Applications','Security','Evaluation','Company'] as const;

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
      for (const label of navLinks) await expect(navigation.getByRole('link', { name: label })).toBeVisible();
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
      const slug = sitePage.path.replace('/', '').replace('.html', '') || 'index';
      await page.screenshot({ path: path.join('playwright-screenshots', testInfo.project.name, `${slug}-full-page.png`), fullPage: true, animations: 'disabled' });
      for (const [selector, name] of [['.hero, .page-hero','hero'],['#evidence','evidence-package'],['#maintenance','maintenance-view'],['#security','security'],['#applications','applications'],['#contact','contact']] as const) {
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
  await page.goto('/contact.html');
  await page.locator('#contact-form button[type="submit"]').click();
  await expect(page.locator('#name')).toBeFocused();
  await page.locator('#name').fill('Alex Morgan');
  await page.locator('#email').fill('alex@example.com');
  await page.locator('#organization').fill('Example Facilities');
  await page.locator('#facility').fill('Central plant');
  await page.locator('#review-question').fill('Has pumping response changed across comparable periods?');
  await page.locator('#contact-form button[type="submit"]').click();
  await expect(page.locator('#form-feedback')).toContainText(/request is ready/i);
  await expect(page.locator('#form-feedback a')).toHaveAttribute('href', /^mailto:craig@neraium[.]com[?]/);
  expect(posts).toEqual([]);
});

test('respects reduced motion preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/index.html');
  const scrollBehavior = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  expect(scrollBehavior).toBe('auto');
});
