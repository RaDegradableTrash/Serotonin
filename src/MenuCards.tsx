import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Html } from '@react-three/drei';
import * as THREE from 'three';
import ReceptorGrid from './ReceptorGrid';

const CARD_W = 0.82;
const CARD_H = 2.70;
const CARD_D = 0.077;

const GRAY_MID = new THREE.Color('#F7F7EA');
const ACCENT: Record<number, THREE.Color> = {
  0: new THREE.Color('#C0C0A8'),
  1: new THREE.Color('#E9A254'),
  2: new THREE.Color('#EEBF79'),
  3: new THREE.Color('#07AFC1'),
  4: new THREE.Color('#70D4D5'),
};

const CARD_COLORS = ['#C0C0A8', '#E9A254', '#EEBF79', '#07AFC1', '#70D4D5'];
const CARD_KEYS = ['~', '1', '2', '3', '4'];

const CARD_LABELS = [
  { tag: 'NUCLEUS: MASTER', title: 'SETTINGS', sub: 'Master Synergy Control', freq: 'SYSTEM ANCHOR' },
  { tag: 'ADIOS: TYPE-A', title: 'CHEMICAL SYNAPSE', sub: 'Vesicle Upload', freq: 'FREQ: 99.5 HZ' },
  { tag: 'STANDBY: C', title: 'HORMONE NOTE', sub: 'Cellular Reflex', freq: 'AWAITING IMPULSE' },
  { tag: 'BIEN: TYPE-B', title: 'ELECTRICAL SYNAPSE', sub: 'Gap Junction / P2P', freq: 'FREQ: ACTIVE' },
  { tag: 'STANDBY: D', title: 'ACTION POTENTIAL', sub: 'Enzyme Potential', freq: 'AWAITING IMPULSE' },
];

const TOTAL_CARDS = 60;
const BLACK_INDEX = 20;
const RADIUS = 8.5;
const BASE_DELTA_PHI = 0.045;
const ACTIVE_X = 1.25;

const LERP_ACTIVE = 0.09;
const LERP_REST = 0.10;
const LERP_MAT = 0.08;

interface CardState {
  pos: THREE.Vector3;
  color: THREE.Color;
  opacity: number;
  roughness: number;
}

interface MenuCardsProps {
  mode: number;
  cardXRef: React.MutableRefObject<number[]>;
  isFocused: boolean;
}

