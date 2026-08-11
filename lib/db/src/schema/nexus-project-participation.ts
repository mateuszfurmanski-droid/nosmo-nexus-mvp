import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { projectsTable } from "./projects";
import { nexusPersonsTable } from "./nexus-identity";

export type NexusProjectApplicationPermission = {
  app: string;
  effect: "allow" | "deny";
  reason?: string;
};

/**
 * Persisted Person <-> Project participation used by server authorization.
 *
 * Profession/qualification remains Person identity context elsewhere and is not
 * stored here as an authority source. Project function, assignment and explicit
 * application permission belong to this project-scoped relationship.
 */
export const nexusProjectParticipationsTable = pgTable(
  "nexus_project_participations",
  {
    id: varchar("id", { length: 96 }).primaryKey(),
    personId: varchar("person_id", { length: 96 })
      .notNull()
      .references(() => nexusPersonsTable.id, { onDelete: "restrict" }),
    projectId: integer("project_id")
      .notNull()
      .references(() => projectsTable.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
    functions: jsonb("functions")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    assignments: jsonb("assignments")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    tradeScopes: jsonb("trade_scopes")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    workPackageScopes: jsonb("work_package_scopes")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    applicationPermissions: jsonb("application_permissions")
      .$type<NexusProjectApplicationPermission[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("IDX_nexus_project_participation_person_project").on(
      table.personId,
      table.projectId,
    ),
    index("IDX_nexus_project_participation_status").on(table.status),
  ],
);

export type NexusProjectParticipation = typeof nexusProjectParticipationsTable.$inferSelect;
export type InsertNexusProjectParticipation = typeof nexusProjectParticipationsTable.$inferInsert;
