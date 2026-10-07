import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: ['chrome87', 'safari14'],
    cssTarget: ['chrome87', 'safari14'],
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('howler')) return 'vendor-audio';
            if (id.includes('react')) return 'vendor-react';
          }
        }
      }
    }
  },
  server: {
    proxy: {
      '/background-sounds-proxy': {
        target: 'https://pub-b64cd295d2a14b879e8858c441be6748.r2.dev/background_sounds',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/background-sounds-proxy/, '')
      }
    }
  }
})
