const previousOrigin = 'https://productivity.dustland.ai';
const destinationOrigin = 'https://www.dustland.ai';
const destination = `${destinationOrigin}/productivity/`;
const marker = 'serotonin.domain-migration.v1';
const keys = ['events', 'tasks', 'shortcuts', 'workflows', 'music', 'google-client'].map(name => `serotonin.${name}.v1`);
const requestType = 'serotonin-storage-request-v1';
const responseType = 'serotonin-storage-response-v1';

// Keep records already edited on www; import missing IDs from the previous origin.
export function mergeStoredData(current: string | null, previous: string): string {
  const incoming: unknown = JSON.parse(previous);
  if (!current) return JSON.stringify(incoming);
  const existing: unknown = JSON.parse(current);
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    const records = new Map<string, unknown>();
    for (const record of [...incoming, ...existing]) {
      if (record && typeof record === 'object' && typeof record.id === 'string') records.set(record.id, record);
    }
    return JSON.stringify([...records.values()]);
  }
  return existing === '' ? JSON.stringify(incoming) : current;
}

// The bridge only responds to the new origin's parent window. No tokens or URL payloads.
export async function prepareDomain(): Promise<'render' | 'handled' | 'warning'> {
  if (location.origin === previousOrigin) {
    if (window.parent !== window && new URLSearchParams(location.search).has('storage-transfer')) {
      window.addEventListener('message', event => {
        if (event.origin !== destinationOrigin || event.source !== window.parent || event.data?.type !== requestType) return;
        try {
          const data = Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)]));
          window.parent.postMessage({type:responseType, data}, destinationOrigin);
        } catch { window.parent.postMessage({type:responseType, error:true}, destinationOrigin); }
      });
    } else location.replace(destination);
    return 'handled';
  }
  if (location.origin !== destinationOrigin) return 'render';
  try { if (localStorage.getItem(marker)) return 'render'; } catch { return 'warning'; }
  return new Promise(resolve => {
    const frame = document.createElement('iframe');
    frame.hidden = true;
    frame.title = '迁移旧域名的本地数据';
    frame.src = `${previousOrigin}/productivity/?storage-transfer=1`;
    const finish = (result: 'render' | 'warning') => {
      clearTimeout(timeout); window.removeEventListener('message', receive); frame.remove(); resolve(result);
    };
    const receive = (event: MessageEvent) => {
      if (event.origin !== previousOrigin || event.source !== frame.contentWindow || event.data?.type !== responseType) return;
      if (event.data.error || !event.data.data || typeof event.data.data !== 'object') { finish('warning'); return; }
      try {
        for (const key of keys) {
          const value = event.data.data[key];
          if (typeof value === 'string') localStorage.setItem(key, mergeStoredData(localStorage.getItem(key), value));
        }
        localStorage.setItem(marker, 'complete'); finish('render');
      } catch { finish('warning'); }
    };
    const timeout = setTimeout(() => finish('warning'), 8000);
    window.addEventListener('message', receive);
    frame.onload = () => frame.contentWindow?.postMessage({type:requestType}, previousOrigin);
    document.body.append(frame);
  });
}
