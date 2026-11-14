import { z } from 'zod';

export type Role =
  | 'ESTUDIANTE'
  | 'DOCENTE'
  | 'ADMINISTRATIVO'
  | 'BRIGADISTA'
  | 'COORDINADOR_GRD'
  | 'AUTORIDAD';

export type ServiceStatus =
  | 'OPERATIVO'
  | 'EN_OBSERVACION'
  | 'LIMITADO'
  | 'NO_DISPONIBLE'
  | 'SIN_CONFIRMAR';

export type RiskLevel = 'BAJO' | 'MODERADO' | 'ALTO' | 'CRITICO';

export type ActionStatus = 'PENDIENTE' | 'EN_REVISION' | 'VERIFICADA' | 'CERRADA';

export type AlertStatus =
  | 'BORRADOR'
  | 'PENDIENTE_APROBACION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'DIFUNDIDA';

export type SourceType = 'OFICIAL' | 'HISTORICO' | 'SIMULADO';

export type PriorityLevel = 'ALTA' | 'MEDIA' | 'BAJA';

export type OperatingMode =
  | 'PRESENCIAL'
  | 'REMOTA_COMPATIBLE'
  | 'REPROGRAMABLE'
  | 'ESPACIO_ALTERNATIVO'
  | 'SUSPENDIDA';

export interface Source {
  id: string;
  title: string;
  institution: string;
  date: string;
  scope: string;
  url: string;
  type: SourceType;
  evidenceType: string;
  limitations: string;
}

export interface ScenarioInputs {
  rainIntensity: number; // 0-100
  serviceDisruption: number; // 0-100
  accessRestriction: number; // 0-100
  continuityImpact: number; // 0-100
}

export interface ScenarioEvent {
  id: string;
  timestampLabel: string;
  title: string;
  description: string;
  sourceId: string;
  simulated: boolean;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  simulated: boolean;
  inputs: ScenarioInputs;
  serviceOverrides: Record<string, ServiceStatus>;
  sourceIds: string[];
  events: ScenarioEvent[];
}

