(() => {
  const runtime = globalThis.NexusOverlayRuntime;
  const sidecar = globalThis.NexusOverlaySidecar;
  if (!runtime || !sidecar?.mount) return;

  const RELATIONSHIP_TREE_URL =
    "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree";
  const SAFE_NEXUS_NODE_ID = /^[A-Za-z0-9_-]+$/;
  const MAX_NEXUS_NODE_ID_LENGTH = 80;

  // Explicit synthetic mappings only. These references belong to the local mock
  // harness and are never inferred from live Work Wallet records.
  const MOCK_NEXUS_NODE_MAP = new Map([
    ["project|halifax-demo", "proj"],
    ["person|person-demo-001", "p-mateusz"],
    ["job|JOB-01", "t-install"]
  ]);

  function safeNexusNodeId(value) {
    const candidate = String(value || "").trim();
    if (!candidate || candidate.length > MAX_NEXUS_NODE_ID_LENGTH) return null;
    return SAFE_NEXUS_NODE_ID.test(candidate) ? candidate : null;
  }

  function explicitMockNodeId(value = {}) {
    if (value.developmentContext !== true) return null;
    let sourceUrl;
    try {
      sourceUrl = new URL(value.sourceUrl || "");
    } catch {
      return null;
    }
    if (sourceUrl.origin !== "https://portal.work-wallet.com") return null;
    if (!sourceUrl.pathname.startsWith("/mock/")) return null;

    const key = `${value.selectedObjectType || ""}|${value.selectedObjectId || ""}`;
    return MOCK_NEXUS_NODE_MAP.get(key) || null;
  }

  function resolveNexusNodeId(value = {}) {
    return safeNexusNodeId(value.nexusNodeId) || explicitMockNodeId(value);
  }

  function buildRelationshipTreeUrl(context) {
    const nexusNodeId = resolveNexusNodeId(context || {});
    if (!nexusNodeId) return RELATIONSHIP_TREE_URL;

    const target = new URL(RELATIONSHIP_TREE_URL);
    target.searchParams.set("nexusSource", "work-wallet");
    target.searchParams.set("nexusFocus", nexusNodeId);
    return target.toString();
  }

  // Extend the universal Context Packet without changing the Work Wallet source
  // of record. nexusNodeId is Nexus-internal navigation metadata only.
  const originalNormaliseContext = runtime.normaliseContext.bind(runtime);
  runtime.normaliseContext = (value = {}) => ({
    ...originalNormaliseContext(value),
    nexusNodeId: resolveNexusNodeId(value)
  });

  const originalSetStoredContext = runtime.setStoredContext.bind(runtime);
  runtime.setStoredContext = async (value = {}) => {
    const base = await originalSetStoredContext(value);
    const extended = runtime.normaliseContext({
      ...base,
      nexusNodeId: resolveNexusNodeId(value) || resolveNexusNodeId(base)
    });
    await chrome.storage.local.set({ [runtime.STORAGE_KEYS.context]: extended });
    return extended;
  };

  runtime.getStoredContext = async () => {
    const stored = await chrome.storage.local.get([runtime.STORAGE_KEYS.context]);
    const raw = stored[runtime.STORAGE_KEYS.context];
    return raw ? runtime.normaliseContext(raw) : null;
  };

  const originalMount = sidecar.mount.bind(sidecar);
  sidecar.mount = async (args) => {
    const activeContext = { current: args?.context || null };
    const mounted = await originalMount(args);
    const originalRender = mounted.render?.bind(mounted);

    const patchProjectTreeButton = () => {
      const shadow = mounted.host?.shadowRoot;
      if (!shadow) return;

      const originalButton = [...shadow.querySelectorAll(".nexus-action")].find((button) =>
        button.querySelector("b")?.textContent?.includes("Project Tree")
      );
      if (!originalButton || originalButton.dataset.nexusTreeHandoff === "true") return;

      const button = originalButton.cloneNode(true);
      button.dataset.nexusTreeHandoff = "true";
      const nexusNodeId = resolveNexusNodeId(activeContext.current || {});
      const state = button.querySelector("span");
      if (state) state.textContent = nexusNodeId ? `Open focused: ${nexusNodeId}` : "Open tree";

      if (!button.disabled) {
        button.addEventListener("click", async () => {
          const target = buildRelationshipTreeUrl(activeContext.current);
          await runtime.logDiagnostic("NEXUS_ACTION_OPENED", {
            adapterId: args?.adapter?.adapter_id || "work-wallet",
            actionKey: "project_tree",
            contextSource: activeContext.current?.contextSource || null
          });
          await runtime.logDiagnostic("RELATIONSHIP_TREE_HANDOFF_OPENED", {
            adapterId: args?.adapter?.adapter_id || "work-wallet",
            actionKey: "project_tree",
            contextSource: activeContext.current?.contextSource || null
          });
          window.open(target, "_blank", "noopener,noreferrer");
        });
      }

      originalButton.replaceWith(button);
    };

    mounted.render = (context, preference) => {
      activeContext.current = context;
      originalRender?.(context, preference);
      patchProjectTreeButton();
    };

    patchProjectTreeButton();
    return mounted;
  };

  globalThis.NexusOverlayTreeHandoff = {
    buildRelationshipTreeUrl,
    resolveNexusNodeId
  };
})();
