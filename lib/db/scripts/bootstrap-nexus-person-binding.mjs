import crypto from "node:crypto";
import pg from "pg";

const { Pool } = pg;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

if (process.env.NODE_ENV === "production") {
  throw new Error("Development Nexus identity bootstrap is forbidden in production");
}

if (process.env.NEXUS_DEV_IDENTITY_BOOTSTRAP !== "true") {
  throw new Error("Set NEXUS_DEV_IDENTITY_BOOTSTRAP=true explicitly to run this development bootstrap");
}

const databaseUrl = required("DATABASE_URL");
const personId = required("NEXUS_DEV_PERSON_ID");
const providerSubject = required("NEXUS_DEV_PROVIDER_SUBJECT");
const displayName = process.env.NEXUS_DEV_PERSON_DISPLAY_NAME?.trim() || null;
const issuerUrl = process.env.ISSUER_URL?.trim() || "https://replit.com/oidc";

if (!/^[A-Za-z0-9._:-]{1,96}$/.test(personId)) {
  throw new Error("NEXUS_DEV_PERSON_ID has an invalid format");
}

const issuer = new URL(issuerUrl);
issuer.search = "";
issuer.hash = "";
const provider = `oidc:${issuer.toString().replace(/\/$/, "")}`;

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

try {
  await client.query("BEGIN");

  await client.query(
    `INSERT INTO nexus_persons (id, display_name, status)
     VALUES ($1, $2, 'ACTIVE')
     ON CONFLICT (id) DO NOTHING`,
    [personId, displayName],
  );

  const existing = await client.query(
    `SELECT person_id
       FROM nexus_identity_bindings
      WHERE provider = $1
        AND provider_subject = $2
        AND revoked_at IS NULL
      LIMIT 2`,
    [provider, providerSubject],
  );

  if (existing.rowCount && existing.rows[0]?.person_id !== personId) {
    throw new Error("Provider subject is already bound to a different Nexus Person");
  }

  if (!existing.rowCount) {
    await client.query(
      `INSERT INTO nexus_identity_bindings
        (id, provider, provider_subject, person_id, status, verified_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE', NOW())`,
      [`identity-${crypto.randomUUID()}`, provider, providerSubject, personId],
    );
  }

  await client.query("COMMIT");
  console.log(`Development Nexus identity binding ready for ${personId} (${provider})`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
