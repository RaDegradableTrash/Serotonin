import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { prepareDomain } from './domainMigration'

async function boot() {
  if (/^\/terminal\/?$/.test(location.pathname)) {
    const { default: Terminal } = await import('./Terminal');
    document.title = 'DUSTLAND / Ragon — personal terminal';
    createRoot(document.getElementById('root')!).render(<StrictMode><Terminal /></StrictMode>);
    return;
  }
  const result = await prepareDomain();
  if (result === 'handled') return;
  const { default: App } = await import('./App');
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
  if (result === 'warning') {
    const notice = document.createElement('button');
    notice.textContent = '旧域名数据未能自动迁移，原数据仍保留。请稍后刷新重试。点击关闭';
    notice.className = 'migration-notice';
    notice.onclick = () => notice.remove();
    document.body.append(notice);
  }
}
void boot();
