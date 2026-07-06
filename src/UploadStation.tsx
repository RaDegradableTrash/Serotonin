import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface UploadStationProps {
  setIsFocused: (focused: boolean) => void;
  lockerStep: 'enter-hz' | 'enter-code' | 'action';
  setLockerStep: (step: 'enter-hz' | 'enter-code' | 'action') => void;
  lockerStatus: 'idle' | 'error-jiggle' | 'success';
  setLockerStatus: (status: 'idle' | 'error-jiggle' | 'success') => void;
  subMode: 'menu' | 'upload' | 'retrieve';
  setSubMode: (mode: 'menu' | 'upload' | 'retrieve') => void;
  onEnterRetrieveReset: () => void; // 🌟 完备恢复类型锚定，绝杀 App.tsx 挂载报错
  onComputeGridByLockerId?: (lockerId: string) => void;
}

const UploadStation: React.FC<UploadStationProps> = ({
  setIsFocused, lockerStep, setLockerStep, lockerStatus, setLockerStatus, subMode, setSubMode, onEnterRetrieveReset, onComputeGridByLockerId
}) => {
  const [hz, setHz] = useState('');
  const [code, setCode] = useState('');

  const [uploadHz, setUploadHz] = useState('');
  const [uploadCode, setUploadCode] = useState('');
  const [uploadContent, setUploadContent] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // 🌟🌟 核心互锁总线：让 3D 箱体的手势拖拽开合状态完备反哺回你的 2D 原生状态机上 🌟🌟
  useEffect(() => {
    const handle3DSuccess = () => {
      setLockerStatus('success');
      setLockerStep('action');
    };

    const handle3DError = () => {
      setLockerStatus('error-jiggle');
    };

    window.addEventListener('engage-3d-decryption-success', handle3DSuccess);
    window.addEventListener('engage-3d-decryption-error', handle3DError);

    return () => {
      window.removeEventListener('engage-3d-decryption-success', handle3DSuccess);
      window.removeEventListener('engage-3d-decryption-error', handle3DError);
    };
  }, [setLockerStatus, setLockerStep]);

  useEffect(() => {
    if (lockerStatus === 'error-jiggle') {
      const timer = setTimeout(() => { setLockerStatus('idle'); setLockerStep('enter-code'); setCode(''); }, 1400);
      return () => clearTimeout(timer);
    }
  }, [lockerStatus, setLockerStatus, setLockerStep]);

  const handleEnterRetrieve = () => {
    onEnterRetrieveReset(); // 顺利扣动 App.tsx 内部绑定的清理钩子
    setSubMode('retrieve'); setIsFocused(true); setLockerStep('enter-hz'); setLockerStatus('idle');
  };

  const handleNextToCode = () => {
    if (!hz) return;
    onComputeGridByLockerId?.(hz);
    setLockerStep('enter-code');
  };

  const handleVerifyCode = () => {
    if (!code) return;
    setLockerStep('action');
    setLockerStatus((hz === '99.5' && code === '1234') ? 'success' : 'error-jiggle');
  };

  const handleExecUpload = () => {
    if (!uploadHz || !uploadCode || !uploadContent) return;
    setUploadSuccess(true);
    setTimeout(() => {
      setUploadSuccess(false); setSubMode('menu'); setUploadHz(''); setUploadCode(''); setUploadContent('');
    }, 2000);
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

      {subMode === 'menu' && (
        <motion.div key="menu-stage" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', gap: '1.2rem', height: '180px', marginTop: '0.5rem' }}>
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
        <motion.div key="upload-stage" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {!uploadSuccess ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(233,162,84,0.06)', padding: '20px', border: '1px solid #E9A254' }}>
              <div style={{ color: '#E9A254', fontFamily: "'Courier New', monospace", fontSize: '10px', fontWeight: 'bold' }}>[ ALLOCATE NEW VESICLE SPACE ]</div>
              <input className="chem-input" placeholder="ASSIGN FREQUENCY CHANNEL (如: 99.5)" value={uploadHz} onChange={e => setUploadHz(e.target.value)} />
              <input className="chem-input" type="password" placeholder="GENERATE PRIVATE ACCESS CODE (如: 1234)" value={uploadCode} onChange={e => setUploadCode(e.target.value)} />
              <textarea className="chem-input" rows={3} style={{ resize: 'none', background: '#fff', border: '1px solid rgba(0,0,0,0.12)' }} placeholder="ENTER TEXT VALUE TO DEPOSIT..." value={uploadContent} onChange={e => setUploadContent(e.target.value)} />
              <button className="chem-button" onClick={handleExecUpload} disabled={!uploadHz || !uploadCode || !uploadContent} style={{ background: '#E9A254', marginTop: '4px' }}>EXECUTE STORAGE INJECTION ➔</button>
            </div>
          ) : (
            <div style={{ color: '#E9A254', fontFamily: "'Courier New', monospace", fontSize: '12px', textAlign: 'center', padding: '30px', fontWeight: 'bold', background: 'rgba(233,162,84,0.1)', border: '1px solid #E9A254' }}>✓ FREQUENCY CHANNEL ALLOCATED.<br />DATA BRICK DEPOSITED SUCCESSFULLY.</div>
          )}
        </motion.div>
      )}

      {subMode === 'retrieve' && (
        <motion.div key="retrieve-stage" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
            <div style={{ textTransform: 'uppercase', fontFamily: "'Courier New', monospace", fontSize: '11px', textAlign: 'center', padding: '10px', color: '#111' }}>
              {lockerStatus === 'success' && <span style={{ color: '#70D4D5', fontWeight: 'bold' }}>✓ UNLOCKED. DRAG THE 3D SLIDING DOOR RIGHT TO UNBOX.</span>}
              {lockerStatus === 'error-jiggle' && <span style={{ color: '#ff3366', fontWeight: 'bold' }}>✕ LOCK JAMMED. RECOIL SPRING ACTION TRIGGERED.</span>}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default UploadStation;