import * as Calendar from "expo-calendar";
import * as Contacts from "expo-contacts";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Directory, File } from "expo-file-system";

export type DiscoverySource = "contacts" | "calendar" | "documents" | "photos";

export type DiscoveryItem = {
  id: string;
  source: DiscoverySource;
  title: string;
  subtitle: string;
  confidence: number;
  reason: string;
  selected: boolean;
  projectHint?: string;
  personHint?: string;
  uri?: string;
};

const WORK_TERMS = [
  "site", "project", "construction", "joiner", "joinery", "carpenter", "carpentry",
  "door", "fire door", "electrical", "electrician", "engineer", "manager", "supervisor",
  "foreman", "contractor", "subcontract", "bim", "drawing", "schedule", "snag", "inspection",
  "commissioning", "work wallet", "cscs", "smsts", "sssts", "rams", "ram", "permit", "induction",
  "method statement", "risk assessment", "timesheet", "invoice", "purchase order", "po ", "variation",
  "rfi", "qa", "qc", "handover", "as built", "as-built", "floor", "level", "room", "asset",
  "hilti", "procore", "autodesk", "sharepoint", "onedrive", "companycam", "fabstation",
  "halifax", "riverside", "tesco", "fit out", "fit-out", "mep", "hvac", "plumbing", "drylining",
];

const WORK_EXTENSIONS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".csv", ".txt",
  ".dwg", ".dxf", ".ifc", ".rvt", ".nwd", ".nwc", ".ppt", ".pptx",
  ".jpg", ".jpeg", ".png", ".heic", ".webp",
]);

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com", "icloud.com", "yahoo.com",
  "wp.pl", "o2.pl", "interia.pl", "onet.pl", "proton.me", "protonmail.com",
]);

function normalise(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function scoreText(value: string) {
  const text = normalise(value);
  const hits = WORK_TERMS.filter((term) => text.includes(term));
  return { hits, score: Math.min(99, 58 + hits.length * 9) };
}

function uniqueId(source: DiscoverySource, raw: string) {
  const safe = raw.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 90);
  return `${source}-${safe || Date.now()}`;
}

function emailDomain(email: string) {
  const at = email.lastIndexOf("@");
  return at > -1 ? email.slice(at + 1).toLowerCase() : "";
}

function projectHintFrom(hits: string[]) {
  return hits.find((hit) => hit === "halifax" || hit === "riverside" || hit === "tesco");
}

export async function discoverContacts(): Promise<DiscoveryItem[]> {
  const permission = await Contacts.requestPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Contacts permission was not granted.");

  const response = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.Name,
      Contacts.Fields.Company,
      Contacts.Fields.JobTitle,
      Contacts.Fields.Emails,
      Contacts.Fields.PhoneNumbers,
    ],
    pageSize: 0,
  });

  return response.data.flatMap((contact) => {
    const emails = (contact.emails ?? []).map((item) => item.email ?? "").filter(Boolean);
    const candidate = [contact.name, contact.company, contact.jobTitle, ...emails].join(" ");
    const scored = scoreText(candidate);
    const company = contact.company?.trim();
    const role = contact.jobTitle?.trim();
    const businessDomain = emails.map(emailDomain).find((domain) => domain && !PERSONAL_EMAIL_DOMAINS.has(domain));

    // Real work contacts are often stored simply as a company/job title, without words like "construction".
    if (scored.hits.length === 0 && !company && !role && !businessDomain) return [];

    const confidence = scored.hits.length > 0
      ? scored.score
      : businessDomain && (company || role)
        ? 82
        : company || role
          ? 72
          : 64;

    const reasons = [];
    if (scored.hits.length) reasons.push(`work signals: ${scored.hits.slice(0, 4).join(", ")}`);
    if (role) reasons.push(`job title: ${role}`);
    if (company) reasons.push(`company: ${company}`);
    if (businessDomain) reasons.push(`business email domain: ${businessDomain}`);

    return [{
      id: uniqueId("contacts", contact.id ?? contact.name),
      source: "contacts" as const,
      title: contact.name || "Work contact",
      subtitle: [role, company, businessDomain].filter(Boolean).join(" · ") || "Possible work contact",
      confidence,
      reason: `Matched ${reasons.slice(0, 3).join("; ")}.`,
      selected: true,
      personHint: contact.name,
      projectHint: projectHintFrom(scored.hits),
    }];
  }).sort((a, b) => b.confidence - a.confidence);
}

