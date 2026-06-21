import { pgTable, uuid, text, integer, timestamp, jsonb, customType } from "drizzle-orm/pg-core";

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

export type FileRecord = typeof filesTable.$inferSelect;
export type InsertFile = typeof filesTable.$inferInsert;
export type FilePage = typeof filePagesTable.$inferSelect;
export type InsertFilePage = typeof filePagesTable.$inferInsert;
