import { RiskExplanation, Scenario, Source } from '../../types/domain';
import { RuleMatchEvaluation } from './ruleEngine';
import { DependencyGraphResult } from './dependencyEngine';
import { ContinuityEvaluationSummary } from './continuityEngine';

export interface StructuredExplanationInput {
  scenario: Scenario;
  riskIndex: RiskExplanation;
  dependencyGraph: DependencyGraphResult;
  matchedRules: RuleMatchEvaluation[];
  continuity: ContinuityEvaluationSummary;
  sources: Source[];
}

export interface ExplanationResult {
  text: string;
  provider: 'local-template' | 'gemini';
  model?: string;
  disclaimer: string;
}

/**
 * Generates a deterministic, offline-capable Spanish explanation strictly from engine outputs.
 * Never invents risks, rules, sources, or safety guarantees.
 */
export function buildLocalExplanation(input: StructuredExplanationInput): ExplanationResult {
  const { scenario, riskIndex, dependencyGraph, matchedRules, continuity } = input;
  const verifyNames = dependencyGraph.servicesRequiringVerification.map(
    (n) => `${n.service.name} (${n.effectiveStatus})`,
  );
  const affectedPlans = continuity.plans.filter((p) => p.status !== 'NORMAL');

  const lines = [
    `1. Situación determinista (${scenario.title}): el índice de atención operativa simulada es ${riskIndex.score}/100 (nivel ${riskIndex.label}), calculado a partir de lluvia simulada (${scenario.inputs.rainIntensity}%), estado de servicios (${riskIndex.components[1]?.rawValue ?? 0}%), restricción de accesos (${riskIndex.components[2]?.rawValue ?? 0}%) e impacto de continuidad (${scenario.inputs.continuityImpact}%).`,
    `2. Reglas y dependencias activas: ${
      matchedRules.length > 0
        ? `se activaron ${matchedRules.length} reglas (${matchedRules
            .map((m) => `${m.rule.id}: ${m.rule.name}`)
            .slice(0, 3)
            .join('; ')}).`
        : 'no se activaron reglas de contingencia.'
    } ${
      verifyNames.length > 0
        ? `Servicios que requieren verificación: ${verifyNames.join(', ')}.`
        : 'Todos los servicios figuran operativos.'
    }`,
    `3. Continuidad y revisión humana: ${affectedPlans.length} de ${continuity.plans.length} actividades requieren revisión o alternativa. Ninguna decisión es automática: las comunicaciones y alternativas requieren validación explícita del rol Autoridad.`,
  ];

  return {
    text: lines.join('\n\n'),
    provider: 'local-template',
    disclaimer:
      'Explicación determinista local (sin API externa); requiere revisión humana.',
  };
}

/**
 * Optional server-backed Gemini explanation. Automatically falls back to deterministic local template
 * if offline, unconfigured, or if the server returns an error.
 */
export async function requestAssistedExplanation(
  input: StructuredExplanationInput,
): Promise<ExplanationResult> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return buildLocalExplanation(input);
  }

  const compactPayload = {
    scenarioTitle: input.scenario.title,
    simulated: input.scenario.simulated,
    indexScore: input.riskIndex.score,
    indexLevel: input.riskIndex.label,
    formula: input.riskIndex.formulaText,
    servicesToVerify: input.dependencyGraph.servicesRequiringVerification.map((n) => ({
      id: n.service.id,
      name: n.service.name,
      status: n.effectiveStatus,
      triggeredBy: n.triggeredByDependencies.map((d) => d.sourceServiceName),
    })),
    activeRules: input.matchedRules.map((m) => ({
      id: m.rule.id,
      name: m.rule.name,
      reason: m.triggerReason,
      responsibleRole: m.rule.responsibleRole,
      sourceId: m.rule.sourceId,
    })),
    affectedActivitiesCount: input.continuity.plans.filter((p) => p.status !== 'NORMAL').length,
    totalActivities: input.continuity.plans.length,
    referencedSources: input.sources
      .filter((s) => input.scenario.sourceIds.includes(s.id))
      .map((s) => ({ id: s.id, title: s.title, institution: s.institution, type: s.type })),
  };

  try {
    const res = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contextPayload: compactPayload }),
    });

    if (!res.ok) {
      return buildLocalExplanation(input);
    }

    const data = (await res.json()) as {
      explanation?: string;
      provider?: string;
      model?: string;
      disclaimer?: string;
    };

    if (!data.explanation) {
      return buildLocalExplanation(input);
    }

    return {
      text: data.explanation,
      provider: 'gemini',
      model: data.model ?? 'gemini-4-hydrogen',
      disclaimer: data.disclaimer ?? 'Explicación asistida, requiere revisión humana',
    };
  } catch {
    return buildLocalExplanation(input);
  }
}
