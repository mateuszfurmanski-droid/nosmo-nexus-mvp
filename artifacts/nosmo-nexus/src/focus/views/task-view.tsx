import { CheckSquare, User, FolderKanban, Clock, Flag } from "lucide-react";
import { getTask, getPerson, getProject, type TaskStatus, type TaskPriority } from "@/demo/data";
import { format, formatDistanceToNow } from "date-fns";
import { FocusableEntity } from "../focusable-entity";

const statusColor: Record<TaskStatus, string> = {
  "To Do": "bg-secondary text-muted-foreground border-border",
  "In Progress": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Done": "bg-green-500/10 text-green-400 border-green-500/20",
};

const priorityColor: Record<TaskPriority, string> = {
  Low: "bg-secondary text-muted-foreground border-border",
  Medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  High: "bg-red-500/10 text-red-400 border-red-500/20",
};

export function TaskView({ taskId }: { taskId: string }) {
  const task = getTask(taskId);
  if (!task) return <div className="p-8 text-center text-muted-foreground">Task not found</div>;

  const assignee = getPerson(task.assigneePersonId);
  const project = task.projectId ? getProject(task.projectId) : undefined;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${task.status === "Done" ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-primary/10 text-primary border-primary/20"}`}>
            <CheckSquare className="w-6 h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className={`text-xl font-bold tracking-tight ${task.status === "Done" ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColor[task.status]}`}>{task.status}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border inline-flex items-center gap-1 ${priorityColor[task.priority]}`}>
                <Flag className="w-3 h-3" /> {task.priority}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium border border-border bg-secondary text-muted-foreground inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> Due {format(new Date(task.dueDate), "MMM d, yyyy")} ({formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })})
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {assignee && (
          <FocusableEntity
            target={{ type: "person", id: assignee.id }}
            ariaLabel={`Open person ${assignee.name}`}
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors group"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Assignee</p>
            <p className="font-medium text-sm group-hover:text-primary transition-colors">{assignee.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{assignee.title}</p>
          </FocusableEntity>
        )}
        {project && (
          <FocusableEntity
            target={{ type: "project", id: project.id }}
            ariaLabel={`Open project ${project.name}`}
            className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-colors group"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><FolderKanban className="w-3.5 h-3.5" /> Project</p>
            <p className="font-medium text-sm group-hover:text-primary transition-colors">{project.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{project.client}</p>
          </FocusableEntity>
        )}
      </div>
    </div>
  );
}
