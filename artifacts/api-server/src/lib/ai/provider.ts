import OpenAI from "openai";
import { getAIConfig } from "./config";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  /** The current user message. */
  message: string;
  /** Live workspace context (projects/tasks/plans summary) injected as system grounding. */
  context: string;
  /** Prior turns in the conversation, oldest first. */
  history?: ChatMessage[];
}

export interface AIProvider {
  readonly name: "openai" | "mock";
  /** Generate a full response in one shot. */
  generate(opts: GenerateOptions): Promise<string>;
  /** Stream a response chunk-by-chunk; resolves with the full accumulated text. */
  stream(opts: GenerateOptions, onChunk: (chunk: string) => void): Promise<string>;
}

const SYSTEM_PROMPT =
  "You are Nexus, a construction-site intelligence assistant for the NOSMO Nexus platform. " +
  "You have visibility into the user's projects, tasks, and uploaded plans (provided as context). " +
  "Be concise, practical, and grounded in the supplied data. If data is missing, say so.";

const MAX_HISTORY_MESSAGES = 20;

function buildMessages(opts: GenerateOptions): ChatMessage[] {
  const history = (opts.history ?? []).slice(-MAX_HISTORY_MESSAGES);
  return [
    { role: "system", content: `${SYSTEM_PROMPT}\n\nCurrent workspace data:\n${opts.context}` },
    ...history,
    { role: "user", content: opts.message },
  ];
}

// ── Mock provider (default when no OPENAI_API_KEY) ────────────────────────────
class MockProvider implements AIProvider {
  readonly name = "mock" as const;

  private respond(message: string, context: string): string {
    const lower = message.toLowerCase();

    if (lower.includes("hello") || lower.includes("hi ") || lower === "hi" || lower === "hey") {
      return "Hello! I'm Nexus, your construction intelligence assistant. I have full visibility into your projects, tasks, and uploaded plans. What would you like to know?";
    }
    if (lower.includes("plan") || lower.includes("drawing") || lower.includes("pdf")) {
      const planMatch = context.match(/Plans \((\d+)\)/);
      const count = planMatch ? planMatch[1] : "some";
      return `I can see ${count} uploaded plan(s) in your workspace. Each document is indexed for quick retrieval. I can help you identify coordination conflicts between structural and MEP systems, cross-reference sheet references, or summarize drawing sets. Which plan would you like me to focus on?`;
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
      return "I'm Nexus — your construction intelligence assistant. I can help you:\n\n• **Summarise projects** — status, progress, team assignments\n• **Analyse tasks** — identify bottlenecks, critical path, overdue items\n• **Review plans** — cross-reference drawings, flag coordination conflicts\n• **Draft documents** — RFIs, meeting minutes, progress reports\n• **Answer questions** — about any data in your NOSMO Nexus workspace\n\nWhat would you like to explore?";
    }

    return `I've analysed your request against the current project data. Here's what I found:\n\n${context.split("\n\n")[0]}\n\nI can go deeper on any project, task, or plan. What specific information do you need for today's site work?`;
  }

  async generate(opts: GenerateOptions): Promise<string> {
    return this.respond(opts.message, opts.context);
  }

  async stream(opts: GenerateOptions, onChunk: (chunk: string) => void): Promise<string> {
    const full = this.respond(opts.message, opts.context);
    const words = full.split(" ");
    let accumulated = "";
    for (let i = 0; i < words.length; i++) {
      const chunk = i === 0 ? words[i] : " " + words[i];
      accumulated += chunk;
      onChunk(chunk);
      await new Promise((r) => setTimeout(r, 20 + Math.random() * 40));
    }
    return accumulated;
  }
}

// ── OpenAI provider (used when OPENAI_API_KEY is set) ──────────────────────────
class OpenAIProvider implements AIProvider {
  readonly name = "openai" as const;
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generate(opts: GenerateOptions): Promise<string> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: buildMessages(opts),
    });
    return completion.choices[0]?.message?.content ?? "";
  }

  async stream(opts: GenerateOptions, onChunk: (chunk: string) => void): Promise<string> {
    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: buildMessages(opts),
      stream: true,
    });
    let accumulated = "";
    for await (const part of stream) {
      const delta = part.choices[0]?.delta?.content ?? "";
      if (delta) {
        accumulated += delta;
        onChunk(delta);
      }
    }
    return accumulated;
  }
}

let cached: AIProvider | null = null;

/**
 * Returns the active AI provider: OpenAI when configured via env, else the mock.
 * Cached per process; the cache key is whether a key is present.
 */
export function getAIProvider(): AIProvider {
  const config = getAIConfig();
  if (config.enabled && config.apiKey) {
    if (cached?.name === "openai") return cached;
    cached = new OpenAIProvider(config.apiKey, config.model);
    return cached;
  }
  if (cached?.name === "mock") return cached;
  cached = new MockProvider();
  return cached;
}
