import type { NexusId } from '../../data/schemas/common.schema';
import type { NexusIfcRevisionComparisonResult } from '../../data/ifcRevisionComparison';
import type { NexusFabStationProjectPackagePlan } from './fabStationProjectPackagePlan';
import {
  compareFabStationKssAssemblyRevisions,
  type NexusFabStationKssRevisionObservation,
  type NexusFabStationKssRevisionRelation,
} from './fabStationKssRevision';

export const NEXUS_FABSTATION_REVISION_HANDOFF_SCHEMA = 'nexus-fabstation-revision-handoff/v1' as const;

export type NexusFabStationRevisionHandoffState =
  | 'REVISION_PACKAGE_READY'
  | 'NO_INCREMENTAL_PACKAGE_REQUIRED'
  | 'HUMAN_REVIEW_REQUIRED'
  | 'BLOCKED';

export type NexusFabStationProcessingFilterRecommendation =
  | 'ON'
  | 'OFF'
  | 'NOT_APPLICABLE'
  | 'HUMAN_REVIEW_REQUIRED';

export type NexusFabStationRevisionHandoffIssueCode =
  | 'IFC_COMPARISON_BLOCKED'
  | 'OBJECT_SCOPE_MISMATCH'
  | 'KSS_OBSERVATION_BLOCKED'
  | 'KSS_ASSEMBLY_MISMATCH'
  | 'CURRENT_KSS_PACKAGE_MISMATCH'
  | 'REVISION_LOWER_THAN_BASELINE'
  | 'REVISION_ORDER_UNDETERMINED'
  | 'SAME_REVISION_CHANGED_SOURCE_REQUIRES_OVERRIDE'
  | 'CORRECTION_REASON_REQUIRED'
  | 'CORRECTION_OVERRIDE_CONFLICTS_WITH_HIGHER_REVISION'
  | 'INVALID_REVISED_PDF_SELECTION';

export interface NexusFabStationRevisionHandoffIssue {
  code: NexusFabStationRevisionHandoffIssueCode;
  blocking: boolean;
  message: string;
}

export interface NexusFabStationRevisionHandoffInput {
  comparison: NexusIfcRevisionComparisonResult;
  currentPackagePlan: NexusFabStationProjectPackagePlan;
  previousKss: NexusFabStationKssRevisionObservation;
  currentKss: NexusFabStationKssRevisionObservation;
  revisedOrAdditionalPdfFileIds?: NexusId[];
  correctionWithoutRevisionIncrease?: boolean;
  correctionReason?: string;
}

export interface NexusFabStationRevisionHandoffAdvice {
  schema: typeof NEXUS_FABSTATION_REVISION_HANDOFF_SCHEMA;
  state: NexusFabStationRevisionHandoffState;
  nexusObjectId: NexusId;
  ifcGlobalId: string;
  previousRevision: string;
  currentRevision: string;
  kssAssemblyMark: string;
  previousKssRevision?: string;
  currentKssRevision?: string;
  kssRevisionRelation: NexusFabStationKssRevisionRelation;
  processingFilterRecommendation: NexusFabStationProcessingFilterRecommendation;
  correctionWithoutRevisionIncrease: boolean;
  correctionReason?: string;
  selectedFileIds: NexusId[];
  selectedFileNames: string[];
  sourceProvenanceClass: NexusFabStationProjectPackagePlan['sourceProvenanceClass'];
  issues: NexusFabStationRevisionHandoffIssue[];
  warnings: string[];
  boundaries: {
    incrementalFilesOnly: true;
    currentKssAlwaysRequiredForUpload: true;
    createsZip: false;
    uploadsToPartner: false;
    callsPartnerApi: false;
    writesPartnerState: false;
    partnerHandoffPass: false;
    requiresHumanReviewBeforeUpload: true;
  };
}

const unique = <T>(values: T[]): T[] => [...new Set(values)];

/**
 * Converts the canonical #101 IFC revision comparison plus bounded KSS revision
 * observations into FabStation-specific manual upload advice. It never performs
 * an upload and never changes the canonical IFC identity.
 */
