export type NexusModuleStatus = 'active' | 'prototype' | 'planned' | 'disabled';
export type NexusConnectorStatus = 'active-reference' | 'reference-layer' | 'planned' | 'disabled';
export type NexusWorldStatus = 'active' | 'demo' | 'planned' | 'disabled';
export type NexusDockPlacement = 'top' | 'bottom' | 'panel-only' | 'hidden';

export type NexusObjectType =
  | 'Project'
  | 'ProjectWorld'
  | 'Person'
  | 'Company'
  | 'File'
  | 'Document'
  | 'Drawing'
  | 'Task'
  | 'Decision'
  | 'Note'
  | 'Message'
  | 'Evidence'
  | 'Issue'
  | 'Approval'
  | 'Room'
  | 'Floor'
  | 'Door'
  | 'Asset'
  | 'Product'
  | 'Component'
  | 'Equipment'
  | 'Material'
  | 'WorkPackage'
  | 'InstallationObject'
  | 'Inspection'
  | 'TimelineEvent'
  | 'Other';

export interface NexusModuleDefinition {
  id: string;
  label: string;
  description: string;
  status: NexusModuleStatus;
  dock: boolean;
  panel: string;
  requiredConnectors: string[];
  linkedObjects: NexusObjectType[];
  migrationSource?: string;
  notes?: string;
}

export interface NexusConnectorDefinition {
  id: string;
  name: string;
  category: string;
  status: NexusConnectorStatus;
  sourceOfTruth: string;
  nexusRole: string;
  objectLinks: NexusObjectType[];
  actions: string[];
  notes?: string;
}

export interface NexusWorldDefinition {
  id: string;
  name: string;
  status: NexusWorldStatus;
  description: string;
  defaultRole: string;
  allowedRoles: string[];
  modules: string[];
  connectors: string[];
  notes?: string;
}

export interface NexusDockItemDefinition {
  id: string;
  moduleId: string;
  label: string;
  placement: NexusDockPlacement;
  order: number;
  enabled: boolean;
  iconKey?: string;
  notes?: string;
}
