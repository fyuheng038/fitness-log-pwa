import entries from './catalog-data.json' with { type: 'json' };
import type { AppData, Exercise, LibraryItem } from './types';

export const muscleNames: Record<string, string> = {
  chest: '胸部', deltoids: '肩部', upperBack: '背部', lowerBack: '下背', trapezius: '斜方肌',
  biceps: '肱二头肌', triceps: '肱三头肌', forearm: '前臂', abs: '腹部', obliques: '腹斜肌',
  gluteal: '臀部', quadriceps: '股四头肌', hamstring: '腘绳肌', adductors: '内收肌',
  calves: '小腿', tibialis: '胫骨前肌', serratus: '前锯肌', hipFlexors: '髋屈肌',
};
export type CatalogExercise = typeof entries[number];
export const catalog: CatalogExercise[] = entries;
export const equipmentOptions = [...new Set(catalog.map(e => e.equipment))];
const key = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase();
export function byId(id?: string | null) { return catalog.find(e => e.id === id); }
export function matchName(name: string) {
  const matches = catalog.filter(e => [e.name, e.englishName, ...e.aliases].some(alias => key(alias) === key(name)));
  return matches.length === 1 ? matches[0] : undefined;
}
export function resolveExercise(ex: Pick<Exercise, 'exerciseName' | 'catalogExerciseId'>, library: LibraryItem[] = []) {
  if (ex.catalogExerciseId === null) return undefined;
  if (ex.catalogExerciseId) return byId(ex.catalogExerciseId);
  const candidates = library.filter(item => [item.exerciseName, ...(item.aliases ?? [])].some(name => key(name) === key(ex.exerciseName)));
  if (candidates.length > 1) return undefined;
  const personal = candidates[0];
  if (personal?.catalogExerciseId === null) return undefined;
  return byId(personal?.catalogExerciseId) ?? matchName(ex.exerciseName);
}
export function personalFor(ex: CatalogExercise, library: LibraryItem[]) {
  return library.find(item => resolveExercise(item)?.id === ex.id);
}
export function filterCatalog(query: string, muscle: string, equipment: string) {
  const words = key(query).split(/\s+/).filter(Boolean);
  return catalog.filter(ex => {
    const search = key([ex.name, ex.englishName, ...ex.aliases, ex.equipment, ...ex.primary.map(m => muscleNames[m]), ...ex.secondary.map(m => muscleNames[m])].join(' '));
    return words.every(word => search.includes(word)) && (!muscle || [...ex.primary, ...ex.secondary].includes(muscle)) && (!equipment || ex.equipment === equipment);
  });
}
export function addToTemplate(data: AppData, templateId: string, ex: CatalogExercise): AppData {
  const template = data.templates.find(t => t.id === templateId);
  if (!template) throw Error('模板不存在，请重新选择。');
  if (template.exercises.some(name => resolveExercise({ exerciseName: name }, data.library)?.id === ex.id)) throw Error('这个动作已在模板中。');
  return { ...data, templates: data.templates.map(t => t.id === templateId ? { ...t, exercises: [...t.exercises, ex.name] } : t) };
}
