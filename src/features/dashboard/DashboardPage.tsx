import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ExternalLink, GitCompare, Play, ShieldCheck } from 'lucide-react';
import { useNexoStore } from '../../store/useNexoStore';
import { useDerivedNexo } from '../../hooks/useDerivedNexo';
import { ROLE_META, SERVICES, SOURCES } from '../../data/seedData';
import { ServiceStatus } from '../../types/domain';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { RiskIndicator, SourceBadge, StatusBadge } from '../../components/ui/StatusBadge';
import { ActionCard } from '../../components/ui/ActionCard';
import { DependencyGraph } from '../../components/charts/DependencyGraph';
import { EmptyState, Timeline } from '../../components/ui/OverlayPrimitives';
import { canRoleUpdateAction } from '../../lib/engines/permissions';

export default function DashboardPage() {
  const navigate = useNavigate();
  const scenarios = useNexoStore((s) => s.scenarios);
  const selectScenario = useNexoStore((s) => s.selectScenario);
  const overrideServiceStatus = useNexoStore((s) => s.overrideServiceStatus);
  const updateActionStatus = useNexoStore((s) => s.updateActionStatus);
  const openDecisionInspector = useNexoStore((s) => s.openDecisionInspector);
  const setWhatIfOpen = useNexoStore((s) => s.setWhatIfOpen);
  const auditLog = useNexoStore((s) => s.auditLog);

  const {
    activeRole,
    permissions,
    activeScenario,
    dependencyGraph,
    riskIndex,
    continuity,
    scenarioActions,
    pendingActions,
    affectedActivities,
    scenarioSources,
  } = useDerivedNexo();

  const [selectedServiceId, setSelectedServiceId] = useState<string>('SRV-01');
  const selectedNode = dependencyGraph.nodes[selectedServiceId] ?? dependencyGraph.nodes['SRV-01'];

  // Deterministic scenario evolution curve derived directly from active inputs & index weights
  const evolutionSeries = useMemo(() => {
    const rain = activeScenario.inputs.rainIntensity;
    const srv = riskIndex.components[1]?.rawValue ?? 0;
    const acc = riskIndex.components[2]?.rawValue ?? 0;
    const cont = riskIndex.components[3]?.rawValue ?? 0;

    const projectPhase = (fase: string, rainScale: number, srvScale: number, accScale: number, contScale: number) => {
      const r = Math.round(rain * rainScale);
      const s = Math.round(srv * srvScale);
      const a = Math.round(acc * accScale);
      const c = Math.round(cont * contScale);
      const score = Math.round(r * 0.3 + s * 0.3 + a * 0.25 + c * 0.15);
      return { fase, lluvia: r, servicios: s, indice: score };
    };

    return [
      projectPhase('00m Base', 0.25, 0.0, 0.2, 0.15),
      projectPhase('15m Aviso', 0.65, 0.35, 0.45, 0.4),
      { fase: '30m Incidente', lluvia: rain, servicios: srv, indice: riskIndex.score },
      projectPhase('45m Verif.', 0.85, 0.85, 0.8, 0.85),
      projectPhase('60m Control', 0.6, 0.6, 0.65, 0.65),
    ];
  }, [activeScenario.inputs.rainIntensity, riskIndex]);

  const recentAuditItems = useMemo(
    () =>
      auditLog.slice(0, 4).map((entry) => ({
        id: entry.id,
        timeLabel: entry.timestamp.replace('T', ' ').slice(0, 16),
        title: entry.summary,
        description: `${entry.previousState} → ${entry.nextState}`,
        meta: ROLE_META[entry.actorRole].shortLabel,
        tone: 'active' as const,
      })),
    [auditLog],
  );

  const visibleSources = scenarioSources.length > 0 ? scenarioSources : SOURCES.slice(0, 4);

  const totalPlans = Math.max(1, continuity.plans.length);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`Escenario activo · ${activeScenario.id} · ${activeScenario.title}`}
        title="Centro de control"
        description="Información conectada para decisiones mejor fundamentadas: del aviso documental a acciones verificables."
        actions={
          <>
            <button
              type="button"
              onClick={() => setWhatIfOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98]"
            >
              <GitCompare className="w-4 h-4 text-[var(--accent-primary)]" aria-hidden="true" />
              <span>Explorar alternativas</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/demo')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-semibold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white dark:text-[#08121A] transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98]"
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              <span>Iniciar escenario</span>
            </button>
          </>
        }
      />

      {/* Sleek Scenario Switcher Rail */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="px-2 flex items-center gap-2 text-xs">
          <span className="font-semibold text-[var(--text-secondary)]">Escenarios de ejercicio:</span>
          <span className="font-mono font-semibold text-[var(--text-primary)]">
            {activeScenario.id}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1 bg-[var(--bg-surface-2)]/70 p-1 rounded-[10px]">
          {scenarios.map((sc) => {
            const active = sc.id === activeScenario.id;
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => selectScenario(sc.id)}
                className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs border border-[var(--border-subtle)]/80'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent'
                }`}
              >
                {sc.title}
              </button>
            );
          })}
        </div>
      </div>

      {/* Block 1: 4 KPI Cards */}
      <section aria-label="Indicadores operativos clave" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard
          title="Atención operativa"
          value={`${riskIndex.score}/100`}
          subtitle="Índice didáctico ponderado (lluvia 30%, servicios 30%, accesos 25%, continuidad 15%)."
          statusSlot={<StatusBadge status={riskIndex.level} />}
          onClick={() => navigate('/explicabilidad')}
          actionLabel="Ver fórmula"
        />

        <MetricCard
          title="Servicios que requieren verificación"
          value={dependencyGraph.servicesRequiringVerification.length}
          subtitle={`De ${SERVICES.length} servicios monitoreados en simulación.`}
          statusSlot={
            <StatusBadge
              status={
                dependencyGraph.servicesRequiringVerification.length > 0
                  ? 'EN_OBSERVACION'
                  : 'OPERATIVO'
              }
            />
          }
          footerMeta={
            dependencyGraph.servicesRequiringVerification
              .map((n) => n.service.name)
              .slice(0, 2)
              .join(' · ') || 'Sin verificaciones pendientes'
          }
          onClick={() => navigate('/dependencias')}
          actionLabel="Ver grafo"
        />

        <MetricCard
          title="Acciones pendientes"
          value={pendingActions.length}
          subtitle={`De ${scenarioActions.length} acciones trazables en este escenario.`}
          statusSlot={
            <StatusBadge
              status={pendingActions.length > 0 ? 'PENDIENTE' : 'VERIFICADA'}
            />
          }
          footerMeta="Generadas por reglas deterministas"
          onClick={() => navigate('/acciones')}
          actionLabel="Gestionar"
        />

        <MetricCard
          title="Actividades potencialmente afectadas"
          value={affectedActivities.length}
          subtitle={`De ${continuity.plans.length} actividades académicas y administrativas ficticias.`}
          statusSlot={
            <StatusBadge
              status={affectedActivities.length > 0 ? 'ALTERNATIVA_PROPUESTA' : 'NORMAL'}
            />
          }
          footerMeta={`${continuity.normalCount} en operación normal`}
          onClick={() => navigate('/continuidad')}
          actionLabel="Evaluar continuidad"
        />
      </section>

      {/* Block 2: 8 cols Graph + 4 cols Actions */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                  Grafo de dependencias y verificación
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Seleccione un nodo para inspeccionar conexiones o cambiar su estado simulado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dependencias')}
                className="text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
              >
                Abrir análisis completo
              </button>
            </div>

            <DependencyGraph
              graph={dependencyGraph}
              selectedServiceId={selectedServiceId}
              onSelectService={setSelectedServiceId}
            />
          </div>

          {/* Selected node inline hairline inspector */}
          {selectedNode && (
            <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                    {selectedNode.service.id}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    {selectedNode.service.name}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {selectedNode.triggeredByDependencies.length > 0
                    ? `Verificación activada por: ${selectedNode.triggeredByDependencies
                        .map((d) => d.sourceServiceName)
                        .join(', ')}`
                    : selectedNode.service.description}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={selectedNode.effectiveStatus} />
                <select
                  aria-label={`Cambiar estado de ${selectedNode.service.name}`}
                  value={selectedNode.effectiveStatus}
                  disabled={!permissions.canOverrideServices}
                  onChange={(e) =>
                    overrideServiceStatus(
                      selectedNode.service.id,
                      e.target.value as ServiceStatus,
                    )
                  }
                  className="px-2.5 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] disabled:opacity-50 cursor-pointer"
                >
                  <option value="OPERATIVO">Operativo</option>
                  <option value="EN_OBSERVACION">En observación</option>
                  <option value="LIMITADO">Limitado</option>
                  <option value="NO_DISPONIBLE">No disponible</option>
                  <option value="SIN_CONFIRMAR">Sin confirmar</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Acciones que requieren atención
            </h3>
            <button
              type="button"
              onClick={() => navigate('/acciones')}
              className="text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
            >
              Ver todas ({scenarioActions.length})
            </button>
          </div>

          <div className="space-y-3">
            {pendingActions.length === 0 ? (
              <EmptyState
                title="Sin acciones pendientes"
                description="Todas las acciones de este escenario han sido verificadas o cerradas."
              />
            ) : (
              pendingActions.slice(0, 3).map((action) => (
                <ActionCard
                  key={action.id}
                  action={action}
                  compact
                  canUpdate={canRoleUpdateAction(activeRole, action)}
                  onStatusChange={updateActionStatus}
                  onInspect={(act) =>
                    openDecisionInspector({
                      kind: 'ACTION',
                      id: act.id,
                      title: act.title,
                      ruleId: act.ruleId,
                      ruleVersion: act.ruleVersion,
                      serviceId: act.serviceId,
                      justification: act.justification,
                      sourceId: act.sourceId,
                      evidence: act.evidence,
                      limitations: [
                        'Acción generada para ejercicio de demostración.',
                        'Requiere verificación en campo antes de cerrar.',
                      ],
                    })
                  }
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Block 3: Evolution Chart + Continuity Summary + Recent Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                Evolución del escenario simulado
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Proyección didáctica según parámetros activos.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-[#126A64] dark:bg-[#75D5C4] inline-block" />
                Índice
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-[#80263C] dark:bg-[#E36D88] inline-block" />
                Servicios
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionSeries} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="nexoRiskFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#126A64" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#126A64" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="nexoSrvFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#80263C" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#80263C" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="fase"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    boxShadow: '0 4px 12px rgba(16,28,39,0.08)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="indice"
                  name="Atención operativa (sim.)"
                  stroke="#126A64"
                  fill="url(#nexoRiskFill)"
                  strokeWidth={2.2}
                />
                <Area
                  type="monotone"
                  dataKey="servicios"
                  name="Severidad servicios (%)"
                  stroke="#80263C"
                  fill="url(#nexoSrvFill)"
                  strokeWidth={1.8}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <RiskIndicator
            score={riskIndex.score}
            level={riskIndex.level}
            label={riskIndex.label}
          />
        </div>

        <div className="lg:col-span-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
                Estado de continuidad
              </h3>
              <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)]" aria-hidden="true" />
            </div>

            {/* Proportion Bar */}
            <div
              className="h-2 w-full rounded-full bg-[var(--bg-surface-2)] overflow-hidden flex"
              aria-hidden="true"
            >
              <div
                className="bg-[#178353] dark:bg-[#4AD196]"
                style={{ width: `${(continuity.normalCount / totalPlans) * 100}%` }}
              />
              <div
                className="bg-[var(--accent-primary)]"
                style={{ width: `${(continuity.alternativeCount / totalPlans) * 100}%` }}
              />
              <div
                className="bg-[#A96A00] dark:bg-[#F0B44C]"
                style={{
                  width: `${
                    ((continuity.reviewCount + continuity.insufficientDataCount) / totalPlans) *
                    100
                  }%`,
                }}
              />
              <div
                className="bg-[#B62C49] dark:bg-[#F2728C]"
                style={{ width: `${(continuity.suspendedCount / totalPlans) * 100}%` }}
              />
            </div>

            <dl className="divide-y divide-[var(--border-subtle)] text-[13px]">
              <div className="flex items-center justify-between py-2">
                <dt className="text-[var(--text-secondary)]">Operación normal</dt>
                <dd className="font-mono font-bold tabular-nums">{continuity.normalCount}</dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-[var(--text-secondary)]">Alternativa propuesta</dt>
                <dd className="font-mono font-bold tabular-nums text-[var(--accent-primary)]">
                  {continuity.alternativeCount}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-[var(--text-secondary)]">En revisión</dt>
                <dd className="font-mono font-bold tabular-nums">{continuity.reviewCount}</dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-[var(--text-secondary)]">Suspensión sugerida</dt>
                <dd className="font-mono font-bold tabular-nums text-[#B62C49] dark:text-[#F2728C]">
                  {continuity.suspendedCount}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-[var(--text-secondary)]">Datos insuficientes</dt>
                <dd className="font-mono font-bold tabular-nums">{continuity.insufficientDataCount}</dd>
              </div>
            </dl>
          </div>

          <button
            type="button"
            onClick={() => navigate('/continuidad')}
            className="w-full py-2 rounded-[10px] text-xs font-semibold bg-[var(--bg-surface-2)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Analizar alternativas
          </button>
        </div>

        <div className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
              Actividad reciente
            </h3>
            <button
              type="button"
              onClick={() => navigate('/bitacora')}
              className="text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
            >
              Ver bitácora
            </button>
          </div>
          <Timeline items={recentAuditItems} />
        </div>
      </section>

      {/* Block 4: Hairline-divided Reference Sources */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-bold text-[var(--text-primary)]">
              Fuentes de referencia
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Referencias documentales institucionales; NEXO no consume pronósticos meteorológicos en tiempo real.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/fuentes')}
            className="text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
          >
            Catálogo completo
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)]">
          {visibleSources.map((src) => (
            <div
              key={src.id}
              className="p-4 flex flex-col justify-between gap-3 hover:bg-[var(--bg-surface-2)]/30 transition-colors"
            >
              <div className="space-y-1.5">
                <SourceBadge type={src.type} />
                <h4 className="text-xs font-bold text-[var(--text-primary)] leading-snug">
                  {src.title}
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {src.institution} · {src.date}
                </p>
              </div>
              {src.url.startsWith('http') ? (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                >
                  <span>Abrir fuente</span>
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
                </a>
              ) : (
                <span className="text-[11px] text-[var(--text-secondary)]">
                  Parámetro interno de simulación
                </span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
