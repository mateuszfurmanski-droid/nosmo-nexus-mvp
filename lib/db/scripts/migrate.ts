import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const MIGRATION_LOCK_KEY = "nosmo-nexus-mvp-schema-migrations/v1";
const APPROVAL_PHRASE = "DEV MIGRATION APPROVED";
const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("NEXUS_DB_MIGRATION_DATABASE_URL_REQUIRED");

const parsedUrl = new URL(databaseUrl);
if (!new Set(["postgres:", "postgresql:"]).has(parsedUrl.protocol)) {
  throw new Error("NEXUS_DB_MIGRATION_POSTGRES_REQUIRED");
}

const environmentSignals = [
  process.env.NODE_ENV,
  process.env.VERCEL_ENV,
  process.env.NEXUS_ENV,
]
  .filter(Boolean)
  .map((value) => value!.toLowerCase());
if (environmentSignals.some((value) => value === "production" || value === "prod")) {
  throw new Error("NEXUS_DB_MIGRATION_PRODUCTION_FORBIDDEN");
}

const localHosts = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
const isLocalTarget = localHosts.has(parsedUrl.hostname);
if (!isLocalTarget && process.env.NEXUS_DEV_MIGRATION_APPROVAL !== APPROVAL_PHRASE) {
  throw new Error("NEXUS_DB_MIGRATION_REMOTE_APPROVAL_REQUIRED");
}

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const migrationDirectory = path.resolve(scriptDirectory, "../migrations");
const files = fs
  .readdirSync(migrationDirectory)
  .filter((name) => MIGRATION_FILE.test(name))
  .sort((left, right) => left.localeCompare(right));
if (files.length === 0) throw new Error("NEXUS_DB_MIGRATION_SET_EMPTY");

const args = process.argv.slice(2).filter((arg) => arg !== "--");
let toVersion: string | undefined;
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]!;
  if (arg.startsWith("--to=")) toVersion = arg.slice("--to=".length);
  if (arg === "--to") toVersion = args[index + 1];
}

const versions = files.map((name) => path.basename(name, ".sql"));
if (toVersion && !versions.includes(toVersion)) {
  throw new Error(`NEXUS_DB_MIGRATION_UNKNOWN_TARGET:${toVersion}`);
}
const targetIndex = toVersion ? versions.indexOf(toVersion) : versions.length - 1;
const selectedFiles = files.slice(0, targetIndex + 1);

const sha256 = (content: string): string =>
  crypto.createHash("sha256").update(content, "utf8").digest("hex");

const client = new Client({ connectionString: databaseUrl });
let lockHeld = false;

try {
  await client.connect();
  await client.query("SELECT pg_advisory_lock(hashtext($1))", [MIGRATION_LOCK_KEY]);
  lockHeld = true;

  await client.query(`
    CREATE TABLE IF NOT EXISTS nexus_schema_migrations (
      version text PRIMARY KEY,
      checksum char(64) NOT NULL,
      applied_at timestamp with time zone NOT NULL DEFAULT now()
    )
  `);

  const existing = await client.query<{ version: string; checksum: string }>(
    "SELECT version, checksum FROM nexus_schema_migrations ORDER BY version",
  );
  const applied = new Map(existing.rows.map((row) => [row.version, row.checksum.trim()]));
  const appliedNow: string[] = [];

  for (const filename of selectedFiles) {
    const version = path.basename(filename, ".sql");
    const sql = fs.readFileSync(path.join(migrationDirectory, filename), "utf8");
    const checksum = sha256(sql);
    const recordedChecksum = applied.get(version);

    if (recordedChecksum) {
      if (recordedChecksum !== checksum) {
        throw new Error(`NEXUS_DB_MIGRATION_CHECKSUM_MISMATCH:${version}`);
      }
      continue;
    }

    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO nexus_schema_migrations(version, checksum) VALUES ($1, $2)",
        [version, checksum],
      );
      await client.query("COMMIT");
      appliedNow.push(version);
      applied.set(version, checksum);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  const current = selectedFiles.length
    ? path.basename(selectedFiles[selectedFiles.length - 1]!, ".sql")
    : null;
  console.log(
    JSON.stringify(
      {
        marker: "NEXUS_DB_MIGRATIONS_OK",
        migrationSchema: "nosmo-nexus-repository-migrations/v1",
        currentVersion: current,
        appliedNow,
        selectedVersions: selectedFiles.map((name) => path.basename(name, ".sql")),
        targetClass: isLocalTarget ? "LOCAL_DISPOSABLE_POSTGRES" : "APPROVED_REMOTE_DEV",
      },
      null,
      2,
    ),
  );
} finally {
  if (lockHeld) {
    try {
      await client.query("SELECT pg_advisory_unlock(hashtext($1))", [MIGRATION_LOCK_KEY]);
    } catch {
      // Preserve the original migration result; the connection close releases the lock.
    }
  }
  await client.end().catch(() => undefined);
}
