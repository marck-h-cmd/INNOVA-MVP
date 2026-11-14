import { Eye } from 'lucide-react';
import { Action, ActionStatus } from '../../types/domain';
import { ROLE_META, SERVICES, SOURCES } from '../../data/seedData';
import { StatusBadge } from './StatusBadge';

interface ActionCardProps {
  action: Action;
  canUpdate: boolean;
  onStatusChange: (actionId: string, nextStatus: ActionStatus) => void;
  onInspect: (action: Action) => void;
  compact?: boolean;
}

const NEXT_STATUS_OPTIONS: { value: ActionStatus; label: string }[] = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_REVISION', label: 'En revisión' },
  { value: 'VERIFICADA', label: 'Verificada' },
  { value: 'CERRADA', label: 'Cerrada' },
];

export function ActionCard({
  action,
  canUpdate,
  onStatusChange,
  onInspect,
  compact = false,
}: ActionCardProps) {
  const service = SERVICES.find((s) => s.id === action.serviceId);
  const source = SOURCES.find((s) => s.id === action.sourceId);

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-4 space-y-3 transition-colors duration-150 hover:border-[var(--accent-primary)]/50">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px] text-[var(--text-secondary)]">
            <span className="font-mono font-semibold text-[var(--text-primary)]/80">
              {action.ruleId}
            </span>
            <span aria-hidden="true">·</span>
            <span>{service?.name ?? action.serviceId}</span>
            <span aria-hidden="true">·</span>
            <span>{ROLE_META[action.responsibleRole].shortLabel}</span>
          </div>
          <h4 className="text-[14px] font-semibold text-[var(--text-primary)] leading-snug">
            {action.title}
          </h4>
        </div>
        <StatusBadge status={action.status} />
      </div>

      {!compact && (
        <div className="space-y-1.5">
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
            {action.justification}
          </p>
          <p className="text-[11.5px] text-[var(--text-secondary)]">
            <span className="font-semibold text-[var(--text-primary)]">Evidencia:</span>{' '}
            {action.evidence}
          </p>
        </div>
      )}

      <div className="pt-2.5 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] min-w-0">
          <StatusBadge status={action.priority} />
          {source && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate max-w-[150px]" title={source.institution}>
                {source.institution}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => onInspect(action)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-[8px] text-xs font-semibold text-[var(--text-primary)] bg-[var(--bg-surface-2)] hover:bg-[var(--border-subtle)]/70 transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98]"
          >
            <Eye className="w-3.5 h-3.5 text-[var(--accent-primary)]" aria-hidden="true" />
            <span>Ver fundamento</span>
          </button>

          <select
            aria-label={`Cambiar estado de ${action.title}`}
            value={action.status}
            disabled={!canUpdate}
            onChange={(e) => onStatusChange(action.id, e.target.value as ActionStatus)}
            className="px-2.5 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {NEXT_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
