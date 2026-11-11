import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Banknote,
  Coffee,
  Download,
  Gamepad2,
  History,
  PackagePlus,
  Play,
  Receipt,
  Scale,
  ShoppingCart,
  Square,
  TrendingUp,
  Wallet,
  CalendarDays,
} from 'lucide-react';
import { reportsApi, downloadCsv } from '../api/reports.js';
import { PageHeader, EmptyState } from '../components/ui/PageHeader.jsx';
import { Card, SectionTitle, Badge } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { StatCard } from '../components/ui/StatCard.jsx';
import { LoadingRows, ErrorState } from '../components/ui/States.jsx';
import { apiError } from '../lib/http.js';
import { dateOf, money, timeOf, dayOf } from '../lib/format.js';
import { useToast } from '../providers/ToastProvider.jsx';
import { cn } from '../lib/cn.js';

const MODES = [
  { value: 'day', label: 'اليوم' },
  { value: 'month', label: 'هذا الشهر' },
  { value: 'all', label: 'الكل' },
  { value: 'custom', label: 'فترة مخصصة' },
];

const KIND_META = {
  session_started: { icon: Play, tone: 'text-accent bg-accent/10', label: 'بدء جلسة' },
  session_ended: { icon: Square, tone: 'text-muted bg-surface2', label: 'إنهاء جلسة' },
  checkout: { icon: Banknote, tone: 'text-success bg-success/10', label: 'تحصيل' },
  quick_sale: { icon: ShoppingCart, tone: 'text-warning bg-warning/10', label: 'بيع سريع' },
  stock_in: { icon: PackagePlus, tone: 'text-cyan bg-cyan/10', label: 'توريد' },
  adjustment: { icon: Scale, tone: 'text-warning bg-warning/10', label: 'تسوية' },
  expense: { icon: Wallet, tone: 'text-danger bg-danger/10', label: 'مصروف' },
};

function metaLine(item) {
  const meta = item.meta || {};
  if (item.kind === 'checkout') {
    return [meta.items ? `${meta.items} قطعة` : null, meta.gamingMinutes ? `${meta.gamingMinutes} دقيقة لعب` : null]
      .filter(Boolean)
      .join(' · ');
  }
  if (item.kind === 'quick_sale') {
    return meta.items ? `${meta.items} قطعة` : '';
  }
  if (item.kind === 'session_ended') {
    return meta.minutes != null ? `${meta.minutes} دقيقة` : '';
  }
  if (item.kind === 'session_started') {
    return [meta.billingMode === 'fixed' ? 'مدة محددة' : 'مفتوحة', meta.deviceCode]
      .filter(Boolean)
      .join(' · ');
  }
  if (item.kind === 'stock_in' || item.kind === 'adjustment') {
    return [
      meta.qtyDelta != null ? `الكمية ${meta.qtyDelta > 0 ? '+' : ''}${meta.qtyDelta}` : null,
      meta.supplierName || null,
      meta.note || null,
    ]
      .filter(Boolean)
      .join(' · ');
  }
  if (item.kind === 'expense') {
    return [meta.category, meta.note].filter(Boolean).join(' · ');
  }
  return '';
}

function dayLabel(value) {
  if (!value) return '';
  return dateOf(`${value}T12:00:00Z`);
}

