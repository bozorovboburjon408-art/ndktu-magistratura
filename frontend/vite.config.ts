import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Boshqa noutbuk va qurilmalardan tarmoq orqali kirishga ruxsat
    port: 5173,
    allowedHosts: true, // Internet tunnel (localtunnel, cloudflare) domenlariga to'liq ruxsat berish
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
      '/live-session/ws': {
        target: 'ws://127.0.0.1:8000',
        ws: true,
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'lucide-icons': ['lucide-react'],
          'pdf-export': ['jspdf', 'jspdf-autotable'],
          'excel-export': ['xlsx']
        }
      }
    }
  }
});
