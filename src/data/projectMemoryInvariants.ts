import type { NexusBaseRecord, NexusId } from './schemas/common.schema';
import type { NexusProjectMemorySnapshot } from './projectMemory';
import type { NexusProjectMemoryAction } from './projectMemoryActions';
import { PROJECT_MEMORY_ACTION_POLICY } from './projectMemoryActions';

export type NexusInvariantSeverity = 'error' | 'warning';

export type NexusInvariantCode =
  | 'DUPLICATE_RECORD_ID'
  | 'MISSING_REFERENCE'
  | 'PROJECT_WORLD_MISMATCH'
  | 'GRAPH_WORLD_MISMATCH'
  | 'FORBIDDEN_WORLD'
  | 'PROVENANCE_SOURCE_MISSING'
  | 'PROVENANCE_INVALID'
  | 'ACCESS_FAIL_CLOSED_VIOLATION'
  | 'ACCESS_ALLOW_WITHOUT_GRANT'
  | 'ACCESS_ALLOW_WITH_DENY'
  | 'TEMPORAL_REFERENCE_MISSING'
  | 'TEMPORAL_STATE_CONFLICT'
  | 'TEMPORAL_FUTURE_EVENT'
  | 'ACTION_POLICY_DRIFT';

export interface NexusInvariantIssue {
  severity: NexusInvariantSeverity;
  code: NexusInvariantCode;
  message: string;
  recordId?: NexusId;
  relatedId?: NexusId;
}

export interface NexusInvariantReport {
  ok: boolean;
  issues: NexusInvariantIssue[];
  errorCount: number;
  warningCount: number;
}

export interface NexusProjectMemoryInvariantOptions {
  allowedWorldIds?: NexusId[];
  forbiddenWorldTokens?: string[];
}

const finishReport = (issues: NexusInvariantIssue[]): NexusInvariantReport => {
  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  return { ok: errorCount === 0, issues, errorCount, warningCount: issues.length - errorCount };
};

const isAtOrBefore = (value: string, selectedAt: string): boolean =>
  Date.parse(value) <= Date.parse(selectedAt);

const isActiveAt = (selectedAt: string, validFrom?: string, validTo?: string): boolean =>
  (!validFrom || isAtOrBefore(validFrom, selectedAt)) &&
  (!validTo || isAtOrBefore(selectedAt, validTo));

const baseRecords = (memory: NexusProjectMemorySnapshot): NexusBaseRecord[] => [
  ...memory.projects,
  ...memory.worlds,
  ...memory.companies,
  ...memory.people,
  ...memory.projectRoles,
  ...memory.files,
  ...memory.drawingReferences,
  ...memory.tasks,
  ...memory.assets,
  ...memory.evidence,
  ...memory.approvals,
  ...memory.timelineEvents,
  ...memory.canonicalObjects,
  ...memory.relationshipEdges,
  ...memory.externalReferences,
  ...memory.nexusEvents,
  ...memory.fieldChanges,
  ...memory.humanDecisions,
  ...memory.connectorDefinitions,
  ...memory.connectorAccounts,
  ...memory.connectorObjectMappings,
  ...memory.projectParticipations,
  ...memory.roleAssignments,
  ...memory.tradeAssignments,
  ...memory.permissionGrants,
  ...memory.moduleEntitlements,
  ...memory.managerTradeContexts,
  ...memory.accessDecisions,
];

export const validateProjectMemoryAction = (action: NexusProjectMemoryAction): NexusInvariantReport => {
  const issues: NexusInvariantIssue[] = [];
  const expected = PROJECT_MEMORY_ACTION_POLICY[action.type];

  if (action.requiresAccessDecision !== expected.requiresAccessDecision) {
    issues.push({
      severity: 'error',
      code: 'ACTION_POLICY_DRIFT',
      recordId: action.type,
      message: `${action.type} requiresAccessDecision does not match the canonical action policy.`,
    });
  }

  if (action.writesAuditEvent !== expected.writesAuditEvent) {
    issues.push({
      severity: 'error',
      code: 'ACTION_POLICY_DRIFT',
      recordId: action.type,
      message: `${action.type} writesAuditEvent does not match the canonical action policy.`,
    });
  }

  if (Boolean(action.blockedByDefault) !== Boolean(expected.blockedByDefault)) {
    issues.push({
      severity: 'error',
      code: 'ACTION_POLICY_DRIFT',
      recordId: action.type,
      message: `${action.type} blockedByDefault does not match the canonical action policy.`,
    });
  }

  return finishReport(issues);
};

