import { expect, test, type Page } from '@playwright/test';

// The 3D world renders with software WebGL in CI, so allow generous time.
test.describe.configure({ timeout: 120_000 });

const SHOTS = process.env.SHOTS_DIR;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, animations: 'disabled' });
};
/** Labels become visible once the terrain is generated and the label solver has run. */
const visibleLabel = (page: Page, name: RegExp | string) =>
  page.locator('.world-label[data-hidden="0"]').getByRole('link', { name });

async function drawCalls(page: Page) {
  await page.keyboard.press('F3');
  const overlay = page.getByRole('status', { name: 'Performance overlay' });
  await expect(overlay).toContainText(/Draw calls [1-9]/, { timeout: 20_000 });
  const text = await overlay.innerText();
  await page.keyboard.press('F3');
  return Number(/Draw calls (\d+)/.exec(text)![1]);
}

test('World Map shows 12 islands; only World 1 is open for a new learner', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await expect(visibleLabel(page, /^World 1: Sunny Shores$/)).toBeVisible({ timeout: 60_000 });
  await expect(page.locator('.world-label').getByRole('link', { name: /^World \d+: / })).toHaveCount(12);
  await expect(page.locator('.world-label').getByRole('link', { name: /, locked$/ })).toHaveCount(11);
  await expect(page.getByText('YOU ARE HERE')).toBeVisible();
  await page.waitForTimeout(1500);
  await shot(page, '01-world-map');
  expect(await drawCalls(page)).toBeLessThanOrEqual(80);
});

test('Island → stage → level card, Esc walks back up', async ({ page }) => {
  await page.goto('/');
  await visibleLabel(page, /^World 1: Sunny Shores$/).click({ timeout: 60_000 });
  await expect(page).toHaveURL(/\/world\/origins$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Sunny Shores' })).toBeVisible();
  const stages = page.getByRole('navigation', { name: 'Stages of Sunny Shores' }).getByRole('link');
  await expect(stages).toHaveCount(4);
  await page.waitForTimeout(2500);
  await shot(page, '02-island');
  await stages.first().click();
  await expect(page).toHaveURL(/\/world\/origins\/information-bits$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Information & Bits' })).toBeVisible();
  const first = visibleLabel(page, 'Level 1: What Is a Computer?, up next');
  await expect(first).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2000);
  await shot(page, '03-stage');
  expect(await drawCalls(page)).toBeLessThanOrEqual(80);
  await first.click();
  await expect(page).toHaveURL(/level=what-is-computer/);
  const card = page.getByRole('complementary', { name: 'Level details: What Is a Computer?' });
  await expect(card).toContainText('Ready to play');
  await expect(card).toContainText('None — start here.');
  await page.waitForTimeout(2000);
  await shot(page, '04-level-card');
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/world\/origins$/);
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/$/);
});

test('Search flies to a locked level and lists what to clear first', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.keyboard.press('Control+k');
  await page.keyboard.type('page replacement');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/world\/systems\/operating-systems\?level=page-replacement$/);
  const card = page.getByRole('complementary', { name: /Page Replacement/ });
  await expect(card).toContainText('Locked');
  await expect(card).toContainText('CLEAR THESE FIRST (1)');
  await expect(card.getByRole('link', { name: /Demand Paging/ })).toBeVisible();
  await page.waitForTimeout(6000);
  await shot(page, '05-search-fly-to');
});

test('Quality setting switches tier and is remembered', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings' }).click();
  const dlg = page.getByRole('dialog', { name: 'Settings' });
  await expect(dlg).toContainText('NOW BALANCED');
  await dlg.getByText('Lite', { exact: true }).click();
  await expect(dlg).toContainText('NOW LITE');
  await page.keyboard.press('Escape');
  await page.reload();
  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toContainText('NOW LITE');
});

test('Without WebGL 2 the app falls back to the 2D Atlas', async ({ page }) => {
  await page.addInitScript(() => {
    const orig = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error -- overriding an overloaded DOM method with a test stub
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
      return type === 'webgl2' ? null : orig.call(this, type as '2d', ...(rest as []));
    };
  });
  await page.goto('/');
  await expect(page).toHaveURL(/\/atlas\?notice=webgl$/);
  await expect(page.getByRole('status')).toContainText('WebGL 2 is unavailable');
});
