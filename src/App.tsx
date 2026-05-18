import { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';

import Scene from './Scene';
import UploadStation from './UploadStation';
import './index.css';

const modeColors: Record<number, string> = {
  0: '#C0C0A8',
  1: '#E9A254',
  2: '#EEBF79',
  3: '#07AFC1',
  4: '#70D4D5',
};

function App() {
  const [mode, setMode] = useState<number>(1);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const [lockerStep, setLockerStep] = useState<'enter-hz' | 'enter-code' | 'action'>('enter-hz');
  const [lockerStatus, setLockerStatus] = useState<'idle' | 'error-jiggle' | 'success'>('idle');

  // 🌟 核心突破：设立全局随机柜门指针状态
  const [targetGrid, setTargetGrid] = useState<{ col: number; row: number }>({ col: 22, row: 6 });

  const cardXRef = useRef<number[]>([0, 0, 0, 0, 0]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) return;
    if (e.key === '~' || e.key === '`') { setMode(0); setIsFocused(false); }
    if (e.key === '1') { setMode(1); setIsFocused(false); }
    if (e.key === '2') { setMode(2); setIsFocused(false); }
    if (e.key === '3') { setMode(3); setIsFocused(false); }
    if (e.key === '4') { setMode(4); setIsFocused(false); }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#e8e8ea' }}>
      <Canvas
        flat
        gl={{ toneMapping: THREE.NoToneMapping, outputColorSpace: THREE.SRGBColorSpace }}
      >
        <Scene
          mode={mode}
          cardXRef={cardXRef}
          isFocused={isFocused}
          setIsFocused={setIsFocused}
          lockerStatus={lockerStatus}
          lockerStep={lockerStep}
          targetGrid={targetGrid} // 🌟 传导天选动态随机格坐标给 Scene
        />
      </Canvas>

      {/* 控制台面板 */}
      <div style={{
        position: 'absolute', top: '15%', right: '6%', width: '420px', zIndex: 5,
        pointerEvents: (mode === 1) ? 'auto' : 'none',
        opacity: (mode === 1) ? 1 : 0,
        transform: (mode === 1) ? 'translateX(0px)' : 'translateX(100px)',
        transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
      }}>
        <AnimatePresence mode="wait">
          {mode === 1 && (
            <UploadStation
              setIsFocused={setIsFocused}
              lockerStep={lockerStep}
              setLockerStep={setLockerStep}
              lockerStatus={lockerStatus}
              setLockerStatus={setLockerStatus}
              onTriggerRandomLocate={() => {
                // 🌟 点击“寻找”时，随机抽取一扇门（列：16~27，行：4~8）
                const randCol = Math.floor(Math.random() * 12) + 16;
                const randRow = Math.floor(Math.random() * 5) + 4;
                setTargetGrid({ col: randCol, row: randRow });
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* HUD 导航 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
        <div style={{ position: 'absolute', top: '26px', left: '28px', fontFamily: "Menlo, Monaco, 'Courier New', monospace", fontSize: '11px', fontWeight: 'bold', letterSpacing: '3px', color: '#2c2520' }}>
          SEROTONIN PROTOCOL
        </div>
        <div style={{ position: 'absolute', top: '22px', right: '32px', fontFamily: "Menlo, Monaco, 'Courier New', monospace", display: 'flex', gap: '12px', alignItems: 'center', pointerEvents: 'auto' }}>
          {['~', '1', '2', '3', '4'].map((tabLabel, idx) => {
            const isActive = idx === mode;
            return (
              <motion.span
                key={idx}
                animate={{ color: isActive ? modeColors[idx] : '#9e948e', fontWeight: isActive ? 'bold' : 'normal', fontSize: isActive ? '12px' : '10px' }}
                transition={{ duration: 0.25 }}
                style={{ cursor: 'pointer', letterSpacing: '1px', userSelect: 'none' }}
                onClick={() => { setMode(idx); setIsFocused(false); setLockerStep('enter-hz'); setLockerStatus('idle'); }}
              >
                [{tabLabel}]
              </motion.span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;