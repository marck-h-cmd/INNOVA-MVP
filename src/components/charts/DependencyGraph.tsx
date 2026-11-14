import {
  Activity,
  Droplets,
  GraduationCap,
  Landmark,
  MapPin,
  Wifi,
  Zap,
} from 'lucide-react';
import { DependencyGraphResult } from '../../lib/engines/dependencyEngine';
import { ServiceStatus } from '../../types/domain';

export type DependencyEdgeFilter = 'ALL' | 'ACTIVE' | 'HISTORICAL';

interface DependencyGraphProps {
  graph: DependencyGraphResult;
  selectedServiceId?: string | null;
  selectedEdgeId?: string | null;
  edgeFilter?: DependencyEdgeFilter;
  onSelectService?: (serviceId: string) => void;
  onSelectEdge?: (edgeId: string) => void;
  compact?: boolean;
}

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  'SRV-01': { x: 112, y: 174 }, // Electricidad
  'SRV-02': { x: 446, y: 62 },  // Agua
  'SRV-03': { x: 446, y: 174 }, // Conectividad
  'SRV-04': { x: 446, y: 292 }, // Accesos
  'SRV-06': { x: 782, y: 88 },  // Servicios administrativos
  'SRV-05': { x: 782, y: 242 }, // Servicios académicos
};

const NODE_WIDTH = 196;
const NODE_HEIGHT = 66;

const NODE_ICONS: Record<string, typeof Zap> = {
  'SRV-01': Zap,
  'SRV-02': Droplets,
  'SRV-03': Wifi,
  'SRV-04': MapPin,
  'SRV-05': GraduationCap,
  'SRV-06': Landmark,
};

function statusStroke(status: ServiceStatus, requiresVerification: boolean): string {
  if (status === 'NO_DISPONIBLE') return '#B62C49';
  if (status === 'LIMITADO') return '#C25B2B';
  if (status === 'EN_OBSERVACION' || status === 'SIN_CONFIRMAR') return '#A96A00';
  if (requiresVerification) return '#A96A00';
  return '#178353';
}

function statusShortLabel(status: ServiceStatus, requiresVerification: boolean): string {
  if (status === 'NO_DISPONIBLE') return 'No disponible';
  if (status === 'LIMITADO') return 'Limitado';
  if (status === 'EN_OBSERVACION') return 'En observación';
  if (status === 'SIN_CONFIRMAR') return 'Sin confirmar';
  if (requiresVerification) return 'Verificar dep.';
  return 'Operativo';
}

/**
 * Computes clean cubic Bezier SVG path and non-overlapping label anchor
 * so long-span edges (DEP-06: SRV-01 -> SRV-05) route between middle nodes cleanly.
 */
function buildEdgeGeometry(
  depId: string,
  src: { x: number; y: number },
  tgt: { x: number; y: number },
): { d: string; labelX: number; labelY: number } {
  const halfW = NODE_WIDTH / 2;
  const x1 = src.x + halfW + 3;
  const y1 = src.y;
  const x2 = tgt.x - halfW - 5;
  const y2 = tgt.y;

  // Bypass SRV-03 cleanly through the open corridor between SRV-03 (y=174) and SRV-04 (y=292)
  if (depId === 'DEP-06') {
    const cx1 = x1 + 115;
    const cy1 = 236;
    const cx2 = x2 - 115;
    const cy2 = 242;
    const d = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;
    return {
      d,
      labelX: 332,
      labelY: 230,
    };
  }

  const dx = Math.max(48, (x2 - x1) * 0.45);
  const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  return {
    d,
    labelX: (x1 + x2) / 2,
    labelY: (y1 + y2) / 2,
  };
}

/**
 * Collects full upstream + downstream connected edges and nodes for a selected service.
 */
function collectConnectedSubgraph(
  graph: DependencyGraphResult,
  selectedServiceId: string | null | undefined,
) {
  const edgeIds = new Set<string>();
  const nodeIds = new Set<string>();
  if (!selectedServiceId) return { edgeIds, nodeIds };

  nodeIds.add(selectedServiceId);

  // Downstream BFS
  const downQ = [selectedServiceId];
  const downVisited = new Set<string>([selectedServiceId]);
  while (downQ.length > 0) {
    const cur = downQ.shift()!;
    for (const e of graph.edges) {
      if (e.dependency.sourceServiceId === cur) {
        edgeIds.add(e.dependency.id);
        nodeIds.add(e.dependency.targetServiceId);
        if (!downVisited.has(e.dependency.targetServiceId)) {
          downVisited.add(e.dependency.targetServiceId);
          downQ.push(e.dependency.targetServiceId);
        }
      }
    }
  }

  // Upstream BFS
  const upQ = [selectedServiceId];
  const upVisited = new Set<string>([selectedServiceId]);
  while (upQ.length > 0) {
    const cur = upQ.shift()!;
    for (const e of graph.edges) {
      if (e.dependency.targetServiceId === cur) {
        edgeIds.add(e.dependency.id);
        nodeIds.add(e.dependency.sourceServiceId);
        if (!upVisited.has(e.dependency.sourceServiceId)) {
          upVisited.add(e.dependency.sourceServiceId);
          upQ.push(e.dependency.sourceServiceId);
        }
      }
    }
  }

  return { edgeIds, nodeIds };
}

