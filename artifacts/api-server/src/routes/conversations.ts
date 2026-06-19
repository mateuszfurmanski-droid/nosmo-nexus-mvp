import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  conversationsTable,
  chatMessagesTable,
  projectsTable,
  tasksTable,
  plansTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// ── Context builder for smart mock responses ──────────────────────────────────
async function buildContext(): Promise<string> {
  const [projects, tasks, plans] = await Promise.all([
    db.select().from(projectsTable).limit(20),
    db.select().from(tasksTable).limit(50),
    db.select().from(plansTable).limit(20),
  ]);

  const projectLines = projects
    .map((p) => `  • ${p.name} (${p.status})${p.location ? ` — ${p.location}` : ""}`)
    .join("\n");
  const taskLines = tasks
    .map((t) => `  • [${t.status.toUpperCase()}] ${t.title}${t.assignee ? ` → ${t.assignee}` : ""}`)
    .join("\n");
  const planLines = plans
    .map((p) => `  • ${p.originalName} (${p.status})`)
    .join("\n");

  return [
    projects.length ? `Projects (${projects.length}):\n${projectLines}` : "No projects yet.",
    tasks.length ? `Tasks (${tasks.length}):\n${taskLines}` : "No tasks yet.",
    plans.length ? `Plans (${plans.length}):\n${planLines}` : "No plans uploaded yet.",
  ].join("\n\n");
}

// ── Smart keyword mock responses with live context ────────────────────────────
function buildMockResponse(message: string, context: string): string {
  const lower = message.toLowerCase();

  const projectCount = (context.match(/•/g) ?? []).length;

  if (lower.includes("hello") || lower.includes("hi ") || lower === "hi" || lower === "hey") {
    return "Hello! I'm Nexus, your construction intelligence assistant. I have full visibility into your projects, tasks, and uploaded plans. What would you like to know?";
  }
  if (lower.includes("plan") || lower.includes("drawing") || lower.includes("pdf")) {
    const planMatch = context.match(/Plans \((\d+)\)/);
    const count = planMatch ? planMatch[1] : "some";
    return `I can see ${count} uploaded plan(s) in your system. Each document is indexed for quick retrieval. I can help you identify coordination conflicts between structural and MEP systems, cross-reference sheet references, or summarize drawing sets. Which plan would you like me to focus on?`;
  }
  if (lower.includes("overdue") || lower.includes("late") || lower.includes("behind")) {
    return `Based on your current task board, I'm checking for overdue items. I recommend reviewing any tasks marked "in_progress" that have approaching due dates. Shall I reorganize the task board by critical path priority?`;
  }
  if (lower.includes("task") || lower.includes("todo") || lower.includes("kanban")) {
    const taskMatch = context.match(/Tasks \((\d+)\)/);
    const count = taskMatch ? taskMatch[1] : "several";
    const inProgress = (context.match(/\[IN_PROGRESS\]/g) ?? []).length;
    const todo = (context.match(/\[TODO\]/g) ?? []).length;
    return `You have ${count} tasks tracked across your projects. Currently ${inProgress} are in progress and ${todo} are queued. Would you like me to identify bottlenecks or generate a prioritized action list?`;
  }
  if (lower.includes("progress") || lower.includes("status") || lower.includes("complete") || lower.includes("summary")) {
    const projectMatch = context.match(/Projects \((\d+)\)/);
    const count = projectMatch ? projectMatch[1] : "your";
    return `Here's a summary of your ${count} project(s):\n\n${context}\n\nWould you like a deeper analysis of any specific project or a risk assessment across the portfolio?`;
  }
  if (lower.includes("rfi") || lower.includes("request for information")) {
    return "I can help draft an RFI based on your uploaded drawings. I've identified potential ambiguities in MEP coordination that typically require clarification. Would you like me to draft a formal RFI template with the relevant sheet references filled in?";
  }
  if (lower.includes("project") && (lower.includes("list") || lower.includes("show") || lower.includes("what"))) {
    const projectSection = context.split("\n\n")[0] ?? "No projects found.";
    return `Here are your current projects:\n\n${projectSection}\n\nWould you like details on a specific project's tasks or uploaded plans?`;
  }
  if (lower.includes("schedule") || lower.includes("timeline") || lower.includes("deadline")) {
    return "Based on the current task distribution, I recommend reviewing the critical path for your active projects. I can generate a simplified Gantt view or identify which tasks are blocking downstream work. What format would be most useful for your next site meeting?";
  }
  if (lower.includes("risk") || lower.includes("issue") || lower.includes("problem")) {
    return "I've analysed your current project data for potential risks:\n\n1. Tasks with no assignee may stall without ownership\n2. Plans marked 'processing' should be reviewed if pending > 24h\n3. Projects on hold may need status updates for stakeholder reporting\n\nWould you like me to generate a formal risk register?";
  }
  if (lower.includes("help") || lower.includes("what can you") || lower.includes("capabilities")) {
    return "I'm Nexus — your construction intelligence assistant. I can help you:\n\n• **Summarise projects** — status, progress, team assignments\n• **Analyse tasks** — identify bottlenecks, critical path, overdue items\n• **Review plans** — cross-reference drawings, flag coordination conflicts\n• **Draft documents** — RFIs, meeting minutes, progress reports\n• **Answer questions** — about any data in your NOSMO Nexus platform\n\nWhat would you like to explore?";
  }

  return `I've analysed your request against the current project data. Here's what I found:\n\n${context.split("\n\n")[0]}\n\nI can go deeper on any project, task, or plan. What specific information do you need for today's site work?`;
}

