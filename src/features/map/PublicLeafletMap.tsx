import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, Maximize2, Minimize2, Navigation } from 'lucide-react';
import { useDerivedNexo } from '../../hooks/useDerivedNexo';
import { useNexoStore } from '../../store/useNexoStore';
import { SOURCES } from '../../data/seedData';
import { StatusBadge } from '../../components/ui/StatusBadge';

const TRUJILLO_COORDS: [number, number] = [-8.1116, -79.0288];
const UNT_REF_COORDS: [number, number] = [-8.1149, -79.0384];

interface PublicLeafletMapProps {
  onSwitchToPlan?: () => void;
}

export function PublicLeafletMap({ onSwitchToPlan }: PublicLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [focusLabel, setFocusLabel] = useState<'UNT' | 'TRUJILLO'>('UNT');
  const [fullscreen, setFullscreen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const scenarios = useNexoStore((s) => s.scenarios);
  const selectScenario = useNexoStore((s) => s.selectScenario);
  const { activeScenario, riskIndex, dependencyGraph } = useDerivedNexo();

  const linkedSources = SOURCES.filter(
    (s) => activeScenario.sourceIds.includes(s.id) || s.id === 'SRC-OSM',
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: UNT_REF_COORDS,
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Reference marker ONLY (no danger zones, no hazard levels, no invented campus buildings)
    const refIcon = L.divIcon({
      className: 'nexo-osm-ref-marker',
      html: `<div style="width:16px;height:16px;border-radius:9999px;background:#126A64;border:3px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    const marker = L.marker(UNT_REF_COORDS, { icon: refIcon }).addTo(map);
    markerRef.current = marker;
    mapRef.current = map;

    return () => {
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!markerRef.current) return;
    markerRef.current.bindPopup(
      `<strong>Ciudad Universitaria (Referencia geográfica)</strong><br/><span style="font-size:12px;">Contexto urbano en Trujillo · Escenario simulado ${activeScenario.id} (${riskIndex.score}/100). Sin capas oficiales de peligro ni rutas de la UNT.</span>`,
    );
  }, [activeScenario.id, riskIndex.score]);

  const handleFocus = (target: 'UNT' | 'TRUJILLO') => {
    setFocusLabel(target);
    if (!mapRef.current) return;
    if (target === 'UNT') {
      mapRef.current.flyTo(UNT_REF_COORDS, 15, { duration: 0.6 });
    } else {
      mapRef.current.flyTo(TRUJILLO_COORDS, 13, { duration: 0.6 });
    }
  };

  const handleVisualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchText.trim().toLowerCase();
    if (!q) return;
    if (q.includes('ciudad') || q.includes('unt') || q.includes('universitaria')) {
      handleFocus('UNT');
    } else {
      handleFocus('TRUJILLO');
    }
  };

  return (
    <div
      className={`space-y-4 ${
        fullscreen
          ? 'fixed inset-0 z-50 bg-[var(--bg-canvas)] p-4 md:p-6 overflow-y-auto'
          : ''
      }`}
    >
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-3.5">
        <form onSubmit={handleVisualSearch} className="flex items-center gap-2 flex-1 min-w-[220px]">
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Enfocar referencia (ej. Ciudad Universitaria o Trujillo)..."
            aria-label="Buscar referencia en mapa público"
            className="flex-1 px-3 py-1.5 rounded-[8px] bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--bg-surface-2)] hover:bg-[var(--border-subtle)] cursor-pointer"
          >
            Ubicar
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleFocus('UNT')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-xs font-semibold cursor-pointer ${
              focusLabel === 'UNT'
                ? 'bg-[var(--accent-primary)] text-white dark:text-[#08121A]'
                : 'bg-[var(--bg-surface-2)] text-[var(--text-primary)]'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ciudad Universitaria</span>
          </button>
          <button
            type="button"
            onClick={() => handleFocus('TRUJILLO')}
            className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold cursor-pointer ${
              focusLabel === 'TRUJILLO'
                ? 'bg-[var(--accent-primary)] text-white dark:text-[#08121A]'
                : 'bg-[var(--bg-surface-2)] text-[var(--text-primary)]'
            }`}
          >
            Trujillo contexto
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((v) => !v)}
            aria-label={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            className="p-2 rounded-[8px] bg-[var(--bg-surface-2)] text-[var(--text-primary)] cursor-pointer"
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 rounded-[14px] overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]">
          <div
            ref={containerRef}
            className={fullscreen ? 'w-full h-[72vh]' : 'w-full h-[460px]'}
          />
        </div>

        <aside className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-4 space-y-4">
          <div className="space-y-1.5 pb-3 border-b border-[var(--border-subtle)]">
            <p className="text-xs font-semibold text-[var(--accent-primary)]">
              Referencia geográfica pública (sin capas oficiales inventadas)
            </p>
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Ciudad Universitaria — Trujillo
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Contexto urbano referencial en Trujillo, La Libertad. Este mapa público no dibuja zonas de peligro, aforos ni rutas oficiales de evacuación de la UNT.
            </p>
          </div>

          {/* Active scenario context synced without inventing real geometry */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="osm-scenario-select"
                className="text-xs font-semibold text-[var(--text-secondary)]"
              >
                Contexto de ejercicio activo
              </label>
              <StatusBadge status={riskIndex.level} />
            </div>
            <select
              id="osm-scenario-select"
              value={activeScenario.id}
              onChange={(e) => selectScenario(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] cursor-pointer"
            >
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.id} · {sc.title}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="rounded-[8px] bg-[var(--bg-surface-2)]/60 px-2.5 py-2">
                <span className="text-[11px] text-[var(--text-secondary)] block">Índice simulado</span>
                <strong className="font-mono tabular-nums text-[var(--text-primary)]">
                  {riskIndex.score}/100 ({riskIndex.label})
                </strong>
              </div>
              <div className="rounded-[8px] bg-[var(--bg-surface-2)]/60 px-2.5 py-2">
                <span className="text-[11px] text-[var(--text-secondary)] block">Parámetros sim.</span>
                <strong className="font-mono tabular-nums text-[var(--text-primary)]">
                  Lluvia {activeScenario.inputs.rainIntensity}% · Acc. {activeScenario.inputs.accessRestriction}%
                </strong>
              </div>
            </div>

            {dependencyGraph.servicesRequiringVerification.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
                  Servicios por verificar en {activeScenario.id} ({dependencyGraph.servicesRequiringVerification.length})
                </p>
                <div className="space-y-1">
                  {dependencyGraph.servicesRequiringVerification.slice(0, 4).map((node) => (
                    <div
                      key={node.service.id}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-[var(--text-primary)] truncate">
                        {node.service.name}
                      </span>
                      <StatusBadge status={node.effectiveStatus} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Documentary sources associated with the active scenario */}
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2">
            <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
              Fuentes documentales vinculadas al escenario
            </h4>
            <ul className="space-y-1.5">
              {linkedSources.map((src) => (
                <li key={src.id} className="text-xs">
                  {src.url.startsWith('http') ? (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[var(--accent-primary)] hover:underline font-medium"
                    >
                      <span>{src.institution} · {src.id}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                    </a>
                  ) : (
                    <span className="text-[var(--text-secondary)]">
                      {src.title} ({src.id})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {onSwitchToPlan && (
            <div className="pt-3 border-t border-[var(--border-subtle)]">
              <button
                type="button"
                onClick={onSwitchToPlan}
                className="w-full px-3 py-2 rounded-[9px] text-xs font-semibold bg-[var(--accent-primary)] text-white dark:text-[#08121A] hover:bg-[var(--accent-primary-hover)] transition-colors cursor-pointer"
              >
                Abrir plano didáctico (Ficticio)
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
