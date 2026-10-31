import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { prepareDomain } from './domainMigration'

const root = createRoot(document.getElementById('root')!);
let routeVersion = 0;
async function boot() {
  const version = ++routeVersion;
  if (/^\/brain_in_vat\/?$/.test(location.pathname)) {
    const { default: BrainInVat } = await import('./BrainInVat');
    if (version !== routeVersion) return;
    document.title = 'DUSTLAND / Brain in a Vat';
    root.render(<StrictMode><BrainInVat /></StrictMode>);
    return;
  }
  if (/^\/terminal\/?$/.test(location.pathname)) {
    const revealTerminal = history.state?.revealTerminal === true;
    if (revealTerminal) history.replaceState(null, '', location.href);
    const { default: Terminal } = await import('./Terminal');
    document.title = 'DUSTLAND / Ragon — personal terminal';
    root.render(<StrictMode><Terminal reveal={revealTerminal} /></StrictMode>);
    return;
  }
  const result = await prepareDomain();
  if (result === 'handled') return;
  const { default: App } = await import('./App');
  root.render(<StrictMode><App /></StrictMode>);
  if (result === 'warning') {
    const notice = document.createElement('button');
    notice.textContent = '旧域名数据未能自动迁移，原数据仍保留。请稍后刷新重试。点击关闭';
    notice.className = 'migration-notice';
    notice.onclick = () => notice.remove();
    document.body.append(notice);
  }
}
window.addEventListener('popstate', () => { void boot(); });
void boot();
