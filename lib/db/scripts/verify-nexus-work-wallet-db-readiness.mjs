import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const ID = /^[A-Za-z0-9._:-]{1,160}$/;

function required(name, maxLength = 256) {
  const value = String(process.env[name] ?? "").trim();
  if (!value || value.length > maxLength || CONTROL_CHARACTER.test(value)) {
    throw new Error(`${name} is required and must be a safe value`);
  }
  return value;
}

function safeId(name) {
  const value = required(name, 160);
  if (!ID.test(value)) throw new Error(`${name} has an invalid format`);
  return value;
}

if (process.env.NEXUS_DEV_WORK_WALLET_VERIFY !== "true") {
  throw new Error(
    "Set NEXUS_DEV_WORK_WALLET_VERIFY=true explicitly to run the read-only readiness verifier",
  );
}

const preflight = fileURLToPath(
  new URL("./verify-nexus-work-wallet-db-target.mjs", import.meta.url),
);
const preflightResult = spawnSync(process.execPath, [preflight, "--assert-safe-dev"], {
  stdio: "inherit",
  env: process.env,
});
if (preflightResult.status !== 0) {
  throw new Error("Work Wallet DB preflight rejected the target; readiness check aborted");
}

const databaseUrl = required("DATABASE_URL", 4096);
const workspaceId = Number(required("NEXUS_DEV_WORKSPACE_ID", 20));
if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
  throw new Error("NEXUS_DEV_WORKSPACE_ID must be a positive integer");
}

const fixtureKey = safeId("NEXUS_DEV_WORK_WALLET_FIXTURE_KEY");
const personId = safeId("NEXUS_DEV_PERSON_ID");
const providerSubject = required("NEXUS_DEV_PROVIDER_SUBJECT", 512);
const projectId = safeId("NEXUS_DEV_WORK_WALLET_PROJECT_ID");
const worldId = safeId("NEXUS_DEV_WORK_WALLET_WORLD_ID");
const externalObjectType = required("NEXUS_DEV_WORK_WALLET_EXTERNAL_OBJECT_TYPE", 120);
const externalRecordReference = required(
  "NEXUS_DEV_WORK_WALLET_EXTERNAL_RECORD_REFERENCE",
  256,
);
const issuerUrl = String(process.env.ISSUER_URL ?? "https://replit.com/oidc").trim();
const issuer = new URL(issuerUrl);
issuer.search = "";
issuer.hash = "";
const provider = `oidc:${issuer.toString().replace(/\/$/, "")}`;
const providerSubjectDigest = crypto
  .createHash("sha256")
  .update(providerSubject, "utf8")
  .digest("hex");

const prefix = `ww-dev-${fixtureKey}`;
const expected = {
  connectorAccountId: `${prefix}:account`,
  objectId: `${prefix}:object`,
  mappingId: `${prefix}:mapping`,
  participationId: `${prefix}:participation`,
  grantId: `${prefix}:grant`,
  decisionId: `${prefix}:decision`,
};
for (const [label, value] of Object.entries(expected)) {
  if (!ID.test(value)) throw new Error(`${label} derived from fixture key is invalid`);
}

const requiredTables = [
  "nexus_pm_people",
  "nexus_identity_bindings",
  "nexus_pm_canonical_objects",
  "nexus_pm_project_participations",
  "nexus_pm_permission_grants",
  "nexus_pm_access_decisions",
  "nexus_pm_connector_accounts",
  "nexus_pm_connector_object_mappings",
  "nexus_context_tickets",
];

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

function exactOne(result, label) {
  if (result.rowCount !== 1) {
    throw new Error(`${label} expected exactly one row, found ${result.rowCount}`);
  }
  return result.rows[0];
}

