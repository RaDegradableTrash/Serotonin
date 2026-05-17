import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Html } from '@react-three/drei';
import * as THREE from 'three';
import ReceptorGrid from './ReceptorGrid';

// ── Geometry ────────────────────────────────────────────────────────
const CARD_W = 0.82;
const CARD_H = 2.70;
const CARD_D = 0.077;

// ── Colors ──────────────────────────────────────────────────────────
const GRAY_MID   = new THREE.Color('#F7F7EA');  // rest ivory beige color for interactive cards
const ACCENT: Record<number, THREE.Color> = {
  0: new THREE.Color('#C0C0A8'),   
  1: new THREE.Color('#E9A254'),   
  2: new THREE.Color('#EEBF79'),   
  3: new THREE.Color('#07AFC1'),   
  4: new THREE.Color('#70D4D5'),   
};

const CARD_COLORS = ['#C0C0A8', '#E9A254', '#EEBF79', '#07AFC1', '#70D4D5'];

// Primary key labels for the 5 interactive cards (index 0..4)
const CARD_KEYS = ['~', '1', '2', '3', '4'];

const CARD_LABELS = [
  { tag: 'NUCLEUS: MASTER', title: 'SEROTONIN NUCLEUS', sub: 'Master Synergy Control', freq: 'SYSTEM ANCHOR' },
  { tag: 'ADIOS: TYPE-A',   title: 'CHEMICAL SYNAPSE',  sub: 'Vesicle Upload',          freq: 'FREQ: 99.5 HZ'     },
  { tag: 'STANDBY: C',      title: 'HORMONE NOTE',       sub: 'Cellular Reflex',        freq: 'AWAITING IMPULSE'   },
  { tag: 'BIEN: TYPE-B',    title: 'ELECTRICAL SYNAPSE', sub: 'Gap Junction / P2P',    freq: 'FREQ: ACTIVE'       },
  { tag: 'STANDBY: D',      title: 'ACTION POTENTIAL',   sub: 'Enzyme Potential',       freq: 'AWAITING IMPULSE'   },
];

// ── Extended Circular Queue Constants ───────────────────────────────
const TOTAL_CARDS = 60;
const BLACK_INDEX = 20;          
const RADIUS = 8.5;              
const BASE_DELTA_PHI = 0.045;    
const ACTIVE_X = 1.25;           

// ── Lerp Speeds ─────────────────────────────────────────────────────
const LERP_ACTIVE = 0.09;
const LERP_REST   = 0.10;
const LERP_MAT    = 0.08;

interface CardState {
  pos: THREE.Vector3;
  color: THREE.Color;
  opacity: number;
  roughness: number;
}

