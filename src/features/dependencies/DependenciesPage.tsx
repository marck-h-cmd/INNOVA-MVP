import { useMemo, useState } from 'react';
import { ArrowRight, GitCompare, RotateCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNexoStore } from '../../store/useNexoStore';
import { useDerivedNexo } from '../../hooks/useDerivedNexo';
import {
  CONTINUITY_ACTIVITIES,
  DEPENDENCIES,
  FACILITIES,
  SERVICES,
  SOURCES,
} from '../../data/seedData';
import { evaluateDependencies } from '../../lib/engines/dependencyEngine';
import { ServiceStatus } from '../../types/domain';
import {
  DependencyEdgeFilter,
  DependencyGraph,
} from '../../components/charts/DependencyGraph';
import { PageHeader } from '../../components/ui/PageHeader';
import { ServiceNode } from '../../components/ui/ServiceNode';
import { SourceBadge, StatusBadge } from '../../components/ui/StatusBadge';

const SERVICE_STATUS_LABEL: Record<ServiceStatus, string> = {
  OPERATIVO: 'Operativo',
  EN_OBSERVACION: 'En observación',
  LIMITADO: 'Limitado',
  NO_DISPONIBLE: 'No disponible',
  SIN_CONFIRMAR: 'Sin confirmar',
};

