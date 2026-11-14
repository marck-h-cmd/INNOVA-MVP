import { ReactNode } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  statusSlot?: ReactNode;
  footerMeta?: string;
  onClick?: () => void;
  actionLabel?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  statusSlot,
  footerMeta,
  onClick,
  actionLabel,
}: MetricCardProps) {
  return (
    <motion.div
      layout
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="h-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 flex flex-col justify-between gap-4 transition-colors duration-150 hover:border-[var(--accent-primary)]/45"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
          <span className="text-[13px] font-semibold text-[var(--text-secondary)] leading-snug min-w-0">
            {title}
          </span>
          {statusSlot}
        </div>

        <div className="font-display text-[32px] font-bold tracking-[-0.025em] tabular-nums text-[var(--text-primary)] leading-none">
          {value}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed">
          {subtitle}
        </p>
        {(footerMeta || onClick) && (
          <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2 text-xs">
            {footerMeta && (
              <span className="text-[var(--text-secondary)] truncate">{footerMeta}</span>
            )}
            {onClick && actionLabel && (
              <button
                type="button"
                onClick={onClick}
                className="group inline-flex items-center gap-1 font-semibold text-[var(--accent-primary)] hover:underline whitespace-nowrap shrink-0 ml-auto cursor-pointer"
              >
                <span>{actionLabel}</span>
                <ArrowUpRight
                  className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
