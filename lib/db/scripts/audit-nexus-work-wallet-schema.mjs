import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dbRoot = path.resolve(here, "..");
const schemaRoot = path.join(dbRoot, "src", "schema");

const read = (relative) => fs.readFile(path.join(dbRoot, relative), "utf8");

const [identity, access, ticket, loader, schemaIndex] = await Promise.all([
  read("src/schema/nexusProjectMemoryIdentity.ts"),
  read("src/schema/nexusProjectMemoryAccess.ts"),
  read("src/schema/nexus-context-ticket.ts"),
  read("src/nexusWorkWalletProjectMemory.ts"),
  fs.readFile(path.join(schemaRoot, "index.ts"), "utf8"),
]);

function requireText(source, needle, label) {
  assert.ok(source.includes(needle), `Missing schema invariant: ${label}`);
}

function forbid(source, pattern, label) {
  assert.equal(pattern.test(source), false, `Forbidden schema surface: ${label}`);
}

// Identity: canonical Person owns identity; provider subject is digest-only.
requireText(identity, 'pgTable("nexus_pm_people"', "canonical Person table");
requireText(identity, 'pgTable(\n  "nexus_identity_bindings"', "identity binding table");
requireText(identity, 'providerSubjectDigest: text("provider_subject_digest").notNull()', "provider subject digest");
requireText(identity, 'unique("nexus_identity_provider_subject_digest_uq")', "provider+subject unique constraint");
requireText(identity, "table.provider,\n      table.providerSubjectDigest", "provider+digest uniqueness scope");
requireText(identity, '.references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" })', "identity binding canonical Person FK");
forbid(identity, /providerSubject\s*:\s*(?:text|varchar)\s*\(/, "raw provider subject column");
forbid(identity, /email\s*:\s*(?:text|varchar)\s*\(/, "email-based identity binding column");

// Access/mapping persistence: exact workspace scope and canonical FKs.
for (const tableName of [
  "nexus_pm_project_participations",
  "nexus_pm_permission_grants",
  "nexus_pm_access_decisions",
  "nexus_pm_connector_accounts",
  "nexus_pm_connector_object_mappings",
]) {
  requireText(access, `"${tableName}"`, `${tableName} table`);
}
requireText(access, 'workspaceId: integer("workspace_id")', "workspace-scoped access persistence");
requireText(access, '.references(() => workspacesTable.id, { onDelete: "cascade" })', "workspace FK");
requireText(access, '.references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" })', "canonical Person FK");
requireText(access, '.references(() => nexusPmConnectorAccountsTable.connectorAccountId', "mapping -> connector account FK");
requireText(access, '.references(() => nexusPmCanonicalObjectsTable.objectId', "mapping -> canonical object FK");
requireText(access, 'index("IDX_nexus_pm_connector_mapping_exact")', "exact mapping lookup index");
requireText(access, "table.workspaceId,\n      table.connectorAccountId,\n      table.externalObjectType,\n      table.externalObjectId", "exact mapping index scope");

// Exact mapping is intentionally allowed to be ambiguous in storage; the domain
// contract detects multiple verified candidates and fails closed with AMBIGUOUS_MAPPING.
forbid(access, /unique\("[^"]*connector_mapping[^"]*"\)/, "DB uniqueness that would replace domain ambiguity detection");

// Context Ticket: digest-only capability with frozen canonical scope and consume fields.
requireText(ticket, 'ticketDigest: varchar("ticket_digest", { length: 64 }).primaryKey()', "ticket digest primary key");
requireText(ticket, 'issuedSessionDigest: varchar("issued_session_digest", { length: 64 }).notNull()', "issuing session digest");
forbid(ticket, /\bticket\s*:\s*(?:text|varchar)\s*\(/, "raw Context Ticket column");
forbid(ticket, /\bsessionId\s*:\s*(?:text|varchar)\s*\(/, "raw session identifier column");
for (const field of [
  'workspaceId: integer("workspace_id").notNull()',
  'personId: varchar("person_id", { length: 160 }).notNull()',
  'projectId: varchar("project_id", { length: 160 }).notNull()',
  'worldId: varchar("world_id", { length: 160 }).notNull()',
  'participationId: varchar("participation_id", { length: 160 }).notNull()',
  'accessDecisionId: varchar("access_decision_id", { length: 160 }).notNull()',
  'nexusObjectId: varchar("nexus_object_id", { length: 160 }).notNull()',
  'connectorAccountId: varchar("connector_account_id", { length: 160 }).notNull()',
  'expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()',
  'consumedAt: timestamp("consumed_at", { withTimezone: true })',
]) {
  requireText(ticket, field, `ticket frozen scope: ${field.split(":")[0]}`);
}
requireText(ticket, 'index("IDX_nexus_context_ticket_workspace_person_project_issued")', "ticket issue-rate lookup index");
requireText(ticket, 'index("IDX_nexus_context_ticket_expiry")', "ticket expiry index");
requireText(ticket, 'index("IDX_nexus_context_ticket_consumed")', "ticket consumed index");
requireText(ticket, 'index("IDX_nexus_context_ticket_scope")', "ticket frozen canonical scope index");

// Loader: workspace/account/external locator and canonical project/world are all
// server-owned query constraints before domain mapping/access evaluation.
requireText(loader, 'eq(nexusPmConnectorAccountsTable.workspaceId, input.workspaceId)', "connector account workspace lookup");
requireText(loader, 'eq(\n                nexusPmConnectorAccountsTable.connectorAccountId,\n                input.connectorAccountId', "exact connector account lookup");
requireText(loader, 'eq(nexusPmAccessDecisionsTable.moduleId, "work-wallet")', "Work Wallet access decision module");
requireText(loader, '"connector.context.read"', "Work Wallet context-read action");
requireText(loader, 'eq(nexusPmConnectorObjectMappingsTable.workspaceId, input.workspaceId)', "mapping workspace lookup");
requireText(loader, 'eq(\n                nexusPmConnectorObjectMappingsTable.externalObjectType,\n                input.externalObjectType', "mapping external type lookup");
requireText(loader, 'eq(\n                nexusPmConnectorObjectMappingsTable.externalObjectId,\n                input.externalRecordReference', "mapping external ID lookup");
requireText(loader, 'eq(nexusPmCanonicalObjectsTable.workspaceId, input.workspaceId)', "canonical object workspace lookup");
requireText(loader, 'eq(nexusPmCanonicalObjectsTable.projectId, input.projectId)', "canonical object project lookup");
requireText(loader, 'eq(nexusPmCanonicalObjectsTable.worldId, input.worldId)', "canonical object world lookup");
requireText(loader, 'exactString(record, "connectorAccountId", row.connectorAccountId)', "mapping JSON/index integrity");
requireText(loader, 'exactString(record, "nexusObjectId", row.nexusObjectId)', "canonical mapping target integrity");
requireText(loader, 'exactString(record, "participationId", row.participationId)', "participation/grant/decision integrity");

// Ensure all Work Wallet persistence proposals are actually exported by the DB schema.
requireText(schemaIndex, 'export * from "./nexusProjectMemoryIdentity";', "identity schema export");
requireText(schemaIndex, 'export * from "./nexusProjectMemoryAccess";', "access schema export");
requireText(schemaIndex, 'export * from "./nexus-context-ticket";', "ticket schema export");

process.stdout.write("WORK_WALLET_DB_SCHEMA_AUDIT_PASS\n");
