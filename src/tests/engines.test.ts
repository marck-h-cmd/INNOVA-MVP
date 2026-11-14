import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTINUITY_ACTIVITIES,
  DEPENDENCIES,
  FACILITIES,
  INITIAL_HISTORICAL_ACTIONS,
  RULES,
  SCENARIOS,
  SERVICES,
} from '../data/seedData';
import {
  detectDependencyCycles,
  evaluateDependencies,
} from '../lib/engines/dependencyEngine';
import { calculateOperationalIndex } from '../lib/engines/operationalIndex';
import { runRuleEngine } from '../lib/engines/ruleEngine';
import { evaluateContinuity } from '../lib/engines/continuityEngine';
import {
  canRoleUpdateAction,
  getPermissions,
  isAlertVisibleToCommunity,
} from '../lib/engines/permissions';
import {
  deriveScenarioSegmentConditions,
  findDidacticPath,
} from '../lib/engines/routeGraph';
import { ROUTE_SEGMENTS } from '../data/seedData';
import { compareWhatIfScenarios } from '../lib/engines/whatIfEngine';
import {
  buildDemoScenarioStateAtStep,
  computeDemoStepAtSecond,
  computeEffectiveDemoTargetSecond,
} from '../lib/engines/demoSequence';
import { Dependency, Scenario } from '../types/domain';

test('calculateOperationalIndex computes exact weighted score and classification', () => {
  const scenario: Scenario = {
    ...SCENARIOS[0],
    inputs: {
      rainIntensity: 100, // 0.30 * 100 = 30
      serviceDisruption: 100, // 0.30 * 100 = 30
      accessRestriction: 100, // 0.25 * 100 = 25
      continuityImpact: 100, // 0.15 * 100 = 15
    },
    serviceOverrides: {
      'SRV-01': 'NO_DISPONIBLE',
      'SRV-04': 'NO_DISPONIBLE',
    },
  };
  const graph = evaluateDependencies(SERVICES, DEPENDENCIES, scenario);
  const result = calculateOperationalIndex(scenario, graph.nodes);

  assert.equal(result.score, 100);
  assert.equal(result.level, 'CRITICO');
  assert.equal(result.displayLabel, 'Atención operativa simulada');

  const calmScenario: Scenario = {
    ...SCENARIOS[0],
    inputs: {
      rainIntensity: 10,
      serviceDisruption: 0,
      accessRestriction: 0,
      continuityImpact: 0,
    },
    serviceOverrides: {},
  };
  const calmGraph = evaluateDependencies(SERVICES, DEPENDENCIES, calmScenario);
  const calmResult = calculateOperationalIndex(calmScenario, calmGraph.nodes);
  assert.equal(calmResult.score, 3);
  assert.equal(calmResult.level, 'BAJO');
});

test('evaluateDependencies flags downstream verification without falsely marking target failed', () => {
  const outageScenario: Scenario = {
    ...SCENARIOS[1],
    serviceOverrides: {
      'SRV-01': 'NO_DISPONIBLE',
    },
  };
  const graph = evaluateDependencies(SERVICES, DEPENDENCIES, outageScenario);

  assert.equal(graph.nodes['SRV-01'].effectiveStatus, 'NO_DISPONIBLE');
  // SRV-02 (Agua) depends on SRV-01, should remain OPERATIVO until verified, but requiresVerification = true
  assert.equal(graph.nodes['SRV-02'].effectiveStatus, 'OPERATIVO');
  assert.equal(graph.nodes['SRV-02'].requiresVerification, true);
  assert.ok(
    graph.nodes['SRV-02'].triggeredByDependencies.some(
      (d) => d.sourceServiceId === 'SRV-01' && d.evidenceType === 'ANTECEDENTE_DOCUMENTAL',
    ),
  );
  // SRV-03 (Conectividad) also flagged
  assert.equal(graph.nodes['SRV-03'].requiresVerification, true);
});

