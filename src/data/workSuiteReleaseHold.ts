import type { NexusAccessDecisionRecord } from './schemas/access.schema';
import type { NexusEventRecord, NexusHumanDecisionRecord } from './schemas/audit.schema';
import type { NexusId, NexusIsoDateTime } from './schemas/common.schema';
import {
  WORKSUITE_HOLD_WORK_EVENT_TYPE,
  resolveWorkSuiteActionRevision,
} from './workSuiteHoldWork';

export const WORKSUITE_RELEASE_HOLD_ACTION_KEY = 'worksuite:RELEASE_HOLD' as const;
export const WORKSUITE_RELEASE_HOLD_EVENT_TYPE = 'WORKSUITE_ACTION_RELEASE_HOLD_APPLIED' as const;

export type NexusCompensatedHoldState = 'NONE' | 'HELD' | 'RELEASED';

export interface NexusCompensatedHoldResolution {
  state: NexusCompensatedHoldState;
  sourceHoldEvent?: NexusEventRecord;
  releaseEvent?: NexusEventRecord;
}

const parseTimestamp = (value: NexusIsoDateTime): number => Date.parse(value);

/**
 * Canonical effective-state projection for HOLD_WORK once compensating actions
 * exist. The latest HOLD_WORK event wins; only a RELEASE_HOLD that references
 * that exact hold can release it.
 */
export const resolveCompensatedHoldState = (
  events: NexusEventRecord[],
  projectId: NexusId,
  worldId: NexusId,
  objectId: NexusId,
): NexusCompensatedHoldResolution => {
  const holds = events
    .filter(
      (event) =>
        event.eventType === WORKSUITE_HOLD_WORK_EVENT_TYPE &&
        event.eventState === 'APPLIED' &&
        event.projectId === projectId &&
        event.worldId === worldId &&
        event.primaryObjectId === objectId,
    )
    .sort((left, right) => parseTimestamp(left.recordedAt) - parseTimestamp(right.recordedAt));

  const sourceHoldEvent = holds[holds.length - 1];
  if (!sourceHoldEvent) return { state: 'NONE' };

  const releaseEvent = events
    .filter(
      (event) =>
        event.eventType === WORKSUITE_RELEASE_HOLD_EVENT_TYPE &&
        event.eventState === 'APPLIED' &&
        event.projectId === projectId &&
        event.worldId === worldId &&
        event.primaryObjectId === objectId &&
        event.supersedesEventId === sourceHoldEvent.id,
    )
    .sort((left, right) => parseTimestamp(left.recordedAt) - parseTimestamp(right.recordedAt))
    .at(-1);

  return releaseEvent
    ? { state: 'RELEASED', sourceHoldEvent, releaseEvent }
    : { state: 'HELD', sourceHoldEvent };
};

export type NexusReleaseHoldFailureCode =
  | 'EXPLICIT_APPLY_REQUIRED'
  | 'SOURCE_HOLD_NOT_FOUND'
  | 'INVALID_SOURCE_HOLD'
  | 'SOURCE_HOLD_NOT_ACTIVE'
  | 'PROJECT_SCOPE_REQUIRED'
  | 'AUTHORITY_DENIED'
  | 'AUTHORITY_PERSON_MISMATCH'
  | 'AUTHORITY_PARTICIPATION_REQUIRED'
  | 'AUTHORITY_SCOPE_MISMATCH'
  | 'AUTHORITY_ACTION_MISMATCH'
  | 'AUTHORITY_OBJECT_SCOPE_MISMATCH'
  | 'AUTHORITY_EVALUATED_AFTER_APPLY'
  | 'REASON_REQUIRED'
  | 'STORE_REVISION_CONFLICT'
  | 'APPLICATION_ID_CONFLICT';

export interface NexusReleaseHoldFailure {
  code: NexusReleaseHoldFailureCode;
  message: string;
}

export type NexusReleaseHoldApplyResult =
  | {
      status: 'APPLIED';
      previousRevision: number;
      nextRevision: number;
      releaseEvent: NexusEventRecord;
      humanDecision: NexusHumanDecisionRecord;
      authorityDecisionId: NexusId;
    }
  | {
      status: 'ALREADY_APPLIED';
      revision: number;
      releaseEvent: NexusEventRecord;
    }
  | {
      status: 'DENIED' | 'CONFLICT';
      revision: number;
      failures: NexusReleaseHoldFailure[];
    };

export interface NexusReleaseHoldApplyInput {
  sourceHoldEventId: NexusId;
  projectEvents: NexusEventRecord[];
  authorityDecision: NexusAccessDecisionRecord;
  reviewerPersonId: NexusId;
  reason: string;
  explicitApply: boolean;
  expectedRevision: number;
  applicationEventId: NexusId;
  humanDecisionId: NexusId;
  appliedAt: NexusIsoDateTime;
}

