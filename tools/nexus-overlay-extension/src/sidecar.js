(() => {
  const ROOT_ID = "nosmo-nexus-overlay-root";
  const RUNTIME = () => globalThis.NexusOverlayRuntime;

  const DEFAULT_URLS = {
    relationshipTree:
      "https://nosmotechnology.co.uk/apps/nexus-graph-preview/relationship-tree",
    people: "https://nosmotechnology.co.uk/apps/nexus/?module=people",
    tasks: "https://nosmotechnology.co.uk/apps/nexus/?module=tasks",
    documents: "https://nosmotechnology.co.uk/apps/nexus/?module=documents",
    integrations: "https://nosmotechnology.co.uk/apps/nexus/?module=integrations",
    connectorStatus: "https://nosmotechnology.co.uk/apps/nexus/?module=safety",
    gmail: "https://mail.google.com/mail/u/0/#inbox?compose=new"
  };

  const ACTIONS = [
    { key: "ask_nexus", label: "Ask Nexus", icon: "?", requiresTarget: false },
    { key: "project_tree", label: "Project Tree", icon: "T" },
    { key: "person_card", label: "Person Card", icon: "P" },
    { key: "tasks", label: "Tasks / Snags", icon: "✓" },
    { key: "documents", label: "Documents", icon: "D" },
    { key: "communication", label: "Communication", icon: "C" },
    { key: "supplies", label: "Supplies / Purchases", icon: "S", requiresTarget: false },
    { key: "related_apps", label: "Related Apps", icon: "A" },
    { key: "connector_status", label: "Connector Status", icon: "W" },
    { key: "return_to_nexus", label: "Return to Nexus", icon: "↩" }
  ];

  function createRoot() {
    const existing = document.getElementById(ROOT_ID);
    if (existing) return existing;

    const host = document.createElement("div");
    host.id = ROOT_ID;
    host.style.position = "fixed";
    host.style.zIndex = "2147483646";
    host.style.top = "0";
    host.style.right = "0";
    host.style.width = "0";
    host.style.height = "0";
    host.style.pointerEvents = "none";
    document.documentElement.appendChild(host);
    return host;
  }

  function staticMarkup() {
    return `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; }
        .nexus-launcher {
          pointer-events: auto;
          position: fixed;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          width: 46px;
          height: 46px;
          border: 1px solid rgba(83, 214, 255, .75);
          border-radius: 15px;
          background: linear-gradient(180deg, #0b3655 0%, #061827 100%);
          color: #8ee9ff;
          font: 900 18px/1 Arial, sans-serif;
          cursor: pointer;
          box-shadow: 0 12px 34px rgba(0,0,0,.35);
        }
        .nexus-launcher:hover { border-color: #b9f2ff; color: #fff; }
        .nexus-panel {
          pointer-events: auto;
          position: fixed;
          top: 12px;
          right: 12px;
          width: min(340px, calc(100vw - 24px));
          max-height: calc(100vh - 24px);
          overflow: auto;
          border: 1px solid rgba(83, 214, 255, .42);
          border-radius: 18px;
          background: #07111c;
          color: #f4f8fb;
          font-family: Inter, Arial, sans-serif;
          box-shadow: 0 24px 70px rgba(0,0,0,.45);
          display: none;
        }
        .nexus-panel.open { display: block; }
        .nexus-head {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px;
          border-bottom: 1px solid rgba(148,163,184,.22);
          position: sticky;
          top: 0;
          background: rgba(7,17,28,.96);
          backdrop-filter: blur(10px);
        }
        .nexus-logo {
          width: 36px;
          height: 36px;
          border-radius: 11px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg,#43d9ff,#1f7aff);
          color: #00151b;
          font: 1000 15px/1 Arial,sans-serif;
        }
        .nexus-title { flex: 1; min-width: 0; }
        .nexus-title strong { display: block; font-size: 13px; }
        .nexus-title span { display: block; margin-top: 3px; color: #8da0b5; font-size: 9px; letter-spacing: .08em; }
        .nexus-close {
          border: 0;
          background: transparent;
          color: #90a0b2;
          font-size: 22px;
          cursor: pointer;
        }
        .nexus-body { padding: 14px; }
        .nexus-badge {
          display: inline-flex;
          border: 1px solid rgba(148,163,184,.35);
          border-radius: 999px;
          padding: 5px 8px;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: #a9b7c8;
        }
        .nexus-badge.warning { border-color: rgba(245,196,0,.55); color: #f5c400; }
        .nexus-badge.success { border-color: rgba(35,209,139,.55); color: #23d18b; }
        .nexus-badge.info { border-color: rgba(67,217,255,.55); color: #43d9ff; }
        .nexus-context {
          margin-top: 10px;
          padding: 12px;
          border: 1px solid rgba(148,163,184,.22);
          border-radius: 13px;
          background: #0b1724;
        }
        .nexus-context strong { display: block; font-size: 15px; }
        .nexus-context p { margin: 5px 0 0; color: #93a4b7; font-size: 11px; line-height: 1.45; }
        .nexus-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; }
        .nexus-action {
          min-height: 58px;
          border: 1px solid rgba(62,121,151,.5);
          border-radius: 12px;
          background: linear-gradient(180deg,#0b3655,#061827);
          color: #eaf8ff;
          text-align: left;
          padding: 9px;
          cursor: pointer;
        }
        .nexus-action:hover:not(:disabled) { border-color: rgba(142,233,255,.8); }
        .nexus-action:disabled { cursor: not-allowed; filter: grayscale(1); opacity: .48; }
        .nexus-action b { display: block; color: #65ddff; font-size: 11px; }
        .nexus-action span { display: block; margin-top: 5px; font-size: 9px; line-height: 1.25; }
        .nexus-footer {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid rgba(148,163,184,.18);
          color: #7f91a5;
          font-size: 9px;
          line-height: 1.45;
        }
        .nexus-footer button {
          margin-top: 8px;
          border: 1px solid rgba(148,163,184,.35);
          border-radius: 9px;
          background: #111c2a;
          color: #d9e4ef;
          padding: 7px 9px;
          cursor: pointer;
        }
        @media (max-width: 560px) {
          .nexus-panel { inset: 8px; width: auto; max-height: calc(100vh - 16px); }
          .nexus-actions { grid-template-columns: 1fr; }
          .nexus-launcher { right: 8px; }
        }
      </style>
      <button class="nexus-launcher" type="button" aria-label="Open NOSMO Nexus sidecar">N</button>
      <section class="nexus-panel" role="dialog" aria-label="NOSMO Nexus Overlay">
        <div class="nexus-head">
          <div class="nexus-logo">N</div>
          <div class="nexus-title"><strong>NOSMO Nexus</strong><span>OVERLAY PROTOTYPE</span></div>
          <button class="nexus-close" type="button" aria-label="Close Nexus sidecar">×</button>
        </div>
        <div class="nexus-body">
          <span class="nexus-badge">NO NEXUS CONTEXT</span>
          <div class="nexus-context">
            <strong>No project selected</strong>
            <p class="nexus-context-detail">Open extension options to seed development context.</p>
          </div>
          <div class="nexus-actions"></div>
          <div class="nexus-footer">
            DEVELOPMENT PROTOTYPE — NOT VENDOR APPROVED / NO LIVE WORK WALLET API
            <br><button class="nexus-options" type="button">Context / Options</button>
            <button class="nexus-disable" type="button">Disable on Work Wallet</button>
          </div>
        </div>
      </section>
    `;
  }

  function actionTarget(action, context) {
    switch (action.key) {
      case "project_tree":
        return DEFAULT_URLS.relationshipTree;
      case "person_card":
        return context?.personId ? DEFAULT_URLS.people : null;
      case "tasks":
        return DEFAULT_URLS.tasks;
      case "documents":
        return DEFAULT_URLS.documents;
      case "communication":
        return DEFAULT_URLS.gmail;
      case "related_apps":
        return DEFAULT_URLS.integrations;
      case "connector_status":
        return DEFAULT_URLS.connectorStatus;
      case "return_to_nexus":
        return context?.returnRoute || DEFAULT_URLS.relationshipTree;
      default:
        return null;
    }
  }

  function actionReason(action, context) {
    if (action.key === "ask_nexus") return "Not connected in this slice";
    if (action.key === "supplies") return "No safe launch target yet";
    if (action.key === "person_card" && !context?.personId) return "Needs person context";
    if (!RUNTIME().actionAllowed(context, action.key)) return "Not in local action set";
    return "Open";
  }

  function buildActionButton(action, context, adapter) {
    const target = actionTarget(action, context);
    const allowed = RUNTIME().actionAllowed(context, action.key);
    const enabled = Boolean(target && allowed);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nexus-action";
    button.disabled = !enabled;

    const icon = document.createElement("b");
    icon.textContent = `${action.icon}  ${action.label}`;
    const state = document.createElement("span");
    state.textContent = actionReason(action, context);
    button.append(icon, state);

    if (enabled) {
      button.addEventListener("click", async () => {
        await RUNTIME().logDiagnostic("NEXUS_ACTION_OPENED", {
          adapterId: adapter.adapter_id,
          actionKey: action.key,
          contextSource: context?.contextSource || null
        });
        if (action.key === "return_to_nexus") {
          await RUNTIME().logDiagnostic("RELATIONSHIP_TREE_RETURNED", {
            adapterId: adapter.adapter_id,
            actionKey: action.key,
            contextSource: context?.contextSource || null
          });
        }
        window.open(target, "_blank", "noopener,noreferrer");
      });
    }
    return button;
  }

  async function mount({ adapter, context, preference, onDisable }) {
    const host = createRoot();
    if (!host.shadowRoot) host.attachShadow({ mode: "open" });
    const shadow = host.shadowRoot;
    shadow.innerHTML = staticMarkup();

    const launcher = shadow.querySelector(".nexus-launcher");
    const panel = shadow.querySelector(".nexus-panel");
    const close = shadow.querySelector(".nexus-close");
    const badge = shadow.querySelector(".nexus-badge");
    const contextTitle = shadow.querySelector(".nexus-context strong");
    const contextDetail = shadow.querySelector(".nexus-context-detail");
    const actions = shadow.querySelector(".nexus-actions");
    const options = shadow.querySelector(".nexus-options");
    const disable = shadow.querySelector(".nexus-disable");

    function render(nextContext, nextPreference) {
      const status = RUNTIME().contextStatus(nextContext);
      badge.textContent = status.label;
      badge.className = `nexus-badge ${status.tone}`;
      contextTitle.textContent = nextContext?.projectLabel || nextContext?.projectId || "No project selected";
      const person = nextContext?.personLabel || nextContext?.personId || "No person context";
      const trade = nextContext?.tradeContext?.join(", ") || "No trade context";
      contextDetail.textContent = `${person} · ${trade}`;
      actions.replaceChildren(...ACTIONS.map((action) => buildActionButton(action, nextContext, adapter)));
      panel.classList.toggle("open", nextPreference?.sidecarOpen === true);
    }

    async function setOpen(open) {
      const next = await RUNTIME().setAdapterPreference(adapter.adapter_id, { sidecarOpen: open });
      panel.classList.toggle("open", next.sidecarOpen === true);
      await RUNTIME().logDiagnostic(open ? "OVERLAY_OPENED" : "OVERLAY_CLOSED", {
        adapterId: adapter.adapter_id,
        contextSource: context?.contextSource || null
      });
    }

    launcher.addEventListener("click", () => setOpen(true));
    close.addEventListener("click", () => setOpen(false));
    options.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "NEXUS_OPEN_OPTIONS" });
    });
    disable.addEventListener("click", async () => {
      await RUNTIME().setAdapterPreference(adapter.adapter_id, { enabled: false, sidecarOpen: false });
      await RUNTIME().logDiagnostic("ADAPTER_DISABLED", { adapterId: adapter.adapter_id });
      onDisable?.();
    });

    render(context, preference);
    return {
      host,
      render,
      destroy() {
        host.remove();
      }
    };
  }

  globalThis.NexusOverlaySidecar = { ROOT_ID, mount };
})();
