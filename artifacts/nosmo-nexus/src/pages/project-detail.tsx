import { useParams, Link } from "wouter";
import { AppLayout } from "@/components/layout";
import {
  useGetProject,
  useGetProjectStats,
  useListTasks,
  useListPlans,
  getListTasksQueryKey,
  getListPlansQueryKey,
  getGetProjectStatsQueryKey,
  useCreateTask,
  useUpdateTask,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ArrowLeft, MapPin, FileText, CheckSquare, BarChart3, Plus, ChevronRight } from "lucide-react";

const statusColor: Record<string, string> = {
  todo: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-primary/15 text-primary border-primary/20",
  done: "bg-green-500/15 text-green-400 border-green-500/20",
};

const planStatusColor: Record<string, string> = {
  uploaded: "bg-muted text-muted-foreground border-border",
  processing: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  ready: "bg-green-500/15 text-green-400 border-green-500/20",
  failed: "bg-red-500/15 text-red-400 border-red-500/20",
};

type TaskFormData = { title: string };

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [taskOpen, setTaskOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, {
    query: { queryKey: ["getProject", projectId], enabled: !!projectId },
  });
  const { data: stats } = useGetProjectStats(projectId, {
    query: { queryKey: getGetProjectStatsQueryKey(projectId), enabled: !!projectId },
  });
  const { data: tasks } = useListTasks(
    { projectId },
    { query: { queryKey: getListTasksQueryKey({ projectId }), enabled: !!projectId } }
  );
  const { data: plans } = useListPlans(
    { projectId },
    { query: { queryKey: getListPlansQueryKey({ projectId }), enabled: !!projectId } }
  );
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const form = useForm<TaskFormData>({ defaultValues: { title: "" } });

  function onCreateTask(data: TaskFormData) {
    createTask.mutate(
      { data: { projectId, title: data.title } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
          queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(projectId) });
          toast({ title: "Task created" });
          form.reset();
          setTaskOpen(false);
        },
        onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
      }
    );
  }

  if (projectLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return <AppLayout><p className="text-muted-foreground">Project not found.</p></AppLayout>;
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <Link href="/projects" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="w-3.5 h-3.5" /> Projects
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
              {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
              {project.location && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {project.location}
                </div>
              )}
            </div>
            <Badge variant="outline" className="text-sm shrink-0">
              {project.status.replace("_", " ")}
            </Badge>
          </div>
        </div>

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Tasks", value: stats.totalTasks, icon: BarChart3 },
              { label: "To Do", value: stats.todoTasks, icon: CheckSquare },
              { label: "In Progress", value: stats.inProgressTasks, icon: CheckSquare },
              { label: "Plans", value: stats.totalPlans, icon: FileText },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
                <s.icon className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tasks */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2"><CheckSquare className="w-4 h-4 text-primary" />Tasks</h2>
            <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add Task
            </Button>
          </div>
          {tasks && tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.slice(0, 5).map(task => (
                <div key={task.id} data-testid={`task-item-${task.id}`} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
                  <Badge variant="outline" className={`text-xs shrink-0 ${statusColor[task.status]}`}>
                    {task.status.replace("_", " ")}
                  </Badge>
                  <p className="text-sm flex-1 truncate">{task.title}</p>
                  {task.assignee && <p className="text-xs text-muted-foreground shrink-0">{task.assignee}</p>}
                </div>
              ))}
              {(tasks.length ?? 0) > 5 && (
                <Link href="/tasks">
                  <Button variant="ghost" size="sm" className="w-full gap-1.5 text-muted-foreground">
                    View all {tasks.length} tasks <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">No tasks yet.</p>
          )}
        </div>

        {/* Plans */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />PDF Plans</h2>
            <Link href="/plans">
              <Button size="sm" variant="outline" className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Upload Plan
              </Button>
            </Link>
          </div>
          {plans && plans.length > 0 ? (
            <div className="space-y-2">
              {plans.map(plan => (
                <div key={plan.id} data-testid={`plan-item-${plan.id}`} className="rounded-lg border border-border bg-card px-4 py-3 flex items-center gap-3">
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm flex-1 truncate">{plan.originalName}</p>
                  <Badge variant="outline" className={`text-xs shrink-0 ${planStatusColor[plan.status]}`}>
                    {plan.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">No plans uploaded.</p>
          )}
        </div>
      </div>

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onCreateTask)} className="space-y-4">
            <Input data-testid="input-task-title" placeholder="Task title..." {...form.register("title", { required: true })} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTaskOpen(false)}>Cancel</Button>
              <Button data-testid="button-submit-task" type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? "Creating..." : "Add Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
