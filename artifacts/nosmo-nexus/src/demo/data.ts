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

export const PEOPLE: Person[] = [
  { id: "p1", name: "Eleanor Vance", title: "VP of Operations", company: "Acumen Corp", email: "eleanor.v@acumencorp.com", phone: "+1 (555) 019-2834", location: "San Francisco, CA", tags: ["Decision Maker", "Logistics"], status: "Client", lastContact: subDays(now, 2).toISOString() },
  { id: "p2", name: "Marcus Thorne", title: "Lead Architect", company: "Thorne Design", email: "mthorne@thornedesign.net", phone: "+1 (555) 018-9921", location: "Portland, OR", tags: ["Design", "External"], status: "Partner", lastContact: subHours(now, 5).toISOString() },
  { id: "p3", name: "Sylvia Chen", title: "Managing Director", company: "Chen Ventures", email: "schen@chenventures.com", phone: "+1 (555) 012-3345", location: "New York, NY", tags: ["Capital", "Strategic"], status: "Client", lastContact: subDays(now, 1).toISOString() },
  { id: "p4", name: "David Russo", title: "Chief Technical Officer", company: "Nexus Systems", email: "david@nexus-sys.io", phone: "+1 (555) 015-6678", location: "Austin, TX", tags: ["Tech", "Infrastructure"], status: "Partner", lastContact: subDays(now, 5).toISOString() },
  { id: "p5", name: "Amira Patel", title: "Procurement Head", company: "Global Supply Solutions", email: "apatel@gss-supply.com", phone: "+1 (555) 011-2244", location: "Chicago, IL", tags: ["Supply Chain", "Vendor"], status: "Vendor", lastContact: subHours(now, 12).toISOString() },
  { id: "p6", name: "Julian Wright", title: "Marketing Director", company: "Wright Media", email: "julian@wrightmedia.co", phone: "+1 (555) 017-8890", location: "Los Angeles, CA", tags: ["Marketing", "Campaigns"], status: "Active", lastContact: subMinutes(now, 45).toISOString() },
  { id: "p7", name: "Nina Foster", title: "Legal Counsel", company: "Foster & Associates", email: "nina.foster@fosterlaw.com", phone: "+1 (555) 014-5567", location: "Washington, DC", tags: ["Legal", "Compliance"], status: "Vendor", lastContact: subDays(now, 14).toISOString() },
  { id: "p8", name: "Tomohiro Tanaka", title: "Product Owner", company: "TechFlow Innovations", email: "ttanaka@techflow.jp", phone: "+81 90-1234-5678", location: "Tokyo, Japan", tags: ["Product", "International"], status: "Lead", lastContact: subDays(now, 3).toISOString() },
  { id: "p9", name: "Sarah Jenkins", title: "Head of HR", company: "Acumen Corp", email: "sjenkins@acumencorp.com", phone: "+1 (555) 019-3344", location: "San Francisco, CA", tags: ["HR", "Recruitment"], status: "Client", lastContact: subDays(now, 10).toISOString() },
  { id: "p10", name: "Omar Al-Fayed", title: "Financial Analyst", company: "Al-Fayed Capital", email: "omar@alfayedcap.com", phone: "+44 7700 900077", location: "London, UK", tags: ["Finance", "Audit"], status: "Partner", lastContact: subDays(now, 7).toISOString() },
  { id: "p11", name: "Jessica Lin", title: "Data Scientist", company: "Nexus Systems", email: "jlin@nexus-sys.io", phone: "+1 (555) 015-8899", location: "Austin, TX", tags: ["Data", "Analytics"], status: "Partner", lastContact: subHours(now, 2).toISOString() }
];

