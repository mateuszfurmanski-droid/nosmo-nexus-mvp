import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { workspacesTable } from "./workspaces";
import { nexusPmPeopleTable } from "./nexusProjectMemoryIdentity";
import { nexusPmTasksTable, nexusPmTimelineEventsTable } from "./nexusProjectMemoryWork";

export const nexusWpPackagesTable = pgTable(
  "nexus_wp_packages",
  {
    packageId: text("package_id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    worldId: text("world_id").notNull(),
    currentRevision: integer("current_revision").notNull(),
    lifecycle: text("lifecycle").notNull(),
    compositionState: text("composition_state").notNull(),
    assignmentState: text("assignment_state").notNull(),
    creatorPersonId: text("creator_person_id").notNull().references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
    title: text("title").notNull(),
    description: text("description"),
    deadline: timestamp("deadline", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("IDX_nexus_wp_package_scope").on(table.workspaceId, table.projectId, table.worldId, table.lifecycle, table.assignmentState),
  ],
);

export const nexusWpPackageRevisionsTable = pgTable(
  "nexus_wp_package_revisions",
  {
    packageId: text("package_id").notNull().references(() => nexusWpPackagesTable.packageId, { onDelete: "cascade" }),
    revision: integer("revision").notNull(),
    snapshotJson: jsonb("snapshot_json").$type<Record<string, unknown>>().notNull(),
    createdByPersonId: text("created_by_person_id").notNull().references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.packageId, table.revision] })],
);

export const nexusWpPackageGroupsTable = pgTable(
  "nexus_wp_package_groups",
  {
    packageId: text("package_id").notNull(),
    packageRevision: integer("package_revision").notNull(),
    groupId: text("group_id").notNull(),
    groupOrder: integer("group_order").notNull(),
    title: text("title").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.packageId, table.packageRevision, table.groupId] }),
    index("IDX_nexus_wp_group_order").on(table.packageId, table.packageRevision, table.groupOrder, table.groupId),
  ],
);

export const nexusWpPackageItemsTable = pgTable(
  "nexus_wp_package_items",
  {
    packageId: text("package_id").notNull(),
    packageRevision: integer("package_revision").notNull(),
    itemId: text("item_id").notNull(),
    itemOrder: integer("item_order").notNull(),
    groupId: text("group_id"),
    itemKind: text("item_kind").notNull(),
    title: text("title").notNull(),
    required: boolean("required").notNull(),
    taskId: text("task_id").references(() => nexusPmTasksTable.taskId, { onDelete: "restrict" }),
    appId: text("app_id"),
    moduleId: text("module_id"),
    documentId: text("document_id"),
    fileId: text("file_id"),
    drawingReferenceId: text("drawing_reference_id"),
    checklistId: text("checklist_id"),
    evidenceRequirementId: text("evidence_requirement_id"),
    objectContextId: text("object_context_id"),
    locationContextId: text("location_context_id"),
    targetCapabilityRequirementsJson: jsonb("target_capability_requirements_json").$type<unknown[]>().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.packageId, table.packageRevision, table.itemId] }),
    index("IDX_nexus_wp_item_order").on(table.packageId, table.packageRevision, table.itemOrder, table.itemId),
  ],
);

export const nexusWpChecklistDefinitionsTable = pgTable(
  "nexus_wp_checklist_definitions",
  {
    packageId: text("package_id").notNull(),
    packageRevision: integer("package_revision").notNull(),
    checklistId: text("checklist_id").notNull(),
    checklistRevision: integer("checklist_revision").notNull(),
    title: text("title").notNull(),
  },
  (table) => [primaryKey({ columns: [table.packageId, table.packageRevision, table.checklistId, table.checklistRevision] })],
);

export const nexusWpChecklistDefinitionItemsTable = pgTable(
  "nexus_wp_checklist_definition_items",
  {
    packageId: text("package_id").notNull(),
    packageRevision: integer("package_revision").notNull(),
    checklistId: text("checklist_id").notNull(),
    checklistRevision: integer("checklist_revision").notNull(),
    itemId: text("item_id").notNull(),
    itemOrder: integer("item_order").notNull(),
    title: text("title").notNull(),
    required: boolean("required").notNull(),
    expectedResponseType: text("expected_response_type").notNull(),
  },
  (table) => [primaryKey({ columns: [table.packageId, table.packageRevision, table.checklistId, table.checklistRevision, table.itemId] })],
);

export const nexusWpEvidenceRequirementsTable = pgTable(
  "nexus_wp_evidence_requirements",
  {
    packageId: text("package_id").notNull(),
    packageRevision: integer("package_revision").notNull(),
    requirementId: text("requirement_id").notNull(),
    requirementKind: text("requirement_kind").notNull(),
    taskId: text("task_id").references(() => nexusPmTasksTable.taskId, { onDelete: "restrict" }),
    requiredCount: integer("required_count").notNull(),
    allowedEvidenceType: text("allowed_evidence_type").notNull(),
    description: text("description").notNull(),
    requiredBeforeFinish: boolean("required_before_finish").notNull(),
    objectContextId: text("object_context_id"),
    locationContextId: text("location_context_id"),
  },
  (table) => [primaryKey({ columns: [table.packageId, table.packageRevision, table.requirementId] })],
);

