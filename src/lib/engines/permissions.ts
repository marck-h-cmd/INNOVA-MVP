import { Action, Role } from '../../types/domain';

export interface RolePermissions {
  canEditScenario: boolean;
  canOverrideServices: boolean;
  canEditRules: boolean;
  canManageAllActions: boolean;
  canUpdateAssignedActions: boolean;
  canDraftAlert: boolean;
  canSubmitAlertForApproval: boolean;
  canApproveOrRejectAlert: boolean;
  canBroadcastApprovedAlert: boolean;
  canProposeContinuity: boolean;
  canApproveContinuity: boolean;
  canConfirmReading: boolean;
  canAddTeacherObservation: boolean;
  canBlockDidacticRoute: boolean;
  canViewAudit: boolean;
  isCommunityPrimary: boolean;
}

const MATRIX: Record<Role, RolePermissions> = {
  ESTUDIANTE: {
    canEditScenario: false,
    canOverrideServices: false,
    canEditRules: false,
    canManageAllActions: false,
    canUpdateAssignedActions: false,
    canDraftAlert: false,
    canSubmitAlertForApproval: false,
    canApproveOrRejectAlert: false,
    canBroadcastApprovedAlert: false,
    canProposeContinuity: false,
    canApproveContinuity: false,
    canConfirmReading: true,
    canAddTeacherObservation: false,
    canBlockDidacticRoute: false,
    canViewAudit: false,
    isCommunityPrimary: true,
  },
  DOCENTE: {
    canEditScenario: false,
    canOverrideServices: false,
    canEditRules: false,
    canManageAllActions: false,
    canUpdateAssignedActions: false,
    canDraftAlert: false,
    canSubmitAlertForApproval: false,
    canApproveOrRejectAlert: false,
    canBroadcastApprovedAlert: false,
    canProposeContinuity: false,
    canApproveContinuity: false,
    canConfirmReading: true,
    canAddTeacherObservation: true,
    canBlockDidacticRoute: false,
    canViewAudit: false,
    isCommunityPrimary: true,
  },
  ADMINISTRATIVO: {
    canEditScenario: false,
    canOverrideServices: true,
    canEditRules: false,
    canManageAllActions: false,
    canUpdateAssignedActions: true,
    canDraftAlert: false,
    canSubmitAlertForApproval: false,
    canApproveOrRejectAlert: false,
    canBroadcastApprovedAlert: false,
    canProposeContinuity: false,
    canApproveContinuity: false,
    canConfirmReading: true,
    canAddTeacherObservation: false,
    canBlockDidacticRoute: false,
    canViewAudit: true,
    isCommunityPrimary: false,
  },
  BRIGADISTA: {
    canEditScenario: false,
    canOverrideServices: true,
    canEditRules: false,
    canManageAllActions: false,
    canUpdateAssignedActions: true,
    canDraftAlert: false,
    canSubmitAlertForApproval: false,
    canApproveOrRejectAlert: false,
    canBroadcastApprovedAlert: false,
    canProposeContinuity: false,
    canApproveContinuity: false,
    canConfirmReading: true,
    canAddTeacherObservation: false,
    canBlockDidacticRoute: true,
    canViewAudit: true,
    isCommunityPrimary: false,
  },
  COORDINADOR_GRD: {
    canEditScenario: true,
    canOverrideServices: true,
    canEditRules: false,
    canManageAllActions: true,
    canUpdateAssignedActions: true,
    canDraftAlert: true,
    canSubmitAlertForApproval: true,
    canApproveOrRejectAlert: false,
    canBroadcastApprovedAlert: true,
    canProposeContinuity: true,
    canApproveContinuity: false,
    canConfirmReading: true,
    canAddTeacherObservation: false,
    canBlockDidacticRoute: true,
    canViewAudit: true,
    isCommunityPrimary: false,
  },
  AUTORIDAD: {
    canEditScenario: false,
    canOverrideServices: false,
    canEditRules: false,
    canManageAllActions: false,
    canUpdateAssignedActions: true,
    canDraftAlert: false,
    canSubmitAlertForApproval: false,
    canApproveOrRejectAlert: true,
    canBroadcastApprovedAlert: true,
    canProposeContinuity: false,
    canApproveContinuity: true,
    canConfirmReading: true,
    canAddTeacherObservation: false,
    canBlockDidacticRoute: false,
    canViewAudit: true,
    isCommunityPrimary: false,
  },
};

export function getPermissions(role: Role): RolePermissions {
  return MATRIX[role];
}

export function canRoleUpdateAction(role: Role, action: Action): boolean {
  const perms = getPermissions(role);
  if (perms.canManageAllActions) return true;
  if (!perms.canUpdateAssignedActions) return false;
  return action.responsibleRole === role;
}

export function isAlertVisibleToCommunity(status: string): boolean {
  return status === 'APROBADA' || status === 'DIFUNDIDA';
}
