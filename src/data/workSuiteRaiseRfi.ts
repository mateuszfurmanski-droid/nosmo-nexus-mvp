import type { NexusAccessDecisionRecord } from './schemas/access.schema';
import type { NexusEventRecord, NexusHumanDecisionRecord } from './schemas/audit.schema';
import type { NexusId, NexusIsoDateTime } from './schemas/common.schema';
import type { NexusIssuePriority, NexusIssueRecord } from './schemas/issue.schema';
import { resolveWorkSuiteActionRevision } from './workSuiteHoldWork';

export const WORKSUITE_RAISE_RFI_ACTION_KEY = 'worksuite:RAISE_RFI' as const;
export const WORKSUITE_RAISE_RFI_EVENT_TYPE = 'WORKSUITE_ACTION_RAISE_RFI_APPLIED' as const;
export const MAX_RFI_QUESTION_LENGTH = 4000;

export type NexusRaiseRfiFailureCode =
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
  | 'RFI_QUESTION_REQUIRED'
  | 'RFI_QUESTION_TOO_LONG'
  | 'STORE_REVISION_CONFLICT'
  | 'APPLICATION_ID_CONFLICT'
  | 'ISSUE_ID_CONFLICT'
  | 'PARTIAL_APPLICATION_CONFLICT';

export interface NexusRaiseRfiFailure {
  code: NexusRaiseRfiFailureCode;
  message: string;
}

export interface NexusRaiseRfiApplyInput {
  changeEvent: NexusEventRecord;
  projectEvents: NexusEventRecord[];
  projectIssues: NexusIssueRecord[];
  authorityDecision: NexusAccessDecisionRecord;
  reviewerPersonId: NexusId;
  explicitApply: boolean;
  expectedRevision: number;
  applicationEventId: NexusId;
  humanDecisionId: NexusId;
  issueId: NexusId;
  question: string;
  reason: string;
  title?: string;
  priority?: NexusIssuePriority;
  assigneePersonIds?: NexusId[];
  assigneeRoleKeys?: string[];
  dueAt?: NexusIsoDateTime;
  appliedAt: NexusIsoDateTime;
}

export type NexusRaiseRfiApplyResult =
  | {
      status: 'APPLIED';
      previousRevision: number;
      nextRevision: number;
      issue: NexusIssueRecord;
      actionEvent: NexusEventRecord;
      humanDecision: NexusHumanDecisionRecord;
      authorityDecisionId: NexusId;
    }
  | {
      status: 'ALREADY_APPLIED';
      revision: number;
      issue: NexusIssueRecord;
      actionEvent: NexusEventRecord;
    }
  | {
      status: 'DENIED' | 'CONFLICT';
      revision: number;
      failures: NexusRaiseRfiFailure[];
    };

const parseTimestamp = (value: NexusIsoDateTime): number => Date.parse(value);

/**
 * Applies a Nexus-local RAISE_RFI action. It creates canonical Nexus records
 * only and does not send, publish or write the RFI to an external platform.
 */
