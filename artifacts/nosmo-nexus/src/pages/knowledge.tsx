import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { BookOpen, Search, FileText, StickyNote, Filter } from "lucide-react";
import { DOCUMENTS, NOTES, getPerson, getProject } from "@/demo/data";
import { formatDistanceToNow } from "date-fns";

export default function Knowledge() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "documents" | "notes">("all");
  
  const filteredDocs = filter === "notes" ? [] : DOCUMENTS.filter(d => 
    d.title.toLowerCase().includes(search.toLowerCase()) || 
    d.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );
  
  const filteredNotes = filter === "documents" ? [] : NOTES.filter(n => 
    n.title.toLowerCase().includes(search.toLowerCase()) || 
    n.snippet.toLowerCase().includes(search.toLowerCase()) ||
    n.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" /> Knowledge Library
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Unified search across documents, plans, and notes.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-secondary rounded-lg p-1">
            <button 
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >All</button>
            <button 
              onClick={() => setFilter("documents")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === "documents" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >Documents</button>
            <button 
              onClick={() => setFilter("notes")}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === "notes" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >Notes</button>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search knowledge..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-full"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Documents */}
        {filteredDocs.map((doc, i) => {
          const person = getPerson(doc.ownerPersonId);
          const project = doc.projectId ? getProject(doc.projectId) : null;
          return (
            <motion.div 
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.03)] transition-all group flex flex-col cursor-pointer"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors truncate">{doc.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{doc.kind} • {doc.sizeLabel}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1.5 mb-4">
                {doc.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md border border-border">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-auto pt-4 border-t border-border space-y-2 text-xs">
                {project && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Project</span>
                    <Link href={`/projects/${project.id}`}><span className="hover:text-primary transition-colors cursor-pointer font-medium truncate max-w-[150px] block">{project.name}</span></Link>
                  </div>
                )}
                {person && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Owner</span>
                    <Link href={`/people/${person.id}`}><span className="hover:text-primary transition-colors cursor-pointer">{person.name}</span></Link>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-muted-foreground">
                  <span>Updated</span>
                  <span>{formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}</span>
                </div>
              </div>
            </motion.div>
          )
        })}

        {/* Notes */}
        {filteredNotes.map((note, i) => {
          const person = note.personId ? getPerson(note.personId) : null;
          const project = note.projectId ? getProject(note.projectId) : null;
          return (
            <motion.div 
              key={note.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (filteredDocs.length + i) * 0.05 }}
              className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(0,255,255,0.03)] transition-all group flex flex-col cursor-pointer bg-gradient-to-br from-card to-secondary/20"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center shrink-0">
                  <StickyNote className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2">{note.title}</h3>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1 italic border-l-2 border-border pl-3">"{note.snippet}"</p>
              
              <div className="flex flex-wrap gap-1.5 mb-4">
                {note.tags.map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md border border-border">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-auto pt-4 border-t border-border space-y-2 text-xs">
                {project && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Project</span>
                    <Link href={`/projects/${project.id}`}><span className="hover:text-primary transition-colors cursor-pointer font-medium truncate max-w-[150px] block">{project.name}</span></Link>
                  </div>
                )}
                {person && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Contact</span>
                    <Link href={`/people/${person.id}`}><span className="hover:text-primary transition-colors cursor-pointer">{person.name}</span></Link>
                  </div>
                )}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-muted-foreground">
                  <span>Updated</span>
                  <span>{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {filteredDocs.length === 0 && filteredNotes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No knowledge items found matching your search.</p>
        </div>
      )}
    </div>
  );
}
