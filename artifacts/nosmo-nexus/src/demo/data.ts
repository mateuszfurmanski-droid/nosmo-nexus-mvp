import { addDays, subDays, subHours, subMinutes } from "date-fns";

export type PersonStatus = "Active" | "Lead" | "Partner" | "Vendor" | "Client";
export interface Person {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar?: string;
  email: string;
  phone: string;
  location: string;
  tags: string[];
  status: PersonStatus;
  lastContact: string;
}

export type ProjectStatus = "Active" | "Planning" | "On Hold" | "Completed";
export interface Project {
  id: string;
  name: string;
  client: string;
  status: ProjectStatus;
  description: string;
  progress: number;
  startDate: string;
  dueDate: string;
  location: string;
  peopleIds: string[];
}

export type DocumentKind = "PDF" | "Doc" | "Spreadsheet" | "Slide" | "Image";
export interface Document {
  id: string;
  title: string;
  kind: DocumentKind;
  sizeLabel: string;
  updatedAt: string;
  ownerPersonId: string;
  projectId?: string;
  tags: string[];
}

export interface Note {
  id: string;
  title: string;
  snippet: string;
  author: string;
  updatedAt: string;
  personId?: string;
  projectId?: string;
  tags: string[];
}

export type TaskStatus = "To Do" | "In Progress" | "Done";
export type TaskPriority = "Low" | "Medium" | "High";
export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneePersonId: string;
  projectId?: string;
  dueDate: string;
}

export type TimelineEventType = "note" | "document" | "task" | "person" | "project" | "meeting" | "call";
export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  summary: string;
  actor: string;
  personId?: string;
  projectId?: string;
  timestamp: string;
}

const now = new Date();

// Real NOSMO demo contacts: NOSMO Technology founders/advisors and the Halifax / Lloyds Bank site team (via 360 Interiors).
export const PEOPLE: Person[] = [
  { id: "p1", name: "Mateusz Furmański", title: "Product Architect / Founder", company: "NOSMO Technology Limited", email: "mateusz@nosmo.tech", phone: "+44 7925 123415", location: "Halifax, UK", tags: ["Founder", "Product", "Joinery"], status: "Active", lastContact: subHours(now, 2).toISOString() },
  { id: "p2", name: "Kamil Karaszewski", title: "Technical Advisor / Welding & Fabrication", company: "NOSMO Technology Limited", email: "kamil@nosmo.tech", phone: "+44 7700 900221", location: "United Kingdom", tags: ["Advisor", "Welding", "Fabrication"], status: "Partner", lastContact: subDays(now, 3).toISOString() },
  { id: "p3", name: "Lee", title: "CEO / Company Lead", company: "360 Interiors", email: "lee@360interiors.co.uk", phone: "+44 7700 900335", location: "West Yorkshire, UK", tags: ["Client", "Decision Maker"], status: "Client", lastContact: subDays(now, 1).toISOString() },
  { id: "p4", name: "Tom", title: "Company Contact", company: "360 Interiors", email: "tom@360interiors.co.uk", phone: "+44 7700 900418", location: "West Yorkshire, UK", tags: ["Client", "Coordination"], status: "Client", lastContact: subDays(now, 1).toISOString() },
  { id: "p5", name: "Akeem", title: "Site Manager", company: "360 Interiors", email: "akeem@360interiors.co.uk", phone: "+44 7700 900562", location: "Halifax, UK", tags: ["Site", "Management"], status: "Active", lastContact: subHours(now, 6).toISOString() },
  { id: "p6", name: "Mateusz Zuchowski", title: "Joiner / Freelancer", company: "360 Interiors", email: "m.zuchowski@site.co.uk", phone: "+44 7700 900677", location: "Halifax, UK", tags: ["Joinery", "Freelancer"], status: "Active", lastContact: subDays(now, 2).toISOString() },
  { id: "p7", name: "John", title: "Joiner", company: "360 Interiors", email: "john@site.co.uk", phone: "+44 7700 900781", location: "Halifax, UK", tags: ["Joinery"], status: "Active", lastContact: subDays(now, 2).toISOString() },
  { id: "p8", name: "Boo", title: "Labourer", company: "360 Interiors", email: "boo@site.co.uk", phone: "+44 7700 900845", location: "Halifax, UK", tags: ["Labour"], status: "Active", lastContact: subDays(now, 4).toISOString() },
  { id: "p9", name: "Jamie", title: "Labourer", company: "360 Interiors", email: "jamie@site.co.uk", phone: "+44 7700 900912", location: "Halifax, UK", tags: ["Labour"], status: "Active", lastContact: subDays(now, 5).toISOString() },
];

