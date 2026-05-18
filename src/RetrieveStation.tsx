import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Html } from '@react-three/drei';
import * as THREE from 'three';

interface RetrieveStationProps {
  mode: number; isFocused: boolean; lockerStatus: 'idle' | 'error-jiggle' | 'success'; lockerStep: 'enter-hz' | 'enter-code' | 'action';
  targetGrid: { col: number; row: number }; // 🌟 补上了！
}

const COLS = 38; const ROWS = 13; const DOOR_W = 0.55; const DOOR_H = 0.40; const GAP = 0.05;

const RetrieveStation: React.FC<RetrieveStationProps> = ({ mode, isFocused, lockerStatus, lockerStep, targetGrid }) => {
  if (mode !== 1 || !isFocused) return null;

  const targetCol = targetGrid.col;
  const targetRow = targetGrid.row;

  const [lidCurrentX, setLidCurrentX] = useState<number>(0);
  const [lidTargetX, setLidTargetX] = useState<number>(0);
  const [wallAlpha, setWallAlpha] = useState<number>(0);

  const isDragging = useRef<boolean>(false);
  const pointerStartCanvasX = useRef<number>(0);
  const lidStartMeshX = useRef<number>(0);

  const isUnlocked = lockerStatus === 'success';

  useEffect(() => { setLidCurrentX(0); setLidTargetX(0); isDragging.current = false; }, [isFocused, targetGrid]);

  useEffect(() => {
    if (lockerStatus === 'success') setLidTargetX(0.48);
    else if (lockerStatus === 'error-jiggle') setLidTargetX(0.12);
    else setLidTargetX(0);
  }, [lockerStatus]);

  useFrame(() => {
    const targetAlpha = isFocused ? 0.95 : 0.0;
    if (Math.abs(wallAlpha - targetAlpha) > 0.01) setWallAlpha(THREE.MathUtils.lerp(wallAlpha, targetAlpha, 0.08));
    if (!isDragging.current && Math.abs(lidCurrentX - lidTargetX) > 0.001) {
      setLidCurrentX(THREE.MathUtils.lerp(lidCurrentX, lidTargetX, lockerStatus === 'error-jiggle' ? 0.24 : 0.12));
    }
  });

  const onDoorDown = (e: any) => { if (lockerStep !== 'action') return; e.stopPropagation(); isDragging.current = true; pointerStartCanvasX.current = e.clientX; lidStartMeshX.current = lidCurrentX; };
  const onDoorMove = (e: any) => { if (!isDragging.current) return; e.stopPropagation(); let nextX = lidStartMeshX.current + (e.clientX - pointerStartCanvasX.current) * 0.004; setLidCurrentX(Math.max(0, Math.min(isUnlocked ? 0.48 : 0.12, nextX))); setLidTargetX(nextX); };
  const onDoorUp = (e: any) => { if (!isDragging.current) return; e.stopPropagation(); isDragging.current = false; setLidTargetX(!isUnlocked ? 0 : (lidCurrentX > 0.24 ? 0.48 : 0)); };

  const renderCabinetWall = () => {
    const meshes: React.ReactNode[] = [];
    const isActiveStep = lockerStep === 'enter-code' || lockerStep === 'action';

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const isTarget = (c === targetCol && r === targetRow);
        const xPos = (c - (COLS - 1) / 2) * (DOOR_W + GAP) - 1.85;
        const yPos = (r - (ROWS - 1) / 2) * (DOOR_H + GAP) + 0.05;

        // 🌟 只有到达验证环节，它才会“显形”为天选活动格 🌟
        if (isTarget && isActiveStep) {
          meshes.push(
            <group key={`target-box`} position={[xPos, yPos, 0]} onPointerDown={onDoorDown} onPointerMove={onDoorMove} onPointerUp={onDoorUp}>
              <mesh position={[0, 0, 0.035]}><boxGeometry args={[DOOR_W + 0.015, DOOR_H + 0.015, 0.002]} /><meshBasicMaterial color="#ff3366" wireframe /></mesh>

              {/* 后方内部黑匣：完全实心不透明 */}
              <group position={[0, 0, -0.25]}>
                <mesh position={[0, 0, -0.2]}><planeGeometry args={[DOOR_W - 0.02, DOOR_H - 0.02]} /><meshStandardMaterial color="#020202" transparent={false} /></mesh>
                <mesh position={[-(DOOR_W - 0.02) / 2, 0, -0.1]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.2, DOOR_H - 0.02]} /><meshStandardMaterial color="#050505" transparent={false} /></mesh>
                <mesh position={[(DOOR_W - 0.02) / 2, 0, -0.1]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[0.2, DOOR_H - 0.02]} /><meshStandardMaterial color="#050505" transparent={false} /></mesh>
                <mesh position={[0, (DOOR_H - 0.02) / 2, -0.1]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[DOOR_W - 0.02, 0.2]} /><meshStandardMaterial color="#080808" transparent={false} /></mesh>
                <mesh position={[0, -(DOOR_H - 0.02) / 2, -0.1]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[DOOR_W - 0.02, 0.2]} /><meshStandardMaterial color="#030303" transparent={false} /></mesh>

                {isUnlocked && lidCurrentX > 0.35 && (
                  <mesh position={[0, 0, -0.05]} rotation={[0.4, 0.4, 0]}><boxGeometry args={[0.12, 0.12, 0.12]} /><meshBasicMaterial color="#70D4D5" wireframe /></mesh>
                )}
              </group>

              {/* 滑动门板实体：完全实心防穿帮 */}
              <group position={[lidCurrentX, 0, 0]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[DOOR_W, DOOR_H, 0.04]} />
                  <meshStandardMaterial color="#eedcb8" roughness={0.28} metalness={0.15} transparent={false} />
                </mesh>
                <mesh position={[DOOR_W / 2 - 0.045, 0, 0.022]}>
                  <boxGeometry args={[0.02, 0.16, 0.006]} />
                  <meshBasicMaterial color={isUnlocked ? '#70D4D5' : lockerStatus === 'error-jiggle' ? '#ff3366' : '#E9A254'} />
                </mesh>
              </group>

              <Html position={[0.48, 0, 0.03]} center distanceFactor={1.8}>
                <div style={{ background: '#1a4968', border: '1px solid #ff3366', padding: '8px 12px', color: '#fff', fontSize: '9px', fontFamily: "'Courier New', monospace", boxShadow: '0 10px 25px rgba(0,0,0,0.5)', letterSpacing: '1px' }}>🔑 PIN ACCESS REQUESTED</div>
              </Html>
            </group>
          );
        } else {
          // 🌟 核心机制：未定位前全都是一模一样的普通盒子，没有任何特殊待遇 🌟
          meshes.push(
            <mesh key={`door-${r}-${c}`} position={[xPos, yPos, 0]} castShadow receiveShadow>
              <boxGeometry args={[DOOR_W, DOOR_H, 0.04]} />
              <meshStandardMaterial
                color={isActiveStep ? '#80878a' : '#eedcb8'}
                roughness={0.28} metalness={0.15}
                transparent={isActiveStep}
                opacity={isActiveStep ? (wallAlpha * 0.25) : wallAlpha}
              />
            </mesh>
          );
        }
      }
    }
    return meshes;
  };

  return (
    <group position={[0.5, -0.2, 0.2]} rotation={[0.15, -0.4, 0]} visible={wallAlpha > 0.02}>
      {renderCabinetWall()}
    </group>
  );
};

export default RetrieveStation;