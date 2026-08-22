import { runNexusBimContractE2eHarness } from './bimContractE2eHarness';

const result = runNexusBimContractE2eHarness();

if (result.overall !== 'AUTOMATED_PASS') {
  throw new Error(`Synthetic BIM contract E2E harness blocked: ${JSON.stringify(result.gates)}`);
}

if (
  result.provenance !== 'SYNTHETIC_DEMO' ||
  result.externalValidation.realIfc !== 'BLOCKED' ||
  result.externalValidation.trustedViewer !== 'BLOCKED' ||
  result.externalValidation.androidFold !== 'BLOCKED' ||
  result.externalValidation.partnerHandoff !== 'BLOCKED' ||
  result.externalValidation.fabStationCapability !== 'BLOCKED_PENDING_PARTNER_EVIDENCE'
) {
  throw new Error('Synthetic harness attempted to overstate an external validation or partner capability gate.');
}

console.log(JSON.stringify(result, null, 2));
