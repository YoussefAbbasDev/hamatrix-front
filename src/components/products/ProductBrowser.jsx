import { useMemo, useState } from 'react';
import { Package, Plus, Search } from 'lucide-react';
import { Input } from '../ui/Input.jsx';
import { money } from '../../lib/format.js';
import { cn } from '../../lib/cn.js';

/**
 * Searchable product grid shared by the visit screen and the quick-sale POS.
 * Availability is computed by the server (stock minus reservations).
 */
export function ProductBrowser({
  products = [],
  categories = [],
  loading = false,
  onPick,
  canPick = (product) => product.availableQty > 0,
  emptyTitle = 'لا منتجات',
  emptyDescription = 'أضف منتجات من صفحة المنتجات أولًا.',
}) {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      if (categoryId && product.category?.id !== categoryId) return false;
      if (!term) return true;
      return (
        product.name.toLowerCase().includes(term) ||
        (product.sku || '').toLowerCase().includes(term) ||
        (product.barcode || '').toLowerCase().includes(term)
      );
    });
  }, [products, search, categoryId]);

  return (
    <div>
      <div className="space-y-2">
        <Input
          icon={Search}
          placeholder="بحث بالاسم أو الكود…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryId('')}
              className={cn(
                'rounded-full border px-2.5 py-1 text-[11px] transition',
                !categoryId
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-line/70 bg-surface2/40 text-muted hover:text-ink',
              )}
            >
              الكل
            </button>
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() =>
                  setCategoryId((current) => (current === category.id ? '' : category.id))
                }
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] transition',
                  categoryId === category.id
                    ? 'border-accent/40 bg-accent/10 text-accent'
                    : 'border-line/70 bg-surface2/40 text-muted hover:text-ink',
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 max-h-[420px] space-y-1.5 overflow-y-auto pl-0.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton h-12" />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-line/70 px-4 py-8 text-center">
            <Package size={20} className="text-muted/70" />
            <p className="text-[12.5px] font-medium text-ink">{emptyTitle}</p>
            <p className="text-[11px] text-muted">{emptyDescription}</p>
          </div>
        ) : (
          filtered.map((product) => {
            const allowed = canPick(product);
            return (
              <button
                key={product.id}
                type="button"
                disabled={!allowed}
                onClick={() => onPick(product)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 rounded-lg border border-line/70 bg-surface2/40 px-3 py-2 text-right transition',
                  allowed
                    ? 'hover:border-accent/40 hover:bg-surface2/70'
                    : 'cursor-not-allowed opacity-50',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-[12.5px] font-medium text-ink">
                    {product.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[10.5px] text-muted">
                    <span>{product.category?.name || 'بدون تصنيف'}</span>
                    <span>·</span>
                    <span className={product.availableQty <= 0 ? 'text-danger' : ''}>
                      متاح {product.availableQty}
                    </span>
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-[12px] font-semibold text-accent">
                    {money(product.sellingPriceMinor)}
                  </span>
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line/70 text-muted">
                    <Plus size={13} />
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
