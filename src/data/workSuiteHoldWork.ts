import type { NexusAccessDecisionRecord } from './schemas/access.schema';
import type { NexusEventRecord, NexusHumanDecisionRecord } from './schemas/audit.schema';
import type { NexusId, NexusIsoDateTime } from './schemas/common.schema';

export const WORKSUITE_HOLD_WORK_ACTION_KEY = 'worksuite:HOLD_WORK' as const;
export const WORKSUITE_HOLD_WORK_EVENT_TYPE = 'WORKSUITE_ACTION_HOLD_WORK_APPLIED' as const;

export type NexusWorkSuiteApplyFailureCode =
  | 'EXPLICIT_APPLY_REQUIRED'
  | 'CHANGE_EVENT_NOT_PERSISTED'
  | 'INVALID_CHANGE_EVENT'
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

export interface NexusWorkSuiteApplyFailure {
  code: NexusWorkSuiteApplyFailureCode;
  message: string;
}

export type NexusHoldWorkApplyResult =
  | {
      status: 'APPLIED';
      previousRevision: number;
      nextRevision: number;
      actionEvent: NexusEventRecord;
      humanDecision: NexusHumanDecisionRecord;
      authorityDecisionId: NexusId;
    }
  | {
      status: 'ALREADY_APPLIED';
      revision: number;
      actionEvent: NexusEventRecord;
    }
  | {
      status: 'DENIED' | 'CONFLICT';
      revision: number;
      failures: NexusWorkSuiteApplyFailure[];
    };

