import { expect, test } from '@playwright/test';
import path from 'node:path';

test('evaluation CTAs reach the disabled intake and prepare an accurate email draft', async ({ page, request }, testInfo) => {
  const posts: string[] = [];
  page.on('request', request => { if (request.method() === 'POST') posts.push(request.url()); });
  const availability = await request.get('/api/contact-config');
  expect(availability.ok()).toBe(true);
  expect(await availability.json()).toEqual({ enabled: false });
  const direct = await request.post('/api/contact', { data: { name: 'Local disabled-intake check' } });
  expect(direct.status()).toBe(503);

  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const heroCTA = page.locator('.home-hero .button.primary');
  await expect(heroCTA).toHaveAccessibleName('Request an Evaluation');
  await expect(heroCTA).toHaveAttribute('href', '/contact');
  await expect(heroCTA.locator('svg[aria-hidden="true"]')).toHaveCount(1);
  const evidence = path.join('playwright-screenshots', testInfo.project.name);
  const toggle = page.locator('.nav-toggle');
  const headerCTA = page.locator('.header-action');
  let navigationCTA = headerCTA;
  if (await toggle.isVisible()) {
    await toggle.click();
    navigationCTA = page.locator('.nav-contact');
    await expect(navigationCTA).toBeInViewport();
    const menuBox = await page.locator('.nav').boundingBox();
    const actionBox = await navigationCTA.boundingBox();
    expect(actionBox!.height).toBeGreaterThanOrEqual(52);
    expect(actionBox!.width).toBeGreaterThan(menuBox!.width * 0.8);
    await page.screenshot({ path: path.join(evidence, 'evaluation-mobile-menu.png'), animations: 'disabled' });
  } else {
    await expect(headerCTA).toBeInViewport();
    await headerCTA.focus();
    await expect(headerCTA).toHaveCSS('outline-style', 'solid');
    await page.locator('.site-header').screenshot({ path: path.join(evidence, 'evaluation-desktop-header.png'), animations: 'disabled' });
  }
  await expect(navigationCTA).toHaveAccessibleName('Request an Evaluation');
  await expect(navigationCTA.locator('svg[aria-hidden="true"]')).toHaveCount(1);
  await navigationCTA.click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Request an evaluation');
  await expect(page.locator('.nav-contact')).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('#contact-form button[type="submit"]')).toHaveText('Prepare email draft');
  await expect(page.locator('#contact-challenge')).toBeHidden();
  await page.locator('#name').fill('Alex Morgan');
  await page.locator('#email').fill('alex@example.com');
  await page.locator('#organization').fill('Example Facilities');
  await page.locator('#facility').fill('Resort central plant');
  await page.locator('#review-question').fill('Flow & pressure under comparable load?');
  await page.locator('#contact-form button[type="submit"]').click();
  await expect(page.locator('#form-feedback')).toContainText('Your details have not been sent');
  const draft = page.getByRole('link', { name: 'Open email draft' });
  const url = new URL((await draft.getAttribute('href'))!);
  expect(url.protocol).toBe('mailto:');
  expect(url.pathname).toBe('craig@neraium.com');
  expect(url.searchParams.get('subject')).toBe('Neraium Historical Evaluation');
  expect(url.searchParams.get('body')).toContain('Name: Alex Morgan');
  expect(url.searchParams.get('body')).toContain('Work email: alex@example.com');
  expect(url.searchParams.get('body')).toContain('System or facility type: Resort central plant');
  expect(url.searchParams.get('body')).toContain('Review question: Flow & pressure under comparable load?');
  await expect(page.locator('#name')).toHaveValue('Alex Morgan');
  expect(posts).toEqual([]);
  await page.evaluate(async () => {
    (document.activeElement as HTMLElement)?.blur();
    window.scrollTo({ top: 0, behavior: 'instant' });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  await page.screenshot({ path: path.join(evidence, 'evaluation-email-draft.png'), fullPage: true, animations: 'disabled' });

  await page.goto('/');
  await heroCTA.click();
  await expect(page).toHaveURL(/\/contact$/);
});

test('desktop CTA remains reachable at the navigation breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 1121, height: 900 });
  await page.goto('/');
  await expect(page.locator('.nav-toggle')).toBeHidden();
  await expect(page.locator('.header-action')).toBeInViewport();
  const boxes = await page.locator('.brand, .nav, .header-action').evaluateAll(elements => elements.map(element => {
    const box = element.getBoundingClientRect();
    return { x: box.x, right: box.right };
  }));
  expect(boxes[0].right).toBeLessThanOrEqual(boxes[1].x);
  expect(boxes[1].right).toBeLessThanOrEqual(boxes[2].x);
});
