(() => {
  const ROOT_ID = "nosmo-nexus-work-wallet-overlay";
  const TREE_URL =
    "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree";
  const CAPABILITY_LABEL =
    "DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API";

  function createHost() {
    let host = document.getElementById(ROOT_ID);
    if (host) return host;
    host = document.createElement("div");
    host.id = ROOT_ID;
    host.style.position = "fixed";
    host.style.inset = "0 0 auto auto";
    host.style.zIndex = "2147483646";
    host.style.pointerEvents = "none";
    document.documentElement.appendChild(host);
    return host;
  }

  function markup() {
    return `
      <style>
        :host{all:initial}*{box-sizing:border-box}
        .launcher{pointer-events:auto;position:fixed;right:14px;top:50%;transform:translateY(-50%);width:48px;height:48px;border:1px solid #53d6ff;border-radius:15px;background:#071b29;color:#8ee9ff;font:900 19px/1 Arial;cursor:pointer;box-shadow:0 12px 34px rgba(0,0,0,.35)}
        .panel{pointer-events:auto;position:fixed;right:14px;top:14px;width:min(360px,calc(100vw - 28px));max-height:calc(100vh - 28px);overflow:auto;border:1px solid rgba(83,214,255,.42);border-radius:18px;background:#07111c;color:#f4f8fb;font-family:Inter,Arial,sans-serif;box-shadow:0 24px 70px rgba(0,0,0,.45);display:none}
        .panel.open{display:block}.head{display:flex;align-items:center;gap:10px;padding:14px;border-bottom:1px solid rgba(148,163,184,.22)}
        .logo{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,#43d9ff,#1f7aff);color:#00151b;font:1000 15px/1 Arial}
        .title{flex:1}.title strong{display:block;font-size:13px}.title span{display:block;margin-top:3px;color:#8da0b5;font-size:9px;letter-spacing:.08em}.close{border:0;background:transparent;color:#90a0b2;font-size:22px;cursor:pointer}
        .body{padding:14px}.badge{display:inline-flex;border:1px solid rgba(148,163,184,.35);border-radius:999px;padding:5px 8px;font-size:8px;font-weight:900;letter-spacing:.08em;color:#a9b7c8}.badge.verified{border-color:rgba(35,209,139,.55);color:#23d18b}.badge.detected{border-color:rgba(245,196,0,.55);color:#f5c400}
        .card{margin-top:10px;padding:12px;border:1px solid rgba(148,163,184,.22);border-radius:13px;background:#0b1724}.card strong{display:block;font-size:14px;overflow-wrap:anywhere}.card p{margin:5px 0 0;color:#93a4b7;font-size:10px;line-height:1.45;overflow-wrap:anywhere}
        .button{width:100%;margin-top:10px;border:1px solid #315667;border-radius:10px;background:#102a35;color:#dcecf2;padding:10px;font:700 11px/1.2 Inter,Arial,sans-serif;cursor:pointer;text-align:left}.button:disabled{opacity:.5;cursor:not-allowed}.button.secondary{background:#111c2a}
        .status{margin-top:8px;color:#8ea4b0;font-size:10px;line-height:1.4}.foot{margin-top:12px;padding-top:10px;border-top:1px solid rgba(148,163,184,.18);color:#7f91a5;font-size:8px;line-height:1.45}
      </style>
      <button class="launcher" type="button" aria-label="Open NOSMO Nexus Work Wallet sidecar">N</button>
      <section class="panel" role="dialog" aria-label="NOSMO Nexus Work Wallet Overlay">
        <div class="head"><div class="logo">N</div><div class="title"><strong>NOSMO Nexus</strong><span>WORK WALLET CONTEXT</span></div><button class="close" type="button" aria-label="Close">×</button></div>
        <div class="body">
          <span class="badge">NO CONTEXT</span>
          <div class="card"><strong class="record">No Work Wallet record detected</strong><p class="scope">Configure Nexus Project World in extension options.</p><p class="object"></p></div>
          <button class="button authorise" type="button" disabled>Authorise via Nexus</button>
          <button class="button secondary tree" type="button">Open Nexus Project Tree</button>
          <button class="button secondary options" type="button">Context / Options</button>
          <div class="status">Read-only context and navigation only.</div>
          <div class="foot">${CAPABILITY_LABEL}</div>
        </div>
      </section>`;
  }

  function treeUrl(context) {
    if (!context?.nexusNodeId) return TREE_URL;
    const query = new URLSearchParams({
      nexusSource: "work-wallet",
      nexusFocus: context.nexusNodeId
    });
    return `${TREE_URL}?${query.toString()}`;
  }

  function mount({ record, verifiedContext, onAuthorise }) {
    const host = createHost();
    if (!host.shadowRoot) host.attachShadow({ mode: "open" });
    const root = host.shadowRoot;
    root.innerHTML = markup();

    const panel = root.querySelector(".panel");
    const launcher = root.querySelector(".launcher");
    const close = root.querySelector(".close");
    const badge = root.querySelector(".badge");
    const recordEl = root.querySelector(".record");
    const scopeEl = root.querySelector(".scope");
    const objectEl = root.querySelector(".object");
    const authorise = root.querySelector(".authorise");
    const tree = root.querySelector(".tree");
    const options = root.querySelector(".options");
    const status = root.querySelector(".status");

    launcher.addEventListener("click", () => panel.classList.add("open"));
    close.addEventListener("click", () => panel.classList.remove("open"));
    options.addEventListener("click", () => chrome.runtime.openOptionsPage());
    tree.addEventListener("click", () =>
      window.open(treeUrl(verifiedContext), "_blank", "noopener,noreferrer")
    );

    const render = (nextRecord, nextContext) => {
      record = nextRecord;
      verifiedContext = nextContext;
      const configured = Boolean(
        record?.projectId &&
        record?.worldId &&
        record?.connectorAccountId &&
        record?.externalObjectType &&
        record?.externalRecordReference
      );

      recordEl.textContent = record?.externalRecordReference || "No Work Wallet record detected";
      scopeEl.textContent = record?.projectId && record?.worldId
        ? `${record.projectId} / ${record.worldId}`
        : "Configure Nexus Project World in extension options.";
      objectEl.textContent = verifiedContext?.nexusObjectId
        ? `Nexus Object: ${verifiedContext.nexusObjectId}`
        : record?.externalObjectType
          ? `Source type: ${record.externalObjectType}`
          : "";

      authorise.disabled = !configured;
      authorise.textContent = verifiedContext ? "Re-authorise current context" : "Authorise via Nexus";
      badge.className = `badge ${verifiedContext ? "verified" : configured ? "detected" : ""}`;
      badge.textContent = verifiedContext
        ? "DEMO / CONNECTOR VERIFIED"
        : configured
          ? "DETECTED — NOT VERIFIED"
          : "NO CONTEXT";
      status.textContent = verifiedContext
        ? "Canonical Nexus context verified. Read-only navigation enabled."
        : "Read-only context and navigation only.";
      tree.onclick = () =>
        window.open(treeUrl(verifiedContext), "_blank", "noopener,noreferrer");
    };

    authorise.addEventListener("click", async () => {
      if (authorise.disabled) return;
      authorise.disabled = true;
      status.textContent = "Preparing secure Nexus authorisation…";
      try {
        const result = await onAuthorise(record);
        if (!result?.ok || !result.bootstrapUrl) {
          status.textContent = "Nexus authorisation could not be started.";
          authorise.disabled = false;
          return;
        }
        const opened = window.open(result.bootstrapUrl, "_blank", "noopener,noreferrer");
        if (!opened) {
          status.textContent = "Allow the Nexus authorisation tab, then try again.";
          authorise.disabled = false;
          return;
        }
        status.textContent = "Complete Nexus sign-in/authorisation in the new tab.";
      } catch {
        status.textContent = "Nexus authorisation could not be started.";
        authorise.disabled = false;
      }
    });

    render(record, verifiedContext);

    return {
      render,
      destroy() {
        host.remove();
      }
    };
  }

  globalThis.NexusWorkWalletSidecar = Object.freeze({ mount });
})();