test('dependencyEngine prevents infinite loops and detects cycles safely', () => {
  const cyclicDeps: Dependency[] = [
    ...DEPENDENCIES,
    {
      id: 'DEP-CYCLE',
      sourceServiceId: 'SRV-05',
      targetServiceId: 'SRV-01',
      condition: 'Ciclo de prueba',
      evidenceType: 'EJEMPLO_SIMULACION',
      sourceId: 'SRC-SIM-01',
      rationale: 'Test cycle',
      simulated: true,
    },
  ];
  const cycles = detectDependencyCycles(SERVICES, cyclicDeps);
  assert.ok(cycles.length > 0);

  const outageScenario: Scenario = {
    ...SCENARIOS[1],
    serviceOverrides: { 'SRV-01': 'NO_DISPONIBLE' },
  };
  const graph = evaluateDependencies(SERVICES, cyclicDeps, outageScenario);
  assert.ok(graph.cyclesDetected.length > 0);
  assert.ok(graph.affectedServiceIds.includes('SRV-01'));
});

test('runRuleEngine triggers electricity outage rules and avoids duplicate actions on repeated runs', () => {
  const outageScenario = SCENARIOS[1]; // SCN-02
  const graph = evaluateDependencies(SERVICES, DEPENDENCIES, outageScenario);

  const run1 = runRuleEngine(
    RULES,
    outageScenario,
    graph,
    INITIAL_HISTORICAL_ACTIONS,
    '2026-11-12T10:00:00',
  );
  const run2 = runRuleEngine(
    RULES,
    outageScenario,
    graph,
    run1.synchronizedActions,
    '2026-11-12T10:05:00',
  );

  assert.ok(run1.matchedRules.some((r) => r.rule.id === 'RUL-01'));
  assert.ok(run1.matchedRules.some((r) => r.rule.id === 'RUL-02'));
  assert.equal(run1.synchronizedActions.length, run2.synchronizedActions.length);
});

test('permissions enforce role boundaries for approval, editing, and community visibility', () => {
  assert.equal(getPermissions('ESTUDIANTE').canEditScenario, false);
  assert.equal(getPermissions('ESTUDIANTE').canApproveOrRejectAlert, false);
  assert.equal(getPermissions('COORDINADOR_GRD').canEditScenario, true);
  assert.equal(getPermissions('COORDINADOR_GRD').canApproveOrRejectAlert, false);
  assert.equal(getPermissions('AUTORIDAD').canApproveOrRejectAlert, true);
  assert.equal(getPermissions('AUTORIDAD').canApproveContinuity, true);

  assert.equal(isAlertVisibleToCommunity('BORRADOR'), false);
  assert.equal(isAlertVisibleToCommunity('PENDIENTE_APROBACION'), false);
  assert.equal(isAlertVisibleToCommunity('RECHAZADA'), false);
  assert.equal(isAlertVisibleToCommunity('APROBADA'), true);
  assert.equal(isAlertVisibleToCommunity('DIFUNDIDA'), true);

  const brigAction = INITIAL_HISTORICAL_ACTIONS[0]; // responsibleRole: BRIGADISTA
  assert.equal(canRoleUpdateAction('BRIGADISTA', brigAction), true);
  assert.equal(canRoleUpdateAction('ADMINISTRATIVO', brigAction), false);
  assert.equal(canRoleUpdateAction('COORDINADOR_GRD', brigAction), true);
});

test('continuityEngine never guarantees remote mode when Connectivity is compromised', () => {
  const connOutageScenario: Scenario = {
    ...SCENARIOS[3],
    serviceOverrides: {
      'SRV-03': 'NO_DISPONIBLE',
      'SRV-01': 'OPERATIVO',
    },
  };
  const graph = evaluateDependencies(SERVICES, DEPENDENCIES, connOutageScenario);
  const continuity = evaluateContinuity(
    CONTINUITY_ACTIVITIES,
    FACILITIES,
    graph,
    {},
    {},
  );

  // ACT-07 depends on SRV-03 and is remoteCompatible: true, yet SRV-03 is NO_DISPONIBLE
  const act07 = continuity.plans.find((p) => p.activityId === 'ACT-07');
  assert.ok(act07);
  assert.notEqual(act07.proposedMode, 'REMOTA_COMPATIBLE');
  assert.equal(act07.status, 'SUSPENDIDA_SIMULADA');
});

