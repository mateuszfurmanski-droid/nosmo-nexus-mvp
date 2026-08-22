import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = await fs.readFile(
  path.join(here, "work-wallet-db-context-ticket-smoke.ts"),
  "utf8",
);

const requireText = (needle, label) =>
  assert.ok(source.includes(needle), `Missing DB smoke invariant: ${label}`);
const forbid = (pattern, label) =>
  assert.equal(pattern.test(source), false, `Forbidden DB smoke behavior: ${label}`);

requireText('process.env.NODE_ENV === "production"', "production hard stop");
requireText(
  'process.env.NEXUS_DEV_WORK_WALLET_DB_SMOKE !== "true"',
  "explicit smoke opt-in",
);
requireText("verify-nexus-work-wallet-db-target.mjs", "Slice P target preflight");
requireText('[preflight, "--assert-safe-dev"]', "assert-safe-dev preflight mode");
requireText("verify-nexus-work-wallet-db-readiness.mjs", "Slice S readiness verifier");
requireText('NEXUS_DEV_WORK_WALLET_VERIFY: "true"', "explicit readiness opt-in");
requireText("resolveNexusPersonBinding", "production Person binding resolver");
requireText("loadNexusWorkWalletProjectMemoryScope", "production Project Memory loader");
requireText("issueNexusContextTicket", "production PostgreSQL ticket issue wrapper");
requireText("consumeNexusContextTicket", "production PostgreSQL ticket consume wrapper");
requireText("issueWorkWalletContextTicketService", "canonical issue orchestration");
requireText("exchangeWorkWalletContextTicketService", "canonical exchange orchestration");
requireText('connectorAccountId = `ww-dev-${fixtureKey}:account`', "deterministic fixture account");
requireText('expectedObjectId = `ww-dev-${fixtureKey}:object`', "deterministic fixture object");
requireText('issue.issued.ticket = ""', "remove raw ticket from issue result object");
requireText('rawTicket = ""', "clear raw ticket variable");
requireText('assert.equal(replay.status, "INVALID_TICKET")', "single-use replay rejection");
requireText("WORK_WALLET_EXTERNAL_CAPABILITY_LABEL", "truthful external capability label");

const preflightPosition = source.indexOf('[preflight, "--assert-safe-dev"]');
const readinessPosition = source.indexOf("const readinessResult = spawnSync");
const issuePosition = source.indexOf("await issueWorkWalletContextTicketService");
assert.ok(
  preflightPosition >= 0 &&
    readinessPosition > preflightPosition &&
    issuePosition > readinessPosition,
  "preflight and readiness must both complete before ticket issue",
);

// The smoke may only create/consume the ephemeral Context Ticket through production service wrappers.
forbid(/\bINSERT\s+INTO\b/i, "direct INSERT");
forbid(/\bUPDATE\s+[A-Za-z_]/i, "direct UPDATE");
forbid(/\bDELETE\s+FROM\b/i, "direct DELETE");
forbid(/\bCREATE\s+(?:TABLE|INDEX|SCHEMA)\b/i, "DDL");
forbid(/\bALTER\s+TABLE\b/i, "ALTER TABLE");
forbid(/\bDROP\s+(?:TABLE|INDEX|SCHEMA)\b/i, "DROP");
forbid(/drizzle-kit|push-force|\bdrizzle\s+push\b/i, "schema migration command");
forbid(/bootstrap-nexus-person-binding|bootstrap-nexus-work-wallet-dev-fixture/i, "fixture or identity bootstrap invocation");
forbid(/\bfetch\s*\(|axios|node:https|node:http/i, "external HTTP call");
forbid(/console\.log\([^\n]*(?:providerSubject|rawTicket|DATABASE_URL|databaseUrl)/, "secret logging");
forbid(/JSON\.stringify\([^]*?ticket\s*:/i, "raw ticket in JSON output");

process.stdout.write("WORK_WALLET_DB_CONTEXT_TICKET_SMOKE_AUDIT_PASS\n");
