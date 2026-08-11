import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const routingFile = resolve(repoRoot, "artifacts/nosmo-nexus/src/cloud-data/google-drive-routing.ts");
const source = readFileSync(routingFile, "utf8");

function assertContains(needle, reason) {
  if (!source.includes(needle)) {
    throw new Error(`Nexus Google Drive routing validation failed: ${reason} (${needle})`);
  }
}

function assertNotContains(needle, reason) {
  if (source.includes(needle)) {
    throw new Error(`Nexus Google Drive routing validation failed: ${reason} (${needle})`);
  }
}

const requiredIds = new Map([
  ["1n2E0dlb0W-5Qt2V7q5hjIGdX9T9c8Cs0", "cloud root"],
  ["1gCa35DoMCOioIdZbpYETvseEhA_D3n_Q", "Project Worlds root"],
  ["1Zu80-Yj9RocZJlBDXKXxId9ZRnn9EcOE", "e-SAFE canonical project root"],
  ["1_6fUF-W--i3lbtNpZRkhaU142ExI1k-g", "Riverside canonical project root"],
  ["1vZYrSX5kcgOH5izENzGwdL7wMLgbHIQNUJi9dfMuTEI", "NEXUS_CLOUD_ASSET_INDEX"],
  ["1ylZRQU-m1GbYVNMGFvu3FKMamXEyvGHv8XVf_kKsd6c", "NEXUS_CLOUD_ROUTING_RULES"],
  ["1ExuBm_62o-sSj0AhVUj_3IX56Tauc3zN6q3uFok86rU", "Migration Log"],
  ["1xsIITjBwTEE1z7whhub3RnsSXfrxwur9", "e-SAFE inbox"],
  ["1YnBK64v0ZfVTodBJXjAXPmNrug_qpR0P", "e-SAFE trade folder"],
  ["1LvwOZXJ5emW1N058kIMD9XV70J6cFhr9", "e-SAFE type folder"],
  ["1tObyu3iGZhwrXCU4CCmCVR-BPFkw7Eaz", "e-SAFE audit folder"],
  ["1n8xdmpeLMTkKp-Pe__XS4eLChaFo2H46", "Riverside inbox"],
  ["1VZ3TPt5d6N6VYvBb2tAUJYCCcnLJEl68", "Riverside trade folder"],
  ["14aYunionA4U7DqPdjqelcU7kAGgDse5w", "Riverside type folder"],
  ["1k5yqEoL-SD2fr8UwBFvXhxYLxF6Y7K-a", "Riverside audit folder"],
]);

for (const [id, label] of requiredIds) {
  assertContains(id, `missing ${label}`);
}

assertContains("NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "missing e-SAFE projectId");
assertContains("RIVERSIDE_DEMO_PROJECT", "missing Riverside projectId");
assertContains("esafe-demo", "missing e-SAFE worldId");
assertContains("dev", "missing Riverside worldId");
assertContains("No e-SAFE file may be stored in Riverside folders.", "missing explicit anti-mix rule");
assertContains("No Riverside file may be stored in e-SAFE folders.", "missing explicit anti-mix rule");
assertContains("Person Card evidence may link to a person, but it never replaces the projectId boundary.", "missing Person Card boundary rule");
assertContains("05_PRIVATE_DO_NOT_UPLOAD", "missing private exclusion folder");
assertContains("Never ingest into Project Graph", "missing private exclusion warning");
assertContains("resolveNexusGoogleDriveProjectRoute", "missing route resolver");
assertContains("isNexusGoogleDriveProjectBoundaryValid", "missing project boundary guard");
assertNotContains("01_ESAFE_PROJECT_WORLD", "deprecated e-SAFE personal-cloud bucket must not be canonical");
assertNotContains("1jCJW5_dqGMulRopirpyUdlDatyoGA2AN", "legacy e-SAFE source library must not be active root");
assertNotContains("19dVdcsI-kELmbFe6BR6ZcJTlf6kfbcz7", "legacy empty e-SAFE personal bucket must not be active root");

console.log("Nexus Google Drive routing validation passed.");
