(() => {
  const runtime = globalThis.NexusOverlayRuntime;
  const recordMapping = globalThis.NexusOverlayRecordMapping;
  const ADAPTER_ID = "work-wallet";
  const ACTIONS = [
    ["project_tree", "Project Tree"],
    ["person_card", "Person Card"],
    ["tasks", "Tasks / Snags"],
    ["documents", "Documents / Plans"],
    ["communication", "Communication"],
    ["supplies", "Supplies / Purchases"],
    ["related_apps", "Related Apps"],
    ["connector_status", "Connector Status"],
    ["return_to_nexus", "Return to Nexus"]
  ];

  const $ = (id) => document.getElementById(id);
  const status = $("status");

  function list(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function setStatus(message) {
    status.textContent = message;
    window.setTimeout(() => {
      if (status.textContent === message) status.textContent = "";
    }, 2600);
  }

  function renderActionChecks(selected = []) {
    const selectedSet = new Set(selected);
    $("actionChecks").replaceChildren(
      ...ACTIONS.map(([key, label]) => {
        const row = document.createElement("label");
        row.className = "check";
        const input = document.createElement("input");
        input.type = "checkbox";
        input.value = key;
        input.checked = selectedSet.has(key);
        const text = document.createElement("span");
        text.textContent = label;
        row.append(input, text);
        return row;
      })
    );
  }

  function selectedActions() {
    return [...document.querySelectorAll('#actionChecks input[type="checkbox"]:checked')].map(
      (input) => input.value
    );
  }

  async function renderMappings() {
    const host = $("mappingList");
    if (!recordMapping) {
      const empty = document.createElement("div");
      empty.className = "mapping-empty";
      empty.textContent = "Mapping registry unavailable.";
      host.replaceChildren(empty);
      return;
    }

    const mappings = await recordMapping.getMappings();
    if (!mappings.length) {
      const empty = document.createElement("div");
      empty.className = "mapping-empty";
      empty.textContent = "No local Work Wallet mappings saved.";
      host.replaceChildren(empty);
      return;
    }

    host.replaceChildren(
      ...mappings.map((mapping) => {
        const row = document.createElement("div");
        row.className = "mapping-row";

        const copy = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = `${mapping.externalRecordReference} → ${mapping.nexusNodeId}`;
        const meta = document.createElement("span");
        meta.textContent = `${mapping.projectId || "NO_PROJECT"} · ${mapping.selectedObjectType} · USER CONFIRMED LOCAL`;
        copy.append(title, meta);

        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "Remove";
        remove.addEventListener("click", async () => {
          await recordMapping.removeMapping(mapping.id);
          await renderMappings();
          setStatus("Local mapping removed.");
        });

        row.append(copy, remove);
        return row;
      })
    );
  }

  async function load() {
    const context = await runtime.getStoredContext();
    const preference = await runtime.getAdapterPreference(ADAPTER_ID);

    $("projectId").value = context?.projectId || "";
    $("projectLabel").value = context?.projectLabel || "";
    $("personId").value = context?.personId || "";
    $("personLabel").value = context?.personLabel || "";
    $("roleContext").value = context?.roleContext?.join(", ") || "";
    $("tradeContext").value = context?.tradeContext?.join(", ") || "";
    $("selectedObjectType").value = context?.selectedObjectType || "";
    $("selectedObjectId").value = context?.selectedObjectId || "";
    $("returnRoute").value =
      context?.returnRoute ||
      "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree";
    $("adapterEnabled").checked = preference.enabled !== false;

    $("mappingProjectId").value = context?.projectId || "";
    $("mappingObjectType").value = context?.selectedObjectType || "";
    $("mappingExternalReference").value = context?.externalRecordReference || "";
    $("mappingNexusNodeId").value = "";

    renderActionChecks(
      context?.allowedActionKeys?.length
        ? context.allowedActionKeys
        : ACTIONS.map(([key]) => key)
    );
    await renderMappings();
  }

  $("openMock").addEventListener("click", () => {
    window.open(chrome.runtime.getURL("dev/mock-work-wallet.html"), "_blank", "noopener,noreferrer");
  });

  $("saveMapping").addEventListener("click", async () => {
    if (!recordMapping) {
      setStatus("Mapping registry unavailable.");
      return;
    }
    try {
      await recordMapping.setMapping({
        projectId: $("mappingProjectId").value.trim() || null,
        selectedObjectType: $("mappingObjectType").value.trim(),
        externalRecordReference: $("mappingExternalReference").value.trim(),
        nexusNodeId: $("mappingNexusNodeId").value.trim()
      });
      $("mappingNexusNodeId").value = "";
      await renderMappings();
      setStatus("Exact local Work Wallet → Nexus mapping saved.");
    } catch (error) {
      setStatus(error?.message || "Mapping could not be saved.");
    }
  });

  $("refreshMappings").addEventListener("click", renderMappings);

  $("save").addEventListener("click", async () => {
    await runtime.setStoredContext({
      projectId: $("projectId").value.trim() || null,
      projectLabel: $("projectLabel").value.trim() || null,
      personId: $("personId").value.trim() || null,
      personLabel: $("personLabel").value.trim() || null,
      roleContext: list($("roleContext").value),
      tradeContext: list($("tradeContext").value),
      selectedObjectType: $("selectedObjectType").value.trim() || null,
      selectedObjectId: $("selectedObjectId").value.trim() || null,
      sourceApplication: "WORK_WALLET",
      sourceUrl: "https://portal.work-wallet.com/",
      sourcePageType: "PORTAL_PAGE",
      externalRecordReference: null,
      returnRoute: $("returnRoute").value.trim(),
      returnGraphState: null,
      allowedActionKeys: selectedActions(),
      contextSource: "USER_CONFIRMED_CONTEXT",
      contextConfidence: 1,
      developmentContext: true
    });
    await runtime.setAdapterPreference(ADAPTER_ID, {
      enabled: $("adapterEnabled").checked
    });
    setStatus("Local development context saved.");
  });

  $("clear").addEventListener("click", async () => {
    await runtime.clearStoredContext();
    await load();
    setStatus("Nexus context cleared.");
  });

  $("reset").addEventListener("click", async () => {
    await runtime.setAdapterPreference(ADAPTER_ID, {
      enabled: true,
      launcherPosition: "right-center",
      sidecarOpen: false
    });
    $("adapterEnabled").checked = true;
    setStatus("Work Wallet adapter state reset.");
  });

  $("adapterEnabled").addEventListener("change", async (event) => {
    await runtime.setAdapterPreference(ADAPTER_ID, {
      enabled: event.currentTarget.checked,
      sidecarOpen: false
    });
    setStatus(event.currentTarget.checked ? "Adapter enabled." : "Adapter disabled.");
  });

  load();
})();