test('routeGraph recalculates alternative didactic path when primary segment is blocked', () => {
  const openRoute = findDidacticPath('ACC-1', ['PF-01', 'PF-02'], ROUTE_SEGMENTS, []);
  assert.equal(openRoute.reachable, true);
  assert.deepEqual(openRoute.nodePath, ['ACC-1', 'ED-01', 'PF-01']);

  const rerouted = findDidacticPath('ACC-1', ['PF-01', 'PF-02'], ROUTE_SEGMENTS, ['SEG-A2']);
  assert.equal(rerouted.reachable, true);
  assert.equal(rerouted.rerouted, true);
  assert.ok(rerouted.nodePath.includes('ED-03'));
});

test('whatIfEngine compares current vs alternative without mutating original scenario', () => {
  const outageScenario = SCENARIOS[1];
  const originalStatus = outageScenario.serviceOverrides['SRV-01'];

  const comparison = compareWhatIfScenarios(
    outageScenario,
    { 'SRV-01': 'OPERATIVO', 'SRV-02': 'OPERATIVO', 'SRV-03': 'OPERATIVO' },
    { serviceDisruption: 10, continuityImpact: 15 },
    SERVICES,
    DEPENDENCIES,
    RULES,
    CONTINUITY_ACTIVITIES,
    FACILITIES,
  );

  assert.equal(outageScenario.serviceOverrides['SRV-01'], originalStatus);
  assert.ok(comparison.deltas.scoreDelta < 0);
  assert.ok(comparison.alternative.riskIndex.score < comparison.current.riskIndex.score);
});

test('demoSequence step mapping and state builder are deterministic and repeatable', () => {
  assert.equal(computeDemoStepAtSecond(0), 0);
  assert.equal(computeDemoStepAtSecond(40), 4);
  assert.equal(computeDemoStepAtSecond(65), 7);
  assert.equal(computeDemoStepAtSecond(90), 10);

  const stateAt40 = buildDemoScenarioStateAtStep(4);
  assert.equal(stateAt40.serviceOverrides['SRV-01'], 'NO_DISPONIBLE');
  const stateAtReset = buildDemoScenarioStateAtStep(0);
  assert.equal(stateAtReset.serviceOverrides['SRV-01'], 'OPERATIVO');
});

test('runRuleEngine triggers RUL-03 directly in SCN-04 when Conectividad is NO_DISPONIBLE without electrical failure', () => {
  const connectivityScenario = SCENARIOS[3]; // SCN-04: SRV-01 OPERATIVO, SRV-03 NO_DISPONIBLE
  const graph = evaluateDependencies(SERVICES, DEPENDENCIES, connectivityScenario);
  const result = runRuleEngine(
    RULES,
    connectivityScenario,
    graph,
    INITIAL_HISTORICAL_ACTIONS,
    '2026-11-12T11:20:00',
  );

  assert.ok(
    result.matchedRules.some((r) => r.rule.id === 'RUL-03'),
    'RUL-03 must trigger when SRV-03 Conectividad fails independently in SCN-04',
  );
  assert.ok(
    result.synchronizedActions.some((a) => a.id === 'ACTN-SCN-04-RUL-03'),
  );
});

test('end-to-end deterministic pipeline connects scenario, dependencies, index, rules, continuity, and routes across all facilities', () => {
  const scenario = SCENARIOS[2]; // SCN-03 Restricción de accesos
  const graph = evaluateDependencies(SERVICES, DEPENDENCIES, scenario);
  const risk = calculateOperationalIndex(scenario, graph.nodes);
  const rulesRes = runRuleEngine(
    RULES,
    scenario,
    graph,
    INITIAL_HISTORICAL_ACTIONS,
    '2026-11-12T10:10:00',
  );
  const continuity = evaluateContinuity(
    CONTINUITY_ACTIVITIES,
    FACILITIES,
    graph,
    {},
    {},
  );
  const routeFromEd03 = findDidacticPath('ED-03', ['PF-01', 'PF-02'], ROUTE_SEGMENTS, []);

  assert.ok(risk.score >= 45);
  assert.ok(rulesRes.matchedRules.some((r) => r.rule.id === 'RUL-07'));
  assert.ok(continuity.plans.some((p) => p.status !== 'NORMAL'));
  assert.equal(routeFromEd03.reachable, true);
});

