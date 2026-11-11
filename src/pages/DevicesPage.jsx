import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Monitor,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wrench,
  CheckCircle2,
} from 'lucide-react';
import { DEVICE_TYPES } from '../lib/enums.js';
import { devicesApi } from '../api/devices.js';
import { PageHeader, EmptyState } from '../components/ui/PageHeader.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Input.jsx';
import { Select, Textarea } from '../components/ui/Select.jsx';
import { MoneyInput } from '../components/ui/MoneyInput.jsx';
import { Switch } from '../components/ui/Switch.jsx';
import { Modal } from '../components/ui/Modal.jsx';
import { ConfirmDialog } from '../components/ui/ConfirmDialog.jsx';
import { Pagination } from '../components/ui/Pagination.jsx';
import { LoadingRows, ErrorState } from '../components/ui/States.jsx';
import { DeviceStatusBadge } from '../components/common/StatusBadge.jsx';
import { apiError } from '../lib/http.js';
import { money, durationOf } from '../lib/format.js';
import { liveBilling } from '../lib/billing.js';
import { useNow } from '../hooks/useNow.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';
import { useToast } from '../providers/ToastProvider.jsx';
import { cn } from '../lib/cn.js';

const TYPE_OPTIONS = DEVICE_TYPES.map((type) => ({ value: type, label: type }));

const EMPTY_FORM = {
  name: '',
  code: '',
  type: 'PC',
  hourlyPriceMinor: 3000,
  description: '',
  isActive: true,
  pricingOptions: [],
};

function deviceToForm(device) {
  return {
    name: device.name,
    code: device.code,
    type: device.type,
    hourlyPriceMinor: device.hourlyPriceMinor,
    description: device.description || '',
    isActive: device.isActive,
    pricingOptions: (device.pricingOptions || []).map((option) => ({ ...option })),
  };
}

