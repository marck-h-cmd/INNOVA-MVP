import { Action, Rule, Scenario } from '../../types/domain';
import { DependencyGraphResult } from './dependencyEngine';

export interface RuleMatchEvaluation {
  rule: Rule;
  triggered: boolean;
  triggerReason: string;
  targetServiceId: string;
}

export interface RuleEngineResult {
  matchedRules: RuleMatchEvaluation[];
  synchronizedActions: Action[];
}

export function evaluateRule(
  rule: Rule,
  scenario: Scenario,
  graph: DependencyGraphResult,
): RuleMatchEvaluation {
  const { matcher } = rule;
  const reasons: string[] = [];

  if (matcher.serviceId && matcher.expectedStatuses) {
    const node = graph.nodes[matcher.serviceId];
    if (node && matcher.expectedStatuses.includes(node.effectiveStatus)) {
      reasons.push(
        `${node.service.name} (${node.service.id}) se encuentra en estado ${node.effectiveStatus}`,
      );
    } else if (
      node &&
      matcher.requiresDependencyOn &&
      node.effectiveStatus === 'OPERATIVO'
    ) {
      // Check if dependency target is flagged via dependency OR directly degraded/unconfirmed
      const targetNode = graph.nodes[matcher.requiresDependencyOn];
      if (targetNode) {
        const triggeredByDep = targetNode.triggeredByDependencies.some(
          (t) => t.sourceServiceId === matcher.serviceId,
        );
        const directlyCompromised =
          rule.id === 'RUL-03' && targetNode.effectiveStatus !== 'OPERATIVO';
        if (triggeredByDep) {
          reasons.push(
            `Dependencia activa desde ${node.service.name} hacia ${targetNode.service.name}`,
          );
        } else if (directlyCompromised) {
          reasons.push(
            `${targetNode.service.name} (${targetNode.service.id}) se encuentra en estado ${targetNode.effectiveStatus}`,
          );
        }
      }
    }
  }

  if (
    matcher.minRainIntensity !== undefined &&
    scenario.inputs.rainIntensity >= matcher.minRainIntensity
  ) {
    reasons.push(
      `Lluvia simulada (${scenario.inputs.rainIntensity}%) alcanza o supera umbral (${matcher.minRainIntensity}%)`,
    );
  }

  if (
    matcher.minAccessRestriction !== undefined &&
    scenario.inputs.accessRestriction >= matcher.minAccessRestriction
  ) {
    reasons.push(
      `Restricción de accesos (${scenario.inputs.accessRestriction}%) alcanza umbral (${matcher.minAccessRestriction}%)`,
    );
  }

  if (
    matcher.minContinuityImpact !== undefined &&
    scenario.inputs.continuityImpact >= matcher.minContinuityImpact
  ) {
    reasons.push(
      `Impacto en continuidad (${scenario.inputs.continuityImpact}%) alcanza umbral (${matcher.minContinuityImpact}%)`,
    );
  }

  // Special case for RUL-04: any core enabling service degraded or verification needed
  if (rule.id === 'RUL-04') {
    const degradedCore = ['SRV-01', 'SRV-02', 'SRV-03', 'SRV-04'].filter(
      (id) => graph.nodes[id]?.requiresVerification,
    );
    if (degradedCore.length > 0 && reasons.length === 0) {
      reasons.push(
        `Servicios habilitantes con verificación pendiente (${degradedCore.join(', ')})`,
      );
    }
  }

  // Special case for RUL-08: Water unavailable triggers admin sanitary review
  if (rule.id === 'RUL-08' && reasons.length === 0) {
    const waterNode = graph.nodes['SRV-02'];
    if (
      waterNode &&
      (waterNode.effectiveStatus === 'NO_DISPONIBLE' ||
        waterNode.effectiveStatus === 'SIN_CONFIRMAR' ||
        waterNode.triggeredByDependencies.length > 0)
    ) {
      reasons.push(
        `Servicio Agua (${waterNode.effectiveStatus}) condiciona la atención administrativa`,
      );
    }
  }

  const targetServiceId =
    rule.suggestedTargetServiceId ?? matcher.serviceId ?? 'SRV-05';

  return {
    rule,
    triggered: reasons.length > 0,
    triggerReason: reasons.join('; '),
    targetServiceId,
  };
}

/**
 * Evaluates all rules and synchronizes actions for the active scenario without creating duplicates.
 * Preserves existing action statuses (EN_REVISION, VERIFICADA, CERRADA) and historical seed actions.
 */
export function runRuleEngine(
  rules: Rule[],
  scenario: Scenario,
  graph: DependencyGraphResult,
  existingActions: Action[],
  nowIso: string,
): RuleEngineResult {
  const matchedRules: RuleMatchEvaluation[] = [];
  const nextActions: Action[] = [...existingActions];

  for (const rule of rules) {
    const evaluation = evaluateRule(rule, scenario, graph);
    if (!evaluation.triggered) continue;
    matchedRules.push(evaluation);

    const deterministicId = `ACTN-${scenario.id}-${rule.id}`;
    const existingIdx = nextActions.findIndex((a) => a.id === deterministicId);

    if (existingIdx === -1) {
      nextActions.push({
        id: deterministicId,
        ruleId: rule.id,
        scenarioId: scenario.id,
        title: rule.action,
        priority: rule.priority,
        status: 'PENDIENTE',
        responsibleRole: rule.responsibleRole,
        serviceId: evaluation.targetServiceId,
        justification: `${rule.justification} Motivo: ${evaluation.triggerReason}.`,
        evidence: 'Generada automáticamente por el motor determinista de reglas.',
        sourceId: rule.sourceId,
        ruleVersion: rule.version,
        simulated: true,
        isHistoricalSeed: false,
        updatedAt: nowIso,
      });
    } else {
      // Update justification to reflect current trigger reason without erasing status/evidence
      const current = nextActions[existingIdx];
      nextActions[existingIdx] = {
        ...current,
        justification: `${rule.justification} Motivo: ${evaluation.triggerReason}.`,
      };
    }
  }

  // Remove non-historical generated actions for THIS scenario whose rule is no longer triggered and are still PENDIENTE
  // (Historical or user-progressed actions remain traceable)
  const activeIds = new Set(
    matchedRules.map((m) => `ACTN-${scenario.id}-${m.rule.id}`),
  );
  const synchronizedActions = nextActions.filter((action) => {
    if (action.isHistoricalSeed) return true;
    if (action.scenarioId !== scenario.id) return true;
    if (activeIds.has(action.id)) return true;
    // Keep closed/verified actions as history, prune unstarted PENDIENTE actions when condition clears
    return action.status !== 'PENDIENTE';
  });

  return {
    matchedRules,
    synchronizedActions,
  };
}
