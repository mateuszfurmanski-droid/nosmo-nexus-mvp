import type { NexusAccessDecisionRecord, NexusPermissionGrantRecord, NexusProjectParticipationRecord } from './schemas/access.schema';
import type { NexusId, NexusProvenanceClass } from './schemas/common.schema';
import type { NexusApprovalRecord, NexusEvidenceRecord, NexusEvidenceType } from './schemas/evidence.schema';
import type { NexusTaskRecord, NexusTaskStatus } from './schemas/task.schema';
import type { NexusTimelineEventRecord, NexusTimelineEventType } from './schemas/timeline.schema';
import type { NexusProjectMemorySnapshot } from './projectMemory';

export const NEXUS_CORE_WORK_CYCLE_SCHEMA = 'nexus-core-work-cycle/v1' as const;
export const NEXUS_CORE_WORK_MODULE = 'worksuite' as const;

export const NEXUS_CORE_WORK_ACTIONS = {
  startTask: 'worksuite.task.start',
  addEvidence: 'worksuite.evidence.add',
  requestApproval: 'worksuite.approval.request',
  decideApproval: 'worksuite.approval.decide',
} as const;

export type NexusCoreWorkActionKey =
  (typeof NEXUS_CORE_WORK_ACTIONS)[keyof typeof NEXUS_CORE_WORK_ACTIONS];

export type NexusCoreWorkFailureCode =
  | 'TASK_NOT_FOUND'
  | 'TASK_SCOPE_INVALID'
  | 'TASK_STATE_INVALID'
  | 'PERSON_NOT_FOUND'
  | 'PARTICIPATION_INVALID'
  | 'ACCESS_DECISION_INVALID'
  | 'ACCESS_DENIED'
  | 'EVIDENCE_INVALID'
  | 'APPROVAL_INVALID'
  | 'ID_CONFLICT';

export interface NexusCoreWorkFailure {
  code: NexusCoreWorkFailureCode;
  message: string;
}

export type NexusCoreWorkResult =
  | {
      schema: typeof NEXUS_CORE_WORK_CYCLE_SCHEMA;
      status: 'APPLIED' | 'ALREADY_APPLIED';
      memory: NexusProjectMemorySnapshot;
      taskId: NexusId;
      timelineEventId: NexusId;
      evidenceId?: NexusId;
      approvalId?: NexusId;
    }
  | {
      schema: typeof NEXUS_CORE_WORK_CYCLE_SCHEMA;
      status: 'BLOCKED' | 'CONFLICT';
      memory: NexusProjectMemorySnapshot;
      failures: NexusCoreWorkFailure[];
    };

interface NexusCoreWorkAuthorityInput {
  memory: NexusProjectMemorySnapshot;
  taskId: NexusId;
  actorPersonId: NexusId;
  accessDecisionId: NexusId;
  actionKey: NexusCoreWorkActionKey;
  occurredAt: string;
}

interface NexusCoreWorkAuthority {
  task: NexusTaskRecord;
  participation: NexusProjectParticipationRecord;
  decision: NexusAccessDecisionRecord;
}

export interface NexusStartTaskInput extends Omit<NexusCoreWorkAuthorityInput, 'actionKey'> {
  timelineEventId: NexusId;
  note?: string;
}

export interface NexusAddEvidenceInput extends Omit<NexusCoreWorkAuthorityInput, 'actionKey'> {
  evidenceId: NexusId;
  timelineEventId: NexusId;
  evidenceType: NexusEvidenceType;
  title: string;
  description?: string;
  linkedFileId?: NexusId;
  linkedAssetId?: NexusId;
  linkedInspectionId?: NexusId;
  answerText?: string;
  provenanceClass?: NexusProvenanceClass;
}

export interface NexusRequestApprovalInput extends Omit<NexusCoreWorkAuthorityInput, 'actionKey'> {
  approvalId: NexusId;
  timelineEventId: NexusId;
  evidenceIds: NexusId[];
  title?: string;
}

export interface NexusDecideApprovalInput extends Omit<NexusCoreWorkAuthorityInput, 'actionKey'> {
  approvalId: NexusId;
  timelineEventId: NexusId;
  decision: 'approved' | 'rejected';
  reason: string;
}

