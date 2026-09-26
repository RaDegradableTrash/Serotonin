import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, CalendarDays, Check, CheckCheck, Command, ExternalLink, Grid2X2, Headphones, LayoutGrid, Play, Plus, RefreshCw, Settings2 } from 'lucide-react';
import Calendar from './Calendar';
import EventEditor from './EventEditor';
import Tasks from './Tasks';
import Music from './Music';
import Scene from './Scene';
import HomeOrbit from './HomeOrbit';
import Modal from './Modal';
import { useStored } from './useStored';
import { addDays, dateKey, dayEvents, initialShortcuts, safeUrl, uid } from './model';
import type { CalendarEvent, Shortcut, Task, Workflow } from './model';
import { authorizeGoogle, fetchCalendar, fetchUnread, loadGoogle } from './google';
import './App.css';

type Connection = { status: 'idle' | 'loading' | 'connected' | 'error' | 'expired'; error?: string; updated?: string };
const nav = [{ name: '主页', key: '~', icon: LayoutGrid }, { name: '日历', key: '1', icon: CalendarDays }, { name: '待办', key: '2', icon: CheckCheck }, { name: '留白', key: '3', icon: Grid2X2 }, { name: '音乐', key: '4', icon: Headphones }];
const connectionLabel = { idle: '未连接', loading: '连接中', connected: '已连接', error: '连接异常', expired: '授权已过期' };

