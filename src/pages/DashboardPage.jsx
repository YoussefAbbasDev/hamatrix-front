import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  Boxes,
  Clock3,
  Coffee,
  Gamepad2,
  Monitor,
  Plus,
  Receipt,
  ShoppingCart,
  Timer,
  TrendingUp,
  Wrench,
} from 'lucide-react';
import { t } from '../lib/strings.js';
import { reportsApi } from '../api/reports.js';
import { devicesApi } from '../api/devices.js';
import { visitsApi } from '../api/visits.js';
import { PageHeader } from '../components/ui/PageHeader.jsx';
import { Card, SectionTitle, Badge } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { StatCard } from '../components/ui/StatCard.jsx';
import { EmptyState } from '../components/ui/PageHeader.jsx';
import { LoadingRows, ErrorState } from '../components/ui/States.jsx';
import { DeviceStatusBadge } from '../components/common/StatusBadge.jsx';
import { StartSessionModal } from '../components/common/StartSessionModal.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { cn } from '../lib/cn.js';
import { apiError } from '../lib/http.js';
import { dateOf, money, durationOf, timeOf, shortDateOf } from '../lib/format.js';
import { liveBilling } from '../lib/billing.js';
import { useNow } from '../hooks/useNow.js';
import { useToast } from '../providers/ToastProvider.jsx';

const FILTERS = [
  { value: 'all', label: 'الكل' },
  { value: 'available', label: 'متاح' },
  { value: 'occupied', label: 'مشغول' },
  { value: 'maintenance', label: 'صيانة' },
];

const STATUS_STYLES = {
  available: 'border-success/30 bg-success/5 hover:border-success/50',
  occupied: 'border-accent/35 bg-accent/5 hover:border-accent/60',
  maintenance: 'border-line bg-surface2/30 hover:border-line',
};

function DeviceTile({ device, playerName, fetchedAt, onStart, onOpenVisit, onFinishMaintenance }) {
  const now = useNow();
  const session = device.currentSession;
  const live = session ? liveBilling(session, { fetchedAt, now }) : null;

  const onClick = () => {
    if (device.status === 'available' && device.isActive) onStart(device);
    else if (device.status === 'occupied' && session?.visitId) onOpenVisit(session.visitId);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col rounded-xl border p-4 text-right transition duration-200',
        STATUS_STYLES[device.status] || STATUS_STYLES.maintenance,
        device.status !== 'maintenance' && device.isActive && 'hover:-translate-y-0.5 hover:shadow-glow-sm',
        (!device.isActive || device.status === 'maintenance') && 'cursor-default',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border',
            device.status === 'occupied'
              ? 'border-accent/30 bg-accent/10 text-accent'
              : 'border-line/70 bg-surface2/60 text-muted',
          )}
        >
          <Monitor size={17} />
        </span>
        <div className="flex flex-col items-end gap-1">
          <DeviceStatusBadge status={device.status} />
          {!device.isActive && <Badge tone="neutral">معطّل</Badge>}
        </div>
      </div>

      <p className="mt-3 truncate text-[14px] font-semibold text-ink">{device.name}</p>
      <p className="mt-0.5 text-[11px] text-muted">
        {device.code} · {device.type}
      </p>

      {session && live ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-surface/60 px-2 py-1.5">
            <p className="text-[9.5px] text-muted">الوقت</p>
            <p
              className={cn(
                'font-mono text-[13px] font-semibold',
                session.status === 'paused' ? 'text-warning' : 'text-ink',
              )}
            >
              {durationOf(live.activeSeconds)}
            </p>
          </div>
          <div className="rounded-lg bg-surface/60 px-2 py-1.5">
            <p className="text-[9.5px] text-muted">التكلفة</p>
            <p className="font-mono text-[13px] font-semibold text-accent">
              {money(live.timeChargeMinor)}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-surface/50 px-2.5 py-2">
          <span className="text-[11px] text-muted">سعر الساعة</span>
          <span className="font-mono text-[12.5px] font-semibold text-ink">
            {money(device.hourlyPriceMinor)}
          </span>
        </div>
      )}

      {device.status === 'occupied' && (
        <p className="mt-2 truncate text-[11px] text-muted">
          {playerName ? `اللاعب: ${playerName}` : 'بدون اسم'} · اضغط لفتح الزيارة
        </p>
      )}
      {device.status === 'available' && device.isActive && (
        <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-success">
          <Plus size={11} /> اضغط لبدء جلسة
        </p>
      )}
      {device.status === 'maintenance' && (
        <span
          role="button"
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            onFinishMaintenance(device);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onFinishMaintenance(device);
          }}
          className="mt-2 flex items-center gap-1 text-[11px] font-medium text-muted hover:text-ink"
        >
          <Wrench size={11} /> إنهاء الصيانة
        </span>
      )}
    </button>
  );
}

