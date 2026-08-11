import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = process.cwd();
const read = (relative) => readFileSync(resolve(repoRoot, relative), "utf8");
const api = read("scripts/src/nexus-cloud-storage-api.mjs");
const workflow = read(".github/workflows/typecheck.yml");

function assert(condition, reason) {
  if (!condition) throw new Error(`Nexus Cloud Storage server guard validation failed: ${reason}`);
}

function assertApiContains(needle, reason) {
  assert(api.includes(needle), `${reason} (${needle})`);
}

assertApiContains(
  "nexus-cloud-storage-project-world-server-guard/v1",
  "missing server project-world guard schema",
);
assertApiContains("driveManagedProjectWorlds", "missing server managed Project World registry");
assertApiContains("NEXUS_DEMO_PROJECT_001_eSAFE_CATANIA", "missing server e-SAFE project guard");
assertApiContains("RIVERSIDE_DEMO_PROJECT", "missing server Riverside project guard");
assertApiContains("worldId: \"esafe-demo\"", "missing server e-SAFE world guard");
assertApiContains("worldId: \"dev\"", "missing server Riverside world guard");
assertApiContains("1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ", "missing e-SAFE pending graph server target");
assertApiContains("1ffW9qCJQKCpAI4T9YJsYjWDdwpxCwHgw", "missing Riverside pending graph server target");
assertApiContains("NEXUS_CLOUD_WORLD_REQUIRED", "known Drive projects must require worldId");
assertApiContains("NEXUS_CLOUD_PROJECT_WORLD_MISMATCH", "known Drive projects must fail closed on world mismatch");
assertApiContains("resolveProjectWorldGuard(projectId, worldId)", "server must resolve guard during metadata decoding");
assertApiContains("normaliseReadRequest(url)", "read/delete path must normalise project-world request");
assertApiContains("record.scope.worldId", "object lookup must include worldId scope");
assertApiContains("X-Nexus-World-Id", "read response should expose stored world scope");
assertApiContains("provider-neutral", "unrelated projects must remain provider-neutral instead of being guessed into Drive");

assert(
  workflow.includes("validate-nexus-cloud-storage-project-world-server-guard.mjs"),
  "CI workflow must run the server guard validator",
);
assert(workflow.includes("ci-esafe-cloud-object-001"), "CI smoke must write a guarded e-SAFE object");
assert(workflow.includes("NEXUS_CLOUD_PROJECT_WORLD_MISMATCH"), "CI smoke must assert mismatch fail-closed");
assert(workflow.includes("NEXUS_CLOUD_WORLD_REQUIRED"), "CI smoke must assert missing world fail-closed");
assert(workflow.includes("worldId=NEXUS_CLOUD_PROJECT_WORLD_MISMATCH"), "CI smoke must assert guarded read mismatch fail-closed marker");

console.log("PASS validate-nexus-cloud-storage-project-world-server-guard");
