import { expect, test } from '@playwright/test';
import {
  apiToken,
  createProduct,
  createQuickSale,
  deleteInvoice,
  deleteProduct,
  loginUI,
  unique,
} from './helpers.js';

test.describe('records', () => {
  test('shows the operations timeline and exports it as CSV', async ({ page, request }) => {
    await loginUI(page);

    const token = await apiToken(request);
    const product = await createProduct(request, token, {
      name: unique('سجل منتج'),
      stockQty: 5,
      sellingPriceMinor: 1000,
      purchasePriceMinor: 400,
    });
    const invoice = await createQuickSale(
      request,
      token,
      [{ productId: product.id, qty: 2 }],
      { playerName: unique('عميل سجل') },
    );

    await page.goto('/records');

    // Default mode is "اليوم" and must load the summary without a validation
    // error (the day filter sends `date` to every range report).
    await expect(page.getByText('الإيراد', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('بيانات غير صحيحة')).toHaveCount(0);

    await page.getByRole('button', { name: 'الكل', exact: true }).click();

    await expect(page.getByText(`بيع سريع ${invoice.invoiceNumber}`)).toBeVisible();
    await expect(page.getByText('سجل العمليات')).toBeVisible();
    await expect(page.getByText('الإيراد', { exact: true }).first()).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'تصدير CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^hamatrix-records-.*\.csv$/);

    // Cleanup the seeded sale and product.
    await deleteInvoice(request, token, invoice);
    await deleteProduct(request, token, product.id);
  });
});
