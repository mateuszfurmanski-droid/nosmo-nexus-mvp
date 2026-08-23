import { mapOdkSubmissionToNexusContext } from "../../../../src/connectors/odk/odkSubmissionContextMapping";
import { odkEphemeralSnapshot } from "./odkEphemeralSnapshot";

export const odkDemoContextMapping = mapOdkSubmissionToNexusContext({
  sourceProjectId: odkEphemeralSnapshot.project.id,
  sourceFormId: odkEphemeralSnapshot.form.xmlFormId,
  submission: odkEphemeralSnapshot.submission,
  observedAt: odkEphemeralSnapshot.capturedAt,
  contextLinks: [
    {
      objectType: "Project",
      nexusObjectId: "residential-building-demo",
      relationship: "context-for",
    },
    {
      objectType: "Room",
      nexusObjectId: "building-01-room-02-14",
      relationship: "located-in",
    },
    {
      objectType: "Asset",
      nexusObjectId: "door-02-14",
      relationship: "concerns",
    },
    {
      objectType: "Evidence",
      nexusObjectId: "inspection-evidence-review-queue",
      relationship: "supports",
    },
  ],
});
