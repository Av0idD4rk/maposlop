import { expect, test } from 'playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.goto('/');
  await expect(page.locator('#ctf-region option')).not.toHaveCount(1);
});

test('раскладывает заданное количество тестовых CTF по регионам', async ({ page }) => {
  await page.getByRole('button', { name: 'Добавить CTF' }).click();
  await page.locator('#demo-count').fill('14');
  await page.getByRole('button', { name: 'Раскидать' }).click();

  await expect(page.locator('#map-stats')).toHaveAttribute('data-flag-count', '14');
  await expect(page.getByRole('status').filter({ hasText: 'Добавлено тестовых CTF: 14' })).toBeVisible();

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ctf-map-events-v1') ?? '[]'));
  expect(saved).toHaveLength(14);
  expect(new Set(saved.map((event: { regionId: string }) => event.regionId)).size).toBeGreaterThan(1);
});

test('не принимает событие, которое заканчивается раньше начала', async ({ page }) => {
  await page.getByRole('button', { name: 'Добавить CTF' }).click();
  await page.locator('#ctf-region').selectOption({ index: 1 });
  await page.locator('#ctf-city').fill('Казань');
  await page.locator('#ctf-name').fill('Broken CTF');
  await page.locator('#ctf-start').fill('2027-04-20T18:00');
  await page.locator('#ctf-end').fill('2027-04-20T17:00');
  await page.getByRole('button', { name: 'Добавить на карту' }).click();

  await expect(page.getByRole('alert')).toHaveText('Окончание должно быть позже начала.');
  await expect(page.locator('#map-stats')).toHaveAttribute('data-flag-count', '0');
});
