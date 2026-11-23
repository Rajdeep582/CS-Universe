import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { parse } from 'yaml';
import type { Item } from '../../src/engine/lesson/schema';

const SHOTS = process.env.SHOTS_DIR;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, animations: 'disabled' });
};
const LEVEL = 'what-is-computer';
const pool = (
  parse(readFileSync(`content/worlds/01-origins/01-information-bits/levels/${LEVEL}/test.yaml`, 'utf8')) as {
    items: Item[];
  }
).items;

async function studyAll(page: Page) {
  await page.goto(`/play/${LEVEL}`);
  await expect(page.getByRole('heading', { level: 1, name: 'One idea, a billion machines' })).toBeVisible();
  for (;;) {
    const next = page.getByRole('button', { name: 'Next step' });
    if (!(await next.isVisible())) break;
    await next.click();
  }
}

/** Answers the current question correctly (or deliberately wrongly) using the source pool. */
async function answer(page: Page, right: boolean) {
  const prompt = (await page.locator('form h2').innerText()).trim();
  const item = pool.find((i) => i.prompt === prompt)!;
  expect(item, `unknown prompt: ${prompt}`).toBeTruthy();
  const form = page.locator('form');
  switch (item.type) {
    case 'mcq':
    case 'predict-output': {
      const pick = right ? item.answer : (item.answer + 1) % item.options.length;
      await form.locator('label.choice', { hasText: item.options[pick]! }).first().click();
      break;
    }
    case 'spot-the-bug':
      await form
        .locator('label.bug-line')
        .nth(right ? item.answer : (item.answer + 1) % item.lines.length)
        .click();
      break;
    case 'numeric':
      await form.getByLabel('YOUR ANSWER').fill(String(right ? item.answer : item.answer + 1));
      break;
    case 'order-steps':
      if (right)
        for (let target = 0; target < item.steps.length; target++) {
          const texts = await form.locator('ol li span.flex-1').allInnerTexts();
          for (let at = texts.indexOf(item.steps[target]!); at > target; at--)
            await form.getByRole('button', { name: `Move "${item.steps[target]}" up` }).click();
        }
      break;
    case 'match':
      for (const [k, p] of item.pairs.entries()) {
        const want = right ? p.right : item.pairs[(k + 1) % item.pairs.length]!.right;
        await form.getByRole('combobox').nth(k).selectOption({ label: want });
      }
      break;
  }
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByRole('status').filter({ hasText: right ? 'Correct' : 'Not quite' })).toBeVisible();
}

async function runTest(page: Page, right: (i: number) => boolean) {
  for (let i = 0; ; i++) {
    await answer(page, right(i));
    const next = page.getByRole('button', { name: /Next question|See results/ });
    const done = (await next.innerText()).includes('See results');
    await next.click();
    if (done) break;
  }
}

test('lesson chamber: steps, maths, code, simulation goal, ← → keys', async ({ page }) => {
  await page.goto(`/play/${LEVEL}`);
  await expect(page.getByRole('navigation', { name: 'Lesson steps' }).getByRole('button')).toHaveCount(13); // 12 steps + test
  await expect(page.getByRole('button', { name: /Level test/ })).toBeDisabled();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('heading', { level: 1, name: 'Input, processing, output — and memory' })).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('heading', { level: 1, name: 'One idea, a billion machines' })).toBeVisible();
  await page.getByRole('button', { name: /The parts, precisely/ }).click();
  await expect(page.locator('.lesson .katex-display')).toBeVisible();
  await page.getByRole('button', { name: /Watch the Tiny Machine/ }).click();
  const sim = page.getByRole('figure', { name: /Tiny Machine/ });
  await expect(sim).toContainText('Fetch: read the instruction at address 0');
  await sim.getByLabel('Input value at address 6').fill('4');
  await sim.getByLabel('Input value at address 7').fill('6');
  await sim.getByRole('button', { name: 'Step forward' }).click();
  await expect(sim).toContainText('Decode: LOAD 6');
  await sim.getByRole('slider', { name: 'Machine timeline' }).press('End');
  await expect(sim).toContainText('Halted. Output: 10.');
  await expect(sim).toContainText('Goal reached · +20 XP');
  await shot(page, '01-lesson-simulation');
  await page.getByRole('button', { name: /Tracing the program by hand/ }).click();
  await expect(page.locator('.lesson pre.shiki')).toBeVisible();
  await shot(page, '02-lesson-worked-example');
});

test('level test: perfect score clears the level with ★★ and opens new levels', async ({ page }) => {
  await studyAll(page);
  await page.getByRole('button', { name: 'Take the level test' }).click();
  await expect(page.getByText('LEVEL TEST · ATTEMPT 1')).toBeVisible();
  await shot(page, '03-test-question');
  await runTest(page, () => true);
  await expect(page.getByText('LEVEL CLEARED', { exact: true })).toBeVisible();
  await expect(page.getByText('10 of 10 correct · 100 %')).toBeVisible();
  await expect(page.getByText('+175 XP')).toBeVisible(); // 10×10 + 50 clear + 25 second star
  await expect(page.getByRole('heading', { name: /NEW LEVELS OPEN/ })).toBeVisible();
  await shot(page, '04-level-clear');
  // The cleared level now shows on the map, and its replay entry is offered.
  await page.getByRole('link', { name: /Back to Sunny Shores/ }).click();
  await expect(page).toHaveURL(/\/world\/origins\/information-bits\?level=what-is-computer/);
});

test('level test: failing lists the steps to revisit and does not clear', async ({ page }) => {
  await studyAll(page);
  await page.getByRole('button', { name: 'Take the level test' }).click();
  await runTest(page, (i) => i < 6);
  await expect(page.getByText('NOT CLEARED YET', { exact: true })).toBeVisible();
  await expect(page.getByText(/6 of 10 correct · 60 %/)).toBeVisible();
  const review = page.getByRole('heading', { name: 'REVISIT THESE STEPS' }).locator('..');
  const first = review.getByRole('button').first();
  const title = await first.innerText();
  await first.click();
  await expect(page.getByRole('heading', { level: 1, name: title.trim() })).toBeVisible();
});

test('locked levels cannot be played', async ({ page }) => {
  await page.goto('/play/bytes-words');
  await expect(page.getByRole('heading', { name: /is locked/ })).toBeVisible();
});

test('page-replacement simulation matches Silberschatz: LRU 12, FIFO 15, OPT 9 faults', async ({ page }) => {
  await page.goto('/gallery');
  const sim = page.getByRole('figure', { name: /Page replacement/ });
  await sim.getByRole('slider', { name: 'Reference timeline' }).press('End');
  await expect(sim).toContainText('of 12 total');
  await sim.getByText('FIFO', { exact: true }).click();
  await expect(sim).toContainText('of 15 total');
  await sim.getByText('OPT', { exact: true }).click();
  await expect(sim).toContainText('of 9 total');
  await shot(page, '05-page-replacement');
});
