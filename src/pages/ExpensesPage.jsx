import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Pencil,
  Plus,
  Search,
  Tags,
  Trash2,
  Wallet,
  CalendarDays,
} from 'lucide-react';
import { expensesApi } from '../api/expenses.js';
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
import { StatCard } from '../components/ui/StatCard.jsx';
import { apiError } from '../lib/http.js';
import { dayOf, money, shortDateOf } from '../lib/format.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useToast } from '../providers/ToastProvider.jsx';

function ExpenseModal({ open, onClose, expense, categories, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    amountMinor: 0,
    categoryId: '',
    expenseDate: dayOf(),
    note: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(
      expense
        ? {
            title: expense.title,
            amountMinor: expense.amountMinor,
            categoryId: expense.categoryId || '',
            expenseDate: dayOf(expense.expenseDate),
            note: expense.note || '',
          }
        : {
            title: '',
            amountMinor: 0,
            categoryId: categories[0]?.id || '',
            expenseDate: dayOf(),
            note: '',
          },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!form.title.trim()) {
      setError('عنوان المصروف مطلوب');
      return;
    }
    if (!form.amountMinor || form.amountMinor < 1) {
      setError('المبلغ يجب أن يكون أكبر من صفر');
      return;
    }

    const payload = {
      title: form.title.trim(),
      amountMinor: form.amountMinor,
      categoryId: form.categoryId || null,
      expenseDate: form.expenseDate,
      note: form.note.trim(),
    };

    setSaving(true);
    try {
      if (expense) await expensesApi.update(expense.id, payload);
      else await expensesApi.create(payload);
      toast.success(expense ? 'تم تحديث المصروف' : 'تم تسجيل المصروف');
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
      title={expense ? 'تعديل المصروف' : 'إضافة مصروف'}
      description="كهرباء، إيجار، صيانة، رواتب، إنترنت…"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button type="submit" form="expense-form" loading={saving}>
            حفظ
          </Button>
        </>
      }
    >
      <form id="expense-form" onSubmit={submit} className="space-y-3.5">
        <Input
          label="العنوان"
          placeholder="فاتورة كهرباء"
          value={form.title}
          onChange={(event) =>
            setForm((current) => ({ ...current, title: event.target.value }))
          }
          maxLength={120}
        />
        <div className="grid grid-cols-2 gap-3">
          <MoneyInput
            label="المبلغ"
            value={form.amountMinor}
            onChange={(value) => setForm((current) => ({ ...current, amountMinor: value }))}
          />
          <Input
            label="التاريخ"
            type="date"
            value={form.expenseDate}
            onChange={(event) =>
              setForm((current) => ({ ...current, expenseDate: event.target.value }))
            }
          />
        </div>
        <Select
          label="التصنيف"
          value={form.categoryId}
          onChange={(event) =>
            setForm((current) => ({ ...current, categoryId: event.target.value }))
          }
        >
          <option value="">بدون تصنيف</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        <Textarea
          label="ملاحظات (اختياري)"
          rows={2}
          value={form.note}
          onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
          maxLength={300}
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

function CategoriesModal({ open, onClose }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: ['expense-categories', 'all'],
    queryFn: () => expensesApi.categories.list({ includeInactive: true }),
    enabled: open,
  });

  const categories = query.data || [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
  };

  const create = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await expensesApi.categories.create({ name: name.trim() });
      setName('');
      refresh();
      toast.success('تمت إضافة التصنيف');
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async (category) => {
    if (!editingName.trim()) return;
    setSaving(true);
    try {
      await expensesApi.categories.update(category.id, { name: editingName.trim() });
      setEditing(null);
      setEditingName('');
      refresh();
      toast.success('تم تحديث التصنيف');
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (category) => {
    setSaving(true);
    try {
      await expensesApi.categories.update(category.id, { isActive: !category.isActive });
      refresh();
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تصنيفات المصروفات"
      description="التصنيفات غير المفعّلة لا تظهر عند إضافة مصروف جديد."
      footer={
        <Button variant="secondary" onClick={onClose}>
          إغلاق
        </Button>
      }
    >
      <div className="space-y-3">
        <form onSubmit={create} className="flex items-end gap-2">
          <Input
            label="تصنيف جديد"
            placeholder="مثال: نظافة"
            value={name}
            onChange={(event) => setName(event.target.value)}
            containerClassName="flex-1"
            maxLength={60}
          />
          <Button type="submit" loading={saving} disabled={!name.trim()}>
            <Plus size={15} />
            إضافة
          </Button>
        </form>

        {query.isLoading ? (
          <LoadingRows rows={3} />
        ) : categories.length === 0 ? (
          <p className="text-[12px] text-muted">لا تصنيفات بعد.</p>
        ) : (
          <div className="space-y-1.5">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-line/70 bg-surface2/40 px-3 py-2"
              >
                {editing === category.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      containerClassName="flex-1"
                      maxLength={60}
                    />
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => saveEdit(category)}
                      loading={saving}
                    >
                      حفظ
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      إلغاء
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-medium text-ink">{category.name}</span>
                      {category.isSystem && <Badge tone="neutral">أساسي</Badge>}
                      {!category.isActive && <Badge tone="warning">معطّل</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditing(category.id);
                          setEditingName(category.name);
                        }}
                      >
                        <Pencil size={13} />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggle(category)}
                        disabled={category.isSystem || saving}
                        className="text-[11px]"
                      >
                        {category.isActive ? 'تعطيل' : 'تفعيل'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

export function ExpensesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId, from, to]);

  const query = useQuery({
    queryKey: ['expenses', { page, q: debouncedSearch, categoryId, from, to }],
    queryFn: () =>
      expensesApi.list({
        page,
        limit: 20,
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
        ...(categoryId ? { categoryId } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      }),
  });

  const categoriesQuery = useQuery({
    queryKey: ['expense-categories', 'active'],
    queryFn: () => expensesApi.categories.list(),
  });

  const expenses = query.data?.expenses || [];
  const categories = categoriesQuery.data || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  };

  const remove = async () => {
    if (!deleting) return;
    setWorking(true);
    try {
      await expensesApi.remove(deleting.id);
      toast.success('تم حذف المصروف');
      setDeleting(null);
      invalidate();
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setWorking(false);
    }
  };

  const setToday = () => {
    const today = dayOf();
    setFrom(today);
    setTo(today);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="المصروفات"
        subtitle="سجّل مصروفات الكافيه لحساب الصافي بدقة."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setCategoriesOpen(true)}>
              <Tags size={16} />
              التصنيفات
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={16} />
              إضافة مصروف
            </Button>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="إجمالي المصروفات المعروضة"
          value={money(query.data?.totalAmountMinor || 0)}
          hint={`${query.data?.pagination?.total || 0} مصروف`}
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          label="الفترة"
          value={from || to ? `${from || 'البداية'} → ${to || 'الآن'}` : 'كل الفترات'}
          hint="استخدم الفلاتر لتضييق النتائج"
          icon={CalendarDays}
          tone="neutral"
        />
      </div>

      <Card className="p-3.5">
        <div className="flex flex-wrap items-end gap-2.5">
          <Input
            icon={Search}
            placeholder="بحث بعنوان المصروف…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            containerClassName="min-w-[180px] flex-1"
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
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            containerClassName="w-36"
            aria-label="من"
          />
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            containerClassName="w-36"
            aria-label="إلى"
          />
          <Button size="sm" variant="ghost" onClick={setToday}>
            اليوم
          </Button>
          {(from || to) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setFrom('');
                setTo('');
              }}
            >
              مسح
            </Button>
          )}
        </div>
      </Card>

      {query.isError ? (
        <ErrorState message={apiError(query.error).message} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <LoadingRows rows={5} />
      ) : expenses.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="لا مصروفات"
          description="سجّل أول مصروف ليُخصم من صافي الأرباح."
          action={
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={15} />
              إضافة مصروف
            </Button>
          }
        />
      ) : (
        <>
          <div className="table-shell overflow-x-auto">
            <table className="w-full min-w-[680px] text-right text-[12.5px]">
              <thead className="bg-surface2/60 text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">التاريخ</th>
                  <th className="px-4 py-3 font-medium">العنوان</th>
                  <th className="px-4 py-3 font-medium">التصنيف</th>
                  <th className="px-4 py-3 font-medium">ملاحظات</th>
                  <th className="px-4 py-3 font-medium">المبلغ</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr
                    key={expense.id}
                    className="border-t border-line/60 hover:bg-surface2/30"
                  >
                    <td className="px-4 py-3 text-muted">
                      {shortDateOf(expense.expenseDate)}
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{expense.title}</td>
                    <td className="px-4 py-3 text-muted">{expense.categoryName || '—'}</td>
                    <td className="max-w-[220px] px-4 py-3">
                      <p className="truncate text-muted">{expense.note || '—'}</p>
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-warning">
                      {money(expense.amountMinor)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditing(expense);
                            setFormOpen(true);
                          }}
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger hover:bg-danger/10"
                          onClick={() => setDeleting(expense)}
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

          <Pagination pagination={query.data?.pagination} onPageChange={setPage} />
        </>
      )}

      <ExpenseModal
        open={formOpen}
        expense={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSaved={invalidate}
      />

      <CategoriesModal open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="حذف المصروف"
        description={`سيُحذف «${deleting?.title || ''}» من الحسابات. لا يمكن التراجع.`}
        confirmLabel="حذف"
        loading={working}
      />
    </div>
  );
}
