import { useState } from "react";
import { useParams, Link } from "wouter";
import { AppLayout } from "@/components/layout";
import {
  useGetProject,
  useGetProjectStats,
  useListTasks,
  useListPlans,
  useGetProjectActivity,
  getGetProjectQueryKey,
  getGetProjectStatsQueryKey,
  getListTasksQueryKey,
  getListPlansQueryKey,
  getGetProjectActivityQueryKey,
  useCreateTask,
  useUpdateTask,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import {
  ArrowLeft, MapPin, FileText, CheckSquare,
  BarChart3, Plus, ChevronRight, ChevronLeft,
  Activity, Clock, Circle,
} from "lucide-react";

const taskStatusColor: Record<string, string> = {
  todo: "bg-muted/60 text-muted-foreground border-border",
  in_progress: "bg-primary/10 text-primary border-primary/20",
  done: "bg-green-500/10 text-green-400 border-green-500/20",
};

const planStatusColor: Record<string, string> = {
  uploaded: "bg-muted text-muted-foreground border-border",
  processing: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  ready: "bg-green-500/15 text-green-400 border-green-500/20",
  failed: "bg-red-500/15 text-red-400 border-red-500/20",
};

const projectStatusColor: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/20",
  on_hold: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  completed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  archived: "bg-muted text-muted-foreground border-border",
};

const activityDot: Record<string, string> = {
  project_created: "bg-blue-500",
  task_created: "bg-primary",
  task_moved: "bg-yellow-500",
  task_updated: "bg-yellow-500",
  plan_uploaded: "bg-purple-500",
  comment_added: "bg-green-500",
};

const activityLabel: Record<string, string> = {
  project_created: "Project created",
  task_created: "Task created",
  task_moved: "Task moved",
  task_updated: "Task updated",
  plan_uploaded: "Plan uploaded",
  comment_added: "Comment added",
};

type Status = "todo" | "in_progress" | "done";

