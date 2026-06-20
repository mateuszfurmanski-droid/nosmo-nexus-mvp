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
import { Plus, Trash2, ChevronRight, ChevronLeft, LayoutGrid, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";

type Status = "todo" | "in_progress" | "done";
type Task = { id: number; title: string; status: string; priority?: string | null; assignee?: string | null; projectId: number };

const COLUMNS: { id: Status; label: string; accent: string; headerBg: string }[] = [
  { id: "todo", label: "To Do", accent: "border-border", headerBg: "bg-card" },
  { id: "in_progress", label: "In Progress", accent: "border-primary/30", headerBg: "bg-primary/5" },
  { id: "done", label: "Done", accent: "border-green-500/30", headerBg: "bg-green-500/5" },
];

const priorityBadge: Record<string, string> = {
  low: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  high: "bg-red-500/10 text-red-400 border-red-500/20",
};

type TaskFormData = {
  title: string;
  projectId: string;
  priority: string;
  assignee?: string;
};

export default function Tasks() {
  const [open, setOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: tasks, isLoading } = useListTasks();
  const { data: projects } = useListProjects();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const projectMap = Object.fromEntries((projects ?? []).map(p => [p.id, p.name]));

  const form = useForm<TaskFormData>({
    defaultValues: { title: "", projectId: "", priority: "medium", assignee: "" },
  });

  const editForm = useForm<{ title: string; priority: string; assignee: string; status: string }>({
    defaultValues: { title: "", priority: "medium", assignee: "", status: "todo" },
  });

  function openEdit(task: Task) {
    setEditTask(task);
    editForm.reset({
      title: task.title,
      priority: task.priority ?? "medium",
      assignee: task.assignee ?? "",
      status: task.status,
    });
  }

  function onEditSubmit(data: { title: string; priority: string; assignee: string; status: string }) {
    if (!editTask) return;
    updateTask.mutate(
      {
        id: editTask.id,
        data: {
          title: data.title,
          priority: data.priority as never,
          assignee: data.assignee || undefined,
          status: data.status as never,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListTasksQueryKey() });
          toast({ title: "Task updated" });
          setEditTask(null);
        },
        onError: () => toast({ title: "Failed to update task", variant: "destructive" }),
      }
    );
  }

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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <LayoutGrid className="w-6 h-6 text-primary" /> Task Board
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {tasks?.length ?? 0} tasks across {projects?.length ?? 0} projects
            </p>
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
              <div key={col.id} className={`rounded-xl border ${col.accent} overflow-hidden`}>
                <div className={`px-4 py-3 border-b border-border flex items-center justify-between ${col.headerBg}`}>
                  <span className="font-semibold text-sm">{col.label}</span>
                  <Badge variant="secondary" className="text-xs tabular-nums">
                    {tasksByStatus[col.id]?.length ?? 0}
                  </Badge>
                </div>
                <div className="p-2.5 space-y-2 min-h-36 bg-card/30">
                  {(tasksByStatus[col.id] ?? []).length === 0 && (
                    <div className="py-6 text-center">
                      <p className="text-xs text-muted-foreground/50">No tasks</p>
                    </div>
                  )}
                  {(tasksByStatus[col.id] ?? []).map(task => (
                    <div
                      key={task.id}
                      data-testid={`task-card-${task.id}`}
                      className="rounded-lg border border-border bg-card p-3 space-y-2 group hover:border-border/80 transition-colors"
                    >
                      <p className="text-sm font-medium leading-snug">{task.title}</p>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {task.priority && (
                          <Badge variant="outline" className={`text-xs ${priorityBadge[task.priority] ?? ""}`}>
                            {task.priority}
                          </Badge>
                        )}
                        {task.projectId && projectMap[task.projectId] && (
                          <span className="text-xs text-muted-foreground truncate max-w-28">
                            {projectMap[task.projectId]}
                          </span>
                        )}
                      </div>

                      {task.assignee && (
                        <p className="text-xs text-muted-foreground">{task.assignee}</p>
                      )}

                      {/* Action row */}
                      <div className="flex items-center gap-1 border-t border-border/50 pt-1.5 mt-1.5">
                        {col.id !== "todo" && (
                          <button
                            data-testid={`button-task-back-${task.id}`}
                            onClick={() => moveTask(task.id, col.id, "back")}
                            title="Move back"
                            className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                          >
                            <ChevronLeft className="w-3 h-3" />
                            {COLUMNS[COLUMNS.findIndex(c => c.id === col.id) - 1]?.label}
                          </button>
                        )}
                        {col.id !== "done" && (
                          <button
                            data-testid={`button-task-forward-${task.id}`}
                            onClick={() => moveTask(task.id, col.id, "forward")}
                            title="Move forward"
                            className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            {COLUMNS[COLUMNS.findIndex(c => c.id === col.id) + 1]?.label}
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          data-testid={`button-edit-task-${task.id}`}
                          onClick={() => openEdit(task as Task)}
                          title="Edit"
                          className="ml-auto p-0.5 rounded text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          data-testid={`button-delete-task-${task.id}`}
                          onClick={() => handleDelete(task.id)}
                          title="Delete"
                          className="p-0.5 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <Input
              data-testid="input-task-title"
              placeholder="Task title *"
              {...form.register("title", { required: true })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Project</label>
                <Select onValueChange={v => form.setValue("projectId", v)}>
                  <SelectTrigger data-testid="select-task-project" className="text-sm">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map(p => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select defaultValue="medium" onValueChange={v => form.setValue("priority", v)}>
                  <SelectTrigger data-testid="select-task-priority" className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input
              data-testid="input-task-assignee"
              placeholder="Assignee (optional)"
              {...form.register("assignee")}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button data-testid="button-submit-task" type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit task dialog */}
      <Dialog open={!!editTask} onOpenChange={v => { if (!v) setEditTask(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-3">
            <Input
              data-testid="input-edit-task-title"
              placeholder="Task title *"
              {...editForm.register("title", { required: true })}
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <Select value={editForm.watch("status")} onValueChange={v => editForm.setValue("status", v)}>
                  <SelectTrigger data-testid="select-edit-task-status" className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <Select value={editForm.watch("priority")} onValueChange={v => editForm.setValue("priority", v)}>
                  <SelectTrigger data-testid="select-edit-task-priority" className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input
              data-testid="input-edit-task-assignee"
              placeholder="Assignee (optional)"
              {...editForm.register("assignee")}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditTask(null)}>Cancel</Button>
              <Button data-testid="button-save-task" type="submit" disabled={updateTask.isPending}>
                {updateTask.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
