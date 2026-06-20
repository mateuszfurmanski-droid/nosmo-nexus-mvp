import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Search, FolderKanban, FileText, StickyNote, X, Users } from "lucide-react";
import { PEOPLE, PROJECTS, DOCUMENTS, NOTES } from "@/demo/data";

type ResultItem = {
  key: string;
  type: "person" | "project" | "document" | "note";
  title: string;
  subtitle: string;
  href: string;
};

const typeIcon = {
  person: Users,
  project: FolderKanban,
  document: FileText,
  note: StickyNote,
};

const typeColor = {
  person: "text-primary",
  project: "text-blue-400",
  document: "text-purple-400",
  note: "text-yellow-400",
};

const typeLabel = {
  person: "Person",
  project: "Project",
  document: "Document",
  note: "Note",
};

function search(q: string): ResultItem[] {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  const results: ResultItem[] = [];

  for (const p of PEOPLE) {
    if (
      p.name.toLowerCase().includes(term) ||
      p.title.toLowerCase().includes(term) ||
      p.company.toLowerCase().includes(term)
    ) {
      results.push({
        key: `person-${p.id}`,
        type: "person",
        title: p.name,
        subtitle: `${p.title} · ${p.company}`,
        href: `/people/${p.id}`,
      });
    }
  }

  for (const pr of PROJECTS) {
    if (
      pr.name.toLowerCase().includes(term) ||
      pr.client.toLowerCase().includes(term) ||
      pr.description.toLowerCase().includes(term)
    ) {
      results.push({
        key: `project-${pr.id}`,
        type: "project",
        title: pr.name,
        subtitle: pr.client,
        href: `/projects/${pr.id}`,
      });
    }
  }

  for (const d of DOCUMENTS) {
    if (
      d.title.toLowerCase().includes(term) ||
      d.tags.some(t => t.toLowerCase().includes(term))
    ) {
      results.push({
        key: `document-${d.id}`,
        type: "document",
        title: d.title,
        subtitle: `${d.kind} · ${d.sizeLabel}`,
        href: d.projectId ? `/projects/${d.projectId}` : "/knowledge",
      });
    }
  }

  for (const n of NOTES) {
    if (
      n.title.toLowerCase().includes(term) ||
      n.snippet.toLowerCase().includes(term) ||
      n.tags.some(t => t.toLowerCase().includes(term))
    ) {
      results.push({
        key: `note-${n.id}`,
        type: "note",
        title: n.title,
        subtitle: `Note by ${n.author}`,
        href: n.projectId
          ? `/projects/${n.projectId}`
          : n.personId
            ? `/people/${n.personId}`
            : "/knowledge",
      });
    }
  }

  return results.slice(0, 12);
}

export function SearchPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;

  const results = search(query);

  function handleSelect(item: ResultItem) {
    navigate(item.href);
    onOpenChange(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4" data-testid="palette-search">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people, projects, documents, notes..."
            data-testid="input-search"
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
          <button
            onClick={() => onOpenChange(false)}
            aria-label="Close search"
            data-testid="button-close-search"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {results.length > 0 ? (
          <ul className="max-h-80 overflow-y-auto divide-y divide-border/50 py-1">
            {results.map(item => {
              const Icon = typeIcon[item.type];
              return (
                <li key={item.key}>
                  <button
                    onClick={() => handleSelect(item)}
                    data-testid={`result-${item.key}`}
                    className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-secondary/60 transition-colors text-left"
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${typeColor[item.type]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{item.subtitle}</p>
                    </div>
                    <span className={`text-xs shrink-0 mt-0.5 ${typeColor[item.type]}`}>
                      {typeLabel[item.type]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : query.trim().length > 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No results for <span className="font-medium text-foreground">"{query}"</span>
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Type to search across people, projects, documents, and notes
          </div>
        )}
      </div>
    </div>
  );
}
