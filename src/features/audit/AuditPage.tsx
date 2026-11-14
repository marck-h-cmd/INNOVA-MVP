import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useNexoStore } from '../../store/useNexoStore';
import { ROLE_META } from '../../data/seedData';
import { AuditEntry } from '../../types/domain';
import { DataTable, Timeline } from '../../components/ui/OverlayPrimitives';
import { PageHeader } from '../../components/ui/PageHeader';

function downloadFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCsv(entries: AuditEntry[]): string {
  const header = [
    'id',
    'timestamp',
    'actorRole',
    'eventType',
    'scenarioId',
    'summary',
    'previousState',
    'nextState',
    'sourceId',
    'simulated',
  ].join(',');
  const escape = (val: string | boolean | undefined) =>
    `"${String(val ?? '').replace(/"/g, '""')}"`;
  const rows = entries.map((e) =>
    [
      escape(e.id),
      escape(e.timestamp),
      escape(e.actorRole),
      escape(e.eventType),
      escape(e.scenarioId),
      escape(e.summary),
      escape(e.previousState),
      escape(e.nextState),
      escape(e.sourceId),
      escape(e.simulated),
    ].join(','),
  );
  return [header, ...rows].join('\n');
}

export default function AuditPage() {
  const auditLog = useNexoStore((s) => s.auditLog);
  const scenarios = useNexoStore((s) => s.scenarios);

  const [roleFilter, setRoleFilter] = useState<string>('TODOS');
  const [eventFilter, setEventFilter] = useState<string>('TODOS');
  const [scenarioFilter, setScenarioFilter] = useState<string>('TODOS');

  const filtered = useMemo(
    () =>
      auditLog.filter((entry) => {
        if (roleFilter !== 'TODOS' && entry.actorRole !== roleFilter) return false;
        if (eventFilter !== 'TODOS' && entry.eventType !== eventFilter) return false;
        if (scenarioFilter !== 'TODOS' && entry.scenarioId !== scenarioFilter) return false;
        return true;
      }),
    [auditLog, roleFilter, eventFilter, scenarioFilter],
  );

  const eventTypes = useMemo(
    () => Array.from(new Set(auditLog.map((e) => e.eventType))),
    [auditLog],
  );

  const selectClass =
    'px-3 py-2 rounded-[9px] bg-[var(--bg-surface-2)]/70 border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] hover:border-[var(--accent-primary)]/40 transition-colors cursor-pointer';

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Trazabilidad local"
        title="Bitácora de decisiones y cambios"
        description="Registro de auditoría local en navegador para trazabilidad de demostración (no constituye un registro institucional inalterable)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                downloadFile('nexo-unt-bitacora.csv', toCsv(filtered), 'text/csv;charset=utf-8;')
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-xs font-semibold bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={() =>
                downloadFile(
                  'nexo-unt-bitacora.json',
                  JSON.stringify(filtered, null, 2),
                  'application/json',
                )
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-xs font-semibold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white dark:text-[#08121A] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Exportar JSON</span>
            </button>
          </div>
        }
      />

      {/* Filters */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
        <select
          aria-label="Filtrar bitácora por rol"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={selectClass}
        >
          <option value="TODOS">Todos los roles</option>
          {Object.entries(ROLE_META).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar bitácora por tipo de evento"
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className={selectClass}
        >
          <option value="TODOS">Todos los eventos</option>
          {eventTypes.map((ev) => (
            <option key={ev} value={ev}>
              {ev}
            </option>
          ))}
        </select>

        <select
          aria-label="Filtrar bitácora por escenario"
          value={scenarioFilter}
          onChange={(e) => setScenarioFilter(e.target.value)}
          className={selectClass}
        >
          <option value="TODOS">Todos los escenarios</option>
          {scenarios.map((sc) => (
            <option key={sc.id} value={sc.id}>
              {sc.id}: {sc.title}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-[var(--border-subtle)]">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Línea de tiempo reciente
            </h3>
            <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
              {Math.min(8, filtered.length)} eventos
            </span>
          </div>
          <Timeline
            items={filtered.slice(0, 8).map((e) => ({
              id: e.id,
              timeLabel: e.timestamp.replace('T', ' '),
              title: e.summary,
              description: `${e.previousState} → ${e.nextState}`,
              meta: `${ROLE_META[e.actorRole].shortLabel} · ${e.scenarioId}`,
              tone: 'active',
            }))}
          />
        </div>

        <div className="lg:col-span-7">
          <DataTable
            rows={filtered}
            columns={[
              {
                key: 'time',
                header: 'Hora (sim.)',
                render: (row) => (
                  <span className="font-mono text-xs tabular-nums whitespace-nowrap">
                    {row.timestamp.replace('T', ' ')}
                  </span>
                ),
              },
              {
                key: 'role',
                header: 'Rol',
                render: (row) => (
                  <span className="text-xs font-semibold">
                    {ROLE_META[row.actorRole].shortLabel}
                  </span>
                ),
              },
              {
                key: 'summary',
                header: 'Detalle del cambio',
                render: (row) => (
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-[var(--text-primary)]">
                      {row.summary}
                    </p>
                    <p className="text-[11px] font-mono text-[var(--text-secondary)]">
                      {row.previousState} → {row.nextState}
                    </p>
                  </div>
                ),
              },
              {
                key: 'scenario',
                header: 'Escenario',
                render: (row) => (
                  <span className="font-mono text-xs tabular-nums">{row.scenarioId}</span>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
