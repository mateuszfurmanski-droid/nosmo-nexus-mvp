import { pgTable, uuid, text, integer, real, timestamp, jsonb, unique, customType } from "drizzle-orm/pg-core";

// Postgres bytea <-> Node Buffer. node-postgres returns/accepts Buffer for bytea.
const bytea = customType<{ data: Buffer; driverData: Buffer; default: false }>({
  dataType() {
    return "bytea";
  },
});

/** A single extracted door record from a processed Excel schedule. */
export type DoorRow = {
  id: string;
  type: string;
  status: string;
  materials: string;
};

/**
 * Uploaded files. This is an UNAUTHENTICATED storage surface by design
 * (no workspace scoping) — it is mounted before the auth/workspace middleware.
 * Stores the untouched original plus processing status and, for spreadsheets,
 * the extracted door rows. PDF page images live in `file_pages`.
 */
export const filesTable = pgTable("demo_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  // "pdf" | "excel"
  kind: text("kind").notNull(),
  originalBytes: bytea("original_bytes").notNull(),
  // "processing" | "ready" | "failed"
  status: text("status").notNull().default("processing"),
  error: text("error"),
  pageCount: integer("page_count").notNull().default(0),
  processedJson: jsonb("processed_json").$type<DoorRow[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One rendered PNG image per PDF page, used for rendering and clickable areas. */
export const filePagesTable = pgTable("demo_file_pages", {
  id: uuid("id").primaryKey().defaultRandom(),
  fileId: uuid("file_id")
    .notNull()
    .references(() => filesTable.id, { onDelete: "cascade" }),
  pageNumber: integer("page_number").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  mimeType: text("mime_type").notNull().default("image/png"),
  imageBytes: bytea("image_bytes").notNull(),
});

/**
 * Mutable per-door REVIEW state for the plan-review workflow. Keyed by the door
 * id from the Excel schedule (`demo_files.processedJson[].id`) within a file.
 * Holds the traffic-light status and an optional site photo. Kept separate from
 * the immutable extracted source rows in `processedJson`. `x`/`y` are optional
 * fractional (0..1) pin positions over the plan image.
 */
export const doorStateTable = pgTable(
  "demo_door_state",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fileId: uuid("file_id")
      .notNull()
      .references(() => filesTable.id, { onDelete: "cascade" }),
    doorId: text("door_id").notNull(),
    // "red" | "amber" | "green" | null
    reviewStatus: text("review_status"),
    photoBytes: bytea("photo_bytes"),
    photoMimeType: text("photo_mime_type"),
    x: real("x"),
    y: real("y"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("demo_door_state_file_door_uq").on(t.fileId, t.doorId)],
);

export type FileRecord = typeof filesTable.$inferSelect;
export type InsertFile = typeof filesTable.$inferInsert;
export type FilePage = typeof filePagesTable.$inferSelect;
export type InsertFilePage = typeof filePagesTable.$inferInsert;
export type DoorState = typeof doorStateTable.$inferSelect;
export type InsertDoorState = typeof doorStateTable.$inferInsert;
