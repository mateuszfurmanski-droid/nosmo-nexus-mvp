import type { NexusAccessDecisionRecord, NexusManagerTradeContextRecord, NexusModuleEntitlementRecord, NexusPermissionGrantRecord, NexusProjectParticipationRecord, NexusRoleAssignmentRecord, NexusTradeAssignmentRecord } from '../schemas/access.schema';
import type { NexusEventRecord } from '../schemas/audit.schema';
import type { NexusCanonicalObjectRecord, NexusRelationshipEdgeRecord } from '../schemas/canonicalObject.schema';
import type { NexusEvidenceRecord } from '../schemas/evidence.schema';
import type { NexusExternalReferenceRecord } from '../schemas/externalReference.schema';
import type { NexusDrawingReferenceRecord, NexusFileRecord } from '../schemas/file.schema';
import type { NexusGraphEdgeRecord, NexusGraphNodeRecord } from '../schemas/graph.schema';
import type { NexusPersonRecord } from '../schemas/person.schema';
import type { NexusCompanyRecord, NexusProjectRecord, NexusProjectWorldRecord } from '../schemas/project.schema';
import type { NexusTaskRecord } from '../schemas/task.schema';
import type { NexusAsOfContext, NexusTemporalObjectStateRecord, NexusTemporalStateResolution } from '../schemas/temporal.schema';
import type { NexusTimelineEventRecord } from '../schemas/timeline.schema';
import type { NexusProjectMemorySnapshot } from '../projectMemory';

const FIXTURE_RECORDED_AT = '2026-08-20T00:00:00Z';
const PROJECT_ID = 'project-esafe-catania';
const WORLD_ID = 'world-esafe-catania';
const CORDIS_PROJECT_URL = 'https://cordis.europa.eu/project/id/893135';
const D51_DOI_URL = 'https://doi.org/10.5281/zenodo.6260847';

export const esafeProjects: NexusProjectRecord[] = [
  {
    id: PROJECT_ID,
    title: 'e-SAFE Catania',
    description: 'e-SAFE H2020 real pilot represented as the sole active Nexus MVP demo/test project fixture.',
    projectCode: 'NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA',
    projectStatus: 'demo',
    locationLabel: 'Via Acquicella Porto 27/H, Catania, Italy',
    startDate: '2020-10-01',
    endDate: '2025-09-30',
    worldIds: [WORLD_ID],
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'cordis',
    sourceRecordId: '893135',
    sourceUrl: CORDIS_PROJECT_URL,
    confidence: 'confirmed',
    provenanceClass: 'REAL',
  },
];

export const esafeWorlds: NexusProjectWorldRecord[] = [
  {
    id: WORLD_ID,
    title: 'e-SAFE Catania Project World',
    description: 'Nexus demo/test Project World layered over the source-backed e-SAFE Catania project.',
    projectId: PROJECT_ID,
    worldCode: 'esafe-catania',
    isolation: 'strict',
    defaultRole: 'manager',
    allowedRoles: ['manager', 'installer', 'client-viewer'],
    enabledModuleIds: ['project', 'time', 'people', 'docs', 'cloud', 'soft', 'integrations', 'evidence'],
    enabledConnectorIds: ['google-drive', 'work-wallet', 'bim-fabstation', 'gmail-whatsapp'],
    notes: 'Only active demo/test Project World for the current MVP fixture set.',
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'nexus',
    confidence: 'manual',
    provenanceClass: 'SYNTHETIC_DEMO',
  },
];

export const esafeCompanies: NexusCompanyRecord[] = [
  {
    id: 'company-esafe-iacp-catania',
    title: 'IACP Catania',
    description: 'Public housing organisation associated with the e-SAFE Catania real pilot.',
    companyType: 'client',
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'esafe-public',
    sourceRecordId: 'catania-real-pilot',
    confidence: 'confirmed',
    provenanceClass: 'REAL',
  },
];

