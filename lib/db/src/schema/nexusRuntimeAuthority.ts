import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Runtime persistence adapter for the canonical #90 Person/access semantics.
 *
 * These rows are persistence only. Canonical meaning remains defined by the
 * #90 Project Memory / access contracts; external provider subjects never become Person IDs.
 */
export const nexusPersonsTable = pgTable("nexus_persons", {
  id: varchar("id", { length: 96 }).primaryKey(),
  displayName: text("display_name"),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Exact server-owned provider + providerSubject -> canonical Person binding. */
export const nexusIdentityBindingsTable = pgTable(
  "nexus_identity_bindings",
  {
    id: varchar("id", { length: 96 }).primaryKey(),
    provider: varchar("provider", { length: 512 }).notNull(),
    providerSubject: varchar("provider_subject", { length: 512 }).notNull(),
    personId: varchar("person_id", { length: 96 })
      .notNull()
      .references(() => nexusPersonsTable.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 32 }).notNull().default("active"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("UQ_nexus_identity_provider_subject").on(
      table.provider,
      table.providerSubject,
    ),
    index("IDX_nexus_identity_person").on(table.personId),
    index("IDX_nexus_identity_status").on(table.status),
  ],
);

/**
 * Canonical Person participation in one exact Project World.
 *
 * Unlike historical PR #56 this does not use a legacy integer project row as
 * cross-module authority. Both projectId and worldId are explicit Nexus IDs.
 */
export const nexusProjectParticipationsTable = pgTable(
  "nexus_project_participations",
  {
    id: varchar("id", { length: 96 }).primaryKey(),
    personId: varchar("person_id", { length: 96 })
      .notNull()
      .references(() => nexusPersonsTable.id, { onDelete: "restrict" }),
    projectId: varchar("project_id", { length: 96 }).notNull(),
    worldId: varchar("world_id", { length: 96 }).notNull(),
    participationStatus: varchar("participation_status", { length: 32 })
      .notNull()
      .default("active"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validTo: timestamp("valid_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("IDX_nexus_participation_person_world").on(
      table.personId,
      table.projectId,
      table.worldId,
    ),
    index("IDX_nexus_participation_status").on(table.participationStatus),
  ],
);

/**
 * Explicit allow/deny grants are separate from Project Participation, matching #90.
 * A participation row by itself never grants Android Work Mode / WorkSuite access.
 */
export const nexusPermissionGrantsTable = pgTable(
  "nexus_permission_grants",
  {
    id: varchar("id", { length: 96 }).primaryKey(),
    participationId: varchar("participation_id", { length: 96 })
      .notNull()
      .references(() => nexusProjectParticipationsTable.id, { onDelete: "cascade" }),
    effect: varchar("effect", { length: 16 }).notNull(),
    moduleId: varchar("module_id", { length: 96 }),
    actionKey: varchar("action_key", { length: 160 }),
    objectScopeId: varchar("object_scope_id", { length: 96 }),
    dataScope: varchar("data_scope", { length: 160 }),
    reason: text("reason").notNull(),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validTo: timestamp("valid_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("IDX_nexus_permission_participation").on(table.participationId),
    index("IDX_nexus_permission_scope").on(table.moduleId, table.actionKey),
    index("IDX_nexus_permission_effect").on(table.effect),
  ],
);

export type NexusRuntimePerson = typeof nexusPersonsTable.$inferSelect;
export type InsertNexusRuntimePerson = typeof nexusPersonsTable.$inferInsert;
export type NexusRuntimeIdentityBinding = typeof nexusIdentityBindingsTable.$inferSelect;
export type InsertNexusRuntimeIdentityBinding = typeof nexusIdentityBindingsTable.$inferInsert;
export type NexusRuntimeProjectParticipation =
  typeof nexusProjectParticipationsTable.$inferSelect;
export type InsertNexusRuntimeProjectParticipation =
  typeof nexusProjectParticipationsTable.$inferInsert;
export type NexusRuntimePermissionGrant = typeof nexusPermissionGrantsTable.$inferSelect;
export type InsertNexusRuntimePermissionGrant =
  typeof nexusPermissionGrantsTable.$inferInsert;
