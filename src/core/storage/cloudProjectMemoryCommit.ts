import type { NexusAccessDecisionRecord } from '../../data/schemas/access.schema';
import type { NexusId } from '../../data/schemas/common.schema';
import type { NexusProjectMemorySnapshot } from '../../data/projectMemory';
import {
  validateProjectMemoryAction,
  validateProjectMemorySnapshot,
  type NexusInvariantReport,
} from '../../data/projectMemoryInvariants';
import { validateProjectMemoryStorage } from '../../data/projectMemoryStorageInvariants';
import type { NexusCloudPersistenceProposal } from './cloudPersistenceContract';
import {
  NEXUS_CLOUD_MODULE_ID,
  NEXUS_CLOUD_WRITE_ACTION_KEY,
} from './cloudPersistenceContract';

export type NexusCloudCommitReason =
  | 'COMMITTED'
  | 'ALREADY_COMMITTED'
  | 'ACCESS_DECISION_MISSING'
  | 'ACCESS_DECISION_NOT_ALLOWED'
  | 'ACCESS_DECISION_SCOPE_MISMATCH'
  | 'ACTION_POLICY_INVALID'
  | 'PROJECT_NOT_FOUND'
  | 'WORLD_NOT_FOUND'
  | 'PROPOSAL_SCOPE_MISMATCH'
  | 'PROVIDER_OBJECT_ALREADY_LINKED'
  | 'PARTIAL_STATE_CONFLICT'
  | 'IDENTITY_CONFLICT'
  | 'POST_COMMIT_INVARIANT_FAILURE';

export interface NexusCloudCommitResult {
  committed: boolean;
  idempotentReplay: boolean;
  reason: NexusCloudCommitReason;
  idempotencyKey: string;
  memory: NexusProjectMemorySnapshot;
  invariantReport?: NexusInvariantReport;
}

const rejected = (
  memory: NexusProjectMemorySnapshot,
  proposal: NexusCloudPersistenceProposal,
  reason: NexusCloudCommitReason,
  invariantReport?: NexusInvariantReport,
): NexusCloudCommitResult => ({
  committed: false,
  idempotentReplay: false,
  reason,
  idempotencyKey: proposal.idempotencyKey,
  memory,
  invariantReport,
});

const accessMatchesProposal = (
  access: NexusAccessDecisionRecord,
  proposal: NexusCloudPersistenceProposal,
): NexusCloudCommitReason | null => {
  if (access.result !== 'allowed' || !access.personId) return 'ACCESS_DECISION_NOT_ALLOWED';
  if (
    access.id !== proposal.accessDecisionId ||
    access.projectId !== proposal.fileRecord.projectId ||
    access.worldId !== proposal.fileRecord.worldId ||
    access.moduleId !== NEXUS_CLOUD_MODULE_ID ||
    access.actionKey !== NEXUS_CLOUD_WRITE_ACTION_KEY
  ) {
    return 'ACCESS_DECISION_SCOPE_MISMATCH';
  }
  return null;
};

const proposalHasSingleScope = (proposal: NexusCloudPersistenceProposal): boolean => {
  const projectId = proposal.fileRecord.projectId;
  const worldId = proposal.fileRecord.worldId;
  return (
    proposal.canonicalFileObject.projectId === projectId &&
    proposal.canonicalFileObject.worldId === worldId &&
    proposal.storageRecord.projectId === projectId &&
    proposal.storageRecord.worldId === worldId &&
    proposal.auditEvent.projectId === projectId &&
    proposal.auditEvent.worldId === worldId &&
    proposal.externalReference.nexusObjectId === proposal.canonicalFileObject.id &&
    proposal.storageRecord.objectId === proposal.canonicalFileObject.id
  );
};

const fileIdentityMatches = (
  existing: NexusProjectMemorySnapshot['files'][number],
  proposal: NexusCloudPersistenceProposal,
): boolean =>
  existing.id === proposal.fileRecord.id &&
  existing.projectId === proposal.fileRecord.projectId &&
  existing.worldId === proposal.fileRecord.worldId &&
  existing.storageConnectorId === proposal.fileRecord.storageConnectorId &&
  existing.storagePath === proposal.fileRecord.storagePath &&
  existing.sourceRecordId === proposal.fileRecord.sourceRecordId;

const canonicalIdentityMatches = (
  existing: NexusProjectMemorySnapshot['canonicalObjects'][number],
  proposal: NexusCloudPersistenceProposal,
): boolean =>
  existing.id === proposal.canonicalFileObject.id &&
  existing.objectType === 'File' &&
  existing.projectId === proposal.canonicalFileObject.projectId &&
  existing.worldId === proposal.canonicalFileObject.worldId &&
  existing.sourceRecordId === proposal.canonicalFileObject.sourceRecordId;

const externalIdentityMatches = (
  existing: NexusProjectMemorySnapshot['externalReferences'][number],
  proposal: NexusCloudPersistenceProposal,
): boolean =>
  existing.id === proposal.externalReference.id &&
  existing.nexusObjectId === proposal.externalReference.nexusObjectId &&
  existing.provider === proposal.externalReference.provider &&
  existing.externalObjectId === proposal.externalReference.externalObjectId;

const storageIdentityMatches = (
  existing: NexusProjectMemorySnapshot['storageRecords'][number],
  proposal: NexusCloudPersistenceProposal,
): boolean =>
  existing.id === proposal.storageRecord.id &&
  existing.scope === 'nexus-cloud' &&
  existing.objectId === proposal.storageRecord.objectId &&
  existing.projectId === proposal.storageRecord.projectId &&
  existing.worldId === proposal.storageRecord.worldId &&
  existing.storageObjectKey === proposal.storageRecord.storageObjectKey &&
  existing.storageConnectorId === proposal.storageRecord.storageConnectorId;

