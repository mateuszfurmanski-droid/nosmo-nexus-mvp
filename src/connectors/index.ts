export { googleDriveConnector } from './google-drive/googleDriveConnector';
export { workWalletConnector } from './work-wallet/workWalletConnector';
export { bimFabstationConnector } from './bim-fabstation/bimFabstationConnector';
export {
  FABSTATION_CANDIDATE_DESCRIPTOR,
  MAX_SPATIAL_HAND_OFF_JSON_BYTES,
  NEXUS_SPATIAL_HAND_OFF_SCHEMA,
  createNexusSpatialHandOff,
} from './bim-fabstation/spatialHandoff';
export type {
  NexusSpatialConnectorClaimStatus,
  NexusSpatialConnectorMaturity,
  NexusSpatialHandOffInput,
  NexusSpatialHandOffPacket,
  NexusSpatialHandOffResolution,
  NexusSpatialHandoffSource,
  NexusSpatialOperationalContext,
  NexusSpatialOperationalState,
  NexusSpatialPartnerDescriptor,
} from './bim-fabstation/spatialHandoff';
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
