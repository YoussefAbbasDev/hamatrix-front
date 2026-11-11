import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Minus,
  Pencil,
  Plus,
  Receipt,
  ShoppingBag,
  Timer,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { visitsApi, sessionsApi } from '../api/visits.js';
import { productsApi } from '../api/products.js';
import { PageHeader, EmptyState } from '../components/ui/PageHeader.jsx';
import { Card, SectionTitle, Badge } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Textarea } from '../components/ui/Select.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { ErrorState, LoadingRows } from '../components/ui/States.jsx';
import { VisitStatusBadge } from '../components/common/StatusBadge.jsx';
import { StartSessionModal } from '../components/common/StartSessionModal.jsx';
import { SessionRow } from '../components/visits/SessionRow.jsx';
import { CheckoutModal } from '../components/visits/CheckoutModal.jsx';
import { ProductBrowser } from '../components/products/ProductBrowser.jsx';
import { apiError } from '../lib/http.js';
import { liveBilling } from '../lib/billing.js';
import { dateTimeOf, money, timeOf } from '../lib/format.js';
import { useNow } from '../hooks/useNow.js';
import { useToast } from '../providers/ToastProvider.jsx';
import { cn } from '../lib/cn.js';

export function VisitPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const now = useNow();

  const [startOpen, setStartOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ playerName: '', notes: '' });
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [endTarget, setEndTarget] = useState(null);
  const [abandonOpen, setAbandonOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyItem, setBusyItem] = useState(null);
  const [dismissedOverdue, setDismissedOverdue] = useState({});

  const visitQuery = useQuery({
    queryKey: ['visit', id],
    queryFn: () => visitsApi.get(id),
    refetchInterval: 15_000,
    enabled: Boolean(id),
  });

  const productsQuery = useQuery({
    queryKey: ['products', { limit: 100, isActive: 'true' }],
    queryFn: () => productsApi.list({ limit: 100, isActive: 'true', sort: 'name' }),
  });

  const categoriesQuery = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productsApi.categories.list(),
    staleTime: 5 * 60_000,
  });

  const visit = visitQuery.data;
  const open = visit?.status === 'open';
  const products = productsQuery.data?.products || [];

  const overdueSession = useMemo(() => {
    if (!visit || !open) return null;
    return (visit.sessions || []).find((session) => {
      if (session.status !== 'active' || session.billingMode !== 'fixed') return false;
      if (dismissedOverdue[session.id]) return false;
      const live = liveBilling(session, {
        fetchedAt: visitQuery.dataUpdatedAt,
        now,
      });
      return live.isOverdue;
    });
  }, [visit, open, now, visitQuery.dataUpdatedAt, dismissedOverdue]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['visit', id] }),
      queryClient.invalidateQueries({ queryKey: ['visits'] }),
      queryClient.invalidateQueries({ queryKey: ['devices'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };

  const refreshReservations = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };

  const applyVisit = (updated) => {
    queryClient.setQueryData(['visit', id], updated);
    queryClient.invalidateQueries({ queryKey: ['visits'] });
  };

  const addItem = async (product) => {
    setBusyItem(product.id);
    try {
      const updated = await visitsApi.addItem(id, { productId: product.id, qty: 1 });
      applyVisit(updated);
      refreshReservations();
      toast.success(`أُضيف ${product.name}`);
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setBusyItem(null);
    }
  };

  const changeQty = async (item, qty) => {
    setBusyItem(item.id);
    try {
      if (qty < 1) {
        const updated = await visitsApi.removeItem(id, item.id);
        applyVisit(updated);
      } else {
        const updated = await visitsApi.updateItem(id, item.id, qty);
        applyVisit(updated);
      }
      refreshReservations();
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setBusyItem(null);
    }
  };

  const sessionAction = async (action, session, successMessage) => {
    setBusy(true);
    try {
      await action();
      toast.success(successMessage);
      await refresh();
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const endSession = async (session) => {
    await sessionAction(
      () => sessionsApi.end(session.id),
      session,
      'تم إنهاء جلسة اللعب. الزيارة ما زالت مفتوحة.',
    );
    setEndTarget(null);
    setDismissedOverdue((current) => ({ ...current, [session.id]: true }));
  };

  const saveVisitInfo = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      const updated = await visitsApi.update(id, {
        playerName: editForm.playerName.trim(),
        notes: editForm.notes.trim(),
      });
      applyVisit(updated);
      toast.success('تم تحديث بيانات الزيارة');
      setEditOpen(false);
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setBusy(false);
    }
  };

  const abandonVisit = async () => {
    setBusy(true);
    try {
      await visitsApi.remove(id);
      await queryClient.invalidateQueries({ queryKey: ['visits'] });
      toast.success('تم إلغاء الزيارة');
      navigate('/visits');
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setBusy(false);
    }
  };

  if (visitQuery.isError) {
    return (
      <div className="space-y-4">
        <PageHeader title="الزيارة" subtitle="تعذر تحميل بيانات الزيارة" />
        <ErrorState
          message={apiError(visitQuery.error).message}
          onRetry={() => visitQuery.refetch()}
        />
        <Button as={Link} to="/visits" variant="secondary">
          <ArrowRight size={15} />
          العودة للزيارات
        </Button>
      </div>
    );
  }

  if (visitQuery.isLoading || !visit) {
    return (
      <div className="space-y-5">
        <PageHeader title="الزيارة" subtitle="جارٍ التحميل…" />
        <LoadingRows rows={4} />
      </div>
    );
  }

  const totals = visit.totals;
  const canCheckout = open && totals.computedTotalMinor > 0;

  return (
    <div className="space-y-5">
      <div>
        <Link
          to="/visits"
          className="mb-3 inline-flex items-center gap-1.5 text-[12px] text-muted hover:text-ink"
        >
          <ArrowRight size={14} />
          كل الزيارات
        </Link>

        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              {visit.playerName || 'زيارة بدون اسم'}
              <VisitStatusBadge status={visit.status} />
            </span>
          }
          subtitle={
            <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <span className="font-mono">{visit.visitNumber}</span>
              <span>· فُتحت {timeOf(visit.openedAt)}</span>
              {visit.closedAt && <span>· أُغلقت {dateTimeOf(visit.closedAt)}</span>}
              {visit.notes && <span>· {visit.notes}</span>}
            </span>
          }
          action={
            <div className="flex flex-wrap items-center gap-2">
              {open && (
                <>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditForm({ playerName: visit.playerName || '', notes: visit.notes || '' });
                      setEditOpen(true);
                    }}
                  >
                    <Pencil size={15} />
                    تعديل
                  </Button>
                  <Button onClick={() => setStartOpen(true)}>
                    <Plus size={16} />
                    بدء جلسة
                  </Button>
                </>
              )}
              {open && visit.sessions.length === 0 && (
                <Button variant="ghost" onClick={() => setAbandonOpen(true)}>
                  <X size={15} />
                  إلغاء
                </Button>
              )}
            </div>
          }
        />
      </div>

      {!open && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-success/25 bg-success/5 px-4 py-3">
          <span className="flex items-center gap-2 text-[13px] text-success">
            <CheckCircle2 size={17} />
            تم تحصيل هذه الزيارة وإصدار الفاتورة.
          </span>
          <Link
            to="/invoices"
            className="text-[12.5px] font-medium text-accent hover:underline"
          >
            عرض الفواتير
          </Link>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <div className="space-y-5">
          <Card className="p-4">
            <SectionTitle
              title="جلسات اللعب"
              description={
                visit.sessions.length === 0
                  ? 'لم تبدأ أي جلسة في هذه الزيارة بعد.'
                  : `${visit.sessions.length} جلسة · ${money(totals.timeSubtotalMinor)}`
              }
              action={
                open ? (
                  <Button size="sm" variant="secondary" onClick={() => setStartOpen(true)}>
                    <Timer size={14} />
                    جلسة جديدة
                  </Button>
                ) : null
              }
            />

            <div className="mt-3 space-y-2.5">
              {visit.sessions.length === 0 ? (
                <EmptyState
                  icon={Timer}
                  title="لا جلسات"
                  description="ابدأ جلسة على جهاز متاح لتظهر هنا بعداد حي."
                  action={
                    open ? (
                      <Button size="sm" onClick={() => setStartOpen(true)}>
                        <Plus size={14} />
                        بدء جلسة
                      </Button>
                    ) : null
                  }
                  className="py-8"
                />
              ) : (
                visit.sessions.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    fetchedAt={visitQuery.dataUpdatedAt}
                    busy={busy}
                    onPause={(target) =>
                      sessionAction(
                        () => sessionsApi.pause(target.id),
                        target,
                        'تم إيقاف الجلسة مؤقتًا',
                      )
                    }
                    onResume={(target) =>
                      sessionAction(
                        () => sessionsApi.resume(target.id),
                        target,
                        'تم استئناف الجلسة',
                      )
                    }
                    onExtend={(target, minutes) =>
                      sessionAction(
                        () => sessionsApi.extend(target.id, minutes),
                        target,
                        `تم تمديد الجلسة ${minutes} دقيقة`,
                      )
                    }
                    onEnd={setEndTarget}
                  />
                ))
              )}
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle
              title="المنتجات"
              description={
                visit.items.length === 0
                  ? 'لا منتجات في هذه الزيارة.'
                  : `${visit.itemsCount} قطعة · ${money(totals.itemsSubtotalMinor)}`
              }
            />

            {visit.items.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="لا منتجات"
                description="أضف مشروبات أو وجبات من القائمة بالأسفل."
                className="mt-3 py-8"
              />
            ) : (
              <div className="mt-3 space-y-1.5">
                {visit.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line/70 bg-surface2/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-medium text-ink">{item.name}</p>
                      <p className="font-mono text-[10.5px] text-muted">
                        {money(item.unitPriceMinor)} × {item.qty}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-lg border border-line/70">
                        <button
                          type="button"
                          disabled={!open || busyItem === item.id}
                          onClick={() => changeQty(item, item.qty - 1)}
                          className="px-2 py-1 text-muted transition hover:text-ink disabled:opacity-40"
                          aria-label="تقليل الكمية"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="min-w-7 text-center font-mono text-[12px] text-ink">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          disabled={!open || busyItem === item.id}
                          onClick={() => changeQty(item, item.qty + 1)}
                          className="px-2 py-1 text-muted transition hover:text-ink disabled:opacity-40"
                          aria-label="زيادة الكمية"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <span className="min-w-16 text-left font-mono text-[12px] font-semibold text-ink">
                        {money(item.lineTotalMinor)}
                      </span>
                      {open && (
                        <button
                          type="button"
                          disabled={busyItem === item.id}
                          onClick={() => changeQty(item, 0)}
                          className="text-muted transition hover:text-danger disabled:opacity-40"
                          aria-label="حذف المنتج"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {open && (
            <Card className="p-4">
              <SectionTitle
                title="إضافة منتجات"
                description="المخزون يُحجز أثناء الزيارة ويُخصم عند التحصيل فقط."
              />
              <div className="mt-3">
                <ProductBrowser
                  products={products}
                  categories={categoriesQuery.data || []}
                  loading={productsQuery.isLoading}
                  onPick={addItem}
                  emptyTitle="لا منتجات مفعّلة"
                  emptyDescription="أضف منتجات من صفحة المنتجات أولًا."
                />
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card className="p-4 xl:sticky xl:top-20">
            <SectionTitle title="الفاتورة" description="الإجمالي النهائي قبل التحصيل" />

            <div className="mt-3 space-y-1.5 text-[12.5px]">
              <div className="flex justify-between py-1">
                <span className="flex items-center gap-1.5 text-muted">
                  <Clock3 size={13} />
                  وقت اللعب
                </span>
                <span className="font-mono text-ink">{money(totals.timeSubtotalMinor)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="flex items-center gap-1.5 text-muted">
                  <ShoppingBag size={13} />
                  المنتجات
                </span>
                <span className="font-mono text-ink">{money(totals.itemsSubtotalMinor)}</span>
              </div>
              <div className="flex justify-between border-t border-line/60 py-2 text-muted">
                <span>الإجمالي المحسوب</span>
                <span className="font-mono text-ink">
                  {money(totals.computedTotalMinor)}
                </span>
              </div>
              {totals.adjustmentMinor !== 0 && (
                <div className="flex justify-between py-1 text-muted">
                  <span>تعديل محفوظ</span>
                  <span className="font-mono text-warning">
                    {money(totals.adjustmentMinor)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-line/60 pt-3">
                <span className="text-[13px] font-semibold text-ink">الإجمالي</span>
                <span className="font-mono text-2xl font-semibold text-accent">
                  {money(totals.totalMinor)}
                </span>
              </div>
            </div>

            {open ? (
              <>
                <Button
                  className="mt-4 w-full"
                  size="lg"
                  disabled={!canCheckout}
                  onClick={() => setCheckoutOpen(true)}
                >
                  <Receipt size={17} />
                  تحصيل الزيارة
                </Button>
                {!canCheckout && (
                  <p className="mt-2 text-center text-[11px] text-muted">
                    أضف وقت لعب أو منتجات لبدء التحصيل.
                  </p>
                )}
                {visit.activeSession && (
                  <p className="mt-2 text-center text-[11px] text-warning">
                    الجلسة الجارية ستُنهى تلقائيًا عند التحصيل.
                  </p>
                )}
              </>
            ) : (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-success/25 bg-success/5 px-3 py-2.5 text-[12px] text-success">
                <CheckCircle2 size={15} />
                تم التحصيل
              </div>
            )}

            <div className="mt-4 border-t border-line/60 pt-3 text-[11.5px] text-muted">
              <div className="flex items-center justify-between py-0.5">
                <span>عدد الجلسات</span>
                <span className="font-mono text-ink">{visit.sessions.length}</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span>عدد القطع</span>
                <span className="font-mono text-ink">{visit.itemsCount}</span>
              </div>
              <div className="flex items-center justify-between py-0.5">
                <span>الدفع</span>
                <span className="text-ink">نقدي عند التحصيل</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle title="بيانات الزيارة" />
            <div className="mt-2 space-y-1.5 text-[12px]">
              <div className="flex items-center gap-2 text-muted">
                <User size={13} />
                <span className="text-ink">{visit.playerName || 'بدون اسم'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted">
                <Clock3 size={13} />
                <span className="text-ink">{dateTimeOf(visit.openedAt)}</span>
              </div>
              <Badge tone={open ? 'accent' : 'neutral'} className={cn('mt-1')}>
                {open ? 'قابلة للتعديل والتحصيل' : 'مغلقة نهائيًا'}
              </Badge>
            </div>
          </Card>
        </div>
      </div>

      <StartSessionModal
        open={startOpen}
        visitId={id}
        onClose={() => setStartOpen(false)}
      />

      <CheckoutModal
        open={checkoutOpen}
        visit={visit}
        onClose={() => {
          setCheckoutOpen(false);
          refresh();
        }}
        onCompleted={() => {
          refresh();
          refreshReservations();
        }}
      />

      <ConfirmDialog
        open={Boolean(endTarget)}
        onClose={() => setEndTarget(null)}
        onConfirm={() => endSession(endTarget)}
        title="إنهاء جلسة اللعب"
        description={`سيتم إيقاف عداد «${endTarget?.deviceName || ''}» وتحرير الجهاز. تبقى الزيارة مفتوحة لإضافة منتجات أو التحصيل.`}
        confirmLabel="إنهاء اللعب"
        loading={busy}
      />

      <ConfirmDialog
        open={abandonOpen}
        onClose={() => setAbandonOpen(false)}
        onConfirm={abandonVisit}
        title="إلغاء الزيارة"
        description="ستُحذف الزيارة الفارغة وتُلغى حجوزات المنتجات إن وجدت. لا يمكن التراجع."
        confirmLabel="إلغاء الزيارة"
        loading={busy}
      />

      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="تعديل بيانات الزيارة"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOpen(false)} disabled={busy}>
              إلغاء
            </Button>
            <Button type="submit" form="visit-info-form" loading={busy}>
              حفظ
            </Button>
          </>
        }
      >
        <form id="visit-info-form" onSubmit={saveVisitInfo} className="space-y-3.5">
          <Input
            label="اسم اللاعب (اختياري)"
            value={editForm.playerName}
            onChange={(event) =>
              setEditForm((current) => ({ ...current, playerName: event.target.value }))
            }
            maxLength={80}
          />
          <Textarea
            label="ملاحظات (اختياري)"
            value={editForm.notes}
            onChange={(event) =>
              setEditForm((current) => ({ ...current, notes: event.target.value }))
            }
            rows={3}
            maxLength={500}
          />
        </form>
      </Modal>

      <Modal
        open={Boolean(overdueSession)}
        onClose={() => {
          if (overdueSession) {
            setDismissedOverdue((current) => ({ ...current, [overdueSession.id]: true }));
          }
        }}
        title="انتهى الوقت المحدد"
        description={`جلسة ${overdueSession?.deviceName || ''} تجاوزت المدة. الوقت الإضافي يُحسب بنفس سعر الساعة.`}
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (overdueSession) {
                  setDismissedOverdue((current) => ({
                    ...current,
                    [overdueSession.id]: true,
                  }));
                }
              }}
            >
              استمرار
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => overdueSession && endSession(overdueSession)}
            >
              إنهاء الجلسة
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-muted">
          اللاعب مستمر في اللعب بعد المدة المحددة. اختر «استمرار» لإخفاء التنبيه ومتابعة
          الاحتساب، أو «إنهاء الجلسة» لتحرير الجهاز.
        </p>
      </Modal>
    </div>
  );
}
