import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  conversationsTable,
  chatMessagesTable,
  projectsTable,
  tasksTable,
  plansTable,
} from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getAIProvider, type ChatMessage } from "../lib/ai/provider";

const router: IRouter = Router();

// ── Context builder for grounded responses ────────────────────────────────────
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

// Resolve a conversation within the current workspace, or null.
async function findWorkspaceConversation(id: number, workspaceId: number) {
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(and(eq(conversationsTable.id, id), eq(conversationsTable.workspaceId, workspaceId)));
  return conv ?? null;
}

// ── Streaming SSE endpoint ────────────────────────────────────────────────────
router.post("/ai/stream", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const { message, conversationId } = req.body as { message?: string; conversationId?: number };

  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  // If a conversation id was supplied, it must belong to this workspace.
  if (conversationId) {
    const existing = await findWorkspaceConversation(conversationId, workspaceId);
    if (!existing) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
  }

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (data: object) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  let convId = conversationId;

  try {
    // Create or use existing conversation
    if (!convId) {
      const title = message.slice(0, 60) + (message.length > 60 ? "…" : "");
      const [conv] = await db
        .insert(conversationsTable)
        .values({ workspaceId, title })
        .returning();
      convId = conv.id;
      send({ type: "conversation_id", conversationId: convId });
    }

    // Load prior turns for conversational context.
    const priorMessages = await db
      .select()
      .from(chatMessagesTable)
      .where(eq(chatMessagesTable.conversationId, convId!))
      .orderBy(chatMessagesTable.createdAt);
    const history: ChatMessage[] = priorMessages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    }));

    // Save user message
    await db.insert(chatMessagesTable).values({
      conversationId: convId,
      role: "user",
      content: message.trim(),
    });

    // Build context and stream the response via the active AI provider.
    const context = await buildContext(workspaceId);
    const provider = getAIProvider();
    const accumulated = await provider.stream(
      { message: message.trim(), context, history },
      (chunk) => send({ type: "chunk", content: chunk }),
    );

    // Save assistant message
    await db.insert(chatMessagesTable).values({
      conversationId: convId,
      role: "assistant",
      content: accumulated,
    });

    await db
      .update(conversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(conversationsTable.id, convId!));

    send({ type: "done", conversationId: convId });
    res.end();
  } catch (err) {
    req.log.error({ err }, "AI stream error");
    send({ type: "error", message: "An error occurred" });
    res.end();
  }
});

// ── Conversation CRUD ─────────────────────────────────────────────────────────
router.get("/ai/conversations", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const conversations = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.workspaceId, workspaceId))
    .orderBy(desc(conversationsTable.updatedAt));
  res.json(conversations);
});

router.post("/ai/conversations", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const title =
    typeof req.body?.title === "string" && req.body.title.trim()
      ? req.body.title.trim()
      : "New Conversation";
  const [conv] = await db
    .insert(conversationsTable)
    .values({ workspaceId, title })
    .returning();
  res.status(201).json(conv);
});

router.get("/ai/conversations/:id", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const conv = await findWorkspaceConversation(id, workspaceId);
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const messages = await db
    .select()
    .from(chatMessagesTable)
    .where(eq(chatMessagesTable.conversationId, id))
    .orderBy(chatMessagesTable.createdAt);
  res.json({ ...conv, messages });
});

router.delete("/ai/conversations/:id", async (req, res): Promise<void> => {
  const workspaceId = req.workspaceId!;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  if (!(await findWorkspaceConversation(id, workspaceId))) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.conversationId, id));
  await db.delete(conversationsTable).where(eq(conversationsTable.id, id));
  res.status(204).send();
});

export default router;
