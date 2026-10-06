import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default function AsciiHeart() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    renderer.setClearColor(0x000000);
    const scene = new THREE.Scene();
    const heart = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
    let mixer: THREE.AnimationMixer | undefined;
    let model: THREE.Group | undefined;
    let disposed = false;
    const releaseModel = (root: THREE.Object3D) => root.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(item => item.dispose());
        if (object instanceof THREE.SkinnedMesh) object.skeleton.dispose();
      }
    });
    new GLTFLoader().load(import.meta.env.BASE_URL + 'models/lullaby-heart-animation-copy.glb?v=97336cbc1eb9', gltf => {
      if (disposed) { releaseModel(gltf.scene); return; }
      model = gltf.scene;
      model.traverse(object => {
        if (object instanceof THREE.Mesh) {
          const old = Array.isArray(object.material) ? object.material : [object.material];
          old.forEach(item => item.dispose());
          object.material = material;
          object.frustumCulled = false;
        }
      });
      mixer = new THREE.AnimationMixer(model);
      for (const clip of gltf.animations) mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play();
      // Fit all heartbeat poses once, so the framing never pumps with the beat.
      const bounds = new THREE.Box3();
      const duration = Math.max(...gltf.animations.map(clip => clip.duration), 0);
      for (let sample = 0; sample <= 24; sample++) {
        mixer.setTime(duration * sample / 24);
        model.updateMatrixWorld(true);
        bounds.union(new THREE.Box3().setFromObject(model, true));
      }
      mixer.setTime(0);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const scale = (2.6 * (2 / 3) / .74) / size.y;
      model.position.sub(center);
      const fitted = new THREE.Group();
      fitted.scale.setScalar(scale);
      // Blender -X stays -X in glTF; rotate that face toward the +Z camera.
      fitted.rotation.y = Math.PI / 2;
      fitted.add(model);
      heart.add(fitted);
      canvas.dataset.loaded = 'true';
      canvas.dataset.animationDuration = String(duration);
    }, undefined, () => { canvas.setAttribute('aria-label', '心脏模型加载失败，请刷新重试'); });
    scene.add(heart);
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
      if (!width || !height) return;
      // Match the projection to the displayed canvas, not the ASCII grid.
      camera.left = -1.3 * width / height;
      camera.right = 1.3 * width / height;
      camera.updateProjectionMatrix();
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
    // Total travel is 60 degrees for pitch/yaw and 20 degrees for roll.
    const rotationTarget = new THREE.Vector3();
    const followPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      const x = THREE.MathUtils.clamp(event.clientX / window.innerWidth * 2 - 1, -1, 1);
      const y = THREE.MathUtils.clamp(event.clientY / window.innerHeight * 2 - 1, -1, 1);
      rotationTarget.set(y * Math.PI / 6, x * Math.PI / 6, -x * y * Math.PI / 18);
    };
    const resetPointer = () => rotationTarget.set(0, 0, 0);
    window.addEventListener('pointermove', followPointer, { passive: true });
    document.documentElement.addEventListener('pointerleave', resetPointer);
    window.addEventListener('blur', resetPointer);
    let frame = 0, previous = 0;
    const render = (time: number) => {
      frame = requestAnimationFrame(render);
      if (time - previous < 33 || document.hidden || !target) return;
      const delta = Math.min((time - previous) / 1000, .1);
      previous = time;
      if (!reduced.matches) mixer?.update(delta);
      const blend = reduced.matches ? 1 : 1 - Math.exp(-7 * delta);
      heart.rotation.x = THREE.MathUtils.lerp(heart.rotation.x, rotationTarget.x, blend);
      heart.rotation.y = THREE.MathUtils.lerp(heart.rotation.y, rotationTarget.y, blend);
      heart.rotation.z = THREE.MathUtils.lerp(heart.rotation.z, rotationTarget.z, blend);
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
      window.removeEventListener('pointermove', followPointer);
      document.documentElement.removeEventListener('pointerleave', resetPointer);
      window.removeEventListener('blur', resetPointer);
      disposed = true; mixer?.stopAllAction();
      if (model) { mixer?.uncacheRoot(model); releaseModel(model); }
      material.dispose(); renderer.dispose();
    };
  }, []);
  return <canvas ref={ref} className="ascii-heart" role="img" aria-label="随鼠标轻微转动、循环心跳的琥珀色三维 ASCII 心脏" />;
}
