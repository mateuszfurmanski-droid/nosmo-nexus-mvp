import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { FolderKanban, Plus, Search, MapPin, Zap, Pause, Compass, Archive } from "lucide-react";
import { PROJECTS, getProjectPeople, type Project, type ProjectStatus } from "@/demo/data";

const statusColor: Record<string, string> = {
  "Active": "bg-green-500/10 text-green-400 border-green-500/20",
  "Planning": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "On Hold": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  "Completed": "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

/**
 * Category hub config. Each entry is one status "bubble".
 * This list is intentionally a flat, ordered config so a radial / Sims-style
 * layout can later map each category to an angle around a centre point —
 * only the wrapper layout below needs to change, not the data or card rendering.
 */
const CATEGORIES: {
  key: ProjectStatus;
  label: string;
  icon: typeof Zap;
  dot: string;
  ring: string;
  glow: string;
}[] = [
  { key: "Active", label: "Active", icon: Zap, dot: "bg-green-400", ring: "ring-green-400/60", glow: "shadow-[0_0_24px_rgba(74,222,128,0.18)]" },
  { key: "On Hold", label: "On Hold", icon: Pause, dot: "bg-yellow-400", ring: "ring-yellow-400/60", glow: "shadow-[0_0_24px_rgba(250,204,21,0.18)]" },
  { key: "Planning", label: "Planning", icon: Compass, dot: "bg-purple-400", ring: "ring-purple-400/60", glow: "shadow-[0_0_24px_rgba(192,132,252,0.18)]" },
  { key: "Completed", label: "Archived / Completed", icon: Archive, dot: "bg-blue-400", ring: "ring-blue-400/60", glow: "shadow-[0_0_24px_rgba(96,165,250,0.18)]" },
];

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const people = getProjectPeople(project.id);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ delay: index * 0.05 }}
      data-testid={`card-project-${project.id}`}
    >
      <Link href={`/projects/${project.id}`}>
        <div className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,255,255,0.05)] transition-all group h-full flex flex-col cursor-pointer">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 pr-4">
              <h3 className="text-lg font-semibold group-hover:text-primary transition-colors line-clamp-2">{project.name}</h3>
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
  );
}

export default function Projects() {
  const queryString = useSearch();
  // Hub deep-links arrive as /projects?status=Active — open that group on mount.
  const statusParam = useMemo<ProjectStatus>(() => {
    const value = new URLSearchParams(queryString).get("status");
    return CATEGORIES.some(c => c.key === value) ? (value as ProjectStatus) : "Active";
  }, [queryString]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProjectStatus>(statusParam);

  useEffect(() => {
    setSelected(statusParam);
  }, [statusParam]);

  const filtered = useMemo(
    () =>
      PROJECTS.filter(
        p =>
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.client.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  const countFor = (status: ProjectStatus) => filtered.filter(p => p.status === status).length;

  // When searching, fall back to the first category that actually has matches so
  // results are never hidden behind an empty selected bubble.
  const effectiveSelected = useMemo<ProjectStatus>(() => {
    if (countFor(selected) > 0) return selected;
    if (search.trim()) {
      const firstWithMatches = CATEGORIES.find(c => countFor(c.key) > 0);
      if (firstWithMatches) return firstWithMatches.key;
    }
    return selected;
  }, [selected, filtered, search]);

  const visibleProjects = filtered.filter(p => p.status === effectiveSelected);
  const activeCategory = CATEGORIES.find(c => c.key === effectiveSelected)!;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-primary" /> Projects
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Tap a status bubble to expand its projects. Timelines and connected resources, grouped at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              aria-label="Search projects"
              data-testid="input-search-projects"
              className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-full sm:w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shrink-0">
            <Plus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      {/* Category hub — status "bubbles". Grid now; structured for a radial layout later. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {CATEGORIES.map((cat, i) => {
          const count = countFor(cat.key);
          const isSelected = cat.key === effectiveSelected;
          const Icon = cat.icon;
          return (
            <motion.button
              key={cat.key}
              type="button"
              onClick={() => setSelected(cat.key)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              data-testid={`bubble-status-${cat.key}`}
              aria-pressed={isSelected}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 sm:p-5 text-center transition-colors ${
                isSelected
                  ? `bg-card border-primary/40 ring-2 ${cat.ring} ${cat.glow}`
                  : "bg-card/60 border-border hover:border-primary/30 hover:bg-card"
              }`}
            >
              <div className={`relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full border ${isSelected ? "border-transparent" : "border-border"} bg-background/60`}>
                <span className={`absolute inset-0 rounded-full opacity-20 ${cat.dot}`} />
                <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-foreground relative z-10" />
                <span className={`absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full text-[11px] font-bold flex items-center justify-center border border-card text-background ${cat.dot}`}>
                  {count}
                </span>
              </div>
              <span className="text-xs sm:text-sm font-medium leading-tight">{cat.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Expanded group */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className={`w-2.5 h-2.5 rounded-full ${activeCategory.dot}`} />
          <h2 className="text-lg font-semibold">{activeCategory.label}</h2>
          <span className="text-sm text-muted-foreground">· {visibleProjects.length} project{visibleProjects.length === 1 ? "" : "s"}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={effectiveSelected + search}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
          >
            {visibleProjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visibleProjects.map((project, i) => (
                  <ProjectCard key={project.id} project={project} index={i} />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card/40 py-14 text-center">
                <activeCategory.icon className="w-8 h-8 mx-auto text-muted-foreground/60 mb-3" />
                <p className="text-sm text-muted-foreground">
                  {search.trim()
                    ? "No projects match your search in any group."
                    : `No ${activeCategory.label.toLowerCase()} projects right now.`}
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
