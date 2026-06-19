import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/projects/:id/notes", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const notes = await db
    .select()
    .from(notesTable)
    .where(eq(notesTable.projectId, projectId))
    .orderBy(notesTable.updatedAt);
  res.json(notes);
});

router.post("/projects/:id/notes", async (req, res): Promise<void> => {
  const projectId = parseInt(req.params.id);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project id" });
    return;
  }
  const title = typeof req.body?.title === "string" && req.body.title.trim()
    ? req.body.title.trim()
    : "Untitled Note";
  const content = typeof req.body?.content === "string" ? req.body.content : "";

  const [note] = await db
    .insert(notesTable)
    .values({ projectId, title, content })
    .returning();
  res.status(201).json(note);
});

router.patch("/notes/:id", async (req, res): Promise<void> => {
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
    .where(eq(notesTable.id, id))
    .returning();
  if (!note) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.json(note);
});

router.delete("/notes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid note id" });
    return;
  }
  const [deleted] = await db
    .delete(notesTable)
    .where(eq(notesTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Note not found" });
    return;
  }
  res.status(204).send();
});

export default router;
