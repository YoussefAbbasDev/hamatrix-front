import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Boxes,
  ClipboardList,
  PackagePlus,
  RefreshCw,
  Scale,
  TrendingDown,
  Warehouse,
} from 'lucide-react';
import { inventoryApi } from '../api/inventory.js';
import { productsApi } from '../api/products.js';
import { PageHeader, EmptyState } from '../components/ui/PageHeader.jsx';
import { Card, SectionTitle, Badge } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Select, Textarea } from '../components/ui/Select.jsx';
import { MoneyInput } from '../components/ui/MoneyInput.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { StatCard } from '../components/ui/StatCard.jsx';
import { LoadingRows, ErrorState } from '../components/ui/States.jsx';
import { MovementTypeBadge } from '../components/common/StatusBadge.jsx';
import { apiError } from '../lib/http.js';
import { dateTimeOf, money } from '../lib/format.js';
import { idempotencyKey } from '../lib/idempotency.js';
import { useToast } from '../providers/ToastProvider.jsx';
import { cn } from '../lib/cn.js';

const MOVEMENT_TYPES = [
  { value: 'purchase', label: 'توريد' },
  { value: 'sale', label: 'بيع' },
  { value: 'adjustment', label: 'تسوية' },
  { value: 'damage', label: 'تالف' },
  { value: 'waste', label: 'هالك' },
  { value: 'initial', label: 'رصيد افتتاحي' },
];

