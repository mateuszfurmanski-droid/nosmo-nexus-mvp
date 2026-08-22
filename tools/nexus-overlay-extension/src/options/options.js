(() => {
  const CONFIG_KEY = "nexusWorkWalletOverlayConfig";
  const ALLOWED_API_BASES = new Set([
    "http://127.0.0.1:3000",
    "https://nosmotechnology.co.uk"
  ]);
  const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

  const form = document.getElementById("config-form");
  const apiBase = document.getElementById("apiBase");
  const projectId = document.getElementById("projectId");
  const worldId = document.getElementById("worldId");
  const connectorAccountId = document.getElementById("connectorAccountId");
  const status = document.getElementById("status");

  function safeValue(value, maxLength) {
    const candidate = String(value || "").trim();
    if (!candidate || candidate.length > maxLength || CONTROL_CHARACTER.test(candidate)) {
      return null;
    }
    return candidate;
  }

  async function load() {
    const stored = await chrome.storage.local.get([CONFIG_KEY]);
    const value = stored[CONFIG_KEY] || {};
    apiBase.value = ALLOWED_API_BASES.has(value.apiBase)
      ? value.apiBase
      : "http://127.0.0.1:3000";
    projectId.value = value.projectId || "";
    worldId.value = value.worldId || "";
    connectorAccountId.value = value.connectorAccountId || "";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const next = {
      apiBase: ALLOWED_API_BASES.has(apiBase.value) ? apiBase.value : null,
      projectId: safeValue(projectId.value, 160),
      worldId: safeValue(worldId.value, 160),
      connectorAccountId: safeValue(connectorAccountId.value, 160)
    };

    if (!next.apiBase || !next.projectId || !next.worldId || !next.connectorAccountId) {
      status.textContent = "Invalid scope. No changes saved.";
      return;
    }

    await chrome.storage.local.set({ [CONFIG_KEY]: next });
    await chrome.storage.local.remove("nexusOverlayContext");
    status.textContent = "Scope saved. Existing verified context was cleared.";
  });

  void load();
})();
