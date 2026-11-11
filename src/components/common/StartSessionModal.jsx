import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Play, Timer } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { Select, Textarea } from '../ui/Select.jsx';
import { Monitor } from 'lucide-react';
import { devicesApi } from '../../api/devices.js';
import { sessionsApi, visitsApi } from '../../api/visits.js';
import { settingsApi } from '../../api/settings.js';
import { apiError } from '../../lib/http.js';
import { money } from '../../lib/format.js';
import { useToast } from '../../providers/ToastProvider.jsx';
import { cn } from '../../lib/cn.js';

const PRESETS = [30, 60, 90, 120, 180];

/**
 * Starts a gaming session either on an existing visit or on a new one.
 * When no device is supplied, the operator picks from available devices.
 */
export function StartSessionModal({ open, onClose, device = null, visitId = null, onStarted }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const settingsQuery = useQuery({
    queryKey: ['settings', 'full'],
    queryFn: settingsApi.get,
    enabled: open,
    staleTime: 60_000,
  });

  const devicesQuery = useQuery({
    queryKey: ['devices', 'available-picker'],
    queryFn: () => devicesApi.list({ limit: 100, status: 'available', isActive: 'true' }),
    enabled: open && !device,
  });

  const [form, setForm] = useState({
    deviceId: '',
    playerName: '',
    billingMode: 'open',
    durationMinutes: 60,
    pricingOptionKey: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const settings = settingsQuery.data;
  const sessionDefaults = settings?.session || {
    defaultBillingMode: 'open',
    defaultDurationMinutes: 60,
  };

  useEffect(() => {
    if (!open) return;
    setError('');
    setSubmitting(false);
    setForm({
      deviceId: device?.id || '',
      playerName: '',
      billingMode: sessionDefaults.defaultBillingMode || 'open',
      durationMinutes: sessionDefaults.defaultDurationMinutes || 60,
      pricingOptionKey: '',
      notes: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, device?.id, sessionDefaults.defaultBillingMode, sessionDefaults.defaultDurationMinutes]);

  const availableDevices = devicesQuery.data?.devices || [];
  const selectedDevice = useMemo(() => {
    if (device) return device;
    return availableDevices.find((item) => item.id === form.deviceId) || null;
  }, [device, availableDevices, form.deviceId]);

  const options = selectedDevice?.pricingOptions || [];
  const selectedOption = options.find((option) => option.key === form.pricingOptionKey) || null;
  const rate = selectedOption?.pricePerHourMinor ?? selectedDevice?.hourlyPriceMinor ?? 0;

  const set = (key) => (event) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    if (!form.deviceId) {
      setError('اختر جهازًا متاحًا للبدء');
      return;
    }

    const payload = {
      deviceId: form.deviceId,
      billingMode: form.billingMode,
      pricingOptionKey: form.pricingOptionKey || null,
      notes: form.notes.trim(),
    };
    if (form.billingMode === 'fixed') {
      payload.durationMinutes = Number(form.durationMinutes);
      if (!payload.durationMinutes || payload.durationMinutes < 5) {
        setError('المدة يجب أن تكون 5 دقائق على الأقل');
        return;
      }
    }

    setSubmitting(true);
    let createdVisitId = null;
    try {
      let targetVisitId = visitId;
      if (!targetVisitId) {
        const visit = await visitsApi.create({ playerName: form.playerName.trim() });
        createdVisitId = visit.id;
        targetVisitId = visit.id;
      }

      try {
        const result = await visitsApi.startSession(targetVisitId, payload);
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
          queryClient.invalidateQueries({ queryKey: ['devices'] }),
          queryClient.invalidateQueries({ queryKey: ['visits'] }),
          queryClient.invalidateQueries({ queryKey: ['visit', targetVisitId] }),
        ]);
        toast.success('تم بدء الجلسة');
        onStarted?.(result, targetVisitId);
        onClose?.();
        if (!visitId) navigate(`/visits/${targetVisitId}`);
      } catch (startError) {
        if (createdVisitId) await visitsApi.remove(createdVisitId).catch(() => {});
        throw startError;
      }
    } catch (submitError) {
      setError(apiError(submitError).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="بدء جلسة لعب"
      description={
        selectedDevice
          ? `${selectedDevice.name} · ${money(rate)}/ساعة`
          : 'اختر الجهاز ونوع الجلسة'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            إلغاء
          </Button>
          <Button type="submit" form="start-session-form" loading={submitting}>
            <Play size={16} />
            بدء الجلسة
          </Button>
        </>
      }
    >
      <form id="start-session-form" onSubmit={submit} className="space-y-3.5" noValidate>
        {!device && (
          <Select
            label="الجهاز"
            value={form.deviceId}
            onChange={set('deviceId')}
            disabled={devicesQuery.isLoading}
          >
            <option value="">
              {devicesQuery.isLoading ? 'جارٍ تحميل الأجهزة…' : 'اختر جهازًا متاحًا'}
            </option>
            {availableDevices.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} — {item.name} · {money(item.hourlyPriceMinor)}/س
              </option>
            ))}
          </Select>
        )}

        {selectedDevice && (
          <div className="flex items-center gap-3 rounded-lg border border-line/70 bg-surface2/40 px-3.5 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Monitor size={17} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-ink">{selectedDevice.name}</p>
              <p className="text-[11.5px] text-muted">
                {selectedDevice.code} · {selectedDevice.type}
              </p>
            </div>
            <span className="font-mono text-[13px] font-semibold text-accent">
              {money(rate)}
            </span>
          </div>
        )}

        {options.length > 0 && (
          <Select
            label="نوع التسعير"
            value={form.pricingOptionKey}
            onChange={set('pricingOptionKey')}
          >
            <option value="">السعر الأساسي — {money(selectedDevice?.hourlyPriceMinor || 0)}</option>
            {options.map((option) => (
              <option key={option.key} value={option.key}>
                {option.name} — {money(option.pricePerHourMinor)}/س
              </option>
            ))}
          </Select>
        )}

        {!visitId && (
          <Input
            label="اسم اللاعب (اختياري)"
            placeholder="مثال: يوسف"
            value={form.playerName}
            onChange={set('playerName')}
            maxLength={80}
          />
        )}

        <div>
          <p className="field-label">نوع الجلسة</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'open', label: 'مفتوحة', hint: 'حتى الإنهاء اليدوي' },
              { value: 'fixed', label: 'مدة محددة', hint: 'عداد تنازلي' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, billingMode: option.value }))
                }
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-right transition',
                  form.billingMode === option.value
                    ? 'border-accent/50 bg-accent/10 text-ink'
                    : 'border-line/70 bg-surface2/40 text-muted hover:border-line',
                )}
              >
                <span className="block text-[13px] font-semibold">{option.label}</span>
                <span className="mt-0.5 block text-[11px] text-muted">{option.hint}</span>
              </button>
            ))}
          </div>
        </div>

        {form.billingMode === 'fixed' && (
          <div>
            <p className="field-label">المدة (دقيقة)</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setForm((current) => ({ ...current, durationMinutes: preset }))}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 font-mono text-[12.5px] transition',
                    Number(form.durationMinutes) === preset
                      ? 'border-accent/50 bg-accent/15 text-accent'
                      : 'border-line/70 bg-surface2/40 text-muted hover:border-line',
                  )}
                >
                  {preset}
                </button>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={5}
                  max={720}
                  value={form.durationMinutes}
                  onChange={set('durationMinutes')}
                  className="w-24 py-1.5 text-center font-mono"
                  dir="ltr"
                />
                <Timer size={15} className="text-muted" />
              </div>
            </div>
            {rate > 0 && (
              <p className="mt-1.5 text-[11.5px] text-muted">
                التكلفة التقديرية: {money(Math.round((rate * Number(form.durationMinutes || 0)) / 60))}
              </p>
            )}
          </div>
        )}

        <Textarea
          label="ملاحظات (اختياري)"
          rows={2}
          value={form.notes}
          onChange={set('notes')}
          maxLength={300}
        />

        {!device && !devicesQuery.isLoading && availableDevices.length === 0 && (
          <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] text-warning">
            لا توجد أجهزة متاحة الآن. أنهِ جلسة أو صيانة جهاز أولًا.
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
