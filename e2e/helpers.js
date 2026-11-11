import { expect } from '@playwright/test';

export const ADMIN = { username: 'admin', password: '123456' };

export function unique(prefix = 'e2e') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 6)}`;
}

/** Signs in through the real login form and waits for the dashboard. */
export async function loginUI(page) {
  await page.goto('/login');
  await page.getByLabel('اسم المستخدم').fill(ADMIN.username);
  await page.getByLabel('كلمة المرور').fill(ADMIN.password);
  await page.getByRole('button', { name: 'دخول' }).click();
  await expect(page).toHaveURL(/\/$|\/\?/);
}

/** Returns an access token for API seeding inside a test. */
export async function apiToken(request) {
  const response = await request.post('/api/v1/auth/login', { data: ADMIN });
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return payload.data.accessToken;
}

export function apiHeaders(token) {
  return { authorization: `Bearer ${token}` };
}

export async function createDevice(request, token, overrides = {}) {
  const response = await request.post('/api/v1/devices', {
    headers: apiHeaders(token),
    data: {
      name: unique('جهاز'),
      type: 'PC',
      hourlyPriceMinor: 6000,
      ...overrides,
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data.device;
}

export async function createProduct(request, token, overrides = {}) {
  const response = await request.post('/api/v1/products', {
    headers: apiHeaders(token),
    data: {
      name: unique('منتج'),
      sellingPriceMinor: 1500,
      purchasePriceMinor: 700,
      stockQty: 20,
      minStockQty: 2,
      ...overrides,
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data.product;
}

export async function getProduct(request, token, id) {
  const response = await request.get(`/api/v1/products/${id}`, {
    headers: apiHeaders(token),
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data.product;
}

/** Reads a number rendered by an Arabic-aware money formatter without currency. */
export function moneyDigits(text) {
  return Number(String(text).replace(/[^\d.]/g, ''));
}

export async function deleteInvoice(request, token, invoice) {
  const response = await request.delete(`/api/v1/invoices/${invoice.id}`, {
    headers: apiHeaders(token),
    data: { confirmInvoiceNumber: invoice.invoiceNumber },
  });
  expect(response.status()).toBe(204);
}

export async function deleteProduct(request, token, id) {
  const response = await request.delete(`/api/v1/products/${id}`, {
    headers: apiHeaders(token),
  });
  expect(response.status()).toBe(204);
}

export async function createQuickSale(request, token, items, extra = {}) {
  const response = await request.post('/api/v1/sales', {
    headers: {
      ...apiHeaders(token),
      'Idempotency-Key': `e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    },
    data: { items, ...extra },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data.invoice;
}

export async function getVisitStatus(request, token, id) {
  const response = await request.get(`/api/v1/visits/${id}`, {
    headers: apiHeaders(token),
  });
  return response.status();
}

/** Finds an invoice by its human number through the list endpoint. */
export async function findInvoiceByNumber(request, token, invoiceNumber) {
  const response = await request.get(
    `/api/v1/invoices?q=${encodeURIComponent(invoiceNumber)}&limit=20`,
    { headers: apiHeaders(token) },
  );
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const invoice = (payload.data.invoices || []).find(
    (row) => row.invoiceNumber === invoiceNumber,
  );
  expect(invoice, `invoice ${invoiceNumber} should exist`).toBeTruthy();
  return invoice;
}
