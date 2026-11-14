import { useMemo } from 'react';
import { useNexoStore } from '../store/useNexoStore';
import {
  CONTINUITY_ACTIVITIES,
  DEPENDENCIES,
  FACILITIES,
  RULES,
  SERVICES,
  SOURCES,
} from '../data/seedData';
import { evaluateDependencies } from '../lib/engines/dependencyEngine';
import { calculateOperationalIndex } from '../lib/engines/operationalIndex';
import { evaluateRule } from '../lib/engines/ruleEngine';
import { evaluateContinuity } from '../lib/engines/continuityEngine';
import { getPermissions } from '../lib/engines/permissions';

export function useDerivedNexo() {
  const activeRole = useNexoStore((s) => s.activeRole);
  const activeScenarioId = useNexoStore((s) => s.activeScenarioId);
  const scenarios = useNexoStore((s) => s.scenarios);
  const actions = useNexoStore((s) => s.actions);
  const alerts = useNexoStore((s) => s.alerts);
  const receipts = useNexoStore((s) => s.receipts);
  const continuityDecisions = useNexoStore((s) => s.continuityDecisions);
  const teacherObservations = useNexoStore((s) => s.teacherObservations);

  return useMemo(() => {
    const activeScenario =
      scenarios.find((sc) => sc.id === activeScenarioId) ?? scenarios[0];

    const dependencyGraph = evaluateDependencies(
      SERVICES,
      DEPENDENCIES,
      activeScenario,
    );

    const riskIndex = calculateOperationalIndex(
      activeScenario,
      dependencyGraph.nodes,
    );

    const matchedRules = RULES.map((rule) =>
      evaluateRule(rule, activeScenario, dependencyGraph),
    ).filter((r) => r.triggered);

    const scopedDecisions: typeof continuityDecisions = {};
    const prefix = `${activeScenario.id}::`;
    for (const [key, val] of Object.entries(continuityDecisions)) {
      if (key.startsWith(prefix)) {
        scopedDecisions[key.slice(prefix.length)] = val;
      } else if (!key.includes('::') && !scopedDecisions[key]) {
        // Backward compatibility for flat keys from earlier localStorage snapshots
        scopedDecisions[key] = val;
      }
    }

    const continuity = evaluateContinuity(
      CONTINUITY_ACTIVITIES,
      FACILITIES,
      dependencyGraph,
      scopedDecisions,
      teacherObservations,
    );

    const scenarioActions = actions.filter(
      (a) => a.scenarioId === activeScenario.id || a.isHistoricalSeed,
    );
    const pendingActions = scenarioActions.filter(
      (a) => a.status === 'PENDIENTE' || a.status === 'EN_REVISION',
    );
    const affectedActivities = continuity.plans.filter(
      (p) => p.status !== 'NORMAL',
    );

    const permissions = getPermissions(activeRole);
    const scenarioSources = SOURCES.filter((src) =>
      activeScenario.sourceIds.includes(src.id),
    );

    return {
      activeRole,
      permissions,
      activeScenario,
      dependencyGraph,
      riskIndex,
      matchedRules,
      continuity,
      scenarioActions,
      pendingActions,
      affectedActivities,
      alerts,
      receipts,
      scenarioSources,
    };
  }, [
    activeRole,
    activeScenarioId,
    scenarios,
    actions,
    alerts,
    receipts,
    continuityDecisions,
    teacherObservations,
  ]);
}