// Real NOSMO demo projects. Halifax / Lloyds Bank is the core construction demo and must stay visible.
export const PROJECTS: Project[] = [
  { id: "prj1", name: "Halifax / Lloyds Bank – 360 Interiors", client: "360 Interiors", status: "Active", description: "Commercial bank branch fit-out and interior joinery for Lloyds in Halifax. Door installation, snagging and site finishing delivered with the 360 Interiors site team.", progress: 72, startDate: subDays(now, 90).toISOString(), dueDate: addDays(now, 20).toISOString(), location: "Halifax, UK", peopleIds: ["p1", "p3", "p4", "p5", "p6", "p7", "p8", "p9"] },
  { id: "prj2", name: "NOSMO Nexus MVP", client: "NOSMO Technology Limited", status: "Active", description: "Building the NOSMO Nexus platform MVP — project-aware Person Cards, AI pre-fill, privacy gates and the contract-first API.", progress: 45, startDate: subDays(now, 45).toISOString(), dueDate: addDays(now, 60).toISOString(), location: "Remote / UK", peopleIds: ["p1", "p2"] },
  { id: "prj3", name: "NOSMO Technology Limited", client: "NOSMO Technology Limited", status: "Active", description: "Company-level operations: investor outreach, advisor agreements, hiring plan and overall product strategy.", progress: 60, startDate: subDays(now, 200).toISOString(), dueDate: addDays(now, 160).toISOString(), location: "United Kingdom", peopleIds: ["p1", "p2"] },
  { id: "prj4", name: "UNICON / Site Assistant R&D", client: "NOSMO Technology Limited", status: "Planning", description: "Early-stage R&D into UNICON, an on-site assistant concept for construction crews. Scoping sensors, field tests and integration with Nexus.", progress: 15, startDate: subDays(now, 10).toISOString(), dueDate: addDays(now, 120).toISOString(), location: "R&D / UK", peopleIds: ["p1", "p2"] },
];

