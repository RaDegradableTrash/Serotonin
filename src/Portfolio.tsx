import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, Lightformer, OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { navigateTerminal } from './terminalNavigation';
import './Portfolio.css';

const tapes = [
  { id: 'clear', name: '透明介质', subtitle: 'CLEAR / ACRYLIC', color: '#c6dce0' },
  { id: 'smoke', name: '残留信号', subtitle: 'SMOKE / TRANSLUCENT', color: '#74888e' },
  { id: 'ivory', name: '空白记忆', subtitle: 'IVORY / ABS', color: '#ddd6b9' },
  { id: 'black', name: '隐秘频率', subtitle: 'CARBON / GOLD', color: '#b8a16d' },
  { id: 'red', name: '红色噪声', subtitle: 'VERMILION / POLYMER', color: '#de553a' },
];

class ModelBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Html center><span className="model-message">模型加载失败，请刷新重试</span></Html> : this.props.children; }
}

function Tape({ id, exploded }: { id: string; exploded: boolean }) {
  const { scene } = useGLTF(`${import.meta.env.BASE_URL}models/portfolio/${id}.glb`);
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
          material.opacity = /smoked/i.test(material.name) ? 0.32 : 0.19;
          material.transmission = 0.28;
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
  return <group ref={root}><primitive object={copy} /></group>;
}

function TapeView({ id, expanded = false, exploded = false }: { id: string; expanded?: boolean; exploded?: boolean }) {
  return <Canvas frameloop={expanded ? 'always' : 'demand'} camera={{ position: [0, 1.5, 15], fov: expanded ? 37 : 34 }} dpr={[1, 1.5]} gl={{ alpha: true, antialias: true }}>
    <ambientLight intensity={0.7} />
    <FitCamera exploded={exploded} expanded={expanded} />
    <directionalLight position={[3, 6, 8]} intensity={3} />
    <directionalLight position={[-5, -2, 4]} intensity={1.2} color="#abc3d2" />
    <Environment resolution={128}>
      <Lightformer position={[0, 5, 5]} scale={[10, 2, 1]} intensity={3} />
      <Lightformer position={[-5, 0, 3]} rotation={[0, Math.PI / 3, 0]} scale={[2, 8, 1]} intensity={2} />
      <Lightformer position={[4, 2, 5]} rotation={[0, -Math.PI / 4, 0]} scale={[0.6, 8, 1]} intensity={5} />
    </Environment>
    <ModelBoundary><Suspense fallback={<Html center><span className="model-message">载入中</span></Html>}><group rotation={[0.25, -0.32, expanded ? 0 : -0.07]}><Tape id={id} exploded={exploded} /></group></Suspense></ModelBoundary>
    {expanded && <OrbitControls target={exploded ? [0, 2, 0] : [0, 0, 0]} enablePan={false} minDistance={10} maxDistance={40} />}
  </Canvas>;
}

function FitCamera({ exploded, expanded }: { exploded: boolean; expanded: boolean }) {
  const { camera, size } = useThree();
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const distance = Math.max(exploded ? 24 : expanded ? 15 : 14, (expanded ? 5.9 : 6.1) / (Math.tan(camera.fov * Math.PI / 360) * size.width / size.height));
    camera.position.set(0, 1.5, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, exploded, expanded]);
  return null;
}

export default function Portfolio() {
  const [selected, setSelected] = useState<number | null>(null);
  const [exploded, setExploded] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const cards = useRef<Array<HTMLButtonElement | null>>([]);
  useEffect(() => {
    if (selected === null) return;
    closeRef.current?.focus();
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSelected(null); cards.current[selected]?.focus(); }
      if (event.key === 'Tab') {
        const buttons = detailRef.current?.querySelectorAll<HTMLButtonElement>('button');
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = oldOverflow; };
  }, [selected]);
  return <main className="portfolio-page">
    <header className="portfolio-header" inert={selected !== null}>
      <a href="/terminal" onClick={event => { event.preventDefault(); navigateTerminal('/terminal', true, '/portfolio'); }}>dustland<span> / RECORDS</span></a>
      <nav aria-label="作品集导航"><span aria-current="page">Collection</span><a href="/insight">Insight</a><a href="/terminal">Terminal</a></nav>
      <span className="portfolio-header-note">PERSONAL ARCHIVE</span>
    </header>
    <section className="portfolio-grid" aria-label="磁带收藏" inert={selected !== null}>
      {tapes.map((tape, index) => <button ref={element => { cards.current[index] = element; }} key={tape.id} className={`tape-card tape-card--${index}`} onClick={() => { setExploded(false); setSelected(index); }} aria-label={`查看${tape.name}三维模型`}>
        <div className="tape-card-render"><TapeView id={tape.id} /></div>
        <div className="tape-caption"><h2>{tape.name}</h2><span style={{ color: tape.color }}>{tape.subtitle}</span></div>
      </button>)}
      <div className="archive-empty archive-empty--a" aria-hidden="true" /><div className="archive-empty archive-empty--b" aria-hidden="true" /><div className="archive-empty archive-empty--c" aria-hidden="true" />
    </section>
    {selected !== null && <section ref={detailRef} className="tape-detail" role="dialog" aria-modal="true" aria-label={tapes[selected].name}>
      <button ref={closeRef} className="tape-close" onClick={() => { setSelected(null); cards.current[selected]?.focus(); }}>关闭 ×</button>
      <div className="tape-detail-render"><TapeView key={tapes[selected].id} id={tapes[selected].id} expanded exploded={exploded} /></div>
      <div className="tape-detail-footer"><div><h2>{tapes[selected].name}</h2><p>{tapes[selected].subtitle}</p></div><button onClick={() => setExploded(value => !value)} aria-pressed={exploded}>{exploded ? '合上外壳' : '查看内部结构'}</button></div>
    </section>}
  </main>;
}
