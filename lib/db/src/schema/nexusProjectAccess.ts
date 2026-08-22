import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";

/**
 * Indexed persistence for the canonical #90 ProjectParticipation record.
 * `recordJson` contains the complete canonical record; indexed columns exist only
 * to resolve the exact workspace/person/project/world boundary efficiently.
 */
export const nexusPmProjectParticipationsTable = pgTable(
  "nexus_pm_project_participations",
  {
    participationId: varchar("participation_id", { length: 128 }).primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    canonicalPersonId: varchar("canonical_person_id", { length: 128 }).notNull(),
    projectId: varchar("project_id", { length: 128 }).notNull(),
    worldId: varchar("world_id", { length: 128 }).notNull(),
    participationStatus: varchar("participation_status", { length: 32 }).notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validTo: timestamp("valid_to", { withTimezone: true }),
    recordJson: jsonb("record_json").notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("IDX_nexus_pm_participation_scope").on(
      table.workspaceId,
      table.canonicalPersonId,
      table.projectId,
      table.worldId,
    ),
    index("IDX_nexus_pm_participation_status").on(table.participationStatus),
  ],
);

/**
 * Indexed persistence for canonical #90 PermissionGrant records.
 * No application-specific JSON permission shortcut is introduced here.
 */
export const nexusPmPermissionGrantsTable = pgTable(
  "nexus_pm_permission_grants",
  {
    grantId: varchar("grant_id", { length: 128 }).primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    participationId: varchar("participation_id", { length: 128 })
      .notNull()
      .references(() => nexusPmProjectParticipationsTable.participationId, {
        onDelete: "cascade",
      }),
    effect: varchar("effect", { length: 16 }).notNull(),
    moduleId: varchar("module_id", { length: 128 }),
    actionKey: varchar("action_key", { length: 128 }),
    objectScopeId: varchar("object_scope_id", { length: 128 }),
    dataScope: varchar("data_scope", { length: 128 }),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validTo: timestamp("valid_to", { withTimezone: true }),
    recordJson: jsonb("record_json").notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("IDX_nexus_pm_permission_participation").on(
      table.workspaceId,
      table.participationId,
    ),
    index("IDX_nexus_pm_permission_action").on(
      table.workspaceId,
      table.moduleId,
      table.actionKey,
    ),
    index("IDX_nexus_pm_permission_effect").on(table.effect),
  ],
);

export type NexusPmProjectParticipationRow =
  typeof nexusPmProjectParticipationsTable.$inferSelect;
export type NexusPmPermissionGrantRow =
  typeof nexusPmPermissionGrantsTable.$inferSelect;