export const esafePeople: NexusPersonRecord[] = [
  {
    id: 'person-esafe-sebastiano-durso',
    title: "Sebastiano D'Urso",
    displayName: "Sebastiano D'Urso",
    personType: 'unknown',
    description: 'Named author on the public e-SAFE Deliverable D5.1 real-pilot survey record.',
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'zenodo',
    sourceRecordId: '6260847',
    sourceUrl: D51_DOI_URL,
    confidence: 'confirmed',
    provenanceClass: 'REAL',
  },
  {
    id: 'person-esafe-demo-manager',
    title: 'e-SAFE Demo Manager',
    displayName: 'e-SAFE Demo Manager',
    personType: 'manager',
    description: 'Synthetic identity used only to exercise ADDON_056 access-resolution fixtures.',
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'nexus',
    confidence: 'manual',
    provenanceClass: 'SYNTHETIC_DEMO',
  },
];

export const esafeFiles: NexusFileRecord[] = [
  {
    id: 'file-esafe-d51-real-pilot-survey',
    title: 'Deliverable D5.1 - Detailed survey of the real pilot',
    description: 'Public e-SAFE deliverable describing the existing state and survey of the Catania real pilot.',
    fileKind: 'pdf',
    documentClass: 'report',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    storageConnectorId: 'external-reference',
    externalUrl: D51_DOI_URL,
    mimeType: 'application/pdf',
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'zenodo',
    sourceRecordId: '6260847',
    sourceUrl: D51_DOI_URL,
    confidence: 'confirmed',
    provenanceClass: 'REAL',
  },
];

export const esafeDrawingReferences: NexusDrawingReferenceRecord[] = [
  {
    id: 'drawing-esafe-existing-state-from-d51',
    title: 'Existing-state survey reference derived from D5.1',
    description: 'Nexus drawing reference derived from the authentic D5.1 survey deliverable; not claimed as a separately published source drawing.',
    fileId: 'file-esafe-d51-real-pilot-survey',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    revision: 'V2.0',
    building: 'Via Acquicella Porto 27/H',
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'zenodo',
    sourceRecordId: '6260847',
    sourceUrl: D51_DOI_URL,
    confidence: 'inferred',
    provenanceClass: 'DERIVED',
  },
];

export const esafeTasks: NexusTaskRecord[] = [
  {
    id: 'task-esafe-demo-review-survey',
    title: 'Review existing-state survey package',
    description: 'Synthetic operational task grounded in the real D5.1 survey file; not an authentic e-SAFE contractor task.',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    taskStatus: 'todo',
    priority: 'normal',
    assignedPersonIds: ['person-esafe-demo-manager'],
    relatedFileIds: ['file-esafe-d51-real-pilot-survey'],
    building: 'Via Acquicella Porto 27/H',
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'nexus',
    confidence: 'manual',
    provenanceClass: 'SYNTHETIC_DEMO',
  },
];

export const esafeEvidence: NexusEvidenceRecord[] = [
  {
    id: 'evidence-esafe-d51-existing-state',
    title: 'D5.1 existing-state survey evidence',
    description: 'Derived Nexus evidence link to the authentic D5.1 survey deliverable.',
    evidenceType: 'document',
    evidenceStatus: 'linked',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    linkedFileId: 'file-esafe-d51-real-pilot-survey',
    capturedAt: '2022-02-24T00:00:00Z',
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'zenodo',
    sourceRecordId: '6260847',
    sourceUrl: D51_DOI_URL,
    confidence: 'inferred',
    provenanceClass: 'DERIVED',
  },
  {
    id: 'evidence-esafe-source-pending',
    title: 'Uncatalogued e-SAFE source placeholder',
    description: 'Project-scoped fixture for a source item whose provenance has not yet been established; it must not be presented as a real historical fact.',
    evidenceType: 'external-reference',
    evidenceStatus: 'linked',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    status: 'draft',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'manual',
    confidence: 'unknown',
    provenanceClass: 'UNKNOWN',
  },
];

export const esafeTimelineEvents: NexusTimelineEventRecord[] = [
  {
    id: 'timeline-esafe-project-start',
    title: 'e-SAFE project start',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    eventType: 'project-created',
    eventAt: '2020-10-01T00:00:00Z',
    relatedRecordIds: [PROJECT_ID],
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'cordis',
    sourceRecordId: '893135',
    sourceUrl: CORDIS_PROJECT_URL,
    confidence: 'confirmed',
    provenanceClass: 'REAL',
  },
  {
    id: 'timeline-esafe-d51-published',
    title: 'D5.1 real-pilot survey published',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    eventType: 'file-linked',
    eventAt: '2022-02-24T00:00:00Z',
    relatedRecordIds: ['file-esafe-d51-real-pilot-survey', 'drawing-esafe-existing-state-from-d51'],
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'zenodo',
    sourceRecordId: '6260847',
    sourceUrl: D51_DOI_URL,
    confidence: 'confirmed',
    provenanceClass: 'REAL',
  },
];

