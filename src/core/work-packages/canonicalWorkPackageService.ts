import {
  NEXUS_AUTHORITY_ACTIONS,
  NEXUS_CANONICAL_AUTHORITY_SCHEMA,
  type NexusCanonicalAuthorityEvaluation,
  type NexusCanonicalAuthorityRequest,
  type NexusTargetCapabilityRequirement,
} from '../permissions/canonicalAuthorityContract';
import type { CanonicalAuthorityService } from '../permissions/canonicalAuthorityService';
import type { NexusProjectMemorySnapshot } from '../../data/projectMemory';
import type { NexusEventRecord } from '../../data/schemas/audit.schema';
import type { NexusPermissionGrantRecord } from '../../data/schemas/access.schema';
import type { NexusRelationshipEdgeRecord } from '../../data/schemas/canonicalObject.schema';
import type { NexusTimelineEventRecord } from '../../data/schemas/timeline.schema';
import {
  NEXUS_CANONICAL_WORK_PACKAGE_SCHEMA,
  NEXUS_SEMANTIC_OPERATION_SCHEMA,
  type NexusAssignedWorkPackageSnapshot,
  type NexusCanonicalWorkPackage,
  type NexusChecklistDefinition,
  type NexusChecklistRun,
  type NexusComposeWorkPackageInput,
  type NexusCompanionCapabilityGrant,
  type NexusEvidenceRequirement,
  type NexusReviseWorkPackageInput,
  type NexusSemanticCommitResult,
  type NexusSemanticEffect,
  type NexusSemanticIntent,
  type NexusSemanticOperationPlan,
  type NexusSemanticOperationReceipt,
  type NexusSemanticOperationRequest,
  type NexusSemanticReference,
  type NexusSemanticValidationFailure,
  type NexusSemanticValidationResult,
  type NexusWorkPackageAssignment,
  type NexusWorkPackageAssignmentRecipient,
  type NexusWorkPackageGroup,
  type NexusWorkPackageItem,
  type NexusWorkPackageMutationResult,
} from './canonicalWorkPackageContract';

type AuthorityPort = Pick<CanonicalAuthorityService, 'authorize' | 'recheckForCommit'>;
type EngineFaults = { beforeSemanticCommitSwap?: () => void | Promise<void> };
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const uniq = (values: readonly string[]): string[] => [...new Set(values)];
const fail = (code: NexusSemanticValidationFailure['code'], message: string): NexusSemanticValidationFailure => ({ code, message });
const blocked = (...failures: NexusSemanticValidationFailure[]): NexusWorkPackageMutationResult => ({ status: 'BLOCKED', failures });
const validIso = (value: string): boolean => Number.isFinite(Date.parse(value));
const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  return JSON.stringify(value);
};
export const createSemanticOperationFingerprint = (request: NexusSemanticOperationRequest): string =>
  `nexus-semantic-operation-fingerprint/v1:${canonical({
    schema: request.schema, semanticOperationId: request.semanticOperationId, workspaceId: request.workspaceId,
    projectId: request.projectId, worldId: request.worldId, intent: request.intent, source: request.source,
    target: request.target, packageId: request.packageId, expectedPackageRevision: request.expectedPackageRevision,
    companionGrants: request.companionGrants ?? [],
  })}`;

const normalized = <T extends { order: number }>(values: T[], id: (v: T) => string): T[] =>
  clone(values).sort((a, b) => a.order - b.order || id(a).localeCompare(id(b)));
const validateComposition = (packageId: string, groups: NexusWorkPackageGroup[], items: NexusWorkPackageItem[], checklists: NexusChecklistDefinition[], requirements: NexusEvidenceRequirement[], deadline?: string): NexusSemanticValidationFailure[] => {
  const failures: NexusSemanticValidationFailure[] = [];
  const ids = items.map((v) => v.itemId); const gids = groups.map((v) => v.groupId); const groupSet = new Set(gids);
  if (uniq(ids).length !== ids.length || ids.some((id) => !id.trim())) failures.push(fail('INVALID_SHAPE', 'Work Package item IDs must be non-empty and unique.'));
  if (uniq(gids).length !== gids.length || items.some((v) => v.groupId && !groupSet.has(v.groupId))) failures.push(fail('INVALID_SHAPE', 'Work Package groups are invalid.'));
  for (const c of checklists) if (c.revision < 1 || uniq(c.items.map((v) => v.itemId)).length !== c.items.length) failures.push(fail('INVALID_SHAPE', `Checklist ${c.checklistId} is invalid.`));
  if (uniq(requirements.map((v) => v.requirementId)).length !== requirements.length || requirements.some((v) => v.workPackageId !== packageId || v.requiredCount < 1)) failures.push(fail('INVALID_SHAPE', 'Evidence Requirements are invalid.'));
  if (deadline && !validIso(deadline)) failures.push(fail('INVALID_SHAPE', 'Work Package deadline is invalid.'));
  return failures;
};
const actor = (a: NexusCanonicalAuthorityEvaluation): string | undefined => a.allowed && a.identity.state === 'BOUND' ? a.identity.personId : undefined;
const authorityFailure = (a: NexusCanonicalAuthorityEvaluation) => fail(a.status === 'STALE' ? 'AUTHORITY_STALE' : 'AUTHORITY_DENIED', `Canonical Authority blocked operation: ${a.status}/${a.reasonCode}.`);
const recipientKey = (r: NexusWorkPackageAssignmentRecipient) => r.type === 'PERSON' ? `PERSON:${r.personId}` : `OBJECT:${r.objectId}`;
const sameOptional = (left: string | undefined, right: string | undefined): boolean => (left ?? null) === (right ?? null);
const companionMatchesRequirement = (grant: NexusCompanionCapabilityGrant, requirement: NexusTargetCapabilityRequirement): boolean =>
  grant.intentId === requirement.companionGrantIntentId &&
  grant.moduleId === requirement.moduleId &&
  grant.actionKey === requirement.actionKey &&
  sameOptional(grant.objectScopeId, requirement.objectScopeId) &&
  sameOptional(grant.dataScope, requirement.dataScope);
