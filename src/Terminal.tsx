import { useEffect, useRef } from 'react';
import './Terminal.css';

type Tile = { x: number; y: number; scale: number; velocity: number; tone: string };

export default function Terminal() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let width = 0, height = 0, cell = 42, dpr = 1;
    let tiles: Tile[] = [];
    let frame = 0, previous = 0;
    const follower = { x: 0, y: 0, vx: 0, vy: 0 };
    const impulse = { x: 0, y: 0, age: 100 };
    const pointer = { x: 0, y: 0, active: false, down: false };
    const angle = -12 * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle), tilt = .93;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      cell = Math.max(28, Math.min(46, width / 30));
      const reach = Math.hypot(width, height) / 2 / tilt + cell * 2;
      const count = Math.ceil(reach / cell);
      tiles = [];
      for (let row = -count; row <= count; row++) {
        for (let col = -count; col <= count; col++) {
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
      if (event.button !== 0) return;
      locate(event); pointer.down = true;
      impulse.x = pointer.x; impulse.y = pointer.y; impulse.age = 0;
      canvas.setPointerCapture(event.pointerId);
    };
    const up = (event: PointerEvent) => {
      pointer.down = false;
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      if (event.pointerType === 'touch') pointer.active = false;
    };
    const leave = () => { if (!pointer.down) pointer.active = false; };
    const reset = () => { pointer.down = false; pointer.active = false; impulse.age = 100; };
    canvas.addEventListener('pointermove', locate);
    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointerleave', leave);
    canvas.addEventListener('pointercancel', reset);
    window.addEventListener('blur', reset);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas); resize();
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      const dt = Math.min((time - (previous || time)) / 1000, 1 / 30);
      previous = time;
      if (document.hidden) return;
      impulse.age += dt;
      // A damped follower carries momentum through direction changes.
      if (reduced.matches) { follower.x = pointer.x; follower.y = pointer.y; }
      else {
        const steps = Math.max(1, Math.ceil(dt / .008));
        const step = dt / steps;
        for (let i = 0; i < steps; i++) {
          follower.vx += ((pointer.x - follower.x) * 121 - follower.vx * 17) * step;
          follower.vy += ((pointer.y - follower.y) * 121 - follower.vy * 17) * step;
          follower.x += follower.vx * step; follower.y += follower.vy * step;
        }
      }
      const pressure = pointer.down ? 1 : Math.exp(-Math.max(0, impulse.age - .32) * 4.5);
      const radius = Math.min(width, height) * .21;
      const clickRadius = radius * (1 + Math.min(impulse.age / .35, 1));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#002FA7';
      ctx.fillRect(0, 0, width, height);
      const visible: { tile: Tile; points: number[] }[] = [];
      const path = new Path2D();
      for (const tile of tiles) {
        const sx = width / 2 + tile.x * cos - tile.y * sin;
        const sy = height / 2 + (tile.x * sin + tile.y * cos) * tilt;
        if (sx < -cell || sx > width + cell || sy < -cell || sy > height + cell) continue;
        const distance = Math.hypot(sx - follower.x, sy - follower.y);
        const t = Math.max(0, 1 - distance / radius);
        const falloff = t * t * (3 - 2 * t);
        const clickDistance = Math.hypot(sx - impulse.x, sy - impulse.y);
        const ct = Math.max(0, 1 - clickDistance / clickRadius);
        const clickFalloff = ct * ct * (3 - 2 * ct);
        const hoverShrink = pointer.active ? .78 * falloff : 0;
        const target = Math.max(0, 1 - Math.max(hoverShrink, 1.9 * pressure * clickFalloff));
        if (reduced.matches) { tile.scale = target; tile.velocity = 0; }
        else {
          // Critically damped spring: quick opening, softer recovery, no bounce.
          const omega = target < tile.scale ? 23 : 10;
          const offset = tile.scale - target;
          const temp = (tile.velocity + omega * offset) * dt;
          const decay = Math.exp(-omega * dt);
          tile.scale = target + (offset + temp) * decay;
          tile.velocity = (tile.velocity - omega * temp) * decay;
        }
        // Fully close the resting mask; no strokes or artificial grout lines.
        if (tile.scale < .04) continue;
        const half = (cell + .45) * Math.max(0, Math.min(1, tile.scale)) / 2;
        const points: number[] = [];
        for (const [x, y] of [[-half, -half], [half, -half], [half, half], [-half, half]]) {
          points.push(sx + x * cos - y * sin, sy + (x * sin + y * cos) * tilt);
        }
        path.moveTo(points[0], points[1]);
        for (let i = 2; i < 8; i += 2) path.lineTo(points[i], points[i + 1]);
        path.closePath();
        visible.push({ tile, points });
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
      for (const { tile, points } of visible) {
        ctx.beginPath(); ctx.moveTo(points[0], points[1]);
        for (let i = 2; i < 8; i += 2) ctx.lineTo(points[i], points[i + 1]);
        ctx.closePath(); ctx.fillStyle = tile.tone; ctx.fill();
      }
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      canvas.removeEventListener('pointermove', locate);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('pointercancel', reset);
      window.removeEventListener('blur', reset);
    };
  }, []);
  return <main className="tile-stage"><canvas ref={canvasRef} className="tile-field" aria-label="倾斜的白色方格蒙版：移动鼠标展开蓝色底板，按下进一步收缩" /></main>;
}
