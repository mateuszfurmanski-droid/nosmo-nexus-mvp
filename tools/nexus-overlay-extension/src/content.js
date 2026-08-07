(() => {
  const ADAPTER_ID = "work-wallet";
  const runtime = globalThis.NexusOverlayRuntime;
  const sidecar = globalThis.NexusOverlaySidecar;

  if (!runtime || !sidecar) return;

  let mounted = null;
  let adapter = null;
  let stopWatchingLocation = null;

  function sourcePageType(url) {
    try {
      const path = new URL(url).pathname.toLowerCase();
      if (path.includes("permit")) return "PERMIT_PAGE";
      if (path.includes("audit")) return "AUDIT_PAGE";
      if (path.includes("risk")) return "RISK_PAGE";
      if (path.includes("job")) return "JOB_PAGE";
      if (path.includes("user") || path.includes("contact")) return "PERSON_PAGE";
      return "PORTAL_PAGE";
    } catch {
      return "PORTAL_PAGE";
    }
  }

  async function currentContext() {
    const existing = await runtime.getStoredContext();
    if (!existing) return null;
    return runtime.normaliseContext({
      ...existing,
      sourceApplication: "WORK_WALLET",
      sourceUrl: location.href,
      sourcePageType: sourcePageType(location.href)
    });
  }

  async function destroy() {
    if (stopWatchingLocation) {
      stopWatchingLocation();
      stopWatchingLocation = null;
    }
    mounted?.destroy();
    mounted = null;
  }

  async function boot() {
    try {
      adapter = await runtime.getAdapter(ADAPTER_ID);
      const preference = await runtime.getAdapterPreference(ADAPTER_ID);
      if (!preference.enabled) {
        await destroy();
        return;
      }

      const context = await currentContext();
      mounted?.destroy();
      mounted = await sidecar.mount({
        adapter,
        context,
        preference,
        onDisable: destroy
      });

      await runtime.logDiagnostic("EXTERNAL_APP_LAUNCHED", {
        adapterId: adapter.adapter_id,
        sourceUrl: location.href,
        contextSource: context?.contextSource || null
      });

      if (stopWatchingLocation) stopWatchingLocation();
      stopWatchingLocation = runtime.watchLocation(async (nextUrl) => {
        const contextAfterRoute = await currentContext();
        const preferenceAfterRoute = await runtime.getAdapterPreference(ADAPTER_ID);
        mounted?.render(contextAfterRoute, preferenceAfterRoute);
        await runtime.logDiagnostic("EXTERNAL_PAGE_CONTEXT_DETECTED", {
          adapterId: adapter.adapter_id,
          sourceUrl: nextUrl,
          contextSource: contextAfterRoute?.contextSource || null
        });
      });
    } catch {
      await runtime.logDiagnostic("ADAPTER_ERROR", {
        adapterId: ADAPTER_ID,
        sourceUrl: location.href,
        errorCode: "BOOT_FAILED"
      });
    }
  }

  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== "local") return;
    if (
      changes[runtime.STORAGE_KEYS.context] ||
      changes[runtime.STORAGE_KEYS.preferences]
    ) {
      await boot();
    }
  });

  boot();
})();