export async function discoverCalendar(): Promise<DiscoveryItem[]> {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Calendar permission was not granted.");

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const calendarIds = calendars.filter((calendar) => calendar.isVisible !== false).map((calendar) => calendar.id);
  if (calendarIds.length === 0) return [];

  const start = new Date();
  start.setDate(start.getDate() - 180);
  const end = new Date();
  end.setDate(end.getDate() + 180);

  const events = await Calendar.getEventsAsync(calendarIds, start, end);
  return events.flatMap((event) => {
    const organizer = event.organizerEmail ?? "";
    const domain = emailDomain(organizer);
    const businessDomain = domain && !PERSONAL_EMAIL_DOMAINS.has(domain) ? domain : "";
    const candidate = [event.title, event.location, event.notes, organizer].filter(Boolean).join(" ");
    const scored = scoreText(candidate);
    if (scored.hits.length === 0 && !businessDomain) return [];

    const when = new Date(event.startDate).toLocaleDateString();
    return [{
      id: uniqueId("calendar", event.id),
      source: "calendar" as const,
      title: event.title || "Work calendar event",
      subtitle: [when, event.location, businessDomain].filter(Boolean).join(" · "),
      confidence: scored.hits.length ? Math.min(96, scored.score) : 70,
      reason: scored.hits.length
        ? `Calendar content contains work signals: ${scored.hits.slice(0, 4).join(", ")}.`
        : `Calendar organiser uses business domain ${businessDomain}.`,
      selected: true,
      projectHint: projectHintFrom(scored.hits),
    }];
  }).sort((a, b) => b.confidence - a.confidence);
}

function itemFromFile(file: File): DiscoveryItem | null {
  const name = file.name || "Work file";
  const extension = file.extension.toLowerCase();
  const scored = scoreText(name);
  const supported = WORK_EXTENSIONS.has(extension);

  // Generic photos are not imported from a whole folder unless their name carries a work signal.
  const image = [".jpg", ".jpeg", ".png", ".heic", ".webp"].includes(extension);
  if (!supported || (image && scored.hits.length === 0)) return null;

  const confidence = scored.hits.length
    ? Math.min(99, scored.score + 8)
    : [".pdf", ".dwg", ".dxf", ".ifc", ".rvt", ".nwd", ".nwc"].includes(extension)
      ? 76
      : 66;

  return {
    id: uniqueId("documents", `${file.uri}-${file.size}`),
    source: "documents",
    title: name,
    subtitle: `${file.type || extension || "file"}${file.size ? ` · ${Math.max(1, Math.round(file.size / 1024))} KB` : ""}`,
    confidence,
    reason: scored.hits.length
      ? `Filename contains work signals: ${scored.hits.slice(0, 4).join(", ")}.`
      : `Recognised work-document format ${extension}.`,
    selected: true,
    projectHint: projectHintFrom(scored.hits),
    uri: file.uri,
  };
}

export async function scanWorkFolder(): Promise<DiscoveryItem[]> {
  const root = (await Directory.pickDirectoryAsync()) as unknown as Directory;
  const found: DiscoveryItem[] = [];
  let visited = 0;
  const MAX_ENTRIES = 2000;
  const MAX_RESULTS = 350;
  const MAX_DEPTH = 5;

  const walk = (directory: Directory, depth: number) => {
    if (depth > MAX_DEPTH || visited >= MAX_ENTRIES || found.length >= MAX_RESULTS) return;
    let entries: Array<File | Directory> = [];
    try {
      entries = directory.list();
    } catch {
      return;
    }

    for (const entry of entries) {
      if (visited >= MAX_ENTRIES || found.length >= MAX_RESULTS) break;
      visited += 1;
      if (entry instanceof Directory) {
        walk(entry, depth + 1);
      } else if (entry instanceof File) {
        const item = itemFromFile(entry);
        if (item) found.push(item);
      }
    }
  };

  walk(root, 0);
  return found.sort((a, b) => b.confidence - a.confidence);
}

export async function pickDocuments(): Promise<DiscoveryItem[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "image/*",
    ],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];

  return result.assets.map((asset) => {
    const scored = scoreText(asset.name);
    const confidence = scored.hits.length > 0 ? Math.min(99, scored.score + 8) : 72;
    return {
      id: uniqueId("documents", `${asset.name}-${asset.size ?? 0}`),
      source: "documents" as const,
      title: asset.name,
      subtitle: asset.mimeType ?? "Selected work document",
      confidence,
      reason: scored.hits.length > 0
        ? `Filename contains work signals: ${scored.hits.slice(0, 4).join(", ")}.`
        : "You explicitly selected this file for Nexus Work Mode review.",
      selected: true,
      projectHint: projectHintFrom(scored.hits),
      uri: asset.uri,
    };
  });
}

export async function pickPhotos(): Promise<DiscoveryItem[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: true,
    quality: 0.6,
  });
  if (result.canceled) return [];

  return result.assets.map((asset, index) => {
    const name = asset.fileName ?? `Work photo ${index + 1}`;
    const scored = scoreText(name);
    return {
      id: uniqueId("photos", `${name}-${asset.assetId ?? index}`),
      source: "photos" as const,
      title: name,
      subtitle: `${asset.width}×${asset.height} · selected photo`,
      confidence: scored.hits.length > 0 ? Math.min(99, scored.score + 8) : 88,
      reason: scored.hits.length > 0
        ? `Photo metadata contains work signals: ${scored.hits.slice(0, 4).join(", ")}.`
        : "You explicitly selected this photo as work evidence.",
      selected: true,
      projectHint: projectHintFrom(scored.hits),
      uri: asset.uri,
    };
  });
}
