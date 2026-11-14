import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Maximize2,
  Minimize2,
  Monitor,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  SkipBack,
  SkipForward,
  XCircle,
} from 'lucide-react';
import { useNexoStore } from '../../store/useNexoStore';
import { useDerivedNexo } from '../../hooks/useDerivedNexo';
import {
  buildDemoScenarioStateAtStep,
  computeDemoStepAtSecond,
  computeEffectiveDemoTargetSecond,
  DEMO_SEQUENCE_STEPS,
} from '../../lib/engines/demoSequence';
import { DependencyGraph } from '../../components/charts/DependencyGraph';
import { RiskIndicator, StatusBadge } from '../../components/ui/StatusBadge';
import { PageHeader } from '../../components/ui/PageHeader';

type HumanGateChoice = 'APPROVE' | 'REJECT' | 'CONTINUE_NO_BROADCAST';

const GATE_CHOICE_LABEL: Record<HumanGateChoice, string> = {
  APPROVE: 'Aprobado por Autoridad y difundido en 5 buzones ficticios',
  REJECT: 'Rechazado por Autoridad; difusión cancelada en bitácora',
  CONTINUE_NO_BROADCAST: 'Evaluación continuada sin difundir comunicado',
};

export default function DemoModePage({
  presentationMode: controlledPresentation,
  onPresentationChange,
}: {
  presentationMode?: boolean;
  onPresentationChange?: (val: boolean) => void;
}) {
  const applyDemoStepState = useNexoStore((s) => s.applyDemoStepState);
  const resolveDemoHumanGate = useNexoStore((s) => s.resolveDemoHumanGate);
  const resetDemoSimulation = useNexoStore((s) => s.resetDemoSimulation);
  const auditLog = useNexoStore((s) => s.auditLog);

  const {
    activeScenario,
    dependencyGraph,
    riskIndex,
    matchedRules,
    scenarioActions,
    pendingActions,
    affectedActivities,
    alerts,
    receipts,
    scenarioSources,
  } = useDerivedNexo();

  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1 | 2>(1);
  const [gateResolved, setGateResolved] = useState(false);
  const [gateDecision, setGateDecision] = useState<HumanGateChoice | null>(null);
  const [localPresentation, setLocalPresentation] = useState(false);
  const presentationMode = controlledPresentation ?? localPresentation;
  const [lastAppliedStep, setLastAppliedStep] = useState<number>(-1);
  const [manualServiceId, setManualServiceId] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const currentStepIdx = computeDemoStepAtSecond(elapsed);
  const currentStep = DEMO_SEQUENCE_STEPS[currentStepIdx];
  const isWaitingHumanGate = elapsed >= 65 && !gateResolved;
  const isFinished = elapsed >= 90;

  // Apply deterministic engine state cleanly when entering a step (idempotent)
  useEffect(() => {
    if (currentStepIdx === lastAppliedStep) return;
    const { inputs, serviceOverrides } = buildDemoScenarioStateAtStep(currentStepIdx);
    applyDemoStepState(
      currentStep.id,
      currentStep.second,
      inputs,
      serviceOverrides,
      currentStep.title,
      !gateResolved,
    );
    setManualServiceId(null);
    setLastAppliedStep(currentStepIdx);
  }, [
    currentStepIdx,
    lastAppliedStep,
    applyDemoStepState,
    currentStep.id,
    currentStep.second,
    currentStep.title,
    gateResolved,
  ]);

  // Playback timer
  useEffect(() => {
    if (!playing || isWaitingHumanGate || elapsed >= 90) {
      if ((isWaitingHumanGate || elapsed >= 90) && playing) {
        setPlaying(false);
      }
      return;
    }
    const intervalMs = Math.round(1000 / speed);
    const timer = window.setInterval(() => {
      setElapsed((prev) => {
        const next = Math.min(90, prev + 1);
        if (prev < 65 && next >= 65 && !gateResolved) {
          return 65; // Exact deterministic pause at human approval gate
        }
        if (next >= 90) {
          setPlaying(false);
        }
        return next;
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [playing, speed, isWaitingHumanGate, elapsed, gateResolved]);

  const handleReset = () => {
    setPlaying(false);
    setElapsed(0);
    setGateResolved(false);
    setGateDecision(null);
    setManualServiceId(null);
    setLastAppliedStep(0);
    resetDemoSimulation();
  };

  const handlePrimaryPlayToggle = () => {
    if (isWaitingHumanGate) return;
    if (isFinished) {
      setElapsed(0);
      setGateResolved(false);
      setGateDecision(null);
      setManualServiceId(null);
      setLastAppliedStep(0);
      resetDemoSimulation();
      setPlaying(true);
      return;
    }
    setPlaying((p) => !p);
  };

  const jumpToStep = (idx: number) => {
    const clampedIdx = Math.max(0, Math.min(DEMO_SEQUENCE_STEPS.length - 1, idx));
    const requestedSecond = DEMO_SEQUENCE_STEPS[clampedIdx].second;
    const effectiveSecond = computeEffectiveDemoTargetSecond(
      requestedSecond,
      gateResolved,
    );

    if (effectiveSecond < 65) {
      setGateResolved(false);
      setGateDecision(null);
    }
    if ((effectiveSecond >= 65 && !gateResolved) || effectiveSecond >= 90) {
      setPlaying(false);
    }
    setElapsed(effectiveSecond);
  };

  const handleHumanChoice = (choice: HumanGateChoice) => {
    resolveDemoHumanGate(choice);
    setGateResolved(true);
    setGateDecision(choice);
    setElapsed(75);
    setPlaying(true);
  };

  const togglePresentation = () => {
    const next = !presentationMode;
    setLocalPresentation(next);
    onPresentationChange?.(next);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setFullscreen(false);
    }
  };

  const approvedAlertsCount = alerts.filter(
    (a) => a.status === 'APROBADA' || a.status === 'DIFUNDIDA',
  ).length;
  const demoAlert = alerts.find((a) => a.id === 'COM-DEMO-90S');
  const demoReceiptsCount = receipts.filter((r) => r.alertId === 'COM-DEMO-90S').length;
  const demoAuditCount = auditLog.filter((e) => e.id.startsWith('AUD-DEMO-')).length;

  const focusedServiceId =
    manualServiceId ?? currentStep.focusServiceId ?? null;

  const playbackStatusText = isWaitingHumanGate
    ? 'Esperando revisión humana'
    : isFinished
      ? 'Simulación completada'
      : playing
        ? 'En reproducción'
        : 'En pausa';

  const highlightInputs =
    currentStep.highlightSection === 'RAIN' ||
    currentStep.highlightSection === 'INDEX' ||
    currentStep.highlightSection === 'OUTAGE';

  const content = (
    <div className="space-y-5">
      <PageHeader
        kicker={`Demostración guiada 90s · ${currentStep.phaseLabel}`}
        title="Simulación de continuidad operativa"
        description="Observa cómo NEXO conecta parámetros simulados, dependencias, reglas sin duplicados y aprobación humana."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrimaryPlayToggle}
              disabled={isWaitingHumanGate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-semibold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white dark:text-[#08121A] disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
            >
              {playing ? (
                <Pause className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Play className="w-4 h-4" aria-hidden="true" />
              )}
              <span>
                {playing
                  ? 'Pausar simulación'
                  : isFinished
                    ? 'Repetir simulación'
                    : elapsed > 0
                      ? 'Reanudar simulación'
                      : 'Iniciar escenario'}
              </span>
            </button>

            <button
              type="button"
              onClick={togglePresentation}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-[10px] text-xs font-semibold border active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap ${
                presentationMode
                  ? 'bg-[#80263C] text-white border-[#80263C]'
                  : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{presentationMode ? 'Salir de presentación' : 'Modo presentación'}</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label="Alternar pantalla completa"
              className="p-2 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] active:scale-[0.98] transition-all cursor-pointer"
            >
              {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        }
      />

      {/* 3-Column Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: 90s Connected Timeline */}
        <section className="lg:col-span-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-4 space-y-3 flex flex-col">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-subtle)]">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Secuencia 00s – 90s
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)]">
                {playbackStatusText}
              </p>
            </div>
            <span
              data-testid="demo-elapsed-clock"
              className="font-mono text-xs font-bold tabular-nums text-[var(--accent-primary)]"
            >
              {String(elapsed).padStart(2, '0')}s / 90s
            </span>
          </div>

          <ol className="relative space-y-1 flex-1">
            {DEMO_SEQUENCE_STEPS.map((step, idx) => {
              const reached = idx < currentStepIdx || (idx === currentStepIdx && isFinished);
              const isCurrent = idx === currentStepIdx;
              const lockedAhead = step.second > 65 && !gateResolved;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => jumpToStep(idx)}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={`w-full text-left px-2.5 py-2 rounded-[9px] text-xs transition-all cursor-pointer flex items-center gap-2 ${
                      isCurrent
                        ? 'bg-[var(--bg-surface-2)] ring-1 ring-[var(--accent-primary)]/45 font-semibold text-[var(--text-primary)]'
                        : reached
                          ? 'text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]/50'
                          : lockedAhead
                            ? 'text-[var(--text-secondary)] opacity-55 hover:opacity-85'
                            : 'text-[var(--text-secondary)] opacity-80 hover:opacity-100 hover:bg-[var(--bg-surface-2)]/40'
                    }`}
                  >
                    <span className="font-mono text-[11px] font-bold tabular-nums shrink-0 text-[var(--accent-primary)]">
                      {String(step.second).padStart(2, '0')}s
                    </span>
                    <span className="flex-1 truncate">{step.title}</span>
                    {step.requiresHumanGate && (
                      <ShieldCheck
                        className="w-3.5 h-3.5 shrink-0 text-[#A96A00] dark:text-[#F0B44C]"
                        aria-label="Pausa de revisión humana"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Center: Live Telemetry, Synchronized Dependency Graph & Explainability */}
        <section className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-4 flex flex-col gap-4">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[var(--border-subtle)]">
              <div>
                <p className="text-xs font-mono tabular-nums text-[var(--accent-primary)]">
                  Paso activo · {String(currentStep.second).padStart(2, '0')}s · {currentStep.phaseLabel}
                </p>
                <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5 leading-snug">
                  {currentStep.title}
                </h3>
              </div>
              <StatusBadge status={riskIndex.level} />
            </div>

            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {currentStep.description}
            </p>

            {/* Live Simulated Input Parameters Strip */}
            <div
              className={`grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-[10px] p-2 border transition-colors ${
                highlightInputs
                  ? 'border-[var(--accent-primary)]/50 bg-[var(--bg-surface-2)]/80'
                  : 'border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/40'
              }`}
            >
              <div>
                <span className="text-[11px] text-[var(--text-secondary)] block">Lluvia sim.</span>
                <strong className="font-mono text-xs tabular-nums text-[var(--text-primary)]">
                  {activeScenario.inputs.rainIntensity}%
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-[var(--text-secondary)] block">Interrupción</span>
                <strong className="font-mono text-xs tabular-nums text-[var(--text-primary)]">
                  {activeScenario.inputs.serviceDisruption}%
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-[var(--text-secondary)] block">Accesos</span>
                <strong className="font-mono text-xs tabular-nums text-[var(--text-primary)]">
                  {activeScenario.inputs.accessRestriction}%
                </strong>
              </div>
              <div>
                <span className="text-[11px] text-[var(--text-secondary)] block">Continuidad</span>
                <strong className="font-mono text-xs tabular-nums text-[var(--text-primary)]">
                  {activeScenario.inputs.continuityImpact}%
                </strong>
              </div>
            </div>

            <DependencyGraph
              graph={dependencyGraph}
              selectedServiceId={focusedServiceId}
              edgeFilter={
                currentStep.highlightSection === 'GRAPH' ? 'ACTIVE' : 'ALL'
              }
              onSelectService={(id) =>
                setManualServiceId((prev) => (prev === id ? null : id))
              }
              compact
            />
          </div>

          <div className="mt-auto space-y-3">
            <RiskIndicator
              score={riskIndex.score}
              level={riskIndex.level}
              label={riskIndex.label}
            />

            {/* Contextual Source & Traceability Card */}
            {currentStep.second >= 10 && scenarioSources.length > 0 && (
              <div className="pt-3 border-t border-[var(--border-subtle)] text-xs space-y-2">
                <p className="font-semibold text-[var(--text-primary)]">
                  Referencias documentales vinculadas ({scenarioSources.length}):
                </p>
                <p className="text-[var(--text-secondary)]">
                  {scenarioSources
                    .slice(0, 2)
                    .map((s) => `${s.title} (${s.institution})`)
                    .join(' · ')}
                </p>

                {currentStep.second >= 85 && (
                  <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/50 p-3 space-y-1.5">
                    <p className="font-semibold text-[var(--text-primary)]">
                      Trazabilidad determinista verificada
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      Parámetros ({activeScenario.inputs.rainIntensity}% lluvia /{' '}
                      {activeScenario.inputs.serviceDisruption}% falla eléctrica) →{' '}
                      {matchedRules.length} reglas activas →{' '}
                      {dependencyGraph.servicesRequiringVerification.length} servicios en verificación →{' '}
                      {scenarioActions.length} acciones únicas.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 pt-1">
                      <Link
                        to="/explicabilidad"
                        className="inline-flex items-center gap-1 font-semibold text-[var(--accent-primary)] hover:underline"
                      >
                        <span>Abrir explicabilidad completa</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                      <Link
                        to="/bitacora"
                        className="inline-flex items-center gap-1 font-semibold text-[var(--accent-primary)] hover:underline"
                      >
                        <span>Ver bitácora</span>
                        <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Right: Actions, Human Gate, Continuity Outcome & 90s Summary */}
        <section className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-4 flex flex-col justify-between gap-4">
          <div className="space-y-4">
            {/* Mandatory Human Approval Pause at 65s */}
            {isWaitingHumanGate && (
              <div
                role="alert"
                className="rounded-[12px] border border-[#A96A00] bg-[#FDF4E2] dark:bg-[#A96A00]/20 p-4 space-y-3"
              >
                <p className="text-xs font-bold text-[#A96A00] dark:text-[#F0B44C]">
                  Revisión humana obligatoria (cronómetro detenido)
                </p>
                <p className="text-xs font-semibold text-[var(--text-primary)]">
                  Este mensaje requiere aprobación antes de su difusión simulada.
                </p>
                {demoAlert && (
                  <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed">
                    &quot;{demoAlert.body}&quot;
                  </p>
                )}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleHumanChoice('APPROVE')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-semibold bg-[#178353] hover:bg-[#136d45] text-white active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Aprobar como Autoridad</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHumanChoice('REJECT')}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-[8px] text-xs font-semibold bg-[#B62C49] hover:bg-[#9c233d] text-white active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Rechazar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleHumanChoice('CONTINUE_NO_BROADCAST')}
                    className="px-3 py-2 rounded-[8px] text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Continuar sin difundir
                  </button>
                </div>
              </div>
            )}

            {/* Human Decision & Continuity Card (when 60s+ or resolved) */}
            {!isWaitingHumanGate && currentStep.second >= 60 && (
              <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/50 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    Comunicación y continuidad
                  </h4>
                  {demoAlert && <StatusBadge status={demoAlert.status} />}
                </div>

                {gateDecision ? (
                  <p className="text-xs text-[var(--text-secondary)]">
                    <strong className="text-[var(--text-primary)]">Decisión:</strong>{' '}
                    {GATE_CHOICE_LABEL[gateDecision]}
                  </p>
                ) : (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Borrador {demoAlert?.id ?? 'COM-DEMO-90S'} preparado; espera revisión humana a los 65s.
                  </p>
                )}

                {affectedActivities.length > 0 && (
                  <ul className="space-y-1.5 pt-1 border-t border-[var(--border-subtle)]">
                    {affectedActivities.slice(0, 2).map((act) => (
                      <li
                        key={act.activityId}
                        className="flex items-center justify-between gap-2 text-[11px]"
                      >
                        <span className="truncate text-[var(--text-primary)]">
                          {act.activityTitle}
                        </span>
                        <StatusBadge status={act.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Actions generated */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Acciones generadas
                </h3>
                <span className="text-xs font-mono font-semibold tabular-nums text-[var(--text-secondary)]">
                  {scenarioActions.length}
                </span>
              </div>
              <ul className="divide-y divide-[var(--border-subtle)] max-h-40 overflow-y-auto pr-0.5">
                {scenarioActions.slice(0, 5).map((act) => (
                  <li
                    key={act.id}
                    className="py-2 first:pt-0.5 last:pb-0.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="truncate font-medium text-[var(--text-primary)]">
                      {act.title}
                    </span>
                    <StatusBadge status={act.status} />
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* 90s State-Derived Summary */}
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-[var(--text-primary)]">
                {isFinished
                  ? 'Resumen final verificable (90s)'
                  : 'Resumen en vivo (calculado del estado)'}
              </h4>
              {isFinished && (
                <CheckCircle2
                  className="w-4 h-4 text-[#178353] shrink-0"
                  aria-hidden="true"
                />
              )}
            </div>
            <dl className="divide-y divide-[var(--border-subtle)] text-xs">
              <div className="py-1.5 flex justify-between">
                <dt className="text-[var(--text-secondary)]">Servicios por verificar</dt>
                <dd className="font-mono font-bold tabular-nums text-[var(--text-primary)]">
                  {dependencyGraph.servicesRequiringVerification.length}
                </dd>
              </div>
              <div className="py-1.5 flex justify-between">
                <dt className="text-[var(--text-secondary)]">Acciones activas (sin duplicados)</dt>
                <dd className="font-mono font-bold tabular-nums text-[var(--text-primary)]">
                  {scenarioActions.length} ({pendingActions.length} pend.)
                </dd>
              </div>
              <div className="py-1.5 flex justify-between">
                <dt className="text-[var(--text-secondary)]">Actividades afectadas</dt>
                <dd className="font-mono font-bold tabular-nums text-[var(--text-primary)]">
                  {affectedActivities.length}
                </dd>
              </div>
              <div className="py-1.5 flex justify-between">
                <dt className="text-[var(--text-secondary)]">Comunicaciones / buzones demo</dt>
                <dd className="font-mono font-bold tabular-nums text-[var(--text-primary)]">
                  {approvedAlertsCount} aprob. · {demoReceiptsCount} envíos
                </dd>
              </div>
              <div className="py-1.5 last:pb-0 flex justify-between">
                <dt className="text-[var(--text-secondary)]">Eventos demo en bitácora</dt>
                <dd
                  data-testid="demo-audit-count"
                  className="font-mono font-bold tabular-nums text-[var(--text-primary)]"
                >
                  {demoAuditCount} ({auditLog.length} total)
                </dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      {/* Bottom Playback Controls */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-3.5 md:p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrimaryPlayToggle}
            disabled={isWaitingHumanGate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-xs font-semibold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white dark:text-[#08121A] disabled:opacity-45 active:scale-[0.98] transition-all cursor-pointer"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>
              {playing ? 'Pausar' : isFinished ? 'Repetir' : 'Reproducir'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => jumpToStep(currentStepIdx - 1)}
            disabled={currentStepIdx === 0}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-[9px] text-xs font-semibold bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)] disabled:opacity-45 active:scale-[0.98] transition-all cursor-pointer"
          >
            <SkipBack className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Retroceder</span>
          </button>

          <button
            type="button"
            onClick={() => jumpToStep(currentStepIdx + 1)}
            disabled={isWaitingHumanGate || currentStepIdx >= DEMO_SEQUENCE_STEPS.length - 1}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-[9px] text-xs font-semibold bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)] disabled:opacity-45 active:scale-[0.98] transition-all cursor-pointer"
          >
            <span>Avanzar</span>
            <SkipForward className="w-3.5 h-3.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-[9px] text-xs font-semibold bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)] active:scale-[0.98] transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Reiniciar</span>
          </button>
        </div>

        {/* Progress Bar with 65s human-gate tick marker */}
        <div className="flex-1 min-w-[180px] relative">
          <div className="w-full h-2 rounded-full bg-[var(--bg-surface-2)] overflow-hidden">
            <div
              className="h-full bg-[var(--accent-primary)] transition-all duration-300"
              style={{ width: `${Math.round((elapsed / 90) * 100)}%` }}
            />
          </div>
          <span
            title="Pausa obligatoria a los 65s"
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-[#A96A00] rounded-full"
            style={{ left: '72.2%' }}
            aria-hidden="true"
          />
        </div>

        {/* Speed controls */}
        <div className="inline-flex items-center p-1 rounded-[10px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] gap-0.5">
          {([0.5, 1, 2] as const).map((spd) => (
            <button
              key={spd}
              type="button"
              onClick={() => setSpeed(spd)}
              className={`px-2.5 py-1 rounded-[7px] text-xs font-mono font-semibold tabular-nums transition-all cursor-pointer ${
                speed === spd
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {spd}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return content;
}
