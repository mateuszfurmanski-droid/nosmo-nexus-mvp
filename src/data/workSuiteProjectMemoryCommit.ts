import type { NexusEventRecord, NexusHumanDecisionRecord } from './schemas/audit.schema';
import type { NexusId } from './schemas/common.schema';
import type { NexusTimelineEventRecord } from './schemas/timeline.schema';
import type { NexusProjectMemorySnapshot } from './projectMemory';

export const NEXUS_WORKSUITE_PROJECT_MEMORY_COMMIT_SCHEMA =
  'nexus-worksuite-project-memory-commit/v1' as const;

export type NexusWorkSuiteProjectMemoryCommitFailureCode =
  | 'SOURCE_EVENT_MISSING'
  | 'SOURCE_LINK_MISMATCH'
  | 'PROJECT_SCOPE_MISSING'
  | 'PROJECT_SCOPE_MISMATCH'
  | 'WORLD_SCOPE_MISMATCH'
  | 'OBJECT_SCOPE_MISMATCH'
  | 'ACTION_EVENT_INVALID'
  | 'HUMAN_DECISION_INVALID'
  | 'TIMELINE_EVENT_INVALID'
  | 'PARTIAL_COMMIT_CONFLICT'
  | 'RECORD_ID_CONFLICT';

export interface NexusWorkSuiteProjectMemoryCommitFailure {
  code: NexusWorkSuiteProjectMemoryCommitFailureCode;
  message: string;
}

export interface NexusWorkSuiteProjectMemoryCommitInput {
  memory: NexusProjectMemorySnapshot;
  sourceEventId: NexusId;
  actionEvent: NexusEventRecord;
  humanDecision: NexusHumanDecisionRecord;
  timelineEventId: NexusId;
}

export type NexusWorkSuiteProjectMemoryCommitResult =
  | {
      schema: typeof NEXUS_WORKSUITE_PROJECT_MEMORY_COMMIT_SCHEMA;
      status: 'COMMITTED';
      memory: NexusProjectMemorySnapshot;
      canonicalActionEventId: NexusId;
      humanDecisionId: NexusId;
      timelineEventId: NexusId;
    }
  | {
      schema: typeof NEXUS_WORKSUITE_PROJECT_MEMORY_COMMIT_SCHEMA;
      status: 'ALREADY_COMMITTED';
      memory: NexusProjectMemorySnapshot;
      canonicalActionEventId: NexusId;
      humanDecisionId: NexusId;
      timelineEventId: NexusId;
    }
  | {
      schema: typeof NEXUS_WORKSUITE_PROJECT_MEMORY_COMMIT_SCHEMA;
      status: 'BLOCKED' | 'CONFLICT';
      memory: NexusProjectMemorySnapshot;
      failures: NexusWorkSuiteProjectMemoryCommitFailure[];
    };

const sameRelatedIds = (left: NexusId[], right: NexusId[]): boolean => {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.every((value, index) => value === sortedRight[index]);
};

const isSameTimelineProjection = (
  existing: NexusTimelineEventRecord,
  expected: NexusTimelineEventRecord,
): boolean =>
  existing.projectId === expected.projectId &&
  existing.worldId === expected.worldId &&
  existing.eventType === expected.eventType &&
  existing.actorPersonId === expected.actorPersonId &&
  sameRelatedIds(existing.relatedRecordIds, expected.relatedRecordIds) &&
  existing.payload?.canonicalActionEventId === expected.payload?.canonicalActionEventId &&
  existing.payload?.sourceEventId === expected.payload?.sourceEventId;

const collectRecordIds = (collections: Array<ReadonlyArray<unknown>>): Set<NexusId> => {
  const ids = new Set<NexusId>();
  for (const collection of collections) {
    for (const value of collection) {
      if (!value || typeof value !== 'object' || !('id' in value)) continue;
      const id = (value as { id?: unknown }).id;
      if (typeof id === 'string') ids.add(id);
    }
  }
  return ids;
};

const nonActionRecordIds = (memory: NexusProjectMemorySnapshot): Set<NexusId> =>
  collectRecordIds([
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
    memory.graphNodes,
    memory.graphEdges,
    memory.canonicalObjects,
    memory.relationshipEdges,
    memory.externalReferences,
    memory.fieldChanges,
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
    memory.temporalRecords,
  ]);

