(() => {
  const START_MESSAGE = "NEXUS_CONTEXT_TICKET_START";

  function canBootstrap(context) {
    return Boolean(
      context &&
      context.sourceApplication === "WORK_WALLET" &&
      context.projectId &&
      context.externalRecordReference &&
      context.developmentContext !== true &&
      context.contextSource !== "CONNECTOR_VERIFIED_CONTEXT"
    );
  }

  function buttonStyle(button) {
    button.style.width = "100%";
    button.style.border = "1px solid #315667";
    button.style.borderRadius = "9px";
    button.style.background = "#102a35";
    button.style.color = "#dcecf2";
    button.style.padding = "9px 10px";
    button.style.font = "700 11px/1.2 Inter, Arial, sans-serif";
    button.style.cursor = "pointer";
    button.style.textAlign = "left";
  }

  function messageRuntime(payload) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: "EXTENSION_RUNTIME_UNAVAILABLE" });
          return;
        }
        resolve(response || { ok: false, error: "NO_EXTENSION_RESPONSE" });
      });
    });
  }

  async function startBootstrap(context, button, status) {
    button.disabled = true;
    button.style.cursor = "wait";
    status.textContent = "Preparing secure Nexus authorisation…";

    const response = await messageRuntime({
      type: START_MESSAGE,
      projectId: context.projectId,
      externalRecordReference: context.externalRecordReference,
      selectedObjectType: context.selectedObjectType,
      sourceUrl: context.sourceUrl,
      sourcePageType: context.sourcePageType
    });

    if (!response?.ok || typeof response.bootstrapUrl !== "string") {
      status.textContent = "Nexus authorisation could not be started.";
      button.disabled = false;
      button.style.cursor = "pointer";
      return;
    }

    const opened = window.open(
      response.bootstrapUrl,
      "_blank",
      "noopener,noreferrer"
    );

    if (!opened) {
      status.textContent = "Allow the Nexus authorisation tab, then try again.";
      button.disabled = false;
      button.style.cursor = "pointer";
      return;
    }

    status.textContent = "Complete Nexus sign-in/authorisation in the new tab.";
    button.textContent = "Authorisation opened";
    button.style.cursor = "default";
  }

  function mountControl(context, ui) {
    if (!ui?.root) return;
    ui.root.querySelector("[data-nexus-ticket-control]")?.remove();
    if (!canBootstrap(context)) return;

    const contextCard = ui.root.querySelector(".nx-context");
    if (!contextCard) return;

    const wrapper = document.createElement("div");
    wrapper.dataset.nexusTicketControl = "true";
    wrapper.style.marginTop = "8px";
    wrapper.style.paddingTop = "8px";
    wrapper.style.borderTop = "1px solid #263945";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Authorise via Nexus";
    button.title = "Use your Nexus session to authorise this Work Wallet context";
    buttonStyle(button);

    const status = document.createElement("div");
    status.style.marginTop = "6px";
    status.style.font = "500 10px/1.35 Inter, Arial, sans-serif";
    status.style.color = "#8ea4b0";
    status.textContent = "Read-only, short-lived connector context.";

    button.addEventListener("click", () => {
      void startBootstrap(context, button, status);
    });

    wrapper.append(button, status);
    contextCard.appendChild(wrapper);
  }

  function patchSidecar() {
    const sidecar = globalThis.NexusOverlaySidecar;
    if (!sidecar || sidecar.__contextTicketPatched) return false;

    const originalMount = sidecar.mount;
    sidecar.mount = async function patchedContextTicketMount(options) {
      const ui = await originalMount.call(this, options);
      mountControl(options?.context || null, ui);
      return ui;
    };
    sidecar.__contextTicketPatched = true;
    return true;
  }

  if (!patchSidecar()) {
    const retry = setInterval(() => {
      if (patchSidecar()) clearInterval(retry);
    }, 50);
    setTimeout(() => clearInterval(retry), 5000);
  }

  globalThis.NexusOverlayContextTicket = Object.freeze({
    canBootstrap
  });
})();
