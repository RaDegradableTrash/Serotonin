import { useRef } from 'react';
import type { ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Html, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import MenuCards from './MenuCards';
import FluidBackground from './FluidBackground';
import GaugeRing from './GaugeRing';

const colors = ['#C0C0A8', '#E9A254', '#EEBF79', '#07AFC1', '#70D4D5'].map(value => new THREE.Color(value));
function SceneCamera() {
  const { size } = useThree();
  // Keep the original desktop lens; widen the vertical field on narrow screens
  // so the left-hand labels remain visible instead of falling outside the camera.
  const aspect = size.width / Math.max(1, size.height);
  const fov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(18)) * Math.max(1, 1.35 / aspect)) * 180 / Math.PI;
  return <PerspectiveCamera makeDefault fov={fov} position={[0.8, 2.4, 9.8]} near={0.1} far={120} onUpdate={camera => camera.lookAt(1, -0.3, 0)} />;
}
export default function Scene({ mode, onSelect, children }: { mode: number; onSelect: (mode: number) => void; children: ReactNode }) {
  const surfaceRef = useRef<THREE.Group>(null);
  const cardXRef = useRef<number[]>([0, 0, 0, 0, 0]);
  return <div className="original-scene" aria-label="原版动态标签场景"><Canvas dpr={[1, 1.5]} flat gl={{ toneMapping: THREE.NoToneMapping, outputColorSpace: THREE.SRGBColorSpace }} fallback={<p className="scene-fallback">3D 场景不可用，可用顶部按键切换空间。</p>}>
    <SceneCamera />
    <directionalLight position={[10, 15, 6]} intensity={2.5} />
    <ambientLight intensity={0.22} color="#ffffff" />
    <pointLight position={[-1, 1.5, 4]} intensity={0.4} color={colors[mode]} />
    <FluidBackground accentColor={colors[mode]} />
    <group position={[-3.65, -0.75, 0]} rotation={[0, 0.42, -0.03]}>
      <MenuCards mode={mode} cardXRef={cardXRef} isFocused={false} onSelect={onSelect} surfaceRef={surfaceRef} />
    </group>
    <group ref={surfaceRef} matrixAutoUpdate={false}>
      <group position={[3.9, 0.2, 0.039]}>
        <Html transform distanceFactor={2.4} zIndexRange={[5, 3]} className="shared-plane" pointerEvents="auto">
          {children}
        </Html>
      </group>
    </group>
    <group position={[-0.3, -0.2, 0]} scale={[1.5, 1.5, 1.5]}><GaugeRing mode={mode} /></group>
  </Canvas></div>;
}