export const esafeCanonicalObjects: NexusCanonicalObjectRecord[] = [
  {
    id: 'canonical-esafe-project',
    title: 'e-SAFE Catania',
    objectType: 'Project',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    lifecycleStatus: 'active',
    canonicalSourceType: 'import',
    externalReferenceIds: ['external-esafe-cordis-project'],
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'cordis',
    sourceRecordId: '893135',
    sourceUrl: CORDIS_PROJECT_URL,
    confidence: 'confirmed',
    provenanceClass: 'REAL',
  },
  {
    id: 'canonical-esafe-file-d51',
    title: 'Deliverable D5.1 - Detailed survey of the real pilot',
    objectType: 'Document',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    lifecycleStatus: 'active',
    canonicalSourceType: 'import',
    externalReferenceIds: ['external-esafe-zenodo-d51'],
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'zenodo',
    sourceRecordId: '6260847',
    sourceUrl: D51_DOI_URL,
    confidence: 'confirmed',
    provenanceClass: 'REAL',
  },
  {
    id: 'canonical-esafe-drawing-existing-state',
    title: 'Existing-state survey reference derived from D5.1',
    objectType: 'Drawing',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    lifecycleStatus: 'active',
    canonicalSourceType: 'nexus',
    externalReferenceIds: [],
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'zenodo',
    sourceRecordId: '6260847',
    sourceUrl: D51_DOI_URL,
    confidence: 'inferred',
    provenanceClass: 'DERIVED',
  },
  {
    id: 'canonical-esafe-task-review-survey',
    title: 'Review existing-state survey package',
    objectType: 'Task',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    lifecycleStatus: 'active',
    canonicalSourceType: 'nexus',
    externalReferenceIds: [],
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'nexus',
    confidence: 'manual',
    provenanceClass: 'SYNTHETIC_DEMO',
  },
  {
    id: 'canonical-esafe-evidence-d51',
    title: 'D5.1 existing-state survey evidence',
    objectType: 'Evidence',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    lifecycleStatus: 'active',
    canonicalSourceType: 'nexus',
    externalReferenceIds: ['external-esafe-zenodo-d51'],
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'zenodo',
    sourceRecordId: '6260847',
    sourceUrl: D51_DOI_URL,
    confidence: 'inferred',
    provenanceClass: 'DERIVED',
  },
];

export const esafeRelationshipEdges: NexusRelationshipEdgeRecord[] = [
  {
    id: 'relationship-esafe-file-belongs-project',
    title: 'D5.1 belongs to e-SAFE Catania',
    sourceObjectId: 'canonical-esafe-file-d51',
    targetObjectId: 'canonical-esafe-project',
    relationshipType: 'BELONGS_TO',
    direction: 'directed',
    projectScopeId: PROJECT_ID,
    relationshipStatus: 'confirmed',
    relationshipConfidence: 'confirmed',
    confidenceScore: 100,
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'zenodo',
    sourceRecordId: '6260847',
    sourceUrl: D51_DOI_URL,
    confidence: 'confirmed',
    provenanceClass: 'REAL',
  },
  {
    id: 'relationship-esafe-drawing-derived-file',
    title: 'Drawing reference derived from D5.1',
    sourceObjectId: 'canonical-esafe-drawing-existing-state',
    targetObjectId: 'canonical-esafe-file-d51',
    relationshipType: 'DERIVED_FROM',
    direction: 'directed',
    projectScopeId: PROJECT_ID,
    relationshipStatus: 'confirmed',
    relationshipConfidence: 'inferred',
    confidenceScore: 90,
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'nexus',
    confidence: 'inferred',
    provenanceClass: 'DERIVED',
  },
  {
    id: 'relationship-esafe-task-requires-file',
    title: 'Survey review task requires D5.1',
    sourceObjectId: 'canonical-esafe-task-review-survey',
    targetObjectId: 'canonical-esafe-file-d51',
    relationshipType: 'REQUIRES',
    direction: 'directed',
    projectScopeId: PROJECT_ID,
    relationshipStatus: 'confirmed',
    relationshipConfidence: 'manual',
    confidenceScore: 100,
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'nexus',
    confidence: 'manual',
    provenanceClass: 'SYNTHETIC_DEMO',
  },
];

