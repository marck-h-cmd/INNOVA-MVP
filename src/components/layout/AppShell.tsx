import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  Compass,
  FileCheck2,
  GitBranch,
  History,
  LayoutDashboard,
  Layers,
  Map as MapIcon,
  Menu,
  MessageSquare,
  Moon,
  Play,
  Radio,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useNexoStore } from '../../store/useNexoStore';
import { PERMANENT_SIMULATION_DISCLAIMER, ROLE_META } from '../../data/seedData';
import { Role } from '../../types/domain';
import { NexoLogo } from '../ui/NexoLogo';
import { Drawer, OfflineBanner, ToastContainer } from '../ui/OverlayPrimitives';
import { DecisionInspectorDrawer } from '../ui/DecisionInspectorDrawer';
import { WhatIfDrawer } from '../ui/WhatIfDrawer';
import { CommandPalette } from '../ui/CommandPalette';

interface NavGroup {
  title: string;
  items: { label: string; to: string; Icon: typeof LayoutDashboard }[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'GENERAL',
    items: [
      { label: 'Centro de control', to: '/', Icon: LayoutDashboard },
      { label: 'Escenarios', to: '/escenarios', Icon: Layers },
      { label: 'Explorador territorial', to: '/mapa', Icon: MapIcon },
    ],
  },
  {
    title: 'OPERACIONES',
    items: [
      { label: 'Dependencias', to: '/dependencias', Icon: GitBranch },
      { label: 'Acciones', to: '/acciones', Icon: FileCheck2 },
      { label: 'Comunicaciones', to: '/comunicaciones', Icon: MessageSquare },
      { label: 'Continuidad', to: '/continuidad', Icon: Activity },
      { label: 'Protocolos', to: '/prevencion', Icon: ShieldCheck },
      { label: 'Sala de coordinación', to: '/coordinacion', Icon: SlidersHorizontal },
    ],
  },
  {
    title: 'TRANSPARENCIA',
    items: [
      { label: 'Explicabilidad', to: '/explicabilidad', Icon: Compass },
      { label: 'Bitácora', to: '/bitacora', Icon: History },
      { label: 'Fuentes', to: '/fuentes', Icon: BookOpen },
    ],
  },
  {
    title: 'EXPERIENCIA',
    items: [
      { label: 'Mi comunidad', to: '/comunidad', Icon: Users },
      { label: 'Demo interactiva', to: '/demo', Icon: Play },
      { label: 'Configuración', to: '/configuracion', Icon: Settings },
    ],
  },
];

const ROUTE_TITLES: Record<string, { group: string; title: string }> = {
  '/': { group: 'General', title: 'Centro de control' },
  '/escenarios': { group: 'General', title: 'Laboratorio de escenarios' },
  '/mapa': { group: 'General', title: 'Explorador territorial' },
  '/dependencias': { group: 'Operaciones', title: 'Grafo de dependencias' },
  '/acciones': { group: 'Operaciones', title: 'Centro de acciones' },
  '/comunicaciones': { group: 'Operaciones', title: 'Comunicaciones y aprobación' },
  '/continuidad': { group: 'Operaciones', title: 'Continuidad operativa' },
  '/prevencion': { group: 'Operaciones', title: 'Prevención y protocolos' },
  '/coordinacion': { group: 'Operaciones', title: 'Sala de coordinación' },
  '/explicabilidad': { group: 'Transparencia', title: 'Explicabilidad' },
  '/bitacora': { group: 'Transparencia', title: 'Bitácora local' },
  '/fuentes': { group: 'Transparencia', title: 'Fuentes documentales' },
  '/comunidad': { group: 'Experiencia', title: 'Mi comunidad' },
  '/demo': { group: 'Experiencia', title: 'Simulación de continuidad operativa' },
  '/configuracion': { group: 'Experiencia', title: 'Configuración' },
};

