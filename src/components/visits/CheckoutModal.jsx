import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Receipt } from 'lucide-react';
import { Modal } from '../ui/Modal.jsx';
import { Button } from '../ui/Button.jsx';
import { MoneyInput } from '../ui/MoneyInput.jsx';
import { Input } from '../ui/Input.jsx';
import { visitsApi } from '../../api/visits.js';
import { apiError } from '../../lib/http.js';
import { money } from '../../lib/format.js';
import { idempotencyKey } from '../../lib/idempotency.js';
import { useToast } from '../../providers/ToastProvider.jsx';

export function CheckoutModal({ open, onClose, visit, onCompleted }) {
  const toast = useToast();
  const [adjustmentMinor, setAdjustmentMinor] = useState(0);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const keyRef = useRef(idempotencyKey());

  useEffect(() => {
    if (!open) return;
    setAdjustmentMinor(visit?.totals?.adjustmentMinor || 0);
    setNote(visit?.totals?.adjustmentNote || '');
    setError('');
    setSaving(false);
    setResult(null);
    keyRef.current = idempotencyKey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const computedTotalMinor = visit?.totals?.computedTotalMinor || 0;
  const totalMinor = Math.max(0, computedTotalMinor + Number(adjustmentMinor || 0));
  const hasActiveSession = Boolean(visit?.activeSession);

  const submit = async () => {
    setError('');
    if (computedTotalMinor <= 0) {
      setError('لا توجد مبالغ للتحصيل في هذه الزيارة');
      return;
    }

    setSaving(true);
    try {
      const data = await visitsApi.checkout(
        visit.id,
        { adjustmentMinor: Number(adjustmentMinor || 0), adjustmentNote: note.trim() },
        keyRef.current,
      );
      setResult(data.invoice);
      toast.success(`تم التحصيل — ${data.invoice.invoiceNumber}`);
      onCompleted?.(data);
    } catch (checkoutError) {
      setError(apiError(checkoutError).message);
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="تم التحصيل"
        description="أُصدرت الفاتورة وسُجلت في السجلات."
        size="sm"
        footer={
          <Button onClick={onClose} className="w-full">
            تم
          </Button>
        }
      >
        <div className="flex flex-col items-center gap-2 rounded-xl border border-success/25 bg-success/5 px-4 py-6 text-center">
          <CheckCircle2 size={34} className="text-success" />
          <p className="font-mono text-[13px] text-muted">{result.invoiceNumber}</p>
          <p className="font-mono text-3xl font-semibold text-ink">{money(result.totalMinor)}</p>
          <p className="text-[11.5px] text-muted">
            {result.lines?.length || 0} بند · دفع نقدي
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="تحصيل الزيارة"
      description={visit?.playerName || visit?.visitNumber}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            رجوع
          </Button>
          <Button
            onClick={submit}
            loading={saving}
            disabled={computedTotalMinor <= 0}
          >
            <Receipt size={16} />
            تأكيد الدفع النقدي
          </Button>
        </>
      }
    >
      <div className="space-y-3.5">
        <div className="rounded-xl border border-line/70 bg-surface2/40 p-3.5 text-[12.5px]">
          <div className="flex justify-between py-1 text-muted">
            <span>وقت اللعب</span>
            <span className="font-mono text-ink">{money(visit?.totals?.timeSubtotalMinor)}</span>
          </div>
          <div className="flex justify-between py-1 text-muted">
            <span>المنتجات</span>
            <span className="font-mono text-ink">{money(visit?.totals?.itemsSubtotalMinor)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-line/60 pt-2 font-semibold">
            <span className="text-ink">الإجمالي المحسوب</span>
            <span className="font-mono text-ink">{money(computedTotalMinor)}</span>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <MoneyInput
            label="تعديل يدوي على الإجمالي"
            allowNegative
            value={adjustmentMinor}
            onChange={setAdjustmentMinor}
            hint="سالب = خصم، موجب = إضافة"
          />
          <Input
            label="سبب التعديل (اختياري)"
            placeholder="تقريب، خصم عميل…"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={200}
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
          <span className="text-[13px] font-semibold text-ink">المطلوب دفعه</span>
          <span className="font-mono text-2xl font-semibold text-accent">{money(totalMinor)}</span>
        </div>

        {hasActiveSession && (
          <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2.5 text-[12px] leading-relaxed text-warning">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            توجد جلسة جارية. سيتم إنهاء اللعب الآن واحتساب الوقت حتى لحظة التحصيل.
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
