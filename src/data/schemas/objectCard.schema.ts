import type { NexusObjectType } from '../../registry/registryTypes';
import type { NexusCanonicalObjectRecord } from './canonicalObject.schema';
import type { NexusId } from './common.schema';

/**
 * Object Card v1 is a Project Memory projection, not a second source of truth.
 *
 * A card must resolve its current values, relations, provenance, evidence,
 * lifecycle, decisions and audit from canonical Project Memory records.
 */
export type NexusObjectCardProfile =
  | 'Project'
  | 'Material'
  | 'Product'
  | 'Asset'
  | 'Component'
  | 'Equipment'
  | 'Space'
  | 'Document'
  | 'Task'
  | 'Issue'
  | 'WorkPackage'
  | 'RFI'
  | 'Approval'
  | 'Evidence'
  | 'Generic';

export type NexusObjectCardSection =
  | 'identity'
  | 'location-context'
  | 'relations'
  | 'source-provenance'
  | 'evidence'
  | 'lifecycle'
  | 'operational-state'
  | 'human-decisions'
  | 'audit-history'
  | 'reporting-actions';

export type NexusObjectCardSectionMode = 'required' | 'conditional' | 'profile-specific';

export interface NexusObjectCardSectionDefinition {
  section: NexusObjectCardSection;
  mode: NexusObjectCardSectionMode;
}

export interface NexusObjectCardProfileDefinition {
  profile: NexusObjectCardProfile;
  objectTypes: NexusObjectType[];
  sections: NexusObjectCardSectionDefinition[];
  domainFieldKeys: string[];
  notes?: string;
}

const sharedSections: NexusObjectCardSectionDefinition[] = [
  { section: 'identity', mode: 'required' },
  { section: 'location-context', mode: 'conditional' },
  { section: 'relations', mode: 'required' },
  { section: 'source-provenance', mode: 'required' },
  { section: 'evidence', mode: 'conditional' },
  { section: 'lifecycle', mode: 'conditional' },
  { section: 'operational-state', mode: 'conditional' },
  { section: 'human-decisions', mode: 'conditional' },
  { section: 'audit-history', mode: 'required' },
  { section: 'reporting-actions', mode: 'conditional' },
];