const intentShape: Record<NexusSemanticIntent, [NexusSemanticReference['type'], NexusSemanticReference['type']]> = {
  TASK_TO_PERSON: ['TASK', 'PERSON'], APP_TO_PERSON: ['APP', 'PERSON'], DOCUMENT_TO_TASK: ['DOCUMENT', 'TASK'],
  WORK_PACKAGE_TO_PERSON: ['WORK_PACKAGE', 'PERSON'], WORK_PACKAGE_TO_OBJECT: ['WORK_PACKAGE', 'OBJECT'],
};
const actionFor = (intent: NexusSemanticIntent): string => ({
  TASK_TO_PERSON: NEXUS_AUTHORITY_ACTIONS.managerAssignTaskToPerson,
  APP_TO_PERSON: NEXUS_AUTHORITY_ACTIONS.managerGrantAppCapability,
  DOCUMENT_TO_TASK: NEXUS_AUTHORITY_ACTIONS.managerAttachDocumentToTask,
  WORK_PACKAGE_TO_PERSON: NEXUS_AUTHORITY_ACTIONS.managerAssignWorkPackageToPerson,
  WORK_PACKAGE_TO_OBJECT: NEXUS_AUTHORITY_ACTIONS.managerBindWorkPackageToObject,
})[intent];

export class CanonicalWorkPackageService {
  private memory: NexusProjectMemorySnapshot;
  private readonly packages = new Map<string, NexusCanonicalWorkPackage>();
  private readonly assignments = new Map<string, NexusWorkPackageAssignment>();
  private readonly receipts = new Map<string, NexusSemanticOperationReceipt>();
  private readonly checklistRuns = new Map<string, NexusChecklistRun>();
  private readonly locks = new Map<string, Promise<void>>();
  constructor(private readonly authority: AuthorityPort, memory: NexusProjectMemorySnapshot, private readonly faults: EngineFaults = {}) { this.memory = clone(memory); }
  getMemory(): NexusProjectMemorySnapshot { return clone(this.memory); }
  syncProjectMemory(memory: NexusProjectMemorySnapshot): void { this.memory = clone(memory); }
  getWorkPackage(id: string): NexusCanonicalWorkPackage | undefined { const p = this.packages.get(id); return p ? clone(p) : undefined; }
  listAssignments(packageId?: string): NexusWorkPackageAssignment[] { return [...this.assignments.values()].filter((a) => !packageId || a.packageId === packageId).map(clone); }
  getReceipt(id: string): NexusSemanticOperationReceipt | undefined { const r = this.receipts.get(id); return r ? clone(r) : undefined; }
  getChecklistRun(id: string): NexusChecklistRun | undefined { const r = this.checklistRuns.get(id); return r ? clone(r) : undefined; }

  private async authorizeMutation(request: NexusCanonicalAuthorityRequest): Promise<{ personId: string; revision: string } | NexusSemanticValidationFailure[]> {
    const first = await this.authority.authorize(request); const personId = actor(first);
    if (!personId || !first.authorityRevision) return [authorityFailure(first)];
    const fresh = await this.authority.recheckForCommit(request, first.authorityRevision); const freshPerson = actor(fresh);
    return freshPerson && fresh.authorityRevision ? { personId: freshPerson, revision: fresh.authorityRevision } : [authorityFailure(fresh)];
  }

