import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Html } from '@react-three/drei';
import * as THREE from 'three';

interface RetrieveStationProps {
  mode: number; isFocused: boolean; lockerStatus: 'idle' | 'error-jiggle' | 'success'; lockerStep: 'enter-hz' | 'enter-code' | 'action';
  targetGrid: { col: number; row: number; resetNonce: number };
}

const COLS = 60; const ROWS = 33; const DOOR_W = 0.55; const DOOR_H = 0.40; const GAP = 0.04;

const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

const RetrieveStation: React.FC<RetrieveStationProps> = ({ mode, isFocused, lockerStatus, lockerStep, targetGrid }) => {
  // 🌟 强效防止重叠穿模：不聚焦状态直接隐形
  if (mode !== 1 || !isFocused) return null;

  const { camera } = useThree();

  const targetCol = targetGrid.col;
  const targetRow = targetGrid.row;

  const [lidCurrentX, setLidCurrentX] = useState<number>(0);
  const [lidTargetX, setLidTargetX] = useState<number>(0);
  const [wallAlpha, setWallAlpha] = useState<number>(0);

  const isDragging = useRef<boolean>(false);
  const pointerStartCanvasX = useRef<number>(0);
  const lidStartMeshX = useRef<number>(0);

  const cameraArrivedTime = useRef<number>(-1);
  const prevLockerStep = useRef<string>('enter-hz');

  const outerInstancedRef = useRef<THREE.InstancedMesh>(null!);
  const innerInstancedRef = useRef<THREE.InstancedMesh>(null!);

  const [inputValue, setInputValue] = useState<string>('');
  const [currentStatus, setCurrentStatus] = useState<'idle' | 'error-jiggle' | 'success'>(lockerStatus);

  const isUnlocked = currentStatus === 'success';
  const isActiveStep = lockerStep === 'enter-code' || lockerStep === 'action';

  useEffect(() => {
    setLidCurrentX(0); setLidTargetX(0); isDragging.current = false;
    cameraArrivedTime.current = -1; setInputValue(''); setCurrentStatus('idle');
  }, [isFocused, targetGrid.resetNonce, targetGrid.col, targetGrid.row]);

  useEffect(() => {
    setCurrentStatus(lockerStatus);
    if (lockerStatus === 'success') setLidTargetX(0.48);
    else if (lockerStatus === 'error-jiggle') setLidTargetX(0.12);
    else setLidTargetX(0);
  }, [lockerStatus]);

  const idealWorldCamPosition = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    prevLockerStep.current = lockerStep;

    if (isActiveStep && cameraArrivedTime.current === -1) {
      // 🌟 完美并轨：一字不差地复现你在 Scene.tsx 里的原始相机平视推导逻辑，精准同步点火时间戳
      const rotY = -0.4;
      const centerCol = (COLS - 1) / 2;
      const centerRow = (ROWS - 1) / 2;

      const targetXWorld = (targetCol - centerCol) * (DOOR_W + GAP) - 1.85;
      const targetYWorld = (targetRow - centerRow) * (DOOR_H + GAP) + 0.05;

      const finalBoxX = 0.5 + targetXWorld * Math.cos(rotY);
      const finalBoxY = -0.2 + targetYWorld;
      const finalBoxZ = 0.2 + targetXWorld * Math.sin(rotY);

      const distForward = 2.50;
      const distLeft = 0.55;

      const camX = finalBoxX + distLeft * Math.cos(rotY) + distForward * Math.sin(-rotY);
      const camY = finalBoxY;
      const camZ = finalBoxZ + distLeft * Math.sin(rotY) + distForward * Math.cos(rotY);

      idealWorldCamPosition.set(camX, camY, camZ);
      const remainingDistance = camera.position.distanceTo(idealWorldCamPosition);

      if (remainingDistance < 0.08) {
        cameraArrivedTime.current = t;
      }
    }

    const targetAlpha = 0.95;
    if (Math.abs(wallAlpha - targetAlpha) > 0.01) {
      setWallAlpha(THREE.MathUtils.lerp(wallAlpha, targetAlpha, 0.08));
    }

    if (!isDragging.current && Math.abs(lidCurrentX - lidTargetX) > 0.001) {
      const speed = currentStatus === 'error-jiggle' ? 0.24 : 0.12;
      setLidCurrentX(THREE.MathUtils.lerp(lidCurrentX, lidTargetX, speed));
    }

    if (outerInstancedRef.current && innerInstancedRef.current) {
      let instanceIdx = 0;
      const elapsedTimeSinceArrival = cameraArrivedTime.current > 0 ? (t - cameraArrivedTime.current) : 0;
      const DELAY_BEFORE_POP = 0.36; const DELAY_BEFORE_WAVE = 0.08;

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const isTarget = (c === targetCol && r === targetRow);

          let shouldCull = false;
          if (isActiveStep) {
            const checkDist = Math.abs(c - targetCol) + Math.abs(r - targetRow);
            if (checkDist > 20) { shouldCull = true; }
          }

          if (shouldCull) {
            tempObject.position.set(0, 0, 0); tempObject.scale.set(0, 0, 0); tempObject.updateMatrix();
            outerInstancedRef.current.setMatrixAt(instanceIdx, tempObject.matrix);
            innerInstancedRef.current.setMatrixAt(instanceIdx, tempObject.matrix);
          } else {
            const xPos = (c - (COLS - 1) / 2) * (DOOR_W + GAP) - 1.85;
            const yPos = (r - (ROWS - 1) / 2) * (DOOR_H + GAP) + 0.05;

            let zOffset = 0;
            let currentFadeRatio = 0;

            if (isActiveStep && cameraArrivedTime.current > 0) {
              const gridDist = Math.sqrt(Math.pow(c - targetCol, 2) + Math.pow(r - targetRow, 2));

              if (isTarget) {
                if (elapsedTimeSinceArrival > DELAY_BEFORE_POP) {
                  const popProgress = elapsedTimeSinceArrival - DELAY_BEFORE_POP;
                  zOffset = THREE.MathUtils.lerp(0, 0.15, Math.pow(Math.min(1, popProgress * 3.5), 3));
                }
                currentFadeRatio = 0;
              } else {
                const waveTriggerTime = DELAY_BEFORE_POP + DELAY_BEFORE_WAVE;
                if (elapsedTimeSinceArrival > waveTriggerTime) {
                  const waveVelocity = 13.0;
                  const waveFrontTime = gridDist / waveVelocity;
                  const localWaveTime = (elapsedTimeSinceArrival - waveTriggerTime) - waveFrontTime;

                  if (localWaveTime > 0) {
                    const baseAmplitude = 0.58;
                    const distanceDecay = Math.exp(-0.24 * gridDist);
                    const timeDecay = Math.exp(-3.5 * localWaveTime);

                    zOffset = baseAmplitude * Math.sin(2 * Math.PI * 1.5 * localWaveTime) * distanceDecay * timeDecay;
                    currentFadeRatio = THREE.MathUtils.lerp(0, 1, Math.min(1, localWaveTime * 1.2));
                  }
                }
              }
            }

            tempObject.position.set(xPos, yPos, -0.18 + zOffset); tempObject.scale.set(1, 1, 1); tempObject.updateMatrix();
            outerInstancedRef.current.setMatrixAt(instanceIdx, tempObject.matrix);

            tempObject.position.set(xPos, yPos, (0.201 - 0.18) + zOffset); tempObject.scale.set(1, 1, 1); tempObject.updateMatrix();
            innerInstancedRef.current.setMatrixAt(instanceIdx, tempObject.matrix);

            const originColorHex = '#eedcb8'; const mutedColorHex = '#80878a';
            let finalOuterColor = originColorHex;
            if (isActiveStep && !isTarget) {
              tempColor.set(originColorHex).lerp(new THREE.Color(mutedColorHex), currentFadeRatio);
              finalOuterColor = '#' + tempColor.getHexString();
            }
            tempColor.set(finalOuterColor); outerInstancedRef.current.setColorAt(instanceIdx, tempColor);

            const originInnerHex = '#decba4'; const mutedInnerHex = '#6f7578';
            let finalInnerColor = originInnerHex;
            if (isActiveStep && !isTarget) {
              tempColor.set(originInnerHex).lerp(new THREE.Color(mutedInnerHex), currentFadeRatio);
              finalInnerColor = '#' + tempColor.getHexString();
            }
            tempColor.set(finalInnerColor); innerInstancedRef.current.setColorAt(instanceIdx, tempColor);
          }
          instanceIdx++;
        }
      }

      outerInstancedRef.current.instanceMatrix.needsUpdate = true;
      innerInstancedRef.current.instanceMatrix.needsUpdate = true;
      if (outerInstancedRef.current.instanceColor) outerInstancedRef.current.instanceColor.needsUpdate = true;
      if (innerInstancedRef.current.instanceColor) innerInstancedRef.current.instanceColor.needsUpdate = true;
    }
  });

  const onDoorDown = (e: any) => { e.stopPropagation(); isDragging.current = true; pointerStartCanvasX.current = e.clientX; lidStartMeshX.current = lidCurrentX; };

  const onDoorMove = (e: any) => {
    if (!isDragging.current) return; e.stopPropagation();
    let nextX = lidStartMeshX.current + (e.clientX - pointerStartCanvasX.current) * 0.0045;

    if (!isUnlocked) {
      if (nextX > 0.14) {
        // 🌟 箱门直接在手势拖拽行为中实时拦截匹配 3D 控制面板内的 inputValue
        if (inputValue === '1234') {
          setCurrentStatus('success');
          window.dispatchEvent(new CustomEvent('engage-3d-decryption-success'));
          nextX = Math.max(0, Math.min(0.48, nextX));
        } else { nextX = 0.14; }
      } else { nextX = Math.max(0, nextX); }
    } else {
      nextX = Math.max(0, Math.min(0.48, nextX));
    }
    setLidCurrentX(nextX); setLidTargetX(nextX);
  };

  const onDoorUp = (e: any) => { if (!isDragging.current) return; e.stopPropagation(); isDragging.current = false; if (!isUnlocked) { if (inputValue !== '' && inputValue !== '1234') { setCurrentStatus('error-jiggle'); setLidTargetX(0.0); window.dispatchEvent(new CustomEvent('engage-3d-decryption-error')); setTimeout(() => setCurrentStatus('idle'), 600); } else { setLidTargetX(0); } } else { setLidTargetX(lidCurrentX > 0.24 ? 0.48 : 0); } };

  const centerColCalc = (COLS - 1) / 2; const centerRowCalc = (ROWS - 1) / 2;
  const targetXPos = (targetCol - centerColCalc) * (DOOR_W + GAP) - 1.85;
  const targetYPos = (targetRow - centerRowCalc) * (DOOR_H + GAP) + 0.05;

  const elapsed = cameraArrivedTime.current > 0 ? (performance.now() / 1000 - cameraArrivedTime.current) : 0;
  const livePopZ = isActiveStep ? THREE.MathUtils.lerp(0, 0.15, Math.pow(Math.min(1, elapsed * 3.5), 3)) : 0;

  return (
    <group position={[0.5, -0.2, 0.2]} rotation={[0.15, -0.4, 0]} visible={wallAlpha > 0.02}>

      <instancedMesh ref={outerInstancedRef} args={[null as any, null as any, COLS * ROWS]} castShadow receiveShadow>
        <boxGeometry args={[DOOR_W, DOOR_H, 0.40]} />
        <meshStandardMaterial roughness={0.28} metalness={0.15} transparent={isActiveStep} opacity={isActiveStep ? (wallAlpha * 0.45) : wallAlpha} />
      </instancedMesh>

      <instancedMesh ref={innerInstancedRef} args={[null as any, null as any, COLS * ROWS]}>
        <boxGeometry args={[DOOR_W - 0.08, DOOR_H - 0.08, 0.006]} />
        <meshStandardMaterial roughness={0.38} metalness={0.1} transparent={isActiveStep} opacity={isActiveStep ? (wallAlpha * 0.45) : wallAlpha} />
      </instancedMesh>

      {isActiveStep && (
        <group position={[targetXPos, targetYPos, livePopZ]} onPointerDown={onDoorDown} onPointerMove={onDoorMove} onPointerUp={onDoorUp}>
          <group position={[0, 0, -0.25]}>
            <mesh position={[0, 0, -0.2]}><planeGeometry args={[DOOR_W - 0.02, DOOR_H - 0.02]} /><meshStandardMaterial color="#020202" /></mesh>
            <mesh position={[-(DOOR_W - 0.02) / 2, 0, -0.1]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[0.2, DOOR_H - 0.02]} /><meshStandardMaterial color="#050505" /></mesh>
            <mesh position={[(DOOR_W - 0.02) / 2, 0, -0.1]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[0.2, DOOR_H - 0.02]} /><meshStandardMaterial color="#050505" /></mesh>
            <mesh position={[0, (DOOR_H - 0.02) / 2, -0.1]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[0.2, DOOR_W - 0.02]} /><meshStandardMaterial color="#080808" /></mesh>
            <mesh position={[0, -(DOOR_H - 0.02) / 2, -0.1]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.2, DOOR_W - 0.02]} /><meshStandardMaterial color="#030303" /></mesh>
            {isUnlocked && (
              <mesh position={[0, 0, -0.05]} rotation={[0.4, 0.4, 0]}><boxGeometry args={[0.12, 0.12, 0.12]} /><meshBasicMaterial color="#70D4D5" wireframe /></mesh>
            )}
            {(lockerStep === 'action' || (lockerStep === 'enter-code' && isUnlocked && lidCurrentX > 0.32)) && (
              <group position={[0, 0, 0.05]}>
                <Html transform distanceFactor={1.1} center>
                  <div style={{ background: 'rgba(7, 175, 193, 0.15)', border: '1px solid #70D4D5', boxShadow: '0 0 20px rgba(112, 212, 213, 0.3)', padding: '12px 18px', color: '#fff', borderRadius: '2px', backdropFilter: 'blur(10px)', fontFamily: "monospace", display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ fontSize: '8px', color: '#70D4D5', letterSpacing: '2px', fontWeight: 'bold' }}>⚡ DECRYPTION COMPLETED</div>
                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', margin: '4px 0' }}>砼冢_CORE_DATA_V0.1</div>
                    <div style={{ fontSize: '9px', color: '#a0b0b5' }}>SUCCESSFULLY RETRIEVED.</div>
                  </div>
                </Html>
              </group>
            )}
          </group>

          <group position={[lidCurrentX, 0, 0.015]}>
            <RoundedBox args={[DOOR_W, DOOR_H, 0.04]} radius={0.012} smoothness={2}><meshStandardMaterial color="#eedcb8" roughness={0.25} metalness={0.2} /></RoundedBox>
            <mesh position={[0, 0, 0.021]}><RoundedBox args={[DOOR_W - 0.08, DOOR_H - 0.08, 0.005]} radius={0.008} smoothness={2}><meshStandardMaterial color="#decba4" roughness={0.35} /></RoundedBox></mesh>
            <mesh position={[DOOR_W / 2 - 0.045, 0, 0.022]}><boxGeometry args={[0.02, 0.16, 0.006]} /><meshBasicMaterial color={isUnlocked ? '#70D4D5' : currentStatus === 'error-jiggle' ? '#ff3366' : '#E9A254'} /></mesh>
          </group>

          {lockerStep === 'enter-code' && !isUnlocked && (
            <>
              <group position={[0.48, 0, 0.06]}><Html transform distanceFactor={1.4} center><div style={{ background: '#1a4968', border: '1px solid #ff3366', padding: '8px 12px', color: '#fff', fontSize: '9px', fontFamily: "monospace", whiteSpace: 'nowrap' }}>🔑 PIN ACCESS REQUESTED</div></Html></group>
              {/* 🌟 2倍放大面积、平整贴在柜面右侧盲区的重工业 3D 密码输入舱 */}
              <group position={[0.72, -0.05, 0.04]}>
                <Html transform distanceFactor={0.55} center pointerEvents="auto">
                  <div style={{ background: '#ffffff', padding: '42px', boxShadow: '0 35px 80px rgba(0,0,0,0.45)', fontFamily: "monospace", width: '440px', border: '1px solid rgba(0,0,0,0.09)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ fontSize: '10px', color: '#a09690', letterSpacing: '2px' }}>CH-A · SYNAPTIC LOCKBOX PROTOCOL</div>
                    <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#2c2520' }}>VESICLE HUB // <span style={{ color: '#E9A254' }}>RETRIEVE</span></div>
                    <div style={{ background: '#143147', padding: '24px 30px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ fontSize: '11px', color: '#70D4D5', fontWeight: 'bold' }}>[ ENTER ACCESS CREDENTIALS ]</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                        <input type="password" maxLength={4} placeholder="••••" value={inputValue} onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ''))} style={{ background: 'transparent', border: 'none', outline: 'none', color: '#ffffff', fontSize: '28px', fontWeight: 'bold', letterSpacing: '12px', width: '140px' }} />
                        <span style={{ fontSize: '12px', color: '#597991' }}>( 密码：1234 )</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#888', textAlign: 'center', borderTop: '1px dashed #eee', paddingTop: '14px' }}>👉 输入密码后，请直接用鼠标【向右拖拽】左侧的箱门</div>
                  </div>
                </Html>
              </group>
            </>
          )}
        </group>
      )}

    </group>
  );
};

export default RetrieveStation;