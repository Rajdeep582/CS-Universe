import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { parse } from 'yaml';
import type { Item } from '../../src/engine/lesson/schema';

const SHOTS = process.env.SHOTS_DIR;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, animations: 'disabled' });
};
const LEVEL = 'what-is-computer';
const steps = (
  JSON.parse(readFileSync('src/generated/lessons.json', 'utf8')) as Record<string, { steps: { id: string }[] }>
)[LEVEL]!.steps.map((s) => s.id);
const pool = (
  parse(readFileSync(`content/worlds/01-origins/01-information-bits/levels/${LEVEL}/test.yaml`, 'utf8')) as {
    items: Item[];
  }
).items;

const pad = (n: number) => String(n).padStart(2, '0');
function stampAt(d: Date) {
  return {
    at: d.getTime(),
    day: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hour: d.getHours(),
  };
}
/** A save file in which the learner studied and cleared the level `daysAgo` days ago with 100 %. */
function saveFile(daysAgo: number) {
  const t = new Date(Date.now() - daysAgo * 86_400_000);
  t.setHours(12, 0, 0, 0);
  const events = steps.map((step, i) => ({
    t: 'step',
    level: LEVEL,
    step,
    ...stampAt(new Date(t.getTime() + i * 1000)),
  }));
  events.push({
    t: 'test',
    level: LEVEL,
    correct: 10,
    total: 10,
    ms: 90_000,
    proveIt: false,
    ...stampAt(new Date(t.getTime() + 60_000)),
  } as never);
  const path = join(tmpdir(), `csu-save-${daysAgo}-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify({ app: 'cs-universe', version: 1, exportedAt: new Date().toISOString(), events }));
  return path;
}

async function importSave(page: Page, path: string) {
  await page.getByRole('button', { name: 'Settings' }).click();
  const dlg = page.getByRole('dialog', { name: 'Settings' });
  await dlg.getByLabel('Import progress file').setInputFiles(path);
  await expect(dlg.getByRole('status')).toContainText('Progress restored');
  await page.keyboard.press('Escape');
}

async function answerAllRight(page: Page) {
  for (;;) {
    const prompt = (await page.locator('form h2').innerText()).trim();
    const item = pool.find((i) => i.prompt === prompt)!;
    const form = page.locator('form');
    if (item.type === 'mcq' || item.type === 'predict-output')
      await form.locator('label.choice', { hasText: item.options[item.answer]! }).first().click();
    else if (item.type === 'spot-the-bug') await form.locator('label.bug-line').nth(item.answer).click();
    else if (item.type === 'numeric') await form.getByLabel('YOUR ANSWER').fill(String(item.answer));
    else if (item.type === 'order-steps')
      for (let target = 0; target < item.steps.length; target++) {
        const texts = await form.locator('ol li span.flex-1').allInnerTexts();
        for (let at = texts.indexOf(item.steps[target]!); at > target; at--)
          await form.getByRole('button', { name: `Move "${item.steps[target]}" up` }).click();
      }
    else if (item.type === 'match')
      for (const [k, p] of item.pairs.entries())
        await form.getByRole('combobox').nth(k).selectOption({ label: p.right });
    await page.getByRole('button', { name: 'Check' }).click();
    const next = page.getByRole('button', { name: /Next question|See results/ });
    const done = (await next.innerText()).includes('See results');
    await next.click();
    if (done) break;
  }
}

test('progress survives a reload (IndexedDB event log)', async ({ page }) => {
  await page.goto(`/play/${LEVEL}`);
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.getByRole('link', { name: 'World Map', exact: true })).toContainText('10 XP');
  await page.reload();
  await expect(page.getByRole('link', { name: 'World Map', exact: true })).toContainText('10 XP');
  await expect(page.getByRole('navigation', { name: 'Lesson steps' }).locator('.step-dot-done')).toHaveCount(2);
});

test('spaced review: due after clearing, passing 3+ days later masters the level', async ({ page }) => {
  await page.goto('/atlas');
  await importSave(page, saveFile(5));
  // Overdue review takes the single CONTINUE slot and shows in the HUD.
  await expect(page.getByRole('link', { name: '1 reviews due' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'REVIEW' })).toBeVisible();
  await page.getByRole('button', { name: 'REVIEW' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'What Is a Computer?' })).toBeVisible();
  await page.getByRole('button', { name: 'Start review' }).click();
  await expect(page.locator('#test-progress')).toHaveAttribute('aria-label', /of 5$/);
  await answerAllRight(page);
  await expect(page.getByText('LEVEL MASTERED', { exact: true })).toBeVisible();
  await expect(page.getByText('+85 XP')).toBeVisible();
  await expect(page.getByText(/Next review:/)).toBeVisible();
  const rank = page.getByRole('dialog').filter({ hasText: 'RANK UP' });
  await expect(rank).toContainText('Byte'); // review XP + "Pass a review" goal crosses 500
  await rank.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(500);
  await shot(page, '07-mastered');
  await page.getByRole('link', { name: 'Reviews & journey' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Byte' })).toBeVisible();
  await expect(page.getByText('Long-Term Memory', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Week of', exact: false }).first()).toBeVisible();
  await expect(page.getByText('Mastered What Is a Computer? ★★★')).toBeVisible();
  await shot(page, '08-journey');
});

test('a review is not offered before it is due', async ({ page }) => {
  await page.goto('/atlas');
  await importSave(page, saveFile(0));
  await page.goto(`/play/${LEVEL}?review=true`);
  await expect(page.getByText(/Not due yet — next review on/)).toBeVisible();
  await expect(page.getByRole('link', { name: /reviews due/ })).toHaveCount(0);
});

test('prove it clears without studying; calm mode shows no confetti', async ({ page }) => {
  await page.goto('/atlas');
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('dialog', { name: 'Settings' }).getByText('Calm', { exact: true }).click();
  await page.keyboard.press('Escape');
  await page.goto(`/play/${LEVEL}`);
  await page.getByRole('button', { name: /Prove it/ }).click();
  await expect(page.getByText(/LEVEL TEST · ATTEMPT 1 · PROVE IT/)).toBeVisible();
  await answerAllRight(page);
  const dlg = page.getByRole('dialog').filter({ hasText: 'RANK UP' });
  await expect(dlg).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await dlg.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('LEVEL CLEARED', { exact: true })).toBeVisible();
  await page.goto('/journey');
  await expect(page.getByText('Proved It', { exact: true })).toBeVisible();
});

test('export, then reset erases progress', async ({ page }) => {
  await page.goto('/atlas');
  await importSave(page, saveFile(1));
  await expect(page.getByRole('link', { name: 'World Map', exact: true })).toContainText('370 XP'); // 60 steps + 25 studied + 175 test + 50 + 60 daily goals
  await page.getByRole('button', { name: 'Settings' }).click();
  const dlg = page.getByRole('dialog', { name: 'Settings' });
  const download = page.waitForEvent('download');
  await dlg.getByRole('button', { name: 'Export' }).click();
  expect((await download).suggestedFilename()).toMatch(/^cs-universe-progress-\d{4}-\d{2}-\d{2}\.json$/);
  await dlg.getByRole('button', { name: 'Reset…' }).click();
  await expect(dlg.getByRole('alert')).toContainText('permanently erases');
  await dlg.getByRole('button', { name: 'Yes, erase all progress' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('link', { name: 'World Map', exact: true })).toContainText('0 XP');
  await page.reload();
  await expect(page.getByRole('link', { name: 'World Map', exact: true })).toContainText('0 XP');
});

test('celebration tiers grow: rank < stage < world', async ({ page }) => {
  await page.goto('/gallery');
  const sizes: number[] = [];
  for (const t of ['rank', 'stage', 'world']) {
    await page.getByRole('button', { name: `Preview ${t}` }).click();
    const dlg = page.locator(`[data-tier="${t}"]`);
    await expect(dlg).toBeVisible();
    await page.waitForTimeout(600);
    sizes.push((await dlg.locator('.celebrate-badge').boundingBox())!.width);
    await shot(page, `09-celebrate-${t}`);
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
  }
  expect(sizes[0]).toBeLessThan(sizes[1]!);
  expect(sizes[1]).toBeLessThan(sizes[2]!);
});