const validAt = (at: string, from?: string, to?: string): boolean => {
  const value = Date.parse(at);
  if (!Number.isFinite(value)) return false;
  if (from && Date.parse(from) > value) return false;
  if (to && Date.parse(to) < value) return false;
  return true;
};

const grantMatches = (
  grant: NexusPermissionGrantRecord,
  participation: NexusProjectParticipationRecord,
  actionKey: NexusCoreWorkActionKey,
  occurredAt: string,
): boolean =>
  grant.status === 'active' &&
  grant.participationId === participation.id &&
  participation.permissionGrantIds.includes(grant.id) &&
  validAt(occurredAt, grant.validFrom, grant.validTo) &&
  (!grant.moduleId || grant.moduleId === NEXUS_CORE_WORK_MODULE) &&
  (!grant.actionKey || grant.actionKey === actionKey);

const resolveAuthority = (input: NexusCoreWorkAuthorityInput): NexusCoreWorkAuthority | NexusCoreWorkFailure[] => {
  const { memory } = input;
  const failures: NexusCoreWorkFailure[] = [];
  const task = memory.tasks.find((candidate) => candidate.id === input.taskId && candidate.status === 'active');
  if (!task) {
    failures.push({ code: 'TASK_NOT_FOUND', message: `Active task ${input.taskId} was not found.` });
    return failures;
  }

  const world = memory.worlds.find((candidate) => candidate.id === task.worldId && candidate.status === 'active');
  if (!world || world.projectId !== task.projectId) {
    failures.push({ code: 'TASK_SCOPE_INVALID', message: 'Task does not resolve to one active canonical project/world scope.' });
  }

  const person = memory.people.find((candidate) => candidate.id === input.actorPersonId && candidate.status === 'active');
  if (!person) failures.push({ code: 'PERSON_NOT_FOUND', message: `Active Person ${input.actorPersonId} was not found.` });

  const participations = memory.projectParticipations.filter(
    (candidate) =>
      candidate.status === 'active' &&
      candidate.participationStatus === 'active' &&
      candidate.personId === input.actorPersonId &&
      candidate.projectId === task.projectId &&
      candidate.worldId === task.worldId &&
      validAt(input.occurredAt, candidate.validFrom, candidate.validTo),
  );

  if (participations.length !== 1) {
    failures.push({
      code: 'PARTICIPATION_INVALID',
      message: `Exactly one active Project Participation is required; resolved ${participations.length}.`,
    });
  }

  const participation = participations[0];
  const decision = memory.accessDecisions.find((candidate) => candidate.id === input.accessDecisionId);
  if (
    !decision ||
    decision.status !== 'active' ||
    !participation ||
    decision.personId !== input.actorPersonId ||
    decision.projectId !== task.projectId ||
    decision.worldId !== task.worldId ||
    decision.participationId !== participation.id ||
    decision.moduleId !== NEXUS_CORE_WORK_MODULE ||
    decision.actionKey !== input.actionKey ||
    decision.result !== 'allowed' ||
    !validAt(input.occurredAt, undefined, undefined)
  ) {
    failures.push({
      code: 'ACCESS_DECISION_INVALID',
      message: `An exact allowed ${NEXUS_CORE_WORK_MODULE}/${input.actionKey} AccessDecision is required.`,
    });
  }

  if (participation) {
    const grants = memory.permissionGrants.filter((grant) => grantMatches(grant, participation, input.actionKey, input.occurredAt));
    if (grants.some((grant) => grant.effect === 'deny')) {
      failures.push({ code: 'ACCESS_DENIED', message: 'An explicit matching deny grant blocks the WorkSuite action.' });
    } else if (!grants.some((grant) => grant.effect === 'allow')) {
      failures.push({ code: 'ACCESS_DENIED', message: 'No explicit matching allow grant exists for the WorkSuite action.' });
    }
  }

  return failures.length || !participation || !decision ? failures : { task, participation, decision };
};

