import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname, '../../frontend'),
  publicDir: path.resolve(__dirname, '../../public'),
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../../shared')
    }
  },
  build: {
    outDir: path.resolve(__dirname, '../../dist'),
    emptyOutDir: true, // Always clean output directory before build
    sourcemap: false,
    // Add hash to filenames for cache busting
    rollupOptions: {
      output: {
        // Generate unique filenames with content hash
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['react-bootstrap', 'bootstrap']
        }
      },
      // Suppress circular dependency warnings for recharts
      onwarn(warning, warn) {
        if (warning.code === 'CIRCULAR_DEPENDENCY' && warning.ids?.some(id => id.includes('recharts'))) {
          return;
        }
        warn(warning);
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
