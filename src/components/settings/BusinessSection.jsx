import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { t } from '../../lib/strings.js';
import { Button } from '../ui/Button.jsx';
import { Input } from '../ui/Input.jsx';
import { SectionTitle } from '../ui/Card.jsx';

const EMPTY_INVOICE = { prefix: 'INV', storePhone: '', storeAddress: '' };

export function BusinessSection({ settings, saving, onSave }) {
  const invoice = settings.invoice || EMPTY_INVOICE;
  const [form, setForm] = useState(invoice);

  useEffect(() => {
    setForm(invoice);
  }, [invoice]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const changed = JSON.stringify(form) !== JSON.stringify(invoice);

  return (
    <section className="card p-5">
      <SectionTitle
        title={t.settings.storeInfo}
        description="تظهر هذه البيانات على الفواتير وفي السجلات."
      />

      <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
        <Input
          label="بادئة رقم الفاتورة"
          value={form.prefix}
          onChange={set('prefix')}
          dir="ltr"
          maxLength={8}
          className="text-left font-mono uppercase"
          hint="مثال: INV-2607-0001"
        />
        <Input
          label={t.settings.phone}
          value={form.storePhone}
          onChange={set('storePhone')}
          dir="ltr"
          className="text-left"
          maxLength={40}
          placeholder="01000000000"
        />
        <Input
          label={t.settings.address}
          value={form.storeAddress}
          onChange={set('storeAddress')}
          maxLength={200}
          containerClassName="sm:col-span-2"
          placeholder="المدينة، الشارع، رقم المحل"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-line/60 bg-surface2/40 px-3.5 py-2.5 text-[11.5px] text-muted">
        <span className="font-medium text-ink">{t.settings.business}:</span>
        <span className="chip">{settings.locale?.currency || 'EGP'}</span>
        <span className="chip">{settings.locale?.timezone || 'Africa/Cairo'}</span>
        <span className="chip">الفواصل العشرية: {settings.locale?.currencyMinorUnits ?? 2}</span>
        <span className="text-[11px] text-muted/70">
          العملة والتوقيت ثابتان حسب متطلبات التشغيل.
        </span>
      </div>

      <div className="mt-4 flex justify-end border-t border-line/60 pt-4">
        <Button
          type="button"
          loading={saving}
          disabled={!changed}
          onClick={() => onSave({ invoice: { ...form, prefix: form.prefix.trim().toUpperCase() } })}
        >
          <Save size={16} />
          {t.common.save}
        </Button>
      </div>
    </section>
  );
}