// ── Procedural Card Textures ──────────────────────────────────────────
const createCardTexture = (colorHex: string, type: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 256, 512);

  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2.0;

  if (type === 0) {
    ctx.beginPath();
    ctx.arc(128, 256, 45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 256, 75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(128, 160); ctx.lineTo(128, 352);
    ctx.moveTo(32, 256); ctx.lineTo(224, 256);
    ctx.stroke();
  } else if (type === 1) {
    for (let i = 50; i <= 200; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 40);
      ctx.lineTo(i, 472);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(i, 120 + i * 1.2, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 2) {
    for (let i = -150; i < 400; i += 45) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 150, 512);
      ctx.stroke();
    }
  } else if (type === 3) {
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(50 + i * 32, 80 + i * 75, 20 + i * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 4) {
    ctx.beginPath();
    ctx.moveTo(25, 256);
    ctx.lineTo(80, 256);
    ctx.lineTo(100, 150);
    ctx.lineTo(130, 362);
    ctx.lineTo(150, 256);
    ctx.lineTo(231, 256);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3.0;
  ctx.strokeRect(10, 10, 236, 492);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; 
  return texture;
};

interface MenuCardsProps {
  mode: number;
  cardXRef: React.MutableRefObject<number[]>;
}

const MenuCards: React.FC<MenuCardsProps> = ({ mode, cardXRef }) => {
  const colorRefs = useRef<THREE.Mesh[]>([]);
  const matRefs   = useRef<THREE.Material[]>([]);
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
    return CARD_COLORS.map((colorHex, idx) => createCardTexture(colorHex, idx));
  }, []);

  const cardStates = useRef<CardState[]>(
    Array.from({ length: TOTAL_CARDS }).map((_, j) => {
      const d = j - BLACK_INDEX;
      let baseOpacity = 0;
      if (j <= BLACK_INDEX) {
        const r = (BLACK_INDEX - j) / BLACK_INDEX;
        baseOpacity = Math.pow(Math.max(0, 1.0 - r), 2.2); 
      } else {
        const r = (j - BLACK_INDEX) / (TOTAL_CARDS - 1 - BLACK_INDEX);
        baseOpacity = Math.pow(Math.max(0, 1.0 - r), 1.8); 
      }

      return {
        pos: new THREE.Vector3(
          -RADIUS + RADIUS * Math.cos(d * BASE_DELTA_PHI),
          0,
          -RADIUS * Math.sin(d * BASE_DELTA_PHI)
        ),
        color: new THREE.Color('#ffffff'), // 初始统一为白，由 useFrame 第一帧正确染色
        opacity: baseOpacity,
        roughness: j === BLACK_INDEX ? 0.45 : 0.65,
      };
    })
  );

  const prevMode   = useRef(mode);
  const switchTime = useRef(-20.0);   

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (prevMode.current !== mode) {
      const oldMode = prevMode.current;
      const oldActive = BLACK_INDEX + oldMode;
      const newActive = BLACK_INDEX + mode;

      prevMode.current = mode;
      switchTime.current = t;

      const prevMat = matRefs.current[oldActive] as any;
      const prevMesh = colorRefs.current[oldActive];
      if (prevMat) {
        try {
          if ('transparent' in prevMat) prevMat.transparent = true;
          if ('depthWrite' in prevMat) prevMat.depthWrite = false;
        } catch (e) {}
      }
      if (prevMesh) {
        try { prevMesh.renderOrder = 0; } catch (e) {}
      }

      const newMat = matRefs.current[newActive] as any;
      const newMesh = colorRefs.current[newActive];
      if (newMat) {
        try {
          if ('transparent' in newMat) newMat.transparent = false;
          if ('opacity' in newMat) newMat.opacity = 1.0;
          if ('depthWrite' in newMat) newMat.depthWrite = true;
          if ('polygonOffset' in newMat) {
            newMat.polygonOffset = true;
            newMat.polygonOffsetFactor = -1;
            newMat.polygonOffsetUnits = -4;
          }
        } catch (e) {}
      }
      if (newMesh) {
        try { newMesh.renderOrder = 2000; } catch (e) {}
      }
    }

    const activeIdx = BLACK_INDEX + mode;
    const activeState = cardStates.current[activeIdx];
    const activeRestX = activeState ? -RADIUS + RADIUS * Math.cos((activeIdx - BLACK_INDEX) * BASE_DELTA_PHI) : 0.0;
    const activeProgress = activeState
      ? Math.min(1, Math.max(0, (activeState.pos.x - activeRestX) / ACTIVE_X))
      : 0.0;

    const dt = t - switchTime.current;

    for (let j = 0; j < TOTAL_CARDS; j++) {
      const mesh = colorRefs.current[j];
      const mat  = matRefs.current[j] as any;
      if (!mesh || !mat) continue;

      const d = j - BLACK_INDEX;

      let swallowOffset = 0;
      if (j > activeIdx) {
        swallowOffset = -0.5 * activeProgress;
      } else if (j < activeIdx) {
        swallowOffset = 0.5 * activeProgress;
      }
      const swallowedD = d + swallowOffset;

      const dist = Math.abs(j - activeIdx);
      const localDt = dt - dist / 45.0;
      const localPulse = localDt < 0
        ? 0
        : 0.85 * Math.sin(2 * Math.PI * 1.25 * localDt) * Math.exp(-3.5 * localDt);
      const localExpansion = 1.0 + localPulse;

      const phi = swallowedD * BASE_DELTA_PHI * localExpansion;

      const restX = -RADIUS + RADIUS * Math.cos(phi);
      const restZ = -RADIUS * Math.sin(phi);

      const isInteractive = j >= 20 && j <= 24;
      const modeIdx = j - 20; 
      const isActive = isInteractive && modeIdx === mode;

      const state = cardStates.current[j];
      if (!state) continue;

      const target = isActive
        ? new THREE.Vector3(restX + ACTIVE_X, 0, restZ + 0.11)
        : new THREE.Vector3(restX, 0, restZ);

      state.pos.lerp(target, isActive ? LERP_ACTIVE : LERP_REST);
      mesh.position.copy(state.pos);
      mesh.rotation.y = phi;

      const xProgress = Math.min(1, Math.max(0, (state.pos.x - restX) / ACTIVE_X));

      let baseOpacity = 0;
      if (j <= BLACK_INDEX) {
        const r = (BLACK_INDEX - j) / BLACK_INDEX;
        baseOpacity = Math.pow(Math.max(0, 1.0 - r), 2.2); 
      } else {
        const r = (j - BLACK_INDEX) / (TOTAL_CARDS - 1 - BLACK_INDEX);
        baseOpacity = Math.pow(Math.max(0, 1.0 - r), 1.8); 
      }

      // ── Color Handling & Opacity Fix (5张卡完全统一，100%无损释放色彩) ──
      if (isInteractive) {
        if (isActive) {
          state.color.set('#ffffff');
          if (mat.color) mat.color.copy(state.color);
          mat.transparent = false;
          mat.opacity = 1.0;
        } else {
          state.color.set('#ffffff');
          if (mat.color) mat.color.copy(state.color);
          mat.transparent = true;
          mat.opacity = THREE.MathUtils.lerp(mat.opacity ?? 0, 0.40, 0.1);
        }
      } else {
        let targetColor = getBaseGrey(j);
        state.color.lerp(targetColor, LERP_MAT);
        if (mat.color) mat.color.copy(state.color);
        if (mat.emissive) mat.emissive.lerp(state.color, LERP_MAT);

        mat.transparent = true;
        const depthOpacity = baseOpacity + (1.0 - baseOpacity) * xProgress;
        state.opacity = THREE.MathUtils.lerp(state.opacity, isActive ? depthOpacity : baseOpacity, LERP_MAT);
        mat.opacity = state.opacity;
      }

      // ── Roughness & Metalness (只针对装饰卡的 standard 材质) ──
      if ('roughness' in mat) {
        const baseRoughness = j === BLACK_INDEX ? 0.45 : 0.65;
        const targetRoughness = isActive ? THREE.MathUtils.lerp(baseRoughness, 0.18, xProgress) : baseRoughness;
        state.roughness = THREE.MathUtils.lerp(state.roughness, targetRoughness, LERP_MAT);
        mat.roughness   = state.roughness;
        mat.metalness   = isActive ? THREE.MathUtils.lerp(0.02, 0.12, xProgress) : (j === BLACK_INDEX ? 0.22 : 0.02);
      }

      // ── 深度与透明混合防打架逻辑 ──
      if (isInteractive) {
        if ('transparent' in mat) {
          mat.transparent = !isActive;
          if ('depthWrite' in mat) mat.depthWrite = isActive;
        }
      } else {
        if ('transparent' in mat) {
          const shouldBeTransparent = state.opacity < 0.995;
          mat.transparent = shouldBeTransparent;
          if ('depthWrite' in mat) mat.depthWrite = !shouldBeTransparent;
        }
      }

      // ── Snappy Text Opacity & 3D Nesting Ref Mutation ──
      if (isInteractive) {
        const textOpacity = Math.min(1, Math.max(0, (xProgress - 0.85) / 0.15));
        const labelEl = labelRefs.current[modeIdx];
        if (labelEl) labelEl.style.opacity = String(textOpacity);
        const keyEl = keyRefs.current[modeIdx];
        if (keyEl) keyEl.style.opacity = String(textOpacity);

        cardXRef.current[modeIdx] = state.pos.x;
      }
    }
  });

  return (
    <group>
      {Array.from({ length: TOTAL_CARDS }).map((_, idx) => {
        const j = TOTAL_CARDS - 1 - idx; 
        const d = j - BLACK_INDEX;
        const isInteractive = j >= 20 && j <= 24;
        const modeIdx = j - 20;

        let initialOpacity = 0;
        if (j <= BLACK_INDEX) {
          const r = (BLACK_INDEX - j) / BLACK_INDEX;
          initialOpacity = Math.pow(Math.max(0, 1.0 - r), 2.2);
        } else {
          const r = (j - BLACK_INDEX) / (TOTAL_CARDS - 1 - BLACK_INDEX);
          initialOpacity = Math.pow(Math.max(0, 1.0 - r), 1.8);
        }

        const isBlack = j === BLACK_INDEX;

        return (
          <mesh
              key={j}
              ref={el => { if (el) colorRefs.current[j] = el; }}
              position={[
                -RADIUS + RADIUS * Math.cos(d * BASE_DELTA_PHI),
                0,
                -RADIUS * Math.sin(d * BASE_DELTA_PHI)
              ]}
            >
            <RoundedBox
              args={isBlack ? [CARD_W, CARD_H, CARD_D + 0.01] : [CARD_W, CARD_H, CARD_D]}
              radius={0.045}
              smoothness={5}
            >
              {isInteractive ? (
                <meshBasicMaterial
                  ref={el => { if (el) matRefs.current[j] = el as THREE.MeshBasicMaterial; }}
                  map={textures[modeIdx] || null}
                  transparent
                  opacity={initialOpacity}
                />
              ) : (
                <meshStandardMaterial
                  ref={el => { if (el) matRefs.current[j] = el as THREE.MeshStandardMaterial; }}
                  color="#F0E8D0"
                  emissive={new THREE.Color('#F0E8D0')}
                  emissiveIntensity={0.2}
                  roughness={1.0}
                  metalness={0.0}
                  transparent
                  opacity={initialOpacity}
                />
              )}
            </RoundedBox>

            {isBlack && (
              <group position={[0, 0, 0.005]}>
                <ReceptorGrid active={mode === 2 || mode === 4} accentColor={ACCENT[mode]} />
              </group>
            )}

            {isInteractive && (
              <group position={[2.82, -0.85, 0.05]}>
                <Html
                  transform
                  distanceFactor={5.5}
                  pointerEvents="none"
                  style={{ width: '320px', fontFamily: "Menlo, Monaco, 'Courier New', monospace" }}
                >
                  <div ref={el => { labelRefs.current[modeIdx] = el; }} style={{ willChange: 'transform, opacity', opacity: 0 }}>
                    <div style={{ display: 'inline-block', background: CARD_COLORS[modeIdx], color: '#fff', fontSize: '8.5px', fontWeight: 900, letterSpacing: '2.5px', padding: '2px 8px', marginBottom: '6px', textTransform: 'uppercase' }}>
                      {CARD_LABELS[modeIdx].tag}
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '1.8px', color: '#2c2520', lineHeight: 1.2, marginBottom: '3px', textTransform: 'uppercase' }}>
                      {CARD_LABELS[modeIdx].title}
                    </div>
                    <div style={{ fontSize: '10.5px', fontWeight: 400, letterSpacing: '1.2px', color: '#6e645e', marginBottom: '5px' }}>
                      {CARD_LABELS[modeIdx].sub}
                    </div>
                    <div style={{ fontSize: '7.5px', letterSpacing: '1.5px', color: '#8e847e' }}>
                      {CARD_LABELS[modeIdx].freq}
                    </div>
                  </div>
                </Html>
              </group>
            )}

            {isInteractive && (
              <group position={[-0.07, 0.98, 0.05]}> 
                <Html
                  transform
                  distanceFactor={5.5}
                  pointerEvents="none"
                  style={{ width: '140px', opacity: 0.5, fontFamily: "'Courier New', monospace", display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                >
                  <div ref={el => { keyRefs.current[modeIdx] = el; }} style={{ display: 'inline-block', background: 'transparent', color: '#ffffff', fontSize: '24px', fontWeight: 900, padding: '8px 14px', borderRadius: '10px', letterSpacing: '2px', textAlign: 'center', opacity: 0, fontFamily: "Menlo, Monaco, 'Courier New', monospace" }}>
                    {CARD_KEYS[modeIdx]}
                  </div>
                </Html>
              </group>
            )}
          </mesh>
        );
      })}
    </group>
  );
};

export default MenuCards;