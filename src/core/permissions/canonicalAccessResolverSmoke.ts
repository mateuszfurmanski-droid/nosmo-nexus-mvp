import assert from 'node:assert/strict';
import type {
  NexusPermissionGrantRecord,
  NexusProjectParticipationRecord,
} from '../../data/schemas/access.schema';
import { resolveNexusCloudWriteAccess } from '../storage/cloudAccessResolution';

const evaluatedAt = '2026-08-22T14:10:00.000Z';
const personId = 'person-cloud-smoke';
const projectId = 'project-esafe-catania';
const worldId = 'world-esafe-catania';
const participationId = 'participation-cloud-smoke';

const participation: NexusProjectParticipationRecord = {
  id: participationId,
  status: 'active',
  title: 'Cloud smoke participation',
  createdAt: evaluatedAt,
  updatedAt: evaluatedAt,
  sourceSystem: 'nexus',
  confidence: 'confirmed',
  personId,
  projectId,
  worldId,
  participationStatus: 'active',
  roleAssignmentIds: [],
  tradeAssignmentIds: [],
  permissionGrantIds: ['grant-cloud-write'],
  approvalScopeIds: [],
  competenceRequirementIds: [],
};

const allow: NexusPermissionGrantRecord = {
  id: 'grant-cloud-write',
  status: 'active',
  title: 'Allow Cloud write',
  createdAt: evaluatedAt,
  updatedAt: evaluatedAt,
  sourceSystem: 'nexus',
  confidence: 'confirmed',
  participationId,
  effect: 'allow',
  moduleId: 'cloud',
  actionKey: 'cloud.file.write',
  reason: 'Controlled Cloud upload smoke',
};

const decide = (
  overrides: Partial<Parameters<typeof resolveNexusCloudWriteAccess>[0]> = {},
) =>
  resolveNexusCloudWriteAccess({
    decisionId: 'decision-cloud-smoke',
    personId,
    projectId,
    worldId,
    evaluatedAt,
    participations: [participation],
    permissionGrants: [allow],
    ...overrides,
  });

assert.equal(decide().result, 'allowed');
assert.equal(decide().reason, 'explicit-grant');

const unbound = decide({ personId: undefined });
assert.equal(unbound.result, 'denied');
assert.equal(unbound.reason, 'identity-unresolved');

const noGrant = decide({ permissionGrants: [] });
assert.equal(noGrant.result, 'denied');
assert.equal(noGrant.reason, 'no-policy-match');

const wrongWorld = decide({ worldId: 'world-wrong' });
assert.equal(wrongWorld.result, 'denied');
assert.equal(wrongWorld.reason, 'participation-invalid');

const duplicateParticipation = decide({ participations: [participation, { ...participation, id: 'participation-duplicate' }] });
assert.equal(duplicateParticipation.result, 'denied');
assert.equal(duplicateParticipation.reason, 'participation-invalid');

const deny: NexusPermissionGrantRecord = {
  ...allow,
  id: 'grant-cloud-deny',
  effect: 'deny',
  actionKey: undefined,
  reason: 'Explicit Cloud deny smoke',
};

const participationWithDeny = {
  ...participation,
  permissionGrantIds: ['grant-cloud-write', 'grant-cloud-deny'],
};
const denied = decide({
  participations: [participationWithDeny],
  permissionGrants: [allow, deny],
});
assert.equal(denied.result, 'denied');
assert.equal(denied.reason, 'explicit-deny');

const expiredAllow = {
  ...allow,
  validTo: '2026-08-21T00:00:00.000Z',
};
const expired = decide({ permissionGrants: [expiredAllow] });
assert.equal(expired.result, 'denied');
assert.equal(expired.reason, 'no-policy-match');

console.log(
  JSON.stringify(
    {
      status: 'PASS',
      level: 'PURE_CANONICAL_ACCESS_NO_DB',
      exactCloudWriteGrant: 'PASS',
      unboundIdentity: 'DENIED',
      missingGrant: 'DENIED',
      wrongWorld: 'DENIED',
      ambiguousParticipation: 'DENIED',
      explicitDenyPrecedence: 'PASS',
      expiredGrant: 'DENIED',
      providerWritePerformed: false,
      databaseMutationPerformed: false,
    },
    null,
    2,
  ),
);