// ── Streaming word-by-word SSE endpoint ───────────────────────────────────────
router.post("/ai/stream", async (req, res): Promise<void> => {
  const { message, conversationId } = req.body as { message?: string; conversationId?: number };

  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
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
        .values({ title })
        .returning();
      convId = conv.id;
      send({ type: "conversation_id", conversationId: convId });
    }

    // Save user message
    await db.insert(chatMessagesTable).values({
      conversationId: convId,
      role: "user",
      content: message.trim(),
    });

    // Build context and response
    const context = await buildContext();
    const fullResponse = buildMockResponse(message.trim(), context);

    // Stream word by word
    const words = fullResponse.split(" ");
    let accumulated = "";

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const chunk = i === 0 ? word : " " + word;
      accumulated += chunk;
      send({ type: "chunk", content: chunk });
      // Variable delay for natural feel: 20-60ms per word
      await new Promise((r) => setTimeout(r, 20 + Math.random() * 40));
    }

    // Save assistant message
    await db.insert(chatMessagesTable).values({
      conversationId: convId,
      role: "assistant",
      content: accumulated,
    });

    // Update conversation title if it's the first message
    await db
      .update(conversationsTable)
      .set({ updatedAt: new Date() })
      .where(eq(conversationsTable.id, convId!));

    send({ type: "done", conversationId: convId });
    res.end();
  } catch (err) {
    send({ type: "error", message: "An error occurred" });
    res.end();
  }
});

// ── Conversation CRUD ─────────────────────────────────────────────────────────
router.get("/ai/conversations", async (req, res): Promise<void> => {
  const conversations = await db
    .select()
    .from(conversationsTable)
    .orderBy(desc(conversationsTable.updatedAt));
  res.json(conversations);
});

router.post("/ai/conversations", async (req, res): Promise<void> => {
  const title =
    typeof req.body?.title === "string" && req.body.title.trim()
      ? req.body.title.trim()
      : "New Conversation";
  const [conv] = await db
    .insert(conversationsTable)
    .values({ title })
    .returning();
  res.status(201).json(conv);
});

router.get("/ai/conversations/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [conv] = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.id, id));
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
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.conversationId, id));
  const [deleted] = await db
    .delete(conversationsTable)
    .where(eq(conversationsTable.id, id))
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  res.status(204).send();
});

export default router;
