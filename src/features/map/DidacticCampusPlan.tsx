import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CloudRain, RotateCcw, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useNexoStore } from '../../store/useNexoStore';
import { useDerivedNexo } from '../../hooks/useDerivedNexo';
import {
  CONTINUITY_ACTIVITIES,
  DIDACTIC_ROUTES,
  FACILITIES,
  MEETING_POINTS,
  ROUTE_SEGMENTS,
} from '../../data/seedData';
import {
  deriveScenarioSegmentConditions,
  findDidacticPath,
} from '../../lib/engines/routeGraph';
import { ServiceStatus } from '../../types/domain';
import { StatusBadge } from '../../components/ui/StatusBadge';

type MapLayerKey =
  | 'INSTALACIONES'
  | 'SERVICIOS'
  | 'ATENCION'
  | 'RUTAS'
  | 'DEPENDENCIAS';

type InspectorTarget =
  | { type: 'FACILITY'; id: string }
  | { type: 'MEETING_POINT'; id: string }
  | { type: 'SEGMENT'; id: string }
  | { type: 'DEPENDENCY'; edgeId: string; fromName: string; toName: string };

const NODE_COORDS: Record<string, { x: number; y: number; label: string }> = {
  'ACC-1': { x: 85, y: 42, label: 'Acceso 1 (Norte)' },
  'ACC-2': { x: 45, y: 270, label: 'Acceso 2 (Oeste)' },
  'ACC-3': { x: 75, y: 430, label: 'Acceso 3 (Sur)' },
  'ED-01': { x: 190, y: 130, label: 'Edificio Demo A' },
  'ED-02': { x: 407, y: 132, label: 'Laboratorio Demo B' },
  'ED-03': { x: 307, y: 270, label: 'Biblioteca Demo C' },
  'ED-04': { x: 537, y: 267, label: 'Administración Demo D' },
  'ED-05': { x: 190, y: 390, label: 'Aula Demo E' },
  'PF-01': { x: 280, y: 52, label: 'PF-01' },
  'PF-02': { x: 420, y: 415, label: 'PF-02' },
};

const SERVICE_SHORT_CODE: Record<string, string> = {
  'SRV-01': 'EL',
  'SRV-02': 'AG',
  'SRV-03': 'CO',
  'SRV-04': 'AC',
  'SRV-05': 'ACA',
  'SRV-06': 'ADM',
};

const STATUS_SYMBOL: Record<ServiceStatus, string> = {
  OPERATIVO: 'OK',
  EN_OBSERVACION: 'OBS',
  LIMITADO: 'LIM',
  NO_DISPONIBLE: 'NO',
  SIN_CONFIRMAR: '?',
};

function statusAccentColor(status: ServiceStatus, requiresVerification = false): string {
  if (status === 'NO_DISPONIBLE') return '#B62C49';
  if (status === 'LIMITADO') return '#C25B2B';
  if (status === 'EN_OBSERVACION' || status === 'SIN_CONFIRMAR' || requiresVerification) {
    return '#A96A00';
  }
  return '#178353';
}