export const NEXUS_OBJECT_CARD_V1_PROFILES: NexusObjectCardProfileDefinition[] = [
  {
    profile: 'Project',
    objectTypes: ['Project', 'ProjectWorld'],
    sections: sharedSections,
    domainFieldKeys: ['project-status', 'project-world', 'participants', 'project-source'],
  },
  {
    profile: 'Material',
    objectTypes: ['Material'],
    sections: sharedSections,
    domainFieldKeys: [
      'material-family',
      'composition',
      'batch-lot',
      'quantity-unit',
      'supplier-manufacturer',
      'epd-reference',
      'circular-status',
      'reuse-recovery-recycling-route',
      'condition-contamination',
    ],
  },
  {
    profile: 'Product',
    objectTypes: ['Product'],
    sections: sharedSections,
    domainFieldKeys: [
      'manufacturer',
      'product-name-model',
      'product-code',
      'specification',
      'technical-data',
      'warranty',
      'certifications',
      'epd-declarations',
      'approved-alternative-relations',
    ],
  },
  {
    profile: 'Asset',
    objectTypes: ['Asset'],
    sections: sharedSections,
    domainFieldKeys: [
      'serial-instance-id',
      'installation-location',
      'commissioning-state',
      'warranty',
      'inspection-schedule',
      'maintenance-history',
      'operating-state',
      'end-of-life-decision',
    ],
  },
  {
    profile: 'Component',
    objectTypes: ['Component', 'Door', 'InstallationObject'],
    sections: sharedSections,
    domainFieldKeys: [
      'component-type',
      'design-schedule-id',
      'installation-state',
      'installer',
      'inspector-approver',
      'required-evidence',
      'linked-product-material',
      'defects-snags',
      'replacement-reuse-recovery-route',
    ],
    notes: 'Door and specialist installation cards are typed Component cards, not separate data silos.',
  },
  {
    profile: 'Equipment',
    objectTypes: ['Equipment'],
    sections: sharedSections,
    domainFieldKeys: [
      'manufacturer-model',
      'serial-number',
      'owner-custodian',
      'assigned-project-location',
      'inspection-calibration-state',
      'service-history',
      'certification',
      'availability',
      'handover-return-status',
    ],
  },
  {
    profile: 'Space',
    objectTypes: ['Room', 'Floor'],
    sections: sharedSections,
    domainFieldKeys: ['building', 'level', 'space-zone', 'occupancy-use', 'contained-object-relations'],
  },
  {
    profile: 'Document',
    objectTypes: ['File', 'Document', 'Drawing'],
    sections: sharedSections,
    domainFieldKeys: ['document-type', 'revision', 'source-file', 'approval-state', 'supersession'],
  },
  {
    profile: 'Task',
    objectTypes: ['Task'],
    sections: sharedSections,
    domainFieldKeys: ['task-state', 'assignee', 'trade-work-package', 'requirements', 'completion-evidence'],
  },
  {
    profile: 'Issue',
    objectTypes: ['Issue'],
    sections: sharedSections,
    domainFieldKeys: ['issue-state', 'severity', 'owner', 'blocking-relations', 'resolution'],
  },
  {
    profile: 'WorkPackage',
    objectTypes: ['WorkPackage'],
    sections: sharedSections,
    domainFieldKeys: ['trade', 'scope', 'responsible-team', 'requirements', 'delivery-state'],
  },
  {
    profile: 'RFI',
    objectTypes: ['Decision'],
    sections: sharedSections,
    domainFieldKeys: ['clarification-state', 'question', 'response', 'authority', 'affected-objects'],
    notes: 'Decision is the current canonical object type available for bounded RFI/clarification projections.',
  },
  {
    profile: 'Approval',
    objectTypes: ['Approval'],
    sections: sharedSections,
    domainFieldKeys: ['approval-state', 'authority', 'decision-reference', 'approved-object-relations'],
  },
  {
    profile: 'Evidence',
    objectTypes: ['Evidence', 'Inspection'],
    sections: sharedSections,
    domainFieldKeys: ['evidence-type', 'inspection-state', 'captured-by', 'source-reference', 'verification-state'],
  },
  {
    profile: 'Generic',
    objectTypes: ['Note', 'Message', 'TimelineEvent', 'Other'],
    sections: sharedSections,
    domainFieldKeys: [],
  },
];

const profileByObjectType = new Map<NexusObjectType, NexusObjectCardProfile>();
for (const definition of NEXUS_OBJECT_CARD_V1_PROFILES) {
  for (const objectType of definition.objectTypes) {
    profileByObjectType.set(objectType, definition.profile);
  }
}

export type NexusDedicatedCardSurface = 'person-card' | 'company-card';

export type NexusObjectCardResolution =
  | {
      surface: 'object-card';
      profile: NexusObjectCardProfile;
    }
  | {
      surface: 'dedicated-card';
      dedicatedSurface: NexusDedicatedCardSurface;
    };

export const resolveNexusObjectCardSurface = (objectType: NexusObjectType): NexusObjectCardResolution => {
  if (objectType === 'Person') {
    return { surface: 'dedicated-card', dedicatedSurface: 'person-card' };
  }

  if (objectType === 'Company') {
    return { surface: 'dedicated-card', dedicatedSurface: 'company-card' };
  }

  return {
    surface: 'object-card',
    profile: profileByObjectType.get(objectType) ?? 'Generic',
  };
};

/**
 * Lightweight descriptor for rendering/resolving a card from Project Memory.
 * It deliberately contains no duplicated object values, status or audit state.
 */
export interface NexusObjectCardProjectionDescriptor {
  schema: 'nexus-object-card-projection/v1';
  objectId: NexusId;
  objectType: NexusObjectType;
  profile: NexusObjectCardProfile;
  projectId?: NexusId;
  worldId?: NexusId;
  projectionSource: 'project-memory';
}

export const createNexusObjectCardProjectionDescriptor = (
  object: NexusCanonicalObjectRecord,
): NexusObjectCardProjectionDescriptor | null => {
  const resolution = resolveNexusObjectCardSurface(object.objectType);
  if (resolution.surface !== 'object-card') {
    return null;
  }

  return {
    schema: 'nexus-object-card-projection/v1',
    objectId: object.id,
    objectType: object.objectType,
    profile: resolution.profile,
    projectId: object.projectId,
    worldId: object.worldId,
    projectionSource: 'project-memory',
  };
};