  async composeWorkPackage(input: NexusComposeWorkPackageInput): Promise<NexusWorkPackageMutationResult> {
    if (this.packages.has(input.packageId)) return blocked(fail('INVALID_SHAPE', `Work Package ${input.packageId} already exists.`));
    const groups = normalized(input.groups ?? [], (v) => v.groupId), items = normalized(input.items ?? [], (v) => v.itemId);
    const checklists = clone(input.checklistDefinitions ?? []).map((c) => ({ ...c, items: normalized(c.items, (v) => v.itemId) }));
    const requirements = clone(input.evidenceRequirements ?? []); const failures = validateComposition(input.packageId, groups, items, checklists, requirements, input.deadline);
    if (failures.length || !input.title.trim() || !validIso(input.occurredAt)) return { status: 'BLOCKED', failures: failures.length ? failures : [fail('INVALID_SHAPE', 'Title/occurredAt invalid.')] };
    const auth = await this.authorizeMutation({ session: input.session, workspaceId: input.workspaceId, projectId: input.projectId, worldId: input.worldId, moduleId: 'worksuite', actionKey: NEXUS_AUTHORITY_ACTIONS.managerComposeWorkPackage, targetCapabilityRequirements: [] });
    if (Array.isArray(auth)) return { status: 'BLOCKED', failures: auth };
    const p: NexusCanonicalWorkPackage = { schema: NEXUS_CANONICAL_WORK_PACKAGE_SCHEMA, packageId: input.packageId, workspaceId: input.workspaceId, projectId: input.projectId, worldId: input.worldId, revision: 1, lifecycle: 'DRAFT', compositionState: 'OPEN', assignmentState: 'UNASSIGNED', creatorPersonId: auth.personId, createdAt: input.occurredAt, updatedAt: input.occurredAt, title: input.title, description: input.description, groups, items, checklistDefinitions: checklists, evidenceRequirements: requirements, deadline: input.deadline, objectContextIds: uniq(input.objectContextIds ?? []), locationContextIds: uniq(input.locationContextIds ?? []) };
    this.packages.set(p.packageId, clone(p)); return { status: 'APPLIED', workPackage: clone(p) };
  }

  async reviseWorkPackage(input: NexusReviseWorkPackageInput): Promise<NexusWorkPackageMutationResult> {
    const p = this.packages.get(input.packageId); if (!p) return blocked(fail('PACKAGE_NOT_FOUND', 'Work Package not found.'));
    if (p.revision !== input.expectedRevision) return blocked(fail('STALE_PACKAGE_REVISION', `Expected ${input.expectedRevision}; current ${p.revision}.`));
    if (p.lifecycle !== 'DRAFT' || p.compositionState !== 'OPEN') return blocked(fail('PACKAGE_NOT_ASSIGNABLE', 'Package is not editable.'));
    const groups = input.groups ? normalized(input.groups, (v) => v.groupId) : clone(p.groups), items = input.items ? normalized(input.items, (v) => v.itemId) : clone(p.items);
    const checklists = input.checklistDefinitions ? clone(input.checklistDefinitions).map((c) => ({ ...c, items: normalized(c.items, (v) => v.itemId) })) : clone(p.checklistDefinitions);
    const requirements = input.evidenceRequirements ? clone(input.evidenceRequirements) : clone(p.evidenceRequirements), deadline = input.deadline === null ? undefined : input.deadline ?? p.deadline;
    const failures = validateComposition(p.packageId, groups, items, checklists, requirements, deadline); if (failures.length) return { status: 'BLOCKED', failures };
    const auth = await this.authorizeMutation({ session: input.session, workspaceId: p.workspaceId, projectId: p.projectId, worldId: p.worldId, moduleId: 'worksuite', actionKey: NEXUS_AUTHORITY_ACTIONS.managerEditDraftPackage, objectScopeId: p.packageId, targetCapabilityRequirements: [] });
    if (Array.isArray(auth)) return { status: 'BLOCKED', failures: auth };
    const next = { ...clone(p), revision: p.revision + 1, updatedAt: input.occurredAt, title: input.title ?? p.title, description: input.description ?? p.description, groups, items, checklistDefinitions: checklists, evidenceRequirements: requirements, deadline, objectContextIds: input.objectContextIds ? uniq(input.objectContextIds) : [...p.objectContextIds], locationContextIds: input.locationContextIds ? uniq(input.locationContextIds) : [...p.locationContextIds] };
    this.packages.set(p.packageId, clone(next)); return { status: 'APPLIED', workPackage: clone(next) };
  }

  private referenceFailure(ref: NexusSemanticReference, projectId: string, worldId: string): NexusSemanticValidationFailure | undefined {
    if (ref.type === 'TASK') { const v = this.memory.tasks.find((x) => x.id === ref.id && x.status === 'active'); return !v ? fail('SOURCE_NOT_FOUND', 'Task not found.') : v.projectId !== projectId || v.worldId !== worldId ? fail('WRONG_PROJECT_WORLD', 'Task scope mismatch.') : undefined; }
    if (ref.type === 'DOCUMENT') { const v = this.memory.files.find((x) => x.id === ref.id && x.status === 'active'); return !v ? fail('SOURCE_NOT_FOUND', 'Document not found.') : v.projectId !== projectId || v.worldId !== worldId ? fail('WRONG_PROJECT_WORLD', 'Document scope mismatch.') : undefined; }
    if (ref.type === 'PERSON') return this.memory.people.some((x) => x.id === ref.id && x.status === 'active') ? undefined : fail('TARGET_NOT_FOUND', 'Person not found.');
    if (ref.type === 'OBJECT') { const v = this.memory.canonicalObjects.find((x) => x.id === ref.id && x.status === 'active' && x.lifecycleStatus === 'active'); return !v ? fail('TARGET_NOT_FOUND', 'Object not found.') : v.projectId !== projectId || v.worldId !== worldId ? fail('WRONG_PROJECT_WORLD', 'Object scope mismatch.') : undefined; }
    if (ref.type === 'WORK_PACKAGE') { const v = this.packages.get(ref.id); return !v ? fail('PACKAGE_NOT_FOUND', 'Work Package not found.') : v.projectId !== projectId || v.worldId !== worldId ? fail('WRONG_PROJECT_WORLD', 'Work Package scope mismatch.') : undefined; }
    return ref.id.trim() ? undefined : fail('SOURCE_NOT_FOUND', 'App reference empty.');
  }