export const PROJECTS: Project[] = [
  { id: "prj1", name: "Project Alpha: System Migration", client: "Acumen Corp", status: "Active", description: "Migrating legacy systems to a cloud-native architecture.", progress: 65, startDate: subDays(now, 60).toISOString(), dueDate: addDays(now, 30).toISOString(), location: "Remote", peopleIds: ["p1", "p9", "p4", "p11"] },
  { id: "prj2", name: "Project Beta: Brand Refresh", client: "Wright Media", status: "Active", description: "Comprehensive brand overhaul including digital and print assets.", progress: 40, startDate: subDays(now, 30).toISOString(), dueDate: addDays(now, 45).toISOString(), location: "Los Angeles, CA", peopleIds: ["p6", "p2"] },
  { id: "prj3", name: "Project Gamma: Supply Chain Optimization", client: "Global Supply Solutions", status: "Planning", description: "Evaluating and optimizing vendor procurement pipelines.", progress: 10, startDate: subDays(now, 5).toISOString(), dueDate: addDays(now, 90).toISOString(), location: "Chicago, IL", peopleIds: ["p5", "p10"] },
  { id: "prj4", name: "Project Delta: Strategic Investment Portfolio", client: "Chen Ventures", status: "On Hold", description: "Analyzing Q3 investment opportunities in emerging tech.", progress: 25, startDate: subDays(now, 120).toISOString(), dueDate: addDays(now, 180).toISOString(), location: "New York, NY", peopleIds: ["p3", "p10"] },
  { id: "prj5", name: "Project Epsilon: Tokyo Expansion", client: "TechFlow Innovations", status: "Active", description: "Establishing new office and hiring core team in APAC.", progress: 80, startDate: subDays(now, 90).toISOString(), dueDate: addDays(now, 15).toISOString(), location: "Tokyo, Japan", peopleIds: ["p8", "p7"] },
  { id: "prj6", name: "Project Zeta: Nexus Core API", client: "Nexus Systems", status: "Completed", description: "Developed and shipped the v2 API endpoints for external partners.", progress: 100, startDate: subDays(now, 150).toISOString(), dueDate: subDays(now, 5).toISOString(), location: "Austin, TX", peopleIds: ["p4", "p11"] }
];

export const DOCUMENTS: Document[] = [
  { id: "doc1", title: "Q3 Financial Report", kind: "Spreadsheet", sizeLabel: "2.4 MB", updatedAt: subDays(now, 2).toISOString(), ownerPersonId: "p10", projectId: "prj4", tags: ["Finance", "Q3"] },
  { id: "doc2", title: "Architecture Diagram v2", kind: "Image", sizeLabel: "5.1 MB", updatedAt: subDays(now, 5).toISOString(), ownerPersonId: "p4", projectId: "prj1", tags: ["Tech", "Design"] },
  { id: "doc3", title: "Vendor Compliance Agreement", kind: "PDF", sizeLabel: "1.2 MB", updatedAt: subDays(now, 12).toISOString(), ownerPersonId: "p7", projectId: "prj3", tags: ["Legal", "Contract"] },
  { id: "doc4", title: "Brand Guidelines 2024", kind: "Slide", sizeLabel: "14 MB", updatedAt: subDays(now, 20).toISOString(), ownerPersonId: "p2", projectId: "prj2", tags: ["Brand", "Marketing"] },
  { id: "doc5", title: "User Requirements Spec", kind: "Doc", sizeLabel: "800 KB", updatedAt: subHours(now, 4).toISOString(), ownerPersonId: "p8", projectId: "prj5", tags: ["Requirements", "Planning"] },
  { id: "doc6", title: "API Documentation", kind: "PDF", sizeLabel: "3.5 MB", updatedAt: subDays(now, 6).toISOString(), ownerPersonId: "p11", projectId: "prj6", tags: ["Tech", "API"] },
  { id: "doc7", title: "Q4 Marketing Strategy", kind: "Slide", sizeLabel: "8.2 MB", updatedAt: subDays(now, 1).toISOString(), ownerPersonId: "p6", projectId: "prj2", tags: ["Marketing", "Strategy"] },
  { id: "doc8", title: "Employee Handbook", kind: "PDF", sizeLabel: "4.1 MB", updatedAt: subDays(now, 45).toISOString(), ownerPersonId: "p9", projectId: "prj1", tags: ["HR", "Policy"] },
  { id: "doc9", title: "Budget Forecast 2025", kind: "Spreadsheet", sizeLabel: "1.8 MB", updatedAt: subHours(now, 12).toISOString(), ownerPersonId: "p10", projectId: "prj4", tags: ["Finance", "Budget"] },
  { id: "doc10", title: "Security Audit Report", kind: "Doc", sizeLabel: "1.1 MB", updatedAt: subDays(now, 8).toISOString(), ownerPersonId: "p4", projectId: "prj1", tags: ["Security", "Audit"] },
  { id: "doc11", title: "Supply Chain Risk Analysis", kind: "Doc", sizeLabel: "950 KB", updatedAt: subDays(now, 3).toISOString(), ownerPersonId: "p5", projectId: "prj3", tags: ["Risk", "Analysis"] },
  { id: "doc12", title: "Investment Portfolio Presentation", kind: "Slide", sizeLabel: "12 MB", updatedAt: subDays(now, 15).toISOString(), ownerPersonId: "p3", projectId: "prj4", tags: ["Investment", "Presentation"] },
  { id: "doc13", title: "Tokyo Office Lease Agreement", kind: "PDF", sizeLabel: "2.2 MB", updatedAt: subDays(now, 25).toISOString(), ownerPersonId: "p7", projectId: "prj5", tags: ["Legal", "Real Estate"] },
  { id: "doc14", title: "System Migration Timeline", kind: "Spreadsheet", sizeLabel: "1.5 MB", updatedAt: subHours(now, 24).toISOString(), ownerPersonId: "p1", projectId: "prj1", tags: ["Planning", "Timeline"] },
];

