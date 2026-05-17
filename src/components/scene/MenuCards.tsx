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
  0: new THREE.Color('#C0C0A8'),   // Warm bronze brown (black card)
  1: new THREE.Color('#E9A254'),   // Soft peach red
  2: new THREE.Color('#EEBF79'),   // Fresh lime green (swapped)
  3: new THREE.Color('#07AFC1'),   // Warm golden yellow (swapped)
  4: new THREE.Color('#70D4D5'),   // Soft slate grey-blue
};

const CARD_COLORS = ['#C0C0A8', '#E9A254', '#EEBF79', '#07AFC1', '#70D4D5'];
// Unified rest color for non-active stacked cards to avoid color pollution and flashing
const REST_BROWN_COLOR = new THREE.Color('#4a3532');

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
const BLACK_INDEX = 20;          // Black card at index 20 (20 front, 1 black, 39 back)
const RADIUS = 8.5;              // Radius of the fanning circle
const BASE_DELTA_PHI = 0.045;    // Spacing angle in radians (~2.5 degrees)
const ACTIVE_X = 1.25;           // Perfectly reduced horizontal extraction distance (1-card gap)

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

  // Base fill
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, 256, 512);

  // Subtle dark gradient underlay for visual depth
  // Removed strong dark bottom gradient to keep card base colors clean.
  // If a subtle highlight is needed, it can be added later with low alpha.

  // Vector grooves drawing
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2.0;

  if (type === 0) {
    // Black Card: Concentric circular synergy rings
    ctx.beginPath();
    ctx.arc(128, 256, 45, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(128, 256, 75, 0, Math.PI * 2);
    ctx.stroke();
    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(128, 160); ctx.lineTo(128, 352);
    ctx.moveTo(32, 256); ctx.lineTo(224, 256);
    ctx.stroke();
  } else if (type === 1) {
    // Mode 1: Vesicle vertical thread nodes texture
    for (let i = 50; i <= 200; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 40);
      ctx.lineTo(i, 472);
      ctx.stroke();
      // dots
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(i, 120 + i * 1.2, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 2) {
    // Mode 2: Gap junction diagonal grid
    for (let i = -150; i < 400; i += 45) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 150, 512);
      ctx.stroke();
    }
  } else if (type === 3) {
    // Mode 3: Hormone biological blobs
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(50 + i * 32, 80 + i * 75, 20 + i * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (type === 4) {
    // Mode 4: Action potential sharp square impulse wave
    ctx.beginPath();
    ctx.moveTo(25, 256);
    ctx.lineTo(80, 256);
    ctx.lineTo(100, 150);
    ctx.lineTo(130, 362);
    ctx.lineTo(150, 256);
    ctx.lineTo(231, 256);
    ctx.stroke();
  }

  // High-tech outer margin border
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3.0;
  ctx.strokeRect(10, 10, 236, 492);

  const texture = new THREE.CanvasTexture(canvas);
  
  // ─── 核心修复：强制告诉 Three.js，这个 Canvas 的纹理本来就是标准网页 sRGB 空间 ───
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

  // Proximity-based warm ivory to bronze sand-beige gradient calculation
  const getBaseGrey = (j: number) => {
    if (j === BLACK_INDEX) return new THREE.Color('#B8A880');
    const d = Math.abs(j - BLACK_INDEX);
    const maxD = j < BLACK_INDEX ? BLACK_INDEX : (TOTAL_CARDS - 1 - BLACK_INDEX);
    const ratio = d / maxD;
    // Interpolate from warm bronze brown near the black card to warm sand-beige (#F0E8D0) at the tail ends
    const c1 = new THREE.Color('#B8A880');
    const c2 = new THREE.Color('#F0E8D0');
    return c1.clone().lerp(c2, ratio);
  };

  // Pre-cached procedural textures for the 5 interactive cards
  const textures = React.useMemo(() => {
    return CARD_COLORS.map((colorHex, idx) => createCardTexture(colorHex, idx));
  }, []);

  // ── Animated state ─────────────────────────────────────────────
  const cardStates = useRef<CardState[]>(
    Array.from({ length: TOTAL_CARDS }).map((_, j) => {
      const d = j - BLACK_INDEX;
      let baseOpacity = 0;
      if (j <= BLACK_INDEX) {
        const r = (BLACK_INDEX - j) / BLACK_INDEX;
        baseOpacity = Math.pow(Math.max(0, 1.0 - r), 2.2); // Symmetrical non-linear fade for near-end
      } else {
        const r = (j - BLACK_INDEX) / (TOTAL_CARDS - 1 - BLACK_INDEX);
        baseOpacity = Math.pow(Math.max(0, 1.0 - r), 1.8); // Symmetrical non-linear fade for far-end
      }

      return {
        pos: new THREE.Vector3(
          -RADIUS + RADIUS * Math.cos(d * BASE_DELTA_PHI),
          0,
          -RADIUS * Math.sin(d * BASE_DELTA_PHI)
        ),
        color: getBaseGrey(j),
        opacity: baseOpacity,
        roughness: j === BLACK_INDEX ? 0.45 : 0.65,
      };
    })
  );

  // ── Mode-change expansion ───────────────────────────────────────
  const prevMode   = useRef(mode);
  const switchTime = useRef(-20.0);   // clock seconds at last switch

  // ── useFrame ───────────────────────────────────────────────────
  // ── useFrame ───────────────────────────────────────────────────
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Detect mode switch and perform a one-time material swap for previous/new active cards
    if (prevMode.current !== mode) {
      const oldMode = prevMode.current;
      const oldActive = BLACK_INDEX + oldMode;
      const newActive = BLACK_INDEX + mode;

      prevMode.current = mode;
      switchTime.current = t;

      // restore previous active card to be transparent (allow it to fade)
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

      // force new active card to be opaque immediately and draw on top to avoid blending/artifacting
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
          if (newMat.color && CARD_COLORS[mode]) newMat.color.setStyle?.(CARD_COLORS[mode]);
          if (newMat.emissive && CARD_COLORS[mode]) newMat.emissive.setStyle?.(CARD_COLORS[mode]);
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

    // ─── 开始遍历 60 张卡牌 ───
    for (let j = 0; j < TOTAL_CARDS; j++) {
      const mesh = colorRefs.current[j];
      const mat  = matRefs.current[j] as any;
      if (!mesh || !mat) continue;

      const d = j - BLACK_INDEX;

      // ── Space Swallowing (Gap Closure) ──
      let swallowOffset = 0;
      if (j > activeIdx) {
        swallowOffset = -0.5 * activeProgress;
      } else if (j < activeIdx) {
        swallowOffset = 0.5 * activeProgress;
      }
      const swallowedD = d + swallowOffset;

      // ── Water Ripple Domino Spacing Wave ──
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

      // ── Position Target & Lerp ──
      const target = isActive
        ? new THREE.Vector3(restX + ACTIVE_X, 0, restZ + 0.11)
        : new THREE.Vector3(restX, 0, restZ);

      state.pos.lerp(target, isActive ? LERP_ACTIVE : LERP_REST);
      mesh.position.copy(state.pos);
      mesh.rotation.y = phi;

      // ─── 修正核心：将公共数学参数提前到这里计算，彻底解决未定义报错 ───
      const xProgress = Math.min(1, Math.max(0, (state.pos.x - restX) / ACTIVE_X));

      let baseOpacity = 0;
      if (j <= BLACK_INDEX) {
        const r = (BLACK_INDEX - j) / BLACK_INDEX;
        baseOpacity = Math.pow(Math.max(0, 1.0 - r), 2.2); 
      } else {
        const r = (j - BLACK_INDEX) / (TOTAL_CARDS - 1 - BLACK_INDEX);
        baseOpacity = Math.pow(Math.max(0, 1.0 - r), 1.8); 
      }
      // ─────────────────────────────────────────────────────────────────

      // ── Color Handling & Opacity Fix (优雅隐褪，告别泥土褐) ──
      // ── Color Handling & Opacity Fix (5张交互卡行为完全对齐) ──
      // ── Color Handling & Opacity Fix (5张卡完全统一，0号不再有特权) ──
      if (isInteractive) {
        if (isActive) {
          // 活跃激活状态：所有 5 张交互卡激活时，材质色全部保持纯白（#ffffff）
          // 这样显卡渲染时才能 100% 无损暴露出它们各自在 Canvas 纹理里画好的原生鲜艳色彩！
          state.color.set('#ffffff');
          if (mat.color) mat.color.copy(state.color);
          
          mat.transparent = false;
          mat.opacity = 1.0;
        } else {
          // 退回牌堆（非活跃）状态：所有 5 张卡统一归位纯白 (#ffffff)，防止相乘变暗
          state.color.set('#ffffff');
          if (mat.color) mat.color.copy(state.color);
          
          // 统一开启半透明消隐，让它们优雅地在牌堆里变成 40% 的半透明象牙白
          mat.transparent = true;
          mat.opacity = THREE.MathUtils.lerp(mat.opacity ?? 0, 0.40, 0.1);
        }
      } else {
        // 其余 55 张纯背景装饰卡保持原有精美渐变逻辑
        let targetColor = getBaseGrey(j);
        state.color.lerp(targetColor, LERP_MAT);
        if (mat.color) mat.color.copy(state.color);
        if (mat.emissive) mat.emissive.lerp(state.color, LERP_MAT);

        mat.transparent = true;
        const depthOpacity = baseOpacity + (1.0 - baseOpacity) * xProgress;
        state.opacity = THREE.MathUtils.lerp(state.opacity, isActive ? depthOpacity : baseOpacity, LERP_MAT);
        mat.opacity = state.opacity;
      }

      // ── Roughness (only for standard materials) ──
      if ('roughness' in mat) {
        const baseRoughness = j === BLACK_INDEX ? 0.45 : 0.65;
        const targetRoughness = isActive
          ? THREE.MathUtils.lerp(baseRoughness, 0.18, xProgress)
          : baseRoughness;
        state.roughness = THREE.MathUtils.lerp(state.roughness, targetRoughness, LERP_MAT);
        mat.roughness   = state.roughness;
        mat.metalness   = isActive ? THREE.MathUtils.lerp(0.02, 0.12, xProgress) : (j === BLACK_INDEX ? 0.22 : 0.02);
      }

      // 统一 5 张交互卡的透明度与深度写入逻辑，防止穿帮
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

      // ── Roughness (only for standard materials) ──
      if ('roughness' in mat) {
        const baseRoughness = j === BLACK_INDEX ? 0.45 : 0.65;
        const targetRoughness = isActive
          ? THREE.MathUtils.lerp(baseRoughness, 0.18, xProgress)
          : baseRoughness;
        state.roughness = THREE.MathUtils.lerp(state.roughness, targetRoughness, LERP_MAT);
        mat.roughness   = state.roughness;
        mat.metalness   = isActive ? THREE.MathUtils.lerp(0.02, 0.12, xProgress) : (j === BLACK_INDEX ? 0.22 : 0.02);
      }

      // 为所有交互卡在非活跃时，或装饰卡透明时，正确写入 depthWrite
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

      // For all non-colored-interactive cards (black + non-interactive stack)
      if (!(isInteractive && modeIdx !== 0)) {
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
        if (labelEl) {
          labelEl.style.opacity = String(textOpacity);
        }
        const keyEl = keyRefs.current[modeIdx];
        if (keyEl) {
          keyEl.style.opacity = String(textOpacity);
        }

        cardXRef.current[modeIdx] = state.pos.x;
      }
    }
  });

  return (
    <group>
      {/* 60 stack cards (rendered back → front for correct WebGL blending) */}
      {Array.from({ length: TOTAL_CARDS }).map((_, idx) => {
        const j = TOTAL_CARDS - 1 - idx; // 59 down to 0
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
              receiveShadow={isBlack}
            >
            <RoundedBox
              args={isBlack ? [CARD_W, CARD_H, CARD_D + 0.01] : [CARD_W, CARD_H, CARD_D]}
              radius={0.045}
              smoothness={5}
            >
              {/* ─── 核心修正：5张可交互卡片（modeIdx 0 到 4）全部统一使用 meshBasicMaterial ─── */}
              {isInteractive ? (
                <meshBasicMaterial
                  ref={el => { if (el) matRefs.current[j] = el as THREE.MeshBasicMaterial; }}
                  map={textures[modeIdx] || null}
                  transparent
                  opacity={initialOpacity}
                />
              ) : (
                /* 其余 55 张纯背景装饰卡继续使用标准的物理象牙白材质 */
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

            {/* Receptor grid overlay for the black card anchor */}
            {isBlack && (
              <group position={[0, 0, 0.005]}>
                <ReceptorGrid active={mode === 2 || mode === 4} accentColor={ACCENT[mode]} />
              </group>
            )}

            {/* 
              3D Nested Text HUD Overlay:
              Positioned exactly at [1.22, -0.6, 0.05] (directly to the right of the extracted card).
              Using Drei transform attribute to project with camera 3D perspective and tilt!
            */}
            {isInteractive && (
              <group position={[2.82, -0.85, 0.05]}>
                <Html
                  transform
                  distanceFactor={5.5}
                  pointerEvents="none"
                  style={{
                    width: '320px',
                    fontFamily: "Menlo, Monaco, 'Courier New', monospace",
                  }}
                >
                  <div
                    ref={el => { labelRefs.current[modeIdx] = el; }}
                    style={{
                      willChange: 'transform, opacity',
                      opacity: 0, // initially hidden; useFrame handles fading snapping
                    }}
                  >
                    {/* Badge */}
                    <div style={{
                      display: 'inline-block',
                      background: CARD_COLORS[modeIdx],
                      color: '#fff',
                      fontSize: '8.5px',
                      fontWeight: 900,
                      letterSpacing: '2.5px',
                      padding: '2px 8px',
                      marginBottom: '6px',
                      textTransform: 'uppercase',
                    }}>
                      {CARD_LABELS[modeIdx].tag}
                    </div>

                    {/* Title */}
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 800,
                      letterSpacing: '1.8px',
                      color: '#2c2520',
                      lineHeight: 1.2,
                      marginBottom: '3px',
                      textTransform: 'uppercase',
                    }}>
                      {CARD_LABELS[modeIdx].title}
                    </div>

                    {/* Sub */}
                    <div style={{
                      fontSize: '10.5px',
                      fontWeight: 400,
                      letterSpacing: '1.2px',
                      color: '#6e645e',
                      marginBottom: '5px',
                    }}>
                      {CARD_LABELS[modeIdx].sub}
                    </div>

                    {/* Frequency */}
                    <div style={{
                      fontSize: '7.5px',
                      letterSpacing: '1.5px',
                      color: '#8e847e',
                    }}>
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
                    style={{
                      width: '140px',
                      opacity: 0.5,
                      fontFamily: "'Courier New', monospace",
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <div ref={el => { keyRefs.current[modeIdx] = el; }} style={{
                      display: 'inline-block',
                      background: 'transparent',
                      color: '#ffffff',
                      fontSize: '24px',
                      fontWeight: 900,
                      padding: '8px 14px',
                      borderRadius: '10px',
                      letterSpacing: '2px',
                      textAlign: 'center',
                      opacity: 0,
                      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
                    }}>
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