export const DOCUMENTS: Document[] = [
  { id: "doc1", title: "Ground Floor Plans", kind: "PDF", sizeLabel: "4.8 MB", updatedAt: subDays(now, 4).toISOString(), ownerPersonId: "p5", projectId: "prj1", tags: ["Plans", "PDF"] },
  { id: "doc2", title: "Door Schedule", kind: "Spreadsheet", sizeLabel: "320 KB", updatedAt: subDays(now, 1).toISOString(), ownerPersonId: "p1", projectId: "prj1", tags: ["Doors", "Schedule"] },
  { id: "doc3", title: "Site Instructions", kind: "PDF", sizeLabel: "1.1 MB", updatedAt: subDays(now, 3).toISOString(), ownerPersonId: "p4", projectId: "prj1", tags: ["Site", "Instructions"] },
  { id: "doc4", title: "Snag List", kind: "Spreadsheet", sizeLabel: "210 KB", updatedAt: subHours(now, 8).toISOString(), ownerPersonId: "p5", projectId: "prj1", tags: ["Snags", "QA"] },
  { id: "doc5", title: "Fire Door Certificates", kind: "PDF", sizeLabel: "2.3 MB", updatedAt: subDays(now, 6).toISOString(), ownerPersonId: "p1", projectId: "prj1", tags: ["Compliance", "Fire"] },
  { id: "doc6", title: "Completion Photos", kind: "Image", sizeLabel: "18 MB", updatedAt: subDays(now, 2).toISOString(), ownerPersonId: "p6", projectId: "prj1", tags: ["Photos", "Handover"] },
  { id: "doc7", title: "Nexus Architecture Spec", kind: "Doc", sizeLabel: "640 KB", updatedAt: subDays(now, 6).toISOString(), ownerPersonId: "p1", projectId: "prj2", tags: ["Architecture", "Spec"] },
  { id: "doc8", title: "OpenAPI Draft", kind: "Doc", sizeLabel: "180 KB", updatedAt: subDays(now, 2).toISOString(), ownerPersonId: "p1", projectId: "prj2", tags: ["API", "Spec"] },
  { id: "doc9", title: "Nexus Pitch Deck", kind: "Slide", sizeLabel: "9.4 MB", updatedAt: subDays(now, 5).toISOString(), ownerPersonId: "p1", projectId: "prj2", tags: ["Pitch", "Investor"] },
  { id: "doc10", title: "Company Deck", kind: "Slide", sizeLabel: "7.1 MB", updatedAt: subDays(now, 9).toISOString(), ownerPersonId: "p1", projectId: "prj3", tags: ["Company", "Deck"] },
  { id: "doc11", title: "Cap Table", kind: "Spreadsheet", sizeLabel: "95 KB", updatedAt: subDays(now, 5).toISOString(), ownerPersonId: "p1", projectId: "prj3", tags: ["Finance", "Cap Table"] },
  { id: "doc12", title: "Site Assistant R&D Brief", kind: "Doc", sizeLabel: "410 KB", updatedAt: subDays(now, 11).toISOString(), ownerPersonId: "p2", projectId: "prj4", tags: ["R&D", "Brief"] },
  { id: "doc13", title: "UNICON Concept", kind: "Slide", sizeLabel: "5.6 MB", updatedAt: subDays(now, 12).toISOString(), ownerPersonId: "p2", projectId: "prj4", tags: ["Concept", "R&D"] },
  { id: "doc14", title: "First Floor Plans", kind: "PDF", sizeLabel: "5.2 MB", updatedAt: subDays(now, 4).toISOString(), ownerPersonId: "p5", projectId: "prj1", tags: ["Plans", "PDF"] },
  { id: "doc15", title: "Elevations & Sections", kind: "PDF", sizeLabel: "6.1 MB", updatedAt: subDays(now, 5).toISOString(), ownerPersonId: "p1", projectId: "prj1", tags: ["Plans", "Drawings"] },
  { id: "doc16", title: "Fire Strategy Drawing", kind: "PDF", sizeLabel: "1.9 MB", updatedAt: subDays(now, 7).toISOString(), ownerPersonId: "p1", projectId: "prj1", tags: ["Compliance", "Fire"] },
  { id: "doc17", title: "M&E Coordination Plan", kind: "PDF", sizeLabel: "3.4 MB", updatedAt: subDays(now, 2).toISOString(), ownerPersonId: "p4", projectId: "prj1", tags: ["M&E", "Coordination"] },
  { id: "doc18", title: "Reflected Ceiling Plan", kind: "PDF", sizeLabel: "2.7 MB", updatedAt: subHours(now, 20).toISOString(), ownerPersonId: "p6", projectId: "prj1", tags: ["Plans", "RCP"] },
  { id: "doc19", title: "Setting Out Plan", kind: "PDF", sizeLabel: "1.5 MB", updatedAt: subDays(now, 3).toISOString(), ownerPersonId: "p5", projectId: "prj1", tags: ["Plans", "Setting Out"] },
  { id: "doc20", title: "UNICON Site Layout", kind: "PDF", sizeLabel: "2.1 MB", updatedAt: subDays(now, 10).toISOString(), ownerPersonId: "p2", projectId: "prj4", tags: ["R&D", "Layout"] },
];

