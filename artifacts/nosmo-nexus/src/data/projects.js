export const projects = [
  {
    id: "project_halifax_lloyds_bank",
    displayName: "Halifax / Lloyds Bank",
    projectType: "Bank fit-out / refurbishment / joinery / snagging",
    status: "demo_project",
    organisation: "360 Interiors",
    locationLabel: "Halifax",
    dataSources: [
      {
        id: "source_pdf_plans",
        type: "pdf_plans",
        label: "PDF Plans",
        status: "available"
      },
      {
        id: "source_door_schedule_excel",
        type: "excel",
        label: "Door Schedule Excel",
        status: "available"
      },
      {
        id: "source_snag_jpg",
        type: "photos",
        label: "Snag JPG Photos",
        status: "available"
      },
      {
        id: "source_site_notes",
        type: "notes",
        label: "Site Notes / Verbal Instructions",
        status: "manual_entry"
      }
    ],
    demoGoal: "Show how Nexus links people, roles, documents, doors, snags, photos, decisions and next actions.",
    privacy: {
      publicDemo: "Use masked names/contact data where required.",
      internalDemo: "Use real working data only inside private development environment."
    }
  }
];
