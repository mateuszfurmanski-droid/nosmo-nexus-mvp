import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = await fs.readFile(
  path.join(here, "verify-nexus-work-wallet-db-readiness.mjs"),
  "utf8",
);

const requireText = (needle, label) =>
  assert.ok(source.includes(needle), `Missing readiness invariant: ${label}`);
const forbid = (pattern, label) =>
  assert.equal(pattern.test(source), false, `Forbidden readiness behavior: ${label}`);

requireText(
  'process.env.NEXUS_DEV_WORK_WALLET_VERIFY !== "true"',
  "explicit verifier opt-in",
);
requireText('[preflight, "--assert-safe-dev"]', "safe DB preflight assertion");
requireText('await client.query("BEGIN READ ONLY")', "read-only transaction");
requireText('await client.query("ROLLBACK")', "read-only transaction cleanup");
requireText('provider_subject_digest = $2', "digest-only provider identity lookup");
requireText('binding.revoked_at !== null', "revoked identity rejection");
requireText('account.connector_definition_id !== "work-wallet"', "Work Wallet connector-account binding");
requireText('verifiedMappings.length !== 1', "exact non-ambiguous verified mapping requirement");
requireText('activeParticipations.length !== 1', "single active Participation requirement");
requireText('applicableGrants.some((row) => row.effect === "deny")', "explicit deny rejection");
requireText('row.effect === "allow"', "explicit allow requirement");
requireText('latest.length !== 1', "temporal AccessDecision ambiguity rejection");
requireText('latest[0].result !== "allowed"', "latest allowed AccessDecision requirement");
requireText('"nexus_context_tickets"', "Context Ticket schema presence check");

// This verifier is a gate, never a repair/migration tool.
forbid(/\bINSERT\s+INTO\b/i, "INSERT statement");
forbid(/\bUPDATE\s+[A-Za-z_]/i, "UPDATE statement");
forbid(/\bDELETE\s+FROM\b/i, "DELETE statement");
forbid(/\bCREATE\s+(?:TABLE|INDEX|SCHEMA)\b/i, "DDL statement");
forbid(/\bALTER\s+TABLE\b/i, "ALTER TABLE statement");
forbid(/\bDROP\s+(?:TABLE|INDEX|SCHEMA)\b/i, "DROP statement");
forbid(/console\.log\([^\n]*(?:providerSubject|DATABASE_URL|databaseUrl)/, "sensitive runtime logging");

const preflightPosition = source.indexOf('[preflight, "--assert-safe-dev"]');
const poolPosition = source.indexOf("new Pool({ connectionString: databaseUrl })");
assert.ok(preflightPosition >= 0 && poolPosition > preflightPosition, "DB pool must be created only after safe-target preflight");

process.stdout.write("WORK_WALLET_DB_READINESS_AUDIT_PASS\n");
