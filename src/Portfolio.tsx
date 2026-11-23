import { Component, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, Lightformer, OrbitControls, OrthographicCamera, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { navigateTerminal } from './terminalNavigation';
import './Portfolio.css';
import TargetCursor from './TargetCursor';

const tapes = [
  { id: 'clear', name: '透明介质', subtitle: 'CLEAR / ACRYLIC', color: '#c6dce0' },
  { id: 'smoke', name: '残留信号', subtitle: 'SMOKE / TRANSLUCENT', color: '#74888e' },
  { id: 'ivory', name: '空白记忆', subtitle: 'IVORY / ABS', color: '#ddd6b9' },
  { id: 'black', name: '隐秘频率', subtitle: 'CARBON / SLATE', color: '#8ba3c7' },
  { id: 'blue', name: '蓝色噪声', subtitle: 'MIDNIGHT / POLYMER', color: '#6989db' },
];

class ModelBoundary extends Component<{ children: ReactNode; onError?: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError?.(); }
  render() { return this.state.failed ? <Html center><span className="model-message">模型加载失败，请刷新重试</span></Html> : this.props.children; }
}

function Tape({ id, exploded, capture }: { id: string; exploded: boolean; capture?: (image: string) => void }) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/portfolio/${id}.glb?v=user-blue-1`);
  const root = useRef<THREE.Group>(null);
  const [copy] = useState(() => {
    const model = scene.clone(true);
    model.traverse(object => {
      if (!(object instanceof THREE.Mesh)) return;
      const prepare = (source: THREE.Material) => {
        const material = source.clone();
        if (material instanceof THREE.MeshPhysicalMaterial && /acrylic|polycarbonate/i.test(material.name)) {
          // Layered cassette shells need alpha as well as refraction so that
          // the reverse shell cannot occlude the internal opaque components.
          material.transparent = true;
          material.opacity = /smoked/i.test(material.name) ? 0.42 : 0.29;
          material.transmission = 0.24;
          material.depthWrite = false;
          material.side = THREE.FrontSide;
          material.envMapIntensity = 0.65;
          material.clearcoat = 0.25;
        }
        return material;
      };
      object.material = Array.isArray(object.material) ? object.material.map(prepare) : prepare(object.material);
    });
    return model;
  });
  const offsets = useRef(new Map<THREE.Object3D, THREE.Vector3>());
  useEffect(() => {
    copy.traverse(object => {
      if (/shell_front|label_front/i.test(object.name)) offsets.current.set(object, object.position.clone());
    });
  }, [copy]);
  useFrame((_, delta) => {
    for (const [object, origin] of offsets.current) {
      object.position.setY(THREE.MathUtils.damp(object.position.y, origin.y + (exploded ? 0.8 : 0), 6, delta));
      object.position.setZ(THREE.MathUtils.damp(object.position.z, origin.z - (exploded ? 8 : 0), 6, delta));
    }
  });
  return <group ref={root}><primitive object={copy} />{capture && <CaptureFrame onReady={capture} />}</group>;
}

function TapeView({ id, expanded = false, exploded = false, capture, onError }: { id: string; expanded?: boolean; exploded?: boolean; capture?: (image: string) => void; onError?: () => void }) {
  return <Canvas frameloop={expanded || capture ? 'always' : 'demand'} camera={{ position: [0, 1.5, 15], fov: expanded ? 37 : 34 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={0.7} />
    {!expanded && <OrthographicCamera makeDefault manual position={[0, 0, 20]} left={-5.15} right={5.15} top={3.604} bottom={-3.604} near={0.1} far={100} />}
    <FitCamera exploded={exploded} expanded={expanded} />
    <directionalLight position={[3, 6, 8]} intensity={3} />
    <directionalLight position={[-5, -2, 4]} intensity={1.2} color="#abc3d2" />
    <Environment resolution={128}>
      <Lightformer position={[0, 5, 5]} scale={[10, 2, 1]} intensity={3} />
      <Lightformer position={[-5, 0, 3]} rotation={[0, Math.PI / 3, 0]} scale={[2, 8, 1]} intensity={2} />
      <Lightformer position={[4, 2, 5]} rotation={[0, -Math.PI / 4, 0]} scale={[0.6, 8, 1]} intensity={5} />
    </Environment>
    <ModelBoundary onError={onError}><Suspense fallback={<Html center><span className="model-message">载入中</span></Html>}><group rotation={[0.62, -0.55, 0.16]}><Tape id={id} exploded={exploded} capture={capture} /></group></Suspense></ModelBoundary>
    {expanded && <OrbitControls target={exploded ? [0, 2, 0] : [0, 0, 0]} enablePan={false} minDistance={10} maxDistance={40} />}
  </Canvas>;
}

function FitCamera({ exploded, expanded }: { exploded: boolean; expanded: boolean }) {
  const { camera, size } = useThree();
  useEffect(() => {
    if (!expanded || !(camera instanceof THREE.PerspectiveCamera)) return;
    const distance = Math.max(exploded ? 24 : expanded ? 15 : 18, (expanded ? 5.9 : 4.1) / (Math.tan(camera.fov * Math.PI / 360) * size.width / size.height));
    camera.position.set(0, 1.5, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, exploded, expanded]);
  return null;
}

function CaptureFrame({ onReady }: { onReady: (image: string) => void }) {
  const frames = useRef(0);
  const done = useRef(false);
  useFrame(state => {
    state.gl.render(state.scene, state.camera);
    if (!done.current && ++frames.current >= 6) {
      done.current = true;
      onReady(state.gl.domElement.toDataURL('image/png'));
    }
  }, 1);
  return null;
}

const queueItems = Array.from({ length: 20 }, (_, slot) => slot % tapes.length);
const smooth = (value: number) => value * value * (3 - 2 * value);

export default function Portfolio() {
  const [selected, setSelected] = useState<number | null>(null);
  const [exploded, setExploded] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [failed, setFailed] = useState(false);
  const ready = tapes.every(tape => thumbnails[tape.id]);
  const stage = useRef<HTMLElement>(null);
  const slots = useRef<Array<HTMLDivElement | null>>([]);
  const cards = useRef<Array<HTMLButtonElement | null>>([]);
  const hoveredRef = useRef<number | null>(null);
  const stopRef = useRef(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const capture = useCallback((id: string, image: string) => {
    setThumbnails(previous => previous[id] ? previous : { ...previous, [id]: image });
  }, []);
  const onFailure = useCallback(() => setFailed(true), []);
  const activate = useCallback((slot: number | null) => {
    hoveredRef.current = slot;
    setHovered(slot);
  }, []);
  useEffect(() => { stopRef.current = selected !== null || paused; }, [selected, paused]);

  useEffect(() => {
    if (!ready || !stage.current) return;
    const element = stage.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = 0, phase = 0, intro = 0, speed = 0;
    let from = 0, destination = 1, changedAt = 0;
    let width = element.clientWidth, height = element.clientHeight;
    const resize = new ResizeObserver(() => { width = element.clientWidth; height = element.clientHeight; });
    resize.observe(element);
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (document.hidden) { last = 0; return; }
      const dt = last ? Math.min((time - last) / 1000, .05) : 0;
      last = time; intro += dt;
      const target = hoveredRef.current !== null || stopRef.current || reduced.matches ? 0 : 1;
      if (target !== destination) { from = speed; destination = target; changedAt = time; }
      if (!changedAt) changedAt = time;
      speed = from + (destination - from) * smooth(Math.min(1, (time - changedAt) / 800));
      phase += speed * 34 * dt;
      element.dataset.speed = speed.toFixed(3);
      const cardWidth = Math.max(200, Math.min(350, width * .26));
      const spacing = Math.max(cardWidth * .53, (width + cardWidth * 3) / queueItems.length);
      const length = spacing * queueItems.length;
      const slope = Math.min(.65, Math.max(.43, height / width * .78));
      slots.current.forEach((slot, index) => {
        if (!slot) return;
        const position = ((index * spacing - phase) % length + length) % length - length / 2;
        const x = width / 2 + position;
        const y = height / 2 - position * slope;
        // The lower-left records are in front; wrapping occurs beyond the viewport.
        const inView = x > -cardWidth && x < width + cardWidth;
        const entranceOrder = queueItems.length - 1 - index;
        const appearance = reduced.matches ? 1 : smooth(Math.min(1, Math.max(0, (intro - entranceOrder * .055) / .55)));
        slot.style.width = `${cardWidth}px`;
        slot.style.transform = `translate3d(${x}px,${y + (1 - appearance) * 35}px,0) translate(-50%,-50%)`;
        slot.style.zIndex = String(Math.round(length - position));
        slot.style.opacity = String(appearance);
        slot.style.visibility = inView ? 'visible' : 'hidden';
      });
    };
    frame = requestAnimationFrame(draw);
    const leave = () => activate(null);
    window.addEventListener('blur', leave);
    return () => { cancelAnimationFrame(frame); resize.disconnect(); window.removeEventListener('blur', leave); };
  }, [ready, activate]);

  useEffect(() => {
    if (selected === null) {
      returnFocus.current?.focus({ preventScroll: true });
      return;
    }
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSelected(null); }
      if (event.key === 'Tab') {
        const buttons = detailRef.current?.querySelectorAll<HTMLButtonElement>('button');
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  return <main className="portfolio-page">
    <header className="portfolio-header" inert={selected !== null}>
      <a href="/terminal" onClick={event => { event.preventDefault(); navigateTerminal('/terminal', true, '/portfolio'); }}>dustland<span> / RECORDS</span></a>
      <nav aria-label="作品集导航"><span aria-current="page">Collection</span><a href="/insight">Insight</a><a href="/terminal">Terminal</a></nav>
      <button className="queue-pause" onClick={() => setPaused(value => !value)} aria-pressed={paused} aria-label={paused ? '继续磁带滚动' : '暂停磁带滚动'}>{paused ? 'PLAY' : 'PAUSE'}</button>
    </header>
    {!ready && <div className="queue-loading" role="status">{failed ? '模型载入失败，请刷新重试' : '载入磁带'}</div>}
    <div className="queue-capture" aria-hidden="true">
      {tapes.map(tape => !thumbnails[tape.id] && <div key={tape.id}><TapeView id={tape.id} capture={image => capture(tape.id, image)} onError={onFailure} /></div>)}
    </div>
    <section ref={stage} className="cassette-stream" data-focusing={hovered !== null || undefined} aria-label="磁带收藏队列" inert={selected !== null}
      onPointerMove={event => {
        if (event.pointerType !== 'mouse') return;
        const card = (event.target as Element).closest<HTMLElement>('[data-queue-slot]');
        activate(card ? Number(card.dataset.queueSlot) : null);
      }} onPointerLeave={() => activate(null)}>
      {ready && queueItems.map((index, slot) => <div className="queue-slot" ref={element => { slots.current[slot] = element; }} key={slot}>
        <button ref={element => { cards.current[slot] = element; }} className="queue-tape cursor-target" data-queue-slot={slot} data-active={hovered === slot || undefined} data-cursor-label={tapes[index].subtitle}
          aria-label={`查看${tapes[index].name}三维模型`} onFocus={() => activate(slot)} onBlur={() => activate(null)}
          onClick={event => { returnFocus.current = event.currentTarget; setExploded(false); setSelected(index); activate(null); }}>
          <img src={thumbnails[tapes[index].id]} alt="" draggable={false} />
        </button>
      </div>)}
    </section>
    <div className="queue-meter" aria-hidden="true">{Array.from({length:40},(_,i)=><i key={i} className={hovered !== null || paused ? 'is-paused' : ''} />)}</div>
    {ready && selected === null && <TargetCursor container={stage} targetSelector=".queue-tape" cursorColor="#e4e9ed" cursorColorOnTarget="#b2d1f0" cornerSize={15} thickness={1.5} padding={6} hoverDuration={.25} parallaxOn={false} blendMode="normal" />}
    {selected !== null && <section ref={detailRef} className="tape-detail" role="dialog" aria-modal="true" aria-label={tapes[selected].name}>
      <button ref={closeRef} className="tape-close" onClick={() => { setSelected(null); }}>关闭 ×</button>
      <div className="tape-detail-render"><TapeView key={tapes[selected].id} id={tapes[selected].id} expanded exploded={exploded} /></div>
      <div className="tape-detail-footer"><div><h2>{tapes[selected].name}</h2><p>{tapes[selected].subtitle}</p></div><button onClick={() => setExploded(value => !value)} aria-pressed={exploded}>{exploded ? '合上外壳' : '查看内部结构'}</button></div>
    </section>}
  </main>;
}
