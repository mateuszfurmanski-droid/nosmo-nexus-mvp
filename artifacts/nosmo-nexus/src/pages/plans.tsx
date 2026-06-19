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
import { Upload, FileText, Trash2, RotateCcw, Cloud, X } from "lucide-react";

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: plans, isLoading } = useListPlans();
  const { data: projects } = useListProjects();
  const createPlan = useCreatePlan();
  const deletePlan = useDeletePlan();

  const handleFile = useCallback((file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Only PDF files are supported", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  }, [toast]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || !projectId) return;
    setUploading(true);

    const filename = selectedFile.name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9._-]/g, "");

    createPlan.mutate(
      {
        data: {
          originalName: selectedFile.name,
          filename,
          projectId: parseInt(projectId, 10),
          fileSize: selectedFile.size,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
          toast({ title: `"${selectedFile.name}" registered` });
          setSelectedFile(null);
          setProjectId("");
          setOpen(false);
        },
        onError: () => toast({ title: "Failed to register plan", variant: "destructive" }),
        onSettled: () => setUploading(false),
      }
    );
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
                        <button
                          data-testid={`button-delete-plan-${plan.id}`}
                          onClick={() => handleDelete(plan.id, plan.originalName)}
                          className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) setSelectedFile(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload PDF Plan</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4">

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center py-8 px-4 text-center ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : selectedFile
                  ? "border-green-500/50 bg-green-500/5 cursor-default"
                  : "border-border hover:border-primary/40 hover:bg-secondary/30"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={onFileChange}
                data-testid="input-plan-file"
              />
              {selectedFile ? (
                <div className="flex items-center gap-3 w-full">
                  <FileText className="w-8 h-8 text-green-400 shrink-0" />
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(selectedFile.size)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                    className="text-muted-foreground hover:text-foreground p-1 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Drop a PDF here or click to browse</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF files only</p>
                </>
              )}
            </div>

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
              File metadata is stored and analysis is queued. Full cloud storage in V1.
            </p>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setSelectedFile(null); }}>
                Cancel
              </Button>
              <Button
                data-testid="button-submit-plan"
                type="submit"
                disabled={!selectedFile || !projectId || uploading}
              >
                {uploading ? "Registering…" : "Register Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
