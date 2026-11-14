import { ReactNode } from 'react';

interface PageHeaderProps {
  kicker?: string;
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
      <div className="space-y-1.5 min-w-0">
        {kicker && (
          <p className="text-xs font-medium text-[var(--accent-primary)]">
            {kicker}
          </p>
        )}
        <h2 className="font-display text-2xl md:text-[28px] font-bold tracking-[-0.02em] text-[var(--text-primary)] leading-[1.15] text-balance">
          {title}
        </h2>
        <p className="text-[14px] text-[var(--text-secondary)] max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