  private requirements(p: NexusCanonicalWorkPackage): NexusTargetCapabilityRequirement[] {
    const all = p.items.flatMap((i) => i.targetCapabilityRequirements ?? []); return all.length ? clone(all) : [{ moduleId: 'worksuite', actionKey: NEXUS_AUTHORITY_ACTIONS.workerReadAssignedPackage, objectScopeId: p.packageId, accessMode: 'CURRENT_ACCESS_REQUIRED' }];
  }

  private validateWorkPackageCompanionGrants(
    r: NexusSemanticOperationRequest,
    requirements: NexusTargetCapabilityRequirement[],
  ): { status: 'VALID'; grants: NexusCompanionCapabilityGrant[] } | { status: 'INVALID'; failures: NexusSemanticValidationFailure[] } {
    if (r.intent !== 'WORK_PACKAGE_TO_PERSON' || r.target.type !== 'PERSON') return { status: 'VALID', grants: [] };
    const grantable = requirements.filter((requirement) => requirement.accessMode === 'GRANTABLE_IN_SAME_OPERATION');
    const grants = clone(r.companionGrants ?? []);
    if (grantable.length === 0) {
      return grants.length === 0
        ? { status: 'VALID', grants: [] }
        : { status: 'INVALID', failures: [fail('COMPANION_GRANT_INVALID', 'Work Package companion grants require a matching GRANTABLE_IN_SAME_OPERATION capability.')] };
    }
    if (grantable.some((requirement) => !requirement.companionGrantIntentId?.trim())) {
      return { status: 'INVALID', failures: [fail('COMPANION_GRANT_INVALID', 'Every grantable Work Package capability requires companionGrantIntentId.')] };
    }
    const requiredIntentIds = grantable.map((requirement) => requirement.companionGrantIntentId!);
    if (uniq(requiredIntentIds).length !== requiredIntentIds.length) {
      return { status: 'INVALID', failures: [fail('COMPANION_GRANT_INVALID', 'Duplicate or conflicting Work Package companionGrantIntentId values are forbidden.')] };
    }
    if (
      grants.length !== grantable.length ||
      grants.some((grant) => !grant.intentId.trim() || !grant.grantId.trim() || !grant.reason.trim()) ||
      uniq(grants.map((grant) => grant.intentId)).length !== grants.length ||
      uniq(grants.map((grant) => grant.grantId)).length !== grants.length
    ) {
      return { status: 'INVALID', failures: [fail('COMPANION_GRANT_INVALID', 'Work Package grantable capabilities require exactly one unique trusted companion grant each.')] };
    }
    for (const requirement of grantable) {
      const matches = grants.filter((grant) => companionMatchesRequirement(grant, requirement));
      if (matches.length !== 1) {
        return { status: 'INVALID', failures: [fail('COMPANION_GRANT_INVALID', `Companion grant ${requirement.companionGrantIntentId} does not exactly match module/action/object/data scope.`)] };
      }
    }
    for (const grant of grants) {
      const matches = grantable.filter((requirement) => companionMatchesRequirement(grant, requirement));
      if (matches.length !== 1) {
        return { status: 'INVALID', failures: [fail('COMPANION_GRANT_INVALID', `Trusted companion grant ${grant.intentId} is unmatched or ambiguous.`)] };
      }
      if (this.memory.permissionGrants.some((existing) => existing.id === grant.grantId)) {
        return { status: 'INVALID', failures: [fail('COMPANION_GRANT_INVALID', `PermissionGrant ID ${grant.grantId} already exists.`)] };
      }
    }
    // The trusted payload is operation-scoped: every emitted grant is structurally bound to this exact semantic target Person.
    return { status: 'VALID', grants };
  }

