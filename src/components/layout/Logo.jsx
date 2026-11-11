import { useSettings } from '../../providers/SettingsProvider.jsx';
import { cn } from '../../lib/cn.js';
import { assetUrl } from '../../lib/apiConfig.js';

export function Logo({ className, imgClassName, showText = true, subtitle = null }) {
  const { settings } = useSettings();
  const brand = settings.brand || {};

  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <span className="relative flex h-10 w-[104px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line/60 bg-black/40 px-1.5 shadow-glow-sm">
        <img
          src={assetUrl(brand.logoUrl || '/logo.png')}
          alt={brand.name || 'HAMATRIX'}
          className={cn('max-h-8 w-auto max-w-full object-contain', imgClassName)}
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />
      </span>
      {showText && (
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-bold tracking-wide text-ink">
            {brand.name || 'HAMATRIX'}
          </span>
          {subtitle && (
            <span className="block truncate text-[10.5px] text-muted">{subtitle}</span>
          )}
        </span>
      )}
    </div>
  );
}
