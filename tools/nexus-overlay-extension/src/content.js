(() => {
  const runtime = globalThis.NexusWorkWalletOverlayRuntime;
  const sidecar = globalThis.NexusWorkWalletSidecar;
  if (!runtime || !sidecar) return;

  let mounted = null;
  let previousHref = "";

  function safePortalUrl(value) {
    try {
      const url = new URL(value);
      return `${url.origin}${url.pathname}`;
    } catch {
      return "https://portal.work-wallet.com/";
    }
  }

  function pageTypeAndObjectType(urlValue) {
    try {
      const path = new URL(urlValue).pathname.toLowerCase();
      if (path.includes("permit")) return ["PERMIT_PAGE", "permit"];
      if (path.includes("audit")) return ["AUDIT_PAGE", "audit"];
      if (path.includes("risk")) return ["RISK_PAGE", "risk_assessment"];
      if (path.includes("job")) return ["JOB_PAGE", "job"];
      if (path.includes("asset")) return ["ASSET_PAGE", "asset"];
      if (path.includes("user") || path.includes("contact") || path.includes("people")) {
        return ["PERSON_PAGE", "person"];
      }
      return ["PORTAL_PAGE", "source_record"];
    } catch {
      return ["PORTAL_PAGE", "source_record"];
    }
  }

  function recordReference(urlValue) {
    try {
      const segments = new URL(urlValue).pathname
        .split("/")
        .map((segment) => decodeURIComponent(segment).trim())
        .filter(Boolean);
      const candidate = segments.at(-1) || "";
      if (!candidate || candidate.length > 256) return null;
      const generic = new Set([
        "dashboard",
        "people",
        "users",
        "contacts",
        "jobs",
        "assets",
        "permits",
        "audits",
        "risk",
        "risks",
        "risk-assessments"
      ]);
      if (generic.has(candidate.toLowerCase())) return null;
      if (/[\u0000-\u001f\u007f]/.test(candidate)) return null;
      return candidate;
    } catch {
      return null;
    }
  }

  async function buildRecord() {
    const config = await runtime.getConfig();
    const reference = recordReference(location.href);
    const [sourcePageType, externalObjectType] = pageTypeAndObjectType(location.href);

    if (!reference) {
      await runtime.clearVerifiedContext();
    }

    return {
      projectId: config.projectId,
      worldId: config.worldId,
      connectorAccountId: config.connectorAccountId,
      externalObjectType: reference ? externalObjectType : null,
      externalRecordReference: reference,
      sourceApplication: "WORK_WALLET",
      sourceUrl: safePortalUrl(location.href),
      sourcePageType
    };
  }

  async function refresh() {
    const record = await buildRecord();
    const verifiedContext = record.externalRecordReference
      ? await runtime.contextForRecord(record)
      : null;

    if (!mounted) {
      mounted = sidecar.mount({
        record,
        verifiedContext,
        onAuthorise: (currentRecord) => runtime.startContextTicket(currentRecord)
      });
    } else {
      mounted.render(record, verifiedContext);
    }
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (changes[runtime.CONFIG_KEY] || changes[runtime.CONTEXT_KEY]) {
      void refresh();
    }
  });

  previousHref = location.href;
  setInterval(() => {
    if (location.href === previousHref) return;
    previousHref = location.href;
    void refresh();
  }, 500);

  void refresh();
})();
