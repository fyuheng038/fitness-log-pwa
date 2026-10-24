import { defaultTemplates, type AppData } from './types.ts';

// Public builds start empty. Existing browser records are loaded unchanged.
export function createInitialData(): AppData {
  return { schemaVersion: 1, trainings: [], templates: structuredClone(defaultTemplates), library: [] };
}
