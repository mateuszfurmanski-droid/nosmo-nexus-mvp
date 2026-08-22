import assert from "node:assert/strict";
import { createNexusCloudOperationIdentity } from "./nexus-cloud-operation-identity";

const base = {
  workspaceId: 7,
  projectId: "project-esafe-catania",
  worldId: "world-esafe-catania",
  idempotencyKey: "cloud-upload-retry-0001",
};

const first = createNexusCloudOperationIdentity(base);
const retry = createNexusCloudOperationIdentity(base);
assert.deepEqual(retry, first, "exact HTTP retry must reproduce exact Cloud operation IDs");

const anotherWorld = createNexusCloudOperationIdentity({
  ...base,
  worldId: "world-other",
});
assert.notEqual(
  anotherWorld.pendingAssetId,
  first.pendingAssetId,
  "same idempotency key in another world must not reuse pending identity",
);
assert.notEqual(
  anotherWorld.accessDecisionId,
  first.accessDecisionId,
  "same idempotency key in another world must not reuse access-decision identity",
);

console.log("PASS nexus-cloud-operation-identity smoke");
