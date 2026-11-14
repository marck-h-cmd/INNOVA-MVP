import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Search } from 'lucide-react';
import { useNexoStore } from '../../store/useNexoStore';
import { RULES, SERVICES, SOURCES } from '../../data/seedData';
import { Modal } from './OverlayPrimitives';

const ROUTE_ENTRIES = [
  { label: 'Centro de control', path: '/', group: 'General' },
  { label: 'Laboratorio de escenarios', path: '/escenarios', group: 'General' },
  { label: 'Explorador territorial (Mapa y Plano)', path: '/mapa', group: 'General' },
  { label: 'Dependencias entre servicios', path: '/dependencias', group: 'Operaciones' },
  { label: 'Centro de acciones', path: '/acciones', group: 'Operaciones' },
  { label: 'Comunicaciones y aprobación', path: '/comunicaciones', group: 'Operaciones' },
  { label: 'Continuidad académica y administrativa', path: '/continuidad', group: 'Operaciones' },
  { label: 'Prevención y protocolos', path: '/prevencion', group: 'Operaciones' },
  { label: 'Sala de coordinación', path: '/coordinacion', group: 'Operaciones' },
  { label: 'Explicabilidad del motor', path: '/explicabilidad', group: 'Transparencia' },
  { label: 'Bitácora de decisiones', path: '/bitacora', group: 'Transparencia' },
  { label: 'Fuentes documentales', path: '/fuentes', group: 'Transparencia' },
  { label: 'Mi comunidad (Estudiantes y Docentes)', path: '/comunidad', group: 'Experiencia' },
  { label: 'Demo interactiva 90 segundos', path: '/demo', group: 'Experiencia' },
  { label: 'Configuración y privacidad', path: '/configuracion', group: 'Experiencia' },
];

export function CommandPalette() {
  const open = useNexoStore((s) => s.commandPaletteOpen);
  const setOpen = useNexoStore((s) => s.setCommandPaletteOpen);
  const scenarios = useNexoStore((s) => s.scenarios);
  const activeScenarioId = useNexoStore((s) => s.activeScenarioId);
  const actions = useNexoStore((s) => s.actions);
  const alerts = useNexoStore((s) => s.alerts);
  const selectScenario = useNexoStore((s) => s.selectScenario);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const routes = ROUTE_ENTRIES.filter(
      (r) => !q || r.label.toLowerCase().includes(q) || r.group.toLowerCase().includes(q),
    ).map((r) => ({
      id: `route-${r.path}`,
      title: r.label,
      subtitle: `Pantalla · ${r.group}`,
      onRun: () => {
        navigate(r.path);
        setOpen(false);
      },
    }));

    const scns = scenarios
      .filter((s) => !q || s.title.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
      .map((s) => ({
        id: `scn-${s.id}`,
        title: `Activar escenario: ${s.title}`,
        subtitle: `${s.id} · Simulación`,
        onRun: () => {
          selectScenario(s.id);
          navigate('/escenarios');
          setOpen(false);
        },
      }));

    const srvs = SERVICES.filter(
      (s) => !q || s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q),
    ).map((s) => ({
      id: `srv-${s.id}`,
      title: `${s.name} (${s.id})`,
      subtitle: 'Ir a grafo de dependencias',
      onRun: () => {
        navigate('/dependencias');
        setOpen(false);
      },
    }));

    const rules = RULES.filter(
      (r) => !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q),
    ).map((r) => ({
      id: `rul-${r.id}`,
      title: `${r.id}: ${r.name}`,
      subtitle: 'Ver en explicabilidad',
      onRun: () => {
        navigate('/explicabilidad');
        setOpen(false);
      },
    }));

    const acts = actions
      .filter(
        (a) =>
          (a.scenarioId === activeScenarioId || a.isHistoricalSeed) &&
          (!q || a.title.toLowerCase().includes(q) || a.ruleId.toLowerCase().includes(q)),
      )
      .map((a) => ({
        id: `act-${a.id}`,
        title: a.title,
        subtitle: `Acción · ${a.ruleId} · ${a.status}`,
        onRun: () => {
          navigate('/acciones');
          setOpen(false);
        },
      }));

    const comms = alerts
      .filter((al) => !q || al.title.toLowerCase().includes(q) || al.id.toLowerCase().includes(q))
      .map((al) => ({
        id: `com-${al.id}`,
        title: al.title,
        subtitle: `Comunicación · ${al.status} · ${al.scenarioId}`,
        onRun: () => {
          navigate('/comunicaciones');
          setOpen(false);
        },
      }));

    const srcs = SOURCES.filter(
      (s) => !q || s.title.toLowerCase().includes(q) || s.institution.toLowerCase().includes(q),
    ).map((s) => ({
      id: `src-${s.id}`,
      title: s.title,
      subtitle: `Fuente · ${s.institution}`,
      onRun: () => {
        navigate('/fuentes');
        setOpen(false);
      },
    }));

    return [...routes, ...scns, ...srvs, ...rules, ...acts, ...comms, ...srcs].slice(0, 12);
  }, [query, scenarios, activeScenarioId, actions, alerts, navigate, selectScenario, setOpen]);

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="Búsqueda rápida NEXO UNT"
      subtitle="Navegue por módulos, escenarios, servicios, reglas o fuentes documentales."
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        <div className="relative">
          <Search
            className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pantalla, servicio (ej. Electricidad), regla o fuente..."
            aria-label="Buscar en NEXO UNT"
            className="w-full pl-10 pr-4 py-2.5 rounded-[10px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
          />
        </div>

        <div className="divide-y divide-[var(--border-subtle)] max-h-80 overflow-y-auto rounded-[12px] border border-[var(--border-subtle)]">
          {results.length === 0 ? (
            <p className="p-4 text-xs text-[var(--text-secondary)] text-center">
              Sin coincidencias para "{query}".
            </p>
          ) : (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onRun}
                className="w-full px-4 py-2.5 text-left flex items-center justify-between gap-3 hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer"
              >
                <div>
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {item.title}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">{item.subtitle}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[var(--text-secondary)] shrink-0" aria-hidden="true" />
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}
