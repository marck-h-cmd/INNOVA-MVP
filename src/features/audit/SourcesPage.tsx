import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { SOURCES } from '../../data/seedData';
import { SourceType } from '../../types/domain';
import { SourceBadge } from '../../components/ui/StatusBadge';
import { Tabs } from '../../components/ui/OverlayPrimitives';
import { PageHeader } from '../../components/ui/PageHeader';

export default function SourcesPage() {
  const [filter, setFilter] = useState<'TODAS' | SourceType>('TODAS');

  const filtered =
    filter === 'TODAS' ? SOURCES : SOURCES.filter((s) => s.type === filter);

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Respaldo documental"
        title="Catálogo documental de fuentes"
        description="Distinción explícita entre portales oficiales de referencia, antecedentes históricos verificables de 2025 y parámetros simulados de demostración."
        actions={
          <Tabs
            activeTab={filter}
            onChange={setFilter}
            tabs={[
              { id: 'TODAS', label: 'Todas', count: SOURCES.length },
              {
                id: 'OFICIAL',
                label: 'Fuentes oficiales',
                count: SOURCES.filter((s) => s.type === 'OFICIAL').length,
              },
              {
                id: 'HISTORICO',
                label: 'Históricas UNT 2025',
                count: SOURCES.filter((s) => s.type === 'HISTORICO').length,
              },
              {
                id: 'SIMULADO',
                label: 'Datos simulados',
                count: SOURCES.filter((s) => s.type === 'SIMULADO').length,
              },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((src) => (
          <article
            key={src.id}
            className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 flex flex-col justify-between gap-4 transition-colors hover:border-[var(--border-strong)]"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[var(--border-subtle)]">
                <SourceBadge type={src.type} />
                <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
                  {src.id}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)] leading-snug">
                  {src.title}
                </h3>
                <p className="text-xs font-medium text-[var(--text-secondary)] mt-1">
                  {src.institution} · {src.date}
                </p>
              </div>

              <dl className="space-y-1.5 text-xs">
                <div>
                  <dt className="inline font-semibold text-[var(--text-primary)]">Ámbito: </dt>
                  <dd className="inline text-[var(--text-secondary)] leading-relaxed">{src.scope}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-[var(--text-primary)]">Evidencia: </dt>
                  <dd className="inline text-[var(--text-secondary)]">{src.evidenceType}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold text-[#80263C] dark:text-[#E36D88]">Limitaciones: </dt>
                  <dd className="inline text-[#80263C] dark:text-[#E36D88] leading-relaxed">{src.limitations}</dd>
                </div>
              </dl>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)]">
              {src.url.startsWith('http') ? (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline break-all"
                >
                  <span>{src.url}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                </a>
              ) : (
                <span className="text-xs text-[var(--text-secondary)]">
                  Modelo determinista local de ejercicio académico
                </span>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
