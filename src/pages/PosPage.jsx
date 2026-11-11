import { useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Minus, Plus, Receipt, ShoppingCart, Trash2 } from 'lucide-react';
import { productsApi } from '../api/products.js';
import { salesApi } from '../api/visits.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card, SectionTitle, Badge } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Textarea } from '../components/ui/Select.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { ErrorState } from '../components/ui/States.jsx';
import { ProductBrowser } from '../components/products/ProductBrowser.jsx';
import { apiError } from '../lib/http.js';
import { money } from '../lib/format.js';
import { idempotencyKey } from '../lib/idempotency.js';
import { useToast } from '../providers/ToastProvider.jsx';

export function PosPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [cart, setCart] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [invoice, setInvoice] = useState(null);
  const keyRef = useRef(idempotencyKey());

  const productsQuery = useQuery({
    queryKey: ['products', { limit: 100, isActive: 'true' }],
    queryFn: () => productsApi.list({ limit: 100, isActive: 'true', sort: 'name' }),
  });

  const categoriesQuery = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productsApi.categories.list(),
    staleTime: 5 * 60_000,
  });

  const products = productsQuery.data?.products || [];
  const totalMinor = useMemo(
    () => cart.reduce((sum, line) => sum + line.product.sellingPriceMinor * line.qty, 0),
    [cart],
  );
  const totalQty = cart.reduce((sum, line) => sum + line.qty, 0);

  const qtyOf = (productId) =>
    cart.find((line) => line.product.id === productId)?.qty || 0;

  const addProduct = (product) => {
    setError('');
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.availableQty) return current;
        return current.map((line) =>
          line.product.id === product.id ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      if (product.availableQty < 1) return current;
      return [...current, { product, qty: 1 }];
    });
  };

  const changeQty = (productId, qty) => {
    setCart((current) =>
      current
        .map((line) =>
          line.product.id === productId ? { ...line, qty: Math.max(0, qty) } : line,
        )
        .filter((line) => line.qty > 0),
    );
  };

  const removeLine = (productId) => {
    setCart((current) => current.filter((line) => line.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setPlayerName('');
    setNotes('');
    setError('');
    keyRef.current = idempotencyKey();
  };

  const submit = async () => {
    setError('');
    if (cart.length === 0) {
      setError('أضف منتجًا واحدًا على الأقل');
      return;
    }

    setSubmitting(true);
    try {
      const data = await salesApi.create(
        {
          items: cart.map((line) => ({ productId: line.product.id, qty: line.qty })),
          playerName: playerName.trim(),
          notes: notes.trim(),
        },
        keyRef.current,
      );
      setInvoice(data.invoice);
      toast.success(`تم البيع — ${data.invoice.invoiceNumber}`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
      ]);
      setCart([]);
      setNotes('');
      setPlayerName('');
      keyRef.current = idempotencyKey();
    } catch (saleError) {
      setError(apiError(saleError).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="بيع سريع"
        subtitle="بيع منتجات بدون جلسة لعب — دفع نقدي ويُخصم المخزون فورًا."
        action={
          cart.length > 0 ? (
            <Button variant="ghost" onClick={clearCart} disabled={submitting}>
              <Trash2 size={15} />
              تفريغ السلة
            </Button>
          ) : null
        }
      />

      {productsQuery.isError ? (
        <ErrorState
          message={apiError(productsQuery.error).message}
          onRetry={() => productsQuery.refetch()}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <Card className="p-4">
            <SectionTitle
              title="المنتجات"
              description="اضغط على المنتج لإضافته إلى السلة."
              action={<Badge tone="neutral">{products.length} منتج</Badge>}
            />
            <div className="mt-3">
              <ProductBrowser
                products={products}
                categories={categoriesQuery.data || []}
                loading={productsQuery.isLoading}
                onPick={addProduct}
                canPick={(product) => product.availableQty > qtyOf(product.id)}
                emptyTitle="لا منتجات متاحة"
                emptyDescription="أضف منتجات أو ورّد مخزونًا أولًا."
              />
            </div>
          </Card>

          <Card className="flex flex-col p-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
            <SectionTitle
              title="السلة"
              description={`${totalQty} قطعة في ${cart.length} بند`}
              action={<ShoppingCart size={17} className="text-muted" />}
            />

            <div className="mt-3 min-h-[90px] flex-1 space-y-1.5 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="flex h-full min-h-[110px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line/70 px-4 py-8 text-center">
                  <ShoppingCart size={20} className="text-muted/60" />
                  <p className="text-[12.5px] text-muted">السلة فارغة</p>
                </div>
              ) : (
                cart.map((line) => (
                  <div
                    key={line.product.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-line/70 bg-surface2/40 px-2.5 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-ink">
                        {line.product.name}
                      </p>
                      <p className="font-mono text-[10.5px] text-muted">
                        {money(line.product.sellingPriceMinor)} × {line.qty}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center rounded-lg border border-line/70">
                        <button
                          type="button"
                          onClick={() => changeQty(line.product.id, line.qty - 1)}
                          className="px-1.5 py-1 text-muted hover:text-ink"
                          aria-label="تقليل"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="min-w-6 text-center font-mono text-[11.5px] text-ink">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQty(line.product.id, line.qty + 1)}
                          disabled={line.qty >= line.product.availableQty}
                          className="px-1.5 py-1 text-muted hover:text-ink disabled:opacity-40"
                          aria-label="زيادة"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="min-w-14 text-left font-mono text-[11.5px] font-semibold text-ink">
                        {money(line.product.sellingPriceMinor * line.qty)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeLine(line.product.id)}
                        className="text-muted hover:text-danger"
                        aria-label="حذف"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 space-y-2.5 border-t border-line/60 pt-3">
              <Input
                label="اسم العميل (اختياري)"
                placeholder="اسم للفاتورة"
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                maxLength={80}
              />
              <Textarea
                label="ملاحظات (اختياري)"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                maxLength={300}
              />

              <div className="flex items-center justify-between rounded-lg bg-surface2/60 px-3 py-2.5">
                <span className="text-[12.5px] text-muted">الإجمالي</span>
                <span className="font-mono text-xl font-semibold text-accent">
                  {money(totalMinor)}
                </span>
              </div>

              {error && (
                <p className="rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-1.5 text-[11.5px] text-danger">
                  {error}
                </p>
              )}

              <Button
                className="w-full"
                size="lg"
                disabled={cart.length === 0}
                loading={submitting}
                onClick={submit}
              >
                <Receipt size={17} />
                تحصيل نقدي
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Modal
        open={Boolean(invoice)}
        onClose={() => setInvoice(null)}
        title="تم البيع"
        description="تم خصم الكميات من المخزون وإصدار الفاتورة."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setInvoice(null)}>
              إغلاق
            </Button>
            <Button onClick={() => setInvoice(null)}>بيع جديد</Button>
          </>
        }
      >
        {invoice && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-success/25 bg-success/5 px-4 py-6 text-center">
            <CheckCircle2 size={34} className="text-success" />
            <p className="font-mono text-[13px] text-muted">{invoice.invoiceNumber}</p>
            <p className="font-mono text-3xl font-semibold text-ink">
              {money(invoice.totalMinor)}
            </p>
            <p className="text-[11.5px] text-muted">
              {invoice.lines?.length || 0} بند · دفع نقدي
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
