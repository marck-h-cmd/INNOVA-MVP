import { ScenarioInputs, ServiceStatus } from '../../types/domain';

export interface DemoStepDefinition {
  id: string;
  second: number;
  title: string;
  description: string;
  phaseLabel: string;
  focusServiceId?: string;
  requiresHumanGate?: boolean;
  highlightSection: 'STATUS' | 'SOURCE' | 'RAIN' | 'INDEX' | 'OUTAGE' | 'GRAPH' | 'ACTIONS' | 'APPROVAL' | 'CONTINUITY' | 'EXPLAIN' | 'SUMMARY';
  inputsPatch?: Partial<ScenarioInputs>;
  serviceOverridesPatch?: Record<string, ServiceStatus>;
}

export const DEMO_SEQUENCE_STEPS: DemoStepDefinition[] = [
  {
    id: 'STEP-00',
    second: 0,
    phaseLabel: 'Línea base',
    title: 'Estado inicial operativo',
    description: 'Todos los servicios universitarios simulados inician en estado OPERATIVO bajo monitoreo preventivo.',
    highlightSection: 'STATUS',
    inputsPatch: {
      rainIntensity: 15,
      serviceDisruption: 0,
      accessRestriction: 10,
      continuityImpact: 10,
    },
    serviceOverridesPatch: {
      'SRV-01': 'OPERATIVO',
      'SRV-02': 'OPERATIVO',
      'SRV-03': 'OPERATIVO',
      'SRV-04': 'OPERATIVO',
      'SRV-05': 'OPERATIVO',
      'SRV-06': 'OPERATIVO',
    },
  },
  {
    id: 'STEP-10',
    second: 10,
    phaseLabel: 'Contexto',
    title: 'Fuente documental de referencia',
    description: 'Se vincula antecedente institucional UNT 2025 (ID 1772) y portal documental SENAMHI como contexto.',
    highlightSection: 'SOURCE',
  },
  {
    id: 'STEP-20',
    second: 20,
    phaseLabel: 'Detonante',
    title: 'Registro de lluvia intensa simulada',
    description: 'Se incrementa el parámetro de lluvia simulada al 68% y accesos al 35% para evaluar condiciones.',
    highlightSection: 'RAIN',
    inputsPatch: {
      rainIntensity: 68,
      accessRestriction: 35,
    },
  },
  {
    id: 'STEP-30',
    second: 30,
    phaseLabel: 'Evaluación',
    title: 'Incremento del índice de atención operativa',
    description: 'El cálculo determinista recalibra el índice de atención operativa simulada y activa inspección de drenajes.',
    highlightSection: 'INDEX',
    inputsPatch: {
      continuityImpact: 35,
    },
  },
  {
    id: 'STEP-40',
    second: 40,
    phaseLabel: 'Incidente',
    title: 'Interrupción eléctrica ficticia registrada',
    description: 'El suministro eléctrico simulado (SRV-01) pasa a NO_DISPONIBLE.',
    focusServiceId: 'SRV-01',
    highlightSection: 'OUTAGE',
    inputsPatch: {
      serviceDisruption: 72,
      continuityImpact: 62,
    },
    serviceOverridesPatch: {
      'SRV-01': 'NO_DISPONIBLE',
      'SRV-02': 'SIN_CONFIRMAR',
      'SRV-03': 'LIMITADO',
    },
  },
  {
    id: 'STEP-50',
    second: 50,
    phaseLabel: 'Propagación',
    title: 'Grafo resalta dependencias y verificación',
    description: 'Electricidad → Agua y Electricidad → Conectividad solicitan verificación técnica sin asumir falla automática.',
    focusServiceId: 'SRV-01',
    highlightSection: 'GRAPH',
  },
  {
    id: 'STEP-60',
    second: 60,
    phaseLabel: 'Respuesta',
    title: 'Motor genera acciones y borrador de aviso',
    description: 'Se sincronizan acciones priorizadas sin duplicados y se prepara un borrador pendiente de revisión humana.',
    focusServiceId: 'SRV-05',
    highlightSection: 'ACTIONS',
  },
  {
    id: 'STEP-65',
    second: 65,
    phaseLabel: 'Control humano',
    title: 'Pausa obligatoria para revisión humana',
    description: 'Este mensaje requiere aprobación antes de su difusión simulada. El cronómetro se detiene hasta recibir decisión.',
    focusServiceId: 'SRV-05',
    requiresHumanGate: true,
    highlightSection: 'APPROVAL',
  },
  {
    id: 'STEP-75',
    second: 75,
    phaseLabel: 'Continuidad',
    title: 'Resultado de decisión y continuidad afectada',
    description: 'Se refleja el estado de la comunicación y las alternativas de continuidad propuestas para cada actividad.',
    focusServiceId: 'SRV-05',
    highlightSection: 'CONTINUITY',
  },
  {
    id: 'STEP-85',
    second: 85,
    phaseLabel: 'Trazabilidad',
    title: 'Explicabilidad de reglas y fuentes',
    description: 'Se abre la trazabilidad completa: Entrada → Regla → Dependencia → Acción → Fuente y limitaciones.',
    highlightSection: 'EXPLAIN',
  },
  {
    id: 'STEP-90',
    second: 90,
    phaseLabel: 'Cierre',
    title: 'Resumen final de la simulación',
    description: 'Consolidado verificable calculado directamente desde el estado del motor determinista.',
    highlightSection: 'SUMMARY',
  },
];

export function computeDemoStepAtSecond(elapsedSeconds: number): number {
  let idx = 0;
  for (let i = 0; i < DEMO_SEQUENCE_STEPS.length; i++) {
    if (elapsedSeconds >= DEMO_SEQUENCE_STEPS[i].second) {
      idx = i;
    }
  }
  return idx;
}

/**
 * Prevents skipping past the mandatory 65s human approval gate when the gate has not been resolved.
 */
export function computeEffectiveDemoTargetSecond(
  requestedSecond: number,
  gateResolved: boolean,
): number {
  const clamped = Math.max(0, Math.min(90, requestedSecond));
  if (clamped > 65 && !gateResolved) {
    return 65;
  }
  return clamped;
}

export function buildDemoScenarioStateAtStep(stepIndex: number): {
  inputs: ScenarioInputs;
  serviceOverrides: Record<string, ServiceStatus>;
} {
  let inputs: ScenarioInputs = {
    rainIntensity: 15,
    serviceDisruption: 0,
    accessRestriction: 10,
    continuityImpact: 10,
  };
  let serviceOverrides: Record<string, ServiceStatus> = {};

  for (let i = 0; i <= Math.min(stepIndex, DEMO_SEQUENCE_STEPS.length - 1); i++) {
    const step = DEMO_SEQUENCE_STEPS[i];
    if (step.inputsPatch) {
      inputs = { ...inputs, ...step.inputsPatch };
    }
    if (step.serviceOverridesPatch) {
      serviceOverrides = { ...serviceOverrides, ...step.serviceOverridesPatch };
    }
  }

  return { inputs, serviceOverrides };
}
