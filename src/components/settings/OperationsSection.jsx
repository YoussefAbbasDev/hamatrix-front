import { useEffect, useState } from 'react';
import { Save, Timer } from 'lucide-react';
import { t } from '../../lib/strings.js';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { SectionTitle } from '../ui/Card.jsx';
import { Switch } from '../ui/Switch.jsx';
import { cn } from '../../lib/cn.js';

const EMPTY_SESSION = {
  defaultBillingMode: 'open',
  defaultDurationMinutes: 60,
  alertBeforeEndMinutes: 0,
  allowPause: true,
  allowManualAmountEdit: true,
  maxDurationMinutes: 720,
};

const EMPTY_INVENTORY = {
  lowStockNotifications: true,
};

/**
 * Defaults applied when an operator starts a session, plus inventory alerts.
 * These values pre-fill forms; they never override a per-session choice.
 */
export function OperationsSection({ settings, saving, onSave }) {
  const session = { ...EMPTY_SESSION, ...(settings.session || {}) };
  const inventory = { ...EMPTY_INVENTORY, ...(settings.inventory || {}) };

  const [mode, setMode] = useState(session.defaultBillingMode);
  const [duration, setDuration] = useState(String(session.defaultDurationMinutes));
  const [maxDuration, setMaxDuration] = useState(String(session.maxDurationMinutes));
  const [alertBeforeEnd, setAlertBeforeEnd] = useState(String(session.alertBeforeEndMinutes));
  const [allowPause, setAllowPause] = useState(session.allowPause);
  const [allowManualEdit, setAllowManualEdit] = useState(session.allowManualAmountEdit);
  const [lowStockNotifications, setLowStockNotifications] = useState(
    inventory.lowStockNotifications,
  );
  const [error, setError] = useState('');

  useEffect(() => {
    setMode(session.defaultBillingMode);
    setDuration(String(session.defaultDurationMinutes));
    setMaxDuration(String(session.maxDurationMinutes));
    setAlertBeforeEnd(String(session.alertBeforeEndMinutes));
    setAllowPause(session.allowPause);
    setAllowManualEdit(session.allowManualAmountEdit);
    setLowStockNotifications(inventory.lowStockNotifications);
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const changed =
    mode !== session.defaultBillingMode ||
    Number(duration) !== session.defaultDurationMinutes ||
    Number(maxDuration) !== session.maxDurationMinutes ||
    Number(alertBeforeEnd) !== session.alertBeforeEndMinutes ||
    allowPause !== session.allowPause ||
    allowManualEdit !== session.allowManualAmountEdit ||
    lowStockNotifications !== inventory.lowStockNotifications;

  const save = () => {
    setError('');
    const durationNumber = Number(duration);
    const maxDurationNumber = Number(maxDuration);
    const alertNumber = Number(alertBeforeEnd);

    if (!Number.isInteger(durationNumber) || durationNumber < 5 || durationNumber > 1440) {
      setError('المدة الافتراضية يجب أن تكون بين 5 و1440 دقيقة');
      return;
    }
    if (!Number.isInteger(maxDurationNumber) || maxDurationNumber < 5 || maxDurationNumber > 1440) {
      setError('أقصى مدة يجب أن تكون بين 5 و1440 دقيقة');
      return;
    }
    if (maxDurationNumber < durationNumber) {
      setError('أقصى مدة يجب ألا تقل عن المدة الافتراضية');
      return;
    }
    if (!Number.isInteger(alertNumber) || alertNumber < 0 || alertNumber > 60) {
      setError('التنبيه قبل النهاية يجب أن يكون بين 0 و60 دقيقة');
      return;
    }

    onSave({
      session: {
        defaultBillingMode: mode,
        defaultDurationMinutes: durationNumber,
        maxDurationMinutes: maxDurationNumber,
        alertBeforeEndMinutes: alertNumber,
        allowPause,
        allowManualAmountEdit: allowManualEdit,
      },
      inventory: {
        lowStockNotifications,
        allowNegativeStock: false,
      },
    });
  };

  return (
    <section className="card p-5">
      <SectionTitle
        title="إعدادات التشغيل"
        description="القيم الافتراضية لبدء الجلسات وتنبيهات المخزون."
      />

      <div className="mt-4 space-y-4">
        <div>
          <p className="field-label">نوع الجلسة الافتراضي</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { value: 'open', label: 'مفتوحة', hint: 'تُحسب حتى الإنهاء اليدوي' },
              { value: 'fixed', label: 'مدة محددة', hint: 'عداد تنازلي مع تنبيه' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMode(option.value)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3.5 py-3 text-right transition',
                  mode === option.value
                    ? 'border-accent/60 bg-accent/10'
                    : 'border-line/70 bg-surface2/40 hover:border-line',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    mode === option.value ? 'bg-accent/15 text-accent' : 'bg-surface2 text-muted',
                  )}
                >
                  <Timer size={17} />
                </span>
                <span>
                  <span className="block text-[13px] font-medium text-ink">{option.label}</span>
                  <span className="block text-[11.5px] text-muted">{option.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-3">
          <Input
            label="المدة الافتراضية (دقيقة)"
            type="number"
            min={5}
            max={1440}
            dir="ltr"
            className="text-left font-mono"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
          <Input
            label="أقصى مدة مسموحة (دقيقة)"
            type="number"
            min={5}
            max={1440}
            dir="ltr"
            className="text-left font-mono"
            value={maxDuration}
            onChange={(event) => setMaxDuration(event.target.value)}
            hint="حد أعلى عند بدء جلسة محددة"
          />
          <Input
            label="تنبيه قبل النهاية (دقيقة)"
            type="number"
            min={0}
            max={60}
            dir="ltr"
            className="text-left font-mono"
            value={alertBeforeEnd}
            onChange={(event) => setAlertBeforeEnd(event.target.value)}
            hint="0 = بدون تنبيه مسبق"
          />
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <Switch
            checked={allowPause}
            onChange={setAllowPause}
            label="السماح بالإيقاف المؤقت"
            description="يتوقف احتساب الوقت أثناء الإيقاف."
          />
          <Switch
            checked={allowManualEdit}
            onChange={setAllowManualEdit}
            label="السماح بتعديل الإجمالي يدويًا"
            description="خصم أو إضافة بمبلغ ثابت عند التحصيل."
          />
        </div>

        <div className="border-t border-line/60 pt-3.5">
          <p className="mb-2 text-[12px] font-medium text-muted">المخزون</p>
          <Switch
            checked={lowStockNotifications}
            onChange={setLowStockNotifications}
            label="تنبيهات المخزون المنخفض"
            description="إظهار المنتجات التي وصلت حد التنبيه في الرئيسية."
          />
          <p className="mt-2 flex items-center gap-1.5 rounded-lg border border-line/60 bg-surface2/40 px-3 py-2 text-[11.5px] text-muted">
            البيع بالسالب غير مسموح دائمًا — لا يمكن خصم كمية أكبر من المخزون المتاح.
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="mt-4 flex justify-end border-t border-line/60 pt-4">
        <Button type="button" loading={saving} disabled={!changed} onClick={save}>
          <Save size={16} />
          {t.common.save}
        </Button>
      </div>
    </section>
  );
}
