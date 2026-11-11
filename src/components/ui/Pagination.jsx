import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button.jsx';
import { number } from '../../lib/format.js';

export function Pagination({ pagination, onPageChange, className }) {
  if (!pagination || pagination.total === 0) return null;
  const { page, pages, total } = pagination;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className || ''}`}>
      <p className="text-[12px] text-muted">
        صفحة <span className="font-mono text-ink">{number(page)}</span> من{' '}
        <span className="font-mono text-ink">{number(pages)}</span> ·{' '}
        <span className="font-mono text-ink">{number(total)}</span> عنصر
      </p>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          disabled={!pagination.hasPrev}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronRight size={15} />
          السابق
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={!pagination.hasNext}
          onClick={() => onPageChange(page + 1)}
        >
          التالي
          <ChevronLeft size={15} />
        </Button>
      </div>
    </div>
  );
}
