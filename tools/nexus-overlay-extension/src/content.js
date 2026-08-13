(() => {
  const ADAPTER_ID = "work-wallet";
  const runtime = globalThis.NexusOverlayRuntime;
  const sidecar = globalThis.NexusOverlaySidecar;
  const recordMapping = globalThis.NexusOverlayRecordMapping;

  if (!runtime || !sidecar) return;

  let mounted = null;
  let adapter = null;
  let stopWatchingLocation = null;

  function safePortalUrl(url) {
    try {
      const parsed = new URL(url);
      return `${parsed.origin}${parsed.pathname}`;
    } catch {
      return "https://portal.work-wallet.com/";
    }
  }

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

  function objectTypeForPage(pageType) {
    if (pageType === "PERMIT_PAGE") return "permit";
    if (pageType === "AUDIT_PAGE") return "audit";
    if (pageType === "RISK_PAGE") return "risk_assessment";
    if (pageType === "JOB_PAGE") return "job";
    if (pageType === "PERSON_PAGE") return "person";
    return null;
  }

  function routeRecordHint(url) {
    try {
      const segments = new URL(url).pathname
        .split("/")
        .map((segment) => decodeURIComponent(segment).trim())
        .filter(Boolean);
      const candidate = segments.at(-1) || null;
      if (!candidate || candidate.length > 128) return null;
      if (!/^[A-Za-z0-9._~-]+$/.test(candidate)) return null;
      const generic = new Set(["dashboard", "people", "users", "contacts", "jobs", "permits", "audits", "risk"]);
      return generic.has(candidate.toLowerCase()) ? null : candidate;
    } catch {
      return null;
    }
  }

  async function currentContext() {
    const existing = await runtime.getStoredContext();
    if (!existing) return null;

    const pageType = sourcePageType(location.href);
    const recordHint = routeRecordHint(location.href);
    const selectedObjectType = recordHint ? objectTypeForPage(pageType) : existing.selectedObjectType;
    const selectedObjectId = recordHint || existing.selectedObjectId;

    const priorNexusNodeStillApplies = Boolean(
      recordHint &&
      existing.externalRecordReference === recordHint &&
      existing.selectedObjectType === selectedObjectType
    );

    const candidate = {
      ...existing,
      nexusNodeId: priorNexusNodeStillApplies ? existing.nexusNodeId : null,
      sourceApplication: "WORK_WALLET",
      sourceUrl: safePortalUrl(location.href),
      sourcePageType: pageType,
      selectedObjectType,
      selectedObjectId,
      externalRecordReference: recordHint
    };

    const mappedNexusNodeId = recordHint && recordMapping
      ? await recordMapping.resolve(candidate)
      : null;

    return runtime.normaliseContext({
      ...candidate,
      nexusNodeId: mappedNexusNodeId || candidate.nexusNodeId
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
        sourceUrl: safePortalUrl(location.href),
        contextSource: context?.contextSource || null
      });

      if (stopWatchingLocation) stopWatchingLocation();
      stopWatchingLocation = runtime.watchLocation(async (nextUrl) => {
        const contextAfterRoute = await currentContext();
        const preferenceAfterRoute = await runtime.getAdapterPreference(ADAPTER_ID);
        mounted?.render(contextAfterRoute, preferenceAfterRoute);
        await runtime.logDiagnostic("EXTERNAL_PAGE_CONTEXT_DETECTED", {
          adapterId: adapter.adapter_id,
          sourceUrl: safePortalUrl(nextUrl),
          contextSource: contextAfterRoute?.contextSource || null
        });
      });
    } catch {
      await runtime.logDiagnostic("ADAPTER_ERROR", {
        adapterId: ADAPTER_ID,
        sourceUrl: safePortalUrl(location.href),
        errorCode: "BOOT_FAILED"
      });
    }
  }

  chrome.storage.onChanged.addListener(async (changes, areaName) => {
    if (areaName !== "local") return;
    if (
      changes[runtime.STORAGE_KEYS.context] ||
      changes[runtime.STORAGE_KEYS.preferences] ||
      changes[recordMapping?.STORAGE_KEY]
    ) {
      await boot();
    }
  });

  boot();
})();
