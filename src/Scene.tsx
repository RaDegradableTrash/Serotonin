import React, { useRef, useEffect } from 'react';
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

const DOOR_W = 0.55; const DOOR_H = 0.40; const GAP = 0.04; const TOTAL_COLS = 60; const TOTAL_ROWS = 33;

interface SceneProps {
  mode: number; cardXRef: React.MutableRefObject<number[]>; isFocused: boolean;
  lockerStatus: 'idle' | 'error-jiggle' | 'success'; lockerStep: 'enter-hz' | 'enter-code' | 'action';
  targetGrid: { col: number; row: number; resetNonce: number };
}

const Scene: React.FC<SceneProps> = ({ mode, cardXRef, isFocused, lockerStatus, lockerStep, targetGrid }) => {
  const accent = accentColors[mode];
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);
  const currentLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));

  const LERP_FACTOR = 0.065;

  const POSITION_REST = new THREE.Vector3(0.8, 2.4, 9.8);
  const LOOKAT_REST = new THREE.Vector3(1.0, -0.3, 0.0);
  const POSITION_STEP1 = new THREE.Vector3(0.85, 1.8, 5.0);
  const LOOKAT_STEP1 = new THREE.Vector3(1.0, -0.35, 0.0);

  const cachedRestQuaternion = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const tempLookAtVector = useRef(new THREE.Vector3());

  // 刚性局部变换矩阵复用容器
  const wallGroupMatrix = useRef(new THREE.Matrix4());
  const localTargetPos = useRef(new THREE.Vector3());
  const finalWorldPos = useRef(new THREE.Vector3());

  useEffect(() => {
    tempLookAtVector.current.set(LOOKAT_REST.x - POSITION_REST.x, LOOKAT_REST.y - POSITION_REST.y, LOOKAT_REST.z - POSITION_REST.z).normalize();
    cachedRestQuaternion.current.setFromUnitVectors(new THREE.Vector3(0, 0, -1), tempLookAtVector.current);
  }, []);

  useFrame(() => {
    if (!cameraRef.current) return;

    let targetPosition = POSITION_REST;
    let targetLookAt = LOOKAT_REST;

    if (isFocused) {
      if (lockerStep === 'enter-hz') {
        targetPosition = POSITION_STEP1;
        targetLookAt = LOOKAT_STEP1;
      } else {
        const centerCol = (TOTAL_COLS - 1) / 2;
        const centerRow = (TOTAL_ROWS - 1) / 2;

        // 🌟 基于你最新微调截图（image_13e355.png）的物理对齐基础常数无缝继承
        const xLocal = (targetGrid.col - centerCol) * (DOOR_W + GAP) - 0.45;
        const yLocal = (targetGrid.row - centerRow) * (DOOR_H + GAP) + 1.545;

        // 🌟 目的地位置微调常数配给（你可以在这里自由调整这三个常数）：
        const tuneX = 0.65;
        const tuneY = -0.12;
        const tuneZ = 2.45;

        localTargetPos.current.set(
          xLocal + tuneX,
          yLocal + tuneY,
          tuneZ
        );

        wallGroupMatrix.current.makeRotationFromEuler(new THREE.Euler(0.15, -0.4, 0));
        wallGroupMatrix.current.setPosition(0.5, -0.2, 0.2);

        finalWorldPos.current.copy(localTargetPos.current).applyMatrix4(wallGroupMatrix.current);
        targetPosition = finalWorldPos.current;

        targetLookAt = new THREE.Vector3(
          targetPosition.x + (LOOKAT_REST.x - POSITION_REST.x),
          targetPosition.y + (LOOKAT_REST.y - POSITION_REST.y),
          targetPosition.z + (LOOKAT_REST.z - POSITION_REST.z)
        );
      }
    }

    cameraRef.current.position.lerp(targetPosition, LERP_FACTOR);

    if (isFocused) {
      cameraRef.current.quaternion.copy(cachedRestQuaternion.current);
    } else {
      currentLookAt.current.lerp(targetLookAt, LERP_FACTOR * 1.2);
      cameraRef.current.lookAt(currentLookAt.current);
    }
  });

  const currentCardX = isFocused ? -9.5 : -3.65;

  return (
    <>
      <PerspectiveCamera makeDefault ref={cameraRef} fov={36} position={[0.8, 2.4, 9.8]} near={0.1} far={120} />
      <SoftShadows size={25} focus={0.4} samples={20} />
      <directionalLight position={[10, 15, 6]} intensity={2.5} castShadow />
      <ambientLight intensity={0.22} color="#ffffff" />
      <pointLight position={[-1, 1.5, 4]} intensity={0.4} color={accent} />
      <FluidBackground accentColor={accent} />

      <group position={[currentCardX, -0.75, 0]} rotation={[0.0, 0.42, -0.03]}>
        <MenuCards mode={mode} cardXRef={cardXRef} isFocused={isFocused} />
      </group>

      <RetrieveStation mode={mode} isFocused={isFocused} lockerStatus={lockerStatus} lockerStep={lockerStep} targetGrid={targetGrid} />

      <group position={[-0.3, -0.2, 0]} scale={[1.5, 1.5, 1.5]} visible={!isFocused}>
        <GaugeRing mode={mode} />
      </group>
    </>
  );
};

export default Scene;
