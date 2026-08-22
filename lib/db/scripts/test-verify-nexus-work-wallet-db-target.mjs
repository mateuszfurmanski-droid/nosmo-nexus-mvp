import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(
  new URL("./verify-nexus-work-wallet-db-target.mjs", import.meta.url),
);

function run(extraEnv = {}, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? "",
      ...extraEnv,
    },
  });

  let report = null;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    // assertions below report the malformed output
  }

  return { ...result, report };
}

const empty = run();
assert.equal(empty.status, 0);
assert.equal(empty.report?.schema, "nexus-work-wallet-db-preflight/v1");
assert.equal(empty.report?.readyForSafeDevelopmentSchemaReview, false);
assert.equal(empty.report?.targetFingerprint, null);

const emptyAssert = run({}, ["--assert-safe-dev"]);
assert.equal(emptyAssert.status, 2);
assert.match(emptyAssert.stderr, /No schema command was executed/);

const databaseUrl =
  "postgresql://nexus_test_user:do-not-print-this@db.internal.example:5432/nexus_mvp_dev?sslmode=require";
const baseEnv = {
  DATABASE_URL: databaseUrl,
  NODE_ENV: "development",
  NEXUS_WORK_WALLET_DB_TARGET_PURPOSE: "nosmo-nexus-mvp-development",
  NEXUS_IDENTITY_BINDING_MODE: "postgres",
  NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS:
    "chrome-extension://abcdefghijklmnopabcdefghijklmnop,https://nexus.example",
};

const inspected = run(baseEnv);
assert.equal(inspected.status, 0);
assert.match(inspected.report?.targetFingerprint ?? "", /^[a-f0-9]{64}$/);
assert.equal(inspected.report?.readyForSafeDevelopmentSchemaReview, false);
assert.equal(inspected.report?.checks.expectedFingerprintConfigured, false);

for (const secret of [
  "db.internal.example",
  "nexus_test_user",
  "do-not-print-this",
  "nexus_mvp_dev",
]) {
  assert.equal(inspected.stdout.includes(secret), false);
  assert.equal(inspected.stderr.includes(secret), false);
}

const approvedEnv = {
  ...baseEnv,
  NEXUS_WORK_WALLET_DB_EXPECTED_FINGERPRINT: inspected.report.targetFingerprint,
};
const approved = run(approvedEnv, ["--assert-safe-dev"]);
assert.equal(approved.status, 0);
assert.equal(approved.report?.readyForSafeDevelopmentSchemaReview, true);
assert.equal(approved.report?.checks.targetFingerprintMatches, true);

const wrongFingerprint = run(
  {
    ...approvedEnv,
    NEXUS_WORK_WALLET_DB_EXPECTED_FINGERPRINT: "0".repeat(64),
  },
  ["--assert-safe-dev"],
);
assert.equal(wrongFingerprint.status, 2);
assert.equal(wrongFingerprint.report?.checks.targetFingerprintMatches, false);

const production = run(
  { ...approvedEnv, NODE_ENV: "production" },
  ["--assert-safe-dev"],
);
assert.equal(production.status, 2);
assert.equal(production.report?.checks.nonProductionRuntime, false);

const wrongPurpose = run(
  { ...approvedEnv, NEXUS_WORK_WALLET_DB_TARGET_PURPOSE: "other-project" },
  ["--assert-safe-dev"],
);
assert.equal(wrongPurpose.status, 2);
assert.equal(wrongPurpose.report?.checks.targetPurposeAttested, false);

const noExtension = run(
  {
    ...approvedEnv,
    NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS: "https://nexus.example",
  },
  ["--assert-safe-dev"],
);
assert.equal(noExtension.status, 2);
assert.equal(
  noExtension.report?.checks.exactChromiumExtensionOriginConfigured,
  false,
);

const invalidOrigin = run(
  {
    ...approvedEnv,
    NEXUS_CONTEXT_TICKET_ALLOWED_ORIGINS:
      "chrome-extension://abcdefghijklmnopabcdefghijklmnop,https://nexus.example/path",
  },
  ["--assert-safe-dev"],
);
assert.equal(invalidOrigin.status, 2);
assert.equal(invalidOrigin.report?.checks.contextTicketOriginListValid, false);

process.stdout.write("WORK_WALLET_DB_PREFLIGHT_PASS\n");
