import { createNexusSpatialHandOff } from '../connectors/bim-fabstation/spatialHandoff';
import { createIfcChangeReviewEnvelope } from './ifcChangeEventReview';
import { parseIfcSourceForMappingReview } from './ifcSourceIntake';
import { compareIfcObjectAcrossRevisions } from './ifcRevisionComparison';
import { validateNexusIssueInvariants } from './issueInvariants';
import { emptyProjectMemorySnapshot, type NexusProjectMemorySnapshot } from './projectMemory';
import type { NexusAccessDecisionRecord } from './schemas/access.schema';
import type { NexusCanonicalObjectRecord } from './schemas/canonicalObject.schema';
import type { NexusIfcExternalReferenceRecord } from './schemas/ifcExternalReference.schema';
import { resolveNexusIfcObjectIdentity } from './schemas/ifcExternalReference.schema';
import { commitWorkSuiteActionToProjectMemory } from './workSuiteProjectMemoryCommit';
import { applyWorkSuiteRaiseRfi } from './workSuiteRaiseRfi';

export const NEXUS_BIM_CONTRACT_E2E_HARNESS_SCHEMA = 'nexus-bim-contract-e2e-harness/v1' as const;

const PROJECT_ID = 'project-synthetic-bim-e2e';
const WORLD_ID = 'world-synthetic-bim-e2e';
const NEXUS_OBJECT_ID = 'object-synthetic-tray-001';
const IFC_REFERENCE_ID = 'ifc-reference-synthetic-tray-001';
const IFC_PROJECT_GLOBAL_ID = '0PRJ000000000000000001';
const IFC_OBJECT_GLOBAL_ID = '0OBJ000000000000000001';
const PERSON_ID = 'person-synthetic-design-coordinator';
const PARTICIPATION_ID = 'participation-synthetic-design-coordinator';
const CHANGE_EVENT_ID = 'event-synthetic-ifc-change-001';
const RFI_ACTION_EVENT_ID = 'event-synthetic-raise-rfi-001';
const HUMAN_DECISION_ID = 'decision-synthetic-raise-rfi-001';
const ISSUE_ID = 'issue-synthetic-rfi-001';
const TIMELINE_ID = 'timeline-synthetic-raise-rfi-001';
const BASELINE_SHA = '1'.repeat(64);
const CURRENT_SHA = '2'.repeat(64);
const T0 = '2026-08-22T12:00:00.000Z';
const T1 = '2026-08-22T12:05:00.000Z';
const T2 = '2026-08-22T12:10:00.000Z';

