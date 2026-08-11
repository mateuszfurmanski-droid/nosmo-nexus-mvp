export const realIfcValidationBoundary = {
  noRawIfcInGraphUrls: true,
  noFullPsetsInChangeEvents: true,
  noMeshesInChangeEvents: true,
  stepIdDiagnosticOnly: true,
  manualReviewRequiredForTrustedViewerPass: true,
  manualReviewRequiredForSpatialPartnerPass: true,
} as const;