export default function DependenciesPage() {
  const scenarios = useNexoStore((s) => s.scenarios);
  const selectScenario = useNexoStore((s) => s.selectScenario);
  const overrideServiceStatus = useNexoStore((s) => s.overrideServiceStatus);
  const resetScenarioToBaseline = useNexoStore((s) => s.resetScenarioToBaseline);

  const {
    activeScenario,
    dependencyGraph,
    scenarioActions,
    continuity,
    permissions,
  } = useDerivedNexo();

  const [selectedId, setSelectedId] = useState<string>('SRV-01');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeFilter, setEdgeFilter] = useState<DependencyEdgeFilter>('ALL');
  const [compareMode, setCompareMode] = useState(false);

  const selectedNode =
    dependencyGraph.nodes[selectedId] ?? dependencyGraph.nodes['SRV-01'];
  const selectedSource = SOURCES.find(
    (s) => s.id === selectedNode.service.sourceId,
  );

  const selectedEdge = selectedEdgeId
    ? dependencyGraph.edges.find((e) => e.dependency.id === selectedEdgeId) ?? null
    : null;
  const selectedEdgeSource = selectedEdge
    ? SOURCES.find((s) => s.id === selectedEdge.dependency.sourceId)
    : null;

  const activeEdgesCount = dependencyGraph.edges.filter(
    (e) => e.isActivePropagation,
  ).length;
  const historicalEdgesCount = dependencyGraph.edges.filter(
    (e) => e.dependency.evidenceType === 'ANTECEDENTE_DOCUMENTAL',
  ).length;

  const relatedActions = scenarioActions.filter(
    (a) => a.serviceId === selectedNode.service.id,
  );

  const affectedFacilities = useMemo(
    () =>
      FACILITIES.filter((f) => f.serviceIds.includes(selectedNode.service.id)),
    [selectedNode.service.id],
  );

  const linkedContinuityPlans = useMemo(() => {
    const matchingActivityIds = new Set(
      CONTINUITY_ACTIVITIES.filter((a) =>
        a.requiredServices.includes(selectedNode.service.id),
      ).map((a) => a.id),
    );
    return continuity.plans.filter((p) => matchingActivityIds.has(p.activityId));
  }, [continuity.plans, selectedNode.service.id]);

  const comparisonGraphs = useMemo(() => {
    if (!compareMode) return null;
    const operationalScenario = {
      ...activeScenario,
      serviceOverrides: {
        ...activeScenario.serviceOverrides,
        [selectedId]: 'OPERATIVO' as ServiceStatus,
      },
    };
    const outageScenario = {
      ...activeScenario,
      serviceOverrides: {
        ...activeScenario.serviceOverrides,
        [selectedId]: 'NO_DISPONIBLE' as ServiceStatus,
      },
    };
    return {
      operational: evaluateDependencies(SERVICES, DEPENDENCIES, operationalScenario),
      outage: evaluateDependencies(SERVICES, DEPENDENCIES, outageScenario),
    };
  }, [compareMode, activeScenario, selectedId]);

  const handleSelectService = (serviceId: string) => {
    setSelectedId(serviceId);
    setSelectedEdgeId(null);
  };

  const handleSelectEdge = (edgeId: string) => {
    setSelectedEdgeId((prev) => (prev === edgeId ? null : edgeId));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`Propagación dirigida · ${activeScenario.id} · ${dependencyGraph.servicesRequiringVerification.length} servicios por verificar`}
        title="Grafo interactivo de dependencias"
        description="Una dependencia solicita verificación técnica, pero nunca asume automáticamente que el servicio dependiente haya fallado."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="dep-scenario-select" className="sr-only">
              Escenario activo para el grafo de dependencias
            </label>
            <select
              id="dep-scenario-select"
              value={activeScenario.id}
              onChange={(e) => selectScenario(e.target.value)}
              className="px-3 py-2 rounded-[10px] text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] cursor-pointer"
            >
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.id} · {sc.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setCompareMode((v) => !v)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                compareMode
                  ? 'bg-[var(--accent-primary)] text-white dark:text-[#08121A] border-[var(--accent-primary)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-subtle)] hover:bg-[var(--bg-surface-2)]'
              }`}
            >
              <GitCompare className="w-4 h-4" aria-hidden="true" />
              <span>
                {compareMode
                  ? 'Ocultar comparación'
                  : 'Comparar operativo vs. interrupción'}
              </span>
            </button>
          </div>
        }
      />

      {/* Main Graph + Explanation Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-5">
          {/* Graph filter & quick reset toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex flex-wrap items-center gap-1 p-1 rounded-[10px] bg-[var(--bg-surface-2)]">
              {(
                [
                  ['ALL', `Todas (${dependencyGraph.edges.length})`],
                  ['ACTIVE', `Propagación activa (${activeEdgesCount})`],
                  ['HISTORICAL', `Antecedente UNT 2025 (${historicalEdgesCount})`],
                ] as [DependencyEdgeFilter, string][]
              ).map(([filterKey, label]) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setEdgeFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    edgeFilter === filterKey
                      ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {permissions.canEditScenario && (
              <button
                type="button"
                onClick={() => resetScenarioToBaseline(activeScenario.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--bg-surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Restaurar servicios del escenario</span>
              </button>
            )}
          </div>

          <DependencyGraph
            graph={dependencyGraph}
            selectedServiceId={selectedEdge ? null : selectedId}
            selectedEdgeId={selectedEdgeId}
            edgeFilter={edgeFilter}
            onSelectService={handleSelectService}
            onSelectEdge={handleSelectEdge}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.values(dependencyGraph.nodes).map((node) => (
              <ServiceNode
                key={node.service.id}
                node={node}
                selected={!selectedEdge && node.service.id === selectedId}
                onSelect={handleSelectService}
              />
            ))}
          </div>
        </div>

        {/* Right Explanation Panel: Edge Inspector OR Service Inspector */}
        <aside className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-4">
          {selectedEdge ? (
            <>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    {selectedEdge.dependency.id} ·{' '}
                    {selectedEdge.dependency.evidenceType === 'ANTECEDENTE_DOCUMENTAL'
                      ? 'Antecedente UNT 2025'
                      : 'Relación de ejemplo'}
                  </span>
                  <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                    {dependencyGraph.nodes[selectedEdge.dependency.sourceServiceId]?.service.name ??
                      selectedEdge.dependency.sourceServiceId}{' '}
                    →{' '}
                    {dependencyGraph.nodes[selectedEdge.dependency.targetServiceId]?.service.name ??
                      selectedEdge.dependency.targetServiceId}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedEdgeId(null)}
                  className="text-xs font-semibold text-[var(--accent-primary)] hover:underline shrink-0 cursor-pointer"
                >
                  Ver servicio
                </button>
              </div>

              <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/50 p-3.5 space-y-1.5">
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  {selectedEdge.isActivePropagation
                    ? 'Propagación activa en el escenario actual'
                    : 'Relación en reposo en el escenario actual'}
                </p>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {selectedEdge.isActivePropagation
                    ? `El servicio origen se encuentra en estado "${SERVICE_STATUS_LABEL[selectedEdge.sourceStatus]}", por lo que el motor solicita verificar el servicio destino sin asumir falla automática.`
                    : `El servicio origen se encuentra "${SERVICE_STATUS_LABEL[selectedEdge.sourceStatus]}", por lo que esta dependencia no propaga alertas en este momento.`}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
                  Regla de condición
                </h4>
                <p className="text-xs font-mono text-[var(--text-primary)] bg-[var(--bg-surface-2)]/60 rounded-[8px] px-3 py-2">
                  {selectedEdge.dependency.condition}
                </p>
              </div>

              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
                  Fundamento técnico / pedagógico
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {selectedEdge.dependency.rationale}
                </p>
              </div>

              {selectedEdgeSource && (
                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1.5">
                  <SourceBadge type={selectedEdgeSource.type} />
                  <p className="text-xs font-medium text-[var(--text-primary)]">
                    {selectedEdgeSource.title}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)]">
                    {selectedEdgeSource.limitations}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleSelectService(selectedEdge.dependency.sourceServiceId)
                  }
                  className="px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)] cursor-pointer"
                >
                  Inspeccionar origen
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSelectService(selectedEdge.dependency.targetServiceId)
                  }
                  className="px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--accent-primary)] text-white dark:text-[#08121A] cursor-pointer"
                >
                  Inspeccionar destino
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    {selectedNode.service.id} · {selectedNode.service.category}
                  </span>
                  <h3 className="text-lg font-bold text-[var(--text-primary)]">
                    {selectedNode.service.name}
                  </h3>
                </div>
                <StatusBadge status={selectedNode.effectiveStatus} />
              </div>

              <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                {selectedNode.service.description}
              </p>

              {/* Status Explanation Card */}
              <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/45 p-3.5 space-y-2">
                <h4 className="text-xs font-bold text-[var(--text-primary)]">
                  Explicación en {activeScenario.id} ({activeScenario.title})
                </h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {selectedNode.isDirectOverride
                    ? `Estado modificado directamente para el escenario activo (${SERVICE_STATUS_LABEL[selectedNode.effectiveStatus]}).`
                    : `Estado base operativo (${SERVICE_STATUS_LABEL[selectedNode.effectiveStatus]}).`}
                  {selectedNode.triggeredByDependencies.length > 0
                    ? ` Además, recibe ${selectedNode.triggeredByDependencies.length} solicitud(es) de verificación desde servicios aguas arriba.`
                    : ' Sin alertas propagadas desde otros servicios.'}
                </p>

                {selectedNode.triggeredByDependencies.length > 0 && (
                  <div className="pt-1.5 space-y-1.5">
                    {selectedNode.triggeredByDependencies.map((trig) => (
                      <button
                        key={trig.dependencyId}
                        type="button"
                        onClick={() => setSelectedEdgeId(trig.dependencyId)}
                        className="w-full text-left rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] px-2.5 py-2 text-xs hover:border-[var(--accent-primary)] transition-colors cursor-pointer"
                      >
                        <div className="flex items-center justify-between gap-2 font-semibold text-[var(--text-primary)]">
                          <span>
                            {trig.dependencyId}: desde {trig.sourceServiceName}
                          </span>
                          <span className="text-[11px] font-mono text-[var(--accent-primary)]">
                            Ver regla
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                          {trig.rationale}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status control */}
              <div className="space-y-1.5">
                <label
                  htmlFor="dep-status-select"
                  className="text-xs font-semibold text-[var(--text-primary)] block"
                >
                  Estado simulado del servicio
                </label>
                <select
                  id="dep-status-select"
                  value={selectedNode.effectiveStatus}
                  disabled={!permissions.canOverrideServices}
                  onChange={(e) =>
                    overrideServiceStatus(
                      selectedNode.service.id,
                      e.target.value as ServiceStatus,
                    )
                  }
                  className="w-full px-3 py-2 rounded-[10px] text-xs font-semibold bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] disabled:opacity-50 cursor-pointer"
                >
                  <option value="OPERATIVO">Operativo</option>
                  <option value="EN_OBSERVACION">En observación</option>
                  <option value="LIMITADO">Limitado</option>
                  <option value="NO_DISPONIBLE">No disponible</option>
                  <option value="SIN_CONFIRMAR">Sin confirmar</option>
                </select>
              </div>

              {/* Downstream dependents */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
                  Servicios dependientes ({selectedNode.downstreamDependentIds.length})
                </h4>
                {selectedNode.downstreamDependentIds.length === 0 ? (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Nodo terminal: no tiene servicios aguas abajo.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {selectedNode.downstreamDependentIds.map((targetId) => {
                      const dep = DEPENDENCIES.find(
                        (d) =>
                          d.sourceServiceId === selectedNode.service.id &&
                          d.targetServiceId === targetId,
                      );
                      const tgtNode = dependencyGraph.nodes[targetId];
                      return (
                        <li key={targetId}>
                          <button
                            type="button"
                            onClick={() =>
                              dep
                                ? setSelectedEdgeId(dep.id)
                                : handleSelectService(targetId)
                            }
                            className="w-full text-left rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/40 hover:border-[var(--accent-primary)] p-3 space-y-1 transition-colors cursor-pointer"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold text-[var(--text-primary)]">
                                {tgtNode?.service.name ?? targetId}
                              </span>
                              {tgtNode && (
                                <StatusBadge status={tgtNode.effectiveStatus} />
                              )}
                            </div>
                            {dep && (
                              <p className="text-[11px] text-[var(--text-secondary)]">
                                {dep.evidenceType === 'ANTECEDENTE_DOCUMENTAL'
                                  ? 'Antecedente UNT 2025'
                                  : 'Relación de ejemplo'}
                                : {dep.rationale}
                              </p>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Impact on fictional campus & continuity */}
              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
                    Impacto en plano ficticio y continuidad
                  </h4>
                  <Link
                    to="/mapa"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-primary)] hover:underline"
                  >
                    <span>Ver plano</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">
                  Instalaciones ficticias vinculadas:{' '}
                  <strong className="text-[var(--text-primary)]">
                    {affectedFacilities.map((f) => f.code).join(', ')}
                  </strong>{' '}
                  · Actividades condicionadas:{' '}
                  <strong className="font-mono tabular-nums text-[var(--text-primary)]">
                    {linkedContinuityPlans.length}
                  </strong>
                </p>
              </div>

              {/* Source & related actions */}
              {selectedSource && (
                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1">
                  <SourceBadge type={selectedSource.type} />
                  <p className="text-xs font-medium text-[var(--text-primary)]">
                    {selectedSource.title}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
                    Acciones vinculadas ({relatedActions.length})
                  </h4>
                  <Link
                    to="/acciones"
                    className="text-[11px] font-semibold text-[var(--accent-primary)] hover:underline"
                  >
                    Ir a acciones
                  </Link>
                </div>
                {relatedActions.length === 0 ? (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Sin acciones generadas para este servicio en {activeScenario.id}.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {relatedActions.map((act) => (
                      <li
                        key={act.id}
                        className="text-xs text-[var(--text-primary)] flex items-center justify-between gap-2"
                      >
                        <span className="truncate">{act.title}</span>
                        <StatusBadge status={act.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* Operational vs Outage Comparison */}
      {compareMode && comparisonGraphs && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Si {selectedNode.service.name} está Operativo
              </h4>
              <StatusBadge status="OPERATIVO" />
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Servicios que requieren verificación:{' '}
              <strong className="font-mono tabular-nums text-[var(--text-primary)]">
                {comparisonGraphs.operational.servicesRequiringVerification.length}
              </strong>
            </p>
            <div className="flex flex-wrap gap-2">
              {comparisonGraphs.operational.servicesRequiringVerification.length === 0 ? (
                <span className="text-xs text-[var(--text-secondary)]">
                  Sin verificaciones adicionales pendientes.
                </span>
              ) : (
                comparisonGraphs.operational.servicesRequiringVerification.map((n) => (
                  <span key={n.service.id} className="text-xs text-[var(--text-secondary)]">
                    · {n.service.name} ({SERVICE_STATUS_LABEL[n.effectiveStatus]})
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="bg-[var(--bg-surface)] border border-[#B62C49]/40 rounded-[14px] p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">
                Si {selectedNode.service.name} pasa a No disponible
              </h4>
              <StatusBadge status="NO_DISPONIBLE" />
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Servicios que requieren verificación:{' '}
              <strong className="font-mono tabular-nums text-[#B62C49] dark:text-[#F2728C]">
                {comparisonGraphs.outage.servicesRequiringVerification.length}
              </strong>{' '}
              <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                (+
                {Math.max(
                  0,
                  comparisonGraphs.outage.servicesRequiringVerification.length -
                    comparisonGraphs.operational.servicesRequiringVerification.length,
                )}{' '}
                adicionales)
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {comparisonGraphs.outage.servicesRequiringVerification.map((n) => (
                <span key={n.service.id} className="text-xs text-[var(--text-primary)]">
                  · {n.service.name} ({SERVICE_STATUS_LABEL[n.effectiveStatus]})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