export const NOTES: Note[] = [
  { id: "n1", title: "Meeting with Eleanor: Phase 2 Logistics", snippet: "Discussed the upcoming phase 2 rollout. We need to secure the secondary vendor list by next week.", author: "Me", updatedAt: subDays(now, 1).toISOString(), personId: "p1", projectId: "prj1", tags: ["Meeting", "Logistics"] },
  { id: "n2", title: "Brand Refresh Ideas", snippet: "Marcus suggested a more vibrant color palette. Waiting on the revised mockups.", author: "Me", updatedAt: subDays(now, 4).toISOString(), personId: "p2", projectId: "prj2", tags: ["Design", "Ideas"] },
  { id: "n3", title: "Compliance Review Notes", snippet: "Nina highlighted section 4.2 in the vendor agreement as a potential risk. Need to revise.", author: "Me", updatedAt: subDays(now, 10).toISOString(), personId: "p7", projectId: "prj3", tags: ["Legal", "Review"] },
  { id: "n4", title: "API Release Retrospective", snippet: "The launch went smoothly. Jessica noted a 15% improvement in response times.", author: "Me", updatedAt: subDays(now, 7).toISOString(), personId: "p11", projectId: "prj6", tags: ["Tech", "Retrospective"] },
  { id: "n5", title: "Tokyo Expansion: Hiring Plan", snippet: "Tomohiro outlined the need for 3 senior engineers and 1 product manager by Q4.", author: "Me", updatedAt: subDays(now, 14).toISOString(), personId: "p8", projectId: "prj5", tags: ["Hiring", "Planning"] },
  { id: "n6", title: "Investment Committee Summary", snippet: "Sylvia wants to focus on renewable energy startups for the next fund allocation.", author: "Me", updatedAt: subDays(now, 2).toISOString(), personId: "p3", projectId: "prj4", tags: ["Investment", "Strategy"] },
  { id: "n7", title: "Marketing Q4 Check-in", snippet: "Julian needs the finalized budget from Omar before launching the ad campaign.", author: "Me", updatedAt: subHours(now, 6).toISOString(), personId: "p6", projectId: "prj2", tags: ["Marketing", "Budget"] },
  { id: "n8", title: "Supply Chain Constraints", snippet: "Amira warned about potential delays in the APAC region due to recent policy changes.", author: "Me", updatedAt: subDays(now, 5).toISOString(), personId: "p5", projectId: "prj3", tags: ["Risk", "Supply Chain"] },
  { id: "n9", title: "HR Update: Onboarding", snippet: "Sarah has finalized the new onboarding process for remote employees.", author: "Me", updatedAt: subDays(now, 12).toISOString(), personId: "p9", projectId: "prj1", tags: ["HR", "Process"] },
  { id: "n10", title: "Tech Stack Review", snippet: "David proposed moving from monolithic to microservices for the internal tools.", author: "Me", updatedAt: subDays(now, 20).toISOString(), personId: "p4", projectId: "prj1", tags: ["Tech", "Architecture"] },
  { id: "n11", title: "Financial Audit Prep", snippet: "Omar requested all expense reports from Q2 to be submitted by Friday.", author: "Me", updatedAt: subDays(now, 8).toISOString(), personId: "p10", projectId: "prj4", tags: ["Finance", "Audit"] },
  { id: "n12", title: "Initial Consultation: Chen Ventures", snippet: "Sylvia is interested in a 3-year partnership. Drafting proposal.", author: "Me", updatedAt: subDays(now, 30).toISOString(), personId: "p3", tags: ["Proposal", "Sales"] },
];

