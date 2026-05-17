import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { encryptData } from './utils/cryptoUtils';
import { uploadVesicle } from './utils/mockBackend';

const UploadStation: React.FC = () => {
  const [hz, setHz] = useState('');
  const [code, setCode] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<'idle' | 'encrypting' | 'uploading' | 'success'>('idle');

  const handleUpload = async () => {
    if (!hz || !code || !content) return;
    setStatus('encrypting');
    try {
      const { ciphertext, iv } = await encryptData(content, code);
      setStatus('uploading');
      const success = await uploadVesicle(hz, code, {
        encryptedContent: ciphertext,
        iv,
        type: 'text',
        sizeBytes: content.length,
        createdAt: Date.now(),
      });
      if (success) {
        setStatus('success');
        setTimeout(() => { setStatus('idle'); setContent(''); }, 3000);
      }
    } catch (e) {
      console.error(e);
      setStatus('idle');
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      {/* Header */}
      <div>
        <div style={{ fontFamily: "'Courier New', monospace", fontSize: '9px', letterSpacing: '3px', color: '#aaa', marginBottom: '4px' }}>
          CH-A · SYNAPTIC VESICLE
        </div>
        <h2 style={{ fontFamily: "'Courier New', monospace", fontSize: '14px', letterSpacing: '4px', fontWeight: 'bold', color: '#111', margin: 0 }}>
          UPLOAD STATION
        </h2>
        <div style={{ width: '40px', height: '2px', background: '#ff3366', marginTop: '8px' }} />
      </div>

      {/* Content input */}
      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Courier New', monospace", fontSize: '9px', letterSpacing: '2px', color: '#888' }}>
          SIGNAL PAYLOAD
        </label>
        <textarea
          className="chem-input"
          rows={4}
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Enter message to encrypt..."
          style={{ resize: 'none' }}
        />
      </div>

      {/* Hz + Code */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Courier New', monospace", fontSize: '9px', letterSpacing: '2px', color: '#888' }}>
            FREQUENCY (HZ)
          </label>
          <input className="chem-input" type="text" value={hz} onChange={e => setHz(e.target.value)} placeholder="99.5" />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '6px', fontFamily: "'Courier New', monospace", fontSize: '9px', letterSpacing: '2px', color: '#888' }}>
            CODE
          </label>
          <input className="chem-input" type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="••••" />
        </div>
      </div>

      {/* Upload button */}
      <button
        className="chem-button"
        onClick={handleUpload}
        disabled={status !== 'idle' || !hz || !code || !content}
        style={{ marginTop: '0.5rem' }}
      >
        {status === 'idle' && '↑ EXOCYTOSIS — UPLOAD VESICLE'}
        {status === 'encrypting' && '⌛ ENCRYPTING AES-256...'}
        {status === 'uploading' && '⌛ TRANSPORTING PAYLOAD...'}
        {status === 'success' && '✓ VESICLE SUSPENDED'}
      </button>

      {status === 'success' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ fontFamily: "'Courier New', monospace", fontSize: '9px', letterSpacing: '2px', color: '#ff3366', textAlign: 'center' }}
        >
          VESICLE AWAITING RECEIVER · WILL SELF-DEGRADE ON ABSORPTION
        </motion.div>
      )}
    </div>
  );
};

export default UploadStation;
