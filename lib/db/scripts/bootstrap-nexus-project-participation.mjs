import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

if (process.env.NODE_ENV === "production") {
  throw new Error("Development Nexus project authorization bootstrap is forbidden in production");
}

if (process.env.NEXUS_DEV_PROJECT_AUTH_BOOTSTRAP !== "true") {
  throw new Error("Set NEXUS_DEV_PROJECT_AUTH_BOOTSTRAP=true explicitly to run this development bootstrap");
}

const databaseUrl = required("DATABASE_URL");
const personId = required("NEXUS_DEV_PERSON_ID");
const nexusProjectId = required("NEXUS_DEV_PROJECT_ID");
const projectDbIdRaw = required("NEXUS_DEV_PROJECT_DB_ID");
const participationId =
  process.env.NEXUS_DEV_PARTICIPATION_ID?.trim() ||
  `participation-${crypto.randomUUID()}`;
const workWalletEffect =
  process.env.NEXUS_DEV_WORK_WALLET_EFFECT?.trim().toLowerCase() || "none";

if (!/^[A-Za-z0-9._:-]{1,96}$/.test(personId)) {
  throw new Error("NEXUS_DEV_PERSON_ID has an invalid format");
}
if (!/^[A-Za-z0-9._:-]{1,96}$/.test(nexusProjectId)) {
  throw new Error("NEXUS_DEV_PROJECT_ID has an invalid format");
}
if (!/^[A-Za-z0-9._:-]{1,96}$/.test(participationId)) {
  throw new Error("NEXUS_DEV_PARTICIPATION_ID has an invalid format");
}
if (!new Set(["none", "allow", "deny"]).has(workWalletEffect)) {
  throw new Error("NEXUS_DEV_WORK_WALLET_EFFECT must be none, allow or deny");
}

const projectDbId = Number(projectDbIdRaw);
if (!Number.isSafeInteger(projectDbId) || projectDbId <= 0) {
  throw new Error("NEXUS_DEV_PROJECT_DB_ID must be a positive integer");
}

const applicationPermissions =
  workWalletEffect === "none"
    ? []
    : [{ app: "work-wallet", effect: workWalletEffect }];

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

try {
  await client.query("BEGIN");

  const person = await client.query(
    `SELECT id FROM nexus_persons WHERE id = $1 AND status = 'ACTIVE' LIMIT 1`,
    [personId],
  );
  if (person.rowCount !== 1) {
    throw new Error("Canonical Nexus Person does not exist or is not ACTIVE");
  }

  const project = await client.query(
    `SELECT id, nexus_project_id FROM projects WHERE id = $1 LIMIT 1`,
    [projectDbId],
  );
  if (project.rowCount !== 1) {
    throw new Error("Exact DB project row does not exist");
  }

  const currentNexusProjectId = project.rows[0]?.nexus_project_id;
  if (currentNexusProjectId && currentNexusProjectId !== nexusProjectId) {
    throw new Error("Project row is already mapped to a different Nexus project ID");
  }

  if (!currentNexusProjectId) {
    await client.query(
      `UPDATE projects SET nexus_project_id = $1, updated_at = NOW() WHERE id = $2`,
      [nexusProjectId, projectDbId],
    );
  }

  const existingById = await client.query(
    `SELECT person_id, project_id
       FROM nexus_project_participations
      WHERE id = $1
      LIMIT 1`,
    [participationId],
  );

  if (existingById.rowCount) {
    const row = existingById.rows[0];
    if (row?.person_id !== personId || Number(row?.project_id) !== projectDbId) {
      throw new Error("Participation ID is already used for a different Person or Project");
    }
  } else {
    const active = await client.query(
      `SELECT id
         FROM nexus_project_participations
        WHERE person_id = $1
          AND project_id = $2
          AND status = 'ACTIVE'
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (ends_at IS NULL OR ends_at > NOW())
        LIMIT 2`,
      [personId, projectDbId],
    );

    if (active.rowCount) {
      throw new Error("An active participation already exists for this Person and Project");
    }

    await client.query(
      `INSERT INTO nexus_project_participations
        (id, person_id, project_id, status, functions, assignments, trade_scopes, work_package_scopes, application_permissions)
       VALUES ($1, $2, $3, 'ACTIVE', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, $4::jsonb)`,
      [participationId, personId, projectDbId, JSON.stringify(applicationPermissions)],
    );
  }

  await client.query("COMMIT");
  console.log(
    `Development Nexus Project Participation ready: ${personId} -> ${nexusProjectId} (${workWalletEffect})`,
  );
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
