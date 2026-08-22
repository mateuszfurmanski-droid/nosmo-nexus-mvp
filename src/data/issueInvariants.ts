import { readNexusIssues, type NexusProjectMemorySnapshot } from './projectMemory';
import type { NexusId } from './schemas/common.schema';

export type NexusIssueInvariantCode =
  | 'ISSUE_PROJECT_MISSING'
  | 'ISSUE_WORLD_MISSING'
  | 'ISSUE_WORLD_PROJECT_MISMATCH'
  | 'ISSUE_OBJECT_MISSING'
  | 'ISSUE_OBJECT_SCOPE_MISMATCH'
  | 'ISSUE_SOURCE_EVENT_MISSING'
  | 'ISSUE_SOURCE_EVENT_SCOPE_MISMATCH'
  | 'ISSUE_SOURCE_ACTION_MISSING'
  | 'ISSUE_SOURCE_ACTION_INVALID'
  | 'ISSUE_ACTION_BACKLINK_MISSING'
  | 'RFI_QUESTION_REQUIRED'
  | 'ISSUE_ANSWER_STATE_INVALID';

export interface NexusIssueInvariantIssue {
  code: NexusIssueInvariantCode;
  issueId: NexusId;
  message: string;
}

export interface NexusIssueInvariantReport {
  ok: boolean;
  issues: NexusIssueInvariantIssue[];
}

export const validateNexusIssueInvariants = (
  memory: NexusProjectMemorySnapshot,
): NexusIssueInvariantReport => {
  const failures: NexusIssueInvariantIssue[] = [];

  for (const issue of readNexusIssues(memory)) {
    const project = memory.projects.find((record) => record.id === issue.projectId);
    const world = memory.worlds.find((record) => record.id === issue.worldId);
    const object = memory.canonicalObjects.find((record) => record.id === issue.primaryObjectId);

    if (!project) {
      failures.push({ code: 'ISSUE_PROJECT_MISSING', issueId: issue.id, message: `Project ${issue.projectId} does not exist.` });
    }
    if (!world) {
      failures.push({ code: 'ISSUE_WORLD_MISSING', issueId: issue.id, message: `World ${issue.worldId} does not exist.` });
    } else if (world.projectId !== issue.projectId) {
      failures.push({
        code: 'ISSUE_WORLD_PROJECT_MISMATCH',
        issueId: issue.id,
        message: `World ${issue.worldId} belongs to project ${world.projectId}, not ${issue.projectId}.`,
      });
    }

    if (!object) {
      failures.push({ code: 'ISSUE_OBJECT_MISSING', issueId: issue.id, message: `Canonical object ${issue.primaryObjectId} does not exist.` });
    } else if (object.projectId !== issue.projectId || object.worldId !== issue.worldId) {
      failures.push({
        code: 'ISSUE_OBJECT_SCOPE_MISMATCH',
        issueId: issue.id,
        message: 'Issue project/world scope does not match its canonical Nexus Object.',
      });
    }

    if (issue.sourceEventId) {
      const sourceEvent = memory.nexusEvents.find((record) => record.id === issue.sourceEventId);
      if (!sourceEvent) {
        failures.push({
          code: 'ISSUE_SOURCE_EVENT_MISSING',
          issueId: issue.id,
          message: `Source event ${issue.sourceEventId} does not exist.`,
        });
      } else if (
        sourceEvent.projectId !== issue.projectId ||
        sourceEvent.worldId !== issue.worldId ||
        sourceEvent.primaryObjectId !== issue.primaryObjectId
      ) {
        failures.push({
          code: 'ISSUE_SOURCE_EVENT_SCOPE_MISMATCH',
          issueId: issue.id,
          message: 'Source event project/world/object scope does not match the Issue.',
        });
      }
    }

    if (issue.sourceActionEventId) {
      const action = memory.nexusEvents.find((record) => record.id === issue.sourceActionEventId);
      if (!action) {
        failures.push({
          code: 'ISSUE_SOURCE_ACTION_MISSING',
          issueId: issue.id,
          message: `Source WorkSuite action ${issue.sourceActionEventId} does not exist.`,
        });
      } else {
        if (
          action.eventType !== 'WORKSUITE_ACTION_RAISE_RFI_APPLIED' ||
          action.eventState !== 'APPLIED' ||
          action.projectId !== issue.projectId ||
          action.worldId !== issue.worldId ||
          action.primaryObjectId !== issue.primaryObjectId
        ) {
          failures.push({
            code: 'ISSUE_SOURCE_ACTION_INVALID',
            issueId: issue.id,
            message: 'RFI source action must be the applied RAISE_RFI action in the same project/world/object scope.',
          });
        }
        if (!action.relatedObjectIds.includes(issue.id)) {
          failures.push({
            code: 'ISSUE_ACTION_BACKLINK_MISSING',
            issueId: issue.id,
            message: 'RAISE_RFI action event must include the canonical Issue ID in relatedObjectIds.',
          });
        }
      }
    }

    if (issue.issueKind === 'rfi' && !issue.question.trim()) {
      failures.push({ code: 'RFI_QUESTION_REQUIRED', issueId: issue.id, message: 'RFI requires a non-empty question.' });
    }

    const hasAnswer = Boolean(issue.answer?.trim());
    const hasAnswerAudit = Boolean(issue.answeredByPersonId && issue.answeredAt);
    if (
      (issue.issueState === 'answered' && (!hasAnswer || !hasAnswerAudit)) ||
      (issue.issueState === 'open' && (hasAnswer || hasAnswerAudit))
    ) {
      failures.push({
        code: 'ISSUE_ANSWER_STATE_INVALID',
        issueId: issue.id,
        message: 'Issue answer fields must agree with the canonical issueState.',
      });
    }
  }

  return { ok: failures.length === 0, issues: failures };
};
