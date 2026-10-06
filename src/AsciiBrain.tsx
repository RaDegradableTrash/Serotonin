import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Continuous folds stay attached to the surface as the brain turns.
function folds(x: number, y: number, z: number) {
  const a = Math.sin(17 * y + 3.4 * Math.sin(5 * z) + 2.1 * Math.sin(7 * x));
  const b = Math.sin(16 * z + 3 * Math.sin(6 * x) + 2 * Math.sin(4 * y));
  const groove = Math.exp(-a * a * 22) + .65 * Math.exp(-b * b * 28);
  return 1 - .075 * groove + .016 * Math.sin(27 * x + 13 * y + 9 * z);
}

function lobe(side: number) {
  const geometry = new THREE.SphereGeometry(1, 160, 112);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
    const r = folds(x * side, y, z);
    // Paired hemispheres with a visible longitudinal fissure and a fuller crown.
    position.setXYZ(i, side * .49 + x * .69 * r, .19 + y * .91 * r, z * 1.06 * r);
  }
  geometry.computeVertexNormals();
  return geometry;
}

export default function AsciiBrain() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setClearColor(0x000000);
    const scene = new THREE.Scene();
    const brain = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    const geometries: THREE.BufferGeometry[] = [];
    for (const side of [-1, 1]) {
      const geometry = lobe(side);
      geometries.push(geometry);
      brain.add(new THREE.Mesh(geometry, material));
    }
    const cerebellum = new THREE.SphereGeometry(1, 96, 64);
    const p = cerebellum.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const r = 1 - .045 * Math.pow(Math.cos(y * 48 + z * 3), 8);
      p.setXYZ(i, x * .61 * r, y * .35 * r - .63, z * .57 * r - .46);
    }
    cerebellum.computeVertexNormals();
    geometries.push(cerebellum);
    brain.add(new THREE.Mesh(cerebellum, material));
    const stem = new THREE.CapsuleGeometry(.14, .42, 8, 24);
    stem.translate(0, -.91, -.24);
    geometries.push(stem);
    brain.add(new THREE.Mesh(stem, material));
    scene.add(brain);
    scene.add(new THREE.AmbientLight(0xffffff, .32));
    const light = new THREE.DirectionalLight(0xffffff, 2.6);
    light.position.set(-3, 5, 5);
    scene.add(light);
    const rim = new THREE.DirectionalLight(0xffffff, .65);
    rim.position.set(4, 1, -2);
    scene.add(rim);
    const camera = new THREE.OrthographicCamera(-1.3, 1.3, 1.3, -1.3, .1, 20);
    camera.position.set(0, 0, 6);
    let columns = 0, rows = 0, pixels = new Uint8Array();
    let width = 0, height = 0;
    let target: THREE.WebGLRenderTarget | undefined;
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width; height = rect.height;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      columns = Math.max(60, Math.min(180, Math.round(width / 5.5)));
      rows = Math.max(40, Math.round(height / (width / columns * 1.18)));
      renderer.setSize(columns, rows, false);
      target?.dispose();
      target = new THREE.WebGLRenderTarget(columns, rows);
      pixels = new Uint8Array(columns * rows * 4);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    const ramp = ' .,:;=+irsxXA253hMHGB@';
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, previous = 0, angle = .45;
    const render = (time: number) => {
      frame = requestAnimationFrame(render);
      if (time - previous < 50 || document.hidden || !target) return;
      const delta = Math.min((time - previous) / 1000, .1);
      previous = time;
      if (!reduced.matches) angle += delta * .23;
      brain.rotation.set(.16, angle, -.035);
      renderer.setRenderTarget(target);
      renderer.render(scene, camera);
      renderer.readRenderTargetPixels(target, 0, 0, columns, rows, pixels);
      context.clearRect(0, 0, width, height);
      const cw = width / columns, ch = height / rows;
      context.font = `${ch * 1.22}px "Courier New", monospace`;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const value = pixels[((rows - row - 1) * columns + col) * 4] / 255;
          if (value < .025) continue;
          const level = Math.min(ramp.length - 1, Math.floor(Math.pow(value, .85) * (ramp.length - 1)));
          context.fillStyle = `rgb(${Math.round(150 + value * 105)},${Math.round(87 + value * 102)},${Math.round(24 + value * 47)})`;
          context.fillText(ramp[level], (col + .5) * cw, (row + .5) * ch, cw);
        }
      }
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); target?.dispose();
      geometries.forEach(geometry => geometry.dispose()); material.dispose(); renderer.dispose();
    };
  }, []);
  return <canvas ref={ref} className="ascii-brain" role="img" aria-label="缓慢旋转的琥珀色三维 ASCII 大脑" />;
}
