import { index, pgTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

/**
 * Exact server-owned binding from one external authentication subject to one
 * canonical Nexus Person ID.
 *
 * The external subject itself is not persisted. Runtime hashes it before lookup.
 * The canonical Person remains owned by Nexus Project Memory; this table does not
 * create a second Person record or infer identity from email/display name.
 */
export const nexusRuntimeIdentityBindingsTable = pgTable(
  "nexus_runtime_identity_bindings",
  {
    bindingId: varchar("binding_id", { length: 128 }).primaryKey(),
    providerKey: varchar("provider_key", { length: 512 }).notNull(),
    providerSubjectSha256: varchar("provider_subject_sha256", { length: 64 }).notNull(),
    canonicalPersonId: varchar("canonical_person_id", { length: 128 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("ACTIVE"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("UQ_nexus_runtime_identity_provider_subject").on(
      table.providerKey,
      table.providerSubjectSha256,
    ),
    index("IDX_nexus_runtime_identity_person").on(table.canonicalPersonId),
    index("IDX_nexus_runtime_identity_status").on(table.status),
  ],
);

export type NexusRuntimeIdentityBindingRow =
  typeof nexusRuntimeIdentityBindingsTable.$inferSelect;
export type InsertNexusRuntimeIdentityBindingRow =
  typeof nexusRuntimeIdentityBindingsTable.$inferInsert;
