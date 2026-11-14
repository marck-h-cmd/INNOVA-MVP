import { EvaluatedServiceNode } from '../../lib/engines/dependencyEngine';
import { RiskLevel, Scenario } from '../../types/domain';
import { StatusBadge } from './StatusBadge';

interface ServiceNodeProps {
  node: EvaluatedServiceNode;
  selected?: boolean;
  onSelect?: (serviceId: string) => void;
}

export function ServiceNode({ node, selected = false, onSelect }: ServiceNodeProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(node.service.id)}
      className={`w-full text-left p-4 rounded-[14px] border transition-colors duration-150 cursor-pointer ${
        selected
          ? 'bg-[var(--bg-surface-2)] border-[var(--accent-primary)]'
          : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/60'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[var(--text-secondary)]">
            <span className="font-mono whitespace-nowrap">{node.service.id}</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap">Criticidad {node.service.criticality}/5</span>
          </div>
          <h4 className="text-[15px] font-semibold text-[var(--text-primary)] mt-0.5 leading-snug">
            {node.service.name}
          </h4>
        </div>
        <div className="shrink-0">
          <StatusBadge status={node.effectiveStatus} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-secondary)]">
        <span>Dependientes: {node.downstreamDependentIds.length}</span>
        <span aria-hidden="true">·</span>
        <span>
          {node.requiresVerification
            ? node.triggeredByDependencies.length > 0
              ? `Requiere verificación (${node.triggeredByDependencies.length} dependencia${
                  node.triggeredByDependencies.length > 1 ? 's' : ''
                })`
              : 'Verificación directa requerida'
            : 'Sin alertas dependientes'}
        </span>
      </div>
    </button>
  );
}

interface ScenarioCardProps {
  scenario: Scenario;
  score: number;
  level: RiskLevel;
  servicesCount: number;
  estimatedActionsCount: number;
  isActive: boolean;
  onExplore: (scenarioId: string) => void;
}

export function ScenarioCard({
  scenario,
  score,
  level,
  servicesCount,
  estimatedActionsCount,
  isActive,
  onExplore,
}: ScenarioCardProps) {
  return (
    <div
      className={`rounded-[14px] border p-5 flex flex-col justify-between gap-4 transition-colors duration-150 ${
        isActive
          ? 'bg-[var(--bg-surface)] border-[var(--accent-primary)]'
          : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
      }`}
    >
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
            <span className="font-mono font-semibold text-[var(--text-primary)]">
              {scenario.id}
            </span>
            <span aria-hidden="true">·</span>
            <span>Escenario simulado</span>
          </div>
          <StatusBadge status={level} />
        </div>
        <h3 className="font-display text-[17px] font-bold tracking-tight text-[var(--text-primary)]">
          {scenario.title}
        </h3>
        <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
          {scenario.description}
        </p>
      </div>

      <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 text-xs text-[var(--text-secondary)] tabular-nums">
          <span>
            Índice <strong className="text-[var(--text-primary)] font-mono">{score}/100</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>{servicesCount} serv.</span>
          <span aria-hidden="true">·</span>
          <span>{estimatedActionsCount} reglas</span>
        </div>

        <button
          type="button"
          onClick={() => onExplore(scenario.id)}
          className={`px-3.5 py-1.5 rounded-[10px] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98] ${
            isActive
              ? 'bg-[var(--accent-primary)] text-white dark:text-[#08121A]'
              : 'bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[var(--accent-primary)] hover:text-white dark:hover:text-[#08121A]'
          }`}
        >
          {isActive ? 'Escenario activo' : 'Explorar'}
        </button>
      </div>
    </div>
  );
}