const COLUMNS: { id: Status; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

type TaskFormData = { title: string; priority: string };

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id ?? "0", 10);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [taskOpen, setTaskOpen] = useState(false);

  const { data: project, isLoading: projectLoading } = useGetProject(projectId, {
    query: { queryKey: getGetProjectQueryKey(projectId), enabled: !!projectId },
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
  const { data: activity, isLoading: activityLoading } = useGetProjectActivity(projectId, {
    query: { queryKey: getGetProjectActivityQueryKey(projectId), enabled: !!projectId },
  });

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const form = useForm<TaskFormData>({ defaultValues: { title: "", priority: "medium" } });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: getListTasksQueryKey({ projectId }) });
    queryClient.invalidateQueries({ queryKey: getGetProjectStatsQueryKey(projectId) });
    queryClient.invalidateQueries({ queryKey: getGetProjectActivityQueryKey(projectId) });
  }

  function onCreateTask(data: TaskFormData) {
    createTask.mutate(
      { data: { projectId, title: data.title, priority: data.priority as never } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Task created" });
          form.reset();
          setTaskOpen(false);
        },
        onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
      }
    );
  }

  function moveTask(taskId: number, currentStatus: Status, direction: "forward" | "back") {
    const idx = COLUMNS.findIndex(c => c.id === currentStatus);
    const next = direction === "forward" ? COLUMNS[idx + 1] : COLUMNS[idx - 1];
    if (!next) return;
    updateTask.mutate(
      { id: taskId, data: { status: next.id } },
      {
        onSuccess: () => invalidate(),
        onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
      }
    );
  }

  if (projectLoading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!project) {
    return <AppLayout><p className="text-muted-foreground">Project not found.</p></AppLayout>;
  }

  const tasksByStatus = COLUMNS.reduce<Record<Status, typeof tasks>>((acc, col) => {
    acc[col.id] = tasks?.filter(t => t.status === col.id) ?? [];
    return acc;
  }, { todo: [], in_progress: [], done: [] });

  return (
    <AppLayout>
      <div className="space-y-6">

        {/* Back + header */}
        <div>
          <Link href="/projects" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3 transition-colors">
            <ArrowLeft className="w-3 h-3" /> All projects
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                <Badge variant="outline" className={`text-xs shrink-0 ${projectStatusColor[project.status]}`}>
                  {project.status.replace("_", " ")}
                </Badge>
              </div>
              {project.description && <p className="text-muted-foreground mt-1 text-sm">{project.description}</p>}
              {project.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3" /> {project.location}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { label: "Total Tasks", value: stats.totalTasks, icon: BarChart3 },
              { label: "To Do", value: stats.todoTasks, icon: Circle },
              { label: "In Progress", value: stats.inProgressTasks, icon: Clock },
              { label: "Done", value: stats.doneTasks, icon: CheckSquare },
              { label: "Plans", value: stats.totalPlans, icon: FileText },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-border bg-card px-3 py-2.5 flex items-center gap-2.5">
                <s.icon className="w-3.5 h-3.5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground leading-none">{s.label}</p>
                  <p className="text-lg font-bold mt-0.5 tabular-nums">{s.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Kanban board */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-primary" /> Tasks
            </h2>
            <div className="flex items-center gap-2">
              <Link href="/tasks">
                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground gap-1 h-7">
                  Full board <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
              <Button size="sm" variant="outline" onClick={() => setTaskOpen(true)} className="gap-1.5 h-7 text-xs">
                <Plus className="w-3 h-3" /> Add Task
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {COLUMNS.map(col => (
              <div key={col.id} className="rounded-lg border border-border bg-card/50 overflow-hidden">
                <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-card">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{col.label}</span>
                  <Badge variant="secondary" className="text-xs h-4 px-1.5">{tasksByStatus[col.id]?.length ?? 0}</Badge>
                </div>
                <div className="p-2 space-y-1.5 min-h-20">
                  {(tasksByStatus[col.id] ?? []).map(task => (
                    <div key={task.id} data-testid={`task-card-${task.id}`}
                      className="rounded-md border border-border bg-card px-2.5 py-2 group space-y-1.5">
                      <p className="text-xs font-medium leading-snug">{task.title}</p>
                      {task.assignee && <p className="text-xs text-muted-foreground">{task.assignee}</p>}
                      <div className="flex items-center gap-1 pt-0.5">
                        {col.id !== "todo" && (
                          <button
                            data-testid={`btn-back-${task.id}`}
                            onClick={() => moveTask(task.id, col.id, "back")}
                            className="p-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          ><ChevronLeft className="w-3 h-3" /></button>
                        )}
                        {col.id !== "done" && (
                          <button
                            data-testid={`btn-forward-${task.id}`}
                            onClick={() => moveTask(task.id, col.id, "forward")}
                            className="p-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          ><ChevronRight className="w-3 h-3" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom row: plans + activity */}
        <div className="grid lg:grid-cols-2 gap-6">

          {/* Plans */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" /> PDF Plans
              </h2>
              <Link href="/plans">
                <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs">
                  <Plus className="w-3 h-3" /> Upload
                </Button>
              </Link>
            </div>
            {plans && plans.length > 0 ? (
              <div className="space-y-1.5">
                {plans.map(plan => (
                  <div key={plan.id} data-testid={`plan-item-${plan.id}`}
                    className="rounded-lg border border-border bg-card px-3 py-2.5 flex items-center gap-2.5">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <p className="text-xs flex-1 truncate font-medium">{plan.originalName}</p>
                    <Badge variant="outline" className={`text-xs shrink-0 ${planStatusColor[plan.status]}`}>
                      {plan.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border py-6 text-center">
                <p className="text-xs text-muted-foreground">No plans uploaded.</p>
              </div>
            )}
          </div>

          {/* Activity log */}
          <div className="space-y-2.5">
            <h2 className="font-semibold text-sm flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-primary" /> Activity Log
            </h2>
            {activityLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="divide-y divide-border max-h-64 overflow-y-auto">
                  {activity.map(item => (
                    <div key={item.id} data-testid={`proj-activity-${item.id}`}
                      className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-secondary/30 transition-colors">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activityDot[item.type] ?? "bg-muted"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.entityName}</p>
                        <p className="text-xs text-muted-foreground">{activityLabel[item.type] ?? item.type}</p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {new Date(item.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border py-6 text-center">
                <p className="text-xs text-muted-foreground">No activity yet for this project.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onCreateTask)} className="space-y-3">
            <Input data-testid="input-task-title" placeholder="Task title *" {...form.register("title", { required: true })} />
            <Select defaultValue="medium" onValueChange={v => form.setValue("priority", v)}>
              <SelectTrigger data-testid="select-priority"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low priority</SelectItem>
                <SelectItem value="medium">Medium priority</SelectItem>
                <SelectItem value="high">High priority</SelectItem>
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTaskOpen(false)}>Cancel</Button>
              <Button data-testid="button-submit-task" type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? "Adding..." : "Add Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
