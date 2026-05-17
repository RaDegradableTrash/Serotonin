// cryptoUtils.ts

// Generates a salted hash for the combination of Cabinet Frequency (Hz) and Password (Code).
// Uses SHA-256 via Web Crypto API.
export async function generateKeyHash(hz: string, code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`salt_serotonin_${hz}_${code}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Generate AES-GCM encryption key from password (simplified for prototype)
async function getCryptoKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password.padEnd(32, '0').slice(0, 32)), // Ensure 32 bytes for AES-256
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );
  
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("serotonin_salt"),
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Encrypt text data
export async function encryptData(text: string, code: string): Promise<{ ciphertext: string, iv: string }> {
  const key = await getCryptoKey(code);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(text);
  
  const encryptedContent = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv
    },
    key,
    encodedData
  );
  
  const encryptedBytes = new Uint8Array(encryptedContent);
  const ciphertextStr = Array.from(encryptedBytes).map(b => String.fromCharCode(b)).join('');
  const ivStr = Array.from(iv).map(b => String.fromCharCode(b)).join('');
  
  return {
    ciphertext: btoa(ciphertextStr),
    iv: btoa(ivStr)
  };
}

// Decrypt text data
export async function decryptData(ciphertextBase64: string, ivBase64: string, code: string): Promise<string> {
  const key = await getCryptoKey(code);
  
  const ciphertextStr = atob(ciphertextBase64);
  const ciphertextBytes = new Uint8Array(ciphertextStr.length);
  for (let i = 0; i < ciphertextStr.length; i++) {
    ciphertextBytes[i] = ciphertextStr.charCodeAt(i);
  }
  
  const ivStr = atob(ivBase64);
  const ivBytes = new Uint8Array(ivStr.length);
  for (let i = 0; i < ivStr.length; i++) {
    ivBytes[i] = ivStr.charCodeAt(i);
  }
  
  const decryptedContent = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: ivBytes
    },
    key,
    ciphertextBytes
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedContent);
}
