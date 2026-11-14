import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, ExternalLink, ShieldAlert } from 'lucide-react';
import { useNexoStore } from '../../store/useNexoStore';
import { RULES, SERVICES, SOURCES } from '../../data/seedData';
import { canRoleUpdateAction } from '../../lib/engines/permissions';
import { Drawer } from './OverlayPrimitives';
import { SourceBadge } from './StatusBadge';

export function DecisionInspectorDrawer() {
  const navigate = useNavigate();
  const inspected = useNexoStore((s) => s.inspectedDecision);
  const close = useNexoStore((s) => s.closeDecisionInspector);
  const actions = useNexoStore((s) => s.actions);
  const activeRole = useNexoStore((s) => s.activeRole);
  const updateActionStatus = useNexoStore((s) => s.updateActionStatus);
  const pushToast = useNexoStore((s) => s.pushToast);

  const liveAction =
    inspected?.kind === 'ACTION'
      ? actions.find((a) => a.id === inspected.id)
      : undefined;

  const [evidenceInput, setEvidenceInput] = useState('');

  useEffect(() => {
    setEvidenceInput(liveAction?.evidence ?? inspected?.evidence ?? '');
  }, [inspected?.id, liveAction?.evidence, inspected?.evidence]);

  const rule = inspected?.ruleId
    ? RULES.find((r) => r.id === inspected.ruleId)
    : undefined;
  const service = inspected?.serviceId
    ? SERVICES.find((sv) => sv.id === inspected.serviceId)
    : undefined;
  const source = inspected?.sourceId
    ? SOURCES.find((sr) => sr.id === inspected.sourceId)
    : undefined;

  const canEditActionEvidence =
    Boolean(liveAction) && canRoleUpdateAction(activeRole, liveAction!);

  const handleSaveEvidence = () => {
    if (!liveAction || !evidenceInput.trim()) return;
    updateActionStatus(liveAction.id, liveAction.status, evidenceInput.trim());
    pushToast({
      title: 'Evidencia registrada',
      description: 'Actualizada en la acción y registrada en la bitácora local.',
      tone: 'success',
    });
  };

  return (
    <Drawer
      open={Boolean(inspected)}
      onClose={close}
      title="Inspector de decisiones"
      subtitle="Trazabilidad visual: Entrada → Regla → Dependencia → Resultado"
    >
      {inspected && (
        <div className="space-y-6">
          <div>
            <p className="text-xs font-mono text-[var(--text-secondary)]">
              {inspected.id} · {inspected.kind}
            </p>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mt-1">
              {inspected.title}
            </h3>
          </div>

          {/* 4-step chain */}
          <div className="space-y-3">
            <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/50 p-4">
              <p className="text-xs font-semibold text-[var(--accent-primary)]">
                1. Entrada evaluada
              </p>
              <p className="text-[13px] text-[var(--text-primary)] mt-1">
                {rule?.condition ?? inspected.ruleCondition ?? 'Condición operativa del escenario activo'}
              </p>
            </div>

            <div className="flex justify-center text-[var(--text-secondary)]">
              <ArrowRight className="w-4 h-4 rotate-90" aria-hidden="true" />
            </div>

            <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-[var(--accent-primary)]">
                  2. Regla y versión
                </p>
                <span className="text-xs font-mono text-[var(--text-secondary)]">
                  {rule?.id ?? inspected.ruleId ?? 'Determinista'} · {rule?.version ?? inspected.ruleVersion ?? 'v1.0'}
                </span>
              </div>
              <p className="text-[13px] text-[var(--text-primary)] mt-1">
                {rule?.name ?? inspected.title}
              </p>
            </div>

            <div className="flex justify-center text-[var(--text-secondary)]">
              <ArrowRight className="w-4 h-4 rotate-90" aria-hidden="true" />
            </div>

            <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/50 p-4">
              <p className="text-xs font-semibold text-[var(--accent-primary)]">
                3. Servicio o dependencia vinculada
              </p>
              <p className="text-[13px] text-[var(--text-primary)] mt-1">
                {service ? `${service.name} (${service.id})` : 'Evaluación transversal de servicios'}
              </p>
            </div>

            <div className="flex justify-center text-[var(--text-secondary)]">
              <ArrowRight className="w-4 h-4 rotate-90" aria-hidden="true" />
            </div>

            <div className="rounded-[12px] border border-[var(--accent-primary)]/40 bg-[var(--bg-surface)] p-4 space-y-2.5">
              <p className="text-xs font-semibold text-[var(--accent-primary)]">
                4. Resultado y justificación
              </p>
              <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                {inspected.justification}
              </p>
              <p className="text-xs text-[var(--text-secondary)]">
                Evidencia: {liveAction?.evidence ?? inspected.evidence}
              </p>

              {liveAction && (
                <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                  <label
                    htmlFor="inspector-evidence-input"
                    className="text-xs font-semibold text-[var(--text-primary)] block"
                  >
                    Registrar evidencia observada (simulación)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="inspector-evidence-input"
                      type="text"
                      disabled={!canEditActionEvidence}
                      value={evidenceInput}
                      onChange={(e) => setEvidenceInput(e.target.value)}
                      placeholder="Ej. Tablero verificado visualmente por brigada..."
                      className="flex-1 px-3 py-1.5 rounded-[8px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] disabled:opacity-50"
                    />
                    <button
                      type="button"
                      disabled={!canEditActionEvidence || !evidenceInput.trim()}
                      onClick={handleSaveEvidence}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--accent-primary)] text-white dark:text-[#08121A] disabled:opacity-45 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Guardar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Source & limitations */}
          {source && (
            <div className="rounded-[12px] border border-[var(--border-subtle)] p-4 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <SourceBadge type={source.type} />
                <span className="text-xs font-mono text-[var(--text-secondary)]">{source.id}</span>
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{source.title}</p>
              <p className="text-xs text-[var(--text-secondary)]">
                {source.institution} · {source.date}
              </p>
              {source.url.startsWith('http') && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline"
                >
                  <span>Consultar documento de referencia</span>
                  <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          )}

          <div className="rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary)]">
              <ShieldAlert className="w-4 h-4 text-[#80263C] dark:text-[#E36D88]" aria-hidden="true" />
              <span>Limitaciones y supervisión humana</span>
            </div>
            <ul className="space-y-1.5 text-xs text-[var(--text-secondary)] list-disc pl-4">
              {inspected.limitations.map((lim, i) => (
                <li key={i}>{lim}</li>
              ))}
              <li>Prototipo académico simulado: ninguna acción sustituye la decisión humana competente.</li>
            </ul>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <button
              type="button"
              onClick={() => {
                close();
                navigate('/explicabilidad');
              }}
              className="font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
            >
              Ir a Explicabilidad →
            </button>
            <button
              type="button"
              onClick={() => {
                close();
                navigate('/bitacora');
              }}
              className="font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
            >
              Ver en Bitácora →
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
