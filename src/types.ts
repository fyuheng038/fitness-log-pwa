export type Exercise = { id: string; exerciseName: string; catalogExerciseId?: string | null; weight: string; sets: string; reps: string; note: string };
export type Training = { id: string; dayNumber: number; date: string; trainingType: string; note: string; exercises: Exercise[]; createdTime: string; updatedTime: string };
export type Template = { id: string; templateName: string; exercises: string[] };
export type DemoMedia = { src: string; kind: 'video' | 'image'; name: string };
export type LibraryItem = { id: string; exerciseName: string; personalNote: string; aliases?: string[]; catalogExerciseId?: string | null; demo?: DemoMedia };
export type AppData = { schemaVersion: 1; trainings: Training[]; templates: Template[]; library: LibraryItem[] };

export const trainingTypes = ['胸和三头', '背和二头', '肩和腿', '肩', '腿', '腹', '有氧', '自定义'];
export const defaultTemplates: Template[] = [
  { id: 'chest', templateName: '胸和三头', exercises: ['上斜推胸', '平板哑铃推胸', '平板器械卧推', '蝴蝶机夹胸'] },
  { id: 'back', templateName: '背和二头', exercises: ['单臂划船', '坐姿划船', '划船机', '高位下拉', '弯杆弯举'] },
  { id: 'shoulder', templateName: '肩和腿', exercises: ['哑铃推肩', '飞鸟', '腿部训练', '腹部训练'] },
];