export function DidacticCampusPlan() {
  const scenarios = useNexoStore((s) => s.scenarios);
  const selectScenario = useNexoStore((s) => s.selectScenario);
  const blockedSegmentIds = useNexoStore((s) => s.blockedSegmentIds);
  const toggleBlockedSegment = useNexoStore((s) => s.toggleBlockedSegment);
  const clearBlockedSegments = useNexoStore((s) => s.clearBlockedSegments);

  const {
    activeScenario,
    dependencyGraph,
    riskIndex,
    continuity,
    scenarioActions,
    permissions,
  } = useDerivedNexo();

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('ED-02');
  const [inspectorTarget, setInspectorTarget] = useState<InspectorTarget>({
    type: 'FACILITY',
    id: 'ED-02',
  });
  const [selectedOrigin, setSelectedOrigin] = useState<string>('ACC-1');
  const [layers, setLayers] = useState<Record<MapLayerKey, boolean>>({
    INSTALACIONES: true,
    SERVICIOS: true,
    ATENCION: true,
    RUTAS: true,
    DEPENDENCIAS: false,
  });

  const toggleLayer = (key: MapLayerKey) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  // Scenario-derived segment conditions (rain >= 65%, SRV-04 Accesos degraded/out)
  const scenarioConditions = useMemo(
    () => deriveScenarioSegmentConditions(activeScenario, dependencyGraph, ROUTE_SEGMENTS),
    [activeScenario, dependencyGraph],
  );

  const scenarioBlockedSegmentIds = useMemo(
    () =>
      Object.values(scenarioConditions)
        .filter((c) => c.severity === 'BLOQUEADO_ESCENARIO')
        .map((c) => c.segmentId),
    [scenarioConditions],
  );

  const effectiveBlockedIds = useMemo(
    () => Array.from(new Set([...blockedSegmentIds, ...scenarioBlockedSegmentIds])),
    [blockedSegmentIds, scenarioBlockedSegmentIds],
  );

  const recalculatedRoute = useMemo(
    () =>
      findDidacticPath(
        selectedOrigin,
        ['PF-01', 'PF-02'],
        ROUTE_SEGMENTS,
        effectiveBlockedIds,
      ),
    [selectedOrigin, effectiveBlockedIds],
  );

  const activeTargetMeetingPointId = recalculatedRoute.reachable
    ? recalculatedRoute.nodePath[recalculatedRoute.nodePath.length - 1]
    : null;

  const selectedFacility =
    FACILITIES.find((f) => f.id === selectedFacilityId) ?? FACILITIES[0];

  const facilityActivityIds = useMemo(
    () =>
      new Set(
        CONTINUITY_ACTIVITIES.filter((a) => a.facilityId === selectedFacility.id).map(
          (a) => a.id,
        ),
      ),
    [selectedFacility.id],
  );

  const facilityActivities = continuity.plans.filter((p) =>
    facilityActivityIds.has(p.activityId),
  );

  const facilityActions = scenarioActions.filter((a) =>
    selectedFacility.serviceIds.includes(a.serviceId),
  );

  // Derive facility-level dependency links dynamically from dependencyGraph.edges
  const facilityDependencyLinks = useMemo(() => {
    const linkMap = new Map<
      string,
      {
        key: string;
        edgeId: string;
        fromName: string;
        toName: string;
        from: { x: number; y: number };
        to: { x: number; y: number };
        cx: number;
        cy: number;
        active: boolean;
        label: string;
      }
    >();

    for (const edge of dependencyGraph.edges) {
      const sourceFacilities = FACILITIES.filter((f) =>
        f.serviceIds.includes(edge.dependency.sourceServiceId),
      );
      const targetFacilities = FACILITIES.filter((f) =>
        f.serviceIds.includes(edge.dependency.targetServiceId),
      );

      for (const sf of sourceFacilities) {
        for (const tf of targetFacilities) {
          if (sf.id === tf.id) continue;
          const pairKey = [sf.id, tf.id].sort().join('::');
          const p1 = NODE_COORDS[sf.id];
          const p2 = NODE_COORDS[tf.id];
          if (!p1 || !p2) continue;
          const existing = linkMap.get(pairKey);
          if (existing) {
            if (edge.isActivePropagation) {
              existing.active = true;
              existing.edgeId = edge.dependency.id;
            }
          } else {
            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2;
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const norm = Math.hypot(dx, dy) || 1;
            const curveOffset = 22;
            linkMap.set(pairKey, {
              key: pairKey,
              edgeId: edge.dependency.id,
              fromName: sf.name,
              toName: tf.name,
              from: p1,
              to: p2,
              cx: mx - (dy / norm) * curveOffset,
              cy: my + (dx / norm) * curveOffset,
              active: edge.isActivePropagation,
              label: `${sf.name} ↔ ${tf.name} (${edge.dependency.id})`,
            });
          }
        }
      }
    }
    return Array.from(linkMap.values());
  }, [dependencyGraph.edges]);

  const getFacilityColor = (serviceIds: string[]) => {
    const statuses = serviceIds.map(
      (id) => dependencyGraph.nodes[id]?.effectiveStatus ?? 'OPERATIVO',
    );
    if (statuses.includes('NO_DISPONIBLE')) return '#B62C49';
    if (statuses.includes('LIMITADO')) return '#C25B2B';
    if (
      statuses.includes('EN_OBSERVACION') ||
      statuses.includes('SIN_CONFIRMAR') ||
      serviceIds.some((id) => dependencyGraph.nodes[id]?.requiresVerification)
    ) {
      return '#A96A00';
    }
    return '#178353';
  };

  const accessStatus: ServiceStatus =
    dependencyGraph.nodes['SRV-04']?.effectiveStatus ?? 'OPERATIVO';
  const accessColor = statusAccentColor(
    accessStatus,
    dependencyGraph.nodes['SRV-04']?.requiresVerification,
  );
  const rainIntensity = activeScenario.inputs.rainIntensity;
  const activeConditionList = Object.values(scenarioConditions);

  const inspectedMeetingPoint =
    inspectorTarget.type === 'MEETING_POINT'
      ? MEETING_POINTS.find((mp) => mp.id === inspectorTarget.id) ?? null
      : null;

  const inspectedSegment =
    inspectorTarget.type === 'SEGMENT'
      ? ROUTE_SEGMENTS.find((s) => s.id === inspectorTarget.id) ?? null
      : null;

  const inspectedDependency =
    inspectorTarget.type === 'DEPENDENCY'
      ? dependencyGraph.edges.find((e) => e.dependency.id === inspectorTarget.edgeId) ?? null
      : null;

  const routeStateLabel = !recalculatedRoute.reachable
    ? 'Sin conexión disponible'
    : scenarioBlockedSegmentIds.length > 0 && blockedSegmentIds.length === 0
      ? 'Recalculada por escenario'
      : recalculatedRoute.rerouted
        ? 'Recalculada por bloqueo'
        : 'Óptima en simulación';

  return (
    <div className="space-y-4">
      {/* Permanent fictional plan disclaimer + Live scenario sync bar */}
      <div className="rounded-[12px] border border-[#80263C]/35 bg-[#FBE9ED] dark:bg-[#B62C49]/20 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-[#80263C] dark:text-[#F2728C]">
        <span className="inline-flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>Plano ficticio. No representa rutas ni zonas seguras oficiales de la UNT.</span>
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-[11px] tabular-nums">
            Índice: {riskIndex.score}/100 ({riskIndex.label}) · Lluvia sim. {rainIntensity}%
          </span>
          <label htmlFor="plan-scenario-select" className="sr-only">
            Escenario activo en plano ficticio
          </label>
          <select
            id="plan-scenario-select"
            value={activeScenario.id}
            onChange={(e) => selectScenario(e.target.value)}
            className="px-2.5 py-1 rounded-[8px] text-[11px] font-semibold bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] cursor-pointer"
          >
            {scenarios.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.id} · {sc.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Layer Controls & Route Origin */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Capas:</span>
          {(
            [
              ['INSTALACIONES', 'Instalaciones'],
              ['SERVICIOS', 'Estado de servicios'],
              ['ATENCION', 'Atención operativa'],
              ['RUTAS', 'Rutas didácticas'],
              ['DEPENDENCIAS', 'Dependencias'],
            ] as [MapLayerKey, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={layers[key]}
              onClick={() => toggleLayer(key)}
              className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                layers[key]
                  ? 'bg-[var(--accent-primary)] text-white dark:text-[#08121A] border-[var(--accent-primary)]'
                  : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label
            htmlFor="route-origin-select"
            className="text-xs font-semibold text-[var(--text-secondary)]"
          >
            Origen ruta didáctica:
          </label>
          <select
            id="route-origin-select"
            value={selectedOrigin}
            onChange={(e) => setSelectedOrigin(e.target.value)}
            className="px-2.5 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] text-[var(--text-primary)] cursor-pointer"
          >
            <option value="ACC-1">Acceso 1 (Norte)</option>
            <option value="ACC-2">Acceso 2 (Oeste)</option>
            <option value="ACC-3">Acceso 3 (Sur)</option>
            {FACILITIES.map((fac) => (
              <option key={fac.id} value={fac.id}>
                {fac.name} ({fac.code})
              </option>
            ))}
          </select>
          {blockedSegmentIds.length > 0 && (
            <button
              type="button"
              disabled={!permissions.canBlockDidacticRoute}
              onClick={clearBlockedSegments}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-xs font-semibold bg-[var(--bg-surface-2)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Desbloquear tramos</span>
            </button>
          )}
        </div>
      </div>

      {/* SVG Map + Explanation Side Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-4 space-y-3">
          <div className="w-full overflow-x-auto">
            <svg
              viewBox="0 0 660 470"
              className="w-full min-w-[540px] h-auto rounded-[12px] bg-[#EDF1F0] dark:bg-[#0E1A24]"
              role="group"
              aria-label="Plano didáctico de campus ficticio con 5 edificios, 3 accesos y 2 puntos de encuentro"
            >
              <defs>
                <pattern
                  id="campus-blueprint-grid"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 24 0 L 0 0 0 24"
                    fill="none"
                    stroke="var(--border-subtle)"
                    strokeWidth="0.7"
                    strokeOpacity="0.65"
                  />
                </pattern>
                <marker
                  id="plan-dep-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="5"
                  markerHeight="5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#B62C49" />
                </marker>
              </defs>
              <rect width="660" height="470" fill="url(#campus-blueprint-grid)" />

              {/* Subtle fictional sector annotations */}
              <text x="16" y="20" fontSize="9" fontWeight="600" fill="var(--text-secondary)" opacity="0.75">
                Plano esquemático ficticio · Escenario {activeScenario.id}
              </text>

              {/* Fictional Green Areas (react visually to rainIntensity >= 65%) */}
              <rect
                x="260"
                y="95"
                width="60"
                height="105"
                rx="14"
                fill={rainIntensity >= 65 ? '#2B7A9B' : '#178353'}
                fillOpacity={rainIntensity >= 65 ? '0.18' : '0.14'}
                stroke={rainIntensity >= 65 ? '#2B7A9B' : 'none'}
                strokeOpacity="0.45"
                strokeDasharray="4 3"
              />
              <rect
                x="435"
                y="340"
                width="150"
                height="75"
                rx="16"
                fill={rainIntensity >= 65 ? '#2B7A9B' : '#178353'}
                fillOpacity={rainIntensity >= 65 ? '0.18' : '0.14'}
                stroke={rainIntensity >= 65 ? '#2B7A9B' : 'none'}
                strokeOpacity="0.45"
                strokeDasharray="4 3"
              />
              <text
                x="290"
                y="186"
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill={rainIntensity >= 65 ? '#2B7A9B' : '#178353'}
              >
                {rainIntensity >= 65 ? `Drenaje (${rainIntensity}%)` : 'Área verde (sim.)'}
              </text>

              {/* Internal Fictional Walkways */}
              <path
                d="M 85 42 L 190 130 L 307 270 L 407 132 M 45 270 L 307 270 L 537 267 L 420 415 M 75 430 L 190 390 L 307 270 M 190 390 L 420 415"
                stroke="#9AA9AE"
                strokeOpacity="0.4"
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
              />

              {/* Route Segments (Clickable to Inspect or Block / Unblock) */}
              {layers.RUTAS &&
                ROUTE_SEGMENTS.map((seg) => {
                  const p1 = NODE_COORDS[seg.from];
                  const p2 = NODE_COORDS[seg.to];
                  if (!p1 || !p2) return null;

                  const isManualBlocked = blockedSegmentIds.includes(seg.id);
                  const scenarioCond = scenarioConditions[seg.id];
                  const isScenarioBlocked = scenarioCond?.severity === 'BLOQUEADO_ESCENARIO';
                  const isScenarioCaution = scenarioCond?.severity === 'PRECAUCION_ESCENARIO';
                  const isActivePath = recalculatedRoute.segmentIds.includes(seg.id);
                  const isSelectedSeg =
                    inspectorTarget.type === 'SEGMENT' && inspectorTarget.id === seg.id;

                  const badgeT =
                    seg.to === 'PF-01' ? 0.64 : seg.from === 'PF-01' ? 0.36 : 0.5;
                  const midX = p1.x + (p2.x - p1.x) * badgeT;
                  const midY = p1.y + (p2.y - p1.y) * badgeT;

                  const strokeColor = isManualBlocked || isScenarioBlocked
                    ? '#B62C49'
                    : isActivePath
                      ? '#126A64'
                      : isScenarioCaution
                        ? '#A96A00'
                        : '#6D7D84';

                  return (
                    <g
                      key={seg.id}
                      onClick={() => {
                        setInspectorTarget({ type: 'SEGMENT', id: seg.id });
                        if (permissions.canBlockDidacticRoute && !isScenarioBlocked) {
                          toggleBlockedSegment(seg.id);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${seg.label}: ${
                        isScenarioBlocked
                          ? 'restringido por escenario'
                          : isManualBlocked
                            ? 'bloqueado manualmente'
                            : isActivePath
                              ? 'parte de la ruta activa'
                              : 'tramo habilitado'
                      }`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setInspectorTarget({ type: 'SEGMENT', id: seg.id });
                          if (permissions.canBlockDidacticRoute && !isScenarioBlocked) {
                            toggleBlockedSegment(seg.id);
                          }
                        }
                      }}
                      className={
                        permissions.canBlockDidacticRoute && !isScenarioBlocked
                          ? 'cursor-pointer focus:outline-none'
                          : 'cursor-pointer focus:outline-none'
                      }
                    >
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="transparent"
                        strokeWidth={18}
                        strokeLinecap="round"
                      />
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke={strokeColor}
                        strokeWidth={
                          isSelectedSeg
                            ? 5.5
                            : isActivePath
                              ? 4.5
                              : isManualBlocked || isScenarioBlocked
                                ? 3.2
                                : 2.2
                        }
                        strokeDasharray={
                          isManualBlocked || isScenarioBlocked
                            ? '6 5'
                            : isScenarioCaution
                              ? '4 4'
                              : undefined
                        }
                        strokeLinecap="round"
                      />

                      {/* Animated flow overlay on active recalculated route */}
                      {isActivePath && !isManualBlocked && !isScenarioBlocked && (
                        <line
                          x1={p1.x}
                          y1={p1.y}
                          x2={p2.x}
                          y2={p2.y}
                          stroke="#75D5C4"
                          strokeWidth={2.5}
                          strokeDasharray="6 10"
                          strokeLinecap="round"
                          className="nexo-animated-flow pointer-events-none"
                        />
                      )}

                      {/* Midpoint distance / restriction badge */}
                      {(isActivePath || isManualBlocked || isScenarioBlocked) && (
                        <g transform={`translate(${midX}, ${midY})`} className="pointer-events-none">
                          <rect
                            x="-16"
                            y="-8"
                            width="32"
                            height="15"
                            rx="4"
                            fill="var(--bg-surface)"
                            stroke={strokeColor}
                            strokeWidth="1"
                          />
                          <text
                            x="0"
                            y="2.5"
                            textAnchor="middle"
                            fontSize="8"
                            fontWeight="700"
                            fill={strokeColor}
                            className="font-mono"
                          >
                            {isManualBlocked || isScenarioBlocked
                              ? 'BLOQ'
                              : `${seg.distanceMetersSimulated}m`}
                          </text>
                        </g>
                      )}

                      <title>
                        {`${seg.label} (${
                          isScenarioBlocked
                            ? `Restringido por escenario: ${scenarioCond.triggeredBy}`
                            : isManualBlocked
                              ? 'Bloqueado manualmente - clic para habilitar'
                              : isScenarioCaution
                                ? `Precaución: ${scenarioCond.triggeredBy}`
                                : 'Clic para bloquear o inspeccionar tramo'
                        })`}
                      </title>
                    </g>
                  );
                })}

              {/* Dynamic Curved Dependency Overlay between facilities (clickable) */}
              {layers.DEPENDENCIAS && (
                <g opacity="0.92">
                  {facilityDependencyLinks.map((link) => {
                    const pathD = `M ${link.from.x} ${link.from.y} Q ${link.cx} ${link.cy} ${link.to.x} ${link.to.y}`;
                    const isSelectedDep =
                      inspectorTarget.type === 'DEPENDENCY' &&
                      inspectorTarget.edgeId === link.edgeId &&
                      inspectorTarget.fromName === link.fromName &&
                      inspectorTarget.toName === link.toName;
                    return (
                      <g
                        key={link.key}
                        onClick={() =>
                          setInspectorTarget({
                            type: 'DEPENDENCY',
                            edgeId: link.edgeId,
                            fromName: link.fromName,
                            toName: link.toName,
                          })
                        }
                        role="button"
                        tabIndex={0}
                        aria-label={`Inspeccionar dependencia ${link.label}`}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setInspectorTarget({
                              type: 'DEPENDENCY',
                              edgeId: link.edgeId,
                              fromName: link.fromName,
                              toName: link.toName,
                            });
                          }
                        }}
                        className="cursor-pointer focus:outline-none"
                      >
                        <path d={pathD} fill="none" stroke="transparent" strokeWidth={14} />
                        <path
                          d={pathD}
                          fill="none"
                          stroke={
                            isSelectedDep
                              ? 'var(--accent-primary)'
                              : link.active
                                ? '#B62C49'
                                : '#B78331'
                          }
                          strokeWidth={isSelectedDep ? 3 : link.active ? 2.4 : 1.5}
                          strokeOpacity={isSelectedDep || link.active ? 0.95 : 0.5}
                          strokeDasharray="5 4"
                          markerEnd={link.active ? 'url(#plan-dep-arrow)' : undefined}
                        >
                          <title>{link.label}</title>
                        </path>
                        {link.active && (
                          <path
                            d={pathD}
                            fill="none"
                            stroke="#F2728C"
                            strokeWidth="2"
                            strokeDasharray="5 11"
                            strokeLinecap="round"
                            className="nexo-animated-flow pointer-events-none"
                          />
                        )}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* 5 Fictional Buildings */}
              {layers.INSTALACIONES &&
                FACILITIES.map((fac) => {
                  const accent = layers.SERVICIOS
                    ? getFacilityColor(fac.serviceIds)
                    : '#126A64';
                  const isSelected =
                    selectedFacilityId === fac.id && inspectorTarget.type === 'FACILITY';
                  const isOriginFac = selectedOrigin === fac.id;

                  const verifyCount = fac.serviceIds.filter(
                    (id) => dependencyGraph.nodes[id]?.requiresVerification,
                  ).length;

                  const facActCount = continuity.plans.filter((p) => {
                    const act = CONTINUITY_ACTIVITIES.find((a) => a.id === p.activityId);
                    return act?.facilityId === fac.id && p.status !== 'NORMAL';
                  }).length;

                  return (
                    <g
                      key={fac.id}
                      onClick={() => {
                        setSelectedFacilityId(fac.id);
                        setInspectorTarget({ type: 'FACILITY', id: fac.id });
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Seleccionar ${fac.name}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedFacilityId(fac.id);
                          setInspectorTarget({ type: 'FACILITY', id: fac.id });
                        }
                      }}
                      className="cursor-pointer focus:outline-none"
                    >
                      {isSelected && (
                        <rect
                          x={fac.x - 4}
                          y={fac.y - 4}
                          width={fac.width + 8}
                          height={fac.height + 8}
                          rx="13"
                          fill="none"
                          stroke="var(--accent-primary)"
                          strokeOpacity="0.4"
                          strokeWidth="2.5"
                        />
                      )}

                      <rect
                        x={fac.x}
                        y={fac.y}
                        width={fac.width}
                        height={fac.height}
                        rx="10"
                        fill="var(--bg-surface)"
                        stroke={isSelected ? 'var(--accent-primary)' : accent}
                        strokeWidth={isSelected ? 2.8 : 2}
                      />
                      <rect
                        x={fac.x}
                        y={fac.y}
                        width={fac.width}
                        height="18"
                        rx="6"
                        fill={accent}
                        fillOpacity="0.16"
                      />
                      <text
                        x={fac.x + 8}
                        y={fac.y + 13}
                        fontSize="9.5"
                        fontWeight="700"
                        fill={accent}
                        className="font-mono"
                      >
                        {fac.code}
                        {isOriginFac ? ' · ORIGEN' : ''}
                      </text>
                      <text
                        x={fac.x + fac.width / 2}
                        y={fac.y + 34}
                        textAnchor="middle"
                        fontSize="10.5"
                        fontWeight="700"
                        fill="var(--text-primary)"
                      >
                        {fac.name}
                      </text>

                      {/* Dynamic Attention layer readout */}
                      {layers.ATENCION && (
                        <text
                          x={fac.x + fac.width / 2}
                          y={fac.y + 48}
                          textAnchor="middle"
                          fontSize="8.5"
                          fontWeight="600"
                          fill={verifyCount > 0 ? accent : 'var(--text-secondary)'}
                          className="font-mono"
                        >
                          {verifyCount > 0
                            ? `${verifyCount}/${fac.serviceIds.length} verif. · ${facActCount} act.`
                            : 'Servicios operativos'}
                        </text>
                      )}

                      {/* Inline per-service indicators when SERVICIOS layer is active */}
                      {layers.SERVICIOS && (
                        <g
                          transform={`translate(${fac.x + 7}, ${fac.y + fac.height - 17})`}
                        >
                          {fac.serviceIds.map((srvId, idx) => {
                            const sNode = dependencyGraph.nodes[srvId];
                            const sStatus = sNode?.effectiveStatus ?? 'OPERATIVO';
                            const sColor = statusAccentColor(
                              sStatus,
                              sNode?.requiresVerification,
                            );
                            const chipW = (fac.width - 14 - (fac.serviceIds.length - 1) * 3) / fac.serviceIds.length;
                            const chipX = idx * (chipW + 3);
                            return (
                              <g key={srvId} transform={`translate(${chipX}, 0)`}>
                                <rect
                                  width={chipW}
                                  height="11"
                                  rx="3"
                                  fill={sColor}
                                  fillOpacity="0.16"
                                  stroke={sColor}
                                  strokeOpacity="0.45"
                                  strokeWidth="0.6"
                                />
                                <text
                                  x={chipW / 2}
                                  y="8"
                                  textAnchor="middle"
                                  fontSize="7"
                                  fontWeight="700"
                                  fill={sColor}
                                  className="font-mono"
                                >
                                  {SERVICE_SHORT_CODE[srvId] ?? srvId}·{STATUS_SYMBOL[sStatus]}
                                </text>
                              </g>
                            );
                          })}
                        </g>
                      )}
                    </g>
                  );
                })}

              {/* 3 Entrances (clickable to set route origin, reflecting live SRV-04 status) */}
              {(['ACC-1', 'ACC-2', 'ACC-3'] as const).map((accId) => {
                const pos = NODE_COORDS[accId];
                const isOrigin = selectedOrigin === accId;
                return (
                  <g
                    key={accId}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onClick={() => setSelectedOrigin(accId)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Usar ${pos.label} como origen de ruta`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedOrigin(accId);
                      }
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    {isOrigin && (
                      <rect
                        x="-40"
                        y="-15"
                        width="80"
                        height="30"
                        rx="10"
                        fill="none"
                        stroke="var(--accent-primary)"
                        strokeOpacity="0.45"
                        strokeWidth="2"
                      />
                    )}
                    <rect
                      x="-36"
                      y="-12"
                      width="72"
                      height="24"
                      rx="8"
                      fill="var(--bg-surface)"
                      stroke={isOrigin ? 'var(--accent-primary)' : accessColor}
                      strokeWidth={isOrigin ? 2.5 : 1.6}
                    />
                    <text
                      x="0"
                      y="3.5"
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill={accessColor}
                      className="font-mono"
                    >
                      {accId} · {STATUS_SYMBOL[accessStatus]}
                    </text>
                  </g>
                );
              })}

              {/* 2 Clickable Fictional Meeting Points */}
              {MEETING_POINTS.map((mp) => {
                const isTarget = activeTargetMeetingPointId === mp.id;
                const isInspected =
                  inspectorTarget.type === 'MEETING_POINT' && inspectorTarget.id === mp.id;
                return (
                  <g
                    key={mp.id}
                    transform={`translate(${mp.x}, ${mp.y})`}
                    onClick={() => setInspectorTarget({ type: 'MEETING_POINT', id: mp.id })}
                    role="button"
                    tabIndex={0}
                    aria-label={`Inspeccionar ${mp.name}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setInspectorTarget({ type: 'MEETING_POINT', id: mp.id });
                      }
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    {(isTarget || isInspected) && (
                      <circle
                        r="22"
                        fill="none"
                        stroke="var(--accent-primary)"
                        strokeOpacity={isInspected ? 0.85 : 0.45}
                        strokeWidth={isInspected ? 2.4 : 1.8}
                        strokeDasharray={isTarget && !isInspected ? '4 3' : undefined}
                      />
                    )}
                    <circle
                      r="17"
                      fill="#126A64"
                      fillOpacity={isTarget ? '0.24' : '0.14'}
                      stroke="#126A64"
                      strokeWidth="2"
                    />
                    <text
                      x="0"
                      y="3"
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="800"
                      fill="#126A64"
                    >
                      {mp.id}
                    </text>
                    <text
                      x="0"
                      y={mp.id === 'PF-01' ? -24 : 29}
                      textAnchor="middle"
                      fontSize="8.5"
                      fontWeight="600"
                      fill="var(--text-secondary)"
                    >
                      {isTarget ? 'Destino ruta' : 'Punto (Sim.)'}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Concise visual legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#126A64] inline-block" />
              <span>Ruta didáctica activa</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-[#B62C49] inline-block" />
              <span>Tramo bloqueado / restringido</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-[#A96A00] inline-block" />
              <span>Precaución por escenario</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-[#B78331] inline-block" />
              <span>Dependencia entre edificios</span>
            </span>
          </div>

          {/* Didactic Route Recalculation readout */}
          <div className="pt-3 border-t border-[var(--border-subtle)] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-[var(--text-primary)]">
                Ruta didáctica calculada ({routeStateLabel})
              </span>
              <span className="font-mono tabular-nums text-[var(--text-secondary)]">
                {recalculatedRoute.reachable
                  ? `${recalculatedRoute.totalDistanceMetersSimulated} m ficticios`
                  : 'Sin conexión disponible'}
              </span>
            </div>

            <p className="text-xs font-mono text-[var(--text-secondary)]">
              {recalculatedRoute.reachable
                ? `Secuencia: ${recalculatedRoute.nodePath.join(' → ')}`
                : 'Todos los tramos hacia los puntos ficticios están bloqueados. Desbloquee un tramo o cambie el escenario para recalcular.'}
            </p>

            {/* Scenario-derived restrictions readout */}
            {activeConditionList.length > 0 && (
              <div className="rounded-[10px] bg-[#FDF4E2]/70 dark:bg-[#A96A00]/15 border border-[#A96A00]/30 px-3 py-2 space-y-1">
                <p className="text-[11px] font-semibold text-[#A96A00] dark:text-[#F0B44C] inline-flex items-center gap-1.5">
                  {rainIntensity >= 65 ? (
                    <CloudRain className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    Reacción del plano al escenario {activeScenario.id}: {activeConditionList.length}{' '}
                    tramo(s) condicionado(s)
                  </span>
                </p>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {activeConditionList
                    .map((c) => `${c.segmentId} (${c.triggeredBy})`)
                    .join(' · ')}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {ROUTE_SEGMENTS.slice(0, 6).map((seg) => {
                const blocked = blockedSegmentIds.includes(seg.id);
                const scenarioCond = scenarioConditions[seg.id];
                const isScenarioBlocked = scenarioCond?.severity === 'BLOQUEADO_ESCENARIO';
                return (
                  <button
                    key={seg.id}
                    type="button"
                    disabled={!permissions.canBlockDidacticRoute || isScenarioBlocked}
                    onClick={() => toggleBlockedSegment(seg.id)}
                    title={isScenarioBlocked ? scenarioCond.reason : undefined}
                    className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium border transition-colors active:scale-[0.98] disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer ${
                      blocked || isScenarioBlocked
                        ? 'bg-[#FBE9ED] dark:bg-[#B62C49]/25 border-[#B62C49]/50 text-[#B62C49] dark:text-[#F2728C]'
                        : 'bg-[var(--bg-surface-2)]/60 border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {isScenarioBlocked
                      ? `${seg.id} (Escenario)`
                      : blocked
                        ? `Desbloquear ${seg.id}`
                        : `Bloquear ${seg.id}`}
                  </button>
                );
              })}
              {!permissions.canBlockDidacticRoute && (
                <span className="text-[11px] text-[var(--text-secondary)] ml-1">
                  (Cambie a Coordinador GRD o Brigadista para bloquear tramos)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Explanation Side Panel */}
        <aside className="lg:col-span-4 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-5 space-y-4">
          {inspectedMeetingPoint ? (
            <>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <p className="text-xs font-mono text-[var(--text-secondary)]">
                    {inspectedMeetingPoint.id} · Punto ficticio
                  </p>
                  <h3 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                    {inspectedMeetingPoint.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setInspectorTarget({ type: 'FACILITY', id: selectedFacility.id })
                  }
                  className="text-xs font-semibold text-[var(--accent-primary)] hover:underline shrink-0 cursor-pointer"
                >
                  Ver edificio
                </button>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {inspectedMeetingPoint.description}
              </p>
              <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/45 p-3.5 space-y-1.5 text-xs">
                <p className="font-semibold text-[var(--text-primary)]">
                  Estado en ruta desde {selectedOrigin}
                </p>
                <p className="text-[var(--text-secondary)]">
                  {activeTargetMeetingPointId === inspectedMeetingPoint.id
                    ? `Destino óptimo actual (${recalculatedRoute.totalDistanceMetersSimulated} m ficticios vía ${recalculatedRoute.nodePath.join(' → ')}).`
                    : 'No es el destino más corto desde el origen actual o un tramo lo condiciona.'}
                </p>
              </div>
            </>
          ) : inspectedSegment ? (
            <>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <p className="text-xs font-mono text-[var(--text-secondary)]">
                    {inspectedSegment.id} · {inspectedSegment.distanceMetersSimulated} m ficticios
                  </p>
                  <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                    {inspectedSegment.label}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setInspectorTarget({ type: 'FACILITY', id: selectedFacility.id })
                  }
                  className="text-xs font-semibold text-[var(--accent-primary)] hover:underline shrink-0 cursor-pointer"
                >
                  Ver edificio
                </button>
              </div>
              <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/45 p-3.5 space-y-1.5 text-xs">
                <p className="font-semibold text-[var(--text-primary)]">
                  Condición en {activeScenario.id} ·{' '}
                  {recalculatedRoute.segmentIds.includes(inspectedSegment.id)
                    ? 'Parte de la ruta activa'
                    : 'Fuera de la ruta óptima actual'}
                </p>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {scenarioConditions[inspectedSegment.id]
                    ? `${scenarioConditions[inspectedSegment.id].reason} (${scenarioConditions[inspectedSegment.id].triggeredBy})`
                    : blockedSegmentIds.includes(inspectedSegment.id)
                      ? 'Tramo bloqueado manualmente por rol operativo para simular desvío.'
                      : 'Tramo habilitado en simulación y disponible para cálculo de rutas.'}
                </p>
              </div>
              {permissions.canBlockDidacticRoute &&
                scenarioConditions[inspectedSegment.id]?.severity !== 'BLOQUEADO_ESCENARIO' && (
                  <button
                    type="button"
                    onClick={() => toggleBlockedSegment(inspectedSegment.id)}
                    className="w-full px-3 py-2 rounded-[9px] text-xs font-semibold bg-[var(--bg-surface-2)] hover:bg-[var(--border-subtle)] text-[var(--text-primary)] transition-colors cursor-pointer"
                  >
                    {blockedSegmentIds.includes(inspectedSegment.id)
                      ? `Desbloquear ${inspectedSegment.id} en simulación`
                      : `Bloquear ${inspectedSegment.id} y recalcular ruta`}
                  </button>
                )}
            </>
          ) : inspectedDependency && inspectorTarget.type === 'DEPENDENCY' ? (
            <>
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-[var(--border-subtle)]">
                <div>
                  <p className="text-xs font-mono text-[var(--text-secondary)]">
                    {inspectedDependency.dependency.id} ·{' '}
                    {inspectedDependency.isActivePropagation
                      ? 'Propagación activa'
                      : 'En reposo'}
                  </p>
                  <h3 className="text-base font-bold text-[var(--text-primary)] mt-0.5">
                    {inspectorTarget.fromName} ↔ {inspectorTarget.toName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setInspectorTarget({ type: 'FACILITY', id: selectedFacility.id })
                  }
                  className="text-xs font-semibold text-[var(--accent-primary)] hover:underline shrink-0 cursor-pointer"
                >
                  Ver edificio
                </button>
              </div>
              <div className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/45 p-3.5 space-y-1.5 text-xs">
                <p className="font-semibold text-[var(--text-primary)]">
                  Regla: {inspectedDependency.dependency.condition}
                </p>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {inspectedDependency.dependency.rationale}
                </p>
              </div>
              <Link
                to="/dependencias"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline"
              >
                <span>Inspeccionar en el grafo de dependencias</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </>
          ) : (
            <>
              <div className="pb-3 border-b border-[var(--border-subtle)]">
                <p className="text-xs font-mono text-[var(--text-secondary)]">
                  {selectedFacility.code} · {selectedFacility.zone}
                </p>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mt-0.5">
                  {selectedFacility.name}
                </h3>
                <p className="text-xs font-mono tabular-nums text-[var(--text-secondary)] mt-1">
                  Aforo referencial simulado: {selectedFacility.capacitySimulated} personas
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
                    Servicios asociados en {activeScenario.id}
                  </h4>
                  <Link
                    to="/dependencias"
                    className="text-[11px] font-semibold text-[var(--accent-primary)] hover:underline"
                  >
                    Ver grafo
                  </Link>
                </div>
                <div className="divide-y divide-[var(--border-subtle)]">
                  {selectedFacility.serviceIds.map((srvId) => {
                    const node = dependencyGraph.nodes[srvId];
                    if (!node) return null;
                    return (
                      <div key={srvId} className="py-2 first:pt-0.5 last:pb-0.5 space-y-0.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-[var(--text-primary)]">
                            {node.service.name}
                          </span>
                          <StatusBadge status={node.effectiveStatus} />
                        </div>
                        {node.triggeredByDependencies.length > 0 && (
                          <p className="text-[11px] text-[#A96A00] dark:text-[#F0B44C]">
                            Verificar por:{' '}
                            {node.triggeredByDependencies
                              .map((d) => d.sourceServiceName)
                              .join(', ')}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-[var(--border-subtle)]">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
                    Actividades ficticias en esta instalación
                  </h4>
                  <Link
                    to="/continuidad"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-primary)] hover:underline"
                  >
                    <span>Continuidad</span>
                    <ArrowRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {facilityActivities.map((act) => (
                    <li
                      key={act.activityId}
                      className="py-2.5 first:pt-0.5 last:pb-0.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[var(--text-primary)]">
                          {act.activityTitle}
                        </span>
                        <StatusBadge status={act.status} />
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)]">
                        {act.proposedAlternative}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5 pt-3 border-t border-[var(--border-subtle)]">
                <h4 className="text-xs font-semibold text-[var(--text-secondary)]">
                  Rutas didácticas disponibles ({DIDACTIC_ROUTES.length})
                </h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  {facilityActions.length} acciones operativas vinculadas a los servicios de esta instalación.
                </p>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
