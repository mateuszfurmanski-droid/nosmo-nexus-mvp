import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;

const PROJECT_ID = "project-esafe-catania";
const WORLD_ID = "world-esafe-catania";
const MODULE_ID = "soft";
const ACTIONS = ["android.work-mode.handoff", "worksuite.draft.review"];

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function safeId(name, value) {
  if (!/^[A-Za-z0-9._:-]{1,96}$/.test(value)) {
    throw new Error(`${name} has an invalid format`);
  }
  return value;
}

if (process.env.NODE_ENV === "production") {
  throw new Error("Android Work Mode authority bootstrap is forbidden in production");
}

if (process.env.NEXUS_DEV_ANDROID_AUTHORITY_BOOTSTRAP !== "true") {
  throw new Error(
    "Set NEXUS_DEV_ANDROID_AUTHORITY_BOOTSTRAP=true explicitly to run this development/staging bootstrap",
  );
}

const databaseUrl = required("DATABASE_URL");
const personId = safeId("NEXUS_DEV_PERSON_ID", required("NEXUS_DEV_PERSON_ID"));
const providerSubject = required("NEXUS_DEV_PROVIDER_SUBJECT");
const displayName = process.env.NEXUS_DEV_PERSON_DISPLAY_NAME?.trim() || null;
const issuerUrl = process.env.ISSUER_URL?.trim() || "https://replit.com/oidc";

const issuer = new URL(issuerUrl);
issuer.search = "";
issuer.hash = "";
const provider = `oidc:${issuer.toString().replace(/\/$/, "")}`;

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

async function ensureExactAllow(participationId, actionKey) {
  const matchingDeny = await client.query(
    `SELECT id
       FROM nexus_permission_grants
      WHERE participation_id = $1
        AND lower(effect) = 'deny'
        AND (module_id IS NULL OR module_id = $2)
        AND (action_key IS NULL OR action_key = $3)
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_to IS NULL OR valid_to > NOW())
      LIMIT 1`,
    [participationId, MODULE_ID, actionKey],
  );

  if (matchingDeny.rowCount) {
    throw new Error(
      `Explicit deny already covers ${actionKey}; bootstrap refuses to override canonical deny authority`,
    );
  }

  const exactAllow = await client.query(
    `SELECT id
       FROM nexus_permission_grants
      WHERE participation_id = $1
        AND lower(effect) = 'allow'
        AND module_id = $2
        AND action_key = $3
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_to IS NULL OR valid_to > NOW())
      LIMIT 2`,
    [participationId, MODULE_ID, actionKey],
  );

  if ((exactAllow.rowCount ?? 0) > 1) {
    throw new Error(`Ambiguous duplicate explicit allow grants for ${actionKey}`);
  }

  if (!exactAllow.rowCount) {
    await client.query(
      `INSERT INTO nexus_permission_grants
        (id, participation_id, effect, module_id, action_key, reason)
       VALUES ($1, $2, 'allow', $3, $4, $5)`,
      [
        `grant-${crypto.randomUUID()}`,
        participationId,
        MODULE_ID,
        actionKey,
        "Development/staging Android Work Mode E2E bootstrap",
      ],
    );
  }
}

try {
  await client.query("BEGIN");

  await client.query(
    `INSERT INTO nexus_persons (id, display_name, status)
     VALUES ($1, $2, 'active')
     ON CONFLICT (id) DO NOTHING`,
    [personId, displayName],
  );

  const persons = await client.query(
    `SELECT id, status
       FROM nexus_persons
      WHERE id = $1
      LIMIT 2`,
    [personId],
  );
  if (persons.rowCount !== 1 || String(persons.rows[0]?.status).toLowerCase() !== "active") {
    throw new Error("Canonical Nexus Person is not uniquely ACTIVE");
  }

  const bindings = await client.query(
    `SELECT person_id, status, revoked_at
       FROM nexus_identity_bindings
      WHERE provider = $1
        AND provider_subject = $2
      LIMIT 2`,
    [provider, providerSubject],
  );

  if ((bindings.rowCount ?? 0) > 1) {
    throw new Error("Ambiguous provider subject binding");
  }
  if (bindings.rowCount) {
    const existing = bindings.rows[0];
    if (
      existing?.person_id !== personId ||
      String(existing?.status).toLowerCase() !== "active" ||
      existing?.revoked_at != null
    ) {
      throw new Error("Provider subject has a conflicting or inactive Nexus Person binding");
    }
  } else {
    await client.query(
      `INSERT INTO nexus_identity_bindings
        (id, provider, provider_subject, person_id, status, verified_at)
       VALUES ($1, $2, $3, $4, 'active', NOW())`,
      [`identity-${crypto.randomUUID()}`, provider, providerSubject, personId],
    );
  }

  const activeParticipations = await client.query(
    `SELECT id
       FROM nexus_project_participations
      WHERE person_id = $1
        AND project_id = $2
        AND world_id = $3
        AND lower(participation_status) = 'active'
        AND (valid_from IS NULL OR valid_from <= NOW())
        AND (valid_to IS NULL OR valid_to > NOW())
      LIMIT 2`,
    [personId, PROJECT_ID, WORLD_ID],
  );

  if ((activeParticipations.rowCount ?? 0) > 1) {
    throw new Error("Ambiguous active Project Participation for e-SAFE Project World");
  }

  let participationId = activeParticipations.rows[0]?.id;
  if (!participationId) {
    participationId = `participation-${crypto.randomUUID()}`;
    await client.query(
      `INSERT INTO nexus_project_participations
        (id, person_id, project_id, world_id, participation_status)
       VALUES ($1, $2, $3, $4, 'active')`,
      [participationId, personId, PROJECT_ID, WORLD_ID],
    );
  }

  for (const actionKey of ACTIONS) {
    await ensureExactAllow(participationId, actionKey);
  }

  await client.query("COMMIT");
  console.log(
    `Development/staging Android Work Mode authority ready for personId=${personId}, projectId=${PROJECT_ID}, worldId=${WORLD_ID}`,
  );
  console.log("Provider subject was intentionally not printed.");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