export const esafeExternalReferences: NexusExternalReferenceRecord[] = [
  {
    id: 'external-esafe-cordis-project',
    title: 'CORDIS e-SAFE project 893135',
    nexusObjectId: 'canonical-esafe-project',
    provider: 'cordis',
    externalObjectType: 'H2020_PROJECT',
    externalObjectId: '893135',
    externalUrl: CORDIS_PROJECT_URL,
    sourceStatus: 'closed',
    sourceRevision: 'current-public-record',
    sourceTimestamp: '2025-09-30T00:00:00Z',
    freshnessState: 'RECENT',
    readOnly: true,
    verificationState: 'verified',
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'cordis',
    sourceRecordId: '893135',
    sourceUrl: CORDIS_PROJECT_URL,
    confidence: 'confirmed',
    provenanceClass: 'REAL',
  },
  {
    id: 'external-esafe-zenodo-d51',
    title: 'Zenodo e-SAFE Deliverable D5.1',
    nexusObjectId: 'canonical-esafe-file-d51',
    provider: 'zenodo',
    externalObjectType: 'DELIVERABLE',
    externalObjectId: '6260847',
    externalUrl: D51_DOI_URL,
    sourceStatus: 'published',
    sourceRevision: 'V2.0',
    sourceTimestamp: '2022-02-24T00:00:00Z',
    freshnessState: 'RECENT',
    readOnly: true,
    verificationState: 'verified',
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'zenodo',
    sourceRecordId: '6260847',
    sourceUrl: D51_DOI_URL,
    confidence: 'confirmed',
    provenanceClass: 'REAL',
  },
];

export const esafeNexusEvents: NexusEventRecord[] = [
  {
    id: 'event-esafe-project-start',
    title: 'e-SAFE project start',
    eventType: 'PROJECT_STARTED',
    occurredAt: '2020-10-01T00:00:00Z',
    recordedAt: FIXTURE_RECORDED_AT,
    actorType: 'UNKNOWN',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    primaryObjectId: 'canonical-esafe-project',
    relatedObjectIds: [],
    eventSourceType: 'IMPORT',
    sourceReference: 'CORDIS project 893135',
    sourceFreshnessState: 'RECENT',
    eventState: 'RECORDED',
    summary: 'CORDIS records the e-SAFE project start on 1 October 2020.',
    verificationState: 'VERIFIED_BY_SOURCE',
    confidenceScore: 100,
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'cordis',
    sourceRecordId: '893135',
    sourceUrl: CORDIS_PROJECT_URL,
    confidence: 'confirmed',
    provenanceClass: 'REAL',
  },
  {
    id: 'event-esafe-d51-published',
    title: 'D5.1 real-pilot survey published',
    eventType: 'DOCUMENT_PUBLISHED',
    occurredAt: '2022-02-24T00:00:00Z',
    recordedAt: FIXTURE_RECORDED_AT,
    actorType: 'UNKNOWN',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    primaryObjectId: 'canonical-esafe-file-d51',
    relatedObjectIds: ['canonical-esafe-project', 'canonical-esafe-drawing-existing-state'],
    eventSourceType: 'IMPORT',
    sourceReference: 'Zenodo DOI 10.5281/zenodo.6260847',
    sourceFreshnessState: 'RECENT',
    eventState: 'RECORDED',
    summary: 'Public D5.1 survey record used as a source-backed project-memory event.',
    verificationState: 'VERIFIED_BY_SOURCE',
    confidenceScore: 100,
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'zenodo',
    sourceRecordId: '6260847',
    sourceUrl: D51_DOI_URL,
    confidence: 'confirmed',
    provenanceClass: 'REAL',
  },
];

