import { Dependency, Scenario, Service, ServiceStatus } from '../../types/domain';

export interface EvaluatedServiceNode {
  service: Service;
  effectiveStatus: ServiceStatus;
  isDirectOverride: boolean;
  requiresVerification: boolean;
  triggeredByDependencies: {
    dependencyId: string;
    sourceServiceId: string;
    sourceServiceName: string;
    evidenceType: Dependency['evidenceType'];
    sourceId: string;
    rationale: string;
  }[];
  downstreamDependentIds: string[];
}

export interface DependencyEdgeEvaluation {
  dependency: Dependency;
  isActivePropagation: boolean;
  sourceStatus: ServiceStatus;
  targetStatus: ServiceStatus;
}

export interface DependencyGraphResult {
  nodes: Record<string, EvaluatedServiceNode>;
  edges: DependencyEdgeEvaluation[];
  servicesRequiringVerification: EvaluatedServiceNode[];
  affectedServiceIds: string[];
  cyclesDetected: string[][];
}

const NON_NOMINAL_STATUSES: ServiceStatus[] = [
  'NO_DISPONIBLE',
  'LIMITADO',
  'EN_OBSERVACION',
  'SIN_CONFIRMAR',
];

const PROPAGATION_TRIGGER_STATUSES: ServiceStatus[] = ['NO_DISPONIBLE', 'LIMITADO'];

export function isStatusDegraded(status: ServiceStatus): boolean {
  return NON_NOMINAL_STATUSES.includes(status);
}

/**
 * Detects cycles in a directed dependency graph using DFS coloring.
 * Ensures the dependency engine can identify and avoid infinite loops.
 */
export function detectDependencyCycles(
  services: Service[],
  dependencies: Dependency[],
): string[][] {
  const adjacency = new Map<string, string[]>();
  for (const srv of services) {
    adjacency.set(srv.id, []);
  }
  for (const dep of dependencies) {
    const list = adjacency.get(dep.sourceServiceId);
    if (list) {
      list.push(dep.targetServiceId);
    } else {
      adjacency.set(dep.sourceServiceId, [dep.targetServiceId]);
    }
  }

  const state = new Map<string, 0 | 1 | 2>(); // 0=unvisited, 1=visiting, 2=visited
  const stack: string[] = [];
  const cycles: string[][] = [];

  function dfs(nodeId: string) {
    state.set(nodeId, 1);
    stack.push(nodeId);

    const neighbors = adjacency.get(nodeId) ?? [];
    for (const nextId of neighbors) {
      const nextState = state.get(nextId) ?? 0;
      if (nextState === 1) {
        const idx = stack.indexOf(nextId);
        if (idx !== -1) {
          cycles.push([...stack.slice(idx), nextId]);
        }
      } else if (nextState === 0) {
        dfs(nextId);
      }
    }

    stack.pop();
    state.set(nodeId, 2);
  }

  for (const srv of services) {
    if ((state.get(srv.id) ?? 0) === 0) {
      dfs(srv.id);
    }
  }

  return cycles;
}

/**
 * Evaluates effective service states and dependency propagation.
 * CRITICAL RULE: A dependency NEVER proves the downstream service has failed automatically.
 * Instead, it flags downstream services as requiring human/technical verification.
 */
export function evaluateDependencies(
  baseServices: Service[],
  dependencies: Dependency[],
  scenario: Scenario,
): DependencyGraphResult {
  const serviceMap = new Map<string, Service>(baseServices.map((s) => [s.id, s]));
  const cyclesDetected = detectDependencyCycles(baseServices, dependencies);

  const nodes: Record<string, EvaluatedServiceNode> = {};
  for (const srv of baseServices) {
    const override = scenario.serviceOverrides[srv.id];
    const effectiveStatus: ServiceStatus = override ?? srv.status;
    nodes[srv.id] = {
      service: srv,
      effectiveStatus,
      isDirectOverride: override !== undefined && override !== 'OPERATIVO',
      requiresVerification: effectiveStatus !== 'OPERATIVO',
      triggeredByDependencies: [],
      downstreamDependentIds: [],
    };
  }

  for (const dep of dependencies) {
    if (nodes[dep.sourceServiceId]) {
      nodes[dep.sourceServiceId].downstreamDependentIds.push(dep.targetServiceId);
    }
  }

  // BFS propagation from degraded source services with cycle-safe visited set
  const queue: string[] = [];
  const visitedInPropagation = new Set<string>();

  for (const srv of baseServices) {
    const status = nodes[srv.id].effectiveStatus;
    if (PROPAGATION_TRIGGER_STATUSES.includes(status)) {
      queue.push(srv.id);
    }
  }

  let safetySteps = 0;
  const maxSteps = baseServices.length * dependencies.length + 16;

  while (queue.length > 0 && safetySteps < maxSteps) {
    safetySteps += 1;
    const currentId = queue.shift()!;
    if (visitedInPropagation.has(currentId)) {
      continue;
    }
    visitedInPropagation.add(currentId);

    const outgoing = dependencies.filter((d) => d.sourceServiceId === currentId);
    const sourceNode = nodes[currentId];
    if (!sourceNode) continue;

    for (const dep of outgoing) {
      const targetNode = nodes[dep.targetServiceId];
      if (!targetNode) continue;

      targetNode.requiresVerification = true;
      const alreadyRecorded = targetNode.triggeredByDependencies.some(
        (t) => t.dependencyId === dep.id,
      );
      if (!alreadyRecorded) {
        targetNode.triggeredByDependencies.push({
          dependencyId: dep.id,
          sourceServiceId: currentId,
          sourceServiceName: serviceMap.get(currentId)?.name ?? currentId,
          evidenceType: dep.evidenceType,
          sourceId: dep.sourceId,
          rationale: dep.rationale,
        });
      }

      // Propagate verification reachability downstream without infinite loops
      if (!visitedInPropagation.has(dep.targetServiceId)) {
        queue.push(dep.targetServiceId);
      }
    }
  }

  const edges: DependencyEdgeEvaluation[] = dependencies.map((dep) => {
    const srcStatus = nodes[dep.sourceServiceId]?.effectiveStatus ?? 'SIN_CONFIRMAR';
    const tgtStatus = nodes[dep.targetServiceId]?.effectiveStatus ?? 'SIN_CONFIRMAR';
    const isActivePropagation =
      PROPAGATION_TRIGGER_STATUSES.includes(srcStatus) ||
      (nodes[dep.sourceServiceId]?.triggeredByDependencies.length ?? 0) > 0;
    return {
      dependency: dep,
      isActivePropagation,
      sourceStatus: srcStatus,
      targetStatus: tgtStatus,
    };
  });

  const allNodes = Object.values(nodes);
  const servicesRequiringVerification = allNodes.filter((n) => n.requiresVerification);
  const affectedServiceIds = servicesRequiringVerification.map((n) => n.service.id);

  return {
    nodes,
    edges,
    servicesRequiringVerification,
    affectedServiceIds,
    cyclesDetected,
  };
}
