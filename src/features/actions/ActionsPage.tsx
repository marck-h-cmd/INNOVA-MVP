import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useNexoStore } from '../../store/useNexoStore';
import { useDerivedNexo } from '../../hooks/useDerivedNexo';
import { ROLE_META, SERVICES } from '../../data/seedData';
import { canRoleUpdateAction } from '../../lib/engines/permissions';
import { Action, ActionStatus } from '../../types/domain';
import { ActionCard } from '../../components/ui/ActionCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable, EmptyState, Tabs } from '../../components/ui/OverlayPrimitives';
import { StatusBadge } from '../../components/ui/StatusBadge';

const COLUMNS_ORDER: { status: ActionStatus; label: string }[] = [
  { status: 'PENDIENTE', label: 'Pendiente' },
  { status: 'EN_REVISION', label: 'En revisión' },
  { status: 'VERIFICADA', label: 'Verificada' },
  { status: 'CERRADA', label: 'Cerrada' },
];

export default function ActionsPage() {
  const updateActionStatus = useNexoStore((s) => s.updateActionStatus);
  const openDecisionInspector = useNexoStore((s) => s.openDecisionInspector);
  const { activeRole, scenarioActions } = useDerivedNexo();

  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLA'>('KANBAN');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('TODAS');
  const [roleFilter, setRoleFilter] = useState<string>('TODOS');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scenarioActions.filter((act) => {
      if (priorityFilter !== 'TODAS' && act.priority !== priorityFilter) return false;
      if (roleFilter !== 'TODOS' && act.responsibleRole !== roleFilter) return false;
      if (
        q &&
        !act.title.toLowerCase().includes(q) &&
        !act.ruleId.toLowerCase().includes(q) &&
        !act.justification.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [scenarioActions, priorityFilter, roleFilter, search]);

  const handleInspect = (act: Action) =>
    openDecisionInspector({
      kind: 'ACTION',
      id: act.id,
      title: act.title,
      ruleId: act.ruleId,
      ruleVersion: act.ruleVersion,
      serviceId: act.serviceId,
      justification: act.justification,
      sourceId: act.sourceId,
      evidence: act.evidence,
      limitations: [
        'Acción de demostración vinculada a regla determinista.',
        'Los cambios actualizan los indicadores globales y la bitácora local.',
      ],
    });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker={`Trazabilidad operativa · ${scenarioActions.length} acciones en escenario`}
        title="Centro de acciones"
        description="Acciones generadas por reglas deterministas e historial de verificación por rol."
        actions={
          <Tabs
            activeTab={viewMode}
            onChange={setViewMode}
            tabs={[
              { id: 'KANBAN', label: 'Vista Kanban', count: filtered.length },
              { id: 'TABLA', label: 'Vista Tabla', count: filtered.length },
            ]}
          />
        }
      />

      {/* Filters */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative">
          <Search
            className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar acción o regla..."
            aria-label="Buscar acciones"
            className="w-full pl-9 pr-3 py-2 rounded-[10px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
          />
        </div>

        <select
          aria-label="Filtrar por prioridad"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-3 py-2 rounded-[10px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)]"
        >
          <option value="TODAS">Todas las prioridades</option>
          <option value="ALTA">Prioridad alta</option>
          <option value="MEDIA">Prioridad media</option>
          <option value="BAJA">Prioridad baja</option>
        </select>

        <select
          aria-label="Filtrar por rol responsable"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 rounded-[10px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)]"
        >
          <option value="TODOS">Todos los roles responsables</option>
          {Object.entries(ROLE_META).map(([roleKey, meta]) => (
            <option key={roleKey} value={roleKey}>
              {meta.label}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No hay acciones que coincidan"
          description="Pruebe limpiando los filtros o seleccionando otro escenario."
        />
      ) : viewMode === 'KANBAN' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {COLUMNS_ORDER.map((col) => {
            const colActions = filtered.filter((a) => a.status === col.status);
            return (
              <div
                key={col.status}
                className="rounded-[14px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/40 p-3.5 space-y-3"
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-[var(--text-primary)]">{col.label}</h3>
                  <span className="text-xs font-mono tabular-nums text-[var(--text-secondary)]">
                    {colActions.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {colActions.map((act) => (
                    <ActionCard
                      key={act.id}
                      action={act}
                      canUpdate={canRoleUpdateAction(activeRole, act)}
                      onStatusChange={updateActionStatus}
                      onInspect={handleInspect}
                    />
                  ))}
                  {colActions.length === 0 && (
                    <p className="text-xs text-[var(--text-secondary)] py-4 text-center">
                      Sin acciones en esta columna.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <DataTable
          rows={filtered}
          columns={[
            {
              key: 'title',
              header: 'Acción y regla',
              render: (row) => (
                <div className="space-y-0.5 max-w-md">
                  <p className="font-semibold text-[var(--text-primary)]">{row.title}</p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {row.ruleId} · {row.ruleVersion} · {row.justification}
                  </p>
                </div>
              ),
            },
            {
              key: 'service',
              header: 'Servicio',
              render: (row) =>
                SERVICES.find((s) => s.id === row.serviceId)?.name ?? row.serviceId,
            },
            {
              key: 'role',
              header: 'Responsable',
              render: (row) => ROLE_META[row.responsibleRole].shortLabel,
            },
            {
              key: 'priority',
              header: 'Prioridad',
              render: (row) => <StatusBadge status={row.priority} />,
            },
            {
              key: 'status',
              header: 'Estado',
              render: (row) => (
                <select
                  aria-label={`Estado de ${row.title}`}
                  value={row.status}
                  disabled={!canRoleUpdateAction(activeRole, row)}
                  onChange={(e) =>
                    updateActionStatus(row.id, e.target.value as ActionStatus)
                  }
                  className="px-2.5 py-1 rounded-[8px] text-xs font-semibold bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] disabled:opacity-50"
                >
                  {COLUMNS_ORDER.map((o) => (
                    <option key={o.status} value={o.status}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ),
            },
            {
              key: 'inspect',
              header: 'Fundamento',
              align: 'right',
              render: (row) => (
                <button
                  type="button"
                  onClick={() => handleInspect(row)}
                  className="text-xs font-semibold text-[var(--accent-primary)] hover:underline cursor-pointer"
                >
                  Ver fundamento
                </button>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
