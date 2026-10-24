import { openDB } from 'idb';
import { createInitialData } from './initialData';
import type { AppData } from './types';

const dbPromise = openDB('fitness-log-pwa', 1, {
  upgrade(db) { db.createObjectStore('state'); },
});

export async function loadData(): Promise<AppData> {
  const db = await dbPromise;
  const existing = await db.get('state', 'app');
  if (existing) return existing as AppData;
  const initial = createInitialData();
  await db.put('state', initial, 'app');
  return initial;
}

export async function saveData(data: AppData) { await (await dbPromise).put('state', data, 'app'); }

export { normalizeBackup } from './backup';

export function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
