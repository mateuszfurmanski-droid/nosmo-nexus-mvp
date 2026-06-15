import { useState } from "react";
import { AppLayout } from "@/components/layout";
import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListProjects,
  getListTasksQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, ChevronRight, ChevronLeft } from "lucide-react";
import { useForm } from "react-hook-form";

type Status = "todo" | "in_progress" | "done";

const COLUMNS: { id: Status; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

const statusColor: Record<Status, string> = {
  todo: "border-border",
  in_progress: "border-primary/30",
  done: "border-green-500/30",
};

const priorityColor: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-400",
  medium: "bg-yellow-500/10 text-yellow-400",
  high: "bg-red-500/10 text-red-400",
};

type TaskFormData = {
  title: string;
  projectId: string;
  priority: string;
  assignee?: string;
};

export default function Tasks() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: tasks, isLoading } = useListTasks();
  const { data: projects } = useListProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const form = useForm<TaskFormData>({
    defaultValues: { title: "", projectId: "", priority: "medium", assignee: "" },
  });

  function onSubmit(data: TaskFormData) {
    createTask.mutate(
      {
        data: {
          title: data.title,
          projectId: parseInt(data.projectId, 10),
          priority: data.priority as never,
          assignee: data.assignee || undefined,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          toast({ title: "Task created" });
          form.reset();
          setOpen(false);
        },
        onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
      }
    );
  }

  function moveTask(id: number, currentStatus: Status, direction: "forward" | "back") {
    const idx = COLUMNS.findIndex(c => c.id === currentStatus);
    const next = direction === "forward" ? COLUMNS[idx + 1] : COLUMNS[idx - 1];
    if (!next) return;
    updateTask.mutate(
      { id, data: { status: next.id } },
      {
        onSuccess: () => queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() }),
        onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
      }
    );
  }

  function handleDelete(id: number) {
    deleteTask.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          toast({ title: "Task deleted" });
        },
        onError: () => toast({ title: "Failed to delete task", variant: "destructive" }),
      }
    );
  }

  const tasksByStatus = COLUMNS.reduce<Record<Status, typeof tasks>>(
    (acc, col) => {
      acc[col.id] = tasks?.filter(t => t.status === col.id) ?? [];
      return acc;
    },
    { todo: [], in_progress: [], done: [] }
  );

  return (
    <AppLayout>
      <div className="space-y-6 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
            <p className="text-muted-foreground mt-1">Track work across all projects.</p>
          </div>
          <Button data-testid="button-create-task" onClick={() => setOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Task
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 items-start">
            {COLUMNS.map(col => (
              <div key={col.id} className={`rounded-xl border ${statusColor[col.id]} bg-card overflow-hidden`}>
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="font-semibold text-sm">{col.label}</span>
                  <Badge variant="secondary" className="text-xs">{tasksByStatus[col.id]?.length ?? 0}</Badge>
                </div>
                <div className="p-3 space-y-2 min-h-32">
                  {(tasksByStatus[col.id] ?? []).map(task => (
                    <div
                      key={task.id}
                      data-testid={`task-card-${task.id}`}
                      className="rounded-lg border border-border bg-background p-3 space-y-2 group"
                    >
                      <p className="text-sm font-medium leading-tight">{task.title}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {task.priority && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${priorityColor[task.priority] ?? ""}`}>
                            {task.priority}
                          </span>
                        )}
                        {task.assignee && (
                          <span className="text-xs text-muted-foreground truncate">{task.assignee}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 pt-1">
                        {col.id !== "todo" && (
                          <button
                            data-testid={`button-task-back-${task.id}`}
                            onClick={() => moveTask(task.id, col.id, "back")}
                            className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                            title="Move back"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {col.id !== "done" && (
                          <button
                            data-testid={`button-task-forward-${task.id}`}
                            onClick={() => moveTask(task.id, col.id, "forward")}
                            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            title="Move forward"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          data-testid={`button-delete-task-${task.id}`}
                          onClick={() => handleDelete(task.id)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-auto opacity-0 group-hover:opacity-100"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Input data-testid="input-task-title" placeholder="Task title..." {...form.register("title", { required: true })} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Project</label>
              <Select onValueChange={v => form.setValue("projectId", v)}>
                <SelectTrigger data-testid="select-task-project">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Priority</label>
              <Select defaultValue="medium" onValueChange={v => form.setValue("priority", v)}>
                <SelectTrigger data-testid="select-task-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input data-testid="input-task-assignee" placeholder="Assignee (optional)" {...form.register("assignee")} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button data-testid="button-submit-task" type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