export interface NexusHoldWorkApplyInput {
  changeEvent: NexusEventRecord;
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

const isWorkSuiteActionEvent = (event: NexusEventRecord): boolean =>
  event.eventType.startsWith('WORKSUITE_ACTION_');

export const resolveWorkSuiteActionRevision = (
  events: NexusEventRecord[],
  projectId: NexusId,
  worldId: NexusId,
): number =>
  events.filter(
    (event) =>
      isWorkSuiteActionEvent(event) &&
      event.projectId === projectId &&
      event.worldId === worldId &&
      event.eventState === 'APPLIED',
  ).length;

const parseTimestamp = (value: NexusIsoDateTime): number => Date.parse(value);

/**
 * First authority-safe WorkSuite Action Engine slice on the #90 foundation.
 * It produces the canonical records for a Nexus-local HOLD_WORK application.
 * Atomic persistence of the returned records is a separate Project Memory
 * transaction concern; BIM and external partner state remain untouched.
 */
export const applyWorkSuiteHoldWork = (input: NexusHoldWorkApplyInput): NexusHoldWorkApplyResult => {
  const failures: NexusWorkSuiteApplyFailure[] = [];
  const { changeEvent, authorityDecision } = input;

  const projectId = changeEvent.projectId;
  const worldId = changeEvent.worldId;

  if (!input.explicitApply) {
    failures.push({ code: 'EXPLICIT_APPLY_REQUIRED', message: 'HOLD_WORK requires an explicit Apply action.' });
  }

  if (!input.projectEvents.some((event) => event.id === changeEvent.id)) {
    failures.push({
      code: 'CHANGE_EVENT_NOT_PERSISTED',
      message: 'The canonical Change Event must already exist in Project Memory before WorkSuite Apply.',
    });
  }

  if (
    changeEvent.eventType !== 'IFC_REVISION_CHANGE_REVIEW' ||
    !['AWAITING_HUMAN_REVIEW', 'SOURCE_COMPARISON_BLOCKED'].includes(changeEvent.eventState)
  ) {
    failures.push({
      code: 'INVALID_CHANGE_EVENT',
      message: 'HOLD_WORK requires an eligible canonical IFC revision Change Event review record.',
    });
  }

  if (!projectId || !worldId) {
    failures.push({
      code: 'PROJECT_SCOPE_REQUIRED',
      message: 'Canonical Change Event requires exact projectId and worldId before WorkSuite Apply.',
    });
  }

  if (authorityDecision.result !== 'allowed') {
    failures.push({
      code: 'AUTHORITY_DENIED',
      message: `Access resolver result is ${authorityDecision.result}; WorkSuite mutation requires allowed.`,
    });
  }

  if (authorityDecision.personId !== input.reviewerPersonId) {
    failures.push({
      code: 'AUTHORITY_PERSON_MISMATCH',
      message: 'Access decision person does not match the human applying HOLD_WORK.',
    });
  }

  if (!authorityDecision.participationId) {
    failures.push({
      code: 'AUTHORITY_PARTICIPATION_REQUIRED',
      message: 'An allowed WorkSuite mutation must be tied to an active Project Participation decision.',
    });
  }

  if (
    projectId &&
    worldId &&
    (authorityDecision.projectId !== projectId || authorityDecision.worldId !== worldId)
  ) {
    failures.push({
      code: 'AUTHORITY_SCOPE_MISMATCH',
      message: 'Access decision project/world scope does not match the Change Event scope.',
    });
  }

  if (authorityDecision.actionKey !== WORKSUITE_HOLD_WORK_ACTION_KEY) {
    failures.push({
      code: 'AUTHORITY_ACTION_MISMATCH',
      message: `Access decision must explicitly allow ${WORKSUITE_HOLD_WORK_ACTION_KEY}.`,
    });
  }

  if (authorityDecision.objectScopeId !== changeEvent.primaryObjectId) {
    failures.push({
      code: 'AUTHORITY_OBJECT_SCOPE_MISMATCH',
      message: 'Access decision must explicitly scope HOLD_WORK to the canonical Nexus Object.',
    });
  }

  if (parseTimestamp(authorityDecision.evaluatedAt) > parseTimestamp(input.appliedAt)) {
    failures.push({
      code: 'AUTHORITY_EVALUATED_AFTER_APPLY',
      message: 'Authority evaluation timestamp cannot be later than the requested Apply timestamp.',
    });
  }

  if (!input.reason.trim()) {
    failures.push({ code: 'REASON_REQUIRED', message: 'HOLD_WORK requires a non-empty human reason.' });
  }

  const currentRevision = projectId && worldId
    ? resolveWorkSuiteActionRevision(input.projectEvents, projectId, worldId)
    : 0;

  const existingBySource = input.projectEvents.find(
    (event) =>
      event.eventType === WORKSUITE_HOLD_WORK_EVENT_TYPE &&
      event.sourceReference === changeEvent.id &&
      event.primaryObjectId === changeEvent.primaryObjectId &&
      event.eventState === 'APPLIED',
  );

  if (existingBySource) {
    if (existingBySource.id !== input.applicationEventId) {
      failures.push({
        code: 'APPLICATION_ID_CONFLICT',
        message: 'The same Change Event/HOLD_WORK application already exists under a different action event ID.',
      });
    } else if (failures.length === 0) {
      return { status: 'ALREADY_APPLIED', revision: currentRevision, actionEvent: existingBySource };
    }
  }

  const reusedApplicationId = input.projectEvents.find((event) => event.id === input.applicationEventId);
  if (reusedApplicationId && reusedApplicationId.id !== existingBySource?.id) {
    failures.push({
      code: 'APPLICATION_ID_CONFLICT',
      message: 'applicationEventId is already used by another canonical event.',
    });
  }

  if (input.expectedRevision !== currentRevision) {
    failures.push({
      code: 'STORE_REVISION_CONFLICT',
      message: `Expected WorkSuite action revision ${input.expectedRevision}, current revision is ${currentRevision}.`,
    });
  }

  if (failures.length > 0) {
    const conflictCodes = new Set<NexusWorkSuiteApplyFailureCode>([
      'STORE_REVISION_CONFLICT',
      'APPLICATION_ID_CONFLICT',
    ]);
    return {
      status: failures.some((failure) => conflictCodes.has(failure.code)) ? 'CONFLICT' : 'DENIED',
      revision: currentRevision,
      failures,
    };
  }

  const humanDecision: NexusHumanDecisionRecord = {
    id: input.humanDecisionId,
    status: 'active',
    title: 'HOLD_WORK decision',
    description: `Human decision for Change Event ${changeEvent.id}.`,
    tags: ['worksuite', 'change-control', 'hold-work'],
    createdAt: input.appliedAt,
    updatedAt: input.appliedAt,
    createdBy: input.reviewerPersonId,
    sourceSystem: 'nexus',
    sourceRecordId: changeEvent.id,
    confidence: 'confirmed',
    decisionType: 'IFC_OPERATIONAL_CHANGE:HOLD_WORK',
    objectId: changeEvent.primaryObjectId,
    proposedBy: 'SYSTEM',
    proposalReference: changeEvent.id,
    decision: 'ACCEPT',
    reason: input.reason.trim(),
    decidedByPersonId: input.reviewerPersonId,
    decidedAt: input.appliedAt,
    evidenceObjectIds: [],
  };

  const actionEvent: NexusEventRecord = {
    id: input.applicationEventId,
    status: 'active',
    title: 'WorkSuite HOLD_WORK applied',
    description: `Controlled Nexus-local hold applied from Change Event ${changeEvent.id}.`,
    tags: ['worksuite-action', 'hold-work', 'change-control'],
    createdAt: input.appliedAt,
    updatedAt: input.appliedAt,
    createdBy: input.reviewerPersonId,
    sourceSystem: 'nexus',
    sourceRecordId: changeEvent.id,
    confidence: 'confirmed',
    eventType: WORKSUITE_HOLD_WORK_EVENT_TYPE,
    occurredAt: input.appliedAt,
    recordedAt: input.appliedAt,
    actorType: 'PERSON',
    actorId: input.reviewerPersonId,
    projectId,
    worldId,
    primaryObjectId: changeEvent.primaryObjectId,
    relatedObjectIds: [],
    eventSourceType: 'USER',
    sourceReference: changeEvent.id,
    eventState: 'APPLIED',
    summary: `HOLD_WORK applied by ${input.reviewerPersonId}; reason: ${input.reason.trim()}`,
    verificationState: 'VERIFIED_BY_USER',
    correlationId: changeEvent.id,
  };

  return {
    status: 'APPLIED',
    previousRevision: currentRevision,
    nextRevision: currentRevision + 1,
    actionEvent,
    humanDecision,
    authorityDecisionId: authorityDecision.id,
  };
};

export type NexusEffectiveHoldState = 'NONE' | 'HELD';

export const resolveEffectiveHoldState = (
  events: NexusEventRecord[],
  projectId: NexusId,
  worldId: NexusId,
  objectId: NexusId,
): { state: NexusEffectiveHoldState; sourceHoldEvent?: NexusEventRecord } => {
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

  const latest = holds[holds.length - 1];
  return latest ? { state: 'HELD', sourceHoldEvent: latest } : { state: 'NONE' };
};