const MenuCards: React.FC<MenuCardsProps> = ({ mode, cardXRef, isFocused }) => {
  const colorRefs = useRef<THREE.Mesh[]>([]);
  const matRefs = useRef<THREE.Material[]>([]);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const keyRefs = useRef<(HTMLDivElement | null)[]>([]);

  const getBaseGrey = (j: number) => {
    if (j === BLACK_INDEX) return new THREE.Color('#C0C0A8');
    const d = Math.abs(j - BLACK_INDEX);
    const maxD = j < BLACK_INDEX ? BLACK_INDEX : (TOTAL_CARDS - 1 - BLACK_INDEX);
    const ratio = d / maxD;
    const c1 = new THREE.Color('#C0C0A8');
    const c2 = new THREE.Color('#F7F7EA');
    return c1.clone().lerp(c2, ratio);
  };

  const textures = React.useMemo(() => {
    return CARD_COLORS.map((colorHex, idx) => {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.fillStyle = colorHex; ctx.fillRect(0, 0, 256, 512);
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 3.0; ctx.strokeRect(10, 10, 236, 492);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    });
  }, []);

  const cardStates = useRef<CardState[]>(
    Array.from({ length: TOTAL_CARDS }).map((_, j) => {
      const d = j - BLACK_INDEX;
      let baseOpacity = j <= BLACK_INDEX ? Math.pow(Math.max(0, 1.0 - (BLACK_INDEX - j) / BLACK_INDEX), 2.2) : Math.pow(Math.max(0, 1.0 - (j - BLACK_INDEX) / (TOTAL_CARDS - 1 - BLACK_INDEX)), 1.8);
      return {
        pos: new THREE.Vector3(-RADIUS + RADIUS * Math.cos(d * BASE_DELTA_PHI), 0, -RADIUS * Math.sin(d * BASE_DELTA_PHI)),
        color: new THREE.Color('#ffffff'),
        opacity: baseOpacity,
        roughness: j === BLACK_INDEX ? 0.45 : 0.65,
      };
    })
  );

  const prevMode = useRef(mode);
  const switchTime = useRef(-20.0);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (prevMode.current !== mode) {
      const oldMode = prevMode.current; const oldActive = BLACK_INDEX + oldMode; const newActive = BLACK_INDEX + mode;
      prevMode.current = mode; switchTime.current = t;
      const prevMat = matRefs.current[oldActive] as any; const prevMesh = colorRefs.current[oldActive];
      if (prevMat) { try { prevMat.transparent = true; prevMat.depthWrite = false; } catch (e) { } }
      if (prevMesh) { try { prevMesh.renderOrder = 0; } catch (e) { } }
      const newMat = matRefs.current[newActive] as any; const newMesh = colorRefs.current[newActive];
      if (newMat) { try { newMat.transparent = false; newMat.opacity = 1.0; newMat.depthWrite = true; } catch (e) { } }
      if (newMesh) { try { newMesh.renderOrder = 2000; } catch (e) { } }
    }

    const activeIdx = BLACK_INDEX + mode;
    const activeState = cardStates.current[activeIdx];
    const activeRestX = activeState ? -RADIUS + RADIUS * Math.cos((activeIdx - BLACK_INDEX) * BASE_DELTA_PHI) : 0.0;
    const activeProgress = activeState ? Math.min(1, Math.max(0, (activeState.pos.x - activeRestX) / ACTIVE_X)) : 0.0;
    const dt = t - switchTime.current;

    for (let j = 0; j < TOTAL_CARDS; j++) {
      const mesh = colorRefs.current[j]; const mat = matRefs.current[j] as any;
      if (!mesh || !mat) continue;

      const d = j - BLACK_INDEX;
      let swallowOffset = 0;
      if (j > activeIdx) swallowOffset = -0.5 * activeProgress;
      else if (j < activeIdx) swallowOffset = 0.5 * activeProgress;

      const dist = Math.abs(j - activeIdx);
      const localDt = dt - dist / 45.0;
      const localPulse = localDt < 0 ? 0 : 0.85 * Math.sin(2 * Math.PI * 1.25 * localDt) * Math.exp(-3.5 * localDt);
      const phi = (d + swallowOffset) * BASE_DELTA_PHI * (1.0 + localPulse);

      const restX = -RADIUS + RADIUS * Math.cos(phi);
      const restZ = -RADIUS * Math.sin(phi);
      const isInteractive = j >= 20 && j <= 24; const modeIdx = j - 20; const isActive = isInteractive && modeIdx === mode;
      const state = cardStates.current[j]; if (!state) continue;

      let targetX = isActive ? restX + ACTIVE_X : restX;
      let targetZ = isActive ? restZ + 0.11 : restZ;

      // 🌟 核心剔除：彻底删除原本在这里的 SHIFT_OUT_X 强制突变平移，维护初始位置绝对不动 🌟

      const target = new THREE.Vector3(targetX, 0, targetZ);
      state.pos.lerp(target, isActive ? LERP_ACTIVE : LERP_REST);
      mesh.position.copy(state.pos);
      mesh.rotation.y = phi;

      const xProgress = Math.min(1, Math.max(0, (state.pos.x - restX) / ACTIVE_X));

      if (isInteractive) {
        if (isActive) {
          state.color.set('#ffffff'); if (mat.color) mat.color.copy(state.color);
          mat.transparent = false; mat.opacity = 1.0;
        } else {
          state.color.set('#ffffff'); if (mat.color) mat.color.copy(state.color);
          mat.transparent = true;
          // 推进取件时，其余卡片优雅进行虚化透明淡出
          const targetRestOpacity = (mode === 1 && isFocused) ? 0.05 : 0.40;
          mat.opacity = THREE.MathUtils.lerp(mat.opacity ?? 0, targetRestOpacity, 0.1);
        }
      } else {
        let targetColor = getBaseGrey(j); state.color.lerp(targetColor, LERP_MAT);
        if (mat.color) mat.color.copy(state.color);
        mat.transparent = true;
        // 推进取件时，装饰背景卡牌同步淡出
        const targetRestOpacity = (mode === 1 && isFocused) ? 0.02 : state.opacity;
        mat.opacity = THREE.MathUtils.lerp(mat.opacity ?? 0, targetRestOpacity, 0.1);
      }

      if (isInteractive) {
        if ('transparent' in mat) { mat.transparent = !isActive; if ('depthWrite' in mat) mat.depthWrite = isActive; }
        const textOpacity = (mode === 1 && isFocused) ? 0 : Math.min(1, Math.max(0, (xProgress - 0.85) / 0.15));
        const labelEl = labelRefs.current[modeIdx]; if (labelEl) labelEl.style.opacity = String(textOpacity);
        const keyEl = keyRefs.current[modeIdx]; if (keyEl) keyEl.style.opacity = String(textOpacity);
        cardXRef.current[modeIdx] = state.pos.x;
      }
    }
  });

  return (
    <group>
      {Array.from({ length: TOTAL_CARDS }).map((_, idx) => {
        const j = TOTAL_CARDS - 1 - idx; const d = j - BLACK_INDEX; const isInteractive = j >= 20 && j <= 24; const modeIdx = j - 20; const isBlack = j === BLACK_INDEX;
        let initialOpacity = j <= BLACK_INDEX ? Math.pow(Math.max(0, 1.0 - (BLACK_INDEX - j) / BLACK_INDEX), 2.2) : Math.pow(Math.max(0, 1.0 - (j - BLACK_INDEX) / (TOTAL_CARDS - 1 - BLACK_INDEX)), 1.8);

        return (
          <mesh key={j} ref={el => { if (el) colorRefs.current[j] = el; }} position={[-RADIUS + RADIUS * Math.cos(d * BASE_DELTA_PHI), 0, -RADIUS * Math.sin(d * BASE_DELTA_PHI)]}>
            <RoundedBox args={isBlack ? [CARD_W, CARD_H, CARD_D + 0.01] : [CARD_W, CARD_H, CARD_D]} radius={0.045} smoothness={5}>
              {isInteractive ? (
                <meshBasicMaterial ref={el => { if (el) matRefs.current[j] = el as THREE.MeshBasicMaterial; }} map={textures[modeIdx] || null} transparent opacity={initialOpacity} />
              ) : (
                <meshStandardMaterial ref={el => { if (el) matRefs.current[j] = el as THREE.MeshStandardMaterial; }} color="#F0E8D0" roughness={1.0} metalness={0.0} transparent opacity={initialOpacity} />
              )}
            </RoundedBox>
            {isBlack && <group position={[0, 0, 0.005]}><ReceptorGrid active={mode === 2 || mode === 4} accentColor={ACCENT[mode]} /></group>}
            {isInteractive && (
              <>
                <group position={[-0.12, 0.98, CARD_D / 2 + 0.01]}>
                  <Html transform distanceFactor={5.5} pointerEvents="none">
                    <div ref={el => { keyRefs.current[modeIdx] = el; }} style={{ fontFamily: "Menlo, Monaco, 'Courier New', monospace", color: '#ffffff', fontSize: '32px', fontWeight: 900, opacity: 0 }}>{CARD_KEYS[modeIdx]}</div>
                  </Html>
                </group>
                <group position={[2.55, -0.65, CARD_D / 2 + 0.01]}>
                  <Html transform distanceFactor={5.5} pointerEvents="none">
                    <div ref={el => { labelRefs.current[modeIdx] = el; }} style={{ fontFamily: "Menlo, Monaco, 'Courier New', monospace", width: '280px', display: 'flex', flexDirection: 'column', gap: '6px', opacity: 0, color: '#2c2520' }}>
                      <span style={{ alignSelf: 'flex-start', background: CARD_COLORS[modeIdx], color: '#ffffff', fontSize: '9px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '1px', letterSpacing: '1.5px' }}>{CARD_LABELS[modeIdx].tag}</span>
                      <h1 style={{ fontSize: '19px', fontWeight: 'bold', letterSpacing: '2px', margin: '2px 0 0 0' }}>{CARD_LABELS[modeIdx].title}</h1>
                      <span style={{ fontSize: '11px', color: '#6e645e' }}>{CARD_LABELS[modeIdx].sub}</span>
                      <span style={{ fontSize: '9px', color: '#a09690', letterSpacing: '1px' }}>{CARD_LABELS[modeIdx].freq}</span>
                    </div>
                  </Html>
                </group>
              </>
            )}
          </mesh>
        );
      })}
    </group>
  );
};

export default MenuCards;