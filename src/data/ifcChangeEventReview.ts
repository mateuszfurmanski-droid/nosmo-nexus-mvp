import type { NexusEventRecord } from './schemas/audit.schema';
import type { NexusId, NexusIsoDateTime } from './schemas/common.schema';
import type { NexusIfcObjectIdentityProjection } from './schemas/ifcExternalReference.schema';
import type { NexusIfcRevisionComparisonResult } from './ifcRevisionComparison';

export const NEXUS_IFC_CHANGE_REVIEW_SCHEMA = 'nexus-ifc-change-review/v1' as const;

export type NexusOperationalChangeDecisionCode =
  | 'NO_IMPACT'
  | 'RE_PLAN_TASK'
  | 'HOLD_WORK'
  | 'RAISE_RFI'
  | 'UPDATE_PROCUREMENT'
  | 'NEW_EVIDENCE_REQUIRED'
  | 'RE_INSPECTION_REQUIRED'
  | 'ACCEPT_AS_BUILT_DIFFERENCE';

export type NexusChangeDecisionExecutionReadiness =
  | 'REVIEW_ONLY_ACTION_ENGINE_PORT_REQUIRED'
  | 'BLOCKED_PENDING_AUTHORISED_PROCUREMENT_CONTRACT'
  | 'BLOCKED_PENDING_HIGH_AUTHORITY_SIGNOFF';

export interface NexusOperationalChangeDecisionOption {
  code: NexusOperationalChangeDecisionCode;
  authorityClass: string;
  allowedForCurrentComparison: boolean;
  executionReadiness: NexusChangeDecisionExecutionReadiness;
  reason?: string;
}

export interface NexusIfcChangeReviewEnvelope {
  schema: typeof NEXUS_IFC_CHANGE_REVIEW_SCHEMA;
  eligible: boolean;
  canonicalEvent?: NexusEventRecord;
  comparisonState: NexusIfcRevisionComparisonResult['state'];
  decisionOptions: NexusOperationalChangeDecisionOption[];
  requiresHumanReview: true;
  requiresExplicitApply: true;
  notes: string[];
}

export interface NexusIfcChangeReviewInput {
  eventId: NexusId;
  identity: NexusIfcObjectIdentityProjection;
  comparison: NexusIfcRevisionComparisonResult;
  occurredAt: NexusIsoDateTime;
  recordedAt: NexusIsoDateTime;
  createdBy?: NexusId;
}

const decisionOptionsFor = (
  comparisonState: NexusIfcRevisionComparisonResult['state'],
): NexusOperationalChangeDecisionOption[] => {
  const comparisonBlocked = comparisonState === 'COMPARISON_BLOCKED';

  return [
    {
      code: 'NO_IMPACT',
      authorityClass: 'PROJECT_MANAGER_OR_DESIGN_COORDINATOR',
      allowedForCurrentComparison: !comparisonBlocked,
      executionReadiness: 'REVIEW_ONLY_ACTION_ENGINE_PORT_REQUIRED',
      reason: comparisonBlocked ? 'NO_IMPACT is not available while source comparison is blocked.' : undefined,
    },
    {
      code: 'RE_PLAN_TASK',
      authorityClass: 'PROJECT_MANAGER_OR_TRADE_SUPERVISOR',
      allowedForCurrentComparison: true,
      executionReadiness: 'REVIEW_ONLY_ACTION_ENGINE_PORT_REQUIRED',
    },
    {
      code: 'HOLD_WORK',
      authorityClass: 'PROJECT_MANAGER_OR_TRADE_SUPERVISOR',
      allowedForCurrentComparison: true,
      executionReadiness: 'REVIEW_ONLY_ACTION_ENGINE_PORT_REQUIRED',
    },
    {
      code: 'RAISE_RFI',
      authorityClass: 'PROJECT_MANAGER_OR_DESIGN_COORDINATOR',
      allowedForCurrentComparison: true,
      executionReadiness: 'REVIEW_ONLY_ACTION_ENGINE_PORT_REQUIRED',
    },
    {
      code: 'UPDATE_PROCUREMENT',
      authorityClass: 'PROJECT_MANAGER_OR_PROCUREMENT_OWNER',
      allowedForCurrentComparison: true,
      executionReadiness: 'BLOCKED_PENDING_AUTHORISED_PROCUREMENT_CONTRACT',
      reason: 'Procurement mutation remains blocked until an authorised procurement record/connector contract exists.',
    },
    {
      code: 'NEW_EVIDENCE_REQUIRED',
      authorityClass: 'TRADE_SUPERVISOR_OR_QA',
      allowedForCurrentComparison: true,
      executionReadiness: 'REVIEW_ONLY_ACTION_ENGINE_PORT_REQUIRED',
    },
    {
      code: 'RE_INSPECTION_REQUIRED',
      authorityClass: 'AUTHORISED_SUPERVISOR_OR_INSPECTOR',
      allowedForCurrentComparison: true,
      executionReadiness: 'REVIEW_ONLY_ACTION_ENGINE_PORT_REQUIRED',
    },
    {
      code: 'ACCEPT_AS_BUILT_DIFFERENCE',
      authorityClass: 'AUTHORISED_PROJECT_DESIGN_QA_HIGH_AUTHORITY',
      allowedForCurrentComparison: false,
      executionReadiness: 'BLOCKED_PENDING_HIGH_AUTHORITY_SIGNOFF',
      reason: comparisonBlocked
        ? 'As-built acceptance is prohibited while source comparison is blocked.'
        : 'Requires authenticated high-authority sign-off plus immutable evidence/inspection contract before execution.',
    },
  ];
};

