import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { 
  ArrowLeft, FolderKanban, MapPin, Calendar, CheckSquare, 
  FileText, Clock, Users, StickyNote 
} from "lucide-react";
import { 
  getProject,
  getProjectPeople,
  getProjectTasks,
  getProjectDocuments,
  getProjectNotes,
  getProjectTimeline
} from "@/demo/data";
import { format, formatDistanceToNow } from "date-fns";

const statusColor: Record<string, string> = {
  "Active": "bg-green-500/10 text-green-400 border-green-500/20",
  "Planning": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "On Hold": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "Completed": "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const project = getProject(id || "");

  if (!project) {
    return <div className="p-8 text-center text-muted-foreground">Project not found</div>;
  }

  const people = getProjectPeople(project.id);
  const tasks = getProjectTasks(project.id);
  const documents = getProjectDocuments(project.id);
  const notes = getProjectNotes(project.id);
  const timeline = getProjectTimeline(project.id);

  const completedTasks = tasks.filter(t => t.status === "Done").length;
  const taskProgress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>

      {/* Header Section */}
      <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <FolderKanban className="w-64 h-64 text-primary transform rotate-12" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.name}</h1>
              </div>
              <p className="text-lg text-muted-foreground mb-4">{project.client}</p>
              <p className="text-sm text-foreground max-w-3xl">{project.description}</p>
            </div>
            
            <div className="flex flex-col items-end gap-3 shrink-0">
              <span className={`text-sm px-3 py-1 rounded-full font-medium border ${statusColor[project.status]}`}>
                {project.status}
              </span>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Overall Progress</p>
                <p className="text-3xl font-bold tabular-nums text-primary">{project.progress}%</p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-border">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Start Date</p>
              <p className="text-sm font-medium text-foreground">{format(new Date(project.startDate), "MMM d, yyyy")}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Due Date</p>
              <p className="text-sm font-medium text-foreground">{format(new Date(project.dueDate), "MMM d, yyyy")}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Location</p>
              <p className="text-sm font-medium text-foreground">{project.location}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Team Size</p>
              <p className="text-sm font-medium text-foreground">{people.length} members</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: People & Timeline */}
        <div className="lg:col-span-4 space-y-6">
          {/* Team */}
          <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col max-h-[400px]">
            <div className="px-5 py-4 border-b border-border bg-secondary/30 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Project Team
              </h3>
            </div>
            <div className="divide-y divide-border overflow-y-auto">
              {people.map(person => (
                <Link key={person.id} href={`/people/${person.id}`}>
                  <div className="flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors group cursor-pointer">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20 group-hover:border-primary/50 transition-colors">
                      {person.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{person.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{person.title}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col max-h-[500px]">
            <div className="px-5 py-4 border-b border-border bg-secondary/30 flex items-center justify-between shrink-0">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Recent Activity
              </h3>
            </div>
            <div className="p-5 overflow-y-auto">
              <div className="relative pl-6 border-l-2 border-border space-y-6">
                {timeline.slice(0, 6).map(event => (
                  <div key={event.id} className="relative">
                    <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-card" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{event.summary}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tasks, Docs, Notes */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Tasks Overview */}
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-primary" /> Task Completion
              </h3>
              <Link href="/tasks" className="text-xs text-primary hover:underline">View Task Board</Link>
            </div>
            
            <div className="flex items-end justify-between mb-2">
              <p className="text-2xl font-bold">{completedTasks} <span className="text-sm font-medium text-muted-foreground">/ {tasks.length} done</span></p>
              <p className="text-sm font-semibold">{taskProgress}%</p>
            </div>
            <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden mb-6">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${taskProgress}%` }} />
            </div>

            <div className="space-y-3">
              {tasks.slice(0, 4).map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-background hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${task.status === "Done" ? "bg-green-500 border-green-500" : "border-muted-foreground"}`}>
                      {task.status === "Done" && <CheckSquare className="w-3 h-3 text-white" />}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${task.status === "Done" ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Due {format(new Date(task.dueDate), "MMM d")}</p>
                    </div>
                  </div>
                  {task.status !== "Done" && (
                    <span className="text-xs px-2 py-1 bg-secondary text-muted-foreground rounded-md">{task.status}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Documents */}
            <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col max-h-[400px]">
              <div className="px-5 py-4 border-b border-border bg-secondary/30 flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Documents
                </h3>
              </div>
              <div className="divide-y divide-border overflow-y-auto">
                {documents.map(doc => (
                  <div key={doc.id} className="p-4 hover:bg-secondary/50 transition-colors flex items-center gap-3 cursor-pointer group">
                    <div className="w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{doc.title}</p>
                      <p className="text-xs text-muted-foreground flex gap-2 mt-0.5">
                        <span>{doc.kind}</span>
                        <span>•</span>
                        <span>{doc.sizeLabel}</span>
                      </p>
                    </div>
                  </div>
                ))}
                {documents.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">No documents linked.</div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col max-h-[400px]">
              <div className="px-5 py-4 border-b border-border bg-secondary/30 flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-primary" /> Notes
                </h3>
              </div>
              <div className="divide-y divide-border overflow-y-auto">
                {notes.map(note => (
                  <div key={note.id} className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer group">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">{note.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.snippet}</p>
                    <p className="text-[10px] text-muted-foreground mt-2">{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</p>
                  </div>
                ))}
                {notes.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">No notes found.</div>
                )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
