import { create } from 'zustand';
import {
  Action,
  ActionStatus,
  Alert,
  Approval,
  AuditEntry,
  DeliveryReceipt,
  PersistedState,
  PersistedStateSchema,
  Role,
  ScenarioInputs,
  ServiceStatus,
} from '../types/domain';
import {
  DEPENDENCIES,
  INITIAL_ALERTS,
  INITIAL_AUDIT_LOG,
  INITIAL_HISTORICAL_ACTIONS,
  INITIAL_RECEIPTS,
  MAILBOXES,
  RULES,
  SCENARIOS,
  SERVICES,
} from '../data/seedData';
import { evaluateDependencies } from '../lib/engines/dependencyEngine';
import { runRuleEngine } from '../lib/engines/ruleEngine';
import { canRoleUpdateAction, getPermissions } from '../lib/engines/permissions';
import { DEMO_SEQUENCE_STEPS } from '../lib/engines/demoSequence';

const STORAGE_KEY = 'nexo_unt_state_v1';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone: 'info' | 'success' | 'warning' | 'error';
}

export interface InspectedDecision {
  kind: 'ACTION' | 'RULE' | 'CONTINUITY';
  id: string;
  title: string;
  ruleId?: string;
  ruleCondition?: string;
  ruleVersion?: string;
  serviceId?: string;
  justification: string;
  sourceId: string;
  evidence: string;
  limitations: string[];
}

function nowIso(): string {
  return new Date().toISOString().slice(0, 19);
}

function buildInitialPersistedState(): PersistedState {
  const defaultScenario = SCENARIOS[1]; // SCN-02 Interrupción eléctrica
  const graph = evaluateDependencies(SERVICES, DEPENDENCIES, defaultScenario);
  const { synchronizedActions } = runRuleEngine(
    RULES,
    defaultScenario,
    graph,
    INITIAL_HISTORICAL_ACTIONS,
    '2026-11-12T09:30:00',
  );

  return {
    activeRole: 'COORDINADOR_GRD',
    activeScenarioId: defaultScenario.id,
    theme: 'light',
    reducedMotion: false,
    scenarios: SCENARIOS,
    actions: synchronizedActions,
    alerts: INITIAL_ALERTS,
    receipts: INITIAL_RECEIPTS,
    approvals: [],
    continuityDecisions: {},
    teacherObservations: {},
    blockedSegmentIds: [],
    auditLog: INITIAL_AUDIT_LOG,
  };
}

function loadFromLocalStorage(): PersistedState {
  const fallback = buildInitialPersistedState();
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const validated = PersistedStateSchema.safeParse(parsed);
    if (!validated.success) {
      return fallback;
    }
    return validated.data as PersistedState;
  } catch {
    return fallback;
  }
}

function saveToLocalStorage(state: PersistedState): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Safe ignore when storage quota is unavailable
  }
}

function extractPersisted(state: NexoStore): PersistedState {
  return {
    activeRole: state.activeRole,
    activeScenarioId: state.activeScenarioId,
    theme: state.theme,
    reducedMotion: state.reducedMotion,
    scenarios: state.scenarios,
    actions: state.actions,
    alerts: state.alerts,
    receipts: state.receipts,
    approvals: state.approvals,
    continuityDecisions: state.continuityDecisions,
    teacherObservations: state.teacherObservations,
    blockedSegmentIds: state.blockedSegmentIds,
    auditLog: state.auditLog,
  };
}

function syncRulesForScenario(
  scenarioId: string,
  scenarios: PersistedState['scenarios'],
  actions: Action[],
): Action[] {
  const target = scenarios.find((s) => s.id === scenarioId);
  if (!target) return actions;
  const graph = evaluateDependencies(SERVICES, DEPENDENCIES, target);
  return runRuleEngine(RULES, target, graph, actions, nowIso()).synchronizedActions;
}

export interface NexoStore extends PersistedState {
  toasts: ToastMessage[];
  inspectedDecision: InspectedDecision | null;
  whatIfOpen: boolean;
  commandPaletteOpen: boolean;
  simulatedOffline: boolean;

  // UI & preferences
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  setReducedMotion: (val: boolean) => void;
  setSimulatedOffline: (val: boolean) => void;
  setWhatIfOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  openDecisionInspector: (item: InspectedDecision) => void;
  closeDecisionInspector: () => void;
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  dismissToast: (id: string) => void;

  // Role switching (preserves active scenario)
  setActiveRole: (role: Role) => void;

  // Scenario & Service operations
  selectScenario: (scenarioId: string) => void;
  updateScenarioInputs: (patch: Partial<ScenarioInputs>) => void;
  overrideServiceStatus: (serviceId: string, status: ServiceStatus) => void;
  resetScenarioToBaseline: (scenarioId: string) => void;
  applyWhatIfAlternative: (
    serviceOverrides: Record<string, ServiceStatus>,
    inputsPatch: Partial<ScenarioInputs>,
    summaryLabel: string,
  ) => void;

  // Actions
  updateActionStatus: (actionId: string, nextStatus: ActionStatus, evidenceNote?: string) => void;

