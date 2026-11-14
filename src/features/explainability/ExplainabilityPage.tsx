import { useState } from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { useDerivedNexo } from '../../hooks/useDerivedNexo';
import { ROLE_META, SERVICES, SOURCES } from '../../data/seedData';
import {
  buildLocalExplanation,
  ExplanationResult,
  requestAssistedExplanation,
} from '../../lib/engines/aiExplainer';
import { RiskIndicator, SourceBadge, StatusBadge } from '../../components/ui/StatusBadge';
import { PageHeader } from '../../components/ui/PageHeader';

export default function ExplainabilityPage() {
  const {
    activeScenario,
    dependencyGraph,
    riskIndex,
    matchedRules,
    continuity,
  } = useDerivedNexo();

  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<ExplanationResult | null>(null);

  const localFallback = buildLocalExplanation({
    scenario: activeScenario,
    riskIndex,
    dependencyGraph,
    matchedRules,
    continuity,
    sources: SOURCES,
  });

  const handleGenerateAi = async () => {
    setAiLoading(true);
    try {
      const res = await requestAssistedExplanation({
        scenario: activeScenario,
        riskIndex,
        dependencyGraph,
        matchedRules,
        continuity,
        sources: SOURCES,
      });
      setAiResult(res);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Transparencia algorítmica"
        title="¿Por qué NEXO recomienda esto?"
        description="Toda recomendación y puntaje en NEXO es determinista, reproducible y trazable hacia sus entradas, reglas y fuentes."
      />

      {/* Section 1: Mathematical Formula Breakdown */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              ¿Por qué este nivel de atención?
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {riskIndex.disclaimer}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-display text-3xl font-bold tabular-nums text-[var(--text-primary)]">
              {riskIndex.score}/100
            </span>
            <StatusBadge status={riskIndex.level} />
          </div>
        </div>

        <RiskIndicator
          score={riskIndex.score}
          level={riskIndex.level}
          label={riskIndex.label}
        />

        <div className="rounded-[10px] bg-[var(--bg-surface-2)]/70 border border-[var(--border-subtle)] p-3.5 overflow-x-auto">
          <p className="text-xs font-semibold text-[var(--text-secondary)] mb-1">
            Fórmula exacta evaluada
          </p>
          <code className="text-xs font-mono text-[var(--text-primary)] whitespace-nowrap">
            {riskIndex.formulaText}
          </code>
        </div>

        <div className="rounded-[12px] border border-[var(--border-subtle)] overflow-hidden grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--border-subtle)] bg-[var(--bg-surface-2)]/20">
          {riskIndex.components.map((comp) => (
            <div key={comp.key} className="p-4 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[var(--text-primary)]">
                    {comp.label}
                  </span>
                  <span className="font-mono font-bold tabular-nums text-[var(--accent-primary)]">
                    {Math.round(comp.weight * 100)}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between font-mono tabular-nums">
                  <span className="text-xl font-bold text-[var(--text-primary)]">
                    {comp.rawValue}%
                  </span>
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    +{comp.weightedContribution} pts
                  </span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-[var(--border-subtle)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, comp.rawValue))}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                {comp.explanation}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: 8-point Traceability per Active Rule Recommendation */}
      <section className="space-y-4">
        <h3 className="text-base font-bold text-[var(--text-primary)]">
          Desglose explicable de recomendaciones activas ({matchedRules.length})
        </h3>

        {matchedRules.length === 0 ? (
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-6 text-sm text-[var(--text-secondary)]">
            No hay reglas de contingencia activadas en el escenario actual.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {matchedRules.map((match) => {
              const srv = SERVICES.find((s) => s.id === match.targetServiceId);
              const src = SOURCES.find((s) => s.id === match.rule.sourceId);

              return (
                <article
                  key={match.rule.id}
                  className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-3.5 transition-colors hover:border-[var(--border-strong)]"
                >
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[var(--border-subtle)]">
                    <div>
                      <span className="text-xs font-mono text-[var(--text-secondary)]">
                        {match.rule.id} · Versión {match.rule.version}
                      </span>
                      <h4 className="text-[15px] font-bold text-[var(--text-primary)] mt-0.5 leading-snug">
                        {match.rule.name}
                      </h4>
                    </div>
                    <StatusBadge status={match.rule.priority} />
                  </div>

                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div>
                      <dt className="font-semibold text-[var(--text-secondary)]">
                        1. Evento que la activó
                      </dt>
                      <dd className="text-[var(--text-primary)] mt-0.5 leading-relaxed">
                        {activeScenario.title} ({match.triggerReason})
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[var(--text-secondary)]">
                        2. Condición cumplida
                      </dt>
                      <dd className="font-mono text-[var(--text-primary)] mt-0.5 leading-relaxed">
                        {match.rule.condition}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[var(--text-secondary)]">
                        3. Regla ejecutada
                      </dt>
                      <dd className="text-[var(--text-primary)] mt-0.5">
                        {match.rule.id} ({match.rule.version})
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[var(--text-secondary)]">
                        4. Servicio relacionado
                      </dt>
                      <dd className="text-[var(--text-primary)] mt-0.5">
                        {srv ? `${srv.name} (${srv.id})` : match.targetServiceId}
                      </dd>
                    </div>
                    <div className="sm:col-span-2 pt-2 border-t border-[var(--border-subtle)]">
                      <dt className="font-semibold text-[var(--text-secondary)]">
                        5. Acción propuesta
                      </dt>
                      <dd className="text-[var(--text-primary)] font-medium mt-0.5 leading-relaxed">
                        {match.rule.action}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[var(--text-secondary)]">
                        6. Rol que debe revisarla
                      </dt>
                      <dd className="text-[var(--text-primary)] mt-0.5">
                        {ROLE_META[match.rule.responsibleRole].label}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-[var(--text-secondary)]">
                        7. Fuente o supuesto de respaldo
                      </dt>
                      <dd className="mt-1 flex flex-wrap items-center gap-1.5">
                        {src && <SourceBadge type={src.type} label={src.institution} />}
                        {src?.url.startsWith('http') && (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-[var(--accent-primary)] hover:underline"
                          >
                            <span>Abrir</span>
                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                          </a>
                        )}
                      </dd>
                    </div>
                    <div className="sm:col-span-2 pt-2 border-t border-[var(--border-subtle)]">
                      <dt className="font-semibold text-[var(--text-secondary)]">
                        8. Limitaciones existentes
                      </dt>
                      <dd className="text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        {src?.limitations ?? 'Regla didáctica sujeta a validación técnica humana.'}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Section 3: Optional "Explicar con IA" (deterministic local first, optional Gemini proxy) */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Explicar con IA (módulo opcional asistido)
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Sintetiza únicamente las salidas deterministas del motor. Nunca modifica reglas, inventa riesgos ni aprueba decisiones.
            </p>
          </div>

          <button
            type="button"
            disabled={aiLoading}
            onClick={handleGenerateAi}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] text-xs font-semibold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white dark:text-[#08121A] disabled:opacity-50 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{aiLoading ? 'Generando síntesis...' : 'Generar síntesis asistida'}</span>
          </button>
        </div>

        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-[var(--accent-primary)]">
              {(aiResult ?? localFallback).provider === 'gemini'
                ? `Síntesis vía Gemini (${aiResult?.model ?? 'gemini-4-hydrogen'})`
                : 'Síntesis mediante plantilla determinista local (funciona sin API ni internet)'}
            </span>
            <span className="text-[#80263C] dark:text-[#E36D88] font-medium">
              {(aiResult ?? localFallback).disclaimer}
            </span>
          </div>
          <p className="text-[13px] text-[var(--text-primary)] whitespace-pre-line leading-relaxed bg-[var(--bg-surface-2)]/40 rounded-[10px] p-4 border border-[var(--border-subtle)]">
            {(aiResult ?? localFallback).text}
          </p>
        </div>
      </section>
    </div>
  );
}