/**
 * Commits one already-authorised WorkSuite action result into the existing
 * Project Memory snapshot as one semantic unit: human decision + canonical
 * action event + Timeline projection. This function is pure and does not claim
 * durable database atomicity; a persistent transaction adapter remains a later
 * server-side concern.
 */
export const commitWorkSuiteActionToProjectMemory = (
  input: NexusWorkSuiteProjectMemoryCommitInput,
): NexusWorkSuiteProjectMemoryCommitResult => {
  const failures: NexusWorkSuiteProjectMemoryCommitFailure[] = [];
  const { memory, actionEvent, humanDecision } = input;
  const sourceEvent = memory.nexusEvents.find((event) => event.id === input.sourceEventId);

  if (!sourceEvent) {
    failures.push({
      code: 'SOURCE_EVENT_MISSING',
      message: `Source canonical event ${input.sourceEventId} is not present in Project Memory.`,
    });
  }

  if (
    actionEvent.sourceReference !== input.sourceEventId ||
    humanDecision.proposalReference !== input.sourceEventId ||
    humanDecision.sourceRecordId !== input.sourceEventId
  ) {
    failures.push({
      code: 'SOURCE_LINK_MISMATCH',
      message: 'Action event and human decision must both reference the exact source canonical event supplied to the commit.',
    });
  }

  if (!actionEvent.projectId || !actionEvent.worldId) {
    failures.push({
      code: 'PROJECT_SCOPE_MISSING',
      message: 'WorkSuite action event requires exact projectId and worldId before Project Memory commit.',
    });
  }

  if (sourceEvent && actionEvent.projectId && sourceEvent.projectId !== actionEvent.projectId) {
    failures.push({
      code: 'PROJECT_SCOPE_MISMATCH',
      message: 'WorkSuite action project scope does not match its source event.',
    });
  }

  if (sourceEvent && actionEvent.worldId && sourceEvent.worldId !== actionEvent.worldId) {
    failures.push({
      code: 'WORLD_SCOPE_MISMATCH',
      message: 'WorkSuite action world scope does not match its source event.',
    });
  }

  if (sourceEvent && sourceEvent.primaryObjectId !== actionEvent.primaryObjectId) {
    failures.push({
      code: 'OBJECT_SCOPE_MISMATCH',
      message: 'WorkSuite action canonical object does not match its source event.',
    });
  }

  if (
    !actionEvent.eventType.startsWith('WORKSUITE_ACTION_') ||
    actionEvent.eventState !== 'APPLIED' ||
    actionEvent.sourceSystem !== 'nexus' ||
    actionEvent.actorType !== 'PERSON' ||
    !actionEvent.actorId
  ) {
    failures.push({
      code: 'ACTION_EVENT_INVALID',
      message: 'Project Memory commit accepts only an already-applied Nexus-authored WorkSuite action event with a human actor.',
    });
  }

  if (
    humanDecision.objectId !== actionEvent.primaryObjectId ||
    humanDecision.decidedByPersonId !== actionEvent.actorId ||
    humanDecision.decision !== 'ACCEPT' ||
    !humanDecision.reason.trim()
  ) {
    failures.push({
      code: 'HUMAN_DECISION_INVALID',
      message: 'Human decision must match the WorkSuite action object/actor and contain an accepted non-empty decision reason.',
    });
  }

  const proposedIds = [actionEvent.id, humanDecision.id, input.timelineEventId];
  if (
    new Set(proposedIds).size !== proposedIds.length ||
    proposedIds.includes(input.sourceEventId)
  ) {
    failures.push({
      code: 'RECORD_ID_CONFLICT',
      message: 'Action, human-decision and Timeline IDs must be distinct and must not reuse the source event ID.',
    });
  }

  const foreignIds = nonActionRecordIds(memory);
  if (proposedIds.some((id) => foreignIds.has(id))) {
    failures.push({
      code: 'RECORD_ID_CONFLICT',
      message: 'A proposed WorkSuite commit ID is already used by another Project Memory record category.',
    });
  }

  if (
    memory.humanDecisions.some((record) => record.id === actionEvent.id) ||
    memory.timelineEvents.some((record) => record.id === actionEvent.id) ||
    memory.nexusEvents.some((record) => record.id === humanDecision.id) ||
    memory.timelineEvents.some((record) => record.id === humanDecision.id) ||
    memory.nexusEvents.some((record) => record.id === input.timelineEventId) ||
    memory.humanDecisions.some((record) => record.id === input.timelineEventId)
  ) {
    failures.push({
      code: 'RECORD_ID_CONFLICT',
      message: 'A proposed WorkSuite record ID collides with a different canonical audit/Timeline collection.',
    });
  }

  const projectId = actionEvent.projectId;
  const worldId = actionEvent.worldId;
  const timelineEvent: NexusTimelineEventRecord | undefined =
    projectId && worldId
      ? {
          id: input.timelineEventId,
          status: 'active',
          title: actionEvent.title,
          description: actionEvent.summary,
          tags: ['worksuite', 'action', 'audit'],
          createdAt: actionEvent.recordedAt,
          updatedAt: actionEvent.recordedAt,
          createdBy: actionEvent.actorId,
          sourceSystem: 'nexus',
          sourceRecordId: actionEvent.id,
          confidence: 'confirmed',
          projectId,
          worldId,
          eventType: 'worksuite-action',
          eventAt: actionEvent.occurredAt,
          actorPersonId: actionEvent.actorId,
          relatedRecordIds: [input.sourceEventId, humanDecision.id, actionEvent.id],
          payload: {
            canonicalActionEventId: actionEvent.id,
            sourceEventId: input.sourceEventId,
            actionEventType: actionEvent.eventType,
            eventState: actionEvent.eventState,
          },
        }
      : undefined;

  if (!timelineEvent) {
    failures.push({
      code: 'TIMELINE_EVENT_INVALID',
      message: 'Timeline projection cannot be materialised without exact project/world scope.',
    });
  }

  const existingAction = memory.nexusEvents.find((event) => event.id === actionEvent.id);
  const existingDecision = memory.humanDecisions.find((decision) => decision.id === humanDecision.id);
  const existingTimeline = memory.timelineEvents.find((event) => event.id === input.timelineEventId);

  const existingCount = [existingAction, existingDecision, existingTimeline].filter(Boolean).length;

  if (existingCount > 0 && existingCount < 3) {
    failures.push({
      code: 'PARTIAL_COMMIT_CONFLICT',
      message: 'A subset of the action/decision/Timeline records already exists; fail closed rather than silently repairing a partial commit.',
    });
  }

  if (existingCount === 3 && timelineEvent) {
    const exactRetry =
      existingAction?.eventType === actionEvent.eventType &&
      existingAction?.sourceReference === actionEvent.sourceReference &&
      existingAction?.primaryObjectId === actionEvent.primaryObjectId &&
      existingAction?.projectId === actionEvent.projectId &&
      existingAction?.worldId === actionEvent.worldId &&
      existingDecision?.proposalReference === humanDecision.proposalReference &&
      existingDecision?.sourceRecordId === humanDecision.sourceRecordId &&
      existingDecision?.objectId === humanDecision.objectId &&
      existingDecision?.decidedByPersonId === humanDecision.decidedByPersonId &&
      isSameTimelineProjection(existingTimeline!, timelineEvent);

    if (exactRetry && failures.length === 0) {
      return {
        schema: NEXUS_WORKSUITE_PROJECT_MEMORY_COMMIT_SCHEMA,
        status: 'ALREADY_COMMITTED',
        memory,
        canonicalActionEventId: actionEvent.id,
        humanDecisionId: humanDecision.id,
        timelineEventId: timelineEvent.id,
      };
    }

    failures.push({
      code: 'RECORD_ID_CONFLICT',
      message: 'Existing Project Memory records reuse one or more commit IDs with different semantic content.',
    });
  }

  if (failures.length > 0) {
    return {
      schema: NEXUS_WORKSUITE_PROJECT_MEMORY_COMMIT_SCHEMA,
      status: failures.some((failure) =>
        ['PARTIAL_COMMIT_CONFLICT', 'RECORD_ID_CONFLICT'].includes(failure.code),
      )
        ? 'CONFLICT'
        : 'BLOCKED',
      memory,
      failures,
    };
  }

  const nextMemory: NexusProjectMemorySnapshot = {
    ...memory,
    nexusEvents: [...memory.nexusEvents, actionEvent],
    humanDecisions: [...memory.humanDecisions, humanDecision],
    timelineEvents: [...memory.timelineEvents, timelineEvent!],
  };

  return {
    schema: NEXUS_WORKSUITE_PROJECT_MEMORY_COMMIT_SCHEMA,
    status: 'COMMITTED',
    memory: nextMemory,
    canonicalActionEventId: actionEvent.id,
    humanDecisionId: humanDecision.id,
    timelineEventId: timelineEvent!.id,
  };
};
