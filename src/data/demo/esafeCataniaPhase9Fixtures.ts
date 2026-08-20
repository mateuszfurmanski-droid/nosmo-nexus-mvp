import type { NexusCanonicalObjectRecord } from '../schemas/canonicalObject.schema';
import type { NexusTemporalObjectStateRecord } from '../schemas/temporal.schema';
import type { NexusProjectMemorySnapshot } from '../projectMemory';

const FIXTURE_RECORDED_AT = '2026-08-20T00:00:00Z';
const PROJECT_ID = 'project-esafe-catania';
const WORLD_ID = 'world-esafe-catania';
const D51_DOI_URL = 'https://doi.org/10.5281/zenodo.6260847';

export const esafePhase9CanonicalObjects: NexusCanonicalObjectRecord[] = [
  {
    id: 'canonical-esafe-person-durso',
    title: "Sebastiano D'Urso",
    description: 'Canonical person reference backed only by D5.1 authorship; exact project-participation dates remain unknown.',
    objectType: 'Person',
    projectId: PROJECT_ID,
    worldId: WORLD_ID,
    lifecycleStatus: 'active',
    canonicalSourceType: 'import',
    sourceReference: 'Zenodo Deliverable D5.1 author metadata',
    confidenceScore: 100,
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
];

export const esafePhase9TemporalRecords: NexusTemporalObjectStateRecord[] = [
  {
    objectId: 'canonical-esafe-evidence-d51',
    validFrom: '2022-02-24T00:00:00Z',
    occurredAt: '2022-02-24T00:00:00Z',
    recordedAt: FIXTURE_RECORDED_AT,
    sourceReference: 'Derived Nexus evidence state from Zenodo DOI 10.5281/zenodo.6260847',
    temporalProvenance: 'DERIVED',
    verificationState: 'VERIFIED_BY_SOURCE',
    datePrecision: 'day',
  },
];

export const applyEsafeCataniaPhase9Fixtures = (memory: NexusProjectMemorySnapshot): NexusProjectMemorySnapshot => {
  memory.canonicalObjects.push(...esafePhase9CanonicalObjects);
  memory.temporalRecords.push(...esafePhase9TemporalRecords);
  return memory;
};
