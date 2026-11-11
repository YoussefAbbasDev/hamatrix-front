import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock3, Plus, Receipt, Search, Timer, User } from 'lucide-react';
import { visitsApi } from '../api/visits.js';
import { PageHeader, EmptyState } from '../components/ui/PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { LoadingRows, ErrorState } from '../components/ui/States.jsx';
import { VisitStatusBadge } from '../components/common/StatusBadge.jsx';
import { apiError } from '../lib/http.js';
import { money, timeOf, durationOf } from '../lib/format.js';
import { liveBilling } from '../lib/billing.js';
import { useNow } from '../hooks/useNow.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useToast } from '../providers/ToastProvider.jsx';
import { cn } from '../lib/cn.js';

const TABS = [
  { value: 'open', label: 'مفتوحة' },
  { value: 'closed', label: 'مغلقة' },
  { value: '', label: 'الكل' },
];

export function VisitsPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const now = useNow();

  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setPage(1);
  }, [status, debouncedSearch]);

  const query = useQuery({
    queryKey: ['visits', { page, status, q: debouncedSearch }],
    queryFn: () =>
      visitsApi.list({
        page,
        limit: 20,
        sort: '-openedAt',
        ...(status ? { status } : {}),
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
      }),
    refetchInterval: 20_000,
  });

  const visits = query.data?.visits || [];

  const newVisit = async () => {
    setCreating(true);
    try {
      const visit = await visitsApi.create({});
      queryClient.invalidateQueries({ queryKey: ['visits'] });
      navigate(`/visits/${visit.id}`);
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="الزيارات"
        subtitle="كل زيارة تجمع وقت اللعب والمشتريات في فاتورة واحدة."
        action={
          <Button onClick={newVisit} loading={creating}>
            <Plus size={16} />
            زيارة جديدة
          </Button>
        }
      />

      <Card className="p-3.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex rounded-lg border border-line/70 bg-surface2/40 p-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatus(tab.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[12px] font-medium transition',
                  status === tab.value
                    ? 'bg-accent/15 text-accent'
                    : 'text-muted hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <Input
            icon={Search}
            placeholder="بحث باسم اللاعب أو رقم الزيارة…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            containerClassName="min-w-[200px] flex-1"
          />
        </div>
      </Card>

      {query.isError ? (
        <ErrorState message={apiError(query.error).message} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <LoadingRows rows={4} />
      ) : visits.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={search ? 'لا نتائج' : 'لا زيارات'}
          description={
            search
              ? 'جرّب بحثًا آخر أو غيّر التبويب.'
              : 'ابدأ زيارة جديدة أو شغّل جهازًا من الرئيسية.'
          }
          action={
            !search ? (
              <Button size="sm" onClick={newVisit} loading={creating}>
                <Plus size={15} />
                زيارة جديدة
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-2.5">
          {visits.map((visit) => {
            const live = visit.activeSession
              ? liveBilling(visit.activeSession, { fetchedAt: query.dataUpdatedAt, now })
              : null;

            return (
              <Link
                key={visit.id}
                to={`/visits/${visit.id}`}
                className="card card-hover block p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-line/70 bg-surface2/60 text-muted">
                      {visit.activeSession ? <Timer size={17} /> : <Receipt size={17} />}
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-ink">
                        {visit.playerName || 'بدون اسم'}
                        <VisitStatusBadge status={visit.status} />
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-muted">
                        <span className="font-mono">{visit.visitNumber}</span>
                        <span className="flex items-center gap-1">
                          <Clock3 size={10} />
                          {timeOf(visit.openedAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <User size={10} />
                          {visit.sessions.length} جلسة
                        </span>
                        <span>{visit.itemsCount} قطعة</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {live && (
                      <div className="text-left">
                        <p className="font-mono text-[12px] text-ink">
                          {durationOf(live.activeSeconds)}
                        </p>
                        <p className="text-[10.5px] text-muted">
                          {visit.activeSession.deviceName}
                          {visit.activeSession.status === 'paused' ? ' · موقوفة' : ''}
                        </p>
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-mono text-[14px] font-semibold text-accent">
                        {money(visit.totals.totalMinor)}
                      </p>
                      <p className="text-[10.5px] text-muted">إجمالي الزيارة</p>
                    </div>
                    <ArrowLeft size={16} className="text-muted/60" />
                  </div>
                </div>
              </Link>
            );
          })}

          <Pagination pagination={query.data?.pagination} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