export const esafeProjectParticipations: NexusProjectParticipationRecord[] = [
  {
    id: 'participation-esafe-demo-manager',
    title: 'e-SAFE demo manager participation',
    personId: 'person-esafe-demo-manager',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    participationStatus: 'active',
    roleAssignmentIds: ['role-assignment-esafe-demo-manager'],
    tradeAssignmentIds: ['trade-assignment-esafe-demo-manager-all'],
    primaryTradeAssignmentId: 'trade-assignment-esafe-demo-manager-all',
    permissionGrantIds: ['permission-esafe-demo-manager-project-view'],
    approvalScopeIds: [],
    competenceRequirementIds: [],
    validFrom: '2026-08-20T00:00:00Z',
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'nexus',
    confidence: 'manual',
    provenanceClass: 'SYNTHETIC_DEMO',
  },
];

export const esafeRoleAssignments: NexusRoleAssignmentRecord[] = [
  {
    id: 'role-assignment-esafe-demo-manager',
    title: 'Demo Manager',
    participationId: 'participation-esafe-demo-manager',
    roleKey: 'manager',
    roleLabel: 'Manager',
    managerCapable: true,
    permissionKeys: ['project.view', 'trade_context_switch'],
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'nexus',
    confidence: 'manual',
    provenanceClass: 'SYNTHETIC_DEMO',
  },
];

export const esafeTradeAssignments: NexusTradeAssignmentRecord[] = [
  {
    id: 'trade-assignment-esafe-demo-manager-all',
    title: 'All approved trades demo context',
    participationId: 'participation-esafe-demo-manager',
    tradeKey: 'all-approved-trades',
    tradeLabel: 'All approved trades',
    primary: true,
    approved: true,
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'nexus',
    confidence: 'manual',
    provenanceClass: 'SYNTHETIC_DEMO',
  },
];

export const esafePermissionGrants: NexusPermissionGrantRecord[] = [
  {
    id: 'permission-esafe-demo-manager-project-view',
    title: 'Demo manager project view',
    participationId: 'participation-esafe-demo-manager',
    effect: 'allow',
    moduleId: 'project',
    actionKey: 'project.view',
    reason: 'Synthetic ADDON_056 fixture grant for the e-SAFE demo manager.',
    validFrom: '2026-08-20T00:00:00Z',
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'nexus',
    confidence: 'manual',
    provenanceClass: 'SYNTHETIC_DEMO',
  },
];

export const esafeModuleEntitlements: NexusModuleEntitlementRecord[] = [
  {
    id: 'entitlement-esafe-project-manager',
    title: 'e-SAFE project module manager entitlement',
    moduleId: 'project',
    supportedTrades: ['all-approved-trades'],
    supportedProjectTypes: ['demo'],
    minimumRoleKeys: ['manager'],
    requiredPermissionKeys: ['project.view'],
    competenceGateKeys: [],
    projectEnabled: true,
    availabilityState: 'active',
    launchTarget: 'project',
    returnRoute: 'relationship-tree',
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'nexus',
    confidence: 'manual',
    provenanceClass: 'SYNTHETIC_DEMO',
  },
];

export const esafeManagerTradeContexts: NexusManagerTradeContextRecord[] = [
  {
    id: 'manager-trade-context-esafe-demo-manager',
    title: 'e-SAFE demo manager all-trades context',
    personId: 'person-esafe-demo-manager',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    participationId: 'participation-esafe-demo-manager',
    mode: 'all-trades',
    setAt: FIXTURE_RECORDED_AT,
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'nexus',
    confidence: 'manual',
    provenanceClass: 'SYNTHETIC_DEMO',
  },
];

export const esafeAccessDecisions: NexusAccessDecisionRecord[] = [
  {
    id: 'access-decision-esafe-demo-manager-project-view',
    title: 'Allow demo manager to view e-SAFE project module',
    personId: 'person-esafe-demo-manager',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    participationId: 'participation-esafe-demo-manager',
    moduleId: 'project',
    actionKey: 'project.view',
    managerTradeContextId: 'manager-trade-context-esafe-demo-manager',
    result: 'allowed',
    reason: 'explicit-grant',
    policyVersion: 'ADDON_056_PHASE8_V1',
    evaluatedAt: FIXTURE_RECORDED_AT,
    status: 'active',
    createdAt: FIXTURE_RECORDED_AT,
    updatedAt: FIXTURE_RECORDED_AT,
    sourceSystem: 'nexus',
    confidence: 'manual',
    provenanceClass: 'SYNTHETIC_DEMO',
  },
];