const allIds = (memory: NexusProjectMemorySnapshot): Set<NexusId> => {
  const ids = new Set<NexusId>();
  const collections: Array<ReadonlyArray<{ id: NexusId }>> = [
    memory.projects,
    memory.worlds,
    memory.companies,
    memory.people,
    memory.projectRoles,
    memory.files,
    memory.drawingReferences,
    memory.tasks,
    memory.assets,
    memory.evidence,
    memory.approvals,
    memory.timelineEvents,
    memory.canonicalObjects,
    memory.relationshipEdges,
    memory.externalReferences,
    memory.nexusEvents,
    memory.fieldChanges,
    memory.humanDecisions,
    memory.connectorDefinitions,
    memory.connectorAccounts,
    memory.connectorObjectMappings,
    memory.projectParticipations,
    memory.roleAssignments,
    memory.tradeAssignments,
    memory.permissionGrants,
    memory.moduleEntitlements,
    memory.managerTradeContexts,
    memory.accessDecisions,
    memory.storageRecords,
  ];
  for (const collection of collections) for (const record of collection) ids.add(record.id);
  for (const node of memory.graphNodes) ids.add(node.id);
  for (const edge of memory.graphEdges) ids.add(edge.id);
  return ids;
};

const timelineMatches = (
  timeline: NexusTimelineEventRecord | undefined,
  expected: {
    projectId: NexusId;
    worldId: NexusId;
    eventType: NexusTimelineEventType;
    actorPersonId: NexusId;
    relatedRecordIds: NexusId[];
    operation: string;
  },
): boolean => {
  if (!timeline) return false;
  const left = [...timeline.relatedRecordIds].sort();
  const right = [...expected.relatedRecordIds].sort();
  return (
    timeline.projectId === expected.projectId &&
    timeline.worldId === expected.worldId &&
    timeline.eventType === expected.eventType &&
    timeline.actorPersonId === expected.actorPersonId &&
    timeline.payload?.operation === expected.operation &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
};

const makeTimeline = (input: {
  id: NexusId;
  task: NexusTaskRecord;
  actorPersonId: NexusId;
  occurredAt: string;
  eventType: NexusTimelineEventType;
  title: string;
  description?: string;
  relatedRecordIds: NexusId[];
  operation: string;
  payload?: Record<string, unknown>;
}): NexusTimelineEventRecord => ({
  id: input.id,
  status: 'active',
  title: input.title,
  description: input.description,
  createdAt: input.occurredAt,
  updatedAt: input.occurredAt,
  createdBy: input.actorPersonId,
  updatedBy: input.actorPersonId,
  sourceSystem: 'nexus',
  confidence: 'confirmed',
  projectId: input.task.projectId,
  worldId: input.task.worldId,
  eventType: input.eventType,
  eventAt: input.occurredAt,
  actorPersonId: input.actorPersonId,
  relatedRecordIds: input.relatedRecordIds,
  payload: { operation: input.operation, ...input.payload },
});

const blocked = (memory: NexusProjectMemorySnapshot, failures: NexusCoreWorkFailure[]): NexusCoreWorkResult => ({
  schema: NEXUS_CORE_WORK_CYCLE_SCHEMA,
  status: failures.some((failure) => failure.code === 'ID_CONFLICT') ? 'CONFLICT' : 'BLOCKED',
  memory,
  failures,
});

const updateTask = (memory: NexusProjectMemorySnapshot, task: NexusTaskRecord): NexusProjectMemorySnapshot => ({
  ...memory,
  tasks: memory.tasks.map((candidate) => (candidate.id === task.id ? task : candidate)),
});

export const startNexusTask = (input: NexusStartTaskInput): NexusCoreWorkResult => {
  const authority = resolveAuthority({ ...input, actionKey: NEXUS_CORE_WORK_ACTIONS.startTask });
  if (Array.isArray(authority)) return blocked(input.memory, authority);
  const { task } = authority;
  const existingTimeline = input.memory.timelineEvents.find((event) => event.id === input.timelineEventId);
  const expectedTimeline = {
    projectId: task.projectId,
    worldId: task.worldId,
    eventType: 'task-updated' as const,
    actorPersonId: input.actorPersonId,
    relatedRecordIds: [task.id],
    operation: NEXUS_CORE_WORK_ACTIONS.startTask,
  };

  if (existingTimeline) {
    if (timelineMatches(existingTimeline, expectedTimeline)) {
      return { schema: NEXUS_CORE_WORK_CYCLE_SCHEMA, status: 'ALREADY_APPLIED', memory: input.memory, taskId: task.id, timelineEventId: existingTimeline.id };
    }
    return blocked(input.memory, [{ code: 'ID_CONFLICT', message: `Timeline ID ${input.timelineEventId} is already used by another operation.` }]);
  }
  if (allIds(input.memory).has(input.timelineEventId)) return blocked(input.memory, [{ code: 'ID_CONFLICT', message: `ID ${input.timelineEventId} is already used by Project Memory.` }]);
  if (task.taskStatus !== 'todo') return blocked(input.memory, [{ code: 'TASK_STATE_INVALID', message: `Task ${task.id} must be todo before it can start; current state is ${task.taskStatus}.` }]);

  const nextTask: NexusTaskRecord = { ...task, taskStatus: 'in-progress', updatedAt: input.occurredAt, updatedBy: input.actorPersonId };
  const timeline = makeTimeline({
    id: input.timelineEventId,
    task,
    actorPersonId: input.actorPersonId,
    occurredAt: input.occurredAt,
    eventType: 'task-updated',
    title: `Work started: ${task.title}`,
    description: input.note,
    relatedRecordIds: [task.id],
    operation: NEXUS_CORE_WORK_ACTIONS.startTask,
    payload: { fromStatus: task.taskStatus, toStatus: nextTask.taskStatus },
  });
  const memory = updateTask(input.memory, nextTask);
  return {
    schema: NEXUS_CORE_WORK_CYCLE_SCHEMA,
    status: 'APPLIED',
    memory: { ...memory, timelineEvents: [...memory.timelineEvents, timeline] },
    taskId: task.id,
    timelineEventId: timeline.id,
  };
};

export const addNexusTaskEvidence = (input: NexusAddEvidenceInput): NexusCoreWorkResult => {
  const authority = resolveAuthority({ ...input, actionKey: NEXUS_CORE_WORK_ACTIONS.addEvidence });
  if (Array.isArray(authority)) return blocked(input.memory, authority);
  const { task } = authority;
  const existingEvidence = input.memory.evidence.find((record) => record.id === input.evidenceId);
  const existingTimeline = input.memory.timelineEvents.find((event) => event.id === input.timelineEventId);
  const expectedTimeline = {
    projectId: task.projectId,
    worldId: task.worldId,
    eventType: 'evidence-captured' as const,
    actorPersonId: input.actorPersonId,
    relatedRecordIds: [task.id, input.evidenceId],
    operation: NEXUS_CORE_WORK_ACTIONS.addEvidence,
  };

  if (existingEvidence || existingTimeline) {
    const evidenceMatches =
      existingEvidence?.projectId === task.projectId &&
      existingEvidence?.worldId === task.worldId &&
      existingEvidence?.linkedTaskId === task.id &&
      existingEvidence?.evidenceType === input.evidenceType &&
      existingEvidence?.title === input.title;
    if (evidenceMatches && timelineMatches(existingTimeline, expectedTimeline) && (task.relatedEvidenceIds ?? []).includes(input.evidenceId)) {
      return { schema: NEXUS_CORE_WORK_CYCLE_SCHEMA, status: 'ALREADY_APPLIED', memory: input.memory, taskId: task.id, evidenceId: input.evidenceId, timelineEventId: input.timelineEventId };
    }
    return blocked(input.memory, [{ code: 'ID_CONFLICT', message: 'Evidence/timeline retry does not match the existing semantic operation.' }]);
  }

  const ids = allIds(input.memory);
  if (ids.has(input.evidenceId) || ids.has(input.timelineEventId) || input.evidenceId === input.timelineEventId) {
    return blocked(input.memory, [{ code: 'ID_CONFLICT', message: 'Evidence and Timeline IDs must be new and distinct.' }]);
  }
  if (!['in-progress', 'blocked'].includes(task.taskStatus)) {
    return blocked(input.memory, [{ code: 'TASK_STATE_INVALID', message: `Evidence can be added only while work is in-progress/blocked; current state is ${task.taskStatus}.` }]);
  }
  if (input.linkedFileId && !input.memory.files.some((file) => file.id === input.linkedFileId && file.projectId === task.projectId && file.worldId === task.worldId)) {
    return blocked(input.memory, [{ code: 'EVIDENCE_INVALID', message: 'linkedFileId must reference an existing File in the exact task project/world.' }]);
  }
  if (input.linkedAssetId && !input.memory.assets.some((asset) => asset.id === input.linkedAssetId && asset.projectId === task.projectId && asset.worldId === task.worldId)) {
    return blocked(input.memory, [{ code: 'EVIDENCE_INVALID', message: 'linkedAssetId must reference an existing Asset in the exact task project/world.' }]);
  }

  const evidence: NexusEvidenceRecord = {
    id: input.evidenceId,
    status: 'active',
    title: input.title.trim(),
    description: input.description,
    createdAt: input.occurredAt,
    updatedAt: input.occurredAt,
    createdBy: input.actorPersonId,
    updatedBy: input.actorPersonId,
    sourceSystem: 'nexus',
    confidence: 'manual',
    provenanceClass: input.provenanceClass,
    evidenceType: input.evidenceType,
    evidenceStatus: 'captured',
    projectId: task.projectId,
    worldId: task.worldId,
    linkedFileId: input.linkedFileId,
    linkedTaskId: task.id,
    linkedPersonId: input.actorPersonId,
    linkedAssetId: input.linkedAssetId,
    linkedInspectionId: input.linkedInspectionId,
    answerText: input.answerText,
    capturedAt: input.occurredAt,
  };
  if (!evidence.title) return blocked(input.memory, [{ code: 'EVIDENCE_INVALID', message: 'Evidence title cannot be empty.' }]);

  const nextTask: NexusTaskRecord = {
    ...task,
    relatedEvidenceIds: [...new Set([...(task.relatedEvidenceIds ?? []), evidence.id])],
    updatedAt: input.occurredAt,
    updatedBy: input.actorPersonId,
  };
  const timeline = makeTimeline({
    id: input.timelineEventId,
    task,
    actorPersonId: input.actorPersonId,
    occurredAt: input.occurredAt,
    eventType: 'evidence-captured',
    title: `Evidence captured: ${evidence.title}`,
    relatedRecordIds: [task.id, evidence.id],
    operation: NEXUS_CORE_WORK_ACTIONS.addEvidence,
    payload: { evidenceType: evidence.evidenceType },
  });
  const memory = updateTask(input.memory, nextTask);
  return {
    schema: NEXUS_CORE_WORK_CYCLE_SCHEMA,
    status: 'APPLIED',
    memory: { ...memory, evidence: [...memory.evidence, evidence], timelineEvents: [...memory.timelineEvents, timeline] },
    taskId: task.id,
    evidenceId: evidence.id,
    timelineEventId: timeline.id,
  };
};

export const requestNexusTaskApproval = (input: NexusRequestApprovalInput): NexusCoreWorkResult => {
  const authority = resolveAuthority({ ...input, actionKey: NEXUS_CORE_WORK_ACTIONS.requestApproval });
  if (Array.isArray(authority)) return blocked(input.memory, authority);
  const { task } = authority;
  const evidenceIds = [...new Set(input.evidenceIds)];
  if (!evidenceIds.length || evidenceIds.length !== input.evidenceIds.length) {
    return blocked(input.memory, [{ code: 'APPROVAL_INVALID', message: 'Approval requires one or more unique evidence IDs.' }]);
  }
  const evidence = evidenceIds.map((id) => input.memory.evidence.find((record) => record.id === id));
  if (evidence.some((record) => !record || record.projectId !== task.projectId || record.worldId !== task.worldId || record.linkedTaskId !== task.id || record.status !== 'active')) {
    return blocked(input.memory, [{ code: 'APPROVAL_INVALID', message: 'Every approval evidence record must be active and linked to the exact task/project/world.' }]);
  }

  const existingApproval = input.memory.approvals.find((record) => record.id === input.approvalId);
  const existingTimeline = input.memory.timelineEvents.find((event) => event.id === input.timelineEventId);
  const expectedTimeline = {
    projectId: task.projectId,
    worldId: task.worldId,
    eventType: 'approval-updated' as const,
    actorPersonId: input.actorPersonId,
    relatedRecordIds: [task.id, input.approvalId, ...evidenceIds],
    operation: NEXUS_CORE_WORK_ACTIONS.requestApproval,
  };
  if (existingApproval || existingTimeline) {
    const sameEvidence = existingApproval && [...existingApproval.evidenceIds].sort().join('|') === [...evidenceIds].sort().join('|');
    if (existingApproval?.projectId === task.projectId && existingApproval.worldId === task.worldId && sameEvidence && timelineMatches(existingTimeline, expectedTimeline)) {
      return { schema: NEXUS_CORE_WORK_CYCLE_SCHEMA, status: 'ALREADY_APPLIED', memory: input.memory, taskId: task.id, approvalId: input.approvalId, timelineEventId: input.timelineEventId };
    }
    return blocked(input.memory, [{ code: 'ID_CONFLICT', message: 'Approval/timeline retry does not match the existing semantic operation.' }]);
  }

  const ids = allIds(input.memory);
  if (ids.has(input.approvalId) || ids.has(input.timelineEventId) || input.approvalId === input.timelineEventId) {
    return blocked(input.memory, [{ code: 'ID_CONFLICT', message: 'Approval and Timeline IDs must be new and distinct.' }]);
  }
  if (!['in-progress', 'blocked'].includes(task.taskStatus)) {
    return blocked(input.memory, [{ code: 'TASK_STATE_INVALID', message: `Task must be in-progress/blocked before review; current state is ${task.taskStatus}.` }]);
  }

  const approval: NexusApprovalRecord = {
    id: input.approvalId,
    status: 'active',
    title: input.title?.trim() || `Approval: ${task.title}`,
    description: `Human review requested for ${evidenceIds.length} evidence record(s).`,
    createdAt: input.occurredAt,
    updatedAt: input.occurredAt,
    createdBy: input.actorPersonId,
    updatedBy: input.actorPersonId,
    sourceSystem: 'nexus',
    confidence: 'manual',
    provenanceClass: task.provenanceClass === 'SYNTHETIC_DEMO' ? 'SYNTHETIC_DEMO' : undefined,
    projectId: task.projectId,
    worldId: task.worldId,
    evidenceIds,
    approvalStatus: 'requested',
  };
  const nextTask: NexusTaskRecord = { ...task, taskStatus: 'ready-for-review', updatedAt: input.occurredAt, updatedBy: input.actorPersonId };
  const timeline = makeTimeline({
    id: input.timelineEventId,
    task,
    actorPersonId: input.actorPersonId,
    occurredAt: input.occurredAt,
    eventType: 'approval-updated',
    title: `Approval requested: ${task.title}`,
    relatedRecordIds: [task.id, approval.id, ...evidenceIds],
    operation: NEXUS_CORE_WORK_ACTIONS.requestApproval,
    payload: { approvalStatus: 'requested', evidenceCount: evidenceIds.length },
  });
  const memory = updateTask(input.memory, nextTask);
  return {
    schema: NEXUS_CORE_WORK_CYCLE_SCHEMA,
    status: 'APPLIED',
    memory: { ...memory, approvals: [...memory.approvals, approval], timelineEvents: [...memory.timelineEvents, timeline] },
    taskId: task.id,
    approvalId: approval.id,
    timelineEventId: timeline.id,
  };
};

export const decideNexusTaskApproval = (input: NexusDecideApprovalInput): NexusCoreWorkResult => {
  const authority = resolveAuthority({ ...input, actionKey: NEXUS_CORE_WORK_ACTIONS.decideApproval });
  if (Array.isArray(authority)) return blocked(input.memory, authority);
  const { task } = authority;
  const approval = input.memory.approvals.find((record) => record.id === input.approvalId && record.status === 'active');
  if (!approval || approval.projectId !== task.projectId || approval.worldId !== task.worldId) {
    return blocked(input.memory, [{ code: 'APPROVAL_INVALID', message: 'Approval does not exist in the exact task project/world.' }]);
  }
  if (!input.reason.trim()) return blocked(input.memory, [{ code: 'APPROVAL_INVALID', message: 'Human approval decision requires a non-empty reason.' }]);
  const approvalEvidence = approval.evidenceIds.map((id) => input.memory.evidence.find((record) => record.id === id));
  if (!approval.evidenceIds.length || approvalEvidence.some((record) => !record || record.linkedTaskId !== task.id)) {
    return blocked(input.memory, [{ code: 'APPROVAL_INVALID', message: 'Approval evidence no longer resolves to the exact task.' }]);
  }

  const existingTimeline = input.memory.timelineEvents.find((event) => event.id === input.timelineEventId);
  const expectedTimeline = {
    projectId: task.projectId,
    worldId: task.worldId,
    eventType: 'approval-updated' as const,
    actorPersonId: input.actorPersonId,
    relatedRecordIds: [task.id, approval.id, ...approval.evidenceIds],
    operation: NEXUS_CORE_WORK_ACTIONS.decideApproval,
  };
  if (approval.approvalStatus === input.decision && existingTimeline && timelineMatches(existingTimeline, expectedTimeline)) {
    return { schema: NEXUS_CORE_WORK_CYCLE_SCHEMA, status: 'ALREADY_APPLIED', memory: input.memory, taskId: task.id, approvalId: approval.id, timelineEventId: input.timelineEventId };
  }
  if (existingTimeline) return blocked(input.memory, [{ code: 'ID_CONFLICT', message: `Timeline ID ${input.timelineEventId} is already used by another operation.` }]);
  if (allIds(input.memory).has(input.timelineEventId)) return blocked(input.memory, [{ code: 'ID_CONFLICT', message: `ID ${input.timelineEventId} is already used by Project Memory.` }]);
  if (approval.approvalStatus !== 'requested' || task.taskStatus !== 'ready-for-review') {
    return blocked(input.memory, [{ code: 'TASK_STATE_INVALID', message: `Approval decision requires requested approval and ready-for-review task; current ${approval.approvalStatus}/${task.taskStatus}.` }]);
  }

  const approved = input.decision === 'approved';
  const nextApproval: NexusApprovalRecord = {
    ...approval,
    approvalStatus: input.decision,
    approvedByPersonId: approved ? input.actorPersonId : undefined,
    approvedAt: approved ? input.occurredAt : undefined,
    updatedAt: input.occurredAt,
    updatedBy: input.actorPersonId,
    description: `${approved ? 'Approved' : 'Rejected'} by human reviewer. Reason: ${input.reason.trim()}`,
  };
  const nextTaskStatus: NexusTaskStatus = approved ? 'done' : 'blocked';
  const nextTask: NexusTaskRecord = { ...task, taskStatus: nextTaskStatus, updatedAt: input.occurredAt, updatedBy: input.actorPersonId };
  const evidenceIds = new Set(approval.evidenceIds);
  const nextEvidence = input.memory.evidence.map((record) =>
    evidenceIds.has(record.id)
      ? { ...record, evidenceStatus: approved ? ('reviewed' as const) : ('rejected' as const), updatedAt: input.occurredAt, updatedBy: input.actorPersonId }
      : record,
  );
  const timeline = makeTimeline({
    id: input.timelineEventId,
    task,
    actorPersonId: input.actorPersonId,
    occurredAt: input.occurredAt,
    eventType: 'approval-updated',
    title: `${approved ? 'Approved' : 'Rejected'}: ${task.title}`,
    description: input.reason.trim(),
    relatedRecordIds: [task.id, approval.id, ...approval.evidenceIds],
    operation: NEXUS_CORE_WORK_ACTIONS.decideApproval,
    payload: { approvalStatus: input.decision, taskStatus: nextTaskStatus },
  });
  const memory = updateTask(input.memory, nextTask);
  return {
    schema: NEXUS_CORE_WORK_CYCLE_SCHEMA,
    status: 'APPLIED',
    memory: {
      ...memory,
      evidence: nextEvidence,
      approvals: memory.approvals.map((candidate) => (candidate.id === approval.id ? nextApproval : candidate)),
      timelineEvents: [...memory.timelineEvents, timeline],
    },
    taskId: task.id,
    approvalId: approval.id,
    timelineEventId: timeline.id,
  };
};
