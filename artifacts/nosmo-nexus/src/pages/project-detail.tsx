import { useState } from "react";
import { Link, useParams } from "wouter";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircuitBoard,
  ClipboardCheck,
  Clock3,
  DoorOpen,
  FileSpreadsheet,
  FileText,
  MapPin,
  MessageSquare,
  Network,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";

const base = import.meta.env.BASE_URL;

type Tab = "overview" | "work" | "people" | "documents";

type DoorRecord = {
  id: string;
  type: string;
  room: string;
  acoustic: string;
  fire: string;
  note: string;
};

const halifaxDoors: DoorRecord[] = [
  { id: "ID.03.01", type: "Type C1", room: "NCCR 6 · R-03.91", acoustic: "-", fire: "FD60S", note: "Single leaf timber doorset" },
  { id: "ID.03.04", type: "Type D1", room: "R&D Room 8P · R-03.27", acoustic: "38dB", fire: "FD60S", note: "Card reader with maglock" },
  { id: "ID.03.15", type: "Type B1", room: "24/7 Working Area · R-03.22", acoustic: "38dB", fire: "-", note: "Vision panel" },
  { id: "ID.03.19", type: "Type C2", room: "West Staircore · R-03.75", acoustic: "-", fire: "FD60S", note: "Double leaf with vision panel" },
  { id: "ID.03.22", type: "Type D1", room: "Meeting Room 6P · R-03.23", acoustic: "38dB", fire: "FD30S", note: "Single leaf with vision panel" },
  { id: "ID.03.35", type: "Type C2", room: "East Staircore · R-03.78", acoustic: "-", fire: "FD60S", note: "Double leaf with vision panel" },
  { id: "ID.03.41", type: "Type D1", room: "SC Riser 1 · R-03.51", acoustic: "35dB", fire: "FD60S", note: "Single leaf timber doorset" },
  { id: "ID.03.R.06", type: "Type G1", room: "East Staircore · R-03.78", acoustic: "-", fire: "FD60S", note: "Profab access riser door" },
];

const riversideWork = [
  { title: "Inspect doors D-014 to D-018", owner: "Alex Morgan", due: "Today", status: "In progress", priority: "High" },
  { title: "Review Level 02 fire-door evidence", owner: "Jamie Cole", due: "Today", status: "Review", priority: "High" },
  { title: "Complete Block A electrical certificates", owner: "Jordan Lee", due: "Tomorrow", status: "In progress", priority: "Medium" },
  { title: "Upload revised reflected ceiling plan", owner: "Design team", due: "4 Aug", status: "To do", priority: "Medium" },
];

const halifaxPeople = [
  { initials: "SM", name: "Site Manager", role: "Project delivery and coordination", status: "Project role" },
  { initials: "DI", name: "Door Installer", role: "Installation and evidence", status: "Trade role" },
  { initials: "FI", name: "Fire Door Inspector", role: "Inspection and authorised review", status: "Compliance role" },
  { initials: "DC", name: "Design Coordinator", role: "Drawing and schedule control", status: "Design role" },
];

const riversidePeople = [
  { initials: "AM", name: "Alex Morgan", role: "Project Manager", status: "On site" },
  { initials: "JC", name: "Jamie Cole", role: "Fire Door Inspector", status: "Available" },
  { initials: "JL", name: "Jordan Lee", role: "Electrical Supervisor", status: "On site" },
  { initials: "SP", name: "Sam Patel", role: "Site Manager", status: "In meeting" },
];

const halifaxDocuments = [
  { name: "Level 03 - Internal Walls", type: "PDF · private source", updated: "11998-ATA-XX-03-CPD-AR-1105 · C13" },
  { name: "Master Door Schedule", type: "Spreadsheet · private source", updated: "11998-ATA-XX-ZZ-CPD-AR-1200 · C07" },
  { name: "Level 03 Door Index", type: "Nexus derived record", updated: "62 indexed door records" },
  { name: "Source Boundary", type: "Access control", updated: "Original files are not published" },
];

