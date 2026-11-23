import { expect, test, type Page } from '@playwright/test';

const SHOTS = process.env.SHOTS_DIR;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, animations: 'disabled' });
};

test('Atlas lists 12 worlds with only the first one open for a new learner', async ({ page }) => {
  await page.goto('/atlas');
  const worlds = page.getByRole('list', { name: 'Worlds' }).getByRole('link');
  await expect(worlds).toHaveCount(12);
  await expect(page.getByRole('link', { name: /World 1: Sunny Shores, Origins$/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /, locked$/ })).toHaveCount(11);
  await expect(page.getByText('BIT')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await shot(page, '01-atlas-home');
});

test('World → Stage → Level navigation with breadcrumbs', async ({ page }) => {
  await page.goto('/atlas');
  await page.getByRole('link', { name: /World 1: Sunny Shores/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Sunny Shores' })).toBeVisible();
  await shot(page, '02-world');
  await page.getByRole('link', { name: /Stage 1-2: Number Systems & Arithmetic/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Number Systems & Arithmetic' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /UNIT 1 · POSITIONAL SYSTEMS/ })).toBeVisible();
  await shot(page, '03-stage');
  await page
    .getByRole('link', { name: /Binary Numbers/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/atlas\/origins\/number-systems\/binary-numbers$/);
  await expect(page.getByText('Locked', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: /CLEAR THESE FIRST \(1\)/ })).toBeVisible();
  await shot(page, '04-level-locked');
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Atlas' }).click();
  await expect(page).toHaveURL(/\/atlas$/);
});

test('Locked level points to its prerequisite', async ({ page }) => {
  await page.goto('/atlas/systems/operating-systems/page-replacement');
  await expect(page.getByRole('heading', { level: 1, name: 'Page Replacement: FIFO, OPT & LRU' })).toBeVisible();
  await page.getByRole('link', { name: /Demand Paging & Page Faults/ }).click();
  await expect(page).toHaveURL(/demand-paging$/);
});

test('Continue goes to the first Core Path level, which is ready to play', async ({ page }) => {
  await page.goto('/atlas');
  await page.getByRole('button', { name: 'START' }).click();
  await expect(page).toHaveURL(/\/atlas\/origins\/information-bits\/what-is-computer$/);
  await expect(page.getByText('Ready to play')).toBeVisible();
  await expect(page.getByText('None — this is where the journey starts.')).toBeVisible();
  await shot(page, '05-level-ready');
});

test('Ctrl K search finds a level and navigates to it', async ({ page }) => {
  await page.goto('/atlas');
  await expect(page.getByRole('heading', { level: 1, name: 'Isles of Computing' })).toBeVisible();
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Search the Atlas' });
  await expect(dialog).toBeVisible();
  await page.keyboard.type('page replacement');
  await shot(page, '06-search');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/atlas\/systems\/operating-systems\/page-replacement$/);
  await expect(dialog).toBeHidden();
});

test('Keyboard only: tab to a world and open it', async ({ page }) => {
  await page.goto('/atlas');
  await expect(page.getByRole('heading', { level: 1, name: 'Isles of Computing' })).toBeVisible();
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    const name = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
    if (name.startsWith('World 1:')) break;
  }
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { level: 1, name: 'Sunny Shores' })).toBeVisible();
});

test('Unknown routes show the not-found page', async ({ page }) => {
  await page.goto('/atlas/nowhere');
  await expect(page.getByRole('heading', { name: 'Uncharted waters' })).toBeVisible();
});

test('Gallery renders every component; reduced motion disables button springs', async ({ page }) => {
  await page.goto('/gallery');
  await expect(page.getByRole('heading', { name: 'UI kit gallery' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await shot(page, '07-gallery');
  const play = page.getByRole('button', { name: 'PLAY' });
  await play.hover();
  await page.waitForTimeout(400);
  expect(await play.evaluate((el) => getComputedStyle(el).transform)).not.toBe('none');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload();
  const play2 = page.getByRole('button', { name: 'PLAY' });
  await play2.hover();
  await page.waitForTimeout(400);
  expect(await play2.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
});