export function RecordsPage() {
  const toast = useToast();
  const [mode, setMode] = useState('day');
  const [date, setDate] = useState(() => dayOf());
  const [from, setFrom] = useState(() => dayOf());
  const [to, setTo] = useState(() => dayOf());
  const [exporting, setExporting] = useState(false);

  const params = useMemo(() => {
    if (mode === 'day') return { period: 'day', date };
    if (mode === 'month') return { period: 'month' };
    if (mode === 'all') return { period: 'all' };
    return { from, to };
  }, [mode, date, from, to]);

  const summaryQuery = useQuery({
    queryKey: ['reports', 'summary', params],
    queryFn: () => reportsApi.summary(params),
    refetchInterval: 60_000,
  });

  const recordsQuery = useQuery({
    queryKey: ['reports', 'records', params],
    queryFn: () => reportsApi.records({ ...params, limit: 500 }),
    refetchInterval: 60_000,
  });

  const summary = summaryQuery.data;
  const records = recordsQuery.data;
  const loading = summaryQuery.isLoading || recordsQuery.isLoading;
  const error = summaryQuery.error || recordsQuery.error;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const filename = await downloadCsv('/reports/records', params, 'records.csv');
      toast.success(`تم تصدير ${filename}`);
    } catch (exportError) {
      toast.error(apiError(exportError).message);
    } finally {
      setExporting(false);
    }
  };

  const rangeLabel = records?.range
    ? records.range.fromDate === records.range.toDate
      ? dayLabel(records.range.fromDate)
      : `${dayLabel(records.range.fromDate)} → ${dayLabel(records.range.toDate)}`
    : '';

  return (
    <div className="space-y-5">
      <PageHeader
        title="السجلات"
        subtitle="إيرادات الفترة وكل العمليات المالية والتشغيلية."
        action={
          <Button variant="secondary" onClick={exportCsv} loading={exporting}>
            <Download size={16} />
            تصدير CSV
          </Button>
        }
      />

      <Card className="p-3.5">
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="flex flex-wrap gap-1 rounded-lg border border-line/70 bg-surface2/40 p-0.5">
            {MODES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setMode(item.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[12px] font-medium transition',
                  mode === item.value
                    ? 'bg-accent/15 text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {mode === 'day' && (
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              containerClassName="w-40"
              aria-label="التاريخ"
            />
          )}

          {mode === 'custom' && (
            <>
              <Input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                containerClassName="w-40"
                aria-label="من"
              />
              <Input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                containerClassName="w-40"
                aria-label="إلى"
              />
            </>
          )}

          {rangeLabel && (
            <Badge tone="neutral" className="mb-1.5">
              <CalendarDays size={11} />
              {rangeLabel}
            </Badge>
          )}
        </div>
      </Card>

      {error ? (
        <ErrorState
          message={apiError(error).message}
          onRetry={() => {
            summaryQuery.refetch();
            recordsQuery.refetch();
          }}
        />
      ) : loading ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="skeleton h-[104px]" />
            ))}
          </div>
          <LoadingRows rows={5} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <StatCard
              label="الإيراد"
              value={money(summary.revenue.revenueMinor)}
              hint={`${summary.revenue.invoiceCount} فاتورة`}
              icon={Banknote}
              tone="success"
            />
            <StatCard
              label="وقت اللعب"
              value={money(summary.revenue.gamingMinor)}
              hint={`${summary.revenue.gamingMinutes} دقيقة`}
              icon={Gamepad2}
              tone="accent"
            />
            <StatCard
              label="الكافيتريا"
              value={money(summary.revenue.cafeteriaMinor)}
              icon={Coffee}
              tone="cyan"
            />
            <StatCard
              label="تكلفة المنتجات"
              value={money(summary.costs.cogsMinor)}
              icon={Receipt}
              tone="neutral"
            />
            <StatCard
              label="المصروفات"
              value={money(summary.expenses.totalMinor)}
              hint={`${summary.expenses.count} مصروف`}
              icon={Wallet}
              tone="warning"
            />
            <StatCard
              label="الصافي"
              value={money(summary.netMinor)}
              hint={`متوسط الفاتورة ${money(summary.revenue.averageInvoiceMinor)}`}
              icon={TrendingUp}
              tone={summary.netMinor >= 0 ? 'success' : 'danger'}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
            <Card className="p-4">
              <SectionTitle
                title="سجل العمليات"
                description={
                  records?.count
                    ? `${records.count} عملية${records.truncated ? ' (أحدث 500)' : ''}`
                    : 'لا عمليات في هذه الفترة'
                }
                action={<History size={17} className="text-muted" />}
              />

              {records.items.length === 0 ? (
                <EmptyState
                  icon={History}
                  title="لا عمليات"
                  description="غيّر الفترة أو ابدأ جلسة/بيعًا لتظهر العمليات هنا."
                  className="mt-3"
                />
              ) : (
                <div className="mt-3 space-y-1.5">
                  {records.items.map((item, index) => {
                    const meta = KIND_META[item.kind] || KIND_META.adjustment;
                    const Icon = meta.icon;
                    return (
                      <div
                        key={`${item.ref?.type}-${item.ref?.id}-${item.kind}-${index}`}
                        className="flex items-start gap-2.5 rounded-lg border border-line/60 bg-surface2/30 px-3 py-2"
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                            meta.tone,
                          )}
                        >
                          <Icon size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                            <p className="min-w-0 truncate text-[12px] font-medium text-ink">
                              {item.title}
                              {item.playerName && (
                                <span className="mr-1.5 text-[10.5px] font-normal text-muted">
                                  · {item.playerName}
                                </span>
                              )}
                            </p>
                            {item.amountMinor != null && (
                              <span
                                className={cn(
                                  'shrink-0 font-mono text-[12px] font-semibold',
                                  item.kind === 'expense'
                                    ? 'text-danger'
                                    : item.kind === 'stock_in'
                                      ? 'text-muted'
                                      : 'text-accent',
                                )}
                              >
                                {item.kind === 'expense' ? '−' : ''}
                                {money(item.amountMinor)}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-muted">
                            <span className="font-mono">{timeOf(item.at)}</span>
                            <span>· {meta.label}</span>
                            {item.ref?.number && (
                              <span className="font-mono text-muted/80">
                                · {item.ref.number}
                              </span>
                            )}
                            {metaLine(item) && <span>· {metaLine(item)}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <div className="space-y-5">
              <Card className="p-4">
                <SectionTitle
                  title="ملخص الفترة"
                  description="من الفواتير الصادرة في الفترة المحددة"
                />
                <div className="mt-3 space-y-1.5 text-[12.5px]">
                  <div className="flex justify-between py-1 text-muted">
                    <span>إجمالي الإيراد</span>
                    <span className="font-mono text-ink">
                      {money(summary.revenue.revenueMinor)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-muted">
                    <span>وقت اللعب</span>
                    <span className="font-mono text-ink">
                      {money(summary.revenue.gamingMinor)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-muted">
                    <span>الكافيتريا</span>
                    <span className="font-mono text-ink">
                      {money(summary.revenue.cafeteriaMinor)}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 text-muted">
                    <span>تعديلات يدوية</span>
                    <span className="font-mono text-warning">
                      {money(summary.revenue.adjustmentMinor)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-line/60 py-2 text-muted">
                    <span>تكلفة المنتجات</span>
                    <span className="font-mono text-ink">{money(summary.costs.cogsMinor)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-muted">
                    <span>المصروفات</span>
                    <span className="font-mono text-warning">
                      {money(summary.expenses.totalMinor)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-line/60 pt-2">
                    <span className="font-semibold text-ink">الصافي</span>
                    <span
                      className={cn(
                        'font-mono text-xl font-semibold',
                        summary.netMinor >= 0 ? 'text-success' : 'text-danger',
                      )}
                    >
                      {money(summary.netMinor)}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <SectionTitle
                  title="حركة اليوم"
                  description="إجماليات سريعة للعمليات"
                />
                <div className="mt-2 space-y-1.5 text-[12px]">
                  <div className="flex justify-between py-1 text-muted">
                    <span>مبيعات نقدية</span>
                    <span className="font-mono text-ink">{money(summary.cashMinor)}</span>
                  </div>
                  <div className="flex justify-between py-1 text-muted">
                    <span>عدد الفواتير</span>
                    <span className="font-mono text-ink">{summary.revenue.invoiceCount}</span>
                  </div>
                  <div className="flex justify-between py-1 text-muted">
                    <span>عدد العمليات</span>
                    <span className="font-mono text-ink">{records.count}</span>
                  </div>
                  <div className="flex justify-between py-1 text-muted">
                    <span>أيام الفترة</span>
                    <span className="font-mono text-ink">{records.range.days}</span>
                  </div>
                </div>
                {summary.expenses.byCategory.length > 0 && (
                  <div className="mt-3 border-t border-line/60 pt-3">
                    <p className="mb-1.5 text-[11px] font-medium text-muted">
                      المصروفات حسب التصنيف
                    </p>
                    <div className="space-y-1">
                      {summary.expenses.byCategory.slice(0, 5).map((row) => (
                        <div
                          key={row.category}
                          className="flex items-center justify-between text-[11px]"
                        >
                          <span className="truncate text-muted">{row.category}</span>
                          <span className="font-mono text-ink">{money(row.amountMinor)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
