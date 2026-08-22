import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = await fs.readFile(
  path.join(here, "bootstrap-nexus-work-wallet-dev-fixture.mjs"),
  "utf8",
);

const requireText = (needle, label) =>
  assert.ok(source.includes(needle), `Missing bootstrap invariant: ${label}`);
const forbid = (pattern, label) =>
  assert.equal(pattern.test(source), false, `Forbidden bootstrap behavior: ${label}`);

requireText(
  'if (process.env.NODE_ENV === "production")',
  "production hard stop",
);
requireText(
  'process.env.NEXUS_DEV_WORK_WALLET_BOOTSTRAP !== "true"',
  "explicit development opt-in",
);
requireText(
  '[preflight, "--assert-safe-dev"]',
  "safe DB target preflight assertion",
);
requireText(
  'throw new Error("Work Wallet DB preflight rejected the target; fixture bootstrap aborted")',
  "preflight fail-closed behavior",
);
requireText(
  '"SELECT id FROM workspaces WHERE id = $1 LIMIT 1"',
  "existing workspace requirement",
);
requireText(
  '"SELECT person_id, status FROM nexus_pm_people WHERE person_id = $1 LIMIT 1"',
  "existing canonical Person requirement",
);
requireText(
  "run the separate identity bootstrap first",
  "identity bootstrap separation",
);
requireText('await client.query("BEGIN")', "transaction begin");
requireText('await client.query("COMMIT")', "transaction commit");
requireText('await client.query("ROLLBACK")', "transaction rollback");

for (const table of [
  "nexus_pm_canonical_objects",
  "nexus_pm_connector_accounts",
  "nexus_pm_connector_object_mappings",
  "nexus_pm_project_participations",
  "nexus_pm_permission_grants",
  "nexus_pm_access_decisions",
]) {
  requireText(`INSERT INTO ${table}`, `fixture insert ${table}`);
}

requireText('connectorDefinitionId: "work-wallet"', "Work Wallet connector identity");
requireText('mappingMethod: "verified-external-id"', "verified exact mapping");
requireText('effect: "allow"', "explicit allow grant");
requireText('moduleId: "work-wallet"', "Work Wallet module scope");
requireText('actionKey: "connector.context.read"', "context-read action scope");
requireText('result: "allowed"', "audited allowed decision");
requireText('readOnly: true', "read-only external mapping");

forbid(/INSERT\s+INTO\s+nexus_pm_people/i, "Person creation");
forbid(/INSERT\s+INTO\s+nexus_identity_bindings/i, "authentication identity binding creation");
forbid(/INSERT\s+INTO\s+workspaces/i, "workspace creation");
forbid(/UPDATE\s+nexus_pm_/i, "implicit canonical record mutation");
forbid(/ON\s+CONFLICT\s+DO\s+UPDATE/i, "silent fixture scope replacement");
forbid(/e-safe|esafe|riverside|halifax/i, "real/demo project coupling");
forbid(/console\.log\([^\n]*(?:databaseUrl|DATABASE_URL)/, "database URL logging");

const preflightPosition = source.indexOf('[preflight, "--assert-safe-dev"]');
const poolPosition = source.indexOf("new Pool({ connectionString: databaseUrl })");
assert.ok(preflightPosition >= 0 && poolPosition > preflightPosition, "DB pool must be created only after safe-target preflight");

process.stdout.write("WORK_WALLET_DEV_FIXTURE_BOOTSTRAP_AUDIT_PASS\n");
