import { SCREEN_ITEMS } from './roomNavigation';

export function drawRoomScreen(canvas: HTMLCanvasElement, on: boolean, elapsed: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const w = 1024, h = 768;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = on ? '#080f12' : '#030709'; ctx.fillRect(0, 0, w, h);
  if (!on) return;
  const amber = '#e9ae4e';
  ctx.strokeStyle = amber; ctx.fillStyle = amber; ctx.lineWidth = 4;
  ctx.shadowColor = '#e8a439'; ctx.shadowBlur = 9;
  ctx.font = 'bold 22px "Courier New", monospace'; ctx.textBaseline = 'top';
  SCREEN_ITEMS.forEach((item, i) => {
    const x = 70 + (i % 2) * 180, y = 70 + Math.floor(i / 2) * 150;
    ctx.beginPath();
    if (item.kind === 'folder') {
      ctx.moveTo(x, y + 20); ctx.lineTo(x, y + 8); ctx.lineTo(x + 26, y + 8); ctx.lineTo(x + 35, y + 18); ctx.lineTo(x + 65, y + 18); ctx.lineTo(x + 65, y + 63); ctx.lineTo(x, y + 63); ctx.closePath();
      ctx.moveTo(x + 4, y + 26); ctx.lineTo(x + 60, y + 26);
    } else if (item.kind === 'power') {
      ctx.moveTo(x + 32, y + 5); ctx.lineTo(x + 32, y + 34);
      ctx.moveTo(x + 18, y + 18); ctx.lineTo(x + 6, y + 29); ctx.lineTo(x + 6, y + 53); ctx.lineTo(x + 20, y + 65); ctx.lineTo(x + 44, y + 65); ctx.lineTo(x + 58, y + 53); ctx.lineTo(x + 58, y + 29); ctx.lineTo(x + 46, y + 18);
    } else {
      ctx.rect(x + 7, y + 6, 50, 60);
      if (item.kind === 'window') { ctx.moveTo(x + 32, y + 6); ctx.lineTo(x + 32, y + 66); ctx.moveTo(x + 7, y + 36); ctx.lineTo(x + 57, y + 36); }
      else for (let n = 0; n < 4; n++) { ctx.moveTo(x + 17, y + 22 + n * 10); ctx.lineTo(x + 47, y + 22 + n * 10); }
    }
    ctx.stroke(); ctx.fillText(item.name, x - (item.name.length > 5 ? 13 : 0), y + 82);
  });
  ctx.font = '24px "Courier New", monospace';
  const intro = 'A personal space\nfor things I make.';
  const typed = intro.slice(0, Math.floor(elapsed * 21));
  typed.split('\n').forEach((line, i) => ctx.fillText(line, 585, 421 + i * 32));
  if (Math.floor(elapsed * 2) % 2 === 0) ctx.fillRect(typed.length < 17 ? 585 + typed.length * 14 : 585 + Math.max(0, typed.length - 17) * 14, typed.length < 17 ? 423 : 455, 12, 23);
  ctx.font = 'bold 91px "Courier New", monospace'; ctx.fillText('DUSTLAND', 510, 544);
  ctx.font = '20px "Courier New", monospace'; ctx.fillText('OPEN AN ICON', 60, 662);
  ctx.shadowBlur = 3; ctx.fillRect(40, 704, 944, 1);
  ctx.font = '21px "Courier New", monospace'; ctx.fillText('DUST OS / 01', 60, 725);
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }); ctx.fillText(time, 870, 725);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,.22)'; for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);
  const vignette = ctx.createRadialGradient(512, 384, 220, 512, 384, 640);
  vignette.addColorStop(0, 'transparent'); vignette.addColorStop(1, 'rgba(0,0,0,.65)');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
}
