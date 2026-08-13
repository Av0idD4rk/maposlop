import { expect, test } from '@playwright/test';
import { PNG } from 'pngjs';

test('loads a nonblank map and opens city travel tools', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  const eventsResponse = page.waitForResponse((response) => response.url().endsWith('/api/v1/events/'));
  await page.goto('/#region=66');
  expect((await eventsResponse).ok()).toBe(true);

  await page.getByRole('button', { name: 'События' }).click();
  const catalog = page.getByRole('dialog', { name: 'Все события' });
  await expect(catalog).toBeVisible();
  await catalog.getByRole('searchbox').fill('Новосибирск');
  await expect(catalog.getByText('Siberia Attack & Defense')).toBeVisible();
  await expect(catalog.getByText('Ural CTF')).toHaveCount(0);
  await catalog.getByRole('button', { name: 'Закрыть' }).click();
  await expect(catalog).not.toBeVisible();

  const canvas = page.locator('.map-stage__canvas');
  await expect(canvas).toBeVisible();
  await expect(page.locator('.event-marker--split')).toHaveCount(1, { timeout: 15_000 });
  expect(await page.locator('.event-marker').count()).toBeGreaterThanOrEqual(3);
  await expect(page.locator('#panel-title')).toHaveText('Свердловская область');

  const screenshot = PNG.sync.read(await canvas.screenshot());
  let mapPixels = 0;
  for (let index = 0; index < screenshot.data.length; index += 4) {
    const red = screenshot.data[index];
    const green = screenshot.data[index + 1];
    const blue = screenshot.data[index + 2];
    if (blue > 100 && blue > red * 1.35 && green > red * 1.2) mapPixels += 1;
  }
  expect(mapPixels).toBeGreaterThan(screenshot.width * screenshot.height * 0.04);

  const eventMarker = page.locator('.event-marker--split').first();
  await expect(eventMarker).toBeVisible({ timeout: 15_000 });
  await eventMarker.click();

  const dialog = page.locator('dialog[open]');
  await expect(dialog.getByRole('heading', { name: 'Ural CTF' })).toBeVisible();
  await expect(dialog.getByRole('heading', { name: 'Спланировать поездку' })).toBeVisible();
  for (const name of ['Отели', 'Маршрут', 'Еда рядом']) {
    const link = dialog.getByRole('link', { name });
    await expect(link).toHaveAttribute('href', /^https:\/\/yandex\.ru\/maps\//);
    await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }

  expect(consoleErrors).toEqual([]);
});
