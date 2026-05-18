import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadStationProps {
  setIsFocused: (focused: boolean) => void;
  lockerStep: 'enter-hz' | 'enter-code' | 'action';
  setLockerStep: (step: 'enter-hz' | 'enter-code' | 'action') => void;
  lockerStatus: 'idle' | 'error-jiggle' | 'success';
  setLockerStatus: (status: 'idle' | 'error-jiggle' | 'success') => void;
  onTriggerRandomLocate?: () => void; // 🌟 接收外部传入的随机钩子
}

const UploadStation: React.FC<UploadStationProps> = ({
  setIsFocused, lockerStep, setLockerStep, lockerStatus, setLockerStatus, onTriggerRandomLocate
}) => {
  const [subMode, setSubMode] = useState<'menu' | 'upload' | 'retrieve'>('menu');
  const [hz, setHz] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (lockerStatus === 'error-jiggle') {
      const timer = setTimeout(() => { setLockerStatus('idle'); setLockerStep('enter-code'); setCode(''); }, 1400);
      return () => clearTimeout(timer);
    }
  }, [lockerStatus, setLockerStatus, setLockerStep]);

  const handleEnterRetrieve = () => {
    setSubMode('retrieve');
    setIsFocused(true);
    setLockerStep('enter-hz');
    setLockerStatus('idle');
  };

  const handleNextToCode = () => {
    if (!hz) return;
    onTriggerRandomLocate?.(); // 🌟 触发定位，瞬间锁死新格子
    setLockerStep('enter-code');
  };

  const handleVerifyCode = () => {
    if (!code) return;
    setLockerStep('action');
    setLockerStatus((hz === '99.5' && code === '1234') ? 'success' : 'error-jiggle');
  };

  const handleBack = () => {
    setSubMode('menu'); setIsFocused(false); setLockerStep('enter-hz'); setLockerStatus('idle'); setHz(''); setCode('');
  };

  return (
    <div className="glass-panel" style={{ padding: '2.2rem', display: 'flex', flexDirection: 'column', gap: '1.4rem' }}>
      <div>
        <div style={{ fontFamily: "'Courier New', monospace", fontSize: '9px', letterSpacing: '3px', color: '#888', marginBottom: '4px' }}>CH-A · SYNAPTIC LOCKBOX PROTOCOL</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: '14px', letterSpacing: '4px', fontWeight: 'bold', color: '#111', margin: 0 }}>
            {subMode === 'menu' && 'SYNAPSE INTERFACE // ACTION'}
            {subMode === 'upload' && 'VESICLE HUB // DEPOSIT'}
            {subMode === 'retrieve' && 'VESICLE HUB // RETRIEVE'}
          </h2>
          {subMode !== 'menu' && <button onClick={handleBack} style={{ background: 'none', border: 'none', color: '#E9A254', fontFamily: "'Courier New', monospace", fontSize: '10px', cursor: 'pointer' }}>[ BACK ]</button>}
        </div>
        <div style={{ width: '40px', height: '2px', background: '#E9A254', marginTop: '8px' }} />
      </div>

      <AnimatePresence mode="wait">
        {subMode === 'menu' && (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', gap: '1.2rem', height: '180px', marginTop: '0.5rem' }}>
            <div onClick={() => { setSubMode('upload'); setIsFocused(false); }} style={{ flex: 1, border: '1px solid rgba(44,37,32,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.4)' }}>
              <div style={{ fontSize: '20px' }}>↑</div>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 'bold', color: '#2c2520' }}>存入货物</div>
            </div>
            <div onClick={handleEnterRetrieve} style={{ flex: 1, border: '1px solid rgba(44,37,32,0.15)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '10px', cursor: 'pointer', background: 'rgba(255,255,255,0.4)' }}>
              <div style={{ fontSize: '20px' }}>↓</div>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: '13px', fontWeight: 'bold', color: '#2c2520' }}>提取货物</div>
            </div>
          </motion.div>
        )}

        {subMode === 'upload' && (
          <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <input className="chem-input" placeholder="FREQUENCY" value={hz} onChange={e => setHz(e.target.value)} />
            <input className="chem-input" type="password" placeholder="KEY CODE" value={code} onChange={e => setCode(e.target.value)} />
          </motion.div>
        )}

        {subMode === 'retrieve' && (
          <motion.div key="retrieve" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {lockerStep === 'enter-hz' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: '#1a4968', padding: '20px', border: '1px solid #70D4D5' }}>
                <div style={{ color: '#70D4D5', fontFamily: "'Courier New', monospace", fontSize: '10px', fontWeight: 'bold' }}>[ FREQUENCY GRID PINPOINT ]</div>
                <input className="chem-input" style={{ background: 'rgba(0,0,0,0.3)', color: '#fff', borderColor: '#70D4D5' }} placeholder="ENTER BOX FREQUENCY (柜门号: 99.5)" value={hz} onChange={e => setHz(e.target.value)} />
                <button className="chem-button" onClick={handleNextToCode} disabled={!hz} style={{ background: '#70D4D5', color: '#1a4968' }}>LOCATE MATRIX CHANNEL ➔</button>
              </div>
            )}
            {lockerStep === 'enter-code' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: '#1a4968', padding: '20px', border: '1px solid #70D4D5' }}>
                <div style={{ color: '#70D4D5', fontFamily: "'Courier New', monospace", fontSize: '10px', fontWeight: 'bold' }}>[ ACCESS AUTHENTICATION ]</div>
                <input className="chem-input" type="password" style={{ background: 'rgba(0,0,0,0.3)', color: '#ff3366', borderColor: '#70D4D5', fontSize: '15px', letterSpacing: '5px' }} placeholder="•••• (密码: 1234)" value={code} onChange={e => setCode(e.target.value)} />
                <button className="chem-button" onClick={handleVerifyCode} disabled={!code} style={{ background: '#70D4D5', color: '#1a4968' }}>ENGAGE DECRYPTION</button>
              </div>
            )}
            {lockerStep === 'action' && (
              <div style={{ textTransform: 'uppercase', fontFamily: "'Courier New', monospace", fontSize: '11px', textAlign: 'center', padding: '10px' }}>
                {lockerStatus === 'success' && <span style={{ color: '#70D4D5', fontWeight: 'bold' }}>✓ UNLOCKED. DRAG THE 3D SLIDING DOOR RIGHT TO UNBOX.</span>}
                {lockerStatus === 'error-jiggle' && <span style={{ color: '#ff3366', fontWeight: 'bold' }}>✕ LOCK JAMMED. RECOIL SPRING ACTION TRIGGERED.</span>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UploadStation;