import { createEsafeCataniaMemory } from './esafeCataniaMemory';
import {
  addNexusTaskEvidence,
  decideNexusTaskApproval,
  requestNexusTaskApproval,
  startNexusTask,
} from '../projectMemoryWorkCycle';
import type { NexusProjectMemorySnapshot } from '../projectMemory';

const TASK_ID = 'task-esafe-demo-review-survey';
const PERSON_ID = 'person-esafe-demo-manager';

const assert = (condition: unknown, message: string): asserts condition => {
  if (!condition) throw new Error(`E_SAFE_CORE_WORK_SMOKE_FAILED: ${message}`);
};

const taskStatus = (memory: NexusProjectMemorySnapshot) =>
  memory.tasks.find((task) => task.id === TASK_ID)?.taskStatus;

export const runEsafeCataniaCoreWorkSmoke = (): true => {
  const initial = createEsafeCataniaMemory();
  assert(taskStatus(initial) === 'todo', 'fixture task must start todo');

  const started = startNexusTask({
    memory: initial,
    taskId: TASK_ID,
    actorPersonId: PERSON_ID,
    accessDecisionId: 'access-esafe-core-task-start',
    occurredAt: '2026-08-24T18:00:00Z',
    timelineEventId: 'timeline-esafe-core-task-start-001',
    note: 'Begin review of the existing-state survey package.',
  });
  assert(started.status === 'APPLIED', 'task start must apply');
  assert(taskStatus(started.memory) === 'in-progress', 'task must become in-progress');

  const startRetry = startNexusTask({
    memory: started.memory,
    taskId: TASK_ID,
    actorPersonId: PERSON_ID,
    accessDecisionId: 'access-esafe-core-task-start',
    occurredAt: '2026-08-24T18:00:00Z',
    timelineEventId: 'timeline-esafe-core-task-start-001',
    note: 'Begin review of the existing-state survey package.',
  });
  assert(startRetry.status === 'ALREADY_APPLIED', 'exact task-start retry must be idempotent');

  const evidence = addNexusTaskEvidence({
    memory: started.memory,
    taskId: TASK_ID,
    actorPersonId: PERSON_ID,
    accessDecisionId: 'access-esafe-core-evidence-add',
    occurredAt: '2026-08-24T18:05:00Z',
    evidenceId: 'evidence-esafe-core-work-001',
    timelineEventId: 'timeline-esafe-core-evidence-001',
    evidenceType: 'inspection-answer',
    title: 'Survey package reviewed against task scope',
    answerText: 'D5.1 source package reviewed and linked to the current work item.',
    linkedFileId: 'file-esafe-d51-real-pilot-survey',
    provenanceClass: 'SYNTHETIC_DEMO',
  });
  assert(evidence.status === 'APPLIED', 'evidence capture must apply');
  assert(
    evidence.memory.tasks.find((task) => task.id === TASK_ID)?.relatedEvidenceIds?.includes('evidence-esafe-core-work-001'),
    'task must backlink the evidence',
  );

  const requested = requestNexusTaskApproval({
    memory: evidence.memory,
    taskId: TASK_ID,
    actorPersonId: PERSON_ID,
    accessDecisionId: 'access-esafe-core-approval-request',
    occurredAt: '2026-08-24T18:10:00Z',
    approvalId: 'approval-esafe-core-work-001',
    timelineEventId: 'timeline-esafe-core-approval-request-001',
    evidenceIds: ['evidence-esafe-core-work-001'],
  });
  assert(requested.status === 'APPLIED', 'approval request must apply');
  assert(taskStatus(requested.memory) === 'ready-for-review', 'task must become ready-for-review');
  assert(
    requested.memory.approvals.find((approval) => approval.id === 'approval-esafe-core-work-001')?.approvalStatus === 'requested',
    'approval must be requested',
  );

  const decided = decideNexusTaskApproval({
    memory: requested.memory,
    taskId: TASK_ID,
    actorPersonId: PERSON_ID,
    accessDecisionId: 'access-esafe-core-approval-decide',
    occurredAt: '2026-08-24T18:15:00Z',
    approvalId: 'approval-esafe-core-work-001',
    timelineEventId: 'timeline-esafe-core-approval-decision-001',
    decision: 'approved',
    reason: 'Evidence is sufficient for this development work-cycle proof.',
  });
  assert(decided.status === 'APPLIED', 'human approval must apply');
  assert(taskStatus(decided.memory) === 'done', 'approved task must become done');
  assert(
    decided.memory.evidence.find((record) => record.id === 'evidence-esafe-core-work-001')?.evidenceStatus === 'reviewed',
    'approved evidence must become reviewed',
  );
  assert(
    decided.memory.approvals.find((record) => record.id === 'approval-esafe-core-work-001')?.approvedByPersonId === PERSON_ID,
    'approval must record the human approver',
  );

  const decisionRetry = decideNexusTaskApproval({
    memory: decided.memory,
    taskId: TASK_ID,
    actorPersonId: PERSON_ID,
    accessDecisionId: 'access-esafe-core-approval-decide',
    occurredAt: '2026-08-24T18:15:00Z',
    approvalId: 'approval-esafe-core-work-001',
    timelineEventId: 'timeline-esafe-core-approval-decision-001',
    decision: 'approved',
    reason: 'Evidence is sufficient for this development work-cycle proof.',
  });
  assert(decisionRetry.status === 'ALREADY_APPLIED', 'exact approval retry must be idempotent');

  const operationEvents = decided.memory.timelineEvents.filter((event) =>
    typeof event.payload?.operation === 'string' && event.payload.operation.startsWith('worksuite.'),
  );
  assert(operationEvents.length === 4, 'full work cycle must create exactly four operation Timeline events');

  const allowGrant = initial.permissionGrants.find((grant) => grant.id === 'permission-esafe-core-task-start');
  assert(allowGrant, 'task-start allow grant must exist');
  const denyGrant = {
    ...allowGrant,
    id: 'permission-esafe-core-task-start-deny-smoke',
    title: 'Explicit deny smoke',
    effect: 'deny' as const,
    reason: 'Smoke proof that explicit deny wins.',
  };
  const deniedMemory: NexusProjectMemorySnapshot = {
    ...initial,
    permissionGrants: [...initial.permissionGrants, denyGrant],
    projectParticipations: initial.projectParticipations.map((participation) =>
      participation.id === 'participation-esafe-demo-manager'
        ? { ...participation, permissionGrantIds: [...participation.permissionGrantIds, denyGrant.id] }
        : participation,
    ),
  };
  const denied = startNexusTask({
    memory: deniedMemory,
    taskId: TASK_ID,
    actorPersonId: PERSON_ID,
    accessDecisionId: 'access-esafe-core-task-start',
    occurredAt: '2026-08-24T18:20:00Z',
    timelineEventId: 'timeline-esafe-core-denied-must-not-exist',
  });
  assert(denied.status === 'BLOCKED', 'explicit deny must block the action even with an existing allow decision');
  assert(taskStatus(denied.memory) === 'todo', 'blocked operation must not mutate task state');
  assert(
    !denied.memory.timelineEvents.some((event) => event.id === 'timeline-esafe-core-denied-must-not-exist'),
    'blocked operation must not emit Timeline state',
  );

  const wrongWorldMemory: NexusProjectMemorySnapshot = {
    ...initial,
    accessDecisions: initial.accessDecisions.map((decision) =>
      decision.id === 'access-esafe-core-task-start' ? { ...decision, worldId: 'wrong-world' } : decision,
    ),
  };
  const wrongWorld = startNexusTask({
    memory: wrongWorldMemory,
    taskId: TASK_ID,
    actorPersonId: PERSON_ID,
    accessDecisionId: 'access-esafe-core-task-start',
    occurredAt: '2026-08-24T18:25:00Z',
    timelineEventId: 'timeline-esafe-core-wrong-world-must-not-exist',
  });
  assert(wrongWorld.status === 'BLOCKED', 'wrong-world access decision must fail closed');
  assert(taskStatus(wrongWorld.memory) === 'todo', 'wrong-world operation must not mutate task state');

  return true;
};

runEsafeCataniaCoreWorkSmoke();