export const NOTES: Note[] = [
  { id: "n1", title: "Door schedule walk-through", snippet: "Went through the full door schedule with Akeem. Levels 0–1 signed off, level 2 pending ironmongery.", author: "Me", updatedAt: subHours(now, 8).toISOString(), personId: "p5", projectId: "prj1", tags: ["Doors", "Site"] },
  { id: "n2", title: "Snag list review", snippet: "Frame alignment on three doors flagged. Joiners to revisit before client walkthrough.", author: "Me", updatedAt: subDays(now, 2).toISOString(), personId: "p1", projectId: "prj1", tags: ["Snags", "QA"] },
  { id: "n3", title: "Ironmongery shortfall", snippet: "Short on closers and handles for level 2. Reorder placed, ETA later this week.", author: "Me", updatedAt: subDays(now, 2).toISOString(), personId: "p1", projectId: "prj1", tags: ["Procurement", "Doors"] },
  { id: "n4", title: "Lloyds branch handover plan", snippet: "Tom confirmed the handover window. Completion photos and fire cert pack required for sign-off.", author: "Me", updatedAt: subDays(now, 1).toISOString(), personId: "p4", projectId: "prj1", tags: ["Handover", "Client"] },
  { id: "n5", title: "Nexus data model decisions", snippet: "Settled on project-aware Person Cards with per-project participation. One person, many roles.", author: "Me", updatedAt: subDays(now, 6).toISOString(), personId: "p1", projectId: "prj2", tags: ["Architecture", "Data"] },
  { id: "n6", title: "AI pre-fill privacy gates", snippet: "AI pre-fills, human confirms. Phones masked, low-confidence matches never auto-attached.", author: "Me", updatedAt: subHours(now, 10).toISOString(), personId: "p1", projectId: "prj2", tags: ["Privacy", "AI"] },
  { id: "n7", title: "Investor outreach", snippet: "Shortlist of angels drafted. Pitch deck v2 ready to send after advisor review.", author: "Me", updatedAt: subDays(now, 4).toISOString(), personId: "p1", projectId: "prj3", tags: ["Investor", "Strategy"] },
  { id: "n8", title: "Advisor agreement — Kamil", snippet: "Kamil joining as technical advisor for welding & fabrication. Agreement drafted.", author: "Me", updatedAt: subDays(now, 3).toISOString(), personId: "p2", projectId: "prj3", tags: ["Advisor", "Legal"] },
  { id: "n9", title: "UNICON sensor concept", snippet: "Exploring low-cost sensors for on-site assistant. Field test plan to follow.", author: "Me", updatedAt: subDays(now, 11).toISOString(), personId: "p2", projectId: "prj4", tags: ["R&D", "Hardware"] },
  { id: "n10", title: "Site assistant field test idea", snippet: "Pilot UNICON prompts on the Halifax site once the fit-out wraps.", author: "Me", updatedAt: subDays(now, 9).toISOString(), personId: "p1", projectId: "prj4", tags: ["R&D", "Pilot"] },
];

