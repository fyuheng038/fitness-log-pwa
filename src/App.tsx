import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowLeft, BarChart3, BookOpen, CalendarDays, ChevronRight, CloudDownload, Dumbbell, FileDown, Home, Plus, Save, Search, Settings2, Trash2, Upload } from 'lucide-react';
import { download, loadData, normalizeBackup, saveData } from './storage';
import { trainingTypes, type AppData, type Exercise, type Template, type Training } from './types';

import ExerciseLibrary, { ExercisePicker, MuscleHistory } from './ExerciseLibrary';
import { byId, matchName, personalFor, resolveExercise } from './catalog';

type Tab = 'home' | 'history' | 'templates' | 'library' | 'stats';
type View = { type: 'tabs'; tab: Tab } | { type: 'choose' } | { type: 'edit'; training?: Training; trainingType?: string; templateId?: string; seedExercise?: string } | { type: 'template'; template?: Template } | { type: 'detail'; training: Training } | { type: 'backup' };
const uid = () => crypto.randomUUID();
const today = () => new Date().toLocaleDateString('sv-SE');
const fmt = (date: string) => date.split('-').map(Number).join('.');
const emptyExercise = (name = '', note = ''): Exercise => ({ id: uid(), exerciseName: name, catalogExerciseId: matchName(name)?.id, weight: '', sets: '', reps: '', note });

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [view, setView] = useState<View>({ type: 'tabs', tab: 'home' });
  useEffect(() => { loadData().then(setData); }, []);
  async function update(next: AppData) { await saveData(next); setData(next); }
  if (!data) return <main className="loading"><Activity className="spin" /><span>正在打开健身日志…</span></main>;
  const goTab = (tab: Tab) => setView({ type: 'tabs', tab });
  return <div className="app-shell">
    {view.type === 'tabs' && <>
      {view.tab === 'home' && <Dashboard data={data} navigate={setView} />}
      {view.tab === 'history' && <History data={data} navigate={setView} />}
      {view.tab === 'templates' && <Templates data={data} update={update} create={() => setView({ type: 'template' })} edit={(template) => setView({ type: 'template', template })} />}
      {view.tab === 'library' && <ExerciseLibrary data={data} update={update} start={ex => setView({type:'edit', trainingType:'自定义', seedExercise:ex.id})} />}
      {view.tab === 'stats' && <Stats data={data} />}
      <Nav active={view.tab} go={goTab} />
    </>}
    {view.type === 'choose' && <Choose data={data} back={() => goTab('home')} choose={(trainingType, templateId) => setView({ type: 'edit', trainingType, templateId })} />}
    {view.type === 'edit' && <Editor data={data} update={update} seedExercise={view.seedExercise} initial={view.training} type={view.trainingType} templateId={view.templateId} back={() => view.training ? setView({ type: 'detail', training: view.training }) : goTab('home')} save={async (training) => { const exists = data.trainings.some(t => t.id === training.id); const next = { ...data, trainings: exists ? data.trainings.map(t => t.id === training.id ? training : t) : [...data.trainings, training] }; await update(next); setView({ type: 'detail', training }); }} />}
    {view.type === 'template' && <TemplateEditor data={data} update={update} initial={view.template} back={() => goTab('templates')} save={async (template) => { const exists = data.templates.some(t => t.id === template.id); const next = { ...data, templates: exists ? data.templates.map(t => t.id === template.id ? template : t) : [...data.templates, template] }; await saveData(next); setData(next); goTab('templates'); }} />}
    {view.type === 'detail' && <Detail training={data.trainings.find(t => t.id === view.training.id) ?? view.training} back={() => goTab('history')} edit={(training) => setView({ type: 'edit', training })} remove={async (id) => { if (confirm('确定删除这次训练？')) { await update({ ...data, trainings: data.trainings.filter(t => t.id !== id) }); goTab('history'); } }} />}
    {view.type === 'backup' && <Backup data={data} update={update} back={() => goTab('home')} />}
  </div>;
}

function Header({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: () => void; action?: React.ReactNode }) {
  return <header className="header">{back && <button className="icon-button" onClick={back}><ArrowLeft /></button>}<div className="header-copy"><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{action}</header>;
}
function Card({ children, className = '' }: React.PropsWithChildren<{ className?: string }>) { return <section className={`card ${className}`}>{children}</section>; }

