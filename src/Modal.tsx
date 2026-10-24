import { useEffect, useRef } from 'react';
export default function Modal({ children, close, title }: { children: React.ReactNode; close: () => void; title: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current!; const prior = document.activeElement as HTMLElement | null; dialog.showModal(); const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { dialog.close(); document.body.style.overflow = overflow; prior?.focus(); }; }, []);
  return <dialog ref={ref} className="exercise-modal" aria-label={title} onCancel={e => { e.preventDefault(); close(); }}><div className="modal-toolbar"><strong>{title}</strong><button type="button" className="text-button" onClick={close} aria-label="关闭动作选择">完成</button></div>{children}</dialog>;
}
