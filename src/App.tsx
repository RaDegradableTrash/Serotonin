import { useState, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';

import Scene from './Scene';
import UploadStation from './UploadStation';
import './index.css';

const modeColors: Record<number, string> = {
  0: '#C0C0A8', 1: '#E9A254', 2: '#EEBF79', 3: '#07AFC1', 4: '#70D4D5',
};

function App() {
  const [mode, setMode] = useState<number>(1);
  const [isFocused, setIsFocused] = useState<boolean>(false);

  const [lockerStep, setLockerStep] = useState<'enter-hz' | 'enter-code' | 'action'>('enter-hz');
  const [lockerStatus, setLockerStatus] = useState<'idle' | 'error-jiggle' | 'success'>('idle');

  // 🌟 初始化基准：默认放置在安全的中央腹地
  const [targetGrid, setTargetGrid] = useState<{ col: number; row: number; resetNonce: number }>({ col: 19, row: 6, resetNonce: 0 });

  const sessionLockerMap = useRef<Record<string, { col: number; row: number }>>({});
  const [subMode, setSubMode] = useState<'menu' | 'upload' | 'retrieve'>('menu');
  const cardXRef = useRef<number[]>([0, 0, 0, 0, 0]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
      if (e.key === 'Escape') (activeEl as HTMLInputElement).blur();
      else return;
    }

    if (e.key === 'Escape') {
      if (mode === 1 && isFocused) {
        if (lockerStep === 'action' || lockerStep === 'enter-code') {
          setLockerStep('enter-hz');
          setLockerStatus('idle');
        } else if (lockerStep === 'enter-hz') {
          setIsFocused(false);
          setSubMode('menu');
        }
      }
      return;
    }

    let targetMode = -1;
    if (e.key === '~' || e.key === '`') targetMode = 0;
    if (e.key === '1') targetMode = 1;
    if (e.key === '2') targetMode = 2;
    if (e.key === '3') targetMode = 3;
    if (e.key === '4') targetMode = 4;

    if (targetMode !== -1) {
      setMode(targetMode);
      setIsFocused(false);
      setSubMode('menu');
      setLockerStep('enter-hz');
      setLockerStatus('idle');
    }
  }, [mode, isFocused, lockerStep]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', background: '#e8e8ea' }}>
      <Canvas flat gl={{ toneMapping: THREE.NoToneMapping, outputColorSpace: THREE.SRGBColorSpace }}>
        <Scene
          mode={mode}
          cardXRef={cardXRef}
          isFocused={isFocused}
          lockerStatus={lockerStatus}
          lockerStep={lockerStep}
          targetGrid={targetGrid}
        />
      </Canvas>

      <div style={{
        position: 'absolute', top: '15%', right: '6%', width: '420px', zIndex: 15,
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
              subMode={subMode}
              setSubMode={setSubMode}
              onEnterRetrieveReset={() => {
                sessionLockerMap.current = {};
              }}
              onComputeGridByLockerId={(lockerIdText) => {
                if (!lockerIdText) return;

                if (sessionLockerMap.current[lockerIdText]) {
                  const cached = sessionLockerMap.current[lockerIdText];
                  setTargetGrid({ col: cached.col, row: cached.row, resetNonce: Math.random() });
                } else {
                  // 🌟🌟 核心安全机制：长墙规模为 COLS=38, ROWS=13
                  // 强制去除最顶部、最底部的 10 行 ➔ ROWS 允许的安全跨度只有唯一一行：[3 ~ 3] (即中央第 3 行，0 基准标识)
                  // 强制去除最左侧、最右侧的 10 列 ➔ COLS 允许的安全范围收窄截断为：[10 ~ 27]
                  // 这确保了任何随机目标格的周围，都严严实实合围平铺着至少 10 层以上的背景块，彻底绝杀边缘未加载穿帮！ 🌟🌟
                  const safeMinCol = 10;
                  const safeMaxCol = 27;
                  const randCol = Math.floor(Math.random() * (safeMaxCol - safeMinCol + 1)) + safeMinCol;

                  const safeMinRow = 3;
                  const safeMaxRow = 3;
                  const randRow = Math.floor(Math.random() * (safeMaxRow - safeMinRow + 1)) + safeMinRow;

                  const newRandomGrid = { col: randCol, row: randRow };
                  sessionLockerMap.current[lockerIdText] = newRandomGrid;
                  setTargetGrid({ col: randCol, row: randRow, resetNonce: Math.random() });
                }
              }}
            />
          )}
        </AnimatePresence>
      </div>

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
                onClick={() => { setMode(idx); setIsFocused(false); setSubMode('menu'); setLockerStep('enter-hz'); setLockerStatus('idle'); }}
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
