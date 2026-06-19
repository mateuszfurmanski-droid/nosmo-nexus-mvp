---
name: SSE streaming pattern
description: How to implement server-sent events streaming in this stack (Orval limitation + raw fetch pattern)
---

**Rule:** Orval (OpenAPI codegen) cannot generate React Query hooks for SSE/streaming endpoints. Keep streaming endpoints out of the OpenAPI spec or add them as comment-only documentation.

**Why:** Orval generates typed hooks from response schemas. Streaming responses don't have a fixed JSON schema — they emit incremental chunks, which breaks the codegen contract.

**How to apply on the server (Express 5):**
```ts
res.setHeader("Content-Type", "text/event-stream");
res.setHeader("Cache-Control", "no-cache");
res.setHeader("Connection", "keep-alive");
res.setHeader("X-Accel-Buffering", "no");  // disable nginx buffering
res.flushHeaders();
res.write(`data: ${JSON.stringify({ type: "chunk", content: word })}\n\n`);
```

**How to apply on the client (React):**
```ts
const res = await fetch("/api/ai/stream", { method: "POST", body: ... });
const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() ?? "";
  for (const line of lines) {
    if (!line.startsWith("data: ")) continue;
    const event = JSON.parse(line.slice(6));
    // handle event.type === "chunk" | "done" | "error"
  }
}
```

Use an `AbortController` to cancel mid-stream. Store it in a ref so the cleanup function can call `controller.abort()`.
