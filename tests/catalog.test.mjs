import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { catalog, matchName, resolveExercise, filterCatalog, addToTemplate, muscleNames } from '../src/catalog.ts';
import { normalizeBackup } from '../src/backup.ts';

const sample = () => ({ schemaVersion:1, trainings:[{id:'original-training',dayNumber:154,date:'2026-09-23',trainingType:'胸和三头',note:'原始备注',createdTime:'2026-09-23',updatedTime:'2026-09-23',exercises:[{id:'original-exercise',exerciseName:'平板哑铃推胸',weight:'12',sets:'3',reps:'10',note:'保留技巧'}]}],templates:[{id:'template',templateName:'原模板',exercises:['平板哑铃推胸']}],library:[{id:'personal',exerciseName:'我的划船',personalNote:'座椅第三档'}] });
test('旧版备份往返保留训练、ID、名称、技巧与模板，不改写输入', () => {
  const data = sample(); const before = JSON.stringify(data);
  assert.deepEqual(normalizeBackup(JSON.parse(before)),data);
  assert.equal(JSON.stringify(data),before);
});
test('新扩展字段和自定义演示随 JSON 完整往返', () => {
  const data = sample(); data.library[0] = {...data.library[0],catalogExerciseId:'Seated_Cable_Rows',aliases:['旧动作名'],demo:{src:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',kind:'image',name:'我的演示.gif'}};
  data.trainings[0].exercises[0].catalogExerciseId='Dumbbell_Bench_Press';
  assert.deepEqual(normalizeBackup(JSON.parse(JSON.stringify(data))),data);
});
test('含非字符串动作或别名的损坏备份被拒绝', () => {
  const data = sample(); data.templates[0].exercises=[null]; assert.throws(()=>normalizeBackup(data));
  const other = sample(); other.library[0].aliases=[123]; assert.throws(()=>normalizeBackup(other));
  assert.throws(()=>normalizeBackup({schemaVersion:2}));
});
test('原生版备份兼容数字重量并保留扩展字段', () => {
  const data=sample(); data.format='fitness-log-backup'; data.exerciseLibrary=data.library; delete data.library;
  data.trainings[0].exercises[0].weight=12;
  const result=normalizeBackup(data); assert.equal(result.trainings[0].exercises[0].weight,'12'); assert.equal(result.library[0].personalNote,'座椅第三档');
});
test('精确别名可关联；歧义名称不会被猜测', () => {
  assert.equal(matchName('平板哑铃推胸')?.id,'Dumbbell_Bench_Press');
  for(const name of ['飞鸟','划船机','上斜推胸','腿部训练']) assert.equal(matchName(name),undefined);
});
test('手动关联和改名前别名能关联历史；显式取消关联优先', () => {
  const library=[{id:'a',exerciseName:'新名字',aliases:['旧名字'],personalNote:'',catalogExerciseId:'Seated_Cable_Rows'}];
  assert.equal(resolveExercise({exerciseName:'旧名字'},library)?.id,'Seated_Cable_Rows');
  assert.equal(resolveExercise({exerciseName:'旧名字',catalogExerciseId:null},library),undefined);
  assert.equal(resolveExercise({exerciseName:'平板哑铃卧推'},[{id:'b',exerciseName:'平板哑铃卧推',personalNote:'',catalogExerciseId:null}]),undefined);
});
test('中文、英文、器械与肌肉组合筛选', () => {
  assert.equal(filterCatalog('', 'chest', '哑铃').length,2);
  assert.equal(filterCatalog('dumbbell bench', '', '').length,1);
  assert.equal(filterCatalog('不存在的动作', '', '').length,0);
});
test('模板添加不覆盖旧条目，并识别旧名称重复', () => {
  const data=sample(); const before=JSON.stringify(data);
  assert.throws(()=>addToTemplate(data,'template',catalog[0]),/已在模板/);
  const next=addToTemplate(data,'template',catalog.find(e=>e.id==='Plank'));
  assert.deepEqual(next.templates[0].exercises,['平板哑铃推胸','平板支撑']);
  assert.equal(JSON.stringify(data),before);
});
test('24个动作均有两个真实 JPEG、来源和可绘制肌群', () => {
  const body=JSON.parse(readFileSync(new URL('../src/body-paths.json',import.meta.url),'utf8'));
  const slugs=new Set([...body.front.parts,...body.back.parts].map(p=>p.slug));
  assert.equal(catalog.length,24); assert.equal(new Set(catalog.map(e=>e.id)).size,24);
  for(const ex of catalog){
    assert.equal(ex.images.length,2); assert.ok(ex.source.startsWith('https://github.com/yuhonas/'));
    for(const muscle of [...ex.primary,...ex.secondary])assert.ok(slugs.has(muscle)&&muscleNames[muscle]);
    for(const image of ex.images){const url=new URL('../public'+image,import.meta.url);assert.ok(existsSync(url));const bytes=readFileSync(url);assert.equal(bytes[0],255);assert.equal(bytes[1],216);assert.ok(bytes.length>1000);}
  }
});
