import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ChevronRight, Dumbbell, Plus, Search } from 'lucide-react';
import type { AppData, DemoMedia, LibraryItem } from './types';
import { addToTemplate, byId, catalog, equipmentOptions, filterCatalog, muscleNames, personalFor, resolveExercise, type CatalogExercise } from './catalog';
import BodyMap from './BodyMap';
import Modal from './Modal';

type Shared = { data: AppData; update: (data: AppData) => Promise<void> };

export function safeMedia(media?: DemoMedia) {
  return media && typeof media.src === 'string' && media.src.length <= 12 * 1024 * 1024 &&
    ((media.kind === 'video' && /^data:video\/(mp4|webm);base64,[a-zA-Z0-9+/=\r\n]+$/.test(media.src)) ||
    (media.kind === 'image' && /^data:image\/(gif|png|jpeg|webp);base64,[a-zA-Z0-9+/=\r\n]+$/.test(media.src))) ? media : undefined;
}

function Demonstration({ exercise, media }: { exercise?: CatalogExercise; media?: DemoMedia }) {
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const custom = safeMedia(media);
  useEffect(() => { if (!playing) return; const id = window.setInterval(() => setFrame(f => 1 - f), 1600); return () => clearInterval(id); }, [playing]);
  return <section className="demo-section" aria-label="动作演示">
    <div className="section-line"><h2>{custom ? '我的演示' : '动作分解图'}</h2>{exercise && !custom && <small className="muted">{frame + 1} / 2</small>}</div>
    {custom ? custom.kind === 'video' ? <video className="demo-media" controls playsInline preload="metadata" src={custom.src} onError={() => setFailed(true)} /> : <img className="demo-media" src={custom.src} alt={custom.name || '自定义动作演示'} onError={() => setFailed(true)} /> : exercise ? <>
      <div className="demo-frame">{exercise.images.map((src, index) => <img key={src} src={src} hidden={frame !== index} alt={`${exercise.name}：姿势 ${index + 1}`} onError={() => setFailed(true)} />)}</div>
      <div className="demo-controls"><button type="button" aria-pressed={frame === 0} onClick={() => { setPlaying(false); setFrame(0); }}>姿势 1</button><button type="button" aria-pressed={frame === 1} onClick={() => { setPlaying(false); setFrame(1); }}>姿势 2</button><button type="button" aria-pressed={playing} onClick={() => setPlaying(p => !p)}>{playing ? '暂停轮播' : '轮播查看'}</button></div>
      <p className="fine-print">分解图展示两个姿势，并非连续动作视频。<a href={exercise.source} target="_blank" rel="noreferrer">图片来源</a> · <a href="/ExerciseDB-LICENSE.txt" target="_blank" rel="noreferrer">Unlicense</a></p>
    </> : <div className="empty-demo"><Dumbbell/><p>添加你的动作演示</p><small>支持 GIF、图片、MP4 和 WebM</small></div>}
    {failed && <p role="alert" className="form-error">演示无法加载，请检查网络或更换支持的媒体文件。</p>}
  </section>;
}