  private authorityRequest(r: NexusSemanticOperationRequest): NexusCanonicalAuthorityRequest | NexusSemanticValidationFailure[] {
    let objectScopeId: string | undefined; let targetPersonId = r.target.type === 'PERSON' ? r.target.id : undefined; let reqs: NexusTargetCapabilityRequirement[] = [];
    if (r.intent === 'TASK_TO_PERSON' && r.source.type === 'TASK') { objectScopeId = r.source.id; reqs = [{ moduleId: 'worksuite', actionKey: NEXUS_AUTHORITY_ACTIONS.workerStartTask, objectScopeId, accessMode: 'CURRENT_ACCESS_REQUIRED' }]; }
    if (r.intent === 'DOCUMENT_TO_TASK' && r.target.type === 'TASK') objectScopeId = r.target.id;
    if (r.intent === 'WORK_PACKAGE_TO_OBJECT' && r.target.type === 'OBJECT') objectScopeId = r.target.id;
    if (r.intent === 'WORK_PACKAGE_TO_PERSON' && r.source.type === 'WORK_PACKAGE') {
      const p = this.packages.get(r.source.id); if (!p) return [fail('PACKAGE_NOT_FOUND', 'Package not found.')];
      objectScopeId = p.packageId; reqs = this.requirements(p);
      const companion = this.validateWorkPackageCompanionGrants(r, reqs); if (companion.status === 'INVALID') return companion.failures;
    }
    if (r.intent === 'APP_TO_PERSON') { const grants = r.companionGrants ?? []; if (!targetPersonId || !grants.length || uniq(grants.map((g) => g.intentId)).length !== grants.length || uniq(grants.map((g) => g.grantId)).length !== grants.length) return [fail('COMPANION_GRANT_INVALID', 'App -> Person requires unique companion grants.')]; reqs = grants.map((g) => ({ moduleId: g.moduleId, actionKey: g.actionKey, objectScopeId: g.objectScopeId, dataScope: g.dataScope, accessMode: 'GRANTABLE_IN_SAME_OPERATION', companionGrantIntentId: g.intentId })); }
    return { session: r.session, workspaceId: r.workspaceId, projectId: r.projectId, worldId: r.worldId, moduleId: r.intent === 'APP_TO_PERSON' ? 'authority' : 'worksuite', actionKey: actionFor(r.intent), objectScopeId, targetPersonId, targetCapabilityRequirements: reqs };
  }

  private effects(r: NexusSemanticOperationRequest): NexusSemanticEffect[] {
    const edgeId = `semantic-edge:${r.semanticOperationId}`, eventId = `semantic-event:${r.semanticOperationId}`, timelineEventId = `semantic-timeline:${r.semanticOperationId}`; const e: NexusSemanticEffect[] = [];
    if (r.intent === 'TASK_TO_PERSON' && r.source.type === 'TASK' && r.target.type === 'PERSON') e.push({ type: 'PROJECT_TASK_ASSIGNMENT', taskId: r.source.id, personId: r.target.id }, { type: 'PROJECT_RELATIONSHIP_EDGE', edgeId, sourceId: r.source.id, targetId: r.target.id, relationshipType: 'ASSIGNED_TO' });
    if (r.intent === 'DOCUMENT_TO_TASK' && r.source.type === 'DOCUMENT' && r.target.type === 'TASK') e.push({ type: 'PROJECT_DOCUMENT_TASK_LINK', documentId: r.source.id, taskId: r.target.id }, { type: 'PROJECT_RELATIONSHIP_EDGE', edgeId, sourceId: r.source.id, targetId: r.target.id, relationshipType: 'RELATES_TO' });
    if (r.intent === 'APP_TO_PERSON' && r.target.type === 'PERSON') { for (const g of r.companionGrants ?? []) e.push({ type: 'COMPANION_PERMISSION_GRANT', grantId: g.grantId, intentId: g.intentId, targetPersonId: r.target.id }); e.push({ type: 'PROJECT_RELATIONSHIP_EDGE', edgeId, sourceId: r.source.id, targetId: r.target.id, relationshipType: 'ASSIGNED_TO' }); }
    if ((r.intent === 'WORK_PACKAGE_TO_PERSON' || r.intent === 'WORK_PACKAGE_TO_OBJECT') && r.source.type === 'WORK_PACKAGE') {
      const recipient: NexusWorkPackageAssignmentRecipient = r.target.type === 'PERSON' ? { type: 'PERSON', personId: r.target.id } : { type: 'OBJECT', objectId: r.target.id };
      e.push({ type: 'CREATE_WORK_PACKAGE_ASSIGNMENT', assignmentId: `work-package-assignment:${r.semanticOperationId}`, recipient });
      if (r.intent === 'WORK_PACKAGE_TO_PERSON' && r.target.type === 'PERSON') {
        for (const g of r.companionGrants ?? []) e.push({ type: 'COMPANION_PERMISSION_GRANT', grantId: g.grantId, intentId: g.intentId, targetPersonId: r.target.id });
      }
      e.push({ type: 'PROJECT_RELATIONSHIP_EDGE', edgeId, sourceId: r.source.id, targetId: r.target.id, relationshipType: 'ASSIGNED_TO' });
    }
    e.push({ type: 'PROJECT_MEMORY_EVENT', eventId, timelineEventId }); return e;
  }