try {
  await client.query("BEGIN READ ONLY");

  const tables = await client.query(
    `SELECT name, to_regclass('public.' || name) AS regclass
       FROM unnest($1::text[]) AS name`,
    [requiredTables],
  );
  const missingTables = tables.rows
    .filter((row) => row.regclass === null)
    .map((row) => row.name);
  if (missingTables.length) {
    throw new Error(`Required Work Wallet tables are missing: ${missingTables.join(",")}`);
  }

  exactOne(
    await client.query("SELECT id FROM workspaces WHERE id = $1", [workspaceId]),
    "workspace",
  );

  const person = exactOne(
    await client.query(
      "SELECT person_id, status FROM nexus_pm_people WHERE person_id = $1",
      [personId],
    ),
    "canonical Person",
  );
  if (person.status !== "active") throw new Error("Canonical Person is not active");

  const binding = exactOne(
    await client.query(
      `SELECT person_id, status, revoked_at
         FROM nexus_identity_bindings
        WHERE provider = $1
          AND provider_subject_digest = $2`,
      [provider, providerSubjectDigest],
    ),
    "provider identity binding",
  );
  if (
    binding.person_id !== personId ||
    binding.status !== "ACTIVE" ||
    binding.revoked_at !== null
  ) {
    throw new Error("Provider identity binding is not active for the configured Person");
  }

  const account = exactOne(
    await client.query(
      `SELECT connector_account_id, workspace_id, connector_definition_id,
              connection_state, record_json
         FROM nexus_pm_connector_accounts
        WHERE connector_account_id = $1
          AND workspace_id = $2`,
      [expected.connectorAccountId, workspaceId],
    ),
    "Work Wallet connector account",
  );
  if (
    account.connector_definition_id !== "work-wallet" ||
    account.connection_state !== "connected" ||
    account.record_json?.status !== "active" ||
    account.record_json?.id !== expected.connectorAccountId
  ) {
    throw new Error("Work Wallet connector account is not active/canonical");
  }

  const mappings = await client.query(
    `SELECT mapping_id, nexus_object_id, mapping_method, record_json
       FROM nexus_pm_connector_object_mappings
      WHERE workspace_id = $1
        AND connector_account_id = $2
        AND external_object_type = $3
        AND external_object_id = $4`,
    [workspaceId, expected.connectorAccountId, externalObjectType, externalRecordReference],
  );
  const verifiedMappings = mappings.rows.filter(
    (row) =>
      row.record_json?.status === "active" &&
      row.record_json?.readOnly === true &&
      (row.mapping_method === "verified-external-id" ||
        (row.mapping_method === "manual" &&
          row.record_json?.verifiedBy &&
          row.record_json?.verifiedAt)),
  );
  if (verifiedMappings.length !== 1) {
    throw new Error(
      `Exact Work Wallet mapping must resolve to one verified candidate, found ${verifiedMappings.length}`,
    );
  }
  const mapping = verifiedMappings[0];
  if (
    mapping.mapping_id !== expected.mappingId ||
    mapping.nexus_object_id !== expected.objectId
  ) {
    throw new Error("Exact Work Wallet mapping does not match the configured fixture scope");
  }

  const object = exactOne(
    await client.query(
      `SELECT object_id, project_id, world_id, record_json
         FROM nexus_pm_canonical_objects
        WHERE object_id = $1
          AND workspace_id = $2
          AND project_id = $3
          AND world_id = $4`,
      [expected.objectId, workspaceId, projectId, worldId],
    ),
    "canonical Nexus Object",
  );
  if (
    object.record_json?.status !== "active" ||
    object.record_json?.lifecycleStatus !== "active" ||
    object.record_json?.id !== expected.objectId
  ) {
    throw new Error("Canonical Nexus Object is not active");
  }

  const participations = await client.query(
    `SELECT participation_id, record_json
       FROM nexus_pm_project_participations
      WHERE workspace_id = $1
        AND person_id = $2
        AND project_id = $3
        AND world_id = $4
        AND participation_status = 'active'`,
    [workspaceId, personId, projectId, worldId],
  );
  const activeParticipations = participations.rows.filter(
    (row) =>
      row.record_json?.status === "active" &&
      row.record_json?.participationStatus === "active",
  );
  if (activeParticipations.length !== 1) {
    throw new Error(
      `Exactly one active Project Participation is required, found ${activeParticipations.length}`,
    );
  }
  if (activeParticipations[0].participation_id !== expected.participationId) {
    throw new Error("Active Project Participation does not match the fixture");
  }

  const grants = await client.query(
    `SELECT grant_id, effect, object_scope_id, record_json
       FROM nexus_pm_permission_grants
      WHERE workspace_id = $1
        AND participation_id = $2
        AND module_id = 'work-wallet'
        AND action_key = 'connector.context.read'
        AND (object_scope_id IS NULL OR object_scope_id = $3)`,
    [workspaceId, expected.participationId, expected.objectId],
  );
  const applicableGrants = grants.rows.filter((row) => row.record_json?.status === "active");
  if (applicableGrants.some((row) => row.effect === "deny")) {
    throw new Error("Explicit Work Wallet context-read deny is present for the fixture scope");
  }
  if (
    !applicableGrants.some(
      (row) =>
        row.grant_id === expected.grantId &&
        row.effect === "allow" &&
        row.object_scope_id === expected.objectId,
    )
  ) {
    throw new Error("Expected explicit Work Wallet context-read allow is missing");
  }

  const decisions = await client.query(
    `SELECT decision_id, result, evaluated_at, record_json
       FROM nexus_pm_access_decisions
      WHERE workspace_id = $1
        AND person_id = $2
        AND participation_id = $3
        AND project_id = $4
        AND world_id = $5
        AND module_id = 'work-wallet'
        AND action_key = 'connector.context.read'
        AND object_scope_id = $6
      ORDER BY evaluated_at DESC`,
    [
      workspaceId,
      personId,
      expected.participationId,
      projectId,
      worldId,
      expected.objectId,
    ],
  );
  if (!decisions.rowCount) throw new Error("No Work Wallet AccessDecision exists");
  const latestAt = decisions.rows[0].evaluated_at?.getTime?.() ??
    new Date(decisions.rows[0].evaluated_at).getTime();
  const latest = decisions.rows.filter((row) => {
    const at = row.evaluated_at?.getTime?.() ?? new Date(row.evaluated_at).getTime();
    return at === latestAt;
  });
  if (latest.length !== 1) {
    throw new Error("Latest Work Wallet AccessDecision is temporally ambiguous");
  }
  if (
    latest[0].decision_id !== expected.decisionId ||
    latest[0].result !== "allowed" ||
    latest[0].record_json?.result !== "allowed"
  ) {
    throw new Error("Latest Work Wallet AccessDecision does not allow the fixture scope");
  }

  process.stdout.write(
    `${JSON.stringify({
      schema: "nexus-work-wallet-db-readiness/v1",
      ready: true,
      workspaceId,
      personId,
      projectId,
      worldId,
      connectorAccountId: expected.connectorAccountId,
      nexusObjectId: expected.objectId,
      mappingId: expected.mappingId,
      participationId: expected.participationId,
      grantId: expected.grantId,
      accessDecisionId: expected.decisionId,
    })}\n`,
  );
} finally {
  try {
    await client.query("ROLLBACK");
  } finally {
    client.release();
    await pool.end();
  }
}
