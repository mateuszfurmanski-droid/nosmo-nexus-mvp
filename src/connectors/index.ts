export { googleDriveConnector } from './google-drive/googleDriveConnector';
export {
  WORK_WALLET_EXTERNAL_CAPABILITY_LABEL,
  workWalletConnector,
} from './work-wallet/workWalletConnector';
export {
  WORK_WALLET_PROVIDER_ID,
  isValidWorkWalletLocator,
  resolveWorkWalletCanonicalMapping,
} from './work-wallet/workWalletMappingContract';
export type {
  ResolveWorkWalletCanonicalMappingInput,
  WorkWalletCanonicalMappingResolution,
  WorkWalletExactRecordLocator,
} from './work-wallet/workWalletMappingContract';
export {
  WORK_WALLET_CONTEXT_SCHEMA,
  WORK_WALLET_CONTEXT_SOURCE,
  buildWorkWalletVerifiedContext,
} from './work-wallet/workWalletContextContract';
export type {
  BuildWorkWalletVerifiedContextInput,
  NexusWorkWalletVerifiedContextV1,
  WorkWalletGraphFocusProjection,
  WorkWalletVerificationSource,
  WorkWalletVerifiedContextResolution,
} from './work-wallet/workWalletContextContract';
export {
  WORK_WALLET_CONTEXT_MODULE_ID,
  WORK_WALLET_CONTEXT_READ_ACTION,
  evaluateWorkWalletTicketEligibility,
} from './work-wallet/workWalletTicketEligibility';
export type {
  WorkWalletTicketEligibility,
  WorkWalletTicketEligibilityInput,
  WorkWalletTicketEligibilityReason,
} from './work-wallet/workWalletTicketEligibility';
export { bimFabstationConnector } from './bim-fabstation/bimFabstationConnector';
export { companyCamConnector } from './companycam/companyCamConnector';
export { hiltiConnector } from './hilti/hiltiConnector';
export { microsoft365Connector } from './microsoft365/microsoft365Connector';
export { communicationConnector } from './gmail-whatsapp/communicationConnector';
export { supplierConnector } from './suppliers/supplierConnector';

import { googleDriveConnector } from './google-drive/googleDriveConnector';
import { workWalletConnector } from './work-wallet/workWalletConnector';
import { bimFabstationConnector } from './bim-fabstation/bimFabstationConnector';
import { companyCamConnector } from './companycam/companyCamConnector';
import { hiltiConnector } from './hilti/hiltiConnector';
import { microsoft365Connector } from './microsoft365/microsoft365Connector';
import { communicationConnector } from './gmail-whatsapp/communicationConnector';
import { supplierConnector } from './suppliers/supplierConnector';

export const nexusConnectorContracts = [
  googleDriveConnector,
  workWalletConnector,
  bimFabstationConnector,
  companyCamConnector,
  hiltiConnector,
  microsoft365Connector,
  communicationConnector,
  supplierConnector,
];