export const TASKS: Task[] = [
  { id: "t1", title: "Review revised architecture diagram", status: "To Do", priority: "High", assigneePersonId: "p4", projectId: "prj1", dueDate: addDays(now, 2).toISOString() },
  { id: "t2", title: "Finalize vendor compliance agreement", status: "In Progress", priority: "High", assigneePersonId: "p7", projectId: "prj3", dueDate: addDays(now, 1).toISOString() },
  { id: "t3", title: "Send brand guidelines to agency", status: "Done", priority: "Medium", assigneePersonId: "p2", projectId: "prj2", dueDate: subDays(now, 2).toISOString() },
  { id: "t4", title: "Draft Tokyo office lease", status: "To Do", priority: "Medium", assigneePersonId: "p7", projectId: "prj5", dueDate: addDays(now, 5).toISOString() },
  { id: "t5", title: "Analyze Q3 financial report", status: "In Progress", priority: "High", assigneePersonId: "p10", projectId: "prj4", dueDate: addDays(now, 3).toISOString() },
  { id: "t6", title: "Update API documentation", status: "Done", priority: "Low", assigneePersonId: "p11", projectId: "prj6", dueDate: subDays(now, 4).toISOString() },
  { id: "t7", title: "Schedule marketing alignment call", status: "To Do", priority: "Low", assigneePersonId: "p6", projectId: "prj2", dueDate: addDays(now, 7).toISOString() },
  { id: "t8", title: "Review supply chain risk analysis", status: "In Progress", priority: "Medium", assigneePersonId: "p5", projectId: "prj3", dueDate: addDays(now, 4).toISOString() },
  { id: "t9", title: "Approve employee handbook", status: "Done", priority: "High", assigneePersonId: "p9", projectId: "prj1", dueDate: subDays(now, 10).toISOString() },
  { id: "t10", title: "Prepare budget forecast presentation", status: "To Do", priority: "High", assigneePersonId: "p10", projectId: "prj4", dueDate: addDays(now, 1).toISOString() },
  { id: "t11", title: "Conduct security audit", status: "Done", priority: "High", assigneePersonId: "p4", projectId: "prj1", dueDate: subDays(now, 5).toISOString() },
  { id: "t12", title: "Finalize investment portfolio selection", status: "In Progress", priority: "Medium", assigneePersonId: "p3", projectId: "prj4", dueDate: addDays(now, 10).toISOString() },
  { id: "t13", title: "Interview candidates for Tokyo office", status: "To Do", priority: "High", assigneePersonId: "p8", projectId: "prj5", dueDate: addDays(now, 14).toISOString() },
  { id: "t14", title: "Approve system migration timeline", status: "To Do", priority: "Medium", assigneePersonId: "p1", projectId: "prj1", dueDate: addDays(now, 2).toISOString() },
  { id: "t15", title: "Deploy API v2", status: "Done", priority: "High", assigneePersonId: "p4", projectId: "prj6", dueDate: subDays(now, 6).toISOString() },
  { id: "t16", title: "Review ad campaign budget", status: "In Progress", priority: "Medium", assigneePersonId: "p6", projectId: "prj2", dueDate: addDays(now, 3).toISOString() },
];

