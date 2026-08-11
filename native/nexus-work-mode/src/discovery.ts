import * as Calendar from "expo-calendar";
import * as Contacts from "expo-contacts";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

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
  "site",
  "project",
  "construction",
  "joiner",
  "joinery",
  "carpenter",
  "door",
  "fire door",
  "electrical",
  "electrician",
  "engineer",
  "manager",
  "supervisor",
  "foreman",
  "contractor",
  "subcontract",
  "bim",
  "drawing",
  "schedule",
  "snag",
  "inspection",
  "commissioning",
  "work wallet",
  "cscs",
  "smsts",
  "rams",
  "permit",
  "induction",
  "halifax",
  "riverside",
];

function normalise(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function scoreText(value: string) {
  const text = normalise(value);
  const hits = WORK_TERMS.filter((term) => text.includes(term));
  return { hits, score: Math.min(99, 58 + hits.length * 9) };
}

function uniqueId(source: DiscoverySource, raw: string) {
  const safe = raw.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80);
  return `${source}-${safe || Date.now()}`;
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
    if (scored.hits.length === 0) return [];

    const company = contact.company?.trim();
    const role = contact.jobTitle?.trim();
    return [{
      id: uniqueId("contacts", contact.id ?? contact.name),
      source: "contacts" as const,
      title: contact.name || "Work contact",
      subtitle: [role, company].filter(Boolean).join(" · ") || "Possible work contact",
      confidence: scored.score,
      reason: `Matched work signals: ${scored.hits.slice(0, 4).join(", ")}.`,
      selected: true,
      personHint: contact.name,
      projectHint: scored.hits.find((hit) => hit === "halifax" || hit === "riverside"),
    }];
  });
}

export async function discoverCalendar(): Promise<DiscoveryItem[]> {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (permission.status !== "granted") throw new Error("Calendar permission was not granted.");

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const calendarIds = calendars.filter((calendar) => calendar.isVisible !== false).map((calendar) => calendar.id);
  if (calendarIds.length === 0) return [];

  const start = new Date();
  start.setDate(start.getDate() - 90);
  const end = new Date();
  end.setDate(end.getDate() + 120);

  const events = await Calendar.getEventsAsync(calendarIds, start, end);
  return events.flatMap((event) => {
    const candidate = [event.title, event.location, event.notes, event.organizerEmail].filter(Boolean).join(" ");
    const scored = scoreText(candidate);
    if (scored.hits.length === 0) return [];

    const when = new Date(event.startDate).toLocaleDateString();
    return [{
      id: uniqueId("calendar", event.id),
      source: "calendar" as const,
      title: event.title || "Work calendar event",
      subtitle: [when, event.location].filter(Boolean).join(" · "),
      confidence: Math.min(96, scored.score),
      reason: `Calendar content contains work signals: ${scored.hits.slice(0, 4).join(", ")}.`,
      selected: true,
      projectHint: scored.hits.find((hit) => hit === "halifax" || hit === "riverside"),
    }];
  });
}

export async function pickDocuments(): Promise<DiscoveryItem[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain", "image/*"],
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
      projectHint: scored.hits.find((hit) => hit === "halifax" || hit === "riverside"),
      uri: asset.uri,
    };
  });
}

export async function pickPhotos(): Promise<DiscoveryItem[]> {
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: true,
    quality: 0.35,
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
      projectHint: scored.hits.find((hit) => hit === "halifax" || hit === "riverside"),
      uri: asset.uri,
    };
  });
}