export const validateProjectMemorySnapshot = (
  memory: NexusProjectMemorySnapshot,
  options: NexusProjectMemoryInvariantOptions = {},
): NexusInvariantReport => {
  const issues: NexusInvariantIssue[] = [];
  const projectIds = new Set(memory.projects.map((record) => record.id));
  const worldIds = new Set(memory.worlds.map((record) => record.id));
  const peopleIds = new Set(memory.people.map((record) => record.id));
  const companyIds = new Set(memory.companies.map((record) => record.id));
  const fileIds = new Set(memory.files.map((record) => record.id));
  const drawingIds = new Set(memory.drawingReferences.map((record) => record.id));
  const taskIds = new Set(memory.tasks.map((record) => record.id));
  const evidenceIds = new Set(memory.evidence.map((record) => record.id));
  const canonicalIds = new Set(memory.canonicalObjects.map((record) => record.id));
  const graphNodeIds = new Set(memory.graphNodes.map((record) => record.id));
  const temporalObjectIds = new Set(memory.temporalRecords.map((record) => record.objectId));

  const rawRecordIds = new Set<NexusId>([
    ...projectIds,
    ...worldIds,
    ...peopleIds,
    ...companyIds,
    ...fileIds,
    ...drawingIds,
    ...taskIds,
    ...evidenceIds,
    ...memory.projectRoles.map((record) => record.id),
    ...memory.assets.map((record) => record.id),
    ...memory.approvals.map((record) => record.id),
    ...memory.timelineEvents.map((record) => record.id),
  ]);
  const knownObjectIds = new Set<NexusId>([...rawRecordIds, ...canonicalIds]);

  const missing = (recordId: NexusId, relatedId: NexusId, message: string): void => {
    issues.push({ severity: 'error', code: 'MISSING_REFERENCE', recordId, relatedId, message });
  };

  const seenIds = new Set<NexusId>();
  for (const record of baseRecords(memory)) {
    if (seenIds.has(record.id)) {
      issues.push({ severity: 'error', code: 'DUPLICATE_RECORD_ID', recordId: record.id, message: `Duplicate base-record id ${record.id}.` });
    }
    seenIds.add(record.id);

    if (record.provenanceClass === 'REAL') {
      if (!record.sourceRecordId && !record.sourceUrl) {
        issues.push({ severity: 'error', code: 'PROVENANCE_SOURCE_MISSING', recordId: record.id, message: `REAL record ${record.id} has no source reference.` });
      }
      if (record.sourceSystem === 'nexus' || record.sourceSystem === 'manual' || record.confidence === 'unknown') {
        issues.push({ severity: 'error', code: 'PROVENANCE_INVALID', recordId: record.id, message: `REAL record ${record.id} has invalid source/confidence metadata.` });
      }
    }

    if (record.provenanceClass === 'UNKNOWN' && record.confidence !== 'unknown') {
      issues.push({ severity: 'error', code: 'PROVENANCE_INVALID', recordId: record.id, message: `UNKNOWN record ${record.id} must retain unknown confidence.` });
    }

    if (record.provenanceClass === 'SYNTHETIC_DEMO' && record.sourceSystem !== 'nexus') {
      issues.push({ severity: 'error', code: 'PROVENANCE_INVALID', recordId: record.id, message: `SYNTHETIC_DEMO record ${record.id} must be Nexus-authored.` });
    }
  }

  for (const project of memory.projects) {
    for (const worldId of project.worldIds) {
      const world = memory.worlds.find((candidate) => candidate.id === worldId);
      if (!world) missing(project.id, worldId, `Project ${project.id} references missing world ${worldId}.`);
      else if (world.projectId !== project.id) issues.push({ severity: 'error', code: 'PROJECT_WORLD_MISMATCH', recordId: project.id, relatedId: worldId, message: `World ${worldId} belongs to another project.` });
    }
  }

  for (const world of memory.worlds) {
    if (!projectIds.has(world.projectId)) missing(world.id, world.projectId, `World ${world.id} references missing project ${world.projectId}.`);
  }

  const scopedRecords = [
    ...memory.files,
    ...memory.drawingReferences,
    ...memory.tasks,
    ...memory.assets,
    ...memory.evidence,
    ...memory.approvals,
    ...memory.timelineEvents,
    ...memory.projectParticipations,
    ...memory.managerTradeContexts,
    ...memory.accessDecisions,
  ] as Array<{ id: NexusId; projectId: NexusId; worldId: NexusId }>;

  for (const record of scopedRecords) {
    const world = memory.worlds.find((candidate) => candidate.id === record.worldId);
    if (!projectIds.has(record.projectId)) missing(record.id, record.projectId, `${record.id} references missing project ${record.projectId}.`);
    if (!world) missing(record.id, record.worldId, `${record.id} references missing world ${record.worldId}.`);
    else if (world.projectId !== record.projectId) issues.push({ severity: 'error', code: 'PROJECT_WORLD_MISMATCH', recordId: record.id, relatedId: record.worldId, message: `${record.id} crosses project/world boundaries.` });
  }

  for (const drawing of memory.drawingReferences) if (!fileIds.has(drawing.fileId)) missing(drawing.id, drawing.fileId, `Drawing ${drawing.id} references missing file ${drawing.fileId}.`);

  for (const task of memory.tasks) {
    for (const personId of task.assignedPersonIds) if (!peopleIds.has(personId)) missing(task.id, personId, `Task ${task.id} references missing person ${personId}.`);
    for (const fileId of task.relatedFileIds ?? []) if (!fileIds.has(fileId)) missing(task.id, fileId, `Task ${task.id} references missing file ${fileId}.`);
    for (const relatedEvidenceId of task.relatedEvidenceIds ?? []) if (!evidenceIds.has(relatedEvidenceId)) missing(task.id, relatedEvidenceId, `Task ${task.id} references missing evidence ${relatedEvidenceId}.`);
    if (task.companyId && !companyIds.has(task.companyId)) missing(task.id, task.companyId, `Task ${task.id} references missing company ${task.companyId}.`);
  }

  for (const evidence of memory.evidence) {
    if (evidence.linkedFileId && !fileIds.has(evidence.linkedFileId)) missing(evidence.id, evidence.linkedFileId, `Evidence ${evidence.id} references missing file ${evidence.linkedFileId}.`);
    if (evidence.linkedTaskId && !taskIds.has(evidence.linkedTaskId)) missing(evidence.id, evidence.linkedTaskId, `Evidence ${evidence.id} references missing task ${evidence.linkedTaskId}.`);
    if (evidence.linkedPersonId && !peopleIds.has(evidence.linkedPersonId)) missing(evidence.id, evidence.linkedPersonId, `Evidence ${evidence.id} references missing person ${evidence.linkedPersonId}.`);
  }

  for (const node of memory.graphNodes) {
    if (!knownObjectIds.has(node.recordId)) missing(node.id, node.recordId, `Graph node ${node.id} references missing record ${node.recordId}.`);
    if (!worldIds.has(node.worldId)) missing(node.id, node.worldId, `Graph node ${node.id} references missing world ${node.worldId}.`);
  }

  for (const edge of memory.graphEdges) {
    const from = memory.graphNodes.find((node) => node.id === edge.fromNodeId);
    const to = memory.graphNodes.find((node) => node.id === edge.toNodeId);
    if (!graphNodeIds.has(edge.fromNodeId)) missing(edge.id, edge.fromNodeId, `Graph edge ${edge.id} has missing from-node.`);
    if (!graphNodeIds.has(edge.toNodeId)) missing(edge.id, edge.toNodeId, `Graph edge ${edge.id} has missing to-node.`);
    if ((from && from.worldId !== edge.worldId) || (to && to.worldId !== edge.worldId)) issues.push({ severity: 'error', code: 'GRAPH_WORLD_MISMATCH', recordId: edge.id, relatedId: edge.worldId, message: `Graph edge ${edge.id} crosses its declared world boundary.` });
  }

  const externalReferenceIds = new Set(memory.externalReferences.map((record) => record.id));
  for (const object of memory.canonicalObjects) {
    if (object.projectId && !projectIds.has(object.projectId)) missing(object.id, object.projectId, `Canonical object ${object.id} references missing project.`);
    if (object.worldId && !worldIds.has(object.worldId)) missing(object.id, object.worldId, `Canonical object ${object.id} references missing world.`);
    for (const referenceId of object.externalReferenceIds) if (!externalReferenceIds.has(referenceId)) missing(object.id, referenceId, `Canonical object ${object.id} references missing external reference.`);
  }

  for (const reference of memory.externalReferences) if (!canonicalIds.has(reference.nexusObjectId)) missing(reference.id, reference.nexusObjectId, `External reference ${reference.id} targets missing canonical object.`);
  for (const edge of memory.relationshipEdges) {
    if (!canonicalIds.has(edge.sourceObjectId)) missing(edge.id, edge.sourceObjectId, `Relationship ${edge.id} has missing source object.`);
    if (!canonicalIds.has(edge.targetObjectId)) missing(edge.id, edge.targetObjectId, `Relationship ${edge.id} has missing target object.`);
  }

  const participationIds = new Set(memory.projectParticipations.map((record) => record.id));
  const roleIds = new Set(memory.roleAssignments.map((record) => record.id));
  const tradeIds = new Set(memory.tradeAssignments.map((record) => record.id));
  const permissionIds = new Set(memory.permissionGrants.map((record) => record.id));
  const managerContextIds = new Set(memory.managerTradeContexts.map((record) => record.id));

  for (const participation of memory.projectParticipations) {
    if (!peopleIds.has(participation.personId)) missing(participation.id, participation.personId, `Participation ${participation.id} references missing person.`);
    for (const id of participation.roleAssignmentIds) if (!roleIds.has(id)) missing(participation.id, id, `Participation ${participation.id} references missing role assignment.`);
    for (const id of participation.tradeAssignmentIds) if (!tradeIds.has(id)) missing(participation.id, id, `Participation ${participation.id} references missing trade assignment.`);
    for (const id of participation.permissionGrantIds) if (!permissionIds.has(id)) missing(participation.id, id, `Participation ${participation.id} references missing permission grant.`);
  }

  for (const role of memory.roleAssignments) if (!participationIds.has(role.participationId)) missing(role.id, role.participationId, `Role assignment ${role.id} references missing participation.`);
  for (const trade of memory.tradeAssignments) if (!participationIds.has(trade.participationId)) missing(trade.id, trade.participationId, `Trade assignment ${trade.id} references missing participation.`);
  for (const grant of memory.permissionGrants) if (!participationIds.has(grant.participationId)) missing(grant.id, grant.participationId, `Permission grant ${grant.id} references missing participation.`);

  for (const context of memory.managerTradeContexts) {
    const participation = memory.projectParticipations.find((candidate) => candidate.id === context.participationId);
    if (!participation) missing(context.id, context.participationId, `Manager trade context ${context.id} references missing participation.`);
    else if (participation.personId !== context.personId || participation.projectId !== context.projectId || participation.worldId !== context.worldId) issues.push({ severity: 'error', code: 'ACCESS_FAIL_CLOSED_VIOLATION', recordId: context.id, relatedId: context.participationId, message: `Manager trade context ${context.id} does not match its participation scope.` });
  }

  const matchingGrant = (decision: NexusProjectMemorySnapshot['accessDecisions'][number], effect: 'allow' | 'deny') =>
    memory.permissionGrants.find((grant) =>
      grant.participationId === decision.participationId &&
      grant.effect === effect &&
      (!grant.moduleId || grant.moduleId === decision.moduleId) &&
      (!grant.actionKey || grant.actionKey === decision.actionKey) &&
      (!grant.objectScopeId || grant.objectScopeId === decision.objectScopeId));

  for (const decision of memory.accessDecisions) {
    if (decision.reason === 'identity-unresolved' && (decision.result !== 'denied' || decision.personId)) issues.push({ severity: 'error', code: 'ACCESS_FAIL_CLOSED_VIOLATION', recordId: decision.id, message: `Identity-unresolved decision ${decision.id} must fail closed.` });
    if (decision.managerTradeContextId && !managerContextIds.has(decision.managerTradeContextId)) missing(decision.id, decision.managerTradeContextId, `Access decision ${decision.id} references missing manager trade context.`);

    if (decision.result === 'allowed') {
      const participation = decision.participationId ? memory.projectParticipations.find((candidate) => candidate.id === decision.participationId) : undefined;
      if (!decision.personId || !participation || participation.participationStatus !== 'active') issues.push({ severity: 'error', code: 'ACCESS_FAIL_CLOSED_VIOLATION', recordId: decision.id, message: `Allowed decision ${decision.id} requires resolved identity and active participation.` });
      if (!matchingGrant(decision, 'allow')) issues.push({ severity: 'error', code: 'ACCESS_ALLOW_WITHOUT_GRANT', recordId: decision.id, message: `Allowed decision ${decision.id} has no matching explicit allow grant.` });
      if (matchingGrant(decision, 'deny')) issues.push({ severity: 'error', code: 'ACCESS_ALLOW_WITH_DENY', recordId: decision.id, message: `Allowed decision ${decision.id} conflicts with an explicit deny grant.` });
    }
  }

  for (const temporal of memory.temporalRecords) {
    if (!knownObjectIds.has(temporal.objectId)) issues.push({ severity: 'error', code: 'TEMPORAL_REFERENCE_MISSING', recordId: temporal.objectId, message: `Temporal record references missing object ${temporal.objectId}.` });
    if (temporal.supersedesObjectId && !knownObjectIds.has(temporal.supersedesObjectId)) issues.push({ severity: 'error', code: 'TEMPORAL_REFERENCE_MISSING', recordId: temporal.objectId, relatedId: temporal.supersedesObjectId, message: `Temporal record supersedes missing object.` });
    if (temporal.temporalProvenance === 'UNKNOWN' && temporal.verificationState !== 'UNKNOWN') issues.push({ severity: 'error', code: 'PROVENANCE_INVALID', recordId: temporal.objectId, message: `UNKNOWN temporal record ${temporal.objectId} cannot be verified.` });
  }

  for (const resolution of memory.temporalStateResolutions) {
    const selectedAt = resolution.context.selectedAt;
    const visible = new Set<NexusId>(resolution.visibleObjectIds);
    const hidden = new Set<NexusId>(resolution.hiddenObjectIds);
    const uncertain = new Set<NexusId>(resolution.uncertainObjectIds);

    for (const id of [...visible, ...hidden, ...uncertain]) if (!knownObjectIds.has(id)) issues.push({ severity: 'error', code: 'TEMPORAL_REFERENCE_MISSING', recordId: id, message: `AS_OF resolution references missing object ${id}.` });

    for (const id of visible) {
      if (hidden.has(id) || uncertain.has(id)) issues.push({ severity: 'error', code: 'TEMPORAL_STATE_CONFLICT', recordId: id, message: `AS_OF object ${id} appears in conflicting state buckets.` });
      const records = memory.temporalRecords.filter((record) => record.objectId === id);
      if (records.length > 0 && !records.some((record) => isActiveAt(selectedAt, record.validFrom, record.validTo))) issues.push({ severity: 'error', code: 'TEMPORAL_STATE_CONFLICT', recordId: id, message: `Visible AS_OF object ${id} is not active at ${selectedAt}.` });
    }

    for (const id of hidden) if (uncertain.has(id)) issues.push({ severity: 'error', code: 'TEMPORAL_STATE_CONFLICT', recordId: id, message: `AS_OF object ${id} is both hidden and uncertain.` });

    for (const eventId of resolution.activeEventIds) {
      const event = memory.nexusEvents.find((candidate) => candidate.id === eventId);
      if (!event) issues.push({ severity: 'error', code: 'TEMPORAL_REFERENCE_MISSING', recordId: eventId, message: `AS_OF resolution references missing event ${eventId}.` });
      else if (!isAtOrBefore(event.occurredAt, selectedAt)) issues.push({ severity: 'error', code: 'TEMPORAL_FUTURE_EVENT', recordId: eventId, message: `Future event ${eventId} leaks into AS_OF ${selectedAt}.` });
    }

    for (const revisionId of resolution.activeRevisionIds) if (!temporalObjectIds.has(revisionId)) issues.push({ severity: 'error', code: 'TEMPORAL_REFERENCE_MISSING', recordId: revisionId, message: `AS_OF resolution references missing active revision ${revisionId}.` });
  }

  if (options.allowedWorldIds) {
    const allowed = new Set(options.allowedWorldIds);
    for (const world of memory.worlds) if (!allowed.has(world.id)) issues.push({ severity: 'error', code: 'FORBIDDEN_WORLD', recordId: world.id, message: `World ${world.id} is outside the permitted fixture set.` });
  }

  if (options.forbiddenWorldTokens?.length) {
    const forbidden = options.forbiddenWorldTokens.map((token) => token.toLowerCase());
    for (const record of [...memory.projects, ...memory.worlds]) {
      const searchable = `${record.id} ${record.title} ${'projectCode' in record ? record.projectCode : ''} ${'worldCode' in record ? record.worldCode : ''}`.toLowerCase();
      if (forbidden.some((token) => searchable.includes(token))) issues.push({ severity: 'error', code: 'FORBIDDEN_WORLD', recordId: record.id, message: `${record.id} contains a founder-locked inactive demo token.` });
    }
  }

  return finishReport(issues);
};

export const validateEsafeCataniaMemory = (memory: NexusProjectMemorySnapshot): NexusInvariantReport =>
  validateProjectMemorySnapshot(memory, {
    allowedWorldIds: ['world-esafe-catania'],
    forbiddenWorldTokens: ['riverside', 'halifax'],
  });

export const assertEsafeCataniaMemory = (memory: NexusProjectMemorySnapshot): void => {
  const report = validateEsafeCataniaMemory(memory);
  if (!report.ok) throw new Error(report.issues.map((issue) => `[${issue.code}] ${issue.message}`).join('\n'));
};
