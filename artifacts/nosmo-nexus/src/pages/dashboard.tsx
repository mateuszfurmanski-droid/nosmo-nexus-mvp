import { useState } from "react";
import { Link } from "wouter";
import { AppLayout } from "@/components/layout";
import {
  useGetDashboardSummary,
  useGetRecentActivity,
  useSeedDemoData,
  getGetDashboardSummaryQueryKey,
  getGetRecentActivityQueryKey,
  getListProjectsQueryKey,
  useCreateProject,
  useCreateTask,
  useListProjects,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban, FileText, CheckSquare, CheckCircle2,
  Activity, BarChart3, Plus, Zap, ArrowRight,
  ClipboardList, ChevronRight,
} from "lucide-react";
import { useForm } from "react-hook-form";

const typeLabel: Record<string, string> = {
  project_created: "Project created",
  task_created: "Task created",
  task_updated: "Task updated",
  task_moved: "Task moved",
  plan_uploaded: "Plan uploaded",
  comment_added: "Comment added",
  demo_seeded: "Demo seeded",
};

const typeDot: Record<string, string> = {
  project_created: "bg-blue-500",
  task_created: "bg-primary",
  task_updated: "bg-yellow-500",
  task_moved: "bg-yellow-500",
  plan_uploaded: "bg-purple-500",
  comment_added: "bg-green-500",
  demo_seeded: "bg-muted-foreground",
};

type ProjectFormData = { name: string; location?: string };
type TaskFormData = { title: string; projectId: string };