test('deriveScenarioSegmentConditions reacts to scenario access restrictions and heavy rain', () => {
  const scn03 = SCENARIOS[2]; // SCN-03: SRV-04 NO_DISPONIBLE, rain 78%, accessRestriction 82%
  const graph03 = evaluateDependencies(SERVICES, DEPENDENCIES, scn03);
  const conds03 = deriveScenarioSegmentConditions(scn03, graph03, ROUTE_SEGMENTS);

  assert.equal(conds03['SEG-A2']?.severity, 'BLOQUEADO_ESCENARIO');
  assert.equal(conds03['SEG-A1']?.severity, 'PRECAUCION_ESCENARIO');

  const blockedByScenario = Object.values(conds03)
    .filter((c) => c.severity === 'BLOQUEADO_ESCENARIO')
    .map((c) => c.segmentId);
  const reroutedFromAcc1 = findDidacticPath(
    'ACC-1',
    ['PF-01', 'PF-02'],
    ROUTE_SEGMENTS,
    blockedByScenario,
  );
  assert.equal(reroutedFromAcc1.reachable, true);
  assert.equal(reroutedFromAcc1.rerouted, true);
  assert.ok(!reroutedFromAcc1.segmentIds.includes('SEG-A2'));

  const scn01 = SCENARIOS[0]; // SCN-01: rain 48%, SRV-04 EN_OBSERVACION
  const graph01 = evaluateDependencies(SERVICES, DEPENDENCIES, scn01);
  const conds01 = deriveScenarioSegmentConditions(scn01, graph01, ROUTE_SEGMENTS);
  assert.equal(conds01['SEG-A1']?.severity, 'PRECAUCION_ESCENARIO');

  const scn02 = SCENARIOS[1]; // SCN-02: rain 68%
  const graph02 = evaluateDependencies(SERVICES, DEPENDENCIES, scn02);
  const conds02 = deriveScenarioSegmentConditions(scn02, graph02, ROUTE_SEGMENTS);
  assert.equal(conds02['SEG-A2']?.severity, 'PRECAUCION_ESCENARIO');
});

test('demoSequence enforces 65s human gate and rule engine avoids duplicate actions across rewind/replay', () => {
  // Cannot skip past 65s while human gate is unresolved
  assert.equal(computeEffectiveDemoTargetSecond(75, false), 65);
  assert.equal(computeEffectiveDemoTargetSecond(90, false), 65);
  assert.equal(computeEffectiveDemoTargetSecond(50, false), 50);
  // Once resolved, 75s-90s are accessible
  assert.equal(computeEffectiveDemoTargetSecond(75, true), 75);
  assert.equal(computeEffectiveDemoTargetSecond(90, true), 90);

  // Forward -> rewind -> forward produces exact deterministic action count without duplicates
  const applyStepToScenario = (stepIdx: number) => {
    const built = buildDemoScenarioStateAtStep(stepIdx);
    return {
      ...SCENARIOS[1],
      inputs: built.inputs,
      serviceOverrides: built.serviceOverrides,
    };
  };

  const s40a = applyStepToScenario(4); // 40s outage
  const g40a = evaluateDependencies(SERVICES, DEPENDENCIES, s40a);
  const r40a = runRuleEngine(RULES, s40a, g40a, INITIAL_HISTORICAL_ACTIONS, '2026-11-12T12:00:00');

  const s20 = applyStepToScenario(2); // rewind to 20s rain
  const g20 = evaluateDependencies(SERVICES, DEPENDENCIES, s20);
  const r20 = runRuleEngine(RULES, s20, g20, r40a.synchronizedActions, '2026-11-12T12:00:10');
  assert.ok(r20.synchronizedActions.length <= r40a.synchronizedActions.length);

  const s40b = applyStepToScenario(4); // replay to 40s outage
  const g40b = evaluateDependencies(SERVICES, DEPENDENCIES, s40b);
  const r40b = runRuleEngine(RULES, s40b, g40b, r20.synchronizedActions, '2026-11-12T12:00:20');

  assert.equal(r40b.synchronizedActions.length, r40a.synchronizedActions.length);
  const ids = r40b.synchronizedActions.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
});

