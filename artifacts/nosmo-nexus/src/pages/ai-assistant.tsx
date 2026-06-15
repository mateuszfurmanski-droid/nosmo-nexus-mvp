import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout";
import { useSendAiMessage } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Zap } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string; timestamp: Date };

const SUGGESTIONS = [
  "Check project status",
  "Analyze latest plans",
  "Show overdue tasks",
  "Draft an RFI",
  "What's blocking progress?",
];

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello. I'm NOSMO Nexus AI — your construction-site intelligence assistant. Ask me about your projects, plans, tasks, or request a site status report.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const sendMessage = useSendAiMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(text?: string) {
    const message = (text ?? input).trim();
    if (!message) return;
    setInput("");
    const userMsg: Message = { role: "user", content: message, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    sendMessage.mutate(
      { data: { message } },
      {
        onSuccess: data => {
          setMessages(prev => [...prev, { role: "assistant", content: data.response, timestamp: new Date() }]);
        },
        onError: () => {
          setMessages(prev => [...prev, {
            role: "assistant",
            content: "I'm unable to process your request right now. Please try again.",
            timestamp: new Date(),
          }]);
        },
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-10rem)]">
        <div className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            AI Assistant
          </h1>
          <p className="text-muted-foreground mt-1">Ask anything about your site, plans, or tasks.</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-card p-4 space-y-4 mb-4">
          {messages.map((msg, idx) => (
            <div key={idx} data-testid={`chat-message-${idx}`} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${
                msg.role === "assistant" ? "bg-primary/20 text-primary" : "bg-secondary text-foreground"
              }`}>
                {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {sendMessage.isPending && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-secondary rounded-xl px-4 py-3 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                data-testid={`suggestion-${s.toLowerCase().replace(/\s/g, "-")}`}
                onClick={() => handleSend(s)}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-secondary hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 items-end">
          <Textarea
            data-testid="input-ai-message"
            placeholder="Ask about your projects, plans, tasks..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="resize-none min-h-[48px] max-h-32"
            rows={1}
          />
          <Button
            data-testid="button-send-message"
            onClick={() => handleSend()}
            disabled={!input.trim() || sendMessage.isPending}
            size="icon"
            className="h-12 w-12 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
