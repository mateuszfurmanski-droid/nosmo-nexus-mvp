import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";

/**
 * Durable pre-provider operation authority for Nexus Cloud writes.
 *
 * This table exists to close the cross-instance race that cannot be solved by
 * an in-process lock or a provider lookup alone. One canonical provider write
 * identity owns one lease at a time across all Nexus API instances sharing the
 * same PostgreSQL database.
 */
export const nexusPmCloudWriteOperationsTable = pgTable(
  "nexus_pm_cloud_write_operations",
  {
    operationId: varchar("operation_id", { length: 128 }).primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    projectId: varchar("project_id", { length: 128 }).notNull(),
    worldId: varchar("world_id", { length: 128 }).notNull(),
    providerConnectorId: varchar("provider_connector_id", { length: 128 }).notNull(),
    providerWriteIdentity: varchar("provider_write_identity", { length: 160 }).notNull(),
    requestFingerprint: varchar("request_fingerprint", { length: 64 }).notNull(),
    state: varchar("state", { length: 32 }).notNull(),
    leaseOwner: varchar("lease_owner", { length: 128 }),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    providerObjectId: varchar("provider_object_id", { length: 512 }),
    providerReceiptJson: jsonb("provider_receipt_json").$type<Record<string, unknown>>(),
    canonicalFileId: varchar("canonical_file_id", { length: 128 }),
    lastErrorCode: varchar("last_error_code", { length: 160 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("UQ_nexus_pm_cloud_write_provider_identity").on(
      table.providerWriteIdentity,
    ),
    index("IDX_nexus_pm_cloud_write_scope").on(
      table.workspaceId,
      table.projectId,
      table.worldId,
    ),
    index("IDX_nexus_pm_cloud_write_state").on(table.state),
    index("IDX_nexus_pm_cloud_write_lease").on(table.leaseExpiresAt),
    index("IDX_nexus_pm_cloud_write_provider_object").on(
      table.workspaceId,
      table.providerConnectorId,
      table.providerObjectId,
    ),
  ],
);

export type NexusPmCloudWriteOperationRow =
  typeof nexusPmCloudWriteOperationsTable.$inferSelect;