function App() {
  const [mode, setMode] = useState(0), [now, setNow] = useState(new Date()), [date, setDate] = useState(new Date());
  const [events, setEvents] = useStored<CalendarEvent[]>('serotonin.events.v1', []);
  const [tasks, setTasks] = useStored<Task[]>('serotonin.tasks.v1', []);
  const [shortcuts, setShortcuts] = useStored<Shortcut[]>('serotonin.shortcuts.v1', initialShortcuts);
  const [workflows, setWorkflows] = useStored<Workflow[]>('serotonin.workflows.v1', []);
  const [clientId, setClientId] = useStored('serotonin.google-client.v1', import.meta.env.VITE_GOOGLE_CLIENT_ID || '');
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]), [unread, setUnread] = useState<number | null>(null);
  const [connections, setConnections] = useState<Record<'calendar' | 'gmail', Connection>>({ calendar: { status: 'idle' }, gmail: { status: 'idle' } });
  const tokens = useRef<Partial<Record<'calendar' | 'gmail', { token: string; expires: number }>>>({});
  const generations = useRef({ calendar: 0, gmail: 0 });
  const [googleReady, setGoogleReady] = useState(false), [googleLoadError, setGoogleLoadError] = useState('');
  const [editor, setEditor] = useState<CalendarEvent | null>(null), [settings, setSettings] = useState(false), [shortcutEditor, setShortcutEditor] = useState(false), [workflowEditor, setWorkflowEditor] = useState(false), [runningWorkflow, setRunningWorkflow] = useState<Workflow | null>(null);
  const [notice, setNotice] = useState('');
  const [focusEnd, setFocusEnd] = useState<number | null>(null);
  const allEvents = [...events, ...googleEvents];
  const todayEvents = dayEvents(allEvents, now);
  const remaining = tasks.filter(task => !task.done);
  const refreshGoogle = useCallback(async (kind: 'calendar' | 'gmail', credentials = tokens.current[kind]) => {
    if (!credentials || credentials.expires <= Date.now()) { setConnections(state => ({ ...state, [kind]: { status: 'expired' } })); return; }
    const generation = ++generations.current[kind];
    setConnections(state => ({ ...state, [kind]: { ...state[kind], status: 'loading', error: undefined } }));
    try {
      if (kind === 'calendar') {
        const start = new Date(date.getFullYear(), date.getMonth() - 1, 1), end = new Date(date.getFullYear(), date.getMonth() + 2, 1);
        const today = new Date(`${dateKey(new Date())}T00:00:00`);
        const [visibleEvents, currentDayEvents] = await Promise.all([
          fetchCalendar(credentials.token, start, end),
          today < start || today >= end ? fetchCalendar(credentials.token, today, addDays(today, 1)) : Promise.resolve([]),
        ]);
        const result = [...new Map([...visibleEvents, ...currentDayEvents].map(event => [event.id, event])).values()];
        if (generation !== generations.current[kind]) return;
        setGoogleEvents(result);
      } else { const count = await fetchUnread(credentials.token); if (generation !== generations.current[kind]) return; setUnread(count); }
      setConnections(state => ({ ...state, [kind]: { status: 'connected', updated: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) } }));
    } catch (error) { if (generation === generations.current[kind]) setConnections(state => ({ ...state, [kind]: { status: 'error', error: error instanceof Error ? error.message : '连接失败，请重试。' } })); }
  }, [date]);
  useEffect(() => { if (tokens.current.calendar) void refreshGoogle('calendar'); }, [refreshGoogle]);
  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      for (const kind of ['calendar', 'gmail'] as const) {
        if (tokens.current[kind] && tokens.current[kind]!.expires <= Date.now()) {
          delete tokens.current[kind]; generations.current[kind]++;
          setConnections(state => ({ ...state, [kind]: { status: 'expired' } }));
          if (kind === 'gmail') setUnread(null); else setGoogleEvents([]);
        }
      }
    }, 10000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || document.querySelector('dialog[open]') || target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const index = event.key === '`' || event.key === '~' ? 0 : /^[1-4]$/.test(event.key) ? Number(event.key) : -1;
      if (index >= 0) { event.preventDefault(); setMode(index); }
    };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => { const handler = () => setNotice('浏览器存储空间不足，最新修改尚未保存。请释放空间后重试。'); window.addEventListener('storage-failed', handler); return () => window.removeEventListener('storage-failed', handler); }, []);
  const loadAuthorization = () => { setGoogleLoadError(''); void loadGoogle().then(() => setGoogleReady(true)).catch(error => setGoogleLoadError(error.message)); };
  const openSettings = () => { setSettings(true); loadAuthorization(); };
  const connect = async (kind: 'calendar' | 'gmail') => {
    setConnections(state => ({ ...state, [kind]: { status: 'loading' } }));
    const generation = ++generations.current[kind];
    try { const credentials = await authorizeGoogle(clientId.trim(), kind); if (generation !== generations.current[kind]) return; tokens.current[kind] = credentials; await refreshGoogle(kind, credentials); }
    catch (error) { if (generation === generations.current[kind]) setConnections(state => ({ ...state, [kind]: { status: 'error', error: error instanceof Error ? error.message : '授权失败' } })); }
  };
  const disconnect = () => {
    const token = tokens.current.calendar?.token || tokens.current.gmail?.token;
    if (token) window.google?.accounts.oauth2.revoke(token, () => {});
    tokens.current = {}; generations.current.calendar++; generations.current.gmail++;
    setGoogleEvents([]); setUnread(null); setConnections({ calendar: { status: 'idle' }, gmail: { status: 'idle' } });
  };
  const createEvent = (at: Date, task?: Task, until?: Date) => {
    const existing = task && events.find(event => event.taskId === task.id);
    if (existing) { setEditor(existing); return; }
    const start = new Date(at); start.setSeconds(0, 0);
    setEditor({ id: uid(), title: task?.title || '', start: start.toISOString(), end: (until || new Date(start.getTime() + 3600000)).toISOString(), allDay: false, color: 'teal', notes: '', source: 'local', ...(task ? { taskId: task.id } : {}) });
  };
  const moveEvent = (id: string, at: Date) => setEvents(current => current.map(event => event.id === id ? { ...event, start: at.toISOString(), end: new Date(at.getTime() + new Date(event.end).getTime() - new Date(event.start).getTime()).toISOString() } : event));
  const focusSeconds = focusEnd ? Math.max(0, Math.ceil((focusEnd - now.getTime()) / 1000)) : 25 * 60;
  const focusTime = `${String(Math.floor(focusSeconds / 60)).padStart(2, '0')}:${String(focusSeconds % 60).padStart(2, '0')}`;

  return <div className={`app-shell mode-${mode}`}>
    <header className="app-header"><button className="brand" onClick={() => setMode(0)} aria-label="Serotonin 主页"><span>SEROTONIN PROTOCOL</span></button><nav aria-label="主导航">{nav.map((item, index) => <button key={item.key} className={mode === index ? 'active' : ''} onClick={() => setMode(index)} aria-current={mode === index ? 'page' : undefined}><kbd>[{item.key}]</kbd><span>{item.name}</span></button>)}</nav><div className="header-right"><button className="icon-button" aria-label="连接与设置" onClick={openSettings}><Settings2 size={19} /></button></div></header>
    <Scene mode={mode} onSelect={setMode}>
    <main className="workspace-main">
    {mode === 0 && <HomeOrbit shortcuts={shortcuts} workflows={workflows} today={todayEvents} taskCount={remaining.length} now={now}
      gmailStatus={connections.gmail.status === 'connected' && unread !== null ? `${unread} 封未读` : connectionLabel[connections.gmail.status]}
      onNavigate={setMode} onSettings={openSettings} onAddApp={() => setShortcutEditor(true)} onRemoveApp={id => setShortcuts(shortcuts.filter(item => item.id !== id))}
      onAddWorkflow={() => setWorkflowEditor(true)} onWorkflow={setRunningWorkflow} onRemoveWorkflow={id => setWorkflows(workflows.filter(item => item.id !== id))}
      onEvent={setEditor} onCreateEvent={() => createEvent(new Date())} focusActive={!!focusEnd} focusTime={focusTime}
      onFocus={() => setFocusEnd(focusEnd ? null : Date.now() + 25 * 60 * 1000)} />}
    {mode === 1 && <Calendar date={date} onDate={setDate} events={allEvents} tasks={tasks} onCreate={createEvent} onCreateRange={(start, end) => createEvent(start, undefined, end)} onEdit={setEditor} onMove={moveEvent} onConnect={openSettings} connected={connections.calendar.status === 'connected'} />}
    {mode === 2 && <Tasks tasks={tasks} events={allEvents} onChange={setTasks} onSchedule={task => createEvent(task.due ? new Date(`${task.due}T09:00`) : new Date(), task)} />}
    {mode === 3 && <section className="reserved-page" aria-label="预留空间" />}
    <div hidden={mode !== 4}><Music /></div>
    </main></Scene>
    {notice && <div className="toast" role="status">{notice}<button aria-label="关闭提示" onClick={() => setNotice('')}>×</button></div>}
    {editor && <EventEditor event={editor} events={allEvents} onSave={event => { setEvents(current => [...current.filter(item => item.id !== event.id), event]); setEditor(null); }} onDelete={id => { setEvents(current => current.filter(item => item.id !== id)); setEditor(null); }} onClose={() => setEditor(null)} />}
    {settings && <Modal title="连接与设置" onClose={() => setSettings(false)}><p className="modal-intro">将 Google 日历和 Gmail 状态带到你的个人空间。</p><label>Google OAuth Client ID<input value={clientId} onChange={e => { disconnect(); setClientId(e.target.value); }} placeholder="….apps.googleusercontent.com" /></label><p className="hint">使用 Web 应用客户端 ID，授权来源设为 {window.location.origin}。无需填写 Client Secret。</p>{googleLoadError && <p className="error">{googleLoadError}<button className="text-button" onClick={loadAuthorization}>重试</button></p>}{(['calendar', 'gmail'] as const).map(kind => <div className="settings-connection" key={kind}><div><h3>{kind === 'calendar' ? 'Google Calendar' : 'Gmail'}</h3><p>{kind === 'calendar' ? '只读显示主日历 · 当前月份前后各一个月' : '读取收件箱未读数量，不读取邮件内容'}</p><small>{connectionLabel[connections[kind].status]}{connections[kind].updated && ` · 上次更新 ${connections[kind].updated}`}</small>{connections[kind].error && <p className="error">{connections[kind].error}</p>}</div><div className="connection-actions">{tokens.current[kind] && <button className="icon-button" disabled={connections[kind].status === 'loading'} aria-label={`刷新 ${kind}`} onClick={() => void refreshGoogle(kind)}><RefreshCw size={16} /></button>}<button className="secondary" disabled={!clientId.trim().endsWith('.apps.googleusercontent.com') || !googleReady || connections[kind].status === 'loading'} onClick={() => void connect(kind)}>{connections[kind].status === 'loading' ? '连接中…' : connections[kind].status === 'connected' ? '重新授权' : '授权连接'}</button></div></div>)}<p className="hint">授权仅保留在本次会话，刷新页面后需重新连接。日历随浏览月份重新读取；Gmail 可手动刷新。断开会清除两个服务的连接。</p><button className="text-button danger" onClick={disconnect}>断开 Google 连接</button><div className="settings-note"><h3>更多连接</h3><p>Discord、Instagram、微信目前提供快捷跳转，尚未接入账号状态。微信跳转需要本机安装微信并注册链接协议。</p><p>Windows 虚拟桌面及启动指定本地程序需要桌面执行器，当前浏览器版本尚不支持。</p></div><a className="text-button" href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">前往 Google Cloud 配置 <ExternalLink size={14} /></a></Modal>}
    {shortcutEditor && <ShortcutEditor onClose={() => setShortcutEditor(false)} onSave={shortcut => { setShortcuts([...shortcuts, shortcut]); setShortcutEditor(false); }} />}
    {workflowEditor && <WorkflowEditor onClose={() => setWorkflowEditor(false)} onSave={workflow => { setWorkflows([...workflows, workflow]); setWorkflowEditor(false); }} />}
    {runningWorkflow && <Modal title={runningWorkflow.name} onClose={() => setRunningWorkflow(null)}><p className="modal-intro">点击打开这一组工作入口。浏览器可能需要允许弹出窗口。</p><button className="primary wide" onClick={() => { let blocked = 0; for (const url of runningWorkflow.urls.filter(safeUrl)) { const tab = window.open('about:blank', '_blank'); if (tab) { tab.opener = null; tab.location.href = url; } else blocked++; } setNotice(blocked ? `${blocked} 个入口被浏览器拦截，请使用下方链接逐个打开。` : '已向浏览器发送打开请求。'); }}><Play size={16} /> 打开全部</button><div className="workflow-links">{runningWorkflow.urls.map((url, i) => <a key={i} href={safeUrl(url) ? url : undefined} target="_blank" rel="noreferrer"><span>{i + 1}. {url}</span><ArrowUpRight size={16} /></a>)}</div></Modal>}
  </div>;
}