  // Communications & human approval
  createAlertDraft: (input: {
    title: string;
    audience: Alert['audience'];
    body: string;
    sourceId: string;
    submitImmediately?: boolean;
  }) => { ok: boolean; error?: string; alertId?: string };
  submitAlertForApproval: (alertId: string) => void;
  approveAlert: (alertId: string, note?: string) => void;
  rejectAlert: (alertId: string, reason: string) => void;
  broadcastAlert: (alertId: string) => void;
  markReceiptRead: (receiptId: string) => void;
  confirmCommunityReading: (alertId: string) => void;

  // Continuity
  decideContinuityAlternative: (
    activityId: string,
    decision: 'APROBADO' | 'RECHAZADO',
    note?: string,
  ) => void;
  addTeacherObservation: (activityId: string, note: string) => void;

  // Didactic Campus Map routes
  toggleBlockedSegment: (segmentId: string) => void;
  clearBlockedSegments: () => void;

  // Demo 90s synchronization
  applyDemoStepState: (
    stepId: string,
    second: number,
    inputs: ScenarioInputs,
    serviceOverrides: Record<string, ServiceStatus>,
    stepTitle: string,
    gateUnresolved: boolean,
  ) => void;
  resolveDemoHumanGate: (choice: 'APPROVE' | 'REJECT' | 'CONTINUE_NO_BROADCAST') => void;
  resetDemoSimulation: () => void;

  // Persistence controls
  resetAllData: () => void;
  exportFullStateJson: () => string;
}

const initial = loadFromLocalStorage();

