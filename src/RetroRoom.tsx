import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer, useGLTF } from '@react-three/drei';
import { House, Monitor, PanelTop, Power, Sprout, Maximize2, Minimize2 } from 'lucide-react';
import * as THREE from 'three';
import { cameraPose, clampPan, ROOM_VIEWS, screenAction, type RoomView } from './roomNavigation';
import { drawRoomScreen } from './roomScreen';
import { navigateTerminal } from './terminalNavigation';
import './RetroRoom.css';

const MODEL = `${import.meta.env.BASE_URL}models/room/retro-room.glb?v=retro-material-1`;
const POSTER = `${import.meta.env.BASE_URL}models/room/material-preview.png`;
class RoomBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="room-error"><h1>房间暂时无法加载</h1><p>请刷新重试，或直接进入下面的空间。</p><nav><a href="/portfolio">作品</a><a href="/terminal">个人终端</a><a href="/productivity/">专注空间</a></nav><button onClick={() => location.reload()}>重新加载</button></div> : this.props.children; }
}
type CameraProps = { view: RoomView; pan: number; close: boolean; reduced: boolean };
function RoomCamera({ view, pan, close, reduced }: CameraProps) {
  const { camera, size } = useThree();
  const initialized = useRef(false);
  const target = useRef(new THREE.Vector3());
  const position = useRef(new THREE.Vector3());
  const aim = useRef(new THREE.Vector3());
  useFrame((_, dt) => {
    const pose = cameraPose(view, pan, close, size.width < 700);
    position.current.fromArray(pose.position); aim.current.fromArray(pose.target);
    const alpha = reduced || !initialized.current ? 1 : 1 - Math.exp(-dt * 5.5);
    camera.position.lerp(position.current, alpha); target.current.lerp(aim.current, alpha);
    camera.lookAt(target.current);
    if (camera instanceof THREE.PerspectiveCamera) { camera.fov = THREE.MathUtils.lerp(camera.fov, pose.fov, alpha); camera.updateProjectionMatrix(); }
    initialized.current = true;
  });
  return null;
}
function RoomModel({ powered, onAction, ready, dragged }: { powered: boolean; onAction: (action: string) => void; ready: () => void; dragged: React.RefObject<boolean> }) {
  const { scene } = useGLTF(MODEL);
  const invalidate = useThree(state => state.invalidate);
  const [canvas] = useState(() => { const c = document.createElement('canvas'); c.width = 1024; c.height = 768; return c; });
  const texture = useMemo(() => { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 4; return t; }, [canvas]);
  const model = useMemo(() => {
    const copy = scene.clone(true);
    copy.traverse(o => {
      if (!(o instanceof THREE.Mesh)) return;
      o.castShadow = true; o.receiveShadow = true;
      if (o.name.startsWith('CRT_Screen_Replaceable')) {
        o.material = new THREE.MeshPhysicalMaterial({ map: texture, emissiveMap: texture, emissive: '#ffffff', emissiveIntensity: 1.05, color: '#ffffff', roughness: .19, metalness: .04, clearcoat: .75, clearcoatRoughness: .14, side: THREE.DoubleSide });
        o.castShadow = false;
      }
    });
    return copy;
  }, [scene, texture]);
  useEffect(() => { ready(); }, [ready]);
  useEffect(() => {
    const start = performance.now();
    const update = () => { drawRoomScreen(canvas, powered, (performance.now() - start) / 1000); texture.needsUpdate = true; invalidate(); };
    update(); const id = window.setInterval(update, 180);
    return () => clearInterval(id);
  }, [canvas, powered, texture, invalidate]);
  useEffect(() => () => { texture.dispose(); model.traverse(o => { if (o instanceof THREE.Mesh && o.name.startsWith('CRT_Screen_Replaceable')) (o.material as THREE.Material).dispose(); }); }, [model, texture]);
  const click = (event: ThreeEvent<MouseEvent>) => {
    if (dragged.current) return;
    if (event.object.name.startsWith('CRT_PowerButton')) { event.stopPropagation(); onAction('power'); }
    if (event.object.name.startsWith('CRT_Screen_Replaceable')) {
      event.stopPropagation();
      if (!powered) { onAction('power'); return; }
      const action = event.uv ? screenAction(event.uv.x, event.uv.y) : null;
      if (action) onAction(action);
    }
  };
  return <primitive object={model} onClick={click} />;
}
function Lights() {
  return <>
    <ambientLight intensity={.38} color="#cbd2dc" />
    <hemisphereLight args={['#e3e0d8', '#524735', .65]} />
    <directionalLight position={[-1, 2.8, -4]} intensity={2.4} color="#ffe0ab" castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-3} shadow-camera-right={3} shadow-camera-top={3} shadow-camera-bottom={-3} shadow-normalBias={.018} shadow-bias={-.0001} />
    <pointLight position={[.1, 2.3, -.5]} intensity={2.5} decay={2} distance={6} color="#fff1d6" />
    <Environment resolution={128} frames={1} environmentIntensity={.35}>
      <Lightformer form="rect" position={[-1, 2, -2]} target={[1, 1, 0]} scale={[1.4, 2.6, 1]} intensity={3} color="#e3d2b3" />
      <Lightformer form="rect" position={[-2, 1.5, 1]} target={[1, 1, 0]} scale={[.3, 2, 1]} intensity={1} color="#8b9aa1" />
    </Environment>
  </>;
}
export default function RetroRoom() {
  const [view, setView] = useState<RoomView>('desk');
  const [pan, setPan] = useState(0);
  const [close, setClose] = useState(false);
  const [powered, setPowered] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [reduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const dragged = useRef(false);
  const drag = useRef<{ id: number; x: number; startPan: number } | null>(null);
  const select = (next: RoomView) => { setView(next); setPan(0); setClose(false); };
  const ready = useRef(() => setLoaded(true)).current;
  const action = (value: string) => {
    if (value === 'power') { setPowered(p => !p); return; }
    if (value === 'room') { select('window'); return; }
    navigateTerminal(value);
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const delta = e.key === 'ArrowLeft' ? -1 : 1; select(ROOM_VIEWS[(ROOM_VIEWS.indexOf(view) + delta + 3) % 3]); }
      if (e.key.toLowerCase() === 'a') setPan(p => clampPan(p - .18));
      if (e.key.toLowerCase() === 'd') setPan(p => clampPan(p + .18));
      if (e.key === 'Escape') setClose(false);
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [view]);
  return <main className="retro-room" data-room-view={view} data-room-pan={pan.toFixed(2)} data-room-powered={powered}>
    <img className="room-poster" src={POSTER} alt="复古电脑与房间" />
    <RoomBoundary>
      <div className="room-viewport"
        onPointerDown={e => { if (e.button !== 0 || !loaded) return; dragged.current = false; drag.current = { id: e.pointerId, x: e.clientX, startPan: pan }; }}
        onPointerMove={e => { const d = drag.current; if (!d || d.id !== e.pointerId) return; const dx = e.clientX - d.x; if (Math.abs(dx) > 8) { dragged.current = true; setPan(clampPan(d.startPan + dx / Math.max(220, e.currentTarget.clientWidth) * 2)); } }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onPointerLeave={() => { drag.current = null; }}>
        <Canvas shadows dpr={[1, 1.5]} camera={{ position: [.12, 1.34, -.12], near: .025, far: 25, fov: 52 }} gl={{ antialias: true, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }} fallback={<div className="room-error"><h1>浏览器不支持 3D</h1><a href="/terminal">打开个人终端</a></div>}>
          <color attach="background" args={['#a5a099']} />
          <RoomCamera view={view} pan={pan} close={close} reduced={reduced} />
          <Suspense fallback={null}><RoomModel powered={powered} onAction={action} ready={ready} dragged={dragged} /><Lights /></Suspense>
        </Canvas>
      </div>
    </RoomBoundary>
    {!loaded && <div className="room-loading" role="status"><span />正在进入房间…</div>}
    <header className="room-header"><a href="/" aria-label="返回主页"><House size={17} /><span>DUSTLAND</span></a><span className="room-header-label">A ROOM OF MY OWN</span><button onClick={() => setPowered(p => !p)} aria-label={powered ? '关闭电脑' : '开启电脑'} aria-pressed={powered}><Power size={18} /><span>{powered ? '关机' : '开机'}</span></button></header>
    <div className="room-controls">
      <p className="room-hint">拖动平移视角 · 点击屏幕图标</p>
      <nav aria-label="房间视角">
        <button aria-pressed={view === 'window'} onClick={() => select('window')}><PanelTop size={18} />窗边</button>
        <button aria-pressed={view === 'desk'} onClick={() => select('desk')}><Monitor size={18} />电脑</button>
        <button aria-pressed={view === 'bed'} onClick={() => select('bed')}><Sprout size={18} />床头</button>
        <span className="room-control-divider" />
        <button className="room-focus" aria-label={close ? '退回桌边' : '靠近屏幕'} aria-pressed={close} onClick={() => { setView('desk'); setPan(0); setClose(c => !c); }}>{close ? <Minimize2 size={18} /> : <Maximize2 size={18} />}<span>{close ? '退回桌边' : '靠近屏幕'}</span></button>
      </nav>
    </div>
    <span className="room-view-status" role="status">{view === 'desk' ? close ? '屏幕近景' : '桌边' : view === 'window' ? '窗边' : '床头'}</span>
  </main>;
}
useGLTF.preload(MODEL);