export const TASKS: Task[] = [
  { id: "t1", title: "Sign off ground floor door schedule", status: "In Progress", priority: "High", assigneePersonId: "p1", projectId: "prj1", dueDate: addDays(now, 1).toISOString() },
  { id: "t2", title: "Close frame alignment snags", status: "To Do", priority: "High", assigneePersonId: "p6", projectId: "prj1", dueDate: addDays(now, 2).toISOString() },
  { id: "t3", title: "Order replacement ironmongery", status: "To Do", priority: "Medium", assigneePersonId: "p5", projectId: "prj1", dueDate: addDays(now, 3).toISOString() },
  { id: "t4", title: "Install fire doors — level 1", status: "In Progress", priority: "High", assigneePersonId: "p7", projectId: "prj1", dueDate: addDays(now, 2).toISOString() },
  { id: "t5", title: "Upload completion photos", status: "To Do", priority: "Low", assigneePersonId: "p8", projectId: "prj1", dueDate: addDays(now, 5).toISOString() },
  { id: "t6", title: "Final site clean", status: "To Do", priority: "Low", assigneePersonId: "p9", projectId: "prj1", dueDate: addDays(now, 6).toISOString() },
  { id: "t7", title: "Client walkthrough with Lloyds", status: "To Do", priority: "Medium", assigneePersonId: "p4", projectId: "prj1", dueDate: addDays(now, 4).toISOString() },
  { id: "t8", title: "Fire door certification pack", status: "Done", priority: "High", assigneePersonId: "p1", projectId: "prj1", dueDate: subHours(now, 3).toISOString() },
  { id: "t9", title: "Ship Card Maker module", status: "In Progress", priority: "High", assigneePersonId: "p1", projectId: "prj2", dueDate: addDays(now, 3).toISOString() },
  { id: "t10", title: "Wire privacy gates", status: "In Progress", priority: "Medium", assigneePersonId: "p1", projectId: "prj2", dueDate: addDays(now, 5).toISOString() },
  { id: "t11", title: "Draft OpenAPI spec", status: "Done", priority: "Medium", assigneePersonId: "p1", projectId: "prj2", dueDate: subDays(now, 2).toISOString() },
  { id: "t12", title: "Design grouped projects view", status: "To Do", priority: "Medium", assigneePersonId: "p1", projectId: "prj2", dueDate: addDays(now, 7).toISOString() },
  { id: "t13", title: "Finalise advisor agreements", status: "To Do", priority: "High", assigneePersonId: "p1", projectId: "prj3", dueDate: addDays(now, 4).toISOString() },
  { id: "t14", title: "Investor outreach batch 1", status: "In Progress", priority: "Medium", assigneePersonId: "p1", projectId: "prj3", dueDate: addDays(now, 6).toISOString() },
  { id: "t15", title: "Update cap table", status: "Done", priority: "Low", assigneePersonId: "p1", projectId: "prj3", dueDate: subDays(now, 5).toISOString() },
  { id: "t16", title: "Define Site Assistant R&D scope", status: "To Do", priority: "Medium", assigneePersonId: "p2", projectId: "prj4", dueDate: addDays(now, 10).toISOString() },
  { id: "t17", title: "Source sensor prototypes", status: "To Do", priority: "Low", assigneePersonId: "p2", projectId: "prj4", dueDate: addDays(now, 14).toISOString() },
];

