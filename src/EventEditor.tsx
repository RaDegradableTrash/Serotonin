import { useState } from 'react';
import { ArrowUpRight, Trash2 } from 'lucide-react';
import Modal from './Modal';
import { addDays, dateKey, localInput, overlaps, safeUrl } from './model';
import type { CalendarEvent } from './model';

export default function EventEditor({ event, events, onSave, onDelete, onClose }: { event: CalendarEvent; events: CalendarEvent[]; onSave: (event: CalendarEvent) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const [title, setTitle] = useState(event.title), [start, setStart] = useState(localInput(new Date(event.start))), [end, setEnd] = useState(localInput(new Date(event.end)));
  const [allDay, setAllDay] = useState(event.allDay), [color, setColor] = useState(event.color), [notes, setNotes] = useState(event.notes), [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const readOnly = event.source === 'google';
  const draft = { ...event, title: title.trim(), start: allDay ? `${start.slice(0, 10)}T00:00:00` : start, end: allDay ? `${end.slice(0, 10)}T00:00:00` : end, allDay, color, notes };
  const conflicts = events.filter(other => overlaps(draft, other));
  return <Modal title={readOnly ? 'Google 日程' : event.title ? '编辑日程' : '新建日程'} onClose={onClose}><form onSubmit={e => { e.preventDefault(); if (!title.trim()) { setError('请填写日程名称'); return; } if (new Date(draft.end) <= new Date(draft.start)) { setError('结束时间必须晚于开始时间'); return; } onSave(draft); }}>
    <label>日程名称<input autoFocus placeholder="日程名称" value={title} onChange={e => setTitle(e.target.value)} required readOnly={readOnly} maxLength={160} /></label>
    <label className="checkbox-label"><input type="checkbox" checked={allDay} disabled={readOnly} onChange={e => { setAllDay(e.target.checked); if (e.target.checked && end.slice(0, 10) <= start.slice(0, 10)) setEnd(`${dateKey(addDays(new Date(start), 1))}T00:00`); }} /> 全天日程</label>
    <div className="form-row"><label>开始<input type={allDay ? 'date' : 'datetime-local'} value={allDay ? start.slice(0, 10) : start} onChange={e => setStart(allDay ? `${e.target.value}T00:00` : e.target.value)} required readOnly={readOnly} /></label><label>结束{allDay ? '（不含当天）' : ''}<input type={allDay ? 'date' : 'datetime-local'} value={allDay ? end.slice(0, 10) : end} onChange={e => setEnd(allDay ? `${e.target.value}T00:00` : e.target.value)} required readOnly={readOnly} /></label></div>
    <label>备注<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="地点、想法，或一个提醒…" readOnly={readOnly} rows={3} /></label>
    {!readOnly && <div className="color-options">{['teal', 'orange', 'purple', 'blue', 'rose'].map(value => <button type="button" key={value} aria-label={`${value} 颜色`} aria-pressed={color === value} className={`color-option ${value} ${color === value ? 'chosen' : ''}`} onClick={() => setColor(value)} />)}</div>}
    {conflicts.length > 0 && <p className="notice">与 {conflicts.length} 个日程有时间重叠：{conflicts.map(item => item.title).join('、')}</p>}{error && <p className="error" role="alert">{error}</p>}
    <div className="modal-actions">{readOnly ? <><span className="hint">Google 日程以只读方式显示</span>{event.url && safeUrl(event.url) && <a className="primary" href={event.url} target="_blank" rel="noreferrer">在 Google 编辑<ArrowUpRight size={16} /></a>}</> : <>{events.some(item => item.id === event.id) && <button type="button" className="danger" onClick={() => confirmDelete ? onDelete(event.id) : setConfirmDelete(true)}><Trash2 size={16} />{confirmDelete ? '确认删除' : '删除'}</button>}<button type="submit" className="primary">保存日程</button></>}</div>
  </form></Modal>;
}
