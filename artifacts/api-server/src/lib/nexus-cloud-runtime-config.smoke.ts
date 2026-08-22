import assert from "node:assert/strict";
import { loadNexusCloudGoogleDriveRuntimeConfig } from "./nexus-cloud-runtime-config";

const env = {
  NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_JSON: JSON.stringify({
    schema: "nexus-cloud-google-drive-runtime/v1",
    connectorDefinitionId: "connector-google-drive-cloud",
    connectorAccountId: "account-google-drive-cloud",
    tenantId: "tenant-nexus-cloud",
    secretReference: "NEXUS_SECRET_GOOGLE_DRIVE_OAUTH",
    projects: [
      {
        projectId: "project-esafe-catania",
        worldId: "world-esafe-catania",
        targets: {
          "00_INBOX": "drive-folder-inbox",
          "01_PENDING_GRAPH_LINK": "drive-folder-pending",
        },
      },
    ],
  }),
} as NodeJS.ProcessEnv;

const config = loadNexusCloudGoogleDriveRuntimeConfig(env);
assert.equal(config.connectorDefinition.lifecycleState, "LIVE");
assert.equal(config.connectorDefinition.integrationLevel, 5);
assert.equal(config.connectorAccount.secretReference, "NEXUS_SECRET_GOOGLE_DRIVE_OAUTH");
assert.equal(config.routingIndex.projects[0]?.id, "project-esafe-catania");
assert.equal(config.routingIndex.worlds[0]?.id, "world-esafe-catania");
assert.equal(config.targetMappings.length, 2);
assert.equal(config.targetMappings[0]?.providerSourceSystem, "google-drive");

assert.throws(
  () =>
    loadNexusCloudGoogleDriveRuntimeConfig({
      NEXUS_CLOUD_GOOGLE_DRIVE_CONFIG_JSON: JSON.stringify({
        schema: "nexus-cloud-google-drive-runtime/v1",
        connectorDefinitionId: "connector-google-drive-cloud",
        connectorAccountId: "account-google-drive-cloud",
        tenantId: "tenant-nexus-cloud",
        secretReference: "BROWSER_TOKEN",
        projects: [],
      }),
    } as NodeJS.ProcessEnv),
  /NEXUS_CLOUD_CONFIG_SECRET_REFERENCE_REJECTED/,
);

console.log("PASS nexus-cloud-runtime-config smoke");
