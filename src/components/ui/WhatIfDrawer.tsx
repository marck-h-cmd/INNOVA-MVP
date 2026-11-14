import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { useNexoStore } from '../../store/useNexoStore';
import { useDerivedNexo } from '../../hooks/useDerivedNexo';
import {
  CONTINUITY_ACTIVITIES,
  DEPENDENCIES,
  FACILITIES,
  RULES,
  SERVICES,
} from '../../data/seedData';
import { compareWhatIfScenarios } from '../../lib/engines/whatIfEngine';
import { ScenarioInputs, ServiceStatus } from '../../types/domain';
import { Drawer } from './OverlayPrimitives';
import { StatusBadge } from './StatusBadge';

type PresetKey = 'RESTORE_ELECTRICITY' | 'SIMULATE_OUTAGE' | 'LIMIT_ACCESS';

const PRESETS: Record<
  PresetKey,
  {
    label: string;
    description: string;
    overrides: Record<string, ServiceStatus>;
    inputs: Partial<ScenarioInputs>;
  }
> = {
  RESTORE_ELECTRICITY: {
    label: 'Electricidad restablecida (recuperación)',
    description: 'Evalúa el impacto si SRV-01 Electricidad, SRV-02 Agua y SRV-03 Conectividad regresan a OPERATIVO.',
    overrides: {
      'SRV-01': 'OPERATIVO',
      'SRV-02': 'OPERATIVO',
      'SRV-03': 'OPERATIVO',
    },
    inputs: {
      serviceDisruption: 10,
      continuityImpact: 15,
    },
  },
  SIMULATE_OUTAGE: {
    label: 'Interrupción eléctrica total',
    description: 'Evalúa el efecto en cascada si SRV-01 Electricidad pasa a NO_DISPONIBLE.',
    overrides: {
      'SRV-01': 'NO_DISPONIBLE',
      'SRV-02': 'SIN_CONFIRMAR',
      'SRV-03': 'LIMITADO',
    },
    inputs: {
      serviceDisruption: 75,
      continuityImpact: 65,
    },
  },
  LIMIT_ACCESS: {
    label: 'Restricción severa de accesos',
    description: 'Simula anegamiento en accesos principales manteniendo suministro eléctrico operativo.',
    overrides: {
      'SRV-01': 'OPERATIVO',
      'SRV-04': 'NO_DISPONIBLE',
    },
    inputs: {
      accessRestriction: 85,
      continuityImpact: 55,
    },
  },
};

export function WhatIfDrawer() {
  const navigate = useNavigate();
  const open = useNexoStore((s) => s.whatIfOpen);
  const setOpen = useNexoStore((s) => s.setWhatIfOpen);
  const applyAlternative = useNexoStore((s) => s.applyWhatIfAlternative);
  const { activeScenario, permissions } = useDerivedNexo();

  const defaultPreset: PresetKey =
    activeScenario.serviceOverrides['SRV-01'] === 'NO_DISPONIBLE'
      ? 'RESTORE_ELECTRICITY'
      : 'SIMULATE_OUTAGE';
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>(defaultPreset);

  useEffect(() => {
    if (open) {
      setSelectedPreset(defaultPreset);
    }
  }, [open, activeScenario.id, defaultPreset]);

  const preset = PRESETS[selectedPreset];

  const comparison = useMemo(
    () =>
      compareWhatIfScenarios(
        activeScenario,
        preset.overrides,
        preset.inputs,
        SERVICES,
        DEPENDENCIES,
        RULES,
        CONTINUITY_ACTIVITIES,
        FACILITIES,
      ),
    [activeScenario, preset],
  );

  const deltaLabel = (n: number) => (n > 0 ? `+${n}` : `${n}`);

  return (
    <Drawer
      open={open}
      onClose={() => setOpen(false)}
      title="Exploración: ¿Qué pasaría si...?"
      subtitle="Comparación en vivo con el motor real sin alterar el escenario actual hasta que decida aplicarlo."
      widthClass="max-w-2xl"
    >
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--text-secondary)]">
            Seleccione escenario alternativo de comparación
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(Object.keys(PRESETS) as PresetKey[]).map((key) => {
              const active = selectedPreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedPreset(key)}
                  className={`text-left p-3 rounded-[10px] border text-xs transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--bg-surface-2)] border-[var(--accent-primary)] font-semibold text-[var(--text-primary)]'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {PRESETS[key].label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-[var(--text-secondary)]">{preset.description}</p>
        </div>

        {/* Two-column comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">
                Escenario actual
              </span>
              <StatusBadge status={comparison.current.riskIndex.level} />
            </div>
            <div className="font-display text-3xl font-bold tabular-nums text-[var(--text-primary)]">
              {comparison.current.riskIndex.score}/100
            </div>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Servicios por verificar</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {comparison.current.servicesToVerifyCount}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Reglas y acciones activas</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {comparison.current.matchedRules.length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Actividades en revisión/afectadas</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {comparison.current.affectedActivitiesCount}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Actividades normales</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {comparison.current.continuity.normalCount}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[14px] border border-[var(--accent-primary)]/50 bg-[var(--bg-surface)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[var(--accent-primary)]">
                Escenario alternativo
              </span>
              <StatusBadge status={comparison.alternative.riskIndex.level} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold tabular-nums text-[var(--text-primary)]">
                {comparison.alternative.riskIndex.score}/100
              </span>
              <span className="text-xs font-mono font-semibold text-[var(--accent-primary)] tabular-nums">
                ({deltaLabel(comparison.deltas.scoreDelta)} pts)
              </span>
            </div>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Servicios por verificar</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {comparison.alternative.servicesToVerifyCount}{' '}
                  <span className="text-[var(--text-secondary)]">
                    ({deltaLabel(comparison.deltas.servicesToVerifyDelta)})
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Reglas y acciones activas</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {comparison.alternative.matchedRules.length}{' '}
                  <span className="text-[var(--text-secondary)]">
                    ({deltaLabel(comparison.deltas.matchedRulesDelta)})
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Actividades en revisión/afectadas</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {comparison.alternative.affectedActivitiesCount}{' '}
                  <span className="text-[var(--text-secondary)]">
                    ({deltaLabel(comparison.deltas.affectedActivitiesDelta)})
                  </span>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--text-secondary)]">Actividades normales</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {comparison.alternative.continuity.normalCount}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Apply or discard */}
        <div className="pt-4 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs text-[var(--text-secondary)]">
              {permissions.canEditScenario || permissions.canOverrideServices
                ? 'El escenario original permanece intacto hasta confirmar.'
                : 'Su rol actual permite explorar comparaciones en modo lectura.'}
            </p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                navigate('/explicabilidad');
              }}
              className="text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
            >
              Abrir explicabilidad completa del escenario →
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-[10px] text-xs font-semibold bg-[var(--bg-surface-2)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)] cursor-pointer"
            >
              Cerrar sin cambiar
            </button>
            <button
              type="button"
              disabled={!permissions.canEditScenario && !permissions.canOverrideServices}
              onClick={() =>
                applyAlternative(preset.overrides, preset.inputs, preset.label)
              }
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-semibold bg-[var(--accent-primary)] text-white dark:text-[#08121A] hover:bg-[var(--accent-primary-hover)] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Aplicar alternativa</span>
              <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
