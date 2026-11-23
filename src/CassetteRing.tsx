import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ANCHOR, COUNT, RADIUS, STEP, baseOpacity, slotPose, ease } from './portfolioMotion';
import { Tape } from './Portfolio';

const IDS=['clear','smoke','ivory','black','blue'];
const SCALE=.20;
// Match the original pull-out distance relative to the wider cassette silhouette.
const PULL=1.25*(9.58*SCALE/.82);
export default function CassetteRing({mode,onSelect,onProgress}:{mode:number;onSelect:(mode:number)=>void;onProgress:(progress:number)=>void}) {
  const {scene}=useGLTF(`${import.meta.env.BASE_URL}models/portfolio/ivory.glb?v=user-blue-1`);
  const greyGeometry=useMemo(()=>{
    const model=scene.clone(true);model.updateMatrixWorld(true);
    const parts:THREE.BufferGeometry[]=[];
    model.traverse(object=>{
      if(!(object instanceof THREE.Mesh)||!/^shell_front__|sidewall|topwall|rounded_corner_wall|head_edge_bridge/i.test(object.name))return;
      const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
      for(const name of Object.keys(geometry.attributes))if(name!=='position'&&name!=='normal')geometry.deleteAttribute(name);
      geometry.applyMatrix4(object.matrixWorld);parts.push(geometry);
    });
    const merged=mergeGeometries(parts);parts.forEach(part=>part.dispose());return merged;
  },[scene]);
  useEffect(()=>()=>greyGeometry.dispose(),[greyGeometry]);
  const groups=useRef<Array<THREE.Group|null>>([]);
  const greys=useRef<Array<THREE.MeshStandardMaterial|null>>([]);
  const materials=useRef(new Map<number,Array<{material:THREE.Material;opacity:number;transparent:boolean;depthWrite:boolean}>>());
  const previous=useRef(mode), switched=useRef(-20);
  const target=new THREE.Vector3();
  useFrame(({clock},delta)=>{
    const time=clock.getElapsedTime();
    if(previous.current!==mode){previous.current=mode;switched.current=time;}
    const active=ANCHOR+mode;
    const current=groups.current[active];
    const rest=-RADIUS+RADIUS*Math.cos(mode*STEP);
    const progress=current?THREE.MathUtils.clamp((current.position.x-rest)/PULL,0,1):0;
    onProgress(THREE.MathUtils.clamp((progress-.85)/.15,0,1));
    for(let index=0;index<COUNT;index++){
      const group=groups.current[index];if(!group)continue;
      const interactive=index>=ANCHOR&&index<ANCHOR+5;
      const selected=index===active;
      const pose=slotPose(index,active,progress,time-switched.current);
      target.set(pose.x+(selected?PULL:0),0,pose.z+(selected?.11:0));
      group.position.lerp(target,ease(selected?.135:.15,delta));group.rotation.y=pose.phi;
      if(interactive){
        if(!materials.current.has(index)){
          const list:Array<{material:THREE.Material;opacity:number;transparent:boolean;depthWrite:boolean}>=[];
          const seen=new Set<THREE.Material>();
          group.traverse(object=>{if(object instanceof THREE.Mesh){
            for(const material of (Array.isArray(object.material)?object.material:[object.material]))if(!seen.has(material)){seen.add(material);list.push({material,opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite});}
          }});
          if(list.length)materials.current.set(index,list);
        }
        for(const base of materials.current.get(index)||[]){
          base.material.opacity=THREE.MathUtils.lerp(base.material.opacity,base.opacity*(selected?1:.4),ease(.1,delta));
          const transparent=base.transparent||!selected;
          if(base.material.transparent!==transparent){base.material.transparent=transparent;base.material.needsUpdate=true;}
          base.material.depthWrite=selected&&base.depthWrite;
        }
      }else{
        const material=greys.current[index];if(!material)continue;
        material.opacity=THREE.MathUtils.lerp(material.opacity,baseOpacity(index),ease(.1,delta));
      }
    }
  });
  return <group>{Array.from({length:COUNT},(_,reverse)=>{
    const index=COUNT-1-reverse,interactive=index>=ANCHOR&&index<ANCHOR+5;
    const phi=(index-ANCHOR)*STEP;
    const ratio=Math.abs(index-ANCHOR)/(index<ANCHOR?ANCHOR:COUNT-1-ANCHOR);
    const grey=new THREE.Color('#42494c').lerp(new THREE.Color('#747b7d'),ratio);
    return <group key={index} ref={node=>{groups.current[index]=node;}} position={[-RADIUS+RADIUS*Math.cos(phi),0,-RADIUS*Math.sin(phi)]} rotation={[0,phi,0]}
      onClick={interactive?event=>{event.stopPropagation();onSelect(index-ANCHOR);}:undefined}>
      {interactive?<group scale={SCALE}><Tape id={IDS[index-ANCHOR]} exploded={false}/></group>:<mesh geometry={greyGeometry} scale={SCALE} raycast={()=>{}}><meshStandardMaterial ref={node=>{greys.current[index]=node;}} color={grey} roughness={.85} transparent opacity={baseOpacity(index)} depthWrite={false}/></mesh>}
    </group>;
  })}</group>;
}