function PersonalFields({ data, update, exercise, item }: Shared & { exercise?: CatalogExercise; item?: LibraryItem }) {
  const [id] = useState(() => item?.id ?? crypto.randomUUID());
  const [name, setName] = useState(item?.exerciseName ?? exercise?.name ?? '');
  const [note, setNote] = useState(item?.personalNote ?? '');
  const [binding, setBinding] = useState(item?.catalogExerciseId === null ? '' : resolveExercise(item ?? { exerciseName: exercise?.name ?? '' })?.id ?? '');
  const [demo, setDemo] = useState<DemoMedia | undefined>(safeMedia(item?.demo));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  async function importMedia(file?: File) {
    if (!file) return;
    setError(''); setMessage('');
    if (!['image/gif', 'image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm'].includes(file.type)) { setError('请选择 GIF、PNG、JPEG、WebP、MP4 或 WebM 文件。'); return; }
    if (file.size > 8 * 1024 * 1024) { setError('请选择不超过 8 MB 的短视频或图片。'); return; }
    setBusy(true);
    try {
      const src = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(Error('读取失败')); reader.readAsDataURL(file); });
      setDemo({ src, kind: file.type.startsWith('video/') ? 'video' : 'image', name: file.name });
      setMessage('演示已选好，点击下方保存即可保留。');
    } catch { setError('文件读取失败，请重试。'); } finally { setBusy(false); }
  }
  async function save() {
    setError(''); setMessage('');
    const cleanName = name.trim();
    if (!cleanName) { setError('请填写动作名称。'); return; }
    if (data.library.some(i => i.id !== id && i.exerciseName.trim() === cleanName)) { setError('已有同名的个人动作，请编辑已有条目。'); return; }
    const previous = data.library.find(i => i.id === id) ?? item;
    const aliases = [...new Set([...(previous?.aliases ?? []), ...(previous && previous.exerciseName !== cleanName ? [previous.exerciseName] : [])])];
    const next: LibraryItem = { ...previous, id, exerciseName: cleanName, personalNote: note, aliases, catalogExerciseId: exercise?.id ?? (binding || null), demo };
    setBusy(true);
    try { await update({ ...data, library: data.library.some(i => i.id === id) ? data.library.map(i => i.id === id ? next : i) : [...data.library, next] }); setMessage('已保存到我的动作，JSON 备份包含技巧和自定义演示。'); }
    catch { setError('保存失败，可能存储空间不足。请缩小演示文件后重试。'); }
    finally { setBusy(false); }
  }
  return <section className="card personal-fields">
    <h2>{exercise ? '我的技巧与演示' : item ? '编辑我的动作' : '新建我的动作'}</h2>
    {!exercise && <><label>动作名称<input value={name} disabled={busy} maxLength={100} placeholder="例如：我的坐姿划船" onChange={e => { setName(e.target.value); setMessage(''); }} /></label><label>关联标准动作<select value={binding} disabled={busy} onChange={e => setBinding(e.target.value)}><option value="">暂不关联</option>{catalog.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}</select></label><p className="fine-print">关联后可按肌群筛选。原有训练名称和记录保持不变。</p></>}
    <label>我的技巧<textarea value={note} disabled={busy} placeholder="记录适合自己的发力提示、座椅档位…" onChange={e => { setNote(e.target.value); setMessage(''); }} /></label>
    {demo && <Demonstration key={demo.src.slice(-50)} media={demo} />}
    <input className="visually-hidden" ref={input} type="file" accept="image/gif,image/png,image/jpeg,image/webp,video/mp4,video/webm" onChange={e => { void importMedia(e.target.files?.[0]); e.target.value = ''; }} />
    <div className="inline-actions"><button type="button" className="secondary compact" disabled={busy} onClick={() => input.current?.click()}>{demo ? '更换演示' : '添加我的演示'}</button>{demo && <button type="button" className="text-button" disabled={busy} onClick={() => { setDemo(undefined); setMessage('点击保存后移除自定义演示。'); }}>移除</button>}</div>
    <p className="fine-print">使用你拍摄或获准使用的素材，每个文件不超过 8 MB。保存在本机，并随 JSON 一同导出。</p>
    {error && <p className="form-error" role="alert">{error}</p>}<p className="success-message" role="status">{message}</p>
    <button type="button" className="primary compact" disabled={busy} onClick={save}>{busy ? '正在保存…' : '保存技巧与演示'}</button>
  </section>;
}

