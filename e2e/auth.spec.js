import { expect, test } from '@playwright/test';
import { ADMIN, loginUI, unique } from './helpers.js';

test.describe('authentication', () => {
  test('redirects unauthenticated visitors to the login screen', async ({ page }) => {
    await page.goto('/devices');

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'تسجيل الدخول' })).toBeVisible();
  });

  test('shows a clear error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('اسم المستخدم').fill(unique('ghost'));
    await page.getByLabel('كلمة المرور').fill('wrong-password');
    await page.getByRole('button', { name: 'دخول', exact: true }).click();

    await expect(page.getByText('اسم المستخدم أو كلمة المرور غير صحيحة')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('signs in and out through the real forms', async ({ page }) => {
    await loginUI(page);

    await expect(page.getByRole('heading', { name: 'الرئيسية' })).toBeVisible();
    await expect(page.getByText(`@${ADMIN.username}`).first()).toBeVisible();

    await page.getByRole('button', { name: 'تسجيل الخروج' }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'تسجيل الدخول' })).toBeVisible();
  });
});
