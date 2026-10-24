import { useState } from 'react';
import geometry from './body-paths.json';
import { muscleNames } from './catalog';

const subgroups = new Set(['upperChest', 'lowerChest', 'innerQuad', 'outerQuad', 'upperAbs', 'lowerAbs', 'frontDeltoid', 'upperTrapezius', 'lowerTrapezius', 'rearDeltoid', 'rhomboids', 'rotatorCuff']);
export default function BodyMap({ selected = '', primary = [], secondary = [], onSelect }: { selected?: string; primary?: string[]; secondary?: string[]; onSelect?: (muscle: string) => void }) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  const view = geometry[side];
  return <div className="body-map">
    <div className="segmented body-side" aria-label="人体视角">{(['front', 'back'] as const).map(s => <button type="button" key={s} aria-pressed={side === s} onClick={() => setSide(s)}>{s === 'front' ? '正面' : '背面'}</button>)}</div>
    <svg viewBox={view.viewBox} aria-label={`${side === 'front' ? '正面' : '背面'}肌肉图`} role={onSelect ? 'group' : 'img'}>
      {view.parts.filter(part => !subgroups.has(part.slug)).map(part => {
        const label = muscleNames[part.slug];
        const active = selected === part.slug || primary.includes(part.slug);
        return <g key={part.slug} role={label && onSelect ? 'button' : undefined} tabIndex={label && onSelect ? 0 : undefined} aria-label={label && onSelect ? `筛选${label}动作` : undefined} aria-pressed={label && onSelect ? selected === part.slug : undefined} onClick={label && onSelect ? () => onSelect(selected === part.slug ? '' : part.slug) : undefined} onKeyDown={label && onSelect ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(selected === part.slug ? '' : part.slug); } } : undefined} className={`muscle-shape ${label ? 'selectable' : 'silhouette'} ${active ? 'is-primary' : secondary.includes(part.slug) ? 'is-secondary' : ''}`}>
          {label && <title>{label}</title>}{part.paths.map((path, i) => <path key={i} d={path} />)}
        </g>;
      })}
    </svg>
    <div className="map-caption">{onSelect ? selected ? `已选：${muscleNames[selected]} · 再点取消` : '轻触肌肉，找到对应动作' : <><span className="legend-dot primary-dot"/>主要肌群 <span className="legend-dot secondary-dot"/>辅助肌群</>}</div>
  </div>;
}
