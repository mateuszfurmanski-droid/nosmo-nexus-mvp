import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Pool } = pg;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;
const ID = /^[A-Za-z0-9._:-]{1,160}$/;
const ALLOWED_CANONICAL_TYPES = new Set([
  "Approval",
  "Inspection",
  "Task",
  "Evidence",
  "Asset",
  "Door",
  "InstallationObject",
  "Other",
]);

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

if (process.env.NODE_ENV === "production") {
  throw new Error("Work Wallet development fixture bootstrap is forbidden in production");
}
if (process.env.NEXUS_DEV_WORK_WALLET_BOOTSTRAP !== "true") {
  throw new Error(
    "Set NEXUS_DEV_WORK_WALLET_BOOTSTRAP=true explicitly to run this development bootstrap",
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
  throw new Error("Work Wallet DB preflight rejected the target; fixture bootstrap aborted");
}

const databaseUrl = required("DATABASE_URL", 4096);
const workspaceId = Number(required("NEXUS_DEV_WORKSPACE_ID", 20));
if (!Number.isInteger(workspaceId) || workspaceId <= 0) {
  throw new Error("NEXUS_DEV_WORKSPACE_ID must be a positive integer");
}

const fixtureKey = safeId("NEXUS_DEV_WORK_WALLET_FIXTURE_KEY");
const personId = safeId("NEXUS_DEV_PERSON_ID");
const projectId = safeId("NEXUS_DEV_WORK_WALLET_PROJECT_ID");
const worldId = safeId("NEXUS_DEV_WORK_WALLET_WORLD_ID");
const externalObjectType = required("NEXUS_DEV_WORK_WALLET_EXTERNAL_OBJECT_TYPE", 120);
const externalRecordReference = required(
  "NEXUS_DEV_WORK_WALLET_EXTERNAL_RECORD_REFERENCE",
  256,
);
const canonicalObjectType =
  String(process.env.NEXUS_DEV_WORK_WALLET_CANONICAL_OBJECT_TYPE ?? "Approval").trim();
if (!ALLOWED_CANONICAL_TYPES.has(canonicalObjectType)) {
  throw new Error("NEXUS_DEV_WORK_WALLET_CANONICAL_OBJECT_TYPE is invalid");
}

const prefix = `ww-dev-${fixtureKey}`;
const connectorAccountId = `${prefix}:account`;
const objectId = `${prefix}:object`;
const mappingId = `${prefix}:mapping`;
const participationId = `${prefix}:participation`;
const grantId = `${prefix}:grant`;
const decisionId = `${prefix}:decision`;
const tenantId = `${prefix}:tenant`;

for (const [label, value] of Object.entries({
  connectorAccountId,
  objectId,
  mappingId,
  participationId,
  grantId,
  decisionId,
  tenantId,
})) {
  if (!ID.test(value)) throw new Error(`${label} derived from fixture key is invalid`);
}

const now = new Date();
const iso = now.toISOString();
const base = (id, title, sourceSystem = "nexus") => ({
  id,
  status: "active",
  title,
  createdAt: iso,
  updatedAt: iso,
  sourceSystem,
  confidence: "confirmed",
});

const canonicalObject = {
  ...base(objectId, "Synthetic Work Wallet development object"),
  objectType: canonicalObjectType,
  projectId,
  worldId,
  lifecycleStatus: "active",
  canonicalSourceType: "nexus",
  externalReferenceIds: [],
};
const connectorAccount = {
  ...base(connectorAccountId, "Synthetic Work Wallet development connector account"),
  connectorDefinitionId: "work-wallet",
  tenantId,
  connectionState: "connected",
  allowedScopes: ["context.read"],
  createdBy: personId,
  freshnessState: "current",
};
const mapping = {
  ...base(mappingId, "Synthetic exact Work Wallet development mapping", "work-wallet"),
  connectorAccountId,
  nexusObjectId: objectId,
  externalObjectType,
  externalObjectId: externalRecordReference,
  mappingMethod: "verified-external-id",
  matchConfidence: 1,
  verifiedBy: personId,
  verifiedAt: iso,
  readOnly: true,
};
const participation = {
  ...base(participationId, "Synthetic Work Wallet development participation"),
  personId,
  projectId,
  worldId,
  participationStatus: "active",
  roleAssignmentIds: [],
  tradeAssignmentIds: [],
  permissionGrantIds: [grantId],
  approvalScopeIds: [],
  competenceRequirementIds: [],
  validFrom: iso,
};
const grant = {
  ...base(grantId, "Synthetic Work Wallet context-read grant"),
  participationId,
  effect: "allow",
  moduleId: "work-wallet",
  actionKey: "connector.context.read",
  objectScopeId: objectId,
  reason: "Explicit synthetic development fixture grant",
  validFrom: iso,
};
const decision = {
  ...base(decisionId, "Synthetic Work Wallet context-read access decision"),
  personId,
  projectId,
  worldId,
  participationId,
  moduleId: "work-wallet",
  actionKey: "connector.context.read",
  objectScopeId: objectId,
  result: "allowed",
  reason: "explicit-grant",
  policyVersion: "work-wallet-dev-fixture-v1",
  evaluatedAt: iso,
};

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

async function exactOrInsert({ selectSql, selectArgs, validate, insertSql, insertArgs, label }) {
  const existing = await client.query(selectSql, selectArgs);
  if (existing.rowCount > 1) throw new Error(`${label} is ambiguous`);
  if (existing.rowCount === 1) {
    if (!validate(existing.rows[0])) throw new Error(`${label} already exists with different scope`);
    return "existing";
  }
  await client.query(insertSql, insertArgs);
  return "inserted";
}

try {
  await client.query("BEGIN");

  const workspace = await client.query(
    "SELECT id FROM workspaces WHERE id = $1 LIMIT 1",
    [workspaceId],
  );
  if (workspace.rowCount !== 1) throw new Error("Configured development workspace does not exist");

  const person = await client.query(
    "SELECT person_id, status FROM nexus_pm_people WHERE person_id = $1 LIMIT 1",
    [personId],
  );
  if (person.rowCount !== 1 || person.rows[0]?.status !== "active") {
    throw new Error(
      "Configured canonical Person is missing/inactive; run the separate identity bootstrap first",
    );
  }

  const results = {};
  results.object = await exactOrInsert({
    label: "canonical object",
    selectSql:
      "SELECT workspace_id, project_id, world_id, object_type FROM nexus_pm_canonical_objects WHERE object_id = $1 LIMIT 2",
    selectArgs: [objectId],
    validate: (row) =>
      row.workspace_id === workspaceId &&
      row.project_id === projectId &&
      row.world_id === worldId &&
      row.object_type === canonicalObjectType,
    insertSql:
      "INSERT INTO nexus_pm_canonical_objects (object_id, workspace_id, project_id, world_id, object_type, record_json, persisted_at) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)",
    insertArgs: [
      objectId,
      workspaceId,
      projectId,
      worldId,
      canonicalObjectType,
      JSON.stringify(canonicalObject),
      now,
    ],
  });

  results.account = await exactOrInsert({
    label: "connector account",
    selectSql:
      "SELECT workspace_id, connector_definition_id, tenant_id, connection_state FROM nexus_pm_connector_accounts WHERE connector_account_id = $1 LIMIT 2",
    selectArgs: [connectorAccountId],
    validate: (row) =>
      row.workspace_id === workspaceId &&
      row.connector_definition_id === "work-wallet" &&
      row.tenant_id === tenantId &&
      row.connection_state === "connected",
    insertSql:
      "INSERT INTO nexus_pm_connector_accounts (connector_account_id, workspace_id, connector_definition_id, tenant_id, connection_state, record_json, persisted_at) VALUES ($1,$2,'work-wallet',$3,'connected',$4::jsonb,$5)",
    insertArgs: [connectorAccountId, workspaceId, tenantId, JSON.stringify(connectorAccount), now],
  });

  results.mapping = await exactOrInsert({
    label: "connector mapping",
    selectSql:
      "SELECT workspace_id, connector_account_id, nexus_object_id, external_object_type, external_object_id, mapping_method FROM nexus_pm_connector_object_mappings WHERE mapping_id = $1 LIMIT 2",
    selectArgs: [mappingId],
    validate: (row) =>
      row.workspace_id === workspaceId &&
      row.connector_account_id === connectorAccountId &&
      row.nexus_object_id === objectId &&
      row.external_object_type === externalObjectType &&
      row.external_object_id === externalRecordReference &&
      row.mapping_method === "verified-external-id",
    insertSql:
      "INSERT INTO nexus_pm_connector_object_mappings (mapping_id, workspace_id, connector_account_id, nexus_object_id, external_object_type, external_object_id, mapping_method, record_json, persisted_at) VALUES ($1,$2,$3,$4,$5,$6,'verified-external-id',$7::jsonb,$8)",
    insertArgs: [
      mappingId,
      workspaceId,
      connectorAccountId,
      objectId,
      externalObjectType,
      externalRecordReference,
      JSON.stringify(mapping),
      now,
    ],
  });

  results.participation = await exactOrInsert({
    label: "Project Participation",
    selectSql:
      "SELECT workspace_id, person_id, project_id, world_id, participation_status FROM nexus_pm_project_participations WHERE participation_id = $1 LIMIT 2",
    selectArgs: [participationId],
    validate: (row) =>
      row.workspace_id === workspaceId &&
      row.person_id === personId &&
      row.project_id === projectId &&
      row.world_id === worldId &&
      row.participation_status === "active",
    insertSql:
      "INSERT INTO nexus_pm_project_participations (participation_id, workspace_id, person_id, project_id, world_id, participation_status, record_json, persisted_at) VALUES ($1,$2,$3,$4,$5,'active',$6::jsonb,$7)",
    insertArgs: [
      participationId,
      workspaceId,
      personId,
      projectId,
      worldId,
      JSON.stringify(participation),
      now,
    ],
  });

  results.grant = await exactOrInsert({
    label: "PermissionGrant",
    selectSql:
      "SELECT workspace_id, participation_id, effect, module_id, action_key, object_scope_id FROM nexus_pm_permission_grants WHERE grant_id = $1 LIMIT 2",
    selectArgs: [grantId],
    validate: (row) =>
      row.workspace_id === workspaceId &&
      row.participation_id === participationId &&
      row.effect === "allow" &&
      row.module_id === "work-wallet" &&
      row.action_key === "connector.context.read" &&
      row.object_scope_id === objectId,
    insertSql:
      "INSERT INTO nexus_pm_permission_grants (grant_id, workspace_id, participation_id, effect, module_id, action_key, object_scope_id, record_json, persisted_at) VALUES ($1,$2,$3,'allow','work-wallet','connector.context.read',$4,$5::jsonb,$6)",
    insertArgs: [grantId, workspaceId, participationId, objectId, JSON.stringify(grant), now],
  });

  results.decision = await exactOrInsert({
    label: "AccessDecision",
    selectSql:
      "SELECT workspace_id, person_id, participation_id, project_id, world_id, module_id, action_key, object_scope_id, result FROM nexus_pm_access_decisions WHERE decision_id = $1 LIMIT 2",
    selectArgs: [decisionId],
    validate: (row) =>
      row.workspace_id === workspaceId &&
      row.person_id === personId &&
      row.participation_id === participationId &&
      row.project_id === projectId &&
      row.world_id === worldId &&
      row.module_id === "work-wallet" &&
      row.action_key === "connector.context.read" &&
      row.object_scope_id === objectId &&
      row.result === "allowed",
    insertSql:
      "INSERT INTO nexus_pm_access_decisions (decision_id, workspace_id, person_id, participation_id, project_id, world_id, module_id, action_key, object_scope_id, result, evaluated_at, record_json, persisted_at) VALUES ($1,$2,$3,$4,$5,$6,'work-wallet','connector.context.read',$7,'allowed',$8,$9::jsonb,$10)",
    insertArgs: [
      decisionId,
      workspaceId,
      personId,
      participationId,
      projectId,
      worldId,
      objectId,
      now,
      JSON.stringify(decision),
      now,
    ],
  });

  await client.query("COMMIT");
  process.stdout.write(
    `${JSON.stringify({
      schema: "nexus-work-wallet-dev-fixture/v1",
      fixtureKey,
      workspaceId,
      personId,
      projectId,
      worldId,
      connectorAccountId,
      nexusObjectId: objectId,
      externalObjectType,
      externalRecordReference,
      results,
    })}\n`,
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
