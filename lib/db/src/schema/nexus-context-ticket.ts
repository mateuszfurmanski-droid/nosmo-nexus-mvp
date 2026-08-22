import { sql } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Ephemeral capability records for the Work Wallet browser Context Ticket flow.
 *
 * This table does NOT own canonical Person, Project, Participation, AccessDecision
 * or Nexus Object identity. Those identifiers are accepted only after the
 * canonical #90 access gate passes and are stored here as capability scope.
 *
 * The raw browser-visible ticket is never persisted; only its SHA-256 digest is.
 */
export const nexusContextTicketsTable = pgTable(
  "nexus_context_tickets",
  {
    ticketDigest: varchar("ticket_digest", { length: 64 }).primaryKey(),
    personId: varchar("person_id", { length: 160 }).notNull(),
    projectId: varchar("project_id", { length: 160 }).notNull(),
    worldId: varchar("world_id", { length: 160 }).notNull(),
    participationId: varchar("participation_id", { length: 160 }).notNull(),
    accessDecisionId: varchar("access_decision_id", { length: 160 }).notNull(),
    nexusObjectId: varchar("nexus_object_id", { length: 160 }).notNull(),
    connectorAccountId: varchar("connector_account_id", { length: 160 }).notNull(),
    adapterId: varchar("adapter_id", { length: 64 }).notNull(),
    sourceApplication: varchar("source_application", { length: 64 }).notNull(),
    externalObjectType: varchar("external_object_type", { length: 120 }).notNull(),
    externalRecordReference: varchar("external_record_reference", {
      length: 256,
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
      table.projectId,
      table.issuedAt,
    ),
    index("IDX_nexus_context_ticket_expiry").on(table.expiresAt),
    index("IDX_nexus_context_ticket_consumed").on(table.consumedAt),
    index("IDX_nexus_context_ticket_scope").on(
      table.projectId,
      table.worldId,
      table.nexusObjectId,
    ),
  ],
);

export type NexusContextTicketRecord = typeof nexusContextTicketsTable.$inferSelect;
export type InsertNexusContextTicketRecord = typeof nexusContextTicketsTable.$inferInsert;
