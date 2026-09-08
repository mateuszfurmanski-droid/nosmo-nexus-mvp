import type { NexusId, NexusIsoDateTime } from '../../data/schemas/common.schema';
import type {
  NexusCanonicalAuthorityEvaluation,
  NexusCanonicalAuthorityRequest,
  NexusTargetCapabilityRequirement,
  NexusTrustedSessionIdentity,
} from '../permissions/canonicalAuthorityContract';
import type { NexusProjectMemorySnapshot } from '../../data/projectMemory';
import type { NexusEvidenceType } from '../../data/schemas/evidence.schema';

export const NEXUS_CANONICAL_WORK_PACKAGE_SCHEMA = 'nexus-canonical-work-package/v1' as const;
export const NEXUS_SEMANTIC_OPERATION_SCHEMA = 'nexus-semantic-operation/v1' as const;
export const NEXUS_CHECKLIST_SCHEMA = 'nexus-checklist/v1' as const;

export type NexusWorkPackageLifecycle = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type NexusWorkPackageCompositionState = 'OPEN' | 'LOCKED';
export type NexusWorkPackageAssignmentState = 'UNASSIGNED' | 'ASSIGNED';

export type NexusWorkPackageItemKind =
  | 'TASK'
  | 'APP'
  | 'MODULE'
  | 'DOCUMENT'
  | 'FILE'
  | 'DRAWING'
  | 'CHECKLIST'
  | 'EVIDENCE_REQUIREMENT';

export type NexusChecklistExpectedResponseType =
  | 'BOOLEAN'
  | 'TEXT'
  | 'NUMBER'
  | 'CHOICE'
  | 'EVIDENCE_REFERENCE';

export interface NexusChecklistDefinitionItem {
  itemId: NexusId;
  order: number;
  title: string;
  required: boolean;
  expectedResponseType: NexusChecklistExpectedResponseType;
}

export interface NexusChecklistDefinition {
  checklistId: NexusId;
  revision: number;
  title: string;
  items: NexusChecklistDefinitionItem[];
}

export type NexusChecklistResponseValue = boolean | string | number | null;

export interface NexusChecklistItemResponse {
  itemId: NexusId;
  value: NexusChecklistResponseValue;
  respondedAt: NexusIsoDateTime;
}

export type NexusChecklistRunCompletionState = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETE';

export interface NexusChecklistRun {
  runId: NexusId;
  workPackageAssignmentId: NexusId;
  taskId: NexusId;
  workerPersonId: NexusId;
  checklistId: NexusId;
  checklistRevision: number;
  itemResponses: NexusChecklistItemResponse[];
  startedAt: NexusIsoDateTime;
  updatedAt: NexusIsoDateTime;
  completedAt?: NexusIsoDateTime;
  completionState: NexusChecklistRunCompletionState;
}

export interface NexusEvidenceRequirement {
  requirementId: NexusId;
  kind: string;
  taskId?: NexusId;
  workPackageId: NexusId;
  requiredCount: number;
  allowedEvidenceType: NexusEvidenceType;
  description: string;
  requiredBeforeFinish: boolean;
  objectContextId?: NexusId;
  locationContextId?: NexusId;
}

export interface NexusWorkPackageGroup {
  groupId: NexusId;
  order: number;
  title: string;
}

export interface NexusWorkPackageItem {
  itemId: NexusId;
  order: number;
  groupId?: NexusId;
  kind: NexusWorkPackageItemKind;
  title: string;
  required: boolean;
  taskId?: NexusId;
  appId?: NexusId;
  moduleId?: string;
  documentId?: NexusId;
  fileId?: NexusId;
  drawingReferenceId?: NexusId;
  checklistId?: NexusId;
  evidenceRequirementId?: NexusId;
  objectContextId?: NexusId;
  locationContextId?: NexusId;
  targetCapabilityRequirements?: NexusTargetCapabilityRequirement[];
}

