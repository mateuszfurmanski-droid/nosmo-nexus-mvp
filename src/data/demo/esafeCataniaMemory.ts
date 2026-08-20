import type { NexusProjectMemorySnapshot } from '../projectMemory';
import { emptyProjectMemorySnapshot } from '../projectMemory';
import { applyEsafeCataniaFixtures } from './esafeCataniaFixtures';
import { applyEsafeCataniaPhase9Fixtures } from './esafeCataniaPhase9Fixtures';

export const createEsafeCataniaMemory = (): NexusProjectMemorySnapshot =>
  applyEsafeCataniaPhase9Fixtures(
    applyEsafeCataniaFixtures(emptyProjectMemorySnapshot()),
  );