const riversideDocuments = [
  { name: "Ground Floor Plan", type: "PDF", updated: "18 minutes ago" },
  { name: "Door Schedule Rev C", type: "Spreadsheet", updated: "Today, 09:12" },
  { name: "Fire Strategy", type: "PDF", updated: "Yesterday" },
  { name: "Electrical Test Pack", type: "Folder", updated: "Yesterday" },
];

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("overview");
  const isHalifax = id === "prj1";

  const project = isHalifax
    ? {
        name: "Halifax Head Office",
        client: "Lloyds Banking Group · LBG Trinity Road",
        location: "6 Trinity Road, Halifax, West Yorkshire, HX1 2RG",
        description: "Project workspace derived from the Level 03 internal-walls drawing and the master door schedule. The original PDF and spreadsheet remain private while Nexus exposes the operational door context.",
        tags: ["Level 03", "Fire Doors & Joinery", "Door Schedule", "Controlled documents"],
      }
    : {
        name: "Riverside Heights",
        client: "Fictional demonstration",
        location: "Leeds, UK",
        description: "Residential refurbishment and compliance programme connecting doors, electrical commissioning, people, plans, tasks and evidence in one project workspace.",
        tags: ["Fire Doors & Joinery", "Electrical", "Compliance"],
      };

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "work", label: isHalifax ? "Door package" : "Work" },
    { id: "people", label: "People" },
    { id: "documents", label: "Documents" },
  ];

  const people = isHalifax ? halifaxPeople : riversidePeople;
  const documents = isHalifax ? halifaxDocuments : riversideDocuments;

  return (
    <div className="space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/projects" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Projects
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/communication-hub" className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"><MessageSquare className="h-4 w-4" /> Project chat</Link>
          <button type="button" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"><Plus className="h-4 w-4" /> Add work</button>
        </div>
      </div>

      <section className="overflow-hidden rounded-[28px] border border-primary/20 bg-gradient-to-br from-primary/[.09] via-card/90 to-card/65">
        <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_320px] md:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[.14em] text-primary">
              <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-emerald-300">Active</span>
              <span className="text-muted-foreground">{project.client}</span>
            </div>
            <h1 className="mt-5 text-3xl font-bold tracking-[-.04em] md:text-5xl">{project.name}</h1>
            <p className="mt-3 inline-flex items-start gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {project.location}</p>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">{project.description}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {project.tags.map(tag => <span key={tag} className="rounded-full border border-border bg-background/35 px-3 py-1.5 text-xs text-muted-foreground">{tag}</span>)}
            </div>
          </div>

          {isHalifax ? (
            <div className="rounded-2xl border border-border bg-background/45 p-5">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">Level 03 package</p><CheckCircle2 className="h-5 w-5 text-emerald-300" /></div>
              <p className="mt-3 text-4xl font-bold">62 doors</p>
              <p className="mt-2 text-xs text-muted-foreground">Indexed from the master schedule and linked to the Level 03 drawing.</p>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border bg-card/70 p-3"><p className="text-lg font-bold">49</p><p className="text-[10px] text-muted-foreground">Fire-rated</p></div>
                <div className="rounded-xl border border-border bg-card/70 p-3"><p className="text-lg font-bold">40</p><p className="text-[10px] text-muted-foreground">Acoustic</p></div>
                <div className="rounded-xl border border-border bg-card/70 p-3"><p className="text-lg font-bold">7</p><p className="text-[10px] text-muted-foreground">Riser</p></div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-background/45 p-5">
              <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">Overall progress</p><CheckCircle2 className="h-5 w-5 text-emerald-300" /></div>
              <p className="mt-3 text-4xl font-bold">72%</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full w-[72%] rounded-full bg-primary" /></div>
              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-border bg-card/70 p-3"><p className="text-lg font-bold">12</p><p className="text-[10px] text-muted-foreground">Open</p></div>
                <div className="rounded-xl border border-border bg-card/70 p-3"><p className="text-lg font-bold text-amber-300">3</p><p className="text-[10px] text-muted-foreground">Review</p></div>
                <div className="rounded-xl border border-border bg-card/70 p-3"><p className="text-lg font-bold">8</p><p className="text-[10px] text-muted-foreground">On site</p></div>
              </div>
            </div>
          )}
        </div>
      </section>

      <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card/50 p-1.5">
        {tabs.map(item => (
          <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${tab === item.id ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>{item.label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(330px,.65fr)]">
          <section className="rounded-3xl border border-border bg-card/55 p-5 md:p-6">
            <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-primary">Project tools</p><h2 className="mt-1 text-xl font-semibold">Work inside {project.name}</h2></div></div>
            {isHalifax ? (
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <button type="button" onClick={() => setTab("work")} className="group rounded-2xl border border-border bg-background/40 p-5 text-left hover:border-primary/40">
                  <div className="flex items-center justify-between"><DoorOpen className="h-6 w-6 text-primary" /><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div><h3 className="mt-5 font-semibold">Level 03 Door Package</h3><p className="mt-2 text-sm text-muted-foreground">Browse indexed door IDs, rooms, types and performance requirements.</p><p className="mt-4 text-xs font-semibold text-primary">62 records</p>
                </button>
                <button type="button" onClick={() => setTab("documents")} className="group rounded-2xl border border-border bg-background/40 p-5 text-left hover:border-primary/40">
                  <div className="flex items-center justify-between"><FileSpreadsheet className="h-6 w-6 text-primary" /><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div><h3 className="mt-5 font-semibold">Controlled Sources</h3><p className="mt-2 text-sm text-muted-foreground">Drawing and schedule references without exposing the original files.</p><p className="mt-4 text-xs font-semibold text-primary">C13 + C07</p>
                </button>
                <a href={`${base}fire-door-register-demo/`} className="group rounded-2xl border border-border bg-background/40 p-5 hover:border-primary/40">
                  <div className="flex items-center justify-between"><ShieldCheck className="h-6 w-6 text-primary" /><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div><h3 className="mt-5 font-semibold">Fire Door Register</h3><p className="mt-2 text-sm text-muted-foreground">Open the manual registration and ten-sector inspection workflow.</p><p className="mt-4 text-xs font-semibold text-primary">Inspection workflow</p>
                </a>
              </div>
            ) : (
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <a href={`${base}fire-door-register-demo/`} className="group rounded-2xl border border-border bg-background/40 p-5 hover:border-primary/40"><div className="flex items-center justify-between"><ShieldCheck className="h-6 w-6 text-primary" /><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div><h3 className="mt-5 font-semibold">Fire Door Register</h3><p className="mt-2 text-sm text-muted-foreground">18 doors registered. Three inspections require attention.</p><p className="mt-4 text-xs font-semibold text-amber-300">3 due</p></a>
                <a href={`${base}doorflow-demo/`} className="group rounded-2xl border border-border bg-background/40 p-5 hover:border-primary/40"><div className="flex items-center justify-between"><DoorOpen className="h-6 w-6 text-primary" /><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div><h3 className="mt-5 font-semibold">DoorFlow</h3><p className="mt-2 text-sm text-muted-foreground">Plan markers, schedule, installation and evidence.</p><p className="mt-4 text-xs font-semibold text-primary">15 doors · 72%</p></a>
                <a href={`${base}electrical-commissioning/`} className="group rounded-2xl border border-border bg-background/40 p-5 hover:border-primary/40"><div className="flex items-center justify-between"><CircuitBoard className="h-6 w-6 text-primary" /><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div><h3 className="mt-5 font-semibold">Electrical</h3><p className="mt-2 text-sm text-muted-foreground">Testing, certificates and commissioning status.</p><p className="mt-4 text-xs font-semibold text-primary">Block A · 64%</p></a>
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card/55 p-5 md:p-6">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-primary">Attention</p><h2 className="mt-1 text-xl font-semibold">Needs action</h2></div><AlertTriangle className="h-5 w-5 text-amber-300" /></div>
            <div className="mt-5 space-y-3">
              {isHalifax ? (
                <>
                  <div className="rounded-2xl border border-primary/20 bg-primary/[.05] p-4"><p className="text-sm font-semibold">Confirm project access rules</p><p className="mt-1 text-xs text-muted-foreground">Original schedule and drawing remain private.</p></div>
                  <div className="rounded-2xl border border-border bg-background/35 p-4"><p className="text-sm font-semibold">Map remaining Level 03 door positions</p><p className="mt-1 text-xs text-muted-foreground">Door identities are indexed; graphical coordinates are the next layer.</p></div>
                  <div className="rounded-2xl border border-border bg-background/35 p-4"><p className="text-sm font-semibold">Define inspection ownership</p><p className="mt-1 text-xs text-muted-foreground">Assign installer, inspector and authorised approver roles.</p></div>
                </>
              ) : (
                <>
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-4"><p className="text-sm font-semibold">Three fire-door inspections are due</p><p className="mt-1 text-xs text-muted-foreground">Level 02 · due today</p></div>
                  <div className="rounded-2xl border border-border bg-background/35 p-4"><p className="text-sm font-semibold">Electrical certificate awaiting approval</p><p className="mt-1 text-xs text-muted-foreground">Block A communal systems</p></div>
                  <div className="rounded-2xl border border-border bg-background/35 p-4"><p className="text-sm font-semibold">RCP revision changed</p><p className="mt-1 text-xs text-muted-foreground">Review linked work before continuing</p></div>
                </>
              )}
            </div>
          </section>
        </div>
      )}

      {tab === "work" && (
        isHalifax ? (
          <section className="rounded-3xl border border-border bg-card/55 p-5 md:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-primary">Level 03 door package</p><h2 className="mt-1 text-xl font-semibold">Indexed schedule sample</h2><p className="mt-2 text-sm text-muted-foreground">Eight representative records are shown below. The project summary is calculated from all 62 Level 03 doors.</p></div><DoorOpen className="h-5 w-5 text-muted-foreground" /></div>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-border">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-secondary/60 text-xs uppercase tracking-[.1em] text-muted-foreground"><tr><th className="px-4 py-3">Door ID</th><th className="px-4 py-3">Room</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Acoustic</th><th className="px-4 py-3">Fire</th><th className="px-4 py-3">Context</th></tr></thead>
                <tbody>
                  {halifaxDoors.map((door, index) => <tr key={door.id} className={index < halifaxDoors.length - 1 ? "border-b border-border" : ""}><td className="px-4 py-3 font-semibold text-primary">{door.id}</td><td className="px-4 py-3">{door.room}</td><td className="px-4 py-3 text-muted-foreground">{door.type}</td><td className="px-4 py-3 text-muted-foreground">{door.acoustic}</td><td className="px-4 py-3"><span className={`rounded-full border px-2.5 py-1 text-xs ${door.fire !== "-" ? "border-amber-400/25 bg-amber-400/10 text-amber-300" : "border-border text-muted-foreground"}`}>{door.fire}</span></td><td className="px-4 py-3 text-muted-foreground">{door.note}</td></tr>)}
                </tbody>
              </table>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-border bg-card/55 p-5 md:p-6">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-primary">Shared work</p><h2 className="mt-1 text-xl font-semibold">Tasks, snags and approvals</h2></div><ClipboardCheck className="h-5 w-5 text-muted-foreground" /></div>
            <div className="mt-5 overflow-hidden rounded-2xl border border-border">
              {riversideWork.map((item, index) => <div key={item.title} className={`grid gap-3 bg-background/30 p-4 sm:grid-cols-[minmax(0,1fr)_150px_100px] sm:items-center ${index < riversideWork.length - 1 ? "border-b border-border" : ""}`}><div><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{item.owner} · {item.status}</p></div><span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-semibold ${item.priority === "High" ? "border-amber-400/25 bg-amber-400/10 text-amber-300" : "border-border text-muted-foreground"}`}>{item.priority} priority</span><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> {item.due}</span></div>)}
            </div>
          </section>
        )
      )}

      {tab === "people" && (
        <section className="rounded-3xl border border-border bg-card/55 p-5 md:p-6">
          <div><p className="text-xs font-semibold uppercase tracking-[.15em] text-primary">Project team</p><h2 className="mt-1 text-xl font-semibold">People, roles and availability</h2></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {people.map(person => <Link key={person.name} href="/person-card-demo" className="rounded-2xl border border-border bg-background/35 p-5 hover:border-primary/35"><div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-bold text-primary">{person.initials}</div><h3 className="mt-4 font-semibold">{person.name}</h3><p className="mt-1 text-sm text-muted-foreground">{person.role}</p><p className="mt-4 text-xs font-semibold text-emerald-300">{person.status}</p></Link>)}
          </div>
        </section>
      )}

      {tab === "documents" && (
        <section className="rounded-3xl border border-border bg-card/55 p-5 md:p-6">
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[.15em] text-primary">Controlled information</p><h2 className="mt-1 text-xl font-semibold">Plans, schedules and evidence</h2></div><Link href="/plans" className="text-xs font-semibold text-primary">Open document library</Link></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {documents.map(document => <div key={document.name} className="flex items-center gap-4 rounded-2xl border border-border bg-background/35 p-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><FileText className="h-5 w-5" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{document.name}</p><p className="mt-1 text-xs text-muted-foreground">{document.type}</p><p className="mt-1 text-[11px] text-muted-foreground/80">{document.updated}</p></div></div>)}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4 rounded-3xl border border-primary/20 bg-primary/[.05] p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
        <div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Network className="h-5 w-5" /></div><div><p className="font-semibold">Every action remains attached to this project</p><p className="mt-1 text-sm text-muted-foreground">People, documents, tasks and specialist tools share the same {project.name} context.</p></div></div>
        <Link href="/workspace" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-primary/30 px-4 py-2.5 text-sm font-semibold text-primary">Relationship view <ArrowRight className="h-4 w-4" /></Link>
      </section>
    </div>
  );
}