  async validateSemanticOperation(r: NexusSemanticOperationRequest): Promise<NexusSemanticValidationResult> {
    const shape = intentShape[r.intent]; if (r.schema !== NEXUS_SEMANTIC_OPERATION_SCHEMA || r.source.type !== shape[0] || r.target.type !== shape[1]) return { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, status: 'INVALID', failures: [fail('SOURCE_TARGET_INCOMPATIBLE', `${r.intent} requires ${shape[0]} -> ${shape[1]}.`)] };
    const failures = [this.referenceFailure(r.source, r.projectId, r.worldId), this.referenceFailure(r.target, r.projectId, r.worldId)].filter((v): v is NexusSemanticValidationFailure => !!v); if (failures.length) return { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, status: 'INVALID', failures };
    let p: NexusCanonicalWorkPackage | undefined;
    if (r.source.type === 'WORK_PACKAGE') { p = this.packages.get(r.source.id)!; if (r.expectedPackageRevision !== p.revision) return { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, status: 'INVALID', failures: [fail('STALE_PACKAGE_REVISION', `Expected ${r.expectedPackageRevision}; current ${p.revision}.`)] }; const recipient: NexusWorkPackageAssignmentRecipient = r.target.type === 'PERSON' ? { type: 'PERSON', personId: r.target.id } : { type: 'OBJECT', objectId: r.target.id }; if ([...this.assignments.values()].some((a) => a.packageId === p!.packageId && a.lifecycleState === 'ACTIVE' && recipientKey(a.recipient) === recipientKey(recipient))) return { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, status: 'INVALID', failures: [fail('DUPLICATE_ASSIGNMENT', 'Active assignment already exists.')] }; }
    const ar = this.authorityRequest(r); if (Array.isArray(ar)) return { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, status: 'INVALID', failures: ar };
    const a = await this.authority.authorize(ar), personId = actor(a); if (!personId || !a.authorityRevision) return { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, status: 'INVALID', failures: [authorityFailure(a)], authority: a };
    const plan: NexusSemanticOperationPlan = { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, semanticOperationId: r.semanticOperationId, fingerprint: createSemanticOperationFingerprint(r), intent: r.intent, actorPersonId: personId, authorityRequest: ar, authorityRevision: a.authorityRevision, expectedPackageRevision: p?.revision, effects: this.effects(r) };
    return { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, status: 'VALID', plan, authority: a };
  }

