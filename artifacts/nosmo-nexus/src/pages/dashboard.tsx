import { AppLayout } from "@/components/layout";
import { useGetDashboardSummary, useGetRecentActivity } from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban, FileText, CheckSquare, CheckCircle2, Activity, BarChart3 } from "lucide-react";

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number | undefined; icon: React.ElementType; accent?: boolean }) {
  return (
    <div data-testid={`stat-card-${label.toLowerCase().replace(/\s/g, "-")}`} className={`rounded-xl border p-6 flex items-start gap-4 ${accent ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}>
      <div className={`p-2 rounded-lg ${accent ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground"}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        {value === undefined ? (
          <Skeleton className="h-8 w-16 mt-1" />
        ) : (
          <p className="text-3xl font-bold mt-0.5">{value}</p>
        )}
      </div>
    </div>
  );
}

const typeLabel: Record<string, string> = {
  project_created: "Project created",
  task_created: "Task created",
  task_updated: "Task updated",
  plan_uploaded: "Plan uploaded",
  comment_added: "Comment added",
};

const typeColor: Record<string, string> = {
  project_created: "bg-blue-500",
  task_created: "bg-primary",
  task_updated: "bg-yellow-500",
  plan_uploaded: "bg-purple-500",
  comment_added: "bg-green-500",
};

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Construction site intelligence at a glance.</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Projects" value={summary?.totalProjects} icon={FolderKanban} />
          <StatCard label="Uploaded Plans" value={summary?.totalPlans} icon={FileText} />
          <StatCard label="Open Tasks" value={summary?.openTasks} icon={CheckSquare} accent />
          <StatCard label="Completed Tasks" value={summary?.completedTasks} icon={CheckCircle2} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Task breakdown */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Task Breakdown</h2>
            </div>
            {summaryLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: "To Do", value: summary?.openTasks ?? 0, color: "bg-muted-foreground" },
                  { label: "In Progress", value: summary?.inProgressTasks ?? 0, color: "bg-primary" },
                  { label: "Done", value: summary?.completedTasks ?? 0, color: "bg-green-500" },
                ].map(item => {
                  const total = (summary?.openTasks ?? 0) + (summary?.inProgressTasks ?? 0) + (summary?.completedTasks ?? 0);
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-medium">{item.value} <span className="text-muted-foreground">({pct}%)</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Recent Activity</h2>
            </div>
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : activity && activity.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {activity.slice(0, 10).map(item => (
                  <div key={item.id} data-testid={`activity-item-${item.id}`} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${typeColor[item.type] ?? "bg-muted"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.entityName}</p>
                      <p className="text-xs text-muted-foreground">{typeLabel[item.type] ?? item.type}</p>
                    </div>
                    <p className="text-xs text-muted-foreground ml-auto shrink-0">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