/**
 * Projects an eligible IFC revision comparison into the existing canonical
 * NexusEventRecord model. The envelope itself is review state only and is not a
 * second event store. Human decision and WorkSuite Apply remain later actions.
 */
export const createIfcChangeReviewEnvelope = (
  input: NexusIfcChangeReviewInput,
): NexusIfcChangeReviewEnvelope => {
  if (
    input.identity.nexusObjectId !== input.comparison.nexusObjectId ||
    input.identity.ifcGlobalId !== input.comparison.ifcGlobalId
  ) {
    throw new Error('IFC comparison identity does not match the explicit Nexus Object / IFC GlobalId mapping.');
  }

  const decisionOptions = decisionOptionsFor(input.comparison.state);

  if (input.comparison.state === 'NO_CHANGE') {
    return {
      schema: NEXUS_IFC_CHANGE_REVIEW_SCHEMA,
      eligible: false,
      comparisonState: input.comparison.state,
      decisionOptions,
      requiresHumanReview: true,
      requiresExplicitApply: true,
      notes: [
        'No Change Event is created from NO_CHANGE structural comparison by default.',
        'A human may still review the underlying validation evidence separately.',
      ],
    };
  }

  const blocked = input.comparison.state === 'COMPARISON_BLOCKED';
  const event: NexusEventRecord = {
    id: input.eventId,
    status: 'draft',
    title: blocked ? 'IFC revision comparison blocked' : 'IFC revision change requires human review',
    description: `${input.comparison.previousRevision} -> ${input.comparison.currentRevision} for ${input.identity.ifcGlobalId}`,
    tags: ['bim', 'ifc', 'revision-change', 'human-review'],
    createdAt: input.recordedAt,
    updatedAt: input.recordedAt,
    createdBy: input.createdBy,
    sourceSystem: 'bim-ifc',
    sourceRecordId: input.comparison.schema,
    confidence: 'confirmed',
    provenanceClass: 'DERIVED',
    eventType: 'IFC_REVISION_CHANGE_REVIEW',
    occurredAt: input.occurredAt,
    recordedAt: input.recordedAt,
    actorType: 'SYSTEM',
    actorId: undefined,
    projectId: input.identity.projectId,
    worldId: input.identity.worldId,
    primaryObjectId: input.identity.nexusObjectId,
    relatedObjectIds: [],
    eventSourceType: 'IMPORT',
    sourceReference: `${input.comparison.previousSourceFileName} -> ${input.comparison.currentSourceFileName}`,
    eventState: blocked ? 'SOURCE_COMPARISON_BLOCKED' : 'AWAITING_HUMAN_REVIEW',
    summary: blocked
      ? 'IFC revision source/lineage conditions block operational interpretation and require human source review.'
      : `IFC revision comparison found ${input.comparison.changeKind}; an authorised human decision is required before any operational action.`,
    verificationState: 'IMPORTED_UNVERIFIED',
    correlationId: `${input.identity.nexusObjectId}:${input.identity.ifcGlobalId}:${input.comparison.previousRevision}:${input.comparison.currentRevision}`,
  };

  return {
    schema: NEXUS_IFC_CHANGE_REVIEW_SCHEMA,
    eligible: true,
    canonicalEvent: event,
    comparisonState: input.comparison.state,
    decisionOptions,
    requiresHumanReview: true,
    requiresExplicitApply: true,
    notes: [
      'canonicalEvent is the event identity to persist/project later; no BIM-specific parallel event ID is created.',
      'Creating or persisting this event does not apply a WorkSuite action.',
      'Authority must come from active Project Participation, project function and scope; profession alone is insufficient.',
      'RELEASE_HOLD is a later compensating action and is not a primary change-review decision.',
    ],
  };
};