function ShortcutEditor({ onClose, onSave }: { onClose: () => void; onSave: (shortcut: Shortcut) => void }) {
  const [name, setName] = useState(''), [url, setUrl] = useState(''), [error, setError] = useState('');
  return <Modal title="添加到我的桌面" onClose={onClose}><form onSubmit={e => { e.preventDefault(); if (!name.trim() || !safeUrl(url)) { setError('请填写名称和有效的网址或受支持的应用链接。'); return; } onSave({ id: uid(), name: name.trim(), url, color: 'sage', symbol: name.trim()[0].toUpperCase() }); }}><label>应用名称<input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="例如：我的项目" required maxLength={30} /></label><label>网址或应用链接<input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://… 或 unityhub://…" required /></label><p className="hint">支持 http(s)、mailto、discord、weixin、unityhub 和 vscode 链接。</p>{error && <p className="error">{error}</p>}<div className="modal-actions"><button className="primary"><Plus size={16} /> 添加应用</button></div></form></Modal>;
}
function WorkflowEditor({ onClose, onSave }: { onClose: () => void; onSave: (workflow: Workflow) => void }) {
  const [name, setName] = useState(''), [urls, setUrls] = useState(''), [error, setError] = useState('');
  return <Modal title="创建快捷工作流" onClose={onClose}><form onSubmit={e => { e.preventDefault(); const values = urls.split('\n').map(url => url.trim()).filter(Boolean); if (!name.trim() || !values.length || values.some(url => !safeUrl(url))) { setError('请填写名称，并确保每行都是有效的网页或应用链接。'); return; } onSave({ id: uid(), name: name.trim(), urls: values }); }}><label>工作流名称<input autoFocus required value={name} onChange={e => setName(e.target.value)} placeholder="例如：进入开发状态" maxLength={60} /></label><label>快捷入口（每行一个）<textarea required rows={5} value={urls} onChange={e => setUrls(e.target.value)} placeholder={'https://github.com\nhttps://你的项目文档'} /></label><div className="settings-note"><h3><Command size={15} /> 关于 Windows 桌面宏</h3><p>当前可组合网页和已注册的应用链接。新建空白 Windows 桌面、启动 Codex 和指定 Unity 项目尚需本地执行器；此处不会执行系统命令。</p></div>{error && <p className="error">{error}</p>}<div className="modal-actions"><button className="primary"><Check size={16} /> 保存工作流</button></div></form></Modal>;
}
export default App;
