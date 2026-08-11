import type { NexusChangeEventProjection } from "@/bim/change-event-persistence";

export type { NexusChangeEventProjection } from "@/bim/change-event-persistence";

/**
 * Synthetic fixture only. It demonstrates the persisted graph/timeline shape
 * before a real two-revision IFC decision is authorised and written.
 */
export const SYNTHETIC_CHANGE_EVENTS: NexusChangeEventProjection[] = [
  {
    schema: "nexus-change-event/v1",
    id: "CHG-NXS-MEP-003-DEMO-P04-P05",
    state: "DECIDED",
    synthetic: true,
    objectId: "NXS-MEP-003",
    ifcGlobalId: "IFC-4eT77m",
    trade: "Electrical",
    workPackage: "ELEC-L02-CONT-04",
    taskId: "TASK-E-214",
    reviewState: "HUMAN_REVIEW_REQUIRED",
    decision: {
      code: "RAISE_RFI",
      authorityRequired: "Project manager / design coordinator",
      decidedBy: "Sarah Wilson",
      decidedAt: "2026-08-11T05:40:00Z",
      note: "Coordinate the revised CT-E21 route before further installation. Synthetic decision for Project Graph validation only.",
    },
    source: {
      baselineFile: "MEP-Coordinated-P04.synthetic.ifc",
      currentFile: "MEP-Coordinated-P05.synthetic.ifc",
      baselineFingerprint: "SYNTH-P04",
      currentFingerprint: "SYNTH-P05",
    },
    links: {
      people: ["p-sitemgr", "p-elec-supervisor", "p-elec-team"],
      documents: ["d-bim-mep", "d-chg-evidence-ct-e21"],
      issues: ["NXS-ISS-041"],
      inspections: ["NXS-INSP-041"],
      rfis: ["RFI-DEMO-018"],
    },
  },
];
