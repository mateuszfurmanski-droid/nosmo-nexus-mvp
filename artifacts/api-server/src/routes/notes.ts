import { Router, type IRouter } from "express";
import { db, notesTable, projectsTable, activityTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/projects/:id/notes", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const notes = await db
    .select()
    .from(notesTable)
    .where(and(eq(notesTable.projectId, projectId), eq(notesTable.workspaceId, workspaceId)))
    .orderBy(notesTable.updatedAt);
  res.json(notes);
});

router.post("/projects/:id/notes", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  // Ensure the target project belongs to this workspace.
  const [project] = await db
    .select({ id: projectsTable.id })
    .from(projectsTable)
    .where(and(eq(projectsTable.id, projectId), eq(projectsTable.workspaceId, workspaceId)));
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }
  const title = typeof req.body?.title === "string" && req.body.title.trim()
    ? req.body.title.trim()
    : "Untitled Note";
  const content = typeof req.body?.content === "string" ? req.body.content : "";

  const [note] = await db
    .insert(notesTable)
    .values({ projectId, workspaceId, title, content })
    .returning();
  await db.insert(activityTable).values({
    workspaceId,
    type: "note_added",
    description: "Note added",
    entityName: note.title,
    projectId,
  });
  res.status(201).json(note);
});

router.patch("/notes/:id", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid note id" });
    return;
  }
  const updates: { title?: string; content?: string; updatedAt: Date } = { updatedAt: new Date() };
  if (typeof req.body?.title === "string" && req.body.title.trim()) {
    updates.title = req.body.title.trim();
  }
  if (typeof req.body?.content === "string") {
    updates.content = req.body.content;
  }
  const [note] = await db
    .update(notesTable)
    .set(updates)
    .where(and(eq(notesTable.id, id), eq(notesTable.workspaceId, workspaceId)))
    .returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(note);
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid note id" });
    return;
  }
  const [deleted] = await db
    .delete(notesTable)
    .where(and(eq(notesTable.id, id), eq(notesTable.workspaceId, workspaceId)))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.status(204).send();
});

export default router;
