import {
  IndexComponentBreakdown,
  RiskExplanation,
  RiskLevel,
  Scenario,
  ServiceStatus,
} from '../../types/domain';
import { EvaluatedServiceNode } from './dependencyEngine';

const STATUS_SEVERITY_WEIGHT: Record<ServiceStatus, number> = {
  OPERATIVO: 0,
  EN_OBSERVACION: 0.35,
  SIN_CONFIRMAR: 0.45,
  LIMITADO: 0.70,
  NO_DISPONIBLE: 1.0,
};

function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function classifyOperationalLevel(score: number): {
  level: RiskLevel;
  label: string;
} {
  if (score <= 24) return { level: 'BAJO', label: 'Bajo' };
  if (score <= 49) return { level: 'MODERADO', label: 'Moderado' };
  if (score <= 74) return { level: 'ALTO', label: 'Alto' };
  return { level: 'CRITICO', label: 'Crítico' };
}

/**
 * Computes the didactic Operational Attention Index (0..100):
 * indice = round(100 * (0.30 * rain + 0.30 * services + 0.25 * access + 0.15 * continuity))
 * Incorporates real evaluated service statuses so toggling a service directly shifts the score.
 */
export function calculateOperationalIndex(
  scenario: Scenario,
  evaluatedNodes: Record<string, EvaluatedServiceNode>,
): RiskExplanation {
  const rainNormalized = clamp01(scenario.inputs.rainIntensity / 100);

  // Compute service disruption both from explicit service statuses and scenario input
  const nodeList = Object.values(evaluatedNodes);
  let weightedSeveritySum = 0;
  let totalCriticality = 0;
  for (const node of nodeList) {
    const weight = node.service.criticality;
    let statusWeight = STATUS_SEVERITY_WEIGHT[node.effectiveStatus];
    // If service is operational on paper but flagged by an active upstream dependency, add small verification factor
    if (node.effectiveStatus === 'OPERATIVO' && node.triggeredByDependencies.length > 0) {
      statusWeight = 0.2;
    }
    weightedSeveritySum += weight * statusWeight;
    totalCriticality += weight;
  }

  const computedServiceRatio =
    totalCriticality > 0 ? weightedSeveritySum / totalCriticality : 0;
  const inputServiceRatio = clamp01(scenario.inputs.serviceDisruption / 100);
  // Combine so both slider adjustments and direct service overrides reliably update the index
  const servicesNormalized = clamp01(
    Math.max(inputServiceRatio, computedServiceRatio, (inputServiceRatio + computedServiceRatio) / 2),
  );

  // Access factor reflects SRV-04 status if degraded, combined with scenario accessRestriction
  const accessNode = evaluatedNodes['SRV-04'];
  const accessStatusFactor = accessNode
    ? STATUS_SEVERITY_WEIGHT[accessNode.effectiveStatus]
    : 0;
  const accessNormalized = clamp01(
    Math.max(scenario.inputs.accessRestriction / 100, accessStatusFactor),
  );

  const continuityNormalized = clamp01(scenario.inputs.continuityImpact / 100);

  const rawScore =
    100 *
    (0.3 * rainNormalized +
      0.3 * servicesNormalized +
      0.25 * accessNormalized +
      0.15 * continuityNormalized);

  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  const { level, label } = classifyOperationalLevel(score);

  const components: IndexComponentBreakdown[] = [
    {
      key: 'rain',
      label: 'Intensidad de lluvia simulada',
      weight: 0.3,
      rawValue: Math.round(rainNormalized * 100),
      normalizedValue: Number(rainNormalized.toFixed(3)),
      weightedContribution: Number((100 * 0.3 * rainNormalized).toFixed(1)),
      explanation: `Parámetro simulado del escenario (${scenario.inputs.rainIntensity}%).`,
    },
    {
      key: 'services',
      label: 'Interrupción y verificación de servicios',
      weight: 0.3,
      rawValue: Math.round(servicesNormalized * 100),
      normalizedValue: Number(servicesNormalized.toFixed(3)),
      weightedContribution: Number((100 * 0.3 * servicesNormalized).toFixed(1)),
      explanation: `Combina estado real de los 6 servicios críticos (${Math.round(
        computedServiceRatio * 100,
      )}%) y severidad del escenario (${scenario.inputs.serviceDisruption}%).`,
    },
    {
      key: 'access',
      label: 'Restricción de accesos',
      weight: 0.25,
      rawValue: Math.round(accessNormalized * 100),
      normalizedValue: Number(accessNormalized.toFixed(3)),
      weightedContribution: Number((100 * 0.25 * accessNormalized).toFixed(1)),
      explanation: `Estado de Accesos (${
        accessNode?.effectiveStatus ?? 'OPERATIVO'
      }) y restricción simulada (${scenario.inputs.accessRestriction}%).`,
    },
    {
      key: 'continuity',
      label: 'Impacto en continuidad',
      weight: 0.15,
      rawValue: Math.round(continuityNormalized * 100),
      normalizedValue: Number(continuityNormalized.toFixed(3)),
      weightedContribution: Number((100 * 0.15 * continuityNormalized).toFixed(1)),
      explanation: `Sensibilidad de actividades académicas y administrativas (${scenario.inputs.continuityImpact}%).`,
    },
  ];

  const formulaText = `redondear(100 × (0.30 × ${rainNormalized.toFixed(
    2,
  )} + 0.30 × ${servicesNormalized.toFixed(2)} + 0.25 × ${accessNormalized.toFixed(
    2,
  )} + 0.15 × ${continuityNormalized.toFixed(2)})) = ${score}`;

  return {
    score,
    level,
    label,
    displayLabel: 'Atención operativa simulada',
    formulaText,
    components,
    disclaimer:
      'Indicador didáctico de atención operativa simulada. No representa riesgo físico oficial ni probabilidad de inundación.',
  };
}
