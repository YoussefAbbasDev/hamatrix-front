import { expect, test } from '@playwright/test';
import { loginUI, unique } from './helpers.js';

test.describe('devices', () => {
  test('creates a device, parks it in maintenance, then deletes it', async ({ page }) => {
    await loginUI(page);

    const name = unique('جهاز E2E');
    await page.goto('/devices');
    await page.getByRole('button', { name: 'إضافة جهاز' }).first().click();

    const form = page.getByRole('dialog');
    await expect(form.getByRole('heading', { name: 'إضافة جهاز' })).toBeVisible();
    await form.getByLabel('اسم الجهاز').fill(name);
    await form.getByLabel('سعر الساعة الأساسي').fill('45');
    await form.getByRole('button', { name: 'حفظ' }).click();

    await expect(page.getByText('تمت إضافة الجهاز')).toBeVisible();

    const row = page.getByRole('row').filter({ hasText: name });
    await expect(row).toBeVisible();
    await expect(row).toContainText('45.00');
    await expect(row).toContainText('متاح');

    // Maintenance round-trip.
    await row.getByTitle('بدء الصيانة').click();
    const maintenanceDialog = page.getByRole('dialog');
    await expect(maintenanceDialog.getByText('بدء صيانة')).toBeVisible();
    await maintenanceDialog.getByRole('button', { name: 'بدء الصيانة' }).click();

    await expect(page.getByText('تم تحويل الجهاز للصيانة')).toBeVisible();
    await expect(row).toContainText('صيانة');

    await row.getByTitle('إنهاء الصيانة').click();
    await expect(page.getByText('تم إنهاء الصيانة')).toBeVisible();
    await expect(row).toContainText('متاح');

    // Hard delete.
    await row.getByTitle('حذف').click();
    const deleteDialog = page.getByRole('dialog');
    await expect(deleteDialog.getByRole('heading', { name: 'حذف الجهاز' })).toBeVisible();
    await deleteDialog.getByRole('button', { name: 'حذف', exact: true }).click();

    await expect(page.getByText('تم حذف الجهاز')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: name })).toHaveCount(0);
  });
});
