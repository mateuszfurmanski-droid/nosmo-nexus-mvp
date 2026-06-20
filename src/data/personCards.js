export const personCards = [
  {
    id: "person_001_lee",
    displayName: "Lee",
    role: "CEO / Company Lead",
    company: "360 Interiors",
    category: "company_lead",
    projectIds: ["project_halifax_lloyds_bank"],
    contact: {
      phoneMasked: "07738 ***645",
      facebook: null
    },
    relationship: {
      type: "company_decision_maker",
      reportsTo: null,
      manages: ["person_002_tom", "person_003_akeem"],
      linkedPeople: ["person_002_tom", "person_003_akeem"]
    },
    responsibilities: [
      "Company-level decision making",
      "Commercial escalation",
      "Resource approval",
      "Final project-level authority"
    ],
    nexusQuestions: [
      "What issues need Lee's approval?",
      "What has been escalated to Lee?",
      "Which project blockers affect commercial decisions?"
    ],
    privacyLevel: "demo_masked",
    status: "active"
  },
  {
    id: "person_002_tom",
    displayName: "Tom",
    role: "Company Contact",
    company: "360 Interiors",
    category: "company_contact",
    projectIds: ["project_halifax_lloyds_bank"],
    contact: {
      phoneMasked: "07921 ***039",
      facebook: null
    },
    relationship: {
      type: "company_contact_family_link",
      reportsTo: "person_001_lee",
      manages: [],
      linkedPeople: ["person_001_lee", "person_003_akeem"]
    },
    responsibilities: [
      "Internal company communication",
      "Progress updates",
      "Site/company coordination support"
    ],
    nexusQuestions: [
      "What updates should Tom receive?",
      "Which site issues are linked to Tom?"
    ],
    privacyLevel: "demo_masked",
    status: "active"
  },
  {
    id: "person_003_akeem",
    displayName: "Akeem",
    role: "Site Manager",
    company: "360 Interiors",
    category: "site_manager",
    projectIds: ["project_halifax_lloyds_bank"],
    contact: {
      phoneMasked: "07507 ***360",
      facebook: null
    },
    relationship: {
      type: "site_authority",
      reportsTo: "person_001_lee",
      manages: [
        "person_004_mateusz_furmanski",
        "person_005_mateusz_zuchowski",
        "person_006_john",
        "person_007_boo",
        "person_008_jamie"
      ],
      linkedPeople: [
        "person_001_lee",
        "person_004_mateusz_furmanski",
        "person_005_mateusz_zuchowski",
        "person_006_john",
        "person_007_boo",
        "person_008_jamie"
      ]
    },
    responsibilities: [
      "Daily site management",
      "Task allocation",
      "Snag control",
      "Access and sequencing",
      "Site instructions",
      "Handover coordination"
    ],
    nexusQuestions: [
      "What did Akeem ask us to do?",
      "Which snags did Akeem assign?",
      "Which doors/items are still open?",
      "What evidence should be sent back to Akeem?"
    ],
    privacyLevel: "demo_masked",
    status: "active"
  },
  {
    id: "person_004_mateusz_furmanski",
    displayName: "Mateusz Furmański",
    role: "Joiner / Second Fix Joiner",
    company: "Freelancer",
    category: "freelancer_joiner",
    projectIds: ["project_halifax_lloyds_bank"],
    contact: {
      phoneMasked: "07474 ***800",
      facebook: null
    },
    relationship: {
      type: "freelancer_operative",
      reportsTo: "person_003_akeem",
      manages: [],
      linkedPeople: ["person_003_akeem", "person_005_mateusz_zuchowski"]
    },
    responsibilities: [
      "Joinery works",
      "Door fitting",
      "Ironmongery",
      "Second fix",
      "Snag resolution",
      "Completion photos"
    ],
    nexusQuestions: [
      "Which doors did Mateusz Furmański work on?",
      "Which snags are assigned to him?",
      "Which photos prove his work is complete?"
    ],
    privacyLevel: "demo_masked",
    status: "active"
  },
  {
    id: "person_005_mateusz_zuchowski",
    displayName: "Mateusz Zuchowski",
    role: "Joiner / Second Fix Joiner",
    company: "Freelancer",
    category: "freelancer_joiner",
    projectIds: ["project_halifax_lloyds_bank"],
    contact: {
      phoneMasked: "07925 ***415",
      facebook: "facebook_link_available_private"
    },
    relationship: {
      type: "freelancer_operative",
      reportsTo: "person_003_akeem",
      manages: [],
      linkedPeople: ["person_003_akeem", "person_004_mateusz_furmanski"]
    },
    responsibilities: [
      "Joinery works",
      "Door fitting",
      "Second fix",
      "Snag resolution",
      "Site labour support where required"
    ],
    nexusQuestions: [
      "Which work items relate to Mateusz Zuchowski?",
      "Which doors/snags are linked to him?",
      "What evidence confirms his completed work?"
    ],
    privacyLevel: "demo_masked",
    status: "active"
  },
  {
    id: "person_006_john",
    displayName: "John",
    role: "Joiner",
    company: "360 Interiors",
    category: "company_joiner",
    projectIds: ["project_halifax_lloyds_bank"],
    contact: {
      phoneMasked: "07498 ***078",
      facebook: null
    },
    relationship: {
      type: "company_operative",
      reportsTo: "person_003_akeem",
      manages: [],
      linkedPeople: ["person_003_akeem"]
    },
    responsibilities: [
      "Joinery works",
      "Doors",
      "Second fix",
      "Site tasks as assigned",
      "Snag completion"
    ],
    nexusQuestions: [
      "Which tasks were assigned to John?",
      "Which doors/items did John complete?",
      "Which snags remain open under John's work area?"
    ],
    privacyLevel: "demo_masked",
    status: "active"
  },
  {
    id: "person_007_boo",
    displayName: "Boo",
    role: "Labourer",
    company: "360 Interiors",
    category: "labourer",
    projectIds: ["project_halifax_lloyds_bank"],
    contact: {
      phoneMasked: "07437 ***457",
      facebook: null
    },
    relationship: {
      type: "site_operative_labour_support",
      reportsTo: "person_003_akeem",
      manages: [],
      linkedPeople: ["person_003_akeem", "person_008_jamie"]
    },
    responsibilities: [
      "Labouring support",
      "Moving materials",
      "Cleaning areas",
      "Assisting joiners",
      "Supporting snag completion"
    ],
    nexusQuestions: [
      "What labour tasks were given to Boo?",
      "Which areas did Boo help clear or prepare?"
    ],
    privacyLevel: "demo_masked",
    status: "active"
  },
  {
    id: "person_008_jamie",
    displayName: "Jamie",
    role: "Labourer",
    company: "360 Interiors",
    category: "labourer",
    projectIds: ["project_halifax_lloyds_bank"],
    contact: {
      phoneMasked: "07444 ***098",
      facebook: "facebook_link_available_private"
    },
    relationship: {
      type: "site_operative_labour_support",
      reportsTo: "person_003_akeem",
      manages: [],
      linkedPeople: ["person_003_akeem", "person_007_boo"]
    },
    responsibilities: [
      "Labouring support",
      "Moving materials",
      "Cleaning areas",
      "Assisting site team",
      "Supporting snag close-out"
    ],
    nexusQuestions: [
      "What tasks were given to Jamie?",
      "Which areas did Jamie help prepare?"
    ],
    privacyLevel: "demo_masked",
    status: "active"
  }
];
