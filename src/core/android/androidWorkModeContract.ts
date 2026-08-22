import type { NexusId } from '../../data/schemas/common.schema';
import type {
  NexusRuntimeAccessBridgeRequest,
  NexusRuntimeIdentityContext,
} from '../permissions/runtimeIdentityContract';

/**
 * Native Android Work Mode is a field-intake client for Nexus, not an authority source.
 * Local references may exist on-device, but raw content/URI values are deliberately absent
 * from the server handoff envelope below.
 */
export type AndroidWorkSource =
  | 'CONTACT'
  | 'CALENDAR'
  | 'PHOTO'
  | 'DOCUMENT'
  | 'FOLDER';

export type AndroidWorkCandidateApprovalState =
  | 'DISCOVERED'
  | 'APPROVED'
  | 'REJECTED';

export type AndroidWorkProjectResolution = 'EXACT' | 'NEEDS_USER_CONFIRMATION';

export type AndroidWorkHandoffState =
  | 'LOCAL_ONLY'
  | 'PENDING_SERVER_CONFIRMATION'
  | 'HANDED_OFF'
  | 'FAILED_RETRYABLE';

/** Device-local candidate. `localReference` must never be treated as a Nexus canonical ID. */
export interface AndroidWorkCandidate {
  id: string;
  source: AndroidWorkSource;
  contentType: string;
  localReference: string;
  timestamp?: string;
  suggestedProjectId?: NexusId;
  suggestedWorldId?: NexusId;
  confidence: number;
  approvalState: AndroidWorkCandidateApprovalState;
  handoffState: AndroidWorkHandoffState;
}

/** Minimal provenance reference safe to include in the authenticated Nexus handoff. */
export interface AndroidApprovedItemRef {
  itemId: string;
  source: AndroidWorkSource;
  contentType: string;
  timestamp?: string;
  confidence: number;
}

/**
 * Extends the historical `android-work-discovery-v1` marker rather than inventing a
 * parallel protocol. Authentication/Person binding is intentionally not carried by Android;
 * the server session supplies `NexusRuntimeIdentityContext` after browser/API authentication.
 */
export interface NexusAndroidWorkModeContextEnvelope {
  schema: 'nexus-android-work-mode-context-v1';
  nexusIntent: 'ask-nexus';
  nexusAiContext: 'android-work-discovery-v1';
  projectId: NexusId;
  worldId: NexusId;
  projectResolution: 'EXACT';
  selectedItems: AndroidApprovedItemRef[];
  userIntent: string;
  createdAt: string;
  handoffState: 'PENDING_SERVER_CONFIRMATION';
}

export type NexusAndroidWorkModeContextValidationReason =
  | 'VALID'
  | 'PROJECT_WORLD_REQUIRED'
  | 'PROJECT_CONFIRMATION_REQUIRED'
  | 'NO_APPROVED_ITEMS'
  | 'DUPLICATE_ITEM_ID'
  | 'INVALID_CONFIDENCE';

export interface NexusAndroidWorkModeContextValidation {
  valid: boolean;
  reason: NexusAndroidWorkModeContextValidationReason;
}

export const validateNexusAndroidWorkModeContext = (
  envelope: NexusAndroidWorkModeContextEnvelope,
): NexusAndroidWorkModeContextValidation => {
  if (!envelope.projectId || !envelope.worldId) {
    return { valid: false, reason: 'PROJECT_WORLD_REQUIRED' };
  }

  if (envelope.projectResolution !== 'EXACT') {
    return { valid: false, reason: 'PROJECT_CONFIRMATION_REQUIRED' };
  }

  if (!envelope.selectedItems.length) {
    return { valid: false, reason: 'NO_APPROVED_ITEMS' };
  }

  const ids = new Set<string>();
  for (const item of envelope.selectedItems) {
    if (ids.has(item.itemId)) {
      return { valid: false, reason: 'DUPLICATE_ITEM_ID' };
    }
    ids.add(item.itemId);

    if (!Number.isFinite(item.confidence) || item.confidence < 0 || item.confidence > 100) {
      return { valid: false, reason: 'INVALID_CONFIDENCE' };
    }
  }

  return { valid: true, reason: 'VALID' };
};

/** Current #90 fixture pair. Keep project and world IDs together. */
export const NEXUS_ANDROID_ESAFE_PROJECT_WORLD = {
  projectId: 'project-esafe-catania' as NexusId,
  worldId: 'world-esafe-catania' as NexusId,
} as const;

/**
 * Server-side bridge only. Android must never populate provider subject, role or permission.
 * A BOUND Person still proceeds fail-closed to canonical Project Participation/access policy.
 */
export const createAndroidRuntimeAccessBridgeRequest = (
  envelope: NexusAndroidWorkModeContextEnvelope,
  identity: NexusRuntimeIdentityContext,
  actionKey = 'android.work-mode.handoff',
): NexusRuntimeAccessBridgeRequest => ({
  schema: 'nexus-runtime-access-bridge-request/v1',
  identity,
  projectId: envelope.projectId,
  worldId: envelope.worldId,
  moduleId: 'soft',
  actionKey,
});
