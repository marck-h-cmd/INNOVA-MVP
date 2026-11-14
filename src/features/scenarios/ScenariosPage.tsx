import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RotateCcw } from 'lucide-react';
import { useNexoStore } from '../../store/useNexoStore';
import { useDerivedNexo } from '../../hooks/useDerivedNexo';
import {
  CONTINUITY_ACTIVITIES,
  DEPENDENCIES,
  FACILITIES,
  RULES,
  SCENARIOS as SEED_SCENARIOS,
  SERVICES,
} from '../../data/seedData';
import { computeEngineSnapshot } from '../../lib/engines/whatIfEngine';
import { ScenarioInputs, ServiceStatus } from '../../types/domain';
import { ScenarioCard } from '../../components/ui/ServiceNode';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';

export default function ScenariosPage() {
  const scenarios = useNexoStore((s) => s.scenarios);
  const selectScenario = useNexoStore((s) => s.selectScenario);
  const updateScenarioInputs = useNexoStore((s) => s.updateScenarioInputs);
  const overrideServiceStatus = useNexoStore((s) => s.overrideServiceStatus);
  const resetScenarioToBaseline = useNexoStore((s) => s.resetScenarioToBaseline);

  const {
    activeScenario,
    dependencyGraph,
    riskIndex,
    matchedRules,
    scenarioActions,
    affectedActivities,
    permissions,
  } = useDerivedNexo();

  const scenarioSummaries = useMemo(
    () =>
      scenarios.map((sc) => ({
        scenario: sc,
        snapshot: computeEngineSnapshot(
          sc,
          SERVICES,
          DEPENDENCIES,
          RULES,
          CONTINUITY_ACTIVITIES,
          FACILITIES,
        ),
      })),
    [scenarios],
  );

  // Baseline "Antes" for active scenario from immutable seedData
  const baselineSnapshot = useMemo(() => {
    const seed = SEED_SCENARIOS.find((s) => s.id === activeScenario.id) ?? SEED_SCENARIOS[0];
    return computeEngineSnapshot(
      seed,
      SERVICES,
      DEPENDENCIES,
      RULES,
      CONTINUITY_ACTIVITIES,
      FACILITIES,
    );
  }, [activeScenario.id]);

  const restoreActiveBaseline = () => {
    resetScenarioToBaseline(activeScenario.id);
  };

  const scenarioGeneratedActionsCount = scenarioActions.filter(
    (a) => !a.isHistoricalSeed,
  ).length;

  const sliderConfigs: { key: keyof ScenarioInputs; label: string; hint: string }[] = [
    {
      key: 'rainIntensity',
      label: 'Intensidad de lluvia simulada',
      hint: 'Peso 30% en el índice de atención operativa.',
    },
    {
      key: 'serviceDisruption',
      label: 'Interrupción de servicios (severidad base)',
      hint: 'Peso 30% combinado con el estado real de los 6 servicios.',
    },
    {
      key: 'accessRestriction',
      label: 'Restricción de accesos',
      hint: 'Peso 25% junto con el estado de SRV-04 Accesos.',
    },
    {
      key: 'continuityImpact',
      label: 'Impacto en continuidad',
      hint: 'Peso 15% según afectación a sesiones y atención.',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`Simulación determinista · Escenario ${activeScenario.id}`}
        title="Laboratorio de escenarios"
        description="Explore los 5 escenarios predefinidos y ajuste variables o estados de servicio para observar la respuesta del motor en tiempo real."
      />

      {/* 5 Predefined Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {scenarioSummaries.map(({ scenario, snapshot }) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            score={snapshot.riskIndex.score}
            level={snapshot.riskIndex.level}
            servicesCount={snapshot.servicesToVerifyCount}
            estimatedActionsCount={snapshot.matchedRules.length}
            isActive={scenario.id === activeScenario.id}
            onExplore={(id) => selectScenario(id)}
          />
        ))}
      </div>

      {/* Configuration & Before/After */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Controls */}
        <div className="lg:col-span-7 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Configuración de "{activeScenario.title}"
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                {permissions.canEditScenario
                  ? 'Cada ajuste recalcula reglas, dependencias, acciones y continuidad.'
                  : 'Cambie a Coordinador GRD para editar parámetros del escenario.'}
              </p>
            </div>
            <button
              type="button"
              disabled={!permissions.canEditScenario}
              onClick={restoreActiveBaseline}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--bg-surface-2)] text-[var(--text-primary)] disabled:opacity-45 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Restaurar base</span>
            </button>
          </div>

          {/* 4 Precision Sliders (hairline grid, no nested card clutter) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            {sliderConfigs.map((cfg) => (
              <div key={cfg.key} className="space-y-2 pb-2 border-b border-[var(--border-subtle)]/70">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor={`slider-${cfg.key}`}
                    className="text-xs font-semibold text-[var(--text-primary)]"
                  >
                    {cfg.label}
                  </label>
                  <span className="text-xs font-mono font-bold tabular-nums text-[var(--accent-primary)]">
                    {activeScenario.inputs[cfg.key]}%
                  </span>
                </div>
                <input
                  id={`slider-${cfg.key}`}
                  type="range"
                  min={0}
                  max={100}
                  disabled={!permissions.canEditScenario}
                  value={activeScenario.inputs[cfg.key]}
                  onChange={(e) =>
                    updateScenarioInputs({ [cfg.key]: Number(e.target.value) })
                  }
                  className="nexo-slider disabled:opacity-50"
                />
                <p className="text-[11px] text-[var(--text-secondary)]">{cfg.hint}</p>
              </div>
            ))}
          </div>

          {/* Individual service status matrix */}
          <div className="space-y-3 pt-1">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">
              Estado simulado por servicio
            </h4>
            <div className="rounded-[12px] border border-[var(--border-subtle)] divide-y divide-[var(--border-subtle)]">
              {SERVICES.map((srv) => {
                const node = dependencyGraph.nodes[srv.id];
                return (
                  <div
                    key={srv.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[var(--text-secondary)] shrink-0">
                        {srv.id}
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                        {srv.name}
                      </span>
                    </div>
                    <select
                      aria-label={`Estado simulado de ${srv.name}`}
                      value={node?.effectiveStatus ?? srv.status}
                      disabled={!permissions.canOverrideServices}
                      onChange={(e) =>
                        overrideServiceStatus(srv.id, e.target.value as ServiceStatus)
                      }
                      className="px-2.5 py-1 rounded-[8px] text-xs font-semibold bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] disabled:opacity-50 cursor-pointer shrink-0"
                    >
                      <option value="OPERATIVO">Operativo</option>
                      <option value="EN_OBSERVACION">En observación</option>
                      <option value="LIMITADO">Limitado</option>
                      <option value="NO_DISPONIBLE">No disponible</option>
                      <option value="SIN_CONFIRMAR">Sin confirmar</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Antes / Después Comparison */}
        <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-[var(--text-primary)]">
                Comparación Antes / Después
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Variación respecto al escenario base predefinido.
              </p>
            </div>
            <StatusBadge status={riskIndex.level} />
          </div>

          <div className="divide-y divide-[var(--border-subtle)] rounded-[12px] border border-[var(--border-subtle)]">
            {[
              {
                label: 'Índice de atención operativa',
                before: `${baselineSnapshot.riskIndex.score}/100`,
                after: `${riskIndex.score}/100`,
                delta: riskIndex.score - baselineSnapshot.riskIndex.score,
              },
              {
                label: 'Servicios por verificar',
                before: baselineSnapshot.servicesToVerifyCount,
                after: dependencyGraph.servicesRequiringVerification.length,
                delta:
                  dependencyGraph.servicesRequiringVerification.length -
                  baselineSnapshot.servicesToVerifyCount,
              },
              {
                label: 'Reglas activas',
                before: baselineSnapshot.matchedRules.length,
                after: matchedRules.length,
                delta: matchedRules.length - baselineSnapshot.matchedRules.length,
              },
              {
                label: 'Acciones generadas del escenario',
                before: baselineSnapshot.matchedRules.length,
                after: scenarioGeneratedActionsCount,
                delta: scenarioGeneratedActionsCount - baselineSnapshot.matchedRules.length,
              },
              {
                label: 'Actividades afectadas',
                before: baselineSnapshot.affectedActivitiesCount,
                after: affectedActivities.length,
                delta:
                  affectedActivities.length - baselineSnapshot.affectedActivitiesCount,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="px-4 py-3 flex items-center justify-between gap-2 text-xs"
              >
                <span className="font-medium text-[var(--text-primary)]">{row.label}</span>
                <div className="flex items-center gap-3 font-mono tabular-nums">
                  <span className="text-[var(--text-secondary)]">Antes: {row.before}</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    Después: {row.after}
                  </span>
                  <span
                    className={`font-semibold ${
                      row.delta > 0
                        ? 'text-[#B62C49] dark:text-[#F2728C]'
                        : row.delta < 0
                          ? 'text-[#178353] dark:text-[#4AD196]'
                          : 'text-[var(--text-secondary)]'
                    }`}
                  >
                    {row.delta > 0 ? `+${row.delta}` : row.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <Link
              to="/acciones"
              className="inline-flex items-center gap-1 font-semibold text-[var(--accent-primary)] hover:underline"
            >
              <span>Ver acciones vinculadas ({scenarioActions.length})</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
            <Link
              to="/explicabilidad"
              className="inline-flex items-center gap-1 font-semibold text-[var(--accent-primary)] hover:underline"
            >
              <span>Ver fórmula y reglas</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
