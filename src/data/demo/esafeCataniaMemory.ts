import type { NexusProjectMemorySnapshot } from '../projectMemory';
import { emptyProjectMemorySnapshot } from '../projectMemory';
import { applyEsafeCataniaFixtures } from './esafeCataniaFixtures';

export const createEsafeCataniaMemory = (): NexusProjectMemorySnapshot =>
  applyEsafeCataniaFixtures(emptyProjectMemorySnapshot());