export const createFabStationRevisionHandoffAdvice = (
  input: NexusFabStationRevisionHandoffInput,
): NexusFabStationRevisionHandoffAdvice => {
  const issues: NexusFabStationRevisionHandoffIssue[] = [];
  const warnings: string[] = [];
  const { comparison, currentPackagePlan, previousKss, currentKss } = input;
  const correctionWithoutRevisionIncrease = input.correctionWithoutRevisionIncrease === true;
  const correctionReason = input.correctionReason?.trim();

  if (comparison.state === 'COMPARISON_BLOCKED') {
    issues.push({
      code: 'IFC_COMPARISON_BLOCKED',
      blocking: true,
      message: 'FabStation revision hand-off is blocked until the canonical IFC comparison source/lineage issues are resolved.',
    });
  }

  if (
    comparison.nexusObjectId !== currentPackagePlan.nexusObjectId ||
    comparison.ifcGlobalId !== currentPackagePlan.ifcGlobalId
  ) {
    issues.push({
      code: 'OBJECT_SCOPE_MISMATCH',
      blocking: true,
      message: 'The revision comparison and current FabStation package plan must reference the exact same Nexus Object and IFC GlobalId.',
    });
  }

  if (previousKss.state !== 'READY' || currentKss.state !== 'READY') {
    issues.push({
      code: 'KSS_OBSERVATION_BLOCKED',
      blocking: true,
      message: 'Both previous and current KSS revision observations must be READY before upload advice is produced.',
    });
  }

  if (previousKss.assemblyMark !== currentKss.assemblyMark) {
    issues.push({
      code: 'KSS_ASSEMBLY_MISMATCH',
      blocking: true,
      message: 'Previous and current KSS observations must target the same exact assembly mark.',
    });
  }

  const currentKssFile = currentPackagePlan.files.find((file) => file.kind === 'KSS');
  if (
    !currentKssFile ||
    currentKssFile.fileName !== currentKss.fileName ||
    (currentKss.sourceFileSha256 && currentKssFile.sha256.toLowerCase() !== currentKss.sourceFileSha256.toLowerCase())
  ) {
    issues.push({
      code: 'CURRENT_KSS_PACKAGE_MISMATCH',
      blocking: true,
      message: 'The current KSS observation must exactly match the KSS file frozen in the current FabStation package plan.',
    });
  }

  const revisionRelation = compareFabStationKssAssemblyRevisions(previousKss, currentKss);
  if (revisionRelation === 'LOWER') {
    issues.push({
      code: 'REVISION_LOWER_THAN_BASELINE',
      blocking: true,
      message: 'The current KSS assembly revision is lower than the previous revision; automatic revision hand-off advice is blocked.',
    });
  }
  if (revisionRelation === 'UNDETERMINED') {
    issues.push({
      code: 'REVISION_ORDER_UNDETERMINED',
      blocking: false,
      message: 'KSS revision ordering cannot be determined safely. Non-numeric ordering requires human review.',
    });
  }
  if (revisionRelation === 'HIGHER' && correctionWithoutRevisionIncrease) {
    issues.push({
      code: 'CORRECTION_OVERRIDE_CONFLICTS_WITH_HIGHER_REVISION',
      blocking: true,
      message: 'Correction-without-revision-increase cannot be asserted when the current KSS revision is already higher.',
    });
  }
  if (revisionRelation === 'SAME' && correctionWithoutRevisionIncrease && !correctionReason) {
    issues.push({
      code: 'CORRECTION_REASON_REQUIRED',
      blocking: true,
      message: 'A human correction reason is required when forcing reprocessing without increasing the KSS revision.',
    });
  }

  const currentIfcFile = currentPackagePlan.files.find((file) => file.kind === 'IFC');
  const sourceIfcChanged = comparison.diagnosticDeltas.some((delta) => delta.field === 'source-sha256');
  const comparisonSignalsChange = comparison.state === 'HUMAN_REVIEW_REQUIRED';

  if (
    revisionRelation === 'SAME' &&
    !correctionWithoutRevisionIncrease &&
    (sourceIfcChanged || comparisonSignalsChange)
  ) {
    issues.push({
      code: 'SAME_REVISION_CHANGED_SOURCE_REQUIRES_OVERRIDE',
      blocking: false,
      message: 'The IFC source/change signal changed while the KSS revision stayed the same. Human review must explicitly choose correction-without-revision-increase before recommending Processing Filter OFF.',
    });
  }

  const pdfFiles = currentPackagePlan.files.filter((file) => file.kind === 'PDF');
  const requestedPdfIds = unique(input.revisedOrAdditionalPdfFileIds ?? []);
  const pdfById = new Map(pdfFiles.map((file) => [file.nexusFileId, file]));
  const invalidPdfIds = requestedPdfIds.filter((id) => !pdfById.has(id));
  if (invalidPdfIds.length > 0) {
    issues.push({
      code: 'INVALID_REVISED_PDF_SELECTION',
      blocking: true,
      message: `Revision PDF selection contains IDs not present as PDFs in the current package plan: ${invalidPdfIds.join(', ')}.`,
    });
  }

  let state: NexusFabStationRevisionHandoffState;
  let processingFilterRecommendation: NexusFabStationProcessingFilterRecommendation;

  if (issues.some((issue) => issue.blocking)) {
    state = 'BLOCKED';
    processingFilterRecommendation = 'HUMAN_REVIEW_REQUIRED';
  } else if (revisionRelation === 'UNDETERMINED') {
    state = 'HUMAN_REVIEW_REQUIRED';
    processingFilterRecommendation = 'HUMAN_REVIEW_REQUIRED';
  } else if (
    revisionRelation === 'SAME' &&
    !correctionWithoutRevisionIncrease &&
    (sourceIfcChanged || comparisonSignalsChange || requestedPdfIds.length > 0)
  ) {
    state = 'HUMAN_REVIEW_REQUIRED';
    processingFilterRecommendation = 'HUMAN_REVIEW_REQUIRED';
  } else if (
    revisionRelation === 'SAME' &&
    !correctionWithoutRevisionIncrease &&
    !sourceIfcChanged &&
    !comparisonSignalsChange &&
    requestedPdfIds.length === 0
  ) {
    state = 'NO_INCREMENTAL_PACKAGE_REQUIRED';
    processingFilterRecommendation = 'NOT_APPLICABLE';
  } else if (revisionRelation === 'SAME' && correctionWithoutRevisionIncrease) {
    state = 'REVISION_PACKAGE_READY';
    processingFilterRecommendation = 'OFF';
  } else {
    state = 'REVISION_PACKAGE_READY';
    processingFilterRecommendation = 'ON';
  }

  const selectedFiles = state === 'REVISION_PACKAGE_READY'
    ? [
        ...(currentKssFile ? [currentKssFile] : []),
        ...(sourceIfcChanged && currentIfcFile ? [currentIfcFile] : []),
        ...requestedPdfIds.map((id) => pdfById.get(id)).filter((file): file is NonNullable<typeof file> => Boolean(file)),
      ]
    : [];

  if (state === 'REVISION_PACKAGE_READY' && !sourceIfcChanged) {
    warnings.push('Current IFC source fingerprint is unchanged; the incremental package advice does not include the unchanged IFC file.');
  }
  if (state === 'REVISION_PACKAGE_READY' && requestedPdfIds.length === 0) {
    warnings.push('No revised/additional PDF IDs were declared; the incremental package advice includes no PDFs.');
  }
  if (processingFilterRecommendation === 'OFF') {
    warnings.push('Processing Filter OFF is recommended only for the explicitly reviewed correction-without-revision-increase case; it causes FabStation Steel to process all assemblies in the uploaded KSS.');
  }
  if (currentPackagePlan.sourceProvenanceClass === 'SYNTHETIC_DEMO') {
    warnings.push('The current package plan is SYNTHETIC_DEMO; this advice is regression evidence only and cannot establish partner execution or real-project PASS.');
  }

  return {
    schema: NEXUS_FABSTATION_REVISION_HANDOFF_SCHEMA,
    state,
    nexusObjectId: comparison.nexusObjectId,
    ifcGlobalId: comparison.ifcGlobalId,
    previousRevision: comparison.previousRevision,
    currentRevision: comparison.currentRevision,
    kssAssemblyMark: currentKss.assemblyMark,
    previousKssRevision: previousKss.assemblyRevision,
    currentKssRevision: currentKss.assemblyRevision,
    kssRevisionRelation: revisionRelation,
    processingFilterRecommendation,
    correctionWithoutRevisionIncrease,
    correctionReason,
    selectedFileIds: unique(selectedFiles.map((file) => file.nexusFileId)),
    selectedFileNames: unique(selectedFiles.map((file) => file.fileName)),
    sourceProvenanceClass: currentPackagePlan.sourceProvenanceClass,
    issues,
    warnings,
    boundaries: {
      incrementalFilesOnly: true,
      currentKssAlwaysRequiredForUpload: true,
      createsZip: false,
      uploadsToPartner: false,
      callsPartnerApi: false,
      writesPartnerState: false,
      partnerHandoffPass: false,
      requiresHumanReviewBeforeUpload: true,
    },
  };
};
