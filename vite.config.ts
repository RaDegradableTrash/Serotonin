import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import path from 'path';

export default defineConfig({
  base: '/productivity/',
  plugins: [react(), {
    name: 'productivity-path',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!/^\/productivity(?:\?.*)?$/.test(req.url || '')) return next();
        res.writeHead(308, { Location: req.url!.replace('/productivity', '/productivity/') });
        res.end();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!/^\/productivity(?:\?.*)?$/.test(req.url || '')) return next();
        res.writeHead(308, { Location: req.url!.replace('/productivity', '/productivity/') });
        res.end();
      });
    },
  }],
  preview: {
    port: Number(process.env.PORT || 4173),
    allowedHosts: ['www.dustland.ai', 'productivity.dustland.ai', 'serotonin-scf6.onrender.com'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'), // 强行把 @ 绑定到 src
    },
  },

})
