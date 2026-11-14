import { ReactNode, useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, WifiOff, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ToastMessage } from '../../store/useNexoStore';

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-2xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#08121A]/60 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.22 }}
            className={`relative z-10 w-full ${maxWidth} max-h-[88vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[18px] p-6`}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[var(--border-subtle)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
                {subtitle && (
                  <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Cerrar ${title}`}
                className="p-2 rounded-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="pt-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  widthClass = 'max-w-xl',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  widthClass?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#08121A]/55 backdrop-blur-[2px]"
          />
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className={`relative z-10 w-full ${widthClass} h-full bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] flex flex-col`}
          >
            <div className="px-6 py-5 border-b border-[var(--border-subtle)] flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
                {subtitle && (
                  <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={`Cerrar panel ${title}`}
                className="p-2 rounded-[10px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Tabs<T extends string>({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  activeTab: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      className="inline-flex flex-wrap items-center gap-1 p-1 rounded-[12px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)]"
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`px-3 py-1.5 rounded-[9px] text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
              active
                ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-subtle)]/70'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="ml-1.5 font-mono tabular-nums opacity-70">{tab.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export interface TimelineItem {
  id: string;
  timeLabel: string;
  title: string;
  description: string;
  meta?: string;
  tone?: 'neutral' | 'active' | 'warning' | 'critical';
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="space-y-4">
      {items.map((item, idx) => {
        const dotColor =
          item.tone === 'critical'
            ? 'bg-[#B62C49]'
            : item.tone === 'warning'
              ? 'bg-[#A96A00]'
              : item.tone === 'active'
                ? 'bg-[var(--accent-primary)]'
                : 'bg-[var(--text-secondary)]/50';
        return (
          <li key={item.id} className="relative pl-6">
            {idx < items.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-[4.5px] top-3 bottom-[-18px] w-px bg-[var(--border-subtle)]"
              />
            )}
            <span
              aria-hidden="true"
              className={`absolute left-0 top-1.5 w-[10px] h-[10px] rounded-full ring-2 ring-[var(--bg-surface)] ${dotColor}`}
            />
            <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-[var(--text-secondary)]">
              <span className="font-mono tabular-nums font-medium">{item.timeLabel}</span>
              {item.meta && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{item.meta}</span>
                </>
              )}
            </div>
            <p className="text-[13.5px] font-semibold text-[var(--text-primary)] mt-0.5 leading-snug">
              {item.title}
            </p>
            <p className="text-[12.5px] text-[var(--text-secondary)] leading-relaxed mt-0.5">
              {item.description}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyTitle = 'Sin registros disponibles',
  emptyDescription = 'Ajuste los filtros actuales para visualizar elementos.',
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="w-full overflow-x-auto rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/55">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-2.5 text-[11.5px] font-semibold text-[var(--text-secondary)] whitespace-nowrap ${
                  col.align === 'right' ? 'text-right' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {rows.map((row) => (
            <tr
              key={row.id}
              className="hover:bg-[var(--bg-surface-2)]/35 transition-colors duration-100"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-4 py-2.5 text-[13px] text-[var(--text-primary)] align-middle ${
                    col.align === 'right' ? 'text-right tabular-nums' : 'text-left'
                  }`}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Skeleton({ className = 'h-20 w-full' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-[12px] bg-[var(--bg-surface-2)] ${className}`}
      aria-hidden="true"
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center space-y-2">
      <Info className="w-6 h-6 text-[var(--text-secondary)] mx-auto" aria-hidden="true" />
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="text-[13px] text-[var(--text-secondary)] max-w-md mx-auto">
        {description}
      </p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = 'No se pudo completar la operación',
  description,
  onRetry,
}: {
  title?: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="rounded-[14px] border border-[#B62C49]/40 bg-[#FBE9ED] dark:bg-[#B62C49]/15 p-5 flex items-start justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#B62C49] dark:text-[#F2728C] shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h4>
          <p className="text-[13px] text-[var(--text-secondary)] mt-0.5">{description}</p>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border-subtle)] cursor-pointer shrink-0"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

export function OfflineBanner({ offline }: { offline: boolean }) {
  if (!offline) return null;
  return (
    <div
      role="status"
      className="px-4 py-2 bg-[#FDF4E2] dark:bg-[#A96A00]/25 border-b border-[#A96A00]/30 text-xs font-medium text-[#A96A00] dark:text-[#F0B44C] flex items-center justify-center gap-2"
    >
      <WifiOff className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>
        Sin conexión externa: los motores deterministas, reglas, dependencias y continuidad siguen operando localmente.
      </span>
    </div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="fixed bottom-20 md:bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const Icon =
            toast.tone === 'success'
              ? CheckCircle2
              : toast.tone === 'warning' || toast.tone === 'error'
                ? AlertCircle
                : Info;
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[12px] p-3.5 shadow-sm flex items-start gap-3"
            >
              <Icon className="w-4 h-4 text-[var(--accent-primary)] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)]">{toast.title}</p>
                {toast.description && (
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                    {toast.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                aria-label="Cerrar notificación"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
