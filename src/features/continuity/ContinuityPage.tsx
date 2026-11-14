import { useState } from 'react';
import { ArrowRight, Check, Eye, MessageSquarePlus, XCircle } from 'lucide-react';
import { useNexoStore } from '../../store/useNexoStore';
import { useDerivedNexo } from '../../hooks/useDerivedNexo';
import { SERVICES } from '../../data/seedData';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Tabs } from '../../components/ui/OverlayPrimitives';

export default function ContinuityPage() {
  const decideContinuity = useNexoStore((s) => s.decideContinuityAlternative);
  const addObservation = useNexoStore((s) => s.addTeacherObservation);
  const openInspector = useNexoStore((s) => s.openDecisionInspector);

  const { activeScenario, continuity, permissions } = useDerivedNexo();
  const [filter, setFilter] = useState<'TODAS' | 'AFECTADAS' | 'PENDIENTES'>('TODAS');
  const [obsInputs, setObsInputs] = useState<Record<string, string>>({});

  const filteredPlans = continuity.plans.filter((p) => {
    if (filter === 'AFECTADAS') return p.status !== 'NORMAL';
    if (filter === 'PENDIENTES') return p.status !== 'NORMAL' && p.approvalDecision === 'PENDIENTE';
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Continuidad académica y administrativa · Actividades ficticias"
        title="Continuidad académica y administrativa"
        description="Evaluación de actividades ficticias versus alternativas sugeridas. Nunca propone virtualidad garantizada sin conectividad ni declara ambientes seguros."
        actions={
          <Tabs
            activeTab={filter}
            onChange={setFilter}
            tabs={[
              { id: 'TODAS', label: 'Todas', count: continuity.plans.length },
              {
                id: 'AFECTADAS',
                label: 'Afectadas / Revisión',
                count: continuity.plans.filter((p) => p.status !== 'NORMAL').length,
              },
              {
                id: 'PENDIENTES',
                label: 'Decisiones pendientes',
                count: continuity.plans.filter(
                  (p) => p.status !== 'NORMAL' && p.approvalDecision === 'PENDIENTE',
                ).length,
              },
            ]}
          />
        }
      />

      {/* Top Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Operación normal"
          value={continuity.normalCount}
          subtitle="Actividades con servicios habilitantes operativos."
        />
        <MetricCard
          title="Alternativas propuestas"
          value={continuity.alternativeCount}
          subtitle="Sujetas a validación humana de Autoridad."
        />
        <MetricCard
          title="En revisión o suspensión"
          value={continuity.reviewCount + continuity.suspendedCount}
          subtitle="Requieren reprogramación o verificación técnica."
        />
        <MetricCard
          title="Datos insuficientes"
          value={continuity.insufficientDataCount}
          subtitle="No es posible determinar alternativa válida aún."
        />
      </div>

      {/* Original vs Proposed Alternatives */}
      <div className="space-y-4">
        {filteredPlans.map((plan) => (
          <div
            key={plan.activityId}
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="font-mono">{plan.activityId}</span>
                  <span aria-hidden="true">·</span>
                  <span>{plan.originalFacilityName}</span>
                  <span aria-hidden="true">·</span>
                  <span>Decisión humana: {plan.approvalDecision}</span>
                </div>
                <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                  {plan.activityTitle}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={plan.status} />
                <button
                  type="button"
                  onClick={() => {
                    const primaryBlockingId = plan.blockingServices[0]?.id ?? 'SRV-05';
                    const blockingServiceMeta = SERVICES.find((s) => s.id === primaryBlockingId);
                    openInspector({
                      kind: 'CONTINUITY',
                      id: plan.activityId,
                      title: `Continuidad: ${plan.activityTitle}`,
                      serviceId: primaryBlockingId,
                      justification: plan.explanation,
                      sourceId:
                        blockingServiceMeta?.sourceId ??
                        activeScenario.sourceIds[0] ??
                        'SRC-SIM-01',
                      evidence: plan.proposedAlternative,
                      limitations: plan.limitations,
                    });
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-xs font-medium bg-[var(--bg-surface-2)] text-[var(--text-primary)] cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Ver fundamento</span>
                </button>
              </div>
            </div>

            {/* Unified Original vs Alternative Split */}
            <div className="rounded-[12px] border border-[var(--border-subtle)] overflow-hidden grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-stretch">
              <div className="bg-[var(--bg-surface-2)]/40 p-4 space-y-1.5">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  Actividad original (simulada)
                </p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {plan.originalMode}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">
                  Instalación: {plan.originalFacilityName}
                </p>
              </div>

              <div className="hidden md:flex items-center justify-center px-3 border-x border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/20 text-[var(--text-secondary)]">
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </div>

              <div className="bg-[var(--bg-surface)] p-4 space-y-1.5 border-t md:border-t-0 border-[var(--border-subtle)]">
                <p className="text-xs font-semibold text-[var(--accent-primary)]">
                  Alternativa propuesta por el motor
                </p>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {plan.proposedAlternative}
                </p>
                <p className="text-xs text-[var(--text-secondary)]">{plan.explanation}</p>
              </div>
            </div>

            {/* Blocking services & constraints */}
            {plan.blockingServices.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                <span className="font-semibold">Servicios condicionantes:</span>
                {plan.blockingServices.map((bs) => (
                  <span key={bs.id} className="inline-flex items-center gap-1.5">
                    <span>{bs.name}</span>
                    <StatusBadge status={bs.status} />
                  </span>
                ))}
              </div>
            )}

            {/* Teacher Observations */}
            {(plan.teacherObservations.length > 0 || permissions.canAddTeacherObservation) && (
              <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
                {plan.teacherObservations.map((obs) => (
                  <div
                    key={obs.id}
                    className="text-xs rounded-[8px] bg-[var(--bg-surface-2)]/60 px-3 py-2 text-[var(--text-primary)]"
                  >
                    <strong>Observación docente ({obs.timestamp.slice(11, 16)}):</strong>{' '}
                    {obs.note}
                  </div>
                ))}

                {permissions.canAddTeacherObservation && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      aria-label={`Registrar observación docente para ${plan.activityTitle}`}
                      value={obsInputs[plan.activityId] ?? ''}
                      onChange={(e) =>
                        setObsInputs((prev) => ({
                          ...prev,
                          [plan.activityId]: e.target.value,
                        }))
                      }
                      placeholder="Registrar observación académica de demostración..."
                      className="flex-1 px-3 py-1.5 rounded-[8px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const txt = obsInputs[plan.activityId] ?? '';
                        if (!txt.trim()) return;
                        addObservation(plan.activityId, txt);
                        setObsInputs((prev) => ({ ...prev, [plan.activityId]: '' }));
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--accent-primary)] text-white dark:text-[#08121A] cursor-pointer"
                    >
                      <MessageSquarePlus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Guardar nota</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Authority Decision */}
            {plan.status !== 'NORMAL' && (
              <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-[var(--text-secondary)]">
                  {plan.limitations[0]}
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    disabled={!permissions.canApproveContinuity}
                    onClick={() => decideContinuity(plan.activityId, 'APROBADO')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[#178353] text-white disabled:opacity-45 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Aprobar alternativa</span>
                  </button>
                  <button
                    type="button"
                    disabled={!permissions.canApproveContinuity}
                    onClick={() => decideContinuity(plan.activityId, 'RECHAZADO')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[#B62C49] text-white disabled:opacity-45 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Rechazar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
