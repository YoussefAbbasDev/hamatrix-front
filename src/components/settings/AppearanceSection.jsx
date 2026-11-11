import { useEffect, useState } from 'react';
import { Moon, Save, Sun } from 'lucide-react';
import { t } from '../../lib/strings.js';
import { Button } from '../ui/Button.jsx';
import { SectionTitle } from '../ui/Card.jsx';
import { Switch } from '../ui/Switch.jsx';
import { cn } from '../../lib/cn.js';

export function AppearanceSection({ ui, saving, onSave }) {
  const [form, setForm] = useState(ui);

  useEffect(() => {
    setForm(ui);
  }, [ui]);

  const changed = form.theme !== ui.theme || form.reduceEffects !== ui.reduceEffects;

  return (
    <section className="card p-5">
      <SectionTitle title={t.settings.appearance} description="شكل الواجهة العامة على كل الأجهزة." />

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {[
          { value: 'dark', label: t.settings.themeDark, icon: Moon, hint: 'خلفية داكنة نيون' },
          { value: 'light', label: t.settings.themeLight, icon: Sun, hint: 'خلفية فاتحة مريحة' },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setForm((prev) => ({ ...prev, theme: option.value }))}
            className={cn(
              'flex items-center gap-3 rounded-lg border px-3.5 py-3 text-right transition',
              form.theme === option.value
                ? 'border-accent/60 bg-accent/10'
                : 'border-line/70 bg-surface2/40 hover:border-line',
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg',
                form.theme === option.value ? 'bg-accent/15 text-accent' : 'bg-surface2 text-muted',
              )}
            >
              <option.icon size={17} />
            </span>
            <span>
              <span className="block text-[13px] font-medium text-ink">{option.label}</span>
              <span className="block text-[11.5px] text-muted">{option.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3">
        <Switch
          label={t.settings.reduceEffects}
          description={t.settings.reduceEffectsHint}
          checked={form.reduceEffects}
          onChange={(value) => setForm((prev) => ({ ...prev, reduceEffects: value }))}
        />
      </div>

      <div className="mt-4 flex justify-end border-t border-line/60 pt-4">
        <Button
          type="button"
          loading={saving}
          disabled={!changed}
          onClick={() => onSave({ ui: form })}
        >
          <Save size={16} />
          {t.common.save}
        </Button>
      </div>
    </section>
  );
}
