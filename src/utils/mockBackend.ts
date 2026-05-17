import { generateKeyHash } from './cryptoUtils';

export interface VesicleData {
  encryptedContent: string;
  iv: string;
  type: 'text' | 'file';
  sizeBytes: number;
  createdAt: number;
}

// Simulates Vercel Serverless Function (upload)
export async function uploadVesicle(hz: string, code: string, data: VesicleData): Promise<boolean> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const hashKey = await generateKeyHash(hz, code);
  
  // Store in localStorage (simulating Redis / R2)
  localStorage.setItem(`serotonin_vesicle_${hashKey}`, JSON.stringify(data));
  return true;
}

// Simulates Vercel Serverless Function + Download (read and burn)
export async function downloadVesicle(hz: string, code: string): Promise<VesicleData | null> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const hashKey = await generateKeyHash(hz, code);
  const storageKey = `serotonin_vesicle_${hashKey}`;
  
  const rawData = localStorage.getItem(storageKey);
  if (!rawData) {
    return null; // Not found or wrong password (hash mismatch)
  }
  
  // Parse data
  const data: VesicleData = JSON.parse(rawData);
  
  // [Degradation Mechanism] - Immediate deletion from "server" after read
  localStorage.removeItem(storageKey);
  
  return data;
}

export async function checkVesicleExists(hz: string, code: string): Promise<boolean> {
    const hashKey = await generateKeyHash(hz, code);
    const storageKey = `serotonin_vesicle_${hashKey}`;
    return !!localStorage.getItem(storageKey);
}
