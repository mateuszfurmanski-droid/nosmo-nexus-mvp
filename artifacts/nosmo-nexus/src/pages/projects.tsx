import { useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout";
import {
  useListProjects,
  useCreateProject,
  useDeleteProject,
  getListProjectsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, MapPin, Trash2, ChevronRight, FolderKanban } from "lucide-react";
import { useForm } from "react-hook-form";

const statusColor: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/20",
  on_hold: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  archived: "bg-muted text-muted-foreground border-border",
};

const statusLabel: Record<string, string> = {
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

type ProjectFormData = {
  name: string;
  description?: string;
  status: string;
  location?: string;
};

export default function Projects() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: projects, isLoading } = useListProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();

  const form = useForm<ProjectFormData>({
    defaultValues: { name: "", description: "", status: "active", location: "" },
  });

  function onSubmit(data: ProjectFormData) {
    createProject.mutate(
      { data: { name: data.name, description: data.description || undefined, status: data.status as never, location: data.location || undefined } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          toast({ title: "Project created" });
          form.reset();
          setOpen(false);
        },
        onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
      }
    );
  }

  function handleDelete(id: number, name: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    deleteProject.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
          toast({ title: `"${name}" deleted` });
        },
        onError: () => toast({ title: "Failed to delete project", variant: "destructive" }),
      }
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <p className="text-muted-foreground mt-1">Manage your construction projects.</p>
          </div>
          <Button data-testid="button-create-project" onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Project
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : projects && projects.length > 0 ? (
          <div className="grid gap-4">
            {projects.map(project => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <div data-testid={`card-project-${project.id}`} className="rounded-xl border border-border bg-card p-5 flex items-center gap-4 hover:border-primary/40 transition-colors cursor-pointer group">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
                    <FolderKanban className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold truncate">{project.name}</p>
                      <Badge variant="outline" className={`text-xs shrink-0 ${statusColor[project.status]}`}>
                        {statusLabel[project.status]}
                      </Badge>
                    </div>
                    {project.description && <p className="text-sm text-muted-foreground mt-0.5 truncate">{project.description}</p>}
                    {project.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="w-3 h-3" />
                        {project.location}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      data-testid={`button-delete-project-${project.id}`}
                      onClick={(e) => handleDelete(project.id, project.name, e)}
                      className="p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <FolderKanban className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first project to get started.</p>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Project Name *</label>
              <Input data-testid="input-project-name" placeholder="e.g. Harbour Bridge Tower A" {...form.register("name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description</label>
              <Textarea data-testid="input-project-description" placeholder="Brief description..." {...form.register("description")} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Location</label>
              <Input data-testid="input-project-location" placeholder="e.g. Sydney CBD, NSW" {...form.register("location")} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Status</label>
              <Select defaultValue="active" onValueChange={v => form.setValue("status", v)}>
                <SelectTrigger data-testid="select-project-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button data-testid="button-submit-project" type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
