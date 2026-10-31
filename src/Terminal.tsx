import { useEffect, useRef } from 'react';
import './Terminal.css';
import { navigateTerminal } from './terminalNavigation';

type Wave = { x: number; y: number; age: number; speed: number; duration: number; exit?: boolean };

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};

type Tile = { x: number; y: number; scale: number; velocity: number; shiftX: number; shiftY: number; driftX: number; driftY: number; tone: string };

export default function Terminal({ reveal = false }: { reveal?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLAnchorElement>(null);
  const glassRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = canvas?.parentElement;
    const panel = panelRef.current;
    const ctx = canvas?.getContext('2d');
    const glass = glassRef.current;
    const glassCtx = glass?.getContext('2d');
    let glassInitialized = false;
    const sample = document.createElement('canvas');
    const sampleCtx = sample.getContext('2d', { willReadFrequently: true });
    const atlas = document.createElement('canvas');
    const atlasCtx = atlas.getContext('2d');
    const glyphs = ' .:-=+*#%@';
    let glyphWidth = 6, glyphHeight = 10, atlasWidth = 6, atlasHeight = 10;
    if (!canvas || !ctx || !stage || !panel) return;
    let navigating = false, departed = false;
    let revealing = reveal, revealAge = 0;
    let width = 0, height = 0, cell = 21, dpr = 1;
    let tiles: Tile[] = [];
    let frame = 0, previous = 0;
    const follower = { x: 0, y: 0, vx: 0, vy: 0 };
    let waves: Wave[] = [];
    const pointer = { x: 0, y: 0, active: false, down: false };
    const angle = -12 * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle), tilt = .93;
    const project = (x: number, y: number) => {
      const rx = x * cos - y * sin, ry = x * sin + y * cos;
      const depth = 1 - ry / (height * 1.1);
      return { x: width / 2 + rx / depth, y: height / 2 + ry * tilt / depth, depth };
    };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      cell = Math.max(28, Math.min(46, width / 30)) / 2;
      // Fixed screen-space text cells sample the complete projected image.
      glyphWidth = Math.max(6, width / 240);
      glyphHeight = glyphWidth * 1.6;
      sample.width = Math.max(1, Math.ceil(width / glyphWidth));
      sample.height = Math.max(1, Math.ceil(height / glyphHeight));
      atlasWidth = Math.ceil(glyphWidth * dpr);
      atlasHeight = Math.ceil(glyphHeight * dpr);
      atlas.width = atlasWidth * glyphs.length;
      atlas.height = atlasHeight;
      if (atlasCtx) {
        atlasCtx.font = 'bold ' + (glyphHeight * dpr) + 'px monospace';
        atlasCtx.textAlign = 'center'; atlasCtx.textBaseline = 'middle';
        for (let i = 1; i < glyphs.length; i++) {
          const light = i / (glyphs.length - 1);
          atlasCtx.fillStyle = 'rgb(' + Math.round(248 * light) + ',' + Math.round(47 + 201 * light) + ',' + Math.round(167 + 79 * light) + ')';
          atlasCtx.fillText(glyphs[i], (i + .5) * atlasWidth, atlasHeight * .52, atlasWidth);
        }
      }
      const reach = Math.hypot(width, height) * 2 + cell * 2;
      const focal = height * 1.1;
      stage.style.setProperty('--grid-plane', `matrix3d(${cos},${sin * tilt},0,${-sin / focal},${-sin},${cos * tilt},0,${-cos / focal},0,0,1,0,0,0,0,1)`);
      const count = Math.ceil(reach / cell);
      tiles = [];
      for (let row = -count; row <= count; row++) {
        for (let col = -count; col <= count; col++) {
          const p = project(col * cell, row * cell);
          if (p.depth <= .15) continue;
          const sx = p.x, sy = p.y;
          if (sx < -cell * 2 || sx > width + cell * 2 || sy < -cell * 2 || sy > height + cell * 2) continue;
          const tone = 246 + ((Math.imul(col + 101, 73) ^ Math.imul(row + 103, 37)) >>> 0) % 6;
          tiles.push({ x: col * cell, y: row * cell, scale: revealing ? 0 : 1, velocity: 0, shiftX: 0, shiftY: 0, driftX: 0, driftY: 0, tone: `rgb(${tone},${tone},${tone - 2})` });
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
      if (event.button !== 0 || navigating || revealing) return;
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
      if (navigating || revealing) return;
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
      tiles.forEach(tile => { tile.scale = 1; tile.velocity = 0; tile.shiftX = tile.shiftY = tile.driftX = tile.driftY = 0; });
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
      if (revealing) {
        revealAge += dt;
        if (revealAge >= (reduced.matches ? .01 : 1.6)) {
          revealing = false;
          delete stage.dataset.revealing;
        }
      }
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
        const p = project(tile.x, tile.y);
        const sx = p.x, sy = p.y;
        if (sx < -cell * 2 || sx > width + cell * 2 || sy < -cell * 2 || sy > height + cell * 2) continue;
        const distance = Math.hypot(sx - follower.x, sy - follower.y);
        const t = Math.max(0, 1 - distance / radius);
        const falloff = t * t * (3 - 2 * t);
        // Evaluate from resting centers so repulsion never feeds back or jitters.
        // The near field responds quickly; the fringe has a quiet, lingering drift.
        const repulsionFalloff = smooth(1 - distance / (radius * 1.8));
        const weight = pointer.active && !navigating && !revealing ? repulsionFalloff ** 1.5 : 0;
        const travel = Math.min(22, 12 / p.depth) * weight;
        const directionLength = Math.max(distance, 1);
        const targetX = (sx - follower.x) / directionLength * travel;
        const targetY = (sy - follower.y) / directionLength * travel;
        if (reduced.matches) {
          tile.shiftX = tile.shiftY = tile.driftX = tile.driftY = 0;
        } else {
          const omega = 5 + 19 * weight;
          const decay = Math.exp(-omega * dt);
          const offsetX = tile.shiftX - targetX, offsetY = tile.shiftY - targetY;
          const tempX = (tile.driftX + omega * offsetX) * dt;
          const tempY = (tile.driftY + omega * offsetY) * dt;
          tile.shiftX = targetX + (offsetX + tempX) * decay;
          tile.shiftY = targetY + (offsetY + tempY) * decay;
          tile.driftX = (tile.driftX - omega * tempX) * decay;
          tile.driftY = (tile.driftY - omega * tempY) * decay;
        }
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
        const hoverShrink = pointer.active && !revealing ? .78 * falloff : 0;
        const revealDistance = Math.hypot(sx - width / 2, sy - height / 2);
        const revealSpeed = Math.hypot(width / 2, height / 2) / 1.05;
        const revealScale = revealing && !reduced.matches
          ? smooth((revealAge - revealDistance / revealSpeed) / .32) : 1;
        const target = Math.min(revealScale, Math.max(0, 1 - Math.max(hoverShrink, waveShrink)));
        if (reduced.matches) { tile.scale = target; tile.velocity = 0; }
        else {
          // Click waves keep their original response; hover remains slower.
          const omega = wavePassing || revealing
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
        const p = project(tile.x, tile.y);
        const sx = p.x, sy = p.y;
        if (sx < -cell * 2 || sx > width + cell * 2 || sy < -cell * 2 || sy > height + cell * 2) continue;
        // Fully close the resting mask; no strokes or artificial grout lines.
        if (tile.scale < .04) continue;
        // Preserve continuous spring-driven scaling through the entire size range.
        const scale = Math.max(0, Math.min(1, tile.scale));
        const half = (cell + .65) * Math.min(1, scale) / 2;
        // Repulsion extends beyond the shrinking area and settles independently.
        const shiftX = tile.shiftX, shiftY = tile.shiftY;
        const shape = new Path2D();
        for (const [i, [dx, dy]] of [[-half,-half],[half,-half],[half,half],[-half,half]].entries()) {
          const corner = project(tile.x + dx, tile.y + dy);
          if (i === 0) shape.moveTo(corner.x + shiftX, corner.y + shiftY); else shape.lineTo(corner.x + shiftX, corner.y + shiftY);
        }
        shape.closePath();
        path.addPath(shape);
        visible.push({ tile, shape });
      }
      if (navigating && !departed && visible.length === 0) {
        departed = true;
        // Navigate only once the last tile has disappeared; never close the mask.
        navigateTerminal(panel.href);
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
      // Sample the actual canvas into a tiny texture. This remains diffuse even
      // when a browser cannot composite backdrop-filter through a 3D transform.
      if (glass && glassCtx) {
        const bounds = panel.getBoundingClientRect();
        const source = canvas.getBoundingClientRect();
        const margin = 70;
        const left = Math.max(0, bounds.left - source.left - margin);
        const top = Math.max(0, bounds.top - source.top - margin);
        const right = Math.min(width, bounds.right - source.left + margin);
        const bottom = Math.min(height, bounds.bottom - source.top + margin);
        if (right > left && bottom > top) {
          // Frame-rate independent color persistence: soften both arrival and fade.
          glassCtx.globalAlpha = !glassInitialized || reduced.matches ? 1 : -Math.expm1(-dt / .65);
          glassCtx.drawImage(canvas, left * dpr, top * dpr,
            (right - left) * dpr, (bottom - top) * dpr, 0, 0, glass.width, glass.height);
          glassCtx.globalAlpha = 1;
          glassInitialized = true;
        }
      }
      // Convert the finished live frame, rather than decorating individual tiles.
      // Read only the small sampling texture; cached glyphs avoid per-frame text layout.
      if (sampleCtx && atlasCtx) {
        sampleCtx.drawImage(canvas, 0, 0, sample.width, sample.height);
        const pixels = sampleCtx.getImageData(0, 0, sample.width, sample.height).data;
        ctx.fillStyle = '#002fa7';
        ctx.fillRect(0, 0, width, height);
        for (let row = 0; row < sample.height; row++) {
          for (let col = 0; col < sample.width; col++) {
            const offset = (row * sample.width + col) * 4;
            const luminance = pixels[offset] * .2126 + pixels[offset + 1] * .7152 + pixels[offset + 2] * .0722;
            // The blue floor maps to empty space, so route transitions remain solid blue.
            const light = Math.max(0, Math.min(1, (luminance - 46) / 202));
            const glyph = Math.round(light * (glyphs.length - 1));
            if (!glyph) continue;
            ctx.drawImage(atlas, glyph * atlasWidth, 0, atlasWidth, atlasHeight,
              col * glyphWidth, row * glyphHeight, glyphWidth, glyphHeight);
          }
        }
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
  }, [reveal]);
  return <main className="tile-stage" data-revealing={reveal || undefined}><canvas ref={canvasRef} className="tile-field" aria-label="实时蓝白背景的 ASCII 图像：移动鼠标展开底板，点击播放波浪" />
    <a ref={panelRef} className="glass-panel" href="/brain_in_vat">
      <canvas ref={glassRef} className="glass-panel__diffusion" width={6} height={12} aria-hidden="true" />
      <span className="glass-panel__eyebrow">EXPLORE <span aria-hidden="true">↗</span></span>
      <span className="glass-panel__title">缸中之脑</span>
      <span className="glass-panel__description">BRAIN IN A VAT</span>
      <span className="glass-panel__action">进入 <span aria-hidden="true">→</span></span>
    </a>
  </main>;
}
