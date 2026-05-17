import { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';

// ─── 核心组件正确路径 ───
import Scene from './components/Scene'; // 它在子文件夹里，这样引入是对的
import UploadStation from './UploadStation';     // 🌟 它就在你旁边，去掉前面的 components/
import RetrieveStation from './RetrieveStation';   // 🌟 它也在你旁边，去掉前面的 components/
// ── Vibrant fresh organic colors ─────────────────────────────────────────
const modeColors: Record<number, string> = {
  0: '#C0C0A8',
  1: '#E9A254',
  2: '#EEBF79',
  3: '#07AFC1',
  4: '#70D4D5',
};

const modeTitles: Record<number, string> = {
  0: 'SEROTONIN NUCLEUS · ANCHOR',
  1: 'CHEMICAL SYNAPSE · VESICLE',
  2: 'ELECTRICAL SYNAPSE · P2P',
  3: 'HORMONE NOTE · REFLEX',
  4: 'ACTION POTENTIAL · ENZYME',
};

function App() {
  const [mode, setMode] = useState<number>(1);
  const [fullscreenActive, setFullscreenActive] = useState<boolean>(false);

  // 5-element array: 1 black + 4 colored interactive cards
  const cardXRef = useRef<number[]>([0, 0, 0, 0, 0]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setFullscreenActive(false);
      return;
    }

    // Block all other keys if fullscreen cover is active
    if (fullscreenActive) {
      return;
    }

    if (e.key === '`' || e.key === '~') {
      setMode(prev => {
        if (prev === 0) {
          setFullscreenActive(true);
        }
        return 0;
      });
    } else if (['1', '2', '3', '4'].includes(e.key)) {
      const k = parseInt(e.key);
      setMode(prev => {
        if (prev === k) {
          setFullscreenActive(true);
        }
        return k;
      });
    }
  }, [fullscreenActive]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const accentColor = modeColors[mode];

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#f4f3f0' }}>

      {/* 3D Canvas — full screen */}
      <Canvas
        flat // 1. 开启扁平模式，禁止 Three.js 瞎调色
        gl={{
          toneMapping: THREE.NoToneMapping,        // 2. 彻底关闭色调映射（防止高饱和度粉色变暗发灰）
          outputColorSpace: THREE.SRGBColorSpace, // 3. 强行规定输出色彩空间为标准网页 sRGB
        }}
      >
        <Scene mode={mode} cardXRef={cardXRef} />
      </Canvas>

      {/* ─── 核心集成：常驻右半屏 3D 悬浮透视功能区 ─── */}
      <div style={{
        position: 'absolute',
        top: '15%',
        right: '6%',
        width: '420px',
        zIndex: 5,
        pointerEvents: 'auto',
        /* 利用 CSS 3D 建立轻微物理倾斜度，完美呼应左侧卡牌在大倾角相机下的视差效果 */
        transform: 'perspective(1200px) rotateY(-14deg) rotateX(4deg)',
        transformStyle: 'preserve-3d',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 25, filter: 'blur(4px)' }}
            animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, x: -25, filter: 'blur(4px)' }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* 对应通道状态平铺直显 */}
            {mode === 1 && <UploadStation />}
            {mode === 2 && <RetrieveStation />}
            
            {/* 其余通道留白空气感占位 panel */}
            {(mode === 0 || mode === 3 || mode === 4) && (
              <div className="glass-panel" style={{ padding: '3rem', minHeight: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontFamily: "'Courier New', monospace", fontSize: '10px', letterSpacing: '2.5px', color: '#a09690', textAlign: 'center', lineHeight: 2.0 }}>
                  [ SYSTEM CHANNEL CONNECTED ]
                  <br />
                  <span style={{ color: accentColor }}>AWAITING PROTOCOL CORE OVERRIDE</span>
                  <br />
                  <div style={{ width: '20px', height: '1px', background: 'rgba(44,37,32,0.15)', margin: '14px auto' }} />
                  NO INPUT INTERFACE REQUIRED
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fullscreen color wave overlay */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{
          opacity: fullscreenActive ? 0.45 : 0,
          scale: fullscreenActive ? 1.0 : 0.85,
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          inset: 0,
          background: accentColor,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          pointerEvents: fullscreenActive ? 'auto' : 'none',
          zIndex: 4,
        }}
      />

      {/* UI Foreground Text Wrapper */}
      <motion.div
        animate={fullscreenActive ? {
          maskImage: 'radial-gradient(circle at 33% 50%, transparent 150%, black 165%)',
          WebkitMaskImage: 'radial-gradient(circle at 33% 50%, transparent 150%, black 165%)',
        } as any : {
          maskImage: 'radial-gradient(circle at 33% 50%, transparent -15%, black 0%)',
          WebkitMaskImage: 'radial-gradient(circle at 33% 50%, transparent -15%, black 0%)',
        } as any}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 10,
        }}
      >
        {/* Title — top left */}
        <div style={{
          position: 'absolute', top: '26px', left: '28px',
          fontFamily: "Menlo, Monaco, 'Courier New', monospace",
          fontSize: '11px', fontWeight: 'bold', letterSpacing: '3px', color: '#2c2520',
          userSelect: 'none',
        }}>
          SEROTONIN PROTOCOL
        </div>

        {/* Mode tabs — top right */}
        <div style={{
          position: 'absolute', top: '22px', right: '32px',
          fontFamily: "Menlo, Monaco, 'Courier New', monospace",
          display: 'flex', gap: '12px', alignItems: 'center',
          pointerEvents: fullscreenActive ? 'none' : 'auto',
        }}>
          {['~', '1', '2', '3', '4'].map((tabLabel, idx) => {
            const k = idx;
            const isActive = k === mode;
            return (
              <motion.span
                key={k}
                animate={{
                  color: isActive ? modeColors[k] : '#9e948e',
                  fontWeight: isActive ? 'bold' : 'normal',
                  fontSize: isActive ? '12px' : '10px',
                }}
                transition={{ duration: 0.25 }}
                style={{ cursor: 'pointer', letterSpacing: '1px', userSelect: 'none' }}
                onClick={() => {
                  if (isActive) {
                    setFullscreenActive(prev => !prev);
                  } else {
                    setMode(k);
                    setFullscreenActive(false);
                  }
                }}
              >
                [{tabLabel}]
              </motion.span>
            );
          })}
        </div>

        {/* Bottom status */}
        <div style={{
          position: 'absolute', bottom: '20px', left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: "Menlo, Monaco, 'Courier New', monospace",
          fontSize: '8.5px', letterSpacing: '3px', color: '#6e645e',
          userSelect: 'none', textAlign: 'center',
        }}>
          <motion.span key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ color: accentColor }}>
            ● {modeTitles[mode]}
          </motion.span>
          {'   —   '}PRESS [~] [1] [2] [3] [4] TO SWITCH CHANNEL
        </div>
      </motion.div>

    </div>
  );
}

export default App;