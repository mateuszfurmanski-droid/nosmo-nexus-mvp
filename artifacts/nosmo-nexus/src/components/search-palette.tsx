import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Search, FolderKanban, CheckSquare, FileText, StickyNote, X, Loader2 } from "lucide-react";

const BASE_API = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

type ResultItem = {
  id: number;
  type: "project" | "task" | "plan" | "note";
  title: string;
  excerpt: string | null;
  projectId: number | null;
  projectName: string | null;
};

type SearchResults = {
  query: string;
  results: ResultItem[];
  total: number;
};

const typeIcon = {
  project: FolderKanban,
  task: CheckSquare,
  plan: FileText,
  note: StickyNote,
};

const typeColor = {
  project: "text-blue-400",
  task: "text-primary",
  plan: "text-purple-400",
  note: "text-yellow-400",
};

const typeLabel = {
  project: "Project",
  task: "Task",
  plan: "Plan",
  note: "Note",
};

function getHref(item: ResultItem): string {
  if (item.type === "project") return `/projects/${item.id}`;
  if (item.type === "task") return item.projectId ? `/projects/${item.projectId}` : "/tasks";
  if (item.type === "plan") return "/plans";
  if (item.type === "note") return item.projectId ? `/projects/${item.projectId}` : "/projects";
  return "/";
}

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 1) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE_API}/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json() as SearchResults;
        setResults(data.results);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(q), 250);
  }

  function handleSelect(item: ResultItem) {
    const href = getHref(item);
    navigate(href);
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors w-full"
        title="Search (⌘K)"
      >
        <Search className="w-3.5 h-3.5 shrink-0" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="hidden sm:inline-flex h-4 items-center gap-0.5 rounded border border-border px-1 font-mono text-[10px] text-muted-foreground">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Palette */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={handleInput}
            placeholder="Search projects, tasks, plans, notes…"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-muted-foreground animate-spin shrink-0" />}
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <ul className="max-h-80 overflow-y-auto divide-y divide-border/50 py-1">
            {results.map(item => {
              const Icon = typeIcon[item.type];
              return (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    onClick={() => handleSelect(item)}
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors text-left"
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${typeColor[item.type]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      {(item.excerpt || item.projectName) && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {item.projectName && <span>{item.projectName} · </span>}
                          {item.excerpt}
                        </p>
                      )}
                    </div>
                    <span className={`text-xs shrink-0 mt-0.5 ${typeColor[item.type]}`}>
                      {typeLabel[item.type]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : query.trim().length > 0 && !loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No results for <span className="font-medium text-foreground">"{query}"</span>
          </div>
        ) : query.trim().length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Type to search across all projects, tasks, plans, and notes
          </div>
        ) : null}
      </div>
    </div>
  );
}
