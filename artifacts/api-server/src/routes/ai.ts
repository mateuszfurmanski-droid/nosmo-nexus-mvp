import { Router, type IRouter } from "express";
import { SendAiMessageBody, SendAiMessageResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const MOCK_RESPONSES: Record<string, string> = {
  default: "I'm analyzing your construction site data. Based on the current project status, all active tasks are progressing on schedule. Would you like me to generate a progress report or identify any potential schedule conflicts?",
  plan: "I've analyzed the uploaded PDF plans. The drawing set includes 12 sheets covering civil, structural, mechanical, and electrical systems. Sheet A-001 contains the site plan with setback dimensions. I detected 3 potential coordination conflicts between structural and MEP systems on floors 2-4.",
  task: "Based on your current task board, you have 4 items in progress and 2 overdue items. I recommend prioritizing the foundation inspection sign-off as it's blocking 3 downstream tasks. Shall I reorganize the task board by critical path?",
  progress: "Current project progress is approximately 34% complete based on task completion rates. The structural phase is on track, but mechanical rough-in is running 5 days behind schedule. This may impact the drywall start date.",
  rfi: "I can help you draft an RFI. Based on the uploaded drawings, I've identified 2 potential ambiguities in the MEP coordination drawings that typically require clarification. Would you like me to draft formal RFIs for these items?",
};

function getMockResponse(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("plan") || lower.includes("drawing") || lower.includes("pdf")) return MOCK_RESPONSES.plan;
  if (lower.includes("task") || lower.includes("todo") || lower.includes("overdue")) return MOCK_RESPONSES.task;
  if (lower.includes("progress") || lower.includes("status") || lower.includes("complete")) return MOCK_RESPONSES.progress;
  if (lower.includes("rfi") || lower.includes("request") || lower.includes("clarif")) return MOCK_RESPONSES.rfi;
  return MOCK_RESPONSES.default;
}

router.post("/ai/chat", async (req, res): Promise<void> => {
  const parsed = SendAiMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // Simulate slight processing delay for realism
  await new Promise(resolve => setTimeout(resolve, 800));
  const response = getMockResponse(parsed.data.message);
  res.json(SendAiMessageResponse.parse({ response }));
});

export default router;
