(() => {
  const CONFIG_KEY = "nexusWorkWalletOverlayConfig";
  const CONTEXT_KEY = "nexusOverlayContext";
  const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

  function safeString(value, maxLength) {
    const candidate = String(value ?? "").trim().slice(0, maxLength);
    return candidate && !CONTROL_CHARACTER.test(candidate) ? candidate : null;
  }

  async function getConfig() {
    const stored = await chrome.storage.local.get([CONFIG_KEY]);
    const value = stored[CONFIG_KEY];
    const config = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      apiBase: safeString(config.apiBase, 160),
      projectId: safeString(config.projectId, 160),
      worldId: safeString(config.worldId, 160),
      connectorAccountId: safeString(config.connectorAccountId, 160)
    };
  }

  async function getVerifiedContext() {
    const stored = await chrome.storage.local.get([CONTEXT_KEY]);
    const value = stored[CONTEXT_KEY];
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    if (
      value.schema !== "nexus-work-wallet-context/v1" ||
      value.sourceApplication !== "WORK_WALLET" ||
      value.contextSource !== "CONNECTOR_VERIFIED_CONTEXT" ||
      value.contextConfidence !== 1 ||
      value.verificationSource !== "WORK_WALLET_DEMO" ||
      value.developmentContext !== true
    ) {
      return null;
    }
    return value;
  }

  async function clearVerifiedContext() {
    await chrome.storage.local.remove(CONTEXT_KEY);
  }

  async function contextForRecord(record) {
    const context = await getVerifiedContext();
    if (!context) return null;

    const exact = Boolean(
      record &&
      context.projectId === record.projectId &&
      context.worldId === record.worldId &&
      context.connectorAccountId === record.connectorAccountId &&
      context.selectedObjectType === record.externalObjectType &&
      context.externalRecordReference === record.externalRecordReference
    );

    if (!exact) {
      await clearVerifiedContext();
      return null;
    }
    return context;
  }

  function startContextTicket(record) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          type: "NEXUS_CONTEXT_TICKET_START",
          ...record
        },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: "EXTENSION_RUNTIME_UNAVAILABLE" });
            return;
          }
          resolve(response || { ok: false, error: "NO_EXTENSION_RESPONSE" });
        }
      );
    });
  }

  globalThis.NexusWorkWalletOverlayRuntime = Object.freeze({
    CONFIG_KEY,
    CONTEXT_KEY,
    getConfig,
    getVerifiedContext,
    contextForRecord,
    clearVerifiedContext,
    startContextTicket
  });
})();
