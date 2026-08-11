import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Layers, FileText, Search, Eye, Download, CheckCircle2, Loader2, UploadCloud, FolderKanban } from "lucide-react";
import { DOCUMENTS, PROJECTS, getPerson } from "@/demo/data";
import { formatDistanceToNow } from "date-fns";
import { FocusableEntity } from "@/focus/focusable-entity";

type PlanStatus = "Ready" | "Processing" | "Uploaded";

const STATUS: Record<PlanStatus, { cls: string; Icon: typeof CheckCircle2; label: string }> = {
  Ready: { cls: "bg-green-500/15 text-green-400 border-green-500/20", Icon: CheckCircle2, label: "Ready" },
  Processing: { cls: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20", Icon: Loader2, label: "Processing" },
  Uploaded: { cls: "bg-muted text-muted-foreground border-border", Icon: UploadCloud, label: "Uploaded" },
};

// Deterministic mock ingestion state — this demo is frontend-only (no real OCR / upload).
function planStatus(id: string): PlanStatus {
  const n = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  if (n % 7 === 0) return "Processing";
  if (n % 5 === 0) return "Uploaded";
  return "Ready";
}

export default function Plans() {
  const [search, setSearch] = useState("");

  const plans = useMemo(
    () =>
      DOCUMENTS.filter(d => d.kind === "PDF").filter(
        d =>
          d.title.toLowerCase().includes(search.toLowerCase()) ||
          d.tags.some(t => t.toLowerCase().includes(search.toLowerCase())),
      ),
    [search],
  );

  const groups = useMemo(
    () =>
      PROJECTS.map(p => ({ project: p, items: plans.filter(d => d.projectId === p.id) })).filter(g => g.items.length > 0),
    [plans],
  );

  const total = plans.length;
  const ready = plans.filter(d => planStatus(d.id) === "Ready").length;
  const processing = plans.filter(d => planStatus(d.id) === "Processing").length;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary" /> Plans
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">PDF drawings &amp; site documents, grouped by project. Upload &amp; OCR ingestion arrive in V1.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search plans..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search plans"
              data-testid="input-search-plans"
              className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-full sm:w-64"
            />
          </div>
          <Link
            href="/nexus-cloud/file-loader"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
            title="Prepare Nexus Cloud metadata before upload"
            data-testid="button-upload-plan"
          >
            <UploadCloud className="w-4 h-4" /> Upload
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Total plans", value: total, dot: "bg-primary" },
          { label: "Ready", value: ready, dot: "bg-green-400" },
          { label: "Processing", value: processing, dot: "bg-yellow-400" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold tabular-nums mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {groups.map((group, gi) => (
        <div key={group.project.id} className="space-y-3">
          <FocusableEntity
            target={{ type: "project", id: group.project.id }}
            ariaLabel={`Open ${group.project.name}`}
            testId={`plan-group-${group.project.id}`}
            className="group inline-flex items-center gap-2 text-left w-fit"
          >
            <FolderKanban className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold group-hover:text-primary transition-colors">{group.project.name}</h2>
            <span className="text-sm text-muted-foreground">· {group.items.length}</span>
          </FocusableEntity>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((doc, i) => {
              const st = planStatus(doc.id);
              const S = STATUS[st];
              const owner = getPerson(doc.ownerPersonId);
              return (
                <FocusableEntity
                  key={doc.id}
                  target={{ type: "document", id: doc.id }}
                  ariaLabel={`Open ${doc.title}`}
                  testId={`card-plan-${doc.id}`}
                  className="block"
                >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: gi * 0.04 + i * 0.04 }}
                  className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,255,255,0.05)] transition-all flex flex-col"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">{doc.sizeLabel} · PDF</p>
                    </div>
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border shrink-0 ${S.cls}`}>
                      <S.Icon className={`w-3 h-3 ${st === "Processing" ? "animate-spin" : ""}`} /> {S.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {doc.tags.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md border border-border">{t}</span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                        {owner ? owner.name.split(" ").map(n => n[0]).join("") : "?"}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">{formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={(e) => e.stopPropagation()} title="Preview (V1)" data-testid={`button-plan-view-${doc.id}`} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"><Eye className="w-4 h-4" /></button>
                      <button onClick={(e) => e.stopPropagation()} title="Download (V1)" data-testid={`button-plan-download-${doc.id}`} className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-secondary transition-colors"><Download className="w-4 h-4" /></button>
                    </div>
                  </div>
                </motion.div>
                </FocusableEntity>
              );
            })}
          </div>
        </div>
      ))}

      {groups.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No plans match your search.</p>
        </div>
      )}
    </div>
  );
}