export const esafeGraphNodes: NexusGraphNodeRecord[] = [
  { id: 'graph-node-esafe-project', type: 'Project', recordId: PROJECT_ID, worldId: WORLD_ID, label: 'e-SAFE Catania', pinned: true, provenanceClass: 'REAL' },
  { id: 'graph-node-esafe-company', type: 'Company', recordId: 'company-esafe-iacp-catania', worldId: WORLD_ID, label: 'IACP Catania', provenanceClass: 'REAL' },
  { id: 'graph-node-esafe-person-durso', type: 'Person', recordId: 'person-esafe-sebastiano-durso', worldId: WORLD_ID, label: "Sebastiano D'Urso", provenanceClass: 'REAL' },
  { id: 'graph-node-esafe-file-d51', type: 'File', recordId: 'file-esafe-d51-real-pilot-survey', worldId: WORLD_ID, label: 'D5.1 real-pilot survey', provenanceClass: 'REAL' },
  { id: 'graph-node-esafe-drawing', type: 'DrawingReference', recordId: 'drawing-esafe-existing-state-from-d51', worldId: WORLD_ID, label: 'Existing-state survey reference', provenanceClass: 'DERIVED' },
  { id: 'graph-node-esafe-task', type: 'Task', recordId: 'task-esafe-demo-review-survey', worldId: WORLD_ID, label: 'Review existing-state survey package', provenanceClass: 'SYNTHETIC_DEMO' },
  { id: 'graph-node-esafe-evidence', type: 'Evidence', recordId: 'evidence-esafe-d51-existing-state', worldId: WORLD_ID, label: 'D5.1 survey evidence', provenanceClass: 'DERIVED' },
];

export const esafeGraphEdges: NexusGraphEdgeRecord[] = [
  { id: 'graph-edge-esafe-file-project', type: 'belongs-to', fromNodeId: 'graph-node-esafe-file-d51', toNodeId: 'graph-node-esafe-project', worldId: WORLD_ID, label: 'source document for project', confidence: 'confirmed', provenanceClass: 'REAL' },
  { id: 'graph-edge-esafe-drawing-file', type: 'linked-to', fromNodeId: 'graph-node-esafe-drawing', toNodeId: 'graph-node-esafe-file-d51', worldId: WORLD_ID, label: 'derived from D5.1', confidence: 'inferred', provenanceClass: 'DERIVED' },
  { id: 'graph-edge-esafe-task-file', type: 'linked-to', fromNodeId: 'graph-node-esafe-task', toNodeId: 'graph-node-esafe-file-d51', worldId: WORLD_ID, label: 'synthetic review task', confidence: 'manual', provenanceClass: 'SYNTHETIC_DEMO' },
  { id: 'graph-edge-esafe-evidence-project', type: 'evidences', fromNodeId: 'graph-node-esafe-evidence', toNodeId: 'graph-node-esafe-project', worldId: WORLD_ID, label: 'existing-state source evidence', confidence: 'inferred', provenanceClass: 'DERIVED' },
];

export const esafeTemporalRecords: NexusTemporalObjectStateRecord[] = [
  { objectId: 'canonical-esafe-project', validFrom: '2020-10-01T00:00:00Z', validTo: '2025-09-30T23:59:59Z', occurredAt: '2020-10-01T00:00:00Z', recordedAt: FIXTURE_RECORDED_AT, sourceReference: 'CORDIS project 893135', temporalProvenance: 'REAL', verificationState: 'VERIFIED_BY_SOURCE', datePrecision: 'day' },
  { objectId: 'canonical-esafe-file-d51', validFrom: '2022-02-24T00:00:00Z', occurredAt: '2022-02-24T00:00:00Z', recordedAt: FIXTURE_RECORDED_AT, sourceReference: 'Zenodo DOI 10.5281/zenodo.6260847', temporalProvenance: 'REAL', verificationState: 'VERIFIED_BY_SOURCE', datePrecision: 'day' },
  { objectId: 'canonical-esafe-drawing-existing-state', validFrom: '2022-02-24T00:00:00Z', recordedAt: FIXTURE_RECORDED_AT, sourceReference: 'Derived from D5.1 V2.0 survey content', temporalProvenance: 'DERIVED', verificationState: 'VERIFIED_BY_SOURCE', datePrecision: 'day' },
  { objectId: 'canonical-esafe-task-review-survey', validFrom: '2026-08-20T00:00:00Z', recordedAt: FIXTURE_RECORDED_AT, sourceReference: 'NOSMO Phase 8 demo fixture', temporalProvenance: 'SYNTHETIC_DEMO', verificationState: 'VERIFIED_BY_USER', datePrecision: 'day' },
  { objectId: 'evidence-esafe-source-pending', recordedAt: FIXTURE_RECORDED_AT, sourceReference: 'Unresolved fixture source', temporalProvenance: 'UNKNOWN', verificationState: 'UNKNOWN', datePrecision: 'unknown' },
];

