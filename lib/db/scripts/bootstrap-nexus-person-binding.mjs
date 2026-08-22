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
  throw new Error(
    "Set NEXUS_DEV_IDENTITY_BOOTSTRAP=true explicitly to run this development bootstrap",
  );
}

const databaseUrl = required("DATABASE_URL");
const personId = required("NEXUS_DEV_PERSON_ID");
const providerSubject = required("NEXUS_DEV_PROVIDER_SUBJECT");
const displayName = required("NEXUS_DEV_PERSON_DISPLAY_NAME");
const personType = process.env.NEXUS_DEV_PERSON_TYPE?.trim() || "unknown";
const issuerUrl = process.env.ISSUER_URL?.trim() || "https://replit.com/oidc";

if (!/^[A-Za-z0-9._:-]{1,96}$/.test(personId)) {
  throw new Error("NEXUS_DEV_PERSON_ID has an invalid format");
}

const allowedPersonTypes = new Set([
  "worker",
  "manager",
  "client",
  "supplier",
  "consultant",
  "admin",
  "unknown",
]);
if (!allowedPersonTypes.has(personType)) {
  throw new Error("NEXUS_DEV_PERSON_TYPE is invalid");
}

const issuer = new URL(issuerUrl);
issuer.search = "";
issuer.hash = "";
const provider = `oidc:${issuer.toString().replace(/\/$/, "")}`;
const providerSubjectDigest = crypto
  .createHash("sha256")
  .update(providerSubject, "utf8")
  .digest("hex");

const now = new Date();
const personRecord = {
  id: personId,
  status: "active",
  title: displayName,
  displayName,
  personType,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  sourceSystem: "nexus",
  confidence: "confirmed",
  provenanceClass: "DERIVED",
};

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

try {
  await client.query("BEGIN");

  const existingPerson = await client.query(
    `SELECT display_name, person_type, status
       FROM nexus_pm_people
      WHERE person_id = $1
      LIMIT 1`,
    [personId],
  );

  if (existingPerson.rowCount) {
    const row = existingPerson.rows[0];
    if (
      row.display_name !== displayName ||
      row.person_type !== personType ||
      row.status !== "active"
    ) {
      throw new Error("Canonical Person already exists with different identity metadata");
    }
  } else {
    await client.query(
      `INSERT INTO nexus_pm_people
        (person_id, display_name, person_type, status, record_json, persisted_at)
       VALUES ($1, $2, $3, 'active', $4::jsonb, $5)`,
      [personId, displayName, personType, JSON.stringify(personRecord), now],
    );
  }

  const existingBinding = await client.query(
    `SELECT person_id
       FROM nexus_identity_bindings
      WHERE provider = $1
        AND provider_subject_digest = $2
        AND revoked_at IS NULL
      LIMIT 2`,
    [provider, providerSubjectDigest],
  );

  if (
    existingBinding.rowCount &&
    existingBinding.rows[0]?.person_id !== personId
  ) {
    throw new Error("Provider identity is already bound to a different Nexus Person");
  }

  if (!existingBinding.rowCount) {
    await client.query(
      `INSERT INTO nexus_identity_bindings
        (binding_id, provider, provider_subject_digest, person_id, status, verified_at)
       VALUES ($1, $2, $3, $4, 'ACTIVE', $5)`,
      [
        `identity-${crypto.randomUUID()}`,
        provider,
        providerSubjectDigest,
        personId,
        now,
      ],
    );
  }

  await client.query("COMMIT");
  console.log(`Development Nexus identity binding ready for ${personId}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
