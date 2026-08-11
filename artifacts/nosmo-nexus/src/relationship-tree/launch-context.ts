export type RelationshipTreeLaunchSource = "work-wallet" | "bim-overlay";

export type RelationshipTreeLaunchContext = {
  source: RelationshipTreeLaunchSource;
  focusNodeId: string;
};

const APPROVED_SOURCES = new Set<RelationshipTreeLaunchSource>(["work-wallet", "bim-overlay"]);
const SAFE_IDENTIFIER = /^[A-Za-z0-9_-]+$/;
const MAX_SOURCE_LENGTH = 40;
const MAX_FOCUS_LENGTH = 80;

export function parseRelationshipTreeLaunchContext(
  search: string,
  validNodeIds: ReadonlySet<string>,
): RelationshipTreeLaunchContext | null {
  const params = new URLSearchParams(search);
  const source = params.get("nexusSource") ?? "";
  const focusNodeId = params.get("nexusFocus") ?? "";

  if (!source || !focusNodeId) return null;
  if (source.length > MAX_SOURCE_LENGTH || focusNodeId.length > MAX_FOCUS_LENGTH) return null;
  if (!SAFE_IDENTIFIER.test(source) || !SAFE_IDENTIFIER.test(focusNodeId)) return null;
  if (!APPROVED_SOURCES.has(source as RelationshipTreeLaunchSource)) return null;
  if (!validNodeIds.has(focusNodeId)) return null;

  return {
    source: source as RelationshipTreeLaunchSource,
    focusNodeId,
  };
}
