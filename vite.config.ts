import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import path from 'path';

export default defineConfig({
  plugins: [react()],
  preview: {
    allowedHosts: ['www.dustland.ai', 'serotonin-scf6.onrender.com'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // 强行把 @ 绑定到 src
    },
  },

})
