import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";
import { nexusPmPeopleTable } from "./nexusProjectMemoryIdentity";
import { nexusPmCanonicalObjectsTable } from "./nexusProjectMemoryCloud";

/**
 * Durable persistence for the existing PR #90 Project Memory access records.
 * These tables do not define a second permission model; recordJson retains the
 * canonical Nexus record and the indexed columns exist only for exact server lookup.
 */
export const nexusPmProjectParticipationsTable = pgTable(
  "nexus_pm_project_participations",
  {
    participationId: text("participation_id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    personId: text("person_id")
      .notNull()
      .references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
    projectId: text("project_id").notNull(),
    worldId: text("world_id").notNull(),
    participationStatus: text("participation_status").notNull(),
    recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("IDX_nexus_pm_participation_person_scope").on(
      table.workspaceId,
      table.personId,
      table.projectId,
      table.worldId,
    ),
  ],
);

export const nexusPmPermissionGrantsTable = pgTable(
  "nexus_pm_permission_grants",
  {
    grantId: text("grant_id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    participationId: text("participation_id")
      .notNull()
      .references(() => nexusPmProjectParticipationsTable.participationId, {
        onDelete: "cascade",
      }),
    effect: text("effect").notNull(),
    moduleId: text("module_id"),
    actionKey: text("action_key"),
    objectScopeId: text("object_scope_id"),
    recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("IDX_nexus_pm_permission_grant_scope").on(
      table.workspaceId,
      table.participationId,
      table.moduleId,
      table.actionKey,
      table.objectScopeId,
    ),
  ],
);

export const nexusPmAccessDecisionsTable = pgTable(
  "nexus_pm_access_decisions",
  {
    decisionId: text("decision_id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    personId: text("person_id").references(() => nexusPmPeopleTable.personId, {
      onDelete: "restrict",
    }),
    participationId: text("participation_id").references(
      () => nexusPmProjectParticipationsTable.participationId,
      { onDelete: "restrict" },
    ),
    projectId: text("project_id").notNull(),
    worldId: text("world_id").notNull(),
    moduleId: text("module_id"),
    actionKey: text("action_key"),
    objectScopeId: text("object_scope_id"),
    result: text("result").notNull(),
    evaluatedAt: timestamp("evaluated_at", { withTimezone: true }).notNull(),
    recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("IDX_nexus_pm_access_decision_scope").on(
      table.workspaceId,
      table.personId,
      table.projectId,
      table.worldId,
      table.moduleId,
      table.actionKey,
      table.objectScopeId,
      table.evaluatedAt,
    ),
  ],
);

/**
 * Persistence for the existing canonical connector account/mapping records used by
 * Work Wallet Slice A. External provider IDs remain external; mappings point to an
 * already-existing canonical Nexus object and never create Nexus identity.
 */
export const nexusPmConnectorAccountsTable = pgTable(
  "nexus_pm_connector_accounts",
  {
    connectorAccountId: text("connector_account_id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    connectorDefinitionId: text("connector_definition_id").notNull(),
    tenantId: text("tenant_id").notNull(),
    connectionState: text("connection_state").notNull(),
    recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("IDX_nexus_pm_connector_account_workspace").on(
      table.workspaceId,
      table.connectorDefinitionId,
    ),
  ],
);

export const nexusPmConnectorObjectMappingsTable = pgTable(
  "nexus_pm_connector_object_mappings",
  {
    mappingId: text("mapping_id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    connectorAccountId: text("connector_account_id")
      .notNull()
      .references(() => nexusPmConnectorAccountsTable.connectorAccountId, {
        onDelete: "cascade",
      }),
    nexusObjectId: text("nexus_object_id")
      .notNull()
      .references(() => nexusPmCanonicalObjectsTable.objectId, {
        onDelete: "restrict",
      }),
    externalObjectType: text("external_object_type").notNull(),
    externalObjectId: text("external_object_id").notNull(),
    mappingMethod: text("mapping_method").notNull(),
    recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("IDX_nexus_pm_connector_mapping_exact").on(
      table.workspaceId,
      table.connectorAccountId,
      table.externalObjectType,
      table.externalObjectId,
    ),
  ],
);

export type NexusPmProjectParticipationRow =
  typeof nexusPmProjectParticipationsTable.$inferSelect;
export type NexusPmPermissionGrantRow =
  typeof nexusPmPermissionGrantsTable.$inferSelect;
export type NexusPmAccessDecisionRow =
  typeof nexusPmAccessDecisionsTable.$inferSelect;
export type NexusPmConnectorAccountRow =
  typeof nexusPmConnectorAccountsTable.$inferSelect;
export type NexusPmConnectorObjectMappingRow =
  typeof nexusPmConnectorObjectMappingsTable.$inferSelect;
