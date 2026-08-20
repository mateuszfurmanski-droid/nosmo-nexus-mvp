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

export const createProjectAction = (payload: Record<string, unknown>, requestedByPersonId?: NexusId): NexusProjectMemoryAction => ({
  type: 'create-project',
  payload,
  requestedByPersonId,
  requiresAccessDecision: true,
  writesAuditEvent: true,
});

export const attachFileToProjectAction = (projectId: NexusId, worldId: NexusId, payload: Record<string, unknown>, requestedByPersonId?: NexusId): NexusProjectMemoryAction => ({
  type: 'attach-file-to-project',
  payload,
  projectId,
  worldId,
  requestedByPersonId,
  requiresAccessDecision: true,
  writesAuditEvent: true,
});

export const connectGraphNodesAction = (projectId: NexusId, worldId: NexusId, fromNodeId: NexusId, toNodeId: NexusId, relationshipType: string, requestedByPersonId?: NexusId): NexusProjectMemoryAction => ({
  type: 'connect-graph-nodes',
  payload: { fromNodeId, toNodeId, relationshipType },
  projectId,
  worldId,
  requestedByPersonId,
  requiresAccessDecision: true,
  writesAuditEvent: true,
});

export const resolveAsOfStateAction = (context: NexusAsOfContext): NexusProjectMemoryAction<NexusAsOfContext> => ({
  type: 'resolve-as-of-state',
  payload: context,
  projectId: context.projectId,
  worldId: context.worldId,
  requiresAccessDecision: false,
  writesAuditEvent: false,
});

export const blockedMoveRecordBetweenWorldsAction = (recordId: NexusId, fromWorldId: NexusId, toWorldId: NexusId): NexusProjectMemoryAction => ({
  type: 'move-record-between-worlds',
  payload: { recordId, fromWorldId, toWorldId },
  worldId: fromWorldId,
  requiresAccessDecision: true,
  writesAuditEvent: true,
  blockedByDefault: true,
  reason: 'Project worlds are isolated by default. Cross-world movement requires an explicit approved migration policy.',
});
