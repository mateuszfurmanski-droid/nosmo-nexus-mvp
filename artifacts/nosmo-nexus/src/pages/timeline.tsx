import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Clock, Filter, User, FolderKanban, FileText, CheckSquare, Phone, StickyNote } from "lucide-react";
import { TIMELINE, getPerson, getProject, TimelineEventType } from "@/demo/data";
import { formatDistanceToNow, format } from "date-fns";

const iconMap: Record<TimelineEventType, React.ElementType> = {
  person: User,
  project: FolderKanban,
  document: FileText,
  task: CheckSquare,
  meeting: User,
  call: Phone,
  note: StickyNote
};

const colorMap: Record<TimelineEventType, string> = {
  person: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  project: "bg-primary/10 text-primary border-primary/20",
  document: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  task: "bg-green-500/10 text-green-500 border-green-500/20",
  meeting: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  call: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  note: "bg-pink-500/10 text-pink-500 border-pink-500/20"
};

export default function Timeline() {
  const [filter, setFilter] = useState<TimelineEventType | "all">("all");
  
  // Sort descending (newest first)
  const sortedTimeline = [...TIMELINE].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  const filteredTimeline = filter === "all" ? sortedTimeline : sortedTimeline.filter(t => t.type === filter);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" /> Global Timeline
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Chronological stream of all workspace activity.</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select 
            className="bg-card border border-border rounded-lg text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
            value={filter}
            onChange={(e) => setFilter(e.target.value as TimelineEventType | "all")}
          >
            <option value="all">All Activity</option>
            <option value="project">Projects</option>
            <option value="task">Tasks</option>
            <option value="document">Documents</option>
            <option value="note">Notes</option>
            <option value="meeting">Meetings</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 sm:p-8">
        <div className="relative border-l-2 border-border/40 ml-4 space-y-10">
          {filteredTimeline.map((event, i) => {
            const Icon = iconMap[event.type];
            const person = event.personId ? getPerson(event.personId) : null;
            const project = event.projectId ? getProject(event.projectId) : null;
            
            const date = new Date(event.timestamp);
            
            return (
              <motion.div 
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative pl-8"
              >
                {/* Timeline Dot/Icon */}
                <div className={`absolute -left-[21px] top-0 w-10 h-10 rounded-full border ring-4 ring-card flex items-center justify-center shadow-sm ${colorMap[event.type]}`}>
                  <Icon className="w-4 h-4" />
                </div>
                
                <div className="bg-background border border-border rounded-lg p-4 hover:border-primary/30 transition-colors group shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors">
                      {event.summary}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap bg-secondary/50 px-2 py-1 rounded-md shrink-0">
                      <Clock className="w-3 h-3" />
                      {format(date, "MMM d, h:mm a")} ({formatDistanceToNow(date, { addSuffix: true })})
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm mt-3 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="font-medium text-foreground">{event.actor}</span>
                    </div>
                    
                    {person && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="px-1.5 py-0.5 rounded bg-secondary text-xs">Person</span>
                        <Link href={`/people/${person.id}`} className="hover:text-primary transition-colors cursor-pointer">{person.name}</Link>
                      </div>
                    )}
                    
                    {project && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="px-1.5 py-0.5 rounded bg-secondary text-xs">Project</span>
                        <Link href={`/projects/${project.id}`} className="hover:text-primary transition-colors cursor-pointer font-medium">{project.name}</Link>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  );
}