function DeviceFormModal({ open, onClose, device, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(device ? deviceToForm(device) : EMPTY_FORM);
  }, [open, device]);

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const updateOption = (index, patch) => {
    setForm((current) => ({
      ...current,
      pricingOptions: current.pricingOptions.map((option, itemIndex) =>
        itemIndex === index ? { ...option, ...patch } : option,
      ),
    }));
  };

  const addOption = () => {
    setForm((current) => ({
      ...current,
      pricingOptions: [
        ...current.pricingOptions,
        {
          key: `opt${current.pricingOptions.length + 1}`,
          name: '',
          pricePerHourMinor: current.hourlyPriceMinor,
        },
      ],
    }));
  };

  const removeOption = (index) => {
    setForm((current) => ({
      ...current,
      pricingOptions: current.pricingOptions
        .filter((_, itemIndex) => itemIndex !== index)
        .map((option, itemIndex) => ({ ...option, key: option.key || `opt${itemIndex + 1}` })),
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('اسم الجهاز مطلوب');
      return;
    }
    if (!form.hourlyPriceMinor || form.hourlyPriceMinor < 1) {
      setError('سعر الساعة يجب أن يكون أكبر من صفر');
      return;
    }

    const options = form.pricingOptions.map((option, index) => ({
      key: option.key || `opt${index + 1}`,
      name: option.name.trim(),
      pricePerHourMinor: option.pricePerHourMinor,
    }));

    if (options.some((option) => !option.name)) {
      setError('اكتب اسمًا لكل خيار تسعير');
      return;
    }
    if (options.some((option) => !option.pricePerHourMinor || option.pricePerHourMinor < 1)) {
      setError('سعر كل خيار تسعير يجب أن يكون أكبر من صفر');
      return;
    }
    if (new Set(options.map((option) => option.key)).size !== options.length) {
      setError('مفاتيح التسعير مكررة. احذف الخيار وأضفه من جديد.');
      return;
    }

    const payload = {
      name: form.name.trim(),
      type: form.type,
      hourlyPriceMinor: form.hourlyPriceMinor,
      description: form.description.trim(),
      isActive: form.isActive,
      pricingOptions: options,
    };
    if (form.code.trim()) payload.code = form.code.trim();

    setSaving(true);
    try {
      if (device) await devicesApi.update(device.id, payload);
      else await devicesApi.create(payload);
      toast.success(device ? 'تم تحديث الجهاز' : 'تمت إضافة الجهاز');
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
      title={device ? 'تعديل الجهاز' : 'إضافة جهاز'}
      description="السعر يُثبت لحظة بدء الجلسة، وتغييره لا يؤثر على الجلسات الجارية."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            إلغاء
          </Button>
          <Button type="submit" form="device-form" loading={saving}>
            حفظ
          </Button>
        </>
      }
    >
      <form id="device-form" onSubmit={submit} className="space-y-3.5" noValidate>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Input
            label="اسم الجهاز"
            placeholder="PC-01"
            value={form.name}
            onChange={set('name')}
            maxLength={60}
          />
          <Input
            label="الكود (اختياري)"
            placeholder="DEV-001"
            dir="ltr"
            className="text-left font-mono"
            value={form.code}
            onChange={set('code')}
            maxLength={32}
            hint={device ? 'الكود يُستخدم للتمييز بين الأجهزة' : 'يُنشأ تلقائيًا إن تُرك فارغًا'}
          />
          <Select label="النوع" value={form.type} onChange={set('type')} options={TYPE_OPTIONS} />
          <MoneyInput
            label="سعر الساعة الأساسي"
            value={form.hourlyPriceMinor}
            onChange={(value) =>
              setForm((current) => ({ ...current, hourlyPriceMinor: value }))
            }
          />
        </div>

        <div className="rounded-xl border border-line/70 bg-surface2/30 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[13px] font-semibold text-ink">خيارات التسعير</p>
              <p className="mt-0.5 text-[11.5px] text-muted">
                مثل: فردي 30 ج.م / زوجي 40 ج.م. السعر الأساسي يُستخدم إن لم يُختر خيار.
              </p>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={addOption}>
              <Plus size={14} />
              خيار
            </Button>
          </div>

          {form.pricingOptions.length === 0 ? (
            <p className="mt-2.5 text-[11.5px] text-muted">لا خيارات إضافية.</p>
          ) : (
            <div className="mt-2.5 space-y-2">
              {form.pricingOptions.map((option, index) => (
                <div key={option.key || index} className="flex items-end gap-2">
                  <Input
                    label={index === 0 ? 'الاسم' : undefined}
                    placeholder="فردي"
                    value={option.name}
                    onChange={(event) => updateOption(index, { name: event.target.value })}
                    maxLength={40}
                    containerClassName="flex-1"
                  />
                  <MoneyInput
                    label={index === 0 ? 'سعر الساعة' : undefined}
                    value={option.pricePerHourMinor}
                    onChange={(value) => updateOption(index, { pricePerHourMinor: value })}
                    containerClassName="w-32"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeOption(index)}
                    className="mb-0.5 text-danger hover:bg-danger/10"
                    aria-label="حذف الخيار"
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Textarea
          label="وصف (اختياري)"
          rows={2}
          value={form.description}
          onChange={set('description')}
          maxLength={300}
        />

        <Switch
          checked={form.isActive}
          onChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
          label="الجهاز مفعّل"
          description="الأجهزة المعطلة لا تظهر في اختيار بدء الجلسة."
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

export function DevicesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const now = useNow();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [maintenance, setMaintenance] = useState(null);
  const [maintenanceReason, setMaintenanceReason] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, type]);

  const query = useQuery({
    queryKey: ['devices', { page, q: debouncedSearch, status, type }],
    queryFn: () =>
      devicesApi.list({
        page,
        limit: 20,
        sort: 'code',
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
        ...(status ? { status } : {}),
        ...(type ? { type } : {}),
      }),
  });

  const devices = query.data?.devices || [];
  const filtered = useMemo(
    () => devices.filter((device) => (debouncedSearch ? true : true)),
    [devices, debouncedSearch],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['devices'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (device) => {
    setEditing(device);
    setFormOpen(true);
  };

  const startMaintenance = async () => {
    if (!maintenance) return;
    setWorking(true);
    try {
      await devicesApi.maintenance(maintenance.id, { reason: maintenanceReason.trim() });
      toast.success('تم تحويل الجهاز للصيانة');
      setMaintenance(null);
      setMaintenanceReason('');
      invalidate();
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setWorking(false);
    }
  };

  const finishMaintenance = async (device) => {
    setWorking(true);
    try {
      await devicesApi.completeMaintenance(device.id);
      toast.success('تم إنهاء الصيانة');
      invalidate();
    } catch (error) {
      toast.error(apiError(error).message);
    } finally {
      setWorking(false);
    }
  };

  const removeDevice = async () => {
    if (!deleting) return;
    setWorking(true);
    try {
      await devicesApi.remove(deleting.id);
      toast.success('تم حذف الجهاز');
      setDeleting(null);
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
        title="الأجهزة"
        subtitle="أضف أجهزة الكافيه، حدّد أسعار الساعة وخيارات التسعير."
        action={
          <Button onClick={openCreate}>
            <Plus size={16} />
            إضافة جهاز
          </Button>
        }
      />

      <Card className="p-3.5">
        <div className="flex flex-wrap items-end gap-2.5">
          <Input
            icon={Search}
            placeholder="بحث بالاسم أو الكود…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            containerClassName="min-w-[190px] flex-1"
          />
          <Select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            containerClassName="w-36"
            aria-label="الحالة"
          >
            <option value="">كل الحالات</option>
            <option value="available">متاح</option>
            <option value="occupied">مشغول</option>
            <option value="maintenance">صيانة</option>
          </Select>
          <Select
            value={type}
            onChange={(event) => setType(event.target.value)}
            containerClassName="w-32"
            aria-label="النوع"
          >
            <option value="">كل الأنواع</option>
            {DEVICE_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Button variant="ghost" size="sm" onClick={() => query.refetch()}>
            <RefreshCw size={15} />
          </Button>
        </div>
      </Card>

      {query.isError ? (
        <ErrorState message={apiError(query.error).message} onRetry={() => query.refetch()} />
      ) : query.isLoading ? (
        <LoadingRows rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Monitor}
          title="لا أجهزة"
          description={
            search || status || type
              ? 'لا نتائج مطابقة للفلتر الحالي.'
              : 'ابدأ بإضافة أول جهاز في الكافيه.'
          }
          action={
            !search && !status && !type ? (
              <Button size="sm" onClick={openCreate}>
                <Plus size={15} />
                إضافة جهاز
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <div className="table-shell overflow-x-auto">
            <table className="w-full min-w-[760px] text-right text-[12.5px]">
              <thead className="bg-surface2/60 text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">الجهاز</th>
                  <th className="px-4 py-3 font-medium">النوع</th>
                  <th className="px-4 py-3 font-medium">السعر/ساعة</th>
                  <th className="px-4 py-3 font-medium">خيارات التسعير</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium">الجلسة الحالية</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((device) => {
                  const session = device.currentSession;
                  const live = session
                    ? liveBilling(session, { fetchedAt: query.dataUpdatedAt, now })
                    : null;

                  return (
                    <tr key={device.id} className="border-t border-line/60 hover:bg-surface2/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line/70 bg-surface2/60 text-muted">
                            <Monitor size={15} />
                          </span>
                          <div>
                            <p className="font-semibold text-ink">{device.name}</p>
                            <p className="font-mono text-[10.5px] text-muted">{device.code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted">{device.type}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-ink">
                        {money(device.hourlyPriceMinor)}
                      </td>
                      <td className="px-4 py-3">
                        {device.pricingOptions.length === 0 ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {device.pricingOptions.map((option) => (
                              <span
                                key={option.key}
                                className="rounded-full border border-line/70 bg-surface2/60 px-1.5 py-0.5 text-[10.5px] text-muted"
                              >
                                {option.name} · {money(option.pricePerHourMinor)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <DeviceStatusBadge status={device.status} />
                          {!device.isActive && (
                            <span className="text-[10.5px] text-muted">معطّل</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {live ? (
                          <div>
                            <p
                              className={cn(
                                'font-mono text-[12px] font-semibold',
                                session.status === 'paused' ? 'text-warning' : 'text-ink',
                              )}
                            >
                              {durationOf(live.activeSeconds)}
                            </p>
                            <p className="font-mono text-[10.5px] text-accent">
                              {money(live.timeChargeMinor)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {device.status === 'maintenance' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => finishMaintenance(device)}
                              disabled={working}
                              title="إنهاء الصيانة"
                            >
                              <CheckCircle2 size={14} />
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setMaintenance(device);
                                setMaintenanceReason('');
                              }}
                              disabled={Boolean(device.currentSession)}
                              title="بدء الصيانة"
                            >
                              <Wrench size={14} />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEdit(device)}
                            title="تعديل"
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-danger hover:bg-danger/10"
                            onClick={() => setDeleting(device)}
                            disabled={Boolean(device.currentSession)}
                            title="حذف"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            pagination={query.data?.pagination}
            onPageChange={setPage}
          />
        </>
      )}

      <DeviceFormModal
        open={formOpen}
        device={editing}
        onClose={() => setFormOpen(false)}
        onSaved={invalidate}
      />

      <ConfirmDialog
        open={Boolean(maintenance)}
        onClose={() => setMaintenance(null)}
        onConfirm={startMaintenance}
        title="بدء صيانة"
        description={`سيتم إيقاف «${maintenance?.name || ''}» مؤقتًا عن استقبال الجلسات.`}
        confirmLabel="بدء الصيانة"
        tone="primary"
        loading={working}
      >
        <Input
          label="سبب الصيانة (اختياري)"
          placeholder="تنظيف، إصلاح يد تحكم…"
          value={maintenanceReason}
          onChange={(event) => setMaintenanceReason(event.target.value)}
          maxLength={300}
        />
      </ConfirmDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={removeDevice}
        title="حذف الجهاز"
        description={`سيُحذف «${deleting?.name || ''}» نهائيًا. لا يمكن الحذف إذا كان مشغولًا أو مرتبطًا بزيارة مفتوحة.`}
        confirmLabel="حذف"
        loading={working}
      />
    </div>
  );
}