function Dashboard({ data, navigate }: { data: AppData; navigate: (v: View) => void }) {
  const sorted = [...data.trainings].sort((a,b) => b.dayNumber-a.dayNumber || b.date.localeCompare(a.date)); const latest = sorted[0]; const next = (latest?.dayNumber ?? 0)+1;
  const gap = latest ? Math.max(0, Math.floor((new Date(today()).getTime()-new Date(latest.date).getTime())/86400000)) : 0;
  return <main><Header title="健身日志 🏋️" subtitle="你的私人训练记录" action={<button className="text-button" onClick={() => navigate({ type:'backup' })}><CloudDownload size={18}/>备份</button>} />
    <Card className="hero"><span className="eyebrow">当前训练天数</span><strong>Day{latest?.dayNumber ?? 0}</strong><span className="accent-line"><Activity size={18}/> 共完成 {data.trainings.length} 次训练</span></Card>
    <div className="metric-grid"><Card><span className="eyebrow">最近一次</span><b>{latest ? fmt(latest.date) : '暂无'}</b><small>{latest?.trainingType}</small></Card><Card><span className="eyebrow">距离上次</span><b>{gap}<i> 天</i></b><small>{gap===0?'就是今天':'保持节奏'}</small></Card></div>
    <button className="primary" onClick={() => navigate({ type:'choose' })}>开始今日训练 · Day{next}</button>
    {latest && <button className="card latest" onClick={() => navigate({ type:'detail', training: latest })}><span><small>继续查看上次训练</small><b>{latest.trainingType}</b></span><ChevronRight /></button>}
  </main>;
}

function Choose({ data, back, choose }: { data: AppData; back:()=>void; choose:(t:string, templateId?:string)=>void }) {
  const max = Math.max(0, ...data.trainings.map(t => t.dayNumber));
  const blankTypes = trainingTypes.filter(type => !data.templates.some(t => t.templateName === type));
  return <main><Header title="今天练什么？" subtitle={`${fmt(today())} · Day${max+1}`} back={back}/>
    {data.templates.length > 0 && <><div className="section-line"><h2>我的模板</h2><small className="muted">{data.templates.length} 个模板</small></div><div className="choice-grid">{data.templates.map(t => <button className="featured template-choice" onClick={() => choose(t.templateName, t.id)} key={t.id}><b>{t.templateName}</b><small>使用模板 · {t.exercises.filter(name => name.trim()).length} 个动作</small></button>)}</div></>}
    <div className="section-line"><h2>空白记录</h2></div><div className="choice-grid">{blankTypes.map(type => <button onClick={() => choose(type)} key={type}><b>{type}</b><small>自行添加动作</small></button>)}</div>
  </main>;
}

