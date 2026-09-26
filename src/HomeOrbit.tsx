import { useState } from 'react';
import { ArrowUpRight, CalendarDays, CheckCheck, ChevronLeft, ChevronRight, Headphones, Plus, Search, Settings2, Square, Zap } from 'lucide-react';
import type { CalendarEvent, Shortcut, Workflow } from './model';
import { safeUrl, timeLabel } from './model';

type Props = {
  shortcuts: Shortcut[]; workflows: Workflow[]; today: CalendarEvent[]; taskCount: number; now: Date;
  gmailStatus: string; onNavigate: (mode: number) => void; onSettings: () => void; onAddApp: () => void;
  onRemoveApp: (id: string) => void; onAddWorkflow: () => void; onWorkflow: (workflow: Workflow) => void;
  onRemoveWorkflow: (id: string) => void; onEvent: (event: CalendarEvent) => void; onCreateEvent: () => void;
  focusActive: boolean; focusTime: string; onFocus: () => void;
};
export default function HomeOrbit(props: Props) {
  const [search, setSearch] = useState(''), [page, setPage] = useState(0), [manage, setManage] = useState(false);
  const nodes = [
    { id: 'calendar', name: '日历', icon: CalendarDays, target: 1, status: `${props.today.length} 个日程`, shortcut: undefined as Shortcut | undefined },
    { id: 'tasks', name: '待办', icon: CheckCheck, target: 2, status: `${props.taskCount} 件待完成`, shortcut: undefined as Shortcut | undefined },
    { id: 'music', name: '音乐', icon: Headphones, target: 4, status: '', shortcut: undefined as Shortcut | undefined },
    ...props.shortcuts.map(shortcut => ({ id: shortcut.id, name: shortcut.name, icon: ArrowUpRight, target: -1, status: shortcut.id === 'gmail' ? props.gmailStatus : ['discord', 'instagram', 'wechat'].includes(shortcut.id) ? '状态未接入' : '', shortcut })),
  ].filter(item => item.name.toLowerCase().includes(search.toLowerCase()));
  const pages = Math.max(1, Math.ceil(nodes.length / 11)), current = Math.min(page, pages - 1);
  return <section className="orbit-home" aria-label="应用网格">
    <header className="quad-toolbar"><h1>应用</h1><time>{props.now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</time><label><Search size={15} /><input aria-label="搜索应用" placeholder="搜索" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} /></label><button onClick={() => setManage(!manage)}>{manage ? '完成' : '整理'}</button><button onClick={props.onSettings} aria-label="管理连接"><Settings2 size={17} /></button></header>
    <div className="quad-grid">{nodes.slice(current * 11, current * 11 + 11).map(node => {
      const contents = <><span className="orbital-icon">{node.shortcut ? <b>{node.shortcut.symbol}</b> : <node.icon size={34} strokeWidth={1.4} />}</span><strong>{node.name}</strong></>;
      return <div className="orbit-node" key={node.id}>
        {node.shortcut ? <a className="orbit-node-link" href={safeUrl(node.shortcut.url) ? node.shortcut.url : undefined} target="_blank" rel="noreferrer">{contents}</a> : <button className="orbit-node-link" onClick={() => props.onNavigate(node.target)}>{contents}</button>}
        {node.status && (node.shortcut ? <button className="orbital-status" onClick={props.onSettings}>{node.status}</button> : <span className="orbital-status">{node.status}</span>)}
        {manage && node.shortcut && <button className="orbit-remove" aria-label={`移除 ${node.name}`} onClick={() => props.onRemoveApp(node.id)}>×</button>}
      </div>;
    })}<button className="orbit-node orbit-add" onClick={props.onAddApp}><span className="orbital-icon"><Plus size={30} strokeWidth={1} /></span><strong>添加入口</strong></button></div>
    {!nodes.length && <p className="quad-empty">没有匹配的应用</p>}
    {pages > 1 && <div className="quad-pagination"><button aria-label="上一组应用" disabled={current === 0} onClick={() => setPage(current - 1)}><ChevronLeft size={16} /></button><span>{current + 1} / {pages}</span><button aria-label="下一组应用" disabled={current + 1 >= pages} onClick={() => setPage(current + 1)}><ChevronRight size={16} /></button></div>}
    <div className="orbit-workflows"><button onClick={props.onFocus}>{props.focusActive ? <Square size={14} /> : <Headphones size={16} />}{props.focusActive ? props.focusTime : '专注 25 分钟'}</button>{props.workflows.map(workflow => <span className="orbit-workflow" key={workflow.id}><button onClick={() => props.onWorkflow(workflow)}><Zap size={14} />{workflow.name}</button>{manage && <button aria-label={`删除工作流 ${workflow.name}`} onClick={() => props.onRemoveWorkflow(workflow.id)}>×</button>}</span>)}<button onClick={props.onAddWorkflow}><Plus size={15} /> 工作流</button></div>
    <div className="orbit-agenda"><span>今天 · {props.today.length}</span>{props.today.slice(0, 2).map(event => <button key={event.id} onClick={() => props.onEvent(event)}><small>{event.allDay ? '全天' : timeLabel(event.start)}</small>{event.title}</button>)}<button onClick={props.onCreateEvent}><Plus size={14} />日程</button></div>
  </section>;
}
