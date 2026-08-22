export const NEXUS_FABSTATION_KSS_REVISION_SCHEMA = 'nexus-fabstation-kss-revision/v1' as const;
export const MAX_FABSTATION_KSS_LINE_LENGTH = 254;

export type NexusFabStationKssRevisionState = 'READY' | 'BLOCKED';
export type NexusFabStationKssRevisionRelation = 'HIGHER' | 'SAME' | 'LOWER' | 'UNDETERMINED';

export type NexusFabStationKssRevisionIssueCode =
  | 'INVALID_FILE_NAME'
  | 'INVALID_FILE_SIZE'
  | 'INVALID_SHA256'
  | 'KISS_IDENTIFICATION_MISSING'
  | 'LINE_TOO_LONG'
  | 'ASSEMBLY_MARK_REQUIRED'
  | 'ASSEMBLY_NOT_FOUND'
  | 'ASSEMBLY_REVISION_AMBIGUOUS';

export interface NexusFabStationKssRevisionIssue {
  code: NexusFabStationKssRevisionIssueCode;
  blocking: true;
  message: string;
}

export interface NexusFabStationKssRevisionObservation {
  schema: typeof NEXUS_FABSTATION_KSS_REVISION_SCHEMA;
  state: NexusFabStationKssRevisionState;
  fileName: string;
  fileSizeBytes: number;
  sourceFileSha256?: string;
  assemblyMark: string;
  assemblyRevision?: string;
  drawingNumbers: string[];
  detailRowCount: number;
  issues: NexusFabStationKssRevisionIssue[];
  boundaries: string[];
}

export interface NexusFabStationKssRevisionInput {
  text: string;
  fileName: string;
  fileSizeBytes: number;
  sourceFileSha256?: string;
  assemblyMark: string;
}

const SHA256_HEX = /^[a-f0-9]{64}$/i;
const INTEGER_REVISION = /^\d+$/;

const unique = <T>(values: T[]): T[] => [...new Set(values)];

/**
 * Reads only the bounded KISS/KSS fields required to observe an assembly mark
 * and its exported revision. It is not a full KSS importer and never mutates
 * Nexus/FabStation state.
 */
export const observeFabStationKssAssemblyRevision = (
  input: NexusFabStationKssRevisionInput,
): NexusFabStationKssRevisionObservation => {
  const issues: NexusFabStationKssRevisionIssue[] = [];
  const assemblyMark = input.assemblyMark.trim();

  if (!input.fileName.toLowerCase().endsWith('.kss')) {
    issues.push({ code: 'INVALID_FILE_NAME', blocking: true, message: 'FabStation KSS revision observation requires a .kss source.' });
  }
  if (!Number.isSafeInteger(input.fileSizeBytes) || input.fileSizeBytes <= 0) {
    issues.push({ code: 'INVALID_FILE_SIZE', blocking: true, message: 'KSS source requires a positive safe byte length.' });
  }
  if (input.sourceFileSha256 && !SHA256_HEX.test(input.sourceFileSha256)) {
    issues.push({ code: 'INVALID_SHA256', blocking: true, message: 'KSS source SHA-256 must be 64 hexadecimal characters when supplied.' });
  }
  if (!assemblyMark) {
    issues.push({ code: 'ASSEMBLY_MARK_REQUIRED', blocking: true, message: 'An exact KSS assembly mark is required.' });
  }

  const lines = input.text.replace(/\r\n/g, '\n').split('\n');
  const firstNonEmpty = lines.find((line) => line.trim().length > 0)?.trim();
  if (!firstNonEmpty?.startsWith('KISS,')) {
    issues.push({ code: 'KISS_IDENTIFICATION_MISSING', blocking: true, message: 'KSS source does not start with the expected KISS identification record.' });
  }
  if (lines.some((line) => line.length > MAX_FABSTATION_KSS_LINE_LENGTH)) {
    issues.push({ code: 'LINE_TOO_LONG', blocking: true, message: `KSS source contains a line longer than ${MAX_FABSTATION_KSS_LINE_LENGTH} characters.` });
  }

  const matchingRows = lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith('D,'))
    .map((line) => line.split(',').map((token) => token.trim()))
    .filter((fields) => fields.length >= 5 && fields[3] === assemblyMark);

  if (assemblyMark && matchingRows.length === 0) {
    issues.push({ code: 'ASSEMBLY_NOT_FOUND', blocking: true, message: `Assembly mark ${assemblyMark} is not present in the KSS detail rows.` });
  }

  const revisions = unique(
    matchingRows
      .map((fields) => fields[2])
      .filter((value): value is string => Boolean(value)),
  );
  if (revisions.length > 1) {
    issues.push({
      code: 'ASSEMBLY_REVISION_AMBIGUOUS',
      blocking: true,
      message: `Assembly mark ${assemblyMark} resolves to multiple KSS drawing revisions: ${revisions.join(', ')}.`,
    });
  }

  const drawingNumbers = unique(
    matchingRows
      .map((fields) => fields[1])
      .filter((value): value is string => Boolean(value)),
  );

  return {
    schema: NEXUS_FABSTATION_KSS_REVISION_SCHEMA,
    state: issues.length === 0 ? 'READY' : 'BLOCKED',
    fileName: input.fileName,
    fileSizeBytes: input.fileSizeBytes,
    sourceFileSha256: input.sourceFileSha256?.toLowerCase(),
    assemblyMark,
    assemblyRevision: revisions.length === 1 ? revisions[0] : undefined,
    drawingNumbers,
    detailRowCount: matchingRows.length,
    issues,
    boundaries: [
      'KSS observation reads exported revision metadata only; it does not prove fabrication status, drawing approval or as-built state.',
      'The detail record is interpreted structurally as D, Drawing No, Drawing Rev, Assembly Mark, Part Mark, Quantity, ... according to the documented KISS/KSS format.',
      'Non-numeric revision ordering is deliberately not guessed.',
    ],
  };
};

export const compareFabStationKssAssemblyRevisions = (
  previous: NexusFabStationKssRevisionObservation,
  current: NexusFabStationKssRevisionObservation,
): NexusFabStationKssRevisionRelation => {
  if (previous.state !== 'READY' || current.state !== 'READY') return 'UNDETERMINED';
  if (previous.assemblyMark !== current.assemblyMark) return 'UNDETERMINED';
  const previousRevision = previous.assemblyRevision;
  const currentRevision = current.assemblyRevision;
  if (!previousRevision || !currentRevision) return 'UNDETERMINED';
  if (previousRevision === currentRevision) return 'SAME';
  if (INTEGER_REVISION.test(previousRevision) && INTEGER_REVISION.test(currentRevision)) {
    const previousValue = Number(previousRevision);
    const currentValue = Number(currentRevision);
    if (currentValue > previousValue) return 'HIGHER';
    if (currentValue < previousValue) return 'LOWER';
  }
  return 'UNDETERMINED';
};
