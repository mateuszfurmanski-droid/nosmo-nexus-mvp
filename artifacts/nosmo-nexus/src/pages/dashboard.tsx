import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { motion } from "framer-motion";
import { Users, FolderKanban, Clock, ArrowRight, Sparkles, Send, CheckSquare } from "lucide-react";
import { 
  PEOPLE, 
  PROJECTS, 
  TASKS, 
  TIMELINE,
  getPerson
} from "@/demo/data";
import { FocusableEntity } from "@/focus/focusable-entity";
import type { FocusTarget } from "@/focus/focus-types";
import { useShell } from "@/components/layout";

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function Dashboard() {
  const { openAskNexus } = useShell();
  const activeProjects = PROJECTS.filter(p => p.status === "Active").slice(0, 4);
  const leadProject = activeProjects[0];
  const activePeople = PEOPLE.filter(p => p.status === "Active" || p.status === "Lead" || p.status === "Partner").slice(0, 5);
  const dueSoonTasks = TASKS.filter(t => t.status !== "Done").sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()).slice(0, 5);
  const recentTimeline = TIMELINE.slice(0, 6);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Ask Nexus Quick Prompt */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Sparkles className="w-32 h-32 text-primary" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Good morning, Mateusz.
            </h1>
            <p className="text-muted-foreground">
              You have {dueSoonTasks.length} tasks due soon.
              {leadProject ? ` ${leadProject.name} is at ${leadProject.progress}% progress.` : ""}
            </p>
          </div>
          <div className="w-full md:w-[400px]">
            <div className="relative group">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative flex items-center bg-card border border-border rounded-full p-1.5 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                <input 
                  type="text" 
                  readOnly
                  onClick={openAskNexus}
                  onFocus={openAskNexus}
                  placeholder="Ask Nexus to summarize, find, or analyze..." 
                  data-testid="input-dashboard-ask"
                  className="w-full bg-transparent border-none focus:outline-none px-4 text-sm cursor-pointer"
                />
                <button onClick={openAskNexus} aria-label="Open Ask Nexus" data-testid="button-dashboard-ask" className="bg-primary text-primary-foreground p-2 rounded-full hover:bg-primary/90 transition-colors shrink-0">
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left Column */}
        <div className="md:col-span-8 space-y-8">
          
          {/* Active Projects */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-primary" />
                Active Projects
              </h2>
              <Link href="/projects" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeProjects.map((project, i) => (
                <motion.div 
                  key={project.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: i * 0.1 }}
                  className="h-full"
                >
                  <FocusableEntity target={{ type: "project", id: project.id }} ariaLabel={`Open ${project.name}`} className="block h-full">
                    <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,255,255,0.05)] transition-all group h-full flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-1" title={project.name}>{project.name}</h3>
                        <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-md font-medium shrink-0">{project.progress}%</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">{project.description}</p>
                      <div className="flex items-center justify-between text-xs mt-auto pt-4 border-t border-border">
                        <span className="text-muted-foreground truncate mr-2">{project.client}</span>
                        <div className="flex -space-x-2 shrink-0">
                          {project.peopleIds.slice(0, 3).map((pid, idx) => {
                            const p = getPerson(pid);
                            return p ? (
                              <div key={pid} className="w-6 h-6 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] font-bold z-10" style={{ zIndex: 3 - idx }}>
                                {p.name.split(" ").map(n => n[0]).join("")}
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                  </FocusableEntity>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Active People */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Active Contacts
              </h2>
              <Link href="/people" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                View directory <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="divide-y divide-border">
                {activePeople.map((person, i) => (
                  <motion.div 
                    key={person.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.2 + (i * 0.05) }}
                  >
                    <FocusableEntity target={{ type: "person", id: person.id }} ariaLabel={`Open ${person.name}`}>
                      <div className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors group">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20 group-hover:border-primary/50 transition-colors">
                          {person.name.split(" ").map(n => n[0]).join("")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">{person.name}</h3>
                          <p className="text-xs text-muted-foreground truncate">{person.title} at {person.company}</p>
                        </div>
                        <div className="hidden sm:block shrink-0">
                          <span className="text-xs px-2 py-1 bg-secondary rounded-md text-muted-foreground border border-border group-hover:border-primary/30 transition-colors">{person.status}</span>
                        </div>
                      </div>
                    </FocusableEntity>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

        </div>

        {/* Right Column */}
        <div className="md:col-span-4 space-y-8">
          
          {/* Due Soon */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-primary" />
                Due Soon
              </h2>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 space-y-4">
              {dueSoonTasks.map((task, i) => {
                const assignee = getPerson(task.assigneePersonId);
                const isLate = new Date(task.dueDate) < new Date();
                return (
                  <motion.div 
                    key={task.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.3 + (i * 0.1) }}
                  >
                    <FocusableEntity
                      target={{ type: "task", id: task.id }}
                      ariaLabel={`Open ${task.title}`}
                      className="flex items-start gap-3 group rounded-md -mx-1.5 px-1.5 py-1 hover:bg-secondary/40 transition-colors"
                    >
                      <div className="mt-0.5 shrink-0">
                        <div className={`w-4 h-4 rounded-sm border flex items-center justify-center ${task.status === "Done" ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/50"}`}>
                          {task.status === "Done" && <CheckSquare className="w-3 h-3" />}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">{task.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className={isLate ? "text-destructive" : ""}>
                            {isLate ? "Overdue" : "Due"} {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}
                          </span>
                          {assignee && (
                            <>
                              <span>•</span>
                              <span className="truncate">{assignee.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </FocusableEntity>
                  </motion.div>
                )
              })}
            </div>
          </section>

          {/* Recent Timeline */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Activity
              </h2>
            </div>
            <div className="relative pl-4 border-l-2 border-border/50 ml-2 space-y-6">
              {recentTimeline.map((event, i) => {
                const target: FocusTarget | null = event.projectId
                  ? { type: "project", id: event.projectId }
                  : event.personId
                    ? { type: "person", id: event.personId }
                    : null;
                const body = (
                  <>
                    <p className="text-foreground text-sm">{event.summary}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })} by {event.actor}
                    </p>
                  </>
                );
                return (
                  <motion.div 
                    key={event.id}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.5 + (i * 0.1) }}
                    className="relative"
                  >
                    <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-primary/50 ring-4 ring-background" />
                    {target ? (
                      <FocusableEntity
                        target={target}
                        ariaLabel={`Open related ${target.type}`}
                        className="block bg-card border border-border p-3 rounded-lg text-sm group hover:border-primary/40 transition-colors"
                      >
                        {body}
                      </FocusableEntity>
                    ) : (
                      <div className="bg-card border border-border p-3 rounded-lg text-sm group hover:border-primary/30 transition-colors">
                        {body}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
