import { useMemo, useState } from 'react';
import { useNexoStore } from '../../store/useNexoStore';
import { useDerivedNexo } from '../../hooks/useDerivedNexo';
import { ROLE_META, SERVICES } from '../../data/seedData';
import { canRoleUpdateAction } from '../../lib/engines/permissions';
import { ActionStatus, ServiceStatus } from '../../types/domain';
import { DependencyGraph } from '../../components/charts/DependencyGraph';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ActionCard } from '../../components/ui/ActionCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/OverlayPrimitives';

export default function CoordinationPage() {
  const scenarios = useNexoStore((s) => s.scenarios);
  const selectScenario = useNexoStore((s) => s.selectScenario);
  const overrideServiceStatus = useNexoStore((s) => s.overrideServiceStatus);
  const updateActionStatus = useNexoStore((s) => s.updateActionStatus);
  const openInspector = useNexoStore((s) => s.openDecisionInspector);
  const auditLog = useNexoStore((s) => s.auditLog);

  const {
    activeRole,
    permissions,
    activeScenario,
    dependencyGraph,
    riskIndex,
    scenarioActions,
    continuity,
    alerts,
  } = useDerivedNexo();

  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [serviceFilter, setServiceFilter] = useState<string>('TODOS');
  const [priorityFilter, setPriorityFilter] = useState<string>('TODAS');
  const [roleFilter, setRoleFilter] = useState<string>('TODOS');

  const filteredActions = useMemo(
    () =>
      scenarioActions.filter((a) => {
        if (statusFilter !== 'TODOS' && a.status !== statusFilter) return false;
        if (serviceFilter !== 'TODOS' && a.serviceId !== serviceFilter) return false;
        if (priorityFilter !== 'TODAS' && a.priority !== priorityFilter) return false;
        if (roleFilter !== 'TODOS' && a.responsibleRole !== roleFilter) return false;
        return true;
      }),
    [scenarioActions, statusFilter, serviceFilter, priorityFilter, roleFilter],
  );

  const selectClass =
    'px-2.5 py-1.5 rounded-[8px] text-xs font-medium bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 focus-visible:outline-none transition-colors cursor-pointer';

  return (
    <div className="space-y-5">
      <PageHeader
        kicker="Consola operativa"
        title="Sala de coordinación operativa"
        description="Consola integrada de alta densidad: servicios, grafo en vivo, acciones, continuidad, comunicaciones y bitácora."
        actions={
          <div className="flex items-center gap-2 text-xs font-mono tabular-nums text-[var(--text-secondary)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[10px] px-3 py-1.5">
            <span>Índice de atención:</span>
            <strong className="text-[var(--text-primary)]">{riskIndex.score}/100</strong>
          </div>
        }
      />

      {/* High-density unified filter toolbar */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[12px] p-2.5 flex flex-wrap items-center gap-2">
        <select
          aria-label="Escenario activo"
          value={activeScenario.id}
          onChange={(e) => selectScenario(e.target.value)}
          className={`${selectClass} font-semibold`}
        >
          {scenarios.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id}: {s.title}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por estado de acción"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={selectClass}
        >
          <option value="TODOS">Estado: Todos</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="EN_REVISION">En revisión</option>
          <option value="VERIFICADA">Verificada</option>
          <option value="CERRADA">Cerrada</option>
        </select>

        <select
          aria-label="Filtrar por servicio"
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className={selectClass}
        >
          <option value="TODOS">Servicio: Todos</option>
          {SERVICES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar por prioridad"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className={selectClass}
        >
          <option value="TODAS">Prioridad: Todas</option>
          <option value="ALTA">Alta</option>
          <option value="MEDIA">Media</option>
          <option value="BAJA">Baja</option>
        </select>

        <select
          aria-label="Filtrar por responsable"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={selectClass}
        >
          <option value="TODOS">Rol: Todos</option>
          {Object.entries(ROLE_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.shortLabel}
            </option>
          ))}
        </select>
      </div>

      {/* 3 Primary Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Panel 1: Services & Incidents */}
        <section className="lg:col-span-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-4 flex flex-col lg:h-[540px]">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] shrink-0">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              1. Servicios e incidentes
            </h3>
            <span className="text-xs font-mono font-bold tabular-nums text-[var(--accent-primary)]">
              {riskIndex.score}/100
            </span>
          </div>

          <div className="divide-y divide-[var(--border-subtle)] overflow-y-auto flex-1 pr-0.5">
            {Object.values(dependencyGraph.nodes).map((node) => (
              <div key={node.service.id} className="py-2.5 first:pt-3 last:pb-1 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                    {node.service.name}
                  </span>
                  <StatusBadge status={node.effectiveStatus} />
                </div>
                <select
                  aria-label={`Estado rápido de ${node.service.name}`}
                  value={node.effectiveStatus}
                  disabled={!permissions.canOverrideServices}
                  onChange={(e) =>
                    overrideServiceStatus(node.service.id, e.target.value as ServiceStatus)
                  }
                  className="w-full px-2 py-1 rounded-[6px] text-[11px] bg-[var(--bg-surface-2)]/70 border border-[var(--border-subtle)] text-[var(--text-primary)] disabled:opacity-50 cursor-pointer"
                >
                  <option value="OPERATIVO">Operativo</option>
                  <option value="EN_OBSERVACION">En observación</option>
                  <option value="LIMITADO">Limitado</option>
                  <option value="NO_DISPONIBLE">No disponible</option>
                  <option value="SIN_CONFIRMAR">Sin confirmar</option>
                </select>
              </div>
            ))}
          </div>
        </section>

        {/* Panel 2: Dependencies & Situation */}
        <section className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-4 flex flex-col justify-between gap-3 lg:h-[540px]">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] shrink-0">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              2. Dependencias y situación
            </h3>
            <StatusBadge status={riskIndex.level} />
          </div>

          <div className="flex-1 flex items-center">
            <div className="w-full">
              <DependencyGraph
                graph={dependencyGraph}
                compact
                selectedServiceId={serviceFilter !== 'TODOS' ? serviceFilter : undefined}
                onSelectService={(id) =>
                  setServiceFilter((prev) => (prev === id ? 'TODOS' : id))
                }
              />
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] text-xs space-y-1 shrink-0">
            <p className="font-semibold text-[var(--text-primary)]">
              Resumen del escenario activo: {activeScenario.title}
            </p>
            <p className="text-[var(--text-secondary)] font-mono text-[11px] leading-relaxed">
              {dependencyGraph.servicesRequiringVerification.length} servicios requieren verificación técnica ·{' '}
              {riskIndex.formulaText}
            </p>
          </div>
        </section>

        {/* Panel 3: Actions & Decisions */}
        <section className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-4 flex flex-col lg:h-[540px]">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] shrink-0">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              3. Acciones y decisiones
            </h3>
            <span className="text-xs font-mono font-semibold tabular-nums text-[var(--text-secondary)]">
              {filteredActions.length}
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto flex-1 pt-3 pr-1">
            {filteredActions.length === 0 ? (
              <EmptyState
                title="Sin coincidencias"
                description="Ajuste los filtros superiores para visualizar más acciones operativas."
              />
            ) : (
              filteredActions.map((act) => (
                <ActionCard
                  key={act.id}
                  action={act}
                  compact
                  canUpdate={canRoleUpdateAction(activeRole, act)}
                  onStatusChange={(id, status: ActionStatus) => updateActionStatus(id, status)}
                  onInspect={(a) =>
                    openInspector({
                      kind: 'ACTION',
                      id: a.id,
                      title: a.title,
                      ruleId: a.ruleId,
                      ruleVersion: a.ruleVersion,
                      serviceId: a.serviceId,
                      justification: a.justification,
                      sourceId: a.sourceId,
                      evidence: a.evidence,
                      limitations: ['Supervisión humana obligatoria.'],
                    })
                  }
                />
              ))
            )}
          </div>
        </section>
      </div>

      {/* Bottom 3-column unified strip: Continuity, Communications, Audit */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)] overflow-hidden">
        <div className="p-4 space-y-2.5">
          <h4 className="text-xs font-bold text-[var(--text-primary)]">Continuidad</h4>
          <ul className="divide-y divide-[var(--border-subtle)] text-xs">
            {continuity.plans.slice(0, 4).map((p) => (
              <li key={p.activityId} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                <span className="truncate text-[var(--text-primary)]">{p.activityTitle}</span>
                <StatusBadge status={p.status} />
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 space-y-2.5">
          <h4 className="text-xs font-bold text-[var(--text-primary)]">Comunicaciones</h4>
          <ul className="divide-y divide-[var(--border-subtle)] text-xs">
            {alerts.slice(0, 4).map((al) => (
              <li key={al.id} className="py-2 first:pt-0 last:pb-0 flex items-center justify-between gap-2">
                <span className="truncate text-[var(--text-primary)]">{al.title}</span>
                <StatusBadge status={al.status} />
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 space-y-2.5">
          <h4 className="text-xs font-bold text-[var(--text-primary)]">Bitácora reciente</h4>
          <ul className="divide-y divide-[var(--border-subtle)] text-xs">
            {auditLog.slice(0, 4).map((entry) => (
              <li key={entry.id} className="py-2 first:pt-0 last:pb-0 text-[var(--text-secondary)] truncate">
                <span className="font-mono tabular-nums text-[var(--text-primary)]">
                  {entry.timestamp.slice(11, 16)}
                </span>{' '}
                · {entry.summary}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