export const esafeAsOfContexts: NexusAsOfContext[] = [
  { projectId: PROJECT_ID, worldId: WORLD_ID, selectedAt: '2021-06-01T00:00:00Z', mode: 'as-of', zoomLevel: 'months' },
  { projectId: PROJECT_ID, worldId: WORLD_ID, selectedAt: '2022-03-01T00:00:00Z', mode: 'as-of', zoomLevel: 'months' },
];

export const esafeTemporalStateResolutions: NexusTemporalStateResolution[] = [
  {
    context: esafeAsOfContexts[0],
    provenanceClass: 'DERIVED',
    visibleObjectIds: ['canonical-esafe-project'],
    hiddenObjectIds: ['canonical-esafe-file-d51', 'canonical-esafe-drawing-existing-state', 'canonical-esafe-task-review-survey'],
    uncertainObjectIds: ['canonical-esafe-person-durso', 'evidence-esafe-source-pending'],
    activeEventIds: ['event-esafe-project-start'],
    activeRevisionIds: [],
    sourceWarnings: ['D5.1 had not yet been published at this AS_OF date.', 'Authorship does not establish exact project-participation dates for the named person.'],
  },
  {
    context: esafeAsOfContexts[1],
    provenanceClass: 'DERIVED',
    visibleObjectIds: ['canonical-esafe-project', 'canonical-esafe-file-d51', 'canonical-esafe-drawing-existing-state', 'canonical-esafe-evidence-d51'],
    hiddenObjectIds: ['canonical-esafe-task-review-survey'],
    uncertainObjectIds: ['canonical-esafe-person-durso', 'evidence-esafe-source-pending'],
    activeEventIds: ['event-esafe-project-start', 'event-esafe-d51-published'],
    activeRevisionIds: ['canonical-esafe-drawing-existing-state'],
    sourceWarnings: ['Authorship does not establish exact project-participation dates for the named person.'],
  },
];

export const applyEsafeCataniaFixtures = (memory: NexusProjectMemorySnapshot): NexusProjectMemorySnapshot => {
  memory.projects.push(...esafeProjects);
  memory.worlds.push(...esafeWorlds);
  memory.companies.push(...esafeCompanies);
  memory.people.push(...esafePeople);
  memory.files.push(...esafeFiles);
  memory.drawingReferences.push(...esafeDrawingReferences);
  memory.tasks.push(...esafeTasks);
  memory.evidence.push(...esafeEvidence);
  memory.timelineEvents.push(...esafeTimelineEvents);
  memory.graphNodes.push(...esafeGraphNodes);
  memory.graphEdges.push(...esafeGraphEdges);
  memory.canonicalObjects.push(...esafeCanonicalObjects);
  memory.relationshipEdges.push(...esafeRelationshipEdges);
  memory.externalReferences.push(...esafeExternalReferences);
  memory.nexusEvents.push(...esafeNexusEvents);
  memory.projectParticipations.push(...esafeProjectParticipations);
  memory.roleAssignments.push(...esafeRoleAssignments);
  memory.tradeAssignments.push(...esafeTradeAssignments);
  memory.permissionGrants.push(...esafePermissionGrants);
  memory.moduleEntitlements.push(...esafeModuleEntitlements);
  memory.managerTradeContexts.push(...esafeManagerTradeContexts);
  memory.accessDecisions.push(...esafeAccessDecisions);
  memory.temporalRecords.push(...esafeTemporalRecords);
  memory.asOfContexts.push(...esafeAsOfContexts);
  memory.temporalStateResolutions.push(...esafeTemporalStateResolutions);
  return memory;
};
