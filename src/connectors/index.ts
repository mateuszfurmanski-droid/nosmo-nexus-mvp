export { googleDriveConnector } from './google-drive/googleDriveConnector';
export { workWalletConnector } from './work-wallet/workWalletConnector';
export { workWalletPresentation } from './work-wallet/workWalletPresentation';
export { bimFabstationConnector } from './bim-fabstation/bimFabstationConnector';
export { companyCamConnector } from './companycam/companyCamConnector';
export { hiltiConnector } from './hilti/hiltiConnector';
export { microsoft365Connector } from './microsoft365/microsoft365Connector';
export { communicationConnector } from './gmail-whatsapp/communicationConnector';
export { supplierConnector } from './suppliers/supplierConnector';
export { snipeItConnector, snipeItPresentation } from './snipe-it/snipeItConnector';
export { SnipeItServerClient } from './snipe-it/snipeItClient';
export { odkFieldFormsConnector, odkFieldFormsPresentation } from './odk/odkConnector';
export { OdkCentralServerClient } from './odk/odkCentralClient';
export * from './connectorPresentationContract';

import { googleDriveConnector } from './google-drive/googleDriveConnector';
import { workWalletConnector } from './work-wallet/workWalletConnector';
import { workWalletPresentation } from './work-wallet/workWalletPresentation';
import { bimFabstationConnector } from './bim-fabstation/bimFabstationConnector';
import { companyCamConnector } from './companycam/companyCamConnector';
import { hiltiConnector } from './hilti/hiltiConnector';
import { microsoft365Connector } from './microsoft365/microsoft365Connector';
import { communicationConnector } from './gmail-whatsapp/communicationConnector';
import { supplierConnector } from './suppliers/supplierConnector';
import { snipeItConnector, snipeItPresentation } from './snipe-it/snipeItConnector';
import { odkFieldFormsConnector, odkFieldFormsPresentation } from './odk/odkConnector';

export const nexusConnectorContracts = [
  googleDriveConnector,
  workWalletConnector,
  bimFabstationConnector,
  companyCamConnector,
  hiltiConnector,
  microsoft365Connector,
  communicationConnector,
  supplierConnector,
  snipeItConnector,
  odkFieldFormsConnector,
];

export const nexusConnectorPresentations = [
  workWalletPresentation,
  snipeItPresentation,
  odkFieldFormsPresentation,
];