const baselineIfc = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('NEXUS SYNTHETIC CONTRACT HARNESS'),'2;1');
FILE_NAME('synthetic-baseline.ifc','${T0}',('NOSMO'),('NOSMO'),'Nexus','Nexus','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('${IFC_PROJECT_GLOBAL_ID}',$,'Synthetic Project',$,$,$,$,$,$);
#20=IFCCABLECARRIERSEGMENT('${IFC_OBJECT_GLOBAL_ID}',$,'Cable tray A','Baseline scope',$,$,$,$,'TRAY-01',$);
ENDSEC;
END-ISO-10303-21;`;

const currentIfc = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('NEXUS SYNTHETIC CONTRACT HARNESS'),'2;1');
FILE_NAME('synthetic-current.ifc','${T1}',('NOSMO'),('NOSMO'),'Nexus','Nexus','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('${IFC_PROJECT_GLOBAL_ID}',$,'Synthetic Project',$,$,$,$,$,$);
#200=IFCCABLECARRIERSEGMENT('${IFC_OBJECT_GLOBAL_ID}',$,'Cable tray A revised','Current scope',$,$,$,$,'TRAY-01',$);
ENDSEC;
END-ISO-10303-21;`;

export type NexusBimContractHarnessGateState = 'AUTOMATED_PASS' | 'BLOCKED' | 'NOT_RUN';

export interface NexusBimContractHarnessGate {
  gate: string;
  state: NexusBimContractHarnessGateState;
  detail: string;
}

export interface NexusBimContractE2eHarnessResult {
  schema: typeof NEXUS_BIM_CONTRACT_E2E_HARNESS_SCHEMA;
  provenance: 'SYNTHETIC_DEMO';
  overall: 'AUTOMATED_PASS' | 'BLOCKED';
  gates: NexusBimContractHarnessGate[];
  canonical: {
    nexusObjectId: string;
    ifcGlobalId: string;
    diagnosticExpressIdBaseline?: number;
    diagnosticExpressIdCurrent?: number;
    changeEventId?: string;
    rfiIssueId?: string;
    rfiActionEventId?: string;
    timelineEventId?: string;
  };
  externalValidation: {
    realIfc: 'BLOCKED';
    trustedViewer: 'BLOCKED';
    androidFold: 'BLOCKED';
    partnerHandoff: 'BLOCKED';
    fabStationCapability: 'BLOCKED_PENDING_PARTNER_EVIDENCE';
  };
  boundaries: string[];
}

const canonicalObject: NexusCanonicalObjectRecord = {
  id: NEXUS_OBJECT_ID,
  status: 'active',
  title: 'Synthetic cable tray A',
  description: 'Synthetic installation object used only by the contract harness.',
  tags: ['synthetic-demo', 'bim-ifc', 'contract-harness'],
  createdAt: T0,
  updatedAt: T0,
  sourceSystem: 'nexus',
  confidence: 'confirmed',
  provenanceClass: 'SYNTHETIC_DEMO',
  objectType: 'InstallationObject',
  subtype: 'IFCCABLECARRIERSEGMENT',
  projectId: PROJECT_ID,
  worldId: WORLD_ID,
  lifecycleStatus: 'active',
  canonicalSourceType: 'nexus',
  externalReferenceIds: [IFC_REFERENCE_ID],
};

const ifcReference: NexusIfcExternalReferenceRecord = {
  id: IFC_REFERENCE_ID,
  status: 'active',
  title: 'Synthetic explicit IFC GlobalId mapping',
  description: 'Synthetic mapping evidence for deterministic contract validation only.',
  tags: ['synthetic-demo', 'ifc-global-id'],
  createdAt: T0,
  updatedAt: T0,
  sourceSystem: 'bim-ifc',
  confidence: 'confirmed',
  provenanceClass: 'SYNTHETIC_DEMO',
  nexusObjectId: NEXUS_OBJECT_ID,
  provider: 'bim-ifc',
  externalObjectType: 'ifc-global-id',
  externalObjectId: IFC_OBJECT_GLOBAL_ID,
  sourceRevision: 'REV-A',
  sourceFileName: 'synthetic-baseline.ifc',
  sourceFileSha256: BASELINE_SHA,
  ifcSchema: 'IFC4',
  ifcProjectGlobalId: IFC_PROJECT_GLOBAL_ID,
  diagnosticExpressId: 20,
  freshnessState: 'RECENT',
  readOnly: true,
  verificationState: 'verified',
};

const authorityDecision: NexusAccessDecisionRecord = {
  id: 'access-synthetic-raise-rfi-001',
  status: 'active',
  title: 'Synthetic RAISE_RFI authority decision',
  description: 'Synthetic allowed access decision for contract harness only.',
  tags: ['synthetic-demo', 'worksuite', 'raise-rfi'],
  createdAt: T1,
  updatedAt: T1,
  createdBy: PERSON_ID,
  sourceSystem: 'nexus',
  confidence: 'confirmed',
  provenanceClass: 'SYNTHETIC_DEMO',
  personId: PERSON_ID,
  projectId: PROJECT_ID,
  worldId: WORLD_ID,
  participationId: PARTICIPATION_ID,
  actionKey: 'worksuite:RAISE_RFI',
  objectScopeId: NEXUS_OBJECT_ID,
  result: 'allowed',
  reason: 'explicit-grant',
  policyVersion: 'synthetic-harness-v1',
  evaluatedAt: T1,
};

const createHarnessMemory = (): NexusProjectMemorySnapshot => {
  const memory = emptyProjectMemorySnapshot();
  memory.projects.push({
    id: PROJECT_ID,
    status: 'active',
    title: 'Synthetic BIM contract project',
    createdAt: T0,
    updatedAt: T0,
    sourceSystem: 'nexus',
    confidence: 'confirmed',
    provenanceClass: 'SYNTHETIC_DEMO',
    projectCode: 'SYN-BIM-E2E',
    projectStatus: 'demo',
    worldIds: [WORLD_ID],
  });
  memory.worlds.push({
    id: WORLD_ID,
    status: 'active',
    title: 'Synthetic BIM contract world',
    createdAt: T0,
    updatedAt: T0,
    sourceSystem: 'nexus',
    confidence: 'confirmed',
    provenanceClass: 'SYNTHETIC_DEMO',
    projectId: PROJECT_ID,
    worldCode: 'SYN-BIM-E2E-WORLD',
    isolation: 'strict',
    defaultRole: 'viewer',
    allowedRoles: ['viewer', 'design-coordinator'],
    enabledModuleIds: [],
    enabledConnectorIds: ['bim-fabstation'],
  });
  memory.canonicalObjects.push(canonicalObject);
  memory.externalReferences.push(ifcReference);
  return memory;
};

const pushGate = (
  gates: NexusBimContractHarnessGate[],
  gate: string,
  pass: boolean,
  passDetail: string,
  failDetail: string,
): void => {
  gates.push({ gate, state: pass ? 'AUTOMATED_PASS' : 'BLOCKED', detail: pass ? passDetail : failDetail });
};

/**
 * Deterministic synthetic contract harness. A successful run proves only that
 * the #90-native contracts compose coherently. It can never emit REAL IFC,
 * trusted-viewer, Android/Fold or partner-handoff PASS.
 */
export const runNexusBimContractE2eHarness = (): NexusBimContractE2eHarnessResult => {
  const gates: NexusBimContractHarnessGate[] = [];
  let memory = createHarnessMemory();

  const baselineIntake = parseIfcSourceForMappingReview({
    text: baselineIfc,
    fileName: 'synthetic-baseline.ifc',
    fileSizeBytes: baselineIfc.length,
    sourceFileSha256: BASELINE_SHA,
  });
  const currentIntake = parseIfcSourceForMappingReview({
    text: currentIfc,
    fileName: 'synthetic-current.ifc',
    fileSizeBytes: currentIfc.length,
    sourceFileSha256: CURRENT_SHA,
  });

  pushGate(
    gates,
    'bounded-ifc-intake',
    baselineIntake.state === 'READY_FOR_MAPPING_REVIEW' && currentIntake.state === 'READY_FOR_MAPPING_REVIEW',
    'Both synthetic revisions passed bounded structural intake.',
    'At least one synthetic IFC revision was blocked by structural intake.',
  );

  const identityResolution = resolveNexusIfcObjectIdentity(canonicalObject, ifcReference);
  pushGate(
    gates,
    'explicit-ifc-globalid-mapping',
    identityResolution.ok,
    'Explicit verified Nexus Object ID <-> IFC GlobalId mapping resolved.',
    'Explicit IFC identity mapping failed closed.',
  );

  if (!identityResolution.ok) {
    return {
      schema: NEXUS_BIM_CONTRACT_E2E_HARNESS_SCHEMA,
      provenance: 'SYNTHETIC_DEMO',
      overall: 'BLOCKED',
      gates,
      canonical: { nexusObjectId: NEXUS_OBJECT_ID, ifcGlobalId: IFC_OBJECT_GLOBAL_ID },
      externalValidation: {
        realIfc: 'BLOCKED',
        trustedViewer: 'BLOCKED',
        androidFold: 'BLOCKED',
        partnerHandoff: 'BLOCKED',
        fabStationCapability: 'BLOCKED_PENDING_PARTNER_EVIDENCE',
      },
      boundaries: ['Synthetic contract harness stopped at explicit mapping failure.'],
    };
  }

  const identity = identityResolution.mapping;
  const comparison = compareIfcObjectAcrossRevisions({
    identity,
    previousRevision: 'REV-A',
    currentRevision: 'REV-B',
    previousIntake: baselineIntake,
    currentIntake,
  });

  const baselineCandidate = baselineIntake.candidates.find((candidate) => candidate.ifcGlobalId === IFC_OBJECT_GLOBAL_ID);
  const currentCandidate = currentIntake.candidates.find((candidate) => candidate.ifcGlobalId === IFC_OBJECT_GLOBAL_ID);
  const expressIdChanged =
    baselineCandidate?.diagnosticExpressId === 20 &&
    currentCandidate?.diagnosticExpressId === 200 &&
    comparison.ifcGlobalId === IFC_OBJECT_GLOBAL_ID;
  pushGate(
    gates,
    'diagnostic-express-id-not-identity',
    Boolean(expressIdChanged),
    'STEP/express ID changed 20 -> 200 while IFC GlobalId remained the identity anchor.',
    'Synthetic cross-revision identity did not preserve IFC GlobalId independently of STEP/express ID.',
  );

  pushGate(
    gates,
    'revision-human-review-signal',
    comparison.state === 'HUMAN_REVIEW_REQUIRED' && comparison.changeKind === 'STRUCTURAL_METADATA_CHANGED',
    'Structural metadata delta produced HUMAN_REVIEW_REQUIRED without automatic mutation.',
    `Unexpected revision state ${comparison.state}/${comparison.changeKind}.`,
  );

  const changeReview = createIfcChangeReviewEnvelope({
    eventId: CHANGE_EVENT_ID,
    identity,
    comparison,
    occurredAt: T1,
    recordedAt: T1,
  });
  const changeEvent = changeReview.canonicalEvent;
  pushGate(
    gates,
    'canonical-change-event-review',
    Boolean(changeReview.eligible && changeEvent?.eventState === 'AWAITING_HUMAN_REVIEW'),
    'Revision delta projected into the canonical NexusEventRecord review boundary.',
    'Eligible revision change did not produce the expected canonical review event.',
  );

  if (!changeEvent) {
    return {
      schema: NEXUS_BIM_CONTRACT_E2E_HARNESS_SCHEMA,
      provenance: 'SYNTHETIC_DEMO',
      overall: 'BLOCKED',
      gates,
      canonical: {
        nexusObjectId: NEXUS_OBJECT_ID,
        ifcGlobalId: IFC_OBJECT_GLOBAL_ID,
        diagnosticExpressIdBaseline: baselineCandidate?.diagnosticExpressId,
        diagnosticExpressIdCurrent: currentCandidate?.diagnosticExpressId,
      },
      externalValidation: {
        realIfc: 'BLOCKED',
        trustedViewer: 'BLOCKED',
        androidFold: 'BLOCKED',
        partnerHandoff: 'BLOCKED',
        fabStationCapability: 'BLOCKED_PENDING_PARTNER_EVIDENCE',
      },
      boundaries: ['Synthetic contract harness stopped because no canonical Change Event was produced.'],
    };
  }

  memory.nexusEvents.push(changeEvent);

  const rfiApply = applyWorkSuiteRaiseRfi({
    changeEvent,
    projectEvents: memory.nexusEvents,
    projectIssues: memory.issues,
    authorityDecision,
    reviewerPersonId: PERSON_ID,
    explicitApply: true,
    expectedRevision: 0,
    applicationEventId: RFI_ACTION_EVENT_ID,
    humanDecisionId: HUMAN_DECISION_ID,
    issueId: ISSUE_ID,
    question: 'Confirm revised cable tray scope before installation proceeds.',
    reason: 'IFC revision metadata changed and requires design clarification.',
    priority: 'high',
    assigneeRoleKeys: ['design-coordinator'],
    appliedAt: T2,
  });

  pushGate(
    gates,
    'authority-safe-raise-rfi',
    rfiApply.status === 'APPLIED',
    'Explicit allowed authority produced a Nexus-local RAISE_RFI application.',
    `RAISE_RFI did not apply; status ${rfiApply.status}.`,
  );

  if (rfiApply.status !== 'APPLIED') {
    return {
      schema: NEXUS_BIM_CONTRACT_E2E_HARNESS_SCHEMA,
      provenance: 'SYNTHETIC_DEMO',
      overall: 'BLOCKED',
      gates,
      canonical: {
        nexusObjectId: NEXUS_OBJECT_ID,
        ifcGlobalId: IFC_OBJECT_GLOBAL_ID,
        diagnosticExpressIdBaseline: baselineCandidate?.diagnosticExpressId,
        diagnosticExpressIdCurrent: currentCandidate?.diagnosticExpressId,
        changeEventId: changeEvent.id,
      },
      externalValidation: {
        realIfc: 'BLOCKED',
        trustedViewer: 'BLOCKED',
        androidFold: 'BLOCKED',
        partnerHandoff: 'BLOCKED',
        fabStationCapability: 'BLOCKED_PENDING_PARTNER_EVIDENCE',
      },
      boundaries: ['Synthetic contract harness stopped at WorkSuite RAISE_RFI Apply.'],
    };
  }

  const commit = commitWorkSuiteActionToProjectMemory({
    memory,
    sourceEventId: changeEvent.id,
    actionEvent: rfiApply.actionEvent,
    humanDecision: rfiApply.humanDecision,
    issueRecord: rfiApply.issue,
    timelineEventId: TIMELINE_ID,
  });

  pushGate(
    gates,
    'project-memory-semantic-commit',
    commit.status === 'COMMITTED',
    'Issue + human decision + WorkSuite action + Timeline were committed as one Project Memory semantic unit.',
    `Project Memory semantic commit returned ${commit.status}.`,
  );

  if (commit.status === 'COMMITTED') memory = commit.memory;

  const issueIntegrity = validateNexusIssueInvariants(memory);
  pushGate(
    gates,
    'canonical-rfi-integrity',
    commit.status === 'COMMITTED' && issueIntegrity.ok,
    'Canonical RFI Issue and its Change Event / WorkSuite backlinks passed integrity checks.',
    `Canonical Issue integrity reported ${issueIntegrity.issues.length} issue(s).`,
  );

  const exactRetry = applyWorkSuiteRaiseRfi({
    changeEvent,
    projectEvents: memory.nexusEvents,
    projectIssues: memory.issues,
    authorityDecision,
    reviewerPersonId: PERSON_ID,
    explicitApply: true,
    expectedRevision: 0,
    applicationEventId: RFI_ACTION_EVENT_ID,
    humanDecisionId: HUMAN_DECISION_ID,
    issueId: ISSUE_ID,
    question: 'Confirm revised cable tray scope before installation proceeds.',
    reason: 'IFC revision metadata changed and requires design clarification.',
    priority: 'high',
    assigneeRoleKeys: ['design-coordinator'],
    appliedAt: T2,
  });
  pushGate(
    gates,
    'raise-rfi-idempotent-retry',
    exactRetry.status === 'ALREADY_APPLIED',
    'Exact RAISE_RFI retry resolved idempotently without a duplicate Issue.',
    `Exact RAISE_RFI retry returned ${exactRetry.status}.`,
  );

  const spatial = createNexusSpatialHandOff({
    identity: {
      ...identity,
      modelRevision: 'REV-B',
      sourceFileName: 'synthetic-current.ifc',
      sourceFileSha256: CURRENT_SHA,
      diagnosticExpressId: currentCandidate?.diagnosticExpressId,
    },
    operationalContext: {
      projectId: PROJECT_ID,
      worldId: WORLD_ID,
      issueId: ISSUE_ID,
      changeEventId: CHANGE_EVENT_ID,
      selectedOperationalState: 'AWAITING_HUMAN_REVIEW',
    },
    createdAt: T2,
    source: 'worksuite',
  });
  pushGate(
    gates,
    'bounded-spatial-packet-no-execution',
    Boolean(
      spatial.ok &&
        spatial.executionState === 'PACKET_PREPARED_NO_PARTNER_EXECUTION' &&
        spatial.packet.boundaries.adapterExecution === false &&
        spatial.packet.boundaries.writesPartnerState === false &&
        spatial.packet.boundaries.writesNexusState === false &&
        spatial.packet.boundaries.isLiveSync === false,
    ),
    'Spatial packet prepared with immutable no-execution/no-write/no-sync boundaries.',
    'Spatial hand-off boundary was not preserved.',
  );

  const overall = gates.every((gate) => gate.state === 'AUTOMATED_PASS') ? 'AUTOMATED_PASS' : 'BLOCKED';

  return {
    schema: NEXUS_BIM_CONTRACT_E2E_HARNESS_SCHEMA,
    provenance: 'SYNTHETIC_DEMO',
    overall,
    gates,
    canonical: {
      nexusObjectId: NEXUS_OBJECT_ID,
      ifcGlobalId: IFC_OBJECT_GLOBAL_ID,
      diagnosticExpressIdBaseline: baselineCandidate?.diagnosticExpressId,
      diagnosticExpressIdCurrent: currentCandidate?.diagnosticExpressId,
      changeEventId: changeEvent.id,
      rfiIssueId: commit.status === 'COMMITTED' ? commit.issueId : undefined,
      rfiActionEventId: commit.status === 'COMMITTED' ? commit.canonicalActionEventId : undefined,
      timelineEventId: commit.status === 'COMMITTED' ? commit.timelineEventId : undefined,
    },
    externalValidation: {
      realIfc: 'BLOCKED',
      trustedViewer: 'BLOCKED',
      androidFold: 'BLOCKED',
      partnerHandoff: 'BLOCKED',
      fabStationCapability: 'BLOCKED_PENDING_PARTNER_EVIDENCE',
    },
    boundaries: [
      'AUTOMATED_PASS applies only to deterministic SYNTHETIC_DEMO contract composition.',
      'This harness never upgrades synthetic intake to REAL IFC PASS.',
      'This harness does not validate geometry, coordinates, Psets, materials, tolerance or clash behaviour.',
      'Spatial packet preparation is not PARTNER HANDOFF PASS and executes no FabStation adapter.',
      'No external RFI, partner state or BIM source state is written.',
    ],
  };
};