export const applyWorkSuiteRaiseRfi = (
  input: NexusRaiseRfiApplyInput,
): NexusRaiseRfiApplyResult => {
  const failures: NexusRaiseRfiFailure[] = [];
  const { changeEvent, authorityDecision } = input;
  const projectId = changeEvent.projectId;
  const worldId = changeEvent.worldId;
  const question = input.question.trim();
  const reason = input.reason.trim();

  if (!input.explicitApply) {
    failures.push({ code: 'EXPLICIT_APPLY_REQUIRED', message: 'RAISE_RFI requires an explicit Apply action.' });
  }

  if (!input.projectEvents.some((event) => event.id === changeEvent.id)) {
    failures.push({
      code: 'CHANGE_EVENT_NOT_PERSISTED',
      message: 'The canonical Change Event must exist in Project Memory before RAISE_RFI Apply.',
    });
  }

  if (
    changeEvent.eventType !== 'IFC_REVISION_CHANGE_REVIEW' ||
    !['AWAITING_HUMAN_REVIEW', 'SOURCE_COMPARISON_BLOCKED'].includes(changeEvent.eventState)
  ) {
    failures.push({
      code: 'INVALID_CHANGE_EVENT',
      message: 'RAISE_RFI requires an eligible canonical IFC revision Change Event review record.',
    });
  }

  if (!projectId || !worldId) {
    failures.push({
      code: 'PROJECT_SCOPE_REQUIRED',
      message: 'RAISE_RFI requires exact projectId and worldId from the canonical Change Event.',
    });
  }

  if (authorityDecision.result !== 'allowed') {
    failures.push({
      code: 'AUTHORITY_DENIED',
      message: `Access resolver result is ${authorityDecision.result}; RAISE_RFI requires allowed.`,
    });
  }

  if (authorityDecision.personId !== input.reviewerPersonId) {
    failures.push({
      code: 'AUTHORITY_PERSON_MISMATCH',
      message: 'Access decision person does not match the person applying RAISE_RFI.',
    });
  }

  if (!authorityDecision.participationId) {
    failures.push({
      code: 'AUTHORITY_PARTICIPATION_REQUIRED',
      message: 'RAISE_RFI authority must be tied to a Project Participation decision.',
    });
  }

  if (
    projectId &&
    worldId &&
    (authorityDecision.projectId !== projectId || authorityDecision.worldId !== worldId)
  ) {
    failures.push({
      code: 'AUTHORITY_SCOPE_MISMATCH',
      message: 'RAISE_RFI authority project/world scope does not match the Change Event.',
    });
  }

  if (authorityDecision.actionKey !== WORKSUITE_RAISE_RFI_ACTION_KEY) {
    failures.push({
      code: 'AUTHORITY_ACTION_MISMATCH',
      message: `Access decision must explicitly allow ${WORKSUITE_RAISE_RFI_ACTION_KEY}.`,
    });
  }

  if (authorityDecision.objectScopeId !== changeEvent.primaryObjectId) {
    failures.push({
      code: 'AUTHORITY_OBJECT_SCOPE_MISMATCH',
      message: 'RAISE_RFI authority must be scoped to the canonical Nexus Object.',
    });
  }

  if (parseTimestamp(authorityDecision.evaluatedAt) > parseTimestamp(input.appliedAt)) {
    failures.push({
      code: 'AUTHORITY_EVALUATED_AFTER_APPLY',
      message: 'Authority evaluation cannot be later than the requested Apply timestamp.',
    });
  }

  if (!reason) failures.push({ code: 'REASON_REQUIRED', message: 'RAISE_RFI requires a non-empty human reason.' });
  if (!question) failures.push({ code: 'RFI_QUESTION_REQUIRED', message: 'RAISE_RFI requires a non-empty question.' });
  if (question.length > MAX_RFI_QUESTION_LENGTH) {
    failures.push({
      code: 'RFI_QUESTION_TOO_LONG',
      message: `RFI question exceeds the ${MAX_RFI_QUESTION_LENGTH}-character contract limit.`,
    });
  }

  const currentRevision = projectId && worldId
    ? resolveWorkSuiteActionRevision(input.projectEvents, projectId, worldId)
    : 0;

  const existingAction = input.projectEvents.find(
    (event) =>
      event.eventType === WORKSUITE_RAISE_RFI_EVENT_TYPE &&
      event.sourceReference === changeEvent.id &&
      event.primaryObjectId === changeEvent.primaryObjectId &&
      event.eventState === 'APPLIED',
  );
  const existingIssue = input.projectIssues.find(
    (issue) =>
      issue.issueKind === 'rfi' &&
      issue.sourceEventId === changeEvent.id &&
      issue.primaryObjectId === changeEvent.primaryObjectId,
  );

  if (existingAction || existingIssue) {
    if (!existingAction || !existingIssue) {
      failures.push({
        code: 'PARTIAL_APPLICATION_CONFLICT',
        message: 'Only part of the canonical RAISE_RFI application exists; fail closed rather than silently repairing it.',
      });
    } else if (
      existingAction.id === input.applicationEventId &&
      existingIssue.id === input.issueId &&
      existingIssue.sourceActionEventId === existingAction.id &&
      existingIssue.question === question &&
      failures.length === 0
    ) {
      return {
        status: 'ALREADY_APPLIED',
        revision: currentRevision,
        issue: existingIssue,
        actionEvent: existingAction,
      };
    } else {
      failures.push({
        code: 'APPLICATION_ID_CONFLICT',
        message: 'The same Change Event already has a different canonical RAISE_RFI application.',
      });
    }
  }

  const reusedActionId = input.projectEvents.find((event) => event.id === input.applicationEventId);
  if (reusedActionId && reusedActionId.id !== existingAction?.id) {
    failures.push({
      code: 'APPLICATION_ID_CONFLICT',
      message: 'applicationEventId is already used by another canonical event.',
    });
  }

  const reusedIssueId = input.projectIssues.find((issue) => issue.id === input.issueId);
  if (reusedIssueId && reusedIssueId.id !== existingIssue?.id) {
    failures.push({
      code: 'ISSUE_ID_CONFLICT',
      message: 'issueId is already used by another canonical Issue record.',
    });
  }

  if (input.expectedRevision !== currentRevision) {
    failures.push({
      code: 'STORE_REVISION_CONFLICT',
      message: `Expected WorkSuite action revision ${input.expectedRevision}, current revision is ${currentRevision}.`,
    });
  }

  if (failures.length > 0) {
    const conflictCodes = new Set<NexusRaiseRfiFailureCode>([
      'STORE_REVISION_CONFLICT',
      'APPLICATION_ID_CONFLICT',
      'ISSUE_ID_CONFLICT',
      'PARTIAL_APPLICATION_CONFLICT',
    ]);
    return {
      status: failures.some((failure) => conflictCodes.has(failure.code)) ? 'CONFLICT' : 'DENIED',
      revision: currentRevision,
      failures,
    };
  }

  const issue: NexusIssueRecord = {
    id: input.issueId,
    status: 'active',
    title: input.title?.trim() || `RFI — ${changeEvent.title}`,
    description: `Nexus RFI raised from Change Event ${changeEvent.id}.`,
    tags: ['rfi', 'worksuite', 'change-control'],
    createdAt: input.appliedAt,
    updatedAt: input.appliedAt,
    createdBy: input.reviewerPersonId,
    sourceSystem: 'nexus',
    sourceRecordId: changeEvent.id,
    confidence: 'confirmed',
    projectId: projectId!,
    worldId: worldId!,
    issueKind: 'rfi',
    issueState: 'open',
    priority: input.priority ?? 'normal',
    primaryObjectId: changeEvent.primaryObjectId,
    relatedObjectIds: [],
    sourceEventId: changeEvent.id,
    sourceActionEventId: input.applicationEventId,
    raisedByPersonId: input.reviewerPersonId,
    raisedAt: input.appliedAt,
    question,
    assigneePersonIds: [...(input.assigneePersonIds ?? [])],
    assigneeRoleKeys: [...(input.assigneeRoleKeys ?? [])],
    dueAt: input.dueAt,
  };

  const humanDecision: NexusHumanDecisionRecord = {
    id: input.humanDecisionId,
    status: 'active',
    title: 'RAISE_RFI decision',
    description: `Human decision for Change Event ${changeEvent.id}.`,
    tags: ['worksuite', 'change-control', 'raise-rfi'],
    createdAt: input.appliedAt,
    updatedAt: input.appliedAt,
    createdBy: input.reviewerPersonId,
    sourceSystem: 'nexus',
    sourceRecordId: changeEvent.id,
    confidence: 'confirmed',
    decisionType: 'IFC_OPERATIONAL_CHANGE:RAISE_RFI',
    objectId: changeEvent.primaryObjectId,
    proposedBy: 'SYSTEM',
    proposalReference: changeEvent.id,
    decision: 'ACCEPT',
    reason,
    decidedByPersonId: input.reviewerPersonId,
    decidedAt: input.appliedAt,
    evidenceObjectIds: [],
  };

  const actionEvent: NexusEventRecord = {
    id: input.applicationEventId,
    status: 'active',
    title: 'WorkSuite RAISE_RFI applied',
    description: `Canonical Nexus RFI ${issue.id} opened from Change Event ${changeEvent.id}.`,
    tags: ['worksuite-action', 'raise-rfi', 'change-control'],
    createdAt: input.appliedAt,
    updatedAt: input.appliedAt,
    createdBy: input.reviewerPersonId,
    sourceSystem: 'nexus',
    sourceRecordId: changeEvent.id,
    confidence: 'confirmed',
    eventType: WORKSUITE_RAISE_RFI_EVENT_TYPE,
    occurredAt: input.appliedAt,
    recordedAt: input.appliedAt,
    actorType: 'PERSON',
    actorId: input.reviewerPersonId,
    projectId,
    worldId,
    primaryObjectId: changeEvent.primaryObjectId,
    relatedObjectIds: [issue.id],
    eventSourceType: 'USER',
    sourceReference: changeEvent.id,
    eventState: 'APPLIED',
    summary: `RAISE_RFI applied by ${input.reviewerPersonId}; Nexus Issue ${issue.id} opened.`,
    verificationState: 'VERIFIED_BY_USER',
    correlationId: changeEvent.id,
  };

  return {
    status: 'APPLIED',
    previousRevision: currentRevision,
    nextRevision: currentRevision + 1,
    issue,
    actionEvent,
    humanDecision,
    authorityDecisionId: authorityDecision.id,
  };
};
