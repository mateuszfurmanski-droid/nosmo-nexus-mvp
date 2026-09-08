// @ts-ignore -- runtime smoke intentionally uses Node assert without adding ambient Node types to the root core contract.
import assert from 'node:assert/strict';
import { emptyProjectMemorySnapshot } from '../../data/projectMemory';

declare const console: { log(...args: unknown[]): void };
import type { NexusCanonicalAuthorityEvaluation, NexusCanonicalAuthorityRequest } from '../permissions/canonicalAuthorityContract';
import {
  CanonicalWorkPackageService,
  makeAllowedAuthorityEvaluation,
} from './canonicalWorkPackageService';
import {
  NEXUS_SEMANTIC_OPERATION_SCHEMA,
  type NexusSemanticOperationRequest,
} from './canonicalWorkPackageContract';

const SESSION = { providerKey: 'test', providerSubjectDigest: 'a'.repeat(64) };
const PROJECT = 'project-c2';
const WORLD = 'world-c2';
const MANAGER = 'person-manager';
const WORKER = 'person-worker';
const WORKER_2 = 'person-worker-2';
const TASK_1 = 'task-1';
const TASK_2 = 'task-2';
const DOCUMENT_1 = 'document-1';
const OBJECT_1 = 'object-1';
const PACKAGE = 'package-1';
const NOW = '2026-09-08T15:00:00.000Z';
const DEADLINE = '2026-09-30T16:00:00.000Z';

class FakeAuthority {
  revision = 'authority-r1';
  denyAuthorize = false;
  staleOnCommit = false;

  async authorize(request: NexusCanonicalAuthorityRequest): Promise<NexusCanonicalAuthorityEvaluation> {
    const allowed = makeAllowedAuthorityEvaluation({ request, personId: MANAGER, authorityRevision: this.revision });
    if (!this.denyAuthorize) return allowed;
    return {
      ...allowed,
      status: 'DENIED',
      reasonCode: 'EXPLICIT_DENY',
      allowed: false,
      actor: allowed.actor ? { ...allowed.actor, status: 'DENIED', reasonCode: 'EXPLICIT_DENY' } : undefined,
    };
  }

  async recheckForCommit(
    request: NexusCanonicalAuthorityRequest,
    expectedAuthorityRevision: string,
  ): Promise<NexusCanonicalAuthorityEvaluation> {
    if (this.staleOnCommit) {
      const current = makeAllowedAuthorityEvaluation({ request, personId: MANAGER, authorityRevision: `${expectedAuthorityRevision}-changed` });
      return {
        ...current,
        status: 'STALE',
        reasonCode: 'AUTHORITY_REVISION_STALE',
        allowed: false,
        currentStatusBeforeStale: 'ALLOWED',
      };
    }
    return makeAllowedAuthorityEvaluation({ request, personId: MANAGER, authorityRevision: expectedAuthorityRevision });
  }
}

const memoryFixture = () => {
  const memory = emptyProjectMemorySnapshot();
  memory.projects.push({ id: PROJECT, status: 'active' } as any);
  memory.worlds.push({ id: WORLD, status: 'active', projectId: PROJECT } as any);
  memory.people.push(
    { id: MANAGER, status: 'active' } as any,
    { id: WORKER, status: 'active' } as any,
    { id: WORKER_2, status: 'active' } as any,
  );
  memory.tasks.push(
    {
      id: TASK_1,
      status: 'active',
      title: 'Inspect door',
      projectId: PROJECT,
      worldId: WORLD,
      taskStatus: 'todo',
      priority: 'normal',
      assignedPersonIds: [],
      createdAt: NOW,
      updatedAt: NOW,
      sourceSystem: 'nexus',
      confidence: 'confirmed',
    } as any,
    {
      id: TASK_2,
      status: 'active',
      title: 'Second task',
      projectId: PROJECT,
      worldId: WORLD,
      taskStatus: 'todo',
      priority: 'normal',
      assignedPersonIds: [],
      createdAt: NOW,
      updatedAt: NOW,
      sourceSystem: 'nexus',
      confidence: 'confirmed',
    } as any,
    {
      id: 'task-other-world',
      status: 'active',
      title: 'Wrong scope task',
      projectId: PROJECT,
      worldId: 'world-other',
      taskStatus: 'todo',
      priority: 'normal',
      assignedPersonIds: [],
      createdAt: NOW,
      updatedAt: NOW,
      sourceSystem: 'nexus',
      confidence: 'confirmed',
    } as any,
  );
  memory.files.push({
    id: DOCUMENT_1,
    status: 'active',
    title: 'Fire strategy',
    projectId: PROJECT,
    worldId: WORLD,
    fileKind: 'pdf',
    documentClass: 'report',
    storageConnectorId: 'synthetic',
    createdAt: NOW,
    updatedAt: NOW,
    sourceSystem: 'nexus',
    confidence: 'confirmed',
  } as any);
  memory.canonicalObjects.push({
    id: OBJECT_1,
    status: 'active',
    title: 'Door A-101',
    projectId: PROJECT,
    worldId: WORLD,
    lifecycleStatus: 'active',
    externalReferenceIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    sourceSystem: 'nexus',
    confidence: 'confirmed',
  } as any);
  for (const [personId, participationId] of [[MANAGER, 'part-manager'], [WORKER, 'part-worker'], [WORKER_2, 'part-worker-2']] as const) {
    memory.projectParticipations.push({
      id: participationId,
      status: 'active',
      title: participationId,
      personId,
      projectId: PROJECT,
      worldId: WORLD,
      participationStatus: 'active',
      roleAssignmentIds: [],
      tradeAssignmentIds: [],
      permissionGrantIds: [],
      approvalScopeIds: [],
      competenceRequirementIds: [],
      createdAt: NOW,
      updatedAt: NOW,
      sourceSystem: 'nexus',
      confidence: 'confirmed',
    } as any);
  }
  return memory;
};

