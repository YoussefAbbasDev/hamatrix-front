import { expect, test } from '@playwright/test';
import {
  apiToken,
  createProduct,
  deleteInvoice,
  deleteProduct,
  findInvoiceByNumber,
  getProduct,
  loginUI,
  unique,
} from './helpers.js';

test.describe('quick sale', () => {
  test('sells products without a session and deducts stock immediately', async ({
    page,
    request,
  }) => {
    await loginUI(page);

    const token = await apiToken(request);
    const product = await createProduct(request, token, {
      name: unique('مشروب سريع'),
      stockQty: 10,
      sellingPriceMinor: 1500,
      purchasePriceMinor: 600,
    });

    await page.goto('/pos');
    await page.getByRole('button').filter({ hasText: product.name }).click();

    await expect(page.getByText(/1 قطعة في 1 بند/)).toBeVisible();
    await page.getByRole('button', { name: 'تحصيل نقدي' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: 'تم البيع' })).toBeVisible();
    const invoiceNumber = (
      await dialog.getByText(/INV-\d{4}-\d+/).first().innerText()
    ).trim();
    expect(invoiceNumber).toMatch(/^INV-\d{4}-\d+$/);
    await expect(dialog.getByText('15.00').first()).toBeVisible();
    await dialog.getByRole('button', { name: 'بيع جديد' }).click();

    const afterSale = await getProduct(request, token, product.id);
    expect(afterSale.stockQty).toBe(9);

    // Cleanup: deleting the invoice restores stock, then remove the product.
    const invoice = await findInvoiceByNumber(request, token, invoiceNumber);
    await deleteInvoice(request, token, invoice);
    await deleteProduct(request, token, product.id);
  });
});
