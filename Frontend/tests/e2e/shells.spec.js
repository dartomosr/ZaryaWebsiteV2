import { test, expect } from '@playwright/test';
for (const width of [320, 768, 1024, 1440]) {
  test('Публичная оболочка при ширине ' + width, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('http://127.0.0.1:5173');
    await expect(page.getByRole('heading', { name: 'ЗАРЯ: Марш Революции' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
for (const port of [5174, 5175]) {
  test('Закрытая оболочка ' + port, async ({ page }) => {
    await page.goto('http://127.0.0.1:' + port);
    await expect(page.getByRole('heading', { name: 'Доступ пока недоступен' })).toBeVisible();
    await expect(page.getByRole('button')).toHaveCount(0);
  });
}