export interface Facility {
  id: string;
  name: string;
  code: string;
  zone: string;
  capacitySimulated: number;
  serviceIds: string[];
  simulated: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Service {
  id: string;
  name: string;
  category: 'INFRAESTRUCTURA' | 'ACCESIBILIDAD' | 'MISIONAL';
  status: ServiceStatus;
  criticality: number; // 1 to 5
  simulated: boolean;
  description: string;
  sourceId: string;
}

export interface Dependency {
  id: string;
  sourceServiceId: string;
  targetServiceId: string;
  condition: string;
  evidenceType: 'ANTECEDENTE_DOCUMENTAL' | 'EJEMPLO_SIMULACION';
  sourceId: string;
  rationale: string;
  simulated: boolean;
}

export interface RuleCondition {
  serviceId?: string;
  expectedStatuses?: ServiceStatus[];
  minRainIntensity?: number;
  minAccessRestriction?: number;
  minContinuityImpact?: number;
  requiresDependencyOn?: string;
}

export interface Rule {
  id: string;
  name: string;
  condition: string;
  matcher: RuleCondition;
  priority: PriorityLevel;
  action: string;
  responsibleRole: Role;
  justification: string;
  sourceId: string;
  version: string;
  suggestedTargetServiceId?: string;
}

export interface Action {
  id: string;
  ruleId: string;
  scenarioId: string;
  title: string;
  priority: PriorityLevel;
  status: ActionStatus;
  responsibleRole: Role;
  serviceId: string;
  justification: string;
  evidence: string;
  sourceId: string;
  ruleVersion: string;
  simulated: boolean;
  isHistoricalSeed?: boolean;
  updatedAt: string;
}

export interface Protocol {
  id: string;
  phase: 'ANTES' | 'DURANTE' | 'DESPUES';
  title: string;
  objective: string;
  generalActions: string[];
  responsibleRole: Role;
  sourceId: string;
  evidenceClassification: 'VERIFICADA' | 'DIDACTICA';
  warnings: string[];
}

export interface Approval {
  id: string;
  targetType: 'ALERTA' | 'CONTINUIDAD';
  targetId: string;
  decision: 'APROBADO' | 'RECHAZADO';
  actorRole: Role;
  note: string;
  timestamp: string;
}

export interface DeliveryReceipt {
  id: string;
  alertId: string;
  mailboxId: string;
  mailboxLabel: string;
  audience: string;
  status: 'ENTREGADO' | 'PENDIENTE' | 'LEIDO' | 'SIN_CONFIRMAR';
  readAt?: string;
}

export interface Alert {
  id: string;
  title: string;
  audience: 'Comunidad general' | 'Estudiantes y docentes' | 'Personal operativo' | 'Autoridades y coordinación';
  scenarioId: string;
  body: string;
  status: AlertStatus;
  creatorRole: Role;
  approverRole?: Role;
  approvedAt?: string;
  rejectionReason?: string;
  sourceId: string;
  simulated: boolean;
  createdAt: string;
}

export interface Mailbox {
  id: string;
  name: string;
  roleLabel: string;
  audience: string;
  simulated: boolean;
}

export interface ContinuityActivity {
  id: string;
  title: string;
  category: 'ACADEMICA' | 'INVESTIGACION' | 'SERVICIO_ESTUDIANTIL' | 'ADMINISTRATIVA';
  facilityId: string;
  requiredServices: string[];
  constraints: string[];
  operatingMode: OperatingMode;
  scheduleLabel: string;
  remoteCompatible: boolean;
  alternativeFacilityId?: string;
  simulated: boolean;
}

export interface ContinuityPlan {
  activityId: string;
  activityTitle: string;
  originalMode: string;
  originalFacilityName: string;
  status: 'NORMAL' | 'EN_REVISION' | 'ALTERNATIVA_PROPUESTA' | 'SUSPENDIDA_SIMULADA' | 'DATOS_INSUFICIENTES';
  proposedAlternative: string;
  proposedMode: OperatingMode;
  explanation: string;
  blockingServices: { id: string; name: string; status: ServiceStatus }[];
  limitations: string[];
  approvalDecision: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
  approvedByRole?: Role;
  approvedAt?: string;
  teacherObservations: { id: string; note: string; authorRole: Role; timestamp: string }[];
  simulated: boolean;
}

export interface IndexComponentBreakdown {
  key: 'rain' | 'services' | 'access' | 'continuity';
  label: string;
  weight: number;
  rawValue: number;
  normalizedValue: number;
  weightedContribution: number;
  explanation: string;
}

export interface RiskExplanation {
  score: number;
  level: RiskLevel;
  label: string;
  displayLabel: 'Atención operativa simulada';
  formulaText: string;
  components: IndexComponentBreakdown[];
  disclaimer: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actorRole: Role;
  eventType:
    | 'CAMBIO_ESCENARIO'
    | 'CAMBIO_SERVICIO'
    | 'CAMBIO_PARAMETRO'
    | 'ACCION_ACTUALIZADA'
    | 'COMUNICACION_CREADA'
    | 'COMUNICACION_ENVIADA_REVISION'
    | 'COMUNICACION_APROBADA'
    | 'COMUNICACION_RECHAZADA'
    | 'COMUNICACION_DIFUNDIDA'
    | 'LECTURA_CONFIRMADA'
    | 'CONTINUIDAD_DECIDIDA'
    | 'OBSERVACION_DOCENTE'
    | 'RUTA_MODIFICADA'
    | 'DEMO_EVENTO'
    | 'DATOS_RESTABLECIDOS';
  summary: string;
  previousState: string;
  nextState: string;
  scenarioId: string;
  sourceId?: string;
  simulated: boolean;
}

export interface DidacticRouteSegment {
  id: string;
  from: string;
  to: string;
  label: string;
  distanceMetersSimulated: number;
}

export interface DidacticRoute {
  id: string;
  name: string;
  fromEntrance: string;
  toMeetingPointId: string;
  nodePath: string[];
  segmentIds: string[];
  simulated: boolean;
}

export interface MeetingPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  description: string;
  simulated: boolean;
}

export interface PersistedState {
  activeRole: Role;
  activeScenarioId: string;
  theme: 'light' | 'dark';
  reducedMotion: boolean;
  scenarios: Scenario[];
  actions: Action[];
  alerts: Alert[];
  receipts: DeliveryReceipt[];
  approvals: Approval[];
  continuityDecisions: Record<
    string,
    {
      decision: 'PENDIENTE' | 'APROBADO' | 'RECHAZADO';
      actorRole?: Role;
      timestamp?: string;
    }
  >;
  teacherObservations: Record<
    string,
    { id: string; note: string; authorRole: Role; timestamp: string }[]
  >;
  blockedSegmentIds: string[];
  auditLog: AuditEntry[];
}

export const PersistedStateSchema = z.object({
  activeRole: z.enum([
    'ESTUDIANTE',
    'DOCENTE',
    'ADMINISTRATIVO',
    'BRIGADISTA',
    'COORDINADOR_GRD',
    'AUTORIDAD',
  ]),
  activeScenarioId: z.string().min(1),
  theme: z.enum(['light', 'dark']),
  reducedMotion: z.boolean(),
  scenarios: z.array(z.any()),
  actions: z.array(z.any()),
  alerts: z.array(z.any()),
  receipts: z.array(z.any()),
  approvals: z.array(z.any()),
  continuityDecisions: z.record(z.string(), z.any()),
  teacherObservations: z.record(z.string(), z.any()),
  blockedSegmentIds: z.array(z.string()),
  auditLog: z.array(z.any()),
});
