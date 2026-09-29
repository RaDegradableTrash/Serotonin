import { useRef, useEffect, useLayoutEffect, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { localPoint, minuteDate, dragRange } from './calendarGeometry';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { addDays, dateKey, dayEvents, startOfWeek, timeLabel, uid, localInput } from './model';
import type { CalendarEvent, Task } from './model';

function focusWithoutScroll(node: HTMLInputElement | null) { node?.focus({preventScroll:true}); }
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
  onSave: (event: CalendarEvent) => void; onDelete: (id: string) => void;
  onResize: (id: string, start: Date, end: Date) => void; onMove: (id: string, date: Date) => void; onConnect: () => void; connected: boolean;
};
type Selection = { anchor: Date; focus: Date };
type Drag = Selection & { pointerId: number; x: number; y: number; downX: number; downY: number; moved: boolean; event?: CalendarEvent; kind?: "move" | "start" | "end" };
function PlaneCorners() { return <>{['tl', 'tr', 'br', 'bl'].map(corner => <i key={corner} aria-hidden="true" className={`plane-corner ${corner}`} />)}</>; }

export default function Calendar({ date, onDate, events, tasks, onSave, onDelete, onMove, onResize, onConnect, connected }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null), gridRef = useRef<HTMLDivElement>(null), frameRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<{ id: string; inline: boolean; x: number; y: number } | null>(null);
  const [hover, setHover] = useState<Date | null>(null);
  const onEdit = (event: CalendarEvent, x?: number, y?: number) => {
    const main = mainRef.current!;
    const point = localPoint(main, { x: x ?? main.getBoundingClientRect().x, y: y ?? main.getBoundingClientRect().y });
    const unit = parseFloat(getComputedStyle(main).getPropertyValue('--calendar-unit')) * .65 || 1;
    const width = 230 * unit, height = 190 * unit;
    const target = [...main.querySelectorAll<HTMLElement>('[data-event-id]')].find(node => {const r=node.getBoundingClientRect();return node.dataset.eventId===event.id && (x??0)>=r.left && (x??0)<=r.right && (y??0)>=r.top && (y??0)<=r.bottom;});
    let left = point.x + 28 * unit, top = point.y - 30 * unit;
    if(target) {
      let ox=0,oy=0,node:HTMLElement|null=target;
      while(node && node!==main){ox+=node.offsetLeft;oy+=node.offsetTop;node=node.offsetParent as HTMLElement|null;}
      oy-=scrollRef.current?.scrollTop || 0;
      const gap=8*unit;
      if(ox+target.offsetWidth+gap+width<=main.clientWidth)left=ox+target.offsetWidth+gap;
      else if(ox-gap-width>=0)left=ox-gap-width;
      else {left=ox;top=oy+target.offsetHeight+gap+height<=main.clientHeight ? oy+target.offsetHeight+gap : oy-gap-height;}
    }
    setActive({ id:event.id, inline:false, x:Math.max(0, Math.min(main.clientWidth-width,left)), y:Math.max(0,Math.min(main.clientHeight-height,top)) });
  };
  const onCreate = (at: Date, task?: Task, end = new Date(at.getTime()+3600000)) => {
    const event: CalendarEvent = {id:uid(),title:'',start:at.toISOString(),end:end.toISOString(),allDay:false,color:'teal',notes:'',source:'local',...(task ? {taskId:task.id}: {})};
    onSave(event); onDate(at); setActive({id:event.id,inline:true,x:0,y:0}); setHover(null);
  };
  const onCreateRange = (start: Date, end: Date) => onCreate(start, undefined, end);
  const [windowState, setWindowState] = useState(() => ({ selected: dateKey(date), start: startOfWeek(date) }));
  if (windowState.selected !== dateKey(date)) setWindowState({ selected: dateKey(date), start: startOfWeek(date) });
  const [selection, setSelection] = useState<Selection | null>(null);
  const suppressClick = useRef(false);
  const [editing, setEditing] = useState<CalendarEvent | null>(null);
  const [boundary, setBoundary] = useState<{ day: string; direction: number } | null>(null);

  const windowStart = useRef(windowState.start), drag = useRef<Drag | null>(null), animation = useRef(0);

  const start = windowState.start;
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  useLayoutEffect(() => { windowStart.current = windowState.start; }, [windowState.start]);
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || !scrollRef.current) return;
    const fit = () => { if (scrollRef.current && !drag.current) scrollRef.current.scrollTop = frame.clientHeight; };
    fit(); const observer = new ResizeObserver(fit); observer.observe(frame);
    return () => observer.disconnect();
  }, [windowState.selected]);
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
    if (!drag.current) { if(frameRef.current) scroller.scrollTop=frameRef.current.clientHeight; return; }
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
    if (target.closest('input, textarea, .event-details')) return;
    const item = target.closest<HTMLElement>('[data-event-id]');
    const existing = item ? events.find(e => e.id === item.dataset.eventId) : undefined;
    if (event.button !== 0 || !event.isPrimary || (!target.closest('.hour-cell') && !existing) || existing?.source === 'google') return;
    suppressClick.current = false; setActive(null); setHover(null);
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
    if (!drag.current) { const target = event.target as HTMLElement; setHover(target.closest('.hour-cell') ? timeAt(event.clientX,event.clientY) : null); return; }
    if (drag.current.pointerId !== event.pointerId) return;
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
      if (!current.moved) { suppressClick.current = true; onEdit(current.event, event.clientX, event.clientY); }
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
  const activeEvent = events.find(event => event.id === active?.id);

  return <div className="calendar-page">
    <aside className="calendar-sidebar"><MiniCalendar selected={date} onSelect={day=>{setActive(null);onDate(day);}} />
      <div className="side-label">我的日历</div><div className="legend"><i className="dot teal" /> 个人日程 <span>本地</span></div><div className="legend"><i className="dot blue" /> Google Calendar</div><button className="connect-calendar" onClick={onConnect}>{connected ? '管理 Google 连接' : '连接 Google Calendar'}<ArrowUpRight size={14} /></button>
    </aside>
    <section className="calendar-main" ref={mainRef}><PlaneCorners />
      <>
      <div className="week-header"><span className="timezone">本地<br />时间</span>{days.map(day => <button key={dateKey(day)} onClick={() => {setActive(null);onDate(day);}} className={`calendar-day-heading ${dateKey(day) === dateKey(new Date()) ? 'is-today' : ''}`}><small>周{weekNames[(day.getDay() + 6) % 7]}</small><b>{day.getDate()}</b></button>)}</div>
      <div className="all-day-row"><small>全天</small>{days.map(day => <div key={dateKey(day)}>{dayEvents(events, day).filter(event => event.allDay).map(event => <button key={event.id} className={`month-event ${event.color}`} onClick={e => onEdit(event,e.clientX,e.clientY)}>{event.title}</button>)}</div>)}</div>
      <div className={`timeline-frame ${selection ? 'selecting-time' : ''}`} ref={frameRef}><PlaneCorners />
        {boundary && <div className={`day-transition direction-${boundary.direction}`} key={`${boundary.day}-${boundary.direction}`} role="status">{boundary.direction > 0 ? '↓' : '↑'} {boundary.day}</div>}
        <span className="day-end-label">24:00</span><div className="week-scroll" ref={scrollRef} onClickCapture={e => { if (suppressClick.current) { e.preventDefault(); e.stopPropagation(); suppressClick.current = false; } }} onScroll={normalizeScroll} onPointerDown={beginSelection} onPointerMove={moveSelection} onPointerLeave={() => setHover(null)} onPointerUp={event => finishSelection(event)} onPointerCancel={event => finishSelection(event, true)} onLostPointerCapture={event => finishSelection(event, true)}>
          <div className="week-grid" ref={gridRef}><PlaneCorners /><div className="hour-labels">{[-1, 0, 1].map(offset => <div className="hour-day" key={offset}>{Array.from({ length: 24 }, (_, h) => <span key={h}>{String(h).padStart(2, '0')}:00</span>)}</div>)}</div>
          {days.map((columnDay, column) => <div key={column} data-column={column} className="day-column">{[-1, 0, 1].map(offset => {
            const day = addDays(columnDay, offset), items = dayEvents(editing ? events.map(e => e.id === editing.id ? editing : e) : events, day);
            const hovered = hover && dateKey(hover) === dateKey(day) ? hover : null;
            const selected = preview ? layoutEvents(dayEvents([preview], day), day)[0] : null;
            return <div className={`day-segment ${dateKey(day) === dateKey(new Date()) ? 'today-column' : ''}`} data-date={dateKey(day)} key={offset}>

              {Array.from({ length: 24 }, (_, hour) => <button className="hour-cell" key={hour} aria-label={`${dateKey(day)} ${hour}:00 新建日程`} onClick={event => { if (event.detail === 0) { const time = new Date(day); time.setHours(hour); onCreate(time); } }} onDragOver={event => event.preventDefault()} onDrop={event => {
                event.preventDefault(); const data = event.dataTransfer.getData('text/plain'); const time = timeAt(event.clientX, event.clientY);
                if (data.startsWith('task:')) { const task = tasks.find(item => item.id === data.slice(5)); if (task) onCreate(time, task); } else if (data.startsWith('event:')) onMove(data.slice(6), time);
              }} />)}
              {layoutEvents(items, day).map(({ event, top, height, lane, count }) => {
                const inline = active?.inline && active.id === event.id && offset === 0 && dateKey(day) === dateKey(new Date(event.start));
                return <div key={event.id} data-event-id={event.id} role="button" tabIndex={0} aria-label={event.title || '未命名日程'} onClick={e => { if (!inline) onEdit(event,e.clientX,e.clientY); }} onKeyDown={e => { if(e.target===e.currentTarget && e.key==='Delete' && event.source==='local'){e.preventDefault();onDelete(event.id);setActive(null);return;} if (e.target === e.currentTarget && e.key === 'Enter') { const r=e.currentTarget.getBoundingClientRect(); onEdit(event,r.right,r.top); } }} className={`time-event ${event.color} ${inline ? 'inline-event' : ''}`} style={{ top: `${top / 1536 * 100}%`, height: `${height / 1536 * 100}%`, left: `calc(${lane / count * 100}% + 3px)`, width: `calc(${100 / count}% - 6px)` }}>
                  {inline ? <div className={`inline-fields ${top > 1152 ? "above" : ""} ${column > 4 ? "align-right" : ""}`} onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')setActive(null);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setActive(null);}}><input ref={focusWithoutScroll} aria-label="事件名称" placeholder="事件名称" value={event.title} onChange={e=>onSave({...event,title:e.target.value})}/><small>{timeLabel(event.start)} – {timeLabel(event.end)}</small><textarea aria-label="详情" placeholder="详情" value={event.notes} onChange={e=>onSave({...event,notes:e.target.value})}/></div> : <><strong>{event.title || '未命名日程'}</strong><small>{timeLabel(event.start)} – {timeLabel(event.end)}</small></>}
                  {event.source === 'local' && <><span className="event-resize start" data-resize="start"/><span className="event-resize end" data-resize="end"/></>}
                </div>;
              })}
              {hovered && !selection && <div className="hover-time" style={{top:((hovered.getHours()*60+hovered.getMinutes())/1440*100)+'%'}}><b>{timeLabel(hovered.toISOString())}</b></div>}
              {selected && <div className="time-selection" style={{ top: `${selected.top / 1536 * 100}%`, height: `${selected.height / 1536 * 100}%` }}><span>{timeLabel(preview!.start)} – {timeLabel(preview!.end)}</span></div>}
            </div>;
          })}</div>)}
          </div>
        </div>
      </div>
    </>
    {active && !active.inline && activeEvent && <div className="event-details" style={{left:active.x,top:active.y}} onKeyDown={e=>{if(e.key==='Escape')setActive(null);}} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setActive(null);}}>
      <EventFields key={activeEvent.id} event={activeEvent} onSave={onSave}/>
    </div>}
    </section>
  </div>;
}

function EventFields({event,onSave}:{event:CalendarEvent;onSave:(event:CalendarEvent)=>void}) {
 const readOnly=event.source==='google';
 const [start,setStart]=useState(localInput(new Date(event.start))), [end,setEnd]=useState(localInput(new Date(event.end)));
 const valid = !!start && !!end && new Date(end)>new Date(start);
 const saveTime = () => {if(valid)onSave({...event,start:new Date(start).toISOString(),end:new Date(end).toISOString()});};
 return <><input ref={focusWithoutScroll} aria-label="事件名称" placeholder="事件名称" value={event.title} readOnly={readOnly} onChange={e=>onSave({...event,title:e.target.value})}/><div className="event-times"><input aria-label="开始时间" type="datetime-local" value={start} readOnly={readOnly} onChange={e=>setStart(e.target.value)} onBlur={saveTime}/><span>—</span><input aria-label="结束时间" type="datetime-local" value={end} readOnly={readOnly} onChange={e=>setEnd(e.target.value)} onBlur={saveTime}/></div>{!valid && <small role="alert">结束时间需晚于开始时间</small>}<textarea aria-label="详情" placeholder="详情" value={event.notes} readOnly={readOnly} onChange={e=>onSave({...event,notes:e.target.value})}/></>;
}
