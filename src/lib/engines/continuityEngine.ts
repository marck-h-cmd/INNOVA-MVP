import {
  ContinuityActivity,
  ContinuityPlan,
  Facility,
  Role,
  ServiceStatus,
} from '../../types/domain';
import { DependencyGraphResult } from './dependencyEngine';

export interface ContinuityDecisionRecord {
  decision: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  actorRole?: Role;
  timestamp?: string;
}

export interface ContinuityEvaluationSummary {
  plans: ContinuityPlan[];
  normalCount: number;
  reviewCount: number;
  alternativeCount: number;
  suspendedCount: number;
  insufficientDataCount: number;
}

/**
 * Evaluates academic and administrative continuity for all activities.
 * Enforces safety and honesty rules:
 * - Never guarantees remote modality if Connectivity (SRV-03) is compromised or unconfirmed.
 * - Never declares a physical facility safe without competent assessment.
 * - Explicitly outputs "No es posible determinar una alternativa válida con los datos disponibles." if info is insufficient.
 */
export function evaluateContinuity(
  activities: ContinuityActivity[],
  facilities: Facility[],
  graph: DependencyGraphResult,
  decisions: Record<string, ContinuityDecisionRecord>,
  observations: Record<
    string,
    { id: string; note: string; authorRole: Role; timestamp: string }[]
  >,
): ContinuityEvaluationSummary {
  const facilityMap = new Map(facilities.map((f) => [f.id, f]));

  const plans: ContinuityPlan[] = activities.map((activity) => {
    const facility = facilityMap.get(activity.facilityId);
    const originalFacilityName = facility?.name ?? activity.facilityId;

    const blockingServices: { id: string; name: string; status: ServiceStatus }[] = [];
    const unconfirmedServices: { id: string; name: string; status: ServiceStatus }[] = [];

    for (const srvId of activity.requiredServices) {
      const node = graph.nodes[srvId];
      if (!node) continue;
      if (node.effectiveStatus === 'SIN_CONFIRMAR') {
        unconfirmedServices.push({
          id: srvId,
          name: node.service.name,
          status: node.effectiveStatus,
        });
      } else if (
        node.effectiveStatus === 'NO_DISPONIBLE' ||
        node.effectiveStatus === 'LIMITADO' ||
        node.effectiveStatus === 'EN_OBSERVACION'
      ) {
        blockingServices.push({
          id: srvId,
          name: node.service.name,
          status: node.effectiveStatus,
        });
      } else if (node.requiresVerification && node.triggeredByDependencies.length > 0) {
        unconfirmedServices.push({
          id: srvId,
          name: node.service.name,
          status: 'SIN_CONFIRMAR',
        });
      }
    }

    const connectivityStatus = graph.nodes['SRV-03']?.effectiveStatus ?? 'SIN_CONFIRMAR';
    const connectivityViable = connectivityStatus === 'OPERATIVO';
    const accessStatus = graph.nodes['SRV-04']?.effectiveStatus ?? 'OPERATIVO';
    const decisionRec = decisions[activity.id] ?? { decision: 'PENDIENTE' };
    const teacherObservations = observations[activity.id] ?? [];

    const allIssues = [...blockingServices, ...unconfirmedServices];

    if (allIssues.length === 0) {
      return {
        activityId: activity.id,
        activityTitle: activity.title,
        originalMode: `${activity.operatingMode === 'REMOTA_COMPATIBLE' ? 'Remota' : 'Presencial'} · ${activity.scheduleLabel}`,
        originalFacilityName,
        status: 'NORMAL',
        proposedAlternative: 'Mantener actividad en condiciones actuales de demostración.',
        proposedMode: activity.operatingMode,
        explanation:
          'Todos los servicios habilitantes requeridos se reportan operativos en el escenario simulado.',
        blockingServices: [],
        limitations: ['Monitoreo continuo sujeto a cambios del escenario.'],
        approvalDecision: decisionRec.decision,
        approvedByRole: decisionRec.actorRole,
        approvedAt: decisionRec.timestamp,
        teacherObservations,
        simulated: true,
      };
    }

    // Check if there are only unconfirmed services and no clear confirmed failure -> cannot determine valid alternative
    const hasHardOutage = blockingServices.some(
      (b) => b.status === 'NO_DISPONIBLE' || b.status === 'LIMITADO',
    );
    const hasOnlyUnconfirmed = !hasHardOutage && unconfirmedServices.length > 0 && blockingServices.length === 0;

    if (hasOnlyUnconfirmed && !activity.remoteCompatible) {
      return {
        activityId: activity.id,
        activityTitle: activity.title,
        originalMode: `Presencial · ${activity.scheduleLabel}`,
        originalFacilityName,
        status: 'DATOS_INSUFICIENTES',
        proposedAlternative:
          'No es posible determinar una alternativa válida con los datos disponibles.',
        proposedMode: 'REPROGRAMABLE',
        explanation: `Existen servicios dependientes sin confirmar (${unconfirmedServices
          .map((s) => s.name)
          .join(', ')}) y la actividad no admite modalidad remota.`,
        blockingServices: unconfirmedServices,
        limitations: [
          'Se requiere verificación presencial o técnica previa antes de reasignar espacio.',
          'Las alternativas son sugerencias sujetas a aprobación humana.',
        ],
        approvalDecision: decisionRec.decision,
        approvedByRole: decisionRec.actorRole,
        approvedAt: decisionRec.timestamp,
        teacherObservations,
        simulated: true,
      };
    }

    // Evaluate remote alternative only if compatible AND connectivity is strictly OPERATIVO
    if (activity.remoteCompatible && connectivityViable) {
      return {
        activityId: activity.id,
        activityTitle: activity.title,
        originalMode: `Presencial · ${activity.scheduleLabel}`,
        originalFacilityName,
        status: 'ALTERNATIVA_PROPUESTA',
        proposedAlternative:
          'Evaluar transición temporal a modalidad remota síncrona o asíncrona (sujeta a confirmación docente).',
        proposedMode: 'REMOTA_COMPATIBLE',
        explanation: `Servicios presenciales comprometidos (${allIssues
          .map((s) => `${s.name}: ${s.status}`)
          .join(', ')}), mientras Conectividad (SRV-03) permanece OPERATIVO.`,
        blockingServices: allIssues,
        limitations: [
          'La conectividad de estudiantes externos no puede garantizarse desde este sistema.',
          'Requiere aprobación del rol Autoridad.',
        ],
        approvalDecision: decisionRec.decision,
        approvedByRole: decisionRec.actorRole,
        approvedAt: decisionRec.timestamp,
        teacherObservations,
        simulated: true,
      };
    }

    // Evaluate alternative fictional space ONLY if physical outage is localized to access/facility and another space is viable
    if (
      activity.alternativeFacilityId &&
      accessStatus !== 'NO_DISPONIBLE' &&
      graph.nodes['SRV-01']?.effectiveStatus === 'OPERATIVO'
    ) {
      const altFacility = facilityMap.get(activity.alternativeFacilityId);
      return {
        activityId: activity.id,
        activityTitle: activity.title,
        originalMode: `Presencial · ${activity.scheduleLabel}`,
        originalFacilityName,
        status: 'ALTERNATIVA_PROPUESTA',
        proposedAlternative: `Evaluar reubicación hacia ${
          altFacility?.name ?? activity.alternativeFacilityId
        } previa inspección técnica competente.`,
        proposedMode: 'ESPACIO_ALTERNATIVO',
        explanation: `El espacio original presenta restricción parcial, mientras ${
          altFacility?.name ?? 'el espacio alternativo'
        } mantiene servicios básicos operativos en simulación.`,
        blockingServices: allIssues,
        limitations: [
          'Prohibido declarar un ambiente como seguro sin evaluación competente.',
          'Requiere aprobación formal de Autoridad.',
        ],
        approvalDecision: decisionRec.decision,
        approvedByRole: decisionRec.actorRole,
        approvedAt: decisionRec.timestamp,
        teacherObservations,
        simulated: true,
      };
    }

    // If non-remote or connectivity is also compromised during hard outage -> suspend/reschedule
    if (hasHardOutage) {
      return {
        activityId: activity.id,
        activityTitle: activity.title,
        originalMode: `${activity.operatingMode === 'REMOTA_COMPATIBLE' ? 'Remota' : 'Presencial'} · ${activity.scheduleLabel}`,
        originalFacilityName,
        status: activity.remoteCompatible && !connectivityViable ? 'SUSPENDIDA_SIMULADA' : 'EN_REVISION',
        proposedAlternative:
          activity.remoteCompatible && !connectivityViable
            ? 'Suspender temporalmente o reprogramar: no es viable garantizar modalidad virtual porque Conectividad (SRV-03) no está operativa.'
            : 'Suspender temporalmente y reprogramar hasta verificar restablecimiento de Electricidad y Agua.',
        proposedMode: activity.remoteCompatible && !connectivityViable ? 'SUSPENDIDA' : 'REPROGRAMABLE',
        explanation: `Servicios requeridos afectados: ${allIssues
          .map((s) => `${s.name} (${s.status})`)
          .join(', ')}. ${
          !connectivityViable
            ? 'Conectividad comprometida impide garantizar alternativa virtual.'
            : 'Actividad requiere presencia física.'
        }`,
        blockingServices: allIssues,
        limitations: [
          'No se garantiza continuidad remota sin conectividad confirmada.',
          'Toda reprogramación requiere validación por Autoridad.',
        ],
        approvalDecision: decisionRec.decision,
        approvedByRole: decisionRec.actorRole,
        approvedAt: decisionRec.timestamp,
        teacherObservations,
        simulated: true,
      };
    }

    return {
      activityId: activity.id,
      activityTitle: activity.title,
      originalMode: `Presencial · ${activity.scheduleLabel}`,
      originalFacilityName,
      status: 'DATOS_INSUFICIENTES',
      proposedAlternative:
        'No es posible determinar una alternativa válida con los datos disponibles.',
      proposedMode: 'REPROGRAMABLE',
      explanation:
        'Existen servicios en observación o sin confirmar que impiden validar una alternativa segura.',
      blockingServices: allIssues,
      limitations: ['Completar verificación de servicios antes de aprobar alternativa.'],
      approvalDecision: decisionRec.decision,
      approvedByRole: decisionRec.actorRole,
      approvedAt: decisionRec.timestamp,
      teacherObservations,
      simulated: true,
    };
  });

  return {
    plans,
    normalCount: plans.filter((p) => p.status === 'NORMAL').length,
    reviewCount: plans.filter((p) => p.status === 'EN_REVISION').length,
    alternativeCount: plans.filter((p) => p.status === 'ALTERNATIVA_PROPUESTA').length,
    suspendedCount: plans.filter((p) => p.status === 'SUSPENDIDA_SIMULADA').length,
    insufficientDataCount: plans.filter((p) => p.status === 'DATOS_INSUFICIENTES').length,
  };
}
