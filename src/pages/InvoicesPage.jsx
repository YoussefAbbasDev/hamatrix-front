import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  Eye,
  Receipt,
  Search,
  Trash2,
  AlertTriangle,
  ArrowLeft,
} from 'lucide-react';
import { invoicesApi } from '../api/invoices.js';
import { PageHeader, EmptyState } from '../components/ui/PageHeader.jsx';
import { Card, Badge } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Select } from '../components/ui/Select.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { LoadingRows, ErrorState } from '../components/ui/States.jsx';
import { InvoiceTypeBadge } from '../components/common/StatusBadge.jsx';
import { apiError } from '../lib/http.js';
import { money, dateTimeOf, dayOf } from '../lib/format.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useToast } from '../providers/ToastProvider.jsx';
import { cn } from '../lib/cn.js';

function InvoiceDetail({ invoice, onClose, onDelete }) {
  if (!invoice) return null;

  return (
    <Modal
      open
      onClose={onClose}
      title={`فاتورة ${invoice.invoiceNumber}`}
      description={`${dateTimeOf(invoice.issuedAt)} · دفع نقدي`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            إغلاق
          </Button>
          {invoice.visitId && (
            <Button variant="secondary" as={Link} to={`/visits/${invoice.visitId}`}>
              الزيارة
              <ArrowLeft size={15} />
            </Button>
          )}
          <Button variant="danger" onClick={() => onDelete(invoice)}>
            <Trash2 size={15} />
            حذف الفاتورة
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line/70 bg-surface2/40 px-3.5 py-2.5">
          <div>
            <p className="text-[13px] font-semibold text-ink">
              {invoice.playerName || 'بدون اسم'}
            </p>
            <p className="text-[11px] text-muted">
              {invoice.storeSnapshot?.name || ''}
              {invoice.storeSnapshot?.phone ? ` · ${invoice.storeSnapshot.phone}` : ''}
            </p>
          </div>
          <InvoiceTypeBadge type={invoice.type} />
        </div>

        <div className="overflow-x-auto rounded-lg border border-line/70">
          <table className="w-full min-w-[460px] text-right text-[12px]">
            <thead className="bg-surface2/60 text-[10.5px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">البيان</th>
                <th className="px-3 py-2 font-medium">النوع</th>
                <th className="px-3 py-2 font-medium">الكمية</th>
                <th className="px-3 py-2 font-medium">السعر</th>
                <th className="px-3 py-2 font-medium">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {(invoice.lines || []).map((line, index) => (
                <tr key={`${line.description}-${index}`} className="border-t border-line/60">
                  <td className="px-3 py-2 text-ink">{line.description}</td>
                  <td className="px-3 py-2">
                    <Badge tone={line.kind === 'time' ? 'accent' : 'neutral'}>
                      {line.kind === 'time' ? 'وقت' : 'منتج'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 font-mono text-muted">{line.qty}</td>
                  <td className="px-3 py-2 font-mono text-muted">
                    {money(line.unitPriceMinor)}
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold text-ink">
                    {money(line.lineTotalMinor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-1.5 text-[12.5px]">
          <div className="flex justify-between text-muted">
            <span>المجموع</span>
            <span className="font-mono text-ink">{money(invoice.subtotalMinor)}</span>
          </div>
          {invoice.adjustmentMinor !== 0 && (
            <div className="flex justify-between text-muted">
              <span>
                تعديل يدوي
                {invoice.adjustmentNote ? ` — ${invoice.adjustmentNote}` : ''}
              </span>
              <span className="font-mono text-warning">{money(invoice.adjustmentMinor)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-line/60 pt-2">
            <span className="font-semibold text-ink">الإجمالي المدفوع</span>
            <span className="font-mono text-xl font-semibold text-accent">
              {money(invoice.totalMinor)}
            </span>
          </div>
          <div className="flex justify-between text-[11px] text-muted/80">
            <span>تكلفة المنتجات (COGS)</span>
            <span className="font-mono">{money(invoice.costTotalMinor)}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function InvoicesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [working, setWorking] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, type, from, to]);

  const query = useQuery({
    queryKey: ['invoices', { page, q: debouncedSearch, type, from, to }],
    queryFn: () =>
      invoicesApi.list({
        page,
        limit: 20,
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
        ...(type ? { type } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      }),
  });

  const invoices = query.data?.invoices || [];

  const setToday = () => {
    const today = dayOf();
    setFrom(today);
    setTo(today);
  };

  const setMonth = () => {
    const today = dayOf();
    setFrom(`${today.slice(0, 7)}-01`);
    setTo(today);
  };

  const clearDates = () => {
    setFrom('');
    setTo('');
  };

  const openDelete = (invoice) => {
    setDetail(null);
    setDeleting(invoice);
    setConfirmText('');
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    if (confirmText.trim() !== deleting.invoiceNumber) return;

    setWorking(true);
    try {
      await invoicesApi.remove(deleting.id, confirmText.trim());
      toast.success('حُذفت الفاتورة وأُعيد المخزون');
      setDeleting(null);
      setConfirmText('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['reports'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['visits'] }),
      ]);
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="الفواتير"
        subtitle="كل الفواتير الصادرة — جلسات وبيع سريع. الحذف نهائي ويعيد المخزون."
      />

      <Card className="p-3.5">
        <div className="flex flex-wrap items-end gap-2.5">
          <Input
            icon={Search}
            placeholder="بحث برقم الفاتورة أو اسم اللاعب…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            containerClassName="min-w-[200px] flex-1"
          />
          <Select
            value={type}
            onChange={(event) => setType(event.target.value)}
            containerClassName="w-36"
            aria-label="النوع"
          >
            <option value="">كل الأنواع</option>
            <option value="session">جلسات</option>
            <option value="quick_sale">بيع سريع</option>
          </Select>
          <Input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            containerClassName="w-36"
            aria-label="من تاريخ"
          />
          <Input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            containerClassName="w-36"
            aria-label="إلى تاريخ"
          />
          <div className="flex flex-wrap gap-1">
            <Button size="sm" variant="ghost" onClick={setToday}>
              <CalendarDays size={14} />
              اليوم
            </Button>
            <Button size="sm" variant="ghost" onClick={setMonth}>
              الشهر
            </Button>
            {(from || to) && (
              <Button size="sm" variant="ghost" onClick={clearDates}>
                مسح
              </Button>
            )}
          </div>
        </div>
      </Card>

      {query.isError ? (
        <ErrorState message={apiError(query.error).message} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <LoadingRows rows={5} />
      ) : invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="لا فواتير"
          description="ستظهر الفواتير هنا بعد أول تحصيل أو بيع سريع."
        />
      ) : (
        <>
          <div className="table-shell overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-[12.5px]">
              <thead className="bg-surface2/60 text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">الفاتورة</th>
                  <th className="px-4 py-3 font-medium">النوع</th>
                  <th className="px-4 py-3 font-medium">اللاعب</th>
                  <th className="px-4 py-3 font-medium">التاريخ</th>
                  <th className="px-4 py-3 font-medium">البنود</th>
                  <th className="px-4 py-3 font-medium">الإجمالي</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-t border-line/60 hover:bg-surface2/30"
                  >
                    <td className="px-4 py-3 font-mono font-medium text-ink">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-3">
                      <InvoiceTypeBadge type={invoice.type} />
                    </td>
                    <td className="px-4 py-3 text-muted">{invoice.playerName || '—'}</td>
                    <td className="px-4 py-3 text-muted">{dateTimeOf(invoice.issuedAt)}</td>
                    <td className="px-4 py-3 font-mono text-muted">
                      {invoice.lines?.length || 0}
                    </td>
                    <td className="px-4 py-3 font-mono font-semibold text-accent">
                      {money(invoice.totalMinor)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDetail(invoice)}
                          title="عرض"
                        >
                          <Eye size={14} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger hover:bg-danger/10"
                          onClick={() => openDelete(invoice)}
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

          <Pagination pagination={query.data?.pagination} onPageChange={setPage} />
        </>
      )}

      {detail && (
        <InvoiceDetail invoice={detail} onClose={() => setDetail(null)} onDelete={openDelete} />
      )}

      <Modal
        open={Boolean(deleting)}
        onClose={() => !working && setDeleting(null)}
        title="حذف الفاتورة نهائيًا"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleting(null)}
              disabled={working}
            >
              إلغاء
            </Button>
            <Button
              variant="danger"
              onClick={confirmDelete}
              loading={working}
              disabled={confirmText.trim() !== deleting?.invoiceNumber}
            >
              <Trash2 size={15} />
              حذف نهائي
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5 text-[12px] leading-relaxed text-danger">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            سيختفي الإيراد من التقارير، ويُعاد المخزون، وتُحذف الزيارة والجلسات. لا يوجد سجل
            تدقيق لهذه العملية.
          </div>
          <p className="text-[12.5px] text-muted">
            اكتب رقم الفاتورة <span className="font-mono text-ink">{deleting?.invoiceNumber}</span>{' '}
            للتأكيد.
          </p>
          <Input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={deleting?.invoiceNumber}
            dir="ltr"
            className={cn(
              'text-left font-mono',
              confirmText && confirmText.trim() !== deleting?.invoiceNumber && 'field-error',
            )}
          />
        </div>
      </Modal>
    </div>
  );
}