const eventIdentityMatches = (
  existing: NexusProjectMemorySnapshot['nexusEvents'][number],
  proposal: NexusCloudPersistenceProposal,
): boolean =>
  existing.id === proposal.auditEvent.id &&
  existing.eventType === proposal.auditEvent.eventType &&
  existing.projectId === proposal.auditEvent.projectId &&
  existing.worldId === proposal.auditEvent.worldId &&
  existing.primaryObjectId === proposal.auditEvent.primaryObjectId &&
  existing.externalEventId === proposal.auditEvent.externalEventId;

const mergeReports = (
  primary: NexusInvariantReport,
  storage: NexusInvariantReport,
): NexusInvariantReport => ({
  ok: primary.ok && storage.ok,
  issues: [...primary.issues, ...storage.issues],
  errorCount: primary.errorCount + storage.errorCount,
  warningCount: primary.warningCount + storage.warningCount,
});

/**
 * Apply one Phase 16 Cloud persistence proposal to an immutable Project Memory snapshot.
 *
 * This is an in-memory transaction boundary, not a database transaction. It proves the
 * required atomic/idempotent semantics before a persistence adapter is selected:
 * - either all canonical records are added together;
 * - a complete retry is a no-op;
 * - partial prior state fails closed;
 * - conflicting identity fails closed;
 * - final Project Memory invariants must pass before the new snapshot is returned.
 */
export const commitNexusCloudPersistenceProposal = (
  memory: NexusProjectMemorySnapshot,
  proposal: NexusCloudPersistenceProposal,
): NexusCloudCommitResult => {
  const projectId = proposal.fileRecord.projectId;
  const worldId = proposal.fileRecord.worldId;

  const project = memory.projects.find((record) => record.id === projectId);
  if (!project) return rejected(memory, proposal, 'PROJECT_NOT_FOUND');

  const world = memory.worlds.find((record) => record.id === worldId);
  if (!world) return rejected(memory, proposal, 'WORLD_NOT_FOUND');

  if (world.projectId !== projectId || !project.worldIds.includes(worldId) || !proposalHasSingleScope(proposal)) {
    return rejected(memory, proposal, 'PROPOSAL_SCOPE_MISMATCH');
  }

  const access = memory.accessDecisions.find((record) => record.id === proposal.accessDecisionId);
  if (!access) return rejected(memory, proposal, 'ACCESS_DECISION_MISSING');

  const accessProblem = accessMatchesProposal(access, proposal);
  if (accessProblem) return rejected(memory, proposal, accessProblem);

  const actionReport = validateProjectMemoryAction(proposal.projectMemoryAction);
  if (!actionReport.ok) return rejected(memory, proposal, 'ACTION_POLICY_INVALID', actionReport);

  const existingFile = memory.files.find((record) => record.id === proposal.fileRecord.id);
  const existingCanonical = memory.canonicalObjects.find((record) => record.id === proposal.canonicalFileObject.id);
  const existingExternal = memory.externalReferences.find((record) => record.id === proposal.externalReference.id);
  const existingStorage = memory.storageRecords.find((record) => record.id === proposal.storageRecord.id);
  const existingEvent = memory.nexusEvents.find((record) => record.id === proposal.auditEvent.id);

  const existingRecords = [
    existingFile,
    existingCanonical,
    existingExternal,
    existingStorage,
    existingEvent,
  ];
  const existingCount = existingRecords.filter(Boolean).length;

  const providerObjectElsewhere = memory.externalReferences.find(
    (record) =>
      record.provider === proposal.externalReference.provider &&
      record.externalObjectId === proposal.externalReference.externalObjectId &&
      record.nexusObjectId !== proposal.canonicalFileObject.id,
  );
  if (providerObjectElsewhere) {
    return rejected(memory, proposal, 'PROVIDER_OBJECT_ALREADY_LINKED');
  }

  if (existingCount > 0 && existingCount < existingRecords.length) {
    return rejected(memory, proposal, 'PARTIAL_STATE_CONFLICT');
  }

  if (existingCount === existingRecords.length) {
    const exactReplay =
      fileIdentityMatches(existingFile!, proposal) &&
      canonicalIdentityMatches(existingCanonical!, proposal) &&
      externalIdentityMatches(existingExternal!, proposal) &&
      storageIdentityMatches(existingStorage!, proposal) &&
      eventIdentityMatches(existingEvent!, proposal);

    if (!exactReplay) return rejected(memory, proposal, 'IDENTITY_CONFLICT');

    return {
      committed: false,
      idempotentReplay: true,
      reason: 'ALREADY_COMMITTED',
      idempotencyKey: proposal.idempotencyKey,
      memory,
    };
  }

  const nextMemory: NexusProjectMemorySnapshot = {
    ...memory,
    files: [...memory.files, proposal.fileRecord],
    canonicalObjects: [...memory.canonicalObjects, proposal.canonicalFileObject],
    externalReferences: [...memory.externalReferences, proposal.externalReference],
    storageRecords: [...memory.storageRecords, proposal.storageRecord],
    nexusEvents: [...memory.nexusEvents, proposal.auditEvent],
  };

  const invariantReport = mergeReports(
    validateProjectMemorySnapshot(nextMemory),
    validateProjectMemoryStorage(nextMemory),
  );

  if (!invariantReport.ok) {
    return rejected(memory, proposal, 'POST_COMMIT_INVARIANT_FAILURE', invariantReport);
  }

  return {
    committed: true,
    idempotentReplay: false,
    reason: 'COMMITTED',
    idempotencyKey: proposal.idempotencyKey,
    memory: nextMemory,
    invariantReport,
  };
};
