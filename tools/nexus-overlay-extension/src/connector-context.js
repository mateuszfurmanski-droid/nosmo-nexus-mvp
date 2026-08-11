(() => {
  const STORAGE_KEY = "nexusOverlayConnectorApiBase";
  const DEFAULT_API_BASE = "http://127.0.0.1:3000";
  const ALLOWED_API_BASES = new Set([
    DEFAULT_API_BASE,
    "https://nosmotechnology.co.uk"
  ]);

  function normaliseApiBase(value) {
    const candidate = String(value || "").trim().replace(/\/$/, "");
    return ALLOWED_API_BASES.has(candidate) ? candidate : null;
  }

  async function getApiBase() {
    const stored = await chrome.storage.local.get([STORAGE_KEY]);
    return normaliseApiBase(stored[STORAGE_KEY]) || DEFAULT_API_BASE;
  }

  async function setApiBase(value) {
    const apiBase = normaliseApiBase(value);
    if (!apiBase) throw new Error("Connector API origin is not allowed");
    await chrome.storage.local.set({ [STORAGE_KEY]: apiBase });
    return apiBase;
  }

  async function verifyDemoContext(context = {}) {
    const projectId = String(context.projectId || "").trim();
    const sourceRecord = String(context.externalRecordReference || "").trim();
    const sourceObjectType = String(context.selectedObjectType || "").trim();
    if (!projectId || !sourceRecord || !sourceObjectType) {
      throw new Error("Project, object type and external record reference are required");
    }

    const apiBase = await getApiBase();
    const response = await chrome.runtime.sendMessage({
      type: "NEXUS_VERIFY_WORK_WALLET_DEMO_CONTEXT",
      apiBase,
      projectId,
      personId: context.personId || null,
      sourceRecord,
      sourceObjectType
    });
    if (!response?.ok || !response.context) {
      throw new Error(response?.error || "Connector context unavailable");
    }
    return response.context;
  }

  function mergeVerifiedContext(current = {}, verified = {}) {
    if (
      verified.schema !== "nexus-work-wallet-context/v1" ||
      verified.contextSource !== "CONNECTOR_VERIFIED_CONTEXT" ||
      verified.developmentContext !== true ||
      verified.verificationSource !== "WORK_WALLET_DEMO"
    ) {
      throw new Error("Connector response is not a verified development context");
    }

    return {
      ...current,
      contextSchema: verified.schema,
      sourceApplication: "WORK_WALLET",
      projectId: verified.projectId,
      personId: verified.personId || current.personId || null,
      selectedObjectType: verified.selectedObjectType || current.selectedObjectType || null,
      externalRecordReference: verified.externalRecordReference,
      nexusNodeId: verified.nexusNodeId || null,
      contextSource: "CONNECTOR_VERIFIED_CONTEXT",
      contextConfidence: 1,
      developmentContext: true,
      verificationSource: verified.verificationSource,
      verifiedAt: verified.verifiedAt,
      sourceEventId: verified.sourceEventId
    };
  }

  globalThis.NexusOverlayConnectorContext = {
    STORAGE_KEY,
    DEFAULT_API_BASE,
    ALLOWED_API_BASES,
    getApiBase,
    setApiBase,
    verifyDemoContext,
    mergeVerifiedContext
  };
})();