function RevenueChart({ series }) {
  if (!series?.length) return null;

  return (
    <div className="h-[178px] w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(var(--accent-rgb))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="rgb(var(--accent-rgb))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgb(var(--line-rgb))" strokeOpacity={0.4} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value) => value.slice(5)}
            tick={{ fill: 'rgb(var(--muted-rgb))', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(value) => String(Math.round(value / 100))}
            tick={{ fill: 'rgb(var(--muted-rgb))', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={34}
          />
          <Tooltip
            formatter={(value) => [money(value), 'الإيراد']}
            labelFormatter={(value) => shortDateOf(`${value}T12:00:00`)}
            contentStyle={{
              background: 'rgb(var(--surface-rgb))',
              border: '1px solid rgb(var(--line-rgb))',
              borderRadius: 10,
              fontSize: 12,
              direction: 'rtl',
            }}
          />
          <Area
            type="monotone"
            dataKey="revenueMinor"
            stroke="rgb(var(--accent-rgb))"
            strokeWidth={2}
            fill="url(#revenueFill)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState('all');
  const [startDevice, setStartDevice] = useState(null);
  const [maintenanceTarget, setMaintenanceTarget] = useState(null);
  const [working, setWorking] = useState(false);

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: reportsApi.dashboard,
    refetchInterval: 20_000,
  });

  const devicesQuery = useQuery({
    queryKey: ['devices', { limit: 100, sort: 'code' }],
    queryFn: () => devicesApi.list({ limit: 100, sort: 'code' }),
    refetchInterval: 20_000,
  });

  const chartsQuery = useQuery({
    queryKey: ['dashboard', 'charts', 7],
    queryFn: () => reportsApi.charts(7),
    staleTime: 5 * 60_000,
  });

  const dashboard = dashboardQuery.data;
  const devices = devicesQuery.data?.devices || [];

  const playerByVisit = useMemo(() => {
    const map = new Map();
    for (const visit of dashboard?.openVisits || []) map.set(visit.id, visit.playerName);
    return map;
  }, [dashboard?.openVisits]);

  const filteredDevices = useMemo(
    () => (filter === 'all' ? devices : devices.filter((device) => device.status === filter)),
    [devices, filter],
  );

  const deviceCounts = dashboard?.devices || { total: 0, available: 0, occupied: 0, maintenance: 0 };
  const today = dashboard?.today || {};
  const loading = dashboardQuery.isLoading || devicesQuery.isLoading;
  const error = dashboardQuery.error || devicesQuery.error;

  const createVisit = async () => {
    setWorking(true);
    try {
      const visit = await visitsApi.create({});
      await queryClient.invalidateQueries({ queryKey: ['visits'] });
      navigate(`/visits/${visit.id}`);
    } catch (createError) {
      toast.error(apiError(createError).message);
    } finally {
      setWorking(false);
    }
  };

  const finishMaintenance = async () => {
    if (!maintenanceTarget) return;
    setWorking(true);
    try {
      await devicesApi.completeMaintenance(maintenanceTarget.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['devices'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
      toast.success('تم إنهاء الصيانة');
      setMaintenanceTarget(null);
    } catch (finishError) {
      toast.error(apiError(finishError).message);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t.dashboard.title}
        subtitle={`${dateOf()} · ${t.dashboard.subtitle}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/pos')}>
              <ShoppingCart size={16} />
              بيع سريع
            </Button>
            <Button onClick={createVisit} loading={working}>
              <Plus size={16} />
              زيارة جديدة
            </Button>
          </div>
        }
      />

      {error ? (
        <ErrorState
          message={apiError(error).message}
          onRetry={() => {
            dashboardQuery.refetch();
            devicesQuery.refetch();
          }}
        />
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="skeleton h-[104px]" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              label="إيراد اليوم"
              value={money(today.revenueMinor)}
              hint={`${today.invoiceCount || 0} فاتورة`}
              icon={Banknote}
              tone="success"
            />
            <StatCard
              label="وقت اللعب"
              value={money(today.gamingMinor)}
              hint={`${today.gamingMinutes || 0} دقيقة لعب`}
              icon={Gamepad2}
              tone="accent"
            />
            <StatCard
              label="الكافيتريا"
              value={money(today.cafeteriaMinor)}
              hint="منتجات ومشروبات"
              icon={Coffee}
              tone="cyan"
            />
            <StatCard
              label="صافي اليوم"
              value={money(today.netMinor)}
              hint={`مصروفات ${money(today.expensesMinor)} · تكلفة ${money(today.cogsMinor)}`}
              icon={TrendingUp}
              tone={(today.netMinor || 0) >= 0 ? 'success' : 'danger'}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
            <div className="space-y-5">
              <Card className="p-4">
                <SectionTitle
                  title="الأجهزة"
                  description={`${deviceCounts.total} جهاز · ${deviceCounts.available} متاح · ${deviceCounts.occupied} مشغول`}
                  action={
                    <Button size="sm" variant="ghost" as={Link} to="/devices">
                      إدارة
                      <ArrowLeft size={14} />
                    </Button>
                  }
                />

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {FILTERS.map((item) => {
                    const count =
                      item.value === 'all' ? deviceCounts.total : deviceCounts[item.value] || 0;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setFilter(item.value)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition',
                          filter === item.value
                            ? 'border-accent/40 bg-accent/10 text-accent'
                            : 'border-line/70 bg-surface2/40 text-muted hover:text-ink',
                        )}
                      >
                        {item.label}
                        <span className="mr-1 font-mono text-[10.5px] opacity-70">{count}</span>
                      </button>
                    );
                  })}
                </div>

                {filteredDevices.length === 0 ? (
                  <EmptyState
                    className="mt-4"
                    icon={Monitor}
                    title={devices.length === 0 ? 'لا توجد أجهزة بعد' : 'لا أجهزة بهذه الحالة'}
                    description={
                      devices.length === 0
                        ? 'أضف أول جهاز لتستطيع بدء الجلسات.'
                        : 'غيّر الفلتر لعرض أجهزة أخرى.'
                    }
                    action={
                      devices.length === 0 ? (
                        <Button size="sm" onClick={() => navigate('/devices')}>
                          <Plus size={15} />
                          إضافة جهاز
                        </Button>
                      ) : null
                    }
                  />
                ) : (
                  <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                    {filteredDevices.map((device) => (
                      <DeviceTile
                        key={device.id}
                        device={device}
                        fetchedAt={devicesQuery.dataUpdatedAt}
                        playerName={
                          device.currentSession
                            ? playerByVisit.get(device.currentSession.visitId)
                            : ''
                        }
                        onStart={setStartDevice}
                        onOpenVisit={(visitId) => navigate(`/visits/${visitId}`)}
                        onFinishMaintenance={setMaintenanceTarget}
                      />
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-4">
                <SectionTitle
                  title="إيراد آخر 7 أيام"
                  description="الإيراد اليومي من الفواتير الصادرة"
                  action={
                    <Badge tone="accent">
                      <Clock3 size={11} /> مباشر
                    </Badge>
                  }
                />
                {chartsQuery.isLoading ? (
                  <div className="skeleton mt-3 h-[178px]" />
                ) : (
                  <div className="mt-2">
                    <RevenueChart series={chartsQuery.data?.revenueSeries} />
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-5">
              <Card className="p-4">
                <SectionTitle
                  title="الزيارات المفتوحة"
                  description={`${dashboard?.openVisits?.length || 0} زيارة تحت التحصيل`}
                  action={
                    <Button size="sm" variant="ghost" as={Link} to="/visits">
                      الكل
                      <ArrowLeft size={14} />
                    </Button>
                  }
                />
                <div className="mt-3 space-y-2">
                  {(dashboard?.openVisits || []).length === 0 ? (
                    <EmptyState icon={Receipt} title="لا زيارات مفتوحة" className="py-7" />
                  ) : (
                    dashboard.openVisits.slice(0, 6).map((visit) => (
                      <Link
                        key={visit.id}
                        to={`/visits/${visit.id}`}
                        className="block rounded-lg border border-line/70 bg-surface2/40 px-3 py-2.5 transition hover:border-accent/40"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[12.5px] font-semibold text-ink">
                            {visit.playerName || visit.visitNumber}
                          </span>
                          <span className="shrink-0 font-mono text-[12.5px] font-semibold text-accent">
                            {money(visit.totals.totalMinor)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10.5px] text-muted">
                          <span className="flex items-center gap-1">
                            <Clock3 size={10} />
                            {timeOf(visit.openedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Timer size={10} />
                            {visit.activeSession
                              ? `${visit.activeSession.deviceName} · ${visit.sessions.length} جلسة`
                              : 'بدون جلسة جارية'}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <SectionTitle
                  title="تنبيهات المخزون"
                  description={`${dashboard?.lowStock?.length || 0} منتج منخفض`}
                  action={
                    <Button size="sm" variant="ghost" as={Link} to="/inventory">
                      المخزون
                      <ArrowLeft size={14} />
                    </Button>
                  }
                />
                <div className="mt-3 space-y-2">
                  {(dashboard?.lowStock || []).length === 0 ? (
                    <EmptyState icon={Boxes} title="المخزون بحال جيدة" className="py-7" />
                  ) : (
                    dashboard.lowStock.slice(0, 5).map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2"
                      >
                        <span className="flex min-w-0 items-center gap-1.5">
                          <AlertTriangle size={13} className="shrink-0 text-warning" />
                          <span className="truncate text-[12px] text-ink">{product.name}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[11.5px] text-warning">
                          {product.stockQty} / {product.minStockQty}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </Card>

              <Card className="p-4">
                <SectionTitle
                  title="آخر الفواتير"
                  description="أحدث العمليات المالية"
                  action={
                    <Button size="sm" variant="ghost" as={Link} to="/invoices">
                      الكل
                      <ArrowLeft size={14} />
                    </Button>
                  }
                />
                <div className="mt-3 space-y-1.5">
                  {(dashboard?.recent || []).length === 0 ? (
                    <EmptyState icon={Receipt} title="لا فواتير بعد" className="py-7" />
                  ) : (
                    dashboard.recent.slice(0, 5).map((invoice) => (
                      <Link
                        key={invoice.id}
                        to="/invoices"
                        className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-surface2/50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-mono text-[11.5px] text-ink">
                            {invoice.invoiceNumber}
                          </span>
                          <span className="block text-[10.5px] text-muted">
                            {invoice.playerName || 'بدون اسم'} · {timeOf(invoice.issuedAt)}
                          </span>
                        </span>
                        <span className="shrink-0 font-mono text-[12px] font-semibold text-accent">
                          {money(invoice.totalMinor)}
                        </span>
                      </Link>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </div>
        </>
      )}

      <StartSessionModal
        open={Boolean(startDevice)}
        device={startDevice}
        onClose={() => setStartDevice(null)}
      />

      <ConfirmDialog
        open={Boolean(maintenanceTarget)}
        onClose={() => setMaintenanceTarget(null)}
        onConfirm={finishMaintenance}
        title="إنهاء صيانة الجهاز"
        description={`سيصبح «${maintenanceTarget?.name || ''}» متاحًا لبدء الجلسات.`}
        confirmLabel="إنهاء الصيانة"
        tone="primary"
        loading={working}
      />
    </div>
  );
}
