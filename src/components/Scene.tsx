import React from 'react';
import { PerspectiveCamera, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import FluidBackground from './scene/FluidBackground';
import MenuCards from './scene/MenuCards';
import GaugeRing from './scene/GaugeRing';

const accentColors: Record<number, THREE.Color> = {
  0: new THREE.Color('#141414'),
  1: new THREE.Color('#ff123f'),
  2: new THREE.Color('#ffc800'),
  3: new THREE.Color('#00f0b5'),
  4: new THREE.Color('#0066ff'),
};

interface SceneProps {
  mode: number;
  cardXRef: React.MutableRefObject<number[]>;
}

const Scene: React.FC<SceneProps> = ({ mode, cardXRef }) => {
  const accent = accentColors[mode];

  return (
    <>
      {/*
        Camera: strong right-side angle for dramatic perspective.
        [3.5, 1.5, 6.5] → fov=36 → cards appear as narrow tilted slabs.
        lookAt [0,0,0] means screen center = world origin.
        Card group offset in world space: [-1.3, 0, 0] → black card at ~27% from left.
      */}
      <PerspectiveCamera
        makeDefault
        fov={36}
        position={[3.5, 1.5, 6.5]}
        near={0.1}
        far={100}
        onUpdate={cam => cam.lookAt(new THREE.Vector3(0, 0, 0))}
      />

      <SoftShadows size={22} focus={0.6} samples={16} />

      <directionalLight position={[4, 8, 4]} intensity={1.15} castShadow shadow-mapSize={[2048, 2048]} />
      <ambientLight intensity={0.50} color="#f0f0f4" />
      <pointLight position={[-1, 1.5, 4]} intensity={0.35} color={accent} />
      <pointLight position={[-5, 0, -3]} intensity={0.22} color="#c8d8ff" />

      <FluidBackground accentColor={accent} />

      {/*
        Cards group: shifted lower (Y=-0.75) and leftward (X=-3.65) to align with
        the 1/8.5 vertical line, with rotation compensated to make edges perfectly vertical on screen.
      */}
      <group position={[-3.65, -0.75, 0]} rotation={[0.0, 0.42, -0.03]}>
        <MenuCards mode={mode} cardXRef={cardXRef} />
      </group>

      {/*
        GaugeRing: outer group accounts for inner component's position offset.
        GaugeRing internally positions itself at [4.2, 0, -1] local space.
        World center = outer_pos + inner_pos * scale
                     = [-0.3, -0.2, 0] + [4.2, 0, -1] * 1.5
                     = [6.0, -0.2, -1.5]
        Ring radius in world = 1.4 * 1.5 = 2.1 wu ≈ 218px on screen.
        Left edge at screen 1006px, center at 1224px → 45% visible at right edge.
      */}
      <group position={[-0.3, -0.2, 0]} scale={[1.5, 1.5, 1.5]}>
        <GaugeRing mode={mode} />
      </group>
    </>
  );
};

export default Scene;
