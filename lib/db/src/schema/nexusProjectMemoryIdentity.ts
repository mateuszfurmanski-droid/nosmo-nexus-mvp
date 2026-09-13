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

/**
 * One-time staging identity claim. Only a digest of the high-entropy claim code is
 * persisted. The authenticated provider subject is also persisted only as the
 * existing subject digest when a claim is consumed.
 */
export const nexusIdentityClaimsTable = pgTable(
  "nexus_identity_claims",
  {
    claimId: text("claim_id").primaryKey(),
    codeDigest: text("code_digest").notNull(),
    personId: text("person_id")
      .notNull()
      .references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
    projectId: text("project_id").notNull(),
    worldId: text("world_id").notNull(),
    status: text("status").notNull().default("ACTIVE"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    consumedProviderSubjectDigest: text("consumed_provider_subject_digest"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("nexus_identity_claim_code_digest_uq").on(table.codeDigest)],
);

export type NexusPmPersonRow = typeof nexusPmPeopleTable.$inferSelect;
export type NexusIdentityBindingRow = typeof nexusIdentityBindingsTable.$inferSelect;
export type NexusIdentityClaimRow = typeof nexusIdentityClaimsTable.$inferSelect;
