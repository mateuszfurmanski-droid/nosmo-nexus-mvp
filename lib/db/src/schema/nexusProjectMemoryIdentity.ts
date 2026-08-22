import { jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

/**
 * Canonical Nexus Person persistence for the shared Project Memory identity boundary.
 *
 * `personId` is Nexus-owned. It is never an OIDC subject, email address, Work Wallet
 * user identifier or other provider identity. The complete Project Memory Person
 * record is retained as JSON so this table is persistence for the existing
 * `NexusPersonRecord` contract rather than a competing person model.
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
 * Exact server-owned authentication-provider -> canonical Person binding.
 *
 * Raw provider subjects are intentionally not persisted. The runtime hashes the exact
 * authenticated subject with SHA-256 and resolves on provider + subject digest. No
 * email/name fuzzy matching or automatic login-time Person creation is permitted.
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
