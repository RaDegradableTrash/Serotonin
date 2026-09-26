export type CalendarEvent = { id: string; title: string; start: string; end: string; allDay: boolean; color: string; notes: string; source: 'local' | 'google'; taskId?: string; url?: string };
export type Task = { id: string; title: string; done: boolean; priority: 'normal' | 'high'; due: string };
export type Shortcut = { id: string; name: string; url: string; color: string; symbol: string };
export type Workflow = { id: string; name: string; urls: string[] };
export const uid = () => crypto.randomUUID();
export const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const addDays = (date: Date, days: number) => { const result = new Date(date); result.setDate(result.getDate() + days); return result; };
export const startOfWeek = (date: Date) => { const result = addDays(date, -((date.getDay() + 6) % 7)); result.setHours(0, 0, 0, 0); return result; };
export const localInput = (date: Date) => `${dateKey(date)}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
export const dayEvents = (events: CalendarEvent[], day: Date) => {
  const start = new Date(`${dateKey(day)}T00:00:00`), end = addDays(start, 1);
  return events.filter(event => new Date(event.start) < end && new Date(event.end) > start).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
};
export const overlaps = (a: CalendarEvent, b: CalendarEvent) => a.id !== b.id && new Date(a.start) < new Date(b.end) && new Date(a.end) > new Date(b.start);
export const timeLabel = (date: string) => new Date(date).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
export const safeUrl = (value: string) => { try { return ['https:', 'http:', 'mailto:', 'discord:', 'weixin:', 'unityhub:', 'vscode:'].includes(new URL(value).protocol); } catch { return false; } };
export const initialShortcuts: Shortcut[] = [
  { id: 'gmail', name: 'Gmail', url: 'https://mail.google.com', color: 'coral', symbol: 'M' },
  { id: 'discord', name: 'Discord', url: 'https://discord.com/app', color: 'indigo', symbol: '◡' },
  { id: 'instagram', name: 'Instagram', url: 'https://www.instagram.com', color: 'pink', symbol: '◎' },
  { id: 'wechat', name: '微信', url: 'weixin://', color: 'green', symbol: '••' },
  { id: 'github', name: 'GitHub', url: 'https://github.com', color: 'ink', symbol: '⌘' },
  { id: 'notion', name: 'Notion', url: 'https://www.notion.so', color: 'paper', symbol: 'N' },
];
