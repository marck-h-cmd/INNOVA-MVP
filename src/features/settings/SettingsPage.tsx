import { Download, HelpCircle, RotateCcw, Shield } from 'lucide-react';
import { useNexoStore } from '../../store/useNexoStore';
import { PERMANENT_SIMULATION_DISCLAIMER } from '../../data/seedData';
import { PageHeader } from '../../components/ui/PageHeader';

export default function SettingsPage() {
  const theme = useNexoStore((s) => s.theme);
  const setTheme = useNexoStore((s) => s.setTheme);
  const reducedMotion = useNexoStore((s) => s.reducedMotion);
  const setReducedMotion = useNexoStore((s) => s.setReducedMotion);
  const simulatedOffline = useNexoStore((s) => s.simulatedOffline);
  const setSimulatedOffline = useNexoStore((s) => s.setSimulatedOffline);
  const resetAllData = useNexoStore((s) => s.resetAllData);
  const exportFullStateJson = useNexoStore((s) => s.exportFullStateJson);
  const pushToast = useNexoStore((s) => s.pushToast);

  const handleExportState = () => {
    const content = exportFullStateJson();
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexo-unt-estado-local.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    pushToast({
      title: 'Estado local exportado',
      description: 'Archivo JSON descargado correctamente.',
      tone: 'success',
    });
  };

  const handleReset = () => {
    resetAllData();
    pushToast({
      title: 'Datos restablecidos',
      description: 'El escenario, acciones y bitácora volvieron a su estado inicial.',
      tone: 'info',
    });
  };

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        kicker="Preferencias y ética"
        title="Configuración, privacidad y créditos"
        description="Preferencias de accesibilidad, persistencia local segura y transparencia del prototipo académico."
      />

      {/* Preferences */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-3">
        <h3 className="text-base font-bold text-[var(--text-primary)] pb-2 border-b border-[var(--border-subtle)]">
          Preferencias de interfaz y demostración
        </h3>

        <div className="divide-y divide-[var(--border-subtle)]">
          <div className="py-3.5 first:pt-1 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Tema visual</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Paleta institucional de alto contraste en modo claro u oscuro.
              </p>
            </div>
            <div className="inline-flex items-center p-1 rounded-[10px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] shrink-0">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`px-3 py-1.5 rounded-[7px] text-xs font-semibold transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Claro
              </button>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`px-3 py-1.5 rounded-[7px] text-xs font-semibold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Oscuro
              </button>
            </div>
          </div>

          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Reducir animaciones
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Desactiva transiciones del grafo y paneles para accesibilidad visual.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={reducedMotion}
              onClick={() => setReducedMotion(!reducedMotion)}
              className={`px-3.5 min-h-[38px] rounded-[9px] text-xs font-semibold transition-all active:scale-[0.98] shrink-0 cursor-pointer ${
                reducedMotion
                  ? 'bg-[var(--accent-primary)] text-white dark:text-[#08121A]'
                  : 'bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)]'
              }`}
            >
              {reducedMotion ? 'Activado' : 'Desactivado'}
            </button>
          </div>

          <div className="py-3.5 last:pb-1 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Simular modo sin conexión
              </p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                Demuestra que el motor determinista, reglas, continuidad y explicabilidad operan sin internet.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={simulatedOffline}
              onClick={() => setSimulatedOffline(!simulatedOffline)}
              className={`px-3.5 min-h-[38px] rounded-[9px] text-xs font-semibold transition-all active:scale-[0.98] shrink-0 cursor-pointer ${
                simulatedOffline
                  ? 'bg-[#A96A00] text-white'
                  : 'bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)]'
              }`}
            >
              {simulatedOffline ? 'Sin conexión (sim.)' : 'Normal'}
            </button>
          </div>
        </div>
      </section>

      {/* Local data controls */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-3">
        <h3 className="text-base font-bold text-[var(--text-primary)]">
          Estado local y respaldo
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Los cambios se guardan localmente en <code className="font-mono">localStorage</code> con validación de esquema Zod. Puede exportar o restablecer los datos en cualquier momento.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={handleExportState}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-semibold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white dark:text-[#08121A] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Exportar estado local (JSON)</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-xs font-semibold bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--border-subtle)] active:scale-[0.98] transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Restablecer datos iniciales</span>
          </button>
        </div>
      </section>

      {/* Privacy & Ethics */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-3">
        <div className="flex items-center gap-2 text-base font-bold text-[var(--text-primary)]">
          <Shield className="w-4 h-4 text-[var(--accent-primary)]" aria-hidden="true" />
          <span>Privacidad, ética y limitaciones</span>
        </div>
        <ul className="divide-y divide-[var(--border-subtle)] text-xs text-[var(--text-secondary)] leading-relaxed">
          <li className="py-2 first:pt-0">{PERMANENT_SIMULATION_DISCLAIMER}</li>
          <li className="py-2">No almacena ni procesa datos personales reales de estudiantes o personal de la UNT.</li>
          <li className="py-2">Los roles son selectores demostrativos y no representan autenticación institucional.</li>
          <li className="py-2 last:pb-0">No envía SMS, correos electrónicos ni alertas externas reales.</li>
        </ul>
      </section>

      {/* Credits & Help unified strip */}
      <section className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--border-subtle)] overflow-hidden">
        <div className="p-5 space-y-2">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            Créditos y licencias
          </h3>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Construido con React, TypeScript, Tailwind CSS, Zustand, Recharts, Framer Motion, Lucide, Zod y Leaflet. Cartografía pública con atribución de OpenStreetMap contributors.
          </p>
        </div>

        <div className="p-5 space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-primary)]">
            <HelpCircle className="w-4 h-4 text-[var(--accent-primary)]" aria-hidden="true" />
            <span>Ayuda rápida para evaluación</span>
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Para recorrer el flujo completo de 90 segundos frente al jurado, utilice la pantalla &quot;Demo interactiva&quot; desde el menú o el botón &quot;Iniciar escenario&quot; en la cabecera.
          </p>
        </div>
      </section>
    </div>
  );
}