export const TIMELINE: TimelineEvent[] = [
  { id: "te1", type: "call", summary: "Initial consultation call", actor: "Me", personId: "p3", timestamp: subDays(now, 30).toISOString() },
  { id: "te2", type: "document", summary: "Uploaded Employee Handbook", actor: "Sarah Jenkins", personId: "p9", projectId: "prj1", timestamp: subDays(now, 45).toISOString() },
  { id: "te3", type: "meeting", summary: "Tech Stack Review Meeting", actor: "David Russo", personId: "p4", projectId: "prj1", timestamp: subDays(now, 20).toISOString() },
  { id: "te4", type: "document", summary: "Revised Brand Guidelines 2024", actor: "Marcus Thorne", personId: "p2", projectId: "prj2", timestamp: subDays(now, 20).toISOString() },
  { id: "te5", type: "task", summary: "Completed task: Deploy API v2", actor: "David Russo", personId: "p4", projectId: "prj6", timestamp: subDays(now, 6).toISOString() },
  { id: "te6", type: "document", summary: "Published API Documentation", actor: "Jessica Lin", personId: "p11", projectId: "prj6", timestamp: subDays(now, 6).toISOString() },
  { id: "te7", type: "note", summary: "Added note: API Release Retrospective", actor: "Me", personId: "p11", projectId: "prj6", timestamp: subDays(now, 7).toISOString() },
  { id: "te8", type: "task", summary: "Completed task: Conduct security audit", actor: "David Russo", personId: "p4", projectId: "prj1", timestamp: subDays(now, 5).toISOString() },
  { id: "te9", type: "note", summary: "Added note: Supply Chain Constraints", actor: "Me", personId: "p5", projectId: "prj3", timestamp: subDays(now, 5).toISOString() },
  { id: "te10", type: "document", summary: "Uploaded Architecture Diagram v2", actor: "David Russo", personId: "p4", projectId: "prj1", timestamp: subDays(now, 5).toISOString() },
  { id: "te11", type: "note", summary: "Added note: Brand Refresh Ideas", actor: "Me", personId: "p2", projectId: "prj2", timestamp: subDays(now, 4).toISOString() },
  { id: "te12", type: "task", summary: "Completed task: Update API documentation", actor: "Jessica Lin", personId: "p11", projectId: "prj6", timestamp: subDays(now, 4).toISOString() },
  { id: "te13", type: "document", summary: "Uploaded Supply Chain Risk Analysis", actor: "Amira Patel", personId: "p5", projectId: "prj3", timestamp: subDays(now, 3).toISOString() },
  { id: "te14", type: "call", summary: "Sync regarding Q3 performance", actor: "Me", personId: "p10", projectId: "prj4", timestamp: subDays(now, 2).toISOString() },
  { id: "te15", type: "task", summary: "Completed task: Send brand guidelines to agency", actor: "Marcus Thorne", personId: "p2", projectId: "prj2", timestamp: subDays(now, 2).toISOString() },
  { id: "te16", type: "document", summary: "Uploaded Q3 Financial Report", actor: "Omar Al-Fayed", personId: "p10", projectId: "prj4", timestamp: subDays(now, 2).toISOString() },
  { id: "te17", type: "note", summary: "Added note: Meeting with Eleanor: Phase 2 Logistics", actor: "Me", personId: "p1", projectId: "prj1", timestamp: subDays(now, 1).toISOString() },
  { id: "te18", type: "document", summary: "Uploaded Q4 Marketing Strategy", actor: "Julian Wright", personId: "p6", projectId: "prj2", timestamp: subDays(now, 1).toISOString() },
  { id: "te19", type: "meeting", summary: "Marketing Q4 Check-in Meeting", actor: "Julian Wright", personId: "p6", projectId: "prj2", timestamp: subHours(now, 6).toISOString() },
  { id: "te20", type: "document", summary: "Updated Budget Forecast 2025", actor: "Omar Al-Fayed", personId: "p10", projectId: "prj4", timestamp: subHours(now, 12).toISOString() },
  { id: "te21", type: "document", summary: "Updated System Migration Timeline", actor: "Eleanor Vance", personId: "p1", projectId: "prj1", timestamp: subHours(now, 24).toISOString() },
];

export const getPerson = (id: string) => PEOPLE.find(p => p.id === id);
export const getProject = (id: string) => PROJECTS.find(p => p.id === id);
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
