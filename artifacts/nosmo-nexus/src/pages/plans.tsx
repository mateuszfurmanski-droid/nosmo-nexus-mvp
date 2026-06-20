import { useState, useRef, useCallback } from "react";
import { AppLayout } from "@/components/layout";
import {
  useListPlans,
  useCreatePlan,
  useDeletePlan,
  useListProjects,
  getListPlansQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Trash2, RotateCcw, Cloud, X, Eye, CheckCircle2, AlertCircle } from "lucide-react";

const API_BASE = import.meta.env.BASE_URL;

type QueuedStatus = "pending" | "uploading" | "done" | "error";
type QueuedFile = { id: string; file: File; status: QueuedStatus };

const statusColor: Record<string, string> = {
  uploaded: "bg-muted text-muted-foreground border-border",
  processing: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  ready: "bg-green-500/15 text-green-400 border-green-500/20",
  failed: "bg-red-500/15 text-red-400 border-red-500/20",
};

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "-";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Plans() {
  const [open, setOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<QueuedFile[]>([]);
  const [projectId, setProjectId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: plans, isLoading } = useListPlans(undefined, {
    query: {
      queryKey: getListPlansQueryKey(),
      // Poll while any plan is still processing so the mocked status flips to "ready" live.
      refetchInterval: query =>
        (query.state.data ?? []).some(p => p.status === "processing") ? 2500 : false,
    },
  });
  const { data: projects } = useListProjects();
  const createPlan = useCreatePlan();
  const deletePlan = useDeletePlan();

  const handleFiles = useCallback((files: File[]) => {
    const pdfs: File[] = [];
    let rejected = 0;
    for (const file of files) {
      const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
      if (isPdf) pdfs.push(file);
      else rejected++;
    }
    if (rejected > 0) {
      toast({
        title: rejected === 1 ? "Skipped 1 non-PDF file" : `Skipped ${rejected} non-PDF files`,
        description: "Only PDF files are supported.",
        variant: "destructive",
      });
    }
    if (pdfs.length === 0) return;
    setSelectedFiles(prev => {
      const seen = new Set(prev.map(f => `${f.file.name}-${f.file.size}-${f.file.lastModified}`));
      const additions: QueuedFile[] = pdfs
        .filter(file => !seen.has(`${file.name}-${file.size}-${file.lastModified}`))
        .map(file => ({
          id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          status: "pending",
        }));
      return [...prev, ...additions];
    });
  }, [toast]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) handleFiles(files);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length) handleFiles(files);
    // Reset so re-selecting the same file(s) still fires change.
    e.target.value = "";
  }

  function removeFile(id: string) {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  }

  function setFileStatus(id: string, status: QueuedStatus) {
    setSelectedFiles(prev => prev.map(f => (f.id === id ? { ...f, status } : f)));
  }

  function readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.includes(",") ? result.split(",")[1] : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedFiles.length === 0 || !projectId) return;
    setUploading(true);

    const pid = parseInt(projectId, 10);
    // Only (re)upload files that haven't already succeeded.
    const queue = selectedFiles.filter(f => f.status !== "done");
    let success = 0;
    let failed = 0;

    // Sequential upload — one request per file keeps payloads small and
    // preserves the existing per-request size/type limits. A single failure
    // never aborts the rest of the batch.
    for (const entry of queue) {
      setFileStatus(entry.id, "uploading");
      try {
        const fileData = await readAsBase64(entry.file);
        const filename = entry.file.name
          .toLowerCase()
          .replace(/\s+/g, "_")
          .replace(/[^a-z0-9._-]/g, "");
        await createPlan.mutateAsync({
          data: {
            originalName: entry.file.name,
            filename,
            projectId: pid,
            fileSize: entry.file.size,
            mimeType: entry.file.type || "application/pdf",
            fileData,
          },
        });
        success++;
        setFileStatus(entry.id, "done");
      } catch {
        failed++;
        setFileStatus(entry.id, "error");
      }
    }

    queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
    setUploading(false);

    if (failed === 0) {
      toast({ title: success === 1 ? "Plan uploaded" : `${success} plans uploaded` });
      setSelectedFiles([]);
      setProjectId("");
      setOpen(false);
    } else {
      toast({
        title: `${success} uploaded · ${failed} failed`,
        description: "Failed files stay listed so you can retry or remove them.",
        variant: "destructive",
      });
      // Drop the ones that succeeded; keep failures for retry.
      setSelectedFiles(prev => prev.filter(f => f.status === "error"));
    }
  }

  function handleDelete(id: number, name: string) {
    deletePlan.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
          toast({ title: `"${name}" deleted` });
        },
        onError: () => toast({ title: "Failed to delete plan", variant: "destructive" }),
      }
    );
  }

  const projectMap = Object.fromEntries((projects ?? []).map(p => [p.id, p.name]));

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">PDF Plans</h1>
            <p className="text-muted-foreground mt-1 text-sm">Upload and manage construction drawing sets.</p>
          </div>
          <Button data-testid="button-upload-plan" onClick={() => setOpen(true)} className="gap-2 shrink-0">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Upload Plan</span>
            <span className="sm:hidden">Upload</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : plans && plans.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30">
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">File</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Project</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Size</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Uploaded</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {plans.map(plan => (
                    <tr key={plan.id} data-testid={`plan-row-${plan.id}`} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary shrink-0" />
                          <span className="font-medium truncate max-w-48">{plan.originalName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{projectMap[plan.projectId] ?? `Project ${plan.projectId}`}</td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatBytes(plan.fileSize)}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${statusColor[plan.status]}`}>
                          {plan.status === "processing" && <RotateCcw className="w-3 h-3 mr-1 animate-spin" />}
                          {plan.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{new Date(plan.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {plan.hasFile && (
                            <a
                              data-testid={`link-view-plan-${plan.id}`}
                              href={`${API_BASE}api/plans/${plan.id}/file`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="View file"
                              className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            data-testid={`button-delete-plan-${plan.id}`}
                            onClick={() => handleDelete(plan.id, plan.originalName)}
                            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {plans.map(plan => (
                <div key={plan.id} data-testid={`plan-row-${plan.id}`}
                  className="rounded-xl border border-border bg-card px-3.5 py-3 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{plan.originalName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground truncate">{projectMap[plan.projectId]}</p>
                      <span className="text-muted-foreground">·</span>
                      <p className="text-xs text-muted-foreground tabular-nums shrink-0">{formatBytes(plan.fileSize)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs shrink-0 ${statusColor[plan.status]}`}>
                    {plan.status}
                  </Badge>
                  {plan.hasFile && (
                    <a
                      href={`${API_BASE}api/plans/${plan.id}/file`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded text-muted-foreground hover:text-primary transition-colors shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(plan.id, plan.originalName)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div
            className="rounded-xl border-2 border-dashed border-border p-12 text-center cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => setOpen(true)}
          >
            <Cloud className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No plans uploaded</p>
            <p className="text-sm text-muted-foreground mt-1">Click to upload a PDF plan for analysis.</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={v => { if (uploading) return; setOpen(v); if (!v) setSelectedFiles([]); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload PDF Plans</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center py-8 px-4 text-center ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-secondary/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                multiple
                className="hidden"
                onChange={onFileChange}
                data-testid="input-plan-file"
              />
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">
                {selectedFiles.length > 0 ? "Drop more PDFs or click to add" : "Drop PDFs here or click to browse"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF files only · select multiple</p>
            </div>

            {/* Selected files */}
            {selectedFiles.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto -mr-1 pr-1" data-testid="list-selected-files">
                {selectedFiles.map(entry => (
                  <div
                    key={entry.id}
                    data-testid={`selected-file-${entry.status}`}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/30 px-3 py-2"
                  >
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBytes(entry.file.size)}</p>
                    </div>
                    {entry.status === "uploading" && <RotateCcw className="w-4 h-4 text-yellow-400 animate-spin shrink-0" />}
                    {entry.status === "done" && <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />}
                    {entry.status === "error" && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                    {!uploading && (
                      <button
                        type="button"
                        onClick={() => removeFile(entry.id)}
                        className="text-muted-foreground hover:text-foreground p-1 rounded shrink-0"
                        aria-label={`Remove ${entry.file.name}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Project select */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Project</label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger data-testid="select-plan-project">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <p className="text-xs text-muted-foreground">
              Each PDF is uploaded and stored in the database. Files upload one at a time — if one fails the rest continue. AI sheet analysis is mocked in this build.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" disabled={uploading} onClick={() => { setOpen(false); setSelectedFiles([]); }}>
                Cancel
              </Button>
              <Button
                data-testid="button-submit-plan"
                type="submit"
                disabled={selectedFiles.length === 0 || !projectId || uploading}
              >
                {uploading
                  ? "Uploading…"
                  : selectedFiles.length > 1
                  ? `Register ${selectedFiles.length} Plans`
                  : "Register Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