  private async locked<T>(key: string, run: () => Promise<T>): Promise<T> { const previous = this.locks.get(key) ?? Promise.resolve(); let release = () => {}; const gate = new Promise<void>((resolve) => { release = resolve; }); const current = previous.then(() => gate); this.locks.set(key, current); try { await previous; return await run(); } finally { release(); if (this.locks.get(key) === current) this.locks.delete(key); } }
  async commitSemanticOperation(r: NexusSemanticOperationRequest, validated?: NexusSemanticValidationResult): Promise<NexusSemanticCommitResult> {
    return this.locked(r.semanticOperationId, async () => {
      const fingerprint = createSemanticOperationFingerprint(r), prior = this.receipts.get(r.semanticOperationId); if (prior) return prior.fingerprint === fingerprint ? { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, status: 'ALREADY_COMMITTED', memory: this.getMemory(), receipt: clone(prior), assignment: prior.assignmentId ? clone(this.assignments.get(prior.assignmentId)!) : undefined } : { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, status: 'IDEMPOTENCY_CONFLICT', memory: this.getMemory(), failures: [fail('INVALID_SHAPE', 'Idempotency key reused with different semantics.')] };
      const v = validated?.status === 'VALID' && validated.plan.fingerprint === fingerprint ? validated : await this.validateSemanticOperation(r); if (v.status !== 'VALID') return { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, status: 'BLOCKED', memory: this.getMemory(), failures: v.failures };
      const plan = v.plan; if (plan.expectedPackageRevision !== undefined && (r.source.type !== 'WORK_PACKAGE' || this.packages.get(r.source.id)?.revision !== plan.expectedPackageRevision)) return { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, status: 'BLOCKED', memory: this.getMemory(), failures: [fail('STALE_PACKAGE_REVISION', 'Package changed after validation.')] };
      const fresh = await this.authority.recheckForCommit(plan.authorityRequest, plan.authorityRevision), personId = actor(fresh); if (!personId || !fresh.authorityRevision) return { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, status: 'BLOCKED', memory: this.getMemory(), failures: [authorityFailure(fresh)] };
      const mem = clone(this.memory), packages = new Map([...this.packages].map(([k, p]) => [k, clone(p)])), assignments = new Map([...this.assignments].map(([k, a]) => [k, clone(a)])); let assignment: NexusWorkPackageAssignment | undefined;
      try {
        for (const e of plan.effects) {
          if (e.type === 'CREATE_WORK_PACKAGE_ASSIGNMENT' && r.source.type === 'WORK_PACKAGE') { const p = packages.get(r.source.id)!; const snapshot: NexusAssignedWorkPackageSnapshot = { packageId: p.packageId, packageRevision: p.revision, projectId: p.projectId, worldId: p.worldId, title: p.title, description: p.description, groups: clone(p.groups), items: clone(p.items), checklistDefinitions: clone(p.checklistDefinitions), evidenceRequirements: clone(p.evidenceRequirements), deadline: p.deadline, objectContextIds: [...p.objectContextIds], locationContextIds: [...p.locationContextIds] }; assignment = { assignmentId: e.assignmentId, packageId: p.packageId, assignedPackageRevision: p.revision, recipient: clone(e.recipient), assignedByPersonId: personId, assignedAt: r.occurredAt, status: 'ASSIGNED', deadlineSnapshot: p.deadline, sourceSemanticOperationId: r.semanticOperationId, lifecycleState: 'ACTIVE', snapshot }; assignments.set(assignment.assignmentId, assignment); packages.set(p.packageId, { ...p, assignmentState: 'ASSIGNED' }); }
          if (e.type === 'PROJECT_TASK_ASSIGNMENT') { const t = mem.tasks.find((x) => x.id === e.taskId); if (!t) throw new Error('task missing'); t.assignedPersonIds = uniq([...t.assignedPersonIds, e.personId]); t.updatedAt = r.occurredAt; t.updatedBy = personId; }
          if (e.type === 'PROJECT_DOCUMENT_TASK_LINK') { const t = mem.tasks.find((x) => x.id === e.taskId); if (!t) throw new Error('task missing'); t.relatedFileIds = uniq([...(t.relatedFileIds ?? []), e.documentId]); }
          if (e.type === 'PROJECT_RELATIONSHIP_EDGE') { const edge: NexusRelationshipEdgeRecord = { id: e.edgeId, status: 'active', title: `${r.intent} relation`, createdAt: r.occurredAt, updatedAt: r.occurredAt, createdBy: personId, updatedBy: personId, sourceSystem: 'nexus', confidence: 'confirmed', sourceObjectId: e.sourceId, targetObjectId: e.targetId, relationshipType: e.relationshipType, direction: 'directed', projectScopeId: r.projectId, relationshipStatus: 'confirmed', relationshipConfidence: 'confirmed', relationshipSourceType: 'nexus', sourceReference: r.semanticOperationId, confirmedBy: personId, confirmedAt: r.occurredAt }; mem.relationshipEdges.push(edge); }
          if (e.type === 'COMPANION_PERMISSION_GRANT') { const g = (r.companionGrants ?? []).find((x) => x.grantId === e.grantId && x.intentId === e.intentId) as NexusCompanionCapabilityGrant | undefined; const ps = mem.projectParticipations.filter((x) => x.status === 'active' && x.participationStatus === 'active' && x.personId === e.targetPersonId && x.projectId === r.projectId && x.worldId === r.worldId); if (!g || ps.length !== 1) throw new Error('companion grant participation invalid'); const p = ps[0]!; if (mem.permissionGrants.some((existing) => existing.id === g.grantId)) throw new Error('companion grant already exists'); const grant: NexusPermissionGrantRecord = { id: g.grantId, status: 'active', title: `Companion grant ${g.intentId}`, createdAt: r.occurredAt, updatedAt: r.occurredAt, createdBy: personId, updatedBy: personId, sourceSystem: 'nexus', confidence: 'confirmed', participationId: p.id, effect: 'allow', moduleId: g.moduleId, actionKey: g.actionKey, objectScopeId: g.objectScopeId, dataScope: g.dataScope, reason: g.reason }; mem.permissionGrants.push(grant); p.permissionGrantIds = uniq([...p.permissionGrantIds, grant.id]); }
          if (e.type === 'PROJECT_MEMORY_EVENT') { const companionGrantIds = plan.effects.filter((effect): effect is Extract<NexusSemanticEffect, { type: 'COMPANION_PERMISSION_GRANT' }> => effect.type === 'COMPANION_PERMISSION_GRANT').map((effect) => effect.grantId); const event: NexusEventRecord = { id: e.eventId, status: 'active', title: `Semantic operation ${r.intent}`, createdAt: r.occurredAt, updatedAt: r.occurredAt, createdBy: personId, updatedBy: personId, sourceSystem: 'nexus', confidence: 'confirmed', eventType: 'NEXUS_SEMANTIC_OPERATION_COMMITTED', occurredAt: r.occurredAt, recordedAt: r.occurredAt, actorType: 'PERSON', actorId: personId, projectId: r.projectId, worldId: r.worldId, primaryObjectId: r.source.id, relatedObjectIds: uniq([r.source.id, r.target.id, ...(assignment ? [assignment.assignmentId] : []), ...companionGrantIds]), eventSourceType: 'NEXUS', sourceReference: r.semanticOperationId, eventState: 'COMMITTED', summary: `${r.intent} committed`, verificationState: 'VERIFIED_BY_SOURCE', correlationId: r.semanticOperationId }; const timeline: NexusTimelineEventRecord = { id: e.timelineEventId, status: 'active', title: `Semantic operation ${r.intent}`, createdAt: r.occurredAt, updatedAt: r.occurredAt, createdBy: personId, updatedBy: personId, sourceSystem: 'nexus', confidence: 'confirmed', projectId: r.projectId, worldId: r.worldId, eventType: r.intent === 'DOCUMENT_TO_TASK' ? 'file-linked' : r.intent === 'TASK_TO_PERSON' ? 'task-updated' : 'graph-link-created', eventAt: r.occurredAt, actorPersonId: personId, relatedRecordIds: uniq([r.source.id, r.target.id, e.eventId, ...companionGrantIds]), payload: { operation: r.intent, semanticOperationId: r.semanticOperationId, authorityRevision: fresh.authorityRevision, packageRevision: plan.expectedPackageRevision, companionGrantIds } }; mem.nexusEvents.push(event); mem.timelineEvents.push(timeline); }
        }
        await this.faults.beforeSemanticCommitSwap?.();
      } catch (error) { return { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, status: 'BLOCKED', memory: this.getMemory(), failures: [fail('INVALID_SHAPE', `Atomic semantic commit rolled back: ${error instanceof Error ? error.message : String(error)}`)] }; }
      const ev = plan.effects.find((e): e is Extract<NexusSemanticEffect, { type: 'PROJECT_MEMORY_EVENT' }> => e.type === 'PROJECT_MEMORY_EVENT')!; const receipt: NexusSemanticOperationReceipt = { semanticOperationId: r.semanticOperationId, fingerprint, intent: r.intent, actorPersonId: personId, projectId: r.projectId, worldId: r.worldId, authorityRevision: fresh.authorityRevision, committedAt: r.occurredAt, assignmentId: assignment?.assignmentId, eventId: ev.eventId, timelineEventId: ev.timelineEventId };
      this.memory = mem; this.packages.clear(); for (const [k, p] of packages) this.packages.set(k, p); this.assignments.clear(); for (const [k, a] of assignments) this.assignments.set(k, a); this.receipts.set(r.semanticOperationId, clone(receipt)); return { schema: NEXUS_SEMANTIC_OPERATION_SCHEMA, status: 'COMMITTED', memory: this.getMemory(), receipt: clone(receipt), assignment: assignment ? clone(assignment) : undefined };
    });
  }

