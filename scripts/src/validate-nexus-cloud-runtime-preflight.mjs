import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

const preflight = read(
  "artifacts/api-server/src/lib/nexus-cloud-runtime-preflight.ts",
);
const cli = read("artifacts/api-server/scripts/nexus-cloud-runtime-preflight.ts");
const evidence = JSON.parse(
  read("docs/NEXUS_CLOUD_ESAFE_DRIVE_MAPPING_EVIDENCE.json"),
);
const workflow = read(".github/workflows/typecheck.yml");

assert(
  preflight.includes('"nexus-cloud-runtime-preflight/v1"'),
  "runtime preflight schema is missing",
);
assert(
  preflight.includes('"project-esafe-catania"') &&
    preflight.includes('"world-esafe-catania"'),
  "preflight must remain scoped to the exact current e-SAFE Project World",
);
assert(
  preflight.includes('client.query("BEGIN READ ONLY")') &&
    preflight.includes('client.query("ROLLBACK")'),
  "database inspection must execute inside a read-only transaction",
);
assert(
  !preflight.includes("INSERT INTO") &&
    !preflight.includes("UPDATE nexus_") &&
    !preflight.includes("DELETE FROM") &&
    !preflight.includes("drizzle-kit"),
  "runtime preflight must not contain database mutation or migration commands",
);
assert(
  preflight.includes("secretValuesReturned: false") &&
    preflight.includes("providerWritePerformed: false") &&
    preflight.includes("databaseMutationPerformed: false"),
  "preflight must make its safety boundary explicit",
);
assert(
  preflight.includes("NEXUS_IDENTITY_BINDING_MODE") &&
    preflight.includes("REPL_ID") &&
    preflight.includes("NEXUS_PUBLIC_ORIGIN") &&
    preflight.includes("DATABASE_URL"),
  "preflight must cover runtime auth/origin/database prerequisites",
);
assert(
  preflight.includes("candidateAuthorityPathCount") &&
    preflight.includes("cloud.file.write") &&
    preflight.includes("nexus_identity_bindings"),
  "preflight must inspect the persisted identity/participation/exact allow candidate path",
);
assert(
  preflight.includes("google-oauth-refresh-token/v1") &&
    !preflight.includes("console.log(parsed.clientSecret)") &&
    !preflight.includes("console.log(parsed.refreshToken)"),
  "OAuth preflight may validate shape but must not print secret values",
);
assert(
  cli.includes("--require-ready") &&
    cli.includes("READY_FOR_CONTROLLED_E2E"),
  "CLI must support a deploy-gating readiness exit mode",
);

const expectedTargets = {
  "00_INBOX": "1xsIITjBwTEE1z7whhub3RnsSXfrxwur9",
  "01_PENDING_GRAPH_LINK": "1Pb1F_2PYtRt3YwhGFNdCLBK03s9TPbGZ",
  "02_BY_TRADE": "1YnBK64v0ZfVTodBJXjAXPmNrug_qpR0P",
  "03_BY_TYPE": "1LvwOZXJ5emW1N058kIMD9XV70J6cFhr9",
  "99_AUDIT": "1tObyu3iGZhwrXCU4CCmCVR-BPFkw7Eaz",
};
assert(
  evidence.schema === "nexus-cloud-provider-mapping-evidence/v1" &&
    evidence.canonicalProjectId === "project-esafe-catania" &&
    evidence.canonicalWorldId === "world-esafe-catania",
  "Drive evidence manifest has unexpected canonical scope",
);
assert(
  JSON.stringify(evidence.targets) === JSON.stringify(expectedTargets),
  "Drive evidence target IDs drifted from the live-read mapping",
);
assert(
  evidence.release?.writeEnabled === false &&
    evidence.verification?.providerWritePerformed === false &&
    evidence.verification?.oauthCredentialValidated === false,
  "mapping evidence must never imply provider release or OAuth validation",
);

assert(
  workflow.includes("Validate Nexus Cloud runtime preflight topology") &&
    workflow.includes("Smoke test read-only Nexus Cloud runtime preflight"),
  "preflight validator and disposable-DB smoke must be wired into CI",
);

console.log("PASS validate-nexus-cloud-runtime-preflight");
