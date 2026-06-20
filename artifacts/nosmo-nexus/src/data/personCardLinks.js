export const personCardLinks = [
  {
    id: "link_001_akeem_site_manager_doors",
    projectId: "project_halifax_lloyds_bank",
    personId: "person_003_akeem",
    linkType: "responsible_for_site_coordination",
    relatedObjects: [
      "door_schedule",
      "pdf_plans",
      "snag_photos",
      "site_instructions",
      "handover_evidence"
    ],
    exampleScenario: {
      issue: "Door not closing correctly",
      objectType: "door",
      status: "open",
      assignedPeople: [
        "person_004_mateusz_furmanski",
        "person_005_mateusz_zuchowski"
      ],
      nextAction: "Adjust closer, take completion photo, send update to Akeem."
    }
  },
  {
    id: "link_002_mateusz_f_joinery_snags",
    projectId: "project_halifax_lloyds_bank",
    personId: "person_004_mateusz_furmanski",
    linkType: "assigned_joinery_work",
    relatedObjects: [
      "door_schedule",
      "snag_photos",
      "completion_photos",
      "second_fix_tasks"
    ],
    exampleScenario: {
      issue: "Door ironmongery adjustment required",
      objectType: "door",
      status: "in_progress",
      assignedPeople: ["person_004_mateusz_furmanski"],
      nextAction: "Complete adjustment and upload final photo."
    }
  },
  {
    id: "link_003_mateusz_z_joinery_snags",
    projectId: "project_halifax_lloyds_bank",
    personId: "person_005_mateusz_zuchowski",
    linkType: "assigned_joinery_work",
    relatedObjects: [
      "door_schedule",
      "snag_photos",
      "completion_photos",
      "second_fix_tasks"
    ],
    exampleScenario: {
      issue: "Door leaf or frame detail requires checking",
      objectType: "door",
      status: "open",
      assignedPeople: ["person_005_mateusz_zuchowski"],
      nextAction: "Check against PDF plan and door schedule."
    }
  },
  {
    id: "link_004_labour_support",
    projectId: "project_halifax_lloyds_bank",
    personId: "person_007_boo",
    linkType: "labour_support",
    relatedObjects: [
      "material_movement",
      "cleaning_tasks",
      "site_preparation",
      "handover_support"
    ],
    exampleScenario: {
      issue: "Area needs clearing before joinery work",
      objectType: "work_area",
      status: "open",
      assignedPeople: ["person_007_boo", "person_008_jamie"],
      nextAction: "Clear area and confirm with photo."
    }
  },
  {
    id: "link_005_lee_escalation",
    projectId: "project_halifax_lloyds_bank",
    personId: "person_001_lee",
    linkType: "commercial_or_company_escalation",
    relatedObjects: [
      "major_blockers",
      "commercial_decisions",
      "resource_pressure",
      "client_escalations"
    ],
    exampleScenario: {
      issue: "Additional labour or approval required",
      objectType: "project_decision",
      status: "requires_decision",
      assignedPeople: ["person_001_lee"],
      nextAction: "Prepare short summary with photos, impact and required decision."
    }
  }
];
