import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, Inbox, Send, XCircle } from 'lucide-react';
import { useNexoStore } from '../../store/useNexoStore';
import { useDerivedNexo } from '../../hooks/useDerivedNexo';
import { MAILBOXES, ROLE_META, SOURCES } from '../../data/seedData';
import { Alert, AlertStatus } from '../../types/domain';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState, Tabs } from '../../components/ui/OverlayPrimitives';

type CommTab = 'BORRADORES' | 'PENDIENTES' | 'APROBADOS' | 'DIFUNDIDOS' | 'HISTORIAL';

export default function CommunicationsPage() {
  const createAlertDraft = useNexoStore((s) => s.createAlertDraft);
  const submitAlertForApproval = useNexoStore((s) => s.submitAlertForApproval);
  const approveAlert = useNexoStore((s) => s.approveAlert);
  const rejectAlert = useNexoStore((s) => s.rejectAlert);
  const broadcastAlert = useNexoStore((s) => s.broadcastAlert);
  const markReceiptRead = useNexoStore((s) => s.markReceiptRead);
  const pushToast = useNexoStore((s) => s.pushToast);

  const { activeScenario, alerts, receipts, permissions } = useDerivedNexo();

  const [tab, setTab] = useState<CommTab>('PENDIENTES');
  const [onlyActiveScenario, setOnlyActiveScenario] = useState(false);
  const [title, setTitle] = useState('');
  const [audience, setAudience] = useState<Alert['audience']>('Estudiantes y docentes');
  const [body, setBody] = useState('');
  const [sourceId, setSourceId] = useState(activeScenario.sourceIds[0] ?? 'SRC-SIM-01');
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    setSourceId(activeScenario.sourceIds[0] ?? 'SRC-SIM-01');
  }, [activeScenario.id, activeScenario.sourceIds]);

  const scopedAlerts = useMemo(
    () =>
      onlyActiveScenario
        ? alerts.filter((a) => a.scenarioId === activeScenario.id)
        : alerts,
    [alerts, onlyActiveScenario, activeScenario.id],
  );

  const counts = useMemo(
    () => ({
      BORRADORES: scopedAlerts.filter((a) => a.status === 'BORRADOR').length,
      PENDIENTES: scopedAlerts.filter((a) => a.status === 'PENDIENTE_APROBACION').length,
      APROBADOS: scopedAlerts.filter((a) => a.status === 'APROBADA').length,
      DIFUNDIDOS: scopedAlerts.filter((a) => a.status === 'DIFUNDIDA').length,
      HISTORIAL: scopedAlerts.length,
    }),
    [scopedAlerts],
  );

  const visibleAlerts = useMemo(() => {
    const statusMap: Record<CommTab, AlertStatus[] | null> = {
      BORRADORES: ['BORRADOR'],
      PENDIENTES: ['PENDIENTE_APROBACION'],
      APROBADOS: ['APROBADA'],
      DIFUNDIDOS: ['DIFUNDIDA'],
      HISTORIAL: null,
    };
    const allowed = statusMap[tab];
    return allowed ? scopedAlerts.filter((a) => allowed.includes(a.status)) : scopedAlerts;
  }, [scopedAlerts, tab]);

  const handleCreate = (e: FormEvent, submitImmediately: boolean) => {
    e.preventDefault();
    const res = createAlertDraft({
      title,
      audience,
      body,
      sourceId,
      submitImmediately,
    });
    if (!res.ok) {
      pushToast({
        title: 'No se pudo guardar el borrador',
        description: res.error,
        tone: 'warning',
      });
      return;
    }
    setTitle('');
    setBody('');
    setTab(submitImmediately ? 'PENDIENTES' : 'BORRADORES');
    pushToast({
      title: submitImmediately
        ? 'Borrador enviado a aprobación de Autoridad'
        : 'Borrador guardado en simulación',
      tone: 'success',
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Flujo supervisado · Borrador → Revisión → Autoridad → Buzones simulados"
        title="Comunicaciones y flujo de aprobación"
        description="Solo las comunicaciones aprobadas por Autoridad pasan a difusión en los 5 buzones internos ficticios. No envía SMS, correos ni WhatsApp reales."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Composer */}
        <form
          onSubmit={(e) => handleCreate(e, false)}
          className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-4"
        >
          <div className="pb-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Editor de avisos simulados
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              {permissions.canDraftAlert
                ? 'Redacte un borrador asociado al escenario activo.'
                : 'Solo el rol Coordinador GRD puede crear borradores nuevos.'}
            </p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="comm-title" className="text-xs font-semibold text-[var(--text-primary)] block">
              Título del aviso simulado
            </label>
            <input
              id="comm-title"
              type="text"
              disabled={!permissions.canDraftAlert}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Verificación eléctrica en Laboratorio Demo B"
              className="w-full px-3 py-2 rounded-[10px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] disabled:opacity-50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="comm-audience" className="text-xs font-semibold text-[var(--text-primary)] block">
                Audiencia
              </label>
              <select
                id="comm-audience"
                disabled={!permissions.canDraftAlert}
                value={audience}
                onChange={(e) => setAudience(e.target.value as Alert['audience'])}
                className="w-full px-3 py-2 rounded-[10px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] disabled:opacity-50"
              >
                <option value="Comunidad general">Comunidad general</option>
                <option value="Estudiantes y docentes">Estudiantes y docentes</option>
                <option value="Personal operativo">Personal operativo</option>
                <option value="Autoridades y coordinación">Autoridades y coordinación</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="comm-source" className="text-xs font-semibold text-[var(--text-primary)] block">
                Fuente asociada
              </label>
              <select
                id="comm-source"
                disabled={!permissions.canDraftAlert}
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                className="w-full px-3 py-2 rounded-[10px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] disabled:opacity-50"
              >
                {SOURCES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id} · {s.institution}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="comm-body" className="text-xs font-semibold text-[var(--text-primary)] block">
              Contenido (indicar qué está en verificación)
            </label>
            <textarea
              id="comm-body"
              rows={4}
              disabled={!permissions.canDraftAlert}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Escenario simulado: detalle qué servicio requiere verificación y qué alternativa se evalúa..."
              className="w-full px-3 py-2 rounded-[10px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] disabled:opacity-50"
            />
          </div>

          <div className="text-xs text-[var(--text-secondary)]">
            Escenario vinculado: <strong className="text-[var(--text-primary)]">{activeScenario.title}</strong>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={!permissions.canDraftAlert}
              className="px-3.5 py-2 rounded-[10px] text-xs font-semibold bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] disabled:opacity-45 cursor-pointer"
            >
              Guardar borrador
            </button>
            <button
              type="button"
              disabled={!permissions.canDraftAlert}
              onClick={(e) => handleCreate(e, true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-xs font-semibold bg-[var(--accent-primary)] text-white dark:text-[#08121A] disabled:opacity-45 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Enviar a revisión</span>
            </button>
          </div>
        </form>

        {/* Right: Tabs & Approval Queue */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Tabs
              activeTab={tab}
              onChange={setTab}
              tabs={[
                { id: 'BORRADORES', label: 'Borradores', count: counts.BORRADORES },
                { id: 'PENDIENTES', label: 'Pendientes', count: counts.PENDIENTES },
                { id: 'APROBADOS', label: 'Aprobados', count: counts.APROBADOS },
                { id: 'DIFUNDIDOS', label: 'Difundidos', count: counts.DIFUNDIDOS },
                { id: 'HISTORIAL', label: 'Historial', count: counts.HISTORIAL },
              ]}
            />
            <button
              type="button"
              onClick={() => setOnlyActiveScenario((v) => !v)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold border transition-colors cursor-pointer ${
                onlyActiveScenario
                  ? 'bg-[var(--accent-primary)] text-white dark:text-[#08121A] border-[var(--accent-primary)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              {onlyActiveScenario ? `Solo ${activeScenario.id}` : 'Todos los escenarios'}
            </button>
          </div>

          <div className="space-y-3">
            {visibleAlerts.length === 0 ? (
              <EmptyState
                title="Sin comunicaciones en esta bandeja"
                description="Cambie de pestaña o cree un borrador con el rol Coordinador GRD."
              />
            ) : (
              visibleAlerts.map((alert) => {
                const alertReceipts = receipts.filter((r) => r.alertId === alert.id);
                const readCount = alertReceipts.filter((r) => r.status === 'LEIDO').length;

                return (
                  <div
                    key={alert.id}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)]">
                          <span className="font-mono font-semibold text-[var(--text-primary)]">
                            {alert.id}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{alert.scenarioId}</span>
                          <span aria-hidden="true">·</span>
                          <span>{alert.audience}</span>
                          <span aria-hidden="true">·</span>
                          <span>Creado por {ROLE_META[alert.creatorRole].shortLabel}</span>
                        </div>
                        <h4 className="text-[15px] font-bold text-[var(--text-primary)]">
                          {alert.title}
                        </h4>
                      </div>
                      <StatusBadge status={alert.status} />
                    </div>

                    <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                      {alert.body}
                    </p>

                    {alert.rejectionReason && (
                      <p className="text-xs font-medium text-[#B62C49] dark:text-[#F2728C]">
                        Motivo de rechazo: {alert.rejectionReason}
                      </p>
                    )}

                    {/* Actions by status and role */}
                    {alert.status === 'BORRADOR' && (
                      <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-end">
                        <button
                          type="button"
                          disabled={!permissions.canSubmitAlertForApproval}
                          onClick={() => submitAlertForApproval(alert.id)}
                          className="px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--accent-primary)] text-white dark:text-[#08121A] disabled:opacity-45 cursor-pointer"
                        >
                          Enviar a revisión de Autoridad
                        </button>
                      </div>
                    )}

                    {alert.status === 'PENDIENTE_APROBACION' && (
                      <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
                        {!permissions.canApproveOrRejectAlert ? (
                          <p className="text-xs text-[#A96A00] dark:text-[#F0B44C] font-medium">
                            Requiere aprobación humana: cambie el rol superior a Autoridad para aprobar o rechazar.
                          </p>
                        ) : (
                          <>
                            <input
                              type="text"
                              aria-label={`Observación de rechazo para ${alert.title}`}
                              value={rejectionNotes[alert.id] ?? ''}
                              onChange={(e) =>
                                setRejectionNotes((prev) => ({
                                  ...prev,
                                  [alert.id]: e.target.value,
                                }))
                              }
                              placeholder="Observación (obligatoria si rechaza)..."
                              className="w-full px-3 py-1.5 rounded-[8px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => approveAlert(alert.id)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] text-xs font-semibold bg-[#178353] text-white cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Aprobar y difundir en simulación</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  rejectAlert(alert.id, rejectionNotes[alert.id] ?? '')
                                }
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] text-xs font-semibold bg-[#B62C49] text-white cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Rechazar</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {alert.status === 'APROBADA' && (
                      <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
                        {!permissions.canBroadcastApprovedAlert && (
                          <span className="text-xs text-[var(--text-secondary)]">
                            Solo Coordinador GRD o Autoridad pueden ejecutar difusión simulada.
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={!permissions.canBroadcastApprovedAlert}
                          onClick={() => broadcastAlert(alert.id)}
                          className="ml-auto px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--accent-primary)] text-white dark:text-[#08121A] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
                        >
                          Difundir en buzones ficticios
                        </button>
                      </div>
                    )}

                    {/* 5 Fictional Mailboxes interactive receipts */}
                    {alert.status === 'DIFUNDIDA' && (
                      <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5">
                            <Inbox className="w-3.5 h-3.5 text-[var(--accent-primary)]" aria-hidden="true" />
                            Buzones internos simulados ({readCount}/{MAILBOXES.length} leídos)
                          </span>
                          <span className="text-[var(--text-secondary)]">
                            Aprobado por {alert.approverRole ?? 'AUTORIDAD'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {alertReceipts.map((rec) => (
                            <div
                              key={rec.id}
                              className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/40 px-3 py-2 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                  {rec.mailboxLabel}
                                </p>
                                <p className="text-[11px] text-[var(--text-secondary)]">
                                  {rec.status === 'LEIDO'
                                    ? `Leído ${rec.readAt?.slice(11, 16) ?? ''}`
                                    : rec.status}
                                </p>
                              </div>
                              {rec.status !== 'LEIDO' ? (
                                <button
                                  type="button"
                                  onClick={() => markReceiptRead(rec.id)}
                                  className="px-2 py-1 rounded-[6px] text-[11px] font-semibold bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] cursor-pointer shrink-0"
                                >
                                  Confirmar lectura
                                </button>
                              ) : (
                                <StatusBadge status="LEIDO" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
