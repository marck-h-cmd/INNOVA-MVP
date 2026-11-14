import { DidacticRouteSegment, Scenario } from '../../types/domain';
import { DependencyGraphResult } from './dependencyEngine';

export interface RoutePathResult {
  reachable: boolean;
  nodePath: string[];
  segmentIds: string[];
  totalDistanceMetersSimulated: number;
  rerouted: boolean;
}

export interface ScenarioSegmentCondition {
  segmentId: string;
  severity: 'BLOQUEADO_ESCENARIO' | 'PRECAUCION_ESCENARIO';
  reason: string;
  triggeredBy: string;
}

/**
 * Derives fictional segment restrictions/cautions deterministically from the active scenario's
 * simulated access state and rain/access parameters so the didactic plan reacts to scenario changes.
 * Never represents official UNT campus hazards or evacuation routes.
 */
export function deriveScenarioSegmentConditions(
  scenario: Scenario,
  dependencyGraph: DependencyGraphResult,
  segments: DidacticRouteSegment[],
): Record<string, ScenarioSegmentCondition> {
  const conditions: Record<string, ScenarioSegmentCondition> = {};
  const accessStatus = dependencyGraph.nodes['SRV-04']?.effectiveStatus ?? 'OPERATIVO';
  const rain = scenario.inputs.rainIntensity;
  const accessInput = scenario.inputs.accessRestriction;

  const severeAccessRestriction = accessStatus === 'NO_DISPONIBLE' || accessInput >= 75;
  const moderateAccessRestriction =
    accessStatus === 'LIMITADO' ||
    accessStatus === 'EN_OBSERVACION' ||
    accessStatus === 'SIN_CONFIRMAR' ||
    accessInput >= 45;

  for (const seg of segments) {
    // Northern pedestrian segment to PF-01 is restricted when simulated access fails or restriction >= 75%
    if (severeAccessRestriction && seg.id === 'SEG-A2') {
      conditions[seg.id] = {
        segmentId: seg.id,
        severity: 'BLOQUEADO_ESCENARIO',
        reason: 'Tramo norte restringido en simulación por anegamiento o cierre de accesos; se recalcula ruta alterna.',
        triggeredBy:
          accessStatus === 'NO_DISPONIBLE'
            ? 'Accesos (No disponible)'
            : `Restricción accesos (${accessInput}%)`,
      };
      continue;
    }

    // Perimeter entrances require verification/caution whenever Accesos is not fully operational
    if (
      (severeAccessRestriction || moderateAccessRestriction) &&
      (seg.id === 'SEG-A1' || seg.id === 'SEG-C3' || seg.id === 'SEG-E1')
    ) {
      conditions[seg.id] = {
        segmentId: seg.id,
        severity: 'PRECAUCION_ESCENARIO',
        reason: 'Acceso perimetral ficticio sujeto a verificación operativa en el escenario activo.',
        triggeredBy:
          accessStatus !== 'OPERATIVO'
            ? `Accesos (${accessStatus.toLowerCase().replace('_', ' ')})`
            : `Restricción accesos (${accessInput}%)`,
      };
      continue;
    }

    // Heavy simulated rain adds drainage caution on open-corridor segments
    if (rain >= 65 && (seg.id === 'SEG-A2' || seg.id === 'SEG-E2')) {
      conditions[seg.id] = {
        segmentId: seg.id,
        severity: 'PRECAUCION_ESCENARIO',
        reason: 'Precaución en corredor abierto por lluvia simulada >= 65%; verificar drenaje antes de transitar.',
        triggeredBy: `Lluvia simulada (${rain}%)`,
      };
    }
  }

  return conditions;
}

/**
 * Computes shortest available didactic path between two fictional campus nodes
 * avoiding blocked segments. Never represents official evacuation routes.
 */
export function findDidacticPath(
  startNode: string,
  targetNodes: string[],
  segments: DidacticRouteSegment[],
  blockedSegmentIds: string[],
): RoutePathResult {
  const blockedSet = new Set(blockedSegmentIds);
  const adj = new Map<string, { neighbor: string; segment: DidacticRouteSegment }[]>();

  for (const seg of segments) {
    if (blockedSet.has(seg.id)) continue;
    if (!adj.has(seg.from)) adj.set(seg.from, []);
    if (!adj.has(seg.to)) adj.set(seg.to, []);
    adj.get(seg.from)!.push({ neighbor: seg.to, segment: seg });
    adj.get(seg.to)!.push({ neighbor: seg.from, segment: seg });
  }

  // Dijkstra for shortest simulated distance
  const dist = new Map<string, number>();
  const prev = new Map<string, { node: string; segment: DidacticRouteSegment }>();
  const visited = new Set<string>();
  const queue: string[] = [startNode];
  dist.set(startNode, 0);

  while (queue.length > 0) {
    queue.sort((a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity));
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    if (targetNodes.includes(current)) {
      // Reconstruct path
      const nodePath: string[] = [current];
      const segmentIds: string[] = [];
      let cursor = current;
      while (prev.has(cursor)) {
        const step = prev.get(cursor)!;
        segmentIds.unshift(step.segment.id);
        nodePath.unshift(step.node);
        cursor = step.node;
      }
      return {
        reachable: true,
        nodePath,
        segmentIds,
        totalDistanceMetersSimulated: dist.get(current) ?? 0,
        rerouted: blockedSegmentIds.length > 0,
      };
    }

    const currentDist = dist.get(current) ?? Infinity;
    for (const edge of adj.get(current) ?? []) {
      const alt = currentDist + edge.segment.distanceMetersSimulated;
      if (alt < (dist.get(edge.neighbor) ?? Infinity)) {
        dist.set(edge.neighbor, alt);
        prev.set(edge.neighbor, { node: current, segment: edge.segment });
        queue.push(edge.neighbor);
      }
    }
  }

  return {
    reachable: false,
    nodePath: [],
    segmentIds: [],
    totalDistanceMetersSimulated: 0,
    rerouted: blockedSegmentIds.length > 0,
  };
}
