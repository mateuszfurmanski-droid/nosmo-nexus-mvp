import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { nexusPersonsTable } from "./nexus-identity";
import { projectsTable } from "./projects";

/**
 * Server-side record for PKG-016 short-lived connector context capabilities.
 *
 * `ticketDigest` is SHA-256 of the opaque browser-visible ticket. The raw ticket
 * is never persisted. Records are intentionally ephemeral and may be deleted
 * with their canonical Person/Project.
 */
export const nexusContextTicketsTable = pgTable(
  "nexus_context_tickets",
  {
    ticketDigest: varchar("ticket_digest", { length: 64 }).primaryKey(),
    personId: varchar("person_id", { length: 96 })
      .notNull()
      .references(() => nexusPersonsTable.id, { onDelete: "cascade" }),
    nexusProjectId: varchar("nexus_project_id", { length: 96 })
      .notNull()
      .references(() => projectsTable.nexusProjectId, { onDelete: "cascade" }),
    participationId: varchar("participation_id", { length: 96 }).notNull(),
    adapterId: varchar("adapter_id", { length: 64 }).notNull(),
    sourceApplication: varchar("source_application", { length: 64 }).notNull(),
    externalRecordReference: varchar("external_record_reference", {
      length: 128,
    }).notNull(),
    purpose: varchar("purpose", { length: 64 })
      .notNull()
      .default("CONNECTOR_CONTEXT_READ"),
    allowedActions: jsonb("allowed_actions")
      .$type<string[]>()
      .notNull()
      .default(sql`'["CONNECTOR_CONTEXT_READ"]'::jsonb`),
    issuedSessionDigest: varchar("issued_session_digest", { length: 64 }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
  },
  (table) => [
    index("IDX_nexus_context_ticket_person_project_issued").on(
      table.personId,
      table.nexusProjectId,
      table.issuedAt,
    ),
    index("IDX_nexus_context_ticket_expiry").on(table.expiresAt),
    index("IDX_nexus_context_ticket_consumed").on(table.consumedAt),
  ],
);

export type NexusContextTicketRecord = typeof nexusContextTicketsTable.$inferSelect;
export type InsertNexusContextTicketRecord = typeof nexusContextTicketsTable.$inferInsert;