export interface NexusCanonicalWorkPackage {
  schema: typeof NEXUS_CANONICAL_WORK_PACKAGE_SCHEMA;
  packageId: NexusId;
  workspaceId: string | number;
  projectId: NexusId;
  worldId: NexusId;
  revision: number;
  lifecycle: NexusWorkPackageLifecycle;
  compositionState: NexusWorkPackageCompositionState;
  assignmentState: NexusWorkPackageAssignmentState;
  creatorPersonId: NexusId;
  createdAt: NexusIsoDateTime;
  updatedAt: NexusIsoDateTime;
  title: string;
  description?: string;
  groups: NexusWorkPackageGroup[];
  items: NexusWorkPackageItem[];
  checklistDefinitions: NexusChecklistDefinition[];
  evidenceRequirements: NexusEvidenceRequirement[];
  deadline?: NexusIsoDateTime;
  objectContextIds: NexusId[];
  locationContextIds: NexusId[];
}

export interface NexusAssignedWorkPackageSnapshot {
  packageId: NexusId;
  packageRevision: number;
  projectId: NexusId;
  worldId: NexusId;
  title: string;
  description?: string;
  groups: NexusWorkPackageGroup[];
  items: NexusWorkPackageItem[];
  checklistDefinitions: NexusChecklistDefinition[];
  evidenceRequirements: NexusEvidenceRequirement[];
  deadline?: NexusIsoDateTime;
  objectContextIds: NexusId[];
  locationContextIds: NexusId[];
}

export type NexusWorkPackageAssignmentRecipient =
  | { type: 'PERSON'; personId: NexusId }
  | { type: 'OBJECT'; objectId: NexusId };

export type NexusWorkPackageAssignmentStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface NexusWorkPackageAssignment {
  assignmentId: NexusId;
  packageId: NexusId;
  assignedPackageRevision: number;
  recipient: NexusWorkPackageAssignmentRecipient;
  assignedByPersonId: NexusId;
  assignedAt: NexusIsoDateTime;
  status: NexusWorkPackageAssignmentStatus;
  deadlineSnapshot?: NexusIsoDateTime;
  sourceSemanticOperationId: NexusId;
  lifecycleState: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  snapshot: NexusAssignedWorkPackageSnapshot;
}

export type NexusSemanticIntent =
  | 'TASK_TO_PERSON'
  | 'APP_TO_PERSON'
  | 'DOCUMENT_TO_TASK'
  | 'WORK_PACKAGE_TO_PERSON'
  | 'WORK_PACKAGE_TO_OBJECT';

export type NexusSemanticReference =
  | { type: 'TASK'; id: NexusId }
  | { type: 'APP'; id: NexusId }
  | { type: 'DOCUMENT'; id: NexusId }
  | { type: 'WORK_PACKAGE'; id: NexusId }
  | { type: 'PERSON'; id: NexusId }
  | { type: 'OBJECT'; id: NexusId };

export interface NexusCompanionCapabilityGrant {
  intentId: NexusId;
  grantId: NexusId;
  moduleId: string;
  actionKey: string;
  objectScopeId?: NexusId;
  dataScope?: string;
  reason: string;
}

export interface NexusSemanticOperationRequest {
  schema: typeof NEXUS_SEMANTIC_OPERATION_SCHEMA;
  semanticOperationId: NexusId;
  session: NexusTrustedSessionIdentity;
  workspaceId: string | number;
  projectId: NexusId;
  worldId: NexusId;
  intent: NexusSemanticIntent;
  source: NexusSemanticReference;
  target: NexusSemanticReference;
  packageId?: NexusId;
  expectedPackageRevision?: number;
  occurredAt: NexusIsoDateTime;
  companionGrants?: NexusCompanionCapabilityGrant[];
}

export type NexusSemanticEffect =
  | { type: 'CREATE_WORK_PACKAGE_ASSIGNMENT'; assignmentId: NexusId; recipient: NexusWorkPackageAssignmentRecipient }
  | { type: 'PROJECT_TASK_ASSIGNMENT'; taskId: NexusId; personId: NexusId }
  | { type: 'PROJECT_DOCUMENT_TASK_LINK'; documentId: NexusId; taskId: NexusId }
  | { type: 'PROJECT_RELATIONSHIP_EDGE'; edgeId: NexusId; sourceId: NexusId; targetId: NexusId; relationshipType: 'ASSIGNED_TO' | 'RELATES_TO' }
  | { type: 'COMPANION_PERMISSION_GRANT'; grantId: NexusId; intentId: NexusId; targetPersonId: NexusId }
  | { type: 'PROJECT_MEMORY_EVENT'; eventId: NexusId; timelineEventId: NexusId };

