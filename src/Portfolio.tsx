import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Html, Lightformer, OrbitControls, OrthographicCamera, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { navigateTerminal } from './terminalNavigation';
import './Portfolio.css';


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


// The same circular shelf used by productivity/MenuCards: x = -R + R cos(phi),
// z = -R sin(phi). Selection pulls a physical object out along the local x axis.
function ShelfTape({ slot, active, onSelect, onOpen }: { slot: number; active: number; onSelect: (slot: number) => void; onOpen: () => void }) {
  const group = useRef<THREE.Group>(null);
  const phi = (slot - 7) * .12;
  const x = -8.5 + 8.5 * Math.cos(phi);
  const z = -8.5 * Math.sin(phi);
  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, x + (active === slot ? 3.1 : 0), 7, delta);
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, phi + (active === slot ? .35 : 0), 7, delta);
  });
  return <group ref={group} position={[x,0,z]} rotation={[0,phi,0]} scale={.24}
    onPointerOver={event=>{event.stopPropagation();onSelect(slot);}}
    onClick={event=>{event.stopPropagation(); if(active===slot) onOpen(); else onSelect(slot);}}>
    <Tape id={tapes[slot % 5].id} exploded={false}/>
  </group>;
}
function ShelfCamera() {
  const {camera,size}=useThree();
  useEffect(()=>{
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect=size.width/size.height;
    camera.fov=2*Math.atan(Math.tan(Math.PI/10)*Math.max(1,1.35/aspect))*180/Math.PI;
    camera.position.set(.8,3.2,10.8);camera.lookAt(-1,-.3,0);camera.updateProjectionMatrix();
  },[camera,size]);
  return null;
}
export default function Portfolio() {
  const [active,setActive]=useState(7);
  const [selected,setSelected]=useState<number|null>(null);
  const [exploded,setExploded]=useState(false);
  const closeRef=useRef<HTMLButtonElement>(null);
  const openRef=useRef<HTMLButtonElement>(null);
  const detailRef=useRef<HTMLElement>(null);
  const opened=useRef(false);
  useEffect(()=>{
    if(selected===null){if(opened.current)openRef.current?.focus();return;}
    opened.current=true;closeRef.current?.focus();
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape')setSelected(null);
      if(event.key==='Tab'){
        const buttons=detailRef.current?.querySelectorAll('button');if(!buttons?.length)return;
        const first=buttons[0],last=buttons[buttons.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  },[selected]);
  const open=()=>{setExploded(false);setSelected(active%5);};
  return <main className="portfolio-page">
    <header className="portfolio-header" inert={selected!==null}>
      <a href="/terminal" onClick={event=>{event.preventDefault();navigateTerminal('/terminal',true,'/portfolio');}}>dustland<span> / RECORDS</span></a>
      <nav aria-label="作品集导航"><span aria-current="page">Collection</span><a href="/insight">Insight</a><a href="/terminal">Terminal</a></nav>
    </header>
    <section className="cassette-shelf" aria-label="环形磁带收藏" inert={selected!==null}>
      <Canvas dpr={[1,1.5]} camera={{position:[.8,3.2,10.8],fov:36}} gl={{alpha:true,antialias:true}}>
        <ShelfCamera/><ambientLight intensity={.8}/><directionalLight position={[3,6,8]} intensity={3}/><directionalLight position={[-5,2,4]} intensity={1.5} color="#abc3d2"/>
        <Environment resolution={128}><Lightformer position={[0,5,5]} scale={[10,2,1]} intensity={3}/><Lightformer position={[-5,0,3]} rotation={[0,Math.PI/3,0]} scale={[2,8,1]} intensity={2}/></Environment>
        <ModelBoundary><Suspense fallback={<Html center><span className="model-message">载入磁带</span></Html>}>
          <group position={[-3.2,-.3,0]} rotation={[0,.42,-.03]}>
            {Array.from({length:15},(_,slot)=><ShelfTape key={slot} slot={slot} active={active} onSelect={setActive} onOpen={open}/>)}
          </group>
        </Suspense></ModelBoundary>
      </Canvas>
    </section>
    <div className="shelf-controls" inert={selected!==null}>
      <div className="shelf-index" aria-label="选择磁带">{tapes.map((tape,index)=><button key={tape.id} aria-label={tape.name} aria-pressed={active%5===index} onClick={()=>setActive(5+index)}>{String(index+1).padStart(2,'0')}</button>)}</div>
      <button ref={openRef} className="shelf-open" onClick={open}>{tapes[active%5].name}<span>↗</span></button>
      <small>{tapes[active%5].subtitle}</small>
    </div>
    {selected!==null&&<section ref={detailRef} className="tape-detail" role="dialog" aria-modal="true" aria-label={tapes[selected].name}>
      <button ref={closeRef} className="tape-close" onClick={()=>setSelected(null)}>关闭 ×</button>
      <div className="tape-detail-render"><TapeView id={tapes[selected].id} expanded exploded={exploded}/></div>
      <div className="tape-detail-footer"><div><h2>{tapes[selected].name}</h2><p>{tapes[selected].subtitle}</p></div><button onClick={()=>setExploded(value=>!value)} aria-pressed={exploded}>{exploded?'合上外壳':'查看内部结构'}</button></div>
    </section>}
  </main>;
}