function Editor({ data, update, initial, type, templateId, seedExercise, back, save }: { data:AppData; update:(d:AppData)=>Promise<void>; initial?:Training; type?:string; templateId?:string; seedExercise?:string; back:()=>void; save:(t:Training)=>Promise<void> }) {
  const max=Math.max(0,...data.trainings.map(t=>t.dayNumber)); const template=data.templates.find(t=>t.id===templateId); const tips=new Map(data.library.map(i=>[i.exerciseName,i.personalNote]));
  const seed = byId(seedExercise);
  const names = seed ? [seed.name] : template?.exercises.filter(name => name.trim()) ?? [];
  const [picking,setPicking] = useState(false);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const [training,setTraining]=useState<Training>(initial ? structuredClone(initial) : { id:uid(), dayNumber:max+1,date:today(),trainingType:template?.templateName??type??'',note:'',createdTime:new Date().toISOString(),updatedTime:new Date().toISOString(),exercises:(names.length ? names : ['']).map(n=>{const ex=resolveExercise({exerciseName:n},data.library);return {...emptyExercise(n,tips.get(n)??(ex?personalFor(ex,data.library)?.personalNote:'')??''),catalogExerciseId:ex?.id};}) });
  const patchEx=(id:string,p:Partial<Exercise>)=>setTraining(t=>({...t,exercises:t.exercises.map(e=>e.id===id?{...e,...p}:e)}));
  return <main><Header title={initial?'编辑训练':'记录训练'} subtitle="只填需要的数据，其余可以留空" back={saving?undefined:back}/><Card className="form-card"><div className="input-row"><label>日期<input type="date" value={training.date} onChange={e=>setTraining({...training,date:e.target.value})}/></label><label>训练编号<input type="number" value={training.dayNumber} onChange={e=>setTraining({...training,dayNumber:Number(e.target.value)})}/></label></div><label>训练类型<input value={training.trainingType} onChange={e=>setTraining({...training,trainingType:e.target.value})}/></label></Card>
    <div className="section-line"><h2>动作 · {training.exercises.length}</h2><button type="button" className="text-button catalog-link" onClick={()=>setPicking(true)}>从动作库选择</button><button className="text-button" onClick={()=>setTraining({...training,exercises:[...training.exercises,emptyExercise()]})}><Plus/>添加</button></div>
    <div className="stack">{training.exercises.map((e,i)=><Card className="exercise" key={e.id}><div className="between"><span className="number">{String(i+1).padStart(2,'0')}</span><button className="icon-button" onClick={()=>setTraining({...training,exercises:training.exercises.filter(x=>x.id!==e.id)})}><Trash2 size={18}/></button></div><input placeholder="动作名称" value={e.exerciseName} onChange={x=>patchEx(e.id,{exerciseName:x.target.value,catalogExerciseId:matchName(x.target.value)?.id})}/><div className="input-row three"><label>重量 kg<input inputMode="decimal" value={e.weight} onChange={x=>patchEx(e.id,{weight:x.target.value})}/></label><label>次数<input inputMode="numeric" value={e.reps} onChange={x=>patchEx(e.id,{reps:x.target.value})}/></label><label>组数<input inputMode="numeric" value={e.sets} onChange={x=>patchEx(e.id,{sets:x.target.value})}/></label></div><label>动作备注 / 技巧<input placeholder="例如：不要贴太实" value={e.note} onChange={x=>patchEx(e.id,{note:x.target.value})}/></label></Card>)}</div>
    <label className="standalone-label">本次训练备注<textarea value={training.note} onChange={e=>setTraining({...training,note:e.target.value})}/></label>{error&&<p role="alert" className="form-error">{error}</p>}<button className="primary" disabled={saving||!training.trainingType||!training.date} onClick={async()=>{setSaving(true);setError('');try{await save({...training,updatedTime:new Date().toISOString()});}catch{setError('保存失败，请重试。');setSaving(false);}}}><Save/>{saving?'正在保存…':'完成并保存'}</button>{picking&&<ExercisePicker data={data} update={update} close={()=>setPicking(false)} pick={ex=>setTraining(t=>{const next={...emptyExercise(ex.name,personalFor(ex,data.library)?.personalNote??''),catalogExerciseId:ex.id};const empty=t.exercises.length===1&&['exerciseName','weight','sets','reps','note'].every(k=>!t.exercises[0][k as keyof Exercise]);return {...t,exercises:empty?[next]:[...t.exercises,next]};})}/>}</main>;
}

function History({ data, navigate }: { data:AppData; navigate:(v:View)=>void }) { const [q,setQ]=useState(''); const items=useMemo(()=>[...data.trainings].filter(t=>`${t.dayNumber}${t.trainingType}${t.note}`.includes(q)).sort((a,b)=>b.date.localeCompare(a.date)||b.dayNumber-a.dayNumber),[data,q]); return <main><Header title="训练历史" subtitle="按类型、备注或 Day 编号搜索"/><div className="search"><Search/><input placeholder="搜索训练记录" value={q} onChange={e=>setQ(e.target.value)}/></div><div className="stack">{items.map(t=><button className="card history-item" key={t.id} onClick={()=>navigate({type:'detail',training:t})}><span><small>{fmt(t.date)}</small><b>Day{t.dayNumber}</b></span><span>{t.trainingType}<ChevronRight/></span></button>)}</div></main> }

function Detail({ training,back,edit,remove }: {training:Training;back:()=>void;edit:(t:Training)=>void;remove:(id:string)=>void}) { return <main><Header title={training.trainingType} subtitle={`${fmt(training.date)} · Day${training.dayNumber}`} back={back}/><div className="summary"><b>{training.exercises.length}<small>动作</small></b><b>{training.exercises.reduce((s,e)=>s+(Number(e.sets)||0),0)}<small>总组数</small></b></div><h2>动作记录</h2><div className="stack">{training.exercises.map((e,i)=><Card key={e.id}><h3>{i+1}. {e.exerciseName}</h3><p className="muted">{e.weight?`${e.weight} kg`:'重量 —'} · {e.reps?`${e.reps} 次`:'次数 —'} · {e.sets?`${e.sets} 组`:'组数 —'}</p>{e.note&&<p className="tip">“{e.note}”</p>}</Card>)}</div>{training.note&&<Card className="training-note"><small>训练备注</small><p>{training.note}</p></Card>}<button className="secondary" onClick={()=>edit(training)}>编辑这次训练</button><button className="danger" onClick={()=>remove(training.id)}>删除记录</button></main> }

