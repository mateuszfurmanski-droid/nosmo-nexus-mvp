(() => {
  const STORAGE_KEYS = {
    context: "nexusOverlayContext",
    preferences: "nexusOverlayPreferences",
    diagnostics: "nexusOverlayDiagnostics",
    supplyRequests: "nexusOverlaySupplyRequests"
  };

  const CONTEXT_SOURCES = new Set([
    "NEXUS_LAUNCH_CONTEXT",
    "PAGE_DETECTED_CONTEXT",
    "USER_CONFIRMED_CONTEXT",
    "CONNECTOR_VERIFIED_CONTEXT"
  ]);

  const MAX_DIAGNOSTICS = 100;
  const MAX_SUPPLY_REQUESTS = 50;

  function now() {
    return new Date().toISOString();
  }

  function createSessionId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `nexus-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function cleanText(value, maxLength) {
    return String(value || "").trim().slice(0, maxLength);
  }

  function normaliseContext(value = {}) {
    const source = CONTEXT_SOURCES.has(value.contextSource)
      ? value.contextSource
      : "USER_CONFIRMED_CONTEXT";

    return {
      sessionId: value.sessionId || createSessionId(),
      projectId: value.projectId || null,
      projectLabel: value.projectLabel || null,
      personId: value.personId || null,
      personLabel: value.personLabel || null,
      roleContext: Array.isArray(value.roleContext) ? value.roleContext.filter(Boolean) : [],
      tradeContext: Array.isArray(value.tradeContext) ? value.tradeContext.filter(Boolean) : [],
      selectedObjectType: value.selectedObjectType || null,
      selectedObjectId: value.selectedObjectId || null,
      sourceApplication: value.sourceApplication || "WORK_WALLET",
      sourceUrl: value.sourceUrl || location.href,
      sourcePageType: value.sourcePageType || null,
      externalRecordReference: value.externalRecordReference || null,
      returnRoute:
        value.returnRoute ||
        "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree",
      returnGraphState: value.returnGraphState || null,
      allowedActionKeys: Array.isArray(value.allowedActionKeys)
        ? value.allowedActionKeys.filter(Boolean)
        : [],
      contextSource: source,
      contextConfidence:
        typeof value.contextConfidence === "number" ? value.contextConfidence : null,
      developmentContext: value.developmentContext === true,
      createdAt: value.createdAt || now(),
      updatedAt: now()
    };
  }

  function contextStatus(context) {
    if (!context?.projectId && !context?.personId) {
      return { label: "NO NEXUS CONTEXT", tone: "muted" };
    }
    if (context.developmentContext) {
      return { label: "DEMO / LOCAL CONTEXT", tone: "warning" };
    }
    if (context.contextSource === "CONNECTOR_VERIFIED_CONTEXT") {
      return { label: "CONNECTOR VERIFIED", tone: "success" };
    }
    if (context.contextSource === "PAGE_DETECTED_CONTEXT") {
      return { label: "DETECTED — NOT VERIFIED", tone: "warning" };
    }
    return { label: "NEXUS CONTEXT", tone: "info" };
  }

  async function getAdapter(adapterId) {
    const response = await chrome.runtime.sendMessage({
      type: "NEXUS_GET_ADAPTER",
      adapterId
    });
    if (!response?.ok) throw new Error(response?.error || "Adapter unavailable");
    return response.adapter;
  }

  async function getStoredContext() {
    const stored = await chrome.storage.local.get([STORAGE_KEYS.context]);
    if (!stored[STORAGE_KEYS.context]) return null;
    return normaliseContext(stored[STORAGE_KEYS.context]);
  }

  async function setStoredContext(context) {
    const normalised = normaliseContext(context);
    await chrome.storage.local.set({ [STORAGE_KEYS.context]: normalised });
    return normalised;
  }

  async function clearStoredContext() {
    await chrome.storage.local.remove(STORAGE_KEYS.context);
  }

  async function getAdapterPreference(adapterId) {
    const stored = await chrome.storage.local.get([STORAGE_KEYS.preferences]);
    const all = stored[STORAGE_KEYS.preferences] || {};
    return (
      all[adapterId] || {
        adapterId,
        enabled: true,
        launcherPosition: "right-center",
        sidecarOpen: false,
        lastUpdatedAt: now()
      }
    );
  }

  async function setAdapterPreference(adapterId, patch) {
    const stored = await chrome.storage.local.get([STORAGE_KEYS.preferences]);
    const all = stored[STORAGE_KEYS.preferences] || {};
    const current = await getAdapterPreference(adapterId);
    const next = {
      ...current,
      ...patch,
      adapterId,
      lastUpdatedAt: now()
    };
    await chrome.storage.local.set({
      [STORAGE_KEYS.preferences]: { ...all, [adapterId]: next }
    });
    return next;
  }

  async function getSupplyRequests() {
    const stored = await chrome.storage.local.get([STORAGE_KEYS.supplyRequests]);
    return Array.isArray(stored[STORAGE_KEYS.supplyRequests])
      ? stored[STORAGE_KEYS.supplyRequests]
      : [];
  }

  async function saveSupplyRequestDraft(value = {}) {
    const item = cleanText(value.item, 120);
    if (!item) throw new Error("Supply request item is required");

    const request = {
      id: createSessionId(),
      status: "LOCAL_DRAFT",
      item,
      quantity: cleanText(value.quantity, 40) || "1",
      note: cleanText(value.note, 400) || null,
      projectId: cleanText(value.projectId, 120) || null,
      projectLabel: cleanText(value.projectLabel, 160) || null,
      selectedObjectType: cleanText(value.selectedObjectType, 80) || null,
      selectedObjectId: cleanText(value.selectedObjectId, 160) || null,
      externalRecordReference: cleanText(value.externalRecordReference, 160) || null,
      sourceApplication: "WORK_WALLET",
      sourcePageType: cleanText(value.sourcePageType, 80) || null,
      sourceUrl: cleanText(value.sourceUrl, 500) || null,
      createdAt: now()
    };

    const current = await getSupplyRequests();
    const next = [request, ...current].slice(0, MAX_SUPPLY_REQUESTS);
    await chrome.storage.local.set({ [STORAGE_KEYS.supplyRequests]: next });
    return request;
  }

  async function logDiagnostic(eventType, details = {}) {
    const stored = await chrome.storage.local.get([STORAGE_KEYS.diagnostics]);
    const current = Array.isArray(stored[STORAGE_KEYS.diagnostics])
      ? stored[STORAGE_KEYS.diagnostics]
      : [];
    const safeDetails = {
      adapterId: details.adapterId || null,
      sourceUrl: details.sourceUrl || location.href,
      actionKey: details.actionKey || null,
      contextSource: details.contextSource || null,
      errorCode: details.errorCode || null
    };
    const next = [
      ...current,
      { eventType, at: now(), ...safeDetails }
    ].slice(-MAX_DIAGNOSTICS);
    await chrome.storage.local.set({ [STORAGE_KEYS.diagnostics]: next });
  }

  function actionAllowed(context, key) {
    return Boolean(context?.allowedActionKeys?.includes(key));
  }

  function watchLocation(onChange) {
    let previous = location.href;
    const timer = setInterval(() => {
      if (location.href === previous) return;
      previous = location.href;
      onChange(previous);
    }, 500);
    return () => clearInterval(timer);
  }

  globalThis.NexusOverlayRuntime = {
    STORAGE_KEYS,
    CONTEXT_SOURCES,
    normaliseContext,
    contextStatus,
    getAdapter,
    getStoredContext,
    setStoredContext,
    clearStoredContext,
    getAdapterPreference,
    setAdapterPreference,
    getSupplyRequests,
    saveSupplyRequestDraft,
    logDiagnostic,
    actionAllowed,
    watchLocation
  };
})();
