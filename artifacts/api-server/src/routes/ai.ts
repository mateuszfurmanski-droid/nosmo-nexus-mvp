import { Router, type IRouter } from "express";
import { SendAiMessageBody, SendAiMessageResponse } from "@workspace/api-zod";
import { db, projectsTable, tasksTable, plansTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getAIProvider } from "../lib/ai/provider";

const router: IRouter = Router();

async function buildContext(workspaceId: number): Promise<string> {
  const [projects, tasks, plans] = await Promise.all([
    db.select().from(projectsTable).where(eq(projectsTable.workspaceId, workspaceId)).limit(20),
    db.select().from(tasksTable).where(eq(tasksTable.workspaceId, workspaceId)).limit(50),
    db.select().from(plansTable).where(eq(plansTable.workspaceId, workspaceId)).limit(20),
  ]);

  const projectLines = projects
    .map((p) => `  • ${p.name} (${p.status})${p.location ? ` — ${p.location}` : ""}`)
    .join("\n");
  const taskLines = tasks
    .map((t) => `  • [${t.status.toUpperCase()}] ${t.title}${t.assignee ? ` → ${t.assignee}` : ""}`)
    .join("\n");
  const planLines = plans.map((p) => `  • ${p.originalName} (${p.status})`).join("\n");

  return [
    projects.length ? `Projects (${projects.length}):\n${projectLines}` : "No projects yet.",
    tasks.length ? `Tasks (${tasks.length}):\n${taskLines}` : "No tasks yet.",
    plans.length ? `Plans (${plans.length}):\n${planLines}` : "No plans uploaded yet.",
  ].join("\n\n");
}

router.post("/ai/chat", async (req, res): Promise<void> => {
  const parsed = SendAiMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const context = await buildContext(req.workspaceId!);
  const provider = getAIProvider();
  const response = await provider.generate({ message: parsed.data.message, context });
  res.json(SendAiMessageResponse.parse({ response }));
});

export default router;
