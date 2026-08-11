(() => {
  const STORAGE_KEY = "nexusOverlayRecordMappings";
  const MAX_MAPPINGS = 100;
  const SAFE_EXTERNAL_REFERENCE = /^[A-Za-z0-9._~-]+$/;
  const SAFE_IDENTIFIER = /^[A-Za-z0-9_-]+$/;

  function clean(value, maxLength) {
    return String(value || "").trim().slice(0, maxLength);
  }

  function safeExternalReference(value) {
    const candidate = clean(value, 128);
    return candidate && SAFE_EXTERNAL_REFERENCE.test(candidate) ? candidate : null;
  }

  function safeIdentifier(value, maxLength = 80) {
    const candidate = clean(value, maxLength);
    return candidate && SAFE_IDENTIFIER.test(candidate) ? candidate : null;
  }

  function mappingId({ projectId, selectedObjectType, externalRecordReference }) {
    return [
      "WORK_WALLET",
      safeIdentifier(projectId, 120) || "NO_PROJECT",
      safeIdentifier(selectedObjectType) || "NO_TYPE",
      safeExternalReference(externalRecordReference) || "NO_REF"
    ].join("|");
  }

  async function getMappings() {
    const stored = await chrome.storage.local.get([STORAGE_KEY]);
    return Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : [];
  }

  async function setMapping(value = {}) {
    const projectId = safeIdentifier(value.projectId, 120);
    const selectedObjectType = safeIdentifier(value.selectedObjectType);
    const externalRecordReference = safeExternalReference(value.externalRecordReference);
    const nexusNodeId = safeIdentifier(value.nexusNodeId);

    if (!selectedObjectType) throw new Error("Selected object type is required");
    if (!externalRecordReference) throw new Error("External record reference is required");
    if (!nexusNodeId) throw new Error("Safe Nexus node ID is required");

    const now = new Date().toISOString();
    const record = {
      id: mappingId({ projectId, selectedObjectType, externalRecordReference }),
      sourceApplication: "WORK_WALLET",
      projectId,
      selectedObjectType,
      externalRecordReference,
      nexusNodeId,
      confirmation: "USER_CONFIRMED_LOCAL_MAPPING",
      updatedAt: now
    };

    const current = await getMappings();
    const existing = current.find((entry) => entry.id === record.id);
    const nextRecord = {
      ...record,
      createdAt: existing?.createdAt || now
    };
    const next = [nextRecord, ...current.filter((entry) => entry.id !== record.id)].slice(0, MAX_MAPPINGS);
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    return nextRecord;
  }

  async function removeMapping(id) {
    const current = await getMappings();
    const next = current.filter((entry) => entry.id !== id);
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
    return next;
  }

  async function resolve(context = {}) {
    if (context.sourceApplication !== "WORK_WALLET") return null;

    const projectId = safeIdentifier(context.projectId, 120);
    const selectedObjectType = safeIdentifier(context.selectedObjectType);
    const externalRecordReference = safeExternalReference(context.externalRecordReference);
    if (!selectedObjectType || !externalRecordReference) return null;

    const current = await getMappings();
    const exactId = mappingId({ projectId, selectedObjectType, externalRecordReference });
    const exact = current.find(
      (entry) =>
        entry.id === exactId &&
        entry.sourceApplication === "WORK_WALLET" &&
        entry.confirmation === "USER_CONFIRMED_LOCAL_MAPPING"
    );
    return safeIdentifier(exact?.nexusNodeId) || null;
  }

  globalThis.NexusOverlayRecordMapping = {
    STORAGE_KEY,
    getMappings,
    setMapping,
    removeMapping,
    resolve
  };
})();
