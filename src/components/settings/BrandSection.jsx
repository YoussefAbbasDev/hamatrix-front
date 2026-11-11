import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Save, Trash2 } from 'lucide-react';
import { t } from '../../lib/strings.js';
import { Button } from '../ui/Button.jsx';
import { Input, Textarea } from '../ui/Input.jsx';
import { SectionTitle } from '../ui/Card.jsx';
import { cn } from '../../lib/cn.js';

const COLOR_PRESETS = ['#FF2E93', '#8B5CFF', '#22D3EE', '#34D399', '#FBBF24', '#FB7185'];

function ColorField({ label, value, onChange, hint }) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#FF2E93'}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-surface2 p-1"
          aria-label={label}
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="field font-mono text-[13px] uppercase"
          dir="ltr"
          maxLength={7}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {COLOR_PRESETS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              'h-6 w-6 rounded-full border-2 transition',
              value.toUpperCase() === color ? 'border-ink' : 'border-transparent',
            )}
            style={{ backgroundColor: color }}
            aria-label={`اختيار اللون ${color}`}
          />
        ))}
      </div>
      {hint && <p className="mt-1.5 text-[12px] text-muted/80">{hint}</p>}
    </div>
  );
}

export function BrandSection({ brand, saving, onSave, onUploadLogo, uploading, onRemoveLogo }) {
  const [form, setForm] = useState(brand);
  const fileRef = useRef(null);

  useEffect(() => {
    setForm(brand);
  }, [brand]);

  const set = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const changed = JSON.stringify(form) !== JSON.stringify(brand);

  return (
    <section className="card p-5">
      <SectionTitle title={t.settings.brand} description="الاسم والشعار والألوان المستخدمة في الواجهة والفواتير." />

      <div className="mt-4 grid gap-4 sm:grid-cols-[auto_1fr]">
        <div>
          <span className="field-label">{t.settings.logo}</span>
          <div className="flex h-24 w-32 items-center justify-center overflow-hidden rounded-xl border border-line bg-black/40 p-2">
            {form.logoUrl ? (
              <img src={form.logoUrl} alt="شعار الكافيه" className="max-h-full w-auto max-w-full object-contain" />
            ) : (
              <ImagePlus size={24} className="text-muted" />
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUploadLogo(file);
              event.target.value = '';
            }}
          />
          <div className="mt-2 flex flex-col gap-1.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {t.settings.uploadLogo}
            </Button>
            {form.logoUrl && form.logoUrl !== '/logo.png' && (
              <Button type="button" variant="ghost" size="sm" onClick={onRemoveLogo}>
                <Trash2 size={14} />
                استعادة الافتراضي
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3.5">
          <Input label={t.settings.brandName} value={form.name} onChange={set('name')} maxLength={60} />

          <div className="grid gap-3.5 sm:grid-cols-2">
            <ColorField
              label={t.settings.accent}
              value={form.accentColor}
              onChange={(value) => setForm((prev) => ({ ...prev, accentColor: value }))}
              hint="اللون الأساسي للأزرار والتمييز."
            />
            <ColorField
              label={t.settings.accent2}
              value={form.accentColor2}
              onChange={(value) => setForm((prev) => ({ ...prev, accentColor2: value }))}
              hint="يُستخدم في التدرجات واللمسات الثانوية."
            />
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2">
            <Textarea
              label="ترويسة الفاتورة"
              value={form.receiptHeader}
              onChange={set('receiptHeader')}
              maxLength={200}
              rows={2}
              hint={t.common.optional}
            />
            <Textarea
              label="تذييل الفاتورة"
              value={form.receiptFooter}
              onChange={set('receiptFooter')}
              maxLength={200}
              rows={2}
              hint={t.common.optional}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-end border-t border-line/60 pt-4">
        <Button
          type="button"
          loading={saving}
          disabled={!changed || !form.name.trim()}
          onClick={() =>
            onSave({
              brand: {
                name: form.name.trim(),
                accentColor: form.accentColor.toUpperCase(),
                accentColor2: form.accentColor2.toUpperCase(),
                receiptHeader: form.receiptHeader,
                receiptFooter: form.receiptFooter,
              },
            })
          }
        >
          <Save size={16} />
          {t.common.save}
        </Button>
      </div>
    </section>
  );
}
