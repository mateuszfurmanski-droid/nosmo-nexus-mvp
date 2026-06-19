import { useState, useRef, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout";
import {
  useListConversations,
  useDeleteConversation,
  getListConversationsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Send, Bot, User, Zap, Plus, Trash2, MessageSquare,
  ChevronLeft, Menu,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

const BASE_API = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const SUGGESTIONS = [
  "What projects are active?",
  "Show me overdue tasks",
  "Summarise all plans",
  "Help me draft an RFI",
  "What's blocking progress?",
  "What can you help with?",
];

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-AU", { day: "2-digit", month: "short" });
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  // Render markdown-lite: bold **text**, newlines
  const rendered = msg.content
    .split("\n")
    .map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <span key={i}>
          {i > 0 && <br />}
          {parts.map((part, j) =>
            part.startsWith("**") && part.endsWith("**")
              ? <strong key={j}>{part.slice(2, -2)}</strong>
              : part
          )}
        </span>
      );
    });

  return (
    <div className={`flex gap-2 sm:gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full shrink-0 flex items-center justify-center ${
        isUser ? "bg-secondary text-foreground" : "bg-primary/20 text-primary"
      }`}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div className={`max-w-[80%] sm:max-w-[75%] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-sm leading-relaxed ${
        isUser
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-foreground"
      }`}>
        {msg.streaming && msg.content === "" ? (
          <span className="flex items-center gap-1.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
          </span>
        ) : (
          <>
            {rendered}
            {msg.streaming && <span className="inline-block w-0.5 h-3.5 bg-current ml-0.5 animate-pulse align-text-bottom" />}
          </>
        )}
      </div>
    </div>
  );
}

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I'm Nexus — your construction intelligence assistant. I have visibility into all your projects, tasks, and uploaded plans. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations, isLoading: convsLoading } = useListConversations({
    query: { queryKey: getListConversationsQueryKey() },
  });
  const deleteConversation = useDeleteConversation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversation = useCallback(async (id: number) => {
    try {
      const res = await fetch(`${BASE_API}/api/ai/conversations/${id}`);
      if (!res.ok) return;
      const data = await res.json() as {
        id: number;
        title: string;
        messages: Array<{ id: number; role: string; content: string }>;
      };
      setConversationId(id);
      setMessages(
        data.messages.map((m) => ({
          id: String(m.id),
          role: m.role as "user" | "assistant",
          content: m.content,
        }))
      );
      setSidebarOpen(false);
    } catch {
      toast({ title: "Failed to load conversation", variant: "destructive" });
    }
  }, [toast]);

  function startNew() {
    setConversationId(null);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hello! I'm Nexus — your construction intelligence assistant. I have visibility into all your projects, tasks, and uploaded plans. What would you like to know?",
      },
    ]);
    setSidebarOpen(false);
  }

  const handleSend = useCallback(async (text?: string) => {
    const message = (text ?? input).trim();
    if (!message || streaming) return;
    setInput("");

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now()}`;

    setMessages(prev => [
      ...prev,
      { id: userMsgId, role: "user", content: message },
      { id: assistantMsgId, role: "assistant", content: "", streaming: true },
    ]);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${BASE_API}/api/ai/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6)) as {
              type: string;
              content?: string;
              conversationId?: number;
            };
            if (event.type === "chunk" && event.content) {
              accumulated += event.content;
              const snap = accumulated;
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId
                    ? { ...m, content: snap, streaming: true }
                    : m
                )
              );
            } else if (event.type === "conversation_id" && event.conversationId) {
              setConversationId(event.conversationId);
            } else if (event.type === "done") {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantMsgId ? { ...m, streaming: false } : m
                )
              );
              queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
            }
          } catch {
            // skip malformed line
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, content: "Sorry, I couldn't process that. Please try again.", streaming: false }
              : m
          )
        );
      }
    } finally {
      setStreaming(false);
    }
  }, [input, streaming, conversationId, queryClient]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleDeleteConversation(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    deleteConversation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          if (conversationId === id) startNew();
        },
      }
    );
  }

  const showSuggestions = messages.length <= 1 && !streaming;

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-7rem)] md:h-[calc(100vh-10rem)] gap-4">

        {/* ── History sidebar ────────────────────────────────────── */}
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside className={`
          fixed md:relative inset-y-0 left-0 z-40 md:z-auto
          w-64 md:w-52 lg:w-60 shrink-0
          bg-card md:bg-transparent border-r md:border border-border rounded-none md:rounded-xl
          flex flex-col overflow-hidden
          transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          md:flex
        `}>
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">History</span>
            <Button size="sm" variant="outline" onClick={startNew} className="h-6 px-2 text-xs gap-1">
              <Plus className="w-3 h-3" /> New
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
            {convsLoading ? (
              <div className="space-y-1.5 p-1">
                {[1,2,3].map(i => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : conversations && conversations.length > 0 ? (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors group flex items-start gap-1.5 ${
                    conversationId === conv.id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                  <span className="flex-1 min-w-0 truncate font-medium">{conv.title}</span>
                  <button
                    onClick={e => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0 ml-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </button>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4 px-2">No conversations yet</p>
            )}
          </div>
        </aside>

        {/* ── Main chat area ─────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div className="flex items-center gap-3 mb-3 shrink-0">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Ask Nexus
              </h1>
              <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm hidden sm:block">
                AI assistant with full visibility into your projects, tasks, and plans.
              </p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-3 sm:p-4 space-y-3 sm:space-y-4 mb-3">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Suggestions */}
          {showSuggestions && (
            <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-2.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-border bg-card hover:bg-secondary hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2 items-end shrink-0">
            <Textarea
              data-testid="input-ai-message"
              placeholder="Ask about your projects, plans, tasks… (Enter to send)"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={streaming}
              className="resize-none min-h-[44px] max-h-28 text-sm"
              rows={1}
            />
            <Button
              data-testid="button-send-message"
              onClick={() => handleSend()}
              disabled={!input.trim() || streaming}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
