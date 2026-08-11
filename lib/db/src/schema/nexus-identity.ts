import { index, pgTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

/**
 * Canonical Nexus person identity.
 *
 * This ID is owned by Nexus and must not be replaced by an OIDC subject,
 * email address, Work Wallet identifier or any other external identity.
 */
export const nexusPersonsTable = pgTable("nexus_persons", {
  id: varchar("id", { length: 96 }).primaryKey(),
  displayName: text("display_name"),
  status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/**
 * Server-owned binding between one authenticated provider subject and one
 * canonical Nexus person. Similar names or matching email addresses never
 * create this relationship automatically.
 */
export const nexusIdentityBindingsTable = pgTable(
  "nexus_identity_bindings",
  {
    id: varchar("id", { length: 96 }).primaryKey(),
    provider: varchar("provider", { length: 512 }).notNull(),
    providerSubject: varchar("provider_subject", { length: 512 }).notNull(),
    personId: varchar("person_id", { length: 96 })
      .notNull()
      .references(() => nexusPersonsTable.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
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

export type NexusPerson = typeof nexusPersonsTable.$inferSelect;
export type InsertNexusPerson = typeof nexusPersonsTable.$inferInsert;
export type NexusIdentityBinding = typeof nexusIdentityBindingsTable.$inferSelect;
export type InsertNexusIdentityBinding = typeof nexusIdentityBindingsTable.$inferInsert;
