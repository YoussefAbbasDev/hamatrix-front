import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { productsApi } from '../api/products.js';
import { PageHeader, EmptyState } from '../components/ui/PageHeader.jsx';
import { Card, Badge } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Select, Textarea } from '../components/ui/Select.jsx';
import { MoneyInput } from '../components/ui/MoneyInput.jsx';
import { Switch } from '../components/ui/Switch.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { LoadingRows, ErrorState } from '../components/ui/States.jsx';
import { apiError } from '../lib/http.js';
import { money } from '../lib/format.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useToast } from '../providers/ToastProvider.jsx';
import { cn } from '../lib/cn.js';

const EMPTY_PRODUCT = {
  name: '',
  categoryId: '',
  sku: '',
  barcode: '',
  sellingPriceMinor: 0,
  purchasePriceMinor: 0,
  stockQty: 0,
  minStockQty: 0,
  description: '',
  isActive: true,
};

function ProductModal({ open, onClose, product, categories, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      product
        ? {
            name: product.name,
            categoryId: product.category?.id || '',
            sku: product.sku || '',
            barcode: product.barcode || '',
            sellingPriceMinor: product.sellingPriceMinor,
            purchasePriceMinor: product.purchasePriceMinor,
            stockQty: product.stockQty,
            minStockQty: product.minStockQty,
            description: product.description || '',
            isActive: product.isActive,
          }
        : EMPTY_PRODUCT,
    );
  }, [open, product]);

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.name.trim()) {
      setError('اسم المنتج مطلوب');
      return;
    }
    if (!form.sellingPriceMinor || form.sellingPriceMinor < 1) {
      setError('سعر البيع يجب أن يكون أكبر من صفر');
      return;
    }

    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId || null,
      barcode: form.barcode.trim(),
      sellingPriceMinor: form.sellingPriceMinor,
      purchasePriceMinor: form.purchasePriceMinor || 0,
      minStockQty: Number(form.minStockQty) || 0,
      description: form.description.trim(),
    };
    if (form.sku.trim()) payload.sku = form.sku.trim();
    if (!product) {
      payload.stockQty = Number(form.stockQty) || 0;
    } else {
      payload.isActive = form.isActive;
    }

    setSaving(true);
    try {
      if (product) await productsApi.update(product.id, payload);
      else await productsApi.create(payload);
      toast.success(product ? 'تم تحديث المنتج' : 'تمت إضافة المنتج');
      onSaved?.();
      onClose();
    } catch (saveError) {
      setError(apiError(saveError).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'تعديل المنتج' : 'إضافة منتج'}
      description="سعر الشراء يُستخدم لحساب التكلفة والربح. تعديل المخزون يتم من صفحة المخزون."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button type="submit" form="product-form" loading={saving}>
            حفظ
          </Button>
        </>
      }
    >
      <form id="product-form" onSubmit={submit} className="space-y-3.5" noValidate>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label="اسم المنتج"
            placeholder="بيبسي"
            value={form.name}
            onChange={set('name')}
            maxLength={120}
          />
          <Select label="التصنيف" value={form.categoryId} onChange={set('categoryId')}>
            <option value="">بدون تصنيف</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <Input
            label="الكود / SKU (اختياري)"
            dir="ltr"
            className="text-left font-mono"
            placeholder="PEP-001"
            value={form.sku}
            onChange={set('sku')}
            maxLength={40}
          />
          <Input
            label="الباركود (اختياري)"
            dir="ltr"
            className="text-left font-mono"
            placeholder="123456789"
            value={form.barcode}
            onChange={set('barcode')}
            maxLength={64}
          />
          <MoneyInput
            label="سعر البيع"
            value={form.sellingPriceMinor}
            onChange={(value) => setForm((current) => ({ ...current, sellingPriceMinor: value }))}
          />
          <MoneyInput
            label="سعر الشراء"
            value={form.purchasePriceMinor}
            onChange={(value) =>
              setForm((current) => ({ ...current, purchasePriceMinor: value }))
            }
          />
          {!product && (
            <Input
              label="المخزون الافتتاحي"
              type="number"
              min={0}
              dir="ltr"
              className="text-left font-mono"
              value={form.stockQty}
              onChange={set('stockQty')}
            />
          )}
          <Input
            label="حد التنبيه"
            type="number"
            min={0}
            dir="ltr"
            className="text-left font-mono"
            value={form.minStockQty}
            onChange={set('minStockQty')}
            hint="ينبهك عند وصول المخزون لهذا الحد أو أقل"
          />
        </div>

        <Textarea
          label="وصف (اختياري)"
          rows={2}
          value={form.description}
          onChange={set('description')}
          maxLength={300}
        />

        {product && (
          <Switch
            checked={form.isActive}
            onChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
            label="المنتج مفعّل"
            description="المنتجات المعطلة لا تظهر في البيع أو الزيارات."
          />
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

function CategoryModal({ open, onClose, category, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', color: '#8B5CFF', sortOrder: 0, isActive: true });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      category
        ? {
            name: category.name,
            color: category.color || '#8B5CFF',
            sortOrder: category.sortOrder || 0,
            isActive: category.isActive,
          }
        : { name: '', color: '#8B5CFF', sortOrder: 0, isActive: true },
    );
  }, [open, category]);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('اسم التصنيف مطلوب');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        color: form.color,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (category) payload.isActive = form.isActive;
      if (category) await productsApi.categories.update(category.id, payload);
      else await productsApi.categories.create(payload);
      toast.success(category ? 'تم تحديث التصنيف' : 'تمت إضافة التصنيف');
      onSaved?.();
      onClose();
    } catch (saveError) {
      setError(apiError(saveError).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={category ? 'تعديل التصنيف' : 'إضافة تصنيف'}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button type="submit" form="category-form" loading={saving}>
            حفظ
          </Button>
        </>
      }
    >
      <form id="category-form" onSubmit={submit} className="space-y-3.5">
        <Input
          label="اسم التصنيف"
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          maxLength={60}
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="field-label">اللون</p>
            <input
              type="color"
              value={form.color}
              onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
              className="h-10 w-full cursor-pointer rounded-lg border border-line bg-surface2/70 p-1"
            />
          </div>
          <Input
            label="الترتيب"
            type="number"
            min={0}
            dir="ltr"
            className="text-left font-mono"
            value={form.sortOrder}
            onChange={(event) =>
              setForm((current) => ({ ...current, sortOrder: event.target.value }))
            }
          />
        </div>
        {category && (
          <Switch
            checked={form.isActive}
            onChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
            label="التصنيف مفعّل"
          />
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

export function ProductsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('products');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId, stockFilter]);

  const productsQuery = useQuery({
    queryKey: ['products', { page, q: debouncedSearch, categoryId, stockFilter }],
    queryFn: () =>
      productsApi.list({
        page,
        limit: 20,
        sort: 'name',
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(stockFilter === 'low' ? { lowStock: 'true' } : {}),
        ...(stockFilter === 'inStock' ? { inStock: 'true' } : {}),
      }),
  });

  const categoriesQuery = useQuery({
    queryKey: ['product-categories', 'all'],
    queryFn: () => productsApi.categories.list({ includeInactive: true }),
  });

  const products = productsQuery.data?.products || [];
  const categories = categoriesQuery.data || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['product-categories'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const removeProduct = async () => {
    if (!deletingProduct) return;
    setWorking(true);
    try {
      await productsApi.remove(deletingProduct.id);
      toast.success('تم حذف المنتج');
      setDeletingProduct(null);
      invalidate();
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setWorking(false);
    }
  };

  const removeCategory = async () => {
    if (!deletingCategory) return;
    setWorking(true);
    try {
      await productsApi.categories.remove(deletingCategory.id);
      toast.success('تم حذف التصنيف');
      setDeletingCategory(null);
      invalidate();
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="المنتجات"
        subtitle="أسعار البيع والشراء والتصنيفات وحدود تنبيه المخزون."
        action={
          <Button
            onClick={() => {
              if (tab === 'products') {
                setEditingProduct(null);
                setProductOpen(true);
              } else {
                setEditingCategory(null);
                setCategoryOpen(true);
              }
            }}
          >
            <Plus size={16} />
            {tab === 'products' ? 'إضافة منتج' : 'إضافة تصنيف'}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: 'products', label: 'المنتجات', icon: Package },
          { value: 'categories', label: 'التصنيفات', icon: Tags },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-medium transition',
                tab === item.value
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-line/70 bg-surface2/40 text-muted hover:text-ink',
              )}
            >
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </div>

      {tab === 'products' ? (
        <>
          <Card className="p-3.5">
            <div className="flex flex-wrap items-end gap-2.5">
              <Input
                icon={Search}
                placeholder="بحث بالاسم أو الكود أو الباركود…"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                containerClassName="min-w-[190px] flex-1"
              />
              <Select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                containerClassName="w-40"
                aria-label="التصنيف"
              >
                <option value="">كل التصنيفات</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Select
                value={stockFilter}
                onChange={(event) => setStockFilter(event.target.value)}
                containerClassName="w-40"
                aria-label="المخزون"
              >
                <option value="">كل المخزون</option>
                <option value="low">منخفض</option>
                <option value="inStock">متوفر</option>
              </Select>
            </div>
          </Card>

          {productsQuery.isError ? (
            <ErrorState
              message={apiError(productsQuery.error).message}
              onRetry={() => productsQuery.refetch()}
            />
          ) : productsQuery.isLoading ? (
            <LoadingRows rows={5} />
          ) : products.length === 0 ? (
            <EmptyState
              icon={Package}
              title="لا منتجات"
              description={
                search || categoryId || stockFilter
                  ? 'لا نتائج مطابقة للفلتر الحالي.'
                  : 'أضف أول منتج ليظهر في البيع والزيارات.'
              }
              action={
                !search && !categoryId && !stockFilter ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingProduct(null);
                      setProductOpen(true);
                    }}
                  >
                    <Plus size={15} />
                    إضافة منتج
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              <div className="table-shell overflow-x-auto">
                <table className="w-full min-w-[820px] text-right text-[12.5px]">
                  <thead className="bg-surface2/60 text-[11px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">المنتج</th>
                      <th className="px-4 py-3 font-medium">التصنيف</th>
                      <th className="px-4 py-3 font-medium">بيع</th>
                      <th className="px-4 py-3 font-medium">شراء</th>
                      <th className="px-4 py-3 font-medium">المخزون</th>
                      <th className="px-4 py-3 font-medium">حد التنبيه</th>
                      <th className="px-4 py-3 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr
                        key={product.id}
                        className="border-t border-line/60 hover:bg-surface2/30"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line/70 bg-surface2/60 text-muted">
                              <Package size={14} />
                            </span>
                            <div>
                              <p className="font-semibold text-ink">{product.name}</p>
                              <p className="font-mono text-[10.5px] text-muted">
                                {product.sku || 'بدون كود'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {product.category?.name || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-ink">
                          {money(product.sellingPriceMinor)}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted">
                          {money(product.purchasePriceMinor)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'font-mono text-[12px] font-semibold',
                                product.isOutOfStock
                                  ? 'text-danger'
                                  : product.isLowStock
                                    ? 'text-warning'
                                    : 'text-ink',
                              )}
                            >
                              {product.stockQty}
                            </span>
                            {product.reservedQty > 0 && (
                              <span className="text-[10px] text-muted">
                                (محجوز {product.reservedQty})
                              </span>
                            )}
                            {product.isLowStock && (
                              <AlertTriangle size={12} className="text-warning" />
                            )}
                          </div>
                          <p className="text-[10px] text-muted">متاح {product.availableQty}</p>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted">{product.minStockQty}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {!product.isActive && <Badge tone="neutral">معطّل</Badge>}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingProduct(product);
                                setProductOpen(true);
                              }}
                              title="تعديل"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-danger hover:bg-danger/10"
                              onClick={() => setDeletingProduct(product)}
                              title="حذف"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                pagination={productsQuery.data?.pagination}
                onPageChange={setPage}
              />
            </>
          )}
        </>
      ) : (
        <Card className="p-3.5">
          {categoriesQuery.isLoading ? (
            <LoadingRows rows={4} />
          ) : categories.length === 0 ? (
            <EmptyState
              icon={Tags}
              title="لا تصنيفات"
              description="أضف تصنيفات لتنظيم المنتجات (مشروبات، وجبات…)."
              action={
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingCategory(null);
                    setCategoryOpen(true);
                  }}
                >
                  <Plus size={15} />
                  إضافة تصنيف
                </Button>
              }
            />
          ) : (
            <div className="space-y-1.5">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line/70 bg-surface2/40 px-3 py-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ background: category.color || '#8B5CFF' }}
                    />
                    <span className="text-[12.5px] font-medium text-ink">{category.name}</span>
                    {!category.isActive && <Badge tone="neutral">معطّل</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingCategory(category);
                        setCategoryOpen(true);
                      }}
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-danger/10"
                      onClick={() => setDeletingCategory(category)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <ProductModal
        open={productOpen}
        product={editingProduct}
        categories={categories.filter((category) => category.isActive)}
        onClose={() => setProductOpen(false)}
        onSaved={invalidate}
      />

      <CategoryModal
        open={categoryOpen}
        category={editingCategory}
        onClose={() => setCategoryOpen(false)}
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        onConfirm={removeProduct}
        title="حذف المنتج"
        description={`سيُخفى «${deletingProduct?.name || ''}» من البيع. لا يمكن حذفه إذا كان في زيارة مفتوحة.`}
        confirmLabel="حذف"
        loading={working}
      />

      <ConfirmDialog
        open={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        onConfirm={removeCategory}
        title="حذف التصنيف"
        description={`سيُحذف «${deletingCategory?.name || ''}». لا يمكن الحذف إذا كان يحتوي منتجات.`}
        confirmLabel="حذف"
        loading={working}
      />
    </div>
  );
}
