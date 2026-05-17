import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { decryptData } from './utils/cryptoUtils';
import { downloadVesicle, checkVesicleExists } from './utils/mockBackend';

const RetrieveStation: React.FC = () => {
  const [hz, setHz] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'ready' | 'downloading' | 'success' | 'error' | 'not_found'>('idle');
  const [decryptedText, setDecryptedText] = useState('');

  const x = useMotionValue(0);
  const trackBg = useTransform(x, [0, 220], ['rgba(180,180,180,0.2)', 'rgba(58,126,255,0.3)']);

  const handleCheck = async () => {
    if (!hz || !code) return;
    setStatus('checking');
    const exists = await checkVesicleExists(hz, code);
    if (exists) setStatus('ready');
    else { setStatus('not_found'); setTimeout(() => setStatus('idle'), 3000); }
  };

  const handleDragEnd = async (_e: any, info: any) => {
    if (info.offset.x > 150 && status === 'ready') {
      setStatus('downloading');
      try {
        const data = await downloadVesicle(hz, code);
        if (data) {
          const text = await decryptData(data.encryptedContent, data.iv, code);
          setDecryptedText(text);
          setStatus('success');
        } else setStatus('error');
      } catch { setStatus('error'); }
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {/* Header */}
      <div>
        <div style={{ fontFamily: "'Courier New', monospace", fontSize: '9px', letterSpacing: '3px', color: '#aaa', marginBottom: '4px' }}>
          CH-A · SYNAPTIC RECEPTOR
        </div>
        <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: '14px', letterSpacing: '4px', fontWeight: 'bold', color: '#111', margin: 0 }}>
          RETRIEVE STATION
        </h2>
        <div style={{ width: '40px', height: '2px', background: '#ff3366', marginTop: '8px' }} />
      </div>

      {status === 'success' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontFamily: "'Courier New', monospace", fontSize: '9px', letterSpacing: '2px', color: '#3a7eff', textAlign: 'center' }}>
            ✓ MEMBRANE POTENTIAL MATCHED · SIGNAL ABSORBED · VESICLE DEGRADED
          </div>
          <div style={{
            background: 'rgba(58, 126, 255, 0.06)',
            border: '1px solid rgba(58,126,255,0.3)',
            padding: '1rem',
            fontFamily: "'Courier New', monospace",
            fontSize: '12px',
            color: '#111',
            wordBreak: 'break-word',
            lineHeight: 1.6,
          }}>
            {decryptedText}
          </div>
          <button className="chem-button" onClick={() => { setStatus('idle'); setDecryptedText(''); setHz(''); setCode(''); x.set(0); }}
            style={{ background: '#3a7eff' }}>
            RESET RECEPTOR
          </button>
        </motion.div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Courier New', monospace", fontSize: '9px', letterSpacing: '2px', color: '#888' }}>
                FREQUENCY (HZ)
              </label>
              <input className="chem-input" type="text" value={hz} onChange={e => setHz(e.target.value)}
                disabled={status !== 'idle' && status !== 'not_found'} placeholder="99.5" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Courier New', monospace", fontSize: '9px', letterSpacing: '2px', color: '#888' }}>
                CODE
              </label>
              <input className="chem-input" type="password" value={code} onChange={e => setCode(e.target.value)}
                disabled={status !== 'idle' && status !== 'not_found'} placeholder="••••" />
            </div>
          </div>

          {(status === 'idle' || status === 'not_found') && (
            <button className="chem-button" onClick={handleCheck} disabled={!hz || !code}
              style={{ background: '#3a7eff' }}>
              SCAN SYNAPSE
            </button>
          )}

          {status === 'not_found' && (
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: '9px', letterSpacing: '2px', color: '#e8a820', textAlign: 'center' }}>
              ⚠ NO VESICLE DETECTED AT THIS FREQUENCY
            </div>
          )}
          {status === 'checking' && (
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: '9px', letterSpacing: '2px', color: '#888', textAlign: 'center' }}>
              ◌ SCANNING SYNAPSE...
            </div>
          )}
          {status === 'downloading' && (
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: '9px', letterSpacing: '2px', color: '#3a7eff', textAlign: 'center' }}>
              ↓ EXTRACTING AND DECRYPTING PAYLOAD...
            </div>
          )}
          {status === 'error' && (
            <div style={{ fontFamily: "'Courier New', monospace", fontSize: '9px', color: '#ff3333', textAlign: 'center' }}>
              ✕ DECRYPTION FAILED · CHEMICAL KEY MISMATCH
              <br />
              <button onClick={() => { setStatus('idle'); x.set(0); }} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', marginTop: '6px', fontSize: '10px', letterSpacing: '1px', textDecoration: 'underline' }}>
                RESET
              </button>
            </div>
          )}
          {status === 'ready' && (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontFamily: "'Courier New', monospace", fontSize: '9px', letterSpacing: '2px', color: '#3a7eff', textAlign: 'center' }}>
                VESICLE DETECTED · DRAG HANDLE TO OPEN CHANNEL
              </label>
              <motion.div style={{
                height: '52px',
                background: trackBg,
                border: '1px solid rgba(58,126,255,0.3)',
                borderRadius: '26px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 310 }}
                  dragElastic={0.05}
                  onDragEnd={handleDragEnd}
                  whileTap={{ scale: 0.95 }}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    left: '4px',
                    width: '44px',
                    height: '44px',
                    borderRadius: '22px',
                    background: '#3a7eff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'grab',
                    fontFamily: "'Courier New', monospace",
                    fontSize: '18px',
                    color: 'white',
                    x,
                  }}
                >
                  ↔
                </motion.div>
                <div style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontFamily: "'Courier New', monospace",
                  fontSize: '9px',
                  letterSpacing: '2px',
                  color: '#999',
                  pointerEvents: 'none',
                }}>
                  SLIDE TO ABSORB ➔
                </div>
              </motion.div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RetrieveStation;