export function AppShell({
  children,
  presentationMode = false,
}: {
  children: ReactNode;
  presentationMode?: boolean;
}) {
  const location = useLocation();
  const navigate = useNavigate();

  const theme = useNexoStore((s) => s.theme);
  const toggleTheme = useNexoStore((s) => s.toggleTheme);
  const reducedMotion = useNexoStore((s) => s.reducedMotion);
  const activeRole = useNexoStore((s) => s.activeRole);
  const setActiveRole = useNexoStore((s) => s.setActiveRole);
  const activeScenarioId = useNexoStore((s) => s.activeScenarioId);
  const scenarios = useNexoStore((s) => s.scenarios);
  const setCommandPaletteOpen = useNexoStore((s) => s.setCommandPaletteOpen);
  const toasts = useNexoStore((s) => s.toasts);
  const dismissToast = useNexoStore((s) => s.dismissToast);
  const simulatedOffline = useNexoStore((s) => s.simulatedOffline);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [browserOffline, setBrowserOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false,
  );

  useEffect(() => {
    const handleOnline = () => setBrowserOffline(false);
    const handleOffline = () => setBrowserOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    if (reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }
  }, [theme, reducedMotion]);

  const effectiveOffline = browserOffline || simulatedOffline;
  const routeInfo = ROUTE_TITLES[location.pathname] ?? {
    group: 'NEXO UNT',
    title: 'Centro de control',
  };
  const currentScenario = scenarios.find((s) => s.id === activeScenarioId);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex">
      {/* Desktop fixed 256px dark sidebar */}
      {!presentationMode && (
        <aside
        aria-label="Navegación principal"
        className="hidden lg:flex lg:flex-col lg:w-[256px] lg:fixed lg:inset-y-0 lg:left-0 bg-[var(--bg-sidebar)] text-[#F4F7F6] border-r border-white/8 z-30"
      >
        <div className="h-[64px] px-5 flex items-center gap-3 border-b border-white/8 shrink-0">
          <NexoLogo size={32} />
          <div className="min-w-0">
            <span className="font-display text-[16px] font-extrabold tracking-tight text-white block leading-tight">
              NEXO UNT
            </span>
            <span className="text-[11px] text-[#BDCCCF]/80 block truncate">
              Preparación y continuidad
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 pb-0.5 text-[11px] font-semibold text-[#BDCCCF]/60">
                {group.title.charAt(0) + group.title.slice(1).toLowerCase()}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(({ label, to, Icon }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={to === '/'}
                      className={({ isActive }) =>
                        `group flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[13px] font-medium transition-all duration-150 ${
                          isActive
                            ? 'bg-[#126A64] text-white font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]'
                            : 'text-[#BDCCCF] hover:bg-white/7 hover:text-white'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0 opacity-85 group-hover:opacity-100" aria-hidden="true" />
                      <span className="truncate">{label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="px-4 py-3.5 border-t border-white/8 text-[11px] text-[#BDCCCF]/85 space-y-0.5">
          <p className="font-semibold text-white/95">Simulación académica</p>
          <p className="leading-relaxed opacity-80">
            {PERMANENT_SIMULATION_DISCLAIMER}
          </p>
          </div>
        </aside>
      )}

      {/* Main Column */}
      <div className={`flex-1 flex flex-col min-w-0 ${presentationMode ? '' : 'lg:pl-[256px]'}`}>
        {presentationMode ? (
          <div className="px-4 py-2 bg-[#80263C] text-white text-xs font-medium text-center shrink-0">
            {PERMANENT_SIMULATION_DISCLAIMER} · Modo presentación
          </div>
        ) : (
          <div className="shrink-0">
            {/* Top Header */}
            <header className="lg:sticky lg:top-0 z-20 h-[60px] lg:h-[64px] bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-4 lg:px-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="lg:hidden flex items-center gap-2 shrink-0">
              <NexoLogo size={26} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                <span>{routeInfo.group}</span>
                <span aria-hidden="true">/</span>
                <span className="truncate">{currentScenario?.title ?? 'Escenario'}</span>
              </div>
              <h1 className="font-display text-[15px] md:text-[17px] font-bold tracking-tight text-[var(--text-primary)] truncate">
                {routeInfo.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Connection status */}
            <div
              title={
                effectiveOffline
                  ? 'Modo local sin conexión: motores deterministas activos'
                  : 'Conectividad disponible (operación local determinista)'
              }
              className="hidden xl:flex items-center gap-1.5 text-xs text-[var(--text-secondary)] px-2.5 py-1.5 rounded-[8px] bg-[var(--bg-surface-2)] whitespace-nowrap"
            >
              {effectiveOffline ? (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-[#A96A00]" aria-hidden="true" />
                  <span>Sin conexión</span>
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5 text-[#178353] dark:text-[#4AD196]" aria-hidden="true" />
                  <span>Motor local</span>
                </>
              )}
            </div>

            {/* Role Selector */}
            <div className="flex items-center">
              <label htmlFor="global-role-select" className="sr-only">
                Selector de rol de demostración
              </label>
              <select
                id="global-role-select"
                value={activeRole}
                onChange={(e) => {
                  const nextRole = e.target.value as Role;
                  setActiveRole(nextRole);
                  if (
                    (nextRole === 'ESTUDIANTE' || nextRole === 'DOCENTE') &&
                    location.pathname === '/coordinacion'
                  ) {
                    navigate('/comunidad');
                  }
                }}
                title="Rol de demostración (sin autenticación institucional real)"
                className="px-2.5 py-1.5 rounded-[10px] text-xs font-semibold bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] cursor-pointer max-w-[146px] sm:max-w-[230px]"
              >
                {(Object.keys(ROLE_META) as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_META[r].shortLabel} (Demo)
                  </option>
                ))}
              </select>
            </div>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
              className="p-2 rounded-[10px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)]/60 transition-colors cursor-pointer"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Sun className="w-4 h-4" aria-hidden="true" />
              )}
            </button>

            {/* Quick Search */}
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              aria-label="Abrir búsqueda rápida"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Search className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden md:inline">Buscar</span>
              <kbd className="hidden xl:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                ⌘K
              </kbd>
            </button>

            {/* Primary Scenario CTA */}
            {location.pathname !== '/demo' && (
              <button
                type="button"
                onClick={() => navigate('/demo')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white dark:text-[#08121A] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-[0.98]"
              >
                <Radio className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Iniciar escenario</span>
              </button>
            )}
          </div>
        </header>

        {/* Permanent discrete simulation notice */}
        <div className="px-4 lg:px-8 py-1.5 bg-[var(--bg-surface-2)]/70 border-b border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
          <span className="font-medium text-[#80263C] dark:text-[#E36D88]">
            {PERMANENT_SIMULATION_DISCLAIMER}
          </span>
          <span className="hidden sm:inline">
            Rol activo: <strong className="text-[var(--text-primary)]">{ROLE_META[activeRole].label}</strong> · Demostración sin autenticación institucional
          </span>
        </div>

            <OfflineBanner offline={effectiveOffline} />
          </div>
        )}

        {/* Main Viewport */}
        <main
          className={
            presentationMode
              ? 'flex-1 max-w-[1480px] w-full mx-auto p-4 md:p-6'
              : 'flex-1 w-full max-w-[1480px] mx-auto px-4 lg:px-8 py-6 pb-24 lg:pb-10'
          }
        >
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (compact, <15% viewport height) */}
      {!presentationMode && (
        <nav
          aria-label="Navegación móvil"
          className="lg:hidden fixed bottom-0 inset-x-0 z-30 h-[58px] bg-[var(--bg-surface)]/95 backdrop-blur-sm border-t border-[var(--border-subtle)] grid grid-cols-5 items-center px-1"
        >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              isActive ? 'text-[var(--accent-primary)] font-semibold' : 'text-[var(--text-secondary)]'
            }`
          }
        >
          <LayoutDashboard className="w-4 h-4" aria-hidden="true" />
          <span>Control</span>
        </NavLink>
        <NavLink
          to="/escenarios"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              isActive ? 'text-[var(--accent-primary)] font-semibold' : 'text-[var(--text-secondary)]'
            }`
          }
        >
          <Layers className="w-4 h-4" aria-hidden="true" />
          <span>Escenarios</span>
        </NavLink>
        <NavLink
          to="/comunidad"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              isActive ? 'text-[var(--accent-primary)] font-semibold' : 'text-[var(--text-secondary)]'
            }`
          }
        >
          <Users className="w-4 h-4" aria-hidden="true" />
          <span>Comunidad</span>
        </NavLink>
        <NavLink
          to="/demo"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
              isActive ? 'text-[var(--accent-primary)] font-semibold' : 'text-[var(--text-secondary)]'
            }`
          }
        >
          <Play className="w-4 h-4" aria-hidden="true" />
          <span>Demo 90s</span>
        </NavLink>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-[var(--text-secondary)] cursor-pointer"
        >
          <Menu className="w-4 h-4" aria-hidden="true" />
          <span>Módulos</span>
          </button>
        </nav>
      )}

      {/* Mobile Modules Drawer */}
      {!presentationMode && (
        <Drawer
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          title="Módulos NEXO UNT"
          subtitle={PERMANENT_SIMULATION_DISCLAIMER}
        >
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                setCommandPaletteOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-[10px] bg-[var(--bg-surface-2)] text-xs font-medium text-[var(--text-primary)] cursor-pointer"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              <span>Buscar en todo NEXO UNT</span>
            </button>

            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="space-y-1.5">
                <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  {group.title}
                </p>
                <div className="grid grid-cols-1 gap-1">
                  {group.items.map(({ label, to, Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === '/'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm font-medium ${
                          isActive
                            ? 'bg-[var(--accent-primary)] text-white dark:text-[#08121A]'
                            : 'bg-[var(--bg-surface-2)]/50 text-[var(--text-primary)]'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>{label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Drawer>
      )}

      {/* Global Overlays */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      <DecisionInspectorDrawer />
      <WhatIfDrawer />
      <CommandPalette />
    </div>
  );
}
