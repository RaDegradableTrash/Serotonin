import { useEffect, useRef } from 'react';
import './Terminal.css';

type Wave = { x: number; y: number; age: number; speed: number; duration: number; exit?: boolean };

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

type Tile = { x: number; y: number; scale: number; velocity: number; tone: string };

export default function Terminal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = canvas?.parentElement;
    const panel = panelRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !stage || !panel) return;
    let navigating = false, departed = false;
    let width = 0, height = 0, cell = 21, dpr = 1;
    let tiles: Tile[] = [];
    let frame = 0, previous = 0;
    const follower = { x: 0, y: 0, vx: 0, vy: 0 };
    let waves: Wave[] = [];
    const pointer = { x: 0, y: 0, active: false, down: false };
    const angle = -12 * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle), tilt = .93;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      cell = Math.max(28, Math.min(46, width / 30)) / 2;
      const reach = Math.hypot(width, height) / 2 / tilt + cell * 2;
      const count = Math.ceil(reach / cell);
      tiles = [];
      for (let row = -count; row <= count; row++) {
        for (let col = -count; col <= count; col++) {
          const sx = width / 2 + col * cell * cos - row * cell * sin;
          const sy = height / 2 + (col * cell * sin + row * cell * cos) * tilt;
          if (sx < -cell * 2 || sx > width + cell * 2 || sy < -cell * 2 || sy > height + cell * 2) continue;
          const tone = 246 + ((Math.imul(col + 101, 73) ^ Math.imul(row + 103, 37)) >>> 0) % 6;
          tiles.push({ x: col * cell, y: row * cell, scale: 1, velocity: 0, tone: `rgb(${tone},${tone},${tone - 2})` });
        }
      }
    };
    const locate = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      if (!pointer.active) {
        follower.x = pointer.x; follower.y = pointer.y;
        follower.vx = 0; follower.vy = 0;
      }
      pointer.active = true;
    };
    const down = (event: PointerEvent) => {
      if (event.button !== 0 || navigating) return;
      locate(event); pointer.down = true;
      const reach = Math.hypot(Math.max(pointer.x, width - pointer.x), Math.max(pointer.y, height - pointer.y)) + cell;
      const speed = reach / 1.05;
      waves.push({ x: pointer.x, y: pointer.y, age: 0, speed, duration: reach / speed + .95 });
      canvas.setPointerCapture(event.pointerId);
    };
    const up = (event: PointerEvent) => {
      pointer.down = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (event.pointerType === 'touch') pointer.active = false;
    };
    const leave = () => { if (!pointer.down) pointer.active = false; };
    const reset = () => { pointer.down = false; pointer.active = false; };
    const navigate = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      if (navigating) return;
      navigating = true;
      const rect = canvas.getBoundingClientRect();
      const panelRect = panel.getBoundingClientRect();
      const x = event.detail === 0 ? panelRect.left + panelRect.width / 2 - rect.left : event.clientX - rect.left;
      const y = event.detail === 0 ? panelRect.top + panelRect.height / 2 - rect.top : event.clientY - rect.top;
      const reach = Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + cell * 2;
      waves.push({ x, y, age: 0, speed: reach / (reduced.matches ? .15 : 1.05), duration: Infinity, exit: true });
      stage.dataset.navigating = 'true';
      panel.setAttribute('aria-busy', 'true');
    };
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      navigating = false; departed = false; waves = []; reset();
      tiles.forEach(tile => { tile.scale = 1; tile.velocity = 0; });
      delete stage.dataset.navigating;
      panel.removeAttribute('aria-busy');
    };
    panel.addEventListener('click', navigate);
    window.addEventListener('pageshow', restore);
    stage.addEventListener('pointermove', locate);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    stage.addEventListener('pointerleave', leave);
    canvas.addEventListener('pointercancel', reset);
    window.addEventListener('blur', reset);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      const dt = Math.min((time - (previous || time)) / 1000, 1 / 30);
      previous = time;
      if (document.hidden) return;
      for (const wave of waves) wave.age += dt;
      waves = waves.filter(wave => wave.age < wave.duration);
      // A damped follower carries momentum through direction changes.
      if (reduced.matches) { follower.x = pointer.x; follower.y = pointer.y; }
      else {
        const steps = Math.max(1, Math.ceil(dt / .002));
        const step = dt / steps;
        for (let i = 0; i < steps; i++) {
          follower.vx += ((pointer.x - follower.x) * 3025 - follower.vx * 85) * step;
          follower.vy += ((pointer.y - follower.y) * 3025 - follower.vy * 85) * step;
          follower.x += follower.vx * step; follower.y += follower.vy * step;
        }
      }
      const radius = Math.min(width, height) * .2625;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#002FA7';
      ctx.fillRect(0, 0, width, height);
      const visible: { tile: Tile; shape: Path2D }[] = [];
      const path = new Path2D();
      for (const tile of tiles) {
        const sx = width / 2 + tile.x * cos - tile.y * sin;
        const sy = height / 2 + (tile.x * sin + tile.y * cos) * tilt;
        if (sx < -cell || sx > width + cell || sy < -cell || sy > height + cell) continue;
        const distance = Math.hypot(sx - follower.x, sy - follower.y);
        const t = Math.max(0, 1 - distance / radius);
        const falloff = t * t * (3 - 2 * t);
        // Each click has its own outward opening and outward recovery front.
        // Maximum influence composes waves without one click resetting another.
        let waveShrink = 0;
        let wavePassing = false;
        for (const wave of waves) {
          const localTime = wave.age - Math.hypot(sx - wave.x, sy - wave.y) / wave.speed;
          if (localTime >= 0 && (wave.exit || localTime < .95)) wavePassing = true;
          const opening = smooth(localTime / .12);
          const recovery = wave.exit ? 0 : smooth((localTime - .38) / .42);
          waveShrink = Math.max(waveShrink, opening * (1 - recovery));
        }
        const hoverShrink = pointer.active ? .78 * falloff : 0;
        const target = Math.max(0, 1 - Math.max(hoverShrink, waveShrink));
        if (reduced.matches) { tile.scale = target; tile.velocity = 0; }
        else {
          // Click waves keep their original response; hover remains slower.
          const omega = wavePassing
            ? (target < tile.scale ? 115 : 50)
            : (target < tile.scale ? 16 : 9);
          const offset = tile.scale - target;
          const temp = (tile.velocity + omega * offset) * dt;
          const decay = Math.exp(-omega * dt);
          tile.scale = target + (offset + temp) * decay;
          tile.velocity = (tile.velocity - omega * temp) * decay;
        }
      }
      for (const tile of tiles) {
        const sx = width / 2 + tile.x * cos - tile.y * sin;
        const sy = height / 2 + (tile.x * sin + tile.y * cos) * tilt;
        if (sx < -cell || sx > width + cell || sy < -cell || sy > height + cell) continue;
        // Fully close the resting mask; no strokes or artificial grout lines.
        if (tile.scale < .04) continue;
        // Preserve continuous spring-driven scaling through the entire size range.
        const scale = Math.max(0, Math.min(1, tile.scale));
        const half = (cell + .65) * Math.min(1, scale) / 2;
        const local = new Path2D();
        local.rect(-half, -half, half * 2, half * 2);
        const shape = new Path2D();
        shape.addPath(local, new DOMMatrix([cos, sin * tilt, -sin, cos * tilt, sx, sy]));
        path.addPath(shape);
        visible.push({ tile, shape });
      }
      if (navigating && !departed && visible.length === 0) {
        departed = true;
        // Navigate only once the last tile has disappeared; never close the mask.
        window.location.assign(panel.href);
      }
      // All tiles cast one coherent shadow, at 60 degrees in screen space.
      ctx.save();
      ctx.shadowColor = 'rgba(0, 12, 55, .48)';
      ctx.shadowOffsetX = Math.cos(Math.PI / 3) * 18 * dpr;
      ctx.shadowOffsetY = Math.sin(Math.PI / 3) * 18 * dpr;
      ctx.shadowBlur = 5 * dpr;
      ctx.fillStyle = '#f8f8f6';
      ctx.fill(path);
      ctx.restore();
      for (const { tile, shape } of visible) {
        ctx.fillStyle = tile.tone; ctx.fill(shape);
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      stage.removeEventListener('pointermove', locate);
      panel.removeEventListener('click', navigate);
      window.removeEventListener('pageshow', restore);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
      stage.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('pointercancel', reset);
      window.removeEventListener('blur', reset);
    };
  }, []);
  return <main className="tile-stage"><canvas ref={canvasRef} className="tile-field" aria-label="倾斜的白色方格蒙版：移动鼠标展开蓝色底板，按下进一步收缩" />
    <a ref={panelRef} className="glass-panel" href="/productivity/">
      <span className="glass-panel__eyebrow">PERSONAL SPACE <span aria-hidden="true">↗</span></span>
      <span className="glass-panel__title">效率空间</span>
      <span className="glass-panel__description">日历 · 待办 · 音乐</span>
      <span className="glass-panel__action">进入空间 <span aria-hidden="true">→</span></span>
    </a>
  </main>;
}