export interface NexusSemanticOperationPlan {
  schema: typeof NEXUS_SEMANTIC_OPERATION_SCHEMA;
  semanticOperationId: NexusId;
  fingerprint: string;
  intent: NexusSemanticIntent;
  actorPersonId: NexusId;
  authorityRequest: NexusCanonicalAuthorityRequest;
  authorityRevision: string;
  expectedPackageRevision?: number;
  effects: NexusSemanticEffect[];
}

export type NexusSemanticValidationFailureCode =
  | 'INVALID_SHAPE'
  | 'SOURCE_TARGET_INCOMPATIBLE'
  | 'SOURCE_NOT_FOUND'
  | 'TARGET_NOT_FOUND'
  | 'WRONG_PROJECT_WORLD'
  | 'PACKAGE_NOT_FOUND'
  | 'STALE_PACKAGE_REVISION'
  | 'PACKAGE_NOT_ASSIGNABLE'
  | 'DUPLICATE_ASSIGNMENT'
  | 'COMPANION_GRANT_INVALID'
  | 'AUTHORITY_DENIED'
  | 'AUTHORITY_STALE';

export interface NexusSemanticValidationFailure {
  code: NexusSemanticValidationFailureCode;
  message: string;
}

export type NexusSemanticValidationResult =
  | {
      schema: typeof NEXUS_SEMANTIC_OPERATION_SCHEMA;
      status: 'VALID';
      plan: NexusSemanticOperationPlan;
      authority: NexusCanonicalAuthorityEvaluation;
    }
  | {
      schema: typeof NEXUS_SEMANTIC_OPERATION_SCHEMA;
      status: 'INVALID';
      failures: NexusSemanticValidationFailure[];
      authority?: NexusCanonicalAuthorityEvaluation;
    };

export type NexusSemanticCommitStatus =
  | 'COMMITTED'
  | 'ALREADY_COMMITTED'
  | 'IDEMPOTENCY_CONFLICT'
  | 'BLOCKED';

export interface NexusSemanticOperationReceipt {
  semanticOperationId: NexusId;
  fingerprint: string;
  intent: NexusSemanticIntent;
  actorPersonId: NexusId;
  projectId: NexusId;
  worldId: NexusId;
  authorityRevision: string;
  committedAt: NexusIsoDateTime;
  assignmentId?: NexusId;
  eventId: NexusId;
  timelineEventId: NexusId;
}

export interface NexusSemanticCommitResult {
  schema: typeof NEXUS_SEMANTIC_OPERATION_SCHEMA;
  status: NexusSemanticCommitStatus;
  memory: NexusProjectMemorySnapshot;
  receipt?: NexusSemanticOperationReceipt;
  assignment?: NexusWorkPackageAssignment;
  failures?: NexusSemanticValidationFailure[];
}

export interface NexusComposeWorkPackageInput {
  packageId: NexusId;
  session: NexusTrustedSessionIdentity;
  workspaceId: string | number;
  projectId: NexusId;
  worldId: NexusId;
  occurredAt: NexusIsoDateTime;
  title: string;
  description?: string;
  groups?: NexusWorkPackageGroup[];
  items?: NexusWorkPackageItem[];
  checklistDefinitions?: NexusChecklistDefinition[];
  evidenceRequirements?: NexusEvidenceRequirement[];
  deadline?: NexusIsoDateTime;
  objectContextIds?: NexusId[];
  locationContextIds?: NexusId[];
}

export interface NexusReviseWorkPackageInput {
  packageId: NexusId;
  expectedRevision: number;
  session: NexusTrustedSessionIdentity;
  occurredAt: NexusIsoDateTime;
  title?: string;
  description?: string;
  groups?: NexusWorkPackageGroup[];
  items?: NexusWorkPackageItem[];
  checklistDefinitions?: NexusChecklistDefinition[];
  evidenceRequirements?: NexusEvidenceRequirement[];
  deadline?: NexusIsoDateTime | null;
  objectContextIds?: NexusId[];
  locationContextIds?: NexusId[];
}

export type NexusWorkPackageMutationResult =
  | { status: 'APPLIED'; workPackage: NexusCanonicalWorkPackage }
  | { status: 'BLOCKED'; failures: NexusSemanticValidationFailure[] };
