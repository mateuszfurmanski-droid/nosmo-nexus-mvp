import type { NexusFabStationPartnerProcessingState } from './fabStationManualHandoffEvidence';

export const NEXUS_FABSTATION_PACKAGE_STATUS_MAP_SCHEMA =
  'nexus-fabstation-package-status-map/v1' as const;

/**
 * Public FabStation Package History vocabulary observed in the official
 * Uploading and Managing Project Files/Packages documentation.
 */
export type NexusFabStationObservedPackageStatus =
  | 'IN_PROGRESS'
  | 'COMPLETE'
  | 'FAILED'
  | 'CANCELLED';

export interface NexusFabStationPackageStatusResolution {
  schema: typeof NEXUS_FABSTATION_PACKAGE_STATUS_MAP_SCHEMA;
  observedStatus: NexusFabStationObservedPackageStatus;
  nexusProcessingState: NexusFabStationPartnerProcessingState;
  partnerSuccessObserved: boolean;
  partnerFailureObserved: boolean;
  boundaries: {
    statusObservationIsNotApiReceipt: true;
    statusObservationDoesNotProveManifestMatch: true;
    statusObservationDoesNotBypassEvidenceReview: true;
  };
}

export const mapFabStationObservedPackageStatus = (
  observedStatus: NexusFabStationObservedPackageStatus,
): NexusFabStationPackageStatusResolution => {
  const nexusProcessingState: NexusFabStationPartnerProcessingState =
    observedStatus === 'COMPLETE'
      ? 'PROCESSED'
      : observedStatus === 'FAILED' || observedStatus === 'CANCELLED'
        ? 'REJECTED'
        : 'UNKNOWN';

  return {
    schema: NEXUS_FABSTATION_PACKAGE_STATUS_MAP_SCHEMA,
    observedStatus,
    nexusProcessingState,
    partnerSuccessObserved: observedStatus === 'COMPLETE',
    partnerFailureObserved: observedStatus === 'FAILED' || observedStatus === 'CANCELLED',
    boundaries: {
      statusObservationIsNotApiReceipt: true,
      statusObservationDoesNotProveManifestMatch: true,
      statusObservationDoesNotBypassEvidenceReview: true,
    },
  };
};
