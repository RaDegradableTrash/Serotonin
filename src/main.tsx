import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { prepareDomain } from './domainMigration'

void prepareDomain().then(result => {
  if (result === 'handled') return;
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
  if (result === 'warning') {
    const notice = document.createElement('button');
    notice.textContent = '旧域名数据未能自动迁移，原数据仍保留。请稍后刷新重试。点击关闭';
    notice.className = 'migration-notice';
    notice.onclick = () => notice.remove();
    document.body.append(notice);
  }
});
