import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, commentsTable, tasksTable, activityTable } from "@workspace/db";
import {
  ListCommentsParams,
  ListCommentsResponse,
  CreateCommentParams,
  CreateCommentBody,
  DeleteCommentParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Resolve a task within the current workspace, or null if it doesn't belong here.
async function findWorkspaceTask(taskId: number, workspaceId: number) {
  const [task] = await db
    .select({ id: tasksTable.id })
    .from(tasksTable)
    .where(and(eq(tasksTable.id, taskId), eq(tasksTable.workspaceId, workspaceId)));
  return task ?? null;
}

router.get("/tasks/:taskId/comments", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const params = ListCommentsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!(await findWorkspaceTask(params.data.taskId, workspaceId))) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const comments = await db
    .select()
    .from(commentsTable)
    .where(eq(commentsTable.taskId, params.data.taskId))
    .orderBy(commentsTable.createdAt);
  res.json(ListCommentsResponse.parse(comments));
});

router.post("/tasks/:taskId/comments", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const params = CreateCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (!(await findWorkspaceTask(params.data.taskId, workspaceId))) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  const [comment] = await db.insert(commentsTable).values({ ...parsed.data, taskId: params.data.taskId }).returning();
  await db.insert(activityTable).values({
    workspaceId,
    type: "comment_added",
    description: `Comment added`,
    entityName: parsed.data.authorName ?? "Team member",
  });
  res.status(201).json(comment);
});

router.delete("/comments/:id", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const params = DeleteCommentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  // Only delete a comment whose task belongs to this workspace.
  const [comment] = await db
    .select({ id: commentsTable.id, taskId: commentsTable.taskId })
    .from(commentsTable)
    .where(eq(commentsTable.id, params.data.id));
  if (!comment || !(await findWorkspaceTask(comment.taskId, workspaceId))) {
    res.status(404).json({ error: "Comment not found" });
    return;
  }
  await db.delete(commentsTable).where(eq(commentsTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
