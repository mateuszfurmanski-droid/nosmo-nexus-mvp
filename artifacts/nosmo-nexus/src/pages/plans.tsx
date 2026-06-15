import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Trash2, RotateCcw } from "lucide-react";
import { useForm } from "react-hook-form";

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

type PlanFormData = {
  originalName: string;
  projectId: string;
};

export default function Plans() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: plans, isLoading } = useListPlans();
  const { data: projects } = useListProjects();
  const createPlan = useCreatePlan();
  const deletePlan = useDeletePlan();

  const form = useForm<PlanFormData>({ defaultValues: { originalName: "", projectId: "" } });

  function onSubmit(data: PlanFormData) {
    const filename = data.originalName.toLowerCase().replace(/\s+/g, "_").replace(/\.pdf$/, "") + ".pdf";
    createPlan.mutate(
      {
        data: {
          originalName: data.originalName.endsWith(".pdf") ? data.originalName : data.originalName + ".pdf",
          filename,
          projectId: parseInt(data.projectId, 10),
          fileSize: Math.floor(Math.random() * 8000000) + 1000000,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPlansQueryKey() });
          toast({ title: "Plan registered — analysis starting" });
          form.reset();
          setOpen(false);
        },
        onError: () => toast({ title: "Failed to register plan", variant: "destructive" }),
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">PDF Plans</h1>
            <p className="text-muted-foreground mt-1">Upload and manage construction drawing sets.</p>
          </div>
          <Button data-testid="button-upload-plan" onClick={() => setOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" /> Upload Plan
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : plans && plans.length > 0 ? (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
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
                    <td className="px-4 py-3 text-muted-foreground">{formatBytes(plan.fileSize)}</td>
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
        ) : (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No plans uploaded</p>
            <p className="text-sm text-muted-foreground mt-1">Register a PDF plan to begin AI analysis.</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload PDF Plan</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">File Name</label>
              <Input data-testid="input-plan-name" placeholder="e.g. A-001 Site Plan Rev 3.pdf" {...form.register("originalName", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Project</label>
              <Select onValueChange={v => form.setValue("projectId", v)}>
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
              Note: In V0 the file name is registered and AI analysis is mocked. File upload storage is not implemented yet.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button data-testid="button-submit-plan" type="submit" disabled={createPlan.isPending}>
                {createPlan.isPending ? "Registering..." : "Register Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