export const nexusWpAssignmentsTable = pgTable(
  "nexus_wp_assignments",
  {
    assignmentId: text("assignment_id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    worldId: text("world_id").notNull(),
    packageId: text("package_id").notNull().references(() => nexusWpPackagesTable.packageId, { onDelete: "restrict" }),
    assignedPackageRevision: integer("assigned_package_revision").notNull(),
    recipientType: text("recipient_type").notNull(),
    recipientPersonId: text("recipient_person_id").references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
    recipientObjectId: text("recipient_object_id"),
    assignedByPersonId: text("assigned_by_person_id").notNull().references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull(),
    assignmentStatus: text("assignment_status").notNull(),
    deadlineSnapshot: timestamp("deadline_snapshot", { withTimezone: true }),
    sourceSemanticOperationId: text("source_semantic_operation_id").notNull(),
    lifecycleState: text("lifecycle_state").notNull(),
    snapshotJson: jsonb("snapshot_json").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    uniqueIndex("nexus_wp_assignment_semantic_operation_uq").on(table.sourceSemanticOperationId),
    index("IDX_nexus_wp_assignment_scope").on(table.workspaceId, table.projectId, table.worldId, table.packageId, table.lifecycleState),
  ],
);

export const nexusWpChecklistRunsTable = pgTable("nexus_wp_checklist_runs", {
  runId: text("run_id").primaryKey(),
  workPackageAssignmentId: text("work_package_assignment_id").notNull().references(() => nexusWpAssignmentsTable.assignmentId, { onDelete: "cascade" }),
  taskId: text("task_id").notNull().references(() => nexusPmTasksTable.taskId, { onDelete: "restrict" }),
  workerPersonId: text("worker_person_id").notNull().references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
  checklistId: text("checklist_id").notNull(),
  checklistRevision: integer("checklist_revision").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  completionState: text("completion_state").notNull(),
});

export const nexusWpChecklistRunResponsesTable = pgTable(
  "nexus_wp_checklist_run_responses",
  {
    runId: text("run_id").notNull().references(() => nexusWpChecklistRunsTable.runId, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    responseJson: jsonb("response_json").$type<unknown>().notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.runId, table.itemId] })],
);

export const nexusPmNexusEventsTable = pgTable(
  "nexus_pm_nexus_events",
  {
    eventId: text("event_id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    worldId: text("world_id").notNull(),
    eventType: text("event_type").notNull(),
    correlationId: text("correlation_id"),
    recordJson: jsonb("record_json").$type<Record<string, unknown>>().notNull(),
    persistedAt: timestamp("persisted_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("IDX_nexus_pm_nexus_event_scope").on(table.workspaceId, table.projectId, table.worldId, table.correlationId)],
);

export const nexusSemanticOperationReceiptsTable = pgTable(
  "nexus_semantic_operation_receipts",
  {
    semanticOperationId: text("semantic_operation_id").primaryKey(),
    workspaceId: integer("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
    projectId: text("project_id").notNull(),
    worldId: text("world_id").notNull(),
    canonicalFingerprint: text("canonical_fingerprint").notNull(),
    semanticIntent: text("semantic_intent").notNull(),
    actorPersonId: text("actor_person_id").notNull().references(() => nexusPmPeopleTable.personId, { onDelete: "restrict" }),
    authorityRevision: text("authority_revision").notNull(),
    packageId: text("package_id").references(() => nexusWpPackagesTable.packageId, { onDelete: "restrict" }),
    assignmentId: text("assignment_id").references(() => nexusWpAssignmentsTable.assignmentId, { onDelete: "restrict" }),
    nexusEventId: text("nexus_event_id").notNull().references(() => nexusPmNexusEventsTable.eventId, { onDelete: "restrict" }),
    timelineEventId: text("timeline_event_id").notNull().references(() => nexusPmTimelineEventsTable.timelineEventId, { onDelete: "restrict" }),
    committedAt: timestamp("committed_at", { withTimezone: true }).notNull(),
    effectSummaryJson: jsonb("effect_summary_json").$type<Record<string, unknown>>().notNull(),
  },
  (table) => [index("IDX_nexus_semantic_receipt_scope").on(table.workspaceId, table.projectId, table.worldId, table.committedAt)],
);

export type NexusWpPackageRow = typeof nexusWpPackagesTable.$inferSelect;
export type NexusWpPackageRevisionRow = typeof nexusWpPackageRevisionsTable.$inferSelect;
export type NexusWpAssignmentRow = typeof nexusWpAssignmentsTable.$inferSelect;
export type NexusSemanticOperationReceiptRow = typeof nexusSemanticOperationReceiptsTable.$inferSelect;