function StockInModal({ open, onClose, products, onSaved }) {
  const toast = useToast();
  const keyRef = useRef(idempotencyKey());
  const [form, setForm] = useState({
    productId: '',
    qty: 1,
    unitCostMinor: 0,
    supplierName: '',
    note: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    keyRef.current = idempotencyKey();
    setError('');
    setForm({ productId: '', qty: 1, unitCostMinor: 0, supplierName: '', note: '' });
  }, [open]);

  const product = products.find((item) => item.id === form.productId);
  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const chooseProduct = (event) => {
    const id = event.target.value;
    const selected = products.find((item) => item.id === id);
    setForm((current) => ({
      ...current,
      productId: id,
      unitCostMinor: selected?.purchasePriceMinor || 0,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.productId) {
      setError('اختر المنتج');
      return;
    }
    const qty = Number(form.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      setError('الكمية يجب أن تكون عددًا صحيحًا أكبر من صفر');
      return;
    }

    setSaving(true);
    try {
      await inventoryApi.stockIn(
        {
          productId: form.productId,
          qty,
          unitCostMinor: Number(form.unitCostMinor) || 0,
          supplierName: form.supplierName.trim(),
          note: form.note.trim(),
        },
        keyRef.current,
      );
      toast.success('تم توريد المخزون');
      onSaved?.();
      onClose();
    } catch (stockError) {
      setError(apiError(stockError).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="توريد مخزون"
      description="تزيد الكمية فورًا وتُحدّث آخر سعر شراء للمنتج."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button type="submit" form="stock-in-form" loading={saving}>
            توريد
          </Button>
        </>
      }
    >
      <form id="stock-in-form" onSubmit={submit} className="space-y-3.5">
        <Select label="المنتج" value={form.productId} onChange={chooseProduct}>
          <option value="">اختر منتجًا</option>
          {products.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — المتاح {item.stockQty}
            </option>
          ))}
        </Select>

        {product && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line/70 bg-surface2/40 px-3 py-2 text-[11.5px]">
            <span className="text-muted">
              المخزون الحالي: <span className="font-mono text-ink">{product.stockQty}</span>
            </span>
            <span className="text-muted">
              آخر سعر شراء:{' '}
              <span className="font-mono text-ink">{money(product.purchasePriceMinor)}</span>
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="الكمية"
            type="number"
            min={1}
            dir="ltr"
            className="text-left font-mono"
            value={form.qty}
            onChange={set('qty')}
          />
          <MoneyInput
            label="سعر الشراء للوحدة"
            value={form.unitCostMinor}
            onChange={(value) =>
              setForm((current) => ({ ...current, unitCostMinor: value }))
            }
          />
        </div>

        <Input
          label="اسم المورد (اختياري)"
          value={form.supplierName}
          onChange={set('supplierName')}
          maxLength={120}
        />
        <Textarea
          label="ملاحظات (اختياري)"
          rows={2}
          value={form.note}
          onChange={set('note')}
          maxLength={300}
        />

        {form.productId && form.qty > 0 && (
          <p className="text-[11.5px] text-muted">
            إجمالي قيمة التوريد:{' '}
            <span className="font-mono text-ink">
              {money((Number(form.qty) || 0) * (Number(form.unitCostMinor) || 0))}
            </span>
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

function AdjustmentModal({ open, onClose, products, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    productId: '',
    type: 'adjustment',
    direction: 'out',
    qty: 1,
    reason: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm({ productId: '', type: 'adjustment', direction: 'out', qty: 1, reason: '' });
  }, [open]);

  const product = products.find((item) => item.id === form.productId);
  const forcedOut = form.type === 'damage' || form.type === 'waste';
  const direction = forcedOut ? 'out' : form.direction;
  const qtyDelta = direction === 'out' ? -Math.abs(Number(form.qty) || 0) : Math.abs(Number(form.qty) || 0);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.productId) {
      setError('اختر المنتج');
      return;
    }
    if (!qtyDelta) {
      setError('أدخل كمية أكبر من صفر');
      return;
    }
    if (!form.reason.trim()) {
      setError('سبب التسوية مطلوب');
      return;
    }

    setSaving(true);
    try {
      await inventoryApi.adjust({
        productId: form.productId,
        qtyDelta,
        type: form.type,
        reason: form.reason.trim(),
      });
      toast.success('تم تسجيل تسوية المخزون');
      onSaved?.();
      onClose();
    } catch (adjustError) {
      setError(apiError(adjustError).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تسوية مخزون"
      description="سجّل تالفًا أو هالكًا أو فرق جرد. لا يمكن أن يصبح المخزون سالبًا."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button type="submit" form="adjust-form" loading={saving}>
            تسجيل
          </Button>
        </>
      }
    >
      <form id="adjust-form" onSubmit={submit} className="space-y-3.5">
        <Select
          label="المنتج"
          value={form.productId}
          onChange={(event) =>
            setForm((current) => ({ ...current, productId: event.target.value }))
          }
        >
          <option value="">اختر منتجًا</option>
          {products.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — المخزون {item.stockQty}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="نوع التسوية"
            value={form.type}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                type: event.target.value,
                direction:
                  event.target.value === 'damage' || event.target.value === 'waste'
                    ? 'out'
                    : current.direction,
              }))
            }
          >
            <option value="adjustment">تسوية جرد</option>
            <option value="damage">تالف</option>
            <option value="waste">هالك</option>
          </Select>
          <Select
            label="الاتجاه"
            value={direction}
            onChange={(event) =>
              setForm((current) => ({ ...current, direction: event.target.value }))
            }
            disabled={forcedOut}
          >
            <option value="out">خصم من المخزون</option>
            <option value="in">إضافة للمخزون</option>
          </Select>
        </div>

        <Input
          label="الكمية"
          type="number"
          min={1}
          dir="ltr"
          className="text-left font-mono"
          value={form.qty}
          onChange={(event) =>
            setForm((current) => ({ ...current, qty: event.target.value }))
          }
        />

        {product && (
          <p className="text-[11.5px] text-muted">
            المخزون بعد التسوية:{' '}
            <span className="font-mono text-ink">{product.stockQty + qtyDelta}</span>
          </p>
        )}

        <Textarea
          label="سبب التسوية"
          rows={2}
          value={form.reason}
          onChange={(event) =>
            setForm((current) => ({ ...current, reason: event.target.value }))
          }
          maxLength={300}
          placeholder="جرد شهري، كسر أثناء التخزين…"
        />

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}

export function InventoryPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('movements');
  const [productId, setProductId] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const [stockInOpen, setStockInOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [productId, type]);

  const summaryQuery = useQuery({
    queryKey: ['inventory', 'summary'],
    queryFn: () => inventoryApi.summary(),
    refetchInterval: 60_000,
  });

  const valuationQuery = useQuery({
    queryKey: ['inventory', 'valuation'],
    queryFn: inventoryApi.valuation,
    enabled: tab === 'valuation',
  });

  const productsQuery = useQuery({
    queryKey: ['products', { limit: 100, sort: 'name' }],
    queryFn: () => productsApi.list({ limit: 100, sort: 'name' }),
  });

  const movementsQuery = useQuery({
    queryKey: ['inventory', 'movements', { page, productId, type }],
    queryFn: () =>
      inventoryApi.movements({
        page,
        limit: 20,
        ...(productId ? { productId } : {}),
        ...(type ? { type } : {}),
      }),
    enabled: tab === 'movements',
  });

  const products = productsQuery.data?.products || [];
  const summary = summaryQuery.data;
  const movements = movementsQuery.data?.movements || [];
  const valuation = valuationQuery.data;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const error = summaryQuery.error || movementsQuery.error || productsQuery.error;

  return (
    <div className="space-y-5">
      <PageHeader
        title="المخزون"
        subtitle="توريد، تسويات، حركات، وتقييم المخزون بسعر التكلفة."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setAdjustOpen(true)}>
              <Scale size={16} />
              تسوية
            </Button>
            <Button onClick={() => setStockInOpen(true)}>
              <PackagePlus size={16} />
              توريد مخزون
            </Button>
          </div>
        }
      />

      {error ? (
        <ErrorState
          message={apiError(error).message}
          onRetry={() => {
            summaryQuery.refetch();
            movementsQuery.refetch();
            productsQuery.refetch();
          }}
        />
      ) : summaryQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-[104px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="قيمة المخزون (تكلفة)"
            value={money(summary.inventoryValueMinor)}
            hint={`${summary.totalUnits} وحدة`}
            icon={Warehouse}
            tone="accent"
          />
          <StatCard
            label="عدد المنتجات"
            value={summary.productCount}
            icon={Boxes}
            tone="neutral"
          />
          <StatCard
            label="مخزون منخفض"
            value={summary.lowStockCount}
            hint="وصل حد التنبيه"
            icon={TrendingDown}
            tone="warning"
          />
          <StatCard
            label="نافد"
            value={summary.outOfStockCount}
            hint="بحاجة لتوريد"
            icon={ClipboardList}
            tone={(summary.outOfStockCount || 0) > 0 ? 'danger' : 'success'}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: 'movements', label: 'حركات المخزون' },
          { value: 'valuation', label: 'التقييم' },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={cn(
              'rounded-lg border px-3 py-2 text-[12.5px] font-medium transition',
              tab === item.value
                ? 'border-accent/40 bg-accent/10 text-accent'
                : 'border-line/70 bg-surface2/40 text-muted hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'movements' ? (
        <>
          <Card className="p-3.5">
            <div className="flex flex-wrap items-end gap-2.5">
              <Select
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                containerClassName="min-w-[190px] flex-1"
                aria-label="المنتج"
              >
                <option value="">كل المنتجات</option>
                {products.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </Select>
              <Select
                value={type}
                onChange={(event) => setType(event.target.value)}
                containerClassName="w-40"
                aria-label="النوع"
              >
                <option value="">كل الأنواع</option>
                {MOVEMENT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => movementsQuery.refetch()}
              >
                <RefreshCw size={15} />
              </Button>
            </div>
          </Card>

          {movementsQuery.isLoading ? (
            <LoadingRows rows={5} />
          ) : movements.length === 0 ? (
            <EmptyState
              icon={Boxes}
              title="لا حركات مخزون"
              description="ستظهر هنا كل عمليات التوريد والبيع والتسوية."
            />
          ) : (
            <>
              <div className="table-shell overflow-x-auto">
                <table className="w-full min-w-[800px] text-right text-[12.5px]">
                  <thead className="bg-surface2/60 text-[11px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">التاريخ</th>
                      <th className="px-4 py-3 font-medium">المنتج</th>
                      <th className="px-4 py-3 font-medium">النوع</th>
                      <th className="px-4 py-3 font-medium">الكمية</th>
                      <th className="px-4 py-3 font-medium">الرصيد</th>
                      <th className="px-4 py-3 font-medium">تكلفة الوحدة</th>
                      <th className="px-4 py-3 font-medium">المورد / ملاحظة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((movement) => (
                      <tr
                        key={movement.id}
                        className="border-t border-line/60 hover:bg-surface2/30"
                      >
                        <td className="px-4 py-3 text-muted">{dateTimeOf(movement.createdAt)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{movement.product?.name}</p>
                          <p className="font-mono text-[10.5px] text-muted">
                            {movement.product?.sku || '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <MovementTypeBadge type={movement.type} />
                        </td>
                        <td
                          className={cn(
                            'px-4 py-3 font-mono font-semibold',
                            movement.qtyDelta >= 0 ? 'text-success' : 'text-danger',
                          )}
                        >
                          {movement.qtyDelta > 0 ? '+' : ''}
                          {movement.qtyDelta}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted">
                          {movement.qtyBefore} → {movement.qtyAfter}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted">
                          {money(movement.unitCostMinor)}
                        </td>
                        <td className="max-w-[220px] px-4 py-3">
                          <p className="truncate text-muted">{movement.supplierName || '—'}</p>
                          {movement.note && (
                            <p className="truncate text-[10.5px] text-muted/70">{movement.note}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                pagination={movementsQuery.data?.pagination}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      ) : (
        <>
          {valuationQuery.isLoading ? (
            <LoadingRows rows={5} />
          ) : !valuation || valuation.products.length === 0 ? (
            <EmptyState icon={Boxes} title="لا مخزون" description="أضف منتجات أولًا." />
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="p-4">
                  <p className="text-[12px] text-muted">قيمة المخزون بالتكلفة</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-ink">
                    {money(valuation.totalCostMinor)}
                  </p>
                </Card>
                <Card className="p-4">
                  <p className="text-[12px] text-muted">القيمة بسعر البيع</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-accent">
                    {money(valuation.totalRetailMinor)}
                  </p>
                </Card>
              </div>

              <div className="table-shell overflow-x-auto">
                <table className="w-full min-w-[620px] text-right text-[12.5px]">
                  <thead className="bg-surface2/60 text-[11px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">المنتج</th>
                      <th className="px-4 py-3 font-medium">الكمية</th>
                      <th className="px-4 py-3 font-medium">سعر الشراء</th>
                      <th className="px-4 py-3 font-medium">قيمة التكلفة</th>
                      <th className="px-4 py-3 font-medium">سعر البيع</th>
                      <th className="px-4 py-3 font-medium">قيمة البيع</th>
                    </tr>
                  </thead>
                  <tbody>
                    {valuation.products.map((row) => (
                      <tr key={row.id} className="border-t border-line/60">
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{row.name}</p>
                          <p className="font-mono text-[10.5px] text-muted">
                            {row.sku || '—'}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-ink">{row.stockQty}</td>
                        <td className="px-4 py-3 font-mono text-muted">
                          {money(row.purchasePriceMinor)}
                        </td>
                        <td className="px-4 py-3 font-mono text-ink">{money(row.valueMinor)}</td>
                        <td className="px-4 py-3 font-mono text-muted">
                          {money(row.sellingPriceMinor)}
                        </td>
                        <td className="px-4 py-3 font-mono text-accent">
                          {money(row.retailValueMinor)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      <StockInModal
        open={stockInOpen}
        products={products}
        onClose={() => setStockInOpen(false)}
        onSaved={invalidate}
      />

      <AdjustmentModal
        open={adjustOpen}
        products={products}
        onClose={() => setAdjustOpen(false)}
        onSaved={invalidate}
      />
    </div>
  );
}
