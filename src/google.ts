import type { CalendarEvent } from './model';

type TokenResponse = { access_token?: string; expires_in: number; error?: string };
type GoogleApi = { accounts: { oauth2: {
  initTokenClient: (config: { client_id: string; scope: string; callback: (response: TokenResponse) => void; error_callback: () => void }) => { requestAccessToken: () => void };
  revoke: (token: string, callback: () => void) => void;
} } };
declare global { interface Window { google?: GoogleApi } }
let loading: Promise<void> | undefined;
export function loadGoogle() {
  if (window.google) return Promise.resolve();
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
    const timeout = window.setTimeout(() => { script.remove(); loading = undefined; reject(new Error('Google 服务加载超时，请检查网络后重试。')); }, 15000);
    script.onload = () => { clearTimeout(timeout); resolve(); };
    script.onerror = () => { clearTimeout(timeout); script.remove(); loading = undefined; reject(new Error('无法加载 Google 授权服务，请检查网络。')); };
    document.head.appendChild(script);
  });
  return loading;
}
export function authorizeGoogle(clientId: string, kind: 'calendar' | 'gmail') {
  return new Promise<{ token: string; expires: number }>((resolve, reject) => {
    if (!window.google) return reject(new Error('授权服务尚未就绪，请稍后再试。'));
    window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: kind === 'calendar' ? 'https://www.googleapis.com/auth/calendar.events.readonly' : 'https://www.googleapis.com/auth/gmail.labels',
      callback: response => response.access_token && !response.error ? resolve({ token: response.access_token, expires: Date.now() + response.expires_in * 1000 }) : reject(new Error('未获得授权。你可以再次连接。')),
      error_callback: () => reject(new Error('授权窗口已关闭或被浏览器拦截，请重试。')),
    }).requestAccessToken();
  });
}
async function googleGet(url: string, token: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(response.status === 401 ? '授权已过期，请重新连接。' : response.status === 403 ? '访问被拒绝，请检查 API 是否启用及授权范围。' : `Google 请求失败 (${response.status})，请重试。`);
  return response.json();
}
type GoogleEvent = { id: string; summary?: string; description?: string; htmlLink?: string; status: string; start: { dateTime?: string; date?: string }; end: { dateTime?: string; date?: string } };
export async function fetchCalendar(token: string, start: Date, end: Date): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = []; let page = '';
  do {
    const params = new URLSearchParams({ timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '2500' });
    if (page) params.set('pageToken', page);
    const data: { items?: GoogleEvent[]; nextPageToken?: string } = await googleGet(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, token);
    for (const event of data.items || []) {
      if (event.status === 'cancelled' || !event.start || !event.end) continue;
      const startValue = event.start.dateTime || `${event.start.date}T00:00:00`;
      const endValue = event.end.dateTime || `${event.end.date}T00:00:00`;
      if (!Number.isFinite(new Date(startValue).getTime()) || !Number.isFinite(new Date(endValue).getTime())) continue;
      events.push({ id: `google-${event.id}`, title: event.summary || '无标题日程', start: startValue, end: endValue, allDay: !!event.start.date, color: 'blue', notes: event.description || '', source: 'google', url: event.htmlLink });
    }
    page = data.nextPageToken || '';
  } while (page);
  return events;
}
export async function fetchUnread(token: string): Promise<number> {
  const data = await googleGet('https://gmail.googleapis.com/gmail/v1/users/me/labels/INBOX', token);
  return data.messagesUnread || 0;
}
