import { integer, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";

/**
 * Durable canonical Nexus Cloud persistence tables.
 *
 * These tables intentionally do not reuse `demo_files`: the demo upload surface stores
 * binary payloads before workspace auth and has different semantics. Nexus Cloud keeps
 * canonical Project Memory metadata and provider identity only; binary content stays in
 * the configured provider.
 */

export const nexusPmFilesTable = pgTable(
  "nexus_pm_files",
  {
    fileId: text("file_id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    worldId: text("world_id").notNull(),
    providerConnectorId: text("provider_connector_id").notNull(),
    providerObjectId: text("provider_object_id").notNull(),
    storageObjectKey: text("storage_object_key").notNull(),
    recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("nexus_pm_files_provider_object_uq").on(
      t.workspaceId,
      t.providerConnectorId,
      t.providerObjectId,
    ),
    unique("nexus_pm_files_storage_object_uq").on(
      t.workspaceId,
      t.providerConnectorId,
      t.storageObjectKey,
    ),
  ],
);

export const nexusPmCanonicalObjectsTable = pgTable("nexus_pm_canonical_objects", {
  objectId: text("object_id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull(),
  worldId: text("world_id").notNull(),
  objectType: text("object_type").notNull(),
  recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
  persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
});

export const nexusPmExternalReferencesTable = pgTable(
  "nexus_pm_external_references",
  {
    externalReferenceId: text("external_reference_id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    nexusObjectId: text("nexus_object_id").notNull(),
    providerConnectorId: text("provider_connector_id").notNull(),
    providerObjectId: text("provider_object_id").notNull(),
    recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("nexus_pm_external_ref_provider_object_uq").on(
      t.workspaceId,
      t.providerConnectorId,
      t.providerObjectId,
    ),
  ],
);

export const nexusPmStorageRecordsTable = pgTable(
  "nexus_pm_storage_records",
  {
    storageRecordId: text("storage_record_id").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    worldId: text("world_id").notNull(),
    objectId: text("object_id").notNull(),
    providerConnectorId: text("provider_connector_id").notNull(),
    storageObjectKey: text("storage_object_key").notNull(),
    recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    unique("nexus_pm_storage_object_key_uq").on(
      t.workspaceId,
      t.providerConnectorId,
      t.storageObjectKey,
    ),
  ],
);

export const nexusPmAuditEventsTable = pgTable("nexus_pm_audit_events", {
  eventId: text("event_id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  projectId: text("project_id").notNull(),
  worldId: text("world_id").notNull(),
  eventType: text("event_type").notNull(),
  recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
  persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
});

export const nexusPmCloudCommitsTable = pgTable(
  "nexus_pm_cloud_commits",
  {
    idempotencyKey: text("idempotency_key").primaryKey(),
    workspaceId: integer("workspace_id")
      .notNull()
      .references(() => workspacesTable.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    worldId: text("world_id").notNull(),
    pendingAssetId: text("pending_asset_id").notNull(),
    accessDecisionId: text("access_decision_id").notNull(),
    providerConnectorId: text("provider_connector_id").notNull(),
    providerObjectId: text("provider_object_id").notNull(),
    fileId: text("file_id").notNull(),
    canonicalFileObjectId: text("canonical_file_object_id").notNull(),
    externalReferenceId: text("external_reference_id").notNull(),
    storageRecordId: text("storage_record_id").notNull(),
    auditEventId: text("audit_event_id").notNull(),
    committedAt: timestamp("committed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("nexus_pm_cloud_commit_provider_object_uq").on(
      t.workspaceId,
      t.providerConnectorId,
      t.providerObjectId,
    ),
    unique("nexus_pm_cloud_commit_file_uq").on(t.workspaceId, t.fileId),
  ],
);

export type NexusPmFileRow = typeof nexusPmFilesTable.$inferSelect;
export type NexusPmCloudCommitRow = typeof nexusPmCloudCommitsTable.$inferSelect;
