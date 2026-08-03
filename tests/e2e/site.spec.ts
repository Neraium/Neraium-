import { expect, test, type Locator, type Page } from '@playwright/test';
import path from 'node:path';

const pages = [
  { path: '/index.html', name: 'homepage', heading: /infrastructure stops behaving like itself/i },
  { path: '/platform.html', name: 'platform', heading: /read-only analysis for telemetry-rich infrastructure/i },
] as const;

const publicPages = [
  '/index.html',
  '/platform.html',
  '/technical.html',
  '/pilot.html',
  '/methodology.html',
  '/security.html',
  '/operator-brief.html',
  '/contact.html',
] as const;

const primaryNavigation = [
  { name: 'Home', path: '/index.html' },
  { name: 'Platform', path: '/platform.html' },
  { name: 'Use Cases', path: '/technical.html' },
  { name: 'Pilot', path: '/pilot.html' },
  { name: 'Contact', path: '/contact.html' },
] as const;

const importantImages = [
  '/neraium-logo.jpeg',
  '/neraium-product-preview.png',
  '/infra-bg-1.jpg',
  '/infra-bg-2.jpg',
] as const;

async function openPrimaryNavigation(page: Page) {
  const toggle = page.locator('.nav-toggle');
  if (await toggle.isVisible()) {
    await expect(toggle).toHaveAccessibleName(/open navigation/i);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(toggle).toHaveAccessibleName(/close navigation/i);
  }
}

async function expectNamed(locator: Locator) {
  await expect(locator).toHaveAccessibleName(/\S/);
}

async function focusWithKeyboard(page: Page, target: Locator) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo(0, 0);
  });

  for (let attempt = 0; attempt < 30; attempt += 1) {
    await page.keyboard.press('Tab');
    const focusedTarget = await target.evaluate(
      (element) => document.activeElement === element,
    );
    if (focusedTarget) return;
  }

  throw new Error('Target did not receive keyboard focus after 30 Tab presses');
}

