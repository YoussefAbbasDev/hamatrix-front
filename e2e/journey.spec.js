import { expect, test } from '@playwright/test';
import {
  apiToken,
  createDevice,
  createProduct,
  deleteInvoice,
  deleteProduct,
  findInvoiceByNumber,
  getProduct,
  getVisitStatus,
  loginUI,
  unique,
} from './helpers.js';

/**
 * Full operator journey through the real UI:
 * device tile → session → pause/resume → product → checkout → invoice → hard delete.
 */
test.describe('visit journey', () => {
  test('runs a full visit and reverses it by deleting the invoice', async ({
    page,
    request,
  }) => {
    await loginUI(page);

    const token = await apiToken(request);
    const device = await createDevice(request, token, {
      name: unique('جهاز رحلة'),
      hourlyPriceMinor: 6000,
      pricingOptions: [
        { key: 'solo', name: 'فردي', pricePerHourMinor: 3000 },
        { key: 'duo', name: 'زوجي', pricePerHourMinor: 4000 },
      ],
    });
    const product = await createProduct(request, token, {
      name: unique('كولا'),
      stockQty: 20,
      sellingPriceMinor: 1500,
      purchasePriceMinor: 700,
    });

    // Dashboard tile → start session with the per-device pricing option.
    await page.goto('/');
    await page.getByRole('button').filter({ hasText: device.name }).click();

    const startDialog = page.getByRole('dialog');
    await expect(startDialog.getByRole('heading', { name: 'بدء جلسة لعب' })).toBeVisible();
    await startDialog.getByLabel('نوع التسعير').selectOption({ index: 1 });
    await startDialog.getByRole('button', { name: 'بدء الجلسة' }).click();

    await page.waitForURL(/\/visits\/[a-f0-9]{24}$/);
    const visitId = page.url().split('/').pop();
    await expect(page.getByText(device.name).first()).toBeVisible();

    // Pause and resume: active time freezes while paused.
    await page.getByRole('button', { name: 'إيقاف مؤقت' }).click();
    await expect(page.getByText('موقوفة').first()).toBeVisible();
    await expect(page.getByText('تم إيقاف الجلسة مؤقتًا')).toBeVisible();

    await page.getByRole('button', { name: 'استئناف' }).click();
    await expect(page.getByText('شغّالة').first()).toBeVisible();

    // Add a product: reserved now, deducted only at checkout.
    await page.getByRole('button').filter({ hasText: product.name }).click();
    await expect(page.getByText(`أُضيف ${product.name}`)).toBeVisible();
    await expect(page.getByText(/1 قطعة/).first()).toBeVisible();

    const beforeCheckout = await getProduct(request, token, product.id);
    expect(beforeCheckout.stockQty).toBe(20);
    expect(beforeCheckout.reservedQty).toBe(1);

    // Checkout with a manual discount.
    await page.getByRole('button', { name: 'تحصيل الزيارة' }).click();
    const checkoutDialog = page.getByRole('dialog');
    await expect(checkoutDialog.getByRole('heading', { name: 'تحصيل الزيارة' })).toBeVisible();
    await checkoutDialog.getByLabel('تعديل يدوي على الإجمالي').fill('-5');
    await checkoutDialog.getByLabel('سبب التعديل (اختياري)').fill('خصم اختبار');
    await checkoutDialog.getByRole('button', { name: 'تأكيد الدفع النقدي' }).click();

    await expect(checkoutDialog.getByText('تم التحصيل')).toBeVisible();
    const invoiceNumber = (
      await checkoutDialog.getByText(/INV-\d{4}-\d+/).first().innerText()
    ).trim();
    expect(invoiceNumber).toMatch(/^INV-\d{4}-\d+$/);
    await checkoutDialog.getByRole('button', { name: 'تم', exact: true }).click();

    const issued = await findInvoiceByNumber(request, token, invoiceNumber);
    expect(issued.adjustmentMinor).toBe(-500);
    expect(issued.adjustmentNote).toBe('خصم اختبار');

    await expect(page.getByText('تم التحصيل').first()).toBeVisible();

    // Stock deducted and reservation released.
    const afterCheckout = await getProduct(request, token, product.id);
    expect(afterCheckout.stockQty).toBe(19);
    expect(afterCheckout.reservedQty).toBe(0);

    // Invoice list shows the issued invoice.
    await page.goto('/invoices');
    const invoiceRow = page.getByRole('row').filter({ hasText: invoiceNumber });
    await expect(invoiceRow).toBeVisible();
    await expect(invoiceRow).toContainText('جلسة');

    // Hard delete restores stock and removes the visit.
    await invoiceRow.getByTitle('حذف').click();
    const deleteDialog = page.getByRole('dialog');
    await expect(
      deleteDialog.getByRole('heading', { name: 'حذف الفاتورة نهائيًا' }),
    ).toBeVisible();
    await deleteDialog.getByRole('textbox').fill(invoiceNumber);
    await deleteDialog.getByRole('button', { name: 'حذف نهائي' }).click();

    await expect(page.getByText('حُذفت الفاتورة وأُعيد المخزون')).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: invoiceNumber })).toHaveCount(0);

    const restored = await getProduct(request, token, product.id);
    expect(restored.stockQty).toBe(20);
    expect(await getVisitStatus(request, token, visitId)).toBe(404);

    // Cleanup the seeded product.
    await deleteProduct(request, token, product.id);
  });
});
