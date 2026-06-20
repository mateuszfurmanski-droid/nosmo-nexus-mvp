import { Link, useParams } from "wouter";
import { motion } from "framer-motion";
import { 
  ArrowLeft, Mail, Phone, MapPin, Briefcase, 
  FolderKanban, FileText, CheckSquare, Clock, StickyNote 
} from "lucide-react";
import { 
  getPerson, 
  getPersonProjects, 
  getPersonDocuments, 
  getPersonNotes, 
  getPersonTasks, 
  getPersonTimeline,
  PersonStatus
} from "@/demo/data";
import { formatDistanceToNow } from "date-fns";

const statusColor: Record<PersonStatus, string> = {
  Active: "bg-green-500/10 text-green-400 border-green-500/20",
  Lead: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Partner: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Vendor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Client: "bg-primary/10 text-primary border-primary/20",
};

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>();
  const person = getPerson(id || "");

  if (!person) {
    return <div className="p-8 text-center text-muted-foreground">Person not found</div>;
  }

  const projects = getPersonProjects(person.id);
  const documents = getPersonDocuments(person.id);
  const notes = getPersonNotes(person.id);
  const tasks = getPersonTasks(person.id);
  const timeline = getPersonTimeline(person.id);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <Link href="/people" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
        <ArrowLeft className="w-4 h-4" /> Back to People
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Profile Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-br from-primary/20 to-transparent border-b border-border/50" />
            <div className="relative pt-8">
              <div className="w-20 h-20 rounded-full bg-background border-4 border-card flex items-center justify-center font-bold text-2xl text-primary shadow-xl mx-auto mb-4 relative z-10 ring-1 ring-border">
                {person.name.split(" ").map(n => n[0]).join("")}
              </div>
              <div className="text-center space-y-1">
                <h1 className="text-xl font-bold tracking-tight text-foreground">{person.name}</h1>
                <p className="text-sm text-muted-foreground">{person.title}</p>
                <div className="flex items-center justify-center gap-1.5 text-sm text-foreground font-medium pt-1">
                  <Briefcase className="w-4 h-4 text-primary" /> {person.company}
                </div>
              </div>
              
              <div className="flex justify-center mt-4">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${statusColor[person.status]}`}>
                  {person.status}
                </span>
              </div>

              <div className="space-y-4 mt-8 pt-6 border-t border-border">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-foreground">{person.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-foreground">{person.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-foreground">{person.location}</span>
                </div>
              </div>
              
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {person.tags.map(tag => (
                    <span key={tag} className="text-xs px-2.5 py-1 bg-secondary text-secondary-foreground rounded-md border border-border">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Linked Tasks snippet */}
          {tasks.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckSquare className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Assigned Tasks</h3>
              </div>
              <div className="space-y-3">
                {tasks.slice(0, 3).map(task => (
                  <div key={task.id} className="flex items-start gap-2 text-sm group">
                    <div className={`mt-0.5 w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 ${task.status === "Done" ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                      {task.status === "Done" && <CheckSquare className="w-2.5 h-2.5 text-primary-foreground" />}
                    </div>
                    <div>
                      <p className="text-foreground group-hover:text-primary transition-colors cursor-pointer">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Due {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Context Tabs/Lists */}
        <div className="lg:col-span-8 space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Projects</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">{documents.length}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mt-0.5">Documents</p>
              </div>
            </div>
          </div>

          {/* Projects */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-primary" /> Involved Projects
              </h3>
            </div>
            <div className="divide-y divide-border">
              {projects.length > 0 ? projects.map(proj => (
                <Link key={proj.id} href={`/projects/${proj.id}`}>
                  <div className="p-4 hover:bg-secondary/50 transition-colors flex items-center justify-between cursor-pointer group">
                    <div>
                      <p className="font-medium text-sm group-hover:text-primary transition-colors">{proj.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{proj.client}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-secondary rounded-md text-muted-foreground">{proj.status}</span>
                  </div>
                </Link>
              )) : (
                <div className="p-8 text-center text-sm text-muted-foreground">No projects linked.</div>
              )}
            </div>
          </div>
          
          {/* Notes & Documents Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-primary" /> Notes
                </h3>
              </div>
              <div className="divide-y divide-border flex-1 overflow-y-auto max-h-80">
                {notes.length > 0 ? notes.map(note => (
                  <div key={note.id} className="p-4 hover:bg-secondary/50 transition-colors cursor-pointer group">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">{note.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{note.snippet}</p>
                  </div>
                )) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">No notes found.</div>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" /> Documents
                </h3>
              </div>
              <div className="divide-y divide-border flex-1 overflow-y-auto max-h-80">
                {documents.length > 0 ? documents.map(doc => (
                  <div key={doc.id} className="p-4 hover:bg-secondary/50 transition-colors flex items-center gap-3 cursor-pointer group">
                    <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-muted-foreground" />
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
                )) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">No documents found.</div>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-secondary/30 flex items-center justify-between">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Timeline
              </h3>
            </div>
            <div className="p-6">
              <div className="relative pl-6 border-l-2 border-border space-y-8">
                {timeline.length > 0 ? timeline.map(event => (
                  <div key={event.id} className="relative">
                    <div className="absolute -left-[29px] top-1 w-3 h-3 rounded-full bg-primary ring-4 ring-card" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{event.summary}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })} by {event.actor}
                      </p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No activity history.</p>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
