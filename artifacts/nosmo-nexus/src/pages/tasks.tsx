import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { CheckSquare, Search, Plus, Calendar, Clock } from "lucide-react";
import { TASKS, getPerson, getProject, TaskStatus } from "@/demo/data";
import { formatDistanceToNow, format } from "date-fns";

const columns: { id: TaskStatus; label: string }[] = [
  { id: "To Do", label: "To Do" },
  { id: "In Progress", label: "In Progress" },
  { id: "Done", label: "Done" },
];

const priorityColor: Record<string, string> = {
  High: "text-red-400 bg-red-500/10 border-red-500/20",
  Medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  Low: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

export default function Tasks() {
  const [search, setSearch] = useState("");

  const filteredTasks = TASKS.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-primary" /> Tasks
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Unified task board across all projects.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-full sm:w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-[600px]">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="flex flex-col h-full bg-secondary/20 rounded-xl border border-border">
              <div className="px-4 py-3 border-b border-border bg-card/50 flex items-center justify-between rounded-t-xl shrink-0">
                <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{col.label}</h3>
                <span className="text-xs px-2 py-0.5 bg-secondary text-foreground font-medium rounded-full border border-border">{colTasks.length}</span>
              </div>
              
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {colTasks.map((task) => {
                  const person = getPerson(task.assigneePersonId);
                  const project = task.projectId ? getProject(task.projectId) : null;
                  const isLate = new Date(task.dueDate) < new Date() && task.status !== "Done";
                  
                  return (
                    <motion.div 
                      key={task.id}
                      layoutId={task.id}
                      className="bg-card border border-border rounded-lg p-3.5 shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-medium ${priorityColor[task.priority]}`}>
                          {task.priority}
                        </span>
                        {person && (
                          <div className="w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-[9px] font-bold shrink-0" title={person.name}>
                            {person.name.split(" ").map(n => n[0]).join("")}
                          </div>
                        )}
                      </div>
                      
                      <p className={`text-sm font-medium leading-snug mb-3 group-hover:text-primary transition-colors ${task.status === "Done" ? "text-muted-foreground line-through" : ""}`}>
                        {task.title}
                      </p>
                      
                      <div className="space-y-2 mt-auto">
                        {project && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded w-fit">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                            <span className="truncate max-w-[180px]">{project.name}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-2 mt-2">
                          <div className={`flex items-center gap-1 ${isLate ? "text-destructive font-medium" : ""}`}>
                            <Clock className="w-3.5 h-3.5" />
                            {isLate ? "Overdue" : format(new Date(task.dueDate), "MMM d")}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
