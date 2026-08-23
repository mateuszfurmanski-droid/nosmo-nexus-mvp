import assert from "node:assert/strict";
import {
  resolveNexusCanonicalAccess,
  type NexusCanonicalAccessRequest,
  type NexusPermissionGrantAccessView,
  type NexusProjectParticipationAccessView,
} from "../../../src/core/permissions/canonicalAccessResolver";

const EVALUATED_AT = "2026-08-22T15:20:00.000Z";
const PERSON_ID = "person-android-smoke";
const PROJECT_ID = "project-esafe-catania";
const WORLD_ID = "world-esafe-catania";
const PARTICIPATION_ID = "participation-android-smoke";
const HANDOFF_ACTION = "android.work-mode.handoff";
const WORKSUITE_ACTION = "worksuite.draft.review";

const participation = (
  permissionGrantIds: string[],
  overrides: Partial<NexusProjectParticipationAccessView> = {},
): NexusProjectParticipationAccessView => ({
  id: PARTICIPATION_ID,
  personId: PERSON_ID,
  projectId: PROJECT_ID,
  worldId: WORLD_ID,
  participationStatus: "active",
  permissionGrantIds,
  validFrom: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const grant = (
  id: string,
  effect: "allow" | "deny",
  actionKey: string | undefined,
  overrides: Partial<NexusPermissionGrantAccessView> = {},
): NexusPermissionGrantAccessView => ({
  id,
  participationId: PARTICIPATION_ID,
  effect,
  moduleId: "soft",
  actionKey,
  validFrom: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const request = (
  actionKey: string,
  input: Partial<NexusCanonicalAccessRequest> = {},
): NexusCanonicalAccessRequest => ({
  decisionId: `decision-${actionKey.replace(/[^a-z0-9]+/gi, "-")}`,
  personId: PERSON_ID,
  projectId: PROJECT_ID,
  worldId: WORLD_ID,
  moduleId: "soft",
  actionKey,
  evaluatedAt: EVALUATED_AT,
  participations: [],
  permissionGrants: [],
  ...input,
});

const expectDecision = (
  name: string,
  input: NexusCanonicalAccessRequest,
  result: "allowed" | "denied",
  reason: string,
) => {
  const decision = resolveNexusCanonicalAccess(input);
  assert.equal(decision.result, result, `${name}: result`);
  assert.equal(decision.reason, reason, `${name}: reason`);
};

expectDecision(
  "unbound identity fails closed",
  request(HANDOFF_ACTION, { personId: undefined }),
  "denied",
  "identity-unresolved",
);

expectDecision(
  "active participation alone never grants Android handoff",
  request(HANDOFF_ACTION, {
    participations: [participation([])],
  }),
  "denied",
  "no-policy-match",
);

const handoffAllow = grant("grant-handoff-allow", "allow", HANDOFF_ACTION);
expectDecision(
  "exact Android handoff allow succeeds",
  request(HANDOFF_ACTION, {
    participations: [participation([handoffAllow.id])],
    permissionGrants: [handoffAllow],
  }),
  "allowed",
  "explicit-grant",
);

expectDecision(
  "Android handoff allow does not authorize WorkSuite review",
  request(WORKSUITE_ACTION, {
    participations: [participation([handoffAllow.id])],
    permissionGrants: [handoffAllow],
  }),
  "denied",
  "no-policy-match",
);

const workSuiteAllow = grant("grant-worksuite-allow", "allow", WORKSUITE_ACTION);
expectDecision(
  "exact WorkSuite review allow succeeds",
  request(WORKSUITE_ACTION, {
    participations: [participation([workSuiteAllow.id])],
    permissionGrants: [workSuiteAllow],
  }),
  "allowed",
  "explicit-grant",
);

const broadDeny = grant("grant-soft-deny", "deny", undefined);
expectDecision(
  "explicit deny wins over exact allow",
  request(WORKSUITE_ACTION, {
    participations: [participation([workSuiteAllow.id, broadDeny.id])],
    permissionGrants: [workSuiteAllow, broadDeny],
  }),
  "denied",
  "explicit-deny",
);

expectDecision(
  "wrong Project World participation is rejected",
  request(HANDOFF_ACTION, {
    participations: [
      participation([handoffAllow.id], { worldId: "world-riverside-unconfirmed" }),
    ],
    permissionGrants: [handoffAllow],
  }),
  "denied",
  "participation-invalid",
);

console.log("NEXUS Android canonical authority fixtures: PASS");