for (const sitePage of pages) {
  test.describe(sitePage.name, () => {
    test('loads without browser errors and has the expected structure', async ({ page }) => {
      const browserErrors: string[] = [];
      page.on('pageerror', (error) => browserErrors.push(`page error: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') browserErrors.push(`console error: ${message.text()}`);
      });

      const response = await page.goto(sitePage.path, { waitUntil: 'load' });

      expect(response?.ok()).toBe(true);
      await expect(page).toHaveTitle(/Neraium/i);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(sitePage.heading);
      await expect(page.getByRole('banner')).toBeVisible();
      await expect(page.getByRole('main')).toBeVisible();
      await expect(page.locator('nav[aria-label="Main navigation"]')).toBeAttached();
      await expect(page.getByRole('navigation', { name: 'Footer navigation' })).toBeAttached();
      await expect(page.getByRole('contentinfo')).toBeVisible();

      expect(browserErrors, browserErrors.join('\n')).toEqual([]);
    });

    test('has an accessible heading hierarchy and named controls', async ({ page }) => {
      await page.goto(sitePage.path);
      await openPrimaryNavigation(page);

      const headingLevels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll((headings) =>
        headings.map((heading) => ({
          level: Number(heading.tagName.slice(1)),
          text: heading.textContent?.trim() ?? '',
        })),
      );

      expect(headingLevels.length).toBeGreaterThan(0);
      expect(headingLevels[0].level).toBe(1);
      for (const [index, heading] of headingLevels.entries()) {
        expect(heading.text, `Heading ${index + 1} should have a name`).not.toBe('');
        if (index > 0) {
          expect(
            heading.level,
            `Heading "${heading.text}" skips a level`,
          ).toBeLessThanOrEqual(headingLevels[index - 1].level + 1);
        }
      }

      const visibleControls = page.locator('a[href], button:not([disabled])');
      for (let index = 0; index < await visibleControls.count(); index += 1) {
        const control = visibleControls.nth(index);
        if (await control.isVisible()) await expectNamed(control);
      }
    });

    test('shows keyboard focus on the skip link and primary CTA', async ({ page }) => {
      await page.goto(sitePage.path);

      const skipLink = page.getByRole('link', { name: 'Skip to content' });
      await page.keyboard.press('Tab');
      await expect(skipLink).toBeFocused();
      await expect(skipLink).toBeVisible();
      await expect(skipLink).toHaveCSS('outline-style', 'solid');

      const primaryCta = page.locator('main .button--primary').first();
      await focusWithKeyboard(page, primaryCta);
      await expect(primaryCta).toBeFocused();
      await expect(primaryCta).toBeInViewport();
      await expect(primaryCta).toHaveCSS('outline-style', 'solid');
      await expect(primaryCta).toHaveCSS('outline-width', '2px');
    });

    test('primary navigation links work', async ({ page }) => {
      for (const destination of primaryNavigation) {
        await page.goto(sitePage.path);
        await openPrimaryNavigation(page);

        const navigation = page.getByRole('navigation', { name: 'Main navigation' });
        const link = navigation.getByRole('link', { name: destination.name, exact: true });
        await expect(link).toHaveAttribute('href', destination.path.slice(1));
        await link.click();
        await expect(page).toHaveURL(new RegExp(`${destination.path.replace('.', '\\.')}?$`));
        await expect(page.locator('main')).toBeVisible();
      }
    });

    test('primary CTA links resolve', async ({ page, request }) => {
      await page.goto(sitePage.path);
      const primaryCtas = page.locator('a.button--primary, a.mobile-sticky-cta');
      const destinations = await primaryCtas.evaluateAll((links) =>
        [...new Set(links.map((link) => (link as HTMLAnchorElement).href))],
      );

      expect(destinations.length).toBeGreaterThan(0);
      for (const destination of destinations) {
        const response = await request.get(destination.split('#')[0]);
        expect(response.ok(), `${destination} should resolve`).toBe(true);
      }
    });

    test('important images load', async ({ page, request }) => {
      await page.goto(sitePage.path);

      const pageImages = page.locator('img');
      expect(await pageImages.count()).toBeGreaterThan(0);
      for (let index = 0; index < await pageImages.count(); index += 1) {
        const image = pageImages.nth(index);
        const source = await image.getAttribute('src');
        await image.scrollIntoViewIfNeeded();
        await expect
          .poll(
            () => image.evaluate((element: HTMLImageElement) =>
              element.complete && element.naturalWidth > 0 && element.naturalHeight > 0,
            ),
            { message: `${source} should load and decode` },
          )
          .toBe(true);
      }

      for (const imagePath of importantImages) {
        const response = await request.get(imagePath);
        expect(response.ok(), `${imagePath} should resolve`).toBe(true);
        expect(response.headers()['content-type']).toMatch(/^image\//);
        expect((await response.body()).byteLength).toBeGreaterThan(0);
      }
    });

    test('has no horizontal overflow', async ({ page }) => {
      await page.goto(sitePage.path);
      await page.locator('footer').scrollIntoViewIfNeeded();

      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth,
      }));

      expect(dimensions.document, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
      expect(dimensions.body, JSON.stringify(dimensions)).toBeLessThanOrEqual(dimensions.viewport);
    });

    if (sitePage.name === 'homepage') {
      test('shows the product in the first viewport', async ({ page }) => {
        await page.goto(sitePage.path, { waitUntil: 'networkidle' });
        const product = page.locator('.product-window');
        await expect(product).toBeVisible();
        const box = await product.boundingBox();
        const viewport = page.viewportSize();
        expect(box).not.toBeNull();
        expect(viewport).not.toBeNull();
        const visibleHeight = Math.min((box?.y ?? 0) + (box?.height ?? 0), viewport?.height ?? 0)
          - Math.max(box?.y ?? 0, 0);
        expect(visibleHeight).toBeGreaterThanOrEqual(120);
      });
    }

    if (sitePage.name === 'platform') {
      test('keeps the mobile pilot action clear of the hero', async ({ page }) => {
        test.skip((page.viewportSize()?.width ?? 0) > 720, 'Mobile interaction only');
        await page.goto(sitePage.path, { waitUntil: 'networkidle' });
        const stickyCta = page.locator('.mobile-sticky-cta');
        await expect(stickyCta).toHaveAttribute('aria-hidden', 'true');
        await expect(stickyCta).toHaveAttribute('tabindex', '-1');

        await page.locator('#architecture').scrollIntoViewIfNeeded();
        await expect(stickyCta).toHaveClass(/is-visible/);
        await expect(stickyCta).toHaveAttribute('aria-hidden', 'false');
        await expect(stickyCta).not.toHaveAttribute('tabindex', '-1');
      });
    }

    test('captures a full-page screenshot', async ({ page }, testInfo) => {
      await page.goto(sitePage.path, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);

      await page.screenshot({
        path: path.join(
          'playwright-screenshots',
          testInfo.project.name,
          `${sitePage.name}.png`,
        ),
        fullPage: true,
        animations: 'disabled',
      });
    });
  });
}

test('all public pages load without console errors, broken images, or overflow', async ({ page }) => {
  for (const pathName of publicPages) {
    const errors: string[] = [];
    const onPageError = (error: Error) => errors.push(`${pathName}: ${error.message}`);
    const onConsole = (message: { type(): string; text(): string }) => {
      if (message.type() === 'error') errors.push(`${pathName}: ${message.text()}`);
    };
    page.on('pageerror', onPageError);
    page.on('console', onConsole);
    const response = await page.goto(pathName, { waitUntil: 'load' });
    expect(response?.ok(), `${pathName} should load`).toBe(true);
    await expect(page.locator('main')).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    expect(dimensions.document, `${pathName}: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport);
    expect(dimensions.body, `${pathName}: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport);
    for (const image of await page.locator('img').all()) {
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    }
    expect(errors, errors.join('\n')).toEqual([]);
    page.off('pageerror', onPageError);
    page.off('console', onConsole);
  }
});
