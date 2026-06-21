import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Sparkles, Send, Bot, User, Search, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FocusableEntity } from "@/focus/focusable-entity";

export function AskNexus({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{role: "user"|"assistant", content: string, citations?: any[]}[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const suggestedPrompts = [
    "What's the status of Halifax / Lloyds Bank?",
    "Show me recent notes for Mateusz Furmański",
    "Find the Door Schedule",
    "What tasks are due this week?"
  ];

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setQuery("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Based on your workspace memory, Halifax / Lloyds Bank – 360 Interiors is currently Active at 72% progress. The latest update from Mateusz Furmański shows the fire door certification pack is complete, with frame alignment snags still to close before the Lloyds walkthrough. Would you like me to pull up the door schedule?",
        citations: [
          { type: "project", id: "prj1", name: "Halifax / Lloyds Bank" },
          { type: "person", id: "p1", name: "Mateusz Furmański" }
        ]
      }]);
    }, 1500);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md border-l border-border bg-card/95 backdrop-blur-xl p-0 flex flex-col gap-0 shadow-2xl">
        <SheetHeader className="px-6 py-4 border-b border-border bg-background/50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <SheetTitle className="text-base font-semibold">Ask Nexus</SheetTitle>
          </div>
          <button onClick={() => onOpenChange(false)} aria-label="Close Ask Nexus" data-testid="button-close-ask-nexus" className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center shadow-lg border border-primary/20">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2 max-w-[280px]">
                <h3 className="font-semibold text-lg">How can I help?</h3>
                <p className="text-sm text-muted-foreground">
                  I can search your workspace, summarize projects, and connect dots across your business memory.
                </p>
              </div>
              
              <div className="w-full space-y-2 mt-8">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="w-full text-left px-4 py-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/80 hover:border-primary/50 transition-all text-sm flex items-center justify-between group"
                  >
                    <span className="truncate pr-4 text-foreground/80 group-hover:text-foreground">{prompt}</span>
                    <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${msg.role === "user" ? "bg-secondary border border-border" : "bg-primary/20 border border-primary/30"}`}>
                      {msg.role === "user" ? <User className="w-4 h-4 text-foreground" /> : <Bot className="w-4 h-4 text-primary" />}
                    </div>
                    <div className={`flex flex-col gap-2 max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                      <div className={`px-4 py-3 rounded-2xl text-sm ${
                        msg.role === "user" 
                          ? "bg-secondary text-foreground rounded-tr-sm" 
                          : "bg-primary/10 text-foreground border border-primary/20 rounded-tl-sm"
                      }`}>
                        {msg.content}
                      </div>
                      
                      {msg.citations && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {msg.citations.map((cit, j) => (
                            <FocusableEntity
                              key={j}
                              target={{ type: cit.type, id: cit.id }}
                              ariaLabel={`Open ${cit.name}`}
                              onActivate={() => onOpenChange(false)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-secondary border border-border hover:border-primary/50 transition-colors text-xs text-muted-foreground hover:text-primary"
                            >
                              {cit.type === "person" ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                              {cit.name}
                            </FocusableEntity>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                
                {isTyping && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-primary/20 border border-primary/30">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                    <div className="px-4 py-3 rounded-2xl text-sm bg-primary/10 border border-primary/20 rounded-tl-sm flex items-center gap-1">
                      <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                      <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                      <motion.div className="w-1.5 h-1.5 rounded-full bg-primary" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-background/50 backdrop-blur">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(query); }}
            className="flex items-center gap-2 bg-secondary/50 border border-border rounded-full px-2 py-1.5 focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all"
          >
            <Search className="w-4 h-4 text-muted-foreground ml-2 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-transparent border-none focus:outline-none text-sm px-2 py-1 min-w-0"
            />
            <button 
              type="submit"
              disabled={!query.trim() || isTyping}
              aria-label="Send message"
              data-testid="button-send-ask-nexus"
              className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:bg-primary/90"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
