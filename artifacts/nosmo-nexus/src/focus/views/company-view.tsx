import { Building2, User, FolderKanban } from "lucide-react";
import { getCompanyPeople, getCompanyProjects } from "@/demo/data";
import { FocusableEntity } from "../focusable-entity";

export function CompanyView({ company }: { company: string }) {
  const people = getCompanyPeople(company);
  const projects = getCompanyProjects(company);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-foreground truncate">{company}</h1>
          <p className="text-sm text-muted-foreground">{people.length} people · {projects.length} projects</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-secondary/30">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> People
            </h3>
          </div>
          <div className="divide-y divide-border">
            {people.map((person) => (
              <FocusableEntity
                key={person.id}
                target={{ type: "person", id: person.id }}
                ariaLabel={`Open person ${person.name}`}
                className="flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                  {person.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{person.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{person.title}</p>
                </div>
              </FocusableEntity>
            ))}
            {people.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No people on record.</div>
            )}
          </div>
        </section>

        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-secondary/30">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-primary" /> Projects
            </h3>
          </div>
          <div className="divide-y divide-border">
            {projects.map((project) => (
              <FocusableEntity
                key={project.id}
                target={{ type: "project", id: project.id }}
                ariaLabel={`Open project ${project.name}`}
                className="p-4 hover:bg-secondary/50 transition-colors group"
              >
                <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">{project.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{project.status} · {project.progress}%</p>
              </FocusableEntity>
            ))}
            {projects.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">No projects on record.</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
