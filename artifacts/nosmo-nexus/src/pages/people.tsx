import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  FolderKanban,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import { PEOPLE, PersonStatus, getPersonProjects, getPersonTasks } from "@/demo/data";
import { FocusableEntity } from "@/focus/focusable-entity";
import { cn } from "@/lib/utils";
import {
  useAvailability,
  REPORTABLE,
  STATUS_META,
  type Availability,
  type ReportedStatus,
} from "@/availability/availability-context";

const statusColor: Record<PersonStatus, string> = {
  Active: "bg-green-500/10 text-green-400 border-green-500/20",
  Lead: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Partner: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Vendor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  Client: "bg-primary/10 text-primary border-primary/20",
};

const projectStatusDot: Record<string, string> = {
  Active: "bg-green-400",
  Planning: "bg-purple-400",
  "On Hold": "bg-yellow-400",
  Completed: "bg-blue-400",
};

const activeBtn: Record<ReportedStatus, string> = {
  available: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40",
  busy: "bg-amber-500/15 text-amber-300 border-amber-500/40",
  unavailable: "bg-rose-500/15 text-rose-300 border-rose-500/40",
};
const idleBtn =
  "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/40";

/** Open (not Done) tasks that are at risk because their assignee is out of contact. */
function atRiskTaskCount(personId: string, effective: Availability) {
  if (effective !== "unavailable" && effective !== "unknown") return 0;
  return getPersonTasks(personId).filter((t) => t.status !== "Done").length;
}

export default function People() {
  const [search, setSearch] = useState("");
  const { managerMode, setManagerMode, getRecord, getEffective, setStatus } = useAvailability();

  const filteredPeople = PEOPLE.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.company.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  // Live roll-up across everyone (not just the filtered view) so the header
  // reflects the whole team's real state.
  const counts: Record<Availability, number> = { available: 0, busy: 0, unavailable: 0, unknown: 0 };
  let tasksAtRisk = 0;
  let peopleAtRisk = 0;
  for (const p of PEOPLE) {
    const eff = getEffective(p.id);
    counts[eff]++;
    const risk = atRiskTaskCount(p.id, eff);
    if (risk > 0) {
      tasksAtRisk += risk;
      peopleAtRisk++;
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" /> People
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Each person reports their own availability. Status auto-switches to{" "}
            <span className="text-slate-300">Unknown</span> after 12h with no activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setManagerMode(!managerMode)}
            aria-pressed={managerMode}
            data-testid="toggle-manager-mode"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
              managerMode
                ? "bg-primary/15 text-primary border-primary/40"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            )}
          >
            <ShieldCheck className="w-4 h-4" /> Manager {managerMode ? "on" : "off"}
          </button>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search people..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-card border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all w-full sm:w-56"
            />
          </div>
          <Link
            href="/card-maker"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            data-testid="link-new-card"
          >
            <Plus className="w-4 h-4" /> New Card
          </Link>
        </div>
      </div>

      {/* Live availability roll-up + risk reaction */}
      <div className="flex flex-wrap items-center gap-2">
        {(Object.keys(STATUS_META) as Availability[]).map((s) => {
          const meta = STATUS_META[s];
          return (
            <span
              key={s}
              data-testid={`count-${s}`}
              className={cn(
                "inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-medium",
                meta.badge
              )}
            >
              <meta.Icon className="w-3.5 h-3.5" />
              {counts[s]} {meta.label}
            </span>
          );
        })}
        {tasksAtRisk > 0 && (
          <span
            data-testid="banner-tasks-at-risk"
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border font-medium bg-rose-500/10 text-rose-300 border-rose-500/30"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {tasksAtRisk} task{tasksAtRisk === 1 ? "" : "s"} at risk · {peopleAtRisk} out of contact
          </span>
        )}
      </div>

      {managerMode && (
        <div className="flex items-center gap-2 text-xs text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
          <ShieldCheck className="w-3.5 h-3.5" />
          Manager override active — statuses you change are recorded as manager-set.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPeople.map((person, i) => {
          const projects = getPersonProjects(person.id);
          const record = getRecord(person.id);
          const effective = getEffective(person.id);
          const meta = STATUS_META[effective];
          const risk = atRiskTaskCount(person.id, effective);
          return (
            <motion.div
              key={person.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <FocusableEntity
                target={{ type: "person", id: person.id }}
                ariaLabel={`Open ${person.name}`}
                testId={`card-person-${person.id}`}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/50 hover:shadow-[0_0_15px_rgba(0,255,255,0.05)] transition-all group h-full flex flex-col focus:ring-2 focus:ring-primary/50"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 group-hover:border-primary/50 transition-colors">
                        {person.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <span
                        title={meta.label}
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card",
                          meta.dot
                        )}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold group-hover:text-primary transition-colors">
                        {person.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {person.title} at {person.company}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${statusColor[person.status]}`}
                  >
                    {person.status}
                  </span>
                </div>

                {/* Self-reported availability */}
                <div
                  className="mb-4 rounded-lg border border-border bg-secondary/40 p-3"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      data-testid={`status-badge-${person.id}`}
                      className={cn(
                        "inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md font-medium border",
                        meta.badge
                      )}
                    >
                      <meta.Icon className="w-3.5 h-3.5" />
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground text-right">
                      {record ? formatDistanceToNow(record.updatedAt, { addSuffix: true }) : "no report"}
                      {record?.setBy === "manager" && (
                        <span className="ml-1 text-primary">· manager</span>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mt-2">
                    {REPORTABLE.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatus(person.id, s);
                        }}
                        aria-pressed={effective === s}
                        data-testid={`set-${s}-${person.id}`}
                        className={cn(
                          "text-[11px] px-2 py-1.5 rounded-md border font-medium transition-colors text-center",
                          effective === s ? activeBtn[s] : idleBtn
                        )}
                      >
                        {STATUS_META[s].label}
                      </button>
                    ))}
                  </div>

                  {risk > 0 && (
                    <div
                      data-testid={`risk-${person.id}`}
                      className="flex items-center gap-1.5 mt-2 text-[11px] text-rose-300"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {risk} open task{risk === 1 ? "" : "s"} at risk while out of contact
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
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

                {projects.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-2 flex items-center gap-1">
                      <FolderKanban className="w-3 h-3" /> On {projects.length} project
                      {projects.length === 1 ? "" : "s"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {projects.map((pr) => (
                        <FocusableEntity
                          key={pr.id}
                          target={{ type: "project", id: pr.id }}
                          ariaLabel={`Open ${pr.name}`}
                          testId={`chip-project-${pr.id}`}
                          className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-md bg-secondary/70 border border-border hover:border-primary/40 hover:text-primary transition-colors max-w-full"
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${projectStatusDot[pr.status]}`}
                          />
                          <span className="truncate max-w-[140px]">{pr.name}</span>
                        </FocusableEntity>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-border">
                  {person.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2 py-0.5 bg-secondary text-secondary-foreground rounded-md border border-border"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </FocusableEntity>
            </motion.div>
          );
        })}
      </div>

      {filteredPeople.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No people found matching your search.</p>
        </div>
      )}
    </div>
  );
}