function Templates({data,update,create,edit}:{data:AppData;update:(d:AppData)=>void;create:()=>void;edit:(t:Template)=>void}) {
  const patch=(id:string, exercises:string[])=>update({...data,templates:data.templates.map(t=>t.id===id?{...t,exercises}:t)});
  return <main><Header title="训练模板" subtitle="新建训练时自动载入对应动作" action={<button className="text-button template-create" onClick={create}><Plus size={18}/>新建模板</button>}/><div className="stack">{data.templates.map(t=><Card key={t.id}><div className="between template-heading"><h2>{t.templateName}</h2><div className="template-actions"><small>{t.exercises.length} 个动作</small><button className="text-button" aria-label={`编辑模板 ${t.templateName}`} onClick={()=>edit(t)}><Settings2 size={16}/>编辑</button></div></div>{t.exercises.map((e,i)=><div className="edit-row" key={i}><span>{i+1}</span><input aria-label={`${t.templateName}动作${i+1}`} value={e} onChange={x=>patch(t.id,t.exercises.map((v,j)=>j===i?x.target.value:v))}/><button className="icon-button" aria-label={`移除${t.templateName}动作${i+1}`} onClick={()=>patch(t.id,t.exercises.filter((_,j)=>j!==i))}><Trash2 size={18}/></button></div>)}<button className="secondary compact" onClick={()=>patch(t.id,[...t.exercises,''])}><Plus/>添加动作</button></Card>)}</div></main>;
}

function TemplateEditor({data,update,initial,back,save}:{data:AppData;update:(d:AppData)=>Promise<void>;initial?:Template;back:()=>void;save:(t:Template)=>Promise<void>}) {
  const [picking,setPicking] = useState(false);
  const [name,setName] = useState(initial?.templateName ?? '');
  const [exercises,setExercises] = useState(() => (initial?.exercises ?? ['']).map(value => ({ id:uid(), value })));
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState('');
  const trimmedName = name.trim();
  const names = exercises.map(e => e.value.trim()).filter(Boolean);
  const duplicate = data.templates.some(t => t.id !== initial?.id && t.templateName.trim() === trimmedName);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!trimmedName || !names.length || duplicate || saving) return;
    setSaving(true); setError('');
    try { await save({ id:initial?.id ?? uid(), templateName:trimmedName, exercises:names }); }
    catch { setError('模板保存失败，请重试。'); setSaving(false); }
  }
  return <main><Header title={initial?'编辑模板':'新建模板'} subtitle="自定义名称和动作，开始训练时一键载入" back={saving?undefined:back}/>
    <form onSubmit={submit}>
      <Card className="form-card"><label>模板名称<input placeholder="例如：手臂专项、腿部训练" maxLength={50} value={name} disabled={saving} onChange={e=>{setName(e.target.value);setError('');}}/></label>{duplicate&&trimmedName&&<p className="form-error" role="alert">已有同名模板，请换一个名称。</p>}</Card>
      <div className="section-line"><h2>模板动作 · {names.length}</h2><button type="button" className="text-button catalog-link" onClick={()=>setPicking(true)}>从动作库选择</button></div>
      <Card>{exercises.map((e,i)=><div className="edit-row" key={e.id}><span>{i+1}</span><input aria-label={`模板动作${i+1}`} placeholder="动作名称" value={e.value} disabled={saving} onChange={event=>{const value=event.target.value;setExercises(items=>items.map(item=>item.id===e.id?{...item,value}:item));}}/><button type="button" className="icon-button" aria-label={`移除模板动作${i+1}`} disabled={saving} onClick={()=>setExercises(items=>items.filter(item=>item.id!==e.id))}><Trash2 size={18}/></button></div>)}<button type="button" className="secondary compact" disabled={saving} onClick={()=>setExercises(items=>[...items,{id:uid(),value:''}])}><Plus/>添加动作</button></Card>
      <p className="template-hint">填写模板名称和至少一个动作即可保存。空白动作不会保存。</p>
      {error&&<p className="form-error" role="alert">{error}</p>}
      <button type="submit" className="primary" disabled={!trimmedName||!names.length||duplicate||saving}><Save/>{saving?'正在保存…':initial?'保存修改':'保存模板'}</button>
    </form>
    {picking&&<ExercisePicker data={data} update={update} close={()=>setPicking(false)} pick={ex=>setExercises(items=>items.some(i=>matchName(i.value)?.id===ex.id)?items:[...items.filter(i=>i.value.trim()),{id:uid(),value:ex.name}])}/>}
  </main>;
}

