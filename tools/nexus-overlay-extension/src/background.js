const ADAPTER_FILES = {
  "work-wallet": "adapters/work-wallet.json",
  "test-fixture": "adapters/test-fixture.json"
};

const DEFAULT_PREFERENCES = {
  "work-wallet": {
    adapterId: "work-wallet",
    enabled: true,
    launcherPosition: "right-center",
    sidecarOpen: false,
    lastUpdatedAt: new Date().toISOString()
  }
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(["nexusOverlayPreferences"]);
  if (!stored.nexusOverlayPreferences) {
    await chrome.storage.local.set({ nexusOverlayPreferences: DEFAULT_PREFERENCES });
  }
});

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

async function readAdapter(adapterId) {
  const file = ADAPTER_FILES[adapterId];
  if (!file) throw new Error(`Unknown adapter: ${adapterId}`);
  const response = await fetch(chrome.runtime.getURL(file));
  if (!response.ok) throw new Error(`Adapter load failed: ${adapterId}`);
  return response.json();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "NEXUS_GET_ADAPTER") {
    readAdapter(message.adapterId)
      .then((adapter) => sendResponse({ ok: true, adapter }))
      .catch((error) => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }

  if (message?.type === "NEXUS_OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
  }

  return false;
});