export const TIMELINE: TimelineEvent[] = [
  { id: "te1", type: "task", summary: "Completed task: Fire door certification pack", actor: "Mateusz Furmański", personId: "p1", projectId: "prj1", timestamp: subHours(now, 2).toISOString() },
  { id: "te2", type: "document", summary: "Uploaded Snag List", actor: "Akeem", personId: "p5", projectId: "prj1", timestamp: subHours(now, 8).toISOString() },
  { id: "te3", type: "note", summary: "Added note: AI pre-fill privacy gates", actor: "Me", personId: "p1", projectId: "prj2", timestamp: subHours(now, 10).toISOString() },
  { id: "te4", type: "task", summary: "Moved task to In Progress: Ship Card Maker module", actor: "Mateusz Furmański", personId: "p1", projectId: "prj2", timestamp: subHours(now, 20).toISOString() },
  { id: "te5", type: "document", summary: "Uploaded Door Schedule", actor: "Mateusz Furmański", personId: "p1", projectId: "prj1", timestamp: subDays(now, 1).toISOString() },
  { id: "te6", type: "meeting", summary: "Client walkthrough prep with Lloyds", actor: "Tom", personId: "p4", projectId: "prj1", timestamp: subDays(now, 1).toISOString() },
  { id: "te7", type: "task", summary: "Completed task: Draft OpenAPI spec", actor: "Mateusz Furmański", personId: "p1", projectId: "prj2", timestamp: subDays(now, 2).toISOString() },
  { id: "te8", type: "note", summary: "Added note: Ironmongery shortfall", actor: "Me", personId: "p1", projectId: "prj1", timestamp: subDays(now, 2).toISOString() },
  { id: "te9", type: "call", summary: "Advisor call with Kamil Karaszewski", actor: "Me", personId: "p2", projectId: "prj3", timestamp: subDays(now, 3).toISOString() },
  { id: "te10", type: "document", summary: "Uploaded Ground Floor Plans", actor: "Akeem", personId: "p5", projectId: "prj1", timestamp: subDays(now, 4).toISOString() },
  { id: "te11", type: "task", summary: "Completed task: Update cap table", actor: "Mateusz Furmański", personId: "p1", projectId: "prj3", timestamp: subDays(now, 5).toISOString() },
  { id: "te12", type: "note", summary: "Added note: Nexus data model decisions", actor: "Me", personId: "p1", projectId: "prj2", timestamp: subDays(now, 6).toISOString() },
  { id: "te13", type: "person", summary: "Added contact: Jamie (Labourer)", actor: "Me", personId: "p9", projectId: "prj1", timestamp: subDays(now, 7).toISOString() },
  { id: "te14", type: "document", summary: "Uploaded Company Deck", actor: "Mateusz Furmański", personId: "p1", projectId: "prj3", timestamp: subDays(now, 9).toISOString() },
  { id: "te15", type: "meeting", summary: "Site induction — Halifax", actor: "Akeem", personId: "p5", projectId: "prj1", timestamp: subDays(now, 12).toISOString() },
  { id: "te16", type: "project", summary: "Started UNICON / Site Assistant R&D", actor: "Kamil Karaszewski", personId: "p2", projectId: "prj4", timestamp: subDays(now, 14).toISOString() },
];

export const getPerson = (id: string) => PEOPLE.find(p => p.id === id);
export const getProject = (id: string) => PROJECTS.find(p => p.id === id);
export const getDocument = (id: string) => DOCUMENTS.find(d => d.id === id);
export const getTask = (id: string) => TASKS.find(t => t.id === id);
export const getNote = (id: string) => NOTES.find(n => n.id === id);
export const getPersonProjects = (personId: string) => PROJECTS.filter(p => p.peopleIds.includes(personId));
export const getProjectPeople = (projectId: string) => {
  const proj = getProject(projectId);
  if (!proj) return [];
  return proj.peopleIds.map(id => getPerson(id)).filter(Boolean) as Person[];
};
export const getPersonDocuments = (personId: string) => DOCUMENTS.filter(d => d.ownerPersonId === personId);
export const getProjectDocuments = (projectId: string) => DOCUMENTS.filter(d => d.projectId === projectId);
export const getPersonNotes = (personId: string) => NOTES.filter(n => n.personId === personId);
export const getProjectNotes = (projectId: string) => NOTES.filter(n => n.projectId === projectId);
export const getPersonTasks = (personId: string) => TASKS.filter(t => t.assigneePersonId === personId);
export const getProjectTasks = (projectId: string) => TASKS.filter(t => t.projectId === projectId);
export const getPersonTimeline = (personId: string) => TIMELINE.filter(t => t.personId === personId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
export const getProjectTimeline = (projectId: string) => TIMELINE.filter(t => t.projectId === projectId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

// Company is a string field (person.company / project.client), not its own
// record — but it groups real people and projects, so it can be a real node.
export const getCompanyPeople = (company: string) => PEOPLE.filter(p => p.company === company);
export const getCompanyProjects = (company: string) => PROJECTS.filter(p => p.client === company);
