import { jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

/**
 * Shared persistence for the existing canonical Project Memory Person record.
 * Person IDs remain Nexus-owned and are never provider subjects, email addresses,
 * connector identities or other external identifiers.
 *
 * Reconciled from the shared identity boundary in PR #106; this is not a WorkSuite-
 * specific Person model.
 */
export const nexusPmPeopleTable = pgTable("nexus_pm_people", {
  personId: text("person_id").primaryKey(),
  displayName: text("display_name").notNull(),
  personType: text("person_type").notNull(),
  status: text("status").notNull(),
  recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
  persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
});

/**
 * Exact authentication-provider -> canonical Person binding.
 * Raw provider subjects are intentionally not persisted; the server resolves on
 * provider + subject digest. No email/name fuzzy matching belongs in this table.
 */
export const nexusIdentityBindingsTable = pgTable(
  "nexus_identity_bindings",
  {
    bindingId: text("binding_id").primaryKey(),
    provider: text("provider").notNull(),
    providerSubjectDigest: text("provider_subject_digest").notNull(),
    personId: text("person_id")
      .notNull()
      .references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
    status: text("status").notNull().default("ACTIVE"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    unique("nexus_identity_provider_subject_digest_uq").on(
      table.provider,
      table.providerSubjectDigest,
    ),
  ],
);

export type NexusPmPersonRow = typeof nexusPmPeopleTable.$inferSelect;
export type NexusIdentityBindingRow = typeof nexusIdentityBindingsTable.$inferSelect;
