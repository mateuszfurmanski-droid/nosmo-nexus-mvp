import { index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";
import { nexusPmPeopleTable } from "./nexusProjectMemoryIdentity";

/**
 * Shared durable persistence for the existing PR #90 Project Participation,
 * PermissionGrant and AccessDecision contracts. The full canonical record remains
 * in recordJson; indexed columns exist only for exact server-side lookup.
 *
 * Reconciled from PR #109 without importing Work Wallet connector tables into the
 * e-SAFE core slice.
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
      .references(() => nexusPmProjectParticipationsTable.participationId, { onDelete: "cascade" }),
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
    personId: text("person_id").references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
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

export type NexusPmProjectParticipationRow = typeof nexusPmProjectParticipationsTable.$inferSelect;
export type NexusPmPermissionGrantRow = typeof nexusPmPermissionGrantsTable.$inferSelect;
export type NexusPmAccessDecisionRow = typeof nexusPmAccessDecisionsTable.$inferSelect;
