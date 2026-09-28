import { useRef, useEffect, useLayoutEffect, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { localPoint, minuteDate, dragRange } from './calendarGeometry';
import { ChevronLeft, ChevronRight, Plus, ArrowUpRight, CalendarDays } from 'lucide-react';
import { addDays, dateKey, dayEvents, startOfWeek, timeLabel } from './model';
import type { CalendarEvent, Task } from './model';

const weekNames = ['一', '二', '三', '四', '五', '六', '日'];
export function MiniCalendar({ selected, onSelect }: { selected: Date; onSelect: (date: Date) => void }) {
  const start = startOfWeek(new Date(selected.getFullYear(), selected.getMonth(), 1));
  const changeMonth = (offset: number) => onSelect(new Date(selected.getFullYear(), selected.getMonth() + offset, 1));
  return <div className="mini-calendar"><div className="mini-heading"><strong>{selected.getFullYear()} 年 {selected.getMonth() + 1} 月</strong><span><button aria-label="上个月" className="icon-button" onClick={() => changeMonth(-1)}><ChevronLeft size={15} /></button><button aria-label="下个月" className="icon-button" onClick={() => changeMonth(1)}><ChevronRight size={15} /></button></span></div>
    <div className="mini-grid">{weekNames.map(name => <small key={name}>{name}</small>)}{Array.from({ length: 42 }, (_, i) => { const day = addDays(start, i); return <button key={i} className={`${day.getMonth() !== selected.getMonth() ? 'muted' : ''} ${dateKey(day) === dateKey(selected) ? 'selected' : ''} ${dateKey(day) === dateKey(new Date()) ? 'today' : ''}`} onClick={() => onSelect(day)} aria-label={dateKey(day)}>{day.getDate()}</button>; })}</div>
  </div>;
}

function layoutEvents(events: CalendarEvent[], day: Date) {
  const dayStart = new Date(`${dateKey(day)}T00:00:00`).getTime();
  const dayEnd = addDays(new Date(dayStart), 1).getTime();
  const positioned = events.filter(event => !event.allDay).map(event => ({ event, start: Math.max(dayStart, new Date(event.start).getTime()), end: Math.min(dayEnd, new Date(event.end).getTime()), lane: 0, count: 1 })).sort((a, b) => a.start - b.start);
  let group: typeof positioned = [], groupEnd = 0;
  const flush = () => { const count = Math.max(1, ...group.map(item => item.lane + 1)); group.forEach(item => { item.count = count; }); };
  for (const item of positioned) {
    if (item.start >= groupEnd) { flush(); group = []; }
    const active = group.filter(other => other.end > item.start).map(other => other.lane);
    while (active.includes(item.lane)) item.lane++;
    group.push(item); groupEnd = Math.max(...group.map(other => other.end));
  }
  flush();
  return positioned.map(item => {
    const startDate = new Date(item.start), endDate = new Date(item.end);
    return { ...item, top: (startDate.getHours() * 60 + startDate.getMinutes()) / 60 * 64, height: ((item.end === dayEnd ? 1440 : endDate.getHours() * 60 + endDate.getMinutes()) - (startDate.getHours() * 60 + startDate.getMinutes())) / 60 * 64 };
  });
}

type Props = {
  date: Date; onDate: (date: Date) => void; events: CalendarEvent[]; tasks: Task[];
  onCreate: (date: Date, task?: Task) => void; onCreateRange: (start: Date, end: Date) => void;
  onEdit: (event: CalendarEvent) => void; onResize: (id: string, start: Date, end: Date) => void; onMove: (id: string, date: Date) => void; onConnect: () => void; connected: boolean;
};
type Selection = { anchor: Date; focus: Date };
type Drag = Selection & { pointerId: number; x: number; y: number; downX: number; downY: number; moved: boolean; event?: CalendarEvent; kind?: "move" | "start" | "end" };
function PlaneCorners() { return <>{['tl', 'tr', 'br', 'bl'].map(corner => <i key={corner} aria-hidden="true" className={`plane-corner ${corner}`} />)}</>; }

export default function Calendar({ date, onDate, events, tasks, onCreate, onCreateRange, onEdit, onMove, onResize, onConnect, connected }: Props) {
  const [view, setView] = useState<'week' | 'month'>('week');
  const [windowState, setWindowState] = useState(() => ({ selected: dateKey(date), start: startOfWeek(date) }));
  if (windowState.selected !== dateKey(date)) setWindowState({ selected: dateKey(date), start: startOfWeek(date) });
  const [selection, setSelection] = useState<Selection | null>(null);
  const suppressClick = useRef(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [boundary, setBoundary] = useState<{ day: string; direction: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null), gridRef = useRef<HTMLDivElement>(null), frameRef = useRef<HTMLDivElement>(null);
  const windowStart = useRef(windowState.start), drag = useRef<Drag | null>(null), animation = useRef(0);
  const unscheduled = tasks.filter(task => !task.done && !events.some(event => event.taskId === task.id));
  const start = view === 'week' ? windowState.start : startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
  const days = Array.from({ length: view === 'week' ? 7 : 42 }, (_, i) => addDays(start, i));
  const navigate = (direction: number) => onDate(view === 'week' ? addDays(windowState.start, direction * 7) : new Date(date.getFullYear(), date.getMonth() + direction, 1));

  useLayoutEffect(() => { windowStart.current = windowState.start; }, [windowState.start]);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || !scrollRef.current) return;
    const fit = () => { if (scrollRef.current && !drag.current) scrollRef.current.scrollTop = frame.clientHeight; };
    fit(); const observer = new ResizeObserver(fit); observer.observe(frame);
    return () => observer.disconnect();
  }, [view, windowState.selected]);
  useEffect(() => {
    const cancel = () => { if (!drag.current) return; drag.current = null; cancelAnimationFrame(animation.current); setSelection(null); setEditing(null); setBoundary(null); if (scrollRef.current && frameRef.current) scrollRef.current.scrollTop = frameRef.current.clientHeight; };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') cancel(); };
    window.addEventListener('keydown', onKey); window.addEventListener('blur', cancel);
    return () => { cancelAnimationFrame(animation.current); window.removeEventListener('keydown', onKey); window.removeEventListener('blur', cancel); };
  }, []);

  const timeAt = (x: number, y: number) => {
    const grid = gridRef.current!;
    const point = localPoint(grid, { x, y });
    const labelWidth = grid.querySelector<HTMLElement>('.hour-labels')!.offsetWidth;
    const column = Math.max(0, Math.min(6, Math.floor((point.x - labelWidth) / ((grid.clientWidth - labelWidth) / 7))));
    return minuteDate(addDays(windowStart.current, column), point.y / grid.clientHeight * 4320 - 1440);
  };
  const updateDrag = () => {
    const current = drag.current;
    if (!current || !gridRef.current) return;
    const focus = timeAt(current.x, current.y);
    if (Math.hypot(current.x - current.downX, current.y - current.downY) > 4) current.moved = true;
    if (focus.getTime() !== current.focus.getTime()) {
      if (dateKey(focus) !== dateKey(current.focus)) setBoundary({ day: dateKey(focus), direction: focus > current.focus ? 1 : -1 });
      current.focus = focus;
      if (current.event) {
        const original = current.event;
        const start = current.kind === 'end' ? new Date(original.start) : current.kind === 'start' ? new Date(Math.min(focus.getTime(), new Date(original.end).getTime() - 900000)) : focus;
        const end = current.kind === 'start' ? new Date(original.end) : current.kind === 'end' ? new Date(Math.max(focus.getTime(), new Date(original.start).getTime() + 900000)) : new Date(start.getTime() + new Date(original.end).getTime() - new Date(original.start).getTime());
        setEditing({ ...original, start: start.toISOString(), end: end.toISOString() });
      } else setSelection({ anchor: current.anchor, focus });
    }
  };
  const normalizeScroll = () => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const dayHeight = frameRef.current!.clientHeight;
    let shift = 0;
    if (scroller.scrollTop >= dayHeight * 2) shift = 1;
    else if (scroller.scrollTop < dayHeight) shift = -1;
    if (shift) {
      const next = addDays(windowStart.current, shift);
      windowStart.current = next;
      scroller.scrollTop -= shift * dayHeight;
      setWindowState(current => ({ ...current, start: next }));
      setBoundary({ day: dateKey(next), direction: shift });
    }
  };
  const beginSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const item = target.closest<HTMLElement>('[data-event-id]');
    const existing = item ? events.find(e => e.id === item.dataset.eventId) : undefined;
    if (event.button !== 0 || !event.isPrimary || (!target.closest('.hour-cell') && !existing) || existing?.source === 'google') return;
    suppressClick.current = false;
    event.preventDefault();
    const anchor = timeAt(event.clientX, event.clientY);
    drag.current = { anchor, focus: anchor, pointerId: event.pointerId, x: event.clientX, y: event.clientY, downX: event.clientX, downY: event.clientY, moved: false, event: existing, kind: (target.closest<HTMLElement>("[data-resize]")?.dataset.resize as "start" | "end") || "move" };
    if (!existing) setSelection({ anchor, focus: anchor }); setBoundary(null);
    event.currentTarget.setPointerCapture(event.pointerId);
    let lastTime = event.timeStamp;
    const tick = (now: number) => {
      if (!drag.current || !scrollRef.current || !frameRef.current) return;
      const point = localPoint(frameRef.current, { x: drag.current.x, y: drag.current.y });
      const height = frameRef.current.clientHeight;
      const edge = 16;
      const speed = point.y < edge ? -Math.min(8, (edge - point.y) * .5) : point.y > height - edge ? Math.min(8, (point.y - height + edge) * .5) : 0;
      if (speed) {
        drag.current.moved = true;
        scrollRef.current.scrollTop += speed * Math.min(32, now - lastTime) / 16;
        normalizeScroll();
      }
      updateDrag(); lastTime = now;
      animation.current = requestAnimationFrame(tick);
    };
    animation.current = requestAnimationFrame(tick);
  };
  const moveSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    drag.current.x = event.clientX; drag.current.y = event.clientY; updateDrag();
  };
  const finishSelection = (event: ReactPointerEvent<HTMLDivElement>, cancel = false) => {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    if (!cancel) { current.x = event.clientX; current.y = event.clientY; updateDrag(); }
    drag.current = null; cancelAnimationFrame(animation.current); setSelection(null); setEditing(null); setBoundary(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (scrollRef.current && frameRef.current) scrollRef.current.scrollTop = frameRef.current.clientHeight;
    suppressClick.current = current.moved || cancel;
    if (cancel) return;
    if (current.event) {
      if (!current.moved) { suppressClick.current = true; onEdit(current.event); }
      if (current.moved) {
        const original = current.event, focus = current.focus;
        if (current.kind === 'move') onMove(original.id, focus);
        else if (current.kind === 'start') onResize(original.id, new Date(Math.min(focus.getTime(), new Date(original.end).getTime() - 900000)), new Date(original.end));
        else onResize(original.id, new Date(original.start), new Date(Math.max(focus.getTime(), new Date(original.start).getTime() + 900000)));
      }
      return;
    }
    if (current.moved) { const range = dragRange(current.anchor, current.focus); onCreateRange(range.start, range.end); }
    else onCreate(current.anchor);
  };
  const range = selection ? dragRange(selection.anchor, selection.focus) : null;
  const preview: CalendarEvent | null = range ? { id: 'selection', title: '', start: range.start.toISOString(), end: range.end.toISOString(), allDay: false, color: 'orange', notes: '', source: 'local' } : null;
  const headerDate = view === 'week' ? addDays(windowState.start, 3) : date;

  return <div className="calendar-page">
    <aside className="calendar-sidebar"><button className="primary wide" onClick={() => onCreate(date)}><Plus size={18} /> 新建日程</button><MiniCalendar selected={date} onSelect={onDate} />
      <div className="side-label">我的日历</div><div className="legend"><i className="dot teal" /> 个人日程 <span>本地</span></div><div className="legend"><i className="dot blue" /> Google Calendar</div><button className="connect-calendar" onClick={onConnect}>{connected ? '管理 Google 连接' : '连接 Google Calendar'}<ArrowUpRight size={14} /></button>
      <div className="side-label spaced">待安排 <span>{unscheduled.length}</span></div>
      {unscheduled.slice(0, 8).map(task => <div className="unscheduled" key={task.id} draggable onDragStart={event => event.dataTransfer.setData('text/plain', `task:${task.id}`)}><span>{task.title}</span><button className="icon-button" aria-label={`安排 ${task.title}`} onClick={() => onCreate(date, task)}><Plus size={15} /></button></div>)}
    </aside>
    <section className="calendar-main"><header className="calendar-toolbar"><h1>{headerDate.getFullYear()} 年 {headerDate.getMonth() + 1} 月</h1><div className="toolbar-actions"><button className="icon-button" aria-label="快速新建日程" onClick={() => onCreate(date)}><Plus size={18} /></button><button className="secondary" onClick={() => onDate(new Date())}>今天</button><button className="icon-button" aria-label="上一页" onClick={() => navigate(-1)}><ChevronLeft size={18} /></button><button className="icon-button" aria-label="下一页" onClick={() => navigate(1)}><ChevronRight size={18} /></button><div className="segmented"><button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>周</button><button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>月</button></div></div></header>
    {view === 'week' ? <>
      <div className="week-header"><span className="timezone">本地<br />时间</span>{days.map(day => <button key={dateKey(day)} onClick={() => onDate(day)} className={`calendar-day-heading ${dateKey(day) === dateKey(new Date()) ? 'is-today' : ''}`}><small>周{weekNames[(day.getDay() + 6) % 7]}</small><b>{day.getDate()}</b></button>)}</div>
      <div className="all-day-row"><small>全天</small>{days.map(day => <div key={dateKey(day)}>{dayEvents(events, day).filter(event => event.allDay).map(event => <button key={event.id} className={`month-event ${event.color}`} onClick={() => onEdit(event)}>{event.title}</button>)}</div>)}</div>
      <div className={`timeline-frame ${selection ? 'selecting-time' : ''}`} ref={frameRef}><PlaneCorners />
        {boundary && <div className={`day-transition direction-${boundary.direction}`} key={`${boundary.day}-${boundary.direction}`} role="status">{boundary.direction > 0 ? '↓' : '↑'} {boundary.day}</div>}
        <span className="day-end-label">24:00</span><div className="week-scroll" ref={scrollRef} onClickCapture={e => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }} onScroll={normalizeScroll} onPointerDown={beginSelection} onPointerMove={moveSelection} onPointerUp={event => finishSelection(event)} onPointerCancel={event => finishSelection(event, true)} onLostPointerCapture={event => finishSelection(event, true)}>
          <div className="week-grid" ref={gridRef}><PlaneCorners /><div className="hour-labels">{[-1, 0, 1].map(offset => <div className="hour-day" key={offset}>{Array.from({ length: 24 }, (_, h) => <span key={h}>{String(h).padStart(2, '0')}:00</span>)}</div>)}</div>
          {days.map((columnDay, column) => <div key={column} data-column={column} className="day-column">{[-1, 0, 1].map(offset => {
            const day = addDays(columnDay, offset), items = dayEvents(editing ? events.map(e => e.id === editing.id ? editing : e) : events, day);
            const selected = preview ? layoutEvents(dayEvents([preview], day), day)[0] : null;
            return <div className={`day-segment ${dateKey(day) === dateKey(new Date()) ? 'today-column' : ''}`} data-date={dateKey(day)} key={offset}>

              {Array.from({ length: 24 }, (_, hour) => <button className="hour-cell" key={hour} aria-label={`${dateKey(day)} ${hour}:00 新建日程`} onClick={event => { if (event.detail === 0) { const time = new Date(day); time.setHours(hour); onCreate(time); } }} onDragOver={event => event.preventDefault()} onDrop={event => {
                event.preventDefault(); const data = event.dataTransfer.getData('text/plain'); const time = timeAt(event.clientX, event.clientY);
                if (data.startsWith('task:')) { const task = tasks.find(item => item.id === data.slice(5)); if (task) onCreate(time, task); } else if (data.startsWith('event:')) onMove(data.slice(6), time);
              }} />)}
              {layoutEvents(items, day).map(({ event, top, height, lane, count }) => <button key={event.id} data-event-id={event.id} onClick={() => onEdit(event)} className={`time-event ${event.color}`} title={`${event.title} · ${timeLabel(event.start)} – ${timeLabel(event.end)}`} style={{ top: `${top / 1536 * 100}%`, height: `${height / 1536 * 100}%`, left: `calc(${lane / count * 100}% + 3px)`, width: `calc(${100 / count}% - 6px)` }}><strong>{event.title}</strong><small>{timeLabel(event.start)} – {timeLabel(event.end)}</small>{event.source === 'local' && <><span className="event-resize start" data-resize="start" title="拖动调整开始时间" /><span className="event-resize end" data-resize="end" title="拖动调整结束时间" /></>}</button>)}
              {selected && <div className="time-selection" style={{ top: `${selected.top / 1536 * 100}%`, height: `${selected.height / 1536 * 100}%` }}><span>{timeLabel(preview!.start)} – {timeLabel(preview!.end)}</span></div>}
            </div>;
          })}</div>)}
          </div>
        </div>
      </div>
    </> : <><div className="month-weekdays">{weekNames.map(name => <span key={name}>周{name}</span>)}</div><div className="month-grid">{days.map(day => <div key={dateKey(day)} className={`month-cell ${day.getMonth() !== date.getMonth() ? 'outside' : ''}`}><button className={`month-date ${dateKey(day) === dateKey(new Date()) ? 'today' : ''}`} onClick={() => onCreate(day)} aria-label={`${dateKey(day)} 新建日程`}>{day.getDate()}<Plus size={12} /></button>{dayEvents(events, day).map(event => <button className={`month-event ${event.color}`} key={event.id} onClick={() => onEdit(event)}>{!event.allDay && `${timeLabel(event.start)} `}{event.title}</button>)}</div>)}</div></>}
    <footer className="calendar-footer"><span><CalendarDays size={13} />{range ? `${dateKey(range.start)} ${timeLabel(range.start.toISOString())} → ${dateKey(range.end)} ${timeLabel(range.end.toISOString())}` : '左键拖选 · 15 分钟 · 跨午夜继续拖动 · Esc 取消'}</span><span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span></footer>
    </section>
  </div>;
}
