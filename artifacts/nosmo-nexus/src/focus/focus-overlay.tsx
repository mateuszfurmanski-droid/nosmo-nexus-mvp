import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X, ChevronRight, User, FolderKanban, FileText, CheckSquare, StickyNote } from "lucide-react";
import { getPerson, getProject, getDocument, getTask, getNote } from "@/demo/data";
import { useFocus } from "./focus-context";
import { focusKey, type FocusEntityType, type FocusTarget } from "./focus-types";
import { PersonView } from "./views/person-view";
import { ProjectView } from "./views/project-view";
import { DocumentView } from "./views/document-view";
import { TaskView } from "./views/task-view";
import { NoteView } from "./views/note-view";

const typeMeta: Record<FocusEntityType, { label: string; icon: typeof User }> = {
  person: { label: "Person", icon: User },
  project: { label: "Project", icon: FolderKanban },
  document: { label: "Document", icon: FileText },
  task: { label: "Task", icon: CheckSquare },
  note: { label: "Note", icon: StickyNote },
};

function targetLabel(target: FocusTarget): string {
  switch (target.type) {
    case "person": return getPerson(target.id)?.name ?? "Person";
    case "project": return getProject(target.id)?.name ?? "Project";
    case "document": return getDocument(target.id)?.title ?? "Document";
    case "task": return getTask(target.id)?.title ?? "Task";
    case "note": return getNote(target.id)?.title ?? "Note";
  }
}

function FocusContent({ target }: { target: FocusTarget }) {
  switch (target.type) {
    case "person": return <PersonView personId={target.id} />;
    case "project": return <ProjectView projectId={target.id} />;
    case "document": return <DocumentView documentId={target.id} />;
    case "task": return <TaskView taskId={target.id} />;
    case "note": return <NoteView noteId={target.id} />;
  }
}

export function FocusOverlay() {
  const { isOpen, current, stack, depth, back, close } = useFocus();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  // Scroll lock + restore focus to the trigger on close.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  // Move focus into the panel on open AND on every drill-down. When the focused
  // object changes, FocusContent remounts and the clicked element is unmounted,
  // so focus would otherwise fall to <body> and escape the trap.
  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [isOpen, current && focusKey(current)]);

  // Escape (back if drilled, else close) + Tab focus trap.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (depth > 1) back();
        else close();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, depth, back, close]);

  // Reset scroll position when the focused object changes.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [current && focusKey(current)]);

  return (
    <AnimatePresence>
      {isOpen && current && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-stretch sm:items-center justify-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-label={`${typeMeta[current.type].label}: ${targetLabel(current)}`}
        >
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            className="relative w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[90vh] bg-background border border-border sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            initial={{ y: 24, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 16, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            {/* Header / breadcrumb */}
            <div className="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-border bg-card/60">
              <div className="flex items-center gap-2 min-w-0">
                {depth > 1 && (
                  <button
                    type="button"
                    onClick={back}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-md px-2 py-1 hover:bg-secondary shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                )}
                <nav className="flex items-center gap-1 min-w-0 text-sm" aria-label="Focus breadcrumb">
                  {stack.map((t, i) => {
                    const Icon = typeMeta[t.type].icon;
                    const isLast = i === stack.length - 1;
                    return (
                      <span key={`${focusKey(t)}-${i}`} className="flex items-center gap-1 min-w-0">
                        {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                        <span className={`inline-flex items-center gap-1.5 min-w-0 ${isLast ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                          <Icon className="w-3.5 h-3.5 shrink-0 text-primary" />
                          <span className="truncate max-w-[10rem] sm:max-w-[16rem]">{targetLabel(t)}</span>
                        </span>
                      </span>
                    );
                  })}
                </nav>
              </div>

              <button
                ref={closeBtnRef}
                type="button"
                onClick={close}
                aria-label="Close"
                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6">
              <FocusContent key={focusKey(current)} target={current} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
