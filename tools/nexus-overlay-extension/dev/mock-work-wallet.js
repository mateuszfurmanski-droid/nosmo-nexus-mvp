(() => {
  const runtime = globalThis.NexusOverlayRuntime;
  const sidecar = globalThis.NexusOverlaySidecar;
  const ADAPTER_ID = "work-wallet";

  if (!runtime || !sidecar) return;

  const ROUTES = {
    dashboard: {
      title: "Dashboard",
      hero: "Project safety overview",
      text: "Synthetic content used to verify that the Nexus launcher and sidecar can coexist with an external construction application.",
      number: "12",
      label: "open actions",
      cards: [["People on project", "48"], ["Permits active", "7"], ["Audits due", "3"]],
      records: [["WW-101", "Action", "Demo Manager", "Open"], ["WW-102", "Briefing", "Site Team", "Complete"], ["WW-103", "Audit", "H&S Lead", "Due"]]
    },
    people: {
      title: "People",
      hero: "Project workforce",
      text: "Mock person records let the Nexus sidecar be tested beside a people-oriented external page without reading real user data.",
      number: "48",
      label: "people",
      cards: [["Managers", "5"], ["Trades", "39"], ["Visitors", "4"]],
      records: [["P-001", "Joiner", "Demo User", "Active"], ["P-002", "Electrician", "Demo User 2", "Active"], ["P-003", "Manager", "Demo Manager", "Active"]]
    },
    jobs: {
      title: "Jobs",
      hero: "Project work areas",
      text: "Synthetic job cards emulate route changes so the overlay continuity watcher can be exercised without a Work Wallet account.",
      number: "6",
      label: "live jobs",
      cards: [["Open", "6"], ["Due today", "2"], ["Completed", "18"]],
      records: [["JOB-01", "Fire doors", "Joinery", "Open"], ["JOB-02", "Containment", "Electrical", "Open"], ["JOB-03", "Ceiling checks", "QA", "Complete"]]
    },
    permits: {
      title: "Permits",
      hero: "Permit register",
      text: "The Nexus prototype must never approve or submit these mock permit records automatically; the page exists only to test coexistence and context.",
      number: "7",
      label: "active permits",
      cards: [["Active", "7"], ["Awaiting review", "2"], ["Expired", "1"]],
      records: [["PER-201", "Hot works", "Demo Manager", "Active"], ["PER-202", "Access", "Site Team", "Review"], ["PER-203", "Isolation", "Electrical", "Active"]]
    },
    audits: {
      title: "Audits",
      hero: "Audit schedule",
      text: "This simulated audit page verifies that Nexus remains present while the external application's content changes.",
      number: "3",
      label: "due audits",
      cards: [["Due", "3"], ["Passed", "14"], ["Actions raised", "5"]],
      records: [["AUD-11", "Site", "H&S Lead", "Due"], ["AUD-12", "Fire door", "QA", "Passed"], ["AUD-13", "Electrical", "Supervisor", "Passed"]]
    },
    risk: {
      title: "Risk",
      hero: "Risk assessments",
      text: "Only mock references are displayed. PKG-013 does not extract sensitive incident, health or safety record content from Work Wallet.",
      number: "9",
      label: "current assessments",
      cards: [["Current", "9"], ["Review due", "2"], ["Archived", "21"]],
      records: [["RAMS-01", "Joinery", "Supervisor", "Current"], ["RAMS-02", "Electrical", "Supervisor", "Review"], ["RAMS-03", "Access", "Site Team", "Current"]]
    }
  };

  const PAGE_CONTEXT = {
    dashboard: {
      selectedObjectType: "project",
      selectedObjectId: "halifax-demo",
      externalRecordReference: "WW-101"
    },
    people: {
      personId: "person-demo-001",
      personLabel: "Demo User",
      selectedObjectType: "person",
      selectedObjectId: "person-demo-001",
      externalRecordReference: "P-001"
    },
    jobs: {
      selectedObjectType: "job",
      selectedObjectId: "JOB-01",
      externalRecordReference: "JOB-01"
    },
    permits: {
      selectedObjectType: "permit",
      selectedObjectId: "PER-201",
      externalRecordReference: "PER-201"
    },
    audits: {
      selectedObjectType: "audit",
      selectedObjectId: "AUD-11",
      externalRecordReference: "AUD-11"
    },
    risk: {
      selectedObjectType: "risk_assessment",
      selectedObjectId: "RAMS-01",
      externalRecordReference: "RAMS-01"
    }
  };

  let adapter = null;
  let mounted = null;
  let stopWatch = null;

  const $ = (id) => document.getElementById(id);

  function routeName() {
    const raw = location.hash.replace(/^#\/?/, "").trim();
    return Object.hasOwn(ROUTES, raw) ? raw : "dashboard";
  }

  function syntheticPortalUrl(route = routeName()) {
    return `https://portal.work-wallet.com/mock/${route}`;
  }

  function pageType(route = routeName()) {
    if (route === "permits") return "PERMIT_PAGE";
    if (route === "audits") return "AUDIT_PAGE";
    if (route === "risk") return "RISK_PAGE";
    if (route === "jobs") return "JOB_PAGE";
    if (route === "people") return "PERSON_PAGE";
    return "PORTAL_PAGE";
  }

  function pageContext(route = routeName()) {
    return PAGE_CONTEXT[route] || PAGE_CONTEXT.dashboard;
  }

  function setLabStatus(text) {
    $("labStatus").textContent = text;
    window.setTimeout(() => {
      if ($("labStatus").textContent === text) $("labStatus").textContent = "";
    }, 2600);
  }

  function renderMockPage() {
    const route = routeName();
    const data = ROUTES[route];
    $("pageTitle").textContent = data.title;
    $("heroTitle").textContent = data.hero;
    $("heroText").textContent = data.text;
    $("heroNumber").textContent = data.number;
    $("heroLabel").textContent = data.label;
    $("routeBadge").textContent = route;

    $("cards").replaceChildren(
      ...data.cards.map(([label, value]) => {
        const card = document.createElement("article");
        card.className = "card";
        const small = document.createElement("span");
        small.textContent = label;
        const strong = document.createElement("strong");
        strong.textContent = value;
        card.append(small, strong);
        return card;
      })
    );

    $("records").replaceChildren(
      ...data.records.map((row) => {
        const tr = document.createElement("tr");
        row.forEach((value) => {
          const td = document.createElement("td");
          td.textContent = value;
          tr.appendChild(td);
        });
        return tr;
      })
    );

    document.querySelectorAll("#mockNav button").forEach((button) => {
      button.classList.toggle("active", button.dataset.route === route);
    });
  }

  async function overlayContext() {
    const existing = await runtime.getStoredContext();
    if (!existing) return null;
    const detected = pageContext();
    return runtime.normaliseContext({
      ...existing,
      ...detected,
      sourceApplication: "WORK_WALLET",
      sourceUrl: syntheticPortalUrl(),
      sourcePageType: pageType()
    });
  }

  async function destroyOverlay() {
    if (stopWatch) {
      stopWatch();
      stopWatch = null;
    }
    mounted?.destroy();
    mounted = null;
  }

  async function bootOverlay() {
    adapter = adapter || (await runtime.getAdapter(ADAPTER_ID));
    const preference = await runtime.getAdapterPreference(ADAPTER_ID);
    if (!preference.enabled) {
      await destroyOverlay();
      return;
    }

    const context = await overlayContext();
    mounted?.destroy();
    mounted = await sidecar.mount({
      adapter,
      context,
      preference,
      onDisable: destroyOverlay
    });

    if (stopWatch) stopWatch();
    stopWatch = runtime.watchLocation(async () => {
      renderMockPage();
      if (!mounted) return;
      const nextContext = await overlayContext();
      const nextPreference = await runtime.getAdapterPreference(ADAPTER_ID);
      mounted.render(nextContext, nextPreference);
      await runtime.logDiagnostic("EXTERNAL_PAGE_CONTEXT_DETECTED", {
        adapterId: ADAPTER_ID,
        sourceUrl: syntheticPortalUrl(),
        contextSource: nextContext?.contextSource || null
      });
    });
  }

  async function seedContext() {
    const detected = pageContext();
    await runtime.setStoredContext({
      projectId: "halifax-demo",
      projectLabel: "Halifax Demo",
      personId: detected.personId || "person-demo-manager",
      personLabel: detected.personLabel || "Demo Manager",
      roleContext: ["Manager"],
      tradeContext: ["Joinery"],
      selectedObjectType: detected.selectedObjectType,
      selectedObjectId: detected.selectedObjectId,
      sourceApplication: "WORK_WALLET",
      sourceUrl: syntheticPortalUrl(),
      sourcePageType: pageType(),
      externalRecordReference: detected.externalRecordReference,
      returnRoute: "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree",
      returnGraphState: null,
      allowedActionKeys: [
        "project_tree",
        "person_card",
        "tasks",
        "documents",
        "communication",
        "related_apps",
        "connector_status",
        "return_to_nexus"
      ],
      contextSource: "USER_CONFIRMED_CONTEXT",
      contextConfidence: 1,
      developmentContext: true
    });
    await runtime.setAdapterPreference(ADAPTER_ID, { enabled: true, sidecarOpen: false });
    await bootOverlay();
    setLabStatus("Halifax demo context seeded.");
  }

  document.querySelectorAll("#mockNav button").forEach((button) => {
    button.addEventListener("click", () => {
      location.hash = button.dataset.route;
    });
  });

  $("seedContext").addEventListener("click", seedContext);
  $("clearContext").addEventListener("click", async () => {
    await runtime.clearStoredContext();
    await bootOverlay();
    setLabStatus("Nexus context cleared.");
  });
  $("enableOverlay").addEventListener("click", async () => {
    await runtime.setAdapterPreference(ADAPTER_ID, { enabled: true, sidecarOpen: false });
    await bootOverlay();
    setLabStatus("Overlay enabled.");
  });
  $("openOptions").addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== "local") return;
    if (changes[runtime.STORAGE_KEYS.context] || changes[runtime.STORAGE_KEYS.preferences]) {
      await bootOverlay();
    }
  });

  if (!location.hash) location.hash = "dashboard";
  renderMockPage();
  bootOverlay().catch(() => setLabStatus("Overlay boot failed. Reload the extension and retry."));
})();
