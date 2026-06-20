import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Users, Search, Plus, Phone, Mail, MapPin } from "lucide-react";
import { PEOPLE, PersonStatus } from "@/demo/data";

const statusColor: Record<PersonStatus, string> = {
  Active: "bg-green-500/10 text-green-400 border-green-500/20",
  Lead: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Partner: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Vendor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Client: "bg-primary/10 text-primary border-primary/20",
};

export default function People() {
  const [search, setSearch] = useState("");
  
  const filteredPeople = PEOPLE.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.company.toLowerCase().includes(search.toLowerCase()) ||
    p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> People
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage contacts, clients, and partners across the workspace.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search people..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-full sm:w-64"
            />
          </div>
          <Link href="/card-maker" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors" data-testid="link-new-card">
            <Plus className="w-4 h-4" /> New Card
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPeople.map((person, i) => (
          <motion.div 
            key={person.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link href={`/people/${person.id}`}>
              <div className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,255,255,0.05)] transition-all group h-full flex flex-col cursor-pointer">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 group-hover:border-primary/50 transition-colors">
                      {person.name.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">{person.name}</h3>
                      <p className="text-xs text-muted-foreground">{person.title} at {person.company}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${statusColor[person.status]}`}>
                    {person.status}
                  </span>
                </div>
                
                <div className="space-y-2 mt-auto text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{person.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{person.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{person.location}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border">
                  {person.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md border border-border">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
      
      {filteredPeople.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No people found matching your search.</p>
        </div>
      )}
    </div>
  );
}
