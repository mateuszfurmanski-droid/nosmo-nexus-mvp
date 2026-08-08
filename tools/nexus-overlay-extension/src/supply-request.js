(() => {
  function mount({ shadow, runtime, adapter, getContext, externalToolsUrl }) {
    const host = shadow.querySelector(".nexus-supply-host");
    if (!host) return { render() {}, destroy() {} };

    const style = document.createElement("style");
    style.textContent = `
      .nexus-supply {
        margin-top: 12px;
        padding: 10px;
        border: 1px solid rgba(245,196,0,.25);
        border-radius: 12px;
        background: rgba(42,34,5,.38);
      }
      .nexus-supply[hidden] { display: none; }
      .nexus-supply-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
      .nexus-supply-title { color:#f5c400; font-size:8px; font-weight:900; letter-spacing:.08em; }
      .nexus-supply-status { color:#8ea0b5; font-size:8px; }
      .nexus-supply-grid { display:grid; grid-template-columns:1fr 72px; gap:6px; margin-top:8px; }
      .nexus-supply input,
      .nexus-supply textarea {
        width:100%; border:1px solid rgba(148,163,184,.28); border-radius:8px;
        background:#07111c; color:#edf6fb; padding:8px; font:500 10px/1.3 Arial,sans-serif;
        outline:none;
      }
      .nexus-supply textarea { min-height:54px; resize:vertical; margin-top:6px; }
      .nexus-supply input:focus,
      .nexus-supply textarea:focus { border-color:rgba(245,196,0,.7); }
      .nexus-supply-context { margin-top:6px; color:#8ea0b5; font-size:8px; line-height:1.35; overflow-wrap:anywhere; }
      .nexus-supply-actions { display:flex; gap:6px; margin-top:8px; }
      .nexus-supply-actions button {
        flex:1; border:1px solid rgba(148,163,184,.3); border-radius:8px;
        background:#111c2a; color:#dce8f2; padding:7px 6px; font:800 8px/1 Arial,sans-serif; cursor:pointer;
      }
      .nexus-supply-actions button.primary { border-color:#f5c400; background:#f5c400; color:#211a00; }
      .nexus-supply-actions button:hover { filter:brightness(1.08); }
    `;
    shadow.appendChild(style);

    host.innerHTML = `
      <section class="nexus-supply" hidden>
        <div class="nexus-supply-head">
          <span class="nexus-supply-title">SUPPLY REQUEST · LOCAL DRAFT ONLY</span>
          <span class="nexus-supply-status">Not saved</span>
        </div>
        <div class="nexus-supply-grid">
          <input class="nexus-supply-item" maxlength="120" placeholder="Item / material" aria-label="Supply item">
          <input class="nexus-supply-qty" maxlength="40" value="1" placeholder="Qty" aria-label="Quantity">
        </div>
        <textarea class="nexus-supply-note" maxlength="400" placeholder="Note, size, spec, required-by..." aria-label="Supply request note"></textarea>
        <div class="nexus-supply-context">No Nexus context</div>
        <div class="nexus-supply-actions">
          <button class="primary nexus-supply-save" type="button">Save local draft</button>
          <button class="nexus-supply-tools" type="button">External Tools</button>
        </div>
      </section>
    `;

    const section = host.querySelector(".nexus-supply");
    const item = host.querySelector(".nexus-supply-item");
    const quantity = host.querySelector(".nexus-supply-qty");
    const note = host.querySelector(".nexus-supply-note");
    const status = host.querySelector(".nexus-supply-status");
    const contextLine = host.querySelector(".nexus-supply-context");
    const save = host.querySelector(".nexus-supply-save");
    const tools = host.querySelector(".nexus-supply-tools");

    function contextLabel(context) {
      if (!context) return "No Nexus context";
      const project = context.projectLabel || context.projectId || "No project";
      const object = context.externalRecordReference || context.selectedObjectId || "No object";
      return `${project} · ${context.selectedObjectType || "context"} · ${object}`;
    }

    function render(context) {
      section.hidden = !runtime.actionAllowed(context, "supplies");
      contextLine.textContent = contextLabel(context);
    }

    save.addEventListener("click", async () => {
      const context = getContext();
      try {
        const draft = await runtime.saveSupplyRequestDraft({
          item: item.value,
          quantity: quantity.value,
          note: note.value,
          projectId: context?.projectId,
          projectLabel: context?.projectLabel,
          selectedObjectType: context?.selectedObjectType,
          selectedObjectId: context?.selectedObjectId,
          externalRecordReference: context?.externalRecordReference,
          sourcePageType: context?.sourcePageType,
          sourceUrl: context?.sourceUrl
        });
        status.textContent = "Saved locally";
        item.value = "";
        quantity.value = "1";
        note.value = "";
        await runtime.logDiagnostic("SUPPLY_REQUEST_DRAFTED", {
          adapterId: adapter.adapter_id,
          actionKey: "supplies:local-draft",
          contextSource: context?.contextSource || null,
          sourceUrl: context?.sourceUrl || null
        });
        window.setTimeout(() => {
          if (status.textContent === "Saved locally") status.textContent = `Draft ${draft.id.slice(0, 8)}`;
        }, 1200);
      } catch (error) {
        status.textContent = error?.message === "Supply request item is required" ? "Item required" : "Save failed";
      }
    });

    tools.addEventListener("click", async () => {
      const context = getContext();
      await runtime.logDiagnostic("NEXUS_ACTION_OPENED", {
        adapterId: adapter.adapter_id,
        actionKey: "supplies:external-tools",
        contextSource: context?.contextSource || null,
        sourceUrl: context?.sourceUrl || null
      });
      window.open(externalToolsUrl, "_blank", "noopener,noreferrer");
    });

    return {
      render,
      destroy() {
        style.remove();
        host.replaceChildren();
      }
    };
  }

  globalThis.NexusOverlaySupplyRequest = { mount };
})();