function Stats({data}:{data:AppData}) { const now=today(),month=now.slice(0,7); const d=new Date(); d.setDate(d.getDate()-6); const weekStart=d.toLocaleDateString('sv-SE'); const counts=Object.entries(data.trainings.reduce<Record<string,number>>((a,t)=>(a[t.trainingType]=(a[t.trainingType]??0)+1,a),{})).sort((a,b)=>b[1]-a[1]); const months=Object.entries(data.trainings.reduce<Record<string,number>>((a,t)=>(a[t.date.slice(0,7)]=(a[t.date.slice(0,7)]??0)+1,a),{})).sort().slice(-6); const max=Math.max(1,...months.map(x=>x[1])); return <main><Header title="数据统计" subtitle="只看训练节奏，不制造数据焦虑"/><div className="stats-top"><Card className="total"><strong>{data.trainings.length}</strong><b>总训练次数</b></Card><div><Card><strong>{data.trainings.filter(t=>t.date>=weekStart).length}</strong><small>近 7 天</small></Card><Card><strong>{data.trainings.filter(t=>t.date.startsWith(month)).length}</strong><small>本月</small></Card></div></div><MuscleHistory data={data}/><h2>各部位训练比例</h2><Card className="bars">{counts.map(([name,count])=><div key={name}><span><b>{name}</b><small>{count} 次 · {Math.round(count/data.trainings.length*100)}%</small></span><i><em style={{width:`${count/data.trainings.length*100}%`}}/></i></div>)}</Card><h2>近 6 个月</h2><Card className="month-chart">{months.map(([m,c])=><div key={m}><b>{c}</b><i style={{height:`${Math.max(8,c/max*100)}px`}}/><small>{Number(m.slice(5))}月</small></div>)}</Card></main> }

function Backup({data,update,back}:{data:AppData;update:(d:AppData)=>void;back:()=>void}) { const input=useRef<HTMLInputElement>(null); const stamp=today(); const exportJson=()=>download(`健身日志-${stamp}.json`,JSON.stringify(data,null,2),'application/json'); const csv=['日期,Day,训练类型,训练备注,动作,重量,组数,次数,动作备注',...data.trainings.flatMap(t=>t.exercises.length?t.exercises.map(e=>[t.date,t.dayNumber,t.trainingType,t.note,e.exerciseName,e.weight,e.sets,e.reps,e.note].map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')):[`${t.date},${t.dayNumber},${t.trainingType},${t.note},,,,,`])].join('\r\n'); const importFile=async(f?:File)=>{if(!f)return;try{const next=normalizeBackup(JSON.parse(await f.text()));if(confirm(`将用 ${next.trainings.length} 条记录替换当前数据，继续吗？`))await update(next)}catch(e){alert(e instanceof Error?e.message:'导入失败')}}; return <main><Header title="数据备份" subtitle="数据只保存在这台设备" back={back}/><Card className="backup-card hero-backup"><CloudDownload/><h2>完整 JSON 备份</h2><p>用于换机、恢复或从 Expo Go 迁移，包含全部训练、模板和动作技巧。</p><button className="primary" onClick={exportJson}><FileDown/>导出完整备份</button></Card><Card className="backup-card"><h2>CSV 明细</h2><p>可用 Excel 或 Numbers 查看和分析，不用于恢复。</p><button className="secondary" onClick={()=>download(`健身日志明细-${stamp}.csv`,`\uFEFF${csv}`,'text/csv')}><FileDown/>导出 CSV</button></Card><Card className="backup-card"><h2>恢复 JSON 备份</h2><p>支持本 PWA 及原生版健身日志导出的 JSON 文件。</p><input hidden ref={input} type="file" accept="application/json,.json" onChange={e=>importFile(e.target.files?.[0])}/><button className="secondary" onClick={()=>input.current?.click()}><Upload/>选择备份并导入</button></Card><p className="privacy">隐私说明：网站不上传训练数据。清除 Safari 网站数据会删除本机记录，请定期导出 JSON。</p></main> }

function Nav({active,go}:{active:Tab;go:(t:Tab)=>void}) { const items:[Tab,React.ReactNode,string][]=[['home',<Home/>,'首页'],['history',<CalendarDays/>,'历史'],['templates',<BookOpen/>,'模板'],['library',<Dumbbell/>,'动作库'],['stats',<BarChart3/>,'统计']]; return <nav>{items.map(([id,icon,label])=><button className={active===id?'active':''} key={id} onClick={()=>go(id)}>{icon}<span>{label}</span></button>)}</nav> }