function StatCard({
  label, value, icon: Icon, accent, href,
}: {
  label: string; value: number | undefined; icon: React.ElementType; accent?: boolean; href?: string;
}) {
  const inner = (
    <div className={`rounded-xl border p-5 flex items-start gap-4 transition-colors ${
      accent
        ? "border-primary/30 bg-primary/5 hover:border-primary/50"
        : "border-border bg-card hover:border-border/60"
    }`}>
      <div className={`p-2.5 rounded-lg shrink-0 ${accent ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        {value === undefined ? (
          <Skeleton className="h-9 w-14 mt-1" />
        ) : (
          <p className="text-3xl font-bold mt-0.5 tabular-nums">{value}</p>
        )}
      </div>
    </div>
  );
  if (href) return <Link href={href}>{inner}</Link>;
  return inner;
}

export default function Dashboard() {
  const [projectOpen, setProjectOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
  const { data: projects } = useListProjects();
  const seedDemo = useSeedDemoData();
  const createProject = useCreateProject();
  const createTask = useCreateTask();

  const projectForm = useForm<ProjectFormData>({ defaultValues: { name: "", location: "" } });
  const taskForm = useForm<TaskFormData>({ defaultValues: { title: "", projectId: "" } });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetRecentActivityQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
  }

  function handleSeedDemo() {
    seedDemo.mutate(undefined, {
      onSuccess: (data) => {
        invalidateAll();
        toast({ title: `Demo data loaded — ${data.projectsCreated} projects, ${data.tasksCreated} tasks, ${data.plansCreated} plans` });
      },
      onError: () => toast({ title: "Failed to seed demo data", variant: "destructive" }),
    });
  }

  function onCreateProject(data: ProjectFormData) {
    createProject.mutate(
      { data: { name: data.name, location: data.location || undefined, status: "active" } },
      {
        onSuccess: () => {
          invalidateAll();
          toast({ title: "Project created" });
          projectForm.reset();
          setProjectOpen(false);
        },
        onError: () => toast({ title: "Failed to create project", variant: "destructive" }),
      }
    );
  }

  function onCreateTask(data: TaskFormData) {
    createTask.mutate(
      { data: { title: data.title, projectId: parseInt(data.projectId, 10) } },
      {
        onSuccess: () => {
          invalidateAll();
          toast({ title: "Task created" });
          taskForm.reset();
          setTaskOpen(false);
        },
        onError: () => toast({ title: "Failed to create task", variant: "destructive" }),
      }
    );
  }

  const total = (summary?.openTasks ?? 0) + (summary?.inProgressTasks ?? 0) + (summary?.completedTasks ?? 0);

  return (
    <AppLayout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Construction site intelligence overview.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button
              data-testid="button-seed-demo"
              size="sm"
              variant="outline"
              onClick={handleSeedDemo}
              disabled={seedDemo.isPending}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <Zap className="w-3.5 h-3.5" />
              {seedDemo.isPending ? "Loading..." : "Load Demo Data"}
            </Button>
            <Button data-testid="button-quick-task" size="sm" variant="outline" onClick={() => setTaskOpen(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Task
            </Button>
            <Button data-testid="button-quick-project" size="sm" onClick={() => setProjectOpen(true)} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> New Project
            </Button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Projects" value={summary?.totalProjects} icon={FolderKanban} href="/projects" />
          <StatCard label="Uploaded Plans" value={summary?.totalPlans} icon={FileText} href="/plans" />
          <StatCard label="Open Tasks" value={summary?.openTasks} icon={CheckSquare} accent href="/tasks" />
          <StatCard label="Completed Tasks" value={summary?.completedTasks} icon={CheckCircle2} href="/tasks" />
        </div>

        {/* Middle row */}
        <div className="grid lg:grid-cols-5 gap-6">

          {/* Task breakdown */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">Task Breakdown</h2>
              </div>
              <Link href="/tasks">
                <span className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
                  View all <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            </div>
            {summaryLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-7 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: "To Do", value: summary?.openTasks ?? 0, bar: "bg-muted-foreground/60" },
                  { label: "In Progress", value: summary?.inProgressTasks ?? 0, bar: "bg-primary" },
                  { label: "Done", value: summary?.completedTasks ?? 0, bar: "bg-green-500" },
                ].map(item => {
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return (
                    <div key={item.label} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-semibold tabular-nums">{item.value} <span className="text-muted-foreground font-normal">({pct}%)</span></span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full rounded-full ${item.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total tasks</span>
                  <span className="font-semibold tabular-nums">{total}</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="lg:col-span-3 rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-sm">Recent Activity</h2>
            </div>
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-1 max-h-72 overflow-y-auto -mr-2 pr-2">
                {activity.slice(0, 12).map(item => (
                  <div key={item.id} data-testid={`activity-item-${item.id}`} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${typeDot[item.type] ?? "bg-muted"}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate">{item.entityName}</span>
                      <span className="text-xs text-muted-foreground ml-2">{typeLabel[item.type] ?? item.type}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                      {new Date(item.createdAt).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No activity yet.</p>
                <p className="text-xs text-muted-foreground mt-1">Create a project or task to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { label: "Manage Projects", desc: "View and create projects", href: "/projects", icon: FolderKanban },
            { label: "Task Board", desc: "Kanban workflow tracker", href: "/tasks", icon: CheckSquare },
            { label: "PDF Plans", desc: "Upload and analyse plans", href: "/plans", icon: FileText },
          ].map(link => (
            <Link key={link.href} href={link.href}>
              <div className="rounded-xl border border-border bg-card px-4 py-3 flex items-center gap-3 hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-pointer group">
                <link.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">{link.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors ml-auto shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Quick project modal */}
      <Dialog open={projectOpen} onOpenChange={setProjectOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <form onSubmit={projectForm.handleSubmit(onCreateProject)} className="space-y-3">
            <Input data-testid="input-project-name" placeholder="Project name *" {...projectForm.register("name", { required: true })} />
            <Input data-testid="input-project-location" placeholder="Location (optional)" {...projectForm.register("location")} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setProjectOpen(false)}>Cancel</Button>
              <Button data-testid="button-submit-project" type="submit" disabled={createProject.isPending}>
                {createProject.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Quick task modal */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
          <form onSubmit={taskForm.handleSubmit(onCreateTask)} className="space-y-3">
            <Input data-testid="input-task-title" placeholder="Task title *" {...taskForm.register("title", { required: true })} />
            <div className="space-y-1.5">
              <Select onValueChange={v => taskForm.setValue("projectId", v)}>
                <SelectTrigger data-testid="select-task-project">
                  <SelectValue placeholder="Select project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects?.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTaskOpen(false)}>Cancel</Button>
              <Button data-testid="button-submit-task" type="submit" disabled={createTask.isPending}>
                {createTask.isPending ? "Creating..." : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