function ExerciseDetails({ exercise, data, update, back, pick, start }: Shared & { exercise: CatalogExercise; back: () => void; pick?: (ex: CatalogExercise) => void; start?: (ex: CatalogExercise) => void }) {
  const personal = personalFor(exercise, data.library);
  const [templateId, setTemplateId] = useState(data.templates[0]?.id ?? '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const history = data.trainings.filter(t => t.exercises.some(ex => resolveExercise(ex, data.library)?.id === exercise.id));
  async function add() {
    setMessage(''); setError(''); setBusy(true);
    try { await update(addToTemplate(data, templateId, exercise)); setMessage('已加入模板，下次开始训练即可载入。'); }
    catch (err) { setError(err instanceof Error ? err.message : '保存失败，请重试。'); }
    finally { setBusy(false); }
  }
  return <div className="exercise-details">
    <button type="button" className="text-button back-catalog" onClick={back}><ArrowLeft size={18}/>返回动作列表</button>
    <div className="detail-title"><span className="eyebrow">{exercise.equipment} · {history.length} 次已关联训练</span><h2>{exercise.name}</h2><p>{exercise.englishName}</p></div>
    {pick ? <button type="button" className="primary" onClick={() => pick(exercise)}><Plus/>选择这个动作</button> : <button type="button" className="primary" onClick={() => start?.(exercise)}><Plus/>用这个动作开始训练</button>}
    <Demonstration key={exercise.id + (personal?.demo?.name ?? '')} exercise={exercise} media={personal?.demo} />
    <section className="card muscle-detail"><BodyMap primary={exercise.primary} secondary={exercise.secondary}/><div><h3>主要肌群</h3><p>{exercise.primary.map(m => muscleNames[m]).join('、')}</p>{exercise.secondary.length > 0 && <><h3>辅助肌群</h3><p>{exercise.secondary.map(m => muscleNames[m]).join('、')}</p></>}</div></section>
    <section className="card instruction-card"><h2>动作要点</h2><ol>{exercise.steps.map(step => <li key={step}>{step}</li>)}</ol></section>
    {!pick && <section className="card template-add"><h2>加入我的模板</h2>{data.templates.length ? <><label>选择模板<select value={templateId} onChange={e => setTemplateId(e.target.value)}>{data.templates.map(t => <option key={t.id} value={t.id}>{t.templateName}</option>)}</select></label><button type="button" className="secondary compact" disabled={busy || !templateId} onClick={add}>添加到模板</button></> : <p className="muted">先到「模板」页新建一个训练模板。</p>}<p role="status" className="success-message">{message}</p>{error && <p role="alert" className="form-error">{error}</p>}</section>}
    <PersonalFields key={exercise.id} data={data} update={update} exercise={exercise} item={personal}/>
  </div>;
}

export function CatalogExplorer({ data, update, pick, start }: Shared & { pick?: (ex: CatalogExercise) => void; start?: (ex: CatalogExercise) => void }) {
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState('');
  const [equipment, setEquipment] = useState('');
  const [selected, setSelected] = useState<string>();
  const ex = byId(selected);
  const results = filterCatalog(query, muscle, equipment);
  if (ex) return <ExerciseDetails key={ex.id} exercise={ex} data={data} update={update} back={() => setSelected(undefined)} pick={pick} start={start}/>;
  return <section className="catalog-explorer">
    <div className="card explorer-hero"><div className="explorer-copy"><span className="eyebrow">认识你的训练</span><h2>从肌肉<br/>找到动作<span>。</span></h2><p>24 个常用动作<br/>中文要点 · 分解图</p></div><BodyMap selected={muscle} onSelect={setMuscle}/></div>
    <div className="search"><Search/><input aria-label="搜索标准动作" placeholder="搜索动作、器械或肌群" value={query} onChange={e => setQuery(e.target.value)}/></div>
    <div className="catalog-filters"><label>肌肉部位<select value={muscle} onChange={e => setMuscle(e.target.value)}><option value="">全部部位</option>{Object.entries(muscleNames).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label>训练器械<select value={equipment} onChange={e => setEquipment(e.target.value)}><option value="">全部器械</option>{equipmentOptions.map(e => <option key={e}>{e}</option>)}</select></label></div>
    <div className="section-line"><h2>{muscle ? muscleNames[muscle] + '动作' : '探索动作'} <small>{results.length}</small></h2>{(muscle || equipment || query) && <button type="button" className="text-button" onClick={() => { setMuscle(''); setEquipment(''); setQuery(''); }}>清除筛选</button>}</div>
    <div className="catalog-list">{results.map(exercise => <button type="button" className="card catalog-item" key={exercise.id} onClick={() => setSelected(exercise.id)}><img src={exercise.images[0]} loading="lazy" alt=""/><span><b>{exercise.name}</b><small>{exercise.equipment} · {exercise.primary.map(m => muscleNames[m]).join('、')}</small></span><ChevronRight size={18}/></button>)}</div>
    {!results.length && <div className="card empty-state"><Dumbbell/><h3>暂无符合条件的动作</h3><p>试试其他部位、器械或更短的关键词。</p></div>}
    <p className="fine-print attribution">人体图：<a href="https://github.com/melihcolpan/MuscleMap" target="_blank" rel="noreferrer">MuscleMap</a> · <a href="/MuscleMap-LICENSE.txt" target="_blank" rel="noreferrer">MIT</a></p>
  </section>;
}

export function ExercisePicker({ close, pick, ...shared }: Shared & { close: () => void; pick: (ex: CatalogExercise) => void }) {
  return <Modal close={close} title="从动作库选择"><CatalogExplorer {...shared} pick={ex => { pick(ex); close(); }}/></Modal>;
}

export default function ExerciseLibrary({ data, update, start }: Shared & { start: (ex: CatalogExercise) => void }) {
  const [tab, setTab] = useState<'explore' | 'mine'>('explore');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<LibraryItem | 'new'>();
  return <main className="library-page"><header className="header"><div className="header-copy"><h1>动作库</h1><p>找到动作，也留下自己的训练经验</p></div><button type="button" className="round" aria-label="新建我的动作" onClick={() => setEditing('new')}><Plus/></button></header>
    <div className="segmented library-tabs"><button type="button" aria-pressed={tab === 'explore'} onClick={() => setTab('explore')}>探索动作</button><button type="button" aria-pressed={tab === 'mine'} onClick={() => setTab('mine')}>我的动作 · {data.library.length}</button></div>
    {tab === 'explore' ? <CatalogExplorer data={data} update={update} start={start}/> : <><div className="search"><Search/><input aria-label="搜索我的动作" value={query} placeholder="搜索动作或我的技巧" onChange={e => setQuery(e.target.value)}/></div><div className="stack">{data.library.filter(item => `${item.exerciseName} ${item.personalNote}`.includes(query)).map(item => { const standard = resolveExercise(item); return <button type="button" className="card personal-item" key={item.id} onClick={() => setEditing(item)}><div className="between"><h3>{item.exerciseName}</h3><ChevronRight size={18}/></div><p>{item.personalNote || '添加自己的动作技巧'}</p><small>{standard ? `已关联：${standard.name}` : '未关联标准动作 · 可手动选择'}</small></button>; })}</div>{!data.library.length && <p className="empty-state">还没有个人动作，点击右上角 ＋ 新建。</p>}</>}
    {editing && <Modal close={() => setEditing(undefined)} title={editing === 'new' ? '新建我的动作' : '编辑我的动作'}><PersonalFields data={data} update={update} item={editing === 'new' ? undefined : editing}/></Modal>}
  </main>;
}

export function MuscleHistory({ data }: { data: AppData }) {
  const [selected, setSelected] = useState('');
  const end = new Date().toLocaleDateString('sv-SE');
  const since = new Date(); since.setDate(since.getDate() - 29);
  const start = since.toLocaleDateString('sv-SE');
  const trainings = data.trainings.filter(t => t.date >= start && t.date <= end);
  const counts: Record<string, number> = {};
  let mapped = 0;
  trainings.forEach(t => { const muscles = new Set(t.exercises.flatMap(e => { const ex = resolveExercise(e, data.library); return ex ? [...ex.primary, ...ex.secondary] : []; })); if (muscles.size) mapped++; muscles.forEach(m => counts[m] = (counts[m] ?? 0) + 1); });
  return <section className="card muscle-history"><h2>近 30 天 · 练过的部位</h2><BodyMap selected={selected} primary={Object.keys(counts)} onSelect={setSelected}/><p className="tip">{selected ? `${muscleNames[selected]}：${counts[selected] ?? 0} 次训练涉及` : '点击部位查看训练次数'}</p><p className="fine-print">{mapped} / {trainings.length} 次训练有可关联的动作。按主要及辅助肌群统计，每次训练各部位只计一次；未关联或无动作明细的记录不参与。此图表示训练涉及部位，不表示疲劳或恢复程度。</p></section>;
}
