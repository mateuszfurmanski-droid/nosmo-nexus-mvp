import type { NexusAccessDecisionRecord, NexusManagerTradeContextRecord, NexusModuleEntitlementRecord, NexusPermissionGrantRecord, NexusProjectParticipationRecord, NexusRoleAssignmentRecord, NexusTradeAssignmentRecord } from './schemas/access.schema';
import type { NexusEventRecord, NexusFieldChangeRecord, NexusHumanDecisionRecord } from './schemas/audit.schema';
import type { NexusCanonicalObjectRecord, NexusRelationshipEdgeRecord } from './schemas/canonicalObject.schema';
import type { NexusConnectorAccountRecord, NexusConnectorDefinitionRecord, NexusConnectorObjectMappingRecord } from './schemas/connector.schema';
import type { NexusApprovalRecord, NexusEvidenceRecord } from './schemas/evidence.schema';
import type { NexusExternalReferenceRecord } from './schemas/externalReference.schema';
import type { NexusFileRecord, NexusDrawingReferenceRecord } from './schemas/file.schema';
import type { NexusGraphEdgeRecord, NexusGraphNodeRecord } from './schemas/graph.schema';
import type { NexusPersonRecord, NexusProjectRoleRecord } from './schemas/person.schema';
import type { NexusCompanyRecord, NexusProjectRecord, NexusProjectWorldRecord } from './schemas/project.schema';
import type { NexusStorageRecord } from './schemas/storage.schema';
import type { NexusAssetRecord, NexusTaskRecord } from './schemas/task.schema';
import type { NexusAsOfContext, NexusTemporalObjectStateRecord, NexusTemporalStateResolution } from './schemas/temporal.schema';
import type { NexusTimelineEventRecord } from './schemas/timeline.schema';

export interface NexusProjectMemorySnapshot {
  projects: NexusProjectRecord[];
  worlds: NexusProjectWorldRecord[];
  companies: NexusCompanyRecord[];
  people: NexusPersonRecord[];
  projectRoles: NexusProjectRoleRecord[];
  files: NexusFileRecord[];
  drawingReferences: NexusDrawingReferenceRecord[];
  tasks: NexusTaskRecord[];
  assets: NexusAssetRecord[];
  evidence: NexusEvidenceRecord[];
  approvals: NexusApprovalRecord[];
  timelineEvents: NexusTimelineEventRecord[];
  graphNodes: NexusGraphNodeRecord[];
  graphEdges: NexusGraphEdgeRecord[];
  canonicalObjects: NexusCanonicalObjectRecord[];
  relationshipEdges: NexusRelationshipEdgeRecord[];
  externalReferences: NexusExternalReferenceRecord[];
  nexusEvents: NexusEventRecord[];
  fieldChanges: NexusFieldChangeRecord[];
  humanDecisions: NexusHumanDecisionRecord[];
  connectorDefinitions: NexusConnectorDefinitionRecord[];
  connectorAccounts: NexusConnectorAccountRecord[];
  connectorObjectMappings: NexusConnectorObjectMappingRecord[];
  projectParticipations: NexusProjectParticipationRecord[];
  roleAssignments: NexusRoleAssignmentRecord[];
  tradeAssignments: NexusTradeAssignmentRecord[];
  permissionGrants: NexusPermissionGrantRecord[];
  moduleEntitlements: NexusModuleEntitlementRecord[];
  managerTradeContexts: NexusManagerTradeContextRecord[];
  accessDecisions: NexusAccessDecisionRecord[];
  storageRecords: NexusStorageRecord[];
  temporalRecords: NexusTemporalObjectStateRecord[];
  asOfContexts: NexusAsOfContext[];
  temporalStateResolutions: NexusTemporalStateResolution[];
}

export const emptyProjectMemorySnapshot = (): NexusProjectMemorySnapshot => ({
  projects: [],
  worlds: [],
  companies: [],
  people: [],
  projectRoles: [],
  files: [],
  drawingReferences: [],
  tasks: [],
  assets: [],
  evidence: [],
  approvals: [],
  timelineEvents: [],
  graphNodes: [],
  graphEdges: [],
  canonicalObjects: [],
  relationshipEdges: [],
  externalReferences: [],
  nexusEvents: [],
  fieldChanges: [],
  humanDecisions: [],
  connectorDefinitions: [],
  connectorAccounts: [],
  connectorObjectMappings: [],
  projectParticipations: [],
  roleAssignments: [],
  tradeAssignments: [],
  permissionGrants: [],
  moduleEntitlements: [],
  managerTradeContexts: [],
  accessDecisions: [],
  storageRecords: [],
  temporalRecords: [],
  asOfContexts: [],
  temporalStateResolutions: [],
});
