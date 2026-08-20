import { defineNexusCore } from '../coreContract';
import type { NexusDockItemDefinition } from '../../registry/registryTypes';

export interface NexusShellState {
  activeWorldId: string;
  activeModuleId: string;
  activePanelId: string | null;
  dockItems: NexusDockItemDefinition[];
  graphVisible: boolean;
}

export const nexusShellCore = defineNexusCore({
  id: 'shell',
  label: 'Nexus Shell',
  responsibility: 'Own the single app frame: one graph background, one top context area, one bottom dock and overlay panels.',
  ownsRuntimeState: true,
  canRenderUi: true,
  canMutateProjectGraph: false,
  canReadProjectMemory: true,
  canWriteProjectMemory: false,
  phase: 'phase-4-skeleton',
  notes: 'Do not recreate extra top bars or parallel shells. Panels must sit above the persistent graph.',
});