/**
 * Applies RELEASE_HOLD as a separate audited compensating action. It never
 * edits/deletes the original HOLD_WORK event and cannot release an older hold
 * when a newer hold is active on the same canonical object.
 */
export const applyWorkSuiteReleaseHold = (
  input: NexusReleaseHoldApplyInput,
): NexusReleaseHoldApplyResult => {
  const failures: NexusReleaseHoldFailure[] = [];
  const sourceHoldEvent = input.projectEvents.find((event) => event.id === input.sourceHoldEventId);

  if (!input.explicitApply) {
    failures.push({ code: 'EXPLICIT_APPLY_REQUIRED', message: 'RELEASE_HOLD requires an explicit Apply action.' });
  }

  if (!sourceHoldEvent) {
    failures.push({
      code: 'SOURCE_HOLD_NOT_FOUND',
      message: 'The exact source HOLD_WORK event must exist before compensation can be applied.',
    });
  }

  if (
    sourceHoldEvent &&
    (sourceHoldEvent.eventType !== WORKSUITE_HOLD_WORK_EVENT_TYPE || sourceHoldEvent.eventState !== 'APPLIED')
  ) {
    failures.push({
      code: 'INVALID_SOURCE_HOLD',
      message: 'RELEASE_HOLD can compensate only an applied canonical HOLD_WORK action event.',
    });
  }

  const projectId = sourceHoldEvent?.projectId;
  const worldId = sourceHoldEvent?.worldId;
  const objectId = sourceHoldEvent?.primaryObjectId;

  if (!projectId || !worldId || !objectId) {
    failures.push({
      code: 'PROJECT_SCOPE_REQUIRED',
      message: 'Source HOLD_WORK requires exact projectId, worldId and canonical object scope.',
    });
  }

  const authorityDecision = input.authorityDecision;
  if (authorityDecision.result !== 'allowed') {
    failures.push({
      code: 'AUTHORITY_DENIED',
      message: `Access resolver result is ${authorityDecision.result}; RELEASE_HOLD requires allowed.`,
    });
  }

  if (authorityDecision.personId !== input.reviewerPersonId) {
    failures.push({
      code: 'AUTHORITY_PERSON_MISMATCH',
      message: 'Access decision person does not match the human applying RELEASE_HOLD.',
    });
  }

  if (!authorityDecision.participationId) {
    failures.push({
      code: 'AUTHORITY_PARTICIPATION_REQUIRED',
      message: 'RELEASE_HOLD authority must be tied to an active Project Participation decision.',
    });
  }

  if (
    projectId &&
    worldId &&
    (authorityDecision.projectId !== projectId || authorityDecision.worldId !== worldId)
  ) {
    failures.push({
      code: 'AUTHORITY_SCOPE_MISMATCH',
      message: 'Access decision project/world scope does not match the source HOLD_WORK.',
    });
  }

  if (authorityDecision.actionKey !== WORKSUITE_RELEASE_HOLD_ACTION_KEY) {
    failures.push({
      code: 'AUTHORITY_ACTION_MISMATCH',
      message: `Access decision must explicitly allow ${WORKSUITE_RELEASE_HOLD_ACTION_KEY}.`,
    });
  }

  if (objectId && authorityDecision.objectScopeId !== objectId) {
    failures.push({
      code: 'AUTHORITY_OBJECT_SCOPE_MISMATCH',
      message: 'Access decision must explicitly scope RELEASE_HOLD to the canonical Nexus Object.',
    });
  }

  if (parseTimestamp(authorityDecision.evaluatedAt) > parseTimestamp(input.appliedAt)) {
    failures.push({
      code: 'AUTHORITY_EVALUATED_AFTER_APPLY',
      message: 'Authority evaluation timestamp cannot be later than the requested Apply timestamp.',
    });
  }

  if (!input.reason.trim()) {
    failures.push({ code: 'REASON_REQUIRED', message: 'RELEASE_HOLD requires a non-empty human reason.' });
  }

  const currentRevision = projectId && worldId
    ? resolveWorkSuiteActionRevision(input.projectEvents, projectId, worldId)
    : 0;

  const existingRelease = sourceHoldEvent
    ? input.projectEvents.find(
        (event) =>
          event.eventType === WORKSUITE_RELEASE_HOLD_EVENT_TYPE &&
          event.eventState === 'APPLIED' &&
          event.supersedesEventId === sourceHoldEvent.id,
      )
    : undefined;

  if (existingRelease) {
    if (existingRelease.id !== input.applicationEventId) {
      failures.push({
        code: 'APPLICATION_ID_CONFLICT',
        message: 'The exact source HOLD_WORK already has a RELEASE_HOLD under a different action event ID.',
      });
    } else if (failures.length === 0) {
      return { status: 'ALREADY_APPLIED', revision: currentRevision, releaseEvent: existingRelease };
    }
  }

  const reusedApplicationId = input.projectEvents.find((event) => event.id === input.applicationEventId);
  if (reusedApplicationId && reusedApplicationId.id !== existingRelease?.id) {
    failures.push({
      code: 'APPLICATION_ID_CONFLICT',
      message: 'applicationEventId is already used by another canonical event.',
    });
  }

  if (projectId && worldId && objectId && sourceHoldEvent) {
    const effective = resolveCompensatedHoldState(input.projectEvents, projectId, worldId, objectId);
    if (effective.state !== 'HELD' || effective.sourceHoldEvent?.id !== sourceHoldEvent.id) {
      failures.push({
        code: 'SOURCE_HOLD_NOT_ACTIVE',
        message: 'The requested source HOLD_WORK is not the exact current active hold; old/stale holds cannot release newer holds.',
      });
    }
  }

  if (input.expectedRevision !== currentRevision) {
    failures.push({
      code: 'STORE_REVISION_CONFLICT',
      message: `Expected WorkSuite action revision ${input.expectedRevision}, current revision is ${currentRevision}.`,
    });
  }

  if (failures.length > 0) {
    const conflictCodes = new Set<NexusReleaseHoldFailureCode>([
      'STORE_REVISION_CONFLICT',
      'APPLICATION_ID_CONFLICT',
    ]);
    return {
      status: failures.some((failure) => conflictCodes.has(failure.code)) ? 'CONFLICT' : 'DENIED',
      revision: currentRevision,
      failures,
    };
  }

  const resolvedSourceHold = sourceHoldEvent!;
  const resolvedProjectId = projectId!;
  const resolvedWorldId = worldId!;
  const resolvedObjectId = objectId!;

  const humanDecision: NexusHumanDecisionRecord = {
    id: input.humanDecisionId,
    status: 'active',
    title: 'RELEASE_HOLD decision',
    description: `Compensating decision for HOLD_WORK ${resolvedSourceHold.id}.`,
    tags: ['worksuite', 'change-control', 'release-hold', 'compensation'],
    createdAt: input.appliedAt,
    updatedAt: input.appliedAt,
    createdBy: input.reviewerPersonId,
    sourceSystem: 'nexus',
    sourceRecordId: resolvedSourceHold.id,
    confidence: 'confirmed',
    decisionType: 'WORKSUITE_COMPENSATION:RELEASE_HOLD',
    objectId: resolvedObjectId,
    proposedBy: 'SYSTEM',
    proposalReference: resolvedSourceHold.id,
    decision: 'ACCEPT',
    reason: input.reason.trim(),
    decidedByPersonId: input.reviewerPersonId,
    decidedAt: input.appliedAt,
    evidenceObjectIds: [],
  };

  const releaseEvent: NexusEventRecord = {
    id: input.applicationEventId,
    status: 'active',
    title: 'WorkSuite RELEASE_HOLD applied',
    description: `Audited compensation for HOLD_WORK ${resolvedSourceHold.id}.`,
    tags: ['worksuite-action', 'release-hold', 'change-control', 'compensation'],
    createdAt: input.appliedAt,
    updatedAt: input.appliedAt,
    createdBy: input.reviewerPersonId,
    sourceSystem: 'nexus',
    sourceRecordId: resolvedSourceHold.id,
    confidence: 'confirmed',
    eventType: WORKSUITE_RELEASE_HOLD_EVENT_TYPE,
    occurredAt: input.appliedAt,
    recordedAt: input.appliedAt,
    actorType: 'PERSON',
    actorId: input.reviewerPersonId,
    projectId: resolvedProjectId,
    worldId: resolvedWorldId,
    primaryObjectId: resolvedObjectId,
    relatedObjectIds: [],
    eventSourceType: 'USER',
    sourceReference: resolvedSourceHold.id,
    eventState: 'APPLIED',
    summary: `RELEASE_HOLD applied by ${input.reviewerPersonId}; reason: ${input.reason.trim()}`,
    verificationState: 'VERIFIED_BY_USER',
    supersedesEventId: resolvedSourceHold.id,
    correlationId: resolvedSourceHold.correlationId ?? resolvedSourceHold.sourceReference ?? resolvedSourceHold.id,
  };

  return {
    status: 'APPLIED',
    previousRevision: currentRevision,
    nextRevision: currentRevision + 1,
    releaseEvent,
    humanDecision,
    authorityDecisionId: authorityDecision.id,
  };
};