const op = (input: Omit<NexusSemanticOperationRequest, 'schema' | 'session' | 'workspaceId' | 'projectId' | 'worldId' | 'occurredAt'> & Partial<Pick<NexusSemanticOperationRequest, 'occurredAt'>>): NexusSemanticOperationRequest => ({
  schema: NEXUS_SEMANTIC_OPERATION_SCHEMA,
  session: SESSION,
  workspaceId: 1,
  projectId: PROJECT,
  worldId: WORLD,
  occurredAt: input.occurredAt ?? NOW,
  ...input,
});

const main = async (): Promise<void> => {
  const authority = new FakeAuthority();
  const service = new CanonicalWorkPackageService(authority, memoryFixture());

  const composed = await service.composeWorkPackage({
    packageId: PACKAGE,
    session: SESSION,
    workspaceId: 1,
    projectId: PROJECT,
    worldId: WORLD,
    occurredAt: NOW,
    title: 'Door inspection package',
    deadline: DEADLINE,
    groups: [
      { groupId: 'group-a', order: 1, title: 'Inspection' },
      { groupId: 'group-b', order: 2, title: 'Closeout' },
    ],
    items: [
      { itemId: 'item-task-1', order: 1, groupId: 'group-a', kind: 'TASK', title: 'Task one', required: true, taskId: TASK_1 },
      { itemId: 'item-task-2', order: 2, groupId: 'group-a', kind: 'TASK', title: 'Task two', required: false, taskId: TASK_2 },
      { itemId: 'item-checklist', order: 3, groupId: 'group-b', kind: 'CHECKLIST', title: 'Checklist', required: true, checklistId: 'checklist-1', taskId: TASK_1 },
      { itemId: 'item-evidence', order: 4, groupId: 'group-b', kind: 'EVIDENCE_REQUIREMENT', title: 'Photo evidence', required: true, evidenceRequirementId: 'req-photo', taskId: TASK_1 },
    ],
    checklistDefinitions: [{
      checklistId: 'checklist-1',
      revision: 1,
      title: 'Door checks',
      items: [
        { itemId: 'check-item-1', order: 1, title: 'Door closes', required: true, expectedResponseType: 'BOOLEAN' },
        { itemId: 'check-item-2', order: 2, title: 'Comment', required: false, expectedResponseType: 'TEXT' },
      ],
    }],
    evidenceRequirements: [{
      requirementId: 'req-photo',
      kind: 'PHOTO_PROOF',
      taskId: TASK_1,
      workPackageId: PACKAGE,
      requiredCount: 1,
      allowedEvidenceType: 'photo',
      description: 'One photo before finish',
      requiredBeforeFinish: true,
    }],
  });
  assert.equal(composed.status, 'APPLIED');
  assert.equal(service.listAssignments(PACKAGE).length, 0, 'composition must not imply assignment');
  if (composed.status !== 'APPLIED') throw new Error('compose failed');
  assert.equal(composed.workPackage.revision, 1);
  assert.equal(composed.workPackage.items.filter((item) => item.kind === 'TASK').length, 2, 'same item type must be allowed');

  const staleEdit = await service.reviseWorkPackage({ packageId: PACKAGE, expectedRevision: 0, session: SESSION, occurredAt: NOW, title: 'stale' });
  assert.equal(staleEdit.status, 'BLOCKED');
  if (staleEdit.status === 'BLOCKED') assert.equal(staleEdit.failures[0]?.code, 'STALE_PACKAGE_REVISION');

  const revised = await service.reviseWorkPackage({
    packageId: PACKAGE,
    expectedRevision: 1,
    session: SESSION,
    occurredAt: '2026-09-08T15:05:00.000Z',
    groups: [
      { groupId: 'group-b', order: 1, title: 'Closeout' },
      { groupId: 'group-a', order: 2, title: 'Inspection' },
    ],
    items: [
      { itemId: 'item-checklist', order: 1, groupId: 'group-b', kind: 'CHECKLIST', title: 'Checklist', required: true, checklistId: 'checklist-1', taskId: TASK_1 },
      { itemId: 'item-evidence', order: 2, groupId: 'group-b', kind: 'EVIDENCE_REQUIREMENT', title: 'Photo evidence', required: true, evidenceRequirementId: 'req-photo', taskId: TASK_1 },
      { itemId: 'item-task-2', order: 3, groupId: 'group-a', kind: 'TASK', title: 'Task two', required: false, taskId: TASK_2 },
      { itemId: 'item-task-1', order: 4, groupId: 'group-a', kind: 'TASK', title: 'Task one', required: true, taskId: TASK_1 },
    ],
  });
  assert.equal(revised.status, 'APPLIED');
  if (revised.status !== 'APPLIED') throw new Error('revise failed');
  assert.equal(revised.workPackage.revision, 2);
  assert.equal(revised.workPackage.groups[0]?.groupId, 'group-b');
  assert.equal(revised.workPackage.items[0]?.itemId, 'item-checklist');

  const wpPersonRequest = op({
    semanticOperationId: 'op-wp-person',
    intent: 'WORK_PACKAGE_TO_PERSON',
    source: { type: 'WORK_PACKAGE', id: PACKAGE },
    target: { type: 'PERSON', id: WORKER },
    packageId: PACKAGE,
    expectedPackageRevision: 2,
  });
  const wpPersonValidation = await service.validateSemanticOperation(wpPersonRequest);
  assert.equal(wpPersonValidation.status, 'VALID');
  const wpPersonCommit = await service.commitSemanticOperation(wpPersonRequest, wpPersonValidation);
  assert.equal(wpPersonCommit.status, 'COMMITTED');
  assert.ok(wpPersonCommit.assignment);
  assert.equal(wpPersonCommit.assignment?.assignedPackageRevision, 2);
  assert.equal(wpPersonCommit.assignment?.deadlineSnapshot, DEADLINE, 'deadline must be frozen into assignment');
  assert.equal(wpPersonCommit.assignment?.snapshot.checklistDefinitions[0]?.revision, 1);
  const assignmentId = wpPersonCommit.assignment!.assignmentId;

  const postAssignmentEdit = await service.reviseWorkPackage({
    packageId: PACKAGE,
    expectedRevision: 2,
    session: SESSION,
    occurredAt: '2026-09-08T15:10:00.000Z',
    title: 'Door inspection package v3',
    checklistDefinitions: [{
      checklistId: 'checklist-1',
      revision: 2,
      title: 'Door checks revised',
      items: [{ itemId: 'check-item-1', order: 1, title: 'Door closes twice', required: true, expectedResponseType: 'BOOLEAN' }],
    }],
  });
  assert.equal(postAssignmentEdit.status, 'APPLIED', 'composition must remain separate from assignment');
  assert.equal(service.listAssignments(PACKAGE)[0]?.snapshot.checklistDefinitions[0]?.revision, 1, 'assigned snapshot must remain immutable after draft changes');
  assert.equal(service.listAssignments(PACKAGE)[0]?.snapshot.title, 'Door inspection package');

  const run = service.recordChecklistRun({
    runId: 'run-1',
    assignmentId,
    taskId: TASK_1,
    workerPersonId: WORKER,
    checklistId: 'checklist-1',
    responses: [{ itemId: 'check-item-1', value: true, respondedAt: NOW }],
    occurredAt: '2026-09-08T15:15:00.000Z',
  });
  assert.equal(run.status, 'APPLIED');
  if (run.status === 'APPLIED') {
    assert.equal(run.run.checklistRevision, 1, 'run must bind to frozen assigned checklist revision');
    assert.equal(run.run.completionState, 'COMPLETE');
  }

  const beforeEvidence = service.evidenceRequirementsBeforeFinish({ assignmentId, taskId: TASK_1 });
  assert.equal(beforeEvidence.allowed, false, 'Evidence Requirement must block Finish while unmet');
  assert.deepEqual(beforeEvidence.missingRequirementIds, ['req-photo']);
  const memoryWithEvidence = service.getMemory();
  memoryWithEvidence.evidence.push({
    id: 'evidence-photo-1', status: 'active', title: 'Photo', evidenceType: 'photo', evidenceStatus: 'captured', projectId: PROJECT, worldId: WORLD, linkedTaskId: TASK_1,
    createdAt: NOW, updatedAt: NOW, sourceSystem: 'nexus', confidence: 'confirmed',
  } as any);
  service.syncProjectMemory(memoryWithEvidence);
  assert.equal(service.evidenceRequirementsBeforeFinish({ assignmentId, taskId: TASK_1 }).allowed, true);

  const taskPerson = op({
    semanticOperationId: 'op-task-person',
    intent: 'TASK_TO_PERSON',
    source: { type: 'TASK', id: TASK_1 },
    target: { type: 'PERSON', id: WORKER_2 },
  });
  assert.equal((await service.commitSemanticOperation(taskPerson)).status, 'COMMITTED');
  assert.ok(service.getMemory().tasks.find((task) => task.id === TASK_1)?.assignedPersonIds.includes(WORKER_2));

  const documentTask = op({
    semanticOperationId: 'op-document-task',
    intent: 'DOCUMENT_TO_TASK',
    source: { type: 'DOCUMENT', id: DOCUMENT_1 },
    target: { type: 'TASK', id: TASK_1 },
  });
  assert.equal((await service.commitSemanticOperation(documentTask)).status, 'COMMITTED');
  assert.ok(service.getMemory().tasks.find((task) => task.id === TASK_1)?.relatedFileIds?.includes(DOCUMENT_1));

  const appPerson = op({
    semanticOperationId: 'op-app-person',
    intent: 'APP_TO_PERSON',
    source: { type: 'APP', id: 'app-doorflow' },
    target: { type: 'PERSON', id: WORKER_2 },
    companionGrants: [{
      intentId: 'companion-intent-1',
      grantId: 'permission-grant-app-worker-2',
      moduleId: 'doorflow',
      actionKey: 'doorflow.open',
      objectScopeId: OBJECT_1,
      reason: 'Required by semantic App -> Person assignment.',
    }],
  });
  assert.equal((await service.commitSemanticOperation(appPerson)).status, 'COMMITTED');
  assert.ok(service.getMemory().permissionGrants.some((grant) => grant.id === 'permission-grant-app-worker-2'));
  assert.ok(service.getMemory().projectParticipations.find((p) => p.personId === WORKER_2)?.permissionGrantIds.includes('permission-grant-app-worker-2'));

  const wpObject = op({
    semanticOperationId: 'op-wp-object',
    intent: 'WORK_PACKAGE_TO_OBJECT',
    source: { type: 'WORK_PACKAGE', id: PACKAGE },
    target: { type: 'OBJECT', id: OBJECT_1 },
    packageId: PACKAGE,
    expectedPackageRevision: 3,
  });
  const wpObjectCommit = await service.commitSemanticOperation(wpObject);
  assert.equal(wpObjectCommit.status, 'COMMITTED');
  assert.equal(wpObjectCommit.assignment?.recipient.type, 'OBJECT');

  const exactRetry = await service.commitSemanticOperation(documentTask);
  assert.equal(exactRetry.status, 'ALREADY_COMMITTED');
  const mismatchRetry = await service.commitSemanticOperation({ ...documentTask, target: { type: 'TASK', id: TASK_2 } });
  assert.equal(mismatchRetry.status, 'IDEMPOTENCY_CONFLICT');

  const concurrent = op({
    semanticOperationId: 'op-concurrent-task-person',
    intent: 'TASK_TO_PERSON',
    source: { type: 'TASK', id: TASK_2 },
    target: { type: 'PERSON', id: WORKER_2 },
  });
  const concurrentResults = await Promise.all([
    service.commitSemanticOperation(concurrent),
    service.commitSemanticOperation(concurrent),
  ]);
  assert.deepEqual(concurrentResults.map((result) => result.status).sort(), ['ALREADY_COMMITTED', 'COMMITTED']);
  assert.equal(service.getMemory().tasks.find((task) => task.id === TASK_2)?.assignedPersonIds.filter((id: string) => id === WORKER_2).length, 1);

  const duplicateAssignment = op({
    semanticOperationId: 'op-duplicate-wp-person',
    intent: 'WORK_PACKAGE_TO_PERSON',
    source: { type: 'WORK_PACKAGE', id: PACKAGE },
    target: { type: 'PERSON', id: WORKER },
    packageId: PACKAGE,
    expectedPackageRevision: 3,
  });
  const duplicateValidation = await service.validateSemanticOperation(duplicateAssignment);
  assert.equal(duplicateValidation.status, 'INVALID');
  if (duplicateValidation.status === 'INVALID') assert.ok(duplicateValidation.failures.some((item) => item.code === 'DUPLICATE_ASSIGNMENT'));

  const missingRecipient = op({
    semanticOperationId: 'op-missing-person',
    intent: 'TASK_TO_PERSON',
    source: { type: 'TASK', id: TASK_1 },
    target: { type: 'PERSON', id: 'person-missing' },
  });
  const missingRecipientValidation = await service.validateSemanticOperation(missingRecipient);
  assert.equal(missingRecipientValidation.status, 'INVALID');
  if (missingRecipientValidation.status === 'INVALID') assert.ok(missingRecipientValidation.failures.some((item) => item.code === 'TARGET_NOT_FOUND'));

  const wrongScope = op({
    semanticOperationId: 'op-wrong-scope',
    intent: 'TASK_TO_PERSON',
    source: { type: 'TASK', id: 'task-other-world' },
    target: { type: 'PERSON', id: WORKER },
  });
  const wrongScopeValidation = await service.validateSemanticOperation(wrongScope);
  assert.equal(wrongScopeValidation.status, 'INVALID');
  if (wrongScopeValidation.status === 'INVALID') assert.ok(wrongScopeValidation.failures.some((item) => item.code === 'WRONG_PROJECT_WORLD'));

  authority.denyAuthorize = true;
  const denied = await service.validateSemanticOperation(op({
    semanticOperationId: 'op-denied',
    intent: 'TASK_TO_PERSON',
    source: { type: 'TASK', id: TASK_1 },
    target: { type: 'PERSON', id: WORKER },
  }));
  assert.equal(denied.status, 'INVALID');
  if (denied.status === 'INVALID') assert.ok(denied.failures.some((item) => item.code === 'AUTHORITY_DENIED'));
  authority.denyAuthorize = false;

  const staleRequest = op({
    semanticOperationId: 'op-stale-authority',
    intent: 'TASK_TO_PERSON',
    source: { type: 'TASK', id: TASK_1 },
    target: { type: 'PERSON', id: WORKER },
  });
  const staleValidation = await service.validateSemanticOperation(staleRequest);
  assert.equal(staleValidation.status, 'VALID');
  authority.staleOnCommit = true;
  const staleCommit = await service.commitSemanticOperation(staleRequest, staleValidation);
  assert.equal(staleCommit.status, 'BLOCKED');
  assert.equal(service.getReceipt(staleRequest.semanticOperationId), undefined, 'stale authority must not create a receipt');
  authority.staleOnCommit = false;

  const rollbackAuthority = new FakeAuthority();
  const rollbackService = new CanonicalWorkPackageService(rollbackAuthority, memoryFixture(), {
    beforeSemanticCommitSwap: () => { throw new Error('synthetic persistence failure'); },
  });
  const rollbackRequest = op({
    semanticOperationId: 'op-rollback',
    intent: 'TASK_TO_PERSON',
    source: { type: 'TASK', id: TASK_1 },
    target: { type: 'PERSON', id: WORKER },
  });
  const rollback = await rollbackService.commitSemanticOperation(rollbackRequest);
  assert.equal(rollback.status, 'BLOCKED');
  assert.equal(rollbackService.getReceipt('op-rollback'), undefined);
  assert.deepEqual(rollbackService.getMemory().tasks.find((task) => task.id === TASK_1)?.assignedPersonIds, []);
  assert.equal(rollbackService.getMemory().relationshipEdges.length, 0);
  assert.equal(rollbackService.getMemory().timelineEvents.length, 0);
  assert.equal(rollbackService.getMemory().nexusEvents.length, 0);

  console.log('NEXUS_WORK_PACKAGE_CONTRACT_PASS cases=24');
};

await main();