  recordChecklistRun(input: { runId: string; assignmentId: string; taskId: string; workerPersonId: string; checklistId: string; responses: NexusChecklistRun['itemResponses']; occurredAt: string }): { status: 'APPLIED'; run: NexusChecklistRun } | { status: 'BLOCKED'; failures: NexusSemanticValidationFailure[] } {
    const a = this.assignments.get(input.assignmentId); if (!a || a.recipient.type !== 'PERSON' || a.recipient.personId !== input.workerPersonId || !a.snapshot.items.some((i) => i.taskId === input.taskId)) return { status: 'BLOCKED', failures: [fail('TARGET_NOT_FOUND', 'Checklist worker/task not in assigned snapshot.')] };
    const defs = a.snapshot.checklistDefinitions.filter((d) => d.checklistId === input.checklistId); if (defs.length !== 1) return { status: 'BLOCKED', failures: [fail('INVALID_SHAPE', 'Checklist snapshot is ambiguous.')] }; const d = defs[0]!, allowed = new Set(d.items.map((i) => i.itemId)); if (input.responses.some((r) => !allowed.has(r.itemId))) return { status: 'BLOCKED', failures: [fail('INVALID_SHAPE', 'Checklist response outside snapshot.')] }; const answered = new Set(input.responses.map((r) => r.itemId)), complete = d.items.filter((i) => i.required).every((i) => answered.has(i.itemId)), old = this.checklistRuns.get(input.runId); const run: NexusChecklistRun = { runId: input.runId, workPackageAssignmentId: a.assignmentId, taskId: input.taskId, workerPersonId: input.workerPersonId, checklistId: d.checklistId, checklistRevision: d.revision, itemResponses: clone(input.responses), startedAt: old?.startedAt ?? input.occurredAt, updatedAt: input.occurredAt, completedAt: complete ? input.occurredAt : undefined, completionState: !input.responses.length ? 'NOT_STARTED' : complete ? 'COMPLETE' : 'IN_PROGRESS' }; this.checklistRuns.set(run.runId, clone(run)); return { status: 'APPLIED', run: clone(run) };
  }
  evidenceRequirementsBeforeFinish(input: { assignmentId: string; taskId: string }): { allowed: boolean; missingRequirementIds: string[] } {
    const a = this.assignments.get(input.assignmentId); if (!a) return { allowed: false, missingRequirementIds: ['ASSIGNMENT_NOT_FOUND'] }; const required = a.snapshot.evidenceRequirements.filter((r) => r.requiredBeforeFinish && (!r.taskId || r.taskId === input.taskId)); const missing = required.filter((r) => this.memory.evidence.filter((e) => e.status === 'active' && e.projectId === a.snapshot.projectId && e.worldId === a.snapshot.worldId && e.linkedTaskId === input.taskId && e.evidenceType === r.allowedEvidenceType && e.evidenceStatus !== 'rejected' && e.evidenceStatus !== 'superseded').length < r.requiredCount).map((r) => r.requirementId); return { allowed: !missing.length, missingRequirementIds: missing };
  }
}

export const makeAllowedAuthorityEvaluation = (input: { request: NexusCanonicalAuthorityRequest; personId: string; authorityRevision: string }): NexusCanonicalAuthorityEvaluation => ({
  schema: NEXUS_CANONICAL_AUTHORITY_SCHEMA, status: 'ALLOWED', reasonCode: 'ALLOWED_BY_EXPLICIT_GRANT', allowed: true, failClosed: true, actionKey: input.request.actionKey,
  identity: { state: 'BOUND', reasonCode: 'IDENTITY_BOUND', personId: input.personId, bindingId: `binding:${input.personId}`, identityRevision: `identity:${input.authorityRevision}` },
  actor: { status: 'ALLOWED', reasonCode: 'ALLOWED_BY_EXPLICIT_GRANT', actorPersonId: input.personId, matchingGrantIds: [`grant:${input.personId}:${input.request.actionKey}`], authorityRevision: input.authorityRevision },
  target: input.request.targetPersonId ? { status: 'ALLOWED', reasonCode: 'TARGET_ELIGIBLE', targetPersonId: input.request.targetPersonId, authorityRevision: input.authorityRevision } : undefined,
  authorityRevision: input.authorityRevision,
});