import React, { useRef } from 'react';
import { PerspectiveCamera, SoftShadows } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import FluidBackground from './FluidBackground';
import MenuCards from './MenuCards';
import GaugeRing from './GaugeRing';
import RetrieveStation from './RetrieveStation';

const accentColors: Record<number, THREE.Color> = {
  0: new THREE.Color('#C0C0A8'), 1: new THREE.Color('#E9A254'), 2: new THREE.Color('#EEBF79'), 3: new THREE.Color('#07AFC1'), 4: new THREE.Color('#70D4D5'),
};

const DOOR_W = 0.55; const DOOR_H = 0.40; const GAP = 0.05; const TOTAL_COLS = 38; const TOTAL_ROWS = 13;

interface SceneProps {
  mode: number; cardXRef: React.MutableRefObject<number[]>; isFocused: boolean; setIsFocused: (focused: boolean) => void;
  lockerStatus: 'idle' | 'error-jiggle' | 'success'; lockerStep: 'enter-hz' | 'enter-code' | 'action';
  targetGrid: { col: number; row: number }; // 🌟 补上了！
}

const Scene: React.FC<SceneProps> = ({ mode, cardXRef, isFocused, setIsFocused, lockerStatus, lockerStep, targetGrid }) => {
  const accent = accentColors[mode];
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  const LERP_FACTOR = 0.065;

  // 🌟 原封不动的黄金大倾角构图 🌟
  const POSITION_REST = new THREE.Vector3(0.8, 2.4, 9.8);
  const LOOKAT_REST = new THREE.Vector3(1.0, -0.3, 0.0);

  // 第一步: 输入前推近
  const POSITION_STEP1 = new THREE.Vector3(0.85, 1.8, 5.0);
  const LOOKAT_STEP1 = new THREE.Vector3(1.0, -0.35, 0.0);

  useFrame(() => {
    if (!cameraRef.current) return;

    let targetPosition = POSITION_REST;
    let targetLookAt = LOOKAT_REST;

    if (isFocused) {
      if (lockerStep === 'enter-hz') {
        targetPosition = POSITION_STEP1;
        targetLookAt = LOOKAT_STEP1;
      } else {
        // 第二步: 抓取 App 层下发的 targetGrid 并追踪
        const targetXWorld = (targetGrid.col - (TOTAL_COLS - 1) / 2) * (DOOR_W + GAP) - 1.85;
        const targetYWorld = (targetGrid.row - (TOTAL_ROWS - 1) / 2) * (DOOR_H + GAP) + 0.05;

        // 根据墙面倾角补偿物理视点坐标，让其始终对准目标
        const finalBoxX = 0.5 + targetXWorld * Math.cos(-0.4) - 0.2 * Math.sin(-0.4);
        const finalBoxY = -0.2 + targetYWorld;

        targetPosition = new THREE.Vector3(finalBoxX + 0.3, finalBoxY, 2.6);
        targetLookAt = new THREE.Vector3(finalBoxX + 0.3, finalBoxY, -1.0);
      }
    }

    cameraRef.current.position.lerp(targetPosition, LERP_FACTOR);
    currentLookAt.current.lerp(targetLookAt, LERP_FACTOR * 1.2);
    cameraRef.current.lookAt(currentLookAt.current);
  });

  const currentCardX = isFocused ? -9.5 : -3.65;

  return (
    <>
      <PerspectiveCamera
        makeDefault
        ref={cameraRef}
        fov={36}
        position={[0.8, 2.4, 9.8]}
        near={0.1}
        far={120}
      />

      <SoftShadows size={24} focus={0.4} samples={18} />

      <directionalLight position={[10, 15, 6]} intensity={2.5} castShadow />
      <ambientLight intensity={0.22} color="#ffffff" />
      <pointLight position={[-1, 1.5, 4]} intensity={0.4} color={accent} />

      <FluidBackground accentColor={accent} />

      <group position={[currentCardX, -0.75, 0]} rotation={[0.0, 0.42, -0.03]}>
        <MenuCards mode={mode} cardXRef={cardXRef} isFocused={isFocused} />
      </group>

      <RetrieveStation
        mode={mode} isFocused={isFocused} lockerStatus={lockerStatus} lockerStep={lockerStep} targetGrid={targetGrid}
      />

      <group position={[-0.3, -0.2, 0]} scale={[1.5, 1.5, 1.5]} visible={!isFocused}>
        <GaugeRing mode={mode} />
      </group>
    </>
  );
};

export default Scene;