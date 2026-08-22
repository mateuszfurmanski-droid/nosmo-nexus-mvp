import type { NexusId } from './schemas/common.schema';
import type { NexusAsOfContext } from './schemas/temporal.schema';

export type NexusProjectMemoryActionType =
  | 'create-project'
  | 'create-project-world'
  | 'attach-file-to-project'
  | 'link-person-to-project'
  | 'add-evidence'
  | 'add-task'
  | 'add-timeline-event'
  | 'connect-graph-nodes'
  | 'resolve-access'
  | 'resolve-as-of-state'
  | 'move-record-between-worlds';

export interface NexusProjectMemoryAction<TPayload = Record<string, unknown>> {
  type: NexusProjectMemoryActionType;
  payload: TPayload;
  requestedByPersonId?: NexusId;
  projectId?: NexusId;
  worldId?: NexusId;
  requiresAccessDecision: boolean;
  writesAuditEvent: boolean;
  blockedByDefault?: boolean;
  reason?: string;
}

export interface NexusProjectMemoryActionPolicy {
  requiresAccessDecision: boolean;
  writesAuditEvent: boolean;
  blockedByDefault?: boolean;
}

export const PROJECT_MEMORY_ACTION_POLICY: Record<NexusProjectMemoryActionType, NexusProjectMemoryActionPolicy> = {
  'create-project': { requiresAccessDecision: true, writesAuditEvent: true },
  'create-project-world': { requiresAccessDecision: true, writesAuditEvent: true },
  'attach-file-to-project': { requiresAccessDecision: true, writesAuditEvent: true },
  'link-person-to-project': { requiresAccessDecision: true, writesAuditEvent: true },
  'add-evidence': { requiresAccessDecision: true, writesAuditEvent: true },
  'add-task': { requiresAccessDecision: true, writesAuditEvent: true },
  'add-timeline-event': { requiresAccessDecision: true, writesAuditEvent: true },
  'connect-graph-nodes': { requiresAccessDecision: true, writesAuditEvent: true },
  'resolve-access': { requiresAccessDecision: false, writesAuditEvent: false },
  'resolve-as-of-state': { requiresAccessDecision: false, writesAuditEvent: false },
  'move-record-between-worlds': { requiresAccessDecision: true, writesAuditEvent: true, blockedByDefault: true },
};

const policyFor = (type: NexusProjectMemoryActionType): NexusProjectMemoryActionPolicy =>
  PROJECT_MEMORY_ACTION_POLICY[type];

export const createProjectAction = (payload: Record<string, unknown>, requestedByPersonId?: NexusId): NexusProjectMemoryAction => ({
  type: 'create-project',
  payload,
  requestedByPersonId,
  ...policyFor('create-project'),
});

export const attachFileToProjectAction = (projectId: NexusId, worldId: NexusId, payload: Record<string, unknown>, requestedByPersonId?: NexusId): NexusProjectMemoryAction => ({
  type: 'attach-file-to-project',
  payload,
  projectId,
  worldId,
  requestedByPersonId,
  ...policyFor('attach-file-to-project'),
});

export const connectGraphNodesAction = (projectId: NexusId, worldId: NexusId, fromNodeId: NexusId, toNodeId: NexusId, relationshipType: string, requestedByPersonId?: NexusId): NexusProjectMemoryAction => ({
  type: 'connect-graph-nodes',
  payload: { fromNodeId, toNodeId, relationshipType },
  projectId,
  worldId,
  requestedByPersonId,
  ...policyFor('connect-graph-nodes'),
});

export const resolveAsOfStateAction = (context: NexusAsOfContext): NexusProjectMemoryAction<NexusAsOfContext> => ({
  type: 'resolve-as-of-state',
  payload: context,
  projectId: context.projectId,
  worldId: context.worldId,
  ...policyFor('resolve-as-of-state'),
});

export const blockedMoveRecordBetweenWorldsAction = (recordId: NexusId, fromWorldId: NexusId, toWorldId: NexusId): NexusProjectMemoryAction => ({
  type: 'move-record-between-worlds',
  payload: { recordId, fromWorldId, toWorldId },
  worldId: fromWorldId,
  ...policyFor('move-record-between-worlds'),
  reason: 'Project worlds are isolated by default. Cross-world movement requires an explicit approved migration policy.',
});
