import { FileCheck2, FileText, GitCompareArrows } from "lucide-react";
import { readPersistedChangeEvents, type NexusChangeEventProjection } from "@/bim/change-event-persistence";
import {
  NODES,
  OBJECT_LINKS,
  PERSON_LINKS,
  TASK_LINKS,
  type WorkspaceNode,
} from "@/components/workspace-data";
import { SYNTHETIC_CHANGE_EVENTS } from "./change-event-projection";

function appendNode(node: WorkspaceNode) {
  if (!NODES.some((existing) => existing.id === node.id)) NODES.push(node);
}

function appendDirectLink(a: string, b: string) {
  if (!NODES.some((node) => node.id === a) || !NODES.some((node) => node.id === b)) return;
  if (!PERSON_LINKS.some(([left, right]) => (left === a && right === b) || (left === b && right === a))) {
    // The current persistent graph uses PERSON_LINKS as its generic direct-edge
    // compatibility registry. Keep this shim isolated here until the graph edge
    // registry is renamed/refactored; these are not person-only semantics.
    PERSON_LINKS.push([a, b]);
  }
}

function appendTaskDocument(taskId: string, documentId: string) {
  const task = TASK_LINKS[taskId];
  if (!task || task.docs.includes(documentId)) return;
  task.docs.push(documentId);
}

function appendObjectDocument(objectId: string, documentId: string) {
  const object = OBJECT_LINKS[objectId];
  if (!object || object.docs.includes(documentId)) return;
  object.docs.push(documentId);
}

function temporalOffset(decidedAt: string, minutes: number) {
  const value = Date.parse(decidedAt);
  if (!Number.isFinite(value)) return decidedAt;
  return new Date(value + minutes * 60_000).toISOString();
}

function projectEvent(event: NexusChangeEventProjection) {
  const objectLinks = OBJECT_LINKS[event.objectId];
  const rfiId = event.links.rfis[0];
  const evidenceId = event.links.documents.find((id) => id.startsWith("d-chg-evidence"));
  const sourceLabel = event.synthetic ? "SYNTHETIC" : "BROWSER-PERSISTED";

  // Current radial Timeline positions temporal records through the document
  // primitive. The node ID remains the canonical Change Event ID; no duplicate
  // timeline/event model is created. A later graph-schema slice can introduce a
  // first-class `change` NodeType without changing event identity or links.
  appendNode({
    id: event.id,
    label: `Change Event · ${event.decision.code.replaceAll("_", " ")}`,
    sublabel: `${event.objectId} · ${event.reviewState.replaceAll("_", " ")} · ${sourceLabel}`,
    type: "document",
    Icon: GitCompareArrows,
    receivedAt: event.decision.decidedAt,
    documentDate: event.decision.decidedAt.slice(0, 10),
    externalId: event.ifcGlobalId,
    trade: event.trade,
    workPackage: event.workPackage,
  });

  if (rfiId) {
    appendNode({
      id: rfiId,
      label: `${rfiId} · Revision information request`,
      sublabel: `RFI · Prepared from ${event.id} · ${sourceLabel}`,
      type: "document",
      Icon: FileText,
      receivedAt: temporalOffset(event.decision.decidedAt, 2),
      documentDate: event.decision.decidedAt.slice(0, 10),
      externalId: event.id,
      trade: event.trade,
      workPackage: event.workPackage,
    });
  }

  if (evidenceId) {
    appendNode({
      id: evidenceId,
      label: `${event.objectId} revision evidence set`,
      sublabel: `Evidence requirement · ${sourceLabel}`,
      type: "document",
      Icon: FileCheck2,
      receivedAt: temporalOffset(event.decision.decidedAt, 3),
      documentDate: event.decision.decidedAt.slice(0, 10),
      externalId: event.id,
      trade: event.trade,
      workPackage: event.workPackage,
    });
  }

  appendTaskDocument(event.taskId, event.id);
  appendObjectDocument(event.objectId, event.id);
  if (rfiId) {
    appendTaskDocument(event.taskId, rfiId);
    appendObjectDocument(event.objectId, rfiId);
    appendDirectLink(event.id, rfiId);
  }
  if (evidenceId) {
    appendTaskDocument(event.taskId, evidenceId);
    appendObjectDocument(event.objectId, evidenceId);
    appendDirectLink(event.id, evidenceId);
  }

  // Canonical object relationships enrich a persisted event without requiring
  // Change Control to copy graph-specific person/inspection IDs into storage.
  if (objectLinks) {
    for (const personId of objectLinks.people) appendDirectLink(event.id, personId);
    for (const docId of objectLinks.docs) appendDirectLink(event.id, docId);
    for (const issueId of objectLinks.issues) appendDirectLink(event.id, issueId);
    for (const inspectionId of objectLinks.inspections) appendDirectLink(event.id, inspectionId);
  }

  for (const personId of event.links.people) appendDirectLink(event.id, personId);
  for (const documentId of event.links.documents) appendDirectLink(event.id, documentId);
  for (const issueId of event.links.issues) appendDirectLink(event.id, issueId);
  for (const inspectionId of event.links.inspections) {
    appendDirectLink(event.id, inspectionId);
    if (evidenceId) appendDirectLink(evidenceId, inspectionId);
  }
  appendDirectLink(event.id, event.objectId);
  appendDirectLink(event.id, event.taskId);
}

export function applyPersistedChangeEventsToProjectGraph() {
  const byId = new Map<string, NexusChangeEventProjection>();
  for (const event of SYNTHETIC_CHANGE_EVENTS) byId.set(event.id, event);
  for (const event of readPersistedChangeEvents()) byId.set(event.id, event);
  for (const event of byId.values()) projectEvent(event);
  return [...byId.values()];
}
