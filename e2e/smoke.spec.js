import { expect, test } from '@playwright/test';
import { loginUI } from './helpers.js';

const PAGES = [
  { path: '/', title: 'الرئيسية' },
  { path: '/devices', title: 'الأجهزة' },
  { path: '/visits', title: 'الزيارات' },
  { path: '/pos', title: 'بيع سريع' },
  { path: '/products', title: 'المنتجات' },
  { path: '/inventory', title: 'المخزون' },
  { path: '/invoices', title: 'الفواتير' },
  { path: '/expenses', title: 'المصروفات' },
  { path: '/records', title: 'السجلات' },
  { path: '/settings', title: 'الإعدادات' },
];

test.describe('shell smoke', () => {
  test('every route renders without runtime errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await loginUI(page);

    for (const item of PAGES) {
      await page.goto(item.path);
      await expect(page.getByRole('heading', { name: item.title }).first()).toBeVisible();
      await expect(page.locator('#main-content')).toBeVisible();
    }

    // The skip link is the first stop for keyboard users.
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'الرئيسية' })).toBeVisible();
    await page.evaluate(() => {
      document.body.tabIndex = -1;
      document.body.focus();
    });
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: 'تخطَّ إلى المحتوى' });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();

    expect(errors).toEqual([]);
  });
});
