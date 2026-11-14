import { ArrowRight, CheckCircle2, ExternalLink, Info, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNexoStore } from '../../store/useNexoStore';
import { useDerivedNexo } from '../../hooks/useDerivedNexo';
import { SOURCES } from '../../data/seedData';
import { isAlertVisibleToCommunity } from '../../lib/engines/permissions';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/OverlayPrimitives';

export default function CommunityPage() {
  const confirmReading = useNexoStore((s) => s.confirmCommunityReading);
  const pushToast = useNexoStore((s) => s.pushToast);
  const { activeRole, activeScenario, riskIndex, alerts, receipts, continuity } =
    useDerivedNexo();

  const approvedAlerts = alerts.filter((a) => isAlertVisibleToCommunity(a.status));
  const mailboxId = activeRole === 'DOCENTE' ? 'MBX-02' : 'MBX-01';
  const officialSources = SOURCES.filter((s) => s.type === 'OFICIAL').slice(0, 4);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Clear, calm editorial community banner */}
      <header className="rounded-[16px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 md:p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
          <span className="text-xs font-semibold text-[#80263C] dark:text-[#E36D88] inline-flex items-center gap-1.5">
            <Info className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Portal de Comunidad · Escenario simulado</span>
          </span>
          <StatusBadge status={riskIndex.level} />
        </div>

        <h2 className="font-display text-xl md:text-[26px] font-bold tracking-[-0.02em] text-[var(--text-primary)] leading-[1.2] text-balance">
          Estado informativo: {activeScenario.title}
        </h2>

        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          Escenario simulado: se está evaluando la disponibilidad de determinados servicios universitarios. No existe una instrucción institucional real asociada a este ejercicio.
        </p>
      </header>

      {/* Approved Communications ONLY */}
      <section className="space-y-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
            Comunicados aprobados en simulación ({approvedAlerts.length})
          </h3>
          <span className="text-xs text-[var(--text-secondary)]">
            Buzón activo: <strong className="font-mono text-[var(--text-primary)]">{mailboxId}</strong> · Los borradores nunca se muestran aquí
          </span>
        </div>

        {approvedAlerts.length === 0 ? (
          <EmptyState
            title="Sin comunicados aprobados aún"
            description="Cuando el rol Autoridad apruebe una comunicación, aparecerá aquí para confirmación de lectura."
          />
        ) : (
          <div className="space-y-3.5">
            {approvedAlerts.map((alert) => {
              const receipt = receipts.find(
                (r) => r.alertId === alert.id && r.mailboxId === mailboxId,
              );
              const isRead = receipt?.status === 'LEIDO';
              const isActiveScenarioAlert = alert.scenarioId === activeScenario.id;

              return (
                <article
                  key={alert.id}
                  className={`rounded-[14px] bg-[var(--bg-surface)] border p-5 space-y-3.5 transition-colors hover:border-[var(--border-strong)] ${
                    isActiveScenarioAlert
                      ? 'border-[var(--accent-primary)]/45'
                      : 'border-[var(--border-subtle)]'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--text-secondary)]">
                        <span className="font-mono font-semibold text-[var(--text-primary)]">
                          {alert.scenarioId}
                        </span>
                        {isActiveScenarioAlert ? ' (Escenario activo)' : ''} · {alert.audience} · Aprobado por {alert.approverRole ?? 'Autoridad'}
                      </p>
                      <h4 className="text-[15px] font-bold text-[var(--text-primary)] mt-1 leading-snug">
                        {alert.title}
                      </h4>
                    </div>
                    <StatusBadge status={alert.status} />
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {alert.body}
                  </p>

                  <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
                      {isRead
                        ? `Lectura simulada confirmada (${receipt?.readAt?.slice(11, 16) ?? ''})`
                        : 'Pendiente de confirmación de lectura'}
                    </span>

                    <button
                      type="button"
                      disabled={isRead}
                      onClick={() => {
                        confirmReading(alert.id);
                        pushToast({
                          title: 'Lectura simulada confirmada',
                          description: 'Registrado en buzón comunitario y bitácora local.',
                          tone: 'success',
                        });
                      }}
                      className={`inline-flex items-center justify-center gap-1.5 px-4 min-h-[44px] rounded-[10px] text-xs font-semibold transition-all duration-150 ${
                        isRead
                          ? 'bg-[#E7F5EE] dark:bg-[#178353]/20 text-[#178353] dark:text-[#4AD196] cursor-default'
                          : 'bg-[var(--accent-primary)] text-white dark:text-[#08121A] hover:bg-[var(--accent-primary-hover)] active:scale-[0.98] cursor-pointer'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{isRead ? 'Lectura confirmada' : 'Confirmar lectura simulada'}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Fictional Activities */}
      <section className="rounded-[14px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 pb-2 border-b border-[var(--border-subtle)]">
          <h3 className="text-[15px] font-bold text-[var(--text-primary)]">
            Actividades académicas ficticias
          </h3>
          <Link
            to="/continuidad"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent-primary)] hover:underline"
          >
            <span>Ver detalle</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="divide-y divide-[var(--border-subtle)]">
          {continuity.plans.slice(0, 5).map((plan) => (
            <div
              key={plan.activityId}
              className="py-3 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {plan.activityTitle}
                </p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {plan.originalFacilityName} · {plan.proposedAlternative}
                </p>
              </div>
              <div className="shrink-0">
                <StatusBadge status={plan.status} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Prevention & Official Sources */}
      <section className="rounded-[14px] bg-[var(--bg-surface)] border border-[var(--border-subtle)] grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)] overflow-hidden">
        <div className="p-5 flex flex-col justify-between gap-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <ShieldCheck className="w-4 h-4 text-[var(--accent-primary)] shrink-0" aria-hidden="true" />
              <span>Información preventiva</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Consulte los lineamientos educativos Antes, Durante y Después de lluvias intensas sin difundir rumores no verificados.
            </p>
          </div>
          <Link
            to="/prevencion"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline w-fit"
          >
            <span>Abrir guía de prevención y protocolos</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="p-5 space-y-2.5">
          <h4 className="text-sm font-bold text-[var(--text-primary)]">
            Fuentes oficiales de consulta
          </h4>
          <ul className="divide-y divide-[var(--border-subtle)]">
            {officialSources.map((src) => (
              <li key={src.id} className="py-1.5 first:pt-0 last:pb-0">
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-between w-full gap-2 text-xs font-medium text-[var(--accent-primary)] hover:underline"
                >
                  <span>{src.institution}</span>
                  <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
