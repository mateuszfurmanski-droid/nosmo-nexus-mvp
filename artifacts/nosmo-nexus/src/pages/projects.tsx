import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { FolderKanban, Plus, Search, MapPin } from "lucide-react";
import { PROJECTS, getProjectPeople } from "@/demo/data";

const statusColor: Record<string, string> = {
  "Active": "bg-green-500/10 text-green-400 border-green-500/20",
  "Planning": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "On Hold": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "Completed": "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function Projects() {
  const [search, setSearch] = useState("");
  
  const filteredProjects = PROJECTS.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.client.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-primary" /> Projects
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage initiatives, timelines, and connected resources.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search projects..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-full sm:w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProjects.map((project, i) => {
          const people = getProjectPeople(project.id);
          return (
            <motion.div 
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={`/projects/${project.id}`}>
                <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,255,255,0.05)] transition-all group h-full flex flex-col cursor-pointer">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 pr-4">
                      <h3 className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-1">{project.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{project.client}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border shrink-0 ${statusColor[project.status]}`}>
                      {project.status}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">{project.description}</p>
                  
                  <div className="space-y-4 mt-auto">
                    <div>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground font-medium">Progress</span>
                        <span className="text-foreground font-semibold tabular-nums">{project.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${project.progress}%` }} />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-border">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" /> {project.location}
                      </div>
                      <div className="flex -space-x-2">
                        {people.slice(0, 4).map((p, idx) => (
                          <div 
                            key={p.id} 
                            className="w-7 h-7 rounded-full bg-secondary border-2 border-card flex items-center justify-center text-[10px] font-bold z-10 text-foreground" 
                            style={{ zIndex: 4 - idx }}
                            title={p.name}
                          >
                            {p.name.split(" ").map(n => n[0]).join("")}
                          </div>
                        ))}
                        {people.length > 4 && (
                          <div className="w-7 h-7 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[10px] font-bold z-0 text-muted-foreground">
                            +{people.length - 4}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          )
        })}
      </div>
      
      {filteredProjects.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No projects found matching your search.</p>
        </div>
      )}
    </div>
  );
}
