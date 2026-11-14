import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ExternalLink, MapPin } from 'lucide-react';
import { PROTOCOLS, ROLE_META, SOURCES } from '../../data/seedData';
import { Tabs } from '../../components/ui/OverlayPrimitives';
import { SourceBadge } from '../../components/ui/StatusBadge';
import { PageHeader } from '../../components/ui/PageHeader';

export default function PreventionPage() {
  const [phase, setPhase] = useState<'ANTES' | 'DURANTE' | 'DESPUES'>('ANTES');

  const phaseProtocols = PROTOCOLS.filter((p) => p.phase === phase);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Guía preventiva"
        title="Prevención y protocolos"
        description="Guía estructurada en Antes, Durante y Después, distinguiendo recomendaciones verificadas de instrucciones didácticas."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Tabs
              activeTab={phase}
              onChange={setPhase}
              tabs={[
                { id: 'ANTES', label: 'Antes', count: PROTOCOLS.filter((p) => p.phase === 'ANTES').length },
                { id: 'DURANTE', label: 'Durante', count: PROTOCOLS.filter((p) => p.phase === 'DURANTE').length },
                { id: 'DESPUES', label: 'Después', count: PROTOCOLS.filter((p) => p.phase === 'DESPUES').length },
              ]}
            />
            <Link
              to="/mapa"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] whitespace-nowrap transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-[var(--accent-primary)]" aria-hidden="true" />
              <span>Rutas y puntos ficticios</span>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {phaseProtocols.map((prt) => {
          const source = SOURCES.find((s) => s.id === prt.sourceId);
          return (
            <article
              key={prt.id}
              className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-4 flex flex-col justify-between transition-colors hover:border-[var(--border-strong)]"
            >
              <div className="space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-subtle)]">
                  <span className="text-xs font-mono text-[var(--text-secondary)]">
                    {prt.id} · Fase {prt.phase} · {ROLE_META[prt.responsibleRole].shortLabel}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      prt.evidenceClassification === 'VERIFICADA'
                        ? 'text-[#178353] dark:text-[#4AD196]'
                        : 'text-[#A96A00] dark:text-[#F0B44C]'
                    }`}
                  >
                    {prt.evidenceClassification === 'VERIFICADA'
                      ? 'Recomendación verificada'
                      : 'Instrucción didáctica'}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)] leading-snug">
                    {prt.title}
                  </h3>
                  <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                    <strong className="text-[var(--text-primary)]">Objetivo:</strong> {prt.objective}
                  </p>
                </div>

                <ol className="divide-y divide-[var(--border-subtle)] text-[13px] text-[var(--text-primary)]">
                  {prt.generalActions.map((act, idx) => (
                    <li key={idx} className="py-2 first:pt-0 last:pb-0 flex items-start gap-2.5">
                      <span className="font-mono text-[11px] font-bold tabular-nums text-[var(--accent-primary)] pt-0.5 shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="leading-relaxed">{act}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
                {prt.warnings.map((w, i) => (
                  <p
                    key={i}
                    className="text-xs text-[#80263C] dark:text-[#E36D88] flex items-start gap-1.5 leading-relaxed"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{w}</span>
                  </p>
                ))}

                {source && (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                    <SourceBadge type={source.type} label={source.institution} />
                    {source.url.startsWith('http') && (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-[var(--accent-primary)] hover:underline"
                      >
                        <span>Fuente</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
