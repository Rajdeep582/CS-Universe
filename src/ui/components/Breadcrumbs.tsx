import { Link } from '@tanstack/react-router';
import { ChevronRight } from 'lucide-react';
import type { ComponentProps } from 'react';

export interface Crumb {
  label: string;
  to?: ComponentProps<typeof Link>['to'];
  params?: Record<string, string>;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="glass inline-flex h-11 items-center rounded-full px-4 text-[13px] font-semibold text-ink-2"
    >
      <ol className="flex items-center gap-1.5">
        {items.map((c, i) => (
          <li key={c.label} className="flex items-center gap-1.5">
            {i > 0 ? <ChevronRight size={14} className="text-muted" aria-hidden /> : null}
            {c.to && i < items.length - 1 ? (
              <Link to={c.to} params={c.params as never} className="rounded-md px-1 hover:text-sky-3 hover:underline">
                {c.label}
              </Link>
            ) : (
              <span aria-current={i === items.length - 1 ? 'page' : undefined} className="px-1 text-ink">
                {c.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
