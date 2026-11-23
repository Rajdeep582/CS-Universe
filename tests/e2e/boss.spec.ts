import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import type { Item } from '../../src/engine/lesson/schema';

test.describe.configure({ timeout: 120_000 }); // two 15-question exams per test

const SHOTS = process.env.SHOTS_DIR;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, animations: 'disabled' });
};
const lessons = JSON.parse(readFileSync('src/generated/lessons.json', 'utf8')) as Record<
  string,
  { steps: { id: string }[]; test: Item[] }
>;
const pool = Object.values(lessons).flatMap((l) => l.test);
const CORE_1_1 = ['what-is-computer', 'abstraction-layers', 'information-idea', 'bits', 'bytes-words'];

const pad = (n: number) => String(n).padStart(2, '0');
const stamp = (d: Date) => ({
  at: d.getTime(),
  day: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
  hour: d.getHours(),
});

/** Save where the five road levels of stage 1-1 are cleared, plus (optionally) the other three World 1 bosses. */
function saveFile(otherBosses: boolean) {
  let t = Date.now() - 2 * 86_400_000;
  const tick = () => stamp(new Date((t += 1000)));
  const events: object[] = CORE_1_1.map((level) => ({
    t: 'test',
    level,
    correct: 9,
    total: 10,
    ms: 1,
    proveIt: true,
    ...tick(),
  }));
  if (otherBosses)
    for (const stage of ['number-systems', 'boolean-logic', 'data-representation'])
      events.push({ t: 'boss', stage, correct: 12, total: 15, ms: 1, ...tick() });
  const path = join(tmpdir(), `csu-boss-${otherBosses}-${Date.now()}.json`);
  writeFileSync(path, JSON.stringify({ app: 'cs-universe', version: 1, exportedAt: 'x', events }));
  return path;
}

async function importSave(page: Page, path: string) {
  await page.goto('/atlas');
  await page.getByRole('button', { name: 'Settings' }).click();
  const dlg = page.getByRole('dialog', { name: 'Settings' });
  await dlg.getByLabel('Import progress file').setInputFiles(path);
  await expect(dlg.getByRole('status')).toContainText('Progress restored');
  await page.keyboard.press('Escape');
}

async function answer(page: Page, right: boolean) {
  const prompt = (await page.locator('form h2').innerText()).trim();
  const item = pool.find((i) => i.prompt === prompt)!;
  expect(item, prompt).toBeTruthy();
  const form = page.locator('form');
  if (item.type === 'mcq' || item.type === 'predict-output') {
    const k = right ? item.answer : (item.answer + 1) % item.options.length;
    await form
      .locator('label.choice')
      .filter({ has: page.getByText(item.options[k]!, { exact: true }) })
      .first()
      .click();
  } else if (item.type === 'spot-the-bug')
    await form
      .locator('label.bug-line')
      .nth(right ? item.answer : (item.answer + 1) % item.lines.length)
      .click();
  else if (item.type === 'numeric')
    await form.getByLabel('YOUR ANSWER').fill(String(right ? item.answer : item.answer + 1));
  else if (item.type === 'order-steps') {
    if (right)
      for (let target = 0; target < item.steps.length; target++) {
        const texts = await form.locator('ol li span.flex-1').allInnerTexts();
        for (let at = texts.indexOf(item.steps[target]!); at > target; at--)
          await form.getByRole('button', { name: `Move "${item.steps[target]}" up` }).click();
      }
  } else if (item.type === 'match')
    for (const [k, p] of item.pairs.entries())
      await form
        .getByRole('combobox')
        .nth(k)
        .selectOption({ label: right ? p.right : item.pairs[(k + 1) % item.pairs.length]!.right });
  await page.getByRole('button', { name: 'Check' }).click();
}

async function fight(page: Page, right: (i: number) => boolean) {
  await page.goto('/boss/information-bits');
  await page.getByRole('button', { name: /^FIGHT/ }).click();
  for (let i = 0; ; i++) {
    await answer(page, right(i));
    const next = page.getByRole('button', { name: /Next question|See results/ });
    const done = (await next.innerText()).includes('See results');
    await next.click();
    if (done) break;
  }
}

test('boss is locked until every road level is cleared', async ({ page }) => {
  await page.goto('/boss/information-bits');
  await expect(page.getByText(/Clear all 5 road levels to open the castle \(0\/5\)/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'FIGHT' })).toBeDisabled();
});

test('losing to the boss lists levels to revisit; beating it fires the stage celebration', async ({ page }) => {
  await importSave(page, saveFile(false));
  await fight(page, () => false);
  await expect(page.getByText('THE CASTLE HOLDS — FOR NOW')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'LEVELS TO REVISIT' })).toBeVisible();
  await page.getByRole('button', { name: 'Try again' }).click();
  for (let i = 0; ; i++) {
    await answer(page, true);
    const next = page.getByRole('button', { name: /Next question|See results/ });
    const done = (await next.innerText()).includes('See results');
    await next.click();
    if (done) break;
  }
  const stage = page.locator('[data-tier="stage"]');
  await expect(stage).toContainText('Information & Bits');
  await expect(stage).toContainText('+650 XP');
  await page.waitForTimeout(700);
  await shot(page, '01-stage-clear');
  await stage.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText('BOSS BEATEN', { exact: true })).toBeVisible();
});

test('the last stage boss completes the world: world celebration first, then stage', async ({ page }) => {
  await importSave(page, saveFile(true));
  await fight(page, () => true);
  const world = page.locator('[data-tier="world"]');
  await expect(world).toContainText('Sunny Shores');
  await expect(world).toContainText('+1,000 XP');
  await page.waitForTimeout(700);
  await shot(page, '02-world-complete');
  await world.getByRole('button', { name: 'Continue' }).click();
  await expect(page.locator('[data-tier="stage"]')).toBeVisible();
  await page.locator('[data-tier="stage"]').getByRole('button', { name: 'Continue' }).click();
  await page.goto('/journey');
  await expect(page.getByText('Island Hopper', { exact: true })).toBeVisible();
  await expect(page.getByText('Completed Sunny Shores')).toBeVisible();
});
