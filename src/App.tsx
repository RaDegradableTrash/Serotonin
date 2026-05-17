import { useState, useEffect, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion } from 'framer-motion';
import Scene from './components/Scene';
import './index.css';

// ── Vibrant fresh organic colors ─────────────────────────────────────────
const modeColors: Record<number, string> = {
  0: '#B8A880',   // Warm bronze brown
  1: '#FE9580',   // Soft peach red
  2: '#FDBF5C',   // Warm golden yellow
  3: '#DDD33D',   // Fresh lime green
  4: '#B0B8C0',   // Soft slate grey-blue
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
        shadows
        style={{ position: 'absolute', inset: 0 }}
        gl={{ antialias: true, toneMapping: 2 }}
        dpr={[1, 2]}
      >
        <Scene mode={mode} cardXRef={cardXRef} />
      </Canvas>

      {/* Fullscreen color wave overlay — center-expanding in 0.8s with glassmorphism blur */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{
          opacity: fullscreenActive ? 0.82 : 0,
          scale: fullscreenActive ? 1.0 : 0.85,
        }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} // Silky smooth easeOutExpo
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

      {/* UI Foreground Text Wrapper — masked radially when fullscreen is active */}
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
          fontFamily: "'Courier New', monospace",
          fontSize: '11px', fontWeight: 'bold', letterSpacing: '3px', color: '#2c2520',
          userSelect: 'none',
        }}>
          SEROTONIN PROTOCOL
        </div>

        {/* Mode tabs — top right */}
        <div style={{
          position: 'absolute', top: '22px', right: '32px',
          fontFamily: "'Courier New', monospace",
          display: 'flex', gap: '12px', alignItems: 'center',
          pointerEvents: fullscreenActive ? 'none' : 'auto', // Disable clicks during fullscreen
        }}>
          {['~', '1', '2', '3', '4'].map((tabLabel, idx) => {
            const k = idx; // 0, 1, 2, 3, 4
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
          fontFamily: "'Courier New', monospace",
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
