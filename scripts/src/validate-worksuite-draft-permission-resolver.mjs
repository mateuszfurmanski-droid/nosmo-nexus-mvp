import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

const server = read("scripts/src/serve-nexus.mjs");
const resolver = read("scripts/src/worksuite-draft-permission-api.mjs");

assert(server.includes("handleWorkSuiteDraftPermissionApi"), "WorkSuite draft permission API must be wired into serve-nexus");
assert(server.includes("workSuiteDraftPermissions"), "health payload must expose WorkSuite draft permission status");
assert(server.includes("WorkSuite draft permission boundary"), "server start log must expose permission boundary");

assert(resolver.includes("/api/nexus/worksuite/draft-actions/status"), "status endpoint missing");
assert(resolver.includes("/api/nexus/worksuite/draft-actions/validate"), "validate endpoint missing");
assert(resolver.includes("blocked"), "blocked decision missing");
assert(resolver.includes("needs-review"), "needs-review decision missing");
assert(resolver.includes("ready-for-approval"), "ready-for-approval decision missing");
assert(resolver.includes("validation-only-no-mutation"), "resolver must remain validation-only");
assert(resolver.includes("actorContextAuthority: \"server-side-required\""), "resolver must declare server-side actor authority requirement");
assert(resolver.includes("clientActorContextTrusted: false"), "resolver must not trust client actor context");
assert(resolver.includes("productionActorLookup"), "resolver must document production actor lookup boundary");
assert(resolver.includes("pending-authenticated-person-project-participation-resolver"), "production Person/Project Participation lookup marker missing");
assert(resolver.includes("demoActorFixturesEnabled"), "demo actor fixture boundary missing");
assert(resolver.includes("explicit-demo-fixture"), "demo fixture authority label missing");
assert(resolver.includes("ignoredClientActorContext"), "resolver must report ignored client actor context");
assert(resolver.includes("serverSideLookupRequired"), "resolver must report server-side lookup requirement");
assert(resolver.includes("mutationExecution: false"), "resolver must not execute mutations");
assert(resolver.includes("approvalExecuted: false"), "resolver must not approve actions");
assert(resolver.includes("graphMutation: false"), "resolver must not mutate graph");
assert(resolver.includes("fileWrite: false"), "resolver must not write files");
assert(resolver.includes("UNSAFE_MUTATION_MODE"), "resolver must reject unsafe mutation mode");
assert(resolver.includes("UNSAFE_EXECUTION_BOUNDARY"), "resolver must reject unsafe execution boundary");
assert(resolver.includes("MISSING_ACTION_ENGINE_APPROVAL_GATE"), "resolver must require Action Engine approval gate");
assert(resolver.includes("denyOverrides.length > 0"), "deny override must be authoritative");
assert(resolver.includes("worksuite:draft:review"), "explicit draft review scope missing");

const forbidden = [
  /executeDraft/i,
  /executeAction/i,
  /approveAction/i,
  /createTask/i,
  /writeFile/i,
  /graph\.mutate/i,
  /OPENAI_API_KEY/i,
  /chat\.completions/i,
  /responses\.create/i,
];
for (const pattern of forbidden) {
  assert(!pattern.test(resolver), `resolver must not contain ${pattern}`);
}

console.log("PASS validate-worksuite-draft-permission-resolver");
