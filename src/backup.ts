import type { AppData } from './types';

// The feature is additive: v1 records, names and IDs remain readable by the old app.
export function normalizeBackup(raw: unknown): AppData {
  const value = raw as any;
  const fail = () => { throw new Error('不是有效的健身日志 JSON 备份'); };
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.trainings) || !Array.isArray(value.templates)) return fail();
  const native = value.format === 'fitness-log-backup';
  const library = native ? value.exerciseLibrary : value.library;
  if (!Array.isArray(library)) return fail();
  if (!value.trainings.every((t: any) => t && typeof t.date === 'string' && typeof t.trainingType === 'string' && Array.isArray(t.exercises) && t.exercises.every((e: any) => e && typeof e.exerciseName === 'string'))) return fail();
  if (!value.templates.every((t: any) => t && typeof t.templateName === 'string' && Array.isArray(t.exercises) && t.exercises.every((e: unknown) => typeof e === 'string'))) return fail();
  if (!library.every((e: any) => e && typeof e.exerciseName === 'string' && (e.aliases === undefined || Array.isArray(e.aliases) && e.aliases.every((a: unknown) => typeof a === 'string')))) return fail();
  if (!native) return value as AppData;
  return {
    schemaVersion: 1,
    trainings: value.trainings.map((t: any) => ({ ...t, id: crypto.randomUUID(), exercises: t.exercises.map((e: any) => ({ ...e, id: crypto.randomUUID(), weight: e.weight?.toString() ?? '', sets: e.sets?.toString() ?? '', reps: e.reps?.toString() ?? '' })) })),
    templates: value.templates.map((t: any) => ({ ...t, id: crypto.randomUUID() })),
    library: library.map((e: any) => ({ ...e, id: crypto.randomUUID(), personalNote: e.personalNote ?? '' })),
  };
}