export function DependencyGraph({
  graph,
  selectedServiceId,
  selectedEdgeId,
  edgeFilter = 'ALL',
  onSelectService,
  onSelectEdge,
  compact = false,
}: DependencyGraphProps) {
  const subgraph = collectConnectedSubgraph(graph, selectedServiceId);

  const selectedEdgeObj = selectedEdgeId
    ? graph.edges.find((e) => e.dependency.id === selectedEdgeId)
    : undefined;

  return (
    <div className="space-y-3">
      <div className="w-full overflow-x-auto rounded-[12px] border border-[var(--border-subtle)] bg-[var(--bg-surface-2)]/35 p-2.5 sm:p-3">
        <svg
          viewBox="0 0 900 355"
          className={`w-full h-auto ${compact ? 'min-w-0' : 'min-w-[620px] max-h-[345px]'}`}
          role="group"
          aria-label="Grafo dirigido de dependencias entre servicios universitarios simulados"
        >
          <defs>
            <marker
              id="arrow-neutral"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--text-secondary)" />
            </marker>
            <marker
              id="arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#C25B2B" />
            </marker>
            <marker
              id="arrow-selected"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--accent-primary)" />
            </marker>
          </defs>

          {/* Column guide headers (subtle structural anchors) */}
          <text x="112" y="18" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="var(--text-secondary)">
            Servicios base
          </text>
          <text x="446" y="18" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="var(--text-secondary)">
            Infraestructura y acceso
          </text>
          <text x="782" y="18" textAnchor="middle" fontSize="9.5" fontWeight="600" fill="var(--text-secondary)">
            Servicios misionales
          </text>

          {/* Edges */}
          {graph.edges.map((edge) => {
            const src = NODE_POSITIONS[edge.dependency.sourceServiceId];
            const tgt = NODE_POSITIONS[edge.dependency.targetServiceId];
            if (!src || !tgt) return null;

            const geom = buildEdgeGeometry(edge.dependency.id, src, tgt);
            const isActive = edge.isActivePropagation;
            const isSelectedEdge = selectedEdgeId === edge.dependency.id;
            const isHistorical = edge.dependency.evidenceType === 'ANTECEDENTE_DOCUMENTAL';

            // Filter dimming
            const failsFilter =
              (edgeFilter === 'ACTIVE' && !isActive) ||
              (edgeFilter === 'HISTORICAL' && !isHistorical);

            // Selection dimming (edge selection takes priority over node selection if set)
            let dimmed = failsFilter;
            if (!dimmed) {
              if (selectedEdgeId) {
                dimmed = !isSelectedEdge;
              } else if (selectedServiceId) {
                dimmed = !subgraph.edgeIds.has(edge.dependency.id);
              }
            }

            const strokeColor = isSelectedEdge
              ? 'var(--accent-primary)'
              : isActive
                ? '#C25B2B'
                : 'var(--text-secondary)';
            const marker = isSelectedEdge
              ? 'url(#arrow-selected)'
              : isActive
                ? 'url(#arrow-active)'
                : 'url(#arrow-neutral)';

            const labelText = isHistorical ? 'Antecedente 2025' : 'Ejemplo';
            const labelW = isHistorical ? 98 : 54;

            return (
              <g
                key={edge.dependency.id}
                opacity={dimmed ? 0.2 : 1}
                onClick={onSelectEdge ? () => onSelectEdge(edge.dependency.id) : undefined}
                role={onSelectEdge ? 'button' : undefined}
                tabIndex={onSelectEdge ? 0 : undefined}
                aria-label={
                  onSelectEdge
                    ? `Inspeccionar dependencia ${edge.dependency.id}: ${edge.dependency.sourceServiceId} hacia ${edge.dependency.targetServiceId}`
                    : undefined
                }
                onKeyDown={
                  onSelectEdge
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectEdge(edge.dependency.id);
                        }
                      }
                    : undefined
                }
                className={`${onSelectEdge ? 'cursor-pointer focus:outline-none' : ''} transition-opacity duration-150`}
              >
                {/* Generous invisible hit path for effortless edge selection */}
                <path
                  d={geom.d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={18}
                />

                {/* Base structural edge */}
                <path
                  d={geom.d}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={isSelectedEdge ? 3 : isActive ? 2.4 : 1.5}
                  strokeDasharray={isHistorical ? undefined : '5 4'}
                  markerEnd={marker}
                />

                {/* Animated propagation flow overlay */}
                {isActive && !dimmed && (
                  <path
                    d={geom.d}
                    fill="none"
                    stroke={isSelectedEdge ? 'var(--accent-primary)' : '#F28B5B'}
                    strokeOpacity="0.85"
                    strokeWidth={2.2}
                    strokeDasharray="6 10"
                    strokeLinecap="round"
                    className="nexo-animated-flow pointer-events-none"
                  />
                )}

                {/* Edge provenance tag */}
                <rect
                  x={geom.labelX - labelW / 2}
                  y={geom.labelY - 9}
                  width={labelW}
                  height={17}
                  rx="4"
                  fill="var(--bg-surface)"
                  stroke={isSelectedEdge ? 'var(--accent-primary)' : isActive ? '#C25B2B' : 'var(--border-subtle)'}
                  strokeWidth={isSelectedEdge ? '1.3' : '0.8'}
                />
                <text
                  x={geom.labelX}
                  y={geom.labelY + 2.5}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight={isSelectedEdge || isActive ? '700' : '500'}
                  fill={isSelectedEdge ? 'var(--accent-primary)' : isActive ? '#C25B2B' : 'var(--text-secondary)'}
                  className="font-mono"
                >
                  {labelText}
                </text>
                <title>{`${edge.dependency.id}: ${edge.dependency.condition}`}</title>
              </g>
            );
          })}

          {/* Nodes */}
          {Object.values(graph.nodes).map((node) => {
            const pos = NODE_POSITIONS[node.service.id];
            if (!pos) return null;
            const Icon = NODE_ICONS[node.service.id] ?? Activity;
            const stroke = statusStroke(node.effectiveStatus, node.requiresVerification);
            const isSelected = selectedServiceId === node.service.id;

            const isEdgeEndpoint =
              selectedEdgeObj &&
              (selectedEdgeObj.dependency.sourceServiceId === node.service.id ||
                selectedEdgeObj.dependency.targetServiceId === node.service.id);

            const dimmedNode = selectedEdgeObj
              ? !isEdgeEndpoint
              : selectedServiceId
                ? !subgraph.nodeIds.has(node.service.id)
                : false;

            const statusLabel = statusShortLabel(
              node.effectiveStatus,
              node.requiresVerification,
            );

            return (
              <g
                key={node.service.id}
                transform={`translate(${pos.x - NODE_WIDTH / 2}, ${pos.y - NODE_HEIGHT / 2})`}
                opacity={dimmedNode ? 0.35 : 1}
                onClick={() => onSelectService?.(node.service.id)}
                role="button"
                tabIndex={0}
                aria-label={`${node.service.name}: ${statusLabel}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectService?.(node.service.id);
                  }
                }}
                className="cursor-pointer focus:outline-none transition-opacity duration-150"
              >
                {/* Selection halo */}
                {isSelected && (
                  <rect
                    x="-4"
                    y="-4"
                    width={NODE_WIDTH + 8}
                    height={NODE_HEIGHT + 8}
                    rx="15"
                    fill="none"
                    stroke="var(--accent-primary)"
                    strokeOpacity="0.35"
                    strokeWidth="2.5"
                  />
                )}

                <rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx="12"
                  fill="var(--bg-surface)"
                  stroke={isSelected || isEdgeEndpoint ? 'var(--accent-primary)' : stroke}
                  strokeWidth={isSelected || isEdgeEndpoint ? 2.5 : 1.7}
                />

                <g transform="translate(12, 21)">
                  <rect
                    width="24"
                    height="24"
                    rx="7"
                    fill={stroke}
                    fillOpacity="0.14"
                  />
                  <Icon
                    x="4"
                    y="4"
                    width="16"
                    height="16"
                    color={stroke}
                  />
                </g>

                <text
                  x={NODE_WIDTH - 10}
                  y="16"
                  textAnchor="end"
                  fontSize="8.5"
                  fill="var(--text-secondary)"
                  className="font-mono"
                >
                  {node.service.id}
                  {node.triggeredByDependencies.length > 0
                    ? ` · ${node.triggeredByDependencies.length} dep.`
                    : ''}
                </text>

                <text
                  x="44"
                  y="33"
                  fontSize="10.5"
                  fontWeight="700"
                  fill="var(--text-primary)"
                >
                  {node.service.name}
                </text>

                <text
                  x="44"
                  y="49"
                  fontSize="10"
                  fontWeight="600"
                  fill={stroke}
                >
                  {statusLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Clear legend distinguishing verified precedent vs example vs active propagation */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-[var(--text-secondary)] inline-block" />
          <span>Línea continua: antecedente UNT 2025</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-[var(--text-secondary)] inline-block" />
          <span>Línea discontinua: relación de ejemplo</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-[#C25B2B] inline-block" />
          <span>Flujo activo: solicita verificación (no asume falla automática)</span>
        </span>
      </div>
    </div>
  );
}
