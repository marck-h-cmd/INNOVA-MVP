import {
  ContinuityActivity,
  Dependency,
  Facility,
  RiskExplanation,
  Rule,
  Scenario,
  ScenarioInputs,
  Service,
  ServiceStatus,
} from '../../types/domain';
import { evaluateDependencies, DependencyGraphResult } from './dependencyEngine';
import { calculateOperationalIndex } from './operationalIndex';
import { evaluateRule, RuleMatchEvaluation } from './ruleEngine';
import { ContinuityEvaluationSummary, evaluateContinuity } from './continuityEngine';

export interface EngineSnapshot {
  scenario: Scenario;
  dependencyGraph: DependencyGraphResult;
  riskIndex: RiskExplanation;
  matchedRules: RuleMatchEvaluation[];
  continuity: ContinuityEvaluationSummary;
  servicesToVerifyCount: number;
  affectedActivitiesCount: number;
}

export interface WhatIfComparison {
  current: EngineSnapshot;
  alternative: EngineSnapshot;
  deltas: {
    scoreDelta: number;
    servicesToVerifyDelta: number;
    matchedRulesDelta: number;
    affectedActivitiesDelta: number;
  };
}

export function computeEngineSnapshot(
  scenario: Scenario,
  services: Service[],
  dependencies: Dependency[],
  rules: Rule[],
  activities: ContinuityActivity[],
  facilities: Facility[],
): EngineSnapshot {
  const dependencyGraph = evaluateDependencies(services, dependencies, scenario);
  const riskIndex = calculateOperationalIndex(scenario, dependencyGraph.nodes);
  const matchedRules = rules
    .map((rule) => evaluateRule(rule, scenario, dependencyGraph))
    .filter((m) => m.triggered);
  const continuity = evaluateContinuity(activities, facilities, dependencyGraph, {}, {});

  const affectedActivitiesCount = continuity.plans.filter(
    (p) => p.status !== 'NORMAL',
  ).length;

  return {
    scenario,
    dependencyGraph,
    riskIndex,
    matchedRules,
    continuity,
    servicesToVerifyCount: dependencyGraph.servicesRequiringVerification.length,
    affectedActivitiesCount,
  };
}

export function compareWhatIfScenarios(
  currentScenario: Scenario,
  alternativeServiceOverrides: Record<string, ServiceStatus>,
  alternativeInputs: Partial<ScenarioInputs>,
  services: Service[],
  dependencies: Dependency[],
  rules: Rule[],
  activities: ContinuityActivity[],
  facilities: Facility[],
): WhatIfComparison {
  const alternativeScenario: Scenario = {
    ...currentScenario,
    inputs: {
      ...currentScenario.inputs,
      ...alternativeInputs,
    },
    serviceOverrides: {
      ...currentScenario.serviceOverrides,
      ...alternativeServiceOverrides,
    },
  };

  const current = computeEngineSnapshot(
    currentScenario,
    services,
    dependencies,
    rules,
    activities,
    facilities,
  );
  const alternative = computeEngineSnapshot(
    alternativeScenario,
    services,
    dependencies,
    rules,
    activities,
    facilities,
  );

  return {
    current,
    alternative,
    deltas: {
      scoreDelta: alternative.riskIndex.score - current.riskIndex.score,
      servicesToVerifyDelta:
        alternative.servicesToVerifyCount - current.servicesToVerifyCount,
      matchedRulesDelta:
        alternative.matchedRules.length - current.matchedRules.length,
      affectedActivitiesDelta:
        alternative.affectedActivitiesCount - current.affectedActivitiesCount,
    },
  };
}
