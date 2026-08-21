import type { NexusId } from './schemas/common.schema';
import type { NexusProjectMemorySnapshot } from './projectMemory';
import type { NexusInvariantIssue, NexusInvariantReport } from './projectMemoryInvariants';

const report = (issues: NexusInvariantIssue[]): NexusInvariantReport => {
  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  return {
    ok: errorCount === 0,
    issues,
    errorCount,
    warningCount: issues.length - errorCount,
  };
};

const baseIds = (memory: NexusProjectMemorySnapshot): Set<NexusId> =>
  new Set<NexusId>([
    ...memory.projects.map((record) => record.id),
    ...memory.worlds.map((record) => record.id),
    ...memory.companies.map((record) => record.id),
    ...memory.people.map((record) => record.id),
    ...memory.projectRoles.map((record) => record.id),
    ...memory.files.map((record) => record.id),
    ...memory.drawingReferences.map((record) => record.id),
    ...memory.tasks.map((record) => record.id),
    ...memory.assets.map((record) => record.id),
    ...memory.evidence.map((record) => record.id),
    ...memory.approvals.map((record) => record.id),
    ...memory.timelineEvents.map((record) => record.id),
    ...memory.canonicalObjects.map((record) => record.id),
    ...memory.relationshipEdges.map((record) => record.id),
    ...memory.externalReferences.map((record) => record.id),
    ...memory.nexusEvents.map((record) => record.id),
    ...memory.fieldChanges.map((record) => record.id),
    ...memory.humanDecisions.map((record) => record.id),
    ...memory.connectorDefinitions.map((record) => record.id),
    ...memory.connectorAccounts.map((record) => record.id),
    ...memory.connectorObjectMappings.map((record) => record.id),
    ...memory.projectParticipations.map((record) => record.id),
    ...memory.roleAssignments.map((record) => record.id),
    ...memory.tradeAssignments.map((record) => record.id),
    ...memory.permissionGrants.map((record) => record.id),
    ...memory.moduleEntitlements.map((record) => record.id),
    ...memory.managerTradeContexts.map((record) => record.id),
    ...memory.accessDecisions.map((record) => record.id),
  ]);

/**
 * Storage records are part of Project Memory but do not implement NexusBaseRecord.
 * Validate their global IDs, object references and project/world scope separately.
 */
export const validateProjectMemoryStorage = (
  memory: NexusProjectMemorySnapshot,
): NexusInvariantReport => {
  const issues: NexusInvariantIssue[] = [];
  const occupiedIds = baseIds(memory);
  const seenStorageIds = new Set<NexusId>();
  const projectIds = new Set(memory.projects.map((record) => record.id));
  const canonicalIds = new Set(memory.canonicalObjects.map((record) => record.id));

  for (const storage of memory.storageRecords) {
    if (occupiedIds.has(storage.id) || seenStorageIds.has(storage.id)) {
      issues.push({
        severity: 'error',
        code: 'DUPLICATE_RECORD_ID',
        recordId: storage.id,
        message: `Storage record ${storage.id} collides with an existing Project Memory record ID.`,
      });
    }
    seenStorageIds.add(storage.id);

    if (!canonicalIds.has(storage.objectId)) {
      issues.push({
        severity: 'error',
        code: 'MISSING_REFERENCE',
        recordId: storage.id,
        relatedId: storage.objectId,
        message: `Storage record ${storage.id} references missing canonical object ${storage.objectId}.`,
      });
    }

    if (storage.scope === 'nexus-cloud') {
      const world = memory.worlds.find((candidate) => candidate.id === storage.worldId);
      if (!projectIds.has(storage.projectId)) {
        issues.push({
          severity: 'error',
          code: 'MISSING_REFERENCE',
          recordId: storage.id,
          relatedId: storage.projectId,
          message: `Nexus Cloud storage record ${storage.id} references missing project.`,
        });
      }
      if (!world) {
        issues.push({
          severity: 'error',
          code: 'MISSING_REFERENCE',
          recordId: storage.id,
          relatedId: storage.worldId,
          message: `Nexus Cloud storage record ${storage.id} references missing world.`,
        });
      } else if (world.projectId !== storage.projectId) {
        issues.push({
          severity: 'error',
          code: 'PROJECT_WORLD_MISMATCH',
          recordId: storage.id,
          relatedId: storage.worldId,
          message: `Nexus Cloud storage record ${storage.id} crosses project/world boundaries.`,
        });
      }
      if (!storage.storageObjectKey.trim()) {
        issues.push({
          severity: 'error',
          code: 'MISSING_REFERENCE',
          recordId: storage.id,
          message: `Nexus Cloud storage record ${storage.id} has no provider storage object key.`,
        });
      }
      if (!storage.storageConnectorId?.trim()) {
        issues.push({
          severity: 'error',
          code: 'MISSING_REFERENCE',
          recordId: storage.id,
          message: `Nexus Cloud storage record ${storage.id} has no real storage connector ID.`,
        });
      }
    }

    if (storage.scope === 'external-reference') {
      if (!storage.sourceConnectorId.trim()) {
        issues.push({
          severity: 'error',
          code: 'MISSING_REFERENCE',
          recordId: storage.id,
          message: `External-reference storage record ${storage.id} has no source connector ID.`,
        });
      }
      if ((storage.projectId && !storage.worldId) || (!storage.projectId && storage.worldId)) {
        issues.push({
          severity: 'error',
          code: 'PROJECT_WORLD_MISMATCH',
          recordId: storage.id,
          message: `External-reference storage record ${storage.id} must scope projectId/worldId together when project-scoped.`,
        });
      }
      if (storage.projectId && storage.worldId) {
        const world = memory.worlds.find((candidate) => candidate.id === storage.worldId);
        if (!projectIds.has(storage.projectId) || !world || world.projectId !== storage.projectId) {
          issues.push({
            severity: 'error',
            code: 'PROJECT_WORLD_MISMATCH',
            recordId: storage.id,
            relatedId: storage.worldId,
            message: `External-reference storage record ${storage.id} has invalid project/world scope.`,
          });
        }
      }
    }
  }

  return report(issues);
};