export const useNexoStore = create<NexoStore>((set, get) => {
  const commit = (
    updater: (prev: NexoStore) => Partial<NexoStore>,
  ) => {
    set((prev) => {
      const nextSlice = updater(prev);
      const merged = { ...prev, ...nextSlice } as NexoStore;
      saveToLocalStorage(extractPersisted(merged));
      return nextSlice;
    });
  };

  const makeAudit = (
    actorRole: Role,
    eventType: AuditEntry['eventType'],
    summary: string,
    previousState: string,
    nextState: string,
    scenarioId: string,
    sourceId?: string,
  ): AuditEntry => ({
    id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: nowIso(),
    actorRole,
    eventType,
    summary,
    previousState,
    nextState,
    scenarioId,
    sourceId,
    simulated: true,
  });

  return {
    ...initial,
    toasts: [],
    inspectedDecision: null,
    whatIfOpen: false,
    commandPaletteOpen: false,
    simulatedOffline: false,

    setTheme: (theme) => commit(() => ({ theme })),
    toggleTheme: () =>
      commit((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    setReducedMotion: (reducedMotion) => commit(() => ({ reducedMotion })),
    setSimulatedOffline: (simulatedOffline) => set({ simulatedOffline }),
    setWhatIfOpen: (whatIfOpen) => set({ whatIfOpen }),
    setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
    openDecisionInspector: (inspectedDecision) => set({ inspectedDecision }),
    closeDecisionInspector: () => set({ inspectedDecision: null }),

    pushToast: (toast) => {
      const id = `TST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, 4200);
    },

    dismissToast: (id) =>
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

    setActiveRole: (activeRole) => {
      commit(() => ({ activeRole }));
    },

    selectScenario: (scenarioId) => {
      const state = get();
      const target = state.scenarios.find((s) => s.id === scenarioId);
      if (!target) return;
      const prevId = state.activeScenarioId;
      const synchronizedActions = syncRulesForScenario(
        scenarioId,
        state.scenarios,
        state.actions,
      );
      commit((s) => ({
        activeScenarioId: scenarioId,
        actions: synchronizedActions,
        auditLog: [
          makeAudit(
            s.activeRole,
            'CAMBIO_ESCENARIO',
            `Escenario activo cambiado a "${target.title}".`,
            prevId,
            scenarioId,
            scenarioId,
            target.sourceIds[0],
          ),
          ...s.auditLog,
        ],
      }));
    },

    updateScenarioInputs: (patch) => {
      const state = get();
      const perms = getPermissions(state.activeRole);
      if (!perms.canEditScenario) {
        state.pushToast({
          title: 'Permiso restringido',
          description: 'Solo Coordinador GRD puede modificar parámetros del escenario.',
          tone: 'warning',
        });
        return;
      }

      const current = state.scenarios.find((s) => s.id === state.activeScenarioId);
      if (!current) return;

      const nextScenarios = state.scenarios.map((sc) =>
        sc.id === current.id
          ? { ...sc, inputs: { ...sc.inputs, ...patch } }
          : sc,
      );
      const synchronizedActions = syncRulesForScenario(
        current.id,
        nextScenarios,
        state.actions,
      );

      commit((s) => ({
        scenarios: nextScenarios,
        actions: synchronizedActions,
        auditLog: [
          makeAudit(
            s.activeRole,
            'CAMBIO_PARAMETRO',
            `Ajuste de parámetros simulados en ${current.title}.`,
            JSON.stringify(current.inputs),
            JSON.stringify({ ...current.inputs, ...patch }),
            current.id,
          ),
          ...s.auditLog,
        ],
      }));
    },

    overrideServiceStatus: (serviceId, nextStatus) => {
      const state = get();
      const perms = getPermissions(state.activeRole);
      if (!perms.canOverrideServices) {
        state.pushToast({
          title: 'Acción no permitida para este rol',
          description: 'Cambie a Coordinador GRD, Administrativo o Brigadista para actualizar servicios.',
          tone: 'warning',
        });
        return;
      }

      const current = state.scenarios.find((s) => s.id === state.activeScenarioId);
      if (!current) return;
      const baseService = SERVICES.find((sv) => sv.id === serviceId);
      const prevStatus = current.serviceOverrides[serviceId] ?? baseService?.status ?? 'OPERATIVO';

      const nextScenarios = state.scenarios.map((sc) =>
        sc.id === current.id
          ? {
              ...sc,
              serviceOverrides: {
                ...sc.serviceOverrides,
                [serviceId]: nextStatus,
              },
            }
          : sc,
      );
      const synchronizedActions = syncRulesForScenario(
        current.id,
        nextScenarios,
        state.actions,
      );

      commit((s) => ({
        scenarios: nextScenarios,
        actions: synchronizedActions,
        auditLog: [
          makeAudit(
            s.activeRole,
            'CAMBIO_SERVICIO',
            `${baseService?.name ?? serviceId} actualizado de ${prevStatus} a ${nextStatus}.`,
            prevStatus,
            nextStatus,
            current.id,
            baseService?.sourceId,
          ),
          ...s.auditLog,
        ],
      }));
    },

    resetScenarioToBaseline: (scenarioId) => {
      const state = get();
      const perms = getPermissions(state.activeRole);
      if (!perms.canEditScenario) {
        state.pushToast({
          title: 'Permiso restringido',
          description: 'Solo Coordinador GRD puede restablecer parámetros del escenario.',
          tone: 'warning',
        });
        return;
      }

      const seed = SCENARIOS.find((s) => s.id === scenarioId);
      if (!seed) return;

      const nextScenarios = state.scenarios.map((sc) =>
        sc.id === scenarioId
          ? {
              ...sc,
              inputs: { ...seed.inputs },
              serviceOverrides: { ...seed.serviceOverrides },
            }
          : sc,
      );
      const synchronizedActions = syncRulesForScenario(
        scenarioId,
        nextScenarios,
        state.actions,
      );

      commit((s) => ({
        scenarios: nextScenarios,
        actions: synchronizedActions,
        auditLog: [
          makeAudit(
            s.activeRole,
            'CAMBIO_ESCENARIO',
            `Parámetros y servicios de "${seed.title}" restablecidos a su línea base.`,
            'Configuración ajustada',
            'Línea base predefinida',
            scenarioId,
            seed.sourceIds[0],
          ),
          ...s.auditLog,
        ],
      }));

      state.pushToast({
        title: 'Escenario restablecido a línea base',
        description: 'Motores de dependencias, reglas y continuidad recalculados.',
        tone: 'info',
      });
    },

    applyWhatIfAlternative: (serviceOverrides, inputsPatch, summaryLabel) => {
      const state = get();
      const perms = getPermissions(state.activeRole);
      if (!perms.canEditScenario && !perms.canOverrideServices) {
        state.pushToast({
          title: 'Permiso requerido',
          description: 'Este rol no puede aplicar cambios al escenario activo.',
          tone: 'warning',
        });
        return;
      }

      const current = state.scenarios.find((s) => s.id === state.activeScenarioId);
      if (!current) return;

      const nextScenarios = state.scenarios.map((sc) =>
        sc.id === current.id
          ? {
              ...sc,
              inputs: { ...sc.inputs, ...inputsPatch },
              serviceOverrides: { ...sc.serviceOverrides, ...serviceOverrides },
            }
          : sc,
      );
      const synchronizedActions = syncRulesForScenario(
        current.id,
        nextScenarios,
        state.actions,
      );

      commit((s) => ({
        scenarios: nextScenarios,
        actions: synchronizedActions,
        whatIfOpen: false,
        auditLog: [
          makeAudit(
            s.activeRole,
            'CAMBIO_ESCENARIO',
            `Alternativa "¿Qué pasaría si...?" aplicada: ${summaryLabel}.`,
            JSON.stringify(current.serviceOverrides),
            JSON.stringify({ ...current.serviceOverrides, ...serviceOverrides }),
            current.id,
          ),
          ...s.auditLog,
        ],
      }));

      state.pushToast({
        title: 'Alternativa aplicada al escenario',
        description: 'Los indicadores, grafo y acciones se recalcularon.',
        tone: 'success',
      });
    },

    updateActionStatus: (actionId, nextStatus, evidenceNote) => {
      const state = get();
      const action = state.actions.find((a) => a.id === actionId);
      if (!action) return;

      if (!canRoleUpdateAction(state.activeRole, action)) {
        state.pushToast({
          title: 'Permiso insuficiente',
          description: `Esta acción corresponde al rol ${action.responsibleRole} o a Coordinador GRD.`,
          tone: 'warning',
        });
        return;
      }

      const prevStatus = action.status;
      const trimmedEvidence = evidenceNote?.trim();
      const evidenceUpdated = Boolean(trimmedEvidence && trimmedEvidence !== action.evidence);
      const nextActions = state.actions.map((a) =>
        a.id === actionId
          ? {
              ...a,
              status: nextStatus,
              evidence: trimmedEvidence ? trimmedEvidence : a.evidence,
              updatedAt: nowIso(),
            }
          : a,
      );

      commit((s) => ({
        actions: nextActions,
        auditLog: [
          makeAudit(
            s.activeRole,
            'ACCION_ACTUALIZADA',
            evidenceUpdated
              ? `Acción "${action.title}" en ${nextStatus} con evidencia actualizada.`
              : `Acción "${action.title}" actualizada a ${nextStatus}.`,
            prevStatus,
            nextStatus,
            action.scenarioId,
            action.sourceId,
          ),
          ...s.auditLog,
        ],
      }));
    },

    createAlertDraft: ({ title, audience, body, sourceId, submitImmediately }) => {
      const state = get();
      const perms = getPermissions(state.activeRole);
      if (!perms.canDraftAlert) {
        return {
          ok: false,
          error: 'Solo el rol Coordinador GRD puede redactar borradores de comunicación.',
        };
      }
      if (!title.trim() || !body.trim()) {
        return { ok: false, error: 'Complete título y contenido del comunicado simulado.' };
      }

      const status: Alert['status'] = submitImmediately
        ? 'PENDIENTE_APROBACION'
        : 'BORRADOR';
      const newAlert: Alert = {
        id: `COM-${Date.now().toString().slice(-4)}`,
        title: title.trim(),
        audience,
        scenarioId: state.activeScenarioId,
        body: body.trim(),
        status,
        creatorRole: state.activeRole,
        sourceId,
        simulated: true,
        createdAt: nowIso(),
      };

      commit((s) => ({
        alerts: [newAlert, ...s.alerts],
        auditLog: [
          makeAudit(
            s.activeRole,
            submitImmediately ? 'COMUNICACION_ENVIADA_REVISION' : 'COMUNICACION_CREADA',
            `Comunicado simulado "${newAlert.title}" creado en estado ${status}.`,
            'Nuevo',
            status,
            s.activeScenarioId,
            sourceId,
          ),
          ...s.auditLog,
        ],
      }));

      return { ok: true, alertId: newAlert.id };
    },

    submitAlertForApproval: (alertId) => {
      const state = get();
      const perms = getPermissions(state.activeRole);
      if (!perms.canSubmitAlertForApproval) {
        state.pushToast({
          title: 'Permiso restringido',
          description: 'Solo Coordinador GRD envía borradores a revisión.',
          tone: 'warning',
        });
        return;
      }
      const target = state.alerts.find((a) => a.id === alertId);
      if (!target) return;

      commit((s) => ({
        alerts: s.alerts.map((a) =>
          a.id === alertId ? { ...a, status: 'PENDIENTE_APROBACION' } : a,
        ),
        auditLog: [
          makeAudit(
            s.activeRole,
            'COMUNICACION_ENVIADA_REVISION',
            `Borrador "${target.title}" enviado a aprobación de Autoridad.`,
            target.status,
            'PENDIENTE_APROBACION',
            target.scenarioId,
            target.sourceId,
          ),
          ...s.auditLog,
        ],
      }));
    },

    approveAlert: (alertId, note) => {
      const state = get();
      const perms = getPermissions(state.activeRole);
      if (!perms.canApproveOrRejectAlert) {
        state.pushToast({
          title: 'Aprobación exclusiva de Autoridad',
          description: 'Cambie el rol a Autoridad para aprobar o rechazar comunicaciones.',
          tone: 'warning',
        });
        return;
      }

      const target = state.alerts.find((a) => a.id === alertId);
      if (!target) return;
      const timestamp = nowIso();

      const approval: Approval = {
        id: `APR-${Date.now()}`,
        targetType: 'ALERTA',
        targetId: alertId,
        decision: 'APROBADO',
        actorRole: state.activeRole,
        note: note?.trim() || 'Aprobado para difusión en simulación interna.',
        timestamp,
      };

      // Generate missing receipts for the 5 fictional mailboxes upon approval & broadcast
      const existingMbxIds = new Set(
        state.receipts.filter((r) => r.alertId === alertId).map((r) => r.mailboxId),
      );
      const newReceipts: DeliveryReceipt[] = MAILBOXES.filter(
        (mbx) => !existingMbxIds.has(mbx.id),
      ).map((mbx) => ({
        id: `RCP-${alertId}-${mbx.id}`,
        alertId,
        mailboxId: mbx.id,
        mailboxLabel: mbx.name,
        audience: mbx.audience,
        status: 'ENTREGADO',
      }));

      commit((s) => ({
        alerts: s.alerts.map((a) =>
          a.id === alertId
            ? {
                ...a,
                status: 'DIFUNDIDA',
                approverRole: s.activeRole,
                approvedAt: timestamp,
              }
            : a,
        ),
        approvals: [approval, ...s.approvals],
        receipts: [...s.receipts, ...newReceipts],
        auditLog: [
          makeAudit(
            s.activeRole,
            'COMUNICACION_APROBADA',
            `Autoridad aprobó y difundió en simulación "${target.title}" hacia 5 buzones ficticios.`,
            target.status,
            'DIFUNDIDA',
            target.scenarioId,
            target.sourceId,
          ),
          ...s.auditLog,
        ],
      }));

      state.pushToast({
        title: 'Comunicación aprobada y difundida en simulación',
        description: 'Disponible ahora en Mi comunidad y en los 5 buzones internos.',
        tone: 'success',
      });
    },

    rejectAlert: (alertId, reason) => {
      const state = get();
      const perms = getPermissions(state.activeRole);
      if (!perms.canApproveOrRejectAlert) {
        state.pushToast({
          title: 'Rechazo exclusivo de Autoridad',
          description: 'Cambie al rol Autoridad para rechazar comunicaciones.',
          tone: 'warning',
        });
        return;
      }
      if (!reason.trim()) {
        state.pushToast({
          title: 'Observación requerida',
          description: 'Indique el motivo del rechazo para trazabilidad.',
          tone: 'warning',
        });
        return;
      }

      const target = state.alerts.find((a) => a.id === alertId);
      if (!target) return;
      const timestamp = nowIso();

      const approval: Approval = {
        id: `APR-${Date.now()}`,
        targetType: 'ALERTA',
        targetId: alertId,
        decision: 'RECHAZADO',
        actorRole: state.activeRole,
        note: reason.trim(),
        timestamp,
      };

      commit((s) => ({
        alerts: s.alerts.map((a) =>
          a.id === alertId
            ? {
                ...a,
                status: 'RECHAZADA',
                approverRole: s.activeRole,
                rejectionReason: reason.trim(),
              }
            : a,
        ),
        approvals: [approval, ...s.approvals],
        auditLog: [
          makeAudit(
            s.activeRole,
            'COMUNICACION_RECHAZADA',
            `Autoridad rechazó "${target.title}": ${reason.trim()}.`,
            target.status,
            'RECHAZADA',
            target.scenarioId,
            target.sourceId,
          ),
          ...s.auditLog,
        ],
      }));
    },

    broadcastAlert: (alertId) => {
      const state = get();
      const perms = getPermissions(state.activeRole);
      if (!perms.canBroadcastApprovedAlert) {
        state.pushToast({
          title: 'Permiso restringido',
          description: 'Solo Coordinador GRD o Autoridad pueden difundir comunicaciones aprobadas.',
          tone: 'warning',
        });
        return;
      }

      const target = state.alerts.find((a) => a.id === alertId);
      if (!target || target.status !== 'APROBADA') return;

      const existingMbxIds = new Set(
        state.receipts.filter((r) => r.alertId === alertId).map((r) => r.mailboxId),
      );
      const newReceipts: DeliveryReceipt[] = MAILBOXES.filter(
        (mbx) => !existingMbxIds.has(mbx.id),
      ).map((mbx) => ({
        id: `RCP-${alertId}-${mbx.id}`,
        alertId,
        mailboxId: mbx.id,
        mailboxLabel: mbx.name,
        audience: mbx.audience,
        status: 'ENTREGADO',
      }));

      commit((s) => ({
        alerts: s.alerts.map((a) =>
          a.id === alertId ? { ...a, status: 'DIFUNDIDA' } : a,
        ),
        receipts: [...s.receipts, ...newReceipts],
        auditLog: [
          makeAudit(
            s.activeRole,
            'COMUNICACION_DIFUNDIDA',
            `Difusión simulada ejecutada en 5 buzones ficticios para "${target.title}".`,
            'APROBADA',
            'DIFUNDIDA',
            target.scenarioId,
            target.sourceId,
          ),
          ...s.auditLog,
        ],
      }));

      state.pushToast({
        title: 'Comunicación difundida en simulación',
        description: 'Enviada a los 5 buzones ficticios internos y disponible en Mi comunidad.',
        tone: 'success',
      });
    },

    markReceiptRead: (receiptId) => {
      const state = get();
      const rec = state.receipts.find((r) => r.id === receiptId);
      if (!rec || rec.status === 'LEIDO') return;
      const timestamp = nowIso();

      commit((s) => ({
        receipts: s.receipts.map((r) =>
          r.id === receiptId ? { ...r, status: 'LEIDO', readAt: timestamp } : r,
        ),
        auditLog: [
          makeAudit(
            s.activeRole,
            'LECTURA_CONFIRMADA',
            `Lectura simulada confirmada en ${rec.mailboxLabel} para ${rec.alertId}.`,
            rec.status,
            'LEIDO',
            s.activeScenarioId,
          ),
          ...s.auditLog,
        ],
      }));
    },

    confirmCommunityReading: (alertId) => {
      const state = get();
      const mailboxTargetId = state.activeRole === 'DOCENTE' ? 'MBX-02' : 'MBX-01';
      let receipt = state.receipts.find(
        (r) => r.alertId === alertId && r.mailboxId === mailboxTargetId,
      );

      if (!receipt) {
        // Ensure receipt exists for approved/broadcast alert
        const mbx = MAILBOXES.find((m) => m.id === mailboxTargetId) ?? MAILBOXES[0];
        receipt = {
          id: `RCP-${alertId}-${mbx.id}`,
          alertId,
          mailboxId: mbx.id,
          mailboxLabel: mbx.name,
          audience: mbx.audience,
          status: 'LEIDO',
          readAt: nowIso(),
        };
        commit((s) => ({
          receipts: [...s.receipts, receipt!],
          auditLog: [
            makeAudit(
              s.activeRole,
              'LECTURA_CONFIRMADA',
              `Confirmación de lectura simulada por ${s.activeRole} en comunicado ${alertId}.`,
              'ENTREGADO',
              'LEIDO',
              s.activeScenarioId,
            ),
            ...s.auditLog,
          ],
        }));
      } else {
        state.markReceiptRead(receipt.id);
      }
    },

    decideContinuityAlternative: (activityId, decision, note) => {
      const state = get();
      const perms = getPermissions(state.activeRole);
      if (!perms.canApproveContinuity) {
        state.pushToast({
          title: 'Aprobación exclusiva de Autoridad',
          description: 'Solo el rol Autoridad puede aprobar o rechazar alternativas de continuidad.',
          tone: 'warning',
        });
        return;
      }

      const timestamp = nowIso();
      const scopedKey = `${state.activeScenarioId}::${activityId}`;
      const approval: Approval = {
        id: `APR-CNT-${Date.now()}`,
        targetType: 'CONTINUIDAD',
        targetId: scopedKey,
        decision,
        actorRole: state.activeRole,
        note: note?.trim() || `Decisión sobre alternativa de continuidad para ${activityId} (${state.activeScenarioId}).`,
        timestamp,
      };

      commit((s) => ({
        continuityDecisions: {
          ...s.continuityDecisions,
          [scopedKey]: {
            decision,
            actorRole: s.activeRole,
            timestamp,
          },
        },
        approvals: [approval, ...s.approvals],
        auditLog: [
          makeAudit(
            s.activeRole,
            'CONTINUIDAD_DECIDIDA',
            `Alternativa de continuidad para ${activityId} (${s.activeScenarioId}) marcada como ${decision}.`,
            s.continuityDecisions[scopedKey]?.decision ?? s.continuityDecisions[activityId]?.decision ?? 'PENDIENTE',
            decision,
            s.activeScenarioId,
          ),
          ...s.auditLog,
        ],
      }));
    },

    addTeacherObservation: (activityId, note) => {
      const state = get();
      const perms = getPermissions(state.activeRole);
      if (!perms.canAddTeacherObservation) {
        state.pushToast({
          title: 'Registro disponible para Docentes',
          description: 'Cambie al rol Docente para registrar observaciones de demostración.',
          tone: 'warning',
        });
        return;
      }
      if (!note.trim()) return;

      const entry = {
        id: `OBS-${Date.now()}`,
        note: note.trim(),
        authorRole: state.activeRole,
        timestamp: nowIso(),
      };

      commit((s) => ({
        teacherObservations: {
          ...s.teacherObservations,
          [activityId]: [entry, ...(s.teacherObservations[activityId] ?? [])],
        },
        auditLog: [
          makeAudit(
            s.activeRole,
            'OBSERVACION_DOCENTE',
            `Observación docente registrada en ${activityId}: "${note.trim()}".`,
            'Sin observación',
            'Observación agregada',
            s.activeScenarioId,
          ),
          ...s.auditLog,
        ],
      }));
    },

    toggleBlockedSegment: (segmentId) => {
      const state = get();
      const perms = getPermissions(state.activeRole);
      if (!perms.canBlockDidacticRoute) {
        state.pushToast({
          title: 'Permiso operativo requerido',
          description: 'Cambie a Coordinador GRD o Brigadista para bloquear o habilitar tramos didácticos.',
          tone: 'warning',
        });
        return;
      }

      const exists = state.blockedSegmentIds.includes(segmentId);
      const next = exists
        ? state.blockedSegmentIds.filter((id) => id !== segmentId)
        : [...state.blockedSegmentIds, segmentId];

      commit((s) => ({
        blockedSegmentIds: next,
        auditLog: [
          makeAudit(
            s.activeRole,
            'RUTA_MODIFICADA',
            exists
              ? `Tramo ficticio ${segmentId} habilitado en plano didáctico.`
              : `Tramo ficticio ${segmentId} bloqueado para recálculo de ruta didáctica.`,
            exists ? 'BLOQUEADO' : 'HABILITADO',
            exists ? 'HABILITADO' : 'BLOQUEADO',
            s.activeScenarioId,
          ),
          ...s.auditLog,
        ],
      }));
    },

    clearBlockedSegments: () => {
      const state = get();
      const perms = getPermissions(state.activeRole);
      if (!perms.canBlockDidacticRoute) {
        state.pushToast({
          title: 'Permiso operativo requerido',
          description: 'Cambie a Coordinador GRD o Brigadista para habilitar todos los tramos.',
          tone: 'warning',
        });
        return;
      }
      if (state.blockedSegmentIds.length === 0) return;

      const prevList = state.blockedSegmentIds.join(', ');
      commit((s) => ({
        blockedSegmentIds: [],
        auditLog: [
          makeAudit(
            s.activeRole,
            'RUTA_MODIFICADA',
            'Todos los tramos ficticios fueron habilitados en el plano didáctico.',
            prevList,
            'Todos habilitados',
            s.activeScenarioId,
          ),
          ...s.auditLog,
        ],
      }));
    },

    applyDemoStepState: (
      stepId,
      second,
      inputs,
      serviceOverrides,
      stepTitle,
      gateUnresolved,
    ) => {
      const state = get();
      const demoScenarioId = 'SCN-02';
      const nextScenarios = state.scenarios.map((sc) =>
        sc.id === demoScenarioId
          ? {
              ...sc,
              inputs,
              serviceOverrides,
            }
          : sc,
      );
      const synchronizedActions = syncRulesForScenario(
        demoScenarioId,
        nextScenarios,
        state.actions,
      );

      // Keep COM-DEMO-90S and its receipts strictly aligned with timeline position
      let nextAlerts = state.alerts;
      let nextReceipts = state.receipts;

      if (second < 60) {
        nextAlerts = state.alerts.filter((a) => a.id !== 'COM-DEMO-90S');
        nextReceipts = state.receipts.filter((r) => r.alertId !== 'COM-DEMO-90S');
      } else {
        const existingDemoAlert = state.alerts.find((a) => a.id === 'COM-DEMO-90S');
        if (!existingDemoAlert) {
          nextAlerts = [
            {
              id: 'COM-DEMO-90S',
              title: 'Aviso simulado de demostración: interrupción eléctrica en evaluación',
              audience: 'Estudiantes y docentes',
              scenarioId: demoScenarioId,
              body: 'Escenario simulado de 90s: se ha registrado interrupción eléctrica ficticia (SRV-01). El equipo verifica Agua y Conectividad antes de confirmar alternativas en Laboratorio Demo B.',
              status: 'PENDIENTE_APROBACION',
              creatorRole: 'COORDINADOR_GRD',
              sourceId: 'SRC-UNT-1772',
              simulated: true,
              createdAt: nowIso(),
            },
            ...state.alerts,
          ];
        } else if (second <= 65 && gateUnresolved && existingDemoAlert.status !== 'PENDIENTE_APROBACION') {
          nextAlerts = state.alerts.map((a) =>
            a.id === 'COM-DEMO-90S'
              ? {
                  ...a,
                  status: 'PENDIENTE_APROBACION',
                  approverRole: undefined,
                  approvedAt: undefined,
                  rejectionReason: undefined,
                }
              : a,
          );
          nextReceipts = state.receipts.filter((r) => r.alertId !== 'COM-DEMO-90S');
        }
      }

      // Idempotent audit log: deduplicate this step and prune future demo step/gate logs when rewinding
      const futureStepAuditIds = new Set(
        DEMO_SEQUENCE_STEPS.filter((s) => s.second > second).map(
          (s) => `AUD-DEMO-${s.id}`,
        ),
      );
      if (second < 65 || gateUnresolved) {
        futureStepAuditIds.add('AUD-DEMO-GATE');
      }
      const thisAuditId = `AUD-DEMO-${stepId}`;
      const cleanedLog = state.auditLog.filter(
        (entry) => entry.id !== thisAuditId && !futureStepAuditIds.has(entry.id),
      );

      const stepAudit: AuditEntry = {
        ...makeAudit(
          state.activeRole,
          'DEMO_EVENTO',
          `Simulación 90s (${String(second).padStart(2, '0')}s): ${stepTitle}`,
          'Paso previo',
          stepTitle,
          demoScenarioId,
        ),
        id: thisAuditId,
      };

      commit(() => ({
        activeScenarioId: demoScenarioId,
        scenarios: nextScenarios,
        actions: synchronizedActions,
        alerts: nextAlerts,
        receipts: nextReceipts,
        auditLog: [stepAudit, ...cleanedLog].slice(0, 50),
      }));
    },

    resolveDemoHumanGate: (choice) => {
      const state = get();
      const demoAlertId = 'COM-DEMO-90S';
      const hasDemoAlert = state.alerts.some((a) => a.id === demoAlertId);
      if (!hasDemoAlert) return;

      const timestamp = nowIso();
      const baseLog = state.auditLog.filter((e) => e.id !== 'AUD-DEMO-GATE');

      if (choice === 'APPROVE') {
        const existingReceipts = state.receipts.some((r) => r.alertId === demoAlertId);
        const newReceipts: DeliveryReceipt[] = existingReceipts
          ? []
          : MAILBOXES.map((mbx) => ({
              id: `RCP-${demoAlertId}-${mbx.id}`,
              alertId: demoAlertId,
              mailboxId: mbx.id,
              mailboxLabel: mbx.name,
              audience: mbx.audience,
              status: 'ENTREGADO',
            }));

        const gateAudit: AuditEntry = {
          ...makeAudit(
            'AUTORIDAD',
            'COMUNICACION_APROBADA',
            'Demo 90s: Autoridad aprobó comunicado simulado para difusión en 5 buzones.',
            'PENDIENTE_APROBACION',
            'DIFUNDIDA',
            'SCN-02',
            'SRC-UNT-1772',
          ),
          id: 'AUD-DEMO-GATE',
        };

        commit((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === demoAlertId
              ? {
                  ...a,
                  status: 'DIFUNDIDA',
                  approverRole: 'AUTORIDAD',
                  approvedAt: timestamp,
                  rejectionReason: undefined,
                }
              : a,
          ),
          receipts: [...s.receipts, ...newReceipts],
          auditLog: [gateAudit, ...baseLog].slice(0, 50),
        }));
      } else if (choice === 'REJECT') {
        const gateAudit: AuditEntry = {
          ...makeAudit(
            'AUTORIDAD',
            'COMUNICACION_RECHAZADA',
            'Demo 90s: Autoridad rechazó difusión del borrador.',
            'PENDIENTE_APROBACION',
            'RECHAZADA',
            'SCN-02',
          ),
          id: 'AUD-DEMO-GATE',
        };

        commit((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === demoAlertId
              ? {
                  ...a,
                  status: 'RECHAZADA',
                  approverRole: 'AUTORIDAD',
                  approvedAt: undefined,
                  rejectionReason: 'Rechazado en revisión humana durante demostración.',
                }
              : a,
          ),
          receipts: s.receipts.filter((r) => r.alertId !== demoAlertId),
          auditLog: [gateAudit, ...baseLog].slice(0, 50),
        }));
      } else {
        const gateAudit: AuditEntry = {
          ...makeAudit(
            state.activeRole,
            'DEMO_EVENTO',
            'Demo 90s: Se continuó evaluación sin difundir comunicado.',
            'PENDIENTE_APROBACION',
            'PENDIENTE_APROBACION',
            'SCN-02',
          ),
          id: 'AUD-DEMO-GATE',
        };

        commit((s) => ({
          receipts: s.receipts.filter((r) => r.alertId !== demoAlertId),
          auditLog: [gateAudit, ...baseLog].slice(0, 50),
        }));
      }
    },

    resetDemoSimulation: () => {
      const state = get();
      const demoScenarioId = 'SCN-02';
      const initialDemoInputs: ScenarioInputs = {
        rainIntensity: 15,
        serviceDisruption: 0,
        accessRestriction: 10,
        continuityImpact: 10,
      };
      const initialDemoOverrides: Record<string, ServiceStatus> = {
        'SRV-01': 'OPERATIVO',
        'SRV-02': 'OPERATIVO',
        'SRV-03': 'OPERATIVO',
        'SRV-04': 'OPERATIVO',
        'SRV-05': 'OPERATIVO',
        'SRV-06': 'OPERATIVO',
      };

      const nextScenarios = state.scenarios.map((sc) =>
        sc.id === demoScenarioId
          ? {
              ...sc,
              inputs: initialDemoInputs,
              serviceOverrides: initialDemoOverrides,
            }
          : sc,
      );
      const synchronizedActions = syncRulesForScenario(
        demoScenarioId,
        nextScenarios,
        state.actions,
      );

      const cleanedLog = state.auditLog.filter((e) => !e.id.startsWith('AUD-DEMO-'));
      const resetAudit: AuditEntry = {
        ...makeAudit(
          state.activeRole,
          'DEMO_EVENTO',
          'Simulación 90s (00s): Estado inicial operativo (reinicio limpio).',
          'Simulación previa',
          '00s Estado inicial operativo',
          demoScenarioId,
        ),
        id: 'AUD-DEMO-STEP-00',
      };

      commit((s) => ({
        activeScenarioId: demoScenarioId,
        scenarios: nextScenarios,
        actions: synchronizedActions,
        alerts: s.alerts.filter((a) => a.id !== 'COM-DEMO-90S'),
        receipts: s.receipts.filter((r) => r.alertId !== 'COM-DEMO-90S'),
        auditLog: [resetAudit, ...cleanedLog].slice(0, 50),
      }));
    },

    resetAllData: () => {
      const fresh = buildInitialPersistedState();
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore
        }
      }
      set({
        ...fresh,
        auditLog: [
          makeAudit(
            fresh.activeRole,
            'DATOS_RESTABLECIDOS',
            'Datos de demostración restablecidos al estado inicial coherente.',
            'Estado modificado',
            'Estado inicial',
            fresh.activeScenarioId,
          ),
          ...fresh.auditLog,
        ],
      });
      saveToLocalStorage(fresh);
    },

    exportFullStateJson: () => {
      return JSON.stringify(extractPersisted(get()), null, 2);
    },
  };
});
